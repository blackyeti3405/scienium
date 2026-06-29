#!/usr/bin/env python3
"""
Data Visualization Studio — MindFrame Lab economy building (BESPOKE form, STANDARD).

The MOST GLASS-FORWARD member of the set: a WIDE LOW exhibition GALLERY HALL whose
lit-LEFT face is dominated by two big `Box.window` display panes (the gallery showing
its charts through glass), topped by a slim skylight LANTERN running the roof ridge.
A broad, transparent gallery silhouette — NOT the gateway cube, distinct from the
boxy Behavioral lab, the Interview room and the Survey center.

  • Opening side = LEFT (lit): the hero is the lit-LEFT pair of BIG GLASS display
    windows (charts faintly visible through the glass) — glass-forward by design.
    The shaded-RIGHT face stays plainer (one small lit window + plain wall).
  • Signature (one-of-one): above the skylight lantern, a hovering 3D BAR-CHART
    "skyline" of glowing iso bars stands beside a sweeping LINE-GRAPH ribbon, both
    being composed onto a faint dashboard board — magenta SCATTER-DOTS stream in to
    populate it and a small color LEGEND keys the series (configuring the viz).

Composed from art/isobuild.Box — NO iso.draw_cube / base_windows.
Draw order: contact shadow + gallery hall (back) -> skylight lantern on the ridge ->
display windows on the lit-left + plainer right -> entry terrace stub (front) ->
hovering dashboard board + 3D bar-chart skyline + line-graph ribbon + scatter-dots +
color legend (above the lantern).

═══════════════════════════════════════════════════════════════════════════════════
UPGRADE-EVOLUTION pass (mindframe lab). build(stage) + cumulative stageN helpers +
emit/build_all, copied from workshop.py / interview-room.py. Stage 1 is byte-identical
to the shipped data-visualization-studio.png. Theme: the dataviz studio grows into a
fully built-out, multi-screen analytics floor — it gains the gear to RENDER more, plot
on a bigger wall, and drive a wraparound synced array. All additions grow on the RIGHT
flank / right foreground (cols 54+ are empty ground) and stay BELOW the centered
hovering dashboard signature (rows ~1-17), never occluding the lit-left glass hero.
The lab's magenta o/O stays the HUMAN/series accent; the evolved compute/data glow is
cool signal-cyan e/E. Colours mature stage by stage; gold (q) is a t5 flourish only.

  t2  small functional add : a 2nd small CHART PANEL (cyan sparkline tile) clipped
                             left of the wall + a brighter o cursor dot on the main plot
  t3  structural add       : a RENDER-RACK ANNEX on the right flank — a b-housed box of
                             glowing g GPU bays driving the visualizations (real compute)
  t4  major add            : a curved VIDEO-WALL TOWER rising on the right, raising the
                             roofline with twin glowing e dashboard panels (a big plot wall)
  t5  crowning feature     : a WRAPAROUND SYNCED ANALYTICS ARRAY — bright-E live line +
                             bar + scatter mini-charts animating in unison + a KPI node,
                             q gold master bezel on the hero screen + a gold tower finial
"""
import os
import sys
import json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

# Base MindFrame palette (shared keys) + the EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so the base PNG is unchanged).
# These exact evolved keys are reused by all 10 mindframe buildings for lab consistency:
#   b  deep indigo steel — matured structure tone for t3+ new masses
#   e  energized signal-cyan glow (mid)   E  signal-cyan glow (bright) — the t4/t5 data
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
MIND = {"K": "#181428", "W": "#e8e2f6", "L": "#cabfe6", "M": "#9f90c8", "D": "#6f5fa0", "d": "#4a3c70",
        "h": "#ecc8f4", "c": "#d0a8ee", "g": "#a45ce0", "G": "#6a2fb0",
        "o": "#f08cce", "O": "#ffb8e2", "r": "#b03a80",
        "b": "#2b2440", "e": "#7fd4ff", "E": "#d6f4ff", "q": "#f3c63a"}


def _stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings) at top-left (x0,y0).
    '.' = skip (transparent)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


# ── 1. contact shadow under the wide hall footprint (drawn FIRST) ─────────────
def hall_shadow(c, hall):
    """A soft flat K contact-shadow ellipse pooled under the whole wide footprint
    so the gallery feels grounded rather than floating."""
    scx = int(round((hall.w_left[0] + hall.w_right[0]) / 2))
    scy = int(round(hall.w_front[1])) + 2
    rx, ry = 22, 4
    for x in range(scx - rx, scx + rx + 1):
        for y in range(scy - ry, scy + ry + 1):
            ex = (x - scx) / rx
            ey = (y - scy) / ry
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")


