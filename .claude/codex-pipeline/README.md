# Codex content pipeline

Vendored, plain-directory content pipeline for authoring Field Codex tracks
(Feature F13) — mirrors `.claude/pixel-art-pipeline/`'s layout and role. Just
as pixel-art-pipeline turns "paint a new building" into a repeatable
brief → build → review loop, this pipeline turns "author a Field Codex field"
into a repeatable **one invocation = ONE FIELD** loop.

**Driver: `/codex-pipeline [<field-slug>] [--core | --branch <name> | --deepen <seg>]`**
(`.claude/commands/codex-pipeline.md`) is the orchestrator slash command. It authors a
whole field — Core + all 5 subfield branches, ~45 units / ~270 lessons — in one run:
brief each segment → author one unit per lane in parallel → adversarially fact-check
each unit → merge deterministically → shape-gate. **With NO field name it auto-picks
the next unbuilt field** from `STATUS.md` and ticks off what it ships, so you can call
`/codex-pipeline` repeatedly to walk the whole 29-field library in order. The partial
forms (`--core`, `--branch`, `--deepen`) exist for touch-ups.

`TAXONOMY.md` (the 29-field map) + `TRACK_TEMPLATE.md` (the typed shape) are the
knowledge the command reads on every run — **sliced, never whole** (grep the one
target field's block; extract one example lesson with `node`; the multi-MB content
JSONs must never be `Read` at all).

There is no new skills framework here — this is a plain vendored directory,
exactly like `.claude/pixel-art-pipeline/`. Do not invent a `.claude/skills/`
entry unless the repo already has one elsewhere; it doesn't (checked before
this pipeline was created), so this directory + README **is** the skill.

## The shape of a run

The orchestrator (Opus) does three cheap things — slice the references, run one
Workflow, run one script — and everything expensive happens inside subagents or
inside deterministic code:

1. **Slice** (orchestrator). Grep the field's ~22-line TAXONOMY block; extract one
   example lesson with `node -e`; lift the ~40-line typed contract from
   `TRACK_TEMPLATE.md`. Assemble the compact `args`.

2. **Brief → draft → fact-check** (`author-field.workflow.mjs`, one Workflow).
   Per segment, a brief agent (Opus · xhigh) expands the taxonomy scope into a
   full-depth unit plan. Every unit of every segment then gets one lane: author → check →
   HIGH-only adversarial verify → fix, looping to a cap with an Opus escalation
   when HIGH errors persist. Each author writes **one file per LESSON** to
   `drafts/<field>-<segment>-<unit>/NN-<slug>.json` — never a whole unit in one
   write (see Cost discipline). A dead author is retried once. The workflow
   returns a `plan` naming every lesson file.

3. **Merge** (`pnpm --filter web codex:merge -- --plan plans/<field>.json`).
   Validates every draft against the real `CodexTrack` shape and the
   content-shape invariants, upserts the segments into
   `apps/web/lib/ops/codex/content/<slug>.json`, regenerates every registry from
   `content/`, runs `codex:build` for the wrappers + checksums, and deletes the
   consumed drafts. Zero agents, zero tokens.

4. **Gate** (orchestrator). `codex:build --check` → `typecheck` → `lint` →
   `content-shape.test.ts` → `generated-content.test.ts`. A field that fails any
   of these is not done, regardless of review status. Fix by editing content,
   never by loosening a test.

## Depth targets (load-bearing — the 6-month goal)

Core ≈ **45–55 lessons**, each subfield ≈ **40–50**, ~5–7 lessons/unit. A student's
path through a field (Core + ~2 routed subfields) ≈ 120 lessons; ×~3 fields ≈ the
360-lesson / 6-month arc. A fully authored field ≈ ~270 lessons; 29 fields ≈
~7,000–8,000 lessons. Shallow segments (a 20-lesson Core) starve the goal — author to
target, and cover landmark work, debates, history, and competing methods, not just
definitions. **Cheap models do not license shallow content**; the depth targets and
the fact-check gate are independent of which model writes the prose.

## Files in this directory

- `README.md` — this file.
- `author-field.workflow.mjs` — brief + draft + fact-check, run by the command as
  `Workflow({ scriptPath, args })`. Owns the per-segment brief, the
  one-lane-per-unit loop, and the model/effort tiers. Its header documents why
  each cost rule exists — read it before changing any of them.
- `TAXONOMY.md` — the canonical 29-field map (slugs 1:1 with the Data Terminal
  chart fields). **Grep your field's block; never read it whole.**
- `TRACK_TEMPLATE.md` — the canonical content pattern and the exact
  `CodexTrack`/`Segment`/`Unit`/`Lesson`/`Checkpoint` shape.
- `STATUS.md` — the 29-field × 6-segment build tracker; the no-argument run reads
  it to auto-pick.
- `drafts/` — one JSON `Unit` per authored unit, in flight. Consumed and deleted
  by `codex:merge`; empty between runs.
- `plans/<field>.json` — the merge plan the workflow returns (segments → units →
  draft paths). The input to `codex:merge`.
- `reviews/<field>.md` — the fact-check log per run (rounds + what got corrected).
- `briefs/` — legacy hand-written briefs from before briefing moved into the
  workflow; kept as reference for tone/depth, not read by the pipeline.
