#!/usr/bin/env python3
"""
Particle Physics Bench — Axiom economy building (BESPOKE FORM · OPEN-CONCEPT L/^ YARD).

This is NOT the gateway cube and NOT a closed hall/tower. It is the OPEN-CONCEPT
member of the Axiom set: two LOW navy wings meeting at the BACK corner in an L / `^`,
wrapping an OPEN experiment yard that faces the viewer. The cloud-chamber bench sits
OUT in the open middle under the night sky, ringed by o/K radiation-area hazard
striping — clearly different from the closed Axiom halls and towers and from the
gateways.

  * a thin low YARD PAD slab (M/D concrete) is the floor the viewer looks DOWN onto;
    its open front edges are ringed by o/K hazard striping (radiation-area teeth);
  * two LOW NAVY WINGS sit on the back slab edges and meet at the back corner:
      - back-LEFT wing  : an instrument / electronics wing — plain navy walls, a
        couple of g/c readout windows + a c sensor puck on the roof;
      - back-RIGHT wing : a power / HV wing — navy walls, a louvered vent, an o HV
        conduit running down the front corner + a "PARTICLE BENCH" placard;
  * the L embraces an OPEN front-corner YARD — that open yard IS the building, and the
    signature apparatus stands out in the open there.

Signature (one-of-one): a benchtop CLOUD CHAMBER on the open pad — a clear h/c glass
hemisphere dome (K-rimmed, faint c vapor haze inside) on a D/M base block, with 3-4
curling o/O cosmic-ray PARTICLE TRACKS spiraling and arcing through the vapor (a tight
spiral, long arcs, a short fork), one ending in a bright O/W detection FLASH. A
K-framed c/o ID TAG pops above the dome (a lit "IDENTIFIED" O dot + a tiny o glyph),
an o/K magnet-coil field ring rings the chamber base, and a soft c glow washes the pad
under the dome. No cloud-chamber / particle-track / cosmic-ray motif exists elsewhere.

OPENING SIDE: OPEN — the apparatus reads on its own in the open middle; the wings are
plain backdrop.

Composed entirely from art/isobuild.{Box} (no iso.draw_cube / base_windows).
Draw order: contact shadow -> yard pad slab (back, with hazard striping) ->
back-left wing -> back-right wing -> HV conduit + placard -> the cloud-chamber hero
(base, magnet ring, glass dome, vapor, tracks, flash) -> the ID tag last (crowns
above, against open sky).
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

# Axiom set palette — author on these chars exactly (<=16 colors).
# Base keys (shared across all 10 Axiom buildings) + the four EVOLVED accent shades
# reserved for the upgrade stages ONLY (they never appear in stage 1, so the shipped
# particle-physics-bench.png is unchanged). These four evolved keys+hexes are the
# LAB-WIDE convention — every Axiom building's _t2.._t5 reuses them:
#   b  deep indigo steel   — matured structure tone for t3+ new masses (shield/gantry)
#   e  quantum-stellar glow (mid)    E  quantum-stellar glow (bright) — the t4/t5 energy
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
AXIOM = {"K": "#0e1124", "W": "#dfe6f6", "L": "#b4bee0", "M": "#7c88b8", "D": "#4e5888", "d": "#333a60",
         "h": "#d6ecff", "c": "#aad8ff", "g": "#4a9ce6", "G": "#2060b0",
         "o": "#ffe27a", "O": "#fff3c0", "r": "#c89a2a",
         "b": "#2a3158", "e": "#7ad0ff", "E": "#cdeeff", "q": "#f6c945"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def _line_pts(a, b):
    """Integer Bresenham points between a and b (no float gaps)."""
    x0, y0 = int(round(a[0])), int(round(a[1]))
    x1, y1 = int(round(b[0])), int(round(b[1]))
    dx, dy = abs(x1 - x0), abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy
    pts = []
    while True:
        pts.append((x0, y0))
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x0 += sx
        if e2 < dx:
            err += dx
            y0 += sy
    return pts


def _clampx(x):
    """Clamp an x coordinate inside the 0..63 canvas (avoid off-canvas overshoot)."""
    return max(0, min(63, int(round(x))))


def _clampy(y):
    return max(0, min(63, int(round(y))))


def hazard_stripe(c, p0, p1):
    """A CLEAN evenly-spaced o/K hazard band running STRAIGHT along the front lip of
    the open pad. Walks every contiguous pixel of the edge (Bresenham, no interp
    gaps) and paints a consistent 2-px o-K cadence — one tidy alternating stripe,
    not a busy chevron and not a dotted scatter."""
    pts = _line_pts(p0, p1)
    for i, (x, y) in enumerate(pts):
        # consistent 2-px cadence: gold, dark, gold, dark — one tidy stripe
        c.set(x, y, "o" if (i % 2) == 0 else "K")


# ── 1. contact shadow — a flat iso ground-pool so the yard reads grounded ──────
def contact_shadow(c):
    scx, scy = 32, 50
    for x in range(scx - 21, scx + 21):
        for y in range(scy - 3, scy + 4):
            ex = (x - scx) / 21.0
            ey = (y - scy) / 3.2
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")


# ── 2. YARD PAD SLAB — the open experiment floor (drawn FIRST) ────────────────
def yard_pad(c):
    """A thin low concrete pad the viewer looks down onto. The wings seat on its
    back edges; the front-center stays OPEN as the experiment yard. M/D navy
    concrete + o/K hazard striping ringing the open front edges. Returns the slab
    so the wings + hero can be seated on it."""
    slab = Box(top=(32, 30), wx=11, wy=11, h=3)
    # deck: navy concrete — lit M, brighter back-left D->M, a few d expansion seams
    c.fill_poly([slab.r_top, slab.r_right, slab.r_front, slab.r_left], "M")
    c.fill_poly([slab.r_top, slab.r_left, slab.r_front], "L")
    # faint d expansion-joint seams across the pad (reads as a poured slab)
    for v in (0.34, 0.66):
        c.line(slab.roof_pt(0.06, v), slab.roof_pt(0.94, v), "D")
    for u in (0.5,):
        c.line(slab.roof_pt(u, 0.06), slab.roof_pt(u, 0.94), "D")
    # the 3px pad edge on the two FRONT faces (lit left, shaded right)
    c.fill_poly([slab.r_left, slab.r_front, slab.w_front, slab.w_left], "D")
    c.fill_poly([slab.r_front, slab.r_right, slab.w_right, slab.w_front], "d")
    # outline
    for a, b in [(slab.r_top, slab.r_right), (slab.r_right, slab.r_front),
                 (slab.r_front, slab.r_left), (slab.r_left, slab.r_top),
                 (slab.r_left, slab.w_left), (slab.r_front, slab.w_front),
                 (slab.r_right, slab.w_right),
                 (slab.w_left, slab.w_front), (slab.w_front, slab.w_right)]:
        c.line(a, b, "K")
    # HAZARD striping along the two open FRONT deck edges (rings the open yard) —
    # a clean continuous o/K chevron band (no scattered dots)
    hazard_stripe(c, slab.r_left, slab.r_front)
    hazard_stripe(c, slab.r_front, slab.r_right)
    return slab


# ── 3. BACK-LEFT WING — instrument / electronics wing (plain backdrop) ─────────
def left_wing(c, slab):
    """A low navy wing along the BACK-LEFT slab edge (long toward the LEFT via wy,
    slim in wx). The instrument/electronics wing: plain M/D navy walls, a couple of
    g/c readout windows on the lit face, a corrugation + c sensor puck on the roof.
    Seated off the shared back corner so a clear OPEN notch opens to the yard, and
    kept LOW so the open yard + chamber read over it."""
    apex = (slab.r_top[0] - 6, slab.r_top[1] - 11)
    wing = Box(top=apex, wx=3, wy=8, h=13)
    wing.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # sparse D corrugation ribs across the roof
    for f in (0.28, 0.5, 0.72):
        c.line(wing.roof_pt(0.1, f), wing.roof_pt(0.9, f), "D")
    # TWO small readout windows on the lit (left) face — varied, spaced apart, real
    # glass via Box.window (sky-reflection gradient + shine), NOT a barred grid.
    wing.window(c, "left", 0.14, 0.42, 2.4, 6.6, glass="g", hi="h", shade="G", mullions=0)
    wing.window(c, "left", 0.56, 0.86, 3.4, 7.4, glass="c", hi="h", shade="G", mullions=1)
    # a thin o status conduit ribbon low on the lit face (varied trim, not a strip)
    c.line(wing.left_pt(0.10, 9.4), wing.left_pt(0.90, 9.4), "o")
    c.line(wing.left_pt(0.10, 9.8), wing.left_pt(0.90, 9.8), "r")
    # c sensor puck on a short post at the roof's front corner
    px, py = wing.roof_pt(0.74, 0.62)
    px, py = int(round(px)), int(round(py))
    c.set(px, py, "K")
    c.set(px, py - 1, "D")
    c.set(px - 1, py - 2, "G")
    c.set(px, py - 2, "g")
    c.set(px + 1, py - 2, "G")
    c.set(px, py - 3, "c")
    c.set(px - 1, py - 3, "h")
    return wing


# ── 4. BACK-RIGHT WING — power / HV wing (plain backdrop), meets L at back ─────
def right_wing(c, slab):
    """A low navy wing along the BACK-RIGHT slab edge (long toward the RIGHT via wx,
    slim in wy), abutting the left wing at the back corner so the L / `^` meets
    there. The power/HV wing: plain navy walls, a louvered vent on the shaded right
    face (NOT glass), a small g window on the lit face, an o HV conduit down the
    front corner, and a c sensor puck on the roof."""
    apex = (slab.r_top[0] + 5, slab.r_top[1] - 12)
    wing = Box(top=apex, wx=8, wy=4, h=13)
    wing.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # sparse D corrugation ribs across the roof
    for f in (0.3, 0.55, 0.8):
        c.line(wing.roof_pt(0.1, f), wing.roof_pt(0.9, f), "D")
    # one small g window high on the lit (left) face (real glass)
    wing.window(c, "left", 0.30, 0.66, 2.4, 6.4, glass="g", hi="h", shade="G", mullions=0)
    # LOUVERED HV vent on the SHADED right face — opaque vent, distinct from glass
    wing.louver(c, "right", 0.30, 0.74, 3.0, 8.4, body="D", slat="K", edge="M", frame="K")
    # c sensor puck on the roof's back-right shoulder
    px, py = wing.roof_pt(0.5, 0.3)
    px, py = int(round(px)), int(round(py))
    c.set(px, py, "K")
    c.set(px, py - 1, "D")
    c.set(px, py - 2, "c")
    c.set(px - 1, py - 2, "h")
    return wing


# ── 5. HV CONDUIT + "PARTICLE BENCH" placard on the right wing front corner ────
def hv_conduit(c, rw):
    """A glowing o HV conduit running down the right wing's front corner + a small
    o/K 'PARTICLE BENCH' placard plate on the lit face."""
    top = (int(round(rw.r_front[0])), int(round(rw.r_front[1])) + 1)
    bot = (int(round(rw.w_front[0])), int(round(rw.w_front[1])) - 2)
    c.line((top[0] - 1, top[1]), (bot[0] - 1, bot[1]), "o")   # bright conduit
    c.line(top, bot, "r")                                     # shaded side
    for t in (0.32, 0.66):
        cy = int(top[1] + t * (bot[1] - top[1]))
        c.set(top[0] - 2, cy, "K")                            # K clamp
    # o/K placard plate on the lit-left face toward the front
    pp = rw.left_pt(0.80, 8.2)
    ppx, ppy = int(round(pp[0])), int(round(pp[1]))
    for dx in range(0, 4):
        c.set(ppx + dx, ppy - 1, "K")
        c.set(ppx + dx, ppy, "o")
        c.set(ppx + dx, ppy + 1, "O")
        c.set(ppx + dx, ppy + 2, "K")
    c.set(ppx - 1, ppy, "K"); c.set(ppx + 4, ppy, "K")
    c.set(ppx - 1, ppy + 1, "K"); c.set(ppx + 4, ppy + 1, "K")


# ── 6. SIGNATURE part A — soft c pad glow + magnet-coil field ring ─────────────
def pad_glow(c, slab):
    """A soft c glow washing the open pad centre under the chamber (the field/vapor
    underglow), and an o/K magnet-coil field RING ringing the chamber base (the
    curving magnetic field). Returns the chamber base centre (screen px) + the pad
    surface y there, so the chamber + tracks seat on the open pad."""
    cp = slab.roof_pt(0.5, 0.46)
    ccx, ccy = int(round(cp[0])), int(round(cp[1]))
    # soft c underglow halo on the pad (subtle — only over the lit M/L deck)
    for (dx, dy) in [(-4, 1), (-3, 2), (4, 1), (3, 2), (-5, 0), (5, 0),
                     (-2, 3), (2, 3), (0, 3), (-6, 1), (6, 1)]:
        x, y = ccx + dx, ccy + dy
        if 0 <= y < c.h and 0 <= x < c.w and c.px[y][x] in ("M", "L", "D"):
            c.set(x, y, "c")
    # o/K MAGNET-COIL field ring: a 2:1 iso ellipse ringing the chamber base
    rr = 7.0
    for a in range(0, 360, 10):
        x = ccx + rr * math.cos(math.radians(a))
        y = ccy + (rr * 0.5) * math.sin(math.radians(a)) + 2
        c.set(int(round(x)), int(round(y)), "o" if (a // 10) % 2 == 0 else "K")
    return ccx, ccy


# ── 7. SIGNATURE part B — the benchtop CLOUD CHAMBER (base + glass dome + vapor) ─
def cloud_chamber(c, ccx, ccy):
    """The hero: a clear glass-domed cloud chamber on a D/M base block, sitting out
    in the open yard. A K-rimmed h/c glass hemisphere with a faint c vapor haze
    inside; the spiraling tracks are drawn on top of the vapor. Returns the dome
    centre + radius so the tracks + ID tag anchor to it."""
    # --- BASE BLOCK: a small solid pedestal on the pad (lit M left, D right, L crest)
    bw, bh = 6, 4
    base_top = ccy - 2
    for y in range(base_top, base_top + bh + 1):
        for x in range(ccx - bw, ccx + bw + 1):
            c.set(x, y, "M" if x <= ccx else "D")
    c.line((ccx - bw, base_top), (ccx + bw, base_top), "L")          # lit crest
    # K outline the base block
    for x in range(ccx - bw, ccx + bw + 1):
        c.set(x, base_top - 1, "K"); c.set(x, base_top + bh + 1, "K")
    for y in range(base_top - 1, base_top + bh + 2):
        c.set(ccx - bw - 1, y, "K"); c.set(ccx + bw + 1, y, "K")
    c.line((ccx, base_top), (ccx, base_top + bh), "d")               # centre seam
    # a faint o coil band wrapping the base (the chamber's field coils)
    c.line((ccx - bw + 1, base_top + 2), (ccx + bw - 1, base_top + 2), "r")
    c.set(ccx - bw + 1, base_top + 2, "o"); c.set(ccx, base_top + 2, "o")

    # --- GLASS DOME: a clear hemisphere on the base. Filled as a sky-reflection
    # gradient (bright h crown -> c body) so it READS AS GLASS, K-rimmed, with a
    # faint c vapor haze pooled at the bottom interior. ---
    dome_cy = base_top - 1            # dome springs from the base top
    dr = 8                           # dome radius
    for yy in range(-dr, 1):          # only the upper hemisphere (y <= 0)
        for xx in range(-dr, dr + 1):
            if xx * xx + yy * yy <= dr * dr:
                x, y = ccx + xx, dome_cy + yy
                # clean vertical sky-reflection gradient: bright h crown -> c body
                # -> g shaded sill. A simple top-to-bottom ramp reads as curved glass.
                depth = (yy + dr) / dr     # 0 at crown(top) .. 1 at base line
                if depth < 0.30:
                    ch = "h"               # bright crown reflection (sky)
                elif depth < 0.68:
                    ch = "c"               # mid glass body
                else:
                    ch = "g"               # darker shaded glass near the sill
                c.set(x, y, ch)
    # diagonal SHINE streak on the upper-left of the dome (the unmistakable glass
    # tell) — a crisp W highlight with an h falloff, like light raking the curve.
    for (sx, sy) in [(-4, -5), (-3, -5), (-3, -4), (-2, -4), (-2, -3), (-1, -2)]:
        c.set(ccx + sx, dome_cy + sy, "W")
    for (sx, sy) in [(-4, -4), (-2, -2), (-1, -1), (-1, -3)]:
        c.set(ccx + sx, dome_cy + sy, "h")
    # faint c VAPOR HAZE pooled along the dome interior base (supersaturated vapor)
    # — a single sparse band so the tracks read on top of clear glass, not a fill.
    for xx in range(-dr + 3, dr - 2):
        if xx * xx <= (dr - 2) * (dr - 2):
            c.set(ccx + xx, dome_cy - 1, "c")
    # K RIM: the dome arc outline + a base springing line
    for a in range(180, 361, 4):
        x = ccx + dr * math.cos(math.radians(a))
        y = dome_cy + dr * math.sin(math.radians(a))
        c.set(int(round(x)), int(round(y)), "K")
    c.line((ccx - dr, dome_cy), (ccx + dr, dome_cy), "K")   # springing line
    return ccx, dome_cy, dr


# ── 8. SIGNATURE part C — spiraling cosmic-ray PARTICLE TRACKS + detection flash ─
def particle_tracks(c, dcx, dcy, dr):
    """ONE clear hero track + 1-2 faint background arcs (decluttered per review).
    The hero is a bright O/W cosmic-ray SPIRAL curling clearly through the vapor and
    ending in a detection FLASH; behind it sit one or two faint c arcs for depth.
    Clipped to the dome interior so they read as INSIDE the glass. Returns the flash
    point so upgrade stages can brighten it (t2) and bloom from it (t5)."""
    cy_int = dcy - 1   # interior is above the springing line

    def inside(x, y):
        return (x - dcx) ** 2 + ((y - cy_int) + 0) ** 2 <= (dr - 1) ** 2 and y <= dcy - 1

    def stroke(pts, ch):
        """Draw a SPARSE curve as a single thin line so it reads as a track, not a
        blob — only overwrites pixels that don't already carry a brighter track."""
        rank = {"c": 0, "o": 1, "O": 2, "W": 3}
        for k in range(1, len(pts)):
            x0, y0 = int(round(pts[k - 1][0])), int(round(pts[k - 1][1]))
            x1, y1 = int(round(pts[k][0])), int(round(pts[k][1]))
            for (px, py) in _line_pts((x0, y0), (x1, y1)):
                if inside(px, py):
                    cur = c.px[py][px]
                    if rank.get(ch, 1) >= rank.get(cur, -1) or cur not in rank:
                        c.set(px, py, ch)

    # --- FAINT background arcs (1-2 dim c primaries) — drawn FIRST, sit behind ----
    arc = []
    for t in range(0, 18):
        tt = t / 17.0
        x = dcx - 6 + tt * 12
        y = cy_int - 4 + 2.6 * math.sin(math.radians(15 + tt * 150))
        arc.append((x, y))
    stroke(arc, "c")
    arc2 = []
    for t in range(0, 10):
        tt = t / 9.0
        x = dcx - 4 + tt * 9
        y = cy_int - 6 + tt * 4
        arc2.append((x, y))
    stroke(arc2, "c")

    # --- HERO TRACK: ONE bright O cosmic-ray SPIRAL curling clearly in the field,
    # tightening as it loses energy, ending low in a FLASH. Drawn LAST so it reads
    # on top as the unmistakable hero. ---------------------------------------------
    cxs, cys = dcx - 1, cy_int - 2
    hero = []
    for i in range(0, 24):
        ang = i * 0.52              # wider angular step => loops stay separated
        rad = 5.8 - i * 0.215       # spirals INWARD (energy loss), fewer turns
        hero.append((cxs + rad * math.cos(ang), cys + rad * 0.55 * math.sin(ang)))
    stroke(hero, "O")
    # a couple of W glints on the brightest near-side of the spiral (fresh ionising)
    for (gx, gy) in [hero[2], hero[7]]:
        gxi, gyi = int(round(gx)), int(round(gy))
        if inside(gxi, gyi):
            c.set(gxi, gyi, "W")
    fx, fy = hero[-1]

    # --- DETECTION FLASH at the spiral's collapsing end: a small O/W burst --------
    fxi, fyi = int(round(fx)), int(round(fy))
    for (dx, dy) in [(0, 0), (1, 0), (-1, 0), (0, -1), (0, 1)]:
        if inside(fxi + dx, fyi + dy):
            c.set(fxi + dx, fyi + dy, "O")
    if inside(fxi, fyi):
        c.set(fxi, fyi, "W")
    for (dx, dy) in [(1, -1), (-1, -1), (1, 1), (-1, 1)]:
        if inside(fxi + dx, fyi + dy):
            c.set(fxi + dx, fyi + dy, "o")
    return fx, fy


