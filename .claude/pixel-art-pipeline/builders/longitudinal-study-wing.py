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
"""
import os
import sys
import json

sys.path.insert(0, "/path/to/scienium/art")
from iso import Canvas
from isobuild import Box, cylinder, RX, RY, LX, LY

MIND = {"K": "#181428", "W": "#e8e2f6", "L": "#cabfe6", "M": "#9f90c8", "D": "#6f5fa0", "d": "#4a3c70",
        "h": "#ecc8f4", "c": "#d0a8ee", "g": "#a45ce0", "G": "#6a2fb0",
        "o": "#f08cce", "O": "#ffb8e2", "r": "#b03a80"}


# ── small pixel helpers ──────────────────────────────────────────────────────
def _stamp(c, x0, y0, rows):
    """Stamp a small pixel-art object (list of strings) at top-left (x0,y0).
    '.' = skip (transparent)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                c.set(x0 + i, y0 + j, ch)


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


def build():
    c = Canvas()
    # painter's order: long wing body (back) -> end annex cap -> roofline ridge +
    # eave + rooflights -> lit-LEFT cohort-office glass ribbon (HERO face) ->
    # shaded-right plainer face -> rooftop Year 1->5 timeline signature -> readout.
    wing = long_wing(c, WING)
    annex = end_annex(c, wing)
    ridge = roofline(c, wing)
    office_ribbon(c, wing)
    right_face(c, wing)
    timeline(c, ridge)
    retention_readout(c, annex)

    spec = {"width": 64, "height": 64, "palette": MIND, "rows": c.rows()}
    out = "/path/to/scienium/art/src/buildings/mindframe_longitudinal-study-wing.json"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(spec, open(out, "w"), indent=0)
    print("built", out)


if __name__ == "__main__":
    build()
