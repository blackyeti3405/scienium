#!/usr/bin/env python3
"""
Workshop — Volt Lab starter building (BESPOKE-FORM REBUILD · OPEN-CONCEPT L / ^).

This is NOT the gateway cube (the old version was a closed box with a roll-up
shutter — it read as a re-skinned gateway). This rebuild is the OPEN-CONCEPT
maker-yard:

  * a low CONCRETE YARD SLAB is the foundation — a flat ground diamond the
    viewer looks DOWN onto;
  * two LOW WINGS sit on its BACK edges and meet at the back apex in an L / `^`:
      - back-LEFT wing  : a tool/storage shed along the back-left slab edge;
      - back-RIGHT wing : a taller forge/power shed along the back-right edge;
    the FRONT-CENTER of the slab is left OPEN — that open court IS the building;
  * out in that open middle stand the maker "icons": a K-outlined ANVIL on a
    stand (the workbench), a D TOOL-RACK against the left wing, and a c readout
    post — so the yard reads as an ACTIVE work-yard, not a closed wall;
  * the slab's open front edges are ringed by an o/K HAZARD-STRIPE kerb.

Signature (registered): a spinning anvil-and-wrench weathervane on a small
corrugated cupola atop the TALLER (right/forge) wing's roof, throwing a tight
spray of yellow sparks. A readable anvil+wrench silhouette (NOT a symmetric X).

Volt motifs: corrugated wing roofs + K rivets, a glowing o power line, o/K
hazard kerb ringing the yard, cyan readout, conduit.
"""
import os
import sys
import json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, RX, RY, LX, LY

