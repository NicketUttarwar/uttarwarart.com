#!/usr/bin/env node
/**
 * Build static gallery: reads source_images subfolders (manifest + section images),
 * generates index.html and art/<slug>.html with parallax assembly.
 * Ignores composite for content; uses it only as faint background.
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, 'source_images');
const OUT_DIR = path.join(__dirname, 'art');
const OUT_INDEX = path.join(__dirname, 'index.html');

if (!fs.existsSync(SOURCE_DIR)) {
  console.error('source_images/ not found');
  process.exit(1);
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const dirs = fs.readdirSync(SOURCE_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

const artworks = [];

for (const dir of dirs) {
  const manifestPath = path.join(SOURCE_DIR, dir, `${dir}_manifest.json`);
  if (!fs.existsSync(manifestPath)) continue;
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    console.warn('Skip', dir, e.message);
    continue;
  }
  if (!manifest.sections || !manifest.sections.length) continue;
  const compositePath = path.join(SOURCE_DIR, dir, manifest.composite_filename || '');
  const hasComposite = manifest.composite_filename && fs.existsSync(compositePath);
  artworks.push({
    slug: dir,
    manifest,
    hasComposite,
    compositeUrl: hasComposite ? `../source_images/${encodeURIComponent(dir)}/${encodeURIComponent(manifest.composite_filename)}` : null,
  });
}

// Sort by slug for stable ordering
artworks.sort((a, b) => a.slug.localeCompare(b.slug));

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function artPageHtml(art) {
  const { slug, manifest, compositeUrl } = art;
  const sw = manifest.source_width || 1;
  const sh = manifest.source_height || 1;
  const sections = manifest.sections || [];
  const baseUrl = `../source_images/${encodeURIComponent(slug)}/`;

  const sectionData = sections.map((sec) => {
    const centroidFracX = (sec.centroid_x != null ? sec.centroid_x : sec.origin_x + (sec.width_px || 0) / 2) / sw;
    const centroidFracY = (sec.centroid_y != null ? sec.centroid_y : sec.origin_y + (sec.height_px || 0) / 2) / sh;
    return {
      filename: sec.filename,
      url: baseUrl + encodeURIComponent(sec.filename),
      left: (100 * (sec.origin_x || 0) / sw) + '%',
      top: (100 * (sec.origin_y || 0) / sh) + '%',
      width: (100 * (sec.width_px || 0) / sw) + '%',
      height: (100 * (sec.height_px || 0) / sh) + '%',
      centroidFracX,
      centroidFracY,
      rotation: sec.rotation_degrees || 0,
    };
  });

  const dataJson = JSON.stringify({
    sourceWidth: sw,
    sourceHeight: sh,
    sections: sectionData,
    compositeUrl,
  });

  const sectionsHtml = sectionData.map((s, i) =>
    `<div class="section" data-index="${i}" style="--left:${s.left};--top:${s.top};--width:${s.width};--height:${s.height};--rotation:${s.rotation}deg;">
      <img src="${escapeHtml(s.url)}" alt="" loading="lazy" />
    </div>`
  ).join('\n');

  const bgStyle = compositeUrl
    ? `style="background-image:url('${escapeHtml(compositeUrl)}');"`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(slug)} — uttarwarart.com</title>
  <link rel="stylesheet" href="../css/style.css">
  <link rel="stylesheet" href="../css/art.css">
</head>
<body class="art-page">
  <a href="../index.html" class="back">← Back</a>
  <div class="scroll-wrap">
    <div class="assembly-viewport">
      <div class="assembly-bg" ${bgStyle}></div>
      <div class="assembly-frame" style="--aspect-w:${sw};--aspect-h:${sh};">
        <div class="sections">
${sectionsHtml}
        </div>
      </div>
    </div>
  </div>
  <script>
    window.ART_DATA = ${dataJson.replace(/<\/script/gi, '<\\/script')};
  </script>
  <script src="../js/parallax.js"></script>
</body>
</html>`;
}

// Write art pages
for (const art of artworks) {
  const outPath = path.join(OUT_DIR, art.slug + '.html');
  fs.writeFileSync(outPath, artPageHtml(art), 'utf8');
  console.log('Wrote', outPath);
}

// Index page
const indexLinks = artworks.map(a =>
  `    <li><a href="art/${encodeURIComponent(a.slug)}.html">${escapeHtml(a.slug)}</a></li>`
).join('\n');

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>uttarwarart.com</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <main>
    <h1>uttarwarart.com</h1>
    <p>Image gallery. Select an image:</p>
    <ul class="gallery-index">
${indexLinks}
    </ul>
  </main>
</body>
</html>
`;

fs.writeFileSync(OUT_INDEX, indexHtml, 'utf8');
console.log('Wrote', OUT_INDEX);
console.log('Done. ' + artworks.length + ' artwork(s).');