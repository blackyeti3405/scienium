#!/usr/bin/env python3
"""
Fume Hood Bench — ChemWorks STARTER economy building (BESPOKE iso form, NOT the
gateway cube) + its 4-stage UPGRADE-EVOLUTION sprites.

This is the REFERENCE builder for the whole "chemworks" lab: it sets the code
pattern (copied from volt_lab/workshop.py) — build(stage) composes the base form
EXACTLY as before, then layers cumulative on-theme stages, and emit/build_all
writes the JSON + renders the PNG/preview for each stage. Stage 1 stays
byte-identical to the shipped fume-hood-bench.png.

BASE FORM (stage 1, unchanged):
Composed from the iso BUILDING TOOLKIT (isobuild.Box) as the humblest, most
ground-hugging building in the set: a WIDE LOW OPEN-FRONTED LEAN-TO BENCH SHED
whose entire lit-LEFT front is an open work-bench under a glass fume-hood sash.
It must read clearly shorter & flatter than the towers and reactor halls to come.

  * a wide low main shed Box (wx=14 wy=9 h=11 -> distinctly wider/lower than the
    tall square gateway cube) in blue-grey M/D ChemWorks walls;
  * a shallow MONO-PITCH (lean-to) roof faked by capping the BACK with a thin
    set-back Box so the roof reads as one low slab tilting down to the front
    eave -- a workbench shelter, not a full closed box;
  * the dominant LIT-LEFT face is RECESSED and OPEN: a deep K-framed glass SASH
    window (c/h blue glass guard, raised) over a D/d bench top, the bench
    interior showing so the equipment sits out in the open;
  * a D ducting HOOD collects up to one short M/D EXHAUST STACK on the back-right
    roof corner -- the only vertical element -- trailing a thin o violet vapor
    wisp;
  * the shaded RIGHT face stays plain: a couple of D vents + a gas-line valve.

OPENING SIDE = LEFT. The hero is the open glass-sash hood + bench on the LIT
LEFT face (h reflections on the raised sash, an o warning-stripe along the bench
lip, a small o glow inside). NOT yellow, NOT green -- ChemWorks blue glass +
violet reaction glow only.

Signature (one-of-one): a ROUND-BOTTOM FLASK OF BUBBLING BLUE REAGENT clamped on
a RING-STAND over a small VIOLET BURNER FLAME, vapor curling up off it. No
bubbling-flask / ring-stand / open-flame motif exists anywhere in the catalog
(the BioCore assay-rack is a backlit row of STRAIGHT tubes with a pipette arm --
this is a single ROUND flask on a tripod over a LIVE flame). Drawn LAST so it
reads on top of the open bench as the centrepiece.

UPGRADE EVOLUTION (cumulative — the humble bench grows into a built-out reagent
works; the violet/reagent chemistry theme intensifies; gold is a t5 flourish):
  t2  small functional add : a wall-shelf REAGENT CARBOY + a small condenser coil
                             on the back-right roof shoulder (clear of stack/flask)
  t3  structural add       : a low CHEMICAL-STORAGE ANNEX lean-to bolted on the
                             shaded RIGHT end (a reagent closet w/ a glass door)
  t4  major add            : a tall glass-and-steel DISTILLATION COLUMN rising off
                             the back of the shed with a glowing reagent core + feed
  t5  crowning feature     : a glowing REAGENT-RESERVOIR sphere crowning the column
                             throwing a reaction arc down it + GOLD eave/column trim
"""
import os
import sys
import json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder  # noqa: F401  (cylinder kept available)

# Base ChemWorks palette (shared keys) + a few EVOLVED accent shades reserved for
# the upgrade stages only (they never appear in stage 1, so fume-hood-bench.png is
# unchanged). These exact keys+hexes are reused by ALL 10 chemworks buildings:
#   b  deepened structure steel — matured tone for t4+ new masses
#   e  energized reagent glow (mid)   E  energized reagent glow (bright) — t4/t5 power
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
CHEM = {"K": "#161a2e", "W": "#e6ecfb", "L": "#c2cdee", "M": "#9aa8d8", "D": "#6f7cb0", "d": "#4b5688",
        "h": "#d6ecff", "c": "#a8d4ff", "g": "#4aa0e6", "G": "#2166b0",
        "o": "#c89cf0", "O": "#e0c2ff", "r": "#6a34a8",
        "b": "#363c5e", "e": "#36e0c8", "E": "#c2fff2", "q": "#f0c64a"}

# Height (px) of the t4 distillation column above its roof foot. Defined ONCE here
# because BOTH stage4_column (which draws the column) and stage5_reservoir_crown
# (which seats the globe on the column top) must derive the column top from the
# SAME number — kept short enough that the t5 crown (collar + globe + finial) lands
# fully on-canvas (the globe centre sits ~5 rows down, finial just inside y=0).
COLUMN_H = 18