# ── 2. the WIDE LOW GLASS GALLERY HALL body ───────────────────────────────────
# Gateway cube for scale = Box(top=(32,9), wx=11, wy=11, h=20). Ours is WIDER in
# wx, SHALLOW in wy and LOW in h => a wide low exhibition hall, not a tall cube.
HALL = Box(top=(28, 17), wx=13, wy=6, h=12)


def gallery_hall(c, b):
    """Draw the wide low hall: M lit-left wall, D shaded-right wall, L roof. A soft
    `o` magenta accent strip runs along the lit-front eave (MindFrame accent)."""
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # soft o magenta eave accent along the lit-left roof edge (gentle accent light)
    c.line(b.r_left, b.r_front, "o")
    # a faint c rooflight glint band just inboard of the eave on the roof
    c.line(b.roof_pt(0.10, 0.16), b.roof_pt(0.92, 0.16), "c")
    return b


# ── 3. SKYLIGHT LANTERN — slim raised clerestory along the roof ridge ─────────
def skylight_lantern(c, hall):
    """A slim raised Box clerestory/lantern running along the roof ridge — its
    sides carry small `Box.window` skylight strips letting light onto the studio
    floor; this lantern base is the plinth the hovering viz projects from."""
    # seat the lantern on the ridge, centered back-to-front, long along wx
    apex = (hall.r_top[0] + 4, hall.r_top[1] + 3)
    lan = Box(top=apex, wx=9, wy=2, h=5)
    lan.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # ONE clean wide skylight strip on the lit-left face of the lantern (bright
    # glass) — a single unbroken clerestory band reads cleaner than two stubby
    # panes, and keeps the lantern↔display-pane transition zone below it tidy.
    lan.window(c, "left", 0.12, 0.86, 1.4, 3.4, glass="c", hi="W", shade="G", mullions=0)
    # a couple of c rooflight glints on the lantern roof
    c.line(lan.roof_pt(0.20, 0.5), lan.roof_pt(0.80, 0.5), "h")
    return lan


# ── 4. DISPLAY WINDOWS — the hero GLASS on the lit-LEFT face + plainer right ───
def display_glass(c, hall):
    """The OPENING (LEFT): TWO large CLEAN `Box.window` display panes dominate the
    lit face — each a big unbroken sheet of GLASS with a smooth sky→sill gradient,
    one clean diagonal sheen streak, and a crisp K frame (this is the building's
    glass showpiece, so the panes must read as beautiful glass, NOT black-barred
    noise). At most ONE soft mullion each; no literal charts painted inside. The
    shaded-RIGHT face stays plainer: one small lit window + plain wall."""
    # --- two BIG clean display panes on the lit-left face (the gallery glazing) ---
    # Each window() lays a smooth top-lit gradient (h sky band → c body → G sill),
    # a single diagonal W/h sheen, and a clean K frame. NO interior mullion and NO
    # literal charts painted inside — each pane is one mostly-unbroken sheet of
    # bright glass so the sheen wins and it reads as the building's glass showpiece.
    # Bright `c` body (lighter than `g`) makes the sky→sill gradient legible.
    # left pane
    hall.window(c, "left", 0.05, 0.47, 1.8, hall.h - 1.4,
                glass="c", hi="W", shade="G", mullions=0)
    # right (center wing) pane — fills the lit face up to just under the lantern
    # eave; the lantern's single clean clerestory sits above this without flecking
    # it. Round-1 polish note #2: start its top at v0=1.8 to match the left pane so
    # its sky-band + sheen highlight sits at the SAME height (echoing the left pane
    # exactly), giving the two big panes a unified glass read.
    hall.window(c, "left", 0.52, 0.93, 1.8, hall.h - 1.4,
                glass="c", hi="W", shade="G", mullions=0)

    # --- shaded-RIGHT face: PLAINER — one small lit window glowing on the dark face ---
    # Tightened per round-1 polish note #1: a hair narrower + a softer `c` sheen (was
    # the brighter `h`) so the small lit slot stays restrained against the plain `D`
    # plane and the lit-LEFT / shaded-RIGHT front corner read stays crisp.
    hall.window(c, "right", 0.62, 0.84, 3.0, 8.0,
                glass="c", hi="c", shade="G", mullions=0)
    # a plain D wall pilaster seam on the right face (keeps it plainer/structural)
    c.line(hall.right_pt(0.28, 1.6), hall.right_pt(0.28, hall.h - 1.0), "d")


