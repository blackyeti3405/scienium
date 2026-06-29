#!/usr/bin/env python3
"""
Longitudinal Study Wing — MindFrame Lab economy building (BESPOKE form, STANDARD role).

The LONGEST, LOWEST, MOST HORIZONTAL mass in the set — a true "wing": a single long
low Box running deep along the RIGHT axis, ribboned with a regular RHYTHM of evenly-
spaced glazed cohort-office bays (the study rooms over the years), crowned by a raised
ridge beam down its spine that carries the timeline. A stretched-out silhouette,
deliberately unlike any tower, drum, stepped block, or open booth.

  * LONG WING BLOCK (drawn first, behind its rooftop hero): one long low Box — very
    long in wx, slim in wy, low h — M/D indigo walls. Its lit-LEFT face carries the
    HERO glazing: a row of 4 evenly-spaced Box.window cohort-office bays (matching
    g/c glazed study rooms, soft sheen, wall between each) reading as a repeating
    corridor of rooms over the years. The shaded-RIGHT face stays plainer (a long
    blank wall band + a slim slit window).
  * END ANNEX: a slightly TALLER Box cap on the far-back (right-most) end — the
    records/archive end — with a Box.louver vent band (opaque), one small glazed
    slit, and a tiny climbing "retention %" readout.
  * ROOFLINE: a flat low M roof carrying a raised D RIDGE BEAM down its spine (the
    timeline track); a thin o magenta accent strip runs the lit eave; small c
    rooflights dot between the bays.
  * OPENING SIDE = LEFT. The hero is the lit-LEFT rhythmic row of cohort-office
    glass bays; the rooftop ridge timeline reads above the lit corridor.

Signature (one-of-one): along the rooftop ridge runs a TIMELINE marked Year 1->5; at
each waypoint sits a small cohort PORTRAIT-MEDALLION (a simple d head silhouette in
an M/L ring, a couple dimming toward later years = attrition, the retained ones
glowing O); a glowing o/O magenta retention TREND-LINE climbs across the waypoints;
and a bright O/h participant TOKEN advances along the track toward Y5 with a faint
motion trail — optimizing how many participants are retained over time. No timeline-
ridge / year-waypoints / cohort-medallions / retention-trend-with-advancing-token
motif exists anywhere else in the catalog.

Composed from art/isobuild.{Box} — NO iso.draw_cube / base_windows.
Draw order: contact shadow + long wing BOX (back) -> end annex -> roof ridge + eave +
rooflights -> lit-LEFT cohort-office glass ribbon (hero) -> shaded-right plainer face
-> rooftop Year 1->5 timeline (ridge ticks + medallions + trend-line + token).

═══════════════════════════════════════════════════════════════════════════════════
UPGRADE-EVOLUTION pass (this building) — cumulative _t2.._t5 sprites unlocked at level
tier-ups. The base form (stage 1) is UNCHANGED. Theme for THIS building: the running
study accumulates WAVES and COHORTS over the YEARS — it grows another wave on the
timeline, enrolls another cohort bay, then stands up a data-warehouse of stored waves,
and finally the timeline blooms into a glowing multi-wave trend-ribbon. The evolved
glow is the lab's shared SIGNAL-CYAN e/E (stored data), kept distinct from the building's
own magenta o/O (the human retention/people accent). Gold (q) is a t5 flourish only.

  t2  small functional add : two more milestone nodes extending the timeline track past
                             Y5 + a brighter o/O "current-wave" pip on the latest node
  t3  structural add       : an additional COHORT BAY extending the wing front (repeat
                             the windowed Box module, b frame) — another cohort enrolled
  t4  major add            : a DATA-WAREHOUSE TOWER off the back end with stacked glowing
                             cyan archive-drawers of accumulated waves (years stored)
  t5  crowning feature     : the timeline becomes a glowing multi-wave TREND-RIBBON — a
                             dense bright-cyan trend-line with pulsing milestone nodes
                             across the roof, + gold ridge rail + gold warehouse-tower cap
"""
import os
import sys
import json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder, RX, RY, LX, LY

# Base MindFrame palette (shared keys) + the EVOLVED accent shades reserved for the
# upgrade stages only (they appear in NO stage-1 geometry, so the shipped base PNG is
# byte-identical). These exact evolved keys+hexes are the lab-wide set shared by all
# 10 mindframe buildings:
#   b  deep indigo steel — matured structure tone for the t3 bay frame + t4 tower mass
#   e  energized signal-cyan glow (mid)   E  signal-cyan glow (bright) — the t4/t5 data
#   q  premium gold trim — t5 flourish ONLY (NOT a whole-building recolor)
MIND = {"K": "#181428", "W": "#e8e2f6", "L": "#cabfe6", "M": "#9f90c8", "D": "#6f5fa0", "d": "#4a3c70",
        "h": "#ecc8f4", "c": "#d0a8ee", "g": "#a45ce0", "G": "#6a2fb0",
        "o": "#f08cce", "O": "#ffb8e2", "r": "#b03a80",
        "b": "#2b2440", "e": "#7fd4ff", "E": "#d6f4ff", "q": "#f3c63a"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def _stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings) at top-left (x0,y0).
    '.' = skip (transparent)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


