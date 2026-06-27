#!/usr/bin/env python3
"""
Isometric gateway-building generator for scienium.

Matches the style of art_ref/scienium_discovery.png (the canonical Discovery
building): a 2:1 isometric cube with a corner/edge facing the viewer, a visible
lavender roof, glowing cyan glass on the two front faces, and warm orange trim —
so the lab can expand right / left / up / down around the central building.

All sprites are 64×64, authored in the canonical palette (canon.py), and emitted
as char-grid JSON so they reskin via recolor.py like the imported Discovery.

Run:  python art/iso.py        (Discovery is imported separately; this builds the other 6)
"""
from __future__ import annotations

import json
import os

from PIL import Image

from canon import CANON, HEX_TO_CHAR
from render_pixel_art import render

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "art", "src")
PREVIEW_DIR = os.path.join(ROOT, "art", "preview")
GATE_DIR = os.path.join(ROOT, "apps", "web", "public", "sprites", "gateways")

SIZE = 64

# ── Cube geometry (matches the Discovery footprint) ───────────────────────────
CX = 32
ROOF_TOP = 9          # y of the roof's top vertex
HALF = 22             # half the roof diamond width
QUART = 11            # roof diamond half-height (2:1)
WALL_H = 20           # wall height in px

# Roof diamond vertices
R_TOP = (CX, ROOF_TOP)
R_RIGHT = (CX + HALF, ROOF_TOP + QUART)
R_BOT = (CX, ROOF_TOP + 2 * QUART)
R_LEFT = (CX - HALF, ROOF_TOP + QUART)
# Wall bottom vertices
W_LEFT = (R_LEFT[0], R_LEFT[1] + WALL_H)
W_FRONT = (R_BOT[0], R_BOT[1] + WALL_H)
W_RIGHT = (R_RIGHT[0], R_RIGHT[1] + WALL_H)


class Canvas:
    def __init__(self, w=SIZE, h=SIZE):
        self.w, self.h = w, h
        self.px = [["."] * w for _ in range(h)]

    def set(self, x, y, ch):
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < self.w and 0 <= yi < self.h:
            self.px[yi][xi] = ch

    def fill_poly(self, pts, ch):
        ys = [p[1] for p in pts]
        y0, y1 = int(min(ys)), int(max(ys))
        n = len(pts)
        for y in range(y0, y1 + 1):
            yc = y + 0.5
            xs = []
            for i in range(n):
                ax, ay = pts[i]
                bx, by = pts[(i + 1) % n]
                if (ay <= yc < by) or (by <= yc < ay):
                    t = (yc - ay) / (by - ay)
                    xs.append(ax + t * (bx - ax))
            xs.sort()
            for j in range(0, len(xs) - 1, 2):
                for x in range(int(round(xs[j])), int(round(xs[j + 1])) + 1):
                    self.set(x, y, ch)

    def line(self, a, b, ch):
        x0, y0 = int(round(a[0])), int(round(a[1]))
        x1, y1 = int(round(b[0])), int(round(b[1]))
        dx, dy = abs(x1 - x0), abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx - dy
        while True:
            self.set(x0, y0, ch)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 > -dy:
                err -= dy
                x0 += sx
            if e2 < dx:
                err += dx
                y0 += sy

    def rows(self):
        return ["".join(r) for r in self.px]


# ── Face coordinate helpers ───────────────────────────────────────────────────
def roof_pt(u, v):
    """Roof-local coords: u along left→front edge, v along top→right edge (0..1)."""
    # bilinear over the diamond (L at u0v0, F at u1v0, T at u0v1, R at u1v1)
    lx = R_LEFT[0] + u * (R_BOT[0] - R_LEFT[0]) + v * (R_TOP[0] - R_LEFT[0])
    ly = R_LEFT[1] + u * (R_BOT[1] - R_LEFT[1]) + v * (R_TOP[1] - R_LEFT[1])
    return (lx, ly)


def left_pt(u, v):
    """Left face: u along top edge (L→F), v down in px."""
    x = R_LEFT[0] + u * (R_BOT[0] - R_LEFT[0])
    y = R_LEFT[1] + u * (R_BOT[1] - R_LEFT[1]) + v
    return (x, y)


