#!/usr/bin/env python3
"""
Chalkboard Room — Axiom Lab economy building (BESPOKE form, STARTER).

The calmest, WIDEST, LOWEST closed mass of the Axiom set: a single-storey LECTURE
HALL with a flat parapet roof — deliberately humble so the siblings can grow taller
and stranger. NOT the gateway cube (much wider, much shorter), and distinct from the
L-shape Theoretical Physics Annex.

  • Opening side = LEFT (lit): the hero glazing is a long horizontal CLERESTORY
    BAND (a row of 3 wide `g`/`c` panes via `Box.window`) over a `K`-framed double
    lecture-hall door with a warm `o` glow and an `o` "PROOFS" placard. The shaded
    RIGHT face stays plain: bare `M`/`D` wall with a single thin `D` cable conduit.
  • Signature (one-of-one): an oversized tilted SLATE CHALKBOARD EASEL rises off the
    LEFT roof edge, where a glowing gold chalk derivation writes ITSELF line-by-line
    down the slate — top rows dim `o` (already written), bottom row bright `O` (being
    written now) — and boxes the final result in a glowing `O` QED rectangle. A thin
    chalk-tray with two `W` chalk nubs + an `M` eraser, a soft `o` glow halo, and a
    faint `o` chalk-dust puff off the active stroke.

Composed entirely from art/isobuild.Box — NO iso.draw_cube / base_windows.
Draw order: contact shadow -> wide low hall (back) -> parapet rim + roof cowl ->
clerestory band + door on the lit-left + plain right face -> tilted slate easel
signature on the LEFT roof edge (front).
"""
import os
import sys
import json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

# Axiom set palette — author on these chars exactly (<=16 colors).
# Base keys (shared across all 10 Axiom buildings) + a few EVOLVED accent shades
# reserved for the upgrade stages ONLY (they never appear in stage 1, so the shipped
# chalkboard-room.png is unchanged). These four evolved keys+hexes are the LAB-WIDE
# convention — every Axiom building's _t2.._t5 reuses them:
#   b  deep indigo steel   — matured structure tone for t4+ new masses
#   e  quantum-stellar glow (mid)    E  quantum-stellar glow (bright) — the t4/t5 energy
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
AXIOM = {"K": "#0e1124", "W": "#dfe6f6", "L": "#b4bee0", "M": "#7c88b8", "D": "#4e5888", "d": "#333a60",
         "h": "#d6ecff", "c": "#aad8ff", "g": "#4a9ce6", "G": "#2060b0",
         "o": "#ffe27a", "O": "#fff3c0", "r": "#c89a2a",
         "b": "#2a3158", "e": "#7ad0ff", "E": "#cdeeff", "q": "#f6c945"}


# ── low-level pixel helper ────────────────────────────────────────────────────
def _stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings) at top-left (x0,y0).
    '.' = skip (transparent)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


# ── 1. contact shadow under the wide hall footprint (drawn FIRST) ─────────────
def hall_shadow(c, hall):
    """A soft flat K contact-shadow ellipse pooled under the whole wide footprint
    so the hall feels grounded rather than floating."""
    scx = int(round((hall.w_left[0] + hall.w_right[0]) / 2))
    scy = int(round(hall.w_front[1])) + 2
    rx, ry = 23, 4
    for x in range(scx - rx, scx + rx + 1):
        for y in range(scy - ry, scy + ry + 1):
            ex = (x - scx) / rx
            ey = (y - scy) / ry
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")


# ── 2. the WIDE LOW LECTURE-HALL body ─────────────────────────────────────────
# Gateway cube for scale = Box(top=(32,9), wx=11, wy=11, h=20). Ours is much WIDER
# in wx and much LOWER in h => the widest, lowest closed mass of the set.
HALL = Box(top=(28, 18), wx=14, wy=9, h=12)


def lecture_hall(c, b):
    """Draw the wide low hall: M lit-left wall, D shaded-right wall, L roof. A calm
    `o` starlight-gold accent line trims the lit-front eave (Axiom accent)."""
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # calm starlight-gold accent line along the lit-left eave (Axiom accent)
    c.line(b.r_left, b.r_front, "o")
    return b


