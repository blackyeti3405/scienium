#!/usr/bin/env python3
"""
Crystallography Room — ChemWorks economy building (BESPOKE iso form) + its
4-stage UPGRADE-EVOLUTION sprites.

The most GEOMETRIC building in the set: a FACETED GEM-CUT PRISM PAVILION whose
body is a chamfered blue-grey prism and whose roof is a low CRYSTAL-CUT cap of
tilted glass planes — the whole structure echoes a single grown crystal. Sharp,
jewel-like; distinct from every boxy gateway/hall and from the BioCore towers
(this one has NO flat tech roof and NO helix — it is a cut gem with a faceted
crystal cap and crisp K chamfer seams down each corner).

Massing:
  • Main body — a chamfered Box(top=(31,20), wx=9, wy=9, h=15): blue-grey M/D
    walls with K chamfer seams + lit L bevels down each corner to read as facets.
  • Crystal cap — a SMALLER set-back Box(top=(33,12), wx=5, wy=5, h=3) centred on
    the roof, its top BROKEN into four tilted L/M/D triangular facet planes with
    bright W crystal-edge glints, so the cap reads as a cut gem, not a flat slab.
  • Roofline — the faceted crystal cap + a small o X-ray-source nub; no stack.

OPENING ON THE LEFT (lit face): the hero is a K-framed viewing door + tall slot
window — c/h blue glass with h facet reflections and an o instrument glow, a W
crystal-edge highlight running down the door frame. The shaded RIGHT face is
kept plainer (two dark G slot windows + a D conduit).

Signature (one-of-one): a single large FACETED CRYSTAL floats glinting on a
violet o/O beam above the roof, and a SYMMETRIC GRID of glowing diffraction
spots (its X-ray Laue pattern) fans out around it — brighter at centre, fading
out. 2-3 spots are ringed/lit in O (the ones being indexed) with a thin c
connector to a tiny g index tag = the structure being decoded from the spots.
A soft o->O violet halo backs the whole pattern.

Composed entirely from art/isobuild.Box (NO iso.draw_cube / base_windows).

UPGRADE EVOLUTION (cumulative — the gem-cut crystallography room grows into a
full crystal-growth & diffraction works; the crystal/diffraction theme intensifies;
gold is a t5 flourish only):
  t2  small functional add : extra seed-crystal facets + a c GONIOMETER head on the
                             growth bed (the body roof), with a brightened o
                             nucleation glint under the cap
  t3  structural add       : a low DIFFRACTOMETER ANNEX abutting the shaded RIGHT
                             end — a rotating g-glass sample stage + a detector arm
  t4  major add            : a SECOND crystal-growth DOME (a smaller glass dome on a
                             stepped base) sitting on the left-front ground with an
                             e-glowing supersaturated solution bath
  t5  crowning feature     : the main bed ERUPTS into a glowing macro-crystal CLUSTER
                             of tall E faceted prisms + q gold dome ribs arcing over
                             the body roof and a gold apex finial
"""
import os
import sys
import json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

# Base ChemWorks palette (shared keys) + the EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so crystallography-room.png is
# unchanged). These exact keys+hexes are the lab-wide chemworks evolved accents:
#   b  deepened structure steel — matured tone for t4+ new masses
#   e  energized reagent/solution glow (mid)   E  energized glow (bright) — t4/t5 power
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
CHEM = {"K": "#161a2e", "W": "#e6ecfb", "L": "#c2cdee", "M": "#9aa8d8", "D": "#6f7cb0", "d": "#4b5688",
        "h": "#d6ecff", "c": "#a8d4ff", "g": "#4aa0e6", "G": "#2166b0",
        "o": "#c89cf0", "O": "#e0c2ff", "r": "#6a34a8",
        "b": "#363c5e", "e": "#36e0c8", "E": "#c2fff2", "q": "#f0c64a"}


# ── low-level helpers ────────────────────────────────────────────────────────
def pt(p):
    return (int(round(p[0])), int(round(p[1])))


def hline(c, x0, x1, y, ch):
    if x1 < x0:
        x0, x1 = x1, x0
    for x in range(int(round(x0)), int(round(x1)) + 1):
        c.set(x, y, ch)


def vline(c, x, y0, y1, ch):
    if y1 < y0:
        y0, y1 = y1, y0
    for y in range(int(round(y0)), int(round(y1)) + 1):
        c.set(x, y, ch)


# ── main body: the chamfered gem-cut prism ───────────────────────────────────
def body(c):
    """The pavilion body — a chamfered blue-grey prism. Square-ish footprint but
    NOT cube-tall (h=15 vs the gateway's 20) so it reads as a low jewel block,
    and we facet it with K chamfer seams + lit L bevels down every corner so the
    walls read as cut crystal faces rather than plain slab."""
    b = Box((31, 20), wx=9, wy=9, h=15)
    b.draw(c, roof="M", lwall="M", rwall="D", roof_hi="W", outline="K")
    return b


