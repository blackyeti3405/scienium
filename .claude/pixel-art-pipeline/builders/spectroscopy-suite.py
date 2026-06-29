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

UPGRADE EVOLUTION (cumulative — the calm optics hall grows into a full dual-beam
spectro-array; the dispersion/optics theme intensifies; the energized teal e/E
"powered" glow arrives at t4; gold is a t5 flourish). Each stage keeps every prior
addition and bolts on the next, and is placed to NEVER collide with / occlude the
signature prism (centre-ridge) or its spectral fan (which sweeps the upper-RIGHT) —
all evolution grows to the LEFT of the prism on the clerestory bench-rail and DOWN
onto the open front-roof step:
  t2  small functional add : a sample-cuvette TURRET + a calibration LASER DIODE on a
                             short bench rail seated on the OPEN front-LEFT body-roof
                             deck (well clear of the clerestory/prism clutter, rising
                             into the empty deck airspace so it reads at 64px), with a
                             brightened o source LED relighting the beam
  t3  structural add       : a tall louvered DETECTOR-RACK ANNEX (g PMT-tube bays in a
                             b housing) seated on the open front-RIGHT body-roof deck
                             and raised so its lit roof clears the body roofline +
                             overhangs the front eave — a real mass that EXTENDS the
                             silhouette, catching the dispersed beam
  t4  major add            : a second MONOCHROMATOR ARM + a DIFFRACTION-GRATING TOWER
                             raising the bench off the clerestory left end, widening
                             the streak into an e-cored spectrum fan
  t5  crowning feature     : a DUAL-BEAM spectro-array throwing a bright E rainbow
                             dispersion ARC from the twin gratings + q gold optical-
                             rail trim and a gold prism mount
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder  # noqa: F401  (cylinder kept available)

# Base ChemWorks palette (shared keys) + the EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so spectroscopy-suite.png is
# unchanged). These exact keys+hexes are the lab-wide chemworks evolved accents:
#   b  deepened structure steel — matured tone for t4+ new masses
#   e  energized dispersion glow (mid)   E  energized dispersion glow (bright) — t4/t5
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
CHEM = {"K": "#161a2e", "W": "#e6ecfb", "L": "#c2cdee", "M": "#9aa8d8", "D": "#6f7cb0", "d": "#4b5688",
        "h": "#d6ecff", "c": "#a8d4ff", "g": "#4aa0e6", "G": "#2166b0",
        "o": "#c89cf0", "O": "#e0c2ff", "r": "#6a34a8",
        "b": "#363c5e", "e": "#36e0c8", "E": "#c2fff2", "q": "#f0c64a"}

# Height (px) of the t4 diffraction-grating tower above its clerestory-cap foot.
# Defined ONCE here because BOTH stage4_grating_tower (which draws the tower) and
# stage5_dual_beam (which throws the dispersion arc off the tower's grating head)
# must derive the grating-head point from the SAME number — kept short enough that
# the tower head + t5 arc land fully on-canvas (head ~row 4, clear of y=0). The
# tower foot is on the clerestory cap LEFT of the prism so it never fouls the
# signature beam/fan.
GRATING_TOWER_H = 11