def _clamp_pt(p):
    """Clamp a point inside the 0..63 canvas so long beams/arcs never overshoot the
    edge and read as flat antennas (a volt-lab pitfall)."""
    return (max(0, min(63, int(round(p[0])))), max(0, min(63, int(round(p[1])))))


# ── 1. LONG WING BLOCK — the stretched-out study corridor (drawn FIRST) ───────
# Long in wx (runs deep to the right), slim in wy, LOW h => the most horizontal
# silhouette in the set. Sits well left so the long body fits the 64px canvas.
WING = Box(top=(18, 16), wx=15, wy=6, h=11)


def long_wing(c, b):
    """The long low wing body. M/D indigo walls. Drawn behind everything; its roof
    will carry the timeline ridge and its lit-LEFT face the cohort-office glass
    ribbon. Returns b."""
    b.draw(c, roof="M", lwall="M", rwall="D", roof_hi="W", outline="K")
    # re-shade the roof slightly darker toward the front so the raised ridge reads
    c.fill_poly([b.r_top, b.r_left, b.r_front], "M")
    c.line(b.r_top, b.r_left, "W")
    c.line(b.r_top, b.r_right, "L")
    return b


# ── 2. END ANNEX — taller records/archive cap on the far-back (right) end ─────
def end_annex(c, wing):
    """A slightly TALLER Box on the far-back (right-most) end of the wing — the
    records/archive cap. M/D indigo; an opaque Box.louver vent band + one small
    glazed slit on its lit-left face. Drawn after the wing so it caps the far end."""
    # seat it on the wing's right-back corner, a touch taller than the wing
    apex = (wing.r_right[0] - 8, wing.r_right[1] - 14)
    annex = Box(top=apex, wx=4, wy=5, h=14)
    annex.draw(c, roof="M", lwall="M", rwall="D", roof_hi="W", outline="K")
    # opaque LOUVER vent band on the lit-left face (records HVAC) — reads as vents
    annex.louver(c, "left", 0.20, 0.80, 2.4, 6.2, body="D", slat="K", edge="M", frame="K")
    # one small glazed slit below the vents
    annex.window(c, "left", 0.26, 0.74, 8.0, 11.2, glass="c", hi="h", shade="G")
    # a thin WARM ('r', not bright 'o') cap line along the annex lit eave — ties to the
    # wing eave trim WITHOUT adding a second bright-magenta diagonal that could be misread
    # as a competing trend-line. The only bright magenta stroke stays the rooftop trend-line.
    c.line(annex.left_pt(0.06, 1.2), annex.left_pt(0.94, 1.2), "r")
    return annex


# ── 3. ROOFLINE — raised ridge beam (timeline track) + eave + rooflights ──────
def roofline(c, wing):
    """A raised D RIDGE BEAM down the wing's spine (the timeline track the hero sits
    on), a thin o magenta accent strip along the lit eave, and small c rooflights
    dotting between the bays. Returns the ridge endpoints (front=Y1, back=Y5) in
    screen px so the timeline can lay its waypoints evenly along the beam.

    The ridge runs along the LONG wx spine. In roof_pt(u, v), **u** is the LONG wx
    edge (left->front) and v is the SHORT wy edge (left->top); so we vary U along the
    full length at a fixed V kept toward the lit-left/back of the roof so the beam +
    medallions sit over the lit corridor and read clearly (not on the front lip)."""
    V = 0.30                          # toward the lit-left/back half of the roof
    LIFT = 2                          # the beam sits just 2px proud of the roof
    rf = wing.roof_pt(0.08, V)        # front end = Y1 (toward the left/front)
    rb = wing.roof_pt(0.90, V)        # back  end = Y5 (toward the annex/right)
    rfx, rfy = rf[0], rf[1] - LIFT
    rbx, rby = rb[0], rb[1] - LIFT

    # raised ridge beam: a clean built-up rail following the spine — a K top cap,
    # a lit M left flank and a d shaded web dropping to the roof, so it reads as a
    # solid beam (a track), not a painted stripe.
    n = 48
    for k in range(n + 1):
        t = k / n
        x = int(round(rfx + t * (rbx - rfx)))
        ytop = int(round(rfy + t * (rby - rfy)))
        c.set(x, ytop, "K")            # crisp K top cap of the rail
        c.set(x, ytop + 1, "M")        # lit left flank
        c.set(x, ytop + 2, "d")        # shaded web down to the roof
    # a thin L sheen riding the lit top of the rail (the polished track)
    for k in range(0, n + 1, 2):
        t = k / n
        x = int(round(rfx + t * (rbx - rfx)))
        ytop = int(round(rfy + t * (rby - rfy)))
        c.set(x, ytop + 1, "L")

    # thin WARM accent strip along the lit-left eave (MindFrame trim) — kept as a quiet
    # 'r' under-line ONLY (NO magenta 'o' here): the single bright-magenta stroke in the
    # whole sprite must be the rooftop retention trend-line through the medallion heads,
    # so the eave no longer carries an 'o' line that competes with it as a second climb.
    c.line(wing.left_pt(0.04, 1.0), wing.left_pt(0.96, 1.0), "r")   # quiet warm eave trim

    # small c ROOFLIGHTS dotting the roof between the bays (skylights over rooms),
    # spaced along the length (u) but tucked toward the FRONT roof edge (larger v)
    # so they sit below the ridge and don't crowd the timeline. Only the two LEFT
    # rooflights (under the clean front bays) — the right pair is dropped so it doesn't
    # clutter the busy Y4/Y5 waypoint + annex zone (review tweak: de-clutter that patch).
    for u in (0.22, 0.42):
        p = wing.roof_pt(u, 0.66)
        px, py = int(round(p[0])), int(round(p[1]))
        c.set(px, py, "c")
        c.set(px, py - 1, "h")          # tiny sheen
        c.set(px + 1, py + 1, "G")      # frame edge

    return (rfx, rfy, rbx, rby)


