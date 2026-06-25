#!/usr/bin/env python3
"""
Survey Distribution Center — MindFrame Lab economy building (BESPOKE form, STANDARD role).

A WIDE LOW DISPATCH DEPOT with a stepped-down loading annex — a mailroom/sorting-
house silhouette, broad and squat, unlike any tower or round sibling. Composed from
isobuild Box/cylinder (NO iso.draw_cube / base_windows):

  * Main depot block: a wide low M/D indigo Box; the LIT-LEFT face carries TWO clean
    Box.window glazed sorting-room panes (spaced apart, soft mullions, g/c glass, h
    sheen) so the sorting floor reads through glass.
  * Loading annex: a smaller, lower Box stepped down off the front-right corner; its
    SHADED RIGHT face is the hero — a wide K-framed loading-dock bay + a GLOWING
    Box.window mailroom window (bright c/O lit interior so it reads on the dark side,
    h reflection) + a Box.louver HVAC vent band (opaque dark slats, NOT glass).
  * Roof: flat M depot roof with a short raised D curb, an o magenta accent strip
    edging the curb; the rooftop rotary dispatch unit sits center-roof on an M drum
    plinth.

Signature (one-of-one): a ROOFTOP ROTARY SURVEY-DISPATCH HOPPER flings out a FAN of
folded questionnaire "darts" (W/L paper, o question-corner) toward the field while
filled RESPONSE CARDS (c/h tick-rows) stream BACK into a D sorting bin with an O
glow, and a magenta RESPONSE-RATE TALLY BOARD (K-framed c/g screen, climbing o/O
bar + % toward a target line) climbs on the roof edge = the diagnosis read.

Draw order: contact shadow + depot block (back) + loading annex -> rooftop rotary
hopper drum + flung dart fan + returning response cards + sorting bin + tally board
-> the GLOWING RIGHT opening (dock bay + mailroom window + louver) on the annex's
SHADED RIGHT face (front).
"""
import os
import sys
import json
import math

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box, cylinder

MIND = {"K": "#181428", "W": "#e8e2f6", "L": "#cabfe6", "M": "#9f90c8", "D": "#6f5fa0", "d": "#4a3c70",
        "h": "#ecc8f4", "c": "#d0a8ee", "g": "#a45ce0", "G": "#6a2fb0",
        "o": "#f08cce", "O": "#ffb8e2", "r": "#b03a80"}


# ── small pixel helper ────────────────────────────────────────────────────────
def _stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings) at top-left (x0,y0).
    '.' = skip (transparent)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


# ── contact shadow pooled under the whole wide footprint (drawn FIRST) ─────────
def ground_shadow(c):
    """A flat iso-ellipse K contact shadow under the broad depot + annex footprint
    so the squat mass feels grounded."""
    scx, scy = 31, 55
    for x in range(scx - 24, scx + 22):
        for y in range(scy - 3, scy + 4):
            ex = (x - scx) / 24.0
            ey = (y - scy) / 3.2
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")


# ── 1. MAIN DEPOT BLOCK — a wide low horizontal dispatch hall ─────────────────
DEPOT = Box(top=(28, 17), wx=12, wy=8, h=11)
# Annex enlarged: its SHADED RIGHT face must be a real working surface (≈14px wide
# × 17px tall on screen) so the THREE hero sub-elements (mailroom window, dock bay,
# louver) can each be K-framed and separated by bare-wall gutters instead of
# collapsing into one muddy blob. r_right=(60,30) and bottom y=54 stay in-frame.
ANNEX = Box(top=(44, 22), wx=8, wy=7, h=17)


