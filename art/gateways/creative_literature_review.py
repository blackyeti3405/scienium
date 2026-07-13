#!/usr/bin/env python3
"""
Literature Review — CREATIVE gateway (_t5 "spectacular", clearance-5 reinterpretation).

NOT a copy of the mockup and NOT the shared gateway cube. This is the catalog's original
dream for Literature Review, maxed out: a GRAND LIBRARY HALL of living knowledge crowned by a
giant glowing HOLOGRAM OF AN OPEN BOOK floating above the roof, projected up on a warm-light
updraft, fed by streams of glowing text/knowledge particles rising from the roof, with teal
energy beams from rooftop emitters and sparkles all around. Tall arched glass reading windows
glow on the two front faces.

North star: the _t5 economy buildings — biocore_greenhouse (floating orb + sparkle spray) and
axiom cosmology theater (particle fountain over a warm glow ring). Same recipe: a bespoke iso
body + a spectacular FLOATING HERO above it + energy particles + warm accents.

Hard palette rule (recolor-safe): ONLY the 13 canonical chars K W L M D d / h c g G / o O r.
  * teal glass h/c/g/G  → hologram book, glowing pages, reading-window glass, energy beams
  * orange o/O/r        → warm projection updraft, cornice/base trim, emitter tips
  * W                   → sparkle glints + bright text/page ridges on L/M/D walls

Iso contract: 64x64, 2:1 iso, front corner to viewer, lit upper-left, hard K outline on the
solid hall (the hologram uses a soft teal G edge so it reads as emissive light, not a solid).

Paths:
  art/gateways/creative_literature_review.py
    -> art/src/literature_review_creative_generic.json  (64x64, canonical palette)
    -> apps/web/public/sprites/gateways/literature_review_creative.png
    -> art/preview/literature_review_creative.png  (x8 inspection card)

Draw order (painter's, back->front / low-energy->high-energy):
  hall body -> roof glow pool + emitter posts -> arched reading windows + warm trim ->
  warm projection updraft -> teal corner beams -> rising knowledge particles ->
  floating open-book hologram (the hero) -> sparkle stars + glow halo.
"""
from __future__ import annotations

import json
import math
import os
import random
import sys

ART = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ART)

from iso import Canvas                 # noqa: E402  (shared canvas: set/fill_poly/line/rows)
from isobuild import Box               # noqa: E402  (bespoke iso prism toolkit)
from canon import CANON                # noqa: E402  (generic palette == blueprint hexes)
from render_pixel_art import render    # noqa: E402

SIZE = 64
SRC = os.path.join(ART, "src", "literature_review_creative_generic.json")
PNG = os.path.join(ART, "..", "apps", "web", "public", "sprites", "gateways",
                   "literature_review_creative.png")
PREVIEW = os.path.join(ART, "preview", "literature_review_creative.png")

# ── geometry ──────────────────────────────────────────────────────────────────
# A single grand reading hall: a TALL, narrower footprint so the walls carry real
# vertical mass (matching the _t5 north stars) while the floating book hero still owns
# the top third. Cornice + base plinth (see entablature) add the heavy library trim.
HALL = Box(top=(32, 26), wx=9, wy=9, h=17)


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


# ── 1. GRAND HALL BODY ────────────────────────────────────────────────────────
def hall_body(c, b):
    """The library hall: lavender iso mass, lit-left / shaded-right, hard K silhouette.
    Windows + trim are painted on top afterward."""
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")


def wall_modeling(c, b):
    """Deepen the massing into a clear light→mid→dark read (like the _t5 north stars):
    graze the lit LEFT face with an L eave-light band, and sink the shaded RIGHT face's
    lower two-thirds into d so it falls well below the roof/left values. The cornice +
    plinth (entablature) and windows paint on top, so only the piers carry this shading."""
    # LEFT (lit): a bright L eave-light band grazing the top of the wall
    c.fill_poly([b.left_pt(0.0, 2.0), b.left_pt(1.0, 2.0),
                 b.left_pt(1.0, 4.0), b.left_pt(0.0, 4.0)], "L")
    # RIGHT (shaded): sink the lower two-thirds into d, keep a D graze up near the eave
    c.fill_poly([b.right_pt(0.0, 6.0), b.right_pt(1.0, 6.0),
                 b.right_pt(1.0, 17.0), b.right_pt(0.0, 17.0)], "d")
    c.line(b.r_front, b.w_front, "d")   # deepen the front vertical recess


