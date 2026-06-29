#!/usr/bin/env python3
"""
Mathematical Modeling Suite — Axiom economy building (BESPOKE form, STANDARD role).

A STEPPED TERRACE PAVILION (NOT the gateway cube, NOT the flat lecture hall, NOT
the clerestory optics hall): a broad LOW base box with a NARROWER upper box set
back toward the BACK on top, making a two-level zigarat/terrace silhouette with an
open roof-terrace deck along the FRONT of the lower roof. The hovering function-
surface floats over that LEFT-front terrace deck.

  • Opening side = LEFT: the hero is a tall K-framed ATRIUM GLASS WALL on the lit-
    LEFT face of the lower base (two wide g/c panes via Box.window, h reflections)
    plus a K-framed door with an o glow + a "MODELS" placard. The shaded-RIGHT
    faces of both boxes stay plain — bare M/D wall + one thin D conduit.
  • Signature (one-of-one): hovering over the front terrace, a WIREFRAME 3D
    FUNCTION-SURFACE — a rolling parametric landscape of c/g hills and a deep G
    basin, brighter h on the lit crests — with a glowing O/W MARBLE descending the
    gradient (a faint o motion-streak behind it) toward the lowest basin, which
    glows g/O green (the found minimum, a small O "MIN" tick). A small c/o cost
    gauge on the terrace rail drops its needle to a low g reading; a soft c glow
    halo floats under the surface.

Composed from art/isobuild.{Box} — NO iso.draw_cube / base_windows.
Draw order: contact shadow -> lower base (back-to-front) -> upper setback ->
front terrace deck + rail/gauge -> rooftop skylight -> the hovering surface.
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

# Axiom set palette — author on these chars→hex exactly (≤16 colors, K hard outline).
# Base keys (shared across all 10 Axiom buildings) + the four LAB-WIDE EVOLVED accent
# shades reserved for the upgrade stages ONLY (they never appear in stage 1, so the
# shipped mathematical-modeling-suite.png is unchanged). Same four chars+hexes every
# Axiom building's _t2.._t5 reuses (see axiom-evolution-plan.md):
#   b  deep indigo steel   — matured structure tone for t3+ new masses
#   e  quantum-stellar glow (mid)    E  quantum-stellar glow (bright) — the t4/t5 energy
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
AXIOM = {"K": "#0e1124", "W": "#dfe6f6", "L": "#b4bee0", "M": "#7c88b8", "D": "#4e5888", "d": "#333a60",
         "h": "#d6ecff", "c": "#aad8ff", "g": "#4a9ce6", "G": "#2060b0",
         "o": "#ffe27a", "O": "#fff3c0", "r": "#c89a2a",
         "b": "#2a3158", "e": "#7ad0ff", "E": "#cdeeff", "q": "#f6c945"}


# ── geometry: a stepped two-box terrace pavilion ─────────────────────────────
# BASE: broad low ground floor + lower terrace deck. UPPER: narrower box set back
# toward the BACK on top of the base, leaving an open front terrace strip on the
# lower roof. The upper box's footprint is pulled toward the back-top corner.
BASE = Box(top=(26, 18), wx=13, wy=9, h=11)
# Upper setback sits ON the base roof (its back-top corner pulled toward BASE back,
# footprint smaller so an open terrace deck remains along the FRONT-LEFT).
UPPER = Box(top=(30, 12), wx=8, wy=5, h=9)


def _stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings) at top-left (x0,y0).
    '.' = skip (transparent)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


# ── 0. contact shadow under the whole footprint (drawn FIRST) ────────────────
def contact_shadow(c):
    scx, scy = 31, 50
    for x in range(scx - 20, scx + 20):
        for y in range(scy - 3, scy + 4):
            ex = (x - scx) / 20.0
            ey = (y - scy) / 3.0
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")


# ── 1. LOWER BASE — broad ground floor: LEFT atrium glass wall (HERO) ────────
def lower_base(c, b):
    """The broad low base box. M/D deep-navy terraced walls. Its LIT-LEFT face is
    the hero ATRIUM GLASS WALL — two wide g/c panes (h reflections) split by a
    pier — over a K-framed door with an o glow + a "MODELS" placard. The SHADED-
    RIGHT face stays plain: bare wall + one thin D conduit."""
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # HERO atrium glass wall on the LIT-LEFT face: TWO wide tall panes spaced
    # apart by a wall pier, each a clean Box.window (reads as glass, not bars).
    b.window(c, "left", 0.10, 0.42, 1.6, 7.4, glass="g", hi="h", shade="G",
             frame="K", mullions=1, sheen="W")
    b.window(c, "left", 0.50, 0.78, 1.6, 7.4, glass="c", hi="h", shade="g",
             frame="K", mullions=1, sheen="W")

    # K-framed DOOR with an o glow at the right end of the lit face (entrance).
    dx0, dx1, dt, db = 0.83, 0.96, 4.2, 10.2
    c.fill_poly([b.left_pt(dx0, dt), b.left_pt(dx1, dt),
                 b.left_pt(dx1, db), b.left_pt(dx0, db)], "K")
    c.fill_poly([b.left_pt(dx0 + 0.02, dt + 0.7), b.left_pt(dx1 - 0.02, dt + 0.7),
                 b.left_pt(dx1 - 0.02, db), b.left_pt(dx0 + 0.02, db)], "d")
    # warm o glow spilling from the doorway
    gx, gy = int(round(b.left_pt(0.895, dt + 1.6)[0])), int(round(b.left_pt(0.895, dt + 1.6)[1]))
    c.set(gx, gy, "o")
    c.set(gx, gy + 1, "O")
    c.set(gx, gy + 2, "o")

    # "MODELS" placard — a tiny K-framed o sign above the door on the lit face
    px, py = int(round(b.left_pt(0.86, 2.6)[0])), int(round(b.left_pt(0.86, 2.6)[1]))
    _stamp(c, px, py, [
        "KKKKK",
        "KoOoK",
        "KKKKK",
    ])

    # SHADED-RIGHT face: plain wall + one thin vertical D conduit (only texture).
    cux = int(round(b.right_pt(0.5, 0)[0]))
    cuy0 = int(round(b.right_pt(0.5, 0)[1]))
    for k in range(2, 10):
        c.set(cux, cuy0 + k, "D")
    c.set(cux, cuy0 + 5, "d")
    return b


# ── 2. UPPER SETBACK — narrower box set back toward the BACK on the base roof ─
def upper_setback(c, b):
    """The narrower upper box, set back toward the BACK of the base roof so the
    silhouette steps. M/D walls. A small clerestory glass strip glows on its lit-
    LEFT face (offices behind glass); the shaded-RIGHT face stays plain. A small c
    skylight sits on its flat upper roof."""
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # a clean clerestory glass strip on the lit-LEFT face of the upper box
    b.window(c, "left", 0.16, 0.82, 1.4, 4.6, glass="g", hi="h", shade="G",
             frame="K", mullions=2, sheen="W")

    # small c SKYLIGHT on the flat upper roof (a tiny glazed prism cap)
    sk = Box(top=b.roof_pt(0.42, 0.55), wx=2, wy=2, h=2)
    sk.draw(c, roof="c", lwall="g", rwall="G", roof_hi="h", outline="K",
            with_shadow=False)
    skx, sky = int(round(sk.roof_pt(0.5, 0.5)[0])), int(round(sk.roof_pt(0.5, 0.5)[1]))
    c.set(skx, sky, "h")

    # SHADED-RIGHT face: one thin D conduit only (kept plain, subordinate).
    cux = int(round(b.right_pt(0.55, 0)[0]))
    cuy0 = int(round(b.right_pt(0.55, 0)[1]))
    for k in range(2, 8):
        c.set(cux, cuy0 + k, "D")
    return b


# ── 3. FRONT TERRACE DECK — open roof-terrace on the lower roof front strip ───
def terrace_deck(c, base, upper):
    """The open roof-terrace deck along the FRONT of the lower base roof, in front
    of the upper setback. A thin L parapet lip + a D rail edge it; a small c/o COST
    GAUGE stands on the rail (its needle dropped to a low g reading). Returns the
    deck's anchor point (over the LEFT-front) where the function-surface hovers."""
    # deck floor: a lighter L strip on the base roof, in FRONT of the upper box,
    # from the front corner back to roughly where the upper setback begins.
    # roof_pt(u: left→front, v: left→top). Front strip = high u; left half = low?
    # We paint a band hugging the FRONT edge of the base roof.
    fl = base.r_front
    ll = base.r_left
    rl = base.r_right
    # a thin terrace band just inside the front roof edges (lit deck surface)
    # left-front quadrant deck (the lit side where the surface hovers)
    quad = [base.roof_pt(0.62, 0.30), base.roof_pt(1.0, 0.30),
            base.r_front, base.roof_pt(0.62, 0.0)]
    c.fill_poly(quad, "L")
    # subtle deck seams (faint d grid lines, reads as terrace tiling)
    c.line(base.roof_pt(0.78, 0.30), base.roof_pt(0.78, 0.0), "d")
    c.line(base.roof_pt(0.62, 0.16), base.roof_pt(1.0, 0.16), "d")

    # parapet lip + rail along the FRONT roof edges of the base (L lip, D rail)
    c.line(base.r_left, base.r_front, "L")
    c.line(base.r_front, base.r_right, "L")
    # D rail one row in (the safety rail of the open terrace)
    c.line(base.roof_pt(0.0, 0.10), base.roof_pt(1.0, 0.10), "D")

    # COST GAUGE on the front-left rail: a tiny K-framed dial, needle dropped LOW
    # to a green (g) reading — the optimization tell.
    gx, gy = int(round(base.roof_pt(0.30, 0.18)[0])), int(round(base.roof_pt(0.30, 0.18)[1]))
    _stamp(c, gx, gy - 4, [
        ".KKK.",
        "KcccK",
        "KcgoK",   # needle low → green reading
        "KcggK",
        ".KKK.",
    ])
    c.set(gx + 2, gy - 1, "g")   # needle resting at the low/green end

    # anchor: over the LEFT-front terrace, the surface hovers up here.
    ax, ay = base.roof_pt(0.42, 0.18)
    return (int(round(ax)), int(round(ay)))


