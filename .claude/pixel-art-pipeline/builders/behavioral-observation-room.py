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

BIO = {"K": "#1a2417", "W": "#e8f2d8", "L": "#c4dba6", "M": "#9fc07e", "D": "#6f9456", "d": "#4a6e3a",
       "h": "#d2f7ec", "c": "#9fefcf", "g": "#36cc9e", "G": "#1d8f70",
       "o": "#f0b24d", "O": "#ffd488", "r": "#b9701e"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def dot(c, p, ch):
    c.set(int(round(p[0])), int(round(p[1])), ch)


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
def habitat_and_tracking(c, b, U0, U1, VT, VB):
    """Behind the glass: a tiny diorama (branch perch, foliage, rock, litter floor)
    where one small critter is mid-stride, trailing a glowing c/g motion-path that
    fades G->c, a faint h ghost marker + o arrow ahead = predicted next step, and a
    couple of o/O heat-map blobs on the floor. A c/O tracking pip sits on the frame.
    Drawn INSIDE the left window, between the mullions (the one-of-one feature)."""
    def L(u, v):
        return b.left_pt(u, v)

    floor_v = VB - 1.1                       # litter floor line inside the enclosure

    # The interior is small, so commit to ONE legible read: a clear branch diagonal,
    # one unmistakable critter on it, a short bright dotted motion-path behind, a ghost
    # marker ahead, and a couple of floor heat blobs. No rock/foliage clutter.

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

    # --- tracking-readout PIP on the window frame (a c/O HUD chip, upper-right) ---
    pip = L(U1 - 0.05, VT + 1.0)
    px, py = int(round(pip[0])), int(round(pip[1]))
    c.set(px, py, "c"); c.set(px, py - 1, "O"); c.set(px - 1, py, "g")
    c.set(px, py + 1, "K"); c.set(px + 1, py, "K")


def main():
    c = Canvas()
    # painter's order: body+walls, base band, plain right face, half-hipped roof,
    # rooftop gear, the LEFT observation window, then the habitat/tracking inside it.
    b = hall(c)
    base = base_band(c, b)
    right_face_plain(c, b, base)
    ridge_l, ridge_r, Lc, Fc = half_hip_roof(c, b)
    rooftop_gear(c, ridge_l, ridge_r, Lc, Fc)
    U0, U1, VT, VB = observation_window(c, b, base)
    habitat_and_tracking(c, b, U0, U1, VT, VB)

    spec = {"width": 64, "height": 64, "palette": BIO, "rows": c.rows()}
    out = "/path/to/scienium/art/src/buildings/biocore_behavioral-observation-room.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    main()
