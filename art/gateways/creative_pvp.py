#!/usr/bin/env python3
"""
Creative gateway builder — PvP / BATTLE ARENA.  _t5 SPECTACULAR mode.

A bold, maxed-out "clearance-5" reinterpretation (NOT a copy of the mockup): a ROUND
TIERED holographic BATTLE COLISEUM. The undisputed hero is a floating, glowing
CROSSED-SWORDS combat emblem projected above the roof — two full teal `G/h` blades
crossed in a true X (saltire) over a glowing `g` champion SHIELD: two pointed tips fan
UP-and-out, two orange hilts (crossguard + grip + pommel) splay DOWN-and-out, and a
white-hot CLASH burst marks the cross point, with a projector beam rising from the arena
pit. The body below is now a CIRCULAR amphitheatre: two concentric stepped drums
(a wide bottom drum + a narrower drum stacked on it) carrying a glowing arcade of teal
ARCHES and orange banner trim, whose top steps DOWN through concentric rings to a sunken
central arena PIT where the emitter/beam springs. Twin tournament FLAGS on the outer ring
and rising spark particles complete it.

North star: the four sibling creatives — same recipe: a bespoke iso body + a spectacular
FLOATING HOLOGRAM hero + a projector beam + rising sparkle particles + orange/teal accents
+ a grounded drop shadow. Each has a DISTINCT body silhouette (Discovery = dome, Literature
Review = tall gallery); PvP is now the ROUND stepped coliseum. Read them first:
  art/preview/discovery_creative.png, research_plan_creative.png,
  art/preview/operations_hub_creative.png, literature_review_creative.png.

Palette: ONLY the 13 canonical chars (K W L M D d / h c g G / o O r) so recolor.py works —
teal glass h/c/g/G for the blades + shield + glow + arches, orange o/O/r for hilts/banners/
flags/beam accents, W spark bursts, L/M/D/d drums, K outline (solid body only; the emblem
carries no black so it reads as pure floating light).

Composed from isobuild primitives (stacked cylinders) + hand-placed light. Emits the char
grid to art/src/pvp_creative_generic.json (recolor.py reads it), renders the native PNG to
apps/web/public/sprites/gateways/pvp_creative.png and an x8 inspection preview to
art/preview/pvp_creative.png.

Draw order (painter's, back->front / low-energy->high-energy):
  contact shadow -> wide base drum + its arch arcade + banner -> narrower upper drum + its
  arcade + banner -> stepped arena bowl + emitter dais -> twin tournament flags ->
  projector beam -> rising spark particles -> backing crest -> crossed-swords emblem (hero)
  -> clash burst -> sparkles + halo.

Run:  art/.venv/bin/python3 art/gateways/creative_pvp.py
"""
from __future__ import annotations

import json
import math
import os
import random
import sys

# make the art/ package dir importable no matter the cwd
ART_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ART_DIR not in sys.path:
    sys.path.insert(0, ART_DIR)

from PIL import Image

from canon import CANON
from iso import Canvas
from isobuild import cylinder
from render_pixel_art import render

ROOT = os.path.dirname(ART_DIR)
SRC_DIR = os.path.join(ART_DIR, "src")
PREVIEW_DIR = os.path.join(ART_DIR, "preview")
GATE_DIR = os.path.join(ROOT, "apps", "web", "public", "sprites", "gateways")

KEY = "pvp_creative"
SIZE = 64

# ── emblem geometry (floats above the roof) ────────────────────────────────────
EX, EY = 32, 15           # emblem centre = the blades' cross / clash point (t=0.5 on each sword)
HW = 10                   # emblem horizontal half-extent (tips & pommels sit ±HW from centre)
HH = 10                   # emblem vertical half-extent; equal to HW -> the swords sit on the
                          #   square's diagonals: a clean ~90° saltire that opens into four gaps

# ── coliseum geometry (the round tiered body) ──────────────────────────────────
CX = 32                   # shared vertical axis (drums + emitter + beam all centred here)
T1_TOP, R1, RY1, H1 = 44, 21, 8, 9    # wide BASE drum: top-ellipse cy, radii, wall height
T2_TOP, R2, RY2, H2 = 37, 14, 6, 7    # narrower UPPER drum stacked on it (bottom rests at cy=44)
ARENA_TOP = T2_TOP        # centre-y of the upper drum's top ellipse = the arena floor plane


