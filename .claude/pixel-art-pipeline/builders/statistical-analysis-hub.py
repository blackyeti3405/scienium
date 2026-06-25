#!/usr/bin/env python3
"""
Statistical Analysis Hub — MindFrame economy building (BESPOKE form, STANDARD role).

A small COMPUTE / SERVER HUB: two cleanly-stacked indigo blocks in a STEPPED
setback — a taller compute core behind, a lower glazed terminal block stepped
forward-left — crowned by a rooftop holo-emitter. A boxy, vented data-center
silhouette, deliberately distinct from the Data-Viz wide glass GALLERY HALL and
the round Comp-Social ZIGGURAT. The compute core's flanks read as opaque SERVER
LOUVERS (racks breathing), not glass; the LIT-LEFT terminal room is the hero
GLASS (analyst stations behind a clean glazed pane).

  • Opening side = LEFT: the hero is the lit-LEFT terminal-room Box.window (g/c
    glass, h sheen, soft mullion) plus a small status pane on the core. The
    shaded-RIGHT core face stays plainer — a server-vent louver band is its
    texture (HVAC), keeping the build reading as a vented machine, not all glass.
  • Signature (one-of-one): ABOVE the roof a holographic BELL-CURVE (normal
    distribution) hovers — a smooth symmetric c/g hump on a faint axis baseline,
    its two outer TAILS shaded magenta (o/r = rejection regions); a thin dashed
    O/o vertical SIGNIFICANCE line (alpha) crosses the right tail; a p-value
    NEEDLE drops DOWN past that line (faint motion trail), lighting a tiny
    K-framed "SIGNIFICANT" stamp beside the curve = the right-test diagnosis.

Composed from art/isobuild.{Box} — NO iso.draw_cube / base_windows.
Draw order: contact shadow -> compute core (back) -> terminal block (front) ->
rooftop holo-emitter + accent strip -> the holographic bell-curve signature.
"""
import os
import sys
import json
import math

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box

MIND = {"K": "#181428", "W": "#e8e2f6", "L": "#cabfe6", "M": "#9f90c8", "D": "#6f5fa0", "d": "#4a3c70",
        "h": "#ecc8f4", "c": "#d0a8ee", "g": "#a45ce0", "G": "#6a2fb0",
        "o": "#f08cce", "O": "#ffb8e2", "r": "#b03a80"}


# ── geometry: a stepped two-block compute hub ────────────────────────────────
# Compute core (taller, back). Terminal block stepped clearly FORWARD + DOWN +
# LEFT so the setback reads as two distinct stacked volumes, not one cube. The
# core is notably TALLER; the terminal is set well in front of and below it.
CORE = Box(top=(33, 19), wx=7, wy=6, h=19)
TERM = Box(top=(23, 28), wx=6, wy=7, h=10)


def _stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings) at top-left (x0,y0).
    '.' = skip (transparent)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


# ── 0. contact shadow under the whole footprint (drawn FIRST) ─────────────────
def contact_shadow(c):
    scx, scy = 30, 57
    for x in range(scx - 18, scx + 18):
        for y in range(scy - 2, scy + 3):
            ex = (x - scx) / 18.0
            ey = (y - scy) / 2.4
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")


# ── 1. COMPUTE CORE — taller back block: server louvers + status pane ─────────
def compute_core(c, b):
    """The taller compute core (back). M/D indigo walls. Its LIT-LEFT face carries
    a server-vent LOUVER stack (opaque recessed slats — racks breathing) above a
    single small status WINDOW; its SHADED-RIGHT face carries a second louver band
    (HVAC) so the build reads as a vented machine, not all glass."""
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # LIT-LEFT face: a tall server-vent louver stack (the hero rack texture) ...
    b.louver(c, "left", 0.16, 0.84, 2.0, 11.2, body="d", slat="K", edge="M", frame="K")
    # ... over a single small status WINDOW low on the lit face (observation glass)
    b.window(c, "left", 0.30, 0.70, 12.6, 16.4, glass="g", hi="h", shade="G",
             frame="K", mullions=0, sheen="W")

    # SHADED-RIGHT face: a plainer HVAC louver band (opaque) — keeps the right side
    # reading as vents, not glass. Brighter edge so slats read on the dark face.
    b.louver(c, "right", 0.18, 0.82, 3.2, 9.0, body="d", slat="K", edge="M", frame="K")
    # a low plain shaded wall remains below it (no glazing on the right)
    return b


