#!/usr/bin/env python3
"""
Aquatic Habitat — BioCore Lab economy building (BESPOKE form, STANDARD role).

A TALL GLASS CYLINDRICAL WATER-TANK ROTUNDA. The body is a true vertical cylinder
(isobuild.cylinder) — a tall, narrow column of WATER held in glass, NOT the gateway
cube and NOT the Volt opaque-steel drum. Where the Volt drum reads as polished
metal, this one reads as a TRANSPARENT teal/cyan glass aquarium full of life: the
walls are graded teal water (c/g/G), there is a bright `h` waterline + meniscus and
`W` rim glint near the top, `K` vertical glass-seam ribs, and a `D` cap ring with a
small `o` filter box + a `c` water-pipe.

  • Opening side = LEFT: a low rectilinear ENTRY ANNEX abuts the FRONT-LEFT base
    (M/D walls, K-framed glass door with an o glow + an o/O water-quality gauge),
    and the LIT-LEFT of the tank carries a big K-framed VIEWING WINDOW into the
    water. The right side is plainer — deeper G water, fewer seams, no annex.
  • Signature (one-of-one): a LIVING KELP-AND-FISH ECOSYSTEM swirling inside the
    glass water column — swaying g/G kelp fronds rooted in a d/r gravel bed, a
    tight school of O/o fish (+ one stray c fish), a drifting h/c jellyfish bell
    with tendrils, rising h/W bubble streams to the waterline, and a soft c light
    shaft slanting down from the lit-left.

Composed from art/isobuild.{cylinder,Box} — NO iso.draw_cube / base_windows.
Draw order: back glass+water -> the reef ECOSYSTEM (inside) -> front glass tint,
seams, rim, cap -> LEFT entry annex (in front) -> bubbles/light shaft on top.
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

# Base BioCore palette (shared keys) + a few EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so aquatic-habitat.png is
# unchanged). BioCore's evolved glow is BIO-LUMINESCENT — a living green-teal bloom —
# so a maxed tank reads as a glowing vivarium, not a power plant:
#   b  deep mossy bark-green  — matured structure tone for t3+ new masses/collars
#   e  bioluminescent glow (mid)   E  bioluminescent glow (bright) — the t4/t5 life-glow
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
BIO = {"K": "#1a2417", "W": "#e8f2d8", "L": "#c4dba6", "M": "#9fc07e", "D": "#6f9456", "d": "#4a6e3a",
       "h": "#d2f7ec", "c": "#9fefcf", "g": "#36cc9e", "G": "#1d8f70",
       "o": "#f0b24d", "O": "#ffd488", "r": "#b9701e",
       "b": "#2f4a2a", "e": "#74f0b6", "E": "#ccffe4", "q": "#f3c63a"}


# ── tank geometry (tall + narrow => a vertical water column, not a wide drum) ──
CX = 30
TOP_Y = 15          # y of the tank's top-ellipse centre
RX = 11             # tank horizontal radius
RY = 5              # tank vertical radius (2:1-ish ellipse)
TANK_H = 23         # tank wall height (TALL)
BASE_Y = TOP_Y + TANK_H


def hw(yy):
    """Half-width of the tank ellipse at vertical offset yy from its centre."""
    t = 1 - (yy / RY) ** 2
    if t < 0:
        return -1.0
    return RX * (t ** 0.5)


def wall_top(col):
    """Top-y of the tank wall at column `col` (where the front face begins),
    following the top-ellipse front arc so details clip to the curve."""
    t = 1 - (col / RX) ** 2
    if t < 0:
        return None
    return TOP_Y + RY * (t ** 0.5)


# ── contact shadow + low plinth under the tank (drawn FIRST, behind/under) ────
def base_slab(c):
    # soft K contact shadow under the footprint
    for yy in range(-RY - 1, RY + 3):
        w = hw(min(abs(yy), RY)) + 2.0
        if w < 0:
            continue
        y = BASE_Y + 4 + int(yy * 0.5)
        for x in range(int(CX - w), int(CX + w) + 1):
            if (x - CX) ** 2 / (w ** 2) + ((y - (BASE_Y + 5)) ** 2) / (2.6 ** 2) <= 1:
                c.set(x, y, "K")
    # a low d/D substrate plinth ring the tank stands on
    for yy in range(-2, 4):
        ehw = hw(RY - 0.5) + 1.5
        y = BASE_Y + 3 + yy
        for x in range(int(CX - ehw), int(CX + ehw) + 1):
            if (x - CX) ** 2 / (ehw ** 2) + (yy ** 2) / (3.2 ** 2) <= 1:
                c.set(x, y, "D" if x <= CX else "d")
    # K outline of the plinth front arc
    for a in range(0, 181, 4):
        x = CX + (hw(RY - 0.5) + 1.5) * math.cos(math.radians(a))
        y = BASE_Y + 5 + 3.2 * math.sin(math.radians(a))
        c.set(x, y, "K")


# ── the WATER COLUMN body (transparent teal glass full of water) ──────────────
def water_tank(c):
    """The tall glass cylinder of water. side_l = lighter teal `c`/`g` at the
    lit-left, side_r = deeper `G` toward the right; a teal-green water `top`. We
    then over-grade the lit half so the water reads volumetric (lighter near the
    surface, deeper toward the bottom)."""
    cylinder(c, CX, TOP_Y, RX, TANK_H,
             top="g", side_l="c", side_r="G", outline="K", ry=RY)

    # volumetric grade — keep the LIT-LEFT bright/transparent (c) so the reef
    # reads through it; only the right/far side goes deep G. Lighter near the
    # surface, a touch deeper toward the floor. Repaint the wall columns.
    for col in range(-RX, RX + 1):
        t = 1 - (col / RX) ** 2
        if t < 0:
            continue
        edge = RY * (t ** 0.5)
        y0 = int(TOP_Y + edge)
        for y in range(y0, BASE_Y + 1):
            depth = (y - y0) / TANK_H        # 0 at surface, ~1 at floor
            if col <= -3:                    # lit-left: bright transparent water
                ch = "c" if depth < 0.6 else "g"
            elif col <= 3:                   # centre: mid teal
                ch = "g" if depth < 0.7 else "G"
            else:                            # right/far: deep G
                ch = "g" if depth < 0.25 else "G"
            c.set(CX + col, y, ch)

    # bright vertical sheen on the lit glass (a clean column of light)
    for col, ch in ((-8, "c"), (-7, "h")):
        t = 1 - (col / RX) ** 2
        if t < 0:
            continue
        edge = RY * (t ** 0.5)
        for y in range(int(TOP_Y + edge), int(TOP_Y + edge + 8)):
            c.set(CX + col, y, ch)

    # bright W rim glint along the back-upper arc of the top ellipse
    for a in range(184, 360, 4):
        x = CX + RX * math.cos(math.radians(a))
        y = TOP_Y + RY * math.sin(math.radians(a))
        c.set(x, y, "W")


# ── SIGNATURE: the living kelp-and-fish ecosystem INSIDE the water column ─────
def gravel_bed(c):
    """A d/r gravel substrate mound along the tank floor (the reef rooting bed).
    Strictly clipped to sit ABOVE the tank's bottom-front arc so no gravel spills
    out below the glass silhouette."""
    for col in range(-RX + 2, RX - 1):
        t = 1 - (col / RX) ** 2
        if t < 0:
            continue
        edge = RY * (t ** 0.5)
        # bottom-front arc of the cylinder = the inner floor line; sit gravel
        # a couple px ABOVE it so it never breaches the K silhouette
        floor = int(BASE_Y + (RY - edge) * 0.5) - 2
        # a soft mound peaking left-of-centre, tapering to 1px at the edges
        mound = max(1, int(2.4 - abs(col + 3) * 0.22))
        for k in range(mound):
            ch = "r" if (col + 2 * k) % 4 == 0 else "d"
            c.set(CX + col, floor - k, ch)
        # a couple of bright pebble specks on the lit side
        if col in (-6, -3):
            c.set(CX + col, floor - 1, "M")


def kelp(c):
    """Two tall wavy kelp blades rooted in the gravel, curving with the current.
    Drawn in BRIGHT leaf-green (M body + L tips) so they read clearly against the
    teal water, each a solid 2px-wide blade with a darker d spine — distinctly
    plant, distinctly green, not just deeper water."""
    floor = BASE_Y - 4
    # (root_col, height, phase, amp) — both lean the same way (the current)
    fronds = [(-7, 16, 0.0, 1.6),
              (-3, 19, 1.0, 1.9)]
    for root, ht, ph, amp in fronds:
        for k in range(ht):
            sway = amp * math.sin(k * 0.42 + ph) * (k / ht)   # more sway up top
            x = int(round(CX + root + sway))
            y = floor - k
            tip = k > ht - 4
            c.set(x, y, "L" if tip else "M")                  # bright blade body
            c.set(x + 1, y, "g" if tip else "D")              # 2px width / shade
            if k % 4 == 2:                                     # darker spine knot
                c.set(x, y, "d" if not tip else "g")


def _fish(c, x, y, head, body):
    """One bold 3px fish dart swimming RIGHT: r tail, body, bright head, with a
    K outline pixel under the body so it reads crisp against the teal water."""
    x, y = int(round(x)), int(round(y))
    c.set(x - 2, y, "r")             # tail
    c.set(x - 1, y, body)            # body
    c.set(x, y, head)                # bright head
    c.set(x - 1, y + 1, "r")         # belly shade = a touch of depth
    c.set(x, y - 1, "O")             # tiny top glint


def fish_school(c):
    """A small, LEGIBLE school: 3 bold amber fish in a diagonal formation
    (swimming up toward the light) plus one stray cyan fish — each a clean 3px
    dart with hard contrast, so it reads as fish, not amber confetti. Sited in
    the clear lit-left water inside the viewing window."""
    # three amber fish in a tidy diagonal (the school)
    _fish(c, CX - 4, TOP_Y + 10, "O", "o")
    _fish(c, CX - 2, TOP_Y + 8, "o", "o")
    _fish(c, CX - 5, TOP_Y + 13, "o", "o")
    # one stray cyan fish lower-right, a touch of variety
    sx, sy = CX - 1, TOP_Y + 16
    c.set(sx - 2, sy, "c"); c.set(sx - 1, sy, "h"); c.set(sx, sy, "c")


def jellyfish(c):
    """A translucent h/c bell drifting in the UPPER window (clear of the fish +
    kelp below) with a few drifting c tendrils — a soft dome capped in h, rimmed
    c, so it reads as a glowing jelly."""
    jx, jy = CX - 6, TOP_Y + 6
    # bell dome: bright h crown over a c rim (3px wide, 2 tall)
    c.set(jx - 1, jy - 1, "c"); c.set(jx, jy - 1, "h"); c.set(jx + 1, jy - 1, "c")
    c.set(jx - 1, jy, "c"); c.set(jx, jy, "h"); c.set(jx + 1, jy, "h"); c.set(jx + 2, jy, "c")
    c.set(jx - 1, jy + 1, "c"); c.set(jx, jy + 1, "c"); c.set(jx + 1, jy + 1, "c")
    # drifting tendrils
    for tx, wob in ((jx, 0.0), (jx + 1, 0.8)):
        for k in range(1, 4):
            c.set(tx + int(math.sin(k * 0.9 + wob)), jy + 2 + k, "c")


def light_shaft(c):
    """A soft c light shaft slanting down from the lit-left into the water — only
    paints over existing teal water pixels so it reads as a beam, not a wall."""
    for k in range(18):
        x = CX - 9 + int(k * 0.55)
        y = TOP_Y + 1 + k
        for w in range(2):
            xi, yi = x + w, y
            if 0 <= xi < 64 and 0 <= yi < 64 and c.px[yi][xi] in ("g", "G"):
                c.set(xi, yi, "c")


def bubbles(c):
    """Two clean vertical chains of tiny h/W bubble dots rising to the waterline
    — one in the window, one on the right — kept sparse so they read as bubbles,
    not noise. Only painted over water pixels."""
    streams = [(-5, BASE_Y - 6, 8), (6, BASE_Y - 5, 9)]
    for col, start_y, ln in streams:
        for k in range(ln):
            y = start_y - k * 2                  # rise
            x = CX + col + int(math.sin(k * 0.9))
            if 0 <= x < 64 and 0 <= y < 64 and c.px[y][x] in ("g", "G", "c"):
                c.set(x, y, "W" if k % 3 == 0 else "h")


# ── front-glass detailing drawn OVER the reef (so life sits behind glass) ─────
def glass_front(c):
    """The bright waterline + meniscus, subtle glass-seam ribs on the PLAINER
    RIGHT half only, and the big K-framed VIEWING WINDOW on the LIT-LEFT. The
    lit-left interior is kept CLEAR glass so the reef inside reads cleanly; the
    right side gets the seams (per the blueprint: right side plainer, fewer
    seams, no reef detail)."""
    # --- subtle G glass-seam ribs on the RIGHT/far half only (keep them off the
    # lit-left so they never chop up the reef view) ---
    for col in (5, 9):
        wt = wall_top(col)
        if wt is None:
            continue
        for y in range(int(wt) + 1, BASE_Y - 1):
            if c.px[y][CX + col] in ("g", "G"):
                c.set(CX + col, y, "G")

    # --- bright h waterline + meniscus a few px below the rim ---
    wl = TOP_Y + 3
    for col in range(-RX + 1, RX):
        t = 1 - (col / RX) ** 2
        if t < 0:
            continue
        edge = RY * (t ** 0.5)
        y = int(wl + (RY - edge) * 0.5)
        c.set(CX + col, y, "h" if col <= 1 else "c")     # waterline
        c.set(CX + col, y + 1, "c" if col <= 1 else "G") # meniscus shade
    # W surface sparkle on the lit side of the waterline
    c.set(CX - 6, int(wl), "W")
    c.set(CX - 3, int(wl + 0.5), "W")

    # --- the big K-framed VIEWING WINDOW on the lit-LEFT of the tank ---
    # a tall frame hugging the lit half, boxing the clear water view + reef
    fx0, fx1 = CX - 9, CX
    fy0, fy1 = TOP_Y + 6, BASE_Y - 2
    for y in range(fy0, fy1 + 1):       # vertical jambs
        c.set(fx0, y, "K")
        c.set(fx1, y, "K")
    for x in range(fx0, fx1 + 1):       # head + sill rails
        c.set(x, fy0, "K")
        c.set(x, fy1, "K")
    # a thin h reflection sweep down the inside of the lit jamb (glass shine)
    for y in range(fy0 + 1, fy1):
        if c.px[y][fx0 + 1] in ("g", "G", "c"):
            c.set(fx0 + 1, y, "h" if (y - fy0) % 4 else "c")


# ── cap ring + filter box + water pipe (roofline) ─────────────────────────────
def cap_and_filter(c):
    """A D capping ring over the tank rim, a small o filter box on top, and a thin
    c water-pipe arcing from the filter back into the tank."""
    cap_cy = TOP_Y
    # D cap ring sitting on the rim (a thin ellipse band just inside the rim)
    for a in range(0, 360, 5):
        x = CX + (RX - 1) * math.cos(math.radians(a))
        y = cap_cy + (RY - 0.5) * math.sin(math.radians(a))
        c.set(x, y, "D" if math.sin(math.radians(a)) > 0 else "d")
    # K rim outline on top of the cap ring (front arc)
    for a in range(0, 181, 6):
        x = CX + (RX - 1) * math.cos(math.radians(a))
        y = cap_cy + (RY - 0.5) * math.sin(math.radians(a))
        c.set(x, y, "K")

    # small o filter box perched on the back-right of the cap (compact, so it
    # accents rather than crowds the rim)
    bx, by = CX + 5, cap_cy - 3
    box = Box((bx, by), wx=1.6, wy=1.4, h=3)
    box.draw(c, roof="O", lwall="o", rwall="r", roof_hi="W", outline="K",
             with_shadow=False)
    # a thin c water-pipe arcing from the filter box back down into the tank
    px0, py0 = box.w_left[0], box.w_left[1] - 1
    for k in range(6):
        ang = math.radians(180 + k * 30)
        x = px0 - 2 + 3 * math.cos(ang)
        y = py0 - 1 + 2 * math.sin(ang)
        c.set(x, y, "c")
    c.set(px0 - 5, py0 + 1, "G")     # pipe entering the water


# ── ENTRY ANNEX (low, rectilinear, FRONT-LEFT) → opening on the LEFT ──────────
def entry_annex(c):
    """A low clean rectilinear annex abutting the FRONT-LEFT base of the tank.
    Drawn AFTER the tank so it sits in front-left => the main opening is LEFT.
    M/D walls, a K-framed glass door with an o glow on the LIT-LEFT face, plus an
    o/O water-quality gauge (the diagnosis read-out) beside the door."""
    a = Box((18, 31), wx=5, wy=5, h=8)
    a.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # --- K-framed glass DOOR on the LIT-LEFT face = the way in ---
    du0, du1, dvt, dvb = 0.30, 0.74, 2.2, a.h - 0.3
    c.fill_poly([a.left_pt(du0, dvt), a.left_pt(du1, dvt),
                 a.left_pt(du1, dvb), a.left_pt(du0, dvb)], "K")            # frame
    c.fill_poly([a.left_pt(du0 + 0.06, dvt + 0.6), a.left_pt(du1 - 0.06, dvt + 0.6),
                 a.left_pt(du1 - 0.06, dvb), a.left_pt(du0 + 0.06, dvb)], "c")  # glass leaf
    c.line(a.left_pt(du0 + 0.06, dvt + 1.3), a.left_pt(du1 - 0.06, dvt + 1.3), "h")
    # warm o glow spilling at the door foot
    c.line(a.left_pt(du0 + 0.1, dvb - 0.3), a.left_pt(du1 - 0.1, dvb - 0.3), "o")
    c.set(int(round(a.left_pt(0.52, dvt - 0.2)[0])),
          int(round(a.left_pt(0.52, dvt - 0.2)[1])) - 1, "o")               # head glow

    # --- o/O water-quality GAUGE beside the door (the diagnosis read-out) ---
    g0 = a.left_pt(0.80, 3.0)
    gx, gy = int(round(g0[0])), int(round(g0[1]))
    c.set(gx, gy - 1, "K"); c.set(gx + 1, gy - 1, "K")
    c.set(gx, gy, "o"); c.set(gx + 1, gy, "O")        # lit gauge readout
    c.set(gx, gy + 1, "r"); c.set(gx + 1, gy + 1, "o")
    c.set(gx, gy + 2, "K"); c.set(gx + 1, gy + 2, "K")
    return a


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS life-support /
# aquaculture structure onto the prior rotunda — never restarts, never recolors the
# whole tank. Theme: the starter aquarium grows into a fully built-out, bio-luminescent
# AQUACULTURE RIG. Colours mature stage by stage (matured bark-green `b`, bio-glow
# `e/E`); gold (`q`) only as a t5 flourish. Every add is anchored OFF the tank/cap/annex
# geometry and kept CLEAR of the living KELP-AND-FISH ECOSYSTEM signature (which swirls
# inside the lit-LEFT half of the glass column), so the signature is never occluded.
#
#   t2  small functional add   : a roof SKIMMER box + a `c` water-quality probe pipe
#   t3  structural add         : a QUARANTINE SUMP-TANK annex (short cylinder) by the entry
#   t4  major add              : a tall STANDPIPE / PROTEIN-REACTOR column on the right
#   t5  crowning feature       : the reef blooms FULLY + a `q` GOLD cap-ring & window trim
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_skimmer(c, annex):
    """t2 — SMALL FUNCTIONAL ADD: a chunky roof SKIMMER box standing UP on the
    front-CENTRE of the tank cap, with a tall external GOOSENECK water-quality probe
    arcing up off it into the clear sky ABOVE the rim and dipping back DOWN into the
    water — so the rooflite reads as a distinct new life-support unit, not just more
    cap. Body is the LIGHT teal `c` (with `g/G` shading) so it pops as a solid object;
    one lit `e` probe tip + the entry-annex `o` gauge brightened to a lit `O`/`e`
    readout are the t2 accent pops. Seated front-CENTRE on the cap — well clear of the
    back-right base FILTER box, the lit-left VIEWING-WINDOW head below, and the reef
    inside the column."""
    cap_cy = TOP_Y
    # A clearly-readable box on the cap front-CENTRE, sitting on the water surface in
    # the open gap between the lit-left window head and the back-right filter box.
    # Drawn directly in screen space so it perches cleanly on the rim, not hovering.
    bx, by = CX - 5, cap_cy - 2            # front-centre of the cap (cols 25..29)
    BW, BH = 4, 4                          # body width / height
    # body block: light `c` lit face, `g` shaded right strip, `D` rim, `K` outline
    c.fill_poly([(bx, by), (bx + BW, by), (bx + BW, by + BH), (bx, by + BH)], "c")
    c.fill_poly([(bx + BW - 1, by + 1), (bx + BW, by + 1),
                 (bx + BW, by + BH), (bx + BW - 1, by + BH)], "g")     # shaded right
    c.line((bx, by), (bx + BW, by), "L")                              # lit top edge
    c.line((bx, by + 1), (bx + BW, by + 1), "D")                      # under-lip shade
    for a, e in [((bx, by), (bx, by + BH)), ((bx + BW, by), (bx + BW, by + BH)),
                 ((bx, by + BH), (bx + BW, by + BH)), ((bx, by), (bx + BW, by))]:
        c.line(a, e, "K")
    # a small `g` intake louver slit on the lit face (reads as a skimmer)
    c.line((bx + 1, by + 2), (bx + 2, by + 2), "G")
    c.set(bx + 1, by + 3, "h")                                        # one bright glint
    # GOOSENECK probe: rises off the box top, arcs UP into the clear sky above the rim,
    # then dips back DOWN through the rim into the water to the box's right. A clear,
    # tall external `c` arc so it reads as its own probe. All points clamped on-canvas.
    ax, ay = bx + 1, by - 1                # springs off the box top-left post
    arc = [(ax, ay), (ax, ay - 3), (ax + 2, ay - 5), (ax + 5, ay - 5),
           (ax + 7, ay - 3), (ax + 7, ay - 1), (ax + 7, ay + 2)]
    arc = [(min(63, max(0, px)), min(63, max(0, py))) for px, py in arc]
    for i in range(len(arc) - 1):
        c.line(arc[i], arc[i + 1], "c")
    c.set(arc[2][0], arc[2][1] - 1, "h")              # bright crown of the gooseneck
    tipx, tipy = arc[-1]
    c.set(tipx, min(63, tipy + 1), "e")               # lit probe tip dipping into water
    # brighten the entry-annex water-quality GAUGE to a lit readout (the t2 accent pop)
    g0 = annex.left_pt(0.80, 3.0)
    gx, gy = int(round(g0[0])), int(round(g0[1]))
    c.set(gx, gy, "O"); c.set(gx + 1, gy, "e")      # energized gauge readout


def stage3_sump(c):
    """t3 — STRUCTURAL ADD: a QUARANTINE SUMP-TANK — a short, fat second cylinder of its
    own `c/g` water — standing in the OPEN GROUND to the FRONT-LEFT of the rotunda, just
    forward of the entry annex (annex base ≈x14..22), so it reads as a distinct smaller
    tank tied to the rig. A matured bark-green `b` housing COLLAR rings its base and a
    short `b` pipe ties it to the entry annex (the quarantine feed). Introduces the
    matured bark-green tone `b`. Sited low-left (x≈9..17, y≈38..47) so it neither tangles
    the rotunda's base plinth nor reaches the reef inside."""
    scx, stop = 13, 39                              # sump centre-x, top-ellipse y
    srx, sh = 5, 7                                  # short + fat: a stout sump tank
    sry = 2.5
    # the second water cylinder (lighter `c` lit-left, deeper `g/G` right) — its own water
    cylinder(c, scx, stop, srx, sh, top="g", side_l="c", side_r="G", outline="K", ry=sry)
    # bright `h` waterline + `W` sparkle a couple px below its rim
    for col in range(-srx + 1, srx):
        t = 1 - (col / srx) ** 2
        if t < 0:
            continue
        edge = sry * (t ** 0.5)
        y = int(stop + 1.5 + (sry - edge) * 0.5)
        c.set(scx + col, y, "h" if col <= 0 else "c")
    c.set(scx - 2, int(stop + 1.5), "W")
    # --- matured bark-green `b` housing COLLAR ringing the sump base (the quarantine rig) ---
    base_cy = stop + sh
    for a in range(0, 181, 5):                      # front arc of a `b` collar band
        x = scx + (srx + 1) * math.cos(math.radians(a))
        y = base_cy + (sry + 0.5) * math.sin(math.radians(a))
        c.set(int(round(x)), int(round(y)), "b")
    c.line((scx - srx - 1, base_cy), (scx - srx - 1, base_cy + 2), "b")  # collar feet
    c.line((scx + srx + 1, base_cy), (scx + srx + 1, base_cy + 2), "b")
    for a in range(0, 181, 8):                      # K outline under the collar
        x = scx + (srx + 1) * math.cos(math.radians(a))
        y = base_cy + 2 + (sry + 0.5) * math.sin(math.radians(a))
        c.set(int(round(x)), int(round(y)), "K")
    # a short `b` quarantine feed pipe tying the sump up to the entry-annex base (to the
    # right of the sump). Kept low + short so it reads as one tie, not a stray line.
    c.line((scx + srx - 1, stop + 1), (scx + srx + 3, stop + 1), "b")
    c.set(scx + srx + 3, stop + 1, "D")
    c.set(scx + srx - 1, stop, "c")                 # water in the feed


