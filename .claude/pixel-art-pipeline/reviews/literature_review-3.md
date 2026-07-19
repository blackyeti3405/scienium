# Review — Literature Review (gateway) · round 3

**Reference:** `art_ref/mockups/literature_review.png`
**Render:** `art/preview/literature_review_generic.png`
**Verdict: TWEAK**

## Fidelity assessment

This render has improved on prior rounds — true 2:1 iso, front corner to viewer,
clean continuous K outline, crisp with no blur/AA/mush, on the generic palette,
and glass reads as glass. Orange columns, the tilted cross-hatched skylight
panel, the front-right tinted window, a front shelf band, and a dark arched
entrance are all present. But the two features that **define** this building in
the drawing are not faithfully rendered, so it still reads as a **different
building** than the reference — automatic TWEAK.

### Silhouette / massing — partial pass
Smaller upper box set on a wider lower box, plus a side extension to the right —
this roughly matches the drawing's massing, and it is emphatically a two-tier
stack, not a cube-with-ornament. Base gates all pass.

### AUTOMATIC TWEAK #1 — the upper terrace is CLOSED, not an open canopy
In the drawing the entire upper story is an **open rectangular frame** — a glass
canopy/skylight tilted up toward the back-right that you **see into**. The
blueprint is explicit: "you can see into the room; it is not a closed lid" and
"keep it airy/open, not a solid double-cube." The render instead caps the upper
box with a **solid grey peaked roof** (a filled diamond lid). The teal skylight
survives only as a small cross-hatched panel *behind* that solid cap, so you
cannot see into the terrace. Net effect: it reads as a **solid double-cube with
a roof** — the exact failure mode the blueprint warns against. This is the single
biggest miss.

### AUTOMATIC TWEAK #2 — the open books on the balcony are not legible
The drawing's focal literature tell is **two open books splayed on the balcony
ledge**, each with a visible spine (V/M shape) and purple/green pages. In the
render there are only a couple of small **teal blobs** on the ledge — they read
as glass chunks/gems, not books. The most important "this is a library" signal
is effectively missing.

### Secondary misses
- **Side awning:** the drawing has a diagonal-hatched awning canopy on thin posts
  projecting over the right side extension. The render has only two bare orange
  legs hanging down with **no awning surface** above them.
- **Shelf band color:** the drawing's lower band is a green/purple horizontal
  stripe; the render's shelf band is teal-accented — off-hue for the shelf tell,
  and it competes with the glass for the teal.
- **Upper-left slatted blinds:** rendered as scattered teal dashes rather than
  the drawing's clean diagonal slat hatching, so it reads as glass sparkle
  instead of blinds.

## Concrete fixes (toward the drawing)
1. **Open the top.** Remove the solid peaked roof lid. Make the upper story an
   open rectangular frame — a thin outer rim/parapet with the interior floor
   visible — and render the glass canopy as an angled `Box.window` cross-hatched
   plane covering only the back-right slope. You must be able to see *into* the
   terrace, not onto a closed roof.
2. **Draw real open books** on the balcony ledge: two book shapes with a visible
   center spine (V/M silhouette) and purple/green (`d`/`g`) pages inside a K
   outline. Place them out front on the balcony as the focal element instead of
   teal blobs.
3. **Add the side awning:** a small diagonal-hatched overhang plane resting on
   the thin right-side posts, instead of bare orange legs.
4. **Recolor the lower shelf band** to a green/purple stripe (`g`/`d`) to match
   the drawing, and reserve teal (`h`/`c`/`g`/`G`) for glass only.
5. **Clean the upper-left panel into diagonal slat hatching** (parallel `K`/`D`
   lines) rather than scattered teal dashes, so it reads as blinds.
