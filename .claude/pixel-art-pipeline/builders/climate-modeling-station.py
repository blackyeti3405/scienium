#!/usr/bin/env python3
"""
Climate Modeling Station — TerraBase economy building (BESPOKE form, STANDARD role).

A WIDE LOW SIMULATION HALL capped by a round OPEN ROOF OCULUS — a circular sky-hole
cut in the center of a broad flat M/L compute-hall deck, glowing c/g from the sim
light below, through which the signature hologram floats up. Deliberately NOT the
gateway cube, NOT a rooftop globe/sphere (Greenhouse owns those), and NOT the
ChemWorks stepped data-center block — a low broad hall with a glowing circular hole.

  • Opening side = LEFT (lit): the hero is a K-framed control DOOR + a wide operator
    WINDOW on the LIT-LEFT face — M/L wall, c glass, o "SIM" placard, c/g screen-glow
    inside. The SHADED RIGHT face stays plainer: a clean wall with one d vent strip
    and a low ribbed bank of cooling fins along the back-right roof edge (field compute
    hardware) with c blink lights.
  • Signature (one-of-one): rising out of the oculus, a hovering holographic EXPLODED
    STACK of Earth-system layers floats apart — separate horizontal sheets for ocean
    (g), land (o/M), atmosphere (c/h) and ice (W/h) — with teal & amber FLOW arrows
    passing between the sheets, plus an OPTIMIZATION FORK off to one side whose best
    branch lights bright g/O (best outcome) while the other dims to d, beside a faint
    c/h future-Earth GHOST disc and a tiny o "OPT" readout.

Composed from art/isobuild.{Box,cylinder} — NO iso.draw_cube / base_windows.
Draw order (painter's): contact shadow + hall body -> roof oculus rim (recessed K
ring) + cooling-fin bank -> LIT-LEFT hero door/window -> the hovering exploded
Earth-system layer stack + inter-layer flows + optimization fork (on top).
"""
import os
import sys
import json
import math

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box, cylinder

TERRA = {"K": "#20190f", "W": "#efe6cf", "L": "#d6c8a0", "M": "#b09a6e", "D": "#7e6c47", "d": "#54462c",
         "h": "#d6f2ea", "c": "#a4e2d4", "g": "#34b6a2", "G": "#1d8474",
         "o": "#e0a850", "O": "#ffce80", "r": "#9a5e1e"}


# ── small helper: stamp a tiny pixel block ('.' = skip) ───────────────────────
def _stamp(c, x0, y0, rows):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


# ── the WIDE LOW SIMULATION HALL (wide footprint, short walls) ────────────────
# Back-top corner high enough to leave headroom for the hovering layer stack.
HALL = Box(top=(34, 23), wx=12, wy=10, h=11)


def hall(c, b):
    """Draw the broad low compute-hall: M/L walls (modern compute feel), a flat L
    roof deck, bright back roof edges. The oculus + signature are added after."""
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # a brighter L wash band low on the LIT-LEFT wall so the hall reads modern/clean
    for u in (0.06, 0.94):
        c.line(b.left_pt(u, 0.6), b.left_pt(u, b.h - 0.4), "L")
    return b