def depot_block(c, b):
    """The wide low main depot: M/D indigo walls, flat roof with a short raised D
    curb + an o magenta accent strip along the curb edge. The LIT-LEFT face carries
    TWO spaced glazed sorting-room panes (read the sorting floor through glass)."""
    b.draw(c, roof="M", lwall="M", rwall="D", roof_hi="W", outline="K")

    # raised roof CURB: a short D parapet stepped in 1 unit from the roof edge, with
    # a bright L lit-back edge and an o magenta accent strip running its front lip.
    inset = 0.10
    cL = b.roof_pt(inset, inset)
    cF = b.roof_pt(1 - inset, inset)
    cT = b.roof_pt(inset, 1 - inset)
    cR = b.roof_pt(1 - inset, 1 - inset)
    c.fill_poly([cT, cR, cF, cL], "L")              # lighter recessed roof deck inside curb
    # curb ring (1px) around the deck
    for a, bb in [(cT, cR), (cR, cF), (cF, cL), (cL, cT)]:
        c.line(a, bb, "D")
    c.line(cT, cL, "W")                              # bright lit-back curb edge
    c.line(cT, cR, "W")
    # o magenta accent strip along the FRONT lip of the curb (the roof-edge light)
    c.line(cL, cF, "o")
    c.line(cF, cR, "o")
    c.set(int(round(cF[0])), int(round(cF[1])), "O")  # bright accent node at the front corner

    # --- TWO glazed sorting-room panes on the LIT-LEFT face, spaced apart ---
    # left pane
    b.window(c, "left", 0.10, 0.40, 3.0, 7.4, glass="g", hi="h", shade="G", mullions=1, sheen="W")
    # right pane (clear wall gap between them)
    b.window(c, "left", 0.56, 0.86, 3.0, 7.4, glass="c", hi="h", shade="G", mullions=1, sheen="W")
    # a thin D base skirt board along the lit face foot so it sits like a loading hall
    c.line(b.left_pt(0.04, b.h - 0.4), b.left_pt(0.96, b.h - 0.4), "d")
    return b


# ── 2. LOADING ANNEX — a smaller, lower Box stepped down off the front-right ───
def loading_annex(c, b):
    """A smaller, lower Box abutting the depot's front-right corner — the stepped-
    down loading annex. Drawn AFTER the depot so it sits in front. M/D indigo. Its
    SHADED RIGHT face becomes the hero opening (handled in right_opening); here we
    just lay the mass + a plain lit-left face so the right face carries the glow."""
    b.draw(c, roof="M", lwall="M", rwall="D", roof_hi="W", outline="K")
    # a small D parapet lip on the annex roof to echo the depot curb
    c.line(b.r_top, b.r_left, "W")
    c.line(b.r_top, b.r_right, "L")
    # plain lit-left annex face: a single small high vent slit (kept plain per spec)
    c.line(b.left_pt(0.28, 2.4), b.left_pt(0.66, 2.4), "d")
    c.line(b.left_pt(0.28, 3.2), b.left_pt(0.66, 3.2), "D")
    c.line(b.left_pt(0.28, 4.0), b.left_pt(0.66, 4.0), "d")
    return b


# ── 3. SIGNATURE: rooftop rotary hopper + dart fan + returning cards + tally ───
def rotary_hopper(c, b):
    """The rooftop rotary survey-dispatch HOPPER: a low M/D drum on a small M plinth
    centred on the depot roof, with an o rim and a small c spinner vane plus h/c
    motion-blur ghost pixels — a hopper, explicitly NOT a carousel. Returns
    (left_mouth, right_mouth) chute points: darts fling from the LEFT mouth up into
    open sky; response cards return into the RIGHT mouth."""
    # plinth centre on the depot roof, shifted LEFT-back so the LEFT chute has open-sky
    # headroom for the dart fan and the RIGHT-front roof stays clear for the sort bin.
    pc = b.roof_pt(0.40, 0.56)
    px, py = int(round(pc[0])), int(round(pc[1]))

    # small M plinth (a squat iso pad the drum sits on)
    _stamp(c, px - 4, py - 1, [
        ".MMMMM.",
        "MMMMMMM",
        ".DDDDD.",
    ])
    c.line((px - 3, py + 1), (px + 3, py + 1), "d")

    # the HOPPER DRUM: a short cylinder on the plinth (round, lit-left/shaded-right)
    dcx = px
    dtop = py - 7
    cylinder(c, dcx, dtop, rx=4, h=5, top="L", side_l="M", side_r="D", outline="K", ry=2)
    # o magenta rim around the drum top (the dispatch rim light)
    for a in range(0, 360, 18):
        x = dcx + 4 * math.cos(math.radians(a))
        y = dtop + 2 * math.sin(math.radians(a))
        c.set(x, y, "o")
    # a small c SPINNER VANE across the drum top + h/c motion-blur ghosts (spinning)
    c.line((dcx - 3, dtop), (dcx + 3, dtop), "c")
    c.line((dcx - 2, dtop - 1), (dcx + 2, dtop + 1), "h")   # ghost vane (offset)
    c.set(dcx, dtop, "O")                                    # bright hub
    c.set(dcx - 2, dtop - 1, "h")                            # motion-blur ghosts
    c.set(dcx + 2, dtop + 1, "c")
    # LEFT dispatch chute spout (darts fling up-LEFT from here, into open sky)
    c.set(dcx - 4, dtop, "K")
    c.set(dcx - 5, dtop - 1, "M")
    c.set(dcx - 5, dtop, "K")
    # RIGHT intake chute lip (cards return into here)
    c.set(dcx + 4, dtop + 1, "K")
    c.set(dcx + 5, dtop + 1, "D")
    return (dcx - 5, dtop - 1), (dcx + 5, dtop + 1)