def stage4_standpipe(c):
    """t4 — MAJOR ADD: a tall STANDPIPE / PROTEIN-REACTOR column rising alongside the
    rotunda on the plainer RIGHT side (clear of the lit-LEFT reef), so it reads as one
    aquaculture rig: a slim deep bark-green `b` column climbing well above the tank rim,
    carrying a glowing bio-luminescent `e` UV-STERILIZER band and a bubbling `h` water
    column inside. The prominent new vertical mass: 'this habitat now scrubs + sterilizes
    its water'. Palette matures to deep `b` + energized `e/E`. Kept fully on-canvas
    (column at x≈44..48) and well to the RIGHT of the tank so it never occludes the reef."""
    px = 45                                         # left edge of the reactor column
    PW = 3                                          # 3px-wide column
    base_y = BASE_Y - 1                             # foot at the tank base level
    top_y = 8                                       # TALL — climbs above the tank rim
    # column body: lit `b` left edge, deep `G` core, `K` shaded right edge
    c.line((px, base_y), (px, top_y), "b")
    c.fill_poly([(px + 1, top_y), (px + PW - 1, top_y),
                 (px + PW - 1, base_y), (px + 1, base_y)], "G")
    c.line((px + PW - 1, top_y), (px + PW - 1, base_y), "K")
    c.set(px, base_y, "K"); c.set(px + PW - 1, base_y, "K")
    # a domed `D` cap closing the column top + a `b` collar rib
    c.line((px, top_y), (px + PW - 1, top_y), "D")
    c.set(px + 1, top_y - 1, "L"); c.set(px + 1, top_y - 2, "M")   # small cap nub
    # a bubbling `h`/`W` water column rising INSIDE the reactor (over the G core)
    for k in range(0, 14):
        y = base_y - 1 - k * 2
        if y <= top_y:
            break
        xx = px + 1 + (k % 2)                        # gentle wobble of the bubble train
        c.set(xx, y, "W" if k % 3 == 0 else "h")
    # the glowing bio-luminescent `e` UV-STERILIZER band wrapping the column mid-height
    band_y = top_y + 9
    for yy in (band_y, band_y + 1, band_y + 2):
        c.line((px - 1, yy), (px + PW, yy), "e")
    c.line((px - 1, band_y), (px + PW, band_y), "E")        # bright top edge of the band
    c.set(px - 1, band_y + 1, "K"); c.set(px + PW, band_y + 1, "K")  # band end frames
    # a soft `e` glow halo bleeding off the lit band into the dark to its left
    for dx, dy in [(-2, 0), (-2, 1), (-3, 1)]:
        gx2, gy2 = px - 1 + dx, band_y + dy
        if 0 <= gx2 <= 63 and 0 <= gy2 <= 63:
            c.set(gx2, gy2, "e")
    # a short `b` cross-brace tying the column back to the tank wall (so it reads tied-on)
    brace_y = top_y + 4
    c.line((px - 4, brace_y + 1), (px, brace_y), "b")
    c.set(px - 4, brace_y + 1, "D")


