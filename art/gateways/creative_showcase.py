#!/usr/bin/env python3
"""
Creative gateway builder — SHOWCASE.  _t5 SPECTACULAR mode.

A grand holographic ROTUNDA GALLERY topped by a beaming BROADCAST BEACON. The
undisputed hero is a floating, glowing AWARD STAR projected high above the roof — a
faceted teal gem-star (bright W core, radial h/c/g/G gradient, crisp emissive rim)
that SHINES with four long light rays and broadcasts EXPANDING CONCENTRIC SIGNAL
RINGS (teal + one gold) rippling outward. A little gold-ringed rooftop LANTERN
cupola, seated on the dome apex, fires one continuous teal broadcast beam straight
up into the star; W sparkles + gold motes drift around it.
The body below is a TALL DOMED ROTUNDA: a round drum (isobuild.cylinder) ringed by
tall gold-framed gallery windows and a warm-lit arched entrance, wrapped by a gold
cornice band and capped by a ribbed DOME (isobuild.dome) — a round + domed
silhouette, NOT a box. Two little gold FAIR PENNANTS fly from the drum shoulders,
framing the beacon.

Palette: ONLY the 13 canonical chars (K W L M D d / h c g G / o O r) so recolor.py
works — teal glass h/c/g/G for the star + rings + glow, orange o/O/r for the beacon
tip, gold cornice/trim, pennants + signal-ring accents, W sparkles, L/M/D walls.

Composed entirely from isobuild primitives + hand-placed detail. Emits the char
grid to art/src/showcase_creative_generic.json (recolor.py reads it), renders the
native PNG to apps/web/public/sprites/gateways/showcase_creative.png and an x8
inspection preview to art/preview/showcase_creative.png.

Run:  art/.venv/bin/python3 art/gateways/creative_showcase.py
"""
from __future__ import annotations

import json
import math
import os
import sys

# make the art/ package dir importable no matter the cwd
ART_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ART_DIR not in sys.path:
    sys.path.insert(0, ART_DIR)

from PIL import Image

from canon import CANON
from iso import Canvas
from isobuild import cylinder, dome
from render_pixel_art import render

ROOT = os.path.dirname(ART_DIR)
SRC_DIR = os.path.join(ART_DIR, "src")
PREVIEW_DIR = os.path.join(ART_DIR, "preview")
GATE_DIR = os.path.join(ROOT, "apps", "web", "public", "sprites", "gateways")

KEY = "showcase_creative"
SIZE = 64

# hologram STAR centre + radii (floats high above the roof)
SX, SY = 32, 12
OR, IR = 9.0, 4.0   # outer / inner star radius

# ── ROTUNDA geometry: a tall round drum capped by a dome (NOT a box) ──
DCX = 32            # drum / dome centre column
DR = 13            # drum radius (silhouette runs x=19..45)
DRY = 3.0          # drum top-ellipse vertical radius (iso foreshortening)
DTOP = 36          # drum top-ellipse centre = dome foot = cornice springing line
DH = 16            # tall gallery drum (front bottom lands at DTOP+DRY+DH = 55)
DOME_RY = 9        # dome vertical radius
APEX_Y = DTOP - DOME_RY   # 28 — dome apex, where the beacon is seated


def drum_edge(xx):
    """Vertical foreshortening of the drum top/bottom ellipse at column offset xx —
    the drum wall at column xx runs from DTOP+edge (top) down DH px."""
    return DRY * math.sqrt(max(0.0, 1.0 - (xx / DR) ** 2))


# ── small helpers ─────────────────────────────────────────────────────────────
def rad(a):
    return math.radians(a)


def spark(c: Canvas, x, y, big=False, arm="h", core="W"):
    """A bright 4-point sparkle: W core + soft teal arms."""
    x, y = round(x), round(y)
    c.set(x, y, core)
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        c.set(x + dx, y + dy, arm)
    if big:
        for dx, dy in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
            c.set(x + dx, y + dy, "c")


def star_poly(cx, cy, ro, ri, n=5, rot=-90.0):
    """A 5-point star polygon (2n vertices, alternating outer/inner). rot=-90 puts
    the first outer point straight up."""
    pts = []
    for k in range(2 * n):
        r = ro if k % 2 == 0 else ri
        a = rad(rot + k * 180.0 / n)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


