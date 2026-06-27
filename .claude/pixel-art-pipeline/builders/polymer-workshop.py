#!/usr/bin/env python3
"""
Polymer Workshop — ChemWorks economy building (BESPOKE FORM).

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
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

CHEM = {"K": "#161a2e", "W": "#e6ecfb", "L": "#c2cdee", "M": "#9aa8d8", "D": "#6f7cb0", "d": "#4b5688",
        "h": "#d6ecff", "c": "#a8d4ff", "g": "#4aa0e6", "G": "#2166b0",
        "o": "#c89cf0", "O": "#e0c2ff", "r": "#6a34a8"}


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


def build():
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
    extruder_line(c, shed, annex)

    spec = {"width": 64, "height": 64, "palette": CHEM, "rows": c.rows()}
    out = "/path/to/scienium/art/src/buildings/chemworks_polymer-workshop.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
