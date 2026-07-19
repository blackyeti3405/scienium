#!/usr/bin/env python3
"""
Bespoke gateway builder — OPERATIONS HUB.  IMAGE-MATCH mode.

Translates art_ref/mockups/operations_hub.png: a WIDE, TWO-STORY control center
(lower window/door story + set-back upper control room), whose UNDISPUTED HERO is
a big ORANGE-FRAMED TILTED CONTROL SCREEN mounted on the front-left roof (teal
glass, an arrow cursor). Around it:

  • a GREEN-STRIPED vent/window panel lying on the right roof;
  • two little PERISCOPE antennae poking up at the back-left of the roof;
  • a diagonal ORANGE HAZARD-STRIPE band across the upper front + a small hatch;
  • an ORANGE OPERATOR / camera stick-figure on the upper right (shaded) face;
  • the lower story: a wide dim WINDOW (front-left) + a framed DOORWAY (front-right)
    with orange eave trim.

Composed entirely from isobuild primitives (Box + face glazing + hand-placed
detail). NEVER uses iso.draw_cube / base_windows. Emits the char grid to
art/src/operations_hub_generic.json (recolor.py reads it), renders the native PNG
to apps/web/public/sprites/gateways/ and an x8 inspection preview to art/preview/.

Run:  art/.venv/bin/python3 art/gateways/build_operations_hub.py
"""
from __future__ import annotations

import json
import math
import os
import sys

# make the art/ package dir importable no matter the cwd
ART_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ART_DIR not in sys.path:
    sys.path.insert(0, ART_DIR)

from PIL import Image

from canon import CANON
from iso import Canvas
from isobuild import Box
from render_pixel_art import render

ROOT = os.path.dirname(ART_DIR)
SRC_DIR = os.path.join(ART_DIR, "src")
PREVIEW_DIR = os.path.join(ART_DIR, "preview")
GATE_DIR = os.path.join(ROOT, "apps", "web", "public", "sprites", "gateways")

KEY = "operations_hub"
SIZE = 64


# ── small vector helpers ──────────────────────────────────────────────────────
def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def toward(p, center, dist):
    dx, dy = center[0] - p[0], center[1] - p[1]
    L = math.hypot(dx, dy) or 1.0
    return (p[0] + dx / L * dist, p[1] + dy / L * dist)


# ── HERO: the big orange-framed TILTED control screen ─────────────────────────
def tilted_screen(c: Canvas, bl, br, tr, tl) -> None:
    """A drafting-style monitor tilted up off the roof: an EVEN orange frame
    (K bezel outside, o body, O lit top/left lip + r shaded lower/right), a SOLID
    teal glass face framed by an inner K bezel, and one clean bright ↗ cursor.
    `bl/br` are the near (front, low) corners, `tr/tl` the far (back, raised)
    corners. This is the sprite's focal feature — kept crisp, no stray pixels."""

    def inset(f):
        """Even fractional inset of the parallelogram → uniform frame thickness
        (opposite sides equal by construction, so the frame reads even)."""
        ibl = (bl[0] + f * ((br[0] - bl[0]) + (tl[0] - bl[0])),
               bl[1] + f * ((br[1] - bl[1]) + (tl[1] - bl[1])))
        ibr = (br[0] + f * ((bl[0] - br[0]) + (tr[0] - br[0])),
               br[1] + f * ((bl[1] - br[1]) + (tr[1] - br[1])))
        itr = (tr[0] + f * ((br[0] - tr[0]) + (tl[0] - tr[0])),
               tr[1] + f * ((br[1] - tr[1]) + (tl[1] - tr[1])))
        itl = (tl[0] + f * ((tr[0] - tl[0]) + (bl[0] - tl[0])),
               tl[1] + f * ((tr[1] - tl[1]) + (bl[1] - tl[1])))
        return ibl, ibr, itr, itl

    # --- orange frame slab (fill the whole outer quad) ---
    c.fill_poly([bl, br, tr, tl], "o")

    # --- SOLID teal GLASS face, evenly inset so the orange frame is uniform ---
    gbl, gbr, gtr, gtl = inset(0.22)
    c.fill_poly([gbl, gbr, gtr, gtl], "g")

    # --- frame shading: lit lip top/left, shadow bottom/right (inside the bezel) ---
    sbl, sbr, str_, stl = inset(0.10)
    c.line(stl, str_, "O")                    # raised back lip (catches light)
    c.line(stl, sbl, "O")                     # left lip
    c.line(sbl, sbr, "r")                     # near front sill (shadow)
    c.line(sbr, str_, "r")                    # right edge (shadow)

    # --- one clean up-right (↗) cursor, bold + bright on the solid teal field ---
    cx = round((gbl[0] + gbr[0] + gtr[0] + gtl[0]) / 4)
    cy = round((gbl[1] + gbr[1] + gtr[1] + gtl[1]) / 4)
    tx, ty = cx + 3, cy - 3                            # NE tip
    # SOLID right-angle arrowhead (right angle at the NE tip, legs pointing W + S,
    # hypotenuse facing SW) reads unmistakably as a cursor, not a glass reflection
    c.fill_poly([(tx, ty), (tx - 4, ty), (tx, ty + 4)], "W")
    c.line((tx - 3, ty), (tx, ty + 3), "K")            # crisp SW edge so the head pops
    # short shaft trailing SW out of the head
    c.line((tx - 2, ty + 2), (tx - 5, ty + 5), "W")
    c.line((tx - 3, ty + 2), (tx - 5, ty + 4), "h")    # 2px-thick shaft underside

    # --- crisp K bezels: outer silhouette + inner glass frame (nothing outside) ---
    for a, b in [(bl, br), (br, tr), (tr, tl), (tl, bl)]:
        c.line(a, b, "K")
    for a, b in [(gbl, gbr), (gbr, gtr), (gtr, gtl), (gtl, gbl)]:
        c.line(a, b, "K")


