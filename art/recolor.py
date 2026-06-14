#!/usr/bin/env python3
"""
NOVA Lab gateway reskin via palette swap.

Every gateway building is authored once in the generic palette (build_sprites.py)
using a fixed set of palette CHARS (K/L/M/D wall, c/g/G glass, o/O/r accent, W).
Reskinning to a lab type is therefore a pure palette swap: same char grid, new hex
values per char. This proves the reskin pipeline end-to-end with zero re-drawing.

For each of the 7 generic source JSONs in art/src/<key>_generic.json and each of
the 6 lab types, this writes art/src/<key>_<lab>.json and renders the PNG to
apps/web/public/sprites/gateways/<key>_<lab>.png (+ preview).

Palette directions follow spec §20.4 (starting direction; refine in design system).

Run:  python art/recolor.py
"""
from __future__ import annotations

import json
import os

from render_pixel_art import render
from build_sprites import SRC_DIR, SPRITES_DIR, PREVIEW_DIR, write_sprite, Canvas

GATEWAY_KEYS = [
    "discovery",
    "science_fair",
    "literature_review",
    "operations_hub",
    "research_plan",
    "pvp",
    "showcase",
]

# char -> hex, keyed identically to the canonical palette (canon.py):
#   K outline | W/L/M/D/d wall (light→dark) | h/c/g/G glass | o/O/r accent
LAB_PALETTES = {
    # BioCore — greens + organic teal, warm amber accents
    "biocore": {
        "K": "#1a2417", "W": "#e8f2d8", "L": "#c4dba6", "M": "#9fc07e", "D": "#6f9456", "d": "#4a6e3a",
        "h": "#d2f7ec", "c": "#9fefcf", "g": "#36cc9e", "G": "#1d8f70",
        "o": "#f0b24d", "O": "#ffd488", "r": "#b9701e",
    },
    # ChemWorks — glassware blues + reactive violet accents
    "chemworks": {
        "K": "#161a2e", "W": "#e6ecfb", "L": "#c2cdee", "M": "#9aa8d8", "D": "#6f7cb0", "d": "#4b5688",
        "h": "#d6ecff", "c": "#a8d4ff", "g": "#4aa0e6", "G": "#2166b0",
        "o": "#c89cf0", "O": "#e0c2ff", "r": "#6a34a8",
    },
    # Volt Lab — industrial steel grey + electric yellow/cyan
    "volt_lab": {
        "K": "#15181d", "W": "#eef2f6", "L": "#cdd6dd", "M": "#9aa3ad", "D": "#6c7682", "d": "#49515b",
        "h": "#d6f9ff", "c": "#aef0fb", "g": "#38cfe2", "G": "#1f8ba0",
        "o": "#ffe85a", "O": "#fff7a8", "r": "#c89a14",
    },
    # TerraBase — earthy ochre/slate + mineral teal
    "terrabase": {
        "K": "#20190f", "W": "#efe6cf", "L": "#d6c8a0", "M": "#b09a6e", "D": "#7e6c47", "d": "#54462c",
        "h": "#d6f2ea", "c": "#a4e2d4", "g": "#34b6a2", "G": "#1d8474",
        "o": "#e0a850", "O": "#ffce80", "r": "#9a5e1e",
    },
    # MindFrame — muted indigo/violet + soft magenta
    "mindframe": {
        "K": "#181428", "W": "#e8e2f6", "L": "#cabfe6", "M": "#9f90c8", "D": "#6f5fa0", "d": "#4a3c70",
        "h": "#ecc8f4", "c": "#d0a8ee", "g": "#a45ce0", "G": "#6a2fb0",
        "o": "#f08cce", "O": "#ffb8e2", "r": "#b03a80",
    },
    # Axiom — deep space navy + starlight gold/cyan
    "axiom": {
        "K": "#0e1124", "W": "#dfe6f6", "L": "#b4bee0", "M": "#7c88b8", "D": "#4e5888", "d": "#333a60",
        "h": "#d6ecff", "c": "#aad8ff", "g": "#4a9ce6", "G": "#2060b0",
        "o": "#ffe27a", "O": "#fff3c0", "r": "#c89a2a",
    },
}


def recolor_all():
    for key in GATEWAY_KEYS:
        gen_path = os.path.join(SRC_DIR, f"{key}_generic.json")
        with open(gen_path, "r", encoding="utf-8") as fh:
            spec = json.load(fh)
        for lab, pal in LAB_PALETTES.items():
            cv = Canvas(spec["width"], spec["height"])
            cv.px = [list(row) for row in spec["rows"]]
            write_sprite(f"{key}_{lab}", cv, pal, "gateways", preview_scale=8)


if __name__ == "__main__":
    recolor_all()
