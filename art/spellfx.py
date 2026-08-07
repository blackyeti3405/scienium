#!/usr/bin/env python3
"""
scienium PvP spell art — hotbar icons + in-world cast FX.

THE SYSTEM (three layers, so 41 spells cost ~7 authored forms instead of 41):

  shape  = what the spell DOES     burst / wave / lance / flask
  colour = its TYPE                empirical (blue) / theoretical (violet) / applied (amber)
  emblem = WHICH BUILDING granted it   a 14x14 pictogram, signatures only

A raid is 15 seconds, so the player has to read behaviour at a glance, not a
name. Shape carries behaviour and is silhouette-distinct — colour alone could
never do that job, and ~8% of boys are red-green colourblind, so hue is never
the only cue (the bar also prints the type word).

Shared archetype spells are shape+colour with NO emblem: they read as "basic"
precisely because they are plain. Signature spells stamp their building's motif
over the aura, so the icon cites the building it came from.

  4 shapes x 3 types              = 12 shared icons
  30 signatures (shape+type+emblem) = 30 icons
  3 FX forms x 3 types            = 9 cast effects
                                    -- 51 PNGs from 7 procedural forms + 30 glyphs

Cast FX are single stills; the app animates them with CSS keyframes (the same
way globals.css already animates everything else) rather than sprite sheets.
`blast` and `linger` are drawn on a 2:1 ellipse so they lie flat on the
isometric ground plane instead of floating.

Run:  python art/spellfx.py
"""
from __future__ import annotations

import json
import math
import os
import re

from render_pixel_art import render
from build_sprites import Canvas, SRC_DIR, SPRITES_DIR, PREVIEW_DIR

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── Type palettes ────────────────────────────────────────────────────────────
# Hues match TYPE_COLORS in the app (blue-400 / purple-400 / amber-400) so the
# icon and its printed type label agree. Chars are shared across all three so a
# form is authored once and palette-swapped, exactly like recolor.py does for
# gateways.
#   K outline · E edge/dark · M mid · L light · W core highlight
#   e/w emblem dark / emblem highlight (always high-contrast against M/L)
TYPE_PALETTES = {
    "empirical": {
        "K": "#08122b", "E": "#1b4a86", "M": "#3d8fd6", "L": "#79c4f2", "W": "#e2f2ff",
        "e": "#08122b", "w": "#e2f2ff",
    },
    "theoretical": {
        "K": "#170d2b", "E": "#472a86", "M": "#8a5cd6", "L": "#bfa0f2", "W": "#f0e6ff",
        "e": "#170d2b", "w": "#f0e6ff",
    },
    "applied": {
        "K": "#2b1a06", "E": "#8a5714", "M": "#d69432", "L": "#f2c979", "W": "#fff3dc",
        "e": "#2b1a06", "w": "#fff3dc",
    },
}

ICON = 32
IC = ICON / 2 - 0.5  # icon centre (15.5 — even canvas, so centre is between px)


# ── Shape forms (procedural, 32×32) ──────────────────────────────────────────
# Each fills the frame as a glowing aura with a hard K outline. The middle
# ~14×14 stays visually calm so a stamped emblem reads on top of it.

def _ramp(c: Canvas, x: int, y: int, t: float):
    """Paint one aura pixel, brightest at the core (t=0) to edge (t=1)."""
    ch = "W" if t < 0.30 else "L" if t < 0.58 else "M" if t < 0.84 else "E"
    c.set(x, y, ch)


def _outline(c: Canvas):
    """Hard K outline around every painted pixel — the pipeline's signature edge."""
    filled = {(x, y) for y in range(c.h) for x in range(c.w) if c.px[y][x] != "."}
    for (x, y) in filled:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < c.w and 0 <= ny < c.h and (nx, ny) not in filled:
                c.set(nx, ny, "K")


def burst() -> Canvas:
    """Eight-point impact star — the plain 'it hits here' shape."""
    c = Canvas(ICON, ICON)
    for y in range(ICON):
        for x in range(ICON):
            dx, dy = x - IC, y - IC
            r = math.hypot(dx, dy)
            if r < 0.5:
                c.set(x, y, "W")
                continue
            a = math.atan2(dy, dx)
            # 8 lobes; cardinals reach further than diagonals
            lobe = abs(math.cos(4 * a))
            cardinal = abs(math.cos(2 * a)) ** 2
            reach = 6.5 + 8.5 * lobe ** 1.6 * (0.72 + 0.28 * cardinal)
            if r <= reach:
                _ramp(c, x, y, min(1.0, r / reach))
    _outline(c)
    return c


