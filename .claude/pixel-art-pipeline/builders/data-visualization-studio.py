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
"""
import os
import sys
import json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

MIND = {"K": "#181428", "W": "#e8e2f6", "L": "#cabfe6", "M": "#9f90c8", "D": "#6f5fa0", "d": "#4a3c70",
        "h": "#ecc8f4", "c": "#d0a8ee", "g": "#a45ce0", "G": "#6a2fb0",
        "o": "#f08cce", "O": "#ffb8e2", "r": "#b03a80"}


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


def build():
    c = Canvas()
    # painter's order: shadow -> hall -> lantern -> display glass -> entry terrace
    # -> hovering dashboard signature above the lantern.
    hall = HALL
    hall_shadow(c, hall)
    gallery_hall(c, hall)
    lan = skylight_lantern(c, hall)
    display_glass(c, hall)
    entry_terrace(c, hall)
    hovering_dashboard(c, lan)

    spec = {"width": 64, "height": 64, "palette": MIND, "rows": c.rows()}
    out = "/path/to/scienium/art/src/buildings/mindframe_data-visualization-studio.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