# ── GREEN-STRIPED vent / window panel lying on the right roof ─────────────────
def green_vent(c: Canvas, box: Box, u0, u1, v0, v1) -> None:
    """A framed panel of green glass with darker diagonal slats — the drawing's
    green striped roof vent. Distinct from the teal hero glass by being green
    (g/G) + striped + flat on the roof."""
    rp = box.roof_pt
    a, b = rp(u0, v0), rp(u1, v0)      # near edge (left→right)
    d, e = rp(u0, v1), rp(u1, v1)      # far edge
    c.fill_poly([a, b, e, d], "g")     # green body
    c.line(a, b, "c")                  # bright near lip
    # CORRUGATED slats: a bright h ridge in front of each dark G groove, so the vent
    # reads as ridged striping — visibly distinct from the hero screen's smooth glass
    n = 5
    for i in range(1, n + 1):
        t = i / (n + 0.5)
        th = max(0.0, t - 0.5 / (n + 0.5))            # highlight ridge just in front
        c.line(lerp(a, d, th), lerp(b, e, th), "h")   # bright ridge
        c.line(lerp(a, d, t), lerp(b, e, t), "G")     # dark groove
    # clean K frame
    for p, q in [(a, b), (b, e), (e, d), (d, a)]:
        c.line(p, q, "K")


# ── PERISCOPE antenna (the little "9"/lollipop loop poking up) ────────────────
def periscope(c: Canvas, base, top_y) -> None:
    """A slim K mast topped by a small round loop — a '9'/lollipop antenna. Placed
    to stand ABOVE/BEHIND the hero screen against the plain roof/background (its
    lower mast is masked by the screen), so it reads as an antenna, not a spark."""
    x = round(base[0])
    by = round(base[1])
    ty = int(top_y)
    c.line((x, by), (x, ty + 1), "K")                 # mast up to the loop base
    for dx, dy in [(-1, -1), (0, -1), (1, -1), (-1, 0),
                   (1, 0), (-1, 1), (0, 1), (1, 1)]:   # small round K ring
        c.set(x + dx, ty + dy, "K")
    c.set(x, ty, "o")                                  # warm blip in the loop
    c.set(x, ty - 2, "O")                              # bright tip catches light


# ── ORANGE OPERATOR / camera figure on the shaded right face ──────────────────
def operator(c: Canvas, box: Box, u, v_head) -> None:
    """A legible orange stick-figure on the upper right (shaded) face — the
    drawing's operator. Round 2x2 orange head with a K outline, an orange body,
    two raised arms and two splayed legs; enough K contrast to read on the dark
    face. No abstract sparkle/star pixels."""
    hx, hy = box.right_pt(u, v_head)
    hx, hy = round(hx), round(hy)
    sx = hx                                        # spine column
    # --- round head: 2x2 orange block boxed by a K outline ---
    for dx, dy in [(0, 0), (1, 0), (0, 1), (1, 1)]:
        c.set(hx + dx, hy + dy, "o")               # head fill
    for dx, dy in [(0, -1), (1, -1), (-1, 0), (-1, 1), (2, 0), (2, 1)]:
        c.set(hx + dx, hy + dy, "K")               # crown + cheek outline
    c.set(hx, hy, "O")                             # small lit highlight on the head
    # --- body: orange torso with a K outline top/bottom ---
    c.line((sx, hy + 2), (sx, hy + 6), "K")
    c.set(sx, hy + 3, "o")
    c.set(sx, hy + 4, "o")
    # --- raised arms (orange — the caution pose the drawing shows) ---
    c.line((sx, hy + 3), (sx - 2, hy + 1), "o")
    c.line((sx, hy + 3), (sx + 3, hy + 2), "o")
    # --- splayed legs (dark, tripod-like) ---
    c.line((sx, hy + 6), (sx - 2, hy + 9), "K")
    c.line((sx, hy + 6), (sx + 2, hy + 9), "K")


