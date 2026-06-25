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
"""
import os
import sys
import json

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box, cylinder, RX, RY, LX, LY

MIND = {"K": "#181428", "W": "#e8e2f6", "L": "#cabfe6", "M": "#9f90c8", "D": "#6f5fa0", "d": "#4a3c70",
        "h": "#ecc8f4", "c": "#d0a8ee", "g": "#a45ce0", "G": "#6a2fb0",
        "o": "#f08cce", "O": "#ffb8e2", "r": "#b03a80"}


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


def build():
    c = Canvas()
    # painter's order: floor slab (foundation) -> back mirror-wall -> canopy slab ->
    # right side fin -> the two seated figures + voiceprint bubble + ID tag signature
    # standing in the OPEN front booth.
    slab = floor_slab(c)
    wall = mirror_wall(c, slab)
    canopy(c, wall)
    side_fin(c, slab)
    signature(c, slab)

    spec = {"width": 64, "height": 64, "palette": MIND, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/mindframe_interview-room.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
