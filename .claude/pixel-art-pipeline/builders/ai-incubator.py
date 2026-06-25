#!/usr/bin/env python3
"""
AI Incubator — Volt Lab economy building (BESPOKE form, the set's PREMIUM capstone).

A SLEEK ROUND DRUM PAVILION. The body is a true cylinder (isobuild.cylinder) — a
wide, low polished drum — not a box, not the gateway cube, and not the 3D-Print
square tower+hemisphere. The drum reads round from rim to base. It carries:
  • a continuous cyan curtain-glass ribbon band wrapping the upper drum (panes
    following the ellipse curve = the premium round curtain wall),
  • a glowing `o` power ring at the base + a rivet seam mid-drum (Volt motifs),
  • a sleek low W/L disc cap (a flat lens, NOT a full hemisphere) rimmed in K,
  • a low rectilinear ENTRY PODIUM abutting the FRONT-RIGHT (clean K-framed lobby
    glass + door) — so the main opening is on the RIGHT, and
  • the signature: a hovering NEURAL-NETWORK CONSTELLATION ORB cradled above the
    cap — bright O/o nodes wired by g/c synapse arcs with one W/h pulse + O blip
    travelling an edge (the model thinking), a c glow halo, h sparkles, fed by a
    thin o power line rising from the drum into the cradle.

Composed from art/isobuild.{cylinder,Box} — NO iso.draw_cube / base_windows.
"""
import os
import sys
import json
import math

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box, cylinder

VOLT = {"K": "#15181d", "W": "#eef2f6", "L": "#cdd6dd", "M": "#9aa3ad", "D": "#6c7682", "d": "#49515b",
        "h": "#d6f9ff", "c": "#aef0fb", "g": "#38cfe2", "G": "#1f8ba0",
        "o": "#ffe85a", "O": "#fff7a8", "r": "#c89a14"}


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


# Drum geometry (shared by several passes) ───────────────────────────────────
CX = 30
TOP_Y = 20          # y of the drum's top-ellipse centre
RX = 14             # drum horizontal radius (wide => low + premium)
RY = 7              # drum vertical radius (2:1 ellipse)
DRUM_H = 16         # drum wall height


def drum_hw(yy):
    """Half-width of the drum's top/bottom ellipse at vertical offset yy from the
    ellipse centre (|yy| <= RY). Used to clip ribbon panes + caps to the curve."""
    t = 1 - (yy / RY) ** 2
    if t < 0:
        return -1
    return RX * (t ** 0.5)


# ── low base slab (drawn FIRST, sits under + behind the drum) ────────────────
def base_slab(c):
    """A low, slightly wider plinth the drum stands on — a clean polished disc
    plus a thin K shadow lip, giving the round body a grounded premium footing."""
    base_y = TOP_Y + DRUM_H            # drum bottom-ellipse centre
    # soft contact shadow under the whole footprint
    for yy in range(-RY - 1, RY + 4):
        hw = drum_hw(min(abs(yy), RY)) + 2.5
        if hw < 0:
            continue
        y = base_y + 4 + int(yy * 0.5)
        for x in range(int(CX - hw), int(CX + hw) + 1):
            if (x - CX) ** 2 / (hw ** 2) + ((y - (base_y + 5)) ** 2) / (3.0 ** 2) <= 1:
                c.set(x, y, "K")
    # polished base disc (a low ring just below the drum), lit-left/shaded-right
    for yy in range(-2, 4):
        hw = drum_hw(RY - 0.5)
        ehw = hw + 1.5
        y = base_y + 3 + yy
        for x in range(int(CX - ehw), int(CX + ehw) + 1):
            if (x - CX) ** 2 / (ehw ** 2) + (yy ** 2) / (3.5 ** 2) <= 1:
                c.set(x, y, "M" if x <= CX else "d")
    # bright top edge of the disc
    for a in range(180, 361, 4):
        x = CX + (drum_hw(RY - 0.5) + 1.5) * math.cos(math.radians(a))
        y = base_y + 2 + 3.5 * math.sin(math.radians(a))
        c.set(x, y, "L")
    # K outline of the disc front arc
    for a in range(0, 181, 4):
        x = CX + (drum_hw(RY - 0.5) + 1.5) * math.cos(math.radians(a))
        y = base_y + 5 + 3.5 * math.sin(math.radians(a))
        c.set(x, y, "K")


