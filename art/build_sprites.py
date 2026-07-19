#!/usr/bin/env python3
"""
scienium ground-tile + padlock builder.

(Gateway buildings live in iso.py — isometric, authored in the canon palette.)

Generates the 6 grass ground tiles and the padlock, writes source char-grids to
art/src/, and renders native PNGs to apps/web/public/sprites/{tiles,ui}/ plus
upscaled previews to art/preview/. Tiles are a lush, Stardew-leaning green: two
plain, two light-clutter (flowers, pebbles), two heavy-clutter (bush, shrub).
Placement frequency is controlled by TileBackground.tsx (most cells plain grass,
clutter sprinkled on top, graded plain -> light -> heavy).

Run:  python art/build_sprites.py
"""
from __future__ import annotations

import json
import os

from render_pixel_art import render

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "art", "src")
PREVIEW_DIR = os.path.join(ROOT, "art", "preview")
SPRITES_DIR = os.path.join(ROOT, "apps", "web", "public", "sprites")

# Layered grass greens (highlight -> light -> mid/base -> mid-dark -> dark -> deep
# outline) shared across ALL six tiles so the field reads cohesive; plus a few
# clutter-only dabs (flowers, pebbles). Each tile uses a subset (<= ~10 colors).
GRASS_PALETTE = {
    "h": "#aede73",  # blade highlight / tip (bright lime pop)
    "l": "#86c65e",  # light green
    "m": "#5da65a",  # mid green — the base fill
    "d": "#4d9350",  # mid-dark green
    "D": "#3a7a43",  # dark green — blade shadow
    "o": "#2b5e35",  # deep green — clutter outline / contact shadow
    "f": "#f2ce4d",  # flower yellow
    "w": "#f6f4ea",  # flower white
    "F": "#e88fb2",  # flower pink
    "p": "#bdb9c7",  # pebble light (cool grey)
    "P": "#6e7079",  # pebble dark (neutral cool grey — no violet cast)
}


class Canvas:
    def __init__(self, w: int, h: int, fill: str = "."):
        self.w, self.h = w, h
        self.px = [[fill] * w for _ in range(h)]

    def set(self, x: int, y: int, ch: str):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = ch

    def rect(self, x0, y0, x1, y1, ch):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, ch)

    def hline(self, x0, x1, y, ch):
        for x in range(x0, x1 + 1):
            self.set(x, y, ch)

    def vline(self, x, y0, y1, ch):
        for y in range(y0, y1 + 1):
            self.set(x, y, ch)

    def border(self, x0, y0, x1, y1, ch):
        self.hline(x0, x1, y0, ch)
        self.hline(x0, x1, y1, ch)
        self.vline(x0, y0, y1, ch)
        self.vline(x1, y0, y1, ch)

    def rows(self):
        return ["".join(r) for r in self.px]


def write_sprite(name, canvas, palette, subdir, preview_scale=10):
    spec = {"width": canvas.w, "height": canvas.h, "palette": palette, "rows": canvas.rows()}
    os.makedirs(SRC_DIR, exist_ok=True)
    json.dump(spec, open(os.path.join(SRC_DIR, f"{name}.json"), "w"), indent=0)
    img = render(spec)
    out_dir = os.path.join(SPRITES_DIR, subdir)
    os.makedirs(out_dir, exist_ok=True)
    img.save(os.path.join(out_dir, f"{name}.png"))
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    from PIL import Image
    big = img.resize((img.width * preview_scale, img.height * preview_scale))
    bg = Image.new("RGBA", big.size, (210, 210, 218, 255))
    bg.alpha_composite(big.convert("RGBA"))
    bg.save(os.path.join(PREVIEW_DIR, f"{name}.png"))
    print(f"built {name:18s} {canvas.w}x{canvas.h} -> sprites/{subdir}/{name}.png")


# ── Ground tiles (32×32, seamless lush tufted grass) ───────────────────────────
# Every tile is built by grass_base(): a mottled mid-green field dithered with
# lighter/darker greens (subtle tone patches, NOT salt-and-pepper) then studded
# with short blade tufts — each a 2–4px stroke with a bright tip and a 1px
# shadow beneath (the Stardew "tufted" tell). Tufts are placed on a TORUS
# (coords wrap mod 32) so any blade near an edge reappears on the opposite side
# and the tile is perfectly seamless. Clutter (flowers/pebbles/bushes) is drawn
# on top, always inset from the border so it never clips at a seam.
TILE = 32


def _hash(a: int, b: int, seed: int) -> int:
    h = (a * 374761393 + b * 668265263 + seed * 2654435761) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return (h ^ (h >> 16)) & 0xFFFFFFFF


def wset(c: Canvas, x: int, y: int, ch: str):
    """Toroidal set — wraps at the tile border so blades tile seamlessly."""
    c.set(x % TILE, y % TILE, ch)


