#!/usr/bin/env python3
"""
Cleanroom Synthesizer — ChemWorks PREMIUM capstone (BESPOKE iso form, NOT the
gateway cube) + its 4-stage UPGRADE-EVOLUTION sprites.

Composed from the iso BUILDING TOOLKIT (isobuild.Box) as the SLEEKEST, most
polished building in the set — a sealed contamination-controlled cleanroom block:

  * a wide, low-to-mid main cleanroom Box in blue-grey M/D walls on a thin L/W
    plinth — the cleanest, gleaming massing, no exposed pipework;
  * a CURVED PREMIUM GLASS CURTAIN WALL wrapping the lit-left corner — a smooth
    convex ribbon of c/h panes with crisp K mullions and bright W reflections
    (built by hand with fill_poly/line over the flat face, bowed outward), the
    signature that says "premium glazed cleanroom" not "plain box";
  * a setback HEPA FILTER PLENUM Box on the roof — a clean L/W clerestory with a
    K-grid of square HEPA-filter panels on its top + a thin c clerestory band and
    W premium rim glints (the contamination-controlled ceiling);
  * a small projecting AIRLOCK VESTIBULE Box at the front-right corner — a sealed
    glass pod with a K-framed double door + an o "cycle" indicator;
  * a faint o/O violet downflow shimmer at the eave.

OPENING SIDE = RIGHT. The hero synthesis bay + airlock sit on the SHADED RIGHT
face and are made to GLOW (bright h/O violet-clean lit interior, an h reflection
sweep) so the premium glass reads on the shaded side. The LIT LEFT face stays the
calmer, plainer curved curtain wall (quiet c, one h glint).

Signature (one-of-one): behind the glowing right glass, a sealed GLOVEBOX with a
slim articulated ROBOTIC ARM placing a single bright glowing ATOM onto a tiny
part-built ball-and-stick MOLECULE — all bathed in the faint vertical shimmer of
LAMINAR CLEAN-AIR DOWNFLOW falling evenly from the HEPA ceiling. A small c/g
purity gauge pinned at an O 99.9% mark + sterile h sparkles + an o violet
clean-glow pool at the bay floor read the optimization minigame.

UPGRADE EVOLUTION (cumulative — the sealed cleanroom grows into a fully automated
synthesis cell; the clean-air / HEPA / process theme intensifies; the energized
teal e/E process glow arrives at t4; gold is a t5 flourish only):
  t2  small functional add : an AIRLOCK PASS-THROUGH transfer hatch + a c "CLEAN"
                             status panel on the lit-left front, and a brightened o
                             cycle-light over the right-face chamber window
  t3  structural add       : a GOWNING-ROOM VESTIBULE annex bolted to the lit-left
                             end — a small Box with a g-glass interlock door + a
                             roof HEPA grille (new b-shadowed mass extending left)
  t4  major add            : a tall vertical LAMINAR-FLOW TOWER / filter plenum
                             rising off the back-right roof, stacked e-glowing HEPA
                             banks blowing clean air down toward the chamber
  t5  crowning feature     : the synthesis chamber LIGHTS UP as a glowing automated
                             REACTOR CELL — a robotic dosing head over an E
                             reaction-glow vessel behind the glass + q gold airlock
                             trim and a gold chamber seal ring
"""
import os, sys, json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder  # noqa: F401  (cylinder kept available)

# Base ChemWorks palette (shared keys) + the EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so cleanroom-synthesizer.png is
# unchanged). These exact keys+hexes are the lab-wide chemworks evolved accents:
#   b  deepened structure steel — matured tone for t4+ new masses
#   e  energized clean/process glow (mid)   E  energized glow (bright) — t4/t5 power
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
CHEM = {"K": "#161a2e", "W": "#e6ecfb", "L": "#c2cdee", "M": "#9aa8d8", "D": "#6f7cb0", "d": "#4b5688",
        "h": "#d6ecff", "c": "#a8d4ff", "g": "#4aa0e6", "G": "#2166b0",
        "o": "#c89cf0", "O": "#e0c2ff", "r": "#6a34a8",
        "b": "#363c5e", "e": "#36e0c8", "E": "#c2fff2", "q": "#f0c64a"}

# Height (px) of the t4 laminar-flow tower above its roof foot. Defined ONCE here
# because the tower geometry derives its top from this single number, kept short
# enough that the tower (banks + cowl + downflow) lands fully on-canvas (its cowl
# top sits a couple rows below y=0 with margin).
TOWER_H = 19


# ── small pixel helpers ──────────────────────────────────────────────────────
def P(pt):
    return (int(round(pt[0])), int(round(pt[1])))


def rect(c, x0, y0, x1, y1, fill=None, outline=None):
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    if fill is not None:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                c.set(x, y, fill)
    if outline is not None:
        for x in range(x0, x1 + 1):
            c.set(x, y0, outline); c.set(x, y1, outline)
        for y in range(y0, y1 + 1):
            c.set(x0, y, outline); c.set(x1, y, outline)


# ── 1. MAIN CLEANROOM BLOCK — wide low Box on a thin plinth ──────────────────
def cleanroom_block(c):
    """A wide, low-to-mid sealed cleanroom block — distinctly wider/lower than the
    tall square gateway cube. Clean blue-grey M/D walls, drawn first (back mass)."""
    # wider DEPTH (wy) so the SHADED RIGHT hero face has room for the glovebox arm;
    # modest wx so the wide-low premium massing still fits the 64 canvas.
    block = Box(top=(28, 16), wx=12, wy=13, h=15)
    block.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    return block