# ── 9. SIGNATURE part D — the lit particle ID TAG crowning above the dome ──────
def id_tag(c, dcx, dcy, dr):
    """A K-framed c/o ID TAG panel popping ABOVE the dome against the open sky: a
    lit label plate with a tiny o glyph (the identified particle) and a bright O
    'IDENTIFIED' dot, on a thin K stalk rising from the dome crown. Drawn LAST so it
    crowns over everything against transparent sky."""
    crown_y = dcy - dr               # the dome's top
    # thin K stalk from the crown up to the tag
    tag_cx = dcx + 4
    tag_by = crown_y - 3
    c.line((dcx, crown_y - 1), (tag_cx, tag_by + 2), "K")
    # the TAG panel: a small K-framed c plate, ~9 wide x 5 tall
    tw, th = 9, 5
    tx0, ty0 = tag_cx - 2, tag_by - th
    # K frame fill backing
    for y in range(ty0 - 1, ty0 + th + 1):
        for x in range(tx0 - 1, tx0 + tw + 1):
            c.set(x, y, "K")
    # c glass label face inside
    for y in range(ty0, ty0 + th):
        for x in range(tx0, tx0 + tw):
            c.set(x, y, "c")
    # bright h reflection band along the top, G shaded sill (reads as a lit panel)
    for x in range(tx0, tx0 + tw):
        c.set(x, ty0, "h")
        c.set(x, ty0 + th - 1, "G")
    # tiny o particle GLYPH on the left of the tag (a curl = the identified track)
    c.set(tx0 + 1, ty0 + 2, "o"); c.set(tx0 + 2, ty0 + 1, "o")
    c.set(tx0 + 2, ty0 + 3, "o"); c.set(tx0 + 3, ty0 + 2, "o")
    # bright O "IDENTIFIED" dot on the right of the tag (the lit detection lamp)
    c.set(tx0 + tw - 2, ty0 + 1, "O")
    c.set(tx0 + tw - 2, ty0 + 2, "O")
    c.set(tx0 + tw - 3, ty0 + 2, "o")
    c.set(tx0 + tw - 2, ty0 + 3, "o")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). The open cloud-chamber yard grows into a