# ── 3. PARAPET rim + roof cowl — the flat academic deck ───────────────────────
def parapet_and_cowl(c, hall):
    """A thin raised parapet LIP framing the roof edge — a 2px L/W rim drawn just
    inside the roof diamond with a K outline, so the roof reads as a flat deck with
    a low wall (an academic block), not a bare top. Plus one small D chalk-dust
    cowl/skylight near the BACK corner. No stack, no dome."""
    # inset diamond corners (a small step in from the true roof edge)
    inset = 0.12
    iL = hall.roof_pt(inset, inset)
    iF = hall.roof_pt(1 - inset, inset)
    iT = hall.roof_pt(inset, 1 - inset)
    iR = hall.roof_pt(1 - inset, 1 - inset)

    # parapet TOP cap (the lit lip crest) — bright W along the back edges, L front
    c.line(iL, iT, "W")     # back-left lip (lit)
    c.line(iT, iR, "W")     # back-right lip (lit)
    c.line(iL, iF, "L")     # front-left lip
    c.line(iF, iR, "L")     # front-right lip
    # a second row just inside the cap so the lip reads ~2px thick
    inset2 = 0.18
    jL = hall.roof_pt(inset2, inset2)
    jF = hall.roof_pt(1 - inset2, inset2)
    jT = hall.roof_pt(inset2, 1 - inset2)
    jR = hall.roof_pt(1 - inset2, 1 - inset2)
    c.line(jL, jT, "L")
    c.line(jT, jR, "L")
    c.line(jL, jF, "M")
    c.line(jF, jR, "M")
    # K outline along the OUTER parapet rim so the deck reads as a walled roof
    c.line(iL, iT, "K")
    c.line(iT, iR, "K")
    # darken the recessed deck floor a touch (inboard of the lip) so the lip stands
    c.fill_poly([jL, jF, jR, jT], "L")

    # small D chalk-dust cowl/skylight near the BACK (top) corner of the deck
    cx, cy = hall.roof_pt(0.30, 0.74)
    cx, cy = int(round(cx)), int(round(cy))
    _stamp(c, cx - 2, cy - 2, [
        "KKKK",
        "KDDK",
        "KMcK",   # a tiny c skylight glint in the cowl
        "KKKK",
    ])


# ── 4. CLERESTORY BAND + DOOR on the lit LEFT face; plain RIGHT face ───────────
def left_face(c, hall):
    """The OPENING (LEFT): a long horizontal CLERESTORY window band high on the lit
    face (3 wide g/c panes via Box.window — sky-reflection + shine + soft mullions),
    plus a K-framed double lecture-hall door with a warm o glow and an o PROOFS
    placard. NOT the gateway's two-windows-per-face."""
    # --- clerestory band: 3 wide panes high on the wall, spaced apart ---
    band_v0, band_v1 = 1.8, 5.6                     # high band, well above the door
    panes = [(0.07, 0.32), (0.39, 0.64), (0.71, 0.96)]
    for u0, u1 in panes:
        hall.window(c, "left", u0, u1, band_v0, band_v1,
                    glass="g", hi="h", shade="G", frame="K", mullions=1)

    # --- double lecture-hall door, centered low on the lit face ---
    du0, du1 = 0.40, 0.62
    dv0, dv1 = 6.6, hall.h - 0.4
    # K outer frame
    c.fill_poly([hall.left_pt(du0, dv0), hall.left_pt(du1, dv0),
                 hall.left_pt(du1, dv1), hall.left_pt(du0, dv1)], "K")
    # two warm-lit door leaves (interior lamplight spilling out)
    leaf = [(du0 + 0.012, 0.5 * (du0 + du1) - 0.012),
            (0.5 * (du0 + du1) + 0.012, du1 - 0.012)]
    for la, lb in leaf:
        c.fill_poly([hall.left_pt(la, dv0 + 0.5), hall.left_pt(lb, dv0 + 0.5),
                     hall.left_pt(lb, dv1 - 0.4), hall.left_pt(la, dv1 - 0.4)], "D")
        # warm interior glow rising up each leaf
        c.line(hall.left_pt((la + lb) / 2, dv0 + 1.2), hall.left_pt((la + lb) / 2, dv1 - 1.0), "o")
        c.line(hall.left_pt(la + 0.006, dv1 - 1.0), hall.left_pt(lb - 0.006, dv1 - 1.0), "O")  # bright threshold
    # central K mullion between the leaves
    c.line(hall.left_pt(0.5 * (du0 + du1), dv0 + 0.5), hall.left_pt(0.5 * (du0 + du1), dv1 - 0.4), "K")
    # warm o glow spilling onto the ground at the threshold
    base = hall.left_pt(0.5 * (du0 + du1), dv1)
    bx, by = int(round(base[0])), int(round(base[1]))
    for dx, ch in [(-3, "r"), (-2, "o"), (-1, "O"), (0, "O"), (1, "o"), (2, "r")]:
        c.set(bx + dx, by + 1, ch)

    # --- o "PROOFS" placard over the LEFT door ---
    pu0, pu1 = 0.385, 0.635
    pv = 6.0
    c.fill_poly([hall.left_pt(pu0, pv), hall.left_pt(pu1, pv),
                 hall.left_pt(pu1, pv + 0.7), hall.left_pt(pu0, pv + 0.7)], "o")
    c.line(hall.left_pt(pu0, pv), hall.left_pt(pu1, pv), "O")  # lit top edge
    c.line(hall.left_pt(pu0, pv), hall.left_pt(pu0, pv + 0.7), "K")
    c.line(hall.left_pt(pu1, pv), hall.left_pt(pu1, pv + 0.7), "K")


