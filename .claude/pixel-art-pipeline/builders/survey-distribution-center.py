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

═══════════════════════════════════════════════════════════════════════════════════
UPGRADE-EVOLUTION pass (same code pattern as interview-room.py / workshop.py:
build(stage) + cumulative stageN helpers + emit/build_all). The wide DISPATCH DEPOT
grows into a full multi-channel SURVEY-RELAY hub. The evolution language is the lab's
"distribute + collect signal" motif: more outbound chutes/forms, a return-intake
path, a throughput silo, and finally a multi-beam relay array. The lab's magenta
`o/O` stays the DISPATCH/light accent; the evolved DATA glow is cool SIGNAL-CYAN
`e/E` (the climbing-forms conveyor + outbound relay fans), kept distinct from the
intake `g`. Colours mature stage by stage; gold (`q`) is a t5 flourish only.

  t2  small functional add : a roof-mounted MAILROOM DISPATCH OUTFLOW STACK (slim M/D
                             riser + outflow cowl beside the hopper) puffing forms out +
                             a brighter o/O dispatch light on the hopper rim
  t3  structural add       : a stepped RESPONSE-INTAKE ANNEX on the right kiosk — a low
                             `b` box of glowing `g` returned-form slots (a return path)
  t4  major add            : a tall DISTRIBUTION-TOWER SILO beside the hopper with a
                             glowing cyan `e` conveyor-window of forms climbing it +
                             a wider broadcast array fan on top
  t5  crowning feature     : the broadcast mast becomes a multi-beam SURVEY-RELAY ARRAY
                             — three bright `E` outbound fans + a flock of forms in
                             flight, gold `q` array ribs + a gold silo weathervane
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

# Base MindFrame palette (shared keys) + the EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so survey-distribution-center.png
# is unchanged). These exact evolved keys are the lab-wide set shared by all 10
# mindframe buildings for consistency:
#   b  deep indigo steel — matured structure tone for the t3 intake annex / t4 silo
#   e  energized signal-cyan glow (mid)   E  signal-cyan glow (bright) — t4 conveyor / t5 relay
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
MIND = {"K": "#181428", "W": "#e8e2f6", "L": "#cabfe6", "M": "#9f90c8", "D": "#6f5fa0", "d": "#4a3c70",
        "h": "#ecc8f4", "c": "#d0a8ee", "g": "#a45ce0", "G": "#6a2fb0",
        "o": "#f08cce", "O": "#ffb8e2", "r": "#b03a80",
        "b": "#2b2440", "e": "#7fd4ff", "E": "#d6f4ff", "q": "#f3c63a"}


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


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS dispatch / intake
# / throughput / relay structure onto the prior form — never restarts, never recolors
# the whole building. Theme: the wide dispatch depot grows into a multi-channel
# SURVEY-RELAY hub. Rooftop additions are drawn AFTER the base roof signature and
# placed so they NEVER occlude the hero rotary hopper drum + spinner (centre roof) or
# the outbound dart-fan (up-LEFT sky). The lab's magenta o/O stays the dispatch accent;
# the evolved DATA glow is cool signal-cyan e/E (conveyor + relay), the intake glow is
# g. Colours mature stage by stage; gold (q) is a t5 flourish only.
#
#   t2  small functional add : a roof-mounted MAILROOM DISPATCH OUTFLOW STACK beside the
#                              hopper (slim M/D riser + cowl) puffing forms + brighter o/O rim
#   t3  structural add       : a stepped RESPONSE-INTAKE ANNEX (b box, glowing g slots)
#   t4  major add            : a tall DISTRIBUTION-TOWER SILO + cyan e conveyor + array fan
#   t5  crowning feature     : a multi-beam SURVEY-RELAY ARRAY (3 E fans) + gold ribs/vane
# ═══════════════════════════════════════════════════════════════════════════════