# ── low-level helpers ────────────────────────────────────────────────────────
def P(p):
    """Round an (x, y) point to integer pixel coords."""
    return (int(round(p[0])), int(round(p[1])))


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


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS optics / detector
# / dispersion structure onto the prior form — never restarts, never recolors the
# whole building. Theme: the calm optics hall grows into a full dual-beam spectro-
# array. Every add grows to the LEFT of the prism (on the clerestory bench rail) and
# DOWN onto the open front-roof step, so nothing ever fouls the centre-ridge prism or
# its upper-RIGHT spectral fan (the one-of-one signature). Colours mature stage by
# stage; the energized teal e/E dispersion glow arrives at t4; gold (q) only at t5.
#
#   t2  small functional add : a sample-cuvette TURRET + a calibration LASER DIODE
#   t3  structural add       : a louvered DETECTOR-RACK ANNEX on the front-roof step
#   t4  major add            : a 2nd MONOCHROMATOR ARM + DIFFRACTION-GRATING TOWER
#   t5  crowning feature     : a DUAL-BEAM dispersion ARC + gold optical-rail trim
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_cuvette_turret(c, b):
    """t2 — SMALL FUNCTIONAL ADD: a sample-cuvette TURRET (an upright K-outlined carousel
    of c/h cuvette cells) plus a calibration LASER DIODE on a short bench rail, seated on
    the OPEN front-LEFT BODY-ROOF deck (NOT the cramped clerestory cap — round 1 buried it
    in the prism/strip-chart clutter and only 2px read). The deck pocket around x16..21,
    y26..31 is clean lit `L` roof with empty airspace above it (y20..25), so the turret
    rises a clear 5px into open canvas and reads unmistakably as a new instrument at 64px,
    well LEFT of the strip-chart (x>=22) and far from the signature prism/fan to the right.
    On-theme (more optics on the bench), modest, base palette + the one bright o source."""
    # --- a short bench RAIL plate across the lit front-left deck corner; turret+diode sit on it ---
    r0 = P(b.roof_pt(0.02, 0.12))                   # left end of the rail (deck front-LEFT corner)
    r1 = P(b.roof_pt(0.16, 0.12))                   # right end, short of the strip-chart (x>=22)
    c.line(r0, r1, "M")                             # lit rail top
    c.line((r0[0], r0[1] + 1), (r1[0], r1[1] + 1), "d")   # rail underside shade

    # --- sample-cuvette TURRET: a slim upright K-framed carousel rising OFF the deck corner
    #     into the open upper-LEFT airspace (its upper rows land in transparent sky => real
    #     NEW pixels, and it sits in FRONT of the taller t3 detector rack once that arrives) ---
    tp = P(b.roof_pt(0.08, 0.12))                   # turret foot on the rail, deck front-left
    tx, ty = tp[0], tp[1]
    top = ty - 7                                    # tall+slim -> upper rows poke clear into void
    # K silhouette frame (so it pops off the deck + reads against sky), 3px wide
    for yy in range(top, ty + 1):
        c.set(tx - 1, yy, "K"); c.set(tx + 1, yy, "K")
    c.line((tx - 1, top), (tx + 1, top), "K")
    # carousel body column of bright c/h/g cuvette cells (lit), one per row -> a stack of cuvettes
    cells = ["h", "c", "h", "c", "h", "g"]
    for i, ch in enumerate(cells):
        c.set(tx, top + 1 + i, ch)
    c.set(tx, top, "M")                              # lit cap nub on the carousel
    # a contact shadow grounding the turret on the deck
    c.set(tx - 1, ty + 1, "d"); c.set(tx + 1, ty + 1, "d")

    # --- calibration LASER DIODE on the rail, RIGHT of the turret (toward the prism) ---
    lx, ly = tx + 3, ty - 1
    c.set(lx, ly, "D"); c.set(lx, ly - 1, "M")      # small diode block w/ lit cap
    c.set(lx - 1, ly, "K"); c.set(lx + 1, ly, "K")
    c.set(lx, ly + 1, "K")
    # the o source LED on the diode nose + a short bright o->O calibration beam firing UP
    # into the open air (fresh-lit), kept clear of the signature prism to the right
    c.set(lx, ly - 2, "o")                          # brightened source LED
    c.set(lx, ly - 3, "O")
    c.set(lx, ly - 4, "o")