# ── 4. COHORT-OFFICE GLASS RIBBON — the HERO row of bays on the lit-LEFT ───────
def office_ribbon(c, wing):
    """The HERO glazing: a regular RHYTHM of 4 evenly-spaced cohort-office bays down
    the lit-LEFT face, each a Box.window glazed study room (g/c glass, soft sheen),
    spaced with indigo wall between — a repeating corridor of study rooms over the
    years. A faint d desk-line implied behind each pane (seating motif, subtle)."""
    # the lit-left face runs u=0 (front/left corner) -> u=1 (back, toward annex).
    # 4 bays evenly spaced with wall between. Each bay glazed, soft mullion.
    bays = [(0.07, 0.20), (0.27, 0.40), (0.47, 0.60), (0.67, 0.80)]
    for (u0, u1) in bays:
        wing.window(c, "left", u0, u1, 2.6, 8.4,
                    glass="g", hi="h", shade="G", mullions=1, sheen="W")
        # a subtle d desk-line low in each pane (a study-room desk implied behind)
        c.line(wing.left_pt(u0 + 0.015, 7.2), wing.left_pt(u1 - 0.015, 7.2), "d")
        # a tiny c monitor-glow dot on each desk (soft data screen, MindFrame motif)
        mp = wing.left_pt((u0 + u1) / 2, 6.6)
        c.set(int(round(mp[0])), int(round(mp[1])), "c")
    # a clean K base sill band running the whole lit face under the ribbon
    c.line(wing.left_pt(0.05, 8.6), wing.left_pt(0.95, 8.6), "K")
    # a soft L corridor-floor highlight just under the sill (lit institutional look)
    c.line(wing.left_pt(0.05, 9.0), wing.left_pt(0.95, 9.0), "d")


# ── 5. SHADED-RIGHT plainer face — long blank wall + a slim slit ──────────────
def right_face(c, wing):
    """The shaded-RIGHT face stays plainer per the LEFT-opening contract: a long
    blank D wall with one slim glowing slit window and a low d base shadow band."""
    # one slim slit window low-ish on the long shaded face (a back stair/utility)
    wing.window(c, "right", 0.62, 0.80, 3.0, 7.0, glass="g", hi="h", shade="G")
    # a couple of faint d expansion-joint seams breaking the long blank wall
    for u in (0.24, 0.46):
        c.line(wing.right_pt(u, 1.4), wing.right_pt(u, 9.6), "d")
    # a low d base-shadow band along the shaded front-right foot
    c.line(wing.right_pt(0.04, 9.8), wing.right_pt(0.96, 9.8), "d")


