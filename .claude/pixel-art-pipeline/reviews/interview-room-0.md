# Review: Interview Room (mindframe) — round 0

**VERDICT: TWEAK**

## Per-criterion notes

1. **True isometric (2:1)?** YES. The back mirror-wall block and the right fin both ride clean 2:1 iso edges; the floor platform diamond is correctly 2:1. No skew.

2. **Correct 3/4 top-down framing, roof/floor visible?** YES. The thin `M` canopy slab on top of the back block is visible from above, and the open `D`/`d` booth floor reads as a top-down platform. Good 3/4 read.

3. **Front CORNER faces viewer?** YES. A front corner of the floor platform points at the viewer (front-bottom apex around col ~32, with the two floor faces splaying left and right). Massing reads as a corner-on open booth.

4. **Sharp / clean K outline / GLASS not barred grid?** MOSTLY YES. 13 opaque colors counted, all on the MindFrame palette (the only "off" values are the transparency checkerboard, not sprite pixels) — no off-palette, no AA mush. The big back **one-way mirror** is the strong point: it reads as a silvered pane with a diagonal `h`/`o` sheen sweep and a soft `M`/`L` body, NOT a black-mullion grid — exactly the contract. The right fin reception window is a clean small `c`/`G` pane. PASS on glazing.

5. **Cohesive with MindFrame palette + motifs?** YES. Muted indigo/violet `M`/`D`/`d` walls, magenta `o`/`O` accent strip along the canopy lip, mirror, booth seating, soft-glow voiceprint, glass screen — all present and on-tone.

6. **True one-of-one — signature present, legible, distinct?** PARTIAL. The voiceprint **speech-bubble** reads (center-upper booth: a `W`/`h` bubble holding vertical `o`/`O` waveform bars — a true stacked-bar cluster, not a single scope line — good). The mirror tell reads. BUT the two hero pieces are weak: (a) the **two seated figures facing across the table do not clearly read** — they clump into the dark booth floor and merge with the bright table, so "two people in dialogue" is muddy rather than instantly legible; (b) the **popped subject ID tag** (clipboard card with name-line + checkmark) is effectively absent/lost — I cannot find a distinct `W`/`L` card above the subject. Two of the four signature beats are not landing.

7. **Attractive?** YES, overall — the mirror sheen + magenta canopy glow + open-booth massing are pleasant and atmospheric.

8. **Unique built form / reads as OPEN?** YES. Clearly NOT the gateway cube and not stock-two-windows-per-face: it's a low open pavilion (back mirror block + side fin + open exposed booth floor) with its own silhouette. The opening reads OPEN — the booth interior is exposed to the viewer with the hero playing out in front of the mirror. Distinct from the round/sunken Focus Group.

## Tweak list (painter-actionable)

1. **TWO SEATED FIGURES — separate them from floor + table (highest priority).** In the booth floor center (the dark mass flanking the bright table cube, roughly cols 26–38, rows 40–48), the two `d`/`D` silhouettes are merging into the `K`/`d` floor and into the bright `W` table so neither figure reads. Rebuild each figure as a compact, clearly-separated silhouette: a `d` body block (~2–3px wide) with a distinct `d`/`D` oval head sitting one row ABOVE the table top edge, one figure left of the table and one right, **both turned toward each other**. Give each head a 1px `K` outline against the floor and a 1px gap of `M`/`D` floor between figure and table so they don't clump. Backlight the subject's head with 1–2 `o` pixels (per blueprint) to pop it off the dark floor.

2. **TABLE — knock down its brightness so it stops out-shouting the figures.** The center table cube is currently full `W`/`L` (the brightest object in the whole booth). Re-tone its top to `L` and its two visible side faces to `M`/`D`, keeping only a 1–2px `L` highlight on the top front edge. A lower-value table lets the two figures and the bubble become the focal point instead of the furniture (this is the painter's self-noted clumping risk — the fix is contrast, not redrawing).

3. **SUBJECT ID TAG — add the missing popped clipboard card.** The blueprint's fourth signature beat (small popped-up `W`/`L` ID/clipboard card above the subject's head, with an `o` name-line + a `c`/`O` checkmark) is not present. Add a ~4×5px card just above-right of the subject figure's head: `W` body, `K` 1px frame, one `o` horizontal name-line, and a `c`/`O` checkmark pixel-pair. Float it slightly off the head so it reads as "popped/identified," mirroring how the speech-bubble floats.

4. **FIGURE/MIRROR CONTRAST CHECK (verify after #1–#2).** The painter flagged that figures + canopy accent sit close to the mirror's bright tones. After darkening the table and rebuilding the figures, confirm the back `M`/`L` mirror body still stays clearly BEHIND/brighter than the foreground figures — keep figure silhouettes in the `d`/`K` low-value band so they never blend into the `M`/`L`/`h` mirror sheen. If any figure pixel drifts into `M`+, drop it to `d`.

5. **(Minor) Speech-bubble outline.** The bubble waveform reads, but give the bubble a continuous 1px `K`/`o` outline so it clearly floats as a discrete bubble between the two heads rather than blending into the back wall tones above it. Optional but improves the "hovering between them" read.
