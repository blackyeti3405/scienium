#!/usr/bin/env python3
"""
Creative gateway builder — SCIENCE FAIR.  _t5 SPECTACULAR mode.

A bold, maxed-out "clearance-5" reinterpretation (NOT a copy of the mockup): a festive
EXHIBITION PAVILION crowned by a floating, glowing holographic PRIZE TROPHY. The
undisputed hero is a teal holo-trophy projected above the roof on a light beam — a
glowing cup with curved handles, a winner's star on its bowl, a pedestal base — ringed
by ORBITING orange prize-ribbon rings (with an award rosette riding one) and showered in
W confetti sparkles.

Below, the show hall is a real PAVILION with a PEAKED / GABLED tent roof (NOT the old
flat-top box): two folded striped tent-slopes meet at a raised front ridge that climbs
to a bright apex, festival PENNANT BUNTING is swagged down the peaked ridge, and an open
glowing MARQUEE spills teal light across the front corner under a lit orange awning
valance studded with bulbs. The rooftop emitter now springs from the tent apex so the
beam rises cleanly into the hologram.

Palette: ONLY the 13 canonical chars (K W L M D d / h c g G / o O r) so recolor.py works —
teal glass h/c/g/G for the hologram trophy + glow, orange o/O/r for ribbons/pennants/
marquee/beam accents, W confetti sparkles, L/M/D walls + tent, K outline (building only —
the hologram carries NO black so it reads as pure floating light).

Composed entirely from isobuild primitives + hand-placed detail. Emits the char grid to
art/src/science_fair_creative_generic.json (recolor.py reads it), renders the native PNG
to apps/web/public/sprites/gateways/science_fair_creative.png and an x8 inspection
preview to art/preview/science_fair_creative.png.

Run:  art/.venv/bin/python3 art/gateways/creative_science_fair.py
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
from isobuild import Box
from render_pixel_art import render

ROOT = os.path.dirname(ART_DIR)
SRC_DIR = os.path.join(ART_DIR, "src")
PREVIEW_DIR = os.path.join(ART_DIR, "preview")
GATE_DIR = os.path.join(ROOT, "apps", "web", "public", "sprites", "gateways")

KEY = "science_fair_creative"
SIZE = 64

# trophy anchor: the cup mouth centre floats above the roof (UNCHANGED — hologram is kept)
TCX = 32          # trophy centre x
RIM_TOP = 5       # y of the cup's mouth rim
BASE_BOT = 25     # y of the bottom of the pedestal base (beam target)

# bloom-halo geometry — shared by the trophy's teal glow AND the ribbon clamp, so no
# orange ribbon pixel is ever painted into the teal halo band (that scatter was the
# round-2 "noise" note). One tight elliptical band hugging the bowl, à la operations_hub.
BOWL_CY = RIM_TOP + 4     # vertical centre of the cup bowl / halo / ribbon orbit
HALO_XC = 0.82            # x-compression of the elliptical bloom
HALO_IN = 7.0             # inner radius (hugs the widest bowl)
HALO_OUT = 8.8            # outer radius


def halo_d(cx, cy, x, y):
    """Elliptical distance into the bloom halo (x compressed). Used by BOTH the glow
    ring and the ribbon clamp so they agree pixel-for-pixel and orange never speckles
    the teal light."""
    return math.hypot((x - cx) * HALO_XC, (y - cy))


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


def confetti(c: Canvas, x, y, ch):
    """A single 1px festival confetti fleck (colour chosen by the caller)."""
    c.set(round(x), round(y), ch)


def dither_line(c: Canvas, a, b, ch, parity=0):
    """A translucent (every-other-pixel) line — reads as a faint rising stream."""
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


# ── HERO piece 1: teal light-cone rising from the rooftop projector ───────────
def light_cone(c: Canvas, ex, ey, tx, ty, wbot, wtop):
    """A projected cone of light: narrow (wbot) at the emitter (ex,ey), widening to
    (wtop) at the trophy (tx,ty). Dithered teal so it reads as translucent light, with
    a brighter core column. Drawn BEFORE the trophy so the trophy caps it."""
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


# ── HERO piece 2: ONE clean orbiting prize-ribbon ring (orange), split front/back ─
def ribbon_ring(c: Canvas, cx, cy, rx, ry, tilt, part, hi_at=None, rosette_at=None):
    """A SINGLE tilted elliptical prize-ribbon ring around the trophy — one continuous
    orbit (operations_hub's single-ring legibility, not a scratchy double tangle). `part`
    = 'back' (far arc, drawn before the trophy) or 'front' (near arc, drawn after). Any
    pixel that would land in the teal bloom band is CLAMPED away, so the halo stays pure
    floating light and the ribbon reads as a clean orbit, never orange speckle in the
    glow. `hi_at` brightens the forward sweep to `O`; `rosette_at` hangs an award
    rosette (medal + ribbon tails)."""
    for a in range(0, 360, 2):
        ang = rad(a)
        ex, ey = rx * math.cos(ang), ry * math.sin(ang)
        x = cx + ex * math.cos(tilt) - ey * math.sin(tilt)
        y = cy + ex * math.sin(tilt) + ey * math.cos(tilt)
        # clamp: never lay ribbon inside the teal bloom band (kills the halo speckle)
        if HALO_IN < halo_d(cx, cy, x, y) <= HALO_OUT:
            continue
        near = math.sin(ang) > 0  # lower arc is nearer
        if part == "back" and near:
            continue
        if part == "front" and not near:
            continue
        ch = "o"
        if hi_at is not None and abs(((a - hi_at + 180) % 360) - 180) < 30:
            ch = "O"
        c.set(x, y, ch)
    if rosette_at is not None:
        ang = rad(rosette_at)
        ex, ey = rx * math.cos(ang), ry * math.sin(ang)
        x = round(cx + ex * math.cos(tilt) - ey * math.sin(tilt))
        y = round(cy + ex * math.sin(tilt) + ey * math.cos(tilt))
        # award medallion: ONE compact, tidy disc riding the ribbon — a W star centre
        # ringed by O with a bright top pip and two SHORT straight tails (no splaying V,
        # which was reading as orange scatter). A single defined shape, not a smudge.
        c.set(x, y - 1, "O")                                  # medal top pip
        c.set(x - 1, y, "O"); c.set(x, y, "W"); c.set(x + 1, y, "O")   # rim + star centre
        c.set(x, y + 1, "o")                                  # medal underside
        c.set(x - 1, y + 2, "r"); c.set(x + 1, y + 2, "r")    # two short straight tails


# ── HERO piece 3: the holographic prize trophy ────────────────────────────────
def hologram_trophy(c: Canvas, cx, rim_top):
    """A glowing teal winner's trophy: a soft bloom halo, a radial-shaded cup (bright
    upper-left → dim lower-right), two curved handles, a winner's star on the bowl, a
    slender stem and a stepped pedestal base — the sprite's undisputed focus."""
    # cup-bowl profile: (dy from rim_top, half-width). Wide mouth tapering to the neck.
    bowl = [
        (0, 6.3), (1, 6.7), (2, 6.5), (3, 6.0), (4, 5.4), (5, 4.8),
        (6, 4.1), (7, 3.4), (8, 2.8), (9, 2.2), (10, 1.9),
    ]
    bowl_cy = rim_top + 4
    hx, hy = cx - 3.0, rim_top + 3.0   # highlight spot (upper-left of the bowl)

    def shade_at(x, y):
        d = math.hypot((x - hx) * 0.9, (y - hy)) / 12.5
        return "h" if d < 0.16 else "c" if d < 0.42 else "g" if d < 0.80 else "G"

    # ── soft bloom halo around the cup (dithered c) — the _t5 energy glow ──
    # (tight band; the ribbon ring is clamped OUT of this same band so no orange speckle)
    for yy in range(-10, 11):
        for xx in range(-12, 13):
            d = halo_d(0, 0, xx, yy)
            if HALO_IN < d <= HALO_OUT and (xx + yy) % 2 == 0 and xx >= -11:
                c.set(cx + xx, bowl_cy + yy, "c")

    # (handles are drawn LAST, after the orbiting rings — see trophy_handles — so each
    # reads as a distinct loop flanking the bowl rather than blending into its width)

    # ── cup bowl body (radial teal gradient) ──
    for dy, hw in bowl:
        y = rim_top + dy
        for x in range(round(cx - hw), round(cx + hw) + 1):
            c.set(x, y, shade_at(x, y))
    # bright mouth rim + a dim inner-cup shadow just below it (reads as a hollow cup)
    c.line((cx - 6.3, rim_top), (cx + 6.3, rim_top), "h")
    c.line((cx - 5.6, rim_top + 1), (cx + 5.6, rim_top + 1), "c")
    for x in range(round(cx - 4.6), round(cx + 4.6) + 1):
        c.set(x, rim_top + 2, "G")                              # hollow interior shade
    c.set(cx - 4, rim_top + 2, "g")
    c.set(cx + 4, rim_top + 2, "g")

    # ── winner's STAR emblem on the bowl (bold + framed so it lands instantly at 64px) ──
    sx, sy = cx, rim_top + 5
    # a soft darker-teal inset disc behind the star — one frame of contrast so the bright
    # star reads as an embossed medallion, NOT a hollow (g, not G, so it's a subtle inset
    # rather than a black hole against the c/g bowl fill)
    for dx in range(-2, 3):
        for dy in range(-2, 3):
            if abs(dx) + abs(dy) <= 2:
                c.set(sx + dx, sy + dy, "g")
    # bright 4-point star riding the disc: W core + thick W cross, h tips, c corner rays
    c.set(sx, sy, "W")
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        c.set(sx + dx, sy + dy, "W")
    for dx, dy in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
        c.set(sx + dx, sy + dy, "h")
    for dx, dy in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:
        c.set(sx + dx, sy + dy, "c")

    # ── slender STEM ──
    for y in range(rim_top + 11, rim_top + 14):
        for x in range(cx - 1, cx + 2):
            c.set(x, y, "g" if x < cx else "G")
        c.set(cx - 1, y, "c")

    # ── collar knob + stepped PEDESTAL base ──
    ped = [
        (rim_top + 14, 2.3), (rim_top + 15, 2.0),           # collar
        (rim_top + 16, 3.0), (rim_top + 17, 3.8),           # flaring pedestal
        (rim_top + 18, 4.6), (rim_top + 19, 5.4),           # base slab
        (rim_top + 20, 5.6),
    ]
    for y, hw in ped:
        for x in range(round(cx - hw), round(cx + hw) + 1):
            d = (x - cx) / max(1.0, hw)
            c.set(x, y, "c" if d < -0.45 else "g" if d < 0.35 else "G")
    # bright top lip of the base + a base-line highlight
    c.line((cx - 2.0, rim_top + 16), (cx + 2.0, rim_top + 16), "c")
    c.line((cx - 5.6, rim_top + 19), (cx + 5.6, rim_top + 19), "c")
    c.set(cx - 5.6, rim_top + 20, "G")
    c.set(cx + 5.6, rim_top + 20, "G")


