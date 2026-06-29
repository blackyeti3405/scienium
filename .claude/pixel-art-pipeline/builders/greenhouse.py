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

# Base BioCore palette (shared keys) + a few EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so greenhouse.png is unchanged).
# Where Volt's evolved glow was electric cyan, BioCore's is BIO-LUMINESCENT — a
# living-systems green-teal bloom — so a maxed building reads as a glowing
# conservatory, not a power plant:
#   b  deep mossy bark-green  — matured structure tone for t3+ new masses/frames
#   e  bioluminescent glow (mid)   E  bioluminescent glow (bright) — the t4/t5 life-glow
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
BIO = {"K": "#1a2417", "W": "#e8f2d8", "L": "#c4dba6", "M": "#9fc07e", "D": "#6f9456", "d": "#4a6e3a",
       "h": "#d2f7ec", "c": "#9fefcf", "g": "#36cc9e", "G": "#1d8f70",
       "o": "#f0b24d", "O": "#ffd488", "r": "#b9701e",
       "b": "#2f4a2a", "e": "#74f0b6", "E": "#ccffe4", "q": "#f3c63a"}


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


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS cultivation /
# bio-glow structure onto the prior glasshouse — never restarts, never recolors the
# whole building. Theme: the starter greenhouse grows into a fully built-out, glowing
# VERTICAL-FARM CONSERVATORY. Colours mature stage by stage (matured bark-green `b`,
# bio-luminescent `e/E`); gold (`q`) only as a t5 flourish. Every addition is anchored
# OFF the hall/ridge geometry and kept clear of the floating TERRARIUM GLOBE signature
# (which hovers high, front-centre, above the ridge).
#
#   t2  small functional add   : a rainwater CISTERN + drip-irrigation line on the lit eave
#   t3  structural add         : a lean-to COLD-FRAME propagation annex off the front gable
#   t4  major add              : a tall HYDROPONIC GROW-TOWER of lit planter trays, right side
#   t5  crowning feature       : a BIOLUMINESCENT CANOPY (vines + spore-glow swarm) + gold trim
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_cistern(c, b, knee):
    """t2 — SMALL FUNCTIONAL ADD: a chunky RAINWATER CISTERN water-butt standing in the open
    FRONT-LEFT ground beside the hall, fed by a slim downspout off the lit eave. On-theme (water
    for the plants), modest, base palette + one brightened `o` float-gauge dot. Earlier the butt sat
    too low and cramped against the bottom edge + planter bed; here it's a proper upright TANK built
    with the `cylinder` primitive (clean domed top + lit/shaded curved sides read instantly as a
    vessel), lifted so it stands clear in the open foreground-left — distinct, not a streak."""
    from isobuild import cylinder
    # tank centre in the open front-left ground, LEFT of the hero door + planters and lifted off the
    # very bottom edge so the whole barrel is visible. cx,top_y = centre of the top ellipse.
    cx, top_y, RXc, Hc = 17, 44, 4, 8
    # a soft contact-shadow ellipse on the ground first (anchors the tank to the plot)
    for dx in range(-RXc, RXc + 1):
        c.set(cx + dx, top_y + Hc + 3, "d")
    # the tank body: light teal `c` top + lit `c` / shaded `g` curved walls (water vessel)
    cyl = cylinder(c, cx, top_y, RXc, Hc, top="c", side_l="c", side_r="g", outline="K")
    c.line((cx + RXc, top_y + 1), (cx + RXc, top_y + Hc - 1), "G")   # darkest right edge
    for yy in (top_y + 3, top_y + 6):                                # two D hoop bands
        for dx in range(-RXc + 1, RXc):
            c.set(cx + dx, yy, "d")
    # bright water sheen + an open-lid glint on the domed top
    c.set(cx - 1, top_y - 1, "h"); c.set(cx, top_y - 1, "W")
    c.set(cx + RXc - 1, top_y + 4, "o")                              # float-gauge dot (brightened)
    # slim downspout: taps the lit eave near the LEFT corner and drops down into the tank top — kept
    # short + nearly above the tank so it reads as one clean feed, not a stray vertical.
    sp = b.left_pt(0.06, 1.8)
    spx, spy = int(round(sp[0])), int(round(sp[1]))
    c.line((spx, spy), (spx, spy + 2), "D")                         # short gutter stub off the eave
    c.line((spx, spy + 2), (cx, spy + 2), "D")                      # elbow over to above the tank
    c.line((cx, spy + 2), (cx, top_y - 1), "D")                     # drop into the tank
    c.set(spx, spy + 2, "L")                                        # elbow glint
    c.set(cx, top_y - 1, "h")                                       # water entering the butt


