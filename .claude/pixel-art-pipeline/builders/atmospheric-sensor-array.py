#!/usr/bin/env python3
"""
Atmospheric Sensor Array — TerraBase economy building (BESPOKE form, STANDARD role).

The ONLY "cluster of vertical cylinders" form in the set: a tight TANK-FARM of 4
tall slender gas-sampling STACKS of staggered height standing on a low wide base
block — an air-monitoring tank farm, immediately distinct from the gateway cube
and from every single-mass sibling (esp. the single ChemWorks Distillation column:
this is a CLUSTER of several stacks of different heights, not one column).

  * Base block: a low wide Box — M/D weathered-steel walls, an L deck the stacks
    stand on, an o hazard stripe along the base front. Opening = RIGHT.
  * Sampling stacks: 4 slender M/D steel cylinders rising from the deck at staggered
    heights, K o-banded collars at intervals, a thin c sight-strip up the lit-left
    of the tallest. Back stacks drawn before front stacks (painter's algorithm).
  * Opening side = RIGHT: the hero is the analyzer BAY on the SHADED RIGHT face of
    the base — a K-framed window showing a GLOWING g->c bell-jar analyzer over a
    bright o/O lit interior (reads on the dark side), h reflection, with a K-framed
    predicted-concentration DIAL whose o/O needle climbs toward a bright O forecast
    mark. The LIT-LEFT face stays plainer (one c ribbon window + a vent).

Signature (one-of-one): the stacks are crowned with a ring of upward-facing INTAKE
HORNS / sniffer-tubes that visibly inhale drifting AMBER (o/O) and TEAL (c/g) GAS
WISPS out of the air, curling them DOWN into the horns; thin D sample-lines tie the
stack tops to the right-bay analyzer. No gas-intake / sniffer-horn / bell-jar motif
exists elsewhere in the catalog.

Composed from art/isobuild.{cylinder,Box} — NO iso.draw_cube / base_windows.
Draw order: contact shadow -> base BLOCK -> BACK stacks -> FRONT stacks -> stack
collars/sight-strip -> intake-horn crown + gas wisps + met-mast blink -> the base's
RIGHT glowing analyzer opening (front).
"""
import os
import sys
import json
import math

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box, cylinder

TERRA = {"K": "#20190f", "W": "#efe6cf", "L": "#d6c8a0", "M": "#b09a6e", "D": "#7e6c47", "d": "#54462c",
         "h": "#d6f2ea", "c": "#a4e2d4", "g": "#34b6a2", "G": "#1d8474",
         "o": "#e0a850", "O": "#ffce80", "r": "#9a5e1e"}


# ── base block geometry (a low wide pad the stacks stand on) ──────────────────
BASE_BOX = Box(top=(30, 27), wx=10, wy=9, h=13)

# ── the 4 sampling stacks (varied height): (cx, top_y, rx, h, is_back) ────────
# laid out left->right; staggered tops; tallest is the 2nd. Back stacks higher on
# screen (smaller cx offset back-left) are drawn first so front ones occlude them.
RX = 3
RY = 2
STACKS = [
    # (cx, top_y, h, back?)  -- top_y smaller = taller stack
    (24, 14, 22, True),    # back-left, medium
    (40, 16, 20, True),    # back-right, medium-short
    (29,  5, 30, False),   # front-left, TALLEST (the hero column w/ sight-strip)
    (37, 12, 24, False),   # front-right, tall
]


# ── contact shadow pooled under the whole footprint (drawn FIRST) ─────────────
def contact_shadow(c):
    scx, scy = 32, 55
    for x in range(scx - 17, scx + 17):
        for y in range(scy - 2, scy + 3):
            ex = (x - scx) / 17.0
            ey = (y - scy) / 2.3
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")


