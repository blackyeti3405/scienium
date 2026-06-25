#!/usr/bin/env python3
"""
Field Station — BioCore economy building (BESPOKE FORM · OPEN-CONCEPT L PLANK CABIN).

This is NOT the gateway cube, and deliberately NOT the Volt open-yard either: where
the Volt Workshop is a corrugated-metal maker-slab, this is the rustic, outdoorsy
member of the set — a weathered EXPEDITION-CAMP field cabin:

  * a low PACKED-EARTH COURT slab (d/r ground, NOT lavender concrete) is the floor
    the viewer looks DOWN onto; its open front edges are ringed by o/K survey-marker
    striping (survey teeth, not Volt hazard chevrons);
  * two LOW PLANK WINGS sit on the back slab edges and meet at the back corner in an
    L — heavier D/d TIMBER walls (the most rustic framing in the batch), each capped
    by a low SLANTED LEAN-TO plank roof (boards + a D ridge where they meet), NOT a
    flat or corrugated cap:
      - back-LEFT wing  : the plainer wing — plank walls, one small c window;
      - back-RIGHT wing : carries the HERO. Its SHADED right face opens as a wide
        K-framed lit BAY that GLOWS warm o/O (lamp-lit interior, gear visible) so the
        opening reads on the shaded side, plus a K storage shutter;
  * the L embraces an OPEN front-corner COURTYARD — that open court IS the building,
    and the signature instrument stands out in the open there;
  * a small o lantern hangs at the inner corner where the wings meet; a leaf-vine g
    curl winds the mast base (BioCore trim).

Signature (one-of-one): a tall GUYED ECO-SENSOR MAST rising from the open courtyard —
a thin D/M pole with d guy-wires angling to o ground anchors, crowned by a spinning
W/c cup-ANEMOMETER (one cup catching O light, c/h motion-ghost), a swiveling D/M
TRAIL-CAMERA box with a glowing c/O lens eye + a thin g scan-line aimed over the
court, and a fluttering o/O DATA-PENNANT with faint c/h data-blip dots pinging
outward (the prediction signal). No anemometer / sensor-mast / trail-camera motif
exists elsewhere in the catalog.

OPENING SIDE: RIGHT (shaded) — the glowing lit bay is on the right wing's right face.
"""
import os
import sys
import json

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box, RX, RY, LX, LY

BIO = {"K": "#1a2417", "W": "#e8f2d8", "L": "#c4dba6", "M": "#9fc07e", "D": "#6f9456", "d": "#4a6e3a",
       "h": "#d2f7ec", "c": "#9fefcf", "g": "#36cc9e", "G": "#1d8f70",
       "o": "#f0b24d", "O": "#ffd488", "r": "#b9701e"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def _stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings) at top-left (x0,y0).
    '.' = skip (transparent)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


def survey_stripe(c, p0, p1, n):
    """o/K survey-marker teeth along a slab front edge from p0 to p1."""
    for k in range(n + 1):
        t = k / n
        x = p0[0] + t * (p1[0] - p0[0])
        y = p0[1] + t * (p1[1] - p0[1])
        c.set(int(round(x)), int(round(y)), "o" if k % 2 == 0 else "K")


def plank_grain(c, box, face, cols, v0, v1, ch="d"):
    """Vertical timber-plank grooves down a wing face — reads as plank siding."""
    pt = box.left_pt if face == "left" else box.right_pt
    for u in cols:
        c.line(pt(u, v0), pt(u, v1), ch)