# ── small pixel helpers ──────────────────────────────────────────────────────
def P(p):
    return (int(round(p[0])), int(round(p[1])))


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


# ── 1. MAIN SHED — wide low Box (the bespoke break from the square cube) ──────
def main_shed(c):
    """Broad, low bench shed. wx=14 wy=9 h=11 -> distinctly wider & lower than the
    tall square gateway cube (wx=wy=11 h=20). Blue-grey ChemWorks M/D walls."""
    shed = Box(top=(29, 19), wx=14, wy=9, h=11)
    shed.draw(c, roof="M", lwall="M", rwall="D", roof_hi="L", outline="K")
    return shed


# ── 2. MONO-PITCH (LEAN-TO) ROOF — thin set-back back-cap tilting to the eave ─
def lean_to_roof(c, shed):
    """Fake the mono-pitch by raising a thin PARAPET wall along the BACK ridge of
    the roof, then shading the whole deck so it reads as one low slab tilting DOWN
    toward the front (LEFT) eave: a workbench shelter, not a closed box.

    Rather than a second free-standing box (which read as a separate mass), this
    raises a slim ridge-cap that hugs the back two roof edges (r_left->r_top and
    r_top->r_right), so the back of the shelter is visibly taller than the low
    front eave -- the lean-to silhouette."""
    LIFT = 5                                            # how high the back ridge rises

    def up(pt, d=LIFT):
        return (pt[0], pt[1] - d)

    rl, rt, rr = shed.r_left, shed.r_top, shed.r_right
    # ---- the raised back PARAPET (a thin wall standing along the back ridge) ----
    # back-left wall segment (rl..rt) and back-right segment (rt..rr), each LIFT tall
    c.fill_poly([rl, rt, up(rt), up(rl)], "L")          # back-left parapet face (lit)
    c.fill_poly([rt, rr, up(rr), up(rt)], "D")          # back-right parapet face (shade)
    # bright capstone crest along the very top of the raised ridge
    c.line(up(rl), up(rt), "W")
    c.line(up(rt), up(rr), "W")
    # K outline of the parapet silhouette
    c.line(up(rl), up(rt), "K"); c.line(up(rt), up(rr), "K")
    c.line(rl, up(rl), "K"); c.line(rt, up(rt), "K"); c.line(rr, up(rr), "K")
    # re-ink the inner ridge line so the parapet sits ON the deck
    c.line(rl, rt, "d"); c.line(rt, rr, "d")

    # ---- shade the DECK as a tilted slab: brighter toward the raised back,
    #      darker toward the low front eave (the slope read) ----
    for u in (0.16, 0.40, 0.64, 0.88):                 # rafter battens running the slope
        c.line(shed.roof_pt(u, 0.86), shed.roof_pt(u, 0.10), "L")
    # darker eave band just inside the low FRONT roof edge (front sits low)
    c.line(shed.roof_pt(0.04, 0.12), shed.roof_pt(0.96, 0.12), "D")
    c.line(shed.roof_pt(0.04, 0.06), shed.roof_pt(0.96, 0.06), "d")
    return {"up": up, "rt": rt, "rr": rr, "lift": LIFT}


# ── 3. EXHAUST STACK — one short duct on the back-RIGHT roof corner + vapor ───
def exhaust_stack(c, shed, roof):
    """The single vertical element: a short M/D condenser-style exhaust duct rising
    off the raised back-RIGHT parapet corner, fed by the hood, trailing a thin
    o->O violet vapor wisp. Deliberately the only thing standing proud of the low
    roofline."""
    # seat the duct foot on top of the raised back-right ridge corner
    base = roof["up"](shed.roof_pt(0.74, 0.80))        # back-right, on the parapet
    bx, by = P(base)
    # a slim 2px duct box rising ~9px
    top_y = by - 9
    for yy in range(top_y, by + 1):
        c.set(bx, yy, "D")
        c.set(bx + 1, yy, "d")
    c.set(bx - 1, by - 1, "D")                         # foot collar
    # lit edge + K outline
    for yy in range(top_y, by + 1):
        c.set(bx - 1, yy, "K")
        c.set(bx + 2, yy, "K")
    # M cap / cowl on top
    c.set(bx, top_y - 1, "M"); c.set(bx + 1, top_y - 1, "M")
    c.set(bx - 1, top_y - 1, "K"); c.set(bx + 2, top_y - 1, "K")
    c.set(bx, top_y - 2, "L"); c.set(bx + 1, top_y - 2, "K")
    # thin violet vapor wisp curling up off the stack (o -> O, fading)
    c.set(bx, top_y - 4, "o")
    c.set(bx + 1, top_y - 5, "o")
    c.set(bx, top_y - 6, "O")
    c.set(bx + 1, top_y - 7, "O")
    c.set(bx, top_y - 9, "o")