# ── HERO piece 1: the BROADCAST BEAM firing from the beacon tip into the star ──
def broadcast_beam(c: Canvas, ex, ey, tx, ty):
    """One continuous broadcast column from the emitter tip (ex,ey) up into the star
    (tx,ty): a solid ~3px core (hot `h` centre + `c` either side) so it never breaks,
    wrapped in a soft dithered `c/g` flare that widens toward the star, plus a `W/h`
    bloom where the beam leaves the emitter. Drawn BEFORE the star so the star caps
    its top — matching the emitter streams of the other four creatives."""
    span = int(round(ey - ty))
    if span <= 0:
        return
    for i in range(span + 1):
        t = i / span
        y = round(ey - i)
        cxp = ex + (tx - ex) * t
        # soft outer flare, widening from the tip toward the star (dithered = translucent)
        flare = 1.6 + 3.2 * t
        x0 = int(round(cxp - flare))
        x1 = int(round(cxp + flare))
        for x in range(x0, x1 + 1):
            d = abs(x - cxp)
            if d <= 1.0:
                continue                       # solid core drawn below
            if (x + y) % 2 == 0:
                c.set(x, y, "c" if d < flare * 0.55 else "g")
        # solid continuous 3px core: hot `h` centre + `c` either side
        cx = round(cxp)
        c.set(cx, y, "h")
        c.set(cx - 1, y, "c")
        c.set(cx + 1, y, "c")
    # W/h broadcast bloom where the beam leaves the emitter tip
    bx, by = round(ex), round(ey)
    c.set(bx, by, "W")
    c.set(bx, by - 1, "W")
    c.set(bx - 1, by, "h")
    c.set(bx + 1, by, "h")
    c.set(bx - 2, by, "c")
    c.set(bx + 2, by, "c")


# ── HERO piece 2: expanding concentric BROADCAST SIGNAL RINGS ──────────────────
def signal_rings(c: Canvas, cx, cy):
    """Concentric flattened ellipses rippling outward from the star — the broadcast
    signal. Drawn BEFORE the star so the star silhouette caps the inner arcs, leaving
    clean waves radiating outward. Inner rings teal (bright→dim), the outermost gold —
    the family's teal/orange accent balance. A few W "signal blips" ride the rings."""
    # (rx, ry, char, dash-period) — dash>1 skips pixels so outer rings read fainter
    rings = [
        (OR + 3.5, (OR + 3.5) * 0.62, "c", 1),
        (OR + 7.0, (OR + 7.0) * 0.56, "g", 2),
        (OR + 10.5, (OR + 10.5) * 0.50, "o", 2),
    ]
    for rx, ry, ch, dash in rings:
        for k, a in enumerate(range(0, 360, 3)):
            if dash > 1 and k % dash:
                continue
            x = cx + rx * math.cos(rad(a))
            y = cy + ry * math.sin(rad(a))
            c.set(x, y, ch)
    # bright signal blips on the side lobes (where they clear the star)
    for rx, ry, ang in [(OR + 3.5, (OR + 3.5) * 0.62, 0),
                        (OR + 7.0, (OR + 7.0) * 0.56, 180),
                        (OR + 10.5, (OR + 10.5) * 0.50, 12)]:
        x = cx + rx * math.cos(rad(ang))
        y = cy + ry * math.sin(rad(ang))
        c.set(x, y, "W")


