#!/usr/bin/env python3
"""
3D Printing Shop — Volt Lab economy building (BESPOKE-form REBUILD).

This is a rebuild of a building that previously looked like the generic gateway
cube. It is now a TALL, SLENDER print TOWER with the main door + glazing on the
RIGHT (shaded) face — vertical emphasis, the opposite of the wide CNC hall and
distinct from the hollow Robotics hangar bay.

Massing: a narrow, tall main tower Box + a small low base annex Box abutting the
LEFT (a stepped materials base). Corrugated vertical panel seams + rivets, a
glowing o power line up the front corner, cyan readouts.

Signature (registered): a glass-domed extruder chamber crowning the tower —
a K-framed c/h dome holding a D/M gantry post + K extruder head over a half-built
model drawn as stepped horizontal print-lines (hot o/O top layers cooling to r
below = unmistakably additive), a c filament spool + feed line, an o hot-end
glow, and a g build-progress bar on the dome base.

Composed entirely from art/isobuild.Box (NO iso.draw_cube / base_windows).
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

SLUG = "3d-printing-shop"

# Base Volt palette (shared keys) + a few EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so 3d-printing-shop.png is
# unchanged):
#   b  deep cool steel  — matured structure tone for the t4 curing silo / t3 annex
#   e  energized cyan glow (mid)   E  energized cyan glow (bright) — t4/t5 power
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
VOLT = {"K": "#15181d", "W": "#eef2f6", "L": "#cdd6dd", "M": "#9aa3ad", "D": "#6c7682", "d": "#49515b",
        "h": "#d6f9ff", "c": "#aef0fb", "g": "#38cfe2", "G": "#1f8ba0",
        "o": "#ffe85a", "O": "#fff7a8", "r": "#c89a14",
        "b": "#3b4350", "e": "#6fe6f4", "E": "#caf7ff", "q": "#f3c63a"}


# ── low-level helpers ────────────────────────────────────────────────────────
def hline(c, x0, x1, y, ch):
    if x1 < x0:
        x0, x1 = x1, x0
    for x in range(int(x0), int(x1) + 1):
        c.set(x, y, ch)


def vline(c, x, y0, y1, ch):
    if y1 < y0:
        y0, y1 = y1, y0
    for y in range(int(y0), int(y1) + 1):
        c.set(x, y, ch)


# ── base annex (LEFT) — drawn FIRST so the tower sits in front of it ──────────
def base_annex(c):
    """A small, low materials/base unit abutting the LEFT of the tower, giving
    the silhouette a stepped base. Plainer than the tower: one cyan port + vents.
    Returns the Box."""
    a = Box((20, 23), wx=5, wy=6, h=11)
    a.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # a small cyan material-port window on its lit (left) face
    a.window(c, "left", 0.30, 0.74, 4, 8, glass="g", hi="h", shade="G",
             frame="K", mullions=0)
    # two stacked filament-cartridge slots beside it (cyan dots = stored spools)
    for vv in (4, 7):
        p = a.left_pt(0.86, vv)
        c.set(int(round(p[0])), int(round(p[1])), "c")
    return a


# ── the TALL tower shell ─────────────────────────────────────────────────────
def tower(c):
    """The narrow, TALL main tower. Small footprint (wx=7, wy=6) + large height
    (h=27) so the silhouette reads as a slender vertical TOWER, not a cube."""
    t = Box((33, 16), wx=7, wy=6, h=27)
    t.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    return t


def corrugated_walls(c, t):
    """Vertical D/d panel-seam ribs down BOTH walls (corrugated tower skin) +
    rivet rows — the Volt corrugated-panel motif, read vertically to reinforce
    the tower's height."""
    # right (shaded) wall ribs — sparse, only on the upper band so the door +
    # window zone below stays clean and legible (handled by right_face)
    for u in (0.30, 0.62, 0.90):
        a = t.right_pt(u, 1)
        b = t.right_pt(u, 5)
        c.line(a, b, "d")
    # left (lit) wall ribs — full set, the plainer face
    for u in (0.16, 0.34, 0.52, 0.70, 0.88):
        a = t.left_pt(u, 1)
        b = t.left_pt(u, t.h - 1)
        c.line(a, b, "M")
        c.line((a[0] - 1, a[1]), (b[0] - 1, b[1]), "L")  # lit edge of each rib
    # rivet rows banding the tower (left face), three heights
    for vv in (4, 14, 24):
        for u in (0.16, 0.34, 0.52, 0.70, 0.88):
            p = t.left_pt(u, vv)
            c.set(int(round(p[0])), int(round(p[1])), "d")