# ── the DRUM body ────────────────────────────────────────────────────────────
def drum(c):
    """The polished round cylinder body — the dominant mass. Lit L/M left half,
    shaded D right half, bright W top with a W rim glint."""
    d = cylinder(c, CX, TOP_Y, RX, DRUM_H,
                 top="L", side_l="M", side_r="D", outline="K", ry=RY)
    base_y = TOP_Y + DRUM_H

    # --- ONE clean vertical sheen highlight (W) flanked by soft L on the lit
    # half, so the cylinder reads as smooth polished steel — no busy banding.
    # The ribbon band paints over this row-range later, so the sheen reads as a
    # single uninterrupted column of light. ---
    for col, ch in ((-6, "L"), (-5, "W"), (-4, "L")):
        edge = RY * (1 - (col / RX) ** 2) ** 0.5
        y0 = int(TOP_Y + edge)
        for y in range(y0, base_y + 1):
            c.set(CX + col, y, ch)
    # a single soft shaded streak on the right half (curvature of the far side)
    for col in (8,):
        edge = RY * (1 - (col / RX) ** 2) ** 0.5
        y0 = int(TOP_Y + edge)
        for y in range(y0, base_y + 1):
            c.set(CX + col, y, "d")

    # --- bright W rim glint along the back-upper arc of the top ellipse ---
    for a in range(182, 360, 4):
        x = CX + RX * math.cos(math.radians(a))
        y = TOP_Y + RY * math.sin(math.radians(a))
        c.set(x, y, "W")
    return d


def _band_top(col):
    """Top-y of the window ribbon at a given column, following the drum's front
    curve (the band centre dips toward mid-front so it reads as wrapping the
    cylinder). Returns None for columns outside the drum."""
    t = 1 - (col / RX) ** 2
    if t < 0:
        return None
    edge = RY * (t ** 0.5)
    band_top = TOP_Y + 4            # how far below the rim the band starts
    return band_top + (RY - edge) * 0.55


def ribbon_band(c):
    """ONE crisp K-framed cyan WINDOW RIBBON wrapping the upper drum — a single
    clean curved curtain-glass band (not a busy mid-band). Built in clean passes:
      1. solid 3px glass band, lit->shaded across the curve (c / g / G),
      2. a single bright top reflection line,
      3. K top rail + K bottom rail framing the band,
      4. evenly-spaced K mullions = the pane dividers.
    Inset 1 column from the drum edges so its frame never fights the K outline."""
    band_h = 3
    lo, hi = -RX + 2, RX - 2        # inset from the drum's K outline
    # 1 + 2: glass fill with a bright top reflection line
    for col in range(lo, hi + 1):
        cy = _band_top(col)
        if cy is None:
            continue
        cy = int(round(cy))
        glass = "c" if col <= -5 else ("g" if col <= 4 else "G")
        for k in range(band_h):
            c.set(CX + col, cy + k, glass)
        c.set(CX + col, cy, "h" if col <= -5 else "c")   # top reflection line
    # 3: K frame rails, top + bottom, following the curve
    for col in range(lo, hi + 1):
        cy = _band_top(col)
        if cy is None:
            continue
        cy = int(round(cy))
        c.set(CX + col, cy - 1, "K")
        c.set(CX + col, cy + band_h, "K")
    # close the K frame at the two band ends (vertical jambs)
    for end in (lo, hi):
        cy = _band_top(end)
        if cy is None:
            continue
        cy = int(round(cy))
        for k in range(-1, band_h + 1):
            c.set(CX + end, cy + k, "K")
    # 4: evenly-spaced K mullions = the pane dividers
    for col in range(lo + 3, hi - 1, 3):
        cy = _band_top(col)
        if cy is None:
            continue
        cy = int(round(cy))
        for k in range(band_h):
            c.set(CX + col, cy + k, "K")


