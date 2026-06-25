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
"""
import os
import sys
import json

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box, cylinder  # noqa: F401  (cylinder available if needed)

TERRA = {"K": "#20190f", "W": "#efe6cf", "L": "#d6c8a0", "M": "#b09a6e", "D": "#7e6c47", "d": "#54462c",
         "h": "#d6f2ea", "c": "#a4e2d4", "g": "#34b6a2", "G": "#1d8474",
         "o": "#e0a850", "O": "#ffce80", "r": "#9a5e1e"}


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


def build():
    c = Canvas()
    contact_shadow(c)        # grounded shadow under the wide footprint
    hall = main_hall(c, HALL)        # wide low field hall (back mass)
    clerestory(c, MON)               # raised glazed monitor lantern on the roof
    sieve_shaker(c, hall)            # SIGNATURE: stepped sieve-shaker + cascade + bins
    pie_dial(c, hall)                # mineral-teal pie-dial mix readout (front)
    left_opening(c, hall)            # LEFT hero: door + bench window + SOILS placard
    soil_pit(c, hall)                # exposed soil-pit + hand-auger (front-right)

    spec = {"width": 64, "height": 64, "palette": TERRA, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/terrabase_soil-analysis-lab.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