def leanto_roof(c, box, ridge_dir, board="D", board_hi="L", shade="d"):
    """Low SLANTED lean-to plank roof over a wing: paint the roof diamond as
    timber boards (running back→front), a bright back edge, a d ridge along the
    high (back) edge. `ridge_dir` 'left'/'right' just tints the lower slope so the
    two wings read as sloping toward the open court."""
    # base board fill (already filled by draw(); re-lay as warm boards)
    c.fill_poly([box.r_top, box.r_right, box.r_front, box.r_left], board)
    # brighter lit back-left triangle
    c.fill_poly([box.r_top, box.r_left, box.r_front], board_hi)
    # plank seams running across the slope (left->front direction)
    for v in (0.22, 0.44, 0.66, 0.86):
        c.line(box.roof_pt(0.06, v), box.roof_pt(0.94, v), shade)
    # bright back ridge edges
    c.line(box.r_top, box.r_left, "W")
    c.line(box.r_top, box.r_right, board_hi)
    # K outline of the roof diamond
    for a, b in [(box.r_top, box.r_right), (box.r_right, box.r_front),
                 (box.r_front, box.r_left), (box.r_left, box.r_top)]:
        c.line(a, b, "K")


# ── 1. PACKED-EARTH COURT SLAB — the open field floor (drawn FIRST) ───────────
def court_slab(c):
    """A low packed-earth pad the viewer looks down onto. Wings seat on its back
    edges; the front-center stays OPEN as the sample courtyard. d/r earth tones
    (NOT lavender concrete) + o/K survey striping on the open front edges."""
    slab = Box(top=(32, 27), wx=11, wy=11, h=3)
    # deck: packed earth — lit d, brighter back-left, a few r dirt patches
    c.fill_poly([slab.r_top, slab.r_right, slab.r_front, slab.r_left], "d")
    c.fill_poly([slab.r_top, slab.r_left, slab.r_front], "D")
    # scattered r/d earth mottling so it reads as ground, not a panel
    for (u, v) in [(0.3, 0.4), (0.6, 0.25), (0.45, 0.7), (0.72, 0.55), (0.25, 0.6)]:
        p = slab.roof_pt(u, v)
        c.set(int(round(p[0])), int(round(p[1])), "r")
    # the 3px earth-pad edge on the two FRONT faces
    c.fill_poly([slab.r_left, slab.r_front, slab.w_front, slab.w_left], "r")
    c.fill_poly([slab.r_front, slab.r_right, slab.w_right, slab.w_front], "d")
    # outline
    for a, b in [(slab.r_top, slab.r_right), (slab.r_right, slab.r_front),
                 (slab.r_front, slab.r_left), (slab.r_left, slab.r_top),
                 (slab.r_left, slab.w_left), (slab.r_front, slab.w_front),
                 (slab.r_right, slab.w_right),
                 (slab.w_left, slab.w_front), (slab.w_front, slab.w_right)]:
        c.line(a, b, "K")
    # SURVEY-MARKER striping along the two open FRONT deck edges (rings the court)
    survey_stripe(c, slab.r_left, slab.r_front, 11)
    survey_stripe(c, slab.r_front, slab.r_right, 11)
    return slab


# ── 2. BACK-LEFT WING — plainer low plank shed on the back-left slab edge ──────
def left_wing(c, slab):
    """A low plank shed along the BACK-LEFT slab edge (long toward the LEFT via wy,
    slim in wx). The PLAINER wing: heavy D/d timber walls, one small c window. Sits
    well off the shared back corner so a clear OPEN notch is left to the court, and
    kept LOW so the open courtyard + mast read over it."""
    apex = (slab.r_top[0] - 5, slab.r_top[1] - 9)
    wing = Box(top=apex, wx=3, wy=7, h=9)
    # heavy timber walls — D lit, d shaded (warm wood, not grey)
    wing.draw(c, roof="D", lwall="D", rwall="d", roof_hi="W", outline="K")
    leanto_roof(c, wing, ridge_dir="left")
    # plank grain down both faces (rustic siding)
    plank_grain(c, wing, "left", (0.18, 0.34, 0.5, 0.66, 0.82), 1.6, 7.6, ch="d")
    plank_grain(c, wing, "right", (0.4, 0.7), 1.6, 7.6, ch="K")
    # warm WOOD corner posts (r timber) at the lit-face ends — reads as framed wood
    c.line(wing.left_pt(0.04, 0.2), wing.left_pt(0.04, 7.8), "r")
    c.line(wing.left_pt(0.96, 0.2), wing.left_pt(0.96, 7.8), "r")
    c.line(wing.left_pt(0.06, 7.4), wing.left_pt(0.94, 7.4), "r")   # warm sill band
    # small c window high on the lit (left) face — the plainer wing's one glaze
    wing.window(c, "left", 0.30, 0.60, 2.4, 5.0, glass="c", hi="h", shade="G", mullions=1)
    # a low K plank skirt board near the base of the lit face
    c.line(wing.left_pt(0.06, 7.8), wing.left_pt(0.94, 7.8), "K")
    return wing


