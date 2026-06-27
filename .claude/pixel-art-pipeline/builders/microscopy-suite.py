#!/usr/bin/env python3
"""
Microscopy Suite — BioCore economy building (BESPOKE form, STANDARD role).

A COMPACT IMAGING PAVILION with a DOMED OPTICS-DRUM TURRET. The body is a low
square `Box` (a controlled-light imaging room, darker M/D walls with D/d wood
seams), and riding the BACK of its flat roof is a short `cylinder` optics drum
capped by a low L/W dome lens with a c porthole band — the optics turret. This
drum-on-a-box silhouette is distinct from the Greenhouse gable, the Vault block
and the Volt AI-Incubator's wide standalone drum (here the drum is a SMALL
turret on a box).

  • OPENING SIDE = LEFT: the hero is a wide K-framed glass garage-style
    imaging-bay door on the LIT LEFT face — g/c panes, h reflections, a soft o
    interior grow-glow — the way samples roll in. The RIGHT face is plainer
    (one small c porthole).
  • SIGNATURE (one-of-one): a giant microscope EYEPIECE barrel tilts up-left from
    the turret and projects a huge magnified live-cell HOLOGRAM above the roof —
    a translucent c/h disc holding a round cell (g membrane ring, G/g cytoplasm,
    O/o nucleus, c organelle dots, a faint pinch = mid-division), fed by a thin
    o/O projector cone, ringed by a c glow halo + h sparkles, with a tiny g
    micron scale-bar tick selling the magnification.

Composed from art/isobuild.{Box,cylinder} — NO iso.draw_cube / base_windows.
BioCore palette ONLY (greens + teal + warm amber, never grey).
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

BIO = {"K": "#1a2417", "W": "#e8f2d8", "L": "#c4dba6", "M": "#9fc07e", "D": "#6f9456", "d": "#4a6e3a",
       "h": "#d2f7ec", "c": "#9fefcf", "g": "#36cc9e", "G": "#1d8f70",
       "o": "#f0b24d", "O": "#ffd488", "r": "#b9701e"}


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


def disc(c, cx, cy, rx, ry, ch, half=None):
    """Filled iso ellipse. If `half` is 'l'/'r', only that side is filled."""
    for yy in range(int(-ry), int(ry) + 1):
        t = 1 - (yy / ry) ** 2
        if t < 0:
            continue
        hw = rx * (t ** 0.5)
        for xx in range(int(-hw), int(hw) + 1):
            if half == "l" and xx > 0:
                continue
            if half == "r" and xx < 0:
                continue
            c.set(cx + xx, cy + yy, ch)


# ── VERTICAL BUDGET (top→bottom, all must fit 64px) ───────────────────────────
#   hologram disc   y ~ 1..17   (centre 9, r 8)
#   eyepiece barrel y ~ 16..24
#   optics turret   y ~ 20..30  (rides the BACK roof of the body)
#   body roof       back corner y ~ 27 .. front corner y ~ 38
#   body walls      y ~ 38..50
# ── BODY GEOMETRY ─────────────────────────────────────────────────────────────
# Low square box; back-top corner high enough that the turret sits ON the roof.
BODY_TOP = (30, 27)
BODY_WX = 11
BODY_WY = 11
BODY_H = 12

# Optics drum turret: a short cylinder riding the BACK-CENTRE of the flat roof.
# Placed so its base ellipse sits down on the roof's back-centre (~y 28).
TURRET_CX = 30
TURRET_TOP_Y = 23           # top-ellipse centre of the drum
TURRET_RX = 6
TURRET_RY = 3
TURRET_H = 5


# ── BODY (a low controlled-light imaging room) ───────────────────────────────
def body(c):
    """Low square Box — darker M/D walls (controlled light) with D/d wood-frame
    seams + thin c indicator dots. Returns the Box for face placement."""
    b = Box(BODY_TOP, BODY_WX, BODY_WY, BODY_H)
    b.draw(c, roof="D", lwall="M", rwall="D", roof_hi="L", outline="K")

    # darken the roof a touch (controlled-light room reads matte) + wood seam grid
    # roof seam lines running both roof axes (D/d wood frame)
    for f in (0.34, 0.66):
        c.line(b.roof_pt(0.0, f), b.roof_pt(1.0, f), "d")
        c.line(b.roof_pt(f, 0.0), b.roof_pt(f, 1.0), "d")
    # a brighter L back-roof edge already set by draw(); add one L sheen ridge
    c.line(b.roof_pt(0.0, 0.5), b.roof_pt(0.5, 0.5), "L")

    # --- wood-frame corner seams (D/d) down the two lit/shaded faces ---
    c.line(b.r_front, b.w_front, "d")                       # front corner (deep)
    c.line(b.left_pt(0.0, 0), b.left_pt(0.0, BODY_H), "D")  # left back jamb
    c.line(b.right_pt(1.0, 0), b.right_pt(1.0, BODY_H), "d")

    # thin c indicator dots along the right face (status LEDs of the dark room)
    for u in (0.30, 0.55, 0.80):
        p = b.right_pt(u, 2.0)
        c.set(p[0], p[1], "c")
    return b


# ── LEFT imaging-bay door (the HERO opening) ─────────────────────────────────
def bay_door(c, b):
    """A wide K-framed glass garage-style imaging-bay door filling the LIT LEFT
    face — g/c panes following the iso, h reflection sweep, soft o interior glow
    spilling at the threshold. This is the dominant feature of the building and
    marks the opening side as LEFT."""
    u0, u1 = 0.10, 0.92
    vt, vb = 2.2, BODY_H - 0.6

    # K outer frame (filled rect behind the glass)
    c.fill_poly([b.left_pt(u0, vt), b.left_pt(u1, vt),
                 b.left_pt(u1, vb), b.left_pt(u0, vb)], "K")

    # one clean glass leaf inset from the K frame
    gi = 0.04
    gu0, gu1, gvt, gvb = u0 + gi, u1 - gi, vt + 0.9, vb - 0.5
    c.fill_poly([b.left_pt(gu0, gvt), b.left_pt(gu1, gvt),
                 b.left_pt(gu1, gvb), b.left_pt(gu0, gvb)], "g")
    # three clean vertical light bands across the leaf (lit c -> g -> shaded G)
    third = (gu1 - gu0) / 3.0
    c.fill_poly([b.left_pt(gu0, gvt), b.left_pt(gu0 + third, gvt),
                 b.left_pt(gu0 + third, gvb), b.left_pt(gu0, gvb)], "c")
    c.fill_poly([b.left_pt(gu1 - third, gvt), b.left_pt(gu1, gvt),
                 b.left_pt(gu1, gvb), b.left_pt(gu1 - third, gvb)], "G")

    # two K vertical mullions = the three garage panes
    for um in (gu0 + third, gu1 - third):
        c.line(b.left_pt(um, gvt), b.left_pt(um, gvb), "K")
    # ONE horizontal slat seam (K) mid-door
    midv = gvt + (gvb - gvt) * 0.5
    c.line(b.left_pt(gu0, midv), b.left_pt(gu1, midv), "K")

    # bright h reflection diagonal across the lit pane only
    c.line(b.left_pt(gu0 + 0.02, gvt + 0.6), b.left_pt(gu0 + third - 0.02, gvt + 1.8), "h")

    # soft o INTERIOR GROW-GLOW spilling at the threshold (bottom of the bay)
    c.line(b.left_pt(gu0, gvb), b.left_pt(gu1, gvb), "o")
    c.line(b.left_pt(gu0 + 0.05, gvb + 0.4), b.left_pt(gu1 - 0.05, gvb + 0.4), "O")


def right_porthole(c, b):
    """The plainer RIGHT face gets a single small round c porthole only."""
    p = b.right_pt(0.62, 4.5)
    cx, cy = int(round(p[0])), int(round(p[1]))
    # K rim ring
    for a in range(0, 360, 30):
        x = cx + 2 * math.cos(math.radians(a))
        y = cy + 2 * math.sin(math.radians(a))
        c.set(x, y, "K")
    disc(c, cx, cy, 1.4, 1.4, "G")
    c.set(cx, cy, "c")
    c.set(cx - 1, cy - 1, "h")


# ── OPTICS DRUM TURRET (a small cylinder + dome riding the back roof) ─────────
def optics_turret(c):
    """A short polished optics drum on the back-centre of the roof: M/D cylinder,
    a c porthole band wrapping it, capped by a low L/W dome lens. Plus a small D
    cable conduit running from the drum down the roof."""
    cylinder(c, TURRET_CX, TURRET_TOP_Y, TURRET_RX, TURRET_H,
             top="D", side_l="M", side_r="D", outline="K", ry=TURRET_RY)
    base_y = TURRET_TOP_Y + TURRET_H

    # one soft L sheen column on the lit half of the drum
    for col, ch in ((-3, "L"), (-2, "W")):
        edge = TURRET_RY * max(0.0, 1 - (col / TURRET_RX) ** 2) ** 0.5
        for y in range(int(TURRET_TOP_Y + edge), base_y + 1):
            c.set(TURRET_CX + col, y, ch)

    # --- c PORTHOLE BAND wrapping the drum (greenhouse-glazing motif) ---
    band_y = TURRET_TOP_Y + 2
    for col in range(-TURRET_RX + 1, TURRET_RX):
        t = 1 - (col / TURRET_RX) ** 2
        if t < 0:
            continue
        edge = TURRET_RY * (t ** 0.5)
        yy = int(round(band_y + (TURRET_RY - edge) * 0.5))
        glass = "c" if col <= -2 else ("g" if col <= 2 else "G")
        c.set(TURRET_CX + col, yy, glass)
        c.set(TURRET_CX + col, yy + 1, "G")
    # K rails framing the band + evenly spaced porthole mullions
    for col in range(-TURRET_RX + 1, TURRET_RX):
        t = 1 - (col / TURRET_RX) ** 2
        if t < 0:
            continue
        edge = TURRET_RY * (t ** 0.5)
        yy = int(round(band_y + (TURRET_RY - edge) * 0.5))
        c.set(TURRET_CX + col, yy - 1, "K")
        c.set(TURRET_CX + col, yy + 2, "K")
    for col in range(-TURRET_RX + 2, TURRET_RX - 1, 3):
        t = 1 - (col / TURRET_RX) ** 2
        if t < 0:
            continue
        edge = TURRET_RY * (t ** 0.5)
        yy = int(round(band_y + (TURRET_RY - edge) * 0.5))
        c.set(TURRET_CX + col, yy, "K")
        c.set(TURRET_CX + col, yy + 1, "K")

    # --- low L/W DOME LENS cap on the drum ---
    dome_cx, dome_cy = TURRET_CX, TURRET_TOP_Y - 1
    drx, dry = TURRET_RX - 1, TURRET_RY + 1
    for yy in range(int(-dry), 1):
        t = 1 - (yy / dry) ** 2
        if t < 0:
            continue
        hw = drx * (t ** 0.5)
        for x in range(int(dome_cx - hw), int(dome_cx + hw) + 1):
            c.set(x, dome_cy + yy, "L" if x <= dome_cx else "M")
    # bright W crescent on the lit-back of the dome + a glint
    for a in range(190, 350, 8):
        x = dome_cx + drx * math.cos(math.radians(a))
        y = dome_cy + dry * math.sin(math.radians(a))
        c.set(x, y, "W")
    c.set(dome_cx - 2, dome_cy - 2, "W")
    c.set(dome_cx - 1, dome_cy - 2, "h")
    # K rim along the dome base ellipse (front arc)
    for a in range(0, 181, 8):
        x = dome_cx + drx * math.cos(math.radians(a))
        y = dome_cy + dry * 0.5 * math.sin(math.radians(a))
        c.set(x, y, "K")

    # --- D cable conduit running from the drum base down the front roof ---
    cx0 = TURRET_CX + 3
    for i in range(5):
        c.set(cx0 + i, base_y - 1 + i, "d")
        c.set(cx0 + i, base_y + i, "D")
    return (dome_cx, dome_cy)


# ── SIGNATURE: tilted eyepiece + projected live-cell hologram ────────────────
def eyepiece(c, dome_center):
    """A short tilted eyepiece barrel rising up-LEFT off the turret dome, ending in
    a bright h/W ocular lens — the projector. Kept SHORT + clean (a stout barrel,
    not a long stalk) so the dome stays legible below and the hologram sits clear
    above. Returns the lens tip (cx, cy) for the cone + disc to anchor on."""
    bx, by = dome_center
    bx -= 2                      # root on the lit-left shoulder of the dome
    by -= 1
    # barrel marches up-LEFT (tilted optic) — 6 short steps
    steps = 6
    tip = (bx, by)
    for i in range(steps):
        x = bx - i * 0.85
        y = by - i * 1.1
        xi = int(round(x))
        yi = int(round(y))
        # clean 2px barrel: K left edge, M lit body, D shade
        c.set(xi - 1, yi, "K")
        c.set(xi, yi, "M")
        c.set(xi + 1, yi, "D")
        c.set(xi + 2, yi, "K")
        tip = (xi, yi)
    # the OCULAR lens cup at the top (a small bright disc)
    tx, ty = tip
    for dx in range(-1, 3):
        c.set(tx + dx, ty - 1, "L")
    c.set(tx - 2, ty - 1, "K")
    c.set(tx + 3, ty - 1, "K")
    # bright h/W lens glint
    c.set(tx, ty - 2, "W")
    c.set(tx + 1, ty - 2, "h")
    c.set(tx - 1, ty - 2, "K")
    c.set(tx + 2, ty - 2, "K")
    return (tx, ty - 2)


def cell_hologram(c, lens_tip):
    """A large translucent c/h hologram disc hovering above the roof, holding a
    round live cell mid-division, beamed up from the eyepiece lens by a thin o/O
    projector cone; ringed by a c glow halo, h sparkles + a tiny g micron scale
    bar. The one-of-one signature."""
    lx, ly = lens_tip
    # disc centre: up + slightly LEFT of the lens (along the tilted optic axis)
    dcx = lx - 2
    dcy = ly - 9
    DR = 8                       # disc radius (the big magnified view)

    # --- projector CONE: an amber beam fanning from the lens up into the disc.
    # Drawn FIRST so the disc overlaps its top; two o edges + an O core, widening
    # toward the disc so it reads as a projection cone, not a stick. ---
    cone_top = dcy + DR - 1
    for t in range(0, 9):
        f = t / 8.0
        x = lx + (dcx - lx) * f
        y = ly + (cone_top - ly) * f
        spread = 0.5 + 3.0 * f
        c.set(int(round(x - spread)), int(round(y)), "o")
        c.set(int(round(x + spread)), int(round(y)), "o")
        c.set(int(round(x)), int(round(y)), "O")     # bright core ray

    # --- soft c glow HALO ring (only on empty pixels, painted under the disc) ---
    for a in range(0, 360, 20):
        x = dcx + (DR + 2) * math.cos(math.radians(a))
        y = dcy + (DR + 1) * 0.9 * math.sin(math.radians(a))
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < 64 and 0 <= yi < 64 and c.px[yi][xi] == ".":
            c.set(x, y, "c")

    # --- translucent hologram DISC: c outer wash, h luminous interior ---
    disc(c, dcx, dcy, DR, DR - 0.5, "c")
    disc(c, dcx, dcy, DR - 1.5, DR - 1.5, "h")
    # broken G rim so it reads as a translucent field, not a solid plate
    for a in range(0, 360, 12):
        x = dcx + DR * math.cos(math.radians(a))
        y = dcy + (DR - 0.5) * math.sin(math.radians(a))
        if (a // 12) % 2 == 0:
            c.set(x, y, "G")

    # --- the LIVE CELL: a round cell floating in the magnified h field, smaller
    # than the disc so a translucent h ring shows around it. Built concentric for
    # clean contrast: g membrane -> G cytoplasm -> bright nucleus. ---
    R = DR - 3                                    # cell radius (< disc radius)
    disc(c, dcx, dcy, R, R, "g")                  # green membrane fill
    disc(c, dcx, dcy, R - 1, R - 1, "G")          # darker cytoplasm => ring pops
    # crisp g membrane outline ring
    for a in range(0, 360, 14):
        x = dcx + R * math.cos(math.radians(a))
        y = dcy + R * math.sin(math.radians(a))
        c.set(x, y, "g")
    # 3 small c organelle dots in the cytoplasm
    for ox, oy in ((2, 2), (-2, 2), (2, -2)):
        c.set(dcx + ox, dcy + oy, "c")
    # division FURROW: a clear 2px vertical pinch splitting the cell into 2 lobes
    for dy in range(-R, R + 1):
        c.set(dcx, dcy + dy, "g")                 # bright waist line
    c.set(dcx, dcy - R, "K")                      # top notch
    c.set(dcx, dcy + R, "K")                      # bottom notch
    c.set(dcx - 1, dcy, "G")
    c.set(dcx + 1, dcy, "G")
    # twin daughter NUCLEI (one each side of the furrow) selling mitosis
    disc(c, dcx - 2, dcy - 1, 1.6, 1.4, "o")
    disc(c, dcx + 2, dcy + 1, 1.6, 1.4, "o")
    c.set(dcx - 2, dcy - 1, "O")
    c.set(dcx + 2, dcy + 1, "O")

    # --- h SPARKLES ringing the hologram (premium hover) ---
    for sx, sy in ((-DR - 1, -1), (DR, -3), (1, -DR - 1), (DR - 3, DR - 2)):
        xi, yi = int(round(dcx + sx)), int(round(dcy + sy))
        if 0 <= xi < 64 and 0 <= yi < 64:
            c.set(xi, yi, "h")

    # --- tiny g micron SCALE-BAR tick at the disc's lower-left edge ---
    sb_y = int(round(dcy + DR - 1))
    sb_x = int(round(dcx - 4))
    for i in range(4):
        c.set(sb_x + i, sb_y, "g")
    c.set(sb_x, sb_y - 1, "g")                    # left tick
    c.set(dcx - 1, sb_y - 1, "g")   # right tick


# ── ASSEMBLE (painter's order: back→front, ground→sky) ───────────────────────
def build():
    c = Canvas()
    b = body(c)                 # the low imaging-room box
    bay_door(c, b)              # HERO: wide LEFT imaging-bay door (opening LEFT)
    right_porthole(c, b)        # plain RIGHT face: one small c porthole
    dome = optics_turret(c)     # optics drum turret riding the back roof
    lens = eyepiece(c, dome)    # tilted eyepiece barrel up-left
    cell_hologram(c, lens)      # projected live-cell hologram (signature)
    spec = {"width": 64, "height": 64, "palette": BIO, "rows": c.rows()}
    out = "/path/to/scienium/art/src/buildings/biocore_microscopy-suite.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
