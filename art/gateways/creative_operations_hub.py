#!/usr/bin/env python3
"""
Creative gateway builder — OPERATIONS HUB.  _t5 SPECTACULAR mode.

A bold, maxed-out "clearance-5" reinterpretation (NOT a copy of the mockup): a wide
holographic MISSION CONTROL. The undisputed hero is a floating, glowing RADAR GLOBE
projected above the roof — a teal wireframe sphere (lat/long grid) with a bright
sweeping radar beam, W blip sparkles, orbiting orange data rings + a satellite, and a
teal light-cone rising from a rooftop emitter. Streams of teal data rise into the globe.

The body is a WIDE, LOW HEXAGONAL COMMAND BUNKER (isobuild.poly_prism, 6-corner hex
footprint — distinctly hexagonal, wider than tall) with teal window slots ringing its
angled faces and orange trim, topped by a smaller raised HEXAGONAL CONTROL DECK on
top-centre from which the radar emitter/beam springs.

Palette: ONLY the 13 canonical chars (K W L M D d / h c g G / o O r) so recolor.py
works — teal glass h/c/g/G for the hologram + glow, orange o/O/r for rings/console/
beam accents, W sparkle blips, L/M/D walls.

Composed entirely from isobuild primitives + hand-placed detail. Emits the char grid
to art/src/operations_hub_creative_generic.json (recolor.py reads it), renders the
native PNG to apps/web/public/sprites/gateways/operations_hub_creative.png and an x8
inspection preview to art/preview/operations_hub_creative.png.

Run:  art/.venv/bin/python3 art/gateways/creative_operations_hub.py
"""
from __future__ import annotations

import json
import math
import os
import sys

# make the art/ package dir importable no matter the cwd
ART_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ART_DIR not in sys.path:
    sys.path.insert(0, ART_DIR)

from PIL import Image

from canon import CANON
from iso import Canvas
from isobuild import cylinder, poly_prism
from render_pixel_art import render

ROOT = os.path.dirname(ART_DIR)
SRC_DIR = os.path.join(ART_DIR, "src")
PREVIEW_DIR = os.path.join(ART_DIR, "preview")
GATE_DIR = os.path.join(ROOT, "apps", "web", "public", "sprites", "gateways")

KEY = "operations_hub_creative"
SIZE = 64

# hologram centre + radius (floats above the roof)
GX, GY, GR = 32, 13, 10


# ── small helpers ─────────────────────────────────────────────────────────────
def rad(a):
    return math.radians(a)


def spark(c: Canvas, x, y, big=False):
    """A bright 4-point sparkle: W core + soft teal arms."""
    x, y = round(x), round(y)
    c.set(x, y, "W")
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        c.set(x + dx, y + dy, "h")
    if big:
        for dx, dy in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
            c.set(x + dx, y + dy, "c")


def dither_line(c: Canvas, a, b, ch, parity=0):
    """A translucent (every-other-pixel) line — reads as a faint data stream."""
    x0, y0 = int(round(a[0])), int(round(a[1]))
    x1, y1 = int(round(b[0])), int(round(b[1]))
    dx, dy = abs(x1 - x0), abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy
    while True:
        if (x0 + y0) % 2 == parity:
            c.set(x0, y0, ch)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x0 += sx
        if e2 < dx:
            err += dx
            y0 += sy


# ── HERO piece 1: teal light-cone rising from the rooftop emitter ─────────────
def light_cone(c: Canvas, ex, ey, tx, ty, wbot, wtop):
    """A projected cone of light: narrow (wbot) at the emitter (ex,ey), widening to
    (wtop) at the globe (tx,ty). Dithered teal so it reads as translucent light, with
    a brighter core column. Drawn BEFORE the globe so the globe caps it."""
    span = int(round(ey - ty))
    if span <= 0:
        return
    for i in range(span + 1):
        t = i / span
        y = round(ey - i)
        cxp = ex + (tx - ex) * t
        half = (wbot + (wtop - wbot) * t) / 2.0
        x0 = int(round(cxp - half))
        x1 = int(round(cxp + half))
        for x in range(x0, x1 + 1):
            near_core = abs(x - cxp) <= 1.2
            if near_core:
                c.set(x, y, "c" if t > 0.35 else "h")
            elif (x + y) % 2 == 0:
                c.set(x, y, "g" if t < 0.6 else "c")


