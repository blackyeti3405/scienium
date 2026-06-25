#!/usr/bin/env python3
"""
Reaction Synthesis Lab — ChemWorks economy building (BESPOKE iso form, NOT the
gateway cube).

Composed from the iso BUILDING TOOLKIT (isobuild.Box + cylinder) as a PIPEWORK
REACTOR HALL — a small chemical refinery, not a re-skinned square cube:

  * a medium-tall closed PROCESS HALL Box (moderate footprint, flat parapet roof)
    in blue-grey M/D walls wearing D/d vertical pipe-chase seams;
  * a stout jacketed REACTOR DRUM (a cylinder) bulging off the BACK-RIGHT corner,
    drawn FIRST so the hall occludes its base — steel M/D body, a c sight-gauge
    stripe, a D cap dome, and a thick K/D transfer pipe running into the hall roof;
  * external PIPEWORK across the upper RIGHT face: 2 horizontal M/D process pipes
    with K flange joints + one c coolant pipe, plus a small o pressure-relief glow
    at a valve and an o/O vapor wisp off the roof relief stack;
  * a flat parapet roof + a short vent stack + the drum cap — the industrial
    "process building" silhouette, clearly different from the open bench sheds and
    slender towers of the other sets.

OPENING SIDE = RIGHT. The hero is a tall K-framed CONTROL / CHARGING BAY on the
SHADED RIGHT face: glowing g->c glass with a bright o/O violet reaction-glow
interior so it reads on the shaded side, an h reflection sweep and a K-framed
door. The LIT LEFT face is kept plainer (pipe seams + a couple of c portholes).

Signature (one-of-one): a tall clear LIEBIG-STYLE CONDENSER mounted on the FRONT
of the hall — a vertical h/c glass tube wound with a tight diagonal g/G spiral
water-cooling coil (alternating light/dark to sell the helix), two thin c coolant
hoses teeing into the coil top and bottom, a soft o->O violet reaction glow behind
it, and a single h/W droplet of distilled product falling from the tube tip into a
small c/g RECEIVING FLASK below (a tiny meniscus + o vapor specks rising). No
coiled-condenser / dripping-tip motif exists anywhere else in the catalog.
"""
import os, sys, json

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box, cylinder

