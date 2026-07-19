#!/usr/bin/env python3
"""
Research Plan — GATEWAY building (BESPOKE isometric form, generic → recolored by recolor.py).

TRANSLATES art_ref/mockups/research_plan.png: an ENGINEERING DRAFTING STUDIO of TWO
drafting-desk units in an L, joined at a back corner and splayed toward the viewer so a
front-center NOTCH opens between their near corners. Each unit's TOP is a big SLANTED
DRAFTING SCREEN (tilted up-and-back like a drawing board) glowing with a blue/purple/teal
sketch scribble behind a thick dark frame — the screens, not flat cube roofs, are the
silhouette. In the notch stands the one-of-one HERO: an oversized PEN/PENCIL HOLDER cup
bristling with thin pens/rulers that fan UP and OUT, an ORANGE V-CHEVRON accent on its
base, with a vertical ORANGE TRIM POST standing behind it at the back corner where the two
units meet.

  * LEFT unit  — bigger / taller, reads THREE-LAYERED: slanted sketch screen (top) → a
    recessed green+purple SHELF BAND (colour strip) → plain lower body with a handle dot and
    an orange corner trim.
  * RIGHT unit — lower / smaller, set right and slightly forward, TWO-LAYERED: slanted
    sketch screen (top) → lower body carrying one square glass WINDOW with orange edge trim.

This is emphatically NOT the shared gateway cube (iso.draw_cube / base_windows are
forbidden). It is composed from art/isobuild.Box + cylinder + hand-placed detail, on the
canonical 13-char palette so recolor.py reskins it by char.

Draw order (painter's algorithm, back → front):
  contact shadow → LEFT unit (farther back) → RIGHT unit (nearer) → back orange post →
  pen holder (hero).

Serializes the char-grid to art/src/research_plan_generic.json (recolor.py reads it), and
renders apps/web/public/sprites/gateways/research_plan_generic.png + an x8 preview.
"""
from __future__ import annotations

import json
import math
import os
import sys

ART = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ART)

from PIL import Image                    # noqa: E402

from iso import Canvas                   # noqa: E402  Canvas.set / fill_poly / line / rows
from isobuild import Box                  # noqa: E402  bespoke iso primitive
from render_pixel_art import render      # noqa: E402  char-grid spec -> PIL image

SIZE = 64

# ── Generic palette (exactly the blueprint's generic hexes; == canon keys) ────────
#   K outline | W/L/M/D/d wall light→dark | h/c/g/G glass | o/O/r accent
PAL = {
    "K": "#241f38",  # outline / deepest shadow
    "W": "#e2dcf0",  # wall highlight (lightest)
    "L": "#cdc6e2",  # wall light (board top / lit)
    "M": "#b0a6ca",  # wall mid (lit face)
    "D": "#897ea6",  # wall dark (shaded face)
    "d": "#6f6592",  # wall darker (recess / purple sketch line)
    "h": "#d2f7f4",  # glass highlight
    "c": "#a0efea",  # glass light (glow)
    "g": "#41d2d0",  # glass mid
    "G": "#23808b",  # glass dark
    "o": "#ff9243",  # accent orange
    "O": "#ffc089",  # accent light
    "r": "#d9641f",  # accent dark
}


def _lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def _fill_ellipse(c: Canvas, cx: float, cy: float, rx: float, ry: float, fill: str) -> None:
    """Fill a 2:1 iso ellipse — used to build the solid pen-cup mouth + foot."""
    for yy in range(int(-ry), int(ry) + 1):
        t = 1 - (yy / ry) ** 2
        if t < 0:
            continue
        half = rx * (t ** 0.5)
        for xx in range(int(-half), int(half) + 1):
            c.set(cx + xx, cy + yy, fill)