def power_ring(c):
    """A glowing `o` accent ring running the BASE of the drum (Volt power-line
    motif, curved to the round body) with a brighter O highlight on the lit side
    and an r shaded underside."""
    ring_y = TOP_Y + DRUM_H - 1
    for col in range(-RX + 1, RX):
        t = 1 - (col / RX) ** 2
        if t < 0:
            continue
        edge = RY * (t ** 0.5)
        # front arc of the base: dips down toward the middle-front
        y = int(ring_y + (RY - edge) * 0.6) + 1
        glow = "O" if col <= -3 else ("o" if col <= 6 else "r")
        c.set(CX + col, y, glow)
        c.set(CX + col, y + 1, "r")               # shaded underside of the ring


# ── the sleek DISC CAP over the drum (a low flat lens, NOT a hemisphere) ──────
def disc_cap(c):
    """A shallow polished W/L lens capping the drum — low + sleek, K-rimmed. Two
    thin stacked ellipses (a flat-topped disc) so it reads as a clean premium
    roof, not the 3D-Print full dome."""
    cap_cx, cap_cy = CX, TOP_Y - 3
    crx, cry = RX - 3, (RY - 1.5)
    # lower flange ellipse (the disc's thickness), shaded
    for yy in range(int(-cry), int(cry) + 1):
        t = 1 - (yy / cry) ** 2
        if t < 0:
            continue
        hw = crx * (t ** 0.5)
        for x in range(int(cap_cx - hw), int(cap_cx + hw) + 1):
            c.set(x, cap_cy + 2 + yy, "M" if x <= cap_cx else "D")
    # top ellipse (the polished lens face), lit
    for yy in range(int(-cry), int(cry) + 1):
        t = 1 - (yy / cry) ** 2
        if t < 0:
            continue
        hw = crx * (t ** 0.5)
        for x in range(int(cap_cx - hw), int(cap_cx + hw) + 1):
            c.set(x, cap_cy + yy, "L" if x <= cap_cx else "M")
    # bright W highlight crescent on the lit-back of the lens
    for a in range(190, 350, 5):
        x = cap_cx + crx * math.cos(math.radians(a))
        y = cap_cy + cry * math.sin(math.radians(a))
        c.set(x, y, "W")
    # a small W specular glint
    c.set(cap_cx - 4, cap_cy - 2, "W")
    c.set(cap_cx - 3, cap_cy - 2, "h")
    # K rim outline (full ellipse of the top lens + front arc of the flange)
    for a in range(0, 360, 4):
        x = cap_cx + crx * math.cos(math.radians(a))
        y = cap_cy + cry * math.sin(math.radians(a))
        c.set(x, y, "K")
    for a in range(0, 181, 4):
        x = cap_cx + crx * math.cos(math.radians(a))
        y = cap_cy + 2 + cry * math.sin(math.radians(a))
        c.set(x, y, "K")
    # the two vertical seam edges of the flange
    c.set(int(cap_cx - crx), int(cap_cy), "K")
    c.set(int(cap_cx - crx), int(cap_cy + 2), "K")
    c.set(int(cap_cx + crx), int(cap_cy), "K")
    c.set(int(cap_cx + crx), int(cap_cy + 2), "K")
    return (cap_cx, cap_cy)


