#!/usr/bin/env python3
"""
Eye Tracking Suite — MindFrame Lab building (BESPOKE form, STANDARD role).

A compact VIEWING BOOTH (carrel): a small Box cabin holding a headrest/seat,
fronted by a big ANGLED stimulus DISPLAY that cantilevers out over the booth on a
short arm, with an eye-tracking camera bar slung beneath it. The angled-screen-on-
an-arm silhouette is a viewing carrel — unlike any flat-faced or towered sibling,
and explicitly NOT a giant eyeball (BioCore owns that). The read is the gaze
PATTERN on a screen; the eye is only implied by the cameras + headrest.

  • Opening side = RIGHT (glowing): the hero is the SHADED-RIGHT-facing big angled
    stimulus display + the booth's right face. The screen GLOWS bright (g/c glass,
    h/O content) so it reads on the shaded side; the headrest sits in its wash. The
    lit-LEFT booth face stays plainer (one small side window + plain wall).
  • Signature (one-of-one): on the angled display, a glowing gaze HEATMAP (warm
    magenta O/o hot-spots grading to cool g/G) over a faint c/M stimulus image, an
    overlaid connected NUMBERED SCAN-PATH of 6 fixation dots (h/W dots, thin o
    saccade lines, tiny O numbers) tracing where the eye jumped, and two IR cameras
    on the under-bar throwing thin o/O magenta beams at a small d viewer head on the
    M/L headrest.

Composed from art/isobuild.{Box} — NO iso.draw_cube / base_windows.
Draw order: contact shadow + booth cabin (back) -> headrest/seat inside -> the
cantilever arm + the big ANGLED display slab -> the gaze heatmap + numbered scan-
path overlay -> the IR camera bar + beams + glints -> the booth's RIGHT glowing
side opening + roof accent (front).

═══════════════════════════════════════════════════════════════════════════════════
MindFrame UPGRADE-EVOLUTION pass (cumulative t2..t5), code pattern + evolved palette
copied from the lab reference interview-room.py. Theme for THIS building: a single
gaze-tracking carrel grows into a panoramic MULTI-SUBJECT GAZE-AGGREGATION SUITE —
it gains gear to read MORE eyes on MORE screens. The signature (the angled display's
heatmap + numbered scan-path) is NEVER occluded: every add grows onto the LEFT (a
second tracking booth), UP off the booth roof (a monitor-rig tower), and BELOW the
screen (a chin-rest desk) — never over the front display face. The evolved glow is
cool SIGNAL-CYAN e/E (gaze-heatmap data), kept distinct from the lab's warm magenta
o/O (the live calibration/IR human accent). Gold (q) is a t5 flourish only.

  t2  small functional add : a desk CHIN-REST + eye-tracker bar prop below the screen
                             + a brighter o/O calibration-dot pip on the display
  t3  structural add       : a second TRACKING-BOOTH ANNEX on the left — a slim dark
                             b hood enclosing a subject screen glowing g from inside
  t4  major add            : a stacked MONITOR-RIG TOWER raising the roofline with twin
                             glowing cyan e/E gaze-heatmap panels (more eyes, more screens)
  t5  crowning feature     : the screen wall becomes a panoramic GAZE-AGGREGATION ARRAY —
                             synced E heatmaps + a fixation-cluster bloom, gold master
                             console + gold hero-screen bezel
"""
import os
import sys
import json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

# Base MindFrame palette (shared keys) + the EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so eye-tracking-suite.png is
# unchanged). These exact evolved keys are shared by all 10 mindframe buildings:
#   b  deep indigo steel — matured structure tone for t3+ new masses
#   e  energized signal-cyan glow (mid)   E  signal-cyan glow (bright) — t4/t5 gaze data
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
MIND = {"K": "#181428", "W": "#e8e2f6", "L": "#cabfe6", "M": "#9f90c8", "D": "#6f5fa0", "d": "#4a3c70",
        "h": "#ecc8f4", "c": "#d0a8ee", "g": "#a45ce0", "G": "#6a2fb0",
        "o": "#f08cce", "O": "#ffb8e2", "r": "#b03a80",
        "b": "#2b2440", "e": "#7fd4ff", "E": "#d6f4ff", "q": "#f3c63a"}


def _stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings) at top-left (x0,y0).
    '.' = skip (transparent)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


# ── 1. CONTACT SHADOW — a soft K iso ellipse grounding the whole booth ────────
def contact_shadow(c):
    scx, scy = 30, 49
    for x in range(scx - 16, scx + 16):
        for y in range(scy - 2, scy + 3):
            ex = (x - scx) / 16.0
            ey = (y - scy) / 2.2
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")


# ── 2. BOOTH CABIN — a compact Box carrel (drawn first, sits back-left) ───────
BOOTH = Box(top=(28, 19), wx=7, wy=7, h=13)