# ── 0. contact shadow pooled under the whole footprint (drawn FIRST) ──────────────
def contact_shadow(c: Canvas) -> None:
    scx, scy = 32, 55
    rx, ry = 22, 4
    for y in range(scy - ry, scy + ry + 1):
        for x in range(scx - rx, scx + rx + 1):
            ex = (x - scx) / rx
            ey = (y - scy) / ry
            if ex * ex + ey * ey <= 1.0:
                c.set(x, y, "K")


# ── 1. a drafting-desk UNIT: iso body + SLANTED GLASS DRAFTING SCREEN on top ───────
def drafting_unit(c: Canvas, b: Box, tilt: float,
                  screen_glass: str, screen_hi: str,
                  scribble: str = "K",
                  field_quads=None, sketch_pts=None) -> None:
    """Draw one desk unit: its two visible wall faces (painted plain here; layer details
    are added later) and, in place of a flat cube roof, a SLANTED DRAFTING SCREEN tilted up
    toward the BACK. The screen reads as ANGLED GLASS carrying a blue/purple/teal SKETCH
    scribble behind a thick dark frame — the mockup's defining feature."""
    b.shadow(c)

    # --- the two visible WALL faces (lit-left M, shaded-right D) ---
    c.fill_poly([b.r_left, b.r_front, b.w_front, b.w_left], "M")    # lit-left wall
    c.fill_poly([b.r_front, b.r_right, b.w_right, b.w_front], "D")  # shaded-right wall
    c.line(b.r_front, b.w_front, "d")                               # front vertical recess

    # --- SLANTED board plane: lift the back corners so the plane tilts up-and-back.
    # Front corner stays flush on the walls; left/right lift `tilt`, back lifts `2*tilt`
    # (linear in footprint coords → the four corners stay coplanar / a parallelogram). ---
    t = tilt
    bf = b.r_front                                   # board front  (flush, lift 0, LOWEST)
    bl = (b.r_left[0], b.r_left[1] - t)              # board left   (lift t)
    br = (b.r_right[0], b.r_right[1] - t)            # board right  (lift t)
    bt = (b.r_top[0], b.r_top[1] - 2 * t)            # board back   (lift 2t, HIGHEST)

    # board-edge RIM slivers between the flat wall tops and the raised board (its visible
    # thickness along the two near edges) — lit rim L, shaded rim D.
    c.fill_poly([bf, b.r_left, bl], "L")             # left near rim (lit)
    c.fill_poly([bf, b.r_right, br], "D")            # right near rim (shaded)

    # SCREEN-space axes: BILINEAR over the four panel CORNERS (bl bf br bt) so (u,v)∈[0,1]²
    # fills the whole tilted panel and NOTHING lands outside the K frame. u runs bl→bf along
    # the bottom edge (0→1); v runs bl→bt along the left edge (0→1). A band of constant-u,
    # v=0..1 is a stripe running UP-RIGHT across the glass — the drawing's hatching direction.
    cen = ((bl[0] + br[0]) / 2, (bl[1] + br[1]) / 2)
    def screen_pt(u, v):
        tx = bl[0] + u * (bf[0] - bl[0]); ty = bl[1] + u * (bf[1] - bl[1])   # v=0 edge bl→bf
        bx = bt[0] + u * (br[0] - bt[0]); by = bt[1] + u * (br[1] - bt[1])   # v=1 edge bt→br
        return (tx + v * (bx - tx), ty + v * (by - ty))

    # 1) glass field over the whole screen quad (bl bf br bt)
    c.fill_poly([bt, br, bf, bl], screen_glass)
    # 2) ONE soft brighter wash on the raised BACK half (the glass tell) — no harsh white
    #    speckle nub, no dark sill; kept simple so the panel stays crisp.
    c.fill_poly([bt, _lerp(bt, bl, 0.55), _lerp(bt, br, 0.55)], screen_hi)
    # 3) COLOUR FIELD: the caller hands slanted quads in screen (a,p) space that GIVE the panel
    #    its character — the LEFT screen a set of blue/purple stripes (d/M/D) with teal glass
    #    showing between; the RIGHT screen green(g/G)+purple(d) patches. This is what makes the
    #    two screens read blue/purple vs multicolour instead of two identical teal panels.
    for pts, col in (field_quads or []):
        c.fill_poly([screen_pt(a, p) for a, p in pts], col)
    # 4) the bold dark SKETCH stroke (the scrawled research drawing): a single clean polyline
    #    the caller supplies — a big blue/purple ZIGZAG on the left, a small scribble CURL on
    #    the right — drawn thick in `scribble` (K) so it reads as a drawn line, not speckle.
    sk = sketch_pts or [(0.26, 0.60), (0.72, 0.56), (0.30, 0.42), (0.72, 0.44)]
    for i in range(len(sk) - 1):
        c.line(screen_pt(*sk[i]), screen_pt(*sk[i + 1]), scribble)
    # 5) one short clean sheen tick near the back-left (glass tell) — kept OFF the sketch.
    c.line(screen_pt(0.24, 0.78), screen_pt(0.36, 0.70), "W")
    # 6) THICK DARK FRAME: the K silhouette (below) + an inset d inner border for weight.
    for a, e in [(bt, br), (br, bf), (bf, bl), (bl, bt)]:
        c.line(_lerp(a, cen, 0.14), _lerp(e, cen, 0.14), "d")

    # raised back LIP: a single clean bright rim just inside the back edges (screen_hi tone so
    # it never leaves stray white pixels), and the warm near-eave trim.
    c.line((bt[0], bt[1] + 1), (bl[0], bl[1] + 1), screen_hi)
    c.line((bt[0], bt[1] + 1), (br[0], br[1] + 1), screen_hi)
    c.line(bf, bl, "o")                              # lit near eave (orange trim)
    c.line(bf, br, "r")                              # shaded near eave (deep orange)

    # --- K silhouette outline (screen quad + thickness + walls) ---
    for a, e in [
        (bt, br), (br, bf), (bf, bl), (bl, bt),      # screen top quad (the thick dark frame)
        (bl, b.r_left), (br, b.r_right),             # board thickness at the near edges
        (b.r_left, b.w_left), (b.r_right, b.w_right), (bf, b.w_front),  # wall verticals
        (b.w_left, b.w_front), (b.w_front, b.w_right),                  # wall bottoms
    ]:
        c.line(a, e, "K")


