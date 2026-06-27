#!/usr/bin/env python3
"""
Electronics Bench — Volt Lab economy building (BESPOKE-form build).

NOT the gateway cube, and a NEW silhouette for the Volt set (none of the five made
Volt forms is a stepped block): a STEPPED / TERRACED two-volume building whose
roofline rises in two clear steps from front to back —

  * a LOW, WIDE front BENCH WING (a long squat lab bench) drawn IN FRONT, carrying
    a corrugated D-rib deck with a short K parapet lip; and
  * a NARROWER, clearly TALLER rear INSTRUMENT TOWER set BACK on the back-left,
    drawn FIRST so the bench wing occludes its base — the setback reads as one
    stepped building, not two abutting cubes.

Bespoke glazing: the main opening is a long horizontal DIAGNOSTICS WINDOW BAND of
small cyan readout panels on the RIGHT face of the bench wing (vary from the
left-opening siblings), a tall narrow instrument-rack slit on the tower's left
face, and a small K service door with a warning chevron at the right-front corner.

Signature (one-of-one): the upper tower deck is crowned by a giant working
OSCILLOSCOPE — a chunky K-bezelled CRT showing a live glowing CYAN waveform trace
(classic scope-trace; this palette has no green, so the trace reads cyan g/c/h)
over a faint graticule grid, with a row of tuning knobs and status LEDs below and
a thin o power line feeding it. No scope/CRT exists anywhere else in the catalog.

Composed entirely from art/isobuild.Box (no iso.draw_cube / base_windows).
"""
import os
import sys
import json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

VOLT = {"K": "#15181d", "W": "#eef2f6", "L": "#cdd6dd", "M": "#9aa3ad", "D": "#6c7682", "d": "#49515b",
        "h": "#d6f9ff", "c": "#aef0fb", "g": "#38cfe2", "G": "#1f8ba0",
        "o": "#ffe85a", "O": "#fff7a8", "r": "#c89a14"}


# ── low-level pixel helpers ──────────────────────────────────────────────────
def _rect(c, x0, y0, x1, y1, fill=None, outline=None):
    """Axis-aligned pixel rect (inclusive)."""
    if x0 > x1:
        x0, x1 = x1, x0
    if y0 > y1:
        y0, y1 = y1, y0
    if fill is not None:
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                c.set(x, y, fill)
    if outline is not None:
        for x in range(int(x0), int(x1) + 1):
            c.set(x, y0, outline)
            c.set(x, y1, outline)
        for y in range(int(y0), int(y1) + 1):
            c.set(x0, y, outline)
            c.set(x1, y, outline)


def _ipt(p):
    return (int(round(p[0])), int(round(p[1])))


# ── 1. REAR INSTRUMENT TOWER — narrow, TALL, set back on the back-left ────────
def tower(c):
    """The taller rear volume. Narrower footprint, clearly taller (h=24) than the
    bench wing, set BACK on the back-left with its top pushed high so its upper
    third rises ABOVE the bench roofline as the second terrace step. Drawn FIRST so
    the bench occludes its base. A tall narrow instrument-rack slit lights its lit
    (left) face."""
    t = Box(top=(23, 13), wx=7, wy=6, h=22)
    t.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # tall narrow instrument-rack slit on the lit (left) face — a single c/g column
    # framed in K, NOT a stock window. Reads as a 19" rack cabinet glass front.
    u0, u1, vt, vb = 0.30, 0.56, 3.0, 16.0
    c.fill_poly([t.left_pt(u0, vt), t.left_pt(u1, vt),
                 t.left_pt(u1, vb), t.left_pt(u0, vb)], "K")
    c.fill_poly([t.left_pt(u0 + 0.03, vt + 0.6), t.left_pt(u1 - 0.03, vt + 0.6),
                 t.left_pt(u1 - 0.03, vb - 0.5), t.left_pt(u0 + 0.03, vb - 0.5)], "c")
    # rack of horizontal unit dividers (g) so it reads as stacked instruments
    for rv in (vt + 1.8, vt + 3.6, vt + 5.4, vt + 7.2, vt + 9.0, vt + 10.8, vt + 12.2):
        c.line(t.left_pt(u0 + 0.04, rv), t.left_pt(u1 - 0.04, rv), "g")
    # a couple of c indicator dots glinting on the rack
    for dv in (vt + 0.9, vt + 5.6):
        p = _ipt(t.left_pt(u0 + 0.10, dv))
        c.set(p[0], p[1], "h")
    return t


