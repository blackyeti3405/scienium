#!/usr/bin/env python3
"""
Computational Chemistry Hub — ChemWorks economy building (BESPOKE form, STANDARD).

The FIRST building of the blue-grey / blue-glass / violet-glow ChemWorks set, and
its "in silico" sibling — all quiet machines, no glassware out front. NOT the
gateway cube, NOT a plain box. It is a STEPPED TWO-BLOCK DATA-CENTER: a taller
compute core stepped DOWN to a lower server wing that wears a band of louvered
cooling vents — distinct from the boxy reactor halls and the round/tower forms.

Massing (back -> front in painter's order, two stepped abutting Boxes):
  * COMPUTE CORE: a taller Box(top=(28,14), wx=9, wy=9, h=18) — clean M/L panel
    walls with a thin c data-strip band, a flat parapet roof. Its LIT LEFT face
    carries the hero: a K-framed glowing GLASS OPERATOR ROOM (c/h glass, h
    reflections, banks of tiny o/c indicator lights inside, an o glow, a K door).
  * SERVER WING: a lower Box(top=(40,24), wx=7, wy=7, h=11) stepped down off the
    FRONT-RIGHT — its SHADED RIGHT face a band of K/D LOUVERED COOLING VENTS with a
    faint c glow leaking between the slats; the LEFT face plainer (a D conduit, a
    couple of quiet c slat-glints).
  * ROOFLINE: flat parapets at two heights, a small rooftop D HVAC chiller box, a
    slim o emitter nub feeding the rooftop hologram. No stack.

  * OPENING SIDE = LEFT. The dominant door/glazing (the operator room) is on the
    LIT LEFT face of the compute core; the RIGHT face (the vent wing) stays plainer.

Signature (one-of-one): above the roof hovers a translucent slowly-rotating
BALL-AND-STICK MOLECULE MODEL — 5 coloured atom spheres (violet O/o accents, blue
c/g/G atoms, light W/L atoms) joined by short M/L bond sticks as a small 3D cluster
(a central atom with branches), each sphere with an h highlight + K rim — overlaid
with a faint translucent c/h GHOST copy of its predicted next conformation offset
to one side, with a thin O arrow from the solid model to the ghost (the forecast).
A faint c orbit ellipse + index tick sells slow rotation; a thin o/O projector beam
rises from the roof emitter; a soft c glow halo + h sparkles; a tiny g confidence
bar on the parapet. No ball-and-stick / atom-and-bond / predicted-pose motif exists
elsewhere in the catalog (distinct from the genetics double-helix and the flat
bioinformatics genome ring: this is a 3D ball-and-stick cluster).

Composed from art/isobuild.{Box} — NO iso.draw_cube / base_windows.
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder  # noqa: F401  (cylinder used by t4 cooling tower)

# Base ChemWorks palette (shared keys) + the EVOLVED accent shades reserved for the
# upgrade stages ONLY (they never appear in stage 1, so the shipped base PNG is
# byte-identical). These exact keys+hexes match the chemworks reference builder
# (fume-hood-bench.py) so the whole lab evolves with one consistent accent set:
#   b  deepened structure steel — matured tone for t3 annex housing / t4 tower
#   e  energized coolant glow (mid)   E  electron-density pulse (bright) — t4/t5 power
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
CHEM = {"K": "#161a2e", "W": "#e6ecfb", "L": "#c2cdee", "M": "#9aa8d8", "D": "#6f7cb0", "d": "#4b5688",
        "h": "#d6ecff", "c": "#a8d4ff", "g": "#4aa0e6", "G": "#2166b0",
        "o": "#c89cf0", "O": "#e0c2ff", "r": "#6a34a8",
        "b": "#363c5e", "e": "#36e0c8", "E": "#c2fff2", "q": "#f0c64a"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def P(p):
    return (int(round(p[0])), int(round(p[1])))


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def ellipse_ring(c, cx, cy, rx, ry, ch, step=6):
    for a in range(0, 360, step):
        x = cx + rx * math.cos(math.radians(a))
        y = cy + ry * math.sin(math.radians(a))
        c.set(x, y, ch)


def disc(c, cx, cy, rx, ry, fill, rim=None, hi=None, shade=None):
    """A small filled iso sphere (a 2:1-ish ball). fill body; optional K rim, h
    upper-left highlight pip, darker shade lower-right pip."""
    cxi, cyi = cx, cy
    for yy in range(int(-ry - 1), int(ry + 2)):
        t = 1 - (yy / ry) ** 2
        if t < 0:
            continue
        half = rx * (t ** 0.5)
        for xx in range(int(-half), int(half) + 1):
            # lower-right of the sphere reads slightly darker if a shade colour given
            ch = fill
            if shade is not None and xx > 0 and yy > 0 and (xx * xx + yy * yy) > (rx * 0.4) ** 2:
                ch = shade
            c.set(cxi + xx, cyi + yy, ch)
    if rim is not None:
        for a in range(0, 360, 18):
            x = cxi + (rx + 0.5) * math.cos(math.radians(a))
            y = cyi + (ry + 0.5) * math.sin(math.radians(a))
            if c.px[int(round(y))][int(round(x))] == "." if 0 <= int(round(y)) < 64 and 0 <= int(round(x)) < 64 else False:
                c.set(x, y, rim)
            else:
                # only rim where it borders empty space to keep clusters tight
                c.set(x, y, rim)
    if hi is not None:
        c.set(cxi - max(1, int(rx * 0.4)), cyi - max(1, int(ry * 0.5)), hi)


# ── 1. COMPUTE CORE — the taller back block (clean panel walls + data strip) ──
def compute_core(c):
    """The dominant mass: a taller Box (wx=9 wy=9 h=18) — a clean panel-walled
    compute volume, taller than it is wide, with a flat parapet. Lit M left, shaded
    D right; we overpaint clean L panel seams + a thin c data-strip band afterward.
    The hero operator room is cut into the LEFT face later (drawn after the wing)."""
    b = Box(top=(28, 14), wx=9, wy=9, h=18)
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # --- clean L panel seams on both faces (a precise machine-panel skin) ---
    for v in (5.0, 11.0):
        c.line(b.left_pt(0.04, v), b.left_pt(0.96, v), "L")
        c.line(b.right_pt(0.04, v), b.right_pt(0.96, v), "d")
    for u in (0.34, 0.66):
        c.line(b.left_pt(u, 1.0), b.left_pt(u, 17.0), "L")
        c.line(b.right_pt(u, 1.0), b.right_pt(u, 17.0), "d")
    # --- a thin bright c DATA-STRIP band wrapping the upper core (status LEDs) ---
    DS = 2.6
    c.fill_poly([b.left_pt(0.04, DS), b.left_pt(0.96, DS),
                 b.left_pt(0.96, DS + 1.2), b.left_pt(0.04, DS + 1.2)], "c")
    c.fill_poly([b.right_pt(0.04, DS), b.right_pt(0.96, DS),
                 b.right_pt(0.96, DS + 1.2), b.right_pt(0.04, DS + 1.2)], "g")
    c.line(b.left_pt(0.04, DS), b.left_pt(0.96, DS), "K")
    c.line(b.left_pt(0.04, DS + 1.2), b.left_pt(0.96, DS + 1.2), "K")
    c.line(b.right_pt(0.04, DS), b.right_pt(0.96, DS), "K")
    c.line(b.right_pt(0.04, DS + 1.2), b.right_pt(0.96, DS + 1.2), "K")
    # tiny LED ticks along the lit data strip
    for u in [0.10 + i * 0.11 for i in range(8)]:
        p = b.left_pt(u, DS + 0.5)
        c.set(int(round(p[0])), int(round(p[1])), "h" if u < 0.5 else "o")
    return b


def core_parapet(c, b):
    """A flat machined parapet rim on the compute-core roof — a thin K-lipped W/L
    cap edge so the taller block reads as a clean data-center roof, not a peak."""
    for a, bb in [(b.r_top, b.r_left), (b.r_left, b.r_front),
                  (b.r_front, b.r_right), (b.r_right, b.r_top)]:
        c.line(a, bb, "d")
    c.line(b.r_top, b.r_left, "W")          # bright lit back-left rim
    c.line(b.r_top, b.r_right, "W")
    c.line(b.r_left, b.r_front, "L")        # lit front-left parapet edge


# ── 2. SERVER WING — the lower stepped-down block with louvered vents (RIGHT) ──
def server_wing(c):
    """The lower mass stepped DOWN off the front-right (wx=7 wy=7 h=11). Its SHADED
    RIGHT face is the louvered cooling-vent band; the LEFT face is plainer. Drawn
    AFTER the core so it sits in FRONT and steps the silhouette. Returns the Box."""
    w = Box(top=(45, 25), wx=7, wy=7, h=11)
    w.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    return w


def wing_louvers(c, w):
    """A band of K/D LOUVERED COOLING VENTS across the SHADED RIGHT face of the
    server wing — horizontal slat strips (alternating d/K) with a faint c glow
    leaking between a few slats (warm machines inside). The 'server-vent wing' that
    makes this a data-center, not a box. The LEFT face stays plainer."""
    u0, u1 = 0.10, 0.90
    vt, vb = 1.6, 9.4
    # recessed K vent frame
    c.fill_poly([w.right_pt(u0 - 0.02, vt - 0.5), w.right_pt(u1 + 0.02, vt - 0.5),
                 w.right_pt(u1 + 0.02, vb + 0.3), w.right_pt(u0 - 0.02, vb + 0.3)], "K")
    iu0, iu1 = u0 + 0.02, u1 - 0.02
    # the louver field: dark D base, then alternating horizontal slats (d lit edge /
    # K shadow gap) so it reads as a stack of cooling fins
    c.fill_poly([w.right_pt(iu0, vt), w.right_pt(iu1, vt),
                 w.right_pt(iu1, vb), w.right_pt(iu0, vb)], "D")
    n_slats = 9
    glow_rows = {2, 5}                       # a couple of slats leak a faint c glow
    for i in range(n_slats):
        v = vt + (vb - vt) * (i + 0.5) / n_slats
        top_edge = "c" if i in glow_rows else "d"   # faint glow / lit fin edge
        c.line(w.right_pt(iu0, v - 0.5), w.right_pt(iu1, v - 0.5), top_edge)
        c.line(w.right_pt(iu0, v + 0.4), w.right_pt(iu1, v + 0.4), "K")  # shadow gap
    # a faint c slat-glow pool low in the vent (warm machines deeper inside)
    for i in glow_rows:
        v = vt + (vb - vt) * (i + 0.5) / n_slats
        c.fill_poly([w.right_pt(iu0 + 0.04, v - 0.4), w.right_pt(iu1 - 0.04, v - 0.4),
                     w.right_pt(iu1 - 0.04, v + 0.3), w.right_pt(iu0 + 0.04, v + 0.3)], "c")
    # 3 thin K mullion dividers splitting the vent into server racks
    for u in (0.32, 0.54, 0.76):
        c.line(w.right_pt(u, vt), w.right_pt(u, vb), "K")
    # crisp K vent surround
    c.line(w.right_pt(iu0, vt), w.right_pt(iu1, vt), "K")
    c.line(w.right_pt(iu0, vb), w.right_pt(iu1, vb), "K")


def wing_left_plain(c, w):
    """The LEFT face of the server wing kept plainer than the core: a vertical D
    conduit run + a couple of quiet c slat-glints, no door. Keeps the OPENING clearly
    on the core's LEFT operator room, the wing a utility mass."""
    # a vertical D service conduit on the lit-left wing wall
    c.fill_poly([w.left_pt(0.16, 1.4), w.left_pt(0.24, 1.4),
                 w.left_pt(0.24, 9.0), w.left_pt(0.16, 9.0)], "D")
    c.line(w.left_pt(0.16, 1.4), w.left_pt(0.16, 9.0), "d")
    c.line(w.left_pt(0.24, 1.4), w.left_pt(0.24, 9.0), "K")
    # a couple of quiet c diagnostic glints (small access panels)
    for v in (3.2, 5.6):
        p = w.left_pt(0.78, v)
        px, py = int(round(p[0])), int(round(p[1]))
        c.set(px, py, "c"); c.set(px + 1, py, "g"); c.set(px, py + 1, "K")
    # bright L eave glint on the lit wing roof front edge
    c.line(w.r_left, w.r_front, "L")


