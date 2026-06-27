"""Canonical scienium palette + char mapping, derived from art_ref/scienium_discovery.png.

This is the single source of truth for the building palette. All gateways are
authored with these chars; reskins (recolor.py) remap them per lab type.
"""

# char -> hex.  Groups: K outline | W/L/M/D/d wall (light→dark) | c/h/g/G glass | o/O/r accent
CANON = {
    "K": "#241f38",  # outline / deepest shadow
    "W": "#e2dcf0",  # wall highlight (lightest)
    "L": "#cdc6e2",  # wall light  (roof top / lit face)
    "M": "#b0a6ca",  # wall mid
    "D": "#897ea6",  # wall dark   (shaded face)
    "d": "#6f6592",  # wall darker (deep shade / recess)
    "h": "#d2f7f4",  # glass highlight
    "c": "#a0efea",  # glass light (glow)
    "g": "#41d2d0",  # glass mid
    "G": "#23808b",  # glass dark
    "o": "#ff9243",  # accent orange
    "O": "#ffc089",  # accent light
    "r": "#d9641f",  # accent dark
}

# Reverse lookup hex(lower, no #) -> char, for importing the reference image.
HEX_TO_CHAR = {v.lstrip("#").lower(): k for k, v in CANON.items()}