def _drum_anchor(b):
    """Recompute the rotary hopper's drum centre + top from the SAME source point the
    base `rotary_hopper` uses (b.roof_pt(0.40,0.56)), so every stage that references the
    drum/silo re-derives it from one place instead of a second hardcoded guess."""
    pc = b.roof_pt(0.40, 0.56)
    px, py = int(round(pc[0])), int(round(pc[1]))
    return px, py - 7          # (drum centre x, drum top y) — matches rotary_hopper


def stage2_dispatch_stack(c, b, left_mouth):
    """t2 — SMALL FUNCTIONAL ADD: a real NEW MASS bolted ON the depot roof — a short
    MAILROOM DISPATCH OUTFLOW STACK: a slim M/D riser seated on the roof in the clear
    corridor just LEFT of the rotary hopper drum, capped by a wider outflow COWL with a
    bright o/O dispatch glow at its mouth, puffing two outbound FORM-SHEETS up toward the
    field. This is the depot's mail venting harder (a second dispatch outlet) — unique to
    a survey/distribution depot, clearly NEW geometry on the building, and it stays drawn
    cumulatively at t3–t5. Rounds 1's add was only floating-decoration in the dart trail
    (no on-mass element); this replaces it with a mounted structural stub. Base palette
    only (the o/O at the cowl mouth is the lab's own dispatch accent).

    Sited in the surveyed clear gap x≈25–27, y up to ≈10 (open sky between the back-left
    roof vent box, x≤24, and the hopper drum crown, x≥29) so it rises clear WITHOUT
    touching or occluding the hero hopper drum + spinner."""
    dcx, dtop = _drum_anchor(b)                  # drum centre x ≈30, top y ≈18

    # (a) a brighter DISPATCH LIGHT on the existing hopper rim — a bright O front-rim
    #     beacon so the hopper reads 'powered up' alongside the new outlet (the rim
    #     already carries an o ring; this just hot-spots its front, no recolor).
    c.set(dcx, dtop + 2, "O")
    c.set(dcx - 1, dtop + 2, "o")
    c.set(dcx + 1, dtop + 2, "o")

    # (b) THE NEW DISPATCH OUTFLOW STACK — a 3px riser seated on the roof, LEFT of the
    #     drum. Base on the roof at y≈19; body rises up the clear x25–27 corridor to a
    #     cowl cap at y≈10. Lit-left M, shaded-right D, crisp K silhouette, with two
    #     corrugation bands so it reads as a built metal stack (not a bar).
    sx = dcx - 5                                 # ≈25 — left edge of the riser
    base_y = dtop + 1                            # ≈19 — seats on the roof beside the drum
    top_y = 10                                   # cowl-neck top in clear sky (well above roof)
    for yy in range(top_y, base_y + 1):
        if not (0 <= yy <= 63):
            continue
        c.set(sx, yy, "K")                       # left silhouette edge
        c.set(sx + 1, yy, "M")                   # lit-left body
        c.set(sx + 2, yy, "D")                   # shaded-right body
    for yy in (top_y + 4, top_y + 7):            # two corrugation bands across the body
        c.set(sx + 1, yy, "D")
        c.set(sx + 2, yy, "d")
    c.set(sx, base_y, "K"); c.set(sx + 2, base_y, "K")   # foot collar seating it on the roof
    # outflow COWL cap — a wider lip flaring out over the stack mouth (lit L, K rim)
    cowl_y = top_y - 1
    for xx in range(sx - 1, sx + 4):
        if 0 <= xx <= 63 and 0 <= cowl_y <= 63:
            c.set(xx, cowl_y, "L")
    c.set(sx - 1, cowl_y, "K"); c.set(sx + 3, cowl_y, "K")
    c.line((sx - 1, top_y), (sx + 3, top_y), "K")        # cowl underside rim
    # bright o/O dispatch glow pooled at the cowl mouth (the outlet firing)
    c.set(sx + 1, top_y, "O")
    c.set(sx, top_y, "o"); c.set(sx + 2, top_y, "o")

    # (c) two outbound FORM-SHEETS puffing UP-LEFT out of the new cowl mouth toward the
    #     field (flat c/h folded sheets, distinct from the W/L hopper darts), so the new
    #     outlet visibly DISPATCHES. Anchored on the cowl, clamped on-canvas, and kept
    #     LOW-LEFT of the existing dart fan so the two streams don't collide.
    def sheet(cx, cy):
        if not (2 <= cx < 60 and 2 <= cy < 60):
            return
        _stamp(c, cx - 2, cy - 1, [
            ".KK..",
            "KccK.",     # c sheet body (a freshly dispatched form in flight)
            ".KhhK",     # h fold-line + K trailing edge
            "..oK.",     # tiny o question-corner
        ])
    sheet(sx - 2, top_y - 1)     # one just leaving the cowl mouth, up-left
    sheet(sx - 5, top_y - 3)     # one a little further along the outbound path