def right_face(c, hall):
    """The shaded RIGHT face stays PLAIN: bare M/D wall with a single thin D cable
    conduit running down it (no glazing)."""
    # one thin D cable conduit dropping down the shaded face
    cu = 0.42
    c.line(hall.right_pt(cu, 1.6), hall.right_pt(cu, hall.h - 1.0), "d")
    c.line(hall.right_pt(cu + 0.012, 1.6), hall.right_pt(cu + 0.012, hall.h - 1.0), "D")
    # two small K conduit clamps
    for v in (4.0, 8.0):
        p = hall.right_pt(cu, v)
        c.set(int(round(p[0])) - 1, int(round(p[1])), "K")


# ── 5. SIGNATURE — tilted slate chalkboard easel on the LEFT roof edge ─────────
def slate_easel(c, hall):
    """An oversized tilted SLATE chalkboard easel standing on the LEFT side of the
    roof (catching the light), where a glowing gold chalk derivation writes itself
    line-by-line down the slate and boxes the final result in a glowing QED.

    Built as a flat-on screen panel (the board faces the viewer, tilted back on an
    A-frame easel) so the chalk derivation reads clearly. Anchored over the lit-left
    roof edge, lifted clear above the parapet."""
    # anchor on the LEFT half of the roof deck, near the lit-left edge
    ax, ay = hall.roof_pt(0.30, 0.42)
    ax, ay = int(round(ax)), int(round(ay))

    # slate panel rectangle (tilted-back tall slate). Top-left of the slate:
    sw, sh = 19, 15                      # slate width / height in px
    sx0 = ax - 4
    sy0 = ay - 26                        # lifted well above the deck
    sx1, sy1 = sx0 + sw, sy0 + sh

    # --- soft o glow halo around the slate (drawn first, behind it) ---
    # DELIBERATE, evenly-paired single-pixel gold glints hugging the slate's four
    # corners + side midpoints — a tidy symmetric proof-glow, NOT random strays.
    # Each glint sits 1px diagonally off a corner so it reads as tied to the frame.
    midy = (sy0 + sy1) // 2
    halo = [
        (sx0 - 1, sy0 - 1), (sx1 + 1, sy0 - 1),   # top-left / top-right corner glints
        (sx0 - 1, sy1 + 1), (sx1 + 1, sy1 + 1),   # bottom-left / bottom-right corners
        (sx0 - 2, midy),     (sx1 + 2, midy),     # left / right side midpoints
    ]
    for (hx, hy) in halo:
        if 0 <= hy < 64 and 0 <= hx < 64 and c.px[hy][hx] == ".":
            c.set(hx, hy, "o")
    # one dimmer r outer spark past each top corner (the glow falling off) — paired
    for (hx, hy) in [(sx0 - 2, sy0 - 2), (sx1 + 2, sy0 - 2)]:
        if 0 <= hy < 64 and 0 <= hx < 64 and c.px[hy][hx] == ".":
            c.set(hx, hy, "r")

    # --- A-frame easel legs (D struts, K-outlined) reaching from slate to deck ---
    # near (lit) leg and far leg splay down to the roof; a cross brace between.
    leg_top_l = (sx0 + 3, sy1 - 1)
    leg_top_r = (sx1 - 3, sy1 - 1)
    foot_l = (sx0 + 1, sy1 + 7)
    foot_r = (sx1 - 1, sy1 + 6)
    for (ta, tb) in ((leg_top_l, foot_l), (leg_top_r, foot_r)):
        c.line(ta, tb, "K")                      # K outline of the strut
        c.line((ta[0] + 1, ta[1]), (tb[0] + 1, tb[1]), "D")  # strut body
        c.line((ta[0] + 2, ta[1]), (tb[0] + 2, tb[1]), "M")  # lit edge of strut
    # a back support leg (the easel tilt) behind the slate
    c.line((ax + 5, sy1 - 2), (ax + 7, sy1 + 7), "D")
    # cross brace
    c.line((foot_l[0] + 3, foot_l[1] - 2), (foot_r[0] - 3, foot_r[1] - 2), "D")

    # --- the slate panel: K frame, d->K dark slate body (top lit a touch) ---
    c.fill_poly([(sx0, sy0), (sx1, sy0), (sx1, sy1), (sx0, sy1)], "d")   # slate body
    # subtle lit sheen across the top of the slate (light from upper-left)
    for x in range(sx0 + 1, sx1):
        c.set(x, sy0 + 1, "D")
    c.set(sx0 + 2, sy0 + 1, "M")
    # K frame around the slate
    for x in range(sx0, sx1 + 1):
        c.set(x, sy0, "K")
        c.set(x, sy1, "K")
    for y in range(sy0, sy1 + 1):
        c.set(sx0, y, "K")
        c.set(sx1, y, "K")

    # --- self-writing chalk derivation: clean rows of glowing chalk glyphs ---
    # 3 tidy equation rows march DOWN the slate, each a single 1px-tall line so it
    # reads as a written line (symbol  =  symbol / fraction-bar), NOT loose scribble.
    # Brightness ramps with the writing: top row dim (r/o, long-since written),
    # middle brighter (o), bottom row brightest (o/O, the line being written now).
    inx = sx0 + 2          # inner-left of writing area
    row_y = [sy0 + 3, sy0 + 6, sy0 + 9]   # three written rows above the QED line

    # row 0 (top — oldest, dimmest: r faded chalk with o highlights): term = term
    _stamp(c, inx, row_y[0], [
        "ror.oo.rro",   # left term  |  '=' (oo)  |  right term — clean spaced glyphs
    ])
    # row 1 (middle — already written, dim o): term = fraction (num over bar)
    _stamp(c, inx, row_y[1], [
        "oo..oo..oo",   # left term  =  numerator
        "........oo",   # fraction bar under the right-hand quotient (next row reads it)
    ])
    # row 2 (bottom — being written NOW, brightest o/O), trailing toward the tip
    _stamp(c, inx, row_y[2], [
        "Ooo.OO.oO.",   # left term  =  result, brightening left→right toward the pen
    ])

    # active chalk-dust puff off the RIGHT end of row 2 (the writing point / pen tip)
    px, py = inx + 9, row_y[2]
    c.set(px, py, "O")          # bright pen contact
    c.set(px + 1, py - 1, "o")  # dust kicking up
    c.set(px + 1, py + 1, "r")  # faint falling dust

    # --- the QED box: the final result in a crisp, cleanly CLOSED rectangle ---
    # A tidy K-shadowed / O-bright boxed result so the "boxed proof" reads
    # unmistakably as a rectangle (not blending into the chalk rows above it).
    qx0, qy0 = sx0 + 5, sy1 - 5
    qx1, qy1 = sx1 - 4, sy1 - 2
    # clean K backing rectangle (clears any stray chalk so the box reads sharp)
    for x in range(qx0, qx1 + 1):
        for y in range(qy0, qy1 + 1):
            c.set(x, y, "K")
    # bright O result glyph centered inside the box (the proof landing)
    _stamp(c, qx0 + 2, qy0 + 1, [
        "OWO",   # the landed result — brightest line, centered in the box
    ])
    # crisp glowing O border tracing the full closed rectangle (the QED)
    for x in range(qx0, qx1 + 1):
        c.set(x, qy0, "O")
        c.set(x, qy1, "O")
    for y in range(qy0, qy1 + 1):
        c.set(qx0, y, "O")
        c.set(qx1, y, "O")
    # all four corners stay O so the QED reads as one clean, uniformly closed rectangle

    # --- chalk-tray along the slate bottom edge: M/L rail + 2 W chalk nubs + eraser ---
    ty = sy1 + 1
    for x in range(sx0 - 1, sx1 + 2):
        c.set(x, ty, "M")
        c.set(x, ty + 1, "K")        # K underside of the tray
    c.set(sx0 - 1, ty, "L")          # lit left end of the rail
    # two tiny W chalk nubs resting on the tray
    c.set(sx0 + 3, ty - 1, "W")
    c.set(sx0 + 4, ty - 1, "L")
    c.set(sx0 + 8, ty - 1, "W")
    # an M eraser block
    _stamp(c, sx1 - 5, ty - 2, [
        "KKKK",
        "MMML",
        "DDDD",
    ])


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). The humble lecture hall grows into a grand
# THEORY INSTITUTE / proof-engine. Every addition is academic + cosmic on-theme to
# THIS building (study skylight -> reading loft -> an armillary "axiom engine" ->
# a self-completing theorem constellation), and all grow UP / BACK-RIGHT so they
# never collide with the front-left self-writing SLATE EASEL signature. Colours
# mature stage by stage; gold (q) appears ONLY as the t5 flourish.
#
#   t2  small functional add : a glowing study SKYLIGHT prism on the back-right deck
#   t3  structural add       : a raised READING-LOFT mezzanine (2nd storey, back-right)
#   t4  major add            : a tall brass ARMILLARY ORRERY engine on the loft, glowing core
#   t5  crowning feature     : a THEOREM CONSTELLATION arcing above + gold pediment/finial
#
# Anchors: HALL roof diamond spans x≈10..56, y≈18..41; the slate hero occupies
# x≈20..43, y≈0..24, so every stage anchors at roof u≥0.62 (right of the slate).
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_skylight(c, hall):
    """t2 — SMALL FUNCTIONAL ADD: a small raised STUDY SKYLIGHT (a glowing cyan glass
    prism in a K curb) on the BACK-RIGHT of the roof deck, with a thin gold-glow node
    — the hall gains a lit study-loft window. Modest, on-theme (more glazing/proof
    glow), base palette + a brighter `c`/`o`. Seated at the back-right corner so it is
    well clear of the slate easel (front-left) and the existing back cowl/skylight."""
    cx, cy = hall.roof_pt(0.82, 0.66)
    cx, cy = int(round(cx)), int(round(cy))
    # a short K curb the skylight sits in (so it reads raised off the deck)
    c.fill_poly([(cx - 3, cy + 1), (cx + 3, cy + 1), (cx + 4, cy + 3), (cx - 2, cy + 3)], "K")
    # glowing glass prism: bright c top sloping to G shadow, K rim, a h shine
    c.fill_poly([(cx - 3, cy - 2), (cx + 3, cy - 2), (cx + 4, cy + 1), (cx - 2, cy + 1)], "g")
    c.fill_poly([(cx - 3, cy - 2), (cx + 3, cy - 2), (cx + 2, cy - 1), (cx - 2, cy - 1)], "c")
    c.line((cx - 2, cy - 1), (cx + 1, cy - 2), "h")          # shine streak
    c.fill_poly([(cx - 2, cy + 1), (cx + 4, cy + 1), (cx + 3, cy + 2), (cx - 1, cy + 2)], "G")  # sill
    for a, b in [((cx - 3, cy - 2), (cx + 3, cy - 2)), ((cx + 3, cy - 2), (cx + 4, cy + 1)),
                 ((cx + 4, cy + 1), (cx - 2, cy + 1)), ((cx - 2, cy + 1), (cx - 3, cy - 2))]:
        c.line(a, b, "K")
    # a tiny warm proof-glow node on the curb (academic gold accent)
    c.set(cx - 3, cy, "o")
    c.set(cx - 4, cy + 1, "r")