# ── 2. TERMINAL BLOCK — lower front-left setback: glazed terminal room (HERO) ──
def terminal_block(c, b):
    """The lower terminal block, stepped forward + down + left of the core (the
    setback). M/D indigo. Its LIT-LEFT face is the hero GLASS: a clean glazed
    terminal-room Box.window (g/c glass, h sheen, soft mullion) — analyst screens
    behind glass. A small D parapet caps its low roof."""
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # HERO terminal-room window on the LIT-LEFT face — a single large glazed pane
    # with one soft mullion (analyst stations behind glass). Reads clearly as GLASS.
    b.window(c, "left", 0.16, 0.82, 2.2, 9.0, glass="g", hi="h", shade="G",
             frame="K", mullions=1, sheen="W")
    # a couple of faint c analyst-screen glints inside the glass (seating implied)
    c.set(int(round(b.left_pt(0.33, 5.6)[0])), int(round(b.left_pt(0.33, 5.6)[1])), "c")
    c.set(int(round(b.left_pt(0.62, 6.0)[0])), int(round(b.left_pt(0.62, 6.0)[1])), "c")

    # SHADED-RIGHT face: plainer — a single small status pane (glow on the shaded
    # face) so the right isn't dead, but stays subordinate to the lit hero.
    b.window(c, "right", 0.30, 0.66, 3.4, 7.0, glass="g", hi="h", shade="G",
             frame="K", mullions=0, sheen="h")

    # small D parapet along the front roof edges of the low block
    c.line(b.r_left, b.r_front, "D")
    c.line(b.r_front, b.r_right, "d")
    return b


# ── 3. ROOFLINE — holo-emitter plinth on the core roof + magenta accent strip ─
def roofline(c, core):
    """A small M/D holo-emitter ring/plinth dead-center on the flat core roof (the
    hero projector the bell-curve springs from) + a thin o magenta accent strip
    edging the roof. Returns the emitter top point (the projection anchor)."""
    # thin o magenta accent strip along the lit back roof edges of the core
    c.line(core.r_top, core.r_left, "o")
    c.line(core.r_top, core.r_right, "r")

    # holo-emitter PLINTH: a tiny iso prism dead-center on the roof
    em = Box(top=core.roof_pt(0.5, 0.62), wx=2, wy=2, h=3)
    em.draw(c, roof="M", lwall="M", rwall="D", roof_hi="L", outline="K",
            with_shadow=False)
    # glowing emitter LENS on top (the projector aperture) — magenta glow
    lx, ly = int(round(em.roof_pt(0.5, 0.5)[0])), int(round(em.roof_pt(0.5, 0.5)[1]))
    c.set(lx, ly, "O")
    c.set(lx - 1, ly, "o")
    c.set(lx + 1, ly, "o")
    c.set(lx, ly - 1, "h")
    # a thin emitter BEAM rising from the lens up to the floating hologram, so the
    # bell-curve clearly HOVERS above the roof with clean air between (not on it).
    baseline_y = ly - 9          # the hologram's axis baseline floats this high
    for y in range(baseline_y + 1, ly):
        c.set(lx, y, "c" if (y % 2 == 0) else "h")
    return (lx, baseline_y)


