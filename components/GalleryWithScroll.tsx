"use client";

import Link from "next/link";
import { useRef, useState, useCallback, useLayoutEffect } from "react";
import { ScrollGuide, type ScrollGuideMarker } from "@/components/ScrollGuide";
import { ScrollArtworkSection } from "@/components/ScrollArtworkSection";
import type { Manifest, SymmetrySectionPlacement } from "@/lib/types";

export interface ArtworkData {
  id: string;
  sourceWidth: number;
  sourceHeight: number;
  placements: SymmetrySectionPlacement[];
  sectionFilenames: Record<number, string>;
  title: string;
  manifest: Manifest;
}

const SCROLL_RANGE_VH = 100; // how much scroll (in viewport heights) drives assembly 0→1 per section

export interface GalleryWithScrollProps {
  artworks: ArtworkData[];
}

export function GalleryWithScroll({ artworks }: GalleryWithScrollProps) {
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [sectionProgress, setSectionProgress] = useState<number[]>([]);
  const [markers, setMarkers] = useState<ScrollGuideMarker[]>([]);

  const measure = useCallback(() => {
    if (typeof window === "undefined") return;
    const vh = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    const scrollRange = Math.max(1, docHeight - vh);
    const scrollY = window.scrollY;
    const scrollRangePx = (SCROLL_RANGE_VH / 100) * vh;

    setScrollProgress(Math.min(1, scrollY / scrollRange));

    const newProgress: number[] = [];
    const newMarkers: ScrollGuideMarker[] = [];

    for (let i = 0; i < artworks.length; i++) {
      const el = sectionRefs.current[i] ?? null;
      if (!el) {
        newProgress.push(0);
        if (artworks[i]) {
          newMarkers.push({
            id: artworks[i].id,
            label: artworks[i].title,
            position: 0,
          });
        }
        continue;
      }
      const rect = el.getBoundingClientRect();
      const sectionTop = rect.top + scrollY;
      const scrollIntoSection = scrollY - sectionTop;
      const progress = Math.min(
        1,
        Math.max(0, scrollIntoSection / scrollRangePx)
      );
      newProgress.push(progress);
      const art = artworks[i];
      if (art) {
        newMarkers.push({
          id: art.id,
          label: art.title,
          position: Math.min(1, Math.max(0, sectionTop / scrollRange)),
        });
      }
    }
    setSectionProgress(newProgress);
    setMarkers(newMarkers);
  }, [artworks]);

  useLayoutEffect(() => {
    measure();
    const raf = requestAnimationFrame(() => measure());
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    const main = document.querySelector("main");
    if (main) ro.observe(main);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [measure]);

  const handleMarkerClick = useCallback(
    (id: string) => {
      const index = artworks.findIndex((a) => a.id === id);
      const el = index >= 0 ? sectionRefs.current[index] : null;
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [artworks]
  );

  return (
    <>
      <ScrollGuide
        scrollProgress={scrollProgress}
        markers={markers}
        onMarkerClick={handleMarkerClick}
      />

      <div className="pl-12 md:pl-14">
      <header className="sticky top-0 z-10 border-b border-zinc-800/50 bg-zinc-950/90 px-4 py-2 text-center backdrop-blur-sm">
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-xl font-light tracking-wide text-white md:text-2xl">
            Uttarwar Art
          </h1>
          <p className="text-xs text-zinc-500">
            Scroll — each image locks; sections come from the outside in
          </p>
          <Link
            href="/warp-logic"
            className="mt-1 text-xs text-zinc-400 underline hover:text-white"
          >
            Warp logic
          </Link>
        </div>
      </header>

      {artworks.map((art, i) => (
        <section
          key={art.id}
          ref={(el) => {
            sectionRefs.current[i] = el;
          }}
          className="relative"
          style={{ minHeight: `${100 + SCROLL_RANGE_VH}vh` }}
        >
          <div className="sticky top-0 flex min-h-screen flex-col items-center justify-center px-2 py-2 md:px-4 md:py-4">
            <div className="w-full flex-1 flex min-h-0 flex-col items-center justify-center">
              <ScrollArtworkSection
                paintingId={art.id}
                sourceWidth={art.sourceWidth}
                sourceHeight={art.sourceHeight}
                placements={art.placements}
                sectionFilenames={art.sectionFilenames}
                title={art.title}
                assemblyProgress={sectionProgress[i] ?? 0}
                manifest={art.manifest}
              />
            </div>
          </div>
        </section>
      ))}
      </div>
    </>
  );
}
