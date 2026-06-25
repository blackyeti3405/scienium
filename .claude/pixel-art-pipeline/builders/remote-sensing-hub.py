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
"""
import os
import sys
import json
import math

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box

TERRA = {"K": "#20190f", "W": "#efe6cf", "L": "#d6c8a0", "M": "#b09a6e", "D": "#7e6c47", "d": "#54462c",
         "h": "#d6f2ea", "c": "#a4e2d4", "g": "#34b6a2", "G": "#1d8474",
         "o": "#e0a850", "O": "#ffce80", "r": "#9a5e1e"}


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
    cx, cy = 28, 13
    rx, ry = 16, 6     # wide flat tilted ellipse (a ground-track loop seen at angle)

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
    sat_a = math.radians(38)
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


def build():
    c = Canvas()
    b = BLOCK
    # painter's order
    blockhouse(c, b)                 # clean low ops blockhouse (back)
    whip_antenna(c, b)               # thin downlink whip antenna at back-left (behind screen base)
    face_pt = tilted_screen(c, b)    # tilted rooftop SCREEN slab on its A-frame stand
    sat = orbital_ring(c, b)         # SIGNATURE: orbital ground-track ring + satellite
    beamed_tiles(c, sat, face_pt)    # SIGNATURE: cascading false-color raster tiles
    terrain_map(c, face_pt)          # SIGNATURE: resolving terrain map on the screen
    right_opening(c, b)              # GLOWING control room on the SHADED RIGHT face
    left_detail(c, b)                # plainer lit-left wall + ribbon window + crates

    spec = {"width": 64, "height": 64, "palette": TERRA, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/terrabase_remote-sensing-hub.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
