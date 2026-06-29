#!/usr/bin/env python3
"""
PCB Fab — Volt Lab economy building (BESPOKE-FORM REBUILD + UPGRADE EVOLUTION).

This is NOT the gateway cube. The previous PCB Fab leaned on iso.py's draw_cube /
base_windows and read as the generic gateway. This rebuild composes from the iso
BUILDING TOOLKIT (isobuild.Box) as a LOW, WIDE, SLEEK CLEAN-ROOM — the opposite of
the gritty CNC factory and the tall print tower:

  * a broad, LOW main clean-room Box (wide & squat) so its big FLAT roof — which
    IS the circuit board — is the hero. Smooth sealed walls, a bright W parapet
    rim ringing the flat roof (clean-room, not corrugated grime);
  * a small AIRLOCK VESTIBULE Box abutting the RIGHT (shaded) face — the opening
    is on the right (vary from the left-opening prototypes): a K-framed sealed
    door, an o/K hazard chevron, a c status light;
  * a sleek horizontal clean-room WINDOW BAND (one long g/c K-framed strip) low on
    the lit front face + a couple of D louver vents — NOT stock punched windows.

Signature (registered): the flat roof IS a live circuit board. A dark d substrate
carries continuous g/c traces routed from a central RAISED DIP CHIP (flat lit L/W
top, thin K shadow edge, M pin ladders down BOTH long sides, a g pin-1 notch — a
raised IC with pins, never a pit or a mound) out to r/o gold pads. ONE trace runs
a yellow O/o current pulse to a bright O pad. 2-3 D SMD chips + a c capacitor can.
Volt motifs: thin D parapet frame + rivets, a cyan board-tester window, an o
current-pulse power line, an M ribbon-cable bundle off a roof edge.

UPGRADE EVOLUTION (cumulative, on-theme = boards / etch tanks / reflow):
  t2  small functional add   : extra SMD bumps + one more o current-pulse LED on
                               the roof board edge (the board gets busier).
  t3  structural add         : a stepped ETCH-TANK ANNEX on the shaded side — a low
                               covered bath with a g cyan etchant surface (Box).
  t4  major add              : a REFLOW-OVEN TUNNEL raised across the back of the
                               roof — a long b housing with glowing e viewports.
  t5  crowning feature       : the roof board "powers on" — a dense E trace lattice
                               + a glowing DIP-chip megacupola halo on the chip,
                               q gold solder pads as the late flourish.
Colours mature stage by stage; gold (q) is a t5 flourish only.
"""
import os
import sys
import json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