# ── HERO piece 2: orbiting data ring (orange), split front/back around globe ──
def orbit(c: Canvas, cx, cy, rx, ry, tilt, part, hi_at=None, sat_at=None):
    """A tilted elliptical orbit ring around the globe. `part` = 'back' (far arc,
    drawn before the globe) or 'front' (near arc, drawn after). `sat_at` places a
    bright satellite blip at that angle."""
    for a in range(0, 360, 2):
        ang = rad(a)
        ex, ey = rx * math.cos(ang), ry * math.sin(ang)
        x = cx + ex * math.cos(tilt) - ey * math.sin(tilt)
        y = cy + ex * math.sin(tilt) + ey * math.cos(tilt)
        near = math.sin(ang) > 0  # lower arc is nearer
        if part == "back" and near:
            continue
        if part == "front" and not near:
            continue
        ch = "o"
        if hi_at is not None and abs(((a - hi_at + 180) % 360) - 180) < 26:
            ch = "O"
        c.set(x, y, ch)
        # NOTE: kept a clean 1px ellipse — no front-arc thickening (was a puddle band)
    if sat_at is not None:
        ang = rad(sat_at)
        ex, ey = rx * math.cos(ang), ry * math.sin(ang)
        x = round(cx + ex * math.cos(tilt) - ey * math.sin(tilt))
        y = round(cy + ex * math.sin(tilt) + ey * math.cos(tilt))
        # a clearly-legible satellite: hot W core, O body, r underside, o solar-panel
        # wings, and a small c antenna blip on top
        c.set(x, y, "W")
        c.set(x - 1, y, "O")
        c.set(x + 1, y, "O")
        c.set(x, y + 1, "r")
        c.set(x - 2, y, "o")
        c.set(x + 2, y, "o")
        c.set(x, y - 1, "c")
        c.set(x, y - 2, "W")