# ── small helpers ──────────────────────────────────────────────────────────────
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


def contact_shadow(c: Canvas):
    scx, scy, rx, ry = 32, 60, 25, 3
    for y in range(scy - ry, scy + ry + 1):
        for x in range(scx - rx, scx + rx + 1):
            if ((x - scx) / rx) ** 2 + ((y - scy) / ry) ** 2 <= 1.0:
                c.set(x, y, "K")


def fill_ellipse(c: Canvas, cx, cy, rx, ry, ch):
    """A solid filled iso ellipse (2:1-ish) — the concentric arena terraces + dais rings."""
    ry = max(0.5, ry)
    for yy in range(-int(math.ceil(ry)), int(math.ceil(ry)) + 1):
        t = 1 - (yy / ry) ** 2
        if t < 0:
            continue
        half = rx * (t ** 0.5)
        for xx in range(-int(round(half)), int(round(half)) + 1):
            c.set(cx + xx, cy + yy, ch)


def ell_arc(c: Canvas, cx, cy, rx, ry, ch, a0, a1, step=3):
    """A continuous elliptical arc (banner rings, lit back rims). Angles in degrees;
    a in [0,180] traces the FRONT (near, lower) rim, [180,360] the BACK (upper) rim."""
    prev = None
    a = a0
    while a <= a1:
        r = math.radians(a)
        p = (cx + rx * math.cos(r), cy + ry * math.sin(r))
        if prev is not None:
            c.line(prev, p, ch)
        prev = p
        a += step


# ── HERO piece: the projector beam (arena pit -> emblem underside) ─────────────
def light_beam(c: Canvas, ex, ey, tx, ty, wbot, wtop):
    """A projected cone of light: narrow (wbot) at the emitter (ex,ey), widening to
    (wtop) at the emblem underside (tx,ty). Dithered teal so it reads as translucent light,
    with a brighter core column. Drawn BEFORE the emblem so the emblem caps it."""
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
            near_core = abs(x - cxp) <= 1.8          # widened core: the mid-corridor cone
            if near_core:                            #   no longer thins to a single pixel
                c.set(x, y, "c" if t > 0.35 else "h")
            elif (x + y) % 2 == 0:
                c.set(x, y, "g" if t < 0.6 else "c")


# ── HERO piece: rising spark particles streaming up into the emblem ────────────
def spark_updraft(c: Canvas, x0, x1, y_lo, y_hi, n=90):
    """A swirling column of glowing motes streaming up off the arena pit into the
    emblem — biased toward the roof SOURCE so it packs tight + wide low down and thins
    as it climbs, with a gentle sinusoidal swirl. Mostly W/c single pixels + a few h
    flecks. y_lo = near emblem (top), y_hi = near roof (bottom)."""
    rng = random.Random(731)
    cxc = (x0 + x1) / 2.0
    for _ in range(n):
        t = rng.random() ** 0.5                       # biased toward 1 = the roof source
        y = y_lo + (y_hi - y_lo) * t
        spread = 2.0 + 6.0 * t                        # funnel: wide at the pit, tight up top
        swirl = 2.2 * math.sin(y * 0.7 + t * 3.0)
        x = cxc + swirl + rng.uniform(-spread, spread)
        rr = rng.random()
        ch = "W" if rr < 0.5 else ("c" if rr < 0.82 else "h")
        c.set(x, y, ch)
        if rng.random() < 0.10:                       # a few tiny + sparkles among the motes
            c.set(x - 1, y, "c")
            c.set(x + 1, y, "c")


