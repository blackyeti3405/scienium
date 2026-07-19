#!/usr/bin/env python3
"""Discovery gateway — a SINGLE 2-storey L-shaped observatory hub.

Matches art_ref/mockups/discovery.png: one connected chunky cube with a SHALLOW
front step (opens at the front corner). The LEFT face is a greebled ladder/truss
wall with teal windows + an orange conduit; the roof carries the two heroes — a
big parabolic SATELLITE DISH (back-left, on a tripod mount) and a horizontal
SENSOR DRUM with a riveted domed end-cap (right roof edge) — plus a teal roof
skylight. Built as ONE solid via isobuild.poly_prism (not abutted cubes).
Generic palette only -> art/recolor.py reskins it. 13-char palette only.
"""
import sys, os, json, math
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from iso import Canvas
from isobuild import poly_prism

PAL = {"K": "#241f38", "W": "#e2dcf0", "L": "#cdc6e2", "M": "#b0a6ca", "D": "#897ea6",
       "d": "#6f6592", "h": "#d2f7f4", "c": "#a0efea", "g": "#41d2d0", "G": "#23808b",
       "o": "#ff9243", "O": "#ffc089", "r": "#d9641f"}


def pane(cv, A, B, t0, t1, v0, v1, glass="g", hi="h", shade="G", frame="K"):
    """A framed glass window that reads as GLASS (sky-reflection gradient + shine
    streak) on a wall face whose top edge runs A->B, dropping v px."""
    def pt(t, v):
        return (A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t + v)
    Hp = v1 - v0
    cv.fill_poly([pt(t0, v0), pt(t1, v0), pt(t1, v1), pt(t0, v1)], glass)
    cv.fill_poly([pt(t0, v0), pt(t1, v0), pt(t1, v0 + max(1, Hp * 0.3)), pt(t0, v0 + max(1, Hp * 0.3))], hi)
    cv.fill_poly([pt(t0, v1 - max(1, Hp * 0.22)), pt(t1, v1 - max(1, Hp * 0.22)), pt(t1, v1), pt(t0, v1)], shade)
    cv.line(pt(t0 + (t1 - t0) * 0.22, v0 + Hp * 0.62), pt(t0 + (t1 - t0) * 0.55, v0 + 1), "W")
    for a, b in [(pt(t0, v0), pt(t1, v0)), (pt(t0, v1), pt(t1, v1)),
                 (pt(t0, v0), pt(t0, v1)), (pt(t1, v0), pt(t1, v1))]:
        cv.line(a, b, frame)