# ── ROOF OCULUS — a K-rimmed circular sky-hole recessed into the roof deck ─────
def oculus(c, b):
    """A round opening cut in the center of the roof deck: a short K-rimmed cylinder
    ring set into the roof, its recessed interior glowing c/g from the sim light
    below. Returns (cx, cy) of the oculus mouth centre — where the hologram rises."""
    cx, cy = b.roof_pt(0.5, 0.46)
    cx, cy = int(round(cx)), int(round(cy))
    rx, ry = 7, 3                       # 2:1 iso ellipse mouth
    # 1) the recessed glowing well: a darker->teal gradient ellipse sunk in the deck
    for yy in range(-ry, ry + 1):
        t = 1 - (yy / ry) ** 2
        if t < 0:
            continue
        half = int(rx * (t ** 0.5))
        for xx in range(-half, half + 1):
            # radial position 0(center)->1(rim)
            rad = max(abs(xx) / rx, abs(yy) / ry)
            if rad < 0.42:
                ch = "g"                # bright sim-light core
            elif rad < 0.66:
                ch = "G"                # deeper teal
            else:
                ch = "d"                # dark recessed inner wall of the well
            c.set(cx + xx, cy + yy, ch)
    # a few c sparkle pixels in the glowing core (data shimmer)
    for (dx, dy) in [(-2, 0), (1, -1), (3, 1), (-3, 1), (0, 1)]:
        c.set(cx + dx, cy + dy, "c")
    # 2) the K rim of the mouth (top ellipse outline)
    for a in range(0, 360, 5):
        x = cx + rx * math.cos(math.radians(a))
        y = cy + ry * math.sin(math.radians(a))
        c.set(x, y, "K")
    # 3) a thin lit inner lip on the back-left arc, shaded on the front-right arc
    for a in range(190, 350, 7):
        x = cx + (rx - 1) * math.cos(math.radians(a))
        y = cy + (ry - 1) * math.sin(math.radians(a))
        c.set(x, y, "M")
    for a in range(10, 170, 7):
        x = cx + (rx - 1) * math.cos(math.radians(a))
        y = cy + (ry - 1) * math.sin(math.radians(a))
        c.set(x, y, "d")
    return cx, cy


# ── COOLING-FIN BANK — low ribbed compute hardware on the back-right roof edge ─
def cooling_fins(c, b):
    """A thin low ribbed strip of cooling fins hugging the back-right roof edge
    (field compute hardware without being a data-center block): D/M ribs with a few
    c blink lights. Sits between the back corner and the right corner, behind the
    oculus so it reads as roof-edge hardware."""
    # A continuous low base strip running along the back-right roof edge (top corner
    # -> right corner, the +right iso axis: +2x,+1y per step), topped by short
    # vertical fin RIBS so it reads as a ribbed cooling bank, not scattered dots.
    n = 6                                    # trimmed the longest right-most drip fin to calm the right side near the fork
    pts = []
    for k in range(n):
        x = b.r_top[0] + 4 + k * 2.0
        y = b.r_top[1] + 2.0 + k * 1.0
        pts.append((int(round(x)), int(round(y))))
    # base strip: a 2px-tall D/d ledge under the ribs, K underline
    for (x, y) in pts:
        c.set(x, y, "D")
        c.set(x, y + 1, "d")
        c.set(x, y + 2, "K")
    # vertical fin ribs rising 2-3px off the base (alternating M lit / D)
    for i, (x, y) in enumerate(pts):
        rib = 3 if i % 2 == 0 else 2
        for t in range(rib):
            c.set(x, y - 1 - t, "M" if i % 2 == 0 else "D")
        c.set(x, y - 1 - rib, "K")          # K cap on each rib
        if i in (2, 4):
            c.set(x, y - 2 - rib, "c")      # a couple teal blink lights atop fins


