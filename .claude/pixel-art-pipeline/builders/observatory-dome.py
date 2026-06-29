#!/usr/bin/env python3
"""
Observatory Dome — Axiom lab economy building (BESPOKE-form, OPEN-TOP).

NOT the gateway cube. The most distinctly ROUND form of the set: a squat wide
`cylinder` ROTUNDA DRUM topped by a true HEMISPHERICAL silver DOME, hand-built as
nested shrinking ellipse rows so it reads as a smooth silver half-sphere (bright
W/L on the lit-left, M mid, D on the shaded-right, K outline, thin D meridian
seams). The dome is cracked OPEN along a vertical observation slit.

OPEN-TOP signature (one-of-one): a fat telescope barrel rises OUT through the slit
on a small equatorial fork mount, aimed up-and-LEFT at a bright catalogued 4-point
star, which pops a K-framed cyan/gold spectral-class ID tag ("G2"). A faint gold
sight-line connects barrel to star; a scatter of background stars dusts the sky.

Composed from art/isobuild.{cylinder} + a hand-built hemisphere cap, plus pixel
helpers. NO iso.draw_cube / iso.base_windows.
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder

# ── Axiom set palette (chars -> hex EXACTLY per blueprint) + the LAB-WIDE EVOLVED
# accent shades reserved for the upgrade stages ONLY (they never appear in stage 1,
# so the shipped observatory-dome.png is unchanged). These four evolved keys are the
# same convention every Axiom building's _t2.._t5 reuses:
#   b  deep indigo steel   — matured structure tone for t3+ new masses
#   e  quantum-stellar glow (mid)    E  quantum-stellar glow (bright) — t4/t5 energy
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
AXIOM = {
    "K": "#0e1124",
    "W": "#dfe6f6", "L": "#b4bee0", "M": "#7c88b8", "D": "#4e5888", "d": "#333a60",
    "h": "#d6ecff", "c": "#aad8ff", "g": "#4a9ce6", "G": "#2060b0",
    "o": "#ffe27a", "O": "#fff3c0", "r": "#c89a2a",
    "b": "#2a3158", "e": "#7ad0ff", "E": "#cdeeff", "q": "#f6c945",
}

# ── drum geometry (the rotunda) ───────────────────────────────────────────────
CX = 31          # drum centre x
DRUM_TOP_Y = 34  # y of the drum's top-ellipse centre
RX = 13          # drum horizontal radius (squat + wide)
RY = 6           # drum vertical radius (2:1-ish ellipse)
DRUM_H = 12      # drum wall height


# ── low-level pixel helpers ───────────────────────────────────────────────────
def _set(c, x, y, ch):
    c.set(int(round(x)), int(round(y)), ch)


def _bres(a, b):
    x0, y0 = int(round(a[0])), int(round(a[1]))
    x1, y1 = int(round(b[0])), int(round(b[1]))
    dx, dy = abs(x1 - x0), abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy
    pts = []
    while True:
        pts.append((x0, y0))
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x0 += sx
        if e2 < dx:
            err += dx
            y0 += sy
    return pts


def _fat_bar(c, a, b, half, core="M", hi="L", shade="D", outline="K"):
    """A BOLD, CLEAN solid tube from a to b, (2*half+1) px wide. Stamps a full
    horizontal cross-section at each centerline pixel (gap-free slab), lit `hi`
    near edge, `shade` far edge, with a continuous K flank riding the centerline
    on both sides so the outline never drifts / speckles."""
    ax, ay = int(round(a[0])), int(round(a[1]))
    bx, by = int(round(b[0])), int(round(b[1]))
    for (x, y) in _bres((ax, ay), (bx, by)):
        for w in range(-half, half + 1):
            ch = core
            if w == -half:
                ch = hi
            elif w == half:
                ch = shade
            c.set(x + w, y, ch)
        c.set(x - half - 1, y, outline)
        c.set(x + half + 1, y, outline)


# ── 1) the rotunda drum ───────────────────────────────────────────────────────
def drum(c):
    """The squat wide cylinder body — polished M/D, bright W rim glint, K rim
    banding, a K-framed door + two round c portholes, gold placard."""
    info = cylinder(c, cx=CX, top_y=DRUM_TOP_Y, rx=RX, h=DRUM_H,
                    top="M", side_l="M", side_r="D", outline="K", ry=RY)
    rx, ry = info["rx"], info["ry"]

    def wall_half(yy):
        """Half-width of the drum wall ellipse at vertical offset yy from the rim
        centre (so details clip to the curved front)."""
        frac = 1 - (yy / ry) ** 2
        if frac < 0:
            return 0.0
        return rx * (frac ** 0.5)

    # --- vertical lit/shade modelling across the cylinder wall so the drum reads
    # as a polished curved metal volume (bright sheen band lit-left -> deep D
    # shaded-right), overlaying the flat cylinder fill. ---
    wall_top = DRUM_TOP_Y
    for xx in range(-rx, rx + 1):
        frac = 1 - (xx / rx) ** 2
        if frac < 0:
            continue
        edge = ry * (frac ** 0.5)
        y0 = int(round(wall_top + edge))
        y1 = int(round(wall_top + edge + DRUM_H))
        if xx <= -rx + 2:
            ch = "L"             # bright lit-left edge sheen
        elif xx <= -rx + 5:
            ch = "M"
        elif xx <= -2:
            ch = "M"
        elif xx <= 3:
            ch = "M"
        elif xx <= rx - 4:
            ch = "D"
        else:
            ch = "d"             # deep shaded-right edge
        for y in range(y0, y1):
            c.set(CX + xx, y, ch)

    # bright W rim glint along the lit-left of the top ellipse (back-upper arc)
    for a in range(150, 211, 6):
        x = CX + rx * math.cos(math.radians(a))
        y = wall_top + ry * math.sin(math.radians(a))
        _set(c, x, y, "W")

    # --- K rim banding: a clean K + L band just under the rim, hugging the front
    # arc of the top ellipse (a structural ring around the drum top). ---
    for xx in range(-rx + 1, rx):
        frac = 1 - (xx / rx) ** 2
        if frac < 0:
            continue
        edge = ry * (frac ** 0.5)
        yb = wall_top + edge
        _set(c, CX + xx, yb + 1, "K")          # groove
        _set(c, CX + xx, yb + 2, "L" if xx < 0 else "M")  # lit band lip

    # --- K rim banding near the base (foot ring) ---
    for xx in range(-rx + 1, rx):
        frac = 1 - (xx / rx) ** 2
        if frac < 0:
            continue
        edge = ry * (frac ** 0.5)
        yb = wall_top + edge + DRUM_H
        _set(c, CX + xx, yb - 1, "K")

    # --- K-framed door centred on the lit front of the drum ---
    door_cx = CX - 2
    door_w = 3
    door_top = wall_top + 5
    door_bot = wall_top + DRUM_H - 1
    for y in range(int(door_top), int(door_bot) + 1):
        for dx in range(-door_w, door_w + 1):
            ch = "d" if abs(dx) < door_w else "K"
            c.set(door_cx + dx, y, ch)
    # door frame
    for y in range(int(door_top) - 1, int(door_bot) + 1):
        c.set(door_cx - door_w - 1, y, "K")
        c.set(door_cx + door_w + 1, y, "K")
    for dx in range(-door_w - 1, door_w + 2):
        c.set(door_cx + dx, int(door_top) - 1, "K")
    # arched lintel highlight + warm threshold
    for dx in range(-door_w, door_w + 1):
        c.set(door_cx + dx, int(door_top), "M")
    c.set(door_cx, int(door_bot), "d")

    # --- two clean ROUND c portholes on the DRUM WALL (small navy-glass circles),
    # NOT arrows: a solid round c glass disk, a single bright W/h shine glint at
    # the upper-left, and a clean 1px K frame ring. Deliberately simple so each
    # reads unambiguously as a round window, never a chevron. ---
    def porthole(pcx, pcy, pr):
        for dy in range(-pr - 1, pr + 2):
            for dx in range(-pr - 1, pr + 2):
                d2 = dx * dx + dy * dy
                if d2 <= pr * pr:
                    # flat navy glass with a touch more depth toward the sill
                    c.set(pcx + dx, pcy + dy, "c" if dy <= 0 else "g")
                elif d2 <= (pr + 1) * (pr + 1):
                    c.set(pcx + dx, pcy + dy, "K")   # clean K frame ring
        # a single bright glint at the upper-left (the glass tell)
        c.set(pcx - 1, pcy - 1, "W")
        c.set(pcx, pcy - 1, "h")

    # flank the door on the visible lower drum wall, level with each other
    p_y = wall_top + RY + 6
    porthole(CX - 8, p_y, 2)   # left-of-door porthole
    porthole(CX + 6, p_y, 2)   # right-of-door porthole

    # The gold "OBSERVATORY" placard is drawn LATER (after the dome) so the dome
    # apron never buries it. Return its anchor (centred over the door lintel).
    return {"cx": CX, "rx": rx, "ry": ry, "rim_y": wall_top,
            "door_cx": door_cx, "door_top": int(door_top)}


def placard(c, drum_info):
    """The gold 'OBSERVATORY' placard, painted ON TOP after the dome so it always
    reads on the drum wall just above the door lintel: a warm o/r band with O
    engraved-letter ticks and a clean K frame."""
    door_cx = drum_info["door_cx"]
    # sit it tight above the door, on the visible lower drum wall
    plac_y = drum_info["door_top"] - 2
    for dx in range(-4, 5):
        c.set(door_cx + dx, plac_y, "o")
        c.set(door_cx + dx, plac_y - 1, "r")
    for dx in (-3, -1, 1, 3):
        c.set(door_cx + dx, plac_y, "O")   # engraved letter ticks
    # clean K frame around the placard band
    for dx in range(-5, 6):
        c.set(door_cx + dx, plac_y + 1, "K")
    c.set(door_cx - 5, plac_y, "K")
    c.set(door_cx + 5, plac_y, "K")
    c.set(door_cx - 5, plac_y - 1, "K")
    c.set(door_cx + 5, plac_y - 1, "K")


# ── 2) the hemispherical silver dome (cracked open along a slit) ──────────────
def dome(drum_info):
    """Hand-built true hemisphere cap sitting on the drum rim, drawn as nested
    shrinking ellipse rows so it reads as a SMOOTH silver half-sphere. Lit W/L on
    the upper-left, M body, D on the shaded-right, K silhouette, thin D meridian
    seams. A vertical observation SLIT is cracked open down the dome facing
    up-LEFT, with L/W shutter lips either side and the telescope barrel poking
    through. Returns slit geometry for the telescope.
    """
    cx = drum_info["cx"]
    rim_y = drum_info["rim_y"]
    # The dome is NARROWED a touch (smaller than the drum) and its spring line is
    # RAISED a couple px above the drum's top-ellipse centre, so the round drum
    # rim + upper wall (door + gold placard) read clearly BENEATH the hemisphere
    # instead of being swallowed by a wide low apron.
    drx = drum_info["rx"] - 2        # dome base radius < drum radius (narrowed)
    dbase_y = rim_y - 2              # dome springs from ABOVE the drum rim (raised)
    height = 13                      # crown rise -> a true (squat-iso) hemisphere
    base_ry = drum_info["ry"] - 2    # shallower apron -> less of the drum hidden

    def crown_y(xx):
        """Top y of the dome silhouette at column xx (circular crown)."""
        frac = 1 - (xx / drx) ** 2
        if frac < 0:
            return None
        return dbase_y - height * (frac ** 0.5)

    def base_y(xx):
        """Bottom y of the dome at column xx (front arc of the base ellipse)."""
        frac = 1 - (xx / drx) ** 2
        if frac < 0:
            return None
        return dbase_y + base_ry * (frac ** 0.5)

    return cx, drx, dbase_y, height, base_ry, crown_y, base_y


def draw_dome(c, dome_geom):
    cx, drx, dbase_y, height, base_ry, crown_y, base_y = dome_geom

    # Slit: a narrow vertical channel on the up-LEFT of the dome (opening side).
    # The barrel rises through it. Kept narrow (3px) + clean so it reads as a
    # cracked-open observation slit, not a dark wound across the shell.
    slit_cx = -4                     # slit centre column (left of dome centre)
    slit_half = 1                    # slit half-width (3px gap)

    # Silver ramp, bright -> dark (the only tones the dome shell uses).
    RAMP = ["W", "L", "M", "D", "d"]

    # Fixed light from the UPPER-LEFT-FRONT (lit-left convention). Normalised.
    lx, ly, lz = -0.55, -0.62, 0.56
    lmag = (lx * lx + ly * ly + lz * lz) ** 0.5
    lx, ly, lz = lx / lmag, ly / lmag, lz / lmag

    # --- SMOOTH HEMISPHERE: shade each pixel by its true surface normal. For the
    # upper hemisphere we treat (x,y) screen offset as a point on a sphere of
    # radius drx (y compressed by the dome's height so the silhouette matches the
    # crown arc). nz is recovered from the sphere equation; the normal == the unit
    # surface point. Quantising n·light to the silver ramp gives a genuinely round
    # silver dome with no facets and a clean upper-left highlight. ---
    for xx in range(-drx, drx + 1):
        t = crown_y(xx)
        b = base_y(xx)
        if t is None:
            continue
        y0, y1 = int(round(t)), int(round(b))
        in_slit = (slit_cx - slit_half) <= xx <= (slit_cx + slit_half)
        # the open slit only cracks the UPPER dome shell (down to ~the rim line),
        # not the foreshortened base apron below it.
        slit_bottom = int(round(dbase_y))
        for y in range(y0, y1 + 1):
            if in_slit and y <= slit_bottom:
                # open observation slit: a clean dark K-edged d interior channel
                c.set(cx + xx, y, "K" if (y <= y0 + 1) else "d")
                continue
            # map screen y to a sphere-vertical coordinate. Above the spring line
            # (rim) is the visible hemisphere; below it is the foreshortened base
            # apron — shade that a touch darker as the underside.
            ny = (y - dbase_y) / height            # 0 at rim, -1 at crown
            nx = xx / drx
            rr = nx * nx + ny * ny
            if rr > 1.0:
                # base apron pixels (the foreshortened front lip below the rim):
                # a thin rounded underside, lit-left M -> shaded-right D, never the
                # deep `d` (keeps the lower dome from turning into a dark mass).
                base = "M" if nx < -0.15 else "D"
            else:
                nz = (1.0 - rr) ** 0.5
                # n·light (ny is screen-down => surface up is -ny)
                d = nx * lx + (-ny) * ly + nz * lz
                d = max(-1.0, min(1.0, d))
                # quantise across the silver ramp. Compress the dark end so the
                # SHADED-RIGHT hemisphere stays modelled in M/D and only the very
                # back-right terminator dips to `d` (no flat dark slab).
                t01 = (d + 0.35) / 1.25
                t01 = max(0.0, min(1.0, t01))
                idx = int(round((1.0 - t01) * (len(RAMP) - 1)))
                base = RAMP[idx]
            c.set(cx + xx, y, base)

    # --- thin D meridian seams (two longitude ribs) — subtle, single-pixel, only
    # over filled silver (never over the slit / outline) so the shell reads as a
    # paneled dome without becoming noisy. ---
    for mx in (-7, 5):
        t = crown_y(mx)
        b = base_y(mx)
        if t is None:
            continue
        for y in range(int(round(t)) + 1, int(round(b))):
            yi, xi = int(round(y)), int(round(cx + mx))
            if 0 <= yi < c.h and 0 <= xi < c.w and c.px[yi][xi] in ("W", "L", "M", "D"):
                # darken one ramp step for the seam groove
                c.px[yi][xi] = {"W": "L", "L": "M", "M": "D", "D": "d"}[c.px[yi][xi]]

    # --- shutter LIPS either side of the slit (the dome panels rolled open): a
    # bright W lip on the lit-left edge, an L lip on the right edge. ---
    for sx, lip in ((slit_cx - slit_half - 1, "W"), (slit_cx + slit_half + 1, "L")):
        t = crown_y(sx)
        if t is None:
            continue
        lip_bottom = int(round(dbase_y))   # lips bracket only the cracked-open shell
        for y in range(int(round(t)), lip_bottom + 1):
            yi, xi = int(round(y)), int(round(cx + sx))
            if 0 <= yi < c.h and 0 <= xi < c.w and c.px[yi][xi] not in (".", "K", "d"):
                c.set(cx + sx, y, lip)

    # --- crisp continuous K silhouette: crown arc (the dome top) ---
    prev = None
    for xx in range(-drx, drx + 1):
        t = crown_y(xx)
        if t is None:
            continue
        ty = int(round(t))
        c.set(cx + xx, ty, "K")
        if prev is not None and abs(ty - prev) > 1:    # close vertical arc gaps
            for yy in range(min(ty, prev) + 1, max(ty, prev)):
                c.set(cx + xx, yy, "K")
        prev = ty

    return {"cx": cx, "slit_cx": cx + slit_cx, "slit_top": int(round(crown_y(slit_cx))),
            "dbase_y": dbase_y, "height": height}


# ── 3) the hero: telescope barrel through the slit ───────────────────────────
def telescope(c, slit):
    """A fat M/L K-outlined telescope tube angling up-and-LEFT out of the dome
    slit, on a small D equatorial fork mount, eyepiece end inside the dome, the
    aperture aimed at the catalogued star. Returns the aperture tip (line of sight
    origin) so the star + sight-line can be placed on its axis."""
    sx = slit["slit_cx"]
    s_top = slit["slit_top"]

    # --- fork mount: a small D yoke straddling the slit just below the crown ---
    mount_y = s_top + 6
    for dx in range(-2, 3):
        c.set(sx + dx, mount_y, "D")
        c.set(sx + dx, mount_y + 1, "d")
    c.set(sx - 3, mount_y, "K")
    c.set(sx + 3, mount_y, "K")
    # fork tines rising to the trunnion
    c.set(sx - 2, mount_y - 1, "M")
    c.set(sx + 2, mount_y - 1, "M")
    c.set(sx - 3, mount_y - 1, "K")
    c.set(sx + 3, mount_y - 1, "K")

    # --- the barrel: eyepiece end deep in the slit, aperture out up-and-LEFT ---
    eyepiece = (sx + 1, mount_y - 1)        # inside / at the trunnion
    aperture = (sx - 13, s_top - 6)         # out the slit, aimed up-left at sky
    _fat_bar(c, eyepiece, aperture, half=2, core="M", hi="L", shade="D", outline="K")

    # eyepiece nub (a small dark cap at the lower end)
    c.set(eyepiece[0] + 1, eyepiece[1] + 1, "K")
    c.set(eyepiece[0], eyepiece[1] + 1, "d")

    # aperture ring: a bright L/W rim at the sky end (the open objective lens)
    ax, ay = int(round(aperture[0])), int(round(aperture[1]))
    c.set(ax, ay - 1, "W")
    c.set(ax - 1, ay, "L")
    c.set(ax - 1, ay - 1, "W")
    c.set(ax, ay - 2, "K")
    c.set(ax - 2, ay, "K")
    c.set(ax - 2, ay - 1, "K")
    # a tiny c lens glint inside the aperture
    c.set(ax, ay, "c")

    # tube banding ring (a crisp K + L collar mid-barrel)
    mbx = (eyepiece[0] + ax) // 2
    mby = (eyepiece[1] + ay) // 2
    c.set(mbx - 1, mby, "L")
    c.set(mbx + 1, mby, "K")

    return (ax - 1, ay - 1)   # aperture tip = line-of-sight origin


# ── 4) catalogued star + spectral-class ID tag + sky ─────────────────────────
def star_and_tag(c, sight_origin):
    """A bright O/W 4-point catalogued star up-LEFT on the telescope's axis, with
    an o glow + h sparkle glints, a faint o sight-line from barrel to star, and a
    K-framed cyan/gold ID tag reading its spectral class (G2). Plus a scatter of
    tiny background stars dusting the sky."""
    ox, oy = sight_origin
    # Star sits up-and-LEFT along the barrel's axis, anchored near the top-left
    # with comfortable margins so its 4 arms + glow stay fully on-frame.
    star_x = max(7, min(ox - 5, 10))
    star_y = max(7, min(oy - 4, 9))

    # --- faint o sight-line connecting the aperture to the star (dotted), ending
    # just short of the star core so the line reads as "this telescope -> this
    # star". ---
    for (px, py) in _bres((ox, oy), (star_x + 2, star_y + 2)):
        if (px + py) % 2 == 0 and (abs(px - star_x) + abs(py - star_y)) > 3:
            cur = c.px[py][px] if 0 <= py < c.h and 0 <= px < c.w else "K"
            if cur == ".":
                c.set(px, py, "o")

    # --- the 4-point catalogued star (the hero target) ---
    # soft o glow halo
    for dx, dy in [(-2, 0), (2, 0), (0, -2), (0, 2), (-1, -1), (1, -1), (-1, 1), (1, 1)]:
        c.set(star_x + dx, star_y + dy, "o")
    # 4-point arms (W) + bright O core — long thin diamond spikes
    for d in range(1, 4):
        c.set(star_x - d, star_y, "W")
        c.set(star_x + d, star_y, "W")
        c.set(star_x, star_y - d, "W")
        c.set(star_x, star_y + d, "W")
    c.set(star_x, star_y, "O")
    c.set(star_x - 1, star_y, "O")
    c.set(star_x + 1, star_y, "O")
    c.set(star_x, star_y - 1, "O")
    c.set(star_x, star_y + 1, "O")
    # h sparkle glints on the upper-left tips
    c.set(star_x - 3, star_y, "h")
    c.set(star_x, star_y - 3, "h")

    # --- spectral-class ID tag floating to the RIGHT of the star, clear of its
    # arms (K-framed glowing cyan/gold readout panel). A short o connector stub
    # links the star glow to the tag. ---
    tx0 = star_x + 6       # gap past the star's right arm (ends at star_x+3)
    ty0 = star_y - 1
    tw, th = 8, 5
    # connector stub from star to tag
    c.set(star_x + 4, star_y, "o")
    c.set(star_x + 5, star_y, "o")
    # panel body: cyan readout field
    for y in range(ty0, ty0 + th):
        for x in range(tx0, tx0 + tw):
            c.set(x, y, "c")
    # K frame
    for x in range(tx0 - 1, tx0 + tw + 1):
        c.set(x, ty0 - 1, "K")
        c.set(x, ty0 + th, "K")
    for y in range(ty0 - 1, ty0 + th + 1):
        c.set(tx0 - 1, y, "K")
        c.set(tx0 + tw, y, "K")
    # "G2" class glyph implied by o ticks (2 columns of marks)
    c.set(tx0 + 1, ty0 + 1, "o"); c.set(tx0 + 2, ty0 + 1, "o")
    c.set(tx0 + 1, ty0 + 2, "o")
    c.set(tx0 + 1, ty0 + 3, "o"); c.set(tx0 + 2, ty0 + 3, "o")  # "G"
    c.set(tx0 + 4, ty0 + 1, "O"); c.set(tx0 + 5, ty0 + 1, "O")
    c.set(tx0 + 5, ty0 + 2, "O")
    c.set(tx0 + 4, ty0 + 2, "o"); c.set(tx0 + 4, ty0 + 3, "o")
    c.set(tx0 + 4, ty0 + 3, "O"); c.set(tx0 + 5, ty0 + 3, "O")  # "2"
    # bright "IDENTIFIED" dot at the tag corner
    c.set(tx0 + tw - 1, ty0, "O")

    # --- background stars dusting the night sky around the dome top ---
    for (bx, by, ch) in [
        (8, 6, "W"), (14, 3, "c"), (20, 8, "W"), (45, 5, "c"),
        (50, 12, "W"), (7, 18, "c"), (2, 10, "W"), (40, 2, "W"),
        (54, 22, "c"), (12, 24, "W"),
    ]:
        if c.px[by][bx] == ".":
            c.set(bx, by, ch)


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). The lone optical observatory grows into a
# full multi-wavelength survey OBSERVATORY. Every addition is astronomy + cosmic
# on-theme to THIS building (a dome catwalk + finder-scope -> a spectrograph
# analysis wing -> a radio-dish on a mast -> a catalogued-star survey sweep), and
# each grows from the dome/drum it sits on. Stages anchor to the SAME drum/dome/slit
# geometry the base returns (no hardcoded second guesses), and stay clear of the
# OPTICAL BARREL + catalogued-star signature up-LEFT. Colours mature stage by stage;
# gold (q) appears ONLY as the t5 flourish.
#
#   t2  small functional add : a solid FINDER-SCOPE (right shoulder) + a CATWALK tread band
#   t3  structural add       : a SPECTROGRAPH WING annex at the drum base (right)
#   t4  major add            : a RADIO-DISH on a STOUT braced MAST up-right beside the dome
#   t5  crowning feature     : gold dome BAND + APEX CUPOLA + dish FEED-RIB array (+thin halo)
#
# Anchors: drum centre CX=31; dome hemisphere x≈18..43 (crown apex ~y14, spring/rim
# ~y32); the optical barrel + star sign occupy x≈5..28, y≈3..28 (up-LEFT). So the
# spectrograph wing seats at the drum base on the RIGHT (x≈40..56), and the radio
# dish climbs the OPEN sky up-RIGHT (x≈44..62) — both clear of the optical sign.
# ═══════════════════════════════════════════════════════════════════════════════

def _finder_anchor(drum_info, dome_geom):
    """Shared anchor for the t2 FINDER-SCOPE so t2 (draw) and any later stage agree on
    where it sits. A clear point on the dome's RIGHT shoulder (clean silver shell, well
    away from the up-LEFT main barrel + slit), returned as (saddle_x, saddle_y)."""
    cx, drx, dbase_y, height, base_ry, crown_y, base_y_fn = dome_geom
    sax = cx + drx - 4                    # right shoulder of the dome (x≈37), on the shell
    say = int(round(dbase_y - height * 0.42))   # mid-upper right flank
    return sax, say


def stage2_catwalk_finder(c, drum_info, dome_geom, slit):
    """t2 — SMALL FUNCTIONAL ADD: one CLEARLY READABLE FINDER-SCOPE (a solid 2px M/L
    tube on a D saddle, with a bright L/W objective, mounted on the dome's RIGHT shoulder
    and aimed up-and-RIGHT) — deliberately OFFSET from the up-LEFT main barrel so the two
    read as distinct instruments — plus a short solid CATWALK TREAD band that OVERWRITES
    the lit-left dome shell with a bright L tread over a dark D/K underside line, so it
    reads as a banded ring (not a tint lost in the silver shading), and a brighter o/O
    glint on the catalogued star. ~20 solid finder px + ~10 tread px = obviously distinct
    from base. On-theme (more optics), base palette + a brighter o. No barrel occlusion."""
    cx, drx, dbase_y, height, base_ry, crown_y, base_y_fn = dome_geom
    slit_cx_rel = slit["slit_cx"] - cx

    # --- CATWALK TREAD band on the LIT-LEFT belly of the dome: a short solid 2px band
    #     that OVERWRITES the shell — a bright L/W tread on TOP and a forced dark D/K
    #     underside line directly beneath it — so it reads as a discrete railed band
    #     standing off the silver, not a same-tone glint. Lit-left arc only; the slit,
    #     fork-mount, and shaded-right columns are skipped. ---
    band_ny = -0.20                       # low latitude on the belly (0=rim .. -1=crown)
    for xx in range(-drx + 2, 1):         # lit-left front arc only (nx ≤ 0)
        nx = xx / drx
        rr = nx * nx + band_ny * band_ny
        if rr > 1.0:
            continue
        if abs(xx - slit_cx_rel) <= 4:    # leave the slit + fork-mount columns clean
            continue
        yi = int(round(dbase_y + band_ny * height))
        if not (0 <= yi < c.h) or c.px[yi][cx + xx] not in ("W", "L", "M", "D"):
            continue
        c.set(cx + xx, yi, "W" if nx < -0.5 else "L")        # bright tread (top)
        if 0 <= yi + 1 < c.h and c.px[yi + 1][cx + xx] in ("W", "L", "M", "D"):
            c.set(cx + xx, yi + 1, "D")                      # shaded tread underside
        if 0 <= yi + 2 < c.h and c.px[yi + 2][cx + xx] in ("W", "L", "M", "D"):
            c.set(cx + xx, yi + 2, "K")                      # K shadow groove -> reads railed
    # two short stanchions standing UP off the tread (lit-left) so it reads as a railing
    y0 = int(round(dbase_y + band_ny * height))
    for sxx in (-9, -5):
        if 0 <= y0 - 1 < c.h and c.px[y0 - 1][cx + sxx] in ("W", "L", "M", "D"):
            c.set(cx + sxx, y0 - 1, "L")

    # --- FINDER-SCOPE on the dome's RIGHT shoulder, aimed up-and-RIGHT (offset away
    #     from the up-LEFT main barrel). A D saddle on the shell + a SOLID 2px M-core
    #     tube with an L lit upper edge + a D shaded lower edge, capped by a bright L/W
    #     objective ring at the sky end. Endpoints clamped on-canvas. ~20 solid px. ---
    sax, say = _finder_anchor(drum_info, dome_geom)
    # D saddle bracket clamping the finder onto the dome shell (a small solid block)
    c.fill_poly([(sax - 1, say), (sax + 1, say), (sax + 1, say + 2), (sax - 1, say + 2)], "D")
    c.set(sax - 1, say + 2, "K"); c.set(sax + 1, say + 2, "K")
    # finder tube: eyepiece on the saddle, objective out up-RIGHT into clear sky
    fa = (sax + 1, say)                   # eyepiece end (on the saddle, inner)
    fb = (min(sax + 9, 61), max(say - 7, 1))   # objective end up-right (clamped on-canvas)
    for (px, py) in _bres(fa, fb):
        c.set(px, py, "M")                # solid 2px tube core (this row)
        c.set(px, py - 1, "L")            # lit upper edge
        if 0 <= py + 1 < c.h and c.px[py + 1][px] == ".":
            c.set(px, py + 1, "D")        # shaded lower edge
    # bright L/W objective ring at the finder's sky end + a tiny o lens glint
    ox, oy = fb
    c.set(ox, oy, "L")
    c.set(ox + 1, oy - 1, "W")            # objective lit corner (up-right)
    c.set(ox + 1, oy, "K")               # objective rim
    c.set(ox, oy - 1, "o")               # tiny lens glint
    c.set(ox - 1, oy + 1, "K")           # eyepiece-side cap (inner)

    # --- a brighter catalogued-star glint: pop one extra O/h sparkle near the star
    #     (the survey gets a touch keener). The star core is up-LEFT ~ (8..10, 7..9). ---
    for (gx, gy, ch) in [(9, 5, "O"), (11, 7, "h"), (6, 8, "o")]:
        if 0 <= gy < c.h and 0 <= gx < c.w and c.px[gy][gx] == ".":
            c.set(gx, gy, ch)


def _spectro_box(drum_info):
    """Shared anchor for the spectrograph wing (t3) so any later stage that needs it
    recomputes the SAME Box. A low annex abutting the drum base on the RIGHT, its
    base resting on the ground line so it reads as built onto the rotunda foot."""
    return Box(top=(46, 42), wx=5, wy=3, h=8)


def stage3_spectrograph(c, drum_info, slit):
    """t3 — STRUCTURAL ADD: a low SPECTROGRAPH WING annex butts onto the drum base on
    the RIGHT — a real new Box mass (lit M left, D shaded right, L roof, deep-indigo
    `b` base band so it reads as matured structure) carrying a g/c instrument window on
    its lit face (the analysis room). A thin diagonal LIGHT-PIPE runs up from the wing
    roof toward the dome slit (the captured starlight now feeds the spectrograph). The
    light feeds an analysis room. Seated right of centre, clear of the optical barrel /
    door / placard on the left, fully on-canvas."""
    wing = _spectro_box(drum_info)
    wing.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # deep-indigo base band so the new annex reads as matured structure
    c.line(wing.w_left, wing.w_front, "b")
    c.line(wing.w_front, wing.w_right, "b")
    # calm starlight-gold accent line along the wing's lit eave (matches the lab)
    c.line(wing.r_left, wing.r_front, "o")
    # a g/c instrument window on the lit (left) face — the spectrograph readout
    wing.window(c, "left", 0.20, 0.84, 1.6, 5.4, glass="g", hi="h", shade="G",
                frame="K", mullions=1)
    # a thin grating/conduit detail on the shaded right face
    c.line(wing.right_pt(0.5, 1.4), wing.right_pt(0.5, wing.h - 0.8), "d")

    # --- LIGHT-PIPE: a thin diagonal c/h conduit from the wing roof up toward the
    #     dome slit, so the captured starlight visibly feeds the analysis wing. Anchor
    #     both ends from real geometry (wing roof + slit base), clamp on-canvas. ---
    rpx, rpy = wing.roof_pt(0.30, 0.5)
    a = (int(round(rpx)), int(round(rpy)))
    b = (slit["slit_cx"] + 2, slit["slit_top"] + 9)     # just below the slit crown
    pts = _bres(a, b)
    for i, (px, py) in enumerate(pts):
        if not (0 <= px < c.w and 0 <= py < c.h):
            continue
        # only lay the pipe over open sky / the wing roof, never over the dome shell
        if c.px[py][px] in (".", "L", "W"):
            c.set(px, py, "c" if i % 2 == 0 else "h")
    # a small K-framed coupling box where the pipe meets the wing roof
    c.set(a[0], a[1] - 1, "K")
    c.set(a[0] + 1, a[1] - 1, "c")


def _uplink_anchor(drum_info):
    """Shared anchor for the t4 RADIO-DISH mast so t4 (draw) and t5 (gold ribs) compute
    the SAME geometry from one source (no hardcoded second guess). Returns a dict with the
    mast FOOT, the mast TOP, and the dish-bowl CENTRE + radii."""
    cx0 = drum_info["cx"]; rx = drum_info["rx"]; rim_y = drum_info["rim_y"]
    foot_x = cx0 + rx - 2                 # x≈42, just inside the drum's right rim
    foot_y = rim_y + 2                    # on the upper drum, a touch below the rim
    top_y = foot_y - 22                   # mast head — rises high into clear sky
    RXd, RYd = 6, 5                       # dish radii — wide round mouth
    dcx = min(foot_x + 6, 63 - RXd - 1)   # bowl centre up-right of the head (clamped)
    dcy = top_y - 1
    return {"foot_x": foot_x, "foot_y": foot_y, "top_y": top_y,
            "dcx": dcx, "dcy": dcy, "RXd": RXd, "RYd": RYd}


def stage4_radio_dish(c, drum_info, dome_geom):
    """t4 — MAJOR ADD: a RADIO-DISH on a stout MAST rises in the OPEN sky up-RIGHT of the
    dome — a SOLID 3px deep-indigo `b` mast (lit `M` left edge, `D` shaded right) on a
    clear K plinth with an angled BRACE GUSSET tying its foot to the drum shoulder, so it
    reads planted (not a spindly pole). It carries a parabolic M/L dish with a glowing `e`
    feed-horn on a tripod aimed up-and-RIGHT — the prominent new mass that says this is now
    a MULTI-WAVELENGTH observatory. Palette matures: deep `b` mast + energized `e`/`E` glow.
    Anchored on the drum's right shoulder (shared `_uplink_anchor`, so t5 reuses it exactly),
    rising clear of and well right of the optical barrel, fully on-canvas."""
    import math
    a = _uplink_anchor(drum_info)
    foot_x, foot_y, top_y = a["foot_x"], a["foot_y"], a["top_y"]
    # --- STOUT MAST: a solid 3px column (b body), lit M left edge + D shaded right edge,
    #     K-capped — thick enough to clearly carry the heavy dish, never reads as 1px. ---
    for yy in range(top_y, foot_y + 1):
        c.set(foot_x, yy, "M")            # lit-left edge of the mast
        c.set(foot_x + 1, yy, "b")        # mast body (deep indigo)
        c.set(foot_x + 2, yy, "D")        # shaded-right edge
    c.set(foot_x + 1, top_y, "K")         # capped head
    # a couple of K cross-ties banding the mast so it reads as built structure, not a pipe
    for yy in (top_y + 6, top_y + 13):
        c.set(foot_x, yy, "K"); c.set(foot_x + 2, yy, "K")
    # K plinth pad on the drum shoulder + an angled BRACE GUSSET down-left to the shell
    c.fill_poly([(foot_x - 1, foot_y), (foot_x + 3, foot_y),
                 (foot_x + 3, foot_y + 1), (foot_x - 1, foot_y + 1)], "K")   # plinth pad
    c.fill_poly([(foot_x, foot_y - 4), (foot_x, foot_y),
                 (foot_x - 4, foot_y)], "b")                                 # brace gusset
    c.line((foot_x, foot_y - 4), (foot_x - 4, foot_y), "D")                  # gusset hypotenuse
    c.line((foot_x - 4, foot_y), (foot_x, foot_y), "K")                      # gusset foot (on shell)

    # --- parabolic DISH on the mast head: a SOLID round bowl seen near-face-on, so it
    #     reads unmistakably as a satellite dish (a wide filled ellipse), tilted to aim
    #     up-and-RIGHT. Drawn as a filled ellipse disc (mouth) with a bright L lit-left
    #     crescent, M body, D shaded-right, a K rim ring, and a small d concave shadow
    #     at the bowl bottom so the cup reads concave. WIDER than tall (RXd>RYd). ---
    dcx, dcy = a["dcx"], a["dcy"]         # dish bowl centre (shared anchor)
    RXd, RYd = a["RXd"], a["RYd"]         # dish radii — wide round mouth (a real dish)
    # solid disc fill, shaded by horizontal position across the mouth (lit-left)
    for yy in range(-RYd, RYd + 1):
        for xx in range(-RXd, RXd + 1):
            if (xx / RXd) ** 2 + (yy / RYd) ** 2 <= 1.0:
                nx = xx / RXd
                if nx <= -0.55:
                    ch = "L"              # bright lit-left crescent of the bowl
                elif nx <= 0.1:
                    ch = "M"
                elif nx <= 0.6:
                    ch = "D"
                else:
                    ch = "d"              # deep shaded-right edge
                c.set(dcx + xx, dcy + yy, ch)
    # concave tell: a small darker d pool low-centre + a bright W shine high-left
    for (sxx, syy, ch) in [(-1, 1, "d"), (0, 1, "d"), (-2, -2, "W"), (-3, -1, "L")]:
        if (sxx / RXd) ** 2 + (syy / RYd) ** 2 <= 1.0:
            c.set(dcx + sxx, dcy + syy, ch)
    # crisp K rim ring around the whole mouth (so the disc reads as a solid dish)
    for a in range(0, 360, 7):
        x = dcx + (RXd + 0.4) * math.cos(math.radians(a))
        y = dcy + (RYd + 0.4) * math.sin(math.radians(a))
        c.set(x, y, "K")
    # short pedestal yoke joining the bowl back to the mast head (K so it reads solid)
    c.line((foot_x + 1, top_y), (dcx - 2, dcy + 2), "K")
    c.set(dcx - 1, dcy + RYd - 1, "D")

    # --- glowing FEED-HORN on a little tripod at the dish FOCUS, standing clearly OFF
    #     the bowl mouth toward up-RIGHT (the bright energized tell). Two short K struts
    #     from the lit rim converge on a glowing e/E node held out past the rim, so the
    #     glow reads as a feed-horn at the focus (not a mark on the bowl face). ---
    fhx, fhy = min(dcx + RXd, 62), dcy - 3   # focus held out up-right past the rim
    for (rx0, ry0) in [(dcx, dcy - RYd + 1), (dcx + 2, dcy)]:
        c.line((rx0, ry0), (fhx, fhy), "K")   # two tripod struts to the feed-horn
    c.set(fhx, fhy, "E")                  # bright feed-horn core
    c.set(fhx - 1, fhy, "e")
    c.set(fhx, fhy + 1, "e")
    c.set(fhx + 1, fhy - 1, "e")          # a tiny up-right emission glint


def stage5_catalog_sweep(c, drum_info, dome_geom, slit):
    """t5 — CROWNING FEATURE = FULLY EVOLVED survey observatory, built out in premium GOLD
    as real CONNECTED structure (not free-floating sparkles). Three attached gold pieces:
      (1) a q equatorial BAND ringing the hemisphere at the spring line;
      (2) a small gold-trimmed APEX CUPOLA built on the dome crown (a q/O lantern cap with
          a short antenna spike) — physically on the dome;
      (3) a radial GOLD FEED-RIB ARRAY fanning off the radio-dish pod rim (recomputed from
          the SAME `_uplink_anchor` as t4) — the maxed multi-feed dish.
    Only a THIN sparse HALO of a few E/e glints hugs the catalogued star + the dish horn
    (no large arcs of free dots). Reads elite/maxed, still unmistakably the same observatory.
    Gold ONLY here."""
    import math
    cx, drx, dbase_y, height, base_ry, crown_y, base_y_fn = dome_geom

    # --- GOLD equatorial BAND: a thin q ring tracing the hemisphere right at the rim
    #     SPRING LINE (the equator), well BELOW the t2 catwalk so the two read as
    #     distinct rings — a premium gold equator band. Full front arc (lit-left O glint
    #     -> q gold -> r shaded-right), skipping the slit so it reads as trim, not a
    #     recolor. Lands on the apron/rim where it meets the drum. ---
    band_ny = -0.02                       # the rim spring line (the equator)
    slit_cx_rel = slit["slit_cx"] - cx
    for xx in range(-drx + 1, drx):
        nx = xx / drx
        rr = nx * nx + band_ny * band_ny
        if rr > 1.0:
            continue
        if abs(xx - slit_cx_rel) <= 2:    # leave the slit uncrossed
            continue
        y = dbase_y + band_ny * height
        yi = int(round(y))
        if 0 <= yi < c.h and c.px[yi][cx + xx] in ("W", "L", "M", "D"):
            c.set(cx + xx, yi, "O" if nx < -0.4 else ("q" if nx < 0.45 else "r"))

    # --- GOLD slit FINIAL crowning the open observation slit (a small gold cap + apex
    #     spike at the dome crown, lifted 1px so it reads as a separate crowning piece). ---
    fx = slit["slit_cx"]
    fy = slit["slit_top"] - 1
    c.set(fx, fy, "q")
    c.set(fx - 1, fy, "q")
    c.set(fx + 1, fy, "q")
    c.set(fx, fy - 1, "O")                # bright apex boss
    c.set(fx, fy - 2, "o")                # short upward spike

    # --- GOLD APEX CUPOLA: a small built LANTERN seated ON the dome crown, RIGHT of the
    #     slit finial so the two read separately. A K plinth line seats it on the shell, a
    #     solid L/M/D mini-drum body with K sides, a bright q gold dome CAP + O boss, and a
    #     short antenna spike — real connected structure crowning the dome (not a glint).
    #     Anchored on the crown arc; guard the None return at the silhouette edge. ---
    cux = cx + 5                          # right of the slit crown, clear of the finial
    cuy_f = crown_y(cux - cx)             # crown silhouette y at that column (may be None)
    if cuy_f is not None:
        cuy = int(round(cuy_f))
        # K plinth line seating the cupola ON the dome shell (so it reads built-on)
        for dx in range(-2, 3):
            c.set(cux + dx, cuy, "K")
        # mini-drum body (2px tall, 5px wide): lit-left L, M, shaded-right D, K sides
        for dx in range(-2, 3):
            c.set(cux + dx, cuy - 1, "L" if dx <= -1 else ("M" if dx <= 0 else "D"))
            c.set(cux + dx, cuy - 2, "L" if dx <= -1 else ("M" if dx <= 1 else "D"))
        c.set(cux - 3, cuy - 1, "K"); c.set(cux + 3, cuy - 1, "K")   # body sides
        c.set(cux - 3, cuy - 2, "K"); c.set(cux + 3, cuy - 2, "K")
        # gold dome cap ring + bright boss crowning the little drum
        for dx in range(-2, 3):
            c.set(cux + dx, cuy - 3, "q")
        c.set(cux, cuy - 3, "O")                                     # bright gold boss
        c.set(cux - 3, cuy - 3, "r"); c.set(cux + 3, cuy - 3, "r")   # gold cap eaves
        # a short antenna spike + tip glint rising off the cupola cap
        c.set(cux, cuy - 4, "q")
        c.set(cux, cuy - 5, "O")                                     # tip glint

    # --- GOLD FEED-RIB CROWN on the RADIO-DISH pod: a tidy UPWARD fan of 3 short gold ribs
    #     rising off the TOP of the dish rim (the maxed multi-feed antenna crown). Recompute
    #     the dish centre/radii from the SAME `_uplink_anchor` t4 used, so the ribs sit
    #     exactly on the pod. Each rib starts ON the rim and rises ~2-3px up-and-out, tipped
    #     O — CONNECTED to the bowl (not free dots), and only over the UPPER mouth so it
    #     reads as a clean feed crown, never a downward spike. Clamp tips on-canvas. ---
    a = _uplink_anchor(drum_info)
    dcx, dcy, RXd, RYd = a["dcx"], a["dcy"], a["RXd"], a["RYd"]
    for deg in (-72, -45, -18):           # a tidy upward fan over the TOP of the bowl
        rad = math.radians(deg)
        rx0 = dcx + (RXd - 1) * math.cos(rad)
        ry0 = dcy + (RYd - 1) * math.sin(rad)
        rx1 = dcx + (RXd + 2) * math.cos(rad)
        ry1 = dcy + (RYd + 2) * math.sin(rad)
        rx1 = max(1, min(62, rx1)); ry1 = max(1, min(62, ry1))
        c.line((rx0, ry0), (rx1, ry1), "q")           # solid gold rib (rim -> tip)
        c.set(int(round(rx1)), int(round(ry1)), "O")  # bright rib tip
    # a small gold collar tying the rib bases together along the upper rim (so the ribs
    # read as one feed crown rooted on the bowl, not loose spikes)
    c.set(dcx, dcy - RYd + 1, "q")
    c.set(dcx - 1, dcy - RYd + 1, "q")
    c.set(dcx + 1, dcy - RYd + 1, "O")

    # --- THIN sparse HALO: a few bright E/e glints hugging ONLY the catalogued star
    #     (up-left) and the dish feed-horn (up-right) — the survey 'sharpens', with NO
    #     large free-floating arcs across the sky. Clamp on-canvas, sky pixels only. ---
    horn = (min(dcx + RXd, 62), dcy - 3)             # the dish feed-horn (== t4 focus)
    halo = [
        (5, 6, "E"), (4, 9, "e"),                    # 2 glints by the catalogued star
        (horn[0], horn[1] - 2, "E"),                 # 1 glint above the dish horn
        (min(horn[0] + 2, 62), horn[1], "e"),        # 1 glint up-right of the horn
    ]
    for (gx, gy, ch) in halo:
        if 0 <= gy < c.h and 0 <= gx < c.w and c.px[gy][gx] == ".":
            c.set(gx, gy, ch)


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the observatory at upgrade `stage` (1..5). Stage 1 is IDENTICAL to the
    shipped base; each higher stage keeps every prior addition and bolts on the next
    (t2 catwalk+finder -> t3 spectrograph wing -> t4 radio-dish mast -> t5 catalogue
    sweep + gold). The lone optical observatory grows into a multi-wavelength survey
    observatory, while the optical barrel + catalogued-star signature up-LEFT stays
    clear. Painter's order: base form (back-to-front) first, then the spectrograph wing
    (a ground mass) BEFORE the rooftop catwalk/finder so nearer instruments occlude
    correctly; the radio mast + sky sweep go on top of the open sky."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) — back-to-front painter's algorithm ---------
    di = drum(c)                       # 1) rotunda drum (backdrop wall)
    dome_geom = dome(di)
    slit = draw_dome(c, dome_geom)     # 2) hemispherical dome with open slit
    placard(c, di)                     # 2b) gold placard on the drum (over dome apron)
    sight = telescope(c, slit)         # 3) telescope barrel through the slit
    star_and_tag(c, sight)             # 4) catalogued star + ID tag + sky stars

    # --- CUMULATIVE UPGRADE STAGES --------------------------------------------------
    # ground/structural masses first (spectrograph wing), then dome-mounted catwalk /
    # finder, then the tall radio mast + the sky-filling catalogue sweep last.
    if stage >= 3:
        stage3_spectrograph(c, di, slit)
    if stage >= 2:
        stage2_catwalk_finder(c, di, dome_geom, slit)
    if stage >= 4:
        stage4_radio_dish(c, di, dome_geom)
    if stage >= 5:
        stage5_catalog_sweep(c, di, dome_geom, slit)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/axiom"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "observatory-dome"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped observatory-dome.png, so it does NOT overwrite the base."""
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": AXIOM, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    os.makedirs(SRC_DIR, exist_ok=True)
    src = os.path.join(SRC_DIR, f"axiom_{SLUG}{suffix}.json")
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        print("emitted base JSON (PNG untouched):", src)
        return
    import subprocess
    png = os.path.join(PNG_DIR, f"{SLUG}{suffix}.png")
    prev = os.path.join(PREVIEW_DIR, f"axiom_{SLUG}{suffix}.png")
    subprocess.run([sys.executable,
                    "/path/to/scienium/art/render_pixel_art.py",
                    src, "-o", png, "--preview", prev], check=True)
    print("built stage", stage, "->", png)


def build_all():
    for s in (1, 2, 3, 4, 5):
        emit(s)


if __name__ == "__main__":
    build_all()
