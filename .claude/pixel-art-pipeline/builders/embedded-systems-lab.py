#!/usr/bin/env python3
"""
Embedded Systems Lab — Volt Lab economy building (BESPOKE FORM).

This is NOT the gateway cube and NOT a re-skin of any Volt sibling. It is composed
from the iso BUILDING TOOLKIT (isobuild.Box) as a LONG SAWTOOTH-ROOF SHED — a low,
elongated single-volume maker shed whose roof is a SERRATED row of north-light
sawtooth monitors. That repeated saw-tooth ridge is the silhouette signature: the
CNC shop used ONE clerestory monitor; this is a REPEATED row of teeth, the
unmistakable cue of a long maker shed.

  * MAIN SHED: one long, low, squat Box (wx≈14, wy≈8, h≈11) — distinctly
    elongated, the opposite of the tall square gateway cube;
  * SAWTOOTH ROOF: a row of 3 stepped sawtooth wedges across the front ridge,
    each with a steep shaded D/d back slope and a near-vertical g/c glazed
    north-light front face. Tooth bodies vary W→L→M so the serration reads as a
    row of distinct teeth, not one block;
  * BAY DOOR on the LEFT (lit) face: a wide K-framed roll-aside garage/bay door
    of VERTICAL M/D slats (vertical — distinct from the CNC's horizontal slats),
    with an o/K warning chevron on the sill;
  * RIGHT (shaded) face: a horizontal strip of 4 tiny round c bench PORTHOLES —
    not stock gateway windows.

Signature (one-of-one): a rooftop BREADBOARD GARDEN. A pale W/L solderless
breadboard slab lies on the front roof deck (a faint d grid of tie-point holes +
a central D channel), sprouting a trellis of bright arching jumper wires (o/c/g/r)
and three tiny microcontroller boards standing up like glowing seedlings (g/G
chips on K legs, raised K DIP, blinking pin LEDs o/O/c — one mid-blink bright),
under a faint c glow halo fed by an o power rail. No breadboard / jumper-wire /
MCU-seedling motif exists in the catalog, and it is NOT the PCB Fab's flat trace
board — this is a 3D prototyping garden of raised boards + arching wires.
"""
import os
import sys
import json
import subprocess

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

# Base Volt palette (shared keys) + a few EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so the base PNG is unchanged):
#   b  deep cool steel  — matured structure tone for t4+ new masses
#   e  energized cyan glow (mid)   E  energized cyan glow (bright) — the t4/t5 power
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
VOLT = {"K": "#15181d", "W": "#eef2f6", "L": "#cdd6dd", "M": "#9aa3ad", "D": "#6c7682", "d": "#49515b",
        "h": "#d6f9ff", "c": "#aef0fb", "g": "#38cfe2", "G": "#1f8ba0",
        "o": "#ffe85a", "O": "#fff7a8", "r": "#c89a14",
        "b": "#3b4350", "e": "#6fe6f4", "E": "#caf7ff", "q": "#f3c63a"}

SLUG = "embedded-systems-lab"


# ── small pixel helpers ──────────────────────────────────────────────────────
def rect(c, x0, y0, x1, y1, fill=None, outline=None):
    if fill is not None:
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                c.set(x, y, fill)
    if outline is not None:
        for x in range(int(x0), int(x1) + 1):
            c.set(x, int(y0), outline); c.set(x, int(y1), outline)
        for y in range(int(y0), int(y1) + 1):
            c.set(int(x0), y, outline); c.set(int(x1), y, outline)


def parc(c, a, b, lift, ch):
    """A thin single-pixel arching wire from a→b, bowed `lift` px upward at mid."""
    ax, ay = a
    bx, by = b
    steps = max(abs(bx - ax), abs(by - ay), 1)
    prev = None
    for i in range(int(steps) + 1):
        t = i / steps
        x = ax + (bx - ax) * t
        y = ay + (by - ay) * t - lift * (1 - (2 * t - 1) ** 2)  # parabolic bow
        p = (int(round(x)), int(round(y)))
        if p != prev:
            c.set(p[0], p[1], ch)
            prev = p


