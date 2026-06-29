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

# Base TerraBase palette (shared keys) + the four EVOLVED-accent keys reserved for
# the upgrade stages only (chars NOT used by the base palette, so they appear in NO
# stage-1 sprite and weather-monitoring-post.png stays byte-identical). These four
# exact keys+hexes are the lab-wide terrabase evolved accents:
#   b  deep basalt/bedrock  — matured warm structure tone for t3+ new masses
#   e  energized mineral-seismic glow (mid)    E  energized glow (bright) — t4/t5 power
#   q  premium survey gold  — t5 flourish ONLY (NOT a whole-building recolor)
TERRA = {"K": "#20190f", "W": "#efe6cf", "L": "#d6c8a0", "M": "#b09a6e", "D": "#7e6c47", "d": "#54462c",
         "h": "#d6f2ea", "c": "#a4e2d4", "g": "#34b6a2", "G": "#1d8474",
         "o": "#e0a850", "O": "#ffce80", "r": "#9a5e1e",
         "b": "#3a3326", "e": "#5fe0c4", "E": "#c4fff0", "q": "#f3c63a"}


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


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS field-meteorology
# structure onto the prior form — never restarts, never recolors the whole building.
# Theme: the lone stilted weather post grows into a fully built-out, instrumented
# upper-air sounding station. Colours mature stage by stage; gold (q) is a t5
# flourish only. Every add is anchored to a base part (a stilt leg / the deck / the
# launch shelf / the roof apex) and clamped on-canvas, and NONE collide with the
# signature tethered balloon (upper-LEFT) + forecast ribbon (right of the pod).
#
#   t2  small functional add : a tipping-bucket RAIN GAUGE + anemometer CUP-CROSS on a
#                              stilt-leg rail + a brighter O screen LED
#   t3  structural add        : a railed STILT-LEVEL INSTRUMENT DECK between the legs
#                              carrying a louvered Stevenson-screen box (first b)
#   t4  major add             : a large SOUNDING BALLOON on a taut e tether reeling off
#                              a b winch drum, glowing e radiosonde pod slung beneath
#   t5  crowning feature      : the forecast billboard becomes a glowing E synoptic
#                              WEATHER-MAP WALL (pulsing e storm cells), TWIN balloons
#                              aloft, + a gold sun-and-vane finial & screen trim
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_rain_gauge(c, b, feet):
    """t2 — SMALL FUNCTIONAL ADD: a little weather-instrument cluster clamped to the
    front-RIGHT stilt-leg rail in the open understory — a tipping-bucket RAIN GAUGE
    (a small M funnel can with a c collected-water glint) plus an ANEMOMETER CUP-CROSS
    (a short K arm carrying three tiny o/K wind cups) on a stub mast bracketed to the
    leg. Lit M against the open-air understory so it reads with strong contrast, kept
    LOW between the front + right legs so it never climbs into the cabin/signature and
    sits well RIGHT of the later t3/t4 deck gear. Also brightens one O LED on the
    forecast screen so the screen visibly powers up. On-theme, modest, base palette."""
    # Mount in the LEFT open bay (clear sky between the left leg ~x18-20 and the central
    # mass), so the lit instruments read with strong contrast against the open trestle
    # and stay clear of the centre deck (t3) and the upper-air gear/balloon above.
    mx, my = 25, 51                              # mast foot in the open left bay
    # a short K bracket arm tying the mast back to the nearby left leg
    c.line((mx - 4, my - 2), (mx, my - 2), "d")
    c.set(mx - 4, my - 2, "K")
    # stub mast rising a few px (lit shaft on open sky)
    top = my - 8
    c.line((mx, my), (mx, top), "M")             # lit mast shaft
    c.set(mx + 1, my - 1, "d")                    # shaded right edge
    c.set(mx, my, "K")                            # foot node
    # --- tipping-bucket RAIN GAUGE: a funnel can bracketed on the mast's lower arm,
    #     standing just LEFT of the mast in clear air. A 2-wide M can with a splayed K/L
    #     catch-funnel rim + a c collected-water glint. ---
    gx, gy = mx - 3, my - 4
    c.set(gx, gy, "M"); c.set(gx + 1, gy, "M")       # can body
    c.set(gx, gy + 1, "D"); c.set(gx + 1, gy + 1, "d")
    c.set(gx, gy + 2, "K"); c.set(gx + 1, gy + 2, "K")   # can base
    c.set(gx - 1, gy - 1, "K"); c.set(gx + 2, gy - 1, "K")   # splayed funnel rim lip
    c.set(gx, gy - 1, "L"); c.set(gx + 1, gy - 1, "L")      # lit funnel mouth
    c.set(gx, gy, "c")                             # collected-water glint
    c.set(mx - 1, my - 4, "d")                     # short support strut to the mast
    # --- ANEMOMETER CUP-CROSS: a horizontal K arm at the mast top carrying three tiny
    #     o/O wind cups (a readable spinning cup-cross), the wind sensor. ---
    c.set(mx, top, "K")                            # hub at the mast top
    c.line((mx - 2, top - 1), (mx + 2, top - 1), "K")   # the spinning cross arm
    c.set(mx - 2, top - 2, "o"); c.set(mx - 3, top - 1, "o")   # left cup
    c.set(mx + 2, top - 2, "o"); c.set(mx + 3, top - 1, "o")   # right cup
    c.set(mx, top - 2, "O")                        # centre/top cup catches the light
    # --- brighter O LED on the forecast SCREEN (in the right instrument window) so the
    #     billboard visibly powers up. The screen pip lives at right_pt(0.64,3.4); add a
    #     fresh O active-LED a row above it, recomputed from the cabin's own face. ---
    sp = b.right_pt(0.64, 2.9)
    c.set(int(round(sp[0])), int(round(sp[1])), "O")
    c.set(int(round(sp[0])) + 1, int(round(sp[1])), "o")


