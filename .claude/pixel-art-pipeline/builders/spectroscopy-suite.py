#!/usr/bin/env python3
"""
Spectroscopy Suite — ChemWorks economy building (BESPOKE form, STANDARD role).

A LOW WIDE OPTICS HALL with a glazed CLERESTORY MONITOR ridge. The body is a
very wide, very low square-on-ground `Box` (a precision instrument room kept dark
and stable inside), and running along the centre of its flat roof is a long
narrow raised `Box` — the clerestory monitor — its long sides glazed in c/g
ribbon glass with K mullions and a flat L/W cap. Horizontal, calm, glassy — the
widest lowest closed mass in the set, distinct from the reactor hall and towers.

  • OPENING SIDE = LEFT: the hero is a wide K-framed sample-LOADING BAY on the LIT
    LEFT face — a c/h glass roll-shutter window with h reflections and an o ready-
    light, plus a K-framed door alongside. The shaded RIGHT face stays plain
    (instrument vents + a D cable conduit).
  • SIGNATURE (one-of-one): a clear h/c glass triangular PRISM stands on the
    clerestory roof; a single bright W/h beam strikes it from the lit-LEFT and fans
    out the far face into a banded spectral RAINBOW — 6 thin parallel bands
    r/o/O/c/g/G (violet end -> blue end), widening as they go. A small c/g strip-
    chart panel on the clerestory base shows the matched spectral lines with one O
    line lit = "identified".

Composed from art/isobuild.{Box,cylinder} — NO iso.draw_cube / base_windows.
ChemWorks palette ONLY (blue-grey walls, BLUE glassware, VIOLET glow; never
yellow/green).
"""
import os
import sys
import json
import math

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box, cylinder

CHEM = {"K": "#161a2e", "W": "#e6ecfb", "L": "#c2cdee", "M": "#9aa8d8", "D": "#6f7cb0", "d": "#4b5688",
        "h": "#d6ecff", "c": "#a8d4ff", "g": "#4aa0e6", "G": "#2166b0",
        "o": "#c89cf0", "O": "#e0c2ff", "r": "#6a34a8"}


# ── low-level helpers ────────────────────────────────────────────────────────
def hline(c, x0, x1, y, ch):
    if x1 < x0:
        x0, x1 = x1, x0
    for x in range(int(round(x0)), int(round(x1)) + 1):
        c.set(x, y, ch)


def vline(c, x, y0, y1, ch):
    if y1 < y0:
        y0, y1 = y1, y0
    for y in range(int(round(y0)), int(round(y1)) + 1):
        c.set(x, y, ch)


# ── VERTICAL BUDGET (top→bottom, all must fit 64px) ───────────────────────────
#   spectral fan + prism   y ~ 2..18   (prism apex ~6, fan spreading down-right)
#   clerestory monitor     y ~ 16..27  (rides the centre ridge of the body roof)
#   body roof              back corner y ~ 19 .. front corner y ~ 31
#   body walls             y ~ 31..44
#   drop shadow            y ~ 44..47
# ── BODY GEOMETRY (low + WIDE: widest lowest mass in the set) ──────────────────
BODY_TOP = (29, 19)     # back-top corner; wide footprint fans down-left/down-right
BODY_WX = 14            # long toward the right corner
BODY_WY = 9             # shorter toward the left corner -> a wide hall, not a cube
BODY_H = 12             # LOW walls


# ── BODY (low wide instrument hall) ──────────────────────────────────────────
def body(c):
    """Low wide Box — blue-grey M/D walls, calm flat roof with a faint seam grid.
    Returns the Box for face + ridge placement."""
    b = Box(BODY_TOP, BODY_WX, BODY_WY, BODY_H)
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # quiet roof seam grid (precision-floor feel) running both roof axes
    for f in (0.34, 0.66):
        c.line(b.roof_pt(0.0, f), b.roof_pt(1.0, f), "M")
    for f in (0.5,):
        c.line(b.roof_pt(f, 0.0), b.roof_pt(f, 1.0), "M")

    # crisp corner seams down the faces
    c.line(b.r_front, b.w_front, "d")                        # front corner (deep)
    c.line(b.left_pt(0.0, 0), b.left_pt(0.0, BODY_H), "D")   # left back jamb
    c.line(b.right_pt(1.0, 0), b.right_pt(1.0, BODY_H), "d")
    return b