# ── 1. MAIN SHED — one long, low Box (the bespoke break from the cube) ────────
def main_shed(c):
    """Long, low, squat maker-shed hall. wx=14 wy=8 h=11 -> distinctly elongated
    and low, the opposite of the tall square gateway cube."""
    shed = Box(top=(26, 22), wx=14, wy=8, h=11)
    shed.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    return shed


def corrugation(c, shed):
    """Corrugated D ribs + rivets on the shed walls (Volt motif)."""
    # right (shaded) face carries vertical rib grooves (portholes sit between them)
    for u in (0.18, 0.36, 0.54, 0.72, 0.90):
        c.line(shed.right_pt(u, 1), shed.right_pt(u, 10), "d")
    # rivet dots just under the left eave
    for u in (0.1, 0.3, 0.5, 0.7, 0.9):
        p = shed.left_pt(u, 1.4)
        c.set(int(round(p[0])), int(round(p[1])), "L")


# ── 2. SAWTOOTH ROOF — a row of 3 stepped north-light monitors ───────────────
def sawtooth_roof(c, shed):
    """A SERRATED row of 3 sawtooth monitors marching across the BACK roof ridge.
    Each tooth = a steep near-vertical GLAZED north-light front face (g/c) +
    a shaded back ramp (D/d), with a hard K apex ridge. The teeth step along the
    RIGHT footprint axis so their apexes form a clean repeating saw profile — the
    silhouette signature no other Volt form has. Kept on the BACK half of the roof
    so the front roof deck stays clear for the breadboard garden."""
    # March 3 teeth back-to-front along the LEFT->RIGHT ridge. Each tooth occupies
    # a band of the roof's BACK third (v 0.62..0.92), so the front deck (v<0.55) is
    # free for the garden. Front foot of a tooth is toward viewer (lower v); the
    # glazed face rises steeply from it; the back ramp falls to the next foot.
    bodies = ["W", "L", "M"]            # apex crest shade varies L->R (repeated teeth)
    TOOTH_H = 8                          # vertical rise above the ridge
    V_FRONT, V_BACK = 0.58, 0.92         # tooth occupies this back band of the roof
    # clear NOTCHES between teeth: each tooth is narrower than its pitch, leaving a
    # visible valley so the serrated saw profile reads as three distinct peaks.
    for i in range(3):
        u0 = 0.15 + i * 0.27             # left edge of this tooth along the ridge
        u1 = u0 + 0.18                   # narrower tooth -> valley gap to the next
        # feet of the tooth on the roof deck
        ffl = shed.roof_pt(u0, V_FRONT)  # front-left foot
        ffr = shed.roof_pt(u1, V_FRONT)  # front-right foot
        bfl = shed.roof_pt(u0, V_BACK)   # back-left foot
        bfr = shed.roof_pt(u1, V_BACK)   # back-right foot
        # apex sits above the FRONT feet (steep glazed front), pulled back a hair so
        # the back ramp has real run and reads as a sloped roof, not a spike.
        axl = (ffl[0] + 1, ffl[1] - TOOTH_H)
        axr = (ffr[0] + 1, ffr[1] - TOOTH_H)
        # --- shaded back ramp (apex down to the back feet) — the long dark slope ---
        c.fill_poly([axl, axr, bfr, bfl], "D")
        # darker ribbing lines down the ramp so the slope reads clearly
        for t in (0.28, 0.5, 0.72):
            tx = axl[0] + (axr[0] - axl[0]) * t
            ty = axl[1] + (axr[1] - axl[1]) * t
            bx = bfl[0] + (bfr[0] - bfl[0]) * t
            by = bfl[1] + (bfr[1] - bfl[1]) * t
            c.line((tx, ty), (bx, by), "d")
        # a bright eave line where the ramp meets the apex ridge (catches light)
        c.line(axl, axr, "M")
        # --- steep north-light front face: a CALM DARK glazed slat (deep d fill,
        # like the CNC roof slats) carrying just ONE 1px cyan glint, so each tooth
        # reads as a crisp dark monitor — cyan is a sparse accent, not a mass. ---
        c.fill_poly([ffl, ffr, axr, axl], "d")
        # single bright cyan glint at the tooth's lit (upper-left) corner only
        c.set(int(round(axl[0] + 1)), int(round(axl[1] + 2)), "c")
        c.line((ffl[0], ffl[1] - 1), (ffr[0], ffr[1] - 1), "K")     # dark sill shadow
        # --- bright apex crest (varies W/L/M so the row reads as repeated teeth) ---
        c.line((axl[0], axl[1] - 1), (axr[0], axr[1] - 1), bodies[i])
        # --- hard K outline of the tooth silhouette (the saw profile) ---
        c.line(ffl, axl, "K")            # steep front-left edge
        c.line(ffr, axr, "K")            # steep front-right edge
        c.line(axl, axr, "K")            # apex ridge
        c.line(axl, bfl, "K")            # back ramp left
        c.line(axr, bfr, "K")            # back ramp right
        c.line(ffl, ffr, "K")            # front foot line