def dart_fan(c, left_mouth):
    """The OUTGOING questionnaire darts: a clean SPACED FAN of 5 DISCRETE folded-paper
    darts flung UP-and-LEFT from the hopper's left chute toward the field. Each dart is
    a small W/L paper CHEVRON (a flat folded triangle, point aimed up-LEFT = flight
    direction) wrapped in a 1px K edge so it reads as a crisp paper object, with a
    clear GAP of bare canvas between every dart — so the eye reads five separate darts,
    NOT a continuous spray/steam plume. The fan flies higher + spreads as it goes out."""
    mx, my = left_mouth

    # a 5-wide folded-paper dart CHEVRON pointing up-LEFT, with a clean K outline edge.
    #   ".KK.."   leading K nose
    #   "KbbK."   bright paper body
    #   ".KffK"   fold seam (darker) + K trailing edge
    #   "..oK."   tiny o question-corner dot at the tail
    def dart(cx, cy, body, fold):
        if not (2 <= cx < 60 and 3 <= cy < 60):
            return
        _stamp(c, cx - 2, cy - 1, [
            ".KK..",
            "K" + body + body + "K.",
            ".K" + fold + fold + "K",
            "..oK.",
        ])

    # (dx, dy, body, fold) anchored off the chute mouth — clearly spaced, no overlap.
    darts = [
        (-4, -1, "W", "L"),
        (-8, -4, "L", "M"),
        (-12, -2, "W", "L"),
        (-15, -6, "L", "M"),
        (-19, -4, "W", "L"),
    ]
    for dx, dy, body, fold in darts:
        dart(mx + dx, my + dy, body, fold)


def return_cards(c, b, right_mouth):
    """The RETURNING response cards: 3 DISTINCT flat c/h survey cards dropping back DOWN
    into a clearly-shaped, K-WALLED sorting BIN on the roof's front-right deck — sited
    well clear of both the hopper (centre-roof) and the tally board (far-right edge) so
    nothing collides. The bin is an open trough with thick K side walls, a d body and an
    O glow rim; each card is a flat c rectangle with an h sheen edge and a K/d tick-row,
    separated by a clear gap so they read as three falling cards, not a glyph column."""
    # sorting BIN on the roof's front-right deck — an OPEN trough with thick K walls,
    # d body, O glow rim catching the incoming cards. Sited at x≈35-41 so it clears the
    # hopper drum (ends ≈x35) on the left and the tally board (≈x43) on the right.
    bp = b.roof_pt(0.80, 0.44)
    bx, by = int(round(bp[0])), int(round(bp[1]))
    _stamp(c, bx - 3, by, [
        "KOOOOK",   # O glow rim along the open mouth (catching the dropped cards)
        "Kd..dK",   # open recessed mouth (dark interior visible)
        "KdddoK",   # bin body with an o glow at one corner
        "KKKKKK",   # bin floor
    ])
    # fill the open mouth interior with dark d so the bin reads as a real container
    c.set(bx - 1, by + 1, "d"); c.set(bx, by + 1, "d")

    # 2 RESPONSE CARDS dropping straight down toward the bin mouth, clearly separated
    # by a gap; each a flat c card with an h sheen edge + a K/d tick-row (a filled form).
    cards = [
        (bx - 2, by - 9),
        (bx - 2, by - 5),
    ]
    for cx, cy in cards:
        if not (1 <= cx < 59 and 1 <= cy < 59):
            continue
        _stamp(c, cx, cy, [
            "KKKKK",
            "KhhcK",   # card top: h sheen edge
            "KKdcK",   # tick row
            "KKKKK",
        ])