# ── LEFT sample-loading bay (the HERO opening) ───────────────────────────────
def loading_bay(c, b):
    """A wide K-framed sample-loading bay filling most of the LIT LEFT face: a
    c/h glass roll-shutter window (horizontal slats) with an h reflection sweep
    and a small o/O ready-light, plus a K-framed door at the left end. Marks the
    opening side as LEFT."""
    # ---- the roll-shutter window (right portion of the left face) ----
    u0, u1 = 0.36, 0.93
    vt, vb = 2.6, BODY_H - 0.9

    # K outer frame
    c.fill_poly([b.left_pt(u0, vt), b.left_pt(u1, vt),
                 b.left_pt(u1, vb), b.left_pt(u0, vb)], "K")
    # glass leaf inset
    gi = 0.03
    gu0, gu1, gvt, gvb = u0 + gi, u1 - gi, vt + 0.9, vb - 0.6
    # clean 3-pane lit->shaded gradient (c lit -> g mid -> G shaded)
    third = (gu1 - gu0) / 3.0
    panes = [(gu0, gu0 + third, "c"), (gu0 + third, gu1 - third, "g"),
             (gu1 - third, gu1, "G")]
    for a, bb, glass in panes:
        c.fill_poly([b.left_pt(a, gvt), b.left_pt(bb, gvt),
                     b.left_pt(bb, gvb), b.left_pt(a, gvb)], glass)
    # two K vertical mullions between the 3 panes
    for um in (gu0 + third, gu1 - third):
        c.line(b.left_pt(um, gvt), b.left_pt(um, gvb), "K")
    # ONE clean roll-shutter slat seam across the upper third (K)
    sv = gvt + (gvb - gvt) * 0.32
    c.line(b.left_pt(gu0, sv), b.left_pt(gu1, sv), "K")
    # bright clean h reflection sweep down the lit pane + one W glint
    c.line(b.left_pt(gu0 + 0.04, gvt + 0.5), b.left_pt(gu0 + 0.04, gvb - 0.6), "h")
    wp = b.left_pt(gu0 + 0.09, gvt + 0.6)
    c.set(int(round(wp[0])), int(round(wp[1])), "W")

    # o/O READY-LIGHT just above the bay (violet accent, the suite armed)
    rl = b.left_pt(u1 - 0.06, vt - 0.9)
    rx, ry = int(round(rl[0])), int(round(rl[1]))
    c.set(rx, ry, "o")
    c.set(rx - 1, ry, "O")
    c.set(rx, ry - 1, "O")

    # ---- the K-framed DOOR at the left end of the face ----
    d0, d1 = 0.07, 0.30
    dvt, dvb = 3.6, BODY_H - 0.3
    c.fill_poly([b.left_pt(d0, dvt), b.left_pt(d1, dvt),
                 b.left_pt(d1, dvb), b.left_pt(d0, dvb)], "K")
    di = 0.025
    c.fill_poly([b.left_pt(d0 + di, dvt + 0.7), b.left_pt(d1 - di, dvt + 0.7),
                 b.left_pt(d1 - di, dvb - 0.3), b.left_pt(d0 + di, dvb - 0.3)], "D")
    # slim c glazed slot in the door + threshold sheen
    c.fill_poly([b.left_pt(d0 + 0.05, dvt + 1.1), b.left_pt(d1 - 0.05, dvt + 1.1),
                 b.left_pt(d1 - 0.05, dvt + 3.4), b.left_pt(d0 + 0.05, dvt + 3.4)], "c")
    c.line(b.left_pt(d0 + 0.05, dvt + 1.1), b.left_pt(d1 - 0.05, dvt + 1.1), "h")


