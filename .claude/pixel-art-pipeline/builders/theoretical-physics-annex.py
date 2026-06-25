#!/usr/bin/env python3
"""
Theoretical Physics Annex — Axiom economy building (BESPOKE form, STANDARD · L-SHAPE).

NOT the gateway cube, NOT the Chalkboard Room (a physical slate), NOT the open
Particle Physics yard. A compact L-SHAPE ANNEX: a taller navy STUDY BLOCK with a
lower READING WING abutting its FRONT-RIGHT, the two meeting at a right angle — a
closed two-mass L silhouette. Because the wing sits front-right, the dominant
opening lands on the SHADED RIGHT face: a K-framed STUDY WINDOW-WALL that GLOWS
with warm O/o lamplight + g/c instrument readouts so it reads on the dark face.
The LIT LEFT face of the main block stays plainer (one c window + a K door).

Signature (one-of-one): above the wing hovers a holographic CURVED-SPACETIME GRID
— a stretched c/g rubber-sheet lattice warped into a deep funnel dimpled downward
by a glowing O/W mass at its centre — with 3-4 o/O field-equation glyphs orbiting
the rim (one lit brightest = the term being decoded) and a c/o decode strip on the
wing sill with one O "SOLVED" tick. A floating holographic curvature grid, no slate
— deliberately distinct from the Chalkboard Room. Collides with nothing.

Composed entirely from art/isobuild.Box (no iso.draw_cube / base_windows).
"""
import os
import sys
import json
import math

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box

