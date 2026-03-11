#!/usr/bin/env python3
"""
Re-evaluate seams using existing edge-corrected placements; compute confidence
and write edge-align-report.json. Used after align so fallback can remove
placements when confidence is low.
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# Allow running from repo root or from scripts/edge_align_sections
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
SOURCE_IMAGES_DEFAULT = REPO_ROOT / "source_images"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from aligner import (
    MATCH_THRESHOLD,
    STRIP_WIDTH_PX,
    correlation_at_offset,
    enumerate_seams,
    extract_strip,
    load_image,
    strip_to_1d_along_seam,
)


def run_verify(painting_id: str, source_images_root: Path) -> int:
    source_dir = source_images_root / painting_id
    manifest_path = source_dir / "manifest.json"
    placements_path = source_dir / "edge-corrected-placements.json"
    report_path = source_dir / "edge-align-report.json"

    if not manifest_path.exists():
        print(f"Error: Manifest not found: {manifest_path}", file=sys.stderr)
        return 1
    if not placements_path.exists():
        print(f"Error: Placements not found: {placements_path}", file=sys.stderr)
        return 1

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    with open(placements_path, "r", encoding="utf-8") as f:
        placements = json.load(f)

    sections = manifest.get("sections", [])
    sections_by_index = {s["index"]: s for s in sections}

    if len(sections) <= 1:
        report = {
            "confidence": "high",
            "seams": [],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        try:
            with open(report_path, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2)
        except OSError as e:
            print(f"Error: Cannot write report: {e}", file=sys.stderr)
            return 1
        print(f"Wrote report (single-section) to {report_path}")
        return 0

    seams = enumerate_seams(manifest)
    if not seams:
        report = {
            "confidence": "high",
            "seams": [],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        try:
            with open(report_path, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2)
        except OSError as e:
            print(f"Error: Cannot write report: {e}", file=sys.stderr)
            return 1
        print(f"Wrote report (no seams) to {report_path}")
        return 0

    seam_results: list[dict] = []
    images: dict[int, "np.ndarray"] = {}

    for seam in seams:
        i, j = seam.section_a, seam.section_b
        sa = sections_by_index.get(i)
        sb = sections_by_index.get(j)
        if sa is None or sb is None:
            continue

        for idx in (i, j):
            if idx not in images:
                path = source_dir / sections_by_index[idx]["filename"]
                if not path.exists():
                    print(f"Warning: Skipping seam ({i},{j}): section image missing: {path}", file=sys.stderr)
                    continue
                try:
                    images[idx] = load_image(path)
                except Exception as e:
                    print(f"Warning: Skipping seam ({i},{j}): cannot load image {path}: {e}", file=sys.stderr)
                    continue

        if i not in images or j not in images:
            continue

        strip_width = min(
            STRIP_WIDTH_PX,
            sa["output_width_px"],
            sa["output_height_px"],
            sb["output_width_px"],
            sb["output_height_px"],
        )
        strip_width = max(50, min(100, strip_width))

        try:
            strip_a = extract_strip(images[i], seam.edge_a, strip_width)
            strip_b = extract_strip(images[j], seam.edge_b, strip_width)
        except ValueError as e:
            print(f"Warning: Skipping seam ({i},{j}): {e}", file=sys.stderr)
            continue

        sig_a = strip_to_1d_along_seam(strip_a, seam.edge_a)
        sig_b = strip_to_1d_along_seam(strip_b, seam.edge_b)
        if min(len(sig_a), len(sig_b)) < 20:
            continue

        score = correlation_at_offset(sig_a, sig_b, offset=0)
        pass_ = score >= MATCH_THRESHOLD
        seam_results.append({
            "section_a": i,
            "section_b": j,
            "edge_a": seam.edge_a,
            "edge_b": seam.edge_b,
            "score": round(score, 4),
            "pass": pass_,
        })

    if not seam_results:
        confidence = "low"
    else:
        pass_count = sum(1 for r in seam_results if r["pass"])
        pass_rate = pass_count / len(seam_results)
        mean_score = sum(r["score"] for r in seam_results) / len(seam_results)
        confidence = "high" if (pass_rate >= 0.5 and mean_score >= 0.7) else "low"

    report = {
        "confidence": confidence,
        "seams": seam_results,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    try:
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
    except OSError as e:
        print(f"Error: Cannot write report: {e}", file=sys.stderr)
        return 1

    print(f"Wrote report (confidence={confidence}) to {report_path}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify edge-corrected placements and write confidence report.")
    parser.add_argument("--id", dest="painting_id", required=True, help="Painting ID (folder name under source_images)")
    parser.add_argument(
        "--source",
        type=Path,
        default=SOURCE_IMAGES_DEFAULT,
        help="Path to source_images root",
    )
    args = parser.parse_args()
    return run_verify(args.painting_id, args.source)


if __name__ == "__main__":
    sys.exit(main())
