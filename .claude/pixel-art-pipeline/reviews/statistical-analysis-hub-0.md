# Review: Statistical Analysis Hub (mindframe) — round 0

**VERDICT: TWEAK**

The built form is strong and on-brief (stepped two-block compute hub, lit-LEFT, real louvers vs. glass). But the hero signature fails its core job: the "bell-curve" reads as a **cloud-upload icon**, the tails are asymmetric, and the SIGNIFICANT stamp is a blank pink panel. The signature must be rebuilt to read as a symmetric bell + shaded tails + threshold line + dropping needle + a legible stamp.

## Per-criterion notes

1. **Iso 2:1?** PASS. Roof top edges and floor edges run on the correct 2:1 diagonals; the stepped setback between the front terminal block and the back core respects the iso grid.

2. **Roof visible?** PASS. The flat `M` core roof and the lower terminal-block roof are both visible in 3/4 top-down; the magenta `o` accent strip edging the roofline reads on the front-right roof lip.

3. **Front corner faces viewer?** PASS. The near vertical corner of the lower terminal block sits center-front; both the lit-LEFT and shaded-RIGHT faces are visible off it.

4. **Sharp/clean/in-palette/clean K outline/no strays — glass vs. louver?** PARTIAL.
   - Outline: mostly clean single-pixel `K`. BUT the rooftop holo region throws scattered stray magenta/pink pixels into empty space on the right side (the "starburst" near the right tail, approx the cluster right of the curve crown) — these read as noise/strays, not a deliberate tail.
   - Louvers vs. glass: GOOD separation. The shaded-RIGHT core face carries a recessed dark-slat LOUVER band (opaque `K`/`d` horizontal slats with `M` highlights) that clearly reads as vents, not glass. The lit-LEFT terminal pane and the small status pane read as GLASS (magenta `o`/`c` sheen inside a `K`/`D` frame). Contract met here.
   - The lower-left terminal glass is a bit muddy — the magenta sheen blob is large and shapeless; a soft mullion line would help it read as analyst-station glazing rather than a glowing splotch, but this is minor vs. the signature.

5. **Cohesive MindFrame palette + motifs?** PASS. Muted indigo/violet walls (`M`/`D`/`d`), magenta accent (`o`/`r`) on the roof strip, curve tails, and glass sheen. Soft-glow screen + observation-glass motifs are present. Palette stays in-set.

6. **One-of-one signature present + legible + distinct?** FAIL — this is the blocking issue.
   - **Not a bell curve.** The holo hump reads as a **cloud / upload-to-cloud icon**: a rounded symmetric arc with a clear gap of empty space underneath and a down-pointing arrow/needle through the middle. There is no visible axis baseline under the curve — the dark horizontal bar present is at the curve's *base width* and reads as the flat bottom of a cloud, not as an x-axis the curve sits on. A bell curve needs the hump to taper smoothly DOWN to a baseline at both ends, not arc back up into a closed loop.
   - **Tails asymmetric & not reading as rejection regions.** LEFT tail is one solid heavy magenta `r` triangle; RIGHT tail is a scatter of disconnected `o`/`O` shards (the painter-flagged busy region). The two do not mirror, so "symmetric distribution with two shaded tails" does not read. The right-tail cluster collapses into noise.
   - **Threshold line vs. needle indistinguishable.** There is no clearly separate thin dashed vertical α-line; the vertical element under the crown reads as a single arrow shaft, conflating threshold + needle into one. The "needle dropping PAST the line" beat is lost.
   - **SIGNIFICANT stamp illegible.** The `K`-framed panel to the right of the curve is a **blank flat pink fill** — no lettering, no checkmark, no glyph. It reads as a generic status screen, identical in language to the building's window panes. Nothing communicates "SIGNIFICANT."

7. **Attractive?** PARTIAL. The body/building is genuinely attractive — clean stepped silhouette, nice violet value steps, good louver texture. The rooftop holo drags it down: the cloud read plus the right-side magenta scatter looks like a rendering glitch rather than a designed motif.

8. **Unique built form + opening on assigned LIT-LEFT?** PASS. Clearly a stepped compute/server hub, NOT the gateway cube and distinct from a glass gallery or round ziggurat. Opening (hero glazing) is on the LEFT as assigned. Built form is approved — only the signature needs work.

## Tweak list (painter-actionable)

1. **Rebuild the curve as a true bell, not a cloud.** Draw a smooth symmetric hump that starts low at the left baseline, rises to a single rounded peak dead-center, and tapers back DOWN to the right baseline — open at the bottom, NOT closing into an arc/loop. Remove the closed rounded-cloud top. Keep it ~2 px thick in `c` with a `g` core-glow underneath. Target a clear Gaussian silhouette.

2. **Add a real axis baseline UNDER the curve.** Lay a faint 1-px `M`/`d` horizontal x-axis line beneath the curve so the hump visibly "sits on" it. The curve's two ends should meet this baseline. This single change is what kills the cloud read.

3. **Make the two tails mirror.** Shade BOTH outer ends of the curve (left of left-threshold and right of right-threshold... or, per brief, the single right rejection region) with the SAME magenta fill weight and shape. Right now left = solid `r` triangle, right = scattered shards. Pick one treatment (recommend a clean `r` fill fading to `o` at the curve edge) and apply it symmetrically. Delete the loose `o`/`O` stray pixels floating right of the crown.

4. **Separate the threshold line from the needle.** Draw the α-threshold as a THIN dashed VERTICAL `O`/`o` line crossing the right tail (e.g. alternating 1-on/1-off pixels). Draw the p-value needle as a SEPARATE short `O`/`h` marker positioned to the RIGHT of (past) that dashed line, with a 2–3px `h` motion trail above it showing the drop. The viewer must see "needle is past the line."

5. **Make the SIGNIFICANT stamp legible.** Replace the blank pink fill with an actual readable mark inside the `K` frame: either tiny pixel lettering ("SIG" / "S✓" is enough at this size) in `O` on `o`, or a bold `O` CHECKMARK glyph. Differentiate it from the window panes — give it a brighter `O` lit edge so it reads as "lit up / activated," matching the brief's "lights up when the needle clears the line."

6. **Clean the holo region of strays.** After the rebuild, sweep the roof airspace for orphan magenta/pink pixels not attached to the curve, tails, threshold, needle-trail, or stamp. The holo should read as 4 deliberate elements (curve, shaded tail, threshold+needle, stamp), nothing loose.

7. **(Optional, minor) Tidy the lower-left terminal glass.** Add a 1-px `D` mullion dividing the magenta sheen so it reads as a glazed analyst-station window rather than a single glowing blob. Lower priority than the signature fixes.