def satellite_dish(cv, dcx, dcy, rx, ry, tilt):
    """A parabolic dish you look INTO: a full elliptical K rim ring, a CONCAVE
    interior (shadow D/d tucked under the overhanging UPPER rim, grading down to
    a bright W highlight on the LOWER-inner curve, so it reads as a bowl catching
    light from above), a K feed-arm to a feed node at the focus, on a short K
    tripod mount."""
    # short tripod mount (drawn first so the dish body overlaps its top)
    footy = dcy + ry + 3     # short mount -> dish nestles onto the roof, not floating
    cv.line((dcx - 3, footy), (dcx - 1, dcy + ry - 3), "K")
    cv.line((dcx + 3, footy), (dcx + 1, dcy + ry - 3), "K")
    cv.line((dcx, footy + 1), (dcx, dcy + ry - 4), "d")
    cv.line((dcx - 4, footy), (dcx + 4, footy), "K")   # feet spread on the roof
    # concave interior — INVERTED shading: dark under the upper rim, bright at the
    # lower-inner curve (opposite of a convex dome) so it reads as a cup
    for yy in range(-ry, ry + 1):
        for xx in range(-rx, rx + 1):
            e = (xx / rx) ** 2 + (yy / ry) ** 2
            if e <= 1.0:
                py = dcy + yy + xx * tilt
                f = yy / ry                          # -1 far/upper rim .. +1 near/lower
                if f < -0.50:
                    col = "D"                        # deep shadow under the far/upper rim
                elif f < -0.18:
                    col = "d"
                elif f < 0.12:
                    col = "M"
                elif f < 0.48:
                    col = "L"
                else:
                    col = "W"                        # bright near/lower inner pool
                cv.set(dcx + xx, py, col)
    # inner-rim crescents that sell the cup: a dark band hugging the UPPER inner
    # rim, a bright band hugging the LOWER inner rim
    for a in range(0, 360, 2):
        cs, sn = math.cos(math.radians(a)), math.sin(math.radians(a))
        for k in (0.90, 0.78, 0.66):
            px = dcx + rx * cs * k
            py = dcy + ry * sn * k + rx * cs * k * tilt
            if sn < -0.12:
                cv.set(px, py, "D" if k > 0.82 else "d")  # deep overhang shadow, far/upper rim
            elif sn > 0.42:
                cv.set(px, py, "W" if k > 0.82 else "L")  # bright pool hugging the near/lower rim
    # full elliptical K rim ring (dense 1deg step -> crisp, unbroken ellipse, no
    # stair-step bump on the shallow upper arc)
    for a in range(0, 360, 1):
        rxx = rx * math.cos(math.radians(a))
        ryy = ry * math.sin(math.radians(a))
        cv.set(dcx + rxx, dcy + ryy + rxx * tilt, "K")
    # feed arm: strut from the lower rim up to a feed node at the focus
    focus = (dcx + 1, dcy - 2)
    cv.line((dcx, dcy + ry - 1), focus, "K")
    for nx, ny in [(0, 0), (1, 0), (0, -1), (1, -1)]:
        cv.set(focus[0] + nx, focus[1] + ny, "d")
    cv.set(focus[0], focus[1], "K")
    cv.set(focus[0] + 1, focus[1] - 1, "W")           # feed-node glint


def sensor_drum(cv, nx, ny, r, ax, ay):
    """A horizontal CYLINDER drum lying on the roof: the near end is a FLAT
    circular metal face (a drum lid, NOT a domed ball) ringed by a bold ORANGE
    band; a short lit/shaded barrel recedes up-left along (ax,ay). The flat lid +
    straight banded sides + orange rim are the cylinder-vs-sphere tell."""
    Ln = math.hypot(ax, ay)
    ux, uy = ax / Ln, ay / Ln            # axis unit (receding up-left)
    px, py = -uy, ux                     # perpendicular unit
    fx, fy = nx + ax, ny + ay            # far cap centre

    def edge(cx, cy, s):
        return (cx + px * r * s, cy + py * r * s)

    tn, tf = edge(nx, ny, 1), edge(fx, fy, 1)
    bn, bf = edge(nx, ny, -1), edge(fx, fy, -1)
    # barrel body: dark base, lit mid strip, bright top strip + rim highlight so
    # the cross-section reads round
    cv.fill_poly([tf, tn, bn, bf], "D")
    mn = (nx + px * r * 0.25, ny + py * r * 0.25)
    mf = (fx + px * r * 0.25, fy + py * r * 0.25)
    cv.fill_poly([tf, tn, mn, mf], "M")
    hn = (nx + px * r * 0.78, ny + py * r * 0.78)
    hf = (fx + px * r * 0.78, fy + py * r * 0.78)
    cv.fill_poly([tf, tn, hn, hf], "L")
    cv.line(tf, tn, "W")                 # bright top rim highlight
    cv.line(tf, bf, "K")                 # far end rim (back of the drum)
    cv.line(bf, bn, "K")                 # far/bottom rim -> grounds the barrel

    def ring(fr, ch, shade=None):
        c0x, c0y = nx + ax * fr, ny + ay * fr
        cv.line((c0x + px * r, c0y + py * r), (c0x - px * r, c0y - py * r), ch)
        if shade:
            cv.line((c0x + px * r - ux, c0y + py * r - uy),
                    (c0x - px * r - ux, c0y - py * r - uy), shade)
    ring(0.42, "K", "d")                 # K seam banding the barrel behind the cap
    # near end: a FLAT circular metal lid, ringed by a bold ORANGE band. A flat
    # two-tone lid (not a radial dome) is what reads as a drum end, not a ball.
    ri = int(round(r))
    for yy in range(-ri, ri + 1):
        for xx in range(-ri, ri + 1):
            if xx * xx + yy * yy <= r * r:
                cv.set(nx + xx, ny + yy, "L" if (xx + yy) < -r * 0.2 else "M")
    for a in range(0, 360, 3):           # bold orange rim band inside the K rim
        cs, sn = math.cos(math.radians(a)), math.sin(math.radians(a))
        band = "o" if (cs + sn) < 0 else "r"     # lit upper-left = bright o
        for k in (0.92, 0.80):
            cv.set(nx + r * cs * k, ny + r * sn * k, band)
    for a in range(0, 360, 2):           # crisp K cap rim
        cv.set(nx + r * math.cos(math.radians(a)), ny + r * math.sin(math.radians(a)), "K")
    cv.set(nx, ny, "K")                   # central sensor hub bolt
    cv.set(nx - 1, ny - 1, "W")           # lens glint
    cv.set(nx - 2, ny - 2, "W")


