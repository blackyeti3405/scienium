#!/usr/bin/env python3
"""
Reaction Synthesis Lab — ChemWorks economy building (BESPOKE iso form, NOT the
gateway cube).

Composed from the iso BUILDING TOOLKIT (isobuild.Box + cylinder) as a PIPEWORK
REACTOR HALL — a small chemical refinery, not a re-skinned square cube:

  * a medium-tall closed PROCESS HALL Box (moderate footprint, flat parapet roof)
    in blue-grey M/D walls wearing D/d vertical pipe-chase seams;
  * a stout jacketed REACTOR DRUM (a cylinder) bulging off the BACK-RIGHT corner,
    drawn FIRST so the hall occludes its base — steel M/D body, a c sight-gauge
    stripe, a D cap dome, and a thick K/D transfer pipe running into the hall roof;
  * external PIPEWORK across the upper RIGHT face: 2 horizontal M/D process pipes
    with K flange joints + one c coolant pipe, plus a small o pressure-relief glow
    at a valve and an o/O vapor wisp off the roof relief stack;
  * a flat parapet roof + a short vent stack + the drum cap — the industrial
    "process building" silhouette, clearly different from the open bench sheds and
    slender towers of the other sets.

OPENING SIDE = RIGHT. The hero is a tall K-framed CONTROL / CHARGING BAY on the
SHADED RIGHT face: glowing g->c glass with a bright o/O violet reaction-glow
interior so it reads on the shaded side, an h reflection sweep and a K-framed
door. The LIT LEFT face is kept plainer (pipe seams + a couple of c portholes).

Signature (one-of-one): a tall clear LIEBIG-STYLE CONDENSER mounted on the FRONT
of the hall — a vertical h/c glass tube wound with a tight diagonal g/G spiral
water-cooling coil (alternating light/dark to sell the helix), two thin c coolant
hoses teeing into the coil top and bottom, a soft o->O violet reaction glow behind
it, and a single h/W droplet of distilled product falling from the tube tip into a
small c/g RECEIVING FLASK below (a tiny meniscus + o vapor specks rising). No
coiled-condenser / dripping-tip motif exists anywhere else in the catalog.
"""
import os, sys, json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

# Base ChemWorks palette (shared keys) + the EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so reaction-synthesis-lab.png is
# unchanged). These exact keys+hexes are the lab-wide evolved accents (see plan):
#   b  deepened structure steel — matured tone for t4+ new masses (the twin reactor)
#   e  energized reagent glow (mid)   E  energized reagent glow (bright) — t4/t5 power
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
CHEM = {"K": "#161a2e", "W": "#e6ecfb", "L": "#c2cdee", "M": "#9aa8d8", "D": "#6f7cb0", "d": "#4b5688",
        "h": "#d6ecff", "c": "#a8d4ff", "g": "#4aa0e6", "G": "#2166b0",
        "o": "#c89cf0", "O": "#e0c2ff", "r": "#6a34a8",
        "b": "#363c5e", "e": "#36e0c8", "E": "#c2fff2", "q": "#f0c64a"}

# ── Shared reactor-pair geometry ─────────────────────────────────────────────
# The BASE silo (drawn by reactor_drum) is the FIRST reactor cylinder. t4 adds a
# SECOND, TALLER reactor twinning it just to its left; t5 crowns the PAIR with a
# reflux-condenser dome + a reaction arc between the two. Both stages must derive
# the twin reactor from the SAME numbers (recompute, never hardcode a 2nd guess) —
# tuned so the twin + its dome + finial land fully on-canvas (cap ~row 5, finial
# just inside y=0) and the twin sits clear of the back-left vent stack.
DRUM_CX, DRUM_TOP_Y, DRUM_RX, DRUM_H = 50, 14, 6, 13      # the base silo (reactor #1)
TWIN_CX, TWIN_TOP_Y, TWIN_RX, TWIN_H = 41, 13, 5, 14      # the t4 twin (reactor #2, taller)
# (twin body top_y=13 < drum top_y=14 -> the twin reads as the taller of the two, and
#  the t5 reflux DOME stacked on its cap makes the twin-with-dome assembly clearly the
#  tallest mass; the cap headroom lets that dome + gold finial + vapor land fully on-
#  canvas with margin. Both reactor bodies still bottom out at y≈27 -> footprint base
#  unchanged. The drum's domed cap (DRUM_TOP_Y-4=10) still peeks taller than the twin
#  body alone, so the pair reads as twinned silos rather than one dwarfing the other.)


# ── small pixel helpers ──────────────────────────────────────────────────────
def rect(c, x0, y0, x1, y1, fill=None, outline=None):
    if fill is not None:
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                c.set(x, y, fill)
    if outline is not None:
        for x in range(int(x0), int(x1) + 1):
            c.set(x, int(y0), outline); c.set(x, int(y1), outline)
        for y in range(int(y0), int(y1) + 1):
            c.set(int(x0), y, outline); c.set(int(x1), y, outline)


