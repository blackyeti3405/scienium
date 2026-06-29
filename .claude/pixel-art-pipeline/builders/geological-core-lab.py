#!/usr/bin/env python3
"""
Geological Core Lab — TerraBase Lab economy building (BESPOKE form, STANDARD role).

The most STRATIGRAPHY-FORWARD building in the set: a LONG LOW field core SHED dug
sideways into a CUTAWAY HILLSIDE whose exposed earth-cut shows banded rock strata.
The SHED is the dominant mass — a long, low, mono-pitch equipment shed (wx>>wy, a
genuinely LOW wall height) — and the hillside is a SEPARATE, LOWER banded berm
sitting BEHIND it, rising only a little above the shed roofline (a hill the shed is
cut into, NOT a towering cube). Round-0/round-1 both flagged the old form as a tall
near-cubic strata block + small shed tail; this pass collapses that: the berm wall
height is cut from h=20 down to h=6, so it reads as a low bank, and the long low
shed becomes the building.

  * Hillside berm (drawn FIRST, behind): a LOW banded earth-cut bank set back-left,
    its top sitting just above/behind the shed's back ridge. Two visible cut faces
    painted as ruled horizontal rock-strata bands (d / D / M / r / L bottom->top)
    with a K retaining lip. It is short and wide — a bank, not a tower.
  * Main shed: one long low Box (wx=14, wy=6, h=9) — the DOMINANT mass — M/D
    weathered walls under a thin L/M mono-pitch shed roof tilted high-back-left ->
    low-front-right with d down-slope corrugation seams; a roof vent stub + a D
    cable run dropping into the hill cut. Its back-left wall butts the strata bank
    (a K retaining lip along the seam), so the shed reads as carved INTO the hill.
  * Core-rack bench: the signature drill-core rack is SEATED ON the shed's front-
    left foundation apron — its legs land on the building's ground footprint and a
    d/M strut + cast shadow tie it to the lit-left wall foot, so it reads as a bench
    bolted to the shed, NOT floating free in the void below the mass.
  * OPENING = LEFT: the hero is a crisp wide K-framed roll-up CORE-BAY door — a
    recessed D panel, bright L/W lintel + lit-left L jamb, a c glass strip, clean
    d roll slats — on the LIT-LEFT face, with an o "CORE LIBRARY" placard above. The
    SHADED RIGHT face stays plainer — a long blank wall with a single d vent.

Signature (one-of-one): a long INCLINED GLASS-CASED DRILL-CORE on a rack seated on
the shed apron — its banded rock strata visible end-to-end as ruled r/M/D/L/d
segments inside a c/h glass tube — with a sliding mineral-teal IDENTIFICATION
SCANNER collar (g/G) over one band, casting a c light-bar that makes that band glow
brightest O/h, a faint c trail behind it, and a small W/L per-layer MINERAL LABEL
card (K tick + O dot) popping over the band it reads. A horizontal/inclined core-
on-a-rack being scanned — a different form & read from the catalog's vertical tubes.

Composed from art/isobuild.{Box} — NO iso.draw_cube / base_windows.
Draw order: contact shadow -> LOW hillside-cut strata berm (back) -> the long low
shed + mono-pitch shed roof -> LIT-LEFT roll-up bay + placard -> shaded-right wall +
vent -> the inclined glass drill-core + apron-seated rack + sliding teal scanner +
mineral label (top).

──────────────────────────────────────────────────────────────────────────────
UPGRADE-EVOLUTION lab member. The build() body below composes the UNCHANGED base
form (stage 1 == shipped geological-core-lab.png). On top of it four CUMULATIVE
upgrade stages bolt on stratigraphy/core-logging structure (build up, never restart),
copying the sampling-station.py / workshop.py pattern (build(stage) + stageN_*
helpers + emit/build_all). See terrabase-evolution-plan.md "geological-core-lab".
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, RX, RY, LX, LY

# Base TerraBase palette (shared keys) + the EVOLVED-accent keys reserved for the
# upgrade stages only (chars NOT used by the base palette, so they appear in NO
# stage-1 sprite and geological-core-lab.png stays byte-identical). These four exact
# keys+hexes are the lab-wide evolved accents shared by all 10 terrabase buildings:
#   b  deep basalt/bedrock  — matured warm structure tone for t3+ new masses
#   e  energized mineral-seismic glow (mid)    E  energized glow (bright) — t4/t5 power
#   q  premium survey gold  — t5 flourish ONLY (NOT a whole-building recolor)
TERRA = {"K": "#20190f", "W": "#efe6cf", "L": "#d6c8a0", "M": "#b09a6e", "D": "#7e6c47", "d": "#54462c",
         "h": "#d6f2ea", "c": "#a4e2d4", "g": "#34b6a2", "G": "#1d8474",
         "o": "#e0a850", "O": "#ffce80", "r": "#9a5e1e",
         "b": "#3a3326", "e": "#5fe0c4", "E": "#c4fff0", "q": "#f3c63a"}


# ── small pixel helper ────────────────────────────────────────────────────────
def _stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings) at top-left (x0,y0).
    '.' = skip (transparent)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


# ── 0. contact shadow under the whole long footprint (drawn FIRST) ────────────
def base_shadow(c):
    """A soft flat K iso-ellipse contact shadow pooled under the long shed so the
    whole mass feels grounded on the dirt. Wide + flat to echo the long-low
    footprint and tucked TIGHT under the wall feet (not pooled far down), so it
    grounds the mass WITHOUT extending the building columns: raised to scy=40 and
    flattened to a ±2 vertical radius (was scy=43, ±4 — which dropped to row 47 and
    stacked every column up to ~33px tall) so it spans only ~rows 38-42 and the
    tallest building+shadow column stays <=30. The apron-seated core rack still reads
    sitting on ground, not on a shadow void."""
    scx, scy = 32, 40
    for x in range(scx - 23, scx + 20):
        for y in range(scy - 2, scy + 3):
            ex = (x - scx) / 23.0
            ey = (y - scy) / 2.0
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")


# ── 1. HILLSIDE CUT — a LOW earth-cut bank of banded rock strata (back-left) ──
def hillside_cut(c):
    """A LOW, WIDE earth-cut bank set BEHIND the shed that the shed is carved into.
    A short Box berm (h=6 — cut WAY down from the old h=20 tower that made this read
    as a cube) whose visible cut faces are painted as ruled horizontal rock-strata
    bands. Positioned back-LEFT and set so its top sits just a few px ABOVE/behind
    the shed's back ridge — a hill the shed is dug into, NOT a towering block.
    Drawn BEHIND the shed so the shed's back wall butts into the cut."""
    # A LOW banded bank set BACK-LEFT whose TOP peeks only a couple px ABOVE the shed
    # ridge (shed roof apex is at y=16) and whose mass is fully occluded by the shed
    # below — so it reads as a SHORT horizontal strata bank behind the shed, NOT a
    # tower. Round-2 measured cols 17-19 at 39px tall (berm top at row 8); this drops
    # the berm top DOWN to row 14 and cuts the height to h=6 so its total vertical
    # extent is ~13px and its topmost pixel sits at ~row 14 (<<22). Narrow along wy so
    # the top diamond stays small; the wide banded cut FACE does the work.
    berm = Box(top=(16, 14), wx=6, wy=3, h=6)

    # --- flat dirt TOP of the cut (looked down onto) ---
    c.fill_poly([berm.r_top, berm.r_right, berm.r_front, berm.r_left], "D")
    c.fill_poly([berm.r_top, berm.r_left, berm.r_front], "M")   # lit back-left
    # a few r/d dirt-clod mottles so the top reads as earth, not a panel
    for (u, v) in [(0.30, 0.40), (0.62, 0.28), (0.46, 0.66), (0.72, 0.52), (0.24, 0.6)]:
        p = berm.roof_pt(u, v)
        c.set(int(round(p[0])), int(round(p[1])), "r")

    # --- STRATA BANDS down the two cut faces: 5 ruled horizontal rock layers ---
    # bottom(oldest/deep) -> top(youngest): d dark, D brown, M ochre, r rust, L pale
    strata = [("d", 0.80, 1.00), ("D", 0.60, 0.80), ("M", 0.40, 0.60),
              ("r", 0.20, 0.40), ("L", 0.00, 0.20)]
    # LIT-LEFT cut face — the dramatic exposed strata (band fills + ruled seams)
    for fill, f0, f1 in strata:
        c.fill_poly([berm.left_pt(0.0, berm.h * f0), berm.left_pt(1.0, berm.h * f0),
                     berm.left_pt(1.0, berm.h * f1), berm.left_pt(0.0, berm.h * f1)], fill)
    # SHADED-RIGHT cut face — same strata one step darker (so it stays shaded)
    rshade = {"d": "K", "D": "d", "M": "D", "r": "d", "L": "M"}
    for fill, f0, f1 in strata:
        sc = rshade.get(fill, "d")
        c.fill_poly([berm.right_pt(0.0, berm.h * f0), berm.right_pt(1.0, berm.h * f0),
                     berm.right_pt(1.0, berm.h * f1), berm.right_pt(0.0, berm.h * f1)], sc)
    # crisp ruled K seam between each band (the stratigraphic contacts)
    for _, f0, _ in strata[1:]:
        c.line(berm.left_pt(0.0, berm.h * f0), berm.left_pt(1.0, berm.h * f0), "K")
        c.line(berm.right_pt(0.0, berm.h * f0), berm.right_pt(1.0, berm.h * f0), "d")
    # a thin r pebble grain dashed into a couple bands (rocky texture, not flat)
    for (u, vf) in [(0.25, 0.70), (0.55, 0.50), (0.40, 0.30), (0.70, 0.88)]:
        p = berm.left_pt(u, berm.h * vf)
        c.set(int(round(p[0])), int(round(p[1])), "r")

    # --- K retaining LIP edging the cut + silhouette outline of the berm ---
    for a, b in [(berm.r_top, berm.r_right), (berm.r_right, berm.r_front),
                 (berm.r_front, berm.r_left), (berm.r_left, berm.r_top),
                 (berm.r_left, berm.w_left), (berm.r_front, berm.w_front),
                 (berm.r_right, berm.w_right),
                 (berm.w_left, berm.w_front), (berm.w_front, berm.w_right)]:
        c.line(a, b, "K")
    # a doubled K retaining lip along the top front edges (reads as a cut bank rim)
    c.line(berm.r_left, berm.r_front, "K")
    c.line(berm.r_front, berm.r_right, "K")
    return berm