def build():
    cv = Canvas(64, 64)
    W, H, aw, bd = 13, 13, 6, 12     # bd 12: a 1-unit SHALLOW front step -> one unified cube, thin seam
    TOP = (32, 12); Hh = 22
    L = [(0, 0), (W, 0), (W, bd), (aw, bd), (aw, H), (0, H)]
    poly_prism(cv, L, TOP, Hh, roof="L", lwall="M", rwall="D")

    def scr(u, v):
        return (TOP[0] + 2 * u - 2 * v, TOP[1] + u + v)

    # ── key face top-edge corners ─────────────────────────────────────────────
    lf_a, lf_b = scr(aw, H), scr(0, H)      # LEFT lit face (left-arm front)
    sf_a, sf_b = scr(W, H - (H - bd)), None  # placeholder
    rstep_a, rstep_b = scr(W, bd), scr(aw, bd)   # right-arm front-lit face
    rs_a, rs_b = scr(W, 0), scr(W, bd)      # RIGHT shaded face (right side)

    # ── ROOF SKYLIGHT / solar panel: a tilted rectangular glass GRID set into the
    # roof, back-of-centre to the RIGHT of the dish and left of the drum (the
    # reference's angled green gridded roof panel). g/G glass with an h/c sky
    # highlight + a crisp 2x2 K mullion grid and K frame, flush on the roof plane.
    su0, su1, sv0, sv1 = 7.6, 10.6, 5.7, 8.5
    sk = [scr(su0, sv0), scr(su1, sv0), scr(su1, sv1), scr(su0, sv1)]
    cv.fill_poly(sk, "g")                                                          # teal glass body
    cv.fill_poly([scr(su0, sv0), scr(su1, sv0),
                  scr(su1, sv0 + 0.9), scr(su0, sv0 + 0.9)], "h")                  # bright sky-reflection band (back edge)
    cv.line(scr(su0 + 0.3, sv1 - 0.4), scr(su1 - 0.6, sv0 + 0.5), "c")             # diagonal shine streak
    cv.fill_poly([scr(su0, sv1 - 0.6), scr(su1, sv1 - 0.6),
                  scr(su1, sv1), scr(su0, sv1)], "G")                              # shaded sill (front edge)
    smid_u, smid_v = (su0 + su1) / 2, (sv0 + sv1) / 2
    cv.line(scr(smid_u, sv0), scr(smid_u, sv1), "K")                               # vertical mullion
    cv.line(scr(su0, smid_v), scr(su1, smid_v), "K")                               # horizontal mullion -> 2x2 grid
    for i in range(len(sk)):                                                        # crisp 1px K frame, flush on the roof
        cv.line(sk[i], sk[(i + 1) % len(sk)], "K")

    # ── ORANGE TRIM: front eaves (roof/wall) + wraparound base bands ───────────
    for a, b in [(scr(aw, H), scr(0, H)), (scr(0, H), scr(0, 0)),   # left eaves
                 (scr(W, bd), scr(aw, bd)), (scr(aw, bd), scr(aw, H)),  # step eaves
                 (scr(W, 0), scr(W, bd))]:                          # right eave
        cv.line(a, b, "o")
    # base bands wrap the three front faces (bright o on lit, darker r on shaded)
    def baseband(a, b, ch):
        cv.line((a[0], a[1] + Hh - 1), (b[0], b[1] + Hh - 1), ch)
    baseband(scr(aw, H), scr(0, H), "o")          # left face base
    baseband(scr(W, bd), scr(aw, bd), "o")        # right-arm front base
    baseband(scr(W, 0), scr(W, bd), "r")          # right shaded face base

    # 2nd-storey ledge across the left face
    cv.line((lf_a[0], lf_a[1] + 11), (lf_b[0], lf_b[1] + 11), "d")

    # ── LEFT (lit) face: a legible ladder/truss + teal windows + conduit ───────
    # one clean teal window toward the front of the face
    pane(cv, lf_a, lf_b, 0.10, 0.40, 4, 12, glass="g")

    def lpt(t, v):
        return (lf_a[0] + (lf_b[0] - lf_a[0]) * t,
                lf_a[1] + (lf_b[1] - lf_a[1]) * t + v)

    # one diagonal orange conduit running down the middle of the face
    cv.line(lpt(0.46, 2), lpt(0.52, 20), "o")
    for tt in (0.47, 0.50):
        cv.set(*lpt(tt, 11), "K")                   # bolt studs on the conduit

    # ── LEFT lattice / truss tower on the far-left silhouette edge ─────────────
    # A legible iso truss (reference's signature cross-braced tower): two clean K
    # rails + a SINGLE diagonal per bay (an N-pattern zig-zag, NOT overlapping X
    # mud), with r RED bracing accents and o/O joint nodes. The outer rail juts
    # ~2px past the left wall corner (x=6) into open bg so it reads as a
    # free-standing lattice mast, not on-face speckle.
    mt_l, mt_r = (5, 27), (10, 28)      # top rail ends (by the roof-left corner)
    mb_l, mb_r = (4, 48), (9, 49)       # base rail ends (jut past the x=6 edge)
    N = 4

    def mL(i):
        return (mt_l[0] + (mb_l[0] - mt_l[0]) * i / N, mt_l[1] + (mb_l[1] - mt_l[1]) * i / N)

    def mR(i):
        return (mt_r[0] + (mb_r[0] - mt_r[0]) * i / N, mt_r[1] + (mb_r[1] - mt_r[1]) * i / N)

    cv.line(mt_l, mb_l, "K")            # outer rail (juts left of the wall corner)
    cv.line(mt_r, mb_r, "K")            # inner rail (leans on the wall corner)
    for i in range(N + 1):              # horizontal rungs
        cv.line(mL(i), mR(i), "K")
    for i in range(N):                  # one diagonal per bay -> clean zig-zag
        a = mL(i) if i % 2 == 0 else mR(i)
        b = mR(i + 1) if i % 2 == 0 else mL(i + 1)
        cv.line(a, b, "r" if i in (0, 2) else "K")   # red bracing on alternate bays
    for i in range(N + 1):              # bright o nodes at the rail joints
        cv.set(*mL(i), "o")
        cv.set(*mR(i), "o")
    cv.set(*mR(0), "O")                 # one bright node glint at the top

    # ── RIGHT-arm front face: recessed entry door near the step ────────────────
    def spt(t, v):
        return (rstep_a[0] + (rstep_b[0] - rstep_a[0]) * t,
                rstep_a[1] + (rstep_b[1] - rstep_a[1]) * t + v)
    door = [spt(0.62, 10), spt(0.90, 10), spt(0.90, 20), spt(0.62, 20)]
    cv.fill_poly(door, "d")
    for i in range(len(door)):
        cv.line(door[i], door[(i + 1) % len(door)], "K")
    cv.line(spt(0.62, 10), spt(0.62, 20), "K")
    # light front-face frame lines for density: a corner pilaster + a mid ledge
    cv.line(spt(0.10, 2), spt(0.10, 20), "d")
    cv.line(spt(0.10, 9), spt(0.58, 9), "d")

    # ── RIGHT (shaded) face: a SPECTROMETER readout window, low ────────────────
    # Deliberately NOT a plain teal pane like the left glass — vertical stripe
    # banding that reads as a spectral display: cool->warm columns (G g c h) with
    # one bright o/O peak stripe, inside a clean K frame.
    def rpt(t, v):
        return (rs_a[0] + (rs_b[0] - rs_a[0]) * t, rs_a[1] + (rs_b[1] - rs_a[1]) * t + v)
    rw0, rw1, rv0, rv1 = 0.34, 0.70, 10, 18
    bands = ["G", "g", "c", "h", "o"]
    nb = len(bands)
    for i, ch in enumerate(bands):
        ta = rw0 + (rw1 - rw0) * i / nb
        tb = rw0 + (rw1 - rw0) * (i + 1) / nb
        cv.fill_poly([rpt(ta, rv0), rpt(tb, rv0), rpt(tb, rv1), rpt(ta, rv1)], ch)
    to = rw0 + (rw1 - rw0) * 4.5 / nb                  # bright O peak glint on the orange band
    cv.set(*rpt(to, rv0 + 1), "O")
    for a, b in [(rpt(rw0, rv0), rpt(rw1, rv0)), (rpt(rw0, rv1), rpt(rw1, rv1)),
                 (rpt(rw0, rv0), rpt(rw0, rv1)), (rpt(rw1, rv0), rpt(rw1, rv1))]:
        cv.line(a, b, "K")                             # clean K frame
    # short diagonal support strut tying the roof-edge drum tank down to the base
    # on the right face (reference's right-side support leg), right of the readout
    # window and below the drum. K shadow core + M lit edge so it reads on the D
    # wall (a plain D beam would vanish into the D-toned right face).
    cv.line((51, 31), (54, 45), "K")   # shadowed core of the strut
    cv.line((50, 31), (53, 45), "M")   # lit upper-left edge of the beam

    # ── ROOF HEROES (drawn last so they overlay the roof + eaves) ──────────────
    # right sensor drum on the right roof edge
    sensor_drum(cv, 47, 26, 6, -11, -8)
    # satellite dish on the back-left roof, tilted up-left, on its tripod mount
    satellite_dish(cv, 22, 17, 11, 10, 0.16)

    # ── roof ANTENNA mast: foot ANCHORED on the back-centre roof, rising up-right
    # to an o beacon (the drawing's up-right antenna line, now attached to the
    # roof instead of floating).
    amb = scr(4.6, 2.2)                       # foot, on the roof surface
    amt = (amb[0] + 9, amb[1] - 11)           # tip, up-right into open sky
    cv.line(amb, amt, "K")
    cv.line((amb[0] + 1, amb[1]), (amt[0] + 1, amt[1]), "d")     # 2px mast body
    cv.set(amb[0], amb[1], "K")               # foot stud on the roof
    cv.line((amt[0] - 2, amt[1] + 1), (amt[0] + 3, amt[1] - 2), "K")  # dipole crossbar
    cv.set(amt[0], amt[1], "o")               # beacon
    cv.set(amt[0], amt[1] - 1, "O")           # beacon glint

    spec = {"width": 64, "height": 64, "palette": PAL, "rows": ["".join(r) for r in cv.px]}
    json.dump(spec, open("art/src/discovery_generic.json", "w"))
    import subprocess
    subprocess.run(["art/.venv/bin/python3", "art/render_pixel_art.py", "art/src/discovery_generic.json",
                    "-o", "apps/web/public/sprites/gateways/discovery_generic.png",
                    "--preview", "art/preview/discovery_generic.png", "--preview-scale", "8"], check=True)
    print("built discovery")


if __name__ == "__main__":
    build()