def _deck_geom(b):
    """Shared stilt-level deck geometry so t4's winch (and any t5 reference) recompute
    from the SAME source as t3, never a hardcoded second guess. Returns a thin platform
    Box slung LOW in the open trestle between the four legs (its top diamond sits in the
    clear understory band ~y47, its corners landing on the leg runs), well below the
    cabin floor and clear of the balloon/ribbon signature above."""
    deck = Box(top=(31, 42), wx=5, wy=5, h=2)
    return deck


def stage3_instrument_deck(c, b, feet):
    """t3 — STRUCTURAL ADD: a railed STILT-LEVEL INSTRUMENT DECK built out between the
    four legs under the hut — a thin b timber platform (the matured basalt structure
    tone, first use) with a K railing and, standing on it, a louvered STEVENSON-SCREEN
    box (the classic white slatted weather enclosure, drawn with Box.louver). A real
    new structural mass that extends the tower DOWNWARD/OUTWARD into the open trestle,
    clear of the cabin above and the balloon/ribbon signature. Returns nothing; t4
    recomputes the deck from the shared _deck_geom."""
    deck = _deck_geom(b)
    # --- the deck slab: a thin b/d platform diamond slung between the legs, drawn with
    #     a BRIGHT lit top so it reads as a clear platform in the dark trestle (not a
    #     muddy blob). Underside/front edge bands first, then the lit deck top. ---
    c.fill_poly([deck.r_left, deck.r_front, deck.w_front, deck.w_left], "D")   # lit-left edge band
    c.fill_poly([deck.r_front, deck.r_right, deck.w_right, deck.w_front], "b") # shaded-right edge band
    c.fill_poly([deck.r_top, deck.r_right, deck.r_front, deck.r_left], "M")    # deck top (timber)
    c.fill_poly([deck.r_top, deck.r_left, deck.r_front], "L")                  # lit back-left top
    # a couple of d plank seams across the deck top (timber decking)
    for v in (0.34, 0.66):
        c.line(deck.roof_pt(0.08, v), deck.roof_pt(0.92, v), "d")
    c.line(deck.r_top, deck.r_left, "W")          # bright lit back edge
    c.line(deck.r_top, deck.r_right, "L")
    # K outline of the deck silhouette
    for a, bb in [(deck.r_top, deck.r_right), (deck.r_right, deck.r_front),
                  (deck.r_front, deck.r_left), (deck.r_left, deck.r_top),
                  (deck.r_left, deck.w_left), (deck.r_front, deck.w_front),
                  (deck.r_right, deck.w_right),
                  (deck.w_left, deck.w_front), (deck.w_front, deck.w_right)]:
        c.line(a, bb, "K")
    # --- a low K railing around the deck's two FRONT edges (posts + a thin top rail) ---
    rail_h = 3
    def rail(p0, p1, n):
        for k in range(n + 1):
            t = k / n
            x = int(round(p0[0] + t * (p1[0] - p0[0])))
            y = int(round(p0[1] + t * (p1[1] - p0[1])))
            if k % 2 == 0:
                c.line((x, y - rail_h), (x, y - 1), "K")        # vertical post
            c.set(x, y - rail_h, "M")                            # top-rail node
    rail(deck.r_left, deck.r_front, 4)
    rail(deck.r_front, deck.r_right, 4)
    c.line((deck.r_left[0], deck.r_left[1] - rail_h), (deck.r_front[0], deck.r_front[1] - rail_h), "M")
    c.line((deck.r_front[0], deck.r_front[1] - rail_h), (deck.r_right[0], deck.r_right[1] - rail_h), "D")
    # --- STEVENSON SCREEN: a louvered white weather box standing on the deck's FRONT-
    #     LEFT (where there is clear vertical air below the cabin overhang), so it reads
    #     as a distinct bright slatted enclosure against the open trestle. Stands ~6px. ---
    sp = deck.roof_pt(0.22, 0.30)
    sx, sy = int(round(sp[0])), int(round(sp[1]))
    screen = Box(top=(sx, sy - 6), wx=2, wy=2, h=5)
    screen.draw(c, roof="W", lwall="L", rwall="M", roof_hi="W", outline="K")
    # louvered slat lines on both visible faces (the double-louvered white screen walls)
    screen.louver(c, "left", 0.16, 0.84, 0.9, 4.4, body="L", slat="D", edge="W")
    screen.louver(c, "right", 0.16, 0.84, 0.9, 4.4, body="M", slat="d", edge="L")
    # short legs lifting the screen off the deck (the classic Stevenson-screen stand)
    c.set(int(round(screen.w_left[0])), int(round(screen.w_left[1]) + 1), "K")
    c.set(int(round(screen.w_front[0])), int(round(screen.w_front[1]) + 1), "K")
    # a tiny c sensor glint reading at the screen vent
    c.set(int(round(screen.left_pt(0.5, 2.2)[0])), int(round(screen.left_pt(0.5, 2.2)[1])), "c")