# ── 5. ENTRY TERRACE STUB — a tiny low porch off the front corner ─────────────
def entry_terrace(c, hall):
    """A tiny low Box terrace/porch off the front corner with a K-framed glass
    entry — drawn AFTER the hall so it sits in front of it."""
    apex = (hall.r_front[0] - 1, hall.r_front[1] - 1)
    porch = Box(top=apex, wx=3, wy=3, h=6)
    porch.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # K-framed glowing glass entry on the porch's lit-left face
    porch.window(c, "left", 0.18, 0.82, 1.4, 5.2, glass="g", hi="h", shade="G", mullions=0)
    # a soft o welcome glow spilling onto the ground at the door foot
    base = porch.left_pt(0.5, porch.h)
    bx, by = int(round(base[0])), int(round(base[1]))
    for dx, ch in [(-2, "r"), (-1, "o"), (0, "O"), (1, "o"), (2, "r")]:
        c.set(bx + dx, by + 1, ch)
    return porch


# ── 6. SIGNATURE — hovering dashboard: 3D bar-chart skyline + line ribbon + ────
#       scatter-dots streaming in + color legend (above the lantern)
def iso_bar(c, x, base_y, h, w, face_l, face_r, top, edge="K"):
    """A small GLOWING 3D iso bar (a tiny prism), `h` tall and `w` wide. The body
    is mostly the bright lit `face_l`; only the rightmost column is the `face_r`
    shade (so the bar reads as a luminous tower, not a dark block); a bright `top`
    lid sits on it. K outline on the silhouette only — NO black centre seam (that
    seam is what muddies thin bars). Returns the top-centre."""
    half = w // 2
    top_y = base_y - h
    for col in range(-half, half + 1):
        ch = face_r if col == half else face_l      # only the far-right col shades
        xx = x + col
        for y in range(top_y + 1, base_y):
            c.set(xx, y, ch)
    # bright top lid
    for col in range(-half, half + 1):
        c.set(x + col, top_y, top)
    # K silhouette edges only (left, right, top) — keeps the glow uninterrupted
    c.line((x - half, top_y), (x - half, base_y - 1), edge)
    c.line((x + half, top_y), (x + half, base_y - 1), edge)
    c.line((x - half, top_y - 1), (x + half, top_y - 1), edge)  # crisp K cap edge
    return (x, top_y)


