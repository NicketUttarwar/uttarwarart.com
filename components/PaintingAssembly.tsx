"use client";

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

export interface PaintingAssemblyProps {
  paintingId: string;
  sourceWidth: number;
  sourceHeight: number;
  placements: SymmetrySectionPlacement[];
  sectionFilenames: Record<number, string>;
  /** When true, sections animate together (assembled); when false, they animate back to entrance edges. */
  assembled?: boolean;
}

export function PaintingAssembly({
  paintingId,
  sourceWidth,
  sourceHeight,
  placements,
  sectionFilenames,
  assembled = true,
}: PaintingAssemblyProps) {
  const baseUrl = `/art/${encodeURIComponent(paintingId)}`;
  const variant = assembled ? "visible" : "hidden";

  return (
    <motion.div
      className="relative mx-auto w-full max-w-6xl"
      style={{ aspectRatio: `${sourceWidth} / ${sourceHeight}` }}
      initial={false}
      animate={variant}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.1,
            delayChildren: 0.05,
          },
        },
      }}
    >
      <div className="absolute inset-0 w-full overflow-hidden rounded-lg bg-black">
        {placements.map((p) => (
          <motion.div
            key={p.sectionIndex}
            className="absolute overflow-hidden"
            style={{
              left: `${(p.position.x / sourceWidth) * 100}%`,
              top: `${(p.position.y / sourceHeight) * 100}%`,
              width: `${(p.size.width / sourceWidth) * 100}%`,
              height: `${(p.size.height / sourceHeight) * 100}%`,
            }}
            variants={{
              hidden: {
                ...getInitialOffset(p.entranceEdge),
                opacity: 0.6,
                transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
              },
              visible: {
                x: 0,
                y: 0,
                opacity: 1,
                transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
              },
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
        ))}
      </div>
    </motion.div>
  );
}