# ── 1. REACTOR DRUM — stout jacketed cylinder, BACK-RIGHT (drawn FIRST) ──────
def reactor_drum(c):
    """A stout jacketed reactor vessel abutting the back-right corner. Drawn first
    so the hall in front occludes its lower base. Fat steel M/D body (stout, NOT a
    slender silo) with jacket band rings, a c sight-gauge stripe and a domed cap."""
    cx, top_y, rx, h = DRUM_CX, DRUM_TOP_Y, DRUM_RX, DRUM_H
    cylinder(c, cx, top_y, rx, h, top="L", side_l="M", side_r="D")
    # lit seam down the front-left of the drum (catches light)
    c.line((cx - rx + 1, top_y + 2), (cx - rx + 1, top_y + h - 1), "L")
    # three jacket band rings around the drum (the welded jacket seams)
    for ry in (top_y + 4, top_y + 8, top_y + 12):
        c.line((cx - rx + 1, ry), (cx + rx - 1, ry), "d")
        c.set(cx - rx, ry, "K"); c.set(cx + rx, ry, "K")
    # a c SIGHT-GAUGE stripe (a vertical glass level gauge on the lit shoulder)
    for yy in range(top_y + 2, top_y + h - 1):
        c.set(cx - 3, yy, "c")
    c.set(cx - 3, top_y + 2, "h")               # bright top of the gauge
    c.set(cx - 3, top_y + h - 2, "G")           # darker liquid base
    c.set(cx - 4, top_y + 5, "K")               # thin K rim on the gauge
    # rounded D CAP DOME crowning the drum (read as a domed lid, not a flat top)
    for i, yy in enumerate(range(top_y - 4, top_y)):
        w = 1 + i + 1
        c.line((cx - w, yy), (cx + w, yy), "D")
        c.set(cx - w, yy, "K"); c.set(cx + w, yy, "K")
    c.set(cx - 2, top_y - 4, "M")               # dome glint
    c.set(cx - 1, top_y - 4, "L")
    # a small charge nozzle riser on the cap
    c.set(cx + 1, top_y - 5, "D"); c.set(cx + 1, top_y - 6, "K")


def transfer_pipe(c):
    """A thick transfer pipe running from the drum's lower shoulder down-left onto
    the back roof of the hall — the cue that the drum feeds the process hall."""
    # drum lower-left shoulder ~ (45,24) angling onto the back roof ~ (39,27).
    # Use DARK D/d body so the pipe reads against the BRIGHT L roof it crosses.
    pts = [(45, 23), (44, 24), (43, 24), (42, 25), (41, 25), (40, 26), (39, 26)]
    for (x, y) in pts:
        c.set(x, y - 1, "M")     # lit crown of the pipe
        c.set(x, y, "D")         # pipe body (dark, reads on the L roof)
        c.set(x, y + 1, "K")     # underside shade / outline
    # K flange collars at each end
    c.set(45, 22, "K"); c.set(46, 23, "K")
    c.set(39, 25, "K"); c.set(39, 27, "K")


# ── 2. MAIN HALL — medium-tall process Box (the bespoke break from the cube) ─
def main_hall(c):
    """Medium-tall closed process hall. wx=11 wy=10 h=18 -> a boxy industrial
    hall (slightly wider than tall, flat parapet), distinct from the tall square
    gateway cube (wx=wy=11 h=20)."""
    hall = Box(top=(30, 16), wx=11, wy=10, h=18)
    hall.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    return hall


def parapet(c, hall):
    """A flat parapet lip around the roof edge — the 'closed process hall' cue."""
    # bright lip along the two front roof edges (left->front, front->right)
    c.line(hall.r_left, hall.r_front, "W")
    c.line(hall.r_front, hall.r_right, "L")
    # a thin d reveal one px under the front roof edges (parapet thickness)
    c.line((hall.r_left[0], hall.r_left[1] + 1), (hall.r_front[0], hall.r_front[1] + 1), "d")
    c.line((hall.r_front[0], hall.r_front[1] + 1), (hall.r_right[0], hall.r_right[1] + 1), "d")


def pipe_chase_seams(c, hall):
    """Vertical D/d pipe-chase seams ribbing both walls (the ChemWorks wall motif)."""
    # lit (left) face: a couple of faint seams (kept plainer per blueprint)
    for u in (0.30, 0.66):
        c.line(hall.left_pt(u, 1.5), hall.left_pt(u, 16.5), "d")
        c.line(hall.left_pt(u + 0.02, 1.5), hall.left_pt(u + 0.02, 16.5), "D")
    # shaded (right) face: tighter seam rhythm behind the pipework/hero
    for u in (0.18, 0.84):
        c.line(hall.right_pt(u, 1.5), hall.right_pt(u, 16.5), "d")


