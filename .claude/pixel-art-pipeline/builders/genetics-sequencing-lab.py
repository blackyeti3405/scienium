#!/usr/bin/env python3
"""
Genetics Sequencing Lab — BioCore economy building (BESPOKE iso form).

The most VERTICAL enclosed BioCore building: a NARROW TWO-STORY TOWER with a
clear STEPPED sequencer SETBACK — a tall slim lower Box capped by a smaller
set-back upper stage and a flat tech roof. It reads as a precision sequencing
core, NOT the gateway cube and NOT the Volt 3D-print tower (that one is a single
slender shaft crowned by a glass dome; this one is two stacked green stages with
a setback step, and its signature climbs BESIDE it rather than sitting on top).

Massing:
  • Lower stage  — slim tall Box(top=(30,16), wx=9, wy=8, h=16): green M/D walls,
    crisp D/d panel seams, a vertical column of small c server/indicator lights on
    the plainer lit-LEFT face.
  • Upper stage  — smaller Box(top=(33,7), wx=6, wy=5, h=6) SET BACK on top: a
    clear setback step, a c clerestory slit, a small o instrument vent.
  • Roofline     — flat tech roof on both tiers, a thin D railing lip, a small
    o/r cooling unit, and a roof emitter from which the signature helix rises.

OPENING ON THE RIGHT (shaded face): the hero is a tall narrow K-framed glass
sequencer-bay door — a column of g/c panes that GLOW (bright h/O instrument
light + a hint of a sequencer machine inside) so it reads on the shaded side.
The lit-LEFT face is kept plainer (opaque, indicator-light column only).

Signature (one-of-one): a tall ROTATING DNA DOUBLE-HELIX rising beside the
tower — two intertwined glowing strands (lit-left c/h, far g/G) crossing in an
X-weave, rung by color-coded base-pairs (alternating O/o/c/g = the four bases),
with ONE rung lit bright W/h as the sequencer "reads" it, a faint upward c trace
showing read direction, a soft c glow halo, and a thin o/O power feed from the
roof emitter into the helix base.

Composed entirely from art/isobuild.Box (NO iso.draw_cube / base_windows).
"""
import os
import sys
import json
import math

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
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


def pt(p):
    return (int(round(p[0])), int(round(p[1])))


# ── lower stage: the slim tall main tower ────────────────────────────────────
def lower_stage(c):
    """Slim tall main Box (SMALL footprint + LARGE height => a vertical TOWER,
    not a cube). Green M/D walls, drawn with the toolkit's standard shading.
    wx=7/wy=6 with h=24 gives a clearly slender, tall silhouette."""
    t = Box((32, 22), wx=7, wy=6, h=24)
    t.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    return t


def panel_seams(c, t):
    """Crisp vertical D/d panel seams down both walls (tech-panel motif = the
    BioCore reading of the wood-frame seam), read vertically to stress height."""
    # left (lit) wall: full-height seams with a lit L edge on each
    for u in (0.30, 0.55, 0.80):
        a = t.left_pt(u, 1)
        b = t.left_pt(u, t.h - 1)
        c.line(a, b, "d")
        c.line((a[0] - 1, a[1]), (b[0] - 1, b[1]), "L")
    # two horizontal floor seams split the interior storeys on the lit face
    for fy in (8, 16):
        c.line(t.left_pt(0.04, fy), t.left_pt(0.96, fy), "d")
        c.line(t.left_pt(0.04, fy - 1), t.left_pt(0.96, fy - 1), "L")


def indicator_column(c, t):
    """The plainer lit-LEFT face: only a vertical column of small c server /
    indicator lights running the tower's height (no glazing — opening is RIGHT)."""
    for vv in (3, 5, 7, 11, 13, 19, 21):
        p = pt(t.left_pt(0.18, vv))
        c.set(p[0], p[1], "c")
        c.set(p[0] - 1, p[1], "G")  # dark socket to the left so each light pops
    # a few amber status LEDs down the column = a live instrument
    for vv in (4, 12, 20):
        p = pt(t.left_pt(0.18, vv))
        c.set(p[0] + 1, p[1], "o")


