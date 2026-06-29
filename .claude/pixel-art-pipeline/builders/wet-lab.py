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

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

# Base BioCore palette (shared keys) + a few EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so wet-lab.png is unchanged).
# Matching the greenhouse reference, BioCore's energized glow is BIO-LUMINESCENT — a
# living-systems green-teal bloom — so a maxed wet-lab reads as a glowing automated
# assay hall, not a power plant:
#   b  deep mossy bark-green  — matured structure tone for t3+ new masses/frames
#   e  bioluminescent glow (mid)   E  bioluminescent glow (bright) — the t4/t5 life-glow
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
BIO = {"K": "#1a2417", "W": "#e8f2d8", "L": "#c4dba6", "M": "#9fc07e", "D": "#6f9456", "d": "#4a6e3a",
       "h": "#d2f7ec", "c": "#9fefcf", "g": "#36cc9e", "G": "#1d8f70",
       "o": "#f0b24d", "O": "#ffd488", "r": "#b9701e",
       "b": "#2f4a2a", "e": "#74f0b6", "E": "#ccffe4", "q": "#f3c63a"}


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


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS wet-lab / assay
# structure onto the prior bench-hall — never restarts, never recolors the whole
# building. Theme: the starter benchlab grows into a fully built-out, glowing
# AUTOMATED ASSAY HALL. Colours mature stage by stage (matured bark-green `b`,
# bio-luminescent `e/E`); gold (`q`) only as a t5 flourish. Every addition is anchored
# OFF the hall/ridge geometry and kept clear of the signature ASSAY-TUBE RACK (which
# sits on the lit-left bench window, left third, u 0.075..0.395) and the central
# daylight CLERESTORY MONITOR scoop on the ridge.
#
#   t2  small functional add   : a single reagent CARBOY + a short exhaust VENT stack standing
#                                on the OPEN front-left roof deck; one brightened `o/O` reagent LED
#   t3  structural add         : a stepped AUTOCLAVE/FUME side-annex on the shaded right
#                                wall — a low `b` box with a `g` glass port + `o/r` vent pipe
#   t4  major add              : a second taller CLERESTORY MONITOR bay raising the ridge
#                                beside the daylight scoop, glazing glowing `e`; `b` chassis
#   t5  crowning feature       : the assay rack blooms into a full AUTOMATED ASSAY WALL of
#                                `E` glowing tubes + a travelling `O` pipette droplet; `q`
#                                gold bench rail + gold ridge finial
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_roof_vent_carboy(c, hall):
    """t2 — SMALL FUNCTIONAL ADD: a slim exhaust VENT STACK + a squat reagent CARBOY standing on
    the OPEN front-left ROOF DECK. Round-1's wall-mounted shelf was overpainted into the busy
    lit-left glazing and added 0 silhouette — so this sits OUT on the roof and is built TALL
    enough that its cap pokes ABOVE the local roofline into the transparent sky over the deck's
    back-left shoulder, giving a real base→t2 silhouette change. The vent column at x≈20 rises
    into clear sky (verified: pixels above the deck at x≈20..24, y≈16..20 are transparent in the
    base), while the carboy sits a touch lower-right on the solid deck. Both stay well clear of
    the central daylight CLERESTORY scoop (its lit glazing starts at x≈26) and of the front-right
    ground where the t3 annex lands. On-theme (fume exhaust + reagent supply for the assay hall);
    LIGHT `c`/`M` bodies so they pop, one brightened `o/O` reagent-LED cap on the carboy."""
    # anchor everything off ONE roof-deck point so the add can't drift across stages; recompute
    # the carboy from the same base, clamp all points on-canvas.
    deck = hall.roof_pt(0.205, 0.40)                 # lit-M deck foot, front-left, under the clear sky wedge
    dx, dy = int(round(deck[0])), int(round(deck[1]))   # ≈ (23, 25)

    # === slim exhaust VENT STACK (the silhouette-breaker) — a 2px M/D flue rising up-left so its
    #     cowl clears the roofline into transparent sky; o/r firebox glow at the foot, L cowl cap.
    vx = dx - 3                                       # ≈ x20 — the column with clear sky above it
    vbase = dy                                        # foot on the deck
    vtop = dy - 9                                     # ≈ y16 — cap pokes a few px above the local ridge
    for yy in range(vtop, vbase + 1):
        c.set(vx, yy, "M"); c.set(vx + 1, yy, "D")   # lit/shaded pipe body
    c.line((vx, vtop), (vx, vbase), "K")             # lit edge outline
    c.line((vx + 1, vtop), (vx + 1, vbase), "K")     # shaded edge outline
    for yy in (vtop + 3, vtop + 6):                  # two corrugation bands
        c.set(vx, yy, "D"); c.set(vx + 1, yy, "d")
    # wider L cowl cap lip sitting in clear sky (this is what breaks the base silhouette)
    c.set(vx - 1, vtop - 1, "L"); c.set(vx, vtop - 1, "W")
    c.set(vx + 1, vtop - 1, "L"); c.set(vx + 2, vtop - 1, "D")
    c.set(vx - 1, vtop - 2, "K"); c.set(vx, vtop - 2, "L"); c.set(vx + 1, vtop - 2, "K")
    c.set(vx, vbase - 1, "r"); c.set(vx, vbase, "o")  # warm firebox glow at the flue foot

    # === squat reagent CARBOY on the deck just front-right of the vent, light-teal `c` body so it
    #     reads as a solid jug on the lit deck (the dark `g` would sink in), g/G shade, D cap. ===
    bx = dx + 1                                       # ≈ x24, clear of the vent at x20..21
    bbot = dy + 1                                     # seats slightly lower-front on the deck
    for yy in range(bbot - 3, bbot):                  # body
        c.set(bx, yy, "c"); c.set(bx + 1, yy, "g")
    c.set(bx, bbot - 1, "h")                          # liquid sheen
    c.set(bx, bbot - 4, "G"); c.set(bx + 1, bbot - 4, "G")   # shoulder/neck
    c.set(bx, bbot - 5, "D"); c.set(bx + 1, bbot - 5, "D")   # screw cap
    c.set(bx + 1, bbot - 6, "o")                      # brightened reagent-label LED ...
    c.set(bx + 1, bbot - 7, "O")                      # ... bright warm core
    for a, b in [((bx, bbot - 4), (bx, bbot)), ((bx + 1, bbot - 4), (bx + 1, bbot))]:
        c.line(a, b, "K")                             # crisp K outline so the carboy reads as an object
    c.set(bx - 1, bbot, "d"); c.set(bx, bbot, "d"); c.set(bx + 1, bbot, "d")  # deck contact shadow