# fully-built BEAMLINE BENCH: it gains more detectors, a radiation shield, an overhead
# particle-beam gantry, and finally fires a real collision event. Every addition is
# on-theme to THIS building (particle detection / radiation / accelerator beam) and
# UNIQUE to it — no cloud-chamber/beamline motif exists elsewhere. Each stage KEEPS
# every prior addition. Colours mature stage by stage; gold (q) appears ONLY at t5.
#
# The signature CLOUD CHAMBER stands in the YARD CENTRE (chamber centre ~x31,y41;
# glass dome crown ~y30; the ID TAG crowns up to ~y7). So stage masses grow on the
# YARD EDGES + a high OVERHEAD ARCH, and the t5 event blooms in the gap just ABOVE
# the dome but BELOW the tag — the dome + tag are RE-DRAWN last so they always read.
#
#   t2  small functional add : a 2nd detector PUCK on a post at the yard's left edge
#                              + a c dosimeter readout, + one brighter O flash spark
#   t3  structural add       : a radiation SHIELDING blast-wall annex (thick b block)
#                              bolted to the back-RIGHT HV wing, o/K hazard-stripe caps
#   t4  major add            : an overhead BEAM-COLLIMATOR GANTRY straddling the yard —
#                              a b lattice arch on two legs, glowing e beam-line down
#   t5  crowning feature     : a PARTICLE-COLLISION BURST above the chamber (radial
#                              E/e track-jets from a bright E vertex) + q gold banner
#                              + q gold field-ring
#
# Shared anchors (so t4/t5 recompute from the SAME source, never a 2nd guess):
#   _yard_left_post(slab)  -> the t2 puck-post foot on the left yard edge
#   _gantry(slab)          -> the t4 portal feet + collimator head (t5 reuses the head)
# ═══════════════════════════════════════════════════════════════════════════════

