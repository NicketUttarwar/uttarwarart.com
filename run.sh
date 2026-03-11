#!/usr/bin/env bash
# Run script for uttarwarart.com (Next.js).
# Ensures dependencies are installed and starts the site (default port 3000).
# Usage: ./run.sh [dev|start]
#   dev   = development server (default)
#   start = production build then serve

set -e
cd "$(dirname "$0")"

# Port when serving (use PORT=3000 ./run.sh to override)
export PORT="${PORT:-3000}"

# --- Check Node.js (this project uses Node, not Python) ---
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required. Install it from https://nodejs.org and try again."
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required. Install Node.js from https://nodejs.org and try again."
  exit 1
fi

echo "Node $(node -v) | npm $(npm -v)"
echo "Port: $PORT"

# --- Install dependencies (creates/updates node_modules) ---
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
else
  echo "Dependencies already present."
fi

# --- Copy art assets into public/art (required for build/serve) ---
echo "Copying art assets..."
npm run copy-art-assets

# --- Edge-align pipeline (optional; requires Python 3 and pip deps) ---
if command -v python3 >/dev/null 2>&1; then
  if ! python3 -c "import cv2, numpy, scipy" 2>/dev/null; then
    echo "Installing edge-align Python dependencies..."
    if command -v pip3 >/dev/null 2>&1; then
      pip3 install -q -r scripts/edge_align_sections/requirements.txt
    else
      python3 -m pip install -q -r scripts/edge_align_sections/requirements.txt
    fi
  fi
  echo "Running edge-align (align → verify → fallback)..."
  npm run edge-align && npm run edge-align:verify && npm run edge-align:fallback
else
  echo "Skipping edge-align (python3 not found)."
fi

# --- Run ---
MODE="${1:-dev}"
if [ "$MODE" = "start" ]; then
  echo "Building and starting production server on port $PORT..."
  npm run build
  exec npm run start
else
  echo "Starting development server on port $PORT..."
  exec npm run dev
fi