# ── HERO piece 3: the holographic radar globe ─────────────────────────────────
def hologram_globe(c: Canvas, cx, cy, R):
    """A glowing teal radar sphere: a radial glow body (bright upper-left → dark
    lower-right), a crisp DARK-teal lat/long grid over it, a bright swept radar
    sector, blip sparkles, a hot core, and a soft bloom halo — the sprite's focus."""
    # soft bloom halo just outside the rim (dithered c) — the _t5 energy glow.
    # Skip the far-LEFT columns so the left silhouette reads a touch cleaner where
    # the glow used to feather into the sky (soft glow stays everywhere else).
    for yy in range(-R - 2, R + 3):
        for xx in range(-R - 2, R + 3):
            d2 = xx * xx + yy * yy
            if R * R < d2 <= (R + 2) * (R + 2) and (xx + yy) % 2 == 0 and xx >= -R:
                c.set(cx + xx, cy + yy, "c")

    # GLOWING ORB body: radial falloff from an upper-left highlight
    hx, hy = -0.42 * R, -0.42 * R
    for yy in range(-R, R + 1):
        for xx in range(-R, R + 1):
            if xx * xx + yy * yy > R * R:
                continue
            dl = math.hypot(xx - hx, yy - hy) / (1.9 * R)
            # widen the mid `g` band and shrink the darkest `G` rim so the sphere body
            # reads as a calm gradient rather than a marbled/lumpy planet
            ch = "h" if dl < 0.17 else "c" if dl < 0.5 else "g" if dl < 0.9 else "G"
            c.set(cx + xx, cy + yy, ch)

    # QUIET radar wireframe: just the equator, ONE upper parallel, and a few
    # meridians, drawn as clean CONTINUOUS teal `c` arcs (connected line segments).
    # NO per-pixel c↔G auto-contrast flip — that flip produced the salt-and-pepper
    # speckle that made this read as a marbled planet instead of a radar display.
    def grid_arc(cx0, cy0, hw, vh, a0=0, a1=360, step=8, ch="c"):
        prev = None
        a = a0
        while a <= a1 + 1e-6:
            p = (cx0 + hw * math.cos(rad(a)), cy0 + vh * math.sin(rad(a)))
            if prev is not None:
                c.line(prev, p, ch)
            prev = p
            a += step

    # parallels: equator + one upper parallel (flattened iso ellipses)
    for lat in (0.0, 0.45):
        hw = R * math.sqrt(max(0.0, 1 - lat * lat))
        yc = cy - lat * R
        grid_arc(cx, yc, hw, max(1.0, hw * 0.30))
    # meridians: a centre vertical + one tilted ellipse (a clean left+right pair)
    grid_arc(cx, cy, R * 0.58, R)
    c.line((cx, cy - R + 1), (cx, cy + R - 1), "c")

    # rim: clean continuous teal ring, lit upper-left, shaded lower-right (NO black)
    for a in range(0, 360):
        c.set(cx + R * math.cos(rad(a)), cy + R * math.sin(rad(a)), "g")
    for a in range(150, 246, 2):
        c.set(cx + R * math.cos(rad(a)), cy + R * math.sin(rad(a)), "h")
    for a in range(-20, 70, 2):
        c.set(cx + R * math.cos(rad(a)), cy + R * math.sin(rad(a)), "G")

    # SWEPT radar beam — a WIDE bright wedge from the hot core out to the rim, drawn
    # OVER the (now quiet) grid + rim so the active sweep is unmistakably the hero
    # gesture, not lost in interior texture. Broad `h` sector, a hot `W` beam-front
    # hugging the leading edge, a soft `c` trailing edge, and a `W` rim "ping". Points
    # up / up-right across the c/g body where the bright wedge contrasts cleanly.
    sa0, sa1 = -104, -34                        # ~70° fan (was a narrow ~38° wedge)
    rp0 = (cx + R * math.cos(rad(sa0)), cy + R * math.sin(rad(sa0)))
    rp1 = (cx + R * math.cos(rad(sa1)), cy + R * math.sin(rad(sa1)))
    # graded sector: bright `h` at the leading edge fading to `c` toward the trailing
    # edge — reads as a rotating afterglow, not a static bright patch
    sam = (sa0 + sa1) / 2
    rpm = (cx + R * math.cos(rad(sam)), cy + R * math.sin(rad(sam)))
    c.fill_poly([(cx, cy), rp0, rp1], "h")     # bright swept sector
    c.fill_poly([(cx, cy), rp0, rpm], "c")     # dim the trailing half (afterglow)
    c.line((cx, cy), rp0, "g")                 # soft trailing edge
    # crisp bright beam-front along the LEADING edge (2px wide for legibility)
    c.line((cx, cy), rp1, "W")
    rp1b = (cx + R * math.cos(rad(sa1 - 4)), cy + R * math.sin(rad(sa1 - 4)))
    c.line((cx, cy), rp1b, "W")
    px1, py1 = round(rp1[0]), round(rp1[1])    # W "ping" capping the leading edge
    for dx, dy in [(0, 0), (0, -1), (1, 0)]:
        c.set(px1 + dx, py1 + dy, "W")
    c.set(px1, py1 + 1, "c")

    # hot core (radar origin) + a few clean single-pixel radar contacts, kept to the
    # LOWER hemisphere so they don't compete with the swept sector up top
    c.set(cx, cy, "W")
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        c.set(cx + dx, cy + dy, "h")
    for bx, by in [(-5, 2), (4, 4), (-3, 5)]:
        c.set(cx + bx, cy + by, "W")


# ── hexagonal footprint (design-2: pointy front/back, vertical sides) ─────────
def hex_uv(S, T):
    """Six (u,v) corners of an elongated iso hexagon centred on unit (0,0): a pointy
    front + back with vertical left/right sides → a WIDE, LOW silhouette (never a box).
    Ordered clockwise around the perimeter for a clean single outline."""
    verts_st = [(0, -T), (S, -T / 2), (S, T / 2), (0, T), (-S, T / 2), (-S, -T / 2)]
    return [((s + t) / 2.0, (t - s) / 2.0) for s, t in verts_st]