def plinth(c, block):
    """A thin bright L/W plinth line wrapping the base — premium, lifts the block
    off the ground so it reads sealed/gleaming, not sitting in dirt."""
    # lit-left base band
    c.line(block.left_pt(0.0, block.h - 1.0), block.left_pt(1.0, block.h - 1.0), "L")
    c.line(block.left_pt(0.0, block.h - 1.7), block.left_pt(1.0, block.h - 1.7), "W")
    # shaded-right base band (darker)
    c.line(block.right_pt(0.0, block.h - 1.0), block.right_pt(1.0, block.h - 1.0), "M")
    c.line(block.right_pt(0.0, block.h - 1.7), block.right_pt(1.0, block.h - 1.7), "L")


# ── 2. HEPA FILTER PLENUM — setback roof Box w/ K-grid of filter panels ──────
def hepa_plenum(c, block):
    """A clean setback plenum on the roof — the contamination-controlled HEPA
    ceiling. L/W clerestory walls, a K-grid of square filter panels on its top,
    a thin c clerestory band + W premium rim glints. Centred-back on the deck."""
    base = block.roof_pt(0.5, 0.5)
    plen = Box(top=(base[0], base[1] - 11), wx=8, wy=8, h=5)
    # soft K stilt-shade under the plenum so it stands proud of the deck
    c.line((plen.w_left[0], plen.w_left[1]), (plen.w_front[0], plen.w_front[1]), "d")
    c.line((plen.w_front[0], plen.w_front[1]), (plen.w_right[0], plen.w_right[1]), "d")
    plen.draw(c, roof="L", lwall="L", rwall="D", roof_hi="W", outline="K")

    # thin cool clerestory band wrapping the upper plenum walls
    c.line(plen.left_pt(0.06, 1.0), plen.left_pt(0.94, 1.0), "c")
    c.line(plen.left_pt(0.06, 1.5), plen.left_pt(0.94, 1.5), "h")
    c.line(plen.right_pt(0.06, 1.0), plen.right_pt(0.94, 1.0), "g")

    # K-grid of square HEPA-filter panels across the plenum TOP (3x2 cells)
    nx, ny = 3, 2
    for i in range(nx):
        for j in range(ny):
            u0 = 0.12 + 0.76 * i / nx
            u1 = 0.12 + 0.76 * (i + 1) / nx
            v0 = 0.12 + 0.76 * j / ny
            v1 = 0.12 + 0.76 * (j + 1) / ny
            cell = [plen.roof_pt(u0, v0), plen.roof_pt(u1, v0),
                    plen.roof_pt(u1, v1), plen.roof_pt(u0, v1)]
            c.fill_poly(cell, "M")           # filter face (cool grey)
            # bright back-left glint per panel + K grid lines
            c.line(plen.roof_pt(u0, v0), plen.roof_pt(u1, v0), "L")
            for a, b in [(cell[0], cell[1]), (cell[1], cell[2]),
                         (cell[2], cell[3]), (cell[3], cell[0])]:
                c.line(a, b, "K")
    # bright premium rim crest along the plenum ridge
    c.line(plen.r_top, plen.r_right, "W")
    c.line(plen.r_top, plen.r_left, "W")
    return plen


# ── 3. CURVED GLASS CURTAIN WALL on the LIT LEFT face (the premium signature) ─
def left_curtain_wall(c, block):
    """The premium curtain wall on the LIT LEFT face — now a FEW LARGE GLASS PANES
    spaced apart with wall between them, each rendered by Box.window() so it reads
    as real glass (sky-reflection gradient + diagonal shine + clean K frame), NOT
    a dense field of blue stripes chopped by black bars. Calmer than the glowing
    right per the opening-side contract: cool quiet `g` glass, one soft mullion.

    Three tall panes across the lit face, each separated by a strip of M wall so
    the eye reads glass-wall-glass-wall, the curtain-wall rhythm without the mess."""
    vt, vb = 2.0, block.h - 2.4
    # three panes, each ~0.24 wide, with wall gaps between them
    panes = [(0.07, 0.31), (0.385, 0.625), (0.70, 0.94)]
    for (pu0, pu1) in panes:
        # mullions=0 so each pane reads as ONE clean sheet of glass (sky-reflection
        # gradient + diagonal shine), not split back into thin vertical bars.
        block.window(c, "left", pu0, pu1, vt, vb,
                     glass="g", hi="c", shade="G", frame="K", mullions=0, sheen="h")
    # a thin bright L sill rail under the panes ties the curtain together (premium)
    c.line(block.left_pt(0.07, vb + 0.4), block.left_pt(0.94, vb + 0.4), "L")


# ── 4. AIRLOCK VESTIBULE — small projecting Box at the front-right corner ─────
def airlock_vestibule(c, block):
    """A small sealed glass airlock pod projecting from the FRONT-RIGHT corner — a
    K-framed double door with an o 'cycle' indicator. Drawn before the right-face
    synthesis bay so the bay glow reads against it. Sits forward of the block."""
    fc = block.r_front
    pod = Box(top=(fc[0] + 4, fc[1] + 5), wx=4, wy=4, h=9)
    pod.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # sealed glass double DOOR on the pod's RIGHT face (faces same way as the bay)
    # brighter glass='c'/hi='h' so the airlock GLOWS on the shaded face like the bay
    pod.window(c, "right", 0.16, 0.84, 1.6, 7.6, glass="c", hi="h", shade="G", frame="K", mullions=1)
    # o "cycle" indicator lamp over the door
    ind = pod.right_pt(0.5, 0.9)
    c.set(int(round(ind[0])), int(round(ind[1])), "o")
    c.set(int(round(ind[0])), int(round(ind[1] - 1)), "O")
    # a calm c entry glow on the pod's lit-left face (the inner clean side)
    pod.window(c, "left", 0.2, 0.8, 2.0, 7.0, glass="c", hi="h", shade="G", frame="K")
    return pod


