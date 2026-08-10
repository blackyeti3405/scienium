#!/usr/bin/env python3
"""
Apply the lab-type palettes from recolor.py to every ECONOMY building.

The gateways were a straight palette swap (one generic grid, six palettes). The
economy buildings are different: each lab type has its own ten buildings, and
each source JSON in art/src/buildings/ carries its palette inline. Every tier of
a building (base, _t2 … _t5) shares that palette — the tiers differ in the char
GRID, not in colour — so a lab's whole catalogue recolors together.

Two things this has to get right:

1. The four EXTRA chars. Building palettes carry `b e E q` on top of the shared
   thirteen (K · W L M D d · h c g G · o O r). They are not in LAB_PALETTES, and
   hardcoding six new values for each would be guesswork. Instead each extra is
   re-derived: find the char it sits closest to in the sprite's CURRENT palette,
   measure its HSL offset from that anchor, and re-apply the same offset to the
   anchor's new colour. A highlight that was 12% lighter and 6 degrees off its
   ramp stays 12% lighter and 6 degrees off — the artist's intent survives the
   hue change.

2. The source JSONs are rewritten, not just the PNGs. They are the source of
   truth (tier2_reskin.py and the montage read them), so leaving them on the old
   palette would mean the next re-render silently undid this.

Run from the repo root:  python3 art/recolor_buildings.py
"""
from __future__ import annotations

import colorsys
import glob
import json
import os

from render_pixel_art import render
from recolor import LAB_PALETTES

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "art", "src", "buildings")
OUT_ROOT = os.path.join(ROOT, "apps", "web", "public", "sprites", "buildings")
PREVIEW_DIR = os.path.join(ROOT, "art", "preview")

# The roles LAB_PALETTES defines. Anything else in a building palette is an extra.
KNOWN = "KWLMDdhcgGoOr"


def to_hsl(hexstr: str) -> tuple[float, float, float]:
    h = hexstr.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))
    hue, light, sat = colorsys.rgb_to_hls(r, g, b)
    return hue * 360.0, sat * 100.0, light * 100.0


def to_hex(hue: float, sat: float, light: float) -> str:
    r, g, b = colorsys.hls_to_rgb((hue % 360.0) / 360.0, max(0.0, min(1.0, light / 100.0)),
                                  max(0.0, min(1.0, sat / 100.0)))
    return "#%02x%02x%02x" % (round(r * 255), round(g * 255), round(b * 255))


def nearest_known(colour: str, palette: dict[str, str]) -> str:
    """The known-role char whose colour is closest to `colour`, in HSL space.

    Hue is weighted low and lightness high: an extra is nearly always a lighter
    or darker step of a ramp it belongs to, so lightness proximity identifies the
    ramp far more reliably than hue does.
    """
    ch, cs, cl = to_hsl(colour)
    best, best_d = None, 1e9
    for k in KNOWN:
        if k not in palette:
            continue
        kh, ks, kl = to_hsl(palette[k])
        dh = min(abs(ch - kh), 360 - abs(ch - kh))
        d = (dh * 0.5) ** 2 + (cs - ks) ** 2 + ((cl - kl) * 1.5) ** 2
        if d < best_d:
            best, best_d = k, d
    return best or "M"


def remap(old: dict[str, str], new_roles: dict[str, str]) -> dict[str, str]:
    out = {k: v for k, v in new_roles.items() if k in old}
    for ch, colour in old.items():
        if ch in KNOWN:
            continue
        anchor = nearest_known(colour, old)
        oh, os_, ol = to_hsl(old[anchor])
        nh, ns, nl = to_hsl(new_roles[anchor])
        eh, es, el = to_hsl(colour)
        # Carry the offset, not the absolute colour.
        dh = ((eh - oh + 180) % 360) - 180
        out[ch] = to_hex(nh + dh, ns + (es - os_), nl + (el - ol))
    return out


def recolor_buildings() -> int:
    n = 0
    for src in sorted(glob.glob(os.path.join(SRC_DIR, "*.json"))):
        base = os.path.basename(src)[: -len(".json")]
        lab = next((l for l in LAB_PALETTES if base.startswith(l + "_")), None)
        if lab is None:
            print(f"  skip (no lab type): {base}")
            continue
        slug = base[len(lab) + 1 :]

        spec = json.load(open(src, encoding="utf-8"))
        remapped = remap(spec["palette"], LAB_PALETTES[lab])
        # Only rewrite when the colours actually move. Volt Lab's palette is
        # unchanged, and these files are not consistently formatted (some are one
        # line, some one key per line) — so an unconditional dump would reformat
        # 50 files that have no colour change in them at all.
        if remapped != spec["palette"]:
            spec["palette"] = remapped
            with open(src, "w", encoding="utf-8") as fh:
                json.dump(spec, fh, indent=0)
                fh.write("\n")

        out_dir = os.path.join(OUT_ROOT, lab)
        os.makedirs(out_dir, exist_ok=True)
        os.makedirs(PREVIEW_DIR, exist_ok=True)
        img = render(spec)
        img.save(os.path.join(out_dir, f"{slug}.png"))
        img.resize((img.width * 8, img.height * 8)).save(
            os.path.join(PREVIEW_DIR, f"{lab}_{slug}.png")
        )
        n += 1
    return n


if __name__ == "__main__":
    print(f"done: {recolor_buildings()} economy building sprites recolored")
