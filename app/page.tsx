import { getManifest, getPaintingIds } from "@/lib/manifest";
import { computeExactLayout } from "@/lib/symmetry-layout";
import { ScrollArtworkSection } from "@/components/ScrollArtworkSection";

function formatTitle(id: string): string {
  if (id.startsWith("IMG_")) return id;
  const parts = id.split("_");
  if (parts.length >= 2) {
    const date = parts[0];
    const time = parts[1]?.replace(/-/g, ":") ?? "";
    return `${date} ${time}`;
  }
  return id;
}

export default async function HomePage() {
  const ids = await getPaintingIds();
  const artworks = await Promise.all(
    ids.map(async (id) => {
      const manifest = await getManifest(id);
      const placements = computeExactLayout(manifest);
      const sectionFilenames: Record<number, string> = {};
      for (const s of manifest.sections) {
        sectionFilenames[s.index] = s.filename;
      }
      return {
        id,
        sourceWidth: manifest.source_width,
        sourceHeight: manifest.source_height,
        placements,
        sectionFilenames,
        title: formatTitle(id),
      };
    })
  );

  return (
    <main className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-800/50 bg-zinc-950/90 px-4 py-4 text-center backdrop-blur-sm">
        <h1 className="text-xl font-light tracking-wide text-white md:text-2xl">
          Uttarwar Art
        </h1>
        <p className="mt-1 text-xs text-zinc-500">Scroll — sections come together</p>
      </header>
      {artworks.map((art) => (
        <ScrollArtworkSection
          key={art.id}
          paintingId={art.id}
          sourceWidth={art.sourceWidth}
          sourceHeight={art.sourceHeight}
          placements={art.placements}
          sectionFilenames={art.sectionFilenames}
          title={art.title}
        />
      ))}
    </main>
  );
}