# ── 5. GLOWING SYNTHESIS BAY on the SHADED RIGHT face (the GLOW + HERO) ───────
def right_synthesis_bay(c, block):
    """The hero: a tall premium synthesis-bay curtain panel on the SHADED RIGHT
    face, made to GLOW (bright h/O violet-clean lit interior) so it reads on the
    shaded side. Returns the bay rect (u0,u1,vt,vb) so the signature seats in it."""
    # bay occupies MOST of the now-wider right face; the airlock pod sits at the
    # front corner (u near 0), so the bay runs u 0.10..0.92 for a big hero panel.
    u0, u1 = 0.10, 0.92
    vt, vb = 2.0, block.h - 2.4

    # Render the WHOLE bay as one big GLOWING GLASS panel with Box.window() so the
    # curtain reads as bright lit glass on the shaded face — sky-reflection
    # gradient + diagonal shine + clean K frame. Use bright glass='c'/hi='h' so it
    # GLOWS against the dark right wall (the brief: interior-lit reads brightest).
    block.window(c, "right", u0, u1, vt, vb,
                 glass="c", hi="h", shade="G", frame="K", mullions=0, sheen="W")

    # Over the glass, punch the DEEP-blue recessed INTERIOR pocket in the CENTRE
    # only — the dark sealed chamber the glovebox hero sits in — leaving a glass
    # margin all around so the panel still reads as glazing framing a lit chamber.
    iu0, iu1 = u0 + 0.16, u1 - 0.16
    c.fill_poly([block.right_pt(iu0, vt + 1.4), block.right_pt(iu1, vt + 1.4),
                 block.right_pt(iu1, vb - 1.0), block.right_pt(iu0, vb - 1.0)], "G")
    # a darker upper shadow band under the HEPA ceiling inside the chamber
    c.fill_poly([block.right_pt(iu0, vt + 1.4), block.right_pt(iu1, vt + 1.4),
                 block.right_pt(iu1, vt + 2.4), block.right_pt(iu0, vt + 2.4)], "d")
    # a soft o violet clean-glow pooling ONLY at the chamber floor (reaction spill)
    c.fill_poly([block.right_pt(iu0, vb - 1.8), block.right_pt(iu1, vb - 1.8),
                 block.right_pt(iu1, vb - 1.0), block.right_pt(iu0, vb - 1.0)], "o")
    # thin K reveal framing the inner chamber so it reads recessed behind glass
    c.line(block.right_pt(iu0, vt + 1.4), block.right_pt(iu1, vt + 1.4), "K")
    c.line(block.right_pt(iu0, vt + 1.4), block.right_pt(iu0, vb - 1.0), "K")
    c.line(block.right_pt(iu1, vt + 1.4), block.right_pt(iu1, vb - 1.0), "K")
    return (u0, u1, vt, vb)


