# Field Codex track — canonical content pattern

Copy this pattern for every new track. A track's lesson content is authored as
**data** — one `CodexTrack` object per file at
`apps/web/lib/ops/codex/content/<slug>.json` — and a tiny typed wrapper module
`apps/web/lib/ops/codex/tracks/<slug>.ts` is **generated** from it by
`pnpm --filter web codex:build` (never hand-edit a `tracks/*.ts` — it says
`@generated` at the top). Read a shipped file
(`apps/web/lib/ops/codex/content/gait-biomechanics.json`) as a live worked
example alongside this template.

Why data, not a TS literal: the content is pure JSON (strings, numbers, arrays,
objects — no code), and inlining ~270 lessons as a TypeScript literal made a
single 29,000-line file that was slow to typecheck and dangerous to edit.
Splitting content (JSON) from the code-split boundary (the generated wrapper)
keeps each `tracks/*.ts` ~10 lines and the content reviewable as data.

## 1. The exact `CodexTrack` shape (from `apps/web/lib/ops/codex/types.ts`)

The shape below is shown as JSON — the exact format of `content/<slug>.json`.
JSON has **no comments, no trailing commas**, double-quoted keys, and
`true`/`false`/`null` — the `//` notes here are guidance, not literal.

Authoring agents write ONE `Lesson` object per file (the `lessons[]` entry shape
below) as **strict JSON** to
`.claude/codex-pipeline/drafts/<field>-<segment>-<unit>/NN-<slug>.json`, and
`pnpm --filter web codex:merge` parses those drafts to assemble each unit (taking
the unit's `id`/`label` from the run's plan). One file per LESSON, not per unit:
a whole-unit write is ~65KB in a single tool call and reliably drops the
connection mid-response, losing the unit. Do not draft a unit as a TS literal or
as prose-to-be-converted either: a script reads these files, and both habits
historically dropped checkpoint answer keys — the TS variant also let a prose
apostrophe (`Sony's`) silently terminate a single-quoted string and corrupt the
file. Double-quoted JSON has neither failure mode.

```jsonc
{
  "slug": "my-new-track",          // globally unique, slug-safe
  "label": "My New Track",
  "home": false,                    // true ONLY for one of the six lab-type home tracks
  // "labType": "biocore",          // set ONLY when home: true (omit the key otherwise)
  "core": {
    "id": "core",
    "kind": "core",
    "label": "Core",
    "units": [
      {
        "id": "unit-1-slug",
        "label": "Unit 1 Human Label",
        "lessons": [
          {
            "id": "my-new-track-unit1-lesson-slug",   // GLOBALLY unique across every track
            "label": "Lesson Human Label",
            "readingMinutes": 5,                        // 4-6 is the norm
            "sections": [
              { "heading": "Concept heading", "body": "Real prose. 2-4 sections per lesson." }
            ],
            "workedExample": "A concrete, specific worked example — not generic filler.",
            "judgeFraming": "Why judges ask about this — tied to THIS concept, not boilerplate.",
            "checkpoint": {
              "questions": [
                // 3-5 questions total, any mix of mc / ordering / matching (see below).
              ]
            }
          }
          // ...more lessons, sequential within the unit
        ]
      }
      // ...more units, sequential within the segment
    ]
  },
  "branches": [
    // Empty [] for a Core-only (home) track. 3-5 Segment objects (kind:
    // "branch") for a specialist/flagship track — same Unit/Lesson shape as
    // Core, nested under "units".
  ]
}
```

Then generate the wrapper: `pnpm --filter web codex:build`.

## 2. The three checkpoint question kinds — copy the exact shape

(Shown as TS for readability; in `content/<slug>.json` they are JSON — double
quotes, no comments, no trailing commas.)

**MC** — every option (INCLUDING the correct one) needs a written
explanation, since the grading UI shows an explanation whenever the chosen
option isn't correct, and content-shape.test.ts asserts every option id has
one:

```ts
{
  kind: 'mc',
  id: 'q1',
  prompt: 'Question text?',
  options: [
    { id: 'a', text: 'Option A' },
    { id: 'b', text: 'Option B (the correct one)' },
  ],
  answerId: 'b',
  explanations: {
    a: 'Why A is wrong.',
    b: 'Why B is correct.',
  },
}
```

**Ordering** — `correctOrder` must be a permutation of every item id (no
dropped/added ids):

```ts
{
  kind: 'ordering',
  id: 'q2',
  prompt: 'Order these steps.',
  items: [
    { id: 'i1', text: 'Step one' },
    { id: 'i2', text: 'Step two' },
  ],
  correctOrder: ['i1', 'i2'],
  explanation: 'Why this order is correct.',
}
```

**Matching** — `correctPairs` must cover every LEFT id exactly once, and
every paired right id must be a real right-side id:

```ts
{
  kind: 'matching',
  id: 'q3',
  prompt: 'Match each X to its Y.',
  left: [{ id: 'l1', text: 'Left A' }, { id: 'l2', text: 'Left B' }],
  right: [{ id: 'r1', text: 'Right A' }, { id: 'r2', text: 'Right B' }],
  correctPairs: [['l1', 'r1'], ['l2', 'r2']],
  explanation: 'Why these pairs are correct.',
}
```

## 3. Merge, which builds the wrapper and registers the track

`pnpm --filter web codex:merge -- --plan .claude/codex-pipeline/plans/<slug>.json`
does everything downstream of the drafts: it validates them, writes
`content/<slug>.json`, regenerates the registries, and calls `codex:build` for
the wrapper + checksum.

**The registries are generated — never hand-edit them.** `CODEX_TRACKS` (with
exact `branchCount`/`lessonCount`) and `LOADERS` in `index.ts`, plus the
`ALL_TRACK_MODULES` and `WRAPPERS` module maps in the two test files, are all
derived from `content/*.json` on every merge. This is why "a new track means
THREE registries" is no longer a footgun you can trip: there is nothing to
forget, and drift is impossible by construction.

`LABTYPE_FIELDS` is the one registry that stays hand-maintained (it's an
editorial routing decision, not derivable from content) — update it only if the
new field is a lab-type default.

If you are editing content outside the pipeline, `pnpm --filter web codex:build`
alone regenerates the wrapper + checksums for an already-registered track.

## 4. Validate before calling it done

```
pnpm --filter web codex:build -- --check                                  # wrappers + checksums + registry in sync
pnpm --filter web test lib/ops/codex/__tests__/content-shape.test.ts      # semantic content invariants
pnpm --filter web test lib/ops/codex/__tests__/generated-content.test.ts  # zod schema + deep-equal + checksum lock
pnpm --filter web typecheck                                               # compiles the wrapper + registry
```

Because the content is now JSON, `typecheck` no longer shape-checks the lessons
themselves (a JSON import widens the `kind` union to `string`) — that guarantee
moved to the **zod `TrackSchema`** in `__tests__/track-schema.ts` (parsed in
`generated-content.test.ts`) plus the content-shape invariants: globally-unique +
slug-safe lesson ids, checkpoints in the 3-5 question range, complete MC
explanation maps, ordering/matching answer-key coverage, and `CODEX_TRACKS` count
accuracy. Fix any failure by editing the content — never by loosening a test.

## Pitfalls learned on Biomechanics (the reference track)

- **A lesson id collision across tracks is easy to introduce** if you reuse
  a short slug like `intro` — always prefix with the track slug
  (`biomech-what-is-biomechanics`, not `intro`).
- **A branch's first unit does NOT unlock until Core is 100% complete** —
  this is engine behavior (`unitUnlocked` in `engine.ts`), not something a
  track author controls; just be aware branches will read as "locked" in the
  panel until Core is fully authored AND a student has completed it.
- **Every MC option needs an explanation, including the correct one** — it's
  tempting to only write explanations for the wrong options; the test (and
  the panel's grading UI) require the correct option's explanation too.
- **"Why judges ask this" filler is the easiest thing to phone in** — a
  generic "judges like to see understanding" sentence adds no value; tie it
  to the SPECIFIC concept and why a judge would specifically probe it.