# ── HERO piece 3: the floating faceted AWARD STAR ─────────────────────────────
def hologram_star(c: Canvas, cx, cy, ro, ri):
    """A glowing teal gem-star: a soft bloom halo, a concentric radial gradient body
    (bright h centre → c → g → dark G points), crisp gem FACETS from the core to each
    point (lit upper-left, shaded lower-right), an emissive rim, and a hot W core."""
    # soft bloom halo disc just behind the star (dithered c) — the _t5 energy glow
    hr = ro + 2.0
    for yy in range(-int(hr) - 1, int(hr) + 2):
        for xx in range(-int(hr) - 1, int(hr) + 2):
            d2 = xx * xx + yy * yy
            if (ro - 1) ** 2 < d2 <= hr * hr and (xx + yy) % 2 == 0:
                c.set(cx + xx, cy + yy, "c")

    # STAR body: nested star fills give a clean concentric radial gradient
    c.fill_poly(star_poly(cx, cy, ro, ri), "g")
    c.fill_poly(star_poly(cx, cy, ro * 0.66, ri * 0.66), "c")
    c.fill_poly(star_poly(cx, cy, ro * 0.34, ri * 0.40), "h")

    outer = star_poly(cx, cy, ro, ri)[0::2]   # the 5 outer point tips
    # GEM FACETS: a crisp bright edge from the core to every point — the cut-gem
    # sparkle. Lit upper-left facets are near-white `h`; the shaded lower-right ones
    # stay soft teal `c` (a gentle facet shade, NOT a lone dark `G` stroke that read
    # as a letter). Directional shading lives on the rim below instead.
    for (px, py) in outer:
        lit = (px <= cx + 0.5) or (py < cy - 1)
        c.line((cx, cy), (px, py), "h" if lit else "c")

    # emissive RIM: continuous teal outline — lit upper-left `g`, shaded lower-right
    # `G`, so the gem reads as a faceted solid lit from the upper-left
    verts = star_poly(cx, cy, ro, ri)
    for i in range(len(verts)):
        a, b = verts[i], verts[(i + 1) % len(verts)]
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        shaded = (mx > cx + 0.5) and (my > cy - 1)
        c.line(a, b, "G" if shaded else "g")
    for (px, py) in outer:                     # bright tips catch a W glint
        lit = (px <= cx + 0.5) or (py < cy - 1)
        c.set(px, py, "W" if lit else "h")

    # hot core
    c.set(cx, cy, "W")
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        c.set(cx + dx, cy + dy, "h")


def shine_rays(c: Canvas, cx, cy, reach):
    """Four dithered light rays (a classic 'shining star' flare) fanning up/down/left/
    right from the star — near-white h close in, fading to teal c, with growing gaps.
    Drawn on top so the star clearly SHINES. The DOWN ray is kept short so it blends
    into the broadcast beam rather than punching down onto the emitter collar."""
    for dx, dy in [(0, -1), (0, 1), (-1, 0), (1, 0)]:
        r = 3 if (dx, dy) == (0, 1) else reach   # short downward ray (merges w/ beam)
        for d in range(int(OR) + 1, int(OR) + r + 1):
            if (d % 2) == 0:                   # dithered = translucent flare
                continue
            ch = "h" if d < OR + reach * 0.45 else "c"
            c.set(cx + dx * d, cy + dy * d, ch)


# ── the ROOFTOP LANTERN BEACON (cupola on the dome apex + emitter tip) ─────────
def beacon(c: Canvas, ax, ay):
    """A compact broadcast LANTERN — a little gold-ringed cupola seated on the dome
    apex, crowned by a slim gold finial whose glowing teal emitter tip fires the beam
    straight up. Deliberately NOT a face: a small round cupola + a single high finial
    reads as 'lantern on a dome', not eyes/nose. Returns the emitter tip (beam source)."""
    # ── the little CUPOLA drum, seated right on the dome apex ──
    cylinder(c, ax, ay - 2, 3, 2, top="L", side_l="M", side_r="D", outline="D")
    for a in range(0, 360, 24):                 # gold cornice ring around the cupola
        c.set(ax + 3 * math.cos(rad(a)), ay - 2 + 1.5 * math.sin(rad(a)), "o")
    c.set(ax, ay - 0.5, "O")                    # bright gold front of the ring
    # teal broadcast light glowing inside the cupola — a SYMMETRIC vertical emitter
    # core (bright h over c, dim g flanks) so it reads as a lantern bulb, never a face
    c.set(ax, ay - 1, "h")
    c.set(ax, ay, "c")
    c.set(ax - 1, ay, "g")
    c.set(ax + 1, ay, "g")

    # ── the slim gold FINIAL crowning the cupola + the emitter tip ──
    tip_y = ay - 5
    c.set(ax - 1, ay - 3, "o")                  # bright cupola crown band...
    c.set(ax + 1, ay - 3, "o")
    c.set(ax, ay - 3, "O")
    c.line((ax, ay - 3), (ax, tip_y + 1), "o")  # slim gold finial stem
    # glowing EMITTER TIP: a UNIFIED gold collar band + hot teal knob firing up
    c.set(ax - 1, tip_y + 1, "o")
    c.set(ax + 1, tip_y + 1, "o")
    c.set(ax, tip_y + 1, "O")                   # bright gold collar centre
    c.set(ax, tip_y, "h")                       # hot teal knob
    c.set(ax, tip_y - 1, "W")                   # hot broadcast spark
    return (ax, tip_y)