# ── 2. GLOWING STEPPED DAIS + EMITTER POSTS (the projector well) ──────────────
def roof_dais(c, b):
    """A raised, glowing STEPPED WELL at the roof centre — the visible SOURCE the book's
    light rises from. Concentric diamonds step UP toward a white-hot oculus (deep-orange r
    rim → o → O → white core), each inner step lifted a pixel to fake a raised dais, so the
    roof glow reads as a tight, symmetric font of light — not a ragged starburst splat.
    Returns the oculus (x,y) so the flame updraft can spring from it.
    Plus two glowing emitter posts on the front roof corners that fire the teal side streams."""
    cx, cy = b.roof_pt(0.5, 0.5)

    def diamond(f, lift, ch):
        L = b.roof_pt(f, f); F = b.roof_pt(1 - f, f)
        R = b.roof_pt(1 - f, 1 - f); T = b.roof_pt(f, 1 - f)
        c.fill_poly([(L[0], L[1] - lift), (F[0], F[1] - lift),
                     (R[0], R[1] - lift), (T[0], T[1] - lift)], ch)

    diamond(0.29, 0, "r")     # deep-orange rim flush with the roof
    diamond(0.34, 1, "o")     # first step up
    diamond(0.39, 2, "O")     # bright step
    diamond(0.44, 3, "O")     # brightest step (the well mouth)
    ox, oy = cx, cy - 4       # the oculus, top of the stepped well
    c.set(ox - 1, oy + 1, "o"); c.set(ox + 1, oy + 1, "o")
    c.set(ox, oy, "W"); c.set(ox, oy - 1, "W")             # white-hot core
    # emitter posts on the left + right roof corners (short lit posts, O-glowing tips)
    for (px, py) in ((b.r_left[0] + 4, b.r_left[1] + 1), (b.r_right[0] - 4, b.r_right[1] + 1)):
        c.line((px, py), (px, py - 4), "M")
        c.line((px + 1, py), (px + 1, py - 4), "D")
        c.set(px, py - 5, "O"); c.set(px + 1, py - 5, "o")
    return (ox, oy)


def roof_skylight(c, b):
    """Grand domed-skylight detailing over the otherwise-blank roof lid: a recessed
    inner-panel border set in from the eaves (W-lit back lip, D shadow front lip, M inset
    channel), gold `o` ribs fanning radially from the central oculus, and a concentric
    coffer ring — so the roof reads as a library dome/skylight, not a flat pale diamond.
    Drawn BEFORE the glow pool, which then caps the ribs cleanly at the oculus."""
    cx, cy = b.roof_pt(0.5, 0.5)

    def ring(f):   # inset diamond by fraction f: (near-left, near-front, near-right, near-top)
        return (b.roof_pt(f, f), b.roof_pt(1 - f, f),
                b.roof_pt(1 - f, 1 - f), b.roof_pt(f, 1 - f))

    # recessed inner-panel border — a beveled diamond frame set in from the eaves
    bL, bF, bR, bT = ring(0.12)
    c.line(bT, bL, "W"); c.line(bT, bR, "W")     # back lips catch the light
    c.line(bL, bF, "D"); c.line(bR, bF, "D")     # front lips fall into shadow
    iL, iF, iR, iT = ring(0.17)                  # M inset channel just inside the border
    for a, e in ((iL, iF), (iF, iR), (iR, iT), (iT, iL)):
        c.line(a, e, "M")
    # gold ribs fanning radially from the oculus out to the border (edge mids + corners)
    for (u, v) in ((0.5, 0.13), (0.87, 0.5), (0.5, 0.87), (0.13, 0.5),
                   (0.19, 0.19), (0.81, 0.19), (0.81, 0.81), (0.19, 0.81)):
        c.line((cx, cy), b.roof_pt(u, v), "o")
    # a concentric coffer ring between the oculus and the border (dome paneling)
    rL, rF, rR, rT = ring(0.23)
    for a, e in ((rL, rF), (rF, rR)):
        c.line(a, e, "M")                        # front coffer seams in shadow
    for a, e in ((rR, rT), (rT, rL)):
        c.line(a, e, "L")                        # back coffer seams lit


