#!/usr/bin/env python3
"""
Behavioral Observation Room — BioCore economy building (BESPOKE FORM, standard).

NOT the gateway cube and NOT a re-skin of a sibling. It is a WIDE LOW VIVARIUM
HALL whose entire LIT-LEFT face is one big glass observation window, capped by a
gentle HALF-HIPPED SINGLE-SLOPE ROOF that tilts down toward the front-left eave.
Distinct from every BioCore sibling: Greenhouse is a steep twin-pitch gable, Wet
Lab a clerestory, Field Station a lean-to — this is a clean wide single hip over
a low broad box. Reads as a naturalistic enclosure watched through one-way glass.

  * MAIN HALL: a WIDE LOW Box (wx=14, wy=10, h=10) — M/D walls on a D/d wood-frame
    base band, the lit-left face given over almost entirely to one tall observation
    window. Low and broad, the opposite of the tall square gateway cube.
  * HALF-HIPPED ROOF (silhouette signature): the flat roof diamond is replaced by a
    single L/M/D plane that slopes DOWN toward the front-left eave from a low D ridge
    set back along the long axis, with a small hip triangle folding the back-right
    corner. Soft and naturalistic. A small o heat-lamp box + a c camera pod sit on
    the slope, both aimed down into the enclosure.
  * OPENING SIDE = LEFT. The hero is the floor-to-roof VIVARIUM OBSERVATION WINDOW on
    the LIT LEFT face — a big K-framed grid of c/g/h glass with bright h reflections,
    a centered K-framed glass observer door, a soft o interior glow. The RIGHT face is
    plainer: opaque M/D with one small c vent.

Signature (one-of-one): behind the glass sits a tiny naturalistic HABITAT — a D/d
branch perch, M/g foliage tuft, an r/d rock, a d litter floor — where one small O/o
critter is mid-stride on the branch, trailing a glowing c/g dotted MOTION-PATH that
fades G->c behind it, with a faint h ghost marker + o arrow ahead marking its
predicted next step, and a couple of o/O HEAT-MAP blobs on the floor where it
lingered. A c/O tracking-readout pip sits on the window frame. No animal-enclosure /
motion-path / heat-map-tracking motif exists anywhere else in the catalog.
"""
import os
import sys
import json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