# ── 6. SIGNATURE — glovebox robotic arm placing a glowing atom + laminar flow ─
def glovebox_signature(c, block, bay):
    """The one-of-one feature, drawn LAST so it reads on top of the glowing bay:
    a sealed glovebox with a slim articulated robotic arm placing a single bright
    glowing ATOM onto a tiny part-built MOLECULE, under faint vertical LAMINAR
    CLEAN-AIR DOWNFLOW lines, with a small c/g purity gauge pinned at 99.9%.

    Drawn in PIXEL space off a screen anchor box (the central clear light of the
    bay) so the arm/atom/molecule have crisp, legible spacing instead of being
    squashed by the foreshortened face coords.

    Returns the glovebox screen rect (bx0,by0,bx1,by1) so the t5 reactor-cell
    upgrade can re-anchor its dosing head + reaction vessel from the SAME box."""
    # The right bay is the parallelogram TL(29,42) TR(50,31) BR(50,42) BL(29,52).
    # Place the glovebox as a FIXED axis-aligned pixel rect in its upper-right
    # (where the face is "tallest"), so the hero reads crisply regardless of skew.
    bx0, bx1 = 38, 47        # 10px wide glovebox, centred in the bay (x29..50)
    by0, by1 = 34, 44        # 11px tall

    # --- LAMINAR DOWNFLOW: three faint dashed c/h shimmer columns INSIDE the bay,
    #     falling from the HEPA ceiling — drawn first, BEHIND the glovebox/arm ---
    for xx, ch in ((bx0 + 1, "c"), (bx0 + 4, "h"), (bx0 + 7, "c")):
        for yy in range(by0 + 1, by1 - 1, 2):
            c.set(xx, yy, ch)

    # --- sealed GLOVEBOX: a crisp K-framed enclosure with a LIGHT clean interior
    #     (M/L) so the dark arm + the bright atom + blue molecule all read ---
    rect(c, bx0, by0, bx1, by1, outline="K")
    rect(c, bx0 + 1, by0 + 1, bx1 - 1, by1 - 1, fill="M")   # clean lit interior
    c.line((bx0 + 1, by0 + 1), (bx1 - 1, by0 + 1), "L")     # bright top glaze edge
    c.line((bx0 + 1, by1 - 1), (bx1 - 1, by1 - 1), "c")     # cool floor shelf
    c.set(bx0 + 1, by0 + 2, "L")                            # corner glass glint
    # two round K glove-PORTS on the front glass (unmistakably a glovebox)
    for px in (bx0 + 2, bx1 - 3):
        c.set(px, by0 + 3, "K"); c.set(px + 1, by0 + 3, "K")
        c.set(px, by0 + 4, "K"); c.set(px + 1, by0 + 4, "K")

    # --- part-built MOLECULE seated on the floor shelf: ONE blue atom + the apex
    #     where the incoming atom joins (minimal, so the placement reads) ---
    mfy = by1 - 2
    seat = (bx0 + 3, mfy)                                   # seated blue atom
    apex = (seat[0] + 2, mfy - 2)                           # join point (up-right)
    c.line(seat, apex, "K")                                # bond (dark, reads on M)
    c.set(*seat, "c"); c.set(seat[0] - 1, seat[1], "g"); c.set(seat[0], seat[1] - 1, "h")
    c.set(*apex, "o")
    join = (apex[0], apex[1] - 2)                           # open bond reaching up
    c.line((apex[0], apex[1] - 1), join, "K")

    # --- slim diagonal ROBOTIC ARM descending from the box ceiling to the join ---
    shoulder = (bx1 - 2, by0 + 2)                           # mount top-right
    elbow = (shoulder[0] - 3, shoulder[1] + 3)
    wrist = (join[0] + 1, join[1] + 1)
    c.line(shoulder, elbow, "K")                           # upper arm (dark, reads)
    c.line(elbow, wrist, "K")                              # forearm
    c.line((shoulder[0] - 1, shoulder[1]), (elbow[0] - 1, elbow[1]), "W")  # edge hi
    c.set(*shoulder, "L"); c.set(shoulder[0], shoulder[1] - 1, "L")        # mount
    c.set(*elbow, "W")                                     # bright elbow joint
    c.set(*wrist, "K")                                     # fine gripper tip

    # --- the single bright glowing ATOM at the gripper, about to be placed ---
    atom = (join[0], join[1] - 1)
    c.set(*atom, "W")                                      # bright core
    c.set(atom[0] - 1, atom[1], "O"); c.set(atom[0] + 1, atom[1], "O")     # halo
    c.set(atom[0], atom[1] - 1, "O")
    c.set(atom[0], atom[1] + 1, "o")                       # o glow where it joins

    # --- purity GAUGE pinned at 99.9%, to the RIGHT of the box on the dark glass ---
    gx, gy = bx1 + 2, by0 + 3
    rect(c, gx, gy, gx + 1, gy + 3, fill="c", outline="K")
    c.set(gx, gy + 1, "g"); c.set(gx + 1, gy + 1, "g")     # gauge fill
    c.set(gx, gy, "O")                                     # pinned-high O mark

    # --- two sterile h/W sparkles in the dark clean bay ---
    for sx, sy in [(bx1 + 2, by1 - 2), (bx0 - 2, by0 + 1)]:
        c.set(sx, sy, "h"); c.set(sx, sy - 1, "W")
    return (bx0, by0, bx1, by1)


# ── 7. eave violet downflow shimmer (premium clean-glow at the eave) ──────────
def eave_glow(c, block):
    """A faint o/O violet downflow shimmer at the lit-left eave — the premium
    clean-glow signature reading across the whole building, not just the bay."""
    for k in range(6):
        u = 0.12 + 0.62 * k / 6
        p = block.left_pt(u, 1.4)
        c.set(int(round(p[0])), int(round(p[1])), "o" if k % 2 else "O")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS clean-air /
