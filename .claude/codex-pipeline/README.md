# Codex content pipeline

Vendored, plain-directory content pipeline for authoring Field Codex tracks
(Feature F13) — mirrors `.claude/pixel-art-pipeline/`'s layout and role. Just
as pixel-art-pipeline turns "paint a new building" into a repeatable
brief → build → review loop, this pipeline turns "author a Field Codex
segment" into a repeatable **one invocation = ONE SEGMENT** loop.

**Driver: `/codex-pipeline [<field-slug>] [--core | --branch <name> | --deepen <seg>]`**
(`.claude/commands/codex-pipeline.md`) is the orchestrator slash command. It authors
ONE segment — a field's Core, or one subfield branch — to full depth: brief the units →
author one unit at a time in parallel → adversarial fact-check each unit → assemble +
splice → shape-gate. A full field is built over ~6 runs (Core, then one per subfield).
**With NO field name it auto-picks the next unbuilt segment** from `STATUS.md` (fields
alphabetical, Core before subfields) and ticks it off when done — so you can just call
`/codex-pipeline` repeatedly to walk the whole 174-segment library in order.
`TAXONOMY.md` (the 29-field map) + `TRACK_TEMPLATE.md` (the typed shape) are the
knowledge the command reads on every run.

**Depth targets (load-bearing — the 6-month goal):** Core ≈ 45–55 lessons, each subfield
≈ 40–50, ~5–7 lessons/unit. A student's path through a field (Core + ~2 routed subfields)
≈ 120 lessons; ×~3 fields ≈ the 360-lesson / 6-month arc. A fully authored field ≈ ~270
lessons. Shallow segments (a 20-lesson Core) starve the goal — author to target, and cover
landmark work, debates, history, and competing methods, not just definitions.

There is no new skills framework here — this is a plain vendored directory,
exactly like `.claude/pixel-art-pipeline/`. Do not invent a `.claude/skills/`
entry unless the repo already has one elsewhere; it doesn't (checked before
this pipeline was created), so this directory + README **is** the skill.

## The pipeline: brief → draft-per-unit → fact-check → assemble → validate

One full pass authors ONE **segment** (a field's Core, or one subfield branch)
to the depth target — fanned out **one author per unit** so quality holds at
45–50 lessons. Steps:

1. **Brief.** Write (or reuse) `briefs/<track-slug>.md` — the track's target
   shape: label, `home`/`labType` (or none, for a specialist track), the unit
   outline for Core (and each branch, if any), target lesson counts per unit,
   tone/reading-length constraints, and a reminder of the "why judges ask
   this" requirement. This is the analogue of a pixel-art blueprint — the
   spec the author works from.

2. **Draft lessons + checkpoints.** For every lesson in the brief's outline,
   write real concept prose (2-4 `sections`), a concrete `workedExample`, a
   `judgeFraming` paragraph, and a 3-5-question `checkpoint` (mix of `mc` /
   `ordering` / `matching` — see `TRACK_TEMPLATE.md` for the exact shape).
   Every MC option needs a written explanation (including the correct
   option); every ordering/matching question needs a non-empty explanation.
   Draft directly into the typed module shape from the start — do not draft
   in prose first and "convert" later, since that step tends to silently
   drop the checkpoint answer key.

3. **Adversarial fact-check.** Before splicing a draft in, run an adversarial
   review pass (see `reviews/<track-slug>-<n>.md` for the worked
   Biomechanics example) — a second pass whose ONLY job is to find: (a) any
   scientifically wrong or overstated claim in the lesson prose/worked
   example, (b) any checkpoint question whose `answerId` /
   `correctOrder` / `correctPairs` doesn't actually match the stated
   explanation (a mis-keyed answer is worse than no question at all — it
   actively teaches something false), and (c) any lesson whose "why judges
   ask this" framing is generic filler rather than tied to the specific
   concept. Log every finding as a numbered, actionable fix in the review
   file, the same way pixel-art review artifacts do. Do not splice a track
   until its review file has zero unresolved FAIL items.

4. **Splice into a typed module.** Create/update
   `apps/web/lib/ops/codex/tracks/<track-slug>.ts` following
   `TRACK_TEMPLATE.md` exactly (imports, doc comment, `export default
   track`). Register the new track in `apps/web/lib/ops/codex/index.ts`:
   add an entry to `CODEX_TRACKS` (with accurate `branchCount`/`lessonCount`)
   and a `LOADERS` entry (a literal `import()` — never a computed path).

5. **Run the content-shape test.** `pnpm --filter web test
   lib/ops/codex/__tests__/content-shape.test.ts` (or the full `pnpm
   --filter web test`) must pass — it is the automated backstop that catches
   duplicate/non-slug-safe lesson ids, checkpoints outside the 3-5 question
   range, missing answer keys/explanations, and `CODEX_TRACKS` count drift.
   A track that fails this test is not done, regardless of review status.

## Files in this directory

- `README.md` — this file.
- `TRACK_TEMPLATE.md` — the canonical typed-module code pattern (copy this
  when starting a new track), plus the exact `CodexTrack`/`Segment`/`Unit`/
  `Lesson`/`Checkpoint` shape and the registration + validation steps.
- `briefs/<track-slug>.md` — one brief per track (the Biomechanics brief is
  the worked reference).
- `reviews/<track-slug>-<n>.md` — one adversarial fact-check pass per round
  (numbered from 0; a track may need more than one round before it's clean).

## Cost discipline

Track content is authored (by a human or an agent, following this pipeline)
directly into typed TS — there is no runtime LLM call anywhere in the
lesson/checkpoint content path. The ONLY LLM call in the whole Field Codex
feature is the Study Plan classifier (`lib/ops/codex/study-plan.ts`), which
is unrelated to this content-authoring pipeline. Authoring a track through
this pipeline costs zero production Anthropic spend.