def stage3_detector_rack(c, b):
    """t3 — STRUCTURAL ADD: a DETECTOR-RACK ANNEX — a TALL upright cabinet of g-glazed
    PMT-tube bays in a b steel housing — bolted onto the front-RIGHT corner of the body so
    it EXTENDS THE SILHOUETTE (round 1 sat flush on the existing roof and only recolored the
    centre bay). Seated on the open front-right deck foot roof_pt(0.66,0.34) but RAISED 5px
    so its lit roof (y~29) clears the local body roofline (y~31..34) AND its right corner
    overhangs to x44 / its front face steps DOWN past the eave (y~47) — real new pixels
    appear ABOVE and BESIDE the prior outline. Kept BELOW the spectral fan (y<28) and clear
    of the loading bay on the left face, so it catches the dispersed beam without fouling the
    signature. Introduces the matured deep-steel tone `b`; clearly LIT roof + bright glazing
    so it lifts off the deck."""
    # foot on the front-LEFT deck, then RAISE the back-top corner a full 9px so the cabinet
    # ROOF + upper walls rise into the open upper-LEFT airspace (transparent above ~y24 at
    # x12..18) — that is where real NEW pixels appear ABOVE the existing roofline. Kept narrow
    # (wx=wy=3) and LEFT of the strip-chart/clerestory (x>=20) so it never buries the signature
    # readout, and it stands clearly BEHIND + taller than the small t2 turret in front of it.
    DECK_FOOT = (0.02, 0.18)
    RAISE = 8
    fx0, fy0 = P(b.roof_pt(*DECK_FOOT))
    rack = Box(top=(fx0, fy0 - RAISE), wx=3, wy=2, h=8)
    rack.shadow(c, "K")
    # faces: lit-left in mid M steel (reads on the deck), shaded-right deep b, LIT roof
    c.fill_poly([rack.r_left, rack.r_front, rack.w_front, rack.w_left], "M")     # lit face
    c.fill_poly([rack.r_front, rack.r_right, rack.w_right, rack.w_front], "b")   # shaded face (deep steel)
    c.fill_poly([rack.r_top, rack.r_right, rack.r_front, rack.r_left], "L")      # lit roof
    c.fill_poly([rack.r_top, rack.r_left, rack.r_front], "W")                    # bright back roof triangle
    c.line(rack.r_top, rack.r_left, "W")
    c.line(rack.r_top, rack.r_right, "W")
    for a, bb in [(rack.r_top, rack.r_right), (rack.r_right, rack.r_front),
                  (rack.r_front, rack.r_left), (rack.r_left, rack.r_top),
                  (rack.r_left, rack.w_left), (rack.r_front, rack.w_front),
                  (rack.r_right, rack.w_right),
                  (rack.w_left, rack.w_front), (rack.w_front, rack.w_right)]:
        c.line(a, bb, "K")
    # a small b cowl ridge across the roof so the raised cabinet reads as a detector head
    c.line(rack.roof_pt(0.2, 0.5), rack.roof_pt(0.8, 0.5), "b")
    # ---- a TALL stack of glowing g/c PMT-tube bays glazed into the lit-left face ----
    rack.window(c, "left", 0.18, 0.82, 1.4, 6.6, glass="g", hi="c", shade="G", mullions=1)
    # two crisp K bay-divider seams + bright c/h PMT highlights so the detector tubes
    # read as a column of discrete live cells (a real instrument rack)
    for v in (3.0, 4.8):
        c.line(rack.left_pt(0.18, v), rack.left_pt(0.82, v), "K")
    c.set(*P(rack.left_pt(0.34, 2.3)), "c")
    c.set(*P(rack.left_pt(0.58, 4.0)), "h")
    c.set(*P(rack.left_pt(0.42, 5.6)), "c")
    # an o detector-armed light on the shaded right face
    pl = P(rack.right_pt(0.5, 3.0))
    c.set(pl[0], pl[1], "o"); c.set(pl[0], pl[1] - 1, "O")


