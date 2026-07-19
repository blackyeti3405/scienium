#!/usr/bin/env python3
"""
Literature Review — GATEWAY building (BESPOKE open reading pavilion; recolored by recolor.py).

NOT the shared gateway cube (iso.draw_cube / base_windows are FORBIDDEN here). This TRANSLATES the
hand-drawn mockup (art_ref/mockups/literature_review.png): an airy multi-tier reading pavilion whose
signature is an OPEN glass reading terrace on top (you see INTO it — the glass canopy is propped up
like an open lid, not a closed slab) with a big OPEN BOOK splayed on the balcony ledge below it.
Orange support columns run between the levels; the lower level wears a colored book-spine shelf band,
a dark arched entrance, and a slatted side awning on thin posts.

MASSING IS SHAPE-LOCKED (.claude/pixel-art-pipeline/blueprints/literature_review.md): three
isobuild.poly_prism solids used VERBATIM — a single L-shaped ground floor, a 2nd-floor MAIN reading
rectangle, and a 2nd-floor EXTRA corner box. The footprint is NOT changed; every detail is painted
ON TOP of that locked body. Box() instances here are COORDINATE HELPERS ONLY — they share the exact
poly_prism iso basis (wx==u/RIGHT axis, wy==v/LEFT axis) so their .left_pt/.right_pt/.roof_pt land on
the real faces of the drawn solids; no extra massing is emitted from them.

Iso contract: 64x64, 2:1 iso, front corner to viewer, lit upper-left, hard K outline, canonical
palette (recolor.py reskins by char). Draw order (painter's, back->front): locked massing (lower L ->
main room -> extra box) -> open tray + propped glass canopy -> upper front details -> lower front
details (shelf band, hatched blinds, arch) -> side awning -> open book (frontmost focal tell).
"""
from __future__ import annotations

import json
import math
import os
import sys

ART = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ART)

from iso import Canvas                         # noqa: E402  (shared canvas: set/fill_poly/line/rows)
from isobuild import Box, poly_prism           # noqa: E402  (bespoke iso prism toolkit)
from canon import CANON                        # noqa: E402  (generic palette == blueprint hexes)
from render_pixel_art import render            # noqa: E402

SIZE = 64
SRC = os.path.join(ART, "src", "literature_review_generic.json")
PNG = os.path.join(ART, "..", "apps", "web", "public", "sprites", "gateways",
                   "literature_review_generic.png")
PREVIEW = os.path.join(ART, "preview", "literature_review_generic.png")


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


# ── LOCKED massing (verbatim from the blueprint) ──────────────────────────────
# W,H,a,d and the three poly_prism calls are used EXACTLY as locked. `sw` flips
# (u,v)->(v,u). Screen anchors: LOWER unit(0,0)=(32,22); MAIN unit(0,0)=(32,10);
# EXTRA unit(0,0)=(30,14) but its footprint starts at u=6 so its back-top corner
# lands at (42,20).
W, H, A, D = 13, 12, 7, 6
_sw = lambda pts: [(v, u) for (u, v) in pts]

# Coordinate-only Box helpers that COINCIDE with the locked solids' faces.
LOWER = Box(top=(32, 22), wx=W, wy=H, h=12)    # bounding rect of the L (left/right faces align)
MAIN = Box(top=(32, 10), wx=A, wy=D, h=11)     # 2nd-floor reading rectangle (exact prism)
EXTRA = Box(top=(42, 20), wx=A - 1, wy=D - 1, h=9)  # 2nd-floor corner box (exact prism)