# ── the low wide BASE BLOCK — drawn before the stacks rise from its deck ───────
def base_block(c, b):
    """Low weathered-steel pad: M lit-left wall, D shaded-right wall, L deck. The
    stacks stand on the L deck (drawn after, occluding the back roof edge). An o
    hazard stripe rings the base front; a r grime band grounds it."""
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # weathered o HAZARD stripe along the base of both front faces
    pt_l, pt_r = b.left_pt, b.right_pt
    for u in [x / 20 for x in range(1, 20)]:
        p = pt_l(u, b.h - 1.4)
        c.set(int(round(p[0])), int(round(p[1])), "o" if int(u * 20) % 2 == 0 else "K")
    for u in [x / 20 for x in range(1, 20)]:
        p = pt_r(u, b.h - 1.4)
        c.set(int(round(p[0])), int(round(p[1])), "K" if int(u * 20) % 2 == 0 else "r")
    # a couple of sample crates on the lit-left deck (field-rig hardware)
    cp = b.roof_pt(0.22, 0.30)
    cx, cy = int(round(cp[0])), int(round(cp[1]))
    for dy, row in enumerate(["KKKK", "KMLK", "KDdK", "KKKK"]):
        for dx, ch in enumerate(row):
            if ch != ".":
                c.set(cx + dx, cy + dy, ch)
    return b


def deck_y(b, x):
    """Screen-y of the base ROOF (deck) front silhouette at screen column x — used
    to seat each stack foot ON the deck rather than punching through the front."""
    lf0, lf1 = b.r_left, b.r_front
    rf0, rf1 = b.r_front, b.r_right
    if x <= b.r_front[0]:
        a, bb = lf0, lf1
    else:
        a, bb = rf1, rf0
    if bb[0] == a[0]:
        return max(a[1], bb[1])
    t = (x - a[0]) / (bb[0] - a[0])
    t = max(0.0, min(1.0, t))
    return a[1] + t * (bb[1] - a[1])


# ── one slender ROUND steel sampling stack ────────────────────────────────────
def stack(c, cx, top_y, h, tallest=False):
    """A slim M/D steel cylinder with ROUND cross-section shading (bright lit band
    just left of centre fading to deep d far-right), a W rim glint on the top
    ellipse, K o-banded collars at intervals, and (on the tallest) a thin c
    sight-strip up the lit-left. The foot is clipped to the base deck."""
    base_y = top_y + h
    cylinder(c, cx, top_y, RX, h, top="L", side_l="M", side_r="D", outline="K", ry=RY)

    # ROUND steel shading ramp across the body (no full-height teal column — the
    # tallest's sight-line is a SHORT broken c segment painted after, not a stripe)
    SGT = -2              # single sight-strip col (lit-left) for the tallest
    for col in range(-RX, RX + 1):
        t = 1 - (col / RX) ** 2
        if t < 0:
            continue
        edge = RY * (t ** 0.5)
        y0 = int(top_y + edge)
        if col == -RX:
            ch = "M"                      # lit rim
        elif col == -1:
            ch = "L"                      # bright steel highlight band
        elif col <= 0:
            ch = "M"
        elif col == 1:
            ch = "D"
        elif col == 2:
            ch = "D"
        else:
            ch = "d"                      # deep shaded far-right
        x = cx + col
        for y in range(y0, base_y + 1):
            c.set(x, y, ch)

    # bright W rim glint along the back-upper arc of the top ellipse
    for a in range(186, 360, 6):
        x = cx + RX * math.cos(math.radians(a))
        y = top_y + RY * math.sin(math.radians(a))
        c.set(x, y, "W")

    # a SHORT broken c sight-line (sensor sight, NOT a flowing column) on the
    # tallest's lit-left: a thin K guide rail with a few c tick segments only in
    # the upper third, so it reads as an instrument sight-line not gushing liquid.
    if tallest:
        gx = cx + SGT
        gy0 = top_y + 4
        gy1 = top_y + h // 2          # only the upper portion — never full height
        for y in range(gy0, gy1 + 1):
            c.set(gx - 1, y, "K")     # thin guide rail
        for y in range(gy0 + 1, gy1, 3):
            c.set(gx, y, "c")         # broken teal sight ticks
            c.set(gx, y + 1, "g")

    # K o-banded COLLARS at intervals (weatherproof field hardware)
    for cy in range(top_y + 6, base_y - 2, 7):
        for col in range(-RX, RX + 1):
            t = 1 - (col / RX) ** 2
            if t < 0:
                continue
            x = cx + col
            yy = cy + int((1 - t) * 1.2)
            c.set(x, yy, "K")
            # a thin o band just under the K collar (warm banding)
            if c.px[yy + 1][x] in ("M", "D", "L", "d"):
                c.set(x, yy + 1, "o" if col <= 0 else "r")
    return (cx, top_y, base_y)


