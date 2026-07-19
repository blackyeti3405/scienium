#!/usr/bin/env python3
"""
Compose preview screenshots of the spatial lab scene using the real sprite PNGs,
replicating the iso layout from the app (lib/gateways.ts cells + LabScene STEP_X/
STEP_Y + TileBackground hash). Verifies layout / growth / reskin / padlock / depth
without running Next + Clerk + DB.

Run:  python art/compose_scene.py   -> art/scene_*.png
"""
from __future__ import annotations

import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES = os.path.join(ROOT, "apps", "web", "public", "sprites")

TILE_CELL = 64
GATEWAY_SRC = 64
SCALE = 2
DISP = GATEWAY_SRC * SCALE  # 128
STEP_X, STEP_Y, CLUSTER_Y = 58, 40, -12

PLAIN = ["grass_1", "grass_2"]
LIGHT = ["grass_flower", "grass_pebble"]
HEAVY = ["grass_bush", "grass_shrub"]

# gateway -> (gx, gy)  (mirror of lib/gateways.ts)
CELLS = {
    "showcase": (-1, -1),
    "discovery": (0, 0),
    "science_fair": (1, -1),
    "literature_review": (-1, 1),
    "operations_hub": (1, 1),
    "research_plan": (0, 1),
    "pvp": (1, 0),
}


def u32(x):
    return x & 0xFFFFFFFF


def imul(a, b):
    return u32(a * b)


def hash_(col, row, seed):
    h = u32((col * 73856093) ^ (row * 19349663) ^ (seed * 83492791))
    h = imul(h ^ (h >> 15), 2246822507)
    h = imul(h ^ (h >> 13), 3266489909)
    return u32(h ^ (h >> 16))


def tile_for(col, row, seed):
    h = hash_(col, row, seed)
    r = h % 100
    if r < 10:
        return HEAVY[h % len(HEAVY)]
    if r < 34:
        return LIGHT[h % len(LIGHT)]
    return PLAIN[h % len(PLAIN)]


def load(p):
    return Image.open(p).convert("RGBA")


def tile_bg(w, h, seed=1):
    bg = Image.new("RGBA", (w, h), (74, 124, 62, 255))
    cache = {}
    for row in range(h // TILE_CELL + 1):
        for col in range(w // TILE_CELL + 1):
            tid = tile_for(col, row, seed)
            if tid not in cache:
                cache[tid] = load(os.path.join(SPRITES, "tiles", f"{tid}.png")).resize(
                    (TILE_CELL, TILE_CELL), Image.NEAREST
                )
            bg.alpha_composite(cache[tid], (col * TILE_CELL, row * TILE_CELL))
    return bg


def place(scene, key, skin, locked=False):
    gx, gy = CELLS[key]
    dx = (gx - gy) * STEP_X
    dy = (gx + gy) * STEP_Y + CLUSTER_Y
    cx, cy = scene.width // 2 + dx, scene.height // 2 + dy
    spr = load(os.path.join(SPRITES, "gateways", f"{key}_{skin}.png")).resize((DISP, DISP), Image.NEAREST)
    if locked:
        from PIL import ImageEnhance
        spr = ImageEnhance.Color(spr).enhance(0.35)
        spr = ImageEnhance.Brightness(spr).enhance(0.7)
    scene.alpha_composite(spr, (cx - DISP // 2, cy - DISP // 2))
    if locked:
        pad = load(os.path.join(SPRITES, "ui", "padlock_closed.png")).resize((32, 32), Image.NEAREST)
        scene.alpha_composite(pad, (cx - 16, cy - 16))


def scene(present, skin, out, locked=(), seed=1, size=(900, 620)):
    s = tile_bg(*size, seed=seed)
    for key in sorted(present, key=lambda k: sum(CELLS[k])):  # back -> front
        place(s, key, skin, locked=(key in locked))
    s.save(os.path.join(ROOT, "art", out))
    print("wrote art/" + out)


def main():
    scene(["discovery", "science_fair"], "generic", "scene_discovery_small.png", size=(900, 620))
    scene(
        ["discovery", "science_fair", "literature_review", "operations_hub", "pvp", "research_plan"],
        "generic", "scene_working_generic.png",
    )
    scene(list(CELLS), "biocore", "scene_showcase_biocore.png", locked=("showcase",))


if __name__ == "__main__":
    main()
