#!/usr/bin/env python3
"""
PCB Fab — Volt Lab economy building (BESPOKE-FORM REBUILD).

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
"""
import os
import sys
import json

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box

VOLT = {"K": "#15181d", "W": "#eef2f6", "L": "#cdd6dd", "M": "#9aa3ad", "D": "#6c7682", "d": "#49515b",
        "h": "#d6f9ff", "c": "#aef0fb", "g": "#38cfe2", "G": "#1f8ba0",
        "o": "#ffe85a", "O": "#fff7a8", "r": "#c89a14"}


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


def main():
    c = Canvas()
    # painter's order: clean-room body, then the airlock on the right (in front),
    # then wall glazing/motifs, then the flat roof board (drawn on top of the deck).
    room = clean_room(c)
    circuit_board_roof(c, room)
    clean_room_glazing(c, room)
    vest = airlock(c, room)
    wall_motifs_and_ribbon(c, room, vest)

    spec = {"width": 64, "height": 64, "palette": VOLT, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/volt_lab_pcb-fab.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    main()
