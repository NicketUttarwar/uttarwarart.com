import Link from "next/link";
import { notFound } from "next/navigation";
import { getManifest, getPaintingIds, getWarpBoundary } from "@/lib/manifest";
import { WarpLogicCanvas } from "@/components/WarpLogicCanvas";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const ids = await getPaintingIds();
  return ids.map((id) => ({ id }));
}

export default async function WarpLogicIdPage({ params }: PageProps) {
  const { id } = await params;
  let manifest;
  try {
    manifest = await getManifest(id);
  } catch {
    notFound();
  }
  const savedBoundary = await getWarpBoundary(id);

  return (
    <main className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <nav className="mb-6 flex items-center gap-4 text-sm text-zinc-400">
        <Link href="/" className="hover:text-white">
          ← Gallery
        </Link>
        <span className="text-zinc-600">|</span>
        <Link href="/warp-logic" className="hover:text-white">
          ← Warp logic
        </Link>
      </nav>
      <WarpLogicCanvas
        paintingId={id}
        sourceWidth={manifest.source_width}
        sourceHeight={manifest.source_height}
        sections={manifest.sections}
        initialBoundary={savedBoundary?.boundary_corners ?? null}
      />
    </main>
  );
}