def tower_deck(c, t):
    """A clean flat upper deck with a short K parapet lip along the front edge — the
    plinth the oscilloscope stands on. Bright W back edges already laid by draw()."""
    # thin D rim just inside the deck rim so the deck reads capped (vs. open roof)
    fr = [t.roof_pt(0.12, 0.12), t.roof_pt(0.88, 0.12),
          t.roof_pt(0.88, 0.88), t.roof_pt(0.12, 0.88)]
    c.line(fr[0], fr[1], "D")
    c.line(fr[3], fr[0], "D")
    # short K parapet lip along the FRONT (front-left & front-right) deck edges
    c.line(t.r_left, t.r_front, "K")
    c.line(t.r_front, t.r_right, "K")


# ── 2. FRONT BENCH WING — low, wide, drawn IN FRONT (occludes the tower base) ─
def bench(c):
    """The low broad front workbench wing — squat & wide like a long lab bench.
    Its back-top corner sits down-and-right of the tower so its footprint laps in
    front of the tower's base, making the two volumes read as one stepped form.
    Returns the Box for face placement."""
    b = Box(top=(29, 30), wx=12, wy=8, h=11)
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    return b


def bench_roof(c, b):
    """The lower bench deck: corrugated D ribs + K rivet dots (Volt motif) and a
    short K parapet lip along the front edge, so the bench reads as a flat-roofed
    lower step beneath the taller tower behind it."""
    # corrugated D ribs running parallel to the LEFT roof axis (one iso direction)
    # so each rib is a crisp continuous (-2,+1)-slope line, not dotted speckle.
    for u in (0.20, 0.36, 0.52, 0.68, 0.84):
        c.line(b.roof_pt(u, 0.12), b.roof_pt(u, 0.88), "D")
    # a brighter L glint rib between them on the lit back half (catches light)
    for u in (0.28, 0.60):
        c.line(b.roof_pt(u, 0.12), b.roof_pt(u, 0.50), "L")
    # K rivet dots along the back deck edge
    for u in (0.22, 0.46, 0.70):
        p = _ipt(b.roof_pt(u, 0.12))
        c.set(p[0], p[1], "K")
    # short K parapet lip on the bench front edges (the terrace step reads crisp)
    c.line(b.r_left, b.r_front, "K")
    c.line(b.r_front, b.r_right, "K")
    # a thin L glint just inside the front parapet so the lip catches light
    c.line(b.left_pt(0.04, 0.6), b.left_pt(0.96, 0.6), "L")


# ── 3. DIAGNOSTICS WINDOW BAND on the RIGHT face (the main opening) ───────────
def diagnostics_band(c, b):
    """A single wide horizontal ribbon of small cyan readout panels under ONE K
    lintel, on the bench wing's RIGHT (shaded) face — the building's main opening,
    on the right (vary from the left-opening siblings). Four little g panels in a
    row, each with a c lit edge and an h glint, divided by thin K mullions. Reads
    as a bank of diagnostic readouts, NOT two stock gateway windows."""
    u0, u1, vt, vb = 0.08, 0.70, 2.6, 6.4
    # K lintel/frame ribbon across the right face
    c.fill_poly([b.right_pt(u0, vt), b.right_pt(u1, vt),
                 b.right_pt(u1, vb), b.right_pt(u0, vb)], "K")
    # the cyan readout field inset inside the K ribbon
    iu0, iu1, ivt, ivb = u0 + 0.015, u1 - 0.015, vt + 0.6, vb - 0.6
    c.fill_poly([b.right_pt(iu0, ivt), b.right_pt(iu1, ivt),
                 b.right_pt(iu1, ivb), b.right_pt(iu0, ivb)], "g")
    # lit upper edge + shaded lower edge so the band reads recessed/glassy
    c.line(b.right_pt(iu0, ivt + 0.2), b.right_pt(iu1, ivt + 0.2), "c")
    c.line(b.right_pt(iu0, ivb - 0.2), b.right_pt(iu1, ivb - 0.2), "G")
    # divide into 4 readout panels with thin K mullions
    span = iu1 - iu0
    for m in range(1, 4):
        um = iu0 + span * m / 4.0
        c.line(b.right_pt(um, ivt), b.right_pt(um, ivb), "K")
    # an h glint + a faint o scrolling value on alternating panels (live readouts)
    for k in range(4):
        cu = iu0 + span * (k + 0.5) / 4.0
        gp = _ipt(b.right_pt(cu - span * 0.07, ivt + 0.7))
        c.set(gp[0], gp[1], "h")
        if k % 2 == 0:
            vp = _ipt(b.right_pt(cu, ivt + 1.6))
            c.set(vp[0], vp[1], "o")