def _yard_left_post(slab):
    """Foot of the t2 detector-puck post — planted OUT in the OPEN FRONT-LEFT yard margin.
    The left-wing FRONT FACE occupies x10..15; the columns x2..9 are EMPTY top-to-bottom,
    so a free-standing instrument mast in that strip protrudes entirely into clear canvas
    (real new pixels, not a wall recolour) and the dome-topped puck head clears in OPEN SKY
    above the wall foot. Well clear of the centre chamber (x>=22). A single shared anchor —
    returns the mast FOOT (bottom) screen px."""
    return 7, 48


def stage2_detector_puck(c, slab, flash):
    """t2 — SMALL FUNCTIONAL ADD: a SECOND detector PUCK on a free-standing MAST planted OUT
    in the open FRONT-LEFT yard margin (the bench gains a second sensor head), a small c
    DOSIMETER readout box at its foot, and one BRIGHTER O track-flash spark added at the
    existing detection flash inside the dome. Modest, on-theme (more apparatus, more
    detection), base palette + a brighter `c`/`O`. The mast stands in the EMPTY left strip
    (x2..9) so the whole instrument reads PROUD against clear canvas — not glued to the
    wall — with the domed puck head lifted into open sky above the wall foot. Kept fully
    clear of the centre chamber + its tracks."""
    px, py = _yard_left_post(slab)               # (7, 48) — mast foot in the empty margin
    # a tiny d/K contact nub on the deck so the free-standing mast reads grounded
    c.set(px, py + 1, "d"); c.set(px - 1, py + 1, "K"); c.set(px + 1, py + 1, "K")
    # the MAST: a clean vertical K post (lit D near-edge) rising up through the empty strip
    # so the puck head clears into open sky (foot y48 -> neck y40)
    neck_y = py - 8
    for y in range(neck_y, py + 1):
        c.set(px, y, "K")                        # mast core
        c.set(px - 1, y, "D")                    # lit near-edge of the mast
    for by in (py - 2, py - 5):                  # two small support brackets off the mast
        c.set(px + 1, by, "D")
        c.set(px + 1, by - 1, "K")
    # the detector PUCK head — a clear domed c sensor disc (h shine crown -> c body -> G
    # shaded sill, K rim), bigger than the wing pucks so it reads as a real 2nd head.
    # Centred on the mast top, sitting in OPEN SKY (x3..9) above the wall foot.
    hx, hy = px - 1, neck_y - 1
    c.fill_poly([(hx - 3, hy + 1), (hx + 3, hy + 1), (hx + 3, hy + 2), (hx - 3, hy + 2)], "G")  # sill
    c.fill_poly([(hx - 3, hy), (hx + 3, hy), (hx + 2, hy + 1), (hx - 2, hy + 1)], "c")          # body
    c.fill_poly([(hx - 2, hy - 1), (hx + 2, hy - 1), (hx + 1, hy), (hx - 1, hy)], "h")          # lit crown
    c.set(hx - 1, hy - 1, "W")                   # bright shine glint on the dome
    for (a, b) in [((hx - 2, hy - 1), (hx + 2, hy - 1)), ((hx - 3, hy), (hx - 3, hy + 2)),
                   ((hx + 3, hy), (hx + 3, hy + 2)), ((hx - 3, hy + 2), (hx + 3, hy + 2)),
                   ((hx - 2, hy - 1), (hx - 3, hy)), ((hx + 2, hy - 1), (hx + 3, hy))]:
        c.line(a, b, "K")
    c.set(hx, hy - 2, "o")                        # a tiny gold status glint on top
    c.set(px, neck_y, "K")                        # tie the head onto the mast top

    # a small c DOSIMETER readout box on the deck at the mast FOOT, to the LEFT in the empty
    # wedge (K frame, c face, an o needle) — a second instrument, kept tiny + clear of mast
    dx0, dy0 = px - 5, py - 1
    for y in range(dy0, dy0 + 3):
        for x in range(dx0, dx0 + 4):
            c.set(x, y, "c")
    for (a, b) in [((dx0, dy0), (dx0 + 3, dy0)), ((dx0, dy0 + 2), (dx0 + 3, dy0 + 2)),
                   ((dx0, dy0), (dx0, dy0 + 2)), ((dx0 + 3, dy0), (dx0 + 3, dy0 + 2))]:
        c.line(a, b, "K")
    c.set(dx0 + 1, dy0 + 1, "o")                 # the dosimeter needle/reading
    c.set(dx0 + 2, dy0, "h")                     # a top shine on the readout

    # one BRIGHTER O flash spark at the existing in-dome detection flash (the bench
    # detects a little hotter now). flash is the (fx,fy) returned by particle_tracks.
    fxi, fyi = int(round(flash[0])), int(round(flash[1]))
    c.set(fxi, fyi - 1, "O")
    c.set(fxi + 1, fyi - 1, "o")


