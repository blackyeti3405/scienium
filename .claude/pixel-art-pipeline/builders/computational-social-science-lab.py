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

═══════════════════════════════════════════════════════════════════════════════════
UPGRADE-EVOLUTION pass (build(stage) + cumulative stageN helpers + emit/build_all,
copied from workshop.py / interview-room.py). Theme: the monumental round compute-
ziggurat grows into a TWIN-POPULATION agent-based MODELLING engine — it ingests more
agents, racks up server blades to run the sims, spins up a SECOND network drum for a
second modelled population, and finally the hovering constellation DOUBLES into two
linked information-cascade graphs. Every addition rides the BACK/LOWER drum masses or
the side margins so it never occludes the open oculus or the hovering society plane.
The lab's magenta `o/O` stays the HUMAN/citizen accent; the evolved glow is cool
SIGNAL-CYAN `e/E` (the network/data), with one faint `g` violet for the sim-blade
housing. Colours mature stage by stage; gold (`q`) is a t5 flourish only.

  t2  small functional add : an extra DATA-FEED WHIP + a `c` node-light ring on the base
                             drum rim + one brightened hub-node (more agents ingested)
  t3  structural add       : a louvered SERVER-BLADE ANNEX abutting the drum (faint `g`
                             glow) running the agent-based sims — deep `b` housing
  t4  major add            : a SECOND smaller network drum stepped beside the main one +
                             a glowing `e` cross-network bridge halo (two populations)
  t5  crowning feature     : the constellation DOUBLES into a twin-network cluster with
                             bright `E` information-cascade pulses + a super-hub node,
                             gold drum trim-ring + a gold finial mast
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

# Base MindFrame palette (shared keys) + the EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so the base PNG is unchanged).
# These exact evolved keys match the interview-room reference for lab consistency:
#   b  deep indigo steel — matured structure tone for the t3 blade-annex / t4 masses
#   e  energized signal-cyan glow (mid)   E  signal-cyan glow (bright) — t4 bridge / t5 cascades
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
MIND = {"K": "#181428", "W": "#e8e2f6", "L": "#cabfe6", "M": "#9f90c8", "D": "#6f5fa0", "d": "#4a3c70",
        "h": "#ecc8f4", "c": "#d0a8ee", "g": "#a45ce0", "G": "#6a2fb0",
        "o": "#f08cce", "O": "#ffb8e2", "r": "#b03a80",
        "b": "#2b2440", "e": "#7fd4ff", "E": "#d6f4ff", "q": "#f3c63a"}


# ── Ziggurat geometry: three stacked drums of decreasing radius ───────────────
CX = 32

# base drum (widest)  — the public observation mezzanine
B_TOPY, B_RX, B_RY, B_H = 33, 15, 7, 9
# mid drum             — the glazed compute gallery + louver vents
M_TOPY, M_RX, M_RY, M_H = 25, 10, 5, 8
# top drum (open oculus) — the projection drum
T_TOPY, T_RX, T_RY, T_H = 18, 6, 3, 6

# Society-plane anchors (the SAME values society_plane() uses) so the evolution
# stages can reference the constellation's centre + cluster cores from one source
# instead of re-guessing. plane centre (PCX,PCY); half-extents (PPW,PPH); the three
# emergent cluster cores in ABSOLUTE canvas coords.
PCX, PCY = CX, 8
PPW, PPH = 15, 7
PLANE_CLUSTERS = [(-9, -2), (7, -2), (-1, 3)]            # plane-relative cluster centres
PLANE_CORES = [(PCX + dx, PCY + dy) for (dx, dy) in PLANE_CLUSTERS]   # abs cores

