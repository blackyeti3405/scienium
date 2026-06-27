#!/usr/bin/env python3
"""
Greenhouse — BioCore economy building (BESPOKE FORM, starter).

This is NOT the gateway cube and NOT a re-skin of any sibling. It is the set's most
literal glasshouse: a LONG LOW HALL on a short wood knee-wall, capped by a STEEP
TWIN-PITCH GABLE GLAZED ROOF that climbs to a high central ridge beam. Almost the
whole structure is glass — the opposite of an angular box. Its silhouette is a long
rectangle topped by a tall triangular ridge: instantly a hothouse.

  * MAIN HALL: one long, low Box (wx=14, wy=8, h=9) — a short D/d wood knee-wall,
    then full-length c/g glazing in a regular K-mullion grid, lit h reflections on
    the upper-left panes.
  * GABLE ROOF (the signature shape): the flat roof diamond is replaced by TWO
    angled glazed planes rising to a high D ridge beam that runs the LONG axis. The
    lit-left slope is brighter (h/c), the shaded-right slope darker (g/G), each
    ribbed with K mullion ridges every few px. A small ridge vent cracks open along
    the top.
  * OPENING SIDE = LEFT. The hero entrance is a tall K-framed double glass door,
    centered on the LIT LEFT face, with a soft amber o grow-glow spilling out; a low
    r/d planter bed with M/D sprouts runs along the left footing. The RIGHT face is
    plainer — continuous glazing, no door.

Signature (one-of-one): a slowly-rotating HOLOGRAPHIC TERRARIUM GLOBE floats above
the ridge — a translucent c/h glass sphere holding a tiny living biome (a d/D hill
mound, one M/D tree with an O canopy, h cloud puffs), turning on a tilted g axis
ring with a travelling O glint, projected up an o/O beam from a small ridge emitter
under a faint c glow halo. No globe / terrarium / floating-biome motif exists
anywhere in the catalog.
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

BIO = {"K": "#1a2417", "W": "#e8f2d8", "L": "#c4dba6", "M": "#9fc07e", "D": "#6f9456", "d": "#4a6e3a",
       "h": "#d2f7ec", "c": "#9fefcf", "g": "#36cc9e", "G": "#1d8f70",
       "o": "#f0b24d", "O": "#ffd488", "r": "#b9701e"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def disc(c, cx, cy, rx, ry, fill):
    """Filled 2:1 ellipse (a hover-circle / sphere body)."""
    for yy in range(int(-ry - 1), int(ry + 2)):
        t = 1 - (yy / ry) ** 2
        if t < 0:
            continue
        half = rx * (t ** 0.5)
        for xx in range(int(-half), int(half) + 1):
            c.set(cx + xx, cy + yy, fill)


def ring(c, cx, cy, rx, ry, ch, a0=0, a1=360):
    for a in range(a0, a1, 4):
        x = cx + rx * math.cos(math.radians(a))
        y = cy + ry * math.sin(math.radians(a))
        c.set(x, y, ch)


# ── 1. MAIN HALL — a long low glasshouse body on a wood knee-wall ────────────
def hall(c):
    """Long low hall. wx=14 wy=8 h=9 -> a low, elongated glazed hall, distinctly
    NOT the tall square gateway cube. Drawn with a quiet roof fill that the gable
    roof then overwrites — we only want the body + walls from .draw()."""
    b = Box(top=(28, 26), wx=13, wy=7, h=10)
    # body walls: lit M left, shaded D right. roof fill is temporary (gable covers it).
    b.draw(c, roof="d", lwall="M", rwall="D", roof_hi="d", outline="K")
    return b


def knee_wall(c, b):
    """A short D/d wood-frame knee-wall band runs the base of both faces; the bulk of
    each face above it becomes glazing. Lay the dark sill band first."""
    # left + right knee-wall sills (bottom ~3px of the 9px walls -> wood footing)
    KNEE = 6.2
    c.fill_poly([b.left_pt(0.0, KNEE), b.left_pt(1.0, KNEE),
                 b.left_pt(1.0, 9.0), b.left_pt(0.0, 9.0)], "d")
    c.fill_poly([b.right_pt(0.0, KNEE), b.right_pt(1.0, KNEE),
                 b.right_pt(1.0, 9.0), b.right_pt(0.0, 9.0)], "d")
    # a lit D cap line on the knee-wall top (wood rail) on the lit face
    c.line(b.left_pt(0.0, KNEE), b.left_pt(1.0, KNEE), "D")
    c.line(b.right_pt(0.0, KNEE), b.right_pt(1.0, KNEE), "d")
    return KNEE


def glaze_walls(c, b, knee):
    """Full-length c/g glazing in a regular K-mullion grid above the knee-wall on
    BOTH faces. Lit-left panes brighter (c with h glints); shaded-right panes g.
    The LEFT door is cut in later, on top."""
    VT, VB = 1.4, knee - 0.2     # glazing band from just under the eave to the knee rail
    # LEFT (lit) face — bright c glass
    c.fill_poly([b.left_pt(0.02, VT), b.left_pt(0.98, VT),
                 b.left_pt(0.98, VB), b.left_pt(0.02, VB)], "c")
    # h reflection wash on the upper-left panes
    c.fill_poly([b.left_pt(0.05, VT), b.left_pt(0.45, VT),
                 b.left_pt(0.45, VT + 2.2), b.left_pt(0.05, VT + 2.2)], "h")
    # RIGHT (shaded) face — calmer g glass
    c.fill_poly([b.right_pt(0.02, VT), b.right_pt(0.98, VT),
                 b.right_pt(0.98, VB), b.right_pt(0.02, VB)], "g")
    # G shade wash on the lower-right panes
    c.fill_poly([b.right_pt(0.55, VT + 2.0), b.right_pt(0.98, VT + 2.0),
                 b.right_pt(0.98, VB), b.right_pt(0.55, VB)], "G")
    # K mullion grid — vertical bars every ~0.11u + one horizontal transom
    for u in [i * 0.1 for i in range(1, 10)]:
        c.line(b.left_pt(u, VT), b.left_pt(u, VB), "K")
        c.line(b.right_pt(u, VT), b.right_pt(u, VB), "K")
    tr = (VT + VB) / 2
    c.line(b.left_pt(0.02, tr), b.left_pt(0.98, tr), "K")
    c.line(b.right_pt(0.02, tr), b.right_pt(0.98, tr), "K")
    # crisp K frame around each glazing band
    for pt in (b.left_pt, b.right_pt):
        c.line(pt(0.02, VT), pt(0.98, VT), "K")
        c.line(pt(0.02, VB), pt(0.98, VB), "K")
        c.line(pt(0.02, VT), pt(0.02, VB), "K")
        c.line(pt(0.98, VT), pt(0.98, VB), "K")
    # bright h eave glint line along the lit top edge
    c.line(b.left_pt(0.04, VT + 0.4), b.left_pt(0.96, VT + 0.4), "h")
    return VT


# ── 2. GABLE ROOF — two steep glazed slopes to a high ridge beam ─────────────
def gable_roof(c, b):
    """Replace the flat roof diamond with a STEEP TWIN-PITCH GABLE. The ridge runs
    the LONG (right/wx) axis: from the mid of the left edge to the mid of the right
    edge of the roof diamond, LIFTED high. Two glazed planes drop from the ridge to
    the two long eaves (the back-left edge and the front-right edge of the diamond).
    Lit-left slope brighter (c/h), shaded-right slope darker (g/G). The gable END
    triangles close the short ends. This is the silhouette signature."""
    RIDGE_H = 11                       # how high the ridge floats above the flat roof
    # roof diamond corners (flat): r_top(back), r_right, r_front, r_left
    T, R, F, L = b.r_top, b.r_right, b.r_front, b.r_left
    # ridge endpoints = midpoints of the two SHORT edges, lifted by RIDGE_H.
    # short edges are L->T (back-left short end) and F->R (front-right short end).
    back_mid = lerp(L, T, 0.5)         # mid of back-left short end
    front_mid = lerp(F, R, 0.5)        # mid of front-right short end
    ridge_back = (back_mid[0], back_mid[1] - RIDGE_H)
    ridge_front = (front_mid[0], front_mid[1] - RIDGE_H)

    # The two long eaves of the roof:
    #   LIT (left, facing viewer-left/back) eave  = edge T -> L ... actually the lit
    #   long slope drops from the ridge to the LEFT long eave (L..F edge? ). We define:
    #   left slope  spans ridge -> the L..F long edge (the lit, viewer-facing-left).
    #   right slope spans ridge -> the T..R long edge (the shaded, away side).
    # left long eave corners:  L (back) .. F (front)
    # right long eave corners: T (back) .. R (front)

    # --- SHADED right slope first (painter's: back/up volume behind the lit one) ---
    c.fill_poly([ridge_back, ridge_front, R, T], "g")
    # G shade ramp + K mullion ribs down the shaded slope
    for t in [i / 9 for i in range(1, 9)]:
        a = lerp(ridge_back, ridge_front, t)
        e = lerp(T, R, t)
        c.line(a, e, "G" if t > 0.5 else "g")
    for t in (0.0, 1.0):
        a = lerp(ridge_back, ridge_front, t)
        e = lerp(T, R, t)
        c.line(a, e, "K")
    # rib lines down-slope (K mullions) every ~3 steps
    for t in (0.18, 0.40, 0.62, 0.84):
        c.line(lerp(ridge_back, ridge_front, t), lerp(T, R, t), "K")

    # --- LIT left slope (front, brighter) ---
    c.fill_poly([ridge_back, ridge_front, F, L], "c")
    for t in [i / 9 for i in range(1, 9)]:
        a = lerp(ridge_back, ridge_front, t)
        e = lerp(L, F, t)
        # brighter near the ridge (sun), c lower
        c.line(a, lerp(a, e, 0.5), "h")
        c.line(lerp(a, e, 0.5), e, "c")
    for t in (0.18, 0.40, 0.62, 0.84):
        c.line(lerp(ridge_back, ridge_front, t), lerp(L, F, t), "K")
    # eave + edge outline of the lit slope
    c.line(ridge_back, L, "K")
    c.line(ridge_front, F, "K")
    c.line(L, F, "K")

    # --- GABLE END triangles (close the short ends; D/d wood-framed glass) ---
    # back-left gable end: ridge_back, L, T
    c.fill_poly([ridge_back, L, T], "G")
    c.line(ridge_back, L, "K")
    c.line(ridge_back, T, "K")
    # front-right gable end (more visible): ridge_front, F, R
    c.fill_poly([ridge_front, F, R], "g")
    # glazed end with a couple of h glints + a D wood frame triangle
    c.line(ridge_front, F, "D")
    c.line(ridge_front, R, "D")
    c.line(F, R, "K")
    # one bright glint pane on the lit lower corner of the front gable
    gp = lerp(lerp(ridge_front, F, 0.55), lerp(ridge_front, R, 0.55), 0.35)
    c.set(int(round(gp[0])), int(round(gp[1])), "h")

    # --- RIDGE BEAM (high D wood beam) + a cracked-open ridge vent ---
    c.line(ridge_back, ridge_front, "D")
    c.line((ridge_back[0], ridge_back[1] - 1), (ridge_front[0], ridge_front[1] - 1), "K")
    # ridge vent: a short lighter L flap lifted just off the ridge near the front
    v0 = lerp(ridge_back, ridge_front, 0.55)
    v1 = lerp(ridge_back, ridge_front, 0.78)
    c.line((v0[0], v0[1] - 2), (v1[0], v1[1] - 2), "L")
    c.line((v0[0], v0[1] - 2), (v0[0], v0[1]), "d")
    c.line((v1[0], v1[1] - 2), (v1[0], v1[1]), "d")
    return ridge_back, ridge_front


# ── 3. LEFT entrance — hero double glass door + grow-glow + planter bed ───────
def entrance(c, b, knee):
    """Tall K-framed double glass door centered on the LIT LEFT face, with a soft
    amber o grow-glow spilling out, and a low r/d planter bed of M/D sprouts along
    the left footing. The opening reads clearly on the LEFT."""
    u0, u1 = 0.38, 0.68          # centered double-door span on the lit face
    vt, vb = 1.6, 9.2           # door runs from under the eave to the ground
    # K opening frame (slightly oversized for a hard recessed border)
    c.fill_poly([b.left_pt(u0 - 0.016, vt - 0.4), b.left_pt(u1 + 0.016, vt - 0.4),
                 b.left_pt(u1 + 0.016, vb), b.left_pt(u0 - 0.016, vb)], "K")
    # two glass door leaves (bright h sheen up top -> c lower) so the door reads
    # as a distinct bright panel against the calmer wall glazing around it.
    iu0, iu1 = u0 + 0.018, u1 - 0.018
    c.fill_poly([b.left_pt(iu0, vt), b.left_pt(iu1, vt),
                 b.left_pt(iu1, vb - 0.3), b.left_pt(iu0, vb - 0.3)], "c")
    c.fill_poly([b.left_pt(iu0, vt), b.left_pt(iu1, vt),
                 b.left_pt(iu1, vt + 2.0), b.left_pt(iu0, vt + 2.0)], "h")
    # warm amber grow-glow pooling up from inside the doorway (lower half)
    c.fill_poly([b.left_pt(iu0, vb - 3.6), b.left_pt(iu1, vb - 3.6),
                 b.left_pt(iu1, vb - 0.3), b.left_pt(iu0, vb - 0.3)], "o")
    c.fill_poly([b.left_pt(iu0, vb - 1.8), b.left_pt(iu1, vb - 1.8),
                 b.left_pt(iu1, vb - 0.3), b.left_pt(iu0, vb - 0.3)], "O")
    um = (iu0 + iu1) / 2
    c.line(b.left_pt(um, vt), b.left_pt(um, vb - 0.3), "K")   # center mullion
    c.line(b.left_pt(iu0, vt + 0.5), b.left_pt(iu1, vt + 0.5), "h")  # head sheen
    # a transom of small panes above the doors
    c.line(b.left_pt(iu0, vt + 2.4), b.left_pt(iu1, vt + 2.4), "K")
    # soft o glow spill onto the ground just outside the door
    sp = b.left_pt(um, vb + 0.6)
    sx, sy = int(round(sp[0])), int(round(sp[1]))
    for dx in range(-3, 4):
        c.set(sx + dx, sy, "o")
    c.set(sx - 1, sy + 1, "o"); c.set(sx, sy + 1, "O"); c.set(sx + 1, sy + 1, "o")

    # --- PLANTER BED along the LEFT footing (r/d boxes + M/D sprouts) ---
    bed_v = 9.6
    for i, u in enumerate((0.10, 0.22, 0.78, 0.90)):
        p = b.left_pt(u, bed_v)
        px, py = int(round(p[0])), int(round(p[1]))
        # little r planter box
        for dx in (-1, 0, 1):
            c.set(px + dx, py, "r")
            c.set(px + dx, py + 1, "d")
        # M/D sprouts standing up out of the box
        c.set(px, py - 1, "M")
        c.set(px - 1 if i % 2 else px + 1, py - 1, "D")
        c.set(px, py - 2, "M")


# ── 4. SIGNATURE — holographic terrarium globe above the ridge ───────────────
def terrarium_globe(c, ridge_back, ridge_front):
    """A slowly-rotating holographic terrarium globe floats above the ridge: a
    translucent c/h glass sphere holding a tiny biome, on a tilted g axis ring with
    a travelling O glint, projected up an o/O beam from a ridge emitter under a faint
    c glow halo. The one-of-one signature of the set."""
    # emitter sits on the ridge near the front; globe floats above it.
    emit = lerp(ridge_back, ridge_front, 0.40)
    ex, ey = int(round(emit[0])), int(round(emit[1]))
    gx = ex
    gy = ey - 12                       # globe center floats above the ridge
    R = 6                              # sphere radius

    # tilted orbit ellipse geometry — WIDER than the sphere so the band clearly
    # orbits AROUND it (extends past the rim left/right), tilted so its back arc
    # passes behind the top of the sphere and its front arc in front of the bottom.
    ORX, ORY = R + 4, R - 3            # wide + shallow = a tilted orbit band

    # --- faint c glow halo hugging the sphere (drawn first, behind) ---
    disc(c, gx, gy, R + 2, R + 2, "G")

    # --- orbit BACK arc (behind the sphere): the upper half of the tilted ellipse ---
    ring(c, gx, gy, ORX, ORY, "G", a0=180, a1=360)

    # --- projector beam: a thin o/O cone rising from the emitter into the globe ---
    for k in range(0, 13):
        t = k / 12
        bx = ex + (gx - ex) * t
        by = ey - 1 - (ey - 1 - (gy + R - 1)) * t
        spread = 1 if t > 0.5 else 0
        c.set(int(round(bx)), int(round(by)), "o")
        if spread:
            c.set(int(round(bx)) - 1, int(round(by)), "O")
    # emitter nub on the ridge
    c.set(ex, ey, "o"); c.set(ex, ey - 1, "O"); c.set(ex - 1, ey, "r")

    # --- the glass SPHERE (translucent c body, h rim glint UL, G crescent LR) ---
    disc(c, gx, gy, R, R, "c")
    # lit upper-left wash
    for yy in range(-R, 1):
        for xx in range(-R, 1):
            if (xx / R) ** 2 + (yy / R) ** 2 <= 0.7:
                c.set(gx + xx, gy + yy, "h")
    # shaded lower-right crescent
    for yy in range(0, R + 1):
        for xx in range(0, R + 1):
            d = (xx / R) ** 2 + (yy / R) ** 2
            if 0.55 <= d <= 1.0:
                c.set(gx + xx, gy + yy, "G")
    # bright h rim glint upper-left
    c.set(gx - R + 2, gy - R + 3, "W")
    c.set(gx - R + 3, gy - R + 2, "h")

    # --- tiny BIOME inside: a bold flat-topped hill mound, one chunky tree, one
    # cloud — kept HIGH-CONTRAST and minimal so it reads inside the small sphere. ---
    # green hill mound across the lower half (dark D so it pops on the c/h glass)
    for xx in range(-4, 5):
        c.set(gx + xx, gy + 3, "D")
    for xx in range(-3, 4):
        c.set(gx + xx, gy + 2, "D")
    c.set(gx - 1, gy + 2, "d"); c.set(gx + 2, gy + 2, "d")   # mound shading
    # a single chunky tree on the mound (left of center so it's clear of the trunk)
    c.set(gx - 2, gy + 1, "d")          # trunk
    c.set(gx - 2, gy + 0, "d")
    c.set(gx - 3, gy - 1, "D")          # canopy block
    c.set(gx - 2, gy - 1, "M"); c.set(gx - 1, gy - 1, "D")
    c.set(gx - 2, gy - 2, "O")          # bright canopy crown dot
    # one h cloud puff drifting upper-right
    c.set(gx + 2, gy - 2, "h"); c.set(gx + 3, gy - 2, "W"); c.set(gx + 1, gy - 2, "h")

    # --- orbit FRONT arc (in front of the sphere): the lower half of the ellipse —
    # bright g so the orbit band reads, crossing only the lower rim (not the biome) ---
    ring(c, gx, gy, ORX, ORY, "g", a0=0, a1=180)
    # the orbit's outer wing tips (past the sphere rim) get a brighter c glint
    for a in (8, 172):
        wx = gx + ORX * math.cos(math.radians(a))
        wy = gy + ORY * math.sin(math.radians(a))
        c.set(int(round(wx)), int(round(wy)), "c")
    # a single bright O glint travelling on the orbit (front-right of the band)
    ang = math.radians(35)
    ox = gx + ORX * math.cos(ang)
    oy = gy + ORY * math.sin(ang)
    c.set(int(round(ox)), int(round(oy)), "O")
    c.set(int(round(ox)) - 1, int(round(oy)), "o")


def main():
    c = Canvas()
    # painter's order: body+walls, knee-wall, glazing, gable roof (behind globe),
    # the LEFT entrance + planters, then the floating globe last (in front of all).
    b = hall(c)
    knee = knee_wall(c, b)
    glaze_walls(c, b, knee)
    ridge_back, ridge_front = gable_roof(c, b)
    entrance(c, b, knee)
    terrarium_globe(c, ridge_back, ridge_front)

    spec = {"width": 64, "height": 64, "palette": BIO, "rows": c.rows()}
    out = "/path/to/scienium/art/src/buildings/biocore_greenhouse.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    main()