# HEPA / automation structure onto the prior form — never restarts, never recolors
# the whole building. Theme: the sealed cleanroom grows into a fully automated
# synthesis CELL. Colours mature stage by stage; the energized teal e/E process
# glow arrives at t4; gold (q) is a t5 flourish only.
#
#   t2  small functional add : airlock PASS-THROUGH hatch + c CLEAN panel + o cycle
#   t3  structural add       : GOWNING-ROOM VESTIBULE annex on the lit-left end
#   t4  major add            : vertical LAMINAR-FLOW TOWER off the back-right roof
#   t5  crowning feature     : chamber lights up as a glowing automated REACTOR CELL
#                              (dosing head + E vessel) + gold airlock/seal trim
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_passthrough(c, block):
    """t2 — SMALL FUNCTIONAL ADD: a compact AIRLOCK PASS-THROUGH / HEPA-INTAKE CRATE
    standing on the BRIGHT LIT-LEFT ROOF SHOULDER (the back-left roof tip), with a c
    'CLEAN' status panel on its visible front face and a brightened o cycle-light pip
    over the right-face chamber window. On-theme (more contamination control: a sealed
    sample transfer crate + intake hood feeding the cleanroom), modest, base palette +
    the one brightened o pip.

    ROUND-2 FIX: the r1 hatch was painted into the dark LEFT WALL over an already-dark
    curtain region and disappeared (base->t2 = 9px). It is RELOCATED to a clearly
    visible surface — a short raised crate that sits proud of the bright `L`-toned roof
    deck — drawn in CONTRASTING dark-frame + bright-panel tones so it reads at 64px.
    Seated on the back-left roof tip (x~6..13, y~22..28) so it is clear of the central
    HEPA plenum, the back-right t4 laminar tower, and the glovebox hero on the RIGHT
    face. Targets a readable ~6px crate, not a 9px speck."""
    # anchor on the bright back-left roof shoulder (lit `L` deck, clear of plenum/tower)
    ax, ay = P(block.roof_pt(0.085, 0.27))              # ~ (10, 27)
    # ---- a small raised pass-through CRATE as its own little iso prism on the roof.
    #      A short b-steel box (deepened structure tone) so its dark mass contrasts the
    #      bright roof; one lit-left face + one shaded-right face + a bright cap. ----
    crate = Box(top=(ax, ay - 6), wx=3, wy=3, h=4)
    crate.shadow(c, "K")
    c.fill_poly([crate.r_top, crate.r_right, crate.r_front, crate.r_left], "W")     # bright lit cap (brightest, pops off roof)
    c.fill_poly([crate.r_left, crate.r_front, crate.w_front, crate.w_left], "L")    # lit-left face (bright, contrasts the dark wall-shadow below)
    c.fill_poly([crate.r_front, crate.r_right, crate.w_right, crate.w_front], "b")  # shaded-right face (deep steel for form)
    c.fill_poly([crate.r_top, crate.r_left, crate.r_front], "W")                    # lit roof triangle
    c.line(crate.r_top, crate.r_left, "W")
    c.line(crate.r_top, crate.r_right, "W")
    for a, b in [(crate.r_top, crate.r_right), (crate.r_right, crate.r_front),
                 (crate.r_front, crate.r_left), (crate.r_left, crate.r_top),
                 (crate.r_left, crate.w_left), (crate.r_front, crate.w_front),
                 (crate.r_right, crate.w_right),
                 (crate.w_left, crate.w_front), (crate.w_front, crate.w_right)]:
        c.line(a, b, "K")
    # ---- a bold c 'CLEAN' status panel inset on the crate's lit-LEFT face (a glowing
    #      indicator board with an h lamp + a g readout bar). Fills most of the face so
    #      the bright cyan reads clearly at 64px against the L face + K frame. ----
    c.fill_poly([crate.left_pt(0.16, 0.9), crate.left_pt(0.84, 0.9),
                 crate.left_pt(0.84, 3.0), crate.left_pt(0.16, 3.0)], "c")
    # bright top band + darker sill so the panel reads as a lit board, not a flat fill
    c.line(crate.left_pt(0.16, 0.9), crate.left_pt(0.84, 0.9), "h")
    c.line(crate.left_pt(0.16, 3.0), crate.left_pt(0.84, 3.0), "G")
    for a, b in [(crate.left_pt(0.16, 0.9), crate.left_pt(0.84, 0.9)),
                 (crate.left_pt(0.16, 3.0), crate.left_pt(0.84, 3.0)),
                 (crate.left_pt(0.16, 0.9), crate.left_pt(0.16, 3.0)),
                 (crate.left_pt(0.84, 0.9), crate.left_pt(0.84, 3.0))]:
        c.line(a, b, "K")
    c.set(*P(crate.left_pt(0.36, 1.6)), "W")            # bright CLEAN lamp pip
    c.line(crate.left_pt(0.28, 2.3), crate.left_pt(0.74, 2.3), "g")   # green-clean readout bar
    # ---- a short HEPA INTAKE GRILLE on the crate cap (a K-gridded square it draws air
    #      through) so it reads as a clean-air intake, not a plain box ----
    gu0, gu1, gv0, gv1 = 0.26, 0.74, 0.28, 0.74
    grille = [crate.roof_pt(gu0, gv0), crate.roof_pt(gu1, gv0),
              crate.roof_pt(gu1, gv1), crate.roof_pt(gu0, gv1)]
    c.fill_poly(grille, "M")
    for a, b in [(grille[0], grille[1]), (grille[1], grille[2]),
                 (grille[2], grille[3]), (grille[3], grille[0])]:
        c.line(a, b, "K")
    c.line(crate.roof_pt((gu0 + gu1) / 2, gv0), crate.roof_pt((gu0 + gu1) / 2, gv1), "K")
    c.set(*P(crate.roof_pt(gu0 + 0.05, gv0 + 0.08)), "L")            # back-left glint

    # ---- brightened o CYCLE-LIGHT pip over the right-face chamber window ----------
    # a bright o->O bead just above the right bay top (the freshly-lit cycle), with a
    # small O halo so it reads at 64px.
    cl = P(block.right_pt(0.50, 0.8))
    c.set(cl[0], cl[1], "o")
    c.set(cl[0], cl[1] - 1, "O")
    c.set(cl[0] - 1, cl[1], "o"); c.set(cl[0] + 1, cl[1], "o")


