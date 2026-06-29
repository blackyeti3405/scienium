#!/usr/bin/env python3
"""
Welding & Fabrication — Volt Lab economy building (BESPOKE-form fab yard).

NOT the gateway cube, NOT the Workshop's open-yard. The form is an OPEN-AIR
L-FOOTPRINT FAB YARD: a low concrete court with two low closed wings wrapping its
BACK corner (an L / `^`), and the dominant silhouette is an OVERHEAD GANTRY CRANE
that BRIDGES the open middle on two legs — a high M/L bridge beam carried on a
K/D leg seated on each wing, with a D trolley + K hook-block + M cable dropping
into the court. The work happens OUT IN THE OPEN under the crane.

  * a low CONCRETE YARD SLAB (h=3) is the foundation, ringed on its front edges
    with an o/K hazard kerb;
  * a back-LEFT wing carries a vertical rack of stacked M/D stock-metal bars
    (raw material) on its front face;
  * a back-RIGHT wing carries a g cyan supervisor window + a K man-door on its
    front face (the door is on the RIGHT wing);
  * a GANTRY CRANE spans the open court high up: a leg on each wing, a striped
    M/L bridge beam, a trolley + hook-block + cable — the rooftop-height cue that
    makes this NOT a closed roof and NOT the Workshop's cupola+vane.

Signature (one-of-one): a suspended arc-welder torch strikes a brilliant arc on a
steel I-BEAM joint on trestles in the open court — an O white-hot core, W/h halo,
a cyan-white c/g SPARK FOUNTAIN raining down, o ember chips on the floor, the weld
seam glowing o->O with an r heat-tint, and a faint c arc-glow rim on the inner
wing walls. (Distinct from the Workshop's tiny weathervane sparks.)

Composed entirely from art/isobuild.Box (no iso.draw_cube / base_windows).
"""
import os
import sys
import json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

# Base Volt palette (shared keys) + a few EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so welding-fabrication.png is
# unchanged):
#   b  deep cool steel  — matured structure tone for t3+ new masses (hood, rails)
#   e  energized cyan glow (mid)   E  energized cyan glow (bright) — t4/t5 power
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
VOLT = {"K": "#15181d", "W": "#eef2f6", "L": "#cdd6dd", "M": "#9aa3ad", "D": "#6c7682", "d": "#49515b",
        "h": "#d6f9ff", "c": "#aef0fb", "g": "#38cfe2", "G": "#1f8ba0",
        "o": "#ffe85a", "O": "#fff7a8", "r": "#c89a14",
        "b": "#3b4350", "e": "#6fe6f4", "E": "#caf7ff", "q": "#f3c63a"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def _set(c, x, y, ch):
    c.set(int(round(x)), int(round(y)), ch)


def _rect(c, x0, y0, x1, y1, fill=None, outline=None):
    """Axis-aligned pixel rect (inclusive)."""
    x0, x1 = int(round(min(x0, x1))), int(round(max(x0, x1)))
    y0, y1 = int(round(min(y0, y1))), int(round(max(y0, y1)))
    if fill is not None:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                c.set(x, y, fill)
    if outline is not None:
        for x in range(x0, x1 + 1):
            c.set(x, y0, outline)
            c.set(x, y1, outline)
        for y in range(y0, y1 + 1):
            c.set(x0, y, outline)
            c.set(x1, y, outline)


def _stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings); '.' = skip."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


def corrugate_roof(c, box, ribs=(0.3, 0.55, 0.8), ch="D"):
    """Sparse D corrugation ribs across a wing roof (parallel to left->front)."""
    for v in ribs:
        c.line(box.roof_pt(0.12, v), box.roof_pt(0.88, v), ch)
    for u in (0.3, 0.7):
        p = box.roof_pt(u, 0.14)
        _set(c, p[0], p[1], "K")


def stripe_edge(c, p0, p1, n):
    """o/K hazard teeth along an edge from p0 to p1 (rings the open yard)."""
    for k in range(n + 1):
        t = k / n
        x = p0[0] + t * (p1[0] - p0[0])
        y = p0[1] + t * (p1[1] - p0[1])
        _set(c, x, y, "o" if k % 2 == 0 else "K")


