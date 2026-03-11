import { writeFile } from "fs/promises";
import { getPaintingIds, getWarpBoundaryPath } from "@/lib/manifest";
import type { WarpBoundary } from "@/lib/types";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: { paintingId?: string; boundary_corners?: [number, number][] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const { paintingId, boundary_corners } = body;
  const ids = await getPaintingIds();
  if (!paintingId || !ids.includes(paintingId)) {
    return NextResponse.json(
      { error: "Missing or invalid paintingId" },
      { status: 400 }
    );
  }
  if (!Array.isArray(boundary_corners) || boundary_corners.length < 3) {
    return NextResponse.json(
      { error: "boundary_corners must be an array of at least 3 points [x,y]" },
      { status: 400 }
    );
  }
  const warpBoundary: WarpBoundary = { boundary_corners };
  const boundaryPath = getWarpBoundaryPath(paintingId);
  try {
    await writeFile(
      boundaryPath,
      JSON.stringify(warpBoundary, null, 2),
      "utf-8"
    );
    const savedPath = `source_images/${paintingId}/warp-boundary.json`;
    return NextResponse.json({ ok: true, savedPath });
  } catch (err) {
    console.error("warp-boundary write failed:", err);
    return NextResponse.json(
      { error: "Failed to write warp-boundary.json" },
      { status: 500 }
    );
  }
}
