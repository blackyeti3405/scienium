#!/usr/bin/env python3
"""
Isometric BUILDING TOOLKIT for scienium economy buildings.

Where `iso.py` stamps the ONE fixed gateway cube (draw_cube + base_windows), this
module lets a painter compose a BESPOKE building from parametric iso primitives —
prisms of any footprint and height, plus cylinders — so every economy building has
its own silhouette, massing, roofline and glazing instead of a re-skinned gateway
cube. The signature feature then sits on top of an already-distinct structure.

Use this to make buildings DIFFERENT from each other and from the gateways:
  • vary each Box's footprint (wx, wy) and height (h): long low sheds, tall towers,
    wide halls, narrow annexes;
  • STACK / ABUT several Boxes for L-shapes, setbacks, lean-tos, clerestory monitors;
  • add Cylinders for silos, tanks, kilns, extruder towers, domes;
  • author bespoke glazing per face with `Box.left_pt` / `Box.right_pt` (do NOT copy
    the same window strip onto every building).

Projection: standard 2:1 iso on the shared 64x64 canvas. One footprint unit steps
(+2,+1)px along the RIGHT axis and (-2,+1)px along the LEFT axis — so the gateway
cube is exactly Box(top=(32,9), wx=11, wy=11, h=20). Draw BACK volumes before FRONT
ones (painter's algorithm) so nearer masses occlude farther ones.

All palette chars are the shared keys (K W L M D d  h c g G  o O r); a building is
emitted with its set's palette map, exactly like the gateways.
"""
from __future__ import annotations

from iso import Canvas  # reuse Canvas.set / fill_poly / line / rows

# Iso basis (2:1): per footprint unit.
RX, RY = 2, 1   # +right axis: right & down
LX, LY = -2, 1  # +left  axis: left  & down