# ── 6. SIGNATURE — rooftop Year 1->5 TIMELINE on the ridge ────────────────────
def timeline(c, ridge):
    """The hero, riding the rooftop ridge beam: a TIMELINE marked Year 1->5. At each
    of 5 EVENLY-SPACED waypoints a small cohort PORTRAIT-MEDALLION (a clean K-framed
    c/h disc with a simple d face — Y3 is a full portrait disc like Y1/Y2, NOT a dark
    blob; later years dim slightly = attrition but still read as clear discs); ONE
    continuous glowing magenta retention TREND-LINE climbs from Y1 up to a clear Y5
    endpoint; and a bright O participant TOKEN with a K halo advances along the track
    in a clear gap. A tiny c axis hint anchors it as the optimization signal."""
    rfx, rfy, rbx, rby = ridge
    # 5 EVENLY-SPACED waypoints along the ridge: Y1 (front/left) -> Y5 (back/right).
    def way(i):
        t = i / 4.0
        x = rfx + t * (rbx - rfx)
        yb = rfy + t * (rby - rfy)   # rail top-y at this waypoint
        return int(round(x)), int(round(yb))

    pts = [way(i) for i in range(5)]

    # --- 1) the 5 Year WAYPOINT TICKS — an EVEN tally row on the rail ---
    # To read as 5 EVENLY-SPACED ordered waypoints (not a cascade down the descending
    # rail), the ticks sit on a FLAT screen row directly under the flat medallion row,
    # each a crisp K stub with a bright o cap. (The structural ridge beam still runs the
    # descending spine underneath; this flat tally is the year-axis read.)
    TICK_Y = pts[0][1] - 1            # flat tick row, just under the disc row
    for (x, yb) in pts:
        c.set(x, TICK_Y, "K")        # crisp K tick on the flat year-axis
        c.set(x, TICK_Y + 1, "o")    # bright magenta tick cap (the year mark)

    # --- 2) cohort PORTRAIT-MEDALLIONS — an EVEN FLAT ROW of discs on short posts ---
    # All 5 discs pinned to a FLAT screen row sitting on the flat tick row by a SHORT
    # 2px post (track waypoints, NOT tall lollipops). Every medallion is the SAME 5x5
    # K-framed disc: a c/h lit rim ring with a simple d face (eyes + chin) inside, so all
    # 5 read as clear portrait discs (Y3 included, rebuilt from the old dark blob). Later
    # years DIM the rim from bright (h, retained + glowing) to muted (M, attrited) — a
    # legible fade, never a hole.
    ROW_Y = TICK_Y - 5                # base disc-centre row (Y1); later years STEP UP from here
    rim  = ["h", "h", "c", "c", "M"]  # outer rim: retained (bright) -> attrited (muted)
    # The 5 disc centres CLIMB left->right (each year's cohort head a touch higher than the
    # last) so the heads themselves form a rising stair and the trend-line that threads their
    # crowns reads as one continuous CLIMB to Y5 — not a flat row with a banner floating over
    # it. The mounting post stretches to keep each disc seated on its (flat) year tick.
    STEP = [0, 1, 2, 3, 4]            # upward step of each disc centre vs Y1 (climb to Y5)
    glow = [".", ".", ".", ".", "."]
    med_cx, med_cy = [], []
    for i, (x, yb) in enumerate(pts):
        cy = ROW_Y - STEP[i]           # medallion centre — climbs toward Y5
        med_cx.append(x)
        med_cy.append(cy)
        R = rim[i]
        # a K post mounting the disc down onto its (flat) tick — grows as the disc climbs
        for py in range(cy + 3, TICK_Y):
            c.set(x, py, "K")
        # 5x5 portrait disc: K frame, c/h rim ring, simple d face inside. Clear & light.
        _stamp(c, x - 2, cy - 2, [
            ".K" + R + "K.",           # crown of the rim ring
            "K" + R + "c" + R + "K",   # lit rim around a c face-plate
            "K" + "d" + "h" + "d" + "K",  # face: d eyes flanking an h nose-light
            "K" + R + "d" + R + "K",   # cheeks (rim) framing a d chin
            ".KKK.",                   # K base of the disc (sits on its post)
        ])
        # a soft glow halo dot just above retained discs (sells "retained cohort")
        if glow[i] != ".":
            c.set(x, cy - 4, glow[i])

    # --- 3) ONE continuous retention TREND-LINE threading THROUGH the waypoint heads ---
    # A single unbroken polyline whose 5 vertices land AT / just-above the CROWN of each
    # medallion disc (the head band), so the line visibly CONNECTS the cohort portraits
    # dot-to-dot — it is NOT a banner hovering in the sky above them. Each vertex is only a
    # SMALL clearance above its own disc crown, and that clearance SHRINKS left->right so
    # the line CLIMBS monotonically: Y1 sits a touch above its crown, Y5 sits right on its
    # crown as the highest/brightest point. (Because the discs share a flat screen row, a
    # shrinking clearance is what makes the line rise to the right.) disc_top = ROW_Y - 2.
    # Each vertex rides the CROWN of its OWN disc (med_cy[i] - 2), just 1px proud of it so
    # the stroke visibly TOUCHES every head. Because the discs themselves climb (STEP above),
    # connecting their crowns dot-to-dot yields one monotonic CLIMB to the Y5 summit — the
    # line threads THROUGH the five portraits, never hovering in the sky above a flat row.
    tl = [(med_cx[i], med_cy[i] - 3) for i in range(len(pts))]
    # the one continuous stroke: warm o body with a bright O hot core riding its top
    for i in range(len(pts) - 1):
        ax, ay = tl[i]
        bx, by = tl[i + 1]
        c.line((ax, ay + 1), (bx, by + 1), "o")    # warm body (one continuous stroke)
        c.line((ax, ay), (bx, by), "O")            # bright hot core
    # a clear O cap at the Y1 start (low)…
    sx, sy = tl[0]
    c.set(sx, sy, "O")
    c.set(sx, sy + 1, "o")
    # …and a single bright O+W HIGH POINT crowning Y5 (the retention peak) — the clear
    # top of the whole climb: a 2px bright O core capped with a W glint, the brightest
    # node on the line so the eye lands on Y5 as the summit.
    ex, ey = tl[-1]
    c.set(ex, ey, "O")                              # Y5 high data point
    c.set(ex - 1, ey, "O")                          # widen the peak node a touch
    c.set(ex, ey - 1, "W")                          # white glint crowning the peak
    c.set(ex - 1, ey - 1, "o")
    c.set(ex + 1, ey, "o")

    # a small c AXIS HINT at the Y1 (front) end: a tiny up-arrow = "optimize up"
    a0x, a0y = tl[0][0] - 3, tl[0][1] + 2
    c.set(a0x, a0y, "c")
    c.set(a0x, a0y - 1, "c")
    c.set(a0x - 1, a0y - 1, "h")
    c.set(a0x + 1, a0y - 1, "h")        # arrowhead wings (up)
    c.set(a0x, a0y - 2, "h")            # arrow tip

    # --- 4) advancing participant TOKEN sitting ON the line between Y3 and Y4 ---
    # A bright O token riding directly ON the trend-line in the open span between
    # waypoints 3 and 4 — a clean K halo ring so it pops against the line, a hot W core,
    # and a short c/h motion trail along the line pointing back toward earlier years, so
    # it reads as advancing ALONG the track (not floating in empty roof).
    seg, f = 2, 0.55                    # midway in the Y3->Y4 gap (a clear, uncluttered span)
    sx = tl[seg][0] + f * (tl[seg + 1][0] - tl[seg][0])
    sy = tl[seg][1] + f * (tl[seg + 1][1] - tl[seg][1])
    tx, ty = int(round(sx)), int(round(sy))       # sit ON the line (no upward offset)
    # short c/h motion trail behind it riding the line back toward Y3 (token overlays it)
    seg_dx = tl[seg + 1][0] - tl[seg][0]
    seg_dy = tl[seg + 1][1] - tl[seg][1]
    seg_len = max(1.0, (seg_dx ** 2 + seg_dy ** 2) ** 0.5)
    ux, uy = seg_dx / seg_len, seg_dy / seg_len   # unit vector along the line toward Y4
    for (dist, ch) in [(2.5, "c"), (4.5, "h")]:   # trail points back toward Y3 (-u)
        trx = int(round(tx - dist * ux))
        try_ = int(round(ty - dist * uy))
        c.set(trx, try_, ch)
    # a single bright O token DOT with a clean 1px K halo ring (3x3 footprint) — small
    # enough to read as a token riding the line, NOT a big block that out-shouts the Y5
    # peak. The K ring frames it so it pops cleanly against the magenta stroke beneath.
    for dx, dy in [(-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0),
                   (-1, 1), (0, 1), (1, 1)]:
        c.set(tx + dx, ty + dy, "K")        # clean K halo ring
    c.set(tx, ty, "O")                      # bright O participant dot at the centre

    # Return the rooftop signature anchors the upgrade stages reuse so they extend the
    # SAME timeline (no second hardcoded guess): the per-year disc centres, the flat
    # tick row, and the trend-line vertices (crown points).
    return {"med_cx": med_cx, "med_cy": med_cy, "tick_y": TICK_Y, "trend": tl,
            "ridge": ridge}


