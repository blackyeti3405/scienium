#!/usr/bin/env python3
"""
Contact-sheet / montage helper for the building upgrade-evolution sprites.

Modes:

  building : compose base | _t2 | _t3 | _t4 | _t5 for ONE building into a single
             labelled horizontal strip (what a REVIEWER reads to judge the ramp).
                 -> art/preview/{lab}_{slug}_contact.png

  lab      : compose a 10-row x 5-col grid (buildings down, stages across) for a whole
             lab type, for HUMAN sign-off before committing.
                 -> art/preview/{lab}_montage.png

  all      : compose ONE big reference sheet of ALL 60 economy buildings x 5 stages,
             grouped by lab with a lab header per group and a top column header naming
             each stage tier + the levels it shows at. Sprites are drawn as large as
             possible with margins.
                 -> art/all_buildings_evolution.png   (tracked; not under art/preview/)

Sprites are read from the shipped location
  apps/web/public/sprites/buildings/{lab}/{slug}{suffix}.png
so the sheet reflects exactly what the app renders. A missing stage renders as a red
MISSING cell instead of crashing.

Usage:
  python3 art/montage.py building <lab> <slug> [--scale 8]
  python3 art/montage.py lab <lab> [--scale 5]
  python3 art/montage.py all [--scale 6]
"""
from __future__ import annotations

import argparse
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES = os.path.join(ROOT, "apps", "web", "public", "sprites", "buildings")
PREVIEW = os.path.join(ROOT, "art", "preview")

# Stage suffix -> short column label. Matches manifest.ts buildingStageSuffix.
STAGES = [("", "base"), ("_t2", "t2"), ("_t3", "t3"), ("_t4", "t4"), ("_t5", "t5")]

# Top-of-sheet column headers: tier name + the levels it is shown at (manifest tier-ups).
COL_HEADERS = [
    ("BASE", "Levels 1-3"),
    ("TIER 2", "Levels 4-6"),
    ("TIER 3", "Levels 7-9"),
    ("TIER 4", "Levels 10-14"),
    ("TIER 5", "Level 15"),
]

# The 7 navigation gateways, in plot order (lib/gateways.ts). Unlike economy
# buildings these are ONE grid recolored six ways, so the sheet shows them as a
# lab x gateway matrix rather than an upgrade run — they have no tiers.
GATEWAY_KEYS = ["discovery", "science_fair", "operations_hub", "literature_review",
                "research_plan", "pvp", "showcase"]
GATEWAY_SPRITES = os.path.join(ROOT, "apps", "web", "public", "sprites", "gateways")

# Per-lab building slug order (matches OTHER_LABS_PROMPT.md / manifest BUILDING_SPRITES).
LAB_SLUGS = {
    "volt_lab": ["workshop", "cnc-mill-shop", "3d-printing-shop", "pcb-fab", "robotics-bay",
                 "electronics-bench", "mechanical-testing-rig", "welding-fabrication", "embedded-systems-lab", "ai-incubator"],
    "biocore": ["greenhouse", "specimen-vault", "microscopy-suite", "incubation-chamber", "wet-lab",
                "field-station", "aquatic-habitat", "genetics-sequencing-lab", "behavioral-observation-room", "bioinformatics-suite"],
    "chemworks": ["fume-hood-bench", "reaction-synthesis-lab", "spectroscopy-suite", "materials-testing-bay", "crystallography-room",
                  "distillation-tower", "catalysis-lab", "polymer-workshop", "computational-chemistry-hub", "cleanroom-synthesizer"],
    "terrabase": ["sampling-station", "seismograph-array", "weather-monitoring-post", "geological-core-lab", "hydrology-bay",
                  "atmospheric-sensor-array", "soil-analysis-lab", "remote-sensing-hub", "climate-modeling-station", "deep-earth-observatory"],
    "mindframe": ["interview-room", "survey-distribution-center", "behavioral-lab", "eye-tracking-suite", "statistical-analysis-hub",
                  "focus-group-chamber", "longitudinal-study-wing", "eeg-biofeedback-room", "data-visualization-studio", "computational-social-science-lab"],
    "axiom": ["chalkboard-room", "computation-cluster", "particle-physics-bench", "optics-laboratory", "quantum-simulation-lab",
              "mathematical-modeling-suite", "observatory-dome", "theoretical-physics-annex", "numerical-methods-hub", "cosmology-visualization-theater"],
}

# Lab order + display names for the all-in-one sheet (Volt Lab is the original/reference).
ALL_LAB_ORDER = ["volt_lab", "biocore", "chemworks", "terrabase", "mindframe", "axiom"]
LAB_DISPLAY = {
    "volt_lab": "VOLT LAB", "biocore": "BIOCORE", "chemworks": "CHEMWORKS",
    "terrabase": "TERRABASE", "mindframe": "MINDFRAME", "axiom": "AXIOM",
}

BG = (32, 36, 42, 255)        # dark slate — sprites are designed for a dark game bg
GRID = (60, 66, 74, 255)      # cell separators
LABBAND = (50, 56, 66, 255)   # lab header band
LABEL = (224, 230, 238, 255)
MUTED = (150, 160, 172, 255)
MISSING = (120, 40, 40, 255)


