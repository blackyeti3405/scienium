#!/usr/bin/env python3
"""Discovery gateway — CREATIVE mode (_t5 spectacular).

A maxed-out "clearance-5" reinterpretation of Discovery: a domed cosmic OBSERVATORY
on a faceted iso plinth, its angled TELESCOPE firing a bold energy BEAM straight up
into a swirling spiral GALAXY hologram that floats above the dome, with a satellite
dish crackling teal signal arcs. The sky-galaxy is the glowing hero — curved spiral
arms tapering h->c->g, warm O/o highlight suns strung along the arms, a bright W
core bloom, orbital rings and small planet dots.

Built with isobuild primitives (Box / dome) for crisp iso massing + hand-plotted
energy FX. GENERIC palette only — the 13 canonical chars (K W L M D d / h c g G /
o O r) — so art/recolor.py reskins it per lab type. Emits
art/src/discovery_creative_generic.json.
"""
import sys, os, json, math, random
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from iso import Canvas
from isobuild import Box, dome

PAL = {"K": "#241f38", "W": "#e2dcf0", "L": "#cdc6e2", "M": "#b0a6ca", "D": "#897ea6",
       "d": "#6f6592", "h": "#d2f7f4", "c": "#a0efea", "g": "#41d2d0", "G": "#23808b",
       "o": "#ff9243", "O": "#ffc089", "r": "#d9641f"}

# ── scene geometry ────────────────────────────────────────────────────────────
GCX, GCY = 32, 12          # galaxy core centre
SQ = 0.82                  # near face-on → the spiral arms read as curved S-strokes
MUZZLE = (32, 24)          # telescope aperture (beam origin), on the x=32 beam axis
BARREL_BASE = (37, 32)     # telescope root — seated on the dome, up-left toward sky


def ell(c, cx, cy, rx, ry, ch, step=6, a0=0, a1=360):
    """Plot an elliptical rim/arc."""
    for a in range(a0, a1, step):
        r = math.radians(a)
        c.set(cx + rx * math.cos(r), cy + ry * math.sin(r), ch)


def spark(c, x, y, core="W", arm="c", tips=False):
    """A 4-point holo-sparkle."""
    c.set(x, y, core)
    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        c.set(x + dx, y + dy, arm)
    if tips:
        for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2)):
            c.set(x + dx, y + dy, arm)


def shaded_dome(c, cx, cy, rx, ry):
    """A cleanly lit hemispherical dome. Per-pixel surface-normal (Lambert) shading
    gives a real curved ramp — a bright W/L highlight blob on the upper-left (lit) NW
    face, through M in the middle, down to D/d in the lower-right shadow — so the
    silhouette reads as a rounded dome, not a flat lumpy purple blob. Crisp K rim."""
    lx, ly, lz = -0.50, -0.60, 0.62          # light from upper-left, toward viewer
    ln = math.sqrt(lx * lx + ly * ly + lz * lz)
    lx, ly, lz = lx / ln, ly / ln, lz / ln
    for yy in range(-int(round(ry)), 1):
        for xx in range(-int(round(rx)), int(round(rx)) + 1):
            u, v = xx / rx, yy / ry
            d2 = u * u + v * v
            if d2 > 1.0:
                continue
            nz = math.sqrt(1.0 - d2)
            b = u * lx + v * ly + nz * lz        # Lambert brightness
            col = ("W" if b > 0.82 else "L" if b > 0.54 else
                   "M" if b > 0.24 else "D" if b > -0.10 else "d")
            c.set(cx + xx, cy + yy, col)
    for a in range(180, 361, 2):                  # crisp curved silhouette rim
        c.set(cx + rx * math.cos(math.radians(a)), cy + ry * math.sin(math.radians(a)), "K")


