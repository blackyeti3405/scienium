#!/usr/bin/env python3
"""
Quantum Simulation Lab — Axiom Lab economy building (BESPOKE form, STANDARD role).

A TALL NARROW CRYOSTAT TOWER, the tallest/thinnest mass of the Axiom set: a slender
vertical `cylinder` drum (the dilution-fridge housing) standing UP off a small low
equipment annex at its front-right foot — a vertical needle silhouette, clearly NOT
the gateway cube, NOT a wide hall, and NOT the wide premium drum. Polished L/M/D
deep-navy steel, a bright W top-rim glint, K ring banding every ~6px (the fridge
stages), a c frost shimmer near the base. The tower is OPEN-TOPPED: a K-rimmed
circular cryostat mouth from which the chandelier hangs DOWN inside (crowning just
above the rim).

  • Opening side = RIGHT (glowing): the hero is on the SHADED RIGHT face of the drum
    — a tall K-framed VIEWING SLIT cut down the curve revealing the glowing
    chandelier inside; it GLOWS gold/cyan (bright O/c/h interior) to read on the dark
    face. The annex's lit-LEFT face stays plain (one small c window).
  • Signature (one-of-one): a suspended golden QUANTUM-PROCESSOR CHANDELIER — three
    stacked horizontal o/O gold disc plates (largest top, smallest bottom) joined by
    thin gold o rods and dripping o/r cryo-coil loops between tiers — with a glowing
    O/W qubit CORE orb at its base (a K pip + c halo) and 2-3 faint c/h superposition
    GHOST-STATES offset to the sides (one brighter O ghost = the predicted outcome).
    A small c/o probability gauge on the right slit (a g bar + a taller lit O bar =
    the predicted state); soft c frost glow at the tower base.

Composed from art/isobuild.{cylinder,Box} — NO iso.draw_cube / base_windows.
Draw order: contact shadow + foot skirt -> the tall CRYOSTAT TOWER cylinder ->
round steel shading + K stage rings + W rim glint + c frost -> open cryostat mouth
-> the suspended quantum CHANDELIER hanging down inside the mouth -> the GLOWING
right viewing slit (interior glow + ghost-states + gauge) -> the front-right
equipment ANNEX (drawn last so it sits in front) + its plain lit-left window.
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

# Axiom set palette — author on these chars->hex EXACTLY (<=16 colors, K hard outline).
# Base keys (shared across all 10 Axiom buildings) + the four LAB-WIDE EVOLVED accent
# shades reserved for the upgrade stages ONLY (they never appear in stage 1, so the
# shipped quantum-simulation-lab.png is unchanged). These four keys+hexes are the Axiom
# convention reused by every building's _t2.._t5:
#   b  deep indigo steel   — matured structure tone for t3+ new masses (He drum, riser)
#   e  quantum-stellar glow (mid)    E  quantum-stellar glow (bright) — t4/t5 energy
#   q  premium gold trim — t5 flourish ONLY (NOT a whole-building recolor)
AXIOM = {"K": "#0e1124", "W": "#dfe6f6", "L": "#b4bee0", "M": "#7c88b8", "D": "#4e5888", "d": "#333a60",
         "h": "#d6ecff", "c": "#aad8ff", "g": "#4a9ce6", "G": "#2060b0",
         "o": "#ffe27a", "O": "#fff3c0", "r": "#c89a2a",
         "b": "#2a3158", "e": "#7ad0ff", "E": "#cdeeff", "q": "#f6c945"}


# ── cryostat-tower geometry (TALL + NARROW => a slender needle, not a fat drum) ─
CX = 30            # tower centre x
TOP_Y = 14         # y of the tower's top-ellipse centre (headroom for the crown)
RX = 7             # tower horizontal radius (SLIM)
RY = 4             # tower vertical radius (2:1-ish ellipse)
COL_H = 26         # tower wall height (TALL) — a free-standing slender column
BASE_Y = TOP_Y + COL_H


def wall_top(col):
    """Top-y of the tower wall front-face at horizontal offset `col`, following the
    top-ellipse front arc so details clip to the curve."""
    t = 1 - (col / RX) ** 2
    if t < 0:
        return None
    return TOP_Y + RY * (t ** 0.5)


# ── contact shadow + a low steel skirt the tower stands on (drawn FIRST) ───────
def base_shadow(c):
    # soft K contact shadow pooled snug UNDER the whole footprint (tower foot + annex
    # to the front-right). A flat iso ellipse hugging the base so the rig feels
    # grounded — not floating detached below.
    scx, scy = 33, 51
    for x in range(scx - 16, scx + 16):
        for y in range(scy - 2, scy + 3):
            ex = (x - scx) / 16.0
            ey = (y - scy) / 2.2
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")
    # a low D/d steel SKIRT ring under the free-standing tower foot
    for col in range(-RX, RX + 1):
        t = 1 - (col / RX) ** 2
        if t < 0:
            continue
        edge = RY * (t ** 0.5)
        for k in range(3):
            c.set(CX + col, BASE_Y + int(edge) + k, "D" if col <= -1 else "d")
    for a in range(0, 181, 4):                # K front arc of the skirt
        x = CX + (RX + 0.5) * math.cos(math.radians(a))
        y = BASE_Y + 1 + RY * math.sin(math.radians(a))
        c.set(x, y, "K")


# ── the tall slender CRYOSTAT TOWER body (round-shaded steel) ──────────────────
def tower(c):
    """The tall narrow cylinder — polished L/M/D deep-navy steel shaded with a ROUND
    cross-section (a bright lit highlight just left of centre fading to deep `d` on
    the far right) so it reads as a curved drum, not a flat slab."""
    cylinder(c, CX, TOP_Y, RX, COL_H,
             top="L", side_l="M", side_r="D", outline="K", ry=RY)

    # Per-column ROUND steel shading: map horizontal offset -> a curved bright->dark
    # ramp (Lambert-ish) so the cylinder reads volumetric and polished.
    for col in range(-RX, RX + 1):
        t = 1 - (col / RX) ** 2
        if t < 0:
            continue
        edge = RY * (t ** 0.5)
        y0 = int(TOP_Y + edge)
        if col == -RX:
            ch = "M"            # lit left rim
        elif col in (-RX + 1, -RX + 2):
            ch = "L"            # bright polished highlight band (lit-left)
        elif col <= 0:
            ch = "M"
        elif col == 1:
            ch = "M"
        elif col == 2:
            ch = "D"
        elif col in (3, 4):
            ch = "D"
        else:
            ch = "d"            # deep shaded far-right
        x = CX + col
        for y in range(y0, BASE_Y + 1):
            c.set(x, y, ch)

    # bright W rim glint along the back-upper arc of the top ellipse
    for a in range(188, 360, 5):
        x = CX + RX * math.cos(math.radians(a))
        y = TOP_Y + RY * math.sin(math.radians(a))
        c.set(x, y, "W")


# ── K horizontal STAGE RINGS every ~6px (the dilution-fridge stages) ──────────
def stage_rings(c):
    """Thin K ring bands girdling the tower every ~6px — the fridge stages — each
    with a 1px L highlight above so they read as stacked machined plates, not just
    lines. Skipped where the right viewing slit will be cut."""
    for ty in range(TOP_Y + 8, BASE_Y - 2, 6):
        for col in range(-RX, RX + 1):
            t = 1 - (col / RX) ** 2
            if t < 0:
                continue
            x = CX + col
            yy = ty + int((1 - t) * 1.6)      # ring follows a faint front-arc curve
            c.set(x, yy, "K")
            if 0 <= yy - 1 < 64 and c.px[yy - 1][x] in ("M", "D", "L"):
                c.set(x, yy - 1, "L" if col <= 0 else "M")


# ── c FROST shimmer near the base of the tower ─────────────────────────────────
def frost(c):
    """A soft c/h frost shimmer pooling around the lower drum (cryo cold) — sparse
    speckles on the lit-left steel and a brighter band right at the foot."""
    # frost band ringing the very foot of the drum
    for col in range(-RX + 1, RX):
        x = CX + col
        t = 1 - (col / RX) ** 2
        if t < 0:
            continue
        edge = RY * (t ** 0.5)
        fy = BASE_Y + int(edge) - 1
        ch = "c" if col <= 1 else "g"
        c.set(x, fy, ch)
        if abs(col) <= 2:
            c.set(x, fy - 1, "h")
    # a few frost speckles climbing the lit-left flank (cold sheen)
    for (cx_off, dy) in ((-5, 6), (-4, 9), (-6, 11), (-5, 14), (-3, 16), (-6, 17)):
        c.set(CX + cx_off, BASE_Y - dy, "c")


# ── the OPEN cryostat MOUTH at the top (K-rimmed) the chandelier hangs from ────
def cryostat_mouth(c):
    """Re-rim the top ellipse as a dark OPEN mouth and carve a dark BORE WELL running
    a good way DOWN the front of the drum: a `d`/`K` recessed shaft so the gold
    chandelier reads as suspended DOWN INSIDE an open cryostat (dark all around it),
    crowning just above the rim. A clean K lip ring + lit L back-crescent cap it."""
    # inner dark well of the top ellipse (the open bore mouth)
    for yy in range(int(-RY), int(RY) + 1):
        t = 1 - (yy / RY) ** 2
        if t < 0:
            continue
        half = (RX - 1.5) * (t ** 0.5)
        for xx in range(int(-half), int(half) + 1):
            c.set(CX + xx, TOP_Y + yy, "d")
    # a recessed dark SHAFT continuing down the front of the drum (cols -3..+1 so it
    # sits on the lit-left/centre, leaving the shaded right band for the viewing slit)
    well_top = int(TOP_Y + RY) - 1
    well_bot = TOP_Y + 17
    for y in range(well_top, well_bot + 1):
        for col in range(-3, 2):
            c.set(CX + col, y, "d")
        c.set(CX - 4, y, "K")          # K recess jamb (left)
        c.set(CX + 2, y, "K")          # K recess jamb (right)
    c.line((CX - 4, well_bot), (CX + 2, well_bot), "K")   # K sill at the bottom of the well
    # K lip ring of the mouth + lit L back crescent
    for a in range(0, 360, 5):
        x = CX + (RX - 1) * math.cos(math.radians(a))
        y = TOP_Y + (RY - 0.5) * math.sin(math.radians(a))
        c.set(x, y, "K")
    for a in range(192, 348, 6):
        x = CX + (RX - 1.6) * math.cos(math.radians(a))
        y = TOP_Y + (RY - 0.9) * math.sin(math.radians(a))
        c.set(x, y, "L")


# ── SIGNATURE: the suspended golden QUANTUM-PROCESSOR CHANDELIER ────────────────
def chandelier(c):
    """The hero: a tiered gold quantum-computer chandelier suspended in the open
    cryostat mouth, hanging DOWN inside the bore (crown just above the rim). Three
    stacked horizontal o/O gold disc plates (largest at top, smallest at bottom)
    joined by thin o rods and dripping o/r cryo-coil loops between tiers; a glowing
    O/W qubit CORE orb at the bottom tip with a K pip + c halo; and 2-3 faint c/h
    superposition GHOST-STATES offset to the sides (one brighter O = predicted)."""
    cx = CX - 1            # centre the chandelier in the dark front shaft (cols -3..+1)
    # suspension rod from the back lip down to the top tier
    for y in range(TOP_Y - 2, TOP_Y + 2):
        c.set(cx, y, "r")
    c.set(cx, TOP_Y - 2, "o")

    # three COMPACT gold disc plates, clearly SEPARATED by dark gaps. (centre-y,
    # half-width) — largest at top, smallest at bottom, the unmistakable tiered
    # quantum chandelier. Each plate: an o body, a bright O lit crest, a K under-rim.
    plates = [
        (TOP_Y + 2, 3),    # top tier (widest, crowns at the rim)
        (TOP_Y + 6, 2),    # mid tier
        (TOP_Y + 10, 1),   # bottom tier (narrowest)
    ]
    for (py, hw) in plates:
        for col in range(-hw, hw + 1):
            c.set(cx + col, py, "o")
        c.line((cx - hw, py - 1), (cx + hw, py - 1), "O")   # bright lit crest on top
        c.line((cx - hw + 1, py + 1), (cx + hw - 1, py + 1), "r")  # shaded under-edge
        # plate ends fade into the dark bore (no K — the shaft already frames them)
        c.set(cx - hw - 1, py, "r")
        c.set(cx + hw + 1, py, "r")

    # thin gold central rod joining the tiers + dripping cryo-coil loops between them
    # (the particle-ring echo) — small o crest / r shade nubs to the sides.
    for (pa, pb) in ((plates[0], plates[1]), (plates[1], plates[2])):
        ya, yb = pa[0], pb[0]
        for y in range(ya + 1, yb):
            c.set(cx, y, "o")
        my = (ya + yb) // 2
        for off in (-2, 2):                                  # paired coil loops
            c.set(cx + off, my, "o")
            c.set(cx + off, my + 1, "r")

    # the glowing QUBIT CORE orb at the very bottom tip (a bright O/W chip)
    qy = plates[2][0] + 3
    for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 0), (0, 1)):
        c.set(cx + dx, qy + dy, "O")
    c.set(cx, qy, "W")                  # brightest core
    c.set(cx, qy + 2, "K")             # tiny K pip under the chip
    # c halo ring around the qubit (cool quantum glow over the dark shaft)
    for dx, dy in ((-2, 0), (2, 0), (0, -2), (-2, -1), (2, -1)):
        if c.px[qy + dy][cx + dx] in ("d", "D", "K"):
            c.set(cx + dx, qy + dy, "c")

    # superposition GHOST-STATES — 3 faint translucent c/h copies of the core offset
    # to the sides (the qubit in several states at once); one brighter O ghost marks
    # the PREDICTED measured outcome.
    ghosts = [(-3, -1, "c"), (-3, 2, "h"), (3, 1, "O")]    # (dx, dy, tone)
    for (gx, gy, tone) in ghosts:
        gxx, gyy = cx + gx, qy + gy
        if not (0 <= gyy < 64 and 0 <= gxx < 64):
            continue
        c.set(gxx, gyy, tone)
        if tone == "O":                                    # the predicted outcome glows
            c.set(gxx, gyy - 1, "o")
            c.set(gxx, gyy + 1, "r")
        else:
            c.set(gxx, gyy - 1, "c" if tone == "h" else "h")


# ── the GLOWING right VIEWING SLIT (hero on the SHADED RIGHT face) ─────────────
def right_slit(c):
    """A tall K-framed viewing slit cut DOWN the shaded RIGHT side of the drum,
    revealing the glowing chandelier interior — it must GLOW gold/cyan to read on
    the dark face. A bright O/c/h cavity with a hot gold qubit glow low and a faint
    chandelier silhouette, plus a small c/o probability gauge (a g bar + a taller O
    bar = the predicted state)."""
    # slit spans a narrow channel down the SHADED RIGHT band (clear of the central
    # dark chandelier shaft, whose K right jamb is at CX+2)
    sc0, sc1 = 3, 5                          # column offsets on the shaded right
    sy0 = int(wall_top(sc1)) + 5
    sy1 = BASE_Y - 4
    x0, x1 = CX + sc0, CX + sc1

    # K frame jambs + a recessed bright interior cavity that GLOWS
    for y in range(sy0 - 1, sy1 + 2):
        c.set(x0 - 1, y, "K")
        c.set(x1 + 1, y, "K")
    c.line((x0 - 1, sy0 - 1), (x1 + 1, sy0 - 1), "K")
    c.line((x0 - 1, sy1 + 1), (x1 + 1, sy1 + 1), "K")

    # glowing interior: cool c/h glass up top grading to a HOT gold O/o glow low
    # (the chandelier's qubit core seen through the slit) so the hero reads on dark.
    span = sy1 - sy0
    for y in range(sy0, sy1 + 1):
        f = (y - sy0) / max(1, span)         # 0 top -> 1 bottom
        if f < 0.30:
            body = "c"
        elif f < 0.52:
            body = "h"
        elif f < 0.66:
            body = "O"
        elif f < 0.84:
            body = "o"
        else:
            body = "O"
        for x in range(x0, x1 + 1):
            c.set(x, y, body)

    # a faint chandelier silhouette inside the slit: two tiny gold tier ticks + a
    # bright qubit pip low (so the slit clearly frames the hanging chandelier)
    midx = (x0 + x1) // 2
    for ty, hw in ((sy0 + 4, 1), (sy0 + 8, 1)):
        c.line((midx - hw, ty), (midx + hw, ty), "r")
    c.set(midx, sy1 - 3, "W")                # qubit core pip seen through the slit
    c.set(midx, sy1 - 2, "O")
    c.set(midx - 1, sy1 - 3, "o")
    c.set(midx + 1, sy1 - 3, "o")
    # h reflection streak down the cool upper glass
    c.set(x0, sy0 + 1, "h")
    c.set(x0, sy0 + 2, "h")

    # ── probability GAUGE inside the LOW part of the slit: two side-by-side bars on
    # the bright interior — a short `g` bar and a TALLER lit `O` bar (the O bar
    # taller = the PREDICTED state). Sits on the drum face (not floating in space).
    gby = sy1 - 1                            # gauge baseline, just above the slit sill
    gx = x0                                  # left bar at the slit's left edge
    for k in range(2):                       # short g (lower-probability) bar
        c.set(gx, gby - k, "g")
    c.set(gx, gby - 2, "G")
    for k in range(4):                       # tall O (predicted) bar
        c.set(gx + 2, gby - k, "O")
    c.set(gx + 2, gby - 4, "o")
    c.line((gx, gby + 1), (x1, gby + 1), "K")   # gauge floor across the slit


# ── the front-right equipment ANNEX (low Box, drawn LAST so it sits in front) ──
ANNEX = Box((40, 33), wx=5, wy=4, h=9)


def annex(c, b):
    """A small low equipment Box abutting the FRONT-RIGHT foot of the tower (the
    control/compressor unit). Drawn AFTER the tower so it sits in front, anchoring
    the main opening on the RIGHT. Its faces are deliberately ASYMMETRIC so the
    annex does NOT echo the gateway two-per-face cube: ONE larger lit-left cyan
    control-panel pane, and a single recessed equipment DOOR on the shaded-right
    face (a control-room entrance, not a matching window). A thin o cryo-line coils
    up toward the tower base."""
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # one LARGER cyan control-panel pane on the lit-LEFT face (a single wide pane,
    # not the gateway's paired strips) — c glass, h glint, G sill, K frame.
    pt = b.left_pt
    wu0, wu1, wv0, wv1 = 0.16, 0.80, 2.2, b.h - 1.4
    c.fill_poly([pt(wu0, wv0), pt(wu1, wv0), pt(wu1, wv1), pt(wu0, wv1)], "c")
    c.fill_poly([pt(wu0, wv0), pt(wu1, wv0), pt(wu1, wv0 + 1.3), pt(wu0, wv0 + 1.3)], "h")  # top glint
    c.fill_poly([pt(wu0, wv1 - 1.1), pt(wu1, wv1 - 1.1), pt(wu1, wv1), pt(wu0, wv1)], "G")  # shaded sill
    c.line(pt(wu0 + 0.12, wv0 + 0.9), pt(wu0 + 0.12, wv1 - 1.0), "h")                       # reflection streak
    g0 = pt(0.30, wv1 - 1.6); c.set(int(round(g0[0])), int(round(g0[1])), "o")             # tiny gold readout pip
    for a, bb in [(pt(wu0, wv0), pt(wu1, wv0)), (pt(wu0, wv1), pt(wu1, wv1)),
                  (pt(wu0, wv0), pt(wu0, wv1)), (pt(wu1, wv0), pt(wu1, wv1))]:
        c.line(a, bb, "K")

    # a single recessed equipment DOOR on the shaded-RIGHT face (the control-room
    # entrance) — K frame, M leaf with a D recessed inner panel + o handle. A door,
    # NOT a second window, so the annex clearly reads as an equipment unit.
    rp = b.right_pt
    du0, du1, dv0, dv1 = 0.26, 0.70, 2.6, b.h - 0.3
    c.fill_poly([rp(du0, dv0), rp(du1, dv0), rp(du1, dv1), rp(du0, dv1)], "M")
    # one solid recessed leaf (a single `d` panel — no bisecting seam, so it reads as
    # ONE door, not bars). A `D` jamb shadow on the lit-left inner edge gives it depth.
    c.fill_poly([rp(du0 + 0.06, dv0 + 0.7), rp(du1 - 0.06, dv0 + 0.7),
                 rp(du1 - 0.06, dv1 - 0.2), rp(du0 + 0.06, dv1 - 0.2)], "d")   # recessed leaf (darker than D wall)
    c.line(rp(du0 + 0.18, dv0 + 0.8), rp(du0 + 0.18, dv1 - 0.3), "D")          # inner jamb shadow (depth, not a seam)
    for a, bb in [(rp(du0, dv0), rp(du1, dv0)), (rp(du0, dv1), rp(du1, dv1)),
                  (rp(du0, dv0), rp(du0, dv1)), (rp(du1, dv0), rp(du1, dv1))]:
        c.line(a, bb, "K")
    hp = rp(du1 - 0.18, (dv0 + dv1) / 2 + 0.3)
    hx, hy = int(round(hp[0])), int(round(hp[1]))
    c.set(hx, hy, "o")                                                         # o door handle (on the leaf, latch side)
    c.set(hx, hy + 1, "r")                                                     # r under-glint so the handle reads as a knob

    # a thin o cryo-line coiling up off the annex roof toward the tower base
    rfp = b.roof_pt(0.30, 0.40)
    rx, ry = int(round(rfp[0])), int(round(rfp[1]))
    c.set(rx, ry, "K")
    c.set(rx - 1, ry - 2, "o")
    c.set(rx - 2, ry - 3, "r")
    c.set(rx - 3, ry - 4, "o")
    c.set(rx - 4, ry - 5, "o")
    return b


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). The slender cryostat tower grows into a
# fully built-out, maxed quantum-computing rig. Every addition is cryo/quantum
# on-theme + UNIQUE to THIS building (frost vent + qubit gauge -> helium reservoir
# sub-drum -> microwave-horn control array climbing the tower -> a superposition
# orb-cloud crowning the open mouth). All additions grow OUT and UP from the
# existing form and STAY CLEAR of the two hero features — the open-mouth gold
# CHANDELIER (top-centre, cols -3..+1) and the glowing right VIEWING SLIT (shaded
# right, cols +3..+5). Colours mature stage by stage; gold (q) is the t5 flourish.
#
# Anchors (recomputed from the SAME base constants every stage, no second guesses):
#   tower: CX=30, RX=7, TOP_Y=14, BASE_Y=40 (body x≈23..37, y≈10..44)
#   chandelier mouth: x≈27..31, y≈10..27   ·   right slit: x≈33..35, y≈18..36
#   FRONT-LEFT foot (x≈16..27) is the open ground the He drum + riser grow from;
#   the front-right ANNEX (x≈32..50) carries the qubit gauge.
#
#   t2  small functional add : a frost-VENT puff at the tower foot + a qubit
#                              probability MINI-GAUGE on the annex
#   t3  structural add       : a HELIUM-RESERVOIR sub-drum (short fat cylinder)
#                              abutting the tower's front-left foot
#   t4  major add            : a 2nd CRYO-LINE riser + MICROWAVE-HORN array climbing
#                              the lit-left tower curve, horns aimed at the mouth
#   t5  crowning feature     : a glowing SUPERPOSITION ORB-CLOUD haloing the open
#                              mouth + a gold cryostat RIM RING + gold chandelier discs
# ═══════════════════════════════════════════════════════════════════════════════

# Shared anchor for the helium reservoir so t3/t4 recompute the SAME drum (the t4
# cryo-riser climbs from the drum top — no hardcoded second guess for its foot).
# Seated at the FRONT-LEFT of the tower foot: low top_y so the drum's cap clears the
# tower's own foot skirt, stout (short) so it reads as a sub-drum twinning the tower.
HE_CX, HE_TOPY, HE_RX, HE_RY, HE_H = 19, 42, 4, 2, 5


def stage2_frostvent_gauge(c):
    """t2 — SMALL FUNCTIONAL ADD: (a) a short frost-VENT nozzle at the tower's
    front-left foot blowing a soft `c`/`h` cryo puff (more cold, modest), and (b) a
    small qubit-probability MINI-GAUGE on the front-right equipment ANNEX's shaded
    face (a `g` bar + a taller lit `O` bar = the predicted state). Base palette +
    brightened `c`/`O`. Both sit LOW and to the sides, well clear of the chandelier
    mouth and the right viewing slit."""
    # (a) frost-VENT: a tiny K/D nozzle on the lit-left foot of the tower throwing a
    # rounded c/h vapour puff out over the ground (distinct from the base frost band).
    nx, ny = 25, 41                              # on the lit-left foot, low
    c.set(nx, ny, "K")                           # nozzle mouth
    c.set(nx - 1, ny, "D")
    puff = [(-2, 0, "c"), (-3, 0, "h"), (-4, 1, "c"), (-3, 1, "h"), (-2, 1, "c"),
            (-4, 0, "c"), (-5, 1, "c"), (-3, 2, "c"), (-4, 2, "h")]
    for dx, dy, ch in puff:
        c.set(nx + dx, ny + dy, ch)

    # (b) qubit probability MINI-GAUGE on the annex shaded-RIGHT face, upper area —
    # a small K-framed readout puck (clear of the door lower on that face). Two bars:
    # a short g bar + a taller O bar (predicted state), with a tiny o ticked top.
    gp = ANNEX.right_pt(0.30, 1.7)
    gx, gy = int(round(gp[0])), int(round(gp[1]))
    c.fill_poly([(gx - 1, gy - 1), (gx + 4, gy - 1), (gx + 4, gy + 3), (gx - 1, gy + 3)], "K")  # puck backing
    c.fill_poly([(gx, gy), (gx + 3, gy), (gx + 3, gy + 2), (gx, gy + 2)], "d")                  # dark readout face
    for k in range(2):                           # short g (lower-probability) bar
        c.set(gx, gy + 2 - k, "g")
    c.set(gx, gy, "G")
    for k in range(3):                           # taller O (predicted) bar
        c.set(gx + 2, gy + 2 - k, "O")
    c.set(gx + 2, gy, "o")
    c.set(gx + 3, gy - 1, "o")                   # tiny gold status tick on the rim


def stage3_helium_drum(c):
    """t3 — STRUCTURAL ADD: a HELIUM-RESERVOIR sub-drum — a short fat `cylinder`
    abutting the tower's FRONT-LEFT foot, twinning the tower's round language at a
    smaller scale (a real new mass). Deep-indigo `b` shell (matured structure) with
    a round `M`/`b` shade, a `c` liquid-LEVEL window band, an `o` valve wheel + a
    thin `o` transfer line curving up to the tower base. Foot of the drum sits on the
    same ground line; clear of the annex (front-right) and the slit (right face)."""
    cx, ty, rx, ry, h = HE_CX, HE_TOPY, HE_RX, HE_RY, HE_H
    bot = ty + h
    # the drum body: a clean L-topped cylinder so the cap reads as a lit steel lid
    cylinder(c, cx, ty, rx, h, top="L", side_l="M", side_r="b", outline="K", ry=ry)
    # round steel shading on the walls: bright L/M highlight just left of centre grading
    # to deep-indigo b and a deep d far-right edge — a polished, READABLE rounded tank.
    for col in range(-rx, rx + 1):
        t = 1 - (col / rx) ** 2
        if t < 0:
            continue
        edge = ry * (t ** 0.5)
        if col == -rx:
            ch = "M"          # lit left rim
        elif col in (-rx + 1, -rx + 2):
            ch = "L"          # bright polished highlight band (lit-left)
        elif col <= 0:
            ch = "M"
        elif col == 1:
            ch = "b"
        elif col in (2, 3):
            ch = "b"
        else:
            ch = "d"          # deep shaded far-right
        x = cx + col
        for y in range(int(ty + edge), bot + 1):
            if c.px[y][x] in ("b", "d", "M", "L"):
                c.set(x, y, ch)
    # a clear K-framed liquid-LEVEL sight WINDOW on the lit face (cyan He level, half
    # filled): a 2-wide x 3-tall pane, c liquid in the lower part, dark vapour above.
    wx0, wy0 = cx - rx + 1, ty + 1
    for yy in range(wy0, wy0 + 3):
        for xx in range(wx0, wx0 + 2):
            c.set(xx, yy, "c" if yy >= wy0 + 1 else "d")   # liquid below, vapour above
    c.set(wx0, wy0 + 1, "h")                      # bright meniscus glint
    for a, b in [((wx0 - 1, wy0 - 1), (wx0 + 2, wy0 - 1)), ((wx0 - 1, wy0 + 3), (wx0 + 2, wy0 + 3)),
                 ((wx0 - 1, wy0 - 1), (wx0 - 1, wy0 + 3)), ((wx0 + 2, wy0 - 1), (wx0 + 2, wy0 + 3))]:
        c.line(a, b, "K")                         # K frame around the sight window
    # one thin K stage band low on the drum (twins the tower's fridge rings, subtle)
    for col in range(-rx + 1, rx):
        c.set(cx + col, bot - 1, "K")
    # an o valve wheel + stub on the drum's top-right shoulder
    vx, vy = cx + rx, ty
    c.set(vx, vy, "o")
    c.set(vx, vy - 1, "O")                        # lit top of the valve wheel
    c.set(vx - 1, vy, "r")
    # a thin o transfer LINE arcing up-right from the valve to the tower foot
    for (lx, ly, ch) in ((vx + 1, vy - 1, "o"), (vx + 2, vy - 1, "r"),
                         (CX - RX - 1, BASE_Y - 1, "r"), (CX - RX, BASE_Y - 2, "o")):
        c.set(lx, ly, ch)


def stage4_cryo_horns(c):
    """t4 — MAJOR ADD: a second CRYO-LINE + MICROWAVE-HORN array climbing the tower —
    the prominent new vertical mass that says the qubits now get real control lines.
    A deep-indigo `b` riser pipe runs UP the lit-left curve of the drum (from the
    helium reservoir top), feeding three glowing `e` control-HORN cones that branch
    off and aim UP-RIGHT at the open cryostat mouth. Palette matures: `b` armature +
    energized `e`/`E` glow. Climbs the LIT-LEFT flank (cols -5..-6) so it clears the
    chandelier shaft (cols -3..+1) AND the right viewing slit entirely; horn tips
    stop short of the mouth (col ≈ -2) so they point at the qubits without occluding
    the hero chandelier. Recomputes its foot from the SAME helium-drum anchor."""
    # riser foot: top-left shoulder of the helium reservoir (SAME anchor as stage3 —
    # no hardcoded second guess; the riser visibly rises OUT of the He drum) and climbs
    # the OUTER lit-left edge UP PAST the mouth rim, so it ADDS to the silhouette (a
    # major add) and lifts the horn manifold into the CLEAR SKY above/left of the mouth.
    foot_x = HE_CX - 1                  # the drum's lit-left shoulder
    foot_y = HE_TOPY
    rise_x = CX - 8                     # the riser column, on the OUTER lit-left edge
    man_y = TOP_Y - 6                   # the horn-manifold height (above the mouth rim)
    # a short b elbow from the drum shoulder up onto the outer tower edge
    c.line((foot_x, foot_y), (rise_x, foot_y - 2), "b")
    # the riser pipe (3px: K outline + M lit edge + b body) climbing from the drum up
    # past the rim to the manifold — a real standalone cryo-line, distinct from the drum.
    for y in range(man_y, foot_y - 1):
        c.set(rise_x - 1, y, "K")       # K left outline
        c.set(rise_x, y, "M")           # lit body edge
        c.set(rise_x + 1, y, "b")       # shaded body
    # K pipe clamps strapping the riser at intervals down the tower
    for cyy in (TOP_Y + 2, TOP_Y + 9, foot_y - 4):
        c.set(rise_x + 2, cyy, "K")
    # the MICROWAVE-HORN array: TWO clearly-separated flared horn antennas mounted on the
    # riser, their wide APERTURES facing UP-LEFT into the CLEAR SKY (so each reads as an
    # unmistakable trumpet against the dark background, not a smear on the chandelier),
    # each feeding a short bright E CONTROL-BEAM in toward the open mouth from the left.
    # A FEW clear horns beat many tiny merged ones. Apertures clamped on-canvas (x>=1,
    # y>=1); beams stop at x=CX-3 so they POINT AT the qubits without occluding them.
    jx, jy = rise_x, man_y              # the riser-top manifold junction
    c.fill_poly([(jx - 1, jy), (jx + 2, jy), (jx + 2, jy + 2), (jx - 1, jy + 2)], "b")
    c.set(jx - 1, jy, "K")
    c.set(jx + 2, jy + 2, "K")
    c.set(jx, jy + 1, "E")              # bright feed node in the manifold
    # horn A (upper): aperture up-left in open sky; horn B (lower): aperture left, lower.
    # (throat on riser) -> (wide aperture out in the clear). Drawn as a SOLID b cone with
    # an M lit edge + a bright e/E aperture RIM; then a short E beam from the throat in.
    horns = [(jx, jy, jx - 4, jy - 4, jx - 2, jy - 6),    # throat, aperture-near, apex
             (jx, jy + 2, jx - 5, jy + 1, jx - 4, jy - 1)]
    for (thx, thy, apx, apy, apx2, apy2) in horns:
        apx, apx2 = max(1, apx), max(1, apx2)
        apy, apy2 = max(1, apy), max(1, apy2)
        # SOLID flared cone: throat (narrow, on the riser) -> two splayed aperture lips
        c.fill_poly([(thx, thy), (apx, apy), (apx2, apy2)], "b")
        c.line((thx, thy), (apx2, apy2), "M")            # lit upper lip of the horn
        c.line((apx, apy), (apx2, apy2), "e")            # bright aperture RIM (the mouth)
        c.set(apx, apy, "E")
        c.set(apx2, apy2, "E")
        c.set((apx + apx2) // 2, (apy + apy2) // 2, "h")  # faint dish glint inside
        # a short E control-beam leaving the throat IN toward the chandelier (down-right)
        for k in range(1, 4):
            bx, by = thx + k, thy + 1
            if bx <= CX - 3 and 0 <= by < 64:
                c.set(bx, by, "E" if k < 3 else "e")


def stage5_orbcloud(c):
    """t5 — CROWNING FEATURE = FULLY EVOLVED quantum rig. A glowing SUPERPOSITION
    ORB-CLOUD blooms above the open cryostat mouth — a halo of bright `E`/`e` qubit
    ghost-orbs orbiting the chandelier core (the maxed quantum state, the qubit held
    in many states at once) — finished with premium GOLD: a `q` cryostat RIM RING
    girdling the mouth lip and `q` gold highlights on the chandelier discs. Reads as
    elite, still unmistakably the same cryostat tower. The orb halo sits ABOVE and to
    the SIDES of the chandelier crown so the hero stays legible (orbs never bury it).
    Gold ONLY here. All points clamped on-canvas (y>=0)."""
    import math
    mcx, mcy = CX - 1, TOP_Y                      # the chandelier/mouth centre
    # --- gold cryostat RIM RING tracing the mouth lip (on the K lip ring at radius
    #     RX-1) — a premium machined rim girdling the open mouth. Lay gold only on the
    #     existing steel lip so the open bore stays dark. ---
    for a in range(0, 360, 10):
        x = mcx + (RX - 1) * math.cos(math.radians(a))
        y = mcy + (RY - 0.5) * math.sin(math.radians(a))
        yy, xx = int(round(y)), int(round(x))
        if 0 <= yy < 64 and 0 <= xx < 64 and c.px[yy][xx] in ("K", "L", "M", "D", "d"):
            c.set(xx, yy, "q")
    c.set(mcx - 3, mcy + 1, "O")                  # bright O sparkle on the front rim
    c.set(mcx + 3, mcy, "o")

    # --- gold flourish on the CHANDELIER discs: re-tint each plate to q gold + a bright
    #     O lit crest (recompute the SAME plate positions used in chandelier()) ---
    plates = [(TOP_Y + 2, 3), (TOP_Y + 6, 2), (TOP_Y + 10, 1)]
    for (py, hw) in plates:
        for col in range(-hw, hw + 1):
            if 0 <= py < 64 and c.px[py][mcx + col] in ("o", "O"):
                c.set(mcx + col, py, "q")
        for col in range(-hw, hw + 1):             # bright lit crest across the gold disc
            if 0 <= py - 1 < 64 and c.px[py - 1][mcx + col] in ("O", "o", "d", "D"):
                c.set(mcx + col, py - 1, "O")

    # --- SUPERPOSITION ORB-CLOUD: a flat HALO of qubit ghost-orbs ORBITING the core,
    #     crowning the open mouth. Orbs ride ONE wide tilted ellipse (rx=8, ry=3) centred
    #     just above the rim, each drawn as a HORIZONTAL 2px ball (a bright core + a soft
    #     side-glow pixel) so the cloud reads as round orbs sweeping around the crown —
    #     NOT vertical spikes. Brighter E orbs at the ring's lit front/sides; dimmer e at
    #     the back. Skipped over the chandelier centre column so the hero stays legible. ---
    halo_cy = mcy - 4                              # halo centre lifted above the rim
    orx, ory = 8, 3
    for a in range(0, 360, 30):                    # 12 orbs evenly spaced around the ring
        x = mcx + orx * math.cos(math.radians(a))
        y = halo_cy + ory * math.sin(math.radians(a))
        xx, yy = int(round(x)), int(round(y))
        if not (1 <= xx < 63 and 1 <= yy < 63):
            continue
        if abs(xx - mcx) <= 1 and yy >= mcy - 1:   # don't sit on the chandelier crown
            continue
        if xx <= (CX - 8) + 2 and yy <= TOP_Y - 4:  # don't collide with the horn manifold (riser x = CX-8)
            continue
        # front/side orbs (lower + flanks of the ellipse) glow bright E; back orbs e
        tone = "E" if y >= halo_cy - 0.5 else "e"
        if c.px[yy][xx] in (".", "d", "D", "K"):
            c.set(xx, yy, tone)
            # a soft HORIZONTAL side-glow (1px to the outer side) so it reads as a ball
            sdx = 1 if xx >= mcx else -1
            if c.px[yy][xx + sdx] == ".":
                c.set(xx + sdx, yy, "e" if tone == "E" else "h")
    # one bright "measured-outcome" orb crowning the apex of the halo, centred above the
    # mouth (a clear E ball with e flanks) — the maxed qubit state landing on top.
    ax, ay = mcx, halo_cy - ory
    if 1 <= ay < 63:
        c.set(ax, ay, "E")
        c.set(ax - 1, ay, "e")
        c.set(ax + 1, ay, "e")
        if c.px[ay - 1][ax] == ".":
            c.set(ax, ay - 1, "h")                 # a soft upward glow off the apex orb
    # one faint orbit-trail sparkle on each side INSIDE the ring (sparse) so the halo
    # reads as a 3-D cloud, not a flat outline — kept clear of the chandelier + horns.
    for (dx, dy) in ((5, -1), (3, -3)):
        xx, yy = mcx + dx, halo_cy + dy
        if 1 <= xx < 63 and 1 <= yy < 63 and c.px[yy][xx] == ".":
            c.set(xx, yy, "h")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the quantum-simulation lab at upgrade `stage` (1..5). Stage 1 is
    IDENTICAL to the shipped base; each higher stage keeps every prior addition and
    bolts on the next (t2 frost-vent+gauge -> t3 helium reservoir sub-drum -> t4
    cryo-line + microwave-horn array -> t5 superposition orb-cloud + gold rim). The
    slender cryostat tower grows OUT (He drum at its foot) and UP (control horns) into
    a fully built-out quantum rig, crowned by a glowing orb-cloud — while the open-mouth
    gold CHANDELIER signature and the right VIEWING SLIT stay clear and legible.

    Painter's order matches the base draw order; the cumulative stage masses are added
    AFTER the base so they occlude correctly: the He drum + horns sit in front of /
    beside the tower foot and flank, and the t5 orb-cloud + gold rim crown the mouth on
    top of the chandelier context (haloing AROUND the hero, never over its centre)."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    base_shadow(c)            # contact shadow + foot skirt (under / back)
    tower(c)                  # the tall slender free-standing CRYOSTAT TOWER cylinder
    stage_rings(c)            # K dilution-fridge stage rings girdling the drum
    frost(c)                  # c/h cryo frost shimmer near the base
    cryostat_mouth(c)         # OPEN K-rimmed cryostat mouth at the top
    chandelier(c)             # SIGNATURE: suspended gold quantum chandelier + qubit + ghosts
    right_slit(c)             # GLOWING right viewing slit (hero on the SHADED face) + gauge
    annex(c, ANNEX)           # front-right equipment annex (drawn last, sits in front)

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    if stage >= 2:
        stage2_frostvent_gauge(c)
    if stage >= 3:
        stage3_helium_drum(c)
    if stage >= 4:
        stage4_cryo_horns(c)
    if stage >= 5:
        stage5_orbcloud(c)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/axiom"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "quantum-simulation-lab"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped quantum-simulation-lab.png, so it does NOT overwrite the
    base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": AXIOM, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"axiom_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"axiom_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