# DATA-FEED WHIP anchor (the SAME source both stage2_feed_whip + stage5's gold finial
# use, so the t5 finial lands exactly on the mast tip rather than a 2nd hardcoded guess).
# Reseated (round-2 fix) into the CLEAR LEFT MARGIN — a freestanding feed-mast a few px
# LEFT of the base drum's lit-left edge (drum left edge ≈ x17), so its full shaft +
# crossbars + cyan pin-light read silhouetted against empty canvas instead of being
# swallowed by the drum wall / the overhanging society plane. Foot on the ground line,
# tip well below the plane's lower vertex (y15) so it never collides with plane/oculus.
WHIP_X = 14                          # mast column, in the empty left margin (x6..15 clear)
WHIP_FOOT_Y = 43                     # foot at the drum's ground line on the left
WHIP_TOP_Y = 19                      # tip: tall slim mast, clear of the plane (y<=15) above
WHIP_TIE = (17, 30)                  # where a short strut leans the mast onto the drum shoulder


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


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS agent-modelling
# structure onto the prior round-ziggurat form — never restarts, never recolors the
# whole building. Additions ride the BASE-DRUM rim, the side margins, and the air
# beside/below the main plane, so they NEVER occlude the open oculus or the hovering
# society-sim plane (the y≈1..15 headroom up top stays clear). Magenta o/O stays the
# citizen accent; the evolved glow is cool signal-cyan e/E; gold (q) only at t5.
#
#   t2  small functional add   : extra DATA-FEED WHIP + c node-light rim ring + bright hub
#   t3  structural add         : louvered SERVER-BLADE ANNEX (faint g) abutting the drum
#   t4  major add              : a SECOND smaller network drum + e cross-network bridge halo
#   t5  crowning feature       : twin-network constellation + E cascades + super-hub + gold
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_feed_whip(c):
    """t2 — SMALL FUNCTIONAL ADD: the lab starts INGESTING more agents. Three modest,
    on-theme beats: (a) a slim DATA-FEED WHIP mast standing in the CLEAR LEFT MARGIN just
    off the base drum's lit-left edge, topped with a cyan pin-light + three signal-tick
    crossbars and leaned onto the drum shoulder by a short strut so it reads anchored;
    (b) a cyan `c` NODE-LIGHT RING threaded just inside the base drum's front rim (echoing
    the lab's magenta tier-ring but in signal-cyan — the freshly wired data nodes); (c) one
    BRIGHTENED hub-node — a small O/o halo pumped onto the LEFT existing constellation core
    so one agent-cluster visibly swells. Base palette + a first touch of the evolved cyan
    `e`, kept clear of the oculus + plane.

    Round-2 fix: the whip was hidden behind the drum wall / overhanging plane (only a 3x6
    foot showed). It is now a FREESTANDING mast in the empty left margin (WHIP_X≈14, left
    of the drum's x17 edge) so its full ~24px shaft + crossbars + cyan cap read in the
    clear — silhouetted against empty canvas, tip (y19) well below the plane's lower vertex
    (y15). A short K tie-strut grounds it to the drum shoulder so it is not unmoored."""
    # --- (a) DATA-FEED WHIP standing in the clear LEFT margin ----------------------
    bx = WHIP_X
    base_y = WHIP_FOOT_Y
    top = WHIP_TOP_Y
    c.line((bx, base_y), (bx, top), "M")               # lit mast shaft (left column)
    c.line((bx + 1, base_y), (bx + 1, top + 1), "D")   # shaded mast column (2px = reads as a pole)
    c.line((bx, top), (bx + 1, top), "L")              # lit cap shoulder
    # small foot pad grounding the mast on the tile
    c.set(bx, base_y, "K")
    c.set(bx + 1, base_y, "K")
    c.set(bx - 1, base_y, "d")
    c.set(bx + 2, base_y, "d")
    # three signal-tick crossbars climbing the mast (reads as a data whip, not a flagpole)
    c.line((bx - 2, top + 5), (bx + 3, top + 5), "L")
    c.line((bx - 1, top + 9), (bx + 3, top + 9), "M")
    c.line((bx - 1, top + 13), (bx + 2, top + 13), "M")
    # a short K tie-strut leaning the mast onto the base drum's lit-left shoulder so the
    # mast reads bolted to the building (anchored), not a free-floating pole.
    c.line((bx + 1, WHIP_TIE[1]), WHIP_TIE, "K")
    c.set(bx + 2, WHIP_TIE[1] - 1, "D")
    # cyan pin-light cap + a tiny bright spark = live feed at the very tip
    c.set(bx, top, "e")
    c.set(bx, top - 1, "E")
    c.set(bx + 1, top - 1, "c")

    # --- (b) cyan `c` NODE-LIGHT RING just inside the base drum's front rim ---------
    # The base tier already carries a soft magenta o ring on its lower rim; thread a
    # parallel CYAN ring a touch higher (the newly-wired data nodes lighting up). Sparse
    # dots so it reads as a string of lit nodes, not a solid band.
    rim_y = B_TOPY + B_H                          # base drum bottom-ellipse centre
    for a in range(12, 169, 14):
        x = CX + (B_RX - 0.4) * math.cos(math.radians(a))
        y = rim_y + (B_RY - 0.5) * math.sin(math.radians(a))
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi <= 63 and 0 <= yi <= 63 and c.px[yi][xi] != "K":
            c.set(xi, yi, "c")

    # --- (c) one BRIGHTENED hub-node on the LEFT existing constellation core --------
    # pump a small O/o halo onto PLANE_CORES[0] (the left flock) so one agent-cluster
    # visibly swells (more agents ingested), without disturbing the plane field.
    hx, hy = PLANE_CORES[0]
    for dx, dy, ch in [(0, 0, "O"), (1, 0, "O"), (-1, 0, "o"), (0, -1, "o"),
                       (2, 0, "o"), (0, 1, "o"), (1, -1, "h")]:
        xi, yi = hx + dx, hy + dy
        if 0 <= xi <= 63 and 0 <= yi <= 63:
            c.set(xi, yi, ch)


