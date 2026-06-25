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
"""
import os
import sys
import json
import math

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box

MIND = {"K": "#181428", "W": "#e8e2f6", "L": "#cabfe6", "M": "#9f90c8", "D": "#6f5fa0", "d": "#4a3c70",
        "h": "#ecc8f4", "c": "#d0a8ee", "g": "#a45ce0", "G": "#6a2fb0",
        "o": "#f08cce", "O": "#ffb8e2", "r": "#b03a80"}


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


def build():
    c = Canvas()
    base_shadow(c)              # contact shadow under the whole footprint
    monitor_annex(c, ANNEX)     # lower decoder/monitor annex (back-left, behind pod)
    recording_pod(c, POD)       # the compact GROUNDED clinical recording booth (front)
    signature(c, POD)           # UPRIGHT screen-space monitor panel over the glowing right face

    spec = {"width": 64, "height": 64, "palette": MIND, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/mindframe_eeg-biofeedback-room.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