# ── 3. BAY DOOR on the LEFT (lit) face — VERTICAL slats ──────────────────────
def bay_door(c, shed):
    """Wide K-framed roll-aside garage/BAY DOOR of VERTICAL M/D slats on the LEFT
    (lit) face (vertical — distinct from the CNC's horizontal slats), with an o/K
    warning chevron sill."""
    u0, u1 = 0.12, 0.58          # door spans most of the lit face width
    vt, vb = 3.2, 10.4
    # solid K opening frame (recessed bay), drawn a touch oversized for a hard border
    c.fill_poly([shed.left_pt(u0 - 0.01, vt - 0.4), shed.left_pt(u1 + 0.01, vt - 0.4),
                 shed.left_pt(u1 + 0.01, vb + 0.4), shed.left_pt(u0 - 0.01, vb + 0.4)], "K")
    # VERTICAL slats inset inside the K frame: alternating bright L / dark D bars in a
    # mid M field, so the vertical ribbing reads with strong contrast.
    iu0, iu1 = u0 + 0.018, u1 - 0.018
    ivt, ivb = vt + 0.5, vb - 0.4
    # mid field first
    c.fill_poly([shed.left_pt(iu0, ivt), shed.left_pt(iu1, ivt),
                 shed.left_pt(iu1, ivb), shed.left_pt(iu0, ivb)], "M")
    nslats = 8
    for k in range(nslats):
        uu = iu0 + (iu1 - iu0) * k / (nslats - 1)
        body = "L" if k % 2 == 0 else "D"   # bright/dark alternation = clear slats
        c.line(shed.left_pt(uu, ivt), shed.left_pt(uu, ivb), body)
    # lit crest along the door head + dark sill shadow inside the frame
    c.line(shed.left_pt(iu0, ivt), shed.left_pt(iu1, ivt), "W")
    c.line(shed.left_pt(iu0, ivb), shed.left_pt(iu1, ivb), "d")
    # a small c control panel beside the bay door (toward the front corner)
    cp0, cp1 = 0.70, 0.88
    c.fill_poly([shed.left_pt(cp0, 4.0), shed.left_pt(cp1, 4.0),
                 shed.left_pt(cp1, 7.6), shed.left_pt(cp0, 7.6)], "K")
    c.fill_poly([shed.left_pt(cp0 + 0.016, 4.6), shed.left_pt(cp1 - 0.016, 4.6),
                 shed.left_pt(cp1 - 0.016, 7.0), shed.left_pt(cp0 + 0.016, 7.0)], "g")
    gp = shed.left_pt(cp0 + 0.05, 5.0)
    c.set(int(round(gp[0])), int(round(gp[1])), "h")
    c.line(shed.left_pt(cp0 + 0.02, 6.0), shed.left_pt(cp1 - 0.02, 6.0), "G")
    # status LEDs above the panel
    for du, col in ((0.03, "o"), (0.13, "c")):
        led = shed.left_pt(cp0 + du, 3.4)
        c.set(int(round(led[0])), int(round(led[1])), col)

    # o/K WARNING CHEVRON sill running under the bay door (bright hazard teeth)
    sill = shed.left_pt(u0 + 0.02, vb + 0.9)
    sx, sy = int(round(sill[0])), int(round(sill[1]))
    end = shed.left_pt(u1 - 0.02, vb + 0.9)
    span = int(round(end[0])) - sx
    for k in range(0, max(1, span), 2):
        c.set(sx + k, sy, "o"); c.set(sx + k, sy + 1, "O")
        c.set(sx + k + 1, sy, "K"); c.set(sx + k + 1, sy + 1, "K")


