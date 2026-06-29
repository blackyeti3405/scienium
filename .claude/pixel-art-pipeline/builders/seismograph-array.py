#!/usr/bin/env python3
"""
Seismograph Array — TerraBase economy building (BESPOKE FORM · STANDARD role).

The LOWEST, MOST GROUNDED mass of the set: a squat, heavy BUNKERED BLOCKHOUSE
half-sunk into layered rock strata, with a thick FLAT PARAPET roof (a K-edged
raised lip around a flat L deck) — NOT a peaked/tarp roof and NOT the gateway
cube. Reads as a hardened seismic monitoring station bolted to bedrock:

  • Main bunker: one LOW WIDE Box — M/D hardened concrete — whose lower third is
    drawn as LAYERED ROCK STRATA (horizontal d/D/r bands stepping the base, as if
    half-buried). A thick L/M flat parapet caps the roof.
  • Strata berm: a low d/r strata-banded berm rises against the back-left base in
    ochre/rust rock layers so the bunker looks half-sunk.
  • Opening side = LEFT (lit): the hero is a heavy K-framed armored DOOR + a narrow
    ribbon WINDOW on the LIT-LEFT concrete face, with a c sensor glass and an o
    "EPICENTER" placard plate. The SHADED RIGHT face stays plainer — a blank
    concrete wall with one d vent grille and a strata band.
  • Sensor wells: 2–3 small K-rimmed circular geophone caps flush in the front roof
    deck, each with a faint c glow dot. A stubby D antenna post with a c blink at
    the back-right roof corner.

Signature (one-of-one): on the flat parapet roof a rotating paper-DRUM SEISMOGRAPH
(an upright cylinder, W/L paper wrap, K frame) scrawls a jagged mineral-teal g/G
SEISMIC TRACE wrapping the drum under a thin D/K stylus arm, its live tip glowing
c/h — and beside it a glowing set of concentric c/g SHOCK-RIPPLES radiates from a
small O/r EPICENTER marker, the outermost PREDICTED ring lit brighter O (next
jolt). A tiny o/O magnitude reading climbs on a K placard at the drum base; the
whole roof carries a soft c seismic underglow. No mechanical ink-drum / ground-
ripple motif exists elsewhere in the catalog (Volt's bench is a CRT oscilloscope).

Composed from art/isobuild.{Box,cylinder} — NO iso.draw_cube / base_windows.
Draw order: contact shadow -> strata berm (back) -> bunker Box -> strata base
bands + lit-left opening + shaded-right vent -> parapet lip -> roof sensor wells +
antenna -> the signature (drum + trace + shock-ripple) on top.
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

# Base TerraBase palette (shared keys) + the EVOLVED-accent keys reserved for the
# upgrade stages only (chars NOT used by the base palette, so they appear in NO
# stage-1 sprite and seismograph-array.png stays byte-identical). These four exact
# keys+hexes are the lab-wide terrabase evolved accents:
#   b  deep basalt/bedrock  — matured warm structure tone for the t3 vault + t4 mast
#   e  energized mineral-seismic glow (mid)    E  energized glow (bright) — t4/t5 power
#   q  premium survey gold  — t5 flourish ONLY (NOT a whole-building recolor)
TERRA = {"K": "#20190f", "W": "#efe6cf", "L": "#d6c8a0", "M": "#b09a6e", "D": "#7e6c47", "d": "#54462c",
         "h": "#d6f2ea", "c": "#a4e2d4", "g": "#34b6a2", "G": "#1d8474",
         "o": "#e0a850", "O": "#ffce80", "r": "#9a5e1e",
         "b": "#3a3326", "e": "#5fe0c4", "E": "#c4fff0", "q": "#f3c63a"}


# ── geometry: a LOW WIDE bunker (lower + wider than the gateway cube) ──────────
# Gateway cube = Box(top=(32,9), wx=11, wy=11, h=20). Ours is squat + broad.
BUNKER = Box(top=(31, 20), wx=12, wy=10, h=12)


# ── 1. contact shadow — a flat iso ground-pool so the bunker reads grounded ────
def contact_shadow(c):
    scx, scy = 31, 49
    for x in range(scx - 22, scx + 22):
        for y in range(scy - 3, scy + 4):
            ex = (x - scx) / 22.0
            ey = (y - scy) / 3.4
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")


# ── 2. STRATA BERM — ochre/rust rock layers banked against the back-left base ──
def strata_berm(c, b):
    """A low d/r/D strata-banded berm rising against the bunker's back-LEFT base so
    the blockhouse looks half-sunk into bedrock. Drawn BEFORE the bunker so the
    bunker's left wall overlaps its front edge (building sits IN the berm)."""
    # back-left corner of the bunker footprint, in screen space
    lx, ly = b.r_left            # left roof corner
    wlx, wly = b.w_left          # left wall foot
    # the berm is a compact stepped rock OUTCROP RISING against the back-left wall —
    # taller than it is wide so the ground reads as climbing up the bunker's back
    # corner (half-sunk), NOT a flat tongue sprawling forward. Bands climb the wall
    # from the foot, each higher band tucked tighter under the wall (shorter toe).
    bands = [
        (0, "d", 5), (1, "r", 5), (2, "D", 4),
        (3, "r", 4), (4, "d", 3), (5, "r", 3),
        (6, "D", 2), (7, "d", 2), (8, "r", 1),
    ]
    base_y = int(wly) + 1
    for row, ch, span in bands:
        y = base_y - row
        x1 = int(lx) + 1 - (row // 3)    # inner edge stays tucked under the wall
        x0 = x1 - span                   # toe pulled in tight (no forward tongue)
        if x0 >= x1:
            continue
        for x in range(x0, x1):
            c.set(x, y, ch)
        c.set(x0, y, "K")                # K seam at the band toe (layered-rock read)


# ── 3. the BUNKER body — low wide concrete block, strata base, parapet roof ────
def bunker(c, b):
    """Draw the squat concrete Box, then over-paint its lower third as horizontal
    rock-strata bands (d/D/r) on BOTH visible walls so it reads half-buried."""
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # ── STRATA on the lower third of both walls (horizontal banded rock) ──
    # left (lit) face: bands grade M(top concrete) -> D -> r -> d(buried) downward
    strata = [
        (b.h - 4.2, "D"), (b.h - 3.2, "r"), (b.h - 2.2, "D"),
        (b.h - 1.2, "d"), (b.h - 0.3, "d"),
    ]
    for v, ch in strata:
        c.line(b.left_pt(0.02, v), b.left_pt(0.98, v), ch)
    # right (shaded) face: same banding, one shade darker
    strata_r = [
        (b.h - 4.2, "d"), (b.h - 3.2, "r"), (b.h - 2.2, "d"),
        (b.h - 1.2, "K"), (b.h - 0.3, "d"),
    ]
    for v, ch in strata_r:
        c.line(b.right_pt(0.02, v), b.right_pt(0.98, v), ch)
    # a faint K seam where concrete meets strata (the buried-line) across both faces
    c.line(b.left_pt(0.0, b.h - 4.8), b.left_pt(1.0, b.h - 4.8), "K")
    c.line(b.right_pt(0.0, b.h - 4.8), b.right_pt(1.0, b.h - 4.8), "K")
    # a few rust/dark mottle pixels in the strata for grit
    for (face, u, v, ch) in [("left", 0.3, b.h - 3.5, "r"), ("left", 0.7, b.h - 2.5, "d"),
                             ("right", 0.4, b.h - 3.5, "r"), ("right", 0.7, b.h - 2.5, "K")]:
        pt = b.left_pt if face == "left" else b.right_pt
        p = pt(u, v)
        c.set(int(round(p[0])), int(round(p[1])), ch)


# ── 4. PARAPET roof — a flat L deck inside a 2px raised K-edged L/M lip ─────────
def parapet(c, b):
    """A thick flat parapet: re-lay the roof diamond as a flat L deck, then raise a
    2px L/M lip edged in K around its rim (NOT a pitched roof). Returns an inset
    roof-pt helper that maps onto the recessed deck for placing rooftop features."""
    # bright flat deck (re-assert L over the draw() shading so it reads flat)
    c.fill_poly([b.r_top, b.r_right, b.r_front, b.r_left], "L")
    # lit back-left deck triangle a touch brighter
    c.fill_poly([b.r_top, b.r_left, b.r_front], "L")
    c.line(b.r_top, b.r_left, "W")          # bright back-edge highlight
    c.line(b.r_top, b.r_right, "W")

    # raised parapet LIP: walk the four roof edges, lift a 2px wall up (-y) with a
    # lit M/L outer band and a K cap, so the deck sits recessed inside a thick rim.
    rim = [(b.r_left, b.r_front, "M"),   # front-left rim (lit)
           (b.r_front, b.r_right, "D"),  # front-right rim (shaded)
           (b.r_left, b.r_top, "L"),     # back-left rim (lit, bright)
           (b.r_top, b.r_right, "M")]    # back-right rim
    for a, bb, side in rim:
        ax, ay = a; bx, by = bb
        steps = max(abs(int(bx - ax)), abs(int(by - ay))) + 1
        for s in range(steps + 1):
            t = s / steps
            x = ax + t * (bx - ax)
            y = ay + t * (by - ay)
            c.set(x, y - 1, side)         # lip outer band
            c.set(x, y - 2, "K")          # K cap on top of the lip
    # re-stroke the outer K silhouette of the lifted lip corners
    for corner in (b.r_left, b.r_front, b.r_right, b.r_top):
        c.set(corner[0], corner[1] - 2, "K")

    # inset deck helper: pulls features ~1.5px in from each edge onto the flat deck
    def deck_pt(u, v):
        uu = 0.14 + u * 0.72
        vv = 0.14 + v * 0.72
        return b.roof_pt(uu, vv)
    return deck_pt


# ── 5. roof SENSOR WELLS + antenna post (buried-geophone array) ────────────────
def roof_kit(c, b, deck_pt):
    """2–3 K-rimmed circular sensor caps flush in the FRONT roof deck (each with a
    faint c glow dot), and a stubby D antenna post with a c blink at the back-right
    deck corner. Kept toward the front so the signature can own the back/centre."""
    # sensor wells along the front of the deck
    for (u, v) in [(0.30, 0.78), (0.58, 0.86), (0.16, 0.62)]:
        p = deck_pt(u, v)
        px, py = int(round(p[0])), int(round(p[1]))
        # a tiny K-rimmed disc with a c glow centre
        for (dx, dy) in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            c.set(px + dx, py + dy, "K")
        c.set(px, py, "c")               # glowing geophone eye
        c.set(px - 1, py - 1, "d")       # shade lip

    # stubby antenna post at the back-right deck corner with a c blink
    ap = deck_pt(0.92, 0.18)
    ax, ay = int(round(ap[0])), int(round(ap[1]))
    c.set(ax, ay, "K")
    c.set(ax, ay - 1, "D")
    c.set(ax, ay - 2, "D")
    c.set(ax, ay - 3, "M")
    c.set(ax, ay - 4, "c")               # blink lamp
    c.set(ax - 1, ay - 4, "h")           # blink halo


# ── 6. LIT-LEFT opening — armored door + ribbon window + EPICENTER placard ─────
def left_opening(c, b):
    """The hero entrance on the LIT-LEFT concrete face: a heavy 2px-K-framed armored
    DOOR (the DOMINANT element on this face), a narrow c ribbon WINDOW above it, an
    o handle/bolt, and a small o 'EPICENTER' placard plate. Sits on the un-buried
    upper wall, above the strata band (strata begins ~v = b.h - 4.8)."""
    pt = b.left_pt

    # --- armored DOOR: a HIGH-CONTRAST recessed entrance so it punches out of the
    # M concrete wall instead of blending in. A deep K/d recess (the dark doorway)
    # framed by a bright L/W lit jamb on the upper-left and a 2px K frame all round,
    # with a steel-leaf inside. Sits center-left, foot landing on the strata line.
    du0, du1, dv0, dv1 = 0.34, 0.60, 1.6, b.h - 4.8     # foot lands ON the strata line
    umid = (du0 + du1) / 2
    # bright lit JAMB highlight just outside the frame on the lit (left/top) sides so
    # the doorway reads as cut INTO the wall (raised reveal catching the left light)
    c.line(pt(du0 - 0.05, dv0 - 0.2), pt(du0 - 0.05, dv1), "W")
    c.line(pt(du0 - 0.05, dv0 - 0.2), pt(du1 + 0.05, dv0 - 0.2), "L")
    # heavy 2px K frame block
    c.fill_poly([pt(du0, dv0), pt(du1, dv0), pt(du1, dv1), pt(du0, dv1)], "K")
    # recessed DARK doorway interior (deep shadow = a real opening, high contrast)
    iu0, iu1, iv0, iv1 = du0 + 0.05, du1 - 0.05, dv0 + 0.8, dv1 - 0.2
    c.fill_poly([pt(iu0, iv0), pt(iu1, iv0), pt(iu1, iv1), pt(iu0, iv1)], "d")
    # steel leaf standing in the doorway: a D panel filling the right two-thirds, the
    # left third left as d shadow (the door ajar / its dark reveal)
    c.fill_poly([pt(umid - 0.02, iv0), pt(iu1, iv0), pt(iu1, iv1), pt(umid - 0.02, iv1)], "D")
    c.line(pt(umid - 0.02, iv0 + 0.3), pt(umid - 0.02, iv1 - 0.2), "K")   # leaf edge seam
    c.line(pt(umid + 0.02, iv0 + 0.4), pt(iu1 - 0.04, iv0 + 0.4), "M")    # lit top rail of leaf
    # an O handle/bolt on the leaf, mid-height (clear entry hardware, pops off D)
    hp = pt(iu1 - 0.10, (iv0 + iv1) / 2)
    hx, hy = int(round(hp[0])), int(round(hp[1]))
    c.set(hx, hy, "O"); c.set(hx, hy + 1, "o")

    # --- narrow ribbon WINDOW directly ABOVE the door lintel: a CRISP single-row
    # horizontal c glass strip framed by a K band above and below (one clean ribbon,
    # not scattered sensor dots). A bright h glint on the lit-left end, a G shaded end.
    rwu0, rwu1, rwv = du0 + 0.02, du1 - 0.02, dv0 - 0.6     # one slit row above lintel
    c.line(pt(rwu0, rwv - 0.5), pt(rwu1, rwv - 0.5), "K")   # K top frame band
    c.line(pt(rwu0, rwv),       pt(rwu1, rwv),       "c")   # the c glass ribbon (1px tall)
    c.line(pt(rwu0, rwv + 0.5), pt(rwu1, rwv + 0.5), "K")   # K bottom frame band
    # K end caps so the strip is fully boxed, then a lit h glint / G shaded tip
    glp = pt(rwu0, rwv); grp = pt(rwu1, rwv)
    c.set(int(round(glp[0])) - 1, int(round(glp[1])), "K")  # left K cap
    c.set(int(round(grp[0])) + 1, int(round(grp[1])), "K")  # right K cap
    c.set(int(round(glp[0])),     int(round(glp[1])), "h")  # lit-left glint
    c.set(int(round(grp[0])),     int(round(grp[1])), "G")  # shaded-right end

    # --- o EPICENTER placard plate to the FRONT (between door and front corner) ---
    pp = pt(0.72, 2.6)
    ppx, ppy = int(round(pp[0])), int(round(pp[1]))
    for dx in range(0, 4):
        c.set(ppx + dx, ppy - 1, "K")    # K top edge
        c.set(ppx + dx, ppy, "o")
        c.set(ppx + dx, ppy + 1, "O")    # bright placard glow
        c.set(ppx + dx, ppy + 2, "K")    # K underline
    c.set(ppx - 1, ppy, "K"); c.set(ppx + 4, ppy, "K")
    c.set(ppx - 1, ppy + 1, "K"); c.set(ppx + 4, ppy + 1, "K")


# ── 7. SHADED-RIGHT face — plainer: a d vent grille + one strata band ──────────
def right_detail(c, b):
    """Keep the SHADED RIGHT face plain per the blueprint: a blank concrete wall
    with one recessed d vent grille (and the strata band already painted below)."""
    pt = b.right_pt
    vu0, vu1, vv0, vv1 = 0.40, 0.72, 3.0, 6.4
    c.fill_poly([pt(vu0, vv0), pt(vu1, vv0), pt(vu1, vv1), pt(vu0, vv1)], "d")   # recessed panel
    for vv in (3.6, 4.4, 5.2, 6.0):                                              # louvre slats
        c.line(pt(vu0 + 0.02, vv), pt(vu1 - 0.02, vv), "K")
    for a, bb in [(pt(vu0, vv0), pt(vu1, vv0)), (pt(vu0, vv1), pt(vu1, vv1)),
                  (pt(vu0, vv0), pt(vu0, vv1)), (pt(vu1, vv0), pt(vu1, vv1))]:
        c.line(a, bb, "K")
    c.line(pt(vu0 + 0.02, 3.2), pt(vu1 - 0.02, 3.2), "D")                        # faint lit top


# ── 8. SIGNATURE part A — soft c seismic underglow over the deck ───────────────
def underglow(c, b, deck_pt):
    """A soft c seismic underglow washing the back/centre of the deck where the
    signature stands — a subtle mineral-teal halo, not a hard fill."""
    for (u, v) in [(0.40, 0.42), (0.52, 0.40), (0.46, 0.52), (0.34, 0.46),
                   (0.60, 0.48), (0.42, 0.34)]:
        p = deck_pt(u, v)
        px, py = int(round(p[0])), int(round(p[1]))
        if c.px[py][px] == "L":
            c.set(px, py, "c")


# ── 9. SIGNATURE part B — the rotating paper-DRUM seismograph + trace + stylus ──
def ink_drum(c, b, deck_pt):
    """An upright ROTATING PAPER DRUM on the deck, built as a real ROUNDED CYLINDER:
    a curved elliptical top cap (K rim + W upper-left glint), vertical SIDE-WRAP
    paper shading (W lit-left third -> L mid -> M/D shaded-right third) keyed to the
    cylinder's column heights so the surface bulges round, a faint d rotation seam,
    and a K mounting frame on legs. A jagged g/G mineral-teal seismic TRACE WRAPS the
    curved paper (its band bows with the cylinder), drawn by a thin D/M stylus arm on
    a K pivot post; the live tip glows c/h. A tiny o/O magnitude reading climbs on a
    K placard at the base. NOT a flat panel / CRT — a round physical chart recorder."""
    # drum centre on the back-left of the deck; lift it well above the deck so it
    # stands proud as a clear rooftop instrument
    dp = deck_pt(0.32, 0.30)
    dcx, dcy = round(dp[0]), round(dp[1]) - 11
    rx, ry, dh = 6, 3, 11
    base_y = dcy + dh

    # column-height map: how far the elliptical top cap dips at each x (so the wrap
    # shading + trace follow the round surface, not a flat rectangle).
    def cap_dip(col):
        t = 1 - (col / rx) ** 2
        return ry * (t ** 0.5) if t >= 0 else None

    # ── 1. paper SIDE-WRAP: fill every column from its curved cap edge to the base.
    # bright W on the lit-left edge, L across the mid, M then D on the shaded-right
    # edge — a smooth curved gradient so the cylinder bulges round toward the viewer.
    # Stronger contrast (a true W..D ramp) so the side reads as a CURVED drum wall.
    for col in range(-rx, rx + 1):
        dip = cap_dip(col)
        if dip is None:
            continue
        frac = (col + rx) / (2 * rx)          # 0 at far-left .. 1 at far-right
        if   frac < 0.16: ch = "W"            # bright lit-left rim glint
        elif frac < 0.34: ch = "L"
        elif frac < 0.58: ch = "L"            # broad mid paper
        elif frac < 0.74: ch = "M"
        elif frac < 0.90: ch = "D"
        else:             ch = "d"            # darkest shaded-right rim
        y_top = int(round(dcy + dip))         # where this column's wall begins (cap edge)
        for y in range(y_top, base_y + 1):
            c.set(dcx + col, y, ch)

    # ── 2. curved TOP CAP: an elliptical paper disc, brighter on the lit-left arc ──
    for col in range(-rx, rx + 1):
        dip = cap_dip(col)
        if dip is None:
            continue
        frac = (col + rx) / (2 * rx)
        cap_ch = "W" if frac < 0.45 else ("L" if frac < 0.75 else "M")
        for y in range(int(round(dcy - dip)), int(round(dcy + dip)) + 1):
            c.set(dcx + col, y, cap_ch)
    # W glint on the upper-left of the cap (the round-paper highlight)
    for (gx, gy) in [(-3, -1), (-2, -2), (-1, -2), (-2, -1)]:
        c.set(dcx + gx, dcy + gy, "W")

    # ── 3. crisp K silhouette: top-cap ellipse rim, both vertical sides, base arc ──
    for a in range(0, 360, 5):
        x = dcx + rx * math.cos(math.radians(a))
        y = dcy + ry * math.sin(math.radians(a))
        c.set(x, y, "K")
    c.line((dcx - rx, dcy), (dcx - rx, base_y), "K")
    c.line((dcx + rx, dcy), (dcx + rx, base_y), "K")
    for a in range(0, 181, 5):
        x = dcx + rx * math.cos(math.radians(a))
        y = base_y + ry * math.sin(math.radians(a))
        c.set(x, y, "K")

    # ── 4. faint d ROTATION SEAM curving down the lit face (shows the drum spins) ──
    seam_col = -2
    for y in range(int(round(dcy + cap_dip(seam_col))) + 1, base_y):
        c.set(dcx + seam_col, y, "d")

    # ── 5. K MOUNTING FRAME: two leg posts + a foot bar cradling the drum ──
    c.set(dcx - rx, base_y + 1, "K"); c.set(dcx - rx, base_y + 2, "K")
    c.set(dcx + rx, base_y + 1, "K"); c.set(dcx + rx, base_y + 2, "K")
    c.line((dcx - rx, base_y + 2), (dcx + rx, base_y + 2), "K")
    c.set(dcx - rx, base_y + 3, "d"); c.set(dcx + rx, base_y + 3, "d")  # foot shade

    # ── 6. SEISMIC TRACE WRAPPING the curved paper: one continuous jagged band that
    # HUGS the drum's mid-wrap. Each column's baseline sits a fixed fraction down the
    # wall (so it tracks the round side), and the whole band BOWS UP with the cap dip
    # near the lit centre and dips at the rims — so it visibly arcs across the round
    # face, NOT a flat waveform on a screen. A bold g line, brighter live tip.
    amp = [0, 1, -1, 2, -2, 3, -1, 1, -2, 2, 0, -1, 1]
    pts = []
    cols = list(range(-rx + 1, rx))
    for k, col in enumerate(cols):
        dip = cap_dip(col)
        if dip is None:
            continue
        wobble = amp[k % len(amp)]
        cap_top = dcy + dip                       # this column's cap edge (top of wall)
        # baseline ~52% down THIS column's wall (tracks the curve), plus a gentle bow:
        # +1 of upward arc at the lit centre tapering to the rims via the cap dip.
        base_line = cap_top + (base_y - cap_top) * 0.50
        bow = (dip / ry) * 1.6                     # bow strongest where the cap is tallest
        yy = int(round(base_line - bow + wobble))
        pts.append((dcx + col, yy))
    # draw the continuous jagged line, then re-stamp nodes so it stays crisp + bold
    for k in range(1, len(pts)):
        c.line(pts[k - 1], pts[k], "g")
    for idx, (px, py) in enumerate(pts):
        c.set(px, py, "G" if idx % 3 == 0 else "g")
    tip = pts[-1]
    c.set(tip[0], tip[1], "h")              # live glowing pen tip
    c.set(tip[0] - 1, tip[1], "c")

    # ── 7. STYLUS ARM on a K PIVOT POST: a thin diagonal pen arm reaching from a post
    # at the right of the drum down onto the live tip — the mechanical-recorder read.
    post_x = dcx + rx + 2
    post_top = dcy - 2
    for y in range(post_top, base_y - 1):   # K pivot post standing beside the drum
        c.set(post_x, y, "K")
    c.set(post_x - 1, post_top, "M")        # lit pivot knob
    c.set(post_x + 1, post_top + 1, "d")
    # arm swings down-left from the pivot knob across to the stylus nib at the tip
    pivot = (post_x, post_top + 2)
    nib = (tip[0] + 1, tip[1] - 1)
    c.line(pivot, nib, "K")                 # K underside of the arm
    c.line((pivot[0] - 1, pivot[1] - 1), (nib[0], nib[1] - 1), "M")  # lit top edge
    c.set(nib[0], nib[1], "K")              # stylus nib pressing the paper
    c.set(tip[0], tip[1], "h")              # keep the glowing tip on top
    c.set(tip[0] - 1, tip[1], "c")

    # ── 8. magnitude READING climbing on a K placard at the drum base ──
    plx, ply = dcx - rx - 3, base_y - 3
    for dy in range(0, 5):                  # K placard backing
        c.set(plx, ply + dy, "K")
        c.set(plx + 1, ply + dy, "K")
    c.set(plx + 1, ply, "O")                # bright top reading climbing
    c.set(plx,     ply, "O")                # extra bright digit-tick (the climbing reading)
    c.set(plx + 1, ply + 1, "o")
    c.set(plx + 1, ply + 2, "o")
    return (dcx, dcy, base_y)


# ── 10. SIGNATURE part C — concentric SHOCK-RIPPLES + predicted next jolt ───────
def shock_ripple(c, b, deck_pt):
    """Beside the drum on the deck, 3 concentric c/g rings radiate from a small O/r
    EPICENTER marker, fading outward; the OUTERMOST PREDICTED ring is lit brighter
    O (the prediction — next jolt). Iso-flattened (2:1) so the rings lie on the
    deck plane, not standing up."""
    ep = deck_pt(0.68, 0.64)
    ecx, ecy = ep[0], ep[1]

    # concentric rings, inner->outer; last is the bright predicted jolt. The reviewer
    # passed this read as-is ("excellent ... keep as-is") — kept intact, only nudged
    # back from the deck edge so the larger door doesn't crowd it.
    rings = [
        (3.0, "c"),    # inner shock ring (freshest)
        (5.0, "g"),    # mid ring (fading)
        (7.0, "O"),    # outer PREDICTED ring — next jolt, lit brightest
    ]
    for rr, ch in rings:
        for a in range(0, 360, 12):
            x = ecx + rr * math.cos(math.radians(a))
            y = ecy + (rr * 0.5) * math.sin(math.radians(a))   # 2:1 iso flatten
            c.set(x, y, ch)
    # a couple of brighter h accents on the inner ring (live wavefront)
    for a in (200, 260, 320):
        x = ecx + 3.0 * math.cos(math.radians(a))
        y = ecy + 1.5 * math.sin(math.radians(a))
        c.set(x, y, "h")
    # extra O sparkle on the predicted outer ring's leading edge (the next jolt)
    for a in (150, 180, 210):
        x = ecx + 7.0 * math.cos(math.radians(a))
        y = ecy + 3.5 * math.sin(math.radians(a))
        c.set(x, y, "O")

    # EPICENTER marker at the centre: a small O/r cross-hit
    c.set(int(round(ecx)), int(round(ecy)), "O")
    c.set(int(round(ecx - 1)), int(round(ecy)), "o")
    c.set(int(round(ecx + 1)), int(round(ecy)), "o")
    c.set(int(round(ecx)), int(round(ecy - 1)), "r")
    c.set(int(round(ecx)), int(round(ecy + 1)), "r")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS seismic-
# monitoring structure onto the prior form — never restarts, never recolors the
# whole bunker. Theme: a hardened seismic station grows into a fully instrumented
# strong-motion observatory. Colours mature stage by stage; gold (q) is a t5
# flourish only. Every add is anchored to a base part (parapet deck / rim / wall /
# back-right corner) and clamped on-canvas, and NONE collide with the signature
# (the paper-drum back-left + the shock-ripple disc front-right).
#
#   t2  small functional add : a 2nd RECORDING-DRUM + ink-pen beside the signature
#                              + a brighter O event-LED on the parapet rim
#   t3  structural add        : a half-sunk `b` concrete SEISMOMETER VAULT annex off
#                              the shaded-right base (louver vent + g status slit)
#   t4  major add             : a tall STRONG-MOTION SENSOR MAST off the back-right
#                              roof corner (stacked glowing e accel-pods + guy-wires
#                              + a swinging e pendulum-bob)
#   t5  crowning feature      : the roof disc ERUPTS into a live SEISMIC WAVEFIELD
#                              (concentric E shock-rings + E epicentre flash +
#                              jagged e trace) + GOLD corner bosses + ridge band
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_second_drum(c, b, deck_pt, drum_anchor):
    """t2 — SMALL FUNCTIONAL ADD: a SECOND, smaller recording-drum logging more traces,
    planted in the CLEAR back-centre deck pocket BESIDE the signature shock-ripple disc
    (between the hero drum on the left and the antenna on the back-right, ABOVE the disc
    rings) so it pairs with the signature without touching the hero drum or occluding
    the disc. A short W/L paper drum on a K mount with an `o` ink-PEN nib scratching a
    tiny `c` trace, plus one brighter `O` EVENT-LED winking on the lit back-left parapet
    rim. On-theme (more seismographs being logged), modest, base palette + one brightened
    O. Anchored at a fixed offset from the hero drum (`drum_anchor`) into the open pocket,
    never a hardcoded screen guess."""
    dcx, dcy, dbase = drum_anchor      # hero drum centre-top (27,20) + base_y
    # seat the small drum in the OPEN back-centre pocket: right of the hero drum and
    # above the shock-ripple disc (the disc rings begin ~5px below this). A small drum
    # so it sits clear in the tight pocket and clearly reads as the lesser logger.
    sx = dcx + 13                      # into the clear lit deck right of the hero drum
    scy = dcy + 5                      # high on the back deck, above the disc rings
    srx, sry, sdh = 2, 1, 5            # a SMALL drum (hero is rx=6,h=11)
    sbase = scy + sdh
    # paper side-wrap: lit-left W -> L -> shaded-right M/D, keyed to a short can
    for col in range(-srx, srx + 1):
        frac = (col + srx) / (2 * srx)
        if   frac < 0.25: ch = "W"
        elif frac < 0.55: ch = "L"
        elif frac < 0.80: ch = "M"
        else:             ch = "D"
        for y in range(scy, sbase + 1):
            c.set(sx + col, y, ch)
    # elliptical top cap
    for col in range(-srx, srx + 1):
        t = 1 - (col / srx) ** 2
        if t < 0:
            continue
        dip = sry * (t ** 0.5)
        frac = (col + srx) / (2 * srx)
        cap = "W" if frac < 0.5 else "L"
        for y in range(int(round(scy - dip)), int(round(scy + dip)) + 1):
            c.set(sx + col, y, cap)
    # crisp K silhouette: top rim ellipse + sides + base arc
    for a in range(0, 360, 10):
        c.set(sx + srx * math.cos(math.radians(a)), scy + sry * math.sin(math.radians(a)), "K")
    c.line((sx - srx, scy), (sx - srx, sbase), "K")
    c.line((sx + srx, scy), (sx + srx, sbase), "K")
    for a in range(0, 181, 10):
        c.set(sx + srx * math.cos(math.radians(a)), sbase + sry * math.sin(math.radians(a)), "K")
    # a faint c trace already scratched around the small drum's wrap (more logging)
    for col, dy in [(-1, 2), (0, 3), (1, 2)]:
        c.set(sx + col, scy + dy, "c")
    # K mounting foot bar under the small drum
    c.set(sx - srx, sbase + 1, "K"); c.set(sx + srx, sbase + 1, "K")
    c.line((sx - srx, sbase + 1), (sx + srx, sbase + 1), "K")
    # short K ink-PEN arm on a pivot reaching in from the LEFT onto the drum + o nib
    pen_post_x = sx - srx - 1
    pen_top = scy + 1
    c.set(pen_post_x, pen_top, "K")
    c.set(pen_post_x, pen_top + 1, "K")
    c.line((pen_post_x, pen_top + 1), (sx - srx + 1, scy + 2), "K")   # pen arm
    c.set(sx - srx + 1, scy + 2, "o")                                 # o ink-pen nib
    c.set(sx - srx, scy + 2, "O")                                     # bright wet-ink tip

    # one brighter O EVENT-LED winking on the lit BACK-LEFT parapet rim (a logged
    # event), seated on the raised lip band where it reads against the bright rim,
    # clear of all deck instruments.
    led = b.roof_pt(0.16, 0.62)        # back-left rim band, lit + uncluttered
    lx, ly = int(round(led[0])), int(round(led[1])) - 2   # up on the raised lip cap
    c.set(lx, ly, "O")
    c.set(lx, ly - 1, "o")                                 # tiny halo above the LED


def stage3_vault(c, b):
    """t3 — STRUCTURAL ADD: a half-sunk concrete SEISMOMETER VAULT annex stepped off
    the SHADED-RIGHT base of the bunker — a low `b` basalt instrument bunker bolted to
    the right wall, stepped FORWARD-RIGHT so its lit-LEFT face + flat cap read clearly,
    its own lower third banded as buried strata, carrying a slatted Box.louver vent on
    the lit face + a glowing `g` status slit on the shaded face (houses the
    seismometers). A real new structural mass (its own Box), not a prop. Drawn AFTER
    the bunker so it reads as a smaller block half-sunk into the same bedrock, abutting
    the bunker's right wall."""
    # seat the annex IN FRONT of the bunker's right (shaded) wall, stepped out to the
    # RIGHT + FORWARD and lower, so its cap sits below the parapet and its full lit
    # face shows in the open front-right ground (a clearly bolted-on sunk vault).
    rr = b.r_right                       # right roof corner (55,32)
    # back-top corner: forward of the right wall (toward the front apex) + lower, so
    # the annex tucks against the lower-front third of the bunker's right wall.
    ax = int(round(rr[0])) - 11          # step in toward the front apex (=44)
    ay = int(round(rr[1])) + 12          # drop the cap low against the right wall (=44)
    vault = Box(top=(ax, ay), wx=5, wy=4, h=6)
    # body: deep basalt b walls, a flat M cap (concrete), K outline — a hardened vault
    vault.draw(c, roof="M", lwall="b", rwall="b", roof_hi="L", outline="K")
    # re-lay the cap a touch brighter on the lit back-left so it reads as a flat slab
    c.fill_poly([vault.r_top, vault.r_left, vault.r_front], "L")
    c.line(vault.r_top, vault.r_left, "W")
    # buried STRATA banding on the annex's lower third (matches the half-sunk bunker)
    for v, ch in [(vault.h - 2.4, "r"), (vault.h - 1.5, "d"), (vault.h - 0.5, "d")]:
        c.line(vault.left_pt(0.04, v), vault.left_pt(0.96, v), ch)
        c.line(vault.right_pt(0.04, v), vault.right_pt(0.96, v), ch)
    # a low strata toe banked against the annex front foot so it sits IN the rock
    fy = int(round(vault.w_front[1]))
    for row, ch, span in [(0, "d", 3), (1, "r", 2), (2, "d", 1)]:
        xc = int(round(vault.w_front[0]))
        for dx in range(-span, span + 1):
            c.set(xc + dx, fy + 1 - row, ch)
        c.set(xc - span, fy + 1 - row, "K")
    # slatted LOUVER VENT on the annex's lit-LEFT face (the seismometer breather)
    vault.louver(c, "left", 0.20, 0.78, 1.4, 4.2, body="d", slat="K", edge="M", frame="K")
    # a glowing g STATUS SLIT on the shaded-RIGHT face (instruments live below)
    s0 = vault.right_pt(0.28, 1.8)
    s1 = vault.right_pt(0.80, 1.8)
    c.line((s0[0], s0[1] - 0.5), (s1[0], s1[1] - 0.5), "K")   # K hood above the slit
    c.line(s0, s1, "g")                                        # the g status glow slit
    c.line((s0[0], s0[1] + 0.5), (s1[0], s1[1] + 0.5), "K")   # K sill below
    c.set(int(round(s0[0])), int(round(s0[1])), "G")          # shaded end
    c.set(int(round(s1[0])), int(round(s1[1])), "h")          # lit glint end
    # a stout K cable conduit linking the annex cap up to the bunker right wall foot
    cc0 = vault.r_top
    c.line((int(round(cc0[0])), int(round(cc0[1])) - 1),
           (int(round(b.w_right[0])) - 2, int(round(b.w_right[1])) - 3), "K")


def _mast_geom(b, deck_pt):
    """Shared strong-motion-mast geometry so t5's gold crown band recomputes from the
    SAME source as t4 (never a hardcoded second guess). Returns the mast foot on the
    back-right roof corner and the clamped mast top."""
    fp = deck_pt(0.86, 0.24)             # back-right roof corner (by the antenna)
    fx, fy = int(round(fp[0])), int(round(fp[1]))
    top_y = 5                            # tall mast; top kept on-canvas (>=0)
    return fx, fy, top_y


def stage4_mast(c, b, deck_pt):
    """t4 — MAJOR ADD: a tall STRONG-MOTION SENSOR MAST rising straight off the
    BACK-RIGHT roof corner (beside the base antenna), carrying a vertical stack of
    glowing `e` ACCELEROMETER PODS up its shaft, braced by two guy-wires down to the
    deck, and SWINGING a glowing `e` PENDULUM-BOB on a short arm below the pods. The
    prominent new vertical mass: 'this station now records strong ground motion'.
    A mast/pods (NOT a derrick — distinct from sampling-station). Palette matures:
    deep basalt `b` mast + energized mineral `e/E` glow on the pods/bob. Fully on-
    canvas, rises clear above the deck, and stands to the RIGHT/BACK of the centre
    signature so it never occludes the drum or the shock-ripple disc."""
    fx, fy, top_y = _mast_geom(b, deck_pt)
    # --- the MAST: a 3px basalt lattice column, lit-left D edge, K rails ---
    c.line((fx, fy), (fx, top_y), "b")                 # core
    c.line((fx - 1, fy - 1), (fx - 1, top_y + 1), "D") # lit-left edge
    c.line((fx + 1, fy - 1), (fx + 1, top_y + 1), "K") # shaded-right edge / outline
    for yy in range(top_y + 3, fy - 1, 4):             # X-lattice rungs up the mast
        c.line((fx - 1, yy), (fx + 1, yy + 2), "b")
        c.line((fx + 1, yy), (fx - 1, yy + 2), "b")
    c.set(fx, top_y, "K")
    c.set(fx, fy, "K")                                 # foot plate on the roof corner
    # --- two GUY-WIRES bracing the mast down to the deck (taut K lines + anchors).
    #     Anchored back-LEFT + front so BOTH wires sweep down clear of the t2 second-
    #     drum pocket (back-centre, x≈38-42) — they never cross/occlude that earlier
    #     add, keeping the evolution cleanly cumulative. ---
    for gx, gy in [(int(round(deck_pt(0.58, 0.18)[0])), int(round(deck_pt(0.58, 0.18)[1]))),
                   (int(round(deck_pt(0.46, 0.74)[0])), int(round(deck_pt(0.46, 0.74)[1])))]:
        gy = min(gy, 62)
        c.line((fx, top_y + 6), (gx, gy), "K")
        c.set(gx, gy, "d")                             # anchor cleat on the deck
    # --- stacked glowing ACCELEROMETER PODS up the mast shaft (3 e-lit drums) ---
    pod_ys = [top_y + 5, top_y + 12, top_y + 19]
    for py in pod_ys:
        if py >= fy - 1:
            continue
        # a small 3-wide pod: K frame, e body, bright E read-lamp on the lit face
        c.fill_poly([(fx - 1, py), (fx + 1, py), (fx + 1, py + 2), (fx - 1, py + 2)], "e")
        for a, bb in [((fx - 1, py), (fx + 1, py)), ((fx - 1, py + 2), (fx + 1, py + 2)),
                      ((fx - 1, py), (fx - 1, py + 2)), ((fx + 1, py), (fx + 1, py + 2))]:
            c.line(a, bb, "K")
        c.set(fx - 1, py, "E")                          # bright read-lamp glint
        c.set(fx, py + 1, "G")                          # shaded core
    # bright E sensor cap crowning the mast top (the strong-motion head)
    c.set(fx, top_y, "E")
    c.set(fx, top_y - 1, "e")
    c.set(fx - 1, top_y, "E")
    # --- swinging PENDULUM-BOB on a short K arm hung off the lowest pod ---
    arm_y = pod_ys[-1] + 4 if pod_ys[-1] + 4 < fy - 2 else fy - 4
    bob_x = fx - 3                                      # swung out to the lit-left
    c.line((fx, arm_y - 3), (bob_x, arm_y), "K")        # pendulum suspension wire
    # the bob: a small glowing e mass with an E glint + K under-rim
    c.set(bob_x, arm_y, "e")
    c.set(bob_x - 1, arm_y, "e")
    c.set(bob_x, arm_y + 1, "G")
    c.set(bob_x - 1, arm_y + 1, "K")
    c.set(bob_x - 1, arm_y - 1, "E")                    # lit glint on the bob


def stage5_wavefield(c, b, deck_pt):
    """t5 — CROWNING FEATURE = FULLY EVOLVED strong-motion observatory. The rooftop
    shock-ripple DISC ERUPTS into a live SEISMIC WAVEFIELD: big concentric `E` SHOCK-
    RINGS radiate outward across the whole flat deck from a bright `E` EPICENTRE FLASH
    (over the base shock-ripple marker), with a jagged `e` seismograph TRACE tearing
    across the deck — the station now reads as fully energized/maxed. Dressed out with
    GOLD survey trim: q corner BOSSES on the parapet corners + a gold RIDGE BAND along
    the lit back rim. Reads as elite, still clearly the seismograph bunker. Drawn so
    the rings wash the deck around — never over — the drum + mast that own the back."""
    # epicentre = the base shock-ripple marker (deck_pt(0.68,0.64)) so the wavefield
    # erupts FROM the existing signature disc, not a second guess.
    ep = deck_pt(0.68, 0.64)
    ecx, ecy = ep[0], ep[1]
    # --- concentric E/e SHOCK-RINGS radiating across the deck (iso-flattened 2:1 so
    #     they lie on the roof plane). The INNER ring is a full circle right on the
    #     disc; the larger OUTER rings render only across the OPEN front/right deck so
    #     the wavefield erupts outward WITHOUT washing over the hero drum (back-left)
    #     or the sensor mast (back-right). Sparse angular step so the rings stay clean
    #     arcs, not mush. E on the live inner front, fading to e outward. ---
    HERO_X = 32      # don't paint rings left of here (protects the hero/2nd drum)
    rings = [(4.0, "E", True), (6.5, "e", False), (9.0, "E", False), (11.5, "e", False)]
    for rr, ch, full in rings:
        for a in range(0, 360, 12):
            x = ecx + rr * math.cos(math.radians(a))
            y = ecy + (rr * 0.5) * math.sin(math.radians(a))
            xi, yi = int(round(x)), int(round(y))
            if not (0 <= xi < 64 and 0 <= yi < 64):
                continue
            # protect the hero/second drum at back-left for ALL rings
            if xi < HERO_X:
                continue
            # for the outer rings, also keep off the back band where the mast + its
            # pods stand (so the wavefield reads as erupting toward the open front,
            # not smearing over the major mast); the inner ring stays a full disc.
            if not full and yi < ecy - 1 and xi > ecx - 1:
                continue
            c.set(xi, yi, ch)
    # bright E EPICENTRE FLASH at the centre (the live jolt)
    for dx, dy, ch in [(0, 0, "W"), (-1, 0, "E"), (1, 0, "E"), (0, -1, "E"),
                       (0, 1, "e"), (-1, -1, "e"), (1, 1, "e")]:
        c.set(int(round(ecx)) + dx, int(round(ecy)) + dy, ch)
    # a jagged `e` seismograph TRACE tearing across the OPEN FRONT-RIGHT deck from the
    # epicentre (down-and-right toward the front rim, away from the hero drum) so it
    # reads as the live wavefield rippling across clear deck, never over the drum.
    amp = [0, -2, 1, -1, 2, -1, 1, -2, 0]
    tx = int(round(ecx))
    ty = int(round(ecy))
    trace = []
    for k in range(0, 9):
        px = tx + k * 2                                 # tear toward the front-RIGHT
        py = ty + 1 + amp[k % len(amp)]                 # drift toward the front rim
        if px > 61 or py > 61:
            break
        trace.append((px, py))
    for k in range(1, len(trace)):
        c.line(trace[k - 1], trace[k], "e")
    for px, py in trace[::2]:
        c.set(px, py, "E")                              # bright trace nodes

    # --- GOLD premium survey trim (t5 flourish only) ---------------------------
    # gold RIDGE BAND along the lit BACK rim of the parapet (the elite crown band)
    c.line((b.r_top[0], b.r_top[1] - 2), (b.r_left[0], b.r_left[1] - 2), "q")
    c.set(int(round(b.r_top[0])), int(round(b.r_top[1])) - 3, "O")   # bright band glint
    # gold CORNER BOSSES on the four parapet corners (sparse elite trim, on the lip)
    for corner in (b.r_left, b.r_front, b.r_right, b.r_top):
        cxp, cyp = int(round(corner[0])), int(round(corner[1]))
        c.set(cxp, cyp - 2, "q")
    c.set(int(round(b.r_front[0])), int(round(b.r_front[1])) - 3, "O")  # brightest front boss


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the seismograph array at upgrade `stage` (1..5). Stage 1 is IDENTICAL
    to the shipped base PNG; each higher stage keeps every prior addition and bolts on
    the next (t2 2nd-drum → t3 vault annex → t4 sensor mast → t5 wavefield + gold).
    Painter's order keeps rooftop/overhead additions above the masses they grow from;
    the t4 mast + t5 wavefield draw AFTER the base signature so they sit on the deck,
    but the wavefield rings are placed to wash the deck around the drum, not over it."""
    c = Canvas()
    b = BUNKER
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    contact_shadow(c)            # flat iso ground-pool (drawn first, underneath)
    strata_berm(c, b)            # ochre/rust rock berm banked against the back-left
    bunker(c, b)                 # the low wide concrete blockhouse
    # over-paint strata bands + faces is done inside bunker(); now the openings:
    deck_pt = parapet(c, b)      # flat parapet roof (K-edged L/M lip + flat deck)
    left_opening(c, b)           # HERO armored door + ribbon window + EPICENTER placard (LIT-LEFT)
    right_detail(c, b)           # plainer shaded-right vent grille
    roof_kit(c, b, deck_pt)      # K-rimmed sensor wells + antenna post on the deck
    underglow(c, b, deck_pt)     # soft c seismic underglow on the deck

    # --- t3 VAULT annex draws on the SHADED-RIGHT base, before the roof signature so
    #     it sits as a side block; it never touches the deck instruments. ----------
    if stage >= 3:
        stage3_vault(c, b)

    drum_anchor = ink_drum(c, b, deck_pt)   # SIGNATURE: rotating paper-drum + teal trace + stylus
    shock_ripple(c, b, deck_pt)             # SIGNATURE: concentric shock-ripples + predicted jolt

    # --- CUMULATIVE UPGRADE STAGES (deck/overhead adds, after the base signature) --
    if stage >= 2:
        stage2_second_drum(c, b, deck_pt, drum_anchor)
    if stage >= 4:
        stage4_mast(c, b, deck_pt)
    if stage >= 5:
        stage5_wavefield(c, b, deck_pt)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/terrabase"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "seismograph-array"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped seismograph-array.png, so it does NOT overwrite the
    base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": TERRA, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"terrabase_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"terrabase_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