# ── 7. RETENTION READOUT — tiny climbing "%" gauge on the end annex ───────────
def retention_readout(c, annex):
    """A tiny o/c 'retention %' readout climbing on the end annex's lit-left face — a
    small data-screen bar rising to an O target (the optimization signal echoed)."""
    pt = annex.left_pt
    g0 = pt(0.30, 9.6)
    gx, gy = int(round(g0[0])), int(round(g0[1]))
    # a tiny screen frame
    _stamp(c, gx - 1, gy - 4, [
        "KKKK",
        "Kd dK".replace(" ", "d"),
        "KddK",
        "KddK",
        "KKKK",
    ])
    # a climbing bar inside (c rising to an O cap) = retention % climbing to target
    c.set(gx, gy - 1, "c")
    c.set(gx + 1, gy - 1, "c")
    c.set(gx, gy - 2, "o")
    c.set(gx + 1, gy - 2, "o")
    c.set(gx, gy - 3, "O")     # bright top = at-target retention
    c.set(gx + 1, gy - 3, "O")


# ═══════════════════════════════════════════════════════════════════════════════
# UPGRADE-EVOLUTION STAGES (cumulative). Each stage PHYSICALLY ADDS years-of-study
# structure onto the prior form — never restarts, never recolors the whole building.
# Theme: the long cohort wing accumulates WAVES and COHORTS over time. Additions grow
# the EXISTING timeline (right, past Y5), extend the wing's OWN front module, and rise
# off the BACK/annex end as stored data — so the lit-LEFT cohort ribbon + the rooftop
# Year1->5 timeline signature are never occluded. The evolved glow is the lab's shared
# signal-cyan e/E (stored waves of data), kept distinct from the building's magenta o/O
# (the people/retention accent). Gold (q) only at t5.
#
#   t2  small functional add   : two more milestone nodes past Y5 + a brighter current-wave pip
#   t3  structural add         : an additional COHORT BAY extending the wing front (b frame)
#   t4  major add              : a DATA-WAREHOUSE TOWER off the back end, cyan archive-drawers
#   t5  crowning feature       : a glowing multi-wave TREND-RIBBON + gold ridge rail + tower cap
# ═══════════════════════════════════════════════════════════════════════════════

