#!/usr/bin/env python3
"""
CNC Mill Shop — Volt Lab economy building (BESPOKE-FORM REBUILD).

This is NOT the gateway cube. It is composed from the iso BUILDING TOOLKIT
(isobuild.Box + cylinder) as a WIDE LOW machine-shop hall with its own massing:

  * a broad, low main hall Box (wide & squat, unlike the tall square gateway);
  * a long narrow raised CLERESTORY MONITOR Box on the BACK roof ridge (factory
    north-light) carrying a band of small cyan clerestory windows — the key
    silhouette cue that says "factory", not "box";
  * a tall narrow DUST-CYCLONE cylinder abutting the back-right corner, with a
    glowing `o` conduit run to it;
  * a WIDE SEGMENTED ROLL-UP SHUTTER DOOR on the lit front face (horizontal
    D/M slats under a K lintel) + a small cyan control readout panel + hazard
    chevrons on the sill — bespoke glazing, NOT two stock gateway windows.

Signature: a K-framed glass enclosure on the FRONT-RIGHT roof (clear of the
monitor) holding a 3-axis cutting gantry — a spindle carriage on twin D rails,
a tool bit pointing straight DOWN into a clamped L workpiece with a K cut-notch
removed, a white-hot O cut spark + c/h coolant mist + o swarf chips. Subtractive.

UPGRADE EVOLUTION (cumulative — each stage keeps the prior additions and bolts on
the next; stage 1 stays byte-identical to the shipped cnc-mill-shop.png):
  t2  small functional add : an auxiliary DUST-CYCLONE collector can + short
                             ducting beside the clerestory + a brightened o
                             chip-chute light (more swarf-handling).
  t3  structural add       : a TOOL-CAROUSEL annex bolted to the lit side wall —
                             a low cylinder magazine of indexed tool holders
                             (new `b` deep-steel shadow).
  t4  major add            : a second CLERESTORY MONITOR bay raising the roofline
                             + a glowing `e` COOLANT TANK on the shaded flank
                             (cooler `b` structure tones arrive).
  t5  crowning feature     : a GLASS-BOXED SECOND CUTTING GANTRY twinning the
                             signature — twin spindles carving stock in `E`
                             coolant mist, `q` GOLD rails on the gantry box.
"""
import os, sys, json, math, subprocess

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

SLUG = "cnc-mill-shop"