# ── HERO piece 3b: the trophy's curved handles (drawn AFTER the orbiting rings) ─
def trophy_handles(c: Canvas, cx, rim_top):
    """The cup's two curved C-handles, painted LAST so each reads as a distinct loop
    flanking the (now narrower) bowl instead of merging into its silhouette where the
    orange ribbon rings cross. A bright `h` outer rim with a `W` apex glint pops the
    loop forward of the ring; the open side faces the cup so the inner ends tuck to the
    bowl edge like real handles."""
    hy = rim_top + 3.0                                          # lifted toward the rim
    def handle(hcx, arc, apex):
        # a slim 2px open C — only the half-circle facing AWAY from the cup is drawn, so
        # the loop sits just outside the bowl edge (open mouth toward the cup) and never
        # fills in like an eye socket
        for a in arc:
            ca, sa = math.cos(rad(a)), math.sin(rad(a))
            c.set(hcx + 3.2 * ca, hy + 3.0 * sa, "h")            # bright outer rim
            c.set(hcx + 2.1 * ca, hy + 2.0 * sa, "c")           # inner rim (2px thick)
        c.set(round(hcx + 3.2 * math.cos(rad(apex))),
              round(hy + 3.0 * math.sin(rad(apex))), "W")       # apex glint
    handle(cx - 6.2, range(90, 271, 8), apex=180)               # left C, opens → cup
    handle(cx + 6.2, range(-90, 91, 8), apex=0)                 # right C, mirrored