def chamfer_seams(c, b):
    """K chamfer seams + lit L bevels down each visible corner = the faceting.
    Each true corner becomes a thin 2px chamfer (dark seam + bright bevel) so the
    body reads as a gem cut with angled facets instead of square edges."""
    # front (nearest) vertical corner: dark seam flanked by a lit bevel
    fx, fy0 = pt(b.r_front)
    fy1 = pt(b.w_front)[1]
    vline(c, fx, fy0, fy1, "K")
    vline(c, fx - 1, fy0 + 1, fy1 - 1, "L")   # lit bevel catching light (left)
    vline(c, fx + 1, fy0 + 1, fy1 - 1, "d")   # shaded bevel (right)
    # left corner (r_left down): bright facet edge
    lx, ly0 = pt(b.r_left)
    ly1 = pt(b.w_left)[1]
    vline(c, lx, ly0, ly1, "K")
    vline(c, lx + 1, ly0 + 1, ly1 - 1, "L")
    # right corner (r_right down): dark facet edge
    rx, ry0 = pt(b.r_right)
    ry1 = pt(b.w_right)[1]
    vline(c, rx, ry0, ry1, "K")
    vline(c, rx - 1, ry0 + 1, ry1 - 1, "d")
    # one intermediate facet seam mid-LEFT face + mid-RIGHT face = more cuts
    c.line(b.left_pt(0.5, 1), b.left_pt(0.5, b.h - 1), "d")
    c.line((pt(b.left_pt(0.5, 1))[0] - 1, pt(b.left_pt(0.5, 1))[1] + 1),
           (pt(b.left_pt(0.5, b.h - 1))[0] - 1, pt(b.left_pt(0.5, b.h - 1))[1] - 1), "L")
    c.line(b.right_pt(0.5, 1), b.right_pt(0.5, b.h - 1), "d")
    # ---- facet the body ROOF too: a bright back-left half vs darker front ----
    # split the roof diamond corner-to-corner (r_left -> r_right) so the top reads
    # as two cut planes, and run a W crystal glint along the ridge.
    c.fill_poly([b.r_top, b.r_left, b.r_right], "L")   # back plane: lighter
    c.line(b.r_left, b.r_right, "d")                    # the cut seam
    c.line(b.r_top, b.r_left, "W")
    c.line(b.r_top, b.r_right, "W")
    # two short diagonal facet glints on the front roof half = more cuts
    c.line(b.roof_pt(0.5, 0.5), b.r_front, "L")
    c.line(b.roof_pt(0.5, 0.5), b.r_left, "M")
    c.line(b.roof_pt(0.5, 0.5), b.r_right, "D")


# ── OPENING ON THE LEFT: the glowing viewing door + slot window ──────────────
def left_opening(c, b):
    """The hero opening on the LIT LEFT face: a tall K-framed viewing door with a
    slot window beside it, c/h blue glass with h facet reflections, an o
    instrument glow, and a W crystal-edge highlight running down the door frame.
    The left-face u-axis runs r_left (0) -> r_front (1)."""
    # ---- main viewing door (wide, lower-left of the lit face) ----
    du0, du1 = 0.10, 0.50
    dvt, dvb = 4, b.h - 1
    # K frame
    c.fill_poly([b.left_pt(du0 - 0.05, dvt), b.left_pt(du1 + 0.05, dvt),
                 b.left_pt(du1 + 0.05, dvb), b.left_pt(du0 - 0.05, dvb)], "K")
    # glass field: faceted shading — bright h band top, c body, G shaded base
    for vv in range(dvt + 1, dvb):
        for ui in range(0, 9):
            uu = du0 + (du1 - du0) * ui / 8.0
            p = pt(b.left_pt(uu, vv))
            col = "c"
            if vv <= dvt + 2:
                col = "h"          # bright facet reflection across the top
            elif vv >= dvb - 1:
                col = "G"          # shaded glass at the sill
            c.set(p[0], p[1], col)
    # a clean diagonal h facet glint across the door glass (cut-glass reflection)
    for k in range(0, 8):
        uu = du0 + 0.04 + 0.035 * k
        vv = dvt + 2 + k
        if vv >= dvb - 1 or uu >= du1:
            break
        c.set(*pt(b.left_pt(uu, vv)), "h")
    # o instrument glow pooling inside the door (the X-ray cabinet inside)
    gp = pt(b.left_pt(0.30, dvb - 3))
    c.set(gp[0], gp[1], "o")
    c.set(gp[0] + 1, gp[1], "O")
    c.set(gp[0], gp[1] - 1, "O")
    c.set(gp[0] + 1, gp[1] - 1, "o")
    # vertical mullion splitting the door into two tall panes
    um = (du0 + du1) / 2.0
    c.line(b.left_pt(um, dvt + 1), b.left_pt(um, dvb - 1), "K")
    # W crystal-edge highlight running down the FRONT door jamb
    c.line(b.left_pt(du1 + 0.05, dvt), b.left_pt(du1 + 0.05, dvb), "W")
    # K frame outline (crisp)
    for a, bb in [(b.left_pt(du0 - 0.05, dvt), b.left_pt(du1 + 0.05, dvt)),
                  (b.left_pt(du0 - 0.05, dvb), b.left_pt(du1 + 0.05, dvb)),
                  (b.left_pt(du0 - 0.05, dvt), b.left_pt(du0 - 0.05, dvb))]:
        c.line(a, bb, "K")

    # ---- tall slot window (narrow, upper-left, angled like a crystal face) ----
    su0, su1 = 0.62, 0.78
    svt, svb = 3, b.h - 4
    c.fill_poly([b.left_pt(su0, svt), b.left_pt(su1, svt),
                 b.left_pt(su1, svb), b.left_pt(su0, svb)], "K")
    for vv in range(svt + 1, svb):
        col = "h" if vv <= svt + 2 else ("g" if vv >= svb - 2 else "c")
        c.line(b.left_pt(su0 + 0.02, vv), b.left_pt(su1 - 0.02, vv), col)
    c.line(b.left_pt(su0 + 0.02, svt + 1), b.left_pt(su0 + 0.02, svb - 1), "h")  # lit jamb