# ── the galaxy hologram (the hero) ────────────────────────────────────────────
def _planet(c, cx, cy, rx, deg, glint="W"):
    """A detached teal planet dot sitting on a short faint orbit-arc (not a full
    ring, which would re-read as a symmetric lens). rx = orbit radius; deg = angle."""
    ry = rx * 0.42                                   # flat, tilted orbit
    for da in range(-30, 31, 6):                     # short faint orbit trace
        r = math.radians(deg + da)
        c.set(cx + rx * math.cos(r), cy + ry * math.sin(r), "g")
    r = math.radians(deg)
    px, py = cx + rx * math.cos(r), cy + ry * math.sin(r)
    c.set(px, py, "c"); c.set(px - 1, py, "h"); c.set(px, py - 1, glint)


def galaxy(c):
    rnd = random.Random(7)
    cx, cy = GCX, GCY
    ARMS = 2                       # two point-symmetric arms → a clear pinwheel swirl

    # 1) detached PLANET dots on faint orbit arcs, out in the arm-gaps (drawn behind
    #    the arms so the bright arms overlap cleanly where they cross).
    _planet(c, cx, cy, 15, 205, "W")     # upper-left gap
    _planet(c, cx, cy, 17, 28, "h")      # right gap
    _planet(c, cx, cy, 12, 305, "W")     # upper-right, closer in
    _planet(c, cx, cy, 13, 118, "h")     # lower-left

    # 2) curved spiral ARMS — an open log-spiral so the swirl reads as rotation, not
    #    a filled gem. Thin (mostly 1px), tapering h→c→g outward, with clear negative
    #    space between the two arms. Warm o/O nebula knots strung ON each arm.
    for arm in range(ARMS):
        ph = arm * math.pi + 0.45
        prev = None
        knot_at = 4.2 + arm * 2.6                    # stagger knots between arms
        th = 0.0
        while th <= 8.0:
            r = 2.5 * math.exp(0.206 * th)           # winds ≈1.3 turns → a clear pinwheel
            a = th + ph
            x = cx + r * math.cos(a)
            y = cy + SQ * r * math.sin(a)
            col = "h" if r < 4.2 else "c" if r < 9.5 else "g"
            if prev is not None:
                c.line(prev, (x, y), col)
                if r < 5.0:                          # thicken only the bright inner hub
                    dx, dy = x - prev[0], y - prev[1]
                    L = math.hypot(dx, dy) or 1.0
                    ox, oy = -dy / L, dx / L
                    c.line((prev[0] + ox, prev[1] + oy), (x + ox, y + oy), col)
            if 4.5 < r < 11.0 and abs(th - knot_at) < 0.11:   # one warm nebula knot
                c.set(x, y, "O"); c.set(x, y - 1, "o"); c.set(x - 1, y, "o")
            prev = (x, y)
            th += 0.13

    # 3) bright round CORE BLOOM last — a compact W centre fading h→c, dead-centred
    #    on the x=32 beam axis so the shaft spears it through the middle.
    for yy in range(-3, 4):
        for xx in range(-5, 6):
            d = (xx / 4.8) ** 2 + (yy / 2.7) ** 2
            if d <= 1.0:
                ch = "W" if d < 0.2 else "h" if d < 0.52 else "c"
                if ch == "c" and rnd.random() < 0.3:
                    continue                        # feather the outer edge
                c.set(cx + xx, cy + yy, ch)
    # a thin mid-teal g halo hugging the core's upper-left → the W/h bulge pops as a
    # bright galactic centre (kept OFF the beam axis below, so no symmetric "face")
    for dx, dy in ((-5, -1), (-5, 0), (-4, -2), (4, -2), (5, -1), (5, 0), (-4, 2)):
        if c.px[cy + dy][cx + dx] == ".":
            c.set(cx + dx, cy + dy, "g")

    # 4) extra spiral-arm STAR points at varying brightness, trailing off the arm
    #    tips → biases the read from a symmetric 'atom' toward a swirling 'galaxy'.
    for sx, sy, sc in ((22, 8, "c"), (25, 5, "h"), (41, 8, "W"), (43, 6, "c"),
                       (19, 13, "h"), (45, 15, "c"), (28, 3, "W"), (39, 18, "h"),
                       (17, 10, "c"), (46, 11, "h"), (21, 17, "c"), (37, 20, "W")):
        if 0 <= sy < c.h and 0 <= sx < c.w and c.px[sy][sx] == ".":
            c.set(sx, sy, sc)