# ── 1. YARD SLAB — the open concrete floor (drawn FIRST, the foundation) ──────
def yard_slab(c):
    """A large low concrete slab the viewer looks down onto; the wings seat on its
    back edges, its front-center stays OPEN as the work-court. Flat (h=3)."""
    slab = Box(top=(32, 24), wx=11, wy=11, h=3)
    c.fill_poly([slab.r_top, slab.r_right, slab.r_front, slab.r_left], "M")
    c.fill_poly([slab.r_top, slab.r_left, slab.r_front], "L")
    c.fill_poly([slab.r_left, slab.r_front, slab.w_front, slab.w_left], "d")
    c.fill_poly([slab.r_front, slab.r_right, slab.w_right, slab.w_front], "D")
    for a, b in [(slab.r_top, slab.r_right), (slab.r_right, slab.r_front),
                 (slab.r_front, slab.r_left), (slab.r_left, slab.r_top),
                 (slab.r_left, slab.w_left), (slab.r_front, slab.w_front),
                 (slab.r_right, slab.w_right),
                 (slab.w_left, slab.w_front), (slab.w_front, slab.w_right)]:
        c.line(a, b, "K")
    stripe_edge(c, slab.r_left, slab.r_front, 11)
    stripe_edge(c, slab.r_front, slab.r_right, 11)
    return slab


# ── 2. BACK-LEFT WING — low shed carrying the stock-metal bar rack ────────────
def left_wing(c, slab):
    """A low shed pushed into the BACK-LEFT corner (long toward LEFT via wy, slim
    in wx). Pulled well left so a clear OPEN notch stays between the two wings —
    the open court the crane spans. Its front (shaded/right) face carries a
    vertical rack of stacked M/D stock-metal bars (raw material). Kept LOW so the
    crane bridge is the dominant silhouette."""
    apex = (slab.r_top[0] - 7, slab.r_top[1] - 6)
    wing = Box(top=apex, wx=3, wy=6, h=9)
    wing.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    corrugate_roof(c, wing)
    for u in (0.3, 0.6, 0.9):
        p = wing.left_pt(u, 1.4)
        _set(c, p[0], p[1], "L")
    # STOCK-METAL BAR RACK on the front (shaded right) face: a K frame holding
    # several horizontal M bars with D shadow gaps — clearly "raw stock". The face
    # toward the yard is this wing's right_pt face.
    fx0, fy0 = wing.right_pt(0.2, 2.0)
    fx0, fy0 = int(round(fx0)), int(round(fy0))
    rack_w, rack_h = 5, 6
    _rect(c, fx0, fy0, fx0 + rack_w, fy0 + rack_h, fill="d", outline="K")
    for j in range(1, rack_h, 2):
        c.line((fx0 + 1, fy0 + j), (fx0 + rack_w - 1, fy0 + j), "M")   # bar
        c.line((fx0 + 1, fy0 + j + 1), (fx0 + rack_w - 1, fy0 + j + 1), "D")  # gap
    _set(c, fx0 + 1, fy0 + 1, "L")
    _set(c, fx0 + 1, fy0 + 3, "L")
    return wing


