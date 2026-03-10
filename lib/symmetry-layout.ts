import type { Manifest, SymmetryLayoutResult, SymmetrySectionPlacement } from "./types";

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
    return {
      sectionIndex,
      displayOrder,
      position: { x: s.origin_x, y: s.origin_y },
      size: { width: s.output_width_px, height: s.output_height_px },
      entranceEdge: getEdge(s.origin_x / sw, s.origin_y / sh),
    };
  });
}
