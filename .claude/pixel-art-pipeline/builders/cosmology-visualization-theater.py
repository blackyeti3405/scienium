#!/usr/bin/env python3
"""
Cosmology Visualization Theater — Axiom Lab economy building (BESPOKE form, PREMIUM showpiece).

The premium capstone of the Axiom set: a WIDE GRAND DOMED PLANETARIUM THEATER —
a broad, low `cylinder` drum crowned by a shallow, sweeping disc dome with an OPEN
OCULUS at its apex, the holographic cosmos projecting UP through the opening. The
widest, lowest, most luxurious round form of the set — deliberately DIFFERENT from
the Observatory Dome (a narrow rotunda under a TALL hemisphere cracked by a slit):
this is a broad shallow planetarium, not a slit-domed observatory, and unlike any
box/tower/gateway-cube.

  * Theater drum: a wide low `cylinder` body (cx≈30, top_y≈30, rx≈14, h≈11) in
    polished L/M/D navy, a bright W rim glint, a continuous `c` curtain-glass
    ribbon-window band wrapping the upper drum (premium curtain-glass via
    window-style glazing on the curve — reflection gradient + shine, never a barred
    grid), an `o` glowing accent ring at the base, a c/o Hubble-rate gauge, and a
    grand K-framed entrance with an `o` "COSMOS" marquee on the lit front.
  * Shallow dome + oculus: a broad SHALLOW dome cap over the drum, hand-built as
    nested shrinking ellipse rows (a low sweeping disc, NOT a tall hemisphere),
    W/L lit, D shaded, K outline, thin D meridian seams. A K-rimmed circular OCULUS
    is open at the apex, glowing O/c from the projector within.
  * SIGNATURE (open-top oculus): through the open oculus the planetarium projects a
    rotating holographic COSMIC WEB — glowing O/o galaxy-cluster nodes strung on thin
    c/g filament strands around dark d/G voids (the foamy large-scale-structure read),
    a few c filaments crossing in front of G ones for rotating depth — with a glowing
    O/W PREDICTED-EXPANSION ARROW sweeping outward, the outer nodes ghosted to brighter
    O "future" positions (the universe stretching). A soft c/O projection cone rises
    from the oculus; a scatter of tiny W/c background stars surrounds the lattice.

Composed from art/isobuild.{cylinder} + a hand-built shallow dome + line/pixel
helpers — NO iso.draw_cube / base_windows. Draw order (painter's): contact shadow ->
drum body -> curtain-glass ribbon + base ring + entrance + gauge -> shallow dome
-> oculus -> projection cone -> cosmic-web lattice + expansion arrow + stars.

UPGRADE EVOLUTION (cumulative _t2.._t5): the grand planetarium grows into a fully
maxed COSMOLOGY INSTITUTE. Each stage keeps every prior add and grows the round
showpiece UP / OUT — never restarting, never recoloring the whole building. The
floating COSMIC-WEB hologram is the hero signature, so (like chalkboard-room's slate)
the projection cone + cosmic web are RE-DRAWN LAST at every stage and always read in
front of the new structure. Colours mature stage by stage; gold (q) only at t5.
  t2  small functional add : a rim ANTENNA whip + a `c` curtain-glass DATA-RING + a
                             brighter `o` marquee glint (premium polish).
  t3  structural add       : a RINGED COLONNADE SKIRT — a stepped `b` plinth + a low
                             ring of short `b`/`M` columns around the drum base.
  t4  major add            : a second PROJECTOR-TURRET on the drum's right shoulder —
                             a `b` turret with a glowing `e` eye + a short `E` beam.
  t5  crowning feature     : the cosmic web blooms to a full COSMIC-WEB SPHERE of
                             `E`/`e` nodes on dotted filaments + a bright `E` expansion
                             arrow, with `q` gold oculus ring + dome meridian + marquee.
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import cylinder

# Axiom set palette — author on these chars exactly (<=16 colors).
# Base keys (shared across all 10 Axiom buildings) + the four EVOLVED accent shades
# reserved for the upgrade stages ONLY (they never appear in stage 1, so the shipped
# cosmology-visualization-theater.png is unchanged). These four evolved keys+hexes are
# the LAB-WIDE Axiom convention — every Axiom building's _t2.._t5 reuses them:
#   b  deep indigo steel   — matured structure tone for t3+ new masses
#   e  quantum-stellar glow (mid)    E  quantum-stellar glow (bright) — the t4/t5 energy
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
AXIOM = {"K": "#0e1124", "W": "#dfe6f6", "L": "#b4bee0", "M": "#7c88b8", "D": "#4e5888", "d": "#333a60",
         "h": "#d6ecff", "c": "#aad8ff", "g": "#4a9ce6", "G": "#2060b0",
         "o": "#ffe27a", "O": "#fff3c0", "r": "#c89a2a",
         "b": "#2a3158", "e": "#7ad0ff", "E": "#cdeeff", "q": "#f6c945"}

# ── drum geometry (a WIDE planetarium body with a clear straight-sided wall) ──
CX = 30          # screen-x of the drum / dome / oculus axis
TOP_Y = 30       # y of the drum's top ellipse centre
RX = 14          # WIDE horizontal radius (vs Observatory rx≈11 — broader)
RY = 7           # 2:1 ellipse half-height
DRUM_H = 14      # straight wall height so the drum reads as a DRUM under the cap


# ── 1. CONTACT SHADOW (drawn FIRST, grounds the broad theater) ────────────────
def contact_shadow(c):
    scx, scy = CX, TOP_Y + DRUM_H + RY + 2
    for x in range(scx - 18, scx + 19):
        for y in range(scy - 2, scy + 4):
            ex = (x - scx) / 18.0
            ey = (y - scy) / 2.6
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")


# ── 2. THE WIDE LOW DRUM BODY ─────────────────────────────────────────────────
def drum(c):
    """The broad cylinder theater body — polished navy, lit-left M / shaded-right D,
    with a bright W rim glint and a CORNICE band at the top. The cornice (a bright L
    ledge ring + a hard K line just below the top ellipse) is the horizontal break
    that separates the straight-sided DRUM from the shallow CAP above it, so the two
    never fuse into one orb."""
    cylinder(c, CX, TOP_Y, RX, DRUM_H,
             top="L", side_l="M", side_r="D", outline="K", ry=RY)
    # bright W rim glint along the lit-left arc of the top ellipse
    for a in range(100, 200, 8):
        x = CX + RX * math.cos(math.radians(a))
        y = TOP_Y + RY * math.sin(math.radians(a))
        c.set(x, y, "W")
    # CORNICE: a bright L ledge ring just below the rim + a hard K shadow line, so
    # the cap visibly SITS on the drum. Drawn along the front arc of the top ellipse.
    for a in range(0, 181, 3):
        x = CX + (RX - 0.4) * math.cos(math.radians(a))
        yl = TOP_Y + 1 + RY * math.sin(math.radians(a))
        yk = TOP_Y + 2 + RY * math.sin(math.radians(a))
        c.set(x, yl, "L" if a > 90 else "M")     # lit ledge brighter on the left
        c.set(x, yk, "K")                          # hard shadow line under the ledge


def base_ring(c):
    """A glowing `o` accent ring at the base of the drum (premium under-glow)."""
    by = TOP_Y + DRUM_H
    for a in range(0, 181, 5):
        x = CX + (RX - 0.5) * math.cos(math.radians(a))
        y = by + RY * math.sin(math.radians(a))
        # warm ring, brighter on the lit-left
        c.set(x, y, "o" if a > 90 else "r")
    # a couple of W sparkle glints on the lit side of the ring
    c.set(CX - RX + 3, by + 1, "O")


def curtain_glass(c):
    """A continuous CURTAIN-GLASS ribbon-window band wrapping the UPPER drum — the
    premium tell. A cyan band at a FIXED upper-wall y (so it reads as one clean
    horizontal ribbon, not a drifting smear) whose x-extent follows the cylinder
    curve. It READS AS GLASS: a bright sky-reflection crest row, a glass body, a
    shadowed sill, soft sparse mullions (dark glass, never K bars), and a couple of
    W shine glints. Framed by a thin K rail above and below."""
    # band sits in the UPPER wall, just below the top-ellipse front edge
    gy0 = TOP_Y + RY - 1           # crest row of the ribbon (upper wall)
    band_h = 3
    for xx in range(-RX + 3, RX - 2):
        # only place glass where this column is actually wall at gy0 (clip to the
        # curved top rim so panes don't float above the rounded shoulders)
        t = 1 - (xx / RX) ** 2
        if t < 0:
            continue
        rim = TOP_Y + RY * (t ** 0.5)        # front-rim y at this column
        if gy0 < rim:                          # above the rim -> not wall yet
            continue
        col_x = CX + xx
        lit = xx < 0
        # K rails top + bottom
        c.set(col_x, gy0 - 1, "K")
        c.set(col_x, gy0 + band_h, "K")
        for k in range(band_h):
            gy = gy0 + k
            if k == 0:
                ch = "h" if lit else "c"      # bright sky-reflection crest
            elif k == band_h - 1:
                ch = "G"                        # shadowed sill
            else:
                ch = "c" if lit else "g"        # glass body
            c.set(col_x, gy, ch)
        # soft sparse mullions every 5 cols (dark glass divider, never K)
        if (xx + RX) % 5 == 0:
            for k in range(1, band_h - 1):
                c.set(col_x, gy0 + k, "G")
        # W shine glints on the lit-left half (the glass tell)
        if lit and (xx + RX) % 5 == 2:
            c.set(col_x, gy0 + 1, "W")


def entrance(c):
    """A grand K-framed entrance arch low-centre-front on the drum, with a warm o/O
    lit lobby behind it and an `o` 'COSMOS' marquee just above. Sits in the LOWER wall,
    clear below the glass ribbon, on the lit-left of the front axis."""
    ew = 7
    ex = CX - 4                            # centred-front, slightly lit-left
    ey1 = TOP_Y + RY + DRUM_H - 3          # foot of the arch, just above the base
    ey0 = ey1 - 5                          # arch top (lower wall, below the glass)
    # K frame (sides + top)
    for y in range(ey0 - 1, ey1 + 1):
        c.set(ex - 1, y, "K")
        c.set(ex + ew, y, "K")
    for x in range(ex - 1, ex + ew + 1):
        c.set(x, ey0 - 1, "K")
    # warm lit lobby interior (round the two top corners -> an arch)
    for y in range(ey0, ey1 + 1):
        for x in range(ex, ex + ew):
            if y == ey0 and (x == ex or x == ex + ew - 1):
                c.set(x, y, "K")
                continue
            ch = "O" if y <= ey0 + 1 else ("o" if y <= ey0 + 3 else "r")
            c.set(x, y, ch)
    # a tall K doorway slot in the centre of the warm lobby
    dcx = ex + ew // 2
    for y in range(ey0 + 1, ey1 + 1):
        c.set(dcx, y, "K")
    # 'COSMOS' marquee — a K-framed o signage stripe just above the arch
    for i, x in enumerate(range(ex, ex + ew)):
        c.set(x, ey0 - 3, "o" if i % 2 == 0 else "O")
        c.set(x, ey0 - 4, "K")
        c.set(x, ey0 - 2, "K")


def hubble_gauge(c):
    """A small c/o Hubble-rate gauge on the shaded-right of the drum wall — a K-framed
    dial whose teal needle climbs to an O predicted mark (predicting outward expansion),
    keeping the premium prediction-readout motif on the building itself."""
    gx, gy = CX + 9, TOP_Y + RY + 6
    # K-framed dial
    for dx in range(-2, 3):
        c.set(gx + dx, gy - 3, "K")
        c.set(gx + dx, gy, "K")
    for dy in range(-3, 1):
        c.set(gx - 2, gy + dy, "K")
        c.set(gx + 2, gy + dy, "K")
    # dark dial interior + teal needle climbing up-right to an O mark
    for dy in range(-2, 0):
        for dx in range(-1, 2):
            c.set(gx + dx, gy + dy, "d")
    c.set(gx, gy - 1, "g")           # needle pivot
    c.set(gx + 1, gy - 2, "c")       # needle climbing
    c.set(gx + 2, gy - 2, "O")       # bright O predicted mark
    c.set(gx - 1, gy - 1, "h")       # glint


# ── 3. THE SHALLOW DISC DOME + OPEN OCULUS ────────────────────────────────────
def shallow_dome(c):
    """A broad SHALLOW dome cap sitting ON the drum — hand-built as nested ellipse ROWS
    so it reads as a smooth low premium DISC (deliberately FLAT, the opposite of the
    Observatory's tall hemisphere). It springs from INSIDE the drum rim (base_rx =
    RX-3) so the drum's bright `L` top-ellipse shows as a polished LEDGE ringing the
    dome base — that ledge + a hard K seam at the dome foot is what visually separates
    the cap from the body (no merged orb). Lit W/L upper-left, M mid, D shaded-right,
    K silhouette, thin D meridian seams. Returns the oculus anchor.

    Geometry: the dome's BACK rim sits at the back of the drum top ellipse; its FRONT
    rim arcs across at drum-top level. The apex is only `dome_h` px above the back rim
    => a sweeping low disc. The dome base ellipse is centred at (CX, dome_base_y)."""
    dome_h = 8                              # SHALLOW: apex only ~8px above the base rim
    base_rx = RX - 4                        # NARROWER than the drum -> drum shoulders show
    base_ry = 3.0                            # the cap's own shallow base-ellipse depth
    dome_base_y = TOP_Y - 1                  # base ellipse centre, just above the cornice
    apex_y = dome_base_y - dome_h            # screen-y of the dome apex

    # paint the cap row-by-row from the apex down to the FRONT of its base ellipse.
    # The front rim only reaches dome_base_y + base_ry (a SHALLOW 3px arc), so the cap
    # is a low disc that sits on the cornice and never bulges down the drum wall.
    bottom_y = dome_base_y + int(round(base_ry))
    for y in range(apex_y, bottom_y + 1):
        dh = dome_base_y - y                 # height above the base centre
        if dh >= 0:
            up = dh / float(dome_h)          # 0 at base .. 1 at apex
            up = min(1.0, up)
            half = base_rx * math.sqrt(max(0.0, 1.0 - up * up))
        else:
            # front rim arc of the shallow base ellipse (below centre)
            t = 1 - (dh / base_ry) ** 2
            half = base_rx * math.sqrt(max(0.0, t))
        if half < 0.5 and dh > 0:
            half = 0.5
        ih = int(round(half))
        for xx in range(-ih, ih + 1):
            rel = xx / max(1.0, half)
            up = max(0.0, dh) / float(dome_h)
            if rel < -0.30 and up > 0.25:
                ch = "W"
            elif rel < -0.05:
                ch = "L"
            elif rel < 0.45:
                ch = "M"
            else:
                ch = "D"
            c.set(CX + xx, y, ch)
        c.set(CX - ih, y, "K")               # K silhouette edges
        c.set(CX + ih, y, "K")

    # thin D meridian seams fanning from the apex down the cap (curved disc read)
    for mfrac in (-0.62, -0.22, 0.22, 0.62):
        for y in range(apex_y + 1, dome_base_y + 1):
            up = (dome_base_y - y) / float(dome_h)
            up = min(1.0, max(0.0, up))
            half = base_rx * math.sqrt(max(0.0, 1.0 - up * up))
            c.set(CX + mfrac * half, y, "D")

    # bright W crown glint on the back-left of the cap
    for dx in range(-3, 0):
        c.set(CX + dx, apex_y + 1, "W")
    c.set(CX - 4, apex_y + 2, "W")

    return CX, apex_y + 2                      # oculus anchor near the apex


def oculus(c, ocx, ocy):
    """The OPEN OCULUS at the dome apex — a K-rimmed circular opening glowing O/c from
    the projector within. The cosmos projects UP through this hole."""
    orx, ory = 5.0, 2.4
    # glowing mouth: hot O core -> o -> c rim (the projector light spilling up)
    for yy in range(int(-ory), int(ory) + 1):
        t = 1 - (yy / ory) ** 2
        if t < 0:
            continue
        half = orx * (t ** 0.5)
        for xx in range(int(-half), int(half) + 1):
            d2 = (xx / orx) ** 2 + (yy / ory) ** 2
            ch = "O" if d2 < 0.30 else ("o" if d2 < 0.62 else "c")
            c.set(ocx + xx, ocy + yy, ch)
    # K rim ellipse around the oculus
    for a in range(0, 360, 8):
        x = ocx + orx * math.cos(math.radians(a))
        y = ocy + ory * math.sin(math.radians(a))
        c.set(x, y, "K")
    return ocx, ocy, orx, ory


# ── 4. THE HERO — oculus-projected rotating COSMIC WEB + expansion arrow ───────
def projection_cone(c, ocx, ocy, orx):
    """A soft projection beam rising from the oculus to the hologram — kept SHORT and
    SPARSE (a faint widening pair of edge dots just above the rim) so it tells 'the
    cosmos is projected up from here' without smearing a noisy stem across the sky."""
    top_y = ocy - 9                    # short beam: only bridges oculus -> lattice base
    top_hw = 7
    for y in range(top_y, ocy):
        frac = (y - top_y) / float(ocy - top_y)
        hw = orx + (top_hw - orx) * (1 - frac)
        # very sparse: one faint edge dot per pair of rows, alternating sides muted
        if (ocy - y) % 3 == 0:
            c.set(ocx - hw, y, "G")
            c.set(ocx + hw, y, "G")
        if (ocy - y) % 3 == 1:
            c.set(ocx - hw + 1, y, "c")
            c.set(ocx + hw - 1, y, "c")


