"use client";

import { useRef, useState, useCallback, useLayoutEffect } from "react";
import type { Point2D, Section } from "@/lib/types";
import { convexHull } from "@/lib/convex-hull";

const SECTION_CORNER_RADIUS_SOURCE = 4;
const BOUNDARY_VERTEX_RADIUS_SOURCE = 8;
const HIT_RADIUS_SOURCE = 12;

export interface WarpLogicCanvasProps {
  paintingId: string;
  sourceWidth: number;
  sourceHeight: number;
  sections: Section[];
  initialBoundary: Point2D[] | null;
}

function getAllSectionCorners(sections: Section[]): Point2D[] {
  const out: Point2D[] = [];
  for (const s of sections) {
    for (const c of s.corners ?? []) {
      if (Array.isArray(c) && c.length >= 2) out.push([c[0], c[1]]);
    }
  }
  return out;
}

/** Squared distance from point P to segment A-B */
function dist2ToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const v2 = vx * vx + vy * vy;
  if (v2 < 1e-12) return wx * wx + wy * wy;
  let t = (wx * vx + wy * vy) / v2;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * vx;
  const qy = ay + t * vy;
  return (px - qx) ** 2 + (py - qy) ** 2;
}

/** Index of boundary edge (segment) closest to point. Edge i is boundary[i] -> boundary[(i+1)%n]. */
function findClosestBoundaryEdge(point: Point2D, boundary: Point2D[]): number {
  if (boundary.length < 2) return -1;
  let bestIdx = -1;
  let bestD2 = Infinity;
  const n = boundary.length;
  for (let i = 0; i < n; i++) {
    const a = boundary[i];
    const b = boundary[(i + 1) % n];
    const d2 = dist2ToSegment(point, a, b);
    if (d2 < bestD2) {
      bestD2 = d2;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function WarpLogicCanvas({
  paintingId,
  sourceWidth,
  sourceHeight,
  sections,
  initialBoundary,
}: WarpLogicCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [boundary, setBoundary] = useState<Point2D[]>(() => {
    if (initialBoundary && initialBoundary.length >= 3) return initialBoundary;
    const allCorners = getAllSectionCorners(sections);
    return convexHull(allCorners);
  });
  const [hoverCorner, setHoverCorner] = useState<{
    sectionIndex: number;
    cornerIndex: number;
    point: Point2D;
  } | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [addCornerMode, setAddCornerMode] = useState(false);
  const [hoveredEdgeIndex, setHoveredEdgeIndex] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el || sourceWidth <= 0 || sourceHeight <= 0) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        const s = Math.min(w / sourceWidth, h / sourceHeight);
        setScale(s);
        setOffset({
          x: (w - sourceWidth * s) / 2,
          y: (h - sourceHeight * s) / 2,
        });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sourceWidth, sourceHeight]);

  const sourceToCanvas = useCallback(
    (sx: number, sy: number) => ({
      x: offset.x + sx * scale,
      y: offset.y + sy * scale,
    }),
    [offset, scale]
  );

  const canvasToSource = useCallback(
    (cx: number, cy: number): Point2D => [
      (cx - offset.x) / scale,
      (cy - offset.y) / scale,
    ],
    [offset, scale]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || sourceWidth <= 0 || sourceHeight <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Section outlines (quads)
    ctx.strokeStyle = "rgba(100, 116, 139, 0.5)";
    ctx.lineWidth = 1;
    for (const s of sections) {
      const corners = s.corners ?? [];
      if (corners.length < 3) continue;
      ctx.beginPath();
      const first = sourceToCanvas(corners[0][0], corners[0][1]);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < corners.length; i++) {
        const p = sourceToCanvas(corners[i][0], corners[i][1]);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Section corner markers (small circles)
    for (let si = 0; si < sections.length; si++) {
      const s = sections[si];
      const corners = s.corners ?? [];
      for (let ci = 0; ci < corners.length; ci++) {
        const [x, y] = corners[ci];
        const { x: cx, y: cy } = sourceToCanvas(x, y);
        const isHover =
          hoverCorner?.sectionIndex === si && hoverCorner?.cornerIndex === ci;
        ctx.beginPath();
        ctx.arc(cx, cy, SECTION_CORNER_RADIUS_SOURCE * scale, 0, Math.PI * 2);
        ctx.fillStyle = isHover ? "rgba(251, 191, 36, 0.9)" : "rgba(96, 165, 250, 0.8)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Boundary polygon
    if (boundary.length >= 2) {
      ctx.strokeStyle = "rgba(34, 197, 94, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const first = sourceToCanvas(boundary[0][0], boundary[0][1]);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < boundary.length; i++) {
        const p = sourceToCanvas(boundary[i][0], boundary[i][1]);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = "rgba(34, 197, 94, 0.12)";
      ctx.fill();

      // Boundary vertices (clickable)
      const highlightEdge =
        addCornerMode && hoveredEdgeIndex !== null && boundary.length >= 2;
      const nextIdx = (i: number) => (i + 1) % boundary.length;
      for (let i = 0; i < boundary.length; i++) {
        const [x, y] = boundary[i];
        const { x: cx, y: cy } = sourceToCanvas(x, y);
        const isHighlighted =
          highlightEdge &&
          (i === hoveredEdgeIndex || i === nextIdx(hoveredEdgeIndex));
        ctx.beginPath();
        ctx.arc(
          cx,
          cy,
          BOUNDARY_VERTEX_RADIUS_SOURCE * scale,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = isHighlighted
          ? "rgba(251, 191, 36, 0.95)"
          : "rgba(34, 197, 94, 0.9)";
        ctx.fill();
        ctx.strokeStyle = isHighlighted ? "rgb(255,255,255)" : "rgb(255,255,255)";
        ctx.lineWidth = isHighlighted ? 3 : 2;
        ctx.stroke();
      }
      // Highlight the edge segment when adding corner
      if (highlightEdge) {
        const a = boundary[hoveredEdgeIndex];
        const b = boundary[nextIdx(hoveredEdgeIndex)];
        const ac = sourceToCanvas(a[0], a[1]);
        const bc = sourceToCanvas(b[0], b[1]);
        ctx.beginPath();
        ctx.moveTo(ac.x, ac.y);
        ctx.lineTo(bc.x, bc.y);
        ctx.strokeStyle = "rgba(251, 191, 36, 0.8)";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }, [
    sourceWidth,
    sourceHeight,
    sections,
    boundary,
    hoverCorner,
    addCornerMode,
    hoveredEdgeIndex,
    scale,
    offset,
    sourceToCanvas,
  ]);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const dpr = window.devicePixelRatio ?? 1;
    const w = el.clientWidth;
    const h = el.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
    draw();
  }, [draw]);

  const getCanvasRect = useCallback(() => {
    const canvas = canvasRef.current;
    return canvas?.getBoundingClientRect() ?? null;
  }, []);

  const findBoundaryVertexAt = useCallback(
    (sourcePoint: Point2D): number => {
      const [sx, sy] = sourcePoint;
      let best = -1;
      let bestD2 = HIT_RADIUS_SOURCE * HIT_RADIUS_SOURCE;
      for (let i = 0; i < boundary.length; i++) {
        const [bx, by] = boundary[i];
        const d2 = (bx - sx) ** 2 + (by - sy) ** 2;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = i;
        }
      }
      return best;
    },
    [boundary]
  );

  const findSectionCornerAt = useCallback(
    (sourcePoint: Point2D): { sectionIndex: number; cornerIndex: number } | null => {
      const [sx, sy] = sourcePoint;
      const r2 = HIT_RADIUS_SOURCE * HIT_RADIUS_SOURCE;
      for (let si = 0; si < sections.length; si++) {
        const corners = sections[si].corners ?? [];
        for (let ci = 0; ci < corners.length; ci++) {
          const [cx, cy] = corners[ci];
          if ((cx - sx) ** 2 + (cy - sy) ** 2 <= r2)
            return { sectionIndex: si, cornerIndex: ci };
        }
      }
      return null;
    },
    [sections]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = getCanvasRect();
      if (!rect) return;
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;
      const sourcePoint = canvasToSource(canvasX, canvasY);
      if (addCornerMode && boundary.length >= 2) {
        const edgeIdx = findClosestBoundaryEdge(sourcePoint, boundary);
        setHoveredEdgeIndex(edgeIdx >= 0 ? edgeIdx : null);
        setHoverCorner(null);
        return;
      }
      setHoveredEdgeIndex(null);
      const boundaryIdx = findBoundaryVertexAt(sourcePoint);
      if (boundaryIdx >= 0) {
        setHoverCorner(null);
        return;
      }
      const sectionCorner = findSectionCornerAt(sourcePoint);
      setHoverCorner(
        sectionCorner
          ? {
              sectionIndex: sectionCorner.sectionIndex,
              cornerIndex: sectionCorner.cornerIndex,
              point: sourcePoint,
            }
          : null
      );
    },
    [
      addCornerMode,
      boundary,
      getCanvasRect,
      canvasToSource,
      findBoundaryVertexAt,
      findSectionCornerAt,
    ]
  );

  const handlePointerLeave = useCallback(() => {
    setHoverCorner(null);
    setHoveredEdgeIndex(null);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = getCanvasRect();
      if (!rect) return;
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;
      const sourcePoint = canvasToSource(canvasX, canvasY);
      if (addCornerMode && hoveredEdgeIndex !== null && boundary.length >= 2) {
        setBoundary((prev) => {
          const next = [...prev];
          next.splice(hoveredEdgeIndex + 1, 0, [...sourcePoint]);
          return next;
        });
        setSaveStatus("idle");
        return;
      }
      const boundaryIdx = findBoundaryVertexAt(sourcePoint);
      if (boundaryIdx >= 0 && boundary.length > 3) {
        setBoundary((prev) => prev.filter((_, i) => i !== boundaryIdx));
        setSaveStatus("idle");
      }
    },
    [
      addCornerMode,
      hoveredEdgeIndex,
      boundary.length,
      getCanvasRect,
      canvasToSource,
      findBoundaryVertexAt,
    ]
  );

  const handleSave = useCallback(async () => {
    if (boundary.length < 3) return;
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/warp-boundary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paintingId, boundary_corners: boundary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, [paintingId, boundary]);

  const handleResetToHull = useCallback(() => {
    const allCorners = getAllSectionCorners(sections);
    setBoundary(convexHull(allCorners));
    setSaveStatus("idle");
  }, [sections]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
        <button
          type="button"
          onClick={() => {
            setAddCornerMode((prev) => !prev);
            if (addCornerMode) setHoveredEdgeIndex(null);
          }}
          className={`rounded px-3 py-1.5 ${
            addCornerMode
              ? "bg-amber-600 text-white"
              : "border border-zinc-600 text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          Add corner
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={boundary.length < 3 || saveStatus === "saving"}
          className="rounded bg-zinc-700 px-3 py-1.5 text-white hover:bg-zinc-600 disabled:opacity-50"
        >
          {saveStatus === "saving"
            ? "Saving…"
            : saveStatus === "saved"
              ? "Saved"
              : "Save boundary"}
        </button>
        <button
          type="button"
          onClick={handleResetToHull}
          className="rounded border border-zinc-600 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800"
        >
          Reset to convex hull
        </button>
        {saveStatus === "error" && (
          <span className="text-red-400">Save failed</span>
        )}
      </div>
      <p className="text-xs text-zinc-500">
        Blue dots: section corners. Green polygon: outer boundary.{" "}
        {addCornerMode
          ? "Add corner mode: hover to highlight the nearest edge (two corners); click to insert a new corner there."
          : "Click a green vertex to remove it (min 3)."}{" "}
        Save writes to{" "}
        <code className="rounded bg-zinc-800 px-1">source_images/{paintingId}/warp-boundary.json</code>
      </p>
      <div
        ref={wrapperRef}
        className="relative flex min-h-[400px] w-full items-center justify-center rounded border border-zinc-800 bg-zinc-900/50"
        style={{ aspectRatio: `${sourceWidth} / ${sourceHeight}` }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full cursor-crosshair"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onClick={handleClick}
          aria-label="Warp boundary editor"
        />
        {hoverCorner !== null && (
          <div
            className="pointer-events-none absolute left-4 top-4 rounded bg-zinc-800/95 px-2 py-1 text-xs text-zinc-200"
            style={{ zIndex: 10 }}
          >
            Section {hoverCorner.sectionIndex}, corner {hoverCorner.cornerIndex}
          </div>
        )}
      </div>
    </div>
  );
}
