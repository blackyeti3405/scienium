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

# Axiom set palette — author on these chars→hex exactly (≤16 colors, K hard outline)
AXIOM = {"K": "#0e1124", "W": "#dfe6f6", "L": "#b4bee0", "M": "#7c88b8", "D": "#4e5888", "d": "#333a60",
         "h": "#d6ecff", "c": "#aad8ff", "g": "#4a9ce6", "G": "#2060b0",
         "o": "#ffe27a", "O": "#fff3c0", "r": "#c89a2a"}


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


def build():
    c = Canvas()
    contact_shadow(c)               # contact shadow under the whole footprint
    lower_base(c, BASE)             # broad ground floor: LEFT atrium glass (HERO)
    upper_setback(c, UPPER)         # narrower back setback box (stepped terrace)
    anchor = terrace_deck(c, BASE, UPPER)   # open front terrace + cost gauge
    function_surface(c, anchor)     # SIGNATURE: hovering surface + rolling marble

    spec = {"width": 64, "height": 64, "palette": AXIOM, "rows": c.rows()}
    out = "/path/to/scienium/art/src/buildings/axiom_mathematical-modeling-suite.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