# a single shared anchor for the rooftop penthouse so t3/t4/t5 all recompute the
# SAME Box (no hardcoded second guesses). It sits in the RIGHT WEDGE of the deck
# (x≈32..52), clear of the centre slate easel, with its base resting on the deck.
def _loft_box(hall):
    return Box(top=(44, 21), wx=6, wy=4, h=6)


def stage3_loft(c, hall):
    """t3 — STRUCTURAL ADD: a raised READING-LOFT penthouse — a second, smaller storey
    sitting ON the RIGHT WEDGE of the roof deck so the flat hall gains a clear stepped
    upper level (a rooftop study). A real new Box mass (lit `M` left, `D` shaded right,
    `L` roof, deep-indigo `b` base band so it reads as matured structure) with a tall
    cyan clerestory study window on its lit face + a calm `o` eave line matching the
    hall. Seated right of the centre slate easel; the t2 skylight reads in front of it.
    Returns the loft Box so t4 seats the beacon on its roof from the SAME anchor."""
    loft = _loft_box(hall)
    loft.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # deep-indigo base band so the new storey reads as matured structure
    c.line(loft.w_left, loft.w_front, "b")
    c.line(loft.w_front, loft.w_right, "b")
    # calm starlight-gold accent line along the loft's lit eave (matches the hall)
    c.line(loft.r_left, loft.r_front, "o")
    # tall cyan clerestory study window on the lit (left) loft face
    loft.window(c, "left", 0.22, 0.82, 1.4, 4.6, glass="g", hi="h", shade="G",
                frame="K", mullions=1)
    # a thin conduit + a small academic placard on the shaded right loft face
    c.line(loft.right_pt(0.5, 1.2), loft.right_pt(0.5, loft.h - 0.8), "d")
    c.fill_poly([loft.right_pt(0.22, 1.6), loft.right_pt(0.5, 1.6),
                 loft.right_pt(0.5, 2.4), loft.right_pt(0.22, 2.4)], "o")
    return loft


