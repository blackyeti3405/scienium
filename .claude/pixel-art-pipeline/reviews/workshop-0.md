# Workshop — review 0

**VERDICT: TWEAK**

The cube, framing, palette, and supporting motifs are strong, but the signature
weathervane — the whole point of this sprite — fails legibility: it floats
detached above the cupola on a too-tall stalk, and the anvil-and-wrench reads as
a featureless dark blob (closer to a satellite dish than an anvil). The one-of-one
must be unmistakable before this ships.

## Per-criterion

1. **ISOMETRIC 2:1 — PASS.** Cube edges follow a clean 2:1 iso projection; roof diamond and side faces are consistent.
2. **3/4 top-down, roof visible — PASS.** Roof diamond is fully visible and reads as the top of the box.
3. **Front corner faces viewer — PASS.** The vertical front edge sits center-frame with left and right faces splaying away correctly.
4. **SHARP / clean K outline — PASS (minor).** Edges are crisp single-pixel, hard `K` outline, no blur or AA, no obvious off-palette strays. The yellow spark/power-line pixels are a touch scattered but on-palette.
5. **COHESIVE with Volt Lab — PASS.** Steel-grey body, cyan readout panel, corrugated roof, roll-up shutter, yellow accents all on-set. Reads as Volt Lab.
6. **TRUE one-of-one (signature) — FAIL.** The weathervane is not legible. It floats high above the cupola on a thin stalk (looks like an antenna, not a roof-mounted vane), and the anvil+wrench silhouette is an undifferentiated dark lump — no horn, no stepped foot, no readable wrench. It is NOT confusable with the Arena's crossed-tools X, but only because you can't tell what it is at all. The signature must be unmistakable, and right now it isn't.
7. **ATTRACTIVE — FAIL (borderline).** The body is appealing, but the floating, blobby vane is the eye's focal point and it looks broken/unfinished, which drags the whole sprite down.

## Tweaks (painter-actionable)

1. **Re-seat the weathervane onto the cupola.** The vane currently floats ~12–14px above the roof on a thin stalk, with a visible gap that reads as an antenna. Shorten the `K` mast so the vane sits directly atop the cupola box with at most a 3–4px gap — it should look bolted to the little roof, not hovering over it.

2. **Make the anvil read as an anvil.** The dark shape top-of-mast is a featureless blob. Give it the classic anvil profile: a flat squat body, a clear **horn** tapering off the left side, and a **stepped foot/base** under the body. Outline the whole thing in `K`, fill with `D`/`d`, and add one `M` highlight pixel on the top face so the struck surface reads.

3. **Add the crossed wrench behind the anvil.** Right now there is no readable second tool. Place a thin `M` **wrench** angling up-right behind the anvil (open-jaw "C" head visible at the top), outlined in `K`, so the silhouette clearly reads anvil + wrench — not a single lump and not an X of two identical tools.

4. **Tighten the spark burst.** The yellow flecks near the vane are sparse and ambiguous. Cluster a tight 3–4px burst of `o`/`O` sparks coming specifically off the anvil's **struck (top) face**, angled up and to one side, so it reads as "hammer just hit hot metal" rather than random yellow dots.

5. **Strengthen the cupola corrugation.** The cupola box under the mast is nearly flat grey. Add 2 vertical `D` ribbing lines down its front face so it reads as a mini corrugated roof matching the main roof, not a plain pedestal.

6. **Connect the power line to the cupola.** The `o` glowing ridge run currently peters out mid-roof. Run it cleanly along the back ridge and visibly INTO the base of the cupola so the "powered vane" story lands.