def left_vents(c, t):
    """Keep the LEFT face plainer: just a couple of dark D louver vents low down
    (no glazing — the opening is on the RIGHT)."""
    for vv in (16, 20):
        for u in (0.30, 0.46, 0.62):
            p = t.left_pt(u, vv)
            x, y = int(round(p[0])), int(round(p[1]))
            c.set(x, y, "d")
            c.set(x + 1, y, "K")


def right_face(c, t):
    """OPENING ON THE RIGHT (shaded face) — the building's entrance, varied from
    the usual left-side opening. The shaded face is narrow, so just TWO bold,
    legible elements (no clutter):
      • a tall framed cyan WINDOW STACK (build-monitor glazing) filling the upper
        two-thirds of the face, with a sample shelf of finished prints; and
      • a grounded K-framed ENTRY DOOR at the base with an o-hazard loading sill.
    The right face u-axis runs r_front (0) -> r_right (1)."""
    # The shaded face is narrow + foreshortened, so keep it CALM: one clean cyan
    # window high, a small sample shelf, and one grounded door — no busy scanlines.

    # --- cyan WINDOW (build-monitor glazing) across the upper face ---
    wu0, wu1, wvt, wvb = 0.18, 0.82, 4, 13
    t.window(c, "right", wu0, wu1, wvt, wvb, glass="g", hi="h", shade="G",
             frame="K", mullions=1)
    # one bright h glint band near the top so it clearly reads as glowing glass
    c.line(t.right_pt(wu0 + 0.05, wvt + 2), t.right_pt(0.5, wvt + 2), "h")
    # --- sample shelf of finished prints across the bottom of the glazing ---
    sy = wvb - 1
    c.line(t.right_pt(wu0, sy), t.right_pt(wu1, sy), "K")        # shelf line
    for i, frac in enumerate((0.30, 0.50, 0.70)):
        p = t.right_pt(frac, sy)
        px, py = int(round(p[0])), int(round(p[1]))
        c.set(px, py - 1, "o" if i == 1 else "c")               # finished part

    # --- grounded K-framed ENTRY DOOR at the base of the shaded face ---
    du0, du1, dvt, dvb = 0.20, 0.64, 16, t.h - 1
    c.fill_poly([t.right_pt(du0, dvt), t.right_pt(du1, dvt),
                 t.right_pt(du1, dvb), t.right_pt(du0, dvb)], "K")  # frame
    # recessed dark door leaf inside the K frame
    c.fill_poly([t.right_pt(du0 + 0.05, dvt + 1), t.right_pt(du1 - 0.05, dvt + 1),
                 t.right_pt(du1 - 0.05, dvb), t.right_pt(du0 + 0.05, dvb)], "d")
    # centre seam (two-leaf door) + lit front jamb so it reads as an entrance
    c.line(t.right_pt(0.42, dvt + 1), t.right_pt(0.42, dvb), "K")
    c.line(t.right_pt(du0 + 0.07, dvt + 1), t.right_pt(du0 + 0.07, dvb), "D")
    # cyan vision slit high on the door
    for k in range(2):
        slit = t.right_pt(0.30, dvt + 2 + k)
        c.set(int(round(slit[0])), int(round(slit[1])), "c")
    # o-hazard ticks across the door sill (loading lip at the very base)
    sill_l = t.right_pt(du0, dvb)
    sill_r = t.right_pt(du1, dvb)
    sxl, syl = int(round(sill_l[0])), int(round(sill_l[1]))
    sxr = int(round(sill_r[0]))
    x = sxl + 1
    while x < sxr:
        c.set(x, syl, "o")
        c.set(x + 1, syl, "K")
        x += 2


