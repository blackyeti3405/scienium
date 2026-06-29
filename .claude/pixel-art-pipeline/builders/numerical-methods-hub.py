#!/usr/bin/env python3
"""
Numerical Methods Hub — Axiom lab economy building (BESPOKE form).

NOT the gateway cube. A BLOCKY TWO-BLOCK COMPUTE HALL: a square, flat-roofed
main block abutted on the FRONT-LEFT by a lower LOUVERED VENT WING (a heat-
exhaust wing whose lit face is all Box.louver slat banks), capped by a flat
PARAPET roof. A square, utilitarian massing that is clearly NOT the Computation
Cluster (long server hall + cooling-tower cylinder), NOT a stepped terrace, NOT
an L-annex.

Opening side = LEFT (the lit face). The hero glazing is a wide K-framed control-
room window on the lit LEFT face of the main block (beside the vent wing), plus a
K door and an `o` METHODS placard. The shaded RIGHT face stays plain — bare wall
and one thin D conduit.

Signature feature: over the LEFT-front roof hovers an ADAPTIVE CONVERGENCE MESH —
a flat c/g grid that is coarse at the edges and recursively SUBDIVIDES into ever-
finer cells around a glowing O/o SOLUTION FRONT (a quadtree/AMR refinement read),
with one hot O/W cell at the front's tip. A small K-framed residual gauge on the
parapet ticks its bar DOWN toward a g "0" mark with an O "converged" dot, and a
row of `o` iteration ticks ramps up beside it (the optimization tell). This is
the ALGORITHM/iteration itself — distinct from the Cluster's compute HARDWARE and
the Modeling Suite's continuous function SURFACE.

Composed entirely from art/isobuild.Box — NO iso.draw_cube / base_windows.
"""
import os
import sys
import json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

# Axiom set palette — chars -> hex EXACTLY per the blueprint (<=16 colors).
# Base keys (shared across all 10 Axiom buildings) + the four LAB-WIDE EVOLVED
# accent shades reserved for the upgrade stages ONLY (they never appear in stage 1,
# so the shipped numerical-methods-hub.png is unchanged). Same b/e/E/q convention as
# chalkboard-room (the Axiom reference) so the whole lab stays cohesive:
#   b  deep indigo steel   — matured structure tone for t3+ new masses
#   e  quantum-stellar glow (mid)    E  quantum-stellar glow (bright) — t4/t5 energy
#   q  premium gold trim — t5 flourish ONLY (NOT a whole-building recolor)
AXIOM = {"K": "#0e1124", "W": "#dfe6f6", "L": "#b4bee0", "M": "#7c88b8", "D": "#4e5888", "d": "#333a60",
         "h": "#d6ecff", "c": "#aad8ff", "g": "#4a9ce6", "G": "#2060b0",
         "o": "#ffe27a", "O": "#fff3c0", "r": "#c89a2a",
         "b": "#2a3158", "e": "#7ad0ff", "E": "#cdeeff", "q": "#f6c945"}


# ── low-level pixel helpers ──────────────────────────────────────────────────
def px(c, x, y, ch):
    c.set(int(round(x)), int(round(y)), ch)


def hline(c, x0, x1, y, ch):
    if x1 < x0:
        x0, x1 = x1, x0
    for x in range(int(round(x0)), int(round(x1)) + 1):
        c.set(x, int(round(y)), ch)


def vline(c, x, y0, y1, ch):
    if y1 < y0:
        y0, y1 = y1, y0
    for y in range(int(round(y0)), int(round(y1)) + 1):
        c.set(int(round(x)), y, ch)


# ── the MAIN BLOCK — a blocky square compute hall (dominant mass) ─────────────
def main_block(c):
    """A blocky, near-square flat-roofed Box — the compute hall. Lit L/M left
    face, shaded D right face, flat roof. Returns the Box so callers place the
    parapet, glazing and roof features on it."""
    h = Box((30, 16), wx=10, wy=8, h=15)
    h.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    return h


def parapet(c, h):
    """A thin L/W parapet lip ringing the flat roof, with a soft d inner shadow
    so the roof reads as a recessed deck (utilitarian flat-roof tell)."""
    # bright lip along the two back roof edges + the two front roof edges
    c.line(h.r_left, h.r_top, "W")
    c.line(h.r_top, h.r_right, "W")
    c.line(h.r_left, h.r_front, "L")
    c.line(h.r_front, h.r_right, "L")
    # soft inner shadow one step in, so the parapet reads as a raised lip
    c.line(h.roof_pt(0.06, 0.06), h.roof_pt(0.94, 0.06), "d")
    c.line(h.roof_pt(0.06, 0.06), h.roof_pt(0.06, 0.94), "d")


