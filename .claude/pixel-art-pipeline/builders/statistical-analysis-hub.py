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

═══════════════════════════════════════════════════════════════════════════════════
UPGRADE-EVOLUTION pass (matches the MindFrame reference interview-room.py). The base
form is UNCHANGED at stage 1 (byte-identical to the shipped statistical-analysis-hub.png);
cumulative t2..t5 helpers bolt MORE STATISTICAL INSTRUMENTATION onto the compute hub —
the lab grows from a single-test diagnosis into a live MULTI-DISTRIBUTION ANALYTICS
DECK. Additions sit on the core ROOF (under/around the bell curve) and the shaded-RIGHT
flank, growing UP and OUT, so the hovering bell-curve signature is never occluded. The
lab's magenta o/O stays the HUMAN accent; the evolved glow is cool signal-cyan e/E
(data). Gold (q) is a t5 flourish only.

  t2  small functional add : a rooftop SIGNIFICANCE-MARKER (p-value flag + cyan quartile
                             pip) under the curve + a brighter o peak-light at the apex
  t3  structural add       : a slim SERVER / COMPUTE ANNEX (glowing g instrument bays,
                             b housing) bolted to the shaded-right flank — real compute
  t4  major add            : a second DISTRIBUTION plotted alongside the curve — a raised
                             e-glowing SCATTER / BOX-PLOT board on a b frame (multivariate)
  t5  crowning feature     : a live MULTI-DISTRIBUTION DECK — a confidence-band ribbon glows
                             bright E with a pulsing result node, q gold axis-rails + apex finial
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