# ── HERO opening on the LIT-LEFT face: control door + operator window ──────────
def left_face(c, b):
    """The assigned LEFT opening on the LIT-LEFT face: a wide K-framed operator
    WINDOW (c glass, c/g screen-glow inside) + a control DOOR beside it, an o 'SIM'
    placard band over them, and warm o glow spilling at the door foot."""
    pt = b.left_pt
    # --- wide operator WINDOW (left part of the face) ---
    wu0, wu1, wv0, wv1 = 0.10, 0.52, 3.0, b.h - 2.4
    c.fill_poly([pt(wu0, wv0), pt(wu1, wv0), pt(wu1, wv1), pt(wu0, wv1)], "K")          # frame
    c.fill_poly([pt(wu0 + 0.04, wv0 + 0.6), pt(wu1 - 0.04, wv0 + 0.6),
                 pt(wu1 - 0.04, wv1 - 0.4), pt(wu0 + 0.04, wv1 - 0.4)], "c")           # c glass
    # c/g screen-glow content inside (sim displays): a few horizontal data bars
    for k, gv in enumerate((wv0 + 1.4, wv0 + 2.6, wv0 + 3.8)):
        ch = "g" if k != 1 else "G"
        c.line(pt(wu0 + 0.10, gv), pt(wu1 - 0.18 - 0.04 * k, gv), ch)
    c.line(pt(wu0 + 0.10, wv0 + 1.0), pt(wu1 - 0.10, wv0 + 1.0), "h")                  # top glint
    c.line(pt(wu0 + 0.30, wv0 + 1.2), pt(wu0 + 0.30, wv1 - 1.0), "K")                  # mullion
    c.line(pt(wu0 + 0.13, wv0 + 1.2), pt(wu0 + 0.13, wv1 - 2.0), "h")                  # reflection streak
    # --- control DOOR (right part of the face) ---
    du0, du1, dv0, dv1 = 0.62, 0.86, 3.8, b.h - 0.3
    c.fill_poly([pt(du0, dv0), pt(du1, dv0), pt(du1, dv1), pt(du0, dv1)], "K")          # frame
    c.fill_poly([pt(du0 + 0.04, dv0 + 0.5), pt(du1 - 0.04, dv0 + 0.5),
                 pt(du1 - 0.04, dv1), pt(du0 + 0.04, dv1)], "G")                        # dark glass leaf
    c.line(pt(du0 + 0.04, dv0 + 1.1), pt(du1 - 0.04, dv0 + 1.1), "c")                  # top glint
    c.line(pt(du0 + 0.5, dv0 + 1.4), pt(du0 + 0.5, dv1 - 0.6), "g")                    # lit centre seam
    # warm o glow spilling out the door foot onto the ground
    base = pt(0.74, dv1 + 0.3)
    bx, by = int(round(base[0])), int(round(base[1]))
    for dx, ch in [(-2, "r"), (-1, "o"), (0, "O"), (1, "o"), (2, "r")]:
        c.set(bx + dx, by, ch)
    # --- o 'SIM' placard band over the openings (warm trim) ---
    c.line(pt(0.10, 2.2), pt(0.86, 2.2), "o")
    c.line(pt(0.10, 1.4), pt(0.86, 1.4), "K")
    c.line(pt(0.10, 2.6), pt(0.86, 2.6), "K")
    # three tiny O placard ticks (the 'SIM' lights)
    for u in (0.24, 0.46, 0.68):
        p = pt(u, 1.9)
        c.set(int(round(p[0])), int(round(p[1])), "O")
    # one d vent strip low on the SHADED-RIGHT face (keep right plainer)
    rpt = b.right_pt
    for k in range(3):
        c.line(rpt(0.30, 5.0 + k * 1.5), rpt(0.66, 5.0 + k * 1.5), "d")
    c.line(rpt(0.30, 4.4), rpt(0.66, 4.4), "K")
    for u in (0.30, 0.66):
        c.line(rpt(u, 4.4), rpt(u, 8.6), "K")