def roof_deck(c, h):
    """A flat parapet roof deck: two D exhaust cowls, a c sensor puck on the back
    corner, and a thin o power line trimming the parapet."""
    # two D exhaust cowls toward the back-right of the deck (away from the hero)
    for cf in (0.40, 0.66):
        cp = h.roof_pt(0.78, cf)
        cx, cy = int(round(cp[0])), int(round(cp[1]))
        c.fill_poly([(cx, cy - 3), (cx + 3, cy - 2), (cx + 3, cy + 1), (cx, cy)], "D")
        c.line((cx, cy - 3), (cx + 3, cy - 2), "M")          # lit top edge
        c.set(cx, cy - 3, "K"); c.set(cx + 3, cy - 2, "K")
        c.set(cx + 1, cy - 2, "d")                            # vent mouth

    # c sensor puck on a short K post at the BACK corner of the deck
    pp = h.roof_pt(0.30, 0.18)
    pxp, pyp = int(round(pp[0])), int(round(pp[1]))
    c.set(pxp, pyp, "K")
    c.set(pxp, pyp - 1, "K")
    c.set(pxp - 1, pyp - 2, "G")
    c.set(pxp, pyp - 2, "g")
    c.set(pxp + 1, pyp - 2, "G")
    c.set(pxp - 1, pyp - 3, "c")
    c.set(pxp, pyp - 3, "h")
    c.set(pxp + 1, pyp - 3, "c")

    # a short, clean o power-trim segment hugging the BACK-RIGHT parapet corner
    # (a small accent, not a long diagonal streak across the deck)
    a = h.roof_pt(0.86, 0.30)
    b = h.roof_pt(0.86, 0.50)
    c.line(a, b, "o")
    c.set(int(round(a[0])), int(round(a[1])), "K")           # K end clamps
    c.set(int(round(b[0])), int(round(b[1])), "K")


# ── the VENT WING — a lower Box abutting the front-LEFT (drawn AFTER) ──────────
def vent_wing(c):
    """A lower, smaller Box abutting the main block on the FRONT-LEFT — the heat-
    exhaust wing. Its lit LEFT face is packed with Box.louver vent banks so it
    reads as solid louvers, NEVER glass. Drawn after the main block so it sits in
    front-left. Returns the Box."""
    w = Box((16, 23), wx=5, wy=6, h=11)
    w.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # the lit LEFT face packed with three stacked louver vent banks (heat exhaust)
    w.louver(c, "left", 0.10, 0.90, 1.5, 3.5, body="D", slat="K", edge="M", frame="K")
    w.louver(c, "left", 0.10, 0.90, 4.0, 6.0, body="D", slat="K", edge="M", frame="K")
    w.louver(c, "left", 0.10, 0.90, 6.5, 8.5, body="D", slat="K", edge="M", frame="K")

    # a small d conduit + o status dot on the shaded right face of the wing
    c.line(w.right_pt(0.5, 1.0), w.right_pt(0.5, w.h - 1.0), "d")
    sp = w.right_pt(0.5, 2.0)
    c.set(int(round(sp[0])), int(round(sp[1])), "o")
    return w


# ── LEFT (lit) face of the main block — THE OPENING SIDE ──────────────────────
def left_face(c, h):
    """The lit LEFT face of the main block (beside the vent wing) carries the
    opening: a wide K-framed control-room window (one big glass pane via
    Box.window with h reflections + an o ready-light), a K door, and the o
    METHODS placard. This is the dominant glazing — the opening side is LEFT."""
    # --- the hero control-room window: ONE wide glass pane, high on the face,
    #     toward the right (away from the vent wing) so it reads as a clean pane.
    #     A single soft mullion splits it into two big panes (never a barred grid). -
    h.window(c, "left", 0.40, 0.86, 2.5, 8.0, glass="g", hi="h", shade="G",
             frame="K", mullions=1)
    # an o ready-light dot riding the top frame of the control window
    rp = h.left_pt(0.83, 3.0)
    c.set(int(round(rp[0])), int(round(rp[1])), "o")
    c.set(int(round(rp[0])), int(round(rp[1])) - 1, "O")

    # --- a K access door grounded at the sill, on the right end of the lit face ---
    du0, du1, dvt, dvb = 0.66, 0.86, 9.4, h.h - 0.4
    c.fill_poly([h.left_pt(du0, dvt), h.left_pt(du1, dvt),
                 h.left_pt(du1, dvb), h.left_pt(du0, dvb)], "K")
    # door leaf (deep navy) with a thin c kick-light and an o handle dot
    c.fill_poly([h.left_pt(du0 + 0.03, dvt + 0.8), h.left_pt(du1 - 0.03, dvt + 0.8),
                 h.left_pt(du1 - 0.03, dvb), h.left_pt(du0 + 0.03, dvb)], "d")
    c.line(h.left_pt(du0 + 0.03, dvb - 0.4), h.left_pt(du1 - 0.03, dvb - 0.4), "c")
    hp = h.left_pt(du1 - 0.06, (dvt + dvb) / 2)
    c.set(int(round(hp[0])), int(round(hp[1])), "o")

    # --- the o "METHODS" placard: a small clean o/O signage chip on the wall
    #     strip BELOW the window and LEFT of the door (clear of the glass) ---
    pl0, pl1, plv = 0.44, 0.60, 9.8
    c.line(h.left_pt(pl0, plv), h.left_pt(pl1, plv), "o")
    c.line(h.left_pt(pl0, plv - 0.9), h.left_pt(pl1, plv - 0.9), "O")
    c.set(int(round(h.left_pt(pl0, plv)[0])) - 1, int(round(h.left_pt(pl0, plv)[1])), "K")
    c.set(int(round(h.left_pt(pl1, plv)[0])) + 1, int(round(h.left_pt(pl1, plv)[1])), "K")