# ── 4. OPEN FUME-HOOD SASH + BENCH on the lit (LEFT) face ────────────────────
def left_hood(c, shed):
    """The OPENING side. A deep K-framed RECESS on the lit-LEFT face: a raised
    glass SASH (c/h blue glass guard) over a D/d bench top, the bench interior
    showing dark so the equipment sits out in the open. An o warning-stripe runs
    the bench lip; a small o glow sits inside. Returns bench geometry so the
    signature can seat on it."""
    # ---- the recessed hood opening: a big K reveal on the lit face ----
    hu0, hu1 = 0.08, 0.92
    htop, hbot = 1.6, 9.4                              # full-height open recess
    c.fill_poly([shed.left_pt(hu0, htop), shed.left_pt(hu1, htop),
                 shed.left_pt(hu1, hbot), shed.left_pt(hu0, hbot)], "K")
    # ---- dark hood INTERIOR (recessed back wall of the open bench) ----
    iu0, iu1 = hu0 + 0.02, hu1 - 0.02
    itop, ibot = htop + 0.5, hbot - 0.4
    c.fill_poly([shed.left_pt(iu0, itop), shed.left_pt(iu1, itop),
                 shed.left_pt(iu1, ibot), shed.left_pt(iu0, ibot)], "d")
    # faint r interior glow wash to the RIGHT of where the flask/flame will sit,
    # so the hood reads as softly violet-lit without smearing the discrete flame
    c.fill_poly([shed.left_pt(0.58, 5.4), shed.left_pt(0.80, 5.4),
                 shed.left_pt(0.80, 7.2), shed.left_pt(0.58, 7.2)], "r")

    # ---- the BENCH TOP slab the equipment sits on (D top, d front lip) ----
    bench_v = 7.7                                      # bench surface height on face
    c.line(shed.left_pt(iu0, bench_v), shed.left_pt(iu1, bench_v), "D")
    c.line(shed.left_pt(iu0, bench_v + 0.5), shed.left_pt(iu1, bench_v + 0.5), "D")
    c.line(shed.left_pt(iu0, bench_v + 1.0), shed.left_pt(iu1, bench_v + 1.0), "d")
    c.line(shed.left_pt(iu0, bench_v + 1.5), shed.left_pt(iu1, bench_v + 1.5), "d")
    # o warning-stripe trim along the bench LIP
    for k in range(0, 18):
        u = iu0 + (iu1 - iu0) * k / 18.0
        p = P(shed.left_pt(u, bench_v - 0.2))
        c.set(p[0], p[1], "o" if k % 2 == 0 else "K")

    # ---- the RAISED glass SASH (slid up): a c/h blue-glass guard band high in
    #      the opening, with a K bottom sash rail (the raised edge) ----
    su0, su1 = iu0 + 0.01, iu1 - 0.01
    stop, sbot = itop + 0.2, 3.7                       # sash sits high (raised)
    c.fill_poly([shed.left_pt(su0, stop), shed.left_pt(su1, stop),
                 shed.left_pt(su1, sbot), shed.left_pt(su0, sbot)], "c")
    # bright h reflection streaks on the raised sash glass
    c.line(shed.left_pt(su0, stop + 0.5), shed.left_pt(su1, stop + 0.5), "h")
    c.line(shed.left_pt(su0 + 0.04, stop + 0.4), shed.left_pt(su0 + 0.04, sbot - 0.3), "h")
    c.line(shed.left_pt(0.55, stop + 0.5), shed.left_pt(0.55, sbot - 0.3), "W")
    # darker glass shade at the sash base + K sash-rail (the raised lower edge)
    c.line(shed.left_pt(su0, sbot - 0.3), shed.left_pt(su1, sbot - 0.3), "G")
    c.line(shed.left_pt(su0, sbot), shed.left_pt(su1, sbot), "K")
    # sash guide rails up the sides of the opening (the slide tracks)
    c.line(shed.left_pt(iu0, itop), shed.left_pt(iu0, ibot), "M")
    c.line(shed.left_pt(iu1, itop), shed.left_pt(iu1, ibot), "M")
    # a few sash mullions dividing the glass guard
    for m in (0.30, 0.50, 0.70):
        c.line(shed.left_pt(m, stop + 0.2), shed.left_pt(m, sbot - 0.2), "G")

    # ---- one h condensation drip on the sash glass (per blueprint) ----
    dp = P(shed.left_pt(0.80, sbot - 0.8))
    c.set(dp[0], dp[1], "h"); c.set(dp[0], dp[1] + 1, "h")

    return {"u0": iu0, "u1": iu1, "bench_v": bench_v, "open_bot": ibot}