# ── shaded RIGHT face: kept plainer ──────────────────────────────────────────
def right_plain(c, b):
    """The shaded RIGHT face stays plainer: two dark G slot windows and a single
    D conduit running down. The right-face u-axis runs r_front (0) -> r_right (1)."""
    # two narrow dark slot windows
    for su0 in (0.22, 0.58):
        su1 = su0 + 0.14
        vt, vb = 4, b.h - 3
        c.fill_poly([b.right_pt(su0, vt), b.right_pt(su1, vt),
                     b.right_pt(su1, vb), b.right_pt(su0, vb)], "K")
        for vv in range(vt + 1, vb):
            c.line(b.right_pt(su0 + 0.02, vv), b.right_pt(su1 - 0.02, vv), "G")
        c.line(b.right_pt(su0 + 0.02, vt + 1), b.right_pt(su1 - 0.02, vt + 1), "g")  # faint top sheen
    # D conduit down the far right of the shaded face
    c.line(b.right_pt(0.86, 2), b.right_pt(0.86, b.h - 1), "D")
    c.line(b.right_pt(0.86, 2), b.right_pt(0.86, b.h - 1), "D")
    cx = pt(b.right_pt(0.86, 2))[0]
    vline(c, cx + 1, pt(b.right_pt(0.86, 2))[1] + 1, pt(b.right_pt(0.86, b.h - 1))[1] - 1, "d")


# ── crystal-cut roof cap: tilted faceted glass planes ────────────────────────
def crystal_cap(c, b):
    """A SMALLER Box set back on the roof whose top is BROKEN into four tilted
    triangular facet planes (L/M/D, lit toward the back-left, dark toward the
    front-right) with bright W crystal-edge glints — a cut-gem cap, not a flat
    slab. Returns the apex point (top of the cap) = the X-ray nub anchor."""
    cap = Box((33, 12), wx=5, wy=5, h=3)
    # short walls of the cap (give it a tiny prism collar under the facets)
    cap.draw(c, roof="M", lwall="M", rwall="D", roof_hi="W", outline="K",
             with_shadow=False)

    # the four roof-diamond corners + a TALL raised central apex => faceted gem cap
    T = pt(cap.r_top)
    R = pt(cap.r_right)
    F = pt(cap.r_front)
    Lf = pt(cap.r_left)
    cap_cx = int(round((Lf[0] + R[0]) / 2))
    cap_cy = int(round((T[1] + F[1]) / 2))
    apex = (cap_cx, cap_cy - 5)        # pointed crystal apex => sharp gem cap

    # four tilted triangular facets meeting at the apex (back-left lit, front-right dark)
    c.fill_poly([T, Lf, apex], "L")   # back-left facet: lightest (catches light)
    c.fill_poly([T, R, apex], "M")    # back-right facet
    c.fill_poly([Lf, F, apex], "M")   # front-left facet
    c.fill_poly([F, R, apex], "D")    # front-right facet: darkest (shaded)

    # bright W crystal-edge glints along the ridge lines up to the apex
    c.line(Lf, apex, "W")
    c.line(T, apex, "W")
    c.line(F, apex, "h")              # front ridge slightly cooler
    # K outline of the cut-gem silhouette
    for a, bb in [(T, Lf), (Lf, F), (F, R), (R, T),
                  (Lf, apex), (R, apex), (F, apex)]:
        c.line(a, bb, "K")
    c.set(apex[0], apex[1], "W")      # bright crystal tip

    # small o X-ray-source nub just above the apex (the beam origin)
    nub = (apex[0], apex[1] - 2)
    c.set(nub[0], nub[1], "o")
    c.set(nub[0], nub[1] + 1, "O")
    return nub