# Base Volt palette (shared keys) + a few EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so workshop.png is unchanged):
#   b  deep cool steel  — matured structure tone for t4+ new masses
#   e  energized cyan glow (mid)   E  energized cyan glow (bright) — the t4/t5 power
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
VOLT = {"K": "#15181d", "W": "#eef2f6", "L": "#cdd6dd", "M": "#9aa3ad", "D": "#6c7682", "d": "#49515b",
        "h": "#d6f9ff", "c": "#aef0fb", "g": "#38cfe2", "G": "#1f8ba0",
        "o": "#ffe85a", "O": "#fff7a8", "r": "#c89a14",
        "b": "#3b4350", "e": "#6fe6f4", "E": "#caf7ff", "q": "#f3c63a"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def rivet(c, x, y):
    c.set(int(round(x)), int(round(y)), "K")


def corrugate_roof(c, box, ribs=(0.3, 0.55, 0.8), ch="D", rivets=True):
    """Run a few clean D corrugation ribs across a wing roof (parallel to the
    left->front edge). Keep it sparse so small wing roofs don't read as noise."""
    for v in ribs:
        c.line(box.roof_pt(0.12, v), box.roof_pt(0.88, v), ch)
    if rivets:
        for u in (0.3, 0.7):
            p = box.roof_pt(u, 0.14)
            rivet(c, p[0], p[1])


def stripe_edge(c, p0, p1, n):
    """o/K hazard teeth along an edge from p0 to p1."""
    for k in range(n + 1):
        t = k / n
        x = p0[0] + t * (p1[0] - p0[0])
        y = p0[1] + t * (p1[1] - p0[1])
        c.set(int(round(x)), int(round(y)), "o" if k % 2 == 0 else "K")


# ── 1. YARD SLAB — the open concrete floor (drawn FIRST, the foundation) ──────
def yard_slab(c):
    """A large low concrete slab the viewer looks down onto. The two wings will
    sit on its back edges; its front-center stays OPEN as the work-yard. Slab is
    wide & flat (h=3) so it reads as ground, not a building."""
    slab = Box(top=(32, 26), wx=11, wy=11, h=3)
    # deck: lit lavender, brighter back-left triangle
    c.fill_poly([slab.r_top, slab.r_right, slab.r_front, slab.r_left], "M")
    c.fill_poly([slab.r_top, slab.r_left, slab.r_front], "L")
    # the 3px slab edge on the two FRONT faces (so it reads as a raised pad)
    c.fill_poly([slab.r_left, slab.r_front, slab.w_front, slab.w_left], "d")
    c.fill_poly([slab.r_front, slab.r_right, slab.w_right, slab.w_front], "D")
    # outline
    for a, b in [(slab.r_top, slab.r_right), (slab.r_right, slab.r_front),
                 (slab.r_front, slab.r_left), (slab.r_left, slab.r_top),
                 (slab.r_left, slab.w_left), (slab.r_front, slab.w_front),
                 (slab.r_right, slab.w_right),
                 (slab.w_left, slab.w_front), (slab.w_front, slab.w_right)]:
        c.line(a, b, "K")
    # HAZARD-STRIPE kerb along the two FRONT deck edges (rings the open yard)
    stripe_edge(c, slab.r_left, slab.r_front, 11)
    stripe_edge(c, slab.r_front, slab.r_right, 11)
    return slab


# ── 2. BACK-LEFT WING — low tool/storage shed on the slab's back-left edge ────
def left_wing(c, slab):
    """A low shed running along the BACK-LEFT slab edge (long toward the LEFT via
    wy, slim in wx). Its base seats on the slab back-left edge; it rises only a
    little so the yard stays open and the right wing reads taller."""
    # seat the wing on the back-LEFT slab edge: shift its apex up-left off the
    # shared corner so a clear notch opens between the two wings, and keep it LOW.
    apex = (slab.r_top[0] - 3, slab.r_top[1] - 10)
    wing = Box(top=apex, wx=3, wy=7, h=10)
    wing.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    corrugate_roof(c, wing)
    # rivet line just under the lit eave
    for u in (0.25, 0.55, 0.85):
        p = wing.left_pt(u, 1.4)
        c.set(int(round(p[0])), int(round(p[1])), "L")
    # small cyan window high on the lit (left) face
    wing.window(c, "left", 0.22, 0.52, 2.4, 5.6, glass="g", mullions=1)
    # corrugated-wall grooves on the lower lit face (clean vertical D ribs) +
    # a small D access hatch toward the front — reads as a storage shed.
    for u in (0.62, 0.74, 0.86):
        c.line(wing.left_pt(u, 6.5), wing.left_pt(u, 9.0), "D")
    c.fill_poly([wing.left_pt(0.6, 6.0), wing.left_pt(0.9, 6.0),
                 wing.left_pt(0.9, 6.4), wing.left_pt(0.6, 6.4)], "K")  # hatch lintel
    return wing


# ── 3. BACK-RIGHT WING — taller forge/power shed on the back-right edge ───────
def right_wing(c, slab):
    """A shed running along the BACK-RIGHT slab edge (long toward the RIGHT via
    wx, slim in wy). Made a little TALLER than the left wing so it clearly carries
    the cupola+vane signature. Shaded (right) face carries a forge vent +
    readout. Shares the back apex with the left wing -> the L / ^ meets there."""
    # seat the wing on the back-RIGHT slab edge: shift its apex up-right off the
    # shared corner so the notch between the wings stays open; a bit TALLER.
    apex = (slab.r_top[0] + 3, slab.r_top[1] - 11)
    wing = Box(top=apex, wx=7, wy=2, h=11)
    wing.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    corrugate_roof(c, wing)
    # K rivets down the front vertical seam
    for vv in (3, 6, 9, 12):
        rivet(c, wing.r_front[0], wing.r_front[1] + vv)
    # cyan readout panel on the shaded right face (forge status)
    wing.window(c, "right", 0.18, 0.52, 3.0, 7.0, glass="g", mullions=1)
    # dark forge vent louver block lower-right on the shaded face
    c.fill_poly([wing.right_pt(0.62, 3.0), wing.right_pt(0.9, 3.0),
                 wing.right_pt(0.9, 8.4), wing.right_pt(0.62, 8.4)], "d")
    for vv in (4.0, 5.3, 6.6, 7.9):
        c.line(wing.right_pt(0.64, vv), wing.right_pt(0.88, vv), "K")
    for a, b in [(wing.right_pt(0.62, 3.0), wing.right_pt(0.9, 3.0)),
                 (wing.right_pt(0.62, 8.4), wing.right_pt(0.9, 8.4)),
                 (wing.right_pt(0.62, 3.0), wing.right_pt(0.62, 8.4)),
                 (wing.right_pt(0.9, 3.0), wing.right_pt(0.9, 8.4))]:
        c.line(a, b, "K")
    return wing


# ── 4. YARD ICONS — hero anvil + a few shop icons furnishing the open court ───
def _stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings) at top-left (x0,y0).
    '.' = skip (transparent)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