def hovering_dashboard(c, lan):
    """The hero, FLOATING above the skylight lantern: a faint dashboard BOARD the
    viz is composed onto, a 3D BAR-CHART skyline of glowing iso bars STANDING on its
    baseline, a sweeping LINE-GRAPH ribbon arcing over them with node-dots, magenta
    SCATTER-DOTS streaming in, and a small color LEGEND keying the series. Lifted
    clear of the lantern so the lantern roof stays visible and the viz reads as a
    hovering hologram, not a TV on a post."""
    ax, _ = lan.apex(0)
    ax = int(round(ax))
    board_top = 3                         # high up — reserve the top headroom
    board_y = board_top + 14              # baseline the bars stand on
    bx0, bx1 = ax - 18, ax + 18
    by0, by1 = board_top, board_top + 15

    # --- the faint floating BOARD: a thin lit top rail + a few faint grid rules,
    # NOT a solid opaque slab, so it reads as a translucent hovering dashboard and
    # the bars/line glow clearly over it (and the lantern below stays visible). ---
    # ONE faint dotted grid rule high up (a single dashboard plot-grid hint) — kept
    # well above the bars so the glowing bars read against open space, not a slab.
    for x in range(bx0 + 4, bx1 - 1, 3):
        c.set(x, board_y - 11, "d")
    # lit top rail + axes
    c.line((bx0, by0), (bx1, by0), "M")          # bright top rail
    c.line((bx0, by0 + 1), (bx1, by0 + 1), "D")
    c.line((bx0 + 3, by0 + 1), (bx0 + 3, board_y), "M")   # left value axis
    c.line((bx0 + 3, board_y), (bx1 - 1, board_y), "M")   # baseline axis
    # K frame on top + sides only (open, light board — not a closed TV box)
    c.line((bx0, by0), (bx1, by0), "K")
    c.line((bx0, by0), (bx0, by1 - 4), "K")
    c.line((bx1, by0), (bx1, by1 - 4), "K")

    # --- 3D BAR-CHART SKYLINE: a row of glowing iso bars at varying heights,
    # standing on the baseline, BRIGHT so they pop off the dim board. ---
    # bright lit faces (c) + mid shaded faces (g) + bright tops (h/W) so each bar
    # GLOWS and stands distinct against the open board; spaced apart with a gap.
    bar_specs = [
        # (x_offset_from_axis, height, face_l, face_r, top)
        (0,  4,  "c", "g", "h"),
        (5,  8,  "c", "g", "W"),
        (10, 5,  "c", "g", "h"),
        (15, 10, "o", "r", "O"),   # tallest = highlighted series: warm magenta so
                                   # it pops by COLOR (not just height) + keys legend
        (20, 7,  "c", "g", "h"),
        (25, 5,  "c", "g", "h"),
    ]
    bar_w = 3
    for dx, hh, fl, fr, tp in bar_specs:
        iso_bar(c, bx0 + 6 + dx, board_y, hh, bar_w, fl, fr, tp)

    # --- sweeping LINE-GRAPH ribbon arcing over the bars, with bright node-dots ---
    ribbon = [
        (bx0 + 4,  by0 + 9),
        (bx0 + 9,  by0 + 5),
        (bx0 + 14, by0 + 8),
        (bx0 + 19, by0 + 2),
        (bx0 + 24, by0 + 5),
        (bx0 + 28, by0 + 1),
    ]
    for (xa, ya), (xb, yb) in zip(ribbon, ribbon[1:]):
        c.line((xa, ya), (xb, yb), "O")
        c.line((xa, ya + 1), (xb, yb + 1), "o")     # 2px ribbon thickness
    for (xn, yn) in ribbon:
        c.set(xn, yn, "h")                          # bright node-dot at each vertex
        c.set(xn, yn - 1, "W")

    # --- magenta SCATTER-DOTS streaming in toward the board (configuring) ---
    # Pulled IN from the canvas edge: the far dots/tails previously sat at x62–63
    # (flush to the frame); cap every dot's screen-x to <=60 so the scatter stream
    # stays inside the safe area and never clips the canvas edge.
    scatter = [
        (bx1 + 6, by0 - 3, "o"), (bx1 + 5, by0 - 1, "O"), (bx1 + 3, by0 + 2, "c"),
        (bx1 + 1, by0 + 5, "h"), (bx1 + 5, by0 + 4, "c"), (bx1 + 3, by0 + 7, "h"),
        (bx1 + 7, by0 + 1, "o"),
    ]
    for (sx, sy, ch) in scatter:
        c.set(min(sx, 60), max(sy, 1), ch)   # held inside the canvas top edge too
    # faint streak-tails on the far dots (the "streaming in" motion) — held inboard
    c.set(min(bx1 + 8, 60), max(by0 - 3, 1), "r")
    c.set(min(bx1 + 7, 60), by0 + 5, "r")

    # --- color LEGEND: a tiny K-framed swatch-stack keying the series ---
    # sits just OFF the board's lower-left, clear of the bars so it reads.
    lx, ly = bx0 - 8, board_y - 6
    _stamp(c, lx, ly, [
        "KKKKKK",
        "KoKWWK",   # series 1 swatch — keys the warm highlighted/tallest bar
        "KKKKKK",
        "KOKWWK",   # series 2 swatch (line)
        "KKKKKK",
        "KcKWWK",   # series 3 swatch (scatter)
        "KKKKKK",
    ])

    # a thin projector beam hinting the dashboard projects UP from the lantern —
    # a short dashed c/g ray from the lantern ridge toward the board (a clear GAP
    # of empty space between, so the board reads as hovering, not mounted).
    stem_x = ax
    top_lan = int(round(lan.r_top[1]))
    for y in range(by1 - 1, by1 + 4):
        if 0 <= y < 64 and c.px[y][stem_x] == ".":
            c.set(stem_x, y, "c" if y % 2 == 0 else "g")
    # a faint projector lens glint on the lantern roof the beam springs from
    c.set(stem_x, top_lan + 1, "h")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS render / screen /
