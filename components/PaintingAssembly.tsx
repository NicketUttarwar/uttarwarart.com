"use client";

import { useRef, useState, useLayoutEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { SymmetrySectionPlacement } from "@/lib/types";

const OFFSCREEN_PX = 120;

function getInitialOffset(edge: SymmetrySectionPlacement["entranceEdge"]) {
  switch (edge) {
    case "left":
      return { x: -OFFSCREEN_PX, y: 0 };
    case "right":
      return { x: OFFSCREEN_PX, y: 0 };
    case "top":
      return { x: 0, y: -OFFSCREEN_PX };
    case "bottom":
      return { x: 0, y: OFFSCREEN_PX };
  }
}

function useScaleToFit(containerRef: React.RefObject<HTMLElement | null>, sourceWidth: number, sourceHeight: number) {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || sourceWidth <= 0 || sourceHeight <= 0) return;

    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        setScale(Math.min(w / sourceWidth, h / sourceHeight));
      }
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, sourceWidth, sourceHeight]);

  return scale;
}

/** Stagger: each section gets a slice of progress so they don't all move at once. */
function sectionProgress(globalProgress: number, index: number, total: number): number {
  const stagger = 0.12;
  const start = index * stagger;
  const end = 1 - (total - 1 - index) * stagger;
  const span = Math.max(0.01, end - start);
  return Math.min(1, Math.max(0, (globalProgress - start) / span));
}

export interface PaintingAssemblyProps {
  paintingId: string;
  sourceWidth: number;
  sourceHeight: number;
  placements: SymmetrySectionPlacement[];
  sectionFilenames: Record<number, string>;
  /** When true, sections animate together (assembled); when false, they animate back to entrance edges. */
  assembled?: boolean;
  /** Scroll-driven: 0 = sections at entrance edges, 1 = fully assembled. Overrides assembled when set. */
  assemblyProgress?: number;
}

export function PaintingAssembly({
  paintingId,
  sourceWidth,
  sourceHeight,
  placements,
  sectionFilenames,
  assembled = true,
  assemblyProgress,
}: PaintingAssemblyProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scale = useScaleToFit(wrapperRef, sourceWidth, sourceHeight);
  const baseUrl = `/art/${encodeURIComponent(paintingId)}`;
  const useProgress = typeof assemblyProgress === "number";
  const variant = !useProgress ? (assembled ? "visible" : "hidden") : undefined;

  const aspectRatio = sourceWidth / sourceHeight;
  const maxHeightVh = "calc(100vh - 5rem)";
  const maxWidth = `min(100%, calc((100vh - 5rem) * ${aspectRatio}))`;

  return (
    <motion.div
      className="relative mx-auto w-full h-full max-h-full"
      style={{
        aspectRatio: `${sourceWidth} / ${sourceHeight}`,
        maxHeight: maxHeightVh,
        maxWidth,
      }}
      initial={false}
      animate={useProgress ? undefined : variant}
      variants={
        useProgress
          ? undefined
          : {
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.1,
                  delayChildren: 0.05,
                },
              },
            }
      }
    >
      <div
        ref={wrapperRef}
        className="absolute inset-0 w-full overflow-hidden rounded-lg bg-black"
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: sourceWidth,
            height: sourceHeight,
            transform: `scale(${scale})`,
          }}
        >
          {placements.map((p, i) => {
            const progress = useProgress
              ? sectionProgress(assemblyProgress!, i, placements.length)
              : undefined;
            const entrance = getInitialOffset(p.entranceEdge);
            const fromX = entrance.x;
            const fromY = entrance.y;
            const toX = 0;
            const toY = 0;
            const t = progress !== undefined ? progress : variant === "visible" ? 1 : 0;
            const ease = (x: number) =>
              x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 2);
            const e = ease(t);
            const x = fromX + (toX - fromX) * e;
            const y = fromY + (toY - fromY) * e;
            const opacity = 0.6 + 0.4 * e;

            const style: React.CSSProperties = {
              left: p.position.x,
              top: p.position.y,
              width: p.size.width,
              height: p.size.height,
              transform: `translate(${x}px, ${y}px)`,
              opacity,
            };

            return useProgress ? (
              <div
                key={p.sectionIndex}
                className="absolute overflow-hidden"
                style={style}
              >
                <Image
                  src={`${baseUrl}/${sectionFilenames[p.sectionIndex]}`}
                  alt={`Section ${p.sectionIndex}`}
                  fill
                  className="object-cover object-left-top"
                  sizes="(max-width: 768px) 100vw, 1024px"
                  draggable={false}
                />
              </div>
            ) : (
              <motion.div
                key={p.sectionIndex}
                className="absolute overflow-hidden"
                style={{
                  ...style,
                  transform: undefined,
                  x,
                  y,
                  opacity,
                }}
                transition={{
                  duration: 0.6,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                <Image
                  src={`${baseUrl}/${sectionFilenames[p.sectionIndex]}`}
                  alt={`Section ${p.sectionIndex}`}
                  fill
                  className="object-cover object-left-top"
                  sizes="(max-width: 768px) 100vw, 1024px"
                  draggable={false}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