AXIOM = {"K": "#0e1124", "W": "#dfe6f6", "L": "#b4bee0", "M": "#7c88b8", "D": "#4e5888", "d": "#333a60",
         "h": "#d6ecff", "c": "#aad8ff", "g": "#4a9ce6", "G": "#2060b0",
         "o": "#ffe27a", "O": "#fff3c0", "r": "#c89a2a"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def _setp(c, x, y, ch):
    c.set(int(round(x)), int(round(y)), ch)


def _empty(c, x, y):
    xi, yi = int(round(x)), int(round(y))
    return 0 <= xi < 64 and 0 <= yi < 64 and c.px[yi][xi] == "."


# ── 1. STUDY BLOCK — the taller back mass (the L's tall leg) ──────────────────
def study_block(c):
    """The dominant taller mass: a medium Box (wx=9 wy=7 h=17), flat parapet roof.
    Lit M left, shaded D right. We overpaint clean L panel seams and a thin o
    parapet accent line. The plain LEFT window + door are cut later (after the
    wing) so the opening unmistakably reads on the RIGHT wing."""
    b = Box(top=(24, 16), wx=9, wy=7, h=17)
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # clean vertical panel seams (a precise navy academic skin), L lit / d shaded
    for u in (0.36, 0.68):
        c.line(b.left_pt(u, 1.0), b.left_pt(u, 16.0), "L")
        c.line(b.right_pt(u, 1.0), b.right_pt(u, 16.0), "d")
    # a thin o starlight-gold accent line trimming the upper wall (the set's calm trim)
    c.line(b.left_pt(0.04, 2.4), b.left_pt(0.96, 2.4), "o")
    c.line(b.right_pt(0.04, 2.4), b.right_pt(0.96, 2.4), "r")
    return b


def block_parapet(c, b):
    """A thin raised parapet lip on the study-block roof + a small D instrument
    cowl near the back corner — reads as a flat academic deck, not a peak."""
    for a, bb in [(b.r_top, b.r_left), (b.r_left, b.r_front),
                  (b.r_front, b.r_right), (b.r_right, b.r_top)]:
        c.line(a, bb, "d")
    c.line(b.r_top, b.r_left, "W")          # bright lit back rims
    c.line(b.r_top, b.r_right, "W")
    c.line(b.r_left, b.r_front, "L")        # lit front-left parapet edge
    c.line(b.r_left, b.r_front, "o")        # thin o parapet accent (offset 1px below)
    # --- a small D instrument cowl / chimney near the back-right roof corner ---
    bx, by = b.roof_pt(0.64, 0.26)
    bw, bh, bz = 4, 2, 4
    c.fill_poly([(bx - bw, by), (bx, by - bh), (bx + bw, by), (bx, by + bh)], "L")
    c.fill_poly([(bx - bw, by), (bx, by + bh), (bx, by + bh + bz), (bx - bw, by + bz)], "M")
    c.fill_poly([(bx, by + bh), (bx + bw, by), (bx + bw, by + bz), (bx, by + bh + bz)], "D")
    for a, bb in [((bx - bw, by), (bx, by - bh)), ((bx, by - bh), (bx + bw, by)),
                  ((bx + bw, by), (bx, by + bh)), ((bx, by + bh), (bx - bw, by)),
                  ((bx - bw, by), (bx - bw, by + bz)), ((bx, by + bh), (bx, by + bh + bz)),
                  ((bx + bw, by), (bx + bw, by + bz)),
                  ((bx - bw, by + bz), (bx, by + bh + bz)),
                  ((bx, by + bh + bz), (bx + bw, by + bz))]:
        c.line(a, bb, "K")
    c.line((bx - bw, by), (bx, by - bh), "W")  # bright lit top rim
    c.set(int(round(bx)), int(round(by - bh - 1)), "o")  # tiny o glint on the cowl


# ── 2. READING WING — the lower abutting mass (front-right; the L's short leg) ─
def reading_wing(c):
    """The lower, smaller Box abutting the FRONT-RIGHT of the study block
    (wx=5 wy=6 h=11). Drawn AFTER the block so it sits in FRONT and steps the
    silhouette down — putting the dominant opening on its SHADED RIGHT face.
    Returns the Box so the hero study window-wall mounts on it."""
    w = Box(top=(40, 24), wx=5, wy=6, h=11)
    w.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # thin o accent trimming the wing parapet front edge
    c.line(w.r_left, w.r_front, "L")
    return w


def wing_left_plain(c, w):
    """The LIT LEFT face of the reading wing kept quiet (no hero here): a single
    c window high + a vertical D conduit. Keeps the opening clearly on the RIGHT."""
    w.window(c, "left", 0.30, 0.74, 2.4, 6.2, glass="c", hi="h", shade="G",
             frame="K", mullions=1)
    # a thin vertical D service conduit on the lit-left wing wall
    c.fill_poly([w.left_pt(0.10, 1.4), w.left_pt(0.16, 1.4),
                 w.left_pt(0.16, 9.6), w.left_pt(0.10, 9.6)], "D")
    c.line(w.left_pt(0.10, 1.4), w.left_pt(0.10, 9.6), "d")


# ── 3. MAIN-BLOCK LEFT FACE — kept plain (one window + a door) ─────────────────
def block_left_plain(c, b):
    """The LIT LEFT face of the study block stays plainer than the RIGHT hero:
    one calm c window high on the wall + a K-framed door with a soft o glow at the
    base. Drawn after the wing so the dominant glazing still reads on the RIGHT."""
    # one calm c reading window high on the lit face
    b.window(c, "left", 0.12, 0.40, 4.4, 10.2, glass="c", hi="h", shade="G",
             frame="K", mullions=1)
    # a K-framed door at the base, lower-left, with an o glow spill
    du0, du1 = 0.16, 0.34
    dvt, dvb = 10.6, 16.4
    c.fill_poly([b.left_pt(du0 - 0.02, dvt), b.left_pt(du1 + 0.02, dvt),
                 b.left_pt(du1 + 0.02, dvb), b.left_pt(du0 - 0.02, dvb)], "K")
    c.fill_poly([b.left_pt(du0 + 0.02, dvt + 0.5), b.left_pt(du1 - 0.02, dvt + 0.5),
                 b.left_pt(du1 - 0.02, dvb), b.left_pt(du0 + 0.02, dvb)], "d")
    c.line(b.left_pt((du0 + du1) / 2, dvt + 0.5), b.left_pt((du0 + du1) / 2, dvb), "K")
    c.line(b.left_pt(du0 + 0.02, dvt + 1.2), b.left_pt(du1 - 0.02, dvt + 1.2), "o")  # warm transom
    # soft o glow spill on the ground outside the left door
    sp = b.left_pt((du0 + du1) / 2, dvb + 0.8)
    sx, sy = int(round(sp[0])), int(round(sp[1]))
    for dx in range(-2, 3):
        c.set(sx + dx, sy, "o")
    c.set(sx, sy + 1, "O")


# ── 4. RIGHT-FACE STUDY WINDOW-WALL — the glowing hero opening (SHADED side) ───
def study_window_wall(c, w):
    """The HERO opening on the SHADED RIGHT face of the reading wing: a K-framed
    STUDY WINDOW-WALL that GLOWS so it reads on the dark face. Bright warm O/o
    interior lamplight, g/c instrument readouts, an h reflection sweep — a wall of
    study glass, NOT a flat blue grid. Drawn so the dominant opening reads on the
    RIGHT. Returns the sill anchor for the decode strip."""
    u0, u1 = 0.10, 0.90                      # WIDE study wall dominating the RIGHT face
    vt, vb = 1.8, 9.6
    # K recessed opening frame
    c.fill_poly([w.right_pt(u0 - 0.03, vt - 0.5), w.right_pt(u1 + 0.03, vt - 0.5),
                 w.right_pt(u1 + 0.03, vb + 0.4), w.right_pt(u0 - 0.03, vb + 0.4)], "K")
    iu0, iu1 = u0 + 0.02, u1 - 0.02
    # the glass body — bright warm interior: a c base graded to a warm o glow low
    # (interior lamplight), with a bright h sky-reflection band at the top.
    c.fill_poly([w.right_pt(iu0, vt), w.right_pt(iu1, vt),
                 w.right_pt(iu1, vb), w.right_pt(iu0, vb)], "g")
    c.fill_poly([w.right_pt(iu0, vt), w.right_pt(iu1, vt),
                 w.right_pt(iu1, vt + 1.8), w.right_pt(iu0, vt + 1.8)], "h")  # sky-reflect band
    c.fill_poly([w.right_pt(iu0, vt + 1.8), w.right_pt(iu1, vt + 1.8),
                 w.right_pt(iu1, vb - 2.6), w.right_pt(iu0, vb - 2.6)], "c")  # bright glass body
    # warm O/o interior lamplight pooling low (the study glows on the dark face)
    c.fill_poly([w.right_pt(iu0, vb - 2.6), w.right_pt(iu1, vb - 2.6),
                 w.right_pt(iu1, vb), w.right_pt(iu0, vb)], "o")
    c.fill_poly([w.right_pt(iu0 + 0.06, vb - 1.6), w.right_pt(iu1 - 0.06, vb - 1.6),
                 w.right_pt(iu1 - 0.06, vb - 0.4), w.right_pt(iu0 + 0.06, vb - 0.4)], "O")
    # --- g/c instrument readouts glowing inside (rows of tiny lit ticks) ---
    for r, vy in enumerate((vt + 2.6, vt + 4.0)):
        for k, u in enumerate([iu0 + 0.07 + j * 0.085 for j in range(9)]):
            p = w.right_pt(u, vy)
            px, py = int(round(p[0])), int(round(p[1]))
            col = "h" if (r + k) % 3 == 0 else ("c" if (r + k) % 3 == 1 else "o")
            c.set(px, py, col)
    # bright h reflection SWEEP diagonally across the study glass (the glass tell)
    c.line(w.right_pt(iu0 + 0.06, vt + 1.0), w.right_pt(iu0 + 0.40, vt + 4.2), "h")
    c.line(w.right_pt(iu0 + 0.06, vt + 1.8), w.right_pt(iu0 + 0.40, vt + 5.0), "W")
    # soft, sparse mullions in dark glass tone (never K bars)
    for u in (0.34, 0.58, 0.80):
        c.line(w.right_pt(u, vt + 0.4), w.right_pt(u, vb - 0.4), "G")
    for v in (vt + 2.0, vt + 5.4):
        c.line(w.right_pt(iu0, v), w.right_pt(iu1, v), "G")
    # crisp K frame on top
    for a, bb in [(w.right_pt(iu0, vt), w.right_pt(iu1, vt)),
                  (w.right_pt(iu0, vb), w.right_pt(iu1, vb)),
                  (w.right_pt(iu0, vt), w.right_pt(iu0, vb)),
                  (w.right_pt(iu1, vt), w.right_pt(iu1, vb))]:
        c.line(a, bb, "K")
    # sill anchor for the decode strip (just below the window on the right sill)
    return w.right_pt(0.5, vb + 1.2)


def decode_strip(c, w):
    """A small c/o DECODE STRIP on the wing's right-face sill: a row of o ticks
    with one bright O 'SOLVED' tick lit — the decoding tell of the mini-game."""
    sp = w.right_pt(0.14, 10.2)
    ep = w.right_pt(0.86, 10.2)
    x0, y0 = int(round(sp[0])), int(round(sp[1]))
    x1, y1 = int(round(ep[0])), int(round(ep[1]))
    # the strip housing (a thin c bar with a K base)
    c.line((x0, y0), (x1, y1), "c")
    c.line((x0, y0 + 1), (x1, y1 + 1), "K")
    # ticks marching along it; one bright O 'SOLVED' tick lit
    n = 6
    solved = 4
    for i in range(n):
        t = (i + 0.5) / n
        tx = int(round(x0 + (x1 - x0) * t))
        ty = int(round(y0 + (y1 - y0) * t))
        c.set(tx, ty, "O" if i == solved else "o")
        if i == solved:
            c.set(tx, ty - 1, "O")  # the lit solved tick glows brighter


# ── 5. SIGNATURE — hovering holographic CURVED-SPACETIME GRID over the wing ────
def spacetime_grid(c, w):
    """A holographic CURVED-SPACETIME GRID hovers above the reading wing: a c/g
    rubber-sheet lattice warped into a deep FUNNEL dimpled downward by a glowing
    O/W mass at its centre, with o/O field-equation glyphs orbiting the rim (one
    lit brightest = decoding). A floating curvature hologram — no slate. The
    one-of-one signature.

    Built as a TIGHT RADIAL funnel so the curvature reads unmistakably: 3 nested
    concentric iso-diamond rings that sag PROGRESSIVELY lower toward the centre
    (the sheet dipping into the well), plus 8 radial spokes from the rim corners
    bending steeply DOWN onto the mass. No scatter halos / orbit ellipses — every
    pixel is part of the grid so the read is crisp. Lit-left edges brighter h/c,
    shaded-right g/G, deep well G, mass O/W at the funnel bottom."""
    # hover the grid above the wing roof, centred over the wing — lifted clear so
    # the funnel mass floats in the air, not sunk into the block roof.
    gx, gy = w.roof_pt(0.5, 0.5)
    gx, gy = int(round(gx)), int(round(gy)) - 21   # rim-plane centre of the sheet

    RX, RY = 13.0, 6.5            # outer diamond half-extents (iso 2:1)
    WELL = 12.0                   # how far the centre is pulled DOWN (funnel depth)

    def ring(scale, dip):
        """The 4 diamond corners of a concentric ring at `scale` of the rim,
        each pushed DOWN by `dip` (so inner rings sit lower = the sagging sheet)."""
        return {
            "T": (gx, gy - RY * scale + dip),          # back/top corner
            "R": (gx + RX * scale, gy + dip),          # right corner
            "B": (gx, gy + RY * scale + dip),          # front/bottom corner
            "L": (gx - RX * scale, gy + dip),          # left corner
        }

    # three nested rings: flat rim, mid (sags), inner (sags steeply into the well).
    # the dips grow non-linearly (0.0 -> 0.50 -> 0.88) so curvature accelerates.
    rim = ring(1.00, 0.0)
    mid = ring(0.58, WELL * 0.50)
    inn = ring(0.26, WELL * 0.88)
    mass_xy = (gx, gy + WELL)                          # funnel bottom = the mass

    # --- the three concentric diamond rings (latitude rings of the funnel) ---
    # outer rim flat & bright; inner rings dip lower and deepen to G in the well.
    # lit-left edges brighter, shaded-right edges cooler — the funnel's two sides.
    for r, (lit_col, shade_col) in ((rim, ("h", "g")),
                                    (mid, ("c", "g")),
                                    (inn, ("g", "G"))):
        c.line(r["L"], r["T"], lit_col)       # back-left edge (lit)
        c.line(r["L"], r["B"], lit_col)       # front-left edge (lit)
        c.line(r["T"], r["R"], shade_col)     # back-right edge (shaded)
        c.line(r["B"], r["R"], shade_col)     # front-right edge (shaded)

    # --- radial spokes: from each rim corner + each mid-edge midpoint, bending
    # steeply DOWN through the rings to the mass, so the sheet visibly funnels into
    # the well (longitude lines). 8 spokes = a dense, obvious funnel mesh. ---
    def spoke(p_rim, p_mid, p_inn, lit):
        c.line(p_rim, p_mid, "c" if lit else "g")
        c.line(p_mid, p_inn, "g" if lit else "G")
        c.line(p_inn, mass_xy, "G")

    for key in ("T", "R", "B", "L"):
        spoke(rim[key], mid[key], inn[key], lit=key in ("L", "T", "B"))
    # 4 in-between spokes through the diagonal mid-edges (denser, smoother funnel)
    for ka, kb in (("T", "L"), ("L", "B"), ("B", "R"), ("R", "T")):
        def mid_of(d, a, b):
            return ((d[a][0] + d[b][0]) / 2, (d[a][1] + d[b][1]) / 2)
        lit = "L" in (ka, kb)
        spoke(mid_of(rim, ka, kb), mid_of(mid, ka, kb),
              mid_of(inn, ka, kb), lit=lit)

    # --- THE MASS: a glowing O/W orb at the funnel bottom, K pip + o halo ---
    mx, my = int(round(mass_xy[0])), int(round(mass_xy[1]))
    for dy in range(-3, 4):                      # tight o halo (space curving in)
        for dx in range(-3, 4):
            d2 = dx * dx + dy * dy
            if 6 < d2 <= 11 and _empty(c, mx + dx, my + dy):
                c.set(mx + dx, my + dy, "o")
    for dy in range(-2, 3):                      # the orb body
        for dx in range(-2, 3):
            if dx * dx + dy * dy <= 5:
                c.set(mx + dx, my + dy, "O")
    c.set(mx - 1, my - 1, "W")                   # lit upper-left glint
    c.set(mx - 2, my - 1, "W")
    c.set(mx + 1, my + 1, "o")                   # shaded lower-right
    c.set(mx, my, "K")                           # K pip (the singular mass)

    # --- ORBITING FIELD-EQUATION GLYPHS at the rim (ONE lit brightest = decoding) --
    # 3 quiet o terms sit on the rim; ONE big bright O/W term off the right rim is
    # unmistakably the brightest = the term being decoded NOW. Kept clear of the
    # mesh so nothing scatters.
    # rev-2 light polish: drop the upper-right rim term — it floated as a loose
    # gold speck against the sky; keeping only the left + lower rim terms leaves the
    # funnel silhouette clean on its top-right edge.
    quiet = [
        (rim["L"][0] - 2, rim["L"][1] - 1),    # left rim term
        (rim["B"][0] - 4, rim["B"][1] + 2),    # lower rim term
    ]
    for lx, ly in quiet:
        lx, ly = int(round(lx)), int(round(ly))
        c.set(lx, ly, "o")                       # short broken stroke
        c.set(lx + 1, ly, "o")
        c.set(lx + 2, ly + 1, "o")               # subscript/index stub

    # the DECODING term — clearly the brightest single glyph (off the right rim)
    dxg, dyg = int(round(rim["R"][0] + 3)), int(round(rim["R"][1] - 4))
    # a small bright field-equation term: a bar, an index, and a tiny '='
    for ddx in range(-1, 3):
        c.set(dxg + ddx, dyg, "W")               # bright top bar (the term)
    c.set(dxg, dyg + 1, "O")
    c.set(dxg + 2, dyg + 1, "O")                 # index legs
    c.set(dxg, dyg + 2, "O")
    c.set(dxg + 1, dyg + 2, "O")                 # tiny '=' under-stroke
    c.set(dxg + 2, dyg + 2, "O")
    for ddx, ddy in ((-2, 0), (0, -1), (1, 3)):   # tight o sparkle aura (hugs the glyph)
        if _empty(c, dxg + ddx, dyg + ddy):
            c.set(dxg + ddx, dyg + ddy, "o")

    # --- a thin o/O projector beam linking the wing roof emitter to the mass ---
    ex, ey = w.roof_pt(0.5, 0.40)
    exi, eyi = int(round(ex)), int(round(ey))
    c.set(exi, eyi, "r"); c.set(exi - 1, eyi, "K"); c.set(exi + 1, eyi, "K")
    for k in range(1, 5):
        t = k / 5
        bx = exi + (mx - exi) * t
        by = eyi + ((my + 3) - eyi) * t
        if _empty(c, bx, by):
            _setp(c, bx, by, "o" if k % 2 else "O")


# ── assemble + emit ──────────────────────────────────────────────────────────
def main():
    c = Canvas()
    # painter's order: taller STUDY BLOCK (back) + its parapet, then the lower
    # READING WING (front-right) so it steps the silhouette and puts the opening on
    # the RIGHT; the wing's plain LEFT face; the block's plain LEFT face; then the
    # glowing RIGHT-face STUDY WINDOW-WALL hero + decode strip; finally the floating
    # spacetime-curvature grid last (in front of all).
    block = study_block(c)
    block_parapet(c, block)
    wing = reading_wing(c)
    wing_left_plain(c, wing)
    block_left_plain(c, block)
    study_window_wall(c, wing)
    decode_strip(c, wing)
    spacetime_grid(c, wing)

    spec = {"width": 64, "height": 64, "palette": AXIOM, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/axiom_theoretical-physics-annex.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    main()
