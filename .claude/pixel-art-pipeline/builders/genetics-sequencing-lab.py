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

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

# Base BioCore palette (shared keys) + a few EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so genetics-sequencing-lab.png is
# unchanged). BioCore's evolved glow is BIO-LUMINESCENT — a living-systems green-teal
# bloom — so a maxed building reads as a glowing sequencing core, not a power plant:
#   b  deep mossy bark-green  — matured structure tone for t3+ new masses/frames
#   e  bioluminescent glow (mid)   E  bioluminescent glow (bright) — the t4/t5 life-glow
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
BIO = {"K": "#1a2417", "W": "#e8f2d8", "L": "#c4dba6", "M": "#9fc07e", "D": "#6f9456", "d": "#4a6e3a",
       "h": "#d2f7ec", "c": "#9fefcf", "g": "#36cc9e", "G": "#1d8f70",
       "o": "#f0b24d", "O": "#ffd488", "r": "#b9701e",
       "b": "#2f4a2a", "e": "#74f0b6", "E": "#ccffe4", "q": "#f3c63a"}

# t4 SAMPLE-PREP SILO geometry — shared by stage4 (draws it) and stage5 (gold cap
# ring on its rim). Defined ONCE so t5 references the SAME source point, never a
# second hardcoded guess. centre x=11, rx=5 -> rim spans x6..16 (fully on-canvas).
SILO_CX, SILO_TOP_Y, SILO_RX, SILO_H = 11, 16, 5, 30


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


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS sequencing /
# consumables / bio-glow structure onto the prior tower — never restarts, never
# recolors the whole building. Theme: the slim sequencing core grows into a fully
# built-out, glowing GENOMICS CORE with its own reagent + sample-prep plant and a
# maxed TWIN-HELIX sequencer. Colours mature stage by stage (matured bark-green `b`,
# bio-luminescent `e/E`); gold (`q`) only as a t5 flourish. Every addition is
# anchored OFF the tower geometry on the LEFT/front, kept clear of the front-centre
# rotating DNA HELIX signature (which swings ~x29..37 above the roof) and of the
# RIGHT-face glowing sequencer bay.
#
#   t2  small functional add   : a 2nd c indicator-light column + an o reagent-cartridge box
#                                on the lit-LEFT lower face; one helix feed dot brightened
#   t3  structural add         : a slim b REAGENT-COOLER annex abutting the tower base (left)
#   t4  major add              : a tall SAMPLE-PREP SILO (cylinder) rising left, opposite the
#                                helix, with a glowing e centrifuge window band
#   t5  crowning feature       : the helix DOUBLES into a TWIN-HELIX braid (bright E read rungs
#                                + travelling O read-head blip) + q GOLD railing caps + finial
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_indicators(c, lo, base_xy):
    """t2 — SMALL FUNCTIONAL ADD: the live core gains capacity. A SECOND vertical column of
    small `c` server-indicator lights runs the lit-LEFT lower face (just right of the existing
    u=0.18 column, at u≈0.42), and a small `o`/`r` REAGENT-CARTRIDGE box is bracketed low on the
    same face — both on-theme (more instruments + consumables), modest, base palette. Also
    brightens ONE helix base-feed dot to `O` so the freshly-powered sequencer reads a touch
    hotter. All on the existing left face / helix foot, so nothing new juts off-canvas."""
    # second indicator column, interleaved in height with the original so the face reads denser
    for vv in (4, 6, 10, 12, 18, 20):
        p = pt(lo.left_pt(0.42, vv))
        c.set(p[0], p[1], "c")
        c.set(p[0] - 1, p[1], "G")            # dark socket so each light pops
    for vv in (5, 13, 19):                     # a couple of amber status LEDs in the new column
        p = pt(lo.left_pt(0.42, vv))
        c.set(p[0] + 1, p[1], "o")
    # small reagent-cartridge box bracketed low on the lit-left face (a stout o/r block in a K
    # frame with a bright O cap label) — sequencer consumables clipped to the wall.
    bxp = pt(lo.left_pt(0.30, 18))
    x0, y0 = bxp[0] - 1, bxp[1]
    c.fill_poly([(x0, y0), (x0 + 3, y0), (x0 + 3, y0 + 3), (x0, y0 + 3)], "r")
    c.fill_poly([(x0, y0), (x0 + 3, y0), (x0 + 3, y0 + 1), (x0, y0 + 1)], "o")  # lit top band
    c.set(x0 + 1, y0, "O")                     # bright cap / fill label
    for a, b in [((x0, y0), (x0 + 3, y0)), ((x0, y0 + 3), (x0 + 3, y0 + 3)),
                 ((x0, y0), (x0, y0 + 3)), ((x0 + 3, y0), (x0 + 3, y0 + 3))]:
        c.line(a, b, "K")
    # brighten one helix base-feed dot (the foot one px above the emitter)
    bx, by = base_xy
    c.set(bx, by - 1, "O")