# ── 4. SIGNATURE — hovering wireframe function-surface + descending marble ────
def _dash(c, a, b, ch, on=2, off=1):
    """Draw a DASHED line a→b in char ch: `on` px drawn, `off` px skipped. This is
    what makes the surface read as an open WIREFRAME (lines with gaps) instead of a
    solid filled blob — the single biggest fix for the old splatter cloud."""
    x0, y0 = int(round(a[0])), int(round(a[1]))
    x1, y1 = int(round(b[0])), int(round(b[1]))
    dx, dy = abs(x1 - x0), abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy
    i = 0
    period = on + off
    while True:
        if i % period < on:
            c.set(x0, y0, ch)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x0 += sx
        if e2 < dx:
            err += dx
            y0 += sy
        i += 1


def function_surface(c, anchor):
    """The hero, REBUILT as a 3/4-VIEW BOWL with a MARBLE resting at the bottom.

    A round-bottomed dish/bowl seen slightly from above: an ELLIPSE rim at the top
    (the open mouth) and a filled concave body curving down to a single rounded
    trough. The lit-LEFT inner wall is bright cyan, the shaded-RIGHT inner wall mid
    blue, the dish bottom (the minimum) pooled bright with a small "MIN" tick. ONE
    clearly round bright marble rests in the trough with a short gold motion-streak
    trailing up the left wall (it just rolled down). A soft c halo floats beneath so
    it HOVERS over the front terrace.

    Reads as: "a ball came to rest at the bottom of a curved surface."
    """
    cx = 31.0                     # bowl centre x (over the left-front terrace)
    rim_y = 5.0                   # screen-y of the rim's centre line
    rw = 12.0                     # rim half-width (wide ellipse → 3/4 view)
    rh = 3.5                      # rim half-height (shallow → looking down into it)
    bottom_y = rim_y + 11.0       # screen-y of the dish's ROUNDED bottom (lifted so a
                                  # clear hover gap shows above the building roof)
    BR = 6.0                      # half-width of the flat-ish ROUND bottom (a basin,
                                  # NOT a funnel point — the marble rests in here)

    def rim_front_y(x):
        """y of the NEAR (front) rim edge at screen-x; lower half of the rim ellipse."""
        dx = (x - cx) / rw
        dx = max(-1.0, min(1.0, dx))
        return rim_y + rh * math.sqrt(1.0 - dx * dx)

    def rim_back_y(x):
        """y of the FAR (back) rim edge at screen-x; upper half of the rim ellipse."""
        dx = (x - cx) / rw
        dx = max(-1.0, min(1.0, dx))
        return rim_y - rh * math.sqrt(1.0 - dx * dx)

    def wall_bottom_y(x):
        """y of the inner dish WALL bottom at screen-x. The walls sweep down steeply from
        the rim, then FLATTEN into a wide rounded basin near the centre (a bowl bottom,
        not a cone tip) so the marble has a real cup to rest in."""
        d = abs(x - cx)
        if d <= BR:
            # rounded basin floor: a shallow arc across the flat bottom
            s = d / BR
            return bottom_y - 1.0 * (1.0 - math.sqrt(max(0.0, 1.0 - s * s)))
        # steep outer walls from the basin edge up to the rim
        s = (d - BR) / (rw - BR)
        s = min(1.0, s)
        return bottom_y - (bottom_y - rim_y) * (s * s)

    xL, xR = int(round(cx - rw)), int(round(cx + rw))

    # --- soft c glow HALO beneath the rounded bottom so the bowl clearly HOVERS. ---
    bgy = int(round(bottom_y))
    for dx in (-4, -3, -2, -1, 0, 1, 2, 3, 4):
        c.set(int(round(cx)) + dx, bgy + 4, "c" if dx % 2 else "g")
    c.set(int(round(cx)) - 1, bgy + 5, "c")
    c.set(int(round(cx)) + 1, bgy + 5, "c")

    # --- SOLID BOWL BODY: for each column inside the rim, fill the inner wall from the
    # FRONT rim down to the dish bottom. Lit-LEFT half bright cyan, shaded-RIGHT mid g.
    # This filled concave surface is what reads as a physical curved bowl. ---
    for x in range(xL, xR + 1):
        y_top = rim_front_y(x)            # start just below the near rim
        y_bot = wall_bottom_y(x)          # down to the inner wall bottom
        col = "c" if x < cx else "g"      # lit-left brighter, shaded-right darker
        for y in range(int(round(y_top)), int(round(y_bot)) + 1):
            c.set(x, y, col)

    # --- inner shading: a darker G band hugging the deepest shaded-right wall, and a
    # bright h sheen up the lit-left wall, to sculpt the concavity. ---
    for x in range(xL, xR + 1):
        yb = int(round(wall_bottom_y(x)))
        if x > cx + 2:
            c.set(x, yb, "G")             # deep shaded inner-right wall
            c.set(x, yb - 1, "G")
        if x < cx - 3:
            c.set(x, int(round(rim_front_y(x))) + 1, "h")  # lit-left inner sheen

    # --- BACK RIM (far lip): the upper half of the rim ellipse, bright h — the open
    # mouth of the bowl, so it never reads as a solid blob. ---
    prev = None
    for x in range(xL, xR + 1):
        p = (x, rim_back_y(x))
        if prev is not None:
            c.line(prev, p, "h")
        prev = p

    # --- FRONT RIM (near lip): the lower half of the rim ellipse, dark K so the bowl
    # mouth has a crisp readable edge against the bright interior. ---
    prev = None
    for x in range(xL, xR + 1):
        p = (x, rim_front_y(x))
        if prev is not None:
            c.line(prev, p, "K")
        prev = p

    # --- OUTER BOWL OUTLINE: a K silhouette down both outer walls into a ROUNDED
    # bottom arc, so the bowl reads as a round-bottomed cup (not a funnel tip). ---
    prev = None
    for x in range(xL, xR + 1):
        p = (x, wall_bottom_y(x) + 1)     # one px below the inner floor = outer shell
        if prev is not None:
            c.line(prev, p, "K")
        prev = p

    # --- TROUGH glow: the minimum cell pooled bright (cyan + gold, NO green — Axiom
    # palette has none). A bright h pool across the round basin floor under the ball. ---
    tx, ty = int(round(cx)), int(round(bottom_y))
    for dx in (-4, -3, -2, -1, 0, 1, 2, 3, 4):
        c.set(tx + dx, ty, "h")
    c.set(tx - 1, ty + 1, "o")
    c.set(tx,     ty + 1, "O")        # bright pooled minimum just below the ball
    c.set(tx + 1, ty + 1, "o")

    # --- MARBLE AT REST in the trough (the minimum): ONE clearly round bright PEARL
    # nestled at the bottom of the bowl. A 5-wide sphere — hot-white core, thin gold
    # rim, K contact shadow beneath — so it reads unmistakably as a ball in a cup. ---
    mcx, mcy = tx, ty - 3             # marble centre, resting on the basin floor
    #     .WWW.        white pearl with a soft gold rim + bright top highlight
    #     WWhhW
    #     WhhWW
    #     .oOo.
    c.set(mcx - 1, mcy - 1, "W")
    c.set(mcx,     mcy - 1, "W")
    c.set(mcx + 1, mcy - 1, "W")
    c.set(mcx - 2, mcy,     "W")
    c.set(mcx - 1, mcy,     "W")
    c.set(mcx,     mcy,     "h")
    c.set(mcx + 1, mcy,     "h")
    c.set(mcx + 2, mcy,     "W")
    c.set(mcx - 2, mcy + 1, "W")
    c.set(mcx - 1, mcy + 1, "h")
    c.set(mcx,     mcy + 1, "h")
    c.set(mcx + 1, mcy + 1, "W")
    c.set(mcx + 2, mcy + 1, "W")
    c.set(mcx - 1, mcy + 2, "o")
    c.set(mcx,     mcy + 2, "O")     # warm gold underside (sits in the lit pool)
    c.set(mcx + 1, mcy + 2, "o")

    # --- GOLD MOTION-STREAK trailing UP the LEFT wall (it just rolled down to rest).
    # A few gold pips climbing the lit-left inner wall toward the rim. ---
    for sx_off, sy_off in ((-4, -2), (-6, -4), (-8, -6)):
        c.set(mcx + sx_off, mcy + sy_off, "o")

    # --- "MIN" tick on the lit-right inner wall above the basin (marks the optimum). ---
    _stamp(c, tx + 5, ty - 3, [
        "KKKK",
        "KOoK",
        "KKKK",
    ])


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). The humble two-step terrace pavilion grows
# into a maxed-out OPTIMIZATION INSTITUTE / solver. Every addition is mathematical +
# on-theme to THIS building (a live solver readout -> a bolted-on SOLVER-SUBSTATION
# annex cabinet -> a compute "tensor" lattice mast -> a full phase-space ensemble of
# surfaces). The rooftop masses grow UP / toward the BACK so they never collide with
# the front-left hovering FUNCTION-SURFACE signature (re-drawn LAST every stage, like
# the slate); the t3 annex sits OUT on the open RIGHT deck where there is clear sky.
# Colours mature stage by stage; gold (q) appears ONLY as the t5 flourish.
#
#   t2  small functional add : a terrace SOLVER-MONITOR probe on the right deck
#   t3  structural add       : a SOLVER-SUBSTATION annex CABINET on the right deck
#   t4  major add            : a rooftop TENSOR-ARRAY MAST of glowing node-cells
#   t5  crowning feature     : a PHASE-SPACE MULTI-SURFACE ensemble + gold caps/rail
#
# Anchors: BASE roof diamond spans x≈8..52, y≈18..40; UPPER roof x≈20..46, y≈12..25.
# The hero bowl floats front-CENTER at x≈19..43, y≈1..21. The t2 SOLVER-MONITOR probe
# stands on the right deck (screen x≈47..52,y16..20; post x49..50 down to the deck at
# y28). The t3 ANNEX is a real Box mass seated on the right-deck wedge JUST FRONT-LEFT
# of that probe (footprint x≈38..50, roof y≈25..31 — well below the probe screen, so
# the probe reads as rising from the cabinet's back shoulder): a genuine secondary
# structure, clearly bigger than the probe rod yet a smaller beat than the t4 mast.
# The t4 mast keeps its OWN frozen anchor `_mast_base_box()` (roof point (37,14)) so
# changing the t3 annex never moves the approved t4/t5 mast — t3/t4 are independent.
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_solver_monitor(c, base):
    """t2 — SMALL FUNCTIONAL ADD: a live SOLVER-MONITOR mast rising off the RIGHT-front
    terrace deck — a short post plants on the deck and lifts a K-framed g/c screen up
    into the OPEN RIGHT-DECK SKY, plotting a FALLING COST-CURVE (the optimization
    converging) with a brighter o status pip, topped by a slim telemetry ANTENNA-PROBE
    with a glowing e data-node. The suite gains a real, free-standing readout tower
    beside the surface — a genuine new silhouette element (it stands proud of the roof
    in clear sky, ~17px of new footprint), not a flat decal painted on the wall.

    Seated on the OPEN right-front deck at screen x≈47..52 — well RIGHT of the hovering
    bowl (x≤43), the front cost-gauge, AND clear of every later add (the t3 tier x≤44,
    the t4 mast x=37 + its node-grid x≤46) — so it never collides as stages stack.
    Modest, on-theme (more solver telemetry), base palette + a brightened o/e."""
    # plant the monitor on the right-front deck in CLEAR SKY (screen space, x≈47..52):
    # the deck surface there is opaque from y≈29 down, with open sky above — so the post
    # foot grounds on the deck and the screen + antenna float in transparent pixels,
    # giving the stage REAL new footprint instead of a no-op recolor on the wall.
    foot_y = 28                              # post foot on the deck surface
    px = 49                                  # post screen-x (open right-deck column)
    # short M/D post grounding the monitor on the deck (lit edge + shaded body)
    for vy in range(22, foot_y + 1):
        c.set(px, vy, "M")
        c.set(px + 1, vy, "D")
    c.set(px, foot_y, "K")
    c.set(px + 1, foot_y, "K")
    # monitor head: a K-framed screen body (6 wide x 6 tall) lifted into open sky
    sx0, sy0 = px - 2, 16
    sx1, sy1 = sx0 + 5, sy0 + 5
    c.fill_poly([(sx0, sy0), (sx1, sy0), (sx1, sy1), (sx0, sy1)], "K")        # bezel
    c.fill_poly([(sx0 + 1, sy0 + 1), (sx1 - 1, sy0 + 1),
                 (sx1 - 1, sy1 - 1), (sx0 + 1, sy1 - 1)], "d")                # dark screen
    # a falling cost-curve plotted across the screen: high-left -> low-right, settling
    curve = [(sx0 + 1, sy0 + 1), (sx0 + 2, sy0 + 2), (sx0 + 3, sy0 + 3),
             (sx0 + 4, sy0 + 3)]
    for i in range(len(curve) - 1):
        c.line(curve[i], curve[i + 1], "c")
    c.set(sx0 + 1, sy0 + 1, "h")            # bright start of the trace (high cost)
    c.set(sx0 + 4, sy0 + 3, "g")            # converged tail (settled low)
    c.line((sx0 + 1, sy1 - 1), (sx0 + 4, sy1 - 1), "G")   # dim baseline / axis
    c.set(sx0 + 4, sy1 - 1, "g")            # a tiny green "solved" tick at the baseline
    # a brighter o status pip on the bezel (the live solver heartbeat)
    c.set(sx0 + 1, sy0, "o")
    c.set(sx1 - 1, sy0, "O")
    # slim telemetry ANTENNA-PROBE rising off the screen top into clear sky, tipped
    # with a glowing e data-node + a tiny E ping (the live solver beaming its status)
    for ay in range(12, sy0):
        c.set(px, ay, "b")
    c.set(px, 12, "e")                       # antenna data-node (apex at y=12, air above)
    c.set(px - 1, 13, "E")                   # a tiny telemetry ping off the node
    c.set(px + 1, 13, "e")


