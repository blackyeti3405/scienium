#!/usr/bin/env python3
"""
Behavioral Lab — MindFrame economy building (BESPOKE FORM, standard role).

NOT the gateway cube and NOT a re-skin of a sibling. It is a TWO-PART OBSERVATION
BLOCK: a TALL glass-fronted EXPERIMENT CHAMBER (front-left) abutting a clearly
LOWER OBSERVATION ROOM (back-right), the two split by a shared ONE-WAY MIRROR wall
the player reads across. A clinical split-room silhouette — two abutting boxes of
markedly different heights — distinct from BioCore's wide vivarium hall (an ANIMAL
maze): this is a HUMAN A/B decision experiment watched from behind silvered glass.

  * OBSERVATION ROOM (lower, back-right): a SHORT Box abutting the chamber's right
    side, stepped back — M/D walls, a small opaque louver vent + one small window on
    its plainer shaded face. Drawn FIRST (back volume). Its roof sits ~4px LOWER than
    the chamber roof so the stepped silhouette is unmistakable.
  * EXPERIMENT CHAMBER (taller, front-left): a Box whose lit-LEFT face is one big
    Box.window observation pane — a LIT g/c glass field with an h sheen sweep and one
    soft M mullion. The dark signature detail sits ON TOP of that lit field (never a
    black grid). Drawn over the observation room (front volume occludes it).
  * ONE-WAY MIRROR: the shared dividing wall — a Box.window panel on the chamber's
    shaded-right face reading as silvered glass (bright c glass + heavy h sheen +
    faint M mullion + frame), with a faint d observer silhouette + c/O recording dot
    behind it (the watchers).
  * ROOFLINE: two flat M roofs at clearly different heights (chamber taller), each
    with a thin D parapet curb; a soft o magenta accent strip runs the chamber roof
    lip; a small c camera nub on the mirror-wall corner peeks into the chamber.
  * OPENING SIDE = LEFT: the hero glazing is the big lit-LEFT chamber pane.

Signature (one-of-one): inside the LIT chamber a seated d/D subject faces a glowing
two-button A/B choice panel — one c/h button (A), one o/O button (B, the leaning
choice, brighter); a single clean magenta o/O PREDICTED-CHOICE needle leans toward B
BEFORE they press (a faint o ghost-press halo on B = the model's prediction), and a
tiny c/g REACTION-TIME readout strip ticks a climbing o "RT" bar beside the panel.
No A/B human-choice panel / predicted-choice needle / reaction-time readout motif
exists anywhere in the catalog.

Composed from art/isobuild.Box — NO iso.draw_cube / base_windows.
"""
import os
import sys
import json

sys.path.insert(0, "/Users/redacted/Code/nova-lab/art")
from iso import Canvas
from isobuild import Box

MIND = {"K": "#181428", "W": "#e8e2f6", "L": "#cabfe6", "M": "#9f90c8", "D": "#6f5fa0", "d": "#4a3c70",
        "h": "#ecc8f4", "c": "#d0a8ee", "g": "#a45ce0", "G": "#6a2fb0",
        "o": "#f08cce", "O": "#ffb8e2", "r": "#b03a80"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings) at top-left (x0,y0).
    '.' = skip (transparent)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


# ── 1. OBSERVATION ROOM — lower box, back-right (drawn FIRST, back volume) ─────
def observation_room(c):
    """The lower, stepped-back room from which observers watch. Sits to the BACK-
    RIGHT so the taller chamber (front-left) overlaps and occludes its front-left
    corner. It is markedly SHORTER than the chamber (roof ~4px lower) to sell the
    stepped two-volume silhouette. M/D walls; its plainer shaded RIGHT face carries
    an opaque louver vent and one small window (equipment side stays non-glass)."""
    b = Box(top=(44, 14), wx=6, wy=6, h=11)
    b.shadow(c)
    b.draw(c, roof="M", lwall="M", rwall="D", roof_hi="W", outline="K")

    # thin D parapet curb ringing the lower roof
    c.line(b.r_left, b.r_front, "D")
    c.line(b.r_front, b.r_right, "d")
    c.line(b.r_top, b.r_right, "D")

    # plainer SHADED-RIGHT face: an opaque louver vent (equipment) + one small window.
    b.louver(c, "right", 0.12, 0.44, 2.6, 6.4, body="D", slat="K", edge="M", frame="K")
    b.window(c, "right", 0.58, 0.86, 2.8, 6.0, glass="g", hi="c", shade="G",
             frame="K", mullions=0, sheen="h")
    return b