# ── 3. BACK-RIGHT WING — HERO wing: glowing lit BAY on its shaded right face ───
def right_wing(c, slab):
    """A plank shed along the BACK-RIGHT slab edge (long toward the RIGHT via wx,
    slim in wy), abutting the left wing at the back corner -> the L meets there.
    Carries the assigned RIGHT opening: its SHADED right face opens as a wide
    K-framed lit BAY that GLOWS warm (o/O lamp-lit interior, gear visible), plus a
    K storage shutter. A touch taller so the bay reads as the hero face."""
    # deeper in wy so the SHADED right face is a BROAD visible plane that can carry
    # the glowing hero bay (a thin wx-end sliver would hide it); shorter in wx.
    apex = (slab.r_top[0] + 4, slab.r_top[1] - 10)
    wing = Box(top=apex, wx=4, wy=5, h=10)
    wing.draw(c, roof="D", lwall="D", rwall="d", roof_hi="W", outline="K")
    leanto_roof(c, wing, ridge_dir="right")
    # plank grain + warm WOOD posts on the lit left face (matches left-wing framing)
    plank_grain(c, wing, "left", (0.3, 0.7), 1.6, 8.4, ch="d")
    c.line(wing.left_pt(0.04, 0.2), wing.left_pt(0.04, 8.6), "r")
    c.line(wing.left_pt(0.96, 0.2), wing.left_pt(0.96, 8.6), "r")
    c.line(wing.left_pt(0.06, 8.2), wing.left_pt(0.94, 8.2), "r")

    # --- HERO: wide GLOWING lit BAY on the SHADED right face (the RIGHT opening) ---
    glow_bay(c, wing)
    return wing


