#!/usr/bin/env python3
"""
Microscopy Suite — BioCore economy building (BESPOKE form, STANDARD role).

A COMPACT IMAGING PAVILION with a DOMED OPTICS-DRUM TURRET. The body is a low
square `Box` (a controlled-light imaging room, darker M/D walls with D/d wood
seams), and riding the BACK of its flat roof is a short `cylinder` optics drum
capped by a low L/W dome lens with a c porthole band — the optics turret. This
drum-on-a-box silhouette is distinct from the Greenhouse gable, the Vault block
and the Volt AI-Incubator's wide standalone drum (here the drum is a SMALL
turret on a box).

  • OPENING SIDE = LEFT: the hero is a wide K-framed glass garage-style
    imaging-bay door on the LIT LEFT face — g/c panes, h reflections, a soft o
    interior grow-glow — the way samples roll in. The RIGHT face is plainer
    (one small c porthole).
  • SIGNATURE (one-of-one): a giant microscope EYEPIECE barrel tilts up-left from
    the turret and projects a huge magnified live-cell HOLOGRAM above the roof —
    a translucent c/h disc holding a round cell (g membrane ring, G/g cytoplasm,
    O/o nucleus, c organelle dots, a faint pinch = mid-division), fed by a thin
    o/O projector cone, ringed by a c glow halo + h sparkles, with a tiny g
    micron scale-bar tick selling the magnification.

Composed from art/isobuild.{Box,cylinder} — NO iso.draw_cube / base_windows.
BioCore palette ONLY (greens + teal + warm amber, never grey).
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

BIO = {"K": "#1a2417", "W": "#e8f2d8", "L": "#c4dba6", "M": "#9fc07e", "D": "#6f9456", "d": "#4a6e3a",
       "h": "#d2f7ec", "c": "#9fefcf", "g": "#36cc9e", "G": "#1d8f70",
       "o": "#f0b24d", "O": "#ffd488", "r": "#b9701e",
       # EVOLVED accent keys — used ONLY in stage2+ helpers (stage 1 unchanged). BioCore's
       # mature glow is bio-luminescent green-teal (a confocal-laser bloom here, not electric
       # cyan); gold (`q`) is a t5 flourish only, never a whole-building recolor.
       #   b  deep cool optics-housing green  — matured structure tone (t3 darkroom, t4 drum)
       #   e  confocal glow (mid)   E  confocal glow (bright) — the t4 laser dome / t5 channels
       #   q  premium gold trim — t5 only
       "b": "#2f4a2a", "e": "#74f0b6", "E": "#ccffe4", "q": "#f3c63a"}


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


def disc(c, cx, cy, rx, ry, ch, half=None):
    """Filled iso ellipse. If `half` is 'l'/'r', only that side is filled."""
    for yy in range(int(-ry), int(ry) + 1):
        t = 1 - (yy / ry) ** 2
        if t < 0:
            continue
        hw = rx * (t ** 0.5)
        for xx in range(int(-hw), int(hw) + 1):
            if half == "l" and xx > 0:
                continue
            if half == "r" and xx < 0:
                continue
            c.set(cx + xx, cy + yy, ch)


# ── VERTICAL BUDGET (top→bottom, all must fit 64px) ───────────────────────────
#   hologram disc   y ~ 1..17   (centre 9, r 8)
#   eyepiece barrel y ~ 16..24
#   optics turret   y ~ 20..30  (rides the BACK roof of the body)
#   body roof       back corner y ~ 27 .. front corner y ~ 38
#   body walls      y ~ 38..50
# ── BODY GEOMETRY ─────────────────────────────────────────────────────────────
# Low square box; back-top corner high enough that the turret sits ON the roof.
BODY_TOP = (30, 27)
BODY_WX = 11
BODY_WY = 11
BODY_H = 12

# Optics drum turret: a short cylinder riding the BACK-CENTRE of the flat roof.
# Placed so its base ellipse sits down on the roof's back-centre (~y 28).
TURRET_CX = 30
TURRET_TOP_Y = 23           # top-ellipse centre of the drum
TURRET_RX = 6
TURRET_RY = 3
TURRET_H = 5


# ── BODY (a low controlled-light imaging room) ───────────────────────────────
def body(c):
    """Low square Box — darker M/D walls (controlled light) with D/d wood-frame
    seams + thin c indicator dots. Returns the Box for face placement."""
    b = Box(BODY_TOP, BODY_WX, BODY_WY, BODY_H)
    b.draw(c, roof="D", lwall="M", rwall="D", roof_hi="L", outline="K")

    # darken the roof a touch (controlled-light room reads matte) + wood seam grid
    # roof seam lines running both roof axes (D/d wood frame)
    for f in (0.34, 0.66):
        c.line(b.roof_pt(0.0, f), b.roof_pt(1.0, f), "d")
        c.line(b.roof_pt(f, 0.0), b.roof_pt(f, 1.0), "d")
    # a brighter L back-roof edge already set by draw(); add one L sheen ridge
    c.line(b.roof_pt(0.0, 0.5), b.roof_pt(0.5, 0.5), "L")

    # --- wood-frame corner seams (D/d) down the two lit/shaded faces ---
    c.line(b.r_front, b.w_front, "d")                       # front corner (deep)
    c.line(b.left_pt(0.0, 0), b.left_pt(0.0, BODY_H), "D")  # left back jamb
    c.line(b.right_pt(1.0, 0), b.right_pt(1.0, BODY_H), "d")

    # thin c indicator dots along the right face (status LEDs of the dark room)
    for u in (0.30, 0.55, 0.80):
        p = b.right_pt(u, 2.0)
        c.set(p[0], p[1], "c")
    return b


# ── LEFT imaging-bay door (the HERO opening) ─────────────────────────────────
def bay_door(c, b):
    """A wide K-framed glass garage-style imaging-bay door filling the LIT LEFT
    face — g/c panes following the iso, h reflection sweep, soft o interior glow
    spilling at the threshold. This is the dominant feature of the building and
    marks the opening side as LEFT."""
    u0, u1 = 0.10, 0.92
    vt, vb = 2.2, BODY_H - 0.6

    # K outer frame (filled rect behind the glass)
    c.fill_poly([b.left_pt(u0, vt), b.left_pt(u1, vt),
                 b.left_pt(u1, vb), b.left_pt(u0, vb)], "K")

    # one clean glass leaf inset from the K frame
    gi = 0.04
    gu0, gu1, gvt, gvb = u0 + gi, u1 - gi, vt + 0.9, vb - 0.5
    c.fill_poly([b.left_pt(gu0, gvt), b.left_pt(gu1, gvt),
                 b.left_pt(gu1, gvb), b.left_pt(gu0, gvb)], "g")
    # three clean vertical light bands across the leaf (lit c -> g -> shaded G)
    third = (gu1 - gu0) / 3.0
    c.fill_poly([b.left_pt(gu0, gvt), b.left_pt(gu0 + third, gvt),
                 b.left_pt(gu0 + third, gvb), b.left_pt(gu0, gvb)], "c")
    c.fill_poly([b.left_pt(gu1 - third, gvt), b.left_pt(gu1, gvt),
                 b.left_pt(gu1, gvb), b.left_pt(gu1 - third, gvb)], "G")

    # two K vertical mullions = the three garage panes
    for um in (gu0 + third, gu1 - third):
        c.line(b.left_pt(um, gvt), b.left_pt(um, gvb), "K")
    # ONE horizontal slat seam (K) mid-door
    midv = gvt + (gvb - gvt) * 0.5
    c.line(b.left_pt(gu0, midv), b.left_pt(gu1, midv), "K")

    # bright h reflection diagonal across the lit pane only
    c.line(b.left_pt(gu0 + 0.02, gvt + 0.6), b.left_pt(gu0 + third - 0.02, gvt + 1.8), "h")

    # soft o INTERIOR GROW-GLOW spilling at the threshold (bottom of the bay)
    c.line(b.left_pt(gu0, gvb), b.left_pt(gu1, gvb), "o")
    c.line(b.left_pt(gu0 + 0.05, gvb + 0.4), b.left_pt(gu1 - 0.05, gvb + 0.4), "O")


def right_porthole(c, b):
    """The plainer RIGHT face gets a single small round c porthole only."""
    p = b.right_pt(0.62, 4.5)
    cx, cy = int(round(p[0])), int(round(p[1]))
    # K rim ring
    for a in range(0, 360, 30):
        x = cx + 2 * math.cos(math.radians(a))
        y = cy + 2 * math.sin(math.radians(a))
        c.set(x, y, "K")
    disc(c, cx, cy, 1.4, 1.4, "G")
    c.set(cx, cy, "c")
    c.set(cx - 1, cy - 1, "h")


# ── OPTICS DRUM TURRET (a small cylinder + dome riding the back roof) ─────────
def optics_turret(c):
    """A short polished optics drum on the back-centre of the roof: M/D cylinder,
    a c porthole band wrapping it, capped by a low L/W dome lens. Plus a small D
    cable conduit running from the drum down the roof."""
    cylinder(c, TURRET_CX, TURRET_TOP_Y, TURRET_RX, TURRET_H,
             top="D", side_l="M", side_r="D", outline="K", ry=TURRET_RY)
    base_y = TURRET_TOP_Y + TURRET_H

    # one soft L sheen column on the lit half of the drum
    for col, ch in ((-3, "L"), (-2, "W")):
        edge = TURRET_RY * max(0.0, 1 - (col / TURRET_RX) ** 2) ** 0.5
        for y in range(int(TURRET_TOP_Y + edge), base_y + 1):
            c.set(TURRET_CX + col, y, ch)

    # --- c PORTHOLE BAND wrapping the drum (greenhouse-glazing motif) ---
    band_y = TURRET_TOP_Y + 2
    for col in range(-TURRET_RX + 1, TURRET_RX):
        t = 1 - (col / TURRET_RX) ** 2
        if t < 0:
            continue
        edge = TURRET_RY * (t ** 0.5)
        yy = int(round(band_y + (TURRET_RY - edge) * 0.5))
        glass = "c" if col <= -2 else ("g" if col <= 2 else "G")
        c.set(TURRET_CX + col, yy, glass)
        c.set(TURRET_CX + col, yy + 1, "G")
    # K rails framing the band + evenly spaced porthole mullions
    for col in range(-TURRET_RX + 1, TURRET_RX):
        t = 1 - (col / TURRET_RX) ** 2
        if t < 0:
            continue
        edge = TURRET_RY * (t ** 0.5)
        yy = int(round(band_y + (TURRET_RY - edge) * 0.5))
        c.set(TURRET_CX + col, yy - 1, "K")
        c.set(TURRET_CX + col, yy + 2, "K")
    for col in range(-TURRET_RX + 2, TURRET_RX - 1, 3):
        t = 1 - (col / TURRET_RX) ** 2
        if t < 0:
            continue
        edge = TURRET_RY * (t ** 0.5)
        yy = int(round(band_y + (TURRET_RY - edge) * 0.5))
        c.set(TURRET_CX + col, yy, "K")
        c.set(TURRET_CX + col, yy + 1, "K")

    # --- low L/W DOME LENS cap on the drum ---
    dome_cx, dome_cy = TURRET_CX, TURRET_TOP_Y - 1
    drx, dry = TURRET_RX - 1, TURRET_RY + 1
    for yy in range(int(-dry), 1):
        t = 1 - (yy / dry) ** 2
        if t < 0:
            continue
        hw = drx * (t ** 0.5)
        for x in range(int(dome_cx - hw), int(dome_cx + hw) + 1):
            c.set(x, dome_cy + yy, "L" if x <= dome_cx else "M")
    # bright W crescent on the lit-back of the dome + a glint
    for a in range(190, 350, 8):
        x = dome_cx + drx * math.cos(math.radians(a))
        y = dome_cy + dry * math.sin(math.radians(a))
        c.set(x, y, "W")
    c.set(dome_cx - 2, dome_cy - 2, "W")
    c.set(dome_cx - 1, dome_cy - 2, "h")
    # K rim along the dome base ellipse (front arc)
    for a in range(0, 181, 8):
        x = dome_cx + drx * math.cos(math.radians(a))
        y = dome_cy + dry * 0.5 * math.sin(math.radians(a))
        c.set(x, y, "K")

    # --- D cable conduit running from the drum base down the front roof ---
    cx0 = TURRET_CX + 3
    for i in range(5):
        c.set(cx0 + i, base_y - 1 + i, "d")
        c.set(cx0 + i, base_y + i, "D")
    return (dome_cx, dome_cy)


# ── SIGNATURE: tilted eyepiece + projected live-cell hologram ────────────────
def eyepiece(c, dome_center):
    """A short tilted eyepiece barrel rising up-LEFT off the turret dome, ending in
    a bright h/W ocular lens — the projector. Kept SHORT + clean (a stout barrel,
    not a long stalk) so the dome stays legible below and the hologram sits clear
    above. Returns the lens tip (cx, cy) for the cone + disc to anchor on."""
    bx, by = dome_center
    bx -= 2                      # root on the lit-left shoulder of the dome
    by -= 1
    # barrel marches up-LEFT (tilted optic) — 6 short steps
    steps = 6
    tip = (bx, by)
    for i in range(steps):
        x = bx - i * 0.85
        y = by - i * 1.1
        xi = int(round(x))
        yi = int(round(y))
        # clean 2px barrel: K left edge, M lit body, D shade
        c.set(xi - 1, yi, "K")
        c.set(xi, yi, "M")
        c.set(xi + 1, yi, "D")
        c.set(xi + 2, yi, "K")
        tip = (xi, yi)
    # the OCULAR lens cup at the top (a small bright disc)
    tx, ty = tip
    for dx in range(-1, 3):
        c.set(tx + dx, ty - 1, "L")
    c.set(tx - 2, ty - 1, "K")
    c.set(tx + 3, ty - 1, "K")
    # bright h/W lens glint
    c.set(tx, ty - 2, "W")
    c.set(tx + 1, ty - 2, "h")
    c.set(tx - 1, ty - 2, "K")
    c.set(tx + 2, ty - 2, "K")
    return (tx, ty - 2)


def cell_hologram(c, lens_tip):
    """A large translucent c/h hologram disc hovering above the roof, holding a
    round live cell mid-division, beamed up from the eyepiece lens by a thin o/O
    projector cone; ringed by a c glow halo, h sparkles + a tiny g micron scale
    bar. The one-of-one signature."""
    lx, ly = lens_tip
    # disc centre: up + slightly LEFT of the lens (along the tilted optic axis)
    dcx = lx - 2
    dcy = ly - 9
    DR = 8                       # disc radius (the big magnified view)

    # --- projector CONE: an amber beam fanning from the lens up into the disc.
    # Drawn FIRST so the disc overlaps its top; two o edges + an O core, widening
    # toward the disc so it reads as a projection cone, not a stick. ---
    cone_top = dcy + DR - 1
    for t in range(0, 9):
        f = t / 8.0
        x = lx + (dcx - lx) * f
        y = ly + (cone_top - ly) * f
        spread = 0.5 + 3.0 * f
        c.set(int(round(x - spread)), int(round(y)), "o")
        c.set(int(round(x + spread)), int(round(y)), "o")
        c.set(int(round(x)), int(round(y)), "O")     # bright core ray

    # --- soft c glow HALO ring (only on empty pixels, painted under the disc) ---
    for a in range(0, 360, 20):
        x = dcx + (DR + 2) * math.cos(math.radians(a))
        y = dcy + (DR + 1) * 0.9 * math.sin(math.radians(a))
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < 64 and 0 <= yi < 64 and c.px[yi][xi] == ".":
            c.set(x, y, "c")

    # --- translucent hologram DISC: c outer wash, h luminous interior ---
    disc(c, dcx, dcy, DR, DR - 0.5, "c")
    disc(c, dcx, dcy, DR - 1.5, DR - 1.5, "h")
    # broken G rim so it reads as a translucent field, not a solid plate
    for a in range(0, 360, 12):
        x = dcx + DR * math.cos(math.radians(a))
        y = dcy + (DR - 0.5) * math.sin(math.radians(a))
        if (a // 12) % 2 == 0:
            c.set(x, y, "G")

    # --- the LIVE CELL: a round cell floating in the magnified h field, smaller
    # than the disc so a translucent h ring shows around it. Built concentric for
    # clean contrast: g membrane -> G cytoplasm -> bright nucleus. ---
    R = DR - 3                                    # cell radius (< disc radius)
    disc(c, dcx, dcy, R, R, "g")                  # green membrane fill
    disc(c, dcx, dcy, R - 1, R - 1, "G")          # darker cytoplasm => ring pops
    # crisp g membrane outline ring
    for a in range(0, 360, 14):
        x = dcx + R * math.cos(math.radians(a))
        y = dcy + R * math.sin(math.radians(a))
        c.set(x, y, "g")
    # 3 small c organelle dots in the cytoplasm
    for ox, oy in ((2, 2), (-2, 2), (2, -2)):
        c.set(dcx + ox, dcy + oy, "c")
    # division FURROW: a clear 2px vertical pinch splitting the cell into 2 lobes
    for dy in range(-R, R + 1):
        c.set(dcx, dcy + dy, "g")                 # bright waist line
    c.set(dcx, dcy - R, "K")                      # top notch
    c.set(dcx, dcy + R, "K")                      # bottom notch
    c.set(dcx - 1, dcy, "G")
    c.set(dcx + 1, dcy, "G")
    # twin daughter NUCLEI (one each side of the furrow) selling mitosis
    disc(c, dcx - 2, dcy - 1, 1.6, 1.4, "o")
    disc(c, dcx + 2, dcy + 1, 1.6, 1.4, "o")
    c.set(dcx - 2, dcy - 1, "O")
    c.set(dcx + 2, dcy + 1, "O")

    # --- h SPARKLES ringing the hologram (premium hover) ---
    for sx, sy in ((-DR - 1, -1), (DR, -3), (1, -DR - 1), (DR - 3, DR - 2)):
        xi, yi = int(round(dcx + sx)), int(round(dcy + sy))
        if 0 <= xi < 64 and 0 <= yi < 64:
            c.set(xi, yi, "h")

    # --- tiny g micron SCALE-BAR tick at the disc's lower-left edge ---
    sb_y = int(round(dcy + DR - 1))
    sb_x = int(round(dcx - 4))
    for i in range(4):
        c.set(sb_x + i, sb_y, "g")
    c.set(sb_x, sb_y - 1, "g")                    # left tick
    c.set(dcx - 1, sb_y - 1, "g")   # right tick


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS imaging / optics
# instrumentation onto the prior pavilion — never restarts, never recolors the whole
# building. Theme: the starter imaging suite grows into a fully built-out CONFOCAL /
# MULTI-CHANNEL microscopy facility. Colours mature stage by stage (deep optics-housing
# `b`, confocal-glow `e/E`); gold (`q`) only as a t5 flourish. Every addition is anchored
# OFF the body/turret geometry and kept clear of the front-LEFT floating CELL HOLOGRAM
# signature (which hovers high up-left, disc centre ~x22 y5, reaching x~32 / y~14).
#
#   t2  small functional add   : a SPECIMEN-FEED RACK (slide-tray tower + feed pipe) on the open
#                                front-left roof + c FOCUS-KNOB box; brighten the o imaging-bay lamp
#   t3  structural add         : a windowless DARKROOM / SAMPLE-PREP annex on the right wall
#   t4  major add              : a second, TALLER OPTICS DRUM raised on the back-right roof, capped
#                                by a glowing e CONFOCAL-LASER dome (dome rises into open sky)
#   t5  crowning feature       : the hologram doubles into a MULTI-CHANNEL CELL ARRAY +
#                                gold rim ring on the optics dome & a gold barrel collar
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_feedrack(c, b):
    """t2 — SMALL FUNCTIONAL ADD: a SPECIMEN-FEED RACK standing PROUD on the OPEN front-left roof
    wedge — a short slim sample-tray tower (a stack of K-framed `c` slide trays on a little `M/D`
    post) that pokes a few px ABOVE the roof slope, fed by a thin `c` feed pipe arcing down from the
    turret drum's lit foot. This is the real new on-theme mass: the kit you load specimens with. It
    fills empty roof-slope sky to the LEFT of the turret (x~17..23, y~31..40) so it extends the
    silhouette, while sitting well below + right of the floating cell HOLOGRAM (which ends ~y10) and
    clear of the up-left eyepiece. Also brighten the `o` interior lamp dot in the imaging-bay door
    (the scope lights up). Modest, base palette + one brightened lamp."""
    base_y = TURRET_TOP_Y + TURRET_H                       # drum foot on the roof (~y28)
    # --- SAMPLE-TRAY TOWER: seat its FOOT on the LEFT roof slope and build UPWARD into the OPEN SKY
    #     band just LEFT of the turret (x~15..20, y~25..33 is empty roof-apex sky) so its trays add
    #     genuinely NEW silhouette, not a recolor of roof pixels. Kept clear of the turret (x>=23)
    #     and BELOW the up-left eyepiece root (the eyepiece barrel sits x16..27, y11..24; this rack
    #     tops out ~y25, under it) and far below the floating hologram (ends ~y10). ---
    mx = 16                                                # left of the turret, on the open roof slope
    foot_y = 34                                            # foot on the lit roof slope
    PW = 3                                                  # post is 3px wide
    top_y = foot_y - 9                                     # rises ~9px -> trays clear the roofline (~y25)
    # the slim post body (lit M left edge, shaded D right edge, K outline) — a clean standing column
    c.fill_poly([(mx, top_y), (mx + PW, top_y), (mx + PW, foot_y), (mx, foot_y)], "M")
    c.line((mx + PW, top_y), (mx + PW, foot_y), "D")       # shaded right edge of the post
    c.line((mx, top_y), (mx, foot_y), "K")
    c.line((mx + PW, top_y), (mx + PW, foot_y), "K")
    c.set(mx, foot_y, "K"); c.set(mx + PW, foot_y, "K")    # crisp feet seam on the roof slope
    # three stacked slide-TRAYS climbing the post (each = a bright c glass tray on a D pan lip), so
    # it clearly reads as a loaded specimen rack. Trays overhang the post a touch so they read.
    for k, ty in enumerate((top_y + 1, top_y + 4, foot_y - 2)):
        c.line((mx - 1, ty), (mx + PW + 1, ty), "D")       # tray pan lip (overhangs both sides)
        c.line((mx - 1, ty - 1), (mx + PW + 1, ty - 1), "c")   # the slide-glass tray (lit)
        c.set(mx - 1, ty - 1, "K"); c.set(mx + PW + 1, ty - 1, "K")
        c.set(mx, ty - 1, "h" if k == 0 else "c")          # bright glint on the top tray
    c.set(mx + 1, top_y, "L")                               # lit cap pip on the post top
    # --- thin c FEED PIPE arcing from the turret drum's lit foot DOWN-LEFT into the rack top (the
    #     sample feed line). Two short legs (down off the drum, then across to the post), kept on the
    #     roof so it reads as one clean conduit, not a stray vertical. ---
    fx0 = TURRET_CX - 4                                    # tap the drum's lit-left foot
    fy0 = base_y - 1
    c.line((fx0, fy0), (fx0 - 2, fy0 + 2), "D")            # elbow down off the drum (shaded conduit)
    c.line((fx0 - 2, fy0 + 2), (mx + PW, top_y + 1), "c")  # the c feed line over to the rack top
    c.set(fx0, fy0, "L")                                   # bright tap glint at the drum foot
    c.set(mx + PW, top_y + 1, "h")                          # feed entering the top tray
    # --- FOCUS-KNOB box: a tiny control box with a bright c dial, on the drum's LIT-LEFT shoulder
    #     (clear of the porthole mullions and of the rack) ---
    kx, ky = TURRET_CX - 4, base_y - 4
    c.fill_poly([(kx, ky), (kx + 2, ky), (kx + 2, ky + 2), (kx, ky + 2)], "D")
    for a, e in [((kx, ky), (kx + 2, ky)), ((kx, ky + 2), (kx + 2, ky + 2)),
                 ((kx, ky), (kx, ky + 2)), ((kx + 2, ky), (kx + 2, ky + 2))]:
        c.line(a, e, "K")
    c.set(kx + 1, ky + 1, "c")                              # the glowing focus dial
    # --- brighten the imaging-bay interior LAMP: a hotter O/o glow pip on the lit-left door
    #     threshold (the door span is u0..u1 = 0.10..0.92, vb≈BODY_H-0.6). ---
    lamp = b.left_pt(0.5, BODY_H - 2.4)
    lx2, ly2 = int(round(lamp[0])), int(round(lamp[1]))
    c.set(lx2, ly2, "O"); c.set(lx2 - 1, ly2, "o"); c.set(lx2 + 1, ly2, "o")
    c.set(lx2, ly2 - 1, "O")                               # lamp flares a touch up the doorway


def stage3_darkroom(c, b):
    """t3 — STRUCTURAL ADD: a windowless DARKROOM / SAMPLE-PREP annex abutting the RIGHT (shaded)
    wall — controlled-light prep for the scope. A self-contained new mass: a small matured
    optics-housing `b` Box stepped onto the open ground at the building's lower-right, its only
    opening a thin `c` SAFELIGHT slit + a `d` light-trap door. Tied to the host by sharing its
    back edge with the right wall. Introduces the matured structure tone `b`. Kept fully
    on-canvas (x ~ 41..61) and away from the up-left hologram."""
    # a low annex box seated against the right wall, pushed to the front-right open ground.
    ann = Box((44, 41), 5, 6, 9)                           # small, lower than the main body
    ann.draw(c, roof="b", lwall="b", rwall="b", roof_hi="d", outline="K")  # windowless, dark housing
    # one faint roof seam so the flat dark roof reads as a built lid, not a void
    c.line(ann.roof_pt(0.0, 0.5), ann.roof_pt(1.0, 0.5), "d")
    # --- thin c SAFELIGHT slit high on the annex's lit-left face (the only light it shows) ---
    s0 = ann.left_pt(0.2, 2.2)
    s1 = ann.left_pt(0.8, 2.2)
    c.line(s0, s1, "c")
    c.line((s0[0], s0[1] + 1), (s1[0], s1[1] + 1), "G")    # the slit's shaded under-edge
    c.set(int(round(s0[0])), int(round(s0[1])), "K")
    c.set(int(round(s1[0])), int(round(s1[1])), "K")
    # --- a d light-trap DOOR low on the lit-left face (a revolving dark entry) ---
    d0u, d1u, dv0, dv1 = 0.30, 0.70, 5.0, 8.6
    c.fill_poly([ann.left_pt(d0u, dv0), ann.left_pt(d1u, dv0),
                 ann.left_pt(d1u, dv1), ann.left_pt(d0u, dv1)], "d")
    for a, e in [(ann.left_pt(d0u, dv0), ann.left_pt(d1u, dv0)),
                 (ann.left_pt(d0u, dv1), ann.left_pt(d1u, dv1)),
                 (ann.left_pt(d0u, dv0), ann.left_pt(d0u, dv1)),
                 (ann.left_pt(d1u, dv0), ann.left_pt(d1u, dv1))]:
        c.line(a, e, "K")
    c.line(ann.left_pt(0.5, dv0), ann.left_pt(0.5, dv1), "K")  # light-trap centre seam
    return ann


def stage4_confocal(c, b):
    """t4 — MAJOR ADD: a SECOND, TALLER OPTICS DRUM raised on the BACK-RIGHT roof beside the
    signature turret, capped by a glowing `e` CONFOCAL-LASER dome — a prominent new turret mass that
    breaks the roofline and says 'this suite now does confocal imaging'. Distinct from the t3
    incubator vessel (which is a low rounded centrifuge down at the front-right ground, x37..54
    y45..63): THIS is a tall standing drum on the roof whose dome rises into the EMPTY sky to the
    RIGHT of the first turret (x~37..50, y~26..40), adding dozens of new silhouette pixels. The drum
    body uses cooler matured `b/d` housing tones; the dome is a bright bio-luminescent `e/E` laser
    lens. Seated back-right so a clear band of open roof shows between the two turrets, and kept well
    clear of the first turret's dome/eyepiece and the up-left hologram."""
    # seat the 2nd drum on the RIGHT roof, pushed RIGHT + a touch FORWARD of the signature turret so
    # it stands as its OWN squat drum on the open right roof (a clear gap of bare roof between the two
    # turrets), its upper body + dome rising into the OPEN SKY band right of the turret (x~38..49,
    # y~28..38 is empty roof sky). roof_pt(0.98,0.60) ≈ (42, 42) -> drum FOOT.
    seat = b.roof_pt(0.98, 0.60)                           # right roof, right + forward of the turret
    cx2 = int(round(seat[0])) + 1                          # ~ x43 (nudged right for a clear gap)
    base2 = int(round(seat[1]))                            # drum FOOT sits here on the roof (~y42)
    RX2, RY2, H2 = 6, 3, 9                                 # a wider, squatter drum -> reads as its own mass
    top2 = base2 - H2                                      # top ellipse centre (~y33)
    # drum body in cooler matured tones: b lit-left, d shaded-right (darker so the curved
    # cylinder form reads against the green roof + open sky), b top
    cylinder(c, cx2, top2, RX2, H2, top="b", side_l="b", side_r="d", outline="K", ry=RY2)
    # a soft L sheen column on the lit half so the tall curved drum reads with volume
    for col, ch in ((-3, "M"), (-2, "L")):
        edge = RY2 * max(0.0, 1 - (col / RX2) ** 2) ** 0.5
        for y in range(int(top2 + edge), base2 + 1):
            c.set(cx2 + col, y, ch)
    # a couple of K hoop rings + two thin c instrument bands wrapping the taller drum
    for yy in (top2 + 2, top2 + 5, base2 - 1):
        for col in range(-RX2 + 1, RX2):
            t = 1 - (col / RX2) ** 2
            if t < 0:
                continue
            edge = RY2 * (t ** 0.5)
            yc = int(round(top2 + (RY2 - edge) * 0.5)) + (yy - top2)
            c.set(cx2 + col, yc, "K")
    for bandc in (top2 + 3, base2 - 3):                    # two lit c instrument bands
        for col in range(-RX2 + 2, RX2 - 1):
            t = 1 - (col / RX2) ** 2
            if t < 0:
                continue
            edge = RY2 * (t ** 0.5)
            yc = int(round(bandc + (RY2 - edge) * 0.5))
            c.set(cx2 + col, yc, "c" if col <= 0 else "G")
    # --- glowing e CONFOCAL-LASER dome capping the new drum (bright e body, E crown) ---
    dcx2, dcy2 = cx2, top2 - 1
    drx2, dry2 = RX2 - 1, RY2 + 1
    for yy in range(int(-dry2), 1):
        t = 1 - (yy / dry2) ** 2
        if t < 0:
            continue
        hw = drx2 * (t ** 0.5)
        for x in range(int(dcx2 - hw), int(dcx2 + hw) + 1):
            c.set(x, dcy2 + yy, "e" if x <= dcx2 else "G")  # lit-left glow, shaded-right
    # bright E crown highlight + a confocal scan glint off the top
    c.set(dcx2 - 1, dcy2 - 2, "E"); c.set(dcx2, dcy2 - 2, "E")
    c.set(dcx2 - 2, dcy2 - 1, "e")
    c.set(dcx2, dcy2 - 3, "E")                              # a short scan-beam pip rising
    # K rim along the dome base front arc
    for a in range(0, 181, 12):
        x = dcx2 + drx2 * math.cos(math.radians(a))
        y = dcy2 + dry2 * 0.5 * math.sin(math.radians(a))
        c.set(x, y, "K")
    # a short b cable conduit tying the new drum foot back down onto the roof toward the body front
    for i in range(4):
        c.set(cx2 + RX2 - 1 + i, base2 + i, "b")
        c.set(cx2 + RX2 - 1 + i, base2 + 1 + i, "K")
    return (dcx2, dcy2)


