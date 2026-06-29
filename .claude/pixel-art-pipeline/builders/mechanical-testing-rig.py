#!/usr/bin/env python3
"""
Mechanical Testing Rig — Volt Lab economy building (BESPOKE open load-frame).

NOT the gateway cube, NOT any Volt sibling (hangar+arm / wide CNC factory /
flat PCB board / extruder tower / open-yard). The silhouette here is a TALL
OPEN STRUCTURAL LOAD-FRAME / GANTRY: a low solid foundation plinth with a tall
skeletal FOUR-POST portal rising out of it — exposed `K`/`D` corner girders, a
heavy `M`/`L` crosshead crossbeam capping the top and a mid tie-beam, the middle
left OPEN so you see straight through to the press. The control panel sits on the
LEFT face of the plinth (the operator station).

The hero (one-of-one in the catalog): a hydraulic ram drives DOWN out of the
crosshead onto a glowing specimen inside a small `c`/`g` glass crush-cylinder —
stress-glint cracks + strain sparks — while a round `W` load gauge on a front
post swings its `o`/`r` needle up toward an `r` redline arc. A glowing `o`
hydraulic line snakes from the base pump up to the ram.

Composed entirely from art/isobuild.Box + Canvas primitives. No draw_cube /
base_windows.
"""
import os
import sys
import json
import math
import subprocess

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

# Base Volt palette (shared keys) + a few EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so the base PNG is unchanged):
#   b  deep cool steel  — matured structure tone for t3+ new masses (twin column,
#      power-pack housing, chamber frame)
#   e  energized cyan glow (mid)   E  energized cyan glow (bright) — the t4/t5 power
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
VOLT = {"K": "#15181d", "W": "#eef2f6", "L": "#cdd6dd", "M": "#9aa3ad", "D": "#6c7682", "d": "#49515b",
        "h": "#d6f9ff", "c": "#aef0fb", "g": "#38cfe2", "G": "#1f8ba0",
        "o": "#ffe85a", "O": "#fff7a8", "r": "#c89a14",
        "b": "#3b4350", "e": "#6fe6f4", "E": "#caf7ff", "q": "#f3c63a"}


# ── low-level pixel helpers (mirroring the Volt set's conventions) ────────────
def _rect(c, x0, y0, x1, y1, fill=None, outline=None):
    """Axis-aligned pixel rect (inclusive)."""
    if x0 > x1:
        x0, x1 = x1, x0
    if y0 > y1:
        y0, y1 = y1, y0
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


def _post(c, x, y0, y1, core="D", hi="L", shade="d"):
    """A heavy 2px-wide vertical girder column with a hard K flank on each side.

    A lit `hi` near (left) edge over a `core` body, a `shade` far edge — flat
    shading, no dither — with a continuous K outline riding each flank so the
    column reads as a clean exposed steel post against transparent sky / the
    open frame interior."""
    if y0 > y1:
        y0, y1 = y1, y0
    for y in range(y0, y1 + 1):
        c.set(x, y, hi)          # lit near edge
        c.set(x + 1, y, shade)   # shaded far edge (2px body)
        c.set(x - 1, y, "K")     # K flank
        c.set(x + 2, y, "K")     # K flank


def _girder(c, a, b, top="L", side="M", deep=False):
    """A thin iso crossbeam rail from a to b: a lit/`top` crest line, a `side`
    body line just below, and a K outline on the underside — so the cap reads as
    an exposed steel girder, not a filled plate. `deep` adds one more body row for
    the heavy front rails."""
    ax, ay = int(round(a[0])), int(round(a[1]))
    bx, by = int(round(b[0])), int(round(b[1]))
    c.line((ax, ay), (bx, by), top)                 # lit crest
    c.line((ax, ay + 1), (bx, by + 1), side)        # body
    if deep:
        c.line((ax, ay + 2), (bx, by + 2), side)    # extra body row (heavy rail)
        c.line((ax, ay + 3), (bx, by + 3), "K")     # underside outline
    else:
        c.line((ax, ay + 2), (bx, by + 2), "K")     # underside outline