# ── 2. MAIN SHED — the DOMINANT long low Box with a mono-pitch shed roof ──────
def main_shed(c, berm):
    """The long low core shed — the DOMINANT building mass — seated in front of the
    hill cut so its back-left butts into the strata bank. LONG along wx (the run goes
    back-to-front-right), SHORT along wy (a shallow depth), genuinely LOW height (h=9)
    -> a clearly LONG + LOW shed, NOT a near-cube. The LIT-LEFT face is the hero
    opening end (door), with the core display rack seated on its front-left apron; the
    long SHADED-RIGHT is a blank run. Bare M/D walls (mono-pitch roof painted next)."""
    # wx=14 (long run) >> wy=6 (shallow depth), h=9 (LOW wall). The footprint width
    # (14+6=20px of roof diamond) dwarfs the 9px wall -> reads long & low, not cubic.
    shed = Box(top=(26, 16), wx=14, wy=6, h=9)
    shed.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # K retaining lip where the shed's back-left wall butts the strata bank, so the
    # shed reads CARVED INTO the hill (the two masses meet, not just stack).
    c.line(shed.r_top, shed.r_left, "K")
    return shed


def shed_roof(c, shed):
    """Repaint the shed's roof diamond as a shallow MONO-PITCH corrugated slab: a
    thin L/M plank tilted so the HIGH edge is back-left and the LOW edge front-
    right, with d corrugation seams running down-slope and a bright W back ridge.
    A small roof vent stub + a D cable run dropping back into the hill cut."""
    # base slab fill: a CLEAN mono-pitch slab. The HIGH edge is the back-left
    # ridge (r_top->r_left) and the slope falls toward the LOW front-right eave
    # (r_front->r_right). Lit L across the high back band grading to M down the slope
    # (one calm tonal step that sells the pitch, not a flat lid).
    c.fill_poly([shed.r_top, shed.r_right, shed.r_front, shed.r_left], "M")
    # lit upper (high) band of the slope in L — the back-left half nearer the ridge
    midA = ((shed.r_left[0] + shed.r_top[0]) / 2, (shed.r_left[1] + shed.r_top[1]) / 2)
    midB = ((shed.r_front[0] + shed.r_right[0]) / 2, (shed.r_front[1] + shed.r_right[1]) / 2)
    c.fill_poly([shed.r_top, shed.r_left, midA, midB], "L")
    c.fill_poly([shed.r_top, midB, shed.r_right], "L")
    # corrugation SEAM lines running DOWN-slope (high back ridge -> low front eave):
    # roof_pt(u,v): u = left->front edge, v = left->top edge. Ridge (high) is v->1
    # (toward r_top); eave (low) is v->0 (toward r_front). Straight d ribs drop the
    # full slope so the roof reads corrugated + pitched, not a flat lid.
    for u in (0.16, 0.34, 0.52, 0.70, 0.88):
        c.line(shed.roof_pt(u, 0.92), shed.roof_pt(u, 0.08), "d")
    # bright W ridge along the HIGH back edges (back-left + back-right)
    c.line(shed.r_top, shed.r_left, "W")
    c.line(shed.r_top, shed.r_right, "W")
    # a thin eave shadow along the LOW front edges
    c.line(shed.r_left, shed.r_front, "d")
    c.line(shed.r_front, shed.r_right, "K")
    # re-outline the roof diamond crisply
    for a, b in [(shed.r_top, shed.r_right), (shed.r_right, shed.r_front),
                 (shed.r_front, shed.r_left), (shed.r_left, shed.r_top)]:
        c.line(a, b, "K")

    # roof VENT stub near the high back-left + a D cable run dropping into the cut
    vp = shed.roof_pt(0.22, 0.6)
    vx, vy = int(round(vp[0])), int(round(vp[1]))
    _stamp(c, vx - 1, vy - 3, [
        ".K.",
        "KDK",   # little vent box
        "KMK",
        "KKK",
    ])
    c.set(vx, vy - 4, "M")   # vent cap lip
    # D cable run sagging from the ridge back into the hillside cut (back-left)
    cp = shed.r_top
    for k, dx in enumerate(range(0, 6)):
        x = int(round(cp[0])) - dx
        y = int(round(cp[1])) - 1 + (0 if dx < 3 else (dx - 2))
        c.set(x, y, "D")
    c.set(int(round(cp[0])) - 5, int(round(cp[1])) + 3, "d")  # cable foot into the cut