# ── INTAKE HORN crowning a stack top (signature crown element) ────────────────
def intake_horn(c, cx, top_y):
    """A wide flared sniffer-TRUMPET on a stack top, mouth UP. A D/M bell that
    flares OUT as it rises off a narrow neck into a broad OPEN cup: bright L
    lit-left rim, K outline, and a clearly DARK open throat hollow at the centre,
    plus a faint K/G 'swallow' shadow just under the front rim — so descending gas
    visibly disappears INTO the horn. Reads as an upward funnel, not a flat cap."""
    ty = top_y          # neck sits at the stack top
    # narrow NECK (2px) rising off the stack top
    for dy in (0, -1):
        c.set(cx - 1, ty + dy, "M"); c.set(cx, ty + dy, "M"); c.set(cx + 1, ty + dy, "D")
    # bell flares OUT as it rises (mid flare row, wider than the neck)
    fy = ty - 2
    c.set(cx - 3, fy, "K"); c.set(cx - 2, fy, "M"); c.set(cx - 1, fy, "L")
    c.set(cx, fy, "M"); c.set(cx + 1, fy, "D"); c.set(cx + 2, fy, "d"); c.set(cx + 3, fy, "K")
    # MOUTH RIM (widest, 7px): a clearly OPEN cup. bright lit-left, K corners.
    my = ty - 3
    c.set(cx - 4, my, "K"); c.set(cx - 3, my, "L"); c.set(cx - 2, my, "L")
    c.set(cx - 1, my, "M"); c.set(cx, my, "M"); c.set(cx + 1, my, "D")
    c.set(cx + 2, my, "d"); c.set(cx + 3, my, "K")
    # the open THROAT hollow inside the rim — a dark cup so descending gas dives IN
    c.set(cx - 2, my + 1, "K"); c.set(cx - 1, my + 1, "d")
    c.set(cx, my + 1, "K"); c.set(cx + 1, my + 1, "K")
    # sharper 'SWALLOW' shadow just under the front rim — a 2px K core with a G
    # fringe, so a descending wisp visibly DISAPPEARS into the dark throat (round-1
    # polish: make the inhale unmistakable at sprite scale).
    c.set(cx - 1, my + 2, "K"); c.set(cx, my + 2, "K"); c.set(cx + 1, my + 2, "G")
    return (cx, my)   # mouth centre (where wisps get inhaled)