def yard_icons(c, slab, lw):
    """The maker "icons" furnishing the OPEN middle so the court reads as a busy
    work-yard: a hero K-outlined ANVIL (centre), a D TOOL-RACK hung on the left
    wing's front face, plus a small spread of low shop gear sitting on the open
    slab — a K-outlined WORKBENCH with a tiny c part, a stack of D/M parts CRATES,
    a M/L GEAR-COG, and a tiny o/O BRAZIER glow. Each is a distinct, well-spaced
    object so the yard furnishes without crowding into mush at 64px."""

    # --- HERO ANVIL: centered, pulled FORWARD onto open floor, clear of wings. ---
    cxf, cyf = slab.roof_pt(0.5, 0.32)
    cx, cy = int(round(cxf)), int(round(cyf))
    anvil = [
        "..KKKKKK.",   # flat struck TOP rim (long flat face)
        "KKLMMMMdK",   # struck-face: horn point off LEFT (K), lit L, M band, d
        ".KKDDDddK",   # full body block, shaded toward the right
        "...KDdK..",   # waisted neck (clearly narrower)
        "...KDdK..",   # stand
        "..KKKKKK.",   # splayed foot base
    ]
    ax0 = cx - 4
    ay0 = cy - 4
    _stamp(c, ax0, ay0, anvil)
    # contact shadow under the foot on the deck (grounds the anvil)
    for fx in (ax0 + 2, ax0 + 4, ax0 + 6):
        c.set(fx, ay0 + 6, "d")
    # tiny o/O spark off the struck top (working anvil)
    c.set(ax0 + 6, ay0 - 1, "o")
    c.set(ax0 + 7, ay0, "O")

    # --- TOOL-RACK mounted flat on the LEFT WING's front (right/shaded) face, so
    #     it reads as hung against the wing, not floating on the floor. ---
    # left wing front face is its right_pt face (the slim shaded face toward yard)
    bd = lw.right_pt(0.5, 3.5)
    bx, by = int(round(bd[0])), int(round(bd[1]))
    # vertical D rack rail with two M tools + an o peg
    c.line((bx, by), (bx, by + 5), "D")
    c.set(bx, by, "K")
    c.line((bx + 1, by + 1), (bx + 2, by + 1), "M")   # hung tool 1
    c.line((bx + 1, by + 3), (bx + 2, by + 2), "L")   # hung tool 2 (angled, glint)
    c.set(bx - 1, by + 4, "M")

    # === SHOP ICONS furnishing the open court ==================================
    # Three small, distinct, K-outlined objects in the open pockets that flank the
    # hero anvil (the anvil occupies ~x24..32, y34..44 and is the centrepiece):
    #   • LEFT pocket  : a stack of parts CRATES,
    #   • FRONT pocket : a GEAR-COG low in the V toward the viewer,
    #   • RIGHT pocket : a small forge BRAZIER with the court's one warm glow.
    # Crates/gear use cool K/M/D/L so they read on the lit slab; warm o/O is
    # reserved for the single brazier so the court stays clean (no speckle).

    # --- PARTS CRATES: a stack of two D/M boxes in the open LEFT pocket. ---
    crates = [
        ".KKKK.",   # upper crate lid (inset, sits on the lower box)
        ".KMDMK",   # upper crate face (D shadow under the lid)
        ".KMMMK",
        "KKKKKK",   # seam: lower crate is one wider
        "KMMDMK",   # lower crate face (D side-shadow)
        "KMMMMK",
        "KKKKKK",   # lower crate base
    ]
    _stamp(c, 12, 40, crates)

    # --- GEAR-COG: a small toothed cog low in the FRONT pocket (the V). ---
    gear = [
        ".K.K.",   # top teeth (cool steel, no warm speckle)
        "KMDMK",   # rim, shaded
        "K.c.K",   # side teeth frame a cyan bore (the one cool accent)
        "KMDMK",
        ".K.K.",   # bottom teeth
    ]
    _stamp(c, 26, 46, gear)

    # --- BRAZIER / FORGE GLOW: a tiny D drum with an o/O ember glow in the RIGHT
    #     pocket — the one warm accent on the court. ---
    brazier = [
        "..O..",   # ember spark rising
        ".oOo.",   # glowing coals lip
        "KDDDK",   # drum body (shaded)
        "KdddK",   # drum base
    ]
    _stamp(c, 40, 43, brazier)


