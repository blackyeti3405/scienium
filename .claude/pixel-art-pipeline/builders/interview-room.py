#!/usr/bin/env python3
"""
Interview Room — MindFrame Lab economy building (BESPOKE FORM · OPEN ONE-ON-ONE BOOTH).

The smallest, most intimate, OPEN-CONCEPT member of the set: a single low pavilion
backed by one tall ONE-WAY MIRROR WALL, with an OPEN front that exposes two facing
booth seats across a small table, ringed by a low o/K privacy-screen striping. Tiny,
calm, human-scale — NOT the gateway cube, and distinct from every enclosed MindFrame
sibling (this is a square open booth, not a round sunken amphitheater).

  * LOW FLOOR SLAB (drawn first): a D/d indigo platform the viewer looks DOWN onto;
    its open front edges are ringed with o/K privacy-screen striping (glass-screen
    posts) and the open front-center stays OPEN as the interview nook.
  * MIRROR-WALL BACK BLOCK: one low Box along the back — M/D indigo walls — whose
    tall lit-LEFT inner face is almost entirely a single ONE-WAY MIRROR panel via
    Box.window(glass='c', hi='h', shade='G'): a big silvered pane with a soft h sheen,
    catching a faint reflection of the booth so it reads as observation glass.
  * THIN CANOPY SLAB over the mirror-wall block only (the booth front stays open to
    sky), with a single soft o magenta accent-light strip along its lip casting a
    gentle glow into the open booth.
  * SIDE FIN on the right: a short low Box anchoring the open corner, carrying one
    small c reception window via Box.window. Plainer than the lit mirror face.
  * OPENING SIDE = OPEN. The hero plays out in the open front booth, framed/backed
    by the one-way mirror wall.

Signature (one-of-one): two small seated d/D silhouette figures (interviewer +
subject) face each other across a low M table; a rounded o/O magenta SPEECH-BUBBLE
floats between their heads holding a tiny h/c VOICEPRINT — a cluster of stacked
sound-wave bars (the captured spoken answer); and a popped-up W/L ID/clipboard TAG
above the subject's head carries an o name-line + a c/O checkmark (subject
identified). No two-figures-in-dialogue / voiceprint-bubble / subject-ID-tag motif
exists anywhere else in the catalog.

Composed from art/isobuild.{Box} — NO iso.draw_cube / base_windows.

═══════════════════════════════════════════════════════════════════════════════════
REFERENCE BUILDING for the MindFrame lab's UPGRADE-EVOLUTION pass. This file sets
the code pattern (build(stage) + cumulative stageN helpers + emit/build_all, copied
from workshop.py) and the quality bar for all 10 mindframe buildings.

MindFrame evolution language — theme: a calm INDIGO behavioral-OBSERVATION booth
grows into a full multi-channel COGNITIVE-OBSERVATION SUITE. The intensity ramp adds
SIGNAL / DATA-CAPTURE structure (the lab's "read the mind" motif): an uplink mast, a
recording annex, a scanning sensor dish, and finally a glowing neural-data beacon.
The lab's own magenta `o/O` stays the HUMAN/voice accent; the evolved glow is a cool
SIGNAL-CYAN `e/E` (data) so the two never blur. Colours mature stage by stage; gold
(`q`) is a t5 flourish only, never a whole-building recolor.

  t2  small functional add : a slim DATA-UPLINK MAST + pin-light on the mirror-wall roof
  t3  structural add       : a tall slim RECORDING / CAMERA ANNEX tower on the back-right
  t4  major add            : a rooftop SCANNING SENSOR DISH on a plinth + cyan data glow
  t5  crowning feature     : a glowing NEURAL-DATA BEACON orb + signal arcs, gold trim
"""
import os
import sys
import json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder, RX, RY, LX, LY

