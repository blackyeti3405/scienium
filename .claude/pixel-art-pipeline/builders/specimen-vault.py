#!/usr/bin/env python3
"""
Specimen Vault — BioCore economy building (BESPOKE form, STANDARD).

A SOLID TWO-TIER STACKED ARCHIVE BLOCK — the opposite of the airy Greenhouse: a
heavy, windowless storage vault. A wide opaque lower base carries a narrower
upper tier set BACK on top (a setback stack), reading as a climate-controlled
archive, not a hothouse. Composed entirely from isobuild.Box — NO iso.draw_cube
/ base_windows, and NOT the gateway cube.

  • Lower base: a wide solid Box, opaque M/D walls with thin D/d cabinet seams
    (the set's wood-framing motif), a low K plinth.
  • Upper tier: a narrower solid Box centred + set back on the roof, opaque, with
    a small c clerestory slit on its lit-left for the cold-room glow.
  • Roofline: flat with a D parapet lip + two small o/r climate-vent boxes.
  • OPENING SIDE = RIGHT. The hero is a tall glowing curation wall + door on the
    SHADED RIGHT face of the lower base — a K-framed grid of glass that GLOWS
    (h/c cold-storage light spilling out) so it reads on the dark side. The
    lit-left face stays plainer (one D seam line only).
  • SIGNATURE: a floor-to-ceiling backlit shelf of glowing specimen jars on the
    RIGHT face — a 3×3 grid of c/h glass cylinders, each on an h/c backlight,
    each holding a distinct tiny curated specimen (leaf, coiled frond, amber bug,
    translucent blob...), with a bright h top-light rail and o catalog labels.

Composed from art/isobuild.Box — drawn BACK→FRONT (painter's algorithm).
"""
import os
import sys
import json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

BIO = {"K": "#1a2417", "W": "#e8f2d8", "L": "#c4dba6", "M": "#9fc07e", "D": "#6f9456", "d": "#4a6e3a",
       "h": "#d2f7ec", "c": "#9fefcf", "g": "#36cc9e", "G": "#1d8f70",
       "o": "#f0b24d", "O": "#ffd488", "r": "#b9701e"}


# ── low-level helpers ────────────────────────────────────────────────────────
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


# ── massing geometry ─────────────────────────────────────────────────────────
# Lower base: wide solid block. Upper tier: narrower, centred + set back.
BASE = Box((30, 18), wx=13, wy=11, h=13)
# Upper tier sits ON the base roof, set BACK toward the back-top corner.
UPPER = Box((33, 8), wx=8, wy=7, h=8)


# ── lower base block ─────────────────────────────────────────────────────────
def base_block(c):
    """The wide solid lower vault. Opaque M/D walls, K plinth, D/d cabinet seams
    on the lit-left face (the set's wood-framing motif as cabinet panel lines)."""
    BASE.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # --- low K plinth wrapping the two visible wall feet ---
    for x in range(int(BASE.w_left[0]), int(BASE.w_front[0]) + 1):
        # left wall foot line: interpolate y from w_left -> w_front
        t = (x - BASE.w_left[0]) / (BASE.w_front[0] - BASE.w_left[0])
        y = BASE.w_left[1] + t * (BASE.w_front[1] - BASE.w_left[1])
        c.set(x, y, "d")
        c.set(x, y - 1, "d")
    for x in range(int(BASE.w_front[0]), int(BASE.w_right[0]) + 1):
        t = (x - BASE.w_front[0]) / (BASE.w_right[0] - BASE.w_front[0])
        y = BASE.w_front[1] + t * (BASE.w_right[1] - BASE.w_front[1])
        c.set(x, y, "K")
        c.set(x, y - 1, "d")

    # --- lit-LEFT face: plainer. Opaque M with thin D/d cabinet panel seams. ---
    # two vertical seam lines splitting the face into cabinet bays + one rail.
    for u in (0.34, 0.67):
        c.line(BASE.left_pt(u, 1.0), BASE.left_pt(u, BASE.h - 0.5), "D")
        c.line(BASE.left_pt(u + 0.012, 1.0), BASE.left_pt(u + 0.012, BASE.h - 0.5), "d")
    # a horizontal cabinet rail across the lit face
    c.line(BASE.left_pt(0.06, 5.0), BASE.left_pt(0.94, 5.0), "D")
    c.line(BASE.left_pt(0.06, 5.6), BASE.left_pt(0.94, 5.6), "d")
    # a bright L catch along the top of the lit face (cold light leak from above)
    c.line(BASE.left_pt(0.05, 1.0), BASE.left_pt(0.95, 1.0), "L")