def _disk_ring(c, p, r, fill, ring="K"):
    """Solid filled disk with a 1px K ring (gauge face / bearing)."""
    x, y = int(round(p[0])), int(round(p[1]))
    for dy in range(-r - 1, r + 2):
        for dx in range(-r - 1, r + 2):
            d2 = dx * dx + dy * dy
            if d2 <= r * r + 1:
                c.set(x + dx, y + dy, fill)
            elif d2 <= (r + 1) * (r + 1) + 1:
                c.set(x + dx, y + dy, ring)


# ── the bespoke foundation plinth ─────────────────────────────────────────────
def plinth(c):
    """The low, broad, solid machine foundation. Heavy and squat so the open
    frame above reads as TALL by contrast. A corrugated `D` skirt + rivet line on
    the lit face; the control panel is added separately. Returns the Box."""
    p = Box((26, 30), wx=12, wy=10, h=9)
    p.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # corrugated D skirt ribs on the lit (left) face — a heavy machine base
    for f in (0.18, 0.34, 0.50, 0.66, 0.82):
        c.line(p.left_pt(f, 7), p.left_pt(f, 8.5), "D")
    # rivet line across the top of the lit face
    for f in (0.12, 0.30, 0.48, 0.66, 0.84):
        x, y = p.left_pt(f, 1.4)
        c.set(int(round(x)), int(round(y)), "L")
    # darker corrugation on the shaded right face too
    for f in (0.25, 0.55, 0.85):
        c.line(p.right_pt(f, 6), p.right_pt(f, 8.5), "d")
    return p


def control_panel(c, p):
    """The operator station: a wide K-framed control panel on the LEFT face of
    the plinth, carrying a `g` cyan load-readout screen with a digital number
    band and an `o` status pip. The signature 'opening' — no stock windows."""
    # a BIG, clean panel filling most of the left face so it reads as the operator
    # station. u runs along the face (left→front), v is px down the 9px-tall face.
    u0, u1, v0, v1 = 0.08, 0.60, 1.4, 7.6
    # K outer bezel
    c.fill_poly([p.left_pt(u0, v0), p.left_pt(u1, v0),
                 p.left_pt(u1, v1), p.left_pt(u0, v1)], "K")
    # cyan readout SCREEN inset (the load-readout) — one clean g panel
    g0, g1, gt, gb = u0 + 0.04, u1 - 0.18, v0 + 0.8, v1 - 2.4
    c.fill_poly([p.left_pt(g0, gt), p.left_pt(g1, gt),
                 p.left_pt(g1, gb), p.left_pt(g0, gb)], "g")
    c.line(p.left_pt(g0, gt + 0.2), p.left_pt(g1, gt + 0.2), "h")   # lit top streak
    c.line(p.left_pt(g0, gb - 0.2), p.left_pt(g1, gb - 0.2), "G")   # shaded bottom
    # ONE bright digital readout band across the screen middle (a load value)
    mid = (gt + gb) / 2
    c.line(p.left_pt(g0 + 0.05, mid), p.left_pt(g1 - 0.05, mid), "O")
    c.line(p.left_pt(g0 + 0.05, mid + 0.9), p.left_pt(g1 - 0.30, mid + 0.9), "h")
    # status pips + a couple of M control buttons along the lower bezel strip
    by = v1 - 1.0
    bx, byy = p.left_pt(u0 + 0.06, by)
    c.set(int(round(bx)), int(round(byy)), "o")          # green-ready pip
    for f in (0.18, 0.30, 0.42):
        bx, byy = p.left_pt(u0 + f, by)
        c.set(int(round(bx)), int(round(byy)), "L")      # button caps
    # an o status lamp on the upper-right corner of the bezel
    bx, byy = p.left_pt(u1 - 0.05, v0 + 1.2)
    c.set(int(round(bx)), int(round(byy)), "o")