def stage2_more_waves(c, sig):
    """t2 — SMALL FUNCTIONAL ADD: the study runs MORE WAVES, so the timeline track grows
    two more milestone nodes (Y6, Y7) continuing PAST the Y5 summit, with the magenta
    trend-line extended onto them, and the latest node (Y7) carries a brighter o/O
    "current-wave" marker pip (the wave running right now). Extends the building's OWN
    rooftop timeline signature to the right rather than adding a foreign prop. Stays on
    the wing roof, climbing into the clear strip just above the back/annex end so it
    never touches the front cohort ribbon."""
    med_cx, med_cy = sig["med_cx"], sig["med_cy"]
    tl = sig["trend"]
    # continue the same per-year step the base discs used: Y5 is the last, at
    # (med_cx[-1], med_cy[-1]); the discs march in x by ~6px and climb by ~1px/yr. Keep
    # the SAME march so Y6/Y7 read as the next two beads on the existing string. Clamp x
    # so the right node stays well inside the canvas (x<=56).
    dx = med_cx[-1] - med_cx[-2]                 # per-year x march (~6)
    dy = med_cy[-1] - med_cy[-2]                 # per-year y climb (slightly up: negative)
    x5, y5 = med_cx[-1], med_cy[-1]
    crown5 = tl[-1]                              # the trend summit at Y5 (line endpoint)
    new_centres = []
    prev_crown = crown5
    for k in (1, 2):                             # Y6, Y7
        nx = min(56, int(round(x5 + k * dx)))
        ny = max(4, int(round(y5 + k * dy)))    # keep climbing gently, stay on-canvas
        new_centres.append((nx, ny))
        # a SMALL 3x3 milestone node (a beadier waypoint than the 5x5 portrait discs, so
        # it reads clearly as "future wave marker", not another full cohort portrait).
        # Kept in the timeline's OWN warm magenta/people palette (h rim around an o core,
        # K-framed) so it stays part of the pink retention track and does NOT pre-empt the
        # cool signal-cyan e/E reserved for the t4 data warehouse.
        _stamp(c, nx - 1, ny - 1, [
            "KhK",
            "hoh",
            "KhK",
        ])
        # extend the magenta trend-line from the previous crown up to this node's crown
        crown = (nx, ny - 1)
        a = _clamp_pt((prev_crown[0], prev_crown[1]))
        b = _clamp_pt(crown)
        c.line((a[0], a[1] + 1), (b[0], b[1] + 1), "o")   # warm body, continues the climb
        c.line(a, b, "O")                                 # bright hot core
        prev_crown = crown
    # the latest node (Y7) is the CURRENT wave — a brighter o/O pip crowning it + a tiny
    # O spark so the eye reads "this is the live wave running now".
    lx, ly = new_centres[-1]
    c.set(lx, ly, "O")                          # hot centre of the current node
    c.set(lx, ly - 2, "O")                      # pip rising above it
    c.set(lx, ly - 3, "o")
    c.set(lx + 1, ly - 2, "o")


def stage3_cohort_bay(c, wing):
    """t3 — STRUCTURAL ADD: another COHORT is enrolled, so a new windowed cohort-office BAY
    module is built abutting the wing's FRONT-LEFT, projecting TOWARD the viewer as a short
    second corridor — a real new Box mass that repeats the lit-LEFT glazed-study-room module
    (g/c glass, soft sheen) so it keeps the long-wing corridor language, framed in the matured
    deep-indigo `b`. Grows the footprint OUT toward the viewer (NOT past the canvas's left
    edge — the wing already reaches x≈6, so a leftward extension would clip col 0; this
    forward module stays fully on-canvas at x∈[10,32]). Sits LOW + in FRONT so it never rises
    into the rooftop timeline signature. Returns the new bay Box."""
    # A short low front-parallel module: seated forward-left of the wing apex and stepped DOWN
    # so it reads as a second cohort corridor abutting the wing front and projecting toward the
    # viewer. Tuned (apex 16,30 / wx8 wy3 h8) to sit fully on-canvas: x∈[10,32], y∈[30,49].
    bay = Box(top=(16, 30), wx=8, wy=3, h=8)
    # draw with the same indigo walls, but a deep-indigo `b` shaded right face + a `b` frame
    # band so the new module reads as a matured, freshly-built addition seamed to the wing.
    bay.draw(c, roof="M", lwall="M", rwall="b", roof_hi="W", outline="K")
    # repeat the hero glazing: two evenly-spaced glazed cohort-office bays on the lit-LEFT face
    # (matches the wing's rhythmic study-room corridor, just shorter — a new enrolled cohort).
    for (u0, u1) in [(0.10, 0.45), (0.55, 0.90)]:
        bay.window(c, "left", u0, u1, 2.4, 6.4,
                   glass="g", hi="h", shade="G", mullions=1, sheen="W")
        # a subtle d desk-line + a tiny c monitor-glow dot (same study-room motif as the wing)
        c.line(bay.left_pt(u0 + 0.02, 5.6), bay.left_pt(u1 - 0.02, 5.6), "d")
        cm = bay.left_pt((u0 + u1) / 2, 5.0)
        c.set(int(round(cm[0])), int(round(cm[1])), "c")
    # a clean K base sill under the new bay's glazing (ties it to the wing's sill band)
    c.line(bay.left_pt(0.06, 6.6), bay.left_pt(0.94, 6.6), "K")
    # a `b` frame seam down the lit back-left vertical edge = the new-built joint to the wing
    c.line(bay.r_left, (bay.r_left[0], bay.r_left[1] + 8), "b")
    # a small "new cohort enrolled" tell: a fresh c enrollment pip glowing on the bay roof
    rp = bay.roof_pt(0.5, 0.4)
    c.set(int(round(rp[0])), int(round(rp[1])), "c")
    c.set(int(round(rp[0])), int(round(rp[1])) - 1, "h")
    return bay


