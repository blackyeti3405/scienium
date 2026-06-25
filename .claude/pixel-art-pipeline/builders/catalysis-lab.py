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


# ── ASSEMBLE (painter's order: back→front, ground→sky) ───────────────────────
def build():
    c = Canvas()
    base_plinth(c)            # low plinth (under/behind)
    base_y = drum(c)          # the round steel reactor drum
    charge_door(c)            # HERO: LEFT charge door + viewing window (opening LEFT)
    right_porthole(c)         # plainer shaded RIGHT face
    rate_dial(c, base_y)      # optimization rate dial on the drum
    pipework(c)               # feed/coolant pipes + relief valve
    glass_dome_back(c)        # transparent glass dome WASH + D collar (back)
    catalyst_bed(c)           # SIGNATURE: glowing bed + 2 slow in / 1 fast out
    glass_dome_front(c)       # dome ribs + crown glint OVER the bed (seen through)
    vapor_wisp(c)             # thin vapor wisp off the relief valve (roofline)
    spec = {"width": 64, "height": 64, "palette": CHEM, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/chemworks_catalysis-lab.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
