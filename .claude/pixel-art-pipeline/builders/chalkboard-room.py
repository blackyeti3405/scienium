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

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box

# Axiom set palette — author on these chars exactly (<=16 colors).
AXIOM = {"K": "#0e1124", "W": "#dfe6f6", "L": "#b4bee0", "M": "#7c88b8", "D": "#4e5888", "d": "#333a60",
         "h": "#d6ecff", "c": "#aad8ff", "g": "#4a9ce6", "G": "#2060b0",
         "o": "#ffe27a", "O": "#fff3c0", "r": "#c89a2a"}


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


def build():
    c = Canvas()
    # painter's order: shadow -> hall -> parapet/cowl -> left glazing+door ->
    # plain right face -> tilted slate easel signature (front).
    hall = HALL
    hall_shadow(c, hall)
    lecture_hall(c, hall)
    parapet_and_cowl(c, hall)
    left_face(c, hall)
    right_face(c, hall)
    slate_easel(c, hall)

    spec = {"width": 64, "height": 64, "palette": AXIOM, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/axiom_chalkboard-room.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
