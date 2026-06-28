#!/usr/bin/env python3
"""
Tier-2 (upgrade) reskins for economy buildings.

A building's source char-grid (art/src/buildings/{labType}_{slug}.json) is shape +
palette. The TIER-2 skin shown at building level >= 4 (see manifest.getBuildingSprite)
is the SAME char-grid rendered with an upgraded palette — no geometry change, so the
footprint/anchor are identical to the base sprite.

Output: apps/web/public/sprites/buildings/{labType}/{slug}_t2.png (base stays {slug}.png).
Previews: art/preview/{labType}_{slug}_t2.png.

Run from repo root:  python3 art/tier2_reskin.py
Re-run after the base builders change.
"""
import glob
import json
import os

from render_pixel_art import render

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "art", "src", "buildings")
PREVIEW_DIR = os.path.join(ROOT, "art", "preview")

# Per-lab-type TIER-2 palettes, keyed by the shared char roles
# (K outline · W/L/M/D/d wall light→dark · h/c/g/G glass · o/O/r accent).
# Volt Lab base is cool steel + cyan glass + yellow sparks; tier-2 is a polished
# BRASS/GOLD structure (premium "upgraded" read) keeping the cyan glass so glazing
# still reads as glass, with hot white-gold sparks.
TIER2_PALETTES = {
    "volt_lab": {
        "K": "#1c160d",
        "W": "#fff6dd", "L": "#f4dd9c", "M": "#d8ad55", "D": "#9c7322", "d": "#694d14",
        "h": "#d6f9ff", "c": "#aef0fb", "g": "#38cfe2", "G": "#1f8ba0",
        "o": "#fff2b0", "O": "#ffffff", "r": "#e0b43a",
    },
}


def reskin_lab(lab_type: str, palette: dict) -> int:
    out_dir = os.path.join(ROOT, "apps", "web", "public", "sprites", "buildings", lab_type)
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    n = 0
    for src in sorted(glob.glob(os.path.join(SRC_DIR, f"{lab_type}_*.json"))):
        spec = json.load(open(src))
        slug = os.path.basename(src)[len(lab_type) + 1 : -len(".json")]
        # same grid, upgraded palette — only chars actually present need to map, but
        # we apply the full role palette so every wall/glass/accent pixel recolors.
        spec["palette"] = palette
        img = render(spec)
        out = os.path.join(out_dir, f"{slug}_t2.png")
        img.save(out)
        preview = os.path.join(PREVIEW_DIR, f"{lab_type}_{slug}_t2.png")
        img.resize((img.width * 8, img.height * 8)).save(preview)
        print(f"reskinned {slug} -> {out}")
        n += 1
    return n


def main() -> None:
    total = 0
    for lab_type, palette in TIER2_PALETTES.items():
        total += reskin_lab(lab_type, palette)
    print(f"done: {total} tier-2 reskins")


if __name__ == "__main__":
    main()