def rising_motes(c: Canvas, sx, sy, tx, ty, seed):
    """Ascending sparkle motes flanking the beam: fat bright c/h clusters low that
    thin to single c/W sparks with growing gaps as they climb into the star."""
    import random
    rng = random.Random(seed)
    n = 14
    for i in range(1, n + 1):
        t = i / n
        if rng.random() < 0.06 + 0.34 * t:
            continue
        swirl = 1.5 * math.sin(t * 5.2 + seed)
        x = sx + (tx - sx) * t + (swirl + rng.uniform(-0.7, 0.7)) * (1 - t)
        y = sy + (ty - sy) * t
        if t < 0.42:
            c.set(x, y, "c"); c.set(x, y - 1, "h")
        elif t < 0.72:
            c.set(x, y, "W" if rng.random() < 0.5 else "c")
        else:
            c.set(x, y, "h")


# ── a little gold FAIR PENNANT on a thin mast ─────────────────────────────────
def pennant(c: Canvas, x, roof_y, direction):
    """A festive triangular pennant flying from a slim mast on a back roof corner —
    a fair/showcase flag, and a gold accent framing the beacon. `direction` = +1
    (flag flies right) or -1 (flies left)."""
    top_y = roof_y - 10
    c.line((x, roof_y), (x, top_y), "K")        # mast
    c.set(x, top_y - 1, "O")                     # finial knob
    # triangular flag tapering to a point away from the mast
    for i in range(5):
        length = 5 - i
        for k in range(1, length + 1):
            c.set(x + direction * k, top_y + i, "o")
        c.set(x + direction * length, top_y + i, "r")   # trailing point shade
    c.line((x + direction, top_y), (x + direction * 5, top_y), "O")  # lit top edge


# ── ROTUNDA drum glazing / entrance / cornice / dome ──────────────────────────
def drum_window(c: Canvas, xc):
    """A TALL glowing gold-framed gallery window on the CURVED drum wall, centred on
    column `xc`. Teal glass with a bright sky-reflection top fading to a dark sill,
    framed by gold pilasters + a gold lintel/sill — matching the family's gold-framed
    glazing, wrapped onto the round body."""
    hw = 1
    # gold pilasters flanking the glass (follow the wall curve at their column)
    for fx in (xc - hw - 1, xc + hw + 1):
        if abs(fx) >= DR:
            continue
        e = drum_edge(fx)
        c.line((DCX + fx, DTOP + e + 1.5), (DCX + fx, DTOP + e + DH - 1.5),
               "o" if fx < 0 else "r")
    # teal glass columns: top-lit → dark-sill gradient
    for xx in range(xc - hw, xc + hw + 1):
        if abs(xx) >= DR:
            continue
        e = drum_edge(xx)
        y0, y1 = DTOP + e + 2.0, DTOP + e + DH - 2.0
        span = y1 - y0
        n = max(1, int(round(span)))
        for i in range(n + 1):
            t = i / n
            ch = "h" if t < 0.20 else "c" if t < 0.50 else "g" if t < 0.82 else "G"
            c.set(DCX + xx, y0 + i * span / n, ch)
    # bright sky glint + gold lintel/sill following the curve
    for xx in range(xc - hw, xc + hw + 1):
        e = drum_edge(xx)
        c.set(DCX + xx, DTOP + e + 1.6, "o")             # gold lintel
        c.set(DCX + xx, DTOP + e + DH - 1.6, "r")        # gold sill shadow
    e = drum_edge(xc)
    c.set(DCX + xc, DTOP + e + 3.0, "W")                 # sky-reflection glint
    c.set(DCX + xc, DTOP + e + DH - 2.4, "O")            # warm glow at the sill


