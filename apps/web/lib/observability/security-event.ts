import 'server-only'
import * as Sentry from '@sentry/nextjs'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { currentRequestId, logEvent, opaqueId } from '@/lib/observability/log'

/**
 * The durable security ledger, and the alert thresholds over it (REFACTOR2 P1-5).
 *
 * `lib/observability/log.ts` covers the request layer: who was refused, how slow
 * a route was, what a worker did. It is the right tool for an incident happening
 * now and the wrong one for the question a pilot operator actually gets asked
 * weeks later — "who made that student the lead", "who approved that public
 * page", "who ran the delete". Log drains expire, and by then the domain rows
 * that would have answered have been overwritten by the very change in question.
 *
 * So this module is deliberately NARROW. It records only acts of AUTHORITY —
 * provisioning, role and membership changes, destructive commands, moderation
 * decisions, and refusals — and it records them with ids, enums and timestamps,
 * never content. Everything else stays in the log drain where it belongs.
 *
 * ## Append-only means append-only
 *
 * One exported write. No update, no delete, nothing that takes an id and mutates
 * a row. `SecurityEvent` carries no foreign keys, so the domain operation an
 * event records cannot cascade it away (nor can the audit trail block a
 * teardown) — pinned in `test/pg/invariants.pg.test.ts`.
 *
 * ## Never fails the caller
 *
 * A dropped audit row is a gap in a report. A thrown one is a student's removal
 * that half-happened, or a 403 turned into a 500. `recordSecurityEvent` returns
 * a boolean and swallows everything, reporting its own failure through the log
 * drain (`security_event.write_failed`) — the same posture `lib/ai/spend.ts`
 * takes for accounting.
 */

export type SecurityEventKind =
  /** A lab was created. */
  | 'provision.team'
  /** A classroom was created. */
  | 'provision.class'
  /** An account became a teacher — the single biggest privilege grant here. */
  | 'provision.teacher_role'
  /** Lead handed over, or reassigned by a teacher. */
  | 'authority.role_changed'
  /** Someone joined, left, was removed, or was un-enrolled (team or class). */
  | 'authority.membership'
  /** A join code was minted or rotated. Rotation is the revocation lever. */
  | 'authority.join_code'
  /** A server-issued destructive proposal was presented — executed or refused. */
  | 'command.destructive'
  /** A teacher approved or rejected public content. */
  | 'moderation.decision'
  /** A visitor reported a published showcase (REFACTOR2 P1-6). */
  | 'moderation.report'
  /** Staff pulled published content out of public serving, or put it back. */
  | 'moderation.takedown'
  /** A guard refused a request (scope, phase, role, origin, identity). */
  | 'authz.denied'
  /** An unauthorized hit on a scheduled route: a probe or a broken scheduler. */
  | 'cron.denied'
  /** A queued job exhausted its attempts and was parked. */
  | 'worker.dead_letter'
  /** Provider spend crossed the daily alert threshold. */
  | 'budget.pressure'
  /** One of the rules below fired. Stored so "when did we alert" is answerable. */
  | 'alert.threshold'

/** What the act was performed ON. Bounded so the column stays queryable. */
export type SecurityTargetType =
  | 'team'
  | 'team_member'
  | 'class'
  | 'class_member'
  | 'user'
  | 'showcase'
  | 'invite'
  | 'route'
  | 'papers'
  | 'discovery_tree'
  | 'notification_email'
  | 'data_request'

export interface SecurityEventInput {
  kind: SecurityEventKind
  outcome: 'ok' | 'denied' | 'error'
  /**
   * Who acted, when `actorUserId` is null and cannot say: a signed-out caller,
   * an unauthenticated cron probe, a background worker.
   */
  actorType: 'user' | 'teacher' | 'system' | 'anonymous'
  /** `User.id` where one is resolved, else the Clerk id, else null. */
  actorUserId?: string | null
  targetType?: SecurityTargetType
  targetId?: string | null
  /** The team or class this act happened within, when there is one. */
  scopeId?: string | null
  /**
   * WHY, as a snake_case token — `removed_by_lead`, `phase_locked`. Sanitized
   * at the sink (see `boundedReason`), so this is not a place free text can be
   * smuggled through even by a call site that means to.
   */
  reason?: string | null
  /** Defaults to the current request's correlation id. */
  requestId?: string | null
  /**
   * Idempotency key for events emitted from RETRIED work. A worker that comes
   * back after a crash, or a daily sweep that runs twice, must not append a
   * second row for one fact. Omit it for events that legitimately repeat.
   */
  dedupeKey?: string | null
}

