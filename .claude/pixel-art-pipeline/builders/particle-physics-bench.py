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

AXIOM = {"K": "#0e1124", "W": "#dfe6f6", "L": "#b4bee0", "M": "#7c88b8", "D": "#4e5888", "d": "#333a60",
         "h": "#d6ecff", "c": "#aad8ff", "g": "#4a9ce6", "G": "#2060b0",
         "o": "#ffe27a", "O": "#fff3c0", "r": "#c89a2a"}


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
    Clipped to the dome interior so they read as INSIDE the glass."""
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


def build():
    c = Canvas()
    contact_shadow(c)               # flat iso ground-pool (drawn first, underneath)
    slab = yard_pad(c)              # open navy concrete pad + hazard striping
    left_wing(c, slab)              # back-left instrument/electronics wing
    rw = right_wing(c, slab)        # back-right power/HV wing (meets L at back corner)
    hv_conduit(c, rw)               # o HV conduit + "PARTICLE BENCH" placard
    ccx, ccy = pad_glow(c, slab)    # SIGNATURE A: pad underglow + magnet-coil field ring
    dcx, dcy, dr = cloud_chamber(c, ccx, ccy)   # SIGNATURE B: base + glass dome + vapor
    particle_tracks(c, dcx, dcy, dr)            # SIGNATURE C: spiraling tracks + flash
    id_tag(c, dcx, dcy, dr)         # SIGNATURE D: lit particle ID tag crowning above

    spec = {"width": 64, "height": 64, "palette": AXIOM, "rows": c.rows()}
    out = "/path/to/scienium/art/src/buildings/axiom_particle-physics-bench.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