# Base MindFrame palette (shared keys) + the EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so statistical-analysis-hub.png is
# unchanged). These exact evolved keys are shared by all 10 mindframe buildings:
#   b  deep indigo steel — matured structure tone for t3+ new masses
#   e  energized signal-cyan glow (mid)   E  signal-cyan glow (bright) — the t4/t5 data
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
MIND = {"K": "#181428", "W": "#e8e2f6", "L": "#cabfe6", "M": "#9f90c8", "D": "#6f5fa0", "d": "#4a3c70",
        "h": "#ecc8f4", "c": "#d0a8ee", "g": "#a45ce0", "G": "#6a2fb0",
        "o": "#f08cce", "O": "#ffb8e2", "r": "#b03a80",
        "b": "#2b2440", "e": "#7fd4ff", "E": "#d6f4ff", "q": "#f3c63a"}


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


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS statistical
# instrumentation onto the prior form — never restarts, never recolors the whole
# building. Theme: a single-test diagnosis hub grows into a fully built-out, live
# MULTI-DISTRIBUTION ANALYTICS DECK. Additions sit on the core ROOF (around/under the
# hovering bell curve) and the shaded-RIGHT flank, growing UP and OUT, so the floating
# bell-curve signature is never occluded. The lab's magenta o/O stays the HUMAN accent;
# the evolved glow is cool signal-cyan e/E (data). Gold (q) only at t5.
#
#   t2  small functional add   : a rooftop SIGNIFICANCE-MARKER (p-value flag + cyan pip)
#   t3  structural add         : a SERVER / COMPUTE ANNEX on the shaded-right flank
#   t4  major add              : a second DISTRIBUTION (e-glowing SCATTER / BOX-PLOT board)
#   t5  crowning feature       : a live MULTI-DIST DECK (E confidence-band + gold rails)
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_marker(c, core, anchor):
    """t2 — SMALL FUNCTIONAL ADD: a rooftop SIGNIFICANCE-MARKER planted on the clear
    FRONT-CENTRE of the core roof (forward of the holo-emitter and well below the
    floating curve, in the open V-gap between the curve's two descending tails so it
    never touches the signature): a short K staff flying a magenta p-value FLAG that
    streams toward the viewer (into clear air), with a distinct cyan QUARTILE PIP a few
    px to its right. Plus the curve's APEX is lit clearly brighter (an o/O peak-bloom)
    — the hub now FLAGS the significant result it found. Base palette + a brightened o;
    the cyan pip is the lab's c (the evolved e arrives at t4). Anchored on a roof point
    so the flag reads as planted ON the roof."""
    ax, ay = anchor                       # bell baseline centre + emitter column
    # --- peak-light: a clear o/O bloom crowning the curve apex (lights the winning peak).
    apex_y = ay - 11                      # same peak height the bell_curve uses
    c.set(ax, apex_y - 2, "O")            # bright spark above the W tip
    c.set(ax - 1, apex_y - 2, "o")
    c.set(ax + 1, apex_y - 2, "o")
    c.set(ax, apex_y - 3, "O")            # a second pixel up so the bloom reads at 64px
    c.set(ax - 2, apex_y - 1, "o")        # short side rays splaying off the peak
    c.set(ax + 2, apex_y - 1, "o")

    # --- significance-marker PLACARD on a short post, planted on the clear lit
    #     FRONT-CENTRE roof plane. A small K-FRAMED magenta SIGN reads crisply at 64px
    #     against the bright lavender roof (where a cloth pennant got lost in the curve's
    #     magenta glow). Anchored at roof_pt(0.55,0.08) so the post stands on bright roof,
    #     LEFT of the emitter beam (x=35), and the sign-top stays clear under the curve.
    fxf, fyf = core.roof_pt(0.55, 0.08)
    fx, fy = int(round(fxf)), int(round(fyf))
    post_top = fy - 3                     # short post; the sign sits above it on bright roof
    c.line((fx, fy), (fx, post_top), "K")         # dark post (pops on the lit roof)
    c.set(fx - 1, fy, "d")                        # tiny base shadow on the roof deck
    # the placard: a 5x4 K-framed magenta sign reading "p<α" via an o face + a W tick,
    # its top-left bright (lit). Top-left corner of the sign at (sx0,sy0).
    sx0, sy0 = fx - 1, post_top - 4
    _stamp(c, sx0, sy0, [
        "KKKKK",
        "KOooK",   # lit magenta face (O bright top-left)
        "KoWoK",   # a bright W tick on the sign = "significant p"
        "KKKKK",
    ])

    # --- cyan QUARTILE PIP: a distinct small c diamond on the roof to the RIGHT of the
    #     post foot (a quartile/median tick dropped on the deck) — a separate marker that
    #     contrasts (cyan) against the magenta sign so the two read as two elements.
    px, py = fx + 3, fy
    c.set(px, py - 1, "h")                        # pip highlight (top)
    c.set(px, py, "c")                            # pip core
    c.set(px - 1, py, "G"); c.set(px + 1, py, "G")  # pip shoulders (seat it on the roof)
    c.set(px, py + 1, "d")                        # pip foot shadow


def stage3_annex(c, core):
    """t3 — STRUCTURAL ADD: a slim SERVER / COMPUTE ANNEX bolted onto the core's
    SHADED-RIGHT flank — a real new structural Box of glowing instrument BAYS running
    the regressions, so the hub gains visible compute under the stats. Lower + slimmer
    than the core (it abuts the right wall and steps DOWN-FRONT), introducing the
    matured deep-indigo `b` as its housing tone with a stack of glowing `g` bay-slits
    on its lit-LEFT face. Kept fully on-canvas (right edge x≈55 < 63) and clear of the
    floating curve (which lives high above the roof)."""
    # seat the annex apex on the core's RIGHT roof corner, stepped DOWN + RIGHT so it
    # reads as a lower unit abutting the core's shaded flank (grows OUT to the right).
    apex = (core.r_right[0] - 1, core.r_right[1] + 8)
    annex = Box(top=apex, wx=4, wy=3, h=10)
    # b deep-indigo housing (matured structure tone) — darker than the core walls so
    # it reads as a bolted-on secondary unit, not part of the original mass.
    annex.draw(c, roof="b", lwall="D", rwall="b", roof_hi="M", outline="K")
    # a stack of glowing g INSTRUMENT-BAY slits down the lit-LEFT face (racks running
    # the regressions) — drawn as a louver in the evolved tones so it reads as live bays.
    annex.louver(c, "left", 0.22, 0.78, 1.8, 8.4, body="G", slat="K", edge="g", frame="K")
    # two bright c "active" bay lights punched into the slit stack (a job is running)
    c.set(int(round(annex.left_pt(0.40, 3.2)[0])), int(round(annex.left_pt(0.40, 3.2)[1])), "c")
    c.set(int(round(annex.left_pt(0.62, 6.0)[0])), int(round(annex.left_pt(0.62, 6.0)[1])), "c")
    # a thin g cooling-vent strip along the lit eave (the annex breathes heat)
    c.line(annex.r_left, annex.r_front, "g")
    return annex