# ── glowing teal exhibit window on a wall face ────────────────────────────────
def exhibit_window(c: Canvas, box: Box, face, u0, u1, v0, v1, bright=False):
    """A crisp glowing exhibit display: teal-glass fill with a bright top highlight line
    and a single W display blip. On the shaded (right) face use `bright` so it glows."""
    pt = box.left_pt if face == "left" else box.right_pt
    glass = "c" if bright else "g"
    c.fill_poly([pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)], glass)
    c.line(pt(u0, v0 + 1), pt(u1, v0 + 1), "h")                # bright top highlight
    c.line(pt(u0, v1 - 0.6), pt(u1, v1 - 0.6), "G")            # shaded sill
    c.set(*pt((u0 + u1) / 2, (v0 + v1) / 2), "W")              # display blip
    for a, b in [(pt(u0, v0), pt(u1, v0)), (pt(u0, v1), pt(u1, v1)),
                 (pt(u0, v0), pt(u0, v1)), (pt(u1, v0), pt(u1, v1))]:
        c.line(a, b, "K")                                     # crisp 1px bezel


# ── open lit MARQUEE across the pavilion's front corner + bulb valance ─────────
def corner_marquee(c: Canvas, box: Box):
    """A grand OPEN marquee entrance spilling teal light across the two front faces at
    the pavilion's near corner, crowned by an orange awning VALANCE studded with W
    light-bulbs — the fair's welcome. Straddling the corner (both faces meet at x≈32)
    reads as a wide open show-hall mouth rather than a single flat door."""
    lp, rp = box.left_pt, box.right_pt
    vTop, vBot = 2.2, 7.2
    # ── the open glowing interior (teal), one half on each front face ──
    c.fill_poly([lp(0.52, vTop), lp(0.98, vTop), lp(0.98, vBot), lp(0.52, vBot)], "c")
    c.fill_poly([rp(0.02, vTop), rp(0.48, vTop), rp(0.48, vBot), rp(0.02, vBot)], "c")
    # brighter light spilling out near the top
    c.fill_poly([lp(0.52, vTop), lp(0.98, vTop), lp(0.98, vTop + 1.5), lp(0.52, vTop + 1.5)], "h")
    c.fill_poly([rp(0.02, vTop), rp(0.48, vTop), rp(0.48, vTop + 1.5), rp(0.02, vTop + 1.5)], "h")
    # the open corner itself glows white-hot (light pouring from inside)
    c.line(lp(0.98, vTop + 0.2), lp(0.98, vBot - 0.2), "W")
    c.set(*lp(0.72, 4.6), "W"); c.set(*rp(0.28, 4.6), "W")     # display blips inside
    # crisp K frame: outer jambs + thresholds
    c.line(lp(0.52, vTop), lp(0.52, vBot), "K")               # left jamb
    c.line(rp(0.48, vTop), rp(0.48, vBot), "K")               # right jamb
    c.line(lp(0.52, vBot), lp(0.98, vBot), "K")               # left threshold
    c.line(rp(0.02, vBot), rp(0.48, vBot), "K")               # right threshold
    # ── awning VALANCE: an orange band above the mouth, W bulbs, shaded hem ──
    for pt, uA, uB in ((lp, 0.50, 1.0), (rp, 0.0, 0.50)):
        c.fill_poly([pt(uA, 0.4), pt(uB, 0.4), pt(uB, 1.9), pt(uA, 1.9)], "o")
        c.line(pt(uA, 0.4), pt(uB, 0.4), "O")                 # lit top edge
        c.line(pt(uA, 1.9), pt(uB, 1.9), "r")                 # shaded hem
        for i in range(3):
            c.set(*pt(uA + (uB - uA) * (i + 0.5) / 3, 1.1), "W")   # bulbs