# ── 4. LIT-LEFT HERO — roll-up CORE-BAY door + glass strip + placard ──────────
def left_bay(c, shed):
    """The OPENING (LEFT): a crisp wide K-framed roll-up CORE-BAY door on the LIT-LEFT
    hero face — a recessed D panel (darker than the lit M wall so it reads as a real
    door, not a same-tone ghost) with clean d roll-segment slats, a c glass strip, a
    bright L/W lintel + lit-left L jamb so the frame pops, and a small o 'CORE LIBRARY'
    placard above. The core-display rack is seated on the apron just in front of it."""
    pt = shed.left_pt
    # --- o 'CORE LIBRARY' placard high on the lit face (back-top), clear of the door ---
    sp = pt(0.10, 0.9)
    sx, sy = int(round(sp[0])), int(round(sp[1]))
    _stamp(c, sx, sy, [
        "ooooo",
        "oKoKo",   # tiny K 'lettering' ticks on the amber placard
        "OoooO",
    ])

    # --- wide roll-up bay DOOR centred on the lit face. The door panel is D (a
    # recessed roll door, DARKER than the lit M wall so it reads as a distinct door,
    # not a same-tone ghost), framed by a crisp K jamb with a bright L/W lintel + L
    # lit-left jamb so the frame POPS, a c glass strip up top, and clean d roll slats. ---
    du0, du1, dv0, dv1 = 0.26, 0.70, 2.4, shed.h - 0.2
    # bright L LINTEL + L jamb band FIRST (a lit reveal around the recess), then K
    # frame, then the D recessed door panel inside it.
    c.fill_poly([pt(du0 - 0.05, dv0 - 0.4), pt(du1 + 0.05, dv0 - 0.4),
                 pt(du1 + 0.05, dv1 + 0.2), pt(du0 - 0.05, dv1 + 0.2)], "L")  # lit reveal
    c.line(pt(du0 - 0.05, dv0 - 0.4), pt(du1 + 0.05, dv0 - 0.4), "W")          # bright lintel
    c.fill_poly([pt(du0, dv0), pt(du1, dv0), pt(du1, dv1), pt(du0, dv1)], "K")   # K jamb
    c.fill_poly([pt(du0 + 0.06, dv0 + 0.5), pt(du1 - 0.06, dv0 + 0.5),
                 pt(du1 - 0.06, dv1 - 0.3), pt(du0 + 0.06, dv1 - 0.3)], "D")  # recessed panel
    # a c GLASS view strip across the top of the door (glazed core-bay light)
    c.fill_poly([pt(du0 + 0.12, dv0 + 0.7), pt(du1 - 0.12, dv0 + 0.7),
                 pt(du1 - 0.12, dv0 + 1.5), pt(du0 + 0.12, dv0 + 1.5)], "c")
    c.line(pt(du0 + 0.12, dv0 + 0.8), pt(du1 - 0.12, dv0 + 0.8), "h")   # glass glint
    # clean d roll-up segment lines on the D panel BELOW the glass (reads as a roll-door)
    for vv in (dv0 + 2.6, dv0 + 4.2):
        c.line(pt(du0 + 0.09, vv), pt(du1 - 0.09, vv), "d")
    # bright L highlight up the LIT (left) jamb so the frame pops at thumbnail
    c.line(pt(du0, dv0 + 0.6), pt(du0, dv1 - 0.2), "L")
    # crisp K jamb re-outline
    for a, b in [(pt(du0, dv0), pt(du1, dv0)), (pt(du0, dv1), pt(du1, dv1)),
                 (pt(du0, dv0), pt(du0, dv1)), (pt(du1, dv0), pt(du1, dv1))]:
        c.line(a, b, "K")