# ── ENTRY PODIUM (low, rectilinear, FRONT-RIGHT) → opening on the RIGHT ───────
def entry_podium(c):
    """A low clean rectilinear vestibule abutting the FRONT-RIGHT of the drum.
    Drawn AFTER the drum so it sits in front-right => the main opening is RIGHT.
    K-framed lobby glass + a K door + an o/K chevron accent on the sill."""
    p = Box((40, 30), wx=6, wy=5, h=9)
    p.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # --- wide lobby GLASS on the RIGHT (shaded) face = the entrance glazing ---
    p.window(c, "right", 0.16, 0.84, 1.5, 5.5, glass="g", hi="h", shade="G",
             frame="K", mullions=2)
    # bright h reflection sweep across the top of the lobby glass
    c.line(p.right_pt(0.20, 2.0), p.right_pt(0.60, 2.0), "h")

    # --- a grounded K-framed glass DOOR on the LEFT (lit) face of the podium,
    # facing front-right alongside the lobby glass; reads as the way in ---
    du0, du1, dvt, dvb = 0.40, 0.78, 2.5, p.h - 0.5
    c.fill_poly([p.left_pt(du0, dvt), p.left_pt(du1, dvt),
                 p.left_pt(du1, dvb), p.left_pt(du0, dvb)], "K")        # frame
    c.fill_poly([p.left_pt(du0 + 0.04, dvt + 0.6), p.left_pt(du1 - 0.04, dvt + 0.6),
                 p.left_pt(du1 - 0.04, dvb), p.left_pt(du0 + 0.04, dvb)], "h")  # glass leaf
    c.line(p.left_pt(du0 + 0.04, dvt + 1.4), p.left_pt(du1 - 0.04, dvt + 1.4), "c")
    c.line(p.left_pt(0.59, dvt + 0.6), p.left_pt(0.59, dvb), "K")       # door seam

    # --- o/K chevron accent on the podium front sill (Volt chevron motif) ---
    sill_l = p.right_pt(0.16, 5.6)
    sill_r = p.right_pt(0.84, 5.6)
    sxl, syl = int(round(sill_l[0])), int(round(sill_l[1]))
    sxr = int(round(sill_r[0]))
    x = sxl + 1
    while x < sxr:
        c.set(x, syl, "o")
        c.set(x + 1, syl, "K")
        x += 2
    # small o chevron mark centred over the door head
    dh = p.left_pt(0.59, dvt - 0.2)
    dhx, dhy = int(round(dh[0])), int(round(dh[1]))
    c.set(dhx, dhy - 1, "o"); c.set(dhx - 1, dhy, "o"); c.set(dhx + 1, dhy, "o")
    return p


# ── SIGNATURE: hovering neural-network constellation orb ─────────────────────
def _node(c, nx, ny, bright):
    """Stamp one network node as a clean 4-way plus: a glowing core with a thin
    halo. A COMPACT 2px node — a bright core with a single soft shade pixel below
    — so the constellation reads as crisp graph dots, not a spray of plus-arms.
    `bright` (just-fired) nodes get an O core; quiet nodes an o core."""
    nx, ny = int(round(nx)), int(round(ny))
    core = "O" if bright else "o"
    c.set(nx, ny, core)
    c.set(nx, ny + 1, "r")          # one soft shade pixel = a tiny round node


