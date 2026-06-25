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

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box, RX, RY, LX, LY

VOLT = {"K": "#15181d", "W": "#eef2f6", "L": "#cdd6dd", "M": "#9aa3ad", "D": "#6c7682", "d": "#49515b",
        "h": "#d6f9ff", "c": "#aef0fb", "g": "#38cfe2", "G": "#1f8ba0",
        "o": "#ffe85a", "O": "#fff7a8", "r": "#c89a14"}


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


def build():
    c = Canvas()
    # painter's order: slab (foundation) -> back wings -> open-yard icons ->
    # power line + cupola + vane signature on the right wing.
    slab = yard_slab(c)
    lw = left_wing(c, slab)
    rw = right_wing(c, slab)
    yard_icons(c, slab, lw)
    power_line(c, rw)
    mx, my = cupola(c, rw)
    weathervane(c, mx, my)

    spec = {"width": 64, "height": 64, "palette": VOLT, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/volt_lab_workshop.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