def service_door(c, b):
    """A small K service door at the right-front corner of the bench wing with a
    warning chevron on its sill (Volt motif), tucked low on the right face near the
    front edge so it sits at the corner without crowding the readout band above."""
    u0, u1, vt, vb = 0.74, 0.94, 6.6, 9.6
    # K opening frame
    c.fill_poly([b.right_pt(u0, vt), b.right_pt(u1, vt),
                 b.right_pt(u1, vb), b.right_pt(u0, vb)], "K")
    # D door leaf inset, lit left jamb + dark seam so it reads as a closed door
    c.fill_poly([b.right_pt(u0 + 0.02, vt + 0.4), b.right_pt(u1 - 0.02, vt + 0.4),
                 b.right_pt(u1 - 0.02, vb - 0.2), b.right_pt(u0 + 0.02, vb - 0.2)], "D")
    c.line(b.right_pt(u0 + 0.02, vt + 0.4), b.right_pt(u0 + 0.02, vb - 0.2), "M")
    c.line(b.right_pt(0.5 * (u0 + u1), vt + 0.6), b.right_pt(0.5 * (u0 + u1), vb - 0.3), "K")
    # o/K warning chevron band on the sill below the door
    haz = _ipt(b.right_pt(u0, vb + 0.2))
    for k in range(5):
        c.set(haz[0] + k * 2, haz[1], "o")
        c.set(haz[0] + k * 2 + 1, haz[1], "K")


# ── 4. Volt motifs — glowing power line + a power conduit down a front corner ─
def power_run(c, b):
    """o glowing power line along the bench eave (front lit edge) + an o power
    conduit dropping down the bench's front corner (Volt motif). The conduit's top
    is left dangling toward the scope's power-feed start point."""
    # glowing o power rail along the lit (left) front eave, with an r shaded twin
    c.line(b.left_pt(0.05, 1.6), b.left_pt(0.95, 1.6), "o")
    c.line(b.left_pt(0.05, 2.3), b.left_pt(0.95, 2.3), "r")
    # o power conduit down the front corner (vertical front edge)
    top = (int(round(b.r_front[0])), int(round(b.r_front[1])) + 1)
    bot = (int(round(b.w_front[0])), int(round(b.w_front[1])) - 2)
    c.line((top[0] - 1, top[1]), (bot[0] - 1, bot[1]), "o")
    c.line(top, bot, "r")
    for t in (0.35, 0.7):
        cy = int(top[1] + t * (bot[1] - top[1]))
        c.set(top[0] - 2, cy, "K")  # clamp


