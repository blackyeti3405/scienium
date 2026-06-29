# Review — mindframe / focus-group-chamber (round 0)

**Verdict: CHANGES_REQUESTED** — one blocker at _t4. _t2/_t3/_t5 are good; do not touch them.

Base byte-identity: **BASE_IDENTICAL True** (stage-1 JSON re-render matches the shipped PNG).
Disk PNGs match a fresh render from the JSON sources (not stale). All stages 64x64, nothing
clipped off any edge (t5 spray tops out at y=2, 2px margin). No pixel ever goes transparent
across transitions, so earlier structure is always retained (cumulative at the pixel level).

> NOTE on method: `ImageChops.difference().getbbox()` was unreliable here (reported None while
> 98 px actually differed t3→t4). All deltas below are from an **exact per-pixel** comparison.

## Per-stage
- **base → _t2**  (+10 new-opaque, 37px changed; bbox 30,15–45,31): small dark **sensor/node
  module** bolted on the upper-right shoulder (x43–45, y24–26) + 2 glints on the floating dish.
  Modest, on-theme small functional add. **PASS.**
- **_t2 → _t3**  (+114 new-opaque, 121px changed; bbox 20,16–45,27): a real **raised
  observation-booth array** across the upper rim — a substantial structural mass above the
  brain chamber. Clear structural step. **PASS.**
- **_t3 → _t4**  (**+0 new-opaque**, 98px changed; bbox 19,26–45,36): **FAIL.** The intended
  gantry + mic-ring + capture-pod are all drawn *down inside the existing dark oculus/pit*
  (gantry bows to ~row26, mics hang +1..+3px below it, pod at PIT_CY-1). Every one of those
  points was already opaque dark pit in t3, so they **recolor** rather than extend the
  silhouette — net result is cyan glints + a slightly different dark interior, no readable new
  mass. The brief requires t4 to be the MAJOR add: a *prominent new mass*. As rendered it reads
  as "the chamber lit up," not "a big new structure appeared." This is the only blocker.
- **_t4 → _t5**  (+23 new-opaque, 51px changed; bbox 25,2–39,35): tall **sentiment-cloud
  spray/spire** above the dish (y2–8) + a **gold center-spine core** down the seam (gold only
  appears here, 14px, y24–35). Crowning, premium, reads as maxed. **PASS.**

## Checklist
- [x] Cumulative (no earlier structure lost) — verified pixel-exact.
- [x] 64x64, on-canvas, base footprint unchanged, readable at 64px.
- [x] Colours mature (pink base → cyan energize → gold); **gold reserved to t5 only.**
- [x] On-theme + unique to this building; signature dish/brain-chamber never occluded.
- [x] Base byte-identical.
- [ ] **Every stage visibly ADDS structure — FAILS at t4** (recolor + glints, +0 new mass).
- [ ] **Smooth ramp — broken by t4**: t2 small mass → t3 big mass → **t4 no mass** → t5 spire.

## mustFix
- **_t4: adds zero new opaque area — it recolors the pit interior instead of adding a mass.**
  In `stage4_micring_and_pod` the gantry/mic-ring/pod all land inside the already-opaque dark
  oculus, so they don't extend the silhouette. Fix: make the gantry a **real overhead beam that
  sits ABOVE the rim (raise it so its top chord clears the dark pit by ≥2–3px and breaks the
  outline), and lift the capture pod so its crown rises above the rim line** — the pod/gantry
  must add new opaque pixels OUTSIDE the t3 footprint (target ≥ ~30 new-opaque px, not 0), e.g.
  give the pod a visible body/shoulders that read against the background rather than hovering
  inside the dark pit. Keep the cyan mic-ring as the energize accent, but the t4 *structure*
  has to protrude. Recompute anchors from the same rim source so it stays cumulative with t3.