def _sounding_balloon_geom(b):
    """Shared sounding-balloon geometry so t5's 'twin balloons' recompute the t4
    balloon from the SAME source (never a hardcoded second guess). The whole sounding
    rig lives in the CLEAR RIGHT MARGIN (x>=55 is open top-to-bottom, the forecast
    billboard blocks x42..54) so the tether never crosses the screen: a winch drum sits
    low-right, a taut tether rises straight up the open margin, the balloon floats upper-
    right, and the radiosonde pod hangs beneath it in open sky. Returns the winch anchor,
    the balloon centre + radius, and the slung-pod point."""
    wx, wy = 55, 41                 # winch drum low in the clear right margin
    bcx, bcy, R = 55, 13, 6         # the new sounding balloon, high in the open margin
    podx, pody = bcx + 1, bcy + R + 5   # radiosonde pod slung beneath, in clear sky
    return (wx, wy), (bcx, bcy, R), (podx, pody)


def stage4_sounding_balloon(c, b):
    """t4 — MAJOR ADD: the post now launches UPPER-AIR SOUNDINGS — a large L/W SOUNDING
    BALLOON rises in the open upper-RIGHT sky (clear of the signature balloon at upper-
    LEFT) on a taut energized-teal e tether that reels off a b WINCH DRUM mounted on the
    t3 instrument deck, with a glowing e RADIOSONDE pod slung beneath the balloon. The
    prominent new mass: 'this post now flies radiosondes'. Palette matures — deep basalt
    b winch + energized e/E tether & sonde glow. Fully on-canvas; the balloon sits to the
    upper-RIGHT so it never collides with the hero balloon or the forecast ribbon."""
    (wx, wy), (bcx, bcy, R), (podx, pody) = _sounding_balloon_geom(b)
    # --- a short K BRACKET ARM cantilevering RIGHT off the right leg out to the winch,
    #     so the winch reads as mounted ON the structure (not floating in the margin) ---
    rleg_x = 45                                              # near the right leg run
    c.line((rleg_x, wy + 1), (wx - 2, wy + 1), "D")          # outrigger arm
    c.line((rleg_x, wy + 2), (wx - 2, wy + 2), "K")          # arm under-shadow
    c.set(rleg_x, wy + 1, "K")
    # --- b WINCH DRUM on the outrigger: a small basalt drum with a K axle + e cable spool ---
    c.fill_poly([(wx - 2, wy - 1), (wx + 2, wy - 1), (wx + 2, wy + 2), (wx - 2, wy + 2)], "b")
    c.line((wx - 2, wy - 1), (wx + 2, wy - 1), "D")          # lit top of the drum
    for a, bb in [((wx - 2, wy - 1), (wx + 2, wy - 1)), ((wx - 2, wy + 2), (wx + 2, wy + 2)),
                  ((wx - 2, wy - 1), (wx - 2, wy + 2)), ((wx + 2, wy - 1), (wx + 2, wy + 2))]:
        c.line(a, bb, "K")
    c.set(wx, wy, "K")                                        # axle hub
    c.set(wx - 1, wy, "e"); c.set(wx + 1, wy + 1, "e")        # spooled glowing cable hints
    # --- taut e TETHER rising STRAIGHT UP the clear right margin from the winch to the
    #     balloon neck (the sounding line) — never crosses the forecast billboard ---
    neck = (bcx, bcy + R + 1)
    c.line((wx, wy - 1), neck, "e")                           # bright energized tether
    c.set(wx, wy - 1, "K")                                    # kink at the drum
    for ty in range(neck[1] + 3, wy - 2, 5):                 # E sparkle ticks up the line
        c.set(wx, ty, "E")
    # --- the SOUNDING BALLOON: a round L/W envelope, brighter than the hero balloon's
    #     warm body so the two read as distinct; h/c highlight upper-left ---
    for yy in range(-R, R + 1):
        for xx in range(-R, R + 1):
            if xx * xx + yy * yy <= R * R:
                if xx + yy < -4:
                    fill = "W"
                elif xx + yy < 1:
                    fill = "L"
                elif xx + yy < 5:
                    fill = "M"
                else:
                    fill = "D"
                c.set(bcx + xx, bcy + yy, fill)
    for (dx, dy, ch) in [(-3, -3, "h"), (-2, -3, "h"), (-3, -2, "c"), (-2, -2, "W")]:
        c.set(bcx + dx, bcy + dy, ch)
    # K silhouette rim
    for a in range(0, 360, 8):
        x = bcx + (R + 0.5) * math.cos(math.radians(a))
        y = bcy + (R + 0.5) * math.sin(math.radians(a))
        c.set(int(round(x)), int(round(y)), "K")
    # balloon neck pinching to the tether
    c.set(bcx, bcy + R, "K"); c.set(bcx, bcy + R + 1, "e")
    c.set(bcx - 1, bcy + R + 1, "K"); c.set(bcx + 1, bcy + R + 1, "K")
    # --- glowing e RADIOSONDE pod slung beneath the balloon on a clean line ---
    c.set(podx, pody - 2, "K")                                # tie at the pod top
    c.line((bcx, bcy + R + 2), (podx, pody - 2), "G")         # suspension line (shaded teal)
    for j in range(3):                                        # the pod: a 3x3 glowing capsule
        for i in range(-1, 2):
            c.set(podx + i, pody + j, "e" if i <= 0 else "G")
    for i in range(-2, 3):
        c.set(podx + i, pody - 1, "K"); c.set(podx + i, pody + 3, "K")
    for j in range(-1, 4):
        c.set(podx - 2, pody + j, "K"); c.set(podx + 2, pody + j, "K")
    c.set(podx, pody + 1, "E")                                # bright sonde sensor core
    c.set(podx, pody + 4, "O")                                # one blinking telemetry light
    c.set(podx, pody + 5, "K")