# ── upper setback tier ───────────────────────────────────────────────────────
def upper_tier(c):
    """The narrower upper stack, opaque, with a thin c clerestory slit band on its
    lit-left (cold-room glow) + a D parapet lip + two roof climate-vent boxes."""
    UPPER.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # --- clerestory slit band on the lit-left, near the top: a glowing c strip ---
    cv0, cv1 = 1.6, 2.6
    c.fill_poly([UPPER.left_pt(0.14, cv0), UPPER.left_pt(0.86, cv0),
                 UPPER.left_pt(0.86, cv1), UPPER.left_pt(0.14, cv1)], "c")
    c.line(UPPER.left_pt(0.14, cv0), UPPER.left_pt(0.86, cv0), "h")        # bright top
    c.line(UPPER.left_pt(0.14, cv1), UPPER.left_pt(0.86, cv1), "K")        # K sill
    # thin K mullions in the slit
    for u in (0.32, 0.5, 0.68):
        c.line(UPPER.left_pt(u, cv0), UPPER.left_pt(u, cv1), "K")
    # K head of the slit
    c.line(UPPER.left_pt(0.14, cv0 - 0.5), UPPER.left_pt(0.86, cv0 - 0.5), "K")

    # --- a faint c clerestory wash on the shaded-right of the upper tier too ---
    rv0, rv1 = 1.8, 2.6
    c.fill_poly([UPPER.right_pt(0.16, rv0), UPPER.right_pt(0.84, rv0),
                 UPPER.right_pt(0.84, rv1), UPPER.right_pt(0.16, rv1)], "G")
    c.line(UPPER.right_pt(0.16, rv0), UPPER.right_pt(0.84, rv0), "c")
    c.line(UPPER.right_pt(0.16, rv1), UPPER.right_pt(0.84, rv1), "K")

    # --- D parapet lip around the upper roof's front edges ---
    c.line(UPPER.r_left, UPPER.r_front, "D")
    c.line(UPPER.r_front, UPPER.r_right, "d")
    c.set(UPPER.r_front[0], UPPER.r_front[1], "K")


def roof_vents(c):
    """Two small o/r climate-vent boxes + a D parapet lip on the LOWER roof's
    front rim (visible apron between the two tiers), giving a busy industrial
    archive roofline."""
    # D parapet lip along the lower-base roof front edges (the visible apron)
    c.line(BASE.r_left, BASE.r_front, "D")
    c.line(BASE.r_front, BASE.r_right, "d")

    # two squat climate-vent boxes on the lower roof apron, on the LEFT/front of
    # the apron (away from the busy right curation wall), as small iso louvre
    # boxes so the roofline reads industrial without clutter.
    for (u, v) in [(0.30, 0.30), (0.46, 0.58)]:
        vb = Box(BASE.roof_pt(u, v), wx=2.4, wy=2.0, h=2.2)
        vb.draw(c, roof="o", lwall="o", rwall="r", roof_hi="O", outline="K",
                with_shadow=False)
        # a thin r louvre slit on the lit-left face of the vent
        c.line(vb.left_pt(0.2, 1.0), vb.left_pt(0.8, 1.0), "r")


