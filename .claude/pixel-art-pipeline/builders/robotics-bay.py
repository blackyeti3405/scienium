#!/usr/bin/env python3
"""
Robotics Bay — Volt Lab economy building (BESPOKE-form rebuild).

NOT the gateway cube, NOT the CNC machine-shop. A TALL, DEEP open HANGAR with a
big carved garage bay on its lit front face, plus a smaller front-right control
annex (the teach-pendant station). The hero is a BOLD industrial robot arm
rising out of the bay: a solid pedestal, fat K-outlined upper-arm and forearm
links, a heavy elbow joint, and a chunky 2-finger gripper claw with a camera
eye — built from filled cross-sections, no thin diagonals, no twig.

Composed entirely from art/isobuild.Box (no iso.draw_cube / base_windows).
"""
import os
import sys
import json

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box

VOLT = {"K": "#15181d", "W": "#eef2f6", "L": "#cdd6dd", "M": "#9aa3ad", "D": "#6c7682", "d": "#49515b",
        "h": "#d6f9ff", "c": "#aef0fb", "g": "#38cfe2", "G": "#1f8ba0",
        "o": "#ffe85a", "O": "#fff7a8", "r": "#c89a14"}


# ── low-level helpers ────────────────────────────────────────────────────────
def _rect(c, x0, y0, x1, y1, fill=None, outline=None):
    """Axis-aligned pixel rect (inclusive)."""
    if x0 > x1:
        x0, x1 = x1, x0
    if y0 > y1:
        y0, y1 = y1, y0
    if fill is not None:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                c.set(x, y, fill)
    if outline is not None:
        for x in range(x0, x1 + 1):
            c.set(x, y0, outline)
            c.set(x, y1, outline)
        for y in range(y0, y1 + 1):
            c.set(x0, y, outline)
            c.set(x1, y, outline)


def _bres(a, b):
    """Integer Bresenham centerline points (no float gaps)."""
    x0, y0 = int(round(a[0])), int(round(a[1]))
    x1, y1 = int(round(b[0])), int(round(b[1]))
    dx, dy = abs(x1 - x0), abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy
    pts = []
    while True:
        pts.append((x0, y0))
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x0 += sx
        if e2 < dx:
            err += dx
            y0 += sy
    return pts


def _fat_bar(c, a, b, half, core="M", hi="L", shade="D"):
    """A BOLD, CLEAN solid arm link from a to b, (2*half+1) px wide.

    Stamps a full HORIZONTAL cross-section at every centerline pixel so the body
    is a gap-free solid slab, then strokes ONE continuous K outline down each long
    edge that follows the SAME centerline (so the outline never drifts away from
    the fill and leaves no diagonal speckle). The near edge gets a lit `hi` spine,
    the far edge a `shade` column — flat shading, no dithering. The bar widens in
    x, so author links that read mostly vertical for the crispest silhouette.
    """
    ax, ay = int(round(a[0])), int(round(a[1]))
    bx, by = int(round(b[0])), int(round(b[1]))
    for (x, y) in _bres((ax, ay), (bx, by)):
        for w in range(-half, half + 1):
            ch = core
            if w == -half:
                ch = hi          # near (left) edge = lit spine
            elif w == half:
                ch = shade       # far (right) edge = shaded
            c.set(x + w, y, ch)
        c.set(x - half - 1, y, "K")  # K outline rides the same centerline...
        c.set(x + half + 1, y, "K")  # ...both edges, so no drift / no speckle


def _disk(c, p, r, fill="D", ring="K"):
    """Solid filled disk with a K ring — a heavy bearing/joint."""
    x, y = int(round(p[0])), int(round(p[1]))
    for dy in range(-r - 1, r + 2):
        for dx in range(-r - 1, r + 2):
            d2 = dx * dx + dy * dy
            if d2 <= r * r + 1:
                c.set(x + dx, y + dy, fill)
            elif d2 <= (r + 1) * (r + 1) + 1:
                c.set(x + dx, y + dy, ring)


# ── the bespoke hangar shell ─────────────────────────────────────────────────
def hangar(c):
    """A TALL, DEEP open hangar Box. Returns the Box so callers can place
    features on its faces. Taller (h=26) and deeper (wy=8) than the gateway cube,
    with a flat corrugated roof."""
    h = Box((22, 6), wx=11, wy=8, h=26)
    h.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    return h


def corrugated_roof(c, h):
    """Sparse D corrugation ribs running across the roof + a cyan LIDAR puck on a
    short post near the back corner."""
    for f in (0.22, 0.40, 0.58, 0.76):
        c.line(h.roof_pt(0.08, f), h.roof_pt(0.92, f), "D")
    # LIDAR puck on a short post near the back (top) corner
    px, py = h.roof_pt(0.30, 0.20)
    px, py = int(round(px)), int(round(py))
    c.set(px, py, "K")
    c.set(px, py - 1, "K")
    c.set(px - 1, py - 2, "G")
    c.set(px, py - 2, "g")
    c.set(px + 1, py - 2, "G")
    c.set(px - 1, py - 3, "c")
    c.set(px, py - 3, "h")
    c.set(px + 1, py - 3, "c")


