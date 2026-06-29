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

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

# Base TerraBase palette (shared keys) + the EVOLVED-accent keys reserved for the
# upgrade stages only (chars NOT used by the base palette, so they appear in NO
# stage-1 sprite and climate-modeling-station.png stays byte-identical). These four
# exact keys+hexes are the lab-wide terrabase evolved accents (see sampling-station):
#   b  deep basalt/bedrock  — matured warm structure tone for t3+ new masses
#   e  energized mineral-seismic glow (mid)    E  energized glow (bright) — t4/t5 power
#   q  premium survey gold  — t5 flourish ONLY (NOT a whole-building recolor)
TERRA = {"K": "#20190f", "W": "#efe6cf", "L": "#d6c8a0", "M": "#b09a6e", "D": "#7e6c47", "d": "#54462c",
         "h": "#d6f2ea", "c": "#a4e2d4", "g": "#34b6a2", "G": "#1d8474",
         "o": "#e0a850", "O": "#ffce80", "r": "#9a5e1e",
         "b": "#3a3326", "e": "#5fe0c4", "E": "#c4fff0", "q": "#f3c63a"}


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

    # Return the stack geometry so the cumulative evolved stages (t2 orbital bead,
    # t5 twin-hemisphere model) re-anchor from the SAME source — never a hardcoded
    # second guess. (ocx, ocy) is the oculus mouth; base_y/gap drive every sheet;
    # the ocean sheet sits at base_y (widest), the ice sheet at base_y-3*gap (top).
    return {"ocx": ocx, "ocy": ocy, "base_y": base_y, "gap": gap,
            "ocean_hw": 8, "ice_y": base_y - 3 * gap}


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


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS climate-compute
# structure onto the prior form — never restarts, never recolors the whole building.
# Theme: a lone simulation hall matures into a fully powered, instrumented climate-
# modeling station. Colours mature stage by stage; gold (q) is a t5 flourish only.
# Each add lives in a DIFFERENT zone so nothing stacks into mush, every add is clamped
# on-canvas, and NONE collide with the centre exploded-layer-stack signature column:
#   t2  small functional add : a real roof SKY-RADIOMETER instrument (upward dish on a
#                              short plinth, back-left deck) feeding the model + a faint
#                              orbital SATELLITE BEAD riding a thin arc round the model
#   t3  structural add        : a server-blade COMPUTE ANNEX of louvered blade bays on
#                              the shaded-right flank, glowing faint g (the model's compute)
#   t4  major add             : a rooftop COOLING-TOWER chiller stack on b legs venting an
#                              e cooling halo beside a finned e-glow RADIATOR wall
#   t5  crowning feature      : the model doubles into a TWIN-HEMISPHERE climate model
#                              (atmosphere + ocean) with bright E circulation pulses +
#                              e jet-stream arcs, a gold orbit ring + gold armature
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_sky_radiometer(c, b):
    """t2 — SMALL FUNCTIONAL ADD (the REAL on-theme element, review r2): a small upward-
    looking SKY RADIOMETER instrument bolted onto the clear BACK-LEFT roof deck — a stout
    2-3px `D`/`M` plinth standing on the slab, topped by a little tilted dish CUP (D back,
    L lit face) aimed up-LEFT at the open sky with a `c` feed-horn glint. A real new
    geometry mass (outline + fill), NOT a recolor: a sky-radiation sensor feeding the
    climate model. Seated on the BACK-LEFT deck (well left of the cooling-fin bank and
    clear BELOW the hovering orbital sensor stack at canvas centre, so it never occludes
    the signature). Base palette only (D/M/L/K + one c sensor glint) — no warm/gold here."""
    # anchor on the clear back-left roof slab (all-L deck, away from oculus/fins/centre)
    rp = b.roof_pt(0.125, 0.30)              # ≈ (23,31) back-left deck, clear patch
    px, py = int(round(rp[0])), int(round(rp[1]))
    # --- short plinth post standing ON the deck (a clean 2px column: lit M left, shaded
    #     D right, a K base sill + K feet so it reads crisply off the bright L deck) ---
    plinth_h = 4
    for t in range(plinth_h):
        c.set(px, py - t, "M")               # lit post core
        c.set(px + 1, py - t, "D")           # shaded right edge -> reads as a 2px post
    c.set(px - 1, py, "K"); c.set(px, py, "K"); c.set(px + 1, py, "K"); c.set(px + 2, py, "K")  # K base sill on deck
    head_y = py - plinth_h                     # the dish bowl sits atop the plinth
    # --- the tilted radiometer DISH BOWL aimed UP-LEFT at the open sky. A small upturned
    #     cup drawn as real outline+fill: a bright W/L lit upper-left rim catching the sky,
    #     an L/M bowl body, a D shaded under-curve, a K back-rim, and a c feed-horn eye on
    #     a short mast at the focus — unmistakably a sky-pointing sensor, not a recolor. ---
    _stamp(c, px - 3, head_y - 3, [
        "WL..",      # bright lit top rim (catches the sky)
        "LLMD",      # bowl mouth: lit-left -> shaded-right
        ".LMD",      # bowl body curving down-right
        "..K.",      # K under-rim / stem collar
    ])
    # K outline along the bowl's lower-left curve so the cup silhouettes off the deck
    c.set(px - 3, head_y - 2, "K")
    c.set(px - 2, head_y, "K")
    # c FEED-HORN eye on a 1px mast at the bowl focus (the radiometer detector) + a faint
    # h sky-catch glint on the rim — the teal eye reads it as a climate sky-sensor.
    c.set(px - 1, head_y - 2, "c")           # teal feed-horn detector eye
    c.set(px - 1, head_y - 3, "h")           # bright sky-catch glint above the eye
    c.set(px,     head_y - 1, "K")           # short feed-mast arm down to the bowl