- `salvage/` — content pulled out of the library but worth keeping.

Assembly lives in `apps/web/lib/ops/codex/scripts/merge-codex-segments.mjs`
(`pnpm --filter web codex:merge`), next to the wrapper builder it calls — it's
product tooling, not agent scaffolding.

## Cost discipline

**Production:** track content is authored directly into JSON — there is no runtime
LLM call anywhere in the lesson/checkpoint content path. The only LLM call in the
whole Field Codex feature is the Study Plan classifier
(`lib/ops/codex/study-plan.ts`), unrelated to this pipeline. Shipped Codex content
costs zero production Anthropic spend.

**Authoring (this pipeline):** the run itself is the cost, so it's engineered to be
cheap without going shallow.

**Budget ~10–15M tokens and ~250 agents for a WHOLE field (~275 lessons)**, ~1.5h
wall-clock. Measured: csalgo 325 agents / 19.6M → dsml 245 / 14.8M after the
checker cuts; expect ~10M now that authors no longer self-count. This was never a
regression from the old per-segment flow — a whole chemistry field was ~312 agents
/ ~17.6M across its six separate runs; consolidating into one invocation made the
number visible, not larger, and per word of content it measured ~20% cheaper.
Wall-clock is dominated by the concurrency cap, `min(16, cores-2)` (9 on an 11-core
box), so 43 lanes queue — `/workflows` showing most lanes "not started" is the cap,
not a stall.

Each rule below was bought with a measured regression — the workflow header and the
command's "efficiency contract" explain each one:

- **Cheap-by-default models/effort.** Sonnet 5 across author → check → verify →
  fix; Opus · xhigh for the segment briefs (they own depth, one brief steers ~7
  author lanes, and all six are a few percent of a field's spend) and Opus as an
  escalation re-author only. The orchestrator runs Opus · xhigh, pinned in the
  command's frontmatter.
- **The fact-check loop exits on HIGH only.** MED/LOW fixes are applied once and
  don't earn another round. Blocking on MED made every unit run to the round cap
  arguing about phrasing: the shipped logs show 21 rounds across 8 units with zero
  open HIGH findings.
- **Briefing is a subagent, not the orchestrator.** Inline briefing made the Opus
  context grow per segment and get re-sent every turn — quadratic, which is why
  multi-segment runs used to cost more and produce less.
- **Assembly is a script.** `codex:merge` never hands a 3.5MB / 45,000-line content
  JSON to an agent, and regenerates the registries instead of hand-editing them.
- **Batched adversarial verify** — 2 lenses per unit, HIGH findings only; clean
  units skip verify. Each finding carries a verbatim `excerpt`, so the lenses judge
  from the quote instead of re-reading the draft.
- **The CHECKER was the pipeline's cost — it is budgeted, keep it that way.** On the
  first whole field, check = **53% of all tokens** (89 agents × ~30 turns × 8.1
  WebSearches × 6.7 Reads ≈ 2M each). It is nearly all cache-read: every search
  result and file stays in context and is re-sent on every later turn, so cost grows
  with TURNS, not with the 60KB unit. Two cuts, neither touching what the gate
  catches — **scoped re-checks** (later rounds see only the files the fixer touched;
  46 of those 89 were re-checks that re-read all six lessons and redid every search
  to confirm an edit to one) and a **WebSearch budget** (4 first pass, 2 re-check,
  aimed at dates/attributions/numbers). Measured on the next field: checker turns
  30.4 → 18.4, searches 8.1 → 2.8, per-checker 2.08M → 1.03M, **check 53% → 24%**.
- **Never ask an agent to MEASURE its own output — enforce the target in a later,
  cheaper phase.** Bought the hard way: telling authors to "count the words of your
  section prose before you write each file" made every one of them build a write →
  `Bash` wc → `Edit` trim → recount loop, per lesson. Author turns 22.3 → **55.7**,
  Bash 4.7 → 12.7, Edit 0.4 → 8.7, and the phase went **26% → 60%** of the field —
  every extra turn re-sends the whole context. It held the 400–500 band (97%) but
  cost ~5M tokens in the single most expensive phase, cancelling most of the checker
  win. The band is now the **checker's out-of-band MED + the fixer** (9% of spend):
  same work, ~1/7 the price, band approximately rather than exactly right.
- For context: briefs are **1%** of spend and Opus escalations **3%** — optimizing
  those is noise. Escalation rate tracks CLAIM DENSITY, not model weakness.
- **One Write per LESSON, never per unit.** Authors used to emit a whole ~65KB
  unit in a single Write (~17K tokens of tool input in one response); on the first
  live whole-field run **4 of 21 authors died** with `API Error: Connection closed
  mid-response`, i.e. ~19% of lanes lost their entire unit. Per-lesson writes are
  ~11KB and complete safely. The lesson paths are deterministic, so a retried
  author overwrites exactly the same files, and the plan names every expected file
  so a lesson lost to a drop is a named merge error rather than a silently short
  unit. **Do not "simplify" this back to one file per unit.**
- **Distilled prompts** — each agent gets a compact typed contract + one example
  lesson + its own spec, never the 654-line taxonomy or a content JSON.