# ── a drifting GAS WISP curling over and DOWN into a horn mouth (inhaled) ──────
def gas_wisp(c, mx, my, amber=True, side=1):
    """A short COMMA-shaped curl of drifting gas being INHALED into the horn. The
    TAIL starts out & slightly UP in the open air (faint, light), the curl arcs
    over the rim, then the HEAD dives DOWN-and-INWARD the last few px straight into
    the throat (dense body) — the descending head pointing into the mouth is the
    'being sucked in' cue. Kept LOW and tight to the mouth: no tall upward arcs.
    Amber = o/O, teal = c/g. `side` swings each curl so neighbours read distinct."""
    body, lite = ("o", "O") if amber else ("g", "c")
    # COMMA curl: a faint tail hangs OUT in the air to the side, the curl arcs IN
    # over the rim, then the dense head PLUNGES straight DOWN through the rim into
    # the dark throat (the last px land AT/BELOW the mouth) — unmistakably inhaled.
    path = [
        (side * 4, -2, lite),   # faint tail out in the air to the side
        (side * 3, -2, lite),
        (side * 2, -2, lite),   # arcing inward toward the mouth
        (side * 1, -2, body),   # curl thickens above the throat
        (side * 1, -1, body),   # cresting right over the open mouth
        (0,  0, body),          # HEAD entering the rim...
        (0,  1, body),          # ...plunging DOWN into the dark throat = inhaled
    ]
    for dx, dy, ch in path:
        x, y = mx + dx, my + dy
        if 1 <= y < 64 and 0 <= x < 64:   # keep wisps off the very top frame row
            # the two diving-head px may overwrite the dark throat (so gas visibly
            # enters the mouth); the rest only paints empty air.
            if c.px[y][x] in (".",) or (dy >= 0 and c.px[y][x] in ("K", "d", "G")):
                c.set(x, y, ch)


# ── sample-lines tying stack tops back to the analyzer bay ────────────────────
def sample_lines(c, tops, b):
    """Thin D sample tubes running from a couple of stack tops down toward the
    right analyzer bay — the collected air is piped to the analyzer."""
    # anchor near the top of the shaded right face of the base
    anchor = b.right_pt(0.30, 1.2)
    ax, ay = int(round(anchor[0])), int(round(anchor[1]))
    for (cx, top_y, _base_y) in tops[2:]:   # from the two front stacks
        x0, y0 = cx + 1, top_y + 1
        c.line((x0, y0), (ax, ay), "d")
        c.set(x0, y0, "D")


# ── met-mast with a c blink beacon on the back deck corner ────────────────────
def met_mast(c, b):
    """A thin D met-mast on the back-LEFT deck corner crowned by a c blink beacon
    (NO anemometer — just a blink). A weatherproof antenna motif."""
    mp = b.roof_pt(0.18, 0.78)
    mx, my = int(round(mp[0])), int(round(mp[1]))
    top = my - 13
    c.line((mx, my), (mx, top), "D")
    c.set(mx - 1, my - 1, "M")           # lit edge
    # K rungs
    for ry in (my - 4, my - 8):
        c.set(mx - 1, ry, "K"); c.set(mx + 1, ry, "K")
    # c blink beacon at the top + a faint h halo
    c.set(mx, top, "c")
    c.set(mx, top - 1, "h")
    c.set(mx - 1, top, "g"); c.set(mx + 1, top, "g")


