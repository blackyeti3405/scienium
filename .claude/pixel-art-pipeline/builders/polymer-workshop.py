#!/usr/bin/env python3
"""
Polymer Workshop — ChemWorks economy building (BESPOKE FORM) + its 4-stage
UPGRADE-EVOLUTION sprites.

NOT the gateway cube and NOT a re-skin of any sibling. Composed from the iso
BUILDING TOOLKIT (isobuild.Box + cylinder) as a LONG SAWTOOTH (north-light)
EXTRUSION SHED with a TAKE-UP SPOOL ANNEX at the discharge end — a factory-floor
silhouette for a continuous polymer extrusion line.

Distinct from the Volt Embedded sawtooth shed by:
  * ChemWorks palette — blue-grey walls (M/D), BLUE glass (h/c/g/G), VIOLET glow
    (o/O/r) — NOT grey walls + cyan + yellow;
  * a SPOOL ANNEX (a round take-up winder) bolted to the FRONT-RIGHT discharge end;
  * a wider, longer sawtooth pitch reading as a continuous process line, not a
    maker hall, and a HORIZONTAL screw-extruder + drawn strand hero (the Volt shed
    had a rooftop breadboard garden; the Volt printer extruded a solid part UP —
    this draws a continuous strand sideways onto a winding reel).

OPENING SIDE = RIGHT: a glowing K-framed discharge/output bay on the SHADED RIGHT
face (g/c glass + o/O violet interior glow) where the extruded polymer exits — the
left (lit) long face is plainer (sawtooth north-lights + a couple c strips + an o
process line).

Signature (one-of-one): a horizontal screw extruder pushes molten polymer through
a K die head (o/O violet melt glow), and a single bright strand is drawn off —
hot O/o at the die cooling to c/h as it sags across to a slowly-winding take-up
reel on the annex (concentric c/g arcs + an o rotation tick). A c/g config panel
with o/O sliders (die temp / pull rate) = the configuration mini-game, plus a
faint O chain-link glyph reading "polymer".

UPGRADE EVOLUTION (cumulative — the single extrusion line grows into a built-out
continuous fiber-spinning plant; the violet/reagent + teal-energized process theme
intensifies; gold is a t5 flourish):
  t2  small functional add : an extra PELLET HOPPER + a small TAKE-UP SPOOL of
                             drawn fiber on the front apron, brightened o heater
                             band on the die
  t3  structural add       : a MELT-PUMP + banded SCREW-BARREL EXTRUDER annex (a
                             long cylinder w/ o heater zones) along the lit wall,
                             feeding the die — deep-steel b shell
  t4  major add            : a tall COOLING/DRAWING TOWER off the roof — a steel
                             frame guiding multiple e-glowing molten filaments up
                             over godet rollers
  t5  crowning feature     : a glowing MULTI-FILAMENT FIBER CROWN — a fan of bright
                             E drawn strands winding onto a premium creel + q gold
                             die-plate and a gold spool flange
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder  # noqa: F401  (cylinder kept available)

# Base ChemWorks palette (shared keys) + a few EVOLVED accent shades reserved for
# the upgrade stages only (they never appear in stage 1, so polymer-workshop.png is
# unchanged). These exact keys+hexes are the lab-wide evolved accents:
#   b  deepened structure steel — matured tone for t3+ new masses
#   e  energized process glow (mid)   E  energized process glow (bright) — t4/t5 filaments
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
CHEM = {"K": "#161a2e", "W": "#e6ecfb", "L": "#c2cdee", "M": "#9aa8d8", "D": "#6f7cb0", "d": "#4b5688",
        "h": "#d6ecff", "c": "#a8d4ff", "g": "#4aa0e6", "G": "#2166b0",
        "o": "#c89cf0", "O": "#e0c2ff", "r": "#6a34a8",
        "b": "#363c5e", "e": "#36e0c8", "E": "#c2fff2", "q": "#f0c64a"}

# Height (px) of the t4 cooling/drawing TOWER frame above its roof foot. Defined
# ONCE here because BOTH stage4_drawing_tower (which raises the frame + godet
# rollers) and stage5_fiber_crown (which fans the bright filaments up over the
# SAME top crossbar) must derive the tower head from the SAME number. Tuned so the
# frame head + the t5 creel/crown above it land fully on-canvas (topmost ~row 1).
TOWER_H = 24


# ── low-level helpers ────────────────────────────────────────────────────────
def hline(c, x0, x1, y, ch):
    if x1 < x0:
        x0, x1 = x1, x0
    for x in range(int(round(x0)), int(round(x1)) + 1):
        c.set(x, y, ch)


def vline(c, x, y0, y1, ch):
    if y1 < y0:
        y0, y1 = y1, y0
    for y in range(int(round(y0)), int(round(y1)) + 1):
        c.set(x, y, ch)


def psag(c, a, b, sag, ch):
    """A thin single-pixel strand from a→b, sagging `sag` px downward at mid."""
    ax, ay = a
    bx, by = b
    steps = max(abs(bx - ax), abs(by - ay), 1)
    prev = None
    for i in range(int(steps) + 1):
        t = i / steps
        x = ax + (bx - ax) * t
        y = ay + (by - ay) * t + sag * (1 - (2 * t - 1) ** 2)  # parabolic droop
        p = (int(round(x)), int(round(y)))
        if p != prev:
            c.set(p[0], p[1], ch)
            prev = p


# ── 1. MAIN SHED — one long, low Box (the bespoke break from the cube) ────────
def main_shed(c):
    """Long, low extrusion-line shed. wx=14 wy=8 h=12 -> distinctly elongated and
    low, a factory-floor silhouette, the opposite of the tall square gateway cube."""
    shed = Box(top=(28, 18), wx=14, wy=8, h=12)
    shed.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    return shed


def wall_seams(c, shed):
    """Subtle d panel seams + an L rivet course on the blue-grey shed walls — calm,
    so the glazing + extruder hero carry the read."""
    # right (shaded) face: vertical seams between the upper band (door sits below)
    for u in (0.20, 0.40, 0.60, 0.80):
        c.line(shed.right_pt(u, 1), shed.right_pt(u, 4), "d")
    # left (lit) eave rivet course
    for u in (0.12, 0.30, 0.48, 0.66, 0.84):
        p = shed.left_pt(u, 1.6)
        c.set(int(round(p[0])), int(round(p[1])), "L")


# ── 2. SAWTOOTH ROOF — a row of 3 north-light monitors (BLUE glazed) ─────────
def sawtooth_roof(c, shed):
    """Three sawtooth (north-light) monitors marching along the LEFT footprint axis
    so their glazed faces all tilt toward the LIT side — a continuous process-line
    roofline. Each tooth = a steep BLUE-glass north-light front face (g/c/h) + a
    long shaded D/d back ramp + a hard K apex ridge. Wide pitch (a long line, not a
    dense maker-shed serration). Kept on the BACK band of the roof so the front
    roof deck and the extruder line below stay clear."""
    bodies = ["W", "L", "M"]              # apex crest shade varies so teeth read distinct
    TOOTH_H = 8                            # vertical rise above the ridge
    V_FRONT, V_BACK = 0.56, 0.94          # tooth occupies this back band of the roof
    for i in range(3):
        # march along the LEFT axis (u runs left->front); wide teeth, clear valleys
        u0 = 0.10 + i * 0.30
        u1 = u0 + 0.22
        ffl = shed.roof_pt(u0, V_FRONT)   # front-left foot (toward viewer)
        ffr = shed.roof_pt(u1, V_FRONT)   # front-right foot
        bfl = shed.roof_pt(u0, V_BACK)    # back-left foot
        bfr = shed.roof_pt(u1, V_BACK)    # back-right foot
        # apex above the FRONT feet (steep glazed front), nudged back for ramp run
        axl = (ffl[0] + 1, ffl[1] - TOOTH_H)
        axr = (ffr[0] + 1, ffr[1] - TOOTH_H)
        # --- shaded back ramp (apex down to the back feet) ---
        c.fill_poly([axl, axr, bfr, bfl], "D")
        for t in (0.3, 0.55, 0.8):
            tx = axl[0] + (axr[0] - axl[0]) * t
            ty = axl[1] + (axr[1] - axl[1]) * t
            bx = bfl[0] + (bfr[0] - bfl[0]) * t
            by = bfl[1] + (bfr[1] - bfl[1]) * t
            c.line((tx, ty), (bx, by), "d")
        # --- steep north-light front face: BLUE glass (g) with an h glint band ---
        c.fill_poly([ffl, ffr, axr, axl], "g")
        # cyan glaze sheen across the upper third of the glass
        gx0 = axl[0] + (ffl[0] - axl[0]) * 0.25
        gy0 = axl[1] + (ffl[1] - axl[1]) * 0.25
        gx1 = axr[0] + (ffr[0] - axr[0]) * 0.25
        gy1 = axr[1] + (ffr[1] - axr[1]) * 0.25
        c.line((gx0, gy0), (gx1, gy1), "c")
        c.set(int(round(axl[0] + 1)), int(round(axl[1] + 2)), "h")  # bright corner glint
        # mullion bar down the glass so it reads as a glazed monitor
        mx = (ffl[0] + ffr[0]) / 2
        my = (ffl[1] + ffr[1]) / 2
        amx = (axl[0] + axr[0]) / 2
        amy = (axl[1] + axr[1]) / 2
        c.line((amx, amy), (mx, my), "G")
        c.line((ffl[0], ffl[1] - 1), (ffr[0], ffr[1] - 1), "K")     # dark sill shadow
        # --- bright apex crest (varies W/L/M) ---
        c.line((axl[0], axl[1] - 1), (axr[0], axr[1] - 1), bodies[i])
        # --- hard K outline of the tooth silhouette ---
        c.line(ffl, axl, "K")
        c.line(ffr, axr, "K")
        c.line(axl, axr, "K")
        c.line(axl, bfl, "K")
        c.line(axr, bfr, "K")
        c.line(ffl, ffr, "K")


# ── 3. LEFT (lit) long face — plainer: strip windows + process line ──────────
def left_face(c, shed):
    """Keep the LIT LEFT long face plainer (the sawtooth north-lights provide the
    interest): a couple of c strip windows + a glowing o process line along the
    eave. NO hero opening here — the hero discharge bay is on the RIGHT."""
    # two horizontal c strip windows (clerestory band on the long lit wall)
    shed.window(c, "left", 0.10, 0.40, 4.5, 8.0, glass="g", hi="h", shade="G",
                frame="K", mullions=1)
    shed.window(c, "left", 0.50, 0.80, 4.5, 8.0, glass="g", hi="h", shade="G",
                frame="K", mullions=1)
    # glowing o/r violet process line running along the lit eave (chem motif)
    c.line(shed.left_pt(0.06, 2.4), shed.left_pt(0.96, 2.4), "o")
    c.line(shed.left_pt(0.06, 3.0), shed.left_pt(0.96, 3.0), "r")
    # low D louver vents along the base (plant ventilation)
    for u in (0.18, 0.32, 0.62, 0.78):
        p = shed.left_pt(u, 10.4)
        x, y = int(round(p[0])), int(round(p[1]))
        c.set(x, y, "d"); c.set(x + 1, y, "K")


# ── 4. SPOOL ANNEX — a small Box at the front-right discharge end ────────────
def spool_annex(c):
    """A small low annex Box abutting the FRONT discharge end of the shed, housing
    the take-up winder. Placed in the open FRONT apron (in front of the front
    corner) so the reel + extruder line read in clear space, not crammed at the
    canvas edge. Drawn AFTER the shed so it sits in front. Returns the Box so the
    reel can be mounted on its (lit) LEFT face, which catches the light + faces the
    incoming strand from the extruder on its left."""
    a = Box(top=(40, 40), wx=5, wy=5, h=8)
    a.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # a small violet vent slot on its shaded right face (the winder motor housing)
    for vv in (4.0, 5.6):
        c.line(a.right_pt(0.30, vv), a.right_pt(0.70, vv), "d")
    return a


# ── 5. RIGHT-face DISCHARGE BAY — the glowing hero opening (OPENING = RIGHT) ──
def discharge_bay(c, shed):
    """The hero OPENING on the SHADED RIGHT face: a tall K-framed discharge/output
    bay where the extruded polymer exits. Made to GLOW so it reads on the shaded
    side — blue g/c glazing with a bright o/O violet interior melt glow up its
    centre. Kept CLEAN and confined so the extruder/reel hero below reads clearly.
    The right-face u-axis runs r_front(0) -> r_right(1)."""
    du0, du1, dvt, dvb = 0.16, 0.80, 2.6, 10.6
    # solid K opening frame (recessed bay)
    c.fill_poly([shed.right_pt(du0 - 0.015, dvt - 0.5), shed.right_pt(du1 + 0.015, dvt - 0.5),
                 shed.right_pt(du1 + 0.015, dvb + 0.5), shed.right_pt(du0 - 0.015, dvb + 0.5)], "K")
    iu0, iu1 = du0 + 0.03, du1 - 0.03
    ivt, ivb = dvt + 0.4, dvb - 0.3
    # --- blue glazing fills the whole bay (polished lab glass), lit g / shaded G ---
    c.fill_poly([shed.right_pt(iu0, ivt), shed.right_pt(iu1, ivt),
                 shed.right_pt(iu1, ivb), shed.right_pt(iu0, ivb)], "g")
    # --- a bright VIOLET melt column glowing up the CENTRE of the bay (the hot
    # polymer seen through the glass) — a clean vertical band, not a wash ---
    mu0, mu1 = 0.40, 0.58
    c.fill_poly([shed.right_pt(mu0, ivt + 0.6), shed.right_pt(mu1, ivt + 0.6),
                 shed.right_pt(mu1, ivb - 0.4), shed.right_pt(mu0, ivb - 0.4)], "r")
    c.fill_poly([shed.right_pt(mu0 + 0.03, ivt + 1.4), shed.right_pt(mu1 - 0.03, ivt + 1.4),
                 shed.right_pt(mu1 - 0.03, ivb - 1.2), shed.right_pt(mu0 + 0.03, ivb - 1.2)], "o")
    c.line(shed.right_pt((mu0 + mu1) / 2, ivt + 2.0), shed.right_pt((mu0 + mu1) / 2, ivb - 2.0), "O")
    # --- glass sheen: an h glint high-left, a c band mid (so it reads as glowing glass) ---
    c.line(shed.right_pt(iu0 + 0.02, ivt + 0.9), shed.right_pt(iu0 + 0.30, ivt + 0.9), "h")
    c.line(shed.right_pt(iu0 + 0.02, ivt + 1.6), shed.right_pt(iu0 + 0.22, ivt + 1.6), "c")
    c.line(shed.right_pt(iu1 - 0.22, ivt + 1.2), shed.right_pt(iu1 - 0.02, ivt + 1.2), "c")
    # --- K mullion grid (industrial glazing) flanking the melt column ---
    c.line(shed.right_pt(mu0, ivt), shed.right_pt(mu0, ivb), "K")
    c.line(shed.right_pt(mu1, ivt), shed.right_pt(mu1, ivb), "K")
    cmidv = (ivt + ivb) / 2
    c.line(shed.right_pt(iu0, cmidv), shed.right_pt(mu0, cmidv), "K")
    c.line(shed.right_pt(mu1, cmidv), shed.right_pt(iu1, cmidv), "K")
    # bright O crest along the bay head + a violet r sill glow (it GLOWS top + bottom)
    c.line(shed.right_pt(iu0, ivt + 0.2), shed.right_pt(iu1, ivt + 0.2), "O")
    c.line(shed.right_pt(iu0, ivb - 0.1), shed.right_pt(iu1, ivb - 0.1), "r")


# ── 6. SIGNATURE — screw extruder drawing a molten strand onto a take-up reel ─
def extruder_line(c, shed, annex):
    """The one-of-one hero, laid out as THREE clean, well-spaced elements across the
    open FRONT apron so it reads extruder -> strand -> reel at a glance:
      1. a screw extruder on the LEFT (K-outlined M/D/L horizontal barrel + a small
         feed hopper + a K die head with an o/O violet melt glow);
      2. ONE clean molten strand drawn off — hot O/o at the die, cooling to a single
         smooth c sag line across the clear apron;
      3. a tidy TAKE-UP REEL on the annex's lit left face (two concentric c/g wound
         turns + an h hub + ONE o rotation tick).
    No config panel, chain-link glyph, or scattered mist pixels — just the 3 elements."""
    # The reel sits centred on the annex LIT LEFT face (catches light, faces the
    # incoming strand). Annex left face: r_left(30,45)->r_front(40,50).
    reel_cx, reel_cy = 38, 49
    # --- extruder barrel: a horizontal cylinder in the open apron to the LEFT of
    # the reel, pointing RIGHT toward it. Sits clear of the shed footprint. ---
    by = 48                                       # barrel centreline
    bx0, bx1 = 13, 22                             # back (feed) -> front (die) end
    hline(c, bx0, bx1, by - 1, "L")               # lit top
    hline(c, bx0, bx1, by, "M")                   # mid
    hline(c, bx0, bx1, by + 1, "D")               # shaded base
    hline(c, bx0, bx1, by - 2, "K")               # top outline
    hline(c, bx0, bx1, by + 2, "K")               # bottom outline
    vline(c, bx0 - 1, by - 1, by + 1, "K")        # feed (back) cap
    # a single clean screw glint on the lit barrel top (the turning screw inside)
    c.set((bx0 + bx1) // 2, by - 1, "W")
    # screw-feed hopper rising off the BACK end (the polymer pellet feed) — a clean
    # K-outlined trapezoid with a lit M throat (the one feature at the feed end)
    c.set(bx0 + 1, by - 3, "M"); c.set(bx0 + 2, by - 3, "M")
    c.set(bx0, by - 3, "K"); c.set(bx0 + 3, by - 3, "K")
    c.set(bx0 + 1, by - 4, "K"); c.set(bx0 + 2, by - 4, "K")
    # ONE clean support leg pair to the ground (mounted, not floating)
    vline(c, bx0 + 5, by + 3, by + 6, "d"); c.set(bx0 + 5, by + 6, "K")
    vline(c, bx1 - 2, by + 3, by + 6, "d"); c.set(bx1 - 2, by + 6, "K")
    # --- die head at the discharge (front) end: a K block with a violet melt glow --
    dx = bx1 + 1
    vline(c, dx, by - 2, by + 2, "K")
    vline(c, dx + 1, by - 2, by + 2, "K")
    c.set(dx, by, "O"); c.set(dx + 1, by, "O")    # bright melt core in the die
    c.set(dx + 2, by - 1, "o")                    # hot melt fanning out of the mouth
    c.set(dx + 2, by, "o")
    c.set(dx + 2, by + 1, "r")
    # --- the drawn strand: ONE clean smooth line. Leaves the die hot (O/o), cools
    # to c as it sags right across the CLEAR apron to the reel. No glyphs, no mist. ---
    die_pt = (dx + 2, by)
    reel_pt = (reel_cx - 6, reel_cy - 1)          # where the strand meets the reel rim
    psag(c, die_pt, reel_pt, 2, "c")              # cooled cyan body of the strand
    # hot first ~3px off the die overdraw the cyan with O/o (the only hot spot)
    c.set(die_pt[0], die_pt[1], "O"); c.set(die_pt[0] + 1, die_pt[1], "o")
    c.set(die_pt[0] + 2, die_pt[1], "o")

    # --- TAKE-UP REEL on the annex left face: a clear disc with concentric c/g
    # wound turns + an o rotation tick. rx=5 ry≈3.4 (2:1-ish). ---
    for yy in range(-4, 5):                        # shaded G disc body
        for xx in range(-5, 6):
            if (xx / 5.2) ** 2 + (yy / 3.6) ** 2 <= 1:
                c.set(reel_cx + xx, reel_cy + yy, "G")
    for ang in range(0, 360, 12):                  # K rim
        x = reel_cx + 5.2 * math.cos(math.radians(ang))
        y = reel_cy + 3.6 * math.sin(math.radians(ang))
        c.set(x, y, "K")
    for ri, rr in enumerate((4.0, 2.4)):           # two clean concentric wound turns
        col = "c" if ri == 0 else "g"
        for ang in range(0, 360, 16):
            x = reel_cx + rr * math.cos(math.radians(ang))
            y = reel_cy + rr * 0.69 * math.sin(math.radians(ang))
            c.set(x, y, col)
    c.set(reel_cx, reel_cy, "h")                   # bright hub glint
    c.set(reel_cx, reel_cy - 1, "K")               # axle pin
    c.set(reel_cx + 2, reel_cy - 2, "O")           # ONE clean rotation tick (it winds)
    # reel support stand to the ground
    vline(c, reel_cx, reel_cy + 4, reel_cy + 6, "d"); c.set(reel_cx, reel_cy + 6, "K")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS extrusion /
# melt / fiber-drawing structure onto the prior form — never restarts, never
# recolors the whole building. Theme: the single extrusion line grows into a fully
# built-out continuous fiber-spinning plant. Colours mature stage by stage; the
# energized teal process glow (e/E) arrives at t4 on the drawn filaments; gold (q)
# only as a t5 flourish on the die-plate + spool flange.
#
#   t2  small functional add : an extra PELLET HOPPER + a small drawn-fiber SPOOL
#   t3  structural add       : a MELT-PUMP + banded SCREW-BARREL extruder annex
#   t4  major add            : a tall COOLING/DRAWING TOWER off the roof
#   t5  crowning feature     : a glowing MULTI-FILAMENT FIBER CROWN + gold trim
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_pellet_hopper(c, shed):
    """t2 — SMALL FUNCTIONAL ADD: an extra raw-PELLET FEED HOPPER standing on the
    front apron at the extruder feed end (a tall K-outlined funnel bin brimming with
    o/O violet polymer pellets, a short snout dropping to the barrel), PLUS a small
    extra TAKE-UP SPOOL of drawn c fiber stood upright on its own stand on the apron
    just LEFT of the main reel (a spare fiber package by the winder), and a
    brightened o/O HEATER-BAND collar on the die. On-theme (more feed + more
    product), modest, base palette only. Both sit in clear apron pockets so they
    never collide with the strand, the main reel, or the discharge bay."""
    # --- a tall conical PELLET HOPPER bin standing on the apron, feed-end side ---
    hx = 10                                        # left of the barrel feed cap (bx0=13)
    htop = 34                                      # bin shoulders up high on the apron
    hbot = 45                                      # funnel throat sits at apron level
    # rectangular bin body (lit L/M front, D shaded right), 4px wide, hard K outline
    for yy in range(htop, htop + 5):
        c.set(hx, yy, "M"); c.set(hx + 1, yy, "M"); c.set(hx + 2, yy, "D")
    vline(c, hx - 1, htop, htop + 5, "K")          # left edge
    vline(c, hx + 3, htop, htop + 5, "K")          # right edge
    hline(c, hx, hx + 2, htop - 1, "K")            # bin top rim
    c.set(hx, htop, "L")                            # lit inner corner
    # pellets brimming at the open top (violet o/O beads)
    c.set(hx, htop, "o"); c.set(hx + 1, htop, "O"); c.set(hx + 2, htop, "o")
    # funnel taper from the bin base down to a narrow throat (converging K walls)
    sh = htop + 5
    for j, yy in enumerate(range(sh, hbot)):
        lxp = hx + j                                # walls converge as we descend
        rxp = hx + 2 - j
        if rxp < lxp:
            break
        for xx in range(lxp, rxp + 1):
            c.set(xx, yy, "M" if xx <= hx else "D")
        c.set(lxp - 1, yy, "K"); c.set(rxp + 1, yy, "K")
    # a short feed snout dropping toward the extruder barrel + an o flow bead
    c.set(hx + 1, hbot, "K"); c.set(hx + 1, hbot + 1, "o")
    # two support legs to the ground (so it stands, not floats)
    vline(c, hx, hbot + 1, hbot + 3, "d"); c.set(hx, hbot + 3, "K")
    vline(c, hx + 2, hbot + 1, hbot + 3, "d"); c.set(hx + 2, hbot + 3, "K")

    # --- a small extra upright TAKE-UP SPOOL on a stand, just LEFT of the main reel
    #     (the base reel is centred ~38,49; tuck this spare at ~29,53 on the apron) ---
    sx, sy = 29, 52
    for yy in range(-2, 3):                        # small G disc face (upright bobbin)
        for xx in range(-2, 3):
            if (xx / 2.4) ** 2 + (yy / 2.2) ** 2 <= 1:
                c.set(sx + xx, sy + yy, "G")
    for ang in range(0, 360, 30):                  # K rim
        c.set(sx + 2.4 * math.cos(math.radians(ang)),
              sy + 2.2 * math.sin(math.radians(ang)), "K")
    for ang in range(0, 360, 45):                  # one c wound turn of drawn fiber
        c.set(sx + 1.4 * math.cos(math.radians(ang)),
              sy + 1.3 * math.sin(math.radians(ang)), "c")
    c.set(sx, sy, "h")                             # bright hub glint
    vline(c, sx, sy + 3, sy + 5, "d"); c.set(sx, sy + 5, "K")   # short stand to ground

    # --- brightened o/O HEATER-BAND collar on the die head (the t2 'spark') ---
    # the base die head sits at x=23..24, centreline y=48; collar a glow just above it
    c.set(23, 46, "o"); c.set(24, 46, "O"); c.set(25, 46, "o")
    c.set(24, 45, "O")


def stage3_screwbarrel_annex(c, shed):
    """t3 — STRUCTURAL ADD: a banded SCREW-BARREL EXTRUDER + MELT-PUMP added as the
    heated screw section stacked directly ABOVE the base extruder barrel, in the
    clear apron band just under the lit-left wall foot — a long deep-steel `b`
    cylinder ringed by o/O-glowing heater zones, with a square gear/melt-PUMP drive
    box on its back (feed) end and a short feed throat dropping into the base barrel
    below. A real new structural mass extending the line UPSTREAM (the line is now a
    two-stage extruder) while staying clear of the sawtooth, discharge bay, strand,
    and reel. Introduces the matured deep-steel `b`.

    Horizontal so it never crosses the strand/reel: it occupies the apron rows just
    above the base barrel (base barrel top is y47), running x10..22 toward the die."""
    bx0, bx1 = 10, 21                              # feed (back) -> melt-out (front)
    by = 44                                         # screw-barrel centreline (above base barrel)
    # --- the banded barrel: a deep-steel cylinder, lit top / shaded base, K outline -
    hline(c, bx0, bx1, by - 2, "M")                # lit top edge
    hline(c, bx0, bx1, by - 1, "b")                # body
    hline(c, bx0, bx1, by, "b")
    hline(c, bx0, bx1, by + 1, "d")                # shaded underside
    hline(c, bx0, bx1, by - 3, "K")                # top outline
    hline(c, bx0, bx1, by + 2, "K")                # bottom outline
    vline(c, bx1 + 1, by - 2, by + 1, "K")         # front (melt-out) cap
    # --- o/O-glowing HEATER-ZONE bands wrapped around the barrel at intervals ---
    for x in (bx0 + 2, bx0 + 5, bx0 + 8, bx0 + 11):
        c.set(x, by - 2, "O"); c.set(x, by - 1, "o"); c.set(x, by, "o")
        c.set(x, by + 1, "r")                       # band glow reaching the underside
    # --- a square gear / melt-PUMP drive box on the BACK (feed) end of the barrel ---
    gx0, gy0 = bx0 - 4, by - 3
    for yy in range(gy0, gy0 + 6):
        for xx in range(gx0, gx0 + 4):
            c.set(xx, yy, "M" if xx <= gx0 + 1 else "D")
    for a, b in [((gx0, gy0), (gx0 + 3, gy0)), ((gx0, gy0 + 5), (gx0 + 3, gy0 + 5)),
                 ((gx0, gy0), (gx0, gy0 + 5)), ((gx0 + 3, gy0), (gx0 + 3, gy0 + 5))]:
        c.line(a, b, "K")
    c.set(gx0 + 1, gy0 + 2, "c")                    # drive-shaft hub glint
    c.set(gx0, gy0 + 1, "L")
    # --- a short feed THROAT dropping from the barrel front-mouth into the base
    #     barrel/die below (ties the new screw section to the existing line) ---
    vline(c, bx1, by + 2, by + 4, "D")
    c.set(bx1, by + 4, "K")
    c.set(bx1 + 1, by + 1, "o")                     # a hot melt bead at the mouth


def stage4_drawing_tower(c, shed):
    """t4 — MAJOR ADD: a tall COOLING / DRAWING TOWER rising off the BACK of the
    roof — a slender deep-steel `b` lattice frame whose top crossbar carries a row
    of GODET ROLLERS, and up which several molten filaments climb from the line,
    cooling and glowing energized teal `e/E`. The prominent new vertical mass that
    says 'this line now spins continuous fiber'. Palette matures: deep `b` frame +
    energized `e/E` filaments. Foot anchored on a back-CENTRE roof point (clear of
    the front extruder hero and to the LEFT of the discharge bay); height clamped via
    TOWER_H so the frame head + the t5 crown above it stay on-canvas."""
    # foot on the roof deck, back-centre-left (between the sawtooth and the front edge)
    fx, fy = shed.roof_pt(0.42, 0.42)
    fx = int(round(fx)); foot_y = int(round(fy))
    top_y = max(2, foot_y - TOWER_H)               # TALL but clamped on-canvas
    half = 4                                        # frame is ~9px wide (two legs)
    lxp, rxp = fx - half, fx + half
    # --- a short b plinth seating the frame on the roof ---
    for dx in range(-half - 1, half + 2):
        c.set(fx + dx, foot_y + 1, "K")            # plinth base shadow line
    hline(c, lxp, rxp, foot_y, "b")
    # --- two vertical lattice LEGS (lit-left M edge, deep-steel body, K outline) ---
    for lx in (lxp, rxp):
        vline(c, lx, top_y, foot_y, "b")
        vline(c, lx - 1, top_y, foot_y, "K")       # K outline outside edge
        vline(c, lx + 1, top_y, foot_y, "K")
    vline(c, lxp, top_y, foot_y, "M")              # lit-left leg catches light
    # --- X cross-bracing rungs up the frame (the lattice) ---
    for yy in range(top_y + 3, foot_y - 1, 5):
        c.line((lxp + 1, yy), (rxp - 1, yy + 3), "b")
        c.line((rxp - 1, yy), (lxp + 1, yy + 3), "b")
    # --- the GODET-ROLLER crossbar across the frame TOP (the fiber rides over it) ---
    bar_y = top_y
    hline(c, lxp - 1, rxp + 1, bar_y, "M")         # lit top chord
    hline(c, lxp - 1, rxp + 1, bar_y + 1, "b")     # bar body
    hline(c, lxp - 1, rxp + 1, bar_y + 2, "K")     # under-edge
    # a row of small godet rollers (drums) seated on the crossbar
    for rcx in (lxp + 1, fx, rxp - 1):
        c.set(rcx, bar_y - 1, "L")                 # lit roller cap
        c.set(rcx, bar_y - 2, "M")
        c.set(rcx - 1, bar_y - 1, "K"); c.set(rcx + 1, bar_y - 1, "K")
        c.set(rcx, bar_y - 3, "K")                 # roller top
    # --- the molten FILAMENTS climbing the frame, energized teal (e mid / E bright):
    # several thin strands rising from just above the line up to the godet rollers,
    # each cooling-glowing, fanning slightly so they read as multiple filaments ---
    foot_strands = [(fx - 2, foot_y - 1), (fx, foot_y - 1), (fx + 2, foot_y - 1)]
    head_targets = [(lxp + 1, bar_y), (fx, bar_y), (rxp - 1, bar_y)]
    for (sxp, syp), (txp, typ) in zip(foot_strands, head_targets):
        steps = syp - typ
        for k in range(steps + 1):
            t = k / max(steps, 1)
            x = int(round(sxp + (txp - sxp) * t))
            y = syp - k
            c.set(x, y, "E" if k % 5 == 0 else "e")
    # a faint e glow pool where the filaments gather at the line foot
    c.set(fx - 1, foot_y - 1, "e"); c.set(fx + 1, foot_y - 1, "e")


def stage5_fiber_crown(c, shed):
    """t5 — CROWNING FEATURE = FULLY EVOLVED fiber-spinning plant. The drawing tower
    is crowned by a glowing MULTI-FILAMENT FIBER CROWN: a fan of bright energized
    `E` drawn strands sweeping up off the godet rollers and converging onto a premium
    CREEL drum mounted above the tower head — and the works is dressed out with GOLD
    premium trim (a `q` gold DIE-PLATE band on the extruder die + a `q` gold FLANGE
    on the take-up reel + a gold crown rail on the creel). Reads as elite, still
    recognizably the same extrusion line, just maxed out.

    Re-anchors the tower head from the SAME source stage4 used
    (shed.roof_pt(0.42,0.42) + TOWER_H) so the crown sits exactly on the tower top."""
    # recompute the tower head EXACTLY as stage4 did (do not hardcode a 2nd guess)
    fx, fy = shed.roof_pt(0.42, 0.42)
    fx = int(round(fx)); foot_y = int(round(fy))
    top_y = max(2, foot_y - TOWER_H)
    half = 4
    lxp, rxp = fx - half, fx + half
    bar_y = top_y                                   # the godet crossbar row (from stage4)

    # --- a premium CREEL DRUM mounted on a short post above the tower head ---
    # creel centre is clamped so the gold finial above it (creel_cy-4) stays >= row 1
    creel_cy = max(5, bar_y - 4)                     # drum centre, a touch above the bar
    vline(c, fx, creel_cy + 2, bar_y - 1, "b")      # short support post off the crossbar
    vline(c, fx - 1, creel_cy + 2, bar_y - 1, "K")
    # the creel: a small drum the bright fiber winds onto (G body, c/E wound turns)
    for yy in range(-2, 3):
        for xx in range(-4, 5):
            if (xx / 4.2) ** 2 + (yy / 2.4) ** 2 <= 1:
                c.set(fx + xx, creel_cy + yy, "G")
    for ang in range(0, 360, 18):                   # K rim
        c.set(fx + 4.2 * math.cos(math.radians(ang)),
              creel_cy + 2.4 * math.sin(math.radians(ang)), "K")
    for ang in range(0, 360, 24):                   # bright wound fiber turns
        c.set(fx + 3.0 * math.cos(math.radians(ang)),
              creel_cy + 1.6 * math.sin(math.radians(ang)), "E")
    for ang in range(0, 360, 36):
        c.set(fx + 1.6 * math.cos(math.radians(ang)),
              creel_cy + 0.9 * math.sin(math.radians(ang)), "e")
    c.set(fx, creel_cy, "W")                        # bright hub glint

    # --- the FIBER-CROWN FAN: bright E strands sweeping up off the three godet
    # rollers and converging onto the creel drum (the maxed multi-filament read) ---
    roller_pts = [(lxp + 1, bar_y - 1), (fx, bar_y - 1), (rxp - 1, bar_y - 1)]
    creel_in = (fx, creel_cy + 2)
    for (rxx, ryy) in roller_pts:
        steps = max(abs(creel_in[0] - rxx), abs(creel_in[1] - ryy), 1)
        for k in range(steps + 1):
            t = k / steps
            x = int(round(rxx + (creel_in[0] - rxx) * t))
            y = int(round(ryy + (creel_in[1] - ryy) * t))
            c.set(x, y, "E" if k % 2 == 0 else "e")
    # a few bright sparkle beads along the converging crown
    c.set(fx - 2, bar_y - 3, "E"); c.set(fx + 2, bar_y - 3, "E")

    # --- GOLD premium trim (t5 flourish only) ---
    # 1) a gold DIE-PLATE band wrapped on the extruder die head (base die at x=23..24,
    #    centreline y=48): a short q gold plate with an O highlight — the premium die.
    c.set(23, 47, "q"); c.set(24, 47, "q")
    c.set(23, 48, "O"); c.set(24, 48, "q")
    c.set(23, 49, "q"); c.set(24, 49, "q")
    # 2) a gold FLANGE rim on the take-up reel (base reel centre ~38,49, rx≈5.2):
    #    a few q gold pixels riding the reel rim as a premium spool flange.
    rc_x, rc_y = 38, 49
    for ang in (210, 240, 270, 300, 330):
        c.set(rc_x + 5.2 * math.cos(math.radians(ang)),
              rc_y + 3.6 * math.sin(math.radians(ang)), "q")
    c.set(rc_x, rc_y + 4, "O")                      # bright flange boss at the rim foot
    # 3) a short gold crown RAIL across the creel top (the elite finishing trim)
    hline(c, fx - 3, fx + 3, creel_cy - 3, "q")
    c.set(fx, creel_cy - 4, "O")                    # a tiny gold finial above the creel


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the polymer-workshop at upgrade `stage` (1..5). Stage 1 is IDENTICAL
    to the shipped base; each higher stage keeps every prior addition and bolts on
    the next (t2 pellet-hopper+spool → t3 screw-barrel annex → t4 drawing-tower → t5
    fiber-crown + gold). Painter's order keeps the back-rising roof tower drawn
    BEFORE the front extruder hero so the hero stays front-most, while the front-apron
    additions (hopper, gold die-plate/flange, fiber crown) are layered so they sit on
    top of the masses they grow from."""
    c = Canvas()
    # painter's order: shed body (back), sawtooth roof behind, lit-face detail,
    # then the spool annex (front), the right-face discharge bay, and finally the
    # extruder line + reel hero on top.
    shed = main_shed(c)
    wall_seams(c, shed)
    sawtooth_roof(c, shed)
    left_face(c, shed)
    annex = spool_annex(c)
    discharge_bay(c, shed)

    # --- CUMULATIVE UPGRADE STAGES -----------------------------------------------
    # The drawing TOWER (t4) + its fiber CROWN (t5) rise off the BACK roof: draw them
    # BEFORE the front extruder hero so the hero strand/reel stays front-most. The t3
    # screw-barrel annex runs along the lit-left foot (also behind the hero). The t2
    # hopper/spool sit on the front apron and the t5 gold die-plate/flange ride the
    # hero parts, so they are drawn AFTER the hero (front-most) below.
    if stage >= 3:
        stage3_screwbarrel_annex(c, shed)
    if stage >= 4:
        stage4_drawing_tower(c, shed)

    # the extruder/strand/reel signature is the front-most hero of the BASE form
    extruder_line(c, shed, annex)

    # front-apron + on-hero upgrade dressing drawn AFTER the hero so it reads on top
    if stage >= 2:
        stage2_pellet_hopper(c, shed)
    if stage >= 5:
        stage5_fiber_crown(c, shed)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/chemworks"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "polymer-workshop"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped polymer-workshop.png, so it does NOT overwrite the base
    PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": CHEM, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"chemworks_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"chemworks_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
