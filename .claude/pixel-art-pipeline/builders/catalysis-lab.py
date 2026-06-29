#!/usr/bin/env python3
"""
Catalysis Lab — ChemWorks economy building (BESPOKE form, STANDARD role).

A GLASS-DOMED ROUND REACTOR-VESSEL PAVILION. The body is a narrow polished steel
`cylinder` drum (isobuild.cylinder) capped by a CLEAR HEMISPHERICAL GLASS DOME —
a transparent reactor bell you can see straight INTO. This is distinct from:
  • the Volt AI-Incubator (a WIDE closed steel drum + flat OPAQUE disc lens),
  • the BioCore microscopy turret (a box body + small OPAQUE optics dome),
here the dome is a TRANSPARENT c/h glass bell showing the glowing reactor inside,
on a NARROW round drum — round + glass-topped, contrasting every boxy/tower sibling.

  • OPENING SIDE = LEFT: the hero is a K-framed CHARGE DOOR + viewing window on
    the LIT LEFT face of the drum — c/h glass, h reflections, a violet o interior
    glow, a W rim highlight. The shaded RIGHT face is plainer (deep D/G panels +
    one dark porthole).
  • SIGNATURE (one-of-one): inside the glass dome sits a packed bed of glowing
    violet catalyst pellets (o/O/r) in an M/D perforated tray; TWO cool slow
    reactant streams (c/g, spaced droplets) feed IN, and ONE bright fast product
    stream (h/W, a dense streak with o speed-sparks) rushes OUT — the reaction
    visibly accelerated across the hot pellet bed. A small c/g rate dial on the
    drum has its o needle swung up to an O peak (rate maximized).

Composed from art/isobuild.{cylinder,Box} — NO iso.draw_cube / base_windows.
ChemWorks palette ONLY (blue-grey drum, BLUE glassware, VIOLET reaction glow).
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

# Base ChemWorks palette (shared keys) + a few EVOLVED accent shades reserved for
# the upgrade stages only (they never appear in stage 1, so catalysis-lab.png is
# unchanged). These exact keys+hexes match the chemworks reference builder:
#   b  deepened structure steel — matured tone for t3+ new masses
#   e  energized reagent glow (mid)   E  energized reagent glow (bright) — t4/t5 power
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
CHEM = {"K": "#161a2e", "W": "#e6ecfb", "L": "#c2cdee", "M": "#9aa8d8", "D": "#6f7cb0", "d": "#4b5688",
        "h": "#d6ecff", "c": "#a8d4ff", "g": "#4aa0e6", "G": "#2166b0",
        "o": "#c89cf0", "O": "#e0c2ff", "r": "#6a34a8",
        "b": "#363c5e", "e": "#36e0c8", "E": "#c2fff2", "q": "#f0c64a"}


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


def disc(c, cx, cy, rx, ry, ch, only="."):
    """Filled iso ellipse. If `only` is a char, paint only over that char."""
    for yy in range(int(-ry), int(ry) + 1):
        t = 1 - (yy / ry) ** 2
        if t < 0:
            continue
        hw = rx * (t ** 0.5)
        for xx in range(int(-hw), int(hw) + 1):
            xi, yi = int(round(cx + xx)), int(round(cy + yy))
            if 0 <= xi < 64 and 0 <= yi < 64:
                if only != "." and c.px[yi][xi] != only:
                    continue
                c.set(xi, yi, ch)


# ── VERTICAL BUDGET (top→bottom, all must fit 64px) ───────────────────────────
#   vapor wisp        y ~ 2..8   (off the relief valve, top-left of dome)
#   glass dome crown  y ~ 6..20  (transparent hemisphere on the drum)
#   catalyst bed      y ~ 13..22 (inside the dome, seen through the glass)
#   dome collar ring  y ~ 20..23 (D ring where dome meets drum)
#   drum top ellipse  y ~ 22..28
#   drum walls        y ~ 25..44 (charge door LEFT, porthole RIGHT)
#   base plinth       y ~ 44..50
# ── DRUM GEOMETRY (the narrow round base — the dominant low round mass) ───────
CX = 30
TOP_Y = 28          # y of the drum's top-ellipse centre (lower => dome sits clear)
RX = 13             # drum horizontal radius (NARROW => not the wide Volt drum)
RY = 6              # drum vertical radius (2:1 ellipse)
DRUM_H = 16         # drum wall height

# Dome sits centred on the drum's top ellipse, springing from a clear collar so
# the round drum top stays visible (dome + drum read as two separate masses).
DOME_CX = CX
DOME_CY = TOP_Y - 1             # dome spring line (just above the drum rim)
DRX = RX - 2                    # dome radius inset from the drum rim
DRY_TOP = 11                    # dome height (a WIDE bell, not a tall egg)

# ── UPGRADE-EVOLUTION geometry (constants shared by stageN helpers so a later
# stage that references an earlier add re-derives from the SAME source) ───────
# The t4 fluidized-bed RISER tower seats on the drum's back-RIGHT top shoulder,
# clear of the dome (dome right edge ~x=40) and clear of the central product jet
# (x≈29..30). Its foot + top are defined ONCE here because both stage4_riser
# (draws the tower) and the painter's-order assembly read them.
RISER_CX = 39                   # back-right of the dome, on the drum top shoulder
RISER_FOOT_Y = TOP_Y - 1        # springs off the drum top rim (≈y27)
RISER_RX = 3                    # slim tower radius
RISER_TOP_Y = 7                 # tower top (clamped: cyclone head lands ≥ y2)


def drum_hw(yy):
    """Half-width of the drum ellipse at vertical offset yy from its centre."""
    t = 1 - (yy / RY) ** 2
    if t < 0:
        return -1
    return RX * (t ** 0.5)


def dome_hw(dy):
    """Half-width of the dome at `dy` px ABOVE the dome spring line (dy>=0).
    The dome is the upper half of an ellipse (DRX wide, DRY_TOP tall)."""
    t = 1 - (dy / DRY_TOP) ** 2
    if t < 0:
        return -1
    return DRX * (t ** 0.5)


# ── low base plinth (drawn FIRST, sits under + behind the drum) ──────────────
def base_plinth(c):
    """A low polished disc the drum stands on + a soft K contact shadow, grounding
    the round body with a clean premium footing (matches the set's plinths)."""
    base_y = TOP_Y + DRUM_H
    # soft contact shadow under the footprint
    for yy in range(-RY, RY + 4):
        hw = drum_hw(min(abs(yy), RY)) + 2.5
        if hw < 0:
            continue
        y = base_y + 4 + int(yy * 0.5)
        for x in range(int(CX - hw), int(CX + hw) + 1):
            if (x - CX) ** 2 / (hw ** 2) + ((y - (base_y + 5)) ** 2) / (3.0 ** 2) <= 1:
                c.set(x, y, "K")
    # polished base disc (a low ring just below the drum), lit-left/shaded-right
    ehw = RX + 1.5
    for yy in range(-2, 4):
        y = base_y + 3 + yy
        for x in range(int(CX - ehw), int(CX + ehw) + 1):
            if (x - CX) ** 2 / (ehw ** 2) + (yy ** 2) / (3.5 ** 2) <= 1:
                c.set(x, y, "D" if x <= CX else "d")
    # bright top edge of the disc
    for a in range(180, 361, 4):
        x = CX + ehw * math.cos(math.radians(a))
        y = base_y + 2 + 3.5 * math.sin(math.radians(a))
        c.set(x, y, "M")
    # K outline of the disc front arc
    for a in range(0, 181, 4):
        x = CX + ehw * math.cos(math.radians(a))
        y = base_y + 5 + 3.5 * math.sin(math.radians(a))
        c.set(x, y, "K")


# ── the DRUM body (the round steel reactor base) ─────────────────────────────
def drum(c):
    """The polished round steel cylinder — blue-grey M/D walls, bright L top, with
    K panel seams + a c instrument band. The dominant low round mass."""
    cylinder(c, CX, TOP_Y, RX, DRUM_H,
             top="L", side_l="M", side_r="D", outline="K", ry=RY)
    base_y = TOP_Y + DRUM_H

    # one soft L->W vertical sheen on the lit-left half (polished steel read)
    for col, ch in ((-7, "L"), (-6, "W"), (-5, "L")):
        edge = RY * (1 - (col / RX) ** 2) ** 0.5
        for y in range(int(TOP_Y + edge), base_y + 1):
            c.set(CX + col, y, ch)
    # a single shaded curvature streak on the far-right
    for col in (7,):
        edge = RY * (1 - (col / RX) ** 2) ** 0.5
        for y in range(int(TOP_Y + edge), base_y + 1):
            c.set(CX + col, y, "d")

    # bright W rim glint along the back-upper arc of the top ellipse
    for a in range(184, 358, 5):
        x = CX + RX * math.cos(math.radians(a))
        y = TOP_Y + RY * math.sin(math.radians(a))
        c.set(x, y, "W")

    # --- K vertical panel seams down the drum (3 plates) following the curve ---
    for col in (-4, 3):
        edge = RY * max(0.0, 1 - (col / RX) ** 2) ** 0.5
        for y in range(int(TOP_Y + edge + 1), base_y - 1):
            c.set(CX + col, y, "K")

    # --- a thin c INSTRUMENT BAND wrapping the FRONT-RIGHT of the lower drum
    # (ChemWorks glazing) — kept to the right half so it never fights the LEFT
    # charge door; a clean curved gauge strip on the shaded side. ---
    band_y = TOP_Y + DRUM_H - 7
    for col in range(0, RX - 1):
        t = 1 - (col / RX) ** 2
        if t < 0:
            continue
        edge = RY * (t ** 0.5)
        y = int(round(band_y + (RY - edge) * 0.55))
        glass = "g" if col <= 3 else "G"
        c.set(CX + col, y, glass)
        c.set(CX + col, y - 1, "K")        # top rail
        c.set(CX + col, y + 1, "K")        # bottom rail
    return base_y


# ── LEFT charge door + viewing window (the HERO opening) ─────────────────────
def charge_door(c):
    """The hero opening on the LIT LEFT face of the drum: a bold K-framed CHARGE
    DOOR + viewing window with c/h glass, an h reflection sweep, a soft violet o
    interior glow (the reactor inside) + a W rim highlight. A clean tall rectangle
    set into the lit-left of the round vessel, clear of the instrument band, so it
    unmistakably marks the opening side as LEFT."""
    door_cx = CX - 6                       # on the lit-left of the drum
    door_top = TOP_Y + 3
    door_bot = TOP_Y + DRUM_H - 3
    half_w = 4                             # door half-width in px
    gl, gr = door_cx - half_w + 1, door_cx + half_w - 1

    # K outer frame (filled), with a flat-arched K head
    for y in range(door_top, door_bot + 1):
        for x in range(door_cx - half_w, door_cx + half_w + 1):
            c.set(x, y, "K")
    for dx in range(-half_w + 1, half_w):
        c.set(door_cx + dx, door_top - 1, "K")

    # clean BLUE-GLASS leaf inset in the frame: cool c band -> g -> shaded G, so
    # it reads unmistakably as glass (no pale wash fighting the pipe alongside)
    gt, gb = door_top + 1, door_bot - 1
    for y in range(gt, gb + 1):
        for x in range(gl, gr + 1):
            ch = "c" if x <= door_cx - 1 else ("g" if x <= door_cx + 1 else "G")
            c.set(x, y, ch)

    # ONE bright h reflection diagonal sweep across the lit pane
    for i in range(3):
        c.set(gl + i, gt + 1 + i, "h")
    # one K vertical mullion (twin charge leaves) + one K mid slat seam
    vline(c, door_cx, gt, gb, "K")
    midy = (gt + gb) // 2
    hline(c, gl, gr, midy, "K")

    # soft VIOLET interior glow through the lower glass (the glowing reactor inside)
    hline(c, gl, gr, gb - 1, "o")
    hline(c, gl + 1, gr - 1, gb - 2, "O")
    # W rim highlight up the lit jamb + a c threshold lip
    vline(c, door_cx - half_w, door_top, door_bot, "W")
    hline(c, gl, gr, gb, "c")


def right_porthole(c):
    """The plainer shaded RIGHT face: deeper D/G panel feel + one dark porthole."""
    px = CX + 7
    py = TOP_Y + 4
    cx, cy = int(round(px)), int(round(py))
    # K rim ring
    for a in range(0, 360, 30):
        x = cx + 2 * math.cos(math.radians(a))
        y = cy + 2 * math.sin(math.radians(a))
        c.set(x, y, "K")
    disc(c, cx, cy, 1.4, 1.4, "G")
    c.set(cx, cy, "g")
    c.set(cx - 1, cy - 1, "c")
    # a deep G recessed panel seam below the porthole (shaded plainness)
    for y in range(cy + 3, cy + 7):
        c.set(cx, y, "G")
        c.set(cx + 1, y, "d")


# ── PIPEWORK: feed/coolant pipes curving up the drum + relief valve ──────────
def pipework(c):
    """2 M/c feed/coolant pipes curving up the lit-left of the drum into the dome
    collar (the inflow lines), + a small o relief valve on the right shoulder with
    an O/o vapor wisp. Condenser-pipe ChemWorks motif."""
    # one clean coolant pipe hugging the FAR-LEFT drum edge (well clear of the
    # LEFT door), rising vertically to the dome collar — a D pipe with one M glint
    # and a K outline so it reads as a pipe ON the drum, not part of the door.
    px = CX - 12
    for y in range(TOP_Y + DRUM_H - 4, TOP_Y, -1):
        c.set(px - 1, y, "K")          # outer K edge
        c.set(px, y, "D")              # pipe body
        c.set(px + 1, y, "M")          # glint
    # a small elbow turning the pipe up into the dome collar
    c.set(px, TOP_Y, "D"); c.set(px + 1, TOP_Y - 1, "M"); c.set(px + 2, TOP_Y - 1, "D")
    # small relief valve nub on the right dome shoulder
    rv_x, rv_y = DOME_CX + DRX - 3, DOME_CY - DRY_TOP + 5
    c.set(rv_x, rv_y, "o")
    c.set(rv_x + 1, rv_y, "r")
    c.set(rv_x, rv_y - 1, "O")


def vapor_wisp(c):
    """A thin o/O vapor wisp curling up off the relief valve (the roofline accent)."""
    vx, vy = DOME_CX + DRX - 3, DOME_CY - DRY_TOP + 3
    pts = [(0, 0), (-1, -2), (1, -4), (-1, -6), (0, -8)]
    for dx, dy in pts:
        xi, yi = int(round(vx + dx)), int(round(vy + dy))
        if 0 <= xi < 64 and 0 <= yi < 64 and c.px[yi][xi] == ".":
            c.set(xi, yi, "O" if dy > -5 else "o")


# ── GLASS DOME (transparent hemisphere bell over the drum) ───────────────────
def _dome_base_y(col):
    """Screen-y of the dome's base (spring-line) ellipse at column offset `col`."""
    t = 1 - (col / DRX) ** 2
    if t < 0:
        return None
    edge = (RY - 2) * (t ** 0.5)
    return int(round(DOME_CY + (RY - 2 - edge) * 0.5))


def glass_dome_back(c):
    """Fill the transparent glass bell WASH first (h lit-back / c body / g shaded)
    so the catalyst bed + streams paint ON TOP and read as inside-the-glass. A D/d
    collar ring sits where the dome meets the drum rim (the two masses separate)."""
    # transparent glass hemisphere fill: clean lit->shaded wash, a clear bell
    for dy in range(0, DRY_TOP + 1):
        hw = dome_hw(dy)
        if hw < 0:
            continue
        y = DOME_CY - dy
        for x in range(int(DOME_CX - hw), int(DOME_CX + hw) + 1):
            ch = "h" if x <= DOME_CX - 4 else ("c" if x <= DOME_CX - 1 else ("g" if x <= DOME_CX + 3 else "G"))
            c.set(x, y, ch)
    # D/d collar ring at the spring line (a clean band: dome-meets-drum)
    for col in range(-DRX, DRX + 1):
        by = _dome_base_y(col)
        if by is None:
            continue
        c.set(DOME_CX + col, by + 1, "D" if col <= 0 else "d")
        c.set(DOME_CX + col, by + 2, "K")


def glass_dome_front(c):
    """Draw the dome glazing OVER the catalyst bed: a K crown outline, just TWO
    light meridian ribs set OFF-centre (leaving a clear crown channel for the fast
    product jet to erupt through), a K spring-line rim, + a W crown glint — so the
    glowing bed shows THROUGH a clean ribbed glass bell, not a cage."""
    # K spring-line rim (the glass base edge)
    for col in range(-DRX, DRX + 1):
        by = _dome_base_y(col)
        if by is None:
            continue
        c.set(DOME_CX + col, by, "K")

    # K outline arc of the dome crown (top hemisphere edge)
    for a in range(0, 181, 3):
        x = DOME_CX + DRX * math.cos(math.radians(a))
        dy = DRY_TOP * math.sin(math.radians(a))
        c.set(x, DOME_CY - dy, "K")

    # TWO light meridian ribs OFF-centre (skip the centre => clear jet channel) ---
    for frac in (-0.5, 0.5):
        for dy in range(1, DRY_TOP - 1):
            hw = dome_hw(dy)
            if hw < 1:
                continue
            x = int(round(DOME_CX + frac * hw))
            # lit-side rib a soft D seam, shaded-side a darker K seam
            c.set(x, DOME_CY - dy, "D" if frac < 0 else "G")

    # bright W crown glint on the lit-back of the glass + h sparkle
    c.set(DOME_CX - 4, DOME_CY - DRY_TOP + 2, "W")
    c.set(DOME_CX - 5, DOME_CY - DRY_TOP + 3, "W")
    c.set(DOME_CX - 3, DOME_CY - DRY_TOP + 3, "h")


# ── SIGNATURE: glowing catalyst bed accelerating a two-stream reaction ───────
def catalyst_bed(c):
    """Inside the glass dome: a packed bed of glowing VIOLET catalyst pellets in an
    M/D perforated tray, with TWO cool slow reactant streams flowing IN and ONE
    bright fast product stream rushing OUT — the reaction visibly accelerated.

    Painted AFTER the dome WASH but BEFORE the dome ribs/outline, so it reads as
    sitting inside the transparent bell.
    """
    bed_cx = DOME_CX
    bed_cy = DOME_CY - 4               # the tray sits low inside the dome
    bed_hw = DRX - 3                   # tray width (inside the glass)

    # --- M/D perforated TRAY holding the bed (a thin iso slab) ---
    for x in range(int(bed_cx - bed_hw), int(bed_cx + bed_hw) + 1):
        c.set(x, bed_cy + 2, "M" if x <= bed_cx else "D")
        c.set(x, bed_cy + 3, "d")
    for x in range(int(bed_cx - bed_hw + 1), int(bed_cx + bed_hw), 2):
        c.set(x, bed_cy + 3, "K")              # perforation dots

    # --- TWO cool SLOW reactant inflow streams angling IN from feed nozzles on
    # the upper sides toward the bed. Each is a short K nozzle + a line of SPACED
    # cool c/g droplets (gaps => visibly SLOW), drawn FIRST so the bed glow caps
    # their tips. Symmetric left+right => the "two streams in" reads clearly. ---
    # left feed nozzle (a small K spout high on the lit side)
    c.set(bed_cx - 9, bed_cy - 7, "K"); c.set(bed_cx - 8, bed_cy - 7, "M")
    c.set(bed_cx - 9, bed_cy - 6, "K")
    for dx, dy, ch in [(-8, -6, "c"), (-7, -5, "h"), (-6, -4, "c"),
                       (-5, -3, "g"), (-4, -2, "c")]:           # spaced droplets
        c.set(bed_cx + dx, bed_cy + dy, ch)
    # right feed nozzle (a small K spout high on the shaded side)
    c.set(bed_cx + 9, bed_cy - 7, "K"); c.set(bed_cx + 8, bed_cy - 7, "G")
    c.set(bed_cx + 9, bed_cy - 6, "K")
    for dx, dy, ch in [(8, -6, "c"), (7, -5, "g"), (6, -4, "c"),
                       (5, -3, "g"), (4, -2, "c")]:
        c.set(bed_cx + dx, bed_cy + dy, ch)

    # --- the packed BED of glowing violet pellets (a tidy clustered cap) ---
    # soft O glow halo rising off the bed onto the glass
    for x in range(int(bed_cx - bed_hw + 1), int(bed_cx + bed_hw)):
        c.set(x, bed_cy - 2, "o")
    pellets = [
        (-4, 0, "o"), (-2, 0, "O"), (0, 0, "O"), (2, 0, "O"), (4, 0, "o"),
        (-3, -1, "r"), (-1, -1, "o"), (1, -1, "O"), (3, -1, "r"),
    ]
    for dx, dy, ch in pellets:
        px, py = bed_cx + dx, bed_cy + dy
        c.set(px, py, ch)
        c.set(px, py + 1, "r")                 # each pellet's shaded underside
    c.set(bed_cx, bed_cy - 1, "O")             # bright hot core

    # --- ONE bright FAST product outflow: a BOLD continuous 2px h/W jet erupting
    # straight UP out of the bed centre through the clear crown channel, capped by
    # an O burst, with o speed-sparks fanning off it. Continuous + bright + thick
    # => clearly FASTER than the two thin spaced cool inputs. ---
    for k in range(0, 11):
        y = bed_cy - 2 - k
        c.set(bed_cx, y, "W")                  # bright core column
        c.set(bed_cx - 1, y, "h")              # 2px dense streak
    c.set(bed_cx, bed_cy - 13, "O")            # bright jet tip burst
    c.set(bed_cx - 1, bed_cy - 13, "O")
    for sx, sy in ((-2, -5), (1, -8), (-2, -10), (2, -7)):
        xi, yi = bed_cx + sx, bed_cy - 2 + sy
        if 0 <= xi < 64 and 0 <= yi < 64:
            c.set(xi, yi, "o")                 # speed-sparks flaring off the jet


def rate_dial(c, base_y):
    """A small c/g rate dial on the lit-left drum with its o needle swung up to an
    O peak mark — the optimization read (reaction rate maximized)."""
    dx, dy = CX + 7, TOP_Y + DRUM_H - 4
    # K bezel ring
    for a in range(0, 360, 30):
        x = dx + 2.2 * math.cos(math.radians(a))
        y = dy + 2.2 * math.sin(math.radians(a))
        c.set(int(round(x)), int(round(y)), "K")
    disc(c, dx, dy, 1.6, 1.6, "c")
    c.set(dx, dy, "g")
    # o needle swung up-right to the peak
    c.set(dx, dy, "o")
    c.set(dx + 1, dy - 1, "o")
    c.set(dx + 1, dy - 2, "O")                 # O peak mark (rate maximized)


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS catalysis /
# fluidized-bed / multi-jet structure onto the prior form — never restarts, never
# recolors the whole vessel. Theme: the single glass-dome reactor grows into a
# fully built-out catalytic process plant. Colours mature stage by stage; the
# energized glow (e/E teal) arrives at t4; gold (q) only as a t5 flourish.
#
# The signature is the bright PRODUCT JET erupting up through the clear dome crown
# (core at x≈29..30, tip burst ≈(30,10)). EVERY add stays clear of that jet and of
# the glass dome, growing off the drum's RIGHT shoulder / FRONT-LEFT ground / back.
#
#   t2  small functional add : a catalyst-pellet HOPPER + feed nozzle on the right
#                              drum shoulder; a brighter O droplet at the jet crown
#   t3  structural add       : a packed-bed reactor ANNEX (low covered Box w/ a
#                              g-glazed catalyst-bed window of stacked o pellets)
#   t4  major add            : a fluidized-bed RISER tower off the back-right roof
#                              (tall cylinder, e bubbling-bed core + cyclone head)
#   t5  crowning feature     : a glowing multi-jet CATALYTIC CROWN — three E plumes
#                              off a hot core ring + q gold nozzle collars + band
# ═══════════════════════════════════════════════════════════════════════════════

# the signature product-jet crown, derived ONCE so t2 + t5 anchor to the same spot
JET_CX = DOME_CX                       # jet core column x (=30)
JET_CROWN_Y = (DOME_CY - 4) - 13       # bed_cy - 13 => burst tip ≈ y10


def _clset(c, x, y, ch):
    """Set a pixel only if it lands inside the 64x64 canvas (clamp/skip guard so a
    stray overshoot can never paint off-canvas or wrap)."""
    xi, yi = int(round(x)), int(round(y))
    if 0 <= xi < 64 and 0 <= yi < 64:
        c.set(xi, yi, ch)


def stage2_hopper(c):
    """t2 — SMALL FUNCTIONAL ADD: a catalyst-pellet HOPPER — a clear inverted-funnel
    bin heaped with o/O pellets — standing on a short leg on the drum's back-RIGHT
    top rim (well right of the dome, clear of the LEFT charge door + the jet), with
    an angled feed PIPE carrying its charge line LEFT toward the dome base so the
    reactor is now actively dosed with fresh catalyst. Modest, base palette + one
    brightened O droplet spat off the product-jet crown (the t2 fountain accent).

    Drawn as a distinct standing bin (a 2px stand lifts it clear of the drum rim so
    it reads as a fixture ON the rim, not a lump fused into the dome glass)."""
    hx = CX + 12                        # back-right drum top rim (~x42), right of dome
    rim_y = TOP_Y - 3                   # the drum's back-right top rim height here
    # ---- a short K/D STAND lifting the bin clear of the rim (reads as mounted) ----
    for dy in range(0, 3):
        _clset(c, hx, rim_y - dy, "D")
        _clset(c, hx - 1, rim_y - dy, "K")
        _clset(c, hx + 1, rim_y - dy, "K")
    btm = rim_y - 3                     # bin sits on top of the stand
    # ---- the HOPPER bin: a clear inverted funnel (wide lit-M top -> narrow spout) ----
    bin_rows = [                        # (half-width, fill) TOP->bottom, funnels in
        (3, "M"), (3, "L"), (2, "D"), (1, "d"),
    ]
    btop = btm - (len(bin_rows) - 1)
    for i, (hw, fl) in enumerate(bin_rows):
        y = btop + i
        for dx in range(-hw, hw + 1):
            _clset(c, hx + dx, y, fl)
        _clset(c, hx - hw - 1, y, "K"); _clset(c, hx + hw + 1, y, "K")
    _clset(c, hx - 3, btop, "W")        # bright lit-left rim glint
    # ---- o/O catalyst PELLETS heaped proud of the open hopper mouth ----
    for dx, ch in ((-2, "o"), (-1, "O"), (0, "O"), (1, "o"), (2, "o")):
        _clset(c, hx + dx, btop - 1, ch)
    _clset(c, hx - 1, btop - 2, "O"); _clset(c, hx + 1, btop - 2, "o")  # heaped crest
    # ---- feed PIPE: an angled D charge line from the bin spout running LEFT-down
    #      toward the dome base collar (the dose path), with an o pellet in transit
    sx, sy = hx, btm + 1                # spout exit (under the funnel)
    feed = [(sx, sy), (sx - 2, sy + 1), (sx - 4, sy + 2), (sx - 6, sy + 3)]
    for i in range(len(feed) - 1):
        c.line(feed[i], feed[i + 1], "D")
    for fxp, fyp in feed:
        _clset(c, fxp, fyp + 1, "K")    # K underside so the pipe reads
    _clset(c, sx - 3, sy + 2, "o")      # a pellet tumbling down the feed
    # ---- brighter O droplet spat off the product-jet crown (t2 fountain accent) ----
    _clset(c, JET_CX, JET_CROWN_Y - 1, "O")
    _clset(c, JET_CX + 1, JET_CROWN_Y - 2, "O")
    _clset(c, JET_CX - 1, JET_CROWN_Y - 2, "o")


def stage3_packed_bed_annex(c):
    """t3 — STRUCTURAL ADD: a low PACKED-BED REACTOR annex — a secondary covered Box
    bolted onto the lit (LEFT-FRONT) side at ground, showing a g-glazed catalyst-bed
    WINDOW packed with stacked o pellet beads. A real new structural mass (its own
    prism + roof) extending the plant OUT to the front-left while staying LOWER than
    the drum, so it never rises into the charge door, the dome, or the jet.
    Introduces the matured deep-steel tone `b` for the annex's shaded shell."""
    # seat a small prism forward-and-left of the drum foot, on the plinth, growing
    # toward the front-left. Top-back corner sits low (well under the charge door).
    annex = Box(top=(19, 37), wx=6, wy=5, h=9)
    annex.shadow(c, "K")
    # cool/deep shell tones so it reads as an attached service block (b shaded face)
    c.fill_poly([annex.r_left, annex.r_front, annex.w_front, annex.w_left], "M")
    c.fill_poly([annex.r_front, annex.r_right, annex.w_right, annex.w_front], "b")
    c.fill_poly([annex.r_top, annex.r_right, annex.r_front, annex.r_left], "D")
    c.fill_poly([annex.r_top, annex.r_left, annex.r_front], "M")   # lit roof triangle
    c.line(annex.r_top, annex.r_left, "L")
    c.line(annex.r_top, annex.r_right, "L")
    for a, b in [(annex.r_top, annex.r_right), (annex.r_right, annex.r_front),
                 (annex.r_front, annex.r_left), (annex.r_left, annex.r_top),
                 (annex.r_left, annex.w_left), (annex.r_front, annex.w_front),
                 (annex.r_right, annex.w_right),
                 (annex.w_left, annex.w_front), (annex.w_front, annex.w_right)]:
        c.line(a, b, "K")
    # ---- the CATALYST-BED WINDOW on the lit-left face: a big clear pane so the
    #      packed bed shows through. Bright c glass with an h sky band so it reads
    #      unmistakably as a glazed reactor sight-window (no dark mush). ----
    annex.window(c, "left", 0.14, 0.86, 1.4, 6.8, glass="c", hi="h", shade="g",
                 mullions=1)
    # ---- stacked o/O PELLET BEADS packed behind the glass (the catalyst bed): a
    #      few staggered rows of 2px beads so it reads as a heaped packed bed. ----
    bed_rows = [(4.0, (0.26, 0.46, 0.66)), (5.0, (0.34, 0.56, 0.74)),
                (5.9, (0.28, 0.50, 0.70))]
    for v, us in bed_rows:
        for u in us:
            p = annex.left_pt(u, v)
            _clset(c, p[0], p[1], "o")
            _clset(c, p[0] + 1, p[1], "O")        # 2px bead, bright crest
            _clset(c, p[0], p[1] + 1, "r")        # each bead's shaded underside
    # a soft O glow on the topmost bead row (the bed runs warm violet)
    for u in (0.40, 0.60):
        p = annex.left_pt(u, 3.4); _clset(c, p[0], p[1], "O")
    # ---- a short b feed PIPE tying the annex roof back up to the drum (plumbed) ----
    px, py = int(round(annex.r_top[0])), int(round(annex.r_top[1]))
    for k in range(4):
        _clset(c, px + k, py - k, "b")
        _clset(c, px + k, py - k - 1, "D")
    _clset(c, px, py, "K")


def stage4_riser(c):
    """t4 — MAJOR ADD: a tall FLUIDIZED-BED RISER tower rising off the drum's back-
    RIGHT top shoulder, BESIDE the glass dome — a slim steel `cylinder` with a
    glowing energized bubbling-bed CORE climbing it and a CYCLONE separator head
    flaring at the top. The prominent new vertical mass that says 'this reactor now
    runs a continuous fluidized process'. Palette matures: deep `b` steel shell +
    energized `e/E` fluidized core. Foot/top from the module RISER_* constants so
    it stays clear of the dome (right edge ~x40) and the central jet (x≈29..30)."""
    rcx = RISER_CX
    foot_y = RISER_FOOT_Y
    top_y = RISER_TOP_Y
    rx = RISER_RX
    # ---- the steel riser SHELL (deep-steel b cylinder, lit-left M edge, K outline) ----
    for xx in range(-rx, rx + 1):
        col = "M" if xx < 0 else ("b" if xx > 0 else "b")
        for y in range(top_y, foot_y + 1):
            _clset(c, rcx + xx, y, col)
    c.line((rcx - rx, top_y), (rcx - rx, foot_y), "K")
    c.line((rcx + rx, top_y), (rcx + rx, foot_y), "K")
    c.line((rcx - rx, top_y), (rcx - rx, foot_y), "K")
    _clset(c, rcx - rx + 1, top_y + 1, "L")          # lit edge glint
    # a short b plinth where the riser seats on the drum top
    for dx in range(-rx - 1, rx + 2):
        _clset(c, rcx + dx, foot_y + 1, "K")
    for dx in range(-rx, rx + 1):
        _clset(c, rcx + dx, foot_y, "b")
    # ---- a few steel TRAY bands girdling the riser (process stages) ----
    for ty in range(top_y + 4, foot_y, 5):
        c.line((rcx - rx, ty), (rcx + rx, ty), "K")
        c.line((rcx - rx, ty - 1), (rcx + rx, ty - 1), "M")
    # ---- the glowing fluidized BED CORE bubbling up the riser centre (energized) ----
    for j, y in enumerate(range(top_y + 2, foot_y - 1)):
        ch = "E" if j % 3 == 0 else "e"
        _clset(c, rcx, y, ch)
        if j % 3 == 1:
            _clset(c, rcx - 1, y, "e")               # a bubble fattening the column
    # ---- the CYCLONE separator HEAD flaring at the top (a wider conical cap) ----
    cy = top_y - 1
    for dx in range(-rx - 1, rx + 2):                # wide cyclone shoulder
        _clset(c, rcx + dx, cy, "M" if dx < 0 else "b")
    _clset(c, rcx - rx - 1, cy, "K"); _clset(c, rcx + rx + 1, cy, "K")
    for dx in range(-rx, rx + 1):                    # the conical taper up
        _clset(c, rcx + dx, cy - 1, "D")
    for dx in (-1, 0, 1):
        _clset(c, rcx + dx, cy - 2, "M")
    _clset(c, rcx, cy - 3, "L")                      # cyclone apex glint
    _clset(c, rcx, cy - 4, "K")
    # a short b return DOWNCOMER off the cyclone back to the drum (closes the loop)
    for k in range(3):
        _clset(c, rcx + rx + 1, cy + 1 + k, "b")
        _clset(c, rcx + rx + 2, cy + 1 + k, "K")


def stage5_catalytic_crown(c):
    """t5 — CROWNING FEATURE = FULLY EVOLVED catalytic plant. The single product jet
    blooms into a glowing MULTI-JET CATALYTIC CROWN: a hot CORE RING girdles the jet
    base at the dome crown and THREE bright E reaction plumes fountain up off it
    (the centre plume capping the original jet, two flanking) — and the plant is
    dressed out with GOLD premium trim (q nozzle collars at each plume foot + a gold
    reactor BAND wrapping the drum). Reads as elite/maxed, still recognizably the
    same glass-dome reactor. Anchored to the SAME jet crown the signature uses."""
    import math
    cx = JET_CX
    crown_y = JET_CROWN_Y + 2          # hot ring sits just below the jet burst tip
    # ---- a hot CORE RING (energized teal ellipse) girdling the jet base ----
    for a in range(0, 360, 30):
        rxp = cx + 4 * math.cos(math.radians(a))
        ryp = crown_y + 2 * math.sin(math.radians(a))
        _clset(c, rxp, ryp, "e")
    for a in range(0, 360, 60):        # a few bright nodes on the ring
        rxp = cx + 4 * math.cos(math.radians(a))
        ryp = crown_y + 2 * math.sin(math.radians(a))
        _clset(c, rxp, ryp, "E")
    _clset(c, cx, crown_y, "E")        # bright ring core
    # ---- THREE reaction PLUMES fountaining up off the ring (centre + 2 flanks) ----
    # each plume: a short bright E column tapering to an O droplet burst, clamped on
    # canvas (top ≈ y1..2). Flanks lean outward so the trio fans like a fountain.
    plumes = [(-4, 2, -1), (0, 0, 0), (4, 2, 1)]   # (foot dx, shorten, lean-dir)
    for fdx, shorten, lean_dir in plumes:
        fx = cx + fdx                              # plume foot x (on the ring)
        ftop = max(1, crown_y - 7 + shorten)       # centre plume is the tallest
        # bright E column rising from the ring foot to the tip; flank plumes drift
        # outward (lean_dir) as they rise so the trio fans out like a fountain.
        for y in range(ftop, crown_y + 1):
            lean = int(round(lean_dir * 0.34 * (crown_y - y)))
            _clset(c, fx + lean, y, "E")
        tip_x = fx + int(round(lean_dir * 0.34 * (crown_y - ftop)))
        _clset(c, tip_x, ftop - 1, "O")            # O droplet bursting off the tip
        _clset(c, tip_x + lean_dir, ftop - 1, "e")
        # ---- q GOLD nozzle COLLAR at each plume foot on the ring (premium trim) ----
        _clset(c, fx - 1, crown_y + 1, "q")
        _clset(c, fx, crown_y + 1, "O")
        _clset(c, fx + 1, crown_y + 1, "q")
    # ---- a GOLD reactor BAND wrapping the drum (the maxed-out premium hoop) ----
    band_y = TOP_Y + 4                  # high on the drum, below the dome collar
    for col in range(-RX + 1, RX):
        t = 1 - (col / RX) ** 2
        if t < 0:
            continue
        edge = RY * (t ** 0.5)
        y = int(round(band_y + (RY - edge) * 0.5))
        _clset(c, CX + col, y, "q")
    # two gold bosses where the band meets the drum rim corners
    _clset(c, CX - RX + 1, band_y + 2, "O")
    _clset(c, CX + RX - 1, band_y + 2, "O")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the catalysis-lab at upgrade `stage` (1..5). Stage 1 is IDENTICAL to
    the shipped base; each higher stage keeps every prior addition and bolts on the
    next (t2 hopper → t3 packed-bed annex → t4 fluidized riser → t5 multi-jet crown
    + gold). Painter's order keeps rooftop/overhead additions on top of the masses
    they grow from, and keeps the glass-dome catalyst bed + product jet (the hero)
    reading on top of everything around it."""
    c = Canvas()
    # ---- BASE FORM (stage 1, unchanged) — painter's order: ground → drum → faces
    #      → pipework → glass dome wash → catalyst bed → dome glazing → vapor wisp.
    base_plinth(c)            # low plinth (under/behind)

    # t3 packed-bed ANNEX sits forward-left on the plinth; draw it AFTER the plinth
    # but BEFORE the drum so the drum's near edge occludes the annex's back corner.
    if stage >= 3:
        stage3_packed_bed_annex(c)

    base_y = drum(c)          # the round steel reactor drum
    charge_door(c)            # HERO: LEFT charge door + viewing window (opening LEFT)
    right_porthole(c)         # plainer shaded RIGHT face
    rate_dial(c, base_y)      # optimization rate dial on the drum

    # t4 fluidized RISER rises off the back-right drum top; draw it AFTER the drum
    # (so it seats on the shoulder) but BEFORE pipework/dome so the dome's near
    # glass and the front pipes read in front of the tower base.
    if stage >= 4:
        stage4_riser(c)

    pipework(c)               # feed/coolant pipes + relief valve
    glass_dome_back(c)        # transparent glass dome WASH + D collar (back)
    catalyst_bed(c)           # SIGNATURE: glowing bed + 2 slow in / 1 fast out
    glass_dome_front(c)       # dome ribs + crown glint OVER the bed (seen through)
    vapor_wisp(c)             # thin vapor wisp off the relief valve (roofline)

    # t2 hopper sits on the right drum shoulder; draw it AFTER the dome so its bin
    # reads in front of the dome's right flank (it is a near, right-side fixture).
    if stage >= 2:
        stage2_hopper(c)
    # t5 multi-jet crown blooms off the product-jet crown — the very front-most
    # overhead feature; drawn LAST so its plumes cap the hero jet.
    if stage >= 5:
        stage5_catalytic_crown(c)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/chemworks"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "catalysis-lab"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped catalysis-lab.png, so it does NOT overwrite the base
    PNG."""
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