# ── diagonal ORANGE HAZARD-STRIPE band across a wall face ─────────────────────
def hazard_band(c: Canvas, box: Box, face: str, u0, u1, vtop,
                cap0: bool = True, cap1: bool = True) -> None:
    """A 3px orange caution band with diagonal r slashes, held parallel to the
    bottom wall edge. Two calls (left + right face) WRAP the front corner: pass
    the shared corner end with cap*=False so it doesn't break at a K notch."""
    pt = box.left_pt if face == "left" else box.right_pt
    c.fill_poly([pt(u0, vtop), pt(u1, vtop), pt(u1, vtop + 3), pt(u0, vtop + 3)], "o")
    c.line(pt(u0, vtop), pt(u1, vtop), "O")             # top sheen lip
    c.line(pt(u0, vtop + 3), pt(u1, vtop + 3), "r")     # bottom shadow sill
    # diagonal caution slashes — bold DARK slashes with orange gaps between, so the
    # band reads as caution striping instead of a solid orange bar
    span = u1 - u0
    n = max(4, int(span / 0.11))
    for i in range(n + 1):
        um = u0 + span * i / n
        c.line(pt(um, vtop + 3), pt(min(u1, um + 0.035), vtop), "K")
        c.line(pt(min(u1, um + 0.035), vtop + 3), pt(min(u1, um + 0.055), vtop), "r")
    if cap0:
        c.line(pt(u0, vtop), pt(u0, vtop + 3), "K")
    if cap1:
        c.line(pt(u1, vtop), pt(u1, vtop + 3), "K")


def hatch(c: Canvas, box: Box, u0, u1, v0, v1) -> None:
    """A small framed SQUARE access hatch on the upper front (lit) face, sitting
    front-of-corner just below the rooftop screen — a raised LIGHT panel with a
    clean K frame, a thin shaded sill and a little orange latch, matching the small
    square panel drawn on the front face in the reference."""
    lp = box.left_pt
    c.fill_poly([lp(u0, v0), lp(u1, v0), lp(u1, v1), lp(u0, v1)], "L")        # raised light panel
    c.fill_poly([lp(u0, v1 - 1.0), lp(u1, v1 - 1.0), lp(u1, v1), lp(u0, v1)], "D")  # thin shaded sill
    for a, b in [(lp(u0, v0), lp(u1, v0)), (lp(u0, v1), lp(u1, v1)),
                 (lp(u0, v0), lp(u0, v1)), (lp(u1, v0), lp(u1, v1))]:
        c.line(a, b, "K")
    c.set(*lp(u1 - 0.08, v0 + (v1 - v0) * 0.5), "o")   # small latch on the front jamb


def doorway(c: Canvas, box: Box, u0, u1, v0, v1) -> None:
    """A framed doorway on the lower front-right face."""
    rp = box.right_pt
    c.fill_poly([rp(u0, v0), rp(u1, v0), rp(u1, v1), rp(u0, v1)], "d")
    c.fill_poly([rp(u0, v0 + 1.2), rp(u1, v0 + 1.2), rp(u1, v1), rp(u0, v1)], "K")
    c.line(rp(u0, v0), rp(u1, v0), "o")               # orange lintel trim
    c.line(rp(u0 + 0.04, v0 + 1.2), rp(u0 + 0.04, v1), "d")   # lit jamb
    c.set(*rp(u1 - 0.06, v0 + (v1 - v0) * 0.55), "O")  # handle glint
    for a, b in [(rp(u0, v0), rp(u1, v0)),
                 (rp(u0, v0), rp(u0, v1)), (rp(u1, v0), rp(u1, v1))]:
        c.line(a, b, "K")


def contact_shadow(c: Canvas) -> None:
    scx, scy, rx, ry = 32, 58, 24, 4
    for y in range(scy - ry, scy + ry + 1):
        for x in range(scx - rx, scx + rx + 1):
            if ((x - scx) / rx) ** 2 + ((y - scy) / ry) ** 2 <= 1.0:
                c.set(x, y, "K")