def right_pt(u, v):
    """Right face: u along top edge (F→R), v down in px."""
    x = R_BOT[0] + u * (R_RIGHT[0] - R_BOT[0])
    y = R_BOT[1] + u * (R_RIGHT[1] - R_BOT[1]) + v
    return (x, y)


def iso_window(c, face, u0, u1, v0, v1, mullions=1):
    """A framed cyan window/parallelogram on a face, with bevel + dark frame."""
    pt = left_pt if face == "left" else right_pt
    corners = [pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)]
    c.fill_poly(corners, "g")
    # bevel: lighter top edge, darker bottom edge
    c.line(pt(u0, v0), pt(u1, v0), "c")
    c.line(pt(u0, v0 + 1), pt(u1, v0 + 1), "c")
    c.line(pt(u0, v1), pt(u1, v1), "G")
    # highlight streak
    c.line(pt(u0 + 0.12, v0 + 1), pt(u0 + 0.12, v1 - 1), "h")
    # dark frame around
    c.line(pt(u0, v0), pt(u1, v0), "K")
    c.line(pt(u0, v1), pt(u1, v1), "K")
    c.line(pt(u0, v0), pt(u0, v1), "K")
    c.line(pt(u1, v0), pt(u1, v1), "K")
    # vertical mullions
    for m in range(1, mullions + 1):
        um = u0 + (u1 - u0) * m / (mullions + 1)
        c.line(pt(um, v0), pt(um, v1), "K")


# ── Base cube ─────────────────────────────────────────────────────────────────
def draw_cube(c, roof_ch="L"):
    # drop shadow
    sh = [(W_LEFT[0], W_LEFT[1] + 1), (W_FRONT[0], W_FRONT[1] + 2),
          (W_RIGHT[0], W_RIGHT[1] + 1), (W_FRONT[0], W_FRONT[1] + 2)]
    c.fill_poly([(W_LEFT[0] - 1, W_LEFT[1] + 1), (W_FRONT[0], W_FRONT[1] + 3),
                 (W_RIGHT[0] + 1, W_RIGHT[1] + 1), (W_FRONT[0], W_FRONT[1])], "K")

    # faces
    c.fill_poly([R_TOP, R_RIGHT, R_BOT, R_LEFT], roof_ch)               # roof
    c.fill_poly([R_LEFT, R_BOT, W_FRONT, W_LEFT], "M")                  # left face (lit)
    c.fill_poly([R_BOT, R_RIGHT, W_RIGHT, W_FRONT], "D")               # right face (shaded)

    # roof shading: lighter back-left triangle
    c.fill_poly([R_TOP, R_LEFT, R_BOT], "L")
    c.line(R_TOP, R_LEFT, "W")
    c.line(R_TOP, R_RIGHT, "W")

    # vertical front edge highlight + recess
    c.line(R_BOT, W_FRONT, "d")

    # outline
    for a, b in [(R_TOP, R_RIGHT), (R_RIGHT, R_BOT), (R_BOT, R_LEFT), (R_LEFT, R_TOP),
                 (R_LEFT, W_LEFT), (R_BOT, W_FRONT), (R_RIGHT, W_RIGHT),
                 (W_LEFT, W_FRONT), (W_FRONT, W_RIGHT)]:
        c.line(a, b, "K")


def base_windows(c):
    """The default Discovery-like glazing: two windows left, tall windows right."""
    iso_window(c, "left", 0.12, 0.46, 6, 15, mullions=1)
    iso_window(c, "left", 0.54, 0.88, 6, 15, mullions=1)
    iso_window(c, "right", 0.12, 0.5, 5, 16, mullions=1)
    iso_window(c, "right", 0.56, 0.9, 5, 16, mullions=1)
    # orange sill trim along right roofline
    c.line(right_pt(0.06, 3), right_pt(0.94, 3), "o")