# ── 4. RIGHT (shaded) face — a strip of round bench PORTHOLES ─────────────────
def portholes(c, shed):
    """A horizontal row of 4 tiny round c bench portholes low on the shaded right
    face (NOT stock gateway windows)."""
    for i in range(4):
        u = 0.20 + i * 0.20
        p = shed.right_pt(u, 5.6)
        x, y = int(round(p[0])), int(round(p[1]))
        # K ring around the porthole
        for dx, dy in [(-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0),
                       (-1, 1), (0, 1), (1, 1)]:
            c.set(x + dx, y + dy, "K")
        # cyan glass with a bright centre glint
        c.set(x - 1, y, "g"); c.set(x + 1, y, "g")
        c.set(x, y - 1, "g"); c.set(x, y + 1, "g")
        c.set(x, y, "h")


# ── 5. POWER conduit + glowing rail (Volt motifs) ────────────────────────────
def power(c, shed):
    """Glowing o power rail along the front eave + an o conduit dropping down the
    front corner (Volt motifs), feeding up toward the rooftop garden."""
    # glowing power rail along the lit front eave
    c.line(shed.left_pt(0.05, 2.0), shed.left_pt(0.96, 2.0), "o")
    c.line(shed.left_pt(0.05, 2.6), shed.left_pt(0.96, 2.6), "r")
    # o power conduit running straight down the FRONT corner (front vertical edge)
    fx = int(round(shed.r_front[0]))
    fy0 = int(round(shed.r_front[1]))
    c.line((fx, fy0 + 1), (fx, fy0 + 10), "o")
    c.line((fx + 1, fy0 + 1), (fx + 1, fy0 + 10), "r")
    for cy in (fy0 + 4, fy0 + 8):
        c.set(fx - 1, cy, "K"); c.set(fx + 2, cy, "M")