def stage3_gowning_annex(c, block):
    """t3 — STRUCTURAL ADD: a GOWNING-ROOM VESTIBULE — a secondary low Box bolted onto
    the lit-LEFT END of the cleanroom (where staff gown up before entering), whose
    front shows a tall g-glass interlock door onto a coat rail, with a small HEPA
    return grille on its little roof. A real new structural mass (its own prism +
    roof), extending the building OUT to the lit-left while staying lower than the
    main block. Introduces the matured deep-steel tone `b`.

    Seated FORWARD of the lit-left face (projecting toward the viewer from the left
    end) and dropped lower than the block, fully on-canvas (xmin=2). Drawn after the
    block so it sits in front of the lit face; its own footprint keeps the base block
    untouched. Its lit-left face carries the glass interlock door (faces the viewer)
    and its shaded-right face turns toward the building."""
    # seat a small prism FORWARD-LEFT of the block, abutting the lit-left base and
    # dropped so it reads as a lower vestibule. top=(10,38) keeps the whole annex on
    # canvas (xmin=2, ymax=54) and clear of the front-right airlock pod (x>=22).
    annex = Box(top=(10, 38), wx=4, wy=4, h=8)
    # draw with cooler/darker tones so it reads as an attached service block
    annex.shadow(c, "K")
    c.fill_poly([annex.r_top, annex.r_right, annex.r_front, annex.r_left], "L")     # lit roof
    c.fill_poly([annex.r_left, annex.r_front, annex.w_front, annex.w_left], "M")    # lit-left wall
    c.fill_poly([annex.r_front, annex.r_right, annex.w_right, annex.w_front], "b")  # shaded-right wall (matured steel)
    c.fill_poly([annex.r_top, annex.r_left, annex.r_front], "L")                    # lit roof triangle
    c.line(annex.r_top, annex.r_left, "W")
    c.line(annex.r_top, annex.r_right, "W")
    for a, b in [(annex.r_top, annex.r_right), (annex.r_right, annex.r_front),
                 (annex.r_front, annex.r_left), (annex.r_left, annex.r_top),
                 (annex.r_left, annex.w_left), (annex.r_front, annex.w_front),
                 (annex.r_right, annex.w_right),
                 (annex.w_left, annex.w_front), (annex.w_front, annex.w_right)]:
        c.line(a, b, "K")
    # ---- a tall g-glass INTERLOCK DOOR on the annex's lit-left face onto a coat rail ----
    annex.window(c, "left", 0.20, 0.80, 1.8, 7.2, glass="g", hi="c", shade="G", frame="K", mullions=1)
    # a coat-rail line behind the glass + a couple of hung-gown bumps (the gowning room)
    c.line(annex.left_pt(0.24, 3.0), annex.left_pt(0.76, 3.0), "G")
    for gu in (0.34, 0.50, 0.66):
        c.set(*P(annex.left_pt(gu, 3.6)), "c")            # hung clean-suits
    # a small o interlock 'cleared' lamp over the door
    il = P(annex.left_pt(0.50, 1.1))
    c.set(il[0], il[1], "o"); c.set(il[0], il[1] - 1, "O")

    # ---- a small HEPA RETURN GRILLE on the annex roof (ties it to the clean theme) ----
    # a tidy K-gridded square panel on the lit roof triangle (back of the little roof).
    gu0, gu1, gv0, gv1 = 0.28, 0.72, 0.30, 0.72
    grille = [annex.roof_pt(gu0, gv0), annex.roof_pt(gu1, gv0),
              annex.roof_pt(gu1, gv1), annex.roof_pt(gu0, gv1)]
    c.fill_poly(grille, "M")
    for a, b in [(grille[0], grille[1]), (grille[1], grille[2]),
                 (grille[2], grille[3]), (grille[3], grille[0])]:
        c.line(a, b, "K")
    # two interior grid bars (the HEPA grille louvers)
    c.line(annex.roof_pt((gu0 + gu1) / 2, gv0), annex.roof_pt((gu0 + gu1) / 2, gv1), "K")
    c.line(annex.roof_pt(gu0, (gv0 + gv1) / 2), annex.roof_pt(gu1, (gv0 + gv1) / 2), "K")
    c.set(*P(annex.roof_pt(gu0 + 0.04, gv0 + 0.06)), "L")  # back-left glint