# ── HERO: the floating crossed-swords combat emblem ────────────────────────────
def champion_shield(c: Canvas, cx, cy):
    """A SMALL glowing heater CREST/BOSS sitting BEHIND the sword crossing (drawn first, so the
    bright X reads cleanly on top of it). Deliberately compact and centred on/just-below the
    crossing so it anchors the emblem as a combat badge WITHOUT filling the open V between the
    two upper blades (that is what fused them into a solid wedge before). Pure floating light
    like the sibling holograms: a soft `g` plate, a `G` shaded lower half, a soft `h` rim and a
    `c` glint — NO black outline."""
    hw = 4                                                    # compact half-width crest boss
    shield = [(cx - hw, cy - 3), (cx + hw, cy - 3), (cx + hw, cy + 1),
              (cx + hw - 1, cy + 3), (cx, cy + 6), (cx - hw + 1, cy + 3), (cx - hw, cy + 1)]
    c.fill_poly(shield, "g")                                  # soft teal plate (no dark cup)
    lower = [(cx - hw + 1, cy + 1), (cx + hw - 1, cy + 1),
             (cx + hw - 1, cy + 3), (cx, cy + 6), (cx - hw + 1, cy + 3)]
    c.fill_poly(lower, "G")                                   # shaded lower half
    c.line((cx - hw + 1, cy - 3), (cx + hw - 1, cy - 3), "h")  # soft glass rim (no K outline)
    c.set(cx - hw + 1, cy - 1, "c")                           # single soft glint (pure light)


def sword(c: Canvas, pommel, tip, lit):
    """One FULL sword from `pommel` (lower-out corner) to `tip` (upper-out corner). The sword is
    MOSTLY a long continuous teal BLADE — it is what forms the X — capped by a small white-hot
    pointed TIP and, at the lower-out corner only, a COMPACT orange hilt (short crossguard bar +
    a short solid grip + a round pommel knob) so it reads as a weapon, not a spike. `lit`=+1/-1
    picks which edge takes the bright `h` glass highlight. Both swords cross at their midpoints
    (t=0.5) so the two long blades overlap in a clean saltire."""
    px0, py0 = pommel
    tx, ty = tip
    axx, axy = tx - px0, ty - py0                  # axis pommel -> tip
    al = math.hypot(axx, axy) or 1.0
    ex, ey = -axy / al, axx / al                   # unit perpendicular (across the blade)

    def P(t):
        return (px0 + axx * t, py0 + axy * t)

    # ── the long teal BLADE: base just above the hilt (t=0.20) up to the tip (t=1.0),
    #    crossing the OTHER blade at the centre (t=0.5) ──
    gb = P(0.20)                                   # blade base (sits on the crossguard)
    sh = P(0.20 + 0.80 * 0.82)                     # start of the point taper (82% up the blade)
    hw = 1.5                                        # blade half-width (~3px band)
    body = [(gb[0] + ex * hw, gb[1] + ey * hw),
            (sh[0] + ex * hw * 0.8, sh[1] + ey * hw * 0.8),
            (tx, ty),
            (sh[0] - ex * hw * 0.8, sh[1] - ey * hw * 0.8),
            (gb[0] - ex * hw, gb[1] - ey * hw)]
    c.fill_poly(body, "G")                                           # solid dark-teal body
    c.line((gb[0] + ex * lit, gb[1] + ey * lit), (tx, ty), "h")     # bright glass lit edge (full)
    c.line((gb[0] - ex * lit, gb[1] - ey * lit), (tx, ty), "D")     # dark separator edge (full)
    for f in (0.34, 0.66, 0.84):                                    # W glints up the blade
        p = P(f)                                                    #   (skip the t=0.5 crossing)
        c.set(round(p[0]), round(p[1]), "W")
    pre = P(0.94)
    c.set(round(pre[0]), round(pre[1]), "h")                        # hot pre-tip
    c.set(round(tx), round(ty), "W")                               # white-hot point

    # ── compact orange HILT at the lower-out corner: crossguard bar + short grip + pommel ──
    gc = P(0.18)                                                    # crossguard, just above grip
    Lg = 3.0
    for s in (-0.5, 0.5):                                          # two strokes -> a 2px-thick bar
        b = P(0.18 + s / al)
        c.line((round(b[0] - ex * Lg), round(b[1] - ey * Lg)),
               (round(b[0] + ex * Lg), round(b[1] + ey * Lg)), "o")
    c.set(round(gc[0] - ex * Lg), round(gc[1] - ey * Lg), "O")     # bright quillon tips
    c.set(round(gc[0] + ex * Lg), round(gc[1] + ey * Lg), "O")
    g0, g1 = P(0.06), P(0.155)                                     # short SOLID wrapped grip (2px)
    grip = [(g0[0] + ex, g0[1] + ey), (g1[0] + ex, g1[1] + ey),
            (g1[0] - ex, g1[1] - ey), (g0[0] - ex, g0[1] - ey)]
    c.fill_poly(grip, "r")
    c.set(round(g0[0]), round(g0[1]), "o")                         # grip highlight
    pmx, pmy = round(px0), round(py0)                              # round pommel knob at the corner
    c.set(pmx, pmy, "O")
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        c.set(pmx + dx, pmy + dy, "o")


