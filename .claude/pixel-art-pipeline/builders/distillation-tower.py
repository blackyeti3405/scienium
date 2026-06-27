#!/usr/bin/env python3
"""
Distillation Tower — ChemWorks Lab economy building (BESPOKE form, STANDARD role).

The TALLEST, MOST SLENDER vertical mass in the set: a towering steel-and-glass
FRACTIONATING COLUMN (isobuild.cylinder) rising high off a low reboiler base
block — a skinny industrial process-column silhouette, NOT the gateway cube and
NOT the fat Aquatic water-cylinder. Where the Aquatic tank is a wide transparent
water rotunda, this is a narrow `M`/`D` blue-grey steel column banded with `K`
horizontal tray plates, capped by a small `D` reflux-condenser drum, with a clear
`c` sight-glass running up the LIT-LEFT.

  • Opening side = RIGHT: the hero is a K-framed control-room WINDOW + DOOR on the
    SHADED RIGHT face of the base block, made to GLOW — g->c glass over a bright
    o/O violet interior so it reads on the shaded side, h reflection. The LIT-LEFT
    face of the base stays plainer (plain wall + a vent), letting the column's lit
    sight-glass carry the left-side interest.
  • Signature (one-of-one): up the column's clear sight-glass the mixture SEPARATES
    into a vertical stack of distinct colored fraction bands — heaviest r/G at the
    bottom, grading g -> c -> light h/W vapor at the top — with one mid band lit
    brighter (O/h) as the OPTIMIZED CUT drawn off through a small o tap/arrow. A
    h->O violet-tinged VAPOR PLUME curls off the top condenser vent; an o reboiler
    glow + a tiny c/g purity gauge climbing to an O target sit on the base.

Composed from art/isobuild.{cylinder,Box} — NO iso.draw_cube / base_windows.
Draw order: contact shadow + base plinth -> reboiler base BOX (back) -> the tall
COLUMN cylinder -> tray bands + sight-glass fractions + draw-off pipes -> condenser
drum cap + reflux pipe + vapor plume -> the base's RIGHT glowing opening (front).
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

CHEM = {"K": "#161a2e", "W": "#e6ecfb", "L": "#c2cdee", "M": "#9aa8d8", "D": "#6f7cb0", "d": "#4b5688",
        "h": "#d6ecff", "c": "#a8d4ff", "g": "#4aa0e6", "G": "#2166b0",
        "o": "#c89cf0", "O": "#e0c2ff", "r": "#6a34a8"}


# ── column geometry (TALL + NARROW => a slender process column, not a drum) ───
CX = 37
TOP_Y = 12          # y of the column's top-ellipse centre (leaves headroom for the plume)
RX = 5              # column horizontal radius (SLIM)
RY = 3              # column vertical radius (2:1-ish ellipse)
COL_H = 36          # column wall height (VERY TALL) — a free-standing slender column
BASE_Y = TOP_Y + COL_H


def wall_top(col):
    """Top-y of the column wall at horizontal offset `col` (front face begins),
    following the top-ellipse front arc so details clip to the curve."""
    t = 1 - (col / RX) ** 2
    if t < 0:
        return None
    return TOP_Y + RY * (t ** 0.5)


# ── contact shadow + a low plinth the whole rig stands on (drawn FIRST) ───────
def base_shadow(c):
    # soft K contact shadow pooled under the whole footprint (base block at front-
    # left + the column foot to the right). A flat iso ellipse so it feels grounded.
    scx, scy = 26, 58
    for x in range(scx - 19, scx + 19):
        for y in range(scy - 2, scy + 3):
            ex = (x - scx) / 19.0
            ey = (y - scy) / 2.4
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")
    # a low d/D steel SKIRT ring under the free-standing column foot
    for col in range(-RX, RX + 1):
        t = 1 - (col / RX) ** 2
        if t < 0:
            continue
        edge = RY * (t ** 0.5)
        for k in range(3):
            c.set(CX + col, BASE_Y + int(edge) + k, "D" if col <= -1 else "d")
    for a in range(0, 181, 5):                # K front arc of the skirt
        x = CX + (RX + 0.5) * math.cos(math.radians(a))
        y = BASE_Y + 1 + RY * math.sin(math.radians(a))
        c.set(x, y, "K")


BASE_BOX = Box((18, 30), wx=8, wy=7, h=10)


# ── the REBOILER BASE BLOCK (low Box) — the column rises from its back ─────────
def reboiler_base(c, b):
    """A low clean Box — the reboiler/feed unit the column stands on. Drawn AFTER
    the column so the roof's front edge OCCLUDES the column foot (the column rests
    ON the roof); the GLOWING control-room opening then goes on this block's SHADED
    RIGHT face. Draws `b` and returns it."""
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    return b


def roof_front_y(b, x):
    """Screen-y of the base roof's FRONT silhouette edge at screen column `x`
    (where the roof meets the front faces). Used to clip the column foot so it
    rests ON the roof instead of punching down through the base front face."""
    lf0, lf1 = b.r_left, b.r_front     # left-front roof edge
    rf0, rf1 = b.r_front, b.r_right    # right-front roof edge
    if x <= b.r_front[0]:
        a, bb = lf0, lf1
    else:
        a, bb = rf1, rf0               # order so x increases along the segment
    if bb[0] == a[0]:
        return max(a[1], bb[1])
    t = (x - a[0]) / (bb[0] - a[0])
    t = max(0.0, min(1.0, t))
    return a[1] + t * (bb[1] - a[1])


# ── the tall slender steel-and-glass COLUMN body ─────────────────────────────
def column(c, b):
    """The very tall narrow cylinder — M/D blue-grey steel, shaded with a ROUND
    cross-section (a bright lit highlight just left of centre fading to deep `d`
    on the far right) so it reads as a curved column, not a flat slab. A clear `c`
    SIGHT-GLASS channel runs up the LIT-LEFT (cols -4..-2) where the fractions show,
    edged with a thin soft glass line rather than a hard box so the curve survives.
    The foot is clipped to the base roof (`b`) so the column rests ON the base."""
    cylinder(c, CX, TOP_Y, RX, COL_H,
             top="L", side_l="M", side_r="D", outline="K", ry=RY)

    # Per-column ROUND steel shading. Map the horizontal offset to a curved bright
    # -> dark ramp (Lambert-ish) so the cylinder reads volumetric. The sight-glass
    # occupies a narrow lit-left channel.
    GL0, GL1 = -4, -2                                   # sight-glass channel cols
    for col in range(-RX, RX + 1):
        t = 1 - (col / RX) ** 2
        if t < 0:
            continue
        edge = RY * (t ** 0.5)
        y0 = int(TOP_Y + edge)
        # curved shade ramp across the round body
        if GL0 <= col <= GL1:
            ch = "c"                                    # clear glass channel
        elif col == GL0 - 1 or col == -RX:
            ch = "M"                                    # lit rim just left of glass
        elif col == GL1 + 1:
            ch = "L"                                    # bright steel highlight band
        elif col <= 1:
            ch = "M"
        elif col == 2:
            ch = "D"
        elif col == 3:
            ch = "D"
        else:
            ch = "d"                                    # deep shaded far-right
        x = CX + col
        for y in range(y0, BASE_Y + 1):
            c.set(x, y, ch)

    # bright W rim glint along the back-upper arc of the top ellipse
    for a in range(186, 360, 5):
        x = CX + RX * math.cos(math.radians(a))
        y = TOP_Y + RY * math.sin(math.radians(a))
        c.set(x, y, "W")

    # soft glass edges for the sight-glass channel: a thin K seam each side (NOT a
    # full hard box) so it reads as a recessed glazed strip while the round shading
    # to its right keeps the cylinder feeling curved.
    gx0, gx1 = CX + GL0, CX + GL1
    gy0 = int(wall_top(GL0)) + 1
    gy1 = BASE_Y - 1                          # full-height sight-glass down the column
    for y in range(gy0, gy1 + 1):
        c.set(gx0 - 1, y, "d")        # left shadow seam (recess)
        c.set(gx1 + 1, y, "K")        # right K seam (glass edge against bright steel)
    c.line((gx0, gy0), (gx1, gy0), "K")
    c.line((gx0, gy1), (gx1, gy1), "K")
    return (gx0, gx1, gy0, gy1)


# ── K horizontal TRAY BANDS (the fractionation plates) every ~5px ─────────────
def tray_bands(c):
    """Thin K tray-plate bands ringing the column every ~5px — the fractionation
    trays. Drawn across the steel only (NOT over the sight-glass channel) with a
    1px L highlight above each so they read as stacked plates, not just lines."""
    for ty in range(TOP_Y + 7, BASE_Y - 2, 5):
        for col in range(-RX, RX + 1):
            t = 1 - (col / RX) ** 2
            if t < 0:
                continue
            x = CX + col
            if -RX + 1 <= col <= -2:           # skip the glass channel
                continue
            # ring follows a faint front-arc curve for roundness
            yy = ty + int((1 - t) * 1.4)
            c.set(x, yy, "K")
            if c.px[yy - 1][x] in ("M", "D", "L"):
                c.set(x, yy - 1, "L" if col <= 1 else "M")


# ── SIGNATURE: stacked separating FRACTIONS in the sight-glass ────────────────
def fractions(c, glass):
    """The hero: up the clear sight-glass the mixture separates into stacked
    colored bands grading bottom(heavy)->top(light vapor): r/G heavy -> g -> c ->
    h/W light. One mid band is lit brighter (O/h) = the optimized cut, with a small
    o draw-off tap/arrow pulling it out a side pipe."""
    gx0, gx1, gy0, gy1 = glass
    span = gy1 - gy0
    # band boundaries from bottom (heavy) to top (light), as fractions of span
    # (col, fill, edge-highlight) heaviest first
    bands = [
        (0.00, 0.18, "r", "G"),   # heaviest residue, violet-deep
        (0.18, 0.38, "G", "g"),   # heavy
        (0.38, 0.58, "g", "c"),   # mid  (the OPTIMIZED cut lands just above)
        (0.58, 0.78, "c", "h"),   # light
        (0.78, 1.00, "h", "W"),   # lightest vapor near the top
    ]
    for f0, f1, fill, edge in bands:
        y_a = int(gy1 - f1 * span)   # higher band = smaller y
        y_b = int(gy1 - f0 * span)
        for y in range(y_a, y_b):
            for x in range(gx0, gx1 + 1):
                c.set(x, y, fill)
        # clean ruled boundary line (the meniscus between fractions)
        for x in range(gx0, gx1 + 1):
            c.set(x, y_a, edge)

    # the OPTIMIZED CUT — light the mid band (third, the "best cut") brighter so a
    # bright O band stands out of the stack as the selected fraction.
    cut_y0 = int(gy1 - 0.56 * span)
    cut_y1 = int(gy1 - 0.42 * span)
    for y in range(cut_y0, cut_y1):
        for x in range(gx0, gx1 + 1):
            c.set(x, y, "O")
    c.line((gx0, cut_y0), (gx1, cut_y0), "h")       # bright meniscus over the cut
    c.line((gx0, cut_y1), (gx1, cut_y1), "h")

    # a small o draw-off TAP + arrow pulling the lit cut out to the LEFT (lit side,
    # clear of the steel) so the optimization read isn't buried in the dark steel.
    tapy = (cut_y0 + cut_y1) // 2
    c.set(gx0 - 2, tapy, "o")                       # pipe stub out the glass jamb
    c.set(gx0 - 3, tapy, "o")
    c.set(gx0 - 4, tapy, "O")                       # arrowhead
    c.set(gx0 - 4, tapy - 1, "O")
    c.set(gx0 - 4, tapy + 1, "r")
    c.set(gx0 - 5, tapy, "o")

    # a faint h glass sheen down the lit jamb so it reads as glass over liquid
    for y in range(gy0 + 1, gy1, 3):
        if 0 <= y < 64 and c.px[y][gx0] not in ("O",):
            c.set(gx0, y, "h")


# ── draw-off PIPES tapping out at different tray heights (left/back side) ──────
def draw_pipes(c):
    """Two short clean draw-off pipes tapping out of the column's shaded RIGHT edge
    at two tray heights: a 1px K tap nipple, then a 2-step M pipe with a `d` shade
    that elbows down a few px and stops — the product take-offs, kept compact so
    they read as pipes hugging the column, not dribbles."""
    rcol = CX + RX                       # column's right outline column
    for ty, drop in ((TOP_Y + 15, 5), (TOP_Y + 23, 4)):
        # tap nipple out of the column wall
        c.set(rcol, ty, "K")
        c.set(rcol + 1, ty, "M")
        # pipe steps down-right then straight down a short way (elbow), with shade
        x, y = rcol + 1, ty
        for k in range(1, drop + 1):
            y += 1
            if k <= 2:
                x += 1                   # angle out a couple px first
            c.set(x, y, "M")
            if c.px[y][x - 1] == ".":
                c.set(x - 1, y, "d")
        c.set(x, y + 1, "d")             # pipe foot


# ── condenser DRUM cap + reflux pipe + violet VAPOR PLUME (roofline) ──────────
def condenser_and_plume(c):
    """A small D reflux-condenser drum capping the column top, a thin c reflux pipe
    looping from it back down one side, and the hero violet VAPOR PLUME curling up
    off the condenser vent (h -> O, lightening as it rises)."""
    # small horizontal condenser drum perched on the column top (a short cylinder
    # lying along the back — render as a compact capsule of D steel)
    dcx, dcy = CX + 1, TOP_Y - 3
    for col in range(-3, 4):
        h = 2 if abs(col) < 3 else 1
        for k in range(h):
            c.set(dcx + col, dcy + k, "D" if col <= 0 else "d")
        c.set(dcx + col, dcy - 1, "M")           # lit top of the drum
    # drum end-caps + outline
    c.set(dcx - 4, dcy, "K"); c.set(dcx - 4, dcy + 1, "K")
    c.set(dcx + 4, dcy, "K"); c.set(dcx + 4, dcy + 1, "K")
    for col in range(-3, 4):
        c.set(dcx + col, dcy - 2, "K")
        c.set(dcx + col, dcy + 2, "K")
    c.set(dcx - 3, dcy - 1, "L")                  # rim glint

    # a tidy c reflux pipe: a small loop off the drum's LEFT end dropping back into
    # the column (a clean 2px curl, not scattered dots).
    rlx = dcx - 5
    c.set(rlx, dcy, "c"); c.set(rlx, dcy + 1, "c")          # down off the drum end
    c.set(rlx, dcy + 2, "g"); c.set(rlx + 1, dcy + 3, "g")  # elbow
    c.set(rlx + 2, dcy + 3, "c"); c.set(rlx + 3, dcy + 3, "g")  # back toward column
    c.set(rlx + 1, dcy + 2, "h")                             # tiny glint on the loop

    # a short vent stub on top of the drum the plume rises from
    vx, vy = dcx, dcy - 2
    c.set(vx, vy - 1, "M"); c.set(vx, vy - 1, "M")
    c.set(vx, vy, "K")

    # ── the hero violet VAPOR PLUME curling up off the vent: a bold 2px wisp that
    # rises and broadens, h tinted near the vent -> violet O/o up high (drifting
    # ChemWorks vapor). Stays on-canvas (vent is low enough now).
    plume = [
        (0, "h", "c"), (1, "h", "c"), (2, "O", "h"), (3, "O", "o"),
        (4, "o", "O"), (5, "O", "o"), (6, "o", "O"), (7, "O", "o"),
        (8, "o", None), (9, "O", None),
    ]
    for k, body, side in plume:
        sway = 1.7 * math.sin(k * 0.6)
        x = int(round(vx + sway))
        y = vy - 1 - k
        if y < 0:
            continue
        c.set(x, y, body)
        if side is not None and k % 2 == 1:
            c.set(x + 1, y, side)              # broaden on alternating rows
        if k in (4, 7):
            c.set(x - 1, y, "o")              # a couple of side curls
    # a soft detached puff lifting off the very top
    c.set(vx + 2, vy - 11, "O")
    c.set(vx + 1, vy - 12, "o")


# ── the GLOWING control-room opening on the base's SHADED RIGHT face ──────────
def right_opening(c, b):
    """The hero entry: a K-framed control-room WINDOW + DOOR on the base block's
    SHADED RIGHT face, made to GLOW — a g->c glass window over a bright o/O violet
    interior so it reads on the shaded side, with an h reflection. Drawn AFTER the
    base (it sits on the front-right face)."""
    pt = b.right_pt
    # --- a tall glowing control-room WINDOW (the lit interior) ---
    wu0, wu1, wv0, wv1 = 0.10, 0.52, 2.4, b.h - 1.4
    c.fill_poly([pt(wu0, wv0), pt(wu1, wv0), pt(wu1, wv1), pt(wu0, wv1)], "K")   # frame
    c.fill_poly([pt(wu0 + 0.05, wv0 + 0.6), pt(wu1 - 0.05, wv0 + 0.6),
                 pt(wu1 - 0.05, wv1 - 0.4), pt(wu0 + 0.05, wv1 - 0.4)], "g")     # glass
    # violet interior glow bleeding up from the floor of the window
    c.fill_poly([pt(wu0 + 0.08, wv1 - 3.0), pt(wu1 - 0.08, wv1 - 3.0),
                 pt(wu1 - 0.08, wv1 - 0.4), pt(wu0 + 0.08, wv1 - 0.4)], "o")
    c.line(pt(wu0 + 0.08, wv1 - 0.7), pt(wu1 - 0.08, wv1 - 0.7), "O")           # bright sill glow
    c.line(pt(wu0 + 0.5, wv0 + 1.2), pt(wu0 + 0.5, wv1 - 1.0), "c")             # mullion lit
    c.line(pt(wu0 + 0.12, wv0 + 1.2), pt(wu0 + 0.12, wv1 - 2.0), "h")           # h reflection streak

    # --- the DOOR alongside (right of the window), also glowing ---
    du0, du1, dv0, dv1 = 0.60, 0.90, 3.4, b.h - 0.3
    c.fill_poly([pt(du0, dv0), pt(du1, dv0), pt(du1, dv1), pt(du0, dv1)], "K")  # frame
    c.fill_poly([pt(du0 + 0.05, dv0 + 0.5), pt(du1 - 0.05, dv0 + 0.5),
                 pt(du1 - 0.05, dv1), pt(du0 + 0.05, dv1)], "c")                # glass leaf
    c.line(pt(du0 + 0.05, dv0 + 1.2), pt(du1 - 0.05, dv0 + 1.2), "h")          # top glint
    # o glow spilling out the door foot
    c.line(pt(du0 + 0.1, dv1 - 0.3), pt(du1 - 0.1, dv1 - 0.3), "o")
    c.set(int(round(pt(0.75, dv0 - 0.2)[0])),
          int(round(pt(0.75, dv0 - 0.2)[1])) - 1, "O")                          # head glow

    # --- soft o glow pooling on the ground in front of the lit right face ---
    base_pt = pt(0.5, b.h)
    gx, gy = int(round(base_pt[0])), int(round(base_pt[1]))
    for dx in range(-3, 6):
        c.set(gx + dx, gy + 2, "o" if abs(dx) < 3 else "r")
    c.set(gx, gy + 3, "o")


# ── lit-left base detail (plainer) + reboiler glow + purity gauge ─────────────
def left_detail_and_gauge(c, b):
    """Keep the LIT-LEFT base face plainer per the blueprint — just a small vent
    grille — and add the o REBOILER GLOW (heat in) at the base foot plus a tiny
    c/g PURITY GAUGE climbing toward an O target mark."""
    pt = b.left_pt
    # a plain small vent grille on the lit-left face
    for k in range(3):
        c.line(pt(0.28, 3.0 + k * 1.6), pt(0.62, 3.0 + k * 1.6), "d")
    c.line(pt(0.28, 2.4), pt(0.62, 2.4), "D")
    c.line(pt(0.28, 7.6), pt(0.62, 7.6), "K")
    for u in (0.28, 0.62):
        c.line(pt(u, 2.4), pt(u, 7.6), "K")

    # o REBOILER GLOW — a warm violet heat-uplight at the base of the column foot
    # (heat in), pooling on the skirt under the free-standing column.
    for col in range(-RX, RX + 1):
        x = CX + col
        t = 1 - (col / RX) ** 2
        if t < 0:
            continue
        edge = RY * (t ** 0.5)
        fy = BASE_Y + int(edge)
        if abs(col) <= 4:
            c.set(x, fy - 1, "o" if abs(col) < 3 else "r")
            if abs(col) < 2:
                c.set(x, fy, "O")

    # tiny c/g PURITY GAUGE on the lit-left base wall climbing to an O target
    g0 = pt(0.78, 3.2)
    gx, gy = int(round(g0[0])), int(round(g0[1]))
    c.set(gx, gy - 1, "K"); c.set(gx + 1, gy - 1, "O")    # O target mark at top
    c.set(gx, gy, "K"); c.set(gx + 1, gy, "c")            # gauge climbing
    c.set(gx, gy + 1, "K"); c.set(gx + 1, gy + 1, "g")
    c.set(gx, gy + 2, "K"); c.set(gx + 1, gy + 2, "G")
    c.set(gx, gy + 3, "K"); c.set(gx + 1, gy + 3, "K")


def build():
    c = Canvas()
    b = BASE_BOX
    base_shadow(c)              # contact shadow + column-foot skirt (under/back)
    reboiler_base(c, b)         # low reboiler BASE BLOCK at front-LEFT (drawn behind column)
    glass = column(c, b)        # the very tall slender free-standing steel COLUMN + sight-glass
    tray_bands(c)               # K fractionation tray plates ringing the column
    fractions(c, glass)         # SIGNATURE: stacked separating colored fractions + optimized cut
    draw_pipes(c)               # M product draw-off pipes at tray heights
    condenser_and_plume(c)      # D condenser drum + c reflux pipe + violet VAPOR PLUME
    right_opening(c, b)         # GLOWING control-room window+door on the base's SHADED RIGHT
    left_detail_and_gauge(c, b) # plainer lit-left vent + reboiler glow + purity gauge
    spec = {"width": 64, "height": 64, "palette": CHEM, "rows": c.rows()}
    out = "/path/to/scienium/art/src/buildings/chemworks_distillation-tower.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