def stage3_cooler(c, lo):
    """t3 — STRUCTURAL ADD: a slim REAGENT-COOLER annex abutting the LEFT base of the tower —
    a tidy self-contained new mass: a matured bark-green `b` box with a FROSTED `h/c` window
    (cold reagent store) and a `o/r` chiller VENT on its lit face. Seated in the clear ground at
    the tower's front-left vertex (the helix is up top, the bay is on the RIGHT, so this side is
    open). Built directly in screen space as a small iso box (lit-left + shaded-right + flat top)
    so it reads as a real little outbuilding leaning on the tower, and gives the t4 silo a base to
    rise behind. Introduces the matured bark-green tone `b`."""
    # iso box authored from a top diamond near the front-left ground vertex (w_left≈(20,52)).
    # top-left/top/top-right/top-front of a small annex diamond, then walls drop ~7px.
    tL = (12, 47)        # top-left corner of the cooler roof
    tT = (16, 45)        # top (back) corner
    tR = (21, 48)        # top-right corner (meets the tower base)
    tF = (17, 50)        # top-front corner (toward viewer)
    H = 7
    wL = (tL[0], tL[1] + H); wF = (tF[0], tF[1] + H); wR = (tR[0], tR[1] + H)
    # flat top (lit), lit-left wall, shaded-right wall — matured bark-green body
    c.fill_poly([tT, tR, tF, tL], "M")                       # roof slab (lit)
    c.fill_poly([tL, tF, wF, wL], "b")                       # lit-left wall
    c.fill_poly([tF, tR, wR, wF], "d")                       # shaded-right wall (darker)
    # crisp K outline of the box
    for a, b in [(tT, tR), (tR, tF), (tF, tL), (tL, tT),
                 (tL, wL), (tF, wF), (tR, wR), (wL, wF), (wF, wR)]:
        c.line(a, b, "K")
    # FROSTED reagent window on the lit-left wall: an h/c frosted pane in a K frame
    def lf(u, v):  # param the lit-left wall: tL(0)->tF(1) across, +v down
        return (tL[0] + u * (tF[0] - tL[0]), tL[1] + u * (tF[1] - tL[1]) + v)
    p0 = lf(0.25, 2); p1 = lf(0.85, 2); p2 = lf(0.85, 5); p3 = lf(0.25, 5)
    c.fill_poly([p0, p1, p2, p3], "c")                       # cold glass
    c.fill_poly([p0, p1, (p1[0], p1[1] + 1.4), (p0[0], p0[1] + 1.4)], "h")  # frosted top band
    for a, b in [(p0, p1), (p1, p2), (p2, p3), (p3, p0)]:
        c.line(a, b, "K")
    # o/r chiller VENT louver low on the lit-left wall, beside the window
    vx, vy = pt(lf(0.55, 6))
    c.fill_poly([(vx - 1, vy - 1), (vx + 1, vy - 1), (vx + 1, vy + 1), (vx - 1, vy + 1)], "r")
    c.line((vx - 1, vy - 1), (vx + 1, vy - 1), "o")          # warm lit vent lip
    c.set(vx, vy - 1, "O")
    # a faint frost wisp curling off the cooler roof (cold-store puff)
    c.set(tT[0], tT[1] - 1, "c"); c.set(tT[0] + 1, tT[1] - 2, "h")
    return {"tL": tL, "tT": tT, "tR": tR, "tF": tF}