def wave() -> Canvas:
    """Concentric 2:1 rings — the wide, shallow shape."""
    c = Canvas(ICON, ICON)
    for y in range(ICON):
        for x in range(ICON):
            dx, dy = (x - IC) / 15.0, (y - IC) / 8.0
            r = math.hypot(dx, dy)
            if r > 1.02:
                continue
            # three bands with gaps, so it reads as a spreading wave not a blob
            band = (r * 3.0) % 1.0
            if r < 0.22 or band < 0.62:
                _ramp(c, x, y, min(1.0, r))
    _outline(c)
    return c


def lance() -> Canvas:
    """Upright spike — the focused, single-target shape.

    Deliberately NOT an ellipse: a rounded top and bottom read as a pill, which
    says nothing. A sharp point, a straight shaft wide enough to seat an emblem,
    and a flared foot is what makes it read as a driven spike.
    """
    c = Canvas(ICON, ICON)
    for y in range(2, 30):
        if y < 11:                      # tip: taper up to a point
            half = 7.0 * ((y - 2) / 9.0) ** 0.62
        elif y <= 24:                   # shaft: straight, seats the 14px emblem
            half = 7.0
        else:                           # foot: flare out to a base
            half = 7.0 + 2.0 * ((y - 24) / 5.0)
        for x in range(ICON):
            dx = abs(x - IC)
            if dx <= half:
                _ramp(c, x, y, min(1.0, dx / max(half, 0.001)))
    # bright edge down the lit side + a hot tip, so it reads directional
    for y in range(4, 28):
        c.set(int(IC) - 1, y, "W" if y < 12 else "L")
    c.set(int(IC), 3, "W")
    c.set(int(IC) - 1, 3, "W")
    _outline(c)
    return c


def flask() -> Canvas:
    """Thrown flask over a settling cloud — the lingering / damage-over-time shape."""
    c = Canvas(ICON, ICON)
    # ground cloud (2:1, bottom third)
    for y in range(ICON):
        for x in range(ICON):
            dx, dy = (x - IC) / 15.0, (y - 24) / 6.0
            r = math.hypot(dx, dy)
            if r <= 1.0 and ((r * 2.4) % 1.0) < 0.72:
                _ramp(c, x, y, min(1.0, 0.45 + r * 0.55))
    # bottle body (rounded) + neck + stopper, sitting above the cloud
    for y in range(ICON):
        for x in range(ICON):
            dx, dy = (x - IC) / 7.5, (y - 14) / 8.0
            if math.hypot(dx, dy) <= 1.0:
                _ramp(c, x, y, min(1.0, math.hypot(dx, dy) * 0.9))
    c.rect(int(IC) - 2, 3, int(IC) + 3, 7, "L")
    c.rect(int(IC) - 3, 1, int(IC) + 4, 3, "W")
    _outline(c)
    return c


SHAPES = {"burst": burst, "wave": wave, "lance": lance, "flask": flask}