# analytics structure onto the prior form — never restarts, never recolors the whole
# building. Theme: the dataviz studio grows into a fully built-out multi-screen
# ANALYTICS FLOOR. Every addition grows on the RIGHT flank / right-foreground (cols
# 54+ are empty ground) and stays BELOW the centered hovering-dashboard signature
# (rows ~1-17) and clear of the lit-left glass hero, so neither is occluded. Colours
# mature stage by stage; the evolved compute/data glow is cool signal-cyan e/E,
# distinct from the lab's magenta o/O series accent. Gold (q) only at t5.
#
#   t2  small functional add   : a 2nd CHART PANEL (cyan sparkline tile) + brighter o cursor
#   t3  structural add         : a RENDER-RACK ANNEX of glowing g GPU bays on the right flank
#   t4  major add              : a curved VIDEO-WALL TOWER with twin e panels (a big plot wall)
#   t5  crowning feature       : a WRAPAROUND SYNCED ANALYTICS ARRAY + KPI node + gold trim
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_sparkline(c):
    """t2 — SMALL FUNCTIONAL ADD: a second small CHART PANEL clipped on the LEFT beside
    the wall, just under the existing color LEGEND (cols 13-18, rows 11-16) — a tiny
    K-framed cyan SPARKLINE tile (a mini line-plot reading as a second monitored series),
    plus a brighter o/O CURSOR dot crosshair landing on the main plot's tallest
    highlighted bar. On-theme (more charts), modest, base palette + one brightened o.
    Seated on the empty left ground (cols 6-12) so it never touches the glass hero or
    the centered dashboard."""
    # --- mini SPARKLINE tile: a small K-framed dark panel with a bright c line-plot.
    # Sits left of / below the legend on the empty left ground (cols 6..12, rows 18..24).
    tx, ty = 6, 18
    _stamp(c, tx, ty, [
        "KKKKKKK",
        "KdddddK",   # dark panel body (a small screen)
        "KdddddK",
        "KdddddK",
        "KKKKKKK",
    ])
    # a tiny cyan sparkline running across the panel interior (a mini line-chart)
    spark = [(1, 2), (2, 1), (3, 2), (4, 1), (5, 3)]
    for sx, sy in spark:
        c.set(tx + sx, ty + sy, "c")
    c.set(tx + 5, ty + 3, "h")                 # bright end node
    c.set(tx + 1, ty + 1, "h")                 # bright start node
    # a faint o title pip on the tile's top-left (it's a tracked series)
    c.set(tx + 1, ty, "o")

    # --- brighter o/O CURSOR dot crosshair on the main plot's tallest (highlighted)
    # bar. The dashboard baseline is board_y=17; the highlighted warm bar stands at
    # x = bx0 + 6 + 15 where bx0 = ax-18, ax≈39 -> x≈42, height 10 -> top ≈ row 7.
    cux, cuy = 42, 6                            # just above the tallest bar's lit top
    c.set(cux, cuy, "O")                        # hot cursor dot
    c.set(cux - 1, cuy, "o"); c.set(cux + 1, cuy, "o")   # tiny crosshair arms
    c.set(cux, cuy - 1, "o")