def drum_entrance(c: Canvas):
    """A grand warm-lit ARCHED entrance centred on the drum front — dark recess with a
    warm interior glow and a gold arch frame."""
    hw = 2
    for xx in range(-hw, hw + 1):
        e = drum_edge(xx)
        arch = 1.6 if abs(xx) == hw else 0.5 if abs(xx) == 1 else 0.0   # round the top
        top = DTOP + e + 3.6 + arch
        bot = DTOP + e + DH - 0.6
        n = max(1, int(round(bot - top)))
        for i in range(n + 1):
            t = i / n
            y = top + i * (bot - top) / n
            if t < 0.13:                           # thin dark arch lip at the very top
                ch = "K"
            elif abs(xx) == hw:                    # warm reveal on the jambs
                ch = "r"
            elif t < 0.5:                          # warm-lit interior, brightening down
                ch = "r"
            else:
                ch = "o"
            c.set(DCX + xx, y, ch)
    # bright warm glow pool spilling from the threshold
    c.set(DCX, DTOP + drum_edge(0) + DH - 1.6, "O")
    c.set(DCX - 1, DTOP + drum_edge(-1) + DH - 1.4, "o")
    c.set(DCX + 1, DTOP + drum_edge(1) + DH - 1.4, "o")
    # gold arch frame: jamb pilasters + a keystone glint
    for xx in (-hw, hw):
        e = drum_edge(xx)
        c.line((DCX + xx, DTOP + e + 3.6 + 1.6), (DCX + xx, DTOP + e + DH - 0.6),
               "o" if xx < 0 else "r")
    c.set(DCX, DTOP + drum_edge(0) + 3.6, "O")       # keystone glow


def cornice_band(c: Canvas):
    """A solid gold CORNICE / entablature band wrapping the drum top — the crescent of
    drum-top between the dome foot and the wall. Drawn AFTER the dome so it cleanly
    caps the dome's springing line (hiding its flat base edge) with gold, giving the
    stately gallery a bright gold ring where the dome meets the round wall."""
    for xx in range(-DR + 1, DR):
        e = drum_edge(xx)
        n = max(1, int(round(e)))
        for i in range(n + 1):
            y = DTOP + i * e / n
            t = i / n
            if xx < -2:                            # lit-left: bright gold → warm
                col = "O" if t < 0.55 else "o"
            elif xx > 2:                           # shaded-right: gold → shadow
                col = "o" if t < 0.5 else "r"
            else:                                  # centre: bright crown
                col = "O" if t < 0.45 else "o" if t < 0.85 else "r"
            c.set(DCX + xx, y, col)


def base_ring(c: Canvas):
    """A shadowed base plinth + gold base trim wrapping the drum foot."""
    bot = DTOP + DH
    for a in range(0, 181, 2):                     # crisp dark base line
        x = DCX + DR * math.cos(rad(a))
        c.set(x, bot + DRY * math.sin(rad(a)) - 1, "d")
        c.set(x, bot + DRY * math.sin(rad(a)), "K")
    for a in range(6, 175, 3):                     # gold base trim just above it
        c.set(DCX + (DR - 0.4) * math.cos(rad(a)), bot - 2.4 + DRY * math.sin(rad(a)), "o")


def dome_roof(c: Canvas):
    """The domed rotunda ROOF: a gold-ribbed teal-oculus dome capping the drum, lit
    from the upper-left. The beacon is seated on its apex."""
    dome(c, DCX, DTOP, DR, DOME_RY, top="L", shade="M", dark="D", outline="K")
    apex = (DCX, APEX_Y)
    # subtle gold MERIDIAN RIBS fanning from the apex to the springing line — the
    # gallery-dome segments + a gold accent (lit-left brighter, shaded-right darker).
    # The centre is left clear so it doesn't compete with the up-firing beam.
    for fx, col in [(-11, "o"), (-7, "O"), (-3, "o"), (3, "r"), (7, "r"), (11, "r")]:
        c.line(apex, (DCX + fx, DTOP - 0.5), col)
    # a clean upper-left specular highlight crescent → the dome reads as a lit sphere
    for (hx, hy) in [(27, 31), (28, 31), (26, 32), (27, 32)]:
        c.set(hx, hy, "W")
    for (hx, hy) in [(25, 33), (29, 30), (24, 33), (29, 32), (26, 30)]:
        c.set(hx, hy, "L")