def power_conduit(c, t):
    """A glowing o power line running UP the front corner, riding the LEFT (lit)
    side of the front vertical edge so it does NOT bisect the right-face opening.
    Two K clamps — the Volt power-line motif, vertical to suit the tower."""
    fx0, fy0 = int(round(t.r_front[0])) - 2, int(round(t.r_front[1])) + 1
    fx1, fy1 = int(round(t.w_front[0])) - 2, int(round(t.w_front[1])) - 2
    # run only the UPPER ~55% of the corner so it reads as an accent, not a bar
    bot = (fx1, int(fy0 + 0.55 * (fy1 - fy0)))
    c.line((fx0 - 1, fy0), (bot[0] - 1, bot[1]), "r")        # shaded side
    c.line((fx0, fy0), bot, "o")                             # bright conduit
    for tfrac in (0.30, 0.7):
        cy = int(fy0 + tfrac * (bot[1] - fy0))
        c.set(fx0 - 2, cy, "K")                              # clamp


# ── SIGNATURE: glass-domed extruder chamber printing a layered model ─────────
def print_dome(c, t):
    """Cap the tower with a clear K-framed print-chamber dome. Inside: a gantry
    post + K extruder head over a half-built model drawn as stepped horizontal
    print-lines (hot o/O top cooling to r below). A c filament spool feeds a thin
    c line to the head; an o hot-end glow under the nozzle; a g build-progress
    bar on the dome base."""
    cx, cy = t.roof_pt(0.5, 0.5)
    cx, cy = int(round(cx)), int(round(cy))

    # corrugated metal collar ribs framing the dome footprint on the roof
    for f in (0.24, 0.42, 0.58, 0.76):
        a = t.roof_pt(f, 0.16)
        b = t.roof_pt(f, 0.84)
        c.set(int(round(a[0])), int(round(a[1])), "D")
        c.set(int(round(b[0])), int(round(b[1])), "D")

    # ── dome geometry: a narrow chamber matching the slender tower ──
    rx = 9                    # dome half-width (slimmer than the wide CNC dome)
    base_y = cy + 2           # metal base band (front of dome) sits here
    apex_y = base_y - 18      # rounded chamber top

    def dome_hw(y):
        """Half-width at height y: near-vertical lower walls + a domed cap."""
        if y >= base_y - 9:
            return rx
        tt = (base_y - 9 - y) / float(base_y - 9 - apex_y)
        tt = max(0.0, min(1.0, tt))
        return rx * math.sqrt(max(0.0, 1.0 - tt * tt))

    # --- glass fill (drawn first; the interior print overlays it = see-through) ---
    for y in range(apex_y, base_y + 1):
        hw = dome_hw(y)
        x0 = int(round(cx - hw))
        x1 = int(round(cx + hw))
        for x in range(x0, x1 + 1):
            c.set(x, y, "c" if x <= cx else "G")   # lit left c, shaded right G
    # one diagonal glint on the upper-left glass
    for k in range(3):
        c.set(cx - 5 + k, apex_y + 3 + k, "h")

    # --- dome K outline (silhouette) ---
    for y in range(apex_y, base_y + 1):
        hw = dome_hw(y)
        c.set(int(round(cx - hw)), y, "K")
        c.set(int(round(cx + hw)), y, "K")
    c.set(cx, apex_y - 1, "K")
    c.set(cx, apex_y, "h")

    # --- metal base band the dome sits on (flat 2:1 ellipse, rivets) ---
    ry = 3
    for ang in range(0, 360, 5):
        x = int(round(cx + rx * math.cos(math.radians(ang))))
        y = int(round(base_y + ry * math.sin(math.radians(ang))))
        c.set(x, y, "M" if y >= base_y else "D")
    for ang in range(190, 351, 12):
        x = int(round(cx + rx * math.cos(math.radians(ang))))
        y = int(round(base_y + ry * math.sin(math.radians(ang))))
        c.set(x, y + 1, "K")
    for ang in (210, 250, 290, 330):
        x = int(round(cx + (rx - 2) * math.cos(math.radians(ang))))
        y = int(round(base_y + (ry - 1) * math.sin(math.radians(ang))))
        c.set(x, y, "L")

    # ── INTERIOR PRINT (over the glass) ──
    post_x = cx
    post_top = apex_y + 3
    post_bot = base_y - 1
    # gantry post: 2px steel column with a lit L left edge
    vline(c, post_x, post_top, post_bot, "D")
    vline(c, post_x - 1, post_top, post_bot, "M")
    c.set(post_x - 1, post_top, "K")
    c.set(post_x, post_top, "K")

    # cross-beam the head rides on
    beam_y = post_top + 2
    hline(c, post_x - 4, post_x + 5, beam_y, "M")
    hline(c, post_x - 4, post_x + 5, beam_y + 1, "D")
    c.set(post_x - 5, beam_y, "K")
    c.set(post_x + 6, beam_y, "K")

    # filament spool: a round 3x3 cyan disc on the right end of the beam
    spool_x, spool_y = post_x + 5, beam_y + 4
    disc = [(0, -1, "K"), (-1, 0, "K"), (1, 0, "K"), (0, 1, "K"),
            (-1, -1, "c"), (1, -1, "c"), (-1, 1, "c"), (1, 1, "c"),
            (0, 0, "h")]
    for dx, dy, ch in disc:
        c.set(spool_x + dx, spool_y + dy, ch)
    c.set(spool_x, beam_y + 1, "D")          # axle arm up to the beam

    # extruder head: K carriage on the post, nozzle pointing down at the part
    head_y = base_y - 13
    hx = post_x
    c.set(hx - 1, head_y, "K"); c.set(hx, head_y, "K"); c.set(hx + 1, head_y, "K"); c.set(hx + 2, head_y, "K")
    c.set(hx - 1, head_y + 1, "K"); c.set(hx, head_y + 1, "D"); c.set(hx + 1, head_y + 1, "D"); c.set(hx + 2, head_y + 1, "K")
    c.set(hx, head_y + 2, "K")               # nozzle shoulder
    c.set(hx + 1, head_y + 2, "K")
    c.set(hx, head_y + 3, "K")               # nozzle tip
    # cyan filament line: spool -> across the beam -> down into the head
    c.line((spool_x, spool_y + 2), (hx + 2, head_y), "c")
    c.set(hx + 2, head_y - 1, "c")
    # hot-end glow dot directly under the nozzle, on the topmost hot layer
    c.set(hx, head_y + 4, "O")

    # --- the half-built model: a stack of DISCRETE horizontal print-lines.
    # Each course = a 2px warm band with a hard 1px dark seam below it; top
    # course HOT (o/O), cooling to amber r toward the base. Squat profile.
    part_top = head_y + 5
    courses = [
        (0, 2, "o"),   # top course: freshly extruded, hot, narrow
        (2, 3, "O"),   # warm
        (4, 3, "r"),   # cooling
        (6, 4, "r"),   # cooled base course (widest)
    ]
    for dy, hw, band in courses:
        y = part_top + dy
        hline(c, post_x - hw, post_x + hw, y, band)
        hline(c, post_x - hw, post_x + hw, y + 1, band)
    # hard dark seam line under each course = the visible print-line boundary
    for dy, hw, band in courses:
        y = part_top + dy
        for x in range(post_x - hw, post_x + hw + 1):
            below = c.px[y + 2][x] if 0 <= y + 2 < c.h and 0 <= x < c.w else "."
            if below in ("o", "O", "r"):
                c.set(x, y + 2, "d")
    # crisp K side outline tracing the model profile
    for dy, hw, band in courses:
        y = part_top + dy
        for yy in (y, y + 1):
            c.set(post_x - hw - 1, yy, "K")
            c.set(post_x + hw + 1, yy, "K")
    c.set(post_x - 2, part_top - 1, "K")
    c.set(post_x + 2, part_top - 1, "K")
    # lit metal build bed the model is printed on
    bed_y = part_top + 8
    hline(c, post_x - 5, post_x + 5, bed_y, "L")
    c.set(post_x - 6, bed_y, "K")
    c.set(post_x + 6, bed_y, "K")
    hline(c, post_x - 5, post_x + 5, bed_y + 1, "K")

    # --- g build-progress bar on the FRONT of the dome base ---
    bar_y = base_y + ry + 1
    bx0, bx1 = cx - 7, cx + 7
    hline(c, bx0, bx1, bar_y, "K")
    hline(c, bx0, bx1, bar_y + 2, "K")
    c.set(bx0, bar_y + 1, "K"); c.set(bx1, bar_y + 1, "K")
    hline(c, bx0 + 1, bx1 - 1, bar_y + 1, "G")            # empty track
    fill_to = bx0 + int((bx1 - bx0) * 0.6)
    hline(c, bx0 + 1, fill_to - 1, bar_y + 1, "g")        # filled progress
    c.set(fill_to, bar_y + 1, "h")                       # advancing edge


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS additive-
# manufacturing structure onto the prior tower — never restarts, never recolors
# the whole building. Theme: the slender print tower grows into a fully built-out,
# high-tech print FARM. Colours mature stage by stage; gold (q) only at t5.
#
#   t2  small functional add : a FILAMENT-SPOOL RACK + feed tube on the lit face
#   t3  structural add       : a SECOND PRINT-BAY annex (shorter glass-domed sub-tower)
#   t4  major add            : a tall DRYING/CURING SILO with a glowing e UV-cure window
#   t5  crowning feature     : the dome becomes a MULTI-HEAD PRINT FARM (three E parts)
#                              + gold dome ribs & finial
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_spool_rack(c, t):
    """t2 — SMALL FUNCTIONAL ADD: a wall-mounted FILAMENT-SPOOL RACK with three
    coloured spools + a feed tube routing up toward the print dome, bolted to the
    tower's LEFT (lit) face. On-theme (more printing supply), modest, base palette;
    brightens the o heater-block accent at the feed inlet. Sits low-front on the
    lit face so it never collides with the dome signature up top."""
    # A compact wall RACK low on the lit face holding TWO filament spools SIDE BY
    # SIDE (horizontal, so they read as round spools, not a vertical smear), on a
    # short K shelf, fed by a tiny tube to a brightened o heater inlet. Placed on the
    # clear mid-left lit wall, clear of the dome above and of the t3 bay's dome.
    # K shelf the spools sit on
    sh0 = t.left_pt(0.18, 13.0)
    sh1 = t.left_pt(0.66, 13.0)
    sx0, sy = int(round(sh0[0])), int(round(sh0[1]))
    sx1 = int(round(sh1[0]))
    hline(c, sx0, sx1, sy, "K")
    hline(c, sx0, sx1, sy + 1, "d")                   # shelf shadow
    # two 3x3 round spools resting on the shelf, side by side
    for cxs, body, rim in [(sx0 + 2, "c", "h"), (sx0 + 6, "o", "O")]:
        cys = sy - 2
        disc = [(0, -1), (-1, 0), (1, 0), (0, 1)]
        for dx, dy in disc:
            c.set(cxs + dx, cys + dy, body)
        for dx, dy in [(-1, -1), (1, -1), (-1, 1), (1, 1), (0, -2), (-2, 0), (2, 0)]:
            c.set(cxs + dx, cys + dy, "K")
        c.set(cxs, cys, rim)                          # bright hub
    # tiny feed tube from the cyan spool up to a brightened o heater inlet
    c.line((sx0 + 2, sy - 4), (sx0 + 3, sy - 6), "c")
    c.set(sx0 + 3, sy - 7, "O")