# ── Roof features (drawn on the roof diamond) ─────────────────────────────────
def rf_skylight(c):
    # diagonal cyan skylight panel on the right half of the roof + vent + dome
    for i in range(6):
        f = 0.30 + i * 0.10
        c.line(roof_pt(0.25, f), roof_pt(0.85, f), "g")
    c.fill_poly([roof_pt(0.30, 0.34), roof_pt(0.80, 0.34), roof_pt(0.80, 0.86), roof_pt(0.30, 0.86)], "g")
    # vent box (orange)
    vb = roof_pt(0.22, 0.22)
    c.fill_poly([roof_pt(0.10, 0.18), roof_pt(0.28, 0.18), roof_pt(0.28, 0.34), roof_pt(0.10, 0.34)], "o")
    c.line(roof_pt(0.10, 0.18), roof_pt(0.28, 0.18), "O")
    # small dome / dish
    d = roof_pt(0.80, 0.16)
    c.fill_poly([roof_pt(0.74, 0.10), roof_pt(0.90, 0.10), roof_pt(0.90, 0.22), roof_pt(0.74, 0.22)], "G")
    c.set(d[0], d[1] - 2, "c")


def rf_dome(c):
    # a glass reading dome at roof center
    cx, cy = roof_pt(0.5, 0.5)
    for r, ch in [(9, "K"), (8, "G"), (6, "g"), (3, "c")]:
        for a in range(0, 360, 8):
            import math
            x = cx + r * math.cos(math.radians(a))
            y = cy + r * 0.5 * math.sin(math.radians(a)) - 3
            c.set(x, y, ch)
    # fill dome
    import math
    for yy in range(-8, 1):
        for xx in range(-9, 10):
            if (xx / 9) ** 2 + (yy / 8) ** 2 <= 1:
                c.set(cx + xx, cy + yy - 3, "g" if yy < -2 else "G")
    c.set(cx - 2, cy - 7, "c")
    c.set(cx, cy - 12, "o")  # finial


def rf_antenna_dish(c):
    # central HQ: antenna mast + satellite dish
    base = roof_pt(0.35, 0.45)
    c.line((base[0], base[1]), (base[0] - 1, base[1] - 16), "K")
    c.set(base[0] - 1, base[1] - 17, "o")
    c.set(base[0] - 3, base[1] - 12, "o")
    c.set(base[0] + 2, base[1] - 8, "o")
    # dish
    dcx, dcy = roof_pt(0.72, 0.7)
    c.fill_poly([(dcx - 5, dcy - 7), (dcx + 5, dcy - 9), (dcx + 6, dcy - 4), (dcx - 4, dcy - 2)], "L")
    c.line((dcx - 5, dcy - 7), (dcx + 5, dcy - 9), "W")
    c.set(dcx + 6, dcy - 6, "K")
    c.set(dcx, dcy - 5, "o")
    # roof skylight strip
    c.fill_poly([roof_pt(0.4, 0.2), roof_pt(0.62, 0.2), roof_pt(0.62, 0.42), roof_pt(0.4, 0.42)], "g")


def rf_flag(c):
    # info hub: pennant flag + roof banner
    pole = roof_pt(0.5, 0.5)
    c.line((pole[0], pole[1]), (pole[0], pole[1] - 18), "K")
    c.fill_poly([(pole[0] + 1, pole[1] - 18), (pole[0] + 9, pole[1] - 16),
                 (pole[0] + 1, pole[1] - 12)], "o")
    c.line((pole[0] + 1, pole[1] - 18), (pole[0] + 9, pole[1] - 16), "O")
    # banner panel on roof
    c.fill_poly([roof_pt(0.2, 0.25), roof_pt(0.55, 0.25), roof_pt(0.55, 0.55), roof_pt(0.2, 0.55)], "o")
    c.fill_poly([roof_pt(0.26, 0.31), roof_pt(0.49, 0.31), roof_pt(0.49, 0.49), roof_pt(0.26, 0.49)], "g")


def rf_spire(c):
    # drafting studio: blueprint skylight + a slim spire/weathervane
    c.fill_poly([roof_pt(0.28, 0.3), roof_pt(0.8, 0.3), roof_pt(0.8, 0.82), roof_pt(0.28, 0.82)], "g")
    for f in (0.42, 0.54, 0.66, 0.78):
        c.line(roof_pt(0.28, f), roof_pt(0.8, f), "G")
    for f in (0.45, 0.6, 0.75):
        c.line(roof_pt(f, 0.3), roof_pt(f, 0.82), "G")
    sp = roof_pt(0.5, 0.2)
    c.line((sp[0], sp[1]), (sp[0], sp[1] - 14), "K")
    c.set(sp[0], sp[1] - 15, "o")
    c.line((sp[0] - 3, sp[1] - 12), (sp[0] + 3, sp[1] - 12), "O")