def clash_burst(c: Canvas, cx, cy):
    """The white-hot CLASH where the two blades cross — a compact radiant star sitting on the
    cross point: a W plus-core, teal `c` glow along the blade diagonals, and soft `h` spark
    arms. Kept tight so the X crossing stays legible, not a blob."""
    c.set(cx, cy, "W")                                    # white-hot core
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:     # bright plus
        c.set(cx + dx, cy + dy, "W")
    for dx, dy in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:   # teal glow along the blade dirs
        c.set(cx + dx, cy + dy, "c")
    for dx, dy in [(-2, 0), (2, 0), (0, -2), (0, 2)]:     # soft outer spark arms
        c.set(cx + dx, cy + dy, "h")


def crossed_swords(c: Canvas):
    """The hero: two full swords crossed in a bold X (saltire). Each sword runs from its lower
    pommel corner up through the centre to its tip, so two pointed tips fan UP-and-out and two
    orange hilts splay DOWN-and-out around a clear crossing point — a white-hot clash burst
    marks the clash at the centre."""
    cx, cy = EX, EY
    # Extend the up-and-out blade TIPS a touch beyond ±HW/±HH so the saltire reads bolder and the
    # upper blades no longer look short/stubby against the longer lower orange hilts. Applied
    # symmetrically to both tips with HW==HH, so the two blades still intersect exactly at (cx,cy)
    # — the crossing + clash burst stay perfectly centred; only the lower hilts stay put.
    TIP_EXT = 3
    a_pommel, a_tip = (cx - HW, cy + HH), (cx + HW + TIP_EXT, cy - HH - TIP_EXT)   # "/" LL pommel -> UR tip
    b_pommel, b_tip = (cx + HW, cy + HH), (cx - HW - TIP_EXT, cy - HH - TIP_EXT)   # "\" LR pommel -> UL tip
    sword(c, a_pommel, a_tip, lit=-1)   # lit edge = upper-left
    sword(c, b_pommel, b_tip, lit=+1)   # lit edge = upper-right (drawn 2nd -> caps the crossing)
    clash_burst(c, cx, cy)