def stage4_scatter(c, core, anchor):
    """t4 — MAJOR ADD: a SECOND DISTRIBUTION plotted ALONGSIDE the bell curve — a raised
    cyan-glowing SCATTER / BOX-PLOT board on a deep-indigo `b` frame, mounted on a short
    mast off the core roof to the RIGHT of the emitter and BELOW the curve's right tail,
    so the hub now reads as running MULTIVARIATE models (a second plot beside the
    Gaussian). The prominent new rooftop mass. Palette matures: deep `b` board frame +
    mast, energized signal-cyan `e/E` for the plotted data (box-plot whisker + scatter
    points + a fitted trend dash). Kept fully on-canvas and clear of the floating curve."""
    ax, ay = anchor
    # mast foot on the core roof, right-of-emitter (roof_pt u→front, v→top). A point
    # toward the RIGHT-BACK roof so the board rises in the clear air right of the curve.
    mxf, myf = core.roof_pt(0.62, 0.46)
    mx, my = int(round(mxf)), int(round(myf))
    # short b/D mast lifting the board UP off the roof into the gap below the right tail
    board_y = my - 9                      # board bottom edge floats here (clear of roof)
    c.line((mx, my), (mx, board_y + 5), "b")
    c.line((mx + 1, my), (mx + 1, board_y + 5), "D")
    c.set(mx, my, "K"); c.set(mx + 1, my, "K")     # mast foot on the roof
    c.set(mx - 1, my, "d")                          # foot shadow

    # --- the BOARD: a small upright b-framed panel (a second-plot display). Author it
    #     directly in screen space as a compact rectangle, K-outlined, with a dark b
    #     interior the cyan plot sits on. Width 9 / height 7, top-left at (bx0,by0).
    bx0, by0 = mx - 3, board_y - 6
    bw, bh = 9, 7
    # frame + dark plot field
    c.fill_poly([(bx0, by0), (bx0 + bw, by0), (bx0 + bw, by0 + bh), (bx0, by0 + bh)], "b")
    for a, bb in [((bx0, by0), (bx0 + bw, by0)), ((bx0, by0 + bh), (bx0 + bw, by0 + bh)),
                  ((bx0, by0), (bx0, by0 + bh)), ((bx0 + bw, by0), (bx0 + bw, by0 + bh))]:
        c.line(a, bb, "K")
    c.line((bx0 + 1, by0), (bx0 + bw - 1, by0), "M")   # lit top edge (board catches light)
    # plot AXES inside the board (a faint G L-frame so it reads as a chart field)
    c.line((bx0 + 2, by0 + 1), (bx0 + 2, by0 + bh - 1), "G")     # y-axis
    c.line((bx0 + 2, by0 + bh - 1), (bx0 + bw - 1, by0 + bh - 1), "G")  # x-axis
    # --- a BOX-PLOT (the second distribution): a cyan box with a median bar + whiskers,
    #     drawn low-left on the field so it parses as a distinct stats plot vs scatter.
    c.line((bx0 + 4, by0 + 2), (bx0 + 4, by0 + 5), "e")         # left whisker stem
    c.fill_poly([(bx0 + 3, by0 + 3), (bx0 + 5, by0 + 3),
                 (bx0 + 5, by0 + 4), (bx0 + 3, by0 + 4)], "e")  # the box (IQR)
    c.set(bx0 + 4, by0 + 3, "E")                               # bright median tick in the box
    # --- SCATTER points + a fitted TREND dash up-right (the multivariate cloud)
    for sx, sy, ch in [(6, 4, "e"), (7, 3, "E"), (7, 5, "e"), (8, 2, "E"), (6, 2, "e")]:
        c.set(bx0 + sx, by0 + sy, ch)
    c.line((bx0 + 5, by0 + 5), (bx0 + 8, by0 + 2), "e")        # faint fitted trend line
    return (bx0, by0, bw, bh)             # hand the board rect to t5