def booth(c, b):
    """The compact viewing-booth cabin: M/D indigo-violet walls, L roof. Drawn
    behind the cantilevered display. The lit-LEFT face stays plainer with one small
    side-light window; the headrest/seat lives inside facing right toward the
    display (added next)."""
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # flat booth roof: a thin D curb ring + a soft o magenta accent strip (MindFrame
    # gentle accent light) running along the lit back edges of the roof diamond.
    c.line(b.r_top, b.r_left, "o")
    c.line(b.r_top, b.r_right, "W")
    # a tidy D curb just inside the roof front edges
    c.line(b.r_left, b.r_front, "D")
    c.line(b.r_front, b.r_right, "d")
    # a thin 1px o roof accent strip at the back-left of the roof (sharpened from the
    # round-0 chunky block per review polish note)
    rp = b.roof_pt(0.28, 0.30)
    _stamp(c, int(round(rp[0])), int(round(rp[1])), [
        "oOo",
    ])

    # --- the plainer LIT-LEFT face: one small side-light window pane ---
    b.window(c, "left", 0.26, 0.56, 3.0, 7.0, glass="g", hi="h", shade="G",
             mullions=0, sheen="W")
    # a clean K sill band + a plain panel groove so the lit face still reads framed
    c.line(b.left_pt(0.10, 10.4), b.left_pt(0.92, 10.4), "d")
    c.line(b.left_pt(0.70, 2.0), b.left_pt(0.70, 11.0), "d")
    return b


# ── 3. HEADREST / SEAT — a small viewer head on a headrest inside the booth ───
def headrest(c, b):
    """A small M/L headrest column with a little d viewer head, set just inside the
    booth's open right side facing the display. Drawn before the display arm so the
    screen + camera beams read as aimed at it. Sits in the shaded-right wash."""
    # anchor at the FRONT-LEFT of the shaded right face, below the cantilevered
    # display so it stays VISIBLE (drawn after the display), in its own clean space
    # left of the glowing booth opening. Seat height on the shaded face.
    # Absolute placement in the booth's OPEN lower-right, clear of the screen bezel
    # and BELOW the camera bar, so the seat reads as its own object. A high-contrast
    # L/W cradle wrapping a round head pops against the D wall (the round-0 M/L
    # headrest camouflaged into the M wall and read as speckle).
    hx, hy = 30, 37
    _stamp(c, hx, hy, [
        ".WLLW.",   # headrest cradle top (bright W/L rim — pops off the D wall)
        "WLddLW",   # cradle (L rim) wraps the round head (dark d silhouette)
        "LMdoML",   # head with the tracked EYE (o glint) catching the IR beam
        "LMddML",   # lower head / cheek
        ".KMMK.",   # chin / jaw (K shadow grounds the head)
        ".DDDD.",   # shoulders / seat back
        "..dd..",   # seat post
    ])
    # the viewer's tracked EYE (bright o glint) — the IR beam target
    eye = (hx + 3, hy + 2)
    return eye   # eye target for the IR beams


# ── 4. CANTILEVER ARM + the big ANGLED stimulus DISPLAY (the hero canvas) ──────
def display(c, b):
    """A big thin ANGLED stimulus slab cantilevered off the front-right of the
    booth on a short M/D arm and raked toward the viewer — a flattened prism tipped
    so its big face glows at the headrest. Returns the screen quad (4 corners) +
    the under-lip endpoints so the heatmap/scan-path overlay and camera bar clip
    cleanly to the tilted face.

    The screen is the SHADED-RIGHT-facing hero: a glowing g/c glass slab. We build
    the bright glass face directly as a tilted parallelogram (a Box.window-style
    glass read: K frame + h sky band at top + G shaded sill + a W/h shine streak),
    NOT a black-barred panel."""
    # --- short cantilever ARM jutting from the booth's front-right roof corner ---
    ap = b.r_front
    ax, ay = int(round(ap[0])), int(round(ap[1]))
    # a stubby M/D arm bracket carrying the display out over the front
    _stamp(c, ax - 1, ay - 1, [
        "MM",
        "Dd",
        "dd",
    ])

    # --- the big ANGLED display slab: a tilted parallelogram leaning toward the
    # viewer. Top edge sits high-right above the booth front; bottom edge swings
    # down-left toward the headrest. Define the four screen corners directly. ---
    # corners (screen px): TL top-left, TR top-right, BR bottom-right, BL bottom-left.
    # Lifted higher so the slab CANTILEVERS over the booth and leaves the booth's
    # lower-right face OPEN below it for the visible headrest + IR cameras.
    # Enlarged the face (wider + taller) so the heatmap + numbered scan-path have
    # room to READ at 64px instead of crushing into noise.
    TL = (27, 12)
    TR = (50, 16)
    BR = (48, 34)
    BL = (25, 28)

    # --- the display's own thin BODY (a D/d casing behind the glass) so the slab
    # reads as a physical screen with DEPTH, not a floating pane — but kept a THIN
    # rim (only the right + bottom edges extruded a couple px) so it does NOT fill
    # the booth's lower-right face; that keeps the headrest + IR cameras visible. ---
    off = (2, 3)
    casBR = (BR[0] + off[0], BR[1] + off[1])
    casTR = (TR[0] + off[0], TR[1] + off[1])
    casBL = (BL[0] + off[0], BL[1] + off[1])
    # right depth strip
    c.fill_poly([TR, BR, casBR, casTR], "d")
    # bottom depth strip
    c.fill_poly([BL, BR, casBR, casBL], "d")
    c.fill_poly([TL, TR, BR, BL], "D")            # casing front bezel (under the glass)

    # --- the GLOWING glass screen, inset inside the bezel ---
    def lerp(p, q, t):
        return (p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1]))

    # inset corners (3% margin all round for the K bezel frame)
    def inset(a, bx, cy, d, m=0.10):
        # bilinear-ish inset toward the centre
        cx = (a[0] + bx[0] + cy[0] + d[0]) / 4.0
        cyy = (a[1] + bx[1] + cy[1] + d[1]) / 4.0
        return (a[0] + (cx - a[0]) * m, a[1] + (cyy - a[1]) * m)

    sTL = inset(TL, TR, BR, BL)
    sTR = inset(TR, BR, BL, TL)
    sBR = inset(BR, BL, TL, TR)
    sBL = inset(BL, TL, TR, BR)

    # CALM dark screen base (d body) over the whole screen — a quiet substrate so
    # the faint stimulus image + the cool->hot heatmap + the scan-path all stay
    # legible on top instead of fighting a busy glass fill. A thin D sill line
    # along the very bottom + a single O corner sheen are the only "glass" tells.
    c.fill_poly([sTL, sTR, sBR, sBL], "d")
    # a THIN 1px D sill line right at the bottom edge (a quiet glazing tell — NOT a
    # big G slab, which previously merged the lower screen into a static block).
    sillTL = lerp(sBL, sTL, 0.07)
    sillTR = lerp(sBR, sTR, 0.07)
    c.line(sillTL, sillTR, "D")
    # a single bright O sheen pip at the top-left screen corner (glass tell / glow)
    sheen = lerp(lerp(sTL, sTR, 0.12), lerp(sBL, sBR, 0.12), 0.10)
    c.set(sheen[0], sheen[1], "O")
    c.set(sheen[0] + 1, sheen[1], "h")

    # clean K bezel frame around the glass + the outer casing outline
    for a, bb in [(sTL, sTR), (sTR, sBR), (sBR, sBL), (sBL, sTL)]:
        c.line(a, bb, "K")
    for a, bb in [(TL, TR), (TR, BR), (BR, BL), (BL, TL)]:
        c.line(a, bb, "K")
    # casing depth edges (right + bottom, the shaded sides)
    c.line(TR, casTR, "K")
    c.line(BR, casBR, "K")
    c.line(BL, casBL, "K")
    c.line(casTR, casBR, "K")
    c.line(casBR, casBL, "K")

    return (sTL, sTR, sBR, sBL, BL, BR)