# ── festival PENNANT bunting ───────────────────────────────────────────────────
def pennant(c: Canvas, x, y, fill, glint):
    """A crisp K-outlined pennant triangle hanging point-down from the bunting string
    at (x, y): a 5px-wide top tapering over 3 rows to a point, `fill`ed orange with a
    `glint` highlight at its top-centre and a clean `K` outline so each flag reads as a
    distinct little triangle (not an orange smudge) even on the light roof."""
    x, y = round(x), round(y)
    # top row (widest): K ends, orange body, bright glint at centre
    c.set(x - 2, y, "K"); c.set(x - 1, y, fill); c.set(x, y, glint)
    c.set(x + 1, y, fill); c.set(x + 2, y, "K")
    # middle row: K sides, orange centre
    c.set(x - 1, y + 1, "K"); c.set(x, y + 1, fill); c.set(x + 1, y + 1, "K")
    # apex
    c.set(x, y + 2, "K")


def bunting(c: Canvas, p0, p1, n, droop):
    """A swag of ALTERNATING orange pennants (bright `O` / mid `o`) strung on a sagging
    `K` string from p0→p1 — the festival garland draped across the pavilion."""
    cols = [("O", "W"), ("o", "W")]     # alternating bright / mid orange, W glint
    prev = None
    pts = []
    for i in range(n + 1):
        t = i / n
        x = p0[0] + (p1[0] - p0[0]) * t
        y = p0[1] + (p1[1] - p0[1]) * t + droop * math.sin(math.pi * t)
        pts.append((x, y))
        if prev is not None:
            c.line(prev, (x, y), "K")   # the string
        prev = (x, y)
    for i in range(n):                  # a pennant hanging at each segment
        mx = (pts[i][0] + pts[i + 1][0]) / 2
        my = (pts[i][1] + pts[i + 1][1]) / 2 + 0.8
        fill, glint = cols[i % len(cols)]
        pennant(c, mx, my, fill, glint)