# ── the GLOWING analyzer opening on the base's SHADED RIGHT face (hero) ────────
def right_analyzer(c, b):
    """The hero: a K-framed analyzer BAY on the base block's SHADED RIGHT face,
    made to GLOW — a g->c GLASS BELL-JAR over a bright o/O lit interior so it
    reads on the dark side, h reflection. Beside it a K-framed predicted-
    concentration DIAL with an o/O needle climbing toward a bright O forecast
    threshold mark + a tiny g ppm readout."""
    pt = b.right_pt

    # --- the analyzer WINDOW: a clean K-framed bay glowing with a lit interior, on
    # the LEFT half of the (now taller) shaded face; the dial sits on the right half.
    wu0, wu1, wv0, wv1 = 0.05, 0.46, 2.0, b.h - 1.0
    c.fill_poly([pt(wu0, wv0), pt(wu1, wv0), pt(wu1, wv1), pt(wu0, wv1)], "o")      # lit interior wash
    # bright O hot core down the inner-left of the bay (the lamp behind the jar)
    c.fill_poly([pt(wu0 + 0.05, wv0 + 0.6), pt(wu0 + 0.22, wv0 + 0.6),
                 pt(wu0 + 0.22, wv1 - 0.8), pt(wu0 + 0.05, wv1 - 0.8)], "O")
    # deeper r shadow at the lower-right inner corner for depth
    c.fill_poly([pt(wu1 - 0.12, wv0 + 2.2), pt(wu1, wv0 + 2.2),
                 pt(wu1, wv1), pt(wu1 - 0.12, wv1)], "r")

    # the GLASS BELL-JAR standing in the bay (the right-face HERO): a clear rounded
    # dome (c glass, h lit-left glint) over a glowing G/g analyte puck, with an o/c
    # collected-gas swirl tinting the inside — sits proud against the O lamp glow.
    bj = pt(0.26, wv1 - 0.3)
    bx, by = int(round(bj[0])), int(round(bj[1]))
    # rounded dome silhouette: K-ringed so the jar reads as a distinct object that
    # sits PROUD of the O lamp glow behind it — domed crown, h glint, glass body,
    # collected amber gas inside, glowing analyte near the floor.
    dome = [
        ".KKK.",    # rounded crown (K)
        "KhhcK",    # bright lit-left glint under the crown
        "KcccK",    # glass body
        "KcooK",    # collected amber gas swirling inside
        "KccgK",    # teal analyte tint near the floor
    ]
    for j, row in enumerate(dome):
        for i, ch in enumerate(row):
            if ch != ".":
                xx, yy = bx - 2 + i, by - 6 + j
                if 0 <= xx < 64 and 0 <= yy < 64:
                    c.set(xx, yy, ch)
    # glowing analyte puck on the jar floor (G core w/ a g halo) + K base seal
    c.set(bx - 2, by, "K"); c.set(bx - 1, by, "G"); c.set(bx, by, "g")
    c.set(bx + 1, by, "G"); c.set(bx + 2, by, "K")

    # clean K window FRAME + an h reflection streak down the lit-left jamb
    for a, b2 in [(pt(wu0, wv0), pt(wu1, wv0)), (pt(wu0, wv1), pt(wu1, wv1)),
                  (pt(wu0, wv0), pt(wu0, wv1)), (pt(wu1, wv0), pt(wu1, wv1))]:
        c.line(a, b2, "K")
    c.line(pt(wu0 + 0.08, wv0 + 1.0), pt(wu0 + 0.08, wv1 - 1.5), "h")

    # --- the predicted-concentration DIAL on the RIGHT half of the shaded face ---
    # A clear K-framed GAUGE: a dark face with a bold o/O NEEDLE swinging up from a
    # bottom-left pivot toward a bright O forecast-threshold mark in the top-right.
    dp = pt(0.62, 3.0)
    dx, dy = int(round(dp[0])), int(round(dp[1]))
    # K-framed 6x7 dial face with a dark d readout backing (reads on the shaded side)
    for j, row in enumerate(["KKKKKK", "KddddK", "KddddK", "KddddK", "KddddK", "KddddK", "KKKKKK"]):
        for i, ch in enumerate(row):
            c.set(dx + i, dy + j, ch)
    # bold diagonal NEEDLE: pivots at bottom-left, climbs up-right across the face
    c.set(dx + 1, dy + 5, "g")          # pivot hub (teal)
    c.set(dx + 2, dy + 5, "o")          # needle base
    c.set(dx + 2, dy + 4, "o")          # ...climbing
    c.set(dx + 3, dy + 3, "O")          # ...rising up-right
    c.set(dx + 4, dy + 2, "O")          # needle tip nearing the mark
    # bright O forecast-threshold tick in the top-right corner of the face
    c.set(dx + 4, dy + 1, "O")
    # a tiny g ppm readout tick row just under the dial
    c.set(dx + 1, dy + 7, "g"); c.set(dx + 2, dy + 7, "c")
    c.set(dx + 3, dy + 7, "g"); c.set(dx + 4, dy + 7, "c")

    # --- soft o glow pooling on the ground in front of the lit right face ---
    base_pt = pt(0.4, b.h)
    gx, gy = int(round(base_pt[0])), int(round(base_pt[1]))
    for ddx in range(-2, 5):
        c.set(gx + ddx, gy + 1, "o" if abs(ddx) < 3 else "r")
    c.set(gx, gy + 2, "o")