# ── Signature emblems (14×14 pictograms) ─────────────────────────────────────
# One per signature spell, lifted from the hero motif in that building's
# blueprint under .claude/pixel-art-pipeline/blueprints/. Chars: e = dark
# (the readable silhouette), w = highlight, . = transparent. Stamped over the
# aura, so `e` must carry the shape on its own.
EMB = 14
EMBLEMS: dict[str, list[str]] = {
    # ── Volt Lab ──
    "workshop": [                      # wrench — Rapid Prototype
        "..........ee..", ".........ewwe.", ".........ewwe.", "..........ee..",
        ".........eee..", "........eee...", ".......eee....", "......eee.....",
        ".....eee......", "....eee.......", "...eee........", "..eew.........",
        "..eee.........", "..............",
    ],
    "mechanical_testing_rig": [        # fractured beam — Stress Fracture
        "..............", "..............", "eeeeee..eeeeee", "ewwwee..eewwwe",
        "eeeee....eeeee", "eeee......eeee", "eeeee....eeeee", "ewwwee..eewwwe",
        "eeeeee..eeeeee", "..............", "..............", "..............",
        "..............", "..............",
    ],
    "robotics_bay": [                  # quadcopter drone — Swarm Deployment
        "..............", ".eeee....eeee.", "..ee......ee..", "...e......e...",
        "...eeeeeeee...", "....ewwwwe....", "....ewwwwe....", "...eeeeeeee...",
        "...e......e...", "..ee......ee..", ".eeee....eeee.", "..............",
        "..............", "..............",
    ],
    "embedded_systems_lab": [          # chip with pins — Diagnostic Sweep
        "..e..e..e..e..", "..e..e..e..e..", ".eeeeeeeeeee..", ".ewwwwwwwwwe..",
        ".ew.......we..", ".ew.eeeee.we..", ".ew.e...e.we..", ".ew.eeeee.we..",
        ".ew.......we..", ".ewwwwwwwwwe..", ".eeeeeeeeeee..", "..e..e..e..e..",
        "..e..e..e..e..", "..............",
    ],
    "ai_incubator": [                  # three-node model — Predictive Model Strike
        "......ee......", ".....ewwe.....", ".....ewwe.....", "......ee......",
        ".....e..e.....", "....e....e....", "...e......e...", "..e........e..",
        ".eeee....eeee.", "ewwwwe..ewwwwe", ".eeee....eeee.", "..............",
        "..............", "..............",
    ],
    # ── BioCore ──
    "greenhouse": [                    # sprout in bloom — Bloom Surge
        "......ee......", ".....ewwe.....", "....ewwwwe....", ".....ewwe.....",
        "......ee......", "..ee..ee..ee..", ".ewwe.ee.ewwe.", "ewwweeeeewwwwe",
        ".ewwe.ee.ewwe.", "..ee..ee..ee..", "......ee......", "......ee......",
        ".....eeee.....", "..............",
    ],
    "wet_lab": [                       # assay tube + droplet — Assay Cascade
        "..ee......ee..", "..ee......ee..", "..ee......ee..", "..ee..ee..ee..",
        "..ew..ee..we..", "..ew..ee..we..", "..ew.ewwe.we..", "..ew.ewwe.we..",
        "..ewwewwewwe..", "..eewwwwwwee..", "...eeeeeeee...", ".....eeee.....",
        "..............", "..............",
    ],
    "genetics_sequencing_lab": [       # DNA helix — Genome Unravel
        ".ee........ee.", "..ee......ee..", "...ee....ee...", "....eewwee....",
        ".....eeee.....", "....eewwee....", "...ee....ee...", "..ee......ee..",
        ".ee........ee.", "..ee......ee..", "...ee....ee...", "....eewwee....",
        ".....eeee.....", "..............",
    ],
    "behavioral_observation_room": [   # observing eye — Observed Collapse
        "..............", "....eeeeee....", "..ee......ee..", ".e..eeeeee..e.",
        "e..ewwwwwwe..e", "e.ewwweewwwe.e", "e.eww.ee.wwe.e", "e.ewwweewwwe.e",
        "e..ewwwwwwe..e", ".e..eeeeee..e.", "..ee......ee..", "....eeeeee....",
        "..............", "..............",
    ],
    "bioinformatics_suite": [          # pipeline chevrons — Pipeline Overrun
        "..............", ".ee..ee..ee...", ".eee..eee..eee", "..eee..eee..ee",
        "...eee..eee..e", "....eww..eww..", "...eee..eee..e", "..eee..eee..ee",
        ".eee..eee..eee", ".ee..ee..ee...", "..............", "..............",
        "..............", "..............",
    ],
    # ── ChemWorks ──
    "fume_hood_bench": [               # beaker + splash — Reagent Splash
        "..e........e..", "...e..ee..e...", "....e....e....", "..eeeeeeeeee..",
        "...e......e...", "...e......e...", "...e......e...", "...ewwwwwwe...",
        "...ewwwwwwe...", "...ewwwwwwe...", "....eeeeee....", "..............",
        "..............", "..............",
    ],
    "crystallography_room": [          # shattering crystal — Lattice Shatter
        "......ee......", ".....ewwe.....", "....ewwwwe....", "...ewweewwe...",
        "..ewwe..ewwe..", ".ewwe....ewwe.", "eeee......eeee", ".ewwe....ewwe.",
        "..ewwe..ewwe..", "...ewweewwe...", "....ewwwwe....", ".....ewwe.....",
        "......ee......", "..............",
    ],
    "polymer_workshop": [              # polymer chain — Polymer Seize
        "..............", "..............", ".eee.eee.eee..", "e...e...e...e.",
        "e.w.e.w.e.w.e.", "e...e...e...e.", ".eee.eee.eee..", "..e...e...e...",
        ".eee.eee.eee..", "e...e...e...e.", "e.w.e.w.e.w.e.", "e...e...e...e.",
        ".eee.eee.eee..", "..............",
    ],
    "computational_chemistry_hub": [   # molecule detonating — Simulated Detonation
        "..ee......ee..", ".ewwe....ewwe.", ".ewwe....ewwe.", "..ee.e..e.ee..",
        "....ee..ee....", ".....eeee.....", "....eewwee....", "...eewwwwee...",
        "....eewwee....", ".....eeee.....", "....ee..ee....", "..ee.e..e.ee..",
        ".ewwe....ewwe.", "..ee......ee..",
    ],
    "cleanroom_synthesizer": [         # purge nozzle + spray — Reagent Purge
        ".....eeee.....", ".....ewwe.....", ".....ewwe.....", "....eeeeee....",
        "....ewwwwe....", "....eeeeee....", ".....e..e.....", "..e...ee...e..",
        ".e...e..e...e.", "e...e....e...e", "....e....e....", "..e...ee...e..",
        "..............", "..............",
    ],
    # ── TerraBase ──
    "sampling_station": [              # strata core tube — Core Sample
        "...eeeeeeee...", "...ewwwwwwe...", "...eeeeeeee...", "...ewwwwwwe...",
        "...eeeeeeee...", "...ew....we...", "...eeeeeeee...", "...ewwwwwwe...",
        "...eeeeeeee...", "...ew....we...", "...eeeeeeee...", "....eeeeee....",
        ".....eeee.....", "......ee......",
    ],
    "hydrology_bay": [                 # flood channel — Flood Channel
        "..............", "..............", ".ee..eee..eee.", "e..ee...ee...e",
        "..............", ".ee..eee..eee.", "e..ee...ee...e", "..............",
        ".ww..www..www.", "w..ww...ww...w", "..............", ".ee..eee..eee.",
        "e..ee...ee...e", "..............",
    ],
    "remote_sensing_hub": [            # satellite — Orbital Survey Strike
        "eee.......eee.", "ewe...ee..ewe.", "ewe..ewwe.ewe.", "eee..ewwe.eee.",
        "..e...ee...e..", "..eeeeeeeeee..", "......ee......", ".....eeee.....",
        "....ee..ee....", "...ee....ee...", "..ee......ee..", ".ee........ee.",
        "..............", "..............",
    ],
    "deep_earth_observatory": [        # offset fault — Tectonic Fracture
        "eeeeeee.......", "wwwwwwe.......", "eeeeeee.......", "......ee......",
        "......eeeeeeee", "......ewwwwwww", "......eeeeeeee", ".....ee.......",
        "eeeeee........", "wwwwwe........", "eeeeee........", "..............",
        "..............", "..............",
    ],
    "climate_modeling_station": [      # forecast cloud — Forecast Cascade
        "..............", "....eeeeee....", "..eewwwwwwee..", ".ewwwwwwwwwwe.",
        ".ewwwwwwwwwwe.", "..eeeeeeeeee..", "..e..e..e..e..", "..e..e..e..e..",
        ".e..e..e..e...", ".e..e..e..e...", "e..e..e..e....", "e..e..e..e....",
        "..............", "..............",
    ],
    # ── MindFrame ──
    "interview_room": [                # question bubble — Leading Question
        "..eeeeeeeeee..", ".ewwwwwwwwwwe.", "ew..eeeeee..we", "ew.ee....ee.we",
        "ew.......ee.we", "ew......ee..we", "ew.....ee...we", "ew.....ee...we",
        "ew..........we", "ew.....ee...we", ".ewwwwwwwwwwe.", "..eeeeeeeeee..",
        "...ee.........", "..ee..........",
    ],
    "eye_tracking_suite": [            # reticle — Focus Lock
        "......ee......", "......ee......", "..eeeeeeeeee..", ".e..........e.",
        ".e...eeee...e.", "ee..ee..ee..ee", "ee.ee.ww.ee.ee", "ee.ee.ww.ee.ee",
        "ee..ee..ee..ee", ".e...eeee...e.", ".e..........e.", "..eeeeeeeeee..",
        "......ee......", "......ee......",
    ],
    "longitudinal_study_wing": [       # declining series — Attrition Study
        "e.............", "e...ee........", "e...ee........", "e...ee..ee....",
        "e...ee..ee....", "e...ee..ee..ee", "e...ee..ee..ee", "e.ee..ee..ee..",
        "e.ee..ee..ee..", "e.ee..ee..ee..", "e.ee..ee..ee..", "e.ee..ee..ee..",
        "eeeeeeeeeeeeee", "..............",
    ],
    "data_visualization_studio": [     # rising insight chart — Insight Burst
        "..........ww..", "e........ewwe.", "e.........ww..", "e......ee.....",
        "e......ee.....", "e..ee..ee..ee.", "e..ee..ee..ee.", "e..ee..ee..ee.",
        "e..ee..ee..ee.", "e..ee..ee..ee.", "e..ee..ee..ee.", "e..ee..ee..ee.",
        "eeeeeeeeeeeeee", "..............",
    ],
    "computational_social_science_lab": [  # branching cascade — Cascade Model
        "......ee......", "......ee......", "..eeeeeeeeee..", "..ee......ee..",
        "..ee......ee..", "eeeeee..eeeeee", "ee..ee..ee..ee", "ee..ee..ee..ee",
        "..............", "..............", "..............", "..............",
        "..............", "..............",
    ],
    # ── Axiom ──
    "chalkboard_room": [               # boxed QED — Chalk Proof
        "..............", "..eeee..eeee..", "..e..e..e..e..", "..eeee..eeee..",
        "..............", ".eeeeeeeeeeee.", ".e..........e.", ".e.ww.ee.ww.e.",
        ".e..w.ee..w.e.", ".e..........e.", ".eeeeeeeeeeee.", "..............",
        "..............", "..............",
    ],
    "mathematical_modeling_suite": [   # extrapolated curve — Extrapolate
        "e............w", "e...........w.", "e..........w..", "e.........e...",
        "e........e....", "e.......e.....", "e......e......", "e.....e.......",
        "e....e........", "e..ee.........", "e.ee..........", "eee...........",
        "eeeeeeeeeeeeee", "..............",
    ],
    "theoretical_physics_annex": [     # unified orbits — Grand Unification
        "...eeeeeeee...", "..e........e..", ".e..eeeeee..e.", "e..e......e..e",
        "e.e...ee...e.e", "e.e..ewwe..e.e", "e.e..ewwe..e.e", "e.e...ee...e.e",
        "e..e......e..e", ".e..eeeeee..e.", "..e........e..", "...eeeeeeee...",
        "..............", "..............",
    ],
    "quantum_simulation_lab": [        # collapsing superposition — Superposition Collapse
        "..............", "..ee......ee..", ".e..e....e..e.", "e....e..e....e",
        "e....e..e....e", ".e..e....e..e.", "..ee..ee..ee..", "......ee......",
        "..ee..ee..ee..", ".e..e.ww.e..e.", "e....ewwe....e", "e....e..e....e",
        ".e..e....e..e.", "..ee......ee..",
    ],
    "cosmology_visualization_theater": [   # redshift lens — Redshift Lens
        "....eeeeee....", "..ee......ee..", ".e..........e.", "e....eeee....e",
        "e...e....e...e", "e..e..ee..e..e", "e..e.ewwe.e..e", "e..e.ewwe.e..e",
        "e..e..ee..e..e", "e...e....e...e", "e....eeee....e", ".e..........e.",
        "..ee......ee..", "....eeeeee....",
    ],
}