def stage3_autoclave_annex(c, hall):
    """t3 — STRUCTURAL ADD: a stepped AUTOCLAVE / FUME side-annex BOLTED ONTO the hall's
    SHADED-RIGHT wall — a low matured bark-green `b` box with a round `g` glass autoclave
    port, a `D` framed door seam, and a short `o/r` fume vent pipe rising off its roof. It
    physically ABUTS the hall: the annex is seated so its back-LEFT roof edge (which has the
    SAME iso slope, -0.5, as the hall's lower-right wall bottom) lies right ON that wall, and
    a bark-green CONNECTING SKIRT gusset bridges the remaining back-right wedge up to the wall
    — so it reads as a side-annex grafted to the hall, NOT a floating outbuilding.

    ROUND-2 FIX: round-1 seated the box too low/right (r_top≈(48,48)) leaving a transparent
    band between hall (bottom eave ~x50/y48) and annex (top ~x42/y54). Re-seated UP+LEFT to
    r_top=(50,46): the hall's shaded-wall bottom edge runs w_front(40,51)->w_right(58,42)
    (slope -0.5); the annex's r_top->r_left edge runs (50,46)->(42,50) on that SAME line, so
    the annex tucks flush under the eave (the 2px overlap means the annex roof is drawn over
    the lowest wall pixels = a hard junction). The box then steps DOWN-FORWARD into the clear
    ground (front-bottom w_front=(50,60), on-canvas) so it stays a visible bolt-on. The
    back-right wedge (annex r_top->r_right drops away from the receding wall) is filled by the
    SKIRT below. Stays clear of the lit-left signature rack and the ridge/clerestory scoop, and
    gives the taller t4 ridge bay nothing to fight with. Introduces the matured bark-green `b`."""
    # Seat so the back-LEFT roof edge lies on the hall's lower-right wall bottom (flush abut).
    an = Box(top=(50, 46), wx=4, wy=4, h=6)

    # --- CONNECTING SKIRT / gusset: bridge the back-right wedge between the annex's back-right
    #     roof edge (an.r_top->an.r_right, which drops down-right) and the hall's lower-right
    #     wall bottom (which recedes UP-right), so the whole junction reads welded, not gapped.
    #     The hall wall bottom y at a given x is  y = 51 - 0.5*(x-40)  (the w_front->w_right edge);
    #     fill a bark-green band from each annex back-right column UP to that wall line. ---
    rt_x, rt_y = int(round(an.r_top[0])), int(round(an.r_top[1]))            # (50,46)
    rr_x, rr_y = int(round(an.r_right[0])), int(round(an.r_right[1]))        # (58,50)
    for x in range(rt_x, rr_x + 1):
        t = (x - rt_x) / max(1, (rr_x - rt_x))
        edge_y = rt_y + t * (rr_y - rt_y)                                    # annex back-right roof edge
        wall_y = 51 - 0.5 * (x - 40)                                         # hall wall bottom at this x
        y0 = int(round(min(edge_y, wall_y)))
        y1 = int(round(max(edge_y, wall_y)))
        for y in range(y0, y1 + 1):
            if 0 <= x <= 63 and 0 <= y <= 63:
                c.set(x, y, "b")                                             # bark-green gusset fill
    # a `d` shaded seam down the gusset's right edge + a `D` lit lip along the wall junction so the
    # bridge reads as a stepped skirt wall, not a flat smear.
    c.line((rr_x, int(round(51 - 0.5 * (rr_x - 40)))), (rr_x, rr_y), "d")
    c.line(an.r_top, an.r_right, "d")

    # --- the annex masses (matured bark-green `b` family, deepened vs the lighter hall green) ---
    c.fill_poly([an.r_top, an.r_right, an.r_front, an.r_left], "b")          # roof
    c.fill_poly([an.r_left, an.r_front, an.w_front, an.w_left], "b")          # lit-ish front-left wall
    c.fill_poly([an.r_front, an.r_right, an.w_right, an.w_front], "K")        # deep-shaded right wall
    c.line(an.r_top, an.r_left, "D")                                          # lit roof ridge hi (on the wall junction)
    c.line(an.r_top, an.r_right, "d")
    for a, b in [(an.r_top, an.r_right), (an.r_right, an.r_front), (an.r_front, an.r_left),
                 (an.r_left, an.r_top), (an.r_left, an.w_left), (an.r_front, an.w_front),
                 (an.r_right, an.w_right), (an.w_left, an.w_front), (an.w_front, an.w_right)]:
        c.line(a, b, "K")
    # --- round `g` autoclave glass PORT on the annex's lit front-left wall ---
    pc = an.left_pt(0.5, 3.0)
    pcx, pcy = int(round(pc[0])), int(round(pc[1]))
    import math
    for a in range(0, 360, 30):                                              # 2:1 porthole ring
        x = pcx + 2 * math.cos(math.radians(a))
        y = pcy + 1.4 * math.sin(math.radians(a))
        c.set(x, y, "K")
    c.set(pcx, pcy, "g"); c.set(pcx - 1, pcy, "c"); c.set(pcx + 1, pcy, "G")  # glass + sheen
    c.set(pcx, pcy - 1, "h")
    # --- a `D` framed autoclave door seam + handle on the front wall ---
    c.line(an.left_pt(0.74, 1.4), an.left_pt(0.74, 5.2), "D")
    hd = an.left_pt(0.88, 3.2)
    c.set(int(round(hd[0])), int(round(hd[1])), "M")                         # round door handle
    # --- short `o/r` fume VENT pipe rising off the annex roof (extends the reagent-vent motif) ---
    vp = an.roof_pt(0.5, 0.5)
    vx, vy = int(round(vp[0])), int(round(vp[1]))
    c.set(vx, vy, "K"); c.set(vx, vy - 1, "r"); c.set(vx, vy - 2, "r")
    c.set(vx, vy - 3, "o"); c.set(vx + 1, vy - 3, "O")                        # warm vent cap glint
    return an


