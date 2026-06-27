#!/usr/bin/env python3
"""
Weather Monitoring Post — TerraBase economy building (BESPOKE form, STANDARD role).

The TALLEST, AIRIEST, MOST VERTICAL-OPEN silhouette in the TerraBase set: a
fire-lookout-on-stilts — a small weatherproof observation CABIN perched high on
four splayed timber legs (open air shows between them, X-braced), with a railed
observation DECK wrapping it and a small cantilevered BALLOON-LAUNCH platform off
the front corner, reached by an angled access stair. NOT the gateway cube, NOT the
squat bunker, NOT the cylinder farm — a skinny stilted lookout tower.

  * Opening side = RIGHT: the hero is the cabin's INSTRUMENT ROOM on the SHADED
    RIGHT face — a wide K-framed observation WINDOW made to GLOW (g->c glass over a
    warm o/O lamp-lit interior with instruments + a forecast screen, h reflection)
    so it reads on the shaded side. The LIT-LEFT cabin face stays plainer (plank
    wall + one small c window + the access stair).
  * Signature (one-of-one): a glowing tethered WEATHER-BALLOON strains upward at a
    taut tether line above the launch platform, a RADIOSONDE sensor pod dangling
    beneath it, and from the pod unfurls a holographic FORECAST RIBBON — a strip of
    sun->cloud->storm glyphs with a bright predicted-FRONT ARROW sweeping toward the
    storm. NO anemometer (that is BioCore Field Station's owned feature).

Composed from art/isobuild.{Box} — NO iso.draw_cube / base_windows.
Draw order: contact shadow + stilt legs + X-braces -> the observation CABIN mass ->
hipped plank roof + lightning rod -> railed deck + balloon-launch platform + stair
-> RIGHT glowing instrument window (front) -> tethered balloon + radiosonde +
forecast ribbon signature on top (headroom reserved at the canvas top).
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

TERRA = {"K": "#20190f", "W": "#efe6cf", "L": "#d6c8a0", "M": "#b09a6e", "D": "#7e6c47", "d": "#54462c",
         "h": "#d6f2ea", "c": "#a4e2d4", "g": "#34b6a2", "G": "#1d8474",
         "o": "#e0a850", "O": "#ffce80", "r": "#9a5e1e"}


# ── cabin geometry: a SMALL NARROW box perched HIGH, long legs reach up to it ──
CABIN = Box(top=(31, 23), wx=7, wy=6, h=8)
GROUND_Y = 57          # screen-y the stilt legs plant into the ground (long legs)


# ── 1. contact shadow on the ground under the open stilted footprint ──────────
def ground_shadow(c):
    """A soft flat K contact ellipse pooled under the lookout's small footprint —
    grounds the airy stilted tower."""
    scx, scy = 31, GROUND_Y + 1
    for x in range(scx - 13, scx + 14):
        for y in range(scy - 2, scy + 3):
            ex = (x - scx) / 13.0
            ey = (y - scy) / 2.3
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")


# ── 2. STILT LEGS — four splayed timber legs from a small footprint up to the
#       cabin floor, with X cross-braces; OPEN AIR between them (the hero form) ──
def stilt_legs(c):
    """Four splayed D/d timber legs rising from a tight ground footprint out to the
    four bottom corners of the cabin floor, X-braced. Returns the four leg foot
    points so the stair/anchors can reference them. The wide-at-top / narrow-at-
    bottom splay reads as a fire-lookout trestle, not a solid base."""
    # cabin floor corners (where each leg lands at the top)
    top_left = CABIN.w_left
    top_front = CABIN.w_front
    top_right = CABIN.w_right
    top_back = (CABIN.r_top[0], CABIN.r_top[1] + CABIN.h)   # back-top corner dropped by h
    # ground feet splay OUT to a wide trestle base (fire-lookout splay) — wider
    # than the cabin so the legs read as raking, open-air timber legs.
    fx = 31
    feet = {
        "left":  (fx - 11, GROUND_Y),
        "front": (fx,      GROUND_Y + 1),
        "right": (fx + 11, GROUND_Y),
        "back":  (fx,      GROUND_Y - 4),
    }
    tops = {"left": top_left, "front": top_front, "right": top_right, "back": top_back}

    def leg(top, foot, lit):
        """Draw one 2px timber leg from cabin-floor `top` to ground `foot`."""
        tx, ty = int(round(top[0])), int(round(top[1]))
        fxp, fyp = int(round(foot[0])), int(round(foot[1]))
        body = "D" if lit else "d"
        c.line((tx, ty), (fxp, fyp), body)
        c.line((tx + 1, ty), (fxp + 1, fyp), "d")          # shaded side of the post
        c.line((tx - 1, ty), (fxp - 1, fyp), "K")          # K outline edge
        c.set(fxp, fyp + 1, "K")                            # foot pad on the ground

    # draw BACK leg first (occluded), then side legs, then the front leg last
    leg(tops["back"], feet["back"], lit=False)
    leg(tops["left"], feet["left"], lit=True)
    leg(tops["right"], feet["right"], lit=False)
    leg(tops["front"], feet["front"], lit=True)

    # X cross-braces between the front-facing legs (open-air trestle bracing).
    # For each front bay (left<->front, front<->right) draw a full X between the
    # leg tops and feet so the open timber lattice reads as a fire-lookout trestle.
    def pt_on(a, b, t):
        return (a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]))

    def bay_x(la, lb, ch):
        """A diagonal X across the bay framed by legs la (top,foot) and lb."""
        ta, fa = la
        tb, fb = lb
        c.line(fa, tb, ch)          # foot-a -> top-b
        c.line(ta, fb, ch)          # top-a  -> foot-b
        # a horizontal mid girt across the bay (ties the X)
        ma = pt_on(ta, fa, 0.55)
        mb = pt_on(tb, fb, 0.55)
        c.line(ma, mb, "d")

    L = (tops["left"], feet["left"])
    F = (tops["front"], feet["front"])
    R = (tops["right"], feet["right"])
    bay_x(L, F, "d")
    bay_x(F, R, "d")
    return feet, tops


# ── 3. the OBSERVATION CABIN mass (the small perched box) ─────────────────────
def cabin(c):
    """The small weatherproof plank cabin perched on the legs. M/L lit-left, D/d
    shaded-right plank walls, a shallow hipped L/M plank roof. Drawn over the legs
    so the cabin floor occludes the leg tops (legs rest UNDER the cabin)."""
    b = CABIN
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # plank-board seams down the LIT-LEFT face (weathered-timber field build)
    for u in (0.30, 0.55, 0.80):
        c.line(b.left_pt(u, 1.4), b.left_pt(u, 7.2), "D")
    # a warm r sill band + corner posts on the lit face (timber framing)
    c.line(b.left_pt(0.05, 7.0), b.left_pt(0.95, 7.0), "r")
    c.line(b.left_pt(0.04, 0.6), b.left_pt(0.04, 7.4), "D")
    c.line(b.left_pt(0.96, 0.6), b.left_pt(0.96, 7.4), "d")
    return b


# ── 4. hipped plank ROOF detail + lightning rod (roofline) ────────────────────
def roof_and_rod(c, b):
    """Re-lay the hipped cabin roof as warm plank boards with a bright W back ridge,
    and stand a stubby D lightning-rod with a c tip at the apex (weatherproof
    antenna motif). The balloon will rise above this."""
    # plank seams running across the roof slope
    for v in (0.28, 0.52, 0.76):
        c.line(b.roof_pt(0.06, v), b.roof_pt(0.94, v), "M")
    c.line(b.r_top, b.r_left, "W")        # bright lit back ridge
    c.line(b.r_top, b.r_right, "L")
    # stubby lightning rod at the apex with a teal sensor tip — tip lifted one extra
    # pixel so it separates cleanly from the roofline
    ax, ay = b.apex(0)
    rx, ry = int(round(ax)), int(round(ay))
    for k in range(1, 6):
        c.set(rx, ry - k, "D")
    c.set(rx, ry - 6, "c")                # mineral-teal sensor tip
    c.set(rx, ry - 7, "h")


# ── 5. railed observation DECK + balloon-launch PLATFORM + access stair ───────
def deck_and_platform(c, b, feet):
    """A thin railed observation deck wraps the cabin's front lip (K posts + a D
    rail), a small cantilevered balloon-launch platform juts off the front corner,
    and an angled zig-zag access stair climbs the front-left leg to the deck."""
    # ── deck lip: a 1px D plank ledge just below the two FRONT wall bottoms ──
    ledge_y = 1
    # left-front edge and right-front edge of the deck (one px out + down)
    c.line((b.w_left[0] - 1, b.w_left[1] + ledge_y),
           (b.w_front[0], b.w_front[1] + ledge_y), "D")
    c.line((b.w_front[0], b.w_front[1] + ledge_y),
           (b.w_right[0] + 1, b.w_right[1] + ledge_y), "d")

    # ── railing: K posts rising from the deck lip with a thin D top rail ──
    rail_h = 3
    # left-front rail run. `post_every` thins the posts (the SHADED right run is
    # decluttered so it doesn't collide with the launch shelf + ribbon root).
    def rail(p0, p1, n, lit, post_every=2):
        for k in range(n + 1):
            t = k / n
            x = int(round(p0[0] + t * (p1[0] - p0[0])))
            y = int(round(p0[1] + t * (p1[1] - p0[1])))
            c.set(x, y - rail_h, "M" if lit else "D")        # top rail node
            if k % post_every == 0:
                c.line((x, y - rail_h), (x, y - 1), "K")     # vertical post
    lf0 = (b.w_left[0] - 1, b.w_left[1] + ledge_y)
    lf1 = (b.w_front[0], b.w_front[1] + ledge_y)
    rf1 = (b.w_right[0] + 1, b.w_right[1] + ledge_y)
    rail(lf0, lf1, 4, lit=True)
    # right-front run: only the two END posts so the busy corner breathes
    rail(lf1, rf1, 3, lit=False, post_every=3)
    # continuous top rail line tying the posts
    c.line((lf0[0], lf0[1] - rail_h), (lf1[0], lf1[1] - rail_h), "M")
    c.line((lf1[0], lf1[1] - rail_h), (rf1[0], rf1[1] - rail_h), "D")

    # ── BALLOON-LAUNCH PLATFORM: a small planked shelf cantilevering OUT off the
    #    front-RIGHT roof corner, lifted into the open air above the roof so the
    #    balloon visibly rises from it (the launch pad). A small iso diamond deck
    #    on two short K props from the roof corner. ──
    cp = b.roof_pt(0.72, 0.18)                  # toward the front-right roof corner
    px, py = int(round(cp[0])) + 5, int(round(cp[1])) - 2   # nudged up+out, clear of the window
    # ONE short K prop lifting the shelf off the roof corner (decluttered: was two)
    c.line((px - 1, py + 1), (px - 1, py + 4), "K")
    # the planked shelf — a small iso diamond (M lit-left, D shaded-right)
    for i in range(-3, 5):
        c.set(px + i, py, "M" if i <= 0 else "D")
        c.set(px + i, py + 1, "D" if i <= 0 else "d")
    # K outline of the launch shelf + teal deck-grate sensor inlays
    for i in range(-3, 5):
        c.set(px + i, py - 1, "K")
    c.set(px + 5, py, "K"); c.set(px + 5, py + 1, "K")
    c.set(px - 4, py, "K"); c.set(px - 4, py + 1, "K")
    c.set(px - 1, py, "c"); c.set(px + 2, py, "g")          # launch-pad sensors
    # a K cleat at the shelf centre where the balloon tether anchors
    c.set(px, py - 1, "K")

    # ── ACCESS STAIR: an angled zig-zag stringer down the front-LEFT leg ──
    sx0, sy0 = lf0[0] - 1, lf0[1] + 1            # top of stair (at deck left)
    sxF, syF = feet["left"][0] + 1, feet["left"][1] - 1
    n = 7
    for k in range(n + 1):
        t = k / n
        x = int(round(sx0 + t * (sxF - sx0)))
        y = int(round(sy0 + t * (syF - sy0)))
        c.set(x, y, "D")             # tread
        c.set(x, y - 1, "M")         # lit riser nose
        c.set(x - 1, y, "K")         # stringer edge
    return (px, py - 1)              # the launch-shelf tether cleat


# ── 6. RIGHT opening — the GLOWING instrument room on the SHADED right face ────
def right_instrument_window(c, b):
    """The hero opening: a wide K-framed observation/INSTRUMENT window on the cabin's
    SHADED RIGHT face, made to GLOW — g->c glass over a warm o/O lamp-lit interior
    with a c forecast SCREEN + instruments visible and an h reflection, so it reads
    clearly on the dark side."""
    pt = b.right_pt
    u0, u1, v0, v1 = 0.14, 0.84, 1.8, 6.6
    # K frame
    c.fill_poly([pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)], "K")
    # warm lamp-lit interior body (o), brighter O wash upper-inner
    c.fill_poly([pt(u0 + 0.05, v0 + 0.7), pt(u1 - 0.05, v0 + 0.7),
                 pt(u1 - 0.05, v1 - 0.4), pt(u0 + 0.05, v1 - 0.4)], "o")
    c.fill_poly([pt(u0 + 0.08, v0 + 0.9), pt(u0 + 0.46, v0 + 0.9),
                 pt(u0 + 0.46, v1 - 1.6), pt(u0 + 0.08, v1 - 1.6)], "O")
    # teal glass sheen over the lit interior (g lower, c upper) so it reads as glazed
    c.fill_poly([pt(u0 + 0.05, v0 + 0.7), pt(u1 - 0.05, v0 + 0.7),
                 pt(u1 - 0.05, v0 + 2.2), pt(u0 + 0.05, v0 + 2.2)], "c")
    # a c FORECAST SCREEN mounted on the inner-right wall of the instrument room
    sp = pt(0.64, 3.4)
    sxp, syp = int(round(sp[0])), int(round(sp[1]))
    for j in range(2):
        for i in range(3):
            c.set(sxp + i, syp + j, "g" if (i + j) % 2 == 0 else "c")
    c.set(sxp + 1, syp - 1, "O")                 # a blinking readout pip
    # instrument console silhouette across the lit floor of the room
    c.line(pt(u0 + 0.10, v1 - 0.8), pt(u1 - 0.10, v1 - 0.8), "K")
    # mullion + bright sill glow + h reflection streak
    c.line(pt(0.50, v0 + 1.0), pt(0.50, v1 - 0.6), "K")
    c.line(pt(u0 + 0.08, v1 - 0.6), pt(u1 - 0.08, v1 - 0.6), "O")     # bright sill glow
    c.line(pt(u0 + 0.12, v0 + 1.2), pt(u0 + 0.12, v1 - 2.0), "h")     # reflection
    # K frame redraw on top so glow stays inside the frame
    for a, bb in [(pt(u0, v0), pt(u1, v0)), (pt(u0, v1), pt(u1, v1)),
                  (pt(u0, v0), pt(u0, v1)), (pt(u1, v0), pt(u1, v1))]:
        c.line(a, bb, "K")
    # warm o glow spilling out below the right face (light leaks onto the air)
    gp = pt(0.5, v1 + 0.6)
    gx, gy = int(round(gp[0])), int(round(gp[1]))
    for dx, ch in [(-2, "r"), (-1, "o"), (0, "o"), (1, "r")]:
        c.set(gx + dx, gy, ch)


# ── 7. plainer LIT-LEFT cabin window (keep the lit face quiet) ────────────────
def left_window(c, b):
    """One small c window high on the LIT-LEFT cabin face — the plainer side, so the
    glowing right opening carries the hero read."""
    b.window(c, "left", 0.30, 0.58, 2.4, 4.6, glass="c", hi="h", shade="G", mullions=1)


# ── 8. SIGNATURE — tethered glowing weather-balloon + radiosonde + forecast ───
def balloon_signature(c, anchor):
    """The hero: a glowing tethered WEATHER-BALLOON straining up at a taut line from
    the launch platform; a RADIOSONDE pod dangling beneath it; and a holographic
    FORECAST RIBBON (sun->cloud->storm glyphs) with a bright predicted-front ARROW
    sweeping toward the storm. `anchor` = the platform tether cleat (px,py)."""
    ax, ay = anchor

    # ── tether line: a thin taut line straining up-LEFT from the launch-shelf cleat
    #    to the balloon (the balloon pulls away from the post, so the line rakes) ──
    bcx, bcy = 24, 12               # balloon centre — high-left, headroom at the top
    c.line((ax, ay), (bcx + 1, bcy + 6), "D")     # taut tether (raking line)
    c.set(ax, ay - 1, "K")                         # anchor kink at the cleat
    # K dash accents along the line so the taut tether reads against the sky
    c.line((ax, ay), (bcx + 1, bcy + 6), "K") if False else None
    for k in range(2, 9, 2):
        t = k / 9
        tx = int(round(ax + t * (bcx + 1 - ax)))
        ty = int(round(ay + t * (bcy + 6 - ay)))
        c.set(tx, ty, "K")

    # ── soft c glow halo behind the balloon (mineral-teal sensor glow) ──
    R = 6
    for yy in range(-R - 1, R + 2):
        for xx in range(-R - 1, R + 2):
            d = (xx * xx) / 1.0 + (yy * yy) / 1.0
            if R * R < d <= (R + 1.4) * (R + 1.4):
                c.set(bcx + xx, bcy + yy, "c")

    # ── the BALLOON body: a round W/L envelope, h/c highlight upper-left ──
    for yy in range(-R, R + 1):
        for xx in range(-R, R + 1):
            if xx * xx + yy * yy <= R * R:
                # shading: bright upper-left -> warm lower-right
                if xx + yy < -4:
                    fill = "W"
                elif xx + yy < 0:
                    fill = "L"
                elif xx + yy < 5:
                    fill = "M"
                else:
                    fill = "D"
                c.set(bcx + xx, bcy + yy, fill)
    # specular h/c highlight on the upper-left shoulder
    for (dx, dy, ch) in [(-3, -3, "h"), (-2, -3, "h"), (-3, -2, "c"),
                         (-4, -1, "c"), (-2, -2, "W")]:
        c.set(bcx + dx, bcy + dy, ch)
    # a 1px c glow halo bump just outside the upper-left rim (sells "glowing tethered")
    for (dx, dy) in [(-5, -3), (-4, -4), (-3, -5)]:
        c.set(bcx + dx, bcy + dy, "c")
    # K silhouette outline of the balloon (single-pixel rim)
    for a in range(0, 360, 8):
        x = bcx + (R + 0.5) * math.cos(math.radians(a))
        y = bcy + (R + 0.5) * math.sin(math.radians(a))
        c.set(x, y, "K")
    # the balloon's neck pinching down to the line
    c.set(bcx, bcy + R, "K"); c.set(bcx, bcy + R + 1, "D")
    c.set(bcx - 1, bcy + R + 1, "K"); c.set(bcx + 1, bcy + R + 1, "K")

    # ── RADIOSONDE: a distinct K-outlined instrument pod dangling STRAIGHT DOWN from
    #    the balloon on a single clean D line, hung into the open sky to the lower-
    #    RIGHT of the balloon, clear of the roof. It must read as a hanging box with
    #    its own line — NOT part of the tower — so the line is one consistent D and
    #    the pod is a crisp boxed shape with a blinking sensor light. ──
    sx, sy = bcx + 4, bcy + R + 7
    # one clean single-pixel D suspension line from the balloon neck to the pod top.
    # Draw the K end-ties FIRST, then lay the solid D line ON TOP so the visible run
    # is one consistent D stroke (no dashed gap where it crosses the transparency).
    c.set(bcx + 1, bcy + R + 1, "K")                      # tie at the balloon neck
    c.set(sx, sy - 2, "K")                                # tie at the pod top
    c.line((bcx + 1, bcy + R + 2), (sx, sy - 2), "D")     # solid tether, ties left intact
    # the pod: a crisp 3-wide x 3-tall M/D box fully wrapped in a 1px K outline so it
    # is unmistakably a dangling instrument capsule
    for j in range(3):
        for i in range(-1, 2):
            c.set(sx + i, sy + j, "M" if i <= 0 else "D")
    for i in range(-2, 3):                                # top + bottom K edges
        c.set(sx + i, sy - 1, "K"); c.set(sx + i, sy + 3, "K")
    for j in range(-1, 4):                                # left + right K edges
        c.set(sx - 2, sy + j, "K"); c.set(sx + 2, sy + j, "K")
    c.set(sx, sy + 1, "c")                                 # teal instrument face
    c.set(sx, sy + 4, "O")                                 # one blinking sensor light
    c.set(sx, sy + 5, "K")                                 # K nub under the blink

    # ── FORECAST RIBBON: a clean wide holographic banner floating to the RIGHT of
    #    the pod, pulled a clear gap away, showing THREE clearly SPACED glyphs
    #    left->right: SUN -> CLOUD -> STORM, each in its own slot divided by a full
    #    K column so they read as a sequence, not a smear. The strip is taller (rh=7)
    #    so each glyph gets vertical room; the storm (prediction target) is brightest.
    rx0, ry0 = sx + 7, sy - 2         # ribbon root pulled a clear gap right of the pod
    slot_w = 6                        # each glyph slot is 6px wide (5px glyph + K div)
    rw = slot_w * 3 + 1               # three slots + a trailing K cap
    rh = 7
    # DARK holographic backing so the bright glyphs carry the read: h glow top edge,
    # a G (shaded-teal) body — the low-luminance field the icons sit on — G base.
    c.line((rx0, ry0), (rx0 + rw - 1, ry0), "h")             # bright glow top edge
    for j in range(1, rh - 1):
        for i in range(rw):
            c.set(rx0 + i, ry0 + j, "G")                     # dark teal body
    c.line((rx0, ry0 + rh - 1), (rx0 + rw - 1, ry0 + rh - 1), "g")  # lit teal base
    for x in (rx0 - 1, rx0 + rw):                            # K ribbon end caps
        for j in range(rh):
            c.set(x, ry0 + j, "K")
    # full-height K divider columns between the three slots (the spacing that sells
    # the read as three discrete glyphs rather than confetti)
    for s in (1, 2):
        xd = rx0 + s * slot_w
        for j in range(rh):
            c.set(xd, ry0 + j, "K")

    gy = ry0 + 3     # glyph centre row inside the taller strip
    # — SLOT 1 · SUN (left): a solid 2x2 O core with four radiating o rays (N/E/S/W)
    #   so it reads unmistakably as a sun against the dark teal field —
    sxx = rx0 + 2
    c.set(sxx, gy, "O"); c.set(sxx + 1, gy, "O")            # bright core
    c.set(sxx, gy - 1, "O"); c.set(sxx + 1, gy - 1, "O")
    c.set(sxx, gy - 2, "o"); c.set(sxx + 1, gy + 1, "o")   # vertical rays
    c.set(sxx - 1, gy - 1, "o"); c.set(sxx + 2, gy, "o")   # horizontal rays
    # — SLOT 2 · CLOUD (middle): a fat bright W/L puff — high luminance vs dark field —
    cxx = rx0 + slot_w + 2
    c.set(cxx, gy, "W"); c.set(cxx + 1, gy, "W"); c.set(cxx + 2, gy, "W")
    c.set(cxx + 1, gy - 1, "W"); c.set(cxx + 2, gy - 1, "L")
    c.set(cxx, gy - 1, "W")          # upper-left highlight so the cloud pops like sun/storm
    c.set(cxx, gy + 1, "L"); c.set(cxx + 1, gy + 1, "L"); c.set(cxx + 2, gy + 1, "L")
    # — SLOT 3 · STORM (right): a dark d storm-cloud over a bright O lightning bolt
    #   drawn as a CONNECTED zig-zag (right->left->right) so it reads as one bolt,
    #   not loose specks. This is the PREDICTION target — its bolt is the brightest
    #   read in the strip. —
    txx = rx0 + 2 * slot_w + 2
    c.set(txx, gy - 2, "d"); c.set(txx + 1, gy - 2, "d"); c.set(txx + 2, gy - 2, "d")
    c.set(txx, gy - 1, "d"); c.set(txx + 1, gy - 1, "D"); c.set(txx + 2, gy - 1, "d")
    # connected lightning bolt: top-right, then jog left, then down-right
    c.set(txx + 2, gy, "O"); c.set(txx + 1, gy, "O")        # bolt head under the cloud
    c.set(txx + 1, gy + 1, "O"); c.set(txx, gy + 1, "O")    # zig left
    c.set(txx + 1, gy + 2, "o")                             # tail glow tip

    # ── PREDICTED-FRONT ARROW: a bold bright shaft in its OWN band two full rows ABOVE
    #    the ribbon (no overlap with the glyphs), sweeping left->right with a clear
    #    2px O chevron arrowhead pointing DOWN-RIGHT onto the STORM slot — so the read
    #    is unambiguously "the predicted front moves toward the storm". ──
    ay2 = ry0 - 3               # clear band above the ribbon top edge
    ax2 = rx0 + 1               # shaft start over the sun slot
    head = rx0 + 2 * slot_w + 1 # base of the arrowhead, just left of the storm slot
    for x in range(ax2, head):  # solid 2px-bright shaft: O core with g lower edge
        c.set(x, ay2, "O")
        c.set(x, ay2 + 1, "g")
    # solid filled O arrowhead pointing RIGHT, tip aimed straight at the storm slot
    c.set(head, ay2 - 1, "O"); c.set(head, ay2, "O"); c.set(head, ay2 + 1, "O"); c.set(head, ay2 + 2, "O")  # back of head
    c.set(head + 1, ay2, "O"); c.set(head + 1, ay2 + 1, "O")  # mid
    c.set(head + 2, ay2, "O")                                 # tip (lands over storm)


def build():
    c = Canvas()
    # painter's order: ground shadow + open stilt trestle -> perched cabin mass ->
    # hipped roof + rod -> railed deck + launch platform + stair -> RIGHT glowing
    # instrument window -> plainer left window -> tethered balloon signature on top.
    ground_shadow(c)
    feet, _tops = stilt_legs(c)
    b = cabin(c)
    roof_and_rod(c, b)
    anchor = deck_and_platform(c, b, feet)
    right_instrument_window(c, b)
    left_window(c, b)
    balloon_signature(c, anchor)

    spec = {"width": 64, "height": 64, "palette": TERRA, "rows": c.rows()}
    out = "/path/to/scienium/art/src/buildings/terrabase_weather-monitoring-post.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