def stage3_intake_annex(c, annex):
    """t3 — STRUCTURAL ADD: a stepped RESPONSE-INTAKE ANNEX bolted onto the near (front-
    LEFT) side of the loading kiosk — a low deep-indigo `b` box whose lit-LEFT face,
    turned toward the viewer, is a panel of glowing `g` RETURNED-FORM SLOTS (a clear
    return path: forms come BACK and drop into the slots). Stepped DOWN-FRONT off the
    annex so it abuts the kiosk without crowding the depot or covering the kiosk's
    SHADED-RIGHT dock/window hero (which faces away down-right). Introduces the matured
    deep-indigo `b` structure tone; the slots glow `g`, the intake accent."""
    # seat the intake box stepped down-front-LEFT of the loading annex so its back-right
    # corner abuts the annex front-left foot; low + slim so it reads as a bolt-on kiosk.
    apex = (annex.r_top[0] - 11, annex.r_top[1] + 17)     # front-left, stepped down
    box = Box(top=apex, wx=4, wy=3, h=7)
    # body: deep-indigo b housing (matured structure tone), with D shaded right face.
    box.draw(c, roof="b", lwall="b", rwall="D", roof_hi="M", outline="K")
    # a thin M lit-back roof edge so the b roof still reads (b is dark)
    c.line(box.r_top, box.r_left, "M")
    c.line(box.r_top, box.r_right, "L")
    # --- GLOWING g RETURNED-FORM SLOTS on the lit-LEFT face (facing the viewer) ---
    # three stacked horizontal slots, each a K shadow LIP over a BRIGHT glow bar so they
    # pop off the dark `b` housing as illuminated return-slots (a returned form lit in the
    # slot): a bright O hot-line + a g glow body. High contrast on the dark b face = the
    # slots read clearly as a return-intake bank, not as more of the building's purple.
    for v in (1.4, 3.0, 4.6):
        c.line(box.left_pt(0.18, v), box.left_pt(0.82, v), "K")            # slot top shadow lip
        c.line(box.left_pt(0.18, v + 0.6), box.left_pt(0.82, v + 0.6), "O")  # bright lit hot-line
        c.line(box.left_pt(0.18, v + 1.1), box.left_pt(0.82, v + 1.1), "g")  # g glow body of the slot
    # a brighter G base glow strip along the slot bank foot + a K frame around the bank
    c.line(box.left_pt(0.14, 6.0), box.left_pt(0.86, 6.0), "G")
    for a, b2 in [(box.left_pt(0.14, 0.9), box.left_pt(0.86, 0.9)),
                  (box.left_pt(0.14, 0.9), box.left_pt(0.14, 6.0)),
                  (box.left_pt(0.86, 0.9), box.left_pt(0.86, 6.0))]:
        c.line(a, b2, "K")
    # a couple of c RETURNING form-sheets dropping INTO the top slot (the return path)
    rx, ry = int(round(box.roof_pt(0.5, 0.5)[0])), int(round(box.roof_pt(0.5, 0.5)[1]))
    for dy in (-5, -8):
        if 0 <= ry + dy <= 63:
            _stamp(c, rx - 1, ry + dy, [
                "KKK",
                "KcK",      # a small c returning form, falling in
                ".K.",
            ])
    return box