# ── the sparkle field ─────────────────────────────────────────────────────────
def sparkles(c):
    """A dense, wide holo-particle field filling the sky around the galaxy — the
    thing that sells scale/drama in the _t5 refs. ~22 sparkles spread wide and high,
    mixed sizes, teal with a few warm o embers. Seeded → reproducible."""
    rnd = random.Random(19)
    placed = 0
    tries = 0
    while placed < 26 and tries < 500:
        tries += 1
        x = rnd.randint(7, 57)
        y = rnd.randint(2, 25)
        # keep the field OUT of the bright core so it stays legible
        if abs(x - GCX) < 6 and abs(y - GCY) < 4:
            continue
        # bias density toward the upper sky so it reads busy/high like the refs
        if y > 20 and rnd.random() < 0.5:
            continue
        core = "h" if rnd.random() < 0.55 else "c"
        roll = rnd.random()
        if roll < 0.18:                              # a few warm embers
            c.set(x, y, "o")
            if rnd.random() < 0.5:
                c.set(x, y - 1, "O")
        elif roll < 0.55:                            # single-pixel star
            c.set(x, y, core)
        else:                                        # 4-point twinkle
            spark(c, x, y, core=("W" if rnd.random() < 0.4 else "h"), arm=core)
        placed += 1


# ── the energy beam ───────────────────────────────────────────────────────────
def beam(c):
    """One bold, UNBROKEN glowing shaft: bright W/h core flanked by c, rising from the
    muzzle straight up INTO the galaxy core. The muzzle and the bloom share the x=32
    axis so the column runs continuously and visibly spears the galaxy dead-centre —
    this is the hero light-beam, so it is the dominant vertical element."""
    mx, my = MUZZLE                    # (32, 24) — on the x=32 core axis
    ey = GCY + 1                       # run right up into the bloom (which covers the top)
    for y in range(ey, my + 1):
        c.set(mx - 3, y, "g"); c.set(mx + 3, y, "g")     # deep-teal outer body → width
        c.set(mx - 2, y, "c"); c.set(mx + 2, y, "c")     # saturated cyan flanks
        c.set(mx - 1, y, "h"); c.set(mx + 1, y, "h")     # bright inner flanks
        c.set(mx, y, "W")                                # white-hot core
    # a bright bloom where the shaft erupts from the muzzle (teal, not smoky)
    c.set(mx, my, "W"); c.set(mx, my + 1, "h")
    c.set(mx - 1, my + 1, "c"); c.set(mx + 1, my + 1, "c")
    c.set(mx - 2, my, "c"); c.set(mx + 2, my, "c")
    # a few W/c sparkles trailing off the shaft → richer particle wash (per _t5)
    for sx, sy, sc in ((mx - 5, 19, "c"), (mx + 5, 21, "h"), (mx - 4, 16, "W"),
                       (mx + 4, 17, "c"), (mx - 6, 22, "h"), (mx + 6, 19, "c")):
        if 0 <= sy < c.h and 0 <= sx < c.w and c.px[sy][sx] == ".":
            c.set(sx, sy, sc)


# ── the telescope ─────────────────────────────────────────────────────────────
def thick_barrel(c, p0, p1, half, lit, mid, dark, edge, top_hi):
    """A solid angled tube from p0 (root) to p1 (muzzle). BOTH long edges get a crisp
    `edge` (K) outline so it reads as a distinct tube against the dome; a bright
    `top_hi` highlight runs just inside the sky edge, dark `dark` on the ground side."""
    x0, y0 = p0; x1, y1 = p1
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy)
    ux, uy = dx / L, dy / L
    px, py = -uy, ux                    # perpendicular (sky side is +s here)
    n = int(L) + 1
    for i in range(n + 1):
        t = i / n
        cx, cy = x0 + dx * t, y0 + dy * t
        for s in range(-half, half + 1):
            frac = s / half
            col = lit if frac > 0.2 else (mid if frac > -0.4 else dark)
            c.set(cx + px * s, cy + py * s, col)

    def edge_line(off, ch):
        c.line((x0 + px * off, y0 + py * off), (x1 + px * off, y1 + py * off), ch)

    edge_line(half, edge)               # sky-side K outline
    edge_line(half - 1, top_hi)         # bright highlight just inside it
    edge_line(-half, edge)              # ground-side K outline
    # base cap + one subtle band ring so it reads as a tube (not a slab)
    c.line((x0 + px * half, y0 + py * half), (x0 - px * half, y0 - py * half), edge)
    bx, by = x0 + dx * 0.5, y0 + dy * 0.5
    c.line((bx + px * (half - 1), by + py * (half - 1)),
           (bx - px * half, by - py * half), edge)