def stage3_render_rack(c, hall):
    """t3 — STRUCTURAL ADD: a RENDER-RACK ANNEX bolted to the studio's RIGHT shaded
    flank — a slim deep-indigo Box of glowing GPU/compute bays that drive the
    visualizations (the studio now renders its own frames). A real new structural mass
    on the empty right ground (cols 54+), seated just right of the hall's right corner
    (r_right=(54,30), w_right=(54,42)) so it extends the floor sideways without crowding
    the glass hero or the centered dashboard. Introduces the matured deep-indigo `b`
    housing + energized `g` bay glow."""
    # seat the annex apex tucked against the hall's right shaded flank (slightly LEFT of
    # the corner so it overlaps the flank and reads as bolted on, not free-standing far
    # out at the canvas edge). Slim in wx/wy + shorter than the hall, and kept with a
    # clear right margin (right face lands ≈col 58, well inside the 63 edge).
    apex = (hall.r_right[0] - 2, hall.r_right[1] + 3)     # ≈ (52, 33)
    rack = Box(top=apex, wx=3, wy=3, h=10)
    rack.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # deep-indigo `b` base shadow band along the rack foot (matured structure tone)
    c.line(rack.w_left, rack.w_front, "b")
    c.line(rack.w_front, rack.w_right, "b")
    # --- stacked GLOWING GPU BAYS on the lit-LEFT face (facing the viewer): three
    # short glowing `g` slots with bright `h` indicator pips = compute bays running.
    # Kept in the LOWER half of the face (v>=4.5) so they stay visible BELOW the t4
    # video-wall tower that later stacks onto this rack's roof. ---
    for v in (4.6, 6.4, 8.2):
        # a thin recessed bay slot (b housing) with a glowing g core + h status pip
        a = rack.left_pt(0.20, v)
        b = rack.left_pt(0.80, v)
        c.line((int(round(a[0])), int(round(a[1]))), (int(round(b[0])), int(round(b[1]))), "b")
        a2 = rack.left_pt(0.24, v + 0.6)
        b2 = rack.left_pt(0.76, v + 0.6)
        c.line((int(round(a2[0])), int(round(a2[1]))), (int(round(b2[0])), int(round(b2[1]))), "g")
        pip = rack.left_pt(0.86, v + 0.3)
        c.set(int(round(pip[0])), int(round(pip[1])), "h")
    # a small dark intake louver low on the shaded-RIGHT face (it's a real rack)
    rack.louver(c, "right", 0.30, 0.72, 5.6, 9.2, body="d", slat="K", edge="D")
    return rack


def stage4_videowall(c, hall, rack):
    """t4 — MAJOR ADD: a curved VIDEO-WALL TOWER rising on the RIGHT, raising the
    roofline with ONE big glowing cyan PLOT WALL (the large dashboard screen the studio
    now drives). A prominent new vertical mass: a deep-indigo `b` chassis Box stacked
    directly on the render rack (the compute below, the screen wall above), its lit-LEFT
    face a single bright energized `e/E` screen carrying a bold bar+line plot. A slim
    tower can't host two legible mini-panels at 64px, so the front is ONE clean tall
    video-wall screen — the *multiple* synced charts arrive at t5 (the wraparound array).
    Kept on the right (cols 46-58), fully on-canvas, framing the hovering dashboard
    rather than occluding it. Palette matures: `b` chassis + `e/E` screen glow."""
    # stack the tower DIRECTLY ON the render rack's roof (same right-side footprint) so
    # it reads as the same massing growing UP — the compute rack below, the screen wall
    # above (this is what "raises the roofline"). Recompute off the SAME hall corner the
    # rack used so the stack stays aligned (rack apex = hall.r_right - (2,-3) at (52,33);
    # the tower apex sits 12px higher at the rack roof, rising to a roof at row ~21).
    apex = (hall.r_right[0] - 2, hall.r_right[1] - 9)     # ≈ (52, 21): up on the rack roof
    tower = Box(top=apex, wx=3, wy=3, h=12)
    # b deep-indigo chassis (matured structure) with a lighter M roof + bright bezel edges
    tower.draw(c, roof="M", lwall="b", rwall="D", roof_hi="W", outline="K")
    # a bright M bezel rim down the tower's lit front-left edge (the curved wall sweeps)
    for v in range(0, 12):
        p = tower.left_pt(0.0, v)
        c.set(int(round(p[0])), int(round(p[1])), "M")
    # --- ONE big glowing PLOT WALL filling the lit-LEFT face: a BRIGHT cyan screen field
    # (a glowing screen reads far better bright-field than dark-field at this size) with
    # an E lit sky-band and a crisp K frame. The plot glyph is kept SPARSE (the face is
    # only ~3px wide — dense glyphs swallow the glow and read as speckle), so just one
    # minimal `G` trend line + a couple of short baseline bars sit on the bright field. ---
    v0, v1 = 1.4, 10.4
    c.fill_poly([tower.left_pt(0.14, v0), tower.left_pt(0.86, v0),
                 tower.left_pt(0.86, v1), tower.left_pt(0.14, v1)], "e")
    # brighter E lit band across the top of the screen (the glow)
    c.fill_poly([tower.left_pt(0.14, v0), tower.left_pt(0.86, v0),
                 tower.left_pt(0.86, v0 + 2.0), tower.left_pt(0.14, v0 + 2.0)], "E")
    # a brighter E vertical sheen streak (reads as a lit glass screen)
    c.line((int(round(tower.left_pt(0.30, v0 + 1)[0])), int(round(tower.left_pt(0.30, v0 + 1)[1]))),
           (int(round(tower.left_pt(0.30, v1 - 1)[0])), int(round(tower.left_pt(0.30, v1 - 1)[1]))), "E")
    # crisp K frame
    for a, b in [(tower.left_pt(0.14, v0), tower.left_pt(0.86, v0)),
                 (tower.left_pt(0.14, v1), tower.left_pt(0.86, v1)),
                 (tower.left_pt(0.14, v0), tower.left_pt(0.14, v1)),
                 (tower.left_pt(0.86, v0), tower.left_pt(0.86, v1))]:
        c.line((int(round(a[0])), int(round(a[1]))), (int(round(b[0])), int(round(b[1]))), "K")
    # a SPARSE dark `G` trend line zig-zagging down the screen (one clear plot, not a mush)
    lpts = [(0.30, v0 + 2.6), (0.50, v0 + 4.2), (0.66, v0 + 3.0), (0.78, v0 + 4.6)]
    prev = None
    for u, vv in lpts:
        p = tower.left_pt(u, vv)
        pt = (int(round(p[0])), int(round(p[1])))
        if prev is not None:
            c.line(prev, pt, "G")
        prev = pt
    # two short G baseline bars at the screen foot (a hint of a bar chart, kept minimal)
    base_v = v1 - 1.0
    for u, hh in ((0.42, 2.0), (0.62, 2.8)):
        p = tower.left_pt(u, base_v)
        x, y = int(round(p[0])), int(round(p[1]))
        for k in range(int(round(hh))):
            c.set(x, y - k, "G")
    return tower


