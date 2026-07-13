# Review — research_plan (gateway) · round 2 (redo)

**Verdict: TWEAK**

Reference (match target): `art_ref/mockups/research_plan.png`
Render judged: `art/preview/research_plan_generic.png` (native `apps/web/public/sprites/gateways/research_plan_generic.png`, 64×64). Inspected at 10× nearest-neighbor plus per-region crops (top-left, top-right, center notch, bottom faces).

## Verdict rationale
The render nails the **focal pen holder** but misses the **silhouette**. It reads as a
**single box overflowing with pens/crystals**, not the drawing's **two distinct L-arranged
drafting desks** with a pen cup nestled in an open front notch. The two big slanted drafting
**screens** — the signature top of each unit in the reference — are gone; the whole roof has
been swallowed by an all-over, noisy pen fan. That "reads as a different building" outcome is
an automatic TWEAK per the brief.

## What matches (keep)
- **Focal present and unmistakable.** Center pen-holder cup with an orange rim and the orange
  **V/chevron** accent at its base, exactly per the blueprint hero. This is the strongest part.
- **Pens/rulers** read as thin vertical cyan+orange strokes fanning up — the concept is there.
- **Right unit's square WINDOW** is present on the right face with an orange vertical trim
  post on its edge — faithful to the drawing.
- **Generic palette correct:** lavender/purple body (M/L/D), cyan glass (h/c/g), orange trim
  (o/O/r). Body faces carry a clean continuous K outline; base reads roughly 2:1 iso, front
  corner to viewer, contact shadow present. No off-palette strays.

## Fidelity failures (fix these)
1. **Reads as ONE volume, not TWO L-units with an open notch.** Left and right are just two
   faces of a single box; the cup is stuck on the front rather than sitting in a **receding
   V-notch between two separated, offset wings** that meet at a back corner. Split the mass:
   a taller/larger LEFT wing and a lower/smaller RIGHT wing set forward-and-right, with the
   notch actually cut open between them.
2. **The two slanted drafting SCREENS are missing.** In the reference each unit's top is a
   distinct **angled glass board showing a scribble sketch** (left = big blue/purple zigzag;
   right = smaller multicolor scribble). In the render the entire roof is pens — no readable
   sketch-screens at all. These are the defining tops and must come back as two clean angled
   panels, each with a few sketch strokes inside a thick K frame.
3. **Pen fan is over-scaled and sprays across the whole roof.** It should be a **contained
   bundle rising only from the center cup in the notch** — not a spiky mass covering both unit
   tops. Shrink and center it so it sits *between* the two screens rather than replacing them.
4. **Top pen field is noisy / mushy.** The upper region is peppered with scattered isolated
   cyan/white/orange pixels (visible in the top-left/top-right crops) that read as speckle, not
   pens — the one place the render fails the "crisp, no mush" gate. Rebuild as fewer, thicker,
   solid vertical runs; kill the floating single pixels.
5. **Left unit's 3-layer stack is not readable.** Blueprint wants screen → **shelf band
   (green+purple strip)** → plain body. There is no distinct horizontal shelf band, and the
   cyan used is wrong — it should be the green+purple band of the drawing. Add the recessed
   green/purple band as a clear middle layer on the left wing.
6. **Right unit isn't a distinct lower + forward volume.** It's currently just a side face with
   a window. Give it its own two-layer stack: a small slanted screen on top *above* the square
   window+body below, so it reads as its own drafting desk.

## Concrete tweaks (toward the drawing)
- Rebuild as **two boxes**: LEFT taller/larger (3 layers), RIGHT lower/smaller set forward-
  right (2 layers), meeting at a back corner with an **open notch** cut between them.
- Put a **slanted glass screen** on each wing's top (thick K frame, 3–4 sketch strokes inside):
  big blue/purple zigzag on the left, smaller multicolor scribble on the right.
- **Shrink the pen bundle** to a tight fan rising only from the center cup inside the notch;
  keep the orange chevron base. Remove pens from over the two screens.
- Clean the pen strokes to solid 1–2px vertical runs and **remove the scattered speckle pixels**
  so the roof stays crisp.
- Add the **green+purple shelf band** as the left wing's middle layer; keep the orange trim on
  the left front corner.
- Keep the right square window and its orange post; add a small slanted screen above it so the
  right wing reads as its own desk.