# ── 3. TALL ARCHED GLOWING READING WINDOWS + warm trim ────────────────────────
def arched_window(c, b, face, u0, u1, vBot, vSpring, vApex,
                  glass="c", band="h", sill="G", core="h"):
    """A tall ARCHED reading window that reads as glowing glass: straight jambs rising to a
    springline, then a rounded arch cap; a teal glass field with a bright top reflection band,
    a hot glowing centre mullion, a diagonal sheen, a shaded sill, and a crisp K frame + arch."""
    pt = b.left_pt if face == "left" else b.right_pt
    uw = u1 - u0

    def arch_top(f):
        return vSpring - (vSpring - vApex) * math.sin(math.pi * f)

    steps = 24
    for i in range(steps):                                  # glass body: strips from arch → sill
        f0, f1 = i / steps, (i + 1) / steps
        uu0, uu1 = u0 + uw * f0, u0 + uw * f1
        c.fill_poly([pt(uu0, arch_top(f0)), pt(uu1, arch_top(f1)),
                     pt(uu1, vBot), pt(uu0, vBot)], glass)
    # bright reflection band across the top of the straight section
    bt = vSpring + 0.4
    c.fill_poly([pt(u0 + uw * 0.08, bt), pt(u1 - uw * 0.08, bt),
                 pt(u1 - uw * 0.08, bt + 1.4), pt(u0 + uw * 0.08, bt + 1.4)], band)
    um = (u0 + u1) / 2.0
    c.line(pt(um, vApex + 0.6), pt(um, vBot - 0.8), core)   # hot glowing centre line
    c.fill_poly([pt(u0, vBot - 1.0), pt(u1, vBot - 1.0), pt(u1, vBot), pt(u0, vBot)], sill)
    c.line(pt(u0 + uw * 0.22, vBot - 1.6), pt(u0 + uw * 0.52, vSpring + 0.4), band)  # sheen
    # crisp K frame: jambs + flat sill + curved arch cap
    c.line(pt(u0, vSpring), pt(u0, vBot), "K")
    c.line(pt(u1, vSpring), pt(u1, vBot), "K")
    c.line(pt(u0, vBot), pt(u1, vBot), "K")
    prev = None
    for i in range(steps + 1):
        p = pt(u0 + uw * i / steps, arch_top(i / steps))
        if prev is not None:
            c.line(prev, p, "K")
        prev = p


def entablature(c, b):
    """The heavy library STONEWORK that gives the hall its grand mass: a projecting CORNICE
    band along the top of both front faces (under the roof eaves) and a stepped BASE PLINTH
    along the wall feet — each a solid 2px stone band picked out with a gold trim line, so the
    silhouette gains real vertical weight instead of reading as a thin box.
    Drawn AFTER the windows so it caps their jambs cleanly top and bottom."""
    for face, body, hi in (("left", "L", "W"), ("right", "M", "L")):
        pt = b.left_pt if face == "left" else b.right_pt
        # CORNICE: projecting entablature under the eave (lit top lip, gold underline)
        c.fill_poly([pt(0.0, 0.0), pt(1.0, 0.0), pt(1.0, 2.2), pt(0.0, 2.2)], body)
        c.line(pt(0.0, 0.3), pt(1.0, 0.3), hi)
        c.line(pt(0.0, 2.2), pt(1.0, 2.2), "o")
        # BASE PLINTH: a stepped stone foot with a gold sill on its shoulder
        c.fill_poly([pt(0.0, 14.6), pt(1.0, 14.6), pt(1.0, 17.0), pt(0.0, 17.0)],
                    "M" if face == "left" else "d")
        c.line(pt(0.0, 14.6), pt(1.0, 14.6), "O" if face == "left" else "o")
        c.line(pt(0.0, 16.9), pt(1.0, 16.9), "K")
    # a warm ridge line along the two back-top roof eaves so the roof cap reads crowned
    for a, e in ((b.r_left, b.r_top), (b.r_top, b.r_right)):
        c.line((a[0], a[1] - 1), (e[0], e[1] - 1), "o")


