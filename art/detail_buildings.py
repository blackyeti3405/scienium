#!/usr/bin/env python3
"""
Fenestration + trim pass for economy-building sprites.

The economy buildings were authored as large flat iso masses (80-96% wall pixels)
with almost no windows or trim, so they read as grey lumps — recoloring the glass
ramp does nothing when a building is <5% glass. This pass adds surface detail
directly to the char grids, deterministically, so it's reproducible and git-diffable:

  1. Window bands stamped onto the two visible wall faces (lit `M` ramp on the left,
     shadow `D` ramp on the right), on a lattice that follows the 2:1 iso slant so the
     rows step correctly down each face. Lit-face windows use the bright glass chars,
     shadow-face windows the dimmer ones, so the fenestration keeps the face's depth.
  2. An accent eave line along the top edge of each wall face (roof/wall separation).

Roof planes are excluded (windows on a roof look wrong): a pixel is only treated as a
wall face if it sits in the lower part of the silhouette AND has solid pixels
continuing below it (a vertical face reaching the base), not a roof edge.

Idempotent: only wall chars (M/D) are ever converted, so re-running is a no-op on
already-detailed sprites.

Usage:
  python art/detail_buildings.py <lab>          # detail every <lab>_*.json in place + render
  python art/detail_buildings.py <lab> --dry    # write nothing; render previews to art/ only
"""
from __future__ import annotations

import copy
import glob
import json
import os
import sys

from render_pixel_art import render
from build_sprites import SRC_DIR

ROOT = os.path.dirname(os.path.abspath(__file__))
BUILD_SRC = os.path.join(SRC_DIR, "buildings")
OUT_DIR = os.path.join(ROOT, "..", "apps", "web", "public", "sprites", "buildings")

WALL = set("KWLMDdb")

# window fill by face: (bright, dim) glass chars from the canonical/economy glass ramp
LIT_WIN = ("c", "g")     # left/lit face
SHADE_WIN = ("g", "G")   # right/shadow face
EAVE = "o"               # accent trim at the roofline


def solid_bbox(rows):
    ys = [r for r, row in enumerate(rows) for ch in row if ch != "."]
    xs = [c for row in rows for c, ch in enumerate(row) if ch != "."]
    return min(ys), max(ys), min(xs), max(xs)


def center_col(rows):
    xs = sorted(c for row in rows for c, ch in enumerate(row) if ch not in ".K")
    return xs[len(xs) // 2]


def stamp(spec):
    rows = [list(r) for r in spec["rows"]]
    H, W = len(rows), len(rows[0])
    y0, y1, x0, x1 = solid_bbox(rows)
    roof_zone = y0 + int((y1 - y0) * 0.32)    # top 32% is roof — never gets windows
    plinth = y1 - int((y1 - y0) * 0.15)        # bottom 15% is the ground slab — no windows
    C = center_col(rows)

    def up_solid(r, c):
        return r > 0 and rows[r - 1][c] not in ".K"

    def run_len(r, c, step):  # contiguous solid wall pixels walking `step` rows at a time
        n = 0
        rr = r + step
        while 0 <= rr < H:
            if rows[rr][c] in WALL:
                n += 1
            elif rows[rr][c] == ".":
                break
            rr += step
        return n

    def is_face(r, c):
        # A real wall face is TALL: solid well below AND above. A base-platform edge or a
        # thin strut is only 2-3px, so requiring 4 below + 2 above kills the dotted-noise
        # that a loose gate stamps around ground slabs and open frames.
        return (
            roof_zone < r < plinth
            and up_solid(r, c)
            and run_len(r, c, 1) >= 4
            and run_len(r, c, -1) >= 2
        )

    for r in range(H):
        for c in range(W):
            ch = rows[r][c]
            if ch == "M" and c < C and is_face(r, c):
                pr, pc = (r + c // 2) % 4, c % 4
                if pr in (0, 1) and pc in (1, 2):
                    rows[r][c] = LIT_WIN[0] if pr == 0 else LIT_WIN[1]
            elif ch == "D" and c > C and is_face(r, c):
                pr, pc = (r - c // 2) % 4, c % 4
                if pr in (0, 1) and pc in (1, 2):
                    rows[r][c] = SHADE_WIN[0] if pr == 0 else SHADE_WIN[1]

    # eave accent: topmost wall pixel of each column, but only in the upper half of the
    # silhouette (a real roofline) — never trace the ground-slab edge at the base.
    eave_limit = roof_zone + int((y1 - y0) * 0.45)
    for c in range(x0, x1 + 1):
        for r in range(roof_zone, eave_limit):
            if rows[r][c] in ("M", "D") and not up_solid(r, c):
                rows[r][c] = EAVE
                break

    out = copy.deepcopy(spec)
    out["rows"] = ["".join(r) for r in rows]
    return out


def main():
    if len(sys.argv) < 2:
        print("usage: python art/detail_buildings.py <lab> [--dry]")
        sys.exit(1)
    lab = sys.argv[1]
    dry = "--dry" in sys.argv
    files = sorted(glob.glob(os.path.join(BUILD_SRC, f"{lab}_*.json")))
    print(f"{lab}: {len(files)} sprites  (dry={dry})")
    for path in files:
        spec = json.load(open(path))
        out = stamp(spec)
        base = os.path.basename(path)[:-5]  # strip .json
        slug = base[len(lab) + 1:]
        if not dry:
            json.dump(out, open(path, "w"))
            png = os.path.join(OUT_DIR, lab, f"{slug}.png")
            os.makedirs(os.path.dirname(png), exist_ok=True)
            render(out).save(png)
        print(f"  {slug}")


if __name__ == "__main__":
    main()