def stage5_multichannel(c, b, lens_tip, dome2_center):
    """t5 — CROWNING FEATURE = FULLY EVOLVED confocal suite. The single live-cell hologram blooms
    into a MULTI-CHANNEL CELL ARRAY: a SECOND smaller cell disc is projected stacked above-left of
    the original (a fluorescence-channel split), rendered in bright bio-luminescent `E` with `c`
    channel sparkles + a thin `o` co-projection ray tying it to the eyepiece. Then GOLD premium
    trim (t5 only): a gold RIM RING around the t4 confocal dome and a gold BARREL COLLAR on the
    eyepiece. Reads as elite, still recognizably the same microscopy suite, just maxed out. The
    second disc rises into the empty sky LEFT of the original so the signature stays uncrowded;
    all `q` gold lives ONLY here."""
    lx, ly = lens_tip
    # original hologram disc centre (recomputed from the lens, same as cell_hologram) so we anchor
    # the 2nd channel off the SAME source point, not a hardcoded guess.
    dcx, dcy = lx - 2, ly - 9                               # primary disc centre (~22,5)
    DR = 8
    # --- SECOND CHANNEL DISC: a smaller fluorescence-split view floating in the open sky to the
    #     LEFT of (and a touch below) the primary so it reads as a DISTINCT second bloom, not part
    #     of the primary halo. The primary spans x~14..30; place this one's centre well left (x~9)
    #     and lower (y~12) so only its rim brushes the primary. Clamped on-canvas. ---
    d2x = 9
    d2y = 12
    R2 = 4                                                  # smaller channel view
    # a faint e halo, then the E translucent field, then a c channel membrane ring
    for a in range(0, 360, 24):
        x = d2x + (R2 + 1) * math.cos(math.radians(a))
        y = d2y + (R2 + 1) * 0.9 * math.sin(math.radians(a))
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < 64 and 0 <= yi < 64 and c.px[yi][xi] == ".":
            c.set(xi, yi, "e")
    disc(c, d2x, d2y, R2, R2 - 0.5, "E")                   # bright fluorescence field
    disc(c, d2x, d2y, R2 - 2, R2 - 2, "e")                 # inner glow core
    for a in range(0, 360, 30):                            # c channel membrane ring (broken)
        x = d2x + R2 * math.cos(math.radians(a))
        y = d2y + R2 * math.sin(math.radians(a))
        if (a // 30) % 2 == 0:
            xi, yi = int(round(x)), int(round(y))
            if 0 <= xi < 64 and 0 <= yi < 64:
                c.set(xi, yi, "c")
    c.set(d2x, d2y, "W")                                   # bright nucleus pip of the 2nd channel
    # c CHANNEL SPARKLES ringing the 2nd disc (the multi-channel shimmer)
    for sx, sy in ((-R2 - 1, 0), (R2 + 1, -1), (0, -R2 - 1), (R2 - 1, R2 - 1)):
        xi, yi = d2x + sx, d2y + sy
        if 0 <= xi < 64 and 0 <= yi < 64:
            c.set(xi, yi, "c")
    # a short c CHANNEL BRIDGE of dashes linking the 2nd disc to the primary (reads as one array)
    for t in (0.35, 0.55, 0.75):
        bx = int(round(d2x + (dcx - d2x) * t))
        by = int(round(d2y + (dcy - d2y) * t))
        if 0 <= bx < 64 and 0 <= by < 64 and c.px[by][bx] == ".":
            c.set(bx, by, "c")
    # a thin o co-projection ray from the eyepiece lens up into the 2nd disc (shares the projector)
    for t in range(0, 9):
        f = t / 8.0
        x = lx + (d2x - lx) * f
        y = ly + ((d2y + R2 - 1) - ly) * f
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < 64 and 0 <= yi < 64 and c.px[yi][xi] == ".":
            c.set(xi, yi, "o")

    # --- GOLD premium trim (t5 flourish ONLY) ---
    # gold RIM RING around the t4 CONFOCAL DOME — a THIN front-base collar only, so the dome's
    # e/E confocal glow still reads above it (gold is a flourish, not a recolor of the lens).
    if dome2_center is not None:
        dcx2, dcy2 = dome2_center
        drx2, dry2 = 4, 4
        for a in range(20, 161, 28):                       # sparse gold studs along the dome base rim
            x = dcx2 + drx2 * math.cos(math.radians(a))
            y = dcy2 + (dry2 * 0.5) * math.sin(math.radians(a)) + 1
            xi, yi = int(round(x)), int(round(y))
            if 0 <= xi < 64 and 0 <= yi < 64:
                c.set(xi, yi, "q")
        c.set(dcx2, dcy2 - 4, "O")                         # a bright gold finial pip above the dome crown
    # gold BARREL COLLAR on the signature eyepiece barrel (a premium band near the lens)
    bcx, bcy = lx + 2, ly + 4                              # a few px down the barrel from the lens
    if 0 <= bcx <= 63 and 0 <= bcy <= 63:
        c.set(bcx, bcy, "q"); c.set(bcx + 1, bcy, "q")
        c.set(bcx, bcy + 1, "O")                           # collar glint


# ── ASSEMBLE (painter's order: back→front, ground→sky) ───────────────────────
def build(stage: int = 1):
    """Compose the microscopy suite at upgrade `stage` (1..5). Stage 1 is IDENTICAL to the
    shipped base; each higher stage keeps every prior addition and bolts on the next (t2 carousel
    → t3 darkroom → t4 confocal drum → t5 multi-channel hologram + gold). Painter's order keeps
    the floating hologram signature LAST (in front of all), and each rooftop/wall addition is
    drawn after the masses it grows from."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    b = body(c)                 # the low imaging-room box
    bay_door(c, b)              # HERO: wide LEFT imaging-bay door (opening LEFT)
    right_porthole(c, b)        # plain RIGHT face: one small c porthole

    # --- CUMULATIVE UPGRADE STAGES (ground/wall/roof masses BEFORE the turret + signature) --
    # t3 darkroom (ground annex) and t4 2nd drum (roof) are drawn here so the turret + hologram,
    # composed last, sit in front of them; t2 carousel clamps to the (already-needed) turret, so
    # we draw the turret first, then layer t2 onto it, then the higher roof/ground masses behind.
    dome = optics_turret(c)     # optics drum turret riding the back roof (base signature mass)
    dome2_center = None
    if stage >= 3:
        stage3_darkroom(c, b)   # windowless darkroom annex on the right wall (ground)
    if stage >= 4:
        dome2_center = stage4_confocal(c, b)  # second optics drum + confocal-laser dome (roof)
    if stage >= 2:
        stage2_feedrack(c, b)   # specimen-feed rack on the front-left roof + focus-knob + brighter bay lamp
    lens = eyepiece(c, dome)    # tilted eyepiece barrel up-left
    cell_hologram(c, lens)      # projected live-cell hologram (signature) — drawn LAST/on top
    if stage >= 5:
        stage5_multichannel(c, b, lens, dome2_center)  # 2nd channel disc + gold trim (topmost)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/biocore"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "microscopy-suite"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG + scaled
    preview to the manifest paths. Stage 1 only re-emits the JSON; it must keep matching the
    shipped microscopy-suite.png, so it does NOT overwrite the base PNG."""
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