def stage3_blade_annex(c):
    """t3 — STRUCTURAL ADD: a louvered SERVER-BLADE ANNEX bolted onto the base drum's
    LEFT-FRONT at ground level — the compute racks that actually RUN the agent-based
    sims. A real new structural Box (deep-indigo `b` housing, NOT a prop): an opaque
    Box.louver server-vent face + a faint `g` violet sim-glow slit, with a thin K
    cable run climbing from the annex roof up the drum toward the feed whip. Seated low
    and to the LEFT so it abuts the widest drum without touching the oculus/plane, and
    BELOW the t2 whip's foot so the two stack rather than collide."""
    # seat the annex on the left, its back-top tucked against the base drum's lit-left
    # wall so it reads as abutting; small footprint, low box.
    annex = Box(top=(CX - 17, B_TOPY + 7), wx=3, wy=4, h=8)
    # deep-indigo housing: b walls so it reads as the matured compute chassis
    annex.draw(c, roof="D", lwall="b", rwall="K", roof_hi="M", outline="K")
    # an OPAQUE server-vent louver face on its lit-LEFT side (the blade stack)
    annex.louver(c, "left", 0.16, 0.84, 1.8, 6.4, body="b", slat="K", edge="D", frame="K")
    # a faint g violet SIM-GLOW data-slit punched into the louver (the running sim) +
    # a couple of bright g blade-LED ticks so the rack reads as live, not dark.
    gx0, gy0 = annex.left_pt(0.30, 2.6)
    gx1, gy1 = annex.left_pt(0.70, 2.6)
    c.line((gx0, gy0), (gx1, gy1), "g")
    c.line((annex.left_pt(0.30, 4.2)[0], annex.left_pt(0.30, 4.2)[1]),
           (annex.left_pt(0.70, 4.2)[0], annex.left_pt(0.70, 4.2)[1]), "G")
    for u in (0.24, 0.50, 0.76):
        p = annex.left_pt(u, 5.4)
        c.set(int(round(p[0])), int(round(p[1])), "g")
    # a thin K cable run from the annex roof climbing the drum toward the feed-whip foot
    rx0, ry0 = annex.roof_pt(0.5, 0.2)
    c.line((int(round(rx0)), int(round(ry0))), (CX - 11, B_TOPY + 5), "K")
    return annex