def ridge_bunting(c: Canvas, apex, left, right, n=3):
    """The blueprint signature: festival PENNANT bunting swagged down the two PEAKED
    ridge lines of the tent — from the bright apex down to each side eave corner — so
    little flags dangle along the roof crest and frame the peak."""
    bunting(c, apex, left, n=n, droop=1.6)
    bunting(c, apex, right, n=n, droop=1.6)


# ── pennant flag-pole tucked on a back roof slope ─────────────────────────────
def flag_pole(c: Canvas, base, height, wave=1):
    """A slim pole with a footed base and a triangular fair-flag waving to one side."""
    x, by = round(base[0]), round(base[1])
    ty = by - height
    # footed base plate so it reads as bolted to the roof
    c.set(x - 1, by, "M"); c.set(x, by, "L"); c.set(x + 1, by, "D")
    c.set(x, by + 1, "K")
    c.line((x, by - 1), (x, ty), "K")            # slim mast
    c.set(x + 1, by - 1, "D")
    c.set(x, ty - 1, "O")                         # finial ball
    # a triangle flag streaming off the mast
    dirn = wave
    c.fill_poly([(x + dirn, ty), (x + dirn * 6, ty + 1), (x + dirn, ty + 4)], "o")
    c.line((x + dirn, ty), (x + dirn * 6, ty + 1), "O")   # lit top edge
    c.line((x + dirn, ty + 4), (x + dirn * 5, ty + 1), "r")  # shaded lower edge
    c.set(x + dirn * 3, ty + 2, "W")             # a tiny emblem pip


# ── THE PEAKED / GABLED TENT ROOF (fill_poly slopes) ──────────────────────────
def tent_roof(c: Canvas, box: Box, apex):
    """Replace the flat box lid with an unmistakable PEAKED big-top pavilion roof: two
    folded tent-slopes rising from the side eaves to a bright APEX, meeting at a raised
    front RIDGE that runs down the middle to the front corner. Each slope is broken into
    ALTERNATING CANVAS PANELS (radial stripes fanning out from the peak — the circus/
    fair-tent tell) so the form reads instantly as a striped tent, never a flat-top box
    or a faceted gem. A darker hem band sinks the lower slope for curved-canvas droop.
    (Festive colour is carried by the ridge bunting, drawn later, so the roof itself
    stays calm.) Drawn OVER the box's flat roof, which the two slopes fully occlude."""
    aT, aL, aR, aF = box.r_top, box.r_left, box.r_right, box.r_front  # eave corners
    ax, ay = apex

    def lerp(p, q, t):
        return (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)

    # base slope fills (solid ground the panels sit on: lit LEFT, shaded RIGHT)
    c.fill_poly([apex, aL, aF], "L")   # lit LEFT slope
    c.fill_poly([apex, aF, aR], "M")   # shaded RIGHT slope

    # ── radial CANVAS PANELS fanning from the peak (the big-top stripe tell) ──
    # walk the eave of each slope, splitting it into wedges [apex, e_i, e_{i+1}] painted
    # in an alternating light/dark pair. Left slope stays lit (bright L / mid M), right
    # slope shaded (mid M / dark D), so the tent keeps its left-bright / right-dark
    # lighting while the alternation reads as sewn canvas stripes radiating from the peak.
    # A tonal seam line rides each panel boundary (never black — black webbing read as
    # faceting) so the stripe edges stay crisp all the way down to the eave.
    N = 6
    for i in range(N):
        eL0, eL1 = lerp(aL, aF, i / N), lerp(aL, aF, (i + 1) / N)
        c.fill_poly([apex, eL0, eL1], "L" if i % 2 == 0 else "M")   # lit slope stripes
        eR0, eR1 = lerp(aF, aR, i / N), lerp(aF, aR, (i + 1) / N)
        c.fill_poly([apex, eR0, eR1], "M" if i % 2 == 0 else "D")   # shaded slope stripes
    # crisp tonal seams on the panel joins (bright edge into a dark stripe / dark edge
    # into a bright one) — defines every stripe without any harsh K webbing
    for i in range(1, N):
        c.line(apex, lerp(aL, aF, i / N), "M" if i % 2 else "L")    # lit-slope seam
        c.line(apex, lerp(aF, aR, i / N), "d" if i % 2 else "M")    # shaded-slope seam

    # raised front RIDGE crease (catches light) + a lit hip highlight down the left edge
    c.line(apex, aF, "W")
    c.line((ax - 1, ay + 1), (aL[0] + 2, aL[1] - 1), "W")
    # a bright apex CAP so the peak tip reads sharp above the converging panels
    c.set(ax, ay, "W"); c.set(ax, ay + 1, "h"); c.set(ax - 1, ay + 1, "L")
    # crisp silhouette: the two peaked ridge edges + the front eave V
    c.line(apex, aL, "K"); c.line(apex, aR, "K")
    c.line(aL, aF, "K"); c.line(aF, aR, "K")