def stage5_bloom(c):
    """t5 — CROWNING FEATURE = FULLY EVOLVED vivarium. The reef inside BLOOMS: a bright
    `E`-lit CORAL bloom fans up off the gravel, the fish school grows (extra `E`/`O` fish),
    and a glowing bio-luminescent `e/E` JELLYFISH drifts high in the column — the living
    column now reads maxed. The rig is dressed with GOLD premium trim: a `q` GOLD cap-RING
    on the tank rim and gold trim on the lit-LEFT VIEWING WINDOW. Reads as elite, still
    recognizably the same tank. All gold (`q`) lives ONLY here. Reef adds paint only over
    existing water pixels so they sit BEHIND the front glass like the base ecosystem."""
    water = ("g", "G", "c")
    # --- CORAL BLOOM: a bright branching coral fans up off the gravel, lit-centre, where
    #     it sits among the existing reef (kept inside the water silhouette). ---
    floor = BASE_Y - 5
    coral = [(-1, 0, "e"), (-1, -1, "E"), (-2, -1, "e"), (0, -1, "e"),
             (-2, -2, "E"), (0, -2, "e"), (-1, -2, "e"), (-3, -2, "e"),
             (1, -2, "e"), (-2, -3, "E"), (0, -3, "E"), (-3, -3, "e"), (1, -3, "e"),
             (-1, -4, "E"), (-3, -4, "e"), (1, -4, "e")]
    for dx, dy, ch in coral:
        x, y = CX + dx, floor + dy
        if 0 <= x < 64 and 0 <= y < 64 and c.px[y][x] in water:
            c.set(x, y, ch)
    # a few bright `E` polyp tips crowning the coral (only over water)
    for dx, dy in [(-2, -5), (0, -5), (-1, -5)]:
        x, y = CX + dx, floor + dy
        if 0 <= x < 64 and 0 <= y < 64 and c.px[y][x] in water:
            c.set(x, y, "E")
    # --- BIGGER FISH SCHOOL: two extra bright fish joining the diagonal (only over water) ---
    for fx, fy, head, body in [(CX - 6, TOP_Y + 11, "E", "e"), (CX - 3, TOP_Y + 7, "O", "o")]:
        if 0 <= fy < 64 and c.px[fy][fx] in water:
            _fish(c, fx, fy, head, body)
    # --- BIOLUMINESCENT JELLYFISH drifting high (an `e/E` glowing bell + `e` tendrils),
    #     placed upper-RIGHT-of-centre in the window, clear of the original jelly. ---
    jx, jy = CX - 2, TOP_Y + 5
    for dx, dy, ch in [(-1, -1, "e"), (0, -1, "E"), (1, -1, "e"),
                       (-1, 0, "e"), (0, 0, "E"), (1, 0, "E"), (2, 0, "e")]:
        x, y = jx + dx, jy + dy
        if 0 <= x < 64 and 0 <= y < 64 and c.px[y][x] in water + ("h",):
            c.set(x, y, ch)
    for k in range(1, 4):                            # glowing tendrils
        x, y = jx + int(math.sin(k * 0.9)), jy + 1 + k
        if 0 <= x < 64 and 0 <= y < 64 and c.px[y][x] in water:
            c.set(x, y, "e")
    # (the GOLD half of t5 is drawn LAST, in _stage5_gold, so it crowns the front glass.)


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the aquatic habitat at upgrade `stage` (1..5). Stage 1 is IDENTICAL to
    the shipped base; each higher stage keeps every prior addition and bolts on the next
    (t2 skimmer → t3 sump-tank → t4 standpipe → t5 reef-bloom+gold). Painter's order keeps
    the t5 reef adds painting only over water (so life sits behind the front glass), and
    the rooftop skimmer/probe + rim gold sit after the cap they grow from."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    base_slab(c)            # contact shadow + low substrate plinth (under/back)
    water_tank(c)           # the tall transparent glass WATER COLUMN body
    # the living ECOSYSTEM, drawn back->front INSIDE the water:
    gravel_bed(c)           # d/r gravel rooting bed on the floor
    kelp(c)                 # swaying g/G kelp fronds
    jellyfish(c)            # drifting h/c jelly bell
    fish_school(c)          # the O/o fish school + stray c fish
    light_shaft(c)          # soft c light beam from the lit-left
    # t5 reef bloom is added HERE (inside the water, before the front glass) so it sits
    # behind the glass exactly like the base ecosystem.
    if stage >= 5:
        stage5_bloom(c)
    # front glass detailing OVER the reef so life sits behind glass:
    glass_front(c)          # seams + waterline + LEFT viewing window
    bubbles(c)              # rising h/W bubble streams (over the glass)
    cap_and_filter(c)       # D cap ring + o filter box + c water-pipe
    annex = entry_annex(c)  # FRONT-LEFT annex => opening on the LEFT

    # --- CUMULATIVE UPGRADE STAGES (exterior masses, after the base tank/cap/annex) --
    # t3 sump + t4 standpipe are ground/side masses drawn after the tank so they sit in
    # front of / beside it. (t5's reef portion was drawn inside the water above; t5's
    # gold trim is drawn last so it crowns the finished form.)
    if stage >= 2:
        stage2_skimmer(c, annex)
    if stage >= 3:
        stage3_sump(c)
    if stage >= 4:
        stage4_standpipe(c)
    if stage >= 5:
        _stage5_gold(c)
    return c


