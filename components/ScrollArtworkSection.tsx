"use client";

import { useInView } from "framer-motion";
import { useRef } from "react";
import { PaintingAssembly } from "@/components/PaintingAssembly";
import type { Manifest, SymmetrySectionPlacement } from "@/lib/types";

export interface ScrollArtworkSectionProps {
  paintingId: string;
  sourceWidth: number;
  sourceHeight: number;
  placements: SymmetrySectionPlacement[];
  sectionFilenames: Record<number, string>;
  title?: string;
  /** When set, assembly is driven by scroll (0–1). Otherwise uses inView. */
  assemblyProgress?: number;
  manifest?: Manifest;
}

export function ScrollArtworkSection({
  paintingId,
  sourceWidth,
  sourceHeight,
  placements,
  sectionFilenames,
  title,
  assemblyProgress,
  manifest,
}: ScrollArtworkSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.25, once: false });
  const useScrollProgress = typeof assemblyProgress === "number";

  return (
    <section
      ref={ref}
      className="flex min-h-full flex-1 flex-col items-center justify-center"
    >
      <div className="w-full h-full flex-1 flex min-h-0 flex-col items-center justify-center">
        <PaintingAssembly
          paintingId={paintingId}
          sourceWidth={sourceWidth}
          sourceHeight={sourceHeight}
          placements={placements}
          sectionFilenames={sectionFilenames}
          assembled={useScrollProgress ? undefined : inView}
          assemblyProgress={assemblyProgress}
        />
        {title && (
          <p className="mt-6 text-center text-sm text-zinc-400">{title}</p>
        )}
      </div>
    </section>
  );
}