def peak_emitter(c: Canvas, apex):
    """A tidy little emitter/finial seated on the tent APEX — an orange collar under a
    teal glow core — so the projector beam origin reads deliberate as it springs from
    the roof peak up into the hologram."""
    ax, ay = apex
    c.set(ax - 1, ay + 1, "o"); c.set(ax + 1, ay + 1, "r")     # orange collar
    c.set(ax, ay + 1, "O")
    c.set(ax, ay, "W")                                         # hot core at the peak
    c.set(ax, ay - 1, "h"); c.set(ax, ay - 2, "c")            # teal glow rising


# ── base flourish: fuller orange rim-piping + O corner bolts (family-grade weight) ─
def corner_bolt(c: Canvas, p, hot=False):
    """A small orange rivet/stud where the rim piping joins a corner: bright `O`
    centre, `o` lit side, `r` shaded side, optional `W` glint."""
    x, y = round(p[0]), round(p[1])
    c.set(x - 1, y, "o")
    c.set(x, y, "O")
    c.set(x + 1, y, "r")
    if hot:
        c.set(x, y - 1, "W")


def base_flourish(c: Canvas, box: Box):
    """Give the show hall equal weight to the hologram: fuller orange edge-piping
    wrapping the top rim plus `O` corner bolts studding the three top (eave) corners and
    three bottom (plinth) corners — echoing operations_hub's wrapped-edge richness."""
    lp, rp = box.left_pt, box.right_pt
    # bright top-edge highlight rib on both front eaves (just under the tent eave)
    c.line(lp(0.03, 0.5), lp(0.97, 0.5), "O")      # lit (left) rim highlight
    c.line(rp(0.03, 0.5), rp(0.97, 0.5), "o")      # shaded (right) rim
    # O corner bolts: three top corners (rim joins) + three bottom corners (plinth)
    for p in (box.r_left, box.r_front, box.r_right):
        corner_bolt(c, p, hot=True)
    for p in (box.w_left, box.w_front, box.w_right):
        corner_bolt(c, p)


def contact_shadow(c: Canvas):
    scx, scy, rx, ry = 32, 60, 24, 4
    for y in range(scy - ry, scy + ry + 1):
        for x in range(scx - rx, scx + rx + 1):
            if ((x - scx) / rx) ** 2 + ((y - scy) / ry) ** 2 <= 1.0:
                c.set(x, y, "K")