# ── SIGNATURE: floating faceted crystal + X-ray diffraction spot pattern ─────
def floating_crystal(c, nub):
    """The one-of-one hero. A single large FACETED CRYSTAL floats on a violet
    o/O beam above the roof nub; a SYMMETRIC square grid of glowing diffraction
    spots (a Laue pattern) fans out around it, brighter at centre and fading
    out; 2-3 spots are ringed/lit in O (being indexed) with a thin c connector to
    a tiny g index tag; a soft o->O violet halo backs the whole thing."""
    nx, ny = nub
    # ---- crystal centre, hovering clear ABOVE the cap apex/nub ----
    # ny is the nub y (top of the cap). Float the crystal a few rows higher so a
    # clear beam GAP separates the roof cap from the floating gem.
    cxp, cyp = nx, ny - 4

    # ---- thin violet beam from the roof nub up into the crystal foot ----
    for y in range(cyp + 3, ny + 1):
        c.set(nx, y, "o" if (y % 2 == 0) else "O")

    # ---- soft o->O violet halo behind the whole pattern (drawn first) ----
    for dy in range(-9, 10):
        for dx in range(-11, 12):
            x, y = cxp + dx, cyp + dy
            if not (0 <= x < c.w and 0 <= y < c.h):
                continue
            if c.px[y][x] != ".":
                continue
            d2 = (dx * dx) / 1.8 + dy * dy
            if d2 <= 30 and (dx + dy) % 3 == 0:
                c.set(x, y, "r")           # faint outer violet glow
            if d2 <= 12 and (dx + dy) % 2 == 0:
                c.set(x, y, "o")           # inner brighter glow

    # ---- symmetric Laue diffraction-spot grid around the crystal ----
    # a square lattice of spots stepped out from centre; brightness fades with
    # radius; the four innermost cardinal spots stay brightest (h/O), outer ones
    # dim to c/g/r so it clearly reads as a centred, fading diffraction array.
    stepx, stepy = 4, 3
    indexed = {(1, 0), (0, -1), (1, 1)}   # the 2-3 spots being indexed (O-ringed)
    for gy in range(-2, 3):
        for gx in range(-2, 3):
            if gx == 0 and gy == 0:
                continue                   # centre is the crystal itself
            x = cxp + gx * stepx
            y = cyp + gy * stepy           # squashed => iso-ish lattice
            if not (0 <= x < c.w and 0 <= y < c.h):
                continue
            ring = max(abs(gx), abs(gy))
            if (gx, gy) in indexed:
                # indexed spot: bright O core ringed by o pips = being indexed
                c.set(x, y, "O")
                for rx, ry in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    xx, yy = x + rx, y + ry
                    if 0 <= xx < c.w and 0 <= yy < c.h and c.px[yy][xx] in (".", "r"):
                        c.set(xx, yy, "o")
            elif ring == 1:
                c.set(x, y, "h")           # inner ring: bright blue spots
            elif ring == 2:
                c.set(x, y, "c" if (gx + gy) % 2 == 0 else "g")  # outer: dimmer

    # ---- thin c connector from an indexed spot to a tiny g index tag ----
    ix, iy = cxp + 1 * stepx, cyp + 1 * stepy       # the (1,1) indexed spot
    tagx, tagy = ix + 4, iy + 4
    c.line((ix + 1, iy + 1), (tagx, tagy), "c")
    # the index tag: a tiny g chip with a W tick (the assigned Miller index)
    c.fill_poly([(tagx, tagy), (tagx + 3, tagy), (tagx + 3, tagy + 2), (tagx, tagy + 2)], "g")
    c.set(tagx, tagy, "G")
    c.set(tagx + 1, tagy + 1, "W")

    # ---- the faceted crystal itself, drawn LAST so it sits on top ----
    # a multi-plane gem: bright h/c lit-left facets, G shadow facets, W highlight
    # edges. Diamond ~8px tall, ~8px wide. First carve a clean K ring around it so
    # the busy spot/glow field does not bleed onto the gem and it reads crisply.
    top = (cxp, cyp - 4)
    left = (cxp - 4, cyp - 1)
    right = (cxp + 4, cyp - 1)
    bot = (cxp, cyp + 4)
    midL = (cxp - 1, cyp)
    midR = (cxp + 1, cyp)
    # K separation ring: clear a 1px dark border just outside the gem silhouette
    c.fill_poly([(top[0], top[1] - 1), (left[0] - 1, left[1]),
                 (bot[0], bot[1] + 1), (right[0] + 1, right[1])], "K")
    # facet fills (inside the K ring)
    c.fill_poly([top, left, midL, midR], "c")    # upper-left bright facet
    c.fill_poly([top, midR, right], "h")         # upper-right brightest facet
    c.fill_poly([left, midL, bot], "G")          # lower-left shadow facet
    c.fill_poly([midR, right, bot], "g")         # lower-right facet
    c.fill_poly([midL, midR, bot], "G")          # centre lower shadow
    # W crystal-edge highlights on the lit edges
    c.line(top, left, "W")
    c.line(top, right, "W")
    c.line(top, (cxp, cyp), "h")                 # central facet ridge
    c.line(left, midL, "c")                      # waistline glints
    c.line(right, midR, "h")
    # K outline of the gem silhouette
    for a, bb in [(top, left), (left, bot), (bot, right), (right, top)]:
        c.line(a, bb, "K")
    # h sparkles on the facets
    c.set(cxp + 1, cyp - 2, "h")
    c.set(cxp - 1, cyp + 1, "h")
    c.set(cxp + 2, cyp, "W")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS crystal-growth /