def telescope(c):
    base = BARREL_BASE
    mx, my = MUZZLE
    # a SHORT angled barrel SEATED ON the dome (not a tall vertical chimney): a clean
    # K-outlined L/M/D tube tilted up toward the galaxy, firing the beam from its lens.
    thick_barrel(c, base, (mx, my), half=2, lit="L", mid="M", dark="D",
                 edge="K", top_hi="W")
    # seat it on the dome roof with a short K saddle so it grounds on the building
    c.set(base[0] - 1, base[1] + 1, "K"); c.set(base[0], base[1] + 1, "d")
    c.set(base[0] + 1, base[1] + 1, "K")
    # muzzle LENS — a small K-rimmed teal eye the beam erupts from (the light source),
    # NOT an orange smoke ring
    ell(c, mx, my, 2.3, 1.5, "K", step=16)
    c.set(mx, my, "W"); c.set(mx - 1, my, "h"); c.set(mx + 1, my, "h")
    c.set(mx, my - 1, "h"); c.set(mx, my + 1, "c")


# ── the satellite dish ────────────────────────────────────────────────────────
def _arc(c, cx, cy, rad, ch, a0, a1, step=6):
    """A CONTINUOUS arc: consecutive points joined with lines (not isolated dots)."""
    prev = None
    for a in range(a0, a1 + 1, step):
        rr = math.radians(a)
        p = (cx + rad * math.cos(rr), cy + rad * math.sin(rr))
        if prev is not None:
            c.line(prev, p, ch)
        prev = p


def dish(c):
    dcx, dcy, TILT = 48, 27, 0.30
    rx, ry = 5.0, 3.6
    # ── mounting ARM: a solid 2px K-outlined pylon planting the dish on the dome's
    #    right shoulder (roofline ~y=38) with a lit L/M face between crisp K edges, so
    #    the dish reads as BOLTED to the building instead of floating loose.
    c.fill_poly([(45, 38), (47, 38), (49, 31), (47, 31)], "M")   # strut body
    c.line((46, 38), (48, 31), "L")                              # lit centre stripe
    c.line((45, 38), (47, 31), "K")                              # left edge outline
    c.line((47, 38), (49, 31), "K")                              # right edge outline
    c.set(44, 38, "K"); c.set(45, 39, "K")                       # foot on the dome
    c.set(48, 31, "d"); c.set(49, 31, "d")                       # shaded top under cup
    # a teal ENERGY dish: bright sky-facing rim (W/h) over a CONCAVE teal-glass cup
    # (c/g interior, G in the shade) — reads as an antenna dish, not a lavender spoon
    for yy in range(-int(ry) - 1, int(ry) + 2):
        for xx in range(-int(rx) - 1, int(rx) + 2):
            d = (xx / rx) ** 2 + (yy / ry) ** 2
            if d <= 1.0:
                yv = dcy + yy + xx * TILT
                if d > 0.64:                                   # bright rim band
                    col = "W" if (xx + yy) < -2 else "h" if xx < 1 else "G"
                else:                                          # concave teal glass
                    col = "c" if xx < -1 else "g" if xx < 2 else "G"
                c.set(dcx + xx, yv, col)
    for a in range(0, 360, 6):                       # crisp K silhouette rim
        rr = math.radians(a); ox = rx * math.cos(rr); oy = ry * math.sin(rr)
        c.set(dcx + ox, dcy + oy + ox * TILT, "K")
    for a in range(205, 335, 6):                     # bright h rim on the sky-facing top
        rr = math.radians(a); ox = (rx - 1) * math.cos(rr); oy = (ry - 1) * math.sin(rr)
        c.set(dcx + ox, dcy + oy + ox * TILT, "h")
    # feed horn on a short K strut at the focus, bright teal emitter tip
    fx, fy = dcx + 3, dcy - 4
    c.line((dcx + 1, dcy - 1), (fx, fy), "K")
    c.set(fx, fy, "h"); c.set(fx, fy - 1, "o")       # warm-lit power stud over teal horn
    # ── crackling SIGNAL ARCS: bold, on-canvas, double-struck c arcs (h inner rings)
    #    fanning up-right off the emitter so the dish visibly BROADCASTS.
    ex, ey = fx + 1, fy                              # emission point (52, 23)
    c.set(ex, ey, "c"); c.set(ex + 1, ey - 1, "h")   # crackle root at the horn mouth
    for k, rad in enumerate((2.6, 4.0, 5.4)):
        col = ("h", "c", "c")[k]
        _arc(c, ex, ey, rad, col, 288, 352)
        _arc(c, ex, ey, rad + 0.8, col, 296, 344)    # second strike → it crackles
    # a couple of bright c spark tips flung off the outer arc
    c.set(58, 20, "c"); c.set(57, 17, "h"); c.set(55, 16, "c")