def stage3_shield_wall(c, slab, rw):
    """t3 — STRUCTURAL ADD: a radiation SHIELDING blast-wall annex — a THICK concrete
    wall prism (matured deep-indigo `b` walls, lit `M` left face, `L` crest) standing
    PROUD on the OPEN RIGHT-FRONT yard lip, just OUTSIDE the current building bbox (the
    HV wing's lower-right edge recedes to x~53 and everything x>=54 / x>=52-below-y46 is
    clear canvas). Seating it on that empty lip — not on top of the wing — means its
    silhouette occupies new pixels in front of / beyond the wing, so it reads as a real
    annex that visibly breaks the base outline (not a recolour). Its flat TOP is capped
    with the yard's own o/K hazard-stripe motif (radiation-area teeth) + an o trefoil so
    it reads unmistakably as 'radiation shielding', not a generic crate. Fully on-canvas
    (right edge clamps to x58), low enough that the dome + HV wing still read."""
    # a thick blast-wall prism seated on the empty front-right lip BEYOND the wing: its
    # near (right) face + base push out into the transparent x52..58 wedge so the mass
    # stands proud of the silhouette. Authored as an iso Box for a clean wall shape.
    wall = Box(top=(54, 41), wx=2, wy=3, h=9)
    wall.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # deepen the lower wall band to the matured `b` so it reads as heavy poured concrete
    c.fill_poly([wall.left_pt(0.0, wall.h - 4), wall.left_pt(1.0, wall.h - 4),
                 wall.w_front, wall.w_left], "b")
    c.fill_poly([wall.right_pt(0.0, wall.h - 4), wall.right_pt(1.0, wall.h - 4),
                 wall.w_right, wall.w_front], "b")
    # two cast-concrete form-lines across the shaded near (right) face (poured-slab texture)
    for vv in (3.0, 6.0):
        c.line(wall.right_pt(0.12, vv), wall.right_pt(0.88, vv), "K")
    # o/K HAZARD-STRIPE caps along the wall's TOP front edges (reuses the yard motif)
    hazard_stripe(c, wall.r_left, wall.r_front)
    hazard_stripe(c, wall.r_front, wall.r_right)
    # a small o radiation TREFOIL marker on the shaded near (right) face (hazard placard):
    # a K hub ringed by three o lobes so it reads as the radiation symbol, not a stray dot
    tp = wall.right_pt(0.5, 4.6)
    tcx, tcy = int(round(tp[0])), int(round(tp[1]))
    for (dx, dy) in [(0, -1), (-1, 1), (1, 1)]:   # three lobes at 12 / 8 / 4 o'clock
        c.set(_clampx(tcx + dx), _clampy(tcy + dy), "o")
    c.set(_clampx(tcx), _clampy(tcy), "K")        # dark hub of the trefoil