# ── 6. SIGNATURE — rooftop BREADBOARD GARDEN ─────────────────────────────────
def breadboard_garden(c, shed):
    """CLEAN rooftop breadboard garden on the FRONT roof deck. The roof deck is very
    shallow in iso, so the garden is kept LOW-PROFILE: a bright pale breadboard tray
    with a simple regular d tie-point grid, and 3 small flat K-outlined circuit
    'planters' lying on the tray — each a tiny dark board with ONE clear glowing LED.
    The boards sit in the VALLEYS between the sawtooth teeth and toward the FRONT lip
    of the tray, so they never collide with the glazing behind. 2 clean low jumper
    arcs link them, plus one soft c glow accent. No standing stalks, no sparkle
    field, no wire tangle: reads as little glowing circuit-boards in a planter."""
    SU0, SU1 = 0.22, 0.90            # tray spans the full deck width
    SV0, SV1 = 0.30, 0.72           # tray on the front deck; extends to the front lip
                                     # so the board row sits well clear of the teeth

    # --- BREADBOARD TRAY on the front roof deck (bright pale plastic) ---
    s0 = shed.roof_pt(SU0, SV0)     # back-left
    s1 = shed.roof_pt(SU1, SV0)     # back-right
    s2 = shed.roof_pt(SU1, SV1)     # front-right
    s3 = shed.roof_pt(SU0, SV1)     # front-left
    c.fill_poly([s0, s1, s2, s3], "W")
    # crisp planter rim: bright lit back/left edges + a clean L front/right lip so the
    # tray reads as a contained pale slab (no muddy mid-grey).
    c.line(s0, s1, "W"); c.line(s0, s3, "W")
    c.line(s3, s2, "L"); c.line(s1, s2, "L")
    # central L bus channel down the middle of the board (the classic breadboard gap)
    cmid = (SV0 + SV1) / 2
    c.line(shed.roof_pt(SU0, cmid), shed.roof_pt(SU1, cmid), "L")
    # simple REGULAR d grid of tie-point holes — two sparse banks at the FRONT
    # corners of the tray only, kept clear of the board row so the deck stays quiet
    # and the grid still reads as breadboard holes.
    for uu in (0.28, 0.36):
        for vv in (0.48, 0.58):
            p = shed.roof_pt(uu, vv)
            c.set(int(round(p[0])), int(round(p[1])), "d")
    for uu in (0.78, 0.86):
        for vv in (0.48, 0.58):
            p = shed.roof_pt(uu, vv)
            c.set(int(round(p[0])), int(round(p[1])), "d")

    # --- 3 small FLAT circuit boards lying in the tray (low-profile planters) ---
    # Each = a tiny K-outlined dark D board (5w x 2h) lying flat on the tray with ONE
    # clear glowing LED on its lit corner. Placed in the tooth VALLEYS (u≈0.31/0.52/
    # 0.73) and FORWARD on the tray so they sit on clean white, clear of the glazing.
    boards = [
        (shed.roof_pt(0.31, 0.68), "c"),   # left board, cyan LED
        (shed.roof_pt(0.52, 0.68), "O"),   # centre board, bright amber LED
        (shed.roof_pt(0.73, 0.68), "o"),   # right board, amber LED
    ]
    leds = []
    for (bx, by), led in boards:
        bx, by = int(round(bx)), int(round(by))
        # flat near-black board (K), 5 wide x 2 tall, lying on the tray — a DARKER
        # value than the d-slat teeth so the boards separate cleanly from the glazing.
        rect(c, bx - 2, by - 1, bx + 2, by, fill="K")
        c.set(bx - 1, by - 1, "M")          # one lit pixel = a chip on the board
        c.set(bx + 1, by - 1, "D")          # one mid pixel = board face has form
        # ONE clear LED on the board's lit (back-left) corner
        c.set(bx - 2, by - 2, led)
        leds.append((bx - 2, by - 2))

    # --- ONE soft c glow accent: a single pixel above the bright centre LED ---
    cx, cy = leds[1]
    c.set(cx, cy - 1, "c")

    # --- 2 clean low jumper-wire arcs linking the boards: single smooth lines,
    # gentle 2px lift so they stay flat over the tray, K-pinned at both ends. ---
    wires = [
        (leds[0], leds[1], 2, "o"),
        (leds[1], leds[2], 2, "g"),
    ]
    for a, b, lift, col in wires:
        parc(c, a, b, lift, col)
        c.set(a[0], a[1], "K"); c.set(b[0], b[1], "K")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS prototyping /
