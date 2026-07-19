#!/usr/bin/env python3
"""Nature DECORATION sprites — low textured SHRUBS + varied ROCKS (no trees) — scattered
on the grass by components/lab/DecorationLayer.tsx. Code-generated (char-grid JSON -> PNG),
transparent background. Each TYPE has its own silhouette (not one shape rescaled): shrubs
are low, dark, leafy clumps matching the ground-bush tiles; rocks come as round boulders,
craggy rocks, stone clusters, and flat slabs.

Run:  art/.venv/bin/python3 art/build_decor.py
"""
import sys, os, json, math, random, subprocess

ART = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ART)
from iso import Canvas

PAL = {
    "K": "#22331e",   # dark leaf/rock outline
    "1": "#a8cf72",   # leaf highlight
    "2": "#83bb58",   # leaf light
    "3": "#5da356",   # leaf mid
    "4": "#3f7e46",   # leaf dark (shrub base tone)
    "5": "#2c5c37",   # leaf shadow
    "S": "#b1b8bf",   # rock light
    "s": "#7b828a",   # rock mid
    "z": "#565c63",   # rock shadow
    "R": "#31414a",   # rock outline (cool)
    "p": "#e88fb0",   # berry/flower pink
    "f": "#ffe14d",   # tiny flower
}


def rad(a):
    return math.radians(a)


# ── SHRUBS: low, dark, textured leafy clumps (the "old bush" look) ────────────
def leaf_blob(cv, cx, cy, rx, ry, seed):
    """A leafy blob in the darker shrub palette (base 4, lit 3/2, shadow 5), dithered."""
    rng = random.Random(seed)
    for yy in range(-int(ry) - 1, int(ry) + 2):
        for xx in range(-int(rx) - 1, int(rx) + 2):
            if rx <= 0 or ry <= 0:
                continue
            if (xx / rx) ** 2 + (yy / ry) ** 2 <= 1.0:
                s = (xx + yy) / (rx + ry)
                col = "2" if s < -0.5 else "3" if s < -0.08 else "4" if s < 0.42 else "5"
                cv.set(cx + xx, cy + yy, col)
    for _ in range(int(rx * ry / 2.5)):        # leaf dither
        ang = rng.uniform(0, 6.28); r = rng.uniform(0.15, 0.85)
        cv.set(cx + math.cos(ang) * rx * r, cy + math.sin(ang) * ry * r, "5" if rng.random() < 0.55 else "2")
    for a in range(0, 360, 3):                  # K rim
        cv.set(cx + rx * math.cos(rad(a)), cy + ry * math.sin(rad(a)), "K")


def shrub_mound(w, h, seed):   # wide low 3-lobe clump
    cv = Canvas(w, h); cx = w // 2; by = h - 2
    leaf_blob(cv, cx - w * 0.26, by - h * 0.26, w * 0.24, h * 0.32, seed)
    leaf_blob(cv, cx + w * 0.26, by - h * 0.26, w * 0.24, h * 0.32, seed + 1)
    leaf_blob(cv, cx, by - h * 0.40, w * 0.30, h * 0.44, seed + 2)
    return cv


def shrub_round(w, h, seed):   # compact round bush with a small upper lobe
    cv = Canvas(w, h); cx = w // 2; cy = h - int(h * 0.48) - 1
    leaf_blob(cv, cx, cy, w * 0.40, h * 0.44, seed)
    leaf_blob(cv, cx - w * 0.12, cy - h * 0.16, w * 0.22, h * 0.24, seed + 1)
    return cv


def shrub_fern(w, h, seed):    # low clump with spiky fronds sticking up
    cv = Canvas(w, h); cx = w // 2; by = h - 2
    leaf_blob(cv, cx, by - h * 0.20, w * 0.34, h * 0.26, seed)
    for dx, tall, col in [(-5, h - 4, "4"), (-2, h - 2, "3"), (0, h - 1, "2"),
                          (2, h - 2, "3"), (5, h - 4, "4"), (-3, h - 6, "3"), (3, h - 6, "3")]:
        tip = (cx + dx + (1 if dx >= 0 else -1), by - tall)
        cv.line((cx + dx, by), tip, col); cv.set(tip[0], tip[1], "2")
    return cv


