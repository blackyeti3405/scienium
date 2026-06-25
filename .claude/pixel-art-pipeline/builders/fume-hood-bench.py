#!/usr/bin/env python3
"""
Fume Hood Bench — ChemWorks STARTER economy building (BESPOKE iso form, NOT the
gateway cube).

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
"""
import os
import sys
import json

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box, cylinder  # noqa: F401  (cylinder kept available)

CHEM = {"K": "#161a2e", "W": "#e6ecfb", "L": "#c2cdee", "M": "#9aa8d8", "D": "#6f7cb0", "d": "#4b5688",
        "h": "#d6ecff", "c": "#a8d4ff", "g": "#4aa0e6", "G": "#2166b0",
        "o": "#c89cf0", "O": "#e0c2ff", "r": "#6a34a8"}


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


def main():
    c = Canvas()
    # painter's order: shed first, then the raised lean-to back-cap + exhaust
    # stack, then the lit-left open hood/bench, then the plain right face, then
    # the bubbling flask ON TOP.
    shed = main_shed(c)
    roof = lean_to_roof(c, shed)
    exhaust_stack(c, shed, roof)
    bench = left_hood(c, shed)
    right_face_detail(c, shed)
    reaction_flask(c, shed, bench)

    spec = {"width": 64, "height": 64, "palette": CHEM, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/chemworks_fume-hood-bench.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    main()