# breadboard-garden structure onto the prior form — never restarts, never recolors
# the whole building. Theme: the maker shed's rooftop breadboard garden grows into a
# fully built-out, glowing circuit-canopy prototyping lab. Colours mature stage by
# stage; gold (q) only as a t5 flourish.
#
#   t2  small functional add : extra MCU-seedling LEDs + one more jumper arc, c glow
#   t3  structural add       : a fourth SAWTOOTH ROOF BAY extending the shed ridge
#   t4  major add            : a SENSOR-MAST TRELLIS TOWER with stacked glowing
#                              dev-boards climbing a b frame off the back tooth
#   t5  crowning feature     : a full glowing CIRCUIT-CANOPY (dense E jumper lattice +
#                              pulsing nodes) over the garden + a q gold ridge rail
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_seedlings(c, shed):
    """t2 — SMALL FUNCTIONAL ADD: the breadboard garden gains a few more MCU-seedling
    LEDs and ONE more arching jumper wire across the front tray, plus a brightened c
    board-glow halo. On-theme (more prototyping), modest, base palette + a brighter c.
    Anchored on the SAME front-deck LEDs the garden uses (u≈0.31/0.52/0.73, v≈0.68)."""
    # the three garden boards sit at these tray points (matches breadboard_garden)
    pts = [shed.roof_pt(u, 0.68) for u in (0.31, 0.52, 0.73)]
    leds = []
    for (bx, by) in pts:
        bx, by = int(round(bx)), int(round(by))
        leds.append((bx - 2, by - 2))   # board's lit-corner LED, as in the garden
    # --- a couple of EXTRA seedling LEDs: tiny new pin-lights on each board's free
    #     corner, one mid-blink bright, so the garden reads as more populated. ---
    extras = [
        (leds[0][0] + 3, leds[0][1] + 1, "o"),   # left board: amber pin
        (leds[1][0] + 3, leds[1][1] + 1, "O"),   # centre board: bright (mid-blink)
        (leds[2][0] + 3, leds[2][1] + 1, "c"),   # right board: cyan pin
    ]
    for ex, ey, col in extras:
        c.set(ex, ey, col)
    # --- one MORE arching jumper wire spanning the full tray (left board -> right
    #     board), bowed a touch higher than the t1 arcs so it layers above them. ---
    parc(c, leds[0], leds[2], 4, "c")
    c.set(leds[0][0], leds[0][1], "K")
    c.set(leds[2][0], leds[2][1], "K")
    # --- brightened c board-glow halo over the centre seedling (the brightest one) ---
    cx, cy = leds[1]
    c.set(cx, cy - 2, "c")
    c.set(cx - 1, cy - 1, "c")
    c.set(cx + 1, cy - 1, "c")


def stage3_extra_tooth(c, shed):
    """t3 — STRUCTURAL ADD: a TALL new sawtooth MONITOR BAY raised on the back-LEFT of
    the ridge, extending the shed's serrated silhouette with one extra tooth that
    clearly RISES ABOVE the existing saw line (same tooth language as sawtooth_roof —
    steep glazed north-light front, shaded back ramp, hard K saw profile — never a new
    motif). Sits left of the existing teeth and taller, so the addition reads as a
    fresh raised clerestory bay growing UP from the roof. Footprint base unchanged.
    Matured deep-steel `b` on the new ramp marks it as the newer bolt-on bay."""
    TOOTH_H = 13                      # TALLER than the base teeth (8) -> rises clearly
    V_FRONT, V_BACK = 0.56, 0.94      # a touch deeper so the ramp has real run
    # seat the new tooth on the back-LEFT band, just LEFT of the existing run (which
    # starts at u0=0.15). Tuck it into the left corner so it extends the saw row.
    u0 = 0.00
    u1 = 0.15
    ffl = shed.roof_pt(u0, V_FRONT)
    ffr = shed.roof_pt(u1, V_FRONT)
    bfl = shed.roof_pt(u0, V_BACK)
    bfr = shed.roof_pt(u1, V_BACK)
    axl = (ffl[0] + 1, ffl[1] - TOOTH_H)
    axr = (ffr[0] + 1, ffr[1] - TOOTH_H)
    # shaded back ramp — matured deep-steel b so the new bay separates from the old D
    c.fill_poly([axl, axr, bfr, bfl], "b")
    for t in (0.3, 0.6):
        tx = axl[0] + (axr[0] - axl[0]) * t
        ty = axl[1] + (axr[1] - axl[1]) * t
        bx = bfl[0] + (bfr[0] - bfl[0]) * t
        by = bfl[1] + (bfr[1] - bfl[1]) * t
        c.line((tx, ty), (bx, by), "d")
    # bright eave line at the apex ridge
    c.line(axl, axr, "M")
    # steep north-light glazed front face: dark d slat + 2 cyan glints (taller pane)
    c.fill_poly([ffl, ffr, axr, axl], "d")
    c.set(int(round(axl[0] + 1)), int(round(axl[1] + 2)), "c")
    c.set(int(round(axl[0] + 1)), int(round(axl[1] + 5)), "c")
    c.line((ffl[0], ffl[1] - 1), (ffr[0], ffr[1] - 1), "K")
    c.line((axl[0], axl[1] - 1), (axr[0], axr[1] - 1), "W")   # bright apex crest
    # hard K saw-profile outline
    c.line(ffl, axl, "K"); c.line(ffr, axr, "K"); c.line(axl, axr, "K")
    c.line(axl, bfl, "K"); c.line(axr, bfr, "K"); c.line(ffl, ffr, "K")