def cosmic_web(c, ocx, ocy, stage=1):
    """The SIGNATURE: a hovering rotating COSMIC WEB above the oculus — bright O/h
    galaxy-cluster NODES strung on clear c/g FILAMENT strands that wrap around 2 OBVIOUS
    dark d/G VOIDS, so 'large-scale structure' reads instantly, all crowned by a BOLD
    glowing O/W PREDICTED-EXPANSION ARROW stretching the lattice OUTWARD (ghosted O
    'future' nodes past the tip). A scatter of W/c background stars fills the sky.
    Floats clear above the dome against transparent sky.

    At `stage>=5` the web BLOOMS into a full COSMIC-WEB SPHERE: the same lattice gains
    an energized `E`/`e` outer GLOBE ring of cluster-nodes on dotted filaments (a 3-D
    sphere of large-scale structure) and the expansion arrow re-strokes brighter to a
    stellar `E` — the maxed prediction (see stage5_websphere, which calls this with
    stage=5 then adds the gold trim)."""
    # lattice centre above the oculus, in clear sky (just above the short beam)
    lcx, lcy = ocx, ocy - 14

    def fil(a, b, ch):
        """Thin Bresenham filament strand, skipping the two node endpoints so the
        bright node cores stay clean."""
        x0, y0 = a; x1, y1 = b
        dx, dy = abs(x1 - x0), abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx - dy
        while True:
            if (x0, y0) not in (a, b):
                c.set(x0, y0, ch)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 > -dy:
                err -= dy; x0 += sx
            if e2 < dx:
                err += dx; y0 += sy

    def void(vx, vy, rx, ry):
        """A genuinely DARK, OBVIOUS void pocket — a solid d core ringed by G, the empty
        hole the filaments wrap around. Drawn BEFORE filaments so strands can edge it."""
        for yy in range(-ry, ry + 1):
            for xx in range(-rx, rx + 1):
                e = (xx / float(rx)) ** 2 + (yy / float(ry)) ** 2
                if e <= 1.0:
                    c.set(lcx + vx + xx, lcy + vy + yy, "d" if e < 0.45 else "G")

    def node(nx, ny, core, halo, big=False):
        """A galaxy-cluster knot: a bright core + a glow halo. Hero nodes (big) get a
        fuller 8-px halo so the supercluster knots dominate the filament lines and the
        web reads as nodes-on-strands, not a bare net. Halo only over empty sky."""
        x, y = lcx + nx, lcy + ny
        ring = ((-1, 0), (1, 0), (0, -1), (0, 1))
        if big:
            ring = ring + ((-1, -1), (1, -1), (-1, 1), (1, 1))
        for dx, dy in ring:
            xi, yi = x + dx, y + dy
            if 0 <= xi < 64 and 0 <= yi < 64 and c.px[yi][xi] == ".":
                c.set(xi, yi, halo)
        c.set(x, y, core)

    # --- A clear, BOLD cosmic web read as: a bright central supercluster wrapped by a
    # filament chain that loops AROUND two obvious dark voids. Coords are (dx,dy) from
    # the lattice centre. Fewer, stronger strands than rev0 so it resolves at thumbnail.
    hub = (0, -1)
    # nodes laid roughly on a ring + a couple inner — every node is a real, bright knot
    ring = [(-9, -3), (-5, -10), (3, -11), (10, -5), (10, 4), (4, 10), (-6, 9), (-11, 3)]
    inner = [(-4, 4), (5, 1)]

    # === t5 SPHERE-BLOOM understorey: a wider energized GLOBE ring drawn FIRST (behind
    # the base lattice) so the existing web reads as the near hemisphere of a full 3-D
    # cosmic-web SPHERE. A larger dotted `e`/`E` ellipse ring of outer cluster-nodes +
    # two faint depth meridians => "the lattice closed into a globe". Stays on-canvas. =
    if stage >= 5:
        globe = []                       # outer-shell cluster nodes on a 2:1 ellipse
        grx, gry = 16, 11
        for a in range(0, 360, 30):
            gx = int(round(lcx + grx * math.cos(math.radians(a))))
            gy = int(round(lcy + gry * 0.62 * math.sin(math.radians(a))))
            gx = max(1, min(62, gx)); gy = max(1, min(40, gy))
            globe.append((gx, gy))
        # dotted equator + the two depth meridians of the sphere (every other px)
        def _dot(a, b, ch):
            n = max(abs(b[0] - a[0]), abs(b[1] - a[1])) or 1
            for k in range(n + 1):
                if k % 2:
                    continue
                x = round(a[0] + (b[0] - a[0]) * k / n)
                y = round(a[1] + (b[1] - a[1]) * k / n)
                if 0 <= x < 64 and 0 <= y < 64 and c.px[y][x] == ".":
                    c.set(x, y, ch)
        for i in range(len(globe)):       # the equatorial great-circle of the globe
            _dot(globe[i], globe[(i + 1) % len(globe)], "e")
        # two vertical depth meridians (front-left bright e, back dim G) bowing through
        for mer, ch in ((0.55, "e"), (-0.55, "G")):
            top = (int(round(lcx + mer * 3)), lcy - int(gry * 0.62))
            bot = (int(round(lcx + mer * 3)), lcy + int(gry * 0.62))
            mid = (int(round(lcx + mer * grx)), lcy)
            _dot(top, mid, ch); _dot(mid, bot, ch)
        # bright outer-shell cluster nodes around the globe (the sphere's knots)
        for (gx, gy) in globe:
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                xi, yi = gx + dx, gy + dy
                if 0 <= xi < 64 and 0 <= yi < 64 and c.px[yi][xi] == ".":
                    c.set(xi, yi, "e")
            c.set(gx, gy, "E")

    # --- 1. two OBVIOUS dark VOIDS the filaments wrap around (the large-scale read) ---
    void(-3, -4, 3, 2)      # upper-left void
    void(5, 6, 3, 2)        # lower-right void

    # --- 2. the FILAMENT chain looping the ring (the cosmic web skeleton). Lit-left
    # half bright c, shaded-right half g — a clean single loop, no tangle. ---
    for i in range(len(ring)):
        a = (lcx + ring[i][0], lcy + ring[i][1])
        b = (lcx + ring[(i + 1) % len(ring)][0], lcy + ring[(i + 1) % len(ring)][1])
        fil(a, b, "c" if ring[i][0] < 1 else "g")

    # --- 3. a few hub SPOKES to ring nodes (strands radiating from the supercluster),
    # crossing OVER the loop for a rotating-volume read. Only 4 — kept sparse + clear. ---
    for (sx, sy) in [(-9, -3), (3, -11), (10, 4), (-6, 9)]:
        fil((lcx + hub[0], lcy + hub[1]), (lcx + sx, lcy + sy), "c" if sx < 1 else "g")
    # short strands tying the two inner nodes into the web
    fil((lcx + hub[0], lcy + hub[1]), (lcx + inner[0][0], lcy + inner[0][1]), "g")
    fil((lcx + hub[0], lcy + hub[1]), (lcx + inner[1][0], lcy + inner[1][1]), "c")

    # --- 4. NODES on top, big + bright so the knots dominate. Hub = brightest hero. ---
    node(*hub, "W", "O", big=True)
    for (nx, ny) in ring:
        node(nx, ny, "h" if nx < 1 else "O", "o", big=True)
    for (nx, ny) in inner:
        node(nx, ny, "O", "o")

    # --- 5. PREDICTED-EXPANSION ARROW: a single BOLD unmistakable gold O/W arrow that
    # breaks OUT of the web's upper-right edge and sweeps into clear empty sky — the
    # universe stretching outward. Drawn LAST + placed clear of the lattice so it never
    # blends back into the filaments/nodes: a thick gold shaft (a W highlight core flanked
    # by O on both sides => a fat, continuous 3px-wide bar, no dashes) capped by a LARGE
    # SOLID-FILLED triangular arrowhead pointing up-right. A ghosted o 'future' node sits
    # just past the tip (the predicted stretch). At t5 the shaft re-strokes to stellar E. =
    shaft_core = "E" if stage >= 5 else "W"
    shaft_flank = "e" if stage >= 5 else "O"
    a0 = (lcx + 9, lcy + 1)            # tail, at the web's right edge
    a1 = (lcx + 15, lcy - 5)           # neck where the shaft meets the head (clear sky)
    tip = (lcx + 17, lcy - 7)          # the head's sharp point, up-right, fully in-canvas
    # thick continuous shaft: bright core + a flank on each side (no gaps)
    fil(a0, a1, shaft_core)
    fil((a0[0] - 1, a0[1]), (a1[0] - 1, a1[1]), shaft_flank)        # lower-left flank
    fil((a0[0] + 1, a0[1] + 1), (a1[0] + 1, a1[1] + 1), shaft_flank)  # upper-right flank
    # LARGE SOLID-FILLED triangular arrowhead pointing up-right, offsets from `tip`:
    # an O body fills it solid with a W point/streak, and a hard K back-edge + barb tips
    # silhouette it cleanly off the sky so it can never be mistaken for a web node.
    tx, ty = tip
    head_pt = "E" if stage >= 5 else "W"
    head_fill = "e" if stage >= 5 else "O"
    body = {                                                # solid fill (bright highlights)
        (0, 0): head_pt,                                    # the sharp point
        (-1, 0): head_fill, (0, 1): head_pt,                # ridge just behind the tip
        (-2, 0): head_fill, (-1, 1): head_fill, (0, 2): head_fill,
        (-3, 0): head_fill, (-2, 1): head_fill, (-1, 2): head_fill, (0, 3): head_fill,  # widest fill (the barbs)
    }
    edge = {                                                # hard K silhouette around it
        (-4, 0): "K", (-3, 1): "K", (-2, 2): "K", (-1, 3): "K", (0, 4): "K",  # back edge
        (1, 1): "K", (1, 2): "K",                            # outer (sky) side of the tip
    }
    for (dx, dy), ch in edge.items():                       # K first, body paints over
        c.set(tx + dx, ty + dy, ch)
    for (dx, dy), ch in body.items():
        c.set(tx + dx, ty + dy, ch)
    # ghosted 'future' supercluster mark just past the arrow tip (predicted stretch)
    fut = "E" if stage >= 5 else "o"
    c.set(tx + 2, ty - 1, fut); c.set(tx + 1, ty - 2, fut)

    # --- 6. scatter of tiny W/c background stars around the lattice (sky polish) ---
    for (stx, sty) in [(-16, -9), (16, -14), (-18, 3), (15, 11), (-12, 14),
                       (12, 14), (-1, -15), (-20, -2), (19, 2), (9, -15)]:
        x, y = lcx + stx, lcy + sty
        if 0 <= x < 64 and 0 <= y < 64 and c.px[y][x] == ".":
            c.set(x, y, "W" if (stx + sty) % 3 == 0 else "c")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). The grand planetarium grows into a fully