def stamp(base: Canvas, emblem: list[str]) -> Canvas:
    """Stamp a 14×14 emblem centred on the aura, as a BRIGHT glyph on a dark plate.

    The obvious construction — dark glyph on the bright core, haloed for contrast —
    does not survive 14px: a 1px halo dilates every stroke by a pixel in all
    directions, the negative space between strokes closes up, and a reticle or a
    DNA helix collapses into one black blob. Punching a dark plate first and
    drawing the glyph in the light ramp keeps 1px counters open, which is what
    makes these legible at icon size.
    """
    ox = oy = (ICON - EMB) // 2
    r = EMB / 2 - 0.5
    for y in range(EMB):                     # rounded dark backing plate
        for x in range(EMB):
            if math.hypot(x - r, y - r) <= r + 0.7:
                base.set(ox + x, oy + y, "K")
    for y, row in enumerate(emblem):         # glyph in the light ramp, no dilation
        for x, ch in enumerate(row):
            if ch == "e":
                base.set(ox + x, oy + y, "L")
            elif ch == "w":
                base.set(ox + x, oy + y, "W")
    return base


# ── Cast FX ──────────────────────────────────────────────────────────────────
# Stills the app scales/fades with CSS. `blast` and `linger` are 2:1 so they lie
# flat on the isometric ground; `impact` is a screen-space flash.

