#!/usr/bin/env python3
"""
Research Plan — GATEWAY building · CREATIVE mode (_t5 spectacular).

A maxed-out "clearance-5" reinterpretation (NOT a copy of the mockup): a HOLOGRAPHIC
DRAFTING HALL. A low, wide engineering studio with two big glowing drafting SCREENS on
its front faces projects — from a teal projector LENS on its roof — a thin BEAM of light
that resolves into the hero: a floating, rotating 3D holographic WIREFRAME BLUEPRINT —
an open octahedron schematic drawn as crisp glowing teal EDGES (silhouette diamond +
equator ring + vertical meridian), sparse `g`/`G` grid dots letting light through, glowing
node vertices, and ORANGE engineering DIMENSION annotations (arrows + ticks) measuring it.
Two small holographic spec-cards hover to the sides; W sparkles twinkle throughout.

North star: the `_t5` economy buildings (glowing holograms, beams, sparkles) —
mindframe data-visualization-studio (floating holo charts) + axiom computation-cluster.

HARD palette rule (recolor-safe): ONLY the 13 canonical chars K W L M D d / h c g G /
o O r. Colour = teal glass h/c/g/G (glow / hologram), orange o/O/r (beam sparks / grid
ticks), W sparkles, L/M/D/d walls, K outline (building only — the hologram carries NO
black so it reads as pure floating light). recolor.py reskins it per char.

Composed from art/isobuild.Box + cylinder + hand-placed light, on the canonical palette.

Draw order (painter's algorithm, back → front):
  contact shadow → blueprint-tube rack (back-right) → main hall (walls, glowing drafting
  screens, roof lens + skylights + eave trim) → thin projector BEAM → floating WIREFRAME
  hologram (hero) → orange DIMENSION annotations → side spec-cards → W sparkles.

Serializes to art/src/research_plan_creative_generic.json (recolor.py reads it) and
renders apps/web/public/sprites/gateways/research_plan_creative.png + an x8 preview.
"""
from __future__ import annotations

import json
import math
import os
import sys

ART = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ART)

from PIL import Image                              # noqa: E402

from iso import Canvas                             # noqa: E402
from isobuild import Box, cylinder                 # noqa: E402
from render_pixel_art import render               # noqa: E402

SIZE = 64

# ── Generic palette (== canon keys; recolor.py reskins by char) ────────────────────
PAL = {
    "K": "#241f38",  # outline / deepest shadow
    "W": "#e2dcf0",  # wall highlight / sparkle white
    "L": "#cdc6e2",  # wall light (roof top / lit)
    "M": "#b0a6ca",  # wall mid (lit face)
    "D": "#897ea6",  # wall dark (shaded face)
    "d": "#6f6592",  # wall darker (recess)
    "h": "#d2f7f4",  # glass / holo highlight (brightest teal)
    "c": "#a0efea",  # glass / holo light (glow)
    "g": "#41d2d0",  # glass / holo mid
    "G": "#23808b",  # glass / holo dark (dim / far edges)
    "o": "#ff9243",  # accent orange
    "O": "#ffc089",  # accent light
    "r": "#d9641f",  # accent dark
}

# iso basis (matches isobuild)
RX, RY = 2, 1
LX, LY = -2, 1


# ── tiny light primitives ──────────────────────────────────────────────────────────
def sparkle(c: Canvas, x: float, y: float, core: str = "W", arm: str = "c",
            big: bool = False) -> None:
    """A four-point twinkle: bright core + teal arms (and long arms when `big`)."""
    x, y = round(x), round(y)
    c.set(x, y, core)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        c.set(x + dx, y + dy, arm)
    if big:
        for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2)):
            c.set(x + dx, y + dy, "g")


def glow_dot(c: Canvas, x: float, y: float, core: str = "h", halo: str = "c") -> None:
    """A single glowing node: bright pixel with a soft teal halo."""
    x, y = round(x), round(y)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        c.set(x + dx, y + dy, halo)
    c.set(x, y, core)


