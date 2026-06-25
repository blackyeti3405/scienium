# Review: EEG/Biofeedback Room (mindframe) — round 1

**VERDICT: TWEAK**

Despite a fresh rebuild (JSON + preview both re-rendered today), the round-0 failure mode survives almost unchanged: it is still a single canted/floating box — NOT a grounded two-mass clinical pod + lower monitor annex — and the one-of-one signature still does not read. The right "hero" face is a noisy violet/pink/lavender color field with no horizontal banding structure, so you cannot make out a capped head, count 3+ stacked brainwave ribbons, find a decoder strip, or see a magenta biofeedback ring. The two round-0 blockers (floating single box; absent/illegible signature) are both still failing.

## Per-criterion notes

1. **Isometric 2:1?** — Partially. The top diamond and side faces are roughly 2:1, but the whole mass is tilted/canted and reads as leaning, the same break the siblings don't have. The top diamond is rotated rather than sitting square.

2. **Roof visible (grounded, not floating)?** — FAIL on grounded. A large flat `L`/`M` top diamond is visible (good 3/4 top-down read), but the building still floats: there is a big detached drop-shadow well below the mass and the lower edge tapers to a narrow base, so it reads as a monitor hovering above its shadow, not a building sitting on the iso footprint. The intended `c` lead-junction nub is still just a lone 1–2px violet mark near top-center, not a readable lead-gather cluster.

3. **Front corner faces viewer?** — Partially. A front vertical corner exists, but because the mass is canted it's skewed; the left face is squeezed and the front-flat face dominates. Reads as a tilted cube, not a pod presenting a corner squarely.

4. **Sharp / clean / in-palette / clean K outline / no strays — and does the clinical pane read as GLASS?** — FAIL on glass and strays.
   - Right face: scanline sampling confirms 5–9 distinct colors per horizontal line with no consistent banding — colors scatter vertically (a violet block, a bright pink block, a lavender wedge, dark gaps) reading as static/checkerboard, not glazing. No sheen line, no clean frame.
   - There are stray light/near-white pixels off the lower-left silhouette and `K`/violet specks scattered below the right face into the shadow.
   - The `K` outline is broken/feathered along the canted top-right roof edge (loose pink/black pixels trailing off the right corner).

5. **Cohesive palette + motifs?** — Palette yes (indigo/violet `M`/`L`/`D` walls, magenta `o`/`O` accents on-palette and pretty). Motifs NO: the central required motif — soft-glow waveform screens + clean observation glass — is still not delivered. There is a magenta gesture and a glow, but no legible waveform, no observation pane, no seated subject.

6. **One-of-one signature (capped head + 3+ stacked bands + decoder + ring, multi-band not single trace)?** — FAIL (the decisive criterion, still missing).
   - Capped head: not legible. No head-in-cap silhouette, no electrode nodes, no leads fanning from a crown.
   - 3+ stacked multicolored ribbons: NOT readable. Scanlines show a noisy multicolor field, not 3–4 parallel horizontal ruled rows of distinct tint/amplitude. You cannot count separate alpha/beta/theta/gamma bands — it is the same checkerboard as round 0.
   - Decoder strip + state tag: absent. No `K`-framed strip, no CALM/STRESS label.
   - Biofeedback magenta ring: absent. The pink eave/parapet strip is present but there is no ring pulsing around a head/window.
   - Net: the signature is still missing, so the build remains indistinguishable from a generic MindFrame box.

7. **Attractive?** — Color mood is pleasant (dark base + pink eave), but the canted/floating posture, the static-noise right face, and the murky left window still make it read as broken/unfinished, not a crafted clinical pod.

8. **Unique built form (two-mass pod + annex, not floating) + opening on RIGHT + glowing?** — FAIL on form. Still a single box; there is no second LOWER stepped-down monitor annex as a distinct mass. Opening: the brighter/active face IS on the right and it does glow on the shaded side (directionally correct) — but it glows as noise, not as an observation pane revealing the capped subject. A single floating box is an automatic TWEAK per the rubric.

## Tweak list (numbered, painter-actionable)

1. **Actually build TWO masses.** The single box must become (a) a taller compact recording POD — `Box(top≈(30,15), wx≈7, wy≈7, h≈14)`, `M`/`D` walls, softened `L` shielded trim — AND (b) a clearly LOWER monitor ANNEX stepped down off the back-left — `Box(top≈(20,20), wx≈6, wy≈5, h≈10)`. Two flat `M` roofs, pod taller, thin `D` parapets. There must be a visible step-down silhouette between the two; right now there is still only one mass.

2. **Ground it and un-tilt it.** Remove the canted/leaning posture and the floating gap above the shadow. Sit the pod flat on the iso footprint like its siblings, front corner presented square. Keep a small soft contact shadow directly under the footprint, not a large detached shadow far below.

3. **Carve a real RIGHT observation pane (not static).** On the shaded-right pod face, draw a clean `K`-framed `Box.window` with a 1px `W`/`h` sheen along its top-left edge. Light the interior bright (`c`/`O`/`h`) so it glows on the shaded side. It MUST read as glass — a framed pane with sheen — not the current multicolor checkerboard.

4. **Draw the capped head inside that window.** A small `M`/`L` head wearing a `D`/`c` electrode cap dotted with 3–4 `o`/`O` electrode nodes, thin `K`/`c` leads fanning off the crown. Make it a recognizable silhouette at 1x. None of this is present yet.

5. **Render 3–4 DISTINCT stacked brainwave ribbons (the core fix — still failing).** From the leads, draw 3–4 PARALLEL horizontal wave-rows, each on its own ruled line, each a different tint AND amplitude: `g` theta (tall slow), `c` alpha (medium), `o` beta (tight fast), `h` gamma (fine). Separate adjacent rows with a 1px `K`/`d` rule so they read as a STACK of several bands — explicitly NOT one trace and NOT a noise field. Build each band as a deliberate horizontal sine of full-width pixels; do not scatter pixels.

6. **Add the decoder strip + state tag.** On the right edge of the window, a small `K`-framed `c`/`g` strip where the bands resolve, with a tiny `o`/`O` CALM/STRESS label. This is the collision-distinguishing element (stack-into-decoder vs. a single CRT/seismograph trace) and must be present.

7. **Add the magenta biofeedback RING.** A soft `o`/`O` ring (faint inner + outer glow) around the head/window doing real work — distinct from the eave strip.

8. **Fix the LEFT monitor-room face as glass.** Make the lit-left annex face a clean glazed `Box.window` (`g`/`c` glass + `W`/`h` sheen + `K` frame) showing technician screens, plus a low opaque `Box.louver` cooling-vent band. Currently it's still a murky recess.

9. **Clean strays + repair outline.** Remove the floating light pixels off the lower-left silhouette and the specks trailing below the right face. Close the broken/feathered `K` outline along the top-right roof edge into one continuous hard line.

10. **Roof details.** Once the pod roof exists, add a readable 2–3px `c` lead-junction cluster where the leads gather (not a lone dot) and the soft `o` magenta accent strip on the pod eave.
