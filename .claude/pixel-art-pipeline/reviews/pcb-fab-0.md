# Review: PCB Fab (volt_lab) — round 0

**VERDICT: TWEAK**

The body is genuinely good — clean iso box, gold-lit corner conduit, cyan readout glass on both front faces, hard `K` outline. But the signature feature fails the one critical test in the brief: the central DIP chip reads as a black HOLE/PIT, not a raised 3D chip. The roof traces are also fragmented and noisy rather than reading as routed board art. Not shippable as-is.

## Per-criterion

1. **Isometric 2:1 — PASS.** Edges hold a clean 2:1 iso projection; the box geometry is correct.
2. **3/4 top-down, roof visible — PASS.** Roof diamond is fully visible and clearly the dominant top plane.
3. **Front corner faces viewer — PASS.** A vertical front corner splits two visible side faces; correct framing.
4. **Sharp / clean outline — PARTIAL FAIL.** Outline `K` is crisp and palette is clean (14 colors, all in-set, no strays). BUT the roof interior is mushy: the cyan traces are scattered single/double pixels that don't connect into legible routes, and the central black mass has ragged undefined edges. Reads noisy, not "designed."
5. **Cohesive with Volt Lab palette + motifs — PASS.** Steel grey + electric yellow + cyan all present and on-palette; corrugated frame, conduit, glowing power line, cyan panels all honored.
6. **One-of-one signature — FAIL (critical).** The hero DIP chip does NOT read as a raised 3D IC. It's a large irregular `K` blob at roof center with no pins, no orientation notch, and no lit top face — it reads as a dark recess/void punched into the roof. This is the exact failure mode the brief flags. The "live circuit board" idea is only half-landed: pads are there, but traces don't route and the current pulse barely registers.
7. **Attractive — PARTIAL.** Lower body is attractive and well-rendered. The roof undercuts it: the central void is the eye's focal point and it looks like damage/a hole rather than the proud product cupola it should be.

## Painter-actionable tweaks

1. **Rebuild the central DIP chip as a RAISED block, not a hole.** At roof center, draw a rectangular chip body in `d #49515b` (mid-dark, NOT `K`), give it a lighter `M #9aa3ad` top face and a darker `K` left/under edge so it reads as standing PROUD of the roof (light on top, shadow beneath). Right now it's flat `K` with no top-face highlight, which is why it sinks into a pit.
2. **Add pins to the chip.** Run a single column of `M #9aa3ad` pin pixels down each long side of the chip body (the two iso-facing edges), evenly spaced — this is the #1 cue that says "IC" and it's completely missing.
3. **Add the orientation notch.** Place one `g #38cfe2` cyan dot at a top corner of the chip body (the standard pin-1 notch) so it instantly reads as a real chip.
4. **Shrink the chip footprint.** It currently sprawls across most of the roof center, swallowing the trace network. Pull it in to roughly a third of the roof diamond so cyan traces can fan out AROUND it to the pads.
5. **Re-route the cyan traces as connected lines, not confetti.** Replace the scattered single `c`/`g` pixels with 3–4 continuous trace runs (iso-diagonal then right-angle) that visibly START at the chip's pins and TERMINATE at the gold `o`/`r` pads. Each trace should be an unbroken 1px `g` line so it reads as routing, not noise.
6. **Make the current pulse unmistakable.** Pick ONE trace running from the chip down toward the front-right pad and light a 3–4px segment of it `O #fff7a8` core with `o #ffe85a` flanks — a clear glowing dash mid-run. Also brighten exactly one solder pad to `O`. Currently the lit pulse is only ~2 pixels and doesn't register as "powered."
7. **Tidy the roof's top-back edge.** The corrugated frame along the upper-left/upper-back roof rim is broken up with stray `c`/`L` pixels that read as blur. Re-lay that rim as a clean `D #6c7682` corrugated band with `K` rivets at the two back frame corners so the board sits in a tidy industrial frame.
8. **(Nice-to-have) Surface-mount texture.** Once the chip and traces are clean, scatter 2–3 small `D` SMD chips and one `c` cylindrical capacitor can on the open roof quadrants per the blueprint — but only after the hero chip reads correctly; don't add clutter on top of the current noise.
