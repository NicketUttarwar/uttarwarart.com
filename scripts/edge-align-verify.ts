/**
 * Run verify.py for each painting that has edge-corrected-placements.json.
 * Usage: npx tsx scripts/edge-align-verify.ts [--id <painting-id>]
 */

import { access, readdir } from "fs/promises";
import path from "path";
import { spawn } from "child_process";

const SOURCE_IMAGES = path.join(process.cwd(), "source_images");
const PYTHON_SCRIPT = path.join(
  process.cwd(),
  "scripts",
  "edge_align_sections",
  "verify.py"
);

async function getPaintingIds(): Promise<string[]> {
  const entries = await readdir(SOURCE_IMAGES, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

function hasPlacements(paintingId: string): Promise<boolean> {
  const placementsPath = path.join(
    SOURCE_IMAGES,
    paintingId,
    "edge-corrected-placements.json"
  );
  return access(placementsPath).then(() => true, () => false);
}

function runPython(paintingId: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "python3",
      [PYTHON_SCRIPT, "--id", paintingId, "--source", SOURCE_IMAGES],
      { stdio: "inherit", cwd: process.cwd() }
    );
    proc.on("error", (err) => reject(err));
    proc.on("close", (code, signal) => {
      if (signal) reject(new Error(`Process killed: ${signal}`));
      else resolve(code ?? 0);
    });
  });
}

async function main(): Promise<void> {
  const idArg = process.argv.indexOf("--id");
  const paintingIds =
    idArg !== -1 && process.argv[idArg + 1]
      ? [process.argv[idArg + 1]]
      : await getPaintingIds();

  if (paintingIds.length === 0) {
    console.log("No painting folders found in source_images/");
    process.exit(0);
  }

  let failed = 0;
  for (const id of paintingIds) {
    const has = await hasPlacements(id);
    if (!has) {
      console.log(`Skipping ${id} (no edge-corrected-placements.json)`);
      continue;
    }
    process.stdout.write(`Verifying ${id}... `);
    try {
      const code = await runPython(id);
      if (code !== 0) {
        failed++;
        console.log(`Exit code ${code}`);
      } else {
        console.log("OK");
      }
    } catch (e) {
      failed++;
      console.error(e);
    }
  }

  if (failed > 0) {
    process.exit(1);
  }
}

main();