# FROZEN anchor box for the TENSOR-MAST only — it is NEVER drawn; it exists solely so
# t4 (draws the mast) and t5 (re-anchors off it) compute the SAME foot from ONE source
# (no hardcoded second guess — the volt re-anchoring pitfall). Its roof point lands the
# mast foot at (37,14) on the UPPER-box roof shoulder. Kept independent of the t3 annex
# so editing the annex can never move the approved t4/t5 mast.
def _mast_base_box():
    return Box(top=(33, 8), wx=5, wy=3, h=6)


def _mast_anchor():
    tier = _mast_base_box()
    bxf, byf = tier.roof_pt(0.82, 0.32)        # RIGHT shoulder -> mast foot (37,14)
    return int(round(bxf)), int(round(byf))    # (cx, roof_y) == mast foot


MAST_TOP_Y = 4                                 # mast head y (flare apex = MAST_TOP_Y-1 = 3)


# Shared anchor for the t3 SOLVER-SUBSTATION annex CABINET. It is a REAL drawn Box mass
# seated on the open RIGHT-DECK wedge of the base roof, right beside the t2 probe so the
# probe reads as rising from its back shoulder (cohesive, not a detached blob). Compact
# footprint x≈48..56, grounded on the deck (y≈38) and rising to a roof at y≈25..31 —
# clearly above the deck silhouette in open sky, well below the probe screen (y16..20)
# and far below the t4 mast/rack (y≤16) so it never collides as stages stack. ~60px of
# genuinely new silhouette: a clear secondary structure, bigger than the t2 probe rod
# yet a deliberately SMALLER beat than the t4 tensor mast that towers to y≈3 (preserving
# the smooth t2 < t3 < t4 ramp in both prominence and pixel count). Stays x≤56.
def _annex_box():
    return Box(top=(52, 25), wx=2, wy=2, h=7)