def stage4_silo(c, lo, cooler):
    """t4 — MAJOR ADD: a tall SAMPLE-PREP SILO (iso cylinder) rising OPPOSITE the helix — to the
    LEFT of the tower, climbing well above the lower eave so it reads as a prominent new vertical
    mass ('this core now preps its own samples'). Deep bark-green `b` body with a glowing
    bio-luminescent `e` CENTRIFUGE window band partway up + an `E` bright spin glint, a matured `b`
    base collar tying it to the t3 cooler. Kept fully on-canvas (centre x≈11, rx≈5 → x6..16) and
    well LEFT of the front-centre helix (x29..37) so it never occludes the signature, and rising
    just BEHIND the cooler annex so the cooler stays visible in front of its foot."""
    cx = SILO_CX                             # silo centre x (left of the tower; rim stays x>=6)
    rx = SILO_RX
    top_y = SILO_TOP_Y                       # top ellipse — climbs above the lower eave (y≈28)
    h = SILO_H                               # tall body, foot lands ~y46 behind the cooler
    silo = cylinder(c, cx, top_y, rx, h, top="M", side_l="b", side_r="d", outline="K")
    ry = silo["ry"]
    # a brighter lit seam down the lit (left) side so the cylinder doesn't read flat
    c.line((cx - rx + 1, top_y + 1), (cx - rx + 1, top_y + h - 1), "M")
    # matured b base collar / plinth ring at the foot, tying it to the cooler annex
    for a in range(0, 181, 8):
        x = cx + (rx + 1) * math.cos(math.radians(a))
        y = (top_y + h) + (ry + 1) * math.sin(math.radians(a))
        c.set(x, y, "b")
    # CENTRIFUGE WINDOW BAND: a glowing e band wrapping the silo partway up, in a K frame, with a
    # bright E spin-glint streak (the rotor catching light) — the energized bio-glow of the prep.
    band_y = top_y + 9
    for dy in (0, 1, 2):
        for xx in range(int(cx - rx + 1), int(cx + rx)):
            t = 1 - ((xx - cx) / rx) ** 2
            if t < 0:
                continue
            c.set(xx, band_y + dy, "e" if (xx - cx) < 1 else "G")   # lit-left glow, shaded-right
    c.line((cx - rx + 1, band_y - 1), (cx + rx - 1, band_y - 1), "K")   # top frame
    c.line((cx - rx + 1, band_y + 3), (cx + rx - 1, band_y + 3), "K")   # bottom frame
    c.set(cx - 2, band_y + 1, "E"); c.set(cx - 1, band_y, "E")          # bright spin glint
    c.set(cx, band_y + 1, "E")
    # a small vent/cap detail on the silo top so the crown reads as machinery, not a blank dome
    c.set(cx, top_y - 1, "M"); c.set(cx + 1, top_y - 1, "L")
    c.set(cx - 1, top_y, "o")               # a warm pilot light on the cap
    return silo


