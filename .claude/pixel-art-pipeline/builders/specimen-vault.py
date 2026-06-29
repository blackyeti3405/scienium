#!/usr/bin/env python3
"""
Specimen Vault — BioCore economy building (BESPOKE form, STANDARD).

A SOLID TWO-TIER STACKED ARCHIVE BLOCK — the opposite of the airy Greenhouse: a
heavy, windowless storage vault. A wide opaque lower base carries a narrower
upper tier set BACK on top (a setback stack), reading as a climate-controlled
archive, not a hothouse. Composed entirely from isobuild.Box — NO iso.draw_cube
/ base_windows, and NOT the gateway cube.

  • Lower base: a wide solid Box, opaque M/D walls with thin D/d cabinet seams
    (the set's wood-framing motif), a low K plinth.
  • Upper tier: a narrower solid Box centred + set back on the roof, opaque, with
    a small c clerestory slit on its lit-left for the cold-room glow.
  • Roofline: flat with a D parapet lip + two small o/r climate-vent boxes.
  • OPENING SIDE = RIGHT. The hero is a tall glowing curation wall + door on the
    SHADED RIGHT face of the lower base — a K-framed grid of glass that GLOWS
    (h/c cold-storage light spilling out) so it reads on the dark side. The
    lit-left face stays plainer (one D seam line only).
  • SIGNATURE: a floor-to-ceiling backlit shelf of glowing specimen jars on the
    RIGHT face — a 3×3 grid of c/h glass cylinders, each on an h/c backlight,
    each holding a distinct tiny curated specimen (leaf, coiled frond, amber bug,
    translucent blob...), with a bright h top-light rail and o catalog labels.

Composed from art/isobuild.Box — drawn BACK→FRONT (painter's algorithm).
"""
import os
import sys
import json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

