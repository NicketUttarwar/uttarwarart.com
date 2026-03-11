import Link from "next/link";
import { notFound } from "next/navigation";
import { getManifest, getPaintingIds, getEdgeCorrectedPlacements } from "@/lib/manifest";
import { computeEdgeCorrectedLayout } from "@/lib/symmetry-layout";
import { PaintingAssembly } from "@/components/PaintingAssembly";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const ids = await getPaintingIds();
  return ids.map((id) => ({ id }));
}

export default async function ArtPage({ params }: PageProps) {
  const { id } = await params;
  let manifest;
  try {
    manifest = await getManifest(id);
  } catch {
    notFound();
  }
  const edgeCorrected = await getEdgeCorrectedPlacements(id);
  const placements = computeEdgeCorrectedLayout(manifest, edgeCorrected);
  const sectionFilenames: Record<number, string> = {};
  for (const s of manifest.sections) {
    sectionFilenames[s.index] = s.filename;
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <nav className="mb-6 flex items-center gap-4 text-sm text-zinc-400">
        <Link href="/" className="hover:text-white">
          ← Gallery
        </Link>
        <span className="text-zinc-600">|</span>
        <Link href="/warp-logic" className="hover:text-white">
          Warp logic
        </Link>
      </nav>
      <div className="w-full">
        <PaintingAssembly
          paintingId={id}
          sourceWidth={manifest.source_width}
          sourceHeight={manifest.source_height}
          placements={placements}
          sectionFilenames={sectionFilenames}
        />
      </div>
    </main>
  );
}