def stage4_sensor_mast(c, shed):
    """t4 — MAJOR ADD: a SENSOR-MAST TRELLIS TOWER rising off the BACK-LEFT of the
    roof (clear of the front garden), a slim deep-steel `b` lattice mast carrying a
    vertical climb of stacked glowing dev-boards (energized cyan `e`) like a vine of
    instruments — the prominent new vertical mass that says the lab now prototypes at
    scale. Palette matures: `b` frame + `e/E` board glow. Kept fully on-canvas."""
    # foot on the back-left roof band, behind the garden, in front of the leftmost
    # tooth so the mast reads as a tower rising from the roof deck.
    fx, fy = shed.roof_pt(0.30, 0.50)
    fx, fy = int(round(fx)), int(round(fy))
    top_y = fy - 26                      # tall mast rising above the sawteeth
    top_y = max(2, top_y)
    # --- lattice mast: twin b uprights + X-bracing, 3px wide ---
    c.line((fx, fy), (fx, top_y), "b")
    c.line((fx + 2, fy), (fx + 2, top_y), "D")
    for yy in range(top_y + 3, fy - 1, 4):
        c.line((fx, yy), (fx + 2, yy + 2), "b")
        c.line((fx + 2, yy), (fx, yy + 2), "b")
    c.set(fx, top_y, "K"); c.set(fx + 2, top_y, "K")
    # a small K base plate seating the mast on the roof
    c.line((fx - 1, fy), (fx + 3, fy), "K")
    # --- stacked dev-boards climbing the mast like a vine: 4 small glowing cards
    #     cantilevered alternately left/right off the mast, each a tiny K board with
    #     an e/E lit face — a vertical garden of instruments. ---
    for i, yy in enumerate(range(fy - 4, top_y + 2, -6)):
        side = -1 if i % 2 == 0 else 1   # alternate sides up the mast
        if side < 0:
            x0, x1 = fx - 4, fx - 1
        else:
            x0, x1 = fx + 3, fx + 6
        rect(c, x0, yy - 1, x1, yy + 1, fill="K")          # board body
        c.line((x0, yy), (x1, yy), "e")                    # lit board face
        glint = "E" if i == 1 else "e"                     # one board mid-blink bright
        c.set(x0 if side < 0 else x1, yy - 1, glint)       # corner LED
        # a short b strut tying the board back to the mast
        strut = fx if side < 0 else fx + 2
        c.line((x0 if side > 0 else x1, yy), (strut, yy), "b")
    # --- a small cyan sensor pod capping the mast top (the antenna head) ---
    c.set(fx + 1, top_y - 1, "E")
    c.set(fx, top_y - 1, "e")
    c.set(fx + 2, top_y - 1, "e")
    c.line((fx + 1, top_y - 1), (fx + 1, top_y - 3), "b")  # whip antenna
    c.set(fx + 1, top_y - 3, "c")