# diffraction structure onto the prior gem-cut form — never restarts, never recolors
# the whole building. Theme: the gem-cut crystallography room grows into a full
# crystal-growth & X-ray diffraction works. Colours mature stage by stage; the
# energized solution glow (e/E teal) arrives at t4; gold (q) only as a t5 flourish.
#
# Every addition is anchored to the BODY and kept clear of the front-most signature
# (the floating crystal + Laue pattern hovering above the roof cap), which is drawn
# LAST so no upgrade paints over it.
#
#   t2  small functional add : seed-crystal facets + a c goniometer head on the bed
#   t3  structural add        : a low DIFFRACTOMETER ANNEX off the shaded right end
#   t4  major add             : a SECOND crystal-growth DOME on the left-front ground
#   t5  crowning feature      : a glowing macro-crystal CLUSTER + gold dome ribs
# ═══════════════════════════════════════════════════════════════════════════════

# Front-roof "growth bed" anchor (px). Both the t2 seed crystals/goniometer and the
# t5 macro-crystal cluster erupt from this SAME bed point on the body roof's open
# FRONT-LEFT quadrant — forward of and BELOW the back-centre cap, so the cluster
# rises in front of the cap (never beside/through it) and stays clear of the
# overhead floating-crystal signature.
def _bed_anchor(b):
    return pt(b.roof_pt(0.5, 0.24))


def stage2_goniometer(c, b):
    """t2 — SMALL FUNCTIONAL ADD: the growth BED on the body roof's front half gains
    a couple of extra SEED-CRYSTAL facets and a small c GONIOMETER head (the goniometer
    being the instrument that orients a crystal in the X-ray beam), plus a brightened
    o NUCLEATION glint. On-theme (more crystal growth), modest, base palette + the one
    brightened o spark. Seated on the open FRONT roof half so it never touches the
    back-centre cap or the floating-crystal signature overhead."""
    bx, by = _bed_anchor(b)
    # ---- a clear dark bed PLINTH the seeds + goniometer sit on. Drawn with a K front
    #      lip + D top so the additions separate cleanly from the light lavender roof
    #      (low-contrast was the failure mode — the seeds blended into the roof). ----
    for dx in range(-5, 5):
        c.set(bx + dx, by + 1, "K")                  # K front lip (the grounding shadow)
    for dx in range(-5, 5):
        c.set(bx + dx, by, "D")                      # D plinth top
    c.set(bx - 5, by, "K"); c.set(bx + 4, by, "K")   # K end caps

    # ---- two SEED-CRYSTAL prisms growing on the LEFT of the bed: each FULLY K-outlined
    #      so it reads as a discrete little gem against the roof, with a lit-left c/h
    #      face, a G shaded face, and a bright W tip (mini versions of the t5 cluster). ----
    def seed(x0, hgt):
        topY = by - 1 - hgt
        # K silhouette: outline both sides + the tip
        for yy in range(topY, by):
            c.set(x0 - 1, yy, "K")                    # left K edge
            c.set(x0 + 1, yy, "K")                    # right K edge
        c.set(x0, topY - 1, "K")                      # K tip cap above the bright tip
        # lit core column: brightens base->tip
        ramp = ["c", "c", "h", "h", "W"]
        for j in range(hgt):
            c.set(x0, by - 1 - j, ramp[min(j, len(ramp) - 1)])
        c.set(x0, topY, "W")                          # bright faceted tip
    seed(bx - 4, 4)                                   # seed A (taller, 4px)
    seed(bx - 1, 3)                                   # seed B (shorter, 3px)

    # ---- the GONIOMETER on the RIGHT of the bed: a clearly taller K-edged steel post
    #      topped by a bright c goniometer-head RING (the cradle that orients a crystal
    #      in the X-ray beam) holding a tiny mounted seed. ----
    gx = bx + 3
    for yy in range(by - 3, by):                      # taller steel post, K-edged
        c.set(gx, yy, "D")
        c.set(gx - 1, yy, "K")
    c.set(gx + 1, by - 1, "K")
    head_y = by - 4
    # a closed c ring head (reads as the goniometer cradle), K-ringed so it pops
    c.set(gx, head_y, "M")                            # hub
    c.set(gx - 1, head_y, "c"); c.set(gx + 1, head_y, "c")
    c.set(gx, head_y - 1, "h"); c.set(gx, head_y + 1, "g")
    c.set(gx - 2, head_y, "K"); c.set(gx + 2, head_y, "K")
    c.set(gx, head_y - 2, "K")
    c.set(gx, head_y - 1, "h")
    # the tiny mounted crystal seed held in the cradle (bright)
    c.set(gx, head_y - 3, "W"); c.set(gx, head_y - 4, "h")

    # ---- a single brightened o->O NUCLEATION glint rising between the seeds (t2 spark) ----
    c.set(bx - 3, by - 3, "o")
    c.set(bx - 3, by - 4, "O")