def stage4_second_drum(c):
    """t4 — MAJOR ADD: a SECOND, smaller NETWORK DRUM steps up beside the main ziggurat
    on the RIGHT — a second modelled POPULATION gets its own compute drum. A real new
    cylinder mass (matured deep tones, a glowing c compute-pane on its lit face) seated
    on the ground to the right of the base drum, lower + smaller so the main ziggurat
    still dominates. A glowing energized-cyan `e` CROSS-NETWORK BRIDGE HALO arcs from
    the main drum's upper rim across to the small drum's crown (the two populations now
    exchange signal). Kept fully on-canvas (right edge x≈56) and clear of plane/oculus.

    Placement note (round-1 fix): the drum is pushed further RIGHT (cx=51) and made
    TALLER (h=10) with its crown RAISED (top_y=33) so its lit top ellipse + right flank
    clear the base drum's right bulge and read as a DISTINCT stepped cylinder, not a
    stub swallowed behind the main mass."""
    scx = 51                                       # centre, clearly right of the base drum
    s_topy, s_rx, s_ry, s_h = 33, 5, 3, 10         # taller; crown raised so it clears the base drum
    # the second drum body (lit-left M / shaded-right D, b deep far-right, K outline)
    drum_tier(c, scx, s_topy, s_rx, s_ry, s_h, lit="M", shade="D", deep="b", topc="L")
    s_base = s_topy + s_h
    # a glowing c compute-pane on its lit-LEFT front (a small lit gallery, like the main
    # drum's galleries) so the second drum reads as an active compute population, not a
    # blank can. A 2-col bright glass slit with a K frame.
    for cc in (-2, -1):
        t = 1 - (cc / s_rx) ** 2
        if t < 0:
            continue
        e2 = s_ry * (t ** 0.5)
        x = scx + cc
        yt = int(round(s_topy + e2 + 2.2))
        yb = int(round(s_topy + e2 + 6.2))
        for k, y in enumerate(range(yt, yb + 1)):
            f = k / max(1, (yb - yt))
            c.set(x, y, "h" if f < 0.25 else ("c" if f < 0.7 else "g"))
        c.set(x, yt - 1, "K")
        c.set(x, yb + 1, "K")
    # --- CROSS-NETWORK BRIDGE HALO: a glowing e arc spanning the GAP between the main
    #     base drum's upper-right rim and the SECOND drum's raised crown — drawn as a
    #     clean bright e rainbow arc (quadratic Bezier through a lifted apex) with a
    #     couple of bright E pulse-ticks riding it, so it reads as a signal bridge
    #     between the two populations, not a leak down the wall. -----------------------
    ax, ay = CX + B_RX - 2, B_TOPY + 2            # main-drum upper-right rim anchor
    bx2, by2 = scx - s_rx + 1, s_topy + 1          # second-drum LEFT crown rim (faces the main drum)
    mx2, my2 = (ax + bx2) / 2.0, min(ay, by2) - 7  # arc apex lifted clearly above the gap

    def bez(t):
        x = (1 - t) ** 2 * ax + 2 * (1 - t) * t * mx2 + t ** 2 * bx2
        y = (1 - t) ** 2 * ay + 2 * (1 - t) * t * my2 + t ** 2 * by2
        return (max(0, min(63, int(round(x)))), max(0, min(63, int(round(y)))))

    # draw the bridge as a TWO-PX cyan band (a bright e core with an E top edge) so it
    # reads as a deliberate signal halo spanning the populations, not a thin leak.
    prev = prevu = None
    for s in range(0, 17):
        p = bez(s / 16.0)
        pu = (p[0], max(0, p[1] - 1))             # upper edge of the band
        if prev is not None:
            c.line(prev, p, "e")
            c.line(prevu, pu, "E")
        prev, prevu = p, pu
    # bright E pulse beads + soft c under-glints riding the bridge (signal crossing)
    for t in (0.30, 0.58, 0.80):
        p = bez(t)
        c.set(p[0], p[1], "E")
        if p[1] + 1 <= 63:
            c.set(p[0], p[1] + 1, "c")
    return scx, s_topy, s_rx, s_ry, s_h