def stage4_second_clerestory(c, hall, mon):
    """t4 — MAJOR ADD: a SECOND, TALLER clerestory MONITOR bay raising the roof ridge just
    BEHIND-RIGHT of the original daylight scoop, so the roofline clearly grows (two stepped
    monitors = more daylight over more benches). A matured bark-green `b` chassis carries a
    glazed band GLOWING with energized bio-luminescent `e/E` light (artificial grow-light now
    supplements the daylight). Seated on the ridge to the back-right of the original `mon` and
    made TALLER so it reads as a new prominent mass, kept fully on-canvas and NOT occluding the
    original scoop (which stays in front-left). Palette matures to `b` + `e/E`."""
    # anchor on the ridge BEHIND-RIGHT of the original monitor, and LIFT the cap well above the
    # original scoop's roofline so it reads as a genuinely TALLER second bay raising the ridge
    # (the original mon cap sits at y≈16; this bay's cap must clear it, up near y≈10). Narrow
    # footprint so it reads as a distinct stepped turret, not a wide slab merging with the scoop.
    base = hall.roof_pt(0.62, 0.34)
    bay = Box(top=(int(round(base[0])), int(round(base[1])) - 21), wx=6, wy=3, h=9)   # TALLER + LIFTED
    # thin shadow under the bay so it stands proud of the roof deck
    c.line((bay.w_left[0], bay.w_left[1]), (bay.w_front[0], bay.w_front[1]), "d")
    c.line((bay.w_front[0], bay.w_front[1]), (bay.w_right[0], bay.w_right[1]), "d")
    # bark-green `b` chassis (matured structure), K outline, L/W cap crest
    c.fill_poly([bay.r_top, bay.r_right, bay.r_front, bay.r_left], "L")               # lit cap roof
    c.fill_poly([bay.r_left, bay.r_front, bay.w_front, bay.w_left], "b")              # lit-ish front-left chassis
    c.fill_poly([bay.r_front, bay.r_right, bay.w_right, bay.w_front], "K")            # deep-shaded right chassis
    c.line(bay.r_top, bay.r_left, "W"); c.line(bay.r_top, bay.r_right, "L")           # cap crest
    for a, b in [(bay.r_top, bay.r_right), (bay.r_right, bay.r_front), (bay.r_front, bay.r_left),
                 (bay.r_left, bay.r_top), (bay.r_left, bay.w_left), (bay.r_front, bay.w_front),
                 (bay.r_right, bay.w_right), (bay.w_left, bay.w_front), (bay.w_front, bay.w_right)]:
        c.line(a, b, "K")
    # --- glazed clerestory band on the lit (left) face, GLOWING bio-luminescent `e` ---
    bay.window(c, "left", 0.1, 0.9, 1.4, 4.6, glass="e", hi="E", shade="g", mullions=3)
    # a bright `E` glow crest leaking over the top of the glazing (artificial grow-light)
    c.line(bay.left_pt(0.12, 1.2), bay.left_pt(0.88, 1.2), "E")
    # a sliver of `e` glow spilling onto the roof deck between the two monitors
    c.line(hall.roof_pt(0.5, 0.40), hall.roof_pt(0.62, 0.40), "e")
    # a slim `b` connecting walkway/duct tying the new bay to the original scoop's back
    c.line((int(round(mon.r_right[0])), int(round(mon.r_right[1]))),
           (int(round(bay.r_left[0])), int(round(bay.r_left[1]))), "b")
    return bay


