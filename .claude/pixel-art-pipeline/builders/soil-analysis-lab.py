#!/usr/bin/env python3
"""
Soil Analysis Lab — TerraBase Lab economy building (BESPOKE form, STANDARD role).

A WIDE LOW CLERESTORY-MONITOR HALL with an exposed AUGER/SOIL-PIT on one side —
deliberately NOT the gateway cube and distinct from its TerraBase siblings: where
the other low halls are flat-capped or parapet boxes, this broad weathered M/D
field hall carries a RAISED CENTRAL CLERESTORY LANTERN (a smaller Box riding the
roof ridge with its own band of c/h clerestory windows) and an OPEN soil-pit with
a hand-auger at its front-right base.

  • Opening side = LEFT: the hero is a K-framed lab door + a wide bench WINDOW on
    the LIT-LEFT face (M/D wall, c glass, o "SOILS" placard), composition bins
    glowing inside. The SHADED RIGHT face stays plainer — a long wall with one d
    vent strip and the open soil-pit at its base.
  • Signature (one-of-one): a rooftop VIBRATING GRADED SIEVE-SHAKER on the back-
    right roof shakes loose soil down a clear STAIRCASE of 3 K-rimmed TEAL mesh
    screens stepping down-right (coarse deep-teal G -> medium g -> fine bright c),
    cascading r/D/M/o flecks (finer/paler as they fall) into a row of 4 glowing
    labeled COMPOSITION BINS (sand r -> silt o -> clay M -> organic g), while a
    mineral-teal g/G/c PIE-DIAL on the hall front reads out the mix, one wedge lit
    O/h as the dominant fraction. (Teal screens so the steps POP off the tan roof.)

Composed from art/isobuild.{Box} — NO iso.draw_cube / base_windows.
Draw order: contact shadow + main hall (back) -> clerestory monitor on the roof
-> sieve-shaker stack + cascading soil + composition bins (back-right roof) ->
teal pie-dial + LEFT hero opening (front) -> soil-pit + auger at the front-right.

──────────────────────────────────────────────────────────────────────────────
UPGRADE-EVOLUTION member of the "terrabase" lab. The build() body below is the
UNCHANGED base form (stage 1 == shipped soil-analysis-lab.png). On top of it four
CUMULATIVE upgrade stages bolt on grow-shed / vertical-farming structure (build up,
never restart) — same code pattern as sampling-station.py (build(stage) + stageN_*
helpers + emit/build_all). See terrabase-evolution-plan.md.
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder  # noqa: F401  (cylinder available if needed)

# Base TerraBase palette (shared keys) + the EVOLVED-accent keys reserved for the
# upgrade stages only (chars NOT used by the base palette, so they appear in NO
# stage-1 sprite and soil-analysis-lab.png stays byte-identical). These four exact
# keys+hexes are the lab-wide evolved accents reused across all terrabase buildings:
#   b  deep basalt/bedrock  — matured warm structure tone for t3+ new masses
#   e  energized nutrient-teal glow (mid)    E  energized glow (bright) — t4/t5 power
#   q  premium survey gold  — t5 flourish ONLY (NOT a whole-building recolor)
TERRA = {"K": "#20190f", "W": "#efe6cf", "L": "#d6c8a0", "M": "#b09a6e", "D": "#7e6c47", "d": "#54462c",
         "h": "#d6f2ea", "c": "#a4e2d4", "g": "#34b6a2", "G": "#1d8474",
         "o": "#e0a850", "O": "#ffce80", "r": "#9a5e1e",
         "b": "#3a3326", "e": "#5fe0c4", "E": "#c4fff0", "q": "#f3c63a"}


def _stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings) at top-left (x0,y0).
    '.' = skip (transparent)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


# ── geometry ──────────────────────────────────────────────────────────────────
# Main hall: WIDE in both axes, LOW height -> a broad low field hall (NOT a cube).
HALL = Box(top=(31, 19), wx=12, wy=10, h=10)
# Clerestory monitor: a SMALLER box riding the CENTRE of the hall roof ridge. Its
# back-top corner is placed so the lantern's footprint centres on the roof diamond
# (hall roof centre ~ screen (33,30)); lifted just a few px so it SEATS on the ridge
# (straddling the centre) instead of being shoved into a back corner.
MON = Box(top=(33, 22), wx=4, wy=3, h=4)


# ── 1. CONTACT SHADOW under the whole wide footprint (drawn FIRST) ────────────
def contact_shadow(c):
    """A flat K iso-ellipse pooled under the full wide hall footprint so it sits
    grounded, plus a soft skirt below the front faces."""
    scx, scy = 32, 51
    for x in range(scx - 24, scx + 24):
        for y in range(scy - 3, scy + 4):
            ex = (x - scx) / 24.0
            ey = (y - scy) / 3.2
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")


# ── 2. MAIN HALL — wide low weathered field hall ──────────────────────────────
def main_hall(c, b):
    """The broad low hall body: M lit-left / D shaded-right walls, an L low roof
    with a W bright back edge. Weathered TerraBase field-hall read — a few d board
    seams down the long faces and a D sill band."""
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # weathered plank/board seams down the LIT-LEFT long face (vertical grooves)
    for u in (0.16, 0.30, 0.44, 0.58, 0.72, 0.86):
        c.line(b.left_pt(u, 1.4), b.left_pt(u, b.h - 0.6), "D")
    # warm D sill band along the lit face base
    c.line(b.left_pt(0.04, b.h - 0.8), b.left_pt(0.96, b.h - 0.8), "D")
    # plainer SHADED-RIGHT face: a couple of darker seams + a low d skirt
    for u in (0.34, 0.66):
        c.line(b.right_pt(u, 1.6), b.right_pt(u, b.h - 0.6), "d")
    c.line(b.right_pt(0.04, b.h - 0.7), b.right_pt(0.96, b.h - 0.7), "d")

    # low-roof board seams running back->front so the roof reads as a panelled cap
    for v in (0.28, 0.5, 0.72):
        c.line(b.roof_pt(0.08, v), b.roof_pt(0.92, v), "M")
    # bright W back-edge highlight already drawn by draw(); add a soft M ridge line
    c.line(b.roof_pt(0.5, 0.04), b.roof_pt(0.5, 0.96), "M")
    return b


# ── 3. CLERESTORY MONITOR — a raised glazed lantern on the roof ridge ─────────
def clerestory(c, mon):
    """A smaller Box riding the CENTRE of the hall roof — a raised monitor lantern
    with a band of small c/h clerestory windows along its lit faces, so it reads
    as a glassy monitor-roof letting light into the hall."""
    mon.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # bright W ridge on the little roof
    c.line(mon.r_top, mon.r_left, "W")
    c.line(mon.r_top, mon.r_right, "W")

    # clerestory GLAZING band — a thin c strip with an h top-glint along the LIT-LEFT
    # long face (the recognizable monitor-window read), filling most of the short wall.
    cy0, cy1 = 0.9, mon.h - 0.8
    c.fill_poly([mon.left_pt(0.12, cy0), mon.left_pt(0.88, cy0),
                 mon.left_pt(0.88, cy1), mon.left_pt(0.12, cy1)], "c")
    c.line(mon.left_pt(0.12, cy0), mon.left_pt(0.88, cy0), "h")     # top glint
    c.line(mon.left_pt(0.12, cy1), mon.left_pt(0.88, cy1), "G")     # shaded sill
    # K mullions splitting the clerestory into panes
    for u in (0.12, 0.37, 0.62, 0.88):
        c.line(mon.left_pt(u, cy0), mon.left_pt(u, cy1), "K")
    # a dimmer g clerestory strip on the SHADED-RIGHT monitor face
    c.fill_poly([mon.right_pt(0.14, cy0 + 0.2), mon.right_pt(0.86, cy0 + 0.2),
                 mon.right_pt(0.86, cy1 - 0.1), mon.right_pt(0.14, cy1 - 0.1)], "G")
    for u in (0.14, 0.5, 0.86):
        c.line(mon.right_pt(u, cy0 + 0.2), mon.right_pt(u, cy1 - 0.1), "K")
    return mon


# ── 4. SIGNATURE: rooftop vibrating SIEVE-SHAKER + cascading soil + bins ───────
def _iso_tray(c, cx, cy, hw, fill, hi, lo, rim="K", depth=2):
    """Draw ONE flat isometric sieve tray as a SOLID graded SLAB centred at (cx,cy).
    `hw` = half-width in px (top diamond is 2:1 -> half-height = hw//2). A hard `rim`
    outlines the whole top diamond; the inside is ONE flat `fill` (the screen — NOT a
    checkerboard) with an `hi` back-left lit triangle and an `lo` front-right shade
    triangle for a little roundness. A `depth`-px front lip gives the slab thickness
    so it reads as a tray. NO interior mesh ticks — the staircase SHAPE must read, not
    texture. Returns the front-apex (cx, cy+hh+depth) so callers spill soil off it."""
    hh = max(2, hw // 2)
    top = (cx, cy - hh)
    right = (cx + hw, cy)
    bot = (cx, cy + hh)
    left = (cx - hw, cy)
    # SOLID flat top face — the readable screen (one value, NO checkerboard mesh).
    c.fill_poly([top, right, bot, left], fill)
    c.line((top[0], top[1] + 1), (left[0], left[1]), hi)   # one bright lit back-left edge
    # front DEPTH lip — the slab's visible thickness under the screen, solid `lo`.
    for d in range(1, depth + 1):
        c.line((left[0], left[1] + d), (bot[0], bot[1] + d), lo)
        c.line((bot[0], bot[1] + d), (right[0], right[1] + d), lo)
    # ONE clean hard K rim around the top diamond + close the lip bottom (crisp edge).
    c.line(top, right, rim); c.line(right, bot, rim)
    c.line(bot, left, rim); c.line(left, top, rim)
    c.line((left[0], left[1] + depth), (bot[0], bot[1] + depth), rim)
    c.line((bot[0], bot[1] + depth), (right[0], right[1] + depth), rim)
    return (cx, cy + hh + depth)


def sieve_shaker(c, hall):
    """The hero, on the BACK-RIGHT roof: a clean STAIRCASE of 3 LARGE, clearly-
    separated graded sieve trays stepping DOWN-and-to-the-RIGHT. Each tray is a flat
    iso slab with a hard K rim and a SOLID graded fill — coarse-screen tray darkest
    (D) on top, medium (M), finest palest (L) at the bottom — with a clear DARK GAP
    of bare roof between steps so the silhouette reads as 3 DISTINCT screens, not a
    lump. Soil cascades off each tray's lower lip down to the next, ending in the
    graded COMPOSITION BINS below. A faint c/h vibration ghost hints the shaker."""
    # THREE stepped trays forming a DOWN-RIGHT staircase. Centres step +4px RIGHT and a
    # big +8px DOWN, so with short trays (hh≈2, depth 2 -> ~5px tall) there is a clear
    # ~3px band of BARE ROOF between every pair of trays — the three steps read SEPARATELY
    # instead of merging into a lump. The screen fills are TEAL (the building's mesh/
    # sensor colour) so they POP hard off the warm tan roof (an earth-tone tray would
    # camouflage). Grade reads coarse->fine by brightening the teal: dark G (coarse) ->
    # g (medium) -> bright c (fine). Each tray a dark `d`/`G` front lip + hard K rim, so
    # all three read as framed mesh screens regardless of how they sit on the roof.
    #   (cx, cy, half-width, screen-fill, lit-glint, front-lip)
    trays = [
        (42, 23, 5, "G", "g", "d"),   # TOP  — coarsest mesh (deep teal, widest)
        (46, 31, 4, "g", "c", "G"),   # MID  — medium mesh
        (50, 38, 3, "c", "h", "G"),   # FOOT — finest mesh (bright teal, smallest)
    ]
    # vibration GHOST: a c/h offset ghost on the TOP tray's back rim (the shaker action)
    c.set(trays[0][0] - trays[0][2] - 1, trays[0][1], "c")
    c.set(trays[0][0] - trays[0][2] - 1, trays[0][1] - 1, "h")

    lips = []
    for (cx, cy, hw, fill, hi, lo) in trays:
        lip = _iso_tray(c, cx, cy, hw, fill, hi, lo)
        lips.append((cx, cy, hw, lip))

    # CASCADING SOIL — a few grains spilling off each tray's LOWER (front) lip down
    # toward the next tray, getting finer & PALER as they fall: r/D coarse at the top
    # -> M -> o/O fine at the foot, bridging each dark gap so the steps read as ONE
    # working screen-stack.
    casc = [
        (lips[0][3][0], lips[0][3][1] + 1,     "r"),   # off top tray (coarse) into gap 1
        (lips[0][3][0] + 1, lips[0][3][1] + 2, "D"),
        (lips[1][3][0], lips[1][3][1] + 1,     "M"),   # off mid tray into gap 2
        (lips[1][3][0] + 1, lips[1][3][1] + 2, "o"),
        (lips[2][3][0], lips[2][3][1] + 1,     "o"),   # off foot tray (fine) into bins
        (lips[2][3][0] + 1, lips[2][3][1] + 2, "O"),
    ]
    for gx, gy, gc in casc:
        c.set(gx, gy, gc)

    # COMPOSITION BINS — a clean row of 4 small K-framed glowing bins seated below the
    # finest sieve foot: sand r -> silt o -> clay M -> organic g, a W label tick over
    # each (the identification readout). Anchored under the staircase foot, ON the roof.
    bins = [("r", "o"), ("o", "O"), ("M", "L"), ("g", "c")]
    binx0 = 40
    biny = 42
    for i, (fill, hi) in enumerate(bins):
        bxL = binx0 + i * 3
        for yy in range(biny, biny + 2):
            for xx in range(bxL, bxL + 2):
                c.set(xx, yy, fill)
        for xx in range(bxL - 1, bxL + 3):
            c.set(xx, biny - 1, "K")
            c.set(xx, biny + 2, "K")
        for yy in range(biny - 1, biny + 3):
            c.set(bxL - 1, yy, "K")
            c.set(bxL + 2, yy, "K")
        c.set(bxL, biny, hi)              # bright glow top
        c.set(bxL, biny - 2, "W")         # W label tick (identification)


# ── 5. TEAL PIE-DIAL — mineral-teal mix readout on the hall front ─────────────
def pie_dial(c, hall):
    """A small g/G/c mineral-teal PIE-DIAL on the LIT-LEFT hall front showing the
    soil-mix fractions, one wedge lit O/h as the dominant fraction. A clean teal
    sensor read tying the signature to the front face."""
    # seat the dial on the LIT-LEFT front face, low and toward the front corner so
    # it reads clearly against the M wall (clear of the bench window above).
    p = hall.left_pt(0.82, 5.4)
    px, py = int(round(p[0])), int(round(p[1]))
    # an 8-wide teal PIE-DIAL: K rim ring, g/G mix wedges, one O/h dominant wedge,
    # a small h needle pip at centre.
    dial = [
        "..KKKK..",
        ".KGGgcK.",
        "KGgOOhcK",
        "KGgOOOgK",
        "KGgghggK",
        ".KGggGK.",
        "..KKKK..",
    ]
    _stamp(c, px - 3, py - 3, dial)
    c.set(px, py, "h")        # needle pip
    c.set(px + 1, py - 1, "O")


# ── 6. LEFT HERO OPENING — lab door + bench window on the LIT-LEFT face ────────
def left_opening(c, hall):
    """The assigned LEFT opening: a K-framed lab DOOR + a wide bench WINDOW on the
    LIT-LEFT face, c glass with an h glint, an o 'SOILS' placard over the door, and
    composition bins faintly visible (warm o) inside the bench window."""
    pt = hall.left_pt

    # --- wide bench WINDOW (left of the door) — c glass, K frame, h reflection ---
    wu0, wu1, wv0, wv1 = 0.12, 0.50, 2.6, hall.h - 1.6
    c.fill_poly([pt(wu0, wv0), pt(wu1, wv0), pt(wu1, wv1), pt(wu0, wv1)], "c")
    # warm composition-bin glow faintly visible behind the glass (lower band)
    c.fill_poly([pt(wu0 + 0.04, wv1 - 2.0), pt(wu1 - 0.04, wv1 - 2.0),
                 pt(wu1 - 0.04, wv1 - 0.4), pt(wu0 + 0.04, wv1 - 0.4)], "o")
    c.line(pt(wu0 + 0.04, wv1 - 0.7), pt(wu1 - 0.04, wv1 - 0.7), "O")   # bin glow sill
    c.line(pt(wu0, wv0), pt(wu1, wv0), "h")                             # top glint
    c.line(pt(wu0 + 0.10, wv0 + 0.8), pt(wu0 + 0.10, wv1 - 1.2), "h")   # reflection streak
    c.line(pt(wu0, wv1), pt(wu1, wv1), "G")                             # shaded sill
    # K frame + a couple of mullions
    for a, b in [(pt(wu0, wv0), pt(wu1, wv0)), (pt(wu0, wv1), pt(wu1, wv1)),
                 (pt(wu0, wv0), pt(wu0, wv1)), (pt(wu1, wv0), pt(wu1, wv1))]:
        c.line(a, b, "K")
    for um in (0.245, 0.37):
        c.line(pt(um, wv0), pt(um, wv1), "K")

    # --- lab DOOR (right of the window) — K frame, M leaf, o handle ---
    du0, du1, dv0, dv1 = 0.60, 0.80, 3.0, hall.h - 0.3
    c.fill_poly([pt(du0, dv0), pt(du1, dv0), pt(du1, dv1), pt(du0, dv1)], "M")
    c.fill_poly([pt(du0 + 0.03, dv0 + 0.6), pt(du1 - 0.03, dv0 + 0.6),
                 pt(du1 - 0.03, dv1 - 0.2), pt(du0 + 0.03, dv1 - 0.2)], "D")  # recessed leaf
    c.line(pt(du0 + 0.5, dv0 + 0.8), pt(du0 + 0.5, dv1 - 0.4), "d")           # leaf seam
    for a, b in [(pt(du0, dv0), pt(du1, dv0)), (pt(du0, dv1), pt(du1, dv1)),
                 (pt(du0, dv0), pt(du0, dv1)), (pt(du1, dv0), pt(du1, dv1))]:
        c.line(a, b, "K")
    hp = pt(du1 - 0.05, (dv0 + dv1) / 2)
    c.set(int(round(hp[0])), int(round(hp[1])), "o")                          # o handle

    # --- o "SOILS" placard over the door (a warm sign band) ---
    s0 = pt(0.58, 1.8)
    sx, sy = int(round(s0[0])), int(round(s0[1]))
    for k in range(6):
        c.set(sx + k, sy, "o")
        c.set(sx + k, sy + 1, "r")
    c.set(sx - 1, sy, "K"); c.set(sx + 6, sy, "K")
    c.set(sx + 1, sy, "O"); c.set(sx + 3, sy, "O")   # tiny lettering glints


# ── 7. SOIL-PIT + AUGER — exposed open pit at the front-right hall base ────────
def soil_pit(c, hall):
    """An exposed open SOIL-PIT at ground level off the front-RIGHT of the hall:
    a K-rimmed rectangular hole showing 4 stacked soil-horizon bands (d topsoil /
    D / r subsoil / M parent), with a small D/M hand-AUGER rig leaning over it
    (a thin K auger flight). TerraBase layered-strata + weatherproof-instrument
    motif at the shaded side base."""
    # pit footprint: on the GROUND at the front-RIGHT, below the shaded-right face
    px0, py0 = 41, 46
    pw, ph = 12, 7

    # K rim of the pit (the dug edge)
    for xx in range(px0 - 1, px0 + pw + 1):
        c.set(xx, py0 - 1, "K")
        c.set(xx, py0 + ph, "K")
    for yy in range(py0 - 1, py0 + ph + 1):
        c.set(px0 - 1, yy, "K")
        c.set(px0 + pw, yy, "K")

    # stacked soil-HORIZON bands (top->down): d topsoil / D / r subsoil / M parent.
    # Each band gets a thin K seam below it so the 4 horizons read as DISTINCT strata
    # layers (not one muddy bin). Bands alternate value strongly for separation.
    horizons = [("d", 1), ("D", 1), ("r", 2), ("M", 1)]
    yy = py0
    for hi, (fill, th) in enumerate(horizons):
        for k in range(th):
            for xx in range(px0, px0 + pw):
                c.set(xx, yy, fill)
            yy += 1
        # K seam between horizons (skip after the last)
        if hi < len(horizons) - 1 and yy < py0 + ph:
            for xx in range(px0, px0 + pw):
                c.set(xx, yy, "K")
            yy += 1
    # a few grain flecks so each band reads as loose earth, not flat paint
    for (fx, fy, fc) in [(px0 + 8, py0, "D"), (px0 + 3, py0 + 2, "r"),
                         (px0 + 10, py0 + 4, "o"), (px0 + 5, py0 + 5, "D")]:
        c.set(fx, fy, fc)

    # SCREW-AUGER — a bold hand-auger standing AT THE PIT'S RIGHT RIM, rising up its own
    # CLEAR LANE to the right of everything else so it reads on its own. Built to read
    # UNMISTAKABLY as a twist drill, NOT a pole: a fat conical cutting HEAD biting the
    # soil, a 3px-wide K-edged shaft, and a bold continuous HELICAL FLIGHT drawn as
    # wedge-shaped threads (a wide bright `L` crest tapering to a dark `d` root) that
    # alternate side-to-side every 2 rows so the eye reads a spiral winding down the
    # shaft. Capped by a clear M/L T-HANDLE silhouetted on the sky.
    ax = px0 + pw + 2                 # axis sits in the clear lane past the pit's right rim
    shaft_top = py0 - 11             # rises 11px above the rim into open sky (clears the bins)

    # CONICAL cutting HEAD — a fat point chewing into the pit's near-right corner.
    c.set(ax, py0 + 2, "K")
    c.set(ax - 1, py0 + 1, "K"); c.set(ax, py0 + 1, "d"); c.set(ax + 1, py0 + 1, "K")
    c.set(ax - 1, py0, "D"); c.set(ax, py0, "M"); c.set(ax + 1, py0, "D")
    c.set(ax - 2, py0, "r"); c.set(ax + 2, py0 + 1, "r")     # spoil kicked up at the bite

    # 3px K-edged SHAFT core (so the helix has a solid body to wind around).
    for sy in range(shaft_top, py0):
        c.set(ax - 1, sy, "K")       # left edge
        c.set(ax,     sy, "d")       # shaded core (so the bright threads read over it)
        c.set(ax + 1, sy, "K")       # right edge

    # HELICAL FLIGHT — bold screw threads winding round the shaft. A bright `M`/`L`
    # thread crest sits ON the shaft and its column SWEEPS left<->right every row in a
    # tight cycle, so consecutive bright pixels trace a clear zig-zag spiral down the
    # shaft (the unmistakable screw-thread cue) instead of a static vertical stripe.
    sweep = [-1, 0, 1, 0]
    for i, sy in enumerate(range(shaft_top + 1, py0)):
        cx_t = ax + sweep[i % 4]
        c.set(cx_t, sy, "L")                       # bright thread crest
        c.set(ax - sweep[i % 4], sy, "d")          # opposite-side dark thread root
    c.set(ax + 2, shaft_top + 3, "c")              # tiny vibration ghost (shaker tie-in)

    # T-HANDLE crossbar + grip on top (the hand-auger handle, silhouetted on the sky).
    hy = shaft_top - 1
    c.set(ax - 3, hy, "K"); c.set(ax - 2, hy, "M"); c.set(ax - 1, hy, "L")
    c.set(ax, hy, "L"); c.set(ax + 1, hy, "M"); c.set(ax + 2, hy, "D"); c.set(ax + 3, hy, "K")
    c.set(ax, hy - 1, "K")                                    # central hub of the T
    c.set(ax - 1, hy - 1, "M"); c.set(ax + 1, hy - 1, "D")    # grip knobs


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS grow-shed /
# vertical-farming / soil-spectrum structure onto the prior form — never restarts,
# never recolors the whole building. Theme: the soil-analysis grow-shed matures into
# a fully built-out, instrumented sample-farm. Colours mature stage by stage; gold
# (q) is a t5 flourish only. Every add is anchored to a base part (the soil-pit "tray
# bed" / the LIT-LEFT side / the roof) and clamped on-canvas, and NONE collide with
# the back-right sieve-shaker staircase + composition-bins signature, the centre
# clerestory monitor, or the front-right auger.
#
#   t2  small functional add : extra soil-MOISTURE PROBE SPIKES + a pH FLAG-MARKER bedded
#                              in the soil-pit tray rows (front-right bed, LEFT of the auger)
#   t3  structural add        : a slanted-glass COLD-FRAME / PROPAGATION ANNEX off the LIT-LEFT
#   t4  major add             : a rooftop HYDROPONIC A-RACK TOWER of glowing nutrient-tray
#                              shelves + feeder manifold, rising from the back-LEFT roof
#   t5  crowning feature      : the pit "tray bed" becomes a glowing NUTRIENT-GRID / ROOT-
#                              NETWORK canopy (E grid + pulsing e root nodes + E bloom) +
#                              GOLD bed rails + a gold seed-vault medallion
# ═══════════════════════════════════════════════════════════════════════════════

# Soil-pit geometry shared by t2 and t5 so the bed additions/overlay recompute from
# the SAME source as soil_pit() (never a hardcoded second guess).
PIT_X0, PIT_Y0, PIT_W, PIT_H = 41, 46, 12, 7


def stage2_probes(c, hall):
    """t2 — SMALL FUNCTIONAL ADD: a planted survey cluster of soil-MOISTURE PROBE
    SPIKES + a pH FLAG-MARKER bedded into the soil-pit, driven UP so they break the
    silhouette (round-2 fix). The pit is dug into the FRONT face of the tall shaded
    wall, so straight-up clears no canvas; instead the markers stand at the pit's
    near (front) rim and rise so their tops poke into the OPEN AIR in FRONT of /
    BELOW the pit floor and out past its right-front corner — adding real new alpha
    that reads at 64px, not buried flecks.

    Two slim K probe staffs are bedded in the bed and rise PROUD of it: their lit
    edge + a bright c/h moisture sensor head + a 1px cast on the dark wall make them
    read as raised instruments standing off the wall. A taller ochre pH PENNANT flies
    on a staff at the pit's near-right corner, its flag clearing into bare canvas to
    the lower-right of the pit so the marker silhouettes unmistakably. On-theme,
    modest: base palette + one brightened c tray glow (the evolved accent enters at
    t3). All px clamp on-canvas and stay clear of the hand-auger lane (ax≈54) and the
    composition bins above."""
    px0, py0, pw, ph = PIT_X0, PIT_Y0, PIT_W, PIT_H
    pit_bot = py0 + ph                              # near (front) rim row of the pit (y53)

    # The pit is dug into the FRONT of the tall shaded wall, so the area straight ABOVE
    # the pit is opaque wall/bins/auger (no bare canvas), while the BARE FRONT LIP just
    # past the near rim (y54+) is wide open. Round-2 fix → split the read so it both
    # LOOKS right and breaks the silhouette: (a) two UPRIGHT moisture probes stand
    # PROUD on the dark wall with bright sensor heads + a cast shadow (the reviewer's
    # described instrument read), and (b) a planted pH PENNANT + a couple of survey
    # DEPTH-STAKES toed onto the bare front lip supply the new silhouette px at 64px.

    # --- two UPRIGHT MOISTURE PROBE SPIKES bedded in the back rows, rising PROUD of
    #     the back rim (y45) so their bright c/h heads silhouette on the dark wall. A
    #     1px d cast shadow behind each reads it as a raised instrument, not a fleck. ---
    spikes = [(px0 + 3, py0 + 2, 8), (px0 + 6, py0 + 3, 8)]   # (foot_x, foot_y, height)
    tips = []
    for sx, sy, hgt in spikes:
        top = sy - hgt                             # sensor head a few px above the back rim
        c.line((sx, sy), (sx, top), "K")           # slim K probe staff rising out of the bed
        c.line((sx + 1, sy - 1), (sx + 1, top + 1), "d")  # 1px cast shadow on the wall behind
        c.set(sx, top, "c")                        # bright c moisture-sensor head
        c.set(sx - 1, top, "c")                    # 2px-wide sensor head so it reads at 64px
        c.set(sx, top - 1, "h")                    # bright h glint crowning the tip
        tips.append((sx, top))
    c.line(tips[0], tips[1], "c")                  # thin c sensor lead between the heads (harness)
    # a brightened c tray glow pooled on the bed under the probes (the live sensor read)
    for gx, gy in [(px0 + 3, py0 + 4), (px0 + 4, py0 + 5), (px0 + 6, py0 + 5)]:
        c.set(gx, gy, "c")

    # --- a tall pH FLAG-MARKER staff planted in the bed and rising PROUD of the back
    #     rim alongside the probes — its ochre pennant flies on the dark wall (clear of
    #     the rim) so the marker reads instantly as a planted survey/pH flag, matching
    #     the probe read instead of dribbling below the pit. ---
    fx = px0 + 9                                   # right side of the bed (x50), left of auger
    c.line((fx, py0 + 3), (fx, py0 - 5), "K")      # tall K staff rising above the back rim
    c.line((fx + 1, py0 + 2), (fx + 1, py0 - 4), "d")   # 1px cast shadow on the wall behind
    _stamp(c, fx + 1, py0 - 5, ["oO", "oo", "o."])  # ochre pH pennant flying on the dark wall
    c.set(fx, py0 - 5, "o")                        # flag root glint

    # --- a clean field SAMPLE CADDY set on the bare front lip at the pit's foot,
    #     pulled UP snug against the near rim (its back rail ON the rim row) so it reads
    #     as resting at the pit edge, NOT floating below. A small K-framed tray of two
    #     capped collection tubes (the cores just lifted from the bed) — a deliberate
    #     on-theme object that supplies the new silhouette px, fully on bare canvas. ---
    cx0 = px0 + 5                                  # caddy centred under the bed
    _stamp(c, cx0, pit_bot, [
        "KKKKK",        # caddy back rail (sits ON the near rim row, grounding it)
        "KoKcK",        # two capped tubes (o ochre cap, c teal core) in the tray
        "KMMMK",        # tray body (lit)
        "KKKKK",        # tray base
    ])
    c.set(cx0 + 1, pit_bot, "O")                   # bright glint on the ochre tube cap
    c.set(cx0 + 3, pit_bot, "h")                   # bright glint on the teal core tube
    c.set(cx0 - 1, pit_bot + 3, "d")               # tiny contact shadow grounding the caddy
    c.set(cx0 + 5, pit_bot + 3, "d")


def stage3_coldframe(c, hall):
    """t3 — STRUCTURAL ADD: a slanted-glass COLD-FRAME / PROPAGATION ANNEX stepped
    off the LIT-LEFT (open) side of the hall — a low b-framed lean-to box with a
    repeated sloped GLAZE of c panes over a g interior grow-glow, extending the
    grow-shed sideways toward the viewer-left. A real new structural mass (a slanted
    glass roof plane + a glazed front wall + b corner frame + g interior glow), not a
    prop. Introduces the deepened basalt tone `b` for the annex frame. Seated forward
    of the hall's lit face (x≈3..15) so it abuts the building, sits on the ground, and
    stays fully on-canvas, clear of the front-left hero window above it."""
    # The cold-frame is a small Box abutting the front-LEFT of the hall, its back-right
    # tucked under the hall's lit-front corner so it reads as bolted on. LOW + short.
    # top corner placed out to the viewer-left & down so its mass sits in front of the
    # lit face base (hall lit-face base runs to w_left=(11,39)).
    cf = Box(top=(13, 35), wx=3, wy=4, h=5)
    # --- b basalt frame box (deep matured structure tone), shaded so glass pops ---
    cf.draw(c, roof="b", lwall="b", rwall="d", roof_hi="D", outline="K")
    # --- glazed LIT-LEFT front wall: a c grow-glass panel with a g interior glow and
    #     a bright h top glint (the propagation light inside) ---
    cf.window(c, "left", 0.14, 0.86, 1.2, cf.h - 0.7, glass="c", hi="h", shade="G", mullions=2)
    # warm-cool g interior grow-glow banked low behind the glass (seedlings under light)
    c.fill_poly([cf.left_pt(0.2, cf.h - 1.8), cf.left_pt(0.8, cf.h - 1.8),
                 cf.left_pt(0.8, cf.h - 0.6), cf.left_pt(0.2, cf.h - 0.6)], "g")
    # --- the SLANTED GLASS COLD-FRAME LID over the roof: a low single-slope sash of
    #     repeated c glaze panes in a b frame, sloping down toward the viewer-front so
    #     it clearly reads as a propagation cold-frame, not just a flat-roofed box. ---
    # author the slanted lid directly in screen space off the annex roof diamond.
    rl = cf.r_left
    rf = cf.r_front
    rt = cf.r_top
    rr = cf.r_right
    inA = (int(round(rt[0])), int(round(rt[1])))       # high back edge (against hall)
    inB = (int(round(rr[0])), int(round(rr[1])))
    outA = (int(round(rl[0])), int(round(rl[1])) + 1)  # low front edge (toward viewer), dropped 1px (slope)
    outB = (int(round(rf[0])), int(round(rf[1])) + 1)
    # b under-frame of the slanted lid first, then the c glaze on top
    c.fill_poly([inA, inB, outB, outA], "b")
    c.fill_poly([(inA[0], inA[1] - 1), (inB[0], inB[1] - 1),
                 (outB[0], outB[1] - 1), (outA[0], outA[1] - 1)], "c")
    # repeated GLAZE MULLIONS dividing the sloped sash into panes (b frame bars)
    for t in (0.28, 0.52, 0.76):
        a = (inA[0] + t * (inB[0] - inA[0]), inA[1] - 1 + t * (inB[1] - inA[1]))
        b = (outA[0] + t * (outB[0] - outA[0]), outA[1] - 1 + t * (outB[1] - outA[1]))
        c.line(a, b, "b")
    # a bright h glaze glint on the lit back pane + K outline of the whole sash
    c.line((inA[0], inA[1] - 1), (outA[0], outA[1] - 1), "h")
    for a, b in [((inA[0], inA[1] - 1), (inB[0], inB[1] - 1)),
                 ((inB[0], inB[1] - 1), (outB[0], outB[1] - 1)),
                 ((outB[0], outB[1] - 1), (outA[0], outA[1] - 1)),
                 ((outA[0], outA[1] - 1), (inA[0], inA[1] - 1))]:
        c.line(a, b, "K")


def _hydro_geom(hall):
    """Shared hydroponic-tower geometry so t5's gold accent (if any) and t4 both
    recompute the A-rack apex/base from the SAME source. The tower rises from a plinth
    on the BACK-LEFT roof quadrant, seated clearly LEFT of the centre clerestory
    monitor (mon left edge ≈ x27) and well clear of the back-right sieve-shaker, so
    neither base feature is occluded. The apex leans a touch RIGHT (toward x33) so the
    crown still reads as centred over the shed while the foot stays left. Returns
    (foot_x, base_y, apex_x, apex_y, shelf_ys)."""
    # plinth foot on the back-LEFT roof quadrant. Seat the foot in screen space LEFT of
    # the clerestory monitor (mon left edge ≈ x27) so the rack's base trunk clears the
    # lantern glazing; anchor its y on the back-left roof plane via roof_pt so it still
    # sits ON the roof, not floating.
    bp = hall.roof_pt(0.18, 0.74)
    base_y = int(round(bp[1]))                   # ≈ 24: back-left roof plane height
    foot_x = 26                                  # left of the monitor's left edge (x27)
    apex_x = foot_x + 5                          # apex leans right so the crown reads centred over the shed
    apex_y = 3                                   # tall narrow A-frame crown high in open sky
    # four nutrient-tray shelf rows climbing the A-rack (screen y, top→bottom)
    shelf_ys = [base_y - 4, base_y - 9, base_y - 14, base_y - 19]
    return foot_x, base_y, apex_x, apex_y, shelf_ys


def stage4_hydro_tower(c, hall):
    """t4 — MAJOR ADD: a rooftop HYDROPONIC A-RACK TOWER of glowing nutrient-tray
    shelves rising over the bed — a tapered b A-frame straddling a plinth on the
    BACK-LEFT roof, carrying a stack of 4 glowing `e` nutrient TRAY-SHELVES that
    narrow toward the top, fed by a vertical FEEDER MANIFOLD pipe with drip tees at
    each shelf. The prominent new vertical mass: 'this shed now farms samples
    vertically'. Palette matures: deep basalt `b` A-frame + energized nutrient-teal
    `e/E` glow on the trays. Its upper half rises CLEAR above the roof ridge into the
    open canvas (apex y≈3), and it stands LEFT of centre so it never occludes the
    back-right sieve-shaker signature, the centre clerestory monitor, or the auger."""
    foot_x, base_y, apex_x, apex_y, shelf_ys = _hydro_geom(hall)
    H = base_y - apex_y
    foot_hw = 6                                   # A-frame base half-width on the roof
    crown_hw = 2                                  # narrow crown half-width at the apex

    # short K/b plinth seating the A-rack on the roof (so it sits ON the roof, anchored)
    _stamp(c, foot_x - 2, base_y - 1, [
        "KbbbK",
        "KDDDK",
    ])

    def hw_at(t):                                 # half-width at height fraction t (0 crown..1 foot)
        return crown_hw + (foot_hw - crown_hw) * t

    def axis_x(t):                                # rack centreline at height fraction t
        return apex_x + (foot_x - apex_x) * t     # leans from apex (top) to foot (bottom)

    # two TAPERED A-frame legs (basalt b, lit D left edge) splaying from crown to feet
    for side in (-1, +1):
        foot = (foot_x + side * foot_hw, base_y)
        crown = (apex_x + side * crown_hw, apex_y)
        c.line(crown, foot, "b")
        c.line((crown[0] - (1 if side < 0 else -1), crown[1] + 1),
               (foot[0] - (1 if side < 0 else -1), foot[1] - 1),
               "D" if side < 0 else "b")
        c.set(foot[0], foot[1], "K")              # foot plate on the roof

    # the 4 glowing nutrient TRAY-SHELVES (e fill, E lit front lip, K rim) climbing the
    # rack, each as wide as the A-frame at that height so the trays nest in the legs.
    for i, sy in enumerate(shelf_ys):
        t = (sy - apex_y) / H                     # height fraction at this shelf
        hw = int(round(hw_at(t)))
        cx = int(round(axis_x(t)))                # shelf centre follows the leaning axis
        lxl, lxr = cx - hw, cx + hw
        c.line((lxl, sy), (lxr, sy), "e")         # glowing nutrient tray bed
        c.line((lxl, sy + 1), (lxr, sy + 1), "G") # shaded tray underside
        c.set(lxl, sy, "E"); c.set(lxr, sy, "E")  # bright tray ends catch the light
        c.set(cx, sy, "E")                        # bright nutrient glow at tray centre

    # vertical FEEDER MANIFOLD pipe rising up the rack centreline with drip TEES at
    # shelves — follows the leaning axis so it threads the trays.
    for yy in range(apex_y + 1, base_y):
        t = (yy - apex_y) / H
        ax = int(round(axis_x(t)))
        c.set(ax, yy, "b")                        # manifold riser (basalt)
        c.set(ax + 1, yy, "D")                    # shaded pipe edge
    for sy in shelf_ys:
        t = (sy - apex_y) / H
        c.set(int(round(axis_x(t))) - 1, sy, "e") # drip tee feeding each tray (glow)
    # a small E nutrient-tank header at the crown feeding the manifold
    _stamp(c, apex_x - 1, apex_y, [
        "EeE",
        "GeG",
    ])
    c.set(apex_x, apex_y - 1, "E")                # bright tank crown glint


def stage5_root_canopy(c, hall):
    """t5 — CROWNING FEATURE = FULLY EVOLVED sample-farm. The soil-pit "tray bed"
    lights up into a glowing NUTRIENT-GRID / ROOT-NETWORK CANOPY: the dug horizons are
    overlaid with a bright `E` lattice grid, pulsing `e` ROOT NODES branch through it,
    and a bright `E` analysis BLOOM blossoms at the bed centre — the soil sample now
    reads as a living, fully-analysed root network. The bed is then dressed out with
    GOLD premium trim: gold `q` BED RAILS capping the pit rim and a gold SEED-VAULT
    MEDALLION set on the front rail. Reads as an elite, fully-instrumented soil farm,
    still clearly the same soil-analysis lab (the pit, hall, sieve-shaker all intact).
    Recomputes the pit footprint from the SHARED PIT_* source (never a 2nd guess)."""
    px0, py0, pw, ph = PIT_X0, PIT_Y0, PIT_W, PIT_H

    # --- glowing NUTRIENT-GRID lattice overlaid on the dug bed (a translucent data
    #     grid woven across the horizons) — sparse bright E lines so the strata still
    #     read beneath, not a solid repaint. ---
    for gx in range(px0 + 1, px0 + pw, 3):        # vertical grid lines
        for gy in range(py0, py0 + ph):
            if (gx + gy) % 2 == 0:                # dotted so it reads as a lattice
                c.set(gx, gy, "E")
    for gy in range(py0 + 1, py0 + ph, 3):        # horizontal grid lines
        for gx in range(px0, px0 + pw):
            if (gx + gy) % 2 == 0:
                c.set(gx, gy, "e")

    # --- pulsing e ROOT NODES branching through the bed (the root network) ---
    roots = [(px0 + 2, py0 + 1), (px0 + 5, py0 + 3), (px0 + 8, py0 + 2),
             (px0 + 4, py0 + 5), (px0 + 9, py0 + 5), (px0 + 7, py0 + 4)]
    for i in range(len(roots) - 1):               # thin e tendrils linking the nodes
        c.line(roots[i], roots[i + 1], "e")
    for (rx, ry) in roots:
        c.set(rx, ry, "E")                        # bright pulsing root node

    # --- bright E analysis BLOOM at the bed centre (the maxed-out read) ---
    bcx, bcy = px0 + pw // 2, py0 + ph // 2
    _stamp(c, bcx - 1, bcy - 1, [
        ".E.",
        "EWE",
        ".E.",
    ])
    for a in range(0, 360, 45):                   # a faint e bloom halo around the centre
        x = bcx + 2 * math.cos(math.radians(a))
        y = bcy + 1 * math.sin(math.radians(a))
        c.set(x, y, "e")

    # --- GOLD premium BED RAILS capping the pit rim (t5 flourish only) ----------
    # clean gold rails REPLACING the K dug-rim on the two FRONT (viewer) edges of the
    # pit so the bed reads as a premium framed planter — drawn exactly ON the rim
    # (the bed's own edge, not below the footprint), so the gold stays anchored.
    for xx in range(px0 - 1, px0 + pw + 1):       # front-left rail = pit's bottom rim edge
        c.set(xx, py0 + ph, "q")
    for yy in range(py0 - 1, py0 + ph + 1):       # front-right rail = pit's right rim edge
        c.set(px0 + pw, yy, "q")
    # bright O gold glints at the two near corners of the rail
    c.set(px0 - 1, py0 + ph, "O")
    c.set(px0 + pw, py0 + ph, "O")
    # short gold corner POSTS standing just inside the two front rail corners
    c.set(px0, py0 + ph - 1, "q")
    c.set(px0 + pw - 1, py0 + ph - 1, "q")

    # --- gold SEED-VAULT MEDALLION inset ON the bed's front-right (elite emblem),
    #     seated inside the rail so it reads as mounted on the planter, NOT floating
    #     below the footprint. ---
    mcx, mcy = px0 + pw - 2, py0 + ph - 2
    _stamp(c, mcx - 1, mcy - 1, [
        "qOq",
        "OEO",
        "qOq",
    ])
    c.set(mcx, mcy, "E")                           # the vault seed-core glints teal

    # --- NEW CROWNING MASS (round-2 fix): a gold-capped sample-vault ASSAY OBELISK
    #     standing on the pit's near rim. The pit is dug into the front of the tall
    #     wall, so a vertical spire would only overlay it; instead the obelisk is
    #     planted at the pit's NEAR-RIGHT corner and leans UP-AND-RIGHT so its gold
    #     capstone + E assay core crest PAST the wall's stepped right shoulder into
    #     BARE canvas — a real new silhouette beyond t4 that reads at 64px. It rises
    #     in the clear lane right of the composition bins and below the auger handle,
    #     occluding neither. Recomputed from the SHARED PIT_* source. ---
    _assay_obelisk(c, px0, py0, pw, ph)


def _assay_obelisk(c, px0, py0, pw, ph):
    """The t5 crowning mass: a tapered, gold-capped assay/sample-vault obelisk on the
    pit's near rim, leaning up-right so its crown breaks the silhouette into bare
    canvas past the wall's right shoulder. Drawn as a clear 3-D shaft (lit `M` left
    face, shaded `d` right face, hard `K` outline) on a small basalt `b` plinth, with
    a premium gold `q`/`O` capstone and a bright `E` assay core that reads as elite."""
    foot_x = px0 + pw                              # near-right rim corner column (x52)
    foot_y = py0 + ph - 1                          # seated on the pit's near rim (y52)
    H = 9                                          # spire height
    lean = 0.55                                    # px of rightward lean per row up (clears the wall edge)

    def col_at(j):                                 # shaft centre column j rows above the foot
        return foot_x + int(round(j * lean))

    # small basalt plinth seating the obelisk on the rim (anchors it — no detached blob)
    c.set(foot_x - 1, foot_y, "b"); c.set(foot_x, foot_y, "b"); c.set(foot_x + 1, foot_y, "b")
    c.set(foot_x - 1, foot_y, "K")                 # plinth left/right edge ticks
    c.set(foot_x + 1, foot_y, "K")

    # the tapered shaft: a 3-wide base narrowing to 1-wide near the crown, lit-left /
    # shaded-right with a K outline, each row stepped right by the lean.
    for j in range(1, H):
        cx = col_at(j)
        top_y = foot_y - j
        wide = j < H - 3                           # lower shaft is 3px wide, upper tapers to 2/1
        c.set(cx, top_y, "M")                      # lit shaft core
        c.set(cx - 1, top_y, "K")                  # K left outline
        if wide:
            c.set(cx + 1, top_y, "d")              # shaded right face on the lower shaft
            c.set(cx + 2, top_y, "K")              # K right outline
        else:
            c.set(cx + 1, top_y, "K")              # narrow crown right outline

    # gold CAPSTONE + bright E assay core crowning the spire (t5 gold flourish only),
    # sitting on bare canvas past the wall shoulder so it reads as the new elite peak.
    top_y = foot_y - H
    cx = col_at(H)
    c.set(cx, top_y + 1, "q")                      # gold cap shoulders
    c.set(cx - 1, top_y + 1, "q")
    c.set(cx + 1, top_y + 1, "O")
    c.set(cx, top_y, "O")                          # bright gold capstone peak
    c.set(cx, top_y - 1, "E")                      # the assay core glints bright above the cap
    c.set(cx - 1, top_y, "q")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the soil-analysis lab at upgrade `stage` (1..5). Stage 1 is IDENTICAL
    to the shipped base PNG; each higher stage keeps every prior addition and bolts
    on the next (t2 probes → t3 cold-frame annex → t4 hydroponic tower → t5 root
    canopy + gold). Painter's order keeps rooftop/overhead additions above the masses
    they grow from; the back-right sieve-shaker signature is drawn as part of the base
    and the upgrade adds are placed to never occlude it."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    contact_shadow(c)        # grounded shadow under the wide footprint
    hall = main_hall(c, HALL)        # wide low field hall (back mass)
    clerestory(c, MON)               # raised glazed monitor lantern on the roof
    sieve_shaker(c, hall)            # SIGNATURE: stepped sieve-shaker + cascade + bins
    pie_dial(c, hall)                # mineral-teal pie-dial mix readout (front)
    left_opening(c, hall)            # LEFT hero: door + bench window + SOILS placard
    soil_pit(c, hall)                # exposed soil-pit + hand-auger (front-right)

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    # t3 cold-frame is drawn here (front-left) so it sits in front of the hall's lit
    # face; t4 hydro tower is a rooftop add rising over the back-left roof; t5 overlays
    # the pit bed + gold. None collide with the back-right sieve-shaker signature.
    if stage >= 2:
        stage2_probes(c, hall)
    if stage >= 3:
        stage3_coldframe(c, hall)
    if stage >= 4:
        stage4_hydro_tower(c, hall)
    if stage >= 5:
        stage5_root_canopy(c, hall)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/terrabase"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "soil-analysis-lab"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped soil-analysis-lab.png, so it does NOT overwrite the
    base PNG."""
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