def blade(c: Canvas, x: int, y: int, tall: int, lean: int):
    """A short upright grass blade rooted at (x, y): dark shadow at the base,
    mid body, and a bright highlight tip. Wraps at edges (toroidal)."""
    wset(c, x, y + 1, "D")  # contact shadow beneath the blade
    for k in range(tall):
        xx = x + round(lean * k / max(tall - 1, 1))
        if k == tall - 1:
            wset(c, xx, y - k, "h")  # bright tip
        elif k >= tall - 2:
            wset(c, xx, y - k, "l")  # light upper body
        else:
            wset(c, xx, y - k, "m")  # mid lower body


def tuft(c: Canvas, x: int, y: int, tall: int):
    """A small two-blade tuft sharing one root: the blades splay apart (one leans
    left, one leans right) for a fuller directional clump. This is the second
    blade shape mixed into the turf so the field reads as varied tufts rather
    than a regular stipple. Wraps at edges (toroidal)."""
    blade(c, x, y, tall, -1)
    blade(c, x + 1, y, max(tall - 1, 2), 1)


def blade_cluster(c: Canvas, x: int, y: int, lean: int, seed: int, j: int):
    """A directional blade cluster: 3–4 blades stepping diagonally in one shared
    `lean` direction with a slight vertical stagger, so their tips line up into a
    single readable stroke instead of scattering. This is the grass_1-style tuft
    motif made deliberate — used to give tonal-variation-B a clear directional
    structure rather than fine noise. Wraps at edges (toroidal)."""
    count = 3 + (_hash(j, seed, 111) % 2)          # 3..4 blades
    for k in range(count):
        tall = 3 + (_hash(j * 7 + k, seed, 222) % 2)   # 3..4 px
        bx = x + lean * k
        by = y - (k % 2)                                # gentle diagonal stagger
        blade(c, bx, by, tall, lean)