# ── 1a. LEFT unit face detail — recessed green+purple SHELF BAND + body + trim ─────
def left_face_details(c: Canvas, b: Box) -> None:
    """The left unit reads THREE-LAYERED. Below the screen eave: a recessed SHELF BAND — a
    horizontal colour strip of alternating green(g)+purple(d) with teal(c) accents, seated
    between two K shelf boards (supply drawer / light bar). Below it plain body wall with a
    small handle dot and an orange trim down the near-left corner."""
    # A FATTER recessed band seated in the MIDDLE of the face so the unit reads as three clear
    # stacked layers: slanted screen (above) → this shelf band → plain body (below). Widened
    # (v 4.6→9.8, ~5px tall) so it reads as a real two-tone supply shelf, not a thin line.
    u0, u1, v0, v1 = 0.14, 0.90, 4.6, 9.8
    # K shelf boards top & bottom (the recess frame) — bold enough to bracket a real layer
    c.line(b.left_pt(u0, v0 - 0.8), b.left_pt(u1, v0 - 0.8), "K")
    c.line(b.left_pt(u0, v1 + 0.8), b.left_pt(u1, v1 + 0.8), "K")
    # a dark recess backing so the strip reads as an inset band
    c.fill_poly([b.left_pt(u0, v0), b.left_pt(u1, v0),
                 b.left_pt(u1, v1), b.left_pt(u0, v1)], "d")
    # GREEN(g, upper) over PURPLE(D, lower) as two clear horizontal sub-bands — the drawing's
    # green streak above a purple streak. Uses the greenest palette teal (g) over the purple
    # wall-dark (D) so the band reads GREEN+PURPLE, distinct from the M face above and below.
    vm = (v0 + v1) / 2
    c.fill_poly([b.left_pt(u0, v0), b.left_pt(u1, v0),
                 b.left_pt(u1, vm), b.left_pt(u0, vm)], "g")        # green upper streak
    c.fill_poly([b.left_pt(u0, vm), b.left_pt(u1, vm),
                 b.left_pt(u1, v1), b.left_pt(u0, v1)], "D")        # purple lower streak
    # a few strokes breaking the two colours into each other so it reads hand-coloured
    c.line(b.left_pt(0.30, v0 + 0.5), b.left_pt(0.30, vm - 0.2), "M")   # mauve fleck in the green
    c.line(b.left_pt(0.62, v0 + 0.5), b.left_pt(0.62, vm - 0.2), "D")   # purple fleck in the green
    c.line(b.left_pt(0.22, vm + 0.3), b.left_pt(0.22, v1 - 0.4), "M")   # mauve tick in the purple
    c.line(b.left_pt(0.74, vm + 0.3), b.left_pt(0.74, v1 - 0.4), "d")   # deep-purple tick in the purple
    # a soft teal glint on the band's top edge + a K shaded crease at its foot (recess depth)
    c.line(b.left_pt(u0, v0 + 0.2), b.left_pt(u1, v0 + 0.2), "c")
    c.line(b.left_pt(u0, v1 - 0.2), b.left_pt(u1, v1 - 0.2), "K")

    # handle dot on the plain lower body
    hx, hy = b.left_pt(0.52, 11.5)
    c.set(hx, hy, "K")
    c.set(hx - 1, hy, "K")
    c.set(hx, hy - 1, "W")

    # orange trim running down the near-left vertical corner of the body (inset 1px so the
    # K silhouette stays crisp), with a light O tick at the top.
    c.line((b.r_left[0] + 1, b.r_left[1] + 1), (b.w_left[0] + 1, b.w_left[1] - 1), "o")
    c.set(b.r_left[0] + 1, b.r_left[1] + 1, "O")