# Base Volt palette (shared keys) + a few EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so cnc-mill-shop.png is
# unchanged):
#   b  deep cool steel  — matured structure tone for t4+ new masses
#   e  energized cyan glow (mid)   E  energized cyan glow (bright) — the t4/t5 power
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
VOLT = {"K": "#15181d", "W": "#eef2f6", "L": "#cdd6dd", "M": "#9aa3ad", "D": "#6c7682", "d": "#49515b",
        "h": "#d6f9ff", "c": "#aef0fb", "g": "#38cfe2", "G": "#1f8ba0",
        "o": "#ffe85a", "O": "#fff7a8", "r": "#c89a14",
        "b": "#3b4350", "e": "#6fe6f4", "E": "#caf7ff", "q": "#f3c63a"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def rect(c, x0, y0, x1, y1, fill=None, outline=None):
    if fill is not None:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                c.set(x, y, fill)
    if outline is not None:
        for x in range(x0, x1 + 1):
            c.set(x, y0, outline); c.set(x, y1, outline)
        for y in range(y0, y1 + 1):
            c.set(x0, y, outline); c.set(x1, y, outline)


# ── 1. DUST CYCLONE (back-right, drawn first so the hall occludes its base) ──
def dust_cyclone(c):
    """Tall narrow cyclone collector standing at the back-right corner."""
    cx, top_y, rx, h = 50, 9, 4, 20
    cylinder(c, cx, top_y, rx, h, top="L", side_l="M", side_r="D")
    # conical hopper bottom: taper to a point under the drum
    for i, yy in enumerate(range(top_y + h + 1, top_y + h + 6)):
        w = max(0, rx - 1 - i)
        c.line((cx - w, yy), (cx + w, yy), "D")
        c.set(cx - w, yy, "K"); c.set(cx + w, yy, "K")
    c.set(cx, top_y + h + 6, "K")
    # lit seam down the front of the drum + two band rings
    c.line((cx - rx + 1, top_y + 2), (cx - rx + 1, top_y + h - 1), "L")
    for ry in (top_y + 7, top_y + 14):
        c.line((cx - rx, ry), (cx + rx, ry), "d")
    # intake elbow on the back-left shoulder + cap glint
    c.set(cx - rx - 1, top_y + 3, "K"); c.set(cx - rx - 1, top_y + 4, "D")
    c.set(cx - 1, top_y - 1, "h")


# ── 2. MAIN HALL — wide low Box (the bespoke break from the square cube) ─────
def main_hall(c):
    """Broad, low shop-floor hall. wx=15 wy=8 h=13 -> distinctly wider than tall."""
    hall = Box(top=(26, 21), wx=15, wy=8, h=13)
    hall.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    return hall


def corrugation(c, hall):
    """Corrugated metal ribs + rivets on the two walls (Volt motif)."""
    # right (shaded) face: vertical rib grooves (left face carries the door)
    for u in (0.2, 0.4, 0.6, 0.8):
        c.line(hall.right_pt(u, 1), hall.right_pt(u, 12), "K")
    # rivet line just under the left eave
    for u in (0.1, 0.3, 0.5, 0.7, 0.9):
        p = hall.left_pt(u, 1.5); c.set(int(p[0]), int(p[1]), "L")


# ── 3. CLERESTORY MONITOR — long narrow raised ridge box on the BACK roof ────
def clerestory_monitor(c, hall):
    """A raised north-light monitor on the BACK-LEFT ridge; cyan window band on
    its lit face. This raised ridge is the silhouette cue that says 'factory'.

    Kept narrow (wy=2) and clearly lifted (h=7) so it stands proud as its own
    block, and pulled back-left so it never overlaps the front gantry box."""
    base = hall.roof_pt(0.18, 0.80)          # back-left region of the roof
    mon = Box(top=(base[0], base[1] - 12), wx=11, wy=2, h=7)
    mon.draw(c, roof="M", lwall="L", rwall="d", roof_hi="W", outline="K")
    # clerestory window band: small cyan lights along the lit (left) face
    for i in range(5):
        u0 = 0.10 + i * 0.175
        mon.window(c, "left", u0, u0 + 0.095, 2.0, 5.2, glass="g", mullions=0)
    # bright sun-glint along the monitor crest
    c.line(mon.r_top, mon.r_right, "W")
    return mon


# ── 4. ROLL-UP SHUTTER DOOR + control panel on the lit (left) face ───────────
def shutter_door(c, hall):
    """Wide segmented roll-up shutter (horizontal slats), control panel, chevrons."""
    u0, u1 = 0.08, 0.60          # door spans most of the lit face
    vt, vb = 2.5, 12
    # K opening frame (lintel + jambs)
    c.fill_poly([hall.left_pt(u0, vt), hall.left_pt(u1, vt),
                 hall.left_pt(u1, vb), hall.left_pt(u0, vb)], "K")
    # segmented slats: alternating M / D horizontal bars, inset inside the K frame
    iu0, iu1 = u0 + 0.015, u1 - 0.015
    n = 7
    for k in range(n):
        v = vt + 0.8 + k * (vb - vt - 1) / n
        body = "M" if k % 2 == 0 else "D"
        c.line(hall.left_pt(iu0, v), hall.left_pt(iu1, v), body)
        c.line(hall.left_pt(iu0, v + 0.45), hall.left_pt(iu1, v + 0.45), body)
        c.line(hall.left_pt(iu0, v + (vb - vt - 1) / n - 0.05),
               hall.left_pt(iu1, v + (vb - vt - 1) / n - 0.05), "K")
    # bright crest on the rolled top slat
    c.line(hall.left_pt(iu0, vt + 0.8), hall.left_pt(iu1, vt + 0.8), "L")
    # vertical guide rails (lit left jamb, dark right jamb)
    c.line(hall.left_pt(u0, vt), hall.left_pt(u0, vb), "L")
    c.line(hall.left_pt(u1, vt), hall.left_pt(u1, vb), "K")
    # hazard chevrons along the door SILL (o / K teeth)
    sill = hall.left_pt(u0 + 0.02, vb - 0.2)
    sx, sy = int(round(sill[0])), int(round(sill[1]))
    for k in range(9):
        x = sx + k * 2
        c.set(x, sy, "o"); c.set(x + 1, sy, "K")

    # small cyan CONTROL READOUT panel beside the door (toward the front corner)
    cp0, cp1 = 0.70, 0.90
    c.fill_poly([hall.left_pt(cp0, 3.5), hall.left_pt(cp1, 3.5),
                 hall.left_pt(cp1, 8.5), hall.left_pt(cp0, 8.5)], "K")
    c.fill_poly([hall.left_pt(cp0 + 0.018, 4.2), hall.left_pt(cp1 - 0.018, 4.2),
                 hall.left_pt(cp1 - 0.018, 7.8), hall.left_pt(cp0 + 0.018, 7.8)], "g")
    c.line(hall.left_pt(cp0 + 0.02, 5.2), hall.left_pt(cp1 - 0.02, 5.2), "G")
    c.line(hall.left_pt(cp0 + 0.02, 6.4), hall.left_pt(cp1 - 0.02, 6.4), "G")
    gp = hall.left_pt(cp0 + 0.05, 4.6); c.set(int(gp[0]), int(gp[1]), "h")
    # two status LEDs above the panel
    led = hall.left_pt(cp0 + 0.04, 2.8); c.set(int(led[0]), int(led[1]), "o")
    led = hall.left_pt(cp1 - 0.06, 2.8); c.set(int(led[0]), int(led[1]), "O")


def power_line_and_conduit(c, hall):
    """Glowing o power line along the front-left eave + conduit run to cyclone."""
    # glowing power line along the lit front eave (Volt motif)
    c.line(hall.left_pt(0.04, 1.2), hall.left_pt(0.96, 1.2), "o")
    c.line(hall.left_pt(0.04, 2.0), hall.left_pt(0.96, 2.0), "r")
    # short conduit: a crisp vertical drop straight down the cyclone to the roof
    # eave (no long diagonal across the wall). cyclone base ~ x=50, y=29.
    cdx = 50
    c.line((cdx, 24), (cdx, 31), "o")          # glowing power drop
    c.line((cdx + 1, 24), (cdx + 1, 31), "r")  # shaded core sliver
    # a couple of K/M clamp dots fixing the conduit to the drum/wall
    for cy in (26, 29):
        c.set(cdx - 1, cy, "K"); c.set(cdx + 2, cy, "M")


# ── 5. SIGNATURE — glass-boxed 3-axis cutting gantry on the FRONT-RIGHT roof ──
def gantry_enclosure(c, hall):
    """K-framed glass enclosure holding a 3-axis mill carving a clamped block,
    placed on the FRONT-RIGHT roof clear of the monitor so the milling reads."""
    cx, ty = 37, 28          # back-top vertex of the glass lid (front-right roof)
    w = 10
    top = (cx, ty)
    rgt = (cx + w, ty + w // 2)
    bot = (cx, ty + w)
    lft = (cx - w, ty + w // 2)
    # K corner posts giving the box clear height above the roof deck
    for p in (lft, bot, rgt):
        c.set(int(p[0]), int(p[1]) + 1, "K")
        c.set(int(p[0]), int(p[1]) + 2, "d")
    # translucent cyan glass lid (uniform), top-left glint + bottom-right shade
    c.fill_poly([top, rgt, bot, lft], "c")
    c.line((cx - 5, ty + 4), (cx - 1, ty + 1), "h")          # glint
    c.line((cx + 2, ty + w - 1), (cx + w - 1, ty + w // 2 + 1), "g")  # shade sliver
    # K frame on all four edges -> one unified box
    for a, b in [(top, rgt), (rgt, bot), (bot, lft), (lft, top)]:
        c.line(a, b, "K")

    # The machine sits on the box's interior deck. Center it on the lid.
    mx, my = cx, ty + 4      # working centre of the gantry

    # --- gantry bridge: twin D rails spanning the box, carriage between them ---
    c.line((mx - 6, my - 1), (mx + 6, my - 1), "D")          # back rail
    c.line((mx - 6, my), (mx + 6, my), "d")                  # front rail
    for px in (mx - 7, mx + 7):                              # rail end posts
        c.set(px, my - 1, "D"); c.set(px, my, "d"); c.set(px, my + 1, "K")

    # --- spindle carriage: K-outlined M box riding the rails ---
    rect(c, mx - 2, my - 2, mx + 2, my + 1, fill="M", outline="K")
    rect(c, mx - 1, my - 2, mx + 1, my - 2, fill="L")        # lit crown
    rect(c, mx - 1, my - 1, mx + 1, my - 1, fill="D")        # body shade
    # spindle barrel + tool bit pointing straight DOWN
    c.set(mx, my + 2, "L"); c.set(mx, my + 3, "L")           # bright steel tool bit

    # --- workpiece block clamped to the bed, with a K cut-notch removed ---
    wy0, wy1, wy2 = my + 4, my + 5, my + 6
    rect(c, mx - 5, wy0, mx + 5, wy0, fill="L")              # bright lit top plate
    rect(c, mx - 5, wy1, mx + 5, wy2, fill="D")              # block body
    rect(c, mx - 5, wy1, mx + 5, wy1, fill="M")              # mid shade band
    # clamp jaws gripping each end
    rect(c, mx - 6, wy0, mx - 6, wy2, fill="M")
    rect(c, mx + 6, wy0, mx + 6, wy2, fill="M")
    c.set(mx - 6, wy2, "K"); c.set(mx + 6, wy2, "K")
    # THE NOTCH: a clear 2px square bite removed from the plate, under the bit
    c.set(mx, wy0, "K"); c.set(mx - 1, wy0, "K")             # notch mouth (void)
    c.set(mx, wy1, "d"); c.set(mx - 1, wy1, "d")             # recessed notch floor

    # --- focused cut: white-hot spark + coolant mist + swarf chips ---
    c.set(mx, my + 3, "O")                                   # white-hot cut spark
    c.set(mx + 1, my + 3, "h")                               # coolant mist glint
    c.set(mx - 2, my + 2, "c")                               # coolant mist puff
    c.set(mx + 2, my + 2, "o"); c.set(mx + 3, my + 1, "O")  # swarf chips flick right
    c.set(mx + 4, my + 2, "o")
    return cx, ty, w


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS swarf-handling
# / tooling / cutting structure onto the prior form — never restarts, never recolors
# the whole building. Theme: the machine shop grows into a fully built-out, high-tech
# CNC cell. Colours mature stage by stage; gold (q) only as a t5 flourish.
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_aux_cyclone(c, hall):
    """t2 — SMALL FUNCTIONAL ADD: an auxiliary DUST-CYCLONE collector can with a
    short duct run, mounted on the BACK ROOF RIDGE in the clear gap between the
    clerestory monitor (back-left) and the corner cyclone (back-right), plus a
    brightened O chip-chute light. More swarf-handling capacity — on-theme,
    modest, base palette + brightened accent.

    Seated on the back ridge (roof_pt ~0.30,0.95) so its can rises into the empty
    sky between the monitor and the corner cyclone, clear of the gantry box."""
    bx, by = hall.roof_pt(0.30, 0.95)        # back ridge, right of monitor 1
    bx, by = int(round(bx)), int(round(by))
    # a short squat collector can (smaller sibling of the corner cyclone)
    cyl_cx, cyl_top, cyl_rx, cyl_h = bx, by - 9, 2, 7
    cylinder(c, cyl_cx, cyl_top, cyl_rx, cyl_h, top="L", side_l="M", side_r="D")
    # little conical hopper under the can, tapering to a point on the roof
    for i, yy in enumerate(range(cyl_top + cyl_h + 1, cyl_top + cyl_h + 3)):
        w = max(0, cyl_rx - 1 - i)
        c.line((cyl_cx - w, yy), (cyl_cx + w, yy), "D")
        c.set(cyl_cx - w, yy, "K"); c.set(cyl_cx + w, yy, "K")
    c.set(cyl_cx, cyl_top + cyl_h + 3, "K")
    # lit seam + one band ring on the drum
    c.line((cyl_cx - cyl_rx + 1, cyl_top + 1), (cyl_cx - cyl_rx + 1, cyl_top + cyl_h - 1), "L")
    c.line((cyl_cx - cyl_rx, cyl_top + 3), (cyl_cx + cyl_rx, cyl_top + 3), "d")
    # short intake DUCT: a stubby pipe elbow dropping from the can down-right toward
    # the gantry cell, clamped to the roof — reads as ducted swarf extraction.
    c.line((cyl_cx + cyl_rx, cyl_top + cyl_h - 2), (cyl_cx + cyl_rx + 3, cyl_top + cyl_h), "M")
    c.line((cyl_cx + cyl_rx, cyl_top + cyl_h - 1), (cyl_cx + cyl_rx + 3, cyl_top + cyl_h + 1), "D")
    c.set(cyl_cx + cyl_rx, cyl_top + cyl_h - 2, "K")
    c.set(cyl_cx + cyl_rx + 3, cyl_top + cyl_h, "K")
    # brightened O chip-chute light at the duct foot (the t2 accent brighten)
    c.set(cyl_cx + cyl_rx + 3, cyl_top + cyl_h + 1, "O")
    c.set(cyl_cx - 1, cyl_top - 1, "h")      # cap glint


def stage3_tool_carousel(c, hall):
    """t3 — STRUCTURAL ADD: a TOOL-CAROUSEL annex standing on the open ground in
    FRONT of the hall's lit (left) wall, toward the front-left corner — an upright
    drum magazine of indexed tool holders on a deep-steel plinth. A real new
    structural mass, drawn after the hall so it reads clearly. Introduces the
    matured deep-steel `b` tone for its plinth/shadow.

    Pulled FORWARD onto open floor (down-left of the wall, below the hazard kerb)
    so it never collides with the roll-up door on the wall face above it."""
    # base point: forward of the front-left wall corner, on open ground
    ax, ay = hall.w_left[0] + 4, hall.w_left[1] + 5
    ax, ay = int(round(ax)), int(round(ay))
    # deep-steel plinth/shadow the carousel stands on (grounds it)
    c.fill_poly([(ax - 2, ay + 5), (ax + 4, ay + 5), (ax + 5, ay + 7), (ax - 1, ay + 7)], "b")
    c.set(ax - 2, ay + 5, "K"); c.set(ax + 5, ay + 7, "K")
    # the drum magazine: an upright cylinder (the indexing carousel body)
    dr_cx, dr_top, dr_rx, dr_h = ax + 1, ay - 2, 3, 6
    cylinder(c, dr_cx, dr_top, dr_rx, dr_h, top="L", side_l="M", side_r="D")
    # indexed TOOL HOLDERS: short K-shanked bits with bright L tips poking radially
    # out of the top rim ellipse — the clear "tool carousel" read.
    for a in range(0, 181, 30):
        rim_x = dr_cx + dr_rx * math.cos(math.radians(a))
        rim_y = dr_top + dr_rx * 0.5 * math.sin(math.radians(a))
        tx = dr_cx + (dr_rx + 2) * math.cos(math.radians(a))
        ty = dr_top + (dr_rx * 0.5 + 1) * math.sin(math.radians(a))
        c.line((rim_x, rim_y), (tx, ty), "K")            # tool shank
        c.set(int(round(tx)), int(round(ty)), "L")       # bright bit tip
    # a darker hub dot + lit index seam + band ring on the drum face
    c.set(dr_cx, dr_top, "d")
    c.line((dr_cx - dr_rx + 1, dr_top + 1), (dr_cx - dr_rx + 1, dr_top + dr_h - 1), "L")
    c.line((dr_cx - dr_rx, dr_top + 3), (dr_cx + dr_rx, dr_top + 3), "d")
    # a small cyan index-readout dot on the carousel base (status)
    c.set(dr_cx + 1, dr_top + dr_h - 1, "g")


def stage4_second_monitor_and_tank(c, hall):
    """t4 — MAJOR ADD: a SECOND CLERESTORY MONITOR bay raising the roofline in
    FRONT of the first (so the factory north-light doubles and the roof steps up),
    PLUS a glowing `e` COOLANT TANK on the shaded RIGHT flank feeding the cell.
    The prominent new masses that say 'this shop scaled up'. Palette matures with
    deep `b` structure and energized cyan `e`."""
    # --- second clerestory monitor: a twin of the signature ridge box, set one
    #     row toward the FRONT-RIGHT of the first monitor so the roofline reads as
    #     a stepped pair. Kept clear of the front gantry box (x ~27..47, y ~28..38).
    base = hall.roof_pt(0.42, 0.66)          # mid roof, in front of the first mon
    mon = Box(top=(base[0], base[1] - 11), wx=8, wy=2, h=6)
    mon.draw(c, roof="M", lwall="L", rwall="d", roof_hi="W", outline="K")
    # cyan window band on its lit face (slightly brighter than the base monitor)
    for i in range(4):
        u0 = 0.12 + i * 0.21
        mon.window(c, "left", u0, u0 + 0.10, 1.8, 4.6, glass="g", mullions=0)
    c.line(mon.r_top, mon.r_right, "W")      # crest glint

    # --- glowing coolant tank on the SHADED (right) flank of the hall ---
    # a vertical tank standing on open ground FORWARD of the right-front corner so
    # it stands clearly proud of the shaded flank (not tucked behind the wall).
    tk_cx = int(round(hall.w_right[0])) - 2
    tk_top = int(round(hall.r_right[1])) + 8
    tk_rx, tk_h = 3, 12
    cylinder(c, tk_cx, tk_top, tk_rx, tk_h, top="b", side_l="D", side_r="b")
    c.line((tk_cx - tk_rx, tk_top + 4), (tk_cx + tk_rx, tk_top + 4), "K")   # band
    c.line((tk_cx - tk_rx, tk_top + 8), (tk_cx + tk_rx, tk_top + 8), "K")
    # a glowing cyan SIGHT-GLASS level gauge down the lit edge of the tank
    c.line((tk_cx - tk_rx + 1, tk_top + 2), (tk_cx - tk_rx + 1, tk_top + tk_h - 1), "e")
    c.set(tk_cx - tk_rx + 1, tk_top + 2, "E")        # bright top glint
    c.set(tk_cx - tk_rx + 1, tk_top + tk_h // 2, "E")
    # a coolant FEED LINE running from the tank up the wall toward the roof cell
    c.line((tk_cx - 1, tk_top), (tk_cx - 1, tk_top - 5), "b")
    c.set(tk_cx - 1, tk_top - 5, "e")
    c.set(tk_cx - 1, tk_top - 6, "e")
    return mon


def stage5_second_gantry(c, hall):
    """t5 — CROWNING FEATURE = FULLY EVOLVED CNC cell. A GLASS-BOXED SECOND CUTTING
    GANTRY twinning the signature, mounted on the BACK-RIGHT roof so the shop reads
    as a dual-spindle machining cell — twin spindles carving stock in a bright `E`
    coolant mist, dressed with `q` GOLD rails on the gantry box as the flourish.
    Reads as elite, still recognizably the same mill shop, just maxed out."""
    # back-top vertex of the second glass lid, placed back-right of the signature
    # gantry (whose lid back-vertex is (37,28)). Smaller box so it nests on-canvas.
    cx, ty = 47, 24
    w = 8
    top = (cx, ty)
    rgt = (cx + w, ty + w // 2)
    bot = (cx, ty + w)
    lft = (cx - w, ty + w // 2)
    # K corner posts lifting the box above the roof deck
    for p in (lft, bot, rgt):
        c.set(int(p[0]), int(p[1]) + 1, "K")
        c.set(int(p[0]), int(p[1]) + 2, "d")
    # translucent cyan glass lid + glint + shade sliver
    c.fill_poly([top, rgt, bot, lft], "c")
    c.line((cx - 4, ty + 3), (cx - 1, ty + 1), "h")
    c.line((cx + 2, ty + w - 1), (cx + w - 1, ty + w // 2 + 1), "g")
    # GOLD rails framing the gantry box (the t5 flourish) — all four edges in q,
    # with a bright O top glint on the back-left edge.
    for a, b in [(top, rgt), (rgt, bot), (bot, lft), (lft, top)]:
        c.line(a, b, "q")
    c.line(top, rgt, "O")                     # bright gold crest

    # the second machine on the box deck (compact twin-spindle cut)
    mx, my = cx, ty + 3
    # twin gantry rails
    c.line((mx - 5, my - 1), (mx + 5, my - 1), "D")
    c.line((mx - 5, my), (mx + 5, my), "d")
    for px in (mx - 6, mx + 6):
        c.set(px, my - 1, "D"); c.set(px, my, "K")
    # TWIN spindle carriages riding the rails
    for ddx in (-3, 3):
        rect(c, mx + ddx - 1, my - 2, mx + ddx + 1, my, fill="M", outline="K")
        c.set(mx + ddx, my - 2, "L")          # lit crown
        c.set(mx + ddx, my + 1, "L")          # tool bit down
    # workpiece bar spanning under both spindles
    rect(c, mx - 5, my + 2, mx + 5, my + 2, fill="L")   # lit top
    rect(c, mx - 5, my + 3, mx + 5, my + 3, fill="D")   # body
    c.set(mx - 6, my + 2, "M"); c.set(mx + 6, my + 2, "M")   # clamp jaws
    # bright E coolant mist + white-hot cut points under each twin spindle
    for ddx in (-3, 3):
        c.set(mx + ddx, my + 1, "O")          # white-hot cut spark
        c.set(mx + ddx - 1, my + 1, "E")      # bright coolant mist
        c.set(mx + ddx + 1, my, "e")          # mist puff
    c.set(mx, my, "E")                         # central mist plume between spindles


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the CNC mill shop at upgrade `stage` (1..5). Stage 1 is IDENTICAL to
    the shipped base; each higher stage keeps every prior addition and bolts on the
    next (t2 aux-cyclone → t3 tool-carousel → t4 second monitor+coolant tank →
    t5 second glass gantry + gold). Painter's order keeps rooftop/overhead additions
    on top of the masses they grow from."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    dust_cyclone(c)
    hall = main_hall(c)
    corrugation(c, hall)
    clerestory_monitor(c, hall)
    power_line_and_conduit(c, hall)
    shutter_door(c, hall)
    gantry_enclosure(c, hall)

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    if stage >= 2:
        stage2_aux_cyclone(c, hall)
    if stage >= 3:
        stage3_tool_carousel(c, hall)
    if stage >= 4:
        stage4_second_monitor_and_tank(c, hall)
    if stage >= 5:
        stage5_second_gantry(c, hall)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/volt_lab"
PREVIEW_DIR = "/path/to/scienium/art/preview"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped cnc-mill-shop.png, so it does NOT overwrite the base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": VOLT, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"volt_lab_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
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