def stage3_diffractometer_annex(c, b):
    """t3 — STRUCTURAL ADD: a low DIFFRACTOMETER ANNEX — a secondary box bolted onto
    the shaded RIGHT END of the body, housing a rotating g-glass SAMPLE STAGE in a
    round port with a swinging DETECTOR ARM that reads the diffracted beam. A real new
    structural mass (its own little prism + roof), extending the building OUT to the
    right while staying lower than the gem body. Introduces the matured deep-steel
    tone `b`. (Mirrors the fume-hood storage-annex placement but is uniquely a
    diffractometer: a sample-stage port + a detector arm, not a reagent closet.)"""
    # seat a small prism abutting the body's RIGHT corner, growing toward the right.
    ax, ay = pt(b.right_pt(0.5, 2.0))                 # midway down the shaded face
    annex = Box(top=(ax + 2, ay + 1), wx=5, wy=4, h=8)
    annex.shadow(c, "K")
    c.fill_poly([annex.r_top, annex.r_right, annex.r_front, annex.r_left], "D")
    c.fill_poly([annex.r_left, annex.r_front, annex.w_front, annex.w_left], "D")
    c.fill_poly([annex.r_front, annex.r_right, annex.w_right, annex.w_front], "b")
    c.fill_poly([annex.r_top, annex.r_left, annex.r_front], "M")   # lit roof triangle
    c.line(annex.r_top, annex.r_left, "L")
    c.line(annex.r_top, annex.r_right, "L")
    for a, bb in [(annex.r_top, annex.r_right), (annex.r_right, annex.r_front),
                  (annex.r_front, annex.r_left), (annex.r_left, annex.r_top),
                  (annex.r_left, annex.w_left), (annex.r_front, annex.w_front),
                  (annex.r_right, annex.w_right),
                  (annex.w_left, annex.w_front), (annex.w_front, annex.w_right)]:
        c.line(a, bb, "K")

    # ---- a round rotating SAMPLE-STAGE port (g glass) on the annex lit-left face ----
    px, py = pt(annex.left_pt(0.42, 3.6))
    for dx, dy in [(0, -1), (-1, 0), (0, 0), (1, 0), (0, 1),
                   (-1, -1), (1, -1), (-1, 1), (1, 1)]:
        c.set(px + dx, py + dy, "g")
    c.set(px, py, "c")                                # lit centre of the glass port
    c.set(px - 1, py - 1, "h")                        # glass glint
    # K ring around the round port
    for dx, dy in [(0, -2), (-2, 0), (2, 0), (0, 2), (-2, -1), (2, -1),
                   (-2, 1), (2, 1), (-1, -2), (1, -2), (-1, 2), (1, 2)]:
        c.set(px + dx, py + dy, "K")
    # a tiny mounted crystal pip at the stage centre + its rotation tick marks
    c.set(px, py - 1, "h")

    # ---- the swinging DETECTOR ARM: a goniometer arm reaching off the stage up-right
    #      to a small flat detector head reading the diffracted beam ----
    armx0, army0 = px + 2, py - 1
    dhx, dhy = px + 6, py - 4                         # detector head up-right (on-canvas)
    dhx = min(dhx, 61)
    c.line((armx0, army0), (dhx, dhy), "M")           # the arm
    c.set(armx0, army0, "D")                          # arm pivot on the stage
    # the flat detector head (a small D panel with a g sensing face)
    c.set(dhx, dhy, "g"); c.set(dhx, dhy - 1, "c")
    c.set(dhx + 1, dhy, "b"); c.set(dhx + 1, dhy - 1, "b")
    c.set(dhx, dhy + 1, "K"); c.set(dhx + 1, dhy + 1, "K")
    c.set(dhx + 2, dhy, "K"); c.set(dhx + 2, dhy - 1, "K")
    # a faint o diffracted-beam pip leaving the stage toward the detector
    c.set(px + 4, py - 3, "o")


