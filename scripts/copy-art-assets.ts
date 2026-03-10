/**
 * Copy section images and composite from source_images/<id>/ to public/art/<id>/
 * so Next can serve them at /art/<id>/section-0.png etc.
 */
import { cp, mkdir, readdir } from "fs/promises";
import path from "path";

const SOURCE = path.join(process.cwd(), "source_images");
const DEST = path.join(process.cwd(), "public", "art");

async function main() {
  const entries = await readdir(SOURCE, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));

  await mkdir(DEST, { recursive: true });

  for (const d of dirs) {
    const srcDir = path.join(SOURCE, d.name);
    const destDir = path.join(DEST, d.name);
    await mkdir(destDir, { recursive: true });
    const files = await readdir(srcDir);
    const toCopy = files.filter(
      (f) =>
        f.endsWith(".png") &&
        (f.startsWith("section-") || f === "composite.png" || f === "composite-recreated.png")
    );
    for (const f of toCopy) {
      await cp(path.join(srcDir, f), path.join(destDir, f), { force: true });
    }
    console.log(`Copied ${toCopy.length} files to public/art/${d.name}/`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
