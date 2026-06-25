#!/usr/bin/env python3
"""
Materials Testing Bay — ChemWorks economy building (BESPOKE open-portal bay).

NOT the gateway cube. NOT the Volt Mechanical Testing Rig (that was a bare TALL
skeletal four-post load-frame crushing a specimen). NOT the Volt Robotics roll-up
hangar (arm waving out of a roll-up door). The silhouette here is a ROOFED,
WALLED OPEN-FRONTED TESTING BAY: a tall portal-frame box whose SHADED RIGHT face
is carved into a deep open recess (you see straight into a glowing violet
interior), capped by a low flat slab roof and a gantry beam across the mouth,
with a lower CLOSED INSTRUMENT ANNEX abutting the LIT LEFT side carrying a cyan
diagnostic readout. A thin cyan cooling pipe links the two roofs.

The hero (one-of-one in the catalog): inside the open bay, a clamped metal coupon
hangs half-submerged in a glass corrosion tank — its dry upper half clean L/W, its
immersed lower half eaten into a ragged pitted d/r edge, a stream of h/W reaction
bubbles fizzing off it through a violet o/O reagent glow, and a round diagnosis
gauge whose o needle has dropped into a red r failure zone.

Composed entirely from art/isobuild.Box + Canvas primitives. No draw_cube /
base_windows. ChemWorks palette only (blue-grey walls, BLUE glass, VIOLET glow).
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


# ── low-level pixel helpers ───────────────────────────────────────────────────
def _rect(c, x0, y0, x1, y1, fill=None, outline=None):
    if x0 > x1:
        x0, x1 = x1, x0
    if y0 > y1:
        y0, y1 = y1, y0
    if fill is not None:
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                c.set(x, y, fill)
    if outline is not None:
        for x in range(int(x0), int(x1) + 1):
            c.set(x, int(y0), outline)
            c.set(x, int(y1), outline)
        for y in range(int(y0), int(y1) + 1):
            c.set(int(x0), y, outline)
            c.set(int(x1), y, outline)


def _disk_ring(c, p, r, fill, ring="K"):
    x, y = int(round(p[0])), int(round(p[1]))
    for dy in range(-r - 1, r + 2):
        for dx in range(-r - 1, r + 2):
            d2 = dx * dx + dy * dy
            if d2 <= r * r + 1:
                c.set(x + dx, y + dy, fill)
            elif d2 <= (r + 1) * (r + 1) + 1:
                c.set(x + dx, y + dy, ring)


# ── the closed instrument annex (LIT LEFT, lower, plainer) ────────────────────
def annex(c):
    """A lower closed box abutting the LEFT of the bay — M/D walls, flat parapet,
    a c/g diagnostic readout window with two dials on the lit left face. Drawn
    FIRST (back/left) so the taller bay in front occludes its right flank. Pushed
    well out to the LEFT and made taller so it reads as a clearly separate mass,
    not a sliver behind the bay."""
    a = Box((16, 24), wx=7, wy=8, h=15)
    a.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # flat parapet lip along the back roof edges (a closed-box cap, no gantry)
    c.line(a.r_top, a.r_left, "W")
    c.line(a.r_top, a.r_right, "L")
    # ── diagnostic readout window on the LIT left face: cyan screen ──
    a.window(c, "left", 0.18, 0.78, 3.0, 8.5, glass="g", hi="h", shade="G", frame="K")
    # one bright readout band + a couple of diagnostic dials on the screen
    c.line(a.left_pt(0.24, 5.0), a.left_pt(0.72, 5.0), "c")
    c.line(a.left_pt(0.24, 5.9), a.left_pt(0.58, 5.9), "h")
    # two small dial pips on the screen face
    for f, vy in ((0.30, 7.0), (0.50, 7.0)):
        dx, dy = a.left_pt(f, vy)
        c.set(int(round(dx)), int(round(dy)), "O")
        c.set(int(round(dx)), int(round(dy)) + 1, "o")
    # an o status lamp on the upper bezel
    lx, ly = a.left_pt(0.70, 3.6)
    c.set(int(round(lx)), int(round(ly)), "o")
    return a


# ── the open-fronted testing bay (tall portal box; RIGHT face carved open) ────
def bay(c):
    """The tall portal-frame box. We draw the full box, then CARVE the shaded
    RIGHT face into a deep open recess: a darker d/G interior back wall, a violet
    glow, framed by thick M/D portal columns and a K lintel, with a low flat slab
    roof and a D gantry beam across the open mouth. Returns the Box + the screen
    rect of the open mouth (so the hero tank sits inside it)."""
    # narrower in wy (shallower) + a bit taller so the RIGHT face is a big tall
    # portal plane that we can carve almost fully open — reads as an open bay, not
    # a cube. Shifted right so the annex clears it on the left.
    b = Box((36, 12), wx=11, wy=7, h=21)
    # full solid box first (roof + both walls + outline)
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # low flat SLAB roof read: a bright back edge + a thin D lip along the front
    # roof seams so the cap reads as a flat industrial slab, not a peaked roof.
    c.line(b.r_left, b.r_front, "M")     # roof front-left seam
    c.line(b.r_front, b.r_right, "d")    # roof front-right seam (shaded)
    # rivet studs along the lit roof crest
    for f in (0.25, 0.5, 0.75):
        rx, ry = b.roof_pt(f, 0.5)
        c.set(int(round(rx)), int(round(ry)), "W")

    # ── CARVE the open recess into the RIGHT (shaded) face ──
    # u runs r_front→r_right; v runs down the 19px face. Leave thick portal
    # columns L/R and a K lintel at top; floor sits low.
    uL, uR = 0.10, 0.92          # inside edges of the portal columns (thin frame)
    vT, vB = 1.6, 20.5           # lintel underside .. bay floor (full-height portal)
    # interior BACK wall: dark d, with a G lower band (deeper shade) so the recess
    # reads as a real cavity behind the front plane.
    recess = [b.right_pt(uL, vT), b.right_pt(uR, vT),
              b.right_pt(uR, vB), b.right_pt(uL, vB)]
    c.fill_poly(recess, "d")
    # lower interior band (floor-ward) a touch deeper
    c.fill_poly([b.right_pt(uL, vT + 7.5), b.right_pt(uR, vT + 7.5),
                 b.right_pt(uR, vB), b.right_pt(uL, vB)], "G")
    # VIOLET interior GLOW washing the back wall directly BEHIND the tank (centre-
    # right of the mouth, keyed off the floor vB) — a tall soft column of light so
    # the open shaded recess clearly reads as a lit interior, no full-width stripe.
    c.fill_poly([b.right_pt(0.40, vB - 14.0), b.right_pt(uR - 0.06, vB - 14.0),
                 b.right_pt(uR - 0.06, vB - 2.0), b.right_pt(0.40, vB - 2.0)], "r")
    c.fill_poly([b.right_pt(0.50, vB - 12.5), b.right_pt(uR - 0.14, vB - 12.5),
                 b.right_pt(uR - 0.14, vB - 3.5), b.right_pt(0.50, vB - 3.5)], "o")
    # a soft violet up-spill higher in the recess so the whole interior glows
    c.fill_poly([b.right_pt(0.42, vT + 2.5), b.right_pt(uR - 0.12, vT + 2.5),
                 b.right_pt(uR - 0.12, vT + 6.0), b.right_pt(0.42, vT + 6.0)], "r")
    # bright instrument light high on the back wall (a c puck casting the glow)
    glx, gly = b.right_pt(0.58, vT + 3.0)
    c.set(int(round(glx)), int(round(gly)), "O")
    c.set(int(round(glx)) - 1, int(round(gly)), "c")
    c.set(int(round(glx)) + 1, int(round(gly)), "c")

    # ── thick portal columns framing the mouth — a steel frame that catches light
    #    so the OPENING reads as a real cut-through, not a darker panel ──
    # left column (nearer the front corner, lit) = bright M with an L highlight edge
    for vv in range(int(vT) - 1, int(vB) + 1):
        lx, ly = b.right_pt(uL, vv)
        c.set(int(round(lx)) - 2, int(round(ly)), "L")   # lit highlight flange
        c.set(int(round(lx)) - 1, int(round(ly)), "M")   # column body
        c.set(int(round(lx)), int(round(ly)), "K")       # K inner edge (recess lip)
    # right column (back, deeper, shaded) = D with a d/K inner edge
    for vv in range(int(vT) - 1, int(vB) + 1):
        rx, ry = b.right_pt(uR, vv)
        c.set(int(round(rx)), int(round(ry)), "K")       # K inner edge (recess lip)
        c.set(int(round(rx)) + 1, int(round(ry)), "D")   # column body
        c.set(int(round(rx)) + 2, int(round(ry)), "d")   # shaded far flange
    # heavy K lintel across the top of the mouth (2px) + lit M underside flange so
    # the lintel reads as a beam over the opening
    c.line(b.right_pt(uL, vT), b.right_pt(uR, vT), "K")
    c.line(b.right_pt(uL, vT + 0.7), b.right_pt(uR, vT + 0.7), "K")
    c.line(b.right_pt(uL, vT + 1.5), b.right_pt(uR, vT + 1.5), "M")
    # K threshold at the floor
    c.line(b.right_pt(uL, vB), b.right_pt(uR, vB), "K")

    # ── o HAZARD CHEVRON striping along the bay floor lip of the mouth ──
    steps = 18
    for s in range(steps):
        t = s / (steps - 1)
        cxp = b.right_pt(uL, vB - 1)[0] + t * (b.right_pt(uR, vB - 1)[0] - b.right_pt(uL, vB - 1)[0])
        cyp = b.right_pt(uL, vB - 1)[1] + t * (b.right_pt(uR, vB - 1)[1] - b.right_pt(uL, vB - 1)[1])
        c.set(int(round(cxp)), int(round(cyp)), "o" if s % 2 == 0 else "K")

    # ── a small hanging hook dropping from the lintel over the tank (holds the
    #    coupon clamp) — a short D/L rod so the coupon reads as suspended ──
    hx, hy = b.right_pt(0.56, vT + 2.2)
    c.set(int(round(hx)), int(round(hy)), "D")
    c.set(int(round(hx)), int(round(hy)) + 1, "L")

    return b, {"uL": uL, "uR": uR, "vT": vT, "vB": vB}


# ── the hero: clamped coupon corroding in a glass tank + diagnosis gauge ──────
def corrosion_test(c, b, m):
    """Inside the open bay mouth: a c/h glass tank half-filled with g/G reagent;
    a clamped M/D metal coupon hangs from the gantry, dry upper half clean L/W,
    submerged lower half eaten into a ragged d/r pitted edge; h/W reaction bubbles
    fizz off it through a violet reaction glow; a round gauge on the tank reads a
    failing property with its o needle dropped into a red r zone."""
    # anchor the tank a touch RIGHT of mouth-centre so it sits clearly inside the
    # dark recess (not on the lit wall) and on the bay floor.
    fx, fy = b.right_pt(0.56, m["vB"] - 2.0)
    cx = int(round(fx))
    floor_y = int(round(fy))

    # ── glass TANK: a clean c/h box half-filled with g/G reagent (the hero glass)
    tw = 4                     # half-width (a tidy, legible vessel)
    t_top = floor_y - 12       # tank rim
    t_bot = floor_y           # tank base on the floor
    water_y = t_top + 6        # reagent waterline (a bit over half)
    # upper EMPTY glass (above waterline): translucent c body
    _rect(c, cx - tw + 1, t_top + 1, cx + tw - 1, water_y - 1, fill="c")
    # reagent fill (lower half): G body + a lit g near (left) edge column
    _rect(c, cx - tw + 1, water_y, cx + tw - 1, t_bot - 1, fill="G")
    _rect(c, cx - tw + 1, water_y, cx - tw + 2, t_bot - 1, fill="g")
    # violet reaction glow suspended in the reagent right around the coupon
    _rect(c, cx, water_y + 1, cx + tw - 1, t_bot - 2, fill="o")
    c.set(cx + 1, water_y + 2, "O")
    c.set(cx + 1, t_bot - 3, "O")
    # waterline + h meniscus (with bright W corners)
    c.line((cx - tw + 1, water_y), (cx + tw - 1, water_y), "h")
    c.set(cx - tw + 1, water_y, "W")
    # lit left glass edge + glass rim highlight
    c.line((cx - tw + 1, t_top + 1), (cx - tw + 1, t_bot - 1), "h")
    c.line((cx - tw, t_top), (cx + tw, t_top), "h")
    # tank K outline
    _rect(c, cx - tw, t_top, cx + tw, t_bot, outline="K")

    # ── the clamped COUPON: a 2px bar hung from above, clean top / corroded bottom
    bx = cx + 1                # the bar hangs on the right side of the tank centre
    # clamp head at the rim (grips the dry bar) — sits just above the rim
    _rect(c, bx - 1, t_top - 3, bx + 1, t_top - 1, fill="M", outline="K")
    c.set(bx, t_top - 4, "L")
    # DRY upper half (above water): clean L bar with a W lit edge
    for yy in range(t_top - 1, water_y):
        c.set(bx, yy, "L")
        c.set(bx - 1, yy, "W")
    # SUBMERGED lower half: corroding — d core eaten into a ragged r pitted edge
    for yy in range(water_y, t_bot - 1):
        c.set(bx - 1, yy, "d")
        c.set(bx, yy, "r")             # etched right edge gone violet-dark
    # ragged PITTING bites out of the submerged bar (r flecks knocked off)
    for px, py in [(bx, water_y + 1), (bx - 1, water_y + 3), (bx, water_y + 5)]:
        c.set(px, py, "r")
    # the eaten TIP reacting hot (the failing coupon)
    c.set(bx, t_bot - 2, "O")
    c.set(bx - 1, t_bot - 2, "o")

    # ── REACTION FIZZ: a tidy diagonal stream of h/W bubbles off the corroding bar
    bubbles = [(bx + 1, water_y - 1), (bx + 1, water_y + 2), (bx + 2, t_top + 2),
               (bx + 1, t_top + 4)]
    for bbx, bby in bubbles:
        c.set(bbx, bby, "h")
    c.set(bx + 2, t_top, "W")           # one bright bubble breaking the surface
    c.set(bx + 2, t_top - 2, "h")       # a bubble escaping above the rim

    # ── DIAGNOSIS GAUGE in the UPPER-LEFT of the recess, against the glow, on a
    #    bracket from the left portal column: small dial, needle dropped to RED ──
    gx = cx - tw - 4
    gy = t_top - 3
    if gx < int(round(b.right_pt(m["uL"], 0)[0])) + 2:   # keep it inside the mouth
        gx = int(round(b.right_pt(m["uL"], 0)[0])) + 3
    # short M bracket from the gauge across to the tank rim
    c.line((gx + 2, gy + 1), (cx - tw, t_top + 1), "M")
    _disk_ring(c, (gx, gy), 2, fill="c", ring="K")       # small cyan dial face
    # r REDLINE arc across the lower quadrant (property FAILING)
    for ang in range(40, 141, 25):
        rx = gx + 2 * math.cos(math.radians(ang))
        ry = gy + 2 * math.sin(math.radians(ang))
        c.set(int(round(rx)), int(round(ry)), "r")
    # the o needle dropped DOWN into the red zone + r hub
    c.set(gx, gy, "r")
    c.set(gx - 1, gy + 1, "o")
    c.set(gx, gy + 1, "O")


# ── the cooling pipe linking annex roof to bay roof ───────────────────────────
def cooling_pipe(c, a, b):
    """A thin c cooling pipe running from the annex parapet up onto the bay roof —
    ties the two masses together (a ChemWorks plumbing motif)."""
    p0 = a.roof_pt(0.5, 0.85)
    p1 = b.roof_pt(0.18, 0.55)
    x0, y0 = int(round(p0[0])), int(round(p0[1]))
    x1, y1 = int(round(p1[0])), int(round(p1[1]))
    # elbowed pipe: up off the annex, across, into the bay roof
    c.line((x0, y0), (x0, y0 - 4), "c")
    c.line((x0, y0 - 4), (x1, y0 - 4), "c")
    c.line((x1, y0 - 4), (x1, y1), "c")
    # h highlight along the top run + K underside
    c.line((x0, y0 - 5), (x1, y0 - 5), "h")
    c.line((x0 + 1, y0 - 3), (x1, y0 - 3), "K")
    # a small g coupling collar mid-run
    c.set((x0 + x1) // 2, y0 - 4, "g")


def build():
    c = Canvas()
    a = annex(c)                  # closed instrument annex (back-left), drawn first
    b, m = bay(c)                 # tall open-portal bay carved open on the RIGHT
    cooling_pipe(c, a, b)         # thin cyan pipe linking the two roofs
    corrosion_test(c, b, m)       # hero: clamped coupon corroding in a glass tank
    spec = {"width": 64, "height": 64, "palette": CHEM, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/chemworks_materials-testing-bay.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