def tally_board(c, b):
    """The magenta RESPONSE-RATE TALLY BOARD on the roof's right edge: a small
    K-framed c/g data screen with a climbing o/O bar + a % mark rising toward a
    target line = the diagnosis of how the field is responding (MindFrame data-glow
    screen). Sits on a thin D post off the roof curb."""
    tp = b.roof_pt(0.90, 0.70)
    tx, ty = int(round(tp[0])), int(round(tp[1]))
    by = ty                      # board sits a few px above the roof on a post
    bx = tx
    bty = by - 11                # board top (board height 8 → post spans bty+8..by)
    # SOLID, SHORT 3px-wide mounting post planted ON the roof up to the board's
    # underside, so the board reads firmly MOUNTED on the building (not hovering).
    post_top = bty + 8
    for yy in range(post_top, by + 2):
        c.set(bx + 2, yy, "d")
        c.set(bx + 3, yy, "D")
        c.set(bx + 4, yy, "d")
    # a wider K foot pad seating the post on the roof
    c.set(bx + 2, by + 2, "K"); c.set(bx + 3, by + 2, "K"); c.set(bx + 4, by + 2, "K")

    # the K-framed data SCREEN (a c/g glow panel)
    _stamp(c, bx, bty, [
        "KKKKKKKK",
        "KgggggcK",
        "KgccccgK",
        "KGggggGK",
        "KGGGGGGK",
        "KGGGGGGK",
        "KGGGGGGK",
        "KKKKKKKK",
    ])
    # climbing o/O response-rate BAR rising up the screen (left columns) toward target
    # bars of increasing height = the rate climbing
    bars = [(1, 2), (2, 3), (3, 4), (4, 5)]   # (col, height)
    for col, hgt in bars:
        for k in range(hgt):
            yy = bty + 6 - k
            c.set(bx + col, yy, "o" if k < hgt - 1 else "O")
    # a target LINE near the top (the diagnosis goal) — bright h dashes
    c.set(bx + 1, bty + 1, "h"); c.set(bx + 3, bty + 1, "h"); c.set(bx + 5, bty + 1, "h")
    # a tiny % glyph (O) at the top-right of the screen = the response-rate read
    c.set(bx + 6, bty + 2, "O")
    c.set(bx + 5, bty + 2, "o")