def right_face(c, b):
    """The plainer shaded RIGHT face: two thin instrument vents + a D cable
    conduit dropping down the corner — no glazing (opening is LEFT)."""
    # two louvred vent strips
    for u0, u1 in ((0.18, 0.40), (0.56, 0.78)):
        vt, vb = 3.0, BODY_H - 1.6
        c.fill_poly([b.right_pt(u0, vt), b.right_pt(u1, vt),
                     b.right_pt(u1, vb), b.right_pt(u0, vb)], "d")
        for fv in (0.2, 0.45, 0.7, 0.95):
            sv = vt + (vb - vt) * fv
            c.line(b.right_pt(u0, sv), b.right_pt(u1, sv), "K")
        # frame
        for a, bb in [(b.right_pt(u0, vt), b.right_pt(u1, vt)),
                      (b.right_pt(u0, vb), b.right_pt(u1, vb)),
                      (b.right_pt(u0, vt), b.right_pt(u0, vb)),
                      (b.right_pt(u1, vt), b.right_pt(u1, vb))]:
            c.line(a, bb, "K")
    # D cable conduit dropping the right end of the face
    cu = 0.90
    c.line(b.right_pt(cu, 1.5), b.right_pt(cu, BODY_H - 0.5), "D")
    c.line(b.right_pt(cu + 0.02, 1.5), b.right_pt(cu + 0.02, BODY_H - 0.5), "d")


# ── CLERESTORY MONITOR (long narrow glazed ridge on the roof) ────────────────
def clerestory(c, b):
    """A long narrow raised Box along the centre of the body roof — its long
    LIT-LEFT side glazed in a c/g ribbon (a row of light-slots with K mullions),
    flat L/W cap, a small D instrument cowl at one end. Returns the monitor Box
    for the prism + strip-chart to anchor on."""
    # seat the monitor on the roof centre-line, raised; long axis = body's long
    # (wx) axis so it reads as a ridge slot, narrow in wy.
    m_top = (BODY_TOP[0] - 3, BODY_TOP[1] - 5)  # lifted above + slid along ridge
    m = Box(m_top, wx=10, wy=3, h=4)
    m.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # flat W/L cap sheen along the back roof edge
    c.line(m.roof_pt(0.0, 0.5), m.roof_pt(1.0, 0.5), "W")

    # ---- c/g RIBBON GLAZING along the long LIT-LEFT side (light-slots) ----
    gvt, gvb = 0.9, m.h - 0.6
    gu0, gu1 = 0.06, 0.94
    c.fill_poly([m.left_pt(gu0, gvt), m.left_pt(gu1, gvt),
                 m.left_pt(gu1, gvb), m.left_pt(gu0, gvb)], "g")
    # brighten the lit end of the ribbon
    c.fill_poly([m.left_pt(gu0, gvt), m.left_pt(gu0 + 0.32, gvt),
                 m.left_pt(gu0 + 0.32, gvb), m.left_pt(gu0, gvb)], "c")
    # K frame + a run of K mullions = the row of light-slots
    for a, bb in [(m.left_pt(gu0, gvt), m.left_pt(gu1, gvt)),
                  (m.left_pt(gu0, gvb), m.left_pt(gu1, gvb))]:
        c.line(a, bb, "K")
    for i in range(0, 9):
        um = gu0 + (gu1 - gu0) * i / 8.0
        c.line(m.left_pt(um, gvt), m.left_pt(um, gvb), "K")
    # thin h reflection along the top of the ribbon
    c.line(m.left_pt(gu0, gvt + 0.4), m.left_pt(gu1, gvt + 0.4), "h")

    # small D instrument cowl at the right end of the cap
    cw = m.roof_pt(0.86, 0.5)
    cx, cy = int(round(cw[0])), int(round(cw[1]))
    c.fill_poly([(cx - 1, cy - 2), (cx + 2, cy - 2), (cx + 2, cy), (cx - 1, cy)], "D")
    c.set(cx - 1, cy - 2, "M")
    return m


