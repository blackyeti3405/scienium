/**
 * Minimum viable structured logging (PILOT-5).
 *
 * One JSON line per event on stdout/stderr, queryable in the Vercel log drain.
 * Redaction is BY DESIGN: the event shape has no payload field — prompts,
 * paper text, student submissions, emails, and tokens simply cannot be logged
 * through it. `detail` is for short operator-facing strings (error codes,
 * provider names, state names), never user content.
 *
 * Correlation uses opaque ids only. On Vercel, `requestIdFrom(req)` reuses the
 * platform's `x-vercel-id` so a log line joins against the platform's own
 * request logs; elsewhere it mints a UUID.
 *
 * `userId` and `teamId` are PSEUDONYMIZED by the sink itself (REFACTOR2 P1-5).
 * A Clerk user id in a log line is not opaque in the sense that matters — it is
 * a primary key, so anyone holding the drain can join it straight back to a
 * named minor. Hashing at the sink rather than at each call site means every
 * existing caller became pseudonymous without touching one of them, and a new
 * caller cannot forget. To find a known team's lines, hash its id the same way:
 * `sha256(<id>).slice(0, 12)` (`opaqueId`).
 */

import { AsyncLocalStorage } from 'node:async_hooks'
import { createHash } from 'node:crypto'

/**
 * Stable pseudonym for an identifier. 12 hex chars ≈ 48 bits — far past
 * collision risk at pilot log volume, and not invertible without already
 * holding the id. Exported so an operator (or a test) can compute the same
 * value from an id they legitimately have.
 */
export function opaqueId(id: string | null | undefined): string | null | undefined {
  if (id === null || id === undefined) return id
  return createHash('sha256').update(id).digest('hex').slice(0, 12)
}

export interface LogEvent {
  /** Dot-namespaced event name, e.g. `rate_limit.denied`, `llm.call`, `paper_job.failed`, `cron.papers`. */
  event: string
  requestId?: string
  route?: string
  outcome?: 'ok' | 'denied' | 'error'
  durationMs?: number
  /** HTTP status of the response this event describes. */
  status?: number
  /** Raw ids in, pseudonyms out — `logEvent` hashes both before serializing. */
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
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    ...e,
    userId: opaqueId(e.userId),
    teamId: opaqueId(e.teamId),
  })
  if (e.outcome === 'error') console.error(line)
  else console.log(line)
}

/** Correlation id for a request: Vercel's own request id when present. */
export function requestIdFrom(req: { headers: { get(name: string): string | null } }): string {
  return req.headers.get('x-vercel-id') ?? crypto.randomUUID()
}

const requestIdStore = new AsyncLocalStorage<string>()

/**
 * Bind this request's correlation id to the rest of its async context, and
 * return it (REFACTOR2 P1-5).
 *
 * A security event is written from wherever the decision is MADE —
 * `lib/team/membership.ts` inside a transaction, `lib/api/destructive-proposal.ts`
 * from a service — and none of those see the `Request`. The alternative was an
 * optional `requestId` threaded through eight service signatures that have no
 * other reason to know one, which is the same trade `enterAiScope` already
 * settled the same way one module over.
 *
 * IDEMPOTENT: the wrapper and the guard both call it, and off Vercel
 * `requestIdFrom` mints a fresh UUID each time — so the first caller wins and
 * the log line, the denial event, and the security row all carry ONE id.
 */
export function beginRequest(req: { headers: { get(name: string): string | null } }): string {
  const existing = requestIdStore.getStore()
  if (existing) return existing
  const id = requestIdFrom(req)
  requestIdStore.enterWith(id)
  return id
}

/** The current request's correlation id, or undefined outside a request (cron, workers). */
export function currentRequestId(): string | undefined {
  return requestIdStore.getStore()
}