def stage4_laminar_tower(c, block, plen):
    """t4 — MAJOR ADD: a tall vertical LAMINAR-FLOW TOWER / filter plenum rising off
    the BACK-RIGHT roof shoulder — a slender b-steel Box housing a stack of e-glowing
    HEPA banks that blow clean air DOWN into the chamber below (short downflow arrows).
    The prominent new vertical mass that says 'this cleanroom now runs a full laminar
    process column'. Palette matures: deep `b` shell + energized teal `e/E` filter
    glow. Foot anchored on the BACK-RIGHT roof corner (clear of the centred HEPA grid
    and clear of the front-right glovebox/airlock); height clamped on-canvas via
    TOWER_H. Takes the existing plenum so it reads as growing off the HEPA ceiling."""
    # foot on the back-right roof shoulder: between the plenum (centre) and r_right
    # corner, so the tower rises clear of the HEPA grid and well behind the front bay.
    fx, fy = P(block.roof_pt(0.78, 0.74))
    base_y = fy
    top_y = max(2, base_y - TOWER_H)                    # TALL but clamped on-canvas
    half = 2                                             # tower is 5px wide (2*2+1)
    # ---- a short b plinth seating the tower on the roof ----
    for dx in range(-half, half + 1):
        c.set(fx + dx, base_y, "b")
    for dx in range(-half - 1, half + 2):
        c.set(fx + dx, base_y + 1, "K")                 # plinth base shadow line
    # ---- the tower SHELL: b steel sides with a lit-left L edge + K outline ----
    for yy in range(top_y, base_y):
        for dx in range(-half, half + 1):
            col = "L" if dx == -half else ("D" if dx > 0 else "b")
            c.set(fx + dx, yy, col)
    c.line((fx - half - 1, top_y), (fx - half - 1, base_y), "K")   # left outline
    c.line((fx + half + 1, top_y), (fx + half + 1, base_y), "K")   # right outline
    # ---- stacked e-glowing HEPA BANKS climbing the tower (the filter modules) ----
    # each bank is a thin horizontal e/E band framed by K, stacked up the shell.
    bank_rows = range(top_y + 2, base_y - 1, 3)
    for j, by in enumerate(bank_rows):
        glow = "E" if j % 2 == 0 else "e"
        for dx in range(-half + 1, half):
            c.set(fx + dx, by, glow)
        c.set(fx - half, by, "K"); c.set(fx + half, by, "K")       # bank end frames
        c.set(fx - half - 1, by, "K"); c.set(fx + half + 1, by, "K")
    # ---- a wider intake COWL / cap closing the tower top (the filter house head) ----
    cowl_y = top_y - 1
    for dx in range(-half - 1, half + 2):
        c.set(fx + dx, cowl_y, "L")
        c.set(fx + dx, top_y, "M")
    c.set(fx - half - 2, cowl_y, "K"); c.set(fx + half + 2, cowl_y, "K")
    c.set(fx - half - 1, cowl_y - 1, "K"); c.set(fx + half + 1, cowl_y - 1, "K")
    for dx in range(-half, half + 1):
        c.set(fx + dx, cowl_y - 1, "L")
    c.line((fx - half - 1, cowl_y - 1), (fx + half + 1, cowl_y - 1), "W")  # bright crest
    # ---- short DOWNFLOW arrows blowing clean air down off the tower foot toward
    #      the chamber (the laminar tell) — a few e dashes fanning down-front ----
    df_x = fx - 1
    df_y = base_y + 2
    for k in range(3):
        ax = df_x - k
        ay = df_y + k
        if ay > 56:
            break
        c.set(ax, ay, "e")
        c.set(ax, ay + 1, "E")          # bright leading edge of the downflow
        # tiny arrowhead
        c.set(ax - 1, ay, "e"); c.set(ax + 1, ay, "e")