def stage5_twinhelix(c, base_xy, top_y, lo, up):
    """t5 — CROWNING FEATURE = FULLY EVOLVED genomics core. The signature HELIX DOUBLES into a
    TWIN-HELIX SEQUENCER BRAID: a second strand-pair rises just LEFT of and interleaved with the
    original helix, its rungs lit bright bio-luminescent `E` (a full read in progress) with a
    single travelling `O` READ-HEAD blip climbing the braid, and the building is dressed with GOLD
    premium trim — `q` railing caps on BOTH roof tiers + a `q`/`O` gold finial on the roof emitter.
    Reads as elite, still recognizably the same sequencing tower, just maxed. All gold (`q`) lives
    ONLY here. The second braid is anchored on the SAME emitter foot (recomputed, not re-guessed)
    so it grows from the building, and is shifted only a few px so it stays on-canvas beside the
    original (x29..37 → twin centre ≈ x30)."""
    bx, by = base_xy
    amp = 3.0                                # slightly tighter swing than the original (3.6)
    period = 10.0
    cx2 = bx - 4                             # twin braid centre, set LEFT so it reads as a 2nd braid
    ys = list(range(top_y + 1, by))

    def sx(y, phase):
        ang = (by - y) * (2 * math.pi / period) + phase
        return cx2 + amp * math.sin(ang)

    # --- soft e glow halo just OUTBOARD (left) of the twin braid only — kept very
    #     sparse (every 3rd row, single side) so the doubled braid reads as a clean
    #     second strand-pair instead of merging with the original helix's own halo
    #     into a noisy cloud at the crowded top. ---
    for y in ys:
        if (by - y) % 3 != 0:
            continue
        x = int(round(sx(y, math.pi))) - 1     # one px LEFT of the far strand
        if 0 <= x < c.w and 0 <= y < c.h and c.px[y][x] == ".":
            c.set(x, y, "e")

    # --- bright E read rungs where the twin strands sit a readable distance apart ---
    read_y = top_y + int((by - top_y) * 0.5)
    for y in range(top_y + 2, by - 1):
        xn, xf = sx(y, 0.0), sx(y, math.pi)
        x0, x1 = sorted((xn, xf))
        gap = x1 - x0
        if gap < 2 or gap > 5:
            continue
        if (by - y) % 3 != 0:
            continue
        hline(c, x0 + 1, x1 - 1, y, "E")                 # bright bio-luminescent read rung
        c.set(int(round(x0)), y, "K"); c.set(int(round(x1)), y, "K")   # K pips cap the ends

    # --- the twin strands themselves (1px ribbons): far strand first, near (lit) last ---
    for y in ys:
        xf = int(round(sx(y, math.pi)))
        if 0 <= xf < c.w:
            c.set(xf, y, "G" if y % 3 == 0 else "g")
    for y in ys:
        xn = int(round(sx(y, 0.0)))
        if 0 <= xn < c.w:
            c.set(xn, y, "e")
            if y % 2 == 0:
                c.set(xn, y, "E")                        # bright sparkle on the lit twin strand

    # --- a single travelling O READ-HEAD blip climbing the braid (at read_y) ---
    rxn, rxf = sx(read_y, 0.0), sx(read_y, math.pi)
    blip_x = int(round((rxn + rxf) / 2))
    c.set(blip_x, read_y, "O")
    c.set(blip_x, read_y - 1, "o")
    c.set(blip_x + 1, read_y, "E")                       # a bright spark trailing the head

    # --- GOLD premium trim (t5 flourish ONLY) — CONTINUOUS lines, not scattered studs.
    #     (Pitfall learned on the greenhouse: single gold pixels read as noise; gold only
    #     registers as premium when it's a continuous rail/ring with a couple of bright O
    #     finial bumps.) Three clean reads: a gold CRESTING RAIL along the lower-roof front
    #     ledge (BOTH tiers), a gold CAP-RING band around the t4 silo rim, and a gold FINIAL
    #     on the roof emitter. ---
    # 1) gold cresting rail tracing the LOWER roof's two visible front edges (over the D
    #    railing lip drawn in setback_detail) — one continuous gold band, a bright O boss
    #    on the front corner. The most legible 'maxed' tell.
    c.line(lo.r_left, lo.r_front, "q")
    c.line(lo.r_front, lo.r_right, "q")
    c.set(*pt(lo.r_front), "O")                          # bright boss at the front crest
    c.set(*pt(lo.r_left), "q"); c.set(*pt(lo.r_right), "q")
    # 2) gold cresting rail along the UPPER roof's two front edges too (both tiers gilded)
    c.line(up.r_left, up.r_front, "q")
    c.line(up.r_front, up.r_right, "q")
    c.set(*pt(up.r_front), "O")
    # 3) gold CAP-RING band wrapping the t4 SAMPLE-PREP SILO rim (recomputed from the SAME
    #    SILO_* source as stage4, never re-guessed) — a continuous gold ellipse on the rim
    #    with a bright O glint, so the prep silo reads premium too.
    ry = max(2.0, SILO_RX * 0.5)
    for a in range(0, 360, 18):
        x = SILO_CX + SILO_RX * math.cos(math.radians(a))
        y = SILO_TOP_Y + ry * math.sin(math.radians(a))
        if 0 <= int(round(x)) < c.w and 0 <= int(round(y)) < c.h:
            c.set(x, y, "q")
    c.set(SILO_CX - SILO_RX + 1, SILO_TOP_Y, "O")        # bright glint on the lit rim
    # 4) a clean gold FINIAL on the roof EMITTER (recomputed from the same upper-roof point as
    #    roof_kit). The emitter foot is the busiest spot (helix base + power feed) — keep this a
    #    crisp pair of gold studs flanking the lens (a gilded plinth) + one bright O cap below,
    #    nothing stabbing up into the strands.
    em = pt(up.roof_pt(0.60, 0.46))
    for dx in (-2, 2):                                   # one clean gold stud either side of the lens
        if 0 <= em[0] + dx < c.w:
            c.set(em[0] + dx, em[1], "q")
    c.set(em[0], em[1] + 1, "O")                         # a single bright gold cap below the lens