# ── 5. SHADED RIGHT FACE — plain wall + vents + a gas-line valve ─────────────
def right_face_detail(c, shed):
    """Keep the right face plain: opaque blue-grey D wall, faint pilaster grooves,
    a couple of small D louvre vents and a small gas-line valve (per blueprint)."""
    for u in (0.32, 0.64):
        c.line(shed.right_pt(u, 1.2), shed.right_pt(u, 10.4), "d")
    # two small K/M louvre vents high on the right face
    for vu0, vu1 in ((0.12, 0.27), (0.70, 0.85)):
        c.fill_poly([shed.right_pt(vu0, 2.2), shed.right_pt(vu1, 2.2),
                     shed.right_pt(vu1, 4.0), shed.right_pt(vu0, 4.0)], "K")
        for k in range(2):
            v = 2.7 + k * 0.7
            c.line(shed.right_pt(vu0 + 0.01, v), shed.right_pt(vu1 - 0.01, v), "M")
    # a small gas-line VALVE low on the right face: a short D pipe + an o wheel
    pv = P(shed.right_pt(0.46, 8.6))
    c.set(pv[0], pv[1], "D"); c.set(pv[0], pv[1] - 1, "D"); c.set(pv[0], pv[1] - 2, "D")
    c.set(pv[0], pv[1] - 3, "K")
    c.set(pv[0] - 1, pv[1] - 3, "o"); c.set(pv[0] + 1, pv[1] - 3, "o")  # valve wheel
    c.set(pv[0], pv[1] - 4, "O")


