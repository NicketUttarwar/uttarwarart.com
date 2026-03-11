"""
Edge-matching alignment: for each seam between two sections, extract boundary
strips, run sliding-window correlation, and aggregate offsets to produce
corrected origin_x, origin_y per section.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2
import numpy as np

# Plan constants (hard-coded)
STRIP_WIDTH_PX = 80  # 50-100 px
WINDOW_STEP_PX = 50
MARGIN_OF_ERROR_FRAC = 0.25  # accept match if score >= 1 - 0.25
MATCH_THRESHOLD = 1.0 - MARGIN_OF_ERROR_FRAC  # 0.75
SEARCH_RANGE_FRAC = 0.25  # ±25% of overlap length for search


@dataclass
class Seam:
    """A single seam: section_a's edge_a meets section_b's edge_b."""

    section_a: int
    section_b: int
    edge_a: str  # "left" | "right" | "top" | "bottom"
    edge_b: str


@dataclass
class SeamResult:
    """Offset found for one seam (shift for section_b along the seam)."""

    section_a: int
    section_b: int
    edge_a: str
    edge_b: str
    axis: str  # "x" or "y"
    delta: float  # pixels to add to section_b's position
    score: float


def enumerate_seams(manifest: dict[str, Any]) -> list[Seam]:
    """Build unique list of seams from manifest.layout.section_relations."""
    relations = manifest.get("layout", {}).get("section_relations", [])
    if not relations:
        return []
    seams: list[Seam] = []
    seen: set[tuple[int, int]] = set()
    for i, rel in enumerate(relations):
        for j in rel.get("right_of", []):
            if (i, j) not in seen:
                seen.add((i, j))
                seams.append(Seam(i, j, "right", "left"))
        for j in rel.get("left_of", []):
            if (i, j) not in seen:
                seen.add((i, j))
                seams.append(Seam(i, j, "left", "right"))
        for j in rel.get("below", []):
            if (i, j) not in seen:
                seen.add((i, j))
                seams.append(Seam(i, j, "bottom", "top"))
        for j in rel.get("above", []):
            if (i, j) not in seen:
                seen.add((i, j))
                seams.append(Seam(i, j, "top", "bottom"))
    return seams


def load_image(path: Path) -> np.ndarray:
    """Load image as grayscale float in [0,1]."""
    im = cv2.imread(str(path))
    if im is None:
        raise FileNotFoundError(f"Cannot load image: {path}")
    gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    return gray.astype(np.float32) / 255.0


def extract_strip(
    img: np.ndarray,
    edge: str,
    strip_width: int,
) -> np.ndarray:
    """Extract boundary strip (band adjacent to edge). Shape (length_along_edge, strip_width)."""
    h, w = img.shape[:2]
    strip_width = min(strip_width, w, h)
    if edge == "left":
        return img[:, :strip_width].copy()  # (h, strip_width)
    if edge == "right":
        return img[:, -strip_width:].copy()
    if edge == "top":
        return img[:strip_width, :].copy()  # (strip_width, w)
    if edge == "bottom":
        return img[-strip_width:, :].copy()
    raise ValueError(f"Unknown edge: {edge}")


def strip_to_1d_along_seam(strip: np.ndarray, edge: str) -> np.ndarray:
    """
    For sliding along the seam: we need a 1D signal per column (vertical seam)
    or per row (horizontal seam). Returns (length_along, strip_width) or
    (length_along,) by averaging across the strip width for robustness.
    """
    if edge in ("left", "right"):
        # Seam runs vertically; length_along = height. Average across columns.
        return np.mean(strip, axis=1)  # (h,)
    else:
        # Seam runs horizontally; length_along = width. Average across rows.
        return np.mean(strip, axis=0)  # (w,)


def sliding_window_match(
    strip_a: np.ndarray,
    strip_b: np.ndarray,
    edge_a: str,
    overlap_len: int,
) -> tuple[float, float]:
    """
    Slide strip_b along strip_a (along the seam direction). Return (best_offset_px, best_score).
    strip_a, strip_b are 1D (length_along_seam). overlap_len = min(len_a, len_b).
    Search range: ±25% of overlap_len. Step: WINDOW_STEP_PX.
    """
    len_a, len_b = len(strip_a), len(strip_b)
    if len_a == 0 or len_b == 0:
        return 0.0, 0.0
    search_range = max(1, int(overlap_len * SEARCH_RANGE_FRAC))
    step = max(1, min(WINDOW_STEP_PX, search_range))
    best_offset = 0.0
    best_score = -1.0
    # offset: how much to shift strip_b relative to strip_a (in indices).
    # offset > 0 means strip_b starts later (so we're sliding B downward or rightward relative to A).
    for offset in range(-search_range, search_range + 1, step):
        # Overlap: strip_a[max(0, -offset) : max(0,-offset) + overlap_actual]
        # strip_b[max(0, offset) : max(0, offset) + overlap_actual]
        start_a = max(0, -offset)
        start_b = max(0, offset)
        end_a = min(len_a, len_a - offset, start_a + len_b - start_b)
        end_b = start_b + (end_a - start_a)
        if end_a <= start_a or end_b <= start_b:
            continue
        seg_a = strip_a[start_a:end_a]
        seg_b = strip_b[start_b:end_b]
        if len(seg_a) < 10 or len(seg_b) < 10:
            continue
        # Normalized cross-correlation
        a = seg_a.astype(np.float64)
        b = seg_b.astype(np.float64)
        a = (a - np.mean(a)) / (np.std(a) + 1e-10)
        b = (b - np.mean(b)) / (np.std(b) + 1e-10)
        score = np.mean(a * b)
        if score > best_score:
            best_score = score
            best_offset = float(offset)
    return best_offset, best_score


def correlation_at_offset(
    sig_a: np.ndarray,
    sig_b: np.ndarray,
    offset: int = 0,
) -> float:
    """
    Compute normalized cross-correlation at a fixed offset. Used by verify to
    re-evaluate seam quality at the chosen alignment (offset 0 when placements
    are already applied). Matches the normalization used in sliding_window_match.
    """
    len_a, len_b = len(sig_a), len(sig_b)
    if len_a == 0 or len_b == 0:
        return 0.0
    start_a = max(0, -offset)
    start_b = max(0, offset)
    end_a = min(len_a, len_a - offset, start_a + len_b - start_b)
    end_b = start_b + (end_a - start_a)
    if end_a <= start_a or end_b <= start_b:
        return 0.0
    seg_a = sig_a[start_a:end_a].astype(np.float64)
    seg_b = sig_b[start_b:end_b].astype(np.float64)
    if len(seg_a) < 10 or len(seg_b) < 10:
        return 0.0
    a = (seg_a - np.mean(seg_a)) / (np.std(seg_a) + 1e-10)
    b = (seg_b - np.mean(seg_b)) / (np.std(seg_b) + 1e-10)
    return float(np.mean(a * b))


def match_seam(
    seam: Seam,
    images: dict[int, np.ndarray],
    sections: list[dict],
) -> SeamResult | None:
    """Run strip extraction and sliding-window match for one seam. Returns SeamResult or None if skipped."""
    i, j = seam.section_a, seam.section_b
    if i not in images or j not in images:
        return None
    sa = sections[i]
    sb = sections[j]
    strip_width = min(
        STRIP_WIDTH_PX,
        sa["output_width_px"],
        sa["output_height_px"],
        sb["output_width_px"],
        sb["output_height_px"],
    )
    strip_width = max(50, min(100, strip_width))
    strip_a = extract_strip(images[i], seam.edge_a, strip_width)
    strip_b = extract_strip(images[j], seam.edge_b, strip_width)
    sig_a = strip_to_1d_along_seam(strip_a, seam.edge_a)
    sig_b = strip_to_1d_along_seam(strip_b, seam.edge_b)
    overlap_len = min(len(sig_a), len(sig_b))
    if overlap_len < 20:
        return None
    offset_px, score = sliding_window_match(sig_a, sig_b, seam.edge_a, overlap_len)
    if score < MATCH_THRESHOLD:
        return None
    # Axis and delta: for right/left seam we move section_b in y; for top/bottom we move section_b in x.
    if seam.edge_a in ("left", "right"):
        axis = "y"
        delta = offset_px
    else:
        axis = "x"
        delta = offset_px
    return SeamResult(
        section_a=i,
        section_b=j,
        edge_a=seam.edge_a,
        edge_b=seam.edge_b,
        axis=axis,
        delta=delta,
        score=score,
    )


def _base_offset(a: int, b: int, edge_a: str, sections: list[dict]) -> tuple[float, float]:
    wa = sections[a]["output_width_px"]
    ha = sections[a]["output_height_px"]
    if edge_a == "right":
        return (wa, 0.0)
    if edge_a == "left":
        return (-sections[b]["output_width_px"], 0.0)
    if edge_a == "bottom":
        return (0.0, ha)
    if edge_a == "top":
        return (0.0, -sections[b]["output_height_px"])
    return (0.0, 0.0)


def aggregate_offsets(
    seam_results: list[SeamResult],
    sections: list[dict],
    source_width: float,
    source_height: float,
) -> dict[int, tuple[float, float]]:
    """
    Compute corrected (origin_x, origin_y) per section. Start from manifest origins;
    propagate via seam constraints (pos_b = pos_a + (dx, dy)). When a section has
    multiple constraints, iterate and average until stable. Clamp to canvas.
    """
    n = len(sections)
    positions: dict[int, tuple[float, float]] = {}
    for s in sections:
        idx = s["index"]
        positions[idx] = (s["origin_x"], s["origin_y"])

    edges: list[tuple[int, int, float, float]] = []
    for r in seam_results:
        a, b = r.section_a, r.section_b
        bx, by = _base_offset(a, b, r.edge_a, sections)
        if r.axis == "x":
            dx, dy = bx + r.delta, by
        else:
            dx, dy = bx, by + r.delta
        edges.append((a, b, dx, dy))

    for _ in range(n + 1):
        updated = False
        for (a, b, dx, dy) in edges:
            new_x = positions[a][0] + dx
            new_y = positions[a][1] + dy
            old_x, old_y = positions[b]
            positions[b] = ((old_x + new_x) / 2.0, (old_y + new_y) / 2.0)
            if abs(positions[b][0] - old_x) > 1e-6 or abs(positions[b][1] - old_y) > 1e-6:
                updated = True
        if not updated:
            break

    for s in sections:
        idx = s["index"]
        x, y = positions[idx]
        w = s["output_width_px"]
        h = s["output_height_px"]
        x = max(0, min(source_width - w, x))
        y = max(0, min(source_height - h, y))
        positions[idx] = (x, y)

    return positions


def run_alignment(manifest: dict[str, Any], source_dir: Path) -> dict[int, tuple[float, float]]:
    """
    Load section images, enumerate seams, match each seam, aggregate offsets.
    Returns corrected (origin_x, origin_y) per section index.
    """
    sections = manifest.get("sections", [])
    if len(sections) <= 1:
        return {s["index"]: (s["origin_x"], s["origin_y"]) for s in sections}

    seams = enumerate_seams(manifest)
    if not seams:
        return {s["index"]: (s["origin_x"], s["origin_y"]) for s in sections}

    # Load images
    images: dict[int, np.ndarray] = {}
    for s in sections:
        idx = s["index"]
        path = source_dir / s["filename"]
        if not path.exists():
            continue
        try:
            images[idx] = load_image(path)
        except Exception:
            continue

    seam_results: list[SeamResult] = []
    for seam in seams:
        res = match_seam(seam, images, sections)
        if res is not None:
            seam_results.append(res)

    if not seam_results:
        return {s["index"]: (s["origin_x"], s["origin_y"]) for s in sections}

    sw = float(manifest.get("source_width", 0))
    sh = float(manifest.get("source_height", 0))
    return aggregate_offsets(seam_results, sections, sw, sh)


def run_alignment_for_painting(painting_id: str, source_images_root: Path) -> dict[int, tuple[float, float]]:
    """Load manifest for painting_id, run alignment, return corrected positions."""
    manifest_path = source_images_root / painting_id / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    source_dir = source_images_root / painting_id
    return run_alignment(manifest, source_dir)
