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
"""
import os, sys, json

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box, cylinder

VOLT = {"K": "#15181d", "W": "#eef2f6", "L": "#cdd6dd", "M": "#9aa3ad", "D": "#6c7682", "d": "#49515b",
        "h": "#d6f9ff", "c": "#aef0fb", "g": "#38cfe2", "G": "#1f8ba0",
        "o": "#ffe85a", "O": "#fff7a8", "r": "#c89a14"}


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


def main():
    c = Canvas()
    # painter's order: back cyclone, then hall, then ridge monitor, then front
    dust_cyclone(c)
    hall = main_hall(c)
    corrugation(c, hall)
    clerestory_monitor(c, hall)
    power_line_and_conduit(c, hall)
    shutter_door(c, hall)
    gantry_enclosure(c, hall)

    spec = {"width": 64, "height": 64, "palette": VOLT, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/volt_lab_cnc-mill-shop.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    main()
