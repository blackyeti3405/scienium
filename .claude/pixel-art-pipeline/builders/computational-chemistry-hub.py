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

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box

CHEM = {"K": "#161a2e", "W": "#e6ecfb", "L": "#c2cdee", "M": "#9aa8d8", "D": "#6f7cb0", "d": "#4b5688",
        "h": "#d6ecff", "c": "#a8d4ff", "g": "#4aa0e6", "G": "#2166b0",
        "o": "#c89cf0", "O": "#e0c2ff", "r": "#6a34a8"}


# ── small pixel helpers ──────────────────────────────────────────────────────
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
def molecule(c, emitter):
    """A translucent slowly-rotating BALL-AND-STICK MOLECULE hovers above the roof:
    a small 3D cluster of coloured atom spheres (violet O/o accents, blue c/g/G,
    light W/L) joined by short M/L bond sticks, each sphere with an h highlight + K
    rim — overlaid with a faint translucent c/h GHOST copy of its predicted next
    conformation offset to one side, with a thin O arrow from the solid model to the
    ghost (the forecast). A faint c orbit ellipse + index tick sells slow rotation; a
    thin o/O beam rises from the emitter; a soft c glow halo + h sparkles. The
    one-of-one signature of the ChemWorks set."""
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

    # ===== PREDICTED-POSE GHOST (drawn FIRST, behind the solid model) ============
    # a faint translucent c/h copy of the whole cluster offset clearly to the RIGHT
    # (a slightly rotated forecast conformation). Ghost bonds = faint c sticks; ghost
    # atoms = hollow h/c rim circles, so it reads as a second, fainter molecule.
    # The ghost is rotated a touch (branch angles nudged) = the predicted fold.
    gnodes = {
        "C":  (0, 0, 2.4, ),
        "v1": (-5, -4, 1.9),          # nudged = forecast rotation
        "v2": (6, -2, 1.7),
        "b1": (5, 4, 1.8),
        "w1": (-6, 2, 1.5),
    }
    # ghost bond sticks (faint c rods)
    for a, b in bonds:
        p0 = (gx + gnodes[a][0] + ox, gy + gnodes[a][1] + oy)
        p1 = (gx + gnodes[b][0] + ox, gy + gnodes[b][1] + oy)
        c.line(p0, p1, "c")
    # ghost atoms = small SOLID faint-blue discs with an h glint = translucent twin
    for key, (dx, dy, rr) in gnodes.items():
        cx, cy = gx + dx + ox, gy + dy + oy
        disc(c, cx, cy, rr - 0.2, (rr - 0.2) * 0.9, "c", rim="g", hi="h")

    # ===== a bright O ARROW from the solid model to the ghost (the prediction) =====
    # drawn AFTER the ghost so it sits clearly on top of it; the solid atoms overlap
    # its tail. Reads as: solid pose --predict--> forecast pose.
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
    # ATOM SPHERES on the bond ends, back (upper) -> front order
    order = ["v1", "v2", "C", "b1", "w1"]
    shade_map = {"g": "G", "O": "o", "o": "r", "c": "g", "W": "L"}
    for key in order:
        dx, dy, rr, col = nodes[key]
        cx, cy = gx + dx, gy + dy
        disc(c, cx, cy, rr, rr * 0.92, col, rim="K", hi="h", shade=shade_map.get(col))

    # --- a couple of h sparkles selling the premium hologram ---
    c.set(gx - 8, gy - 5, "h")
    c.set(gx - 1, gy - 8, "h")
    c.set(gx + ox + 8, gy + oy + 5, "c")


# ── assemble + emit ──────────────────────────────────────────────────────────
def main():
    c = Canvas()
    # painter's order: taller compute core (back) + its data strip, its parapet, then
    # the lower server wing (front-right) + louvers + plain left, then the LEFT
    # operator-room hero opening, the rooftop mechanicals, and finally the floating
    # ball-and-stick molecule last (in front of all).
    core = compute_core(c)
    core_parapet(c, core)
    wing = server_wing(c)
    wing_louvers(c, wing)
    wing_left_plain(c, wing)
    operator_room(c, core)
    emitter = rooftop(c, core)
    molecule(c, emitter)

    spec = {"width": 64, "height": 64, "palette": CHEM, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/chemworks_computational-chemistry-hub.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    main()