HELIX_TOP_Y = 3


def build(stage: int = 1):
    """Compose the genetics sequencing lab at upgrade `stage` (1..5). Stage 1 is IDENTICAL to the
    shipped base; each higher stage keeps every prior addition and bolts on the next (t2 indicators
    → t3 cooler → t4 prep-silo → t5 twin-helix+gold). Painter's order: the base tower, then the
    LEFT-side upgrade masses (cooler, silo) that sit beside/behind the signature, THEN the rotating
    DNA helix (so it always reads on top), and finally the t5 twin-helix braid + gold trim which
    grow from the helix foot / roof tiers and sit in front."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    lo = lower_stage(c)          # back/lower mass first
    panel_seams(c, lo)
    indicator_column(c, lo)      # plainer lit-LEFT face
    right_bay(c, lo)             # the RIGHT-side glowing sequencer bay
    up = upper_stage(c)          # stepped setback on top
    setback_detail(c, lo, up)
    emitter = roof_kit(c, up)    # cooling unit + emitter, returns helix foot

    # --- CUMULATIVE UPGRADE MASSES that sit BESIDE/BEHIND the helix (drawn before it) ---
    if stage >= 2:
        stage2_indicators(c, lo, emitter)
    if stage >= 3:
        stage3_cooler(c, lo)
    if stage >= 4:
        stage4_silo(c, lo, None)

    # --- SIGNATURE: the rotating DNA helix climbs from the emitter (kept on top) --------
    dna_helix(c, emitter, top_y=HELIX_TOP_Y)

    # --- t5 grows FROM the helix foot + roof tiers, so it draws AFTER the base helix ----
    if stage >= 5:
        stage5_twinhelix(c, emitter, HELIX_TOP_Y, lo, up)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/biocore"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "genetics-sequencing-lab"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG + scaled
    preview to the manifest paths. Stage 1 only re-emits the JSON; it must keep matching the
    shipped genetics-sequencing-lab.png, so it does NOT overwrite the base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": BIO, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"biocore_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"biocore_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