# Base BioCore palette (shared keys) + the lab-wide EVOLVED accent shades reserved for
# the upgrade stages only (they appear in NO stage-1 sprite, so the shipped base PNG is
# unchanged). BioCore's evolved glow is BIO-LUMINESCENT (a living green-teal bloom), so a
# maxed building reads as a glowing vivarium, not a power plant:
#   b  deep mossy bark-green  — matured structure tone for t3+ new masses/frames
#   e  bioluminescent glow (mid)   E  bioluminescent glow (bright) — the t4/t5 life-glow
#   q  premium gold trim — t5 flourish ONLY (NOT a whole-building recolor)
BIO = {"K": "#1a2417", "W": "#e8f2d8", "L": "#c4dba6", "M": "#9fc07e", "D": "#6f9456", "d": "#4a6e3a",
       "h": "#d2f7ec", "c": "#9fefcf", "g": "#36cc9e", "G": "#1d8f70",
       "o": "#f0b24d", "O": "#ffd488", "r": "#b9701e",
       "b": "#2f4a2a", "e": "#74f0b6", "E": "#ccffe4", "q": "#f3c63a"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def dot(c, p, ch):
    c.set(int(round(p[0])), int(round(p[1])), ch)


def clamp(v, lo=0, hi=63):
    return max(lo, min(hi, v))


def cset(c, x, y, ch):
    """set() with a hard on-canvas clamp — every stage-add point stays inside 0..63."""
    c.set(clamp(int(round(x))), clamp(int(round(y))), ch)


# ── 1. MAIN HALL — a wide low box, M/D walls on a wood base band ──────────────
def hall(c):
    """Wide hall on a tall-enough wall to host a hero glass front. wx=15 wy=9 h=15 ->
    a broad enclosure whose LEFT wall is tall enough to be almost all glass, clearly
    NOT the tall square gateway cube (it is markedly wider than tall). The flat roof
    fill is temporary; the half-hipped roof overwrites it, so we keep only the body +
    walls from .draw()."""
    b = Box(top=(31, 14), wx=15, wy=9, h=15)
    b.draw(c, roof="d", lwall="M", rwall="D", roof_hi="d", outline="K")
    return b


def base_band(c, b):
    """A D/d wood-frame base band wraps the bottom of both faces (the enclosure sits
    on a low wood plinth). Lay the dark sill, then a lit D wood-rail cap line."""
    BASE = 12.4                             # band from this v down to the wall bottom (h=15)
    c.fill_poly([b.left_pt(0.0, BASE), b.left_pt(1.0, BASE),
                 b.left_pt(1.0, 15.0), b.left_pt(0.0, 15.0)], "d")
    c.fill_poly([b.right_pt(0.0, BASE), b.right_pt(1.0, BASE),
                 b.right_pt(1.0, 15.0), b.right_pt(0.0, 15.0)], "d")
    c.line(b.left_pt(0.0, BASE), b.left_pt(1.0, BASE), "D")    # lit wood rail
    c.line(b.right_pt(0.0, BASE), b.right_pt(1.0, BASE), "d")  # shaded wood rail
    return BASE


def right_face_plain(c, b, base):
    """RIGHT (shaded) face stays plainer: opaque M/D wall with one small c vent and a
    couple of quiet D wood pilasters — it must NOT read as the glass front."""
    # one small c louver vent, upper-right, with a K frame
    vu0, vu1, vv0, vv1 = 0.66, 0.84, 2.2, 4.6
    c.fill_poly([b.right_pt(vu0, vv0), b.right_pt(vu1, vv0),
                 b.right_pt(vu1, vv1), b.right_pt(vu0, vv1)], "c")
    for sv in (vv0 + 0.6, vv0 + 1.4):                          # G louver slats
        c.line(b.right_pt(vu0, sv), b.right_pt(vu1, sv), "G")
    for a, b2 in [(b.right_pt(vu0, vv0), b.right_pt(vu1, vv0)),
                  (b.right_pt(vu0, vv1), b.right_pt(vu1, vv1)),
                  (b.right_pt(vu0, vv0), b.right_pt(vu0, vv1)),
                  (b.right_pt(vu1, vv0), b.right_pt(vu1, vv1))]:
        c.line(a, b2, "K")
    # two quiet D wood pilasters down the shaded face
    for u in (0.20, 0.46):
        c.line(b.right_pt(u, 0.6), b.right_pt(u, base), "D")


# ── 2. HALF-HIPPED ROOF — a single L/M/D plane sloping to the front-left eave ──
def half_hip_roof(c, b):
    """Replace the flat roof diamond with a gentle SINGLE-SLOPE half-hipped roof. A
    low D ridge runs the back-long edge; one broad L/M/D plane slopes down toward the
    front-left eave; a small hip triangle folds the back-right corner. Returns the
    ridge endpoints + slope plane for mounting the heat-lamp + camera."""
    T, R, F, L = b.r_top, b.r_right, b.r_front, b.r_left
    RIDGE_H = 11                             # how high the back ridge lifts off the box

    # ridge: lifted copies of the BACK two corners (T back-top, R back-right corner of
    # the long back edge). The slope drops from this ridge toward the FRONT eave (L..F).
    ridge_l = (T[0], T[1] - RIDGE_H)         # over the back-top corner (left end of ridge)
    ridge_r = (R[0], R[1] - RIDGE_H)         # over the right corner (right end of ridge)

    # --- MAIN SLOPE: a broad plane from the ridge down to the front-left eave (L..F) --
    # corners, painter-back-to-front: ridge_l, ridge_r, F(front), L(left)
    c.fill_poly([ridge_l, ridge_r, F, L], "M")
    # sun gradient: brighter L near the ridge, M mid, D toward the eave
    for t in [i / 11 for i in range(0, 12)]:
        a = lerp(ridge_l, ridge_r, t)        # point along the ridge
        e = lerp(L, F, t)                    # matching point along the front eave
        c.line(a, lerp(a, e, 0.30), "L")     # bright upper third
        c.line(lerp(a, e, 0.30), lerp(a, e, 0.66), "M")
        c.line(lerp(a, e, 0.66), e, "D")     # shaded lower third near eave
    # faint W batten ribs running down-slope (a few, for a shingled feel)
    for t in (0.16, 0.40, 0.64, 0.88):
        c.line(lerp(ridge_l, ridge_r, t), lerp(L, F, t), "d")
    # eave + side edges + ridge outline
    c.line(L, F, "K")                        # front eave
    c.line(ridge_l, L, "K")                  # left rake
    c.line(ridge_r, F, "K")                  # right rake (front)
    c.line(ridge_l, ridge_r, "K")            # ridge top edge
    c.line((ridge_l[0], ridge_l[1] + 1), (ridge_r[0], ridge_r[1] + 1), "D")  # D ridge beam

    # --- HIP triangle: fold the back-right corner so it is a HALF-hip, not a gable.
    # The little triangle ridge_r -> R -> T-ish back edge gives the clipped hip look. --
    c.fill_poly([ridge_l, ridge_r, R, T], "D")    # shaded back-right hip facet
    c.line(ridge_r, R, "K")
    c.line(ridge_l, T, "K")
    c.line(R, T, "d")                        # back eave (mostly hidden)
    # small G shade wash on the lower hip facet
    c.line(lerp(ridge_r, R, 0.5), lerp(ridge_l, T, 0.5), "G")

    return ridge_l, ridge_r, L, F


def rooftop_gear(c, ridge_l, ridge_r, L, F):
    """A small o heat-lamp box + a c camera pod sit on the slope, both aimed DOWN into
    the enclosure (toward the front-left), selling 'observation'."""
    # heat-lamp box: an o/O cube near the ridge, upper-left of the slope
    hp = lerp(lerp(ridge_l, ridge_r, 0.30), lerp(L, F, 0.30), 0.30)
    hx, hy = int(round(hp[0])), int(round(hp[1]))
    for dx in range(-1, 2):
        for dy in range(0, 2):
            c.set(hx + dx, hy + dy, "o")
    c.set(hx - 1, hy - 1, "O"); c.set(hx, hy - 1, "O")     # warm top
    c.set(hx, hy + 2, "O"); c.set(hx - 1, hy + 2, "o")     # downward glow
    c.set(hx, hy - 2, "K")                                  # tiny stem to roof
    dot(c, (hx + 2, hy + 1), "K")                           # frame

    # camera pod: a small c dome on a K stalk, mid-slope, aimed front-left
    cp = lerp(lerp(ridge_l, ridge_r, 0.62), lerp(L, F, 0.62), 0.28)
    cx, cy = int(round(cp[0])), int(round(cp[1]))
    c.set(cx, cy + 1, "K"); c.set(cx, cy + 2, "K")          # stalk
    for dx in range(-1, 2):
        c.set(cx + dx, cy, "c")                             # dome body
    c.set(cx, cy - 1, "h")                                  # dome glint
    c.set(cx - 1, cy, "g"); c.set(cx + 1, cy, "G")          # dome sides
    c.set(cx - 2, cy + 1, "K")                              # lens nub aimed down-left
    return hp, cp


# ── 3. LEFT VIVARIUM OBSERVATION WINDOW — the hero glass front (the opening) ───
def observation_window(c, b, base):
    """The hero: a floor-to-roof K-framed grid of c/g/h glass filling almost the whole
    LIT LEFT face, with bright h reflections, a centered K-framed glass observer door,
    and a soft o interior glow. Returns the glazing bounds so the habitat can be drawn
    inside it."""
    U0, U1 = 0.06, 0.94                      # window spans nearly the full left face
    VT, VB = 1.2, base + 1.2                 # floor-to-roof: under eave down past base rail

    # K opening frame, then the glass field (lit c body, h reflection wash)
    c.fill_poly([b.left_pt(U0 - 0.02, VT - 0.3), b.left_pt(U1 + 0.02, VT - 0.3),
                 b.left_pt(U1 + 0.02, VB), b.left_pt(U0 - 0.02, VB)], "K")
    c.fill_poly([b.left_pt(U0, VT), b.left_pt(U1, VT),
                 b.left_pt(U1, VB - 0.2), b.left_pt(U0, VB - 0.2)], "c")
    # The lower ~60% of the LEFT glass is the DEEP ENCLOSURE INTERIOR: a solid dark
    # G->d backdrop (the diorama + motion-path are drawn on this so the bright marks
    # POP). The central-left zone (where the habitat sits) goes darkest.
    c.fill_poly([b.left_pt(U0, VT + (VB - VT) * 0.34), b.left_pt(U1, VT + (VB - VT) * 0.34),
                 b.left_pt(U1, VB - 0.2), b.left_pt(U0, VB - 0.2)], "G")
    c.fill_poly([b.left_pt(0.10, VT + (VB - VT) * 0.42), b.left_pt(0.66, VT + (VB - VT) * 0.42),
                 b.left_pt(0.66, VB - 0.2), b.left_pt(0.10, VB - 0.2)], "d")
    # one clean bright h reflection sweep across the UPPER glass only (kept above the
    # interior so it does not clutter the diorama)
    c.fill_poly([b.left_pt(U0 + 0.02, VT + 0.3), b.left_pt(0.30, VT + 0.3),
                 b.left_pt(0.30, VT + (VB - VT) * 0.28), b.left_pt(U0 + 0.02, VT + (VB - VT) * 0.28)], "h")
    c.fill_poly([b.left_pt(0.40, VT + 0.3), b.left_pt(0.50, VT + 0.3),
                 b.left_pt(0.50, VT + 1.6), b.left_pt(0.40, VT + 1.6)], "h")

    # K mullion grid: a few verticals + ONE upper transom only. Kept sparse so the
    # habitat/motion-path below reads clearly through clean glass (no bars across it).
    for u in [U0 + (U1 - U0) * i / 4 for i in range(1, 4)]:
        c.line(b.left_pt(u, VT), b.left_pt(u, VT + (VB - VT) * 0.42), "K")
    c.line(b.left_pt(U0, VT + (VB - VT) * 0.30), b.left_pt(U1, VT + (VB - VT) * 0.30), "K")
    # crisp K frame around the whole window
    for a, b2 in [(b.left_pt(U0, VT), b.left_pt(U1, VT)),
                  (b.left_pt(U0, VB - 0.2), b.left_pt(U1, VB - 0.2)),
                  (b.left_pt(U0, VT), b.left_pt(U0, VB - 0.2)),
                  (b.left_pt(U1, VT), b.left_pt(U1, VB - 0.2))]:
        c.line(a, b2, "K")
    # bright h eave glint along the top edge
    c.line(b.left_pt(U0 + 0.02, VT + 0.4), b.left_pt(U1 - 0.02, VT + 0.4), "h")

    # --- observer DOOR on the RIGHT third of the glass front (leaves the central-left
    # glass clear for the diorama): a tall K-framed glass door, soft o glow at its foot.
    du0, du1 = 0.70, 0.89
    dvt, dvb = VT + (VB - VT) * 0.34, VB - 0.2
    c.fill_poly([b.left_pt(du0 - 0.012, dvt - 0.3), b.left_pt(du1 + 0.012, dvt - 0.3),
                 b.left_pt(du1 + 0.012, dvb), b.left_pt(du0 - 0.012, dvb)], "K")
    c.fill_poly([b.left_pt(du0, dvt), b.left_pt(du1, dvt),
                 b.left_pt(du1, dvb - 0.2), b.left_pt(du0, dvb - 0.2)], "c")
    # warm amber interior glow pooling at the door foot
    c.fill_poly([b.left_pt(du0, dvb - 1.8), b.left_pt(du1, dvb - 1.8),
                 b.left_pt(du1, dvb - 0.2), b.left_pt(du0, dvb - 0.2)], "o")
    c.fill_poly([b.left_pt(du0, dvb - 0.9), b.left_pt(du1, dvb - 0.9),
                 b.left_pt(du1, dvb - 0.2), b.left_pt(du0, dvb - 0.2)], "O")
    dm = (du0 + du1) / 2
    c.line(b.left_pt(dm, dvt), b.left_pt(dm, dvb - 0.2), "K")     # door split
    c.line(b.left_pt(du0, dvt + 0.5), b.left_pt(du1, dvt + 0.5), "h")
    # soft o glow spill onto the ground just outside the door
    sp = b.left_pt(dm, VB + 0.6)
    sx, sy = int(round(sp[0])), int(round(sp[1]))
    for dx in range(-2, 3):
        c.set(sx + dx, sy, "o")
    c.set(sx, sy + 1, "O")

    return U0, U1, VT, VB


# ── 4. SIGNATURE — naturalistic habitat + tracked critter + motion-path ───────
def habitat_and_tracking(c, b, U0, U1, VT, VB, stage=1):
    """Behind the glass: a tiny diorama (branch perch, foliage, rock, litter floor)
    where one small critter is mid-stride, trailing a glowing c/g motion-path that
    fades G->c, a faint h ghost marker + o arrow ahead = predicted next step, and a
    couple of o/O heat-map blobs on the floor. A c/O tracking pip sits on the frame.
    Drawn INSIDE the left window, between the mullions (the one-of-one feature).

    At `stage>=5` the tracking goes FULL AI: the same diorama is overlaid with a DENSE
    `e` floor heat-map, several `E` predicted-step ghosts strung ahead of the critter,
    and a `c/O` multi-subject readout — drawn here (still inside the glass) so the
    signature simply BLOOMS rather than getting a second, detached feature."""
    def L(u, v):
        return b.left_pt(u, v)

    floor_v = VB - 1.1                       # litter floor line inside the enclosure

    # The interior is small, so commit to ONE legible read: a clear branch diagonal,
    # one unmistakable critter on it, a short bright dotted motion-path behind, a ghost
    # marker ahead, and a couple of floor heat blobs. No rock/foliage clutter.

    # --- t5 FULL-AI overlay (drawn FIRST so the branch + critter sit ON TOP of it):
    # a dense bio-luminescent floor HEAT-MAP across the enclosure floor. ---
    if stage >= 5:
        for hu in (0.16, 0.24, 0.32, 0.40, 0.48, 0.56):
            hp5 = L(hu, floor_v + 0.5)
            hx5, hy5 = int(round(hp5[0])), int(round(hp5[1]))
            cset(c, hx5, hy5, "e")
            cset(c, hx5 + 1, hy5, "E" if hu in (0.32, 0.40) else "e")
            cset(c, hx5, hy5 - 1, "e")

    # --- one O/o HEAT-MAP blob on the floor where the animal lingered (single, clear)
    hp = L(0.22, floor_v + 0.4)
    hx, hy = int(round(hp[0])), int(round(hp[1]))
    c.set(hx, hy, "o"); c.set(hx + 1, hy, "O"); c.set(hx + 2, hy, "o")
    c.set(hx + 1, hy - 1, "o")

    # --- BRANCH perch: ONE bold bright diagonal (M/L over a d shade) low in the dark
    # interior, kept BELOW the upper glass reflection so it pops on the dark backdrop ---
    p0 = L(0.16, floor_v - 0.3)              # low-left foot of the branch
    p1 = L(0.50, VT + (VB - VT) * 0.62)      # high-mid end (stays in dark interior)
    c.line((p0[0], p0[1] + 1), (p1[0], p1[1] + 1), "d")    # underside shade first
    c.line(p0, p1, "L")                                    # bright lit top of the branch
    c.line((p0[0] + 1, p0[1]), (p1[0] + 1, p1[1]), "M")    # 2px body, mid-green

    # --- MOTION-PATH: 3 bright, well-SPACED dots fading G->c->h trailing the critter --
    # at t5 the path densifies into a brighter bio-luminescent trail (e/E dots).
    if stage >= 5:
        for t, ch in ((0.12, "e"), (0.28, "E"), (0.44, "e"), (0.58, "E")):
            pt = lerp(p0, p1, t)
            cset(c, pt[0], pt[1] - 2, ch)
    else:
        for t, ch in ((0.20, "G"), (0.44, "c"), (0.64, "h")):
            pt = lerp(p0, p1, t)
            px, py = int(round(pt[0])), int(round(pt[1]) - 2)  # float just above the branch
            c.set(px, py, ch)

    # --- THE CRITTER: a chunky high-contrast O lizard standing ON the branch top -----
    an = lerp(p0, p1, 0.76)
    ax = int(round(an[0]))
    ay = int(round(an[1])) - 1               # sits just on top of the branch
    for dx, dy, ch in [(0, 0, "O"), (1, 0, "O"), (-1, 0, "O"),   # head+body
                       (2, 0, "o"), (3, 0, "o"),                # tail
                       (-1, 1, "o"), (1, 1, "o")]:              # legs mid-stride
        c.set(ax + dx, ay + dy, ch)
    c.set(ax - 1, ay - 1, "K")               # eye
    c.set(ax - 2, ay, "K")                   # nose
    c.set(ax + 4, ay - 1, "o")               # tail tip curl up

    # --- PREDICTION: a faint h GHOST + bright o ARROW just AHEAD (the next-step game) -
    ghost = lerp(p0, p1, 1.02)
    gx, gy = int(round(ghost[0])), int(round(ghost[1])) - 1
    c.set(gx, gy, "h"); c.set(gx + 1, gy, "c")              # faint ghost critter
    c.set(gx - 2, gy, "O"); c.set(gx - 1, gy, "o")         # bright arrow toward ghost
    c.set(gx - 3, gy - 1, "o"); c.set(gx - 3, gy + 1, "o") # arrowhead barbs

    # --- t5: a STRING of predicted-step ghosts marching ahead of the critter, each a
    # fainter E->e mote, so the AI is forecasting MANY steps, not one. ---
    if stage >= 5:
        for t, ch in ((1.14, "E"), (1.30, "e"), (1.48, "e")):
            gp = lerp(p0, p1, t)
            gx5, gy5 = int(round(gp[0])), int(round(gp[1])) - 1
            if 0 <= gx5 <= 63 and 0 <= gy5 <= 63:
                cset(c, gx5, gy5, ch)
                cset(c, gx5, gy5 - 1, "e")

    # --- tracking-readout PIP on the window frame (a c/O HUD chip, upper-right) ---
    pip = L(U1 - 0.05, VT + 1.0)
    px, py = int(round(pip[0])), int(round(pip[1]))
    c.set(px, py, "c"); c.set(px, py - 1, "O"); c.set(px - 1, py, "g")
    c.set(px, py + 1, "K"); c.set(px + 1, py, "K")

    # --- t5: a MULTI-SUBJECT readout column beside the pip (now tracking several
    # critters at once) — a stacked c/O HUD strip on the upper-right window frame. ---
    if stage >= 5:
        rp = L(U1 - 0.05, VT + 2.4)
        rx5, ry5 = int(round(rp[0])), int(round(rp[1]))
        for j, ch in enumerate(("O", "c", "O")):
            cset(c, rx5, ry5 + j, ch)
            cset(c, rx5 - 1, ry5 + j, "e" if j == 1 else "K")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS observation /
# enclosure / bio-glow structure onto the prior vivarium — never restarts, never
# recolors the whole building. Theme: the starter observation room grows into a fully
# instrumented, AI-tracked, multi-level VIVARIUM. Colours mature stage by stage
# (matured bark-green `b`, bio-luminescent `e/E`); gold (`q`) only as a t5 flourish.
# Every add is anchored OFF the hall/roof geometry and kept clear of the LEFT
# observation-window signature (which fills the lit-left face).
#
#   t2  small functional add   : a 2nd roof CAMERA POD + an IR `c` FLOODLIGHT on the hip slope
#   t3  structural add         : an OBSERVER ANTEROOM annex on the shaded right wall
#   t4  major add              : a raised ENCLOSURE-CANOPY mezzanine over the back of the hall
#   t5  crowning feature       : tracking goes FULL AI inside the glass + GOLD window/ridge trim
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_camera_floodlight(c, ridge_l, ridge_r, L, F, cp):
    """t2 — SMALL FUNCTIONAL ADD: more observation kit on the existing hip slope. A SECOND
    camera POD is bolted just up-slope of the base camera (so the pair reads as a stereo
    rig), and a small IR FLOODLIGHT box below it throws a short beam DOWN the slope into the
    enclosure. On-theme (more watching), modest, base palette + one brightened `o` glow pip
    near the floodlight. Both sit ON the roof plane between the ridge and the front eave, so
    they never reach the lit-left observation window.

    REVIEW-FIX (round 2): the prior version scattered single pixels that read as roof noise
    (only 17 isolated specks). This rebuilds the pair as two SOLID, K-OUTLINED masses — a
    filled ~4x3 dome on a visible stalk + a fully-framed floodlight housing with a bright
    contrasting lens face (its body no longer disappears into the green roof) — joined by a
    short mount rail so the whole cluster reads as one contiguous ~50px camera rig at 64px.
    Everything is recomputed from the SAME source point `cp` (the base camera)."""
    # Anchor off the base camera `cp` so the new rig nests beside it as a clear stereo pair.
    bx, by = int(round(cp[0])), int(round(cp[1]))            # base camera dome centre (~45,18)

    # --- SECOND camera pod: a SOLID filled dome, up-slope (lower y) + a touch back-left of the
    # base camera, on a short visible K stalk. Drawn as contiguous filled rows + a full K
    # outline ring so it coalesces into one readable dome (not scattered pixels). ---
    dcx, dcy = bx - 2, by - 6                                # dome centre, up the slope from cp
    # stalk first (under the dome), 2px tall onto the roof plane
    for sy in range(dcy + 2, dcy + 4):
        cset(c, dcx, sy, "K")
    # solid dome body: a filled 4-wide crown narrowing to the base (contiguous fill)
    for ddx in range(-1, 3):                                 # mid body row (widest), bright c
        cset(c, dcx + ddx, dcy, "c")
    for ddx in range(-1, 3):                                 # lower body row, shaded g
        cset(c, dcx + ddx, dcy + 1, "g")
    cset(c, dcx, dcy - 1, "h"); cset(c, dcx + 1, dcy - 1, "h")   # bright domed crown (2px; base `h` glint — bio-glow E is reserved for t4+)
    cset(c, dcx - 1, dcy + 1, "G"); cset(c, dcx + 2, dcy + 1, "G")  # darker dome cheeks
    # K outline ring hugging the dome so the silhouette is crisp on the green roof
    cset(c, dcx - 2, dcy, "K"); cset(c, dcx + 3, dcy, "K")       # side jambs
    cset(c, dcx - 2, dcy + 1, "K"); cset(c, dcx + 3, dcy + 1, "K")
    cset(c, dcx - 1, dcy - 1, "K"); cset(c, dcx + 2, dcy - 1, "K")
    cset(c, dcx, dcy - 2, "K"); cset(c, dcx + 1, dcy - 2, "K")   # crown cap
    cset(c, dcx - 1, dcy + 2, "K"); cset(c, dcx + 2, dcy + 2, "K")  # under-rim
    cset(c, dcx + 3, dcy + 1, "K")                               # lens nub aimed down-right (into enclosure)

    # --- short mount RAIL joining the new dome down to the floodlight, so the kit reads as ONE
    # contiguous rig rather than two stray objects on the slope. ---
    fx, fy = bx - 4, by + 2                                  # floodlight housing top-left, down-slope
    for ry in range(dcy + 4, fy):                            # 2px K bracket between dome stalk + housing
        cset(c, dcx - 1, ry, "K")

    # --- IR FLOODLIGHT box: a fully K-FRAMED housing (so its silhouette reads on the green
    # roof) with a bright contrasting lens FACE, mounted down-slope/front of the cameras and
    # aimed DOWN-LEFT into the front observation enclosure. ~4x4, solid. ---
    # housing body: dark `d` (darker than the roof) so the bright lens pops, then a full K frame
    c.fill_poly([(fx, fy), (fx + 3, fy), (fx + 3, fy + 3), (fx, fy + 3)], "d")
    # bright lens face (contrasting cyan/white) filling the lower-left of the housing, aimed down
    cset(c, fx + 1, fy + 1, "h"); cset(c, fx + 2, fy + 1, "c")   # upper lens row (bright)
    cset(c, fx + 1, fy + 2, "c"); cset(c, fx + 2, fy + 2, "g")   # lower lens row
    cset(c, fx, fy, "K"); cset(c, fx + 3, fy, "K")              # full K frame: top corners
    cset(c, fx + 1, fy, "K"); cset(c, fx + 2, fy, "K")          # top edge
    cset(c, fx, fy + 1, "K"); cset(c, fx + 3, fy + 1, "K")      # side edges
    cset(c, fx, fy + 2, "K"); cset(c, fx + 3, fy + 2, "K")
    cset(c, fx, fy + 3, "K"); cset(c, fx + 1, fy + 3, "K")      # bottom edge
    cset(c, fx + 2, fy + 3, "K"); cset(c, fx + 3, fy + 3, "K")
    # --- TIGHT directed beam: a short contiguous 3px cyan stub off the lens toward the
    # front-left enclosure (no loose fading dots), ending in one warm `o` glow pip. ---
    for j in range(1, 4):
        cset(c, fx - j, fy + 3 + j, "c")                       # beam shaft (down-left, contiguous)
    cset(c, fx - 4, fy + 7, "o")                               # warm glow pip where the beam lands


def stage3_anteroom(c, b, base):
    """t3 — STRUCTURAL ADD: an OBSERVER ANTEROOM annex bolted to the SHADED RIGHT wall — the
    watchers' room where staff stand to view the one-way glass. A self-contained matured
    bark-green `b` box stepped out from the right face toward the viewer (front), drawn as a
    proper little PRISM (lit front face + shaded right-return face + flat roof) so it reads as
    a 3D room, not a flat strip on the canvas edge. Carries a one-way `g` glass viewing SLIT
    and a small `o/r` HVAC vent, and sits fully on the shaded right side, clear of the
    lit-left observation window. Kept inboard of x=62 so nothing clips. Introduces the
    matured bark-green tone `b`."""
    # Anchor the annex as its OWN small Box abutting the right wall: its back-top corner sits
    # just in front of the hall's front-right wall, stepped out toward the viewer (+wy) and
    # short (so it stays well below the eave + inboard of the canvas wall).
    # hall front-right base corner w_front=(43,53). Place the annex back-top a few px above
    # the ground there, then run it toward the right corner (+wx) and out front (+wy).
    bt = (int(b.w_front[0]) + 1, int(b.w_front[1]) - 9)       # back-top of the annex
    AW, AY, AH = 6, 3, 8                                      # wx, wy(out toward viewer), height
    ann = Box(top=bt, wx=AW, wy=AY, h=AH)
    # clamp guard: the right corner is the rightmost point — verify it stays inboard.
    # (AW=6 -> +12px in x from bt.x=44 -> 56; +AY left-step keeps the front face left of that.)
    # --- draw the prism: shaded right-return face (back), then lit front face, then roof ---
    # right-return face (the +wx face, shaded D) — gives the box its 3D depth
    c.fill_poly([ann.r_right, ann.r_front, ann.w_front, ann.w_right], "d")
    # lit FRONT face (the +wy face toward the viewer, matured bark-green `b`)
    c.fill_poly([ann.r_left, ann.r_front, ann.w_front, ann.w_left], "b")
    # flat roof cap (lit D top diamond)
    c.fill_poly([ann.r_top, ann.r_right, ann.r_front, ann.r_left], "D")
    c.fill_poly([ann.r_top, ann.r_left, ann.r_front], "M")   # brighter back-left roof triangle
    # crisp K silhouette + the lit roof back edges
    c.line(ann.r_top, ann.r_left, "L")
    c.line(ann.r_top, ann.r_right, "M")
    for p, q in [(ann.r_top, ann.r_right), (ann.r_right, ann.r_front), (ann.r_front, ann.r_left),
                 (ann.r_left, ann.r_top), (ann.r_left, ann.w_left), (ann.r_front, ann.w_front),
                 (ann.r_right, ann.w_right), (ann.w_left, ann.w_front), (ann.w_front, ann.w_right)]:
        c.line(p, q, "K")
    c.line(ann.r_front, ann.w_front, "d")                    # front vertical recess
    # --- one-way `g` glass viewing SLIT on the lit FRONT face (a short horizontal band) ---
    c.fill_poly([ann.left_pt(0.18, 2.4), ann.left_pt(0.82, 2.4),
                 ann.left_pt(0.82, 4.2), ann.left_pt(0.18, 4.2)], "g")
    c.line(ann.left_pt(0.18, 2.4), ann.left_pt(0.82, 2.4), "c")      # bright top edge (one-way sheen)
    c.line(ann.left_pt(0.18, 3.0), ann.left_pt(0.50, 2.6), "h")      # diagonal glass glint
    for p, q in [(ann.left_pt(0.18, 2.4), ann.left_pt(0.82, 2.4)),
                 (ann.left_pt(0.18, 4.2), ann.left_pt(0.82, 4.2)),
                 (ann.left_pt(0.18, 2.4), ann.left_pt(0.18, 4.2)),
                 (ann.left_pt(0.82, 2.4), ann.left_pt(0.82, 4.2))]:
        c.line(p, q, "K")
    # --- small `o/r` HVAC vent louver low on the right-return face (warm exhaust) ---
    c.fill_poly([ann.right_pt(0.30, 4.6), ann.right_pt(0.78, 4.6),
                 ann.right_pt(0.78, 6.4), ann.right_pt(0.30, 6.4)], "r")
    for vv in (5.1, 5.8):
        c.line(ann.right_pt(0.30, vv), ann.right_pt(0.78, vv), "o")  # warm louver slats
    for p, q in [(ann.right_pt(0.30, 4.6), ann.right_pt(0.78, 4.6)),
                 (ann.right_pt(0.30, 6.4), ann.right_pt(0.78, 6.4)),
                 (ann.right_pt(0.30, 4.6), ann.right_pt(0.30, 6.4)),
                 (ann.right_pt(0.78, 4.6), ann.right_pt(0.78, 6.4))]:
        c.line(p, q, "K")


def stage4_mezzanine(c, b, ridge_l, ridge_r):
    """t4 — MAJOR ADD: a raised ENCLOSURE-CANOPY MEZZANINE built over the BACK of the hall —
    a prominent new upper mass that says 'the habitat now goes tall + multi-level'. A
    deep bark-green `b`-framed open MESH CAGE is lifted on short posts above the back ridge,
    and a glowing bio-luminescent `e` UV / day-cycle LIGHT BAR runs under it, lighting a
    taller habitat. Sits squarely over the back ridge line (well behind + above the
    lit-left observation window). Palette matures to deep `b` + energized bio-glow `e/E`.

    Kept fully ON-canvas: the cage top is clamped to y>=1 and the right edge to x<=62, so
    the frame never reads as a flat strip clipped on the canvas wall."""
    # The cage spans most of the ridge, lifted on posts. Author its 4 corners directly so we
    # can hard-clamp the TOP to y=1 and the RIGHT to x=62 (the ridge_r end is near the wall).
    H = 5                                      # cage height
    TOP_MIN = 1                                # never let the cage cross the canvas ceiling
    RIGHT_MAX = 62                             # keep the right uprights inboard of the wall
    lift = 6                                   # how far the cage floats above the ridge
    # bottom rail follows the ridge raised by `lift`; pull the ends in a touch from the rake.
    blx = clamp(int(round(ridge_l[0])) + 2, hi=RIGHT_MAX)
    brx = clamp(int(round(ridge_r[0])) - 3, hi=RIGHT_MAX)
    # the bottom rail must leave H px of headroom above it for the cage, so floor it at
    # TOP_MIN+H (the high LEFT ridge end would otherwise lift the cage off the top of canvas).
    bl_y = clamp(int(round(ridge_l[1])) - lift, lo=TOP_MIN + H)
    br_y = clamp(int(round(ridge_r[1])) - lift, lo=TOP_MIN + H)
    # top rail = bottom rail minus H, but never above TOP_MIN
    tl_y = max(TOP_MIN, bl_y - H)
    tr_y = max(TOP_MIN, br_y - H)
    bl = (blx, bl_y); br = (brx, br_y)
    tl = (blx, tl_y); tr = (brx, tr_y)
    # --- short support POSTS from the ridge UP to the cage bottom rail (deep `b`) ---
    for (foot, top_y) in (((blx, int(round(ridge_l[1]))), bl_y),
                          ((brx, int(round(ridge_r[1]))), br_y)):
        c.line((foot[0], foot[1]), (foot[0], top_y), "b")
        c.set(foot[0], foot[1], "K")
    mid_x = (blx + brx) // 2                    # a centre post (the ridge sags between ends)
    mid_ridge_y = int(round(lerp(ridge_l, ridge_r, 0.5)[1]))
    c.line((mid_x, mid_ridge_y), (mid_x, (bl_y + br_y) // 2), "b")
    # --- the open MESH CAGE: a light back wash + an AIRY cross-hatch (reads as wire), not a
    # solid slab. Back wash is the matured `b`; the wire is a brighter M so the cage breathes. ---
    c.fill_poly([tl, tr, br, bl], "b")                     # cage back wash (matured bark-green)
    x_lo, x_hi = min(tl[0], bl[0]), max(tr[0], br[0])
    y_lo, y_hi = min(tl[1], tr[1]), max(bl[1], br[1])
    for mx in range(x_lo + 2, x_hi - 1, 4):                # sparse vertical wires
        c.line((mx, y_lo + 1), (mx, y_hi - 1), "M")
    for my in range(y_lo + 2, y_hi - 1, 3):                # sparse horizontal wires
        c.line((x_lo + 1, my), (x_hi - 1, my), "M")
    # crisp `b`/K frame (bright lit top rail)
    c.line(tl, tr, "L")
    for p, q in [(tl, tr), (tr, br), (br, bl), (bl, tl)]:
        c.line(p, q, "K")
    # --- glowing `e` UV / day-cycle LIGHT BAR running UNDER the cage (the grow-light) ---
    bar_y = clamp(y_hi + 1)
    bx0 = clamp(x_lo + 1)
    bx1 = clamp(x_hi - 1, hi=RIGHT_MAX)
    c.line((bx0, bar_y), (bx1, bar_y), "e")                # bio-luminescent light bar
    c.line((bx0, clamp(bar_y + 1)), (bx1, clamp(bar_y + 1)), "E")   # bright underside spill
    c.set(clamp(bx0 - 1), bar_y, "K"); c.set(clamp(bx1 + 1, hi=RIGHT_MAX), bar_y, "K")  # end caps
    # a couple of soft `e` glow motes drifting just under the bar (UV haze)
    for dx in (0.30, 0.62):
        cset(c, bx0 + dx * (bx1 - bx0), bar_y + 2, "e")


def stage5_gold_trim(c, b, ridge_l, ridge_r, base):
    """t5 — CROWNING FEATURE (the AI tracking-bloom lives inside `habitat_and_tracking`
    via stage>=5; this helper adds the EXTERNAL premium GOLD flourish only). The maxed
    observation room gets a `q` GOLD frame around the hero observation WINDOW + a gold
    RIDGE FINIAL crowning the roof. Gold (`q`) appears ONLY here. Reads as elite, still
    recognizably the same vivarium."""
    # --- GOLD trim on the hero observation WINDOW (lit-left face) — a thin gold edge
    # along the window's top + side frame so the signature reads as premium curation. ---
    U0, U1 = 0.06, 0.94
    VT = 1.2
    VB = base + 1.2
    # gold along the top edge of the window frame + down the two vertical frame edges
    c.line(b.left_pt(U0, VT - 0.3), b.left_pt(U1, VT - 0.3), "q")        # gold head rail
    c.line(b.left_pt(U0 - 0.02, VT - 0.3), b.left_pt(U0 - 0.02, VB * 0.62), "q")  # gold left jamb (upper)
    c.line(b.left_pt(U1 + 0.02, VT - 0.3), b.left_pt(U1 + 0.02, VB * 0.62), "q")  # gold right jamb (upper)
    # bright O corner bosses at the two top corners of the frame
    tlp = b.left_pt(U0, VT - 0.3)
    trp = b.left_pt(U1, VT - 0.3)
    cset(c, tlp[0], tlp[1] - 1, "O")
    cset(c, trp[0], trp[1] - 1, "O")

    # --- GOLD RIDGE FINIAL crowning the roof — a small gold spike + boss seated on the
    # ridge, toward the high (back-left) end so it crowns the silhouette without touching
    # the mezzanine box or the window. ---
    fp = lerp(ridge_l, ridge_r, 0.22)
    fx, fy = int(round(fp[0])), int(round(fp[1]))
    c.set(fx, fy - 1, "q")                                  # finial base on the ridge
    c.set(fx, fy - 2, "q")                                  # gold spike
    c.set(fx, fy - 3, "O")                                  # bright tip
    c.set(fx - 1, fy - 1, "q"); c.set(fx + 1, fy - 1, "q") # finial cross-arms (a small crest)


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the behavioral-observation-room at upgrade `stage` (1..5). Stage 1 is
    IDENTICAL to the shipped base; each higher stage keeps every prior addition and bolts
    on the next (t2 stereo-camera+floodlight → t3 observer anteroom → t4 enclosure-canopy
    mezzanine → t5 full-AI tracking + gold trim). Painter's order keeps the hero LEFT
    observation window + its habitat/tracking signature drawn LAST, so no rooftop / annex /
    mezzanine addition can ever occlude the one-of-one feature."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    # painter's order: body+walls, base band, plain right face, half-hipped roof,
    # rooftop gear. The LEFT observation window + the habitat/tracking are drawn LAST
    # (after the stages) so the signature is never occluded.
    b = hall(c)
    base = base_band(c, b)
    right_face_plain(c, b, base)
    ridge_l, ridge_r, Lc, Fc = half_hip_roof(c, b)
    hp, cp = rooftop_gear(c, ridge_l, ridge_r, Lc, Fc)

    # --- CUMULATIVE UPGRADE STAGES (drawn before the hero window so it stays on top) --
    # t3 anteroom abuts the RIGHT wall and t4 mezzanine sits over the BACK ridge — both
    # clear of the lit-left face — so they are safe to draw before the window. t2 sits on
    # the roof slope. The t5 gold trim that touches the window frame is re-applied AFTER
    # the window is drawn (below).
    if stage >= 2:
        stage2_camera_floodlight(c, ridge_l, ridge_r, Lc, Fc, cp)
    if stage >= 3:
        stage3_anteroom(c, b, base)
    if stage >= 4:
        stage4_mezzanine(c, b, ridge_l, ridge_r)

    # --- HERO LEFT observation window + the habitat/tracking signature, drawn LAST -----
    U0, U1, VT, VB = observation_window(c, b, base)
    # t5 gold trim frames the window, so it must be drawn AFTER the window itself.
    if stage >= 5:
        stage5_gold_trim(c, b, ridge_l, ridge_r, base)
    # the habitat/tracking signature is always last (the t5 AI-bloom is keyed inside it).
    habitat_and_tracking(c, b, U0, U1, VT, VB, stage=stage)
    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/biocore"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "behavioral-observation-room"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG +
    scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must keep
    matching the shipped {SLUG}.png, so it does NOT overwrite the base PNG."""
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