def reading_windows(c, b):
    """Two TALL arched glowing windows on each front face, split by a wall pier (a colonnade
    reading room). They rise nearly the full wall height — arch apex just under the cornice,
    sill just above the base plinth — so they read as grand arched reading-hall glass, not
    portholes. Lit-left = brighter teal; shaded-right = a touch deeper but still glowing."""
    for (u0, u1) in ((0.10, 0.40), (0.56, 0.86)):
        arched_window(c, b, "left", u0, u1, vBot=14.2, vSpring=7.6, vApex=2.9,
                      glass="c", band="h", sill="G", core="h")
    for (u0, u1) in ((0.14, 0.44), (0.60, 0.90)):
        arched_window(c, b, "right", u0, u1, vBot=14.2, vSpring=7.6, vApex=2.9,
                      glass="g", band="c", sill="G", core="c")


# ── 4. WARM PROJECTION FLAME (dais oculus → book) ─────────────────────────────
def flame_updraft(c, source, book_low):
    """A clean, SYMMETRIC upward flame of projection light springing from the roof oculus to
    the underside of the floating book — a hot O/W core with an o body and r edges only at the
    base, tapering to a point as it rises and dissolving into a dashed teal shimmer near the
    book. Mirror-symmetric with no ragged spikes, so the crisp iso read stays intact."""
    sx, sy = source                       # source (roof oculus)
    tx, ty = book_low                     # target (book spine base)
    n = int(sy - ty)
    for i in range(n + 1):
        t = i / max(1, n)
        x = sx + (tx - sx) * t
        y = sy + (ty - sy) * t
        half = int(round(1.7 * (1 - t)))   # narrow flame tongue, tapering to a point
        if t < 0.4:                        # base: solid warm core, r rim → o → O centre
            for dx in range(-half, half + 1):
                c.set(x + dx, y, "o")
            if half >= 1:
                c.set(x - half, y, "r"); c.set(x + half, y, "r")
            c.set(x, y, "O")
        elif t < 0.72:                     # mid: slim O tongue with a faint o flank
            c.set(x, y, "O")
            if i % 2 == 0:
                c.set(x - 1, y, "o"); c.set(x + 1, y, "o")
        elif i % 2 == 0:                   # upper: dashed warm-teal shimmer into the book
            c.set(x, y, "c"); c.set(x, y - 1, "h")
    c.set(tx, ty, "W"); c.set(tx, ty + 1, "W")   # hot tip kissing the book spine base


# ── 5. RISING SIDE STREAMS (emitters → book corners) ──────────────────────────
def rising_stream(c, sx, sy, ex, ey, seed):
    """A single column of ascending knowledge motes from a roof emitter (sx,sy) up into a
    book corner (ex,ey): fat bright c/h clusters low down that shrink to single c/W sparks
    and then faint h flecks as they rise, with growing GAPS between them — so it reads as
    light streaming UP into the book, never a taut symmetric guy-line/cable."""
    rng = random.Random(seed)
    n = 18
    for i in range(1, n + 1):
        t = i / n                                    # 0 at emitter .. 1 at book
        if rng.random() < 0.05 + 0.30 * t:           # thin out (bigger gaps) as it rises
            continue
        swirl = 1.4 * math.sin(t * 5.0 + seed)       # gentle rising swirl (not a taut cable)
        x = sx + (ex - sx) * t + (swirl + rng.uniform(-0.8, 0.8)) * (1 - t)
        y = sy + (ey - sy) * t
        if t < 0.4:                                  # low: fat bright 2–3px mote cluster
            c.set(x, y, "c"); c.set(x + 1, y, "c"); c.set(x, y - 1, "h")
        elif t < 0.72:                               # mid: single c/W spark
            c.set(x, y, "W" if rng.random() < 0.5 else "c")
        else:                                        # high: faint single h fleck
            c.set(x, y, "h")