def stage3_second_bay(c):
    """t3 — STRUCTURAL ADD: a SECOND PRINT BAY — a shorter glass-domed sub-tower
    stepped off the FRONT-LEFT of the main tower, abutting the materials annex so
    the silhouette gains a stepped, two-bay massing. A real new structural mass
    (its own Box + a small glass dome) echoing the hero tower at a smaller scale.
    Introduces the matured deep-steel tone `b` for its shaded base trim."""
    # a slim secondary tower stepped to the FRONT-LEFT of the main one, shorter
    # (h=16) and NEARER the viewer so it pokes out clearly instead of hiding behind
    # the main tower. Drawn AFTER the main tower in build(), so it occludes the
    # tower's lower-left and reads as a distinct second bay.
    s = Box((19, 37), wx=5, wy=4, h=16)
    s.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # deep-steel base band so the new mass reads as matured structure
    c.line(s.w_left, s.w_front, "b")
    c.line(s.w_front, s.w_right, "b")
    # a couple of vertical D corrugation ribs on its lit face
    for u in (0.34, 0.62, 0.88):
        c.line(s.left_pt(u, 1), s.left_pt(u, s.h - 1), "D")
    # a small cyan build-window on its lit (left) face — visible toward the viewer
    s.window(c, "left", 0.22, 0.74, 3.0, 8.0, glass="g", hi="h", shade="G",
             frame="K", mullions=1)
    # --- a small glass dome capping the secondary bay (echoes the hero dome) ---
    cx, cy = s.roof_pt(0.5, 0.5)
    cx, cy = int(round(cx)), int(round(cy))
    rx = 5
    base_y = cy + 1
    apex_y = base_y - 9

    def hw(y):
        if y >= base_y - 4:
            return rx
        tt = (base_y - 4 - y) / float(base_y - 4 - apex_y)
        tt = max(0.0, min(1.0, tt))
        return rx * math.sqrt(max(0.0, 1.0 - tt * tt))

    for y in range(apex_y, base_y + 1):
        w = hw(y)
        for x in range(int(round(cx - w)), int(round(cx + w)) + 1):
            c.set(x, y, "c" if x <= cx else "G")
    for y in range(apex_y, base_y + 1):
        w = hw(y)
        c.set(int(round(cx - w)), y, "K")
        c.set(int(round(cx + w)), y, "K")
    c.set(cx, apex_y - 1, "K")
    c.set(cx - 2, apex_y + 2, "h")              # glass glint
    # metal base band
    for ang in range(0, 360, 12):
        x = int(round(cx + rx * math.cos(math.radians(ang))))
        y = int(round(base_y + 2 * math.sin(math.radians(ang))))
        c.set(x, y, "M" if y >= base_y else "D")
    # a tiny half-built o part inside the secondary dome (printing too)
    c.set(cx, base_y - 3, "o")
    c.set(cx, base_y - 2, "r")
    return s


