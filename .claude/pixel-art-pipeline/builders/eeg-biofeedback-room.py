#!/usr/bin/env python3
"""
EEG/Biofeedback Room — MindFrame Lab economy building (BESPOKE form, STANDARD role).

A quiet CLINICAL RECORDING POD with a lower MONITOR ANNEX — a small, clean medical
silhouette, distinct from the gateway cube AND from the MindFrame siblings. The read:
a compact GROUNDED recording booth where a CAPPED subject sits, abutted by a clearly
LOWER, smaller MONITOR ANNEX stepped off the back-left so TWO distinct masses read.

ROUND-2 REBUILD (rounds 0 + 1 both failed on the same two issues):

  1. FORM kept reading as a single canted FLOATING box (a TV-on-a-stem). FIX: the pod
     is now a WIDE + SHORT grounded Box (wx≈8, wy≈8, h≈14 — NOT tall+narrow) whose
     FRONT-BOTTOM corner sits directly ON a tight contact shadow. A clearly LOWER,
     SMALLER annex Box (h≈8) is ABUTTED to the back-left so two distinct masses read.

  2. SIGNATURE kept shearing into a noisy color field because the brainwave bands were
     drawn in the face's SHEARED (u,v) space. FIX: STOP drawing bands in face coords.
     The readout is now an UPRIGHT SCREEN-SPACE MONITOR PANEL — a plain AXIS-ALIGNED
     rectangle in screen (x,y) coords (like a wall-mounted monitor) sitting over the
     glowing RIGHT face. Upright screen-space art does NOT shear, so horizontal bands
     stay horizontal. Top->bottom on the panel: a capped-HEAD icon (head + cap arc +
     electrode dots) top-left, then 3–4 CLEARLY HORIZONTAL full-width wavy brainwave
     BANDS each a DISTINCT color (theta g / alpha c / beta o / gamma h) with a 1px dark
     gap between, then a magenta BIOFEEDBACK RING + a K-framed decoder tag. Dark d/K
     panel background so the colored bands pop; clean K frame; the panel GLOWS.

Composed from art/isobuild.{Box} — NO iso.draw_cube / base_windows.

═══════════════════════════════════════════════════════════════════════════════════
UPGRADE-EVOLUTION pass (this file follows the MindFrame code pattern set by the
reference interview-room.py / workshop.py: build(stage) + cumulative stageN helpers +
emit/build_all). The base form (stage 1) is byte-identical to the shipped PNG.

MindFrame evolution language — theme: a calm INDIGO EEG/biofeedback booth grows into a
fully built-out, MULTI-CHANNEL neuro-recording instrument — more electrodes, more
signal, more subjects, a live full-montage brain-map. The lab's own magenta `o/O`
stays the HUMAN / pulse accent; the evolved glow is cool SIGNAL-CYAN `e/E` (data/EEG
channels) so the two never blur. Colours mature stage by stage; gold (`q`) is a t5
flourish only, never a whole-building recolor.

  t2  small functional add : an ELECTRODE-CAP STAND prop beside the rack (with one
                             extra cyan trace band on its mini-readout) + a brighter
                             o/O PULSE BLIP on the roof lead-junction node.
  t3  structural add       : a shielded BIOFEEDBACK BOOTH ANNEX — a slim dark `b`
                             Faraday box on the far left with a glowing `g` porthole
                             where a wired subject sits (a dedicated session booth).
  t4  major add            : a MULTI-CHANNEL AMPLIFIER TOWER raising the roofline with
                             stacked glowing cyan `e` channel-meters (more channels).
  t5  crowning feature     : the rack becomes a live FULL-MONTAGE BRAIN-MAP — a glowing
                             bright-cyan `E` topographic head-map + synced bands + a
                             coherence node crowning the amp tower, `q` gold master-amp
                             trim + a gold PULSE FINIAL on the roof node.
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box

# Base MindFrame palette (shared keys) + the EVOLVED accent shades reserved for the
# upgrade stages only (they appear in NO stage-1 sprite, so the base PNG is unchanged).
# These exact evolved keys+hexes are reused by all 10 mindframe buildings for lab
# consistency (see mindframe-evolution-plan.md):
#   b  deep indigo steel — matured structure tone for t3+ new masses
#   e  energized signal-cyan glow (mid)   E  signal-cyan glow (bright) — the t4/t5 data
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
MIND = {"K": "#181428", "W": "#e8e2f6", "L": "#cabfe6", "M": "#9f90c8", "D": "#6f5fa0", "d": "#4a3c70",
        "h": "#ecc8f4", "c": "#d0a8ee", "g": "#a45ce0", "G": "#6a2fb0",
        "o": "#f08cce", "O": "#ffb8e2", "r": "#b03a80",
        "b": "#2b2440", "e": "#7fd4ff", "E": "#d6f4ff", "q": "#f3c63a"}


def _stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings) at top-left (x0,y0).
    '.' = skip (transparent)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


# ── geometry ──────────────────────────────────────────────────────────────────
# Recording POD: WIDE + SHORT so it sits as a grounded clinical booth, NOT a tall
# floating box on a stem. Its front-bottom corner lands on the contact shadow. The
# shaded RIGHT face (screen-x ~30..46, y ~22..44) is the hero — the upright monitor
# panel is laid over it in SCREEN space.
#   r_top=(30,14) r_right=(46,22) r_left=(14,22) r_front=(30,30)
#   w_front=(30,44) w_left=(14,36) w_right=(46,36)
POD = Box(top=(30, 11), wx=8, wy=8, h=21)
# Monitor ANNEX: clearly LOWER (h=8) + SMALLER, abutted to the BACK-LEFT so its roof +
# a sliver of face peek above/beside the pod (two distinct masses, distinct heights).
#   r_top=(16,12) r_right=(28,18) r_left=(6,17) r_front=(18,23)  bottoms +8
ANNEX = Box(top=(16, 12), wx=6, wy=5, h=8)


# ── 1. contact shadow — tight ellipse hugging the pod's feet (drawn FIRST) ─────
def base_shadow(c):
    """A tight iso DIAMOND shadow that mirrors the pod's footprint, so the building
    sits squarely ON it (the front-bottom corner lands on the shadow) — no detached
    pool below-left that reads as a TV-stand stem. The pod's wall bottoms are
    w_left=(14,36) w_front=(30,44) w_right=(46,36); the shadow is that diamond pushed
    down ~1px and fattened by 1px so a thin contact band shows under every bottom edge."""
    foot = [(14, 40), (30, 48), (46, 40), (30, 32)]   # left, front, right, back
    # offset the diamond down ~1 and slightly outward so a thin contact band shows under
    # every bottom edge (the building reads as SITTING on the shadow, not floating).
    cx, cy = 30, 40
    pts = []
    for (x, y) in foot:
        dx, dy = x - cx, y - cy
        pts.append((cx + dx * 1.05, cy + dy * 1.05 + 1))
    c.fill_poly(pts, "K")


# ── 2. MONITOR ANNEX — lower stepped block at the back-left (drawn behind pod) ─
def monitor_annex(c, b):
    """The lower technician/decoder annex stepped off the back-left, clearly SHORTER
    than the pod. Its LIT-LEFT face carries a glazed g/c monitor pane (technician
    screens) above a Box.louver cooling-vent band (opaque). Drawn BEFORE the pod so
    the pod occludes its front-right corner (the annex tucks behind + beside the pod)."""
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # thin d parapet along the annex roof front edges
    c.line(b.r_left, b.r_front, "d")
    c.line(b.r_front, b.r_right, "d")

    # glazed MONITOR pane on the LIT-LEFT face (technician screens, g/c glass)
    b.window(c, "left", 0.18, 0.82, 1.2, 4.4, glass="g", hi="c", shade="G",
             frame="K", mullions=0, sheen="W")
    # a couple of scan-rows inside the monitor glass so it reads as live screens
    c.line(b.left_pt(0.26, 2.4), b.left_pt(0.74, 2.4), "c")
    c.line(b.left_pt(0.26, 3.2), b.left_pt(0.74, 3.2), "h")
    # a louver COOLING-VENT band low on the lit-left face (opaque, for the gear)
    b.louver(c, "left", 0.20, 0.80, 5.0, 7.4, body="D", slat="K", edge="M", frame="K")
    return b


# ── 3. RECORDING POD — the compact GROUNDED clinical booth at the front ────────
def recording_pod(c, b):
    """The compact recording booth. M/D indigo walls, a soft L shielded trim band, a
    thin o magenta accent ring trimming the pod eave (the calm clinical halo) + a
    small c lead-junction cluster on the roof. A real Box.window glass pane sits on the
    LIT-LEFT pod face (the clinical observation glass). The hero monitor panel goes on
    the SHADED-RIGHT face (drawn in signature())."""
    b.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")

    # soft L shielded TRIM band wrapping the pod just under the eaves (rounded read)
    c.line(b.left_pt(0.06, 1.2), b.left_pt(0.94, 1.2), "L")
    c.line(b.right_pt(0.06, 1.2), b.right_pt(0.94, 1.2), "L")
    c.line(b.left_pt(0.06, 2.0), b.left_pt(0.94, 2.0), "D")

    # thin parapet + a soft o magenta ACCENT halo strip on the pod eave (calm halo)
    c.line(b.r_left, b.r_top, "W")
    c.line(b.r_left, b.r_front, "o")        # lit-left eave halo
    c.line(b.r_front, b.r_right, "o")       # right eave halo
    c.set(int(round(b.r_front[0])), int(round(b.r_front[1])), "O")  # bright corner node

    # a REAL glass pane (clinical observation glass) on the LIT-LEFT pod face
    b.window(c, "left", 0.30, 0.74, 3.4, 11.0, glass="c", hi="h", shade="G",
             frame="K", mullions=0, sheen="W")
    # a louver service-vent band low on the lit-left face under the glass
    b.louver(c, "left", 0.30, 0.74, 12.4, 18.0, body="D", slat="K", edge="M", frame="K")

    # small c LEAD-JUNCTION cluster on the pod roof (where EEG leads gather, back-center)
    jp = b.roof_pt(0.5, 0.55)
    jx, jy = int(round(jp[0])), int(round(jp[1]))
    _stamp(c, jx - 1, jy - 3, [
        ".o.",
        "KcK",
        "KGK",
        ".K.",
    ])
    return b


# ── 4. SIGNATURE — UPRIGHT SCREEN-SPACE MONITOR PANEL over the glowing RIGHT face ─
def signature(c, b):
    """The hero. An UPRIGHT (axis-aligned, screen-space) wall-mounted MONITOR PANEL laid
    over the pod's glowing SHADED-RIGHT face. Because it is drawn in screen (x,y) coords
    — NOT in the face's sheared (u,v) — horizontal bands stay HORIZONTAL and never shear
    into the noise field that killed rounds 0 + 1.

    Panel contents, top -> bottom:
      • a capped-HEAD icon (head + EEG cap arc + 2–3 electrode dots) top-left;
      • 3–4 CLEARLY HORIZONTAL full-width wavy brainwave BANDS, each a DISTINCT color
        (theta g / alpha c / beta o / gamma h), stacked with a 1px dark gap between —
        these multicolored horizontal waves are the hero and read as MULTI-band;
      • a magenta BIOFEEDBACK RING + a tiny K-framed decoder tag at the bottom.
    Dark d/K panel background so the colored bands pop; a clean K frame; it GLOWS."""

    # CLIP everything to the pod's RIGHT-face parallelogram so the upright monitor sits
    # ON the wall and never overhangs the building silhouette (the round-1 floating-panel
    # break). The face poly: r_front -> r_right (top) -> w_right -> w_front (bottom).
    face = [b.r_front, b.r_right, b.w_right, b.w_front]

    def in_face(x, y):
        n, ins, j = len(face), False, len(face) - 1
        for i in range(n):
            xi, yi = face[i]; xj, yj = face[j]
            if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
                ins = not ins
            j = i
        return ins

    def fset(x, y, ch):
        if in_face(x, y):
            c.set(x, y, ch)

    # --- UPRIGHT monitor panel rectangle in SCREEN space, over the right face ----------
    # Axis-aligned rect inset to fit inside the parallelogram (clipped for safety). The
    # right face spans top edge (30,27)->(46,19), bottom edge (30,46)->(46,38); this rect
    # sits comfortably inside so the upright monitor reads ON the wall, not floating.
    px0, px1 = 31, 44        # panel left/right (screen x)
    py0, py1 = 27, 43        # panel top/bottom (screen y)

    # dark panel background (d body) + crisp K frame, all clipped to the wall
    for x in range(px0, px1 + 1):
        for y in range(py0, py1 + 1):
            fset(x, y, "d")
    for x in range(px0, px1 + 1):
        fset(x, py0, "K"); fset(x, py1, "K")
    for y in range(py0, py1 + 1):
        fset(px0, y, "K"); fset(px1, y, "K")
    # a thin K inner-top sheen rule so the dark glass reads as a screen
    for x in range(px0 + 1, px1):
        fset(x, py0 + 1, "K")

    # clipped stamp helper (keeps content inside the wall too)
    def stamp_f(x0, y0, rows):
        for jj, row in enumerate(rows):
            for ii, ch in enumerate(row):
                if ch != ".":
                    fset(x0 + ii, y0 + jj, ch)

    # inner content rect (inside the frame). ix 32..43 (12 wide), iy 28..42 (15 tall).
    ix0, ix1 = px0 + 1, px1 - 1     # 32..43
    iy0 = py0 + 1                    # 28 (just inside the frame)

    # === TOP STRIP (rows 28..30): capped-HEAD icon (left) + biofeedback RING (right) ===
    # CAPPED-HEAD ICON — a small head (W/L) under an EEG cap arc (D) with electrode dots.
    head = [
        "oOo",   # 0 electrode dots on the cap crown
        "DDD",   # 1 EEG cap arc / shell
        "WLW",   # 2 bright face under the cap
    ]
    stamp_f(ix0 + 1, iy0, head)
    # BIOFEEDBACK RING (magenta gauge) at the top-right, the calm/stress level
    ring = [
        ".OoO.",
        "oO.Oo",
        "o.h.o",
    ]
    stamp_f(ix1 - 4, iy0, ring)

    # === 4 STACKED HORIZONTAL BRAINWAVE BANDS — the HERO (rows 31..42). Each band is a
    # SOLID 2px-tall full-width ROW in a DISTINCT bright color so it pops off the dark
    # panel, with a 1px dark K SEPARATOR rule below it so the four bands read as a clean
    # STACK (no muddle between adjacent rows). A 1px brighter WAVY crest is carved on the
    # body (the "wave"). Drawn in SCREEN space so every row stays perfectly HORIZONTAL
    # (no shear — the round-0/1 break). 4 obvious different-color stripes = a MULTI-band
    # readout, not one trace, not noise. Crest gets finer/faster top->bottom. ===
    bands = [
        ("g", "c", 1.3),   # theta — violet body, bright crest, slow
        ("c", "W", 2.2),   # alpha — blue-violet
        ("o", "O", 3.2),   # beta  — magenta, tighter
        ("h", "W", 4.5),   # gamma — pale pink, fine fast
    ]
    bx0, bx1 = ix0, ix1                 # full inner width
    band_top = iy0 + 3                  # row 31 — below the head/ring top strip
    span = bx1 - bx0
    for k, (col, crest, freq) in enumerate(bands):
        top = band_top + k * 3          # 2px body + 1px K separator each
        bot = top + 1
        for x in range(bx0, bx1 + 1):   # solid 2px body across full width
            fset(x, top, col); fset(x, bot, col)
            fset(x, bot + 1, "K")       # 1px dark separator below the band
        for x in range(bx0, bx1 + 1):   # wavy bright crest carved into the body
            t = (x - bx0) / span
            up = math.sin(t * freq * 2 * math.pi + k)
            fset(x, top if up >= 0 else bot, crest)

    # === DECODER PIPS — tiny c/g/O state readout pips on the bottom separator, where the
    # bands resolve into a decoded state (the decoding tell). ===
    decy = band_top + 3 * 3 + 2        # the K separator under the last band (row 42)
    for i, ch in enumerate("cgOoOgc"):
        fset(ix0 + 2 + i, decy, ch)

    # --- soft o glow pooling on the ground in front of the lit RIGHT face --------------
    gx = (px0 + px1) // 2
    gy = py1 + 2
    for dxp, ch in [(-3, "r"), (-2, "o"), (-1, "O"), (0, "O"), (1, "o"), (2, "o"), (3, "r")]:
        c.set(gx + dxp, gy, ch)
    c.set(gx, gy + 1, "o")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS neuro-recording
# structure onto the prior form — never restarts, never recolors the whole building.
# Theme: the compact EEG booth grows into a fully built-out, MULTI-CHANNEL montage
# instrument. Additions grow onto the ROOF / BACK / FAR-LEFT masses + the open LEFT
# ground, so they NEVER occlude the front-right hero monitor panel (the brainwave
# trace rack). The lab's magenta o/O stays the human/pulse accent; the evolved glow is
# cool signal-cyan e/E (EEG channels/data). Gold (q) only at t5.
#
#   t2  small functional add   : an ELECTRODE-CAP STAND prop on the left ground + a
#                                brighter o/O pulse blip on the roof lead-junction node
#   t3  structural add         : a shielded BIOFEEDBACK BOOTH ANNEX (far-left Faraday box)
#   t4  major add              : a MULTI-CHANNEL AMPLIFIER TOWER raising the roofline
#   t5  crowning feature       : a live FULL-MONTAGE BRAIN-MAP head + coherence node + gold
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_capstand(c, pod):
    """t2 — SMALL FUNCTIONAL ADD: an ELECTRODE-CAP STAND prop standing on the open
    ground to the RIGHT-FRONT of the pod (the open right-foreground deck, clear of the
    front-right hero monitor panel + the pod's lit-left glass), plus a BRIGHTER o/O PULSE
    BLIP rising off the roof lead-junction node.

    The stand is a small clinical cap fixture: a slim K/D pole on a foot, topped by an
    L/W EEG-CAP DOME dotted with cyan electrode pips, with a tiny K-framed mini-readout
    card hung on the pole carrying ONE extra cyan TRACE BAND (the plan's "one more
    brainwave trace band"). On-theme (more electrodes prepped), modest, base palette +
    one brighter calibration pip. Seated in the open ground just RIGHT of the pod so it
    never crowds the front-left Faraday booth that arrives at t3."""
    # ground anchor: RIGHT-front of the pod, in the open right-foreground (the pod's right
    # wall ends at x46; x≈49 sits just clear of it, fully on-canvas at x47..52).
    sx, foot_y = 49, 46
    top_y = foot_y - 9                     # short stand, well under the roofline
    # --- stand pole + splayed foot (K/D, a small built fixture) ---
    c.line((sx, foot_y), (sx, top_y + 2), "D")
    c.line((sx + 1, foot_y), (sx + 1, top_y + 2), "K")
    c.set(sx - 1, foot_y, "K"); c.set(sx + 2, foot_y, "K")   # foot
    c.set(sx, foot_y, "K"); c.set(sx + 1, foot_y, "K")
    # --- EEG-CAP DOME on top (L lit / M shade, K rim) — the electrode cap fixture ---
    _stamp(c, sx - 2, top_y - 2, [
        ".LLL.",   # cap crown (lit L)
        "LLMMM",   # cap dome, shaded toward the right
        "KMMMK",   # cap brim / K rim
    ])
    # cyan electrode pips dotted across the cap + one BRIGHTER magenta calibration pip
    c.set(sx - 1, top_y - 2, "c")
    c.set(sx + 1, top_y - 2, "c")
    c.set(sx, top_y - 3, "O")              # bright calibration pip (the brighter accent)
    c.set(sx - 1, top_y - 1, "c")
    c.set(sx + 2, top_y - 1, "c")
    # --- mini-readout card hung on the pole: a tiny K-framed screen with ONE extra cyan
    #     TRACE BAND (the plan's "one more brainwave trace band") ---
    cardx, cardy = sx + 2, top_y + 3
    _stamp(c, cardx, cardy, [
        "KKKK",
        "KddK",
        "KeeK",   # the extra cyan trace band
        "KKKK",
    ])
    c.set(cardx + 1, cardy + 2, "E")       # a bright crest blip on the new trace

    # --- BRIGHTER PULSE BLIP on the roof lead-junction node (recompute from the SAME
    #     pod roof_pt(0.5,0.55) the base junction used — the node now pulses brighter) ---
    jp = pod.roof_pt(0.5, 0.55)
    jx, jy = int(round(jp[0])), int(round(jp[1]))
    c.set(jx, jy - 4, "O")                 # brighter blip lifting off the node
    c.set(jx, jy - 5, "o")
    c.set(jx - 1, jy - 4, "o")


def stage3_booth(c, pod):
    """t3 — STRUCTURAL ADD: a shielded BIOFEEDBACK BOOTH — a compact DARK Faraday-cage box
    standing on the open FRONT-LEFT ground beside the pod (a dedicated session booth a
    wired subject sits in). A real new structural Box (not a prop): matured deep-indigo
    `b` shielded walls (the Faraday cage reads DARKER than the indigo pod), a banded K
    shielding mesh, a parapet cap, and a glowing `g` PORTHOLE on its viewer-facing right
    face holding a small seated wired-subject silhouette, with a thin `c` lead running up
    toward the pod (wired to the rig). Seated front-LEFT (x1..13, grounded to the same
    deck as the pod) so it stays fully ON-canvas and clear of BOTH the pod's lit-left
    observation glass (screen-x 19..26) and the front-right hero monitor panel.

    Drawn AFTER the pod (in build()) so the booth reads as a distinct mass standing in
    front-left of the suite, fully visible rather than buried behind the pod."""
    # FRONT-LEFT foreground anchor: apex (9,22), 3x4 footprint, h=15 so the booth bottom
    # lands ~y44 (grounded with the pod). Its lit-LEFT face spans screen-x 1..7 (fully
    # visible on the far left) — that face carries the glowing porthole. Its right corner
    # reaches x15 (1px past the pod corner x14), harmless since the booth is foreground and
    # the pod's observation glass is well inboard (screen-x 19..26).
    booth = Box(top=(9, 22), wx=3, wy=4, h=15)
    booth.shadow(c, "K")
    # DARK Faraday shielding: deep-indigo `b` lit-left, darker `d` shaded-right, `d` roof
    # (a dark box — the shielded cage reads DARKER than the M/D indigo pod, but not pitch
    # black, so its form still reads).
    booth.draw(c, roof="d", lwall="b", rwall="d", roof_hi="D", outline="K", with_shadow=False)
    # a thin parapet along the booth roof front edges (a built cap)
    c.line(booth.r_left, booth.r_front, "D")
    c.line(booth.r_front, booth.r_right, "K")
    # --- a bright glowing PORTHOLE on the lit-LEFT face (fully viewer-visible) — bright
    #     `c` glass with an `h` sky-band + `W` sheen so it POPS off the dark Faraday box,
    #     with a seated wired subject silhouetted inside (the session in progress) ---
    booth.window(c, "left", 0.20, 0.82, 3.0, 9.2, glass="c", hi="h", shade="G",
                 frame="K", mullions=0, sheen="W")
    # a tiny d/K seated subject silhouette inside the glowing porthole (capped head + body)
    pcx, pcy = booth.left_pt(0.5, 6.6)
    pcx, pcy = int(round(pcx)), int(round(pcy))
    _stamp(c, pcx - 1, pcy - 3, [
        ".c.",   # capped crown (cyan electrode glow on the subject)
        "KdK",   # head
        "Kdd",   # shoulders
        ".d.",   # torso
    ])
    # K shielding-mesh bands ABOVE + BELOW the porthole (the Faraday cage grid lines) so
    # the cage reads woven without muddying the glowing porthole itself
    for vv in (2.0, 11.0, 13.0):
        c.line(booth.left_pt(0.12, vv), booth.left_pt(0.88, vv), "K")
    # a thin D seam down the shaded RIGHT face so the dark slab reads as a built panel
    c.line(booth.right_pt(0.5, 1.0), booth.right_pt(0.5, float(booth.h - 2)), "K")
    c.line(booth.right_pt(0.5, 1.0), booth.right_pt(0.5, 3.0), "D")
    # --- bright c ELECTRODE-LEAD pips on the booth roof + a thin c LEAD running UP toward
    #     the pod roof (the subject is wired to the rig) — clamp the endpoint on-canvas. ---
    rp = booth.roof_pt(0.4, 0.5)
    rx0, ry0 = int(round(rp[0])), int(round(rp[1]))
    c.set(rx0, ry0, "c"); c.set(rx0 + 1, ry0, "h")     # lead junction on the booth roof
    lp = booth.roof_pt(0.7, 0.4)
    lx0, ly0 = int(round(lp[0])), int(round(lp[1]))
    c.set(lx0, ly0, "K")
    c.line((lx0, ly0 - 1), (lx0 + 4, ly0 - 4), "c")   # cable up-right toward the pod
    return booth


def stage4_amptower(c, pod):
    """t4 — MAJOR ADD: a MULTI-CHANNEL AMPLIFIER TOWER raising the roofline — a prominent
    new vertical mass bolted onto the BACK of the pod roof, a slim chassis carrying a
    STACK of glowing cyan `e` CHANNEL-METERS (more electrodes feeding more channels). The
    big upgrade that says 'this rig now records many channels at once'. Palette matures:
    cooler deep-indigo `b` chassis + energized signal-cyan `e/E` meters. Seated toward the
    BACK-LEFT of the pod roof (recompute from pod.roof_pt) so the tall mass rises clear of
    the front-right hero monitor panel + sits behind the roof lead-junction node."""
    # anchor on the pod roof toward the BACK-LEFT (u→0.36, v→0.45) so the tower rises off
    # the back roof with clear headroom above (for the t5 crown) and stays clear of the
    # front-right signature panel (panel lives lower, on the front-right FACE at y27..43).
    bxf, byf = pod.roof_pt(0.36, 0.45)
    bx = int(round(bxf))
    roof_y = int(round(byf))
    tw = 6                                  # chassis width (px)
    top_y = roof_y - 8                      # a moderate tower clearly raising the roofline
    # --- amplifier CHASSIS: a b box (lit-left b / shaded-right K), K outline ---
    c.fill_poly([(bx, roof_y), (bx + tw, roof_y), (bx + tw, top_y), (bx, top_y)], "b")
    c.fill_poly([(bx + tw - 2, roof_y), (bx + tw, roof_y), (bx + tw, top_y), (bx + tw - 2, top_y)], "K")
    for a, b2 in [((bx, roof_y), (bx, top_y)), ((bx + tw, roof_y), (bx + tw, top_y)),
                  ((bx, top_y), (bx + tw, top_y))]:
        c.line(a, b2, "K")
    # a lit M top-edge highlight + a thin D shelf so the chassis reads built
    c.line((bx, top_y), (bx + tw, top_y), "M")
    c.line((bx, top_y + 1), (bx + tw, top_y + 1), "D")
    # --- STACK of glowing cyan CHANNEL-METERS down the chassis face (the multi-channel
    #     tell): rows of small e meters, each with a brighter E lit segment = a live VU. ---
    for row in range(4):
        my = top_y + 3 + row * 2
        if my >= roof_y - 1:
            break
        # two meter cells per row (left + right channel), e body + E lit segment
        for cellx in (bx + 1, bx + 4):
            c.set(cellx, my, "E")          # bright lit segment (the live channel level)
            c.set(cellx + 1, my, "e")
        c.set(bx + 3, my, "K")             # 1px gutter between the two meter columns
    # a small K vent cap on the chassis top + a faint e status pip (the amp head)
    c.line((bx + 1, top_y - 1), (bx + tw - 1, top_y - 1), "K")
    c.set(bx + tw - 2, top_y - 1, "e")
    return bx, roof_y, tw, top_y


def stage5_brainmap(c, pod):
    """t5 — CROWNING FEATURE = FULLY EVOLVED neuro-recording suite. The rig becomes a live
    FULL-MONTAGE BRAIN-MAP: a glowing bright-cyan `E` TOPOGRAPHIC HEAD-MAP (a head outline
    filled with a hot-spot heat blob + electrode grid) crowns the t4 amplifier tower on a
    clear neck, flanked by a couple of synced cyan WAVE BANDS and topped by a bright
    COHERENCE NODE; the suite is then dressed in GOLD premium trim — a `q` master-amp band
    across the tower + a gold PULSE FINIAL crowning the roof lead-junction node. Reads as
    elite, still recognizably the same EEG booth, just maxed out.

    Re-anchors off the SAME pod.roof_pt the t4 tower used so the head-map stacks cleanly
    ON the tower top (no second hardcoded guess), lifted by a CLEAR neck gap so the map
    reads as a discrete crown, not fused to the chassis."""
    # recompute the t4 tower geometry from its OWN anchor (same roof_pt + height) so the
    # crown lands exactly on the tower top — no second hardcoded guess.
    bxf, byf = pod.roof_pt(0.36, 0.45)
    bx = int(round(bxf))
    roof_y = int(round(byf))
    tw = 6
    top_y = roof_y - 8                     # the tower top (same as stage4)
    tcx = bx + tw // 2                      # tower centre x

    # --- a short b/K NECK lifting the head-map off the tower top (a CLEAR ~2px gap so the
    #     map reads as a discrete crowning element, not fused to the chassis) ---
    neck_top = top_y - 2
    c.line((tcx, top_y - 1), (tcx, neck_top), "b")
    c.line((tcx + 1, top_y - 1), (tcx + 1, neck_top), "K")

    # --- TOPOGRAPHIC BRAIN-MAP head crowning the neck: a COMPACT head disc (radius 3) —
    #     a hot-spot heat blob (G core → g → e → E rings) inside a crisp E head-outline,
    #     with a nose tick + electrode-grid pips. This is the live full-montage brain-map
    #     (the trace rack's data, now resolved into a topographic head). ---
    hcx, hcy = tcx, neck_top - 3           # head-map centre, up on the neck (radius 3)
    R = 3.0
    for yy in range(-3, 4):
        for xx in range(-3, 4):
            rr = (xx / (R + 0.4)) ** 2 + (yy / (R + 0.4)) ** 2
            if rr > 1.0:
                continue
            X, Y = hcx + xx, hcy + yy
            if not (0 <= X <= 63 and 0 <= Y <= 63):
                continue
            if rr < 0.10:
                ch = "W"                    # bright COHERENCE node = the hot core itself
            elif rr < 0.30:
                ch = "G"                    # hot-spot ring (max activity)
            elif rr < 0.55:
                ch = "g"
            elif rr < 0.80:
                ch = "e"
            else:
                ch = "E"                    # bright cool rim (the head outline glow)
            c.set(X, Y, ch)
    # crisp E head-outline rim so it reads as a round topo HEAD
    for a in range(0, 360, 24):
        X = hcx + R * math.cos(math.radians(a))
        Y = hcy + R * math.sin(math.radians(a))
        if 0 <= X <= 63 and 0 <= Y <= 63:
            c.set(int(round(X)), int(round(Y)), "E")
    # a tiny nose tick at the map's front so it reads as a head (topo convention)
    if 0 <= hcy + 4 <= 63:
        c.set(hcx, hcy + 4, "e")
    # bright W electrode-grid pips dotted on the map flanks (the montage of sensors)
    for ex, ey in [(-2, -1), (2, -1), (-2, 1), (2, 1)]:
        X, Y = hcx + ex, hcy + ey
        if 0 <= X <= 63 and 0 <= Y <= 63:
            c.set(X, Y, "W")
    # --- a couple of synced cyan WAVE-BAND crests flanking the map (the live montage
    #     traces still running alongside the topo head) — clamp on-canvas. ---
    for by_off in (-1, 1):
        yy = hcy + by_off
        if hcx - 8 >= 0 and 0 <= yy <= 63:
            c.line((hcx - 8, yy), (hcx - 5, yy - by_off), "e")   # left trace crest
        if hcx + 8 <= 63 and 0 <= yy <= 63:
            c.line((hcx + 5, yy - by_off), (hcx + 8, yy), "e")   # right trace crest

    # --- GOLD premium trim (t5 flourish only) ---
    # a gold MASTER-AMP band across the amplifier tower's lit face (the tower is now the
    # gilded master amp). Recompute from the SAME tower anchor (no second guess).
    band_y = top_y + 2
    c.line((bx + 1, band_y), (bx + tw - 1, band_y), "q")
    c.set(bx + 1, band_y, "O")             # a bright gold boss at the band's left end
    c.set(bx + tw - 1, band_y, "O")        # and right end
    # a gold PULSE FINIAL crowning the roof lead-junction node (recompute from the SAME
    # pod.roof_pt(0.5,0.55) the base junction used so it lands exactly on the node).
    jp = pod.roof_pt(0.5, 0.55)
    jx, jy = int(round(jp[0])), int(round(jp[1]))
    c.line((jx, jy - 4), (jx, jy - 7), "q")          # short gold finial spike
    c.set(jx, jy - 8, "O")                            # bright gold pip on top
    c.set(jx - 1, jy - 6, "q")
    c.set(jx + 1, jy - 6, "q")
    # gold corner bosses on the pod's front-corner eave node (sparse elite trim)
    c.set(int(round(pod.r_front[0])), int(round(pod.r_front[1])) - 1, "O")
    c.set(int(round(pod.r_front[0])) - 1, int(round(pod.r_front[1])), "q")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the EEG/biofeedback room at upgrade `stage` (1..5). Stage 1 is IDENTICAL
    to the shipped base; each higher stage keeps every prior addition and bolts on the
    next (t2 cap-stand + pulse blip → t3 shielded booth → t4 amp tower → t5 brain-map +
    gold). Painter's order keeps rooftop/overhead additions on top of the masses they
    grow from; the far-left booth (t3) draws before the roof tower/crown so occlusion is
    correct; every addition grows onto the roof/back/far-left so the front-right hero
    monitor panel is never occluded."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    base_shadow(c)              # contact shadow under the whole footprint
    monitor_annex(c, ANNEX)     # lower decoder/monitor annex (back-left, behind pod)
    recording_pod(c, POD)       # the compact GROUNDED clinical recording booth (front)
    signature(c, POD)           # UPRIGHT screen-space monitor panel over the glowing right face

    # --- CUMULATIVE UPGRADE STAGES ------------------------------------------------
    # Draw the far-left shielded booth (t3) BEFORE the roof-mounted amp tower/brain-map
    # (t4/t5) so the back-left mass sits correctly behind the rooftop additions. The t2
    # cap-stand stands on the open front-left deck (drawn after the booth so it reads in
    # front of it).
    if stage >= 3:
        stage3_booth(c, POD)
    if stage >= 2:
        stage2_capstand(c, POD)
    if stage >= 4:
        stage4_amptower(c, POD)
    if stage >= 5:
        stage5_brainmap(c, POD)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/mindframe"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "eeg-biofeedback-room"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must keep
    matching the shipped eeg-biofeedback-room.png, so it does NOT overwrite the base PNG."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": MIND, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"mindframe_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"mindframe_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