def fx_blast() -> Canvas:
    """Expanding ground shockwave — one ring on the 2:1 plane."""
    c = Canvas(64, 32)
    for y in range(32):
        for x in range(64):
            dx, dy = (x - 31.5) / 30.0, (y - 15.5) / 15.0
            r = math.hypot(dx, dy)
            if 0.74 <= r <= 1.0:
                t = (r - 0.74) / 0.26
                c.set(x, y, "W" if t < 0.25 else "L" if t < 0.6 else "M")
    _outline(c)
    return c


def fx_impact() -> Canvas:
    """Point-of-impact flash — brief, bright, screen-space."""
    c = Canvas(32, 32)
    for y in range(32):
        for x in range(32):
            dx, dy = x - IC, y - IC
            r = math.hypot(dx, dy)
            if r < 0.5:
                c.set(x, y, "W")
                continue
            a = math.atan2(dy, dx)
            reach = 4.0 + 11.0 * abs(math.cos(2 * a)) ** 2.2
            if r <= reach:
                _ramp(c, x, y, min(1.0, r / reach))
    _outline(c)
    return c


def fx_linger() -> Canvas:
    """Settling cloud that sits on the ground for a lingering spell's duration."""
    c = Canvas(64, 32)
    for y in range(32):
        for x in range(64):
            dx, dy = (x - 31.5) / 29.0, (y - 18.0) / 11.0
            r = math.hypot(dx, dy)
            if r <= 1.0:
                # lumpy edge so it reads as vapour, not a solid ellipse
                lump = 0.86 + 0.14 * math.sin(math.atan2(dy, dx) * 5.0)
                if r <= lump:
                    c.set(x, y, "M" if r > 0.62 else "L" if r > 0.3 else "W")
    _outline(c)
    return c


