# Review: EEG/Biofeedback Room (mindframe) — round 0

**VERDICT: TWEAK**

The render is essentially a single tilted/floating MindFrame box on a stem, not the bespoke clinical-pod + monitor-annex form the blueprint specifies — and the one-of-one signature (capped head → 3+ stacked brainwave ribbons → decoder + magenta biofeedback ring) is absent or unreadable. The right "hero" face shows a noisy field of pink/violet/lavender pixels that reads as glitch/static, not as distinct stacked waves.

## Per-criterion notes

1. **Isometric 2:1?** — Mostly. The roof diamond and the side faces follow a 2:1-ish iso, but the whole mass is tilted/canted (the top diamond is rotated and the box appears to float and lean), which breaks the clean iso footing the siblings share. The thin central stem + large drop shadow read as a floating monitor, not a grounded building.

2. **Roof visible?** — Yes. A large flat `L`/`M` top diamond is clearly visible (3/4 top-down). There is a tiny nub near top-center (the intended `c` lead-junction), but it's a lone 1–2px mark and does not read as a lead-gather junction.

3. **Front corner faces viewer?** — Partially. A front vertical corner exists, but because the mass is canted the corner is skewed; the left face is squeezed into a small dark wedge and the front-flat `M` face dominates. Reads more like a tilted cube than a pod with a corner presented squarely.

4. **Sharp / clean / in-palette / clean K outline / no strays — and does the glass read as GLASS?** — FAIL on glass and on strays.
   - Right face: a chaotic checkerboard of `O`/`o`/`h`/`g`/`c`/`K` pixels with no horizontal banding structure — reads as static, not glazing. No sheen line, no frame.
   - Left face: a dark `K`/`d` recess with murky violet (`g`/`G`) blobs — black-barred, not glass-with-sheen. Fails the "glass reads as glass" test on both faces.
   - Stray/floating pixels: loose `W`/light pixels off the left silhouette (around the lower-left corner) and a couple of near-white pixels at the bottom-right of the right face that fall outside the clean K outline.
   - The `K` outline is mostly present but broken/feathered along the canted top-right roof edge.

5. **Cohesive MindFrame palette + motifs?** — Palette yes (indigo/violet `M`/`L`/`D` walls, magenta `o`/`O` accent, the pink eave strip is on-palette and pretty). Motifs NO: the central required motif — soft-glow waveform screens + clean observation glass — is not delivered. There's a magenta gesture but no legible waveform, no observation pane, no seated subject.

6. **One-of-one signature present + legible + distinct?** — FAIL (the decisive criterion).
   - Capped head: not present / not legible. No head-in-cap silhouette, no electrode nodes, no leads fanning from a crown anywhere in either window.
   - 3+ stacked multicolored brainwave ribbons: NOT readable. The painter's self-noted weak spot is confirmed — the right-face "bands" are a noisy multicolor checkerboard, not 3–4 parallel horizontal ruled rows of distinct tint/amplitude. You cannot count separate alpha/beta/theta bands.
   - Decoder strip + state tag: absent. No `K`-framed strip, no "CALM/STRESS" label.
   - Biofeedback magenta ring: absent. There's a pink eave/parapet strip but no ring pulsing around a head/window.
   - Net: the signature is missing, so the build is currently indistinguishable from a generic MindFrame box.

7. **Attractive?** — Color mood is pleasant (the dark base + pink eave is appealing), but the canted/floating posture, the static-noise right face, and the murky left window make it read as broken/unfinished rather than a crafted clinical pod.

8. **Unique built form + opening on assigned RIGHT face + glowing on shaded side?** — FAIL on form. This is a single box, not a recording pod abutted by a lower stepped-down monitor annex; there is no second lower mass. Opening: the brighter/active face IS on the right, which is correct directionally, and it does glow on the shaded side — but it glows as noise, not as an observation pane revealing the capped subject. A generic box is an automatic TWEAK per the rubric.

## Tweak list (numbered, painter-actionable)

1. **Build the two-mass silhouette.** Replace the single canted cube with: (a) a taller compact recording POD — `Box(top≈(30,15), wx≈7, wy≈7, h≈14)`, `M`/`D` walls, softened `L` shielded trim — and (b) a LOWER monitor ANNEX stepped down off the back-left — `Box(top≈(20,20), wx≈6, wy≈5, h≈10)`. Two flat `M` roofs (pod taller) with thin `D` parapets. Right now there's only one mass.

2. **Sit it flat and un-tilt it.** Remove the floating/canted posture and the thin stem; ground the pod on the iso footprint like its siblings, keeping the front corner presented squarely. Keep a small soft shadow but lose the "TV-on-a-stand" stem.

3. **Make the RIGHT pod window a real observation pane, not static.** Carve a clean `K`-framed `Box.window` on the shaded-right pod face with a 1px `W`/`h` sheen highlight along its top-left edge. Light the interior bright (`c`/`O`/`h`) so it glows on the shaded side. It must read as glass, not a checkerboard.

4. **Draw the capped head INSIDE that window.** A small `M`/`L` head wearing a `D`/`c` electrode cap dotted with 3–4 `o`/`O` electrode nodes, with thin `K`/`c` leads fanning off the crown. Make it a clear silhouette — head + cap should be recognizable at 1x.

5. **Render 3–4 DISTINCT stacked brainwave ribbons (the core fix).** From the leads, draw 3–4 PARALLEL horizontal wave-rows, each on its own ruled line, each a different palette tint AND a different amplitude: e.g. `g` theta (tall slow), `c` alpha (medium), `o` beta (tight fast), `h` gamma (fine). Separate them by a 1px `K`/`d` rule so they read as a STACK of several bands — explicitly NOT one trace and NOT a noise field. This is what currently fails hardest.

6. **Add the decoder strip + state tag.** On the right edge of the window, a small `K`-framed `c`/`g` strip where the bands resolve, with a tiny `o`/`O` "CALM/STRESS" label = the decoding. This is the collision-distinguishing element (stack-into-decoder, vs a single CRT/seismograph trace) — it must be present.

7. **Add the magenta biofeedback RING.** A soft `o`/`O` ring (faint inner + outer glow) pulsing around the head/window to track calm/stress. This is the magenta accent "doing real work" — distinct from the eave strip.

8. **Fix the LEFT monitor-room face as glass.** Make the lit-left annex face a clean glazed `Box.window` (`g`/`c` glass with a `W`/`h` sheen + `K` frame) showing technician screens, plus a low opaque `Box.louver` cooling-vent band. Right now it's a murky black recess with violet blobs — give it sheen + frame so it reads as glass.

9. **Clean strays + outline.** Remove the floating light pixels off the lower-left silhouette and the near-white specks at the bottom-right of the right face. Close/repair the broken `K` outline along the top-right roof edge so the silhouette is one continuous hard line.

10. **Roof details.** Once the pod roof exists, add the small `c` lead-junction nub where the EEG leads gather (a readable 2–3px cluster, not a lone dot) and the soft `o` magenta accent strip on the pod eave.