def _stage5_gold(c):
    """The GOLD-trim half of t5, factored out so it can be drawn LAST (after every other
    stage) and crown the finished form. The reef-bloom half of t5 is drawn inside the
    water in build() before the front glass. RESTRAINT: gold is a premium FLOURISH, not
    a recolor — a single clean GOLD cap-RING tracing the visible FRONT arc of the tank
    rim (with a few bright `O` finial bosses), plus small gold corner bosses on the
    lit-LEFT viewing window. No long gold rails (they read as stray sticks); the trim
    stays a sparse, legible accent so the tank still reads as glass-and-water."""
    cap_cy = TOP_Y
    # GOLD cap-RING: trace only the FRONT arc of the rim (a=0..180) as a single clean
    # 1px gold band — a premium rim cap, not a heavy whole-rim recolor.
    for a in range(0, 181, 5):
        x = CX + (RX - 1) * math.cos(math.radians(a))
        y = cap_cy + (RY - 0.5) * math.sin(math.radians(a))
        c.set(int(round(x)), int(round(y)), "q")
    for a in (35, 90, 145):                          # three bright finial bosses on the ring
        x = CX + (RX - 1) * math.cos(math.radians(a))
        y = cap_cy + (RY - 0.5) * math.sin(math.radians(a))
        c.set(int(round(x)), int(round(y)), "O")
    # gold CORNER BOSSES on the lit-LEFT viewing window (top + bottom corners only — a
    # restrained premium tell, NO long head/sill rails that would read as stray bars).
    fx0, fx1 = CX - 9, CX
    fy0, fy1 = TOP_Y + 6, BASE_Y - 2
    for cxw, cyw in [(fx0, fy0), (fx1, fy0), (fx0, fy1), (fx1, fy1)]:
        c.set(cxw, cyw, "q")                         # gilded window corner
    # short 2px gold ticks inward from the two TOP corners so the window head reads
    # premium without a full rail across it
    c.set(fx0 + 1, fy0, "q"); c.set(fx1 - 1, fy0, "q")
    c.set(fx0, fy0, "O"); c.set(fx1, fy0, "O")       # bright top-corner bosses


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/biocore"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "aquatic-habitat"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG +
    scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must keep
    matching the shipped aquatic-habitat.png, so it does NOT overwrite the base PNG."""
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