# ── HERO: glowing curation wall + backlit specimen-jar grid (RIGHT face) ──────
def curation_wall(c):
    """The hero opening on the SHADED RIGHT face of the lower base: a tall K-framed
    glowing curation wall that holds the signature backlit specimen-jar grid. It
    GLOWS (h/c cold-storage light) so it reads on the dark side. Drawn LAST over
    the right face so it dominates the shaded side."""
    b = BASE
    # wall footprint on the right face (inset from the face edges + plinth).
    # Floor-to-ceiling: start just under the roofline, run down to the plinth.
    u0, u1 = 0.09, 0.93
    v0, v1 = 1.2, b.h - 1.4

    # 1) backlight panel — a bright h/c glowing interior the jars sit against.
    c.fill_poly([b.right_pt(u0, v0), b.right_pt(u1, v0),
                 b.right_pt(u1, v1), b.right_pt(u0, v1)], "h")
    # gradient: brighter (h) up top near the light rail, cooler c lower down.
    for k in range(0, 5):
        vv = v0 + 0.6 + k * 1.1
        ch = "h" if k < 2 else "c"
        c.line(b.right_pt(u0 + 0.02, vv), b.right_pt(u1 - 0.02, vv), ch)

    # 2) bright h TOP-LIGHT RAIL just under the head of the wall.
    c.line(b.right_pt(u0, v0 + 0.3), b.right_pt(u1, v0 + 0.3), "W")
    c.line(b.right_pt(u0, v0 + 0.9), b.right_pt(u1, v0 + 0.9), "h")

    # 3) the 3×3 GRID of glowing specimen jars on D shelves, filling the wall.
    cols = [0.17, 0.42, 0.67]          # left edges of the 3 jar columns (u)
    cw = 0.17                          # jar column width in u
    shelf_v = [2.7, 6.0, 9.3]          # top of each of the 3 shelf rows (v)
    sh = 2.6                           # jar body height in v

    # shelf frames (D wood shelves the jars stand on) spanning the wall width
    for sv in shelf_v:
        c.line(b.right_pt(u0, sv + sh + 0.2), b.right_pt(u1, sv + sh + 0.2), "D")
        c.line(b.right_pt(u0, sv + sh + 0.6), b.right_pt(u1, sv + sh + 0.6), "d")
        # thin o catalog-label strip running under each shelf
        c.line(b.right_pt(u0 + 0.02, sv + sh + 0.9), b.right_pt(u1 - 0.02, sv + sh + 0.9), "o")

    # specimen silhouettes: a distinct tiny thing per cell so the grid reads as a
    # collection of DIFFERENT things. (row, col) -> ("char", placement-tag).
    specimens = {
        (0, 0): ("M", "leaf"),     (0, 1): ("g", "frond"),   (0, 2): ("O", "bug"),
        (1, 0): ("c", "blob"),     (1, 1): ("D", "leaf"),    (1, 2): ("g", "frond"),
        (2, 0): ("O", "bug"),      (2, 1): ("c", "blob"),    (2, 2): ("M", "leaf"),
    }

    for ri, sv in enumerate(shelf_v):
        for ci, cu in enumerate(cols):
            ju0, ju1 = cu, cu + cw
            jt, jb = sv, sv + sh
            # --- jar glass body: a c cylinder with an h lit edge ---
            c.fill_poly([b.right_pt(ju0, jt), b.right_pt(ju1, jt),
                         b.right_pt(ju1, jb), b.right_pt(ju0, jb)], "c")
            # rounded shoulder: trim the very top corners to read as a jar
            c.set(*_ipt(b.right_pt(ju0, jt)), "h")
            c.set(*_ipt(b.right_pt(ju1, jt)), "h")
            # h vertical glass highlight streak on the lit (left-u) side of jar
            c.line(b.right_pt(ju0 + 0.012, jt + 0.4), b.right_pt(ju0 + 0.012, jb - 0.3), "h")
            # K rim + lid at the top of the jar
            c.line(b.right_pt(ju0, jt - 0.5), b.right_pt(ju1, jt - 0.5), "K")
            c.set(*_ipt(b.right_pt((ju0 + ju1) / 2, jt - 1.1)), "L")    # tiny lid knob

            # --- the curated specimen inside, a distinct 2-3px silhouette ---
            ch, kind = specimens[(ri, ci)]
            mu = (ju0 + ju1) / 2
            mv = jt + sh * 0.55
            cxp, cyp = _ipt(b.right_pt(mu, mv))
            if kind == "leaf":
                c.set(cxp, cyp - 1, ch); c.set(cxp, cyp, ch); c.set(cxp + 1, cyp, "d")
            elif kind == "frond":
                c.set(cxp, cyp - 1, ch); c.set(cxp - 1, cyp, ch); c.set(cxp, cyp, "G")
                c.set(cxp + 1, cyp - 1, ch)
            elif kind == "bug":   # amber-preserved bug: O core on warm o amber
                c.set(cxp, cyp - 1, "O"); c.set(cxp, cyp, ch); c.set(cxp - 1, cyp, "r")
            elif kind == "blob":  # translucent blob
                c.set(cxp, cyp - 1, ch); c.set(cxp - 1, cyp, ch); c.set(cxp + 1, cyp, ch)
                c.set(cxp, cyp, "h")

            # K jamb between this jar and the next (cabinet divider)
            c.line(b.right_pt(ju1 + 0.02, jt - 0.5), b.right_pt(ju1 + 0.02, jb + 0.2), "K")
        # K jamb on the far-left of the row
        c.line(b.right_pt(cols[0] - 0.02, sv - 0.5), b.right_pt(cols[0] - 0.02, sv + sh + 0.2), "K")

    # 4) a tall K-framed surround for the whole curation wall (the hero frame).
    for a, bpt in [((u0, v0), (u1, v0)), ((u0, v1), (u1, v1)),
                   ((u0, v0), (u0, v1)), ((u1, v0), (u1, v1))]:
        c.line(b.right_pt(*a), b.right_pt(*bpt), "K")

    # 5) a glass DOOR leaf at the right end of the wall (the way in), glowing.
    du0, du1 = 0.78, 0.90
    c.fill_poly([b.right_pt(du0, v0 + 0.6), b.right_pt(du1, v0 + 0.6),
                 b.right_pt(du1, v1 - 0.2), b.right_pt(du0, v1 - 0.2)], "g")
    c.line(b.right_pt(du0 + 0.01, v0 + 1.0), b.right_pt(du0 + 0.01, v1 - 0.6), "h")  # door glass sheen
    for a, bpt in [((du0, v0 + 0.6), (du1, v0 + 0.6)), ((du0, v1 - 0.2), (du1, v1 - 0.2)),
                   ((du0, v0 + 0.6), (du0, v1 - 0.2)), ((du1, v0 + 0.6), (du1, v1 - 0.2))]:
        c.line(b.right_pt(*a), b.right_pt(*bpt), "K")
    # o handle
    c.set(*_ipt(b.right_pt(du0 + 0.015, (v0 + v1) / 2)), "o")

    # 6) a faint c cold-store haze drifting at the base of the wall.
    for hx, hv in ((0.22, v1 + 0.5), (0.40, v1 + 0.7), (0.58, v1 + 0.5), (0.74, v1 + 0.6)):
        px, py = _ipt(b.right_pt(hx, hv))
        if 0 <= px < 64 and 0 <= py < 64 and c.px[py][px] in (".", "D", "d"):
            c.set(px, py, "c")


def _ipt(p):
    return int(round(p[0])), int(round(p[1]))


def build():
    c = Canvas()
    base_block(c)        # wide lower vault (back/under)
    upper_tier(c)        # narrower setback stack on top
    roof_vents(c)        # climate vents + parapet on the lower roof apron
    curation_wall(c)     # HERO glowing curation wall + jar grid on the RIGHT
    spec = {"width": 64, "height": 64, "palette": BIO, "rows": c.rows()}
    out = "/path/to/scienium/art/src/buildings/biocore_specimen-vault.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