# ── 3. EXTERNAL PIPEWORK on the upper RIGHT face ─────────────────────────────
def pipework(c, hall):
    """A run of horizontal process pipes with K flange joints across the upper
    RIGHT face, plus one c coolant pipe and a small o pressure-relief glow."""
    # two fat process pipes banding across the top of the shaded right face.
    # bright L crown + M body + K underside = a raised round pipe reading on the wall
    for v in (1.4, 3.4):
        c.line(hall.right_pt(0.05, v), hall.right_pt(0.95, v), "W")        # bright crown glint
        c.line(hall.right_pt(0.05, v + 0.55), hall.right_pt(0.95, v + 0.55), "M")
        c.line(hall.right_pt(0.05, v + 1.1), hall.right_pt(0.95, v + 1.1), "K")  # underside
        # K flange joints (a short collar) at intervals
        for u in (0.26, 0.54, 0.82):
            p = hall.right_pt(u, v - 0.5)
            x, y = int(round(p[0])), int(round(p[1]))
            c.set(x, y, "K"); c.set(x, y + 1, "D"); c.set(x, y + 2, "K")
    # one c COOLANT pipe under the process pipes
    c.line(hall.right_pt(0.04, 5.6), hall.right_pt(0.70, 5.6), "c")
    c.line(hall.right_pt(0.04, 6.1), hall.right_pt(0.70, 6.1), "g")
    # a small o PRESSURE-RELIEF glow at a valve on the right pipes
    rv = hall.right_pt(0.88, 5.4)
    rx_, ry_ = int(round(rv[0])), int(round(rv[1]))
    c.set(rx_, ry_, "K"); c.set(rx_, ry_ - 1, "r"); c.set(rx_, ry_ - 2, "o")
    c.set(rx_, ry_ - 3, "O")


def left_portholes(c, hall):
    """Keep the LIT LEFT face plainer: just a couple of small c portholes high up,
    away from the front-mounted condenser (which lives near the front corner)."""
    for u in (0.22, 0.46):
        p = hall.left_pt(u, 3.0)
        x, y = int(round(p[0])), int(round(p[1]))
        rect(c, x - 1, y, x, y + 1, fill="c")
        c.set(x - 1, y, "h")                    # glint
        c.set(x - 2, y, "K"); c.set(x + 1, y, "K")   # K rim


# ── 4. ROOF DETAIL — vent stack + relief vapor wisp ──────────────────────────
def roof_features(c, hall):
    """A short vent stack on the roof + a thin o/O vapor wisp off the relief
    valve. The drum cap (drawn earlier) completes the industrial roofline."""
    # short vent STACK toward the back-left of the roof
    s = hall.roof_pt(0.30, 0.62)
    sx, sy = int(round(s[0])), int(round(s[1]))
    rect(c, sx - 1, sy - 6, sx, sy, fill="D")
    rect(c, sx - 1, sy - 6, sx, sy - 6, fill="M")     # lit stack rim
    c.set(sx - 1, sy - 6, "K"); c.set(sx, sy - 6, "K")
    c.set(sx - 1, sy, "K")
    # a thin violet vapor wisp drifting up off the stack
    c.set(sx, sy - 7, "o"); c.set(sx + 1, sy - 9, "O")
    c.set(sx, sy - 11, "o")
    # a small reagent vent box near the front-right roof corner
    v = hall.roof_pt(0.66, 0.30)
    vx, vy = int(round(v[0])), int(round(v[1]))
    rect(c, vx - 1, vy - 2, vx + 1, vy, fill="M", outline="K")
    c.set(vx, vy - 2, "L")