# ── RIGHT (shaded) face of the main block — kept PLAIN ────────────────────────
def right_face(c, h):
    """The shaded RIGHT face stays plain: bare M/D wall with a single thin D
    conduit running down it (no glazing — the opening is on the LEFT)."""
    c.line(h.right_pt(0.30, 1.0), h.right_pt(0.30, h.h - 1.0), "d")
    # two small K conduit clamps
    for v in (4.0, 9.0):
        cp = h.right_pt(0.30, v)
        c.set(int(round(cp[0])) + 1, int(round(cp[1])), "K")


# ── THE HERO: a hovering ADAPTIVE CONVERGENCE MESH over the left-front roof ────
def convergence_mesh(c, h):
    """An adaptive (quadtree/AMR) refinement grid HOVERING just over the LEFT-front
    roof, drawn as a FLAT screen-aligned panel of NESTED SQUARE CELLS: one big
    coarse g cell at the left, quartered into 4 medium c cells, the corner of
    those quartered again into tiny h cells around a glowing O/o SOLUTION FRONT
    with one hot O/W cell at its tip. The recursive quadtree subdivision IS the
    motif — the ALGORITHM/iteration converging on an answer, distinct from the
    Cluster's compute HARDWARE and the Modeling Suite's continuous SURFACE.

    A flat axis-aligned grid panel (not iso, not a wall monitor) floating on a soft
    c glow halo with K stilt-dots so it clearly hovers OVER the roof."""
    # panel anchored hovering above the LEFT-front roof
    ap = h.roof_pt(0.34, 0.60)
    px0 = int(round(ap[0])) - 8       # panel left
    py0 = int(round(ap[1])) - 11      # hover above the roof deck

    # A 16x12 px flat quadtree panel. The mesh visibly HALVES toward the TOP-RIGHT
    # gold solution front: one coarse 8px quadrant (left) -> medium 4px cells ->
    # fine 2px cells -> a knot of 1px (finest) cells crowding the front's tip. The
    # cell SIZE shrinking by powers of two IS the recursive-subdivision read.
    PW, PH = 16, 12

    # --- soft c glow halo + K stilt dots UNDER the panel (the hovering tell) ---
    for dx in range(2, PW - 1, 2):
        c.set(px0 + dx, py0 + PH + 1, "c")
    for dx in (1, 7, 13):
        c.set(px0 + dx, py0 + PH + 2, "K")     # faint stilt dots toward the roof

    # The panel is a true QUADTREE: cell SIZE halves quadrant-by-quadrant toward
    # the TOP-RIGHT (where the gold solution front is). A distinct fill per level
    # (g coarse -> c medium -> h fine) plus G dividers makes "recursive refinement"
    # land — one corner is clearly a knot of tiny cells, the rest stays coarse.
    def cellfill(x0, x1, y0, y1, ch):
        for yy in range(y0, y1):
            for xx in range(x0, x1):
                c.set(px0 + xx, py0 + yy, ch)

    def gridlines(x0, x1, y0, y1, step, ch):
        for gx in range(x0, x1 + 1, step):
            vline(c, px0 + min(gx, PW - 1), py0 + y0, py0 + y1 - 1, ch)
        for gy in range(y0, y1 + 1, step):
            hline(c, px0 + x0, px0 + x1 - 1, py0 + min(gy, PH - 1), ch)

    # LEVEL 0 — COARSE g: whole panel, ONE giant cell read (the unrefined domain)
    cellfill(0, PW, 0, PH, "g")
    gridlines(0, PW, 0, PH, 8, "G")               # 8px coarse cell lines

    # LEVEL 1 — MEDIUM c (4px cells): the entire TOP-RIGHT quadrant refines once
    cellfill(8, PW, 0, 6, "c")
    gridlines(8, PW, 0, 6, 4, "G")                # 4px medium cell lines

    # LEVEL 2 — FINE h (2px cells): the top-right quadrant of THAT refines again.
    # Strong G dividers here so the tiny cells read crisply as a refined grid (not
    # a pale blob) — the contrast is what sells "recursively subdivided". Filled h
    # cell interiors are kept between the dividers so the 2px cells stay legible.
    cellfill(11, PW, 0, 4, "h")
    gridlines(11, PW, 0, 4, 2, "G")               # 2px fine cell lines (crisp)

    # LEVEL 3 — FINEST: a checker of single-pixel cells in the very corner,
    # crowding the front's tip (the deepest level the algorithm has refined to).
    # Alternating h cell-pixels and G dividers (a 1px checker) so the finest cells
    # read as a knot of distinct tiny cells — visibly smaller than the coarse g
    # cells — rather than collapsing into one solid dark G block.
    for gy in range(0, 4):
        for gx in range(13, PW):
            c.set(px0 + gx, py0 + gy, "G" if (gx + gy) % 2 == 0 else "h")

    # 5) the glowing SOLUTION FRONT: an O/o stepped line snaking up through the
    #    progressively finer cells toward the corner, with a hot O/W cell at its
    #    tip — kept INSIDE the panel so no gold scatters onto the roof. Trimmed to
    #    the FINE/MEDIUM band (no under-glow on the coarse end) so the gold does not
    #    blanket the cell interiors — the refinement gradient stays readable beside
    #    it: big coarse g cells -> medium c -> fine h -> the gold front at the tip.
    front = [(9, 5), (10, 4), (11, 3), (12, 2), (13, 1)]
    for (fx, fy) in front:
        c.set(px0 + fx, py0 + fy, "O")
        if fy >= 4:                            # under-glow only at the coarse foot
            c.set(px0 + fx, py0 + fy + 1, "o")
    # hot cell at the tip (the finest corner the algorithm is resolving)
    c.set(px0 + 14, py0 + 1, "W")
    c.set(px0 + 15, py0 + 1, "O")
    c.set(px0 + 14, py0 + 0, "O")
    c.set(px0 + 15, py0 + 0, "O")

    # 6) a clean K rim along the panel silhouette only (reads as a floating sheet)
    hline(c, px0, px0 + PW - 1, py0 - 1, "K")
    hline(c, px0, px0 + PW - 1, py0 + PH, "K")
    vline(c, px0 - 1, py0 - 1, py0 + PH, "K")
    vline(c, px0 + PW, py0 - 1, py0 + PH, "K")

    # report the panel bounds so the residual gauge floats beside it (in the sky)
    return {"x0": px0, "y0": py0, "w": PW, "h": PH}