# ── 3. BACK-RIGHT WING — low shed carrying the supervisor window + man-DOOR ────
def right_wing(c, slab):
    """A low shed pushed into the BACK-RIGHT corner (long toward RIGHT via wx, slim
    in wy). Pulled well right so the central notch stays open. Its lit (left) front
    face carries a g cyan supervisor window AND a bold K man-DOOR — the DOOR is on
    the RIGHT wing."""
    apex = (slab.r_top[0] + 7, slab.r_top[1] - 6)
    wing = Box(top=apex, wx=6, wy=2, h=9)
    wing.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    corrugate_roof(c, wing)
    for vv in (3, 6):
        _set(c, wing.r_front[0], wing.r_front[1] + vv, "K")
    # cyan SUPERVISOR WINDOW high on the lit (left) front face (left third)
    wing.window(c, "left", 0.1, 0.38, 1.6, 4.2, glass="g", hi="h", shade="G",
                frame="K", mullions=1)
    # bold K MAN-DOOR on the lit front face (right two-thirds): a tall recessed
    # dark slab with a d jamb, lit M panel edge, o handle — clearly a doorway.
    dx0, dy0 = wing.left_pt(0.58, 2.2)
    dx0, dy0 = int(round(dx0)), int(round(dy0))
    dw, dh = 4, 6
    _rect(c, dx0 - 1, dy0 - 1, dx0 + dw + 1, dy0 + dh, fill="d")   # jamb surround
    _rect(c, dx0, dy0, dx0 + dw, dy0 + dh, fill="K")               # dark doorway
    c.line((dx0 + 1, dy0 + 1), (dx0 + 1, dy0 + dh - 1), "M")       # lit door edge
    c.line((dx0 + 2, dy0 + 1), (dx0 + 2, dy0 + dh - 1), "D")       # door panel
    _set(c, dx0 + 1, dy0 + dh // 2, "o")                          # door lamp/handle
    return wing


# ── 4. GANTRY CRANE — the dominant silhouette spanning the open court ─────────
def gantry(c, lw, rw):
    """The dominant silhouette: two K/D gantry LEGS rise off the OUTER top of each
    wing and carry a deep horizontal bridge GIRDER spanning high ABOVE the open
    court (above both wing roofs), with o/K hazard chevrons, a D TROLLEY at court
    centre, a K hook-block and an M cable dropping toward the court floor. Drawn
    AFTER the wings, OVER the open court. Returns (trolley_x, hook_y)."""
    # leg seats: the BACK-OUTER top corner of each wing roof, so the beam clearly
    # bridges the OPEN gap between the wings AND the legs stay clear of the wings'
    # court-facing faces (where the stock-rack / window / door live).
    ll = lw.roof_pt(0.35, 0.25)         # left leg base (back-outer of left wing)
    rl = rw.roof_pt(0.65, 0.25)         # right leg base (back-outer of right wing)
    llx, lly = int(round(ll[0])), int(round(ll[1]))
    rlx, rly = int(round(rl[0])), int(round(rl[1]))

    beam_y = 9                           # high horizontal girder (above both roofs)

    # --- two vertical gantry legs (2px: lit L body / D shade / K flanks) — slim,
    # so they read as crane legs distinct from the solid wing walls below. ---
    def leg(x, base_y):
        for y in range(beam_y, base_y + 1):
            c.set(x, y, "L")            # lit body
            c.set(x + 1, y, "D")        # shaded
            c.set(x - 1, y, "K")        # K flanks
            c.set(x + 2, y, "K")
        c.line((x - 1, base_y), (x + 2, base_y), "K")   # foot brace on the wing
    leg(llx, lly)
    leg(rlx, rly)

    # --- deep horizontal BRIDGE GIRDER spanning the court (4 rows tall) ---
    beam_x0, beam_x1 = llx - 2, rlx + 2
    _rect(c, beam_x0, beam_y - 1, beam_x1, beam_y + 1, fill="M")
    c.line((beam_x0, beam_y - 1), (beam_x1, beam_y - 1), "L")   # lit crest
    c.line((beam_x0, beam_y + 1), (beam_x1, beam_y + 1), "D")   # shaded underside
    c.line((beam_x0, beam_y - 2), (beam_x1, beam_y - 2), "K")   # K top edge
    c.line((beam_x0, beam_y + 2), (beam_x1, beam_y + 2), "K")   # K bottom edge
    c.set(beam_x0 - 1, beam_y, "K")
    c.set(beam_x1 + 1, beam_y, "K")
    # o/K hazard chevron stripes along the girder body (warning striping)
    for x in range(beam_x0 + 1, beam_x1 - 1, 3):
        c.set(x, beam_y, "o")
        c.set(x + 1, beam_y, "K")

    # --- TROLLEY at court centre + K hook-block + M hoist cable ---
    trolley_x = (beam_x0 + beam_x1) // 2
    _rect(c, trolley_x - 2, beam_y + 2, trolley_x + 2, beam_y + 4, fill="D", outline="K")
    c.set(trolley_x - 1, beam_y + 3, "M")                      # trolley lit face
    # hoist cable + small K hook-block hanging below the trolley
    hook_y = beam_y + 9
    c.line((trolley_x, beam_y + 4), (trolley_x, hook_y), "M")  # cable
    _rect(c, trolley_x - 1, hook_y, trolley_x + 1, hook_y + 1, fill="K")  # hook-block
    return trolley_x, hook_y + 1


# ── 5. SIGNATURE — arc-welder torch + spark fountain over an I-beam ───────────
def ibeam_workpiece(c, slab):
    """A bright steel I-BEAM lying on two D trestles in the OPEN court (pulled to
    the front so it is clear of the wings) — L top flange, M web, D lower flange,
    hard K outline. Returns the strike-joint (x,y) where the arc lands. Drawn
    before the arc so the flash sits on top."""
    bx, by = slab.roof_pt(0.5, 0.6)
    bx, by = int(round(bx)), int(round(by))
    # two D trestles under the beam (splayed A-frames)
    for tx in (bx - 6, bx + 6):
        c.line((tx, by + 2), (tx - 2, by + 6), "D")
        c.line((tx + 1, by + 2), (tx + 2, by + 6), "d")
        c.set(tx - 2, by + 6, "K")
        c.set(tx + 2, by + 6, "K")
    # the I-beam: a clean horizontal H-section read from the side.
    ib = [
        "KKKKKKKKKKKKK",   # top flange top edge
        "KLLLLLLLLLLLK",   # top flange (lit)
        "KKKKKMMKKKKKK",   # under-flange shadow, web starts
        "....KMMK.....",   # web (narrow)
        "....KMMK.....",   # web
        "KKKKKMMKKKKKK",   # web -> bottom flange
        "KDDDDDDDDDDDK",   # bottom flange (shaded)
        "KKKKKKKKKKKKK",   # bottom edge
    ]
    _stamp(c, bx - 6, by - 4, ib)
    # the strike JOINT sits on the TOP flange just left of centre; the seam there
    # glows o->O with an r heat-tint bleeding into the cooler metal.
    jx, jy = bx - 2, by - 4
    c.set(jx, jy, "O")
    c.set(jx + 1, jy, "o")
    c.set(jx - 1, jy, "r")
    c.set(jx + 2, jy, "r")
    return jx, jy


def torch_and_arc(c, hook_x, hook_y, joint):
    """The K/D arc-welder TORCH hangs straight under the crane hook-block on an M
    lead, nozzle aimed down at the I-beam joint, where a BRILLIANT arc strikes — an
    O white-hot core, W/h halo, a cyan-white c/g SPARK FOUNTAIN raining down and
    out, and o ember chips bouncing on the court floor."""
    jx, jy = joint

    # --- torch hangs directly below the hook-block, nozzle just above the joint ---
    torch_x = jx
    torch_top = hook_y + 1
    nozzle_y = jy - 3
    # M lead from the hook-block down to the torch head
    c.line((hook_x, hook_y), (torch_x, torch_top), "M")

    # --- TORCH HEAD: a K/D body with a tapering nozzle pointing DOWN at the joint
    torch = [
        "KDK",   # cable boss
        "KMK",   # torch body (lit edge)
        "KDK",   # body
        ".K.",   # neck
        ".K.",   # nozzle tip toward the joint
    ]
    _stamp(c, torch_x - 1, torch_top, torch)

    # --- ARC FLASH at the joint: bright white-hot core + tight halo ---
    c.set(jx, jy, "O")            # white-hot core
    c.set(jx, jy - 1, "W")
    c.set(jx - 1, jy, "W")
    c.set(jx + 1, jy, "h")
    c.set(jx - 1, jy - 1, "h")
    c.set(jx + 1, jy - 1, "h")

    # --- CYAN-WHITE SPARK FOUNTAIN raining down and outward from the strike ---
    sparks = [
        (jx - 2, jy + 1, "c"), (jx - 3, jy + 2, "g"), (jx - 4, jy + 4, "c"),
        (jx - 1, jy + 2, "h"), (jx - 2, jy + 3, "c"), (jx - 3, jy + 5, "g"),
        (jx + 2, jy + 1, "c"), (jx + 3, jy + 2, "g"), (jx + 4, jy + 4, "c"),
        (jx + 1, jy + 2, "h"), (jx + 2, jy + 3, "c"), (jx + 3, jy + 5, "g"),
        (jx, jy + 3, "c"), (jx - 1, jy + 4, "g"), (jx + 1, jy + 4, "g"),
    ]
    for sx, sy, ch in sparks:
        c.set(sx, sy, ch)

    # --- o ember CHIPS bouncing on the court floor below (warm, sparse) ---
    for ex, ey in ((jx - 5, jy + 7), (jx + 5, jy + 7), (jx - 1, jy + 8)):
        c.set(ex, ey, "o")
    c.set(jx + 2, jy + 8, "O")

    return torch_x, torch_top


def arc_rim_light(c, lw, rw):
    """A faint c arc-glow rim cast onto the inner wing faces by the welding arc —
    the surrounding metal catching the cyan-white flash."""
    # left wing's inner (right/shaded) face toward the court
    for v in (3.4, 4.6, 5.8):
        p = lw.right_pt(0.78, v)
        _set(c, p[0], p[1], "c")
    # right wing's inner (left/lit) face toward the court, near the door side
    for v in (3.4, 4.6, 5.8):
        p = rw.left_pt(0.5, v)
        _set(c, p[0], p[1], "c")


# ── 6. POWER CONDUIT — glowing o conduit up the RIGHT wing's OUTER face ────────
def power_conduit(c, rw):
    """A glowing o power conduit running up the right wing's OUTER (shaded/right)
    face and onto the roof toward the gantry leg — kept on the OUTER face so it
    does not compete with the supervisor window / man-door on the court face."""
    c.line(rw.right_pt(0.5, 1.4), rw.right_pt(0.5, 6.0), "o")
    c.line(rw.right_pt(0.58, 1.4), rw.right_pt(0.58, 6.0), "r")
    base = rw.roof_pt(0.65, 0.3)
    c.line((base[0], base[1]), (base[0], base[1] - 3), "o")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS welding/fab
# structure onto the prior form — never restarts, never recolors the whole
# building. Theme: the open-air fab yard grows into a fully built-out, robotic
# weld cell. Colours mature stage by stage; a HOT-metal o->O spark palette keeps
# the sparks distinct from purely-cyan buildings; gold (q) only as a t5 flourish.
#
#   t2  small functional add : a GAS-BOTTLE RACK (two slim tanks) + a brighter O
#                              arc-spark spit in the yard.
#   t3  structural add       : a FUME-EXTRACTION HOOD + ducting on posts over the
#                              weld station (a canted hood box — an over-station
#                              hood, NOT a full lean-to roof).
#   t4  major add            : a SECOND GANTRY RAIL BAY extending the crane run +
#                              a glowing e POSITIONER TURNTABLE rotating a part.
#   t5  crowning feature     : a ROBOTIC WELD CELL — twin arms throwing an E+O
#                              spark fountain over a glowing assembly + a q gold
#                              gantry banner. = fully evolved.
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_gas_rack(c, slab, lw, joint):
    """t2 — SMALL FUNCTIONAL ADD: a GAS-BOTTLE RACK of two slim cylinder tanks
    (oxygen + fuel) stood against the LEFT wing on the open slab, chained to a K
    frame, with M regulator caps — clearly welding supply gear. Plus one brighter
    O arc-spark spit kicked further out from the strike joint (the arc burns
    hotter as the yard upgrades). On-theme, modest, base palette + a brighter O."""
    # two slim bottles parked on the slab in the LEFT-front pocket (clear of the
    # I-beam strike at court centre and of the left-wing stock rack). Each is a
    # clear tall 2px cylinder with a domed shoulder + valve cap, set 2px apart so
    # they read as a distinct PAIR of gas bottles, not one grey lump.
    bx, by = slab.roof_pt(0.20, 0.34)
    bx, by = int(round(bx)), int(round(by))
    for i, (dx, body, band) in enumerate(((0, "M", "g"), (4, "D", "o"))):
        tx = bx + dx
        # bottle body (h=8): lit left col / shaded right col, K outline
        _rect(c, tx, by - 8, tx + 1, by, fill=body, outline="K")
        c.set(tx, by - 7, "L" if body == "M" else "M")   # body glint
        c.set(tx, by - 8, "M" if body == "M" else "D")   # rounded shoulder
        c.set(tx + 1, by - 8, "K")
        # valve cap + stub neck above the shoulder
        c.set(tx, by - 10, "M")
        c.set(tx, by - 11, "L")
        c.set(tx, by - 9, "K")
        # colour band identifying the gas (cyan = inert, o = fuel)
        c.set(tx, by - 5, band)
        c.set(tx + 1, by - 5, "G" if band == "g" else "r")
    # a K chain/strap across both bottles holding them to a short rack post
    c.line((bx, by - 6), (bx + 5, by - 6), "K")
    c.set(bx + 6, by - 6, "K")
    c.line((bx + 6, by - 6), (bx + 6, by), "D")          # rack upright (right side)
    c.set(bx + 6, by, "K")
    # brighter O arc-spark spit kicked out from the strike joint (hotter arc)
    jx, jy = joint
    c.set(jx - 6, jy + 6, "O")
    c.set(jx + 6, jy + 5, "o")


def stage3_fume_hood(c, slab, joint):
    """t3 — STRUCTURAL ADD: a FUME-EXTRACTION HOOD canted OVER the weld station —
    a slim b/M canopy box held on two posts just ABOVE the I-beam strike joint,
    with a duct elbow running back-up toward the right wing. A real new structural
    mass (hood plane + posts + duct), distinct from a full lean-to roof: it hovers
    only over the work, leaving the open court read. Introduces deep-steel `b`."""
    jx, jy = joint
    # hood plane: a LOW, FLAT canted canopy hovering well above the strike, leaving
    # a clear air gap so the arc/I-beam read beneath it (NOT a wall to the floor).
    # Authored as a shallow parallelogram in screen space, 2px thick.
    hy = jy - 13                                   # canopy sits high above the arc
    inA = (jx - 6, hy - 1)                          # back edge (up-left .. up-right)
    inB = (jx + 6, hy - 3)
    outA = (jx - 6, hy + 1)                         # front edge (toward viewer)
    outB = (jx + 6, hy - 1)
    c.fill_poly([inA, inB, outB, outA], "b")       # shaded underside (deep steel)
    topA = (inA[0], inA[1] - 1)
    topB = (inB[0], inB[1] - 1)
    c.fill_poly([topA, topB, outB, outA], "M")     # lit hood top
    c.line(topA, topB, "L")                          # bright back lip
    c.line(outA, outB, "K")                          # front under-lip
    for a, b in [(topA, topB), (topB, outB), (outB, outA), (outA, topA)]:
        c.line(a, b, "K")
    # intake slot on the hood underside (the suction mouth) — a cyan-rimmed slit
    c.line((jx - 4, hy + 1), (jx + 4, hy - 1), "G")
    # two SHORT slim posts from the hood front corners — they stop high (mid-air),
    # bracketing the work without walling it in; arc + beam stay open below.
    for px, py in (outA, outB):
        c.line((px, py), (px, py + 4), "b")
        c.set(px + 1, py + 1, "D")
        c.set(px, py + 4, "K")
    # duct elbow: a short ribbed pipe rising off the hood back-right toward the wing
    dux, duy = topB
    c.line((dux, duy), (dux + 3, duy - 4), "M")
    c.line((dux + 1, duy), (dux + 4, duy - 4), "b")
    for k in range(3):
        c.set(dux + 1 + k, duy - 1 - k, "K")        # rib ticks
    c.set(dux + 4, duy - 4, "D")                     # duct cap


def stage4_rail_bay(c, slab, lw, rw):
    """t4 — MAJOR ADD: a SECOND GANTRY RAIL BAY extending the crane run toward the
    viewer, plus a glowing POSITIONER TURNTABLE in the new bay rotating a part. A
    prominent new vertical+horizontal mass: two b runway rails carried on short
    posts off the front of each wing, a cross-rail spanning the new bay, and a
    cyan-glowing e turntable holding a workpiece at the front-right of the court.
    Palette matures: deep `b` rails + energized cyan `e/E` on the positioner."""
    # A SECOND gantry rail bay extending the crane run toward the RIGHT/viewer: a
    # short OPEN runway (thin top chord on legs, NOT a solid shelf) carried on two
    # posts rising off the RIGHT side of the court, with a small carriage riding it.
    # Kept to the right half + raised clear of the floor so it reads as a crane rail
    # bay, not a deck — and never overlaps the central arc.
    lp = rw.left_pt(0.15, 0.6)                   # inner post head (near court centre)
    rp = rw.w_front                              # outer-front foot of the right wing
    lpx, lpy = int(round(lp[0])), int(round(lp[1]))
    rpx, rpy = int(round(rp[0])), int(round(rp[1])) - 8
    rail_y = min(lpy, rpy)
    # two posts carrying the new rail (deep steel, lit edge) — visible legs + gap
    for px, py in ((lpx, lpy + 7), (rpx, rpy + 7)):
        c.line((px, py - 7), (px, py), "b")
        c.set(px + 1, py - 6, "D")
        c.set(px, py, "K")
        c.set(px, py - 7, "K")
    # the OPEN cross-rail (single lit chord + under-edge — no solid fill) spanning
    # only the right bay
    c.line((lpx, rail_y - 1), (rpx, rail_y - 1), "M")   # lit top chord
    c.line((lpx, rail_y), (rpx, rail_y), "b")           # rail body
    c.line((lpx, rail_y + 1), (rpx, rail_y + 1), "K")   # under-edge
    c.set(lpx - 1, rail_y, "K")
    c.set(rpx + 1, rail_y, "K")
    # a small carriage riding the new rail (matches the gantry's trolley language)
    cgx = (lpx + rpx) // 2
    _rect(c, cgx - 1, rail_y + 1, cgx + 1, rail_y + 2, fill="D", outline="K")
    c.set(cgx, rail_y + 3, "M")                          # tiny hook stub

    # POSITIONER TURNTABLE in the open FRONT-RIGHT pocket of the court (clear of the
    # central arc and below the new rail): a b pedestal carrying a glowing e
    # turntable disc rotating a clamped part.
    tx, ty = slab.roof_pt(0.78, 0.22)
    tx, ty = int(round(tx)), int(round(ty))
    # pedestal base (deep steel drum)
    _rect(c, tx - 1, ty - 3, tx + 1, ty, fill="b", outline="K")
    c.set(tx - 1, ty, "K")
    c.set(tx + 1, ty, "K")
    c.set(tx - 1, ty - 1, "M")                          # lit pedestal edge
    # glowing turntable disc (energized cyan ellipse) on top of the pedestal
    disc_y = ty - 4
    for dx, ch in ((-2, "G"), (-1, "e"), (0, "E"), (1, "e"), (2, "G")):
        c.set(tx + dx, disc_y, ch)
    c.set(tx, disc_y - 1, "h")
    # a short clamped workpiece standing on the turntable, faintly glowing
    c.line((tx, disc_y - 1), (tx + 2, disc_y - 4), "M")
    c.set(tx + 2, disc_y - 4, "e")
    c.set(tx, disc_y - 2, "L")


def stage5_robocell(c, slab, rw, joint):
    """t5 — CROWNING FEATURE = FULLY EVOLVED robotic weld cell. Twin articulated
    ROBOT WELD ARMS rise on a shared b pedestal beside the strike joint and throw
    a brilliant E+O spark FOUNTAIN over a glowing assembly — the yard now welds
    itself, elite-tier. Dressed out with a q GOLD gantry BANNER strung under the
    high bridge beam + gold arm-tip accents. Reads maxed-out, still the same yard."""
    import math
    jx, jy = joint
    # shared pedestal for the twin arms, planted just LEFT of the strike joint so
    # the arms reach IN over the I-beam (the existing torch covers the right side).
    # A clear 3px b column with a lit M edge and K base so the arms read as mounted.
    pbx, pby = jx - 9, jy + 4
    _rect(c, pbx - 1, pby - 6, pbx + 1, pby, fill="b", outline="K")
    c.set(pbx - 1, pby - 5, "M")                  # lit column edge
    c.set(pbx, pby - 6, "M")                       # lit top
    c.set(pbx - 1, pby, "K")
    c.set(pbx + 1, pby, "K")
    c.set(pbx + 1, pby + 1, "d")                   # contact shadow

    # two articulated arms: each is a shoulder->elbow->wrist polyline reaching from
    # the pedestal toward the joint. Drawn 2px THICK (b body + bright L/M lit edge)
    # with a hard K elbow pivot + a glowing welding tip, so they read as robot arms.
    def arm(shoulder, elbow, wrist, tip_ch):
        for (a, b) in ((shoulder, elbow), (elbow, wrist)):
            c.line(a, b, "b")                      # link body
            c.line((a[0], a[1] - 1), (b[0], b[1] - 1), "L")   # bright lit top edge
            c.line((a[0], a[1] + 1), (b[0], b[1] + 1), "K")   # shaded under edge
        c.set(elbow[0], elbow[1], "K")             # elbow pivot
        c.set(elbow[0], elbow[1] - 1, "M")         # elbow housing glint
        c.set(wrist[0], wrist[1], "K")             # wrist housing
        c.set(wrist[0] + 1, wrist[1], tip_ch)      # glowing welding tip
        c.set(wrist[0] + 1, wrist[1] - 1, "E")     # tip flare
    # upper arm reaches high over the joint; lower arm reaches in flatter beneath it.
    arm((pbx, pby - 6), (pbx + 4, jy - 5), (jx - 3, jy - 2), "O")
    arm((pbx, pby - 3), (pbx + 5, jy - 1), (jx - 3, jy + 1), "E")
    # gold accent collar on the shared shoulder (elite trim, sparse)
    c.set(pbx, pby - 5, "q")

    # an intensified E+O spark FOUNTAIN over the assembly (the two-arm cell burns
    # harder than the single torch): hot O/o core blended with cyan-white E/e mist.
    fountain = [
        (jx - 1, jy - 2, "O"), (jx, jy - 3, "E"), (jx + 1, jy - 2, "W"),
        (jx - 3, jy - 1, "e"), (jx + 3, jy - 1, "e"), (jx - 4, jy + 1, "O"),
        (jx + 4, jy + 1, "o"), (jx - 2, jy + 4, "E"), (jx + 2, jy + 4, "E"),
        (jx, jy - 4, "h"), (jx - 5, jy + 3, "o"), (jx + 5, jy + 3, "o"),
    ]
    for sx, sy, ch in fountain:
        c.set(sx, sy, ch)

    # --- q GOLD gantry BANNER strung under the high bridge beam (t5 flourish) ---
    # the bridge girder sits at beam_y=9 spanning the court; hang a short gold
    # pennant banner from its centre (recomputed from the same span the gantry uses).
    beam_y = 9
    cxf = slab.roof_pt(0.5, 0.5)[0]
    bx = int(round(cxf))
    by = beam_y + 3
    c.fill_poly([(bx - 5, by), (bx + 5, by), (bx + 5, by + 2), (bx - 5, by + 2)], "q")
    c.line((bx - 5, by), (bx + 5, by), "O")            # bright top trim
    c.line((bx - 5, by + 3), (bx - 5, by + 1), "q")    # swallowtail dips
    c.set(bx, by + 1, "K")                              # banner emblem dot
    c.set(bx - 2, by + 1, "K")
    c.set(bx + 2, by + 1, "K")
    # gold caps on the two gantry legs' bridge ends (elite trim, sparse)
    c.set(bx - 6, beam_y - 2, "q")
    c.set(bx + 6, beam_y - 2, "q")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the welding-fabrication yard at upgrade `stage` (1..5). Stage 1 is
    IDENTICAL to the shipped base; each higher stage keeps every prior addition and
    bolts on the next (t2 gas-rack → t3 fume-hood → t4 rail-bay+positioner → t5
    robotic weld cell + gold banner). Painter's order keeps overhead additions on
    top of the masses they grow from."""
    c = Canvas()
    # painter's order: slab (foundation) -> back wings -> gantry crane OVER the
    # court -> I-beam workpiece -> arc/torch/spark signature on top -> rim light.
    slab = yard_slab(c)
    lw = left_wing(c, slab)
    rw = right_wing(c, slab)
    power_conduit(c, rw)
    tx, ty = gantry(c, lw, rw)
    joint = ibeam_workpiece(c, slab)
    torch_and_arc(c, tx, ty, joint)
    arc_rim_light(c, lw, rw)

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    if stage >= 2:
        stage2_gas_rack(c, slab, lw, joint)
    if stage >= 3:
        stage3_fume_hood(c, slab, joint)
    if stage >= 4:
        stage4_rail_bay(c, slab, lw, rw)
    if stage >= 5:
        stage5_robocell(c, slab, rw, joint)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/volt_lab"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "welding-fabrication"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped welding-fabrication.png, so it does NOT overwrite the
    base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": VOLT, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"volt_lab_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"volt_lab_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
