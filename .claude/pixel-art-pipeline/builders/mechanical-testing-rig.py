#!/usr/bin/env python3
"""
Mechanical Testing Rig — Volt Lab economy building (BESPOKE open load-frame).

NOT the gateway cube, NOT any Volt sibling (hangar+arm / wide CNC factory /
flat PCB board / extruder tower / open-yard). The silhouette here is a TALL
OPEN STRUCTURAL LOAD-FRAME / GANTRY: a low solid foundation plinth with a tall
skeletal FOUR-POST portal rising out of it — exposed `K`/`D` corner girders, a
heavy `M`/`L` crosshead crossbeam capping the top and a mid tie-beam, the middle
left OPEN so you see straight through to the press. The control panel sits on the
LEFT face of the plinth (the operator station).

The hero (one-of-one in the catalog): a hydraulic ram drives DOWN out of the
crosshead onto a glowing specimen inside a small `c`/`g` glass crush-cylinder —
stress-glint cracks + strain sparks — while a round `W` load gauge on a front
post swings its `o`/`r` needle up toward an `r` redline arc. A glowing `o`
hydraulic line snakes from the base pump up to the ram.

Composed entirely from art/isobuild.Box + Canvas primitives. No draw_cube /
base_windows.
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


# ── low-level pixel helpers (mirroring the Volt set's conventions) ────────────
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


def _post(c, x, y0, y1, core="D", hi="L", shade="d"):
    """A heavy 2px-wide vertical girder column with a hard K flank on each side.

    A lit `hi` near (left) edge over a `core` body, a `shade` far edge — flat
    shading, no dither — with a continuous K outline riding each flank so the
    column reads as a clean exposed steel post against transparent sky / the
    open frame interior."""
    if y0 > y1:
        y0, y1 = y1, y0
    for y in range(y0, y1 + 1):
        c.set(x, y, hi)          # lit near edge
        c.set(x + 1, y, shade)   # shaded far edge (2px body)
        c.set(x - 1, y, "K")     # K flank
        c.set(x + 2, y, "K")     # K flank


def _girder(c, a, b, top="L", side="M", deep=False):
    """A thin iso crossbeam rail from a to b: a lit/`top` crest line, a `side`
    body line just below, and a K outline on the underside — so the cap reads as
    an exposed steel girder, not a filled plate. `deep` adds one more body row for
    the heavy front rails."""
    ax, ay = int(round(a[0])), int(round(a[1]))
    bx, by = int(round(b[0])), int(round(b[1]))
    c.line((ax, ay), (bx, by), top)                 # lit crest
    c.line((ax, ay + 1), (bx, by + 1), side)        # body
    if deep:
        c.line((ax, ay + 2), (bx, by + 2), side)    # extra body row (heavy rail)
        c.line((ax, ay + 3), (bx, by + 3), "K")     # underside outline
    else:
        c.line((ax, ay + 2), (bx, by + 2), "K")     # underside outline


def _disk_ring(c, p, r, fill, ring="K"):
    """Solid filled disk with a 1px K ring (gauge face / bearing)."""
    x, y = int(round(p[0])), int(round(p[1]))
    for dy in range(-r - 1, r + 2):
        for dx in range(-r - 1, r + 2):
            d2 = dx * dx + dy * dy
            if d2 <= r * r + 1:
                c.set(x + dx, y + dy, fill)
            elif d2 <= (r + 1) * (r + 1) + 1:
                c.set(x + dx, y + dy, ring)


# ── the bespoke foundation plinth ─────────────────────────────────────────────
def plinth(c):
    """The low, broad, solid machine foundation. Heavy and squat so the open
    frame above reads as TALL by contrast. A corrugated `D` skirt + rivet line on
    the lit face; the control panel is added separately. Returns the Box."""
    p = Box((26, 30), wx=12, wy=10, h=9)
    p.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # corrugated D skirt ribs on the lit (left) face — a heavy machine base
    for f in (0.18, 0.34, 0.50, 0.66, 0.82):
        c.line(p.left_pt(f, 7), p.left_pt(f, 8.5), "D")
    # rivet line across the top of the lit face
    for f in (0.12, 0.30, 0.48, 0.66, 0.84):
        x, y = p.left_pt(f, 1.4)
        c.set(int(round(x)), int(round(y)), "L")
    # darker corrugation on the shaded right face too
    for f in (0.25, 0.55, 0.85):
        c.line(p.right_pt(f, 6), p.right_pt(f, 8.5), "d")
    return p


def control_panel(c, p):
    """The operator station: a wide K-framed control panel on the LEFT face of
    the plinth, carrying a `g` cyan load-readout screen with a digital number
    band and an `o` status pip. The signature 'opening' — no stock windows."""
    # a BIG, clean panel filling most of the left face so it reads as the operator
    # station. u runs along the face (left→front), v is px down the 9px-tall face.
    u0, u1, v0, v1 = 0.08, 0.60, 1.4, 7.6
    # K outer bezel
    c.fill_poly([p.left_pt(u0, v0), p.left_pt(u1, v0),
                 p.left_pt(u1, v1), p.left_pt(u0, v1)], "K")
    # cyan readout SCREEN inset (the load-readout) — one clean g panel
    g0, g1, gt, gb = u0 + 0.04, u1 - 0.18, v0 + 0.8, v1 - 2.4
    c.fill_poly([p.left_pt(g0, gt), p.left_pt(g1, gt),
                 p.left_pt(g1, gb), p.left_pt(g0, gb)], "g")
    c.line(p.left_pt(g0, gt + 0.2), p.left_pt(g1, gt + 0.2), "h")   # lit top streak
    c.line(p.left_pt(g0, gb - 0.2), p.left_pt(g1, gb - 0.2), "G")   # shaded bottom
    # ONE bright digital readout band across the screen middle (a load value)
    mid = (gt + gb) / 2
    c.line(p.left_pt(g0 + 0.05, mid), p.left_pt(g1 - 0.05, mid), "O")
    c.line(p.left_pt(g0 + 0.05, mid + 0.9), p.left_pt(g1 - 0.30, mid + 0.9), "h")
    # status pips + a couple of M control buttons along the lower bezel strip
    by = v1 - 1.0
    bx, byy = p.left_pt(u0 + 0.06, by)
    c.set(int(round(bx)), int(round(byy)), "o")          # green-ready pip
    for f in (0.18, 0.30, 0.42):
        bx, byy = p.left_pt(u0 + f, by)
        c.set(int(round(bx)), int(round(byy)), "L")      # button caps
    # an o status lamp on the upper-right corner of the bezel
    bx, byy = p.left_pt(u1 - 0.05, v0 + 1.2)
    c.set(int(round(bx)), int(round(byy)), "o")


# ── the open four-post load-frame ─────────────────────────────────────────────
def load_frame(c, p):
    """The TALL open portal rising out of the plinth.

    Four corner girders stand on the four top corners of the plinth roof and rise
    ~22px to a heavy crosshead beam; a mid tie-beam ties the front pair. The
    interior is LEFT OPEN — only girders + beams are drawn — so the crush chamber
    inside is fully visible. Returns the screen geometry (column x's, crosshead y,
    plinth roof y) the press hero anchors to.

    BACK girders are stamped first, then the crosshead, then FRONT girders, so the
    front members occlude the back ones (painter's order)."""
    # the four roof corners of the plinth = the frame footprint
    bl = p.roof_pt(0.0, 0.0)    # back-LEFT  corner (r_left)
    bf = p.roof_pt(1.0, 0.0)    # FRONT      corner (r_front, nearest the viewer)
    bt = p.roof_pt(0.0, 1.0)    # BACK       corner (r_top, farthest)
    br = p.roof_pt(1.0, 1.0)    # back-RIGHT corner (r_right)

    H = 23                       # column height (tall, skeletal)
    # column top-of-post anchor x's (post() draws a 2px body to the right of x,
    # so step the x left by 1 to centre the 2px post on the corner)
    def cx(pt):
        return int(round(pt[0])) - 1
    cap_y = lambda pt: int(round(pt[1]))   # roof-corner y = column base

    bl_x, bf_x, bt_x, br_x = cx(bl), cx(bf), cx(bt), cx(br)
    bl_y, bf_y, bt_y, br_y = cap_y(bl), cap_y(bf), cap_y(bt), cap_y(br)

    # tops of each column
    bl_top, bf_top = bl_y - H, bf_y - H
    bt_top, br_top = bt_y - H, br_y - H

    # The four column TOPS in screen space (the crosshead corners sit one beam
    # above each post top so the cap rides on the columns).
    bl_t = (bl_x, bl_top)
    bf_t = (bf_x, bf_top)
    bt_t = (bt_x, bt_top)
    br_t = (br_x, br_top)

    # 1) BACK girders first (top corner + right corner) — darker, sit behind.
    _post(c, bt_x, bt_top, bt_y, core="d", hi="D", shade="d")
    _post(c, br_x, br_top, br_y, core="d", hi="D", shade="d")

    # 2) BACK crosshead members: two thin D girders joining the back-top column to
    #    the left/right tops (the FAR rails of the open cap). The middle of the cap
    #    stays OPEN — no roof plate — so you see straight down into the frame.
    _girder(c, bt_t, bl_t, top="D", side="d")      # back-left far rail
    _girder(c, bt_t, br_t, top="D", side="d")      # back-right far rail

    # 3) FRONT girders (left corner + front corner) — lit, sit in front.
    _post(c, bl_x, bl_top, bl_y, core="D", hi="L", shade="d")
    _post(c, bf_x, bf_top, bf_y, core="D", hi="L", shade="d")

    # 4) the HEAVY crosshead crossbeam — the two FRONT rails of the open cap meeting
    #    at the front column top. A 3px-deep lit girder along the left axis (carrying
    #    the hazard chevrons) + a shaded girder along the right axis. Middle open.
    cap_y_top = bl_top - 1
    _girder(c, (bl_x, cap_y_top), (bf_x, bf_top - 1), top="L", side="M", deep=True)  # front-left rail
    _girder(c, (bf_x, bf_top - 1), (br_x, br_top - 1), top="M", side="D", deep=True)  # front-right rail
    # o hazard chevrons stencilled along the front-left rail's top edge
    chev = []
    steps = 22
    for s in range(steps):
        t = s / (steps - 1)
        cxp = bl_x + t * (bf_x - bl_x)
        cyp = cap_y_top + t * ((bf_top - 1) - cap_y_top)
        chev.append((int(round(cxp)), int(round(cyp))))
    for i, (xp, yp) in enumerate(chev):
        c.set(xp, yp, "o" if i % 2 == 0 else "K")
    # small c warning-lamp puck standing on the crosshead front corner
    lx, ly = bf_x + 1, bf_top - 3
    c.set(lx, ly, "K")
    c.set(lx, ly - 1, "c")
    c.set(lx - 1, ly - 1, "G")
    c.set(lx + 1, ly - 1, "G")
    c.set(lx, ly - 2, "h")
    # crosshead centre y (where the ram hangs from) = front corner top of the cap
    crosshead_mid_y = bf_top - 1

    # 5) mid TIE-BEAM tying the front-left and front columns together (a short
    #    horizontal girder following the iso left axis) — a structural cross-member;
    #    the interior stays open below it. Drawn from the left column to the front
    #    column at mid height.
    tie_y0 = bl_top + 11
    tie_dy = bf_y - bl_y          # iso left-axis run drops this much over the span
    tie_y1 = tie_y0 + tie_dy
    c.line((bl_x + 1, tie_y0), (bf_x + 1, tie_y1), "L")       # lit crest
    c.line((bl_x + 1, tie_y0 + 1), (bf_x + 1, tie_y1 + 1), "D")   # body
    c.line((bl_x + 1, tie_y0 + 2), (bf_x + 1, tie_y1 + 2), "K")   # shaded edge

    return {
        "bl_x": bl_x, "bf_x": bf_x, "bt_x": bt_x, "br_x": br_x,
        "frame_top": bt_top, "plinth_roof_y": min(bl_y, bf_y),
        "front_x": bf_x, "left_x": bl_x,
        # crosshead underside y at the front (where the ram hangs from)
        "crosshead_y": crosshead_mid_y + 2,
    }


# ── the hero: glass crush-chamber compressing a glowing specimen ──────────────
def press(c, p, fr):
    """Caged inside the open frame: a hydraulic ram descends from the crosshead
    onto a glowing specimen inside a small glass crush-cylinder, plus a redline
    load gauge on a front post and a glowing hydraulic line up from the base.

    Drawn AFTER the frame but the ram/chamber sit in the OPEN middle, so they read
    as enclosed by the see-through portal — that is the whole point of the form."""
    # work centre: the OPEN frame centre, sitting on the plinth roof. Placed at the
    # roof-centre column so it pops in the see-through middle, clear of the control
    # panel down on the lower-left face.
    rcx, rcy = p.roof_pt(0.5, 0.42)
    wx = int(round(rcx))
    floor_y = int(round(rcy))             # specimen platen sits on the plinth roof
    # the ram hangs from the crosshead front-left rail directly above wx
    crosshead_y = floor_y - 19

    # --- platen (anvil) the specimen is crushed against: a short heavy M slab ---
    _rect(c, wx - 5, floor_y - 1, wx + 5, floor_y + 1, fill="M", outline="K")
    c.line((wx - 5, floor_y - 1), (wx + 5, floor_y - 1), "L")   # lit top

    # --- the glass crush-cylinder on the platen: a c/g translucent tube ---
    cyl_bot = floor_y - 2
    cyl_top = cyl_bot - 8
    _rect(c, wx - 3, cyl_top, wx + 3, cyl_bot, fill="g")        # glass body
    _rect(c, wx - 3, cyl_top, wx - 1, cyl_bot, fill="c")        # lit left glass
    _rect(c, wx - 4, cyl_top - 1, wx + 4, cyl_bot + 1, outline="K")
    c.line((wx - 3, cyl_top), (wx + 3, cyl_top), "h")           # bright rim
    # the glowing SPECIMEN being compressed inside (O/o core, mid-cylinder)
    spec_cy = (cyl_top + cyl_bot) // 2 + 1
    _rect(c, wx - 2, spec_cy - 1, wx + 2, spec_cy + 2, fill="o")
    _rect(c, wx - 1, spec_cy, wx + 1, spec_cy + 1, fill="O")    # white-hot core
    # h stress-glint cracks radiating from the crushed core
    c.set(wx - 3, spec_cy - 1, "h")
    c.set(wx + 3, spec_cy + 2, "h")
    c.set(wx - 2, spec_cy + 3, "h")
    # o strain sparks at the top contact point (where the ram bites)
    c.set(wx - 1, spec_cy - 2, "o")
    c.set(wx + 1, spec_cy - 2, "O")

    # --- the hydraulic RAM descending from the crosshead onto the specimen ---
    ram_top = crosshead_y
    ram_bot = cyl_top - 1            # ram foot just touches the cylinder cap
    _rect(c, wx - 2, ram_top, wx + 2, ram_bot, fill="M")        # ram body
    _rect(c, wx - 2, ram_top, wx, ram_bot, fill="L")            # lit left
    _rect(c, wx - 3, ram_top - 1, wx + 3, ram_bot + 1, outline="K")
    # o collar band on the ram
    collar_y = ram_top + 3
    c.line((wx - 2, collar_y), (wx + 2, collar_y), "o")
    c.set(wx - 2, collar_y, "r")
    # heavy ram FOOT (the platen head pressing down) — a wider K-topped block
    _rect(c, wx - 3, ram_bot - 1, wx + 3, ram_bot + 1, fill="M", outline="K")
    c.line((wx - 3, ram_bot - 1), (wx + 3, ram_bot - 1), "L")

    # --- glowing o hydraulic line: from a base pump beside the platen, up the LEFT
    #    edge of the press and into the ram collar. Kept tight to the press so it
    #    threads the open frame without crossing the control panel on the left face.
    pump_x = wx - 7
    pump_y = floor_y - 1
    # short bright pump nub at the press base
    _rect(c, pump_x - 1, pump_y, pump_x + 1, pump_y + 2, fill="r")
    c.set(pump_x, pump_y, "o")
    # the line: up the left side, then across into the ram collar
    c.line((pump_x, pump_y), (pump_x, collar_y), "o")
    c.line((pump_x, collar_y), (wx - 3, collar_y), "o")
    # a K clamp on the riser
    c.set(pump_x - 1, (pump_y + collar_y) // 2, "K")

    # --- the round LOAD GAUGE mounted on the FRONT-RIGHT post: needle to redline --
    gx = fr["front_x"] + 8
    gy = crosshead_y + 9
    # short M mounting bracket from the front column out to the gauge
    c.line((fr["front_x"] + 2, gy), (gx - 3, gy), "M")
    c.line((fr["front_x"] + 2, gy + 1), (gx - 3, gy + 1), "K")
    _disk_ring(c, (gx, gy), 4, fill="W", ring="K")             # white dial disk
    # L inner ring shade + G tick marks around the rim
    for ang in range(0, 360, 30):
        import math
        tx = gx + 3 * math.cos(math.radians(ang))
        ty = gy + 3 * math.sin(math.radians(ang))
        c.set(int(round(tx)), int(round(ty)), "G")
    # r REDLINE arc across the upper-right quadrant (danger zone)
    import math
    for ang in range(300, 361, 12):
        rx = gx + 3 * math.cos(math.radians(ang))
        ry = gy + 3 * math.sin(math.radians(ang))
        c.set(int(round(rx)), int(round(ry)), "r")
    for ang in range(0, 25, 12):
        rx = gx + 3 * math.cos(math.radians(ang))
        ry = gy + 3 * math.sin(math.radians(ang))
        c.set(int(round(rx)), int(round(ry)), "r")
    # the bold o/r NEEDLE swung UP toward the redline (pointing up-right)
    c.line((gx, gy), (gx + 2, gy - 3), "o")
    c.set(gx + 1, gy - 2, "O")
    c.set(gx, gy, "r")                                          # hub
    # O peak-hold blip at the redline the needle is reaching
    c.set(gx + 3, gy - 2, "O")


def build():
    c = Canvas()
    p = plinth(c)                 # low solid foundation
    fr = load_frame(c, p)         # tall open four-post portal + crosshead
    press(c, p, fr)               # hero: ram crushing glowing specimen + gauge
    control_panel(c, p)           # operator station on the LEFT face — drawn last
                                  # so the open frame never paints over it
    spec = {"width": 64, "height": 64, "palette": VOLT, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/volt_lab_mechanical-testing-rig.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
