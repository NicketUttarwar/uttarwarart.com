import { readdir, readFile } from "fs/promises";
import path from "path";
import type { Manifest } from "./types";

const SOURCE_IMAGES_DIR = path.join(process.cwd(), "source_images");

/** Discover all painting IDs (folder names) in source_images */
export async function getPaintingIds(): Promise<string[]> {
  const entries = await readdir(SOURCE_IMAGES_DIR, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
  return dirs;
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