# maxed COSMOLOGY INSTITUTE. Every addition is cosmic + premium on-theme to THIS
# building (curtain-glass data-ring -> colonnade peristyle -> a second projector
# turret -> the cosmic web closing into a full glowing SPHERE), and they grow UP /
# OUT around the round drum so they never collide with the floating COSMIC-WEB hero
# (which is re-drawn LAST every stage). Colours mature stage by stage; gold (q) only
# at t5.
#
#   t2  small functional add : a rim ANTENNA whip + a `c` curtain-glass DATA-RING +
#                              a brighter `o` marquee glint (premium polish)
#   t3  structural add       : a RINGED COLONNADE SKIRT (stepped `b` plinth + a low
#                              ring of short `b`/`M` columns) around the drum base
#   t4  major add            : a second PROJECTOR-TURRET on the drum's right shoulder
#                              (a `b` turret + glowing `e` eye + a short `E` beam)
#   t5  crowning feature     : the cosmic web blooms to a full COSMIC-WEB SPHERE +
#                              `q` gold oculus ring + `q` gold dome meridian + marquee
#
# Anchors: drum top ellipse centre (CX=30, TOP_Y=30), RX=14, RY=7, base at
# y=TOP_Y+DRUM_H=44; the floating cosmic-web hero occupies roughly x≈9..47, y≈2..28
# (lattice centre at oculus_y-14). So every NEW structure anchors ON the drum body
# (y≥30) — well below the hero — and the dome/oculus stay clear at the apex.
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_dataring(c):
    """t2 — SMALL FUNCTIONAL ADD: premium polish, no new mass. (a) a slim rim ANTENNA
    MAST rising off the drum's lit-LEFT top rim into CLEAR SKY beside the dome (a tall
    mast with a 2px cross-dish + a bright cyan tip bead, so it reads as an antenna at
    64px), (b) a `c` DATA-RING of light-node studs on the VISIBLE lower drum wall just
    above the base ring (a string of cyan nodes switching ON — the theater goes
    'online'), and (c) a brighter `o`/`O` glint on the COSMOS marquee. Base palette +
    brightened `c`/`e`. Both adds sit on rows NO later geometry overdraws: the mast
    rises in the sky gap LEFT of the dome (dome spans x≈20..40), and the studs ride the
    lower wall (y≈41) which is below the glass band (ends y≈39), above the base ring
    (y≈44), and clear of the t3 colonnade (y≥48) and the floating web (y≤19).

    [Rev2 fix] The previous t2 was a no-op: its antenna sat on the BACK rim where the
    dome cap (drawn earlier, but taller) and the curtain-glass band left only a ~4px
    stub, and its studs landed inside the glass band that overwrote them. Both adds are
    relocated to clear, un-occluded rows and the mast is taller + brighter + dished."""
    # (a) rim antenna mast — seat its foot on the LIT-LEFT drum top rim (a≈166°, just
    #     left of the dome's left edge x≈20) so the whole mast rises in CLEAR SKY beside
    #     the dome, never under the cap. Tall (11px) with a cross-dish + a glowing tip.
    fa = math.radians(166)
    fx = int(round(CX + (RX - 1) * math.cos(fa)))      # ≈17 — clear-left of the dome
    fy = int(round(TOP_Y + RY * math.sin(fa)))         # ≈31 — on the lit-left rim
    top = max(1, fy - 11)                               # tall mast, clamped on-canvas
    mid = fy - 5                                        # where the mast leaves the rim sky
    # lower mast against the drum shoulder (lit M), upper mast in sky (energized e glow)
    c.line((fx, fy), (fx, mid), "M")                   # lit lower mast
    c.line((fx, mid - 1), (fx, top + 1), "e")          # bright upper mast (against sky)
    # a 3px cross-DISH bar near the top + a shorter lower crossbar so the silhouette
    # unmistakably reads as a comms antenna (a dish-on-a-mast), not a stray line.
    for dx in (-2, -1, 1, 2):
        c.set(fx + dx, top + 3, "c")                   # the wide dish crossbar
    c.set(fx - 1, top + 4, "G"); c.set(fx + 1, top + 4, "G")   # shaded depth under it
    c.set(fx - 1, top + 7, "c"); c.set(fx + 1, top + 7, "c")   # a shorter lower crossbar
    # glowing tip bead + a tiny warm blink above it
    c.set(fx, top, "E")                                # bright cyan-white tip bead
    c.set(fx, top - 1, "o")                            # a tiny warm blink crowning the tip
    c.set(fx - 1, top, "c"); c.set(fx + 1, top, "c")   # tip halo glints

    # (b) DATA-RING: bright cyan light-node studs on the VISIBLE LOWER drum wall, a clean
    #     row just above the base ring (y≈41). They flank the central entrance (x≈26..32)
    #     on the open wall columns so each reads as a distinct status light switching ON;
    #     each is a 2px-tall bright node with a hot crown bead, and nothing drawn later
    #     (colonnade y≥48, web y≤19) covers it.
    ny = TOP_Y + DRUM_H - 3                            # ≈41 — lower wall, clear row
    # 4 studs on the OPEN wall: two lit-left, two shaded-right — placed to flank the
    # central entrance (x≈26..32) and dodge the Hubble gauge (x≈37..41) so each reads
    # as a distinct status light, not blended into door/gauge furniture.
    for xx in (-11, -7, 3, 6):
        col_x = CX + xx
        if not (0 <= col_x < 64):
            continue
        lit = xx < 0
        c.set(col_x, ny, "e" if lit else "c")          # node body (energized cyan)
        c.set(col_x, ny + 1, "e" if lit else "c")      # 2px-tall body so it reads clearly
        c.set(col_x, ny - 1, "E" if lit else "h")      # hot crown bead on top
        c.set(col_x, ny + 2, "G")                       # a 1px shaded foot grounding it

    # (c) brighter marquee glint — a bright O bloom on the COSMOS marquee centre
    ew = 7
    ex = CX - 4
    ey1 = TOP_Y + RY + DRUM_H - 3
    ey0 = ey1 - 5
    mqx = ex + ew // 2
    c.set(mqx, ey0 - 3, "O")
    c.set(mqx, ey0 - 4, "O")                       # the sign lights up brighter
    c.set(mqx + 1, ey0 - 3, "o")


