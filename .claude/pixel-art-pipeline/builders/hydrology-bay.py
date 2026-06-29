#!/usr/bin/env python3
"""
Hydrology Bay — TerraBase Lab economy building (BESPOKE form, STANDARD role).

An OPEN-FRONTED WATER-YARD: a solid masonry waterworks HALL set at the back, its
front-right face cut by a big K-outlined ARCHED CHANNEL MOUTH (dark interior, the
channel water emerging from it), opening onto a low OPEN COURTYARD apron ringed by
o/K survey striping. This is NOT the gateway cube and NOT the Sampling Station's
tarp-on-poles depot — it is a weathered masonry hall with a hollow arched mouth and
a flowing-water court (the second OPEN building of the batch).

  * Yard floor slab (drawn FIRST): a low L/M apron the viewer looks DOWN onto, with
    o/K survey-marker striping along its two open FRONT edges.
  * Back HALL: an M/D masonry Box with a low hipped L/M roof; its FRONT-RIGHT face
    carries the big arched channel mouth (K arch, d/K dark interior, c water spilling
    out), with D valve wheels beside it.
  * Header TANK: a short cylinder water tank on a stub stand at the hall's back-right
    roof, M/D with a c waterline band, feeding the flume via a thin c supply pipe.
  * Roofline: low hipped roof + the header tank + a D gauge mast with a c blink.

Signature (one-of-one): a working scale-model watershed FLUME stepping front-left
across the open courtyard — 3-4 D/M terraced troughs with white K lips, c/g water
riffling W down each fall; a brighter g/G mineral-teal DYE-TRACE plume released at
the head streams down and BUNCHES/STALLS at one trough where an r/d crack FAULT
blocks flow (glowing O/r = the diagnosed leak); 2 K-framed FLOW GAUGES on stub posts
read the diagnosis (o/O needles, one swung to a red r low-flow at the fault); a soft
c water-glow washes the court and an o "FLOW" placard sits at the flume head.

Composed from art/isobuild.{Box,cylinder} — NO iso.draw_cube / base_windows.
Draw order: contact shadow + yard slab -> back hall mass + arched mouth + tank +
mast -> the terraced flume + flowing water + dye-trace fault + gauges (front, on top).
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

# Base TerraBase palette (shared keys) + the EVOLVED-accent keys reserved for the
# upgrade stages only (chars NOT used by the base palette, so they appear in NO
# stage-1 sprite and hydrology-bay.png stays byte-identical). These four exact
# keys+hexes are reused by ALL 10 terrabase buildings for lab-wide consistency:
#   b  deep basalt/bedrock  — matured warm structure tone for t4+ new masses
#   e  energized mineral-water glow (mid)   E  energized glow (bright) — t4/t5 power
#   q  premium survey gold  — t5 flourish ONLY (NOT a whole-building recolor)
TERRA = {"K": "#20190f", "W": "#efe6cf", "L": "#d6c8a0", "M": "#b09a6e", "D": "#7e6c47", "d": "#54462c",
         "h": "#d6f2ea", "c": "#a4e2d4", "g": "#34b6a2", "G": "#1d8474",
         "o": "#e0a850", "O": "#ffce80", "r": "#9a5e1e",
         "b": "#3a3326", "e": "#5fe0c4", "E": "#c4fff0", "q": "#f3c63a"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def _stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings) at top-left (x0,y0).
    '.' = skip (transparent)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


def survey_stripe(c, p0, p1, n):
    """o/K survey-marker teeth along a slab front edge from p0 to p1."""
    for k in range(n + 1):
        t = k / n
        x = p0[0] + t * (p1[0] - p0[0])
        y = p0[1] + t * (p1[1] - p0[1])
        c.set(int(round(x)), int(round(y)), "o" if k % 2 == 0 else "K")


# ── 1. YARD FLOOR SLAB — the open water-court apron (drawn FIRST) ──────────────
def yard_slab(c):
    """A low L/M masonry apron the viewer looks DOWN onto. The hall seats on its
    back edge; the front-center stays OPEN as the flume court. Survey o/K striping
    rings the two open FRONT deck edges; a faint c water-glow washes the deck."""
    slab = Box(top=(32, 28), wx=11, wy=11, h=3)
    # deck: weathered masonry — lit L, brighter back-left L, mottled M
    c.fill_poly([slab.r_top, slab.r_right, slab.r_front, slab.r_left], "M")
    c.fill_poly([slab.r_top, slab.r_left, slab.r_front], "L")
    # scattered d/D flagstone mottling so it reads as a paved yard, not a panel
    for (u, v) in [(0.3, 0.4), (0.62, 0.28), (0.46, 0.7), (0.74, 0.55), (0.26, 0.62), (0.55, 0.5)]:
        p = slab.roof_pt(u, v)
        c.set(int(round(p[0])), int(round(p[1])), "D")
    # the 3px deck edge on the two FRONT faces (lit left lighter, right darker)
    c.fill_poly([slab.r_left, slab.r_front, slab.w_front, slab.w_left], "D")
    c.fill_poly([slab.r_front, slab.r_right, slab.w_right, slab.w_front], "d")
    # outline
    for a, b in [(slab.r_top, slab.r_right), (slab.r_right, slab.r_front),
                 (slab.r_front, slab.r_left), (slab.r_left, slab.r_top),
                 (slab.r_left, slab.w_left), (slab.r_front, slab.w_front),
                 (slab.r_right, slab.w_right),
                 (slab.w_left, slab.w_front), (slab.w_front, slab.w_right)]:
        c.line(a, b, "K")
    # SURVEY striping along the two open FRONT deck edges (rings the court)
    survey_stripe(c, slab.r_left, slab.r_front, 11)
    survey_stripe(c, slab.r_front, slab.r_right, 11)
    return slab


# ── 2. BACK HALL — masonry waterworks hall with the arched channel mouth ───────
def back_hall(c, slab):
    """An M/D masonry hall seated on the BACK of the yard slab (toward the back
    corner), low hipped L/M roof. Its FRONT-RIGHT face is cut by a big K-arched
    channel mouth. Kept toward the back so a wide OPEN court is left in front for
    the flume."""
    # seat the hall on the back portion of the slab (back corner-ish), leaving the
    # front-center open. Slab top is (32,28); push the hall apex back/up.
    hall = Box(top=(31, 13), wx=9, wy=9, h=13)
    hall.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # low hipped roof read: a brighter ridge line + a d hip seam down the front
    c.line(hall.r_top, hall.roof_pt(0.5, 0.5), "W")
    c.line(hall.roof_pt(0.5, 0.5), hall.r_front, "d")
    # weathered masonry course lines on the lit-left face (horizontal banding)
    for v in (3.0, 6.0, 9.0):
        c.line(hall.left_pt(0.08, v), hall.left_pt(0.92, v), "D")
    # a small high c window on the lit-left face (weatherproof glazing)
    hall.window(c, "left", 0.18, 0.42, 2.2, 5.0, glass="c", hi="h", shade="G", mullions=1)
    return hall


def arched_mouth(c, hall):
    """The visual hook: a big K-outlined ARCHED CHANNEL MOUTH cut into the hall's
    FRONT-RIGHT (shaded) face — a HOLLOW opening read by a pale L/M voussoir arch
    RING around a solidly K-dark interior, with teal channel water emerging from it
    and spilling down toward the flume head in the court. A single D valve wheel
    sits on the wall beside it (weatherproof fitting).

    The previous version filled the interior with `d` against a `D` wall, so the
    opening did not separate from the masonry. This version: (a) rings the arch in
    pale L/M dressed-stone voussoirs so the curve POPS, (b) fills the interior solid
    K so it reads as a true hollow, (c) bevels a lit `d` sill, and (d) sends a bright
    h/c water tongue out of the base."""
    pt = hall.right_pt
    u0, u1 = 0.14, 0.78          # WIDE arch span across the shaded right face
    vbot = hall.h - 0.3          # threshold near the wall base
    um = (u0 + u1) / 2.0
    rise = 3.6                   # tall crown so the ROUNDED arch top reads clearly
    spring = 6.4                 # where the straight jambs meet the arch curve

    # ── (1) build the arch outline path (jambs up + semicircle over the top) ──
    nseg = 26
    arch_pts = []
    for k in range(nseg + 1):
        ang = math.pi * k / nseg                 # 0..pi sweeps left->right
        uu = um - (um - u0) * math.cos(ang)      # u from u0 to u1
        ru = rise * math.sin(ang)                # rise above spring
        arch_pts.append(pt(uu, spring - ru))

    # ── (2) the DARK HOLLOW interior: fill the full opening (jambs + tympanum)
    #         solid K so it reads as a true cut-through, not shaded wall. ──────
    interior = [pt(u0, vbot)] + arch_pts + [pt(u1, vbot)]
    c.fill_poly(interior, "K")
    # a thin `d` inner-lit band just inside the left jamb + along the back so the
    # cavity reads as having depth, not a flat black hole.
    c.line(pt(u0 + 0.05, spring), pt(u0 + 0.05, vbot - 0.4), "d")
    c.line(pt(u0 + 0.05, spring), pt(um, spring - rise + 0.6), "d")

    # ── (3) the pale DRESSED-STONE VOUSSOIR RING around the arch (the read) ───
    #         a BOLD 2px band of dressed stone proud of the opening: bright W/L on
    #         the lit upper-left, M on the shaded right — so the rounded arch POPS
    #         against the dark cavity even with only the top half visible. ───────
    for band, extra in ((1.0, "lo"), (2.0, "hi")):
        for k in range(nseg + 1):
            ang = math.pi * k / nseg
            uu = um - (um - (u0 - 0.02)) * math.cos(ang)
            ru = (rise + band) * math.sin(ang)
            op = pt(uu, spring - ru)
            if extra == "hi":            # outer band: brightest highlight on left
                ring_ch = "W" if k < nseg * 0.42 else ("L" if k < nseg * 0.6 else "M")
            else:                         # inner band: dressed L / shaded M
                ring_ch = "L" if k < nseg * 0.55 else "M"
            c.set(int(round(op[0])), int(round(op[1])), ring_ch)
    # bold W keystone block at the crown
    kp = pt(um, spring - rise - 0.8)
    c.set(int(round(kp[0])), int(round(kp[1])), "W")
    c.set(int(round(kp[0])), int(round(kp[1] + 1)), "L")
    c.set(int(round(kp[0] - 1)), int(round(kp[1])), "L")
    # voussoir jamb posts: a 1px L/M dressed edge down each side of the opening
    c.line(pt(u0 - 0.02, spring), pt(u0 - 0.02, vbot), "L")
    c.line(pt(u1 + 0.02, spring), pt(u1 + 0.02, vbot), "M")

    # ── (4) crisp K outline of the arch curve + jambs + threshold ────────────
    for k in range(nseg):
        c.line(arch_pts[k], arch_pts[k + 1], "K")
    c.line(pt(u0, spring), pt(u0, vbot), "K")
    c.line(pt(u1, spring), pt(u1, vbot), "K")
    c.line(pt(u0, vbot), pt(u1, vbot), "K")

    # ── (5) channel WATER pooled on the floor of the mouth, emerging to court ─
    #         bright h/c sheet catching light at the lip; g in the shadowed back.
    c.fill_poly([pt(u0 + 0.06, vbot - 2.4), pt(u1 - 0.06, vbot - 2.4),
                 pt(u1 - 0.06, vbot - 0.3), pt(u0 + 0.06, vbot - 0.3)], "g")
    c.line(pt(u0 + 0.08, vbot - 1.3), pt(u1 - 0.08, vbot - 1.3), "c")
    c.line(pt(u0 + 0.10, vbot - 0.5), pt(u1 - 0.10, vbot - 0.5), "h")
    c.set(int(round(pt(0.34, vbot - 1.9)[0])), int(round(pt(0.34, vbot - 1.9)[1])), "h")

    # ── (6) ONE D valve wheel high on the wall to the RIGHT of the arch ───────
    wp = pt(0.90, 4.4)
    wx, wy = int(round(wp[0])), int(round(wp[1]))
    _stamp(c, wx - 1, wy - 1, [
        ".K.",
        "KDK",
        ".K.",
    ])
    c.set(wx, wy, "M")              # hub glint
    return (u0, u1, vbot)


# ── 3. HEADER TANK — a short water cylinder on a stub stand at the back-right ───
def header_tank(c, hall):
    """A short cylinder water tank on a stub stand at the hall's back-right roof,
    M/D with a bright c waterline band — the gravity feed for the flume. A thin c
    supply pipe arcs from it down to the channel head later."""
    # stub stand legs from the roof up to the tank base
    cx, top_y = 45, 9
    rx, h = 4, 7
    # stand legs (two D verticals down to the roof)
    base_y = top_y + h
    c.line((cx - 2, base_y), (cx - 2, base_y + 4), "D")
    c.line((cx + 2, base_y), (cx + 2, base_y + 4), "d")
    c.line((cx - 2, base_y + 4), (cx + 2, base_y + 4), "K")
    # the tank itself
    cylinder(c, cx, top_y, rx, h, top="L", side_l="M", side_r="D", outline="K")
    # bright c WATERLINE band around the tank (just below mid)
    for col in range(-rx, rx + 1):
        t = 1 - (col / rx) ** 2
        if t < 0:
            continue
        edge = (rx * 0.5) * (t ** 0.5)
        y = int(top_y + edge + h * 0.45)
        ch = "h" if col < 0 else "c"
        c.set(cx + col, y, ch)
        c.set(cx + col, y + 1, "c" if col < 0 else "g")
    # a tiny h glint on the lit upper-left of the tank
    c.set(cx - 2, top_y + 1, "h")
    return (cx, top_y, rx, h, base_y)


# ── 4. GAUGE MAST — a D mast with a c blink on the roof (weatherproof instrument)
def gauge_mast(c, hall):
    """A thin D gauge mast rising off the hall's back-left roof with a c sensor
    blink at the top — the TerraBase weatherproof-instrument motif."""
    mp = hall.roof_pt(0.28, 0.62)
    mx, my = int(round(mp[0])), int(round(mp[1]))
    top = my - 11
    c.line((mx, my), (mx, top), "D")
    c.set(mx - 1, my - 1, "M")        # lit edge
    # small K gauge box near the top
    _stamp(c, mx - 1, top, [
        "KK",
        "Kc",   # c sensor face
    ])
    c.set(mx, top - 1, "c")           # the c blink
    c.set(mx + 1, top - 2, "h")       # faint signal ping
    c.set(mx - 1, top - 1, "K")


# ── 5. SIGNATURE — the terraced watershed FLUME in the open courtyard ──────────
def _trough(c, x0, y0, tw, td, water_ch, riffle=True):
    """Draw ONE flume step as a clearly TERRACED iso channel pan: a flat teal
    water-top diamond set in a D/M masonry rim, dropped onto a dark d/K fall-wall
    below so it reads as a distinct STAIR STEP with depth. Bigger and flatter than
    the old version so each step is unmistakably its own basin.

    x0,y0 = the step's BACK (top) corner; tw = half-width along each iso axis;
    td = fall-wall depth in px. Returns (front corner, left corner, right corner)."""
    # iso top diamond corners — a wide shallow pan
    bk = (x0, y0)                          # back/top corner
    rt = (x0 + 2 * tw, y0 + tw)            # right corner (+right axis)
    lf = (x0 - 2 * tw, y0 + tw)            # left  corner (+left axis)
    ft = (x0, y0 + 2 * tw)                 # front corner
    # masonry RIM: fill the whole top diamond D first (the channel walls)
    c.fill_poly([bk, rt, ft, lf], "D")
    # inset teal WATER surface (1px in from each rim so the rim reads)
    wbk = (bk[0], bk[1] + 1)
    wrt = (rt[0] - 1, rt[1])
    wft = (ft[0], ft[1] - 1)
    wlf = (lf[0] + 1, lf[1])
    c.fill_poly([wbk, wrt, wft, wlf], water_ch)
    # a brighter teal core + W riffle ticks (running water) on the back two edges
    if riffle:
        c.line(wbk, wrt, "h")              # lit back-right edge = bright riffle
        c.line(wbk, wlf, "c")
        # a row of W riffle ticks marching across the pan
        for t in (0.30, 0.55, 0.80):
            rp = (bk[0] + t * (rt[0] - bk[0]) - 1, bk[1] + t * (rt[1] - bk[1]) + 1)
            c.set(int(round(rp[0])), int(round(rp[1])), "W")
    c.line(wlf, wft, "g")                  # deeper g shadow on the front
    # the FRONT FALL-WALL (gives the stair its depth): drop the two front edges
    # down `td` px as a dark d wall, with a K base line.
    c.fill_poly([lf, ft, (ft[0], ft[1] + td), (lf[0], lf[1] + td)], "d")
    c.fill_poly([ft, rt, (rt[0], rt[1] + td), (ft[0], ft[1] + td)], "K")
    # crisp K lip rim around the channel mouth
    for a, b in [(bk, rt), (rt, ft), (ft, lf), (lf, bk)]:
        c.line(a, b, "K")
    # K skirt down the fall-wall sides + base
    c.line((lf[0], lf[1] + td), (ft[0], ft[1] + td), "K")
    c.line((ft[0], ft[1] + td), (rt[0], rt[1] + td), "K")
    c.line(lf, (lf[0], lf[1] + td), "K")
    c.line(ft, (ft[0], ft[1] + td), "K")
    return ft, lf, rt


def flume(c, slab, tank):
    """The hero, OUT in the open court in front of the arched mouth: a scale-model
    watershed flume stepping front-LEFT across the yard as 4 clearly TERRACED D/M
    troughs with white K lips, c/g water + W riffle ticks down each fall; a brighter
    g/G dye-trace plume released at the head BUNCHES/STALLS at one trough where an
    r/d crack FAULT blocks flow (glowing O/r); 2 K-framed flow gauges read the
    diagnosis (gauge B's red low-flow needle is the payoff); a soft c water-glow
    + an o FLOW placard."""
    # Head sits just out of the arched mouth (court centre-right); steps DOWN-FRONT-
    # LEFT across the open apron with clear vertical separation between each basin.
    hx, hy = 37, 37
    step_dx, step_dy = -5, 4     # each basin drops front-left + down (clear stair)
    tw, td = 4, 3               # half-width 4 -> 8px-wide pans; 3px fall-walls

    heads = [(hx + i * step_dx, hy + i * step_dy) for i in range(4)]

    # supply pipe: a thin c pipe from the header tank down the hall's RIGHT corner
    # (NOT across the arch face — that bisected the mouth), then into the flume head.
    tcx, ttop, trx, th, tbase = tank
    px0, py0 = tcx + trx, ttop + th    # tank lower-RIGHT
    pipe = [(px0, py0), (48, py0 + 3), (48, hy - 2), (hx + 2, hy)]
    for a, b in zip(pipe, pipe[1:]):
        c.line(a, b, "c")
    c.set(hx + 2, hy, "h")

    fault_i = 2
    fronts = []
    for i, (x0, y0) in enumerate(heads):
        wch = "c" if i != fault_i else "g"   # fault basin runs deeper/darker g
        ft, lf, rt = _trough(c, x0, y0, tw, td, wch)
        fronts.append((ft, lf, rt))
        # a clear W/c WATERFALL spilling off the front corner into the next basin
        if i < len(heads) - 1:
            fx, fy = ft[0], ft[1] + td
            c.set(fx, fy, "W")
            c.set(fx - 1, fy + 1, "c")
            c.set(fx - 2, fy + 2, "h")
            c.set(fx - 2, fy + 3, "c")

    # ── DYE-TRACE plume: a bright G/g teal streak released at the head, running
    # down the channel centerline and BALLOONING wide at the fault basin. ──────
    for i, (x0, y0) in enumerate(heads):
        cxp, cyp = x0, y0 + tw            # channel centre of this basin
        if i < fault_i:
            # thin dye streak flowing down the centre
            c.set(cxp, cyp, "G")
            c.set(cxp - 1, cyp + 1, "G")
            c.set(cxp + 1, cyp, "g")
        elif i == fault_i:
            # the dye BUNCHES / pools here — a denser G plume balloons across the
            # whole basin (wider + darker than the flow above/below = stalled).
            for (dx, dy, ch) in [(0, -1, "G"), (-1, 0, "G"), (0, 0, "G"), (1, 0, "G"),
                                 (-2, 1, "g"), (-1, 1, "G"), (0, 1, "G"), (1, 1, "G"), (2, 1, "g"),
                                 (-1, 2, "G"), (0, 2, "G"), (1, 2, "g"),
                                 (0, 3, "g")]:
                c.set(cxp + dx, cyp + dy, ch)

    # ── the FAULT: an r/d crack on the fault basin's FRONT FALL-WALL, glowing O/r
    # (the diagnosed leak), with a thin r seep dribbling below. ─────────────────
    fft, flf, frt = fronts[fault_i]
    crk_x, crk_y = fft[0] - 1, fft[1] + 1
    _stamp(c, crk_x - 1, crk_y - 1, [
        ".r.",
        "rOr",   # glowing O leak core flanked by r crack jaws
        "drd",
    ])
    c.set(crk_x, crk_y, "O")
    c.set(crk_x, crk_y + 2, "r")        # seep dribbling down out the wall
    c.set(crk_x - 1, crk_y + 3, "o")
    # a single connecting o pixel tying the crack core UP into the glow halo, so the
    # "crack -> glow" diagnosis reads as ONE cue (only paint it onto teal water).
    if 0 <= crk_y - 1 < 64 and 0 <= crk_x < 64 and c.px[crk_y - 1][crk_x] in ("g", "G", "c", "h"):
        c.set(crk_x, crk_y - 1, "o")
    # an O/o glow halo just ABOVE the crack (in the dye pool) so the leak reads as a
    # hot spot the dye revealed — placed only on teal so it doesn't smear the rim.
    for (dx, dy, ch) in [(0, -2, "O"), (-1, -2, "o"), (1, -2, "o")]:
        gxh, gyh = crk_x + dx, crk_y + dy
        if 0 <= gyh < 64 and 0 <= gxh < 64 and c.px[gyh][gxh] in ("g", "G", "c", "h"):
            c.set(gxh, gyh, ch)

    # ── soft c WATER-GLOW washing the open court at the flume foot (last basin) ──
    lft, llf, lrt = fronts[-1]
    for (gx, gy) in [(lft[0] - 2, lft[1] + td + 2), (lft[0] - 4, lft[1] + td + 2),
                     (lft[0], lft[1] + td + 3), (lft[0] - 6, lft[1] + td + 1)]:
        if 0 <= gy < 64 and 0 <= gx < 64 and c.px[gy][gx] in ("M", "L", "D"):
            c.set(gx, gy, "c")

    # ── FLOW GAUGES: 2 K-framed dials on stub posts along the flume. ───────────
    # gauge A — by the head basin (healthy: O needle swung UP-right, mid/high flow)
    afr = fronts[0][2]                         # head basin right corner
    gax, gay = afr[0] + 2, afr[1] - 1
    _stamp(c, gax, gay - 6, [
        ".KKKK.",
        "KKWWKK",
        "KWWOWK",   # O needle swung up-right (healthy)
        "KWOWWK",
        "KKWWKK",
        ".KKKK.",
        "..KK..",   # stub post
        "..dd..",
    ])
    c.set(gax + 3, gay - 4, "O")               # needle tip (high)
    # gauge B — at the fault basin (red r LOW-FLOW reading = the DIAGNOSIS payoff).
    # Bigger dial, a clear 2-3px r needle slumped low, and a red-zone tick.
    bfl = fronts[fault_i][1]                    # fault basin left corner
    gbx, gby = bfl[0] - 6, bfl[1] + 2
    _stamp(c, gbx, gby - 6, [
        ".KKKK.",
        "KKWWKK",
        "KWWWrK",   # red-zone tick at lower-right of the dial
        "KrrWWK",   # r LOW-FLOW needle slumped down-left (3px stroke)
        "KKrWKK",
        ".KKKK.",
        "..KK..",   # stub post
        "..dd..",
    ])
    c.set(gbx + 1, gby - 2, "r")               # needle root
    c.set(gbx + 4, gby - 3, "r")               # red danger tick on the rim

    # ── o "FLOW" placard on a post at the flume head ───────────────────────────
    plx, ply = hx + 5, hy - 5
    _stamp(c, plx, ply, [
        "oooo",
        "oKKo",  # placard with dark glyph band
        "oooo",
        "..d.",  # post
        "..d.",
    ])
    c.set(plx + 1, ply + 1, "O")

    # return the flume geometry so the upgrade stages can anchor float gauges,
    # the streamline model and the flow-turbine onto the SAME basins/centerline.
    return {"heads": heads, "tw": tw, "td": td, "fronts": fronts,
            "step_dx": step_dx, "step_dy": step_dy, "fault_i": fault_i}


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS waterworks /
# hydrology structure onto the prior form — never restarts, never recolors the whole
# building. Theme: the field flume bay grows into a fully built-out, instrumented,
# circulating hydrology station. Colours mature stage by stage; gold (q) is a t5
# flourish only. Every add is anchored to a base part (flume basin / right apron /
# hall roof) and clamped on-canvas, and NONE collide with the arched channel mouth
# signature on the front-right face or the diagnosed-leak fault basin of the flume.
#
#   t2  small functional add : a STILLING-WELL FLOAT GAUGE + graduated staff in the
#                              head flume basin + an extra h ripple glint
#   t3  structural add        : a second b-walled SETTLING-TANK BATH on the right
#                              apron with a glazed g surface + a weir lip spilling in
#   t4  major add             : a rooftop WATER-TOWER CISTERN on b legs pouring a
#                              bright e/E water jet down into the flume head
#   t5  crowning feature      : the flume becomes a glowing E HYDRO-FLOW streamline
#                              model with e eddy nodes + a spinning e flow-turbine,
#                              gold weir caps + a gold gauge-mast finial
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_float_gauge(c, fl):
    """t2 — SMALL FUNCTIONAL ADD: a STILLING-WELL FLOAT GAUGE planted in the HEAD
    flume basin (basin 0, the calm un-faulted head) — a slim deep-basalt `b` well
    tube standing in the water with a bright `c` water-level float riding inside it,
    an `o`/`K` graduated measuring STAFF marked up its side, and one extra bright `h`
    ripple glint dimpling the water beside it. On-theme (a real stream-gauging
    instrument), modest, base palette + the new `b` tube + a brightened float. Sits
    in the head basin so it never reaches the diagnosed-leak fault basin downstream."""
    heads, tw = fl["heads"], fl["tw"]
    hx0, hy0 = heads[0]                     # head basin BACK corner (37,37)
    cx = hx0 + 1                            # just right of the basin centerline
    base_y = hy0 + tw                       # water surface row at the basin centre
    top_y = base_y - 7                      # short well tube, stays well below roof
    # the stilling-well TUBE: a 2px deep-basalt cylinder standing in the water
    c.line((cx, base_y), (cx, top_y), "b")
    c.line((cx + 1, base_y), (cx + 1, top_y), "d")     # shaded right edge
    c.set(cx, top_y, "K")                  # dark open well mouth
    c.set(cx + 1, top_y, "K")
    # the bright c water-level FLOAT riding inside the tube (a tell of water height)
    c.set(cx, base_y - 3, "c")
    c.set(cx, base_y - 4, "h")             # lit top of the float
    # graduated measuring STAFF up the LEFT of the tube: alternating o/K tick marks
    for j, yy in enumerate(range(base_y - 1, top_y, -1)):
        c.set(cx - 1, yy, "o" if j % 2 == 0 else "K")
    # one extra bright h ripple glint dimpling the water just left of the well foot
    c.set(cx - 2, base_y + 1, "h")
    c.set(cx - 3, base_y + 1, "c")


def stage3_settling_tank(c, slab, fl):
    """t3 — STRUCTURAL ADD: a second SETTLING-TANK BATH built on the bright front-
    RIGHT apron, RIGHT of the flume — a real new structural mass: a low open basin
    with deep-basalt `b` masonry walls, a glazed teal `g` still-water surface inside
    (h/c lit lip), and a WEIR LIP on its left wall spilling a thin sheet of water
    LEFT into the flume head channel (so it reads as plumbed into the circuit, not a
    prop). First use of the matured `b` structure tone. Kept on the open right apron
    so it never crowds the arch face or the flume's downstream fault basin."""
    # basin as a shallow iso prism on the right apron (an open-topped bath). Author
    # its top diamond directly so it abuts the flume head and stays on the bright pad.
    bx, by = 44, 41                         # back-top corner of the bath on right apron
    tw, wallh = 5, 3                        # half-width along each iso axis; wall depth
    bk = (bx, by)
    rt = (bx + 2 * tw, by + tw)             # right corner (+right axis) -> ~ (54,46)
    lf = (bx - 2 * tw, by + tw)             # left  corner (+left axis)  -> ~ (34,46)
    ft = (bx, by + 2 * tw)                  # front corner               -> ~ (44,51)
    # --- masonry RIM: fill the whole top diamond deep-basalt b (the tank walls) ---
    c.fill_poly([bk, rt, ft, lf], "b")
    # --- glazed g STILL-WATER surface inset 1px from each rim so the wall reads ---
    wbk = (bk[0], bk[1] + 1)
    wrt = (rt[0] - 1, rt[1])
    wft = (ft[0], ft[1] - 1)
    wlf = (lf[0] + 1, lf[1])
    c.fill_poly([wbk, wrt, wft, wlf], "g")
    c.line(wbk, wrt, "h")                   # lit back-right water lip
    c.line(wbk, wlf, "c")                   # lit back-left water lip
    c.line(wlf, wft, "G")                   # deeper shadow on the front
    # a couple of faint c settling ripples on the still surface
    c.set(int(round((bk[0] + ft[0]) / 2)), int(round((bk[1] + ft[1]) / 2)), "c")
    # --- the FRONT WALL face (gives the bath depth): drop the front edges down ---
    c.fill_poly([lf, ft, (ft[0], ft[1] + wallh), (lf[0], lf[1] + wallh)], "d")
    c.fill_poly([ft, rt, (rt[0], rt[1] + wallh), (ft[0], ft[1] + wallh)], "K")
    # crisp K lip rim around the bath mouth + K skirt down the front wall
    for a, b in [(bk, rt), (rt, ft), (ft, lf), (lf, bk)]:
        c.line(a, b, "K")
    c.line((lf[0], lf[1] + wallh), (ft[0], ft[1] + wallh), "K")
    c.line((ft[0], ft[1] + wallh), (rt[0], rt[1] + wallh), "K")
    c.line(lf, (lf[0], lf[1] + wallh), "K")
    c.line(ft, (ft[0], ft[1] + wallh), "K")
    # --- WEIR LIP on the LEFT wall spilling a thin water sheet LEFT into the flume.
    #     A small notch in the left rim with c/h water tonguing down-left toward the
    #     head basin so the bath reads as plumbed into the channel circuit. ---
    wlx, wly = int(round(lf[0])), int(round(lf[1]))
    c.set(wlx, wly - 1, "c")               # notched weir crest
    c.set(wlx - 1, wly, "h")               # spill sheet leaving the lip
    c.set(wlx - 2, wly + 1, "c")
    c.set(wlx - 3, wly + 2, "h")           # water falling toward the flume head
    c.set(wlx - 4, wly + 3, "c")


def stage4_water_tower(c, hall, fl):
    """t4 — MAJOR ADD: a rooftop WATER-TOWER CISTERN — a prominent ELEVATED `cylinder`
    tank lifted HIGH on four tall deep-basalt `b` stilt LEGS off the hall's lit-LEFT
    roof (clear of the back-right header tank + the back-left gauge mast). The legs are
    K-outlined so the open trestle frame reads against the bright roof; the tank rides
    well above the roofline (a true water tower, distinct from the squat header tank),
    carries a bright `c` waterline band + a glowing energized `e/E` level-tube, and a
    DOWNCOMER drops off the front to pour a bright `e/E` WATER JET into the flume head
    basin (the bay now actively circulates water). The prominent new vertical mass.
    Palette matures: deep basalt `b` trestle + energized `e/E` water glow. Fully on-
    canvas; the jet lands in the head basin, never on the fault basin or the arch."""
    # tower footprint on the lit-LEFT roof triangle, between the mast (back-left) and
    # the header tank (back-right). roof_pt(0.40,0.46) ~ centre of the open lit roof.
    foot = hall.roof_pt(0.40, 0.46)
    cx = int(round(foot[0]))
    roof_y = int(round(foot[1]))
    rx, th = 5, 7                             # cistern radius + wall height
    legh = 9                                  # TALL legs -> tank rides high over roof
    tank_base_y = roof_y - legh
    tank_top_y = tank_base_y - th
    # --- an OPEN deep-basalt b STILT TRESTLE: two outer legs splaying from the tank
    #     base down to foot pads on the roof, tied by a single X cross-brace, so the
    #     frame reads as an airy stand (roof shows between the legs) — not a solid mass.
    #     Each leg is a b core with a lit M left edge for contrast on the bright roof.
    L_foot, R_foot = cx - rx + 1, cx + rx - 1       # splayed feet on the roof
    L_top, R_top = cx - 2, cx + 2                    # narrower at the tank base
    c.line((L_foot, roof_y), (L_top, tank_base_y), "b")
    c.line((L_foot - 1, roof_y), (L_top - 1, tank_base_y), "M")   # lit left edge
    c.line((R_foot, roof_y), (R_top, tank_base_y), "b")
    c.set(L_foot, roof_y, "K")                       # foot pads on the roof
    c.set(R_foot, roof_y, "K")
    # a single X cross-brace tying the two legs (the trestle frame)
    midy = (roof_y + tank_base_y) // 2
    c.line((L_foot, roof_y - 1), (R_top, midy), "b")
    c.line((R_foot, roof_y - 1), (L_top, midy), "b")
    # --- the CISTERN tank, a clearly ROUND elevated cylinder (the major mass) ---
    cylinder(c, cx, tank_top_y, rx, th, top="L", side_l="M", side_r="D", outline="K")
    # a domed roof-cap highlight on the cistern top so it reads as a rounded tank
    c.set(cx - 1, tank_top_y - 1, "W")
    c.set(cx, tank_top_y - 1, "L")
    c.set(cx + 1, tank_top_y, "L")
    # a bright c WATERLINE band wrapping the tank (mirrors the header tank's tell so it
    # reads instantly as a WATER cistern, not a silo) — h lit-left, c shaded-right.
    for col in range(-rx + 1, rx):
        t = 1 - (col / rx) ** 2
        if t < 0:
            continue
        edge = (rx * 0.5) * (t ** 0.5)
        y = int(tank_top_y + edge + th * 0.5)
        c.set(cx + col, y, "h" if col < 0 else "c")
    # --- glowing energized e LEVEL-TUBE riding the lit front of the cistern (the
    #     powered upgrade tell: a thin sight-glass of charged water) ---
    ltx = cx - 1
    for j, yy in enumerate(range(tank_top_y + 1, tank_top_y + th)):
        c.set(ltx, yy, "E" if j == 0 else "e")
    c.set(ltx, tank_top_y + th - 1, "g")     # shaded foot of the tube
    c.set(ltx - 1, tank_top_y + 2, "K")      # thin K frame edge of the sight-glass
    # --- DOWNCOMER feeder pipe from the cistern base, dropping off the FRONT of the
    #     roof to the flume head, then a bright e/E water JET falling into basin 0.
    #     Routed down a column LEFT of the arch so it never crosses the arch mouth. ---
    px0, py0 = cx + 1, tank_base_y           # tank base centre-right
    hx0, hy0 = fl["heads"][0]
    jet_x = hx0 - 1                            # land just left of the head basin centre
    elbow_y = roof_y + 2
    pipe = [(px0, py0), (px0, elbow_y), (jet_x, elbow_y), (jet_x, hy0 - 5)]
    for a, b in zip(pipe, pipe[1:]):
        c.line(a, b, "b")                     # deep-basalt pipe run
    c.line((px0 - 1, py0 + 1), (px0 - 1, elbow_y), "M")    # lit pipe edge (drop)
    c.set(px0, py0, "K")
    # the bright e/E WATER JET spurting out of the pipe mouth down into the basin —
    # widened to 2px with an E core so it unmistakably reads as falling water.
    for j, yy in enumerate(range(hy0 - 5, hy0 + 1)):
        c.set(jet_x, yy, "E" if j % 2 == 0 else "e")
        c.set(jet_x + 1, yy, "e" if j % 2 == 0 else "E")
    c.set(jet_x, hy0 - 5, "E")                # bright nozzle
    c.set(jet_x + 1, hy0 - 5, "E")
    # splash spray fanning where the jet lands in the head-basin water
    c.set(jet_x - 1, hy0, "c")
    c.set(jet_x + 2, hy0, "c")
    c.set(jet_x, hy0 + 1, "h")


def stage5_flow_model(c, fl, hall, slab):
    """t5 — CROWNING FEATURE = FULLY EVOLVED hydrology station. The flume comes alive
    as a glowing E HYDRO-FLOW STREAMLINE MODEL: bright energized `E` streamlines pour
    down the channel centerline linking every basin, `e` eddy nodes swirl at the
    basins, and a small spinning `e` FLOW-TURBINE sits at the foot basin spun by the
    current. The station is then dressed in GOLD: gold `q` weir caps on the t3
    settling-tank weir + the flume head lip, and a gold `q` finial crowning the gauge
    mast. Reads as an elite, fully-instrumented water lab, still clearly the same bay.
    Recomputes from the SAME flume heads/settling-tank/gauge-mast sources as the
    earlier stages (never a hardcoded second guess)."""
    heads, tw, fault_i = fl["heads"], fl["tw"], fl["fault_i"]

    # --- glowing E STREAMLINE model: a bright, CONTINUOUS energized current ribbon
    #     pouring down the channel centerline and threading every basin, so the whole
    #     flume reads as a live glowing flow model (the t5 transformation). At the
    #     fault basin the ribbon is nudged UP a row so it skims OVER the diagnosed-leak
    #     cue rather than burying it. A 1px e under-shadow gives the ribbon body. ---
    centers = []
    for i, (x, y) in enumerate(heads):
        cy = y + tw - (2 if i == fault_i else 0)   # lift the ribbon clear of the leak
        centers.append((x, cy))
    for i in range(len(centers) - 1):
        ax, ay = centers[i]
        bx, by = centers[i + 1]
        c.line((ax, ay), (bx, by), "E")            # bright streamline crest
        c.line((ax, ay + 1), (bx, by + 1), "e")    # energized ribbon body (continuous)
    # --- e EDDY NODES: a small swirl RING at each (non-fault) basin centre, set just
    #     OFF the bright centerline so it reads as a curl, not lost in the ribbon. ---
    for i, (cxp, cyp) in enumerate(centers):
        if i == fault_i:
            continue                               # leave the fault basin's diagnosis clear
        for (dx, dy) in [(-2, 1), (-1, 2), (1, 2), (2, 1)]:   # a little curl below the crest
            c.set(cxp + dx, cyp + dy, "e")
        c.set(cxp, cyp + 2, "E")                   # bright eddy core under the crest

    # --- spinning e FLOW-TURBINE at the FOOT basin, spun by the current: a clear
    #     pinwheel of 4 blades inside a faint e ring, on a short d spindle. ---
    fx, fy = heads[-1]                             # foot basin (22,49)
    tcx, tcy = fx, fy + tw + 1                      # turbine hub low in the foot basin
    for (dx, dy) in [(-2, 0), (2, 0), (0, -2), (0, 2)]:       # 4 radial blades
        c.line((tcx, tcy), (tcx + dx, tcy + dy), "e")
    for (dx, dy) in [(-2, -1), (2, 1), (-1, 2), (1, -2)]:     # canted blade tips (spin)
        c.set(tcx + dx, tcy + dy, "E")
    c.set(tcx, tcy, "E")                            # bright spinning hub
    c.set(tcx, tcy + 3, "d")                        # short spindle foot in the basin

    # --- GOLD premium trim (t5 flourish only) ---------------------------------
    # gold weir CAP capping the flume HEAD basin's back lip (recompute from heads[0]).
    # A short 3px gold rail along the head lip so the elite cap reads at 64px.
    hx0, hy0 = heads[0]
    for dx in (-1, 0, 1):
        c.set(hx0 + dx, hy0 - 1, "q")
    c.set(hx0, hy0 - 2, "O")                       # bright gold glint
    # gold weir CAP on the t3 settling-tank weir lip — recompute the SAME left-corner
    # of the bath from stage3's geometry (bx,by=44,41; tw=5 -> lf = (34,46)).
    s3_bx, s3_by, s3_tw = 44, 41, 5
    s3_lf = (s3_bx - 2 * s3_tw, s3_by + s3_tw)
    slx, sly = int(s3_lf[0]), int(s3_lf[1])
    for dx in (0, 1, 2):
        c.set(slx + dx, sly - 1, "q")              # gold cap along the weir crest
    c.set(slx + 1, sly - 2, "O")
    # gold FINIAL crowning the gauge mast — recompute from the mast source
    # (gauge_mast uses hall.roof_pt(0.28,0.62); top = my - 11).
    mp = hall.roof_pt(0.28, 0.62)
    mx, my = int(round(mp[0])), int(round(mp[1]))
    top = my - 11
    c.set(mx, top - 2, "q")                       # gold finial bead above the mast tip
    c.set(mx, top - 3, "O")
    c.set(mx - 1, top - 2, "q")
    c.set(mx + 1, top - 2, "q")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the hydrology bay at upgrade `stage` (1..5). Stage 1 is IDENTICAL to
    the shipped base PNG; each higher stage keeps every prior addition and bolts on
    the next (t2 float-gauge -> t3 settling-tank -> t4 water-tower cistern -> t5
    flow-model + gold). Painter's order keeps the upgrade additions on top of the
    masses they grow from: rooftop/overhead additions (the cistern + jet) and the
    flume flow-overlay are drawn AFTER the base flume, and NONE occlude the arched
    channel mouth signature or the flume's diagnosed-leak fault basin."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    # painter's order: yard slab (floor) -> back hall + arched mouth + tank + mast
    # -> the terraced flume + flowing water + dye-trace fault + gauges (front, top).
    slab = yard_slab(c)
    hall = back_hall(c, slab)
    arched_mouth(c, hall)
    tank = header_tank(c, hall)
    gauge_mast(c, hall)
    fl = flume(c, slab, tank)

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    # Drawn AFTER the base flume so the float gauge sits in the head basin, the
    # settling tank reads on the right apron, the rooftop cistern's jet pours down
    # in front of the roof into the flume head, and the t5 flow-overlay glows on top
    # of the channel water — while the arch mouth + fault diagnosis stay untouched.
    if stage >= 2:
        stage2_float_gauge(c, fl)
    if stage >= 3:
        stage3_settling_tank(c, slab, fl)
    if stage >= 4:
        stage4_water_tower(c, hall, fl)
    if stage >= 5:
        stage5_flow_model(c, fl, hall, slab)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/terrabase"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "hydrology-bay"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped hydrology-bay.png, so it does NOT overwrite the base
    PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": TERRA, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"terrabase_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"terrabase_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
