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

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box

BIO = {"K": "#1a2417", "W": "#e8f2d8", "L": "#c4dba6", "M": "#9fc07e", "D": "#6f9456", "d": "#4a6e3a",
       "h": "#d2f7ec", "c": "#9fefcf", "g": "#36cc9e", "G": "#1d8f70",
       "o": "#f0b24d", "O": "#ffd488", "r": "#b9701e"}


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


# ── assemble + emit ──────────────────────────────────────────────────────────
def main():
    c = Canvas()
    # painter's order: pavilion body + walls, plinth, curtain wall, then the planted
    # roof parapet, the stepped terraces (back->front/up), the RIGHT atrium entry, and
    # finally the floating genome ring last (in front of all).
    b = pavilion(c)
    pl = plinth(c, b)
    curtain_wall(c, b, pl)
    roof_parapet_garden(c, b)
    # stepped green-roof terraces climbing back-and-up to the atrium penthouse
    green_terrace(c, top=(31, 22), wx=9, wy=7, h=4, bloom_phase=0)
    atrium, ring_c = atrium_penthouse(c, top=(33, 18), wx=5, wy=4, h=5)
    # hero opening on the RIGHT (drawn after the left curtain wall)
    atrium_entry(c, b)
    # one-of-one signature hovering above the atrium
    genome_ring(c, atrium, ring_c)

    spec = {"width": 64, "height": 64, "palette": BIO, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/biocore_bioinformatics-suite.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    main()
