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

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, RX, RY, LX, LY

# Base BioCore palette (shared keys) + the four EVOLVED accent shades reserved for the
# upgrade stages only (they appear in no stage-1 helper, so field-station.png is
# unchanged). Lab-wide BioCore evolved accents (same keys+hexes as greenhouse.py):
#   b  deep mossy bark-green — matured timber/structure tone for t3+ new masses/frames
#   e  bioluminescent glow (mid)   E  bioluminescent glow (bright) — the t4/t5 life-glow
#   q  premium gold trim — t5 flourish ONLY (NOT a whole-building recolor)
BIO = {"K": "#1a2417", "W": "#e8f2d8", "L": "#c4dba6", "M": "#9fc07e", "D": "#6f9456", "d": "#4a6e3a",
       "h": "#d2f7ec", "c": "#9fefcf", "g": "#36cc9e", "G": "#1d8f70",
       "o": "#f0b24d", "O": "#ffd488", "r": "#b9701e",
       "b": "#2f4a2a", "e": "#74f0b6", "E": "#ccffe4", "q": "#f3c63a"}


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
    # return the mast's source points so the upgrade stages anchor off the SAME
    # geometry (second weather-tower beside it; the t5 telemetry array on its crown).
    return bx, by, top_y


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS field / climate /
# telemetry kit onto the prior expedition-camp form — never restarts, never recolors
# the whole cabin. Theme: the rustic field station grows into a fully-rigged remote
# RESEARCH OUTPOST. The rustic TIMBER identity is kept (matured bark-green `b` framing,
# planks, tarps); the evolved glow is BioCore's BIO-LUMINESCENT green-teal (`e/E`),
# never electric cyan. Gold (`q`) appears ONLY at t5, as the pennant + anchor caps.
#
#   t2  small functional add : rain-gauge + solar-panel on the back-LEFT wing roof,
#                              an extra `o` ground-anchor lantern at the court edge,
#                              and a brightened `O` wash on the hero lit-bay glow.
#   t3  structural add       : a lean-to SPECIMEN-DRYING RACK + tarp annex off the
#                              RIGHT wing — a `b` timber frame with hanging M/g plant
#                              bundles + `d` netting (rustic, plank-consistent).
#   t4  major add            : a SECOND TALLER guyed WEATHER-TOWER from the court
#                              beside the signature mast, carrying a glowing `e`
#                              data-uplink dish + stacked sensor booms; `b` frame.
#   t5  crowning feature     : the signature mast maxes into a FULL TELEMETRY ARRAY —
#                              a brighter spinning `E` anemometer, an `E` camera-eye,
#                              a swarm of `e` data-blip pings + a `q` GOLD pennant and
#                              gold anchor caps. (Rustic identity kept; gold = trim only.)
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_fieldkit(c, slab, lw, rw):
    """t2 — SMALL FUNCTIONAL ADD: more field instrumentation, all base-palette + one
    brightened glow. Three modest, well-spaced elements so they read as kit, not noise:
      • a RAIN-GAUGE cylinder + a small tilted SOLAR-PANEL prop on the back-LEFT plank
        wing roof (up-left, clear of the central sensor mast);
      • an extra `o` GROUND-ANCHOR LANTERN staked at the open front court edge;
      • a brighter `O` wash pooled into the hero lit-bay so the lamp reads warmer.
    Nothing here touches the base functions, so stage 1 stays byte-identical."""
    # --- RAIN-GAUGE: a slim funnel-topped tube standing UP-LEFT on the LEFT wing roof.
    #     Drawn as a HARD K-outlined post so it pops off the green plank roof instead of
    #     blending: a K left edge + L lit body + a clean wide W/L funnel cone on top, and
    #     a short c water-read column. Kept thin (2px) and pulled to the back-left so it
    #     never crowds the solar panel (now well to its lower-right). ---
    gp = lw.roof_pt(0.26, 0.66)
    gx, gy = int(round(gp[0])), int(round(gp[1]))
    GH = 6
    c.line((gx, gy), (gx, gy - GH), "K")             # hard dark left edge — reads off the roof
    c.line((gx + 1, gy), (gx + 1, gy - GH), "L")     # lit metal body
    c.set(gx, gy - 2, "c"); c.set(gx + 1, gy - 4, "c")  # water-level read marks
    # wide funnel catch-cone on top (a clear 4px lip so it reads as a rain gauge, not a stick)
    fy = gy - GH - 1
    c.set(gx - 1, fy, "L"); c.set(gx, fy, "W"); c.set(gx + 1, fy, "W"); c.set(gx + 2, fy, "L")
    c.set(gx - 1, fy, "K"); c.set(gx + 2, fy - 1, "M")
    c.set(gx, fy - 1, "h"); c.set(gx + 1, fy - 1, "W")  # bright rim glint
    c.set(gx, gy, "K"); c.set(gx + 1, gy, "K")          # feet on the roof
    # --- SOLAR-PANEL: a tilted teal-cell panel on a short post, placed clearly DOWN-RIGHT
    #     of the gauge with open roof between them so the two read as two distinct props.
    #     A solid K-outlined quad with a flat g cell face, one G shade band + a single hard
    #     W glint — simple + crisp (no h/g speckle that turned the old panel to mush). ---
    pp = lw.roof_pt(0.66, 0.30)
    px, py = int(round(pp[0])), int(round(pp[1]))
    c.line((px, py), (px, py - 2), "D")          # short support post (lit)
    c.set(px + 1, py - 1, "d")                    # post shade
    c.set(px, py, "K")                            # post foot
    # tilted panel face — an iso quad: solid g cells, lower-right G shade, one W sun glint.
    q0, q1, q2, q3 = (px - 3, py - 4), (px, py - 6), (px + 3, py - 4), (px, py - 2)
    c.fill_poly([q0, q1, q2, q3], "g")           # flat lit cell field (one clean tone)
    c.fill_poly([q3, q2, (q2[0] - 1, q2[1] + 1), (q3[0], q3[1] - 1)], "G")  # lower-right shade
    c.set(q1[0], q1[1] + 1, "W"); c.set(q1[0] - 1, q1[1] + 1, "h")          # single sun glint
    c.set((q0[0] + q2[0]) // 2, (q0[1] + q2[1]) // 2, "G")                  # cell-seam tick
    for a, b in [(q0, q1), (q1, q2), (q2, q3), (q3, q0)]:
        c.line(a, b, "K")                         # hard K frame all round
    # --- EXTRA GROUND-ANCHOR LANTERN staked at the open front court edge (front-left
    #     vertex area), matching the signature's o ground anchors. ---
    ap = slab.roof_pt(0.22, 0.18)
    ax, ay = int(round(ap[0])), int(round(ap[1]))
    c.set(ax, ay + 2, "K")                       # peg in the earth
    c.set(ax, ay + 1, "K")                       # stake base (darker so the lantern reads)
    c.set(ax, ay, "r")                           # short wood stake
    c.set(ax, ay - 1, "o")                       # lantern body
    c.set(ax, ay - 2, "O")                       # warm flame core
    for dx, dy in [(-1, -1), (1, -1), (0, -3)]:  # tiny glow halo (a touch taller)
        c.set(ax + dx, ay + dy, "o")
    # --- BRIGHTEN the hero lit-bay: pool a couple extra O highlights into the upper-
    #     inner glow (over-painted on top of the base bay, so the lamp reads warmer). ---
    for (u, v) in [(0.20, 3.0), (0.16, 4.0), (0.24, 3.6)]:
        p = rw.right_pt(u, v)
        c.set(int(round(p[0])), int(round(p[1])), "O")


def stage3_dryrack(c, slab, rw):
    """t3 — STRUCTURAL ADD: a rustic SPECIMEN-DRYING RACK — a LOW, WIDE timber trestle in
    the clear ground off the RIGHT wing's front-right corner (the shaded side, away from the
    central mast). A matured bark-green `b` frame: two short splayed leg-pairs holding a long
    horizontal TOP BAR, a small sun-bleached `L/M` tarp lean-to angled over the bar, and a
    row of tied `M/g` plant BUNDLES hanging down to dry. Built WIDE + LOW (not tall) so it
    reads as a drying rack, not furniture; tucked snug against the wing's front-right base so
    it connects to the building. Introduces the matured bark-green `b`. Lesson applied: tarp
    in LIGHT `L/M` so it pops on the dark earth; kept short so it never reads as a chair."""
    # the rack sits low+wide in the right-front ground (x44..56, y44..51). Author in screen
    # space. Anchor the TOP BAR first (the spine of the rack), then legs, tarp, bundles.
    bar_l = (45, 45)                              # left end of the horizontal drying bar
    bar_r = (55, 47)                              # right end (recedes down-right in iso)
    # --- small sun-bleached TARP lean-to angled OVER the bar (drawn first, behind) ---
    tA = (bar_l[0] - 1, bar_l[1] - 4)             # tarp back-ridge (raised above the bar)
    tB = (bar_r[0] - 1, bar_r[1] - 4)
    c.fill_poly([tA, tB, (bar_r[0], bar_r[1] - 1), (bar_l[0], bar_l[1] - 1)], "M")  # canvas
    c.line(tA, tB, "L")                           # bright ridge of the tarp
    c.fill_poly([tB, (bar_r[0], bar_r[1] - 1), (bar_r[0] + 1, bar_r[1] - 1), (tB[0] + 1, tB[1])], "D")  # shade fold
    c.line((bar_l[0], bar_l[1] - 1), (bar_r[0], bar_r[1] - 1), "d")   # tarp front hem
    for a, b in [(tA, (bar_l[0], bar_l[1] - 1)), (tB, (bar_r[0], bar_r[1] - 1))]:
        c.line(a, b, "K")                         # crisp side edges
    # --- the long horizontal TOP BAR (the drying spine) ---
    c.line(bar_l, bar_r, "b")
    c.line((bar_l[0], bar_l[1] - 1), (bar_r[0], bar_r[1] - 1), "M")   # lit top of the bar
    c.set(bar_l[0], bar_l[1], "K"); c.set(bar_r[0], bar_r[1], "K")
    # --- two short SPLAYED leg-pairs (A-frame trestles) under the bar ends, kept SHORT ---
    for (lx, ly) in (bar_l, (bar_r[0] - 1, bar_r[1])):
        c.line((lx, ly), (lx - 2, ly + 5), "b")   # front-splayed leg
        c.line((lx + 1, ly), (lx + 2, ly + 5), "b")   # back-splayed leg
        c.set(lx - 2, ly + 5, "K"); c.set(lx + 2, ly + 5, "K")   # feet
        c.set(lx - 2, ly + 6, "d"); c.set(lx + 2, ly + 6, "d")   # contact shadow
    # --- a row of tied plant BUNDLES hanging from the bar to dry (M stems, g leaf, G base) -
    for k, bxh in enumerate((47, 49, 51, 53)):
        topy = bar_l[1] + (1 if k < 2 else 2)     # follow the bar's slight down-slope
        c.set(bxh, topy, "r")                     # tie at the bar
        c.line((bxh, topy + 1), (bxh, topy + 3), "M")   # bundle stems
        c.set(bxh + (1 if k % 2 else -1), topy + 2, "g")   # a leaf tip to one side
        c.set(bxh, topy + 4, "G")                 # darker bundle base


def stage4_weathertower(c, slab, bx, by, top_y):
    """t4 — MAJOR ADD: a SECOND, TALLER guyed WEATHER-TOWER rising from the court a little
    to the LEFT of the signature sensor mast (the camera + pennant flutter to the LEFT and
    RIGHT of the signature respectively, so the new tower sits left-rear, framing — never
    occluding — the hero). A slim deep bark-green `b` lattice mast, its own `d` guy-wires to
    `o` anchors, crowned by a glowing bio-luminescent `e` DATA-UPLINK DISH on a short gimbal
    plus two stacked `M` sensor booms. The prominent new vertical mass that says 'this camp
    now uplinks data'. Palette matures to deep `b` + energized `e/E`. Anchored off the SAME
    base point (bx,by) as the signature mast; kept fully on-canvas and clear of the crown."""
    # foot a few px LEFT of the signature mast base, slightly back, so the two masts read
    # as a paired rig (the new one a touch shorter so the hero stays dominant).
    tx = max(2, bx - 8)
    tby = by - 2                                  # foot sits just back of the hero foot
    ttop = tby - 27                               # tall, but ~3px under the hero crown
    ttop = max(2, ttop)
    # --- guy-wires first (behind the mast): from a mid collar to two o ground anchors ---
    collar_y = tby - 16
    for axp, ayp in [(tx - 6, tby - 1), (tx - 3, tby + 3)]:
        axp = max(0, axp)
        c.line((tx, collar_y), (axp, ayp), "d")
        c.set(axp, ayp, "o")                      # o ground anchor peg
        c.set(axp, ayp + 1, "K")
    c.set(tx, collar_y, "M")                      # collar
    # --- LATTICE MAST: twin bark-green uprights + X-bracing rungs (a built tower) ---
    c.line((tx, tby), (tx, ttop), "b")            # lit left upright
    c.line((tx + 2, tby), (tx + 2, ttop), "K")    # shaded right upright
    for yy in range(ttop + 3, tby - 1, 4):        # X-bracing
        c.line((tx, yy), (tx + 2, yy + 2), "b")
        c.line((tx + 2, yy), (tx, yy + 2), "b")
    c.set(tx, ttop, "K"); c.set(tx + 2, ttop, "K")
    for dx in (-1, 0, 1, 2, 3):                   # foot plate + contact shadow
        c.set(tx + dx, tby + 1, "K")
    # --- two stacked SENSOR BOOMS arming out from the mast (thin M cross-arms + tip pods) ---
    for boom_y, blen in [(ttop + 7, -4), (ttop + 12, 4)]:
        bxe = max(0, min(63, tx + 1 + blen))
        c.line((tx + 1, boom_y), (bxe, boom_y), "M")
        c.set(bxe, boom_y, "c")                   # a small c sensor pod at the tip
        c.set(bxe, boom_y - 1, "h")
    # --- DATA-UPLINK DISH on a short gimbal at the crown (glowing bio-luminescent e),
    #     drawn as a clear up-tilted bowl so it reads as a dish, not a smudge. ---
    dcx, dcy = tx + 1, ttop - 2                   # dish hub above the mast top
    c.line((tx + 1, ttop), (dcx, dcy + 1), "M")   # short gimbal post
    c.set(dcx, dcy + 1, "K")                      # gimbal pivot
    # bowl: a wider e arc with an E bright upper rim + a G shaded under-curve (depth)
    for ddx in (-3, -2, -1, 0, 1, 2, 3):
        rim = dcy - 1 - (1 if abs(ddx) <= 1 else 0)    # shallow concave rim
        c.set(max(0, min(63, dcx + ddx)), rim, "E")    # bright dish rim catches light
    for ddx in (-2, -1, 0, 1, 2):
        c.set(max(0, min(63, dcx + ddx)), dcy, "e")    # the e bowl face
    c.set(dcx, dcy + 1, "G")                      # bowl under-shade (depth)
    c.set(dcx - 1, dcy + 1, "G")
    c.set(dcx, dcy - 1, "W")                      # bright feed-horn nub at the focus
    # a faint e uplink blip rising off the dish (the data link)
    for j, dyb in enumerate((3, 5, 7)):
        if dcy - dyb >= 0:
            c.set(max(0, min(63, dcx + (j % 2))), dcy - dyb, "e")


def stage5_telemetry(c, slab, bx, by, top_y):
    """t5 — CROWNING FEATURE = FULLY EVOLVED outpost. The signature sensor mast maxes into a
    FULL TELEMETRY ARRAY, drawn AFTER the base mast (so it layers onto the SAME crown): the
    anemometer cups brighten to `E` with a wider motion-ghost halo, a new `E` CAMERA-EYE pod
    bolts onto the crown scanning the court, and a swarm of `e` DATA-BLIP pings radiates out
    into the empty sky flanking the mast. Then the rustic outpost is dressed with GOLD premium
    trim — a `q` GOLD PENNANT replacing-over the data flag, and gold caps on the mast's three
    ground anchors. Reads as elite; still the same plank field-station. Gold (`q`) lives ONLY
    here, as the pennant + anchor caps (rustic timber identity preserved)."""
    cr = (bx, top_y)                              # SAME crown source point as the base mast
    # --- brighten the ANEMOMETER crown to bio-luminescent E + a wider spin-ghost halo ---
    arms = [(-3, -1), (3, -1), (0, -3)]
    for ax, ay in arms:
        c.set(cr[0] + ax, cr[1] + ay, "E")        # cups energize to bright bio-glow
        c.set(cr[0] + ax + (1 if ax >= 0 else -1), cr[1] + ay, "E")
    for (gx, gy) in [(cr[0] - 2, cr[1] - 4), (cr[0] + 3, cr[1] - 3), (cr[0] - 4, cr[1] + 1),
                     (cr[0] + 1, cr[1] - 5)]:      # wider whirling motion halo
        if 0 <= gx <= 63 and 0 <= gy <= 63:
            c.set(gx, gy, "e")
    # --- a new CAMERA-EYE pod bolted to the crown, just under the cups, scanning right ---
    eye_y = top_y + 3
    _stamp(c, bx + 1, eye_y, [
        "KKK",
        "KEK",   # bright bio-glow camera iris
        "KKK",
    ])
    c.set(bx + 4, eye_y + 1, "e")                 # a short e scan-beam tick off the eye
    c.set(bx + 5, eye_y + 1, "h")
    # --- DATA-BLIP SWARM: glowing e/E pings radiating into the empty sky flanking the mast
    #     (kept WIDER than the pennant/booms so each reads as a discrete mote). ---
    blips = [(-6, -2), (-8, -6), (-7, -11), (6, -3), (8, -7), (7, -12), (5, 4)]
    for dx, dy in blips:
        sx, sy = bx + dx, top_y + 6 + dy
        if 0 <= sx <= 63 and 0 <= sy <= 63:
            c.set(sx, sy, "E")                    # bright ping core
            if 0 <= sy + 1 <= 63:
                c.set(sx, sy + 1, "e")            # faint trail
    # --- GOLD premium trim (t5 flourish ONLY) ---
    # a GOLD PENNANT flying up-right near the top, over-painted on the base data-pennant
    # (same anchor: the base pennant is at bx+1, top_y+4). Recompute from top_y, don't guess.
    # The base flag is a SOFT o/O triangle that reads near-identical to gold at 64px, so the
    # upgrade has to differ in SILHOUETTE + BRIGHTNESS: a slightly larger swallow-tail flag
    # with a HARD K outline (the base flag has none), a solid q gold field, a bright O hoist
    # streak, and an r shaded lower fold — so it clearly reads as a crisp PREMIUM banner. All
    # points clamped on-canvas (bx≈33 so bx+5≤63). ---
    pen_y = top_y + 4
    c.set(bx, pen_y, "r")                         # pennant tie to the pole (kept)
    # gold flag body: a 4-wide swallow-tail triangle fluttering out to the RIGHT
    flag = [
        "KKKK.",   # hard top edge — the K outline the base pennant lacks
        "qqOK.",   # gold field with a bright O hoist streak
        "qqqOK",   # widest gold band -> swallow-tail point
        "qqOK.",   # gold field, O lower-mid streak
        "rKK..",   # r shaded lower fold + K hem (the flag droops)
    ]
    for j, row in enumerate(flag):
        for i, ch in enumerate(row):
            if ch != "." and 0 <= bx + 1 + i <= 63 and 0 <= pen_y - 1 + j <= 63:
                c.set(bx + 1 + i, pen_y - 1 + j, ch)
    c.set(bx, pen_y - 1, "q"); c.set(bx, pen_y + 1, "q")   # gold finial collar on the staff
    # GOLD CAPS on the signature mast's three ground anchors (recompute from base geometry:
    # sensor_mast used anchors at (bx-9,by-1),(bx+9,by-2),(bx+2,by+4)). A 2px q+O cap each so
    # the gold registers as deliberate premium trim, not a single-pixel speck. ---
    for axp, ayp in [(bx - 9, by - 1), (bx + 9, by - 2), (bx + 2, by + 4)]:
        if 0 <= axp <= 63 and 0 <= ayp <= 63:
            c.set(axp, ayp, "q")                  # gold anchor cap over the o peg
            if 0 <= axp + 1 <= 63:
                c.set(axp + 1, ayp, "q")          # widen the cap (reads as a fitting)
            if 0 <= ayp - 1 <= 63:
                c.set(axp, ayp - 1, "O")          # bright boss on top


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the field station at upgrade `stage` (1..5). Stage 1 is IDENTICAL to the
    shipped base; each higher stage keeps every prior addition and bolts on the next
    (t2 field-kit → t3 drying-rack → t4 weather-tower → t5 telemetry array + gold).
    Painter's order: court slab (foundation) → back wings → corner lantern → the ground/
    roof/annex stage adds → the guyed eco-sensor mast signature LAST (so nothing occludes
    it), then the t5 telemetry array layered onto the SAME mast crown."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    slab = court_slab(c)
    lw = left_wing(c, slab)
    rw = right_wing(c, slab)
    corner_lantern(c, lw, rw)

    # --- CUMULATIVE GROUND/ROOF/ANNEX STAGE ADDS (drawn before the mast so the hero
    #     mast stays in front of them; the second tower is placed to the side) --------
    if stage >= 2:
        stage2_fieldkit(c, slab, lw, rw)
    if stage >= 3:
        stage3_dryrack(c, slab, rw)

    # --- SIGNATURE: the guyed eco-sensor mast (drawn after the wings/annex so it reads
    #     in front in the open court). Returns its source points for the upgrade rigs. ---
    bx, by, top_y = sensor_mast(c, slab)

    if stage >= 4:
        stage4_weathertower(c, slab, bx, by, top_y)
    if stage >= 5:
        stage5_telemetry(c, slab, bx, by, top_y)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/biocore"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "field-station"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG +
    scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must keep
    matching the shipped field-station.png, so it does NOT overwrite the base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": BIO, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"biocore_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"biocore_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
