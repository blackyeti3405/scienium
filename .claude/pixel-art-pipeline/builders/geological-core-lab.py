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
"""
import os
import sys
import json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, RX, RY, LX, LY

TERRA = {"K": "#20190f", "W": "#efe6cf", "L": "#d6c8a0", "M": "#b09a6e", "D": "#7e6c47", "d": "#54462c",
         "h": "#d6f2ea", "c": "#a4e2d4", "g": "#34b6a2", "G": "#1d8474",
         "o": "#e0a850", "O": "#ffce80", "r": "#9a5e1e"}


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
    card (K tick + O dot) popping above the read band. Drawn LAST."""
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


# ── build ─────────────────────────────────────────────────────────────────────
def build():
    c = Canvas()
    base_shadow(c)                 # contact shadow under the long footprint
    berm = hillside_cut(c)         # LOW banded rock-strata earth bank (back-left)
    shed = main_shed(c, berm)      # the long low shed — the dominant mass
    shed_roof(c, shed)             # mono-pitch corrugated shed roof + vent + cable
    left_bay(c, shed)              # LIT-LEFT roll-up core-bay door + placard (on wall)
    right_face(c, shed)            # plainer shaded-right long wall + vent
    core_scanner(c, shed)          # SIGNATURE: inclined glass drill-core + teal scanner

    spec = {"width": 64, "height": 64, "palette": TERRA, "rows": c.rows()}
    out = "/path/to/scienium/art/src/buildings/terrabase_geological-core-lab.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