# a single shared anchor for the colonnade skirt geometry so t3 (and any later stage
# that references the peristyle) recompute the SAME ring (no hardcoded second guess).
def _skirt(c):
    """Returns (base_y, ring_rx, ring_ry, column list of (x,y_top)). The skirt rings
    the drum BASE: a low ellipse a touch WIDER than the drum, carrying short columns
    around its FRONT arc. Centre is the drum axis; base_y is the drum foot."""
    base_y = TOP_Y + DRUM_H                 # drum foot (y=44)
    ring_rx = RX + 2                        # widen OUT past the drum wall (peristyle)
    ring_ry = RY + 1
    cols = []
    # columns only around the FRONT/visible arc (a≈12°..168°), evenly spaced, clamped
    for a in range(12, 169, 26):
        cx = int(round(CX + ring_rx * math.cos(math.radians(a))))
        cy_top = int(round(base_y + ring_ry * math.sin(math.radians(a))))
        cx = max(1, min(62, cx))
        cols.append((a, cx, cy_top))
    return base_y, ring_rx, ring_ry, cols


def stage3_colonnade(c):
    """t3 — STRUCTURAL ADD: a grand RINGED COLONNADE SKIRT (a peristyle) around the drum
    BASE — a stepped `b` plinth ring widening the showpiece footprint OUTWARD, carrying
    a low ring of short `b`/`M` columns with bright `L` capitals around the front arc.
    A real new structural mass (the classical planetarium portico), introducing the
    matured deep-indigo `b` tone. Grows OUT (not up), keeps the round language, and sits
    entirely on the drum base — well clear of the dome/oculus and the floating web."""
    base_y, ring_rx, ring_ry, cols = _skirt(c)

    # --- stepped PLINTH: two stacked dark ellipse rings under the drum foot so the
    #     peristyle reads as a raised stone base the columns stand on. Drawn as front
    #     arcs (a≈0..180°), the lower step a touch wider => a clean 2-tier stylobate. ---
    for step, (drx, dry, ch_top, ch_face) in enumerate([(ring_rx, ring_ry, "M", "b"),
                                                          (ring_rx + 2, ring_ry + 1, "L", "b")]):
        sy = base_y + 4 + step * 2          # each step a little lower + wider
        for a in range(0, 181, 4):
            x = int(round(CX + drx * math.cos(math.radians(a))))
            yt = int(round(sy + dry * math.sin(math.radians(a))))
            if not (0 <= x < 64):
                continue
            c.set(x, yt, ch_top)            # lit tread of the step
            if yt + 1 < 64:
                c.set(x, yt + 1, ch_face)   # short riser face under it (deep `b`)
            c.set(x, yt + 2, "K") if yt + 2 < 64 else None

    # --- the COLONNADE: short stout columns standing on the plinth around the front
    #     arc — a deep-`b` shaft body, a lit `M` left edge, a bright `L` capital + a
    #     `D` base, so a row of clean little pillars rings the drum (the peristyle). ---
    col_h = 5
    for (a, cx, cy_top) in cols:
        cy_top = cy_top + 3                 # stand the column foot on the plinth tread
        cy_bot = cy_top + col_h
        if cx <= 0 or cx >= 63:
            continue
        # shaft: deep-indigo body + a lit M left edge (a 2px-wide little pillar)
        for yy in range(cy_top, cy_bot + 1):
            c.set(cx, yy, "M")              # lit edge
            c.set(cx + 1, yy, "b")          # shaded body
        c.set(cx, cy_top - 1, "L")          # bright capital (lit)
        c.set(cx + 1, cy_top - 1, "M")
        c.set(cx, cy_bot + 1, "D")          # column base shadow
        c.set(cx + 1, cy_bot + 1, "K")
    # a calm `o` starlight-gold accent dot on the lit-left end of the plinth tread
    c.set(int(round(CX - ring_rx)), base_y + 5, "o")