# ── 2. EXPERIMENT CHAMBER — taller box, front-left (front volume) ─────────────
def experiment_chamber(c):
    """The tall front-left glass-fronted chamber. Its lit-LEFT face is the hero
    observation pane; its SHADED-RIGHT face is the shared dividing wall that holds
    the one-way mirror. Drawn AFTER the observation room so it occludes that room's
    front-left corner (the two volumes abut and read as one split-room block)."""
    b = Box(top=(22, 10), wx=9, wy=6, h=21)
    b.shadow(c)
    b.draw(c, roof="M", lwall="M", rwall="D", roof_hi="W", outline="K")

    # thin D parapet curb + a soft o magenta accent strip along the chamber roof lip
    c.line(b.r_left, b.r_front, "D")
    c.line(b.r_front, b.r_right, "d")
    c.line(b.r_top, b.r_left, "L")
    # o magenta accent strip just under the front roof eaves (the chamber roof lip)
    c.line(b.left_pt(0.04, 0.7), b.left_pt(0.96, 0.7), "o")
    c.line(b.right_pt(0.04, 0.7), b.right_pt(0.96, 0.7), "r")
    return b


# ── 3. HERO LEFT OBSERVATION PANE — the big LIT-LEFT chamber glass (the opening) ─
def chamber_window(c, b):
    """The hero: one big K-framed observation pane filling most of the chamber's
    LIT-LEFT face. It is a LIT GLASS FIELD — Box.window lays a glowing g/c interior
    with an h sheen sweep and one soft M mullion (NEVER a black-barred grid). A thin
    G floor band gives the props something to sit on, and a soft d back-wall band
    sits just under the sheen so the glass has depth without going black. The dark
    signature detail is then drawn ON TOP of this lit field. Returns the inner glass
    bounds (u0,u1,v0,v1) so the signature lands inside the lit pane."""
    U0, U1, V0, V1 = 0.10, 0.92, 2.6, 18.4
    # Framed LIT glazed pane: bright g/c glass body, sky-band at top, soft mullion,
    # clean K frame. We pass sheen="g" so the built-in diagonal streak stays SUBTLE
    # (it otherwise bleeds a long bright diagonal right across the signature zone);
    # we then paint ONE controlled sheen sweep confined to the UPPER-LEFT below.
    b.window(c, "left", U0, U1, V0, V1, glass="g", hi="h", shade="G",
             frame="K", mullions=1, sheen="g")

    # Build the LIT interior as clean horizontal bands (so it reads as a glowing room,
    # never black-barred) and keep the lower portion an even field for the signature:
    #   top sky-band (from window) -> soft d back-wall rim -> even G room glow -> g floor
    midv = V0 + (V1 - V0) * 0.24
    c.fill_poly([b.left_pt(U0, midv), b.left_pt(U1, midv),
                 b.left_pt(U1, midv + 1.0), b.left_pt(U0, midv + 1.0)], "d")  # back-wall rim
    c.fill_poly([b.left_pt(U0, midv + 1.0), b.left_pt(U1, midv + 1.0),
                 b.left_pt(U1, V1 - 1.4), b.left_pt(U0, V1 - 1.4)], "G")       # even room glow
    c.fill_poly([b.left_pt(U0, V1 - 1.4), b.left_pt(U1, V1 - 1.4),
                 b.left_pt(U1, V1 - 0.2), b.left_pt(U0, V1 - 0.2)], "g")       # lit floor band

    # ONE controlled sheen sweep, CONFINED to the upper-left of the glass (above the
    # signature) so it never crosses the console — the unmistakable glass tell.
    c.line(b.left_pt(U0 + 0.06, midv + 0.2), b.left_pt(U0 + 0.30, V0 + 1.0), "h")
    c.line(b.left_pt(U0 + 0.14, midv + 0.2), b.left_pt(U0 + 0.38, V0 + 1.0), "W")
    # soft M mullion, top half only (a glass divider, never a hard K bar)
    mu = (U0 + U1) / 2
    c.line(b.left_pt(mu, V0 + 0.6), b.left_pt(mu, midv + 0.4), "M")

    # crisp K frame back on top (the fills must not eat the jamb/sill)
    for a, b2 in [(b.left_pt(U0, V0), b.left_pt(U1, V0)),
                  (b.left_pt(U0, V1), b.left_pt(U1, V1)),
                  (b.left_pt(U0, V0), b.left_pt(U0, V1)),
                  (b.left_pt(U1, V0), b.left_pt(U1, V1))]:
        c.line(a, b2, "K")
    return U0, U1, V0, V1