# ── the COLISEUM body: two stacked round drums with a glowing arch arcade ──────
def coliseum_arch(c: Canvas, cx, top_y, rx, ry, h, xc, aw, top_pad=0.0):
    """One glowing ARCHED opening on the CURVED front wall of a drum. `xc` is the arch centre
    column (relative to cx), `aw` its half-width in columns. The wall's near/front rim follows
    the lower arc of the top ellipse, so each arch is placed per-column against that curve — a
    teal glass field with a rounded arch cap, a bright reflection band, a hot centre glow, a
    shaded sill, a crisp K frame + arch, and a small orange keystone at the apex. Arches near
    the tangent edges foreshorten naturally, selling the round silhouette. `top_pad` nudges the
    arch caps DOWN a touch (used on the upper drum so the arcade doesn't crowd the arena
    parapet ring above it — 1px of breathing room)."""
    def wtop(xr):                                            # front-rim y of the wall at column xr
        t = 1 - (xr / rx) ** 2
        return top_y + ry * (t ** 0.5) if t > 0 else top_y

    x0, x1 = int(math.ceil(xc - aw)), int(math.floor(xc + aw))
    caps = {}
    for xr in range(x0, x1 + 1):
        if abs(xr) >= rx - 0.5:
            continue
        d = (xr - xc) / aw
        if abs(d) > 1.0:
            continue
        wt = wtop(xr)
        base = wt + h
        cf = math.sqrt(max(0.0, 1 - d * d))                 # 1 at arch centre, 0 at the jambs
        apex = wt + h * 0.30 + top_pad - (h * 0.26) * cf    # rounded cap: tall centre, short edge
        sill = base - 1.2
        yy0, yy1 = int(round(apex)), int(round(sill))
        caps[xr] = (yy0, yy1)
        for yy in range(yy0, yy1 + 1):                      # teal glass field
            c.set(cx + xr, yy, "g")
        if abs(d) < 0.34:                                   # hot glowing centre column
            for yy in range(yy0 + 1, yy1):
                c.set(cx + xr, yy, "c")
        c.set(cx + xr, int(round(wt + h * 0.52)), "h")      # bright reflection band
        c.set(cx + xr, yy1, "G")                            # shaded sill
    if not caps:
        return
    xs = sorted(caps)
    prev = None
    for xr in xs:                                           # crisp K arch cap across the top
        p = (cx + xr, caps[xr][0])
        if prev is not None:
            c.line(prev, p, "K")
        prev = p
    for xr in (xs[0], xs[-1]):                              # K jambs down the two outer columns
        c.line((cx + xr, caps[xr][0]), (cx + xr, caps[xr][1]), "K")
    c.line((cx + xs[0], caps[xs[0]][1]), (cx + xs[-1], caps[xs[-1]][1]), "K")   # K sill
    mid = xs[len(xs) // 2]                                  # orange keystone at the apex
    c.set(cx + mid, caps[mid][0] - 1, "o")
    c.set(cx + mid, caps[mid][0], "O")


def arch_arcade(c: Canvas, cx, top_y, rx, ry, h, centers, aw, top_pad=0.0):
    """A glowing colonnade of arches wrapping the drum's curved front — the coliseum arcade."""
    for xc in centers:
        coliseum_arch(c, cx, top_y, rx, ry, h, xc, aw, top_pad=top_pad)


def banner_trim(c: Canvas, cx, top_y, rx, ry):
    """Orange banner trim ringing a drum's front roofline: a bold `o` rim on the front top arc
    and a bright `O` band just under it (the tournament bunting)."""
    ell_arc(c, cx, top_y, rx - 0.5, ry, "o", 4, 176, 3)
    ell_arc(c, cx, top_y + 1.3, rx - 1.5, ry - 0.4, "O", 14, 166, 4)


def arena_bowl(c: Canvas, cx, ctop):
    """Turn the upper drum's flat top into a sunken ROUND amphitheatre: concentric elliptical
    terraces stepping DOWN (each lower + darker) to a central arena PIT, with lit back-rims so
    it reads as a clean bowl, an orange parapet ring, and a glowing emitter DAIS at the centre.
    Returns the pit-centre (x,y) the projector beam springs from."""
    fill_ellipse(c, cx, ctop, 12, 5, "L")                   # arena rim plane (lit, upper stands)
    fill_ellipse(c, cx, ctop + 1, 8, 3.6, "M")              # mid stands, one step down (darker)
    fill_ellipse(c, cx, ctop + 2, 5, 2.4, "d")              # sunken pit floor (dark)
    ell_arc(c, cx, ctop, 12, 5, "o", 186, 354, 4)           # orange parapet ring (back)
    ell_arc(c, cx, ctop + 1, 8, 3.6, "L", 190, 350, 4)      # lit back-rim of the mid step
    ell_arc(c, cx, ctop + 1, 8, 3.6, "d", 10, 170, 4)       # shaded front lip of the mid step
    ell_arc(c, cx, ctop + 2, 5, 2.4, "M", 190, 350, 5)      # lit back-rim of the pit
    # glowing emitter dais at the pit centre (stepped orange well -> white-hot core)
    pcy = ctop + 2
    fill_ellipse(c, cx, pcy, 3.0, 1.6, "r")
    fill_ellipse(c, cx, pcy - 1, 2.3, 1.3, "o")
    fill_ellipse(c, cx, pcy - 2, 1.5, 1.0, "O")
    c.set(cx, pcy - 3, "W")
    c.set(cx, pcy - 4, "W")
    return (cx, pcy - 4)


def tournament_flag(c: Canvas, base, ty, fly):
    """A tournament FLAG: a dark `d` pole on a small foot, with a crisp triangular orange
    pennant flying to one side (`fly` = +1 right / -1 left) and a bright `O` finial on top."""
    x = round(base[0])
    by = round(base[1])
    # mounting foot
    c.set(x - 1, by, "D")
    c.set(x + 1, by, "M")
    c.set(x, by + 1, "K")
    # pole
    c.line((x, by), (x, ty), "d")
    c.line((x + 1, by), (x + 1, ty + 2), "K")
    c.set(x, ty - 1, "O")                      # finial
    c.set(x, ty - 2, "W")
    # crisp triangular pennant: straight hoist + straight lit top edge, tapering to a clean point
    tipx = x + fly * 8
    c.fill_poly([(x + fly, ty + 1), (tipx, ty + 3), (x + fly, ty + 6)], "o")
    c.line((x + fly, ty + 1), (tipx, ty + 3), "O")     # lit upper edge
    c.line((tipx, ty + 3), (x + fly, ty + 6), "r")     # shaded lower edge
    c.line((x + fly, ty + 1), (x + fly, ty + 6), "r")  # hoist edge


# ── assemble ──────────────────────────────────────────────────────────────────
def build() -> Canvas:
    c = Canvas(SIZE, SIZE)
    contact_shadow(c)

    # ── wide BASE drum (the amphitheatre exterior) + its glowing arch arcade + banner ──
    cylinder(c, CX, T1_TOP, R1, H1, top="L", side_l="M", side_r="D", outline="K", ry=RY1)
    arch_arcade(c, CX, T1_TOP, R1, RY1, H1, centers=[-15, -9, -3, 3, 9, 15], aw=2.4)
    banner_trim(c, CX, T1_TOP, R1, RY1)

    # ── narrower UPPER drum stacked on it (second tier of arcades) + banner ──
    cylinder(c, CX, T2_TOP, R2, H2, top="L", side_l="M", side_r="D", outline="K", ry=RY2)
    arch_arcade(c, CX, T2_TOP, R2, RY2, H2, centers=[-10, -5, 0, 5, 10], aw=1.9, top_pad=1.0)
    banner_trim(c, CX, T2_TOP, R2, RY2)

    # ── stepped ROUND arena bowl + glowing emitter dais (returns the pit light source) ──
    pit = arena_bowl(c, CX, ARENA_TOP)

    # ── twin tournament FLAGS on the outer step ring (framing the emblem from the sides) ──
    tournament_flag(c, (CX - 16, 41), ty=30, fly=-1)   # left flag flies left
    tournament_flag(c, (CX + 16, 41), ty=30, fly=+1)   # right flag flies right

    # ── projector BEAM: pit dais -> emblem underside (a tight cone with a clear gap) ──
    light_beam(c, pit[0], pit[1], EX, EY + HH - 2, wbot=2, wtop=6)

    # ── rising spark particles streaming up into the emblem (sparse, funneled) ──
    spark_updraft(c, x0=EX - 4, x1=EX + 4, y_lo=EY + HH - 3, y_hi=pit[1] - 1, n=46)

    # ── THE HERO: a backing crest behind the crossing + the crossed-swords emblem (the X owns
    #    the mass; the crest just anchors it as a combat badge) ──
    champion_shield(c, EX, EY)
    crossed_swords(c)

    # ── discrete sparkle stars framing the emblem (the family's + / diamond motif — NO
    #    full ring, so the crossed swords own the focal point) ──
    spark(c, EX, EY - HH + 1, big=True)      # crown spark between the two rising tips
    spark(c, EX - HW - 4, EY - 1)            # left gap
    spark(c, EX + HW + 4, EY)                # right gap
    spark(c, EX - HW - 4, EY + HH - 1)       # lower-left outlier (near the hilt)
    spark(c, EX + HW + 4, EY - HH + 3)       # upper-right accent (asymmetry)

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
    img.save(os.path.join(GATE_DIR, "pvp_creative.png"))
    big = img.resize((SIZE * 8, SIZE * 8), Image.NEAREST)
    bg = Image.new("RGBA", big.size, (210, 210, 218, 255))
    bg.alpha_composite(big)
    bg.save(os.path.join(PREVIEW_DIR, "pvp_creative.png"))
    print(f"built {KEY}: {GATE_DIR}/pvp_creative.png")


if __name__ == "__main__":
    emit()