def residual_gauge(c, mesh):
    """A small K-framed residual gauge floating just RIGHT of the hovering mesh
    panel: a c/o bar dropping toward a bottom g '0' mark (residual -> 0, converged)
    with an O 'CONVERGED' dot lighting + a faint row of o iteration ticks ramping
    up beside it (the optimization tell). Anchored to the panel so it stays in the
    sky and never lands on the walls/window."""
    # a K-framed residual WELL floating just right of the mesh panel. It is tall
    # enough that the EMPTY dark space above + the bar settled at the FLOOR reads
    # unambiguously as "the residual fell to ~zero". Width 5 so the bar + the lit
    # green "0" floor are legible.
    gx = mesh["x0"] + mesh["w"] + 3
    GW, GH = 5, 9
    gy = mesh["y0"] + mesh["h"] - GH              # floor of the well sits low

    # K frame + d empty well body (the residual has drained OUT of it)
    for yy in range(-1, GH + 1):
        c.set(gx - 1, gy + yy, "K")
        c.set(gx + GW, gy + yy, "K")
    for xx in range(-1, GW + 1):
        c.set(gx + xx, gy - 1, "K")
        c.set(gx + xx, gy + GH, "K")
    for yy in range(GH):
        for xx in range(GW):
            c.set(gx + xx, gy + yy, "d")

    # faint D scale ticks up the LEFT inner wall (a log-residual axis) so the deep
    # empty space above the bar reads as "it dropped all the way down this scale".
    for yy in range(1, GH - 2, 2):
        c.set(gx, gy + yy, "D")

    # the residual BAR has DROPPED essentially to ZERO: a c bar sitting just above
    # a bright lit-green "0" / converged floor (G core, g edges).
    for xx in range(GW):
        c.set(gx + xx, gy + GH - 1, "g")          # the g "0" / converged floor
    c.set(gx + 1, gy + GH - 1, "G")
    c.set(gx + 2, gy + GH - 1, "G")
    c.set(gx + 3, gy + GH - 1, "G")               # lit "0" core
    for xx in range(GW):
        c.set(gx + xx, gy + GH - 2, "c")          # the bar resting just above zero
    c.set(gx + 2, gy + GH - 2, "o")               # o level tick (current residual)

    # a bright O "CONVERGED" dot lighting just ABOVE the well (the done signal)
    c.set(gx + 1, gy - 2, "O")
    c.set(gx + 2, gy - 2, "O")
    c.set(gx + 3, gy - 2, "o")

    # a faint stack of o iteration ticks ramping UP the LEFT side of the gauge
    # (kept in the sky beside the panel — never onto the roof deck)
    for i in range(4):
        c.set(gx - 3, gy + GH - 1 - i, "o" if i < 3 else "O")
    # report the gauge bounds so the t5 mesh-halo can knit the residual landing in
    return {"gx": gx, "gy": gy, "GW": GW, "GH": GH}


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). The blocky compute hall grows into a maxed
# ITERATION ENGINE / solver institute. Every addition is on-theme to THIS building's
# numerics role (more heat-exhaust + iteration ticks -> a compute-rack annex -> a
# rooftop solver-array tower -> the convergence mesh blooming into a recursive halo),
# and they grow UP / BACK-RIGHT so they never collide with the front-left/centre
# floating CONVERGENCE-MESH signature (which is re-drawn LAST every stage). Colours
# mature stage by stage; gold (q) appears ONLY as the t5 flourish.
#
#   t2  small functional add : a COOLANT/HEAT-EXHAUST VENT STUB on the vent-wing roof
#   t3  structural add        : a stacked COMPUTE-RACK annex on the shaded-right
#   t4  major add             : a rooftop SOLVER-ARRAY TOWER (glowing processor cards)
#   t5  crowning feature      : the mesh blooms to a RECURSIVE MESH-HALO + gold trim
#
# Anchors: MAIN roof diamond r_top(30,16) r_right(50,26) r_left(14,24) r_front(34,34);
# the hovering mesh hero occupies x≈21..47, y≈0..24, so every rooftop add anchors in
# the RIGHT-BACK wedge (roof u,v ≈ 0.80,0.74 → x≈43) — right of the mesh+gauge.
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_coolant_vent(c, h, w):
    """t2 — SMALL FUNCTIONAL ADD: a small COOLANT / HEAT-EXHAUST VENT STACK seated on
    the vent wing's roof — a real little Box that PROJECTS above the existing silhouette
    (its own L roof + lit M / shaded D side faces), so it adds net-new opaque mass, not
    just a recolor of an existing face. On-theme: the front-left wing IS the heat-exhaust
    wing, so it grows a stub exhaust stack as the hub starts iterating harder. Capped by a
    K-rimmed vent cowl with two K louver slats (the exhaust grille) and lit by a single
    bright `o`/`O` exhaust glow + an `o` ITERATION dot on its face (the optimization tell).
    Base palette ONLY (no `b`, no gold) — the modest first upgrade.

    Anchored on the wing roof's BACK-LEFT so the stub rises into the EMPTY sky to the
    LEFT of the hovering convergence mesh (mesh ≈ x21..39, y11..24) and well clear of the
    canvas edge (stub bbox ≈ x9..17, y18..27); it sits in front of nothing it would
    occlude. Returns the vent Box so any later stage could reference the SAME anchor."""
    # a slim stub prism whose FRONT-bottom corner lands on the wing roof back area
    # (wing roof_pt(0.30,0.66) ≈ (14,26)); it then rises ~9px into clear left-sky.
    v = Box(top=(13, 18), wx=2, wy=2, h=5)
    v.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # --- vent COWL cap: a slightly oversailing K-rimmed lip on top, with two short K
    #     louver slats across the lit face so it reads as an exhaust grille, not a plain
    #     box. The cap oversails the roof diamond by 1px on the lit + shaded edges. ---
    cl = v.r_left
    ct = v.r_top
    cr = v.r_right
    c.line((cl[0] - 1, cl[1]), (ct[0], ct[1] - 1), "W")        # bright lit cap rake
    c.line((ct[0], ct[1] - 1), (cr[0] + 1, cr[1]), "L")        # shaded cap rake
    c.set(int(cl[0]) - 1, int(cl[1]), "K")                     # cap rim clamps
    c.set(int(cr[0]) + 1, int(cr[1]), "K")
    # two K exhaust-grille slats across the lit (left) face of the stub
    for vv in (1.8, 3.0):
        c.line(v.left_pt(0.18, vv), v.left_pt(0.82, vv), "K")
        c.line(v.left_pt(0.18, vv + 0.6), v.left_pt(0.82, vv + 0.6), "M")   # slat highlight

    # --- the "iterating harder" tell: a bright o/O exhaust glow venting off the cowl
    #     top + a single o ITERATION status dot on the stub's lit face (clean, no row
    #     of pixels painted on an existing surface). ---
    gx, gy = int(round(ct[0])), int(round(ct[1]))
    c.set(gx, gy - 2, "O")                                     # bright exhaust plume tip
    c.set(gx, gy - 3, "o")                                     # plume fading upward
    sp = v.left_pt(0.5, 4.2)                                   # status dot low on the face
    c.set(int(round(sp[0])), int(round(sp[1])), "o")
    return v


