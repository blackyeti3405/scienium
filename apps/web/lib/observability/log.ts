/**
 * Minimum viable structured logging (PILOT-5).
 *
 * One JSON line per event on stdout/stderr, queryable in the Vercel log drain.
 * Redaction is BY DESIGN: the event shape has no payload field — prompts,
 * paper text, student submissions, emails, and tokens simply cannot be logged
 * through it. `detail` is for short operator-facing strings (error codes,
 * provider names, state names), never user content.
 *
 * Correlation uses opaque ids only (Clerk user id, cuid team/job ids). On
 * Vercel, `requestIdFrom(req)` reuses the platform's `x-vercel-id` so a log
 * line joins against the platform's own request logs; elsewhere it mints a
 * UUID.
 */

export interface LogEvent {
  /** Dot-namespaced event name, e.g. `rate_limit.denied`, `llm.call`, `paper_job.failed`, `cron.papers`. */
  event: string
  requestId?: string
  route?: string
  outcome?: 'ok' | 'denied' | 'error'
  durationMs?: number
  /** Opaque ids only — never names/emails. */
  userId?: string | null
  teamId?: string | null
  jobId?: string
  provider?: string
  model?: string
  tier?: string
  attempts?: number
  inputTokens?: number
  outputTokens?: number
  /** Short operator-facing string (HTTP status, error class, state). NEVER user content. */
  detail?: string
}

export function logEvent(e: LogEvent): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...e })
  if (e.outcome === 'error') console.error(line)
  else console.log(line)
}

/** Correlation id for a request: Vercel's own request id when present. */
export function requestIdFrom(req: { headers: { get(name: string): string | null } }): string {
  return req.headers.get('x-vercel-id') ?? crypto.randomUUID()
}
