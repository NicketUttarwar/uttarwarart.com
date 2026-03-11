import type {
  Manifest,
  SymmetryLayoutResult,
  SymmetrySectionPlacement,
} from "./types";
import type { EdgeCorrectedPlacements } from "./manifest";

const SYMMETRY_TOLERANCE_FRAC = 0.06; // max nudge as fraction of source dimension
const CENTER_X = 0.5;
const CENTER_Y = 0.5;

type Edge = "left" | "right" | "top" | "bottom";

/**
 * Pure logic: manifest in → adjusted positions/order out.
 * Uses manifest bounds (origin) and applies a slight pixel nudge for symmetry
 * so sections still connect but the composite looks more balanced.
 * Positions are in source image pixels for exact alignment.
 */
export function computeSymmetryLayout(manifest: Manifest): SymmetryLayoutResult {
  const { sections, source_width: sw, source_height: sh } = manifest;
  const order = manifest.layout.reading_order;

  const getEdge = (normX: number, normY: number): Edge => {
    const toLeft = normX;
    const toRight = 1 - normX;
    const toTop = normY;
    const toBottom = 1 - normY;
    const min = Math.min(toLeft, toRight, toTop, toBottom);
    if (min === toLeft) return "left";
    if (min === toRight) return "right";
    if (min === toTop) return "top";
    return "bottom";
  };

  const result: SymmetrySectionPlacement[] = order.map((sectionIndex, displayOrder) => {
    const s = sections.find((x) => x.index === sectionIndex)!;
    let x = s.origin_x;
    let y = s.origin_y;
    const cx = s.centroid_x / sw;
    const cy = s.centroid_y / sh;
    const dx = CENTER_X - cx;
    const dy = CENTER_Y - cy;
    if (Math.abs(dx) <= SYMMETRY_TOLERANCE_FRAC * 2) {
      x += dx * sw * 0.3;
    }
    if (Math.abs(dy) <= SYMMETRY_TOLERANCE_FRAC * 2) {
      y += dy * sh * 0.3;
    }
    x = Math.max(0, Math.min(sw - s.output_width_px, x));
    y = Math.max(0, Math.min(sh - s.output_height_px, y));
    return {
      sectionIndex,
      displayOrder,
      position: { x: Math.round(x), y: Math.round(y) },
      size: { width: s.output_width_px, height: s.output_height_px },
      entranceEdge: getEdge(s.origin_x / sw, s.origin_y / sh),
    };
  });

  return result;
}

/**
 * Placements from manifest exactly (no symmetry nudge).
 * Recreates the composite precisely from section origin/size in the manifest.
 */
export function computeExactLayout(manifest: Manifest): SymmetryLayoutResult {
  const { sections, source_width: sw, source_height: sh } = manifest;
  const order = manifest.layout.reading_order;

  const getEdge = (normX: number, normY: number): Edge => {
    const toLeft = normX;
    const toRight = 1 - normX;
    const toTop = normY;
    const toBottom = 1 - normY;
    const min = Math.min(toLeft, toRight, toTop, toBottom);
    if (min === toLeft) return "left";
    if (min === toRight) return "right";
    if (min === toTop) return "top";
    return "bottom";
  };

  return order.map((sectionIndex, displayOrder) => {
    const s = sections.find((x) => x.index === sectionIndex)!;
    const x = Math.round(s.origin_x);
    const y = Math.round(s.origin_y);
    const w = Math.round(s.output_width_px);
    const h = Math.round(s.output_height_px);
    return {
      sectionIndex,
      displayOrder,
      position: { x, y },
      size: { width: w, height: h },
      entranceEdge: getEdge(s.origin_x / sw, s.origin_y / sh),
    };
  });
}

/**
 * Placements using edge-corrected origins when available (from edge-align pipeline).
 * Falls back to manifest origins for sections not in the corrections map.
 */
export function computeEdgeCorrectedLayout(
  manifest: Manifest,
  edgeCorrectedPlacements: EdgeCorrectedPlacements | null
): SymmetryLayoutResult {
  const { sections, source_width: sw, source_height: sh } = manifest;
  const order = manifest.layout.reading_order;

  const getEdge = (normX: number, normY: number): Edge => {
    const toLeft = normX;
    const toRight = 1 - normX;
    const toTop = normY;
    const toBottom = 1 - normY;
    const min = Math.min(toLeft, toRight, toTop, toBottom);
    if (min === toLeft) return "left";
    if (min === toRight) return "right";
    if (min === toTop) return "top";
    return "bottom";
  };

  return order.map((sectionIndex, displayOrder) => {
    const s = sections.find((x) => x.index === sectionIndex)!;
    const corrected = edgeCorrectedPlacements?.[String(sectionIndex)];
    const x = corrected
      ? Math.round(corrected.origin_x)
      : Math.round(s.origin_x);
    const y = corrected
      ? Math.round(corrected.origin_y)
      : Math.round(s.origin_y);
    const w = Math.round(s.output_width_px);
    const h = Math.round(s.output_height_px);
    return {
      sectionIndex,
      displayOrder,
      position: { x, y },
      size: { width: w, height: h },
      entranceEdge: getEdge(
        (corrected?.origin_x ?? s.origin_x) / sw,
        (corrected?.origin_y ?? s.origin_y) / sh
      ),
    };
  });
}
