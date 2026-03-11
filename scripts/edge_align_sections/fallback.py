#!/usr/bin/env python3
"""
If edge-align-report.json says confidence is low, delete edge-corrected-placements.json
so the app uses manifest-only layout. No change to the report file.
"""

import argparse
import json
import sys
from pathlib import Path

# Allow running from repo root or from scripts/edge_align_sections
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
SOURCE_IMAGES_DEFAULT = REPO_ROOT / "source_images"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Remove edge-corrected placements when report confidence is low."
    )
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
    args = parser.parse_args()

    source_dir = args.source / args.painting_id
    report_path = source_dir / "edge-align-report.json"
    placements_path = source_dir / "edge-corrected-placements.json"

    if not report_path.exists():
        return 0

    try:
        with open(report_path, "r", encoding="utf-8") as f:
            report = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print(f"Error: Cannot read report {report_path}: {e}", file=sys.stderr)
        return 1

    confidence = report.get("confidence")
    if confidence != "low":
        return 0

    if not placements_path.exists():
        return 0

    try:
        placements_path.unlink()
    except OSError as e:
        print(f"Error: Cannot delete {placements_path}: {e}", file=sys.stderr)
        return 1

    print(f"Removed {placements_path} (confidence was low)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
