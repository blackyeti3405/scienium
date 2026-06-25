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

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box, cylinder

# Axiom set palette — chars -> hex EXACTLY per the blueprint (<=16 colors).
AXIOM = {"K": "#0e1124", "W": "#dfe6f6", "L": "#b4bee0", "M": "#7c88b8", "D": "#4e5888", "d": "#333a60",
         "h": "#d6ecff", "c": "#aad8ff", "g": "#4a9ce6", "G": "#2060b0",
         "o": "#ffe27a", "O": "#fff3c0", "r": "#c89a2a"}


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
    cx, top_y, rx, h = 48, 11, 5, 17
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


def build():
    c = Canvas()
    cooling_tower(c)        # back-right tank (drawn first, sits behind)
    h = server_hall(c)      # the long low server hall (dominant front mass)
    roof_deck(c, h)         # louvered HVAC roof deck + o power bus
    left_face(c, h)         # lit LEFT face: vents + status window + door (plainer)
    gpu_rack_wall(c, h)     # HERO glowing GPU blade rack on the shaded RIGHT face
    load_gauge(c, h)        # load-balanced gauge on the right sill (the win)
    spec = {"width": 64, "height": 64, "palette": AXIOM, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/axiom_computation-cluster.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
