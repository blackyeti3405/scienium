#!/usr/bin/env python3
"""
Bioinformatics Suite — BioCore economy building (BESPOKE form, the set's PREMIUM capstone).

The premium capstone of the green/teal/amber BioCore set. NOT the gateway cube, NOT
the greenhouse's gabled glasshouse, NOT the Volt AI-Incubator drum. It is a SLEEK
LOW GLASS PAVILION whose roof is a STEPPED ZIGGURAT OF PLANTED GREEN-ROOF TERRACES
climbing to a small glass atrium penthouse — the BioCore premium signature is the
living-roof setbacks (where Volt's premium was a polished steel drum, here it's
terraced gardens + the cleanest curtain wall in the set).

Massing (back -> front in painter's order, three stacked setback Boxes):
  * MAIN PAVILION: a wide low Box(top=(30,20), wx=15, wy=11, h=11) — one continuous
    premium glass curtain wall (c/h ribbon panes, crisp K mullions, bright h/W
    reflections, very clean) on a thin L/W plinth. The widest, lowest mass.
  * MID TERRACE: a setback Box(top=(31,12), wx=9, wy=7, h=5) sitting on the pavilion
    roof — its roof is a PLANTED GARDEN (M/D shrubbery + O blooms) and its edge is a
    green parapet; bright W rim glints = premium.
  * ATRIUM PENTHOUSE: a small setback Box(top=(33,6), wx=5, wy=4, h=6) on top — a
    little all-glass atrium with its own planted parapet; the genome-ring hovers
    above it.

  * OPENING SIDE = RIGHT. The hero is a tall premium LOBBY ATRIUM panel on the
    SHADED RIGHT face of the pavilion — a K-framed g/c curtain panel made to GLOW
    (bright h/O lit interior, an h reflection sweep, a K-framed glass door) so it
    reads on the shaded side. The lit LEFT face stays the cleaner, plainer curtain
    wall (fewer accents).

Signature (one-of-one): a large slowly-rotating HOLOGRAPHIC GENOME RING (a Circos
chromosome plot) hovers above the atrium — a flat 2:1 hover-ellipse band divided
into ~8 color-coded chromosome segments (alternating O/o/g/G/c with thin K ticks),
bright h rim glint UL + G shade LR, with 2-3 bright W/h/c CHORD ARCS leaping across
the open center linking distant segments (gene links) — one arc lit brightest with
an O blip travelling it (the optimization running) — a faint outer g tick-ring + O
index marker selling slow rotation, a soft c glow halo + h sparkles, fed by a thin
o/O projector beam from a roof emitter. No genome-ring / Circos / chord-diagram
motif exists anywhere else in the catalog (distinct from the genetics double-helix:
this is a FLAT rotating ring of bands with chord arcs).

Composed from art/isobuild.{Box} — NO iso.draw_cube / base_windows.
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

# Base BioCore palette (shared keys) + the four EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so bioinformatics-suite.png is
# unchanged). Lab-wide BioCore evolved accents (same keys+hexes as greenhouse.py):
#   b  deep mossy bark-green  — matured structure tone for t3+ new masses/frames
#   e  bioluminescent glow (mid)   E  bioluminescent glow (bright) — the t4/t5 life-glow
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
BIO = {"K": "#1a2417", "W": "#e8f2d8", "L": "#c4dba6", "M": "#9fc07e", "D": "#6f9456", "d": "#4a6e3a",
       "h": "#d2f7ec", "c": "#9fefcf", "g": "#36cc9e", "G": "#1d8f70",
       "o": "#f0b24d", "O": "#ffd488", "r": "#b9701e",
       "b": "#2f4a2a", "e": "#74f0b6", "E": "#ccffe4", "q": "#f3c63a"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def ellipse_ring(c, cx, cy, rx, ry, ch, step=4):
    for a in range(0, 360, step):
        x = cx + rx * math.cos(math.radians(a))
        y = cy + ry * math.sin(math.radians(a))
        c.set(x, y, ch)


# ── 1. MAIN PAVILION — a wide low premium glass-curtain hall on a plinth ──────
def pavilion(c):
    """The dominant mass: a wide, low Box (wx=15 wy=11 h=11) — distinctly broader and
    lower than the tall square gateway cube. Lit M left, shaded D right; we hand-paint
    a premium curtain wall over both faces afterward, so the .draw roof is left quiet
    (the mid terrace covers most of it; the exposed front-right rim becomes a planted
    parapet ledge)."""
    b = Box(top=(30, 25), wx=15, wy=11, h=11)
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    return b


def plinth(c, b):
    """A thin bright L/W plinth band at the base of both faces = a polished premium
    footing the glass wall sits on. Drawn before the glazing so the glass stops on it."""
    PL = 9.2                                   # plinth band top (of an 11px wall)
    c.fill_poly([b.left_pt(0.0, PL), b.left_pt(1.0, PL),
                 b.left_pt(1.0, 11.0), b.left_pt(0.0, 11.0)], "L")
    c.fill_poly([b.right_pt(0.0, PL), b.right_pt(1.0, PL),
                 b.right_pt(1.0, 11.0), b.right_pt(0.0, 11.0)], "D")
    # bright W cap line on the lit plinth top, d shade on the shaded side
    c.line(b.left_pt(0.0, PL), b.left_pt(1.0, PL), "W")
    c.line(b.right_pt(0.0, PL), b.right_pt(1.0, PL), "d")
    return PL


def curtain_wall(c, b, plinth_v):
    """The premium continuous glass curtain wall on BOTH faces above the plinth, in a
    crisp regular K-mullion grid. The LIT LEFT face is the CLEAN, plainer wall (calm c
    glass, one quiet h reflection). The RIGHT atrium glazing/door is cut in later, on
    top, and made to glow — so the hero opening reads on the RIGHT."""
    VT, VB = 1.4, plinth_v - 0.2               # glazing from just under the eave to the plinth
    # --- LEFT (lit) clean curtain wall: calm c glass, a single soft h reflection ---
    c.fill_poly([b.left_pt(0.02, VT), b.left_pt(0.98, VT),
                 b.left_pt(0.98, VB), b.left_pt(0.02, VB)], "c")
    # one quiet diagonal h reflection sweep across the upper-left panes (premium glint)
    c.fill_poly([b.left_pt(0.05, VT), b.left_pt(0.34, VT),
                 b.left_pt(0.50, VT + 2.4), b.left_pt(0.21, VT + 2.4)], "h")
    # --- RIGHT (shaded) base curtain wall: calmer g glass (atrium panel overlays) ---
    c.fill_poly([b.right_pt(0.02, VT), b.right_pt(0.98, VT),
                 b.right_pt(0.98, VB), b.right_pt(0.02, VB)], "g")
    c.fill_poly([b.right_pt(0.55, VT + 2.4), b.right_pt(0.98, VT + 2.4),
                 b.right_pt(0.98, VB), b.right_pt(0.55, VB)], "G")
    # --- crisp K mullion grid: verticals + one horizontal transom, both faces ---
    for u in [i * 0.1 for i in range(1, 10)]:
        c.line(b.left_pt(u, VT), b.left_pt(u, VB), "K")
        c.line(b.right_pt(u, VT), b.right_pt(u, VB), "K")
    tr = (VT + VB) / 2
    c.line(b.left_pt(0.02, tr), b.left_pt(0.98, tr), "K")
    c.line(b.right_pt(0.02, tr), b.right_pt(0.98, tr), "K")
    # crisp K frame around each curtain band + bright h eave glint on the lit top
    for pt in (b.left_pt, b.right_pt):
        c.line(pt(0.02, VT), pt(0.98, VT), "K")
        c.line(pt(0.02, VB), pt(0.98, VB), "K")
        c.line(pt(0.02, VT), pt(0.02, VB), "K")
        c.line(pt(0.98, VT), pt(0.98, VB), "K")
    c.line(b.left_pt(0.04, VT + 0.4), b.left_pt(0.96, VT + 0.4), "h")
    return VT, VB


def roof_parapet_garden(c, b):
    """The exposed front-right apron of the pavilion roof (the part the mid terrace does
    NOT cover) becomes a planted GREEN-ROOF DECK — a green garden bed with M/D foliage
    + O/o blooms, so the largest roof reads as a living roof (the BioCore premium
    signature), with a thin green parapet rim. The mid terrace then sits back-left on
    this planted deck."""
    # --- planted garden bed across the front-right roof apron (u: 0.30..1, v: 0..1) ---
    # (the back-left quadrant is covered by the mid terrace, so we plant the front-right)
    c.fill_poly([b.roof_pt(0.30, 0.0), b.roof_pt(1.0, 0.0),
                 b.roof_pt(1.0, 0.70), b.roof_pt(0.30, 0.70)], "D")
    # dappled foliage + warm blooms across the apron deck
    deck = [(0.45, 0.18, "M"), (0.62, 0.12, "L"), (0.80, 0.20, "M"), (0.92, 0.30, "D"),
            (0.50, 0.34, "M"), (0.68, 0.30, "L"), (0.84, 0.40, "M"), (0.40, 0.46, "M"),
            (0.58, 0.50, "L"), (0.74, 0.54, "D"), (0.90, 0.50, "M"), (0.52, 0.62, "M")]
    for u, v, ch in deck:
        p = b.roof_pt(u, v)
        px, py = int(round(p[0])), int(round(p[1]))
        c.set(px, py, ch); c.set(px + 1, py, "d")
    for j, (u, v) in enumerate(((0.50, 0.22), (0.72, 0.18), (0.86, 0.34),
                                 (0.46, 0.40), (0.64, 0.44), (0.80, 0.58))):
        p = b.roof_pt(u, v)
        px, py = int(round(p[0])), int(round(p[1]))
        c.set(px, py + 1, "d")
        c.set(px, py, "O" if j % 2 == 0 else "o")
    # front-right roof edges: r_front -> r_right (right edge) and r_left -> r_front
    # (left/front edge). A thin green parapet hedge just inboard of each.
    def plant_edge(p0, p1, n, inset):
        for i in range(n + 1):
            t = i / n
            e = lerp(p0, p1, t)
            # nudge inboard toward roof centre
            cx, cy = b.roof_pt(0.5, 0.5)
            gx = e[0] + (cx - e[0]) * inset
            gy = e[1] + (cy - e[1]) * inset
            gx, gy = int(round(gx)), int(round(gy))
            shrub = "M" if i % 2 == 0 else "D"
            c.set(gx, gy, shrub)
            if i % 3 == 0:
                c.set(gx, gy - 1, "O")          # bloom dot
            elif i % 3 == 1:
                c.set(gx, gy - 1, "M")
    plant_edge(b.r_front, b.r_right, 9, 0.10)   # right roof edge planter
    plant_edge(b.r_left, b.r_front, 9, 0.10)    # front-left roof edge planter


# ── 2. STEPPED GREEN-ROOF TERRACES — planted setbacks climbing to the atrium ──
def green_terrace(c, top, wx, wy, h, bloom_phase=0):
    """One setback terrace Box whose ROOF is a planted garden. Walls are a clean L/M/D
    glass-and-plinth band; the roof diamond is filled with M/D shrubbery + O blooms and
    rimmed by a green parapet with W premium glints. Returns the Box for stacking."""
    t = Box(top=top, wx=wx, wy=wy, h=h)
    # clean premium walls: lit L/M, shaded D, bright W back-edge glints
    t.draw(c, roof="d", lwall="M", rwall="D", roof_hi="W", outline="K")

    # --- a thin glass clerestory band on the upper walls (premium glazing) ---
    for pt, glass, shade in ((t.left_pt, "c", "h"), (t.right_pt, "g", "G")):
        c.fill_poly([pt(0.10, 1.0), pt(0.90, 1.0), pt(0.90, 2.6), pt(0.10, 2.6)], glass)
        c.line(pt(0.10, 1.0), pt(0.90, 1.0), "K")
        c.line(pt(0.10, 2.6), pt(0.90, 2.6), "K")
        for u in (0.30, 0.50, 0.70):
            c.line(pt(u, 1.0), pt(u, 2.6), "K")
    c.line(t.left_pt(0.12, 1.3), t.left_pt(0.50, 1.3), "h")   # quiet glint on lit band

    # --- PLANTED ROOF GARDEN: a living-roof bed with real value contrast so it reads
    # as foliage, not a flat slab. Base bed in mid-green D, then dappled lit M/L
    # foliage tops + dark d shadow gaps, then warm O/o blooms raised on a d shadow. ---
    c.fill_poly([t.r_top, t.r_left, t.r_front], "D")
    c.fill_poly([t.r_top, t.r_front, t.r_right], "d")
    # dappled foliage texture across the whole bed (checkered M/L lit / d shaded)
    foliage = [(0.26, 0.30, "M"), (0.40, 0.24, "L"), (0.55, 0.32, "M"),
               (0.68, 0.28, "D"), (0.30, 0.46, "L"), (0.46, 0.42, "M"),
               (0.60, 0.50, "D"), (0.74, 0.46, "M"), (0.36, 0.62, "M"),
               (0.52, 0.60, "L"), (0.66, 0.66, "D"), (0.44, 0.74, "M"),
               (0.58, 0.78, "M"), (0.30, 0.60, "d"), (0.50, 0.50, "L")]
    for u, v, ch in foliage:
        p = t.roof_pt(u, v)
        px, py = int(round(p[0])), int(round(p[1]))
        c.set(px, py, ch)
        c.set(px + 1, py, "d")           # a dark shadow gap = hedge depth
    # warm blooms raised on a dark shadow pixel so they pop off the green bed
    bloom = [(0.32, 0.34), (0.62, 0.38), (0.46, 0.64), (0.72, 0.60),
             (0.36, 0.74), (0.56, 0.26), (0.50, 0.52)]
    for j, (u, v) in enumerate(bloom):
        p = t.roof_pt(u, v)
        px, py = int(round(p[0])), int(round(p[1]))
        c.set(px, py + 1, "d")           # shadow under the bloom
        c.set(px, py, "O" if (j + bloom_phase) % 2 == 0 else "o")

    # --- GREEN PARAPET rim with W premium glints along the roof diamond edges ---
    for a, bb in [(t.r_top, t.r_left), (t.r_left, t.r_front),
                  (t.r_front, t.r_right), (t.r_right, t.r_top)]:
        c.line(a, bb, "G")
    c.line(t.r_top, t.r_left, "W")              # bright back-left rim glint (lit)
    c.line(t.r_top, t.r_right, "W")
    return t


def atrium_penthouse(c, top, wx, wy, h):
    """The small all-glass atrium penthouse capping the ziggurat. A clean glass box
    with a bright W/L flat cap + a thin planted parapet; the genome-ring hovers above
    its roof centre. Returns (box, roof-centre)."""
    a = Box(top=top, wx=wx, wy=wy, h=h)
    a.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # all-glass walls: bright c lit-left, g shaded-right, crisp K mullions
    for pt, glass in ((a.left_pt, "c"), (a.right_pt, "g")):
        c.fill_poly([pt(0.10, 0.9), pt(0.90, 0.9), pt(0.90, h - 0.6), pt(0.10, h - 0.6)], glass)
        for u in (0.10, 0.37, 0.63, 0.90):
            c.line(pt(u, 0.9), pt(u, h - 0.6), "K")
        c.line(pt(0.10, 0.9), pt(0.90, 0.9), "K")
        c.line(pt(0.10, h - 0.6), pt(0.90, h - 0.6), "K")
    c.line(a.left_pt(0.13, 1.2), a.left_pt(0.5, 1.2), "h")    # lit head glint
    # warm o atrium-interior glow pooling low in the lit glass (lights on inside)
    c.fill_poly([a.left_pt(0.14, h - 2.4), a.left_pt(0.86, h - 2.4),
                 a.left_pt(0.86, h - 0.8), a.left_pt(0.14, h - 0.8)], "o")
    # bright W/L flat cap: lit back-left lighter, K rim
    c.fill_poly([a.r_top, a.r_left, a.r_front], "W")
    c.fill_poly([a.r_top, a.r_front, a.r_right], "L")
    # thin planted parapet specks on the cap edges + W rim glint
    for u, v in ((0.5, 0.18), (0.30, 0.30), (0.70, 0.30)):
        p = a.roof_pt(u, v)
        c.set(int(round(p[0])), int(round(p[1])), "M")
    c.line(a.r_top, a.r_left, "W")
    c.line(a.r_top, a.r_right, "W")
    rc = a.roof_pt(0.5, 0.5)
    return a, rc


# ── 3. RIGHT-FACE ATRIUM ENTRY — the glowing hero opening (shaded side) ───────
def atrium_entry(c, b):
    """The HERO lobby/atrium opening on the SHADED RIGHT face of the pavilion. A tall
    K-framed g/c curtain panel made to GLOW (a bright h/O lit-atrium interior, an h
    reflection sweep, a K-framed glass entry door) so it clearly reads on the shaded
    side. Drawn AFTER the left wall so the opening is unmistakably on the RIGHT."""
    # a tall double-height atrium bay, centred-right on the shaded face
    u0, u1 = 0.40, 0.86
    vt, vb = 1.2, 9.0
    # K opening frame (recessed border)
    c.fill_poly([b.right_pt(u0 - 0.012, vt - 0.4), b.right_pt(u1 + 0.012, vt - 0.4),
                 b.right_pt(u1 + 0.012, vb), b.right_pt(u0 - 0.012, vb)], "K")
    iu0, iu1 = u0 + 0.012, u1 - 0.012
    # the GLOWING atrium glass: bright lit interior so the shaded face reads.
    # upper panes bright h (sky-lit atrium), graded down to c.
    c.fill_poly([b.right_pt(iu0, vt), b.right_pt(iu1, vt),
                 b.right_pt(iu1, vb), b.right_pt(iu0, vb)], "c")
    c.fill_poly([b.right_pt(iu0, vt), b.right_pt(iu1, vt),
                 b.right_pt(iu1, vt + 2.6), b.right_pt(iu0, vt + 2.6)], "h")
    # warm O/o atrium-interior glow pooling up from the lobby floor (lights on)
    c.fill_poly([b.right_pt(iu0, vb - 4.2), b.right_pt(iu1, vb - 4.2),
                 b.right_pt(iu1, vb), b.right_pt(iu0, vb)], "o")
    c.fill_poly([b.right_pt(iu0, vb - 2.0), b.right_pt(iu1, vb - 2.0),
                 b.right_pt(iu1, vb), b.right_pt(iu0, vb)], "O")
    # a bright h reflection SWEEP diagonally across the atrium glass (premium)
    c.line(b.right_pt(iu0 + 0.04, vt + 1.0), b.right_pt(iu1 - 0.10, vt + 4.2), "h")
    c.line(b.right_pt(iu0 + 0.04, vt + 1.6), b.right_pt(iu1 - 0.10, vt + 4.8), "W")
    # K mullion grid on the atrium panel (a tall curtain grid)
    for u in (0.40, 0.51, 0.63, 0.74):
        c.line(b.right_pt(u, vt), b.right_pt(u, vb), "K")
    for v in (vt + 2.6, vt + 5.0):
        c.line(b.right_pt(iu0, v), b.right_pt(iu1, v), "K")
    # --- the K-framed glass ENTRY DOOR at the base of the atrium bay ---
    du0, du1 = 0.55, 0.80
    dvt, dvb = vb - 4.0, vb
    c.fill_poly([b.right_pt(du0 - 0.012, dvt), b.right_pt(du1 + 0.012, dvt),
                 b.right_pt(du1 + 0.012, dvb), b.right_pt(du0 - 0.012, dvb)], "K")
    c.fill_poly([b.right_pt(du0 + 0.012, dvt + 0.4), b.right_pt(du1 - 0.012, dvt + 0.4),
                 b.right_pt(du1 - 0.012, dvb), b.right_pt(du0 + 0.012, dvb)], "h")
    c.line(b.right_pt((du0 + du1) / 2, dvt + 0.4), b.right_pt((du0 + du1) / 2, dvb), "K")
    c.line(b.right_pt(du0 + 0.012, dvt + 1.0), b.right_pt(du1 - 0.012, dvt + 1.0), "c")
    # soft warm o glow spill onto the ground just outside the right door
    sp = b.right_pt((du0 + du1) / 2, vb + 0.7)
    sx, sy = int(round(sp[0])), int(round(sp[1]))
    for dx in range(-3, 4):
        c.set(sx + dx, sy, "o")
    c.set(sx - 1, sy + 1, "o"); c.set(sx, sy + 1, "O"); c.set(sx + 1, sy + 1, "o")
    # an o sill chevron accent along the atrium bay base (premium trim)
    sill_l = b.right_pt(iu0, vb + 0.2)
    sill_r = b.right_pt(iu1, vb + 0.2)
    sxl, sxr = int(round(sill_l[0])), int(round(sill_r[0]))
    syl = int(round(sill_l[1]))
    x = sxl + 1
    while x < sxr:
        c.set(x, syl, "o"); c.set(x + 1, syl, "r")
        x += 3


# ── 4. SIGNATURE — hovering holographic GENOME RING (a Circos plot) ──────────
def genome_ring(c, atrium_box, ring_center):
    """A large slowly-rotating holographic GENOME RING (Circos chromosome plot) hovers
    above the atrium penthouse. A flat 2:1 hover-ellipse band split into ~8 colour-coded
    chromosome segments (alternating O/o/g/G/c with thin K ticks), bright h rim glint UL
    + G shade LR, with 2-3 bright W/h/c CHORD ARCS leaping across the open centre linking
    distant segments (gene links) — one arc lit brightest with an O blip travelling it.
    A faint outer g tick-ring + O index marker sells slow rotation; a soft c glow halo +
    h sparkles. Fed by a thin o/O projector beam from a roof emitter. The one-of-one
    signature of the set."""
    ex, ey = int(round(ring_center[0])), int(round(ring_center[1]))
    gx = ex
    gy = ey - 12                                # ring centre floats above the atrium cap
    RX, RY = 12, 6                              # the 2:1 hover-ellipse (flat ring)
    BAND = 2.0                                  # ring band thickness

    # --- soft c glow halo hugging the ring (drawn FIRST, behind everything) ---
    for a in range(0, 360, 30):
        x = gx + (RX + 2) * math.cos(math.radians(a))
        y = gy + (RY + 1.5) * math.sin(math.radians(a))
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < 64 and 0 <= yi < 64 and c.px[yi][xi] == ".":
            c.set(x, y, "c")

    # --- thin o/O projector beam rising from a roof emitter into the ring ---
    for k in range(0, 11):
        t = k / 10
        bx = ex + (gx - ex) * t
        by = ey - 1 - (ey - 1 - (gy + RY - 1)) * t
        c.set(int(round(bx)), int(round(by)), "o")
        if t > 0.5:
            c.set(int(round(bx)) - 1, int(round(by)), "O")
    c.set(ex, ey - 1, "O"); c.set(ex - 1, ey, "r")   # emitter nub on the cap

    # --- CHORD ARCS across the open centre (drawn BEHIND the band so the band rim
    # crisply overlaps their endpoints). 3 gene-link arcs spanning the ring's open
    # interior, each bowed by a perpendicular control offset so they read as three
    # distinct curved chords with air between them (a Circos chord diagram). ---
    inner_x, inner_y = RX - BAND - 0.4, RY - BAND - 0.4   # endpoints land on inner band rim

    def seg_pt(frac):
        ang = math.radians(frac * 360 - 90)
        return (gx + inner_x * math.cos(ang), gy + inner_y * math.sin(ang))

    def chord(p0, p1, col, blip_t=None):
        # a straight gene-link ribbon across the ring's open centre (real Circos chords
        # read as near-straight ribbons between arc segments — at this flat scale that
        # is far more legible than a shallow bow). Single-pixel line + optional O blip.
        pts = [lerp(p0, p1, k / 18) for k in range(0, 19)]
        for p in pts:
            c.set(p[0], p[1], col)
        if blip_t is not None:
            bp = pts[int(blip_t * (len(pts) - 1))]
            bx, by = int(round(bp[0])), int(round(bp[1]))
            c.set(bx, by, "O"); c.set(bx, by - 1, "h")     # a clear lit O blip

    # 3 gene-link chords fanning across the open centre at DISTINCT angles, forming a
    # clear web of links between chromosome segments (a Circos chord diagram):
    #   arc 1 (brightest, the optimization running) is a long diagonal carrying the O
    #   blip; the other two cross it at different angles so the web reads as 3 links.
    chord(seg_pt(0.80), seg_pt(0.30), "W", blip_t=0.50)    # long bright diagonal + blip
    chord(seg_pt(0.62), seg_pt(0.12), "h")                  # upper crossing link
    chord(seg_pt(0.92), seg_pt(0.44), "c")                  # lower crossing link

    # --- the RING BAND itself: 8 colour-coded chromosome segments. Paint the band as a
    # 2:1 elliptical annulus, colouring each pixel by its angular segment. ---
    seg_cols = ["O", "g", "c", "o", "G", "g", "O", "c"]   # 8 alternating bands
    for a in range(0, 360, 2):
        ar = math.radians(a)
        seg = int((a / 360.0) * 8) % 8
        col = seg_cols[seg]
        # lit upper-left brighter, shaded lower-right darker (overpaint per pixel)
        for rr in (0.0, 1.0, 2.0):
            rxx = RX - rr
            ryy = RY - rr * 0.5
            x = gx + rxx * math.cos(ar)
            y = gy + ryy * math.sin(ar)
            # shade: lower-right (a in 0..90 region, i.e. right & down) -> darker
            pc = col
            if math.sin(ar) > 0.25 and math.cos(ar) > -0.2:
                pc = "G" if col in ("g", "c") else ("o" if col == "O" else col)
            c.set(x, y, pc)
    # thin K segment ticks between the 8 chromosome bands
    for s in range(8):
        a = math.radians(s * 45)
        for rr in (-0.5, 0.6, 1.7):
            x = gx + (RX - rr) * math.cos(a)
            y = gy + (RY - rr * 0.5) * math.sin(a)
            c.set(x, y, "K")
    # crisp K inner + outer rim of the band so it reads as a clean torus
    ellipse_ring(c, gx, gy, RX + 0.4, RY + 0.4, "K", step=3)
    ellipse_ring(c, gx, gy, RX - BAND - 0.6, RY - (BAND - 0.6) * 0.5, "K", step=3)
    # bright h rim glint along the upper-left outer arc (lit), G shade lower-right
    for a in range(185, 290, 6):
        x = gx + (RX + 0.4) * math.cos(math.radians(a))
        y = gy + (RY + 0.4) * math.sin(math.radians(a))
        c.set(x, y, "h")
    for a in range(20, 110, 6):
        x = gx + (RX + 0.4) * math.cos(math.radians(a))
        y = gy + (RY + 0.4) * math.sin(math.radians(a))
        c.set(x, y, "G")

    # --- faint outer g TICK-RING + one O index marker (sells slow rotation) ---
    for a in range(0, 360, 18):
        x = gx + (RX + 2.2) * math.cos(math.radians(a))
        y = gy + (RY + 1.6) * math.sin(math.radians(a))
        c.set(x, y, "g")
    idx_a = math.radians(-58)                   # one bright index marker upper-right
    c.set(gx + (RX + 2.2) * math.cos(idx_a), gy + (RY + 1.6) * math.sin(idx_a), "O")

    # --- a couple of h sparkles selling the premium hologram ---
    c.set(gx - RX - 2, gy - 1, "h")
    c.set(gx + RX + 2, gy + 1, "c")
    c.set(gx - 2, gy - RY - 2, "h")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS cultivation /
# compute / bio-glow structure onto the prior glass pavilion — never restarts, never
# recolors the whole building. Theme: the premium genomics pavilion grows into a fully
# built-out, glowing LIVING-DATA RESEARCH CAMPUS — a richer mid-terrace garden, a
# compute annex doing the genome math, a FOURTH green-roof terrace tier raised on the
# ziggurat, and finally a twin-ring Circos cluster. Colours mature stage by stage
# (matured bark-green `b`, bio-luminescent `e/E`); gold (`q`) only as a t5 flourish.
# Every addition is anchored OFF the pavilion/terrace geometry and kept clear of the
# floating GENOME RING signature (which hovers high above the atrium, centre ~x34 y9,
# bbox ~x20..48 y2..16).
#
# Verified-EMPTY pockets the new masses grow into (from the base occupancy map):
#   * upper-RIGHT triangle x49..58 / y24..34 (transparent — pavilion fills only below
#     row 35) -> the t3 SERVER/COMPUTE annex steps the right outline OUT there;
#   * the exposed FRONT-RIGHT mid-terrace roof apron (mid roof ~y26..31, x33..47) ->
#     the t4 FOURTH TERRACE tier is raised there, stepping the planted ziggurat UP one
#     more setback in front of (and below) the atrium, never touching the atrium glass
#     (y>=18 only above) nor the ring (y<=16).
#
#   t2  small functional add   : extra PLANTER TROUGHS of `M/O` blooms raised proud of the
#                                lit mid-terrace parapet + a `c` data-light telemetry strip
#                                with bright `h` nodes along that parapet; one brightened
#                                `o/O` atrium light (the cleanest premium small add)
#   t3  structural add         : a louvered SERVER/COMPUTE annex BOLTED ON past the mid-tier
#                                RIGHT face, tucked under the lowest terrace setback (steps
#                                the right outline OUT) — a matured `b` housing with a
#                                `Box.louver` vent bank breathing faint `g` waste-heat
#   t4  major add              : a FOURTH GREEN-ROOF TERRACE tier raised on the ziggurat —
#                                a new planted setback box stepping UP off the mid-terrace
#                                roof in front of the atrium: a planted parapet garden + a
#                                glowing bio-luminescent `e` grow-lit clerestory band; the
#                                matured cool `b` deepens the new tier's structure
#   t5  crowning feature       : the genome ring doubles into a TWIN-RING / DUAL-CIRCOS
#                                cluster (`E` chords + travelling `O` blip + `e` halo)
#                                + `q` GOLD atrium trim ring + gold terrace-edge cresting
# ═══════════════════════════════════════════════════════════════════════════════

# Shared geometry of the MID green-roof terrace (top=(31,22), wx=9, wy=7, h=4) so the
# stages anchor off the same source points the base composes (no re-guessing).
MID_TOP, MID_WX, MID_WY, MID_H = (31, 22), 9, 7, 4


def _mid_box():
    return Box(top=MID_TOP, wx=MID_WX, wy=MID_WY, h=MID_H)


def stage2_planters(c, b):
    """t2 — SMALL FUNCTIONAL ADD (the cleanest, most premium small add): the planted
    mid-terrace gets RICHER and gains a small DATA-UPLINK ANTENNA. A short row of raised
    PLANTER TROUGHS (matured bark-green `b` bodies with `M/D` foliage + raised `O/o`
    blooms) stands proud of the LIT mid-terrace parapet; a thin `c` DATA-LIGHT telemetry
    strip with bright `h` live-data nodes runs that same parapet (the garden is wired into
    the genome readout); and — the REAL new structural element — a slim bark-green `b`
    GENOME-TELEMETRY UPLINK MAST rises ~5px off the lit front-left parapet vertex into the
    clear upper-left sky, capped by a small `c/h` micro-dish + an `E` uplink blip (it beams
    the wired garden's readings up to the genome ring). Plus one brightened `o/O` atrium
    light pip. A modest, on-theme horticulture+telemetry add that genuinely grows the
    silhouette. Base palette + the evolved bark-green `b` and the brightened `o`/`c`/`E`.
    The mast is anchored on a real roof point (the parapet) and kept fully BELOW the
    floating genome-ring bbox (its tip lands at y>=22, the ring bottoms out at y~16)."""
    mid = _mid_box()
    # The mid terrace is fully boxed-in (mid roof above, pavilion roof below), so the dressing
    # sits ON the lit FRONT parapet (r_left -> r_front) and reads by strong value contrast:
    # a clean continuous `c` DATA-RAIL one row inboard of the lit parapet lip, with bright `h`
    # live-data nodes + an `E` bio-glow tick, and a scalloped row of fresh PLANTER TROUGHS whose
    # bright `O` blooms poke 1px proud of the parapet — a deliberate premium crest that reads
    # against the dark planted roof, distinct from the base's scattered blooms.
    p0, p1 = mid.r_left, mid.r_front
    # --- continuous `c` data-light telemetry RAIL just inboard of the lit parapet lip ---
    r0 = lerp(p0, p1, 0.10)
    r1 = lerp(p0, p1, 0.92)
    c.line((r0[0], r0[1] - 1), (r1[0], r1[1] - 1), "c")      # bright teal data-rail (reads on dark bed)
    for t in (0.28, 0.50, 0.72):                             # bright live-data nodes on the rail
        e = lerp(p0, p1, t)
        c.set(int(round(e[0])), int(round(e[1])) - 1, "h")
    em = lerp(p0, p1, 0.60)                                  # one energized bio-glow telemetry tick
    c.set(int(round(em[0])), int(round(em[1])) - 1, "E")
    # --- scalloped row of fresh PLANTER TROUGHS, bright `O` blooms proud of the parapet ---
    for i in range(4):
        t = 0.22 + i * 0.19
        e = lerp(p0, p1, t)
        ex, ey = int(round(e[0])), int(round(e[1]))
        c.set(ex, ey, "M"); c.set(ex + 1, ey, "D")          # fresh lit foliage tuft in the trough
        c.set(ex, ey - 1, "O" if i % 2 == 0 else "o")       # bright bloom poking proud of the lip
    # --- NEW STRUCTURAL ELEMENT: a slim DATA-UPLINK MAST on the lit front-left parapet ----
    # Anchored on the parapet vertex (lerp 0.12 along r_left->r_front, a real roof point ≈(19,30))
    # rising into the verified-EMPTY upper-left pocket (cols 11..20 / rows 17..26 are bare canvas).
    # The whole mast lives at y>=22 — well clear of the genome-ring bbox (ring bottom ≈y16) and
    # of the atrium glass (atrium left edge ≈x25). ~10 new opaque px, a genuine silhouette add.
    base = lerp(p0, p1, 0.12)
    bx, by = int(round(base[0])), int(round(base[1]))       # ≈(19,30): foot on the lit parapet
    top_y = by - 5                                          # 5px-tall mast -> tip at ≈y25
    c.line((bx, by - 1), (bx, top_y), "b")                  # bark-green mast stem (matured structure)
    c.set(bx + 1, by - 1, "K")                             # a shaded right edge at the foot (depth)
    c.set(bx, top_y, "c")                                   # bright teal antenna node at the tip
    c.set(bx - 1, top_y - 1, "c"); c.set(bx + 1, top_y - 1, "h")   # small micro-dish bar across the tip
    c.set(bx, top_y - 2, "E")                              # one energized uplink blip rising off it
    # --- one brightened `o/O` atrium light pip in the penthouse glass (lit-left face) ---
    atr = Box(top=(33, 18), wx=5, wy=4, h=5)
    ap = atr.left_pt(0.30, 3.2)
    c.set(int(round(ap[0])), int(round(ap[1])), "O")
    c.set(int(round(ap[0])), int(round(ap[1])) + 1, "o")


def stage3_server_annex(c, b):
    """t3 — STRUCTURAL ADD that STEPS THE OUTLINE OUT: a louvered SERVER/COMPUTE annex
    BOLTED ON past the mid-tier RIGHT face, seated in the verified-empty upper-right
    triangle (x49..58 / y24..34 is transparent in the base — the pavilion only fills in
    below row 35). The annex Box's LEFT corner touches the building edge (reads as bolted
    on) while its TOP/RIGHT/FRONT bulk pushes into empty canvas, so the right silhouette
    genuinely grows. A self-contained new mass: a matured bark-green `b` housing with a
    brighter `D` flat roof, whose shaded-RIGHT face (the one toward the viewer's right,
    fully in the open) is a `Box.louver` server-vent bank breathing faint `g` waste-heat,
    an `o/r` exhaust riser off its roof, and `c` status LEDs (the genome math has to run
    somewhere). Tucked UNDER the lowest terrace setback (the mid terrace stepping off the
    pavilion). Introduces matured bark-green `b`; kept LOW + RIGHT so the t4 fourth terrace
    raised on the ziggurat reads cleanly above it and both stay legible."""
    # seat the annex stepping OUT to the right past the mid-tier face, into the empty
    # upper-right triangle. top=(48,26) wx=5 wy=3 h=6 -> r_right(58,31), all-empty top.
    ann = Box(top=(48, 26), wx=5, wy=3, h=6)
    # brighter D roof + matured-bark walls so it reads as a distinct mechanical box
    # stepping off the green ziggurat; K outline gives it a crisp silhouette.
    ann.draw(c, roof="D", lwall="b", rwall="b", roof_hi="L", outline="K")
    # shaded-RIGHT face (fully in the open) = a louvered server-vent bank (opaque slats),
    # matured bark body so it differs from the building's teal glass; faint g waste-heat.
    ann.louver(c, "right", 0.14, 0.88, 1.0, 4.6, body="b", slat="K", edge="d")
    for v in (1.6, 3.0, 4.4):                                # waste-heat seep down the vent
        p = ann.right_pt(0.92, v)
        c.set(int(round(p[0])), int(round(p[1])), "g")
    # c status-LED pips on the lit-left face (compute is live), reading against the bark
    for v in (1.8, 3.4):
        p = ann.left_pt(0.30, v)
        c.set(int(round(p[0])), int(round(p[1])), "c")
    # a slim o/r exhaust riser climbing off the back (r_top) of the annex roof (heat stack)
    rx0, ry0 = ann.roof_pt(0.34, 0.30)
    rx0, ry0 = int(round(rx0)), int(round(ry0))
    c.line((rx0, ry0), (rx0, ry0 - 4), "b")                  # stack body
    c.line((rx0 + 1, ry0), (rx0 + 1, ry0 - 4), "K")          # shaded edge
    c.set(rx0, ry0 - 5, "o")                                 # warm exhaust glow
    c.set(rx0, ry0 - 6, "r")
    return ann


def stage4_fourth_terrace(c, b):
    """t4 — MAJOR ADD = a FOURTH GREEN-ROOF TERRACE tier raised on the ziggurat (the
    BioCore premium signature is the living-roof setbacks, so the big upgrade EXTENDS the
    setback stack one storey higher rather than bolting on a foreign tower). A new planted
    setback Box steps UP off the exposed FRONT-RIGHT mid-terrace roof apron, in FRONT of and
    BELOW the atrium penthouse — so it grows a clear new planted step into the apron pocket
    (mid roof ~y26..31) and breaks the right profile UP, while staying entirely BELOW the
    atrium glass (the atrium walls/roof live above, y<=27 at x25..43) and far below the ring
    (y<=16). Its roof is a planted GARDEN (M/D shrubs + O/o blooms) rimmed by a green parapet
    with W glints (matching the base terraces' living-roof look); its upper walls carry a
    glowing bio-luminescent `e` GROW-LIT clerestory band (the new tier is a lit cultivation
    deck); the matured cool bark-green `b` deepens the new tier's structure (a `b` plinth +
    `b` parapet shadow). Palette matures to deep `b` + energized bio-glow `e`. Returns the
    new tier Box."""
    # Seat the new tier on the FRONT-LEFT pavilion roof apron, stepping the planted setback
    # stack UP-and-LEFT into the verified-empty left pocket (base is transparent at x<~24 for
    # y19..27 and x<~17 for y28..34 — see the occupancy map), so the new tier genuinely grows
    # the silhouette up-left rather than recoloring the centred stack (which is fully boxed in
    # by the atrium + mid terrace + ring). Anchored on the pavilion roof so it never floats;
    # kept LEFT of the atrium (atrium ink starts at x>=25 only above y27) and far below the
    # ring (y<=16). top=(20,19) wx=3 wy=4 h=5 -> roof ~x10..26/y19..27 hugging the atrium's
    # left flank in the empty left wedge, walls dropping onto the pavilion roof's left
    # shoulder; it reads as a raised green-roof step stepping the ziggurat up-left.
    t = Box(top=(20, 19), wx=3, wy=4, h=5)
    # clean premium walls (matured): lit M left, shaded D right, bright W back-edge glints,
    # on a deep bark-green `b` plinth band so the new tier's structure reads as matured.
    t.draw(c, roof="d", lwall="M", rwall="D", roof_hi="W", outline="K")
    PL = t.h - 1.2                                            # thin plinth band at the wall foot
    c.fill_poly([t.left_pt(0.0, PL), t.left_pt(1.0, PL),
                 t.left_pt(1.0, t.h), t.left_pt(0.0, t.h)], "b")
    c.fill_poly([t.right_pt(0.0, PL), t.right_pt(1.0, PL),
                 t.right_pt(1.0, t.h), t.right_pt(0.0, t.h)], "b")
    # --- glowing bio-luminescent `e` GROW-LIT clerestory band on the upper walls ---
    # lit-left: bright `e` grow-light glass; shaded-right: calmer `G` so the glow reads lit.
    c.fill_poly([t.left_pt(0.12, 0.9), t.left_pt(0.88, 0.9),
                 t.left_pt(0.88, 2.0), t.left_pt(0.12, 2.0)], "e")
    c.fill_poly([t.right_pt(0.12, 0.9), t.right_pt(0.88, 0.9),
                 t.right_pt(0.88, 2.0), t.right_pt(0.12, 2.0)], "G")
    for pt in (t.left_pt, t.right_pt):                       # crisp K frame on the band
        c.line(pt(0.12, 0.9), pt(0.88, 0.9), "K")
        c.line(pt(0.12, 2.0), pt(0.88, 2.0), "K")
        for u in (0.36, 0.64):
            c.line(pt(u, 0.9), pt(u, 2.0), "K")
    c.line(t.left_pt(0.16, 1.2), t.left_pt(0.5, 1.2), "E")   # bright grow-light glint (lit)
    # --- PLANTED ROOF GARDEN on the new tier (living-roof bed, like the base terraces) ---
    c.fill_poly([t.r_top, t.r_left, t.r_front], "D")
    c.fill_poly([t.r_top, t.r_front, t.r_right], "d")
    foliage = [(0.30, 0.32, "M"), (0.48, 0.26, "L"), (0.64, 0.34, "M"),
               (0.40, 0.50, "M"), (0.58, 0.46, "L"), (0.72, 0.54, "D"),
               (0.34, 0.64, "M"), (0.52, 0.66, "L"), (0.66, 0.70, "M")]
    for u, v, ch in foliage:
        p = t.roof_pt(u, v)
        px, py = int(round(p[0])), int(round(p[1]))
        c.set(px, py, ch); c.set(px + 1, py, "d")           # foliage tuft + dark depth gap
    for j, (u, v) in enumerate(((0.40, 0.34), (0.60, 0.40), (0.48, 0.60), (0.66, 0.56))):
        p = t.roof_pt(u, v)
        px, py = int(round(p[0])), int(round(p[1]))
        c.set(px, py + 1, "d")                               # shadow under the bloom
        c.set(px, py, "O" if j % 2 == 0 else "o")            # warm bloom
    # --- GREEN PARAPET rim with W premium glints + a matured `b` parapet shadow ---
    for a, bb in [(t.r_top, t.r_left), (t.r_left, t.r_front),
                  (t.r_front, t.r_right), (t.r_right, t.r_top)]:
        c.line(a, bb, "G")
    c.line(t.r_left, t.r_front, "b")                         # matured bark shadow under lit rim
    c.line(t.r_top, t.r_left, "W")                           # bright lit back-left rim glint
    c.line(t.r_top, t.r_right, "W")
    return t


def stage5_twinring_gold(c, atrium, ring_center):
    """t5 — CROWNING FEATURE = FULLY EVOLVED genomics campus. The signature genome ring
    DOUBLES: a second smaller Circos ring blooms up-LEFT of the main one, the two read
    as a DUAL-CIRCOS CLUSTER linked by bright `E` chord arcs leaping across the gap with
    a travelling `O` optimization blip, all hugged by a soft `e` bio-luminescent halo;
    and the building is dressed with GOLD premium trim — a `q` gold trim ring on the
    atrium penthouse cap + gold cresting studs along the terrace edges. Reads as elite,
    still unmistakably the same pavilion, just maxed. All gold (`q`) lives ONLY here.

    The second ring is placed in the EMPTY UPPER-LEFT sky pocket (centre ~x15 y7) — a
    verified-clear region left of the main ring's left lobe and high above the front-right
    fourth terrace, so it reads as a satellite Circos in the cluster. It is SMALLER than the
    main ring and never overlaps the main ring's signature bbox (~x20..48); the main ring is
    composed AFTER this (in build) and stays byte-identical in its own region."""
    # main ring centre (recomputed from the SAME source the base uses: atrium roof
    # centre lifted 12px) so we don't hardcode a second guess.
    mx = int(round(ring_center[0]))
    my = int(round(ring_center[1])) - 12            # == genome_ring's gy
    MRX, MRY = 12, 6                                 # main ring radii (matches signature)

    # --- SECOND (smaller) Circos ring in the empty UPPER-LEFT sky, ABOVE the t4 tower ---
    # centre pulled 1px further left (~x15) so the twin's right rim stays clear of the main
    # ring's left glow at (22,6) — keeps the main signature byte-identical while the chords
    # still bridge the two into a dual-Circos cluster.
    s_cx, s_cy = mx - 19, my - 3                     # ~(15,7): up-left, clear of tower + main ring
    SRX, SRY = 6, 3                                  # distinctly smaller twin
    # soft e bio-luminescent halo hugging the second ring (drawn first, behind)
    for a in range(0, 360, 26):
        x = s_cx + (SRX + 1.5) * math.cos(math.radians(a))
        y = s_cy + (SRY + 1.2) * math.sin(math.radians(a))
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < 64 and 0 <= yi < 64 and c.px[yi][xi] == ".":
            c.set(xi, yi, "e")
    # the second ring band: ~6 colour-coded chromosome segments (a compact Circos)
    seg_cols = ["O", "g", "c", "G", "o", "c"]
    for a in range(0, 360, 3):
        ar = math.radians(a)
        seg = int((a / 360.0) * 6) % 6
        col = seg_cols[seg]
        for rr in (0.0, 1.0):
            rxx = SRX - rr
            ryy = SRY - rr * 0.5
            x = s_cx + rxx * math.cos(ar)
            y = s_cy + ryy * math.sin(ar)
            pc = col
            if math.sin(ar) > 0.25 and math.cos(ar) > -0.2:   # shade lower-right
                pc = "G" if col in ("g", "c") else ("o" if col == "O" else col)
            c.set(x, y, pc)
    # crisp K inner + outer rim of the second ring + a few K segment ticks
    ellipse_ring(c, s_cx, s_cy, SRX + 0.4, SRY + 0.4, "K", step=3)
    ellipse_ring(c, s_cx, s_cy, SRX - 1.6, SRY - 0.8, "K", step=3)
    for s in range(6):
        a = math.radians(s * 60)
        x = s_cx + (SRX - 0.5) * math.cos(a)
        y = s_cy + (SRY - 0.25) * math.sin(a)
        c.set(x, y, "K")
    # bright h rim glint upper-left on the second ring (lit, premium)
    for a in range(195, 285, 8):
        x = s_cx + (SRX + 0.4) * math.cos(math.radians(a))
        y = s_cy + (SRY + 0.4) * math.sin(math.radians(a))
        c.set(x, y, "h")

    # --- bright E CHORD ARCS leaping ACROSS the gap, linking the two rings (the dual
    #     Circos now shares gene-links), with a travelling O optimization blip. The
    #     arcs land on the main ring's LEFT inner rim and the second ring's RIGHT rim,
    #     so they bridge the cluster without crossing the main ring's interior. ---
    def main_left_rim(frac):
        # a point on the main ring's left-facing inner rim
        ang = math.radians(150 + frac * 60)         # 150..210 deg = left arc
        return (mx + (MRX - 2.4) * math.cos(ang), my + (MRY - 1.2) * math.sin(ang))

    def second_right_rim(frac):
        ang = math.radians(-30 + frac * 60)         # -30..30 deg = right arc
        return (s_cx + (SRX - 0.4) * math.cos(ang), s_cy + (SRY - 0.2) * math.sin(ang))

    links = [(0.25, 0.30, "E", 0.5), (0.55, 0.55, "h", None), (0.80, 0.80, "c", None)]
    for mf, sf, col, blip in links:
        p0 = main_left_rim(mf)
        p1 = second_right_rim(sf)
        pts = [lerp(p0, p1, k / 14) for k in range(0, 15)]
        for p in pts:
            c.set(p[0], p[1], col)
        if blip is not None:
            bp = pts[int(blip * (len(pts) - 1))]
            bx, by = int(round(bp[0])), int(round(bp[1]))
            c.set(bx, by, "O"); c.set(bx, by - 1, "E")        # travelling optimization blip

    # --- GOLD premium trim (t5 flourish ONLY) ---
    # a q gold trim ring hugging the atrium penthouse cap (the premium maxed flourish).
    # atrium cap centre = ring_center (atrium roof centre); ring it just above the cap.
    acx, acy = int(round(ring_center[0])), int(round(ring_center[1]))
    for a in range(0, 360, 24):
        x = acx + 5 * math.cos(math.radians(a))
        y = acy - 1 + 2.5 * math.sin(math.radians(a))
        c.set(x, y, "q")
    # two bright O bosses on the gold ring's front (premium glint)
    c.set(acx - 3, acy, "O"); c.set(acx + 3, acy, "O")
    # gold cresting studs along the MID-terrace front edges (r_left->r_front->r_right)
    mid = _mid_box()
    for a, bb in ((mid.r_left, mid.r_front), (mid.r_front, mid.r_right)):
        for t in (0.25, 0.5, 0.75):
            e = lerp(a, bb, t)
            c.set(int(round(e[0])), int(round(e[1])) - 1, "q")
    # one taller bright O finial at the mid-terrace front vertex (crowning point)
    c.set(int(round(mid.r_front[0])), int(round(mid.r_front[1])) - 2, "O")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the bioinformatics suite at upgrade `stage` (1..5). Stage 1 is IDENTICAL
    to the shipped base; each higher stage keeps every prior addition and bolts on the
    next (t2 planters+telemetry → t3 server annex → t4 fourth green-roof terrace →
    t5 twin-ring+gold).
    Painter's order keeps the floating GENOME RING signature drawn LAST (in front of
    all), so no addition can ever occlude it; each rooftop/terrace addition is drawn
    after the masses it grows from."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    # painter's order: pavilion body + walls, plinth, curtain wall, then the planted
    # roof parapet, the stepped terraces (back->front/up), the RIGHT atrium entry.
    b = pavilion(c)
    pl = plinth(c, b)
    curtain_wall(c, b, pl)
    roof_parapet_garden(c, b)
    # stepped green-roof terraces climbing back-and-up to the atrium penthouse
    green_terrace(c, top=(31, 22), wx=9, wy=7, h=4, bloom_phase=0)
    atrium, ring_c = atrium_penthouse(c, top=(33, 18), wx=5, wy=4, h=5)
    # hero opening on the RIGHT (drawn after the left curtain wall)
    atrium_entry(c, b)

    # --- CUMULATIVE UPGRADE STAGES (drawn before the ring so the ring stays on top) --
    if stage >= 2:
        stage2_planters(c, b)
    if stage >= 3:
        stage3_server_annex(c, b)
    if stage >= 4:
        stage4_fourth_terrace(c, b)
    if stage >= 5:
        stage5_twinring_gold(c, atrium, ring_c)

    # --- SIGNATURE LAST: the floating genome ring, in front of everything ----------
    genome_ring(c, atrium, ring_c)
    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/biocore"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "bioinformatics-suite"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG +
    scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must keep
    matching the shipped bioinformatics-suite.png, so it does NOT overwrite the base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": BIO, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"biocore_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"biocore_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
