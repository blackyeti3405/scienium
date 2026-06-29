#!/usr/bin/env python3
"""
Computation Cluster — Axiom lab economy building (BESPOKE form).

NOT the gateway cube. A LONG LOW SERVER HALL (data-center massing — low and
horizontal, all vents) with a round COOLING-TOWER cylinder rising off its
back-right corner, and a busy louvered HVAC roof deck. Two clearly different
volumes (box hall + tank) so the silhouette is unmistakable.

Opening side = RIGHT (the shaded face). The hero is a wide K-framed glass
equipment wall on that shaded right face revealing a GLOWING immersion-cooled
GPU blade rack: a stack of cyan/green blade cards in a clear coolant bath with a
diagonal green->gold OPTIMIZATION HEAT-SWEEP balancing the compute load, plus a
load-bar gauge leveling out on the sill. The lit LEFT face stays plainer —
server-vent louvers, one small status window, a K access door.

Composed entirely from art/isobuild.{Box,cylinder} — NO iso.draw_cube /
base_windows.
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

# Axiom set palette — chars -> hex EXACTLY per the blueprint (<=16 colors).
# Base keys (shared across all 10 Axiom buildings) + a few EVOLVED accent shades
# reserved for the upgrade stages ONLY (they never appear in stage 1, so the shipped
# computation-cluster.png is unchanged). These four evolved keys+hexes are the
# LAB-WIDE Axiom convention — every Axiom building's _t2.._t5 reuses them:
#   b  deep indigo steel   — matured structure tone for t3+ new masses
#   e  quantum-stellar glow (mid)    E  quantum-stellar glow (bright) — t4/t5 energy
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
AXIOM = {"K": "#0e1124", "W": "#dfe6f6", "L": "#b4bee0", "M": "#7c88b8", "D": "#4e5888", "d": "#333a60",
         "h": "#d6ecff", "c": "#aad8ff", "g": "#4a9ce6", "G": "#2060b0",
         "o": "#ffe27a", "O": "#fff3c0", "r": "#c89a2a",
         "b": "#2a3158", "e": "#7ad0ff", "E": "#cdeeff", "q": "#f6c945"}

# Shared cooling-tower geometry — the base tank AND the t3 twin / t5 gold cap all
# recompute from this ONE source (no hardcoded second guesses for the tank top).
TOWER_CX, TOWER_TOP_Y, TOWER_RX, TOWER_H = 48, 11, 5, 17


# ── low-level pixel helpers ──────────────────────────────────────────────────
def px(c, x, y, ch):
    c.set(int(round(x)), int(round(y)), ch)


def hline(c, x0, x1, y, ch):
    if x1 < x0:
        x0, x1 = x1, x0
    for x in range(int(round(x0)), int(round(x1)) + 1):
        c.set(x, int(round(y)), ch)


def vline(c, x, y0, y1, ch):
    if y1 < y0:
        y0, y1 = y1, y0
    for y in range(int(round(y0)), int(round(y1)) + 1):
        c.set(int(round(x)), y, ch)


# ── the COOLING TOWER cylinder (back-right, drawn FIRST so the hall occludes it) ─
def cooling_tower(c):
    """A round cooling-tower tank rising off the back-right corner of the hall.
    M/D shaded, K rim, with a faint cyan vapor wisp (a small particle-ring echo)
    drifting off its top — the Axiom rising-particle motif."""
    cx, top_y, rx, h = TOWER_CX, TOWER_TOP_Y, TOWER_RX, TOWER_H
    cylinder(c, cx, top_y, rx, h, top="M", side_l="M", side_r="D", outline="K")
    ry = max(2.0, rx * 0.5)

    # a banded cooling-tower body: two thin D cinch rings + an o status band
    for ry_off in (5, 11):
        for col in range(-rx + 1, rx):
            t = 1 - (col / rx) ** 2
            if t < 0:
                continue
            y = top_y + ry * (1 - (col / rx) ** 2) ** 0.5 * 0 + ry_off + ry
            c.set(cx + col, int(round(y)), "d")
    # a glowing o coolant-status band near the top of the tank
    for col in range(-rx + 1, rx):
        t = 1 - (col / rx) ** 2
        if t < 0:
            continue
        edge = ry * (t ** 0.5)
        c.set(cx + col, int(round(top_y + edge + 2)), "o" if col <= 0 else "r")
    # bright W rim glint along the lit-back arc of the top ellipse
    for a in range(186, 356, 6):
        x = cx + rx * math.cos(math.radians(a))
        y = top_y + ry * math.sin(math.radians(a))
        c.set(x, y, "W")

    # --- vapor wisp: a small rising particle-ring of c/h/W dots off the rim ---
    wisp = [(-1, -2, "c"), (0, -3, "h"), (1, -4, "c"),
            (0, -5, "W"), (-1, -6, "c"), (1, -7, "h")]
    for dx, dy, ch in wisp:
        c.set(cx + dx, top_y - 2 + dy, ch)


# ── the SERVER HALL — a long low Box (the dominant mass) ──────────────────────
def server_hall(c):
    """A long, deep, low machine hall. Lit L/M left face, shaded D right face,
    flat roof. Returns the Box so callers can place vents / glass / details."""
    h = Box((24, 16), wx=13, wy=8, h=13)
    h.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    return h


def roof_deck(c, h):
    """A clean mechanical roof deck: TWO well-separated HVAC louver vent banks
    (parallel slat panels reading as solid vents), two small D exhaust cowls, and
    a thin o power bus running the front-right ridge — a busy-but-legible deck,
    no parapet. Slats run along the roof's right-axis so they read as crisp
    parallel ribs in the iso projection, not speckle."""
    # TWO vent banks, well-separated, each a dark recessed panel framed in K with
    # a few clean parallel slat ribs + one lit M back lip.
    for f0, f1 in ((0.20, 0.42), (0.54, 0.76)):
        p0 = h.roof_pt(0.20, f0)   # back-left
        p1 = h.roof_pt(0.80, f0)   # back-right
        p2 = h.roof_pt(0.80, f1)   # front-right
        p3 = h.roof_pt(0.20, f1)   # front-left
        c.fill_poly([p0, p1, p2, p3], "D")
        # 3 clean slat ribs running the long (right-axis) direction of the bank
        for s in (0.25, 0.5, 0.75):
            v = f0 + (f1 - f0) * s
            c.line(h.roof_pt(0.20, v), h.roof_pt(0.80, v), "K")
            c.line(h.roof_pt(0.20, v + 0.04), h.roof_pt(0.80, v + 0.04), "M")
        # K frame
        for a, b in [(p0, p1), (p1, p2), (p2, p3), (p3, p0)]:
            c.line(a, b, "K")
        # bright M lit lip on the back edge
        c.line(p0, p1, "L")

    # two small D exhaust cowls tucked at the back-left corner of the deck
    for cf in (0.30, 0.52):
        cp = h.roof_pt(0.10, cf)
        cx, cy = int(round(cp[0])), int(round(cp[1]))
        c.fill_poly([(cx, cy - 3), (cx + 2, cy - 2), (cx + 2, cy + 1), (cx, cy)], "D")
        c.line((cx, cy - 3), (cx + 2, cy - 2), "L")     # lit top edge
        c.set(cx, cy - 3, "K"); c.set(cx + 2, cy - 2, "K")
        c.set(cx + 1, cy - 1, "d")                      # vent mouth

    # thin o power bus running the front-right ridge, r shaded underside
    c.line(h.roof_pt(0.88, 0.14), h.roof_pt(0.88, 0.86), "o")
    c.line(h.roof_pt(0.91, 0.16), h.roof_pt(0.91, 0.86), "r")
    for f in (0.28, 0.5, 0.72):                          # K junction clamps
        jp = h.roof_pt(0.88, f)
        c.set(int(round(jp[0])), int(round(jp[1])), "K")


# ── LEFT (lit) face — kept plainer: server-vent louvers + status window + door ─
def left_face(c, h):
    """The lit LEFT face: two server-vent louver wings, one small cyan status
    window, and a K access door. Plain machine-hall face — the hero is on the
    right."""
    # two server-vent louver wings (opaque solid louvers, NOT glass)
    h.louver(c, "left", 0.08, 0.34, 3, 10, body="D", slat="K", edge="M", frame="K")
    h.louver(c, "left", 0.40, 0.62, 3, 10, body="D", slat="K", edge="M", frame="K")

    # one small cyan status window (navy night-sky glass) high on the face
    h.window(c, "left", 0.70, 0.86, 3, 6.5, glass="g", hi="h", shade="G",
             frame="K", mullions=0)

    # a K access door, grounded at the sill on the right end of the lit face
    du0, du1, dvt, dvb = 0.70, 0.88, 7.5, h.h - 0.4
    c.fill_poly([h.left_pt(du0, dvt), h.left_pt(du1, dvt),
                 h.left_pt(du1, dvb), h.left_pt(du0, dvb)], "K")
    # door leaf (dark navy) with a thin c kick-light and an o handle dot
    c.fill_poly([h.left_pt(du0 + 0.03, dvt + 0.8), h.left_pt(du1 - 0.03, dvt + 0.8),
                 h.left_pt(du1 - 0.03, dvb), h.left_pt(du0 + 0.03, dvb)], "d")
    c.line(h.left_pt(du0 + 0.03, dvb - 0.4), h.left_pt(du1 - 0.03, dvb - 0.4), "c")
    hp = h.left_pt(du1 - 0.06, (dvt + dvb) / 2)
    c.set(int(round(hp[0])), int(round(hp[1])), "o")


# ── RIGHT (shaded) face — THE HERO: glowing immersion-cooled GPU blade rack ────
def gpu_rack_wall(c, h):
    """The signature: a wide K-framed glass equipment wall on the SHADED RIGHT
    face revealing a GLOWING immersion-cooling tank of GPU blades, with a green
    optimization heat-sweep balancing the load. Built in clean passes so it reads
    as glowing glass over hardware, never a black-barred grid."""
    u0, u1, vt, vb = 0.10, 0.90, 2.5, 11.0

    # --- 1. the GLOWING glass equipment wall (bright cyan = lit interior) ---
    #     brighter glass/hi than the plain status window so it GLOWS on the dark
    #     face. No mullions — the blade cards become the visual structure.
    h.window(c, "right", u0, u1, vt, vb, glass="c", hi="h", shade="g",
             frame="K", mullions=0)

    # right-face coordinate sampler within the glass panel
    def rp(fu, fv):
        # fu 0..1 across the glass width, fv 0..1 down the glass height
        u = u0 + (u1 - u0) * fu
        v = vt + (vb - vt) * fv
        return h.right_pt(u, v)

    # --- 2. the immersion COOLANT BATH: a clear h/c fluid body behind the rack
    #     with a bright h fluid line near the top and tiny W bubble dots rising ---
    # bright fluid line near the top of the tank
    c.line(rp(0.06, 0.18), rp(0.94, 0.18), "h")
    c.line(rp(0.06, 0.20), rp(0.94, 0.20), "c")
    # rising bubble dots (the immersion-cooling tell)
    for bu, bv in [(0.20, 0.62), (0.27, 0.48), (0.22, 0.34),
                   (0.74, 0.66), (0.80, 0.52), (0.77, 0.38)]:
        bp = rp(bu, bv)
        c.set(int(round(bp[0])), int(round(bp[1])), "W")

    # --- 3. the BLADE RACK: 8 thin vertical blade cards in a K/d chassis, each
    #     edged in bright h (a glowing server rack seen through glass) ---
    n = 8
    card_lo, card_hi = 0.10, 0.90      # fu span of the rack
    card_top, card_bot = 0.30, 0.86    # fv span of each card
    sweep_top, sweep_bot = card_top, card_bot
    # The OPTIMIZATION HEAT-SWEEP is now a GREEN gradient. Each blade is colored by
    # how far the *diagonal* sweep front has reached it: blades the green wave has
    # already swept = bright g/G GREEN (optimized/balanced); blades just ahead of
    # the front = h/c cool glass (waiting); one gold o/O glint marks the front edge
    # so the green band reads as the signature, distinct from the gold power bus.
    front = 0.58                       # how far the green sweep front has advanced
    for i in range(n):
        fu = card_lo + (card_hi - card_lo) * (i + 0.5) / n
        # The green sweep has BALANCED the blades it has passed -> those glow the
        # brightest GREEN (g core, G groove). Blades just ahead = the bright leading
        # band. Blades not yet reached = dimmer cool cyan glass (waiting), so the
        # advancing GREEN wave is the brightest thing in the rack and reads as the
        # signature, with no gold competing.
        if fu < front - 0.10:
            body, edge = "g", "G"          # fully optimized — bright GREEN glow core
        elif fu < front:
            body, edge = "h", "W"          # balancing-now front: BRIGHTEST band (one
                                           # clear step over the waiting c/h blades)
        elif fu < front + 0.12:
            body, edge = "c", "g"          # just-reached cool blade tinting toward g
        else:
            body, edge = "c", "h"          # cool glass blades still waiting (not gold)
        # the blade card: a thin vertical bar, bright edge on the lit (left) side
        ya = rp(fu, card_top)
        yb = rp(fu, card_bot)
        x = int(round((ya[0] + yb[0]) / 2))
        y0, y1 = int(round(ya[1])), int(round(yb[1]))
        for y in range(min(y0, y1), max(y0, y1) + 1):
            c.set(x, y, body)
            c.set(x + 1, y, edge)          # 2px card with a bright glowing edge
        # K chassis groove between cards (thin, soft — d not pure black where lit)
        c.set(x - 1, min(y0, y1), "d")

    # chassis frame: a thin K/d rack outline inside the glass (top + bottom rails)
    tl, tr = rp(card_lo, card_top - 0.04), rp(card_hi, card_top - 0.04)
    bl, br = rp(card_lo, card_bot + 0.04), rp(card_hi, card_bot + 0.04)
    c.line(tl, tr, "d")
    c.line(bl, br, "K")

    # --- diagonal GREEN heat-sweep band overlaid across the rack: a bold double
    #     g/G diagonal reading as one clear GREEN optimization gradient sweeping
    #     up-right, with a single gold O glint ONLY at the leading edge ---
    c.line(rp(0.14, 0.80), rp(0.58, 0.34), "G")          # deep-green trailing edge
    c.line(rp(0.16, 0.78), rp(0.60, 0.32), "g")          # bright-green sweep core
    c.line(rp(0.20, 0.74), rp(0.50, 0.44), "h")          # cyan sheen along the band
    # the leading edge — "balancing now" — a bright g tip capped by one gold glint
    le = rp(0.60, 0.32)
    c.set(int(round(le[0])), int(round(le[1])), "g")     # green leading edge
    sp = rp(0.62, 0.30)
    c.set(int(round(sp[0])), int(round(sp[1])), "O")     # single gold starlight glint
    c.set(int(round(sp[0])), int(round(sp[1])) - 1, "o")


def load_gauge(c, h):
    """A small c/o load-bar gauge on the right-face sill, leveling out to an even
    g reading (load balanced) — the 'win' identifier + the cyan/gold readout
    pairing."""
    # the gauge sits just under the glass wall on the right face sill
    base = h.right_pt(0.18, 12.0)
    bx, by = int(round(base[0])), int(round(base[1]))
    # frame
    for i in range(11):
        c.set(bx + i, by, "K")
        c.set(bx + i, by - 4, "K")
    c.set(bx - 1, by, "K"); c.set(bx + 11, by, "K")
    c.set(bx - 1, by - 4, "K"); c.set(bx + 11, by - 4, "K")
    vline(c, bx - 1, by - 4, by, "K")
    vline(c, bx + 11, by - 4, by, "K")
    # an even, level g reading across the bar (balanced), with a c top sheen and
    # one o tick marking the balanced target
    for i in range(10):
        ch = "g"
        c.set(bx + i, by - 1, "G")     # shaded bottom
        c.set(bx + i, by - 2, ch)
        c.set(bx + i, by - 3, "c")     # lit top sheen
    c.set(bx + 5, by - 2, "o")         # the balanced-target o tick (gold readout)
    c.set(bx + 5, by - 3, "O")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). The humble server hall grows into a
# fully built-out HYPERSCALE DATA-CENTER / compute campus. Every addition is
# data-center + cooling on-theme to THIS building (HVAC collector -> twin cooling
# tower -> rooftop chilled-water array -> a glowing dual-core compute halo), and
# all grow UP and toward the BACK so they never collide with the front-right
# GPU-RACK GLASS WALL signature (the hero on the shaded right face). Colours
# mature stage by stage; gold (q) appears ONLY as the t5 flourish.
#
#   t2  small functional add : rooftop DUST-CYCLONE/HVAC collector can + ducting
#                              on the back-left louver deck + a brighter o PSU LED
#   t3  structural add       : a SECOND smaller COOLING-TOWER drum abutting the
#                              first at the back-right (twins the tank language)
#   t4  major add            : a rooftop CHILLED-WATER ARRAY skid raising the
#                              roofline — twin glowing e coolant manifolds + an
#                              E coolant-glow heat-exchanger window
#   t5  crowning feature     : a glowing DUAL-CORE COMPUTE HALO — twin E light-torus
#                              rings over the roof linked by an e data arc, q gold
#                              rack-rails on the GPU sill + a q gold tower cap
#
# Anchors: HALL roof diamond spans r_left=(8,24) .. r_top=(24,16) .. r_right=(50,29)
# .. r_front=(34,37). The GPU hero wall is the SHADED RIGHT face (r_front->r_right,
# the lower-right). All rooftop adds anchor on the BACK-LEFT / centre of the deck
# (roof v high, u low-to-mid) so they sit ABOVE and BEHIND the right-face hero, never
# on top of it. The lead cooling tower is at TOWER_CX=48 (back-right).
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_hvac_collector(c, h):
    """t2 — SMALL FUNCTIONAL ADD: a rooftop DUST-CYCLONE / HVAC collector — a TALL
    rounded M/D can topped by a tapered cyclone cone, seated on the BACK-LEFT of the
    louver deck so its cap rises into clear sky and reads as a distinct standing unit
    (not a flat deck bump), plus a short duct stub into the deck + a brighter `o`/`O`
    PSU status LED. On-theme (more air-handling), modest, base palette + a brightened
    o glow. Anchored back-left (roof u~0.30, v~0.50) — well clear of the front-right
    GPU glass wall."""
    cp = h.roof_pt(0.30, 0.50)
    cx, cy = int(round(cp[0])), int(round(cp[1]))
    # collector can body — a small cylinder so it reads as a round can rising off the
    # deck into clear sky (lit M left, shaded D right, K rim, brighter L lit edge).
    can_top = cy - 9
    cylinder(c, cx, can_top, 2, 8, top="L", side_l="M", side_r="D", outline="K")
    c.set(cx - 2, can_top + 4, "L")                     # a lit highlight stripe down the can
    # a faint d cinch ring around the can mid (the cyclone seam)
    for col in (-1, 0, 1):
        c.set(cx + col, can_top + 4, "d")
    # tapered cyclone cone cap rising off the can top (narrows up into clear sky)
    cone_tip = can_top - 3
    c.fill_poly([(cx - 2, can_top), (cx + 2, can_top), (cx, cone_tip)], "L")
    c.line((cx - 2, can_top), (cx, cone_tip), "W")      # lit cone rake
    c.line((cx + 2, can_top), (cx, cone_tip), "M")      # shaded cone rake
    c.line((cx - 2, can_top), (cx + 2, can_top), "K")   # K base of the cone
    c.set(cx, cone_tip, "K")                            # cone tip
    c.set(cx, can_top - 1, "d")                         # collector throat shadow
    # a short duct elbow sloping down-front off the can foot to the deck (the tell it
    # pulls air from the hall) — a 2px D run with a lit M top edge
    d0 = (cx + 2, cy - 2)
    d1 = (cx + 5, cy)
    c.line(d0, d1, "D")
    c.line((d0[0], d0[1] - 1), (d1[0], d1[1] - 1), "M")
    c.set(d1[0], d1[1], "K")                            # duct mouth at the deck
    # a brighter o/O PSU status LED node on the deck just front of the can
    lp = h.roof_pt(0.40, 0.44)
    lx, ly = int(round(lp[0])), int(round(lp[1]))
    c.set(lx, ly, "o")
    c.set(lx, ly - 1, "O")                              # the bright PSU LED


def _twin_tower():
    """Shared geometry for the t3 SECOND cooling-tower drum (the t5 cap recomputes
    from the SAME source — no hardcoded second guess). A smaller, shorter drum
    abutting the lead tower (TOWER_CX=48) at the BACK-RIGHT, stepped down so the two
    read as a twin-drum cooling plant. Kept on-canvas (cx+rx = 56+3 = 59 <= 63)."""
    return dict(cx=56, top_y=18, rx=3, h=11)


def stage3_twin_tower(c, h):
    """t3 — STRUCTURAL ADD: a SECOND, smaller COOLING-TOWER drum abutting the lead
    tank at the back-right, stepped DOWN and toward the viewer-right so the two tanks
    read as a twin-drum cooling plant (extends the building's existing round-tank
    language without touching the hero wall). Matured deep-indigo `b` shell on the
    shaded side so it reads as new structure, an `o` cinch-band, and a `c` fan-grille
    cap on top (a louvered exhaust fan). Drawn AFTER the lead tower so it abuts in
    front-right of it; the hall already occludes both bases."""
    t = _twin_tower()
    cx, top_y, rx, hh = t["cx"], t["top_y"], t["rx"], t["h"]
    # matured-structure twin drum: lit M left, deep-indigo b shaded right, K rim
    cylinder(c, cx, top_y, rx, hh, top="M", side_l="M", side_r="b", outline="K")
    ry = max(2.0, rx * 0.5)
    # an o cinch-status band around the drum mid (matches the lead tower's band)
    for col in range(-rx + 1, rx):
        tt = 1 - (col / rx) ** 2
        if tt < 0:
            continue
        edge = ry * (tt ** 0.5)
        c.set(cx + col, int(round(top_y + edge + 5)), "o" if col <= 0 else "r")
    # a c FAN-GRILLE cap on top: a small cyan louvered exhaust-fan disc in a K rim
    fy = top_y - 1
    for col in range(-rx + 1, rx):
        c.set(cx + col, fy, "c")                 # cyan grille face across the cap
    c.set(cx - 1, fy, "h"); c.set(cx, fy - 1, "h")   # a couple of bright grille glints
    for col in range(-rx, rx + 1):               # K rim around the grille
        if abs(col) == rx:
            c.set(cx + col, fy, "K")
    c.set(cx - rx + 1, fy, "K"); c.set(cx + rx - 1, fy, "K")
    # two thin K fan-blade spokes so the cap reads as a spinning grille, not a dot
    c.set(cx, fy, "K")
    c.set(cx + 1, fy - 1, "K")


def _chiller_skid(h):
    """Shared anchor for the t4 rooftop CHILLED-WATER ARRAY skid. A skid on the deck
    in its OWN zone — centre-right (roof u~0.55, v~0.60), BETWEEN the t2 HVAC can
    (back-left) and the twin towers (back-right), behind/above the right-face hero. A
    single source so any later stage that references it recomputes the same point."""
    base = h.roof_pt(0.55, 0.60)
    return int(round(base[0])), int(round(base[1]))


def stage4_chiller_array(c, h):
    """t4 — MAJOR ADD: a rooftop CHILLED-WATER ARRAY — a deep-indigo `b` skid raising
    the roofline, carrying a tall `b`/`M` HEAT-EXCHANGER block with a bright `E`
    coolant-glow window + TWO bold glowing `e` coolant MANIFOLD pipes running along its
    front. The prominent new rooftop mass that says 'this cluster now sheds serious
    heat'. Palette matures: deep `b` skid/armature + energized `e`/`E` coolant glow
    (cooler/brighter than the base g/c). Seated in its OWN deck zone (centre-right,
    between the t2 can and the towers) so it rises clear above the deck, fully
    on-canvas, never on the front-right GPU wall."""
    sx, sy = _chiller_skid(h)
    # --- the b skid platform: a low raised plinth the array sits on (reads as a base) ---
    c.fill_poly([(sx - 6, sy - 1), (sx + 6, sy - 1), (sx + 6, sy + 1), (sx - 6, sy + 1)], "b")
    c.fill_poly([(sx - 6, sy + 1), (sx + 6, sy + 1), (sx + 6, sy + 3), (sx - 6, sy + 3)], "K")  # skid front shadow
    c.line((sx - 6, sy - 1), (sx + 6, sy - 1), "M")     # lit back lip of the skid
    # --- a TALL heat-exchanger block rising off the skid (the roofline-raiser) ---
    # a clear 6px-wide, 9px-tall box: lit M left face, shaded b right edge, K outline.
    hx0, hx1 = sx - 3, sx + 3
    hytop = sy - 11
    hybot = sy - 1
    c.fill_poly([(hx0, hybot), (hx1, hybot), (hx1, hytop), (hx0, hytop)], "M")     # lit face
    c.fill_poly([(hx1, hybot), (hx1 + 1, hybot - 1), (hx1 + 1, hytop + 1), (hx1, hytop)], "b")  # shaded right edge
    c.line((hx0, hytop), (hx1, hytop), "L")             # lit top edge of exchanger
    c.line((hx0 + 1, hytop + 1), (hx1 - 1, hytop + 1), "W")   # bright top sheen
    for a, b in [((hx0, hytop), (hx1, hytop)), ((hx0, hybot), (hx1, hybot)),
                 ((hx0, hytop), (hx0, hybot)), ((hx1, hytop), (hx1, hybot))]:
        c.line(a, b, "K")
    # a bright E coolant-glow window high on the exchanger's lit face (the heat readout)
    c.fill_poly([(hx0 + 1, hytop + 2), (hx1 - 1, hytop + 2), (hx1 - 1, hytop + 5), (hx0 + 1, hytop + 5)], "E")
    c.line((hx0 + 1, hytop + 2), (hx1 - 1, hytop + 2), "h")   # bright glow crown
    c.set(hx0 + 1, hytop + 5, "e"); c.set(hx1 - 1, hytop + 5, "e")   # soft glow falloff
    c.set(hx0 + 1, hytop + 2, "K"); c.set(hx1 - 1, hytop + 2, "K")   # K window corners
    # two thin K register grooves lower on the exchanger face (a heat-exchanger fin pack)
    for gy in (hybot - 3, hybot - 2):
        c.line((hx0 + 1, gy), (hx1 - 1, gy), "d")
    # --- TWO bold glowing e coolant MANIFOLD pipes running across the skid front ---
    # each pipe: a 7px horizontal e bar with a bright E lit crown + K end caps, stacked
    # so they read clearly as two big coolant headers feeding the exchanger.
    for py in (sy - 4, sy - 2):
        c.line((sx - 5, py), (sx + 1, py), "e")
        c.line((sx - 5, py - 1), (sx + 1, py - 1), "E")     # bright lit crown
        c.set(sx - 5, py, "K"); c.set(sx + 1, py, "K")      # K end caps
        c.set(sx - 2, py - 1, "h")                          # a cyan coolant glint
    # a short e coolant feed-line elbow off the skid toward the towers (the loop tie-in)
    c.line((sx + 3, sy + 1), (sx + 5, sy), "e")
    c.set(sx + 5, sy - 1, "E")


def stage5_compute_halo(c, h):
    """t5 — CROWNING FEATURE = FULLY EVOLVED hyperscale data-center. The optimization
    'balances' across BOTH cores: a glowing DUAL-CORE COMPUTE HALO crowns the roof —
    TWO bright `E` light-torus rings hovering over the deck, each on a short `b` plinth
    so they read as mounted (not floating), linked by a glowing `e` DATA ARC carrying a
    bright `E` data packet at its midpoint. The building is then dressed in premium GOLD
    trim — `q` gold RACK-RAILS along the GPU-wall sill + a `q` gold CAP on the lead
    cooling tower. Reads as elite, still unmistakably the same compute hall, just maxed
    out. Gold ONLY here. Anchored on the deck centre-back so the halo clears the
    front-right GPU wall; the lead-tower cap recomputes from TOWER_CX (no 2nd guess)."""
    # --- twin compute-halo torus rings HOVERING in clear sky above the deck ---
    # The rings float high over the LEFT-CENTRE of the hall (clear sky above the deck,
    # left of the towers), each tethered to a clear deck point by a thin b/K stem so it
    # reads as cast BY the building (never an unmoored blob). Well-separated L/R so the
    # two rings read distinctly as a DUAL core, not one smear.
    anchors = [(h.roof_pt(0.20, 0.34), 11),   # (deck tether point, lift px) — LEFT ring
               (h.roof_pt(0.44, 0.30), 13)]   #                               RIGHT ring
    centers = []
    for (af, lift) in anchors:
        ax, ay = int(round(af[0])), int(round(af[1]))
        cy = ay - lift                                  # ring centre hovers in clear sky
        # thin b stem tethering the ring down to its deck point (the projector mast)
        c.line((ax, cy + 3), (ax, ay), "b")
        c.set(ax, ay, "K")                              # K foot on the deck
        c.set(ax, cy + 2, "M")                          # a lit collar where stem meets ring
        # a glowing E light-torus ring (a clean tilted 2:1 ellipse — legible at 64px)
        rx, ry = 5, 2
        for adeg in range(0, 360, 14):
            x = ax + rx * math.cos(math.radians(adeg))
            y = cy + ry * math.sin(math.radians(adeg))
            # front (lower) arc bright E, back (upper) arc dimmer e so it reads 3-D
            c.set(x, y, "E" if y >= cy else "e")
        # a bright core node at the ring centre (the compute core) + a soft halo
        c.set(ax, cy, "E")
        c.set(ax - 1, cy, "h"); c.set(ax + 1, cy, "h")
        c.set(ax, cy - 1, "e")
        centers.append((ax, cy))
    # --- the e DATA ARC linking the two cores (a bright shallow arch with a packet) ---
    (lx, ly), (rx2, ry2) = centers
    arc_mid_x = (lx + rx2) // 2
    arc_mid_y = min(ly, ry2) - 4                         # arch crests above both cores
    arc = [(lx + 1, ly - 1),
           (lx + (arc_mid_x - lx) // 2, (ly + arc_mid_y) // 2 - 1),
           (arc_mid_x, arc_mid_y),
           (rx2 - (rx2 - arc_mid_x) // 2, (ry2 + arc_mid_y) // 2 - 1),
           (rx2 - 1, ry2 - 1)]
    for i in range(len(arc) - 1):
        c.line(arc[i], arc[i + 1], "e")
    c.set(arc_mid_x, arc_mid_y, "E")                     # bright data packet at the crest
    c.set(arc_mid_x, arc_mid_y - 1, "h")                 # a cyan sparkle above it
    c.set(arc_mid_x - 2, (ly + arc_mid_y) // 2 - 1, "E") # a couple of bright data motes
    c.set(arc_mid_x + 2, (ry2 + arc_mid_y) // 2 - 1, "E")

    # --- GOLD premium trim (t5 flourish only) ---------------------------------------
    # 1) q gold RACK-RAILS along the GPU-wall sill (two short rails on the right-face
    #    sill, framing the hero — premium rack hardware). Drawn on the shaded right
    #    face just under the glass wall, clear of the load gauge (which is at u~0.18).
    for u in (0.50, 0.74):
        r0 = h.right_pt(u, 11.4)
        r1 = h.right_pt(u + 0.16, 11.4)
        c.line(r0, r1, "q")
        c.set(int(round(r0[0])), int(round(r0[1])) + 1, "r")   # a shaded underside tick
    # a couple of q gold rivet bosses at the rail ends
    rb = h.right_pt(0.50, 11.4)
    c.set(int(round(rb[0])), int(round(rb[1])), "O")
    # 2) q gold CAP crowning the LEAD cooling tower (recompute from TOWER_CX — the
    #    SAME source as the base tank, no hardcoded second guess). A small gold rim +
    #    finial on the top ellipse so the lead tower reads as the maxed flagship.
    tcx, tty, trx = TOWER_CX, TOWER_TOP_Y, TOWER_RX
    try_ = max(2.0, trx * 0.5)
    for adeg in range(0, 360, 20):                      # gold rim around the top ellipse
        x = tcx + (trx - 1) * math.cos(math.radians(adeg))
        y = tty + (try_ - 0.6) * math.sin(math.radians(adeg))
        c.set(x, y, "q")
    c.set(tcx, tty - 1, "O")                            # bright gold finial knob
    c.set(tcx, tty - 2, "q")                            # short finial spike
    c.set(tcx - 1, tty, "O")                            # a lit gold glint on the rim


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the computation cluster at upgrade `stage` (1..5). Stage 1 is IDENTICAL
    to the shipped base; each higher stage keeps every prior addition and bolts on the
    next (t2 HVAC collector -> t3 twin cooling tower -> t4 chilled-water array -> t5
    dual-core compute halo + gold). The server hall grows UP and toward the BACK into a
    full hyperscale data-center, while the front-right GPU-RACK GLASS WALL signature
    stays clear and reads on top.

    Painter's order: cooling tower (back) -> hall (front mass) -> roof deck -> faces
    (incl. the hero right-face GPU wall). Upgrade masses then grow on the BACK/centre of
    the deck and back-right (away from the right-face hero); the t3 twin tower is drawn
    after the lead tower so it abuts in front-right of it."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    cooling_tower(c)        # back-right tank (drawn first, sits behind)
    h = server_hall(c)      # the long low server hall (dominant front mass)
    roof_deck(c, h)         # louvered HVAC roof deck + o power bus
    left_face(c, h)         # lit LEFT face: vents + status window + door (plainer)
    gpu_rack_wall(c, h)     # HERO glowing GPU blade rack on the shaded RIGHT face
    load_gauge(c, h)        # load-balanced gauge on the right sill (the win)

    # --- CUMULATIVE UPGRADE STAGES (grown on the BACK/deck, clear of the GPU wall) -
    if stage >= 2:
        stage2_hvac_collector(c, h)
    if stage >= 3:
        stage3_twin_tower(c, h)
    if stage >= 4:
        stage4_chiller_array(c, h)
    if stage >= 5:
        stage5_compute_halo(c, h)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/axiom"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "computation-cluster"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped computation-cluster.png, so it does NOT overwrite the
    base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": AXIOM, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"axiom_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"axiom_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