def neural_orb(c, cap_center):
    """A glowing neural-net CONSTELLATION orb hovering in a glass cradle above the
    disc cap. A CLEAN, sparse layered graph: 6 well-spaced O/o nodes wired by
    single-pixel g/c synapse arcs, ONE bright W/h pulse edge carrying an O blip
    (the activation firing), a soft c glow halo + h sparkles, and a thin o power
    feed rising from the cap into the cradle. The premium one-of-one feature.

    Node layout (centre-relative) — a compact, SYMMETRIC hub-and-spoke graph so
    it reads instantly as one floating constellation, not a scatter of dots:
        hub(0,0) at the orb centre, with 5 satellites on a tight ring around it.
    Every satellite is wired to the hub by a clean single-pixel g/c link; the
    hub->crown link carries the one bright pulse + O blip.
    """
    cap_cx, cap_cy = cap_center
    orb_cx = cap_cx
    orb_cy = cap_cy - 11

    # --- small tight c glow halo hugging the orb (sparse, painted FIRST) ---
    for a in range(0, 360, 45):
        x = orb_cx + 7 * math.cos(math.radians(a))
        y = orb_cy + 4 * math.sin(math.radians(a))
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < 64 and 0 <= yi < 64 and c.px[yi][xi] == ".":
            c.set(x, y, "c")

    # --- thin o power feed + small glass cradle directly below the orb ---
    cradle_y = orb_cy + 7
    for y in range(int(cap_cy - 3), cradle_y + 1):
        c.set(orb_cx, y, "o")
    c.set(orb_cx, int(cap_cy - 3), "O")
    # a small OPEN glass cradle cup: a tight c bowl arc with a K rim + two
    # upturned arms, so the orb reads as cradled rather than sitting on a bar.
    for a in range(205, 336, 18):
        x = orb_cx + 4 * math.cos(math.radians(a))
        y = cradle_y + 2.0 * math.sin(math.radians(a))
        c.set(x, y, "c")
        c.set(x, y + 1, "G")               # shaded bowl underside
    c.set(orb_cx - 4, cradle_y - 1, "K")   # left rim
    c.set(orb_cx + 4, cradle_y - 1, "K")   # right rim
    c.set(orb_cx, cradle_y + 2, "K")       # cup base K

    # --- the network: 1 hub + 5 satellites on a tight ring (symmetric graph) ---
    hub = (orb_cx, orb_cy)
    sats = [
        (orb_cx,     orb_cy - 4),   # 0 crown   (top)        <- pulse target
        (orb_cx - 6, orb_cy - 1),   # 1 upper-left
        (orb_cx + 6, orb_cy - 1),   # 2 upper-right
        (orb_cx - 4, orb_cy + 3),   # 3 lower-left
        (orb_cx + 4, orb_cy + 3),   # 4 lower-right
    ]
    bright_sat = {0}                        # the crown just fired

    # clean single-pixel links hub -> each satellite (skip the pulse one) ---
    for i, (sx, sy) in enumerate(sats):
        if i == 0:
            continue                        # crown link is the bright pulse below
        col = "c" if sy < orb_cy else "g"   # lit links above centre, shaded below
        c.line(hub, (sx, sy), col)

    # --- traveling PULSE: hub -> crown lit bright W with an O blip mid-link ---
    cr = sats[0]
    c.line(hub, cr, "W")
    midy = int(round((hub[1] + cr[1]) / 2))
    c.set(orb_cx, midy, "O")                # the activation blip
    c.set(orb_cx, midy - 1, "h")

    # --- nodes on top of the links: hub bright, satellites quiet (crown bright) ---
    _node(c, hub[0], hub[1], True)
    for i, (sx, sy) in enumerate(sats):
        _node(c, sx, sy, i in bright_sat)

    # --- two tight h glints selling the premium hover (hugging the orb) ---
    c.set(orb_cx - 8, orb_cy - 1, "h")     # lit-side glint
    c.set(orb_cx + 8, orb_cy - 1, "c")     # shaded-side faint glint


def build():
    c = Canvas()
    base_slab(c)            # low plinth (back/under)
    drum(c)                 # the round drum body
    ribbon_band(c)          # ONE crisp K-framed cyan window ribbon on the drum
    power_ring(c)           # glowing o accent ring at the base (Volt motif)
    cap = disc_cap(c)       # sleek low disc cap
    entry_podium(c)         # FRONT-RIGHT vestibule => opening on the RIGHT
    neural_orb(c, cap)      # signature constellation orb hovering above (on top)
    spec = {"width": 64, "height": 64, "palette": VOLT, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/volt_lab_ai-incubator.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