# ── the observatory (crisp iso massing) ───────────────────────────────────────
def arched_door(c, box, u0, u1, v0, v1):
    """A warm-lit arched entrance on the lit (left) face — reads as a DOOR."""
    pt = box.left_pt
    um = (u0 + u1) / 2
    c.fill_poly([pt(u0, v0 + 1), pt(u1, v0 + 1), pt(u1, v1), pt(u0, v1)], "o")
    c.line(pt(um, v0 + 1), pt(um, v1), "O")           # bright interior glow
    c.line(pt(u0 + 0.03, v0 + 1), pt(u1 - 0.03, v0 + 1), "O")   # warm lintel
    for a, b in [(pt(u0, v0 + 1), pt(u1, v0 + 1)), (pt(u0, v1), pt(u1, v1)),
                 (pt(u0, v0 + 1), pt(u0, v1)), (pt(u1, v0 + 1), pt(u1, v1))]:
        c.line(a, b, "K")
    c.line(pt(u0 + 0.06, v0), pt(u1 - 0.06, v0), "K")  # arched top


def observatory(c):
    # ground-shadow oval
    for yy in range(-3, 4):
        for xx in range(-19, 20):
            if (xx / 19.0) ** 2 + (yy / 3.2) ** 2 <= 1.0:
                c.set(32 + xx, 59 + yy, "K")

    # faceted foundation plinth (drawn first; the drum sits on it) — kept in the
    # building's own shadow so the base grounds DARK (lit D / shade d), not pale
    Box((32, 42), 8, 8, 3).draw(c, roof="M", lwall="D", rwall="d",
                                roof_hi="L", with_shadow=False)

    # observatory drum — crisp lit-left (M) / shaded-right (D) faces, lit top rim
    drum = Box((32, 31), 7, 7, 11)
    drum.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", with_shadow=False)
    # deepen the shaded face toward the silhouette: D by the lit corner → d at the
    # back-right, so there's a real L→M→D→d ramp under the K outline (the _t5 look)
    c.fill_poly([drum.right_pt(0.45, 0), drum.r_right, drum.w_right,
                 drum.right_pt(0.45, drum.h)], "d")
    c.line(drum.r_front, drum.r_right, "K")   # re-strike the right silhouette the
    c.line(drum.r_right, drum.w_right, "K")   # d-wedge fill just painted over
    c.line(drum.w_front, drum.w_right, "K")
    # clerestory windows — asymmetric strip on the shaded face (glow), no "eyes"
    drum.window(c, "right", 0.16, 0.42, 2.0, 4.5, glass="c", hi="h", shade="G")
    drum.window(c, "right", 0.54, 0.80, 2.0, 4.5, glass="c", hi="h", shade="G")
    # deep-teal G shadow just beneath each glowing window so the cyan glow SEPARATES
    # from the dark wall and pops (like a _t5 teal core)
    c.line(drum.right_pt(0.16, 5.0), drum.right_pt(0.42, 5.0), "G")
    c.line(drum.right_pt(0.54, 5.0), drum.right_pt(0.80, 5.0), "G")
    # warm arched entrance low on the lit face — clearly a door, not a mouth/eye
    arched_door(c, drum, 0.40, 0.64, 6.0, 11.0)

    # curved dome roof — a cleanly ramped hemisphere: W/L highlight on the lit NW
    # face fading through M to D/d in the SE shadow (no more flat muddy blob)
    shaded_dome(c, 32, 39, 13, 11)
    ell(c, 32, 39, 13, 3.6, "o", step=5, a0=6, a1=175)     # thin gold rim at the dome foot
    ell(c, 32, 39, 13, 11, "W", step=8, a0=206, a1=250)    # crisp lit upper-left rim

    # ── surface interest: rivets + a teal oculus + a warm belt (match _t5 density) ─
    # rivet studs stepping along the dome/drum junction → riveted-panel density
    for rvx in (-11, -8, 8, 11):
        ry_r = 39 - 3.0 * (1 - (rvx / 13.0) ** 2) ** 0.5
        c.set(32 + rvx, ry_r, "D"); c.set(32 + rvx, ry_r - 1, "d")
    # a small glowing teal OCULUS port high on the lit dome shoulder
    ocx, ocy = 24, 33
    for a in range(0, 360, 12):
        c.set(ocx + 2 * math.cos(math.radians(a)), ocy + 2 * math.sin(math.radians(a)), "K")
    c.set(ocx, ocy, "c"); c.set(ocx, ocy - 1, "h"); c.set(ocx - 1, ocy, "g")
    c.set(ocx + 1, ocy, "c")
    # a warm belt band around the drum shoulder (just above the clerestory windows)
    c.line(drum.left_pt(0.14, 1.4), drum.left_pt(0.92, 1.4), "o")
    c.line(drum.right_pt(0.06, 1.4), drum.right_pt(0.94, 1.4), "o")
    # a couple of D shading breaks on the shaded drum face → panel seams
    c.line(drum.right_pt(0.48, 1.0), drum.right_pt(0.48, 6.0), "D")

    # dome shutter SLIT — a SHORT clean dark aperture right where the telescope
    # pierces the dome (kept small so the curved dome stays legible), lit up-sun lip
    c.fill_poly([(34, 34), (37, 33), (36, 29), (33, 30)], "K")
    c.line((33, 30), (36, 29), "d")


def build():
    c = Canvas(64, 64)
    observatory(c)   # building massing first (galaxy floats above it)
    sparkles(c)      # wide holo-particle field filling the sky (behind the hero)
    beam(c)          # bold bright column up from the muzzle
    galaxy(c)        # swirl arms + round core bloom (covers the beam top)
    telescope(c)     # re-lay the barrel + lens over the beam base
    dish(c)          # dish + crackling arcs over the roof

    spec = {"width": 64, "height": 64, "palette": PAL, "rows": ["".join(r) for r in c.px]}
    root = os.path.join(os.path.dirname(__file__), "..", "..")
    src = os.path.join(root, "art", "src", "discovery_creative_generic.json")
    json.dump(spec, open(src, "w"))
    import subprocess
    subprocess.run(["art/.venv/bin/python3", "art/render_pixel_art.py", src,
                    "-o", "apps/web/public/sprites/gateways/discovery_creative.png",
                    "--preview", "art/preview/discovery_creative.png", "--preview-scale", "8"],
                   cwd=root, check=True)
    print("built creative discovery")


if __name__ == "__main__":
    build()