# A single shared anchor for the COMPUTE-RACK annex so t3 (and any later reference)
# recompute the SAME Box (no hardcoded second guesses). It is a slim TALL slab seated
# on the ground, abutting the main block's shaded-RIGHT wall and projecting toward the
# front-right — clear of the louver wing (front-left) and the hovering mesh (centre).
def _rack_box():
    # main block right wall runs r_front(34,34)->r_right(50,26); its foot at w_right
    # (50,41), w_front(34,49). Seat a slim annex against that wall, shifted out-right
    # by ~2 units so it reads as a separate bolted-on rack, base on the ground.
    return Box(top=(52, 27), wx=4, wy=3, h=14)


def stage3_compute_rack(c, h):
    """t3 — STRUCTURAL ADD: a stacked COMPUTE-RACK annex bolted to the main block's
    shaded RIGHT — a slim, tall `b` slab (deep-indigo matured structure) whose shaded
    face is a column of repeated `g`/`G` instrument-bay slits (rack units) with thin
    `o` status LEDs, capped by a small `L` vent lip. Real new compute mass, clearly
    distinct from the front-left LOUVER wing. Seated on the ground at the front-right
    so its base rests on the plot, rising to just under the main parapet. Returns the
    annex Box."""
    a = _rack_box()
    a.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # deep-indigo base band so the new mass reads as matured structure
    c.line(a.w_left, a.w_front, "b")
    c.line(a.w_front, a.w_right, "b")
    # a deep-indigo recessed bay panel down the lit LEFT face (the rack cabinet face)
    c.fill_poly([a.left_pt(0.16, 1.4), a.left_pt(0.84, 1.4),
                 a.left_pt(0.84, a.h - 1.2), a.left_pt(0.16, a.h - 1.2)], "b")
    # a column of repeated g instrument-bay slits (stacked rack units) on the lit face,
    # each a thin glowing slot with an o status LED at its right end.
    for k in range(5):
        v = 2.2 + k * 2.1
        c.line(a.left_pt(0.24, v), a.left_pt(0.74, v), "g")     # bay slit glow
        c.set(int(round(a.left_pt(0.78, v)[0])), int(round(a.left_pt(0.78, v)[1])), "o")  # LED
        c.line(a.left_pt(0.24, v + 0.5), a.left_pt(0.74, v + 0.5), "G")  # slit shadow
    # a thin d conduit + K clamps down the shaded RIGHT face of the annex
    c.line(a.right_pt(0.5, 1.4), a.right_pt(0.5, a.h - 1.2), "d")
    for v in (4.0, 9.0):
        cp = a.right_pt(0.5, v)
        c.set(int(round(cp[0])) + 1, int(round(cp[1])), "K")
    return a