# ── assemble ──────────────────────────────────────────────────────────────────
def build() -> Canvas:
    c = Canvas(SIZE, SIZE)
    contact_shadow(c)

    # ── the EXHIBITION PAVILION ──
    # a lower, wider footprint so the tall PEAKED roof reads as the body's silhouette
    hall = Box(top=(32, 35), wx=9, wy=9, h=8)
    hall.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W")

    # orange eave piping along the front V + a shaded base plinth band
    c.line(hall.r_left, hall.r_front, "o")
    c.line(hall.r_front, hall.r_right, "r")
    c.line(hall.left_pt(0.0, hall.h - 1.4), hall.left_pt(1.0, hall.h - 1.4), "d")
    c.line(hall.right_pt(0.0, hall.h - 1.4), hall.right_pt(1.0, hall.h - 1.4), "K")

    # ── the PEAKED / GABLED tent roof (replaces the old flat lid) ──
    # apex raised 1px (review polish) so the peak reads sharper above the striped slopes
    apex = (32, 28)
    tent_roof(c, hall, apex)

    # fuller orange rim-piping + O corner bolts so the body carries hero-equal weight
    base_flourish(c, hall)

    # ── open lit MARQUEE across the front corner + flanking exhibit windows ──
    corner_marquee(c, hall)
    exhibit_window(c, hall, "left", 0.07, 0.40, 2.8, 6.4)
    exhibit_window(c, hall, "right", 0.60, 0.93, 2.6, 6.6, bright=True)

    # ── festival BUNTING swagged down the peaked ridge (blueprint signature) ──
    ridge_bunting(c, apex, hall.r_left, hall.r_right, n=3)

    # ── ROOFTOP EMITTER seated on the tent apex; the beam springs from here ──
    peak_emitter(c, apex)
    emit_top = (apex[0], apex[1] + 1)   # just under the crest so the cone reads clean

    # ONE small pennant FLAG-POLE tucked on the back-right roof slope (a festive accent,
    # clearly footed on the roof). Drawn before the beam/trophy so the hologram overlaps.
    flag_pole(c, (45, 41), height=6, wave=1)

    # ── DATA/LIGHT STREAMS rising from the roof peak into the trophy ──
    for sx0 in (28.0, 36.0):
        sp = (sx0, 31.0)
        top = (TCX + (sp[0] - TCX) * 0.4, BASE_BOT - 1)
        dither_line(c, sp, top, "c", parity=0)
        for f in (0.35, 0.65):
            c.set(sp[0] + (top[0] - sp[0]) * f, sp[1] + (top[1] - sp[1]) * f, "h")

    # ── THE HERO HOLOGRAM: projector beam → ribbon (back) → trophy → ribbon (front) ──
    light_cone(c, emit_top[0], emit_top[1], TCX, BASE_BOT, wbot=3, wtop=13)
    # firm beam CORE (review polish: a few solid h/c pixels down the centre column so the
    # peak-apex emitter reads clearly CONNECTED to the trophy pedestal, not airy/floating)
    for y in range(BASE_BOT, emit_top[1] + 1):
        c.set(TCX, y, "h" if y % 2 == 0 else "c")
        c.set(TCX - 1, y, "c")
    # ONE continuous elliptical prize-ribbon orbit, centred on the bowl and sized to ride
    # OUTSIDE the bloom halo at the sides (clamped clear of the teal band elsewhere).
    ribbon_ring(c, TCX, BOWL_CY, 13, 13 * 0.28, tilt=rad(-9), part="back")
    hologram_trophy(c, TCX, RIM_TOP)
    ribbon_ring(c, TCX, BOWL_CY, 13, 13 * 0.28, tilt=rad(-9), part="front", hi_at=90)
    # handles LAST so the ribbon can't swallow them into the bowl silhouette
    trophy_handles(c, TCX, RIM_TOP)

    # ── rising CONFETTI + sparkles around the hero ──
    conf = [
        (20, 6, "o"), (44, 5, "g"), (17, 12, "O"), (47, 11, "c"),
        (22, 2, "r"), (41, 2, "o"), (14, 8, "g"), (50, 8, "O"),
        (26, 21, "o"), (38, 21, "c"), (19, 18, "r"), (45, 18, "g"),
        (12, 15, "O"), (52, 16, "o"),
    ]
    for x, y, ch in conf:
        confetti(c, x, y, ch)
    spark(c, 15, 4, big=True)
    spark(c, 49, 14)
    spark(c, TCX + 1, RIM_TOP - 3)
    spark(c, 18, 22)
    spark(c, 47, 24)

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
    img.save(os.path.join(GATE_DIR, "science_fair_creative.png"))
    big = img.resize((SIZE * 8, SIZE * 8), Image.NEAREST)
    bg = Image.new("RGBA", big.size, (210, 210, 218, 255))
    bg.alpha_composite(big)
    bg.save(os.path.join(PREVIEW_DIR, "science_fair_creative.png"))
    print(f"built {KEY}: {GATE_DIR}/science_fair_creative.png")


if __name__ == "__main__":
    emit()