# ── 1b. RIGHT unit face detail — one square glass WINDOW + orange edge trim ─────────
def right_face_window(c: Canvas, b: Box) -> None:
    """The right unit reads TWO-LAYERED: below its screen, the lower body carries a single
    square glass WINDOW (blue/teal glow) with orange edge trim, on the outward shaded-right
    face — matching the mockup's square window that faces out to the right."""
    # Enlarged square window (1-2px wider + taller) so it reads as a clean glass pane.
    u0, u1, v0, v1 = 0.18, 0.80, 2.0, 7.4
    b.window(c, "right", u0, u1, v0, v1,
             glass="c", hi="h", shade="G", frame="K", mullions=0, sheen="h")
    # blue/purple/green flecks scrawled across the pane (the mockup's multicolour window)
    c.line(b.right_pt(0.30, v0 + 1.6), b.right_pt(0.66, v0 + 1.6), "d")   # purple mark
    c.line(b.right_pt(0.34, v0 + 3.2), b.right_pt(0.70, v0 + 3.2), "g")   # green mark
    c.line(b.right_pt(0.28, v0 + 4.4), b.right_pt(0.58, v0 + 4.4), "M")   # mauve mark
    # orange edge trim flanking the window (o verticals just outside the K frame)
    c.line(b.right_pt(u0 - 0.05, v0 - 0.4), b.right_pt(u0 - 0.05, v1 + 0.4), "o")
    c.line(b.right_pt(u1 + 0.05, v0 - 0.4), b.right_pt(u1 + 0.05, v1 + 0.4), "r")
    # a light O tick catching the top-left orange trim
    tx, ty = b.right_pt(u0 - 0.05, v0 - 0.4)
    c.set(tx, ty, "O")
    # a small SECONDARY square window lower-RIGHT on the face (the mockup's little bottom window)
    b.window(c, "right", 0.54, 0.76, 8.4, 10.6,
             glass="g", hi="c", shade="G", frame="K", mullions=0, sheen="h")


