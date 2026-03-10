# Uttarwar Art

An art portfolio site built with Next.js. Each work is split into sections that animate in from the edges (“outside-in”) and assemble into a single image. Layout uses manifest data plus a symmetry-adjustment step so the final composition stays close to the source while looking balanced.

---

## Prerequisites

- **Node.js** (v18 or later) and **npm**
- Install from [nodejs.org](https://nodejs.org) if needed.

The project uses Node only (no Python). Dependencies are installed with `npm install`.

---

## Running the site: `run.sh`

The **`run.sh`** script installs dependencies, copies art assets, and starts the app. Use it for local development and for deployment.

### Usage

```bash
./run.sh [MODE]
```

| Parameter | Description | Default |
|-----------|-------------|--------|
| *(none)* or `dev` | Start the **development** server (hot reload). | Yes |
| `start` | Run **production** build, then serve. Use this when deploying. | No |

### Port

- Default port is **3000**.
- Override with the `PORT` environment variable:

```bash
PORT=8080 ./run.sh
PORT=8080 ./run.sh start
```

### Examples

```bash
# Development on port 3000 (default)
./run.sh

# Same as above (dev is the default mode)
./run.sh dev

# Production: build and serve (e.g. for deployment)
./run.sh start

# Development on a different port
PORT=4000 ./run.sh

# Production on port 8080
PORT=8080 ./run.sh start
```

### What `run.sh` does

1. **Checks** that `node` and `npm` are available; exits with an error if not.
2. **Installs dependencies** with `npm install` if `node_modules` is missing or older than `package.json`.
3. **Copies art assets** from `source_images/` into `public/art/` (required for the site to load images).
4. **Runs the app**:
   - **`dev`**: `npm run dev` (development server).
   - **`start`**: `npm run build` then `npm run start` (production server).

Make the script executable once if needed:

```bash
chmod +x run.sh
```

---

## npm scripts (without `run.sh`)

You can run the app directly with npm:

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies. |
| `npm run copy-art-assets` | Copy section/composite images from `source_images/` to `public/art/`. |
| `npm run dev` | Start development server (default port 3000, or set `PORT`). |
| `npm run build` | Copy assets and build for production. |
| `npm run start` | Serve production build (run after `npm run build`). |
| `npm run lint` | Run ESLint. |

For a production-like run without `run.sh`:

```bash
npm install
npm run build
PORT=3000 npm run start
```

---

## Project structure

| Path | Purpose |
|------|---------|
| `run.sh` | Main run script (dev or production on configurable port). |
| `source_images/<id>/` | One folder per painting: `manifest.json`, `section-*.png`, `composite.png`. |
| `public/art/<id>/` | Copied assets served by the app (created by `copy-art-assets`). |
| `app/page.tsx` | Gallery (list of all paintings). |
| `app/art/[id]/page.tsx` | Single painting view (sections + outside-in animation). |
| `lib/manifest.ts` | Load manifest and list painting IDs. |
| `lib/symmetry-layout.ts` | Symmetry adjustment for section placement (no UI). |
| `lib/types.ts` | Shared TypeScript types. |
| `scripts/copy-art-assets.ts` | Copies `source_images` → `public/art`. |

---

## Adding new art

1. Add a new folder under `source_images/`, e.g. `source_images/MyPainting/`.
2. Put inside it:
   - `manifest.json` (sections, layout, dimensions).
   - `section-0.png`, `section-1.png`, … and optionally `composite.png`.
3. Run `npm run copy-art-assets` or `./run.sh` (which runs it). The new work will appear in the gallery and at `/art/MyPainting`.

---

## Deployment

On your server or platform:

1. Clone the repo and `cd` into it.
2. Run production mode on port 3000 (or your chosen port):

   ```bash
   chmod +x run.sh
   PORT=3000 ./run.sh start
   ```

   Or without `run.sh`:

   ```bash
   npm install
   npm run build
   PORT=3000 npm run start
   ```

3. Point your reverse proxy or load balancer at `http://localhost:3000` (or the port you set).

---

## Tech stack

- **Next.js** 14 (App Router)
- **React** 18, **TypeScript**, **Tailwind CSS**
- **Framer Motion** for section animations