# ── 5. POWER LINE — glowing o conduit feeding up the right wing into the cupola
def power_line(c, rw):
    """A glowing o power line along the right wing's lit eave and up the back
    ridge into the cupola base, so the 'powered vane' reads."""
    c.line(rw.left_pt(0.08, 1.2), rw.left_pt(0.92, 1.2), "o")
    c.line(rw.left_pt(0.08, 2.0), rw.left_pt(0.92, 2.0), "r")
    base = rw.roof_pt(0.5, 0.5)
    c.line((base[0], base[1]), (base[0], base[1] - 5), "o")


# ── 6. SIGNATURE — corrugated cupola + anvil/wrench weathervane on RIGHT wing ─
def cupola(c, rw):
    """A small corrugated M/D cupola seated on the taller RIGHT wing's roof.
    Returns (mast_x, cap_y): where the mast emerges from the cupola cap."""
    bxf, byf = rw.roof_pt(0.5, 0.5)
    bx, by = int(round(bxf)), int(round(byf))
    half = 4
    top_y = by - 6
    c.fill_poly([(bx - half, by), (bx + half, by),
                 (bx + half, top_y), (bx - half, top_y)], "M")
    c.fill_poly([(bx + 1, by), (bx + half, by),
                 (bx + half, top_y), (bx + 1, top_y)], "D")
    for rx in (bx - half + 2, bx - 1, bx + 2):
        c.line((rx, top_y + 1), (rx, by - 1), "D")
    cap_y = top_y - 3
    c.fill_poly([(bx - half - 1, top_y), (bx, cap_y), (bx + half + 1, top_y)], "L")
    c.line((bx - half - 1, top_y), (bx, cap_y), "W")
    c.line((bx, cap_y), (bx + half + 1, top_y), "M")
    c.set(bx - 2, cap_y + 1, "W")
    c.line((bx - half, by), (bx + half, by), "K")
    c.line((bx - half, by), (bx - half, top_y), "K")
    c.line((bx + half, by), (bx + half, top_y), "K")
    c.line((bx - half - 1, top_y), (bx, cap_y), "K")
    c.line((bx, cap_y), (bx + half + 1, top_y), "K")
    rivet(c, bx - half, by - 1)
    rivet(c, bx + half, by - 1)
    c.set(bx - 1, by, "o")
    c.set(bx, by, "O")
    return bx, cap_y