def glow_bay(c, wing):
    """The wide K-framed, warm-glowing covered bay on the right wing's SHADED right
    face: a deep o/O lamp-lit opening with gear visible inside, so the opening
    reads clearly even on the shaded side. A K storage shutter sits beside it."""
    # bay opening panel (most of the shaded face) — wide + tall so the glow reads
    u0, u1, v0, v1 = 0.08, 0.66, 2.0, 8.8
    # warm interior: O hot core at the lamp, o body
    c.fill_poly([wing.right_pt(u0, v0), wing.right_pt(u1, v0),
                 wing.right_pt(u1, v1), wing.right_pt(u0, v1)], "o")
    # brighter O glow pooled across the upper-inner half (lamp wash)
    c.fill_poly([wing.right_pt(u0, v0 + 0.6), wing.right_pt(u0 + 0.40, v0 + 0.6),
                 wing.right_pt(u0 + 0.40, v1 - 1.4), wing.right_pt(u0, v1 - 1.4)], "O")
    # deeper d shadow at the far/lower-right inside corner (depth)
    c.fill_poly([wing.right_pt(u1 - 0.14, v0 + 2.0), wing.right_pt(u1, v0 + 2.0),
                 wing.right_pt(u1, v1), wing.right_pt(u1 - 0.14, v1)], "d")
    # GEAR visible inside the bay: a small crate + a hung tool silhouette (K on glow)
    gp = wing.right_pt(0.34, 5.4)
    gx, gy = int(round(gp[0])), int(round(gp[1]))
    _stamp(c, gx, gy, [
        "KKKK",   # crate top
        "KrDK",   # crate face (warm wood box in the lamp light)
        "KKKK",
    ])
    # a hung tool / lantern hook line inside
    c.line(wing.right_pt(0.50, 2.8), wing.right_pt(0.50, 4.0), "K")
    c.set(int(round(wing.right_pt(0.50, 4.2)[0])), int(round(wing.right_pt(0.50, 4.2)[1])), "M")
    # heavy K bay frame (deep covered-bay header + jambs)
    for a, b in [(wing.right_pt(u0, v0), wing.right_pt(u1, v0)),
                 (wing.right_pt(u0, v1), wing.right_pt(u1, v1)),
                 (wing.right_pt(u0, v0), wing.right_pt(u0, v1)),
                 (wing.right_pt(u1, v0), wing.right_pt(u1, v1))]:
        c.line(a, b, "K")
    # a second inner header line — the covered-bay overhang
    c.line(wing.right_pt(u0, v0 + 0.9), wing.right_pt(u1, v0 + 0.9), "r")
    # warm spill onto the court floor just below the bay (light leaks out)
    base = wing.right_pt(0.36, v1 + 0.4)
    bx, by = int(round(base[0])), int(round(base[1]))
    for dx, ch in [(-2, "o"), (-1, "O"), (0, "O"), (1, "o"), (2, "r")]:
        c.set(bx + dx, by, ch)
        c.set(bx + dx, by + 1, "r")

    # --- K storage SHUTTER beside the bay (toward the front/right) ---
    s0, s1, sv0, sv1 = 0.72, 0.94, 3.2, 7.8
    c.fill_poly([wing.right_pt(s0, sv0), wing.right_pt(s1, sv0),
                 wing.right_pt(s1, sv1), wing.right_pt(s0, sv1)], "K")
    for vv in (4.2, 5.2, 6.2, 7.2):
        c.line(wing.right_pt(s0 + 0.02, vv), wing.right_pt(s1 - 0.02, vv), "d")


# ── 4. CORNER LANTERN — a small warm o lantern at the inner L corner ──────────
def corner_lantern(c, lw, rw):
    """A small o/O lantern hanging at the inner corner where the two wings meet —
    the warm BioCore lamp glow tying the L together."""
    # inner corner ≈ shared back apex, dropped a little into the notch
    p = (lw.r_top[0] + 1, lw.r_top[1] + 4)
    px, py = int(round(p[0])), int(round(p[1]))
    c.set(px, py - 2, "K")            # hook
    c.line((px, py - 2), (px, py - 1), "d")
    _stamp(c, px - 1, py - 1, [
        "KKK",
        "KOK",   # glowing lamp
        "KoK",
        ".K.",
    ])
    # tiny glow halo
    for dx, dy in [(-2, 0), (2, 0), (0, -1)]:
        c.set(px + dx, py + dy, "o")