# ── 5. SIGNATURE A — gaze HEATMAP over a faint stimulus image on the screen ───
# 5 fixations spread WIDE across the screen (using its full extent) so the jumps
# between them are clearly diagonal — a legible zig-zag VIEWING ORDER, not cramped
# near-horizontal streaks.
# v steps monotonically downward (each dot on its OWN row — no two share a row, so
# every saccade segment is a clear DIAGONAL, never a horizontal streak) while u
# alternates left<->right for a readable top-to-bottom zig-zag reading order.
FIX_UV = [
    (0.16, 0.06),   # 1 — START (top-left, over the face) — row ~15
    (0.82, 0.30),   # 2 — jump down-right                  — row ~19
    (0.20, 0.54),   # 3 — sweep down-left                  — row ~22
    (0.84, 0.78),   # 4 — jump down-right                  — row ~25
    (0.34, 0.96),   # 5 — settle down-left (bottom)        — row ~28
]

# the three HEATMAP dwell centres (cool->hot). Sit on the three dwell fixations but
# nudged a touch so the warm o/O core blooms BESIDE the white dot (not hidden under
# it); kept well separated so the d substrate shows between them.
HEAT_UV = [
    ((0.16, 0.06), "hot"),    # at fixation 1 (the face) — hottest dwell
    ((0.84, 0.78), "warm"),   # at fixation 4 (right-side dwell)
    ((0.34, 0.96), "cool"),   # at fixation 5 (bottom dwell)
]


def _screen_uv(screen):
    """Return a bilinear uv() mapper for the inset screen quad."""
    sTL, sTR, sBR, sBL, BL, BR = screen

    def uv(u, v):
        top = (sTL[0] + u * (sTR[0] - sTL[0]), sTL[1] + u * (sTR[1] - sTL[1]))
        bot = (sBL[0] + u * (sBR[0] - sBL[0]), sBL[1] + u * (sBR[1] - sBL[1]))
        return (top[0] + v * (bot[0] - top[0]), top[1] + v * (bot[1] - top[1]))
    return uv


def heatmap(c, screen):
    """Layer 1 (STIMULUS IMAGE) + Layer 2 (gaze HEATMAP) on the angled glass.

    Layer 1 — a CALM, readable base picture: a quiet d screen substrate (already
    laid by display()) carrying a single bright L horizon line splitting sky/ground
    and a small c/L face-oval up-left. Sparse + flat — a faint recognisable picture,
    NOT uniform noise, with NO interior K blocks.

    Layer 2 — exactly THREE well-separated gaze blobs, each a set of NESTED rings
    grading cool->hot from edge to centre (G -> g -> o -> O). Drawn as concentric
    pixel rings at fixed centres so each clearly grades and they never wash together.
    """
    uv = _screen_uv(screen)
    import math

    # ── LAYER 1 FIRST: a faint flat STIMULUS IMAGE on the d substrate ─────────
    # one bright L horizon line splitting sky/ground + a small c/L face-oval up-left
    # — a quiet recognisable picture. Drawn UNDER the heat so the warm blobs pool on
    # top of the picture (the "heatmap over an image" read). Thin lines only, no K.
    c.line(uv(0.14, 0.64), uv(0.88, 0.60), "L")            # bright horizon line
    for a in range(0, 360, 60):                            # small face-oval outline
        c.set(*uv(0.40 + 0.075 * math.cos(math.radians(a)),
                  0.34 + 0.10 * math.sin(math.radians(a))), "L")

    # ── LAYER 2: THREE compact gaze HEATMAP discs (cool edge -> hot core) ─────
    # Each disc is a small set of FILLED ellipses outer->inner so it reads as a
    # clean cool->hot bullseye; the three centres sit far apart so the d substrate
    # shows between them and they never merge into one purple slab.
    # COLOUR DISCIPLINE: heat grades only through the PURPLE family (G -> g -> c ->
    # h), deliberately NOT through o/O. The bright magenta o/O is RESERVED for the
    # scan-path line + order-pips, so the connected saccade route stays the only
    # pink linear feature and reads cleanly ON TOP of the cooler heat blobs instead
    # of fusing into them.
    disc_spec = {
        "hot":  [(2.6, "G"), (1.7, "g"), (0.9, "c"), (0.0, "h")],
        "warm": [(2.2, "G"), (1.3, "g"), (0.0, "c")],
        "cool": [(1.9, "G"), (0.0, "g")],
    }

    def disc(cx, cy, r, ch):
        for dy in range(-3, 4):
            for dx in range(-3, 4):
                # iso-squash y (2:1) so the blob reads round on the tilted face
                if dx * dx + (dy * 1.7) ** 2 <= r * r + 0.30:
                    c.set(cx + dx, cy + dy, ch)

    for (u, v), kind in HEAT_UV:
        p = uv(u, v)
        cx, cy = int(round(p[0])), int(round(p[1]))
        for r, ch in disc_spec[kind]:
            disc(cx, cy, r, ch)