def open_bay(c, h):
    """Carve a big dark OPEN garage bay into the hangar's lit (left) front face.

    A K frame, a rolled-up segmented shutter coiled under the lintel, a flat dark
    d/K interior cavity (so the arm pops), and o hazard chevrons along the sill.
    Returns the bay's screen-space (left,right,top,bottom) px bounds + floor y so
    the robot arm can be authored standing on the bay floor.
    """
    u0, u1, vt, vb = 0.14, 0.80, 6, 24

    # K outer frame (door opening) — the bay dominates the front face
    c.fill_poly([h.left_pt(u0, vt), h.left_pt(u1, vt),
                 h.left_pt(u1, vb), h.left_pt(u0, vb)], "K")

    # ONE clean lintel band (the rolled-up shutter) — a single L crest + M body
    # strip tucked under the frame top, no stacked curls / no speckle.
    s0, s1 = u0 + 0.04, u1 - 0.04
    c.line(h.left_pt(s0, vt + 1), h.left_pt(s1, vt + 1), "L")   # lit crest
    c.line(h.left_pt(s0, vt + 2), h.left_pt(s1, vt + 2), "M")   # body
    c.line(h.left_pt(s0, vt + 3), h.left_pt(s1, vt + 3), "M")   # body
    c.line(h.left_pt(s0, vt + 4), h.left_pt(s1, vt + 4), "K")   # groove

    # FLAT dark cavity: one solid `d` interior ringed by a single K edge, so the
    # arm reads as a clean light shape against an even ground (no gradient mush).
    i0, i1, it, ib = u0 + 0.03, u1 - 0.03, vt + 5, vb - 1
    c.fill_poly([h.left_pt(i0, it), h.left_pt(i1, it),
                 h.left_pt(i1, ib), h.left_pt(i0, ib)], "d")

    # o hazard chevrons on the bay floor lip (robot work zone) — clean alternating
    sill_l = h.left_pt(i0, ib)
    sill_r = h.left_pt(i1, ib)
    sxl, syl = int(round(sill_l[0])), int(round(sill_l[1]))
    sxr = int(round(sill_r[0]))
    x = sxl + 1
    while x < sxr - 1:
        c.set(x, syl, "o")
        c.set(x + 1, syl, "K")
        x += 2

    # bay bounds in screen space (for placing the arm)
    fl = h.left_pt(i0, ib)       # front-left of floor
    fr = h.left_pt(i1, ib)       # front-right of floor
    tl = h.left_pt(i0, it)       # back-left top of cavity
    return {
        "lx": int(round(fl[0])), "rx": int(round(fr[0])),
        "floor_y": int(round((fl[1] + fr[1]) / 2)),
        "top_y": int(round(tl[1])),
    }


def control_annex(c):
    """A smaller, lower Box abutting the hangar on the front-right (the teach-
    pendant control room). Drawn AFTER the hangar so it sits in front. A single
    cyan control-room window glows on its lit face."""
    a = Box((46, 22), wx=4, wy=5, h=15)
    a.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # cyan control-room window on the lit (left) face
    a.window(c, "left", 0.22, 0.78, 4, 11, glass="g", hi="h", shade="G",
             frame="K", mullions=1)
    # small o annex roof beacon
    bx, by = a.roof_pt(0.5, 0.5)
    c.set(int(round(bx)), int(round(by)) - 1, "o")
    return a


def power_conduit(c, h):
    """A glowing o power conduit running down the hangar's front corner."""
    top = (int(round(h.r_front[0])), int(round(h.r_front[1])) + 1)
    bot = (int(round(h.w_front[0])), int(round(h.w_front[1])) - 2)
    c.line((top[0] - 1, top[1]), (bot[0] - 1, bot[1]), "o")   # bright conduit
    c.line(top, bot, "r")                                     # shaded side
    for t in (0.3, 0.62):
        cy = int(top[1] + t * (bot[1] - top[1]))
        c.set(top[0] - 2, cy, "K")                            # clamp


