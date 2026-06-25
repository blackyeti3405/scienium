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

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import cylinder

# ── Axiom set palette (chars -> hex EXACTLY per blueprint) ────────────────────
AXIOM = {
    "K": "#0e1124",
    "W": "#dfe6f6", "L": "#b4bee0", "M": "#7c88b8", "D": "#4e5888", "d": "#333a60",
    "h": "#d6ecff", "c": "#aad8ff", "g": "#4a9ce6", "G": "#2060b0",
    "o": "#ffe27a", "O": "#fff3c0", "r": "#c89a2a",
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


# ── assemble + emit ──────────────────────────────────────────────────────────
def build():
    c = Canvas()
    # BACK-TO-FRONT (painter's algorithm):
    di = drum(c)                       # 1) rotunda drum (backdrop wall)
    dome_geom = dome(di)
    slit = draw_dome(c, dome_geom)     # 2) hemispherical dome with open slit
    placard(c, di)                     # 2b) gold placard on the drum (over dome apron)
    sight = telescope(c, slit)         # 3) telescope barrel through the slit
    star_and_tag(c, sight)             # 4) catalogued star + ID tag + sky stars

    spec = {"width": 64, "height": 64, "palette": AXIOM, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/axiom_observatory-dome.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
