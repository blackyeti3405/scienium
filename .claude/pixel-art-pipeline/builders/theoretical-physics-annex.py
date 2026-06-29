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

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

# Axiom set palette — author on these chars exactly (<=16 colors).
# Base keys (shared across all 10 Axiom buildings) + the four EVOLVED accent shades
# reserved for the upgrade stages ONLY (they never appear in stage 1, so the shipped
# theoretical-physics-annex.png is unchanged). These four evolved keys+hexes are the
# LAB-WIDE convention — every Axiom building's _t2.._t5 reuses them:
#   b  deep indigo steel   — matured structure tone for t3+ new masses
#   e  quantum-stellar glow (mid)    E  quantum-stellar glow (bright) — the t4/t5 energy
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
AXIOM = {"K": "#0e1124", "W": "#dfe6f6", "L": "#b4bee0", "M": "#7c88b8", "D": "#4e5888", "d": "#333a60",
         "h": "#d6ecff", "c": "#aad8ff", "g": "#4a9ce6", "G": "#2060b0",
         "o": "#ffe27a", "O": "#fff3c0", "r": "#c89a2a",
         "b": "#2a3158", "e": "#7ad0ff", "E": "#cdeeff", "q": "#f6c945"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def _setp(c, x, y, ch):
    c.set(int(round(x)), int(round(y)), ch)


def _empty(c, x, y):
    xi, yi = int(round(x)), int(round(y))
    return 0 <= xi < 64 and 0 <= yi < 64 and c.px[yi][xi] == "."


def _stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings) at top-left (x0,y0).
    '.' = skip (transparent)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


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


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). The compact L-shape study annex grows into
# a maxed-out gravitation institute. Every addition is theory/cosmos on-theme to THIS
# building's decoding-the-curved-spacetime hero (a solved-term tablet -> a third study
# storey -> a physical gravity-well orrery model -> the holographic grid blooming into
# a full curved lattice). Adds grow UP off the STUDY BLOCK (left) and ON the reading
# WING, kept clear of the hovering spacetime GRID hero (centred over the wing, x≈26..52,
# y≈2..30) — and the grid is RE-DRAWN LAST every stage so the hero always reads in
# front. Colours mature stage by stage; gold (q) appears ONLY as the t5 flourish.
#
#   t2  small functional add : a propped CHALK-TABLET easel + decode bar on the lit wing roof deck
#   t3  structural add       : a raised slim STUDY-TOWER setback storey on the study block
#   t4  major add            : a GRAVITY-WELL ORRERY MAST on the wing (core + tilted orbit)
#   t5  crowning feature     : the grid deepens into a CURVED LATTICE BLOOM + gold banner
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_tablet(c, w):
    """t2 — SMALL FUNCTIONAL ADD: a propped CHALK-TABLET easel standing on the reading
    wing's LIT roof deck — a dark `K`-framed slate (so its outline separates crisply from
    the bright `L` roof) carrying one bright `O` equation glyph over a row of energized
    `e`/`E` index ticks, with a short DECODE BAR (e→E ticks, one `O` solved tick lit) on a
    little easel beside it. One more 'term solved', echoing the decoding hero. On-theme,
    modest — base palette + the energized `e`/`E` accents so it actually READS as new.

    Round-2 fix: the old version sat flush on the lit-left WALL in wall-matching tones and
    rendered to pixels identical to the wall. This relocates it onto the high-contrast lit
    ROOF DECK and draws the readout in the brighter energized accents + a `K` frame lifted
    off the wall seam, so the slate's silhouette + glyphs pop. Seated on the lit LEFT-FRONT
    of the wing roof (clear `L` deck), well left of the grid emitter / orrery pocket and far
    below the floating grid hero — and clear of the grid's drawn pixels so the grid's final
    redraw never paints over it."""
    # anchor on the clean lit-LEFT wing roof deck (bright L field), left of the grid
    # emitter at x≈39 and below the block roof staircase, so the slate sits on open deck.
    ax, ay = w.roof_pt(0.24, 0.42)
    ax, ay = int(round(ax)), int(round(ay))           # ~ (35, 29)
    sx0, sy0 = ax - 3, ay - 4                          # slate top-left (6 wide x 6 tall)
    # --- a short dark easel/stand under the slate so it reads as PROPPED on the deck ---
    c.set(sx0, sy0 + 6, "K")
    c.set(sx0 + 5, sy0 + 6, "K")
    c.line((sx0 + 1, sy0 + 6), (sx0 + 4, sy0 + 6), "d")   # the easel cross-rail (dark)
    # --- the slate board: a crisp K frame around a dark `d` body, with an `M` lit top
    #     sheen + a glowing self-written equation. The dark board on the bright L roof
    #     gives a clean separating silhouette; the energized glyphs make it read as NEW.
    _stamp(c, sx0, sy0, [
        "KKKKKK",   # K top frame
        "KMMMMK",   # lit top sheen (catches the upper-left light)
        "KKOEeK",   # written line 1: bright O glyph + energized E/e index ticks
        "KdEeOK",   # written line 2 (already solved): energized term + warm O result
        "KddEdK",   # a faint trailing chalk index on the lower slate
        "KKKKKK",   # K base frame (closes the board)
    ])
    # --- a short DECODE BAR hugging the board's right frame (mini progress strip) ---
    # placed immediately right of the slate (x = sx0+6) so it reads as ATTACHED to the
    # board, and kept above the grid emitter at (39,30) so the grid never overpaints it.
    bx, by = sx0 + 6, sy0 + 1
    c.set(bx, by, "K")                    # K cap so the bar reads as a mounted instrument
    c.line((bx, by + 1), (bx, by + 3), "e")   # the energized progress column
    c.set(bx, by + 1, "E")                # bright top tick
    c.set(bx, by + 2, "O")                # one solved tick lit warm-bright