# ── upper stage: the stepped-back sequencer setback ──────────────────────────
def upper_stage(c):
    """A SMALLER Box set back on top of the lower stage — the defining stepped
    setback. Its back-top corner is pulled in from the lower roof so a clear
    setback step (a margin of visible lower roof) shows all around."""
    u = Box((33, 14), wx=4, wy=4, h=7)
    u.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K",
           with_shadow=False)  # sits on the lower roof, no ground shadow
    return u


def setback_detail(c, lo, up):
    """Detail the setback: a thin D railing lip around the visible lower-roof
    margin, a c clerestory slit + o vent on the upper stage's RIGHT (shaded)
    face so the upper storey also faces its instruments to the right."""
    # railing lip tracing the lower roof's front two edges (the visible ledge)
    c.line(lo.r_left, lo.r_front, "D")
    c.line(lo.r_front, lo.r_right, "D")
    c.set(*pt(lo.r_front), "d")
    # clerestory slit (cyan) across the upper RIGHT face
    c.line(up.right_pt(0.20, 2), up.right_pt(0.80, 2), "c")
    c.line(up.right_pt(0.20, 3), up.right_pt(0.80, 3), "G")
    c.set(*pt(up.right_pt(0.20, 2)), "K")
    c.set(*pt(up.right_pt(0.80, 2)), "K")
    # a small o instrument vent on the upper LEFT face
    p = pt(up.left_pt(0.40, 2))
    c.set(p[0], p[1], "o")
    c.set(p[0] + 1, p[1], "O")
    c.set(p[0], p[1] + 1, "r")


# ── OPENING ON THE RIGHT: the glowing sequencer-bay door ─────────────────────
def right_bay(c, t):
    """The hero: a tall narrow K-framed glass sequencer-bay door on the SHADED
    RIGHT face of the LOWER stage. A column of g/c panes that GLOW (bright h/O
    interior instrument light + a hint of a sequencer machine inside) so it
    reads clearly on the shaded side. The right-face u-axis runs
    r_front (0) -> r_right (1)."""
    u0, u1 = 0.18, 0.82
    vt, vb = 4, t.h - 2

    # K frame (full bay)
    c.fill_poly([t.right_pt(u0 - 0.04, vt), t.right_pt(u1 + 0.04, vt),
                 t.right_pt(u1 + 0.04, vb), t.right_pt(u0 - 0.04, vb)], "K")
    # glowing glass field: lit-left of the bay brighter (c), shaded-right (g)
    for vv in range(vt + 1, vb):
        for uu_i in range(0, 11):
            uu = u0 + (u1 - u0) * uu_i / 10.0
            p = pt(t.right_pt(uu, vv))
            c.set(p[0], p[1], "c" if uu_i <= 4 else "g")
    # bright interior instrument light pooling at the top of the bay
    for vv in (vt + 1, vt + 2):
        c.line(t.right_pt(u0, vv), t.right_pt(u1, vv), "h")
    c.set(*pt(t.right_pt(0.34, vt + 2)), "O")  # warm O instrument lamp inside

    # a HINT of the sequencer machine inside: a dark D cabinet with O readouts,
    # standing on the lower half of the bay
    mt, mb = 11, vb - 1
    c.fill_poly([t.right_pt(0.30, mt), t.right_pt(0.66, mt),
                 t.right_pt(0.66, mb), t.right_pt(0.30, mb)], "G")
    c.fill_poly([t.right_pt(0.34, mt + 1), t.right_pt(0.62, mt + 1),
                 t.right_pt(0.62, mb - 1), t.right_pt(0.34, mb - 1)], "d")
    # stacked amber readout rows on the machine face (an instrument running)
    for vv in (mt + 2, mt + 4, mt + 6):
        c.line(t.right_pt(0.38, vv), t.right_pt(0.58, vv), "o")
    c.set(*pt(t.right_pt(0.40, mt + 2)), "O")

    # vertical mullions splitting the bay into a column of tall panes
    for um in (u0 + (u1 - u0) / 3.0, u0 + 2 * (u1 - u0) / 3.0):
        c.line(t.right_pt(um, vt + 1), t.right_pt(um, vb - 1), "K")
    # horizontal pane seams banding the glazing into floors
    for vv in (8, 14, 18):
        c.line(t.right_pt(u0, vv), t.right_pt(u1, vv), "G")
    # bright lit jamb on the front edge so the glowing bay clearly reads as open
    c.line(t.right_pt(u0, vt + 1), t.right_pt(u0, vb - 1), "h")
    # K frame outline edges (crisp)
    for a, b in [(t.right_pt(u0 - 0.04, vt), t.right_pt(u1 + 0.04, vt)),
                 (t.right_pt(u0 - 0.04, vb), t.right_pt(u1 + 0.04, vb)),
                 (t.right_pt(u0 - 0.04, vt), t.right_pt(u0 - 0.04, vb)),
                 (t.right_pt(u1 + 0.04, vt), t.right_pt(u1 + 0.04, vb))]:
        c.line(a, b, "K")
    # warm O loading-sill ticks at the very base of the bay (the door threshold)
    sill_l = pt(t.right_pt(u0, vb))
    sill_r = pt(t.right_pt(u1, vb))
    x = sill_l[0] + 1
    while x < sill_r[0]:
        c.set(x, sill_l[1], "o")
        x += 2