# ── 3. LEFT-FACE OPERATOR ROOM — the glowing hero opening (LIT side) ──────────
def operator_room(c, b):
    """The HERO opening on the LIT LEFT face of the compute core: a K-framed GLASS
    OPERATOR ROOM. c/h glazing with an h reflection sweep, banks of tiny o/c indicator
    lights glowing inside, a soft o interior glow, and a K-framed glass door at the
    base. Drawn AFTER the wing so the dominant opening unmistakably reads on the LEFT.
    The RIGHT (vent wing) stays plainer — opening side = LEFT."""
    u0, u1 = 0.10, 0.90                      # WIDE operator room dominating the LEFT face
    vt, vb = 5.4, 16.4
    # K opening frame (recessed border)
    c.fill_poly([b.left_pt(u0 - 0.02, vt - 0.5), b.left_pt(u1 + 0.02, vt - 0.5),
                 b.left_pt(u1 + 0.02, vb + 0.3), b.left_pt(u0 - 0.02, vb + 0.3)], "K")
    iu0, iu1 = u0 + 0.02, u1 - 0.02
    # the glass: upper panes bright h (sky-lit room) graded to c below
    c.fill_poly([b.left_pt(iu0, vt), b.left_pt(iu1, vt),
                 b.left_pt(iu1, vb), b.left_pt(iu0, vb)], "c")
    c.fill_poly([b.left_pt(iu0, vt), b.left_pt(iu1, vt),
                 b.left_pt(iu1, vt + 2.2), b.left_pt(iu0, vt + 2.2)], "h")
    # --- banks of tiny o/c INDICATOR LIGHTS glowing inside (the control room) ---
    for r, vy in enumerate((vt + 3.0, vt + 4.6, vt + 6.2)):
        for k, u in enumerate([iu0 + 0.05 + j * 0.075 for j in range(10)]):
            p = b.left_pt(u, vy)
            px, py = int(round(p[0])), int(round(p[1]))
            col = "o" if (r + k) % 3 == 0 else ("O" if (r + k) % 3 == 1 else "h")
            c.set(px, py, col)
    # soft o interior glow pooling low in the room (consoles lit)
    c.fill_poly([b.left_pt(iu0, vb - 3.4), b.left_pt(iu1, vb - 3.4),
                 b.left_pt(iu1, vb - 1.4), b.left_pt(iu0, vb - 1.4)], "o")
    # a bright h reflection SWEEP diagonally across the operator glass
    c.line(b.left_pt(iu0 + 0.04, vt + 1.0), b.left_pt(iu0 + 0.34, vt + 4.0), "h")
    c.line(b.left_pt(iu0 + 0.04, vt + 1.6), b.left_pt(iu0 + 0.34, vt + 4.6), "W")
    # K mullion grid on the wide operator glass
    for u in (0.28, 0.46, 0.64, 0.82):
        c.line(b.left_pt(u, vt), b.left_pt(u, vb), "K")
    for v in (vt + 2.4, vt + 7.0):
        c.line(b.left_pt(iu0, v), b.left_pt(iu1, v), "K")
    # --- K-framed glass ENTRY DOOR at the base of the operator room ---
    du0, du1 = 0.20, 0.42
    dvt, dvb = vb - 4.4, vb
    c.fill_poly([b.left_pt(du0 - 0.02, dvt), b.left_pt(du1 + 0.02, dvt),
                 b.left_pt(du1 + 0.02, dvb), b.left_pt(du0 - 0.02, dvb)], "K")
    c.fill_poly([b.left_pt(du0 + 0.02, dvt + 0.4), b.left_pt(du1 - 0.02, dvt + 0.4),
                 b.left_pt(du1 - 0.02, dvb), b.left_pt(du0 + 0.02, dvb)], "h")
    c.line(b.left_pt((du0 + du1) / 2, dvt + 0.4), b.left_pt((du0 + du1) / 2, dvb), "K")
    c.line(b.left_pt(du0 + 0.02, dvt + 1.0), b.left_pt(du1 - 0.02, dvt + 1.0), "c")
    # soft o glow spill onto the ground just outside the LEFT door
    sp = b.left_pt((du0 + du1) / 2, vb + 0.8)
    sx, sy = int(round(sp[0])), int(round(sp[1]))
    for dx in range(-3, 4):
        c.set(sx + dx, sy, "o")
    c.set(sx - 1, sy + 1, "o"); c.set(sx, sy + 1, "O"); c.set(sx + 1, sy + 1, "o")