# ── SIGNATURE — hovering exploded Earth-system layer stack + optimization fork ─
def layer_stack(c, ocx, ocy):
    """Rising out of the oculus, a hovering holographic EXPLODED STACK of four
    separated horizontal sheets — ocean (g), land (o/M), atmosphere (c/h), ice
    (W/h) — each a thin tinted slab with a K edge, floating apart with gaps. Teal
    & amber FLOW arrows pass between sheets. An optimization FORK off to one side
    lights its best branch g/O (best outcome) while the other dims; a faint c/h
    future-Earth GHOST disc + a tiny o 'OPT' readout sit beside the fork."""
    # a faint, BROKEN vertical projection beam from the oculus mouth up toward the
    # ocean sheet — a couple of dashed teal pixels only, leaving a clear dark void so
    # the ocean sheet HOVERS above the hole (does NOT pour into the oculus glow).
    for yy in (ocy - 3, ocy - 5):
        c.set(ocx, yy, "c")
    # darken the lip just under the ocean sheet so its K underside reads as a free edge
    c.set(ocx, ocy - 6, "K")
    c.set(ocx - 1, ocy - 6, "G")
    c.set(ocx + 1, ocy - 6, "G")

    # Each sheet is a FLAT thin floating slab. Drawn bottom (nearest oculus) -> top.
    # Keep them VERY flat (front tip only ~2px below centre) and give a single-row
    # K-edged underside so adjacent sheets stay clearly SEPARATED with a dark void
    # between each (distinct horizontal holographic sheets, NOT a stacked blob).
    def sheet(cy, hw, fill, edge, under, vy=2):
        """A flat iso sheet centred on (ocx, cy), half-width hw. `under` = the
        1-row underside tint colour (depth). K-edged top diamond. `vy` capped low
        so the slab stays thin and the inter-sheet gap reads as clear void."""
        L = (ocx - hw, cy)
        R = (ocx + hw, cy)
        T = (ocx, cy - vy)
        F = (ocx, cy + vy)
        c.fill_poly([T, R, F, L], fill)
        c.fill_poly([T, L, F], edge)              # lit back-left half brighter
        # a single tinted underside row just under the front edges (thin slab depth)
        c.line((L[0], L[1] + 1), (F[0], F[1] + 1), under)
        c.line((F[0], F[1] + 1), (R[0], R[1] + 1), under)
        for a, bb in [(T, R), (R, F), (F, L), (L, T)]:
            c.line(a, bb, "K")
        return L, T, R, F, vy

    # exploded gaps: large enough that a clear hologram VOID shows between sheets.
    # ocean lifted well clear of the oculus mouth; even spacing top-to-bottom.
    base_y = ocy - 9        # ocean sheet sits clearly ABOVE the oculus mouth (gap below)
    gap = 7
    #   bottom OCEAN (g, widest) -> LAND (o) -> ATMOSPHERE (c) -> top ICE (h/W)
    s_ocean = sheet(base_y,            8, "g", "c", "G", vy=2)
    s_land  = sheet(base_y - gap,      6, "o", "M", "D", vy=1)   # thin flat land slab
    s_atmos = sheet(base_y - 2 * gap,  5, "c", "h", "g", vy=2)
    s_ice   = sheet(base_y - 3 * gap,  4, "h", "W", "c", vy=2)

    # surface texture hints so each sheet reads as its Earth system
    # ocean: a couple deep-G ripples
    c.set(ocx - 3, base_y, "G"); c.set(ocx + 3, base_y, "G")
    # land: two tiny o continent specks ONLY (flat slab, no r/D clutter)
    c.set(ocx - 2, base_y - gap, "o"); c.set(ocx + 2, base_y - gap, "o")
    # atmosphere: faint h cloud wisps
    c.set(ocx - 2, base_y - 2 * gap, "h"); c.set(ocx + 2, base_y - 2 * gap, "h")
    # ice: bright W cap glint
    c.set(ocx, base_y - 3 * gap, "W")

    # ── INTER-LAYER FLOWS: small teal(up) & amber(down) flow arrows sitting in the
    # VOID between sheets (so the gaps read as deliberate exchange channels).
    # teal up-arrow in the ocean->land gap, on the lit-left of the stack
    fx = ocx - 5
    gy1 = base_y - gap + 2          # midpoint of ocean->land void
    _stamp(c, fx, gy1 - 2, [
        ".c.",
        "ccc",
        ".c.",
    ])
    # amber down-arrow in the atmosphere->land gap, on the right
    ax = ocx + 3
    gy2 = base_y - 2 * gap + 2      # midpoint of land->atmosphere void
    _stamp(c, ax, gy2 - 1, [
        ".o.",
        "ooo",
        ".o.",
    ])
    # a small teal up-blip in the atmosphere->ice gap
    c.set(ocx - 1, base_y - 3 * gap + 3, "c")
    c.set(ocx - 1, base_y - 3 * gap + 2, "h")

    # ── OPTIMIZATION FORK off to the RIGHT of the stack: a branching forecast that
    # splits at a junction node into TWO clearly contrasting paths — one lit bright
    # g/O (the chosen best outcome), one DIM/dark (the rejected scenario). The
    # contrast of bright-vs-dim is what makes the "one outcome wins green" read.
    fkx = ocx + 9          # fork JUNCTION node, clear to the right of the sheets
    fky = base_y - gap - 1
    c.set(fkx - 1, fky, "g")                       # short lit stem from the stack -> junction
    c.set(fkx - 2, fky, "c")
    c.set(fkx, fky, "G")                           # the junction / split node
    # BEST branch: angles up-right, BRIGHT green ending in an O best-outcome node
    best = [(fkx + 1, fky - 1), (fkx + 2, fky - 2), (fkx + 3, fky - 3), (fkx + 4, fky - 4)]
    for (bx, by) in best:
        c.set(bx, by, "g")
    c.set(best[1][0], best[1][1] - 1, "h")         # bright glow along the winning path
    c.set(best[-1][0] + 1, best[-1][1] - 1, "O")  # bright best-outcome node (winner)
    c.set(best[-1][0] + 1, best[-1][1], "o")
    # LOSING branch: angles DOWN-right, clearly DIM (no glow) — dim-teal G fading to
    # d with a small dark K dead-end tip, ~4px long, so it reads as a rejected path.
    lose = [(fkx + 1, fky + 1), (fkx + 2, fky + 2), (fkx + 3, fky + 3), (fkx + 4, fky + 4)]
    cols = ["G", "d", "d", "d"]                    # fades from dim teal to dark
    for (lx, ly), col in zip(lose, cols):
        c.set(lx, ly, col)
    c.set(lose[-1][0] + 1, lose[-1][1] + 1, "K")  # dark dead-end tip (rejected)

    # ── FUTURE-EARTH GHOST disc beside/above the fork (the previewed best-outcome
    # state). Drawn as an EXPLICIT little disc: a clean c rim ring enclosing an h
    # interior with a small g/G land+ocean speck, so it reads unmistakably as a tiny
    # forecast Earth rather than a faint pixel cluster. Radius 3, still well clear of
    # the main exploded stack so it stays secondary.
    gcx, gcy = fkx + 5, fky - 5
    R2 = 9                                         # radius-3 disc (xx^2+yy^2 <= 9)
    for yy in range(-3, 4):
        for xx in range(-3, 4):
            d2 = xx * xx + yy * yy
            if d2 <= R2:
                # outer ring -> bright c rim; interior -> faint h body
                c.set(gcx + xx, gcy + yy, "c" if d2 >= R2 - 4 else "h")
    # a small g/G land+ocean speck on the previewed Earth (so it reads as a world)
    c.set(gcx, gcy, "g")
    c.set(gcx - 1, gcy, "G")
    c.set(gcx + 1, gcy - 1, "g")
    c.set(gcx, gcy + 1, "G")
    # tiny o 'OPT' readout tick under the ghost
    c.set(gcx - 1, gcy + 4, "o")
    c.set(gcx, gcy + 4, "O")
    c.set(gcx + 1, gcy + 4, "o")


# ── contact shadow under the whole hall (drawn first) ─────────────────────────
def contact_shadow(c, b):
    scx = int(round(b.w_front[0]))
    scy = int(round(b.w_front[1])) + 1
    for x in range(scx - 22, scx + 22):
        for y in range(scy - 2, scy + 3):
            ex = (x - scx) / 22.0
            ey = (y - scy) / 2.4
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")


def build():
    c = Canvas()
    b = HALL
    contact_shadow(c, b)        # soft K ground shadow under the broad hall (back/under)
    hall(c, b)                  # the WIDE LOW simulation hall body (M/L walls, L deck)
    ocx, ocy = oculus(c, b)     # round K-rimmed glowing roof OCULUS in the deck centre
    cooling_fins(c, b)          # low ribbed cooling-fin bank on the back-right roof edge
    left_face(c, b)             # HERO control door + operator window on the LIT-LEFT face
    layer_stack(c, ocx, ocy)    # SIGNATURE: exploded Earth-system layer stack + opt. fork

    spec = {"width": 64, "height": 64, "palette": TERRA, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/terrabase_climate-modeling-station.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
