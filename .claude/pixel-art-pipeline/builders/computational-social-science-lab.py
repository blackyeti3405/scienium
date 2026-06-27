#!/usr/bin/env python3
"""
Computational Social Science Lab — MindFrame Lab economy building
(BESPOKE FORM · the set's PREMIUM showpiece).

A TIERED CIRCULAR ZIGGURAT COMPUTE-PAVILION with an open projection oculus — a
round stepped pyramid built from three stacked `isobuild.cylinder` drums of
decreasing radius. NOT the gateway cube, NOT a node-graph orb, and deliberately
distinct from the Focus Group's single sunken pit-drum: this is the grandest,
most monumental silhouette in the set, a round ziggurat whose top drum is OPEN as
a projection oculus from which the hero society-sim plane projects.

  • Base drum (widest, lit-left M / shaded-right D) carries a run of glowing glass
    observation-gallery panes on its SHADED RIGHT — the assigned RIGHT opening,
    made to GLOW (c/O/h lit compute-floor interiors so they read on the dark face),
    plus a glowing K-framed control-room window+door at ground level. The LIT-LEFT
    band stays plainer (darker glass + plain wall) so the projected plane carries
    the eye.
  • Mid drum: fewer/larger glazed compute-gallery panes on the right; a Box.louver
    -styled OPAQUE server-vent band rings its shaded rear (the compute floor).
  • Top drum: narrowest, its TOP OPEN as a K-rimmed projection oculus trimmed with
    a glowing `o`/`O` magenta ring.
  • Signature (one-of-one): above the open oculus floats a FLAT HORIZONTAL
    society-simulation PLANE — a translucent c/M iso parallelogram underlaid with a
    faint d/D/G city-grid, swarming with thousands of tiny glowing O/o/h citizen-
    dots that flock into 2–3 emergent O-bright clusters, faint o/g social-tie
    threads rippling between them, and a small K-framed o/O optimization DIAL at
    the plane's edge with a needle swung toward a c/h best-outcome mark. A FLAT
    plane of dots on a grid — explicitly NOT a 3D node-graph orb/ring/sphere.

Composed from art/isobuild.{cylinder} + the shared Canvas — NO iso.draw_cube /
base_windows.
Draw order: contact shadow -> base drum -> mid drum -> top drum (largest->small)
-> open oculus + magenta ring -> the glowing RIGHT observation galleries + the
ground control-room opening + the mid louver vents -> the hovering FLAT society-
sim plane (city-grid + citizen-dots + tie-threads + optimization dial).
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

MIND = {"K": "#181428", "W": "#e8e2f6", "L": "#cabfe6", "M": "#9f90c8", "D": "#6f5fa0", "d": "#4a3c70",
        "h": "#ecc8f4", "c": "#d0a8ee", "g": "#a45ce0", "G": "#6a2fb0",
        "o": "#f08cce", "O": "#ffb8e2", "r": "#b03a80"}


# ── Ziggurat geometry: three stacked drums of decreasing radius ───────────────
CX = 32

# base drum (widest)  — the public observation mezzanine
B_TOPY, B_RX, B_RY, B_H = 33, 15, 7, 9
# mid drum             — the glazed compute gallery + louver vents
M_TOPY, M_RX, M_RY, M_H = 25, 10, 5, 8
# top drum (open oculus) — the projection drum
T_TOPY, T_RX, T_RY, T_H = 18, 6, 3, 6


def ell_halfwidth(rx, ry, dy):
    """Half-width of an ellipse (rx,ry) at vertical offset dy from its centre."""
    t = 1 - (dy / ry) ** 2
    if t < 0:
        return 0.0
    return rx * (t ** 0.5)


# ── 1. contact shadow — a flat iso ellipse grounding the whole ziggurat ───────
def contact_shadow(c):
    scx, scy = CX, B_TOPY + B_H + B_RY - 1
    for x in range(scx - B_RX - 3, scx + B_RX + 4):
        for y in range(scy - 2, scy + 4):
            ex = (x - scx) / (B_RX + 3.0)
            ey = (y - scy) / 2.6
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")


# ── 2. a drum tier with curved round shading + a bright back-rim glint ────────
def drum_tier(c, cx, top_y, rx, ry, h, lit="M", shade="D", deep="d", topc="L"):
    """Stamp one ziggurat drum: a round cylinder whose wall is shaded by a curved
    bright->dark Lambert ramp (lit left -> deep right) so it reads volumetric and
    stepped, with a bright W back-rim glint along the top ellipse. Returns the
    bottom-ellipse centre-y."""
    cylinder(c, cx, top_y, rx, h, top=topc, side_l=lit, side_r=shade, outline="K", ry=ry)
    base_y = top_y + h
    # curved per-column shade ramp across the round body
    for col in range(-int(rx), int(rx) + 1):
        t = 1 - (col / rx) ** 2
        if t < 0:
            continue
        edge = ry * (t ** 0.5)
        y0 = int(top_y + edge)
        frac = (col + rx) / (2 * rx)        # 0 at far-left .. 1 at far-right
        if frac < 0.18:
            ch = lit
        elif frac < 0.34:
            ch = "L"                         # bright lit highlight band
        elif frac < 0.56:
            ch = lit
        elif frac < 0.74:
            ch = shade
        else:
            ch = deep                        # deep shaded far-right
        x = cx + col
        for y in range(y0, base_y + 1):
            if c.px[y][x] in (lit, shade, deep, topc):
                c.set(x, y, ch)
    # bright W rim glint along the back-upper arc of the top ellipse
    for a in range(188, 360, 4):
        x = cx + rx * math.cos(math.radians(a))
        y = top_y + ry * math.sin(math.radians(a))
        c.set(x, y, "W")
    # soft o magenta accent ring around the front lower rim (the tier trim)
    for a in range(6, 175, 5):
        x = cx + (rx + 0.3) * math.cos(math.radians(a))
        y = base_y + ry * math.sin(math.radians(a))
        if c.px[int(round(y))][int(round(x))] != "K":
            c.set(x, y, "o")
    return base_y


# ── 3. the open OCULUS on the top drum + glowing magenta ring ─────────────────
def oculus(c):
    """Open the top drum's crown as a K-rimmed projection oculus: a recessed dark
    K well sunk into the top ellipse, trimmed with a glowing o/O magenta ring, from
    which the society plane projects upward."""
    # inner oculus well — a smaller dark ellipse sunk into the top-drum cap
    orx, ory = T_RX - 2.4, T_RY - 1.4
    for dy in range(-int(ory) - 1, int(ory) + 2):
        hw = ell_halfwidth(orx, ory, dy)
        if hw <= 0:
            continue
        for dx in range(-int(hw), int(hw) + 1):
            c.set(CX + dx, T_TOPY + dy, "K")
    # a faint inner gradient so the well reads as depth (darker centre)
    for dy in range(-int(ory), int(ory) + 1):
        hw = ell_halfwidth(orx - 0.8, ory - 0.6, dy)
        for dx in range(-int(hw), int(hw) + 1):
            c.set(CX + dx, T_TOPY + dy, "d" if dy < 0 else "K")
    # glowing o/O magenta ring trimming the oculus rim
    for a in range(0, 360, 6):
        x = CX + (orx + 1.0) * math.cos(math.radians(a))
        y = T_TOPY + (ory + 0.7) * math.sin(math.radians(a))
        # bright O on the back arc (catching the projection), softer o on the front
        c.set(x, y, "O" if 180 <= a <= 360 else "o")
    # a couple of hot O hotspots where the projector beams climb out of the well
    c.set(CX, T_TOPY - 1, "O")
    c.set(CX - 1, T_TOPY, "o")
    c.set(CX + 1, T_TOPY, "o")


# ── a RIGHT-weighted glazed observation ribbon on a drum's curved front ────────
def ribbon_band(c, cx, top_y, rx, ry, h, vy0, vy1, louver=True):
    """Paint the drum's observation band PER COLUMN (like the distillation column)
    so it follows the round body and never gouges the front. The LIT-LEFT stays
    PLAIN WALL (per the blueprint) — only a single small dark accent vent; the GLOW
    is concentrated on the SHADED RIGHT third as clean bright glass panes split by
    sparse K mullions, with an opaque louver vent strip on the far right.
    vy0/vy1 are px offsets below the front-arc top for the band."""
    def col_band(col):
        t = 1 - (col / rx) ** 2
        if t < 0:
            return None
        edge = ry * (t ** 0.5)
        ytop = int(round(top_y + edge + vy0))
        ybot = int(round(top_y + edge + vy1))
        return (cx + col, ytop, ybot) if (ybot - ytop) >= 2 else None

    rxi = int(rx)
    # zone column ranges across the front (− = lit-left .. + = shaded-right)
    left_lo, left_hi = -int(rx * 0.62), -int(rx * 0.30)   # small lit-left vent only
    glow_lo, glow_hi = int(rx * 0.06), int(rx * 0.62)      # the glowing galleries
    vent_lo, vent_hi = int(rx * 0.66), int(rx * 0.88)      # far-right louver vents

    # 1) glowing RIGHT galleries — bright lit compute-floor interior
    for col in range(glow_lo, glow_hi + 1):
        cb = col_band(col)
        if not cb:
            continue
        x, ytop, ybot = cb
        band = ybot - ytop
        for k, y in enumerate(range(ytop, ybot + 1)):
            f = k / band
            c.set(x, y, "h" if f < 0.18 else ("O" if f < 0.40 else ("c" if f < 0.74 else "g")))
        c.set(x, ytop - 1, "K")
        c.set(x, ybot + 1, "K")
    # sparse K mullions splitting the glow into 2-3 clean panes
    for col in (glow_lo + (glow_hi - glow_lo) // 3, glow_lo + 2 * (glow_hi - glow_lo) // 3):
        cb = col_band(col)
        if cb:
            x, ytop, ybot = cb
            for y in range(ytop, ybot + 1):
                c.set(x, y, "K")

    # 2) far-right OPAQUE louver vent strip (server vents) — solid, not glass
    if louver:
        for col in range(vent_lo, vent_hi + 1):
            cb = col_band(col)
            if not cb:
                continue
            x, ytop, ybot = cb
            for k, y in enumerate(range(ytop, ybot + 1)):
                c.set(x, y, "K" if (k % 2 == 0) else "M")
            c.set(x, ytop - 1, "K")
            c.set(x, ybot + 1, "K")

    # 3) a small plain LIT-LEFT accent vent (keeps the lit side quiet)
    for col in range(left_lo, left_hi + 1):
        cb = col_band(col)
        if not cb:
            continue
        x, ytop, ybot = cb
        midt = ytop + (ybot - ytop) // 4
        midb = ybot - (ybot - ytop) // 4
        for k, y in enumerate(range(midt, midb + 1)):
            c.set(x, y, "d" if (k % 2 == 0) else "D")
        c.set(x, midt - 1, "K")
        c.set(x, midb + 1, "K")


# ── 4. the RIGHT glowing galleries + ground control-room opening (the OPENING) ─
def right_galleries(c, base_y):
    """The assigned RIGHT opening: the base + mid drums each carry a glazed
    observation ribbon whose RIGHT half GLOWS (lit compute-floor interior, so the
    opening reads on the shaded side) and whose far-right is an opaque server-vent
    louver strip; plus a K-framed glowing control-room window+door at the base
    drum's ground level (the hero entry)."""
    # mid drum ribbon (drawn first so the base ribbon sits in front of it cleanly)
    ribbon_band(c, CX, M_TOPY, M_RX, M_RY, M_H, vy0=1.4, vy1=M_H - 2.6, louver=True)

    # === THREE SEPARATE GLOWING BEATS on the shaded RIGHT base drum =============
    # The reviewer's round-0 smear is split into three things the eye reads in turn:
    #   (a) MEZZANINE glow band  — one clean lit-glass row near the drum top
    #   (b) control-room WINDOW + DOOR — a glass pane + a distinct K-framed doorway
    #   (c) GROUND spill — a soft o pool on the tile BELOW the wall, not in it
    floor_y = base_y - 1

    # --- (a) the MEZZANINE glow band: a THIN gallery-window row high on the drum,
    # with regular K mullions, kept clearly ABOVE the ground control room so the two
    # don't merge. (vy0/vy1 hold it in the top third of the base wall.) -----------
    ribbon_band(c, CX, B_TOPY, B_RX, B_RY, B_H, vy0=1.6, vy1=4.0, louver=True)

    # --- (b) the control-room WINDOW + DOOR at the base drum's ground level -------
    # Painted directly on the drum's right-front (matching this builder's per-column
    # style). The two are SEPARATE openings split by a 1px K gap:
    #   • a wide LIT GLASS WINDOW (sky-gradient + h shine streak + clean K frame)
    #   • a taller, brighter K-framed DOORWAY sunk to the floor
    # Each gets its own complete K frame so neither bleeds into the mezzanine above
    # nor into the other.
    floor_y = base_y - 1

    def glass_opening(x0, x1, ytop, ybot, top_ch, glow_ch, body_ch, sill_ch, shine):
        """A self-framed glowing opening: K frame all round, a top→bottom glow
        gradient inside, a 1px h shine streak. Reads as lit glass on the dark face."""
        for x in range(x0, x1 + 1):
            for y in range(ytop, ybot + 1):
                f = (y - ytop) / max(1, (ybot - ytop))
                c.set(x, y, top_ch if f < 0.20 else (glow_ch if f < 0.46 else (body_ch if f < 0.82 else sill_ch)))
        for y in range(ytop - 1, ybot + 2):          # K side frames
            c.set(x0 - 1, y, "K")
            c.set(x1 + 1, y, "K")
        for x in range(x0 - 1, x1 + 2):              # K top + bottom frames
            c.set(x, ytop - 1, "K")
            c.set(x, ybot + 1, "K")
        if shine:
            c.line((x0 + 1, ytop + 1), (x0 + 1, ybot - 1), "h")

    # WINDOW — a wide lit observation pane, mid-height on the right-front
    wx0, wx1 = CX + 4, CX + 8
    wtop, wbot = floor_y - 5, floor_y - 1
    glass_opening(wx0, wx1, wtop, wbot, "h", "O", "c", "g", shine=True)

    # 1px K gap (the wall pier between window and door) is the wx1+1 frame column;
    # DOORWAY — taller + brighter, sunk to the floor, toward the right corner
    dx0, dx1 = wx1 + 3, wx1 + 5
    dtop, dbot = floor_y - 7, floor_y
    glass_opening(dx0, dx1, dtop, dbot, "O", "O", "c", "g", shine=False)
    c.line((dx0, dtop + 1), (dx1, dtop + 1), "h")    # bright lintel glow inside

    # --- (c) the GROUND spill: a soft o pool on the TILE below the wall, pulled
    # clear of the wall band so it reads as light hitting the ground (3rd beat) ----
    spill_cx = (dx0 + dx1) // 2
    spill_y0 = base_y + B_RY - 2
    for k, sy in enumerate(range(spill_y0, spill_y0 + 3)):
        half = 2 - k                                  # narrows as it spreads forward
        for sx in range(spill_cx - half - 1, spill_cx + half + 1):
            if 0 <= sy < 64 and c.px[sy][sx] == "K":
                c.set(sx, sy, "o" if k == 0 else "r")