# Base MindFrame palette (shared keys) + a few EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so interview-room.png is unchanged).
# These exact evolved keys are reused by all 10 mindframe buildings for lab consistency:
#   b  deep indigo steel — matured structure tone for t4+ new masses
#   e  energized signal-cyan glow (mid)   E  signal-cyan glow (bright) — the t4/t5 data
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
MIND = {"K": "#181428", "W": "#e8e2f6", "L": "#cabfe6", "M": "#9f90c8", "D": "#6f5fa0", "d": "#4a3c70",
        "h": "#ecc8f4", "c": "#d0a8ee", "g": "#a45ce0", "G": "#6a2fb0",
        "o": "#f08cce", "O": "#ffb8e2", "r": "#b03a80",
        "b": "#2b2440", "e": "#7fd4ff", "E": "#d6f4ff", "q": "#f3c63a"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def _stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings) at top-left (x0,y0).
    '.' = skip (transparent)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


def screen_stripe(c, p0, p1, n):
    """o/K privacy-screen striping along a slab front edge from p0 to p1 — the low
    glass-screen posts ringing the open booth."""
    for k in range(n + 1):
        t = k / n
        x = p0[0] + t * (p1[0] - p0[0])
        y = p0[1] + t * (p1[1] - p0[1])
        c.set(int(round(x)), int(round(y)), "o" if k % 2 == 0 else "K")


# ── 1. LOW FLOOR SLAB — the open booth platform (drawn FIRST) ─────────────────
def floor_slab(c):
    """A low indigo platform the viewer looks DOWN onto. The mirror-wall + fin seat
    on its back edges; the front-center stays OPEN as the interview nook. D/d indigo
    deck + o/K privacy-screen striping along the two open front edges."""
    slab = Box(top=(32, 30), wx=11, wy=11, h=3)
    # deck: lit D, brighter back-left triangle; a couple of d inset seams (floor mat)
    c.fill_poly([slab.r_top, slab.r_right, slab.r_front, slab.r_left], "D")
    c.fill_poly([slab.r_top, slab.r_left, slab.r_front], "M")
    # NOTE: the old inset d-mat ring under the booth was REMOVED in round-1 — its dark
    # d pixels matched the figure silhouettes' value and made the two seated figures
    # clump into the floor. The booth floor is now left clean/bright M so the dark
    # d/K figures silhouette cleanly against it.
    # the 3px slab edge on the two FRONT faces
    c.fill_poly([slab.r_left, slab.r_front, slab.w_front, slab.w_left], "d")
    c.fill_poly([slab.r_front, slab.r_right, slab.w_right, slab.w_front], "d")
    c.line(slab.r_left, slab.r_front, "D")     # lit front-left top edge
    # outline
    for a, b in [(slab.r_top, slab.r_right), (slab.r_right, slab.r_front),
                 (slab.r_front, slab.r_left), (slab.r_left, slab.r_top),
                 (slab.r_left, slab.w_left), (slab.r_front, slab.w_front),
                 (slab.r_right, slab.w_right),
                 (slab.w_left, slab.w_front), (slab.w_front, slab.w_right)]:
        c.line(a, b, "K")
    # PRIVACY-SCREEN striping along the two open FRONT slab edges (rings the booth)
    screen_stripe(c, slab.r_left, slab.r_front, 11)
    screen_stripe(c, slab.r_front, slab.r_right, 11)
    return slab


# ── 2. MIRROR-WALL BACK BLOCK — the one-way mirror hero wall ───────────────────
def mirror_wall(c, slab):
    """A thin tall Box backdrop hugging the BACK-LEFT edge of the slab, long toward
    the LEFT (big wy) and SHALLOW toward the right (small wx) so its dark right face
    is a slim sliver and its broad lit-LEFT face — turned toward the open booth — is
    almost entirely one silvered ONE-WAY MIRROR pane (Box.window glass='c' hi='h'
    shade='G') with a soft sheen + one faint mullion, reading as a mirror, not a
    black-barred window. Slim depth keeps it a clean BACKDROP that the lit figures
    silhouette against rather than a block that swallows them in shadow."""
    # CENTERED on the back of the slab, broad in wx so its lit-LEFT face is a wide
    # plane directly BEHIND the open booth — the figures silhouette against it.
    apex = (slab.r_top[0] + 0, slab.r_top[1] - 12)
    wall = Box(top=apex, wx=8, wy=4, h=13)
    wall.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # --- the big SILVERED ONE-WAY MIRROR pane filling most of the lit LEFT face ---
    # A one-way mirror is a BRIGHT reflective sheet, so the glass tone leans light
    # (c) with an h sheen + bright W diagonal streak — it reads as a silvered mirror
    # the lit booth reflects in, not a dark window.
    wall.window(c, "left", 0.06, 0.94, 1.8, 11.6,
                glass="c", hi="h", shade="M", mullions=1, sheen="W")
    # a brighter upper sky-band so the mirror reads silvered, not glassy-dark
    c.fill_poly([wall.left_pt(0.06, 2.2), wall.left_pt(0.94, 2.2),
                 wall.left_pt(0.94, 5.0), wall.left_pt(0.06, 5.0)], "h")
    c.fill_poly([wall.left_pt(0.06, 2.2), wall.left_pt(0.50, 2.2),
                 wall.left_pt(0.50, 3.8), wall.left_pt(0.06, 3.8)], "L")
    # a clean K sill band under the mirror (frame foot)
    c.line(wall.left_pt(0.04, 11.8), wall.left_pt(0.96, 11.8), "K")

    # --- the SHADED right face stays plainer: one slim c reception slit-window ---
    wall.window(c, "right", 0.32, 0.68, 2.6, 8.0, glass="c", hi="h", shade="G")
    return wall