def stage4_second_dome(c, b):
    """t4 — MAJOR ADD: a SECOND crystal-growth DOME — a smaller glass dome on a stepped
    steel base — set on the OPEN GROUND off the body's LEFT-FRONT corner, housing an
    e-glowing SUPERSATURATED SOLUTION bath with a tiny seed crystal growing in it. The
    prominent new mass that says 'this room now runs a second growth line'. Palette
    matures: deep `b` stepped base + energized `e/E` solution glow. Placed low and
    forward-left so it clears the gem body and the floating-crystal signature."""
    # ---- stepped steel BASE on the ground off the body's front-left, drawn as a
    #      small low prism so the dome reads as seated on a real plinth ----
    base = Box(top=(11, 41), wx=4, wy=4, h=5)
    base.shadow(c, "K")
    c.fill_poly([base.r_top, base.r_right, base.r_front, base.r_left], "D")
    c.fill_poly([base.r_left, base.r_front, base.w_front, base.w_left], "b")
    c.fill_poly([base.r_front, base.r_right, base.w_right, base.w_front], "b")
    c.fill_poly([base.r_top, base.r_left, base.r_front], "M")     # lit step top
    for a, bb in [(base.r_top, base.r_right), (base.r_right, base.r_front),
                  (base.r_front, base.r_left), (base.r_left, base.r_top),
                  (base.r_left, base.w_left), (base.r_front, base.w_front),
                  (base.r_right, base.w_right),
                  (base.w_left, base.w_front), (base.w_front, base.w_right)]:
        c.line(a, bb, "K")
    # a lit step ledge band around the base top (the 'stepped' read)
    c.line(base.r_left, base.r_front, "L")

    # ---- the e-glowing SUPERSATURATED SOLUTION bath sitting in the base top ----
    bcx, bcy = pt(base.roof_pt(0.5, 0.5))
    for dx in range(-2, 3):
        c.set(bcx + dx, bcy, "e")
    c.set(bcx - 2, bcy, "G"); c.set(bcx + 2, bcy, "G")           # bath rim shade
    c.set(bcx, bcy, "E"); c.set(bcx - 1, bcy, "E")               # bright solution core
    c.set(bcx, bcy - 1, "E")                                     # a tiny seed in the bath

    # ---- the glass DOME over the bath: a 2:1 iso half-ellipse shell of c/g glass ----
    import math
    dome_cx = bcx
    dome_base_y = bcy - 1                                        # dome springs from the bath rim
    rx, ry = 5, 4
    # filled glass shell (upper hemisphere only), lit-left brighter
    for yy in range(-ry, 1):
        t = 1 - (yy / ry) ** 2
        if t < 0:
            continue
        half = rx * (t ** 0.5)
        for xx in range(int(-half), int(half) + 1):
            gx, gy = dome_cx + xx, dome_base_y + yy
            if gy < 0:
                continue
            # bright top-left glass, c body, G shaded right — and let the e bath glow show
            if yy <= -ry + 1:
                col = "h"
            elif xx < -1:
                col = "c"
            elif xx > 1:
                col = "G"
            else:
                col = "g"
            c.set(gx, gy, col)
    # K rim arc over the dome + a bright W crown glint
    for a in range(0, 181, 12):
        x = dome_cx + (rx + 1) * math.cos(math.radians(a))
        y = dome_base_y - (ry + 1) * math.sin(math.radians(a))
        if y >= 0:
            c.set(x, y, "K")
    c.set(dome_cx, dome_base_y - ry, "W")                        # dome crown highlight
    c.set(dome_cx - 2, dome_base_y - ry + 1, "h")               # left-shoulder glint
    # a small K base ring closing the dome onto the bath
    c.line((dome_cx - rx, dome_base_y), (dome_cx + rx, dome_base_y), "K")
    # a thin e vapor/solution wisp curling off the dome crown (the active-growth tell)
    c.set(dome_cx + 1, dome_base_y - ry - 2, "e")
    c.set(dome_cx, dome_base_y - ry - 3, "E")


def stage5_macro_cluster(c, b):
    """t5 — CROWNING FEATURE = FULLY EVOLVED crystallography works. The main growth BED
    (the SAME front-roof anchor the t2 seeds grew on) ERUPTS into a glowing MACRO-CRYSTAL
    CLUSTER — a fan of tall E/c faceted PRISMS refracting light — and the gem body's front
    facets are dressed out with a GOLD eave RIBBON. (The gold CAP facet-ribs + apex FINIAL
    are added separately by stage5_cap_gold, drawn AFTER the cap so the cap's own ridge
    lines don't paint over them.) Reads as elite, still recognizably the same gem-cut
    room, just maxed out.

    Re-anchors the cluster from the SAME _bed_anchor(b) the t2 seeds used (don't hardcode
    a 2nd guess), so the macro crystals grow exactly where the seeds were. Kept on the
    open front roof half + clamped so the tallest prism tip stays below the floating-
    crystal signature (which hovers above the back-centre cap)."""
    bx, by = _bed_anchor(b)

    # ---- the glowing MACRO-CRYSTAL CLUSTER: a fan of tall faceted prisms erupting from
    #      the bed (the t5 hero). Each prism is a thin 2px tapered column with a bright
    #      lit-left edge, a darker right facet, and a bright E/W tip glint; heights/leans
    #      fan them like a natural crystal cluster. Heights are clamped MODEST so the
    #      tallest tip stays BELOW the back-centre cap (cap front corner ~y=22) and well
    #      clear of the floating-crystal signature overhead. (lean, height, base-x offset)
    prisms = [(-1, 8, -3),     # tall left-leaning prism
              (0, 9, 0),       # tallest central prism (tip ~ y = by-9 ≈ 22, just clear)
              (1, 7, 3),       # tall right-leaning prism
              (-1, 5, -5),     # short outer-left
              (1, 6, 5)]       # short outer-right
    # draw shortest-first so taller central prisms occlude the outer ones correctly
    for lean, hgt, off in sorted(prisms, key=lambda p: p[1]):
        baseX = bx + off
        tipX = baseX + lean
        tipY = max(2, by - hgt)
        for s in range(hgt + 1):
            t = s / hgt
            x = int(round(baseX + t * (tipX - baseX)))
            y = int(round(by - t * hgt))
            wide = t < 0.6                            # taper: 2px base -> 1px tip
            c.set(x - 1, y, "c" if t < 0.5 else "h")  # lit-left facet edge, brighter up top
            c.set(x, y, "e")                          # glowing crystal core
            if wide:
                c.set(x + 1, y, "G")                  # shaded-right facet
        # bright faceted TIP glint
        c.set(tipX, tipY, "E")
        c.set(tipX, tipY - 1, "W")
        c.set(tipX - 1, tipY, "h")
        c.set(baseX, by + 1, "K")                     # K base notch grounding the prism

    # a soft e->E nucleation glow pooled at the cluster base (the supersaturated bed)
    for dx in (-3, -2, -1, 0, 1, 2, 3):
        c.set(bx + dx, by, "e")
    c.set(bx, by, "E"); c.set(bx - 1, by, "E")

    # ---- GOLD eave RIBBON along the two FRONT roof edges of the body (t5 flourish):
    #      the maxed-out premium trim outlining the gem's front facets. This sits on the
    #      body roof (drawn before the cap) so it is safe here; the cap-ridge gold +
    #      finial are applied AFTER the cap is drawn (see stage5_cap_gold). ----
    c.line(b.r_left, b.r_front, "q")
    c.line(b.r_front, b.r_right, "q")
    fr = pt(b.r_front)
    c.set(fr[0], fr[1] - 1, "O")                      # bright gold boss at the front corner
    fl = pt(b.r_left); frr = pt(b.r_right)
    c.set(fl[0] + 1, fl[1], "O"); c.set(frr[0] - 1, frr[1], "O")  # gold corner bosses