def shrub_berry(w, h, seed):   # irregular leafy clump with a few berries
    cv = Canvas(w, h); by = h - 2; rng = random.Random(seed)
    leaf_blob(cv, w * 0.36, by - h * 0.26, w * 0.28, h * 0.34, seed)
    leaf_blob(cv, w * 0.64, by - h * 0.34, w * 0.24, h * 0.40, seed + 1)
    leaf_blob(cv, w * 0.5, by - h * 0.14, w * 0.22, h * 0.22, seed + 2)
    for _ in range(4):                          # berry dots
        x = rng.uniform(w * 0.28, w * 0.72); y = rng.uniform(h * 0.28, h * 0.6)
        cv.set(x, y, "p"); cv.set(x, y - 1, "f" if rng.random() < 0.3 else "p")
    return cv


# ── ROCKS: distinct silhouettes ───────────────────────────────────────────────
def rock_ellipse(cv, cx, cy, rx, ry, crack=True):
    for yy in range(-int(ry), int(ry) + 1):
        for xx in range(-int(rx), int(rx) + 1):
            if (xx / rx) ** 2 + (yy / ry) ** 2 <= 1.0:
                s = (xx + yy) / (rx + ry)
                cv.set(cx + xx, cy + yy, "S" if s < -0.35 else "s" if s < 0.35 else "z")
    for a in range(0, 360, 4):
        cv.set(cx + rx * math.cos(rad(a)), cy + ry * math.sin(rad(a)), "R")
    if crack:
        cv.line((cx - 2, cy - 1), (cx + 1, cy + 2), "z")


def rock_round(w, h, seed):    # a rounded boulder
    cv = Canvas(w, h); rock_ellipse(cv, w // 2, h - int(h * 0.46), w * 0.42, h * 0.42)
    return cv


def rock_crag(w, h, seed):     # an angular, jagged rock
    cv = Canvas(w, h); by = h - 1
    pts = [(2, by), (w * 0.16, h * 0.42), (w * 0.40, h * 0.55), (w * 0.54, h * 0.14),
           (w * 0.72, h * 0.46), (w - 3, h * 0.58), (w - 2, by)]
    cv.fill_poly(pts, "s")
    cv.fill_poly([(2, by), (w * 0.16, h * 0.42), (w * 0.40, h * 0.55), (w * 0.36, by)], "S")   # lit left
    cv.fill_poly([(w * 0.54, h * 0.14), (w * 0.72, h * 0.46), (w - 3, h * 0.58), (w * 0.58, by)], "z")  # shaded right
    for i in range(len(pts)):
        cv.line(pts[i], pts[(i + 1) % len(pts)], "R")
    return cv


def rock_cluster(w, h, seed):  # a scatter of 3 small stones
    cv = Canvas(w, h); by = h - 1
    for ox, rr, ry in [(w * 0.22, w * 0.15, h * 0.30), (w * 0.54, w * 0.19, h * 0.40), (w * 0.80, w * 0.12, h * 0.26)]:
        rock_ellipse(cv, ox, by - ry * 0.7, rr, ry, crack=False)
    return cv


def rock_slab(w, h, seed):     # a low flat slab
    cv = Canvas(w, h); cx = w // 2; cy = h - int(h * 0.38)
    rock_ellipse(cv, cx, cy, w * 0.44, h * 0.32)
    cv.line((int(cx - w * 0.3), cy - 1), (int(cx + w * 0.3), cy - 1), "S")  # flat top edge
    return cv


DECOR = os.path.join(ART, "..", "apps", "web", "public", "sprites", "decor")
SRCD = os.path.join(ART, "src", "decor")

SPECS = [
    ("shrub_mound", lambda: shrub_mound(30, 16, 11)),
    ("shrub_round", lambda: shrub_round(22, 18, 22)),
    ("shrub_fern", lambda: shrub_fern(24, 20, 33)),
    ("shrub_berry", lambda: shrub_berry(26, 18, 44)),
    ("rock_round", lambda: rock_round(20, 16, 55)),
    ("rock_crag", lambda: rock_crag(24, 18, 66)),
    ("rock_cluster", lambda: rock_cluster(28, 14, 77)),
    ("rock_slab", lambda: rock_slab(26, 13, 88)),
]


def emit(name, cv):
    os.makedirs(SRCD, exist_ok=True); os.makedirs(DECOR, exist_ok=True)
    spec = {"width": len(cv.px[0]), "height": len(cv.px), "palette": PAL,
            "rows": ["".join(r) for r in cv.px]}
    p = os.path.join(SRCD, name + ".json")
    json.dump(spec, open(p, "w"))
    subprocess.run(["art/.venv/bin/python3", "art/render_pixel_art.py", p,
                    "-o", os.path.join(DECOR, name + ".png")], check=True)


def main():
    for name, fn in SPECS:
        emit(name, fn())
    print("built", len(SPECS), "decor sprites ->", DECOR)


if __name__ == "__main__":
    main()
