#!/usr/bin/env python3
"""
Sampling Station — TerraBase Lab economy building (BESPOKE form, STARTER role).

The most depot-like, expedition-camp member of the set: an OPEN-SIDED TIMBER-AND-
TARP FIELD DEPOT over a sample work-yard, NOT the gateway cube and NOT an enclosed
mass. A low packed-earth pad the viewer looks DOWN onto carries TWO low heavy-timber
back wings (kept short so the open court + signature read over them); four slender
corner poles lift a single slack canvas/tarp awning over the yard; the front-center
courtyard stays OPEN, ringed by o/K survey striping with a d strata seam scored
across the front edge. A stack of field sample crates sits at the back-left.

  * Opening side = OPEN. There is no glazed hero face — the OPENNESS is the read:
    the signature cataloguing table stands OUT in the open court under the tarp.

Signature (one-of-one): on the field-cataloguing bench under the tarp, a freshly
collected rock/soil clod HOVERS and slowly rotates inside a horizontal mineral-teal
SCANNER RING (g/G ring, c/h inner glow, faint c scan-ticks), fanning out a little
arc of holographic ID TAGS to the right — mineral name + grid-coordinates — one tag
lit brighter (O/h) as the confirmed match. No rotating-field-sample-in-a-scanner-
ring motif exists elsewhere in the catalog.

Composed from art/isobuild.{Box} + small pixel helpers — NO iso.draw_cube /
base_windows. Draw order: contact shadow -> earth work-yard slab (+ survey striping
+ strata seam) -> back wings -> corner poles + slack tarp awning + pennant -> sample
crate stack -> the bench + hovering rotating sample + teal scanner ring + fanned ID
tags signature in the OPEN court.
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, RX, RY, LX, LY

TERRA = {"K": "#20190f", "W": "#efe6cf", "L": "#d6c8a0", "M": "#b09a6e", "D": "#7e6c47", "d": "#54462c",
         "h": "#d6f2ea", "c": "#a4e2d4", "g": "#34b6a2", "G": "#1d8474",
         "o": "#e0a850", "O": "#ffce80", "r": "#9a5e1e"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def _stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings) at top-left (x0,y0).
    '.' = skip (transparent)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


def survey_stripe(c, p0, p1, n):
    """o/K survey-marker teeth (alternating ochre/black ticks) along a slab front
    edge from p0 to p1 — rings the open work-yard."""
    for k in range(n + 1):
        t = k / n
        x = p0[0] + t * (p1[0] - p0[0])
        y = p0[1] + t * (p1[1] - p0[1])
        c.set(int(round(x)), int(round(y)), "o" if k % 2 == 0 else "K")


# ── 1. CONTACT SHADOW — soft K pool under the whole depot (drawn FIRST) ────────
def contact_shadow(c):
    scx, scy = 32, 50
    for x in range(scx - 20, scx + 21):
        for y in range(scy - 3, scy + 4):
            ex = (x - scx) / 20.0
            ey = (y - scy) / 3.4
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")


# ── 2. PACKED-EARTH WORK-YARD SLAB — the open field floor (drawn early) ───────
def yard_slab(c):
    """A low packed-earth pad the viewer looks DOWN onto. Wings seat on its back
    edges; the front-center stays OPEN as the sample courtyard. L/M earth deck +
    o/K survey striping along the open front edges + a d strata seam scored across
    the front edge (layered-rock motif)."""
    slab = Box(top=(32, 26), wx=11, wy=11, h=3)
    # deck: OPEN-YARD floor lit a step WARMER (L) so the courtyard reads as an open
    # sunlit yard surface, not a dark box-top; brighter back-left W-tinged L.
    c.fill_poly([slab.r_top, slab.r_right, slab.r_front, slab.r_left], "L")
    c.fill_poly([slab.r_top, slab.r_left, slab.r_front], "L")
    c.line(slab.r_top, slab.r_left, "W")            # bright back-left deck rim
    # scattered M earth mottling so it reads as ground, not a flat panel (kept
    # light — just one step down from L — so the yard stays open/bright)
    for (u, v) in [(0.30, 0.42), (0.62, 0.28), (0.46, 0.70), (0.74, 0.55),
                   (0.24, 0.60), (0.55, 0.50), (0.38, 0.34)]:
        p = slab.roof_pt(u, v)
        c.set(int(round(p[0])), int(round(p[1])), "M")
    # the 3px earth-pad edge on the two FRONT faces (lit left M, shaded right D)
    c.fill_poly([slab.r_left, slab.r_front, slab.w_front, slab.w_left], "M")
    c.fill_poly([slab.r_front, slab.r_right, slab.w_right, slab.w_front], "D")
    # outline
    for a, b in [(slab.r_top, slab.r_right), (slab.r_right, slab.r_front),
                 (slab.r_front, slab.r_left), (slab.r_left, slab.r_top),
                 (slab.r_left, slab.w_left), (slab.r_front, slab.w_front),
                 (slab.r_right, slab.w_right),
                 (slab.w_left, slab.w_front), (slab.w_front, slab.w_right)]:
        c.line(a, b, "K")
    # CARVE OPEN-DEPOT DAYLIGHT GAPS: notch 2px of negative space (transparent
    # background) into the front-LEFT and front-RIGHT base corners under the open
    # pole bays so daylight reads THROUGH beneath the tarp — breaks the enclosed-
    # plinth silhouette into an open depot. Re-outline the carved corner edges in K.
    def _notch(corner_pt, wall_bot, inset):
        cxn, cyn = int(round(corner_pt[0])), int(round(corner_pt[1]))
        wxn, wyn = int(round(wall_bot[0])), int(round(wall_bot[1]))
        for yy in range(cyn + 1, wyn + 1):
            for dx in range(-inset, inset + 1):
                c.set(cxn + dx, yy, ".")
    # left base corner (under the left pole bay) and right base corner notches
    _notch(slab.r_left, slab.w_left, 1)
    _notch(slab.r_right, slab.w_right, 1)
    # restore a crisp K post-edge at each carved corner so the pad still outlines
    c.line(slab.r_left, slab.w_left, "K")
    c.line(slab.r_right, slab.w_right, "K")
    # d STRATA SEAM scored across the front of the deck (layered-rock motif)
    c.line(slab.roof_pt(0.10, 0.16), slab.roof_pt(0.90, 0.16), "d")
    # SURVEY-MARKER striping along the two open FRONT deck edges (rings the court)
    survey_stripe(c, slab.r_left, slab.r_front, 11)
    survey_stripe(c, slab.r_front, slab.r_right, 11)
    return slab


# ── 3. BACK WINGS — two LOW heavy-timber sheds on the back slab edges ─────────
def back_wing(c, top, wx, wy, h):
    """A low heavy-timber depot wing seated on a back slab edge. D/d weathered
    timber, kept LOW so the open court + signature read over it. A d board ridge,
    plank grain on the lit face, K plank skirt at the base."""
    wing = Box(top=top, wx=wx, wy=wy, h=h)
    wing.draw(c, roof="D", lwall="D", rwall="d", roof_hi="W", outline="K")
    # re-lay the roof as warm timber boards: bright lit back-left, d plank seams
    c.fill_poly([wing.r_top, wing.r_right, wing.r_front, wing.r_left], "D")
    c.fill_poly([wing.r_top, wing.r_left, wing.r_front], "M")
    for v in (0.30, 0.55, 0.80):
        c.line(wing.roof_pt(0.06, v), wing.roof_pt(0.94, v), "d")
    c.line(wing.r_top, wing.r_left, "W")
    c.line(wing.r_top, wing.r_right, "L")
    for a, b in [(wing.r_top, wing.r_right), (wing.r_right, wing.r_front),
                 (wing.r_front, wing.r_left), (wing.r_left, wing.r_top)]:
        c.line(a, b, "K")
    # plank grain down the lit (left) face + warm r corner posts
    for u in (0.22, 0.42, 0.62, 0.82):
        c.line(wing.left_pt(u, 1.4), wing.left_pt(u, h - 0.4), "d")
    c.line(wing.left_pt(0.04, 0.4), wing.left_pt(0.04, h - 0.2), "r")
    c.line(wing.left_pt(0.96, 0.4), wing.left_pt(0.96, h - 0.2), "r")
    # K plank skirt board at the base of the lit face
    c.line(wing.left_pt(0.06, h - 0.3), wing.left_pt(0.94, h - 0.3), "K")
    return wing


def back_wings(c, slab):
    """Two low wings tucked along the BACK slab edges, off the shared back corner so
    a clear OPEN notch opens to the court. Both LOW (h≈7) so the tarp + signature
    rise clearly above them."""
    # back-LEFT wing: runs toward the left (long wy), slim wx
    lw = back_wing(c, top=(slab.r_top[0] - 4, slab.r_top[1] - 7), wx=3, wy=6, h=7)
    # back-RIGHT wing: runs toward the right (long wx), slim wy
    rw = back_wing(c, top=(slab.r_top[0] + 4, slab.r_top[1] - 7), wx=6, wy=3, h=7)
    return lw, rw


# ── 4. CORNER POLES + SLACK TARP AWNING — the literal canvas/tarp roof ────────
def tarp_awning(c, slab):
    """Four slender D/d corner poles lift a single shallow slack canvas/tarp awning
    over the yard. The tarp is only ~2px thick cloth (L/M with d seam lines and a
    D sag dip at the front corner), NOT a building mass. A small o weather-pennant
    on a K pole stands at the back corner. Drawn so the poles read in front of the
    wings but the open court stays clear between them."""
    # tarp panel: a thin Box used as a slack cloth awning, perched HIGH on poles
    # above the yard. Slightly smaller than the pad so the court edges + signature
    # read in the open gap beneath it, and only a 1px cloth lip (not a big curtain).
    tarp = Box(top=(32, 8), wx=10, wy=9, h=1)

    # --- four corner POLES dropping straight down from the tarp corners to the
    # pad. Feet land just inside the slab corners so the open court reads. ---
    # (anchor, foot_y, against_dark) — against_dark poles get a K right-outline so
    # they stay legible where they cross a dark wing/crate mass.
    poles = [
        (tarp.r_top,   slab.r_top[1] + 2,   False),  # back corner pole
        (tarp.r_right, slab.r_right[1] + 2, False),  # right corner pole
        (tarp.r_left,  slab.r_left[1] + 2,  True),   # left corner pole (vs left wing)
        (tarp.r_front, slab.r_front[1],     False),  # front corner pole (stops at deck)
    ]
    for (tx, ty), foot_y, against_dark in poles:
        px = int(round(tx))
        ty = int(round(ty))
        foot_y = int(round(foot_y))
        # every post gets the SAME weight so all four read as open-bay poles:
        # a full D vertical run, a lit M left edge, a d shaded right edge, and a
        # K lashing ring at the roof anchor + one lower lashing ring.
        c.line((px - 1, ty + 1), (px - 1, foot_y - 1), "M")     # lit left edge
        c.line((px, ty), (px, foot_y), "D")                     # post core
        c.line((px + 1, ty + 1), (px + 1, foot_y - 1), "d")     # shaded right edge
        if against_dark:
            # K outline ONLY where the post sits against the dark left wing — gives
            # the left pole the same crisp weight the right posts get vs open sky.
            c.line((px - 2, ty + 2), (px - 2, foot_y - 1), "K")
        c.set(px, ty + 1, "K")                          # K lashing ring at roof anchor
        c.set(px, (ty + foot_y) // 2 + 2, "K")          # lower lashing ring

    # --- the slack TARP awning panel (thin cloth) ---
    # cloth top: lit back-left L, front M, with a gentle D sag dip front-of-centre
    c.fill_poly([tarp.r_top, tarp.r_right, tarp.r_front, tarp.r_left], "M")
    c.fill_poly([tarp.r_top, tarp.r_left, tarp.r_front], "L")
    # slack SAG: pull the front-corner cloth down 1px so it droops a touch
    sag = (tarp.r_front[0], tarp.r_front[1] + 1)
    c.line(tarp.r_left, sag, "D")
    c.line(tarp.r_right, sag, "d")
    c.set(int(round(sag[0])), int(round(sag[1])), "D")       # deepest sag pixel
    # d cloth SEAM lines running across the tarp (canvas panels)
    for v in (0.28, 0.52, 0.76):
        c.line(tarp.roof_pt(0.06, v), tarp.roof_pt(0.94, v), "d")
    # a thin 1px cloth EDGE hanging on the two front sides (a slack awning lip,
    # NOT a curtain — kept minimal so the open court breathes beneath it). Only the
    # TOP ~1px row of the would-be wall is cloth; everything below stays OPEN sky so
    # the four poles read as an open-bay depot, not a walled mass.
    def _cloth_lip(p_top_l, p_top_r, shade):
        ax, ay = int(round(p_top_l[0])), int(round(p_top_l[1]))
        bx2, by2 = int(round(p_top_r[0])), int(round(p_top_r[1]))
        n = max(abs(bx2 - ax), abs(by2 - ay), 1)
        for k in range(n + 1):
            t = k / n
            x = round(ax + t * (bx2 - ax))
            y = round(ay + t * (by2 - ay))
            c.set(x, y, shade)        # cloth lip row
            c.set(x, y + 1, "K")      # K hem under the lip — then OPEN below
    _cloth_lip(tarp.r_left, sag, "D")
    _cloth_lip(sag, tarp.r_right, "d")
    # bright back ridge + K outline of the cloth silhouette. Only the TOP cloth
    # plane + its front sag edge are outlined — NO long vertical hem lines down to
    # w_left/w_front/w_right (those made a curtain). The bays below stay OPEN.
    c.line(tarp.r_top, tarp.r_left, "W")
    c.line(tarp.r_top, tarp.r_right, "L")
    for a, b in [(tarp.r_top, tarp.r_right), (tarp.r_right, sag),
                 (sag, tarp.r_left), (tarp.r_left, tarp.r_top)]:
        c.line(a, b, "K")
    # a tiny o scalloped tassel tick along the front cloth lip (field-camp cloth)
    for u in (0.25, 0.50, 0.75):
        p = tarp.left_pt(u, 1.2) if u <= 0.5 else tarp.right_pt((u - 0.5) * 2, 1.2)
        c.set(int(round(p[0])), int(round(p[1])), "o")

    # --- weather PENNANT on a K pole at the BACK corner ---
    bx = int(round(tarp.r_top[0]))
    by = int(round(tarp.r_top[1]))
    c.line((bx, by), (bx, by - 6), "K")          # pennant pole rising off back corner
    _stamp(c, bx + 1, by - 6, [
        "oO.",
        "ooO",
        "oo.",
    ])
    c.set(bx, by - 6, "o")
    return tarp


# ── 5. SAMPLE CRATES — a stack of field crates at the back-left ───────────────
def sample_crates(c, slab):
    """A stack of small field sample crates near the back-left of the yard, lifted
    a step OUT of the dark left wing so it reads as a CRATE STACK, not part of the
    wing: lighter M/D boards (vs the d/K wing), o corner brackets ringing the top-
    front edges, a K rope-handle loop on the front face, and a 1px K separation gap
    tucked behind the stack so it silhouettes off the wing. The top crate is OPEN,
    showing r/M rock chunks inside (layered-rock + sample-crate motifs)."""
    # base crate — seated forward-left of the wing, lifted to M/D boards and pulled
    # a touch DOWN/FORWARD out of the deep wing shadow so it reads as its own mass.
    base = Box(top=(slab.r_top[0] - 9, slab.r_top[1] + 7), wx=4, wy=4, h=5)
    # K SEPARATION MOAT: a continuous 1px dark seam wrapping the crate's back-top
    # AND up-left/up-right behind it so the lighter stack silhouettes hard off the
    # dark wing mass behind it (drawn before the crate body so the body sits over).
    for a, b in [((base.r_top[0], base.r_top[1] - 1), (base.r_left[0] - 1, base.r_left[1] - 1)),
                 ((base.r_top[0], base.r_top[1] - 1), (base.r_right[0] + 1, base.r_right[1] - 1)),
                 ((base.r_left[0] - 1, base.r_left[1] - 1), (base.r_left[0] - 1, base.r_left[1] + 2)),
                 ((base.r_right[0] + 1, base.r_right[1] - 1), (base.r_right[0] + 1, base.r_right[1] + 2))]:
        c.line(a, b, "K")
    # body: lit face M (one step up from the wing's d), shaded face D, top L.
    # Lit face re-laid one full step BRIGHTER than the wing so it pops in shadow.
    base.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    c.fill_poly([base.r_left, base.r_front, base.w_front, base.w_left], "M")  # bright lit face
    c.fill_poly([base.r_top, base.r_right, base.r_front, base.r_left], "L")   # bright crate lid
    # POLISH (review r1, note 1): lift the crate's TOP-FRONT board face one more step
    # to L (vs the D/d it would otherwise share with the wing behind) so the "stack of
    # field crates" reads INSTANTLY off the dark wing rather than on a second look.
    # A bright L highlight board hugs the top edge of the lit front face.
    c.line(base.left_pt(0.06, 0.55), base.left_pt(0.94, 0.55), "L")           # top-front board hi-light
    c.line(base.right_pt(0.06, 0.55), base.right_pt(0.94, 0.55), "M")         # shaded face top board lifted d→M
    # re-outline the crate body in K after the brightening fills
    for a, b in [(base.r_top, base.r_right), (base.r_right, base.r_front),
                 (base.r_front, base.r_left), (base.r_left, base.r_top),
                 (base.r_left, base.w_left), (base.r_front, base.w_front),
                 (base.r_right, base.w_right),
                 (base.w_left, base.w_front), (base.w_front, base.w_right)]:
        c.line(a, b, "K")
    # o CORNER BRACKETS ringing the top-front edges (the crate's iron corners)
    for u in (0.06, 0.94):
        p = base.left_pt(u, 0.6)
        c.set(int(round(p[0])), int(round(p[1])), "o")
    c.set(int(round(base.r_front[0])), int(round(base.r_front[1])), "o")
    p = base.right_pt(0.92, 0.6)
    c.set(int(round(p[0])), int(round(p[1])), "o")
    # K ROPE-HANDLE LOOP on the lit front face (a small arc reads as a rope handle)
    _stamp(c, int(round(base.left_pt(0.34, 2.0)[0])), int(round(base.left_pt(0.34, 2.0)[1])), [
        "K.K",
        ".K.",
    ])
    # a board seam down the lit face (plank join)
    c.line(base.left_pt(0.52, 1.0), base.left_pt(0.52, 4.4), "d")

    # smaller OPEN crate stacked on top, showing rock chunks inside
    topc = Box(top=(slab.r_top[0] - 8, slab.r_top[1] + 2), wx=3, wy=3, h=4)
    topc.draw(c, roof="d", lwall="M", rwall="D", roof_hi="L", outline="K")
    # OPEN top: hollow the roof to dark, then r/M rock chunks inside
    c.fill_poly([topc.roof_pt(0.18, 0.18), topc.roof_pt(0.82, 0.18),
                 topc.roof_pt(0.82, 0.82), topc.roof_pt(0.18, 0.82)], "K")
    chunks = [(0.40, 0.42, "r"), (0.60, 0.50, "M"), (0.45, 0.65, "r"),
              (0.62, 0.32, "D"), (0.32, 0.55, "o")]
    for u, v, ch in chunks:
        p = topc.roof_pt(u, v)
        c.set(int(round(p[0])), int(round(p[1])), ch)
    # POLISH (review r1, note 3): a 1–2px r/M rock chunk PEEKING up over the open
    # crate's front rim (blueprint's "rock chunks inside" — was only faintly present).
    # Sits proud of the lid so a close look reads loose sample stones, not a flat lid.
    pk = topc.roof_pt(0.50, 0.80)
    pkx, pky = int(round(pk[0])), int(round(pk[1]))
    c.set(pkx, pky - 1, "r")          # chunk body cresting the front rim
    c.set(pkx + 1, pky - 1, "M")      # lit facet of the proud chunk
    c.set(pkx - 1, pky, "r")          # a second smaller stone beside it
    # o corner brackets on the open crate's lit-face top edge
    c.set(int(round(topc.left_pt(0.08, 0.6)[0])), int(round(topc.left_pt(0.08, 0.6)[1])), "o")
    c.set(int(round(topc.r_front[0])), int(round(topc.r_front[1])), "o")


# ── 6. SIGNATURE — field-cataloguing bench + hovering rotating sample + scanner
#       ring fanning ID tags, standing OUT in the OPEN court (the hero) ─────────
def cataloguing_signature(c, slab):
    """The hero, front-center in the OPEN work-yard under the tarp:
      * a low D/M field BENCH with a K instrument lip;
      * a horizontal mineral-teal SCANNER RING hovering over the bench (g/G ring,
        c/h inner-rim glow, faint c scan-ticks);
      * a small irregular r/M/D rock/soil CLOD floating in the ring centre, slowly
        rotating (W glint upper-left, a tiny offset c ghost edge = the rotation);
      * a fanned arc of 2–3 W/L holographic ID TAGS to the right (mineral name +
        grid-coords: a K text tick + a tiny o coord dot each), one lit O/h as the
        confirmed match;
      * a soft c underglow on the bench from the ring."""
    # bench top-centre in the open front court, clear of the wings (a touch toward
    # the front so the ring hovers in the clear open band below the tarp lip)
    bp = slab.roof_pt(0.54, 0.42)
    bx, by = int(round(bp[0])), int(round(bp[1]))

    # --- the field BENCH (low D/M plank table with a K instrument lip) ---
    bench = Box(top=(bx - 2, by - 7), wx=4, wy=3, h=4)
    bench.draw(c, roof="M", lwall="D", rwall="d", roof_hi="L", outline="K")
    c.line(bench.r_left, bench.r_front, "K")          # K instrument lip front edge
    c.line(bench.r_front, bench.r_right, "K")
    # a couple of d plank seams on the bench top
    c.line(bench.roof_pt(0.5, 0.1), bench.roof_pt(0.5, 0.9), "d")
    # bench leg shadows hinting it stands free in the court
    c.set(int(round(bench.w_front[0])), int(round(bench.w_front[1])), "K")

    # ring centre hovers above the bench top centre, in the clear open band
    rcx = int(round(bench.roof_pt(0.5, 0.5)[0]))
    rcy = int(round(bench.roof_pt(0.5, 0.5)[1])) - 6   # hover gap above the bench

    # --- soft c UNDERGLOW pooled on the bench from the ring above ---
    for (dx, dy, ch) in [(0, 5, "c"), (-2, 5, "g"), (2, 5, "g"),
                         (-1, 6, "G"), (1, 6, "G"), (0, 6, "c")]:
        c.set(rcx + dx, rcy + dy, ch)

    # --- horizontal SCANNER RING (a flat iso ellipse: rx≈6, ry≈3) ---
    rx, ry = 6, 3
    # ring band: G outer rim, g body, c/h inner-rim glow
    for a in range(0, 360, 4):
        ax = rcx + rx * math.cos(math.radians(a))
        ay = rcy + ry * math.sin(math.radians(a))
        c.set(ax, ay, "G")
        # inner rim glow one step toward centre
        ix = rcx + (rx - 1.4) * math.cos(math.radians(a))
        iy = rcy + (ry - 0.8) * math.sin(math.radians(a))
        c.set(ix, iy, "g")
    # bright c/h front + back arc highlights on the ring
    for a in range(150, 211, 6):                     # lit upper-left arc
        ax = rcx + rx * math.cos(math.radians(a))
        ay = rcy + ry * math.sin(math.radians(a))
        c.set(ax, ay, "h")
    for a in range(20, 61, 8):                        # a cool c glint front-right
        ax = rcx + rx * math.cos(math.radians(a))
        ay = rcy + ry * math.sin(math.radians(a))
        c.set(ax, ay, "c")
    # faint c SCAN-TICKS rotating around the ring (spin hint)
    for a in (35, 110, 250, 320):
        ax = rcx + (rx + 1) * math.cos(math.radians(a))
        ay = rcy + (ry + 0.6) * math.sin(math.radians(a))
        c.set(ax, ay, "c")

    # --- the floating ROCK/SOIL CLOD rotating in the ring centre ---
    _stamp(c, rcx - 2, rcy - 2, [
        ".rM.",
        "rMDr",
        "DrrD",
        ".Dd.",
    ])
    c.set(rcx - 1, rcy - 2, "W")          # W glint on the upper-left facet
    c.set(rcx - 2, rcy - 1, "c")          # tiny offset c ghost edge = rotation hint
    c.set(rcx + 2, rcy + 1, "c")          # trailing ghost edge other side

    # --- fanned arc of DISCRETE holographic ID TAGS to the RIGHT of the ring ---
    # 3 distinct holo label CARDS arcing UP-AND-OUT to the right, each a SEPARATE
    # card: a K-bordered card (4px body wide × 2 body rows) with a 1px K 'text'
    # tick line inside (the mineral name) + a single o/O coordinate dot at a top
    # corner. Cards are stepped diagonally AND held apart by ≥1px of empty/K so
    # they read as a fan of tags, NOT one flat bar (the round-0 blocker).
    #
    # Each card stamp is 6 wide (K border) × 4 tall. To keep them DISCRETE we
    # step lower→upper by +2 right / -4 up: a 4px vertical pitch fully clears the
    # 4-tall stamp, so a 1px transparent gap sits between adjacent cards.
    # POLISH (review r1, note 2): widen the diagonal step between the middle and
    # upper cards by +1px right so the fan arc opens a touch more — the lower→middle
    # cards sat slightly tight. Lower/middle keep their pitch; the confirmed card
    # steps one extra column out so all three read as a clean fanned arc.
    tags = [
        (rcx + 4, rcy + 4, "L", "o", False),   # 0: lower card (nearest ring rim)
        (rcx + 6, rcy + 0, "L", "o", False),   # 1: middle card
        (rcx + 9, rcy - 4, "W", "O", True),    # 2: upper card = CONFIRMED MATCH
    ]
    for (tx, ty, card, dot, bright) in tags:
        body = "W" if bright else card
        # clear a 1px transparent moat around the card first so neighbouring cards
        # never fuse — guarantees the fan reads as separate label cards.
        for gy in range(-1, 5):
            for gx in range(-1, 7):
                if 0 <= ty + gy < 64 and 0 <= tx + gx < 64:
                    c.set(tx + gx, ty + gy, ".")
        # holo card: K border ring, a W/L body, a 1px K 'text' tick row inside.
        #   row0:  K K K K K K
        #   row1:  K b b b b K   (body)
        #   row2:  K b b b b K   (body / text tick)
        #   row3:  K K K K K K
        _stamp(c, tx, ty, [
            "KKKKKK",
            f"K{body}{body}{body}{body}K",
            f"K{body}{body}{body}{body}K",
            "KKKKKK",
        ])
        # a short K 'text' tick inside the lower body row (the mineral name) — kept
        # to 2px so the card stays a BRIGHT lit label, not a dark block.
        c.set(tx + 1, ty + 2, "K")
        c.set(tx + 2, ty + 2, "K")
        # an o/O coord dot riding the card's upper-right body corner (grid-coords)
        c.set(tx + 4, ty + 1, dot)
        # a second faint text tick on the top body row of the dim cards so each
        # card carries two readable 'text lines' without going dark
        if not bright:
            c.set(tx + 1, ty + 1, "K")
        if bright:
            # confirmed match: brighter body glint + a thin h glow lip above it
            c.set(tx + 2, ty + 1, "h")
            c.set(tx + 3, ty + 1, "O")
            for gx in range(tx + 1, tx + 5):
                if 0 <= ty - 1 < 64:
                    c.set(gx, ty - 1, "h")
    # short stepped c/h LEADER stub fanning from the ring's right rim up to the
    # confirmed (upper) card — a thin spark trail, NOT a long smear that would
    # mush the cards back into a bar.
    lx = rcx + rx - 1
    c.set(lx + 1, rcy + 3, "c")
    c.set(lx + 2, rcy + 2, "h")
    c.set(lx + 3, rcy + 1, "c")


def build():
    c = Canvas()
    # painter's order: contact shadow -> earth work-yard slab -> back wings ->
    # corner poles + slack tarp awning + pennant -> sample crate stack -> the
    # cataloguing bench + hovering rotating sample + teal scanner ring + fanned
    # ID-tags signature standing in the OPEN front court.
    contact_shadow(c)
    slab = yard_slab(c)
    back_wings(c, slab)
    tarp_awning(c, slab)
    sample_crates(c, slab)
    cataloguing_signature(c, slab)

    spec = {"width": 64, "height": 64, "palette": TERRA, "rows": c.rows()}
    out = "/path/to/scienium/art/src/buildings/terrabase_sampling-station.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