def stage4_warehouse(c, wing, annex):
    """t4 — MAJOR ADD: years of accumulated waves need STORAGE, so a DATA-WAREHOUSE TOWER
    rises off the BACK end of the wing, just behind/above the records annex — a prominent
    tall new mass of deep-indigo `b` with a stack of glowing signal-cyan `e/E` ARCHIVE-
    DRAWERS (each drawer = a stored wave of cohort data), a bright `E` active read-head on
    the top drawer, and a `b` lattice spine. The clear new vertical mass that says 'this
    study now warehouses years of data'. Rises in the clear sky ABOVE the annex (back-
    right), kept fully on-canvas and clear of the rooftop timeline (which lives further
    left). Returns (tx_centre, top_y) so the t5 gold cap re-anchors off the SAME tower."""
    # base the tower ON the annex roof (its top is the highest back-right mass), centred
    # over the annex and rising straight up into clear sky. Recompute from the annex's own
    # roof centre so it sits ON the building, not floating.
    bxf, byf = annex.roof_pt(0.5, 0.5)
    bx = int(round(bxf))                         # tower x-centre (~39)
    base_y = int(round(byf))                     # tower foot on the annex roof (~21)
    twr_w = 5                                    # 5px-wide tower body
    top_y = max(4, base_y - 16)                  # TALL — rises well above the annex
    x0 = bx - twr_w // 2                          # left edge of the tower body
    x1 = x0 + twr_w - 1                           # right edge
    # --- tower body: a deep-indigo `b` slab with a lit-left M edge + shaded-right D edge
    #     and a K outline, so it reads as a solid built chassis (not a flat bar). ---
    c.fill_poly([(x0, base_y), (x1, base_y), (x1, top_y), (x0, top_y)], "b")
    c.line((x0, base_y), (x0, top_y), "M")        # lit left edge
    c.line((x1, base_y), (x1, top_y), "D")        # shaded right edge
    c.line((x0, top_y), (x1, top_y), "K")         # top cap edge
    c.line((x0, base_y), (x0, top_y), "K")
    c.line((x1, base_y), (x1, top_y), "K")
    c.line((x0, base_y), (x1, base_y), "K")       # foot seam onto the annex roof
    # --- stacked glowing ARCHIVE-DRAWERS: 4 horizontal drawer faces up the tower, each a
    #     bright cyan slot (a stored wave) with a K lip — like pulled-out data drawers. ---
    drawer_h = 3
    n_draw = 4
    for d in range(n_draw):
        dy0 = base_y - 2 - d * drawer_h
        dy1 = dy0 - (drawer_h - 1)
        if dy1 < top_y + 2:
            break
        # drawer face: bright E on the lit side fading to mid e on the shaded side
        c.fill_poly([(x0 + 1, dy0), (x1 - 1, dy0), (x1 - 1, dy1), (x0 + 1, dy1)], "e")
        c.line((x0 + 1, dy1), (x1 - 1, dy1), "E")     # bright lit drawer top edge
        c.set(x0 + 1, dy1, "E")
        c.line((x0 + 1, dy0 + 1), (x1 - 1, dy0 + 1), "K")  # K drawer lip / gap below
    # --- a bright E active READ-HEAD glint riding the top drawer (the warehouse is being
    #     queried right now) + a small `b` cap plinth on the very top (t5 caps this). ---
    head_y = base_y - 2 - (n_draw - 1) * drawer_h
    c.set(bx, max(top_y + 1, head_y - 1), "E")
    c.set(bx + 1, max(top_y + 1, head_y - 1), "W")
    # a slim `b`/K finial plinth on the tower top for the crown cap to land on
    c.set(bx, top_y, "b")
    c.set(bx, top_y - 1, "K")
    # a couple of `b` lattice ticks down a side edge so the chassis reads as built framing
    for yy in range(top_y + 3, base_y - 1, 4):
        c.set(x1 - 1, yy, "b")
    return (bx, top_y)