def stage3_solver_substation(c, base):
    """t3 — STRUCTURAL ADD: a SOLVER-SUBSTATION annex CABINET bolted onto the open
    RIGHT DECK of the lower roof, beside (front-left of) the t2 telemetry probe — a
    genuine new secondary MASS (not a recolor): a compact deep-indigo `b`-banded Box
    with lit `M` left / `D` shaded-right walls and an `L` roof, carrying a tall cyan
    `g`/`c` solver-readout WINDOW on its lit face, a vent `louver` block + a thin `d`
    conduit on the shaded face, an `o` eave accent, and a small `o` status node on the
    roof. Grounded on the base deck (an existing roof point), it rises so the t2 probe
    now reads as mounted on the cabinet's back shoulder — one cohesive solver station.
    Clearly visible as new structure at 64px, yet a smaller beat than the t4 data mast
    (preserving the smooth t2 < t3 < t4 ramp). Fully on-canvas (x≤50), clear of the
    bowl (x≤43) and of every later add."""
    a = _annex_box()
    a.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # deep-indigo `b` base band so the new cabinet reads as matured structure (t3 tone)
    c.line(a.w_left, a.w_front, "b")
    c.line(a.w_front, a.w_right, "b")
    # calm starlight-gold eave accent on the lit-left roof edge (matches the suite)
    c.line(a.r_left, a.r_front, "o")
    # tall cyan SOLVER-READOUT window on the lit (left) cabinet face (live compute)
    a.window(c, "left", 0.22, 0.82, 1.2, 4.6, glass="g", hi="h", shade="G",
             frame="K", mullions=1)
    # a vent LOUVER block + a thin D conduit on the shaded (right) cabinet face
    a.louver(c, "right", 0.24, 0.72, 1.4, 3.4, body="d", slat="K", edge="M", frame="K")
    c.line(a.right_pt(0.86, 1.2), a.right_pt(0.86, a.h - 0.8), "d")
    # a small warm `o` status node on the cabinet roof (the substation is live)
    nx, ny = a.roof_pt(0.34, 0.40)
    nx, ny = int(round(nx)), int(round(ny))
    c.set(nx, ny, "o")
    c.set(nx, ny - 1, "O")
    return a