# a single shared anchor for the rooftop STUDY-TOWER so t3 (and any later stage that
# references it) recompute the SAME Box — no hardcoded second guess. A slim setback
# storey resting on the LEFT half of the study-block roof deck, rising into clear sky
# LEFT of the hovering grid hero (grid body centres at x≈39).
def _tower_box():
    return Box(top=(21, 7), wx=5, wy=4, h=9)


def stage3_study_tower(c, block):
    """t3 — STRUCTURAL ADD: a slim raised STUDY-TOWER — a setback third storey resting on
    the LEFT of the study-block roof so the taller leg of the L grows UP one clear level
    (the L silhouette is kept). A real new Box mass (lit M / shaded D / L roof, deep-indigo
    `b` base band so it reads as matured structure) with a tall warm-o/g glowing study
    window high on its lit face + a calm o eave line matching the block. Seated LEFT of
    the spacetime grid (which hovers over the wing to the right), so it never occludes the
    hero. Returns the tower Box so later stages can recompute from the SAME anchor."""
    t = _tower_box()
    t.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # deep-indigo base band so the new storey reads as matured structure
    c.line(t.w_left, t.w_front, "b")
    c.line(t.w_front, t.w_right, "b")
    # calm starlight-gold accent line along the tower's lit eave (matches the block)
    c.line(t.r_left, t.r_front, "o")
    # tall warm/cyan glowing study window high on the lit (left) tower face
    t.window(c, "left", 0.26, 0.78, 1.4, 5.4, glass="g", hi="h", shade="G",
             frame="K", mullions=1)
    # warm o lamplight pooling at the foot of the study window (a lit study upstairs)
    c.line(t.left_pt(0.30, 5.6), t.left_pt(0.74, 5.6), "o")
    # a thin conduit + a small academic placard on the shaded right tower face
    c.line(t.right_pt(0.5, 1.2), t.right_pt(0.5, t.h - 0.8), "d")
    c.fill_poly([t.right_pt(0.24, 1.6), t.right_pt(0.52, 1.6),
                 t.right_pt(0.52, 2.4), t.right_pt(0.24, 2.4)], "o")
    return t


# a single shared anchor for the ORRERY model so t4 and t5 recompute the SAME geometry —
# no hardcoded second guess. Seated on the wing roof's RIGHT-FRONT corner, the core lifted
# clear UP into the lower-right airspace to the lower-right of the grid funnel mass (which
# sits at x≈39). Returns (cx, top_y, foot, rx, ry) so both stages share the mast top AND
# the orbit-ring extents. rx kept so the ring's lit FRONT arc reads big at 64px while its
# left tip clears the grid mass (x≈39) — a prominent tabletop gravity-well model.
def _orrery_core(w):
    bxf, byf = w.roof_pt(0.95, 0.78)        # mast foot on the wing's right-front roof
    foot = (int(round(bxf)), int(round(byf)))   # (47, 30)
    cx = foot[0]
    # core lifted ~9px (a TALLER mast than r2's 6px) so the model rises as a real vertical
    # mass — its core sits at y≈21, in the clear pocket lower-RIGHT of the grid funnel.
    top_y = foot[1] - 9
    rx, ry = 6, 3                            # BIG 2:1 orbit ring (was 4/2 — too tiny)
    return cx, top_y, foot, rx, ry


