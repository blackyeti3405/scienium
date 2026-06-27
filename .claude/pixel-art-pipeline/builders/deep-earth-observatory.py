#!/usr/bin/env python3
"""
Deep Earth Observatory — TerraBase Lab economy building (BESPOKE form, PREMIUM role).

The premium showpiece of the set: a TALL DRAMATIC open-lattice DRILL-RIG DERRICK —
a tapering four-leg steel tower — rising over a low equipment base, straddling a
glowing borehole that plunges into the planet's interior. The tallest, most open,
most dramatic silhouette of the batch (an airy tapering tower you can see through,
NOT the gateway cube, NOT a solid cylinder). Its hero is a cutaway glowing SHAFT
dropping through a cross-section of the planet's concentric interior layers.

  * Equipment base: a low Box around the derrick feet (M/D steel rig house). The
    borehole opens through the center of its deck. OPENING = RIGHT: a K-framed
    control window + door GLOWS on the SHADED RIGHT face (g/c glass over a bright
    o/O interior, h reflection) so it reads on the shaded side; the LIT LEFT face
    stays plainer (one c window + a D draw-works drum).
  * Cutaway planetary shaft (SIGNATURE): below the borehole collar a narrow K-walled
    shaft plunges straight down through nested concentric bands — D/r crust ->
    r/o mantle -> O/o outer-core (hottest, brightest) -> c/g inner-core glint — an
    amber->teal deep glow. A W/c probe capsule descends the shaft on a thin D line
    with a blinking O sensor light; a thin g/c data-trace + rising O reading-blips
    climb back up to a K-framed surface gauge whose needle climbs to a bright O
    predicted mark (the prediction). A soft O/c halo rings the whole borehole.
  * Derrick: four D/M steel legs from a wide base footprint tapering to a small D
    crown platform near the canvas top — drawn as four converging K/D lines with d
    cross-bracing rungs (open lattice). A c work-light + crown block at the top, a
    thin D draw-line running from the crown down into the borehole.

Composed from art/isobuild.{Box} + line-drawn lattice — NO iso.draw_cube/base_windows.
Draw order (painter's): contact shadow + base block -> cutaway planetary shaft (the
interior layers, probe, rising prediction) -> the lattice derrick over it -> the
GLOWING RIGHT control-room opening on the base front.
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

TERRA = {"K": "#20190f", "W": "#efe6cf", "L": "#d6c8a0", "M": "#b09a6e", "D": "#7e6c47", "d": "#54462c",
         "h": "#d6f2ea", "c": "#a4e2d4", "g": "#34b6a2", "G": "#1d8474",
         "o": "#e0a850", "O": "#ffce80", "r": "#9a5e1e"}


# ── equipment base geometry (a LOW rig house the derrick straddles) ───────────
# Taller than a flat plinth so its FRONT corner can be CUT AWAY into a visible
# planetary cross-section (a sliced-open-cake reveal of the interior layers).
BASE = Box(top=(32, 28), wx=11, wy=9, h=14)
# borehole collar lives at the deck centre
COLLAR = BASE.roof_pt(0.5, 0.5)
CX = int(round(COLLAR[0]))          # screen-x of the borehole / shaft / derrick axis
COLLAR_Y = int(round(COLLAR[1]))    # screen-y of the borehole mouth (deck level)


# ── 1. CONTACT SHADOW (drawn FIRST, grounds the whole rig) ────────────────────
def contact_shadow(c):
    scx, scy = CX, 56
    for x in range(scx - 18, scx + 19):
        for y in range(scy - 2, scy + 4):
            ex = (x - scx) / 18.0
            ey = (y - scy) / 2.6
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")


# ── 2. EQUIPMENT BASE BLOCK (low rig house) ───────────────────────────────────
def base_block(c, b):
    """The low steel rig house the derrick legs stand on. Drawn before the shaft so
    the shaft cutaway reads as plunging THROUGH the deck centre."""
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # warm o hazard stripe ringing the deck edge (TerraBase hazard striping)
    for k in range(13):
        t = k / 12.0
        # along the lit-left front roof edge
        p = (b.r_left[0] + t * (b.r_front[0] - b.r_left[0]),
             b.r_left[1] + t * (b.r_front[1] - b.r_left[1]))
        c.set(int(round(p[0])), int(round(p[1])), "o" if k % 2 == 0 else "K")
        # along the right front roof edge
        q = (b.r_front[0] + t * (b.r_right[0] - b.r_front[0]),
             b.r_front[1] + t * (b.r_right[1] - b.r_front[1]))
        c.set(int(round(q[0])), int(round(q[1])), "o" if k % 2 == 0 else "K")
    return b


def borehole_collar(c, b):
    """A K-rimmed circular shaft mouth in the centre of the deck, the open top of the
    cutaway shaft, glowing O/c from below, ringed by a soft O/c GLOW HALO on the deck
    so the 'live borehole' reads and the eye is drawn DOWN the shaft."""
    rx, ry = 4.5, 2.2
    # --- glow HALO ring on the deck around the collar (premium polish, tweak 5) ---
    # a soft o/c aura one ring outside the K rim so the borehole reads as live.
    for a in range(0, 360, 6):
        for (rr, ch) in ((6.4, "o"), (7.6, "c")):
            hx = CX + rr * math.cos(math.radians(a))
            hy = COLLAR_Y + (rr * 0.5) * math.sin(math.radians(a))
            if 0 <= hy < 62:
                c.set(hx, hy, ch)
    # an iso ellipse rim (2:1) around the collar centre
    for a in range(0, 360, 8):
        x = CX + rx * math.cos(math.radians(a))
        y = COLLAR_Y + ry * math.sin(math.radians(a))
        c.set(x, y, "K")
    # fill the mouth with a hot glow (the shaft top seen from above)
    for yy in range(int(-ry), int(ry) + 1):
        t = 1 - (yy / ry) ** 2
        if t < 0:
            continue
        half = (rx - 0.8) * (t ** 0.5)
        for xx in range(int(-half), int(half) + 1):
            d2 = (xx / rx) ** 2 + (yy / ry) ** 2
            ch = "O" if d2 < 0.30 else ("o" if d2 < 0.65 else "c")
            c.set(CX + xx, COLLAR_Y + yy, ch)


# ── 3. CUTAWAY PLANETARY SHAFT — the hero cross-section + probe + prediction ──
def planetary_shaft(c, b):
    """The HERO: the base's FRONT corner is CUT AWAY (a sliced-open-cake wedge) to
    reveal a cross-section of the planet's CONCENTRIC interior layers — NOT flat
    stacked floors but nested CURVED bands around a deep core: CRUST at the surface
    -> MANTLE (amber) -> OUTER CORE (hot O/W) -> a mineral-teal INNER-CORE nucleus.
    A narrow glowing borehole runs straight down the cutaway axis from the collar to
    the core. Returns shaft bounds + key y's for the probe/prediction overlays.

    Geometry: the layers are concentric RINGS centred on a deep core point (cx, cy)
    near the bottom tip. Each pixel is coloured by its elliptical distance to that
    core, so the bands literally CURVE around the core (a planet cross-section), and
    each ring is >=2px thick with a hard K divider so the bands read DISTINCT. The
    exposed wedge is clipped to a downward-widening V so it reads as a deliberate
    slice through the deck, not a rectangular panel."""
    front_x = int(round(b.r_front[0]))         # the front corner column (the slice axis)
    sy_top = COLLAR_Y + 1                        # just under the collar mouth (~y39)
    sy_bot = 61                                  # bottom tip of the cutaway (into the ground)

    # core centre: the hot nucleus sits LOW in the front face so the rings stack UP
    # it through the base wall (a true cross-section slice, not a buried pool). The
    # wedge is a CENTRE-FRONT slice between the lit-left drum and the right control
    # room (x ~28..44), so those rig-house faces stay intact on either side.
    cx, cy = front_x, 54

    # cutaway exposed wedge half-width: a NARROW borehole throat in the upper notch
    # (just the shaft, ~2px) that flares open only near the core into the concentric
    # bowl (~8px), so the layers read where they're wide and the upper shaft stays a
    # clean thin bore instead of a wide dark noisy wedge. Capped so it's centre-front.
    bowl_top = cy - 9                            # where the bowl starts to flare (~y45)
    def hw_at(y):
        if y < bowl_top:                         # narrow borehole throat above the bowl
            return 2.0
        frac = (y - bowl_top) / (cy - bowl_top)
        frac = max(0.0, min(1.0, frac))
        w = 2.0 + (frac ** 0.6) * 6.5            # ~2 px -> ~8.5 px at core depth
        if y > cy:                               # taper back in below the core tip
            w = max(2.0, 8.5 - (y - cy) * 2.2)
        return w

    # concentric RINGS keyed by elliptical radius R (2:1) from the core centre.
    # ordered OUTER(surface)->INNER(core); inner ring wins per-pixel. Each >=2px thick
    # radially => DISTINCT curved bands. crust(D) -> rust(r) -> amber mantle(o) ->
    # bright mantle(O) -> OUTER CORE(W) -> teal shell(c) -> INNER-CORE nucleus(h).
    # POLISH (review tweak 1 — band legibility at thumbnail): a thin DARK r divider
    # ring between the amber mantle (o) and the bright outer-core (O/W) so the warm
    # bands don't collapse into one undifferentiated glow at 96–128px. Pushing one
    # band of high contrast (dark r) between the two brightest amber zones makes the
    # concentric structure resolve at small sizes without touching the hue sequence.
    rings = [
        (15.0, "d", "K"),    # CRUST — darkest earthy brown (reads vs the M/D rig walls)
        (12.0, "r", "d"),    # lower crust — rust
        (9.5,  "o", "r"),    # upper MANTLE — amber warming
        (8.0,  "r", "o"),    # mantle/core DIVIDER — dark rust ring (thumbnail contrast)
        (6.6,  "O", "o"),    # lower MANTLE — bright amber
        (4.8,  "W", "O"),    # OUTER CORE — hottest amber-white (brightest band)
        (2.8,  "c", "h"),    # inner-core shell — mineral teal
        (1.4,  "h", "h"),    # INNER-CORE nucleus — bright teal-white glint
    ]

    def ell_r(x, y):
        dx = x - cx
        dy = (y - cy) * 2.0                       # 2:1 so rings are iso ellipses
        return math.hypot(dx, dy)

    # paint every cutaway pixel by its innermost ring (hot teal core centred). NO K
    # divider arcs — the bands separate by HUE (d->r->o->O->W->c->h), and K dots
    # scattered through the narrow upper notch only read as static. The band sequence
    # gives strong, clean, distinct concentric arcs on its own.
    for y in range(sy_top, sy_bot + 1):
        hw = hw_at(y)
        for x in range(int(round(front_x - hw)), int(round(front_x + hw)) + 1):
            R = ell_r(x, y)
            cell = rings[0][1]                    # default = crust
            for (Rmax, fill, hi) in rings:
                if R <= Rmax:
                    cell = fill
            c.set(x, y, cell)

    core_y = cy                                   # the hot-core overlay anchor

    # a glowing BOREHOLE column down the narrow upper throat from the collar to the
    # top of the bowl — a clean BRIGHT shaft (2px wide) so the throat reads as a lit
    # live borehole, not a dark notch, and the eye runs DOWN it to the glowing core.
    for y in range(sy_top, bowl_top + 1):
        c.set(front_x, y, "O")
        c.set(front_x - 1, y, "o")

    # the cutaway's two slanted CUT EDGES (K) framing the exposed wedge as a clean
    # slice through the deck (only the outer silhouette, not interior dividers).
    c.line((front_x - int(hw_at(sy_top)), sy_top - 1), (front_x - int(hw_at(cy)), cy), "K")
    c.line((front_x + int(hw_at(sy_top)), sy_top - 1), (front_x + int(hw_at(cy)), cy), "K")

    sx0, sx1 = front_x - 1, front_x + 1           # bore axis bounds for overlays
    return sx0, sx1, sy_top, sy_bot, core_y, front_x


def probe_and_prediction(c, shaft):
    """The descending PROBE (centre, on its D draw-line, W/c capsule + O sensor) and
    the rising PREDICTION (a SEPARATE g/c data-trace + rising O blips up the LEFT of
    the bore, clear of the probe line + core glow). Descent and rise are deliberately
    opposite sides / opposite colours so the two reads never blur together."""
    sx0, sx1, sy_top, sy_bot, core_y, fx = shaft

    # --- descending PROBE: a single clean capsule riding the bore ON the centre axis
    # in the narrow upper throat, on its D draw-line. The capsule's own K outline
    # makes it pop off the bright bore column. ---
    px = fx
    drop_y = sy_top + 4                          # in the upper throat, above the bowl
    # thin D suspension line (the draw-line) from the collar down to the capsule top
    c.set(px, sy_top, "D")
    c.set(px, sy_top + 1, "D")
    # probe capsule — compact 2x3, W body + c nose, hard K outline so it pops
    c.set(px - 1, drop_y - 1, "K"); c.set(px, drop_y - 1, "K"); c.set(px + 1, drop_y - 1, "K")
    c.set(px - 1, drop_y, "K");     c.set(px, drop_y, "W");     c.set(px + 1, drop_y, "K")
    c.set(px - 1, drop_y + 1, "K"); c.set(px, drop_y + 1, "c"); c.set(px + 1, drop_y + 1, "K")
    c.set(px - 1, drop_y + 2, "K"); c.set(px, drop_y + 2, "O"); c.set(px + 1, drop_y + 2, "K")  # O sensor nose
    c.set(px, drop_y + 3, "K")

    # --- rising PREDICTION: a thin teal g/c data-trace climbing the LEFT of the bore
    # up toward the surface gauge, with rising O reading-blips. Kept SHORT + tight in
    # the upper throat (clear of the bowl + the centre probe) so it reads as one
    # deliberate trace, not scattered static. Opposite SIDE + COLOUR from the descent
    # (descent = D line + W probe on centre; rise = teal trace + O blips on the left). ---
    # POLISH (review tweak 2 — collar-zone density): pulled the trace one column
    # further LEFT (fx-3) and the O reading-blips one more (fx-4) so the rising
    # prediction sits clear of the bright o/O borehole-mouth glow instead of blending
    # into it at a glance — descent (centre) and rise (left) now read separately.
    tx = fx - 3
    trace = [(0, "c"), (-1, "g"), (-2, "c"), (-3, "h"), (-4, "c")]
    for (dy, ch) in trace:
        ty = drop_y + 2 + dy                     # start beside the probe nose, climb up
        c.set(tx, ty, ch)
    # rising O reading-blips beside the trace, one column further off the collar glow
    for dy in (1, -3):
        c.set(tx - 1, drop_y + 2 + dy, "O")


def surface_gauge(c, b):
    """A K-framed surface gauge on the deck (lit-left of the collar) whose teal
    needle climbs to a bright O predicted mark — the prediction read-out."""
    gp = b.roof_pt(0.30, 0.34)
    gx, gy = int(round(gp[0])), int(round(gp[1]))
    # small K-framed dial face
    for dx in range(-2, 3):
        c.set(gx + dx, gy - 3, "K")
        c.set(gx + dx, gy, "K")
    for dy in range(-3, 1):
        c.set(gx - 2, gy + dy, "K")
        c.set(gx + 2, gy + dy, "K")
    # dial interior (dark) + teal needle climbing up-right to an O target mark
    for dy in range(-2, 0):
        for dx in range(-1, 2):
            c.set(gx + dx, gy + dy, "d")
    c.set(gx, gy - 1, "g")           # needle pivot
    c.set(gx + 1, gy - 2, "c")       # needle climbing
    c.set(gx + 2, gy - 3, "O")       # bright O predicted mark (top-right tick)
    c.set(gx - 1, gy - 1, "h")       # small glint


# ── 4. LATTICE DERRICK — the open tapering four-leg drill tower (over the shaft)─
def derrick(c, b):
    """Four D/M steel legs rising from a wide base footprint and tapering inward to
    a small crown platform near the canvas top, drawn as converging K/D lines with
    d cross-bracing rungs (an open lattice you can see through). A D crown block + c
    work-light cap the top; a thin D draw-line runs from the crown into the borehole."""
    # foot footprint: the four legs spring from near the deck top-edge corners
    foot_y = COLLAR_Y - 1
    half_w = 13                        # half-width of the leg spread at the feet
    crown_y = 4                        # crown platform y (high, keeps headroom)
    crown_hw = 2                       # half-width at the crown (tapered in tight)
    depth = 4                          # iso depth offset between near + far leg pairs

    # near legs (front pair) + far legs (back pair, lifted & pulled toward centre).
    legs = [
        # (foot_x, foot_y, crown_x, crown_y, lit)
        (CX - half_w, foot_y + 1, CX - crown_hw, crown_y, True),         # near-left  (lit)
        (CX + half_w, foot_y + 1, CX + crown_hw, crown_y, False),        # near-right (shaded)
        (CX - half_w + depth, foot_y - 4, CX - crown_hw, crown_y - 1, True),   # far-left
        (CX + half_w - depth, foot_y - 4, CX + crown_hw, crown_y - 1, False),  # far-right
    ]

    def leg_x(L, t):
        return L[0] + t * (L[2] - L[0])

    def leg_y(L, t):
        return L[1] + t * (L[3] - L[1])

    # --- SPARSE cross-BRACING (single diagonal X per bay, NOT a dense fill) so the
    # lattice reads OPEN — you see through it. Drawn first, behind the legs. ---
    for (La, Lb) in [(legs[2], legs[3]), (legs[0], legs[1])]:
        bays = 5
        for i in range(bays):
            t0, t1 = i / bays, (i + 1) / bays
            a0 = (leg_x(La, t0), leg_y(La, t0)); a1 = (leg_x(La, t1), leg_y(La, t1))
            b0 = (leg_x(Lb, t0), leg_y(Lb, t0)); b1 = (leg_x(Lb, t1), leg_y(Lb, t1))
            c.line(a0, b1, "d")        # one diagonal of the X
            c.line(b0, a1, "d")        # the other diagonal
            c.line(a1, b1, "D")        # horizontal tie at each bay top (the rung)

    # --- the four LEGS over the bracing (lit M / shaded D, K-cored for crispness) ─
    for L in legs:
        lit = L[4]
        col_main = "M" if lit else "D"
        c.line((L[0], L[1]), (L[2], L[3]), "K")          # crisp K leg core
        for i in range(0, 41):
            t = i / 40.0
            x = leg_x(L, t); y = leg_y(L, t)
            c.set(int(round(x)) + (-1 if lit else 1), int(round(y)), col_main)

    # --- CROWN platform + block + work-light + draw-line ---
    # small D crown block bridging the leg tops
    for dx in range(-crown_hw - 1, crown_hw + 2):
        c.set(CX + dx, crown_y - 1, "D")
        c.set(CX + dx, crown_y, "M")
    c.line((CX - crown_hw - 1, crown_y + 1), (CX + crown_hw + 1, crown_y + 1), "K")
    for dx in range(-crown_hw - 1, crown_hw + 2):
        c.set(CX + dx, crown_y - 2, "K")        # crown top edge
    # a crown-block sheave (small D drum) + c work-light beside it
    c.set(CX - 1, crown_y - 3, "D"); c.set(CX, crown_y - 3, "M")
    c.set(CX - 1, crown_y - 4, "K"); c.set(CX, crown_y - 4, "K")
    c.set(CX + 2, crown_y - 3, "c")             # c work-light glowing
    c.set(CX + 2, crown_y - 4, "h")
    c.set(CX + 3, crown_y - 3, "o")             # warm halo on the work-light

    # thin D DRAW-LINE (cable) running from the crown sheave down into the borehole
    c.line((CX, crown_y - 1), (CX, COLLAR_Y), "D")
    c.set(CX, crown_y, "K")


# ── 5. lit-left base detail (plainer) — one c window + a D draw-works drum ─────
def left_detail(c, b):
    """Keep the LIT-LEFT base face plainer per the blueprint: one small c window and
    a D draw-works drum on the deck."""
    # small c window high on the lit-left face
    b.window(c, "left", 0.16, 0.40, 2.0, 5.4, glass="c", hi="h", shade="G", frame="K", mullions=1)
    # a D draw-works DRUM sitting on the deck, lit-left of the collar (a small cylinder
    # lying along the deck — render as a short capsule)
    dx0 = b.roof_pt(0.24, 0.62)
    dcx, dcy = int(round(dx0[0])), int(round(dx0[1]))
    for col in range(-3, 4):
        hh = 2 if abs(col) < 3 else 1
        for k in range(hh):
            c.set(dcx + col, dcy + k, "D" if col <= 0 else "d")
        c.set(dcx + col, dcy - 1, "M")
    c.set(dcx - 4, dcy, "K"); c.set(dcx - 4, dcy + 1, "K")
    c.set(dcx + 4, dcy, "K"); c.set(dcx + 4, dcy + 1, "K")
    for col in range(-3, 4):
        c.set(dcx + col, dcy - 2, "K")
        c.set(dcx + col, dcy + 2, "K")
    c.set(dcx - 3, dcy - 1, "L")             # rim glint
    # spooled cable bands across the drum
    for col in (-1, 1):
        c.set(dcx + col, dcy, "d")
        c.set(dcx + col, dcy + 1, "K")


# ── 6. GLOWING control-room opening on the base's SHADED RIGHT face (front) ───
def right_opening(c, b):
    """The hero entry: a K-framed control-room WINDOW + DOOR on the base block's
    SHADED RIGHT face, made to GLOW — g/c glass over a bright o/O lit interior so it
    reads on the shaded side, with an h reflection. A small o 'DEEP EARTH' placard
    sits above. Drawn AFTER the base + derrick (it's the nearest front detail)."""
    pt = b.right_pt
    # The cutaway slice owns the FRONT corner (u≈0). Place the control room on the
    # RIGHT half of the shaded right face (u≈0.42..0.97) so it reads clear of it.

    # --- glowing control-room WINDOW: a bright o/O LIT INTERIOR behind g/c glass so
    # it reads as a warm-lit room on the shaded face ---
    wu0, wu1, wv0, wv1 = 0.44, 0.70, 2.2, b.h - 2.0
    c.fill_poly([pt(wu0, wv0), pt(wu1, wv0), pt(wu1, wv1), pt(wu0, wv1)], "K")          # K frame
    # bright lit interior FIRST (the room is glowing), then teal glass over its top half
    c.fill_poly([pt(wu0 + 0.06, wv0 + 0.5), pt(wu1 - 0.06, wv0 + 0.5),
                 pt(wu1 - 0.06, wv1 - 0.3), pt(wu0 + 0.06, wv1 - 0.3)], "O")            # hot interior
    c.fill_poly([pt(wu0 + 0.06, wv0 + 0.5), pt(wu1 - 0.06, wv0 + 0.5),
                 pt(wu1 - 0.06, wv0 + 2.4), pt(wu0 + 0.06, wv0 + 2.4)], "g")            # teal glass band (upper)
    c.line(pt(wu0 + 0.06, wv0 + 2.4), pt(wu1 - 0.06, wv0 + 2.4), "c")                  # glass/interior seam
    c.line(pt(wu0 + 0.06, wv0 + 1.1), pt(wu1 - 0.06, wv0 + 1.1), "h")                  # h reflection on glass
    c.line(pt(wu0 + 0.5, wv0 + 0.6), pt(wu0 + 0.5, wv1 - 0.4), "K")                    # central mullion
    c.line(pt(wu0 + 0.18, wv1 - 0.6), pt(wu1 - 0.18, wv1 - 0.6), "O")                  # bright sill glow

    # --- the DOOR alongside (front side of the window), glowing teal-over-warm ---
    du0, du1, dv0, dv1 = 0.74, 0.92, 4.0, b.h - 0.4
    c.fill_poly([pt(du0, dv0), pt(du1, dv0), pt(du1, dv1), pt(du0, dv1)], "K")         # frame
    c.fill_poly([pt(du0 + 0.06, dv0 + 0.5), pt(du1 - 0.06, dv0 + 0.5),
                 pt(du1 - 0.06, dv1), pt(du0 + 0.06, dv1)], "o")                       # warm interior
    c.fill_poly([pt(du0 + 0.06, dv0 + 0.5), pt(du1 - 0.06, dv0 + 0.5),
                 pt(du1 - 0.06, dv0 + 2.0), pt(du0 + 0.06, dv0 + 2.0)], "c")           # teal glass top
    c.line(pt(du0 + 0.06, dv0 + 1.0), pt(du1 - 0.06, dv0 + 1.0), "h")                 # top glint
    c.line(pt(du0 + 0.1, dv1 - 0.3), pt(du1 - 0.1, dv1 - 0.3), "O")                   # bright glow at foot

    # --- small teal INSTRUMENT readouts inside the window (control-room gear) ---
    rp = pt(0.52, wv1 - 2.0)
    rx, ry = int(round(rp[0])), int(round(rp[1]))
    c.set(rx, ry, "g"); c.set(rx + 1, ry, "c"); c.set(rx, ry + 1, "G")

    # --- 'DEEP EARTH' placard: a K-framed o signage stripe above the window (tweak 6) ─
    for u in [0.46 + 0.04 * i for i in range(6)]:
        p = pt(u, wv0 - 1.4); px2, py2 = int(round(p[0])), int(round(p[1]))
        c.set(px2, py2, "o")
        c.set(px2, py2 - 1, "K")   # K top frame
        c.set(px2, py2 + 1, "K")   # K bottom frame

    # --- soft o glow pooling on the ground in front of the lit right face ---
    base_pt = pt(0.66, b.h)
    gx, gy = int(round(base_pt[0])), int(round(base_pt[1]))
    for dx in range(-3, 5):
        c.set(gx + dx, gy + 1, "o" if abs(dx) < 3 else "r")
    c.set(gx, gy + 2, "o")


def build():
    c = Canvas()
    b = BASE
    contact_shadow(c)               # contact shadow (under/back), grounds the rig
    base_block(c, b)                # equipment rig house (drawn behind shaft + derrick)
    borehole_collar(c, b)           # glowing K-rimmed borehole mouth in the deck centre
    shaft = planetary_shaft(c, b)   # SIGNATURE: cutaway concentric planetary interior layers
    probe_and_prediction(c, shaft)  #            descending probe + rising prediction trace
    left_detail(c, b)               # plainer lit-left: c window + D draw-works drum
    right_opening(c, b)             # GLOWING control-room window+door on the SHADED RIGHT
    surface_gauge(c, b)             #            K-framed surface gauge climbing to O mark
    derrick(c, b)                   # the open-lattice tapering derrick over the borehole
    spec = {"width": 64, "height": 64, "palette": TERRA, "rows": c.rows()}
    out = "/path/to/scienium/art/src/buildings/terrabase_deep-earth-observatory.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