class Box:
    """An iso rectangular prism.

    `top` is the screen (x,y) of the BACK-TOP corner. `wx` units run toward the
    right corner, `wy` units toward the left corner, and the walls are `h` px tall.
    A square gateway-sized cube is wx=wy=11, h=20.
    """

    def __init__(self, top: tuple[float, float], wx: float, wy: float, h: float):
        self.top = (float(top[0]), float(top[1]))
        self.wx, self.wy, self.h = wx, wy, h
        cx, cy = self.top
        # roof diamond
        self.r_top = (cx, cy)
        self.r_right = (cx + RX * wx, cy + RY * wx)
        self.r_left = (cx + LX * wy, cy + LY * wy)
        self.r_front = (cx + RX * wx + LX * wy, cy + RY * wx + LY * wy)
        # wall bottoms (drop straight down by h)
        self.w_left = (self.r_left[0], self.r_left[1] + h)
        self.w_front = (self.r_front[0], self.r_front[1] + h)
        self.w_right = (self.r_right[0], self.r_right[1] + h)

    # ── face / roof coordinate helpers (place windows, doors, details) ──────────
    def roof_pt(self, u: float, v: float) -> tuple[float, float]:
        """u: left→front edge (0..1). v: left→top edge (0..1). Bilinear over roof."""
        L, F, T = self.r_left, self.r_front, self.r_top
        x = L[0] + u * (F[0] - L[0]) + v * (T[0] - L[0])
        y = L[1] + u * (F[1] - L[1]) + v * (T[1] - L[1])
        return (x, y)

    def left_pt(self, u: float, v: float) -> tuple[float, float]:
        """Left (lit) face. u along r_left→r_front (0..1), v px down."""
        x = self.r_left[0] + u * (self.r_front[0] - self.r_left[0])
        y = self.r_left[1] + u * (self.r_front[1] - self.r_left[1]) + v
        return (x, y)

    def right_pt(self, u: float, v: float) -> tuple[float, float]:
        """Right (shaded) face. u along r_front→r_right (0..1), v px down."""
        x = self.r_front[0] + u * (self.r_right[0] - self.r_front[0])
        y = self.r_front[1] + u * (self.r_right[1] - self.r_front[1]) + v
        return (x, y)

    def apex(self, lift: float) -> tuple[float, float]:
        """A point `lift` px above the roof centre — anchor for rooftop features."""
        cx, cy = self.roof_pt(0.5, 0.5)
        return (cx, cy - lift)

    # ── drawing ─────────────────────────────────────────────────────────────
    def shadow(self, c: Canvas, ch: str = "K") -> None:
        c.fill_poly(
            [(self.w_left[0] - 1, self.w_left[1] + 1), (self.w_front[0], self.w_front[1] + 3),
             (self.w_right[0] + 1, self.w_right[1] + 1), (self.w_front[0], self.w_front[1])],
            ch,
        )

    def draw(self, c: Canvas, roof="L", lwall="M", rwall="D", roof_hi="W",
             outline="K", with_shadow=True) -> "Box":
        """Fill the three visible faces, shade + edge the roof, and outline the
        silhouette. Returns self for chaining."""
        if with_shadow:
            self.shadow(c)
        # faces
        c.fill_poly([self.r_top, self.r_right, self.r_front, self.r_left], roof)
        c.fill_poly([self.r_left, self.r_front, self.w_front, self.w_left], lwall)
        c.fill_poly([self.r_front, self.r_right, self.w_right, self.w_front], rwall)
        # roof shading: lighter back triangle + bright back edges
        c.fill_poly([self.r_top, self.r_left, self.r_front], roof)
        c.line(self.r_top, self.r_left, roof_hi)
        c.line(self.r_top, self.r_right, roof_hi)
        # front vertical recess
        c.line(self.r_front, self.w_front, "d")
        # outline
        for a, b in [
            (self.r_top, self.r_right), (self.r_right, self.r_front),
            (self.r_front, self.r_left), (self.r_left, self.r_top),
            (self.r_left, self.w_left), (self.r_front, self.w_front),
            (self.r_right, self.w_right),
            (self.w_left, self.w_front), (self.w_front, self.w_right),
        ]:
            c.line(a, b, outline)
        return self

    def window(self, c: Canvas, face: str, u0, u1, v0, v1, glass="g",
               hi="h", shade="G", frame="K", mullions=0, sheen="W") -> None:
        """A framed glazed panel that READS AS GLASS — not a flat blue box.

        The glass tell is a **sky-reflection gradient** (bright band at the top,
        dark sill at the bottom) plus a **diagonal shine streak**; the frame is a
        clean 1px `K`; and any mullions are **soft, sparse dividers** in the dark
        glass tone (NEVER harsh black bars, which is what makes glazing read as a
        black-segmented mess). Prefer a FEW larger panes over many tiny mullioned
        ones, and space multiple windows apart with wall between them.

        `face` is 'left' (lit) or 'right' (shaded). A right-face / interior-lit
        window reads best with brighter `glass`/`hi` so it glows on the dark face.
        """
        pt = self.left_pt if face == "left" else self.right_pt
        uw = float(u1 - u0)
        H = float(v1 - v0)
        topb = max(1.0, round(H * 0.30))   # sky-reflection band at the top
        botb = max(1.0, round(H * 0.22))   # shadowed sill at the bottom
        # glass body + vertical reflection gradient
        c.fill_poly([pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)], glass)
        c.fill_poly([pt(u0, v0), pt(u1, v0), pt(u1, v0 + topb), pt(u0, v0 + topb)], hi)
        c.fill_poly([pt(u0, v1 - botb), pt(u1, v1 - botb), pt(u1, v1), pt(u0, v1)], shade)
        # diagonal shine streak (the glass tell) — a bright pair running up-right
        c.line(pt(u0 + uw * 0.16, v0 + H * 0.66), pt(u0 + uw * 0.50, v0 + 1.0), sheen)
        c.line(pt(u0 + uw * 0.34, v0 + H * 0.66), pt(u0 + uw * 0.66, v0 + 1.0), hi)
        # soft, sparse mullions — dark-glass dividers, never `K`
        for m in range(1, mullions + 1):
            um = u0 + uw * m / (mullions + 1)
            c.line(pt(um, v0 + 1), pt(um, v1 - 1), shade)
        # clean frame on top
        for a, b in [(pt(u0, v0), pt(u1, v0)), (pt(u0, v1), pt(u1, v1)),
                     (pt(u0, v0), pt(u0, v1)), (pt(u1, v0), pt(u1, v1))]:
            c.line(a, b, frame)

    def louver(self, c: Canvas, face: str, u0, u1, v0, v1,
               body="D", slat="K", edge="M", frame="K") -> None:
        """An OPAQUE vent / louver panel — dark recessed body with alternating
        slat-shadow + highlight lines. Use for HVAC vents, server-vent wings, and
        HEPA returns so they read as solid louvers, NOT as glass. (Glass uses
        `window`; vents use this — keep the two visually distinct.)"""
        pt = self.left_pt if face == "left" else self.right_pt
        c.fill_poly([pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)], body)
        v = v0 + 1.0
        while v < v1 - 0.5:
            c.line(pt(u0, v), pt(u1, v), slat)
            c.line(pt(u0, v + 1), pt(u1, v + 1), edge)
            v += 2.0
        for a, b in [(pt(u0, v0), pt(u1, v0)), (pt(u0, v1), pt(u1, v1)),
                     (pt(u0, v0), pt(u0, v1)), (pt(u1, v0), pt(u1, v1))]:
            c.line(a, b, frame)


