# Review: PCB Fab (volt_lab) — round 1

**VERDICT: TWEAK**

Real progress since round 0 — the cyan traces now read as continuous routed lines instead of confetti, the chip got a top-face rim, and a yellow pulse exists. But the one critical test still fails: the central DIP chip **still reads as a dark pit, not a raised IC.** A luminance scan of the roof shows the chip's largest face is the darkest value in the whole sprite (solid `K`), with only a thin `M` rim on top — that value relationship is the literal signature of a recess. Pins are still missing and the orientation notch was placed in the wrong (near-invisible) color. Not shippable yet, and it's close.

## Per-criterion

1. **Isometric 2:1 — PASS.** Clean 2:1 iso projection; box geometry is correct and unchanged from round 0.
2. **3/4 top-down, roof visible — PASS.** Roof diamond fully visible and dominant.
3. **Front corner faces viewer — PASS.** Vertical front corner splits two side faces correctly.
4. **Sharp / clean outline — PASS.** Hard `K` outline is crisp; 13 in-palette colors, no strays, no blur. The round-0 noisy top-back rim is cleaned up into a tidy `D` corrugated band with corner rivets. Traces are now legible 1px runs.
5. **Cohesive with Volt Lab palette + motifs — PASS.** Steel-grey + electric yellow + cyan all present; corrugated frame, conduit, glowing power line, cyan readout panels all honored.
6. **One-of-one signature — FAIL (critical).** The hero DIP chip does NOT read as raised. The top face is only a thin `M #9aa3ad` rim (rows 18–20) sitting atop a large solid `K #15181d` body (rows 21–26) — the dark body is the biggest, lowest-value mass in the sprite, so the eye reads it as a hole punched into the board, not a proud cupola. **Pins are still absent** — the chip's iso-facing side edges show `Kd`/`dK` filler, no evenly-spaced `M` pin column. The **orientation notch is the wrong color**: it's a single `G #1f8ba0` (dark teal) pixel at (36,23), which disappears against the dark chip — round 0 explicitly asked for a bright `g #38cfe2` dot. Traces and pads are good now, but the chip — the whole point of the building — still fails.
7. **Attractive — PARTIAL.** Body and roof traces look great. The central chip remains the eye's focal point and still looks like damage/a void rather than the hero IC, which drags the whole sprite down.

## Painter-actionable tweaks

1. **Invert the chip's value structure so the TOP face dominates (fixes the pit).** The chip body currently is mostly `K` with a thin `M` rim. Re-balance it: make the chip's **top face a large bright `M #9aa3ad` (or `L #cdd6dd`) plane** filling roughly rows 19–24 across the chip footprint (cols ~30–38), and reduce `K` to a thin 1px shadow strip only along the chip's lower-front and right edges. Right now `K` fills the body interior (rows 21–26); that solid dark mass must shrink to a single edge line. The biggest visible face of a raised block is its top, lit — not its front, black.

2. **Add real pins.** Run a single column of `M #9aa3ad` pin pixels down each of the chip's two iso-facing long edges (left-down and right-down diagonals), evenly spaced with `K` gaps between them. This is the #1 "this is an IC" cue and it is still completely missing — the side edges are currently undifferentiated `d`/`K` filler.

3. **Recolor the orientation notch to bright cyan.** Change the notch pixel at (36,23) from `G #1f8ba0` to `g #38cfe2` (or `c #aef0fb`) and move it to a clear top corner of the now-lit top face so it actually reads as the pin-1 dot. As placed/colored it's invisible.

4. **Strengthen the current pulse.** The lit segment is currently a single `O` core at (31,27) plus a tiny `o` patch — too small to register as "powered." Pick ONE trace running from the chip toward a front pad and light a continuous 3–4px dash: `O #fff7a8` core flanked by `o #ffe85a`, so there's an unmistakable glowing pulse mid-run. Also push exactly one solder pad to full `O` bright.

5. **(Nice-to-have, only after 1–4) SMD texture.** With the chip finally reading as raised, scatter 2–3 small `D` surface-mount chips and one `c` cylindrical capacitor can on the open roof quadrants per the blueprint — but don't add this on top of a chip that still reads as a pit.

## Round-0 fixes audit
- Traces re-routed as connected lines — **LANDED** (long continuous `g` runs flanking the chip).
- Top-back rim tidied to clean corrugated `D` band with rivets — **LANDED.**
- Chip top-face highlight — **PARTIAL** (a thin `M` rim exists, but it's too small to defeat the pit read).
- Chip as raised block, not hole — **NOT LANDED** (still a dark recess; see tweak 1).
- Pins added — **NOT LANDED.**
- Orientation notch — **PARTIAL/WRONG** (placed but in dark `G`, invisible; see tweak 3).
- Current pulse made unmistakable — **PARTIAL** (present but too small; see tweak 4).
