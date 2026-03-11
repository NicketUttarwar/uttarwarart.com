"use client";

export interface ScrollGuideMarker {
  id: string;
  label?: string;
  /** 0–1, position along the page (e.g. section top / total height) */
  position: number;
}

export interface ScrollGuideProps {
  /** 0–1, how far down the page the user has scrolled */
  scrollProgress: number;
  markers: ScrollGuideMarker[];
  /** Optional: scroll target Y for each marker id, for click-to-scroll */
  onMarkerClick?: (id: string) => void;
}

export function ScrollGuide({
  scrollProgress,
  markers,
  onMarkerClick,
}: ScrollGuideProps) {
  return (
    <aside
      className="fixed left-0 top-0 z-20 flex h-screen w-12 flex-col items-center py-6 md:w-14"
      aria-label="Scroll progress"
    >
      {/* Track */}
      <div className="relative h-full w-0.5 rounded-full bg-zinc-800">
        {/* Fill */}
        <div
          className="absolute left-0 top-0 w-full rounded-full bg-zinc-500 transition-[height] duration-150 ease-out"
          style={{ height: `${scrollProgress * 100}%` }}
        />
        {/* Markers */}
        {markers.map((m) => (
          <button
            key={m.id}
            type="button"
            className="absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-zinc-600 bg-zinc-950 transition-colors hover:border-zinc-400 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
            style={{
              top: `${m.position * 100}%`,
              width: "12px",
              height: "12px",
            }}
            title={m.label ?? m.id}
            aria-label={m.label ?? `Go to image ${m.id}`}
            onClick={() => onMarkerClick?.(m.id)}
          />
        ))}
      </div>
    </aside>
  );
}