def stage4_orrery(c, w):
    """t4 — MAJOR ADD: a GRAVITY-WELL ORRERY MAST rising off the reading-wing's RIGHT-FRONT
    roof — a physical brass-and-steel model of the warped grid hovering above it. A slim
    `b`/`M` mast on a clear K plinth carries a glowing quantum-stellar CORE MASS (a bright
    `E`/`e` orb in a K cage) circled by ONE bold tilted ORBIT RING (a wide clean 2:1 ellipse
    with a THICK lit front arc — the sole orbit, legible at 64px) with one bright `E`
    orbiting BEAD. The prominent new vertical mass that says this is now a gravitation
    institute. Palette matures: deep `b` mast + energized `e`/`E` core.

    Round-3 fix: r2's orrery was undersized for the 'major add' beat (~45 px, rx4/ry2 ring
    read as a tiny flask). This GROWS it — a taller 9px mast + a bigger rx6/ry3 ring with a
    doubled-up lit front arc — so it reads as a prominent model. Seated in the clear pocket
    lower-right of the grid funnel (mass at x≈39); the ring's left tip lands at x≈41, just
    clearing the mass, and its right reaches x≈54 (on-canvas). The grid is re-drawn last (in
    front), so it cleanly owns the airspace above and the funnel reads in front where they
    meet."""
    import math
    cx, top_y, foot, rx, ry = _orrery_core(w)
    roof_y = foot[1]
    # K plinth + slim mast rising from the wing's right-front roof into the clear pocket
    c.line((cx, roof_y), (cx, top_y + 1), "M")          # lit mast edge
    c.line((cx + 1, roof_y), (cx + 1, top_y + 1), "b")  # shaded mast body
    c.set(cx, roof_y, "K")
    c.set(cx + 1, roof_y, "K")
    c.fill_poly([(cx - 1, roof_y), (cx + 2, roof_y),
                 (cx + 2, roof_y + 1), (cx - 1, roof_y + 1)], "K")  # plinth
    # two mast bracket collars (a taller mast reads as an engine-mast, not a lamppost)
    for midy in ((roof_y * 2 + top_y) // 3, (roof_y + top_y * 2) // 3):
        c.fill_poly([(cx - 1, midy), (cx + 2, midy), (cx + 2, midy + 1), (cx - 1, midy + 1)], "M")
        c.set(cx + 2, midy + 1, "K")
    # a soft cyan GRAVITY-WELL halo hugging the core (space curving into the model mass),
    # drawn first so the orb sits on top — tight ring at radius ~3 (only fills empty px).
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            d2 = dx * dx + dy * dy
            if 6 < d2 <= 10 and _empty(c, cx + dx, top_y + dy):
                c.set(cx + dx, top_y + dy, "e")
    # ONE bold tilted orbit ring around the core (wide clean 2:1 ellipse). Back half dim
    # (D), front (lower) half lit (L); the lit FRONT arc is drawn DOUBLE-thick (a 2nd row
    # 1px below) so the big ring reads boldly at 64px. Left tip ≈ cx-rx = 41 (clears the
    # grid mass at x≈39); right tip ≈ cx+rx = 53 (on-canvas).
    for a in range(0, 360, 10):
        x = cx + rx * math.cos(math.radians(a))
        y = top_y + ry * math.sin(math.radians(a))
        if y >= top_y:                                   # lit front arc — thickened
            c.set(x, y, "L")
            c.set(x, y + 1, "M")
        else:                                            # dim back arc
            c.set(x, y, "D")
    # core MASS: a bright quantum-stellar orb (a rounded 5px-wide ball) in a K cage at the
    # mast top — bigger than a single pip so it reads as the prominent gravity-well mass.
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            if dx * dx + dy * dy <= 4:
                c.set(cx + dx, top_y + dy, "e")
    for xx, yy, ch in [(0, 0, "E"), (-1, 0, "E"), (0, -1, "E"), (1, 0, "e"), (0, 1, "e")]:
        c.set(cx + xx, top_y + yy, ch)      # bright E core, lit upper-left
    c.set(cx - 1, top_y - 1, "W")           # white-hot glint (lit corner)
    for xx, yy in [(-2, -2), (2, -2), (-2, 2), (2, 2)]:   # K cage corners around the orb
        c.set(cx + xx, top_y + yy, "K")
    # one bright orbiting BEAD riding the front (right) of the ring (the orrery planet)
    c.set(cx + rx, top_y + 1, "E")
    c.set(cx + rx - 1, top_y + 1, "e")


def stage5_lattice_bloom(c, w):
    """t5 — CROWNING FEATURE = FULLY EVOLVED gravitation institute. The decoding completes:
    the holographic spacetime grid DEEPENS into a full CURVED LATTICE BLOOM (its energized
    funnel rim is brightened in place by stage5_grid_bloom, layered onto the re-drawn grid),
    the orrery energizes, and the building is dressed in premium GOLD. Reads as elite, still
    unmistakably the same spacetime-annex, just maxed out. Gold ONLY here.

    Round-3 fix: r2's gold was invisible — a 1.1-row sill banner whose `q` fill was fully
    overpainted by its own `O`/`r` edge lines (0 surviving `q`). This puts gold in THREE
    readable clusters the eye registers as the premium flourish: (1) a SOLID 2-row gold
    CORNICE MARQUEE high on the wing right-face just under the eave (the `q` interior rows
    are drawn FIRST, then `O`/`r` edges sit ABOVE/BELOW them, never over them); (2) a gold
    COLLAR ring high on the orrery mast; (3) a gold STAR FINIAL crowning the study-tower
    roof. Together ~20+ visible `q` px — clear gold without a whole-building recolor."""
    import math
    # ---- energize the ORRERY (recompute from the SAME wing anchor + ring extents) ----
    cx, top_y, foot, rx, ry = _orrery_core(w)
    # brighten the lit front arc of the (now bigger) orbit ring to a bright `e` glow
    for a in range(20, 160, 15):
        x = cx + rx * math.cos(math.radians(a))
        y = top_y + ry * math.sin(math.radians(a))
        xi, yi = int(round(x)), int(round(y))
        if 0 <= yi < 64 and 0 <= xi < 64 and c.px[yi][xi] in ("L", "M", "D"):
            c.set(xi, yi, "e")
    # ---- a GOLD COLLAR ring high on the orrery mast (a premium t5 flourish, readable) ----
    cy_collar = top_y + 3                      # just under the core orb, on the upper mast
    c.fill_poly([(cx - 1, cy_collar), (cx + 2, cy_collar),
                 (cx + 2, cy_collar + 1), (cx - 1, cy_collar + 1)], "q")
    c.set(cx, cy_collar, "O")                  # a lit glint on the collar
    c.set(cx + 2, cy_collar + 1, "r")          # shaded collar underside

    # ---- GOLD CORNICE MARQUEE high on the wing right-face (premium academic trim) ----
    # a solid 2-row gold band on the SHADED RIGHT wing face, just UNDER the roof eave and
    # ABOVE the glowing study window-wall (over plain wall, so it reads as a mounted gold
    # marquee, NOT a stray pool at the canvas edge). The `q` plate rows are filled FIRST;
    # the `O` lit crest sits one row ABOVE and the `r` shade one row BELOW — so neither edge
    # line covers the solid `q` interior (r2's bug). Diagonal band ≈ (39,34)->(49,30).
    pu0, pu1 = 0.12, 0.92
    pv_top, pv_bot = 0.7, 1.3                   # two solid plate rows above the window (vt=1.8)
    c.fill_poly([w.right_pt(pu0, pv_top), w.right_pt(pu1, pv_top),
                 w.right_pt(pu1, pv_bot), w.right_pt(pu0, pv_bot)], "q")   # solid gold plate
    c.fill_poly([w.right_pt(pu0 + 0.02, pv_top + 0.15), w.right_pt(pu1 - 0.02, pv_top + 0.15),
                 w.right_pt(pu1 - 0.02, pv_bot - 0.15), w.right_pt(pu0 + 0.02, pv_bot - 0.15)],
                "q")                            # second pass guarantees a solid interior
    c.line(w.right_pt(pu0, pv_top - 0.45), w.right_pt(pu1, pv_top - 0.45), "O")  # lit crest ABOVE
    c.line(w.right_pt(pu0, pv_bot + 0.45), w.right_pt(pu1, pv_bot + 0.45), "r")  # shade BELOW
    c.line(w.right_pt(pu0, pv_top), w.right_pt(pu0, pv_bot), "K")  # K ends frame the plate
    c.line(w.right_pt(pu1, pv_top), w.right_pt(pu1, pv_bot), "K")
    # bright O 'solved equation' glyph ticks engraved along the gold marquee
    for t in (0.28, 0.50, 0.72):
        p = w.right_pt(pu0 + t * (pu1 - pu0), (pv_top + pv_bot) / 2)
        c.set(int(round(p[0])), int(round(p[1])), "O")

    # ---- a GOLD STAR FINIAL crowning the study-tower roof (gold high on the maxed form) ----
    # recompute from the SAME tower Box as stage3 (no hardcoded second guess). A small 4-point
    # gold star lifted a touch above the tower roof centre — clear of the grid (left rim x≈26).
    t = _tower_box()
    fxf, fyf = t.roof_pt(0.5, 0.42)
    fx, fy = int(round(fxf)), int(round(fyf)) - 2
    c.set(fx, fy, "O")                          # bright centre
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        _setp(c, fx + dx, fy + dy, "q")         # gold arms
    c.set(fx, fy - 2, "o")                      # a short upward apex spike


def stage5_grid_bloom(c, w):
    """t5 bloom layered ONTO the re-drawn spacetime grid (called right AFTER the final
    spacetime_grid() pass so it reads in front): the curved lattice fully ENERGIZES — its
    funnel rim edges + the upper run of every spoke are brightened IN PLACE to glowing
    `E`/`e`, and a brilliant `E` flare bursts on the central mass. Recomputes the grid's
    rim/well geometry from the SAME wing anchor the hero uses, so the bloom HUGS the actual
    funnel silhouette and reads as the lattice maxed out — connected to the hero, not
    confetti above it.

    Round-3 fix: r2 traced a WIDER halo ring into empty `.` cells just OUTSIDE the dense
    grid, so 30/52 diff px landed as floating dots in the sky. This instead re-traces the
    grid's OWN rim diamond + the rim->mid spoke segments and OVERPAINTS the existing
    `c/g/h/G` wire chars with bright `E`/`e` (no empty-cell guard on the silhouette), so the
    glow thickens the funnel edges where they already are. Only the on-mass flare may fill
    fresh px; nothing is sprayed into the sky."""
    import math
    gx, gy = w.roof_pt(0.5, 0.5)
    gx, gy = int(round(gx)), int(round(gy)) - 21     # SAME rim-plane centre as the hero
    RX, RY = 13.0, 6.5
    WELL = 12.0
    mass_xy = (gx, gy + WELL)

    def clamp(x, y):
        return max(1, min(62, int(round(x)))), max(1, min(62, int(round(y))))

    GRID_CH = ("c", "g", "h", "G", "o", "O")         # the funnel's own wire/glyph tones

    # rebuild the SAME three nested rings the hero draws, so we energize the real funnel.
    def ring(scale, dip):
        return {"T": (gx, gy - RY * scale + dip), "R": (gx + RX * scale, gy + dip),
                "B": (gx, gy + RY * scale + dip), "L": (gx - RX * scale, gy + dip)}
    rim = ring(1.00, 0.0)
    mid = ring(0.58, WELL * 0.50)
    inn = ring(0.26, WELL * 0.88)

    # ---- ENERGIZE the rim diamond edges IN PLACE: overpaint the existing wire px with a
    # bright glow so the outer silhouette of the funnel lights up. Lit-left edges -> bright
    # `E`, shaded-right edges -> `e`. Solid (every px) so the rim reads as a lit ring. ----
    def glow_edge(a, b, ch):
        n = max(abs(int(round(b[0])) - int(round(a[0]))),
                abs(int(round(b[1])) - int(round(a[1]))), 1)
        for k in range(n + 1):
            x = a[0] + (b[0] - a[0]) * k / n
            y = a[1] + (b[1] - a[1]) * k / n
            xi, yi = clamp(x, y)
            if c.px[yi][xi] in GRID_CH or c.px[yi][xi] == ".":
                c.set(xi, yi, ch)
    glow_edge(rim["L"], rim["T"], "E")               # back-left rim (lit)
    glow_edge(rim["L"], rim["B"], "E")               # front-left rim (lit)
    glow_edge(rim["T"], rim["R"], "e")               # back-right rim (shaded)
    glow_edge(rim["B"], rim["R"], "e")               # front-right rim (shaded)
    # also brighten the mid (inner) ring's lit edges so the energizing reaches into the well
    glow_edge(mid["L"], mid["T"], "e")
    glow_edge(mid["L"], mid["B"], "e")

    # ---- ENERGIZE the upper run of each spoke (rim corner -> mid corner) IN PLACE, so the
    # funnel's longitude wires glow where they meet the lit rim (the lattice charging up). --
    def mid_of(d, ka, kb):
        return ((d[ka][0] + d[kb][0]) / 2, (d[ka][1] + d[kb][1]) / 2)
    for key in ("T", "R", "B", "L"):
        glow_edge(rim[key], mid[key], "E" if key in ("L", "T", "B") else "e")
    for ka, kb in (("T", "L"), ("L", "B"), ("B", "R"), ("R", "T")):
        lit = "L" in (ka, kb)
        glow_edge(mid_of(rim, ka, kb), mid_of(mid, ka, kb), "E" if lit else "e")

    # ---- a brilliant E flare burst ON the central mass (the lattice's deepened core) ----
    # this hugs the funnel bottom; it may light fresh px immediately around the mass orb.
    mx, my = clamp(mass_xy[0], mass_xy[1])
    for dx, dy in [(0, -2), (0, 2), (-3, 0), (3, 0), (-2, -2), (2, -2), (-2, 2), (2, 2)]:
        xi, yi = clamp(mx + dx, my + dy)
        if c.px[yi][xi] in (".", "o", "O") or c.px[yi][xi] in GRID_CH:
            c.set(xi, yi, "E")
    for dx, dy in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:   # bright inner flare
        c.set(*clamp(mx + dx, my + dy), "E")
    c.set(mx, my - 1, "W")                            # white-hot apex glint


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the theoretical-physics annex at upgrade `stage` (1..5). Stage 1 is
    IDENTICAL to the shipped base; each higher stage keeps every prior addition and bolts
    on the next (t2 solved-term tablet -> t3 raised study-tower storey -> t4 gravity-well
    orrery mast -> t5 curved-lattice bloom + gold banner). The compact L grows UP off the
    study block (left) and gains a physical orrery on the wing, while the hovering
    holographic SPACETIME GRID hero is RE-DRAWN LAST at every stage so it always reads in
    front of the new structure.

    Painter's order matches the base: taller STUDY BLOCK + parapet, then the lower READING
    WING and its faces, then the glowing RIGHT-face study window-wall + decode strip; then
    the cumulative upgrade masses (grown LEFT on the block + on the wing, clear of the
    grid); then the spacetime GRID hero LAST; then (t5) the grid-bloom layered on top."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    block = study_block(c)
    block_parapet(c, block)
    wing = reading_wing(c)
    wing_left_plain(c, wing)
    block_left_plain(c, block)
    study_window_wall(c, wing)
    decode_strip(c, wing)

    # --- CUMULATIVE UPGRADE MASSES (grown clear of the floating grid hero) ---------
    if stage >= 2:
        stage2_tablet(c, wing)
    if stage >= 3:
        stage3_study_tower(c, block)
    if stage >= 4:
        stage4_orrery(c, wing)
    if stage >= 5:
        stage5_lattice_bloom(c, wing)        # orrery energize + gold banner (under grid)

    # --- SIGNATURE LAST: the hovering spacetime GRID always reads in front ----------
    spacetime_grid(c, wing)
    if stage >= 5:
        stage5_grid_bloom(c, wing)           # the curved-lattice bloom, layered on top

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/axiom"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "theoretical-physics-annex"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG +
    scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must keep
    matching the shipped theoretical-physics-annex.png, so it does NOT overwrite the base."""
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
