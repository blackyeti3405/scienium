# Review — mindframe / computational-social-science-lab (round 0)

**Verdict: CHANGES_REQUESTED**

Base byte-identity: BASE_IDENTICAL True (stage-1 untouched). All stages 64x64, on-canvas
(no pixel touches the 0/63 edges), footprint anchor unchanged. Cumulativity holds
(prev-opaque pixels altered: t2→27, t3→19, t4→17, t5→28 — all just anti-alias seams,
no earlier addition removed). Gold confined to t5 only (9 px of accent specks, never a recolor).

## Per-stage
- **base** — academic-cap "mortarboard + oculus drum" ziggurat. Unchanged. OK.
- **_t2** — FAIL (effective no-op). The builder intends a left-shoulder data-feed whip
  antenna + cyan node-ring + brightened hub-node, but the rendered diff vs base is only
  **34 px in a 3x6 region at (19,23)-(22,29)** — a stray cyan smudge on the drum's upper-left.
  The mast's upper ~10 px, its crossbars and pin-light are OCCLUDED behind the wide,
  low-overhanging mortarboard plane; the node-ring + hub dots are swallowed too. Reads as
  a couple of random teal pixels, not a functional element. Does not satisfy "one modest,
  readable on-theme add."
- **_t3** — PASS. Louvered server-blade annex (deep-indigo box, visible rack slats + violet
  sim-glow slit) seated low-front-left on the ground. Real structural mass, on-theme for a
  compute lab, does not occlude the cap/oculus signature. 218 px added.
- **_t4** — PASS. Adds a second smaller network drum/cylinder on the lower-right (to x=57)
  while keeping the t3 annex. Prominent new mass, balances the silhouette, cumulative. 384 px.
- **_t5** — PARTIAL (crowning add present but DETACHED). Energized-cyan broadcast array:
  bright cyan nodes embedded INTO the mortarboard (nicely energizes the signature rather
  than hiding it) + gold flourish specks. BUT the satellite **dish floats unmoored** in
  empty sky to the upper-right (≈x44-58, y28-40), tethered only by a thin diagonal bead of
  dots — exactly the "detached rooftop blob" pitfall. No mast/strut/plinth grounds it.

## mustFix
1. **_t2**: the data-feed whip is hidden behind the mortarboard plane — only its 3x6 foot is
   visible (changed-vs-base bbox (19,23)-(22,29), 34 px). Either (a) move the whip's foot
   OUTBOARD past the cap's left shadow so the shaft + crossbars + cyan pin-light clear the
   overhang and read in the left margin, or (b) swap it for a small ground-level on-theme add
   that isn't occluded (e.g. a compact left-front sensor/intake crate or a short paired
   bollard-antenna). Target a clearly legible element of ~30-60+ visible px, not a smudge.
2. **_t5**: the broadcast dish floats unmoored at ≈x44-58, y28-40, joined only by a dotted
   beam. Anchor it: either drop a solid mast/strut from the dish down onto a roof point of the
   t4 right-hand drum (recompute from the SAME drum-crown source the t4 helper uses, don't
   hardcode a 2nd guess) with a visible plinth, OR reseat the dish directly on a small plinth
   atop that right drum (it sits right below). Keep the cyan cap-nodes — those read well.

Already-good (do NOT touch): t3 annex, t4 second drum, t5 cap energizing + gold specks,
overall colour maturation and cumulativity.