def cylinder(c: Canvas, cx: float, top_y: float, rx: float, h: float,
             top="L", side_l="M", side_r="D", outline="K", ry: float | None = None) -> dict:
    """A vertical iso cylinder (silo / tank / kiln / extruder tower). `cx,top_y` is
    the centre of the top ellipse; `rx` horizontal radius; `h` wall height. Returns
    {'top':(cx,top_y),'rx','ry','h'} so callers can cap or detail it."""
    if ry is None:
        ry = max(2.0, rx * 0.5)  # 2:1 ellipse

    def ell(yc, fill):
        for yy in range(int(-ry), int(ry) + 1):
            t = 1 - (yy / ry) ** 2
            if t < 0:
                continue
            half = rx * (t ** 0.5)
            for xx in range(int(-half), int(half) + 1):
                c.set(cx + xx, yc + yy, fill)

    # walls: lit left half, shaded right half
    for xx in range(int(-rx), int(rx) + 1):
        t = 1 - (xx / rx) ** 2
        if t < 0:
            continue
        edge = ry * (t ** 0.5)
        col = side_l if xx < 0 else side_r
        for yy in range(int(top_y + edge), int(top_y + edge + h) + 1):
            c.set(cx + xx, yy, col)
    # bottom + top ellipse caps
    ell(top_y + h, side_r)
    ell(top_y, top)
    # outline: top ellipse rim + the two vertical sides + bottom front arc
    for a in range(0, 360, 6):
        import math
        x = cx + rx * math.cos(math.radians(a))
        y = top_y + ry * math.sin(math.radians(a))
        c.set(x, y, outline)
    c.line((cx - rx, top_y), (cx - rx, top_y + h), outline)
    c.line((cx + rx, top_y), (cx + rx, top_y + h), outline)
    for a in range(0, 181, 6):
        import math
        x = cx + rx * math.cos(math.radians(a))
        y = top_y + h + ry * math.sin(math.radians(a))
        c.set(x, y, outline)
    return {"top": (cx, top_y), "rx": rx, "ry": ry, "h": h}


def _point_in_poly(pts, x, y):
    n = len(pts); inside = False; j = n - 1
    for i in range(n):
        xi, yi = pts[i]; xj, yj = pts[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi):
            inside = not inside
        j = i
    return inside


def poly_prism(c: Canvas, corners_uv, top: tuple[float, float], h: float,
               roof="L", lwall="M", rwall="D", roof_hi="W", outline="K") -> dict:
    """A SINGLE extruded iso solid from an arbitrary footprint POLYGON.

    Where `Box` makes one rectangular prism, this makes ONE continuous solid of any
    footprint — L-shapes, T-shapes, notched plans — with one roof, continuous walls,
    and a single silhouette outline (NO internal seams, so it reads as one building,
    not several blocks abutted). `corners_uv` is the footprint polygon in iso units
    (u = +RIGHT axis, v = +LEFT axis), ordered around the outline; `top` is the
    screen (x,y) of unit (0,0), the back-top corner; walls drop `h` px.

    Returns {'top': screen_pts, 'walls': [{'a','b','side'}]} — each front wall face
    with its 'left'(lit) / 'right'(shaded) orientation so callers can place glazing.
    """
    ax, ay = top

    def scr(uv):
        u, v = uv
        return (ax + RX * u + LX * v, ay + RY * u + LY * v)

    pts = [scr(uv) for uv in corners_uv]
    n = len(pts)

    def is_front(a, b):
        return not _point_in_poly(pts, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 2)

    walls = []
    for i in range(n):  # front walls first
        a, b = pts[i], pts[(i + 1) % n]
        if is_front(a, b):
            dx, dy = b[0] - a[0], b[1] - a[1]
            side = "left" if dx * dy > 0 else "right"
            c.fill_poly([a, b, (b[0], b[1] + h), (a[0], a[1] + h)], lwall if side == "left" else rwall)
            walls.append({"a": a, "b": b, "side": side})
    c.fill_poly(pts, roof)  # single roof on top
    for i in range(n):      # brighten the back roof edges for depth
        a, b = pts[i], pts[(i + 1) % n]
        if not is_front(a, b):
            c.line(a, b, roof_hi)
    for i in range(n):      # one continuous silhouette outline
        a, b = pts[i], pts[(i + 1) % n]
        c.line(a, b, outline)
        if is_front(a, b):
            c.line(a, (a[0], a[1] + h), outline)
            c.line(b, (b[0], b[1] + h), outline)
            c.line((a[0], a[1] + h), (b[0], b[1] + h), outline)
    return {"top": pts, "walls": walls}


def dome(c: Canvas, cx: float, cy: float, rx: float, ry: float,
         top="L", shade="M", dark="D", outline="K") -> None:
    """A curved (observatory) roof: a filled half-ellipse dome centred at (cx, cy),
    lit from the upper-left, sitting on a drum/box. rx/ry are the half-extents."""
    import math
    for yy in range(-int(round(ry)), 1):
        t = 1 - (yy / ry) ** 2
        if t < 0:
            continue
        half = rx * (t ** 0.5)
        for xx in range(-int(round(half)), int(round(half)) + 1):
            col = top if xx < -half * 0.15 else (shade if xx < half * 0.55 else dark)
            c.set(cx + xx, cy + yy, col)
    for a in range(180, 361, 3):  # rim arc
        c.set(cx + rx * math.cos(math.radians(a)), cy + ry * math.sin(math.radians(a)), outline)
    c.line((cx - rx, cy), (cx + rx, cy), outline)