# ── 3b. ROOFTOP VENT BOX — the unmistakable opaque louver (NOT on a sheared face) ─
def roof_vent_box(c, b):
    """A small standalone HVAC VENT BOX sitting on the depot roof in a clear empty
    back-left spot (clear of the hopper drum, sort bin and tally board). Its LIT-LEFT
    face — which is NOT sheared away from the viewer the way the annex right face is —
    carries a HIGH-CONTRAST louver: a dark d/K body with 3 stacked horizontal slats,
    each a 1px K shadow line directly above a 1px bright W/L highlight line, framed in
    K. On this flatter lit face the horizontal slat lines hold and read at a glance as
    an opaque, slatted vent that is unmistakably NOT glass (no h/c/g tint, no glow).

    Drawn directly so the slats land on exact pixel rows (a small hand-stamped box) —
    its iso footprint matches the roof's 2:1, seated on the roof with a K base shadow."""
    # seat point: the QUIET BACK-LEFT roof wing, between the left roof corner and the
    # hopper drum (centre ≈x30). The box occupies x≈17–25, clear of the hopper (x≈26–34),
    # the sort bin (0.80,0.44≈x38) and the tally board (0.90,0.70≈x45). Low-u + low-v
    # tucks it into the back-left deck, not over the hopper and not over the front edge.
    sp = b.roof_pt(0.10, 0.34)
    sx, sy = int(round(sp[0])), int(round(sp[1]))

    # K contact shadow under the box on the roof (grounds it, separates from roof)
    _stamp(c, sx - 1, sy + 5, [
        ".KKKKKK.",
        "KKKKKKKK",
        ".KKKKKK.",
    ])

    # ── the VENT BOX: a small iso prism hand-stamped so slat rows are pixel-exact ──
    # Top dark cap (the roof of the vent box) — a small 2:1 diamond in D/d.
    _stamp(c, sx, sy - 4, [
        "...KK...",
        "..KDDK..",
        ".KDDDDK.",
        "KDDDDDDK",
        ".KDDDDK.",
        "..KDDK..",
        "...KK...",
    ])

    # LIT-LEFT face of the box (the wide flat panel facing down-left toward viewer):
    # an opaque LOUVER — d/K body framed in K, with 3 bold slats. Each slat = a 1px K
    # shadow line sitting directly above a 1px bright W highlight line. This K-over-W
    # pairing is what survives at small scale and reads as an opaque vent blade.
    # 8px wide × 8px tall lit panel, dropping down-left from the box's front-left edge.
    _stamp(c, sx - 1, sy + 1, [
        "KKKKKKKK",   # K top frame
        "KddddddK",   # d body
        "KKKKKKKK",   # slat 1 — K shadow
        "KWWWWWWK",   # slat 1 — W highlight
        "KddddddK",   # d body gap
        "KKKKKKKK",   # slat 2 — K shadow
        "KWWWWWWK",   # slat 2 — W highlight
        "KddddddK",   # d body gap
        "KKKKKKKK",   # slat 3 — K shadow
        "KLLLLLLK",   # slat 3 — L highlight (slightly cooler, foot of vent)
        "KKKKKKKK",   # K bottom frame
    ])

    # SHADED-RIGHT face of the box (a thin sliver to the right) — plain dark d so the
    # box reads 3-D but the louver clearly lives on the lit face only.
    _stamp(c, sx + 7, sy + 1, [
        "Kd",
        "Kd",
        "Kd",
        "Kd",
        "Kd",
        "Kd",
        "Kd",
        "Kd",
        "Kd",
        "Kd",
        "KK",
    ])