# ── 3. THIN CANOPY SLAB over the mirror-wall + o accent-light strip ───────────
def canopy(c, wall):
    """A thin flat M canopy slab capping the mirror-wall block only (the booth front
    stays open to sky). A single soft o magenta accent-light strip runs along its
    front lip, casting a gentle glow down into the open booth."""
    # a slim Box sitting just above the wall roof, oversailing the front toward the
    # booth so its accent-light lip can cast a glow down over the open nook
    cap = Box(top=(wall.top[0] - 0.0, wall.top[1] - 2.5), wx=8.6, wy=4.4, h=2)
    cap.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # o magenta ACCENT-LIGHT strip along the canopy's lit front-left lip
    c.line(cap.left_pt(0.06, 1.0), cap.left_pt(0.94, 1.0), "o")
    c.line(cap.left_pt(0.06, 1.6), cap.left_pt(0.94, 1.6), "O")   # bright hot core
    # soft o glow spilling just below the lip into the booth (a couple of px)
    for u in (0.24, 0.46, 0.68, 0.86):
        p = cap.left_pt(u, 2.4)
        c.set(int(round(p[0])), int(round(p[1])), "o")
    return cap


# ── 4. SIDE FIN — short low block anchoring the open right corner ─────────────
def side_fin(c, slab):
    """A short low Box fin on the RIGHT slab edge, anchoring the open corner. M/D
    indigo, plainer than the mirror face, carrying one small c reception window via
    Box.window. Kept low + slim so the open booth reads past it."""
    apex = (slab.r_top[0] + 14, slab.r_top[1] + 4)
    fin = Box(top=apex, wx=4, wy=3, h=11)
    fin.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # one small c reception window on the lit LEFT face (facing the booth)
    fin.window(c, "left", 0.26, 0.74, 2.6, 7.2, glass="c", hi="h", shade="G", mullions=1)
    # a faint o accent ping on the fin's shaded right face (matches canopy light)
    c.set(int(round(fin.right_pt(0.5, 3.0)[0])), int(round(fin.right_pt(0.5, 3.0)[1])), "o")
    return fin


