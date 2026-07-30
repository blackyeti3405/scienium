# Runbook: LLM usage, cost, and AI data-sharing summary

_Pilot-minimum (PILOT-6). Also records the verified Anthropic call-site
inventory (PILOT-2) — keep it current when adding an AI feature; the sweep test
`apps/web/test/paid-work-guard.test.ts` enforces the guard column mechanically._

## Guardrails (how spend is bounded)

- Every Anthropic-reaching route runs behind the paid `ai` (12/min/user) or `upload` (8/min/user) tier, or `assertCron`. Paid tiers **fail closed** in production without a shared Upstash store (`lib/rate-limit.ts`) — that 503 is the emergency spend cutoff (see [incident-response.md](incident-response.md)).
- Every call/stream through the shared client (`lib/anthropic.ts`) emits an `llm.call`/`llm.stream` event with model, duration, and token counts — spend by route/day is queryable from Vercel logs.
- Prompt caching + local compute are preferred (house rule); several features cache on content hashes (study plan `sourceHash`, quiz reuse) so retries and refreshes don't re-bill.

## Call-site inventory (verified 2026-07-17)

Models in use: `claude-sonnet-5` (grading, review, chat, generation), `claude-haiku-4-5-20251001` (classification, extraction, relevance, curation, study-plan).

| Workflow | Route(s) | Guard | Extra bounds |
| --- | --- | --- | --- |
| Paper metadata extraction | `POST /api/papers` → job; 5-min cron | `upload` / `assertCron` | Durable `PaperProcessingJob`: atomic claim, 3 attempts, backoff, terminal state; cron batch ≤ 30 |
| Upload relevance gate | `POST /api/papers` | `upload` | one call per upload |
| Discovery promote relevance gate | `POST /api/discovery/source/[id]/promote` | `mutate` + explicit `ai` gate | — |
| Topic-change batch relevance | `POST /api/discovery/topic` (confirmWipe) | `mutate` + explicit `ai` gate | one batched call |
| Lab-type classification | `POST /api/team/advance-phase` | `mutate` + explicit `ai` gate | once per lit-review completion |
| Quiz generate / retry / grade | `papers/[id]/quiz`, `quiz/retry`, `quiz/grade` | `ai` | graded-once 409 guards |
| Explanation check | `papers/[id]/explain` | `ai` | — |
| Paper chat | `papers/[id]/chat` (stream) | `ai` | server-owned turns |
| Synthesis check | `literature/synthesis/[id]/check` | `ai` | — |
| Vocab deck build | `literature/vocab/build` | `ai` | ≤ 8 curation calls/request; 200-card deck cap; already-carded papers free |
| Expertise exam generate / grade | `expertise`, `expertise/grade` | `ai` | daily feature cap; grade-once guards |
| Research plan review / idea check | `research-plan/review` (stream), `idea-check` (stream) | `ai` | — |
| Failure-log follow-up | `failure-log/[id]/followup` | `ai` | — |
| Codex study plan | `ops/codex/study-plan` | `ai` | atomic 2/team/day re-run cap; `sourceHash` cache short-circuits unchanged input |
| Vega study chat | `ops/vega-study` | `ai` | — |

## Watching spend

- Anthropic console → Usage: the authoritative bill.
- Vercel logs: sum `llm.call`/`llm.stream` `inputTokens`/`outputTokens` grouped by `model` for attribution by day; spikes trace to a route via surrounding request logs.
- Rough pilot expectation: Haiku calls are fractions of a cent; Sonnet calls are the material cost — quiz/grading/review volume drives the bill.

## AI data-sharing and retention summary (for school approval)

- **Provider**: Anthropic (Claude API), via the official SDK over TLS. No other model provider is used.
- **What is sent**: paper text excerpts students upload, student-written answers/summaries/research ideas, and feature prompts. Student **identities are not sent** — no names, emails, or ids are included in prompts.
- **What is stored where**: model outputs (quiz questions, feedback, chat replies) are stored in the app's own database, team-scoped. The app relies on Anthropic's standard API data handling (API inputs/outputs not used to train models, per Anthropic's commercial terms); retention on Anthropic's side follows their published policy — review current terms with the school before the pilot.
- **Injection posture**: student/paper text is delimited and framed as data-not-instructions in prompts (SEC-9 convention), so embedded text can't redirect grading.
- **Logging**: the app's own logs record token counts and durations only — never prompts, paper text, or student submissions (`lib/observability/log.ts` has no payload field by design).