# ── 4. THE GLOWING RIGHT OPENING — hero mailroom + dock bay on the SHADED face ─
def right_opening(c, b):
    """The hero working face on the annex's SHADED RIGHT face — a big enough surface
    (≈14px wide × 17px tall) to hold THREE clearly-SEPARATE, individually K-framed
    sub-elements with BARE-WALL (M/D) gutter rows between them so none of them touch
    and the eye reads three distinct things, NOT one glow:

       UPPER-LEFT  : a GLOWING Box.window MAILROOM WINDOW (bright c/h glass, an O-lit
                     interior glow behind it, a clean square K frame) — glows on the dark.
       UPPER-RIGHT : a K-framed LOADING-DOCK BAY — a deep dark (d) recessed opening with
                     a warm o sill glow at its foot + a staged crate inside. Foot RAISED
                     so a full-width opaque vent band fits cleanly below it.
       BOTTOM-BAND : a WIDE OPAQUE LOUVER vent spanning the full lower face — a dark d
                     body with clearly ALTERNATING K slat-shadow / M highlight slat lines
                     + a K frame. Wide enough that 3-4 horizontal slats read at a glance;
                     a bare M/D wall gutter separates it from the window + dock above.
                     NOT glass, NOT glow — opaque slats only.

    Drawn LAST (front-most). The face runs u: r_front→r_right (0..1), v px down.
    The depot-side gutter (low u) and the silhouette edge (high u) are kept clear."""
    pt = b.right_pt

    # ── Repaint the whole working face as CLEAN shaded `D` wall first, so the window /
    # dock / louver each sit on quiet wall with crisp 1px gutters and no leftover
    # d/M/o speckle from earlier passes muddies the seams between them. ──────────────
    c.fill_poly([pt(0.04, 2.6), pt(0.96, 2.6), pt(0.96, b.h - 0.4), pt(0.04, b.h - 0.4)], "D")

    # ── UPPER-RIGHT: COMPACT K-FRAMED LOADING-DOCK BAY (upper portion only) ──────────
    # Kept short (foot at v≈8.6) so the WIDE louver band owns the whole lower face.
    du0, du1, dv0, dv1 = 0.50, 0.93, 3.0, 8.6
    c.fill_poly([pt(du0, dv0), pt(du1, dv0), pt(du1, dv1), pt(du0, dv1)], "K")   # K frame ring
    # deep DARK recessed dock interior inside the K frame (the opening)
    c.fill_poly([pt(du0 + 0.05, dv0 + 0.9), pt(du1 - 0.05, dv0 + 0.9),
                 pt(du1 - 0.05, dv1 - 0.5), pt(du0 + 0.05, dv1 - 0.5)], "d")
    # roll-up-door header lintel just under the K top frame (reads as a dock door)
    c.line(pt(du0 + 0.06, dv0 + 0.7), pt(du1 - 0.06, dv0 + 0.7), "r")
    # warm o sill glow pooled along the dock FOOT (lit loading floor) + bright O sill
    c.fill_poly([pt(du0 + 0.08, dv1 - 1.5), pt(du1 - 0.08, dv1 - 1.5),
                 pt(du1 - 0.08, dv1 - 0.6), pt(du0 + 0.08, dv1 - 0.6)], "o")
    c.line(pt(du0 + 0.08, dv1 - 0.55), pt(du1 - 0.08, dv1 - 0.55), "O")          # bright sill

    #  ↑ bare M/D wall GUTTER at u≈0.44–0.50 keeps the dock clear of the window column ↑

    # ── UPPER-LEFT: GLOWING MAILROOM WINDOW — framed glass that GLOWS on the dark ──
    # The O-lit interior glow is kept INSIDE the glass footprint so it does NOT leak
    # past the K frame — the frame stays a clean square rectangle.
    wu0, wu1, wv0, wv1 = 0.10, 0.42, 3.0, 8.6
    c.fill_poly([pt(wu0 + 0.03, wv0 + 0.4), pt(wu1 - 0.03, wv0 + 0.4),
                 pt(wu1 - 0.03, wv1 - 0.4), pt(wu0 + 0.03, wv1 - 0.4)], "O")
    b.window(c, "right", wu0, wu1, wv0, wv1,
             glass="c", hi="h", shade="g", frame="K", mullions=0, sheen="h")

    #  ↑ bare M/D wall GUTTER (v≈8.6–10.2) separates the window + dock from the foot ↓
    #
    # NOTE: the opaque vent is NO LONGER drawn on this sheared right face — the iso
    # shear flattened its horizontal slats so they kept reading as wall, not louver
    # (rounds 2–3 blocker). The vent now lives as a bold standalone ROOF VENT BOX
    # (see `roof_vent_box`) whose slats sit on its LIT-LEFT face, which is NOT sheared
    # away from the viewer and so reads unmistakably as an opaque slatted vent. The
    # lower face below the window/dock stays clean shaded `D` wall (a quiet skirt) with
    # just a thin `d` base line so the foot reads as a grounded loading skirt.
    c.line(pt(0.06, b.h - 0.5), pt(0.94, b.h - 0.5), "d")   # thin base skirt line


def build():
    c = Canvas()
    ground_shadow(c)            # contact shadow under the whole broad footprint
    depot_block(c, DEPOT)       # wide low main depot (back) + lit-left glass panes + roof curb
    loading_annex(c, ANNEX)     # stepped-down loading annex at front-right
    # SIGNATURE on the roof (drawn over the depot, before the front opening):
    left_mouth, right_mouth = rotary_hopper(c, DEPOT)  # rotary dispatch hopper drum + spinner
    dart_fan(c, left_mouth)              # flung fan of questionnaire darts (out UP-LEFT)
    return_cards(c, DEPOT, right_mouth)  # returning response cards -> sorting bin (in RIGHT)
    tally_board(c, DEPOT)                # climbing response-rate tally board (roof right edge)
    roof_vent_box(c, DEPOT)     # bold standalone ROOF VENT BOX: opaque louver on its LIT face
    right_opening(c, ANNEX)     # GLOWING dock bay + mailroom window (SHADED RIGHT, front)

    spec = {"width": 64, "height": 64, "palette": MIND, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/mindframe_survey-distribution-center.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