# ── the open four-post load-frame ─────────────────────────────────────────────
def load_frame(c, p):
    """The TALL open portal rising out of the plinth.

    Four corner girders stand on the four top corners of the plinth roof and rise
    ~22px to a heavy crosshead beam; a mid tie-beam ties the front pair. The
    interior is LEFT OPEN — only girders + beams are drawn — so the crush chamber
    inside is fully visible. Returns the screen geometry (column x's, crosshead y,
    plinth roof y) the press hero anchors to.

    BACK girders are stamped first, then the crosshead, then FRONT girders, so the
    front members occlude the back ones (painter's order)."""
    # the four roof corners of the plinth = the frame footprint
    bl = p.roof_pt(0.0, 0.0)    # back-LEFT  corner (r_left)
    bf = p.roof_pt(1.0, 0.0)    # FRONT      corner (r_front, nearest the viewer)
    bt = p.roof_pt(0.0, 1.0)    # BACK       corner (r_top, farthest)
    br = p.roof_pt(1.0, 1.0)    # back-RIGHT corner (r_right)

    H = 23                       # column height (tall, skeletal)
    # column top-of-post anchor x's (post() draws a 2px body to the right of x,
    # so step the x left by 1 to centre the 2px post on the corner)
    def cx(pt):
        return int(round(pt[0])) - 1
    cap_y = lambda pt: int(round(pt[1]))   # roof-corner y = column base

    bl_x, bf_x, bt_x, br_x = cx(bl), cx(bf), cx(bt), cx(br)
    bl_y, bf_y, bt_y, br_y = cap_y(bl), cap_y(bf), cap_y(bt), cap_y(br)

    # tops of each column
    bl_top, bf_top = bl_y - H, bf_y - H
    bt_top, br_top = bt_y - H, br_y - H

    # The four column TOPS in screen space (the crosshead corners sit one beam
    # above each post top so the cap rides on the columns).
    bl_t = (bl_x, bl_top)
    bf_t = (bf_x, bf_top)
    bt_t = (bt_x, bt_top)
    br_t = (br_x, br_top)

    # 1) BACK girders first (top corner + right corner) — darker, sit behind.
    _post(c, bt_x, bt_top, bt_y, core="d", hi="D", shade="d")
    _post(c, br_x, br_top, br_y, core="d", hi="D", shade="d")

    # 2) BACK crosshead members: two thin D girders joining the back-top column to
    #    the left/right tops (the FAR rails of the open cap). The middle of the cap
    #    stays OPEN — no roof plate — so you see straight down into the frame.
    _girder(c, bt_t, bl_t, top="D", side="d")      # back-left far rail
    _girder(c, bt_t, br_t, top="D", side="d")      # back-right far rail

    # 3) FRONT girders (left corner + front corner) — lit, sit in front.
    _post(c, bl_x, bl_top, bl_y, core="D", hi="L", shade="d")
    _post(c, bf_x, bf_top, bf_y, core="D", hi="L", shade="d")

    # 4) the HEAVY crosshead crossbeam — the two FRONT rails of the open cap meeting
    #    at the front column top. A 3px-deep lit girder along the left axis (carrying
    #    the hazard chevrons) + a shaded girder along the right axis. Middle open.
    cap_y_top = bl_top - 1
    _girder(c, (bl_x, cap_y_top), (bf_x, bf_top - 1), top="L", side="M", deep=True)  # front-left rail
    _girder(c, (bf_x, bf_top - 1), (br_x, br_top - 1), top="M", side="D", deep=True)  # front-right rail
    # o hazard chevrons stencilled along the front-left rail's top edge
    chev = []
    steps = 22
    for s in range(steps):
        t = s / (steps - 1)
        cxp = bl_x + t * (bf_x - bl_x)
        cyp = cap_y_top + t * ((bf_top - 1) - cap_y_top)
        chev.append((int(round(cxp)), int(round(cyp))))
    for i, (xp, yp) in enumerate(chev):
        c.set(xp, yp, "o" if i % 2 == 0 else "K")
    # small c warning-lamp puck standing on the crosshead front corner
    lx, ly = bf_x + 1, bf_top - 3
    c.set(lx, ly, "K")
    c.set(lx, ly - 1, "c")
    c.set(lx - 1, ly - 1, "G")
    c.set(lx + 1, ly - 1, "G")
    c.set(lx, ly - 2, "h")
    # crosshead centre y (where the ram hangs from) = front corner top of the cap
    crosshead_mid_y = bf_top - 1

    # 5) mid TIE-BEAM tying the front-left and front columns together (a short
    #    horizontal girder following the iso left axis) — a structural cross-member;
    #    the interior stays open below it. Drawn from the left column to the front
    #    column at mid height.
    tie_y0 = bl_top + 11
    tie_dy = bf_y - bl_y          # iso left-axis run drops this much over the span
    tie_y1 = tie_y0 + tie_dy
    c.line((bl_x + 1, tie_y0), (bf_x + 1, tie_y1), "L")       # lit crest
    c.line((bl_x + 1, tie_y0 + 1), (bf_x + 1, tie_y1 + 1), "D")   # body
    c.line((bl_x + 1, tie_y0 + 2), (bf_x + 1, tie_y1 + 2), "K")   # shaded edge

    return {
        "bl_x": bl_x, "bf_x": bf_x, "bt_x": bt_x, "br_x": br_x,
        "bl_top": bl_top, "bf_top": bf_top, "bt_top": bt_top, "br_top": br_top,
        "frame_top": bt_top, "plinth_roof_y": min(bl_y, bf_y),
        "front_x": bf_x, "left_x": bl_x,
        # crosshead underside y at the front (where the ram hangs from)
        "crosshead_y": crosshead_mid_y + 2,
    }