# ── 5. HERO — glowing CONTROL / CHARGING BAY on the SHADED RIGHT face ────────
def control_bay(c, hall):
    """The opening side: a tall K-framed control/charging bay on the shaded RIGHT
    face. Glowing g->c glass with a bright o/O violet reaction-glow interior so it
    reads on the dark side, an h reflection sweep, and a K-framed door at grade."""
    u0, u1 = 0.30, 0.74
    vt, vb = 6.6, 17.2
    # K opening frame (reveal behind the glass)
    c.fill_poly([hall.right_pt(u0, vt), hall.right_pt(u1, vt),
                 hall.right_pt(u1, vb), hall.right_pt(u0, vb)], "K")
    iu0, iu1 = u0 + 0.018, u1 - 0.018
    ivt, ivb = vt + 0.5, vb - 0.4
    # VIOLET reaction-glow interior seen through the glass (the lit charging bay)
    c.fill_poly([hall.right_pt(iu0, ivt), hall.right_pt(iu1, ivt),
                 hall.right_pt(iu1, ivb), hall.right_pt(iu0, ivb)], "r")
    # brighter o/O glow core in the upper bay (the reaction running inside)
    c.fill_poly([hall.right_pt(iu0, ivt + 0.4), hall.right_pt(iu1, ivt + 0.4),
                 hall.right_pt(iu1, ivt + 3.4), hall.right_pt(iu0, ivt + 3.4)], "o")
    c.fill_poly([hall.right_pt(iu0 + 0.04, ivt + 0.8), hall.right_pt(iu1 - 0.04, ivt + 0.8),
                 hall.right_pt(iu1 - 0.04, ivt + 2.2), hall.right_pt(iu0 + 0.04, ivt + 2.2)], "O")
    # cool g->c glass wash over the lower bay (glass in front of the glow)
    c.fill_poly([hall.right_pt(iu0, ivt + 4.2), hall.right_pt(iu1, ivt + 4.2),
                 hall.right_pt(iu1, ivb), hall.right_pt(iu0, ivb)], "g")
    c.line(hall.right_pt(iu0, ivt + 5.0), hall.right_pt(iu1, ivt + 5.0), "c")
    # an h diagonal REFLECTION sweep across the glass
    c.line(hall.right_pt(iu0 + 0.06, ivt + 5.6), hall.right_pt(iu1 - 0.20, ivt + 1.4), "h")
    # vertical mullions splitting the bay into 3 lights
    for m in (1, 2):
        um = iu0 + (iu1 - iu0) * m / 3.0
        c.line(hall.right_pt(um, ivt), hall.right_pt(um, ivb), "K")
    # a K-framed DOOR at the right of the bay, running down to grade
    du0, du1 = 0.62, 0.73
    c.fill_poly([hall.right_pt(du0, 9.0), hall.right_pt(du1, 9.0),
                 hall.right_pt(du1, vb), hall.right_pt(du0, vb)], "K")
    c.fill_poly([hall.right_pt(du0 + 0.012, 9.6), hall.right_pt(du1 - 0.012, 9.6),
                 hall.right_pt(du1 - 0.012, vb - 0.4), hall.right_pt(du0 + 0.012, vb - 0.4)], "g")
    c.line(hall.right_pt(du0 + 0.02, 10.2), hall.right_pt(du0 + 0.02, vb - 0.8), "c")
    # bright lintel highlight over the whole bay
    c.line(hall.right_pt(u0, vt), hall.right_pt(u1, vt), "L")