# ── 4. ROOFTOP MECHANICALS — HVAC chiller box + emitter nub ───────────────────
def rooftop(c, b):
    """A small D HVAC chiller box + a slim o emitter nub on the compute-core roof.
    The emitter feeds the projector beam into the hovering molecule. Returns the
    emitter screen point so the signature can spring from it. No stack."""
    # --- a small D HVAC chiller box toward the back-right of the core roof ---
    bx, by = b.roof_pt(0.66, 0.30)
    bw, bh, bz = 7, 3, 5
    top = [(bx - bw, by), (bx, by - bh), (bx + bw, by), (bx, by + bh)]
    c.fill_poly(top, "L")
    c.fill_poly([(bx - bw, by), (bx, by + bh), (bx, by + bh + bz), (bx - bw, by + bz)], "M")
    c.fill_poly([(bx, by + bh), (bx + bw, by), (bx + bw, by + bz), (bx, by + bh + bz)], "D")
    for a, bb in [((bx - bw, by), (bx, by - bh)), ((bx, by - bh), (bx + bw, by)),
                  ((bx + bw, by), (bx, by + bh)), ((bx, by + bh), (bx - bw, by)),
                  ((bx - bw, by), (bx - bw, by + bz)), ((bx, by + bh), (bx, by + bh + bz)),
                  ((bx + bw, by), (bx + bw, by + bz)),
                  ((bx - bw, by + bz), (bx, by + bh + bz)),
                  ((bx, by + bh + bz), (bx + bw, by + bz))]:
        c.line(a, bb, "K")
    # chiller fan grille (3 d slats on the lit left face)
    for dx in (-5, -3, -1):
        c.line((bx + dx, by + 1), (bx + dx, by + bz - 1), "d")
    c.line((bx - bw, by), (bx, by - bh), "W")   # bright lit top rim

    # --- a tiny g CONFIDENCE BAR on the front parapet (the prediction score) ---
    pb = b.roof_pt(0.30, 0.74)
    pbx, pby = int(round(pb[0])), int(round(pb[1]))
    c.set(pbx - 1, pby, "K")
    for i in range(6):
        c.set(pbx + i, pby, "g" if i < 4 else "d")  # ~67% filled
    c.set(pbx + 6, pby, "K")
    c.set(pbx, pby - 1, "G"); c.set(pbx + 2, pby - 1, "G")

    # --- slim o emitter NUB near roof-front-centre, aimed up at the molecule ---
    ex, ey = b.roof_pt(0.46, 0.50)
    exi, eyi = int(round(ex)), int(round(ey))
    c.set(exi, eyi, "r"); c.set(exi, eyi - 1, "o"); c.set(exi, eyi - 2, "O")
    c.set(exi - 1, eyi, "K"); c.set(exi + 1, eyi, "K")
    return (exi, eyi - 2)