def _gantry(slab):
    """Shared anchor for the t4 BEAM-COLLIMATOR GANTRY: returns (leftfoot, rightfoot,
    head, beam_top_y) in screen px. Two legs straddle the yard on its LEFT and RIGHT
    front lips; the collimator `head` hangs under the top-beam and aims the beam-line
    DOWN onto the dome crown, kept LEFT of the ID tag. The top-beam rides well above the
    dome crown (~y22) so it never occludes the glass. t5 reuses `head` (the beam target)."""
    lf = (21, 47)                            # left leg foot, on the front-left yard lip
    rf = (43, 47)                            # right leg foot, on the front-right yard lip
    # collimator head: shifted LEFT of the ID-tag stalk (tag spans x32..42) so its
    # beam-line drops onto the dome crown clear of the tag. Beam-top at y15.
    head = (28, 15)
    beam_top_y = 13                          # the portal top-beam height
    return lf, rf, head, beam_top_y


def stage4_beam_gantry(c, slab):
    """t4 — MAJOR ADD: an overhead BEAM-COLLIMATOR GANTRY straddling the OPEN yard — a
    deep-steel `b` PORTAL FRAME on two braced legs planted on the LEFT and RIGHT front
    yard lips, carrying a flat lattice top-beam and a central collimator head that aims
    a glowing quantum `e`/`E` BEAM-LINE straight DOWN at the cloud chamber (the bench
    now takes a real particle beam). The prominent new overhead mass that says 'this is
    a beamline bench'. Palette matures: deep `b` lattice with lit `M`/`L` near-edges so
    it reads against the dark sky + energized `e`/`E` beam. Kept fully on-canvas; the
    top-beam rides high above the dome crown so the glass dome + ID tag stay clear."""
    lf, rf, head, beam_y = _gantry(slab)
    leg_top_y = beam_y + 1                    # legs rise to just under the top-beam

    def portal_leg(fx, fy, lean):
        """A 3px-wide near-vertical lattice leg from foot (fx,fy) up to leg_top_y, with
        a tiny inward `lean` so the frame tapers gently. Lit `M` near-edge + `b` body +
        `K` far-edge so it reads in 3-D against the dark sky. Returns the leg-top x."""
        topx = fx + lean
        c.line((fx - 1, fy), (topx - 1, leg_top_y), "K")    # far (shaded) edge
        c.line((fx, fy), (topx, leg_top_y), "b")            # body
        c.line((fx + 1, fy), (topx + 1, leg_top_y), "M")    # lit near-edge
        # X-bracing ladder rungs every few px (reads as a lattice, not a solid post)
        pts_out = _line_pts((fx, fy), (topx, leg_top_y))
        for k in range(2, len(pts_out) - 1, 3):
            ax, ay = pts_out[k]
            c.set(_clampx(ax - 1), _clampy(ay), "D")
            c.set(_clampx(ax + 1), _clampy(ay), "D")
        # foot base-plate on the yard lip
        for dx in (-1, 0, 1, 2):
            c.set(_clampx(fx + dx), _clampy(fy + 1), "K")
        return topx

    ltx = portal_leg(lf[0], lf[1], +2)
    rtx = portal_leg(rf[0], rf[1], -2)

    # --- flat lattice TOP-BEAM spanning the two leg tops (a clear portal lintel) -----
    # a 3px-tall truss: L lit top chord, b body, K under-chord, with short web ticks.
    bx0, bx1 = ltx, rtx
    c.line((bx0, beam_y - 1), (bx1, beam_y - 1), "L")      # lit top chord
    c.line((bx0, beam_y), (bx1, beam_y), "b")              # body
    c.line((bx0, beam_y + 1), (bx1, beam_y + 1), "K")      # under chord
    for x in range(bx0 + 2, bx1 - 1, 4):                  # diagonal web ticks
        c.set(x, beam_y, "M")
        c.set(x + 1, beam_y + 1, "D")
    # tie the beam ends square onto the leg tops
    c.set(_clampx(bx0), _clampy(beam_y - 1), "M")
    c.set(_clampx(bx1), _clampy(beam_y - 1), "M")

    # --- central COLLIMATOR HEAD hung under the beam + glowing beam-line down ---------
    hx, hy = head
    # a small K-framed b collimator block, lit `M` on its near edge
    c.fill_poly([(hx - 2, hy), (hx + 2, hy), (hx + 2, hy + 3), (hx - 2, hy + 3)], "b")
    for (a, b) in [((hx - 2, hy), (hx + 2, hy)), ((hx - 2, hy + 3), (hx + 2, hy + 3)),
                   ((hx - 2, hy), (hx - 2, hy + 3)), ((hx + 2, hy), (hx + 2, hy + 3))]:
        c.line(a, b, "K")
    c.set(hx - 1, hy + 1, "M"); c.set(hx, hy + 1, "M")    # lit face of the collimator
    c.line((hx, beam_y + 1), (hx, hy), "b")               # short hanger to the top-beam
    # the glowing beam-line: a bright `e` core with an `E` hot aperture, aimed DOWN at
    # the dome crown (stops ABOVE the glass at ~y28 so it doesn't punch into the fill)
    beam_top = hy + 4
    beam_bot = 28
    for yy in range(beam_top, beam_bot + 1):
        c.set(hx, yy, "e")
    c.set(hx, beam_top, "E"); c.set(hx, beam_top + 1, "E")   # hot aperture under the head
    c.set(hx - 1, beam_bot, "e"); c.set(hx + 1, beam_bot, "e")  # beam splays at the target
    c.set(hx, beam_bot, "E")                              # bright impact node above the dome