def _font(size=None):
    try:
        return ImageFont.load_default(size=size) if size else ImageFont.load_default()
    except Exception:
        return ImageFont.load_default()


def _cell(suffix_path: str, side: int) -> Image.Image:
    """A single scaled sprite cell (NEAREST upscale on the dark bg), or a MISSING cell."""
    cell = Image.new("RGBA", (side, side), BG)
    if suffix_path and os.path.exists(suffix_path):
        spr = Image.open(suffix_path).convert("RGBA")
        scale = max(1, side // spr.width)
        big = spr.resize((spr.width * scale, spr.height * scale), Image.NEAREST)
        off = (side - big.width) // 2
        cell.alpha_composite(big, (off, off))
    else:
        d = ImageDraw.Draw(cell)
        d.rectangle([2, 2, side - 3, side - 3], outline=MISSING, width=2)
        d.text((side // 2 - 18, side // 2 - 4), "MISSING", fill=MISSING, font=_font())
    return cell


def building_sheet(lab: str, slug: str, scale: int = 8) -> str:
    """Labelled base..t5 horizontal strip for one building."""
    side = 64 * scale
    pad, label_h, gap = 8, 16, 6
    cols = len(STAGES)
    W = pad * 2 + cols * side + (cols - 1) * gap
    H = pad * 2 + label_h + side
    sheet = Image.new("RGBA", (W, H), BG)
    draw = ImageDraw.Draw(sheet)
    font = _font()
    draw.text((pad, 2), f"{lab} / {slug}", fill=LABEL, font=font)
    for i, (suffix, name) in enumerate(STAGES):
        x = pad + i * (side + gap)
        y = pad + label_h
        path = os.path.join(SPRITES, lab, f"{slug}{suffix}.png")
        sheet.alpha_composite(_cell(path, side), (x, y))
        draw.rectangle([x, y, x + side - 1, y + side - 1], outline=GRID, width=1)
        draw.text((x + 4, y + 2), name, fill=LABEL, font=font)
    os.makedirs(PREVIEW, exist_ok=True)
    out = os.path.join(PREVIEW, f"{lab}_{slug}_contact.png")
    sheet.convert("RGB").save(out)
    print(out)
    return out


def lab_montage(lab: str, scale: int = 5) -> str:
    """10x5 grid (buildings x stages) for a whole lab type."""
    slugs = LAB_SLUGS[lab]
    side = 64 * scale
    pad, head, rowlabel_w, gap = 10, 18, 160, 4
    cols = len(STAGES)
    W = pad * 2 + rowlabel_w + cols * side + (cols - 1) * gap
    H = pad * 2 + head + len(slugs) * (side + gap)
    sheet = Image.new("RGBA", (W, H), BG)
    draw = ImageDraw.Draw(sheet)
    font = _font()
    draw.text((pad, 2), f"{lab} — upgrade evolution (base -> t5)", fill=LABEL, font=font)
    for ci, (_, name) in enumerate(STAGES):
        x = pad + rowlabel_w + ci * (side + gap)
        draw.text((x + 4, head - 2), name, fill=LABEL, font=font)
    for ri, slug in enumerate(slugs):
        y = pad + head + ri * (side + gap)
        draw.text((pad, y + side // 2 - 4), slug, fill=LABEL, font=font)
        for ci, (suffix, _) in enumerate(STAGES):
            x = pad + rowlabel_w + ci * (side + gap)
            path = os.path.join(SPRITES, lab, f"{slug}{suffix}.png")
            sheet.alpha_composite(_cell(path, side), (x, y))
            draw.rectangle([x, y, x + side - 1, y + side - 1], outline=GRID, width=1)
    os.makedirs(PREVIEW, exist_ok=True)
    out = os.path.join(PREVIEW, f"{lab}_montage.png")
    sheet.convert("RGB").save(out)
    print(out)
    return out


def _centered(draw, x, w, y, text, font, fill):
    tw = draw.textlength(text, font=font)
    draw.text((x + (w - tw) / 2, y), text, fill=fill, font=font)


def all_sheet(scale: int = 6) -> str:
    """One big reference sheet: all 60 buildings x 5 stages, grouped by lab, with a top
    column header (tier + levels) and a per-lab header. Sprites drawn as large as possible."""
    side = 64 * scale
    M = 40                       # outer margin
    col_gap, row_gap, lab_gap = 14, 8, 22
    title_h, colhdr_h, labhdr_h = 78, 96, 64
    cols = len(STAGES)

    f_title = _font(46)
    f_col = _font(32)
    f_colsub = _font(23)
    f_lab = _font(40)
    f_row = _font(23)

    # left label column wide enough for the longest building slug
    probe = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    longest = max(probe.textlength(s, font=f_row) for lab in ALL_LAB_ORDER for s in LAB_SLUGS[lab])
    label_w = int(longest) + 34
    grid_x0 = M + label_w
    content_w = label_w + cols * side + (cols - 1) * col_gap
    W = M * 2 + content_w

    # Gateway band sits above the economy grid. Its 7 columns have to fit the
    # width the 5-column economy grid already fixed, so its cells are smaller —
    # snapped DOWN to a whole multiple of 64 so the sprites stay integer-scaled
    # and pixel-crisp rather than resampled.
    g_avail = cols * side + (cols - 1) * col_gap
    g_side = max(64, ((g_avail - (len(GATEWAY_KEYS) - 1) * col_gap) // len(GATEWAY_KEYS)) // 64 * 64)
    gate_h = labhdr_h + colhdr_h // 2 + len(ALL_LAB_ORDER) * (g_side + row_gap)

    H = M + title_h + gate_h + lab_gap + colhdr_h
    for lab in ALL_LAB_ORDER:
        n = len(LAB_SLUGS[lab])
        H += lab_gap + labhdr_h + n * side + (n - 1) * row_gap
    H += M

    sheet = Image.new("RGBA", (W, H), BG)
    draw = ImageDraw.Draw(sheet)

    # title
    draw.text((M, M + 10),
              "scienium - buildings  ·  7 gateways x 6 skins  +  60 economy buildings x 5 stages",
              fill=LABEL, font=f_title)

    # ── Gateway band ────────────────────────────────────────────────────────
    gy = M + title_h
    draw.rectangle([M, gy, W - M, gy + labhdr_h], fill=LABBAND)
    draw.text((M + 16, gy + (labhdr_h - 40) // 2),
              "GATEWAY BUILDINGS  ·  7 gateways x 6 lab skins", fill=LABEL, font=f_lab)
    gy += labhdr_h
    for ci, key in enumerate(GATEWAY_KEYS):
        x = grid_x0 + ci * (g_side + col_gap)
        _centered(draw, x, g_side, gy + 8, key.replace("_", " "), f_colsub, MUTED)
    gy += colhdr_h // 2
    for ri, lab in enumerate(ALL_LAB_ORDER):
        ry = gy + ri * (g_side + row_gap)
        draw.text((M + 8, ry + g_side // 2 - 14), LAB_DISPLAY[lab], fill=LABEL, font=f_row)
        for ci, key in enumerate(GATEWAY_KEYS):
            x = grid_x0 + ci * (g_side + col_gap)
            path = os.path.join(GATEWAY_SPRITES, f"{key}_{lab}.png")
            sheet.alpha_composite(_cell(path, g_side), (x, ry))
            draw.rectangle([x, ry, x + g_side - 1, ry + g_side - 1], outline=GRID, width=1)

    # column header band: BUILDING + the five tier/level columns
    cy = M + title_h + gate_h + lab_gap
    draw.text((M + 6, cy + 32), "BUILDING", fill=MUTED, font=f_colsub)
    for ci, (tier, lvl) in enumerate(COL_HEADERS):
        x = grid_x0 + ci * (side + col_gap)
        _centered(draw, x, side, cy + 22, tier, f_col, LABEL)
        _centered(draw, x, side, cy + 22 + 40, lvl, f_colsub, MUTED)
    draw.line([(M, cy + colhdr_h - 3), (W - M, cy + colhdr_h - 3)], fill=GRID, width=2)

    y = cy + colhdr_h
    for lab in ALL_LAB_ORDER:
        y += lab_gap
        draw.rectangle([M, y, W - M, y + labhdr_h], fill=LABBAND)
        draw.text((M + 16, y + (labhdr_h - 40) // 2), LAB_DISPLAY[lab], fill=LABEL, font=f_lab)
        y += labhdr_h
        slugs = LAB_SLUGS[lab]
        for ri, slug in enumerate(slugs):
            ry = y + ri * (side + row_gap)
            draw.text((M + 8, ry + side // 2 - 14), slug, fill=LABEL, font=f_row)
            for ci, (suffix, _) in enumerate(STAGES):
                x = grid_x0 + ci * (side + col_gap)
                path = os.path.join(SPRITES, lab, f"{slug}{suffix}.png")
                sheet.alpha_composite(_cell(path, side), (x, ry))
                draw.rectangle([x, ry, x + side - 1, ry + side - 1], outline=GRID, width=1)
        y += len(slugs) * side + (len(slugs) - 1) * row_gap

    out = os.path.join(ROOT, "art", "all_buildings_evolution.png")
    sheet.convert("RGB").save(out)
    print(f"{out}  ({W}x{H})")
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="mode", required=True)
    b = sub.add_parser("building")
    b.add_argument("lab")
    b.add_argument("slug")
    b.add_argument("--scale", type=int, default=8)
    l = sub.add_parser("lab")
    l.add_argument("lab")
    l.add_argument("--scale", type=int, default=5)
    a = sub.add_parser("all")
    a.add_argument("--scale", type=int, default=6)
    args = ap.parse_args()
    if args.mode == "building":
        building_sheet(args.lab, args.slug, args.scale)
    elif args.mode == "all":
        all_sheet(args.scale)
    else:
        lab_montage(args.lab, args.scale)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