# ── the hero: glass crush-chamber compressing a glowing specimen ──────────────
def press(c, p, fr):
    """Caged inside the open frame: a hydraulic ram descends from the crosshead
    onto a glowing specimen inside a small glass crush-cylinder, plus a redline
    load gauge on a front post and a glowing hydraulic line up from the base.

    Drawn AFTER the frame but the ram/chamber sit in the OPEN middle, so they read
    as enclosed by the see-through portal — that is the whole point of the form."""
    # work centre: the OPEN frame centre, sitting on the plinth roof. Placed at the
    # roof-centre column so it pops in the see-through middle, clear of the control
    # panel down on the lower-left face.
    rcx, rcy = p.roof_pt(0.5, 0.42)
    wx = int(round(rcx))
    floor_y = int(round(rcy))             # specimen platen sits on the plinth roof
    # the ram hangs from the crosshead front-left rail directly above wx
    crosshead_y = floor_y - 19

    # --- platen (anvil) the specimen is crushed against: a short heavy M slab ---
    _rect(c, wx - 5, floor_y - 1, wx + 5, floor_y + 1, fill="M", outline="K")
    c.line((wx - 5, floor_y - 1), (wx + 5, floor_y - 1), "L")   # lit top

    # --- the glass crush-cylinder on the platen: a c/g translucent tube ---
    cyl_bot = floor_y - 2
    cyl_top = cyl_bot - 8
    _rect(c, wx - 3, cyl_top, wx + 3, cyl_bot, fill="g")        # glass body
    _rect(c, wx - 3, cyl_top, wx - 1, cyl_bot, fill="c")        # lit left glass
    _rect(c, wx - 4, cyl_top - 1, wx + 4, cyl_bot + 1, outline="K")
    c.line((wx - 3, cyl_top), (wx + 3, cyl_top), "h")           # bright rim
    # the glowing SPECIMEN being compressed inside (O/o core, mid-cylinder)
    spec_cy = (cyl_top + cyl_bot) // 2 + 1
    _rect(c, wx - 2, spec_cy - 1, wx + 2, spec_cy + 2, fill="o")
    _rect(c, wx - 1, spec_cy, wx + 1, spec_cy + 1, fill="O")    # white-hot core
    # h stress-glint cracks radiating from the crushed core
    c.set(wx - 3, spec_cy - 1, "h")
    c.set(wx + 3, spec_cy + 2, "h")
    c.set(wx - 2, spec_cy + 3, "h")
    # o strain sparks at the top contact point (where the ram bites)
    c.set(wx - 1, spec_cy - 2, "o")
    c.set(wx + 1, spec_cy - 2, "O")

    # --- the hydraulic RAM descending from the crosshead onto the specimen ---
    ram_top = crosshead_y
    ram_bot = cyl_top - 1            # ram foot just touches the cylinder cap
    _rect(c, wx - 2, ram_top, wx + 2, ram_bot, fill="M")        # ram body
    _rect(c, wx - 2, ram_top, wx, ram_bot, fill="L")            # lit left
    _rect(c, wx - 3, ram_top - 1, wx + 3, ram_bot + 1, outline="K")
    # o collar band on the ram
    collar_y = ram_top + 3
    c.line((wx - 2, collar_y), (wx + 2, collar_y), "o")
    c.set(wx - 2, collar_y, "r")
    # heavy ram FOOT (the platen head pressing down) — a wider K-topped block
    _rect(c, wx - 3, ram_bot - 1, wx + 3, ram_bot + 1, fill="M", outline="K")
    c.line((wx - 3, ram_bot - 1), (wx + 3, ram_bot - 1), "L")

    # --- glowing o hydraulic line: from a base pump beside the platen, up the LEFT
    #    edge of the press and into the ram collar. Kept tight to the press so it
    #    threads the open frame without crossing the control panel on the left face.
    pump_x = wx - 7
    pump_y = floor_y - 1
    # short bright pump nub at the press base
    _rect(c, pump_x - 1, pump_y, pump_x + 1, pump_y + 2, fill="r")
    c.set(pump_x, pump_y, "o")
    # the line: up the left side, then across into the ram collar
    c.line((pump_x, pump_y), (pump_x, collar_y), "o")
    c.line((pump_x, collar_y), (wx - 3, collar_y), "o")
    # a K clamp on the riser
    c.set(pump_x - 1, (pump_y + collar_y) // 2, "K")

    # --- the round LOAD GAUGE mounted on the FRONT-RIGHT post: needle to redline --
    gx = fr["front_x"] + 8
    gy = crosshead_y + 9
    # short M mounting bracket from the front column out to the gauge
    c.line((fr["front_x"] + 2, gy), (gx - 3, gy), "M")
    c.line((fr["front_x"] + 2, gy + 1), (gx - 3, gy + 1), "K")
    _disk_ring(c, (gx, gy), 4, fill="W", ring="K")             # white dial disk
    # L inner ring shade + G tick marks around the rim
    for ang in range(0, 360, 30):
        import math
        tx = gx + 3 * math.cos(math.radians(ang))
        ty = gy + 3 * math.sin(math.radians(ang))
        c.set(int(round(tx)), int(round(ty)), "G")
    # r REDLINE arc across the upper-right quadrant (danger zone)
    import math
    for ang in range(300, 361, 12):
        rx = gx + 3 * math.cos(math.radians(ang))
        ry = gy + 3 * math.sin(math.radians(ang))
        c.set(int(round(rx)), int(round(ry)), "r")
    for ang in range(0, 25, 12):
        rx = gx + 3 * math.cos(math.radians(ang))
        ry = gy + 3 * math.sin(math.radians(ang))
        c.set(int(round(rx)), int(round(ry)), "r")
    # the bold o/r NEEDLE swung UP toward the redline (pointing up-right)
    c.line((gx, gy), (gx + 2, gy - 3), "o")
    c.set(gx + 1, gy - 2, "O")
    c.set(gx, gy, "r")                                          # hub
    # O peak-hold blip at the redline the needle is reaching
    c.set(gx + 3, gy - 2, "O")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS structural-test
# instrumentation/hydraulics onto the prior load-frame — never restarts, never
# recolors the whole building. Theme: the open load-frame grows into a fully
# instrumented, hydraulically-driven, environmentally-chambered test cell. Colours
# mature stage by stage; gold (q) only as a t5 flourish.
#
#   t2  small functional add : an extra DIAL-GAUGE CLUSTER + c readout on a front
#                              upright, and a brightened o load light
#   t3  structural add       : a SECOND LOAD COLUMN widening the frame into a twin-
#                              post rig, tied by a new cross-head beam (b columns)
#   t4  major add            : a HYDRAULIC POWER-PACK annex (accumulator cylinder +
#                              pump housing) feeding a glowing e ram line
#   t5  crowning feature     : a GLASS ENVIRONMENTAL CHAMBER wrapping the specimen
#                              with an E stress-glow + a redlined master gauge, and
#                              q gold frame caps on the portal columns
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_gauges(c, p, fr):
    """t2 — SMALL FUNCTIONAL ADD: a compact secondary DIAL-GAUGE CLUSTER bracketed
    onto the FRONT-LEFT upright (two small dials + a cyan c digital readout strip),
    plus a brightened o load-status light. On-theme (more instrumentation), modest,
    base palette. Mounted on the lit left column, mid-height, clear of the central
    press hero and the existing big load gauge on the right."""
    cx = fr["left_x"]                       # lit front-left column (x≈5)
    base_y = fr["plinth_roof_y"]
    mx = cx + 4                             # cluster brackets INWARD (right) of the
    my = base_y - 16                        # post into the open frame, mid-height
    # short M mounting bracket from the column out to the cluster backplate
    c.line((cx + 2, my + 2), (mx - 1, my + 2), "M")
    c.line((cx + 2, my + 3), (mx - 1, my + 3), "K")
    # K backplate the two small dials + readout sit on
    _rect(c, mx, my, mx + 3, my + 7, fill="d", outline="K")
    # two small dial faces (W, K ring) stacked, each with a tiny o needle
    for dy in (1, 4):
        fx, fy = mx + 1, my + dy
        _rect(c, fx, fy, fx + 2, fy + 1, fill="W", outline="K")
        c.set(fx + 1, fy, "o")             # needle dot
    # a cyan c digital readout strip along the bottom of the backplate
    c.line((mx + 1, my + 6), (mx + 3, my + 6), "c")
    c.set(mx + 2, my + 6, "h")             # bright digit glint
    # brightened o load-status light up at the top of the cluster
    c.set(mx + 2, my - 1, "o")
    c.set(mx + 2, my - 2, "O")


def stage3_twincol(c, p, fr):
    """t3 — STRUCTURAL ADD: a SECOND LOAD COLUMN bolted onto the FRONT of the rig,
    widening it from a single press line into a TWIN-POST load frame. A new heavy
    `b` deep-steel column rises in FRONT-LEFT of the open court, tied back to the
    existing front column by a short cross-head beam at the top. A real new
    structural member, on-theme (a bigger frame tests bigger specimens)."""
    # foot of the new column: ON the plinth roof's FRONT-LEFT edge, standing in the
    # open interior IN FRONT of the existing left/front posts so it reads as an added
    # outer column (not hidden behind the frame). Anchored at u≈0.40 of the front-left
    # roof edge (r_left→r_front) so it sits clear of the central press.
    ffx, ffy = p.roof_pt(0.40, 0.0)
    fx = int(round(ffx))                    # ≈x16, in the open front court
    foot_y = int(round(ffy))                # ≈y45, on the plinth roof
    top_y = fr["frame_top"] + 6             # rise to just below the existing crosshead
    # twin-upright b lattice column, 3px wide (matches the rig's exposed-steel look)
    c.line((fx, foot_y), (fx, top_y), "b")          # lit near upright
    c.line((fx + 1, foot_y), (fx + 1, top_y), "D")  # core
    c.line((fx + 2, foot_y), (fx + 2, top_y), "b")  # far upright
    for yy in range(top_y + 4, foot_y - 3, 6):      # X-bracing rungs (twin-post truss)
        c.line((fx, yy), (fx + 2, yy + 3), "b")
        c.line((fx + 2, yy), (fx, yy + 3), "b")
    c.set(fx, top_y, "K")
    c.set(fx + 2, top_y, "K")
    c.line((fx - 1, foot_y), (fx + 3, foot_y), "K")   # K foot plate on the deck
    # a small bolted gusset cap on the new column top
    _rect(c, fx, top_y, fx + 2, top_y + 2, fill="M", outline="K")
    c.set(fx + 1, top_y + 1, "L")
    # short CROSS-HEAD beam tying the new column back to the existing front column
    # (bf_x=29, a touch above plinth roof) — a horizontal iso tie along the right axis
    tcx = fr["front_x"]                     # existing front column x (≈29)
    tcy = top_y + 1
    bcy = tcy + 3                           # the existing post is a bit forward/down
    c.line((fx + 2, tcy), (tcx, bcy), "L")          # lit top chord
    c.line((fx + 2, tcy + 1), (tcx, bcy + 1), "b")  # body
    c.line((fx + 2, tcy + 2), (tcx, bcy + 2), "K")  # under-edge


def stage4_powerpack(c, p, fr):
    """t4 — MAJOR ADD: a HYDRAULIC POWER-PACK annex on the SHADED-RIGHT flank of the
    plinth — a tall accumulator CYLINDER beside a boxy pump housing — with a glowing
    `e` hydraulic line climbing from the pack up toward the ram. The prominent new
    mass that says 'this rig now drives serious force'. Palette matures: deep `b`
    housing + energized cyan `e/E` on the pressure line/gauge. Kept on-canvas."""
    # pump housing box abutting the plinth's shaded RIGHT face, sitting on the ground
    rx, ry = p.roof_pt(0.92, 0.5)
    base_x = int(round(rx)) + 2
    ground_y = int(round(p.w_right[1]))     # bottom of the plinth right wall
    house_top = ground_y - 11
    _rect(c, base_x, house_top, base_x + 7, ground_y, fill="b", outline="K")
    _rect(c, base_x, house_top, base_x + 2, ground_y, fill="D")     # lit near edge
    c.line((base_x, house_top), (base_x + 7, house_top), "M")       # lit cap edge
    # a small e pressure-readout window glowing on the housing face
    _rect(c, base_x + 3, house_top + 2, base_x + 6, house_top + 4, fill="e", outline="K")
    c.set(base_x + 4, house_top + 3, "E")
    # cooling louver slits low on the housing
    for vy in (ground_y - 4, ground_y - 2):
        c.line((base_x + 1, vy), (base_x + 6, vy), "K")
    # tall accumulator CYLINDER standing just RIGHT of the pump housing
    acc_cx = base_x + 10
    acc_top = ground_y - 18
    cylinder(c, acc_cx, acc_top, rx=3.0, h=15,
             top="L", side_l="M", side_r="b", outline="K")
    # cap bands + an e charge-light dot on the accumulator
    c.line((acc_cx - 3, acc_top + 4), (acc_cx + 3, acc_top + 4), "D")
    c.line((acc_cx - 3, acc_top + 9), (acc_cx + 3, acc_top + 9), "D")
    c.set(acc_cx, acc_top - 1, "K")
    c.set(acc_cx, acc_top - 2, "e")         # pressure-cap glow
    c.set(acc_cx, acc_top - 3, "E")
    # glowing e HYDRAULIC FEED LINE: from the accumulator top, arcing LEFT over the
    # plinth roof toward the ram/crosshead region of the frame.
    fr_top = fr["plinth_roof_y"]
    feed_y = fr_top - 4
    c.line((acc_cx, acc_top - 1), (acc_cx, feed_y), "e")            # riser
    c.line((acc_cx, feed_y), (fr["front_x"] + 4, feed_y), "e")      # cross-feed
    c.set(acc_cx, feed_y, "E")                                      # bright elbow
    c.set(fr["front_x"] + 5, feed_y, "G")                           # entry shadow


def stage5_chamber(c, p, fr):
    """t5 — CROWNING FEATURE = FULLY EVOLVED test cell. A GLASS ENVIRONMENTAL CHAMBER
    encloses the central specimen (a translucent c/e box framed in b steel with an
    E stress-glow lighting up inside), a redlined MASTER GAUGE crowns the front
    crosshead, and GOLD premium caps trim the four portal column tops. Reads as an
    elite, fully-instrumented rig — still recognizably the same load-frame, maxed."""
    # work centre = same anchor the press hero uses, so the chamber wraps the specimen
    rcx, rcy = p.roof_pt(0.5, 0.42)
    wx = int(round(rcx))
    floor_y = int(round(rcy))
    # --- glass environmental CHAMBER framing the specimen/ram region ---
    chx0, chx1 = wx - 6, wx + 6
    chy0, chy1 = floor_y - 17, floor_y + 1     # tall enough to enclose ram + specimen
    # translucent glass body (cyan), lit left pane brighter
    _rect(c, chx0 + 1, chy0 + 1, chx1 - 1, chy1 - 1, fill="c")
    _rect(c, chx0 + 1, chy0 + 1, wx - 2, chy1 - 1, fill="e")        # lit left glass
    # E stress-glow blooming from the crushed specimen inside the chamber
    spec_cy = (chy0 + chy1) // 2 + 2
    for dx, dy, ch in [(0, 0, "E"), (-1, 0, "E"), (1, 0, "E"),
                       (0, -1, "E"), (-2, 0, "e"), (2, 0, "e"),
                       (0, -2, "e"), (-1, 1, "e"), (1, 1, "e")]:
        c.set(wx + dx, spec_cy + dy, ch)
    # b steel chamber FRAME (corner mullions + cap rail), clean K outline
    _rect(c, chx0, chy0, chx1, chy1, outline="K")
    c.line((chx0, chy0), (chx1, chy0), "b")            # top rail
    c.line((chx0, chy0 - 1), (chx1, chy0 - 1), "M")    # lit cap crest
    c.line((wx, chy0 + 1), (wx, chy1 - 1), "b")        # centre mullion
    c.line((chx0 + 1, chy0 + 1), (chx1 - 1, chy0 + 1), "h")   # bright top sheen
    # a diagonal glass shine streak (the glass tell)
    c.line((chx0 + 2, chy1 - 4), (wx - 1, chy0 + 3), "h")
    # access-port handle latch on the lit face
    c.set(chx0 + 1, spec_cy, "M")
    c.set(chx0 + 1, spec_cy + 1, "L")

    # --- redlined MASTER GAUGE crowning the BACK-TOP of the portal, high and clear
    #     of the chamber (which fills the open middle). Mounted just above the back
    #     crosshead apex so it reads as the rig's headline pressure readout. ---
    gx = fr["bt_x"] + 3
    gy = fr["bt_top"] + 5
    # short M bracket from the back-top column out to the gauge
    c.line((fr["bt_x"] + 2, gy + 1), (gx - 2, gy + 1), "M")
    c.line((fr["bt_x"] + 2, gy + 2), (gx - 2, gy + 2), "K")
    _disk_ring(c, (gx, gy), 4, fill="W", ring="K")
    for ang in range(0, 360, 30):                       # G tick marks
        tx = gx + 3 * math.cos(math.radians(ang))
        ty = gy + 3 * math.sin(math.radians(ang))
        c.set(int(round(tx)), int(round(ty)), "G")
    for ang in list(range(285, 361, 12)) + list(range(0, 30, 12)):   # r redline arc
        rx = gx + 3 * math.cos(math.radians(ang))
        ry = gy + 3 * math.sin(math.radians(ang))
        c.set(int(round(rx)), int(round(ry)), "r")
    c.line((gx, gy), (gx + 2, gy - 3), "o")            # needle to redline
    c.set(gx + 1, gy - 2, "O")
    c.set(gx, gy, "r")                                  # hub
    c.set(gx + 3, gy - 2, "O")                          # peak-hold blip

    # --- GOLD premium caps trimming the portal COLUMN TOPS (t5 flourish only) ---
    # one small 2px gold cap stud seated exactly on each column's own top corner,
    # so the trim reads as bolted ON the frame (not a floating bar). The back-right
    # column carries a slightly brighter glint as the elite tell.
    caps = [(fr["bl_x"], fr["bl_top"]), (fr["bf_x"], fr["bf_top"]),
            (fr["bt_x"], fr["bt_top"]), (fr["br_x"], fr["br_top"])]
    for col_x, col_top in caps:
        c.set(col_x, col_top - 1, "q")
        c.set(col_x + 1, col_top - 1, "q")
        c.set(col_x, col_top - 2, "q")
    # a brighter gold glint on the back-right cap + a tiny pennant nub
    c.set(fr["br_x"], fr["br_top"] - 2, "O")
    c.set(fr["br_x"] + 1, fr["br_top"] - 2, "q")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the load-frame at upgrade `stage` (1..5). Stage 1 is IDENTICAL to the
    shipped base; each higher stage keeps every prior addition and bolts on the next
    (t2 gauges → t3 twin column → t4 power-pack → t5 chamber+gold). Painter's order
    keeps the central chamber/gauge crowning additions on top of the frame masses."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    p = plinth(c)                 # low solid foundation
    fr = load_frame(c, p)         # tall open four-post portal + crosshead
    press(c, p, fr)               # hero: ram crushing glowing specimen + gauge
    control_panel(c, p)           # operator station on the LEFT face — drawn last
                                  # so the open frame never paints over it

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    if stage >= 2:
        stage2_gauges(c, p, fr)
    if stage >= 3:
        stage3_twincol(c, p, fr)
    if stage >= 4:
        stage4_powerpack(c, p, fr)
    if stage >= 5:
        stage5_chamber(c, p, fr)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/volt_lab"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "mechanical-testing-rig"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped base PNG, so it does NOT overwrite the base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": VOLT, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"volt_lab_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
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