# ── 5. SIGNATURE — the hovering FLAT horizontal society-simulation PLANE ───────
def society_plane(c):
    """The hero: a FLAT HORIZONTAL society-sim PLANE floating above the open
    oculus — a translucent iso parallelogram (NOT a sphere) underlaid with a faint
    city-grid, swarming with tiny glowing citizen-dots flocking into emergent
    clusters, faint social-tie threads rippling between them, and a small
    optimization dial steering toward a best-outcome mark."""
    # plane centre, hovering well above the oculus with top headroom reserved
    pcx, pcy = CX, 8
    # iso parallelogram: 2:1 diamond, wider than tall (a flat floor seen from above)
    PW, PH = 15, 7        # half-width / half-height of the plane diamond
    # plane corners (iso diamond)
    top = (pcx, pcy - PH)
    right = (pcx + PW, pcy)
    bot = (pcx, pcy + PH)
    left = (pcx - PW, pcy)

    def in_plane(gx, gy, m=0.0):
        """Point inside the iso diamond (m shrinks the border)?"""
        return abs((gx - pcx) / (PW - m)) + abs((gy - pcy) / (PH - m * 0.5)) <= 1.0 + 1e-6

    # translucent sheet fill — a DARK plane field (d/D, with only a thin lit c band
    # along the back edge) so the bright citizen-dots POP off it instead of drowning
    # in a uniform pink mass. Reads as a FLAT sheet seen at an angle (lit back arc,
    # deep-shaded front), NOT a glowing slab.
    for gy in range(pcy - PH, pcy + PH + 1):
        for gx in range(pcx - PW, pcx + PW + 1):
            if in_plane(gx, gy):
                fy = (gy - (pcy - PH)) / (2 * PH)   # 0 back .. 1 front
                c.set(gx, gy, "M" if fy < 0.30 else ("D" if fy < 0.74 else "d"))
    # K outline of the plane diamond (crisp flat-plane silhouette)
    c.line(top, right, "K")
    c.line(right, bot, "K")
    c.line(bot, left, "K")
    c.line(left, top, "K")
    # a thin h sheen along the lit back-left edge so it reads as a translucent sheet
    c.line(left, top, "h")

    PLANE_FIELD = ("M", "D", "d")

    # ── CITY-GRID: a FEW clean BRIGHT avenues parallel to the two plane axes so the
    # swarm clearly sits ON a legible grid (round-1 polish: the old dark-d gutters
    # read as plane shading, not a grid). Drawn in G arterial boulevards crossed by
    # softer g side-streets — slightly brighter than the M/D/d field so the lines
    # read, kept sparse so it never becomes a noisy mesh. ─────────────────────────
    def grid_line(a, b, ch):
        steps = 20
        for s in range(steps + 1):
            t = s / steps
            gx = int(round(a[0] + t * (b[0] - a[0])))
            gy = int(round(a[1] + t * (b[1] - a[1])))
            if in_plane(gx, gy, 1.4) and c.px[gy][gx] in PLANE_FIELD:
                c.set(gx, gy, ch)
    # two avenues along the right-axis (left→top edge direction): a bright G
    # arterial boulevard + a softer g side-street
    for u, ch in ((0.40, "g"), (0.66, "G")):
        a = (left[0] + u * (top[0] - left[0]), left[1] + u * (top[1] - left[1]))
        b = (bot[0] + u * (right[0] - bot[0]), bot[1] + u * (right[1] - bot[1]))
        grid_line(a, b, ch)
    # two cross-avenues along the left-axis (the perpendicular family): G arterial
    # + g side-street, so the two families clearly cross into a grid
    for u, ch in ((0.40, "G"), (0.66, "g")):
        a = (left[0] + u * (bot[0] - left[0]), left[1] + u * (bot[1] - left[1]))
        b = (top[0] + u * (right[0] - top[0]), top[1] + u * (right[1] - top[1]))
        grid_line(a, b, ch)

    # ── CITIZEN-DOTS: tiny glowing dots flocking into 3 well-separated emergent
    # clusters (dense O cores -> o -> h fringe) with a FEW sparse drifters between.
    # The clusters are placed with clear empty field between them so they read as
    # distinct clumps, not an even sprinkle. ─────────────────────────────────────
    import random
    random.seed(11)
    clusters = [(-9, -2, 2.4), (7, -2, 2.2), (-1, 3, 2.0)]
    cores = [(pcx + cx0, pcy + cy0) for (cx0, cy0, _) in clusters]
    for (cx0, cy0, rad) in clusters:
        # a hot 2px O core at the centre so each cluster anchors brightly
        c.set(pcx + cx0, pcy + cy0, "O")
        c.set(pcx + cx0 + 1, pcy + cy0, "O")
        for _ in range(14):
            ang = random.random() * 2 * math.pi
            rr = (random.random() ** 0.7) * rad
            gx = int(round(pcx + cx0 + rr * math.cos(ang)))
            gy = int(round(pcy + cy0 + rr * math.sin(ang) * 0.55))
            if in_plane(gx, gy, 0.6):
                ch = "O" if rr < rad * 0.42 else ("o" if rr < rad * 0.78 else "h")
                c.set(gx, gy, ch)
    # a few sparse drifting citizen-dots between the flocks (the un-flocked) — keep
    # FEW so the empty field between clusters survives
    for _ in range(8):
        gx = pcx + random.randint(-PW + 4, PW - 4)
        gy = pcy + random.randint(-PH + 1, PH - 1)
        if in_plane(gx, gy, 1.2) and c.px[gy][gx] in PLANE_FIELD + ("G",):
            c.set(gx, gy, "h")

    # ── SOCIAL-TIE THREADS: a FEW clean g strands linking the flock cores (solid,
    # not a dotted haze) so the ties read as distinct lines, never a node-graph ball ─
    for i in range(len(cores)):
        for j in range(i + 1, len(cores)):
            ax, ay = cores[i]
            bx, by = cores[j]
            steps = 14
            for s in range(steps + 1):
                t = s / steps
                gx = int(round(ax + t * (bx - ax)))
                gy = int(round(ay + t * (by - ay)))
                # skip the dense cluster cores so the strand reads between them
                if 0.18 < t < 0.82 and in_plane(gx, gy, 0.5) and c.px[gy][gx] in PLANE_FIELD + ("G",):
                    c.set(gx, gy, "g")

    # ── faint projection beams from the oculus up to the plane's underside (link) ─
    for off, ch in ((-1, "o"), (1, "g"), (0, "G")):
        for y in range(pcy + PH - 1, T_TOPY - 1):
            t = (y - (pcy + PH - 1)) / max(1, (T_TOPY - 1 - (pcy + PH - 1)))
            xx = int(round(CX + off * (1 - t)))
            if c.px[y][xx] == "." and y % 2 == 0:
                c.set(xx, y, ch)

    # ── OPTIMIZATION DIAL: a distinct K-framed circular gauge set OFF to one side
    # (the back-right of the plane), so it reads as a separate instrument — a clean
    # K rim ring, a dark K face, ONE bright O/h needle swung up toward a green-lit
    # c best-outcome mark, with a faint r low-end tick. NOT just another dot-blob. ─
    dcx, dcy = pcx + PW - 3, pcy - 3        # off the back-right corner, clear of the swarm
    # solid K disc backing (so the gauge separates hard from the field)
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            if dx * dx + dy * dy <= 9:
                c.set(dcx + dx, dcy + dy, "K")
    # o gauge face inside the K rim (the rim stays K = a clean frame)
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            if dx * dx + dy * dy <= 4:
                c.set(dcx + dx, dcy + dy, "o")
    # dark K hub + dial markings around the face
    c.set(dcx, dcy, "K")                     # hub pin
    c.set(dcx, dcy - 2, "c")                 # green-lit BEST-outcome mark (top)
    c.set(dcx - 2, dcy + 1, "r")             # low-end tick (left)
    c.set(dcx + 2, dcy + 1, "h")             # high-end tick (right)
    # ONE clear needle swung from the hub up toward the best-outcome mark
    c.set(dcx, dcy - 1, "O")
    c.set(dcx + 1, dcy - 1, "h")
    # a faint O lock-in glow just outside the rim where the pattern settles
    c.set(dcx, dcy - 4, "O")


def build():
    c = Canvas()
    contact_shadow(c)
    # ziggurat tiers — largest -> smallest (painter's algorithm; nearer/smaller last)
    drum_tier(c, CX, B_TOPY, B_RX, B_RY, B_H)                    # base (widest)
    base_y = B_TOPY + B_H
    drum_tier(c, CX, M_TOPY, M_RX, M_RY, M_H)                    # mid
    drum_tier(c, CX, T_TOPY, T_RX, T_RY, T_H)                    # top (open oculus drum)
    oculus(c)                                                    # open projection oculus + ring
    right_galleries(c, base_y)                                  # glazed ribbons (lit-left + GLOWING right) + control room
    society_plane(c)                                           # SIGNATURE flat society-sim plane

    spec = {"width": 64, "height": 64, "palette": MIND, "rows": c.rows()}
    out = "/path/to/scienium/art/src/buildings/mindframe_computational-social-science-lab.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