# ── 5. SIGNATURE — guyed eco-sensor mast standing in the open courtyard ───────
def sensor_mast(c, slab):
    """The hero: a tall GUYED ECO-SENSOR MAST rising from the OPEN front-corner of
    the court. Thin D/M pole; d guy-wires to o ground anchors; crowned by a spinning
    cup-anemometer, a swiveling trail-camera with a glowing lens, and a fluttering
    data-pennant pinging c/h blips. A g leaf-vine winds the base (BioCore trim)."""
    # base of the mast: out in the open front-corner of the court, clear of wings
    bp = slab.roof_pt(0.52, 0.42)
    bx, by = int(round(bp[0])), int(round(bp[1]))
    top_y = by - 32   # tall mast rising well above the wing roofs

    # GUY-WIRES first (behind the pole): from a mid-mast collar to three o anchors
    collar_y = by - 20
    anchors = [(bx - 9, by - 1), (bx + 9, by - 2), (bx + 2, by + 4)]
    for ax, ay in anchors:
        c.line((bx, collar_y), (ax, ay), "d")
        c.set(ax, ay, "o")           # o ground anchor peg
        c.set(ax, ay + 1, "K")
    # collar where guys meet the pole
    c.set(bx, collar_y, "M")

    # POLE: thin D/M timber mast with a lit left edge
    c.line((bx, by), (bx, top_y), "D")
    c.line((bx - 1, by - 1), (bx - 1, top_y + 1), "M")   # lit left edge
    c.line((bx + 1, by - 1), (bx + 1, collar_y), "d")    # shaded right edge (lower)
    # small K rung details up the pole
    for ry in (by - 6, by - 13, by - 22):
        c.set(bx - 1, ry, "K")
        c.set(bx + 1, ry, "K")
    # base contact shadow + g leaf-vine curl winding the base (BioCore trim)
    for dx in (-2, -1, 0, 1, 2):
        c.set(bx + dx, by + 1, "K")
    _stamp(c, bx - 2, by - 7, [
        "..g",   # vine curling up-right around the base
        ".g.",
        "g.g",
        ".g.",
        "g..",
        ".g.",
        "..g",
    ])
    c.set(bx - 2, by - 4, "G")   # a darker leaf
    c.set(bx + 1, by - 9, "g")

    # TRAIL-CAMERA: a small D/M box mid-mast on the LEFT of the pole, glowing c/O
    # lens swiveled out over the OPEN court (away from the bay glow so it reads).
    cam_y = by - 16
    _stamp(c, bx - 5, cam_y, [
        "KKKK",
        "KDMK",   # camera body (shaded D, lit M toward the court)
        "KcOK",   # glowing lens: c iris + O hotspot, aimed left over the open court
        "KKKK",
    ])
    # thin g scan-line beaming out LEFT over the courtyard from the lens
    for k, gx in enumerate(range(bx - 11, bx - 5)):
        gy = cam_y + 2 + ((bx - 6 - gx) // 2)
        c.set(gx, gy, "g" if k % 2 == 0 else "h")

    # DATA-PENNANT: a small o/O triangular flag fluttering up-right near the top
    pen_y = top_y + 4
    _stamp(c, bx + 1, pen_y, [
        "oO.",   # flag flutters out to the right
        "ooO",
        "oo.",
    ])
    c.set(bx, pen_y, "r")        # pennant tie to the pole
    # faint c/h data-blip dots pinging outward (the prediction signal)
    for (dx, dy, ch) in [(4, 1, "c"), (6, 0, "h"), (5, 3, "c"), (7, 2, "h")]:
        c.set(bx + dx, pen_y + dy, ch)

    # ANEMOMETER CROWN: 3 W/c cups on thin K arms spinning at the very top
    cr = (bx, top_y)
    c.set(cr[0], cr[1], "K")
    # three radial K arms + cups; one cup catching O light; c/h motion-ghost
    arms = [(-3, -1, "W"), (3, -1, "O"), (0, -3, "c")]
    for ax, ay, cupc in arms:
        c.line(cr, (cr[0] + ax, cr[1] + ay), "K")
        c.set(cr[0] + ax, cr[1] + ay, cupc)               # the cup
        c.set(cr[0] + ax + (1 if ax >= 0 else -1), cr[1] + ay, cupc)
    # motion-blur ghost cups (spin hint)
    for (gx, gy) in [(cr[0] - 1, cr[1] - 3), (cr[0] + 2, cr[1] - 2), (cr[0] - 3, cr[1])]:
        c.set(gx, gy, "h")
    # a hot O glint on the catching cup
    c.set(cr[0] + 3, cr[1] - 2, "O")


def build():
    c = Canvas()
    # painter's order: court slab (foundation) -> back wings -> corner lantern ->
    # the guyed eco-sensor mast signature standing in the OPEN front court.
    slab = court_slab(c)
    lw = left_wing(c, slab)
    rw = right_wing(c, slab)
    corner_lantern(c, lw, rw)
    sensor_mast(c, slab)

    spec = {"width": 64, "height": 64, "palette": BIO, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/biocore_field-station.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