/**
 * A reason is an operator-facing token, and this is what makes that true rather
 * than merely intended.
 *
 * The type cannot enforce it — every call site would need its literal added to a
 * union, and the first `string`-typed service variable would force a cast. So
 * the SHAPE is enforced here, at the sink, exactly as `logEvent` pseudonymizes
 * ids at the sink: lowercase, no whitespace, ≤64 chars. A student's answer, a
 * paper title, a teacher's moderation note and an LLM reply all fail that
 * pattern on their first space or capital, and land as `unbounded_reason` —
 * visible in the data, and carrying nothing.
 */
const BOUNDED_REASON = /^[a-z0-9][a-z0-9_.:-]{0,63}$/

function boundedReason(reason: string | null | undefined): string | null {
  if (!reason) return null
  return BOUNDED_REASON.test(reason) ? reason : 'unbounded_reason'
}

/** The row, with every sanitization applied. The ONE place a column is filled in. */
function rowFor(input: SecurityEventInput) {
  return {
    kind: input.kind,
    outcome: input.outcome,
    actorType: input.actorType,
    actorUserId: input.actorUserId ?? null,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    scopeId: input.scopeId ?? null,
    requestId: input.requestId ?? currentRequestId() ?? null,
    reason: boundedReason(input.reason),
    dedupeKey: input.dedupeKey ?? null,
  }
}

/**
 * Append one event INSIDE a caller's transaction, so it commits with the change
 * it describes or not at all.
 *
 * Used where the domain write is already transactional — a membership departure,
 * a class decision, a moderation decision. Doing those through
 * `recordSecurityEvent` would use a separate connection and leave a row
 * asserting that a removal happened when the transaction that would have
 * performed it rolled back. An audit trail that records things that did not
 * happen is not better than one with gaps; it is worse.
 *
 * Deliberately AWAITED and un-caught, exactly like the domain event rows it sits
 * beside: if the ledger write fails, the authority change does not commit.
 *
 * No `dedupeKey` and no alerting: a unique violation inside a Postgres
 * transaction poisons the whole transaction, and the retry-dedupe cases (workers,
 * daily sweeps) are all non-transactional anyway.
 */
export function recordSecurityEventTx(
  tx: Prisma.TransactionClient,
  input: Omit<SecurityEventInput, 'dedupeKey'>,
): Promise<unknown> {
  return tx.securityEvent.create({ data: rowFor(input), select: { id: true } })
}

/**
 * Append one event. Returns whether THIS call wrote it — false means the row was
 * already there (a retry presenting the same `dedupeKey`) or the write failed.
 *
 * The boolean is not decoration: `maybeAlert` uses it to make the unique index
 * itself the alert's rate limiter.
 */
export async function recordSecurityEvent(input: SecurityEventInput): Promise<boolean> {
  try {
    await db.securityEvent.create({ data: rowFor(input), select: { id: true } })
  } catch (err) {
    // P2002 is the DESIGNED outcome of a retry, not a failure: the event is
    // already recorded, which is precisely what the dedupe key asked for.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return false
    logEvent({
      event: 'security_event.write_failed',
      outcome: 'error',
      detail: `${input.kind}:${err instanceof Error ? err.constructor.name : 'unknown'}`,
    })
    return false
  }
  await maybeAlert(input)
  return true
}

// ─── Alert thresholds ─────────────────────────────────────────────────────────
//
// Numbers, not a monitoring stack. Each rule is "N events of this kind, with a
// non-ok outcome, inside this window, for this subject". Crossing one raises a
// Sentry issue — the destination the pilot operator already watches
// (docs/runbooks/incident-response.md). Rationale for each number is in that
// runbook, next to what to do about it.

