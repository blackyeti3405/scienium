#!/usr/bin/env python3
"""
Atmospheric Sensor Array — TerraBase economy building (BESPOKE form, STANDARD role).

The ONLY "cluster of vertical cylinders" form in the set: a tight TANK-FARM of 4
tall slender gas-sampling STACKS of staggered height standing on a low wide base
block — an air-monitoring tank farm, immediately distinct from the gateway cube
and from every single-mass sibling (esp. the single ChemWorks Distillation column:
this is a CLUSTER of several stacks of different heights, not one column).

  * Base block: a low wide Box — M/D weathered-steel walls, an L deck the stacks
    stand on, an o hazard stripe along the base front. Opening = RIGHT.
  * Sampling stacks: 4 slender M/D steel cylinders rising from the deck at staggered
    heights, K o-banded collars at intervals, a thin c sight-strip up the lit-left
    of the tallest. Back stacks drawn before front stacks (painter's algorithm).
  * Opening side = RIGHT: the hero is the analyzer BAY on the SHADED RIGHT face of
    the base — a K-framed window showing a GLOWING g->c bell-jar analyzer over a
    bright o/O lit interior (reads on the dark side), h reflection, with a K-framed
    predicted-concentration DIAL whose o/O needle climbs toward a bright O forecast
    mark. The LIT-LEFT face stays plainer (one c ribbon window + a vent).

Signature (one-of-one): the stacks are crowned with a ring of upward-facing INTAKE
HORNS / sniffer-tubes that visibly inhale drifting AMBER (o/O) and TEAL (c/g) GAS
WISPS out of the air, curling them DOWN into the horns; thin D sample-lines tie the
stack tops to the right-bay analyzer. No gas-intake / sniffer-horn / bell-jar motif
exists elsewhere in the catalog.

Composed from art/isobuild.{cylinder,Box} — NO iso.draw_cube / base_windows.
Draw order: contact shadow -> base BLOCK -> BACK stacks -> FRONT stacks -> stack
collars/sight-strip -> intake-horn crown + gas wisps + met-mast blink -> the base's
RIGHT glowing analyzer opening (front).
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
# stage-1 sprite and atmospheric-sensor-array.png stays byte-identical). These four
# exact keys+hexes are the lab-wide evolved accents reused by all 10 terrabase
# buildings for consistency:
#   b  deep basalt/bedrock  — matured warm structure tone for t3+ new masses
#   e  energized mineral-seismic glow (mid)    E  energized glow (bright) — t4/t5 power
#   q  premium survey gold  — t5 flourish ONLY (NOT a whole-building recolor)
TERRA = {"K": "#20190f", "W": "#efe6cf", "L": "#d6c8a0", "M": "#b09a6e", "D": "#7e6c47", "d": "#54462c",
         "h": "#d6f2ea", "c": "#a4e2d4", "g": "#34b6a2", "G": "#1d8474",
         "o": "#e0a850", "O": "#ffce80", "r": "#9a5e1e",
         "b": "#3a3326", "e": "#5fe0c4", "E": "#c4fff0", "q": "#f3c63a"}


# ── base block geometry (a low wide pad the stacks stand on) ──────────────────
BASE_BOX = Box(top=(30, 27), wx=10, wy=9, h=13)

# ── the 4 sampling stacks (varied height): (cx, top_y, rx, h, is_back) ────────
# laid out left->right; staggered tops; tallest is the 2nd. Back stacks higher on
# screen (smaller cx offset back-left) are drawn first so front ones occlude them.
RX = 3
RY = 2
STACKS = [
    # (cx, top_y, h, back?)  -- top_y smaller = taller stack
    (24, 14, 22, True),    # back-left, medium
    (40, 16, 20, True),    # back-right, medium-short
    (29,  5, 30, False),   # front-left, TALLEST (the hero column w/ sight-strip)
    (37, 12, 24, False),   # front-right, tall
]


# ── contact shadow pooled under the whole footprint (drawn FIRST) ─────────────
def contact_shadow(c):
    scx, scy = 32, 55
    for x in range(scx - 17, scx + 17):
        for y in range(scy - 2, scy + 3):
            ex = (x - scx) / 17.0
            ey = (y - scy) / 2.3
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")


# ── the low wide BASE BLOCK — drawn before the stacks rise from its deck ───────
def base_block(c, b):
    """Low weathered-steel pad: M lit-left wall, D shaded-right wall, L deck. The
    stacks stand on the L deck (drawn after, occluding the back roof edge). An o
    hazard stripe rings the base front; a r grime band grounds it."""
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # weathered o HAZARD stripe along the base of both front faces
    pt_l, pt_r = b.left_pt, b.right_pt
    for u in [x / 20 for x in range(1, 20)]:
        p = pt_l(u, b.h - 1.4)
        c.set(int(round(p[0])), int(round(p[1])), "o" if int(u * 20) % 2 == 0 else "K")
    for u in [x / 20 for x in range(1, 20)]:
        p = pt_r(u, b.h - 1.4)
        c.set(int(round(p[0])), int(round(p[1])), "K" if int(u * 20) % 2 == 0 else "r")
    # a couple of sample crates on the lit-left deck (field-rig hardware)
    cp = b.roof_pt(0.22, 0.30)
    cx, cy = int(round(cp[0])), int(round(cp[1]))
    for dy, row in enumerate(["KKKK", "KMLK", "KDdK", "KKKK"]):
        for dx, ch in enumerate(row):
            if ch != ".":
                c.set(cx + dx, cy + dy, ch)
    return b


def deck_y(b, x):
    """Screen-y of the base ROOF (deck) front silhouette at screen column x — used
    to seat each stack foot ON the deck rather than punching through the front."""
    lf0, lf1 = b.r_left, b.r_front
    rf0, rf1 = b.r_front, b.r_right
    if x <= b.r_front[0]:
        a, bb = lf0, lf1
    else:
        a, bb = rf1, rf0
    if bb[0] == a[0]:
        return max(a[1], bb[1])
    t = (x - a[0]) / (bb[0] - a[0])
    t = max(0.0, min(1.0, t))
    return a[1] + t * (bb[1] - a[1])


# ── one slender ROUND steel sampling stack ────────────────────────────────────
def stack(c, cx, top_y, h, tallest=False):
    """A slim M/D steel cylinder with ROUND cross-section shading (bright lit band
    just left of centre fading to deep d far-right), a W rim glint on the top
    ellipse, K o-banded collars at intervals, and (on the tallest) a thin c
    sight-strip up the lit-left. The foot is clipped to the base deck."""
    base_y = top_y + h
    cylinder(c, cx, top_y, RX, h, top="L", side_l="M", side_r="D", outline="K", ry=RY)

    # ROUND steel shading ramp across the body (no full-height teal column — the
    # tallest's sight-line is a SHORT broken c segment painted after, not a stripe)
    SGT = -2              # single sight-strip col (lit-left) for the tallest
    for col in range(-RX, RX + 1):
        t = 1 - (col / RX) ** 2
        if t < 0:
            continue
        edge = RY * (t ** 0.5)
        y0 = int(top_y + edge)
        if col == -RX:
            ch = "M"                      # lit rim
        elif col == -1:
            ch = "L"                      # bright steel highlight band
        elif col <= 0:
            ch = "M"
        elif col == 1:
            ch = "D"
        elif col == 2:
            ch = "D"
        else:
            ch = "d"                      # deep shaded far-right
        x = cx + col
        for y in range(y0, base_y + 1):
            c.set(x, y, ch)

    # bright W rim glint along the back-upper arc of the top ellipse
    for a in range(186, 360, 6):
        x = cx + RX * math.cos(math.radians(a))
        y = top_y + RY * math.sin(math.radians(a))
        c.set(x, y, "W")

    # a SHORT broken c sight-line (sensor sight, NOT a flowing column) on the
    # tallest's lit-left: a thin K guide rail with a few c tick segments only in
    # the upper third, so it reads as an instrument sight-line not gushing liquid.
    if tallest:
        gx = cx + SGT
        gy0 = top_y + 4
        gy1 = top_y + h // 2          # only the upper portion — never full height
        for y in range(gy0, gy1 + 1):
            c.set(gx - 1, y, "K")     # thin guide rail
        for y in range(gy0 + 1, gy1, 3):
            c.set(gx, y, "c")         # broken teal sight ticks
            c.set(gx, y + 1, "g")

    # K o-banded COLLARS at intervals (weatherproof field hardware)
    for cy in range(top_y + 6, base_y - 2, 7):
        for col in range(-RX, RX + 1):
            t = 1 - (col / RX) ** 2
            if t < 0:
                continue
            x = cx + col
            yy = cy + int((1 - t) * 1.2)
            c.set(x, yy, "K")
            # a thin o band just under the K collar (warm banding)
            if c.px[yy + 1][x] in ("M", "D", "L", "d"):
                c.set(x, yy + 1, "o" if col <= 0 else "r")
    return (cx, top_y, base_y)


# ── INTAKE HORN crowning a stack top (signature crown element) ────────────────
def intake_horn(c, cx, top_y):
    """A wide flared sniffer-TRUMPET on a stack top, mouth UP. A D/M bell that
    flares OUT as it rises off a narrow neck into a broad OPEN cup: bright L
    lit-left rim, K outline, and a clearly DARK open throat hollow at the centre,
    plus a faint K/G 'swallow' shadow just under the front rim — so descending gas
    visibly disappears INTO the horn. Reads as an upward funnel, not a flat cap."""
    ty = top_y          # neck sits at the stack top
    # narrow NECK (2px) rising off the stack top
    for dy in (0, -1):
        c.set(cx - 1, ty + dy, "M"); c.set(cx, ty + dy, "M"); c.set(cx + 1, ty + dy, "D")
    # bell flares OUT as it rises (mid flare row, wider than the neck)
    fy = ty - 2
    c.set(cx - 3, fy, "K"); c.set(cx - 2, fy, "M"); c.set(cx - 1, fy, "L")
    c.set(cx, fy, "M"); c.set(cx + 1, fy, "D"); c.set(cx + 2, fy, "d"); c.set(cx + 3, fy, "K")
    # MOUTH RIM (widest, 7px): a clearly OPEN cup. bright lit-left, K corners.
    my = ty - 3
    c.set(cx - 4, my, "K"); c.set(cx - 3, my, "L"); c.set(cx - 2, my, "L")
    c.set(cx - 1, my, "M"); c.set(cx, my, "M"); c.set(cx + 1, my, "D")
    c.set(cx + 2, my, "d"); c.set(cx + 3, my, "K")
    # the open THROAT hollow inside the rim — a dark cup so descending gas dives IN
    c.set(cx - 2, my + 1, "K"); c.set(cx - 1, my + 1, "d")
    c.set(cx, my + 1, "K"); c.set(cx + 1, my + 1, "K")
    # sharper 'SWALLOW' shadow just under the front rim — a 2px K core with a G
    # fringe, so a descending wisp visibly DISAPPEARS into the dark throat (round-1
    # polish: make the inhale unmistakable at sprite scale).
    c.set(cx - 1, my + 2, "K"); c.set(cx, my + 2, "K"); c.set(cx + 1, my + 2, "G")
    return (cx, my)   # mouth centre (where wisps get inhaled)


# ── a drifting GAS WISP curling over and DOWN into a horn mouth (inhaled) ──────
def gas_wisp(c, mx, my, amber=True, side=1):
    """A short COMMA-shaped curl of drifting gas being INHALED into the horn. The
    TAIL starts out & slightly UP in the open air (faint, light), the curl arcs
    over the rim, then the HEAD dives DOWN-and-INWARD the last few px straight into
    the throat (dense body) — the descending head pointing into the mouth is the
    'being sucked in' cue. Kept LOW and tight to the mouth: no tall upward arcs.
    Amber = o/O, teal = c/g. `side` swings each curl so neighbours read distinct."""
    body, lite = ("o", "O") if amber else ("g", "c")
    # COMMA curl: a faint tail hangs OUT in the air to the side, the curl arcs IN
    # over the rim, then the dense head PLUNGES straight DOWN through the rim into
    # the dark throat (the last px land AT/BELOW the mouth) — unmistakably inhaled.
    path = [
        (side * 4, -2, lite),   # faint tail out in the air to the side
        (side * 3, -2, lite),
        (side * 2, -2, lite),   # arcing inward toward the mouth
        (side * 1, -2, body),   # curl thickens above the throat
        (side * 1, -1, body),   # cresting right over the open mouth
        (0,  0, body),          # HEAD entering the rim...
        (0,  1, body),          # ...plunging DOWN into the dark throat = inhaled
    ]
    for dx, dy, ch in path:
        x, y = mx + dx, my + dy
        if 1 <= y < 64 and 0 <= x < 64:   # keep wisps off the very top frame row
            # the two diving-head px may overwrite the dark throat (so gas visibly
            # enters the mouth); the rest only paints empty air.
            if c.px[y][x] in (".",) or (dy >= 0 and c.px[y][x] in ("K", "d", "G")):
                c.set(x, y, ch)


# ── sample-lines tying stack tops back to the analyzer bay ────────────────────
def sample_lines(c, tops, b):
    """Thin D sample tubes running from a couple of stack tops down toward the
    right analyzer bay — the collected air is piped to the analyzer."""
    # anchor near the top of the shaded right face of the base
    anchor = b.right_pt(0.30, 1.2)
    ax, ay = int(round(anchor[0])), int(round(anchor[1]))
    for (cx, top_y, _base_y) in tops[2:]:   # from the two front stacks
        x0, y0 = cx + 1, top_y + 1
        c.line((x0, y0), (ax, ay), "d")
        c.set(x0, y0, "D")


# ── met-mast with a c blink beacon on the back deck corner ────────────────────
def met_mast(c, b):
    """A thin D met-mast on the back-LEFT deck corner crowned by a c blink beacon
    (NO anemometer — just a blink). A weatherproof antenna motif."""
    mp = b.roof_pt(0.18, 0.78)
    mx, my = int(round(mp[0])), int(round(mp[1]))
    top = my - 13
    c.line((mx, my), (mx, top), "D")
    c.set(mx - 1, my - 1, "M")           # lit edge
    # K rungs
    for ry in (my - 4, my - 8):
        c.set(mx - 1, ry, "K"); c.set(mx + 1, ry, "K")
    # c blink beacon at the top + a faint h halo
    c.set(mx, top, "c")
    c.set(mx, top - 1, "h")
    c.set(mx - 1, top, "g"); c.set(mx + 1, top, "g")


# ── the GLOWING analyzer opening on the base's SHADED RIGHT face (hero) ────────
def right_analyzer(c, b):
    """The hero: a K-framed analyzer BAY on the base block's SHADED RIGHT face,
    made to GLOW — a g->c GLASS BELL-JAR over a bright o/O lit interior so it
    reads on the dark side, h reflection. Beside it a K-framed predicted-
    concentration DIAL with an o/O needle climbing toward a bright O forecast
    threshold mark + a tiny g ppm readout."""
    pt = b.right_pt

    # --- the analyzer WINDOW: a clean K-framed bay glowing with a lit interior, on
    # the LEFT half of the (now taller) shaded face; the dial sits on the right half.
    wu0, wu1, wv0, wv1 = 0.05, 0.46, 2.0, b.h - 1.0
    c.fill_poly([pt(wu0, wv0), pt(wu1, wv0), pt(wu1, wv1), pt(wu0, wv1)], "o")      # lit interior wash
    # bright O hot core down the inner-left of the bay (the lamp behind the jar)
    c.fill_poly([pt(wu0 + 0.05, wv0 + 0.6), pt(wu0 + 0.22, wv0 + 0.6),
                 pt(wu0 + 0.22, wv1 - 0.8), pt(wu0 + 0.05, wv1 - 0.8)], "O")
    # deeper r shadow at the lower-right inner corner for depth
    c.fill_poly([pt(wu1 - 0.12, wv0 + 2.2), pt(wu1, wv0 + 2.2),
                 pt(wu1, wv1), pt(wu1 - 0.12, wv1)], "r")

    # the GLASS BELL-JAR standing in the bay (the right-face HERO): a clear rounded
    # dome (c glass, h lit-left glint) over a glowing G/g analyte puck, with an o/c
    # collected-gas swirl tinting the inside — sits proud against the O lamp glow.
    bj = pt(0.26, wv1 - 0.3)
    bx, by = int(round(bj[0])), int(round(bj[1]))
    # rounded dome silhouette: K-ringed so the jar reads as a distinct object that
    # sits PROUD of the O lamp glow behind it — domed crown, h glint, glass body,
    # collected amber gas inside, glowing analyte near the floor.
    dome = [
        ".KKK.",    # rounded crown (K)
        "KhhcK",    # bright lit-left glint under the crown
        "KcccK",    # glass body
        "KcooK",    # collected amber gas swirling inside
        "KccgK",    # teal analyte tint near the floor
    ]
    for j, row in enumerate(dome):
        for i, ch in enumerate(row):
            if ch != ".":
                xx, yy = bx - 2 + i, by - 6 + j
                if 0 <= xx < 64 and 0 <= yy < 64:
                    c.set(xx, yy, ch)
    # glowing analyte puck on the jar floor (G core w/ a g halo) + K base seal
    c.set(bx - 2, by, "K"); c.set(bx - 1, by, "G"); c.set(bx, by, "g")
    c.set(bx + 1, by, "G"); c.set(bx + 2, by, "K")

    # clean K window FRAME + an h reflection streak down the lit-left jamb
    for a, b2 in [(pt(wu0, wv0), pt(wu1, wv0)), (pt(wu0, wv1), pt(wu1, wv1)),
                  (pt(wu0, wv0), pt(wu0, wv1)), (pt(wu1, wv0), pt(wu1, wv1))]:
        c.line(a, b2, "K")
    c.line(pt(wu0 + 0.08, wv0 + 1.0), pt(wu0 + 0.08, wv1 - 1.5), "h")

    # --- the predicted-concentration DIAL on the RIGHT half of the shaded face ---
    # A clear K-framed GAUGE: a dark face with a bold o/O NEEDLE swinging up from a
    # bottom-left pivot toward a bright O forecast-threshold mark in the top-right.
    dp = pt(0.62, 3.0)
    dx, dy = int(round(dp[0])), int(round(dp[1]))
    # K-framed 6x7 dial face with a dark d readout backing (reads on the shaded side)
    for j, row in enumerate(["KKKKKK", "KddddK", "KddddK", "KddddK", "KddddK", "KddddK", "KKKKKK"]):
        for i, ch in enumerate(row):
            c.set(dx + i, dy + j, ch)
    # bold diagonal NEEDLE: pivots at bottom-left, climbs up-right across the face
    c.set(dx + 1, dy + 5, "g")          # pivot hub (teal)
    c.set(dx + 2, dy + 5, "o")          # needle base
    c.set(dx + 2, dy + 4, "o")          # ...climbing
    c.set(dx + 3, dy + 3, "O")          # ...rising up-right
    c.set(dx + 4, dy + 2, "O")          # needle tip nearing the mark
    # bright O forecast-threshold tick in the top-right corner of the face
    c.set(dx + 4, dy + 1, "O")
    # a tiny g ppm readout tick row just under the dial
    c.set(dx + 1, dy + 7, "g"); c.set(dx + 2, dy + 7, "c")
    c.set(dx + 3, dy + 7, "g"); c.set(dx + 4, dy + 7, "c")

    # --- soft o glow pooling on the ground in front of the lit right face ---
    base_pt = pt(0.4, b.h)
    gx, gy = int(round(base_pt[0])), int(round(base_pt[1]))
    for ddx in range(-2, 5):
        c.set(gx + ddx, gy + 1, "o" if abs(ddx) < 3 else "r")
    c.set(gx, gy + 2, "o")


# ── plainer LIT-LEFT base detail (one c ribbon window + a vent) ────────────────
def left_detail(c, b):
    """The lit-left base face stays plainer per the blueprint — one c ribbon
    window + a small d vent grille — so the cluster + analyzer carry the interest."""
    pt = b.left_pt
    # a thin c ribbon window high on the lit face. Round-1 polish: drop the bright
    # h highlight line to c so ALL the glow weight stays on the right-bay hero — the
    # left ribbon should read as a calm sight window, not a second focal glint.
    c.fill_poly([pt(0.30, 2.4), pt(0.72, 2.4), pt(0.72, 4.0), pt(0.30, 4.0)], "K")
    c.fill_poly([pt(0.33, 2.7), pt(0.69, 2.7), pt(0.69, 3.7), pt(0.33, 3.7)], "c")
    c.line(pt(0.33, 2.9), pt(0.69, 2.9), "c")
    c.line(pt(0.50, 2.7), pt(0.50, 3.7), "K")
    # a small d vent grille lower on the lit face
    for k in range(3):
        c.line(pt(0.34, 5.2 + k * 1.2), pt(0.64, 5.2 + k * 1.2), "d")
    for u in (0.34, 0.64):
        c.line(pt(u, 4.8), pt(u, 7.0), "K")
    c.line(pt(0.34, 4.8), pt(0.64, 4.8), "D")


# ── small pixel helper (stamp a tiny object; '.' = skip) ──────────────────────
def _stamp(c, x0, y0, rows):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != "." and 0 <= x0 + i < 64 and 0 <= y0 + j < 64:
                c.set(x0 + i, y0 + j, ch)


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS air-monitoring
# structure onto the prior form — never restarts, never recolors the whole building.
# Theme: a lone sensor mast cluster grows into a fully built-out atmospheric-research
# array. Colours mature stage by stage; gold (q) is a t5 flourish only. Every add is
# anchored to a base part (deck rim / left corner / back-right deck / column top) and
# clamped on-canvas, and NONE collide with the centre intake-horn + gas-wisp signature.
#
#   t2  small functional add : a ring of INTAKE CYCLONE cans + a WIND-VANE at the feet
#   t3  structural add        : a CALIBRATION-GAS ANNEX with two upright gas bottles + vent
#   t4  major add             : one extra TALLER sampling COLUMN with a glowing analyzer head
#   t5  crowning feature      : a hovering AIR-QUALITY PLUME / isopleth model + lidar + gold tips
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_cyclones(c, b):
    """t2 — SMALL FUNCTIONAL ADD: a little ring of air-INTAKE gear staked around the
    column FEET on the bright lit-left deck — two stubby M/D cyclone-separator cans
    (K rim, a c intake glint at the throat, a small o duct foot) plus a tiny o wind-
    VANE on a short K mast at the front deck corner. Reads as fresh sampling intakes
    feeding the columns. Kept LOW on the deck so it never climbs into the cluster, and
    on the LIT-LEFT apron (well clear of the t3 annex/left flank and t4 right column).
    Base palette + one brightened c glint and an O sample-active light on the analyzer."""
    # --- two stubby intake-cyclone cans on the OPEN lit front-left deck, well in
    # front of the stack feet on the brightest, clearest deck surface so they read as
    # discrete new gear; short (5px) so they stay below the stack collars. Each gets a
    # 1px K contact shadow to seat it on the deck. ---
    for (du, dv) in [(0.30, 0.14), (0.50, 0.12)]:
        cp = b.roof_pt(du, dv)
        ccx, ccy = int(round(cp[0])), int(round(cp[1]))
        c.set(ccx, ccy + 1, "K"); c.set(ccx - 1, ccy + 1, "d")   # contact shadow on deck
        # a small cyclone separator: a K-rimmed can tapering to a d cone foot, with a
        # bright c intake throat (the air being drawn in) — strong value contrast on
        # the lit deck so the new intakes pop.
        _stamp(c, ccx - 1, ccy - 5, [
            "KcK",   # K-rimmed top lip around a bright c intake throat
            "MLD",   # lit shoulder (bright L highlight)
            "MMD",   # lit body
            "MdD",   # shaded lower body
            ".K.",   # narrowing cone neck (dark)
        ])
        c.set(ccx, ccy - 5, "c")        # extra-bright c intake glint at the throat
    # --- a small WIND-VANE on a short mast at the front-RIGHT deck (direction sensor):
    # a clear K mast topped by an arrow FIN on one side + a counter-tail, reading as a
    # weather vane. Sits on the clear right-front deck, left of the analyzer face. ---
    vp = b.roof_pt(0.66, 0.20)
    vx, vy = int(round(vp[0])), int(round(vp[1]))
    c.line((vx, vy), (vx, vy - 6), "D")     # short mast
    c.set(vx - 1, vy - 5, "M")              # lit edge of the mast
    c.set(vx, vy, "K")                       # foot on the deck
    c.set(vx, vy + 1, "K")                   # contact shadow
    _stamp(c, vx + 1, vy - 6, [             # arrow FIN pointing right (the vane head)
        "ooO",
        ".oO",
    ])
    c.set(vx - 1, vy - 6, "o")              # short counter-tail off the other side
    c.set(vx - 2, vy - 6, "o")
    # --- brighten one O "sample-active" indicator light on the analyzer-bay frame ---
    ap = b.right_pt(0.30, 1.4)
    c.set(int(round(ap[0])), int(round(ap[1])), "O")


def stage3_calibration_annex(c, b):
    """t3 — STRUCTURAL ADD: a CALIBRATION-GAS ANNEX bolted onto the base's FRONT-LEFT
    corner — a low b basalt housing block extending the footprint sideways-left, with
    a slatted Box.louver vent on its lit face, carrying TWO slim upright calibration-
    gas BOTTLES (cylinders) standing on its roof that pipe reference gas to the columns.
    A real new structural mass (a box + two tanks + a vent), not a prop. First use of
    the deepened basalt tone b. Sits on the LEFT flank, clear of the right-side analyzer
    bay and below the cluster crown."""
    # annex box: seated against the front-LEFT base corner, lower + smaller than the
    # base, growing OUT to the left so it reads as an abutting service shed.
    annex = Box(top=(b.r_left[0] - 1, b.r_left[1] + 1), wx=3, wy=4, h=8)
    annex.draw(c, roof="M", lwall="b", rwall="d", roof_hi="L", outline="K")
    # re-lay the lit face one tone up off pure basalt so it reads as built structure
    c.fill_poly([annex.r_left, annex.r_front, annex.w_front, annex.w_left], "D")
    # K plank skirt at the base of the lit face
    c.line(annex.left_pt(0.06, annex.h - 0.3), annex.left_pt(0.94, annex.h - 0.3), "K")
    # re-outline after the fill
    for a, bb in [(annex.r_top, annex.r_right), (annex.r_right, annex.r_front),
                  (annex.r_front, annex.r_left), (annex.r_left, annex.r_top),
                  (annex.r_left, annex.w_left), (annex.r_front, annex.w_front),
                  (annex.r_right, annex.w_right),
                  (annex.w_left, annex.w_front), (annex.w_front, annex.w_right)]:
        c.line(a, bb, "K")
    # slatted LOUVER vent on the lit-left face (services the bore / vents calib gas)
    annex.louver(c, "left", 0.28, 0.74, 2.6, 6.4, body="b", slat="d", edge="M", frame="K")
    # a small g status slit beside the vent
    c.set(int(round(annex.left_pt(0.84, 3.2)[0])), int(round(annex.left_pt(0.84, 3.2)[1])), "g")

    # --- two slim upright CALIBRATION-GAS BOTTLES standing on the annex roof ---
    # thin cylinders with a rounded valve cap; one teal-banded (test gas), one ochre.
    rp = annex.roof_pt(0.40, 0.50)
    r0x, r0y = int(round(rp[0])), int(round(rp[1]))
    bottles = [(r0x - 1, "g"), (r0x + 2, "o")]   # (centre x, band colour)
    for bxc, band in bottles:
        cylinder(c, bxc, r0y - 9, 1, 7, top="L", side_l="M", side_r="D", outline="K", ry=1)
        c.set(bxc, r0y - 10, "K")         # valve neck
        c.set(bxc, r0y - 11, "L")         # bright valve cap
        c.set(bxc, r0y - 6, band)         # a single ID band on the bottle shoulder
        c.set(bxc - 1, r0y - 4, band)     # a lower band tick
    # a thin d manifold pipe tying the two bottle tops together (feeds the columns)
    c.line((bottles[0][0], r0y - 10), (bottles[1][0], r0y - 10), "d")


def stage4_extra_column(c, b):
    """t4 — MAJOR ADD: the array literally GROWS A NEW SPIRE — one extra, TALLER
    sampling COLUMN added to the cluster on the open RIGHT flank, rising clear above
    the existing stacks into the top-right margin. A slim b basalt cylinder body with
    an M lit band and K o-banded collars (matching the base stacks' field-hardware
    read), capped with a GLOWING e aerosol-analyzer HEAD (a bulbous sensor pod, bright
    E core) and stepped e intake bands climbing its upper body. Extends ITS OWN column
    motif (not a generic derrick). Foot seats on the back-right deck; fully on-canvas
    (x clamped well inside 63, apex y>=4) and to the RIGHT of the cluster + analyzer bay."""
    cx = 47                           # right of the back-right stack (cx=40), on open canvas
    top_y = 6                         # TALLEST in the cluster — rises high, pod crown clears
                                      # the top frame row (pod stamps from top_y-4 = y2)
    foot = b.roof_pt(0.92, 0.86)      # seat the foot on the back-RIGHT deck
    base_y = int(round(foot[1]))
    h = base_y - top_y
    rx = 2
    # the new column body: deepened basalt cylinder so it reads as a matured new mass
    cylinder(c, cx, top_y, rx, h, top="L", side_l="M", side_r="b", outline="K", ry=1)
    # round-steel shading ramp: lit M just left of centre, deep basalt to the right
    for col in range(-rx, rx + 1):
        ch = "M" if col <= -1 else ("D" if col == 0 else "b")
        for y in range(top_y + 1, base_y + 1):
            if 0 <= cx + col < 64 and 0 <= y < 64:
                c.set(cx + col, y, ch)
    # K o-banded collars at intervals (same field-hardware language as the base stacks)
    for cyb in range(top_y + 7, base_y - 2, 8):
        for col in range(-rx, rx + 1):
            c.set(cx + col, cyb, "K")
        c.set(cx, cyb + 1, "o")
    # stepped ENERGIZED e intake bands climbing the upper third (the new tech read)
    for cyb in range(top_y + 4, top_y + 14, 3):
        c.set(cx - 1, cyb, "e")
        c.set(cx, cyb, "E")
        c.set(cx + 1, cyb, "e")
    # --- glowing AEROSOL-ANALYZER HEAD capping the column (a bulbous sensor pod) ---
    hy = top_y
    _stamp(c, cx - 2, hy - 4, [
        ".EEE.",   # bright glowing crown of the analyzer pod
        "EeEeE",   # energized sensor body
        "GeEeG",   # shaded underside w/ a bright core
        ".GeG.",   # narrowing neck onto the column top
    ])
    c.set(cx, hy - 4, "W")            # hottest spec at the pod crown
    c.set(cx, hy - 1, "e")           # neck glow onto the column rim


def stage5_plume_model(c, b, tops):
    """t5 — CROWNING FEATURE = FULLY EVOLVED atmospheric-research array. A hovering
    glowing AIR-QUALITY PLUME / ISOPLETH MODEL crowns the cluster: a soft E particulate
    cloud of nested e isopleth contour rings with drifting e aerosol NODES, fed by a
    thin e LIDAR BEAM lancing up from the TALLEST base column into the model. The array
    is then dressed out with GOLD survey trim — q tip-caps on every column crown and a
    thin q trim ring on the base front rim. Reads as elite, still clearly the sensor
    array. The model hovers in the CLEAR band above the cluster (between the tallest
    horn and the t4 spire), fully on-canvas."""
    import math
    # tallest base column (front-left, cx=29) — its top_y from tops[2]; the lidar
    # rises from just beside its intake horn up to the plume centre.
    tcx, ttop, _tb = tops[2]
    # --- plume model centre: hover in the clear band above the cluster, offset RIGHT
    #     of the tallest horn (x≈29) so it sits in open canvas, clamped on-frame ---
    mcx, mcy = 36, 9

    def _plot(x, y, ch, over=()):
        """Paint only into empty air (or over the listed chars) so the plume reads as
        a translucent overlay and never punches holes in the columns below it."""
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < 64 and 1 <= yi < 64 and (c.px[yi][xi] == "." or c.px[yi][xi] in over):
            c.set(xi, yi, ch)

    # thin LIDAR BEAM lancing up from beside the tallest column's horn into the plume
    # (a 2px energized shaft with a bright E muzzle at the column, so the projection
    # source reads clearly).
    bx0, by0 = tcx + 2, ttop - 1
    c.line((bx0, by0), (mcx - 2, mcy + 3), "e")
    c.line((bx0 + 1, by0 - 1), (mcx - 1, mcy + 2), "E")   # bright inner core of the beam
    c.set(bx0, by0, "E"); c.set(bx0 + 1, by0, "E")        # bright muzzle at the source

    # --- the isopleth PLUME: nested concentration-shell CONTOUR RINGS (the structured
    #     read), brightest at the core fading out — an air-quality cloud over the array.
    for rr, rry, ch in ((8, 4.0, "e"), (6, 3.0, "e"), (4, 2.0, "E"), (2, 1.2, "E")):
        for a in range(0, 360, 16):
            _plot(mcx + rr * math.cos(math.radians(a)),
                  mcy + rry * math.sin(math.radians(a)), ch)
    # a sparse inner haze speckle (just a few motes, NOT a dense fill) so the centre
    # reads as denser particulate without confetti
    for (dx, dy) in [(-2, 0), (2, -1), (0, 1), (-1, -2), (1, 1)]:
        _plot(mcx + dx, mcy + dy, "e")
    c.set(mcx, mcy, "E")             # bright peak-concentration core
    c.set(mcx, mcy - 1, "W")
    # --- drifting e aerosol NODES on the plume's outer fringe (discrete bright motes
    #     each with a 1px drift trail) — particulate matter caught drifting downwind ---
    for (dx, dy) in [(-10, 0), (10, -1), (-7, 4), (8, 4)]:
        _plot(mcx + dx, mcy + dy, "E")
        _plot(mcx + dx + (1 if dx > 0 else -1), mcy + dy, "e")   # drift trail outboard

    # --- GOLD premium trim (t5 flourish only) ----------------------------------
    # q tip-caps on EVERY column crown (the base stacks via `tops` + the t4 spire).
    # Clamp each cap to y>=1 so the gold never lands on the top frame row.
    for (cx, ty, _by) in tops:
        cap_y = max(2, ty - 4)           # gold cap riding above each intake horn (y>=2)
        c.set(cx, cap_y, "q")
        c.set(cx, cap_y - 1, "O")        # brighter gold glint one row up (y>=1)
    # the t4 extra column crown (cx=47, pod crown now at y=2) — gold cap just on it
    c.set(47, 2, "q")
    # a thin q trim RING along the base FRONT rim (sparse elite survey trim)
    lf0, lf1, rf = b.r_left, b.r_front, b.r_right
    for u in (0.25, 0.5, 0.75):
        p = b.left_pt(u, 0.4)
        c.set(int(round(p[0])), int(round(p[1])), "q")
        p = b.right_pt(u, 0.4)
        c.set(int(round(p[0])), int(round(p[1])), "q")
    cf = b.r_front
    c.set(int(round(cf[0])), int(round(cf[1])), "O")   # bright gold boss at the front nose


def build(stage: int = 1):
    """Compose the atmospheric sensor array at upgrade `stage` (1..5). Stage 1 is
    IDENTICAL to the shipped base PNG; each higher stage keeps every prior addition
    and bolts on the next (t2 cyclones+vane → t3 calibration annex → t4 extra taller
    column → t5 air-quality plume model + gold tips). Painter's order keeps overhead
    additions above the masses they grow from. The intake-horn crown + gas wisps are
    drawn as part of the base; upgrade adds are placed in OTHER zones (deck rim, left
    flank, right flank, top margin) so they never collide with the cluster signature."""
    c = Canvas()
    b = BASE_BOX
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    contact_shadow(c)
    base_block(c, b)

    # paint stacks back->front so nearer stacks occlude farther ones
    tops = []
    order = sorted(STACKS, key=lambda s: (not s[3], s[1]))  # backs first, then taller=front-ish
    # but we need a deterministic painter order: explicitly backs then fronts
    backs = [s for s in STACKS if s[3]]
    fronts = [s for s in STACKS if not s[3]]
    drawn = []
    for (cx, top_y, h, _back) in backs:
        drawn.append((cx, top_y, h))
        tops.append(stack(c, cx, top_y, h, tallest=False))
    for (cx, top_y, h, _back) in fronts:
        tallest = (h == max(s[2] for s in STACKS))
        tops.append(stack(c, cx, top_y, h, tallest=tallest))

    # SIGNATURE crown: an intake horn on every stack top, inhaling drifting wisps
    mouths = []
    for (cx, top_y, _base_y) in tops:
        mouths.append((intake_horn(c, cx, top_y), cx))
    # met-mast blink on the back deck corner (behind the front horns is fine)
    met_mast(c, b)
    # one prominent inhaled wisp per horn (alternating amber/teal), curling DOWN
    # into the mouth; a couple also get a faint second wisp on the far side. The
    # wisp swings IN from the outboard side of each horn toward the cluster centre.
    for i, ((mx, my), cx) in enumerate(mouths):
        amber = (i % 2 == 0)
        side = -1 if cx < 33 else 1     # tail hangs to the OUTBOARD side, dives inward
        gas_wisp(c, mx, my, amber=amber, side=side)
        if i % 2 == 0:                  # a faint companion wisp on the inner side
            gas_wisp(c, mx, my, amber=not amber, side=-side)

    # sample-lines tie the front stack tops back to the analyzer bay
    sample_lines(c, tops, b)

    # the hero glowing analyzer opening on the shaded RIGHT face (front)
    right_analyzer(c, b)
    left_detail(c, b)

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    # tops[2] is the TALLEST front column (front-left, cx=29) — the lidar beam in t5
    # and the t5 tip-cap recompute from it. Stages are layered AFTER the base so they
    # sit on the array, placed in distinct zones so none mush into the cluster.
    if stage >= 2:
        stage2_cyclones(c, b)
    if stage >= 3:
        stage3_calibration_annex(c, b)
    if stage >= 4:
        stage4_extra_column(c, b)
    if stage >= 5:
        stage5_plume_model(c, b, tops)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/terrabase"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "atmospheric-sensor-array"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped atmospheric-sensor-array.png, so it does NOT overwrite
    the base PNG."""
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