# ── 4. SIGNATURE — rooftop holographic BELL-CURVE diagnosis ───────────────────
def bell_curve(c, anchor):
    """The hero: a holographic normal-distribution BELL-CURVE hovering above the
    emitter, rebuilt to read as a true GAUSSIAN SITTING ON AN X-AXIS (open at the
    bottom, NOT a closed cloud). A clear horizontal x-axis BASELINE runs the full
    width under the curve; the curve is a smooth symmetric c/h hump that tapers
    DOWN to the baseline at BOTH ends. The two outer TAILS are MIRRORED magenta
    wedges (left tail == right tail, same fill weight/shape = rejection regions).
    A thin DASHED vertical significance-THRESHOLD line stands apart from a SEPARATE
    dropping p-value NEEDLE (two distinct elements, needle PAST the line). A small
    K-framed stamp lights up with a real CHECK glyph = SIGNIFICANT diagnosis."""
    ax, ay = anchor          # screen point of the axis baseline center
    half = 13                # curve half-width (cols left/right of center)
    peak = 11                # curve peak height (taller -> a rounded apex, not a flat top)
    sigma = half / 2.0       # spread tuned so a rounded crown coexists with tails that
                             # descend gradually (leaving vertical room under the tail
                             # rim for a DISTINCT threshold line + a deeper needle).

    def hump(dx):
        return peak * math.exp(-(dx * dx) / (2 * sigma * sigma))

    # precompute the rim y at each column. At the extreme ends the hump value is
    # ~0, so the rim MEETS the baseline (ay) -> the curve is OPEN at the bottom and
    # sits on the axis, never closing into a cloud loop.
    rim = {dx: int(round(ay - hump(dx))) for dx in range(-half, half + 1)}
    rim[-half] = ay          # force both ends flush onto the baseline
    rim[half] = ay
    apex_y = ay - peak
    tail_cut = int(half * 0.62)   # |dx| beyond this = magenta tail (rejection)

    # ── X-AXIS BASELINE ── the single most important fix: a clear horizontal rule
    # the whole distribution sits on, spanning the full curve width plus tick caps.
    # Solid M so it reads as a deliberate AXIS (open underneath), not a cloud floor.
    for dx in range(-half - 2, half + 3):
        c.set(ax + dx, ay, "M")
    c.set(ax - half - 2, ay, "L")            # bright tick caps at the axis ends
    c.set(ax + half + 2, ay, "L")
    # small d origin/scale ticks dropping just below the axis at the tail bounds
    c.set(ax - tail_cut, ay + 1, "d")
    c.set(ax + tail_cut, ay + 1, "d")
    c.set(ax, ay + 1, "d")                    # center tick (mean)

    # ── MIRRORED TAIL WEDGES (rejection regions) ── fill the area UNDER the rim at
    # both outer flanks with the SAME magenta treatment so left tail == right tail:
    # r body fill fading to a brighter o glow right under the rim. Symmetric by
    # construction (rim is symmetric and both sides use identical code).
    for dx in range(-half, half + 1):
        if abs(dx) >= tail_cut:
            top = rim[dx]
            for y in range(top + 1, ay):
                c.set(ax + dx, y, "r")
            if top + 1 < ay:                 # o glow hugging under the rim edge
                c.set(ax + dx, top + 1, "o") # (only strictly above the baseline)

    # ── BODY GLOW ── keep the central interior airy: a single faint c then g glow
    # row hugging UNDER the rim across the body, so it reads as a glowing CURVE
    # with open air beneath (sitting on the axis), never a solid packed mountain.
    for dx in range(-tail_cut + 1, tail_cut):
        rt = rim[dx]
        if rt + 1 < ay:
            c.set(ax + dx, rt + 1, "c")
        if rt + 2 < ay - 1:
            c.set(ax + dx, rt + 2, "g")

    # ── SMOOTH RIM ── the glowing curve outline as one continuous symmetric line:
    # h over the body, o over the magenta tails. Connect column-to-column so the
    # steep shoulders stay solid (no gaps) and the silhouette reads as one bell.
    prev = None
    for dx in range(-half, half + 1):
        p = (ax + dx, rim[dx])
        rim_ch = "o" if abs(dx) >= tail_cut else "h"
        if prev is not None:
            c.line(prev, p, rim_ch)
        c.set(*p, rim_ch)
        prev = p
    # ROUNDED CROWN — a single 1-px bright apex with smooth shoulders dropping away
    # one row per side, so the top reads as one rounded Gaussian peak (no flat top).
    c.set(ax, apex_y - 1, "W")               # the very tip — a single bright apex pixel
    c.set(ax, apex_y, "h")                   # immediately below the tip
    c.set(ax - 1, apex_y, "h")               # shoulders one row down each side (smooth)
    c.set(ax + 1, apex_y, "h")
    c.set(ax, apex_y + 1, "c")               # soft under-glow beneath the crown
    # brighten the outer tail rims (O) symmetrically so both rejection zones pop
    for dx in (-half + 1, half - 1):
        c.set(ax + dx, rim[dx], "O")

    # The threshold + needle live in the CLEAN INTERIOR AIR under the right slope of
    # the curve body — INBOARD of the dense magenta rejection tail — where there is a
    # tall, empty vertical channel down to the axis. This keeps both vertical marks off
    # the busy tail rim so they read as two distinct elements rather than tangling in
    # the glow. The threshold stands first (inner); the needle is dropped DEEPER (to
    # its right, toward the tail) so it reads as "fallen PAST the α-line".
    th_dx = 4                                 # threshold column: interior, right of mean
    nd_dx = 7                                 # needle column: +3 -> a clean 2-col gap

    # ── SIGNIFICANCE THRESHOLD LINE (alpha) ── element #1, the STATIC α reference: a
    # thin DASHED vertical rule in cool O, 1-on/1-off, from just under the body rim all
    # the way down ONTO the axis, capped by a single O tick above the rim. Thin + gapped
    # so it never merges with the solid needle a few cols to its right.
    thx = ax + th_dx
    th_top = rim[th_dx] + 2                    # start just inside the rim (clear of the glow)
    c.set(thx, rim[th_dx] - 1, "O")           # α cap-tick floating above the rim
    for y in range(th_top, ay):               # DASHED rule down to the axis (every other row)
        if (y - th_top) % 2 == 0:
            c.set(thx, y, "O")                # cool bright dash (gaps left transparent)
    c.set(thx, ay + 1, "o")                   # tiny foot where the α-line meets the axis

    # ── p-VALUE NEEDLE ── element #2: a SEPARATE solid arrow dropped DEEPER, to the
    # RIGHT of the α-line (a clean 2-col empty gap between them) so the two parse as
    # DISTINCT marks — "the p-value fell PAST the α threshold". SOLID continuous h shaft
    # capped by a bright O chevron arrowhead pointing DOWN onto the axis — unmistakably
    # different from the threshold's thin dashes.
    ndx = ax + nd_dx
    ntop = rim[nd_dx] + 2                      # shaft begins just inside the rim
    nty = ay - 1                              # arrow tip just above the axis floor
    for y in range(ntop, nty - 1):           # SOLID continuous shaft (vs dashed line)
        c.set(ndx, y, "h")
    c.set(ndx, nty - 1, "O")                 # bright arrowhead core
    c.set(ndx, nty, "O")                     # arrow point landing on the axis
    c.set(ndx - 1, nty - 1, "h")             # chevron wings of the downward arrowhead
    c.set(ndx + 1, nty - 1, "h")
    c.set(ndx, nty + 1, "o")                 # tip resting ON the axis = past the line

    # ── SIGNIFICANT STAMP ── a small K-framed panel lighting up BELOW-RIGHT of the
    # curve with a REAL CHECK-MARK glyph (✓ drawn in W on an O/o lit face) = the
    # diagnosis. The bright W tick + O lit edge differentiate it from the building's
    # plain glass panes ("activated", not a generic screen).
    sx = ax + half - 3
    sy = ay + 3
    _stamp(c, sx, sy, [
        "KKKKKKKK",
        "KoooooWK",   # lit magenta face with the check-mark's far stroke starting
        "KooooWoK",
        "KWooWooK",   # the V of the ✓ tightening toward the elbow
        "KoWWoooK",   # elbow of the check
        "KooooooK",
        "KKKKKKKK",
    ])
    # bright O lit edge along the stamp's top-left = "lights up when needle clears"
    for i in range(1, 7):
        c.set(sx + i, sy + 1, "O") if i in (1, 2) else None
    c.set(sx + 1, sy + 2, "O")
    c.set(sx, sy + 3, "o")                   # soft glow spill on the lit edge


def build():
    c = Canvas()
    contact_shadow(c)               # contact shadow under the whole footprint
    compute_core(c, CORE)           # taller back block: server louvers + status pane
    terminal_block(c, TERM)         # lower front-left setback: glazed terminal room (LEFT hero)
    anchor = roofline(c, CORE)      # holo-emitter plinth + magenta accent strip
    bell_curve(c, anchor)           # SIGNATURE: holographic bell-curve diagnosis

    spec = {"width": 64, "height": 64, "palette": MIND, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/mindframe_statistical-analysis-hub.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