def stage3_coldframe(c, b):
    """t3 — STRUCTURAL ADD: a COLD-FRAME propagation box — a real 3-D garden cloche sitting in
    the OPEN GROUND just to the RIGHT of the hall's front-right corner. Earlier this read as a flat
    floating teal shard; rebuilt here as a proper little structure with VOLUME: a chunky matured
    bark-green `b` raised earth-bed (front wall + right wall, with a dark soil top), and a SLANTED
    GLAZED SASH LID that springs LOW at the front up to a TALL back rail (so the pitch reads as a
    lid, not a lozenge), with two sash bars + a row of seedlings visible under the glass. A ground
    contact-shadow anchors it so it sits ON the plot. Placed lower-right (x~46..60, y~43..54) clear
    of the hall's base diamond and the floating globe; the t4 grow-tower rises just behind its right
    edge. Introduces the matured bark-green tone `b`."""
    # Compact peaked cloche pulled OUT into the clear ground to the RIGHT of the hall (hall's
    # front-right corner is r_right≈(54,39)/w_right≈(54,49)); footprint ~x53..63, y47..57 so it
    # stands on open plot, not under the hall. Deeper `g` glass + a hard bright frame so it READS
    # as its own little structure (not the hall's bright-`c` roof glazing it would otherwise blend
    # into). The t4 tower rises just behind its back-left edge.
    # --- ground contact-shadow first (a short bar, anchors it to the plot) --------------------
    for sx in range(54, 63):
        c.set(sx, 57, "d")
    # --- raised EARTH-BED: a chunky bark-green box (front wall + right return) -----------------
    bedTopL = (53, 51)      # front-top-left of the bed
    bedTopR = (61, 54)      # front-top-right (steps down-right in iso)
    bedH = 3
    bedBL = (bedTopL[0], bedTopL[1] + bedH)
    bedBR = (bedTopR[0], bedTopR[1] + bedH)
    c.fill_poly([bedTopL, bedTopR, bedBR, bedBL], "b")            # lit front wall (bark-green)
    rTopR = (bedTopR[0] + 1, bedTopR[1] + 1)                       # narrow right return
    rBR = (rTopR[0], rTopR[1] + bedH)
    c.fill_poly([bedTopR, rTopR, rBR, bedBR], "d")               # shaded right return wall
    c.line(bedTopL, bedTopR, "D")                                  # lit bed rail (front lip)
    for a, d in [(bedTopL, bedBL), (bedBL, bedBR), (bedBR, rBR), (rBR, rTopR), (rTopR, bedTopR)]:
        c.line(a, d, "K")                                          # crisp box outline
    # --- STEEP GLAZED SASH LID — springs LOW at the front sill UP to a TALL hinge rail ---------
    frL, frR = bedTopL, bedTopR                                    # front sill rail (low, near)
    LIFT, BACK = 7, 1                                              # tall lift -> the pitch reads
    brL = (frL[0] + BACK, frL[1] - LIFT)                           # hinge rail left  (high, far)
    brR = (frR[0] + BACK, frR[1] - LIFT)                           # hinge rail right (high, far)
    # left short gable end (lit, deeper green) closes the wedge -> reads as a 3-D peaked box
    c.fill_poly([frL, brL, (brL[0] - 1, brL[1] + 1), (frL[0] - 1, frL[1] + 1)], "G")
    c.fill_poly([frL, brL, brR, frR], "g")                        # glazed sash plane (DEEPER teal)
    # one calm c sky-glint stripe along the very top (hinge) edge only — tight, no smear
    c.line((brL[0], brL[1] + 1), (brR[0], brR[1] + 1), "c")
    # two sash glazing bars running down-slope + one transom (reads as framed panes)
    for t in (0.40, 0.72):
        c.line(lerp(brL, brR, t), lerp(frL, frR, t), "G")
    c.line(lerp(brL, frL, 0.5), lerp(brR, frR, 0.5), "G")
    for a, d in [(frL, frR), (frR, brR), (brR, brL), (brL, frL)]:
        c.line(a, d, "K")                                          # crisp sash frame
    c.line(brL, brR, "W")                                          # bright sun-hit hinge rail
    c.line(frL, frR, "D")                                          # shaded front sill rail
    # --- two SEEDLINGS poking up at the open front lip (M/g, on the dark soil) ------------------
    for k, t in enumerate((0.32, 0.66)):
        p = lerp(frL, frR, t)
        px, py = int(round(p[0])), int(round(p[1]))
        c.set(px, py, "M"); c.set(px, py - 1, "g" if k else "M")


