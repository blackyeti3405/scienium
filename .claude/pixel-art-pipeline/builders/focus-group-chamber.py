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

═══════════════════════════════════════════════════════════════════════════════════
UPGRADE-EVOLUTION pass (cumulative t2..t5, code pattern copied from workshop.py /
interview-room.py). MindFrame evolution language: the calm INDIGO discussion pit
grows into a fully INSTRUMENTED, OBSERVED, voice-captured focus suite. The signature
(the rising bubbles merging into a hovering magenta theme word-cloud) lives HIGH
above the oculus, so every addition grows OUT (a booth annex wrapping the back arc)
or sits LOW in the pit-opening airspace (mic booms, a capture pod over the table) so
it never occludes that high word-cloud — until t5, where the word-cloud itself BLOOMS
into the crowning live sentiment-cloud array. The lab's magenta `o/O` stays the
HUMAN/voice accent; the evolved capture glow is a cool SIGNAL-CYAN `e/E` (data) so the
two never blur. Colours mature stage by stage; gold (`q`) is a t5 flourish only.

  t2  small functional add : an extra mic-BOOM over the table + one more seated
                             participant on the front ring + a brighter o banner glow
  t3  structural add       : a curved OBSERVATION-BOOTH annex wrapping the back arc
                             (a one-way-glass screen on b posts — the group is observed)
  t4  major add            : a suspended RING OF ARRAY-MICS + a central CAPTURE POD
                             lowering over the table on a b gantry, glowing cyan
  t5  crowning feature     : the banner blooms into a live SENTIMENT-CLOUD array (E
                             discussion threads + a consensus node), gold table-ring rim