def side_beams(c, b, l_corner, r_corner):
    """Two rising streams of knowledge motes from the front roof emitters up into the book's
    lower page corners. Different seeds so the two streams are NOT mirror-symmetric."""
    lx, ly = b.r_left[0] + 4, b.r_left[1] - 4      # left emitter tip (matches the post)
    rx, ry = b.r_right[0] - 4, b.r_right[1] - 4    # right emitter tip
    rising_stream(c, lx, ly, l_corner[0], l_corner[1], seed=201)
    rising_stream(c, rx, ry, r_corner[0], r_corner[1], seed=917)


# ── 6. RISING KNOWLEDGE PARTICLES (dais → book) ───────────────────────────────
def particles(c, x0, x1, y_lo, y_hi, n=140):
    """A DENSE, swirling galaxy of glowing text/knowledge motes streaming up off the roof oculus
    into the book — a spectacle to rival the theater's particle fountain. Sampling is biased
    toward the roof SOURCE so the column packs tight + wide at the dais and thins as it climbs to
    the book, with a gentle sinusoidal swirl. Mostly W/c single pixels + a few h flecks and
    little + sparkle clusters."""
    rng = random.Random(514)
    cxc = (x0 + x1) / 2.0
    for _ in range(n):
        t = rng.random() ** 0.5                       # biased toward 1 = the roof source (dense there)
        y = y_lo + (y_hi - y_lo) * t                  # y_lo near book (top) .. y_hi near roof (bottom)
        spread = 2.4 + 8.5 * t                        # funnel: wide at the roof, tight at the book
        swirl = 2.4 * math.sin(y * 0.7 + t * 3.0)     # gentle column swirl (not a static shower)
        x = cxc + swirl + rng.uniform(-spread, spread)
        rr = rng.random()
        ch = "W" if rr < 0.5 else ("c" if rr < 0.82 else "h")
        c.set(x, y, ch)
        if rng.random() < 0.14:                       # a few tiny + sparkles among the motes
            c.set(x - 1, y, "c"); c.set(x + 1, y, "c"); c.set(x, y - 1, "c")


# ── 7. THE FLOATING OPEN-BOOK HOLOGRAM (the hero) ─────────────────────────────
# A front-facing OPEN BOOK like the classic clip-art: two FULL pages splaying up-and-out
# from a bottom-centre BINDING NUB in a shallow V, fanned page-stack fore-edges down the
# outer + bottom edges, and a darker cover band peeking underneath. Emissive teal (it's a
# hologram) but shaped exactly like a real open book so it reads instantly.
BK = {
    "Sb": (32, 21),    # binding nub (book underside) — flame target
    "Lbo": (17, 17),   # left fore-edge foot — side-beam target
    "Rbo": (47, 17),   # right fore-edge foot
}