# A single shared anchor for the rooftop SOLVER-ARRAY TOWER so t4 and t5 recompute
# the SAME base point (no second guess — the volt re-anchoring pitfall). It seats in
# the RIGHT-BACK wedge of the main roof deck (x≈43), right of the mesh + gauge, so the
# tower rises in clear sky.
def _solver_anchor(h):
    bxf, byf = h.roof_pt(0.80, 0.74)
    return int(round(bxf)), int(round(byf))


def stage4_solver_tower(c, h):
    """t4 — MAJOR ADD: a rooftop SOLVER-ARRAY TOWER — the iteration engine — rises off
    the main block's RIGHT-BACK roof deck: a slim `b` lattice FRAME on a clear K plinth
    carrying a vertical stack of glowing `e` PROCESSOR CARDS, an `E` BUS-LINE glow up
    the spine, and a small `M`/`L` DISH cocked up-right at the top (the solver streaming
    its result). The prominent new vertical mass that says this hall now runs a real
    numerical solver. Palette matures: deep `b` frame + energized `e`/`E` glow. Anchored
    right of the mesh/gauge, rising clear above the parapet, fully on-canvas with a
    visible plinth."""
    cx, roof_y = _solver_anchor(h)
    top_y = roof_y - 19                            # frame top — rises well above parapet
    FW = 3                                         # frame width (px), the card stack span

    # K plinth on the deck holding the frame up (so it reads seated, not floating)
    c.fill_poly([(cx - 1, roof_y), (cx + FW + 1, roof_y),
                 (cx + FW + 1, roof_y + 1), (cx - 1, roof_y + 1)], "K")

    # twin `b` uprights of the lattice frame + a lit `M` left edge, K-capped
    c.line((cx, roof_y), (cx, top_y), "M")             # lit left upright
    c.line((cx + FW, roof_y), (cx + FW, top_y), "b")   # shaded right upright
    c.set(cx, top_y, "K"); c.set(cx + FW, top_y, "K")
    # lattice cross-rungs binding the uprights (the frame reads as a truss, not a pole)
    for yy in range(top_y + 2, roof_y, 4):
        c.line((cx, yy), (cx + FW, yy + 2), "b")
        c.line((cx + FW, yy), (cx, yy + 2), "b")

    # the STACK OF PROCESSOR CARDS slotted in the frame: short glowing `e` horizontal
    # cards rung up the spine, each a 1px-tall lit slot with a brighter `E` core pixel.
    for k in range(5):
        cy = top_y + 2 + k * 3
        if cy >= roof_y - 1:
            break
        c.line((cx, cy), (cx + FW, cy), "e")           # the lit processor card
        c.set(cx + 1, cy, "E")                         # bright bus pixel on the card
    # an `E` BUS-LINE glow running up the centre spine of the card stack
    vline(c, cx + 1, top_y + 2, roof_y - 2, "E")
    # re-lay the lit cards on top so the bus reads as feeding them (painter's order)
    for k in range(5):
        cy = top_y + 2 + k * 3
        if cy >= roof_y - 1:
            break
        c.set(cx, cy, "e"); c.set(cx + 2, cy, "e")

    # a small DISH cocked up-RIGHT off the frame top (the solver streaming results),
    # clamped on-canvas. A short K mast, an L/M parabola, a tiny `e` feed-glow.
    mx, my = cx + 1, top_y
    dcx, dcy = mx + 4, my - 2                      # pulled down 1px for top-edge headroom
    if dcx <= 61:
        c.line((mx, my), (dcx - 1, dcy + 1), "K")          # short feed mast
        c.fill_poly([(dcx - 2, dcy - 2), (dcx + 2, dcy - 3),
                     (dcx + 2, dcy + 1), (dcx - 2, dcy)], "L")   # dish bowl (lit)
        c.line((dcx - 2, dcy - 2), (dcx + 2, dcy - 3), "W")      # bright rim
        c.fill_poly([(dcx - 1, dcy - 1), (dcx + 1, dcy - 1),
                     (dcx + 1, dcy), (dcx - 1, dcy)], "M")        # shaded inner cup
        c.set(dcx, dcy - 1, "e")                                  # feed-horn glow
        c.set(dcx + 2, dcy - 3, "K")                             # rim clamp