# ── assemble ──────────────────────────────────────────────────────────────────
def build() -> Canvas:
    c = Canvas(SIZE, SIZE)
    contact_shadow(c)

    # ── LOWER story: a WIDE base block (window + door) ──
    lower = Box(top=(32, 20), wx=12, wy=12, h=12)
    lower.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W")
    # wide dim WINDOW on the front-left (lit) face — one broad DARK BLUE/PURPLE pane
    # (d/D glass over a K sill) with a cool sheen, so it stops mirroring the teal vent
    lower.window(c, "left", 0.10, 0.68, 2.5, 9.5,
                 glass="d", hi="D", shade="K", mullions=0, sheen="c")
    # framed DOORWAY on the front-right (shaded) face
    doorway(c, lower, 0.44, 0.66, 1.5, 11.0)
    # orange eave trim along the top of the lower faces
    c.line(lower.left_pt(0.04, 1.2), lower.left_pt(0.96, 1.2), "o")
    c.line(lower.right_pt(0.06, 1.2), lower.right_pt(0.40, 1.2), "r")

    # ── UPPER story: the set-back CONTROL ROOM (smaller footprint → a ledge shows) ──
    upper = Box(top=(32, 8), wx=10, wy=10, h=12)
    upper.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", with_shadow=False)

    # diagonal ORANGE HAZARD band across the upper front — full on the left face,
    # only the front portion of the right face (leaving room for the operator)
    hazard_band(c, upper, "left", 0.06, 1.0, 8.0, cap0=True, cap1=False)
    hazard_band(c, upper, "right", 0.0, 0.52, 8.0, cap0=False, cap1=True)
    # framed square hatch, front-centre on the lit face (just below the rooftop screen)
    hatch(c, upper, 0.56, 0.82, 3.0, 7.5)

    # ORANGE OPERATOR figure on the upper right (shaded) face, clear of the band
    operator(c, upper, u=0.70, v_head=1.8)

    # GREEN-STRIPED vent lying on the right half of the roof (drawn before the
    # hero so the hero wins any edge overlap)
    green_vent(c, upper, 0.62, 0.96, 0.34, 0.86)

    # PERISCOPE antennae — drawn BEFORE the hero so the screen masks their bases
    # and only the loops poke up above the screen's top edge
    periscope(c, upper.roof_pt(0.10, 0.66), top_y=4)
    periscope(c, upper.roof_pt(0.22, 0.74), top_y=5)

    # HERO: the big orange-framed TILTED control screen — dominates the front-left
    # roof like a drafting table. A TRAPEZOID: a WIDE front edge running the whole
    # left→front roof edge and reaching the front corner, plus a narrower RAISED
    # back edge kept left of the green vent. Drawn last so it wins every overlap.
    uAf, uBf, vN = 0.05, 0.90, 0.0     # front (near, low) edge — wide, reaches the front corner
    uAb, uBb, vF = 0.05, 0.50, 0.60    # back (far, raised) edge — narrower, clear of the vent
    LIFT = 6.0
    bl = upper.roof_pt(uAf, vN)
    br = upper.roof_pt(uBf, vN)
    _tr = upper.roof_pt(uBb, vF); tr = (_tr[0], _tr[1] - LIFT)
    _tl = upper.roof_pt(uAb, vF); tl = (_tl[0], _tl[1] - LIFT)
    tilted_screen(c, bl, br, tr, tl)

    return c


# ── emit: source JSON (recolor.py reads it) + PNG + x8 preview ────────────────
def emit() -> None:
    c = build()
    spec = {"width": SIZE, "height": SIZE, "palette": CANON, "rows": c.rows()}
    os.makedirs(SRC_DIR, exist_ok=True)
    os.makedirs(GATE_DIR, exist_ok=True)
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    with open(os.path.join(SRC_DIR, f"{KEY}_generic.json"), "w") as fh:
        json.dump(spec, fh, indent=0)

    img = render(spec)
    img.save(os.path.join(GATE_DIR, f"{KEY}_generic.png"))
    big = img.resize((SIZE * 8, SIZE * 8), Image.NEAREST)
    bg = Image.new("RGBA", big.size, (210, 210, 218, 255))
    bg.alpha_composite(big)
    bg.save(os.path.join(PREVIEW_DIR, f"{KEY}_generic.png"))
    print(f"built {KEY}: {GATE_DIR}/{KEY}_generic.png")


if __name__ == "__main__":
    emit()