# ── roof emitter + cooling unit (the helix rises from here) ──────────────────
def roof_kit(c, up):
    """A small o/r cooling unit on the upper roof and a roof EMITTER plinth from
    which the signature helix climbs. Returns the emitter top (x,y)."""
    # cooling unit toward the back-left of the upper roof
    cu = pt(up.roof_pt(0.28, 0.66))
    c.fill_poly([(cu[0] - 2, cu[1] - 2), (cu[0] + 1, cu[1] - 2),
                 (cu[0] + 1, cu[1] + 1), (cu[0] - 2, cu[1] + 1)], "r")
    c.line((cu[0] - 2, cu[1] - 2), (cu[0] + 1, cu[1] - 2), "o")   # lit top edge
    c.set(cu[0] - 1, cu[1] - 1, "O")
    c.set(cu[0], cu[1] - 1, "O")

    # emitter plinth at the front-centre of the upper roof (helix foot)
    em = pt(up.roof_pt(0.60, 0.46))
    c.fill_poly([(em[0] - 2, em[1] - 1), (em[0] + 2, em[1] - 1),
                 (em[0] + 2, em[1] + 2), (em[0] - 2, em[1] + 2)], "D")
    c.line((em[0] - 2, em[1] - 1), (em[0] + 2, em[1] - 1), "M")
    c.set(em[0], em[1], "O")          # bright emitter lens
    c.set(em[0], em[1] - 1, "o")
    return (em[0], em[1] - 1)


