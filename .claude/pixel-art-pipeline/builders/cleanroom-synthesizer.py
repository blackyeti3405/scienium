#!/usr/bin/env python3
"""
Cleanroom Synthesizer — ChemWorks PREMIUM capstone (BESPOKE iso form, NOT the
gateway cube).

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
"""
import os, sys, json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

CHEM = {"K": "#161a2e", "W": "#e6ecfb", "L": "#c2cdee", "M": "#9aa8d8", "D": "#6f7cb0", "d": "#4b5688",
        "h": "#d6ecff", "c": "#a8d4ff", "g": "#4aa0e6", "G": "#2166b0",
        "o": "#c89cf0", "O": "#e0c2ff", "r": "#6a34a8"}


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
    squashed by the foreshortened face coords."""
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


# ── 7. eave violet downflow shimmer (premium clean-glow at the eave) ──────────
def eave_glow(c, block):
    """A faint o/O violet downflow shimmer at the lit-left eave — the premium
    clean-glow signature reading across the whole building, not just the bay."""
    for k in range(6):
        u = 0.12 + 0.62 * k / 6
        p = block.left_pt(u, 1.4)
        c.set(int(round(p[0])), int(round(p[1])), "o" if k % 2 else "O")


def main():
    c = Canvas()
    # painter's order (back -> front): block, plinth, HEPA plenum (roof), eave glow,
    # the lit-left curved curtain wall, the projecting airlock pod, then the GLOWING
    # right synthesis bay, then the glovebox signature ON TOP.
    block = cleanroom_block(c)
    plinth(c, block)
    hepa_plenum(c, block)
    eave_glow(c, block)
    left_curtain_wall(c, block)
    airlock_vestibule(c, block)
    bay = right_synthesis_bay(c, block)
    glovebox_signature(c, block, bay)

    spec = {"width": 64, "height": 64, "palette": CHEM, "rows": c.rows()}
    out = "/path/to/scienium/art/src/buildings/chemworks_cleanroom-synthesizer.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    main()