def stage5_twin_cluster(c, scx, s_topy, s_rx):
    """t5 — CROWNING FEATURE = FULLY EVOLVED twin-population engine. The hovering
    constellation DOUBLES: a SECOND compact network cluster materialises in the air over
    the t4 second drum (its population's own graph), bright `E` INFORMATION-CASCADE
    pulses arc between the original plane's cores and the new cluster (the two networks
    now exchange cascades), a bright SUPER-HUB node ignites in the main constellation,
    and the whole showpiece is dressed out in GOLD: a `q` trim-ring around the base drum
    rim + a slim gold FINIAL crowning the t2 feed-whip. Reads as elite/maxed, still
    plainly the same round compute-ziggurat. Re-anchors the second cluster off the t4
    drum's OWN centre (scx) so it stacks over that drum, not a second hardcoded guess."""
    # --- (a) SECOND NETWORK CLUSTER hovering over the t4 second drum ----------------
    # centre it above the small drum's crown, in the clear air to the right + below the
    # main plane (main plane ends ~y15; this sits y≈16..26) so the two graphs read as a
    # distinct TWIN pair, not one blob.
    ncx, ncy = scx, max(s_topy - 14, 16)
    NW, NH = 7, 4                                  # half-extents of the little graph plane

    # --- (a0) BROADCAST MAST grounding the cluster onto its OWN drum (round-2 fix) ---
    # The cluster was floating unmoored, tethered only by the dotted cascade beam. Drop a
    # solid 2px broadcast mast from the cluster's underside straight down onto the t4 drum's
    # crown, recomputed from the SAME (scx, s_topy) source stage4 used — NOT a 2nd guess —
    # with a small plinth bracket where it lands. Drawn BEFORE the cluster sheet so the
    # sheet occludes the mast top, reading as a tower the network plane sits atop.
    mast_x = scx                                   # dead-centre under the cluster + on the drum crown
    mast_top = ncy + NH - 1                        # just under the cluster plane's front edge
    mast_foot = s_topy                             # the t4 drum's crown (top-ellipse centre)
    c.line((mast_x, mast_top), (mast_x, mast_foot), "D")        # shaded mast core
    c.line((mast_x - 1, mast_top), (mast_x - 1, mast_foot), "M")  # lit-left mast edge (2px pole)
    for ry in range(mast_top + 2, mast_foot - 1, 3):           # a few K lattice ticks up the mast
        c.set(mast_x, ry, "K")
    # a small b/K plinth bracket where the mast meets the drum crown (a visible footing)
    c.fill_poly([(mast_x - 2, mast_foot), (mast_x + 2, mast_foot),
                 (mast_x + 1, mast_foot + 2), (mast_x - 1, mast_foot + 2)], "b")
    c.line((mast_x - 2, mast_foot), (mast_x + 2, mast_foot), "K")
    c.set(mast_x - 1, mast_foot + 2, "K")
    c.set(mast_x + 1, mast_foot + 2, "K")
    c.set(mast_x, mast_foot + 1, "e")              # a small cyan feed-light at the footing
    def in_graph(dx, dy, m=0.0):
        return (dx / (NW - m)) ** 2 + (dy / (NH - m * 0.5)) ** 2 <= 1.0 + 1e-6
    # a translucent SHEET field (M lit back arc -> D -> d front), MIRRORING the main
    # plane's treatment so it reads as a second flat graph-plane (NOT a dark blob): the
    # bright cyan nodes then pop off a mid-value sheet instead of drowning in black.
    for dy in range(-NH, NH + 1):
        for dx in range(-NW, NW + 1):
            if in_graph(dx, dy):
                xi, yi = ncx + dx, ncy + dy
                if 0 <= xi <= 63 and 0 <= yi <= 63:
                    fy = (dy + NH) / (2 * NH)        # 0 back .. 1 front
                    c.set(xi, yi, "M" if fy < 0.34 else ("D" if fy < 0.74 else "d"))
    # K rim outline (a crisp little graph plane silhouette) + an h sheen on the back-left
    for a in range(0, 360, 10):
        x = ncx + NW * math.cos(math.radians(a))
        y = ncy + NH * math.sin(math.radians(a))
        c.set(int(round(x)), int(round(y)), "K")
    c.line((ncx - NW + 1, ncy - 1), (ncx, ncy - NH), "h")
    # a denser twin-cluster of bright cyan data-nodes + e tie-threads INSIDE the graph
    # (the new modelled population's own network), with two bright E sub-hubs.
    n_cores = [(ncx - 3, ncy - 1), (ncx + 3, ncy + 1)]    # two sub-hubs in the new graph
    graph_nodes = [(-4, 0), (-3, -1), (-2, 1), (-1, -2), (0, 0), (0, 2),
                   (1, -1), (2, 1), (3, 0), (4, 1), (5, -1), (-5, 1)]
    for dx, dy in graph_nodes:
        if in_graph(dx, dy, 0.5):
            xi, yi = ncx + dx, ncy + dy
            c.set(xi, yi, "e" if (dx + dy) % 2 == 0 else "c")
    # e tie-threads webbing the nodes to the two sub-hubs (a little network, not dots)
    for hx, hy in n_cores:
        for dx, dy in [(-4, 0), (-1, -2), (3, 0), (5, -1)]:
            tx, ty = ncx + dx, ncy + dy
            if in_graph(dx, dy, 0.5):
                # only thread the short links so it reads as a graph, not a starburst
                if abs(tx - hx) + abs(ty - hy) <= 5:
                    c.line((hx, hy), (tx, ty), "e")
    c.line(n_cores[0], n_cores[1], "e")            # the inter-hub backbone
    # two bright E sub-hub cores last so they sit on top of the threads
    for hx, hy in n_cores:
        c.set(hx, hy, "E")
        c.set(hx, hy - 1, "e")

    # --- (b) INFORMATION-CASCADE pulses arcing between the TWO graphs ---------------
    # forked bright E arcs leaping from the main plane's RIGHT core down-right into the
    # new cluster's near sub-hub — the cascade crossing between populations. Always go
    # toward the new graph, clamped on-canvas.
    src = PLANE_CORES[1]                            # main plane right core (39,6)
    dst = (n_cores[0][0], n_cores[0][1] - 1)        # new graph near sub-hub
    casc = [src,
            (int((src[0] * 2 + dst[0]) / 3), int((src[1] * 2 + dst[1]) / 3) + 2),
            (int((src[0] + dst[0] * 2) / 3) + 1, int((src[1] + dst[1] * 2) / 3) + 1),
            dst]
    for i in range(len(casc) - 1):
        a0 = (max(0, min(63, casc[i][0])), max(0, min(63, casc[i][1])))
        a1 = (max(0, min(63, casc[i + 1][0])), max(0, min(63, casc[i + 1][1])))
        c.line(a0, a1, "E")
    # a second, fainter parallel cascade strand just below it
    for i in range(len(casc) - 1):
        a0 = (max(0, min(63, casc[i][0])), max(0, min(63, casc[i][1] + 2)))
        a1 = (max(0, min(63, casc[i + 1][0])), max(0, min(63, casc[i + 1][1] + 2)))
        c.line(a0, a1, "e")

    # --- (c) a bright SUPER-HUB node igniting in the MAIN constellation -------------
    # promote the main plane's CENTRE-FRONT core (PLANE_CORES[2]) into a bright super-hub
    # ringed by a tight E halo (the dominant emergent node of the aggregated network).
    sx, sy = PLANE_CORES[2]
    for a in range(0, 360, 45):
        x = sx + 2 * math.cos(math.radians(a))
        y = sy + 2 * 0.6 * math.sin(math.radians(a))
        c.set(int(round(x)), int(round(y)), "e")
    for dx, dy, ch in [(0, 0, "W"), (-1, 0, "E"), (1, 0, "E"), (0, -1, "E"), (0, 1, "E")]:
        c.set(sx + dx, sy + dy, ch)

    # --- (d) GOLD premium trim (t5 flourish only) -----------------------------------
    # a q gold TRIM-RING threaded around the base drum's bottom rim (over the lab's own
    # magenta tier-ring — the showpiece drum is now gilded). Sparse gold beads so it
    # reads as elite trim, not a recolor.
    rim_y = B_TOPY + B_H
    for k, a in enumerate(range(6, 175, 7)):
        x = CX + (B_RX + 0.3) * math.cos(math.radians(a))
        y = rim_y + B_RY * math.sin(math.radians(a))
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi <= 63 and 0 <= yi <= 63 and c.px[yi][xi] not in ("K",):
            c.set(xi, yi, "O" if k % 3 == 1 else "q")     # gilt beads: bright glints + gold
    # a slim GOLD FINIAL crowning the t2 feed-whip tip. Recompute from the SAME shared
    # WHIP_* anchor the whip used (not a 2nd guess) so the finial lands exactly on the tip.
    bx, top = WHIP_X, WHIP_TOP_Y
    c.set(bx, top - 1, "q")                          # gold finial bead on the tip
    c.set(bx, top - 2, "O")                          # bright hot point above it
    c.line((bx - 1, top - 1), (bx + 1, top - 1), "q")   # tiny gold crossbar


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the computational-social-science lab at upgrade `stage` (1..5). Stage 1
    is IDENTICAL to the shipped base; each higher stage keeps every prior addition and
    bolts on the next (t2 feed-whip+rim-ring → t3 server-blade annex → t4 second drum +
    bridge → t5 twin constellation + gold). Painter's order draws the back/lower masses
    first; the hovering society plane is drawn LAST so nothing overlaps it, and the t5
    twin cluster + cascades draw on top of the plane."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    contact_shadow(c)
    # ziggurat tiers — largest -> smallest (painter's algorithm; nearer/smaller last)
    drum_tier(c, CX, B_TOPY, B_RX, B_RY, B_H)                    # base (widest)
    base_y = B_TOPY + B_H
    drum_tier(c, CX, M_TOPY, M_RX, M_RY, M_H)                    # mid

    # t3 server-blade annex abuts the base drum at ground-left; draw it BEFORE the mid/
    # top drums + plane so it reads tucked against the base mass, and BEFORE t4's second
    # drum so the right-side drum composes cleanly. (Gated, but ordered here.)
    if stage >= 3:
        stage3_blade_annex(c)
    # t4 second drum sits on the ground to the right; draw before the top drum/oculus +
    # plane so the main ziggurat crown + the hovering plane stay in front of it.
    if stage >= 4:
        s_geom = stage4_second_drum(c)

    drum_tier(c, CX, T_TOPY, T_RX, T_RY, T_H)                    # top (open oculus drum)
    oculus(c)                                                    # open projection oculus + ring
    right_galleries(c, base_y)                                  # glazed ribbons (lit-left + GLOWING right) + control room

    # t2 feed-whip + rim-ring ride the base-drum rim/shoulder; draw after the galleries
    # so the rim ring sits cleanly on the finished drum, before the plane.
    if stage >= 2:
        stage2_feed_whip(c)

    society_plane(c)                                           # SIGNATURE flat society-sim plane (drawn last, never occluded)

    # t5 twin constellation + cascades + super-hub draw ON TOP of the plane; gold trim
    # last of all.
    if stage >= 5:
        scx, s_topy, s_rx, s_ry, s_h = s_geom
        stage5_twin_cluster(c, scx, s_topy, s_rx)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/mindframe"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "computational-social-science-lab"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped base PNG, so it does NOT overwrite the base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": MIND, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"mindframe_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"mindframe_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