def stage4_curing_silo(c, t):
    """t4 — MAJOR ADD: a tall cylindrical DRYING / CURING SILO standing on the
    RIGHT (shaded) side of the main tower, where finished parts cure under UV. A
    prominent new vertical mass: a deep-steel `b` cylinder ringed with bands, a tall
    glowing `e` UV-cure viewport up its front, and a vent dome cap. Palette matures
    here — deep `b` structure + energized cyan `e/E` cure glow. Kept on-canvas, to
    the right of the tower, clear of the hero dome above."""
    cx = 52                       # silo centre x (right of the tower, on-canvas)
    base_y = 40                   # silo foot
    top_y = 16                    # silo shoulder
    rx = 5                        # silo half-width

    # --- cylinder body: lit-left b / shaded-right darker, K silhouette ---
    for y in range(top_y, base_y + 1):
        for x in range(cx - rx, cx + rx + 1):
            # round shading: left lit (M), centre b, right shaded (K-ish d)
            off = (x - cx)
            if off <= -rx + 1:
                ch = "M"
            elif off >= rx - 1:
                ch = "d"
            elif off < 0:
                ch = "b"
            else:
                ch = "b"
            c.set(x, y, ch)
    # K silhouette sides + a lit L sheen stripe up the left
    for y in range(top_y, base_y + 1):
        c.set(cx - rx, y, "K")
        c.set(cx + rx, y, "K")
        c.set(cx - rx + 1, y, "L")
    # horizontal banding rings (deep-steel structure)
    for y in (top_y + 5, top_y + 12, top_y + 19):
        for x in range(cx - rx + 1, cx + rx):
            c.set(x, y, "D")
        c.set(cx - rx + 1, y, "M")
    # rounded shoulder cap (2:1 ellipse) + a small vent cowl on top
    for ang in range(0, 181, 8):
        x = int(round(cx + rx * math.cos(math.radians(ang))))
        y = int(round(top_y - 3 * math.sin(math.radians(ang))))
        c.set(x, y, "M" if x <= cx else "D")
        c.set(x, top_y, "K")
    c.set(cx, top_y - 3, "K")
    c.fill_poly([(cx - 1, top_y - 3), (cx + 1, top_y - 3),
                 (cx + 1, top_y - 6), (cx - 1, top_y - 6)], "D")   # vent stub
    c.line((cx - 2, top_y - 6), (cx + 2, top_y - 6), "M")          # cowl lip
    c.set(cx, top_y - 7, "K")
    # foot plinth grounding the silo
    c.line((cx - rx, base_y), (cx + rx, base_y), "K")
    c.line((cx - rx - 1, base_y + 1), (cx + rx + 1, base_y + 1), "d")

    # --- tall glowing e UV-CURE VIEWPORT up the front of the silo ---
    vx0, vx1 = cx - 2, cx + 1
    vy0, vy1 = top_y + 7, base_y - 4
    c.fill_poly([(vx0, vy0), (vx1, vy0), (vx1, vy1), (vx0, vy1)], "e")
    # bright E core column + cooler G edges = glowing UV interior
    for y in range(vy0, vy1 + 1):
        c.set(cx - 1, y, "E")
        c.set(cx, y, "e")
    c.set(cx - 1, vy0, "E")
    # K frame around the viewport
    for a, b in [((vx0, vy0), (vx1, vy0)), ((vx0, vy1), (vx1, vy1)),
                 ((vx0, vy0), (vx0, vy1)), ((vx1, vy0), (vx1, vy1))]:
        c.line(a, b, "K")
    # a curing part silhouette floating in the UV column
    c.set(cx - 1, (vy0 + vy1) // 2, "h")
    c.set(cx, (vy0 + vy1) // 2 + 1, "W")
    # a short feed conduit from the tower over to the silo top (linked plant)
    fp = t.right_pt(0.95, 3)
    c.line((int(round(fp[0])), int(round(fp[1]))), (cx - rx, top_y + 2), "D")
    c.set(cx - rx, top_y + 2, "K")


def stage5_print_farm(c, t):
    """t5 — CROWNING FEATURE = FULLY EVOLVED print plant. The hero dome becomes a
    MULTI-HEAD PRINT FARM: a gantry crossbeam carrying THREE extruder heads, each
    rising a glowing E/e part in unison, the whole chamber lit with energized cyan
    mist. GOLD premium trim is the flourish — gold dome ribs over the glass + a gold
    finial spire crowning the apex. Reads as elite, still the same print tower maxed
    out."""
    cx, cy = t.roof_pt(0.5, 0.5)
    cx, cy = int(round(cx)), int(round(cy))
    base_y = cy + 2
    apex_y = base_y - 18
    rx = 9

    # --- multi-head gantry: a wide K/M crossbeam spanning the dome interior ---
    beam_y = apex_y + 7
    bx0, bx1 = cx - 6, cx + 6
    c.line((bx0, beam_y), (bx1, beam_y), "M")
    c.line((bx0, beam_y + 1), (bx1, beam_y + 1), "D")
    c.set(bx0 - 1, beam_y, "K")
    c.set(bx1 + 1, beam_y, "K")
    # three extruder heads hanging off the beam, each over a rising glowing part
    head_xs = [cx - 5, cx, cx + 5]
    for hx in head_xs:
        # head carriage
        c.set(hx, beam_y + 1, "K")
        c.set(hx - 1, beam_y + 2, "K")
        c.set(hx, beam_y + 2, "D")
        c.set(hx + 1, beam_y + 2, "K")
        c.set(hx, beam_y + 3, "K")            # nozzle tip
        # hot-end glow + a glowing E/e printed part rising under each nozzle
        c.set(hx, beam_y + 4, "O")
        for j, ch in enumerate(("E", "E", "e", "e")):
            yy = beam_y + 5 + j
            c.set(hx - 1, yy, ch)
            c.set(hx, yy, ch)
            c.set(hx + 1, yy, "G" if ch == "e" else "e")
        # K side outline of each part
        c.set(hx - 2, beam_y + 6, "K")
        c.set(hx + 2, beam_y + 6, "K")
    # a faint cyan mist band across the chamber floor (energized plant)
    floor_y = base_y - 2
    for x in range(cx - 6, cx + 7, 2):
        c.set(x, floor_y, "e")

    # --- GOLD dome RIBS arcing over the glass (premium trim flourish) ---
    def dome_hw(y):
        if y >= base_y - 9:
            return rx
        tt = (base_y - 9 - y) / float(base_y - 9 - apex_y)
        tt = max(0.0, min(1.0, tt))
        return rx * math.sqrt(max(0.0, 1.0 - tt * tt))

    for rib_u in (-0.62, 0.0, 0.62):          # three meridian ribs over the dome
        for y in range(apex_y + 1, base_y - 1, 1):
            hw = dome_hw(y)
            x = cx + int(round(rib_u * hw))
            # only draw the rib where it is inside the glass silhouette
            if abs(x - cx) <= hw:
                c.set(x, y, "q")
        # darker gold underside next to each rib for a little relief
    # gold base ring trim band around the dome foot
    for ang in range(180, 361, 10):
        x = int(round(cx + rx * math.cos(math.radians(ang))))
        y = int(round(base_y + 3 * math.sin(math.radians(ang))))
        c.set(x, y, "q")

    # --- GOLD FINIAL spire crowning the apex ---
    fy = apex_y - 1
    c.set(cx, fy, "q")
    c.set(cx, fy - 1, "q")
    c.set(cx, fy - 2, "O")                     # bright tip
    c.set(cx - 1, fy, "r")                     # shaded side of the spire
    c.set(cx + 1, fy, "O")                     # lit glint


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the 3D-printing tower at upgrade `stage` (1..5). Stage 1 is IDENTICAL
    to the shipped base; each higher stage keeps every prior addition and bolts on
    the next (t2 spool rack → t3 second bay → t4 curing silo → t5 multi-head farm +
    gold). Painter's order keeps rooftop/overhead additions on top of the masses
    they grow from."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    base_annex(c)              # low LEFT annex first (back), tower occludes it
    t = tower(c)
    corrugated_walls(c, t)
    left_vents(c, t)
    right_face(c, t)           # the RIGHT-side opening (door + glazing)
    power_conduit(c, t)
    if stage >= 3:
        stage3_second_bay(c)   # second bay nearer the viewer, occludes tower base
    if stage >= 4:
        stage4_curing_silo(c, t)   # silo to the right, behind the dome crown
    print_dome(c, t)           # signature crown (on top)

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    if stage >= 2:
        stage2_spool_rack(c, t)
    if stage >= 5:
        stage5_print_farm(c, t)    # multi-head + gold, drawn last over the dome

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/volt_lab"
PREVIEW_DIR = "/path/to/scienium/art/preview"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview. Stage 1 only re-emits the JSON; it must keep matching the
    shipped 3d-printing-shop.png, so it does NOT overwrite the base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": VOLT, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"volt_lab_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"volt_lab_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