def contact_shadow(c: Canvas):
    scx, scy, rx, ry = 32, 58, 24, 4
    for y in range(scy - ry, scy + ry + 1):
        for x in range(scx - rx, scx + rx + 1):
            if ((x - scx) / rx) ** 2 + ((y - scy) / ry) ** 2 <= 1.0:
                c.set(x, y, "K")


# ── assemble ──────────────────────────────────────────────────────────────────
def build() -> Canvas:
    c = Canvas(SIZE, SIZE)
    contact_shadow(c)

    # ── the ROUND GALLERY DRUM (rotunda body — a cylinder, not a box) ──
    cylinder(c, DCX, DTOP, DR, DH, top="L", side_l="M", side_r="D", outline="K", ry=DRY)
    base_ring(c)

    # tall glowing gold-framed gallery windows ringing the drum + grand entrance
    for xc in (-10, -6, 6, 10):
        drum_window(c, xc)
    drum_entrance(c)

    # ── the DOMED roof capping the drum, then the gold cornice over the join ──
    dome_roof(c)
    cornice_band(c)

    # festive FAIR PENNANTS flanking the dome (frame the beacon)
    pennant(c, 21, 38, direction=-1)
    pennant(c, 43, 38, direction=1)

    # ── the LANTERN BEACON seated on the dome apex ──
    tip = beacon(c, DCX, APEX_Y)

    # ── rising gold/teal motes flanking the beam ──
    rising_motes(c, tip[0] - 3, tip[1] - 1, SX - 4, SY + 4, seed=71)
    rising_motes(c, tip[0] + 3, tip[1] - 1, SX + 4, SY + 4, seed=918)

    # ── THE HERO: broadcast rings → beam → star → shine → sparkles ──
    signal_rings(c, SX, SY)                                    # behind the star
    broadcast_beam(c, tip[0], tip[1], SX, SY + IR)             # one continuous column
    hologram_star(c, SX, SY, OR, IR)                           # caps beam + rings
    shine_rays(c, SX, SY, reach=6)                             # on top: it SHINES

    # floating sparkles + a couple of gold motes around the star
    spark(c, SX - OR - 5, SY + 1, big=True)
    spark(c, SX + OR + 4, SY - 3)
    spark(c, SX + 2, SY - OR - 3)
    spark(c, SX - OR + 2, SY + OR + 3)
    for (x, y) in [(SX + OR + 6, SY + 4), (SX - OR - 2, SY - OR + 1), (SX + OR - 1, SY - OR)]:
        c.set(x, y, "o"); c.set(x, y - 1, "O")

    return c


# ── emit: source JSON (recolor.py reads it) + PNG + x8 preview ────────────────
def emit() -> None:
    c = build()
    spec = {"width": SIZE, "height": SIZE, "palette": CANON, "rows": c.rows()}
    os.makedirs(SRC_DIR, exist_ok=True)
    os.makedirs(GATE_DIR, exist_ok=True)
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    with open(os.path.join(SRC_DIR, f"{KEY}_generic.json"), "w") as fh:
        json.dump(spec, fh, indent=0)

    img = render(spec)
    img.save(os.path.join(GATE_DIR, "showcase_creative.png"))
    big = img.resize((SIZE * 8, SIZE * 8), Image.NEAREST)
    bg = Image.new("RGBA", big.size, (210, 210, 218, 255))
    bg.alpha_composite(big)
    bg.save(os.path.join(PREVIEW_DIR, "showcase_creative.png"))
    print(f"built {KEY}: {GATE_DIR}/showcase_creative.png")


if __name__ == "__main__":
    emit()