# ── 5. SIGNATURE — two seated figures + voiceprint speech-bubble + ID tag ─────
def signature(c, slab):
    """The hero, in the OPEN front booth: two CLEARLY SEPARATED seated d/D silhouette
    figures facing each other across a low DIMMED table; a rounded o/O magenta
    SPEECH-BUBBLE holding a tiny h/c VOICEPRINT (stacked sound-wave bars) hovers
    between their heads; and a popped W/L ID/clipboard TAG above the subject carries
    an o name-line + c/O checkmark (subject identified).

    ROUND-0 FIX: the two figures previously clumped into the dark floor + the over-
    bright W table. Now: (a) the table is knocked down to L/M/D so the figures pop;
    (b) each figure is a compact, distinctly-separated d/K silhouette with a 1px K
    head outline and a floor gap to the table; both turned toward each other; (c) the
    ID tag is rebuilt as a small K-framed W/L card with a magenta name-line + check.
    Figure silhouettes stay in the low-value d/K band so they never blend into the
    M/L/h mirror sheen behind them."""
    # The booth nook is the bright M deck TRIANGLE just below the wall (center line
    # ~row 41, front apex ~row 52). The hero sits CENTERED on that bright M deck,
    # pulled INWARD off the dark diagonal front-edge slab faces (cols ~24 / ~40) and
    # raised so the compact d/K figures silhouette cleanly against the LIT floor. The
    # table is small + low between them; the two figures flank it with a clear M gap.
    cx = 32
    ty_base = 47                     # figures' seated-base row, on the lit M deck

    # --- low TABLE first, small + centred between the figures. Knocked DOWN from
    # full-W to L/M/D so it no longer out-shouts the figures: a 2px L top edge only,
    # M/D apron. A lower-value table lets the figures + bubble become the focal point.
    _stamp(c, cx - 2, ty_base - 2, [
        ".KK.",
        "KLLK",    # dimmed L top (was bright W) — only the top edge is light
        "KMDK",    # M/D apron
        ".KK.",
    ])

    # --- LEFT figure: the INTERVIEWER, seated facing RIGHT toward the subject.
    # Compact BOLD silhouette: solid d head + torso with a continuous K perimeter, so
    # it reads as one clear figure against the bright M deck. A tight h halo on its
    # far (left) side pops the head off the floor. Pulled inward + raised. ---
    lx = cx - 7
    lhy = ty_base - 5                # head-top row
    c.set(lx - 1, lhy, "h"); c.set(lx - 1, lhy + 1, "h")   # halo, far side
    _stamp(c, lx, lhy, [
        ".KK.",    # head cap (K outline against lit floor)
        "KDdK",    # head — D-lit far edge separates it from the dark screen-ring band
        "KDdK",
        "KDddK",   # shoulders, widening toward the table (right)
        "KdddK",   # torso (solid d block)
        "KKKK.",   # seated base on the deck
    ])

    # --- RIGHT figure: the SUBJECT, seated facing LEFT toward the interviewer.
    # Mirrored compact silhouette; head backlit o/O by the canopy accent so it pops as
    # the identified subject. ---
    rx = cx + 3
    rhy = ty_base - 5
    c.set(rx + 4, rhy, "h"); c.set(rx + 4, rhy + 1, "h")   # halo, far side
    _stamp(c, rx, rhy, [
        ".KK.",    # head cap (K outline against lit floor)
        "KddK",    # head — solid d
        "KddK",
        "KdddK",   # shoulders, widening toward the table (left)
        ".KddK",   # torso (solid d block)
        ".KKK.",   # seated base on the deck
    ])
    # subject crown backlit o/O by the canopy accent strip (per blueprint)
    c.set(rx + 1, rhy - 1, "O"); c.set(rx + 2, rhy - 1, "o")

    # --- SPEECH-BUBBLE floating in the clear gap ABOVE the table, BETWEEN the two
    # heads. A full continuous 1px K ring boxes it so it reads as a discrete hovering
    # magenta bubble against the busy mirror sheen behind it, with a tail pointing down
    # into the conversation. Compact (5w) to fit the narrow inter-head gap. ---
    bx, by = cx - 2, lhy - 5
    _stamp(c, bx, by, [
        ".KKKKK.",
        "KoooooK",   # o body, continuous K ring
        "KoooooK",
        "KoooooK",
        ".KKKKK.",
        "..K.K..",   # tail dripping down toward the table/heads
    ])
    # VOICEPRINT inside the bubble: a tiny cluster of stacked h/c sound-wave bars
    # (light bars on the magenta body = a waveform, NOT a single scope line)
    vbars = [(1, "h", 2), (2, "c", 3), (3, "h", 1), (4, "c", 2), (5, "h", 2)]
    for i, ch, hgt in vbars:
        base = by + 3
        for k in range(hgt):
            c.set(bx + i, base - k, ch)

    # --- ID / CLIPBOARD TAG popped up above-right of the SUBJECT's head (identified),
    # floated just off the head into clearer background so the K-framed white card
    # reads as a discrete popped tell: W/L body, K 1px frame, o name-line + c/O check.
    tx, ty = rx + 4, rhy - 4
    _stamp(c, tx, ty, [
        "KKKKKK",
        "KWWWWK",   # white card body
        "KWooWK",   # o NAME-LINE across the card
        "KWLLWK",
        "KWWWWK",   # checkmark sits here (set below)
        "KKKKKK",
    ])
    # a crisp c/O checkmark on the card = subject identified
    c.set(tx + 1, ty + 4, "c")
    c.set(tx + 2, ty + 4, "O")
    c.set(tx + 3, ty + 3, "O")
    c.set(tx + 4, ty + 2, "c")
    # a thin d stem connecting the tag down toward the subject's head (popped tell)
    c.set(tx + 1, ty + 6, "d")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS signal/data-