# ── 0. contact shadow ───────────────────────────────────────────────────────────────
def contact_shadow(c: Canvas) -> None:
    # Stop one row short of the ellipse's bottom tip so it never leaves a lone
    # single-pixel dot floating below the shadow body (row 62 orphan).
    scx, scy, rx, ry = 32, 58, 23, 4
    for y in range(scy - ry, scy + ry):
        for x in range(scx - rx, scx + rx + 1):
            if ((x - scx) / rx) ** 2 + ((y - scy) / ry) ** 2 <= 1.0:
                c.set(x, y, "K")


# ── 1. rolled-blueprint TUBE RACK (back-right silhouette accent) ─────────────────────
def tube_rack(c: Canvas) -> None:
    """A cluster of upright rolled-plan tubes behind the hall's right shoulder — thin
    teal cylinders with a bright `c` iso top-cap ellipse (so each reads as a 3D cylinder
    like the _t5 axiom tanks, not a flat 2D bar), glowing caps and orange end-bands."""
    for cx, ty, h, cap in ((52, 34, 16, "c"), (56, 37, 15, "h"), (58, 42, 12, "g")):
        info = cylinder(c, cx, ty, 2.5, h, top=cap, side_l="g", side_r="G", outline="K")
        rxx, ryy = info["rx"], info["ry"]
        # bright c top-cap ellipse lip (front arc) — sells the round 3D top
        for a in range(0, 181, 30):
            c.set(cx + rxx * math.cos(math.radians(a)),
                  ty + ryy * math.sin(math.radians(a)), "c")
        c.set(cx, ty - 1, "W")                            # glint on the rolled paper
        c.line((cx - 2, ty + 2), (cx + 2, ty + 2), "o")   # orange end-band


# ── 2. the DRAFTING HALL body + glowing screens + roof lens ─────────────────────────
def draw_drafting_screen(c: Canvas, b: Box, face: str, u0, u1, v0, v1,
                         glass="g", top="h", tick="c", frame="K") -> None:
    """A crisp glowing DRAFTING SCREEN: a solid glass rectangle with one bright 1px top
    edge and two straight schematic DATUM lines (each with a short end tick) — a clean
    engineering readout, NOT the melty diagonal sheen that reads as ice."""
    pt = b.left_pt if face == "left" else b.right_pt
    c.fill_poly([pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)], glass)
    c.line(pt(u0 + 0.04, v0 + 0.7), pt(u1 - 0.04, v0 + 0.7), top)   # bright top edge
    H = v1 - v0
    for frac in (0.40, 0.70):                                       # two datum lines
        vy = v0 + H * frac
        c.line(pt(u0 + 0.08, vy), pt(u1 - 0.12, vy), tick)
        c.line(pt(u1 - 0.12, vy), pt(u1 - 0.12, vy - 1.2), tick)    # short end tick up
    for a, d in [(pt(u0, v0), pt(u1, v0)), (pt(u0, v1), pt(u1, v1)),
                 (pt(u0, v0), pt(u0, v1)), (pt(u1, v0), pt(u1, v1))]:
        c.line(a, d, frame)


def drafting_hall(c: Canvas) -> Box:
    """A low wide iso hall: lavender walls, two big glowing drafting screens on the front
    faces, a teal projector lens + skylight strips on the roof, and warm eave trim."""
    b = Box(top=(30, 29), wx=9, wy=8, h=11)
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # LEFT (lit) face — a big clean glowing drafting SCREEN + a small side monitor
    draw_drafting_screen(c, b, "left", 0.10, 0.60, 3.0, 9.2, glass="g", top="h", tick="c")
    b.window(c, "left", 0.68, 0.90, 3.6, 8.6, glass="c", hi="h", shade="G",
             frame="K", sheen="h")                       # small side monitor

    # RIGHT (shaded) face — brighter interior-lit screen + small secondary window
    draw_drafting_screen(c, b, "right", 0.10, 0.66, 2.6, 9.4, glass="c", top="h", tick="g")
    b.window(c, "right", 0.74, 0.92, 5.2, 9.0, glass="g", hi="c", shade="G",
             frame="K", sheen="h")                       # small secondary window

    # ROOF: skylight strips + warm eave trim + the projector LENS (beam source)
    for f in (0.30, 0.46, 0.62):
        c.line(b.roof_pt(0.20, f), b.roof_pt(0.66, f), "g")
    c.line(b.r_front, b.r_left, "o")                     # lit eave trim
    c.line(b.r_front, b.r_right, "r")                    # shaded eave trim

    lens = b.roof_pt(0.42, 0.52)                         # projector lens centre
    for yy in range(-2, 2):                              # a squat glowing dome/lens
        for xx in range(-4, 5):
            if (xx / 4.2) ** 2 + (yy / 2.2) ** 2 <= 1.0:
                col = "h" if (xx < 0 and yy < 0) else ("c" if xx < 2 else "g")
                c.set(lens[0] + xx, lens[1] + yy, col)
    for a in range(0, 360, 20):                          # rim ring
        c.set(lens[0] + 4.2 * math.cos(math.radians(a)),
              lens[1] + 2.2 * math.sin(math.radians(a)), "G")
    c.set(lens[0] - 1, lens[1] - 1, "W")                 # lens glint
    return b, lens


