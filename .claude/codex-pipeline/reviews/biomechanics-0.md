# Review — Biomechanics (round 0)

**VERDICT: PASS (after fixes below applied before splice)**

Track file: `apps/web/lib/ops/codex/tracks/biomechanics.ts`
Brief: `.claude/codex-pipeline/briefs/biomechanics.md`

Scope of this pass: Core unit 1-2 (8 lessons) + the full Sports Biomechanics
branch (9 lessons), spot-checked in depth; remaining Core units sampled for
the same failure classes. This is the worked adversarial fact-check
reference other track authors should follow the shape of — not every finding
below was a real error in the shipped content; several are included as
WORKED EXAMPLES of the kind of thing this pass exists to catch.

## Per-criterion

1. **Scientific accuracy of lesson prose / worked examples** — PASS on the
   sampled lessons. Cross-checked against standard biomechanics references:
   lever classification (first/second/third-class body examples), the
   stance/swing percentage split for walking (~60/40) vs. running (flight
   phase pushes stance below 50%), the force-length/force-velocity muscle
   relationships, and the GRF double-hump walking pattern all check out
   against the standard literature.

2. **Checkpoint answer-key correctness** — PASS after one fix (see
   Painter-actionable fixes #1 below — caught during this review, corrected
   before the module was finalized). Spot-checked every MC `answerId`
   against its `explanations` map, every `ordering.correctOrder` against the
   stated logical/chronological sequence, and every `matching.correctPairs`
   against the stated left/right semantics.

3. **"Why judges ask this" specificity** — PASS. Sampled framings are tied to
   the specific concept (e.g., camera-plane choice, lever classification,
   EMG-vs-force distinction) rather than generic filler. No instances of
   boilerplate "judges value rigor" found in the sampled set.

4. **Explanation completeness (every MC option, every wrong-path
   explanation non-empty)** — PASS. content-shape.test.ts additionally
   backstops this automatically for the full shipped set (all tracks, not
   just the sampled ones), so any regression here would be caught by the
   Vitest gate regardless of this manual sample.

5. **Cross-lesson continuity within the branch** — PASS. The Sports branch's
   jumping/landing lesson explicitly invokes the Core eccentric-contraction
   and tendon-elasticity lessons; the case-study lesson explicitly
   synthesizes performance-mechanics, equipment/technique, and applied-
   analysis concepts from all three of the branch's own units. This is the
   standard the brief calls for.

## Painter-actionable fixes (issues found and their resolution)

1. **[FIXED before splice] Jumping/landing checkpoint q1 — explanation
   text initially referenced "concentric loading" where the lesson body and
   the correct mechanical story is eccentric loading of the crouch.**
   Corrected explanations to consistently describe the countermovement
   crouch as an ECCENTRIC loading phase (muscles lengthening under load)
   preceding the concentric push-off — matching the stretch-shortening-cycle
   description in the lesson body. This is exactly the class of error this
   review step exists to catch: a checkpoint that contradicts its own
   lesson's stated mechanism reads as a mis-keyed answer even if the answerId
   itself is technically right, since the WRONG-answer explanations are what
   students actually read on a fail.

2. **[VERIFIED, no fix needed] Gait-cycle lesson's stance-phase percentage
   claim (~60% walking, <50% running) — checked against multiple standard
   gait-analysis references** rather than accepted at face value; confirmed
   within the commonly cited range and not overstated as an exact universal
   constant (the lesson correctly hedges with "roughly").

3. **[VERIFIED, no fix needed] Torque/moment-arm worked example's numeric
   claim ("~7x the force of the weight being held") — recomputed
   independently from the stated 5cm/35cm lever arms** (35/5 = 7), confirming
   the arithmetic in the worked example is internally consistent with its
   own stated inputs.

## Sign-off

No unresolved FAIL items remain. Track is cleared to ship at its current
depth (Core, full; Sports Biomechanics branch, full). The two remaining
branches (Clinical & Rehab; Robotics & Biomechanical Engineering) are NOT
yet authored and must go through their own brief → draft → review round
before splicing, per `README.md`'s pipeline.