# ── 4. SIGNATURE — seated subject + A/B panel + predicted needle + RT readout ──
def subject_and_panel(c, b, U0, U1, V0, V1):
    """ON TOP of the lit glass field: a small seated d/D figure (dark against the
    glow) facing a K-framed console with TWO clearly distinct lit buttons — A (c/h,
    dimmer) and B (o/O, the leaning choice, brighter), a K gutter between them. A
    single clean magenta o/O PREDICTED-CHOICE needle leans toward B (a faint o
    ghost-press halo on B = the prediction), and a tiny c/g REACTION-TIME strip ticks
    a climbing o RT bar beside the console. Hand-stamped at known screen pixels so
    each element keeps a clean K gap and stays legible at sprite scale."""
    # The lower-center of the lit pane is an even G room-glow band. We place the
    # signature on KNOWN screen pixels (read off the grid) so every element keeps a
    # clean K gap and stays legible at sprite scale. Layout, left→right:
    #   [seated subject]  [needle over]  [A/B console plate]  [RT bar]

    # Give the signature a CLEAN even-G stage: sweep leftover sheen confetti out of
    # the lower-center so nothing clutters behind the console. Interior-bounded.
    for sv in range(27, 36):
        for su in range(11, 27):
            if c.px[sv][su] in ("h", "W", "c"):
                c.px[sv][su] = "G"

    # Allocation across the ~15px-wide lit pane: a SMALL subject far lower-left, then
    # the A/B CONSOLE as the hero filling the center-right, the needle above it, and
    # a 1px RT tick on the console's right edge. Console is the legible hero.

    # --- SEATED SUBJECT: a small clean dark d-silhouette on a stool, far lower-left,
    # facing RIGHT toward the console. One unambiguous shape (head + torso + lap). ----
    sx, sy = 12, 31
    stamp(c, sx, sy, [
        ".dd",      # head
        "ddd",      # shoulders
        "dDd",      # torso (faint lit core)
        "dDd",      # lap (faint lit core continues so the seated mass reads)
    ])
    c.set(sx + 1, sy, "D")                                                           # lit cheek so the head reads as a face turned to the panel
    c.set(sx, sy + 4, "K"); c.set(sx + 1, sy + 4, "d"); c.set(sx + 2, sy + 4, "K")  # stool seat
    c.set(sx + 1, sy + 5, "K")                                                       # stool leg / shadow
    c.set(sx + 3, sy + 1, "O")                                                       # gaze glint toward the panel

    # --- A/B CONSOLE (the hero): a clean K-framed dark PLATE so the bright buttons
    # POP. Center-right of the pane. TWO big, clearly separated buttons. -------------
    px, py = 16, 30                                # plate top-left (screen)
    stamp(c, px, py, [
        "KKKKKKKKK",
        "KddddddddK",
        "KddddddddK",
        "KddddddddK",
        "KddddddddK",
        "KKKKKKKKK",
    ])
    # Button A (cool c/h, the DIMMER option) — LEFT, 2x2 + highlight.
    c.set(px + 1, py + 1, "h"); c.set(px + 2, py + 1, "c"); c.set(px + 3, py + 1, "c")
    c.set(px + 1, py + 2, "c"); c.set(px + 2, py + 2, "c"); c.set(px + 3, py + 2, "g")
    c.set(px + 1, py + 3, "K"); c.set(px + 2, py + 3, "K"); c.set(px + 3, py + 3, "K")
    # K GUTTER (col px+4) so "two options" reads instantly
    c.set(px + 4, py + 1, "K"); c.set(px + 4, py + 2, "K"); c.set(px + 4, py + 3, "K")
    # Button B (hot O/o, the LEANING / predicted choice — BRIGHTER) — RIGHT, 2x2 + hi.
    c.set(px + 5, py + 1, "O"); c.set(px + 6, py + 1, "O"); c.set(px + 7, py + 1, "O")
    c.set(px + 5, py + 2, "O"); c.set(px + 6, py + 2, "o"); c.set(px + 7, py + 2, "o")
    c.set(px + 5, py + 3, "K"); c.set(px + 6, py + 3, "K"); c.set(px + 7, py + 3, "K")
    # faint o ghost-press HALO hugging B only = the model's pre-press prediction
    c.set(px + 8, py + 1, "o"); c.set(px + 8, py + 2, "o")
    # tiny A / B cues on the lower lip so the two options stay labeled
    c.set(px + 2, py + 4, "c")   # A cue (cool)
    c.set(px + 6, py + 4, "O")   # B cue (hot)

    # --- PREDICTED-CHOICE NEEDLE: ONE clean magenta arrow ABOVE the console, lifted
    # off the plate by a clear gap row so it reads as its own floating arrow. Pivots
    # at a dark r hub centered over A and LEANS DOWN-RIGHT to point at button B. ------
    nx, ny = px + 1, py - 4                        # pivot hub above button A (clear gap)
    # carve a clean G gap row just above the plate so needle != plate frame, and a
    # K-dark gutter just under the needle so the arrow silhouette pops off the glow.
    for gx in range(px, px + 9):
        if c.px[py - 1][gx] not in ("K",):
            c.px[py - 1][gx] = "G"
    # pivot HUB over A — a 2px dark-r hub so the needle clearly pivots above button A
    c.set(nx, ny, "r"); c.set(nx, ny + 1, "r")
    # SHAFT leaning down-right A→B, thickened to 2px so it reads as one discrete arrow
    c.set(nx + 1, ny, "o")
    c.set(nx + 2, ny, "o"); c.set(nx + 2, ny + 1, "O")
    c.set(nx + 3, ny + 1, "O")
    c.set(nx + 4, ny + 1, "O"); c.set(nx + 4, ny + 2, "O")
    # ARROWHEAD pointing DOWN at button B (tip + two barbs forming a clear chevron)
    c.set(nx + 5, ny + 2, "O")                    # arrow tip (points at B)
    c.set(nx + 5, ny + 1, "o")                    # upper barb
    c.set(nx + 4, ny + 3, "o")                    # lower barb
    c.set(nx + 6, ny + 2, "o")                    # tip tail

    # --- REACTION-TIME readout: a small c/o climbing gauge just RIGHT of the plate,
    # held off by a K column — a c label, a climbing o bar, an O current-ms tip. ------
    rx, ry = px + 10, py
    for k in range(6):
        c.set(rx - 1, ry + k, "K")                # K separator column from the plate
    # 2px-wide climbing RT gauge so the ticks read at 1× — bright O current tip over a
    # high-contrast o bar on a K rail, a c label up top and a g base, clearly a meter.
    stamp(c, rx, ry, [
        "cc",      # RT label glow
        "OO",      # current-ms tip (brightest, the climbing front)
        "oK",      # bar with a K rail edge so the ticks read as discrete steps
        "oK",
        "oK",
        "gK",      # base
    ])