def stage4_growtower(c, b):
    """t4 — MAJOR ADD: a tall HYDROPONIC GROW-TOWER rising out of the t3 cold-frame on the RIGHT,
    so the two read as one nursery (low frame + tall tower above it). A slim deep bark-green `b`
    frame carries a vertical stack of chunky planter TRAYS, each a bright bio-luminescent `e`
    grow-bar with `M/g/G` foliage bushing over the lip, climbing well above the eave. The prominent
    new vertical mass: 'this greenhouse now farms upward'. Palette matures to deep `b` + energized
    bio-glow `e/E`. Kept fully on-canvas (frame at x~50..54) and well to the RIGHT of the
    front-centre globe so it never occludes the signature."""
    # the tower rises just BEHIND the cold-frame's back-right edge (cold-frame inLo≈(58,48)), so the
    # frame stays visible in front of the tower foot at higher stages.
    fx = 53                                                  # left upright of the tower frame
    base_y = 47                                              # foot seats at the cold-frame back edge
    top_y = 13                                               # TALL — climbs well above the eave
    # twin upright frame (lit bark-green left edge + K shaded right edge), 4px wide
    c.line((fx, base_y), (fx, top_y), "b")
    c.line((fx + 3, base_y), (fx + 3, top_y), "K")
    c.line((fx, top_y), (fx + 3, top_y), "b")               # top cross-rail
    c.set(fx, base_y, "K"); c.set(fx + 3, base_y, "K")      # feet
    # a thin nutrient feed-pipe rising up the lit edge of the frame (c water in the line)
    c.line((fx + 1, base_y - 1), (fx + 1, top_y + 1), "c")
    # stacked planter trays climbing the frame — chunky glowing grow-bars bushing with foliage.
    rows = list(range(top_y + 3, base_y - 1, 5))
    for k, ty in enumerate(rows):
        glow = "E" if k == 0 else "e"                       # top tray is the brightest
        c.line((fx - 1, ty), (fx + 4, ty), "D")             # tray pan lip
        c.line((fx - 1, ty + 1), (fx + 4, ty + 1), glow)    # bio-luminescent grow-bar
        c.set(fx - 1, ty, "K"); c.set(fx + 4, ty, "K")
        # foliage bushing UP+OVER the tray (alternate the heavier overhang side)
        ov = 5 if k % 2 == 0 else -1
        leafx = max(0, min(63, fx + ov))
        c.set(leafx, ty - 1, "M")
        c.set(max(0, min(63, fx + 1)), ty - 1, "g")
        c.set(max(0, min(63, fx + 2)), ty - 1, "G")
        c.set(leafx, ty, "g")
    # a soft bio-glow halo behind the top (brightest) tray, selling the energized grow-light
    for dx, dy in [(-2, 2), (5, 2), (1, -2), (2, -2), (3, -1)]:
        gx2, gy2 = fx + dx, top_y + 3 + dy
        if 0 <= gx2 <= 63 and 0 <= gy2 <= 63:
            c.set(gx2, gy2, "e")