# ── 6. SIGNATURE — bubbling round-bottom flask on a ring-stand over a flame ───
def reaction_flask(c, shed, bench):
    """The one-of-one feature, seated on the OPEN bench inside the lit-LEFT hood:
    a round-bottom flask of bubbling blue reagent clamped on a ring-stand over a
    small violet burner flame, vapor curling up off it. Drawn LAST so it reads on
    top of the open bench as the centrepiece.

    Anchored on the lit-left face via shed.left_pt(u, v) so it sits flush on the
    bench (not floating). Placed left-of-centre in the open bay (u ~ 0.40)."""
    import math
    u = 0.40                                            # flask centre across the bench
    bench_v = bench["bench_v"]
    bx, by = P(shed.left_pt(u, bench_v))                # foot on the bench surface
    by -= 1                                             # sit just above the lip

    # ---- ring-STAND: a heavy D base foot on the bench + a tall vertical rod ----
    rod_x = bx + 7                                       # rod stands to the RIGHT of flask
    rod_top = by - 20
    # base foot (a short wide D plinth so the stand reads as a tripod base)
    for dx in range(-2, 3):
        c.set(rod_x + dx, by, "D")
    c.set(rod_x - 2, by, "K"); c.set(rod_x + 2, by, "K")
    c.set(rod_x, by + 1, "d")
    # the vertical rod
    for yy in range(rod_top, by):
        c.set(rod_x, yy, "D")
        c.set(rod_x - 1, yy, "K")                       # K edge so the rod reads
    c.set(rod_x, rod_top, "M")                          # lit rod cap

    # ---- D burner stand on the bench, centred under the flask ----
    c.set(bx - 1, by, "D"); c.set(bx, by, "D"); c.set(bx + 1, by, "D")
    c.set(bx - 2, by, "K"); c.set(bx + 2, by, "K")
    c.set(bx, by - 1, "d"); c.set(bx, by - 2, "d")      # short burner barrel

    # ---- VIOLET burner FLAME licking up under the flask base ----
    # burner barrel top is by-2; the flame sits between it and the bulb base.
    fy = by - 4                                         # flame body top
    c.set(bx, fy, "O"); c.set(bx, fy + 1, "O")          # bright violet core
    c.set(bx - 1, fy + 1, "o"); c.set(bx + 1, fy + 1, "o")
    c.set(bx, fy + 2, "o")
    c.set(bx - 2, fy + 1, "r"); c.set(bx + 2, fy + 1, "r")  # cool outer flame
    c.set(bx - 1, fy + 2, "r"); c.set(bx + 1, fy + 2, "r")

    # ---- ROUND-BOTTOM FLASK: an explicit round-bottom silhouette (a circular
    #      bulb that necks down at the TOP into a 1px glass neck) so it reads
    #      unmistakably as a chemistry flask, not a square. ----
    cxf = bx
    bulb_bot = fy - 1                                    # round base sits over the flame
    # per-row HALF-WIDTHS of the bulb, top(row 0)->bottom: a circle that pinches
    # to the neck at the top and rounds out at the base.
    half = [1, 3, 4, 4, 4, 3, 2]                         # 7 rows tall, ~9px widest
    fill = ["c", "c", "g", "g", "g", "g", "G"]           # glass headspace -> reagent
    top_row = bulb_bot - (len(half) - 1)
    for i, (hw, fl) in enumerate(zip(half, fill)):
        y = top_row + i
        for dx in range(-hw, hw + 1):
            c.set(cxf + dx, y, fl)
        # K rim on the silhouette edge of each row
        c.set(cxf - hw - 1, y, "K")
        c.set(cxf + hw + 1, y, "K")
    cyf = top_row + 3                                    # bulb visual centre (for bubbles)
    # K caps closing the top pinch and the round bottom
    c.set(cxf, top_row - 1, "K")
    for dx in (-2, -1, 0, 1, 2):
        c.set(cxf + dx, bulb_bot + 1, "K")
    # darker reagent pooled at the round base curve
    for dx in (-2, -1, 0, 1, 2):
        c.set(cxf + dx, bulb_bot, "G")
    # cool c/h glass highlight crescent on the upper-left of the bulb
    c.set(cxf - 3, cyf - 1, "h"); c.set(cxf - 2, cyf - 2, "c")
    c.set(cxf - 3, cyf, "c")

    # ---- bubble dots rising in the reagent (h/W) ----
    c.set(cxf - 1, cyf + 1, "h")
    c.set(cxf + 2, cyf + 1, "W")
    c.set(cxf + 1, cyf, "h")
    c.set(cxf, cyf + 2, "W")
    c.set(cxf - 1, cyf - 1, "h")

    # ---- thin glass NECK rising from the bulb pinch up to the clamp ----
    neck_top = top_row - 4
    for yy in range(neck_top, top_row):
        c.set(cxf, yy, "c")                             # glass neck core
        c.set(cxf - 1, yy, "K")                         # neck left K edge
        c.set(cxf + 1, yy, "K")                         # neck right K edge
    c.set(cxf, neck_top, "h")                           # bright neck-mouth glint
    c.set(cxf, neck_top - 1, "K")                       # mouth rim

    # ---- M ring CLAMP arm reaching off the stand to GRIP the flask neck ----
    clamp_y = neck_top + 2                              # clamp height on the neck
    for xx in range(cxf + 1, rod_x):                    # horizontal arm rod->neck
        c.set(xx, clamp_y, "M")
        c.set(xx, clamp_y + 1, "d")                     # arm underside shade
    # the ring jaws hugging the neck
    c.set(cxf + 1, clamp_y, "L"); c.set(cxf + 1, clamp_y - 1, "M")
    c.set(cxf - 1, clamp_y, "M")                        # left jaw
    c.set(rod_x - 1, clamp_y, "L")                      # arm root glint at rod

    # ---- VIOLET VAPOR curl rising from the flask mouth toward the hood duct ----
    vx, vy = cxf, neck_top - 2
    c.set(vx, vy, "o")
    c.set(vx + 1, vy - 1, "o")
    c.set(vx, vy - 2, "O")
    c.set(vx + 1, vy - 3, "O")
    c.set(vx, vy - 4, "o")
    c.set(vx + 1, vy - 5, "o")
    c.set(vx, vy - 6, "o")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS reagent /