def stage5_array(c, hall, tower, lan):
    """t5 — CROWNING FEATURE = FULLY EVOLVED analytics floor. The dashboard + video-wall
    become a WRAPAROUND SYNCED ANALYTICS ARRAY: three bright signal-cyan `E` live
    mini-charts (a LINE panel, a BAR panel, a SCATTER panel) wrap around the right side
    in unison, anchored to the video-wall tower, with a bright KPI NODE pulsing above
    them; and the whole studio is dressed out in GOLD premium trim (a `q` master BEZEL
    framing the hero video-wall screens + a `q` gold FINIAL crowning the tower). Reads
    as elite, still recognizably the same dataviz studio, just maxed out. Re-anchors off
    the SAME hall.r_right corner the tower used so the array stacks cleanly (no second
    hardcoded guess)."""
    # recompute the tower apex from the SAME source + dims the tower used (stacked on the
    # rack roof), then work off its own roof/faces so the array sits exactly on it.
    apex = (hall.r_right[0] - 2, hall.r_right[1] - 9)     # ≈ (52, 21), matches stage4
    twr = Box(top=apex, wx=3, wy=3, h=12)

    # --- GOLD master BEZEL framing the video-wall's twin screens (t5 flourish only).
    # Hugs the lit-LEFT face screen zone (v 1.4..10.4, matching stage4's two screens) so
    # the hero plot wall reads as gilded — gold trim, NOT a recolor. ---
    v0, v1 = 1.2, 10.6
    for v in (v0, v1):
        a = twr.left_pt(0.12, v); b = twr.left_pt(0.88, v)
        c.line((int(round(a[0])), int(round(a[1]))), (int(round(b[0])), int(round(b[1]))), "q")
    for u in (0.12, 0.88):
        a = twr.left_pt(u, v0); b = twr.left_pt(u, v1)
        c.line((int(round(a[0])), int(round(a[1]))), (int(round(b[0])), int(round(b[1]))), "q")
    # a bright O gold glint on the top-left bezel corner
    g0 = twr.left_pt(0.12, v0)
    c.set(int(round(g0[0])), int(round(g0[1])) - 1, "O")

    # --- WRAPAROUND SYNCED mini-charts wrapping the tower's shaded-RIGHT face (the array
    # curves AROUND the side, synced with the front screens). Three small bright-E live
    # panels stacked down the right face: a BAR panel, a LINE panel, a SCATTER panel. ---
    # BAR mini-panel (top of the right face)
    for i, hh in enumerate((2, 1, 2)):
        p = twr.right_pt(0.34 + i * 0.16, 3.0)
        x, y = int(round(p[0])), int(round(p[1]))
        for k in range(hh):
            c.set(x, y - k, "E")
    # LINE mini-panel (middle)
    lpts = [(0.32, 6.4), (0.48, 5.6), (0.64, 6.2), (0.80, 5.6)]
    prev = None
    for u, v in lpts:
        p = twr.right_pt(u, v)
        pt = (int(round(p[0])), int(round(p[1])))
        if prev is not None:
            c.line(prev, pt, "e")
        c.set(pt[0], pt[1], "E")
        prev = pt
    # SCATTER mini-panel (lower; a few bright cyan dots)
    for u, v in ((0.38, 8.8), (0.54, 8.2), (0.48, 9.4), (0.72, 8.6)):
        p = twr.right_pt(u, v)
        c.set(int(round(p[0])), int(round(p[1])), "E")

    # --- bright KPI NODE: the array's headline metric, mounted on a short mast rising
    # off the tower roof's RIGHT corner and CANTILEVERED into the clear sky to the lower-
    # right of the hovering dashboard (cols ~56-58, rows ~16-22 are empty; the dashboard
    # frame stops at col 55 and its scatter is up at rows 1-10). This keeps the KPI clear
    # of both the dashboard bars and the screen wall. Anchored on the roof (visible mast),
    # not floating. ---
    rrx, rry = twr.r_right                       # tower roof right corner (≈58,24)
    mx = int(round(rrx)) - 1                      # mast base, just inboard of the corner
    mbase = int(round(rry))
    ky = max(mbase - 6, 2)                        # node sits up the mast, in clear sky
    # short b/K mast from the roof corner up to the node
    c.line((mx, mbase), (mx, ky + 2), "b")
    c.set(mx + 1, mbase - 1, "K")
    c.set(mx, mbase, "K")
    kx = mx
    # one compact signal-halo ring (2:1 ellipse) + a bright cyan core
    import math
    for a in range(0, 360, 36):
        X = kx + 3 * math.cos(math.radians(a))
        Y = ky + 3 * 0.5 * math.sin(math.radians(a))
        if 0 <= X <= 63 and 0 <= Y <= 63:
            c.set(int(round(X)), int(round(Y)), "e")
    for xx, yy, ch in [(0, 0, "W"), (-1, 0, "E"), (1, 0, "E"), (0, -1, "E"), (0, 1, "E")]:
        if 0 <= kx + xx <= 63 and 0 <= ky + yy <= 63:
            c.set(kx + xx, ky + yy, ch)

    # --- GOLD KPI FINIAL: a small q spire + O spark crowning the KPI node (premium cap).
    # Recompute off the SAME node centre so it sits exactly on top (no second guess). ---
    fy = max(ky - 4, 1)
    c.line((kx, ky - 2), (kx, fy), "q")
    c.set(kx, fy, "O")
    if fy - 1 >= 0:
        c.set(kx, fy - 1, "q")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the data-visualization studio at upgrade `stage` (1..5). Stage 1 is
    IDENTICAL to the shipped base; each higher stage keeps every prior addition and
    bolts on the next (t2 sparkline tile → t3 render rack → t4 video-wall tower →
    t5 wraparound array + gold). Painter's order keeps rooftop/overhead additions on
    top of the masses they grow from, and every addition stays on the RIGHT flank /
    right-foreground, below the centered hovering dashboard signature, so neither the
    dashboard nor the lit-left glass hero is occluded."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    # painter's order: shadow -> hall -> lantern -> display glass -> entry terrace
    # -> hovering dashboard signature above the lantern.
    hall = HALL
    hall_shadow(c, hall)
    gallery_hall(c, hall)
    lan = skylight_lantern(c, hall)
    display_glass(c, hall)
    entry_terrace(c, hall)
    hovering_dashboard(c, lan)

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    # The render rack (t3) and video-wall tower (t4) are right-side masses; draw the
    # rack BEFORE the tower so the taller tower behind it occludes correctly. The
    # t2 left-side sparkline tile is independent.
    if stage >= 2:
        stage2_sparkline(c)
    rack = None
    if stage >= 3:
        rack = stage3_render_rack(c, hall)
    tower = None
    if stage >= 4:
        tower = stage4_videowall(c, hall, rack)
    if stage >= 5:
        stage5_array(c, hall, tower, lan)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/mindframe"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "data-visualization-studio"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG +
    scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must keep
    matching the shipped data-visualization-studio.png, so it does NOT overwrite the base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": MIND, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"mindframe_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"mindframe_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