def stage4_beacon(c, hall):
    """t4 — MAJOR ADD: a tall PROOF-BEACON tower — the 'axiom engine' — rises off the
    reading-loft roof: a slim `b`/`M` shaft on a clear K plinth, carrying a glowing
    quantum-stellar CORE LANTERN (a bright `E`/`e` diamond in a K cage) at its top, with
    ONE bold tilted ORBITAL RING circling the lantern (a single clean 2:1 ellipse — the
    sole orbit, legible at 64px, NOT a fine ring-cloud). The prominent new vertical mass
    that says this is now a theory institute. Palette matures: deep `b` shaft + energized
    `e`/`E` core. Anchored ON the loft roof centre (recomputed from the SAME Box) so it
    rises in clear sky just right of the slate, fully on-canvas with a visible plinth."""
    import math
    loft = _loft_box(hall)                         # SAME source as stage3 (no 2nd guess)
    bxf, byf = loft.roof_pt(0.5, 0.5)
    cx = int(round(bxf))
    roof_y = int(round(byf))
    # K plinth + slim shaft rising from the loft roof clear ABOVE the building silhouette
    top_y = roof_y - 20                            # lantern centre — rises well up, clear
    c.line((cx, roof_y), (cx, top_y + 2), "M")     # lit shaft edge
    c.line((cx + 1, roof_y), (cx + 1, top_y + 2), "b")  # shaded shaft body
    c.set(cx, roof_y, "K")
    c.set(cx + 1, roof_y, "K")
    c.fill_poly([(cx - 1, roof_y), (cx + 2, roof_y), (cx + 2, roof_y + 1), (cx - 1, roof_y + 1)], "K")  # plinth
    # a small mid-shaft bracket collar so the mast reads as an engine-mast (not a lamppost)
    midy = (roof_y + top_y) // 2
    c.fill_poly([(cx - 1, midy), (cx + 2, midy), (cx + 2, midy + 1), (cx - 1, midy + 1)], "M")
    c.set(cx - 1, midy, "L")
    c.set(cx + 2, midy + 1, "K")
    # ONE bold tilted orbital ring around the lantern (single clean ellipse, rx=5 so its
    # left tip only grazes the slate's right edge — the slate redraws on top there)
    rx, ry = 5, 2
    for a in range(0, 360, 14):
        x = cx + rx * math.cos(math.radians(a))
        y = top_y + ry * math.sin(math.radians(a))
        # back half dim (D), front half lit (L) so the ring reads as 3-D around the core
        c.set(x, y, "L" if y >= top_y else "D")
    # core lantern: a bright quantum-stellar diamond in a K cage, at the shaft top
    for xx, yy, ch in [(0, 0, "E"), (-1, 0, "e"), (1, 0, "e"), (0, -1, "e"), (0, 1, "e"),
                       (-2, 0, "g"), (2, 0, "g"), (0, -2, "c"), (0, 2, "G")]:
        c.set(cx + xx, top_y + yy, ch)
    for xx, yy in [(-2, -1), (2, -1), (-2, 1), (2, 1)]:   # K cage corners around lantern
        c.set(cx + xx, top_y + yy, "K")
    # a tiny orbiting bead riding the front of the ring (an orrery planet)
    c.set(cx + 4, top_y + 1, "c")
    c.set(cx - 4, top_y - 1, "g")