# ── SIGNATURE: glass prism splitting a white beam into a spectral rainbow ─────
def prism_spectrum(c, m):
    """A clear h/c triangular glass PRISM standing on the clerestory roof; a single
    bright W/h beam strikes it from the lit-LEFT and fans out the far (right) face
    into 6 thin parallel spectral bands r/o/O/c/g/G, widening as they go. Plus a
    small strip-chart panel on the clerestory base with one O line lit. The
    one-of-one signature."""
    # prism base sits on the cap, just right of the strip-chart so they don't
    # collide (chart at u~0.10 on the left face; prism near the ridge centre)
    base = m.roof_pt(0.44, 0.5)
    bx, by = base
    bx = int(round(bx)); by = int(round(by)) - 1

    # ---- triangular PRISM: apex up, base on the roof ----
    apex = (bx, by - 9)
    bl = (bx - 5, by)        # base-left
    br = (bx + 5, by)        # base-right
    # clear glass fill: lit-left h, shaded-right c
    c.fill_poly([apex, bl, br], "c")
    c.fill_poly([apex, bl, (bx, by)], "h")
    # one bright W highlight facet on the lit-left edge
    c.line(apex, bl, "W")
    # K edges of the prism
    c.line(apex, bl, "K") if False else None
    for a, bb in [(apex, bl), (apex, br), (bl, br)]:
        c.line(a, bb, "K")
    # re-lay the W facet just INSIDE the lit edge so the K outline still reads
    for t in range(1, 9):
        f = t / 9.0
        x = apex[0] + (bl[0] - apex[0]) * f + 1
        y = apex[1] + (bl[1] - apex[1]) * f
        c.set(int(round(x)), int(round(y)), "W")

    # ---- INCOMING white beam: from the upper-LEFT into the prism's lit face ----
    in_hit = (bx - 2, by - 4)        # where the beam meets the prism's lit face
    in_src = (in_hit[0] - 13, in_hit[1] - 6)
    # a solid bright W beam with a thin h glow under it
    for t in range(0, 14):
        f = t / 13.0
        x = in_src[0] + (in_hit[0] - in_src[0]) * f
        y = in_src[1] + (in_hit[1] - in_src[1]) * f
        c.set(int(round(x)), int(round(y)), "W")
        c.set(int(round(x)), int(round(y)) + 1, "h")

    # ---- SPECTRAL FAN: 6 thin parallel bands leaving the far (right) face,
    # spreading down-right, widening as they go (violet end -> blue end) ----
    bands = ["r", "o", "O", "c", "g", "G"]
    fan_src = (bx + 3, by - 5)       # exit point on the far (right) face of the prism
    L = 17                           # fan length
    for i, ch in enumerate(bands):
        # each band leaves at its own angle -> a true diverging fan (widening)
        dy = 0.2 + i * 1.7           # top band nearly flat, bottom band droops
        x0, y0 = fan_src
        x1, y1 = x0 + L, y0 + dy
        # solid clean band the full length of the fan
        for t in range(0, L + 1):
            f = t / float(L)
            x = x0 + (x1 - x0) * f
            y = y0 + (y1 - y0) * f
            c.set(int(round(x)), int(round(y)), ch)
        # thicken the outer (far) half so the spectrum reads as a widening fan
        for t in range(L // 2, L + 1):
            f = t / float(L)
            x = x0 + (x1 - x0) * f
            y = y0 + (y1 - y0) * f
            c.set(int(round(x)), int(round(y)) + 1, ch)

    # ---- IDENTIFICATION strip-chart panel on the clerestory base (lit-left) ----
    # a small c/g readout panel seated on the lit-LEFT face of the monitor, in the
    # gap left of the prism (the matched spectral lines the suite reads compounds
    # from). Placed on the face so it sits on the building, not floating.
    pl = m.left_pt(0.10, m.h - 0.6)
    px, py = int(round(pl[0])), int(round(pl[1]))
    pw, ph = 9, 5
    c.fill_poly([(px, py), (px + pw, py), (px + pw, py + ph), (px, py + ph)], "K")
    c.fill_poly([(px + 1, py + 1), (px + pw - 1, py + 1),
                 (px + pw - 1, py + ph - 1), (px + 1, py + ph - 1)], "G")
    # thin spectral-line ticks across the readout (o/c), one O line lit = matched
    tick_cols = [(px + 2, "o"), (px + 3, "c"), (px + 4, "O"), (px + 6, "c"), (px + 7, "o")]
    for tx, tch in tick_cols:
        vline(c, tx, py + 1, py + ph - 1, tch)
    # the lit "identified" O line gets a halo dot above the panel
    c.set(px + 4, py - 1, "O")


# ── ASSEMBLE (painter's order: back→front, ground→sky) ───────────────────────
def build():
    c = Canvas()
    b = body(c)                 # low wide instrument hall
    loading_bay(c, b)           # HERO: wide LEFT sample-loading bay (opening LEFT)
    right_face(c, b)            # plain RIGHT face: vents + conduit
    m = clerestory(c, b)        # glazed clerestory monitor ridge
    prism_spectrum(c, m)        # prism splitting a beam into a spectral rainbow (signature)
    spec = {"width": 64, "height": 64, "palette": CHEM, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/chemworks_spectroscopy-suite.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
