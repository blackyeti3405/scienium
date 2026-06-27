#!/usr/bin/env python3
"""
Focus Group Chamber — MindFrame Lab economy building (BESPOKE form, STANDARD role).

The ROUND, SUNKEN, OPEN-TOP member of the set: a circular AMPHITHEATER DISCUSSION
PIT — an indigo `M`/`D` drum whose top is an OPEN OCULUS, looking 3/4 top-down DOWN
into a sunken ring of participant chairs around a low central table. The drum's
outward-facing band is a curved one-way MIRROR (silvered `c`/`h` panes with soft
sheen, reading as glass, NOT black bars). A clearly ROUND open-oculus silhouette,
unlike the square open Interview booth and unlike any boxy MindFrame sibling.

Composed from a BESPOKE open-top iso drum (custom ellipse/cap fills) + isobuild.Box
for the entry stub — NO iso.draw_cube / base_windows. The closed-top isobuild
cylinder() is deliberately not used: this drum must be OPEN at the top (an oculus),
so the top ellipse is left as a sunken pit, not a solid cap.

Draw order: contact shadow -> round drum wall (outer mirror band + open rim) ->
sunken pit interior (floor, ring of seats, central table) -> the entry stub ->
SIGNATURE (a speech-bubble rising off each seat, all merging upward into a hovering
magenta THEME / WORD-cloud with K-framed o/O theme tags) above the open oculus.

Signature (one-of-one): MANY glowing speech-bubbles, one lifting off each ringed
seat, converging up into a single hovering magenta WORD-CLOUD of tagged theme-chips
above the table — the emergent themes being identified. (The Interview Room shows
ONE bubble between TWO people; this is a GROUP's bubbles coalescing into a word
cloud — qualitatively different and unlike any chart/ring/trace in the catalog.)

OPENING SIDE: OPEN — the hero plays in the open oculus pit, ringed by the curved
one-way mirror band + an `o` magenta rim glow.
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder  # cylinder imported per spec; drum is bespoke open-top

MIND = {"K": "#181428", "W": "#e8e2f6", "L": "#cabfe6", "M": "#9f90c8", "D": "#6f5fa0", "d": "#4a3c70",
        "h": "#ecc8f4", "c": "#d0a8ee", "g": "#a45ce0", "G": "#6a2fb0",
        "o": "#f08cce", "O": "#ffb8e2", "r": "#b03a80"}


# ── drum geometry: a wide round amphitheater drum, open at the top ────────────
CX = 32            # drum centre x
TOP_Y = 30         # y of the OPEN top ellipse centre (oculus rim) — low so headroom is reserved
RX = 14            # drum outer horizontal radius (wide round mass)
RY = 7             # drum outer vertical radius (2:1 ellipse)
WALL_H = 13        # drum wall height (sunken pit depth + wall)
BASE_Y = TOP_Y + WALL_H


def _stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings) at top-left (x0,y0).
    '.' = skip (transparent)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


def ellipse_pts(cx, cy, rx, ry, a0=0, a1=360, step=4):
    """Iso ellipse rim points (for outlines / glows)."""
    pts = []
    a = a0
    while a <= a1:
        pts.append((cx + rx * math.cos(math.radians(a)),
                    cy + ry * math.sin(math.radians(a))))
        a += step
    return pts


# ── contact shadow under the round footprint (drawn FIRST) ────────────────────
def contact_shadow(c):
    scx, scy = CX, BASE_Y + 2
    for x in range(scx - RX - 2, scx + RX + 3):
        for y in range(scy - 2, scy + 4):
            ex = (x - scx) / (RX + 2.0)
            ey = (y - scy) / 2.6
            if ex * ex + ey * ey <= 1:
                c.set(x, y, "K")


# ── the round DRUM: outer mirror-band wall + an OPEN oculus rim ───────────────
def drum(c):
    """Bespoke open-top iso drum. The outward-facing curved wall is an indigo
    `M`/`D` mass carrying a curved run of one-way MIRROR panes (silvered c/h with
    sheen); the TOP ellipse is left OPEN as an oculus (no solid cap), ringed by a
    thin `o` magenta light-strip + a `K` rim. Returns nothing; pit drawn next."""
    # --- outer wall: vertical extrusion of the front arc of the ellipse ---
    # For each x column across the drum, the wall runs from the front-arc of the
    # top ellipse down WALL_H px. Lit-left (M) -> shaded-right (D) round shading.
    for col in range(-RX, RX + 1):
        t = 1 - (col / RX) ** 2
        if t < 0:
            continue
        edge = RY * (t ** 0.5)          # front arc y-offset at this column
        x = CX + col
        # curved bright->dark steel-violet ramp across the round wall
        if col <= -RX + 2:
            ch = "L"                    # bright lit rim
        elif col <= -2:
            ch = "M"
        elif col <= 2:
            ch = "M"
        elif col <= 6:
            ch = "D"
        else:
            ch = "d"                    # deep shaded far-right
        for y in range(int(TOP_Y + edge), BASE_Y + 1):
            c.set(x, y, ch)

    # --- CURVED ONE-WAY MIRROR band wrapping the outer wall ---
    # A bright continuous silvered band across the mid-wall reading as GLASS: a
    # sky-reflection gradient (bright h/c sheen high, silvered c body, G sill low)
    # held EVEN across the whole ring so both lit AND shaded sides read as mirror
    # (not dark wall). Thin K seams between a few wide panes segment it softly.
    band_top = 3                        # px below the rim arc
    band_h = 5                          # mirror band height
    for col in range(-RX + 1, RX):
        t = 1 - (col / RX) ** 2
        if t < 0:
            continue
        edge = RY * (t ** 0.5)
        x = CX + col
        right = col >= 5                # shaded-right half: one step dimmer
        for k in range(band_h):
            y = int(TOP_Y + edge) + band_top + k
            if k == 0:
                base = "h"              # bright sky-band at the top
            elif k >= band_h - 1:
                base = "g"              # shadowed sill at the bottom
            else:
                base = "c"              # silvered glass body
            if right:                   # keep the shaded side READING AS GLASS, just dimmer
                base = {"h": "c", "c": "c", "g": "G"}[base]
            c.set(x, y, base)
    # two diagonal SHEEN STREAKS sweeping across the lit-left panes (the glass
    # tell) — long, soft W/h diagonals reading as reflected light on curved glass.
    for streak, (x0, tone) in enumerate([(CX - RX + 4, "W"), (CX - RX + 8, "h")]):
        for k in range(4):
            sx = x0 + k
            t = 1 - ((sx - CX) / RX) ** 2
            if t < 0:
                continue
            edge = RY * (t ** 0.5)
            c.set(sx, int(TOP_Y + edge) + band_top + 1 + k, tone)
    # a faint interior O glow leaking up the SHADED-right of the mirror
    for sx in range(CX + 6, CX + RX - 1):
        t = 1 - ((sx - CX) / RX) ** 2
        edge = RY * (t ** 0.5) if t > 0 else 0
        c.set(sx, int(TOP_Y + edge) + band_top + 1, "O")
    # NO interior K seams: the curved one-way mirror reads as ONE continuous
    # silvered glass band (sheen, not bars). K is reserved for the band edges only.

    # --- OPEN OCULUS rim: outline the top ellipse + an o magenta light-strip ---
    # outer rim outline (full ellipse, K)
    for px, py in ellipse_pts(CX, TOP_Y, RX, RY, step=4):
        c.set(px, py, "K")
    # o magenta light-strip just inside the rim (the accent ring washing the pit)
    for px, py in ellipse_pts(CX, TOP_Y, RX - 1, RY - 1, step=5):
        c.set(px, py, "o")
    # left vertical wall outline + right vertical wall outline + front base arc
    c.line((CX - RX, TOP_Y), (CX - RX, BASE_Y), "K")
    c.line((CX + RX, TOP_Y), (CX + RX, BASE_Y), "K")
    for px, py in ellipse_pts(CX, BASE_Y, RX, RY, a0=0, a1=180, step=4):
        c.set(px, py, "K")


# ── the SUNKEN PIT: inner floor, ring of seats, central table ─────────────────
def pit(c):
    """Looking DOWN through the open oculus into the sunken amphitheater pit: a
    recessed `d`/`D` floor, a RING of small distinct participant chairs around the
    rim, and a low central `M` table. The seats must read as multiple separate
    seats (not a blob); the o oculus glow lights them so the 'group' read is
    immediate."""
    irx, iry = RX - 2, RY - 1           # inner pit (oculus opening) radius — wide
    pit_cy = TOP_Y + 1                  # pit floor sits a touch lower (sunken)

    # sunken FLOOR — a clean recessed deck. A flat mid-tone d so BOTH the bright
    # chairs AND the central table read clearly against it; a darker shadow crescent
    # along the back-far arc + far-right inner wall for a concave sunken read.
    for yy in range(-iry, iry + 1):
        tt = 1 - (yy / iry) ** 2
        if tt < 0:
            continue
        half = irx * (tt ** 0.5)
        for xx in range(int(-half), int(half) + 1):
            x, y = CX + xx, pit_cy + yy
            if yy <= -iry + 1 or (xx >= half - 1.5 and xx > 2):
                ch = "K"                # deep shadow at the back lip + far-right wall
            else:
                ch = "d"                # flat deck floor (dark, so chairs pop)
            c.set(x, y, ch)

    # inner rim outline (the lip down into the pit) — K with an o accent over it
    for px, py in ellipse_pts(CX, pit_cy, irx, iry, step=3):
        c.set(px, py, "K")
    for px, py in ellipse_pts(CX, pit_cy, irx - 1, iry, a0=200, a1=340, step=8):
        c.set(px, py, "o")              # warm rim glow on the back lip

    # FULL RING OF SEATS: 8 chairs evenly spaced ALL THE WAY AROUND the pit so the
    # ring reads as a complete CIRCLE (not two side benches). Back-arc seats are
    # smaller + dimmer (in shadow), side/front seats brighter — high contrast
    # against the dark deck so they read as separate participants. Drawn
    # back-to-front; the central table is layered between the back and front arcs.
    seat_r_x, seat_r_y = irx - 1.0, iry - 0.2
    seats = []
    for i in range(8):
        a = 90 + i * 45                 # 8 seats, start at back, around the ring
        sx = CX + seat_r_x * math.cos(math.radians(a))
        sy = pit_cy + seat_r_y * math.sin(math.radians(a))
        seats.append((sx, sy, a))
    seats.sort(key=lambda s: s[1])      # back seats first

    def draw_seat(sx, sy, a):
        ix, iy = int(round(sx)), int(round(sy))
        back = sy <= pit_cy             # back-arc seats sit in shadow
        # a couple of seats are backlit warm o by the oculus glow so the group reads
        warm = a in (90, 45, 135)
        if back:
            # smaller dim chair in shadow across the BACK arc — completes the ring.
            # Kept compact (no wide K frame) so the back seats read as a clean row
            # of occupied chairs, not dark blobs.
            head = "o" if warm else "M"
            _stamp(c, ix - 1, iy - 1, [
                "LML",    # dim chair-back / shoulders (occupied, in shadow)
            ])
            c.set(ix, iy - 2, "K")      # dark seated head crown
            c.set(ix, iy - 1, head)     # head
        else:
            # brighter near chair-back with a clear K edge + a dark seated head
            head = "o" if warm else "M"
            _stamp(c, ix - 1, iy - 2, [
                "LWL",    # bright chair-back / shoulders (the distinct seat)
                "MhM",    # seat cushion
            ])
            c.set(ix, iy - 3, "K")      # dark seated head crown
            c.set(ix, iy - 2, head)     # head (some backlit warm)
            c.set(ix - 2, iy - 1, "K")  # K edge framing the chair left
            c.set(ix + 2, iy - 1, "K")  # K edge framing the chair right

    # back half of the ring (behind the table)
    for sx, sy, a in seats:
        if sy <= pit_cy:
            draw_seat(sx, sy, a)

    # central low ROUND TABLE — a small bright table, clearly between the seats,
    # with a soft o glow disc on it (the focus of the discussion). One hotter O at
    # the very centre strengthens the "group gathered around a table" focal point.
    _stamp(c, CX - 2, pit_cy + 1, [
        "KooK",
        "oOOo",
        "KOOK",
    ])
    c.set(CX, pit_cy + 2, "O")          # brighter table-centre core

    # front half of the ring (in front of the table, overpaints)
    for sx, sy, a in seats:
        if sy > pit_cy:
            draw_seat(sx, sy, a)
    return pit_cy


# ── ENTRY STUB: a tiny low door-stub abutting the FRONT of the drum ───────────
def entry_stub(c):
    """A tiny low Box door-stub at the front of the drum — M/D indigo with a
    K-framed entry — anchoring the round mass on the plot. Drawn after the drum so
    it sits in FRONT of the wall."""
    stub = Box(top=(CX - 2, BASE_Y - 6), wx=4, wy=3, h=8)
    stub.draw(c, roof="L", lwall="M", rwall="D", roof_hi="W", outline="K")
    # K-framed glowing entry on the lit-left face — a deeper d shade in the door
    # recess gives the opening a hair more contrast where it meets the busy bottom
    # oculus rim, so the doorway reads crisply (round-1 polish note).
    stub.window(c, "left", 0.22, 0.74, 2.0, 6.4, glass="g", hi="h", shade="d",
                frame="K", mullions=1, sheen="W")
    # warm o threshold spill at the foot
    base = stub.left_pt(0.5, 8.2)
    bx, by = int(round(base[0])), int(round(base[1]))
    for dx in range(-2, 3):
        c.set(bx + dx, by, "o" if abs(dx) < 2 else "r")


# ── SIGNATURE: rising speech-bubbles merging into a hovering THEME word-cloud ──
def _bubble(c, bx, by, body, tail_dir, sheen=True):
    """Draw ONE small SHAPED speech-bubble centred near (bx,by): a K-outlined
    rounded c/h blob with a soft sheen and (optionally) a tiny pointing tail.
    tail_dir: -1 tail bottom-left, +1 tail bottom-right, 0 no tail."""
    # 4-wide rounded bubble: K outline framing a c/h body with an O/h sheen dot.
    _stamp(c, bx - 1, by - 1, [
        ".KK.",     # rounded top
        f"K{body}{body}K",  # body row 1
        f"K{body}hK",  # body row 2 with sheen
        ".KK.",     # rounded bottom
    ])
    if sheen:
        c.set(bx - 1 + 1, by - 1 + 1, "O")   # hot sheen highlight (top-left of body)
    # tiny tail pointing back down toward the seat it lifts off
    if tail_dir < 0:
        c.set(bx - 1, by + 3, "K")
        c.set(bx, by + 3, body)
    elif tail_dir > 0:
        c.set(bx + 2, by + 3, "K")
        c.set(bx + 1, by + 3, body)


def speech_bubbles(c, pit_cy):
    """From each ringed seat a small SHAPED speech-bubble lifts off and the bubbles
    converge UP toward the hovering word-cloud — the group's voices merging into
    themes. 5 legible K-framed bubbles staggered in height, each anchored above a
    ring seat, two carrying a little tail, all angling inward/upward and getting
    smaller/fainter as they near the merge point (so they read as MERGING)."""
    cloud_cx = CX
    # The CLEAR AIRSPACE for rising bubbles is the gap BETWEEN the open oculus rim
    # (top of pit ~ row 23) and the bottom of the hovering cloud (~ row 16). Five
    # bubbles staggered up that gap: splayed left/right low (just above the rim),
    # converging to centre as they climb, the top one near-merged into the cloud —
    # so they read as distinct SHAPED bubbles RISING and MERGING (not piled in the
    # pit). dx,by are absolute; tail direction nods back down toward a ring seat.
    specs = [
        (-7, 23, "c",  1),   # low far-left bubble just above the rim, tail right
        (6,  22, "h", -1),   # low far-right bubble, tail left
        (-3, 20, "c",  1),   # mid-left bubble rising inward
        (3,  19, "h", -1),   # mid-right bubble rising inward
        (0,  17, "c",  0),   # high centre bubble, almost merged into the cloud
    ]
    for dx, by, body, tail in specs:
        bx = cloud_cx + dx
        f = 0.7 if by <= 17 else 0.0         # flag the near-merged top bubble
        # the highest bubble is nearly absorbed → draw it smaller (no tail, dimmer)
        if f >= 0.7:
            _stamp(c, bx - 1, by, [".KK.", f"K{body}K", ".KK."])
            c.set(bx, by + 1, "h")
        else:
            _bubble(c, bx, by, body, tail)


def theme_cloud(c):
    """The hero: a hovering magenta WORD-CLOUD above the open oculus — a soft o/O
    cloud halo holding 4-5 W/h theme word-chips at varying sizes (bigger = more
    frequent), with 1-2 K-framed o/O THEME TAGS (a c checkmark) pinned to the
    biggest chips = the themes identified. The bubbles merge up into this."""
    ccx, ccy = CX, TOP_Y - 19           # cloud centre, high with headroom

    # --- soft o/O cloud HALO (rounded blob cluster, the merged glow) ---
    halo = [
        (-7, 1), (-5, -1), (-2, -2), (1, -2), (4, -1), (7, 0), (8, 2),
        (5, 3), (1, 4), (-3, 4), (-6, 3), (-8, 2),
    ]
    for dx, dy in halo:
        c.set(ccx + dx, ccy + dy, "o")
    # fill the cloud interior softly with o, brighter O core
    for yy in range(-3, 5):
        for xx in range(-7, 9):
            if (xx / 8.0) ** 2 + (yy / 4.2) ** 2 <= 1.0:
                cur = c.px[max(0, min(63, ccy + yy))][max(0, min(63, ccx + xx))]
                if cur in (".",):
                    c.set(ccx + xx, ccy + yy, "o")
    # brighter O glow pooled at the BOTTOM of the cloud (where bubbles merge in),
    # kept clear of the word-chips above so the chips stay crisp.
    for xx in range(-4, 4):
        c.set(ccx + xx, ccy + 3, "O")
    for xx in range(-2, 2):
        c.set(ccx + xx, ccy + 4, "O")

    # --- WORD-CHIPS: 5 short theme bars at varying sizes, each on its own row so
    # they read as DISTINCT tagged words (bigger = more frequent), with a dark G
    # seam under each so they pop off the magenta cloud. ---
    chips = [
        (-6, -2, 4, "W"),   # big top-left chip (frequent)
        (1, -2, 4, "W"),    # big top-right chip (frequent)
        (-5, 0, 3, "h"),    # medium left
        (0, 0, 5, "h"),     # biggest, centre word
        (-2, 2, 3, "L"),    # smaller, lower
    ]
    for dx, dy, w, fill in chips:
        for k in range(w):
            c.set(ccx + dx + k, ccy + dy, fill)
        c.set(ccx + dx - 1, ccy + dy, "G")          # dark left cap
        c.set(ccx + dx + w, ccy + dy, "G")          # dark right cap (word ends)

    # --- THEME TAGS: 2 K-framed o/O tag labels with a c checkmark pinned to the
    # biggest chips = the themes named/identified. ---
    # tag pinned to the centre word-chip (the biggest theme)
    _stamp(c, ccx + 6, ccy - 1, [
        "KKKK",
        "KoOK",   # o/O tag label
        "KcOK",   # c checkmark inside (theme named)
        "KKKK",
    ])
    c.set(ccx + 7, ccy + 1, "c")      # checkmark stroke
    c.set(ccx + 6, ccy, "o")          # pin from chip to tag
    # second smaller tag pinned to the top chip
    _stamp(c, ccx - 9, ccy - 3, [
        "KKK",
        "KOK",
        "KcK",
        "KKK",
    ])

    # --- faint o sparkle blips around the cloud (the themes "emerging") ---
    # (the lone topmost (0,-5) blip removed for tidiness — it sat isolated above
    # the whole piece reading as a stray pixel rather than part of the cloud.)
    for dx, dy in [(-9, -2), (9, -3), (10, 3), (-10, 4)]:
        c.set(ccx + dx, ccy + dy, "h" if (dx + dy) % 2 else "o")


def build():
    c = Canvas()
    # painter's order: shadow -> round drum wall (mirror band + open rim) -> sunken
    # pit (floor, seats, table) -> entry stub (front) -> rising bubbles -> hovering
    # theme word-cloud signature high above the open oculus.
    contact_shadow(c)
    drum(c)
    pit_cy = pit(c)
    entry_stub(c)
    speech_bubbles(c, pit_cy)
    theme_cloud(c)

    spec = {"width": 64, "height": 64, "palette": MIND, "rows": c.rows()}
    out = "/path/to/scienium/art/src/buildings/mindframe_focus-group-chamber.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