def stage5_mesh_halo(c, h, mesh, gauge):
    """t5 — CROWNING FEATURE = FULLY EVOLVED iteration engine. The convergence mesh
    COMPLETES: the hovering quadtree blooms into a denser glowing RECURSIVE MESH-HALO —
    extra `E`/`e` refinement rings ripple OUTWARD from the solution front, a brilliant
    `E` CONVERGED CELL lights at the tip, and an `O` residual-LANDING pulse drops into
    the gauge's "0" floor (the solve has landed). The building is then dressed in premium
    GOLD: a `q` gold PARAPET TRIM along the lit-front roof lip and a `q` gold CAP on the
    solver-array tower. Reads elite, still unmistakably the same compute hall. Gold ONLY
    here. (Called AFTER the mesh is re-drawn, so it augments the hero in place.)"""
    px0, py0, PW, PH = mesh["x0"], mesh["y0"], mesh["w"], mesh["h"]

    # --- RECURSIVE MESH-HALO: the quadtree refines ONE more level INTO THE SKY above
    #     the converged top-right corner — concentric L-BRACKETS (the corners of ever-
    #     larger refinement cells) stepping up-LEFT from that corner in energized e/E,
    #     each capped by a bright lattice-NODE dot. Reads as a crisp halo of new cells
    #     (not a scattered sparkle). Drawn only in the EMPTY sky above the panel and
    #     clamped on-canvas (the corner is at x≈38, y≈11). ---
    def _set_if_empty(x, y, ch):
        if 0 <= x < 64 and 0 <= y < 64 and c.px[y][x] == ".":
            c.set(x, y, ch)

    cxh, cyh = px0 + PW, py0 - 1                  # just above the converged corner rim
    for ring, ch, node in ((2, "e", "E"), (4, "E", "e"), (6, "e", "E")):
        bx, by = cxh - ring, cyh - ring          # this bracket's corner (up-left step)
        for d in range(0, ring + 1):             # TOP edge: runs RIGHT from the corner
            _set_if_empty(bx + d, by, ch)
        for d in range(0, ring + 1):             # LEFT edge: runs DOWN from the corner
            _set_if_empty(bx, by + d, ch)
        _set_if_empty(bx, by, node)              # bright lattice node at the bracket corner

    # --- a brilliant E CONVERGED CELL flaring at the solution-front tip (top-right of
    #     the panel), a small bright cross so the eye lands on "the answer" ---
    tx, ty = px0 + 14, py0 + 1
    c.set(tx, ty, "E")
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        if 0 <= ty + dy < 64 and 0 <= tx + dx < 64:
            c.set(tx + dx, ty + dy, "E")
    c.set(tx, ty, "W")                           # white-hot core pixel

    # --- an O residual-LANDING pulse dropping into the gauge "0" floor: a short bright
    #     o/O streak down the gauge into the converged green floor (the residual has
    #     officially landed at zero). Knits the hero + gauge together as "converged". ---
    if gauge is not None:
        gx, gy, GW, GH = gauge["gx"], gauge["gy"], gauge["GW"], gauge["GH"]
        # a bright O landing pulse sitting on the green "0" floor
        for xx in range(GW):
            c.set(gx + xx, gy + GH - 1, "O")     # the floor flares bright (landed)
        c.set(gx + 1, gy + GH - 1, "q")          # a tiny gold "0" boss (t5 flourish)
        c.set(gx + 2, gy + GH - 1, "q")
        c.set(gx + 3, gy + GH - 1, "q")
        # the CONVERGED dot above the well brightens to a clean O pair
        c.set(gx + 1, gy - 2, "O")
        c.set(gx + 2, gy - 2, "O")

    # --- GOLD PARAPET TRIM (t5 flourish only): a RESTRAINED premium accent on the lit
    #     FRONT parapet lip — short `q` gold dashes hugging the front half of the
    #     r_left->r_front edge (every other px so it reads as trim studs, not a recolor
    #     streak) with a bright `O` boss crowning the front corner. Sparse on purpose. -
    lf = h.r_left
    ff = h.r_front
    for t in [0.55, 0.66, 0.77, 0.88]:           # front HALF of the lit parapet edge only
        gx_ = int(round(lf[0] + t * (ff[0] - lf[0])))
        gy_ = int(round(lf[1] + t * (ff[1] - lf[1])))
        c.set(gx_, gy_, "q")
    fx, fy = ff
    c.set(int(round(fx)), int(round(fy)), "O")   # bright gold boss at the front corner
    c.set(int(round(fx)) - 1, int(round(fy)) - 1, "q")

    # --- GOLD CAP on the SOLVER-ARRAY TOWER (recomputed from the SAME anchor as t4) ---
    cx, roof_y = _solver_anchor(h)
    top_y = roof_y - 19                          # == stage4 frame top
    FW = 3
    # a small gold pediment cap crowning the frame top + a gold finial spike
    c.line((cx - 1, top_y - 1), (cx + FW + 1, top_y - 1), "q")     # gold cap bar
    c.set(cx + 1, top_y - 2, "O")                                  # bright finial boss
    c.set(cx + 1, top_y - 3, "q")                                  # short gold spike


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the numerical-methods hub at upgrade `stage` (1..5). Stage 1 is
    IDENTICAL to the shipped base; each higher stage keeps every prior addition and
    bolts on the next (t2 coolant-vent stub -> t3 compute-rack annex ->
    t4 rooftop solver-array tower -> t5 recursive mesh-halo + gold trim). The blocky
    compute hall grows UP and toward the BACK-RIGHT into a maxed iteration engine,
    while the front-left/centre floating CONVERGENCE-MESH signature stays clear and on
    top.

    Painter's order: base masses first; then upgrade masses grow on the BACK-RIGHT deck
    / shaded-right (away from the mesh); the convergence mesh + residual gauge are
    RE-DRAWN LAST at every stage so the hero signature always reads in front of the new
    structure, and the t5 halo augments that re-drawn mesh in place."""
    c = Canvas()
    h = main_block(c)              # the dominant near-square compute hall (back mass)
    parapet(c, h)                  # flat parapet lip ringing the roof
    roof_deck(c, h)                # exhaust cowls + sensor puck + o power line
    right_face(c, h)               # shaded RIGHT face — plain wall + conduit

    # --- CUMULATIVE UPGRADE STAGES (grown on the BACK-RIGHT / shaded-right, clear of
    #     the front-left vent wing and the centre floating mesh) -------------------
    if stage >= 3:
        stage3_compute_rack(c, h)  # compute-rack annex on the shaded-right (before wing? see below)
    if stage >= 4:
        stage4_solver_tower(c, h)  # rooftop solver-array tower in the right-back wedge

    # the vent wing is FRONT-LEFT, nearer the viewer than the right-side annex, so it is
    # drawn AFTER the annex/tower (which sit back-right) to keep painter's order correct.
    w = vent_wing(c)               # lower louvered vent wing abutting front-LEFT
    left_face(c, h)                # lit LEFT face — control window + door + placard

    if stage >= 2:
        stage2_coolant_vent(c, h, w)  # coolant/heat-exhaust vent stub seated on the wing roof

    # --- HERO SIGNATURE LAST: the floating convergence mesh + gauge always read in
    #     front of the new structure (chalkboard-room re-draws its slate the same way) -
    mesh = convergence_mesh(c, h)  # HERO adaptive convergence mesh hovering over roof
    gauge = residual_gauge(c, mesh)  # residual-> 0 gauge floating beside the mesh panel

    if stage >= 5:
        stage5_mesh_halo(c, h, mesh, gauge)  # mesh blooms to a recursive halo + gold trim

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/axiom"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "numerical-methods-hub"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped numerical-methods-hub.png, so it does NOT overwrite the
    base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": AXIOM, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"axiom_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"axiom_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
