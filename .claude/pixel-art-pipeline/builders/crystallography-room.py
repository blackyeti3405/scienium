#!/usr/bin/env python3
"""
Crystallography Room — ChemWorks economy building (BESPOKE iso form).

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
"""
import os
import sys
import json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

CHEM = {"K": "#161a2e", "W": "#e6ecfb", "L": "#c2cdee", "M": "#9aa8d8", "D": "#6f7cb0", "d": "#4b5688",
        "h": "#d6ecff", "c": "#a8d4ff", "g": "#4aa0e6", "G": "#2166b0",
        "o": "#c89cf0", "O": "#e0c2ff", "r": "#6a34a8"}


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


def build():
    c = Canvas()
    b = body(c)                  # the chamfered gem body (back/lower mass first)
    chamfer_seams(c, b)          # K facet seams down each corner
    left_opening(c, b)           # OPENING ON THE LEFT — viewing door + slot window
    right_plain(c, b)            # plainer shaded RIGHT face
    nub = crystal_cap(c, b)      # faceted crystal-cut roof cap, returns X-ray nub
    floating_crystal(c, nub)     # SIGNATURE: floating crystal + diffraction spots
    spec = {"width": 64, "height": 64, "palette": CHEM, "rows": c.rows()}
    out = "/path/to/scienium/art/src/buildings/chemworks_crystallography-room.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