# ── 5. ONE-WAY MIRROR — the shared dividing wall (the secret-watching layer) ───
def one_way_mirror(c, ch_box, obs_box):
    """The shared chamber/observation wall reads as a silvered ONE-WAY MIRROR: a
    Box.window panel on the chamber's SHADED-RIGHT face (which faces the observation
    room) — bright c glass + a heavy h sheen sweep + a faint M mullion + clean K
    frame, so it reads as SILVERED GLASS, not a dark crack. A faint d observer
    silhouette + a small c/O recording dot sit behind it (the watchers)."""
    b = ch_box
    U0, U1, V0, V1 = 0.14, 0.86, 3.0, 16.0
    # silvered glass body: bright c with a heavy h sheen so it reads MIRRORED;
    # a faint M mullion (soft, not a hard K bar); clean K frame.
    b.window(c, "right", U0, U1, V0, V1, glass="c", hi="h", shade="G",
             frame="K", mullions=1, sheen="h")
    # heavy mirror SHEEN: a broad bright h diagonal wash over the upper-left of panel
    c.fill_poly([b.right_pt(U0 + 0.04, V0 + 0.6), b.right_pt(0.48, V0 + 0.6),
                 b.right_pt(0.30, V0 + (V1 - V0) * 0.55),
                 b.right_pt(U0 + 0.04, V0 + (V1 - V0) * 0.55)], "h")
    # a crisp W glint streak inside the sheen (the silvered tell)
    c.line(b.right_pt(0.20, V0 + (V1 - V0) * 0.5), b.right_pt(0.44, V0 + 1.2), "W")
    c.line(b.right_pt(0.28, V0 + (V1 - V0) * 0.5), b.right_pt(0.52, V0 + 1.2), "h")

    # faint d OBSERVER silhouette standing behind the mirror (the watcher), lower-right
    op = b.right_pt(0.70, V0 + (V1 - V0) * 0.46)
    ox, oy = int(round(op[0])), int(round(op[1]))
    stamp(c, ox, oy, [
        ".d.",     # head
        "ddd",     # shoulders
        ".d.",     # torso
        ".d.",
    ])
    # a small c/O recording dot beside the observer (a watching camera light)
    c.set(ox + 3, oy, "O")
    c.set(ox + 3, oy + 1, "c")

    # a small c CAMERA NUB on the mirror-wall corner, peeking into the chamber
    cn = b.right_pt(U1 + 0.02, V0 - 0.6)
    cnx, cny = int(round(cn[0])), int(round(cn[1]))
    c.set(cnx, cny, "K")
    c.set(cnx, cny - 1, "c")
    c.set(cnx - 1, cny - 1, "h")             # tiny lens glint


def build():
    c = Canvas()
    # painter's order: lower observation room (back) -> taller chamber (front) ->
    # the one-way mirror on the shared wall -> the hero left pane (LIT glass) ->
    # the signature (seated subject + A/B panel + predicted needle + RT readout)
    # ON TOP of the lit glass.
    obs = observation_room(c)
    ch = experiment_chamber(c)
    one_way_mirror(c, ch, obs)
    U0, U1, V0, V1 = chamber_window(c, ch)
    subject_and_panel(c, ch, U0, U1, V0, V1)

    spec = {"width": 64, "height": 64, "palette": MIND, "rows": c.rows()}
    out = "/Users/redacted/Code/nova-lab/art/src/buildings/mindframe_behavioral-lab.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