# ── 5. SIGNATURE — hovering BALL-AND-STICK MOLECULE + predicted-pose ghost ────
def molecule(c, emitter, stage: int = 1):
    """A translucent slowly-rotating BALL-AND-STICK MOLECULE hovers above the roof:
    a small 3D cluster of coloured atom spheres (violet O/o accents, blue c/g/G,
    light W/L) joined by short M/L bond sticks, each sphere with an h highlight + K
    rim — overlaid with a faint translucent c/h GHOST copy of its predicted next
    conformation offset to one side, with a thin O arrow from the solid model to the
    ghost (the forecast). A faint c orbit ellipse + index tick sells slow rotation; a
    thin o/O beam rises from the emitter; a soft c glow halo + h sparkles. The
    one-of-one signature of the ChemWorks set.

    Upgrade-evolution (cumulative, drawn within this front-most hero pass):
      stage>=2  grows the cluster: ONE extra atom node + bond on the orbit (a 6th
                sphere on a new branch) and a brightened orbiting node.
      stage>=5  the model DOUBLES into a twin-molecule simulation cluster — a second
                solid cluster mirrored off to the right (replacing the faint ghost as
                the now-realised second model) with bright E electron-density pulses
                arcing between the two + a gold orbit gimbal (see stage5_twin_cluster).
    Stage 1 draws EXACTLY the shipped molecule (no extra node, no twin)."""
    ex, ey = emitter
    gx, gy = ex - 5, ey - 14                   # SOLID molecule centre floats above-left
    ox, oy = 14, 1                             # ghost cluster offset (clearly to the RIGHT)

    # --- soft c glow halo hugging ONLY the solid cluster (drawn FIRST, behind all) --
    for a in range(0, 360, 30):
        x = gx + 10 * math.cos(math.radians(a))
        y = gy + 6 * math.sin(math.radians(a))
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < 64 and 0 <= yi < 64 and c.px[yi][xi] == ".":
            c.set(x, y, "c")

    # --- thin o/O projector beam rising from the emitter into the solid cluster ---
    for k in range(0, 11):
        t = k / 10
        bxp = ex + (gx - ex) * t
        byp = ey - (ey - (gy + 5)) * t
        c.set(int(round(bxp)), int(round(byp)), "o")
        if t > 0.55:
            c.set(int(round(bxp)) + 1, int(round(byp)), "O")

    # --- faint c ROTATION ORBIT ellipse + an O index tick (sells slow rotation) ---
    for a in range(0, 360, 26):
        x = gx + 9 * math.cos(math.radians(a))
        y = gy + 4.6 * math.sin(math.radians(a))
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < 64 and 0 <= yi < 64 and c.px[yi][xi] == ".":
            c.set(x, y, "c")
    ia = math.radians(-58)
    c.set(gx + 9 * math.cos(ia), gy + 4.6 * math.sin(ia), "O")

    # --- node layout (dx,dy,radius,colour) for the SOLID ball-and-stick molecule:
    # a central blue atom with 4 branches — two violet accents, one bright blue, one
    # light atom — a small 3D cluster. ---
    nodes = {
        "C":  (0, 0, 2.4, "g"),       # central blue atom
        "v1": (-6, -3, 1.9, "O"),     # violet accent (upper-left)
        "v2": (5, -4, 1.7, "o"),      # violet accent (upper-right)
        "b1": (6, 3, 1.8, "c"),       # bright blue (lower-right)
        "w1": (-5, 4, 1.5, "W"),      # light atom (lower-left)
    }
    bonds = [("C", "v1"), ("C", "v2"), ("C", "b1"), ("C", "w1")]
    # t2 SMALL ADD — grow the cluster by ONE atom: a 6th blue node 'g1' on a new
    # branch off the central atom (down, between w1 and b1), with its own bond. The
    # node sits inside the existing orbit so the silhouette grows without clipping.
    if stage >= 2:
        nodes["g1"] = (0, 6, 1.6, "g")        # new blue atom on a downward branch
        bonds.append(("C", "g1"))

    # ===== PREDICTED-POSE GHOST + forecast ARROW (stages 1..4 only) ==============
    # A faint translucent c/h copy of the whole cluster offset clearly to the RIGHT (a
    # slightly rotated forecast conformation) with a bright O arrow pointing at it.
    # At t5 the forecast is REALISED: the twin solid cluster + E pulses take this slot,
    # so the faint ghost & arrow are suppressed (drawn only when stage < 5).
    if stage < 5:
        gnodes = {
            "C":  (0, 0, 2.4, ),
            "v1": (-5, -4, 1.9),          # nudged = forecast rotation
            "v2": (6, -2, 1.7),
            "b1": (5, 4, 1.8),
            "w1": (-6, 2, 1.5),
        }
        # ghost bond sticks (faint c rods). The ghost stays the original 5-node
        # forecast, so skip any bond (e.g. the t2-grown 'g1') the ghost lacks.
        for a, b in bonds:
            if a not in gnodes or b not in gnodes:
                continue
            p0 = (gx + gnodes[a][0] + ox, gy + gnodes[a][1] + oy)
            p1 = (gx + gnodes[b][0] + ox, gy + gnodes[b][1] + oy)
            c.line(p0, p1, "c")
        # ghost atoms = small SOLID faint-blue discs with an h glint = translucent twin
        for key, (dx, dy, rr) in gnodes.items():
            cx, cy = gx + dx + ox, gy + dy + oy
            disc(c, cx, cy, rr - 0.2, (rr - 0.2) * 0.9, "c", rim="g", hi="h")

        # a bright O ARROW from the solid model to the ghost (the prediction), drawn
        # AFTER the ghost so it sits on top of it (the solid atoms overlap its tail).
        a0 = (gx + 7, gy + 0)                      # tail near the solid cluster's right
        a1 = (gx + ox - 5, gy + oy + 0)           # head near the ghost's left
        for p in [lerp(a0, a1, k / 6) for k in range(7)]:
            xi, yi = int(round(p[0])), int(round(p[1]))
            c.set(xi, yi, "O")
            c.set(xi, yi - 1, "o")                # a little thickness so the arrow reads
        # solid arrowhead pointing at the ghost
        c.set(a1[0], a1[1], "O")
        c.set(a1[0] - 1, a1[1] - 1, "O"); c.set(a1[0] - 1, a1[1] + 1, "O")
        c.set(a1[0] - 2, a1[1], "O")

    # ===== the SOLID ball-and-stick molecule (drawn LAST, in front) ==============
    def npos(key):
        dx, dy, _, _ = nodes[key]
        return (gx + dx, gy + dy)
    # BOND STICKS first (spheres overlap their ends): 3px rods, K core / M body / L lit
    for a, b in bonds:
        p0, p1 = npos(a), npos(b)
        c.line(p0, p1, "M")
        c.line((p0[0], p0[1] - 1), (p1[0], p1[1] - 1), "L")
        c.line((p0[0], p0[1] + 1), (p1[0], p1[1] + 1), "K")
    # ATOM SPHERES on the bond ends, back (upper) -> front order. The t2 extra node
    # 'g1' is the nearest (lowest) branch, so it draws FRONT-most when present.
    order = ["v1", "v2", "C", "b1", "w1"]
    if stage >= 2:
        order.append("g1")
    shade_map = {"g": "G", "O": "o", "o": "r", "c": "g", "W": "L"}
    for key in order:
        dx, dy, rr, col = nodes[key]
        cx, cy = gx + dx, gy + dy
        disc(c, cx, cy, rr, rr * 0.92, col, rim="K", hi="h", shade=shade_map.get(col))

    # --- a couple of h sparkles selling the premium hologram ---
    c.set(gx - 8, gy - 5, "h")
    c.set(gx - 1, gy - 8, "h")
    c.set(gx + ox + 8, gy + oy + 5, "c")

    # ── t2 BRIGHTEN: re-pop the upper-right violet node 'v2' with a bright O/E core
    #    so one orbiting atom reads as 'energised' (the t2 spark on the molecule). ──
    if stage >= 2:
        vx, vy = gx + nodes["v2"][0], gy + nodes["v2"][1]
        c.set(vx, vy, "O"); c.set(vx - 1, vy, "E"); c.set(vx, vy - 1, "E")

    # ── t5 TWIN: the model DOUBLES into a twin-molecule simulation cluster — a full
    #    SECOND solid cluster off to the right (where the ghost forecast was), with
    #    bright E electron-density pulses arcing between the two + a gold orbit gimbal.
    if stage >= 5:
        stage5_twin_cluster(c, gx, gy, ox, oy, nodes, bonds, shade_map)


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS compute / cooling
# / simulation structure onto the prior form — never restarts, never recolors the
# whole building. Theme: the quiet in-silico data-center scales up into a built-out
# HPC simulation cluster. Colours mature stage by stage; the energized coolant glow
# (e/E teal) arrives at t4; gold (q) only as a t5 flourish.
#
#   t2  small functional add : extra atom node+bond on the molecule (in molecule())
#                              + a c DATA-LIGHT RING on the server-rack roof rim
#   t3  structural add        : a GPU-BLADE RACK ANNEX abutting the server wing
#                              (a louvered b box, Box.louver vents glowing faint g)
#   t4  major add             : a LIQUID-COOLING TOWER beside the racks (a cylinder
#                              w/ an e coolant-glow window + radiator fins) feeding it
#   t5  crowning feature      : the molecule DOUBLES into a TWIN SIMULATION CLUSTER
#                              w/ bright E pulses arcing between models + GOLD rack
#                              trim ring + a gold orbit gimbal
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_data_ring(c, wing):
    """t2 — SMALL FUNCTIONAL ADD (the structure half; the molecule half lives in
    molecule()): a bright c DATA-LIGHT RING traced along the server-rack roof rim — a
    strip of running status LEDs ringing the rack roof, so the racks visibly read as
    'powered up' at this tier. Base palette only (c/h), modest, sits flat ON the
    existing roof so it never adds a colliding mass. Runs the full front rim (the most
    visible edge) brightly, with a few back-rim ticks to close the ring read."""
    # bright running LEDs along BOTH front roof edges (left→front, then front→right),
    # alternating c/h so it reads as a live data strip rather than a flat line.
    for k, u in enumerate([i / 14 for i in range(15)]):
        p = wing.roof_pt(u, 0.16)                  # left→front rim
        c.set(int(round(p[0])), int(round(p[1])), "c" if k % 2 == 0 else "h")
        q = wing.roof_pt(0.16, u)                  # front→top rim (the right-front edge)
        c.set(int(round(q[0])), int(round(q[1])), "h" if k % 2 == 0 else "c")
    # a couple of brighter LED ticks on the back rim too (closing the ring read)
    for u in (0.35, 0.60, 0.85):
        p = wing.roof_pt(u, 0.86)
        c.set(int(round(p[0])), int(round(p[1])), "c")