# ── 6. SIGNATURE — coiled Liebig condenser dripping into a receiving flask ───
def liebig_condenser(c, hall):
    """One-of-one: a tall clear Liebig-style condenser mounted on the FRONT of the
    hall (near the front corner, on the LIT LEFT face), wound with a spiral cooling
    coil, dripping distilled product into a small receiving flask. Drawn LAST so it
    reads on top as the hero apparatus.

    Anchored near the building's FRONT corner. We work in screen px around the
    front vertical edge (hall.r_front ~ x30, y36 ... w_front ~ y54)."""
    fx, fy = int(round(hall.r_front[0])), int(round(hall.r_front[1]))
    # mount the condenser just LEFT of the front corner, on the lit face — raised
    # so the whole assembly (coil + drip + receiving flask) sits ON the front face
    # WITHIN the footprint, with the flask floor well above the base outline (the
    # front bottom vertex is at w_front ~ y55) instead of dangling into the shadow.
    cxg = fx - 6          # glass tube centre x
    top = fy - 5          # tube top (raised up onto the upper front face)
    bot = fy + 5          # tube tip (above the flask, shorter tube)

    # --- soft o->O VIOLET reaction glow halo behind the condenser ---
    for yy in range(top + 1, bot):
        c.set(cxg + 3, yy, "r")            # violet glow spilling on the shaded side
    c.set(cxg + 3, top + 3, "o")
    c.set(cxg + 3, (top + bot) // 2, "o")
    c.set(cxg + 3, bot - 2, "o")

    # --- vertical glass TUBE (3px wide so the coil has a body to wrap) ---
    for yy in range(top, bot + 1):
        c.set(cxg - 1, yy, "h")      # bright lit edge
        c.set(cxg, yy, "c")          # cool glass body
        c.set(cxg + 1, yy, "c")
    # K glass outline down both sides
    for yy in range(top - 1, bot + 1):
        c.set(cxg - 2, yy, "K"); c.set(cxg + 2, yy, "K")
    # K caps at top and tip
    c.set(cxg - 1, top - 1, "K"); c.set(cxg, top - 1, "K"); c.set(cxg + 1, top - 1, "K")

    # --- SPIRAL COIL wound around the tube: each turn is a clean diagonal band
    #     crossing the 3px tube, alternating bright g / dark G to sell the helix ---
    for i, yy in enumerate(range(top + 1, bot - 1, 2)):
        front = "g"                                  # bright front of the coil turn
        back = "G"                                   # dark underside of the turn below
        # the turn rises left->right across the tube (one diagonal step)
        c.set(cxg - 2, yy + 1, back)                 # dark back edge wrapping left
        c.set(cxg - 1, yy, front)
        c.set(cxg, yy, front)
        c.set(cxg + 1, yy - 1 if False else yy, front)
        c.set(cxg + 2, yy - 1, back)                 # dark back edge wrapping right
    # a bright h highlight glinting off the front of the topmost coil turn
    c.set(cxg, top + 1, "h")

    # --- two thin c COOLANT HOSES teeing into the coil top and bottom ---
    # top hose teeing in from the upper-left
    c.set(cxg - 3, top + 1, "c"); c.set(cxg - 4, top, "c"); c.set(cxg - 4, top - 1, "g")
    c.set(cxg - 4, top, "h")     # one h highlight on the top hose
    # bottom hose teeing out to the lower-left
    c.set(cxg - 3, bot - 1, "c"); c.set(cxg - 4, bot, "c"); c.set(cxg - 4, bot + 1, "g")

    # --- the DRIP: a droplet just leaving the tube tip ---
    c.set(cxg, bot + 1, "h")     # droplet pulling off the tip
    c.set(cxg, bot + 2, "W")     # bright falling droplet

    # --- receiving FLASK at the base catching the distilled product ---
    flx, fly = cxg, bot + 5      # flask centre / neck base
    # narrow glass NECK
    c.set(flx, bot + 3, "c"); c.set(flx, bot + 4, "c")
    c.set(flx - 1, bot + 3, "K"); c.set(flx + 1, bot + 3, "K")
    # round flask BODY (a small c/g Erlenmeyer-ish bulb)
    for dy in range(0, 4):
        w = 1 + dy
        for dx in range(-w, w + 1):
            c.set(flx + dx, fly + dy, "g")
    # cool c upper meniscus of collected liquid + h glint
    c.line((flx - 1, fly), (flx + 1, fly), "c")
    c.set(flx - 1, fly, "h")
    # darker G base of the flask body
    c.line((flx - 2, fly + 3), (flx + 2, fly + 3), "G")
    # K outline around the flask bulb
    c.set(flx - 4, fly + 3, "K"); c.set(flx + 4, fly + 3, "K")
    c.set(flx - 3, fly + 2, "K"); c.set(flx + 3, fly + 2, "K")
    c.set(flx - 2, fly + 1, "K"); c.set(flx + 2, fly + 1, "K")
    c.line((flx - 3, fly + 4), (flx + 3, fly + 4), "K")   # flask floor
    # 1-2 o vapor specks rising off the collected product
    c.set(flx + 1, fly - 1, "o"); c.set(flx - 1, fly - 2, "O")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS reflux / reactor
# / reagent-process structure onto the prior form — never restarts, never recolors
# the whole building. Theme: the single-reactor pipework hall grows into a TWIN-
# REACTOR reflux works. Colours mature stage by stage; the energized reagent glow
# (e/E teal) arrives at t4; gold (q) only as a t5 flourish.
#
#   t2  small functional add : a chilled-water header + 2nd short reflux coil beside
#                              the condenser on the lit face + a brighter o reactor bead
#   t3  structural add       : a jacketed FEED-TANK annex (charge vessel + g sight-glass)
#                              abutting the shaded RIGHT end, plumbed to the reactor
#   t4  major add            : a SECOND TALLER reactor cylinder twinning the silo, steel-
#                              hooped, with an e glowing reaction-core window
#   t5  crowning feature     : a glowing reflux-condenser DOME topping the reactor pair,
#                              venting E vapor + a reaction arc between them + GOLD trim
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_chilled_reflux(c, hall):
    """t2 — SMALL FUNCTIONAL ADD: a horizontal chilled-water HEADER pipe bracketed
    across the lit-LEFT face just RIGHT of the hero condenser, feeding a SECOND short
    reflux COIL (a stubby helix tube) that twins the signature's coil — plus a
    brightened o reaction BEAD popping at the reactor's charge-nozzle mouth. On-theme
    (more reflux/cooling), modest, base palette + the one brightened bead. Seated on
    the upper-left face so it never collides with the front-corner condenser (x~24)
    or the reactor silo behind it."""
    # ---- chilled-water HEADER: a short horizontal c/g pipe run high on the lit face,
    #      sitting to the LEFT of centre (the condenser is at the FRONT corner u~0.78) ----
    y0 = int(round(hall.left_pt(0.30, 6.0)[1]))
    hx0 = int(round(hall.left_pt(0.14, 6.0)[0]))
    hx1 = int(round(hall.left_pt(0.46, 6.0)[0]))
    for x in range(hx0, hx1 + 1):
        c.set(x, y0 - 1, "h")          # bright chilled crown glint
        c.set(x, y0, "c")              # coolant pipe body
        c.set(x, y0 + 1, "G")          # underside shade
    c.set(hx0, y0, "K"); c.set(hx1, y0, "K")
    # two short drop-tees off the header (feed + return to the coil)
    for tx in (hx0 + 3, hx1 - 2):
        c.set(tx, y0 + 2, "c"); c.set(tx, y0 + 3, "g"); c.set(tx, y0 + 4, "K")

    # ---- SECOND short reflux COIL hung under the header — a stubby helix whose front
    #      turns alternate bright h / glass c over a dark G back edge so the helix sells
    #      crisply against the busy lit face; K outline on both sides so it reads. ----
    coil_x = (hx0 + hx1) // 2
    coil_top = y0 + 3
    c.set(coil_x - 2, coil_top - 1, "K")            # K cap above the coil
    for j in range(6):                  # 6 winding rows
        yy = coil_top + j
        front = "h" if j % 2 == 0 else "c"          # brighter front turns -> reads on wall
        c.set(coil_x - 2, yy, "G")      # dark back edge wrapping left
        c.set(coil_x - 1, yy, front)
        c.set(coil_x, yy, front)
        c.set(coil_x + 1, yy - 1, "G")  # dark back edge wrapping right (rising helix)
        c.set(coil_x - 3, yy, "K")      # K outline (lit side)
        c.set(coil_x + 1, yy, "K")      # K outline (shaded side)
    # a small c receiver bulb at the coil foot (collected condensate)
    c.set(coil_x - 1, coil_top + 6, "c"); c.set(coil_x, coil_top + 6, "c")
    c.set(coil_x - 2, coil_top + 7, "g"); c.set(coil_x + 1, coil_top + 7, "g")
    c.set(coil_x - 1, coil_top + 8, "K"); c.set(coil_x, coil_top + 8, "K")

    # ---- brightened o REACTION BEAD at the reactor silo's charge-nozzle mouth ----
    # the base nozzle riser sits on the drum cap at (DRUM_CX+1, DRUM_TOP_Y-6) ~ (51,8)
    bx, by = DRUM_CX + 1, DRUM_TOP_Y - 6
    c.set(bx, by - 1, "o")
    c.set(bx, by - 2, "O")              # the brightened bead popping at the mouth
    c.set(bx + 1, by - 3, "o")


def stage3_feed_tank(c, hall):
    """t3 — STRUCTURAL ADD: a jacketed FEED-TANK annex — a short charge-vessel
    `cylinder` standing on the ground abutting the shaded RIGHT END of the hall, with
    a g/c glass SIGHT-GLASS up its lit shoulder and a jacket band, plumbed into the
    reactor by a short charge line. A real new structural mass extending the works OUT
    to the right while sitting LOWER than the reactor silo. Introduces the matured
    deep-steel tone `b` on the tank's shaded shell + saddle."""
    # short charge vessel to the RIGHT of the hall, foot near the right base corner.
    tcx, ttop, trx, th = 58, 30, 4, 11             # x 54..62, y 30..41 (on-canvas)
    # a b saddle plinth under the tank so it reads as seated, not floating
    for dx in range(-trx + 1, trx):
        c.set(tcx + dx, ttop + th + 1, "b")
        c.set(tcx + dx, ttop + th + 2, "K")
    # the tank shell (matured b shaded side so it reads as a newer service vessel)
    cylinder(c, tcx, ttop, trx, th, top="L", side_l="M", side_r="b")
    c.line((tcx - trx + 1, ttop + 2), (tcx - trx + 1, ttop + th - 1), "L")  # lit seam
    # a welded jacket band ring around the tank
    for ry in (ttop + 4, ttop + 8):
        c.line((tcx - trx + 1, ry), (tcx + trx - 1, ry), "d")
        c.set(tcx - trx, ry, "K"); c.set(tcx + trx, ry, "K")
    # a g/c SIGHT-GLASS level gauge up the lit shoulder
    for yy in range(ttop + 2, ttop + th - 1):
        c.set(tcx - 2, yy, "g")
    c.set(tcx - 2, ttop + 2, "c")                  # bright top of the level
    c.set(tcx - 2, ttop + th - 2, "G")             # darker liquid base
    c.set(tcx - 3, ttop + 5, "K")                  # thin K rim on the gauge
    # a domed cap + a short charge nozzle on top
    for i, yy in enumerate(range(ttop - 3, ttop)):
        w = 1 + i
        c.line((tcx - w, yy), (tcx + w, yy), "M")
        c.set(tcx - w, yy, "K"); c.set(tcx + w, yy, "K")
    c.set(tcx - 1, ttop - 3, "L")                  # dome glint
    c.set(tcx + 1, ttop - 4, "D"); c.set(tcx + 1, ttop - 5, "K")  # nozzle riser
    # a short CHARGE LINE plumbing the tank back into the hall right face — a 2px
    # M/D pipe with a lit crown so it clearly TIES the tank to the reactor (not a
    # detached capsule) and a K flange collar where it enters the wall.
    px, py = tcx - trx, ttop + 4                    # take-off on the tank's lit side
    qx, qy = int(round(hall.right_pt(0.94, 6.2)[0])), int(round(hall.right_pt(0.94, 6.2)[1]))
    c.line((px, py - 1), (qx, qy - 1), "M")         # lit crown of the pipe
    c.line((px, py), (qx, qy), "D")                 # pipe body
    c.line((px, py + 1), (qx, qy + 1), "K")         # underside shade
    c.set(px, py, "K")                              # tank-side joint
    c.set(qx, qy - 1, "K"); c.set(qx, qy + 1, "K")  # K flange collar at the wall
    # a small hazard placard on the tank's shaded shell
    c.set(tcx + 2, ttop + 6, "o"); c.set(tcx + 2, ttop + 7, "O")


def stage4_twin_reactor(c):
    """t4 — MAJOR ADD: a SECOND, TALLER reactor CYLINDER twinning the back-right silo —
    a slender process reactor rising just to the LEFT of the base drum, banded with
    steel hoops, carrying a tall e/E glowing REACTION-CORE window down its lit shoulder
    and a domed cap. The prominent new vertical mass that says 'this hall now runs a
    reactor train'. Palette matures: deep `b` shaded shell + energized reagent `e/E`
    core. Derived from the shared TWIN_* numbers; height clamped so the t5 dome+finial
    still land on-canvas. Drawn so the base drum (to its right) overlaps in front."""
    cx, top_y, rx, h = TWIN_CX, TWIN_TOP_Y, TWIN_RX, TWIN_H
    # the twin shell: matured b shaded side to read as the newer reactor vs the M drum
    cylinder(c, cx, top_y, rx, h, top="L", side_l="M", side_r="b")
    c.line((cx - rx + 1, top_y + 2), (cx - rx + 1, top_y + h - 1), "L")   # lit seam
    # steel HOOP bands around the reactor (more rings than the drum -> a taller column)
    for ry in range(top_y + 4, top_y + h - 1, 4):
        c.line((cx - rx + 1, ry), (cx + rx - 1, ry), "d")
        c.set(cx - rx, ry, "K"); c.set(cx + rx, ry, "K")
    # a tall e/E glowing REACTION-CORE window down the lit shoulder (the energized tell)
    for j, yy in enumerate(range(top_y + 3, top_y + h - 2)):
        ch = "E" if j % 4 == 0 else "e"
        c.set(cx - 1, yy, ch)
    c.set(cx - 2, top_y + 3, "K"); c.set(cx, top_y + 3, "K")          # window frame
    c.set(cx - 2, top_y + h - 3, "K"); c.set(cx, top_y + h - 3, "K")
    c.set(cx - 1, top_y + 2, "K"); c.set(cx - 1, top_y + h - 2, "K")
    # domed D/M CAP crowning the twin (read as a domed lid, like the drum's)
    for i, yy in enumerate(range(top_y - 4, top_y)):
        w = 1 + i + 1
        c.line((cx - w, yy), (cx + w, yy), "D")
        c.set(cx - w, yy, "K"); c.set(cx + w, yy, "K")
    c.set(cx - 2, top_y - 4, "M"); c.set(cx - 1, top_y - 4, "L")      # dome glint
    # a thick K/D cross-tie pipe linking the twin to the base drum (the reactor train)
    c.line((cx + rx, top_y + 6), (DRUM_CX - DRUM_RX, DRUM_TOP_Y + 6), "D")
    c.line((cx + rx, top_y + 5), (DRUM_CX - DRUM_RX, DRUM_TOP_Y + 5), "M")  # lit crown
    c.set(cx + rx, top_y + 6, "K"); c.set(DRUM_CX - DRUM_RX, DRUM_TOP_Y + 6, "K")


def stage5_reflux_dome(c):
    """t5 — CROWNING FEATURE = FULLY EVOLVED twin-reactor reflux works. A glowing
    reflux-condenser DOME is mounted across the TOP of the reactor PAIR — a wide
    energized-teal dome seated on the taller twin, venting bright E reagent vapor and
    throwing a reaction ARC across to the base drum — and the pair is dressed out with
    GOLD premium HOOP bands + a gold VENT FINIAL. Reads as elite, still recognizably
    the same reactor hall, just maxed out.

    Re-derives both reactor tops from the SAME shared TWIN_*/DRUM_* numbers stage4 used
    (never a hardcoded 2nd guess) so the dome seats exactly on the twin cap and the arc
    lands on the drum cap."""
    tcx, ttop = TWIN_CX, TWIN_TOP_Y                  # twin (taller) reactor cap centre
    dcx, dtop = DRUM_CX, DRUM_TOP_Y                  # base drum cap centre
    # ---- the reflux-condenser DOME seated on the twin's cap (cap dome ended ~ttop-4) ----
    dome_base = ttop - 4                             # sit on top of the twin's domed lid
    dome_cy = dome_base - 2
    import math
    # a wide energized-teal half-dome (e body, E bright crown, b shaded lower-right)
    dr = 4
    for yy in range(-dr, 1):
        t = 1 - (yy / dr) ** 2
        if t < 0:
            continue
        half = int(round(dr * (t ** 0.5)))
        for xx in range(-half, half + 1):
            gx, gy = tcx + xx, dome_cy + yy
            if gy < 0:
                continue
            if yy < -2 and abs(xx) < 2:
                c.set(gx, gy, "E")                   # bright crown
            elif xx > 1:
                c.set(gx, gy, "b")                   # shaded lower-right shell
            else:
                c.set(gx, gy, "e")                   # energized teal body
    # a flat e base band closing the dome onto the collar
    for xx in range(-dr, dr + 1):
        c.set(tcx + xx, dome_cy + 1, "e")
    # K rim arc around the dome silhouette
    for a in range(180, 361, 12):
        rxp = tcx + (dr + 1) * math.cos(math.radians(a))
        ryp = dome_cy + (dr + 1) * math.sin(math.radians(a))
        c.set(rxp, ryp, "K")
    c.line((tcx - dr, dome_cy + 1), (tcx + dr, dome_cy + 1), "K")
    c.set(tcx - 2, dome_cy - 2, "W")                 # bright top-left glint

    # ---- a compact E reagent VAPOR wisp venting just off the dome crown (kept short
    #      so it sits fully on-canvas above the finial with clean top margin) ----
    c.set(tcx + 1, dome_cy - dr, "e")
    c.set(tcx + 1, dome_cy - dr - 1, "E")

    # ---- a reaction ARC zig-zagging ACROSS from the dome to the base drum cap ----
    # drum cap top is ~ (dcx, dtop-4); arc bridges twin dome -> drum mouth.
    a0 = (tcx + dr, dome_cy + 1)
    a1 = (dcx, dtop - 4)
    arc = [a0,
           (a0[0] + (a1[0] - a0[0]) // 3, a0[1] - 1),
           (a0[0] + 2 * (a1[0] - a0[0]) // 3, a0[1] + 2),
           a1]
    for i in range(len(arc) - 1):
        c.line(arc[i], arc[i + 1], "E")
    for px, py in arc:
        c.set(px, py - 1, "e")

    # --- GOLD premium trim (t5 flourish only) ---
    # a gold VENT FINIAL spike crowning the dome
    c.set(tcx, dome_cy - dr - 1, "q")
    c.set(tcx, dome_cy - dr - 2, "O")
    # gold HOOP bands girdling BOTH reactors (premium reactor hoops, sparse)
    for ry in (TWIN_TOP_Y + 8, TWIN_TOP_Y + 12):
        c.line((tcx - TWIN_RX + 1, ry), (tcx + TWIN_RX - 1, ry), "q")
    for ry in (DRUM_TOP_Y + 8,):
        c.line((dcx - DRUM_RX + 1, ry), (dcx + DRUM_RX - 1, ry), "q")
    # a tiny gold boss where the cross-tie meets the twin (elite trim accent)
    c.set(tcx + TWIN_RX, TWIN_TOP_Y + 6, "O")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the reaction-synthesis-lab at upgrade `stage` (1..5). Stage 1 is
    IDENTICAL to the shipped base; each higher stage keeps every prior addition and
    bolts on the next (t2 chilled-reflux → t3 feed-tank annex → t4 twin reactor → t5
    reflux dome + gold). Painter's order: the BACK reactor masses (silo, twin, dome)
    and the right-end feed-tank are drawn around the hall so they occlude correctly,
    and the front-corner Liebig condenser SIGNATURE is drawn LAST so no upgrade ever
    paints over the hero apparatus."""
    c = Canvas()
    # painter's order (BASE, unchanged): BACK drum + transfer pipe, then the hall,
    # wall seams, pipework, roof, the RIGHT-face hero bay.
    reactor_drum(c)
    # t4 twin reactor rises on the back-LEFT of the drum; draw it right after the base
    # drum (and before the hall) so the hall front occludes its lower base like the drum.
    if stage >= 4:
        stage4_twin_reactor(c)
    transfer_pipe(c)
    hall = main_hall(c)
    parapet(c, hall)
    pipe_chase_seams(c, hall)
    pipework(c, hall)
    left_portholes(c, hall)
    roof_features(c, hall)
    # t3 feed-tank annex extends OUT to the right of the hall, on the ground; draw it
    # after the hall so the tank reads in front of the hall's right base corner.
    if stage >= 3:
        stage3_feed_tank(c, hall)
    control_bay(c, hall)
    # t5 reflux dome crowns the reactor pair (overhead, behind the hall front) — draw
    # before the condenser so the front signature still reads on top.
    if stage >= 5:
        stage5_reflux_dome(c)
    # t2 chilled-water header + 2nd coil sit on the upper-LEFT face beside the
    # condenser; draw just before the condenser so the hero coil stays front-most.
    if stage >= 2:
        stage2_chilled_reflux(c, hall)
    # the Liebig condenser signature is ALWAYS the front-most hero (drawn last)
    liebig_condenser(c, hall)
    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/chemworks"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "reaction-synthesis-lab"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped reaction-synthesis-lab.png, so it does NOT overwrite the
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