# ── 3. projector BEAM — a thin shaft of light from the lens up to the hologram ───────
def beam(c: Canvas, lens, top_y: float) -> None:
    """A thin projector shaft: a bright `h` core column rising from the lens to just
    below the hologram's bottom vertex, with a faint `c` halo — a clean, separate beam,
    NOT a wide dithered spray that dissolves the diamond's point."""
    lx, ly = lens
    span = ly - top_y
    for y in range(int(top_y), int(ly) + 1):
        f = (ly - y) / span                              # 0 at lens, 1 at the hologram
        cx = lx + (32 - lx) * f                          # drift toward centre at the top
        c.set(cx, y, "h")                                # bright core
        if y % 2 == 0:                                   # sparse faint halo
            c.set(cx - 1, y, "c")
            c.set(cx + 1, y, "c")


# ── 4. the floating WIREFRAME hologram (hero) + dimensions ──────────────────────────
def hologram(c: Canvas) -> None:
    """The hero: a floating 3D holographic WIREFRAME octahedron — a glowing translucent
    blueprint schematic. A crisp bright `h` silhouette DIAMOND + near EQUATOR ring, a `c`
    vertical MERIDIAN grid-plane line, and dim `G` far-equator edges give it open 3D form;
    sparse `g`/`G` grid dots inside let the light show through (a wireframe, NOT a filled
    gem). Glowing `h` nodes mark the vertices; the bottom apex closes to a defined `c`
    point above the beam. Pure light — carries NO K."""
    cx, cy = 32, 15                                      # octahedron centre (equator)
    T, Btm = (32, 2), (32, 28)                           # top / bottom apex
    L, R = (18, 15), (46, 15)                            # equator L / R (silhouette widest)
    F, Bk = (32, 19), (32, 11)                           # equator front (near) / back (far)
    HW, HH = 14, 13                                      # rhombus half-extents (for grid)

    # 1 ── sparse interior GRID DOTS (translucent wireframe fill; light shows through)
    for gy in range(4, 27, 3):
        for gx in range(19, 46, 3):
            if (abs(gx - cx) / HW + abs(gy - cy) / HH <= 0.80
                    and (gx // 3 + gy // 3) % 2 == 0):
                c.set(gx, gy, "g" if gx < cx else "G")

    # 2 ── dim CONTINUOUS far-equator (hidden back) edges for depth
    c.line(L, Bk, "G")
    c.line(Bk, R, "G")

    # 3 ── vertical MERIDIAN grid-plane line (front) in c
    c.line(T, Btm, "c")

    # 4 ── near EQUATOR ring — crisp bright h horizontal grid-plane
    c.line(L, F, "h")
    c.line(F, R, "h")

    # 5 ── four SILHOUETTE edges — crisp bright h diamond outline
    c.line(T, R, "h")
    c.line(R, Btm, "h")
    c.line(Btm, L, "h")
    c.line(L, T, "h")

    # 6 ── glowing node vertices; bottom apex closes to a DEFINED c point (not a spray)
    for v in (T, L, R, F):
        glow_dot(c, v[0], v[1], core="h", halo="c")
    glow_dot(c, Btm[0], Btm[1], core="c", halo="g")

    # ── orange ENGINEERING DIMENSION annotations (thin extension ticks + arrows) ──
    dy = Btm[1] + 3                                       # horizontal WIDTH dim (below)
    x0, x1 = L[0] - 1, R[0] + 1
    c.line((x0, dy), (x1, dy), "o")
    for ex in (L[0], R[0]):                               # short extension ticks
        c.line((ex, dy - 3), (ex, dy - 1), "r")
    for ax, s in ((x0, 1), (x1, -1)):                     # inward arrowheads
        c.set(ax, dy, "O"); c.set(ax + s, dy - 1, "o"); c.set(ax + s, dy + 1, "o")
    hx = R[0] + 2                                         # vertical HEIGHT caliper (right)
    c.line((hx, 6), (hx, 24), "o")
    for ey in (6, 24):
        c.line((hx - 3, ey), (hx - 1, ey), "r")
    for yy, s in ((6, 1), (24, -1)):
        c.set(hx, yy, "O"); c.set(hx - 1, yy + s, "o")


# ── 5. floating holographic SPEC-CARDS (side detail, like the _t5 charts) ───────────
def spec_card(c: Canvas, x0, y0, w, h, kind: str) -> None:
    """A small hovering blueprint READOUT — matching its twin: a thin faint `c`/`G` grid,
    a crisp `c` border, and ONE bright `h` diagram line/curve, so both flanking panels read
    as engineering schematics (not a dotted calendar on one side + a checkerboard mesh on
    the other). `kind` only swaps the single plotted line."""
    # thin faint blueprint grid (sparse dim lines), inset inside the border
    for gx in range(x0 + 3, x0 + w - 1, 4):
        c.line((gx, y0 + 1), (gx, y0 + h - 1), "G")
    for gy in range(y0 + 3, y0 + h - 1, 4):
        c.line((x0 + 1, gy), (x0 + w - 1, gy), "G")
    # crisp glowing border
    for a, b in [((x0, y0), (x0 + w, y0)), ((x0 + w, y0), (x0 + w, y0 + h)),
                 ((x0 + w, y0 + h), (x0, y0 + h)), ((x0, y0 + h), (x0, y0))]:
        c.line(a, b, "c")
    # one bright diagram line/curve over the grid
    if kind == "plan":                                   # an elevation peak
        pts = [(x0 + 2, y0 + h - 3), (x0 + w // 2, y0 + 2), (x0 + w - 2, y0 + h - 3)]
    else:                                                # a rising response curve
        pts = [(x0 + 2, y0 + h - 2), (x0 + w // 3, y0 + h // 2),
               (x0 + 2 * w // 3, y0 + h // 2 - 1), (x0 + w - 2, y0 + 2)]
    for i in range(len(pts) - 1):
        c.line(pts[i], pts[i + 1], "h")
    c.set(x0, y0, "o"); c.set(x0 + 1, y0, "O")           # orange corner tick
    c.set(x0 + w - 1, y0 + h - 1, "W")                   # glint


# ── 6. assemble ──────────────────────────────────────────────────────────────────────
def build() -> Canvas:
    c = Canvas()
    contact_shadow(c)
    tube_rack(c)
    b, lens = drafting_hall(c)
    beam(c, lens, top_y=30)
    hologram(c)
    spec_card(c, 6, 12, 10, 9, kind="plan")             # upper-left card
    spec_card(c, 50, 17, 11, 8, kind="graph")           # right card
    # ambient sparkles floating around the hologram (kept clear of the wireframe)
    for x, y, big in ((13, 8, True), (51, 11, False),
                      (10, 23, False), (55, 26, True)):
        sparkle(c, x, y, core="W", arm="c", big=big)
    return c


# ── 7. emit: JSON (recolor.py reads it) + native PNG + x8 preview ───────────────────
SRC = os.path.join(ART, "src", "research_plan_creative_generic.json")
PNG = os.path.join(ART, "..", "apps", "web", "public", "sprites", "gateways",
                   "research_plan_creative.png")
PREVIEW = os.path.join(ART, "preview", "research_plan_creative.png")


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
    print(f"research_plan_creative → {PNG}")
    print(f"preview                → {PREVIEW}")


if __name__ == "__main__":
    emit()
