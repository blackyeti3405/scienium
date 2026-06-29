#!/usr/bin/env python3
"""
Remote Sensing Hub — TerraBase Lab economy building (BESPOKE form, STANDARD role).

A CLEAN LOW OPS BLOCKHOUSE crowned by a big TILTED ROOFTOP DISPLAY SCREEN angled up
toward the sky — a distinct angled-slab silhouette, deliberately NOT a radar dish
(Operations Hub owns the dish) and NOT a globe. The blockhouse is the palest, most
modern ground-station mass in the set (smooth M/L walls, flat L roof deck, a thin o
trim line), and the tilted K-framed screen on its D/K A-frame stand is the signature
massing element.

  • Opening side = RIGHT: the hero is the interpretation control room on the SHADED
    RIGHT face — a wide K-framed glass window + door that GLOW (g->c monitor glass
    over a warm o/O interior, h reflection) so it reads on the shaded side. The LIT
    LEFT face stays plainer (a clean wall + one c ribbon window + the door).
  • Signature (one-of-one): a glowing tilted ORBITAL GROUND-TRACK RING arcs above
    the hub with a tiny W/O satellite (o solar-panel wings) circling it, BEAMING a
    slanted cascade of false-color c/g/o raster image-TILES down onto the tilted
    rooftop screen — where they land and RESOLVE pixel-by-pixel into a coherent
    g/G/o/r false-color terrain MAP (the decode): half resolved into a clean map,
    half still loose scattered tiles, the resolved edge glowing h/O, with a tiny c
    "DECODE" progress bar along the screen frame filling g->O.

Composed from art/isobuild.{Box} — NO iso.draw_cube / base_windows.
Draw order: contact shadow + ops blockhouse (back) -> tilted roof SCREEN on its
A-frame + whip antenna -> orbital ring + satellite + cascading raster tiles +
resolving terrain map on the screen -> the GLOWING right control-room opening (front).

──────────────────────────────────────────────────────────────────────────────
UPGRADE-EVOLUTION lab member. The build() body below is the UNCHANGED base form
(stage 1 == shipped remote-sensing-hub.png). On top of it four CUMULATIVE upgrade
stages bolt on ground-station / orbital-sensing structure (build up, never restart),
copying the sampling-station.py / workshop.py pattern (build(stage) + stageN_*
helpers + emit/build_all). Theme: the lone ops hub grows into a fully-instrumented
multi-ring downlink station. See terrabase-evolution-plan.md (#8 remote-sensing-hub).
  t2  small functional add : a 2nd K whip antenna (o tip beacon) + a faint c
                             telemetry-bead ring along the roof eave + a brightened
                             O orbit-ring node.
  t3  structural add        : a b-housed ground-station DISH ANNEX abutting the
                             shaded right wall, carrying a tilted L/D parabolic dish
                             aimed up with a g feed glint.
  t4  major add             : a 2nd larger inclined e-lit SCAN-RING crossing the
                             first over the rooftop, with a glowing e sensor pod
                             riding it + a deep b mast collar on the screen stand.
  t5  crowning feature      : the rings resolve into a glowing E global-coverage
                             SWATH/ground-track lattice with traveling e data pulses
                             + a pulsing E downlink node, + q gold dish rim & finial.
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

# Base TerraBase palette (shared keys) + the EVOLVED-accent keys reserved for the
# upgrade stages only (chars NOT used by the base palette, so they appear in NO
# stage-1 sprite and remote-sensing-hub.png stays byte-identical). These four exact
# keys+hexes are the lab-wide evolved accents reused by every terrabase building:
#   b  deep basalt/bedrock  — matured warm structure tone for t3+ new masses
#   e  energized mineral-seismic glow (mid)    E  energized glow (bright) — t4/t5 power
#   q  premium survey gold  — t5 flourish ONLY (NOT a whole-building recolor)
TERRA = {"K": "#20190f", "W": "#efe6cf", "L": "#d6c8a0", "M": "#b09a6e", "D": "#7e6c47", "d": "#54462c",
         "h": "#d6f2ea", "c": "#a4e2d4", "g": "#34b6a2", "G": "#1d8474",
         "o": "#e0a850", "O": "#ffce80", "r": "#9a5e1e",
         "b": "#3a3326", "e": "#5fe0c4", "E": "#c4fff0", "q": "#f3c63a"}


# ── tiny pixel helper ─────────────────────────────────────────────────────────
def _stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings). '.' = transparent."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


# ── the OPS BLOCKHOUSE — a clean low modern ground-station block ──────────────
# A low, wide, pale block. Headroom above (small h, dropped top) reserved for the
# orbital ring + satellite + falling raster tiles.
BLOCK = Box(top=(30, 30), wx=11, wy=9, h=12)

# SIGNATURE orbital ground-track ring geometry (single source of truth so the
# upgrade stages can recompute the ring + satellite from the SAME numbers the base
# uses — never a hardcoded second guess). Used by orbital_ring() (base) and by the
# t4 second-ring / t5 coverage-swath stages.
RING_CX, RING_CY = 28, 13
RING_RX, RING_RY = 16, 6
SAT_ANGLE_DEG = 38         # where the satellite rides the front arc


def blockhouse(c, b):
    """The clean low ops blockhouse: smooth M/L walls (paler than the rugged
    siblings), a flat L roof deck, a thin o trim line under the roof, and a couple
    of weatherproof TerraBase instruments on the deck."""
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # thin o trim line wrapping under the roof eave on both visible faces
    c.line(b.left_pt(0.02, 1.4), b.left_pt(0.98, 1.4), "o")
    c.line(b.right_pt(0.02, 1.4), b.right_pt(0.98, 1.4), "r")

    # a clean L roof deck: a brighter inset panel + a faint d seam grid so it reads
    # as a flat modern deck the screen-stand bolts onto (not a plain lavender lid)
    c.fill_poly([b.roof_pt(0.16, 0.16), b.roof_pt(0.84, 0.16),
                 b.roof_pt(0.84, 0.84), b.roof_pt(0.16, 0.84)], "L")
    c.line(b.roof_pt(0.16, 0.5), b.roof_pt(0.84, 0.5), "M")
    c.line(b.roof_pt(0.5, 0.16), b.roof_pt(0.5, 0.84), "M")

    # a small weatherproof instrument crate on the back-left of the deck (TerraBase
    # field gear): a tiny M/D box with an o handle
    ip = b.roof_pt(0.30, 0.74)
    ix, iy = int(round(ip[0])), int(round(ip[1]))
    _stamp(c, ix - 1, iy - 3, [
        ".MM.",
        "MLLM",
        "MMMM",
        "KDDK",
    ])
    c.set(ix, iy - 4, "o")  # handle/antenna nub
    return b


# ── the TILTED ROOFTOP DISPLAY SCREEN on a D/K A-frame stand ──────────────────
def tilted_screen(c, b):
    """A big flat rectangular display SCREEN propped on a D/K A-frame stand on the
    roof, tilted back (top edge leaning away, face angled up-and-toward-viewer). The
    K-framed face is the signature raster terrain map. Returns the four screen-face
    corners (top-left, top-right, bot-right, bot-left in screen space) so the map +
    tiles + decode bar paint onto it. Clearly an angled SCREEN, not a parabolic dish."""
    # anchor the stand near the back-center of the roof deck
    base = b.roof_pt(0.46, 0.40)
    bx, by = base[0], base[1]

    # --- A-FRAME STAND: two D legs splaying down to the deck, a K cross-strut ---
    # the screen's bottom edge rides on top of the stand
    sbx = bx                    # stand top (screen pivot) x
    sby = by - 9                # stand top y (screen sits ~9px above deck)
    # left + right legs of the A-frame
    c.line((sbx, sby), (sbx - 4, by + 1), "D")
    c.line((sbx, sby), (sbx + 4, by + 1), "d")
    c.line((sbx - 1, sby), (sbx - 5, by + 1), "K")   # left leg shadow edge
    c.line((sbx + 1, sby), (sbx + 5, by + 1), "K")   # right leg shadow edge
    c.line((sbx - 3, by - 3), (sbx + 3, by - 3), "K")  # cross-strut
    # leg feet on the deck
    c.set(sbx - 4, by + 1, "K"); c.set(sbx + 4, by + 1, "K")

    # a small D cable run feeding the screen from the blockhouse (down the back leg)
    c.line((sbx + 4, by + 1), (sbx + 6, by + 3), "d")
    c.set(sbx + 6, by + 4, "K")

    # --- the SCREEN SLAB itself: a wide rectangle TILTED BACK ---
    # We define the four corners directly in screen space so the panel reads as a
    # flat slab leaning away: the TOP edge is higher AND further back (smaller y,
    # offset right toward the far corner); the BOTTOM edge sits on the stand top.
    # Width runs left->right; the tilt skews the top edge up-and-back.
    W = 19          # screen width (px, left->right)
    TILT_UP = 13    # how far the top edge rises above the bottom edge
    TILT_BACK = 4   # horizontal skew of the top edge (lean-back parallax)

    # bottom edge (rests on stand top)
    bl = (sbx - W // 2, sby)              # bottom-left
    br = (sbx + W // 2, sby + 2)          # bottom-right (slightly lower => 2:1 iso slant)
    # top edge (raised + skewed back-right)
    tl = (bl[0] + TILT_BACK, bl[1] - TILT_UP)        # top-left
    tr = (br[0] + TILT_BACK, br[1] - TILT_UP)        # top-right

    # back/edge thickness of the slab (a thin K rim on the lower-left so it has body)
    # K outer frame fill first (the bezel)
    c.fill_poly([tl, tr, br, bl], "K")

    # inset the face a touch for the bezel, then fill it the dark screen base
    def lerp(a, p, q):
        return (p[0] + a * (q[0] - p[0]), p[1] + a * (q[1] - p[1]))

    def face_pt(u, v):
        """u: left(0)->right(1) across the screen, v: bottom(0)->top(1)."""
        bot = lerp(u, bl, br)
        top = lerp(u, tl, tr)
        return lerp(v, bot, top)

    # inset face corners (bezel margin)
    inset = [face_pt(0.06, 0.10), face_pt(0.94, 0.10),
             face_pt(0.94, 0.92), face_pt(0.06, 0.92)]
    c.fill_poly(inset, "d")          # dark screen substrate (false-color void)

    # a thin K side rim on the lower-left edge gives the slab thickness (a screen,
    # not paper): a 1px K offset below the bottom-left edge
    c.line((bl[0] - 1, bl[1] + 1), (br[0] - 1, br[1] + 1), "K")
    c.line((bl[0] - 1, bl[1] + 1), (tl[0] - 1, tl[1] + 1), "K")

    return face_pt


# ── WHIP ANTENNA — a thin downlink whip with a c blink (NOT a dish) ───────────
def whip_antenna(c, b):
    """A thin D whip antenna rising from the back corner of the deck with a c blink
    at the tip — a downlink antenna (weatherproof TerraBase instrument), not a dish."""
    # back-LEFT corner of the deck — clear of the centred screen so it stays visible
    ap = b.roof_pt(0.18, 0.30)
    ax, ay = int(round(ap[0])), int(round(ap[1]))
    # a tiny base mount + the thin whip rising up-left
    c.set(ax, ay, "K")
    c.line((ax, ay), (ax - 2, ay - 12), "D")
    c.line((ax - 1, ay - 1), (ax - 3, ay - 12), "M")   # lit edge of the whip
    c.set(ax - 3, ay - 13, "c")                        # c blink at the tip
    c.set(ax - 2, ay - 13, "h")                        # blink glint
    c.set(ax - 3, ay - 12, "g")


# ── SIGNATURE pt.1: tilted orbital GROUND-TRACK RING + circling satellite ─────
def orbital_ring(c, b):
    """A thin tilted c/g orbital ground-track ellipse hovering over the hub, faint
    K shading on its far (back) side, with a tiny W/O satellite cube (o solar wings)
    traveling along it. Clearly a RING, not a parabolic dish. Returns the satellite
    screen position so the beamed tiles cascade from it."""
    # ring centre well above the blockhouse, in the reserved headroom. Shift the
    # centre LEFT and narrow the X-radius so the ring's FAR (right) arc runs OFF the
    # right screen frame instead of tangling with the screen's top-right K corner.
    cx, cy = RING_CX, RING_CY
    rx, ry = RING_RX, RING_RY     # wide flat tilted ellipse (a ground-track loop seen at angle)

    # paint the ring as a 1px ellipse; the BACK half (upper arc) is faint G/g, the
    # FRONT half (lower arc) is brighter c/g so it reads as a tilted loop. SKIP the
    # right-most arc samples so the ellipse visibly runs off the screen frame and the
    # ring/screen-edge no longer merge (a clean closed orbit passing BEHIND the screen).
    for a in range(0, 360, 4):
        rad = math.radians(a)
        x = cx + rx * math.cos(rad)
        y = cy + ry * math.sin(rad)
        if x > 44:                         # far-right arc — let it run off-frame
            continue
        if math.sin(rad) < -0.2:          # back/upper arc — faint
            c.set(x, y, "G")
        else:                              # front/lower arc — brighter
            c.set(x, y, "c" if (a // 4) % 2 == 0 else "g")

    # the SATELLITE riding the front arc on the right side (so it can beam down-left
    # onto the roof screen). Sits clear ABOVE the front arc so its body + wings read
    # as a discrete cube, not merged into the ring line.
    sat_a = math.radians(SAT_ANGLE_DEG)
    sx = int(round(cx + rx * math.cos(sat_a)))
    sy = int(round(cy + ry * math.sin(sat_a))) - 3   # lift it clear above the arc
    # A tight, discrete K-OUTLINED satellite glyph: a 2x2 W/O body with one o solar
    # wing on each side, the WHOLE thing wrapped in a crisp 1px K outline so it pops
    # off the ring's c/g arc behind it — obviously a satellite, never a smear.
    # Stamped as one explicit little sprite (K = outline, . = transparent):
    #          x offsets:  -4 -3 -2 -1  0  1  2  3  4
    _stamp(c, sx - 4, sy - 2, [
        "...K.cK..",    #  sensor nub on top of the body
        "..KKKKKK.",    #  body top frame
        ".KoKWOKoK",    #  L-wing(o) | body-top(W,O) | R-wing(o), all K-boxed
        ".KoKOWKoK",    #  L-wing(o) | body-bot(O,W) | R-wing(o)
        "..KKKKKK.",    #  body bottom frame
    ])
    return (sx, sy + 3)             # emitter point (just below the body)


# ── SIGNATURE pt.2: cascading false-color RASTER TILES beamed to the screen ───
def beamed_tiles(c, sat, face_pt):
    """A slanted cascade of small c/g/o false-color square raster TILES streaming
    from the satellite down to the rooftop screen — a diagonal dotted beam of pixel
    tiles falling toward the decode. They mix teal + amber false-color."""
    sx, sy = sat
    # target = the loose (upper-right) zone of the screen face where tiles land
    tp = face_pt(0.72, 0.78)
    tx, ty = tp[0], tp[1]

    # a clearly DOTTED diagonal beam of a few discrete single-pixel false-color CHIPS
    # falling from the satellite down to the screen, with visible GAPS between them so
    # it reads as falling tiles, not a smear. Color biases AMBER (o/O) up near the
    # satellite and shifts to TEAL (c/g) as it nears the screen — the eye traces the
    # beam down into the decode.
    chips = ["O", "o", "c", "g", "c"]    # amber -> teal down the beam
    n = len(chips)
    for k in range(n):
        t = (k + 1) / (n + 1)
        x = sx + t * (tx - sx)
        y = sy + t * (ty - sy)
        xi, yi = int(round(x)), int(round(y))
        # one discrete 2px-wide false-color chip with a single K shadow corner so it
        # reads as a falling image-tile — chips are spaced apart along the beam so the
        # cascade stays a clean dotted line, not a smear.
        c.set(xi, yi, chips[k])
        c.set(xi + 1, yi, chips[k])
        c.set(xi, yi + 1, "K")


# ── SIGNATURE pt.3: the RESOLVING terrain MAP on the tilted screen face ───────
def terrain_map(c, face_pt):
    """On the tilted screen face the tiles assemble into a false-color terrain MAP.
    To read clearly at 64px it is split by a single diagonal DECODE FRONT: the
    lower-LEFT half is a clean RESOLVED false-color map (solid blocky g/G/o/r
    regions with a winding c river); the upper-RIGHT half is still LOOSE — dark d
    voids with only a few sparse raw tiles scattered. A bright h/O wavefront traces
    the decode front, and a tiny c DECODE bar along the bottom frame fills g->O."""
    def quad(u0, u1, v0, v1, ch):
        """Fill a solid region of the screen face in (u,v) space."""
        c.fill_poly([face_pt(u0, v0), face_pt(u1, v0),
                     face_pt(u1, v1), face_pt(u0, v1)], ch)

    # The DECODE FRONT is a single diagonal from screen bottom-right up to top-left;
    # everything to its LOWER-LEFT is the RESOLVED clean map, everything UPPER-RIGHT
    # is still loose/dark. We build the resolved map as a few SOLID false-color
    # bands clipped under that diagonal so it reads as a coherent terrain map.

    # 1. RESOLVED MAP — solid false-color terrain in the lower-left wedge. Paint big
    #    blocks, then carve the diagonal decode front by overpainting the upper-right
    #    triangle back to the dark substrate. All bands start at u>=0.12 (inside the
    #    bezel) so the map never bleeds onto the screen's left K frame.
    quad(0.12, 0.62, 0.10, 0.40, "g")     # mid terrain (green) lower band
    quad(0.12, 0.50, 0.10, 0.24, "o")     # warm lowland (amber) at the very bottom
    quad(0.12, 0.30, 0.10, 0.18, "r")     # a r lowland patch bottom-left
    quad(0.12, 0.46, 0.40, 0.66, "G")     # cool upland / water (dark teal) upper band
    quad(0.40, 0.62, 0.30, 0.52, "g")     # a green spur reaching up-right

    # 2. carve the DIAGONAL DECODE FRONT: overpaint the still-loose UPPER-RIGHT
    #    triangle back to dark substrate (d). The hypotenuse runs from bottom-right
    #    (u~0.66,v~0.10) up to top-left (u~0.10,v~0.92).
    c.fill_poly([face_pt(0.66, 0.10), face_pt(0.96, 0.10),
                 face_pt(0.96, 0.92), face_pt(0.10, 0.92)], "d")

    # 3. the GLOWING RESOLVED EDGE — a bright h/O wavefront along the decode front
    front = [(0.62, 0.12), (0.55, 0.26), (0.48, 0.40), (0.40, 0.54),
             (0.33, 0.66), (0.24, 0.80)]
    for i, (u, v) in enumerate(front):
        p = face_pt(u, v)
        c.set(int(round(p[0])), int(round(p[1])), "O" if i % 2 == 0 else "h")
        p2 = face_pt(u + 0.04, v)
        c.set(int(round(p2[0])), int(round(p2[1])), "h")

    # 4. a winding bright c RIVER threading the RESOLVED map (a legible feature)
    river = [(0.14, 0.18), (0.20, 0.30), (0.26, 0.42), (0.30, 0.54), (0.26, 0.62)]
    for u, v in river:
        p = face_pt(u, v)
        c.set(int(round(p[0])), int(round(p[1])), "c")

    # 5. a few discrete LOOSE raster tiles still floating in the dark upper-right
    #    zone (not yet decoded), as small bright chips
    for (u, v, ch) in [(0.78, 0.40, "o"), (0.84, 0.58, "c"), (0.72, 0.62, "g"),
                       (0.88, 0.72, "O"), (0.80, 0.80, "c")]:
        p = face_pt(u, v)
        c.set(int(round(p[0])), int(round(p[1])), ch)

    # 6. a literal "DECODE" PROGRESS BAR along the BOTTOM screen frame: a single
    #    CONTIGUOUS 1px-tall horizontal run sitting just above the bottom bezel so it
    #    reads clearly at 64px (not buried in the resolved map). The filled portion
    #    fills g->O left-to-right with a bright O leading tip; the rest is empty G.
    #    A 1px K underline beneath it seats the bar onto the frame as a discrete cue.
    BAR_N = 12          # samples across the bar (contiguous, no gaps)
    BAR_FILL = 7        # how many are "filled" (decode progress ~60%)
    bar_pts = []
    for k in range(BAR_N):
        u = 0.13 + k * (0.74 / (BAR_N - 1))      # span the inner face width
        p = face_pt(u, 0.12)                      # just above the bottom bezel
        px_, py_ = int(round(p[0])), int(round(p[1]))
        bar_pts.append((px_, py_))
        if k < BAR_FILL - 1:
            c.set(px_, py_, "g")                  # filled body
        elif k == BAR_FILL - 1:
            c.set(px_, py_, "O")                  # bright leading edge of the fill
        else:
            c.set(px_, py_, "G")                  # empty (still-to-decode) track
    # a thin K underline directly below the bar seats it as a discrete UI element
    for (px_, py_) in bar_pts:
        c.set(px_, py_ + 1, "K")

    # 7. RE-SEAT a clean continuous 1px K LEFT frame edge for the slab so the tilted
    #    rectangle silhouette is unbroken — overpaint the bezel's left run in solid K
    #    so no resolved-map / loose tile bleeds past the screen's left frame.
    for vv in range(0, 21):
        v = vv / 20.0
        p = face_pt(0.06, 0.06 + v * 0.88)
        c.set(int(round(p[0])), int(round(p[1])), "K")


# ── the GLOWING control-room opening on the SHADED RIGHT face ─────────────────
def right_opening(c, b):
    """The hero: the interpretation control room on the block's SHADED RIGHT face —
    a wide K-framed glass window (banks of c/g monitor light over a warm o/O
    interior, h reflection) + a glass door, made to GLOW so it reads on the shaded
    side. Drawn AFTER the block (front face)."""
    pt = b.right_pt
    # --- wide GLOWING control-room WINDOW (banks of monitors) ---
    wu0, wu1, wv0, wv1 = 0.08, 0.58, 2.6, b.h - 1.2
    c.fill_poly([pt(wu0, wv0), pt(wu1, wv0), pt(wu1, wv1), pt(wu0, wv1)], "K")   # frame
    c.fill_poly([pt(wu0 + 0.04, wv0 + 0.6), pt(wu1 - 0.04, wv0 + 0.6),
                 pt(wu1 - 0.04, wv1 - 0.4), pt(wu0 + 0.04, wv1 - 0.4)], "g")     # glass
    # warm o/O interior glow bleeding up from the floor (the lit control room)
    c.fill_poly([pt(wu0 + 0.07, wv1 - 3.4), pt(wu1 - 0.07, wv1 - 3.4),
                 pt(wu1 - 0.07, wv1 - 0.4), pt(wu0 + 0.07, wv1 - 0.4)], "o")
    c.line(pt(wu0 + 0.07, wv1 - 0.7), pt(wu1 - 0.07, wv1 - 0.7), "O")            # bright sill
    # banks of c/h monitor light across the upper window (rows of screens)
    for vv in (wv0 + 1.4, wv0 + 2.8, wv0 + 4.2):
        c.line(pt(wu0 + 0.10, vv), pt(wu1 - 0.10, vv), "c")
    c.line(pt(wu0 + 0.10, wv0 + 1.4), pt(wu0 + 0.40, wv0 + 1.4), "h")           # bright monitor
    c.line(pt(wu0 + 0.5, wv0 + 1.0), pt(wu0 + 0.5, wv1 - 1.0), "G")             # mullion
    c.line(pt(wu0 + 0.12, wv0 + 1.0), pt(wu0 + 0.12, wv1 - 2.0), "h")           # h reflection

    # --- a glowing glass DOOR alongside (right of the window) ---
    du0, du1, dv0, dv1 = 0.66, 0.92, 3.6, b.h - 0.2
    c.fill_poly([pt(du0, dv0), pt(du1, dv0), pt(du1, dv1), pt(du0, dv1)], "K")  # frame
    c.fill_poly([pt(du0 + 0.04, dv0 + 0.5), pt(du1 - 0.04, dv0 + 0.5),
                 pt(du1 - 0.04, dv1), pt(du0 + 0.04, dv1)], "c")                # glass leaf
    c.line(pt(du0 + 0.04, dv0 + 1.0), pt(du1 - 0.04, dv0 + 1.0), "h")          # top glint
    c.line(pt(du0 + 0.1, dv1 - 0.3), pt(du1 - 0.1, dv1 - 0.3), "o")            # warm foot glow

    # --- soft warm glow pooling on the ground in front of the lit right face ---
    base_pt = pt(0.5, b.h)
    gx, gy = int(round(base_pt[0])), int(round(base_pt[1]))
    for dx in range(-3, 6):
        c.set(gx + dx, gy + 2, "o" if abs(dx) < 3 else "r")
    c.set(gx, gy + 3, "o")


# ── plainer LIT-LEFT face: a clean wall + one c ribbon window + a door ─────────
def left_detail(c, b):
    """Keep the LIT-LEFT face plainer per the blueprint: a clean M wall with one
    c ribbon window and a simple door, plus a thin sample/data-crate stack at the
    foot (TerraBase data crates)."""
    pt = b.left_pt
    # ONE clean continuous c ribbon window high on the lit face — a single tidy band
    # (no mullions chopping it into speckle) so the LIT-LEFT face stays plainer and
    # the contrast against the GLOWING multi-pane right control room stays sharp.
    b.window(c, "left", 0.16, 0.60, 3.2, 6.2, glass="c", hi="h", shade="G", mullions=0)
    # a simple closed door toward the front-left
    du0, du1, dv0, dv1 = 0.70, 0.92, 4.4, b.h - 0.2
    c.fill_poly([pt(du0, dv0), pt(du1, dv0), pt(du1, dv1), pt(du0, dv1)], "K")
    c.fill_poly([pt(du0 + 0.05, dv0 + 0.5), pt(du1 - 0.05, dv0 + 0.5),
                 pt(du1 - 0.05, dv1), pt(du0 + 0.05, dv1)], "D")
    c.line(pt(du0 + 0.05, dv0 + 1.0), pt(du1 - 0.05, dv0 + 1.0), "M")
    c.set(int(round(pt(du0 + 0.2, (dv0 + dv1) / 2)[0])),
          int(round(pt(du0 + 0.2, (dv0 + dv1) / 2)[1])), "o")   # handle

    # a small stack of TerraBase sample/data CRATES at the lit-left foot
    cp = pt(0.30, b.h + 0.2)
    cx, cy = int(round(cp[0])), int(round(cp[1]))
    _stamp(c, cx - 1, cy - 3, [
        "MLLM",
        "MMMM",
        "KDDK",
    ])
    c.set(cx, cy - 4, "o")   # a c/o label tag
    c.set(cx + 1, cy - 4, "c")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS ground-station /
# orbital-sensing structure onto the prior form — never restarts, never recolors the
# whole building. Theme: the lone ops hub grows into a fully-instrumented multi-ring
# downlink station. Colours mature stage by stage; gold (q) is a t5 flourish only.
# Every add is anchored to a base part (deck corner / eave / right wall / screen
# stand / the SIGNATURE ring itself) and clamped on-canvas, and NONE occlude the hero
# tilted SCREEN face (overhead rings are clipped where they cross the screen quad so
# they pass cleanly BEHIND it) nor smother the orbital ring + satellite.
#
#   t2  small functional add : 2nd whip antenna + c telemetry-bead eave ring + O node
#   t3  structural add        : a b-housed ground-station DISH ANNEX off the right wall
#   t4  major add             : a 2nd larger inclined SCAN-RING + glowing e sensor pod
#   t5  crowning feature      : E global-coverage SWATH + e data pulses + E downlink
#                               node + q gold dish rim & antenna finial
# ═══════════════════════════════════════════════════════════════════════════════

# screen-face quad (bottom-left, bottom-right, top-right, top-left in screen space),
# recomputed from the SAME numbers tilted_screen() uses so the overhead-ring clip
# lands exactly on the real screen slab (never a hardcoded second guess).
def _screen_quad(b):
    base = b.roof_pt(0.46, 0.40)
    sbx, sby = base[0], base[1] - 9
    W, TILT_UP, TILT_BACK = 19, 13, 4
    bl = (sbx - W // 2, sby)
    br = (sbx + W // 2, sby + 2)
    tl = (bl[0] + TILT_BACK, bl[1] - TILT_UP)
    tr = (br[0] + TILT_BACK, br[1] - TILT_UP)
    return [bl, br, tr, tl]


def _in_quad(px, py, quad, pad=1.0):
    """True if (px,py) lies inside the (optionally padded) convex screen quad — used
    to hide overhead ring/swath samples that cross the screen face so the ring reads
    as passing BEHIND the hero screen instead of painting over it."""
    cx = sum(p[0] for p in quad) / 4.0
    cy = sum(p[1] for p in quad) / 4.0
    qpad = [(p[0] + (p[0] - cx) * (pad / 10.0), p[1] + (p[1] - cy) * (pad / 10.0)) for p in quad]
    inside = False
    n = len(qpad)
    for i in range(n):
        ax, ay = qpad[i]
        bx, by = qpad[(i + 1) % n]
        if (ay > py) != (by > py):
            xint = ax + (py - ay) / (by - ay) * (bx - ax)
            if px < xint:
                inside = not inside
    return inside


# the SIGNATURE satellite body bbox (recomputed from the SAME numbers orbital_ring()
# uses to stamp it) — a protect-zone so the t4 second ring + t5 coverage swath never
# paint over / recolor the hero satellite (they pass behind it).
def _sat_box():
    sat_a = math.radians(SAT_ANGLE_DEG)
    sx = int(round(RING_CX + RING_RX * math.cos(sat_a)))
    sy = int(round(RING_CY + RING_RY * math.sin(sat_a))) - 3
    return sx - 5, sy - 3, sx + 5, sy + 3      # 1px-padded body bbox (x0,y0,x1,y1)


def _blocked(px, py, quad):
    """True if (px,py) must NOT be drawn over by an overhead ring/swath sample —
    i.e. it falls on the hero SCREEN face or the hero SATELLITE body, so the overhead
    geometry passes cleanly BEHIND both signature elements."""
    if _in_quad(px, py, quad, pad=1.2):
        return True
    x0, y0, x1, y1 = _sat_box()
    return x0 <= px <= x1 and y0 <= py <= y1


def stage2_telemetry(c, b):
    """t2 — SMALL FUNCTIONAL ADD: the hub gains a 2nd downlink instrument. A second
    thin K WHIP ANTENNA rises off the back-RIGHT deck corner (mirroring the existing
    back-left whip) topped with an o tip BEACON; a faint c TELEMETRY-BEAD ring is
    dotted along the lit-left roof EAVE trim (the closest 'drum rim' on this block);
    and one node of the SIGNATURE orbital ring is brightened to O (a live telemetry
    ping). Modest, on-theme, base palette + a brightened O. Anchored on the deck +
    eave + the ring, well clear of the centre screen + satellite."""
    # --- 2nd whip antenna on the back-RIGHT deck corner — rises up-RIGHT into the
    #     CLEAR right-side space (past the screen's right frame x~42 and below the
    #     satellite), mirroring the base back-left whip so it reads as a second mast,
    #     not a stray beacon. A small K base mount + a thin D mast w/ lit M edge + an
    #     o/O tip BEACON. ---
    ap = b.roof_pt(0.82, 0.74)                 # back-right deck corner (~43,41)
    ax, ay = int(round(ap[0])), int(round(ap[1]))
    c.set(ax, ay, "K")                          # base mount on the deck
    c.set(ax + 1, ay, "d")                      # tiny mount shadow
    top = (min(ax + 4, 48), ay - 12)            # leans up-RIGHT into clear sky, clamped
    c.line((ax, ay), top, "D")                  # mast core
    c.line((ax + 1, ay - 1), (top[0] + 1, top[1]), "M")   # lit edge of the whip
    c.set(top[0], top[1] - 1, "o")              # o tip BEACON (warm downlink blink)
    c.set(top[0] + 1, top[1] - 1, "O")          # bright beacon core
    c.set(top[0] + 1, top[1], "r")              # warm under-glow on the mast tip

    # --- faint c TELEMETRY-BEAD ring dotted along the lit-left roof EAVE trim line ---
    # ride the existing o eave trim (left_pt(.,1.4)); space the beads so it reads as a
    # rim of running telemetry lights, not a solid bar.
    for u in (0.16, 0.34, 0.52, 0.70, 0.88):
        p = b.left_pt(u, 1.4)
        c.set(int(round(p[0])), int(round(p[1])), "c")
    # one brighter h bead so the telemetry rim has a live pulse
    p = b.left_pt(0.52, 1.4)
    c.set(int(round(p[0])), int(round(p[1])), "h")

    # --- brighten ONE orbital-ring node to O (a live telemetry ping on the signature
    #     ring's bright FRONT arc, on the LEFT side well clear of the satellite) ---
    a = math.radians(150)
    nx = RING_CX + RING_RX * math.cos(a)
    ny = RING_CY + RING_RY * math.sin(a)
    c.set(int(round(nx)), int(round(ny)), "O")
    c.set(int(round(nx)), int(round(ny)) - 1, "h")   # tiny glint above the pinged node


def stage3_dish_annex(c, b):
    """t3 — STRUCTURAL ADD: a ground-station DISH ANNEX bolted onto the SHADED RIGHT
    wall, growing the hub sideways-right. A small b-housed (deep basalt) box mass
    seats against the right wall foot and carries a tilted L/D parabolic DISH cup on a
    short post, aimed up-right at the sky, with a g feed-horn glint. A real new
    structural mass (a boxed annex + dish), distinct from the rooftop screen and from
    the Operations Hub's stand-alone dish. Introduces the matured `b` tone. Stays
    fully on-canvas (right edge clamped < 63) and below/right of the screen."""
    # annex box: seated against the lower SHADED-RIGHT wall, projecting toward +x. Its
    # back-top corner sits on the right wall a little below the eave so it reads as a
    # lean-to annex, not a second tower.
    ax0, ay0 = 52, 44                           # back-top corner against the right wall
    annex = Box(top=(ax0, ay0), wx=4, wy=2, h=6)
    # deep-basalt housing: b walls, D shaded face, M lit-ish roof so it reads as a new
    # cool structural mass distinct from the warm M/L blockhouse.
    annex.draw(c, roof="M", lwall="b", rwall="D", roof_hi="L", outline="K")
    # a small g equipment-status window on the annex lit (left) face
    annex.window(c, "left", 0.22, 0.78, 1.6, 3.6, glass="g", hi="h", shade="G", mullions=0)
    # a couple of d seam lines on the basalt face for paneling
    for u in (0.4, 0.7):
        c.line(annex.left_pt(u, 0.8), annex.left_pt(u, 5.2), "d")

    # --- the parabolic DISH on a short post rising off the annex roof, aimed up-right.
    #     A small tilted ellipse CUP: L lit face / D shaded back, with a g feed glint
    #     on a short K feed-arm. Anchored ON the annex roof (visible plinth) so it is
    #     never an unmoored rooftop blob. ---
    dp = annex.roof_pt(0.5, 0.45)
    dmx, dmy = int(round(dp[0])), int(round(dp[1]))
    post_top = dmy - 4
    c.line((dmx, dmy), (dmx, post_top), "b")     # short dish post on the annex roof
    c.line((dmx + 1, dmy), (dmx + 1, post_top), "d")
    c.set(dmx, dmy, "K")                         # post foot on the roof
    # dish cup tilted up-right: a small ellipse (4 wide), lit L upper-left / D lower
    # back, clamped so its right rim stays < 63.
    cxn = min(dmx, 58)
    _stamp(c, cxn - 1, post_top - 3, [
        ".LL.",
        "LLMD",
        "DMDD",
        ".DD.",
    ])
    c.set(cxn + 1, post_top - 2, "g")            # g feed-horn glint at the dish centre
    c.set(cxn + 3, post_top - 4, "K")            # K feed-horn arm tip reaching up-right
    c.set(cxn + 2, post_top - 3, "d")            # feed-arm shaft
    # ground contact shadow under the annex so it seats on the earth
    for dx in range(-1, 6):
        c.set(int(round(annex.w_front[0])) + dx, int(round(annex.w_front[1])) + 1, "K")


def _second_ring_geom():
    """Shared geometry for the t4 SECOND scan-ring (and the t5 swath that nests
    between the two rings), so t5 recomputes from the SAME source as t4. A larger,
    STEEPER/more-upright ellipse at a different tilt than the flat base ring, centred
    a touch lower-right so it visibly CROSSES the base ring. Returns (cx, cy, rx, ry)."""
    return RING_CX + 4, RING_CY + 3, 12, 10      # (32, 16, 12, 10)


def stage4_second_ring(c, b):
    """t4 — MAJOR ADD: a SECOND, larger inclined SCAN-RING crossing the first — a wide
    e-lit orbital ground-track loop at a STEEPER tilt than the flat base ring, sweeping
    up over the rooftop mast/screen so the hub now reads as a denser multi-ring sensing
    constellation. A glowing e SENSOR POD rides its upper-left arc. The prominent new
    overhead mass. Palette matures: energized teal e/E on the ring + a deep b mast
    COLLAR clamping it onto the screen stand. The ring is CLIPPED where it crosses the
    screen quad so it passes cleanly BEHIND the hero screen; its near (front/lower) arc
    reads brighter (e) and its far (back/upper) arc fainter (G), and it never runs
    off-canvas (samples beyond the frame are dropped)."""
    quad = _screen_quad(b)
    cx, cy, rx, ry = _second_ring_geom()
    # --- deep-basalt MAST COLLAR seating the new ring on the screen stand. The screen
    #     A-frame stand top is the anchor; a short b collar + 2 stay struts tie the
    #     ring's lower crossing to the structure so the overhead ring is moored. ---
    base = b.roof_pt(0.46, 0.40)
    sbx, sby = int(round(base[0])), int(round(base[1] - 9))
    _stamp(c, sbx - 1, sby - 2, [
        "KbK",
        "bbb",
        "KbK",
    ])
    c.set(sbx, sby - 3, "b")                     # collar neck rising toward the ring
    c.set(sbx, sby - 4, "D")

    # --- the second scan-ring itself (steeper tilted ellipse). Draw the BACK (upper)
    #     arc first faint, then the FRONT (lower) arc brighter, clipping screen-crossing
    #     samples so it ducks behind the screen. ---
    for a in range(0, 360, 6):
        rad = math.radians(a)
        x = cx + rx * math.cos(rad)
        y = cy + ry * math.sin(rad)
        if not (0 <= x <= 63 and 0 <= y <= 63):
            continue                            # never run off-canvas
        if _blocked(x, y, quad):
            continue                            # duck BEHIND the hero screen + satellite
        if math.sin(rad) < -0.1:                # back/upper arc — faint cool teal
            c.set(x, y, "G" if (a // 6) % 2 == 0 else "e")
        else:                                   # front/lower arc — brighter energized
            c.set(x, y, "e" if (a // 6) % 2 == 0 else "E")

    # --- glowing e SENSOR POD riding the ring's UPPER-LEFT arc (clear of screen +
    #     satellite + the base ring's busy right side). A tight K-outlined pod with a
    #     bright E core + tiny e fins, anchored ON the ring line. ---
    pa = math.radians(206)
    sx = int(round(cx + rx * math.cos(pa)))
    sy = int(round(cy + ry * math.sin(pa)))
    sx = max(2, sx)
    _stamp(c, sx - 1, sy - 1, [
        "KeK",
        "eEe",
        "KeK",
    ])
    c.set(sx, sy, "E")                          # bright pod core
    c.set(sx - 2, sy, "e")                      # tiny sensing fins off the pod sides
    c.set(sx + 2, sy, "e")
    # a faint e trailing motion tick behind the pod along the ring (it sweeps)
    ta = math.radians(218)
    tx = int(round(cx + rx * math.cos(ta)))
    ty = int(round(cy + ry * math.sin(ta)))
    if 0 <= tx <= 63 and 0 <= ty <= 63 and not _blocked(tx, ty, quad):
        c.set(tx, ty, "e")


def stage5_coverage_swath(c, b):
    """t5 — CROWNING FEATURE = FULLY EVOLVED downlink station. The two scan-rings
    resolve into a glowing GLOBAL-COVERAGE SWATH: a bright E ground-track LATTICE of a
    few meridian + parallel arcs strung BETWEEN the two rings (recomputed from BOTH
    rings' shared geometry), with traveling e DATA PULSES sliding along it and a pulsing
    E DOWNLINK NODE where the swath funnels down toward the dish. The hub is then dressed
    with GOLD premium trim — a gold rim on the t3 parabolic dish and a gold finial on the
    t2 second whip. Reads as an elite, fully-instrumented coverage station, still clearly
    the same remote-sensing hub. All lattice samples are clamped on-canvas and clipped
    off the hero screen quad so the swath arcs cleanly OVER and BESIDE the screen."""
    quad = _screen_quad(b)
    cx2, cy2, rx2, ry2 = _second_ring_geom()

    # --- E ground-track COVERAGE LATTICE: TWO clean bright-E parallel arcs nested
    #     inside the second (steeper) ring, reading as mapped ground-track swathes
    #     (latitude bands), crossed by a few e meridian spokes — a deliberate GRID, not
    #     a teal cloud. Only the UPPER band (arc over the top of the constellation) is
    #     drawn so it crowns the hub above the screen without touching its face. The
    #     two arcs are spaced apart (0.80 / 0.52) so the band reads as a lattice. ---
    for scale, ch in ((0.80, "E"), (0.52, "e")):
        rx = rx2 * scale
        ry = ry2 * scale
        for a in range(154, 387, 10):           # upper coverage band, sparse clean step
            rad = math.radians(a)
            x = cx2 + rx * math.cos(rad)
            y = cy2 + ry * math.sin(rad)
            if not (0 <= x <= 63 and 0 <= y <= 63):
                continue
            if _blocked(x, y, quad):
                continue
            c.set(x, y, ch)
    # e MERIDIAN spokes linking the two parallel arcs (the lattice cross-threads) —
    # short radial ticks from the inner band out to the outer band, top side only, so
    # the grid reads as a lat/long coverage mesh.
    for a in (172, 208, 250, 296, 332):
        rad = math.radians(a)
        x0 = cx2 + (rx2 * 0.52) * math.cos(rad)
        y0 = cy2 + (ry2 * 0.52) * math.sin(rad)
        x1 = cx2 + (rx2 * 0.80) * math.cos(rad)
        y1 = cy2 + (ry2 * 0.80) * math.sin(rad)
        if _blocked(x1, y1, quad) or _blocked(x0, y0, quad):
            continue
        c.line((x0, y0), (x1, y1), "e")

    # --- traveling e DATA PULSES sliding along the coverage swath (a few bright e/E
    #     beads at distinct points on the upper band so it reads as live data moving) ---
    for a in (165, 230, 320):
        rad = math.radians(a)
        x = cx2 + (rx2 * 0.82) * math.cos(rad)
        y = cy2 + (ry2 * 0.82) * math.sin(rad)
        if 0 <= x <= 63 and 0 <= y <= 63 and not _blocked(x, y, quad):
            c.set(int(round(x)), int(round(y)), "E")
            c.set(int(round(x)), int(round(y)) - 1, "e")

    # --- pulsing E DOWNLINK NODE where the swath funnels down toward the dish annex.
    #     Placed clearly BELOW-RIGHT of the hero satellite (not on it) in the open band
    #     between the constellation and the dish, so it reads as the live downlink
    #     focus. A bright W/E core haloed by e. ---
    x0s, y0s, x1s, y1s = _sat_box()
    dx = min(x1s + 2, 49)                       # just right of the satellite bbox
    dy = y1s + 3                                # just below it, toward the dish
    for ox, oy, ch in [(0, 0, "E"), (-1, 0, "e"), (1, 0, "e"), (0, -1, "e"), (0, 1, "E")]:
        c.set(dx + ox, dy + oy, ch)
    c.set(dx, dy, "W")                          # bright pulse core
    # a faint e downlink beam dropping from the node down-right toward the dish annex
    for j, yy in enumerate(range(dy + 2, dy + 9, 2)):
        c.set(min(dx + 1 + j, 50), yy, "e")

    # --- GOLD premium trim (t5 flourish only) -----------------------------------
    # gold RIM on the t3 parabolic dish — recompute the dish centre from the SAME
    # annex geometry stage3 used (never a hardcoded second guess).
    annex = Box(top=(52, 44), wx=4, wy=2, h=6)
    adp = annex.roof_pt(0.5, 0.45)
    admx, admy = int(round(adp[0])), int(round(adp[1]))
    dish_cx = min(admx, 58)
    dish_top = admy - 4 - 3                      # post_top - 3 (the dish cup top row)
    c.set(dish_cx, dish_top, "q")               # gold rim ticks along the dish lip
    c.set(dish_cx + 1, dish_top, "q")
    c.set(dish_cx - 1, dish_top + 1, "O")       # bright gold glint on the rim
    # gold FINIAL capping the t2 second whip tip — recompute from the SAME stage2
    # anchor (roof_pt(0.82,0.74) → mast top), never a hardcoded second guess.
    ap = b.roof_pt(0.82, 0.74)
    wax, way = int(round(ap[0])), int(round(ap[1]))
    wtop = (min(wax + 4, 48), way - 12)
    c.set(wtop[0], wtop[1] - 2, "q")            # gold finial above the beacon
    c.set(wtop[0], wtop[1] - 3, "O")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the remote-sensing hub at upgrade `stage` (1..5). Stage 1 is IDENTICAL
    to the shipped base PNG; each higher stage keeps every prior addition and bolts on
    the next (t2 telemetry → t3 dish annex → t4 second ring → t5 coverage swath + gold).
    Painter's order: the base form + its SIGNATURE (orbital ring + satellite + screen
    map) is composed first; then the dish annex grows off the right wall; then the
    overhead second ring + coverage swath are drawn LAST so they read on top yet are
    CLIPPED off the hero screen face so they pass behind it."""
    c = Canvas()
    b = BLOCK
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    blockhouse(c, b)                 # clean low ops blockhouse (back)
    whip_antenna(c, b)               # thin downlink whip antenna at back-left (behind screen base)
    face_pt = tilted_screen(c, b)    # tilted rooftop SCREEN slab on its A-frame stand
    sat = orbital_ring(c, b)         # SIGNATURE: orbital ground-track ring + satellite
    beamed_tiles(c, sat, face_pt)    # SIGNATURE: cascading false-color raster tiles
    terrain_map(c, face_pt)          # SIGNATURE: resolving terrain map on the screen
    right_opening(c, b)              # GLOWING control room on the SHADED RIGHT face
    left_detail(c, b)                # plainer lit-left wall + ribbon window + crates

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    if stage >= 2:
        stage2_telemetry(c, b)
    if stage >= 3:
        stage3_dish_annex(c, b)
    if stage >= 4:
        stage4_second_ring(c, b)
    if stage >= 5:
        stage5_coverage_swath(c, b)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/terrabase"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "remote-sensing-hub"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped remote-sensing-hub.png, so it does NOT overwrite the
    base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": TERRA, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"terrabase_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"terrabase_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