FX = {"blast": fx_blast, "impact": fx_impact, "linger": fx_linger}


# ── Build ────────────────────────────────────────────────────────────────────

def emit(name: str, canvas: Canvas, ptype: str, subdir: str):
    used = {ch for row in canvas.rows() for ch in row if ch != "."}
    palette = {k: v for k, v in TYPE_PALETTES[ptype].items() if k in used}
    spec = {"width": canvas.w, "height": canvas.h, "palette": palette, "rows": canvas.rows()}
    os.makedirs(SRC_DIR, exist_ok=True)
    json.dump(spec, open(os.path.join(SRC_DIR, f"{name}.json"), "w"), indent=0)
    out_dir = os.path.join(SPRITES_DIR, subdir)
    os.makedirs(out_dir, exist_ok=True)
    render(spec).save(os.path.join(out_dir, f"{name}.png"))
    return spec


def read_catalog():
    """Signature entries straight out of apps/web/lib/pvp/spell-catalog.ts, so
    the shape rule lives in exactly one place and the pipeline cannot drift from
    what the app renders."""
    ts = os.path.join(ROOT, "apps", "web", "lib", "pvp", "spell-catalog.ts")
    entries = re.findall(
        r"buildingKey: '([^']+)'.*?type: '([^']+)'.*?shape: '([^']+)', icon: '([^']+)'",
        open(ts).read(),
    )
    if not entries:
        raise SystemExit("could not parse spell-catalog.ts")
    return entries


def main():

    built = 0
    for ptype in TYPE_PALETTES:
        for shape_name, fn in SHAPES.items():
            emit(f"{shape_name}_{ptype}", fn(), ptype, "spells")
            built += 1
        for fx_name, fx_fn in FX.items():
            emit(f"{fx_name}_{ptype}", fx_fn(), ptype, "fx")
            built += 1

    for key, ptype, shape_name, icon in read_catalog():
        if not icon.startswith("sig_"):
            continue
        emblem = EMBLEMS.get(key)
        if emblem is None:
            raise SystemExit(f"no emblem authored for signature building {key!r}")
        if len(emblem) != EMB or any(len(r) != EMB for r in emblem):
            raise SystemExit(
                f"emblem {key!r} must be {EMB}x{EMB}, got {len(emblem)}x"
                f"{sorted({len(r) for r in emblem})}"
            )
        bad = {ch for r in emblem for ch in r} - {".", "e", "w"}
        if bad:
            raise SystemExit(f"emblem {key!r} uses chars outside .ew: {sorted(bad)}")
        emit(icon, stamp(SHAPES[shape_name](), emblem), ptype, "spells")
        built += 1

    print(f"spellfx: built {built} sprites -> sprites/spells + sprites/fx")


if __name__ == "__main__":
    main()