# ── the hero: a BOLD industrial robot arm ────────────────────────────────────
def robot_arm(c, bay):
    """A heavy 6-axis manipulator REACHING UP-AND-OUT of the open bay.

    Solid pedestal drum on the bay floor -> shoulder joint -> a THICK upper-arm
    tube angling clearly up-and-LEFT, rising out of the bay mouth -> one bold
    elbow disk -> a second thick forearm tube continuing up-and-out -> a heavy
    wrist + chunky 2-finger gripper (the heaviest mass) crowning ABOVE the bay
    opening against transparent sky. Only two visible joints (shoulder, elbow)
    plus the wrist — every segment a wide filled K-outlined tube, no stacked
    disks, no thin diagonals, no twig.
    """
    # Anchor in the CENTRE of the dark cavity so the lit arm pops against flat `d`
    # on both sides, and rise STRAIGHT UP so the body stays in one clean column
    # over that dark ground — only the gripper crowns above into transparent sky.
    base_cx = (bay["lx"] + bay["rx"]) // 2
    floor_y = bay["floor_y"] - 1

    # --- Pedestal: ONE solid drum, lit M left half on a D right half, L crest,
    # clean K outline. Sits squarely on the dark cavity floor. No LED. ---
    pb_w = 4
    ped_top = floor_y - 6
    _rect(c, base_cx - pb_w, ped_top, base_cx + pb_w, floor_y, fill="D")
    _rect(c, base_cx - pb_w, ped_top, base_cx, floor_y, fill="M")       # lit left half
    c.line((base_cx - pb_w, ped_top), (base_cx + pb_w, ped_top), "L")   # lit crest
    _rect(c, base_cx - pb_w - 1, ped_top - 1, base_cx + pb_w + 1, floor_y + 1, outline="K")

    # --- Shoulder: one heavy block on the drum (flat M body, lit L crown). ---
    sh = (base_cx, ped_top - 3)
    _rect(c, sh[0] - 3, sh[1] - 1, sh[0] + 3, sh[1] + 3, fill="M", outline="K")
    _rect(c, sh[0] - 2, sh[1] - 1, sh[0] + 2, sh[1], fill="L")          # lit crown

    # --- The reach: a thick UPPER ARM rises STRAIGHT UP through the dark cavity and
    # clears the roofline to one bold elbow against the sky; a thick FOREARM then
    # cants up-and-LEFT so the gripper crowns high above the building. One clean
    # bent silhouette, two flat segments. ---
    elbow = (sh[0], sh[1] - 14)            # straight up, just above the roofline
    wrist = (elbow[0] - 3, elbow[1] - 9)   # forearm cants up-and-left, into open sky

    # half=2 -> 5px-wide solid K-outlined bars (drawn before the elbow disk so the
    # disk caps the join cleanly).
    _fat_bar(c, sh, elbow, half=2, core="M", hi="L", shade="D")     # upper arm
    _fat_bar(c, elbow, wrist, half=2, core="M", hi="L", shade="D")  # forearm

    # --- ONE bold elbow joint: a solid disk, a single K ring, a single g glow ring,
    # and an h core. The only joint accent on the whole arm — nothing scattered. ---
    _disk(c, elbow, r=3, fill="D", ring="K")
    ex, ey = int(round(elbow[0])), int(round(elbow[1]))
    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):   # clean 4px g glow ring
        c.set(ex + dx, ey + dy, "g")
    c.set(ex, ey, "h")                                  # bright core

    # --- Wrist housing: ONE solid M block (lit L crown) capping the forearm. No
    # camera eye, no accent band — a clean heavy knuckle from which the jaws rise. ---
    wx, wy = int(round(wrist[0])), int(round(wrist[1]))
    hand_cx, hand_cy = wx, wy - 2
    _rect(c, hand_cx - 4, hand_cy - 1, hand_cx + 4, hand_cy + 3, fill="M", outline="K")
    _rect(c, hand_cx - 3, hand_cy - 1, hand_cx + 3, hand_cy, fill="L")  # lit crown

    # --- Chunky 2-finger gripper opening UPWARD against the sky: two thick straight
    # jaws (3px solid body, full K outline both flanks, lit L inner edge) capped by a
    # heavy pad. Parallel, not splayed — an unmistakable clean industrial grip. ---
    ky = hand_cy - 2                                   # base row of the jaws

    def finger(x0):
        """A straight thick jaw rising from the wrist: a 3px M body (lit L inner
        edge) with a continuous K flank on each side, capped by a heavy K-topped
        pad. `x0` is the left column of the 3px body."""
        for y in range(ky, ky - 4, -1):               # 4 rows tall, straight up
            c.set(x0, y, "L")                          # lit inner edge
            c.set(x0 + 1, y, "M")
            c.set(x0 + 2, y, "M")                      # 3px body
            c.set(x0 - 1, y, "K")                      # K flank
            c.set(x0 + 3, y, "K")                      # K flank
        py = ky - 4                                    # heavy pad cap
        for dx in range(0, 3):
            c.set(x0 + dx, py, "M")
        c.set(x0, py, "L")
        for dx in range(-1, 4):
            c.set(x0 + dx, py - 1, "K")                # K cap across the top
        c.set(x0 - 1, py, "K")
        c.set(x0 + 3, py, "K")

    finger(hand_cx - 4)    # left jaw
    finger(hand_cx + 2)    # right jaw


def build():
    c = Canvas()
    h = hangar(c)
    corrugated_roof(c, h)
    bay = open_bay(c, h)
    power_conduit(c, h)
    robot_arm(c, bay)          # hero arm in the bay (before the annex occludes nothing on the left)
    control_annex(c)           # front-right annex, drawn last so it sits in front
    spec = {"width": 64, "height": 64, "palette": VOLT, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/volt_lab_robotics-bay.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