# capture structure onto the prior form — never restarts, never recolors the whole
# building. Theme: the intimate one-on-one observation booth grows into a fully
# built-out, multi-channel COGNITIVE-OBSERVATION SUITE. Additions sit on the BACK
# masses (mirror-wall roof / canopy / back-right air) and grow UP, so they never
# occlude the open front booth signature (figures + voiceprint bubble + ID tag).
# Colours mature stage by stage; the evolved glow is cool signal-cyan e/E (data),
# kept distinct from the lab's magenta o/O human accent. Gold (q) only at t5.
#
#   t2  small functional add   : a slim DATA-UPLINK MAST + pin-light on the wall roof
#   t3  structural add         : a tall slim RECORDING / CAMERA ANNEX tower (back-right)
#   t4  major add              : a rooftop SCANNING SENSOR DISH on a plinth + cyan glow
#   t5  crowning feature       : a glowing NEURAL-DATA BEACON orb + signal arcs + gold
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_uplink(c, cap):
    """t2 — SMALL FUNCTIONAL ADD: a slim DATA-UPLINK MAST rising off the BACK of the
    canopy roof, topped by a magenta pin-light and a couple of signal-tick crossbars
    — the booth starts streaming its captured session out. On-theme (signal), modest,
    base palette + one brightened o/O pin-light. Seated toward the BACK-LEFT of the
    canopy roof so it rises into clear sky and never touches the open front booth."""
    # anchor on the canopy roof at the LEFT corner (u→0 is toward r_left) so the whip
    # rises in clear sky on the FAR LEFT (x≈26), well clear of the t4 dish that later
    # mounts right-of-centre (x≈39) — 13px apart so they never crowd.
    bxf, byf = cap.roof_pt(0.0, 0.40)
    bx = int(round(bxf))
    base_y = int(round(byf))
    top = base_y - 11                     # tall slim whip, well into clear sky
    top = max(top, 1)
    # mast shaft: lit M with a K shadow edge, a small K foot collar on the roof
    c.line((bx, base_y), (bx, top), "M")
    c.line((bx + 1, base_y), (bx + 1, top + 2), "K")
    c.set(bx, base_y, "K"); c.set(bx + 1, base_y, "K")
    # two signal-tick crossbars (the antenna reads as a data whip, not a flagpole)
    c.line((bx - 2, top + 4), (bx + 2, top + 4), "L")
    c.line((bx - 1, top + 7), (bx + 2, top + 7), "M")
    # magenta pin-light cap + a tiny O spark = live uplink
    c.set(bx, top, "o")
    c.set(bx, top - 1, "O")
    c.set(bx + 1, top, "r")