def stage5_deck(c, core, anchor):
    """t5 — CROWNING FEATURE = FULLY EVOLVED multi-distribution analytics deck. The roof
    becomes a live dashboard: a glowing CONFIDENCE-BAND RIBBON (bright `E`) hugs just
    under the bell-curve rim across the body (a 95% CI band wrapping the Gaussian), with
    a single pulsing bright RESULT NODE riding the apex; the second-plot board (from t4)
    lights its frame with energized cyan; and the whole signature is framed in GOLD
    premium trim — gold AXIS-RAILS bracketing the curve baseline + a gold APEX FINIAL
    crowning the peak. Reads as elite, still recognizably the same stats hub, just maxed
    out. Re-derives the curve apex/baseline from the SAME `anchor` (no second guess)."""
    ax, ay = anchor                       # bell baseline centre + emitter column
    half = 13
    peak = 11
    sigma = half / 2.0
    apex_y = ay - peak

    def hump(dx):
        return peak * math.exp(-(dx * dx) / (2 * sigma * sigma))

    rim = {dx: int(round(ay - hump(dx))) for dx in range(-half, half + 1)}
    rim[-half] = ay
    rim[half] = ay
    tail_cut = int(half * 0.62)

    # --- CONFIDENCE-BAND RIBBON: a bright E band hugging UNDER the curve rim across the
    #     central body (inboard of the magenta rejection tails), one glowing row that
    #     traces the Gaussian shoulders — reads as a 95% CI envelope wrapping the curve.
    #     Drawn under the existing c/g body glow rows so it deepens the curve, not floods.
    for dx in range(-tail_cut + 1, tail_cut):
        ry = rim[dx] + 3                  # one row below the prior c/g body-glow rows
        if ry < ay - 1:
            c.set(ax + dx, ry, "E" if abs(dx) <= 2 else "e")
    # a couple of brighter E ticks where the band meets the shoulders (CI bounds)
    for dx in (-tail_cut + 1, tail_cut - 1):
        ry = rim[dx] + 3
        if ry < ay - 1:
            c.set(ax + dx, ry, "E")

    # --- pulsing RESULT NODE riding the apex: a small bright e/E node with a 1px halo
    #     just above the crown (the live aggregated result). Sits above the W apex tip
    #     with a clear gap so it reads as a discrete node, not part of the curve line.
    #     Clamped so the node + the gold finial stacked above it both stay on-canvas
    #     (the finial point lands 4px above ny, so keep ny >= 6 -> finial tip at y>=2).
    nx, ny = ax, apex_y - 3
    ny = max(ny, 6)
    c.set(nx, ny, "W")                    # hot core
    c.set(nx - 1, ny, "E"); c.set(nx + 1, ny, "E")
    c.set(nx, ny - 1, "E"); c.set(nx, ny + 1, "e")
    for hx, hy in [(nx - 2, ny), (nx + 2, ny)]:   # faint halo ring (sides only; top stays clear for the finial)
        if 0 <= hx <= 63 and 0 <= hy <= 63:
            c.set(hx, hy, "e")

    # --- energize the t4 SECOND-PLOT BOARD frame in cyan (recompute its rect from the
    #     SAME anchor stage4 used, so the trim lands exactly on the board, not a guess).
    mxf, myf = core.roof_pt(0.62, 0.46)
    mx, my = int(round(mxf)), int(round(myf))
    board_y = my - 9
    bx0, by0 = mx - 3, board_y - 6
    bw, bh = 9, 7
    # a bright e energized rail along the board's lit top + left frame (the deck is live)
    c.line((bx0, by0), (bx0 + bw, by0), "e")
    c.line((bx0, by0), (bx0, by0 + bh), "e")
    c.set(bx0, by0, "E")                  # bright corner node

    # --- GOLD premium trim (t5 flourish only) ---
    # GOLD AXIS-RAILS: short gold caps bracketing the curve's x-axis baseline ends (the
    # axis is now gilded). Sit just outboard of the bright L tick caps the axis already has.
    c.set(ax - half - 3, ay, "q"); c.set(ax - half - 3, ay - 1, "O")   # left rail cap
    c.set(ax + half + 3, ay, "q"); c.set(ax + half + 3, ay - 1, "O")   # right rail cap
    # a thin gold under-rail accent flanking the axis centre (sparse, elite)
    c.set(ax - 2, ay + 1, "q"); c.set(ax + 2, ay + 1, "q")
    # GOLD APEX FINIAL: a tiny gold cap crowning the very top of the curve, above the
    # result node, so the maxed curve reads as gilded at its peak. fy-1 is the topmost
    # pixel — clamp fy >= 2 so the finial point never clips the y=0 canvas edge.
    fy = ny - 2
    fy = max(fy, 2)
    c.set(ax, fy, "q")                    # finial stem cap
    c.set(ax, fy - 1, "O")               # bright finial point
    c.set(ax - 1, fy, "q"); c.set(ax + 1, fy, "q")   # tiny gold cross-bar (a star finial)


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the statistical-analysis-hub at upgrade `stage` (1..5). Stage 1 is
    IDENTICAL to the shipped base; each higher stage keeps every prior addition and
    bolts on the next (t2 significance-marker → t3 server annex → t4 second-plot board
    → t5 confidence-band + gold). Painter's order keeps rooftop/overhead additions on
    top of the masses they grow from, and every addition stays on the roof / shaded
    flank so the hovering bell-curve signature is never occluded."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    contact_shadow(c)               # contact shadow under the whole footprint
    compute_core(c, CORE)           # taller back block: server louvers + status pane
    # the t3 server annex abuts the core's shaded-RIGHT flank and steps DOWN-FRONT, so
    # draw it AFTER the core (occludes the core's lower-right) but BEFORE the front
    # terminal block + the rooftop signature, so nearer masses still overlap it.
    if stage >= 3:
        stage3_annex(c, CORE)
    terminal_block(c, TERM)         # lower front-left setback: glazed terminal room (LEFT hero)
    anchor = roofline(c, CORE)      # holo-emitter plinth + magenta accent strip -> projection anchor
    bell_curve(c, anchor)           # SIGNATURE: holographic bell-curve diagnosis (hovers above roof)

    # --- CUMULATIVE UPGRADE STAGES (rooftop additions, drawn after the base form) ---
    # t2 marker + t4 board mount on the core roof around the floating curve; t5 dresses
    # the curve itself. All reuse the SAME `anchor` so they line up with the signature.
    if stage >= 2:
        stage2_marker(c, CORE, anchor)
    if stage >= 4:
        stage4_scatter(c, CORE, anchor)
    if stage >= 5:
        stage5_deck(c, CORE, anchor)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/mindframe"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "statistical-analysis-hub"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped statistical-analysis-hub.png, so it does NOT overwrite
    the base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": MIND, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"mindframe_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"mindframe_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