# distillation / synthesis structure onto the prior form — never restarts, never
# recolors the whole building. Theme: the humble open bench grows into a fully
# built-out reagent works. Colours mature stage by stage; the energized reagent
# glow (e/E teal) arrives at t4; gold (q) only as a t5 flourish.
#
#   t2  small functional add : a wall-shelf REAGENT CARBOY + a small condenser coil
#   t3  structural add       : a low CHEMICAL-STORAGE ANNEX lean-to on the right end
#   t4  major add            : a tall glass-and-steel DISTILLATION COLUMN off the back
#   t5  crowning feature     : a glowing REAGENT-RESERVOIR crown + reaction arc + gold
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_carboy_shelf(c, shed, roof):
    """t2 — SMALL FUNCTIONAL ADD: a small wall SHELF bracketed onto the back-right
    roof shoulder carrying a stout glass REAGENT CARBOY (a demijohn of blue reagent)
    plus a short coiled CONDENSER, with a brightened o vapor bead. On-theme (more wet
    chemistry), modest, base palette only. Seated on the raised back parapet to the
    LEFT of the exhaust stack so it never collides with the stack or the flask."""
    # anchor: on top of the raised back ridge, left of the stack (stack is at u~0.74)
    sx, sy = P(roof["up"](shed.roof_pt(0.40, 0.86)))
    # ---- a short bracket SHELF plank (M top, d underside) sitting on the ridge ----
    for dx in range(-3, 4):
        c.set(sx + dx, sy, "M")
        c.set(sx + dx, sy + 1, "d")
    c.set(sx - 4, sy, "K"); c.set(sx + 4, sy, "K")
    c.set(sx - 3, sy + 1, "K"); c.set(sx + 3, sy + 1, "K")
    c.set(sx - 2, sy + 2, "d"); c.set(sx + 2, sy + 2, "d")   # little corbel brackets

    # ---- the REAGENT CARBOY: a squat round demijohn of blue reagent on the LEFT ----
    cbx = sx - 2
    base_y = sy - 1
    carboy_half = [1, 2, 2, 2]                          # squat bulb, ~5px wide
    carboy_fill = ["c", "g", "g", "G"]
    cb_top = base_y - (len(carboy_half) - 1)
    for i, (hw, fl) in enumerate(zip(carboy_half, carboy_fill)):
        y = cb_top + i
        for dx in range(-hw, hw + 1):
            c.set(cbx + dx, y, fl)
        c.set(cbx - hw - 1, y, "K"); c.set(cbx + hw + 1, y, "K")
    c.set(cbx, cb_top - 1, "K")                         # short neck/cap
    c.set(cbx, cb_top - 2, "M")
    c.set(cbx - 1, cb_top, "h")                         # glass glint
    for dx in (-1, 0, 1):                               # K base
        c.set(cbx + dx, base_y + 1, "K")

    # ---- a small CONDENSER COIL on the RIGHT of the shelf (a coiled glass tube) ----
    co_x = sx + 2
    co_top = base_y - 4
    c.set(co_x, base_y, "D"); c.set(co_x, base_y - 1, "D")   # short stand post
    c.set(co_x - 1, base_y, "K")
    for j, yy in enumerate(range(co_top, base_y - 1)):  # the coil windings
        ch = "c" if j % 2 == 0 else "g"
        c.set(co_x, yy, ch)
        c.set(co_x + 1, yy, "K")
        c.set(co_x - 1, yy, "K")
    c.set(co_x, co_top - 1, "h")                        # coil top glint
    # a brightened o vapor bead lifting off the condenser top (the t2 'spark')
    c.set(co_x, co_top - 3, "o")
    c.set(co_x + 1, co_top - 4, "O")


def stage3_storage_annex(c, shed):
    """t3 — STRUCTURAL ADD: a low CHEMICAL-STORAGE ANNEX — a secondary lean-to box
    bolted onto the shaded RIGHT END of the shed, a reagent closet whose front shows
    a tall glass door (cyan g glass) onto shelved bottles. A real new structural mass
    (its own little prism + roof), extending the building OUT to the right while
    staying lower than the main shed. Introduces the matured deep-steel tone `b`."""
    # seat a small prism abutting the shed's RIGHT corner, growing toward the right.
    # its back-top corner sits just in front of the shed right face, a bit lower.
    ax, ay = P(shed.right_pt(0.5, 2.0))                 # midway down the shaded face
    annex = Box(top=(ax + 2, ay + 2), wx=5, wy=4, h=8)
    # draw with cooler/darker tones so it reads as an attached service block
    annex.shadow(c, "K")
    c.fill_poly([annex.r_top, annex.r_right, annex.r_front, annex.r_left], "D")
    c.fill_poly([annex.r_left, annex.r_front, annex.w_front, annex.w_left], "D")
    c.fill_poly([annex.r_front, annex.r_right, annex.w_right, annex.w_front], "b")
    c.fill_poly([annex.r_top, annex.r_left, annex.r_front], "M")   # lit roof triangle
    c.line(annex.r_top, annex.r_left, "L")
    c.line(annex.r_top, annex.r_right, "L")
    for a, b in [(annex.r_top, annex.r_right), (annex.r_right, annex.r_front),
                 (annex.r_front, annex.r_left), (annex.r_left, annex.r_top),
                 (annex.r_left, annex.w_left), (annex.r_front, annex.w_front),
                 (annex.r_right, annex.w_right),
                 (annex.w_left, annex.w_front), (annex.w_front, annex.w_right)]:
        c.line(a, b, "K")
    # ---- a tall GLASS DOOR on the annex's lit-left face onto shelved reagents ----
    annex.window(c, "left", 0.18, 0.82, 1.6, 6.6, glass="g", hi="c", mullions=1)
    # two faint shelf lines behind the glass (bottles on shelves)
    for v in (3.0, 4.6):
        c.line(annex.left_pt(0.22, v), annex.left_pt(0.78, v), "G")
    # a couple of reagent-bottle bumps on the shelves (c/o dots)
    c.set(*P(annex.left_pt(0.34, 2.7)), "c")
    c.set(*P(annex.left_pt(0.60, 2.7)), "o")
    c.set(*P(annex.left_pt(0.46, 4.3)), "c")
    # a small hazard placard on the shaded right face
    pl = P(annex.right_pt(0.5, 3.0))
    c.set(pl[0], pl[1], "o"); c.set(pl[0], pl[1] + 1, "O")