# ── 2. back ORANGE TRIM POST at the corner where the two units meet ────────────────
def back_post(c: Canvas, x: int, y0: int, y1: int) -> None:
    """A slim vertical orange post standing in the notch at the back corner where the two units
    join (drawn AFTER the units, BEFORE the cup + fan, so the cup laps its lower end). Kept
    THIN — a 1px lit core + 1px shaded edge — and tall enough that its bright cap rises as a
    distinct spire BETWEEN the two inner pens rather than merging with them into one thick
    orange column (the prior render's failing)."""
    c.line((x, y0), (x, y1), "o")                   # 1px lit orange core
    c.line((x + 1, y0 + 2), (x + 1, y1), "r")       # 1px shaded edge (offset down so the tip stays thin)
    c.set(x, y0, "O")                               # bright lit cap
    c.set(x, y0 + 1, "O")                           # a second bright pixel so the spire peeks clear of the fan
    c.set(x, y0 + 2, "o")


# ── 3. SIGNATURE — the oversized PEN HOLDER in the front-center notch (the hero) ──
def pen_holder(c: Canvas, cx: float, rim_y: float) -> None:
    """A SOLID tapering pen cup in the front-centre notch, bristling with a bold FAN of thin
    pens/rulers spraying UP and OUTWARD — the one-of-one hero. An ORANGE V-CHEVRON rides on
    the cup's FRONT FACE. Drawn LAST so the vessel stands proud and its front rim laps the pen
    shafts (the pens sit inside the cup)."""
    rx_top, rx_bot = 6, 4          # mouth radius (wide) tapering to a narrower base
    ry_top, ry_bot = 3, 2
    h = 10                          # cup body height
    base_y = int(rim_y + 2)         # pens root just inside the mouth (narrow base)

    # --- THE FAN (behind the cup body). Six thin pens/rulers rooted in a NARROW base at the
    # cup mouth and fanning UP + OUTWARD to VARIED heights, so the bundle SPRAYS clearly into
    # the notch and rises above the two slanted screens. Colours mix light (W/L), orange (o/O)
    # and a single teal ruler (g) — never grey. The two inner pens leave x=cx clear so the slim
    # back post shows as a spire between them. Each pen: a body column, a lit edge column and a
    # K outline (doubling as a 1px separator), capped with a bright tip. ---
    # (base_x_offset, tip_x_offset, tip_y, barrel, lit_edge, tip)
    pens = [
        (-3, -11, 26, "L", "W", "W"),   # outer-left  — light ruler
        (-2,  -6, 23, "o", "O", "O"),   # mid-left    — orange marker (tallest)
        (-2,  -2, 29, "g", "c", "h"),   # inner-left  — TEAL ruler
        ( 2,   2, 27, "W", "L", "W"),   # inner-right — light pen
        ( 2,   7, 24, "o", "O", "o"),   # mid-right   — orange pencil (tall)
        ( 3,  11, 28, "L", "W", "W"),   # outer-right — light ruler
    ]
    for bxo, txo, tip_y, barrel, edge, tip in pens:
        base_x = int(round(cx + bxo))
        top_x = int(round(cx + txo))              # fan OUTWARD toward the tips
        c.line((base_x + 1, base_y), (top_x + 1, tip_y), "K")   # K outline / 1px separator
        c.line((base_x - 1, base_y), (top_x - 1, tip_y), edge)  # lit edge column
        c.line((base_x, base_y), (top_x, tip_y), barrel)        # body column
        c.set(top_x, tip_y, tip)                                # bright tip cap
        c.set(top_x - 1, tip_y, tip)
        c.set(top_x, tip_y - 1, "K")                            # outline the very point
        c.set(top_x - 1, tip_y - 1, "W" if tip in ("o", "O") else "h")

    # --- THE CUP (the hero): a SOLID tapering vessel — a purple trapezoid body (lit-left M /
    # shaded-right D with a d front seam), a filled dark MOUTH so it never reads as a
    # see-through ring, a rounded foot, a thin lit rim and a clean K silhouette. ---
    tl = (cx - rx_top, rim_y); tr = (cx + rx_top, rim_y)
    bl = (cx - rx_bot, rim_y + h); br = (cx + rx_bot, rim_y + h)
    c.fill_poly([tl, (cx, rim_y), (cx, rim_y + h), bl], "M")      # lit-left body
    c.fill_poly([(cx, rim_y), tr, br, (cx, rim_y + h)], "D")      # shaded-right body
    c.line((cx, rim_y), (cx, rim_y + h), "d")                     # front vertical seam

    _fill_ellipse(c, cx, rim_y + h, rx_bot, ry_bot, "D")          # rounded foot (shaded)
    _fill_ellipse(c, cx, rim_y, rx_top, ry_top, "d")              # SOLID dark mouth (no see-through)
    for a in range(180, 361, 12):                                # lit BACK rim just inside the upper arc
        c.set(cx + (rx_top - 0.5) * math.cos(math.radians(a)),
              rim_y + (ry_top - 0.3) * math.sin(math.radians(a)), "M")
    c.set(cx - rx_top + 1, rim_y, "L")                           # bright lit lip
    c.set(cx - rx_top + 1, rim_y + 1, "L")

    for k in range(1, h - 1):                                    # lit-left sheen streak on the body
        c.set(cx - rx_top + 1 + (k * (rx_top - rx_bot)) // h, rim_y + 1 + k, "L")
    c.set(cx - rx_top + 2, rim_y + 4, "W")

    # --- ORANGE V-CHEVRON riding on the cup's FRONT FACE (two stacked chevrons) ---
    for j, (up, dn) in enumerate([("o", "r"), ("O", "o")]):
        ay = int(rim_y + 4 + j * 3)
        c.line((cx - 3, ay - 2), (cx, ay + 1), up)    # \  left arm
        c.line((cx + 3, ay - 2), (cx, ay + 1), up)    #  /  right arm
        c.set(cx, ay + 1, dn)                          # deepen the vertex

    # --- K silhouette: mouth rim + body sides + base front arc ---
    for a in range(0, 360, 10):                        # mouth rim
        c.set(cx + rx_top * math.cos(math.radians(a)),
              rim_y + ry_top * math.sin(math.radians(a)), "K")
    c.line(tl, bl, "K"); c.line(tr, br, "K")           # body sides
    for a in range(0, 181, 12):                        # base front arc
        c.set(cx + rx_bot * math.cos(math.radians(a)),
              rim_y + h + ry_bot * math.sin(math.radians(a)), "K")


# ── 4. assemble ───────────────────────────────────────────────────────────────────
def build() -> Canvas:
    c = Canvas()
    contact_shadow(c)

    # Two desk units joined at the back, splayed so their near corners leave a front-center
    # notch. LEFT unit is bigger + taller; RIGHT unit is smaller, set to the right and a
    # touch FORWARD + LOWER — matching the drawing. Sized + placed so their iso footprint
    # overlap falls under the central cup (which masks the join).
    left = Box(top=(24, 19), wx=6, wy=7, h=16)     # bigger / taller
    right = Box(top=(44, 31), wx=6, wy=6, h=11)    # smaller / dropped lower + nudged forward-right

    # LEFT first (farther back), then RIGHT (nearer) — painter's order. Each screen carries its
    # OWN colour field so they don't read as two identical teal panels: the LEFT screen is
    # blue/purple (purple stripes over teal + a d/M scribble); the RIGHT screen is multicolour
    # (green patches + a purple stripe over blue-teal + a green/purple scribble) — as in the
    # drawing (left = blue/purple, right = blue/green/purple).
    # LEFT screen = BLUE/PURPLE: bold purple stripes (d/M/D) as constant-u bands over the teal
    # glass so the teal only peeks between them → the panel reads blue/purple like the drawing.
    # (Bands span v=0..1 → they stay INSIDE the tilted panel, no pixels outside the K frame.)
    def uband(u0, u1):
        return [(u0, 0.04), (u1, 0.04), (u1, 0.96), (u0, 0.96)]
    left_screen_stripes = [
        (uband(0.08, 0.24), "d"),   # purple stripe
        (uband(0.34, 0.50), "M"),   # mauve stripe
        (uband(0.58, 0.74), "d"),   # purple stripe
        (uband(0.82, 0.94), "D"),   # blue-shade stripe
    ]
    # RIGHT screen = a LIGHT MULTICOLOUR SKETCH (matching the left screen's species, not a solid
    # dark blob): a handful of THIN scribble strokes — teal(c/g), bright glass(h) and one purple
    # (d) — scattered as narrow constant-u bands over the pale glass so the panel reads as a
    # colourful drawn sketch on lavender, framed by K. (The prior solid G quadrant that made it
    # look like spilled ink is gone.)
    def rstroke(u0, u1):
        return [(u0, 0.10), (u1, 0.10), (u1, 0.90), (u0, 0.90)]
    right_screen_marks = [
        (rstroke(0.14, 0.24), "c"),   # light-teal stroke
        (rstroke(0.34, 0.44), "g"),   # green stroke
        (rstroke(0.54, 0.62), "h"),   # bright glass fleck
        (rstroke(0.72, 0.82), "d"),   # thin purple stroke
    ]
    # bold dark SKETCH strokes (K): a big Z-zigzag on the left screen, a small scribble curl on
    # the right — in the panel's (u,v) corner space so they sit cleanly inside each frame.
    left_zigzag = [(0.15, 0.62), (0.55, 0.85), (0.45, 0.30), (0.82, 0.52)]
    right_curl = [(0.35, 0.55), (0.60, 0.60), (0.62, 0.40), (0.40, 0.38), (0.45, 0.55)]
    drafting_unit(c, left, tilt=4, screen_glass="g", screen_hi="c",
                  scribble="K", field_quads=left_screen_stripes, sketch_pts=left_zigzag)
    left_face_details(c, left)
    drafting_unit(c, right, tilt=4, screen_glass="c", screen_hi="h",
                  scribble="K", field_quads=right_screen_marks, sketch_pts=right_curl)
    right_face_window(c, right)

    # vertical ORANGE POST at the back corner where the units meet (in the notch, behind cup +
    # fan) — tall + thin so its cap rises as a distinct spire between the two inner pens.
    back_post(c, x=32, y0=25, y1=40)

    # HERO pen holder in the front-center notch, on top of everything.
    pen_holder(c, cx=32, rim_y=39)
    return c


# ── 5. emit: JSON (recolor.py reads it) + native PNG + x8 preview ─────────────────
SRC = os.path.join(ART, "src", "research_plan_generic.json")
PNG = os.path.join(ART, "..", "apps", "web", "public", "sprites", "gateways",
                   "research_plan_generic.png")
PREVIEW = os.path.join(ART, "preview", "research_plan_generic.png")


def emit() -> None:
    c = build()
    spec = {"width": SIZE, "height": SIZE, "palette": PAL, "rows": c.rows()}
    os.makedirs(os.path.dirname(SRC), exist_ok=True)
    json.dump(spec, open(SRC, "w"), indent=0)

    img = render(spec)
    os.makedirs(os.path.dirname(PNG), exist_ok=True)
    img.save(PNG)

    os.makedirs(os.path.dirname(PREVIEW), exist_ok=True)
    big = img.resize((SIZE * 8, SIZE * 8), Image.NEAREST)
    bg = Image.new("RGBA", big.size, (210, 210, 218, 255))
    bg.alpha_composite(big)
    bg.save(PREVIEW)
    print(f"research_plan → {PNG}")
    print(f"preview       → {PREVIEW}")


if __name__ == "__main__":
    emit()
