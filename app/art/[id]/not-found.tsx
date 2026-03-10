import Link from "next/link";

export default function ArtNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <p className="text-zinc-400">This work could not be found.</p>
      <Link href="/" className="text-sm text-white underline hover:no-underline">
        Back to gallery
      </Link>
    </main>
  );
}
