import { getManifest, getPaintingIds, getEdgeCorrectedPlacements } from "@/lib/manifest";
import { computeEdgeCorrectedLayout } from "@/lib/symmetry-layout";
import { GalleryWithScroll } from "@/components/GalleryWithScroll";

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
      const edgeCorrected = await getEdgeCorrectedPlacements(id);
      const placements = computeEdgeCorrectedLayout(manifest, edgeCorrected);
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
        manifest,
      };
    })
  );

  return (
    <main className="min-h-screen bg-zinc-950">
      <GalleryWithScroll artworks={artworks} />
    </main>
  );
}
