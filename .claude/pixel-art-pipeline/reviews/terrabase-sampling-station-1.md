# Review — terrabase / sampling-station (round 1)

**Verdict: APPROVE**

Base is byte-identical to the shipped PNG (`BASE_IDENTICAL True`). All 5 stages are 64x64 with
zero opaque pixels touching any canvas edge (no off-canvas clipping). Opaque-pixel counts grow
monotonically 1520 → 1552 → 1591 → 1695 → 1760, and a strict coordinate test confirms every
previously-opaque pixel survives into every later stage (t2⊆t3⊆t4⊆t5, base⊆t5, 0 lost) — genuinely
cumulative, no recolor stages, no no-op stages. The front-center cyan specimen lens (signature
feature) is fully preserved through t5 (31/31 px intact, 0 overwritten).

## Per-stage
- **base**: unchanged, byte-identical. PASS.
- **_t2** (+32 px, x33-42/y32-36): small sample-collection tray/crate on the right bench. Every
  changed pixel is transparent→opaque (additive, not a recolor). Modest, on-theme. PASS.
- **_t3** (+39 px, x8-17/y24-42): left-side sample-bin annex jutting out with amber sample markers —
  a real secondary mass, keeps all of t2. PASS.
- **_t4** (+104 px, x41-55/y3-36): tall atmospheric/soil-probe mast with an energized cyan core
  column — the prominent major add, on-canvas, does not occlude the lens. PASS.
- **_t5** (+65 px): venting aerosol-sample vapor cloud crowning the roof, anchored by a visible cyan
  drip-stem down to the roof ridge + the mast core (not a detached blob), capped with NEW premium
  gold `(243,198,58)` that is entirely absent from t4 (t5-only flourish, 12 px — not a recolor).
  Reads as fully maxed. PASS.

## Notes
- Ramp is smooth: small / small-structural / major mass / crowning flourish. None jumps the whole way.
- Gold check: the amber `(224,168,80)`/`(255,206,128)` pixels shared by t4 and t5 are pre-existing base
  sample-flag/highlight tones, not new trim. The genuinely new gold `(243,198,58)` appears only in t5.
- Additions are all unique + on-theme to a *sampling station* (trays, sample bins, probe mast, aerosol
  sampler), not generic reused parts.

mustFix: none.