def stage5_cap_gold(c, b):
    """t5 GOLD trim that must land ON the crystal CAP — so it is drawn AFTER crystal_cap
    in build() (otherwise the cap's own W/K ridge lines paint over it, which is the
    volt-lab 'gold vanished' pitfall). Adds premium GOLD facet-ridge ribs along the
    cap's three FRONT ridges + a GOLD apex FINIAL crowning the cap. Re-derives the cap
    + apex EXACTLY as crystal_cap does (same Box, same apex formula) so the gold lands
    precisely on the cap, not a 2nd guess. Drawn just BEFORE floating_crystal so the
    signature gem/beam still sit on top where they overlap the apex."""
    cap = Box((33, 12), wx=5, wy=5, h=3)
    T = pt(cap.r_top); R = pt(cap.r_right); F = pt(cap.r_front); Lf = pt(cap.r_left)
    cap_cx = int(round((Lf[0] + R[0]) / 2))
    cap_cy = int(round((T[1] + F[1]) / 2))
    apex = (cap_cx, cap_cy - 5)
    # gold ribs running the three FRONT cap ridges from the apex down to the corners
    c.line(apex, Lf, "q")     # apex -> back-left corner ridge
    c.line(apex, F, "q")      # apex -> front corner ridge
    c.line(apex, R, "q")      # apex -> back-right corner ridge
    # a gold finial spike crowning the apex (a short stack + a bright gold tip)
    c.set(apex[0] - 1, apex[1], "q")
    c.set(apex[0] + 1, apex[1], "q")
    c.set(apex[0], apex[1], "q")
    c.set(apex[0], apex[1] - 1, "O")                  # bright gold finial tip


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the crystallography-room at upgrade `stage` (1..5). Stage 1 is IDENTICAL
    to the shipped base; each higher stage keeps every prior addition and bolts on the
    next (t2 goniometer/seeds → t3 diffractometer-annex → t4 second-growth-dome → t5
    macro-crystal cluster + gold). Painter's order keeps rooftop/overhead additions on
    top of the masses they grow from, and the floating-crystal SIGNATURE is drawn LAST
    so no upgrade ever paints over it (the gem must stay the front-most hero)."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    b = body(c)                  # the chamfered gem body (back/lower mass first)
    chamfer_seams(c, b)          # K facet seams down each corner
    left_opening(c, b)           # OPENING ON THE LEFT — viewing door + slot window
    right_plain(c, b)            # plainer shaded RIGHT face

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    # The diffractometer annex (t3) extends right; the second dome (t4) sits on the
    # left-front ground; the t2 goniometer + t5 cluster grow on the body-roof bed. Draw
    # these BEFORE the cap + floating crystal so the signature stays the front-most hero.
    if stage >= 2:
        stage2_goniometer(c, b)
    if stage >= 3:
        stage3_diffractometer_annex(c, b)
    if stage >= 4:
        stage4_second_dome(c, b)
    if stage >= 5:
        stage5_macro_cluster(c, b)

    # the faceted crystal-cut roof cap + the floating-crystal signature are ALWAYS the
    # front-most hero (drawn last) so no upgrade addition occludes them.
    nub = crystal_cap(c, b)      # faceted crystal-cut roof cap, returns X-ray nub
    if stage >= 5:
        stage5_cap_gold(c, b)    # t5 gold cap-ridge ribs + finial — drawn ON the cap
    floating_crystal(c, nub)     # SIGNATURE: floating crystal + diffraction spots
    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/chemworks"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "crystallography-room"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped crystallography-room.png, so it does NOT overwrite the
    base PNG."""
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