def stage3_annex(c, fin):
    """t3 — STRUCTURAL ADD: a tall slim RECORDING / CAMERA ANNEX tower bolted onto the
    BACK-RIGHT, rising off (and just behind) the existing side-fin so it extends the
    suite's massing upward without crowding the booth. A real new structural Box (not
    a prop): M/D indigo walls, a glowing c data-slit on its lit face, and a small
    swivel CAMERA head leaning out toward the booth. Introduces the matured deep-indigo
    `b` tone on the camera arm / shaded base shadow."""
    # seat the annex on the back-right: lift its apex up + slightly right off the fin's
    # back-top corner so it stacks behind the fin and reads as a taller back tower.
    apex = (fin.top[0] + 1, fin.top[1] - 12)
    tower = Box(top=apex, wx=3, wy=3, h=18)
    tower.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # a glowing c reception/recording data-slit high on the lit LEFT face
    tower.window(c, "left", 0.26, 0.74, 2.2, 9.5, glass="c", hi="h", shade="G", mullions=1)
    # K rivet seam down the lit front vertical edge (reads as a built tower)
    for vv in (3, 7, 11, 15):
        c.set(int(round(tower.r_left[0])), int(round(tower.r_left[1])) + vv, "K")
    # --- swivel CAMERA head perched ON the tower's front roof corner, leaning FORWARD
    #     over the front edge toward the booth (the suite is now RECORDING the session).
    #     Sat directly on the tower roof (the topmost back-right mass here) so it can
    #     never be occluded, with the lens barrel poking out the booth-facing front. ---
    axf, ayf = tower.roof_pt(0.5, 0.30)              # front-ish point on the tower roof
    ax, ay = int(round(axf)), int(round(ayf))
    # a tiny K/b pan-tilt mount stub on the roof
    c.set(ax, ay, "K"); c.set(ax, ay - 1, "b")
    # camera body: a small K-framed M/D box sitting on the stub, lens out the front-left
    cbx, cby = ax - 2, ay - 4
    _stamp(c, cbx, cby, [
        ".KKK",
        "KMMK",    # lit top of the camera housing
        "KDDK",    # shaded body
        "cK.K",    # c lens barrel poking out the booth-facing front-left corner
    ])
    c.set(cbx - 1, cby + 3, "h")                      # lens front glint (catches light)
    return tower


def stage4_dish(c, cap, wall):
    """t4 — MAJOR ADD: a prominent rooftop SCANNING SENSOR DISH on a tilt-mount —
    a parabolic data dish whose CONCAVE cup we look down into, aimed up-front, with a
    feed-horn on a tripod at its focus, all on a short K/b/D mast + plinth bolted to
    the canopy roof so it reads as built-on (not a floating blob). The suite now
    actively SCANS / aggregates signal. Palette matures: deep `b` dish back-shell +
    plinth, energized signal-cyan `e/E` on the concave reflective cup. Pushed RIGHT of
    the t2 uplink mast and kept fully on-canvas + clear of the open booth.

    The dish READS as a dish (not a cloud) via: a crisp K elliptical rim; a CONCAVE
    shade across the cup (darker `b` back-top half + bright `e/E` lower-front lip =
    the lit inside of a bowl); a visible mast/plinth; and a tripod feed-horn at focus."""
    import math
    # plinth seated on the canopy roof, pushed RIGHT-of-centre so it clears the t2
    # uplink mast (which sits back-left at roof_pt(0.30,0.74)).
    pxf, pyf = cap.roof_pt(0.66, 0.42)
    px = int(round(pxf))
    roof_y = int(round(pyf))
    # a slim LIGHT pylon (M lit / D shade, K foot) lifting the dish UP off the roof so
    # the dish floats high + clear — a light pylon avoids the heavy dark bar a wide
    # b plinth made. Two short outrigger feet seat it on the roof.
    dcx, dcy = px + 1, roof_y - 9         # dish FACE centre, up on the pylon
    c.line((px, roof_y), (px, dcy + 3), "M")
    c.line((px + 1, roof_y), (px + 1, dcy + 3), "D")
    c.set(px, roof_y, "K"); c.set(px + 1, roof_y, "K")
    c.set(px - 1, roof_y, "D"); c.set(px + 2, roof_y, "D")   # outrigger feet
    # DISH FACE: a satellite dish tilted toward the VIEWER so we see mostly its bright
    # CONCAVE inner reflective face — a near-round ellipse (rx≈ry so it reads as a disc,
    # not a bar), filled as a bowl that brightens toward the lower-front lip (E) from a
    # mid cyan (e) up-back, with a single darker G rim-shadow arc seating the cup. NO
    # dark back-shell band (that read as a separate lump); the rim is a crisp K ellipse.
    rx, ry = 6, 5
    for yy in range(-ry, ry + 1):
        t = 1 - (yy / ry) ** 2
        if t < 0:
            continue
        half = rx * (t ** 0.5)
        for xx in range(int(-half), int(half) + 1):
            X, Y = dcx + xx, dcy + yy
            if not (0 <= X <= 63 and 0 <= Y <= 63):
                continue
            # concave shade: brighten toward lower-front lip; faint G near the rim
            rr = (xx / rx) ** 2 + (yy / ry) ** 2
            ny = yy / ry
            if rr > 0.78:
                ch = "G"                    # rim-shadow ring (seats the cup)
            elif ny > 0.25:
                ch = "E"                    # bright lit lower-front inner face
            else:
                ch = "e"                    # mid cyan upper cup
            c.set(X, Y, ch)
    # a small bright E specular glint in the upper-left of the cup (reflective tell)
    c.set(dcx - 2, dcy - 2, "E"); c.set(dcx - 1, dcy - 2, "W")
    # crisp K elliptical rim outline (this is what makes it read as a dish, not a blob)
    for a in range(0, 360, 8):
        X = dcx + rx * math.cos(math.radians(a))
        Y = dcy + ry * math.sin(math.radians(a))
        if 0 <= X <= 63 and 0 <= Y <= 63:
            c.set(int(round(X)), int(round(Y)), "K")
    # FEED-HORN on a single ARM crossing UP-FRONT from the lower rim to the focus in
    # front of the cup — one clean M arm + one bright focus dot (legible, not a drip).
    fx, fy = dcx + 1, dcy + 1             # focus, just in front of the cup centre
    c.line((dcx - 3, dcy + 4), (fx, fy), "M")        # feed arm up from lower-left rim
    c.set(dcx - 3, dcy + 4, "K")
    c.set(fx, fy, "E")                               # glowing feed-horn (signal focus)
    c.set(fx + 1, fy, "e")