def stage5_collision_burst(c, slab, ccx, dome_cy, dr):
    """t5 — CROWNING FEATURE = the bench FIRES. A PARTICLE-COLLISION BURST blooms in the
    gap ABOVE the chamber dome: a bright `E` collision VERTEX throwing a radial spray of
    `E`/`e` track-JETS (the event the beamline gantry just delivered), seated right at
    the beam's impact point so it reads as caused by the t4 beam. The yard is then
    dressed in premium GOLD: a `q` gold 'PARTICLE BENCH' BANNER strung across the wings
    and a `q` gold FIELD-RING re-tracing the chamber's magnet coil. Reads as fully maxed
    / elite, still unmistakably the same cloud-chamber bench. Gold ONLY here.

    Anchored from the SAME gantry head (the t4 beam target) so the burst reads as the
    event the beam delivered (no 2nd guess); clamped on canvas; sits BELOW the ID tag
    (re-drawn after) so the tag still crowns on top. Draw order within t5: gold banner
    + field-ring FIRST (premium trim), then the collision burst LAST so its bright jets
    read on top of the banner where they cross."""
    _lf, _rf, head, _beam_y = _gantry(slab)

    # === GOLD trim (drawn first, so the burst overlays it) =========================
    # --- GOLD 'PARTICLE BENCH' BANNER strung high between the two wing-roof crests
    # (left wing crest ~y19, right wing crest ~y18) — a taut q gold ribbon dipping
    # gently at centre with O lit highlights + a centre pennant, reads as bunting. It
    # rides ABOVE the chamber/burst zone so it never tangles with the collision spray. -
    b0 = (14, 20)                                # on the left wing roof crest
    b1 = (47, 20)                                # on the right wing roof crest
    band = []
    steps = 12
    for i in range(steps + 1):
        t = i / steps
        x = b0[0] + t * (b1[0] - b0[0])
        y = b0[1] + t * (b1[1] - b0[1]) + int(round(1.5 * math.sin(math.pi * t)))  # gentle sag
        band.append((_clampx(x), _clampy(y)))
    for i in range(len(band) - 1):
        c.line(band[i], band[i + 1], "q")
    c.line(band[0], (band[0][0], band[0][1] + 2), "q")     # short drop tie, left
    c.line(band[-1], (band[-1][0], band[-1][1] + 2), "q")  # short drop tie, right
    for i in (3, 6, 9):                                     # O lit highlights on the banner
        c.set(band[i][0], band[i][1] - 1, "O")

    # --- GOLD FIELD-RING re-tracing the chamber's magnet coil (elite trim). Recompute
    # the SAME 2:1 ellipse pad_glow drew (rr=7, +2 offset) but in q gold, brightening
    # only the FRONT arc so it doesn't smother the base. ---
    ccy_ring = dome_cy + 1 + 2                    # base_top = dome_cy+1; ring sits +2 (== pad_glow)
    rr = 7.0
    for a in range(20, 161, 14):                  # front arc only (lower half)
        x = ccx + rr * math.cos(math.radians(a))
        y = ccy_ring + (rr * 0.5) * math.sin(math.radians(a))
        c.set(_clampx(x), _clampy(y), "q")
    # two gold field-coil bosses at the ring's left/right extremes
    c.set(_clampx(ccx - rr), _clampy(ccy_ring), "O")
    c.set(_clampx(ccx + rr), _clampy(ccy_ring), "O")

    # === COLLISION BURST (drawn LAST — the bright crowning hero) ====================
    # collision VERTEX at the t4 beam's impact point: the beam comes down at head[0]
    # and lands just above the dome crown (dome crown y = dome_cy - dr ~22). Seat the
    # vertex right at the crown so the spray clearly reads as struck out of the chamber.
    vx = head[0]                                # == beam-line x (left of the ID tag)
    vy = (dome_cy - dr)                          # right at the dome crown / beam impact
    # a COMPACT radial STAR of straight track-jets fanning out from the vertex into the
    # clear band between the dome crown and the banner. Skewed LEFT so they stay clear
    # of the ID tag on the right (tag spans x32..42). Each ray is a crisp single line:
    # solid bright `E` for its inner ~65%, mid `e` at the tip, so the jets read distinct.
    jets = [(-7, -1), (-6, -4), (-3, -6), (0, -7), (3, -5), (-7, 2), (2, 2)]
    for (dx, dy) in jets:
        ex, ey = _clampx(vx + dx), _clampy(vy + dy)
        pts = _line_pts((vx, vy), (ex, ey))
        n = max(1, len(pts))
        for k, (px, py) in enumerate(pts):
            if py < 0 or py > 63 or px < 0 or px > 63:
                continue
            c.set(px, py, "E" if k <= int(n * 0.65) else "e")
    # bright collision VERTEX core (a hot W/E bloom), drawn LAST so it caps the star
    for (dx, dy, ch) in [(0, 0, "W"), (-1, 0, "E"), (1, 0, "E"), (0, -1, "E"), (0, 1, "E")]:
        c.set(_clampx(vx + dx), _clampy(vy + dy), ch)


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the particle-physics bench at upgrade `stage` (1..5). Stage 1 is
    IDENTICAL to the shipped base; each higher stage keeps every prior addition and
    bolts on the next (t2 detector puck -> t3 shield wall -> t4 beam gantry -> t5
    collision burst + gold). The open cloud-chamber yard grows into a full beamline
    bench, while the hero CLOUD CHAMBER (dome) and its ID TAG are RE-DRAWN LAST at
    every stage so the signature always reads in front of / above the new structure.

    Painter's order: base yard + wings first; then upgrade masses on the yard EDGES
    and a high overhead arch; the t5 burst blooms above the dome; finally the dome
    tracks-flash and the ID tag are re-stamped on top so nothing occludes the hero."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    contact_shadow(c)               # flat iso ground-pool (drawn first, underneath)
    slab = yard_pad(c)              # open navy concrete pad + hazard striping
    lw = left_wing(c, slab)         # back-left instrument/electronics wing
    rw = right_wing(c, slab)        # back-right power/HV wing (meets L at back corner)
    hv_conduit(c, rw)               # o HV conduit + "PARTICLE BENCH" placard
    ccx, ccy = pad_glow(c, slab)    # SIGNATURE A: pad underglow + magnet-coil field ring

    # --- CUMULATIVE UPGRADE STAGES that grow on the YARD EDGES / overhead ----------
    # (drawn BEFORE the dome so the chamber + tag, re-stamped below, occlude them) ---
    if stage >= 3:
        stage3_shield_wall(c, slab, rw)     # t3 mass on the back-right HV wing
    if stage >= 4:
        stage4_beam_gantry(c, slab)         # t4 overhead arch + beam-line down

    # --- SIGNATURE B/C: the chamber dome + tracks (hero, drawn over the gantry) ----
    dcx, dcy, dr = cloud_chamber(c, ccx, ccy)        # base + glass dome + vapor
    flash = particle_tracks(c, dcx, dcy, dr)         # spiraling tracks + flash

    # t2 detector-puck reads in the open yard edge; the brighter flash spark needs the
    # tracks already drawn, so apply t2 here (after the hero tracks).
    if stage >= 2:
        stage2_detector_puck(c, slab, flash)

    # t5 collision burst blooms ABOVE the dome (after the dome, before the tag) -------
    if stage >= 5:
        stage5_collision_burst(c, slab, dcx, dcy, dr)

    # --- SIGNATURE D LAST: the lit particle ID tag always crowns on top -------------
    id_tag(c, dcx, dcy, dr)
    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/axiom"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "particle-physics-bench"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped particle-physics-bench.png, so it does NOT overwrite the
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