interface AlertRule {
  windowMs: number
  /** Alert when the count of matching events reaches this. */
  threshold: number
  /** What the count is grouped by — the thing being alerted ABOUT. */
  by: 'actor' | 'scope' | 'global'
  /** One line for the Sentry issue title. */
  label: string
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const ALERT_RULES: Partial<Record<SecurityEventKind, AlertRule>> = {
  // A student who mistypes a URL denies once or twice. Thirty refusals in ten
  // minutes from ONE actor is a script, a broken client, or someone walking ids.
  'authz.denied': { windowMs: 10 * MINUTE, threshold: 30, by: 'actor', label: 'repeated scope denials' },
  // Vercel Cron either has the secret or does not. Any sustained run of failures
  // is a rotation nobody finished, or someone knocking.
  'cron.denied': { windowMs: HOUR, threshold: 5, by: 'global', label: 'unauthorized cron attempts' },
  // Only REJECTIONS reach here (an approval is `ok`). Ten rejected submissions
  // for one team in a day is a team repeatedly posting content a teacher refuses.
  'moderation.decision': { windowMs: 24 * HOUR, threshold: 10, by: 'scope', label: 'repeated moderation rejections' },
  // Reports are recorded as `denied` for the same reason a rejection is: the
  // outcome column is what marks an event as being ABOUT abuse, and only those
  // are counted. Three DISTINCT reporters (the unique key already collapses a
  // repeat) on one team's public page in a day is past what a teacher should
  // discover by chance in a queue. Never auto-unpublishes — a brigade of three
  // is cheap to organize in a classroom, so this raises a human, not an action.
  'moderation.report': { windowMs: 24 * HOUR, threshold: 3, by: 'scope', label: 'reports on a public showcase' },
  // Threshold 1 = tell me the first time. A takedown is rare, irreversible-
  // feeling to the students it happens to, and the point at which the runbook
  // says to escalate to the owner — so the owner should not learn about it from
  // the queue. Restores are `ok` and stay silent.
  'moderation.takedown': { windowMs: 24 * HOUR, threshold: 1, by: 'global', label: 'public showcase taken down' },
  // Only REFUSED proposals reach here. A valid destructive command consumes its
  // token once; twenty refusals in an hour is a client replaying or guessing.
  'command.destructive': { windowMs: HOUR, threshold: 20, by: 'scope', label: 'refused destructive commands' },
  // Dead letters are deduped per row, so this counts DISTINCT parked jobs.
  'worker.dead_letter': { windowMs: HOUR, threshold: 3, by: 'global', label: 'jobs parked after exhausting attempts' },
  // Deduped per UTC day, so the first crossing alerts and the rest of the day is
  // quiet. Threshold 1 = tell me the first time.
  'budget.pressure': { windowMs: 24 * HOUR, threshold: 1, by: 'global', label: 'daily provider spend over threshold' },
}

/**
 * Count this event's peers in the window, and raise ONE Sentry issue per window
 * when the rule is crossed.
 *
 * Two things keep this cheap enough to run on the write path:
 *
 *  - only non-`ok` outcomes are considered at all, so the normal case (a join,
 *    an approval, a lead handover) does no query whatsoever. Every rule is
 *    therefore, by construction, a rule about failure or abuse;
 *  - the alert's own rate limit is the `dedupeKey` unique index — the bucketed
 *    `alert.threshold` row either inserts (first crossing this window: alert) or
 *    hits P2002 (already alerted: stay quiet). No timer, no in-memory state, and
 *    it holds across serverless instances, which an in-memory cooldown would not.
 */
async function maybeAlert(input: SecurityEventInput): Promise<void> {
  if (input.outcome === 'ok') return
  const rule = ALERT_RULES[input.kind]
  if (!rule) return

  try {
    const subject =
      rule.by === 'actor' ? (input.actorUserId ?? null) : rule.by === 'scope' ? (input.scopeId ?? null) : null
    const count = await db.securityEvent.count({
      where: {
        kind: input.kind,
        outcome: { not: 'ok' },
        createdAt: { gte: new Date(Date.now() - rule.windowMs) },
        ...(rule.by === 'actor' ? { actorUserId: subject } : {}),
        ...(rule.by === 'scope' ? { scopeId: subject } : {}),
      },
    })
    if (count < rule.threshold) return

    // Bucket by window so a sustained problem alerts once per window rather than
    // once per event past the threshold.
    const bucket = Math.floor(Date.now() / rule.windowMs)
    const fired = await recordSecurityEvent({
      kind: 'alert.threshold',
      outcome: 'error',
      actorType: 'system',
      actorUserId: rule.by === 'actor' ? subject : null,
      scopeId: rule.by === 'scope' ? subject : null,
      reason: input.kind,
      dedupeKey: `alert:${input.kind}:${subject ?? 'global'}:${bucket}`,
    })
    if (!fired) return

    // Sentry is the destination because it is the console the operator already
    // opens first (docs/runbooks/incident-response.md). The message carries the
    // PSEUDONYM, never the id — Sentry is a third-party sink and the same rule
    // that governs the log drain governs it.
    Sentry.captureMessage(
      `[security] ${rule.label}: ${count} in ${Math.round(rule.windowMs / MINUTE)}m` +
        (subject ? ` (${rule.by}=${opaqueId(subject)})` : ''),
      'warning',
    )
  } catch {
    // An alert that throws must not take the audit write — or the request — with
    // it. The row is already committed; this is best-effort notification.
  }
}