# ── 5. SHADED-RIGHT — plainer long wall meeting the cut + one vent ────────────
def right_face(c, shed):
    """Keep the SHADED RIGHT face plainer per the blueprint: a long blank D/d wall
    butting into the strata cut, with one small d vent grille and a couple of K
    seam lines so it reads as corrugated panel, not blank."""
    pt = shed.right_pt
    # faint vertical d corrugation seams down the long shaded wall
    for u in (0.20, 0.40, 0.60, 0.80):
        c.line(pt(u, 0.8), pt(u, shed.h - 0.6), "d")
    # one small d vent grille toward the front of the shaded face
    vu0, vu1, vv0, vv1 = 0.66, 0.86, 3.2, 5.8
    c.fill_poly([pt(vu0, vv0), pt(vu1, vv0), pt(vu1, vv1), pt(vu0, vv1)], "d")
    for vv in (3.8, 4.4, 5.0):
        c.line(pt(vu0 + 0.02, vv), pt(vu1 - 0.02, vv), "K")
    for a, b in [(pt(vu0, vv0), pt(vu1, vv0)), (pt(vu0, vv1), pt(vu1, vv1)),
                 (pt(vu0, vv0), pt(vu0, vv1)), (pt(vu1, vv0), pt(vu1, vv1))]:
        c.line(a, b, "K")


