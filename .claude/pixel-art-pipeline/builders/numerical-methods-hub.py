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

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box

# Axiom set palette — chars -> hex EXACTLY per the blueprint (<=16 colors).
AXIOM = {"K": "#0e1124", "W": "#dfe6f6", "L": "#b4bee0", "M": "#7c88b8", "D": "#4e5888", "d": "#333a60",
         "h": "#d6ecff", "c": "#aad8ff", "g": "#4a9ce6", "G": "#2060b0",
         "o": "#ffe27a", "O": "#fff3c0", "r": "#c89a2a"}


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


def build():
    c = Canvas()
    h = main_block(c)          # the dominant near-square compute hall (back mass)
    parapet(c, h)              # flat parapet lip ringing the roof
    roof_deck(c, h)            # exhaust cowls + sensor puck + o power line
    right_face(c, h)           # shaded RIGHT face — plain wall + conduit
    vent_wing(c)               # lower louvered vent wing abutting front-LEFT
    left_face(c, h)            # lit LEFT face — control window + door + placard
    mesh = convergence_mesh(c, h)  # HERO adaptive convergence mesh hovering over roof
    residual_gauge(c, mesh)    # residual-> 0 gauge floating beside the mesh panel
    spec = {"width": 64, "height": 64, "palette": AXIOM, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/axiom_numerical-methods-hub.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
