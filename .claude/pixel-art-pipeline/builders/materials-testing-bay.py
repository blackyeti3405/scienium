#!/usr/bin/env python3
"""
Materials Testing Bay — ChemWorks economy building (BESPOKE open-portal bay) +
its 4-stage UPGRADE-EVOLUTION sprites.

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

UPGRADE EVOLUTION (cumulative — the single-column test bay grows into a built-out
twin-post load-frame works; the load-testing theme intensifies; gold is a t5
flourish). The shaded RIGHT face is the OPEN MOUTH that holds the hero, so every
add grows UP / along the columns / onto the LIT-LEFT flank and NEVER drops into
the mouth over the corroding coupon (the hero stays the front-most, drawn LAST):
  t2  small functional add : a compact REAGENT-FUME EXTRACTION STACK rising off the
                             back-left main roof (an e-glow extraction fan at its foot
                             venting the test bay) — a modest add that EXTENDS the
                             silhouette above the roofline, clear of the open mouth
  t3  structural add       : a SECOND LOAD COLUMN rising off the bay's front corner,
                             joined to the existing rig by a CROSS-HEAD BEAM spanning
                             the mouth top — a twin-post load frame (b columns)
  t4  major add            : a HYDRAULIC POWER-PACK (a cylinder accumulator + pump
                             housing) on the LIT-LEFT flank feeding glowing e rams up
                             the two columns (the rig now actually drives load)
  t5  crowning feature     : a glass ENVIRONMENTAL TEST CHAMBER mounted on the
                             cross-head over a crushed E-stress-glow specimen + a
                             redlined master gauge + q gold frame caps on the beam
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder  # noqa: F401  (cylinder used by the t4 power-pack)

# Base ChemWorks palette (shared keys) + the EVOLVED accent shades reserved for the
# upgrade stages only (they appear in NO stage-1 helper, so materials-testing-bay.png
# is unchanged). These exact keys+hexes are the lab-wide chemworks evolved accents:
#   b  deepened structure steel — matured tone for the t3+ new columns / masses
#   e  energized reagent glow (mid)   E  energized reagent glow (bright) — t4/t5 power
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
CHEM = {"K": "#161a2e", "W": "#e6ecfb", "L": "#c2cdee", "M": "#9aa8d8", "D": "#6f7cb0", "d": "#4b5688",
        "h": "#d6ecff", "c": "#a8d4ff", "g": "#4aa0e6", "G": "#2166b0",
        "o": "#c89cf0", "O": "#e0c2ff", "r": "#6a34a8",
        "b": "#363c5e", "e": "#36e0c8", "E": "#c2fff2", "q": "#f0c64a"}

# Height (px) of the upgrade load-frame columns ABOVE the bay roof front edge. Defined
# ONCE here because stage3_twin_column (which raises the columns + cross-head),
# stage4_hydraulics (which runs rams up to the SAME column tops) and
# stage5_test_chamber (which seats the glass cell on the SAME cross-head) must all
# derive the column tops from the identical source — never a hardcoded 2nd guess.
# Tuned so the cross-head + chamber + finial land fully on-canvas (cross-head ~row 6,
# chamber roof ~row 1, master gauge just inside y=0).
COLUMN_RISE = 13


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


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION shared geometry — the LOAD-FRAME columns.
#
# The base rig has ONE load apparatus (the hook+coupon) hanging at the TOP of the
# open mouth on the near/left portal column. The evolution grows that into a TWIN-
# POST LOAD FRAME: an EXISTING-column top (over the mouth's near portal) and a NEW
# second column rising off the bay's FRONT corner, joined by a cross-head beam.
# t3 raises the frame, t4 runs rams up BOTH posts, t5 seats a chamber on the beam —
# all three recompute the SAME post tops + cross-head from this one helper so a
# higher stage never re-guesses where a lower stage put a part.
# ═══════════════════════════════════════════════════════════════════════════════
def _frame_geometry(b, m):
    """Return the load-frame anchor points (all in screen space), recomputed from the
    bay Box `b` + mouth dict `m` so every stage agrees. The two posts rise from the
    bay's FRONT-RIGHT roof EDGE, one directly above each PORTAL COLUMN of the open
    mouth, so the frame STRADDLES the opening (the hero tank sits between/below them,
    never occluded):
        front (foot,top) : the original load path — above the NEAR (front, uL) portal
                           column, nearer the viewer / lower on screen.
        back  (foot,top) : the NEW second column — above the FAR (back, uR) portal
                           column, deeper / higher on screen. The twin post.
        cross (a,b)      : the cross-head beam joining the two post tops (front→back),
                           an iso-tilted load beam crossing the mouth top.
    Tops are COLUMN_RISE px above each foot, clamped on-canvas."""
    # the front-right roof edge runs r_front -> r_right; param t aligns with the
    # mouth's u on the shaded face. Seat each post foot on that edge, just inboard of
    # the two portal columns (uL=0.10, uR=0.92) so they cap the actual portals.
    def edge(t):
        return (b.r_front[0] + t * (b.r_right[0] - b.r_front[0]),
                b.r_front[1] + t * (b.r_right[1] - b.r_front[1]))
    ff = edge(m["uL"] + 0.02)                 # above the NEAR/front portal (~x45)
    bf = edge(m["uR"] - 0.04)                 # above the FAR/back portal  (~x56)
    front_foot = (int(round(ff[0])), int(round(ff[1])))
    back_foot = (int(round(bf[0])), int(round(bf[1])))
    front_top = (front_foot[0], max(1, front_foot[1] - COLUMN_RISE))
    back_top = (back_foot[0], max(1, back_foot[1] - COLUMN_RISE))
    return {
        "front_foot": front_foot, "front_top": front_top,
        "back_foot": back_foot, "back_top": back_top,
        "cross": (front_top, back_top),
    }


def stage2_fume_extractor(c, b, m):
    """t2 — SMALL FUNCTIONAL ADD: a compact REAGENT-FUME EXTRACTION STACK rising off
    the BACK-LEFT main roof — a short steel duct that draws the corrosion/stress-test
    fumes up out of the open bay. A modest on-theme element that actually EXTENDS the
    silhouette above the roofline (the prior version sat inside the open mouth and was
    fully occluded by the hero tank — a no-op).

    Body in the matured deep-steel `b` (a NEW evolved-accent char, legible against the
    light L/M roof), with an M lit near-edge + K outline and a flared vent cowl cap. A
    small energized `e` EXTRACTION-FAN glow band sits at the duct foot (the live intake)
    and a single bright `E` vapor bead escapes the cowl — the first hit of the energized
    teal accent the rig will run on. Seated on the back-left roof deck, well LEFT of the
    twin-column foot zone (x>=46), RIGHT of the cooling pipe (x~34), and ABOVE the t4
    feed-line which hugs the front roof edge — so no higher stage paints over it and it
    never reaches the shaded-right test rack / hero mouth."""
    # anchor the duct foot on the back-left roof deck, clear of every neighbour.
    fx, fy = b.roof_pt(0.36, 0.45)
    sx = int(round(fx))                # duct centre x (~37)
    base_y = int(round(fy))            # duct foot on the roof (~20)
    top_y = base_y - 10                # stack rises ~10px above the deck (clamped >0)
    # ── the duct BODY: 3px-wide b column, an M lit near-edge (left) + a K outline so
    #    the dark stack reads cleanly as a new vertical mass on the light roof ──
    for yy in range(top_y, base_y + 1):
        c.set(sx - 1, yy, "M")         # lit near (left) flange
        c.set(sx, yy, "b")             # deep-steel body
        c.set(sx + 1, yy, "K")         # shaded right edge / outline
    c.set(sx - 1, base_y + 1, "K")     # foot seat on the roof
    c.set(sx, base_y + 1, "K")
    # two D corrugation bands girdling the duct (a fabricated steel stack read)
    for yy in (base_y - 3, base_y - 6):
        c.set(sx - 1, yy, "D")
        c.set(sx, yy, "D")
    # ── a flared VENT COWL cap (wider lip) on top so it reads as an extraction hood ──
    c.set(sx - 2, top_y, "M"); c.set(sx - 1, top_y, "L")
    c.set(sx, top_y, "M"); c.set(sx + 1, top_y, "D"); c.set(sx + 2, top_y, "D")
    c.set(sx - 2, top_y - 1, "K"); c.set(sx + 2, top_y - 1, "K")
    c.set(sx - 1, top_y - 1, "M"); c.set(sx, top_y - 1, "M"); c.set(sx + 1, top_y - 1, "D")
    for dx in range(-2, 3):            # K cowl rim
        c.set(sx + dx, top_y - 2, "K")
    # ── an energized `e` EXTRACTION-FAN glow band at the duct foot (the live intake
    #    drawing fumes up out of the bay) + a bright `E` core pip ──
    for dx in (-1, 0, 1):
        c.set(sx + dx, base_y - 1, "e")
    c.set(sx, base_y - 1, "E")         # bright fan hub
    c.set(sx - 2, base_y - 1, "K"); c.set(sx + 2, base_y - 1, "K")  # fan housing edges
    # ── a single bright `E` vapor bead escaping the cowl (the extracted fume) ──
    c.set(sx, top_y - 4, "e")
    c.set(sx + 1, top_y - 5, "E")


def stage3_twin_column(c, b, m):
    """t3 — STRUCTURAL ADD: a SECOND LOAD COLUMN rising off the bay's FRONT roof
    corner, joined to the original near post by a CROSS-HEAD BEAM spanning the top of
    the open mouth — turning the single-column rig into a proper TWIN-POST LOAD
    FRAME. A real new structural mass (two posts + a spanning beam) standing proud of
    the roofline, framing (NOT covering) the open mouth. Introduces the matured
    deep-steel tone `b` for the new structure."""
    g = _frame_geometry(b, m)
    # ── the two posts: 2px b columns with a lit M near-edge + K outline. The FRONT
    #    post (nearer/lower) gets the brighter lit flange; the BACK post (deeper) is
    #    shaded. Each rises straight up from its roof-edge foot above a portal. ──
    for foot, top, body, lit in ((g["back_foot"], g["back_top"], "D", "b"),   # back: shaded
                                 (g["front_foot"], g["front_top"], "b", "M")):  # front: lit
        x = foot[0]
        c.line((x, foot[1]), (x, top[1]), body)                # post body (2px)
        c.line((x + 1, foot[1]), (x + 1, top[1]), "K")         # K shaded right edge
        c.line((x - 1, foot[1]), (x - 1, top[1]), lit)         # lit near flange
        c.set(x, top[1] - 1, "K")                              # post head cap
        c.set(x, foot[1], "K")                                 # foot seat on roof
    # ── the CROSS-HEAD BEAM joining the post tops (front→back, an iso-tilted load
    #    beam crossing the mouth top) ──
    a_pt, b_pt = g["cross"]                                     # a=front top, b=back top
    c.line((a_pt[0], a_pt[1] - 1), (b_pt[0], b_pt[1] - 1), "M")   # lit top chord
    c.line(a_pt, b_pt, "b")                                       # beam body
    c.line((a_pt[0], a_pt[1] + 1), (b_pt[0], b_pt[1] + 1), "K")   # under-edge shadow
    for ex, ey in (a_pt, b_pt):                                   # bright corner gussets
        c.set(ex, ey - 1, "L")
    # ── crisp TOP-CORNER GUSSET triangles where each post meets the beam (reads as
    #    rigid welded steelwork, not a leaning ladder) ──
    fx_t, bx_t = a_pt, b_pt
    c.set(fx_t[0] + 2, fx_t[1] + 1, "D"); c.set(fx_t[0] + 1, fx_t[1] + 2, "D")  # front knee
    c.set(bx_t[0] - 2, bx_t[1] + 1, "D"); c.set(bx_t[0] - 1, bx_t[1] + 2, "D")  # back knee
    # ── a hung crosshead ACTUATOR boss mid-beam (the moving load head) — sits high
    #    above the mouth centre, well clear of the tank far below; a short ram stub
    #    points DOWN from it into the open frame (reads as 'this presses down'). ──
    mxb = (a_pt[0] + b_pt[0]) // 2
    myb = (a_pt[1] + b_pt[1]) // 2 + 1
    _rect(c, mxb - 1, myb, mxb + 1, myb + 2, fill="D", outline="K")
    c.set(mxb, myb, "M")                                         # lit boss top
    c.line((mxb, myb + 3), (mxb, myb + 5), "D")                  # short ram stub down
    c.set(mxb, myb + 5, "K")


def stage4_hydraulics(c, b, m):
    """t4 — MAJOR ADD: a HYDRAULIC POWER-PACK on the LIT-LEFT flank of the bay — a
    stout cylindrical ACCUMULATOR over a boxy PUMP HOUSING, plumbed by a feed line
    that climbs the bay corner and drives glowing energized `e` hydraulic RAMS up
    BOTH load posts into the cross-head. The prominent new mass that says 'this rig
    now actually drives load'. Palette matures: deep `b` housing + energized teal
    `e/E` ram glow. Placed on the LIT-LEFT flank (NOT the open mouth) so it never
    occludes the hero tank; rams re-use the SAME post geometry as t3."""
    g = _frame_geometry(b, m)
    # ── PUMP HOUSING: a small iso BOX standing on the GROUND in front of the bay's
    #    LIT-LEFT face (in the wedge between the annex and the bay), well clear of the
    #    open mouth on the right. A real 3D ground unit (its own faces), not a panel
    #    punched into the wall. Deep-steel b body so it reads as new machinery. ──
    pp = Box(top=(22, 44), wx=4, wy=4, h=6)
    pp.shadow(c, "K")
    c.fill_poly([pp.r_top, pp.r_right, pp.r_front, pp.r_left], "M")        # lit roof
    c.fill_poly([pp.r_left, pp.r_front, pp.w_front, pp.w_left], "b")       # lit-left face
    c.fill_poly([pp.r_front, pp.r_right, pp.w_right, pp.w_front], "D")     # shaded face
    c.fill_poly([pp.r_top, pp.r_left, pp.r_front], "L")                    # back roof tri
    for a2, b2 in [(pp.r_top, pp.r_right), (pp.r_right, pp.r_front),
                   (pp.r_front, pp.r_left), (pp.r_left, pp.r_top),
                   (pp.r_left, pp.w_left), (pp.r_front, pp.w_front),
                   (pp.r_right, pp.w_right),
                   (pp.w_left, pp.w_front), (pp.w_front, pp.w_right)]:
        c.line(a2, b2, "K")
    # cooling-fin grooves + a g sight-glass + an o pump-status pip on the lit face
    for u in (0.34, 0.58, 0.82):
        c.line(pp.left_pt(u, 1.2), pp.left_pt(u, 5.0), "D")
    sgx, sgy = pp.left_pt(0.20, 2.4)
    c.set(int(round(sgx)), int(round(sgy)), "g")
    c.set(int(round(sgx)), int(round(sgy)) + 1, "G")
    olx, oly = pp.right_pt(0.5, 1.6)
    c.set(int(round(olx)), int(round(oly)), "o")
    c.set(int(round(olx)), int(round(oly)) - 1, "O")
    # ── ACCUMULATOR: a short fat cylinder standing on the housing roof ──
    accx = int(round(pp.roof_pt(0.5, 0.5)[0]))
    accy = int(round(pp.roof_pt(0.5, 0.5)[1])) - 6
    cylinder(c, accx, accy, rx=3, h=4, top="M", side_l="b", side_r="K", outline="K")
    c.set(accx, accy - 1, "L")                               # domed cap glint
    c.set(accx, accy, "c")                                   # c pressure pip
    # ── FEED LINE: an e high-pressure hose from the accumulator top up onto the bay
    #    ROOF, then run ALONG the roof front-left edge (r_left→r_front) to a tee at the
    #    FRONT post foot — so the hose reads as lying on the roof, not stuck to the lit
    #    wall — which splits to both post feet (powered rams fed from this pack) ──
    tee_x, tee_y = g["front_foot"]
    # the point on the roof front-left edge directly above the pump (climb-on point)
    fe = b.roof_pt(0.30, 0.06)                               # on r_left→r_front, near pump
    fex, fey = int(round(fe[0])), int(round(fe[1]))
    c.line((accx, accy - 2), (accx, fey), "e")               # rise from the pack to roof level
    c.line((accx, fey), (fex, fey), "e")                     # short hop onto the roof edge
    c.line((fex, fey), (tee_x, tee_y), "e")                  # run ALONG the roof edge to the foot
    c.set(accx, accy - 2, "E")                               # bright coupling at pump
    c.set(fex, fey, "E")                                     # bright elbow on the roof
    # ── glowing e RAMS climbing inside both posts up to the cross-head ──
    for foot, top in ((g["front_foot"], g["front_top"]),
                      (g["back_foot"], g["back_top"])):
        x = foot[0]
        if foot is not g["front_foot"]:                      # branch to the back post
            c.line((tee_x, tee_y), (x, foot[1]), "e")
        for j, yy in enumerate(range(top[1] + 1, foot[1])):  # bright energized ram core
            c.set(x, yy, "E" if j % 3 == 0 else "e")
        c.set(x, top[1] + 1, "E")                            # bright ram head at top
    c.set(tee_x, tee_y, "E")                                 # bright tee flare


def stage5_test_chamber(c, b, m):
    """t5 — CROWNING FEATURE = FULLY EVOLVED load-frame works. A glass ENVIRONMENTAL
    TEST CHAMBER is mounted ON the t3 cross-head between the two posts — a clear c/h
    glass cell enclosing a small CRUSHED specimen lit by an energized `E` stress-glow,
    capped by a redlined MASTER GAUGE on top and dressed out with `q` GOLD frame caps
    on the cross-head ends + gold chamber corner posts. Reads as elite, still
    recognizably the same open testing bay, just maxed out.

    Re-derives the cross-head from the SAME _frame_geometry source t3/t4 used (never a
    hardcoded 2nd guess) so the chamber seats exactly on the beam, fully on-canvas."""
    g = _frame_geometry(b, m)
    a_pt, b_pt = g["cross"]                                   # a=front top, b=back top
    # seat the chamber CENTRED over the beam midpoint on a short platform with two
    # support legs down to the (tilted) beam, so it reads as MOUNTED ON the cross-head
    # rather than floating. Recomputed from the SAME cross-head source t3/t4 used.
    midx = (a_pt[0] + b_pt[0]) // 2
    beam_my = (a_pt[1] + b_pt[1]) // 2                        # beam top at centre
    # ── a short steel PLATFORM deck bridging the beam, holding the chamber ──
    plat_y = beam_my - 3
    _rect(c, midx - 4, plat_y, midx + 4, plat_y + 1, fill="b", outline="K")
    c.line((midx - 4, plat_y), (midx + 4, plat_y), "M")      # lit deck top
    # two short support legs from the platform down onto the beam
    c.line((midx - 3, plat_y + 1), (midx - 3, beam_my), "b")
    c.line((midx + 3, plat_y + 1), (midx + 3, beam_my + 1), "b")
    c.set(midx - 3, beam_my, "K"); c.set(midx + 3, beam_my + 1, "K")
    # ── glass CELL: a c body with an h sky-band, K frame, set on the platform deck ──
    cl, cr = midx - 4, midx + 4                              # 9px-wide chamber
    base_y = plat_y - 1
    top_y = max(1, base_y - 8)                                # chamber is ~9px tall, clamped
    _rect(c, cl, top_y, cr, base_y, fill="c")
    _rect(c, cl, top_y, cr, top_y + 2, fill="h")             # bright upper sky-band
    _rect(c, cl, base_y - 1, cr, base_y, fill="G")           # shaded sill
    _rect(c, cl, top_y, cr, base_y, outline="K")             # clean K frame
    # a vertical h shine streak (the glass tell)
    c.line((cl + 1, top_y + 1), (cl + 1, base_y - 1), "h")
    # ── the CRUSHED specimen inside, lit by an energized E stress-glow ──
    sx = (cl + cr) // 2
    sy = base_y - 2
    # a squat fractured block: a d core with a ragged r crack + bright E stress lines
    c.set(sx - 1, sy, "d"); c.set(sx, sy, "d"); c.set(sx + 1, sy, "d")
    c.set(sx, sy - 1, "d")
    c.set(sx, sy, "r")                                        # the fracture
    c.set(sx - 1, sy - 1, "E")                               # stress-glow flare
    c.set(sx + 1, sy - 1, "E")
    c.set(sx, sy - 2, "e")                                    # glow rising off the crush
    # ── redlined MASTER GAUGE perched on the chamber roof (the maxed readout) ──
    mgx = (cl + cr) // 2
    mgy = top_y - 2
    if mgy - 3 >= 0:                                          # only if it fits on-canvas
        _disk_ring(c, (mgx, mgy), 2, fill="c", ring="K")
        for ang in range(40, 141, 25):                       # r redline arc (failing)
            rx = mgx + 2 * math.cos(math.radians(ang))
            ry = mgy + 2 * math.sin(math.radians(ang))
            c.set(int(round(rx)), int(round(ry)), "r")
        c.set(mgx, mgy, "r")                                  # needle pinned to red
        c.set(mgx + 1, mgy - 1, "O")
        c.set(mgx, mgy - 3, "M")                             # short stem to the chamber
    # ── q GOLD premium trim (t5 flourish only) ──
    # gold frame CAPS on the two cross-head beam ends
    for ex, ey in (a_pt, b_pt):
        c.set(ex, ey - 2, "q")
        c.set(ex, ey - 3, "O")
    # gold corner posts up the two front edges of the glass chamber
    c.set(cl, top_y, "q"); c.set(cr, top_y, "q")
    c.set(cl, top_y + 1, "q"); c.set(cr, top_y + 1, "q")
    # a thin gold sill ribbon along the chamber base (premium trim)
    c.line((cl, base_y), (cr, base_y), "q")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the materials-testing-bay at upgrade `stage` (1..5). Stage 1 is
    IDENTICAL to the shipped base; each higher stage keeps every prior addition and
    bolts on the next (t2 fume-extraction stack → t3 twin-column frame → t4 hydraulic
    power-pack → t5 environmental chamber + gold).

    Painter's order: the back-left annex first, then the bay box, then the cooling
    pipe; the UPGRADE rig (posts/beam/rams/chamber) rises off the bay ROOF and is
    drawn BEFORE the hero corrosion-test so it occludes correctly while the open mouth
    + corroding coupon stay the FRONT-MOST hero (drawn LAST). The t2 fume-extraction
    stack sits on the back-left main roof (clear of the rig zone), so it is drawn just
    before the hero (after the rig) and never reaches the mouth / tank."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    a = annex(c)                  # closed instrument annex (back-left), drawn first
    b, m = bay(c)                 # tall open-portal bay carved open on the RIGHT
    cooling_pipe(c, a, b)         # thin cyan pipe linking the two roofs

    # --- CUMULATIVE UPGRADE STAGES (rooftop load-frame + lit-left power-pack) ------
    # The twin-post frame (t3), the hydraulic rams (t4) and the chamber (t5) all rise
    # off the bay roof / cross-head; draw them BEFORE the hero so the front-most mouth
    # stays clean. t4's pump-pack stands on the lit-left flank (never the mouth).
    if stage >= 3:
        stage3_twin_column(c, b, m)
    if stage >= 4:
        stage4_hydraulics(c, b, m)
    if stage >= 5:
        stage5_test_chamber(c, b, m)
    # t2 fume-extraction stack sits on the BACK-LEFT main roof, clear of the rig
    # zone; draw it after the rig so nothing paints over it, before the hero tank.
    if stage >= 2:
        stage2_fume_extractor(c, b, m)

    # the corroding coupon in the glass tank is ALWAYS the front-most hero (drawn last)
    corrosion_test(c, b, m)       # hero: clamped coupon corroding in a glass tank
    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/chemworks"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "materials-testing-bay"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped materials-testing-bay.png, so it does NOT overwrite the
    base PNG."""
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
