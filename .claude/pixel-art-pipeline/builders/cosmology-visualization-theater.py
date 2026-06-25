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
"""
import os
import sys
import json
import math

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import cylinder

AXIOM = {"K": "#0e1124", "W": "#dfe6f6", "L": "#b4bee0", "M": "#7c88b8", "D": "#4e5888", "d": "#333a60",
         "h": "#d6ecff", "c": "#aad8ff", "g": "#4a9ce6", "G": "#2060b0",
         "o": "#ffe27a", "O": "#fff3c0", "r": "#c89a2a"}

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


def cosmic_web(c, ocx, ocy):
    """The SIGNATURE: a hovering rotating COSMIC WEB above the oculus — bright O/h
    galaxy-cluster NODES strung on clear c/g FILAMENT strands that wrap around 2 OBVIOUS
    dark d/G VOIDS, so 'large-scale structure' reads instantly, all crowned by a BOLD
    glowing O/W PREDICTED-EXPANSION ARROW stretching the lattice OUTWARD (ghosted O
    'future' nodes past the tip). A scatter of W/c background stars fills the sky.
    Floats clear above the dome against transparent sky."""
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
    # just past the tip (the predicted stretch). ---
    a0 = (lcx + 9, lcy + 1)            # tail, at the web's right edge
    a1 = (lcx + 15, lcy - 5)           # neck where the shaft meets the head (clear sky)
    tip = (lcx + 17, lcy - 7)          # the head's sharp point, up-right, fully in-canvas
    # thick continuous shaft: bright W core + an O flank on each side (no gaps)
    fil(a0, a1, "W")
    fil((a0[0] - 1, a0[1]), (a1[0] - 1, a1[1]), "O")        # lower-left flank
    fil((a0[0] + 1, a0[1] + 1), (a1[0] + 1, a1[1] + 1), "O")  # upper-right flank
    # LARGE SOLID-FILLED triangular arrowhead pointing up-right, offsets from `tip`:
    # an O body fills it solid with a W point/streak, and a hard K back-edge + barb tips
    # silhouette it cleanly off the sky so it can never be mistaken for a web node.
    tx, ty = tip
    body = {                                                # solid O fill (W highlights)
        (0, 0): "W",                                        # the sharp point
        (-1, 0): "O", (0, 1): "W",                          # ridge just behind the tip
        (-2, 0): "O", (-1, 1): "O", (0, 2): "O",
        (-3, 0): "O", (-2, 1): "O", (-1, 2): "O", (0, 3): "O",  # widest fill (the barbs)
    }
    edge = {                                                # hard K silhouette around it
        (-4, 0): "K", (-3, 1): "K", (-2, 2): "K", (-1, 3): "K", (0, 4): "K",  # back edge
        (1, 1): "K", (1, 2): "K",                            # outer (sky) side of the tip
    }
    for (dx, dy), ch in edge.items():                       # K first, body paints over
        c.set(tx + dx, ty + dy, ch)
    for (dx, dy), ch in body.items():
        c.set(tx + dx, ty + dy, ch)
    # ghosted o 'future' supercluster mark just past the arrow tip (predicted stretch)
    c.set(tx + 2, ty - 1, "o"); c.set(tx + 1, ty - 2, "o")

    # --- 6. scatter of tiny W/c background stars around the lattice (sky polish) ---
    for (stx, sty) in [(-16, -9), (16, -14), (-18, 3), (15, 11), (-12, 14),
                       (12, 14), (-1, -15), (-20, -2), (19, 2), (9, -15)]:
        x, y = lcx + stx, lcy + sty
        if 0 <= x < 64 and 0 <= y < 64 and c.px[y][x] == ".":
            c.set(x, y, "W" if (stx + sty) % 3 == 0 else "c")


# ── assemble + emit ───────────────────────────────────────────────────────────
def build():
    c = Canvas()
    contact_shadow(c)                 # ground the broad theater
    drum(c)                           # wide low cylinder body
    base_ring(c)                      # glowing o accent ring at the base
    curtain_glass(c)                  # cyan curtain-glass ribbon on the upper drum
    entrance(c)                       # grand lit entrance + COSMOS marquee
    hubble_gauge(c)                   # c/o Hubble-rate prediction gauge
    ocx0, ocy0 = shallow_dome(c)      # broad SHALLOW disc dome (drawn over the drum)
    ocx, ocy, orx, ory = oculus(c, ocx0, ocy0)   # open oculus at the apex
    projection_cone(c, ocx, ocy, orx) # soft projection beam up into the sky
    cosmic_web(c, ocx, ocy)           # HERO: rotating cosmic web + expansion arrow + stars

    spec = {"width": 64, "height": 64, "palette": AXIOM, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/axiom_cosmology-visualization-theater.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
