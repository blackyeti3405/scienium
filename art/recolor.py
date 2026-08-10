#!/usr/bin/env python3
"""
scienium gateway reskin via palette swap.

Every gateway building is authored once in the generic palette (build_sprites.py)
using a fixed set of palette CHARS (K/L/M/D wall, c/g/G glass, o/O/r accent, W).
Reskinning to a lab type is therefore a pure palette swap: same char grid, new hex
values per char. This proves the reskin pipeline end-to-end with zero re-drawing.

For each of the 7 generic source JSONs in art/src/<key>_generic.json and each of
the 6 lab types, this writes art/src/<key>_<lab>.json and renders the PNG to
apps/web/public/sprites/gateways/<key>_<lab>.png (+ preview).

Palette directions: identity in the glass ramp, accent chosen for contrast
against it. See LAB_PALETTES below for the reasoning and the measurements.

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
    # Identity lives in the GLASS ramp, not the accent.
    #
    # Measured across all 7 gateways, glass is 31% of the non-transparent pixels
    # and accent only 13%. Volt Lab was the one lab whose accent "showed" — and
    # only because its glass ramp is yellow too, so 44% of the sprite sings one
    # note. Every other lab was a 13% scatter of trim fighting a 31% mass in a
    # distant hue, which is why the accents read as noise.
    #
    # So each lab now takes its identity in the glass, and the accent is chosen
    # for CONTRAST against it rather than as a second theme colour.
    #
    # Hues are also spread deliberately: the old palettes put five of six labs in
    # a 111-degree arc (chemworks h207 and axiom h208 were 1.5 degrees apart —
    # the same blue). Worst separation is now 32 degrees. No blues, no purples.

    # BioCore — chlorophyll green, warm amber accent (90 degrees off the glass)
    "biocore": {
        "K": "#16200f", "W": "#eef3e2", "L": "#cfdcb8", "M": "#a8bd8a", "D": "#74905a", "d": "#4c6339",
        "h": "#ddffe9", "c": "#8ff0b6", "g": "#3fd07a", "G": "#1f8a4e",
        "o": "#ffb02e", "O": "#ffd782", "r": "#b86a10",
    },
    # ChemWorks — beaker glass / copper sulfate aqua, reaction-heat orange accent
    "chemworks": {
        "K": "#101f22", "W": "#e9f1f0", "L": "#c5d5d2", "M": "#97aca8", "D": "#667e7a", "d": "#435754",
        "h": "#d6fff8", "c": "#7fecdd", "g": "#17c4b0", "G": "#0b8477",
        "o": "#ff6a2a", "O": "#ffa268", "r": "#b83c10",
    },
    # Volt Lab — UNCHANGED. It was already the one lab that read correctly, and
    # it is the model the rest now follow: identity in the glass.
    "volt_lab": {
        "K": "#15181d", "W": "#eef2f6", "L": "#cdd6dd", "M": "#9aa3ad", "D": "#6c7682", "d": "#49515b",
        "h": "#fffde6", "c": "#ffe96b", "g": "#ffc915", "G": "#a8770c",
        "o": "#ffe85a", "O": "#fff7a8", "r": "#c89a14",
    },
    # TerraBase — iron-oxide rust and strata, pale sand accent. Sand sits closer
    # in hue than the other pairs, so it carries on VALUE instead (l68 vs l53).
    "terrabase": {
        "K": "#1f1509", "W": "#f2e7d2", "L": "#d9c4a0", "M": "#b08a63", "D": "#7d5f3e", "d": "#523c26",
        "h": "#ffddc6", "c": "#f79f6e", "g": "#e2622c", "G": "#9c3a12",
        "o": "#f2c66b", "O": "#ffe4a8", "r": "#a87b2c",
    },
    # MindFrame — rose-crimson, warm and human rather than the usual "brain =
    # purple". Wall is a desaturated rosy grey, NOT a violet.
    "mindframe": {
        "K": "#21111a", "W": "#f4e8ec", "L": "#dcc4cc", "M": "#b08a92", "D": "#7d5a63", "d": "#533a41",
        "h": "#ffdcea", "c": "#fb92b8", "g": "#f0417e", "G": "#a81a4e",
        "o": "#ffcf5c", "O": "#ffe9a8", "r": "#b58a1e",
    },
    # Axiom — the one lab differentiated by CHROMA rather than hue: chalk,
    # vacuum, starlight. Six saturated labs on a wheel with no blue or purple
    # gets cramped, so this one goes achromatic and takes gold as its accent.
    "axiom": {
        "K": "#14171c", "W": "#f0f3f7", "L": "#d2d8e0", "M": "#9fa6ad", "D": "#6d747c", "d": "#474d54",
        "h": "#ffffff", "c": "#f7faff", "g": "#e4ebf5", "G": "#a8b3c4",
        "o": "#ffd34a", "O": "#fff0b8", "r": "#b8912a",
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