# ── 6. SIGNATURE B — connected NUMBERED SCAN-PATH of fixation dots ────────────
def scan_path(c, screen):
    """Layer 3 — the connected, NUMBERED SCAN-PATH: the decoding HERO.

    5 bright W fixation dots in a clear zig-zag VIEWING ORDER, CONNECTED dot-to-dot
    by a thin h saccade chain, each dot carrying a small O order-pip cluster reading
    1->5. Drawn ON TOP of the heatmap + image so the ordered dot-chain unmistakably
    sits ON the screen."""
    uv = _screen_uv(screen)
    pts = [uv(u, v) for u, v in FIX_UV]
    ipts = [(int(round(p[0])), int(round(p[1]))) for p in pts]

    # ── the SACCADE CHAIN: ONE continuous BOLD saccade LINE linking every ──────
    # fixation dot in viewing order (1->2->3->4->5). This connected ordered
    # polyline is the decoding HERO — it must read as a single zig-zag route, not
    # a scatter. Drawn in bright magenta o (#f08cce), which COLOUR-SEPARATES from
    # the cool PURPLE-only heat field (G/g/c/h) underneath. A bare 1px diagonal
    # staircase read as dappled dashes at thumbnail, so each line pixel is widened
    # by one px along the screen's WIDTH axis — making a solid continuous 2px-wide
    # magenta ribbon the eye can trace dot->dot->dot in one sweep. NO K (no holes).
    line_px = set()
    for i in range(len(ipts) - 1):
        # collect the staircase pixels of this segment via a manual Bresenham so we
        # can thicken consistently (c.line writes straight to the canvas).
        x0, y0 = ipts[i]
        x1, y1 = ipts[i + 1]
        dx = abs(x1 - x0); dy = -abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx + dy
        x, y = x0, y0
        while True:
            line_px.add((x, y))
            line_px.add((x + 1, y))   # widen along width -> solid 2px ribbon
            if x == x1 and y == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy; x += sx
            if e2 <= dx:
                err += dx; y += sy
    for (x, y) in line_px:
        c.set(x, y, "o")

    # ── fixation DOTS: a 2px bright W node with an h ring so each node is an ────
    # unmistakable round dot sitting ON the saccade chain (no K rim — that punched
    # holes). Drawn AFTER the line so the vertices cap the polyline cleanly: the
    # eye traces line->dot->line->dot->... as one connected ordered path.
    for i, (px, py) in enumerate(ipts):
        first = (i == 0)
        c.set(px, py, "W")                                 # bright core
        c.set(px + 1, py, "W")                             # 2px core (pops at 64)
        if first:
            c.set(px, py - 1, "W")                         # START dot: brighter 3px
        c.set(px - 1, py, "h")                             # left halo
        c.set(px + 2, py, "h")                             # right halo
        c.set(px, py - 1, "h") if not first else None      # top halo
        c.set(px + 1, py + 1, "h")                         # bottom halo

    # ── O ORDER-PIPS: a compact pip-row beside each dot counting 1..5 ─────────
    # placed clear of the chain (offset per dot) so the viewing order reads as
    # discrete numbered fixations along the line: 1 pip, 2 pips, ... 5 pips.
    # Drawn LAST (on top), but the LINE is the primary order read; pips reinforce.
    pip_off = [(-2, -2), (3, -2), (-3, 1), (3, 1), (3, 1)]
    for i, ((px, py), (ox, oy)) in enumerate(zip(ipts, pip_off)):
        n = i + 1
        bx, by = px + ox, py + oy
        for k in range(n):
            c.set(bx + (k % 3), by + (k // 3), "O")


# ── 7. SIGNATURE C — IR CAMERA BAR under the display lip + glints at headrest ──
def camera_bar(c, screen, eye):
    """A slim D bar slung under the display lip carrying two small c eye-tracker
    lenses (the IR cameras), each casting a thin o/O magenta IR beam toward the
    viewer's headrest where the small d head sits — a faint o glint on the eyes
    completes the gaze-tracking read."""
    # A clean horizontal crossbar in OPEN space below the screen's bottom-left lip
    # and above the headrest, carrying two distinct eye-tracker cameras. Absolute
    # coords (the round-0 screen-relative bar tangled into the bezel). Spans cols
    # 30..40 at row 31 — clearly its own slung bar.
    bx0, bx1, by = 30, 41, 31
    for x in range(bx0, bx1 + 1):
        c.set(x, by - 1, "M")          # lit top rim
        c.set(x, by, "D")
        c.set(x, by + 1, "d")          # shaded underside
    c.set(bx0 - 1, by, "K")            # left end-cap
    c.set(bx1 + 1, by, "K")            # right end-cap

    # TWO distinct IR camera HOUSINGS hanging off the bar — each a K-framed box with
    # a glowing c lens and a bright O magenta glint, well separated (cols 33 & 39) so
    # they read as a STEREO PAIR of eye-trackers, not one bright bar.
    lenses = []
    for lx in (33, 39):
        ly = by + 3
        # K housing frame (a tidy little box hanging below the bar) — clean 3x2 box
        for dx in (-1, 0, 1):
            c.set(lx + dx, ly - 1, "K")   # box top under the bar
            c.set(lx + dx, ly + 1, "K")   # box bottom
        c.set(lx - 1, ly, "K")
        c.set(lx + 1, ly, "K")
        c.set(lx, ly, "c")            # glowing IR lens iris (bright c)
        c.set(lx, ly - 1, "O")        # bright magenta glint above each lens
        lenses.append((lx, ly))

    # TWO clean O->o IR BEAMS angling down from each lens and CONVERGING on the
    # viewer's tracked eye (headrest) — short dashed magenta rays so the stereo aim
    # reads without streaking the wall.
    ex, ey = eye
    for (lx, ly) in lenses:
        steps = 4
        for k in range(1, steps):       # stops at the eye
            t = k / steps
            x = int(round(lx + t * (ex - lx)))
            y = int(round(ly + 1 + t * (ey - ly - 1)))
            c.set(x, y, "O" if k == 1 else "o")
    # bright O glint landing on the viewer's eye (the tracked reflection)
    c.set(ex, ey, "O")
    c.set(ex - 1, ey, "o")


# ── 8. RIGHT GLOWING SIDE OPENING — booth right face opens toward the screen ──
def right_opening(c, b):
    """Keep the SHADED-RIGHT booth wall PLAIN (per review tweak 3) so the SCREEN
    owns the gaze data: instead of a competing bright glass opening, only a soft o
    glow WASH from the screen spills onto the UPPER-RIGHT wall + a small ground glow,
    leaving the lower wall clear for the legible cameras + headrest."""
    pt = b.right_pt
    # soft o glow wash spilling from the glowing screen onto the UPPER-BACK of the
    # right wall only (a thin diagonal band high on the wall, well clear of the
    # cameras + headrest below). Gives the "glowing on the shaded side" read without
    # a bright slot competing with the gaze hero.
    c.line(pt(0.70, 4.4), pt(0.92, 5.6), "o")
    c.line(pt(0.74, 5.6), pt(0.92, 6.6), "h")
    c.set(*pt(0.90, 4.6), "O")

    # a SMALL, restrained o magenta glow pooling onto the ground under the right face
    # (the booth's glow pooling out) — trimmed from the round-0 wide o/r smear.
    base = pt(0.82, b.h)
    gx, gy = int(round(base[0])), int(round(base[1]))
    for dx in range(-1, 2):
        c.set(gx + dx, gy + 2, "o")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS gaze-capture
# structure onto the prior form — never restarts, never recolors the whole building.
# Theme: one viewing carrel grows into a panoramic MULTI-SUBJECT gaze-aggregation
# suite. Every add stays OFF the front display face (the heatmap + scan-path hero):
# the chin-rest grows BELOW the screen, the second booth grows LEFT, the monitor-rig
# tower grows UP off the booth roof, and the t5 array extends the wall outward + up.
# Evolved glow = cool signal-cyan e/E (gaze data), distinct from the magenta o/O
# (live IR/calibration human accent). Gold (q) only at t5.
#
#   t2  small functional add   : a desk CHIN-REST + eye-tracker bar + brighter o pip
#   t3  structural add         : a second TRACKING-BOOTH ANNEX (left, b hood, g screen)
#   t4  major add              : a stacked MONITOR-RIG TOWER raising the roofline (e panels)
#   t5  crowning feature       : panoramic GAZE-AGGREGATION ARRAY + gold console/bezel
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_chinrest(c, b):
    """t2 — SMALL FUNCTIONAL ADD: a low CHIN-REST desk console with a slim eye-tracker
    bar prop, set on the booth's lit-LEFT wall front BELOW the screen (the subject's
    chin support for a steady gaze), plus a brighter o/O CALIBRATION-DOT pip up in a
    clear corner of the display (the dot the subject fixates to calibrate). On-theme
    (eye-tracking rig), modest, base palette + one brightened o/O calibration pip.
    Seated low-left so it never touches the screen's heatmap/scan-path hero."""
    # --- chin-rest desk: a small K-framed M/L console standing on the lit-left wall
    #     foot, well below the screen (screen bottom ~row 31; desk top ~row 42). A
    #     short upright chin-post rises off it with a small L chin-cup the subject
    #     leans into. Placed at the lit-left wall front so it reads as the booth's
    #     desk, clear of the headrest (cols 30..36) on the right. ---
    dx, dy = 16, 42
    _stamp(c, dx, dy, [
        ".KKKKK.",   # desk top lip (lit L below)
        "KLLLLLK",   # desk worktop (bright L — pops off the M wall)
        "KMMMMMK",   # desk apron (M)
        "KD.D.DK",   # leg gaps (D), reads as a standing console
        ".K...K.",   # feet on the slab
    ])
    # a slim eye-tracker BAR propped across the desk worktop, a small c sensor eye on
    # it pointing up at the subject (the tracker the chin-rest aligns the eye to)
    c.line((dx + 1, dy - 1), (dx + 5, dy - 1), "D")       # tracker bar body
    c.set(dx + 1, dy - 1, "K"); c.set(dx + 5, dy - 1, "K")
    c.set(dx + 3, dy - 2, "c")                            # glowing tracker lens
    c.set(dx + 3, dy - 3, "O")                            # bright sensor glint
    # a short chin-POST + chin-cup rising off the desk's right end (the subject rests
    # their chin here while the bar tracks the eye)
    c.line((dx + 5, dy), (dx + 5, dy - 3), "M")
    c.set(dx + 5, dy - 4, "L"); c.set(dx + 6, dy - 4, "L")  # small L chin-cup

    # --- brighter o/O CALIBRATION-DOT pip on the display: a single bright fixation
    #     target high in the screen's TOP-RIGHT corner, in a clear gap WELL away from
    #     the scan-path (which lives centre/left) so it never muddies the hero. The
    #     subject fixates this dot to calibrate the tracker. ---
    cdx, cdy = 45, 18
    c.set(cdx, cdy, "O")                                  # bright calibration target
    c.set(cdx - 1, cdy, "o")
    c.set(cdx + 1, cdy, "o")
    c.set(cdx, cdy - 1, "o")
    c.set(cdx, cdy + 1, "o")


def stage3_booth_annex(c, booth_box):
    """t3 — STRUCTURAL ADD: a second TRACKING-BOOTH ANNEX bolted onto the LEFT of the
    main carrel — a slim DARK HOOD (deep-indigo b) enclosing a subject screen that
    GLOWS g from inside its viewing aperture, with its own little headrest pip. A real
    new structural Box (a dedicated calibration / second-subject booth) that extends
    the suite's massing LEFT-and-up without touching the front display face. Introduces
    the matured deep-indigo b tone on the hood shell."""
    # seat the annex to the LEFT of the booth: its apex up-left of the booth so it
    # stacks at the far-left and rises a touch taller, reading as a paired second
    # booth abutting the carrel. Slim (small wx/wy) so it stays a side annex.
    apex = (booth_box.r_left[0] - 1, booth_box.r_left[1] - 9)   # up-left of booth r_left
    hood = Box(top=apex, wx=3, wy=4, h=15)
    # DARK HOOD shell: deep-indigo b walls (the enclosed-subject booth reads darker
    # than the lit carrel), L roof so it still seats in the same light.
    hood.draw(c, roof="L", lwall="b", rwall="K", roof_hi="M", outline="K")
    # a soft o roof accent ping matching the carrel's roof light (ties it to the suite)
    rp = hood.roof_pt(0.4, 0.4)
    c.set(int(round(rp[0])), int(round(rp[1])), "o")
    # --- the enclosed SUBJECT SCREEN glowing from inside a viewing aperture cut in
    #     the hood's lit-LEFT face (facing the viewer-left, fully clear of the carrel
    #     display on the right). A recessed dark mouth with a BRIGHT glowing pane deep
    #     inside = a subject staring into a hooded screen. Built directly (not via
    #     window) so the glow is a strong c/g pane that pops against the dark b hood. ---
    a0 = hood.left_pt(0.20, 2.6); a1 = hood.left_pt(0.82, 2.6)
    a2 = hood.left_pt(0.82, 9.4); a3 = hood.left_pt(0.20, 9.4)
    c.fill_poly([a0, a1, a2, a3], "g")                    # glowing subject screen body
    # bright upper sky-band + a hot c core so it reads as lit-from-inside
    b0 = hood.left_pt(0.20, 2.6); b1 = hood.left_pt(0.82, 2.6)
    b2 = hood.left_pt(0.82, 4.4); b3 = hood.left_pt(0.20, 4.4)
    c.fill_poly([b0, b1, b2, b3], "c")                    # bright top band of the glow
    # a bright fixation pip dead-centre of the enclosed screen (the subject is fixating
    # it) + a small d subject-head silhouette down at the aperture foot
    gp = hood.left_pt(0.5, 6.4)
    c.set(int(round(gp[0])), int(round(gp[1])), "E")      # bright fixation pip inside
    c.set(int(round(gp[0])) - 1, int(round(gp[1])), "h")
    hp = hood.left_pt(0.5, 8.8)
    c.set(int(round(hp[0])), int(round(hp[1])), "d")      # subject-head silhouette
    c.set(int(round(hp[0])) - 1, int(round(hp[1])), "d")
    c.set(int(round(hp[0])) + 1, int(round(hp[1])), "d")
    # clean K frame around the aperture (reads as a built hood mouth)
    for p, q in [(a0, a1), (a1, a2), (a2, a3), (a3, a0)]:
        c.line(p, q, "K")
    return hood


def stage4_monitor_tower(c, booth_box):
    """t4 — MAJOR ADD: a stacked MONITOR-RIG TOWER rising straight UP off the BACK-LEFT
    of the booth roof, raising the roofline — a deep-indigo b chassis carrying TWIN
    stacked glowing CYAN gaze-heatmap panels (the suite now reads more eyes on more
    screens at once). The prominent new vertical mass. Anchored on the roof's LEFT half
    (x≈14..23) so it rises clear LEFT of the angled display (screen left edge ~x26),
    never occluding the front display face — both stacked panels stay fully visible.
    Palette matures: deep b chassis + energized signal-cyan e/E on the twin gaze
    panels. Kept fully on-canvas (x>=14, top_y=3)."""
    # foot seats on the booth roof's LEFT half; chassis spans x=14..23 so it stands
    # clearly LEFT of the screen (whose left edge is x≈26 at every height) — that keeps
    # BOTH stacked panels unoccluded by the front display drawn over it.
    foot_y = int(round(booth_box.roof_pt(0.10, 0.58)[1]))   # ~row 22, on the roof
    lx, rx = 14, 23                            # chassis left/right (left of the screen)
    top_y = 3                                  # tall chassis rising into clear sky
    # --- deep-indigo b CHASSIS column (a stacked monitor rack frame) ---
    c.fill_poly([(lx, top_y), (rx, top_y), (rx, foot_y), (lx, foot_y)], "b")
    c.fill_poly([(rx - 1, top_y), (rx, top_y), (rx, foot_y), (rx - 1, foot_y)], "K")  # shade edge
    c.fill_poly([(lx, top_y), (lx + 1, top_y), (lx + 1, foot_y), (lx, foot_y)], "D")  # lit edge
    # K outline of the chassis
    c.line((lx, top_y), (rx, top_y), "K")
    c.line((lx, foot_y), (rx, foot_y), "K")
    c.line((lx, top_y), (lx, foot_y), "K")
    c.line((rx, top_y), (rx, foot_y), "K")
    # a mid cross-brace so it reads as a built rack (separates the twin panels)
    midy = (top_y + foot_y) // 2
    c.line((lx + 1, midy), (rx - 1, midy), "M")
    # --- TWIN stacked glowing CYAN gaze-heatmap PANELS inset in the chassis (upper +
    #     lower), each a wide e screen carrying a bright E gaze-blob = a live heatmap
    #     feed. Two panels stacked = "more screens reading more eyes". ---
    def gaze_panel(py0, py1):
        px0, px1 = lx + 2, rx - 2
        c.fill_poly([(px0, py0), (px1, py0), (px1, py1), (px0, py1)], "e")          # cyan screen
        c.fill_poly([(px0, py0), (px1, py0), (px1, py0 + 1), (px0, py0 + 1)], "E")  # bright top band
        # a small bright E gaze-blob bloom on the panel (a heatmap hot-spot)
        bcx, bcy = (px0 + px1) // 2, (py0 + py1) // 2
        c.set(bcx, bcy, "E"); c.set(bcx - 1, bcy, "E"); c.set(bcx + 1, bcy, "E")
        c.set(bcx, bcy - 1, "E"); c.set(bcx, bcy + 1, "E")
        c.set(bcx, bcy, "W")                                                        # hot core
        # clean K frame
        c.line((px0, py0), (px1, py0), "K"); c.line((px0, py1), (px1, py1), "K")
        c.line((px0, py0), (px0, py1), "K"); c.line((px1, py0), (px1, py1), "K")
    # UPPER panel (between the chassis top and the cross-brace)
    gaze_panel(top_y + 2, midy - 1)
    # LOWER panel (between the cross-brace and the chassis foot)
    gaze_panel(midy + 2, foot_y - 2)
    return (lx, rx, top_y, foot_y)


def stage5_array(c, screen, tower, booth_box):
    """t5 — CROWNING FEATURE = FULLY EVOLVED gaze-aggregation suite. The wall becomes a
    panoramic GAZE-AGGREGATION ARRAY: a row of synced bright-cyan E mini-heatmap panels
    WINGS the monitor-rig tower (mounted on a slim b spar off the tower top, growing UP
    into clear sky — never over the front display) + a bright fixation-cluster BLOOM
    crowning the array, all dressed out in GOLD premium trim (a gold master-console
    bar along the tower foot + a gold bezel re-gilding the hero display frame). Reads
    as elite, still recognizably the same carrel, just maxed out. Re-anchors off the
    SAME tower the t4 rig used (no second hardcoded guess)."""
    import math
    lx, rx, top_y, foot_y = tower             # the t4 monitor-rig chassis bounds

    # --- panoramic ARRAY: a row of synced E mini gaze-heatmap panels on a slim b spar
    #     cantilevering RIGHT off the tower top, in the clear-sky band ABOVE the angled
    #     display (screen top ~row 12). The spar sits at row ~8 and the little panels
    #     stand UP off it to row ~4 — fully on-canvas (no row-0 clipping) and clear of
    #     the front display face. Each panel is a tiny cyan screen with a bright E
    #     hot-spot; the shared spar makes them read as ONE synced aggregation wall. ---
    spar_y = top_y + 6                         # ~row 9 — leaves clear margin to row 0
    spar_x0 = rx                               # starts at the tower's right edge
    spar_x1 = min(rx + 17, 45)                 # reaches right, stays on-canvas + off screen
    c.line((spar_x0, spar_y), (spar_x1, spar_y), "b")          # spar body
    c.line((spar_x0, spar_y + 1), (spar_x1, spar_y + 1), "K")  # spar under-shade
    c.set(spar_x0, spar_y, "K")
    # three little synced gaze panels standing UP off the spar (rise into clear sky)
    pw, ph = 5, 4
    panel_cx = []
    for k in range(3):
        px0 = spar_x0 + 2 + k * (pw + 1)
        px1 = min(px0 + pw, 45)
        py1 = spar_y - 1
        py0 = py1 - ph                          # row ~4..7 — on-canvas
        if px1 <= px0:
            continue
        c.fill_poly([(px0, py0), (px1, py0), (px1, py1), (px0, py1)], "e")          # cyan screen
        c.fill_poly([(px0, py0), (px1, py0), (px1, py0 + 1), (px0, py0 + 1)], "E")  # bright band
        bcx, bcy = (px0 + px1) // 2, (py0 + py1) // 2
        c.set(bcx, bcy, "W")                                                        # hot core
        c.set(bcx - 1, bcy, "E"); c.set(bcx + 1, bcy, "E"); c.set(bcx, bcy + 1, "E")
        c.line((px0, py0), (px1, py0), "K"); c.line((px0, py1), (px1, py1), "K")
        c.line((px0, py0), (px0, py1), "K"); c.line((px1, py0), (px1, py1), "K")
        panel_cx.append(bcx)

    # --- fixation-cluster BLOOM crowning the array: a bright E starburst node hovering
    #     over the CENTRE panel (the aggregated gaze cluster all the feeds converge on),
    #     on a short b neck so it reads as the crowning node, not a detached blob. ---
    blx = panel_cx[len(panel_cx) // 2] if panel_cx else (spar_x0 + spar_x1) // 2
    blx = min(blx, 44)
    neck_top = spar_y - ph - 1                  # just above the panel tops
    bly = max(neck_top - 3, 2)                   # keep the orb >=row 2 so its top ray > row 0
    c.line((blx, neck_top), (blx, bly + 1), "b")            # neck mounting the bloom
    for a in range(0, 360, 45):                            # short radial bloom rays
        ex = blx + int(round(2 * math.cos(math.radians(a))))
        ey = bly + int(round(1.4 * math.sin(math.radians(a))))
        if 0 <= ex <= 63 and 1 <= ey <= 63:               # clamp inside (never row 0)
            c.set(ex, ey, "e")
    for xx, yy, ch in [(0, 0, "W"), (-1, 0, "E"), (1, 0, "E"), (0, -1, "E"), (0, 1, "E")]:
        if 0 <= blx + xx <= 63 and 1 <= bly + yy <= 63:
            c.set(blx + xx, bly + yy, ch)

    # --- GOLD premium trim (t5 flourish only) ---
    # a GOLD master-console bar running along the monitor-rig tower foot (the suite's
    # control console is now gilded) — a short q bar with an O hot pip, on the chassis.
    c.line((lx, foot_y - 1), (rx, foot_y - 1), "q")
    c.set((lx + rx) // 2, foot_y - 2, "O")
    # a GOLD bezel re-gilding the HERO display frame: trace the screen's outer K bezel
    # corners in q (just the top + left lit edges so it reads as a gilded rim, not a
    # full recolor). Recompute from the SAME screen quad the base used.
    sTL, sTR, sBR, sBL, BL, BR = screen
    c.line(sTL, sTR, "q")                       # gold top bezel edge
    c.line(sTL, sBL, "q")                       # gold left bezel edge
    c.set(int(round(sTL[0])), int(round(sTL[1])), "O")   # bright gold corner boss


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the eye-tracking suite at upgrade `stage` (1..5). Stage 1 is IDENTICAL
    to the shipped base; each higher stage keeps every prior addition and bolts on the
    next (t2 chin-rest → t3 second booth → t4 monitor tower → t5 array+gold). Painter's
    order keeps the back-left annex + roof tower behind/under the front display so the
    heatmap + scan-path signature on the angled screen is never occluded."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    b = BOOTH
    contact_shadow(c)         # soft K contact shadow grounding the booth

    # CUMULATIVE BACK MASSES drawn BEFORE the booth + front display so they sit behind
    # it (painter's order): the second tracking booth (left) + the monitor-rig tower
    # (up off the roof) are back/left masses the carrel + screen occlude in front.
    if stage >= 3:
        stage3_booth_annex(c, b)
    if stage >= 4:
        tower = stage4_monitor_tower(c, b)

    booth(c, b)               # compact viewing-booth cabin (back) + plain lit-left window
    screen = display(c, b)    # cantilever arm + big ANGLED glowing stimulus display
    heatmap(c, screen)        # SIGNATURE A: gaze heatmap cool->hot over a stimulus image
    scan_path(c, screen)      # SIGNATURE B: connected numbered scan-path of fixation dots
    right_opening(c, b)       # GLOWING right side-opening + ground wash (assigned RIGHT)
    eye = headrest(c, b)      # headrest/seat + viewer head in the OPEN lower-right (front)
    camera_bar(c, screen, eye)  # SIGNATURE C: IR camera bar + magenta beams + eye glint

    # --- REMAINING CUMULATIVE STAGES (front/over-screen-safe additions) ------------
    if stage >= 2:
        stage2_chinrest(c, b)         # desk chin-rest + calibration pip (below the screen)
    if stage >= 5:
        stage5_array(c, screen, tower, b)  # panoramic gaze-array + gold console/bezel

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/mindframe"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "eye-tracking-suite"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped eye-tracking-suite.png, so it does NOT overwrite the base PNG."""
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