def stage3_gpu_annex(c, wing):
    """t3 — STRUCTURAL ADD: a low GPU-BLADE RACK ANNEX abutting the server wing on its
    FRONT — a secondary louvered prism in deepened-steel `b`, its lit-left face a band
    of Box.louver blade vents leaking a faint g GPU glow, growing the building OUT
    toward the viewer while staying lower than the wing. A real new structural mass
    (its own prism + roof + vents), the data-center sprouting a compute pod. Returns
    the annex Box so later stages can reference it."""
    # seat a low square rack pod ABUTTING the server wing's FRONT: its back-top corner
    # tucks right under the wing's front apex so the pod's back edges hug the wing's
    # front-bottom edge (no detached gap) while it grows toward the viewer at ground
    # level, clearly lower than the wing and biased LEFT so it never reaches the t4
    # cooling tower on the front-right. (Derived from wing.r_front, not hardcoded.)
    fx, fy = P(wing.r_front)                        # wing front apex (45,39)
    annex = Box(top=(fx - 5, fy + 1), wx=4, wy=4, h=8)   # -> back corner under the wing front
    annex.shadow(c, "K")
    # cooler/darker b-led tones so it reads as an attached compute pod, not the wing
    c.fill_poly([annex.r_top, annex.r_right, annex.r_front, annex.r_left], "b")
    c.fill_poly([annex.r_top, annex.r_left, annex.r_front], "D")     # lit roof triangle
    c.fill_poly([annex.r_left, annex.r_front, annex.w_front, annex.w_left], "D")
    c.fill_poly([annex.r_front, annex.r_right, annex.w_right, annex.w_front], "b")
    c.line(annex.r_top, annex.r_left, "M")
    c.line(annex.r_top, annex.r_right, "M")
    for a, b in [(annex.r_top, annex.r_right), (annex.r_right, annex.r_front),
                 (annex.r_front, annex.r_left), (annex.r_left, annex.r_top),
                 (annex.r_left, annex.w_left), (annex.r_front, annex.w_front),
                 (annex.r_right, annex.w_right),
                 (annex.w_left, annex.w_front), (annex.w_front, annex.w_right)]:
        c.line(a, b, "K")
    # ---- GPU-BLADE VENTS: a Box.louver band on the lit-left annex face, then a faint
    #      g glow bleeding between a couple of blades (warm GPUs inside) ----
    annex.louver(c, "left", 0.16, 0.84, 1.4, 6.8, body="b", slat="K", edge="D")
    for v in (2.6, 4.2, 5.8):                       # faint g GPU glow between blades
        c.line(annex.left_pt(0.22, v), annex.left_pt(0.78, v), "g")
    # a single brighter blade-status LED on the shaded right face
    pl = P(annex.right_pt(0.5, 3.0))
    c.set(pl[0], pl[1], "g"); c.set(pl[0], pl[1] + 1, "G")
    return annex