def stage2_orbital_bead(c, sig):
    """t2 — SECONDARY ON-MODEL TOUCH (paired with the roof radiometer): the hovering
    exploded climate model gains a small ORBITAL SATELLITE BEAD that rides a thin DASHED
    elliptical orbit ARC around the lowest (ocean) sheet — a tiny lit cubesat body with a
    sun glint + a 1px c solar-panel wing, plus one faint constellation bead on the back-
    left of the arc. Augments the model subtly (on-theme) without touching the building
    mass below. NOTE (review r2): the solid c equatorial band + the warm O/o pulse pixels
    at (35,28/29) were removed — that band read as a flat recolor of the emission disc and
    the warm pixels read as stray gold. Re-anchored from the SAME stack geometry the
    signature returned (ocx, base_y, ocean_hw)."""
    ocx = sig["ocx"]
    oy = sig["base_y"]                       # ocean sheet centre row (the model's base)
    arx, ary = sig["ocean_hw"] + 2, 4        # orbit ellipse a touch wider than the sheet
    # a thin DASHED c orbit arc ringing the ocean sheet (every other step => dashes so it
    # reads as a discrete orbit ring, not a solid recolor). Clamped well inside the canvas.
    for a in range(0, 360, 18):
        x = int(round(ocx + arx * math.cos(math.radians(a))))
        y = int(round(oy + ary * math.sin(math.radians(a))))
        if 0 <= x <= 63 and 0 <= y <= 63 and (a // 18) % 2 == 0:
            c.set(x, y, "c")
    # the SATELLITE BEAD riding the orbit's front-right, drawn as a tiny lit body with a
    # h glint + a 1px c solar-panel wing behind it (a small cubesat catching the sun).
    bax = int(round(ocx + arx * math.cos(math.radians(35))))
    bay = int(round(oy + ary * math.sin(math.radians(35))))
    c.set(bax, bay, "h")                     # bright bead body
    c.set(bax + 1, bay, "c")                 # solar-panel wing / contrail
    c.set(bax - 1, bay, "W")                 # sun glint
    # a second smaller bead on the orbit's back-left, fainter (a constellation hint)
    bbx = int(round(ocx + arx * math.cos(math.radians(205))))
    bby = int(round(oy + ary * math.sin(math.radians(205))))
    c.set(bbx, bby, "c")


def stage3_compute_annex(c, b):
    """t3 — STRUCTURAL ADD: a slim SERVER-BLADE COMPUTE ANNEX bolted onto the SHADED-
    RIGHT flank of the hall — a low deep-basalt `b` housing of louvered blade bays
    glowing a faint g (the model's compute back-end), with a K plank skirt. A real new
    structural mass (its own little prism abutting the hall), kept LOW and to the RIGHT
    so it never fights the LIT-LEFT hero door/window or the centre signature. First use
    of the matured structure tone `b`."""
    # seat the annex against the RIGHT (shaded) face, its back-top corner partway up the
    # hall's right wall so its roofline breaks clearly PROUD of the lower-right wall and
    # it reads as a real bolt-on compute box, not a flush panel. Runs out toward the
    # front-right corner (long wx), kept slim (wy) and a step TALLER so it stands out.
    seat = b.right_pt(0.50, 1.2)
    sx, sy = int(round(seat[0])), int(round(seat[1]))
    annex = Box(top=(sx, sy), wx=4, wy=3, h=7)
    # body in matured basalt: the SHADED-RIGHT wall stays a clean deep-basalt `b` face
    # (a clear, unbroken first showing of the matured structure tone), the lit-left wall
    # carries the louver bank, D roof + M lit-back tri.
    annex.draw(c, roof="D", lwall="b", rwall="b", roof_hi="M", outline="K")
    c.fill_poly([annex.r_top, annex.r_left, annex.r_front], "D")   # lit-back roof tri
    c.fill_poly([annex.r_front, annex.r_right, annex.w_right, annex.w_front], "b")  # solid b shaded face
    # a bank of LOUVERED SERVER-BLADE BAYS on the annex's lit-left face: a `b` rack body
    # with soft `d` slat shadows + `D` slat highlights, so the basalt `b` shows BETWEEN
    # the slats (the matured structure tone reads on the rack) rather than tiling to black.
    annex.louver(c, "left", 0.12, 0.88, 1.6, annex.h - 0.8, body="b", slat="d", edge="D")
    # g blade-glow slits showing between two louver slats (the compute light) — kept to
    # two short lines so the `b` rack body still reads between them at 64px.
    for v in (2.6, 4.4):
        c.line(annex.left_pt(0.20, v), annex.left_pt(0.64, v), "g")
    c.set(int(round(annex.left_pt(0.32, 3.5)[0])), int(round(annex.left_pt(0.32, 3.5)[1])), "c")  # a teal core glint
    # two stacked status LEDs (one teal, one warm) on the lit face — 'compute online'
    c.set(int(round(annex.left_pt(0.82, 2.2)[0])), int(round(annex.left_pt(0.82, 2.2)[1])), "c")
    c.set(int(round(annex.left_pt(0.82, 3.6)[0])), int(round(annex.left_pt(0.82, 3.6)[1])), "o")
    # a couple of d vent slats on the shaded-right face + a K skirt board at the base
    for v in (2.4, 3.8):
        c.line(annex.right_pt(0.18, v), annex.right_pt(0.82, v), "d")
    c.line(annex.left_pt(0.06, annex.h - 0.4), annex.left_pt(0.94, annex.h - 0.4), "K")
    return annex


def _chiller_geom(b):
    """Shared cooling-tower geometry so t5's gold trim (if it ever references the
    chiller) recomputes from the SAME source as t4 — never a hardcoded second guess.
    Anchors the chiller on the clear BACK-LEFT roof zone (left of the signature
    column), returns the cylinder centre/top and the radiator-wall base."""
    rp = b.roof_pt(0.14, 0.28)               # back-left roof, clear LEFT of the centre signature
    cx, roof_y = int(round(rp[0])), int(round(rp[1]))
    return cx, roof_y


def stage4_cooling_tower(c, b):
    """t4 — MAJOR ADD: a rooftop COOLING-TOWER CHILLER plant rises on the clear BACK-
    LEFT roof (well clear of the centre exploded-stack signature) — a stout `cylinder`
    chiller stack standing on short deep-basalt `b` legs, venting a glowing `e` cooling
    HALO out of its capped mouth, beside a finned `e`-glow RADIATOR WALL that dumps the
    compute heat. The prominent new rooftop mass: 'this station now runs powered, cooled
    climate compute'. Palette matures — `b` legs/frame + energized `e/E` cooling glow.
    Clamped fully on-canvas; sits LEFT of the signature column so nothing collides."""
    cx, roof_y = _chiller_geom(b)
    # --- the CHILLER STACK: a stout cylinder rising off a leg plinth into clear sky.
    # Author the tank first so we know its BOTTOM, then run the legs UP to meet it (no
    # floating gap — the classic 'detached rooftop blob' pitfall).
    tank_top_y = roof_y - 15                  # top ellipse centre above the roof
    tank_h = 8
    tank_bot = tank_top_y + tank_h            # the tank's bottom row
    # --- b PLINTH LEGS from the roof deck UP to the tank bottom (a planted base) ---
    for dx in (-3, 3):
        c.line((cx + dx, tank_bot - 1), (cx + dx, roof_y), "b")   # leg runs deck->tank
        c.set(cx + dx, roof_y, "K")                                # foot pressed on the deck
    c.line((cx - 3, roof_y), (cx + 3, roof_y), "K")               # K base sill on the deck
    c.line((cx - 3, tank_bot - 1), (cx + 3, tank_bot - 1), "b")   # top cross-tie under the tank
    cylinder(c, cx, tank_top_y, rx=4, h=tank_h, top="M", side_l="D", side_r="d", outline="K")
    # two M cooling-band ribs around the stack (chiller fins) + a K rim under the cap
    for yy in (tank_top_y + 3, tank_top_y + 6):
        c.line((cx - 4, yy), (cx + 4, yy), "M")
    # --- capped mouth venting a glowing `e` COOLING HALO up/left into clear air ---
    cap_y = tank_top_y - 2
    c.fill_poly([(cx - 4, tank_top_y), (cx + 4, tank_top_y), (cx + 3, cap_y), (cx - 3, cap_y)], "b")
    c.line((cx - 3, cap_y), (cx + 3, cap_y), "K")
    # the e halo: a small rising ellipse of energized cooling vapour above the mouth
    for a in range(0, 360, 30):
        hx = int(round(cx + 4 * math.cos(math.radians(a))))
        hy = int(round((cap_y - 3) + 2 * math.sin(math.radians(a))))
        if 0 <= hx <= 63 and 0 <= hy <= 63:
            c.set(hx, hy, "e")
    c.set(cx, cap_y - 3, "E")                # bright halo core
    c.set(cx - 1, cap_y - 4, "e")
    c.set(cx + 1, cap_y - 5, "e")
    # --- finned `e`-glow RADIATOR WALL standing on the open roof just LEFT of the
    # chiller plinth (the clear back-left zone), a low ribbed bank dumping compute heat
    # — energized `e` glow leaking between the D fins. Steps DOWN-LEFT along the back-
    # left roof edge so it sits clearly in the open, never near the centre signature. ---
    rwx = cx - 5                              # start just LEFT of the chiller legs
    rwy = roof_y + 2                          # a touch down the roof from the chiller feet
    # a continuous b base ledge stepping down-left (the radiator's manifold) + K underline
    n = 5
    pts = [(int(round(rwx - k * 1.6)), int(round(rwy + k * 0.8))) for k in range(n)]
    for (x, y) in pts:
        c.set(x, y, "b")
        c.set(x, y + 1, "K")                 # K underline grounds the bank on the deck
    # vertical radiator fins rising 3px off the ledge, alternating D fin / e glow gap
    for k, (x, y) in enumerate(pts):
        for t in range(3):
            c.set(x, y - 1 - t, "D")         # the fin
        c.set(x, y - 4, "K")                 # K cap on each fin
        if k % 2 == 0:
            c.set(x, y - 2, "e")             # energized glow leaking between fins
    return cx, roof_y


def stage5_twin_hemisphere(c, sig):
    """t5 — CROWNING FEATURE = FULLY EVOLVED climate model. The hovering exploded stack
    is crowned by a TWIN-HEMISPHERE climate model floating just above the ice sheet: two
    linked bright-E hemispheres (an ATMOSPHERE globe + an OCEAN globe) joined by bright E
    CIRCULATION pulses and swept by faint e JET-STREAM arcs, ringed by a premium GOLD
    orbit ring on a slim gold ARMATURE rising off the stack. Reads as elite/maxed while
    still clearly the same climate-modeling station. Gold (q) appears ONLY here. Re-
    anchored from the SAME stack geometry the signature returned (ice_y at the top)."""
    ocx = sig["ocx"]
    crown_y = sig["ice_y"] - 6               # the twin model hovers above the top ice sheet
    crown_y = max(7, crown_y)                # keep the whole crown on-canvas (top margin)

    # --- slim GOLD ARMATURE rising from the ice sheet up to the twin model (so the
    #     crown reads as MOUNTED on the model, not a detached blob) ---
    c.line((ocx, sig["ice_y"] - 1), (ocx, crown_y + 3), "q")
    c.set(ocx, sig["ice_y"] - 1, "O")        # bright armature foot on the ice sheet

    # --- the TWIN HEMISPHERES: two small E globes side by side, atmosphere (left) +
    #     ocean (right), each a filled disc with a bright E rim and a tinted core ---
    def globe(gx, gy, r, core):
        for yy in range(-r, r + 1):
            for xx in range(-r, r + 1):
                if xx * xx + yy * yy <= r * r:
                    px, py = gx + xx, gy + yy
                    if 0 <= px <= 63 and 0 <= py <= 63:
                        rim = xx * xx + yy * yy >= (r - 1) * (r - 1)
                        c.set(px, py, "E" if rim else core)
        c.set(gx, gy - r, "W")               # top sun glint

    lhx, lhy = ocx - 3, crown_y              # atmosphere hemisphere (left), c-cored
    rhx, rhy = ocx + 3, crown_y              # ocean hemisphere (right), g-cored
    globe(lhx, lhy, 2, "c")
    globe(rhx, rhy, 2, "g")

    # --- bright E CIRCULATION PULSES linking the two hemispheres (energy exchange) ---
    for px in range(lhx + 1, rhx):
        c.set(px, crown_y, "E")
    c.set(ocx, crown_y - 1, "E")             # a pulse bead riding above the link
    c.set(ocx, crown_y + 1, "e")

    # --- faint e JET-STREAM arcs sweeping around/between the hemispheres ---
    for a in range(200, 341, 20):            # upper sweeping arc over both globes
        jx = int(round(ocx + 6 * math.cos(math.radians(a))))
        jy = int(round(crown_y + 3 * math.sin(math.radians(a))))
        if 0 <= jx <= 63 and 0 <= jy <= 63:
            c.set(jx, jy, "e")
    for a in range(20, 161, 20):             # lower sweeping arc under both globes
        jx = int(round(ocx + 6 * math.cos(math.radians(a))))
        jy = int(round(crown_y + 4 * math.sin(math.radians(a))))
        if 0 <= jx <= 63 and 0 <= jy <= 63:
            c.set(jx, jy, "e")

    # --- premium GOLD ORBIT RING circling the twin model (t5 flourish only) ---
    orx, ory = 8, 4
    for a in range(0, 360, 14):
        ox = int(round(ocx + orx * math.cos(math.radians(a))))
        oy = int(round(crown_y + ory * math.sin(math.radians(a))))
        if 0 <= ox <= 63 and 0 <= oy <= 63:
            # front arc bright O, back arc deeper q, so the ring reads as a 3D loop
            c.set(ox, oy, "O" if 20 <= a <= 160 else "q")
    # two small q orbit-node beads riding the gold ring (elite trim)
    c.set(ocx - orx, crown_y, "q")
    c.set(ocx + orx, crown_y, "O")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the climate-modeling station at upgrade `stage` (1..5). Stage 1 is
    IDENTICAL to the shipped base PNG; each higher stage keeps every prior addition and
    bolts on the next (t2 orbital bead → t3 compute annex → t4 cooling tower → t5 twin-
    hemisphere model + gold). Painter's order: the building masses (annex on the right
    flank, cooling tower on the back-left roof) are drawn BEFORE the hovering signature
    so the exploded-layer-stack hero reads over the whole building; the model-augmenting
    stages (t2 bead, t5 twin globes) are drawn AFTER the signature since they ARE part
    of the hovering climate model."""
    c = Canvas()
    b = HALL
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    contact_shadow(c, b)        # soft K ground shadow under the broad hall (back/under)
    hall(c, b)                  # the WIDE LOW simulation hall body (M/L walls, L deck)
    ocx, ocy = oculus(c, b)     # round K-rimmed glowing roof OCULUS in the deck centre
    cooling_fins(c, b)          # low ribbed cooling-fin bank on the back-right roof edge
    left_face(c, b)             # HERO control door + operator window on the LIT-LEFT face

    # --- CUMULATIVE UPGRADE STAGES (building masses BEFORE the hovering signature) -
    if stage >= 2:
        stage2_sky_radiometer(c, b)   # real roof instrument (a building mass, drawn here)
    if stage >= 3:
        stage3_compute_annex(c, b)
    if stage >= 4:
        stage4_cooling_tower(c, b)

    # SIGNATURE — exploded Earth-system layer stack + opt. fork. Returns the stack
    # geometry so the model-augmenting evolved stages re-anchor from the SAME source.
    sig = layer_stack(c, ocx, ocy)

    # --- model-augmenting evolved stages, drawn AFTER the signature (part of it) ---
    if stage >= 2:
        stage2_orbital_bead(c, sig)
    if stage >= 5:
        stage5_twin_hemisphere(c, sig)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/terrabase"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "climate-modeling-station"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped climate-modeling-station.png, so it does NOT overwrite
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
