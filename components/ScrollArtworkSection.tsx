"use client";

import { useInView } from "framer-motion";
import { useRef } from "react";
import { PaintingAssembly } from "@/components/PaintingAssembly";
import type { SymmetrySectionPlacement } from "@/lib/types";

export interface ScrollArtworkSectionProps {
  paintingId: string;
  sourceWidth: number;
  sourceHeight: number;
  placements: SymmetrySectionPlacement[];
  sectionFilenames: Record<number, string>;
  title?: string;
}

export function ScrollArtworkSection({
  paintingId,
  sourceWidth,
  sourceHeight,
  placements,
  sectionFilenames,
  title,
}: ScrollArtworkSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.25, once: false });

  return (
    <section
      ref={ref}
      className="flex min-h-screen flex-col items-center justify-center px-4 py-16 md:py-24"
    >
      <div className="w-full max-w-6xl flex-1 flex flex-col items-center justify-center">
        <PaintingAssembly
          paintingId={paintingId}
          sourceWidth={sourceWidth}
          sourceHeight={sourceHeight}
          placements={placements}
          sectionFilenames={sectionFilenames}
          assembled={inView}
        />
        {title && (
          <p className="mt-6 text-center text-sm text-zinc-400">{title}</p>
        )}
      </div>
    </section>
  );
}