CHEM = {"K": "#161a2e", "W": "#e6ecfb", "L": "#c2cdee", "M": "#9aa8d8", "D": "#6f7cb0", "d": "#4b5688",
        "h": "#d6ecff", "c": "#a8d4ff", "g": "#4aa0e6", "G": "#2166b0",
        "o": "#c89cf0", "O": "#e0c2ff", "r": "#6a34a8"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def rect(c, x0, y0, x1, y1, fill=None, outline=None):
    if fill is not None:
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                c.set(x, y, fill)
    if outline is not None:
        for x in range(int(x0), int(x1) + 1):
            c.set(x, int(y0), outline); c.set(x, int(y1), outline)
        for y in range(int(y0), int(y1) + 1):
            c.set(int(x0), y, outline); c.set(int(x1), y, outline)


# ── 1. REACTOR DRUM — stout jacketed cylinder, BACK-RIGHT (drawn FIRST) ──────
def reactor_drum(c):
    """A stout jacketed reactor vessel abutting the back-right corner. Drawn first
    so the hall in front occludes its lower base. Fat steel M/D body (stout, NOT a
    slender silo) with jacket band rings, a c sight-gauge stripe and a domed cap."""
    cx, top_y, rx, h = 50, 14, 6, 13
    cylinder(c, cx, top_y, rx, h, top="L", side_l="M", side_r="D")
    # lit seam down the front-left of the drum (catches light)
    c.line((cx - rx + 1, top_y + 2), (cx - rx + 1, top_y + h - 1), "L")
    # three jacket band rings around the drum (the welded jacket seams)
    for ry in (top_y + 4, top_y + 8, top_y + 12):
        c.line((cx - rx + 1, ry), (cx + rx - 1, ry), "d")
        c.set(cx - rx, ry, "K"); c.set(cx + rx, ry, "K")
    # a c SIGHT-GAUGE stripe (a vertical glass level gauge on the lit shoulder)
    for yy in range(top_y + 2, top_y + h - 1):
        c.set(cx - 3, yy, "c")
    c.set(cx - 3, top_y + 2, "h")               # bright top of the gauge
    c.set(cx - 3, top_y + h - 2, "G")           # darker liquid base
    c.set(cx - 4, top_y + 5, "K")               # thin K rim on the gauge
    # rounded D CAP DOME crowning the drum (read as a domed lid, not a flat top)
    for i, yy in enumerate(range(top_y - 4, top_y)):
        w = 1 + i + 1
        c.line((cx - w, yy), (cx + w, yy), "D")
        c.set(cx - w, yy, "K"); c.set(cx + w, yy, "K")
    c.set(cx - 2, top_y - 4, "M")               # dome glint
    c.set(cx - 1, top_y - 4, "L")
    # a small charge nozzle riser on the cap
    c.set(cx + 1, top_y - 5, "D"); c.set(cx + 1, top_y - 6, "K")


def transfer_pipe(c):
    """A thick transfer pipe running from the drum's lower shoulder down-left onto
    the back roof of the hall — the cue that the drum feeds the process hall."""
    # drum lower-left shoulder ~ (45,24) angling onto the back roof ~ (39,27).
    # Use DARK D/d body so the pipe reads against the BRIGHT L roof it crosses.
    pts = [(45, 23), (44, 24), (43, 24), (42, 25), (41, 25), (40, 26), (39, 26)]
    for (x, y) in pts:
        c.set(x, y - 1, "M")     # lit crown of the pipe
        c.set(x, y, "D")         # pipe body (dark, reads on the L roof)
        c.set(x, y + 1, "K")     # underside shade / outline
    # K flange collars at each end
    c.set(45, 22, "K"); c.set(46, 23, "K")
    c.set(39, 25, "K"); c.set(39, 27, "K")


# ── 2. MAIN HALL — medium-tall process Box (the bespoke break from the cube) ─
def main_hall(c):
    """Medium-tall closed process hall. wx=11 wy=10 h=18 -> a boxy industrial
    hall (slightly wider than tall, flat parapet), distinct from the tall square
    gateway cube (wx=wy=11 h=20)."""
    hall = Box(top=(30, 16), wx=11, wy=10, h=18)
    hall.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    return hall


def parapet(c, hall):
    """A flat parapet lip around the roof edge — the 'closed process hall' cue."""
    # bright lip along the two front roof edges (left->front, front->right)
    c.line(hall.r_left, hall.r_front, "W")
    c.line(hall.r_front, hall.r_right, "L")
    # a thin d reveal one px under the front roof edges (parapet thickness)
    c.line((hall.r_left[0], hall.r_left[1] + 1), (hall.r_front[0], hall.r_front[1] + 1), "d")
    c.line((hall.r_front[0], hall.r_front[1] + 1), (hall.r_right[0], hall.r_right[1] + 1), "d")


def pipe_chase_seams(c, hall):
    """Vertical D/d pipe-chase seams ribbing both walls (the ChemWorks wall motif)."""
    # lit (left) face: a couple of faint seams (kept plainer per blueprint)
    for u in (0.30, 0.66):
        c.line(hall.left_pt(u, 1.5), hall.left_pt(u, 16.5), "d")
        c.line(hall.left_pt(u + 0.02, 1.5), hall.left_pt(u + 0.02, 16.5), "D")
    # shaded (right) face: tighter seam rhythm behind the pipework/hero
    for u in (0.18, 0.84):
        c.line(hall.right_pt(u, 1.5), hall.right_pt(u, 16.5), "d")


# ── 3. EXTERNAL PIPEWORK on the upper RIGHT face ─────────────────────────────
def pipework(c, hall):
    """A run of horizontal process pipes with K flange joints across the upper
    RIGHT face, plus one c coolant pipe and a small o pressure-relief glow."""
    # two fat process pipes banding across the top of the shaded right face.
    # bright L crown + M body + K underside = a raised round pipe reading on the wall
    for v in (1.4, 3.4):
        c.line(hall.right_pt(0.05, v), hall.right_pt(0.95, v), "W")        # bright crown glint
        c.line(hall.right_pt(0.05, v + 0.55), hall.right_pt(0.95, v + 0.55), "M")
        c.line(hall.right_pt(0.05, v + 1.1), hall.right_pt(0.95, v + 1.1), "K")  # underside
        # K flange joints (a short collar) at intervals
        for u in (0.26, 0.54, 0.82):
            p = hall.right_pt(u, v - 0.5)
            x, y = int(round(p[0])), int(round(p[1]))
            c.set(x, y, "K"); c.set(x, y + 1, "D"); c.set(x, y + 2, "K")
    # one c COOLANT pipe under the process pipes
    c.line(hall.right_pt(0.04, 5.6), hall.right_pt(0.70, 5.6), "c")
    c.line(hall.right_pt(0.04, 6.1), hall.right_pt(0.70, 6.1), "g")
    # a small o PRESSURE-RELIEF glow at a valve on the right pipes
    rv = hall.right_pt(0.88, 5.4)
    rx_, ry_ = int(round(rv[0])), int(round(rv[1]))
    c.set(rx_, ry_, "K"); c.set(rx_, ry_ - 1, "r"); c.set(rx_, ry_ - 2, "o")
    c.set(rx_, ry_ - 3, "O")


def left_portholes(c, hall):
    """Keep the LIT LEFT face plainer: just a couple of small c portholes high up,
    away from the front-mounted condenser (which lives near the front corner)."""
    for u in (0.22, 0.46):
        p = hall.left_pt(u, 3.0)
        x, y = int(round(p[0])), int(round(p[1]))
        rect(c, x - 1, y, x, y + 1, fill="c")
        c.set(x - 1, y, "h")                    # glint
        c.set(x - 2, y, "K"); c.set(x + 1, y, "K")   # K rim


# ── 4. ROOF DETAIL — vent stack + relief vapor wisp ──────────────────────────
def roof_features(c, hall):
    """A short vent stack on the roof + a thin o/O vapor wisp off the relief
    valve. The drum cap (drawn earlier) completes the industrial roofline."""
    # short vent STACK toward the back-left of the roof
    s = hall.roof_pt(0.30, 0.62)
    sx, sy = int(round(s[0])), int(round(s[1]))
    rect(c, sx - 1, sy - 6, sx, sy, fill="D")
    rect(c, sx - 1, sy - 6, sx, sy - 6, fill="M")     # lit stack rim
    c.set(sx - 1, sy - 6, "K"); c.set(sx, sy - 6, "K")
    c.set(sx - 1, sy, "K")
    # a thin violet vapor wisp drifting up off the stack
    c.set(sx, sy - 7, "o"); c.set(sx + 1, sy - 9, "O")
    c.set(sx, sy - 11, "o")
    # a small reagent vent box near the front-right roof corner
    v = hall.roof_pt(0.66, 0.30)
    vx, vy = int(round(v[0])), int(round(v[1]))
    rect(c, vx - 1, vy - 2, vx + 1, vy, fill="M", outline="K")
    c.set(vx, vy - 2, "L")


# ── 5. HERO — glowing CONTROL / CHARGING BAY on the SHADED RIGHT face ────────
def control_bay(c, hall):
    """The opening side: a tall K-framed control/charging bay on the shaded RIGHT
    face. Glowing g->c glass with a bright o/O violet reaction-glow interior so it
    reads on the dark side, an h reflection sweep, and a K-framed door at grade."""
    u0, u1 = 0.30, 0.74
    vt, vb = 6.6, 17.2
    # K opening frame (reveal behind the glass)
    c.fill_poly([hall.right_pt(u0, vt), hall.right_pt(u1, vt),
                 hall.right_pt(u1, vb), hall.right_pt(u0, vb)], "K")
    iu0, iu1 = u0 + 0.018, u1 - 0.018
    ivt, ivb = vt + 0.5, vb - 0.4
    # VIOLET reaction-glow interior seen through the glass (the lit charging bay)
    c.fill_poly([hall.right_pt(iu0, ivt), hall.right_pt(iu1, ivt),
                 hall.right_pt(iu1, ivb), hall.right_pt(iu0, ivb)], "r")
    # brighter o/O glow core in the upper bay (the reaction running inside)
    c.fill_poly([hall.right_pt(iu0, ivt + 0.4), hall.right_pt(iu1, ivt + 0.4),
                 hall.right_pt(iu1, ivt + 3.4), hall.right_pt(iu0, ivt + 3.4)], "o")
    c.fill_poly([hall.right_pt(iu0 + 0.04, ivt + 0.8), hall.right_pt(iu1 - 0.04, ivt + 0.8),
                 hall.right_pt(iu1 - 0.04, ivt + 2.2), hall.right_pt(iu0 + 0.04, ivt + 2.2)], "O")
    # cool g->c glass wash over the lower bay (glass in front of the glow)
    c.fill_poly([hall.right_pt(iu0, ivt + 4.2), hall.right_pt(iu1, ivt + 4.2),
                 hall.right_pt(iu1, ivb), hall.right_pt(iu0, ivb)], "g")
    c.line(hall.right_pt(iu0, ivt + 5.0), hall.right_pt(iu1, ivt + 5.0), "c")
    # an h diagonal REFLECTION sweep across the glass
    c.line(hall.right_pt(iu0 + 0.06, ivt + 5.6), hall.right_pt(iu1 - 0.20, ivt + 1.4), "h")
    # vertical mullions splitting the bay into 3 lights
    for m in (1, 2):
        um = iu0 + (iu1 - iu0) * m / 3.0
        c.line(hall.right_pt(um, ivt), hall.right_pt(um, ivb), "K")
    # a K-framed DOOR at the right of the bay, running down to grade
    du0, du1 = 0.62, 0.73
    c.fill_poly([hall.right_pt(du0, 9.0), hall.right_pt(du1, 9.0),
                 hall.right_pt(du1, vb), hall.right_pt(du0, vb)], "K")
    c.fill_poly([hall.right_pt(du0 + 0.012, 9.6), hall.right_pt(du1 - 0.012, 9.6),
                 hall.right_pt(du1 - 0.012, vb - 0.4), hall.right_pt(du0 + 0.012, vb - 0.4)], "g")
    c.line(hall.right_pt(du0 + 0.02, 10.2), hall.right_pt(du0 + 0.02, vb - 0.8), "c")
    # bright lintel highlight over the whole bay
    c.line(hall.right_pt(u0, vt), hall.right_pt(u1, vt), "L")


# ── 6. SIGNATURE — coiled Liebig condenser dripping into a receiving flask ───
def liebig_condenser(c, hall):
    """One-of-one: a tall clear Liebig-style condenser mounted on the FRONT of the
    hall (near the front corner, on the LIT LEFT face), wound with a spiral cooling
    coil, dripping distilled product into a small receiving flask. Drawn LAST so it
    reads on top as the hero apparatus.

    Anchored near the building's FRONT corner. We work in screen px around the
    front vertical edge (hall.r_front ~ x30, y36 ... w_front ~ y54)."""
    fx, fy = int(round(hall.r_front[0])), int(round(hall.r_front[1]))
    # mount the condenser just LEFT of the front corner, on the lit face — raised
    # so the whole assembly (coil + drip + receiving flask) sits ON the front face
    # WITHIN the footprint, with the flask floor well above the base outline (the
    # front bottom vertex is at w_front ~ y55) instead of dangling into the shadow.
    cxg = fx - 6          # glass tube centre x
    top = fy - 5          # tube top (raised up onto the upper front face)
    bot = fy + 5          # tube tip (above the flask, shorter tube)

    # --- soft o->O VIOLET reaction glow halo behind the condenser ---
    for yy in range(top + 1, bot):
        c.set(cxg + 3, yy, "r")            # violet glow spilling on the shaded side
    c.set(cxg + 3, top + 3, "o")
    c.set(cxg + 3, (top + bot) // 2, "o")
    c.set(cxg + 3, bot - 2, "o")

    # --- vertical glass TUBE (3px wide so the coil has a body to wrap) ---
    for yy in range(top, bot + 1):
        c.set(cxg - 1, yy, "h")      # bright lit edge
        c.set(cxg, yy, "c")          # cool glass body
        c.set(cxg + 1, yy, "c")
    # K glass outline down both sides
    for yy in range(top - 1, bot + 1):
        c.set(cxg - 2, yy, "K"); c.set(cxg + 2, yy, "K")
    # K caps at top and tip
    c.set(cxg - 1, top - 1, "K"); c.set(cxg, top - 1, "K"); c.set(cxg + 1, top - 1, "K")

    # --- SPIRAL COIL wound around the tube: each turn is a clean diagonal band
    #     crossing the 3px tube, alternating bright g / dark G to sell the helix ---
    for i, yy in enumerate(range(top + 1, bot - 1, 2)):
        front = "g"                                  # bright front of the coil turn
        back = "G"                                   # dark underside of the turn below
        # the turn rises left->right across the tube (one diagonal step)
        c.set(cxg - 2, yy + 1, back)                 # dark back edge wrapping left
        c.set(cxg - 1, yy, front)
        c.set(cxg, yy, front)
        c.set(cxg + 1, yy - 1 if False else yy, front)
        c.set(cxg + 2, yy - 1, back)                 # dark back edge wrapping right
    # a bright h highlight glinting off the front of the topmost coil turn
    c.set(cxg, top + 1, "h")

    # --- two thin c COOLANT HOSES teeing into the coil top and bottom ---
    # top hose teeing in from the upper-left
    c.set(cxg - 3, top + 1, "c"); c.set(cxg - 4, top, "c"); c.set(cxg - 4, top - 1, "g")
    c.set(cxg - 4, top, "h")     # one h highlight on the top hose
    # bottom hose teeing out to the lower-left
    c.set(cxg - 3, bot - 1, "c"); c.set(cxg - 4, bot, "c"); c.set(cxg - 4, bot + 1, "g")

    # --- the DRIP: a droplet just leaving the tube tip ---
    c.set(cxg, bot + 1, "h")     # droplet pulling off the tip
    c.set(cxg, bot + 2, "W")     # bright falling droplet

    # --- receiving FLASK at the base catching the distilled product ---
    flx, fly = cxg, bot + 5      # flask centre / neck base
    # narrow glass NECK
    c.set(flx, bot + 3, "c"); c.set(flx, bot + 4, "c")
    c.set(flx - 1, bot + 3, "K"); c.set(flx + 1, bot + 3, "K")
    # round flask BODY (a small c/g Erlenmeyer-ish bulb)
    for dy in range(0, 4):
        w = 1 + dy
        for dx in range(-w, w + 1):
            c.set(flx + dx, fly + dy, "g")
    # cool c upper meniscus of collected liquid + h glint
    c.line((flx - 1, fly), (flx + 1, fly), "c")
    c.set(flx - 1, fly, "h")
    # darker G base of the flask body
    c.line((flx - 2, fly + 3), (flx + 2, fly + 3), "G")
    # K outline around the flask bulb
    c.set(flx - 4, fly + 3, "K"); c.set(flx + 4, fly + 3, "K")
    c.set(flx - 3, fly + 2, "K"); c.set(flx + 3, fly + 2, "K")
    c.set(flx - 2, fly + 1, "K"); c.set(flx + 2, fly + 1, "K")
    c.line((flx - 3, fly + 4), (flx + 3, fly + 4), "K")   # flask floor
    # 1-2 o vapor specks rising off the collected product
    c.set(flx + 1, fly - 1, "o"); c.set(flx - 1, fly - 2, "O")


def main():
    c = Canvas()
    # painter's order: BACK drum + transfer pipe, then the hall, then wall seams,
    # pipework, roof, the RIGHT-face hero bay, and the front condenser ON TOP.
    reactor_drum(c)
    transfer_pipe(c)
    hall = main_hall(c)
    parapet(c, hall)
    pipe_chase_seams(c, hall)
    pipework(c, hall)
    left_portholes(c, hall)
    roof_features(c, hall)
    control_bay(c, hall)
    liebig_condenser(c, hall)

    spec = {"width": 64, "height": 64, "palette": CHEM, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/chemworks_reaction-synthesis-lab.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    main()