def stage4_silo(c, b):
    """t4 — MAJOR ADD: a tall DISTRIBUTION-TOWER SILO rising off the roof BESIDE the
    rotary hopper (back-right of the drum, in the clear roof gap between the drum and the
    tally board) — a deep-indigo `b` cylinder with a glowing cyan `e` CONVEYOR-WINDOW of
    folded forms climbing its lit face, capped by a wider BROADCAST ARRAY FAN. The
    prominent new vertical mass that says throughput just scaled up. Palette matures:
    cool `b` silo massing + energized signal-cyan `e/E` conveyor. Kept narrow + fully
    on-canvas, rising clear ABOVE the drum so it never occludes the spinner signature."""
    dcx, dtop = _drum_anchor(b)
    # silo centre in the clear gap to the RIGHT-back of the drum (drum body ends ≈x35;
    # tally board screen starts ≈x45) — centre x≈40, narrow so it clears both.
    scx = dcx + 9                      # ≈40, between drum (≤35) and tally (≥44)
    sbase = dtop + 6                   # silo foot just behind/above the sort bin top
    stop = 8                           # cap centre ≈y10 — TALL (≈6px above the drum) but
    #                                    LEAVES ~9px of headroom so the t5 tiered relay
    #                                    array can grow UP off the mast without clipping.
    sh = sbase - stop                  # silo body height
    # --- SILO BODY: a tall b cylinder (lit-left M-ish via b/D shading), K outline. Hand
    #     -build the iso cylinder so the lit (left) half is a slightly lifted b and the
    #     shaded (right) half is D, with a crisp K silhouette and a rounded L/W top cap.
    rx = 3
    for yy in range(stop + 2, sbase + 1):
        for xx in range(-rx, rx + 1):
            X, Y = scx + xx, yy
            if not (0 <= X <= 63 and 0 <= Y <= 63):
                continue
            if xx <= -rx or xx >= rx:
                c.set(X, Y, "K")                  # vertical silhouette edges
            elif xx < 0:
                c.set(X, Y, "b")                  # lit-left band (deep indigo, lifted)
            else:
                c.set(X, Y, "D")                  # shaded-right band
    # rounded top cap (a 2:1 ellipse lid: L lit-back, M front, K rim)
    for xx in range(-rx, rx + 1):
        t = 1 - (xx / rx) ** 2
        yo = int(round(2 * (t ** 0.5)))           # ellipse half-height ~2
        for yy in range(-yo, yo + 1):
            X, Y = scx + xx, (stop + 2) + yy
            if 0 <= X <= 63 and 0 <= Y <= 63:
                c.set(X, Y, "L" if yy < 0 else "M")
    for a in range(0, 360, 20):                   # K rim of the cap
        X = scx + rx * math.cos(math.radians(a))
        Y = (stop + 2) + 2 * math.sin(math.radians(a))
        if 0 <= X <= 63 and 0 <= Y <= 63:
            c.set(int(round(X)), int(round(Y)), "K")
    # a couple of M corrugation/band rings down the silo so it reads as a built silo
    for yy in (stop + 7, stop + 12, stop + 17):
        if stop + 2 < yy < sbase:
            c.line((scx - rx + 1, yy), (scx + rx - 1, yy), "M")
    # --- GLOWING CYAN CONVEYOR-WINDOW: a narrow vertical e/E strip up the lit-left face,
    #     showing folded FORMS climbing the silo (alternating e form / E lit gap). A K
    #     frame boxes the window so it reads as a glazed conveyor, not a paint stripe. ---
    wx = scx - 1                                  # lit-left column of the silo
    wtop = stop + 5
    wbot = sbase - 2
    for yy in range(wtop, wbot + 1):
        if not (0 <= yy <= 63):
            continue
        # forms climbing: a short e bar every other row = a stacked form on the belt
        c.set(wx, yy, "E" if (yy - wtop) % 2 == 0 else "e")
        c.set(wx - 1, yy, "e" if (yy - wtop) % 2 == 0 else "G")
    # K frame around the conveyor window
    c.line((wx - 2, wtop - 1), (wx + 1, wtop - 1), "K")
    c.line((wx - 2, wbot + 1), (wx + 1, wbot + 1), "K")
    c.line((wx - 2, wtop - 1), (wx - 2, wbot + 1), "K")
    c.line((wx + 1, wtop - 1), (wx + 1, wbot + 1), "K")
    # --- BROADCAST ARRAY FAN crowning the silo: a short K mast + a wider spread of 3
    #     L/M radial array spokes fanning UP-and-out (the dispatch broadcast). This is
    #     the mast that becomes the multi-beam relay at t5. Anchored ON the cap centre. ---
    mast_base = stop + 2                                  # on the cap (≈y8)
    mast_top = stop - 1                                   # short mast tip ≈y5 (leaves
    #                                                       headroom above for the t5 fans)
    c.line((scx, mast_base), (scx, mast_top), "K")        # mast
    c.set(scx, mast_top, "L")
    spokes = [(-3, -1), (0, -2), (3, -1)]                 # 3 modest array spokes fanning out
    for dx, dy in spokes:
        ex = max(0, min(63, scx + dx))
        ey = max(0, min(63, mast_top + dy))
        c.line((scx, mast_top), (ex, ey), "M")
        c.set(ex, ey, "L")                                # bright array tip
    return scx, mast_top                                  # mast tip for t5 to build on