def stage5_assay_wall(c, hall, ridge_ends):
    """t5 — CROWNING FEATURE = FULLY EVOLVED automated assay hall. Three reads, all maxed:
    (1) the signature single tube rack BLOOMS into a FULL AUTOMATED ASSAY WALL — a dense bank of
    glowing bio-luminescent `E` assay tubes climbing the lit-left bench wall above the original
    rack, served by an overhead pipette rail with a travelling bright `O` droplet (the lab now
    runs assays at scale); (2) a tall glowing ASSAY-BLOOM SPIRE rises as REAL NEW GEOMETRY off the
    building's true summit — the t4 second-bay cap, the only point with clear sky above it — a
    chunky `E`/`e` bloom on a `b` plinth+stem, gold-capped (this is the decisive t4→t5 silhouette
    step); (3) GOLD premium trim dresses the build — a crisp `q`/`O` gold bench RAIL capping the
    lit-left bench band, plus the gold finial crowning the summit spire. Reads as elite, still
    recognizably the same wet-lab, just maxed out. All gold (`q`) lives ONLY here, and the assay
    wall stays in the rack's own left zone so the signature is extended, never crowded.
    `ridge_ends` carries the original monitor's ridge points + the t4 bay cap (`bay_top`) so the
    summit spire is recomputed from the SAME source point the bay was drawn from (never hardcoded)."""
    def P(u, v):
        p = hall.left_pt(u, v)
        return (int(round(p[0])), int(round(p[1])))

    # --- AUTOMATED ASSAY WALL: a denser bank of glowing tubes filling the rack's left zone,
    #     a tidy grid sitting ON the lit-left face right where the signature rack is, extended
    #     UP toward the eave (v 1.4..2.4 above the existing rack tops at v≈2.4). We add a second
    #     upper tier of bright `E` mini-tubes + a backlit `e` glow wall so it reads automated. ---
    u0, u1 = 0.085, 0.385
    # a bright bio-luminescent backlit GLOW band riding just above the original rack tops, the
    # energized "wall is now powered on" tell (bright `E` core so it clearly out-glows the calmer
    # base rack below). Kept a crisp K reveal so it reads as a discrete lit strip, not a smear.
    c.fill_poly([P(u0, 1.5), P(u1, 1.5), P(u1, 2.4), P(u0, 2.4)], "E")
    c.line(P(u0, 1.5), P(u1, 1.5), "K")                       # crisp top reveal
    c.line(P(u0, 1.5), P(u0, 2.4), "K")
    c.line(P(u1, 1.5), P(u1, 2.4), "K")
    # a regular COMB of glowing `E` micro-assay tubes climbing UP off that band (each a clean
    # vertical run of pixels) so a distinct second AUTOMATED bank reads above the base rack.
    n = 8
    for i in range(n):
        u = u0 + (u1 - u0) * (i + 0.5) / n
        tx, ty = P(u, 2.2)
        c.set(tx, ty, "K")                                    # tube foot cap
        for dy in range(1, 5):                                # a clean 4px glowing micro-tube
            c.set(tx, ty - dy, "E" if dy <= 2 else "e")
        c.set(tx, ty - 5, "h")                                # bright rising bubble crown
    # overhead pipette/transfer RAIL spanning the whole assay wall (D/M rail) above the comb
    rl0, rl1 = P(u0 + 0.01, 0.6), P(u1 - 0.01, 0.6)
    c.line(rl0, rl1, "D")
    c.line((rl0[0], rl0[1] + 1), (rl1[0], rl1[1] + 1), "d")
    # a travelling bright `O` pipette-droplet carriage on the rail (the moving automation part)
    car = P(u0 + (u1 - u0) * 0.62, 0.6)
    c.set(car[0], car[1] - 1, "L"); c.set(car[0], car[1], "M")     # carriage
    c.set(car[0], car[1] + 1, "O"); c.set(car[0], car[1] + 2, "h") # pipette droplet + trail

    # --- GOLD premium trim (t5 flourish ONLY) ---
    # a crisp 2px gold bench RAIL capping the lit-left bench band: a `q` gold rail with a bright
    # `O` highlight line riding just above it, so it reads as a solid premium rail rather than a
    # thin dash lost in the warm door glow. Spans the bench-window run (clear of the door at u≈0.5).
    c.line(hall.left_pt(0.04, 6.7), hall.left_pt(0.96, 6.7), "O")     # bright top edge of the rail
    c.line(hall.left_pt(0.04, 6.9), hall.left_pt(0.96, 6.9), "q")     # gold rail body
    # small upright gold stanchions/brackets punctuating the rail (premium, sparse)
    for u in (0.08, 0.30, 0.70, 0.92):
        p = hall.left_pt(u, 6.7)
        c.set(int(round(p[0])), int(round(p[1])) - 1, "q")
    # --- CROWNING SUMMIT BLOOM-SPIRE = the marquee maxed-out feature, built as REAL NEW GEOMETRY
    #     in the clear sky ABOVE the building's true summit (the t4 second-bay cap). The original
    #     scoop's old ridge crest is now overbuilt/occluded by the taller t4 bay sitting behind-
    #     right of it, so a "scoop-ridge crest" would bury inside the bay — the only genuinely
    #     clear sky is over the bay cap, so the crown is concentrated THERE as a tall glowing
    #     bio-luminescent ASSAY-BLOOM on a short plinth+stem, capped with a gold (`q`/`O`) finial.
    #     Anchored on the bay's OWN `r_top` (recomputed from ridge_ends, never hardcoded) so it
    #     can't float; falls back to the scoop apex if there's no bay (stage<4 never calls this).
    #     Every pixel here is transparent in t4, so this is a true upward silhouette extension —
    #     a decisive t4→t5 step that reads as fully elite. ---
    sx, sy = ridge_ends.get("bay_top", ridge_ends["mon_top"])
    sy = max(5, sy)                                                # keep the whole spire on-canvas
    # short matured bark-green `b` plinth seating the spire ON the bay cap (a visible base, not a
    # detached blob) — 2px tall, K-edged so it reads as a mounted fixture.
    c.set(sx, sy - 1, "b"); c.set(sx, sy - 2, "b")
    c.set(sx - 1, sy - 1, "K"); c.set(sx + 1, sy - 1, "K")
    # a 2px glowing `e`/`E` stem rising off the plinth
    c.set(sx, sy - 3, "e"); c.set(sx, sy - 4, "E")
    # the BLOOM head: a chunky 3-wide bright `E` core with `e` side-flares + a rising crown, so it
    # reads as a glowing assay-bloom finial (the lab's life-glow taken to its peak), not a speck.
    by = sy - 5
    c.set(sx, by, "E"); c.set(sx - 1, by, "e"); c.set(sx + 1, by, "e")        # bloom shoulders
    c.set(sx - 2, by, "G"); c.set(sx + 2, by, "G")                            # outer bloom tips (deeper)
    c.set(sx, by - 1, "E"); c.set(sx - 1, by - 1, "e"); c.set(sx + 1, by - 1, "e")  # bloom crown row
    c.set(sx, by - 2, "E")                                                     # bloom apex
    # gold (`q`/`O`) finial spire capping the bloom — the single premium t5 flourish on the summit.
    c.set(sx, by - 3, "q"); c.set(sx, by - 4, "O")
    # a faint `e` glow halo flanking the bloom (sparse motes) so the summit reads energized.
    for dx, dy in [(-2, -2), (2, -2), (-3, 0), (3, 0)]:
        gx, gy = sx + dx, by + dy
        if 0 <= gx <= 63 and 0 <= gy <= 63:
            c.set(gx, gy, "e")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the wet-lab at upgrade `stage` (1..5). Stage 1 is IDENTICAL to the shipped
    base; each higher stage keeps every prior addition and bolts on the next (t2 carboy shelf
    → t3 autoclave annex → t4 second clerestory → t5 automated assay wall + gold). Painter's
    order matches the base (hall, ridge monitor + vents, lit-left glazing/door, right-face
    detail, then the bench rack ON TOP), then the cumulative stages; rooftop/eave additions
    are drawn after the masses they grow from. The t5 assay wall is drawn AFTER the base rack
    so it extends the signature on top of it."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    hall = main_hall(c)
    wood_bench_band(c, hall)
    mon = clerestory_monitor(c, hall)
    reagent_vents(c, hall)
    left_glazing(c, hall)
    right_face_detail(c, hall)
    assay_rack(c, hall)

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    if stage >= 2:
        stage2_roof_vent_carboy(c, hall)
    if stage >= 3:
        stage3_autoclave_annex(c, hall)
    bay = None
    if stage >= 4:
        bay = stage4_second_clerestory(c, hall, mon)
    if stage >= 5:
        ridge_ends = {
            "mon_top": (int(round(mon.r_top[0])), int(round(mon.r_top[1]))),
            "mon_rleft": (int(round(mon.r_left[0])), int(round(mon.r_left[1]))),
            "mon_rright": (int(round(mon.r_right[0])), int(round(mon.r_right[1])))}
        if bay is not None:
            # the t4 bay's cap is the building's true SUMMIT — crown it at t5.
            ridge_ends["bay_top"] = (int(round(bay.r_top[0])), int(round(bay.r_top[1])))
        stage5_assay_wall(c, hall, ridge_ends)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/biocore"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "wet-lab"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG + scaled
    preview to the manifest paths. Stage 1 only re-emits the JSON; it must keep matching the
    shipped wet-lab.png, so it does NOT overwrite the base PNG."""
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