# ── 6. SIGNATURE — inclined glass drill-core + sliding teal ID scanner ────────
def core_scanner(c, shed):
    """The hero: a long INCLINED GLASS-CASED DRILL-CORE lying on a display RACK that
    is SEATED ON the shed's front-left foundation APRON (its legs land on the
    building's ground footprint and a d/M strut + cast shadow tie it to the lit-left
    wall foot — it sits ON the building, NOT floating in the void below the mass).
    Inside the c/h glass case run 5 DISTINCT ruled stratigraphy bands (r/M/D/L/d)
    end-to-end so the layered rock reads clearly. A sliding mineral-teal SCANNER
    collar wraps ONE band, casting a c/h light-bar that makes that band glow brightest
    O/h, with a faint c slide-trail behind it and a small W/L per-layer MINERAL LABEL
    card (K tick + O dot) popping above the read band. Drawn LAST.

    Returns the core geometry (x0, x1, cy, bandw, nseg) so cumulative upgrade stages
    (t2 extra tray, t3 core-store, t4 scan gantry, t5 strat hologram) anchor to the
    SAME rack — never a hardcoded second guess."""
    # Anchor the rack on the shed's front-left APRON: take the lit-left wall foot as
    # the reference, seat the rack in the CLEAR front-left foreground just below it so
    # its legs land on the building's ground footprint apron — clear of the door above,
    # tied to the wall foot by a strut (not floating in the void far down-left).
    foot = shed.w_left                       # lit-left wall foot (front-left base)
    fx, fy = int(round(foot[0])), int(round(foot[1]))

    # core geometry: a long, gently-inclined glass bar in the CLEAR front-left
    # foreground, below the lit-left base (clear of the door), seated on a low apron
    # with a strut angling back UP-RIGHT to the wall foot so it reads as a bench bolted
    # to the shed.
    cy = fy + 4                              # core centre row — nestled UP on the apron
    #   (was fy+8; pulled up so the rack does not drop a deep foreground TAIL that
    #   stacks under the shed/berm columns and pushes those columns past 30px tall —
    #   it stays anchored on the lit-left wall-foot apron, just higher and tighter.)
    x0 = fx - 6                              # left (oldest/deep) end, shifted LEFT into the
    #   clear front-left ground so the long core clears the shed's tall mid columns.
    bandw = 3                                # px width per strata band
    # alternating light/dark so each contact is obvious: rust, ochre, brown, pale, dark
    segs = ["r", "M", "D", "L", "d"]         # 5 DISTINCT strata bands (deep->young)
    nseg = len(segs)
    corelen = nseg * bandw                   # 15px long core
    x1 = x0 + corelen                        # one past the right end
    scan_seg = 1                             # the band currently being read (0-based)

    # --- APRON: a low d foundation pad the rack legs sit on, set in front of the
    # lit-left base so the bench visibly belongs to the shed (no floating-in-void). ---
    for ax in range(x0 - 1, x1 + 2):
        c.set(ax, cy + 4, "d")               # apron pad top edge
        c.set(ax, cy + 5, "K")               # apron shadow / footprint line

    # --- RACK: two D/M cradle saddles + a connecting rail + legs landing on apron ---
    for rx in (x0 + 2, x1 - 3):
        c.set(rx - 1, cy + 2, "M"); c.set(rx, cy + 2, "D"); c.set(rx + 1, cy + 2, "d")
        c.set(rx, cy + 3, "d")                # rack leg
        c.set(rx, cy + 4, "K")                # foot landing on the apron pad
    c.line((x0 + 2, cy + 2), (x1 - 3, cy + 2), "D")       # rail under the core
    # STRUT: a short d/M support bracket from the rack's HIGH (right) end up to the
    # lit-left wall FOOT corner, visibly bolting the bench to the shed (tied to the
    # building, not free-standing). Kept SHORT + low so it doesn't cross the door.
    c.line((x1 - 2, cy + 1), (fx, fy + 2), "d")
    c.line((x1 - 2, cy), (fx, fy + 1), "M")                # lit edge of the bracket
    c.set(fx, fy + 1, "M"); c.set(fx, fy + 2, "d")         # bracket lands on the wall foot

    # --- the flat glass CORE: 5 wide ruled rock bands, K glass edges top+bottom ---
    for k in range(corelen):
        x = x0 + k
        s = min(nseg - 1, k // bandw)
        rock = segs[s]
        c.set(x, cy - 1, rock)               # top rock row
        c.set(x, cy, rock)                   # mid rock row
        c.set(x, cy + 1, rock)               # bottom rock row
        c.set(x, cy - 2, "K")                # K glass tube edge (top)
        c.set(x, cy + 2, "K")                # K glass tube edge (bottom)
    # crisp K contact line at each band boundary (the stratigraphic contacts)
    for s in range(1, nseg):
        x = x0 + s * bandw
        for dv in (-1, 0, 1):
            c.set(x, cy + dv, "K")
    # rounded K glass end-caps
    for x, off in ((x0, -1), (x1 - 1, 1)):
        for dv in (-1, 0, 1):
            c.set(x + off, cy + dv, "K")
    # a couple tiny h glass-sheen glints along the top rock edge (subtle glass read)
    for gx in (x0 + 4, x0 + 10):
        c.set(gx, cy - 1, "h")

    # --- SLIDING mineral-teal SCANNER collar wrapping the READ band (band 1) ---
    # straddle the band: a g cap above the top K edge, a g cradle below the bottom K
    # edge, g posts each side; the band itself glows brightest O with a c light-bar.
    bs = x0 + scan_seg * bandw               # left x of the read band
    _stamp(c, bs, cy - 4, ["ggg"])           # collar cap above the core
    _stamp(c, bs, cy + 3, ["ggg"])           # collar cradle below the core
    c.set(bs - 1, cy - 3, "G"); c.set(bs + 3, cy + 4, "G")   # darker G grounding
    c.set(bs - 1, cy, "g"); c.set(bs + 3, cy, "g")           # collar posts each side
    # the read band glows brightest (the identified layer) + a c light-bar across it
    for x in (bs, bs + 1, bs + 2):
        c.set(x, cy - 1, "O"); c.set(x, cy, "O"); c.set(x, cy + 1, "h")
    c.set(bs + 1, cy, "h")                   # bright scan-light centre
    # ONE faint c slide-trail segment behind the scanner (it slid in from the right)
    c.set(x1 - 2, cy - 4, "c"); c.set(x1 - 3, cy - 4, "h")

    # --- per-layer MINERAL LABEL card popping to the UPPER-LEFT of the read band, in
    # the CLEAR ground left of the core, on a short teal leader (the ID) ---
    lx, ly = x0 - 6, cy - 6
    _stamp(c, lx, ly, [
        "WWWWL",
        "WKKKW",   # K text tick (the mineral name on the card)
        "WWWWL",
    ])
    c.set(lx + 5, ly, "O")        # bright O dot (identified mineral marker)
    c.set(lx + 5, ly + 1, "o")
    c.set(lx + 5, ly + 2, "O")
    # a SHORT teal leader from the card down-right to the scanner collar cap
    c.line((lx + 4, ly + 3), (bs, cy - 4), "g")
    c.set(bs, cy - 4, "G")

    return {"x0": x0, "x1": x1, "cy": cy, "bandw": bandw, "nseg": nseg, "fx": fx, "fy": fy}


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS core-logging /
# stratigraphy structure onto the prior form — never restarts, never recolors the
# whole building. Theme: the field core shed grows into a fully built-out core-
# logging & scanning facility. Colours mature stage by stage; gold (q) is a t5
# flourish only. Every add is anchored to a base part (the SAME core rack geometry
# returned by core_scanner, the shed roof, the shed apron) and clamped on-canvas, and
# NONE collide with the centre scanner-collar / mineral-label signature on the core.
#
#   t2  small functional add : extra LABELLED CORE TRAY at the rack's open end + a c hand-lens LOUPE glint
#   t3  structural add        : a covered b CORE-STORE lean-to annex over stacked core boxes (extends the rack)
#   t4  major add             : a rooftop split-core SCAN GANTRY — a b bridge beam lowering a glowing e scan-head
#   t5  crowning feature      : a glowing E STRATIGRAPHIC-COLUMN hologram over the rack + gold rack rails + plaque
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_core_tray(c, geo):
    """t2 — SMALL FUNCTIONAL ADD: one more LABELLED CORE TRAY for the rack — a short
    open D tray box holding a fresh r/M core segment with two little o label-tag flags,
    laid on a LOWER-FRONT shelf directly BELOW the existing core (the rack's open
    cataloguing shelf) — plus a small c HAND-LENS LOUPE glint resting at the reader
    (left) end (the geologist's loupe). Modest, on-theme (one more catalogued core),
    base palette + the agreed c loupe accent. Seated on the apron in the CLEAR
    foreground below the core, well clear of the centre scanner collar / mineral label
    above it, and entirely on the front-left apron (never onto the shed wall)."""
    x0, x1, cy = geo["x0"], geo["x1"], geo["cy"]
    # one extra labelled CORE TRAY set in the CLEAR open foreground just below-LEFT of
    # the rack (rows below the apron line, where the ground is empty) so it reads as a
    # distinct freshly-laid tray rather than mushing into the busy core/rack/scanner
    # band above it. A proper little 3-row tray box (lit L top board, D interior, d/K
    # walls) so it pops off the dark foreground.
    tx = x0 - 2                               # tray left, in the clear front-left ground
    ty = cy + 7                               # below the apron shadow line, on open ground
    tw = 9                                    # a clear, readable tray
    c.line((tx, ty - 1), (tx + tw - 1, ty - 1), "L")   # bright lit top board (pops off shadow)
    for xx in range(tx, tx + tw):
        c.set(xx, ty, "D")                    # tray interior floor
        c.set(xx, ty + 1, "d")                # tray front wall
    c.line((tx, ty + 1), (tx + tw - 1, ty + 1), "K")   # front rim / shadow line
    c.set(tx - 1, ty, "K"); c.set(tx + tw, ty, "K")    # tray end caps
    c.set(tx - 1, ty - 1, "K"); c.set(tx + tw, ty - 1, "K")
    # a fresh CORE SEGMENT laid in the tray: alternating rust/ochre rock chips
    for i, xx in enumerate(range(tx + 1, tx + tw - 1)):
        c.set(xx, ty, "r" if i % 2 == 0 else "M")
    c.set(tx + 3, ty, "L")                    # a pale chip glint (fresh-cut rock)
    # ONE little o LABEL-TAG flag standing off the tray back rim (the catalogued tray) —
    # kept to a single tag so the front-left foreground stays clean, not speckled.
    fxx = tx + 5
    c.set(fxx, ty - 2, "K")                   # flag staff
    c.set(fxx + 1, ty - 2, "o")               # flag cloth
    c.set(fxx + 1, ty - 1, "O")
    # --- HAND-LENS LOUPE resting beside the tray at the reader end (the geologist's
    #     loupe) — a tiny ring lens with a bright c/h glint, in the clear ground left
    #     of the new tray so it reads as its own object. ---
    lpx, lpy = tx + tw + 1, ty - 1            # just right of the tray, on the ground
    _stamp(c, lpx, lpy, [
        ".K.",
        "KcK",                                 # loupe ring around a c lens
        ".K.",
    ])
    c.set(lpx + 1, lpy + 1, "h")              # bright loupe glint (catches the light)
    c.set(lpx + 2, lpy + 2, "K")             # short loupe handle


def stage3_core_store(c, shed):
    """t3 — STRUCTURAL ADD: a covered CORE-STORE annex ABUTTING the shed's SHADED-RIGHT
    end, growing into the open right-front foreground — a low basalt b mono-pitch
    lean-to roof on two posts sheltering a stack of stored CORE BOXES (flat box-files
    of laid-up core). A real new structural mass (an iso roof plane + posts + stacked
    boxes + a K plank skirt), not a prop, introducing the deepened basalt tone b. It
    butts the shed's shaded-right wall foot and extends RIGHT, so the depot visibly
    grows its core archive sideways — a clear distinct mass in the empty right
    foreground, well clear of the front-left core signature and of the roof gantry."""
    # anchor on the shaded-right wall foot (w_front..w_right run) and grow RIGHT into
    # the open foreground so the annex abuts the shed and reads as its own ground mass.
    ax, ay = int(round(shed.w_front[0])), int(round(shed.w_front[1]))   # (42,45) front-low corner
    bx0 = ax + 3                              # box stack starts just right of the shed front corner
    by0 = ay - 2                              # box-stack lid row, on the ground beside the shed
    # a flat box-file: lid + lit front + shaded base, K-rimmed (a stored core box)
    def _corebox(c, bx, by, w):
        for xx in range(bx, bx + w):
            c.set(xx, by, "D")                # box lid
            c.set(xx, by + 1, "M")            # lit box front
            c.set(xx, by + 2, "d")            # shaded box base
        c.line((bx, by - 1), (bx + w - 1, by - 1), "K")   # back rim
        c.set(bx - 1, by, "K"); c.set(bx + w, by, "K")    # end caps
        c.line((bx, by + 3), (bx + w - 1, by + 3), "K")   # base shadow
        # a couple of stored core-chip glints in the open box lid
        c.set(bx + 1, by, "r"); c.set(bx + 2, by, "L")
    _corebox(c, bx0, by0, 5)                  # lower-left box on the ground
    _corebox(c, bx0 + 6, by0, 5)              # lower-right box
    _corebox(c, bx0 + 3, by0 - 3, 5)          # upper box stacked on the seam
    # --- low CORE-STORE LEAN-TO roof (deep basalt b) on two posts, sheltering the
    #     stack — a mono-pitch iso roof plane sloping down-right over the boxes. The
    #     high (back) edge abuts the shed's shaded wall; the low edge oversails right.
    rA = (bx0 - 2, by0 - 6)                   # roof high inner corner (against the shed wall)
    rB = (bx0 + 12, by0 - 8)                  # roof high outer corner (up-right, sits higher)
    rC = (bx0 + 13, by0 - 5)                  # roof low front-right corner (eave drops)
    rD = (bx0 - 1, by0 - 3)                   # roof low front-left corner
    c.fill_poly([rA, rB, rC, rD], "b")        # basalt roof plane (the new mass)
    c.line(rA, rB, "M")                       # lit back ridge of the lean-to
    c.line(rD, rC, "K")                       # front eave shadow
    for a, b in [(rA, rB), (rB, rC), (rC, rD), (rD, rA)]:
        c.line(a, b, "K")                     # K outline of the roof plane
    # d plank seams across the lean-to roof
    for t in (0.3, 0.55, 0.8):
        a = (rA[0] + t * (rB[0] - rA[0]), rA[1] + t * (rB[1] - rA[1]))
        b = (rD[0] + t * (rC[0] - rD[0]), rD[1] + t * (rC[1] - rD[1]))
        c.line(a, b, "d")
    # two slim basalt POSTS dropping from the roof front corners to the ground
    for (px, py) in (rD, rC):
        c.line((px, py + 1), (px, by0 + 3), "b")
        c.set(px + 1, py + 2, "d")            # shaded post edge
        c.set(px, by0 + 3, "K")               # post foot on the ground
    # K plank SKIRT board tying the store's base to the ground line
    c.line((bx0 - 1, by0 + 3), (bx0 + 12, by0 + 3), "K")


def _gantry_geom(shed):
    """Shared rooftop split-core SCAN-GANTRY geometry so t5's gold crown band (if it
    referenced the gantry) and t4 recompute from the SAME source point — the gantry
    rides on TWO rail posts standing on the shed roof. Returns the two rail-foot roof
    points, the rail-top y, and the bridge-beam endpoints + scan-head x. Clamped so
    every drawn point stays inside the 64px canvas (no off-canvas beam overshoot)."""
    # rail feet seat on the shed roof along the run: back post near the high ridge,
    # front post toward the low eave, so the bridge beam spans the roof lengthwise.
    backf = shed.roof_pt(0.34, 0.62)          # back rail foot on the roof (toward ridge)
    frontf = shed.roof_pt(0.74, 0.42)         # front rail foot on the roof (toward eave)
    bxf = (int(round(backf[0])), int(round(backf[1])))
    fxf = (int(round(frontf[0])), int(round(frontf[1])))
    rail_top = min(bxf[1], fxf[1]) - 9        # bridge beam height above the roof
    rail_top = max(rail_top, 2)               # keep the beam on-canvas
    # scan-head trolley sits ~55% along the beam (between the two rail tops)
    head_x = int(round(bxf[0] + 0.5 * (fxf[0] - bxf[0])))
    return bxf, fxf, rail_top, head_x


def stage4_scan_gantry(c, shed, geo):
    """t4 — MAJOR ADD: a rooftop SPLIT-CORE SCAN GANTRY — the cores are now being
    machine-logged. A deep-basalt b BRIDGE BEAM traverses the shed roof on TWO rail
    posts (a travelling overhead gantry), and a trolley lowers a glowing e CT/XRF
    SCAN-HEAD that lights the roof/core beneath it with an e analysis glow. The
    prominent new overhead mass that says 'this shed now logs every core'. Palette
    matures: basalt b frame + energized mineral e/E glow on the scan-head. Drawn AFTER
    the roof so it sits ON the shed; rises in clear canvas above the roof, fully
    on-canvas, and is well ABOVE + RIGHT of the front-left core signature (no collision
    with the scanner collar / mineral label). A scan gantry — distinct from the
    sampling-station core-drill derrick."""
    bxf, fxf, rail_top, head_x = _gantry_geom(shed)
    # --- two RAIL POSTS standing on the roof (basalt b, lit M left edge, K feet) ---
    for foot in (bxf, fxf):
        c.line((foot[0], foot[1]), (foot[0], rail_top), "b")
        c.set(foot[0] - 1, foot[1] - 2, "M")          # a lit edge glint on the post
        c.set(foot[0], foot[1], "K")                  # foot planted on the roof
        # a little K rail-cap pad where the beam lands on each post
        c.set(foot[0], rail_top, "K")
    # --- the BRIDGE BEAM spanning the two rail tops (the travelling gantry rail) ---
    beamL = (bxf[0], rail_top)
    beamR = (fxf[0], rail_top)
    c.line((beamL[0], beamL[1] - 1), (beamR[0], beamR[1] - 1), "M")   # lit top chord
    c.line(beamL, beamR, "b")                                         # beam body
    c.line((beamL[0], beamL[1] + 1), (beamR[0], beamR[1] + 1), "K")   # under-edge shadow
    # a couple of D truss ticks along the beam (gantry web)
    for t in (0.3, 0.5, 0.7):
        mx = int(round(beamL[0] + t * (beamR[0] - beamL[0])))
        c.set(mx, rail_top, "D")
    # --- TROLLEY on the beam + a cable lowering the glowing SCAN-HEAD ---
    c.fill_poly([(head_x - 1, rail_top + 1), (head_x + 1, rail_top + 1),
                 (head_x + 1, rail_top + 2), (head_x - 1, rail_top + 2)], "D")
    c.set(head_x - 1, rail_top + 1, "K"); c.set(head_x + 1, rail_top + 1, "K")
    head_y = rail_top + 6                       # scan-head hovers below the beam
    c.line((head_x, rail_top + 2), (head_x, head_y - 1), "K")         # hoist cable
    # the glowing CT/XRF scan-head: a small e box with a bright E core lens
    _stamp(c, head_x - 1, head_y, [
        "eEe",
        "GeG",                                   # shaded underside of the head
    ])
    c.set(head_x, head_y, "E")                  # bright scan lens
    # an e ANALYSIS GLOW lighting the roof directly beneath the scan-head (the core
    # being logged) — a short downward beam fading onto the roof plank below.
    glow_floor = head_y + 4
    # clamp the glow so it lands on the roof, never off-canvas
    glow_floor = min(glow_floor, 63)
    c.set(head_x, head_y + 2, "e")
    c.set(head_x, head_y + 3, "G")
    c.set(head_x - 1, glow_floor, "e"); c.set(head_x, glow_floor, "E"); c.set(head_x + 1, glow_floor, "e")


def stage5_strat_hologram(c, shed, geo):
    """t5 — CROWNING FEATURE = FULLY EVOLVED core-logging facility. A glowing
    STRATIGRAPHIC-COLUMN HOLOGRAM rises over the rack — a tall banded core-log column
    projected up from the scanned core: bright E column walls, e MINERAL-ZONE bands
    with K contacts + o depth ticks down one side, crowned by a bright E peak marker —
    plus GOLD premium trim: gold q rack RAILS gleaming under the core and a small gold
    'TYPE-SECTION' PLAQUE on the rack. Reads as an elite, fully-instrumented strat lab,
    still clearly the same core shed. The hologram rises in the CLEAR canvas above the
    front-left rack (anchored on the core's centre), kept fully on-canvas, and sits
    just LEFT of the t4 scan gantry so the two read as separate maxed features."""
    x0, x1, cy = geo["x0"], geo["x1"], geo["cy"]
    bandw, nseg = geo["bandw"], geo["nseg"]
    # --- holo column rises straight UP from the centre of the laid-out core, in the
    #     clear front-left airspace (left of the roof gantry). Anchor on the core. ---
    colx = x0 + (nseg * bandw) // 2 - 4         # column centre x ~ over the core mid
    colx = max(colx, 4)
    base_y = cy - 3                             # column foot just above the core glass
    col_h = 18                                  # tall log column
    top_y = max(base_y - col_h, 3)              # clamp the column top on-canvas
    colw = 4                                    # column width (4px banded log)
    # a faint projector PLINTH on the core where the column rises from
    c.set(colx + 1, base_y + 1, "e"); c.set(colx + 2, base_y + 1, "e")
    c.set(colx, base_y + 2, "G"); c.set(colx + 3, base_y + 2, "G")
    # the holographic COLUMN: bright E side walls, e MINERAL-ZONE band fills, K
    # stratigraphic contacts, banded deep->young up the column.
    zones = ["e", "G", "e", "g", "e", "G"]      # alternating mineral-zone bands
    band_h = max(2, (base_y - top_y) // len(zones))
    yy = base_y
    for zi, zc in enumerate(zones):
        z_top = max(top_y, yy - band_h)
        for y in range(z_top, yy + 1):
            for x in range(colx, colx + colw):
                c.set(x, y, zc)                 # zone fill
        c.line((colx, z_top), (colx + colw - 1, z_top), "K")   # K stratigraphic contact
        # o DEPTH TICK on the left edge at each contact (the depth scale)
        c.set(colx - 1, z_top, "o")
        yy = z_top - 1
        if yy <= top_y:
            break
    # bright E side walls running the full column height (the holo edges glow)
    c.line((colx, top_y), (colx, base_y), "E")
    c.line((colx + colw - 1, top_y), (colx + colw - 1, base_y), "E")
    # a bright E PEAK MARKER crowning the column top (youngest/surface layer)
    c.set(colx + 1, top_y - 1, "E"); c.set(colx + 2, top_y - 1, "W")
    c.set(colx, top_y, "E"); c.set(colx + 3, top_y, "E")
    # a couple of faint e shimmer ticks rising off the column crown (it's projected)
    c.set(colx + 1, top_y - 2, "e")
    # a short e LEADER tying the column foot to the scanned band on the core below
    c.line((colx + 1, base_y + 2), (geo["x0"] + bandw + 1, cy - 1), "e")

    # --- GOLD premium trim (t5 flourish ONLY) ----------------------------------
    # gold q RACK RAILS gleaming along the cradle rail under the core (elite rails)
    c.line((x0 + 2, cy + 2), (x1 - 3, cy + 2), "q")          # the rack rail re-gilded
    c.set(x0 + 2, cy + 3, "O"); c.set(x1 - 3, cy + 3, "O")   # gold rail saddle bosses
    # a small gold 'TYPE-SECTION' PLAQUE on the rack front (the elite designation)
    plx, ply = x0 + 4, cy + 3
    _stamp(c, plx, ply, [
        "qqqq",
        "qKKq",                                  # K engraving ticks on the gold plaque
    ])
    c.set(plx + 1, ply, "O"); c.set(plx + 2, ply, "O")       # bright gold plaque sheen


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the geological core lab at upgrade `stage` (1..5). Stage 1 is IDENTICAL
    to the shipped base PNG; each higher stage keeps every prior addition and bolts on
    the next (t2 core tray + loupe -> t3 core-store lean-to -> t4 rooftop scan gantry ->
    t5 strat-column hologram + gold). Painter's order keeps rooftop/overhead additions
    above the masses they grow from; the front-left core signature is the hero and the
    upgrade adds are placed clear of its scanner collar / mineral label."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    base_shadow(c)                 # contact shadow under the long footprint
    berm = hillside_cut(c)         # LOW banded rock-strata earth bank (back-left)
    shed = main_shed(c, berm)      # the long low shed — the dominant mass
    shed_roof(c, shed)             # mono-pitch corrugated shed roof + vent + cable
    left_bay(c, shed)              # LIT-LEFT roll-up core-bay door + placard (on wall)
    right_face(c, shed)            # plainer shaded-right long wall + vent

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    # The SIGNATURE core_scanner is drawn here (it returns the core geometry the
    # stages anchor to), then the apron-level adds (t2 tray, t3 core-store) layer on
    # the apron, and the OVERHEAD adds (t4 gantry on the roof, t5 holo column above
    # the rack) layer last so they sit on top of the masses they grow from.
    geo = core_scanner(c, shed)    # SIGNATURE: inclined glass drill-core + teal scanner

    if stage >= 2:
        stage2_core_tray(c, geo)
    if stage >= 3:
        stage3_core_store(c, shed)
    if stage >= 4:
        stage4_scan_gantry(c, shed, geo)
    if stage >= 5:
        stage5_strat_hologram(c, shed, geo)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/terrabase"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "geological-core-lab"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped geological-core-lab.png, so it does NOT overwrite the
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