def stage4_cooling_tower(c, wing):
    """t4 — MAJOR ADD: a LIQUID-COOLING TOWER standing beside the racks on the front-
    RIGHT — an iso `cylinder` shell in deepened-steel `b/D` with a glowing `e` coolant-
    glow sight WINDOW and a stack of radiator FINS, capped by a fan cowl, with a short
    coolant feed pipe running into the compute mass. The prominent new vertical mass
    that says 'this cluster now runs hot and is liquid-cooled'. Palette matures: deep
    `b` shell + energized teal `e/E` coolant. Clamped to stay fully on-canvas (cx+rx
    inside x=63) and clear of the molecule overhead and the t3 annex to the left."""
    # foot on the ground to the front-RIGHT of the wing (its own slab footprint), so
    # it rises clear of the wing front and the annex. cx chosen so cx+rx <= 62.
    cx = 56
    rx = 5
    top_y = 30                                      # top ellipse sits below the molecule
    h = 17                                          # tall coolant column (bottom ~ y=52)
    cylinder(c, cx, top_y, rx, h, top="L", side_l="b", side_r="D", outline="K")
    ry = max(2.0, rx * 0.5)
    # ---- a glowing e COOLANT sight-WINDOW band on the lit-left of the shell ----
    win_y = top_y + 6
    for yy in range(win_y, win_y + 4):
        for dx in range(-rx + 1, 0):                # lit-left half only
            c.set(cx + dx, yy, "e")
        c.set(cx - rx, yy, "K")
    c.line((cx - rx + 1, win_y), (cx - 1, win_y), "E")           # bright coolant meniscus
    c.line((cx - rx + 1, win_y + 3), (cx - 1, win_y + 3), "G")   # darker sill
    # ---- radiator FINS: thin horizontal M/K rings banding the lower shell ----
    for fy in (win_y + 6, win_y + 8, win_y + 10):
        if fy < top_y + h:
            c.line((cx - rx, fy), (cx + rx, fy), "M")
            c.line((cx - rx, fy + 1), (cx + rx, fy + 1), "K")
    # ---- a fan-cowl CAP on the tower top (a darker inner ellipse + hub) ----
    for dx in range(-rx + 1, rx):
        for dy in range(int(-ry + 1), int(ry)):
            if (dx / (rx - 1)) ** 2 + (dy / max(1.0, ry - 1)) ** 2 <= 1.0:
                c.set(cx + dx, top_y + dy, "D")
    c.set(cx, top_y, "L"); c.set(cx - 1, top_y - 1, "M")          # fan hub + glint
    for a in (30, 150, 270):                                      # 3 fan blades
        import math
        bx = cx + (rx - 1) * math.cos(math.radians(a))
        by = top_y + (ry - 1) * math.sin(math.radians(a))
        c.line((cx, top_y), (bx, by), "M")
    # ---- a short coolant FEED PIPE arcing from the tower into the server wing ----
    p0 = (cx - rx, win_y + 1)                        # take-off low on the lit shell
    p1 = P(wing.right_pt(0.86, 4.0))                # into the wing's shaded-right face
    c.line(p0, (p1[0] + 2, p0[1]), "e")
    c.line((p1[0] + 2, p0[1]), p1, "D")
    c.set(p1[0], p1[1], "K"); c.set(p0[0], p0[1], "K")
    c.set((p0[0] + p1[0]) // 2, p0[1], "E")          # coolant glint in the feed run


def stage5_twin_cluster(c, gx, gy, ox, oy, nodes, bonds, shade_map):
    """t5 — CROWNING FEATURE = FULLY EVOLVED simulation cluster. The single hovering
    model DOUBLES: a full SECOND solid ball-and-stick cluster materialises off to the
    RIGHT (occupying where the faint forecast ghost was — the forecast is now realised
    as a live twin), with bright E ELECTRON-DENSITY PULSES arcing between the two
    models, and a GOLD orbit GIMBAL ring + gold node bands crowning the pair. Reads as
    elite, still recognizably the same hovering molecule signature, just doubled and
    maxed out.

    Re-anchors from the SAME source the molecule used (gx,gy + the ghost offset ox,oy)
    so the twin lands exactly where the forecast ghost was — no hardcoded 2nd guess."""
    import math
    # Twin centre sits where the forecast ghost was, nudged DOWN-RIGHT so a clear gap
    # opens between the two models (the primary's right nodes reach ~gx+8; this keeps
    # the twin's left nodes clear of them). Re-derived from gx,gy + the ghost offset.
    tx, ty = gx + ox + 3, gy + oy + 4               # twin cluster centre (down-right of ghost slot)
    # a COMPACT twin pose (pulled-in branches + smaller radii) so the second cluster
    # reads as its own tight model in the limited space, not a sprawl that merges with
    # the primary. Violet accents swapped L/R = a distinct-but-related conformation.
    tnodes = {
        "C":  (0, 0, 2.0, "g"),
        "v1": (-4, -3, 1.5, "o"),                   # violet accents swapped L/R
        "v2": (4, -2, 1.4, "O"),
        "b1": (4, 3, 1.5, "c"),
        "w1": (-4, 2, 1.3, "W"),
        "g1": (0, 4, 1.3, "g"),                     # the grown 6th node, on the twin too
    }
    tbonds = [("C", "v1"), ("C", "v2"), ("C", "b1"), ("C", "w1"), ("C", "g1")]
    # ---- BOND STICKS of the twin (drawn first; spheres overlap their ends) ----
    for a, b in tbonds:
        p0 = (tx + tnodes[a][0], ty + tnodes[a][1])
        p1 = (tx + tnodes[b][0], ty + tnodes[b][1])
        c.line(p0, p1, "M")
        c.line((p0[0], p0[1] - 1), (p1[0], p1[1] - 1), "L")
        c.line((p0[0], p0[1] + 1), (p1[0], p1[1] + 1), "K")
    # ---- ATOM SPHERES of the twin (back→front) ----
    for key in ["v1", "v2", "C", "b1", "w1", "g1"]:
        dx, dy, rr, col = tnodes[key]
        cxp, cyp = tx + dx, ty + dy
        if cyp - rr < 0:                            # safety: keep fully on-canvas
            continue
        disc(c, cxp, cyp, rr, rr * 0.92, col, rim="K", hi="h", shade=shade_map.get(col))

    # ---- ONE bold, clean E ELECTRON-DENSITY ARC bridging the GAP between the two
    #      model centres (a single bright bowed pulse reads far better at 64px than a
    #      tangle of arcs). A couple of E density beads pulse along it. ----
    a0 = (gx + 8, gy + 1)                            # off the primary cluster's right edge
    a1 = (tx - 5, ty - 1)                           # into the twin cluster's left edge
    bridge = [a0, (int((a0[0] + a1[0]) / 2), int((a0[1] + a1[1]) / 2) - 3), a1]
    for i in range(len(bridge) - 1):
        c.line(bridge[i], bridge[i + 1], "E")
    for px, py in bridge:                            # soft e under-glow on the arc
        c.set(px, py + 1, "e")
    midx, midy = int((a0[0] + a1[0]) / 2), int((a0[1] + a1[1]) / 2) - 3
    c.set(midx, midy, "W"); c.set(midx - 2, midy + 1, "E"); c.set(midx + 2, midy + 1, "E")

    # --- GOLD premium trim (t5 flourish only) ---
    # a single clean gold ORBIT GIMBAL ellipse girdling BOTH clusters (the elite
    # simulation frame). Centre is the midpoint of the two models; the radii just
    # enclose the pair with a small margin. Drawn with a FINE angular step so it reads
    # as a continuous thin gold hoop, not a scatter of dots, and clamped on-canvas.
    ccx = (gx + tx) // 2                            # centre between the two models
    ccy = (gy + ty) // 2 - 1
    grx, gry = 13, 7
    for a in range(0, 360, 9):
        x = ccx + grx * math.cos(math.radians(a))
        y = ccy + gry * math.sin(math.radians(a))
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < 64 and 1 <= yi < 64:
            c.set(xi, yi, "q")
    # two gold gimbal PIVOT bosses on the ring's left/right extremes (the gimbal axis)
    c.set(max(0, ccx - grx), ccy, "O"); c.set(min(63, ccx + grx), ccy, "O")
    c.set(max(0, ccx - grx), ccy - 1, "q"); c.set(min(63, ccx + grx), ccy + 1, "q")


def stage5_rack_trim(c, wing, annex):
    """t5 GOLD rack trim (structure half of the crowning flourish): a thin gold trim
    RING along the server-wing roof rim + the GPU-annex roof rim, dressing the racks
    as elite hardware. Gold (q) only — a sparse premium accent, never a recolor."""
    # gold trim along the wing front roof rim (over the t2 data-light ring)
    for u in [i / 8 for i in range(9)]:
        p = wing.roof_pt(u, 0.06)
        c.set(int(round(p[0])), int(round(p[1])), "q" if int(u * 8) % 2 == 0 else "O")
    # gold trim along the GPU-annex roof front rim too
    if annex is not None:
        for u in (0.1, 0.4, 0.7, 1.0):
            p = annex.roof_pt(u, 0.10)
            c.set(int(round(p[0])), int(round(p[1])), "q")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the computational-chemistry-hub at upgrade `stage` (1..5). Stage 1 is
    IDENTICAL to the shipped base; each higher stage keeps every prior addition and
    bolts on the next (t2 data-ring + grown molecule → t3 GPU-annex → t4 cooling-tower
    → t5 twin-cluster + gold). Painter's order keeps rooftop/overhead additions on top
    of the masses they grow from; the hovering molecule (with its cumulative extra
    node and t5 twin) stays the front-most hero, drawn LAST."""
    c = Canvas()
    # painter's order (BASE, unchanged): taller compute core (back) + its data strip,
    # its parapet, then the lower server wing (front-right) + louvers + plain left,
    # then the LEFT operator-room hero opening, the rooftop mechanicals.
    core = compute_core(c)
    core_parapet(c, core)
    wing = server_wing(c)
    wing_louvers(c, wing)
    wing_left_plain(c, wing)
    operator_room(c, core)
    emitter = rooftop(c, core)

    # --- CUMULATIVE UPGRADE STAGES (rack/cooling structure, drawn before the molecule
    #     so the hovering model stays front-most) -------------------------------------
    annex = None
    if stage >= 2:
        stage2_data_ring(c, wing)
    if stage >= 3:
        annex = stage3_gpu_annex(c, wing)
    if stage >= 4:
        stage4_cooling_tower(c, wing)
    if stage >= 5:
        stage5_rack_trim(c, wing, annex)

    # the hovering ball-and-stick molecule signature is ALWAYS the front-most hero
    # (drawn last). It carries its OWN cumulative upgrades (t2 extra node + brighten,
    # t5 twin-cluster) keyed off `stage`.
    molecule(c, emitter, stage)
    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/chemworks"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "computational-chemistry-hub"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped base PNG, so it does NOT overwrite the base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": CHEM, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"chemworks_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"chemworks_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