"""
import os
import sys
import json
import math

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder  # cylinder imported per spec; drum is bespoke open-top

# Base MindFrame palette (shared keys) + the EVOLVED accent shades reserved for the
# upgrade stages only (they never appear in stage 1, so focus-group-chamber.png is
# unchanged). These exact evolved keys are shared across all 10 mindframe buildings:
#   b  deep indigo steel — matured structure tone for the booth annex / gantry / pod
#   e  energized signal-cyan glow (mid)   E  signal-cyan glow (bright) — t4/t5 capture
#   q  premium gold trim — t5 flourish only (NOT a whole-building recolor)
MIND = {"K": "#181428", "W": "#e8e2f6", "L": "#cabfe6", "M": "#9f90c8", "D": "#6f5fa0", "d": "#4a3c70",
        "h": "#ecc8f4", "c": "#d0a8ee", "g": "#a45ce0", "G": "#6a2fb0",
        "o": "#f08cce", "O": "#ffb8e2", "r": "#b03a80",
        "b": "#2b2440", "e": "#7fd4ff", "E": "#d6f4ff", "q": "#f3c63a"}


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


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS capture/
# observation structure onto the prior form — never restarts, never recolors the
# whole building. Theme: the discussion pit grows into a fully instrumented, observed
# focus-suite. Additions grow OUT (a back-arc booth annex) or sit LOW in the pit-
# opening airspace (mic booms, a capture pod over the table) so the high magenta
# theme word-cloud signature is never occluded — until t5, where that cloud itself
# blooms into the crowning sentiment array. The lab's magenta o/O stays the human
# accent; the evolved capture glow is cool signal-cyan e/E. Gold (q) only at t5.
#
# Shared anchors (the plot centre, reused by every stage):
#   CX=32 drum centre x · TOP_Y=30 oculus rim · RX=14/RY=7 drum radii · BASE_Y=43
#   pit floor centre  PIT_CY = TOP_Y + 1 = 31 ; table sits CX, PIT_CY+1..+3 (~r32-34)
# ═══════════════════════════════════════════════════════════════════════════════
PIT_CY = TOP_Y + 1                    # pit floor centre (matches pit())


def _rim_pt(cx, cy, rx, ry, ang_deg):
    """One point on an iso ellipse rim at angle ang_deg (deg). Used to anchor
    additions ON the oculus rim / pit ring from the SAME source the base uses."""
    return (cx + rx * math.cos(math.radians(ang_deg)),
            cy + ry * math.sin(math.radians(ang_deg)))


def stage2_boom_and_seat(c):
    """t2 — SMALL FUNCTIONAL ADD (on-theme: more voice capture). A slim MICROPHONE
    BOOM leans IN over the central table from the front-right oculus rim — a thin M
    arm on a tiny K stand with a small o/c mic capsule hanging just over the table —
    plus ONE MORE seated `d` participant filling a gap on the FRONT ring, and a
    brighter o pip lifting the moderation banner. Modest, base palette + one o accent.
    Sits LOW (at the rim / in the pit opening), well clear of the high word-cloud."""
    # --- extra seated participant: drop a compact bright figure onto the FRONT-RIGHT
    #     ring at ~ -42deg, pulled INBOARD off the rim into a clear gap so it reads as a
    #     distinct NEW chair (not fused with the existing right-back seat). Built BOLD
    #     (bright L/W back + clear K frame + warm o head) so it pops off the dark deck. ---
    sx, sy = _rim_pt(CX, PIT_CY, RX - 5.0, RY - 1.6, -42)
    ix, iy = int(round(sx)), int(round(sy))
    _stamp(c, ix - 1, iy - 2, [
        "LWL",     # bright chair-back / shoulders (a distinct new seat)
        "MhM",     # seat cushion
    ])
    c.set(ix, iy - 3, "K")             # dark seated head crown
    c.set(ix, iy - 2, "o")             # head, backlit warm by the oculus glow
    c.set(ix - 2, iy - 1, "K")         # K edge framing the chair left
    c.set(ix + 2, iy - 1, "K")         # K edge framing the chair right

    # --- MICROPHONE BOOM: a clear boom rising off the front-right oculus rim and
    #     reaching UP-and-IN to hang a MIC HEAD in the OPEN pit air over the table (the
    #     first capture instrument). A 2px-defined diagonal arm (lit M edge + K spine) +
    #     a bold 2px-wide K-shell o/O capsule read as one clean boom silhouette against
    #     the dark deck, not buried in it. Anchored on the rim (~ -22deg), mic head over
    #     the table at ~(CX+2, PIT_CY-2). ---
    bx, by = _rim_pt(CX, TOP_Y, RX - 1.5, RY - 0.4, -22)    # base on the front-right rim
    bx, by = int(round(bx)), int(round(by))
    c.set(bx, by, "K")                 # foot on the rim
    c.line((bx, by), (bx, by - 4), "M")                     # lit stand pillar
    c.line((bx + 1, by - 1), (bx + 1, by - 4), "K")         # K shaded edge → pillar reads solid
    c.set(bx, by - 4, "L")             # lit pillar cap (boom pivot)
    # diagonal arm sweeping up-left to the mic head over the table (2px: M top + K spine)
    headx, heady = CX + 2, PIT_CY - 2  # mic head, hanging clear over the table
    c.line((bx, by - 4), (headx, heady - 1), "M")          # lit arm top edge
    c.line((bx, by - 3), (headx, heady), "K")              # K arm under-spine (reads solid)
    # MIC HEAD: a bold 2px-wide K-framed capsule with a hot o/O body + cyan live tip
    _stamp(c, headx - 1, heady, [
        "KK",      # capsule shell top
        "oO",      # hot magenta live capsule body
        "cc",      # cyan live tip (recording)
    ])

    # --- brighter o glow lifting the moderation banner (the discussion is hotter): an
    #     extra O/o spark band at the BOTTOM of the hovering cloud where bubbles merge
    #     in, plus one fresh o sparkle blip off its right edge (kept clear of the chips
    #     above so the cloud stays crisp). ---
    ccx, ccy = CX, TOP_Y - 19
    c.set(ccx + 3, ccy + 4, "O"); c.set(ccx - 3, ccy + 4, "O")
    c.set(ccx + 2, ccy + 5, "o"); c.set(ccx - 2, ccy + 5, "o")
    c.set(ccx + 8, ccy + 1, "o")       # one fresh emerging-theme sparkle


def stage3_observation_booth(c):
    """t3 — STRUCTURAL ADD: a curved OBSERVATION-BOOTH annex wrapping the BACK arc of
    the drum — a low one-way-GLASS screen held up on a row of `b` deep-indigo posts,
    following the back rim of the oculus so a ring of observers now stands BEHIND the
    pit looking in. A real new structural element (posts + a curved glazed screen, not
    a prop), grown OUT from the back of the existing drum. Introduces the matured deep-
    indigo `b` tone on the post frame; the glass is the lab's c/h one-way-mirror tone so
    it matches the drum's own mirror band. Sits on the BACK arc (behind + below the high
    word-cloud), so it never occludes the signature."""
    # The booth screen follows the BACK arc of the oculus OUTER rim (angles ~200..340deg
    # = the far/back lip, cols ~20..44 at rows ~24-26), lifted CLEARLY above the rim so
    # it reads as a tall standing screen behind + above the back seat-ring (which sits at
    # the rim, rows 24-26). The side posts rise into clear air (cols ~20-24 / ~40-44) so
    # the screen never mushes into the busy pit. Posts drop from the screen to the rim.
    screen_lift = 6                    # px the screen top stands above the rim (was 4 → too low)
    posts = []
    for ang in (208, 230, 256, 284, 310, 332):   # 6 posts spanning the back arc
        rxp, ryp = _rim_pt(CX, TOP_Y, RX, RY, ang)            # OUTER rim (behind the seats)
        px, ry_base = int(round(rxp)), int(round(ryp))
        ptop = max(ry_base - screen_lift, 1)
        posts.append((px, ptop, ry_base))

    # 1) glazed SCREEN PANES first (so the posts overdraw their edges crisply): for each
    #    adjacent post pair, fill a SOLID curved one-way-glass panel between their tops.
    #    A clean c body with a bright h sky-band top edge + a darker G sill low — the same
    #    one-way-mirror read as the drum band, so observers clearly ring it. Filled solid
    #    (not speckle) so it reads as a glazed wall, not noise.
    for (x0, t0, b0), (x1, t1, b1) in zip(posts, posts[1:]):
        span = max(abs(x1 - x0), 1)
        for k in range(span + 1):
            tt = k / span
            x = int(round(x0 + tt * (x1 - x0)))
            ytop = int(round(t0 + tt * (t1 - t0)))
            ybot = int(round(b0 + tt * (b1 - b0))) - 1        # stop 1px above the rim foot
            for y in range(ytop, ybot + 1):
                if y == ytop:
                    ch = "h"           # bright sky-band top edge of the glass
                elif y >= ybot:
                    ch = "G"           # shadowed sill at the bottom of the pane
                else:
                    ch = "c"           # silvered one-way-glass body
                c.set(x, y, ch)
    # two soft W sheen streaks sweeping across the lit-left panes (the glass tell)
    for (sx, st, _sb) in posts[:3]:
        c.set(sx + 1, st + 2, "W")

    # 2) deep-indigo `b` POSTS over the panes (the booth frame), each 2px-ish wide with a
    #    K base foot seated on the rim + a tiny L lit cap — a clearly BUILT screen-wall.
    for px, ptop, ry_base in posts:
        c.line((px, ptop), (px, ry_base), "b")
        c.line((px + 1, ptop + 1), (px + 1, ry_base - 1), "D")   # shaded inner edge → reads solid
        c.set(px, ptop, "L")           # lit post cap
        c.set(px, ry_base, "K")        # K foot seated on the back rim
    # a continuous K top rail tying the post caps together (reads as one screen header)
    for (x0, t0, _), (x1, t1, _) in zip(posts, posts[1:]):
        c.line((x0, t0 - 1), (x1, t1 - 1), "K")
    return posts


def stage4_micring_and_pod(c, posts):
    """t4 — MAJOR ADD: a tall CAPTURE GANTRY now STRADDLES the whole oculus. Two deep-
    indigo `b` lattice LEGS rise out of the empty side-moats (off the front-left + front-
    right rim) to a HEADER BEAM arching across HIGH above the pit; from it a suspended
    RING OF ARRAY-MICS hangs down each side and a central CAPTURE POD lowers on a cable
    over the table, glowing energized cyan `e/E` as it records every voice.

    Why a full portal (not the old rim-hugging beam): the round amphitheater drum + the
    t3 observation booth FILL the whole oculus opening, so any beam/pod drawn DOWN INSIDE
    it only recolours the dark pit (the r1 fail: +0 new opaque px). The legs + header are
    therefore routed UP through the two EMPTY side-moats (cols ~19 / ~46) to a beam that
    clears the dark mass — and the cloud above — entirely, so the gantry is a genuinely
    NEW prominent overhead MASS that breaks the silhouette (~140 new-opaque px) instead
    of lighting up the interior. The beam sits ABOVE the high theme word-cloud's top, and
    its legs climb in the clear moats FLANKING the cloud, so the signature is never
    occluded; the central pod's cable runs BEHIND the cloud (the cloud, painted last,
    occludes the mid-span) and the pod re-emerges below it over the table. Palette matures
    to the deep `b` gantry/pod shell + energized `e/E` capture glow."""
    # ---- anchors (recomputed from the SAME rim source the base/t3 use, so it stays
    #      cumulative): the legs FOOT on the near (front) oculus rim left+right; the empty
    #      moats above those feet (cols 19 / 46) are clear up past the cloud → the beam can
    #      arch over. Leg uprights sit just OUTBOARD of the booth shoulders.
    lfx, lfy = _rim_pt(CX, TOP_Y, RX, RY, 200)               # front-left rim foot
    rfx, rfy = _rim_pt(CX, TOP_Y, RX, RY, 340)               # front-right rim foot
    L_x = 19                                                 # left upright (empty moat col)
    R_x = 46                                                 # right upright (empty moat col)
    foot_y = int(round(max(lfy, rfy)))                       # legs seat on the near rim (~28)
    beam_y = 7                                               # header beam row — ABOVE the cloud top (row 8)

    # ---- LEFT + RIGHT lattice LEGS: a bold deep-indigo `b` upright with a shaded `D`
    #      inner edge (only in the empty upper moat, so it never overpaints the booth) +
    #      a few `b` X-brace ticks = a clearly BUILT lattice leg, lit `L` cap, `K` foot.
    for yy in range(beam_y, foot_y + 1):
        c.set(L_x, yy, "b")
        if yy < 20:                                          # inner shaded edge only where the moat is empty
            c.set(L_x + 1, yy, "D")
    c.set(L_x, beam_y, "L"); c.set(L_x, foot_y, "K")
    for yy in range(beam_y, foot_y + 1):
        c.set(R_x, yy, "b")
        if yy < 22:
            c.set(R_x - 1, yy, "D")
    c.set(R_x, beam_y, "L"); c.set(R_x, foot_y, "K")
    for yy in range(beam_y + 3, 19, 5):                      # left leg lattice X-ticks
        c.set(L_x + 1, yy, "b")
    for yy in range(beam_y + 3, 21, 5):                      # right leg lattice X-ticks
        c.set(R_x - 1, yy, "b")

    # ---- HEADER BEAM arching across the top (row 7), 2px: lit `D` top chord over the `b`
    #      body, `K` end caps seating on the leg tops + a small lit `L` boss at the crown.
    c.line((L_x, beam_y - 1), (R_x, beam_y - 1), "D")        # lit top chord (row 6)
    c.line((L_x, beam_y), (R_x, beam_y), "b")               # beam body (row 7)
    c.set(L_x, beam_y - 1, "K"); c.set(R_x, beam_y - 1, "K")
    c.set(CX, beam_y - 2, "L")                              # lit boss at the beam crown
    # CORNER GUSSETS: a short diagonal `b` brace tying each leg-top to the beam, so the
    # frame reads as a BUILT gantry carrying a rig (not a bare four-poster). K under-edge.
    c.set(L_x + 1, beam_y + 1, "b"); c.set(L_x + 2, beam_y + 1, "b"); c.set(L_x + 1, beam_y + 2, "K")
    c.set(R_x - 1, beam_y + 1, "b"); c.set(R_x - 2, beam_y + 1, "b"); c.set(R_x - 1, beam_y + 2, "K")
    # CROSSHEAD at the beam centre — a small `D`/`K` trolley block the pod cable runs from,
    # so the central pod clearly HANGS off the gantry beam (not a free-floating cable).
    _stamp(c, CX - 1, beam_y + 1, [
        "DDD",     # lit trolley top
        "KbK",     # block body the cable threads through
    ])

    # ---- ARRAY-MICS hanging from the beam down each SIDE: FOUR cyan capsules on short
    #      `K` droppers, a staggered PAIR per side, suspended in the CLEAR side-moat air
    #      just inboard of the legs (cols ~21 / ~44) so they hang OVER the pit's outer ring
    #      without the high word-cloud overdrawing them. Each = a `K` dropper + a 2px `e`
    #      capsule body + a bright `E` live tip → reads as a built mic array (FEW, clean).
    for mxp, drop in [(L_x + 2, 2), (L_x + 3, 4), (R_x - 2, 2), (R_x - 3, 4)]:
        ty = beam_y + drop
        c.set(mxp, beam_y + 1, "K")                         # dropper hangs from the beam
        c.line((mxp, beam_y + 1), (mxp, ty), "K")
        c.set(mxp, ty + 1, "e")                             # cyan array-mic capsule body
        c.set(mxp, ty + 2, "E")                             # bright live (recording) tip

    # ---- CENTRAL CAPTURE POD lowering on a cable from the beam centre down over the
    #      table: a BOLD K-framed `b`/`D` pod shell (4-wide) with a bright cyan recording
    #      band + a focused capture beam, hovering just above the table (~PIT_CY-1). The
    #      cable runs from the beam crown down BEHIND the cloud (the cloud, painted after,
    #      hides the mid-span) and the pod re-emerges in the clear lower pit-opening.
    podx, pody = CX, PIT_CY - 1
    c.line((CX, beam_y + 1), (podx, pody - 3), "K")         # suspension cable (mid-span hidden by the cloud)
    _stamp(c, podx - 2, pody - 2, [
        ".KK.",
        "KbbK",    # deep-indigo pod crown
        "KbDK",    # pod body (lit-left b / shaded-right D)
        "KEEK",    # bright cyan recording band on the underside
        ".KK.",
    ])
    c.set(podx, pody + 3, "E")         # focused capture beam tip stabbing down to the table
    c.set(podx, pody + 4, "e")

    # ---- the pit-GLOW deepens to energized cyan: a couple of `e` accents on the back rim
    #      so the pit now reads as actively powered/recording (the magenta o table core
    #      stays; the cyan layers in as the capture field, kept sparse + clean).
    for ang in (242, 298):
        gx, gy = _rim_pt(CX, PIT_CY, RX - 3, RY - 1, ang)
        c.set(int(round(gx)), int(round(gy)), "e")
    return (podx, pody)


def stage5_sentiment_cloud(c, pod):
    """t5 — CROWNING FEATURE = FULLY EVOLVED focus suite. The hovering magenta theme
    word-cloud BLOOMS into a live SENTIMENT-CLOUD ARRAY: several bright signal-cyan
    `E` discussion THREADS streaming up out of the capture pod into the cloud, fanning
    to a bright CONSENSUS NODE riding above it, and the whole suite is dressed out in
    GOLD premium trim (a gold rim around the central table-ring + a gold finial on the
    t2 mic boom). Reads as elite + fully maxed, still recognizably the same discussion
    pit. The threads/consensus recompute off the SAME cloud + pod anchors the base/t4
    used (no second hardcoded guess)."""
    ccx, ccy = CX, TOP_Y - 19          # cloud centre (same as theme_cloud)
    podx, pody = pod                    # capture pod centre (same as stage4)

    # --- live discussion THREADS sprouting from the BLOOMED cloud: a FEW (3) short,
    #     clean bright-E sentiment tendrils branching UP-and-OUT of the cloud's upper
    #     edge (the banner has come alive with discussion threads), each a gentle 2-seg
    #     diagonal kept INSIDE the cloud airspace (rows ~ccy-5..ccy) so the bloom reads
    #     as the cloud enriching — NOT a tall geyser over the pit. A soft e shadow beside
    #     each makes them read as glowing ribbons. Clamp on-canvas. ---
    threads = [
        [(ccx - 4, ccy - 1), (ccx - 6, ccy - 4), (ccx - 7, ccy - 6)],   # up-left tendril
        [(ccx,     ccy - 2), (ccx,     ccy - 5), (ccx,     ccy - 7)],   # straight-up centre
        [(ccx + 4, ccy - 1), (ccx + 6, ccy - 4), (ccx + 7, ccy - 6)],   # up-right tendril
    ]
    for pts in threads:
        for i in range(len(pts) - 1):
            a0 = (max(0, min(63, pts[i][0])), max(0, min(63, pts[i][1])))
            a1 = (max(0, min(63, pts[i + 1][0])), max(0, min(63, pts[i + 1][1])))
            c.line(a0, a1, "E")
        mid = pts[1]
        c.set(max(0, min(63, mid[0] + 1)), max(0, min(63, mid[1])), "e")

    # --- two SHORT cyan feeders hinting the captured voices rising from the pod INTO
    #     the cloud (kept short: just a couple px above the pod, NOT a full column up
    #     the pit, so the pit stays readable). ---
    for dx in (-1, 1):
        c.set(max(0, min(63, podx + dx)), max(0, min(63, pody - 3)), "e")
        c.set(max(0, min(63, podx + dx)), max(0, min(63, pody - 4)), "E")

    # --- CONSENSUS NODE: a bright cyan node riding just ABOVE the cloud where the three
    #     threads converge = the group has reached consensus. A compact E core ringed by
    #     one e signal-halo. Recomputed from the cloud centre so it crowns the bloom.
    #     Kept >=3 so its halo top stays clear of row 0 (no edge-clip). ---
    nodx, nody = ccx, ccy - 8          # above the cloud, in clear sky
    nody = max(nody, 3)
    for a in range(0, 360, 45):        # one compact signal-halo ring (2:1 ellipse)
        hx = nodx + 3 * math.cos(math.radians(a))
        hy = nody + 3 * 0.5 * math.sin(math.radians(a))
        c.set(int(round(hx)), int(round(hy)), "e")
    for xx, yy, ch in [(0, 0, "W"), (-1, 0, "E"), (1, 0, "E"), (0, -1, "E"), (0, 1, "E")]:
        c.set(nodx + xx, nody + yy, ch)

    # --- GOLD premium trim (t5 flourish only) ---
    # 1) a gold rim ring around the central table-ring (the discussion table is gilded):
    #    a sparse q ellipse just outside the table disc on the pit floor.
    for a in range(0, 360, 36):
        gx = CX + 3.2 * math.cos(math.radians(a))
        gy = (PIT_CY + 2) + 1.7 * math.sin(math.radians(a))
        c.set(int(round(gx)), int(round(gy)), "q")
    c.set(CX, PIT_CY + 1, "O")         # a bright O glint on the gilded table centre
    # 2) a gold FINIAL crowning the t2 mic-boom MIC HEAD (recompute from the SAME boom
    #    anchor t2 used: the mic head over the table at (CX+2, PIT_CY-2); its capsule
    #    shell top is the row above, so the finial caps it cleanly).
    fxx, fyy = CX + 2, PIT_CY - 2      # t2 mic-head origin
    c.set(fxx, fyy - 1, "q")           # gold finial cap directly atop the capsule shell
    c.set(fxx - 1, fyy - 1, "O")       # bright gold spark beside it
    # 3) a couple of gold bosses on the oculus rim front (sparse elite ring trim)
    for ang in (-90, -60, -120):
        rxx, ryy = _rim_pt(CX, TOP_Y, RX - 1, RY - 1, ang)
        c.set(int(round(rxx)), int(round(ryy)), "q")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the focus-group chamber at upgrade `stage` (1..5). Stage 1 is IDENTICAL
    to the shipped base; each higher stage keeps every prior addition and bolts on the
    next (t2 boom+seat → t3 observation booth → t4 mic-ring+capture pod → t5 sentiment
    cloud+gold). Painter's order keeps overhead/rooftop additions on top of the masses
    they grow from, and additions stay OUT (back-arc booth) or LOW in the pit opening so
    the high theme word-cloud signature is never occluded — until t5 blooms it."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    # painter's order: shadow -> round drum wall (mirror band + open rim) -> sunken
    # pit (floor, seats, table) -> entry stub (front) -> rising bubbles -> hovering
    # theme word-cloud signature high above the open oculus.
    contact_shadow(c)
    drum(c)
    pit_cy = pit(c)

    # --- CUMULATIVE UPGRADE STAGES (drawn before the entry stub / bubbles / cloud so
    #     painter's order is correct: the back-arc booth (t3) and overhead gantry/pod
    #     (t4) sit BEHIND/around the pit and UNDER the rising bubbles + word-cloud,
    #     which are painted last and stay on top). t2 boom + extra seat layer onto the
    #     rim. t5 sentiment threads/consensus are painted AFTER the cloud so they bloom
    #     out of it. ---
    if stage >= 3:
        booth_posts = stage3_observation_booth(c)
    pod = None
    if stage >= 2:
        stage2_boom_and_seat(c)
    if stage >= 4:
        pod = stage4_micring_and_pod(c, booth_posts)

    # base front-of-pit + signature, painted on top of the structural additions
    entry_stub(c)
    speech_bubbles(c, pit_cy)
    theme_cloud(c)

    if stage >= 5:
        stage5_sentiment_cloud(c, pod)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/mindframe"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "focus-group-chamber"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped focus-group-chamber.png, so it does NOT overwrite the base PNG."""
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
