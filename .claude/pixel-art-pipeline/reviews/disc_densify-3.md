# Discovery gateway — IMAGE-MATCH review (disc_densify-3)

Reference: `art_ref/mockups/discovery.png`
Render:    `art/preview/discovery_generic.png`
Source:    `art/src/discovery_generic.json` (64×64)

**Verdict: TWEAK**

## Palette check
PASS. Grid uses only canonical chars `D G K L M W c d g h o r` (12 of 13; `O`
declared-but-unused, which is fine). No off-palette characters.

## Fidelity grade

### Silhouette / massing / footprint — GOOD
Cube body + roof dish + right-side protrusion + stepped-down front-lower section
with a door recess. This reads as the same building as the reference; footprint
and overall proportion match. Iso is crisp — clean 2:1 edges, orange trim tracks
the corners tightly, no muddy anti-aliasing.

### Focal features + accents
- **Roof satellite dish** (primary focal): PRESENT and dominant, tilted with a
  central feed arm — good match. Reads slightly FLAT/laid-down vs the reference's
  upright parabolic bowl.
- **Right pod**: MISMATCH. Reference is a horizontal **cylinder drum** (elliptical
  top rim, straight body, bold orange rim band). Render draws a **sphere/ball**.
  Wrong shape on a distinct prop — the main reason this is a TWEAK.
- **Left lattice/truss tower**: UNDER-BUILT. Reference has a prominent external
  crisscross scaffold/antenna mast covering the whole left edge. Render only shows
  a thin column of glass dots + one orange strut — the signature lattice barely
  reads. This is exactly what a densify pass should push further.
- **Roof skylight**: reference has a framed green/teal angled skylight panel on the
  roof; render has a loose teal pixel cluster — reads as scatter, not a panel.
- **Spectrometer window (bottom-right)**: teal glass + orange rim. Reference is a
  rainbow spectrum readout; a full rainbow isn't in the 13-char palette, so the
  teal-glass interpretation is acceptable. Placement/shape are correct.
- **Orange trim**: strong and correct on all edges. Good.

## Concrete tweaks (ranked)
1. **Reshape the right pod from a sphere into a cylinder drum**: elliptical top rim
   (K outline + L/M glass-less top), straight cylindrical sides (M lit / D shaded),
   and a bold `o`/`r` orange rim band around the near end — matching the reference's
   drum-with-orange-ring.
2. **Build up the left truss/lattice tower** on the far-left edge: add dark `K`
   crisscross struts with `o` nodes so it reads as a 3D scaffold/antenna mast, not a
   flat column of dots. This is the building's signature "discovery" silhouette cue.
3. **Tighten the roof skylight** into a rectangular framed panel (`K` frame + `g`/`G`
   glass, `h`/`c` highlight) instead of the loose teal cluster.
4. **Deepen the dish bowl** so it reads as a parabolic dish tilted toward the viewer:
   darker `M`/`D` on the far rim, lighter `W`/`L` in the near interior, keep the feed
   arm. Anchor the floating up-right antenna line to the roof.