def stage5_weather_map(c, b):
    """t5 — CROWNING FEATURE = FULLY EVOLVED upper-air station. The plain forecast
    screen on the cabin's right face is upgraded into a glowing SYNOPTIC WEATHER-MAP
    WALL — an E isobar/front map with pulsing e STORM CELLS painted over the existing
    instrument window — TWIN balloons fly aloft (the t4 sounding balloon gains a small
    companion so they read as a launched pair), and a q GOLD SUN-AND-VANE finial crowns
    the lightning rod with gold screen trim. Reads as elite, still clearly the same
    stilted weather post. Recomputes the t4 balloon from the SHARED geom for the twin."""
    # --- SYNOPTIC WEATHER-MAP WALL: paint a glowing E/e synoptic chart over the right
    #     instrument window (the forecast billboard 'powers up' into a live map). The
    #     chart is kept STRICTLY inside the window's upper body (v 2.4..5.4) so it never
    #     spills onto the cabin corner / understory. ---
    pt = b.right_pt
    u0, u1, v0, v1 = 0.16, 0.84, 2.0, 5.8
    # darkened map field FULLY covering the window glass so the base warm interior glow
    # does not peek out below the chart (energized teal field carries the bright lines)
    c.fill_poly([pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)], "G")
    # a darker lower band so the field reads as a backlit screen, not a flat fill
    c.fill_poly([pt(u0, v1 - 1.0), pt(u1, v1 - 1.0), pt(u1, v1), pt(u0, v1)], "K")
    # E isobar contour rings (the synoptic pressure lines), nested + offset, centred in-panel
    cu, cv = 0.40, 3.8
    for (rr, rry) in [(2.4, 1.2), (4.0, 2.0)]:
        ctr = pt(cu, cv)
        for a in range(0, 360, 24):
            x = ctr[0] + rr * math.cos(math.radians(a))
            y = ctr[1] + rry * math.sin(math.radians(a))
            # clamp each isobar pixel inside the panel so nothing leaks past the frame
            xi, yi = int(round(x)), int(round(y))
            lo, hi = pt(u0 + 0.02, v0 + 0.2), pt(u1 - 0.02, v1 - 0.2)
            if min(lo[0], hi[0]) <= xi <= max(lo[0], hi[0]) and min(lo[1], hi[1]) <= yi <= max(lo[1], hi[1]):
                c.set(xi, yi, "E")
    # a bright E LOW-pressure marker at the chart centre + two pulsing e storm cells in-panel
    ctr = pt(cu, cv)
    c.set(int(round(ctr[0])), int(round(ctr[1])), "E")
    c.set(int(round(ctr[0])), int(round(ctr[1])) - 1, "W")
    for (su, sv, ch) in [(0.66, 3.0, "e"), (0.70, 3.3, "E"), (0.66, 3.6, "e"),
                          (0.30, 4.4, "e"), (0.34, 4.6, "E")]:
        sp = pt(su, sv)
        c.set(int(round(sp[0])), int(round(sp[1])), ch)
    # a warm-front line of e ticks sweeping across the chart (kept inside the panel)
    c.line(pt(0.26, 4.8), pt(0.74, 4.2), "e")
    # K frame redraw so the glow stays inside the billboard
    for a, bb in [(pt(u0, v0), pt(u1, v0)), (pt(u0, v1), pt(u1, v1)),
                  (pt(u0, v0), pt(u0, v1)), (pt(u1, v0), pt(u1, v1))]:
        c.line(a, bb, "K")
    # --- TWIN balloon aloft: a small companion balloon up-LEFT of the t4 sounding
    #     balloon (recomputed from the SHARED geom), held a clear gap apart so the pair
    #     reads as a launched flight, not one blob. Its tether stub rakes back to the
    #     sounding balloon's neck so they read as a linked twin sounding. ---
    (_w, (bcx, bcy, R), _pod) = _sounding_balloon_geom(b)
    ccx, ccy, cr = bcx - R - 4, bcy - 5, 3         # companion up-left, 1px gap to the big one
    ccx = max(cr + 1, ccx)                          # clamp on-canvas
    ccy = max(cr + 1, ccy)
    for yy in range(-cr, cr + 1):
        for xx in range(-cr, cr + 1):
            if xx * xx + yy * yy <= cr * cr:
                c.set(ccx + xx, ccy + yy, "W" if xx + yy < -1 else ("L" if xx + yy < 3 else "M"))
    for a in range(0, 360, 14):                     # K rim
        x = ccx + (cr + 0.5) * math.cos(math.radians(a))
        y = ccy + (cr + 0.5) * math.sin(math.radians(a))
        c.set(int(round(x)), int(round(y)), "K")
    c.set(ccx - 1, ccy - 1, "h")                    # highlight
    # short raking e tether linking the companion down-right to the sounding balloon neck
    c.set(ccx + 1, ccy + cr, "K")
    c.line((ccx + 1, ccy + cr + 1), (bcx - 2, bcy - 2), "e")
    # --- GOLD SUN-AND-VANE finial crowning the lightning rod (t5 flourish only) ---
    # the rod stands at the cabin apex; its teal tip was at apex y-6/-7. Recompute and
    # crown it: a small gold sun disc with rays + a gold weather-vane arrow.
    ax, ay = b.apex(0)
    rx, ry = int(round(ax)), int(round(ay))
    fy = ry - 8                                     # finial sits just above the old rod tip
    # gold sun disc (2x2 core) with four q rays — the premium forecast 'sun'
    c.set(rx, fy, "q"); c.set(rx + 1, fy, "q")
    c.set(rx, fy - 1, "O"); c.set(rx + 1, fy - 1, "O")
    c.set(rx - 1, fy, "q"); c.set(rx + 2, fy, "q")              # horizontal rays
    c.set(rx, fy - 2, "q"); c.set(rx + 1, fy + 1, "q")          # vertical rays
    c.set(rx - 1, fy - 1, "q"); c.set(rx + 2, fy + 1, "q")      # diagonal ray sparks
    # a small gold weather-VANE arrow riding just below the sun (direction pointer)
    c.set(rx - 2, fy + 3, "q"); c.set(rx - 1, fy + 3, "q"); c.set(rx, fy + 3, "q")  # vane shaft
    c.set(rx + 1, fy + 2, "O"); c.set(rx + 1, fy + 3, "q"); c.set(rx + 1, fy + 4, "O")  # arrowhead
    c.set(rx - 3, fy + 3, "q")                                  # tail feather
    # --- thin gold trim band along the billboard's TOP frame (elite screen trim, kept
    #     clear of the warm base glow at the sill so it reads clean) ---
    c.line(pt(0.16, 1.7), pt(0.84, 1.7), "q")
    c.set(int(round(pt(0.16, 1.7)[0])), int(round(pt(0.16, 1.7)[1])), "O")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the weather monitoring post at upgrade `stage` (1..5). Stage 1 is
    IDENTICAL to the shipped base PNG; each higher stage keeps every prior addition and
    bolts on the next (t2 rain-gauge/anemometer → t3 instrument deck → t4 sounding
    balloon+winch → t5 weather-map wall + twin balloon + gold finial). Painter's order
    keeps overhead additions above the masses they grow from; the hero tethered-balloon
    signature is drawn LAST so nothing occludes it."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    # painter's order: ground shadow + open stilt trestle -> perched cabin mass ->
    # hipped roof + rod -> railed deck + launch platform + stair -> RIGHT glowing
    # instrument window -> plainer left window -> tethered balloon signature on top.
    ground_shadow(c)
    feet, _tops = stilt_legs(c)
    b = cabin(c)
    roof_and_rod(c, b)
    anchor = deck_and_platform(c, b, feet)

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    # Drawn AFTER the base masses but BEFORE the right window / hero balloon, so deck
    # and sounding gear sit on the tower yet the forecast screen + signature read over
    # the structural adds. (t5 repaints the screen itself, so it runs after the window.)
    if stage >= 2:
        stage2_rain_gauge(c, b, feet)
    if stage >= 3:
        stage3_instrument_deck(c, b, feet)
    if stage >= 4:
        stage4_sounding_balloon(c, b)

    right_instrument_window(c, b)
    left_window(c, b)

    if stage >= 5:
        stage5_weather_map(c, b)

    # SIGNATURE LAST — the hero tethered balloon + forecast ribbon read over everything.
    balloon_signature(c, anchor)
    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/terrabase"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "weather-monitoring-post"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped weather-monitoring-post.png, so it does NOT overwrite the
    base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": TERRA, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"terrabase_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"terrabase_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