def stage5_constellation(c, hall):
    """t5 — CROWNING FEATURE = FULLY EVOLVED theory institute. The proof completes: a
    glowing THEOREM CONSTELLATION of bright stellar nodes arcs in the sky ABOVE the
    beacon lantern, joined by faint quantum lines (the derivation 'lands' as a star
    map); the beacon's orbital ring energizes with an `e` glow; and the building is
    dressed in premium GOLD trim — a gold STAR FINIAL crowning the beacon, a gold band
    on its lantern, and a gold PEDIMENT pennant over the lecture-hall door. Reads as
    elite, still unmistakably the same chalkboard hall, just maxed out. Gold ONLY here."""
    import math
    loft = _loft_box(hall)                         # SAME source as stage3/4 (consistent)
    bxf, byf = loft.roof_pt(0.5, 0.5)
    cx = int(round(bxf))
    roof_y = int(round(byf))
    top_y = roof_y - 20                            # the beacon lantern centre (== stage4)

    # --- energize the beacon's orbital ring: brighten ONLY the front arc to `e` (a
    #     subtle power-up, kept minimal so the crown doesn't turn into a cyan knot) ---
    for a in range(20, 160, 20):
        x = cx + 5 * math.cos(math.radians(a))
        y = top_y + 2 * math.sin(math.radians(a))
        if c.px[int(round(y))][int(round(x))] in ("L", "D"):
            c.set(x, y, "e")

    # --- a gold STAR FINIAL crowning the beacon, lifted with a 1px GAP above the lantern
    #     so it reads as a separate crown (not merged into the core). 4-point gold star ---
    fx, fy = cx, top_y - 4
    c.set(fx, fy, "O")                             # bright centre
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        c.set(fx + dx, fy + dy, "q")               # gold arms
    c.set(fx, fy - 2, "o")                         # a short upward spike (the apex)

    # --- THEOREM CONSTELLATION: the beacon PROJECTS a star-map — bright stellar nodes
    #     sweep up-and-right in the sky, joined by faint quantum lines, starting from a
    #     thin projector beam off the lantern so it reads as cast BY the engine (not a
    #     floating blob). Clamp on-canvas (x<=62, y>=1), kept right of the slate. ---
    beam0 = (cx + 3, top_y - 1)                    # leaves the lantern up-right
    nodes = [(cx + 6, top_y - 5), (cx + 11, top_y - 8), (cx + 14, top_y - 3),
             (cx + 12, top_y + 2)]
    nodes = [(max(40, min(62, nx)), max(1, ny)) for (nx, ny) in nodes]
    # faint dotted links (every other pixel) so the stars stay DISTINCT, not a solid
    # wire — a constellation reads as bright nodes loosely joined, not a hook.
    def _dot_link(a, b, ch):
        n = max(abs(b[0] - a[0]), abs(b[1] - a[1]))
        for k in range(1, n):                      # skip the endpoints (the nodes)
            if k % 2 == 0:
                continue
            x = round(a[0] + (b[0] - a[0]) * k / n)
            y = round(a[1] + (b[1] - a[1]) * k / n)
            if c.px[y][x] == ".":
                c.set(x, y, ch)
    _dot_link(beam0, nodes[0], "G")                # projector beam off the lantern
    for i in range(len(nodes) - 1):
        _dot_link(nodes[i], nodes[i + 1], "g")
    _dot_link(nodes[0], nodes[2], "G")             # one cross-link (a proof shortcut)
    for (nx, ny) in nodes:                          # bright stellar nodes, each a tiny +
        c.set(nx, ny, "E")
        c.set(nx - 1, ny, "e")
        c.set(nx + 1, ny, "e")
    c.set(nodes[1][0], nodes[1][1] - 1, "O")        # a tiny gold sparkle on the apex node

    # --- GOLD PEDIMENT plaque over the lecture-hall door (premium academic trim) — a
    #     small gold triangular tympanum centred just above the door on the lit face,
    #     drawn directly in screen space over the door so it reads clearly. ---
    dpx, dpy = hall.left_pt(0.51, 6.2)             # just above the door head
    dpx, dpy = int(round(dpx)), int(round(dpy))
    c.fill_poly([(dpx - 4, dpy), (dpx + 4, dpy), (dpx, dpy - 3)], "q")  # gold triangle
    c.line((dpx - 4, dpy), (dpx, dpy - 3), "O")    # lit left rake
    c.line((dpx - 4, dpy), (dpx + 4, dpy), "r")    # shaded cornice underside
    c.set(dpx, dpy - 1, "O")                       # a small gold boss in the tympanum


