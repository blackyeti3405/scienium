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
"""
import os
import sys
import json

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box

MIND = {"K": "#181428", "W": "#e8e2f6", "L": "#cabfe6", "M": "#9f90c8", "D": "#6f5fa0", "d": "#4a3c70",
        "h": "#ecc8f4", "c": "#d0a8ee", "g": "#a45ce0", "G": "#6a2fb0",
        "o": "#f08cce", "O": "#ffb8e2", "r": "#b03a80"}


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


def build():
    c = Canvas()
    b = BOOTH
    contact_shadow(c)         # soft K contact shadow grounding the booth
    booth(c, b)               # compact viewing-booth cabin (back) + plain lit-left window
    screen = display(c, b)    # cantilever arm + big ANGLED glowing stimulus display
    heatmap(c, screen)        # SIGNATURE A: gaze heatmap cool->hot over a stimulus image
    scan_path(c, screen)      # SIGNATURE B: connected numbered scan-path of fixation dots
    right_opening(c, b)       # GLOWING right side-opening + ground wash (assigned RIGHT)
    eye = headrest(c, b)      # headrest/seat + viewer head in the OPEN lower-right (front)
    camera_bar(c, screen, eye)  # SIGNATURE C: IR camera bar + magenta beams + eye glint

    spec = {"width": 64, "height": 64, "palette": MIND, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/mindframe_eye-tracking-suite.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
