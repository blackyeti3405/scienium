#!/usr/bin/env python3
"""
NOVA Lab pixel-art renderer.

Reads a char-grid JSON sprite description and writes a native-resolution
transparent PNG (one source pixel == one image pixel). Optionally writes an
upscaled preview PNG for visual inspection (tiny 16-48px sprites are otherwise
impossible to eyeball).

JSON format (legible char-grid — easy to author and diff):

    {
      "width": 16,
      "height": 16,
      "palette": {
        "L": "#b9b3d6",      # 6-digit hex  -> opaque
        "g": "#3fe0d0",
        "o": "#f0902a",
        ".": "transparent"   # "." is ALWAYS transparent (can be omitted)
      },
      "rows": [
        "................",
        "......LLLL......",
        ...                  # exactly `height` strings, each `width` chars
      ]
    }

Any char not present in `palette` (and not ".") is an error, so typos in the
grid are caught instead of silently rendering blank.

Usage:
    python render_pixel_art.py SRC.json -o OUT.png [--preview PREVIEW.png] [--preview-scale 10]
    python render_pixel_art.py --dir art/src --out apps/web/public/sprites --preview-dir art/preview
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Dict, Tuple

from PIL import Image

TRANSPARENT = (0, 0, 0, 0)


def parse_color(value: str) -> Tuple[int, int, int, int]:
    if value in ("transparent", "none", ""):
        return TRANSPARENT
    v = value.lstrip("#")
    if len(v) == 6:
        r, g, b = int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16)
        return (r, g, b, 255)
    if len(v) == 8:
        r, g, b, a = (int(v[i : i + 2], 16) for i in (0, 2, 4, 6))
        return (r, g, b, a)
    raise ValueError(f"bad color: {value!r}")


def render(spec: dict) -> Image.Image:
    width = int(spec["width"])
    height = int(spec["height"])
    palette: Dict[str, Tuple[int, int, int, int]] = {".": TRANSPARENT}
    for ch, col in spec.get("palette", {}).items():
        palette[ch] = parse_color(col)

    rows = spec["rows"]
    if len(rows) != height:
        raise ValueError(f"expected {height} rows, got {len(rows)}")

    img = Image.new("RGBA", (width, height), TRANSPARENT)
    px = img.load()
    for y, row in enumerate(rows):
        if len(row) != width:
            raise ValueError(
                f"row {y} has {len(row)} chars, expected {width}: {row!r}"
            )
        for x, ch in enumerate(row):
            if ch not in palette:
                raise ValueError(f"undefined palette char {ch!r} at ({x},{y})")
            px[x, y] = palette[ch]
    return img


def render_file(src: str, out: str, preview: str | None, preview_scale: int) -> None:
    with open(src, "r", encoding="utf-8") as fh:
        spec = json.load(fh)
    img = render(spec)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    img.save(out)
    if preview:
        os.makedirs(os.path.dirname(preview) or ".", exist_ok=True)
        big = img.resize(
            (img.width * preview_scale, img.height * preview_scale), Image.NEAREST
        )
        # flatten preview onto a checkerboard so transparency is visible
        bg = Image.new("RGBA", big.size, (255, 255, 255, 255))
        cell = preview_scale
        for yy in range(0, big.height, cell):
            for xx in range(0, big.width, cell):
                if ((xx // cell) + (yy // cell)) % 2 == 0:
                    for j in range(yy, min(yy + cell, big.height)):
                        for i in range(xx, min(xx + cell, big.width)):
                            bg.putpixel((i, j), (220, 220, 220, 255))
        bg.alpha_composite(big)
        bg.save(preview)
    print(f"rendered {src} -> {out} ({img.width}x{img.height})")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("src", nargs="?", help="single source JSON")
    ap.add_argument("-o", "--out", help="output PNG (single mode)")
    ap.add_argument("--preview", help="preview PNG (single mode)")
    ap.add_argument("--preview-scale", type=int, default=10)
    ap.add_argument("--dir", help="batch: source dir of *.json")
    ap.add_argument("--out-dir", dest="out_dir2", help=argparse.SUPPRESS)
    args, _ = ap.parse_known_args()

    if args.src and args.out:
        render_file(args.src, args.out, args.preview, args.preview_scale)
        return 0
    ap.error("provide SRC -o OUT (single file mode)")
    return 1


if __name__ == "__main__":
    sys.exit(main())
