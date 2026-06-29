# Review — biocore / microscopy-suite (round 0)

**Verdict: CHANGES_REQUESTED**

Judged from the CURRENT rendered PNGs (mtime 2026-06-29 08:15) + pixel diffs. Base byte-identity: BASE_IDENTICAL True (stage 1 == shipped PNG). Canvas 64x64 all stages; nothing clipped off the L/R edges (top/bottom edge-touch is the base form's own framing and is unchanged). Cumulative property holds (0 px removed between any consecutive stage). The failure is the ramp: only t3 and t5 add real structure — **t2 and t4 are effectively no-op stages**, so the build-out is not smooth and two of four tiers add nothing the player can see.

(Note: an earlier APPROVE draft of this file cited diffs base->t2 +36 / t3->t4 +123. Those do not match the PNGs currently on disk — measured fresh below — so this review supersedes it.)

Per-stage (rendered PNGs + measured diffs):
- **base**: microscope chassis; cyan specimen-window slots on the left face; central optical column; glowing cell-specimen orb (cyan disc + orange nuclei) on a stalk above. Signature = the floating specimen orb. OK.
- **t2**: **NO-OP — pixel-identical to base** (diff bbox = None, +0 px). Fails "every stage visibly adds structure."
- **t3**: GOOD. Adds the bottom-right secondary annex incl. the rounded cyan-capped incubator/centrifuge vessel (+111 px, x37–54 y45–63). Real structural mass, on-theme, does not occlude the orb. Cumulative.
- **t4**: **NEAR NO-OP — +4 px only** (a diagonal sliver at (39,30)(40,31)(41,31)(42,32)). The vessel that *looks* new at t4 is already present identically in t3. Fails "major add / prominent new mass."
- **t5**: GOOD. Adds a second smaller satellite specimen orb (+69 px, x4–21 y7–17) tethered to the stalk by a gold dotted beam, plus gold trim on the t3 vessel. On-canvas (left bbox x=4, not clipped), tethered (not a detached blob), gold used as a t5-only flourish (not a recolor). Reads as elite. Cumulative.

Measured deltas: base 1487 px; base->t2 +0; t2->t3 +111; t3->t4 +4; t4->t5 +69.

## mustFix
- **t2 (no-op, +0 px):** stage2_* currently draws nothing absent from the base. Add a real modest on-theme element that does not exist in the base — e.g. a small vent/sample-rack, a short specimen-feed pipe, or one extra slide-cartridge slot on the front-right face — placed below/around the optical column without touching the floating orb. Must yield a non-empty diff vs base.
- **t4 (near no-op, +4 px):** the rounded vessel credited to t4 is actually introduced in t3; t4 adds only a 4-px sliver. Give t4 its own prominent new mass distinct from the t3 vessel — e.g. raise the central optical column into a taller imaging tower, or bolt on a second incubator drum / tall sample carousel. Must add a clearly visible mass (dozens of px), on-canvas, not occluding the orb.
- **Ramp check after fixes:** confirm base→t2→t3→t4→t5 each adds a meaningful, monotonically increasing pixel delta (no stage ~0). Keep gold (`q`/premium) strictly in t5.
