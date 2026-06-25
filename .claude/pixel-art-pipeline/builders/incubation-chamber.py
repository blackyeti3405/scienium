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

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box, cylinder

BIO = {"K": "#1a2417", "W": "#e8f2d8", "L": "#c4dba6", "M": "#9fc07e", "D": "#6f9456",
       "d": "#4a6e3a", "h": "#d2f7ec", "c": "#9fefcf", "g": "#36cc9e", "G": "#1d8f70",
       "o": "#f0b24d", "O": "#ffd488", "r": "#b9701e"}


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


def build():
    c = Canvas()
    body = pod_body(c)          # sealed insulated pod (back/under)
    humidity_dome(c, body)      # frosted humidity dome cap (climate cap)
    roof_boxes(c, body)         # thermostat + heater boxes flanking the dome
    porthole = right_hatch(c, body)  # HERO sealed hatch + big glowing porthole RIGHT
    petri_carousel(c, porthole)      # SIGNATURE petri carousel seen through the glass
    spec = {"width": 64, "height": 64, "palette": BIO, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/biocore_incubation-chamber.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