def stage4_column(c, shed):
    """t4 — MAJOR ADD: a tall glass-and-steel DISTILLATION / FRACTIONATING COLUMN
    rising off the BACK of the shed — a slender stack of glass sections banded by
    steel trays with a glowing reagent CORE climbing it, fed by a curved pipe off the
    shed. The prominent new vertical mass that says 'this bench now runs real
    distillations'. Palette matures: deep `b` steel shell + energized reagent `e/E`
    core. Foot anchored on a back-CENTER roof point (clear of the back-right exhaust
    stack and clear of the front-left flask); height clamped to stay on-canvas."""
    # foot on the roof, back-centre-left so it rises between stack (right) and flask
    fx, fy = P(shed.roof_pt(0.50, 0.55))
    base_y = fy - 1
    top_y = max(2, base_y - COLUMN_H)                   # TALL but clamped on-canvas
    half = 2                                             # column is 5px wide (2*2+1)
    # ---- a short b plinth seating the column on the roof ----
    for dx in range(-half, half + 1):
        c.set(fx + dx, base_y, "b")
        c.set(fx + dx, base_y - 1, "b")
    for dx in range(-half - 1, half + 2):
        c.set(fx + dx, base_y + 1, "K")                # plinth base shadow line
    # ---- the column SHELL: alternating glass sections + steel tray bands ----
    yy = base_y - 2
    section = 0
    while yy > top_y:
        seg_h = 4 if section % 2 == 0 else 1            # tall glass section / thin tray
        for k in range(seg_h):
            row = yy - k
            if row < top_y:
                break
            if section % 2 == 0:
                # glass section: lit-left c, core e (drawn after), shaded-right b
                for dx in range(-half, half + 1):
                    col = "c" if dx < 0 else ("D" if dx > 0 else "g")
                    c.set(fx + dx, row, col)
            else:
                # steel tray band: b across with a lit M top + K underline
                for dx in range(-half, half + 1):
                    c.set(fx + dx, row, "b")
                c.set(fx - half, row, "K"); c.set(fx + half, row, "K")
        if section % 2 == 1:
            c.line((fx - half - 1, yy), (fx + half + 1, yy), "M")  # tray lip catches light
        yy -= seg_h
        section += 1
    # ---- K outline up both sides of the column + a lit-left highlight ----
    c.line((fx - half - 1, base_y - 2), (fx - half - 1, top_y), "K")
    c.line((fx + half + 1, base_y - 2), (fx + half + 1, top_y), "K")
    c.line((fx - half, base_y - 2), (fx - half, top_y), "L")       # lit edge glint
    # ---- glowing reagent CORE climbing the column centre (energized teal) ----
    for j, row in enumerate(range(top_y + 2, base_y - 2)):
        ch = "E" if j % 4 == 0 else "e"
        c.set(fx, row, ch)
    # ---- a domed condenser CAP closing the column top ----
    c.set(fx, top_y - 1, "L")
    c.set(fx - 1, top_y, "M"); c.set(fx + 1, top_y, "D"); c.set(fx, top_y, "L")
    c.set(fx - 2, top_y, "K"); c.set(fx + 2, top_y, "K"); c.set(fx, top_y - 2, "K")
    # ---- a curved FEED PIPE arcing from the shed roof up into the column base ----
    px, py = P(shed.roof_pt(0.30, 0.40))               # take-off point on the deck
    c.line((px, py), (px, py - 3), "D")
    c.line((px, py - 3), (fx - half - 1, base_y - 1), "D")
    c.set(px, py, "K"); c.set(fx - half - 1, base_y - 1, "K")
    c.set(px, py - 2, "M")                              # pipe glint