def build(stage: int = 1):
    """Compose the chalkboard lecture-hall at upgrade `stage` (1..5). Stage 1 is
    IDENTICAL to the shipped base; each higher stage keeps every prior addition and
    bolts on the next (t2 study-skylight -> t3 reading-loft mezzanine -> t4 axiom
    orrery-engine tower -> t5 theorem-constellation + gold pediment). The humble
    lecture hall grows UP and toward the BACK-RIGHT into a grand theory institute,
    while the front-left self-writing SLATE EASEL signature stays clear and on top.

    Painter's order: base form first; then upgrade masses grow on the RIGHT-BACK deck
    (away from the slate); the slate easel is RE-DRAWN last at every stage so the hero
    signature always reads in front of the new structure."""
    c = Canvas()
    hall = HALL
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    hall_shadow(c, hall)
    lecture_hall(c, hall)
    parapet_and_cowl(c, hall)
    left_face(c, hall)
    right_face(c, hall)

    # --- CUMULATIVE UPGRADE STAGES (grown on the BACK-RIGHT deck, clear of slate) --
    if stage >= 2:
        stage2_skylight(c, hall)
    if stage >= 3:
        loft = stage3_loft(c, hall)
    if stage >= 4:
        stage4_beacon(c, hall)
    if stage >= 5:
        stage5_constellation(c, hall)

    # --- SIGNATURE LAST: the self-writing slate easel always reads in front --------
    slate_easel(c, hall)
    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/axiom"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "chalkboard-room"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped chalkboard-room.png, so it does NOT overwrite the base."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": AXIOM, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"axiom_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"axiom_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