def stage4_tensor_mast(c):
    """t4 — MAJOR ADD: a rooftop TENSOR-ARRAY MAST rising off the third tier — a slim
    deep-steel `b` mast on a clear K plinth carrying a stacked GRID of glowing `e`
    node-cells (a compute lattice the model now runs on: rows×cols of energized cells
    wired together), topped by a bright `E` SOLVE-LIGHT. The prominent new vertical
    mass that says this is now a real solver engine. Palette matures: deep `b` mast +
    energized `e`/`E` cells. Anchored ON the tier roof centre (recomputed from the SAME
    Box) and rising UP-RIGHT in clear sky so it stays well clear of the front bowl,
    fully on-canvas with a visible plinth."""
    cx, roof_y = _mast_anchor()                    # SAME source as stage3/5 (no 2nd guess)
    # mast foot ≈ x37 on the tier3 right shoulder so it clears the bowl.
    # K plinth on the tier roof + a slim b/M mast rising clear above the silhouette.
    top_y = MAST_TOP_Y                             # mast head lowered to y=4 (apex y=3, air above)
    c.fill_poly([(cx - 1, roof_y), (cx + 2, roof_y),
                 (cx + 2, roof_y + 1), (cx - 1, roof_y + 1)], "K")           # plinth
    c.line((cx, roof_y), (cx, top_y), "M")         # lit mast edge
    c.line((cx + 1, roof_y), (cx + 1, top_y), "b") # shaded mast body
    c.set(cx, roof_y, "K")
    c.set(cx + 1, roof_y, "K")
    # the TENSOR node-cell GRID: a clean 3-row x 2-col lattice of glowing cells
    # CANTILEVERED to the RIGHT of the mast into clear sky, each a discrete 2x2 e cell in
    # a crisp K frame. ONE vertical G bus down the left column + a short G spar per row
    # wire it to the mast — kept SPARSE so it reads as a compute lattice, not mush. The
    # whole grid sits right of the bowl's rim (x≥41), fully on-canvas.
    gx0 = cx + 4                                   # left column x, out in clear right sky
    col_dx = 4                                     # gap to the right column
    rows_y = [top_y + 11, top_y + 7, top_y + 3]    # three node rows down the upper mast
    # ONE clean vertical bus spine just left of the cell grid (ties the rows together)
    c.line((gx0 - 1, rows_y[2] - 1), (gx0 - 1, rows_y[0] + 1), "G")
    for ry in rows_y:
        # a single short G spar from the mast across to the bus spine (the lattice arm)
        c.line((cx + 2, ry), (gx0 - 1, ry), "G")
        for cxoff in (0, col_dx):                  # two columns of cells, spaced apart
            nx = gx0 + cxoff
            # crisp K cell frame, then a 2x2 glowing e cell with a bright E lit corner
            c.fill_poly([(nx - 1, ry - 1), (nx + 2, ry - 1),
                         (nx + 2, ry + 2), (nx - 1, ry + 2)], "K")
            c.fill_poly([(nx, ry), (nx + 1, ry), (nx + 1, ry + 1), (nx, ry + 1)], "e")
            c.set(nx, ry, "E")                     # bright lit corner of the cell
    # bright E SOLVE-LIGHT crowning the mast top (the array has converged)
    for xx, yy, ch in [(0, 0, "E"), (-1, 0, "e"), (1, 0, "e"), (0, 1, "G")]:
        c.set(cx + xx, top_y + yy, ch)
    if top_y - 1 >= 0:
        c.set(cx, top_y - 1, "e")                  # a tiny upward solve-flare