# ── 5. SIGNATURE — a giant working OSCILLOSCOPE CRT on the tower deck ─────────
def oscilloscope(c, t):
    """A chunky K-bezelled CRT standing proud on the upper tower deck, facing the
    viewer, crowned by a live glowing CYAN waveform trace over a faint graticule.
    Below the bezel: a row of round tuning knobs and two status LEDs. A thin o
    power line feeds it from the conduit run. One-of-one in the catalog."""
    # anchor on the deck, biased slightly back so the bench never overlaps it
    cx, cy = _ipt(t.roof_pt(0.50, 0.46))

    # --- screen-box dimensions (axis-aligned, drawn proud above the deck) ---
    HW, HH = 8, 5          # half-width / half-height of the screen field
    BEZEL = 1              # K bezel thickness around the screen
    sx0, sx1 = cx - HW, cx + HW
    sy1 = cy - 2           # bottom of the screen sits just above the deck anchor
    sy0 = sy1 - 2 * HH     # top of the screen

    # 1) K bezel block (the chunky CRT frame) — a solid K rect a touch bigger than
    #    the screen on every side, plus a short body band below so it reads as a box.
    _rect(c, sx0 - BEZEL, sy0 - BEZEL, sx1 + BEZEL, sy1 + BEZEL + 3, fill="K")
    # a thin M lit left flank + L top crest so the bezel has volume (not a flat slab)
    c.line((sx0 - BEZEL, sy0 - BEZEL), (sx0 - BEZEL, sy1 + BEZEL + 3), "M")
    c.line((sx0 - BEZEL, sy0 - BEZEL), (sx1 + BEZEL, sy0 - BEZEL), "L")

    # 2) DARK SCREEN FIELD (d body, K corners) — the phosphor face. A SPARSE G
    #    graticule (two faint vertical divisions + one horizontal centre axis) so
    #    the cyan waveform stays the clear hero, not lost in a busy grid.
    _rect(c, sx0, sy0, sx1, sy1, fill="d")
    midx, midy = cx, (sy0 + sy1) // 2
    for gx in (sx0 + (sx1 - sx0) // 3, sx0 + 2 * (sx1 - sx0) // 3):
        c.line((gx, sy0 + 1), (gx, sy1 - 1), "G")
    c.line((sx0 + 1, midy), (sx1 - 1, midy), "G")

    # 3) THE LIVE WAVEFORM — a bright cyan trace sweeping across the screen. A
    #    glowing sine-ish run drawn 1px in g with c highlights; one O white-hot blip
    #    at the cursor. (Classic scope-trace; cyan stands in for the green phosphor.)
    import math
    amp = HH - 2
    width = sx1 - sx0

    def trace_y(x):
        """One clean ~1.25-cycle sine sweep left->right (classic scope trace)."""
        ph = (x - sx0) / width * 2 * math.pi * 1.25
        return midy - int(round(amp * math.sin(ph)))

    prev = None
    cur_col = sx0 + (3 * width) // 5   # cursor x just right of centre
    for x in range(sx0 + 1, sx1):
        y = trace_y(x)
        c.set(x, y, "g")
        if prev is not None and abs(y - prev) > 1:
            # draw the vertical riser so the trace is continuous (no gaps on slopes)
            step = 1 if y > prev else -1
            for yy in range(prev, y, step):
                c.set(x, yy, "g")
        # c highlight on the crests/troughs for the phosphor glow
        if y <= midy - amp + 1:
            c.set(x, y - 1, "c")
        prev = y
    # O white-hot cursor blip riding on the trace
    cb_y = trace_y(cur_col)
    c.set(cur_col, cb_y, "O")
    c.set(cur_col, cb_y - 1, "h")

    # 4) TUNING KNOBS + STATUS LEDs on the bezel body band below the screen.
    knob_y = sy1 + BEZEL + 2
    for i, kx in enumerate(range(sx0 + 2, sx1 - 1, 4)):
        # M knob disk with K rim + one o pointer dot
        _rect(c, kx - 1, knob_y - 1, kx + 1, knob_y + 1, fill="M")
        c.set(kx - 1, knob_y - 1, "K")
        c.set(kx + 1, knob_y + 1, "K")
        c.set(kx - 1, knob_y + 1, "K")
        c.set(kx + 1, knob_y - 1, "K")
        c.set(kx, knob_y, "L")
        c.set(kx, knob_y - 1, "o")   # pointer dot
    # two status LEDs at the bezel's right shoulder (o then O = arming/live)
    led = (sx1 - 1, sy0 + 1)
    c.set(led[0], led[1], "o")
    c.set(led[0], led[1] + 1, "O")

    # 5) thin o POWER LINE feeding the scope from the front conduit run: a short
    #    glowing lead from the bezel base down the front of the tower toward the
    #    bench eave (so the scope reads wired into the building's power).
    feed_top = (sx0 + 1, sy1 + BEZEL + 4)
    feed_bot = _ipt(t.roof_pt(0.30, 0.92))
    c.line(feed_top, feed_bot, "o")
    c.set(feed_bot[0], feed_bot[1] + 1, "r")


def build():
    c = Canvas()
    # painter's order: rear TALL tower first (back volume) + its deck, then the
    # LOW wide bench in front (occludes the tower base -> stepped form), then the
    # bench deck, the right-face diagnostics band + service door, the power run,
    # and finally the oscilloscope crowning the tower deck (drawn on top).
    t = tower(c)
    tower_deck(c, t)
    b = bench(c)
    bench_roof(c, b)
    diagnostics_band(c, b)
    service_door(c, b)
    power_run(c, b)
    oscilloscope(c, t)

    spec = {"width": 64, "height": 64, "palette": VOLT, "rows": c.rows()}
    out = "/path/to/scienium/art/src/buildings/volt_lab_electronics-bench.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
