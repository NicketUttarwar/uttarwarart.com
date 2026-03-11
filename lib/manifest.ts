import { readdir, readFile } from "fs/promises";
import path from "path";
import type { Manifest, WarpBoundary } from "./types";

const SOURCE_IMAGES_DIR = path.join(process.cwd(), "source_images");

const FIRST_PAINTING_ID_PREFIX = "2018-04-14"; // Show this painting first in the gallery

/** Discover all painting IDs (folder names) in source_images */
export async function getPaintingIds(): Promise<string[]> {
  const entries = await readdir(SOURCE_IMAGES_DIR, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
  const first = dirs.find((id) => id.startsWith(FIRST_PAINTING_ID_PREFIX));
  if (!first) return dirs;
  return [first, ...dirs.filter((id) => id !== first)];
}

/** Read manifest.json for a painting. Use from server (Node) or pass fs path. */
export async function getManifest(paintingId: string): Promise<Manifest> {
  const manifestPath = path.join(
    SOURCE_IMAGES_DIR,
    paintingId,
    "manifest.json"
  );
  const raw = await readFile(manifestPath, "utf-8");
  return JSON.parse(raw) as Manifest;
}

/** Get manifest path for a painting (for static copy script / build) */
export function getManifestPath(paintingId: string): string {
  return path.join(SOURCE_IMAGES_DIR, paintingId, "manifest.json");
}

/** Edge-corrected placements from Python pipeline (section index -> origin) */
export interface EdgeCorrectedPlacements {
  [sectionIndex: string]: { origin_x: number; origin_y: number };
}

/** Read edge-corrected-placements.json if present. Returns null if file missing. */
export async function getEdgeCorrectedPlacements(
  paintingId: string
): Promise<EdgeCorrectedPlacements | null> {
  const placementsPath = path.join(
    SOURCE_IMAGES_DIR,
    paintingId,
    "edge-corrected-placements.json"
  );
  try {
    const raw = await readFile(placementsPath, "utf-8");
    return JSON.parse(raw) as EdgeCorrectedPlacements;
  } catch {
    return null;
  }
}

/** Path to warp-boundary.json (outer corners of final image) */
export function getWarpBoundaryPath(paintingId: string): string {
  return path.join(SOURCE_IMAGES_DIR, paintingId, "warp-boundary.json");
}

/** Read warp-boundary.json if present. Returns null if file missing. */
export async function getWarpBoundary(
  paintingId: string
): Promise<WarpBoundary | null> {
  const boundaryPath = getWarpBoundaryPath(paintingId);
  try {
    const raw = await readFile(boundaryPath, "utf-8");
    return JSON.parse(raw) as WarpBoundary;
  } catch {
    return null;
  }
}