# Base Volt palette (shared keys) + a few EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so pcb-fab.png is unchanged):
#   b  deep cool steel  — matured structure tone for t4+ new masses (reflow housing)
#   e  energized cyan glow (mid)   E  energized cyan glow (bright) — the t4/t5 power
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
VOLT = {"K": "#15181d", "W": "#eef2f6", "L": "#cdd6dd", "M": "#9aa3ad", "D": "#6c7682", "d": "#49515b",
        "h": "#d6f9ff", "c": "#aef0fb", "g": "#38cfe2", "G": "#1f8ba0",
        "o": "#ffe85a", "O": "#fff7a8", "r": "#c89a14",
        "b": "#3b4350", "e": "#6fe6f4", "E": "#caf7ff", "q": "#f3c63a"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def rect(c, x0, y0, x1, y1, fill=None, outline=None):
    if fill is not None:
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                c.set(x, y, fill)
    if outline is not None:
        for x in range(int(x0), int(x1) + 1):
            c.set(x, y0, outline); c.set(x, y1, outline)
        for y in range(int(y0), int(y1) + 1):
            c.set(x0, y, outline); c.set(x1, y, outline)


def gold_pad(c, x, y, lit=False):
    """A round gold through-hole solder pad at screen (x,y): r ring, o body, O hi."""
    x, y = int(round(x)), int(round(y))
    ring = "o" if lit else "r"
    body = "O" if lit else "o"
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            c.set(x + dx, y + dy, ring)
    c.set(x, y, body)
    c.set(x, y - 1, body)
    if lit:
        c.set(x, y, "O")
        c.set(x - 1, y, "O")
        c.set(x, y - 1, "O")


def smd(c, x, y):
    """A small surface-mount component chip: dark body with light metal ends."""
    x, y = int(round(x)), int(round(y))
    rect(c, x - 1, y - 1, x + 2, y + 1, fill="d")
    c.set(x - 1, y, "M"); c.set(x + 2, y, "M")
    c.set(x - 1, y - 1, "K"); c.set(x + 2, y + 1, "K")


# ── 1. MAIN CLEAN-ROOM — wide LOW Box (the bespoke break from the cube) ───────
def clean_room(c):
    """Broad, LOW sealed clean-room. wx=12 wy=9 h=11 -> wide & squat so the big
    flat roof (the circuit board) dominates. Smooth lit/shaded walls, no grime."""
    room = Box(top=(24, 20), wx=12, wy=9, h=11)
    room.draw(c, roof="d", lwall="M", rwall="D", roof_hi="L", outline="K")
    # bright W parapet rim around the whole flat roof (clean-room cap, lit edges)
    c.line(room.r_top, room.r_left, "W")
    c.line(room.r_top, room.r_right, "W")
    c.line(room.r_left, room.r_front, "L")
    c.line(room.r_front, room.r_right, "L")
    # smooth seam highlight where the two walls meet the front vertical edge
    c.line(room.r_front, room.w_front, "d")
    # a faint clean lit band along the top of the front (left) wall
    c.line(room.left_pt(0.04, 1.2), room.left_pt(0.96, 1.2), "L")
    return room


# ── 2. AIRLOCK VESTIBULE — small Box on the RIGHT (shaded) face = the OPENING ──
def airlock(c, room):
    """A small entry airlock vestibule abutting the RIGHT face. Sealed K-framed
    door + o/K hazard chevron + c status light. The building's opening is on the
    RIGHT (vary from the left-opening prototypes)."""
    # anchor the vestibule's back-top corner onto the right face, low and forward.
    # offset clear to the RIGHT (+wx) so its footprint abuts the right wall and
    # never crowds the front clean-room glazing.
    base = room.right_pt(0.46, 5.4)
    vest = Box(top=(base[0] + 5, base[1] - 5), wx=4, wy=3, h=6)
    vest.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # bright parapet glint on the vestibule crest (matches clean-room cap)
    c.line(vest.r_top, vest.r_left, "W")
    c.line(vest.r_top, vest.r_right, "L")

    # --- SEALED AIRLOCK DOOR on the vestibule's RIGHT (shaded) face = the OPENING.
    #     Putting the hatch on the shaded right plane makes it read unambiguously as
    #     the right-side airlock (not a left-facing door) and keeps it sealed/recessed.
    du0, du1, dvt, dvb = 0.16, 0.84, 0.8, 5.4
    # K opening frame (recessed sealed hatch)
    c.fill_poly([vest.right_pt(du0, dvt), vest.right_pt(du1, dvt),
                 vest.right_pt(du1, dvb), vest.right_pt(du0, dvb)], "K")
    # smooth D door leaf inset inside the K frame (sealed, flush, on the shaded face)
    c.fill_poly([vest.right_pt(du0 + 0.06, dvt + 0.5), vest.right_pt(du1 - 0.06, dvt + 0.5),
                 vest.right_pt(du1 - 0.06, dvb - 0.3), vest.right_pt(du0 + 0.06, dvb - 0.3)], "D")
    # lit left jamb + dark right jamb so the hatch reads sealed & framed
    c.line(vest.right_pt(du0 + 0.06, dvt + 0.5), vest.right_pt(du0 + 0.06, dvb - 0.3), "M")
    c.line(vest.right_pt(du1 - 0.06, dvt + 0.5), vest.right_pt(du1 - 0.06, dvb - 0.3), "K")
    # central seam of the sliding door + a small c viewport window
    c.line(vest.right_pt(0.5, dvt + 0.6), vest.right_pt(0.5, dvb - 0.4), "K")
    vp = vest.right_pt(0.5, dvt + 1.4)
    c.set(int(round(vp[0])) - 1, int(round(vp[1])), "c"); c.set(int(round(vp[0])), int(round(vp[1])), "h")
    c.set(int(round(vp[0])) - 1, int(round(vp[1])) + 1, "g")

    # --- o/K HAZARD CHEVRON band on the lintel above the door (on the right face) ---
    haz = vest.right_pt(du0, dvt - 0.2)
    hx, hy = int(round(haz[0])), int(round(haz[1]))
    for k in range(5):
        c.set(hx + k * 2, hy, "o"); c.set(hx + k * 2 + 1, hy, "K")

    # --- c STATUS LIGHT on the lit (left) face of the vestibule (airlock clear) ---
    sl = vest.left_pt(0.5, 2.0)
    c.set(int(round(sl[0])), int(round(sl[1])), "c"); c.set(int(round(sl[0])), int(round(sl[1])) - 1, "h")
    # a couple of D louver vents on the vestibule's lit face
    for lv in (3.4, 4.4):
        c.line(vest.left_pt(0.3, lv), vest.left_pt(0.7, lv), "D")
    return vest


# ── 3. CLEAN-ROOM WINDOW BAND + louvers on the lit (left) front face ──────────
def clean_room_glazing(c, room):
    """One sleek horizontal g/c K-framed clean-room window strip centered on the
    lit front face (NOT stock punched windows) + a couple of D louver vents. The
    band is the hero of the front wall, so it's wide and crisply framed."""
    u0, u1, vt, vb = 0.08, 0.70, 4.4, 7.6
    # K frame (sealed surround)
    c.fill_poly([room.left_pt(u0, vt), room.left_pt(u1, vt),
                 room.left_pt(u1, vb), room.left_pt(u0, vb)], "K")
    # cyan glazing inset (g body, c lit upper edge, h glint, G lower shade)
    c.fill_poly([room.left_pt(u0 + 0.012, vt + 0.6), room.left_pt(u1 - 0.012, vt + 0.6),
                 room.left_pt(u1 - 0.012, vb - 0.5), room.left_pt(u0 + 0.012, vb - 0.5)], "g")
    c.line(room.left_pt(u0 + 0.02, vt + 0.8), room.left_pt(u1 - 0.02, vt + 0.8), "c")
    c.line(room.left_pt(u0 + 0.02, vb - 0.6), room.left_pt(u1 - 0.02, vb - 0.6), "G")
    gl = room.left_pt(u0 + 0.06, vt + 1.1); c.set(int(round(gl[0])), int(round(gl[1])), "h")
    gl2 = room.left_pt(u0 + 0.30, vt + 1.1); c.set(int(round(gl2[0])), int(round(gl2[1])), "c")
    # thin K mullions divide the long strip into clean-room panes
    for m in (0.22, 0.36, 0.50):
        c.line(room.left_pt(m, vt + 0.5), room.left_pt(m, vb - 0.4), "K")

    # a couple of D louver vents toward the front corner, right of the band
    for lu in (0.80, 0.90):
        for lv in (4.6, 5.8, 7.0):
            c.line(room.left_pt(lu - 0.02, lv), room.left_pt(lu + 0.02, lv), "D")
        c.line(room.left_pt(lu - 0.025, 4.4), room.left_pt(lu - 0.025, 7.4), "K")


# ── 4. SIGNATURE — the FLAT ROOF as a live circuit board ─────────────────────
def circuit_board_roof(c, room):
    """The big flat roof IS the PCB. A thin D parapet frame + rivets ring the dark
    d substrate; cyan g/c traces route from a central RAISED DIP chip out to r/o
    gold pads; ONE trace runs a yellow current pulse to a bright O pad; 2-3 SMD
    chips + a c capacitor can dress the board. The chip reads as a raised pinned
    IC (flat lit top, K shadow edge, M pin ladders), never a pit or mound."""

    # --- thin D parapet/corrugated frame just inside the roof rim + K rivets ---
    fr = [room.roof_pt(0.10, 0.10), room.roof_pt(0.90, 0.10),
          room.roof_pt(0.90, 0.90), room.roof_pt(0.10, 0.90)]
    c.line(fr[0], fr[1], "D"); c.line(fr[1], fr[2], "D")
    c.line(fr[2], fr[3], "D"); c.line(fr[3], fr[0], "D")
    for u, v in [(0.10, 0.10), (0.90, 0.10), (0.10, 0.90), (0.90, 0.90)]:
        p = room.roof_pt(u, v); c.set(int(round(p[0])), int(round(p[1])), "K")

    # --- chip footprint (axis-aligned rect, computed first so traces anchor to
    #     the chip's real pin edges; the chip is DRAWN last, on top) ---
    cxp = int(round(room.roof_pt(0.50, 0.50)[0]))
    cyp = int(round(room.roof_pt(0.50, 0.50)[1]))
    HW, HH, BODY = 6, 4, 2
    PIN_LEN = 3
    tx0, tx1 = cxp - HW, cxp + HW
    ty0, ty1 = cyp - HH - 1, cyp + HH - 1
    A_LEFT  = (tx0 - PIN_LEN - 1, cyp)
    A_RIGHT = (tx1 + PIN_LEN + 1, cyp)
    A_FRONT = (cxp, ty1 + BODY + 1)
    A_BACK  = (cxp, ty0 - 1)

    # --- gold pad positions, pulled INWARD off the diamond edge so all board
    #     content stays ON the flat roof and never spills onto the clean walls ---
    PADS = {
        "left":  room.roof_pt(0.22, 0.28),
        "bl":    room.roof_pt(0.20, 0.58),
        "right": room.roof_pt(0.78, 0.78),
        "fr":    room.roof_pt(0.80, 0.42),
        "front": room.roof_pt(0.70, 0.22),   # the LIVE/pulsed pad
        "back":  room.roof_pt(0.22, 0.80),
    }

    # --- cyan traces: each one unbroken g run from a chip pin anchor → elbow → pad ---
    traces = [
        [A_LEFT,  (A_LEFT[0] - 4, A_LEFT[1] - 3), PADS["left"]],
        [A_LEFT,  (A_LEFT[0] - 3, A_LEFT[1] + 3), PADS["bl"]],
        [A_RIGHT, (A_RIGHT[0] + 4, A_RIGHT[1] + 3), PADS["right"]],
        [A_RIGHT, (A_RIGHT[0] + 4, A_RIGHT[1] - 1), PADS["fr"]],
        [A_FRONT, (A_FRONT[0] + 4, A_FRONT[1] + 1), PADS["front"]],
        [A_BACK,  (A_BACK[0] - 4, A_BACK[1] - 2), PADS["back"]],
    ]
    for poly in traces:
        for i in range(len(poly) - 1):
            c.line(poly[i], poly[i + 1], "g")
    # a couple of c trace highlights so the routing reads bright/alive
    c.line(A_LEFT, (A_LEFT[0] - 4, A_LEFT[1] - 3), "c")
    c.line(A_BACK, (A_BACK[0] - 4, A_BACK[1] - 2), "c")

    # --- gold solder pads at the trace endpoints (front pad is powered/bright) ---
    gold_pad(c, *PADS["left"])
    gold_pad(c, *PADS["bl"])
    gold_pad(c, *PADS["right"])
    gold_pad(c, *PADS["fr"])
    gold_pad(c, *PADS["back"])
    gold_pad(c, *PADS["front"], lit=True)

    # --- YELLOW CURRENT PULSE down the FRONT trace to the live pad ---
    pulse = [A_FRONT, (A_FRONT[0] + 5, A_FRONT[1] + 2), PADS["front"]]
    for i in range(len(pulse) - 1):
        c.line(pulse[i], pulse[i + 1], "o")
    ax, ay = pulse[1]; bx, by = pulse[2]
    for t in (0.2, 0.4, 0.6, 0.8):
        px, py = ax + (bx - ax) * t, ay + (by - ay) * t
        c.set(px, py, "O"); c.set(px, py - 1, "o")

    # --- SMD components + capacitor can in the open gaps (sparse, clear of traces) ---
    s1 = room.roof_pt(0.30, 0.32); smd(c, *s1)
    s2 = room.roof_pt(0.70, 0.26); smd(c, *s2)
    s3 = room.roof_pt(0.36, 0.74); smd(c, *s3)
    # cylindrical capacitor can (K body, G/c top) in the front-right gap
    ccx, ccy = room.roof_pt(0.66, 0.70)
    ccx, ccy = int(round(ccx)), int(round(ccy))
    rect(c, ccx - 2, ccy - 3, ccx + 2, ccy + 1, fill="K")
    rect(c, ccx - 2, ccy - 3, ccx + 1, ccy - 1, fill="G")
    c.set(ccx - 1, ccy - 3, "c"); c.set(ccx, ccy - 2, "h")

    # --- HERO PROP: RAISED DIP-CHIP IC (axis-aligned block, flat lit top) ---
    # 1) DIP PINS first: two rows of discrete M legs out of the two LONG sides, each
    #    in a K gutter so leg/gap/leg/gap reads as separate metal pins.
    for yy in range(ty0, ty1 + 1):
        for dx in range(1, PIN_LEN + 2):
            c.set(tx0 - dx, yy, "K"); c.set(tx1 + dx, yy, "K")
    for yy in range(ty0 + 1, ty1, 2):
        for dx in range(1, PIN_LEN + 1):
            c.set(tx0 - dx, yy, "M"); c.set(tx1 + dx, yy, "M")
    # 2) DARK BODY BAND (proud-block depth) + contact shadow grounds it ON the board.
    rect(c, tx0, ty1, tx1, ty1 + BODY, fill="K")
    c.line((tx0, ty1 + BODY + 1), (tx1 + 1, ty1 + BODY + 1), "K")
    # 3) FLAT LIT TOP FACE — bright L rect, W highlight band, crisp d front lip, K edges.
    rect(c, tx0, ty0, tx1, ty1, fill="L")
    c.line((tx0, ty0), (tx1, ty0), "W")
    c.line((tx0 + 1, ty0 + 1), (tx1 - 1, ty0 + 1), "W")
    c.line((tx0, ty1), (tx1, ty1), "d")
    c.line((tx0, ty0), (tx0, ty1), "K")
    c.line((tx1, ty0), (tx1, ty1), "K")
    c.line((tx0, ty0), (tx1, ty0), "K")
    c.set(tx0, ty1, "K"); c.set(tx1, ty1, "K")
    # 4) ORIENTATION NOTCH (pin-1 g/c marker) at the back-left of the lit top.
    c.set(tx0 + 2, ty0 + 3, "g"); c.set(tx0 + 3, ty0 + 3, "c")
    c.set(tx0 + 2, ty0 + 4, "g")

    # expose the chip + anchor geometry so the t5 crowning stage can re-anchor
    # ON the same DIP chip without hardcoding a second guess.
    return {"cxp": cxp, "cyp": cyp, "tx0": tx0, "tx1": tx1, "ty0": ty0, "ty1": ty1,
            "HW": HW, "HH": HH, "PADS": PADS,
            "A_LEFT": A_LEFT, "A_RIGHT": A_RIGHT, "A_FRONT": A_FRONT, "A_BACK": A_BACK}


# ── 5. Volt motifs on the walls + a ribbon cable off a roof edge ─────────────
def wall_motifs_and_ribbon(c, room, vest):
    """o current-pulse power line along the front eave, a cyan board-tester window
    on the front face, and an M ribbon-cable bundle spilling off a roof edge down
    the shaded right face."""
    # glowing o power-rail trim — a single thin line right at the lit front eave so
    # it reads as a power conduit without crowding the glazing band below it.
    c.line(room.left_pt(0.06, 2.0), room.left_pt(0.94, 2.0), "o")
    c.line(room.left_pt(0.06, 2.7), room.left_pt(0.94, 2.7), "r")

    # small cyan BOARD-TESTER readout panel toward the FRONT corner, high on the
    # lit face (clearly separated from the glazing band, in its own corner).
    tu0, tu1, tvt, tvb = 0.78, 0.95, 0.6, 2.0
    c.fill_poly([room.left_pt(tu0, tvt), room.left_pt(tu1, tvt),
                 room.left_pt(tu1, tvb), room.left_pt(tu0, tvb)], "K")
    c.fill_poly([room.left_pt(tu0 + 0.012, tvt + 0.3), room.left_pt(tu1 - 0.012, tvt + 0.3),
                 room.left_pt(tu1 - 0.012, tvb - 0.2), room.left_pt(tu0 + 0.012, tvb - 0.2)], "c")
    tg = room.left_pt(tu0 + 0.03, tvt + 0.5); c.set(int(round(tg[0])), int(round(tg[1])), "h")
    c.line(room.left_pt(tu0 + 0.02, tvt + 0.9), room.left_pt(tu1 - 0.04, tvt + 0.9), "g")

    # M ribbon-cable bundle off the front-right roof edge, draped down the right wall
    edge = room.roof_pt(0.62, 0.92)
    drop = room.right_pt(0.22, 0)
    c.line((int(edge[0]), int(edge[1])), (int(drop[0]), int(drop[1])), "M")
    for vv in range(0, 9):
        x, y = room.right_pt(0.22, vv)
        x, y = int(round(x)), int(round(y))
        c.set(x - 1, y, "L"); c.set(x, y, "M"); c.set(x + 1, y, "D")
    # small K clamp at the top of the drape
    c.set(int(round(drop[0])), int(round(drop[1])) - 1, "K")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS board/etch/
# reflow structure onto the prior form — never restarts, never recolors the whole
# building. Theme: the clean-room fab grows into a fully built-out, high-tech PCB
# line. Colours mature stage by stage; gold (q) only as a t5 flourish.
#
#   t2  small functional add   : extra SMD bumps + one more o current-pulse LED
#   t3  structural add         : a stepped ETCH-TANK ANNEX on the shaded side
#   t4  major add              : a REFLOW-OVEN TUNNEL raised across the back roof
#   t5  crowning feature       : board powers ON — E trace lattice + glowing DIP
#                                megacupola halo + q gold solder pads
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_smd_bank(c, room, chip):
    """t2 — SMALL FUNCTIONAL ADD: the board gets busier. A short BANK of extra SMD
    component bumps populates the OPEN back-left board pocket (between the left gold
    pads and the chip's back, clear of the chip top and the existing traces), plus
    ONE more o/O current-pulse LED with a short g feeder on that same pocket. Base
    palette; an O highlight brightens the new pulse. Subtle but noticeable — 'this
    line now runs more parts'."""
    # a tidy row of three tiny SMD bumps in the open BACK-LEFT board pocket
    # (roof_pt low-u, mid-v → x16..20, y25..27 — verified empty substrate).
    for (u, v) in [(0.14, 0.46), (0.13, 0.56), (0.18, 0.50)]:
        smd(c, *room.roof_pt(u, v))
    # a fresh o/O current-pulse LED just forward of the new bank, on open substrate
    led = room.roof_pt(0.22, 0.46)
    lx, ly = int(round(led[0])), int(round(led[1]))
    c.set(lx, ly, "o"); c.set(lx, ly - 1, "O"); c.set(lx - 1, ly, "o")
    # tiny g feeder trace tying the new LED toward the chip's left pin anchor
    feeder = [room.roof_pt(0.24, 0.48), (chip["A_LEFT"][0] - 1, chip["A_LEFT"][1] - 1)]
    c.line(feeder[0], feeder[1], "g")


def stage3_etch_tank(c, room):
    """t3 — STRUCTURAL ADD: a stepped ETCH-TANK ANNEX bolted onto the SHADED (right)
    side of the clean-room — a low covered chemical bath whose open top shows a glowing
    g cyan ETCHANT surface (window-style glaze), with a D housing and a vent stub.
    A real new structural mass abutting the right wall (grows OUT, footprint base of
    the main room unchanged). Introduces the matured deep-steel `b` for the housing
    shadow; the etchant pool is the on-theme cyan tell of a PCB etch line."""
    # seat the tank's back-top corner low on the shaded right face, forward of the
    # airlock and well clear of the front glazing band.
    base = room.right_pt(0.86, 4.6)
    tank = Box(top=(base[0] + 4, base[1] - 4), wx=4, wy=4, h=5)
    tank.draw(c, roof="d", lwall="M", rwall="b", roof_hi="L", outline="K")
    # bright clean-room parapet glint on the tank crest (matches the main cap)
    c.line(tank.r_top, tank.r_left, "L")
    c.line(tank.r_top, tank.r_right, "M")
    # --- OPEN ETCHANT BATH: a recessed g pool inset into the flat tank roof ---
    pool = [tank.roof_pt(0.18, 0.18), tank.roof_pt(0.82, 0.18),
            tank.roof_pt(0.82, 0.82), tank.roof_pt(0.18, 0.82)]
    c.fill_poly(pool, "g")
    # cyan lit upper edge + darker G lower edge so the pool reads as a sunken liquid
    c.line(tank.roof_pt(0.18, 0.18), tank.roof_pt(0.82, 0.18), "G")
    c.line(tank.roof_pt(0.18, 0.18), tank.roof_pt(0.18, 0.82), "G")
    c.line(tank.roof_pt(0.20, 0.78), tank.roof_pt(0.80, 0.78), "c")
    # a couple of bright h ripple glints on the etchant surface
    rg = tank.roof_pt(0.40, 0.42); c.set(int(round(rg[0])), int(round(rg[1])), "h")
    rg2 = tank.roof_pt(0.62, 0.58); c.set(int(round(rg2[0])), int(round(rg2[1])), "c")
    # K rim frame around the pool so it reads as a contained tank, not spilled paint
    for a, b in [(pool[0], pool[1]), (pool[1], pool[2]), (pool[2], pool[3]), (pool[3], pool[0])]:
        c.line(a, b, "K")
    # short D vent/drain stub on the tank's shaded right face
    c.line(tank.right_pt(0.3, 1.6), tank.right_pt(0.7, 1.6), "D")
    c.line(tank.right_pt(0.3, 2.6), tank.right_pt(0.7, 2.6), "D")
    return tank


def stage4_reflow(c, room, chip):
    """t4 — MAJOR ADD: a REFLOW-OVEN TUNNEL — a long covered conveyor oven raised on
    the BACK of the roof, running back-left → back-right BEHIND the DIP chip so it
    never buries the signature. Built as a real iso Box mass (deep-steel `b` walls,
    L roof) so it reads as a solid prominent structure, not a flat plane. Its lit
    (left) wall carries a row of glowing `e/E` heater-zone VIEWPORTS — the on-theme
    tell of a reflow line — and a short conveyor stub pokes out the right mouth.

    The oven box is LONG in wx (toward back-right) and SLIM in wy, modest height, its
    back-top corner seated up on the back roof so the body sits clearly behind the
    chip and stays fully on-canvas (both ends clamp inside the roof)."""
    # seat the oven's back-top corner in the open BACK-RIGHT roof triangle (right of
    # the centered chip, toward the r_right corner) so it never occludes the chip.
    # Long toward the right (wx), slim in depth (wy), modest height.
    base = room.roof_pt(0.46, 0.92)
    bx, by = int(round(base[0])), int(round(base[1]))
    oven = Box(top=(bx, by - 4), wx=5, wy=2, h=5)
    oven.draw(c, roof="L", lwall="b", rwall="d", roof_hi="W", outline="K")
    # bright clean-room cap glint on the oven crest
    c.line(oven.r_top, oven.r_left, "W")
    c.line(oven.r_top, oven.r_right, "L")
    # a faint M lit band just under the roof on the lit wall
    c.line(oven.left_pt(0.06, 1.0), oven.left_pt(0.94, 1.0), "M")
    # --- a ROW of glowing e/E heater-zone viewports recessed into the lit wall ---
    n = 5
    for k in range(n):
        u = (k + 0.5) / n
        p = oven.left_pt(u, 2.4)
        wx, wy = int(round(p[0])), int(round(p[1]))
        c.set(wx, wy - 1, "K")                         # dark recess top
        c.set(wx, wy, "e"); c.set(wx, wy + 1, "E")     # glowing port
    # K seam dividing the heater panels on the lit wall
    c.line(oven.left_pt(0.04, 3.4), oven.left_pt(0.96, 3.4), "K")
    # --- a short conveyor stub poking out the right (shaded) mouth — board entry ---
    cm = oven.right_pt(0.9, 3.0)
    cmx, cmy = int(round(cm[0])), int(round(cm[1]))
    c.line((cmx, cmy), (cmx + 4, cmy + 1), "D")
    c.set(cmx + 4, cmy + 1, "K")
    c.set(cmx + 1, cmy, "e")                            # faint glow at the mouth
    return oven


def stage5_powered_board(c, room, chip):
    """t5 — CROWNING FEATURE = FULLY EVOLVED PCB fab. The roof board "powers on":
    a dense E trace LATTICE energizes the substrate, a glowing DIP-chip MEGACUPOLA
    HALO crowns the signature chip (a bright cyan dome of light + radiating arcs on
    the SAME chip, re-anchored from chip geometry), and the elite line gets a GOLD
    flourish — q gold solder pads upgrading the existing pads + a gold trace ring
    around the board rim. Reads as maxed-out, still clearly the same PCB fab."""
    cxp, cyp = chip["cxp"], chip["cyp"]
    tx0, tx1, ty0, ty1 = chip["tx0"], chip["tx1"], chip["ty0"], chip["ty1"]

    # --- 1) DENSE E TRACE LATTICE: a few extra bright energized traces lacing the
    #     open board between the chip and the rim, so the substrate reads 'live'. ---
    lat = [
        [room.roof_pt(0.16, 0.40), room.roof_pt(0.34, 0.40), (tx0 - 2, cyp - 2)],
        [room.roof_pt(0.16, 0.66), room.roof_pt(0.30, 0.66), (tx0 - 2, cyp + 3)],
        [room.roof_pt(0.84, 0.36), (tx1 + 2, cyp - 1)],
        [room.roof_pt(0.84, 0.62), (tx1 + 2, cyp + 3)],
    ]
    for poly in lat:
        for i in range(len(poly) - 1):
            c.line(poly[i], poly[i + 1], "e")
    # bright E nodes where the new lattice meets the rim
    for (u, v) in [(0.16, 0.40), (0.16, 0.66), (0.84, 0.36), (0.84, 0.62)]:
        p = room.roof_pt(u, v); c.set(int(round(p[0])), int(round(p[1])), "E")

    # --- 2) GLOWING DIP-CHIP MEGACUPOLA HALO crowning the signature chip. A small
    #     cyan power dome of light hovering just over the chip's lit top + radiating
    #     energy arcs, re-anchored from the chip's own top centre. ---
    import math
    dome_cx = cxp
    dome_cy = ty0 - 2                      # just above the chip's lit top edge
    # ground plinth posts on the chip top so the dome reads seated, not floating
    c.set(dome_cx - 3, ty0, "M"); c.set(dome_cx + 3, ty0, "M")
    # the glowing dome: a bright cyan half-ellipse cap
    for a_ang in range(0, 181, 12):
        x = dome_cx + 4 * math.cos(math.radians(a_ang))
        y = dome_cy - 3 * math.sin(math.radians(a_ang))
        c.set(x, y, "E")
    for a_ang in range(0, 181, 18):
        x = dome_cx + 2.4 * math.cos(math.radians(a_ang))
        y = dome_cy - 1.8 * math.sin(math.radians(a_ang))
        c.set(x, y, "e")
    # bright core + a W spark at the dome apex
    c.set(dome_cx, dome_cy - 3, "W")
    c.set(dome_cx, dome_cy - 2, "E")
    c.set(dome_cx - 1, dome_cy - 2, "e")
    c.set(dome_cx + 1, dome_cy - 2, "e")
    # radiating energy arcs leaping off the dome to the nearest gold pads
    arcs = [
        [(dome_cx - 4, dome_cy - 1), (dome_cx - 7, dome_cy - 3), (dome_cx - 9, dome_cy)],
        [(dome_cx + 4, dome_cy - 1), (dome_cx + 7, dome_cy - 3), (dome_cx + 9, dome_cy)],
    ]
    for poly in arcs:
        for i in range(len(poly) - 1):
            c.line(poly[i], poly[i + 1], "E")
        for px, py in poly:
            c.set(int(round(px)), int(round(py)) + 1, "e")

    # --- 3) GOLD FLOURISH (t5 only): upgrade the existing gold pads to bright q
    #     premium solder pads + a thin q gold trace ring just inside the board rim. ---
    for key in ("left", "right", "fr", "back"):
        px, py = chip["PADS"][key]
        px, py = int(round(px)), int(round(py))
        for dx in (-1, 0, 1):
            c.set(px + dx, py, "q")
        c.set(px, py - 1, "q")
        c.set(px, py, "O")
    # a sparse q gold trace ring tracking just inside the parapet (4 corner runs)
    rim = [room.roof_pt(0.13, 0.13), room.roof_pt(0.87, 0.13),
           room.roof_pt(0.87, 0.87), room.roof_pt(0.13, 0.87)]
    # only draw the back-left + back-right legs so the gold stays a TRIM accent,
    # not a full re-outline of the board (keeps gold as a flourish).
    c.line(rim[0], rim[1], "q")
    c.line(rim[0], rim[3], "q")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the PCB Fab at upgrade `stage` (1..5). Stage 1 is IDENTICAL to the
    shipped base; each higher stage keeps every prior addition and bolts on the next
    (t2 SMD bank → t3 etch tank → t4 reflow oven → t5 powered board + gold). Painter's
    order keeps rooftop/overhead additions on top of the masses they grow from."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    # painter's order: clean-room body, then the roof board, then the front glazing,
    # then the airlock on the right (in front), then wall motifs.
    room = clean_room(c)
    chip = circuit_board_roof(c, room)
    clean_room_glazing(c, room)
    vest = airlock(c, room)
    wall_motifs_and_ribbon(c, room, vest)

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    # t2 dresses the existing board (drawn on top of the deck content).
    if stage >= 2:
        stage2_smd_bank(c, room, chip)
    # t3 etch tank abuts the shaded right side (drawn after the room so it sits in
    # front of the right wall but behind nothing it should occlude).
    if stage >= 3:
        stage3_etch_tank(c, room)
    # t4 reflow tunnel rises off the BACK of the roof; drawn after the board so its
    # legs/body sit on the deck, but it lives at the back so it never buries the chip.
    if stage >= 4:
        stage4_reflow(c, room, chip)
    # t5 re-energizes the board + crowns the chip; drawn last so the glow/halo and
    # gold pads sit on top of everything they decorate.
    if stage >= 5:
        stage5_powered_board(c, room, chip)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/volt_lab"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "pcb-fab"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped pcb-fab.png, so it does NOT overwrite the base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": VOLT, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"volt_lab_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"volt_lab_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
