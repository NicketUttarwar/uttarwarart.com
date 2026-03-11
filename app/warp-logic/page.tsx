import Link from "next/link";
import { getPaintingIds, getWarpBoundary } from "@/lib/manifest";

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

export default async function WarpLogicListPage() {
  const ids = await getPaintingIds();
  const withBoundary = await Promise.all(
    ids.map(async (id) => ({
      id,
      title: formatTitle(id),
      hasBoundary: (await getWarpBoundary(id)) !== null,
    }))
  );

  return (
    <main className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <nav className="mb-6 flex items-center gap-4 text-sm text-zinc-400">
        <Link href="/" className="hover:text-white">
          ← Gallery
        </Link>
        <span className="text-zinc-600">|</span>
        <span className="text-zinc-500">Warp logic</span>
      </nav>
      <header className="mb-8">
        <h1 className="text-xl font-light tracking-wide text-white md:text-2xl">
          Warp logic
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Pick an image to define the outer boundary. Each section has four corner
          markers; click a boundary corner to remove it, then save.
        </p>
      </header>
      <ul className="flex flex-col gap-2">
        {withBoundary.map(({ id, title, hasBoundary }) => (
          <li key={id}>
            <Link
              href={`/warp-logic/${encodeURIComponent(id)}`}
              className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-white transition hover:border-zinc-600 hover:bg-zinc-800/50"
            >
              <span>{title}</span>
              {hasBoundary ? (
                <span className="text-xs text-emerald-500">boundary saved</span>
              ) : (
                <span className="text-xs text-zinc-500">no boundary</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