def stage5_beacon(c, cap, wall, slab):
    """t5 — CROWNING FEATURE = FULLY EVOLVED cognitive-observation suite. A glowing
    NEURAL-DATA BEACON — a bright cyan orb wrapped in two signal-halo rings — crowns
    the dish on a short plinth, throwing a couple of forked SIGNAL ARCS down toward the
    booth + the uplink mast (the suite is now a live aggregating data node), and the
    whole suite is dressed out in GOLD premium trim (a canopy-lip ridge banner + a
    gold finial pennant on the uplink mast). Reads as elite, still recognizably the
    same interview booth, just maxed out. Re-anchors off the SAME canopy roof point the
    dish used so the beacon stacks cleanly on top of it (no second hardcoded guess)."""
    import math
    # --- beacon orb mounted ABOVE the t4 dish: recompute from the dish's own anchor
    #     (cap.roof_pt(0.66,0.40)) so it stacks on the dish, then rise CLEARLY above it
    #     with a visible neck gap so the orb reads as a discrete element, not fused to
    #     the dish cup. ---
    pxf, pyf = cap.roof_pt(0.66, 0.42)
    px = int(round(pxf))
    roof_y = int(round(pyf))
    dcx, dcy = px + 1, roof_y - 9          # the dish FACE centre (same as stage4)
    ocx, ocy = dcx + 2, dcy - 13           # SMALL beacon orb high above the dish
    ocy = max(ocy, 3)
    # a slim b/K neck-mast from the dish TOP rim up to the orb — a CLEAR tall gap (the
    # orb sits ~5px above the dish rim) so the small orb reads as a beacon finial
    # CROWNING the larger dish, not fused to it.
    c.line((dcx + 1, dcy - 5), (ocx, ocy + 3), "b")
    c.line((dcx + 2, dcy - 5), (ocx + 1, ocy + 3), "K")
    c.set(dcx + 1, dcy - 5, "K")
    # ONE clean signal-halo ring around the SMALL orb (energized cyan, compact 2:1
    # ellipse) — distinctly smaller than the dish so the two read as dish + beacon.
    for a in range(0, 360, 30):
        X = ocx + 3 * math.cos(math.radians(a))
        Y = ocy + 3 * 0.5 * math.sin(math.radians(a))
        if 0 <= X <= 63 and 0 <= Y <= 63:
            c.set(int(round(X)), int(round(Y)), "e")
    # bright cyan beacon CORE — a compact 3px-ish bright node (smaller than the dish).
    for xx, yy, ch in [(0, 0, "W"), (-1, 0, "E"), (1, 0, "E"), (0, -1, "E"), (0, 1, "E")]:
        X, Y = ocx + xx, ocy + yy
        if 0 <= X <= 63 and 0 <= Y <= 63:
            c.set(X, Y, ch)
    # --- two forked SIGNAL ARCS leaping DOWN-LEFT from the beacon, dropping toward the
    #     booth/mast below (the live data node feeding the suite). Always go DOWN (+y)
    #     so they read as fed signal, not an upward plume. Clamp on-canvas. ---
    arc1 = [(ocx - 2, ocy + 2), (ocx - 4, ocy + 4), (ocx - 6, ocy + 7), (ocx - 7, ocy + 10)]
    arc2 = [(ocx - 1, ocy + 3), (ocx - 2, ocy + 6), (ocx - 3, ocy + 9)]
    for arc in (arc1, arc2):
        for i in range(len(arc) - 1):
            a0 = (max(0, min(63, arc[i][0])), max(0, min(63, arc[i][1])))
            a1 = (max(0, min(63, arc[i + 1][0])), max(0, min(63, arc[i + 1][1])))
            c.line(a0, a1, "E")
        for px2, py2 in arc:
            if 0 <= px2 <= 63 and 0 <= py2 - 1 <= 63:
                c.set(px2, py2 - 1, "e")

    # --- GOLD premium trim (t5 flourish only) ---
    # a gold ridge banner hung along the canopy's lit front-left lip (over the magenta
    # accent strip — the suite's eave is now gilded)
    c.line(cap.left_pt(0.10, 0.4), cap.left_pt(0.90, 0.4), "q")
    c.set(int(round(cap.left_pt(0.5, 0.0)[0])), int(round(cap.left_pt(0.5, 0.0)[1])), "O")
    # gold corner bosses on the slab front kerb (sparse elite trim on the booth ring)
    cf = slab.r_front
    c.set(int(cf[0]), int(cf[1]) - 1, "O")
    c.set(int(cf[0]) - 1, int(cf[1]), "q")
    c.set(int(cf[0]) + 1, int(cf[1]), "q")
    # a small GOLD finial pennant flying from the t2 uplink-mast top. Recompute from
    # the SAME canopy anchor the mast used (cap.roof_pt(0.0,0.40) raised 11px) so the
    # pennant lands exactly on the mast tip on the FAR LEFT, not a second guess.
    mxf, myf = cap.roof_pt(0.0, 0.40)
    mx = int(round(mxf))
    mtop = int(round(myf)) - 11
    mtop = max(mtop, 1)
    c.line((mx, mtop - 1), (mx, mtop + 2), "K")            # short pennant staff
    fly = [(mx + 1, mtop), (mx + 5, mtop + 1), (mx + 1, mtop + 2)]
    fly = [(max(0, min(63, fx)), max(0, min(63, fyv))) for fx, fyv in fly]
    c.fill_poly(fly, "q")
    c.line(fly[0], fly[1], "O")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the interview room at upgrade `stage` (1..5). Stage 1 is IDENTICAL to
    the shipped base; each higher stage keeps every prior addition and bolts on the
    next (t2 uplink mast → t3 recording annex → t4 sensor dish → t5 beacon+gold).
    Painter's order keeps rooftop/overhead additions on top of the masses they grow
    from, and all additions stay on the BACK masses so the open front booth signature
    is never occluded."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    # painter's order: floor slab (foundation) -> back mirror-wall -> canopy slab ->
    # right side fin -> the two seated figures + voiceprint bubble + ID tag signature
    # standing in the OPEN front booth.
    slab = floor_slab(c)
    wall = mirror_wall(c, slab)
    cap = canopy(c, wall)
    fin = side_fin(c, slab)
    signature(c, slab)

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    # Draw the recording annex (t3) BEFORE the rooftop dish/beacon (t4/t5) so the
    # back-right tower sits correctly behind the canopy-mounted additions.
    if stage >= 3:
        stage3_annex(c, fin)
    if stage >= 2:
        stage2_uplink(c, cap)
    if stage >= 4:
        stage4_dish(c, cap, wall)
    if stage >= 5:
        stage5_beacon(c, cap, wall, slab)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/mindframe"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "interview-room"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped interview-room.png, so it does NOT overwrite the base PNG."""
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
