#!/usr/bin/env python3
"""
CLI for edge-matching alignment. Loads manifest and section images for a painting,
runs alignment, and writes edge-corrected-placements.json next to the manifest.
"""

import argparse
import json
import sys
from pathlib import Path

# Allow running from repo root or from scripts/edge_align_sections
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
SOURCE_IMAGES_DEFAULT = REPO_ROOT / "source_images"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))


def main() -> int:
    parser = argparse.ArgumentParser(description="Edge-align section images for a painting.")
    parser.add_argument(
        "--id",
        dest="painting_id",
        required=True,
        help="Painting ID (folder name under source_images)",
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=SOURCE_IMAGES_DEFAULT,
        help="Path to source_images root",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output path for JSON (default: source_images/<id>/edge-corrected-placements.json)",
    )
    args = parser.parse_args()

    from aligner import run_alignment_for_painting

    try:
        positions = run_alignment_for_painting(args.painting_id, args.source)
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

    out_path = args.output
    if out_path is None:
        out_path = args.source / args.painting_id / "edge-corrected-placements.json"

    out_path.parent.mkdir(parents=True, exist_ok=True)
    # Serialize: section index -> { origin_x, origin_y }
    payload = {
        str(idx): {"origin_x": round(x, 2), "origin_y": round(y, 2)}
        for idx, (x, y) in positions.items()
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"Wrote {len(positions)} placements to {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