# ── glowing teal window slot on an arbitrary (a→b, drop-down) wall face ────────
def wall_slot(c: Canvas, a, b, tc, halfw, v0, v1):
    """A single crisp teal control slot on a poly_prism wall face. `a,b` are the wall's
    top corners; `tc` is the centre parameter along a→b, `halfw` its half-width in t,
    `v0..v1` the vertical span (px below the roofline). Clean 1px K bezel around a `g`
    teal-glass fill, a bright `c` top highlight, and one `W` scan blip — legible at
    64px, matching the gateway's teal-window language."""
    def wp(t, v):
        return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + v)
    t0, t1 = tc - halfw, tc + halfw
    c.fill_poly([wp(t0, v0), wp(t1, v0), wp(t1, v1), wp(t0, v1)], "g")   # teal glass
    c.line(wp(t0, v0 + 1), wp(t1, v0 + 1), "c")                         # top highlight
    c.set(*wp(tc, (v0 + v1) / 2), "W")                                  # scan blip
    for p, q in [(wp(t0, v0), wp(t1, v0)), (wp(t0, v1), wp(t1, v1)),
                 (wp(t0, v0), wp(t0, v1)), (wp(t1, v0), wp(t1, v1))]:
        c.line(p, q, "K")                                              # crisp bezel


def wall_line(c: Canvas, a, b, v, ch):
    """A trim line running along a wall face at depth `v` px below the roofline."""
    c.line((a[0], a[1] + v), (b[0], b[1] + v), ch)


# ── blip-tipped antenna mast (on a footed base plate) ─────────────────────────
def mast_foot(c: Canvas, x, by):
    """A small mounting plate so a mast reads as bolted down, not floating."""
    c.set(x - 1, by, "M")
    c.set(x, by, "L")
    c.set(x + 1, by, "M")
    c.set(x + 2, by, "D")
    c.set(x, by + 1, "K")
    c.set(x + 1, by + 1, "K")


def antenna(c: Canvas, base, top_y, blip="c"):
    x = round(base[0])
    by = round(base[1])
    ty = int(top_y)
    mast_foot(c, x, by)                         # mounted base plate
    c.line((x, by - 1), (x, ty), "K")           # slim 1px mast core
    c.line((x + 1, by - 1), (x + 1, ty + 2), "D")  # slim shaded side
    c.set(x, ty - 1, blip)
    c.set(x, ty - 2, "W")
    # a couple of rungs
    for yy in range(ty + 3, by - 1, 4):
        c.set(x - 1, yy, "K")
        c.set(x + 2, yy, "K")


def dish_antenna(c: Canvas, base):
    """A compact steerable DISH on a short footed post — a clear concave bowl facing
    up-left toward the sky: crisp full K rim, a mid-tone body that reads against the
    light sky (NOT a pale L blob), a lit upper-left inner face, deep lower-right shade
    for the concavity, and an orange feed arm with a teal feed blip at the focus."""
    x = round(base[0])
    by = round(base[1])
    ty = by - 4                                  # dish mount point on the post
    mast_foot(c, x, by)                          # mounted base plate
    c.line((x, by - 1), (x, ty), "K")            # short dark post
    c.set(x + 1, by - 2, "D")                    # post shade side
    dcx, dcy = x, ty - 1                          # dish centre (46, 36)

    # crisp diamond bowl. mid-tone `M` body gives it real contrast against the pale
    # sky/roof so it stops reading as a soft blob.
    top, right = (dcx, dcy - 4), (dcx + 5, dcy - 1)
    bot, left = (dcx, dcy + 2), (dcx - 5, dcy - 1)
    c.fill_poly([top, right, bot, left], "M")            # mid dish body
    # lit upper-left inner face (catches the sky) vs. deep lower-right shade → concave
    c.fill_poly([top, left, (dcx, dcy - 1)], "L")        # lit inner face
    c.set(dcx - 2, dcy - 2, "W")                         # bright catch-light
    c.set(dcx + 1, dcy, "D")                             # concave shadow
    c.set(dcx + 2, dcy - 1, "D")
    # crisp continuous K rim around the whole cup (all four edges, not just corners)
    for p, q in [(top, right), (right, bot), (bot, left), (left, top)]:
        c.line(p, q, "K")
    # feed arm reaching out of the cup toward the sky, teal blip at the focus
    c.set(dcx, dcy - 1, "o")                             # feed arm root
    c.set(dcx + 1, dcy - 3, "o")                         # feed arm
    c.set(dcx + 1, dcy - 4, "c")                         # teal feed blip at focus