def stage5_circuit_canopy(c, shed):
    """t5 — CROWNING FEATURE = FULLY EVOLVED prototyping lab. The breadboard garden
    erupts into a full glowing CIRCUIT-CANOPY: a dense lattice of bright cyan `E`
    jumper wires arching over the whole front tray with pulsing `e/E` nodes at the
    crossings, lit from the matured power rail — plus a GOLD `q` rail running the full
    front ridge as the premium flourish. Reads as elite, still recognizably the same
    sawtooth maker shed with its breadboard garden, just maxed out."""
    # the garden boards' LEDs (matches breadboard_garden / stage2)
    pts = [shed.roof_pt(u, 0.68) for u in (0.31, 0.52, 0.73)]
    leds = [(int(round(p[0])) - 2, int(round(p[1])) - 2) for p in pts]
    base_y = leds[0][1]
    midx = (leds[0][0] + leds[2][0]) // 2
    # --- two clean POST uprights at the tray ends carrying the canopy (a vaulted
    #     frame, not a wire tangle): short e posts rising off the outer boards. ---
    for (px, py) in (leds[0], leds[2]):
        c.line((px, py), (px, py - 5), "e")
        c.set(px, py - 5, "E")
    # --- ONE clean tall vault arc spanning end post -> end post, bowed high, drawn as
    #     a crisp bright E rib with a soft e under-shadow one px below. ---
    apexL = (leds[0][0], base_y - 5)
    apexR = (leds[2][0], base_y - 5)
    parc(c, apexL, apexR, 7, "E")
    parc(c, (apexL[0], apexL[1] + 1), (apexR[0], apexR[1] + 1), 7, "e")
    # --- a SECOND lower rib (the lattice's inner course) board0 -> board2, gentle. ---
    parc(c, leds[0], leds[2], 3, "e")
    # --- vertical drop-jumpers from the vault crest down to the centre board, so the
    #     canopy reads as wired into the garden (two clean strands, not a mat). ---
    crest = (midx, base_y - 12)          # top of the 7px-lifted vault
    c.line((crest[0], crest[1] + 1), (leds[1][0], leds[1][1] - 1), "e")
    c.line((crest[0] - 1, crest[1] + 2), (leds[1][0] - 1, leds[1][1]), "G")
    # --- pulsing nodes: a few DISTINCT bright E caps with an e halo, spaced along the
    #     vault crest and at the post tops (clearly separated dots, no smear). ---
    nodes = [crest,
             (midx - 5, base_y - 9), (midx + 5, base_y - 9),
             apexL, apexR]
    for nx, ny in nodes:
        c.set(nx, ny, "E")
        c.set(nx, ny + 1, "e")
    # re-pin the board LEDs bright so the canopy reads as powered from them
    for lx, ly in leds:
        c.set(lx, ly, "E")
    # --- GOLD premium trim (t5 flourish only): a gold rail along the FRONT roof eave
    #     ridge (the lit front edge of the roof deck), echoing the building's power
    #     rail but elite. Sparse — a single highlighted line, not a recolor. ---
    e0 = shed.roof_pt(0.18, 0.30)        # front-deck left, just inside the lip
    e1 = shed.roof_pt(0.92, 0.30)        # front-deck right
    c.line(e0, e1, "q")
    # a couple of brighter gold bosses at the rail ends
    c.set(int(round(e0[0])), int(round(e0[1])), "O")
    c.set(int(round(e1[0])), int(round(e1[1])), "O")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the embedded-systems-lab at upgrade `stage` (1..5). Stage 1 is IDENTICAL
    to the shipped base; each higher stage keeps every prior addition and bolts on the
    next (t2 seedling LEDs -> t3 extra sawtooth bay -> t4 sensor-mast trellis tower ->
    t5 glowing circuit-canopy + gold rail). Painter's order keeps rooftop/overhead
    additions on top of the masses they grow from."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    # painter's order: shed body, then the roof sawteeth (behind the garden),
    # then walls/door/portholes, then the breadboard garden on the front deck.
    shed = main_shed(c)
    corrugation(c, shed)
    sawtooth_roof(c, shed)
    # t3 extra sawtooth bay is part of the ROOF mass -> draw it with the roof, before
    # the front garden, so the garden/canopy still layer on top of the roofline.
    if stage >= 3:
        stage3_extra_tooth(c, shed)
    power(c, shed)
    bay_door(c, shed)
    portholes(c, shed)
    # t4 sensor mast rises from the back roof deck -> draw before the front garden so
    # the front garden/canopy occlude its foot correctly.
    if stage >= 4:
        stage4_sensor_mast(c, shed)
    breadboard_garden(c, shed)

    # --- CUMULATIVE UPGRADE STAGES (front-deck garden additions) ------------------
    if stage >= 2:
        stage2_seedlings(c, shed)
    if stage >= 5:
        stage5_circuit_canopy(c, shed)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/volt_lab"
PREVIEW_DIR = "/path/to/scienium/art/preview"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped embedded-systems-lab.png, so it does NOT overwrite the
    base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": VOLT, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"volt_lab_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"volt_lab_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev, "--preview-scale", "8"],
                   check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
