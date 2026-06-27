#!/usr/bin/env python3
"""Scienium logo — laurel wreath encircling an atom. Reproducible pixel-art.

Laurel = the Greek gymnasium/academy (scholarship, achievement); atom = science.
Rendered in shaded gold + a cyan atom, matching the app's pixel aesthetic.

Run:  python3 art/logo_scienium.py
Writes:
  apps/web/public/scienium-logo.png        # the live app logo (80x80, color)
  art/preview_logo/scienium_laurel_color.png
  art/preview_logo/scienium_laurel_gold.png # simplified single-gold variant
  art/preview_logo/scienium-logo@480.png    # 6x hi-res, for favicons / slides
"""
from __future__ import annotations
import math, os
from PIL import Image

OUT = "art/preview_logo"
GOLD = (248, 231, 137, 255)                 # #f8e789 — simplified single-gold
PAL = {                                      # color mode
    "K": (27, 21, 51, 255),                  # outline / deep navy
    "H": (255, 241, 166, 255),               # gold highlight
    "B": (245, 197, 24, 255),                # gold base  (#f5c518 brand)
    "D": (182, 132, 26, 255),                # gold shadow (amber)
    "h": (189, 246, 239, 255),               # cyan highlight
    "g": (84, 220, 210, 255),                # cyan base
    "d": (43, 154, 160, 255),                # cyan shadow
}

# ----------------------------------------------------------------- primitives
def px(s, x, y): s.add((int(round(x)), int(round(y))))
def line(s, x0, y0, x1, y1):
    x0, y0, x1, y1 = map(int, (x0, y0, x1, y1))
    dx, dy = abs(x1 - x0), abs(y1 - y0)
    sx = 1 if x0 < x1 else -1; sy = 1 if y0 < y1 else -1
    err = dx - dy
    while True:
        px(s, x0, y0)
        if x0 == x1 and y0 == y1: break
        e2 = 2 * err
        if e2 > -dy: err -= dy; x0 += sx
        if e2 < dx: err += dx; y0 += sy
def thickline(s, x0, y0, x1, y1, w=1):
    line(s, x0, y0, x1, y1)
    for k in range(1, w):
        line(s, x0 + k, y0, x1 + k, y1); line(s, x0, y0 + k, x1, y1 + k)
def orbit(s, cx, cy, a, b, ang):
    ca, sa = math.cos(ang), math.sin(ang)
    n = 600
    for i in range(n + 1):
        th = 2 * math.pi * i / n
        ex, ey = a * math.cos(th), b * math.sin(th)
        px(s, cx + ex * ca - ey * sa, cy + ex * sa + ey * ca)
def disc(s, cx, cy, r):
    for y in range(int(cy - r), int(cy + r) + 1):
        for x in range(int(cx - r), int(cx + r) + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.4: px(s, x, y)
def polar(cx, cy, r, deg):
    a = math.radians(deg); return (cx + r * math.cos(a), cy + r * math.sin(a))
def fill_ellipse(s, cx, cy, a, b, ang):
    ca, sa = math.cos(ang), math.sin(ang)
    rad = int(math.ceil(max(a, b))) + 1
    for y in range(int(cy) - rad, int(cy) + rad + 1):
        for x in range(int(cx) - rad, int(cx) + rad + 1):
            xr = (x - cx) * ca + (y - cy) * sa
            yr = -(x - cx) * sa + (y - cy) * ca
            if (xr / a) ** 2 + (yr / b) ** 2 <= 1.05: px(s, x, y)

# ----------------------------------------------------------------- the logo
def atom(glass, cx, cy, R):
    """Textbook atom: small nucleus, 3 distinct elliptical rings, an electron on each."""
    b = R * 0.42
    for deg in (0, 60, 120):
        orbit(glass, cx, cy, R, b, math.radians(deg))
    disc(glass, cx, cy, max(2, R * 0.16))                 # nucleus
    for deg in (0, 120, 240):                             # one electron per ring (on its rim)
        ex, ey = polar(cx, cy, R, deg)
        disc(glass, ex, ey, max(1.5, R * 0.13))

def design_laurel():
    N = 80
    body, glass = set(), set()
    cx, cy, R = 40, 42, 28
    atom(glass, cx, 36, 16)                       # atom framed by the open wreath

    def branch(degs):
        pts = [polar(cx, cy, R, d) for d in degs]
        for i in range(len(pts) - 1):             # woody stem (3px)
            thickline(body, *pts[i], *pts[i + 1], w=3)
        for i in range(1, len(degs) - 1, 2):      # a teardrop leaf every other step
            bx, by = pts[i]
            nx, ny = polar(cx, cy, R, degs[i + 1])
            stem_ang = math.atan2(by - ny, bx - nx) + math.pi    # along stem, toward top
            out_ang = math.radians(degs[i])                      # radial outward
            phi = math.atan2(0.6 * math.sin(stem_ang) + 0.5 * math.sin(out_ang),
                             0.6 * math.cos(stem_ang) + 0.5 * math.cos(out_ang))
            L = 8.0
            fill_ellipse(body, bx + L * 0.55 * math.cos(phi),
                         by + L * 0.55 * math.sin(phi), L, 3.0, phi)

    branch(list(range(100, 250, 11)))             # left:  bottom -> upper-left
    branch(list(range(80, -70, -11)))             # right: bottom -> upper-right
    thickline(body, *polar(cx, cy, R, 100), cx - 2, cy + 10, w=2)   # crossed base
    thickline(body, *polar(cx, cy, R, 80), cx + 2, cy + 10, w=2)
    disc(body, cx, cy + 12, 2)                     # berry
    return N, N, {"body": body, "glass": glass}

# ----------------------------------------------------------------- render
def bbox(pts, w, h):
    ps = [(x, y) for (x, y) in pts if 0 <= x < w and 0 <= y < h]
    xs = [x for x, _ in ps]; ys = [y for _, y in ps]
    return min(xs), min(ys), max(xs), max(ys)

def render_gold(w, h, layers):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for layer in layers.values():
        for (x, y) in layer:
            if 0 <= x < w and 0 <= y < h: img.putpixel((x, y), GOLD)
    return img

def render_color(w, h, layers):
    body, glass = layers.get("body", set()), layers.get("glass", set())
    content = body | glass
    _, ymin, _, ymax = bbox(content, w, h)
    span = max(1, ymax - ymin)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    def put(x, y, col):
        if 0 <= x < w and 0 <= y < h: img.putpixel((x, y), col)
    for (x, y) in body:                            # dark outline around the gold body
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                n = (x + dx, y + dy)
                if n not in content: put(n[0], n[1], PAL["K"])
    def shade(y, hi, mid, lo):
        f = (y - ymin) / span
        return PAL[hi] if f < 0.34 else PAL[mid] if f < 0.7 else PAL[lo]
    for (x, y) in body:  put(x, y, shade(y, "H", "B", "D"))
    for (x, y) in glass: put(x, y, shade(y, "h", "g", "d"))
    return img

def main():
    os.makedirs(OUT, exist_ok=True)
    w, h, layers = design_laurel()
    color, gold = render_color(w, h, layers), render_gold(w, h, layers)
    color.save(f"{OUT}/scienium_laurel_color.png")
    gold.save(f"{OUT}/scienium_laurel_gold.png")
    color.resize((w * 6, h * 6), Image.NEAREST).save(f"{OUT}/scienium-logo@480.png")
    color.save("apps/web/public/scienium-logo.png")    # the live app asset
    print("wrote apps/web/public/scienium-logo.png + previews in art/preview_logo/")

if __name__ == "__main__":
    main()
