#!/usr/bin/env python3
"""
Wet Lab — BioCore economy building (BESPOKE iso form, NOT the gateway cube).

Composed from the iso BUILDING TOOLKIT (isobuild.Box) as a WIDE LOW assay HALL
with its own BioCore massing and a CENTRAL clerestory daylight monitor:

  * a broad, low main hall Box (wide & squat, unlike the tall square gateway) in
    green M/D walls with a D/d wood-frame bench band;
  * a narrow raised CLERESTORY MONITOR Box centred on the roof RIDGE (a glazed
    daylight scoop, c/h side glazing, L/W cap) — the signature roofline that says
    "greenhouse light over a busy benchlab", distinct from every sibling and
    centred (not pulled back-left like the Volt CNC monitor);
  * small o/r reagent vent pipes at the two ridge ends;
  * a clean wet-lab face, NOT a machine shop: opaque green right face with one
    small vent; the hero is on the LIT LEFT.

OPENING SIDE = LEFT. The lit left face carries a continuous low bench-window run
(g/c panes, h reflections) and a centred K-framed glass entry door with a soft
o/O interior glow — a clean glass entry, NOT a roll-up shutter.

Signature (one-of-one): a LONG BACKLIT RACK OF BUBBLING ASSAY TEST-TUBES on the
left bench window — 6 slim c/g glass tubes in a D rack, filled with a graded
teal->green->amber assay gradient (c, g, G, o, O) with tiny rising h/W bubbles,
a bright h backlight panel glowing behind them, a thin o reagent-label strip
under the tubes, and a small pipette arm on a D/M rail dripping one bright O/h
droplet into the tube below. One tube froths harder (W/h cap) = the active assay.
"""
import os, sys, json

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box, cylinder