def massing(c):
    """The three LOCKED poly_prism solids, back->front. Single silhouettes, no re-skinned cube."""
    poly_prism(c, _sw([(0, 0), (W, 0), (W, H), (A, H), (A, D), (0, D)]),
               (32, 22), 12, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")   # ground L
    poly_prism(c, _sw([(0, 0), (A, 0), (A, D), (0, D)]),
               (32, 10), 11, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")   # main room
    poly_prism(c, _sw([(0, D), (A - 2, D), (A - 2, H), (0, H)]),
               (30, 14), 9, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")    # extra box


# ── 1+2. OPEN ROOFTOP TRAY — a flat-topped hollow rectangular crate you look INTO ─
def open_top(c, b):
    """Repaint the main-room roof (drawn solid by poly_prism) as a RAISED, flat-topped, hollow
    rectangular TRAY — an open-lidded crate you look straight INTO, the building's signature. Short
    outer walls lift a bold K-outlined rim RECTANGLE a few px ABOVE the roof plane (near rail low @
    the front corner, far rail high @ the back corner, two side rails between) so the top edge is a
    CRISP FLAT RECTANGLE — never a peaked mound. The interior FLOOR is recessed one whole step darker
    (`d`) and crossed by a faint grid; the two FAR interior walls read as a lighter (`M`) strip at the
    back (the wall you see into). A few thin survey-stake rods poke up from the near-left rim. No teal."""
    rp = b.roof_pt
    mg = 0.08                                               # small inset → tray sits just inside the roof edge
    wh = 5                                                  # tray wall height (px) the rim rises above the roof
    # floor corners on the ROOF plane (recessed bottom of the crate); rim = same rect lifted up by wh
    fL = rp(mg, mg);       fF = rp(1 - mg, mg)
    fT = rp(mg, 1 - mg);   fR = rp(1 - mg, 1 - mg)
    up = lambda p: (p[0], p[1] - wh)
    rimL, rimF, rimT, rimR = up(fL), up(fF), up(fT), up(fR)

    c.fill_poly([fL, fF, fR, fT], "d")                       # recessed interior floor (look DOWN into it)
    c.line(rp(0.5, mg), rp(0.5, 1 - mg), "D")               # faint interior grid — lengthwise
    c.line(rp(mg, 0.5), rp(1 - mg, 0.5), "D")               # faint interior grid — crosswise
    c.fill_poly([rimL, rimT, fT, fL], "M")                   # far interior wall (back-left) — lighter strip
    c.fill_poly([rimT, rimR, fR, fT], "M")                   # far interior wall (back-right) — lighter strip
    c.line(rimL, rimT, "L"); c.line(rimT, rimR, "L")         # lit top lip of the far wall (1-row lighter)
    c.fill_poly([rimL, rimF, fF, fL], "M")                   # near-left OUTER wall of the crate (lit face)
    c.fill_poly([rimF, rimR, fR, fF], "D")                   # near-right OUTER wall of the crate (shaded)
    for a, e in [(rimL, rimF), (rimF, rimR), (rimR, rimT), (rimT, rimL)]:  # bold flat rim RECTANGLE
        c.line(a, e, "K")
    c.line(rimL, rimT, "W"); c.line(rimT, rimR, "W")         # bright lit back rails (far rail reads high)
    for a, e in [(rimL, fL), (rimF, fF), (rimR, fR), (fL, fF), (fF, fR)]:  # crate silhouette onto the roof
        c.line(a, e, "K")
    for t, ch, ln in [(0.14, "K", 7), (0.30, "D", 5), (0.48, "K", 6)]:     # near-left survey-stake rods
        rx = rimL[0] + t * (rimF[0] - rimL[0]); ry = rimL[1] + t * (rimF[1] - rimL[1])
        c.line((rx, ry), (rx, ry - ln), ch)


# ── 3. UPPER FRONT DETAILS — orange columns, hatched blinds, tinted window ─────
def hatch_panel(c, b, face, u0, u1, v0, v1, base="L", slat="K", slat2="D"):
    """A DIAGONAL-hatched BLIND panel on a face: a light blind body crossed by evenly spaced parallel
    DIAGONAL slats running corner-to-corner (∥ to the TR→BL diagonal — NOT the near-horizontal iso
    rows), ALTERNATING between two dark wall tones (K/D — NO teal, so it reads as slatted blinds, not
    glass). Framed 1px K."""
    pt = b.left_pt if face == "left" else b.right_pt
    TL, TR, BR, BL = pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)
    c.fill_poly([TL, TR, BR, BL], base)

    def face_pt(s, t):                                        # s: TL→TR, t: TL→BL (bilinear)
        return (TL[0] + s * (TR[0] - TL[0]) + t * (BL[0] - TL[0]),
                TL[1] + s * (TR[1] - TL[1]) + t * (BL[1] - TL[1]))

    n = 7
    for i in range(n):
        k = 0.28 + (1.72 - 0.28) * i / (n - 1)               # constant s+t → lines ∥ to TR→BL diagonal
        if k <= 1.0:
            a, e = face_pt(k, 0.0), face_pt(0.0, k)
        else:
            a, e = face_pt(1.0, k - 1.0), face_pt(k - 1.0, 1.0)
        c.line(a, e, slat2 if i % 2 else slat)
    for a, e in [(TL, TR), (BL, BR), (TL, BL), (TR, BR)]:
        c.line(a, e, "K")


def orange_column(c, b, face, u, v0, v1):
    """A 2px orange support column standing on a face: lit O edge + o body + r shade."""
    pt = b.left_pt if face == "left" else b.right_pt
    c.line(pt(u, v0), pt(u, v1), "O")
    c.line(pt(u + 0.05, v0), pt(u + 0.05, v1), "o")
    c.line(pt(u + 0.10, v0), pt(u + 0.10, v1), "r")


def muted_window(c, b, face, u0, u1, v0, v1):
    """A QUIET recessed WINDOW between the orange posts — wall-toned ONLY, NO teal/green glass. A dark
    recessed pane (`D`) crossed by a couple of faint diagonal pencil-hatch slats in wall tones (`M`/`d`)
    with a soft `M` sill and a crisp continuous 1px K frame, so the orange posts stay the primary
    accent and no stray glass blob appears."""
    pt = b.left_pt if face == "left" else b.right_pt
    TL, TR, BR, BL = pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)
    c.fill_poly([TL, TR, BR, BL], "D")                                     # dark recessed pane (no glow)

    def face_pt(s, t):                                                     # s: TL→TR, t: TL→BL (bilinear)
        return (TL[0] + s * (TR[0] - TL[0]) + t * (BL[0] - TL[0]),
                TL[1] + s * (TR[1] - TL[1]) + t * (BL[1] - TL[1]))

    slats = ["M", "d", "M"]                                                # faint wall-tone pencil hatch
    n = len(slats)
    for i in range(n):
        k = 0.40 + (1.60 - 0.40) * i / (n - 1)                            # ∥ to the TR→BL diagonal
        if k <= 1.0:
            a, e = face_pt(k, 0.0), face_pt(0.0, k)
        else:
            a, e = face_pt(1.0, k - 1.0), face_pt(k - 1.0, 1.0)
        c.line(a, e, slats[i])
    c.fill_poly([pt(u0, v1 - 0.8), pt(u1, v1 - 0.8), BR, BL], "M")          # soft wall-tone sill
    for a, e in [(TL, TR), (BL, BR), (TL, BL), (TR, BR)]:                   # crisp continuous K frame
        c.line(a, e, "K")


def upper_front(c, b):
    """Lit-LEFT upper face: a single small MUTED hatched WINDOW flanked by two ORANGE COLUMNS — the
    reference's post–window–post grouping, so the orange posts stay the primary accent and the window
    is a quiet wall-toned panel between them (NO teal). Shaded-RIGHT upper face: a diagonal-hatched
    BLIND panel in wall tones (no teal)."""
    orange_column(c, b, "left", 0.12, 1.2, 10.2)
    muted_window(c, b, "left", 0.36, 0.66, 3.6, 8.0)
    orange_column(c, b, "left", 0.82, 1.2, 10.2)
    hatch_panel(c, b, "right", 0.18, 0.74, 2.8, 8.6, base="D", slat="K", slat2="d")


# ── 4. OPEN BOOK on the balcony ledge (the literature tell) ────────────────────
def open_book(c, cx, cy, hw=10):
    """A large OPEN BOOK splayed PROUD on the ledge — the building's IDENTITY, sitting UP off the
    terrace (not a flush inset panel). A butterfly/V of two pages rising from a tall raised centre
    SPINE: the LEFT (lit) page is the lightest paper (`W`) and the RIGHT (shaded) page a step darker
    (`L`), split by a hard `K` spine crease. The near/bottom edges carry a FANNED page-edge LIP — a
    light (`L`) paper-thickness strip capped by a bright (`W`) fan line — so the stacked pages read in
    3D. Short `D` page-line dashes read as text; a hard `K` silhouette + a `d` grounding shadow lift it
    clean off the ledge. No teal — paper keeps the orange posts as the accent."""
    St = (cx, cy - 6)               # spine top (tall raised centre ridge — the V is unmistakable)
    Sb = (cx, cy + 4)               # spine base (front centre, nearest the viewer)
    Lto = (cx - hw, cy - 2)         # left page outer-top (fans up-and-out)
    Lbo = (cx - hw + 3, cy + 5)     # left page outer-bottom (angled in iso)
    Rto = (cx + hw, cy - 2)         # right page outer-top
    Rbo = (cx + hw - 3, cy + 5)     # right page outer-bottom
    c.line((cx - hw + 3, cy + 7), (cx + hw - 3, cy + 7), "d")   # grounding shadow beneath the book
    c.fill_poly([St, Lto, Lbo, Sb], "W")                        # LEFT page — lightest paper (lit)
    c.fill_poly([St, Rto, Rbo, Sb], "L")                        # RIGHT page — paper a step darker (shade)
    for f in (0.34, 0.54, 0.74):                                # short page-line dashes → reads as text
        sL, oL = lerp(St, Sb, f), lerp(Lto, Lbo, f)
        c.line(lerp(sL, oL, 0.24), lerp(sL, oL, 0.86), "D")     # left-page text line (dark on lit page)
        sR, oR = lerp(St, Sb, f), lerp(Rto, Rbo, f)
        c.line(lerp(sR, oR, 0.16), lerp(sR, oR, 0.78), "D")     # right-page text line
    # fanned page-edge LIP on the near side — the paper-stack thickness under the bottom V
    Lb1 = (Lbo[0], Lbo[1] + 2); Sb1 = (Sb[0], Sb[1] + 2); Rb1 = (Rbo[0], Rbo[1] + 2)
    c.fill_poly([Lbo, Sb, Rbo, Rb1, Sb1, Lb1], "L")            # paper-edge thickness strip
    c.line(Lbo, Sb, "W"); c.line(Sb, Rbo, "W")                 # bright fanned page-edge line
    c.line(St, Sb, "K")                                         # hard spine crease down the middle
    for a, e in [(St, Lto), (Lto, Lb1), (Lb1, Sb1), (Sb1, Rb1), (Rb1, Rto), (Rto, St)]:
        c.line(a, e, "K")                                       # continuous hard K silhouette (proud lip)


# ── 5. LOWER FRONT DETAILS — shelf band + hatched blinds + arched entrance ─────
def shelf_band(c, b):
    """A single clean bookshelf ROW low on the lit-LEFT lower face: ONE ~2.5px-tall band of GREY
    book SPINES — alternating wall tones (`M`/`L`/`D`) blocks — capped top and bottom by K shelf
    boards, with a thin K tick between each spine. Reads as one row of shelved books, plain grey (no
    teal — teal is reserved for the one upper window between the orange posts)."""
    pt = b.left_pt
    u0, u1 = 0.12, 0.90
    vT, vB = 8.4, 11.0
    spines = ["M", "D", "L", "M", "D", "L", "M", "D"]  # plain grey spines; no teal/purple gems
    n = len(spines)
    for i, col in enumerate(spines):
        uA = u0 + (u1 - u0) * i / n
        uZ = u0 + (u1 - u0) * (i + 1) / n
        c.fill_poly([pt(uA, vT), pt(uZ, vT), pt(uZ, vB), pt(uA, vB)], col)
    for i in range(1, n):
        uf = u0 + (u1 - u0) * i / n
        c.line(pt(uf, vT), pt(uf, vB), "K")
    c.line(pt(u0, vT), pt(u1, vT), "K")
    c.line(pt(u0, vB), pt(u1, vB), "K")


def lower_blinds(c, b):
    """A DIAGONAL-hatched blind band across the UPPER part of the wide lit-LEFT lower face (the
    reference's left-side slats), sitting above the shelf band. Higher-contrast slats (K/d) so the
    diagonals read clearly against the lit `L` body."""
    hatch_panel(c, b, "left", 0.08, 0.66, 1.4, 6.6, base="L", slat="K", slat2="d")


def arched_entrance(c, b):
    """A dark ARCHED entrance recessed into the shaded-RIGHT front face of the front arm, ringed by
    ORANGE trim. A dark doorway (rectangular shaft + rounded arch cap) filled K, wrapped by a
    continuous orange arch ring (o lit jamb, r shaded jamb) with a bright O keystone. Kept within the
    valid part of the notched right face (u<=~0.42) so no dark fill spills into the notch void."""
    pt = b.right_pt
    u0, u1 = 0.06, 0.36
    um = (u0 + u1) / 2.0
    vB = b.h - 0.5           # door foot (near the eave bottom)
    vSpring = 6.5            # springline where straight jambs meet the arch
    vApex = 1.8             # arch apex (top of the opening)

    def arch_top(f):        # y-depth of the rounded arch cap at fraction f across (0..1)
        return vSpring - (vSpring - vApex) * math.sin(math.pi * f)

    c.fill_poly([pt(u0, vSpring), pt(u1, vSpring), pt(u1, vB), pt(u0, vB)], "K")
    steps = 14
    for i in range(steps):
        f0, f1 = i / steps, (i + 1) / steps
        c.fill_poly([pt(u0 + (u1 - u0) * f0, vSpring), pt(u0 + (u1 - u0) * f1, vSpring),
                     pt(u0 + (u1 - u0) * f1, arch_top(f1)), pt(u0 + (u1 - u0) * f0, arch_top(f0))], "K")
    c.line(pt(u0, vSpring), pt(u0, vB), "o")
    c.line(pt(u1, vSpring), pt(u1, vB), "r")
    prev = None
    for i in range(steps + 1):
        f = i / steps
        p = pt(u0 + (u1 - u0) * f, arch_top(f))
        if prev is not None:
            c.line(prev, p, "o")
        prev = p
    kx, ky = pt(um, vApex)
    c.set(int(round(kx)), int(round(ky)), "O")


# ── 6. SIDE AWNING projecting off the right on thin orange posts ───────────────
def side_awning(c):
    """A striped AWNING cantilevered to the RIGHT off the upper-right eave into the open right zone,
    resting OVER two thin orange posts — an ANGLED lean-to whose light body (`L`) is crossed by parallel
    DIAGONAL slat ribs (alternating K/d, mirroring the left blind) and capped by a bright `W` leading
    edge. Its inner-back corner sits ON the extra-box right eave so the canopy plane clearly connects to
    the building, and the two orange posts drop from directly UNDER the canopy to the ground — no
    orphaned floating legs. No teal (fabric/timber, not glass)."""
    ax, ay = 50, 27                                 # inner-back: sits ON the extra-box right eave
    span, drop = 11, 5
    footy = 45                                       # ground line for the post feet
    IB = (ax, ay)                                   # inner-back  (attached to the eave)
    IF = (ax, ay + 4)                               # inner-front
    OB = (ax + span, ay + drop)                      # outer-back  (reaches right; top edge slopes DOWN)
    OF = (ax + span, ay + drop + 4)                  # outer-front (low outer corner)
    c.fill_poly([IB, OB, OF, IF], "L")               # light sloped canopy plane (a real mass over posts)
    n = 6
    for i in range(n):
        s = 0.14 + 0.72 * i / (n - 1)                # parallel diagonal ribs, top edge → front edge
        c.line(lerp(IB, OB, s), lerp(IF, OF, s), "d" if i % 2 else "K")
    c.line(OB, OF, "W")                              # bright outer leading edge
    for a, e in [(IB, OB), (OB, OF), (OF, IF), (IF, IB)]:   # K silhouette; IB→OB is the sloped top edge
        c.line(a, e, "K")
    # two orange posts dropping from directly UNDER the canopy front edge to the ground
    ox = OF[0]                                        # outer post (under the outer-front corner)
    c.line((ox, OF[1]), (ox, footy), "o"); c.line((ox - 1, OF[1]), (ox - 1, footy), "r")
    mid = lerp(IF, OF, 0.5); mx = int(round(mid[0])); my = int(round(mid[1]))
    c.line((mx, my), (mx, footy), "o"); c.line((mx + 1, my), (mx + 1, footy), "r")  # inner post
    c.set(ox, footy, "r"); c.set(mx, footy, "r")     # feet


# ── assemble + emit ───────────────────────────────────────────────────────────
def build():
    c = Canvas()
    massing(c)                    # LOCKED poly_prism body (lower L -> main room -> extra box)
    open_top(c, MAIN)             # HERO: flat hollow rooftop tray + far wall + near-rim survey rods
    upper_front(c, MAIN)          # post–window–post (lit) + diagonal blinds (shaded)
    lower_blinds(c, LOWER)        # diagonal slats high on the wide lit face
    shelf_band(c, LOWER)          # coloured book-spine row low on the wide lit face
    arched_entrance(c, LOWER)     # dark orange-ringed arch on the front-arm right face
    side_awning(c)                # slatted overhang off the right eave, canopy over two posts
    open_book(c, 30, 34, hw=10)   # frontmost focal tell — the proud open book on the ledge
    return c


def main():
    c = build()
    spec = {"width": SIZE, "height": SIZE, "palette": CANON, "rows": c.rows()}
    os.makedirs(os.path.dirname(SRC), exist_ok=True)
    with open(SRC, "w", encoding="utf-8") as fh:
        json.dump(spec, fh, indent=0)
    img = render(spec)
    os.makedirs(os.path.dirname(PNG), exist_ok=True)
    img.save(PNG)
    # x8 inspection preview on a neutral card
    from PIL import Image
    big = img.resize((SIZE * 8, SIZE * 8), Image.NEAREST)
    bg = Image.new("RGBA", big.size, (210, 210, 218, 255))
    bg.alpha_composite(big)
    os.makedirs(os.path.dirname(PREVIEW), exist_ok=True)
    bg.save(PREVIEW)
    print("built literature_review ->", PNG)


if __name__ == "__main__":
    main()