# ── SIGNATURE: rotating DNA double-helix of glowing base-pairs ───────────────
def dna_helix(c, base_xy, top_y):
    """A tall rotating DNA double-helix rising beside the tower from the roof
    emitter. Two intertwined sine-curve strands cross in an X-weave; short
    color-coded base-pair rungs (O/o/c/g) connect them at each step; ONE rung is
    lit bright W/h (the base being read) with an O blip; a faint c trace shows
    the upward read direction; a soft c/G glow halo hugs the whole helix.

    The helix climbs from `base_xy` (emitter foot, by) up to `top_y`. We sample
    one screen-row per y so the strands are continuous, and place a rung every
    few rows where the two strands are far enough apart to read as a ladder."""
    bx, by = base_xy
    amp = 3.6                      # horizontal swing of each strand (px)
    period = 10.0                  # rows per full turn => a couple of turns
    ys = list(range(top_y, by + 1))

    def sx(y, phase):
        """Screen x of a strand at row y. The two strands use phase 0 and pi so
        they are exactly half a turn apart (an X-weave). Foot anchored at by."""
        ang = (by - y) * (2 * math.pi / period) + phase
        return bx + amp * math.sin(ang)

    bases = ["O", "o", "c", "g"]   # the four color-coded bases (A-T-G-C)
    read_y = top_y + int((by - top_y) * 0.42)   # the rung being READ now

    # --- soft teal glow halo: sparse G one px outboard of each strand ---
    for y in ys:
        for ph in (0.0, math.pi):
            x = int(round(sx(y, ph)))
            for dx in (-1, 1):
                xx = x + dx
                if 0 <= xx < c.w and c.px[y][xx] == "." and y % 2 == 0:
                    c.set(xx, y, "G")

    # --- base-pair rungs (before strands so strand pixels cap their ends) ---
    # one rung every 2 rows where the strands sit 2..5px apart, so each rung is
    # a SHORT discrete bar (not a wide band) and crossings stay clean.
    k = 0
    for y in range(top_y + 1, by - 1):
        xn, xf = sx(y, 0.0), sx(y, math.pi)
        x0, x1 = sorted((xn, xf))
        gap = x1 - x0
        if gap < 2 or gap > 5:     # too close (crossing) or too wide (skip)
            continue
        if (by - y) % 3 != 0:      # space rungs out vertically
            continue
        if abs(y - read_y) <= 1:
            hline(c, x0 + 1, x1 - 1, y, "W")               # READ rung: bright
            c.set(int(round((x0 + x1) / 2)), y, "h")
            c.set(int(round(x1)) + 2, y, "O")              # O read-blip beside
            c.set(int(round(x1)) + 2, y - 1, "o")
        else:
            hline(c, x0 + 1, x1 - 1, y, bases[k % 4])      # color-coded base
            c.set(int(round(x0)), y, "K")                  # K pip at each end
            c.set(int(round(x1)), y, "K")
        k += 1

    # --- the two strands, 1px ribbons, NEAR (lit) drawn last so it wins ---
    for y in ys:
        xf = int(round(sx(y, math.pi)))   # FAR / shaded strand
        c.set(xf, y, "G" if y % 3 == 0 else "g")
        for dx in (0,):                   # keep far strand thin (recedes)
            pass
    for y in ys:
        xn = int(round(sx(y, 0.0)))       # NEAR / lit strand (brighter, on top)
        c.set(xn, y, "c")
        if y % 2 == 0:
            c.set(xn, y, "h")             # bright sparkle on the lit strand

    # --- faint upward c read-trace along the helix axis (decoding direction) ---
    for y in range(top_y + 1, read_y, 2):
        if 0 <= bx < c.w and c.px[y][bx] == ".":
            c.set(bx, y, "c")

    # --- a couple of h sparkles near the freshly-read top ---
    for dx, dy in ((-3, 1), (3, 3), (0, -1)):
        xx, yy = bx + dx, top_y + dy
        if 0 <= xx < c.w and 0 <= yy < c.h and c.px[yy][xx] == ".":
            c.set(xx, yy, "h")

    # --- the o/O power feed from the emitter up into the helix foot ---
    c.set(bx, by, "O")
    c.set(bx, by + 1, "o")
    c.set(bx - 1, by + 1, "r")


def build():
    c = Canvas()
    lo = lower_stage(c)          # back/lower mass first
    panel_seams(c, lo)
    indicator_column(c, lo)      # plainer lit-LEFT face
    right_bay(c, lo)             # the RIGHT-side glowing sequencer bay
    up = upper_stage(c)          # stepped setback on top
    setback_detail(c, lo, up)
    emitter = roof_kit(c, up)    # cooling unit + emitter, returns helix foot
    # helix climbs from the emitter to near the top of the canvas
    dna_helix(c, emitter, top_y=3)
    spec = {"width": 64, "height": 64, "palette": BIO, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/biocore_genetics-sequencing-lab.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