def hologram_book(c):
    # page outlines: binding nub → inner-top → top peak → outer-top → fore foot.
    # STEEPER than a flat fan (outer edges pulled IN + made upright) so it reads as a book
    # opening at a real angle, not shallow angel wings.
    Lpage = [(32, 21), (30, 5), (23, 5), (15, 9), (17, 17)]
    Rpage = [(64 - x, y) for (x, y) in Lpage]

    # (a) darker COVER peeking under the pages + a warm binding trim (the "colored cover")
    c.fill_poly([(15, 10), (17, 18), (32, 23), (30, 20)], "G")
    c.fill_poly([(49, 10), (47, 18), (32, 23), (34, 20)], "G")
    c.line((17, 18), (32, 23), "o"); c.line((32, 23), (47, 18), "o")

    # (b) PAGE surfaces — emissive teal; lit LEFT (c), shaded RIGHT (g)
    c.fill_poly(Lpage, "c")
    c.fill_poly(Rpage, "g")
    # bright wash across the upper page (pages facing the sky-light)
    c.fill_poly([(30, 5), (23, 5), (15, 9), (18, 11), (27, 7)], "h")
    c.fill_poly([(34, 5), (41, 5), (49, 9), (46, 11), (37, 7)], "c")

    # (c) INTERIOR page lines: curves following each page's top edge (leaves of the book)
    def pageline(a, mid, b, ch):
        c.line(a, mid, ch); c.line(mid, b, ch)
    for off in (3, 6, 9):
        pageline((30, 5 + off), (23, 5 + off), (16, 9 + off), "h")
        pageline((34, 5 + off), (41, 5 + off), (48, 9 + off), "c")

    # (d) FANNED page-STACK fore-edges (the page block) — STEEP outer edges + bottom fan
    for k in range(5):
        d = k
        c.line((15 + d, 9 + d * 0.7), (17 + d, 17 - d * 0.2), "G" if k % 2 else "h")     # left outer
        c.line((49 - d, 9 + d * 0.7), (47 - d, 17 - d * 0.2), "G" if k % 2 else "h")     # right outer
    for k in range(4):
        d = k * 1.5
        c.line((17 + d, 17 - d * 0.2), (32, 21), "G" if k % 2 else "c")                  # left bottom fan
        c.line((47 - d, 17 - d * 0.2), (32, 21), "G" if k % 2 else "c")                  # right bottom fan

    # (e) spine fan into the binding nub + a hot binding point
    c.line((30, 5), (32, 21), "h"); c.line((34, 5), (32, 21), "h")
    c.set(32, 21, "W"); c.set(32, 22, "o")

    # (f) soft teal G silhouette (emissive edge) + W glints at the outer-top corners;
    #     a small dark V notch at the top-centre spine gap
    for poly in (Lpage, Rpage):
        for i in range(len(poly)):
            c.line(poly[i], poly[(i + 1) % len(poly)], "G")
    c.set(15, 9, "W"); c.set(49, 9, "W")
    c.set(32, 5, "G"); c.set(32, 6, "G")


# ── 8. SPARKLE STARS + GLOW HALO ──────────────────────────────────────────────
def spark(c, cx, cy, arm="c", core="W"):
    """A 4-point sparkle: bright W core + teal arms."""
    c.set(cx, cy, core)
    c.set(cx - 1, cy, arm); c.set(cx + 1, cy, arm)
    c.set(cx, cy - 1, arm); c.set(cx, cy + 1, arm)


def sparkles(c):
    for (x, y) in [(9, 6), (55, 7), (6, 16), (58, 17), (24, 2), (41, 2)]:
        spark(c, x, y)
    # faint c glow-bleed halo just outside the book
    rng = random.Random(77)
    for _ in range(18):
        ang = rng.uniform(0, 2 * math.pi)
        rad = rng.uniform(20, 25)
        x = 32 + math.cos(ang) * rad
        y = 12 + math.sin(ang) * rad * 0.7
        if 0 <= x < 64 and 0 <= y < 64:
            c.set(x, y, "c")


# ── assemble + emit ───────────────────────────────────────────────────────────
def build():
    c = Canvas()
    hall_body(c, HALL)
    wall_modeling(c, HALL)
    roof_skylight(c, HALL)
    oculus = roof_dais(c, HALL)                # stepped glowing well; returns the light source
    reading_windows(c, HALL)
    entablature(c, HALL)                        # cornice + base plinth (grand-library mass)
    flame_updraft(c, oculus, BK["Sb"])
    side_beams(c, HALL, BK["Lbo"], BK["Rbo"])
    particles(c, x0=18, x1=46, y_lo=20, y_hi=oculus[1] + 1)
    hologram_book(c)
    sparkles(c)
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
    from PIL import Image
    big = img.resize((SIZE * 8, SIZE * 8), Image.NEAREST)
    bg = Image.new("RGBA", big.size, (210, 210, 218, 255))
    bg.alpha_composite(big)
    os.makedirs(os.path.dirname(PREVIEW), exist_ok=True)
    bg.save(PREVIEW)
    print("built literature_review_creative ->", PNG)


if __name__ == "__main__":
    main()