BIO = {"K": "#1a2417", "W": "#e8f2d8", "L": "#c4dba6", "M": "#9fc07e", "D": "#6f9456", "d": "#4a6e3a",
       "h": "#d2f7ec", "c": "#9fefcf", "g": "#36cc9e", "G": "#1d8f70",
       "o": "#f0b24d", "O": "#ffd488", "r": "#b9701e"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def rect(c, x0, y0, x1, y1, fill=None, outline=None):
    if fill is not None:
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                c.set(x, y, fill)
    if outline is not None:
        for x in range(int(x0), int(x1) + 1):
            c.set(x, y0, outline); c.set(x, y1, outline)
        for y in range(int(y0), int(y1) + 1):
            c.set(x0, y, outline); c.set(x1, y, outline)


# ── 1. MAIN HALL — wide low Box (the bespoke break from the square cube) ─────
def main_hall(c):
    """Broad, low benchlab hall. wx=15 wy=9 h=10 -> distinctly wider/lower than
    the tall square gateway cube (wx=wy=11 h=20)."""
    hall = Box(top=(28, 17), wx=15, wy=9, h=10)
    hall.draw(c, roof="M", lwall="M", rwall="D", roof_hi="L", outline="K")
    return hall


def wood_bench_band(c, hall):
    """A long D/d wood-frame band at bench height wrapping the lit corner — the
    BioCore bench motif that grounds the glazing above it."""
    # lit (left) face: a continuous bench band
    c.line(hall.left_pt(0.02, 7.0), hall.left_pt(0.98, 7.0), "D")
    c.line(hall.left_pt(0.02, 7.7), hall.left_pt(0.98, 7.7), "d")
    c.line(hall.left_pt(0.02, 8.4), hall.left_pt(0.98, 8.4), "d")
    # carry the band around onto the shaded right face (darker)
    c.line(hall.right_pt(0.02, 7.0), hall.right_pt(0.98, 7.0), "d")
    c.line(hall.right_pt(0.02, 7.7), hall.right_pt(0.98, 7.7), "d")


# ── 2. CLERESTORY MONITOR — narrow raised CENTRAL ridge box (daylight scoop) ──
def clerestory_monitor(c, hall):
    """Narrow raised daylight monitor centred on the roof RIDGE. Glazed c/h on its
    lit side (a daylight scoop), L/W cap. Centred (not back-left) so it reads as a
    greenhouse light over the bench, the signature roofline."""
    base = hall.roof_pt(0.5, 0.5)            # dead centre of the roof
    mon = Box(top=(base[0], base[1] - 13), wx=10, wy=4, h=6)
    # a thin K stilt-shadow under the monitor so it visibly stands proud of the deck
    c.line((mon.w_left[0], mon.w_left[1]), (mon.w_front[0], mon.w_front[1]), "d")
    c.line((mon.w_front[0], mon.w_front[1]), (mon.w_right[0], mon.w_right[1]), "d")
    mon.draw(c, roof="L", lwall="c", rwall="G", roof_hi="W", outline="K")
    # daylight glazing: continuous c band with bright h sun-glint on the lit face
    mon.window(c, "left", 0.08, 0.92, 1.3, 4.4, glass="c", hi="h", shade="G", mullions=4)
    # a glaze highlight breaking up the shaded right (G) face of the monitor
    c.line(mon.right_pt(0.1, 1.6), mon.right_pt(0.9, 1.6), "g")
    # bright crest along the monitor ridge
    c.line(mon.r_top, mon.r_right, "W")
    c.line(mon.r_top, mon.r_left, "W")
    # a sliver of teal glow spilling onto the front-roof deck under the scoop
    c.line(hall.roof_pt(0.5, 0.34), hall.roof_pt(0.74, 0.34), "c")
    return mon


def reagent_vents(c, hall):
    """Small o/r reagent vent pipes at the two ridge ends (the roof detail)."""
    for ux, uy in ((0.16, 0.78), (0.84, 0.22)):
        p = hall.roof_pt(ux, uy)
        x, y = int(round(p[0])), int(round(p[1]))
        c.set(x, y, "K"); c.set(x, y - 1, "r"); c.set(x, y - 2, "o")
        c.set(x + 1, y - 2, "O")            # warm cap glint


# ── 3. BENCH-WINDOW RUN + GLASS ENTRY DOOR on the lit (LEFT) face ────────────
def left_glazing(c, hall):
    """Continuous low bench-window run (the greenhouse-glazing-as-labware motif)
    plus a centred K-framed glass entry door with a soft amber interior glow.
    This is the clean wet-lab hero on the OPENING (LEFT) side."""
    # --- continuous bench window strip running the whole lit length, sitting on
    #     the wood bench band (v ~ 2..6.6, band starts at 7.0) ---
    wu0, wu1 = 0.06, 0.94
    vt, vb = 2.2, 6.6
    # K reveal behind the glass
    c.fill_poly([hall.left_pt(wu0, vt), hall.left_pt(wu1, vt),
                 hall.left_pt(wu1, vb), hall.left_pt(wu0, vb)], "K")
    # teal-green glass panes inset, split into a row of lights by mullions
    iu0, iu1 = wu0 + 0.012, wu1 - 0.012
    c.fill_poly([hall.left_pt(iu0, vt + 0.4), hall.left_pt(iu1, vt + 0.4),
                 hall.left_pt(iu1, vb - 0.3), hall.left_pt(iu0, vb - 0.3)], "g")
    # bright top reflection streak + darker sill shade
    c.line(hall.left_pt(iu0, vt + 0.8), hall.left_pt(iu1, vt + 0.8), "h")
    c.line(hall.left_pt(iu0, vb - 0.5), hall.left_pt(iu1, vb - 0.5), "G")
    # mullions dividing the run into bench lights
    for m in range(1, 8):
        um = iu0 + (iu1 - iu0) * m / 8.0
        c.line(hall.left_pt(um, vt + 0.3), hall.left_pt(um, vb - 0.2), "K")
    # crisp K head + sill rails framing the whole run
    c.line(hall.left_pt(wu0, vt), hall.left_pt(wu1, vt), "K")
    c.line(hall.left_pt(wu0, vb), hall.left_pt(wu1, vb), "K")

    # --- centred K-framed glass entry DOOR breaking down through the band to grade ---
    du0, du1 = 0.43, 0.58
    dvt, dvb = 1.6, 9.8
    # K door frame opening (taller than the windows, down to the sill)
    c.fill_poly([hall.left_pt(du0, dvt), hall.left_pt(du1, dvt),
                 hall.left_pt(du1, dvb), hall.left_pt(du0, dvb)], "K")
    # warm amber interior glow seen through the glass door
    c.fill_poly([hall.left_pt(du0 + 0.012, dvt + 0.5), hall.left_pt(du1 - 0.012, dvt + 0.5),
                 hall.left_pt(du1 - 0.012, dvb - 0.4), hall.left_pt(du0 + 0.012, dvb - 0.4)], "o")
    # brighter O glow core in the upper door + teal cool reflection band
    c.fill_poly([hall.left_pt(du0 + 0.02, dvt + 0.8), hall.left_pt(du1 - 0.02, dvt + 0.8),
                 hall.left_pt(du1 - 0.02, dvt + 3.0), hall.left_pt(du0 + 0.02, dvt + 3.0)], "O")
    c.line(hall.left_pt(du0 + 0.02, dvt + 3.4), hall.left_pt(du1 - 0.02, dvt + 3.4), "c")
    # centre mullion splitting the double glass door
    c.line(hall.left_pt((du0 + du1) / 2, dvt + 0.3), hall.left_pt((du0 + du1) / 2, dvb - 0.3), "K")
    # bright lintel highlight over the door
    c.line(hall.left_pt(du0, dvt), hall.left_pt(du1, dvt), "L")


# ── 4. SHADED RIGHT FACE — plainer opaque green wall + one small vent ────────
def right_face_detail(c, hall):
    """Keep the right face plainer: opaque D green, faint pilaster grooves and a
    single small louvre vent (per blueprint: right face plainer)."""
    for u in (0.3, 0.6):
        c.line(hall.right_pt(u, 1.2), hall.right_pt(u, 9.5), "d")
    # one small K/M louvre vent high on the right face
    vu0, vu1 = 0.74, 0.9
    c.fill_poly([hall.right_pt(vu0, 2.0), hall.right_pt(vu1, 2.0),
                 hall.right_pt(vu1, 4.4), hall.right_pt(vu0, 4.4)], "K")
    for k in range(3):
        v = 2.6 + k * 0.7
        c.line(hall.right_pt(vu0 + 0.01, v), hall.right_pt(vu1 - 0.01, v), "M")


# ── 5. SIGNATURE — backlit rack of bubbling assay test-tubes + pipette arm ───
def assay_rack(c, hall):
    """The one-of-one feature: a backlit rack of bubbling assay test-tubes set into
    the LIT-LEFT bench window, to the LEFT of the entry door, with a pipette arm
    dipping into the active (frothing) tube. Drawn LAST so it reads on top of the
    glazing as the busy benchlab centrepiece.

    Anchored ON the lit-left face via hall.left_pt(u, v) so it sits flush on the
    wall (not floating in space). The bench window run lives at v ~ 2.2..6.6; the
    rack occupies the left third of it (u 0.07..0.40)."""
    # geometry of the rack zone on the lit face
    u0, u1 = 0.075, 0.395
    v_top = 2.4          # tube tops (just under the window head)
    v_rack = 6.4         # the rack bar the tubes seat into
    n = 6
    fills = ["c", "g", "g", "G", "o", "O"]                # teal->green->amber assay gradient
    active = 2                                            # the harder-frothing tube

    def P(u, v):
        p = hall.left_pt(u, v)
        return (int(round(p[0])), int(round(p[1])))

    # --- bright h BACKLIGHT panel behind the tubes, inset in the window glass ---
    c.fill_poly([P(u0, v_top - 0.2), P(u1, v_top - 0.2),
                 P(u1, v_rack + 0.3), P(u0, v_rack + 0.3)], "h")
    # thin K reveal around the lit panel so it reads as a glowing backlight
    c.line(P(u0, v_top - 0.2), P(u0, v_rack + 0.3), "K")
    c.line(P(u1, v_top - 0.2), P(u1, v_rack + 0.3), "K")
    c.line(P(u0, v_top - 0.2), P(u1, v_top - 0.2), "K")

    # --- the D wooden tube RACK bar the tubes seat into ---
    c.line(P(u0, v_rack), P(u1, v_rack), "D")
    c.line(P(u0, v_rack + 0.45), P(u1, v_rack + 0.45), "d")     # rack shade
    # thin amber reagent-LABEL strip running under the rack
    c.line(P(u0 + 0.01, v_rack + 0.9), P(u1 - 0.01, v_rack + 0.9), "o")

    # --- the tubes: each a 2px glass column, K-separated, liquid gradient ---
    for i in range(n):
        u = u0 + (u1 - u0) * (i + 0.5) / n                # tube centre u
        cap = P(u, v_top)                                 # screen pt at the tube top
        tx = cap[0]
        ty_top = cap[1]
        ty_bot = P(u, v_rack)[1]                          # seats into the rack
        liquid = fills[i]
        # crisp K side separators full height so each tube reads against backlight
        for yy in range(ty_top - 1, ty_bot + 1):
            c.set(tx - 1, yy, "K")
        # glass column (2px wide)
        for yy in range(ty_top, ty_bot + 1):
            c.set(tx, yy, liquid); c.set(tx + 1, yy, liquid)
        # darker liquid base seated in the rack so the tube has weight
        c.set(tx, ty_bot, "G"); c.set(tx + 1, ty_bot, "G")
        # K rim + cool glass headspace at the top
        c.set(tx, ty_top - 1, "K"); c.set(tx + 1, ty_top - 1, "K")
        c.set(tx, ty_top, "W"); c.set(tx + 1, ty_top, "c")     # bright meniscus glint
        # rising bubbles (tiny h/W dots staggered up the column)
        c.set(tx, ty_bot - 2, "h")
        c.set(tx + 1, (ty_top + ty_bot) // 2, "W")
        if i == active:
            # active assay froths harder: a W/h froth cap brimming over the rim
            c.set(tx, ty_top - 2, "W"); c.set(tx + 1, ty_top - 2, "W")
            c.set(tx, ty_top - 3, "h"); c.set(tx + 1, ty_top - 4, "W")
    # close the right edge of the last tube
    last = P(u0 + (u1 - u0) * (n - 0.5) / n, v_top)
    c.set(last[0] + 2, P(u0, v_rack)[1], "K")

    # --- pipette ARM on a D/M rail above the rack, tip over the active tube ---
    rail = P((u0 + u1) / 2, v_top - 1.4)
    rl0, rl1 = P(u0 + 0.02, v_top - 1.4), P(u1 - 0.02, v_top - 1.4)
    c.line(rl0, rl1, "D")                                 # overhead rail
    c.line((rl0[0], rl0[1] + 1), (rl1[0], rl1[1] + 1), "d")
    # carriage centred over the active tube
    au = u0 + (u1 - u0) * (active + 0.5) / n
    acar = P(au, v_top - 1.4)
    rect(c, acar[0] - 1, acar[1] - 1, acar[0] + 1, acar[1] + 1, fill="M", outline="K")
    c.set(acar[0], acar[1] - 1, "L")                      # lit carriage crown
    # slim pipette barrel hanging straight down toward the active tube tip
    atip = P(au, v_top - 0.2)
    c.set(atip[0], acar[1] + 2, "L")
    c.set(atip[0], acar[1] + 3, "L")
    c.set(atip[0], acar[1] + 4, "M")
    # a single bright O/h droplet falling from the tip into the frothing tube
    c.set(atip[0], atip[1] - 2, "O")
    c.set(atip[0], atip[1] - 1, "h")


def main():
    c = Canvas()
    # painter's order: hall first, then ridge monitor + vents, then the lit-left
    # glazing/door, then the right-face detail, then the bench rack ON TOP.
    hall = main_hall(c)
    wood_bench_band(c, hall)
    clerestory_monitor(c, hall)
    reagent_vents(c, hall)
    left_glazing(c, hall)
    right_face_detail(c, hall)
    assay_rack(c, hall)

    spec = {"width": 64, "height": 64, "palette": BIO, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/biocore_wet-lab.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    main()