def stage5_phase_space(c, base):
    """t5 — CROWNING FEATURE = FULLY EVOLVED optimization institute. The single hero
    surface blooms into a PHASE-SPACE MULTI-SURFACE: two extra glowing wireframe SHEETS
    hover in PARALLEL above the main bowl (an ensemble of candidate solutions), each a
    dashed `E`/`e` saddle curve with a bright `E` MINIMUM marker — so the suite now
    explores a whole family of surfaces at once. The building is then dressed in premium
    GOLD: `q` gold CAPS on the front terrace corners + a `q` gold RAIL along the front
    deck edge. Reads as elite, still unmistakably the same terrace pavilion. Gold ONLY
    here. Drawn BEFORE the hero bowl is re-laid, so the main bowl stays in front/lowest
    of the stacked ensemble (nearest the viewer); these sheets read as hovering above it."""
    # --- PHASE-SPACE ensemble: 2 extra wireframe solution-sheets hovering in the CLEAR
    # UPPER-RIGHT sky beside the hero bowl (x≈45..60, y≈4..15), so they read as a stacked
    # FAMILY of candidate surfaces the suite now explores at once — NOT overdrawn by the
    # bowl (which fills x≈18..43). A faint dotted e LIFT-LINE ties the nearest sheet back
    # to the bowl's right rim so the ensemble reads as CAST from the surface, not unmoored. ---
    ecx = 52                                       # ensemble centre x (clear right sky)
    # faint dotted lift-line from the bowl's right rim (≈x43,y5) up to the first sheet
    for k, (lx, ly) in enumerate([(44, 6), (46, 7), (48, 8), (50, 9)]):
        if k % 2 == 0:
            c.set(lx, ly, "e")
    # each sheet: (centre-y, half-width, dip, wire-char, minima-char)
    sheets = [(11, 7, 3, "e", "E"),    # lower/near sheet (wider, mid-glow)
              (6, 5, 2, "E", "E")]     # upper/far  sheet (smaller, bright — the apex)
    for syc, hw, dip, ch, mch in sheets:
        # a shallow saddle wireframe: a dashed parabolic arc sagging to a centre minimum.
        for x in range(ecx - hw, ecx + hw + 1):
            if x < 0 or x > 63:
                continue
            t = (x - ecx) / float(hw)
            y = syc + int(round(dip * (t * t - 1.0)))  # high at edges, low at centre
            if 0 <= y <= 63 and (x % 2 == 0):      # DASHED → reads as open wireframe
                c.set(x, y, ch)
        # two faint cross-ribs so each sheet reads as a SURFACE patch, not a single line
        for rxo in (-hw // 2, hw // 2):
            rxp = ecx + rxo
            ry0 = syc + int(round(dip * ((rxo / float(hw)) ** 2 - 1.0)))
            if 0 <= rxp <= 63 and 0 <= ry0 + 1 <= 63:
                c.set(rxp, ry0 + 1, ch)
        # the bright minimum marker pooled at the centre of this sheet (its solution)
        my = syc - dip
        if 0 <= my <= 63:
            c.set(ecx, my, mch)
            c.set(ecx - 1, my, "e")
            c.set(ecx + 1, my, "e")

    # --- GOLD premium trim (t5 flourish only) -------------------------------------
    # a gold RAIL re-tracing the FRONT terrace deck edges (over the existing L/D rail)
    c.line(base.r_left, base.r_front, "q")
    c.line(base.r_front, base.r_right, "q")
    # bright gold CAPS on the three front terrace corners (elite trim, sparse + clean)
    for cap in (base.r_left, base.r_front, base.r_right):
        cxp, cyp = int(round(cap[0])), int(round(cap[1]))
        c.set(cxp, cyp - 1, "O")               # bright corner boss
        c.set(cxp, cyp, "q")
    # a small gold cap on the upper-setback's lit front corner too (ties the zigurat)
    fcx, fcy = int(round(UPPER.r_front[0])), int(round(UPPER.r_front[1]))
    c.set(fcx, fcy - 1, "q")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, layers cumulative stages, and
# RE-DRAWS the hovering function-surface signature LAST so the hero always reads in
# front of the new structure (as chalkboard-room does with its slate easel).
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the mathematical-modeling-suite at upgrade `stage` (1..5). Stage 1 is
    IDENTICAL to the shipped base; each higher stage keeps every prior addition and
    bolts on the next (t2 solver-monitor -> t3 third terrace tier -> t4 tensor-array
    mast -> t5 phase-space multi-surface + gold caps/rail). The terrace pavilion grows
    UP and toward the BACK into a maxed-out optimization institute, while the front-
    CENTER hovering FUNCTION-SURFACE signature stays clear and on top.

    Painter's order: base form first; the upgrade masses grow on the UPPER box / its
    new top tier and rise up-right (away from the bowl); the hovering function-surface
    is RE-DRAWN last at every stage so the hero signature always reads in front."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    contact_shadow(c)               # contact shadow under the whole footprint
    lower_base(c, BASE)             # broad ground floor: LEFT atrium glass (HERO)
    upper_setback(c, UPPER)         # narrower back setback box (stepped terrace)
    anchor = terrace_deck(c, BASE, UPPER)   # open front terrace + cost gauge

    # --- CUMULATIVE UPGRADE STAGES (grown UP / BACK, clear of the front bowl) ------
    if stage >= 2:
        stage2_solver_monitor(c, BASE)
    if stage >= 3:
        stage3_solver_substation(c, BASE)
    if stage >= 4:
        stage4_tensor_mast(c)
    if stage >= 5:
        stage5_phase_space(c, BASE)

    # --- SIGNATURE LAST: the hovering function-surface always reads in front --------
    function_surface(c, anchor)     # SIGNATURE: hovering surface + rolling marble
    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/axiom"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "mathematical-modeling-suite"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped mathematical-modeling-suite.png, so it does NOT overwrite
    the base PNG."""
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