def rf_flags_emblem(c):
    # arena: crossed-swords emblem on roof + twin flags
    cx, cy = roof_pt(0.5, 0.5)
    for d in range(-5, 6):
        c.set(cx + d, cy + d // 1 * 0 + d, "o") if False else None
    for d in range(-6, 7):
        c.set(cx + d, cy + d, "o")
        c.set(cx + d, cy - d, "o")
    c.set(cx, cy, "O")
    for fx in (0.18, 0.82):
        p = roof_pt(fx, 0.4)
        c.line((p[0], p[1]), (p[0], p[1] - 14), "K")
        c.fill_poly([(p[0] + 1, p[1] - 14), (p[0] + 7, p[1] - 12), (p[0] + 1, p[1] - 9)], "o")


def rf_star(c):
    # gallery: big star finial + roof spotlights
    cx, cy = roof_pt(0.5, 0.42)
    cy -= 6
    star = [(0, -9), (2, -3), (8, -3), (3, 1), (5, 7), (0, 3),
            (-5, 7), (-3, 1), (-8, -3), (-2, -3)]
    pts = [(cx + sx, cy + sy) for sx, sy in star]
    c.fill_poly(pts, "o")
    c.fill_poly([(cx + sx * 0.5, cy + sy * 0.5) for sx, sy in star], "O")
    # spotlights
    for f in (0.25, 0.75):
        s = roof_pt(f, 0.8)
        c.fill_poly([(s[0] - 2, s[1]), (s[0] + 2, s[1]), (s[0] + 2, s[1] + 3), (s[0] - 2, s[1] + 3)], "g")


# ── Assemble + emit ───────────────────────────────────────────────────────────
def build(key, roof_feature, windows=base_windows):
    c = Canvas()
    draw_cube(c)
    windows(c)
    roof_feature(c)
    spec = {"width": SIZE, "height": SIZE, "palette": CANON, "rows": c.rows()}
    json.dump(spec, open(os.path.join(SRC_DIR, f"{key}_generic.json"), "w"), indent=0)
    img = render(spec)
    img.save(os.path.join(GATE_DIR, f"{key}_generic.png"))
    big = img.resize((SIZE * 8, SIZE * 8))
    bg = Image.new("RGBA", big.size, (210, 210, 218, 255))
    bg.alpha_composite(big)
    bg.save(os.path.join(PREVIEW_DIR, f"{key}_generic.png"))
    print(f"iso {key}")


def extract_discovery():
    """Import the canonical Discovery building from the reference PNG (native 64×64,
    10px blocks) into a char-grid so it reskins like the procedural buildings."""
    im = Image.open(os.path.join(ROOT, "art_ref", "scienium_discovery.png")).convert("RGBA")
    src = im.load()
    rows = []
    for y in range(SIZE):
        row = ""
        for x in range(SIZE):
            px = src[x * 10 + 5, y * 10 + 5]
            if px[3] == 0:
                row += "."
                continue
            hx = "%02x%02x%02x" % (px[0], px[1], px[2])
            row += HEX_TO_CHAR.get(hx, ".")
        rows.append(row)
    spec = {"width": SIZE, "height": SIZE, "palette": CANON, "rows": rows}
    json.dump(spec, open(os.path.join(SRC_DIR, "discovery_generic.json"), "w"), indent=0)
    img = render(spec)
    img.save(os.path.join(GATE_DIR, "discovery_generic.png"))
    big = img.resize((SIZE * 8, SIZE * 8))
    bg = Image.new("RGBA", big.size, (210, 210, 218, 255))
    bg.alpha_composite(big)
    bg.save(os.path.join(PREVIEW_DIR, "discovery_generic.png"))
    print("iso discovery (from reference image)")


def main():
    os.makedirs(SRC_DIR, exist_ok=True)
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    extract_discovery()
    build("science_fair", rf_flag)
    build("literature_review", rf_dome)
    build("operations_hub", rf_antenna_dish)
    build("research_plan", rf_spire)
    build("pvp", rf_flags_emblem)
    build("showcase", rf_star)


if __name__ == "__main__":
    main()