def contact_shadow(c: Canvas):
    scx, scy, rx, ry = 32, 59, 24, 4
    for y in range(scy - ry, scy + ry + 1):
        for x in range(scx - rx, scx + rx + 1):
            if ((x - scx) / rx) ** 2 + ((y - scy) / ry) ** 2 <= 1.0:
                c.set(x, y, "K")


# ── assemble ──────────────────────────────────────────────────────────────────
def build() -> Canvas:
    c = Canvas(SIZE, SIZE)
    contact_shadow(c)

    # ── the WIDE, LOW HEXAGONAL COMMAND BUNKER ──
    # a 6-corner hex footprint (pointy front/back, vertical sides): 44px wide, 14px
    # deep, 9px walls → distinctly hexagonal + low-wide, NOT a square box.
    HB = 9                                  # bunker wall height
    hub = poly_prism(c, hex_uv(11, 7), top=(32, 39), h=HB,
                     roof="L", lwall="M", rwall="D", roof_hi="W")
    rpts = hub["top"]                       # roof corners: [backtip,bR,fR,ftip,fL,bL]
    # the two big angled front faces (lit front-left, shaded front-right) meet at the
    # front tip; the vertical sides are silhouette-only. Grab them for glazing/trim.
    ftip, fL, fR = rpts[3], rpts[4], rpts[2]

    # orange eave trim along the two front rooflines + a warm ridge on the back
    c.line(ftip, fL, "o")                    # lit front-left eave
    c.line(fR, ftip, "r")                    # shaded front-right eave
    c.line(rpts[0], rpts[1], "o")            # warm back ridge (right)
    c.line(rpts[5], rpts[0], "o")            # warm back ridge (left)

    # roof panel seams (subtle) fanning from the front tip toward the back corners →
    # riveted-deck density instead of one flat quad
    for f in (0.28, 0.5, 0.72):
        bx = rpts[1][0] + (rpts[5][0] - rpts[1][0]) * f
        by = rpts[1][1] + (rpts[5][1] - rpts[1][1]) * f
        c.line((32, 44), (bx, by), "M")
    # short teal service light strip on the back roof shoulder
    c.set(*(rpts[0][0] - 3, rpts[0][1] + 3), "o")
    c.set(*(rpts[0][0] + 3, rpts[0][1] + 3), "o")

    # BANK of teal window slots ringing the two angled faces + an orange lamp row
    for tc in (0.24, 0.5, 0.76):            # lit front-left face
        wall_slot(c, ftip, fL, tc, 0.085, 2.3, 6.6)
    for tc in (0.24, 0.5, 0.76):            # shaded front-right face (glows on dark)
        wall_slot(c, fR, ftip, tc, 0.085, 2.3, 6.6)
    # a single deliberate row of orange console lamps under the lit-face slots
    for i in range(6):
        t = 0.12 + 0.76 * i / 5
        c.set(*(ftip[0] + (fL[0] - ftip[0]) * t, ftip[1] + (fL[1] - ftip[1]) * t + 7.6), "O")
    # base plinth band along both front faces
    wall_line(c, ftip, fL, HB - 1.2, "d")
    wall_line(c, fR, ftip, HB - 1.2, "K")

    # ── SMALLER RAISED HEXAGONAL CONTROL DECK on top-centre ──
    # a mini hex platform (22..42px) lifted 5px above the roof; the radar emitter +
    # beam spring from ITS centre.
    DH = 5
    deck = poly_prism(c, hex_uv(5, 3.2), top=(32, 34), h=DH,
                      roof="M", lwall="D", rwall="d", roof_hi="L")
    dpts = deck["top"]
    c.line(dpts[3], dpts[4], "o")           # orange rim on the deck front edges
    c.line(dpts[2], dpts[3], "r")
    # a thin teal readout band around the deck's lit front-left face
    wall_line(c, dpts[3], dpts[4], DH - 2.0, "g")

    # a footed antenna mast (left roof) + a compact DISH (right roof) framing the deck
    antenna(c, (18, 37), top_y=30, blip="o")
    dish_antenna(c, (46, 41))

    # ── ROOFTOP EMITTER on the deck centre: squat drum + orange rim + hot teal core ──
    ecx, ecy = 32, 31                        # drum top-ellipse centre, on deck top
    cylinder(c, ecx, ecy, 5, 3, top="M", side_l="M", side_r="D")
    for a in range(0, 360, 8):               # orange emitter rim ring
        c.set(ecx + 5 * math.cos(rad(a)), ecy + 2.5 * math.sin(rad(a)), "o")
    c.fill_poly([(ecx - 3, ecy - 1), (ecx + 3, ecy - 1), (ecx + 2, ecy + 1), (ecx - 2, ecy + 1)], "c")
    c.set(ecx, ecy, "W")                     # hot core spark
    emit_top = (ecx, ecy - 2)                # (32, 29) — beam base, re-seated on the deck

    # ── DATA STREAMS rising from the deck-flanking roof into the globe ──
    for sp in [(24, 42), (40, 42)]:
        top = (GX + (sp[0] - GX) * 0.35, GY + GR - 1)
        dither_line(c, sp, top, "c", parity=0)
        for f in (0.25, 0.5, 0.75):
            tx = sp[0] + (top[0] - sp[0]) * f
            ty = sp[1] + (top[1] - sp[1]) * f
            c.set(tx, ty, "h")

    # ── THE HERO HOLOGRAM ──
    # TWO orbiting data rings at DIFFERENT tilts (blueprint: rings, plural). Each is a
    # clean 1px ellipse split into a back arc (behind the sphere, for depth) + a front
    # arc. The outer ring is thinner/flatter at an opposite tilt so the two clearly
    # cross, and a bright satellite rides it on the right where it clears the globe.
    light_cone(c, emit_top[0], emit_top[1], GX, GY + GR - 1, wbot=3, wtop=2 * GR - 4)
    orbit(c, GX, GY, GR + 3, (GR + 3) * 0.34, tilt=rad(-14), part="back")
    orbit(c, GX, GY, GR + 6, (GR + 6) * 0.16, tilt=rad(22), part="back")
    hologram_globe(c, GX, GY, GR)
    orbit(c, GX, GY, GR + 3, (GR + 3) * 0.34, tilt=rad(-14), part="front", hi_at=120)
    orbit(c, GX, GY, GR + 6, (GR + 6) * 0.16, tilt=rad(22), part="front",
          hi_at=300, sat_at=16)

    # floating sparkles around the hologram (right side is carried by the satellite)
    spark(c, GX - GR - 4, GY - 2, big=True)
    spark(c, GX + 2, GY - GR - 3)
    spark(c, GX - GR + 1, GY + GR + 2)

    return c


# ── emit: source JSON (recolor.py reads it) + PNG + x8 preview ────────────────
def emit() -> None:
    c = build()
    spec = {"width": SIZE, "height": SIZE, "palette": CANON, "rows": c.rows()}
    os.makedirs(SRC_DIR, exist_ok=True)
    os.makedirs(GATE_DIR, exist_ok=True)
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    with open(os.path.join(SRC_DIR, f"{KEY}_generic.json"), "w") as fh:
        json.dump(spec, fh, indent=0)

    img = render(spec)
    img.save(os.path.join(GATE_DIR, "operations_hub_creative.png"))
    big = img.resize((SIZE * 8, SIZE * 8), Image.NEAREST)
    bg = Image.new("RGBA", big.size, (210, 210, 218, 255))
    bg.alpha_composite(big)
    bg.save(os.path.join(PREVIEW_DIR, "operations_hub_creative.png"))
    print(f"built {KEY}: {GATE_DIR}/operations_hub_creative.png")


if __name__ == "__main__":
    emit()