# a single shared anchor for the second projector turret so t4 (and t5 if it ever
# references the turret) recompute the SAME mount point (no hardcoded second guess).
def _turret(c):
    """Returns (mx, roof_y): the mount point of the second projector turret on the
    drum's RIGHT shoulder — seated on the top-ellipse FRONT-right rim at a≈22° so the
    turret sits forward on the lit cornice (NOT buried in the dome's right shadow),
    clear of the central dome/oculus and well below the floating cosmic-web hero."""
    a = math.radians(22)
    mx = int(round(CX + (RX - 1) * math.cos(a)))
    roof_y = int(round(TOP_Y + 2 + RY * math.sin(a)))   # on the cornice line, front-right
    return mx, roof_y


def stage4_turret(c):
    """t4 — MAJOR ADD: a second PROJECTOR-TURRET bolted to the drum's RIGHT (shaded)
    shoulder — a prominent new mass: a deep-`b` cylindrical turret drum on a short K
    plinth, capped by a tilted projector HOOD with a glowing quantum-stellar `e` eye,
    firing a short bright `E` beam up-and-right into the sky (a SECOND cosmos feed
    beside the oculus). Palette matures: `b` armature + energized `e`/`E` glow. Seated
    on the drum shoulder so it rises in clear sky on the right, fully on-canvas, clear
    of the central oculus and below the floating cosmic web."""
    mx, roof_y = _turret(c)
    tcx = mx + 1
    trx = 3
    top_y = roof_y - 11                    # TALLER turret -> rises clear of the drum rim
    # short K/b plinth so the turret reads as MOUNTED on the cornice (not floating)
    c.fill_poly([(tcx - trx, roof_y), (tcx + trx, roof_y),
                 (tcx + trx, roof_y + 2), (tcx - trx, roof_y + 2)], "b")
    c.line((tcx - trx, roof_y + 2), (tcx + trx, roof_y + 2), "K")
    c.set(tcx - trx, roof_y + 1, "M")      # lit-left plinth edge

    # --- the turret DRUM: a deep-indigo cylinder standing on the plinth, with a clear
    #     lit-left M edge / shaded-right b body + a hard K silhouette so it reads as a
    #     distinct round tower against the dome behind it. ---
    for xx in range(-trx, trx + 1):
        t = 1 - (xx / trx) ** 2
        if t < 0:
            continue
        edge = 1.4 * (t ** 0.5)
        col = "M" if xx <= 0 else "b"
        for yy in range(int(round(top_y + edge)), roof_y + 1):
            c.set(tcx + xx, yy, col)
    for a in range(0, 360, 12):            # top + base ellipse rims (K)
        x = tcx + trx * math.cos(math.radians(a))
        c.set(x, top_y + 1.4 * math.sin(math.radians(a)), "K")
        c.set(x, roof_y + 1.4 * math.sin(math.radians(a)), "K")
    for xx in range(-trx + 1, 1):          # lit L cap tread
        c.set(tcx + xx, top_y, "L")
    c.line((tcx - trx, top_y), (tcx - trx, roof_y), "K")   # hard side silhouette
    c.line((tcx + trx, top_y), (tcx + trx, roof_y), "K")
    # a glowing `e` instrument-slit window + two K rivets on the shaft (an active turret)
    c.line((tcx - 1, top_y + 4), (tcx + 1, top_y + 4), "e")
    c.set(tcx - 2, top_y + 4, "K"); c.set(tcx + 2, top_y + 4, "K")

    # --- projector HOOD: a bold tilted cowl on top of the turret, aimed UP-RIGHT, with
    #     a clear lit upper face + a hard K silhouette so it reads as a barrel. ---
    hx, hy = tcx, top_y - 2
    hood = [(hx - 2, hy + 1), (hx + 4, hy - 2), (hx + 4, hy + 1), (hx - 2, hy + 4)]
    c.fill_poly(hood, "b")
    c.fill_poly([(hx - 2, hy + 1), (hx + 4, hy - 2), (hx + 2, hy - 1), (hx - 2, hy + 2)], "M")  # lit upper face
    c.fill_poly([(hx - 2, hy + 1), (hx + 4, hy - 2), (hx + 3, hy - 1), (hx - 1, hy)], "L")      # bright crest
    for a, b in [(hood[0], hood[1]), (hood[1], hood[2]), (hood[2], hood[3]), (hood[3], hood[0])]:
        c.line(a, b, "K")
    # glowing quantum-stellar EYE at the hood mouth (up-right end): bright E core + e halo
    eyx, eyy = hx + 4, hy - 1
    c.set(eyx, eyy, "E")
    c.set(eyx - 1, eyy, "e"); c.set(eyx, eyy + 1, "e"); c.set(eyx - 1, eyy + 1, "e")
    # --- a BOLD short beam firing up-and-right from the eye into the sky: a solid E core
    #     with an e under-edge (a real shaft, not dashes), clamped on-canvas, aimed clear
    #     of the central web (it heads to the open upper-right). ---
    bx0, by0 = eyx + 1, eyy - 1
    beam = [(min(62, bx0 + k), max(1, by0 - k)) for k in range(0, 7)]
    for (bxk, byk) in beam:
        c.set(bxk, byk, "E")               # solid bright core
    for (bxk, byk) in beam[1:]:
        if byk + 1 < 64 and c.px[byk + 1][bxk] == ".":
            c.set(bxk, byk + 1, "e")       # soft under-edge -> a 2px shaft
    # a small `e` beam-spread fork at the tip (the projection opening up into the sky)
    txp, typ = beam[-1]
    c.set(min(62, txp + 1), max(1, typ - 2), "e")
    c.set(max(1, txp - 1), max(1, typ - 1), "e")