def grass_base(seed: int, tufts: int = 26, clusters: int = 0) -> Canvas:
    c = Canvas(TILE, TILE, "m")
    # Fine, low-amplitude tone mottle: small 3px patches biased light/dark and
    # dithered so their edges stay ragged (reads as soft turf, not blocks and not
    # salt-and-pepper). Grain is a MID-DARK "d" step from the base (a soft, low-
    # contrast nudge) rather than the old deep-dark "D" flecks, so plain grass has
    # the same gentle tuft feel as the clutter-tile backgrounds. Purely local per-
    # pixel, so it carries no large-scale structure across a seam — and the small
    # patch size keeps any light/dark cluster from forming a visible lattice when a
    # single tile repeats.
    for y in range(TILE):
        for x in range(TILE):
            cell = _hash(x // 3, y // 3, seed) % 100
            jit = _hash(x, y, seed * 3 + 1) % 100
            if cell < 26 and jit < 44:
                c.set(x, y, "d")          # soft mid-dark patch
            elif cell < 48 and jit < 34:
                c.set(x, y, "l")          # soft light patch
            elif jit > 95:
                c.set(x, y, "d")          # very sparse, low-contrast grain
    # Primary texture: short blade tufts scattered across the whole tile (toroidal
    # so edges wrap). Two shapes are interleaved — lone blades and small two-blade
    # tufts — so the turf reads as varied clumps and any faint repeat motif breaks
    # up when the tile tiles by itself.
    n = tufts
    for i in range(n):
        x = _hash(i, seed, 101) % TILE
        y = _hash(i, seed, 202) % TILE
        tall = 2 + (_hash(i, seed, 303) % 3)          # 2..4 px
        lean = (_hash(i, seed, 404) % 3) - 1          # -1, 0, +1
        if _hash(i, seed, 505) % 3 == 0:
            tuft(c, x, y, tall)                        # fuller two-blade clump
        else:
            blade(c, x, y, tall, lean)
    # Optional directional blade clusters: readable diagonal strokes that give a
    # tile clear tuft structure (used by tonal-variation-B, which otherwise reads
    # as fine noise). Each cluster leans one consistent direction so it groups
    # into a stroke rather than scattering.
    for j in range(clusters):
        cx = _hash(j, seed, 707) % TILE
        cy = _hash(j, seed, 808) % TILE
        lean = 1 if (_hash(j, seed, 909) % 2) else -1
        blade_cluster(c, cx, cy, lean, seed, j)
    return c


def ellipse(c: Canvas, cx: int, cy: int, rx: int, ry: int, fill, edge=None):
    """Filled leaf blob. `fill(x, y)` shades by position; `edge` rings the blob
    with a 1px deep-green outline so it reads as a distinct clump on the grass."""
    for y in range(-ry, ry + 1):
        for x in range(-rx, rx + 1):
            r = (x / rx) ** 2 + (y / ry) ** 2
            if r <= 1.0:
                c.set(cx + x, cy + y, fill(x, y))
            elif edge and r <= 1.3:
                c.set(cx + x, cy + y, edge)


def leaf_fill(x, y):
    """Leafy shading: lighter toward the top, darker toward the bottom, with a
    hash speckle so it reads as clustered foliage (not a flat/hatched blob)."""
    n = _hash(x + 9, y + 9, 55) % 100
    if y <= -2:
        base = "l"       # sunlit crown
    elif y <= 0:
        base = "d"       # mid body
    else:
        base = "D"       # shaded underside
    if y <= 0 and n < 24:
        return "l"       # scattered bright leaves up top
    if y > 0 and n < 22:
        return "d"       # lighter flecks in the shade
    if n > 90:
        return "o"       # occasional deep gap
    return base


def bush(c: Canvas, cx: int, cy: int, rx: int, ry: int):
    ellipse(c, cx, cy, rx, ry, leaf_fill, edge="o")
    # soft contact shadow (dithered, blob-width) + a few bright crown leaves
    for x in range(-rx + 1, rx):
        if (x + cx) % 2 == 0:
            c.set(cx + x, cy + ry, "o")
    c.set(cx - rx + 2, cy - ry + 1, "h")
    c.set(cx - 1, cy - ry, "h")
    c.set(cx + 1, cy - ry + 1, "l")
    c.set(cx - rx + 2, cy - ry + 2, "l")


def t_plain(n):
    return grass_base(n)


def t_plain_clustered(n):
    """Plain tile, tonal variation B: fewer scattered flecks, several directional
    blade clusters — reads as distinct tufts (like grass_1) instead of fine noise."""
    return grass_base(n, tufts=15, clusters=8)


def _flower(c, x, y, petal, center="w"):
    """Tiny flower: a ring of petal dabs around a bright center, on a green stem."""
    c.set(x, y + 1, "D")       # short stem shadow
    c.set(x, y, petal)
    c.set(x - 1, y, petal)
    c.set(x + 1, y, petal)
    c.set(x, y - 1, petal)
    c.set(x, y, center)        # bright center pip


def t_flower():
    c = grass_base(19)
    # 3 tiny flowers, inset from edges, plus a couple of extra tufts nearby
    _flower(c, 11, 14, "f", "w")   # yellow
    _flower(c, 21, 20, "F", "w")   # pink
    _flower(c, 16, 24, "f", "w")   # yellow
    blade(c, 13, 22, 3, 1)
    blade(c, 24, 15, 3, -1)
    return c


def t_pebble():
    c = grass_base(13)
    # pebble 1 (larger, rounded) around (12,20)
    c.rect(11, 19, 14, 21, "P")
    c.rect(11, 19, 13, 20, "p")
    c.set(11, 19, "p"); c.set(14, 21, "o"); c.set(11, 22, "o"); c.set(14, 22, "o")
    c.hline(11, 14, 22, "o")        # contact shadow
    # pebble 2 (small) around (21,23)
    c.rect(20, 22, 21, 23, "P")
    c.set(20, 22, "p")
    c.hline(20, 21, 24, "o")
    # sparse weed blades between them
    blade(c, 17, 17, 3, 0)
    blade(c, 24, 18, 2, 1)
    return c


def t_bush():
    # heavy: a single low leafy weed clump, inset & centred-ish
    c = grass_base(11)
    bush(c, 16, 18, 6, 5)
    # a couple of stray blades poking from the clump
    blade(c, 12, 13, 3, -1)
    blade(c, 20, 13, 3, 1)
    return c


def t_shrub():
    # heavy: a denser, wider shrub — two overlapping leaf masses, still low
    c = grass_base(7)
    bush(c, 14, 19, 6, 5)
    bush(c, 21, 20, 5, 4)
    ellipse(c, 18, 16, 4, 3, leaf_fill, edge="o")   # crown fills the gap
    # brighten the crown so the mass reads rounded, not flat
    c.set(13, 15, "h"); c.set(18, 13, "h"); c.set(23, 17, "h")
    c.set(16, 14, "l"); c.set(20, 15, "l"); c.set(11, 17, "l")
    return c


# ── Padlock (16×16) ────────────────────────────────────────────────────────────
def s_padlock():
    c = Canvas(16, 16)
    c.hline(6, 9, 2, "K")
    c.set(5, 3, "K"); c.set(10, 3, "K")
    c.vline(5, 3, 6, "K"); c.vline(10, 3, 6, "K")
    c.set(6, 2, "W"); c.set(7, 2, "W")
    c.rect(3, 6, 12, 13, "O")
    c.hline(3, 12, 6, "o")
    c.vline(3, 6, 13, "o")
    c.hline(3, 12, 13, "r")
    c.vline(12, 6, 13, "r")
    c.border(2, 5, 13, 14, "K")
    c.set(7, 9, "K"); c.set(8, 9, "K")
    c.set(7, 10, "K"); c.set(8, 10, "K")
    c.set(7, 11, "K"); c.set(8, 11, "K")
    return c, {"K": "#241f38", "O": "#ff9243", "o": "#ffc089", "r": "#d9641f", "W": "#f4f2ff"}


def main():
    tiles = {
        # plain (2), light clutter (2), heavy clutter (2) — see TileBackground.tsx
        "grass_1": t_plain(1),
        "grass_2": t_plain_clustered(2),
        "grass_flower": t_flower(),
        "grass_pebble": t_pebble(),
        "grass_bush": t_bush(),
        "grass_shrub": t_shrub(),
    }
    for name, cv in tiles.items():
        write_sprite(name, cv, GRASS_PALETTE, "tiles", preview_scale=8)

    pc, ppal = s_padlock()
    write_sprite("padlock_closed", pc, ppal, "ui", preview_scale=16)


if __name__ == "__main__":
    main()