def stage4_grating_tower(c, m):
    """t4 — MAJOR ADD: a second MONOCHROMATOR ARM plus a slender DIFFRACTION-GRATING
    TOWER raising the bench off the clerestory's LEFT end — a banded glass-and-steel
    tower with an e-glowing grating CORE climbing it and a tilted grating HEAD at the
    top — widening the dispersion into an e-cored spectrum streak. The prominent new
    vertical mass that says 'this bench now resolves real spectra'. Palette matures:
    deep `b` chassis + energized teal `e/E` core. Foot anchored on the clerestory cap
    LEFT of the prism (prism base ~u0.44); height clamped via GRATING_TOWER_H so the
    head + streak stay on-canvas and clear of the signature."""
    fx, fy = P(m.roof_pt(0.10, 0.5))                # foot on the cap, far LEFT of prism
    base_y = fy
    top_y = max(2, base_y - GRATING_TOWER_H)        # TALL but clamped on-canvas
    half = 1                                         # slim 3px tower
    # ---- a short b plinth seating the tower on the cap ----
    for dx in range(-half, half + 1):
        c.set(fx + dx, base_y, "b")
    for dx in range(-half - 1, half + 2):
        c.set(fx + dx, base_y + 1, "K")            # plinth base shadow line
    # ---- the tower SHELL: alternating glass sections + steel grating bands ----
    yy = base_y - 1
    section = 0
    while yy > top_y:
        seg_h = 3 if section % 2 == 0 else 1        # glass section / thin grating band
        for k in range(seg_h):
            row = yy - k
            if row < top_y:
                break
            if section % 2 == 0:                    # glass section: lit-left c, shaded-right b
                for dx in range(-half, half + 1):
                    col = "c" if dx < 0 else ("g" if dx == 0 else "b")
                    c.set(fx + dx, row, col)
            else:                                   # steel grating band
                for dx in range(-half, half + 1):
                    c.set(fx + dx, row, "b")
        if section % 2 == 1:
            c.line((fx - half - 1, yy), (fx + half + 1, yy), "M")   # band lip catches light
        yy -= seg_h
        section += 1
    # ---- K outline up both sides + a lit-left highlight ----
    c.line((fx - half - 1, base_y - 1), (fx - half - 1, top_y), "K")
    c.line((fx + half + 1, base_y - 1), (fx + half + 1, top_y), "K")
    c.line((fx - half, base_y - 1), (fx - half, top_y), "L")        # lit edge glint
    # ---- glowing grating CORE climbing the tower centre (energized teal) ----
    for j, row in enumerate(range(top_y + 1, base_y - 1)):
        ch = "E" if j % 3 == 0 else "e"
        c.set(fx, row, ch)
    # ---- the tilted DIFFRACTION-GRATING HEAD on top (a small e-edged plate) ----
    hx, hy = fx, top_y - 1
    c.set(hx, hy, "L")                              # head crown
    c.set(hx - 1, hy, "b"); c.set(hx + 1, hy, "D")
    c.set(hx - 2, hy, "K"); c.set(hx + 2, hy, "K")
    c.set(hx, hy - 1, "e")                          # energized grating face glint
    c.set(hx - 1, hy - 1, "K"); c.set(hx + 1, hy - 1, "K")
    # ---- the second MONOCHROMATOR ARM: a short M arm reaching from the tower head
    #      down-RIGHT toward the prism's lit face, carrying an e-cored spectrum streak
    #      that widens the dispersion (kept clear of the prism body itself) ----
    arm_x0, arm_y0 = hx + 1, hy + 1
    arm_x1, arm_y1 = hx + 6, hy + 4                 # ends short of the prism (prism bx~32)
    c.line((arm_x0, arm_y0), (arm_x1, arm_y1), "M")          # arm top chord
    c.line((arm_x0, arm_y0 + 1), (arm_x1, arm_y1 + 1), "b")  # arm body
    c.set(arm_x1, arm_y1, "D")                               # arm elbow
    # an e-cored spectrum streak fanning short off the arm elbow (the widened streak)
    for t in range(0, 4):
        c.set(arm_x1 + t, arm_y1 + 1 + (t // 2), "e")
    c.set(arm_x1 + 3, arm_y1 + 2, "E")


def stage5_dual_beam(c, m):
    """t5 — CROWNING FEATURE = FULLY EVOLVED dual-beam spectro-array. The t4 grating
    tower + the signature prism become a TWIN-GRATING pair throwing a bright E rainbow
    dispersion ARC across the gap between them — the suite now reads as maxed/elite —
    dressed out with GOLD premium trim (a gold optical-rail along the clerestory cap +
    a gold prism MOUNT seated under the signature prism + a gold finial on the grating
    tower). Reads as elite, still recognizably the same calm optics hall, just maxed.

    Re-anchors from the SAME source the tower used (m.roof_pt(0.10,0.5) + the clamped
    GRATING_TOWER_H) so the arc leaves exactly the tower's grating head."""
    # recompute the tower grating-head EXACTLY as stage4 did (no hardcoded 2nd guess)
    fx, fy = P(m.roof_pt(0.10, 0.5))
    base_y = fy
    top_y = max(2, base_y - GRATING_TOWER_H)
    head = (fx, top_y - 1)                          # grating head point (matches stage4)

    # the signature prism base/apex, recomputed from prism_spectrum's own anchor so the
    # arc lands on the prism's lit face (NOT a hardcoded guess)
    pbase = m.roof_pt(0.44, 0.5)
    pbx = int(round(pbase[0]))
    pby = int(round(pbase[1])) - 1
    prism_face = (pbx - 2, pby - 5)                 # the prism's lit-left facet midpoint

    # ---- the DUAL-BEAM rainbow DISPERSION ARC arcing from the grating head across to
    #      the prism's lit face: a bright E spine with a CLEAN spectral edge sweeping
    #      violet→blue (r/o/O/c/g/G) along its length, bowed UP over the gap so it reads
    #      as a single thrown dispersion rainbow (not a scramble) ----
    x0, y0 = head[0] + 1, head[1] + 1
    x1, y1 = prism_face
    steps = 13
    bow = 3                                          # gentle peak rise of the arc
    pts = []
    for s in range(steps + 1):
        t = s / float(steps)
        x = x0 + (x1 - x0) * t
        y = y0 + (y1 - y0) * t - bow * math.sin(math.pi * t)   # parabolic bow upward
        pts.append((int(round(x)), int(round(y))))
    # a clean violet→blue spectral sweep just BELOW the spine (the rainbow under the arc)
    sweep = ["r", "o", "o", "O", "O", "c", "c", "g", "g", "G"]
    for i, (px, py) in enumerate(pts):
        c.set(px, py + 1, sweep[int(i / max(1, len(pts) - 1) * (len(sweep) - 1))])
    # bright E spine drawn ON TOP so the arc reads as one clean energized band
    for px, py in pts:
        c.set(px, py, "E")
    # a soft e haze a row higher at the arc crown so it glows
    crown = pts[len(pts) // 2]
    c.set(crown[0], crown[1] - 1, "e")

    # --- GOLD premium trim (t5 flourish only) ---
    # a gold OPTICAL-RAIL running along the clerestory cap ridge (the maxed-out bench)
    e0 = m.roof_pt(0.06, 0.5)
    e1 = m.roof_pt(0.40, 0.5)                        # stop short of the prism base (u0.44)
    c.line(e0, e1, "q")
    # a gold PRISM MOUNT: a small gold plinth seated UNDER the signature prism base,
    # so the hero prism now reads as premium-mounted (does NOT touch the prism glass).
    # a clean 5px gold band with bright O end-caps + a centred foot = a deliberate mount.
    for dx in (-2, -1, 0, 1, 2):
        c.set(pbx + dx, pby + 1, "q")
    c.set(pbx - 2, pby + 1, "O"); c.set(pbx + 2, pby + 1, "O")
    c.set(pbx - 1, pby + 2, "q"); c.set(pbx + 1, pby + 2, "q")
    # a gold FINIAL capping the grating tower head
    c.set(head[0], head[1] - 1, "q")
    c.set(head[0], head[1] - 2, "O")


# ── ASSEMBLE (painter's order: back→front, ground→sky) ───────────────────────
def build(stage: int = 1):
    """Compose the spectroscopy-suite at upgrade `stage` (1..5). Stage 1 is IDENTICAL
    to the shipped base; each higher stage keeps every prior addition and bolts on the
    next (t2 cuvette-turret+laser → t3 detector-rack annex → t4 grating tower+arm →
    t5 dual-beam arc + gold). Painter's order keeps rooftop/overhead additions on top
    of the masses they grow from, and the signature prism+fan are drawn LAST so no
    upgrade ever paints over the one-of-one feature."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) ---
    b = body(c)                 # low wide instrument hall
    loading_bay(c, b)           # HERO: wide LEFT sample-loading bay (opening LEFT)
    right_face(c, b)            # plain RIGHT face: vents + conduit
    m = clerestory(c, b)        # glazed clerestory monitor ridge

    # --- CUMULATIVE UPGRADE STAGES ---
    # The detector-rack (t3) sits on the open FRONT-roof step; the grating tower (t4) +
    # dual-beam arc (t5) rise from the clerestory LEFT end. All are drawn BEFORE the
    # signature so the prism + spectral fan remain the front-most hero.
    if stage >= 3:
        stage3_detector_rack(c, b)
    if stage >= 4:
        stage4_grating_tower(c, m)
    if stage >= 5:
        stage5_dual_beam(c, m)
    # t2 props sit on the OPEN front-LEFT body-roof deck (well clear of the prism); draw
    # after the tower so a t4+ monochromator arm never paints over them, but before the
    # prism so the signature still reads on top.
    if stage >= 2:
        stage2_cuvette_turret(c, b)

    # the prism splitting a beam into a spectral rainbow is ALWAYS the front-most hero
    prism_spectrum(c, m)        # signature (one-of-one) — drawn LAST
    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/chemworks"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "spectroscopy-suite"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped spectroscopy-suite.png, so it does NOT overwrite the
    base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": CHEM, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"chemworks_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"chemworks_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