def stage5_canopy(c, b, ridge_back, ridge_front):
    """t5 — CROWNING FEATURE = FULLY EVOLVED conservatory. The whole glasshouse comes alive: a
    BIOLUMINESCENT canopy of climbing VINES laces up the gable, a drifting swarm of glowing `E`
    pollinator spores rises off the ridge, and the building is dressed with GOLD premium trim —
    gold finial caps on the two ridge ends, a gold ridge-crest medallion, and a gold planter-rail
    boss at the entrance. Reads as elite, still recognizably the same greenhouse, just maxed out.
    All gold (`q`) lives ONLY here. Vines climb the t4 GROW-TOWER + lace the lit-left eave; the
    spore swarm rises to the SIDES of the front-centre globe so the signature is never crowded."""
    # --- climbing BIOLUMINESCENT VINE up the t4 grow-tower (fx≈53, top_y≈13..base_y≈47) so the
    #     tower reads fully overgrown — a serpentine stem with leaves + glowing `e` buds. ---
    vfx = 53
    for k, vy in enumerate(range(46, 13, -1)):
        wob = (k % 4)                                        # gentle left-right serpentine
        vx = max(0, min(63, vfx - 1 + (1 if wob in (1, 2) else 0)))
        c.set(vx, vy, "G" if k % 2 else "g")               # vine stem laced on the tower
        if k % 3 == 0:                                       # a leaf to one side
            c.set(max(0, min(63, vx - 1)), vy, "M")
        if k % 5 == 2:                                       # a glowing bud node
            c.set(max(0, min(63, vx + 1)), vy, "e")
    # --- a low trim of vine + glowing buds laced along the LIT-LEFT eave (clean, near the top of
    #     the lit glazing) so the whole front edge reads as flowering, well clear of the globe. ---
    for u in (0.16, 0.30, 0.44, 0.58, 0.72):
        p = b.left_pt(u, 1.7)
        px, py = int(round(p[0])), int(round(p[1]))
        c.set(px, py, "g")                                   # leaf cluster on the eave
        c.set(px, py - 1, "e")                               # glowing bud above it
    # --- BIOLUMINESCENT SPORE SWARM of glowing motes drifting UP off the gable into the empty
    #     dark sky FLANKING the globe (the globe centre is ~12px above the ridge, radius ~6, so its
    #     halo reaches x±10; place spores WIDER than that so they read as discrete glowing motes,
    #     not part of the halo). Each mote = a bright `E` core with a faint `e` trail, dark gaps
    #     between them so they stay crisp. ---
    em = lerp(ridge_back, ridge_front, 0.42)
    ex, ey = int(round(em[0])), int(round(em[1]))
    spores = [(-13, -6), (-15, -11), (-12, -15), (-16, -17),
              (13, -4), (16, -8), (13, -13), (17, -15), (14, -19)]
    for dx, dy in spores:
        sx, sy = ex + dx, ey + dy
        if 0 <= sx <= 63 and 0 <= sy <= 63:
            c.set(sx, sy, "E")                               # bright mote core
            if 0 <= sy + 1 <= 63:
                c.set(sx, sy + 1, "e")                       # short downward trail

    # --- GOLD premium trim (t5 flourish ONLY) — clear, continuous, premium. Three reads: a solid
    #     gold CRESTING RAIL capping the ridge beam, a gold EAVE-TRIM line along the lit-left eave,
    #     and a gold ridge-end FINIAL at the front. Continuous gold lines register as 'elite trim'
    #     far better than scattered single studs (which read as noise). ---
    # 1) gold cresting rail along the ridge beam (just under the globe) — a 2px-thick gold band so
    #    it clearly reads as a premium ridge cap, with a couple of bright O finial bumps on it.
    cr0 = lerp(ridge_back, ridge_front, 0.16)
    cr1 = lerp(ridge_back, ridge_front, 0.88)
    c.line((cr0[0], cr0[1] - 1), (cr1[0], cr1[1] - 1), "q")  # gold cap rail (upper line)
    c.line((cr0[0], cr0[1]), (cr1[0], cr1[1]), "r")          # warm shadow under the rail
    for t in (0.30, 0.60, 0.84):                              # bright finial bumps on the crest
        cp = lerp(ridge_back, ridge_front, t)
        c.set(int(round(cp[0])), int(round(cp[1])) - 2, "O")
    # 2) gold ridge-END finial at the visible FRONT end (a small bright spire cap)
    rx, ry = int(round(ridge_front[0])), int(round(ridge_front[1]))
    c.set(rx, ry - 1, "q"); c.set(rx, ry - 2, "O"); c.set(rx, ry - 3, "q")
    # 3) gold EAVE-TRIM line running the lit-left eave (under the flowering vine), a clean premium
    #    fascia band the full length of the lit face — the most legible 'maxed out' tell.
    c.line(b.left_pt(0.06, 1.2), b.left_pt(0.94, 1.2), "q")  # gold fascia line
    c.set(int(round(b.left_pt(0.5, 1.2)[0])), int(round(b.left_pt(0.5, 1.2)[1])) - 1, "O")  # centre boss
    # 4) a small gold lintel cap over the hero ENTRANCE door (matches door centre u≈0.53)
    pb = b.left_pt(0.53, 2.0)
    pbx, pby = int(round(pb[0])), int(round(pb[1]))
    c.line((pbx - 2, pby), (pbx + 2, pby), "q")              # gold door-head lintel
    c.set(pbx, pby - 1, "O")                                 # bright boss at its centre


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the greenhouse at upgrade `stage` (1..5). Stage 1 is IDENTICAL to the shipped
    base; each higher stage keeps every prior addition and bolts on the next (t2 cistern →
    t3 cold-frame → t4 grow-tower → t5 bioluminescent canopy+gold). Painter's order keeps the
    floating globe LAST (in front of all), and each rooftop/eave addition is drawn after the
    masses it grows from."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    # painter's order: body+walls, knee-wall, glazing, gable roof (behind globe),
    # the LEFT entrance + planters; the floating globe is drawn LAST, after the stages,
    # so nothing ever occludes the signature.
    b = hall(c)
    knee = knee_wall(c, b)
    glaze_walls(c, b, knee)
    ridge_back, ridge_front = gable_roof(c, b)
    entrance(c, b, knee)

    # --- CUMULATIVE UPGRADE STAGES (drawn before the globe so the globe stays on top) --
    if stage >= 2:
        stage2_cistern(c, b, knee)
    if stage >= 3:
        stage3_coldframe(c, b)
    if stage >= 4:
        stage4_growtower(c, b)
    if stage >= 5:
        stage5_canopy(c, b, ridge_back, ridge_front)

    # --- SIGNATURE LAST: the floating terrarium globe, in front of everything ----------
    terrarium_globe(c, ridge_back, ridge_front)
    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/biocore"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "greenhouse"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG + scaled
    preview to the manifest paths. Stage 1 only re-emits the JSON; it must keep matching the
    shipped greenhouse.png, so it does NOT overwrite the base PNG."""
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
