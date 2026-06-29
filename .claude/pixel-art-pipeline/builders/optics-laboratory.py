#!/usr/bin/env python3
"""
Optics Laboratory — Axiom lab economy building (BESPOKE form, STANDARD role).

A LOW OPTICS HALL with a raised glazed CLERESTORY MONITOR ridge. The body is a
low, wide square-on-ground `Box` (a precision instrument room kept dark and
stable inside) and running along the centre of its flat roof is a long narrow
raised `Box` — the clerestory monitor — its long lit-LEFT side glazed in a
c/g ribbon of light-slots via `Box.window` with soft mullions and a flat L/W
cap. Horizontal, calm, glassy — distinct from the gateway cube; the stepped-up
glazed roof monitor keeps it from being confused with a plain flat hall.

  • OPENING SIDE = LEFT: the hero is a wide K-framed dark-room LOADING BAY on the
    LIT LEFT face — one big g/h glass roll-shutter pane (Box.window, h reflections)
    with an o ready-light, plus a K-framed door alongside. The shaded RIGHT face
    stays plain: bare M/D wall + a thin D cable conduit + one small Box.louver vent.
  • SIGNATURE (one-of-one): a rooftop INTERFEROMETER. On a small breadboard slab
    beside the monitor, a gold laser beam is emitted from a r/o laser head and
    zig-zags in clean 90° turns off little L/W mirror squares, passing through a
    c/h lens disc, until the split beams recombine into a glowing RING of
    concentric interference fringes (nested O/o/c rings, bright O centre) on a
    small K/d screen — the bullseye the lab "configures". An c/o alignment knob
    with an o "ALIGNED" dot sits beside it. Deliberately NOT a prism-spectrum:
    this is a laser bouncing between mirrors making circular fringes.

Composed from art/isobuild.{Box} — NO iso.draw_cube / base_windows.
Axiom palette ONLY (deep-navy walls, navy-night-sky glass, GOLD starlight glints).
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

# Axiom set palette — author on these chars exactly (<=16 colors).
# Base keys (shared across all 10 Axiom buildings) + the four LAB-WIDE EVOLVED accent
# shades reserved for the upgrade stages ONLY (they never appear in stage 1, so the
# shipped optics-laboratory.png is unchanged). These exact chars+hexes are the Axiom
# convention every building's _t2.._t5 reuses (see axiom-evolution-plan.md):
#   b  deep indigo steel   — matured structure tone for t3+ new masses
#   e  quantum-stellar glow (mid)    E  quantum-stellar glow (bright) — t4/t5 energy
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
AXIOM = {"K": "#0e1124", "W": "#dfe6f6", "L": "#b4bee0", "M": "#7c88b8", "D": "#4e5888", "d": "#333a60",
         "h": "#d6ecff", "c": "#aad8ff", "g": "#4a9ce6", "G": "#2060b0",
         "o": "#ffe27a", "O": "#fff3c0", "r": "#c89a2a",
         "b": "#2a3158", "e": "#7ad0ff", "E": "#cdeeff", "q": "#f6c945"}


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


def _seg_pts(a, b):
    """Integer Bresenham pixel list from a to b, no gaps."""
    x0, y0 = int(round(a[0])), int(round(a[1]))
    x1, y1 = int(round(b[0])), int(round(b[1]))
    dx, dy = abs(x1 - x0), abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy
    pts = []
    while True:
        pts.append((x0, y0))
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x0 += sx
        if e2 < dx:
            err += dx
            y0 += sy
    return pts


def beam_path(c, nodes, core, skip=None):
    """One clean, continuous, single-pixel gold zig-zag threaded through `nodes`
    (laser -> mirrors -> ring). No glow halo, no parallel strands — every gold
    pixel sits ON the path, so the beam reads as one unbroken light-line with
    zero stray off-beam dots scattered on the roof deck. `skip(x, y)` masks out
    pixels that fall on a component face (mirror silver / ring disc) so the beam
    arrives cleanly at each edge without defacing the squares it bounces off."""
    path = []
    for i in range(len(nodes) - 1):
        seg = _seg_pts(nodes[i], nodes[i + 1])
        path += seg if i == 0 else seg[1:]   # de-dup shared joins -> continuous
    for (x, y) in path:
        if 0 <= x < 64 and 0 <= y < 64 and not (skip and skip(x, y)):
            c.set(x, y, core)


# ── VERTICAL BUDGET (top→bottom, all must fit 64px) ───────────────────────────
#   interferometer hero    y ~ 6..22   (laser path + fringe ring on the roof deck)
#   clerestory monitor     y ~ 13..24  (rides the centre ridge of the body roof)
#   body roof              back corner y ~ 18 .. front corner y ~ 31
#   body walls             y ~ 31..44
#   drop shadow            y ~ 44..47
# ── BODY GEOMETRY (low + wide: a calm precision instrument hall) ──────────────
BODY_TOP = (29, 18)     # back-top corner; wide footprint fans down-left/down-right
BODY_WX = 13            # long toward the right corner
BODY_WY = 9             # shorter toward the left corner -> a wide hall, not a cube
BODY_H = 12             # LOW walls


# ── BODY (low wide optics hall) ──────────────────────────────────────────────
def body(c):
    """Low wide Box — deep-navy M/D walls, calm flat roof with a faint seam grid.
    Returns the Box for face + ridge placement."""
    b = Box(BODY_TOP, BODY_WX, BODY_WY, BODY_H)
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # quiet roof seam grid (precision-floor feel) running both roof axes
    for f in (0.34, 0.66):
        c.line(b.roof_pt(0.0, f), b.roof_pt(1.0, f), "M")
    c.line(b.roof_pt(0.5, 0.0), b.roof_pt(0.5, 1.0), "M")

    # crisp corner seams down the faces
    c.line(b.r_front, b.w_front, "d")                        # front corner (deep)
    c.line(b.left_pt(0.0, 0), b.left_pt(0.0, BODY_H), "D")   # left back jamb
    c.line(b.right_pt(1.0, 0), b.right_pt(1.0, BODY_H), "d")
    return b


# ── LEFT dark-room loading bay (the HERO opening) ────────────────────────────
def loading_bay(c, b):
    """A wide K-framed dark-room loading bay filling most of the LIT LEFT face: a
    big g/h glass roll-shutter pane (one large pane, soft mullions, h reflection
    sweep) with a small o/O ready-light, plus a K-framed door at the left end.
    Marks the opening side as LEFT."""
    # ---- the roll-shutter glass pane (right portion of the left face) ----
    u0, u1 = 0.37, 0.93
    vt, vb = 2.4, BODY_H - 0.9

    # K outer frame
    c.fill_poly([b.left_pt(u0, vt), b.left_pt(u1, vt),
                 b.left_pt(u1, vb), b.left_pt(u0, vb)], "K")
    # one big GLASS pane that reads as glass (window helper: reflection gradient,
    # diagonal shine, soft sparse mullions — never a black-barred grid)
    b.window(c, "left", u0 + 0.03, u1 - 0.03, vt + 0.9, vb - 0.5,
             glass="g", hi="h", shade="G", frame="K", mullions=2, sheen="W")
    # ONE clean roll-shutter slat seam across the upper third (D, soft not black)
    sv = vt + (vb - vt) * 0.30
    c.line(b.left_pt(u0 + 0.04, sv), b.left_pt(u1 - 0.04, sv), "D")

    # o/O READY-LIGHT just above the bay (gold accent, the lab armed)
    rl = b.left_pt(u1 - 0.07, vt - 0.9)
    rx, ry = int(round(rl[0])), int(round(rl[1]))
    c.set(rx, ry, "o")
    c.set(rx - 1, ry, "O")
    c.set(rx, ry - 1, "O")

    # ---- the K-framed DOOR at the left end of the face ----
    d0, d1 = 0.07, 0.30
    dvt, dvb = 3.6, BODY_H - 0.3
    c.fill_poly([b.left_pt(d0, dvt), b.left_pt(d1, dvt),
                 b.left_pt(d1, dvb), b.left_pt(d0, dvb)], "K")
    di = 0.025
    c.fill_poly([b.left_pt(d0 + di, dvt + 0.7), b.left_pt(d1 - di, dvt + 0.7),
                 b.left_pt(d1 - di, dvb - 0.3), b.left_pt(d0 + di, dvb - 0.3)], "D")
    # slim c glazed slot in the door + threshold sheen
    c.fill_poly([b.left_pt(d0 + 0.05, dvt + 1.1), b.left_pt(d1 - 0.05, dvt + 1.1),
                 b.left_pt(d1 - 0.05, dvt + 3.4), b.left_pt(d0 + 0.05, dvt + 3.4)], "c")
    c.line(b.left_pt(d0 + 0.05, dvt + 1.1), b.left_pt(d1 - 0.05, dvt + 1.1), "h")


def right_face(c, b):
    """The plainer shaded RIGHT face: bare M/D wall, one small Box.louver vent +
    a thin D cable conduit dropping the corner — no glazing (opening is LEFT)."""
    # one small opaque louver vent (reads as a vent, not glass)
    b.louver(c, "right", 0.22, 0.46, 3.0, BODY_H - 2.4,
             body="d", slat="K", edge="D", frame="K")
    # D cable conduit dropping the right end of the face
    cu = 0.88
    c.line(b.right_pt(cu, 1.5), b.right_pt(cu, BODY_H - 0.5), "D")
    c.line(b.right_pt(cu + 0.02, 1.5), b.right_pt(cu + 0.02, BODY_H - 0.5), "d")
    # two small clamp dots on the conduit
    for fv in (0.30, 0.62):
        p = b.right_pt(cu, 1.5 + (BODY_H - 2.0) * fv)
        c.set(int(round(p[0])) - 1, int(round(p[1])), "K")


# ── CLERESTORY MONITOR (long narrow glazed ridge on the roof) ────────────────
def clerestory(c, b):
    """A long narrow raised Box along the centre of the body roof — its long
    LIT-LEFT side glazed in a c/g ribbon of light-slots via Box.window (a FEW
    larger panes, soft mullions), flat L/W cap. Returns the monitor Box so the
    interferometer bench can be anchored on the roof deck beside it."""
    # seat the monitor on the roof centre-line, raised; long axis = body's long
    # (wx) axis so it reads as a ridge slot, narrow in wy.
    m_top = (BODY_TOP[0] - 4, BODY_TOP[1] - 5)  # lifted above + slid along ridge
    m = Box(m_top, wx=9, wy=3, h=4)
    m.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # flat W cap sheen along the back roof edge
    c.line(m.roof_pt(0.0, 0.5), m.roof_pt(1.0, 0.5), "W")

    # ---- c/g RIBBON GLAZING along the long LIT-LEFT side (light-slots) ----
    # one continuous glass band via the window helper -> reads as glass, with a
    # FEW soft mullions splitting it into light-slots (never harsh K bars).
    b_window = m.window
    b_window(c, "left", 0.06, 0.94, 0.9, m.h - 0.6,
             glass="g", hi="h", shade="G", frame="K", mullions=4, sheen="W")
    # brighten the lit end of the ribbon so the night-sky glass glows lit-left
    c.fill_poly([m.left_pt(0.07, 1.1), m.left_pt(0.26, 1.1),
                 m.left_pt(0.26, m.h - 1.0), m.left_pt(0.07, m.h - 1.0)], "c")
    c.line(m.left_pt(0.07, 1.2), m.left_pt(0.94, 1.2), "h")
    return m


# ── SIGNATURE: rooftop laser interferometer (zig-zag -> fringe ring) ──────────
def interferometer(c, b, m, stage=1):
    """A small optical-bench breadboard on the roof deck, FRONT-RIGHT of the
    clerestory monitor, running a gold laser that zig-zags off mirror squares,
    through a lens disc, recombining into a glowing ring of concentric
    interference fringes. The one-of-one signature.

    `stage` only adds the t2 beam-splitter RELAY (an extra mirror + a short gold
    relay leg) ON the same bench — stage 1 draws exactly the shipped bench."""
    # ---- breadboard slab seated along the FRONT-RIGHT roof deck (in front of the
    # clerestory monitor), running the optical path; sits clearly ON the roof ----
    s_back = b.roof_pt(0.66, 0.42)      # back-top corner of the bench on the deck
    bx0, by0 = int(round(s_back[0])), int(round(s_back[1]))
    # a long low D/M K-outlined iso slab (a breadboard, lit-left top)
    s_t = (bx0, by0)
    s_r = (bx0 + 13, by0 + 6)
    s_f = (bx0 + 9, by0 + 9)
    s_l = (bx0 - 4, by0 + 3)
    c.fill_poly([s_t, s_r, s_f, s_l], "M")              # lit breadboard top
    c.fill_poly([s_t, s_l, s_f], "D")                   # shaded back-left wedge
    for a, bb in [(s_t, s_r), (s_r, s_f), (s_f, s_l), (s_l, s_t)]:
        c.line(a, bb, "K")
    # faint breadboard seam + tiny K post-mounts dotting the bench
    c.line((bx0 - 2, by0 + 3), (bx0 + 11, by0 + 7), "d")
    for px, py in ((bx0 - 1, by0 + 2), (bx0 + 4, by0 + 4), (bx0 + 9, by0 + 6)):
        c.set(px, py, "K")

    # ---- the optical path: a BOLD, CONTINUOUS, MONOTONIC zig-zag so the
    # interferometer reads at a glance as "laser bouncing between mirrors INTO the
    # ring". Every leg marches up-LEFT toward the ring (no crossing / backtrack) —
    # one unbroken gold light-path the eye follows from the laser, through three
    # clean mirror turns and the lens, straight into the fringe ring:
    #   laser (front-right) ==leg1, flat up-LEFT along the bench== mirror A
    #   mirror A ==leg2, step up-LEFT (the bounce)=============== mirror B
    #   mirror B ==leg3, up-LEFT through the lens disc=========== mirror C
    #   mirror C ==leg4, straight up-LEFT into the fringe RING=== screen
    # mirrors respaced so their 5x5 footprints never chain together — the gold
    # beam now shows a clean segment on every leg instead of being buried, while
    # each mirror square keeps the exact same silver/K/glint look as before.
    laser  = (bx0 + 14, by0 + 5)        # r/o laser head, FRONT-RIGHT end of bench
    mirA   = (bx0 + 6, by0 + 4)         # mirror 1: flat leg left along the bench
    mirB   = (bx0 + 4, by0 - 4)         # mirror 2: step UP (the bounce)
    mirC   = (bx0 - 4, by0 - 4)         # mirror 3: flat leg LEFT, feeds the ring
    lensC  = (bx0,      by0 - 4)        # lens disc inline on the mirB->mirC leg
    screen = (bx0 - 9, by0 - 9)         # fringe-ring screen, up-left in open sky

    # (the gold beam itself is drawn LAST — after the mirrors / lens / ring — as
    #  one continuous single-pixel zig-zag that stops cleanly at each component
    #  edge, so the squares and ring stay exactly as-is and no stray gold lands on
    #  the roof deck. See beam_path(...) at the end of this function.)

    # ---- the LASER HEAD: a small r/o emitter block with a bright O aperture ----
    lx, ly = laser
    c.fill_poly([(lx - 1, ly - 1), (lx + 2, ly - 1), (lx + 2, ly + 1), (lx - 1, ly + 1)], "r")
    c.set(lx, ly - 1, "o")              # lit crest
    c.set(lx + 1, ly - 1, "o")
    for ax, ay in [(lx + 3, ly - 1), (lx + 3, ly), (lx + 3, ly + 1),
                   (lx - 1, ly - 2), (lx, ly - 2), (lx + 1, ly - 2), (lx + 2, ly - 2),
                   (lx - 1, ly + 2), (lx, ly + 2), (lx + 1, ly + 2), (lx + 2, ly + 2),
                   (lx - 2, ly - 1), (lx - 2, ly), (lx - 2, ly + 1)]:
        c.set(ax, ay, "K")
    c.set(lx - 1, ly, "O")              # bright emitting aperture (fires left)

    def mirror(mx, my):
        """A clean L/W mirror square — K-edged, lit-left silver face, a gold beam
        glint where the laser strikes it. Drawn AFTER the beam so each square caps
        its turn and the bounce reads crisply."""
        for dx in range(-1, 2):         # 3x3 silver face
            for dy in range(-1, 2):
                c.set(mx + dx, my + dy, "L")
        c.set(mx, my - 1, "W")          # lit top-left face highlights
        c.set(mx - 1, my, "W")
        c.set(mx - 1, my - 1, "W")
        c.set(mx + 1, my + 1, "M")      # shaded lower-right
        for dx, dy in ((-2, -1), (-2, 0), (-2, 1), (2, -1), (2, 0), (2, 1),
                       (-1, -2), (0, -2), (1, -2), (-1, 2), (0, 2), (1, 2)):
            c.set(mx + dx, my + dy, "K")
        c.set(mx + 1, my - 1, "o")      # gold glint where the beam strikes

    # three clean mirror squares cap the three beam turns (lens rides mirror B)
    mirror(*mirA)
    mirror(*mirB)
    mirror(*mirC)

    # ---- t2 RELAY (cumulative): an extra beam-splitter mirror added to the bench,
    # tapping a SHORT gold relay leg off mirror A down-front to a 4th mirror square,
    # ending in a small o "ALIGNED" dot — the interferometer arm grows by one bounce.
    # Authored here (not as a free function) so it sits ON the bench with the others
    # and the relay beam is masked + drawn alongside the main beam below. ----
    relay = None
    if stage >= 2:
        mirD = (bx0 + 10, by0 + 6)      # 4th mirror, in the FRONT pocket of the bench,
                                        # set DOWN-front of mirA so the split arm reads as
                                        # a clear distinct branch (not crowding mirA/mirB)
        relay = (mirA, mirD)            # short gold leg mirA -> mirD (the split arm)

    # ---- the LENS DISC: a small c/h glass disc inline on leg 3 (beam through) ----
    lcx, lcy = lensC
    for dy in range(-1, 2):
        hw = 1 if dy == 0 else 0
        for dx in range(-hw, hw + 1):
            c.set(lcx + dx, lcy + dy, "c" if dx < 0 else "g")
    c.set(lcx - 1, lcy - 1, "h")        # lens glint
    for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2),       # K rim diamond
                   (-1, -1), (1, -1), (-1, 1), (1, 1)):
        c.set(lcx + dx, lcy + dy, "K")

    # ---- the FRINGE RING: nested concentric interference rings on a K/d screen --
    # the hero bullseye where the split beams recombine; lifted up-LEFT into the
    # open sky above the bench so it reads clearly ON TOP of the building.
    sx, sy = screen
    R = 5
    # round screen plate: a d disc with a clean K rim (so the fringes pop)
    for dy in range(-R - 1, R + 2):
        for dx in range(-R - 1, R + 2):
            d2 = dx * dx + dy * dy
            if d2 <= R * R:
                c.set(sx + dx, sy + dy, "d")
            elif d2 <= (R + 1) * (R + 1):
                c.set(sx + dx, sy + dy, "K")
    # concentric interference fringes: alternating bright gold / dark, centre O.
    rings = [(4, "o"), (3, "d"), (2, "O"), (1, "o")]
    for r, ch in rings:
        for a in range(0, 360, 6):
            x = sx + r * math.cos(math.radians(a))
            y = sy + r * math.sin(math.radians(a))
            c.set(int(round(x)), int(round(y)), ch)
    c.set(sx, sy, "W")                  # brightest centre fringe
    c.set(sx - 1, sy, "O")
    c.set(sx, sy - 1, "O")

    # ---- CONFIGURATION tell: an alignment knob + "ALIGNED" dot below the ring ----
    kx, ky = sx + R + 2, sy + R - 1
    c.set(kx, ky, "o")                                     # knob centre
    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        c.set(kx + dx, ky + dy, "c")                       # knob body
    for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2)):
        c.set(kx + dx, ky + dy, "K")                       # K rim ticks
    c.set(kx, ky + 3, "o")                                 # ALIGNED dot
    c.set(kx, ky + 4, "O")

    # ---- the GOLD BEAM (drawn LAST): ONE clean continuous single-pixel zig-zag
    # laser -> mirA -> mirB -> mirC -> ring. It is masked OUT over each mirror's
    # 5x5 face and over the ring disc, so it arrives crisply at every component
    # edge — the squares + ring stay exactly as-is — and leaves the roof deck free
    # of any stray off-beam gold dots. The eye follows one unbroken light-line. ---
    mirrors_for_skip = [mirA, mirB, mirC]
    if relay is not None:
        mirrors_for_skip = mirrors_for_skip + [relay[1]]

    def on_component(x, y):
        for mx, my in mirrors_for_skip:
            if abs(x - mx) <= 2 and abs(y - my) <= 2:       # mirror footprint
                return True
        if (x - screen[0]) ** 2 + (y - screen[1]) ** 2 <= (R + 1) ** 2:
            return True                                     # ring disc
        return False
    beam_path(c, [laser, mirA, mirB, mirC, screen], core="O", skip=on_component)

    # t2 relay leg + its mirror are drawn AFTER the main beam so the new bounce caps
    # cleanly. The relay leg uses a TIGHTER skip (only the 1px mirror centres) so the
    # short gold beam stub between mirA and mirD actually SHOWS — the split arm reads as
    # a visible extra bounce, not a buried join.
    if relay is not None:
        def on_relay_face(x, y):
            for mx, my in (relay[0], relay[1]):
                if abs(x - mx) <= 1 and abs(y - my) <= 1:   # only the 3x3 mirror face
                    return True
            return False
        beam_path(c, [relay[0], relay[1]], core="o", skip=on_relay_face)
        mirror(*relay[1])
        # small o "ALIGNED" dot just front of the relay mirror (second arm armed)
        c.set(relay[1][0] + 1, relay[1][1] + 2, "o")
        c.set(relay[1][0] + 1, relay[1][1] + 3, "O")

    # return key anchors so the t5 lattice-ring can recompute over the SAME bench
    return {"bx0": bx0, "by0": by0, "screen": screen, "R": R}


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). The calm optics hall grows into a fully
# built-out PHOTONICS INSTITUTE. Every addition is OPTICS on-theme to THIS building
# (a beam-splitter relay -> a laser-pump annex -> a beam-expander tower -> the
# bullseye blooming into an optical-lattice ring), and all grow OUT/UP on the RIGHT
# side so they never collide with the upper-LEFT fringe-ring + beam signature.
# Colours mature stage by stage; gold (q) appears ONLY as the t5 flourish.
#
#   t2  small functional add : an extra beam-splitter MIRROR + relay leg on the bench
#                              (authored inside interferometer(stage>=2))
#   t3  structural add       : a LASER-PUMP annex bolted to the shaded right wall
#   t4  major add            : a rooftop BEAM-EXPANDER TOWER beside the monitor
#   t5  crowning feature     : the bullseye blooms into a full OPTICAL-LATTICE RING
#                              + gold optical rails + gold expander barrel cap
#
# Anchors: BODY roof diamond r_top(29,18) r_right(55,31) r_left(11,27) r_front(37,40);
# the fringe-ring hero is centred ~(27,23) R=5 (x≈21..33, y≈17..29) and the gold beam
# runs up-left across the bench. So every stage anchors to the RIGHT (x≳40) of that.
# ═══════════════════════════════════════════════════════════════════════════════

# A single shared anchor for the rooftop beam-expander tower so t4/t5 both recompute
# the SAME barrel top (no hardcoded second guess — the volt re-anchoring pitfall). It
# sits on the right wedge of the body roof, BEHIND the bench and RIGHT of the monitor.
def _expander_anchor(b):
    """Returns (cx, base_y, top_y) for the beam-expander barrel. base_y is the roof
    deck point the plinth rests on; top_y is the barrel/aperture centre up in clear
    sky right of the monitor and clear of the fringe ring."""
    bxf, byf = b.roof_pt(0.86, 0.62)        # right wedge of the deck, behind bench
    cx = int(round(bxf))
    base_y = int(round(byf))
    top_y = base_y - 13                     # barrel rises into clear sky (y≈18)
    return cx, base_y, top_y


def stage3_pump_annex(c, b):
    """t3 — STRUCTURAL ADD: a LASER-PUMP annex bolted to the hall's shaded RIGHT
    wall — a slim deep-indigo `b` Box sitting on the ground at the right-front, with
    a `g` cooling-slot window on its lit face and a thin conduit climbing up-left to
    the breadboard (it feeds the optics). A real new mass, distinct from the glazed
    monitor ridge. Introduces the matured `b` structure tone. Seated low + forward so
    it abuts the right wall and stays fully on-canvas (x≤55), clear of the fringe ring."""
    # Seated at the FRONT-RIGHT corner, lower + forward so its roof sits BELOW the
    # breadboard front (bench front ~y41) — it reads as a separate outbuilding bolted
    # to the right wall, not merged into the bench. Footprint hangs to the right corner.
    annex = Box(top=(49, 38), wx=4, wy=2, h=8)
    # walls: lit M left, shaded D right, L roof — but a deep-indigo `b` base band so
    # the pump module reads as matured structure bolted on.
    annex.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    c.line(annex.w_left, annex.w_front, "b")
    c.line(annex.w_front, annex.w_right, "b")
    # a deep-indigo `b` pilaster up the front-left corner (ties it to the wall plane)
    c.line(annex.r_left, annex.w_left, "b")
    # g/h COOLING-SLOT window on the lit (left) face of the annex (the pump glowing) —
    # this face turns toward the viewer so the cyan slot reads clearly.
    annex.window(c, "left", 0.16, 0.86, 1.2, annex.h - 1.4, glass="g", hi="h",
                 shade="G", frame="K", mullions=1)
    # a small o pump-status node above the slot
    ps = annex.left_pt(0.5, 0.4)
    c.set(int(round(ps[0])), int(round(ps[1])), "o")
    c.set(int(round(ps[0])) - 1, int(round(ps[1])), "O")
    # two slim louver fins on the shaded right face (heat dump)
    annex.louver(c, "right", 0.30, 0.78, 1.6, annex.h - 1.6,
                 body="d", slat="K", edge="D", frame="K")
    # ---- the thin CONDUIT feeding the breadboard: climbs from the annex roof up-LEFT
    # to the bench front-right corner, two-tone (D core + d shade) so it reads as a
    # pipe, clamped midspan. Endpoints recomputed from the annex roof (no hardcode). ----
    a0 = annex.roof_pt(0.25, 0.55)          # leaves the annex roof (lit corner)
    a0 = (int(round(a0[0])), int(round(a0[1])))
    a1 = (a0[0] - 5, a0[1] - 4)             # arrives just under the breadboard front-right
    c.line(a0, a1, "D")
    c.line((a0[0], a0[1] + 1), (a1[0], a1[1] + 1), "d")
    c.set((a0[0] + a1[0]) // 2, (a0[1] + a1[1]) // 2, "K")   # one clamp midspan
    return annex


def stage4_beam_expander(c, b):
    """t4 — MAJOR ADD: a rooftop BEAM-EXPANDER TOWER beside the monitor — a short
    `b`/`M` collimator BARREL standing on a clear K plinth on the right wedge of the
    roof, carrying a glowing quantum-stellar laser CAVITY window (`e`) up its shaft
    and an `E` APERTURE EYE staring out of its top (a bigger, brighter source for the
    bench). The prominent new vertical mass that says this is now a photonics engine.
    Palette matures: deep `b` barrel armature + energized `e`/`E` cavity glow. Anchored
    on the SAME `_expander_anchor` so t5 caps it from one source; rises in clear sky
    right of the monitor, fully on-canvas, with a visible plinth, clear of the ring."""
    cx, base_y, top_y = _expander_anchor(b)
    # K plinth seating the barrel on the roof deck (so it reads grounded, not floating)
    c.fill_poly([(cx - 2, base_y), (cx + 2, base_y), (cx + 2, base_y + 1), (cx - 2, base_y + 1)], "K")
    c.fill_poly([(cx - 2, base_y - 1), (cx + 2, base_y - 1), (cx + 2, base_y), (cx - 2, base_y)], "b")
    # ---- the BARREL: a stout 4px-wide collimator tube, lit M left / shaded b-D right,
    # K-outlined, rising from the plinth to the aperture head. A widened EXPANDER mouth
    # flares at the top (the beam-expander tell). ----
    bw = 2                                   # half-width of the barrel shaft
    # shaft body
    c.fill_poly([(cx - bw, top_y + 1), (cx + bw, top_y + 1), (cx + bw, base_y - 1), (cx - bw, base_y - 1)], "M")
    c.fill_poly([(cx, top_y + 1), (cx + bw, top_y + 1), (cx + bw, base_y - 1), (cx, base_y - 1)], "b")  # shaded right half
    # K outline of the shaft sides
    c.line((cx - bw, top_y + 1), (cx - bw, base_y - 1), "K")
    c.line((cx + bw, top_y + 1), (cx + bw, base_y - 1), "K")
    # a couple of D barrel bands (collimator segments)
    for yy in (top_y + 5, base_y - 4):
        c.line((cx - bw, yy), (cx + bw, yy), "D")
    # ---- glowing laser CAVITY window: a slim energized `e` slot up the lit shaft ----
    for yy in range(top_y + 4, base_y - 2):
        c.set(cx - 1, yy, "e")
    c.set(cx - 1, top_y + 4, "E")            # bright top of the cavity
    c.set(cx - 1, base_y - 3, "G")           # dark sill
    # ---- the EXPANDER MOUTH + APERTURE EYE at the barrel top ----
    # a flared rim (one px wider each side) capping the barrel
    c.fill_poly([(cx - bw - 1, top_y), (cx + bw + 1, top_y), (cx + bw + 1, top_y + 1), (cx - bw - 1, top_y + 1)], "L")
    c.line((cx - bw - 1, top_y), (cx + bw + 1, top_y), "W")     # lit rim crest
    c.line((cx - bw - 1, top_y), (cx - bw - 1, top_y + 1), "K")
    c.line((cx + bw + 1, top_y), (cx + bw + 1, top_y + 1), "K")
    # the bright APERTURE EYE: an E core with an e iris, K-ringed (the beam source)
    eye_y = top_y - 1
    c.set(cx, eye_y, "E")                     # bright aperture
    for dx, dy in ((-1, 0), (1, 0), (0, -1)):
        c.set(cx + dx, eye_y + dy, "e")
    for dx, dy in ((-2, 0), (2, 0), (0, -2), (-1, -1), (1, -1)):
        c.set(cx + dx, eye_y + dy, "K")       # K eye-ring
    return cx, base_y, top_y


def stage5_lattice(c, b, hero):
    """t5 — CROWNING FEATURE = FULLY EVOLVED photonics institute. The interferometer's
    bullseye COMPLETES: fed by the expander, the split beams stand up into a full
    OPTICAL-LATTICE RING — a bright `E` ring of standing-wave fringes hovering just
    above the breadboard, with a faint `e`/`E` standing-wave node pattern across it —
    and the building is dressed in premium GOLD: `q` gold optical rails edging the
    breadboard + a `q` gold cap on the beam-expander barrel. Reads as elite, still
    unmistakably the same optics hall, just maxed out. Gold ONLY here.

    `hero` is the dict returned by interferometer() so the lattice recomputes over the
    SAME bench/ring (no second guess)."""
    bx0, by0 = hero["bx0"], hero["by0"]
    sx, sy = hero["screen"]                  # fringe-ring centre (the hero bullseye)

    # --- the OPTICAL-LATTICE RING: ONE bold clean standing-wave ring blooming just
    # OUTSIDE the fringe-ring screen (concentric with the hero bullseye) so it reads
    # as the bullseye energizing into a maxed lattice — NOT a scatter of stray sparks
    # (the chalkboard lesson: a single bold ring reads at 64px, fine rings don't). The
    # ring is bright `E` with `e` on its iso-near (lower) arc for a touch of 3-D, drawn
    # dense (every ~10°) so it reads as a continuous fringe ring. Fully on-canvas. ---
    R = 7
    for a in range(0, 360, 10):
        x = sx + R * math.cos(math.radians(a))
        y = sy + R * 0.78 * math.sin(math.radians(a))   # iso squash -> flat ring
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < 64 and 1 <= yi < 64:
            c.set(xi, yi, "e" if y > sy else "E")        # near arc dim, far arc bright
    # four bright `E` cardinal ANTINODES (the standing-wave peaks) sitting just proud
    # of the ring so the lattice reads as a fringe pattern, not a plain circle
    for dx, dy in [(0, -6), (0, 6), (-R - 1, 0), (R + 1, 0)]:
        xi, yi = sx + dx, sy + int(round(dy * 0.78))
        if 0 <= xi < 64 and 1 <= yi < 64:
            c.set(xi, yi, "E")
    # a short `e`/`E` FEED tick-line from the ring up-RIGHT toward the expander mouth,
    # so the maxed lattice reads as FED by the expander beam (not floating free)
    for k in (2, 4, 6):
        xi, yi = sx + R + k, sy - 1 - k
        if 0 <= xi < 64 and 1 <= yi < 64 and c.px[yi][xi] == ".":
            c.set(xi, yi, "E" if k == 4 else "e")
    # brighten the existing fringe-ring centre to a maxed white-gold flare
    c.set(sx, sy, "W")
    c.set(sx, sy - 1, "E")

    # --- GOLD OPTICAL RAILS edging the breadboard (premium trim, t5 only) ---
    # trace a slim gold rail along the two lit FRONT edges of the breadboard slab.
    s_l = (bx0 - 4, by0 + 3)
    s_f = (bx0 + 9, by0 + 9)
    s_r = (bx0 + 13, by0 + 6)
    c.line(s_l, s_f, "q")                     # front-left rail
    c.line(s_f, s_r, "q")                     # front-right rail
    c.set(int(s_f[0]), int(s_f[1]), "O")      # bright gold corner boss at the apex
    # two small gold rail posts at the rail ends
    c.set(int(s_l[0]), int(s_l[1]) - 1, "q")
    c.set(int(s_r[0]), int(s_r[1]) - 1, "q")

    # --- GOLD CAP on the beam-expander barrel (recomputed from the SAME anchor) ---
    cx, base_y, top_y = _expander_anchor(b)
    # a gold cap band ringing the expander mouth + a tiny gold finial bead above the eye
    c.line((cx - 3, top_y), (cx + 3, top_y), "q")          # gold rim band on the mouth
    c.set(cx - 3, top_y, "O")
    c.set(cx + 3, top_y, "O")
    c.set(cx, top_y - 3, "q")                              # gold finial bead over the eye
    c.set(cx, top_y - 4, "O")


# ── ASSEMBLE (painter's order: back→front, ground→sky) ───────────────────────
def build(stage: int = 1):
    """Compose the optics laboratory at upgrade `stage` (1..5). Stage 1 is IDENTICAL
    to the shipped base; each higher stage keeps every prior addition and bolts on the
    next (t2 beam-splitter relay -> t3 laser-pump annex -> t4 beam-expander tower ->
    t5 optical-lattice ring + gold trim). The calm hall grows OUT/UP on the RIGHT into
    a photonics institute, while the upper-LEFT fringe-ring + gold-beam signature stays
    clear and reads in front.

    Painter's order: base body/faces first; then the t3 pump annex (ground, right) and
    t4 expander tower (roof, right-behind) which sit BEHIND/beside the bench; then the
    interferometer is drawn (so its bench, mirrors, beam + ring read crisply on top);
    finally the t5 lattice ring blooms over the bench + gold trim caps everything."""
    c = Canvas()
    b = body(c)                 # low wide optics hall
    loading_bay(c, b)           # HERO opening: wide LEFT dark-room loading bay
    right_face(c, b)            # plain RIGHT face: louver vent + conduit
    m = clerestory(c, b)        # glazed clerestory monitor ridge

    # --- CUMULATIVE UPGRADE MASSES that sit BEHIND/BESIDE the bench (drawn before the
    #     interferometer so the hero bench + beam + ring always read in front) --------
    if stage >= 3:
        stage3_pump_annex(c, b)
    if stage >= 4:
        stage4_beam_expander(c, b)

    # --- SIGNATURE: rooftop laser interferometer -> fringe ring (always reads in front;
    #     stage>=2 grows it by one beam-splitter relay mirror ON the same bench) -------
    hero = interferometer(c, b, m, stage=stage)

    # --- t5 CROWN: the bullseye blooms into the optical-lattice ring + gold trim, drawn
    #     LAST so the maxed standing-wave ring hovers over the bench and gold caps all --
    if stage >= 5:
        stage5_lattice(c, b, hero)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/axiom"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "optics-laboratory"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped optics-laboratory.png, so it does NOT overwrite the base."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": AXIOM, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"axiom_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"axiom_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
