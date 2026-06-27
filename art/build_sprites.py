#!/usr/bin/env python3
"""
scienium ground-tile + padlock builder.

(Gateway buildings live in iso.py — isometric, authored in the canon palette.)

Generates the 8 ground tiles and the padlock, writes source char-grids to
art/src/, and renders native PNGs to apps/web/public/sprites/{tiles,ui}/ plus
upscaled previews to art/preview/. Tiles are a lush, Stardew-leaning green with
trees, bushes, ferns and flowers; placement frequency is controlled by
TileBackground.tsx (most cells plain grass, vegetation sprinkled on top).

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

GRASS_PALETTE = {
    "1": "#5f9e4e",  # grass base
    "2": "#74b85f",  # grass light
    "3": "#4a7c3e",  # grass dark
    "b": "#3f6e38",  # blade speck
    "s": "#4f9447",  # shrub light
    "S": "#2f6234",  # shrub dark
    "L": "#62b054",  # leaf light
    "l": "#356b38",  # leaf dark
    "t": "#7a5230",  # trunk
    "T": "#4f351c",  # trunk dark
    "p": "#a8a3b6",  # pebble light
    "P": "#6f6a80",  # pebble dark
    "f": "#ecd15a",  # flower yellow
    "F": "#e87aa0",  # flower pink
    "w": "#eef0e0",  # flower white
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


# ── Ground tiles (32×32, seamless-ish lush grass) ──────────────────────────────
def grass_base(seed: int) -> Canvas:
    c = Canvas(32, 32, "1")
    for y in range(32):
        for x in range(32):
            v = (x * 7 + y * 13 + seed * 29) % 17
            if v == 0:
                c.set(x, y, "2")
            elif v == 8:
                c.set(x, y, "3")
            elif v == 4:
                c.set(x, y, "b")
            # tiny grass blades
            if (x * 5 + y * 11 + seed * 7) % 23 == 0:
                c.set(x, y, "3")
                c.set(x, y - 1, "s")
    return c


def bush(c, cx, cy, rx=4, ry=3):
    for y in range(-ry, ry + 1):
        for x in range(-rx, rx + 1):
            if (x / rx) ** 2 + (y / ry) ** 2 <= 1.0:
                c.set(cx + x, cy + y, "s" if (x + y) % 2 == 0 else "S")
    # top highlight + bottom shade
    c.hline(cx - rx + 1, cx + rx - 2, cy - ry, "L")
    c.hline(cx - rx + 1, cx + rx - 1, cy + ry, "S")
    c.set(cx - 1, cy - 1, "L")


def t_plain(n):
    return grass_base(n)


def t_flower():
    c = grass_base(19)
    for (x, y, col) in [(8, 20, "f"), (9, 19, "w"), (20, 12, "F"), (23, 22, "f")]:
        c.set(x, y, col)
        c.set(x, y - 1, "s")
    return c


def t_shrub():
    c = grass_base(7)
    bush(c, 19, 18, 4, 3)
    return c


def t_bush():
    c = grass_base(11)
    bush(c, 13, 19, 5, 4)
    bush(c, 22, 21, 3, 2)
    return c


def t_fern():
    c = grass_base(23)
    cx, cy = 16, 24
    for dx, h in [(-3, 6), (-1, 9), (1, 8), (3, 5), (0, 10)]:
        for k in range(h):
            c.set(cx + dx + (1 if k > h // 2 and dx > 0 else (-1 if k > h // 2 and dx < 0 else 0)),
                  cy - k, "s" if k % 2 else "S")
    c.set(cx, cy - 10, "L")
    return c


def t_tree():
    c = grass_base(29)
    cx = 16
    # trunk
    c.vline(cx, 18, 26, "t")
    c.vline(cx + 1, 18, 26, "T")
    # round canopy
    for y in range(-9, 2):
        for x in range(-8, 9):
            if (x / 8) ** 2 + (y / 8) ** 2 <= 1.0:
                c.set(cx + x, 14 + y, "l" if (x + y) % 3 == 0 else "s")
    # highlights / shade
    for x in range(-6, 3):
        c.set(cx + x, 14 - 8 + abs(x) // 3, "L")
    c.set(cx - 4, 9, "L"); c.set(cx - 3, 8, "L")
    for x in range(-7, 8):
        c.set(cx + x, 14 + 6 - abs(x) // 2, "S")
    return c


def t_pebble():
    c = grass_base(13)
    c.rect(10, 22, 12, 23, "p")
    c.set(10, 23, "P"); c.set(12, 23, "P")
    c.rect(15, 24, 16, 24, "P")
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
        "grass_1": t_plain(1),
        "grass_2": t_plain(2),
        "grass_3": t_plain(3),
        "grass_flower": t_flower(),
        "grass_shrub": t_shrub(),
        "grass_bush": t_bush(),
        "grass_fern": t_fern(),
        "grass_tree": t_tree(),
        "grass_pebble": t_pebble(),
    }
    for name, cv in tiles.items():
        write_sprite(name, cv, GRASS_PALETTE, "tiles", preview_scale=8)

    pc, ppal = s_padlock()
    write_sprite("padlock_closed", pc, ppal, "ui", preview_scale=16)


if __name__ == "__main__":
    main()