def weathervane(c, mast_x, mast_base_y):
    """A short K mast topped by an anvil+wrench weathervane SILHOUETTE seated on
    the cupola, throwing a tight spray of yellow sparks off the struck face.

    The anvil is dominant (pointed HORN off the LEFT, flat struck TOP, waisted
    neck, splayed FOOT), with a single wrench (lighter M, K-outlined) rising
    up-RIGHT behind it with an open-jaw 'C' head — a readable anvil+wrench, NOT
    an X of two identical tools (that crossed-tools emblem is the Arena's)."""
    mast_top = mast_base_y - 1
    c.line((mast_x, mast_base_y), (mast_x, mast_top), "K")

    # Legend: K outline, D anvil body, d under-cut, M highlight / wrench shaft,
    #         L wrench glint, '.' skip.
    art = [
        "..........KMK.",   # wrench OPEN-JAW "C" head ...
        "..........KLKK",   # ... open L mouth
        ".KKKKKKKKK.MK.",   # anvil flat TOP rim ....... wrench shaft (M) climbs
        "KMMMMMMMMMKMK.",   # struck-face highlight band (M)
        "KDDDDDDDDDKM..",   # full top block (D) — wide anvil body
        ".KKDDDDDDKKddK",   # HORN tapers off LEFT; heel STEP + under-cut at right
        "...KDDDDK.....",   # WAIST narrows
        "..KDDDDDDK....",   # FOOT splays out
        "..KKKKKKKK....",   # wide foot base (seats on the mast)
    ]
    gx0 = mast_x - 5
    gy0 = mast_top - (len(art) - 1)
    for j, row in enumerate(art):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(gx0 + i, gy0 + j, ch)
    for sx, sy, ch in [(2, 1, "o"), (1, 0, "O"), (3, 0, "o"), (1, -1, "O")]:
        c.set(gx0 + sx, gy0 + sy, ch)


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS forge/power/
# automation structure onto the prior form — never restarts, never recolors the
# whole building. Theme: the maker forge-yard grows into a fully built-out, high-
# tech forge-yard. Colours mature stage by stage; gold (q) only as a t5 flourish.
#
#   t2  small functional add   : a stout forge FLUE STACK + smoke off the right wing
#   t3  structural add         : a corrugated WORK CANOPY on posts over the court
#   t4  major add              : a tall material GANTRY CRANE + glowing cyan hoist
#   t5  crowning feature       : a glowing POWER-BUS / arc-coil core + gold banners
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_flue(c, rw):
    """t2 — SMALL FUNCTIONAL ADD: a short corrugated FORGE FLUE STACK rising off the
    back of the right (forge) wing's roof, capped with a vent cowl and trailing a
    thin smoke wisp. On-theme (more forge), modest, base palette + a brightened o
    spark at the firebox. Seated toward the BACK of the roof so it never collides
    with the cupola/vane signature at the roof centre."""
    bxf, byf = rw.roof_pt(0.5, 0.5)
    bx = int(round(bxf))
    base_y = int(round(byf)) - 1
    sx = bx - 8                       # back-left of the cupola, clear of the vane
    top = base_y - 9
    # stack body (lit M / shaded D, K outline), 3px wide
    c.fill_poly([(sx, base_y), (sx + 2, base_y), (sx + 2, top), (sx, top)], "M")
    c.line((sx + 2, top), (sx + 2, base_y), "D")
    c.line((sx, base_y), (sx, top), "K")
    c.line((sx + 2, base_y), (sx + 2, top), "K")
    # a couple of corrugation bands
    for yy in (top + 3, top + 6):
        c.line((sx, yy), (sx + 2, yy), "D")
    # vent cowl cap (wider lip)
    c.fill_poly([(sx - 1, top), (sx + 3, top), (sx + 3, top - 2), (sx - 1, top - 2)], "L")
    c.line((sx - 1, top - 2), (sx + 3, top - 2), "W")
    c.line((sx - 1, top - 2), (sx - 1, top), "K")
    c.line((sx + 3, top - 2), (sx + 3, top), "K")
    c.line((sx - 1, top), (sx + 3, top), "K")
    # firebox glow at the stack foot + thin rising smoke wisp
    c.set(sx + 1, base_y - 1, "o")
    for j, dx in enumerate((1, 0, 1, 2)):
        c.set(sx + dx, top - 3 - j * 2, "D")
    c.set(sx + 2, top - 9, "M")