# Base BioCore palette (shared keys) + the lab-wide EVOLVED accent shades reserved for
# the upgrade stages only (they never appear in stage 1, so specimen-vault.png is
# unchanged). BioCore's evolved glow is BIO-LUMINESCENT (a green-teal cold-store bloom),
# so a maxed vault reads as a glowing cryo-archive, not a power plant:
#   b  deep mossy bark-green   — matured structure tone for t3+ new masses/frames
#   e  bioluminescent glow (mid)   E  bioluminescent glow (bright) — the t4/t5 cold-light
#   q  premium gold trim — t5 flourish ONLY (NOT a whole-building recolor)
BIO = {"K": "#1a2417", "W": "#e8f2d8", "L": "#c4dba6", "M": "#9fc07e", "D": "#6f9456", "d": "#4a6e3a",
       "h": "#d2f7ec", "c": "#9fefcf", "g": "#36cc9e", "G": "#1d8f70",
       "o": "#f0b24d", "O": "#ffd488", "r": "#b9701e",
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


# ── massing geometry ─────────────────────────────────────────────────────────
# Lower base: wide solid block. Upper tier: narrower, centred + set back.
BASE = Box((30, 18), wx=13, wy=11, h=13)
# Upper tier sits ON the base roof, set BACK toward the back-top corner.
UPPER = Box((33, 8), wx=8, wy=7, h=8)


# ── lower base block ─────────────────────────────────────────────────────────
def base_block(c):
    """The wide solid lower vault. Opaque M/D walls, K plinth, D/d cabinet seams
    on the lit-left face (the set's wood-framing motif as cabinet panel lines)."""
    BASE.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # --- low K plinth wrapping the two visible wall feet ---
    for x in range(int(BASE.w_left[0]), int(BASE.w_front[0]) + 1):
        # left wall foot line: interpolate y from w_left -> w_front
        t = (x - BASE.w_left[0]) / (BASE.w_front[0] - BASE.w_left[0])
        y = BASE.w_left[1] + t * (BASE.w_front[1] - BASE.w_left[1])
        c.set(x, y, "d")
        c.set(x, y - 1, "d")
    for x in range(int(BASE.w_front[0]), int(BASE.w_right[0]) + 1):
        t = (x - BASE.w_front[0]) / (BASE.w_right[0] - BASE.w_front[0])
        y = BASE.w_front[1] + t * (BASE.w_right[1] - BASE.w_front[1])
        c.set(x, y, "K")
        c.set(x, y - 1, "d")

    # --- lit-LEFT face: plainer. Opaque M with thin D/d cabinet panel seams. ---
    # two vertical seam lines splitting the face into cabinet bays + one rail.
    for u in (0.34, 0.67):
        c.line(BASE.left_pt(u, 1.0), BASE.left_pt(u, BASE.h - 0.5), "D")
        c.line(BASE.left_pt(u + 0.012, 1.0), BASE.left_pt(u + 0.012, BASE.h - 0.5), "d")
    # a horizontal cabinet rail across the lit face
    c.line(BASE.left_pt(0.06, 5.0), BASE.left_pt(0.94, 5.0), "D")
    c.line(BASE.left_pt(0.06, 5.6), BASE.left_pt(0.94, 5.6), "d")
    # a bright L catch along the top of the lit face (cold light leak from above)
    c.line(BASE.left_pt(0.05, 1.0), BASE.left_pt(0.95, 1.0), "L")


# ── upper setback tier ───────────────────────────────────────────────────────
def upper_tier(c):
    """The narrower upper stack, opaque, with a thin c clerestory slit band on its
    lit-left (cold-room glow) + a D parapet lip + two roof climate-vent boxes."""
    UPPER.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # --- clerestory slit band on the lit-left, near the top: a glowing c strip ---
    cv0, cv1 = 1.6, 2.6
    c.fill_poly([UPPER.left_pt(0.14, cv0), UPPER.left_pt(0.86, cv0),
                 UPPER.left_pt(0.86, cv1), UPPER.left_pt(0.14, cv1)], "c")
    c.line(UPPER.left_pt(0.14, cv0), UPPER.left_pt(0.86, cv0), "h")        # bright top
    c.line(UPPER.left_pt(0.14, cv1), UPPER.left_pt(0.86, cv1), "K")        # K sill
    # thin K mullions in the slit
    for u in (0.32, 0.5, 0.68):
        c.line(UPPER.left_pt(u, cv0), UPPER.left_pt(u, cv1), "K")
    # K head of the slit
    c.line(UPPER.left_pt(0.14, cv0 - 0.5), UPPER.left_pt(0.86, cv0 - 0.5), "K")

    # --- a faint c clerestory wash on the shaded-right of the upper tier too ---
    rv0, rv1 = 1.8, 2.6
    c.fill_poly([UPPER.right_pt(0.16, rv0), UPPER.right_pt(0.84, rv0),
                 UPPER.right_pt(0.84, rv1), UPPER.right_pt(0.16, rv1)], "G")
    c.line(UPPER.right_pt(0.16, rv0), UPPER.right_pt(0.84, rv0), "c")
    c.line(UPPER.right_pt(0.16, rv1), UPPER.right_pt(0.84, rv1), "K")

    # --- D parapet lip around the upper roof's front edges ---
    c.line(UPPER.r_left, UPPER.r_front, "D")
    c.line(UPPER.r_front, UPPER.r_right, "d")
    c.set(UPPER.r_front[0], UPPER.r_front[1], "K")


def roof_vents(c):
    """Two small o/r climate-vent boxes + a D parapet lip on the LOWER roof's
    front rim (visible apron between the two tiers), giving a busy industrial
    archive roofline."""
    # D parapet lip along the lower-base roof front edges (the visible apron)
    c.line(BASE.r_left, BASE.r_front, "D")
    c.line(BASE.r_front, BASE.r_right, "d")

    # two squat climate-vent boxes on the lower roof apron, on the LEFT/front of
    # the apron (away from the busy right curation wall), as small iso louvre
    # boxes so the roofline reads industrial without clutter.
    for (u, v) in [(0.30, 0.30), (0.46, 0.58)]:
        vb = Box(BASE.roof_pt(u, v), wx=2.4, wy=2.0, h=2.2)
        vb.draw(c, roof="o", lwall="o", rwall="r", roof_hi="O", outline="K",
                with_shadow=False)
        # a thin r louvre slit on the lit-left face of the vent
        c.line(vb.left_pt(0.2, 1.0), vb.left_pt(0.8, 1.0), "r")


# ── HERO: glowing curation wall + backlit specimen-jar grid (RIGHT face) ──────
def curation_wall(c):
    """The hero opening on the SHADED RIGHT face of the lower base: a tall K-framed
    glowing curation wall that holds the signature backlit specimen-jar grid. It
    GLOWS (h/c cold-storage light) so it reads on the dark side. Drawn LAST over
    the right face so it dominates the shaded side."""
    b = BASE
    # wall footprint on the right face (inset from the face edges + plinth).
    # Floor-to-ceiling: start just under the roofline, run down to the plinth.
    u0, u1 = 0.09, 0.93
    v0, v1 = 1.2, b.h - 1.4

    # 1) backlight panel — a bright h/c glowing interior the jars sit against.
    c.fill_poly([b.right_pt(u0, v0), b.right_pt(u1, v0),
                 b.right_pt(u1, v1), b.right_pt(u0, v1)], "h")
    # gradient: brighter (h) up top near the light rail, cooler c lower down.
    for k in range(0, 5):
        vv = v0 + 0.6 + k * 1.1
        ch = "h" if k < 2 else "c"
        c.line(b.right_pt(u0 + 0.02, vv), b.right_pt(u1 - 0.02, vv), ch)

    # 2) bright h TOP-LIGHT RAIL just under the head of the wall.
    c.line(b.right_pt(u0, v0 + 0.3), b.right_pt(u1, v0 + 0.3), "W")
    c.line(b.right_pt(u0, v0 + 0.9), b.right_pt(u1, v0 + 0.9), "h")

    # 3) the 3×3 GRID of glowing specimen jars on D shelves, filling the wall.
    cols = [0.17, 0.42, 0.67]          # left edges of the 3 jar columns (u)
    cw = 0.17                          # jar column width in u
    shelf_v = [2.7, 6.0, 9.3]          # top of each of the 3 shelf rows (v)
    sh = 2.6                           # jar body height in v

    # shelf frames (D wood shelves the jars stand on) spanning the wall width
    for sv in shelf_v:
        c.line(b.right_pt(u0, sv + sh + 0.2), b.right_pt(u1, sv + sh + 0.2), "D")
        c.line(b.right_pt(u0, sv + sh + 0.6), b.right_pt(u1, sv + sh + 0.6), "d")
        # thin o catalog-label strip running under each shelf
        c.line(b.right_pt(u0 + 0.02, sv + sh + 0.9), b.right_pt(u1 - 0.02, sv + sh + 0.9), "o")

    # specimen silhouettes: a distinct tiny thing per cell so the grid reads as a
    # collection of DIFFERENT things. (row, col) -> ("char", placement-tag).
    specimens = {
        (0, 0): ("M", "leaf"),     (0, 1): ("g", "frond"),   (0, 2): ("O", "bug"),
        (1, 0): ("c", "blob"),     (1, 1): ("D", "leaf"),    (1, 2): ("g", "frond"),
        (2, 0): ("O", "bug"),      (2, 1): ("c", "blob"),    (2, 2): ("M", "leaf"),
    }

    for ri, sv in enumerate(shelf_v):
        for ci, cu in enumerate(cols):
            ju0, ju1 = cu, cu + cw
            jt, jb = sv, sv + sh
            # --- jar glass body: a c cylinder with an h lit edge ---
            c.fill_poly([b.right_pt(ju0, jt), b.right_pt(ju1, jt),
                         b.right_pt(ju1, jb), b.right_pt(ju0, jb)], "c")
            # rounded shoulder: trim the very top corners to read as a jar
            c.set(*_ipt(b.right_pt(ju0, jt)), "h")
            c.set(*_ipt(b.right_pt(ju1, jt)), "h")
            # h vertical glass highlight streak on the lit (left-u) side of jar
            c.line(b.right_pt(ju0 + 0.012, jt + 0.4), b.right_pt(ju0 + 0.012, jb - 0.3), "h")
            # K rim + lid at the top of the jar
            c.line(b.right_pt(ju0, jt - 0.5), b.right_pt(ju1, jt - 0.5), "K")
            c.set(*_ipt(b.right_pt((ju0 + ju1) / 2, jt - 1.1)), "L")    # tiny lid knob

            # --- the curated specimen inside, a distinct 2-3px silhouette ---
            ch, kind = specimens[(ri, ci)]
            mu = (ju0 + ju1) / 2
            mv = jt + sh * 0.55
            cxp, cyp = _ipt(b.right_pt(mu, mv))
            if kind == "leaf":
                c.set(cxp, cyp - 1, ch); c.set(cxp, cyp, ch); c.set(cxp + 1, cyp, "d")
            elif kind == "frond":
                c.set(cxp, cyp - 1, ch); c.set(cxp - 1, cyp, ch); c.set(cxp, cyp, "G")
                c.set(cxp + 1, cyp - 1, ch)
            elif kind == "bug":   # amber-preserved bug: O core on warm o amber
                c.set(cxp, cyp - 1, "O"); c.set(cxp, cyp, ch); c.set(cxp - 1, cyp, "r")
            elif kind == "blob":  # translucent blob
                c.set(cxp, cyp - 1, ch); c.set(cxp - 1, cyp, ch); c.set(cxp + 1, cyp, ch)
                c.set(cxp, cyp, "h")

            # K jamb between this jar and the next (cabinet divider)
            c.line(b.right_pt(ju1 + 0.02, jt - 0.5), b.right_pt(ju1 + 0.02, jb + 0.2), "K")
        # K jamb on the far-left of the row
        c.line(b.right_pt(cols[0] - 0.02, sv - 0.5), b.right_pt(cols[0] - 0.02, sv + sh + 0.2), "K")

    # 4) a tall K-framed surround for the whole curation wall (the hero frame).
    for a, bpt in [((u0, v0), (u1, v0)), ((u0, v1), (u1, v1)),
                   ((u0, v0), (u0, v1)), ((u1, v0), (u1, v1))]:
        c.line(b.right_pt(*a), b.right_pt(*bpt), "K")

    # 5) a glass DOOR leaf at the right end of the wall (the way in), glowing.
    du0, du1 = 0.78, 0.90
    c.fill_poly([b.right_pt(du0, v0 + 0.6), b.right_pt(du1, v0 + 0.6),
                 b.right_pt(du1, v1 - 0.2), b.right_pt(du0, v1 - 0.2)], "g")
    c.line(b.right_pt(du0 + 0.01, v0 + 1.0), b.right_pt(du0 + 0.01, v1 - 0.6), "h")  # door glass sheen
    for a, bpt in [((du0, v0 + 0.6), (du1, v0 + 0.6)), ((du0, v1 - 0.2), (du1, v1 - 0.2)),
                   ((du0, v0 + 0.6), (du0, v1 - 0.2)), ((du1, v0 + 0.6), (du1, v1 - 0.2))]:
        c.line(b.right_pt(*a), b.right_pt(*bpt), "K")
    # o handle
    c.set(*_ipt(b.right_pt(du0 + 0.015, (v0 + v1) / 2)), "o")

    # 6) a faint c cold-store haze drifting at the base of the wall.
    for hx, hv in ((0.22, v1 + 0.5), (0.40, v1 + 0.7), (0.58, v1 + 0.5), (0.74, v1 + 0.6)):
        px, py = _ipt(b.right_pt(hx, hv))
        if 0 <= px < 64 and 0 <= py < 64 and c.px[py][px] in (".", "D", "d"):
            c.set(px, py, "c")


def _ipt(p):
    return int(round(p[0])), int(round(p[1]))


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS climate / cold-
# storage / curation structure onto the prior archive block — never restarts, never
# recolors the whole building. Theme: the starter specimen vault grows into a fully
# built-out, glowing CRYO-ARCHIVE. Colours mature stage by stage (matured bark-green
# `b`, bio-luminescent cold-light `e/E`); gold (`q`) only as a t5 flourish. Every add
# is anchored OFF the base/upper-tier geometry and kept clear of the SIGNATURE jar
# wall on the SHADED RIGHT face (which must keep reading at every stage). t2..t4 grow
# on the LIT-LEFT / FRONT / TOP (the empty sides); only t5 touches the right wall, and
# there it ENHANCES the signature (the jars power fully on) rather than occluding it.
#
#   t2  small functional add   : two extra climate-vent boxes + a `c` thermometer dial
#                                on the lit-left parapet (+ one brightened catalog label)
#   t3  structural add         : a cold-storage ANNEX stepped onto the lower base front-left
#   t4  major add              : a third setback ARCHIVE TIER raised on top, `e` clerestory
#   t5  crowning feature       : the specimen wall powers fully on (denser `E` jar grid) +
#                                gold top-light rail + gold parapet caps
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_vents_dial(c):
    """t2 — SMALL FUNCTIONAL ADD: a slim CRYO COOLANT VENT STACK rises off the lower-vault
    roof apron — the modest new on-theme MASS that EXTENDS THE SILHOUETTE (a vertical exhaust
    pipe + cowl cap poking up into the clear sky above the front-left apron, anchored on a roof
    plinth so it never floats). It is the archive's refrigeration exhaust (cold-storage HVAC),
    matching the base's existing o/r climate vents. Around it: one MORE squat o/r vent box on
    the apron (the plant grows), a small `c` THERMOMETER DIAL bracketed onto the lit-LEFT
    parapet, and one brightened `o` catalog label on the right jar wall. Base palette only
    (this is the modest tier). Everything sits on the LIT-LEFT / roof side, clear of the right
    curation wall and clear of the upper tier behind it (which lives at x>=19); the stack rises
    in the empty band x13..18 so it adds genuine new silhouette pixels."""
    # --- CRYO COOLANT VENT STACK (the new silhouette element) -------------------------------
    # Anchor its FOOT on the lower roof apron at the front-left (recomputed from base geometry,
    # NOT a hardcoded guess), then build straight UP in screen space into the empty sky there.
    # The pipe is 3px wide (x0..x0+2) so it carries a LIT interior column instead of reading as a
    # dark stick: lit `M` left + centre, `D` shaded right, one K outline on the far-left edge.
    fp = BASE.roof_pt(0.10, 0.30)                 # ~(17,27): front-left apron, sky is clear above
    fx, fy = int(round(fp[0])), int(round(fp[1]))
    x0 = max(1, min(60, fx - 3))                  # left column; nudge left so the pipe clears the
    #                                               upper-tier wall (x>=19) that rises behind it
    top = max(2, fy - 10)                          # ~y15 — pipe top; cowl sits 2px above into sky

    # a low K/D roof plinth the stack stands on (anchors it ON the roof, no float)
    c.fill_poly([(x0 - 1, fy + 1), (x0 + 3, fy + 1), (x0 + 3, fy - 1), (x0 - 1, fy - 1)], "d")
    c.line((x0 - 1, fy + 1), (x0 + 3, fy + 1), "K")        # plinth base seam on the roof
    c.set(x0 - 1, fy, "K"); c.set(x0 + 3, fy, "K")         # plinth side corners
    # pipe SHAFT (solid, foot-to-top, no internal gap): lit M body, D shaded right column
    c.fill_poly([(x0, fy), (x0 + 2, fy), (x0 + 2, top), (x0, top)], "M")
    c.line((x0 + 2, top), (x0 + 2, fy), "D")              # shaded right column
    c.line((x0, top), (x0, fy), "K")                      # K outline on the lit-left edge only
    # two cooling fins banding the pipe (on-theme refrigeration coil rings), overhanging 1px each side
    for yy in (top + 4, top + 7):
        c.set(x0 - 1, yy, "r"); c.set(x0, yy, "o"); c.set(x0 + 1, yy, "o"); c.set(x0 + 2, yy, "r")
    # a wider vent COWL cap crowning the stack (the clear silhouette peak): a 5px L lip overhanging
    # the 3px pipe on both sides, with a bright W top edge + K rim so it reads unmistakably as a cap.
    cy = top - 2
    c.fill_poly([(x0 - 1, top), (x0 + 3, top), (x0 + 3, cy), (x0 - 1, cy)], "L")
    c.line((x0 - 1, cy), (x0 + 3, cy), "W")              # bright cap top edge (the peak)
    c.line((x0 - 1, cy), (x0 - 1, top), "K")             # cap left rim
    c.line((x0 + 3, cy), (x0 + 3, top), "K")             # cap right rim
    c.set(x0 + 1, top - 1, "D")                          # a short throat shadow under the cap lip
    # a small `c` frost/coolant plume puffing UP off the cowl (cold exhaust), tucked to the cap, on-canvas
    for px, py in ((x0 + 1, cy - 1), (x0 + 2, cy - 2), (x0 + 1, cy - 3)):
        if 0 <= px <= 63 and 0 <= py <= 63:
            c.set(px, py, "c")
    if 0 <= cy - 1 <= 63:
        c.set(max(0, min(63, x0 + 1)), cy - 1, "h")      # bright frost glint at the lip

    # --- one MORE squat o/r vent box on the apron beside the stack (the HVAC plant grows) ----
    vb = Box(BASE.roof_pt(0.30, 0.72), wx=2.4, wy=2.0, h=2.2)
    vb.draw(c, roof="o", lwall="o", rwall="r", roof_hi="O", outline="K", with_shadow=False)
    c.line(vb.left_pt(0.2, 1.0), vb.left_pt(0.8, 1.0), "r")   # r louvre slit

    # --- THERMOMETER DIAL bracketed on the lit-LEFT face (a small round climate gauge),
    #     placed on the clear upper-left wall (u≈0.20) where it reads as a distinct round
    #     instrument, well clear of the busy right curation wall AND clear of the lower
    #     cabinet seams/rail (which sit at v>=5 and u>=0.34). Built as a chunky ROUND
    #     gauge: a closed K rim ring (the 4 cardinals + 4 corners trimmed) around a solid
    #     bright `c` face with an `h` hub glint and ONE clear warm `o` needle, so it reads
    #     unmistakably as a dial and not a few scattered pixels. ---
    dp = BASE.left_pt(0.16, 2.7)
    dx, dy = int(round(dp[0])), int(round(dp[1]))     # ~(12,34): clean lit-left wall
    # A compact, unambiguous ROUND dial built as a tight 3x3 disc: the 4 CORNERS are K
    # (which rounds the square into a disc against the lit wall), the 4 edge-centres are
    # the bright `c` glass face, the centre is an `h` hub, and ONE warm `o` needle reads
    # the temperature. A bright `W` 12-o'clock tick sits just above the rim. This reads as
    # a discrete instrument instead of the earlier scattered single pixels.
    for cxp, cyp in ((dx - 1, dy - 1), (dx + 1, dy - 1), (dx - 1, dy + 1), (dx + 1, dy + 1)):
        c.set(cxp, cyp, "K")        # 1) four K corners -> rounds the disc
    for fx, fy in ((dx, dy - 1), (dx - 1, dy), (dx + 1, dy), (dx, dy + 1)):
        c.set(fx, fy, "c")          # 2) bright `c` glass face on the 4 edge-centres
    c.set(dx, dy, "h")              # 3) `h` hub glint at the centre
    c.set(dx + 1, dy, "o")          # 4) warm `o` needle (points to 3-o'clock)
    c.set(dx, dy - 2, "W")          # 5) bright `W` 12-o'clock tick just above the rim
    c.set(dx, dy + 2, "D")          # 6) short D bracket stem tying the gauge to the wall
    c.set(dx, dy + 3, "d")

    # --- brighten ONE catalog label on the right jar wall (the top-left shelf strip): a
    #     single bumped-up `O` label dot so the curation reads as freshly re-indexed. The
    #     jar wall's labels sit under each shelf at v≈ sv+sh+0.9; the top shelf is sv=2.7,
    #     sh=2.6 -> v≈6.2. Place at the left column (u≈0.18). ---
    lp = BASE.right_pt(0.18, 6.2)
    c.set(*_ipt(lp), "O")


def stage3_coldstore(c):
    """t3 — STRUCTURAL ADD: a compact COLD-STORAGE ANNEX stepped onto the OPEN GROUND at
    the lower base's FRONT-LEFT corner — a tidy self-contained new mass: a matured
    bark-green `b` box with a frosted `h/c` door slit and a small `o/r` COMPRESSOR vent on
    its lit face, tying into the vault as added archive volume. Placed in the clear
    front-left ground (the left wall foot is at x≈8..34, y≈42..55), so it neither tangles
    with the base's plinth nor reaches the right curation wall. Introduces the matured
    bark-green tone `b`. The t4 tier grows UP from the main roof, so this annex stays
    visible in front at higher stages."""
    # A short, wide annex Box seated against the base's front-left wall foot. Its back
    # rests on the lit-left wall; it juts FORWARD-LEFT onto the ground. Keep it LOW (h=7)
    # so it reads as a subordinate plant room, not a second vault.
    ann = Box((18, 40), wx=4, wy=5, h=7)
    ann.draw(c, roof="M", lwall="b", rwall="d", roof_hi="L", outline="K")
    # a deep-green `b` wash on the lit face already from lwall="b"; add a frosted h/c DOOR
    # SLIT centred on its lit-left face (the cold-room access).
    c.fill_poly([ann.left_pt(0.34, 1.6), ann.left_pt(0.66, 1.6),
                 ann.left_pt(0.66, 6.4), ann.left_pt(0.34, 6.4)], "c")
    c.fill_poly([ann.left_pt(0.34, 1.6), ann.left_pt(0.66, 1.6),
                 ann.left_pt(0.66, 3.0), ann.left_pt(0.34, 3.0)], "h")   # frosted top glint
    for a, b in [(ann.left_pt(0.34, 1.6), ann.left_pt(0.66, 1.6)),
                 (ann.left_pt(0.34, 6.4), ann.left_pt(0.66, 6.4)),
                 (ann.left_pt(0.34, 1.6), ann.left_pt(0.34, 6.4)),
                 (ann.left_pt(0.66, 1.6), ann.left_pt(0.66, 6.4))]:
        c.line(a, b, "K")                                              # K door frame
    c.set(*_ipt(ann.left_pt(0.62, 4.0)), "c")                          # cold handle pip

    # --- COMPRESSOR vent: a small o/r louver box on the annex's SHADED-right face (the
    #     refrigeration unit), with a thin r slit + a brightened o status dot. ---
    cv = Box(ann.right_pt(0.5, 4.2), wx=1.8, wy=1.4, h=2.0)
    cv.draw(c, roof="r", lwall="o", rwall="r", roof_hi="O", outline="K", with_shadow=False)
    c.line(cv.left_pt(0.2, 0.9), cv.left_pt(0.8, 0.9), "r")            # louvre slit
    c.set(*_ipt(cv.left_pt(0.5, 0.3)), "O")                            # status dot


def stage4_archivetier(c):
    """t4 — MAJOR ADD: a THIRD setback ARCHIVE TIER raised on top of the upper tier so the
    stack visibly grows UPWARD into a stepped ziggurat of archives. A narrower opaque `b`
    (matured bark-green) box, centred + set back on the UPPER tier's roof, carrying a
    glowing bio-luminescent `e` CLERESTORY BAND of cold light on its lit-left + a faint `e`
    wash on its shaded-right. The prominent new vertical mass: 'this archive now stores
    deeper + colder'. Palette matures to deep `b` structure + energized cold-light `e/E`.
    Kept centred on the existing stack (grows straight up, footprint unchanged) and well
    above the right jar wall so it never occludes the signature."""
    # third tier sits ON the UPPER roof, set back toward UPPER's back-top corner, narrower
    # again (the setback rule continues up the stack). UPPER.r_top=(33,8); place this tier's
    # back-top a touch back/up and keep it slim so it climbs without overshooting y<0.
    T3 = Box((34, 1), wx=5, wy=4, h=6)
    T3.draw(c, roof="L", lwall="b", rwall="K", roof_hi="W", outline="K")
    # --- glowing `e` CLERESTORY BAND on the lit-left (cold-light strip), like the upper
    #     tier's c slit but energized brighter to read as the maxed cold-core. ---
    cv0, cv1 = 1.4, 2.4
    c.fill_poly([T3.left_pt(0.16, cv0), T3.left_pt(0.84, cv0),
                 T3.left_pt(0.84, cv1), T3.left_pt(0.16, cv1)], "e")
    c.line(T3.left_pt(0.16, cv0), T3.left_pt(0.84, cv0), "E")          # bright top
    c.line(T3.left_pt(0.16, cv1), T3.left_pt(0.84, cv1), "K")          # K sill
    for u in (0.34, 0.5, 0.66):
        c.line(T3.left_pt(u, cv0), T3.left_pt(u, cv1), "K")            # thin mullions
    c.line(T3.left_pt(0.16, cv0 - 0.5), T3.left_pt(0.84, cv0 - 0.5), "K")  # K head
    # --- faint `e` clerestory wash on the shaded-right of the third tier (cold glow
    #     leaking around) ---
    rv0, rv1 = 1.6, 2.4
    c.fill_poly([T3.right_pt(0.18, rv0), T3.right_pt(0.82, rv0),
                 T3.right_pt(0.82, rv1), T3.right_pt(0.18, rv1)], "G")
    c.line(T3.right_pt(0.18, rv0), T3.right_pt(0.82, rv0), "e")
    c.line(T3.right_pt(0.18, rv1), T3.right_pt(0.82, rv1), "K")
    # --- D parapet lip around the third tier's front roof edges (matches the set's
    #     archive roofline) + a tiny `e` cold-core pip dotting the new roof. ---
    c.line(T3.r_left, T3.r_front, "D")
    c.line(T3.r_front, T3.r_right, "d")
    c.set(T3.r_front[0], T3.r_front[1], "K")
    cp = T3.roof_pt(0.5, 0.5)
    c.set(*_ipt(cp), "e")                                              # cold-core glow on the roof
    return T3


def stage5_poweron(c, t3):
    """t5 — CROWNING FEATURE = FULLY EVOLVED cryo-archive. The signature SPECIMEN WALL
    POWERS FULLY ON: every jar's backlight blazes to the bright bio-luminescent `E`, a row
    of NEW glowing `E` jars is added high on the wall (a denser collection), and the
    building is dressed with GOLD premium trim — a `q` gold TOP-LIGHT RAIL capping the
    curation wall, gold PARAPET CAPS on the tier corners, and a gold catalog boss. Reads as
    elite, still recognizably the same vault, just maxed out. All gold (`q`) lives ONLY
    here. The added jars sit ON the existing right wall (enhancing, never occluding, the
    signature)."""
    b = BASE
    u0, u1 = 0.09, 0.93
    v0 = 1.2
    # --- 1) BLAZE the backlight: re-wash the upper backlight band of the jar wall to the
    #     bright `E` so the whole collection reads as fully energized (the jars themselves
    #     keep their c/h glass + specimens drawn earlier; we only brighten the glow behind
    #     the TOP-LIGHT region so the signature isn't overpainted into mush). ---
    c.line(b.right_pt(u0, v0 + 0.3), b.right_pt(u1, v0 + 0.3), "E")    # rail blaze
    c.line(b.right_pt(u0, v0 + 0.9), b.right_pt(u1, v0 + 0.9), "e")

    # --- 2) a NEW denser top ROW OF GLOWING JARS added just under the head of the wall
    #     (above the existing 3x3 grid), so the collection visibly multiplies. Five slim
    #     `E`-backlit jars across the wall width. Drawn directly on the right face. ---
    nv0, nv1 = v0 + 1.4, v0 + 2.7          # a thin jar band high on the wall
    cols5 = [0.13, 0.29, 0.45, 0.61, 0.77]
    jw = 0.10
    for cu in cols5:
        ju0, ju1 = cu, cu + jw
        # bright E backlight cell behind the jar
        c.fill_poly([b.right_pt(ju0 - 0.012, nv0), b.right_pt(ju1 + 0.012, nv0),
                     b.right_pt(ju1 + 0.012, nv1), b.right_pt(ju0 - 0.012, nv1)], "E")
        # the jar glass (c body, h lit edge) so it reads as a jar, not a flat bar
        c.fill_poly([b.right_pt(ju0, nv0 + 0.2), b.right_pt(ju1, nv0 + 0.2),
                     b.right_pt(ju1, nv1 - 0.2), b.right_pt(ju0, nv1 - 0.2)], "c")
        c.line(b.right_pt(ju0 + 0.006, nv0 + 0.4), b.right_pt(ju0 + 0.006, nv1 - 0.4), "h")
        c.set(*_ipt(b.right_pt((ju0 + ju1) / 2, nv0 + 0.6)), "e")     # specimen glow dot
        c.line(b.right_pt(ju0, nv0 - 0.1), b.right_pt(ju1, nv0 - 0.1), "K")  # K rim
    # K frame band around the new jar row
    for a, bp in [((cols5[0] - 0.02, nv0 - 0.2), (cols5[-1] + jw + 0.02, nv0 - 0.2)),
                  ((cols5[0] - 0.02, nv1 + 0.1), (cols5[-1] + jw + 0.02, nv1 + 0.1))]:
        c.line(b.right_pt(*a), b.right_pt(*bp), "K")

    # --- 3) GOLD premium trim (t5 flourish ONLY) ---
    # a gold TOP-LIGHT RAIL capping the curation wall (just above the head frame)
    c.line(b.right_pt(u0, v0 - 0.2), b.right_pt(u1, v0 - 0.2), "q")
    c.set(*_ipt(b.right_pt(0.5, v0 - 0.6)), "O")                       # bright centre boss
    # gold PARAPET CAPS on the tier front corners (the climbing stack's premium edge):
    # lower base front corner, upper tier front corner, third tier front corner.
    for corner in (BASE.r_front, UPPER.r_front, t3.r_front):
        cx, cy = int(round(corner[0])), int(round(corner[1]))
        c.set(cx, cy - 1, "q")
        c.set(cx, cy - 2, "O")
    # a gold catalog boss on the lit-left cabinet rail (matches the base's rail at v≈5.0)
    pb = b.left_pt(0.5, 5.0)
    pbx, pby = int(round(pb[0])), int(round(pb[1]))
    c.set(pbx, pby, "q")
    c.set(pbx, pby - 1, "O")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the specimen vault at upgrade `stage` (1..5). Stage 1 is IDENTICAL to the
    shipped base; each higher stage keeps every prior addition and bolts on the next
    (t2 vents+dial → t3 cold-store annex → t4 third archive tier → t5 jar wall powers on +
    gold). Painter's order keeps the base form first (back→front), then each new mass after
    the form it grows from; the t4 tier is drawn before t5 so t5's gold caps can sit on its
    parapet, and the HERO curation wall is drawn within the base form so t5 can enhance it."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    base_block(c)        # wide lower vault (back/under)
    upper_tier(c)        # narrower setback stack on top
    roof_vents(c)        # climate vents + parapet on the lower roof apron
    curation_wall(c)     # HERO glowing curation wall + jar grid on the RIGHT

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    t3 = None
    if stage >= 2:
        stage2_vents_dial(c)
    if stage >= 3:
        stage3_coldstore(c)
    if stage >= 4:
        t3 = stage4_archivetier(c)
    if stage >= 5:
        stage5_poweron(c, t3)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/biocore"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "specimen-vault"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG + scaled
    preview to the manifest paths. Stage 1 only re-emits the JSON; it must keep matching the
    shipped specimen-vault.png, so it does NOT overwrite the base PNG."""
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
