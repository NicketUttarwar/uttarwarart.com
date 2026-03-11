import type { Point2D } from "./types";

/** Convex hull of points (Graham scan). Returns ordered boundary corners. */
export function convexHull(points: Point2D[]): Point2D[] {
  if (points.length < 3) return [...points];
  const pts = dedupePoints(points);
  if (pts.length < 3) return pts;

  const start = pts.reduce((min, p) => (p[1] < min[1] || (p[1] === min[1] && p[0] < min[0]) ? p : min));
  const byAngle = pts
    .filter((p) => p !== start)
    .sort((a, b) => {
      const ax = a[0] - start[0];
      const ay = a[1] - start[1];
      const bx = b[0] - start[0];
      const by = b[1] - start[1];
      const cross = ax * by - ay * bx;
      if (Math.abs(cross) > 1e-9) return cross > 0 ? -1 : 1;
      return ax * ax + ay * ay - (bx * bx + by * by);
    });

  const hull: Point2D[] = [start, byAngle[0]];
  for (let i = 1; i < byAngle.length; i++) {
    const next = byAngle[i];
    while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], next) <= 0) {
      hull.pop();
    }
    hull.push(next);
  }
  return hull;
}

function cross(o: Point2D, a: Point2D, b: Point2D): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function dedupePoints(points: Point2D[]): Point2D[] {
  const seen = new Set<string>();
  return points.filter((p) => {
    const key = `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