def stage3_canopy(c, slab, lw):
    """t3 — STRUCTURAL ADD: a corrugated lean-to WORK CANOPY bolted onto the LEFT
    wing's front, sloping out over the open court on two slim posts so it shelters
    the workbench. A real new structural mass (roof plane + posts), not a prop.
    Introduces the matured deep-steel tone `b` for the posts/underside shadow."""
    # roof plane: a parallelogram sloping down from high (at the left wing eave)
    # to low (out over the court). Author it directly in screen space.
    hx, hy = lw.right_pt(0.5, 1.5)          # high inner edge, on the wing front
    hx, hy = int(round(hx)), int(round(hy))
    # inner edge runs along the wing front (up-left .. down-right); outer edge is
    # the same edge shifted DOWN-FRONT (toward viewer) and a touch lower (slope).
    inA = (hx - 5, hy - 2)
    inB = (hx + 5, hy + 3)
    outA = (inA[0] - 4, inA[1] + 7)
    outB = (inB[0] - 4, inB[1] + 7)
    # underside shadow first (deep steel), then the lit corrugated top
    c.fill_poly([inA, inB, outB, outA], "b")
    topA = (inA[0], inA[1] - 1)
    topB = (inB[0], inB[1] - 1)
    c.fill_poly([topA, topB, (outB[0], outB[1] - 1), (outA[0], outA[1] - 1)], "L")
    # corrugation ribs running down the slope
    for t in (0.2, 0.4, 0.6, 0.8):
        a = (topA[0] + t * (topB[0] - topA[0]), topA[1] + t * (topB[1] - topA[1]))
        b = (outA[0] + t * (outB[0] - outA[0]), outA[1] - 1 + t * (outB[1] - outA[1]))
        c.line(a, b, "M")
    # bright front lip + K outline of the canopy
    c.line((outA[0], outA[1] - 1), (outB[0], outB[1] - 1), "W")
    for a, b in [(topA, topB), (topB, (outB[0], outB[1] - 1)),
                 ((outB[0], outB[1] - 1), (outA[0], outA[1] - 1)),
                 ((outA[0], outA[1] - 1), topA)]:
        c.line(a, b, "K")
    # two slim support posts dropping from the front corners to the slab
    for px, py in (outA, outB):
        c.line((px, py), (px, py + 9), "b")
        c.line((px + 1, py), (px + 1, py + 9), "D")
        c.set(px, py + 9, "K")
    # a small hung worklight under the canopy (cyan, sheltered)
    mid = ((outA[0] + outB[0]) // 2, (outA[1] + outB[1]) // 2 + 2)
    c.set(mid[0], mid[1], "g")
    c.set(mid[0], mid[1] + 1, "G")


def stage4_gantry(c, slab):
    """t4 — MAJOR ADD: a tall material GANTRY CRANE straddling the OPEN COURT — a
    deep-steel lattice leg rising off the LEFT slab edge, a top beam crossing RIGHT
    over the court, and a hoist trolley lowering a glowing CYAN hook + slung I-beam
    stock down into the open middle. The prominent new vertical mass that says
    'this yard now moves heavy stock'. Palette matures: deep `b` lattice + energized
    cyan `e/E` glow on the hoist. Kept fully on-canvas and clear of the cupola/vane."""
    # leg foot: on the LEFT side of the OPEN COURT, in FRONT of the wings, so the
    # mast rises clear in front of the building and the crane reads as a silhouette.
    lx, ly = slab.roof_pt(0.30, 0.12)       # left-front of the open court
    lx, ly = int(round(lx)), int(round(ly))
    top_y = ly - 30                          # TALL mast — rises above the wings/court
    # leg: twin uprights + X-bracing (lattice mast), 3px wide
    c.line((lx, ly), (lx, top_y), "b")
    c.line((lx + 2, ly), (lx + 2, top_y), "D")
    for yy in range(top_y + 3, ly - 1, 4):   # X-bracing rungs
        c.line((lx, yy), (lx + 2, yy + 2), "b")
        c.line((lx + 2, yy), (lx, yy + 2), "b")
    c.set(lx, top_y, "K")
    c.set(lx + 2, top_y, "K")
    c.line((lx - 1, ly), (lx + 3, ly), "K")  # foot plate on the slab
    # top beam (cantilever jib): from the mast top crossing RIGHT and slightly DOWN
    # over the court, ending above the court's right side (stays on-canvas, x<=42)
    beam_x1, beam_y1 = lx + 1, top_y
    beam_x2, beam_y2 = lx + 22, top_y + 6
    c.line((beam_x1, beam_y1 - 1), (beam_x2, beam_y2 - 1), "M")  # lit top chord
    c.line((beam_x1, beam_y1), (beam_x2, beam_y2), "b")          # body
    c.line((beam_x1, beam_y1 + 1), (beam_x2, beam_y2 + 1), "K")  # under-edge
    for t in (0.2, 0.4, 0.6, 0.8):           # truss web ticks
        mx = int(beam_x1 + t * (beam_x2 - beam_x1))
        my = int(beam_y1 + t * (beam_y2 - beam_y1))
        c.set(mx, my, "D")
    # hoist trolley near mid-beam + cable dropping a glowing cyan hook into the court
    tx = int(beam_x1 + 0.55 * (beam_x2 - beam_x1))
    ty = int(beam_y1 + 0.55 * (beam_y2 - beam_y1))
    c.fill_poly([(tx - 1, ty + 1), (tx + 2, ty + 1), (tx + 2, ty + 3), (tx - 1, ty + 3)], "D")
    c.line((tx - 1, ty + 1), (tx + 2, ty + 1), "K")
    hook_y = ty + 10
    c.line((tx, ty + 3), (tx, hook_y), "K")          # cable
    c.set(tx, hook_y, "E")                            # glowing hook
    c.set(tx, hook_y + 1, "e")
    # a slung I-beam stock glowing faintly on the hook, just above the court floor
    c.line((tx - 3, hook_y + 2), (tx + 3, hook_y + 2), "e")
    c.line((tx - 3, hook_y + 3), (tx + 3, hook_y + 3), "G")
    c.set(tx - 3, hook_y + 2, "K")
    c.set(tx + 3, hook_y + 2, "K")


def stage5_powercore(c, rw, slab):
    """t5 — CROWNING FEATURE = FULLY EVOLVED forge-yard. A glowing POWER-BUS arc-coil
    CORE is mounted high on the right (forge) wing — three coil rings around a bright
    cyan core throwing a short energy ARC to the flue stack — and the yard is dressed
    out with GOLD premium trim (a ridge banner + a hazard-chevron pennant on the
    gantry). Reads as elite, still recognizably the same workshop, just maxed out."""
    # --- power-core coil tower mounted ON the right (forge) wing roof, back-right,
    #     so it sits clearly on the building (not floating off-canvas) ---
    bxf, byf = rw.roof_pt(0.78, 0.30)
    cx = int(round(bxf))
    roof_y = int(round(byf))
    cy = roof_y - 9                          # core hovers just above its plinth
    # a short K/b plinth on the roof holding the coil tower up
    c.fill_poly([(cx - 1, roof_y), (cx + 1, roof_y), (cx + 1, cy + 2), (cx - 1, cy + 2)], "b")
    c.line((cx - 1, roof_y), (cx - 1, cy + 2), "K")
    c.line((cx + 1, roof_y), (cx + 1, cy + 2), "K")
    # three stacked coil rings around the core (energized cyan), compact 2:1 ellipses
    import math
    for r, ch in [(4, "G"), (3, "g"), (4, "e")]:
        for a in range(0, 360, 24):
            x = cx + r * math.cos(math.radians(a))
            y = cy + r * 0.5 * math.sin(math.radians(a))
            c.set(x, y, ch)
        cy -= 2                              # stack the rings upward into a coil
    # bright cyan core at the top of the coil
    for xx, yy, ch in [(0, 0, "W"), (-1, 0, "E"), (1, 0, "E"), (0, -1, "E"), (0, 1, "e")]:
        c.set(cx + xx, cy + yy, ch)
    core_top = (cx, cy)
    # energy ARC zig-zag leaping LEFT from the core toward the cupola/vane signature
    arc = [(cx - 2, cy + 1), (cx - 5, cy - 1), (cx - 8, cy + 1), (cx - 11, cy - 1)]
    for i in range(len(arc) - 1):
        c.line(arc[i], arc[i + 1], "E")
    for px, py in arc:
        c.set(px, py - 1, "e")

    # --- GOLD premium trim (t5 flourish only) ---
    # a gold ridge banner hung along the right wing's lit eave
    e0 = rw.left_pt(0.12, 0.4)
    e1 = rw.left_pt(0.9, 0.4)
    c.line(e0, e1, "q")
    # gold corner bosses on the slab front kerb (elite trim, sparse)
    for u in (0.0, 1.0):
        p = slab.r_front
        bossL = slab.r_left
        bossR = slab.r_right
    cf = slab.r_front
    c.set(int(cf[0]), int(cf[1]) - 1, "O")
    c.set(int(cf[0]) - 1, int(cf[1]), "q")
    c.set(int(cf[0]) + 1, int(cf[1]), "q")
    # a small gold hazard-chevron pennant flying from the gantry mast top (matches
    # stage4_gantry's foot roof_pt(0.30,0.12) raised by its 30px mast height)
    gx, gy = slab.roof_pt(0.30, 0.12)
    gx, gy = int(round(gx)), int(round(gy)) - 31
    c.line((gx + 1, gy), (gx + 1, gy + 3), "K")          # short pennant staff
    c.fill_poly([(gx + 2, gy), (gx + 7, gy + 2), (gx + 2, gy + 3)], "q")
    c.line((gx + 2, gy), (gx + 7, gy + 2), "O")
    c.set(gx + 4, gy + 2, "K")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the workshop at upgrade `stage` (1..5). Stage 1 is IDENTICAL to the
    shipped base; each higher stage keeps every prior addition and bolts on the next
    (t2 flue → t3 canopy → t4 gantry → t5 power-core+gold). Painter's order keeps
    rooftop/overhead additions on top of the masses they grow from."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    slab = yard_slab(c)
    lw = left_wing(c, slab)
    rw = right_wing(c, slab)
    yard_icons(c, slab, lw)
    power_line(c, rw)
    mx, my = cupola(c, rw)
    weathervane(c, mx, my)

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    if stage >= 2:
        stage2_flue(c, rw)
    if stage >= 3:
        stage3_canopy(c, slab, lw)
    if stage >= 4:
        stage4_gantry(c, slab)
    if stage >= 5:
        stage5_powercore(c, rw, slab)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/volt_lab"
PREVIEW_DIR = "/path/to/scienium/art/preview"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped workshop.png, so it does NOT overwrite the base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": VOLT, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"volt_lab_workshop{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"workshop{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"volt_lab_workshop{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