def stage5_ribbon_gold(c, sig, tower_top):
    """t5 — CROWNING FEATURE = FULLY EVOLVED longitudinal study. The whole rooftop timeline
    blooms into a glowing multi-wave TREND-RIBBON: a dense bright signal-cyan `e/E` trend
    band riding just above the existing magenta retention line, threading every milestone,
    with a pulsing `E` node crowning each cohort medallion (years of waves now shimmer as
    one live ribbon). Plus GOLD premium trim — a `q` gold RIDGE RAIL capping the spine beam
    and a `q` gold CAP on the data-warehouse tower. Reads as elite/maxed, still clearly the
    same cohort wing. Re-anchors off the SAME signature points (disc crowns from `timeline`,
    tower top from `stage4_warehouse`) so nothing is a second hardcoded guess."""
    import math
    med_cx, med_cy = sig["med_cx"], sig["med_cy"]
    tl = sig["trend"]                            # base trend-line vertices (per-year crowns)
    tick_y = sig["tick_y"]                       # the FLAT year-axis tick row (the visible track)

    # --- 1) GOLD RIDGE RAIL gilding the timeline TRACK: a clean q rail riding the FLAT
    #     year-axis row just above the year ticks, spanning the medallion run — so the gold
    #     reads as the polished timeline track now gilded, NOT a stray diagonal. (It rides
    #     the VISIBLE flat track the medallions sit on, not the descending structural spine
    #     beam, which is mostly hidden under the disc row.) Drawn FIRST so the glowing
    #     ribbon + pulse nodes layer ON TOP of it. ---
    rail_y = tick_y - 1                           # one row above the flat ticks
    rx0, rx1 = med_cx[0], med_cx[-1]              # span the year-axis run, on-canvas
    for x in range(min(rx0, rx1), max(rx0, rx1) + 1):
        c.set(max(0, min(63, x)), rail_y, "q")    # gold track rail
    c.set(max(0, min(63, rx0)), rail_y - 1, "O")  # a bright gold glint capping the Y1 rail end

    # --- 2) the multi-wave TREND-RIBBON: a dense bright band of signal-cyan riding ~1px
    #     ABOVE the existing magenta line, threading the same per-year crowns, so the two
    #     read as a layered ribbon (warm people-line + cool data-wave). Build the full
    #     vertex chain = the 5 base crowns; ribbon = an E hot core with an e under-glow. ---
    ribbon = list(tl)                            # the same per-year crown vertices
    for i in range(len(ribbon) - 1):
        a = _clamp_pt(ribbon[i])
        b = _clamp_pt(ribbon[i + 1])
        c.line((a[0], a[1] - 1), (b[0], b[1] - 1), "E")   # bright cyan ribbon core (above)
        c.line((a[0], a[1]), (b[0], b[1]), "e")           # cyan under-glow hugging the line
    # --- 3) a pulsing E NODE crowning each cohort medallion (the waves shimmer live) ---
    for i in range(len(med_cx)):
        nx, ny = med_cx[i], med_cy[i] - 4        # just above each disc crown
        ny = max(2, ny)
        c.set(nx, ny, "E")                       # bright pulse node
        c.set(nx, ny + 1, "e")                   # soft glow under it
        if i % 2 == 0:                           # alternate a tiny W sparkle (pulsing)
            c.set(nx, ny - 1, "W")
    # a brighter W summit sparkle re-crowning the Y5 peak (the ribbon's high point)
    px, py = med_cx[-1], max(2, med_cy[-1] - 5)
    c.set(px, py, "W")
    c.set(px - 1, py + 1, "E")
    c.set(px + 1, py + 1, "E")

    # --- 4) GOLD CAP on the data-warehouse tower top (recompute from the SAME tower-top
    #     point stage4 returned, so the cap lands exactly on the tower, not a 2nd guess).
    #     A small q pyramidal cap + a bright O finial spark = the maxed archive crown. ---
    if tower_top is not None:
        tx, ty = tower_top
        cap_y = max(2, ty - 2)
        # a small gold pyramidal cap seated on the tower's finial plinth
        c.fill_poly([(tx - 2, ty), (tx + 2, ty), (tx, cap_y)], "q")
        c.line((tx - 2, ty), (tx, cap_y), "O")    # lit gold edge
        c.set(tx, max(1, cap_y - 1), "O")         # bright finial spark on the very top
        c.set(tx, cap_y, "q")


# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE — build(stage) composes the base form, then layers cumulative stages.
# ═══════════════════════════════════════════════════════════════════════════════
def build(stage: int = 1):
    """Compose the longitudinal study wing at upgrade `stage` (1..5). Stage 1 is IDENTICAL
    to the shipped base; each higher stage keeps every prior addition and bolts on the next
    (t2 more-waves → t3 cohort bay → t4 warehouse tower → t5 trend-ribbon + gold). Painter's
    order keeps rooftop additions on top of the masses they grow from, and every addition
    stays clear of the lit-LEFT cohort ribbon + rooftop Year1->5 timeline signature."""
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) -------------------------------------------
    # painter's order: long wing body (back) -> end annex cap -> roofline ridge +
    # eave + rooflights -> lit-LEFT cohort-office glass ribbon (HERO face) ->
    # shaded-right plainer face -> rooftop Year 1->5 timeline signature -> readout.
    wing = long_wing(c, WING)
    annex = end_annex(c, wing)
    # t4 warehouse tower mounts on the annex roof and rises up: draw it AFTER the annex so
    # it sits on it, but BEFORE the rooftop timeline so the timeline (further left/front)
    # is never occluded by the back tower.
    tower_top = None
    if stage >= 4:
        tower_top = stage4_warehouse(c, wing, annex)
    ridge = roofline(c, wing)
    office_ribbon(c, wing)
    right_face(c, wing)
    # t3 cohort bay is a NEW low module projecting TOWARD the viewer off the wing front-left:
    # draw it AFTER the wing's front face (office_ribbon/right_face) so it correctly occludes
    # the lower-left front as a nearer mass, but it is LOW so it never reaches the rooftop
    # timeline drawn next.
    new_bay = None
    if stage >= 3:
        new_bay = stage3_cohort_bay(c, wing)
    sig = timeline(c, ridge)
    retention_readout(c, annex)

    # --- CUMULATIVE UPGRADE STAGES (rooftop layers, drawn last so they read on top) ---
    if stage >= 2:
        stage2_more_waves(c, sig)
    if stage >= 5:
        stage5_ribbon_gold(c, sig, tower_top)

    return c


SRC_DIR = "/path/to/scienium/art/src/buildings"
PNG_DIR = "/path/to/scienium/apps/web/public/sprites/buildings/mindframe"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG = "longitudinal-study-wing"


def emit(stage: int):
    """Build a stage, write its char-grid JSON, and (for stages 2..5) render the PNG
    + scaled preview to the manifest paths. Stage 1 only re-emits the JSON; it must
    keep matching the shipped base PNG, so it does NOT overwrite the base PNG."""
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
