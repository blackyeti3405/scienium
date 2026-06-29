#!/usr/bin/env python3
"""
Incubation Chamber — BioCore economy building (BESPOKE form, STANDARD role).

A SEALED WARM POD with a FROSTED HUMIDITY DOME. The body is a compact, low square
`Box` (isobuild.Box) sitting on a K plinth — insulated M/D walls with thick D/d
gasket-seam framing (double-line seams = sealed panels), rounder + "puffier" than
the Vault's hard block. Capped by a low, frosted-glass humidity DOME (stacked
c/h ellipses with a foggy h interior + W condensation dots) — the climate cap, the
warmest building in the set. NOT the gateway cube — no iso.draw_cube/base_windows.

  • Roofline: the rounded humidity dome dominates; small o/r thermostat + heater
    boxes flank it; a thin c vapour wisp rises.
  • OPENING SIDE = RIGHT. The hero is a heavy round-cornered SEALED HATCH DOOR with
    a glowing O/o warm-amber PORTHOLE on the SHADED RIGHT face — the interior grow-
    light glow spills around the K gasket so it reads on the dark side. The lit LEFT
    face stays plainer (one small c gauge dial).
  • SIGNATURE (one-of-one): a CAROUSEL RACK of glowing petri dishes growing colonies
    — 3 stacked O/o discs in a D rack frame under an o/O heat-lamp bar, each dish a
    distinct culture (concentric rings, scatter dots, branching filament), a c/O
    target gauge ticking, faint h condensation specks — like little galaxies under
    heat lamps, seen through the warm-glowing right opening.

Composed from art/isobuild.{Box,cylinder} — BioCore palette only (greens + teal +
warm amber), never grey.
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

# Base BioCore palette (shared keys) + a few EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so incubation-chamber.png is
# unchanged). BioCore's evolved glow is BIO-LUMINESCENT — a living-systems green-teal
# bloom — so a maxed pod reads as a glowing climate-incubator, not a power plant:
#   b  deep mossy bark-green  — matured structure tone for t3+ new masses/frames
#   e  bioluminescent glow (mid)   E  bioluminescent glow (bright) — the t4/t5 life-glow
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
BIO = {"K": "#1a2417", "W": "#e8f2d8", "L": "#c4dba6", "M": "#9fc07e", "D": "#6f9456",
       "d": "#4a6e3a", "h": "#d2f7ec", "c": "#9fefcf", "g": "#36cc9e", "G": "#1d8f70",
       "o": "#f0b24d", "O": "#ffd488", "r": "#b9701e",
       "b": "#2f4a2a", "e": "#74f0b6", "E": "#ccffe4", "q": "#f3c63a"}


# ── low-level helpers ────────────────────────────────────────────────────────
def hline(c, x0, x1, y, ch):
    if x1 < x0:
        x0, x1 = x1, x0
    for x in range(int(round(x0)), int(round(x1)) + 1):
        c.set(x, y, ch)


def vline(c, x, y0, y1, ch):
    if y1 < y0:
        y0, y1 = y1, y0
    for y in range(int(round(y0)), int(round(y1)) + 1):
        c.set(x, y, ch)


def disc(c, cx, cy, rx, ry, ch, half=None):
    """Filled iso ellipse. half=None full; 'l' lit-left only; 'r' shaded-right."""
    for yy in range(int(-ry), int(ry) + 1):
        t = 1 - (yy / ry) ** 2
        if t < 0:
            continue
        hw = rx * (t ** 0.5)
        for xx in range(int(-hw), int(hw) + 1):
            if half == "l" and xx > 0:
                continue
            if half == "r" and xx < 0:
                continue
            c.set(cx + xx, cy + yy, ch)


# ── POD body geometry (compact square Box on a K plinth) ─────────────────────
# A low, puffy square footprint — wider than tall so it reads sealed + squat.
BODY_TOP = (31, 21)
BWX, BWY = 11, 10
BODY_H = 13


def plinth(c, body):
    """A K plinth + soft contact shadow under the pod => grounded, rounded-corner
    feel (the dark base reads as a gasket foot, softening the box corners)."""
    body.shadow(c, "K")
    # K plinth band wrapping the two front-bottom faces
    wl, wf, wr = body.w_left, body.w_front, body.w_right
    c.fill_poly([(wl[0], wl[1]), (wf[0], wf[1]), (wr[0], wr[1]),
                 (wr[0], wr[1] + 2), (wf[0], wf[1] + 2), (wl[0], wl[1] + 2)], "K")
    # a d gasket lip just above the plinth (sealed foot)
    c.line((wl[0], wl[1] - 1), (wf[0], wf[1] - 1), "d")
    c.line((wf[0], wf[1] - 1), (wr[0], wr[1] - 1), "d")


def pod_body(c):
    """The insulated sealed pod: M lit-left / D shaded-right walls, L roof, with
    thick d gasket-seam double-lines framing each face (sealed panels)."""
    b = Box(BODY_TOP, BWX, BWY, BODY_H)
    plinth(c, b)
    b.draw(c, roof="M", lwall="M", rwall="D", roof_hi="L", outline="K")

    # --- thick d/D gasket-seam frame: a double-line border insetting each wall ---
    # left (lit) face border
    for inset, ch in ((0.06, "d"), (0.10, "D")):
        c.line(b.left_pt(inset, 1.5), b.left_pt(1 - inset, 1.5), ch)
        c.line(b.left_pt(inset, BODY_H - 1.5), b.left_pt(1 - inset, BODY_H - 1.5), ch)
    c.line(b.left_pt(0.06, 1.5), b.left_pt(0.06, BODY_H - 1.5), "d")
    c.line(b.left_pt(0.94, 1.5), b.left_pt(0.94, BODY_H - 1.5), "d")
    # right (shaded) face border
    for inset, ch in ((0.06, "d"), (0.10, "K")):
        c.line(b.right_pt(inset, 1.5), b.right_pt(1 - inset, 1.5), ch)
    c.line(b.right_pt(0.06, 1.5), b.right_pt(0.06, BODY_H - 1.5), "d")
    c.line(b.right_pt(0.94, 1.5), b.right_pt(0.94, BODY_H - 1.5), "d")

    # --- a single small c gauge DIAL on the lit-left face (keep it plain) ---
    gx, gy = b.left_pt(0.30, 6.5)
    gx, gy = int(round(gx)), int(round(gy))
    c.set(gx, gy, "K"); c.set(gx + 1, gy, "K"); c.set(gx, gy + 1, "K"); c.set(gx + 1, gy + 1, "K")
    c.set(gx, gy, "c")          # dial face
    c.set(gx + 1, gy, "h")
    # a soft L insulation sheen highlight on the lit face
    c.line(b.left_pt(0.18, 3), b.left_pt(0.18, BODY_H - 3), "L")
    return b


# ── HUMIDITY DOME (low frosted-glass cap — stacked ellipses) ─────────────────
def humidity_dome(c, body):
    """A LOW, inflated, frosted-glass dome on the roof: a wide squat hemisphere
    (wider than tall) so it reads as a humidity CAP, not a pot. Foggy h/c frosted
    glass, condensation W dots, a bright crown glint, a thin c vapour wisp."""
    cx, cy = body.roof_pt(0.5, 0.5)
    # LIFT the dome base up off the roof centre so the whole bubble sits clearly
    # ON TOP of the roof (the back of the dome must rise above the roof ridge,
    # not sink into the lit roof triangle).
    cx, cy = int(round(cx)), int(round(cy)) - 2
    drx, dry = 12, 6                    # WIDE base ellipse (footprint of the cap)
    height = 9                          # crown rise => a clearly raised puffy bubble

    def dome_top(xx):
        """Top y of the dome silhouette at column xx (a raised circular crown)."""
        frac = 1 - (xx / drx) ** 2
        if frac < 0:
            return None
        return cy - height * (frac ** 0.5)

    def base_y(xx):
        """Bottom y of the dome at column xx, following the front base ellipse."""
        frac = 1 - (xx / drx) ** 2
        if frac < 0:
            return None
        return cy + dry * (frac ** 0.5)

    # --- FILL the whole frosted bubble column-by-column from crown to base so the
    # silhouette is fully glazed (no roof colour leaking through the dome) ---
    for xx in range(-drx, drx + 1):
        t = dome_top(xx)
        b = base_y(xx)
        if t is None:
            continue
        y0, y1 = int(round(t)), int(round(b))
        for y in range(y0, y1 + 1):
            # frosted-glass shading: bright h/c lit-left -> g/G shaded-right;
            # a brighter h band hugging the crown reads as the glass sheen.
            if xx <= -drx + 1:
                ch = "c"
            elif xx >= drx - 1:
                ch = "G"
            elif y <= y0 + 1:
                ch = "h" if xx <= 4 else "c"       # bright crown sheen
            elif xx <= -3:
                ch = "c"
            elif xx <= 3:
                ch = "h"
            elif xx <= 7:
                ch = "g"
            else:
                ch = "G"
            c.set(cx + xx, y, ch)

    # --- frosted interior fog: soft condensation W dots scattered inside ---
    for (dx, dy) in [(-4, -3), (1, -5), (5, -1), (-6, 0), (3, 0), (-1, -2), (6, -3)]:
        c.set(cx + dx, cy + dy, "W")
    # bright crown glint on the lit upper-left of the cap
    c.set(cx - 4, cy - 6, "W")
    c.set(cx - 5, cy - 4, "h")
    c.set(cx - 3, cy - 7, "h")

    # --- crisp continuous K silhouette: crown arc + front base arc only (no line
    # bisecting the glass) so the cap reads as one clean frosted bubble ---
    prev = None
    for xx in range(-drx, drx + 1):
        t = dome_top(xx)
        if t is None:
            continue
        ty = int(round(t))
        c.set(cx + xx, ty, "K")
        if prev is not None and abs(ty - prev) > 1:   # close vertical gaps in the arc
            for yy in range(min(ty, prev) + 1, max(ty, prev)):
                c.set(cx + xx, yy, "K")
        prev = ty
    for a in range(0, 181, 4):          # front base arc only
        x = cx + drx * math.cos(math.radians(a))
        y = cy + dry * math.sin(math.radians(a))
        c.set(x, y, "K")

    # --- a thin c vapour wisp curling up off the dome crown ---
    c.set(cx + 1, cy - height - 1, "c")
    c.set(cx, cy - height - 2, "c")
    c.set(cx + 1, cy - height - 3, "h")
    c.set(cx, cy - height - 4, "c")
    return (cx, cy, drx, dry, height)


def roof_boxes(c, body):
    """Small o/r thermostat + heater boxes flanking the dome on the roof + a thin
    c vapour pipe — warm climate-control hardware reading as the warmest set."""
    # thermostat box, far back-LEFT corner of the roof (clear of the wide dome)
    tx, ty = body.roof_pt(0.10, 0.18)
    tx, ty = int(round(tx)), int(round(ty))
    c.fill_poly([(tx - 2, ty - 3), (tx + 2, ty - 3), (tx + 2, ty), (tx - 2, ty)], "r")
    c.fill_poly([(tx - 2, ty - 3), (tx + 2, ty - 3), (tx + 2, ty - 2), (tx - 2, ty - 2)], "o")
    c.set(tx - 1, ty - 3, "O")
    for x in range(tx - 2, tx + 3):                 # K base
        c.set(x, ty + 1, "K")
    # heater box, far front-RIGHT corner of the roof (a warm o vent grille),
    # tucked at the right roof tip so it never collides with the dome footprint
    hx, hy = body.roof_pt(0.92, 0.40)
    hx, hy = int(round(hx)), int(round(hy))
    c.fill_poly([(hx - 2, hy - 3), (hx + 2, hy - 3), (hx + 2, hy), (hx - 2, hy)], "r")
    c.line((hx - 2, hy - 2), (hx + 2, hy - 2), "o")
    c.line((hx - 2, hy - 1), (hx + 2, hy - 1), "O")
    for x in range(hx - 2, hx + 3):
        c.set(x, hy + 1, "K")


# ── HERO: sealed hatch + big glowing porthole on the SHADED RIGHT face ───────
def right_hatch(c, body):
    """The hero entrance on the SHADED RIGHT face: a heavy round-cornered SEALED
    HATCH with a K gasket frame and a LARGE glowing warm-amber PORTHOLE. The
    porthole is a deep window INTO the incubator — its interior holds the petri
    carousel (drawn next) — and the warm grow-light glow spills around the gasket
    so the opening reads clearly on the shaded right side. Opening side = RIGHT.

    Returns the porthole centre + radii so the signature paints its colonies
    inside this same glass (signature == what you see through the opening)."""
    b = body
    # --- the sealed HATCH panel: a tall round-cornered door filling the right face
    u0, u1, vt, vb = 0.10, 0.92, 1.5, BODY_H - 0.5
    # K hatch frame (heavy sealed door)
    c.fill_poly([b.right_pt(u0, vt), b.right_pt(u1, vt),
                 b.right_pt(u1, vb), b.right_pt(u0, vb)], "K")
    # D hatch leaf inset (the sealed insulated door panel)
    i = 0.05
    c.fill_poly([b.right_pt(u0 + i, vt + 0.7), b.right_pt(u1 - i, vt + 0.7),
                 b.right_pt(u1 - i, vb - 0.4), b.right_pt(u0 + i, vb - 0.4)], "D")
    # d gasket bolt-seam border inside the leaf (double-line = sealed)
    c.line(b.right_pt(u0 + i + 0.02, vt + 1.3), b.right_pt(u1 - i - 0.02, vt + 1.3), "d")
    c.line(b.right_pt(u0 + i + 0.02, vb - 0.9), b.right_pt(u1 - i - 0.02, vb - 0.9), "d")
    # heavy round-corner hinge bolts on the left jamb of the hatch
    for vv in (vt + 1.6, (vt + vb) / 2, vb - 1.3):
        bx, by = b.right_pt(u0 + 0.05, vv)
        c.set(int(round(bx)), int(round(by)), "o")

    # --- the LARGE glowing PORTHOLE: a round warm-amber window in the hatch leaf,
    # offset toward the hatch's right so the lit colonies sit clear of the jamb ---
    pc = b.right_pt(0.56, (vt + vb) / 2 + 0.2)
    pcx, pcy = int(round(pc[0])), int(round(pc[1]))
    prx, pry = 8, 8
    # warm interior glow disc (O core -> o -> r rim) = the heat-lamp wash inside
    for yy in range(-pry, pry + 1):
        for xx in range(-prx, prx + 1):
            d2 = (xx / prx) ** 2 + (yy / pry) ** 2
            if d2 <= 1.0:
                if d2 <= 0.45:
                    c.set(pcx + xx, pcy + yy, "O")
                elif d2 <= 0.80:
                    c.set(pcx + xx, pcy + yy, "o")
                else:
                    c.set(pcx + xx, pcy + yy, "r")
    # K porthole rim ring (heavy round frame)
    for a in range(0, 360, 5):
        c.set(pcx + prx * math.cos(math.radians(a)),
              pcy + pry * math.sin(math.radians(a)), "K")
    # 6 o gasket bolts around the porthole rim
    for a in range(15, 360, 60):
        c.set(pcx + (prx + 1) * math.cos(math.radians(a)),
              pcy + (pry + 1) * math.sin(math.radians(a)), "o")

    # --- glow SPILL: warm o/r aura bleeding from the porthole onto the shaded
    # hatch + wall (the interior glow reads on the dark right side) ---
    for a in range(0, 360, 30):
        gx = pcx + (prx + 2) * math.cos(math.radians(a))
        gy = pcy + (pry + 2) * math.sin(math.radians(a))
        if c.px[int(round(gy))][int(round(gx))] == "D":
            c.set(gx, gy, "r")
    return (pcx, pcy, prx, pry)


# ── SIGNATURE: glowing petri-dish carousel (seen THROUGH the right porthole) ──
def petri_carousel(c, porthole):
    """The one-of-one feature, painted INSIDE the hero porthole: a CAROUSEL RACK
    of glowing petri dishes growing colonies, lit by an amber heat-lamp wash. 3
    stacked dishes seen edge-on as glowing O/o discs in a thin D rack, each a
    DISTINCT culture (concentric rings / scattered c-g dots / branching g
    filament), a c/O target gauge ticking (the prediction game), h condensation
    specks in the warm air. Clipped to the round porthole glass so it reads as
    *looking into the incubator* — the warm interior seen through the opening."""
    pcx, pcy, prx, pry = porthole

    def inside(x, y, margin=0.0):
        return ((x - pcx) / (prx - margin)) ** 2 + ((y - pcy) / (pry - margin)) ** 2 <= 1.0

    # --- heat-lamp BAR arcing across the top of the chamber interior ---
    for x in range(pcx - prx + 2, pcx + prx - 1):
        if inside(x, pcy - pry + 2, 0.5):
            c.set(x, pcy - pry + 2, "o")
            c.set(x, pcy - pry + 1, "r")
    c.set(pcx, pcy - pry + 1, "O")

    # --- thin D rack uprights holding the dish stack ---
    for ry_off in range(-pry + 3, pry - 1):
        if inside(pcx - 5, pcy + ry_off, 0.4):
            c.set(pcx - 5, pcy + ry_off, "r")
        if inside(pcx + 5, pcy + ry_off, 0.4):
            c.set(pcx + 5, pcy + ry_off, "r")

    # --- 3 stacked petri dishes (edge-on glowing discs), each a distinct culture
    dish_rx, dish_ry = 4, 2
    rows_y = [pcy - 4, pcy, pcy + 4]
    cultures = ["rings", "scatter", "filament"]
    for k, dcy in enumerate(rows_y):
        dcx = pcx
        # dish base glow: warm o body with an O lit core
        disc(c, dcx, dcy, dish_rx, dish_ry, "o")
        disc(c, dcx, dcy, dish_rx - 1, dish_ry, "O")
        # K rim of the dish (edge-on lens)
        for a in range(0, 360, 12):
            c.set(dcx + dish_rx * math.cos(math.radians(a)),
                  dcy + dish_ry * math.sin(math.radians(a)), "K")
        # bright h reflection line along the top of the dish glass
        c.line((dcx - dish_rx + 1, dcy - dish_ry), (dcx + dish_rx - 1, dcy - dish_ry), "h")

        # the COLONY pattern — distinct per dish so they read as different cultures
        cult = cultures[k]
        if cult == "rings":            # concentric O/o rings (a target bloom)
            c.set(dcx, dcy, "O")
            c.set(dcx - 2, dcy, "o"); c.set(dcx + 2, dcy, "o")
            c.set(dcx - 1, dcy - 1, "O"); c.set(dcx + 1, dcy - 1, "O")
        elif cult == "scatter":        # a scatter of c/g culture dots
            for (sx, sy) in [(-2, 0), (-1, -1), (1, 0), (2, -1), (0, 1)]:
                c.set(dcx + sx, dcy + sy, "c" if (sx + sy) % 2 == 0 else "g")
        else:                          # a branching g filament
            c.set(dcx, dcy, "g")
            c.set(dcx - 1, dcy - 1, "g"); c.set(dcx + 1, dcy - 1, "c")
            c.set(dcx - 2, dcy, "g"); c.set(dcx + 2, dcy, "g")

    # --- a thin c thermometer + O target gauge on the rack right (prediction game)
    gx = pcx + 6
    for y in range(pcy - 4, pcy + 5):
        if inside(gx, y, 0.3):
            c.set(gx, y, "c")
    if inside(gx, pcy + 4, 0.3):
        c.set(gx, pcy + 4, "G")        # cool base of the thermometer
    c.set(gx, pcy - 2, "O")            # one bright lit target indicator pip

    # --- faint h condensation specks in the warm chamber air ---
    for (sx, sy) in [(pcx - 6, pcy - 2), (pcx + 4, pcy - 5), (pcx - 3, pcy + 5),
                     (pcx + 6, pcy + 2)]:
        if inside(sx, sy, 0.5) and c.px[sy][sx] in ("o", "O", "r"):
            c.set(sx, sy, "h")

    # --- re-stroke the K porthole rim on top so the rack stays clipped clean ---
    for a in range(0, 360, 5):
        c.set(pcx + prx * math.cos(math.radians(a)),
              pcy + pry * math.sin(math.radians(a)), "K")
    # one bright h condensation crescent on the cool upper-left of the glass
    for a in range(120, 215, 16):
        c.set(pcx + (prx - 1) * math.cos(math.radians(a)),
              pcy + (pry - 1) * math.sin(math.radians(a)), "h")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS climate-control /
# culture hardware onto the prior sealed pod — never restarts, never recolors the
# whole building. Theme: the starter incubator grows into a fully built-out, glowing
# CLIMATE-INCUBATION SUITE. Colours mature stage by stage (matured bark-green `b`,
# bio-luminescent `e/E`); gold (`q`) only as a t5 flourish. Every addition is anchored
# OFF the pod/dome geometry and kept clear of BOTH signatures: the frosted humidity
# DOME (roof centre) and the warm-glowing right PORTHOLE carousel (the one-of-one).
#
#   t2  small functional add   : a 2nd back-right HEATER box + a `c` humidity-dial
#                                gauge plate on the lit-left roof; brighten the porthole
#   t3  structural add         : a CO2/GAS-BOTTLE lean-to annex on the lit-LEFT footing
#   t4  major add              : a 2nd larger HUMIDITY DOME beside the first, `e` core
#   t5  crowning feature       : `E` multi-tier culture stack in the porthole + GOLD
#                                gasket ring on the hatch + a gold dome finial
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_aux_climate(c, body, dome, porthole):
    """t2 — SMALL FUNCTIONAL ADD: more climate-control hardware flanking the dome —
    (a) a SECOND heater box on the far back-RIGHT roof tip (mirrors the base front-right
    heater, so the pair reads as a balanced HVAC bank), and (b) a small `c` HUMIDITY-DIAL
    gauge plate planted on the lit-left roof shoulder beside the dome. Plus a brighter `O`
    core wash on the right PORTHOLE (the incubator is now running hotter). Modest, base
    palette + the evolved `e` only as a single live-readout pip. All clear of the dome
    crown + the porthole rack."""
    # (a) SECOND heater box — BACK-RIGHT roof shoulder. The base heater is FRONT-right
    #     at roof_pt(0.92,0.40)≈(39,37); the WIDE dome (centre≈(32,30), base ellipse
    #     x∈20..44, y≤36) swallows the back-CENTRE roof, so seat this twin out at
    #     roof_pt(0.90,0.78)≈(46,33) — past the dome's right rim — where it clearly flanks
    #     the dome's right shoulder as a matching vented box rather than a hidden sliver.
    hx, hy = body.roof_pt(0.90, 0.78)
    hx, hy = int(round(hx)), int(round(hy))
    c.fill_poly([(hx - 2, hy - 4), (hx + 2, hy - 4), (hx + 2, hy), (hx - 2, hy)], "r")
    c.line((hx - 2, hy - 3), (hx + 2, hy - 3), "o")  # warm vent grille (matches base heater)
    c.line((hx - 2, hy - 2), (hx + 2, hy - 2), "O")
    c.line((hx - 2, hy - 1), (hx + 2, hy - 1), "o")
    c.set(hx + 2, hy - 3, "e")                       # one live-readout pip (evolved glow)
    for x in range(hx - 2, hx + 3):                  # K base
        c.set(x, hy + 1, "K")
    c.set(hx - 2, hy - 4, "K"); c.set(hx + 2, hy - 4, "K")  # box top corners read crisp

    # (b) HUMIDITY-DIAL gauge plate WALL-MOUNTED on the lit-LEFT face (upper-right of the
    #     wall, at left_pt(0.62,4.5)), clear of the base c gauge (left-centre) and the t3
    #     gas-annex feed (front-left) and never occluded by the roof domes. A round c dial
    #     in a K rim with an O needle pip + h glint — a second climate readout.
    gx, gy = body.left_pt(0.62, 4.5)
    gx, gy = int(round(gx)), int(round(gy))
    # K rim ring (3x3 framed dial) then the c face inside
    for dx in (-1, 0, 1):
        c.set(gx + dx, gy - 2, "K")                  # top rim
        c.set(gx + dx, gy + 2, "K")                  # bottom rim
    for dy in (-1, 0, 1):
        c.set(gx - 2, gy + dy, "K")                  # left rim
        c.set(gx + 2, gy + dy, "K")                  # right rim
    for dx, dy in [(-1, -1), (0, -1), (1, -1), (-1, 0), (0, 0), (1, 0), (-1, 1), (0, 1), (1, 1)]:
        c.set(gx + dx, gy + dy, "c")                 # dial face
    c.set(gx - 1, gy - 1, "h")                       # glint upper-left
    c.set(gx, gy, "O")                               # bright needle hub
    c.set(gx + 1, gy + 1, "e")                       # one live-reading pip (evolved glow)

    # (c) BRIGHTEN the porthole glow — re-stroke a brighter O core inside the existing
    #     warm wash (the incubator is now driven hotter), staying inside the glass.
    pcx, pcy, prx, pry = porthole
    for yy in range(-2, 3):
        for xx in range(-3, 4):
            if (xx / 4.0) ** 2 + (yy / 3.0) ** 2 <= 1.0:
                # only re-light pixels that are already the warm interior wash
                if c.px[pcy + yy][pcx + xx] in ("o", "r"):
                    c.set(pcx + xx, pcy + yy, "O")


def stage3_gas_annex(c, body):
    """t3 — STRUCTURAL ADD: a CO2 / GAS-BOTTLE supply lean-to standing in the OPEN
    FRONT-LEFT ground in front of the pod's lit-left wall — a chunky matured bark-green
    `b` cabinet whose silhouette breaks clearly PAST the pod outline (so it reads as its
    own object, not a streak on the wall), holding one upright gas CYLINDER bottle, with
    a thin `c` feed LINE running from the bottle head up into the pod (the incubator's
    climate gas supply). Clear of the right hatch + the domes. Introduces the matured
    bark-green tone `b`."""
    # The pod's lit-LEFT wall drops from r_left(11,31) to w_left(11,44); its FRONT-LEFT
    # ground is the open triangle just in front of that wall foot. Seat the cabinet there
    # (lower + slightly forward of the wall foot) so its FRONT + LEFT faces stick out past
    # the pod silhouette and catch the eye — same trick the greenhouse cold-frame uses.
    # back-top-left of the cabinet, sitting forward of the wall foot:
    cbx, cby = 13, 45
    CW, CH = 8, 10                                   # chunky enough to read as a cabinet
    fx0, fy0 = cbx, cby                              # top-left
    fx1, fy1 = cbx + CW, cby + CW // 2              # top-right (iso-skewed down)
    # --- soft K contact shadow grounding the cabinet on the dirt ---
    c.fill_poly([(fx0 - 1, fy0 + CH), (fx1, fy1 + CH), (fx1, fy1 + CH + 1), (fx0 - 1, fy0 + CH + 1)], "K")
    # --- bark-green cabinet body: a lit-left `b` face + a darker `d` shaded-right face,
    #     so the box has internal light/shade and pops off the pod wall behind it ---
    # left (lit) face
    c.fill_poly([(fx0, fy0), (fx0, fy0 + CH), (fx0 + 4, fy1 + CH), (fx0 + 4, fy1)], "b")
    # right (shaded) face
    c.fill_poly([(fx0 + 4, fy1), (fx0 + 4, fy1 + CH), (fx1, fy1 + CH), (fx1, fy1)], "d")
    # top cap (a lighter D lid so the cabinet reads as a solid prism, not a flat panel)
    c.fill_poly([(fx0, fy0), (fx0 + 4, fy1), (fx1, fy1), (fx0 + 4, fy0)], "D")
    # crisp K outline all the way around the silhouette so it separates from the pod
    for a, e in [((fx0, fy0), (fx0, fy0 + CH)), ((fx0, fy0 + CH), (fx1, fy1 + CH)),
                 ((fx1, fy1 + CH), (fx1, fy1)), ((fx1, fy1), (fx0 + 4, fy0)),
                 ((fx0 + 4, fy0), (fx0, fy0)), ((fx0 + 4, fy0), (fx0 + 4, fy1 + CH))]:
        c.line(a, e, "K")
    c.line((fx0, fy0), (fx0 + 4, fy1), "d")          # top-left lid edge
    # a small c access-panel readout on the lit cabinet face (climate-supply gauge)
    c.set(fx0 + 1, fy0 + 4, "c"); c.set(fx0 + 1, fy0 + 5, "h")
    c.set(fx0 + 1, fy0 + 3, "K"); c.set(fx0 + 2, fy0 + 4, "K"); c.set(fx0 + 1, fy0 + 6, "K")

    # --- the upright GAS CYLINDER bottle standing in front of the cabinet (clearly
    #     readable: a g/G tank with c top + a warm o regulator valve on its neck) ---
    bot_cx = fx0 + 5
    bot_top = fy1 - 2
    cylinder(c, bot_cx, bot_top, 2.0, 7, top="c", side_l="g", side_r="G", outline="K")
    c.set(bot_cx, bot_top + 2, "h")                  # bright sheen down the lit tank side
    c.set(bot_cx, bot_top + 4, "c")
    # bottle neck + warm valve cap on top
    c.set(bot_cx, bot_top - 1, "M")
    c.set(bot_cx, bot_top - 2, "r")                  # valve body
    c.set(bot_cx, bot_top - 3, "o")                  # regulator knob
    c.set(bot_cx + 1, bot_top - 2, "O")              # valve glint
    # --- thin `c` FEED LINE from the valve up + over into the pod's lit-left wall ---
    feed_in = body.left_pt(0.16, 5.0)                # entry point on the lit wall
    fix, fiy = int(round(feed_in[0])), int(round(feed_in[1]))
    riser_y = bot_top - 5
    c.line((bot_cx, bot_top - 3), (bot_cx, riser_y), "c")               # riser off the valve
    c.line((bot_cx, riser_y), (fix, riser_y), "c")                      # cross to the wall
    c.line((fix, riser_y), (fix, fiy), "c")                             # drop into the pod
    c.set(fix, fiy, "h")                             # gas entering the pod (glint)


def stage4_second_dome(c, body, dome):
    """t4 — MAJOR ADD: a SECOND, larger HUMIDITY DOME rising on the FRONT-LEFT roof
    beside the first — a stacked `c/h` frosted bubble with an energized `e` glowing
    VAPOUR CORE pulsing inside and a brighter `E` crown, so the pod now reads as a
    twin-dome climate suite ('it now runs two atmospheres'). A warm matured bark-green
    `b` plinth collar grounds it on the roof. The prominent new mass. Kept fully
    on-canvas and to the FRONT-LEFT so it never occludes the original dome crown or the
    right porthole. Palette matures to deep `b` + energized bio-glow `e/E`."""
    cx, cy, drx, dry, height = dome                  # original dome geometry (recomputed source)
    # second dome centre: down + LEFT of the first, on the front-left roof shoulder, so
    # the two bubbles cluster (this one sits lower + slightly forward, partly in front).
    n_cx = cx - 10
    n_cy = cy + 6
    n_rx, n_ry, n_h = 7, 4, 7                         # a touch SMALLER footprint, still a clear 2nd cap

    # --- a short bark-green `b` plinth collar under the new dome (grounds it on roof) ---
    c.fill_poly([(n_cx - n_rx + 1, n_cy + n_ry - 1), (n_cx + n_rx - 1, n_cy + n_ry - 1),
                 (n_cx + n_rx - 1, n_cy + n_ry + 1), (n_cx - n_rx + 1, n_cy + n_ry + 1)], "b")
    c.line((n_cx - n_rx + 1, n_cy + n_ry + 1), (n_cx + n_rx - 1, n_cy + n_ry + 1), "K")

    def n_top(xx):
        frac = 1 - (xx / n_rx) ** 2
        return None if frac < 0 else n_cy - n_h * (frac ** 0.5)

    def n_base(xx):
        frac = 1 - (xx / n_rx) ** 2
        return None if frac < 0 else n_cy + n_ry * (frac ** 0.5)

    # --- fill the frosted bubble (c/h lit-left -> g/G shaded-right, bright crown band) ---
    for xx in range(-n_rx, n_rx + 1):
        t = n_top(xx)
        bb = n_base(xx)
        if t is None:
            continue
        y0, y1 = int(round(t)), int(round(bb))
        for y in range(y0, y1 + 1):
            if xx <= -n_rx + 1:
                ch = "c"
            elif xx >= n_rx - 1:
                ch = "G"
            elif y <= y0 + 1:
                ch = "h" if xx <= 2 else "c"
            elif xx <= -2:
                ch = "c"
            elif xx <= 2:
                ch = "h"
            else:
                ch = "g"
            c.set(n_cx + xx, y, ch)

    # --- energized `e` glowing VAPOUR CORE pulsing inside + a bright `E` crown. Draw it
    #     as a denser cluster so it clearly reads as a glowing core through the frost
    #     (a soft `e` halo ring around a bright `E` heart), centred a touch low. ---
    core_y = n_cy + 1
    for dx, dy in [(0, -2), (-1, -1), (0, -1), (1, -1), (-2, 0), (-1, 0), (1, 0), (2, 0),
                   (-1, 1), (0, 1), (1, 1), (0, 2)]:
        c.set(n_cx + dx, core_y + dy, "e")           # soft glowing halo
    for dx, dy in [(0, 0), (-1, 0), (1, 0), (0, -1)]:
        c.set(n_cx + dx, core_y + dy, "E")           # bright core heart
    c.set(n_cx - 1, n_cy - n_h + 2, "E")             # crown sheen (bright)
    c.set(n_cx, n_cy - n_h + 1, "h")
    # a couple of frosted W condensation dots near the rim (clear of the core)
    c.set(n_cx - 4, n_cy - 1, "W"); c.set(n_cx + 3, n_cy - 2, "W")

    # --- crisp K silhouette: crown arc + front base arc ---
    prev = None
    for xx in range(-n_rx, n_rx + 1):
        t = n_top(xx)
        if t is None:
            continue
        ty = int(round(t))
        c.set(n_cx + xx, ty, "K")
        if prev is not None and abs(ty - prev) > 1:
            for yy in range(min(ty, prev) + 1, max(ty, prev)):
                c.set(n_cx + xx, yy, "K")
        prev = ty
    for a in range(0, 181, 6):
        x = n_cx + n_rx * math.cos(math.radians(a))
        y = n_cy + n_ry * math.sin(math.radians(a))
        c.set(int(round(x)), int(round(y)), "K")

    # --- a thin energized `e` vapour wisp curling up off the new dome crown ---
    c.set(n_cx, n_cy - n_h - 1, "e")
    c.set(n_cx + 1, n_cy - n_h - 2, "E")
    c.set(n_cx, n_cy - n_h - 3, "e")


def stage5_culture_max(c, body, dome, porthole):
    """t5 — CROWNING FEATURE = FULLY EVOLVED climate-incubation suite. Two upgrades read
    as 'maxed elite': (1) the petri carousel seen through the porthole blooms into a
    bright `E` MULTI-TIER CULTURE STACK — its three dish rings re-lit with energized
    bio-glow `E` rings + a brighter `c/O` target gauge tick — and (2) the building is
    dressed with GOLD premium trim: a `q` GOLD gasket ring on the hatch porthole rim, a
    gold dome FINIAL crowning the main humidity dome, and a small gold ridge boss between
    the two domes. Reads as elite, still recognizably the same pod. All gold (`q`) lives
    ONLY here; it never recolors the building."""
    pcx, pcy, prx, pry = porthole

    def inside(x, y, margin=0.0):
        return ((x - pcx) / (prx - margin)) ** 2 + ((y - pcy) / (pry - margin)) ** 2 <= 1.0

    # --- (1) MULTI-TIER CULTURE STACK: re-light the three dish rings with energized
    #     bio-glow `E` so the cultures read as fully bloomed under the lamp. The three
    #     dishes sit at rows pcy-4, pcy, pcy+4 (recomputed from the SAME source as the
    #     base carousel) with dish_rx=4. ---
    dish_rx, dish_ry = 4, 2
    for dcy in (pcy - 4, pcy, pcy + 4):
        # a bright `E` glowing ring around each dish rim (energized culture bloom)
        for a in range(0, 360, 18):
            rx2 = pcx + (dish_rx - 1) * math.cos(math.radians(a))
            ry2 = dcy + dish_ry * math.sin(math.radians(a))
            if inside(rx2, ry2, 0.3):
                c.set(int(round(rx2)), int(round(ry2)), "E")
        c.set(pcx, dcy, "E")                          # bright bloom centre
    # a brighter energized lamp bar wash across the top interior (the lamp now drives the bloom)
    for x in range(pcx - prx + 3, pcx + prx - 2):
        if inside(x, pcy - pry + 2, 0.5):
            c.set(x, pcy - pry + 2, "E")
    # brighten the c/O target gauge tick on the rack right (the prediction game maxed)
    gx = pcx + 6
    if inside(gx, pcy - 2, 0.3):
        c.set(gx, pcy - 2, "O")
    if inside(gx, pcy - 1, 0.3):
        c.set(gx, pcy - 1, "E")

    # --- (2a) GOLD gasket ring on the hatch PORTHOLE rim (premium sealed trim) ---
    for a in range(0, 360, 30):
        c.set(int(round(pcx + prx * math.cos(math.radians(a)))),
              int(round(pcy + pry * math.sin(math.radians(a)))), "q")
    # two brighter O gold bosses at the cardinal top/bottom of the ring
    c.set(pcx, pcy - pry, "O")
    c.set(pcx, pcy + pry, "O")

    # --- (2b) GOLD dome FINIAL crowning the main humidity dome (recomputed from `dome`) ---
    cx, cy, drx, dry, height = dome
    crown_y = cy - height                             # the dome crown peak
    c.set(cx, crown_y - 1, "q")                       # gold finial stem
    c.set(cx, crown_y - 2, "q")
    c.set(cx, crown_y - 3, "O")                       # bright gold ball cap on top
    c.set(cx - 1, crown_y - 2, "q"); c.set(cx + 1, crown_y - 2, "q")   # finial cross-arms

    # --- (2c) a small gold ridge boss on the lit-left roof shoulder between the domes ---
    rb = body.roof_pt(0.30, 0.55)
    rbx, rby = int(round(rb[0])), int(round(rb[1]))
    c.set(rbx, rby, "q")
    c.set(rbx, rby - 1, "O")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the incubation chamber at upgrade `stage` (1..5). Stage 1 is IDENTICAL
    to the shipped base; each higher stage keeps every prior addition and bolts on the
    next (t2 aux-climate → t3 gas annex → t4 second dome → t5 culture-max + gold).
    Painter's order keeps rooftop/overhead additions on top of the masses they grow
    from, and the porthole-interior flourishes are drawn last so they stay clipped to
    the glass."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    body = pod_body(c)                       # sealed insulated pod (back/under)
    dome = humidity_dome(c, body)            # frosted humidity dome cap (climate cap)
    roof_boxes(c, body)                      # thermostat + heater boxes flanking the dome
    porthole = right_hatch(c, body)          # HERO sealed hatch + big glowing porthole RIGHT
    petri_carousel(c, porthole)              # SIGNATURE petri carousel seen through the glass

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    # t2 aux climate (roof boxes + porthole brighten) sits on the roof / in the glass;
    # t3 gas annex grounds on the LEFT footing; t4 second dome rises front-left of the
    # first; t5 re-lights the carousel + lays gold trim. Each anchors off the SAME pod /
    # dome / porthole sources above so cumulative parts stay registered.
    if stage >= 2:
        stage2_aux_climate(c, body, dome, porthole)
    if stage >= 3:
        stage3_gas_annex(c, body)
    if stage >= 4:
        stage4_second_dome(c, body, dome)
    if stage >= 5:
        stage5_culture_max(c, body, dome, porthole)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/biocore"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "incubation-chamber"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG +
    scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must keep
    matching the shipped incubation-chamber.png, so it does NOT overwrite the base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": BIO, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"biocore_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"biocore_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