def stage5_websphere(c, ocx, ocy):
    """t5 — CROWNING FEATURE = FULLY EVOLVED cosmology institute. The hero theme
    completes: the projected COSMIC WEB blooms into a full glowing COSMIC-WEB SPHERE
    (handled inside cosmic_web(stage=5): an energized `E`/`e` outer globe of cluster-
    nodes on dotted filaments around the near-hemisphere lattice + a stellar-`E`
    expansion arrow). On TOP of that, premium GOLD trim dresses the showpiece — a `q`
    gold RING around the open oculus, a `q` gold MERIDIAN seam crowning the dome, and
    the COSMOS marquee re-lit in `q` gold. Reads as elite + maxed, still unmistakably
    the same planetarium. Gold ONLY here.

    NOTE: the sphere bloom itself is drawn by cosmic_web(stage=5) — which build()
    calls LAST (after this) so the hero always reads in front. This helper draws only
    the BUILDING-mounted gold trim (oculus ring + dome meridian + marquee), which must
    sit UNDER the floating web. So it is called BEFORE the final cosmic_web pass."""
    # --- gold OCULUS RING: a `q` ring just OUTSIDE the oculus K rim (orx,ory=5,2.4),
    #     a premium gold collar around the projection mouth, with two `O` boss glints. =
    orx, ory = 6.2, 3.0
    for a in range(0, 360, 14):
        x = int(round(ocx + orx * math.cos(math.radians(a))))
        y = int(round(ocy + ory * math.sin(math.radians(a))))
        if 0 <= x < 64 and 0 <= y < 64 and c.px[y][x] in (".", "K", "D", "M", "L", "W"):
            c.set(x, y, "q")
    c.set(ocx - int(orx), ocy, "O")            # lit-left boss
    c.set(ocx + int(orx), ocy, "o")            # shaded-right boss

    # --- gold DOME MERIDIAN: re-stroke the dome's central meridian seam in `q` gold
    #     (a single premium ridge line from the oculus down the front of the cap),
    #     recomputed on the SAME dome geometry shallow_dome uses (no second guess). ---
    dome_h = 8
    base_rx = RX - 4
    dome_base_y = TOP_Y - 1
    apex_y = dome_base_y - dome_h
    for y in range(apex_y + 3, dome_base_y + 1):       # start just below the oculus rim
        up = (dome_base_y - y) / float(dome_h)
        up = min(1.0, max(0.0, up))
        half = base_rx * math.sqrt(max(0.0, 1.0 - up * up))
        x = int(round(CX - 0.18 * half))               # the lit-left meridian (matches a seam)
        if 0 <= x < 64 and c.px[y][x] in ("W", "L", "M", "D"):
            c.set(x, y, "q")
    # two short gold meridian ticks flanking it for a premium ribbed-crown read
    for mfrac in (-0.46, 0.30):
        for y in range(apex_y + 4, dome_base_y - 1, 2):
            up = (dome_base_y - y) / float(dome_h)
            half = base_rx * math.sqrt(max(0.0, 1.0 - up * up))
            x = int(round(CX + mfrac * half))
            if 0 <= x < 64 and c.px[y][x] in ("L", "M", "D"):
                c.set(x, y, "q")

    # --- gold COSMOS MARQUEE: re-light the marquee signage stripe in `q` gold (premium
    #     trim over the entrance), recomputed on the SAME entrance geometry. ---
    ew = 7
    ex = CX - 4
    ey1 = TOP_Y + RY + DRUM_H - 3
    ey0 = ey1 - 5
    for i, x in enumerate(range(ex, ex + ew)):
        c.set(x, ey0 - 3, "q" if i % 2 == 0 else "O")   # gold + bright bulbs
    c.set(ex + ew // 2, ey0 - 3, "O")                    # bright centre boss


# ── assemble + emit ───────────────────────────────────────────────────────────
def build(stage: int = 1):
    """Compose the cosmology theater at upgrade `stage` (1..5). Stage 1 is IDENTICAL to
    the shipped base; each higher stage keeps every prior addition and bolts on the next
    (t2 data-ring/antenna -> t3 colonnade skirt -> t4 projector turret -> t5 cosmic-web
    sphere + gold trim). The grand planetarium grows UP and OUT around the round drum
    into a maxed cosmology institute, while the floating COSMIC-WEB hero signature is
    RE-DRAWN LAST at every stage so it always reads in front of the new structure.

    Painter's order: base drum + dome + oculus first; then upgrade masses grow on the
    drum body (data-ring on the glass, colonnade at the base, turret on the shoulder);
    t5 building-mounted gold trim; and FINALLY the projection cone + cosmic web on top
    (the hero), so nothing ever occludes the signature."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    contact_shadow(c)                 # ground the broad theater
    drum(c)                           # wide low cylinder body
    base_ring(c)                      # glowing o accent ring at the base
    curtain_glass(c)                  # cyan curtain-glass ribbon on the upper drum
    entrance(c)                       # grand lit entrance + COSMOS marquee
    hubble_gauge(c)                   # c/o Hubble-rate prediction gauge
    ocx0, ocy0 = shallow_dome(c)      # broad SHALLOW disc dome (drawn over the drum)
    ocx, ocy, orx, ory = oculus(c, ocx0, ocy0)   # open oculus at the apex

    # --- CUMULATIVE UPGRADE STAGES (grown on the drum body, clear of the floating web)
    if stage >= 2:
        stage2_dataring(c)            # rim antenna + glass data-ring + marquee glint
    if stage >= 3:
        stage3_colonnade(c)           # ringed colonnade skirt around the drum base
    if stage >= 4:
        stage4_turret(c)              # second projector-turret on the drum shoulder
    if stage >= 5:
        stage5_websphere(c, ocx, ocy)  # building-mounted gold trim (under the web)

    # --- HERO LAST: projection cone + rotating cosmic web always read in front --------
    projection_cone(c, ocx, ocy, orx)  # soft projection beam up into the sky
    cosmic_web(c, ocx, ocy, stage=stage)  # HERO: cosmic web (+ sphere bloom at t5)
    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/axiom"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "cosmology-visualization-theater"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped cosmology-visualization-theater.png, so it does NOT
    overwrite the base PNG."""
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