def stage5_reactor_cell(c, block, glove):
    """t5 — CROWNING FEATURE = FULLY EVOLVED automated synthesis cell. The crowning
    new MASS is a glowing energized-teal REACTOR CROWN seated on TOP of the t4 laminar
    tower (a flared filter-head cap stacked with bright E/e reaction-glow banks and a
    rising vapor finial) — it reads externally above the whole building as 'the cleanroom
    now runs a live automated reaction column'. Below, the sealed glovebox chamber also
    lights up (a small E reaction-glow vessel behind the glass), and the cell is dressed
    out with GOLD premium trim — a gold seal RING framing the chamber + gold airlock door
    trim on the pod and the t2 crate. Reads as elite, still recognizably the same
    cleanroom, just maxed into a live automated reactor.

    Re-anchors the crown from the SAME source stage4 used for the tower foot
    (block.roof_pt(0.78,0.74) + TOWER_H), NOT a hardcoded 2nd guess, so the crown sits
    exactly on the tower top. Re-anchors the chamber dressing from the SAME glovebox rect
    the signature returned. Drawn AFTER glovebox_signature so it augments the hero in
    place (the existing arm/atom stay; the cell now runs a glowing reaction)."""
    # ── CROWNING NEW MASS: reactor crown on the t4 laminar-tower top ──────────────
    # recompute the tower top EXACTLY as stage4_laminar_tower did (same foot + height).
    fx, fy = P(block.roof_pt(0.78, 0.74))
    base_y = fy
    top_y = max(2, base_y - TOWER_H)                    # tower shell top (stage4)
    cowl_y = top_y - 1                                  # stage4 cowl crest row
    half = 2
    crown_base = cowl_y - 1                             # crown sits ON the cowl crest
    # ---- a flared filter-HEAD plinth wider than the tower, capping the cowl ----
    fl = half + 2                                       # crown half-width (5px -> flares out)
    for dx in range(-fl, fl + 1):
        cy = crown_base
        if 0 <= cy <= 63:
            c.set(fx + dx, cy, "b")                     # deep-steel crown shoulder
    c.set(fx - fl - 1, crown_base, "K"); c.set(fx + fl + 1, crown_base, "K")
    # ---- stacked E/e energized HEPA-glow banks climbing the crown (the live reactor) ----
    crown_top = max(1, crown_base - 5)                  # crown rises ~5px above the cowl
    for j, yy in enumerate(range(crown_base - 1, crown_top - 1, -1)):
        if yy < 0:
            break
        w = fl - (j // 2)                               # taper inward as it rises
        w = max(1, w)
        glow = "E" if j % 2 == 0 else "e"
        for dx in range(-w, w + 1):
            c.set(fx + dx, yy, glow)
        c.set(fx - w - 1, yy, "K"); c.set(fx + w + 1, yy, "K")   # frame the glow banks
    # ---- a bright domed CAP closing the crown + a rising vapor finial ----
    cap_y = crown_top - 1
    if cap_y >= 0:
        for dx in (-1, 0, 1):
            c.set(fx + dx, cap_y, "E")
        c.set(fx - 2, cap_y, "K"); c.set(fx + 2, cap_y, "K")
    if cap_y - 1 >= 0:
        c.set(fx, cap_y - 1, "W")                       # bright finial tip
    if cap_y - 2 >= 0:
        c.set(fx, cap_y - 2, "E")                       # vapor pip rising off the crown
    # ---- short E downflow plume off the crown front (the live reaction breathing out) ----
    for k in range(2):
        py = crown_base + 2 + k
        if py <= 56:
            c.set(fx - 1 - k, py, "e"); c.set(fx - 1 - k, py + 1, "E")

    # ── chamber dressing: a small glowing vessel behind the glass + dosing nozzle ──
    bx0, by0, bx1, by1 = glove
    cxm = (bx0 + bx1) // 2
    # a bright E reaction-glow VESSEL seated on the chamber floor shelf (RIGHT of the
    # existing molecule) — the chamber now visibly running hot to match the crown.
    vx = bx1 - 3
    vbot = by1 - 2
    vrows = [(-1, 1, "e"), (-2, 2, "E"), (-2, 2, "E"), (-1, 1, "G")]
    vtop = vbot - (len(vrows) - 1)
    for i, (dl, dr, ch) in enumerate(vrows):
        yy = vtop + i
        for dx in range(dl, dr + 1):
            c.set(vx + dx, yy, ch)
    c.set(vx, vtop - 1, "E")                            # bright vapor pip rising
    c.set(vx - 3, vtop + 1, "K"); c.set(vx + 3, vtop + 1, "K")  # vessel side rims
    c.set(vx, vtop - 2, "e")                            # short reaction shimmer
    # a stubby dosing nozzle dropping onto the vessel from the chamber ceiling
    gant_y = by0 + 2
    c.set(vx, gant_y, "K")
    c.set(vx - 1, gant_y + 1, "b"); c.set(vx, gant_y + 1, "L"); c.set(vx + 1, gant_y + 1, "b")
    c.line((vx, gant_y + 2), (vx, vtop - 3), "M")
    c.set(vx, vtop - 3, "E")                            # the dose droplet about to fall

    # ---- GOLD premium trim (t5 flourish only) ---------------------------------
    # a gold SEAL RING framing the chamber (the premium reactor-cell gasket): a clean
    # q rectangle just OUTSIDE the glovebox frame, with O glints at the corners.
    rx0, ry0, rx1, ry1 = bx0 - 1, by0 - 1, bx1 + 1, by1 + 1
    for x in range(rx0, rx1 + 1):
        c.set(x, ry0, "q"); c.set(x, ry1, "q")
    for y in range(ry0, ry1 + 1):
        c.set(rx0, y, "q"); c.set(rx1, y, "q")
    for cxn, cyn in [(rx0, ry0), (rx1, ry0), (rx0, ry1), (rx1, ry1)]:
        c.set(cxn, cyn, "O")                            # bright gold corner bosses

    # gold AIRLOCK door trim on the front-right pod (re-derive the pod from the block)
    fc = block.r_front
    pod = Box(top=(fc[0] + 4, fc[1] + 5), wx=4, wy=4, h=9)
    # a thin gold lintel over the pod's right-face door (its glass door is u 0.16..0.84)
    d0 = P(pod.right_pt(0.16, 1.4)); d1 = P(pod.right_pt(0.84, 1.4))
    c.line(d0, d1, "q")
    c.set(d0[0], d0[1], "O"); c.set(d1[0], d1[1], "O")
    # NOTE: r2 also stamped a single gold boss on the t2 roof crate cap at the
    # back-left roof tip. That landed at (11,21) — ~26px from the nearest gold trim
    # (viewport frame x37-48 / conduit y53-55) and attached to no continuous gold
    # feature, so it read as a marooned fleck (r3 mustFix). Removed: gold now stays
    # confined to the deliberate chamber seal ring + pod lintel + conduit run, and
    # the crate cap keeps its original bright `W` cap tone.


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the cleanroom-synthesizer at upgrade `stage` (1..5). Stage 1 is
    IDENTICAL to the shipped base; each higher stage keeps every prior addition and
    bolts on the next (t2 pass-through → t3 gowning-annex → t4 laminar-tower → t5
    reactor-cell + gold). Painter's order keeps rooftop/overhead additions on top of
    the masses they grow from, and the GLOVEBOX signature is drawn before the t5
    reactor-cell so t5 augments the hero in place rather than being buried by it."""
    c = Canvas()
    # painter's order (back -> front), BASE (stage 1, unchanged): block, plinth, HEPA
    # plenum (roof), eave glow, the lit-left curved curtain wall, the projecting
    # airlock pod, then the GLOWING right synthesis bay, then the glovebox signature.
    block = cleanroom_block(c)
    plinth(c, block)
    plen = hepa_plenum(c, block)
    eave_glow(c, block)

    # --- CUMULATIVE UPGRADE STAGES that sit BEHIND / beside / on the building -------
    # t4 laminar tower rises off the BACK-RIGHT roof; draw it BEFORE the lit-left
    # curtain/annex and the front bay so it occludes correctly (back mass) — but
    # after the plenum it grows from. t3 annex extends the lit-LEFT end forward.
    if stage >= 4:
        stage4_laminar_tower(c, block, plen)

    left_curtain_wall(c, block)
    if stage >= 3:
        stage3_gowning_annex(c, block)
    if stage >= 2:
        stage2_passthrough(c, block)

    airlock_vestibule(c, block)
    bay = right_synthesis_bay(c, block)
    glove = glovebox_signature(c, block, bay)

    # t5 lights the chamber up as a reactor cell — drawn AFTER the glovebox so it
    # augments the front-most hero in place (gold seal ring frames it last).
    if stage >= 5:
        stage5_reactor_cell(c, block, glove)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/chemworks"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "cleanroom-synthesizer"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped cleanroom-synthesizer.png, so it does NOT overwrite the
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