# ── plainer LIT-LEFT base detail (one c ribbon window + a vent) ────────────────
def left_detail(c, b):
    """The lit-left base face stays plainer per the blueprint — one c ribbon
    window + a small d vent grille — so the cluster + analyzer carry the interest."""
    pt = b.left_pt
    # a thin c ribbon window high on the lit face. Round-1 polish: drop the bright
    # h highlight line to c so ALL the glow weight stays on the right-bay hero — the
    # left ribbon should read as a calm sight window, not a second focal glint.
    c.fill_poly([pt(0.30, 2.4), pt(0.72, 2.4), pt(0.72, 4.0), pt(0.30, 4.0)], "K")
    c.fill_poly([pt(0.33, 2.7), pt(0.69, 2.7), pt(0.69, 3.7), pt(0.33, 3.7)], "c")
    c.line(pt(0.33, 2.9), pt(0.69, 2.9), "c")
    c.line(pt(0.50, 2.7), pt(0.50, 3.7), "K")
    # a small d vent grille lower on the lit face
    for k in range(3):
        c.line(pt(0.34, 5.2 + k * 1.2), pt(0.64, 5.2 + k * 1.2), "d")
    for u in (0.34, 0.64):
        c.line(pt(u, 4.8), pt(u, 7.0), "K")
    c.line(pt(0.34, 4.8), pt(0.64, 4.8), "D")


def build():
    c = Canvas()
    b = BASE_BOX
    contact_shadow(c)
    base_block(c, b)

    # paint stacks back->front so nearer stacks occlude farther ones
    tops = []
    order = sorted(STACKS, key=lambda s: (not s[3], s[1]))  # backs first, then taller=front-ish
    # but we need a deterministic painter order: explicitly backs then fronts
    backs = [s for s in STACKS if s[3]]
    fronts = [s for s in STACKS if not s[3]]
    drawn = []
    for (cx, top_y, h, _back) in backs:
        drawn.append((cx, top_y, h))
        tops.append(stack(c, cx, top_y, h, tallest=False))
    for (cx, top_y, h, _back) in fronts:
        tallest = (h == max(s[2] for s in STACKS))
        tops.append(stack(c, cx, top_y, h, tallest=tallest))

    # SIGNATURE crown: an intake horn on every stack top, inhaling drifting wisps
    mouths = []
    for (cx, top_y, _base_y) in tops:
        mouths.append((intake_horn(c, cx, top_y), cx))
    # met-mast blink on the back deck corner (behind the front horns is fine)
    met_mast(c, b)
    # one prominent inhaled wisp per horn (alternating amber/teal), curling DOWN
    # into the mouth; a couple also get a faint second wisp on the far side. The
    # wisp swings IN from the outboard side of each horn toward the cluster centre.
    for i, ((mx, my), cx) in enumerate(mouths):
        amber = (i % 2 == 0)
        side = -1 if cx < 33 else 1     # tail hangs to the OUTBOARD side, dives inward
        gas_wisp(c, mx, my, amber=amber, side=side)
        if i % 2 == 0:                  # a faint companion wisp on the inner side
            gas_wisp(c, mx, my, amber=not amber, side=-side)

    # sample-lines tie the front stack tops back to the analyzer bay
    sample_lines(c, tops, b)

    # the hero glowing analyzer opening on the shaded RIGHT face (front)
    right_analyzer(c, b)
    left_detail(c, b)

    spec = {"width": 64, "height": 64, "palette": TERRA, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/terrabase_atmospheric-sensor-array.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
