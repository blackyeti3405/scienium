import { z } from 'zod'
import { requestJson } from '@/lib/api/client'

/**
 * The Field Codex tab's read contract.
 *
 * ## Why this is parsed and not cast
 *
 * `CodexTab.refresh` was:
 *
 * ```ts
 * fetch('/api/ops/codex/progress')
 *   .then((r) => r.json())
 *   .then((d: ProgressPayload) => setPayload(d))
 *   .catch(() => setLoadError(…))
 * ```
 *
 * No `r.ok`. On any non-2xx — a rate limit, an expired session, a 500 — the
 * route's `{ error: "…" }` body was committed **as the payload**. The guard that
 * follows is `if (loadError || !payload)`, and an error object is truthy, so it
 * passed: `CodexHome` then read `payload.progress.filter(...)` on `undefined`
 * and the whole tab threw. Reproduced against the original, verbatim, with a
 * 429 body: *"Cannot read properties of undefined (reading 'filter')"*.
 *
 * `refresh()` is also what runs after **every completed lesson**, so the cheapest
 * way to blank a student's Codex was to finish one lesson too many in a minute.
 *
 * `requestJson` checks the status, surfaces the server's own message, and parses
 * — so a shape that is not this one is a caught error, never a render crash.
 */
const RecommendedTrack = z.object({
  trackSlug: z.string(),
  branchSlugs: z.array(z.string()),
  rationale: z.string(),
})

export const CodexProgressPayload = z.object({
  progress: z.array(
    z.object({
      trackSlug: z.string(),
      lessonId: z.string(),
      completed: z.boolean(),
      bestScore: z.number(),
      kpAwarded: z.number(),
      completedAt: z.string().nullable(),
    }),
  ),
  dailyCap: z.object({ limit: z.number(), completedToday: z.number() }),
  studyPlan: z
    .object({
      tracks: z.array(RecommendedTrack),
      manualTrackSlugs: z.array(z.string()),
      generatedAt: z.string(),
    })
    .nullable(),
})

export type CodexProgressPayload = z.infer<typeof CodexProgressPayload>

export function fetchCodexProgress(): Promise<CodexProgressPayload> {
  return requestJson('/api/ops/codex/progress', CodexProgressPayload)
}