def stage5_relay(c, b, annex, mast):
    """t5 — CROWNING FEATURE = FULLY EVOLVED survey-relay hub. The broadcast mast atop
    the silo becomes a multi-beam SURVEY-RELAY ARRAY: three bright signal-cyan `E`
    OUTBOUND FANS sweep up-and-out from the mast tip, a dense FLOCK of form-sheets rides
    the beams out into the field, and the array + silo are dressed in GOLD premium trim
    (gold `q` array RIBS bracing the fans + a gold silo WEATHERVANE finial). Reads as
    elite, still recognizably the same dispatch depot, just maxed out. Re-anchors off the
    SAME mast tip stage4 returned (no second hardcoded guess)."""
    mx, mtop = mast                              # the t4 silo mast tip (≈y7)
    # The t4 mast carried a modest broadcast fan; at t5 that mast GROWS UP into a tall,
    # TIERED multi-beam SURVEY-RELAY ARRAY (a stacked cross-arm antenna head) — the
    # cumulative crowning add. Everything is recomputed off the SAME mast tip.
    # --- relay-head SHAFT: extend the mast UP from the t4 tip into a taller array spine. ---
    shaft_top = max(mtop - 5, 1)                   # ≈y2 — the top of the array spine
    c.line((mx, mtop), (mx, shaft_top), "b")       # lifted-indigo spine
    c.line((mx + 1, mtop), (mx + 1, shaft_top), "K")
    c.set(mx, mtop, "K")
    # --- THREE TIERED CROSS-ARMS up the spine (a stacked antenna array): each is a bright
    #     E cross-bar with W element-tips, NARROWING as it climbs, with bare-canvas GAPS
    #     between tiers so it reads as a discrete multi-element array, not a solid mass.
    #     A small gold q rib centres each arm (the premium array ribs). ---
    arms = [(mtop - 1, 4), (mtop - 3, 3), (shaft_top, 2)]   # (row y, half-width)
    for ay, hw in arms:
        if not (0 <= ay <= 63):
            continue
        x0 = max(0, mx - hw)
        x1 = min(63, mx + hw)
        c.line((x0, ay), (x1, ay), "E")            # the bright cross-arm
        c.set(x0, ay, "W"); c.set(x1, ay, "W")     # bright element tips
        c.set(mx, ay, "q")                          # gold array rib at the arm centre
    # --- TWO outbound BEAMS sweeping up-and-OUT from the spine top into the field (the
    #     relay broadcasting wide). Diagonal so they clearly leave the array; clamped. ---
    for dx, dy in ((-9, 2), (9, 2)):
        ex = max(0, min(63, mx + dx))
        ey = max(0, min(63, shaft_top + dy))
        c.line((mx, shaft_top), (ex, ey), "E")
        c.set(ex, ey, "W")                          # bright beam tip out in the field
    # a bright relay-node core where the spine meets the top arm
    c.set(mx, shaft_top, "E")

    # --- a FLOCK of FORM-SHEETS riding the two outbound beams OUT into the field — discrete
    #     2px c sheets spaced along each beam (clear gaps so they read as separate sheets in
    #     flight). All inside the beam envelope (shaft_top .. shaft_top+2), on-canvas. ---
    flock = [(mx - 7, shaft_top + 2), (mx - 4, shaft_top + 1),
             (mx + 7, shaft_top + 2), (mx + 4, shaft_top + 1)]
    for fx, fy in flock:
        if 1 <= fx <= 62 and 1 <= fy <= 62:
            c.set(fx, fy, "c")                     # a form-sheet riding the beam
            if 0 <= fx + 1 <= 63:
                c.set(fx + 1, fy, "h")             # a tiny fold-glint so it reads as paper

    # --- GOLD silo WEATHERVANE finial: a small gold knob + direction-arrow crowning the very
    #     top of the array spine (recomputed off the SAME spine top) = a gilded weathervane,
    #     the t5 premium flourish. ---
    vane_y = max(shaft_top - 1, 0)
    if 0 <= vane_y <= 63:
        c.set(mx, vane_y, "O")                               # bright gold finial knob
        if 0 <= mx + 1 <= 63:
            c.set(mx + 1, vane_y, "q")                       # tiny gold direction-arrow
        if 0 <= mx - 1 <= 63:
            c.set(mx - 1, vane_y, "q")

    # --- GOLD intake-annex trim: a thin gold q ridge line on the t3 intake box roof so
    #     the whole hub reads gilded at max (recompute the intake box anchor identically). ---
    apex = (annex.r_top[0] - 11, annex.r_top[1] + 17)
    ibox = Box(top=apex, wx=4, wy=3, h=7)
    c.line(ibox.r_top, ibox.r_left, "q")                     # gold lit roof ridge
    c.set(int(round(ibox.r_top[0])), int(round(ibox.r_top[1])), "O")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the survey distribution center at upgrade `stage` (1..5). Stage 1 is
    IDENTICAL to the shipped base; each higher stage keeps every prior addition and
    bolts on the next (t2 dispatch stack → t3 intake annex → t4 silo → t5 relay+gold).
    Painter's order keeps rooftop/overhead additions on top of the masses they grow from,
    and all rooftop additions clear the hero rotary hopper + dart-fan signature."""
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

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    # Front-apron intake annex (t3) is drawn before the rooftop silo/relay (t4/t5) so
    # the rooftop masses paint over the roof last; the t2 dispatch stack seats on the
    # roof beside the hopper. mast = the silo mast tip, threaded from t4 into t5.
    if stage >= 2:
        stage2_dispatch_stack(c, DEPOT, left_mouth)
    if stage >= 3:
        stage3_intake_annex(c, ANNEX)
    mast = None
    if stage >= 4:
        mast = stage4_silo(c, DEPOT)
    if stage >= 5:
        stage5_relay(c, DEPOT, ANNEX, mast)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/mindframe"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "survey-distribution-center"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must keep
    matching the shipped survey-distribution-center.png, so it does NOT overwrite the
    base PNG."""
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