def stage5_reservoir_crown(c, shed):
    """t5 — CROWNING FEATURE = FULLY EVOLVED reagent works. A glowing spherical
    REAGENT RESERVOIR is mounted on top of the t4 distillation column — a bright
    energized-teal globe on a short collar throwing a short reaction ARC down the
    column — and the works is dressed out with GOLD premium trim (an eave ribbon +
    a gold finial cap on the column + gold reservoir bands). Reads as elite, still
    recognizably the same humble bench, just maxed out.

    Re-anchors from the SAME source the column used (shed.roof_pt(0.50,0.55) + the
    clamped 24px column height) so the crown sits exactly on the column top."""
    # recompute the column top EXACTLY as stage4 did (do not hardcode a 2nd guess)
    fx, fy = P(shed.roof_pt(0.50, 0.55))
    base_y = fy - 1
    col_top = max(2, base_y - COLUMN_H)
    # ---- a short steel COLLAR on the column cap holding the globe ----
    coll_y = col_top - 2
    for dx in (-1, 0, 1):
        c.set(fx + dx, coll_y, "b")
    c.set(fx - 2, coll_y, "K"); c.set(fx + 2, coll_y, "K")

    # ---- the spherical REAGENT RESERVOIR globe (energized teal, glowing) ----
    import math
    gcy = coll_y - 4                                    # globe centre, above the collar
    gr = 3
    for yy in range(-gr, gr + 1):
        for xx in range(-gr, gr + 1):
            d2 = (xx / gr) ** 2 + (yy / gr) ** 2
            if d2 <= 1.0:
                gx, gyp = fx + xx, gcy + yy
                if gyp < 0:
                    continue
                # bright core, teal body, darker lower-right
                if d2 < 0.32:
                    c.set(gx, gyp, "E")
                elif xx + yy < 0:
                    c.set(gx, gyp, "e")
                else:
                    c.set(gx, gyp, "G")
    # K rim around the globe silhouette
    for a in range(0, 360, 18):
        rxp = fx + (gr + 1) * math.cos(math.radians(a))
        ryp = gcy + (gr + 1) * 0.9 * math.sin(math.radians(a))
        c.set(rxp, ryp, "K")
    c.set(fx - 1, gcy - 1, "E")                         # bright top-left glint
    globe_bot = gcy + gr

    # ---- a short reaction ARC zig-zagging DOWN from the globe into the column ----
    arc = [(fx, globe_bot), (fx - 1, globe_bot + 2), (fx + 1, globe_bot + 4),
           (fx, globe_bot + 6)]
    for i in range(len(arc) - 1):
        c.line(arc[i], arc[i + 1], "E")
    for ax, ay in arc:
        c.set(ax, ay, "e")

    # --- GOLD premium trim (t5 flourish only) ---
    # a gold FINIAL spike crowning the globe
    c.set(fx, gcy - gr - 1, "q")
    c.set(fx, gcy - gr - 2, "O")
    # two thin gold BANDS girdling the globe (premium reservoir hoops)
    c.set(fx - 2, gcy, "q"); c.set(fx + 2, gcy, "q")
    c.set(fx - 2, gcy + 1, "q"); c.set(fx + 2, gcy + 1, "q")
    # a gold RIBBON hung along the shed's lit-left eave (the maxed-out trim)
    e0 = shed.roof_pt(0.06, 0.10)
    e1 = shed.roof_pt(0.94, 0.10)
    c.line(e0, e1, "q")
    # tiny gold bosses at the two front roof corners
    fl = P(shed.roof_pt(0.0, 0.10)); fr = P(shed.roof_pt(1.0, 0.10))
    c.set(fl[0], fl[1], "O"); c.set(fr[0], fr[1], "O")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the fume-hood-bench at upgrade `stage` (1..5). Stage 1 is IDENTICAL
    to the shipped base; each higher stage keeps every prior addition and bolts on
    the next (t2 carboy-shelf → t3 storage-annex → t4 distillation-column → t5
    reagent-reservoir crown + gold). Painter's order keeps rooftop/overhead additions
    on top of the masses they grow from, and the back-rising column/crown are drawn
    AFTER the shed so they occlude correctly while staying clear of the front flask."""
    c = Canvas()
    # painter's order (BASE, unchanged): shed first, then the raised lean-to back-cap
    # + exhaust stack, then the lit-left open hood/bench, then the plain right face,
    # then the bubbling flask ON TOP.
    shed = main_shed(c)
    roof = lean_to_roof(c, shed)
    exhaust_stack(c, shed, roof)
    bench = left_hood(c, shed)
    right_face_detail(c, shed)

    # --- CUMULATIVE UPGRADE STAGES (back/right/overhead masses) -------------------
    # The annex (t3) extends right; the column (t4) + crown (t5) rise from the BACK
    # roof. Draw these BEFORE the front flask so the flask stays the front-most hero.
    if stage >= 3:
        stage3_storage_annex(c, shed)
    if stage >= 4:
        stage4_column(c, shed)
    if stage >= 5:
        stage5_reservoir_crown(c, shed)
    # t2 sits on the back-right roof shoulder; draw it after the column so a t4+ feed
    # pipe never paints over it, but it stays behind the front flask.
    if stage >= 2:
        stage2_carboy_shelf(c, shed, roof)

    # the bubbling flask signature is ALWAYS the front-most hero (drawn last)
    reaction_flask(c, shed, bench)
    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/chemworks"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "fume-hood-bench"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped fume-hood-bench.png, so it does NOT overwrite the base
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
