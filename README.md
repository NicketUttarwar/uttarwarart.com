# uttarwarart.com — static image gallery

Static site for **uttarwarart.com**. Each artwork is built from `source_images/<folder>/`: manifest JSON + section images. The composite image is used only as a very faint, grayed-out background. Section images use the manifest’s stopping position as their final (touching) layout; parallax scroll starts them spread out and animates them until they touch and connect.

## Build

1. Add artwork folders under `source_images/`. Each folder must contain:
   - `<foldername>_manifest.json` (with `sections` and optional `composite_filename`)
   - Section images referenced in the manifest (e.g. `*_section_0.png`, …)
   - Optionally the composite image (for faint background only).

2. Generate the site:

   ```bash
   node build.js
   ```

3. Deploy the project root to uttarwarart.com, or run locally (e.g. `npx serve .`).

## Structure

- `index.html` — gallery index (generated).
- `art/<slug>.html` — one page per artwork with parallax assembly (generated).
- `source_images/<folder>/` — per-artwork manifest + section images (+ optional composite).
- `css/style.css`, `css/art.css` — layout and artwork-page styles.
- `js/parallax.js` — scroll-driven parallax: sections move from spread-out to touching at manifest position.
