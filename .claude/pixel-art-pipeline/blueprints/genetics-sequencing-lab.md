# Genetics Sequencing Lab — blueprint (bespoke form, STANDARD)

- **Name:** Genetics Sequencing Lab · **Slug:** `genetics-sequencing-lab` · **Lab type:** `biocore`
- **Role:** standard · **Mini-game:** decoding · **Base:** Sequence and align DNA samples

## Set palette (author on these chars→hex exactly)
`K #1a2417` · `W #e8f2d8  L #c4dba6  M #9fc07e  D #6f9456  d #4a6e3a` · `h #d2f7ec  c #9fefcf  g #36cc9e  G #1d8f70` · `o #f0b24d  O #ffd488  r #b9701e`

## BUILT FORM — a NARROW TWO-STORY TOWER with a stepped sequencer setback (NOT the gateway cube)
The most vertical enclosed building: a **narrow two-story tower** — a tall slim `Box` with a smaller stepped-back upper stage and a flat tech roof — reading as a precision sequencing core where the signature helix can climb its full height. Distinct from the Vault's wide stacked block (this is tall + slim), the Aquatic tank (rectilinear, not a cylinder), and every low shed. Clean, high-tech, instrument-dense.
- **Lower stage:** a slim tall `Box` — roughly `Box(top≈(30,16), wx≈9, wy≈8, h≈16)` — `M`/`D` walls with crisp `D`/`d` panel seams and a vertical column of small `c` server/indicator lights on the lit-left.
- **Upper stage (stepped setback):** a smaller `Box` set back on top — roughly `Box(top≈(32,8), wx≈6, wy≈5, h≈6)` — `M`/`D`, a `c` clerestory slit, a small `o` instrument vent.
- **Roofline:** flat tech roof on both tiers (a clear setback step), a thin `D` railing lip, a small `o`/`r` cooling unit — the signature helix rises from a roof emitter beside it.
- **Opening side: RIGHT.** The hero is a tall narrow `K`-framed glass sequencer-bay door on the SHADED RIGHT face — a column of `g`/`c` panes that GLOW (bright lit interior, `h`/`O` instrument light, a hint of a sequencer machine inside) so it reads on the shaded side. Keep the lit-left face plainer (opaque with the small indicator-light column only).

## Signature feature (one-of-one — a rotating DNA double-helix of glowing base-pairs)
**A tall rotating DNA double-helix rises beside the tower — two intertwined glowing strands rung by color-coded base-pairs (A-T-G-C), slowly turning, with one rung lit bright as the sequencer "reads" it bottom-to-top.** No DNA / double-helix / base-pair motif exists anywhere in the catalog.
- **Two helix strands**: two intertwined sine-curve ribbons of `c`/`g` (lit-left strand brighter `c`/`h`, far strand shaded `g`/`G`) climbing the tower's full height, crossing in an X-weave.
- **Base-pair rungs**: short horizontal `K`-pipped bars connecting the strands at each step, color-coded — alternating `O`, `o`, `c`, `g` (the four bases) so it reads as a coded ladder.
- **Reading pulse**: one rung lit bright `W`/`h` (the base currently being read) with a small `O` blip beside it; a faint upward `c` trace shows the read direction (decoding).
- A soft `c` glow halo hugs the helix; a thin `o`/`O` power feed rises from the roof emitter into the helix base; a couple of `h` sparkles.

## Motifs it must honor (BioCore)
The teal `c`/`g`/`G` + amber `o`/`O` glass/glow family for the luminous helix, `D`/`d` panel framing (wood-frame motif as tech panels), soft glow lighting (cool `h` instrument light at the bay, amber `o` on the feed), green precision walls — clean, high-tech, alive.

## Target output paths
- Source JSON → `art/src/buildings/biocore_genetics-sequencing-lab.json`
- Rendered PNG → `apps/web/public/sprites/buildings/biocore/genetics-sequencing-lab.png`
- Preview → `art/preview/buildings/biocore_genetics-sequencing-lab.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (BioCore palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **narrow two-story tower with a stepped sequencer setback** clearly different from the gateways and its BioCore siblings, with the **sequencer-bay opening on the RIGHT (shaded, lit interior)** and a tall rotating DNA double-helix of glowing base-pairs climbing beside it.
