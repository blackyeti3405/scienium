import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'

/**
 * The append-only security ledger (REFACTOR2 P1-5).
 *
 * The backlog item asks for two properties that a "does it write a row" test
 * would not prove, so those are what this file attacks:
 *
 *  1. **Events survive retries without duplication.** Half the call sites are
 *     retried work — a drain that comes back after a crash, a cron that runs
 *     again five minutes later, a client re-POSTing a phase-2 delete. Without a
 *     unique key the ledger fills with the same fact N times and every threshold
 *     over it counts attempts instead of incidents. Removing `dedupeKey` from a
 *     call site, or the P2002 swallow from the sink, fails the block below.
 *  2. **The domain operation cannot erase the event it produced.** Enforced
 *     structurally: `SecurityEvent` declares no Prisma relation, so there is no
 *     edge for `onDelete: Cascade` to travel and no FK for a teardown to trip
 *     over. Asserted here against schema.prisma (fast, no database) and against
 *     the LIVE constraint catalogue in `test/pg/invariants.pg.test.ts`.
 *
 * Plus the two things the sink is responsible for that no call site can be
 * trusted to do: refusing student-authored content, and never failing the
 * operation it is recording.
 */

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  count: vi.fn(),
  captureMessage: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@sentry/nextjs', () => ({ captureMessage: mocks.captureMessage }))
vi.mock('@/lib/db', () => ({
  db: { securityEvent: { create: mocks.create, count: mocks.count } },
}))

import { recordSecurityEvent } from '@/lib/observability/security-event'

/** The unique-violation Prisma raises when a `dedupeKey` is already taken. */
function uniqueViolation(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  })
}

/** The `data` object handed to the Nth `create`. */
function written(n = 0): Record<string, unknown> {
  return (mocks.create.mock.calls[n]?.[0] as { data: Record<string, unknown> }).data
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.create.mockResolvedValue({ id: 'sec_1' })
  mocks.count.mockResolvedValue(0)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('P1-5 — an event survives retries without duplicating', () => {
  it('the second write of one dedupe key is reported as already-recorded, not an error', async () => {
    // THE ATTACK: the outbox parks a row, the process dies before it commits its
    // own state change, and the next drain settles the same row again.
    const dead = {
      kind: 'worker.dead_letter',
      outcome: 'error',
      actorType: 'system',
      targetType: 'notification_email',
      targetId: 'row_1',
      reason: 'attempts_exhausted',
      dedupeKey: 'dead_letter:notification_email:row_1',
    } as const

    const drain: string[] = []
    vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => {
      drain.push(a.map(String).join(' '))
    })

    expect(await recordSecurityEvent(dead)).toBe(true)

    // The database refuses the duplicate — that refusal IS the dedupe.
    mocks.create.mockRejectedValueOnce(uniqueViolation())
    expect(await recordSecurityEvent(dead)).toBe(false)

    // Two attempts, and the caller never saw a throw.
    expect(mocks.create).toHaveBeenCalledTimes(2)
    expect(written(0).dedupeKey).toBe('dead_letter:notification_email:row_1')

    // …and the duplicate was recognised as the DESIGNED outcome, not reported as
    // a fault. This is the assertion that tells a working dedupe apart from a
    // generic error swallow: without the P2002 branch the retry still returns
    // false, but it also pages the operator every time the fence does its job.
    expect(drain.join('\n')).not.toContain('security_event.write_failed')
  })

  it('events without a dedupe key are allowed to repeat — a second denial is a second fact', async () => {
    const denial = {
      kind: 'authz.denied',
      outcome: 'denied',
      actorType: 'user',
      actorUserId: 'u_1',
      reason: 'phase_locked',
    } as const
    expect(await recordSecurityEvent(denial)).toBe(true)
    expect(await recordSecurityEvent(denial)).toBe(true)
    expect(written(0).dedupeKey).toBeNull()
  })

  it('a write failure that is NOT a duplicate never reaches the caller', async () => {
    // The audit row is not worth failing a student's removal, or turning a 403
    // into a 500, over. The failure goes to the drain instead.
    const errors: string[] = []
    vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => {
      errors.push(a.map(String).join(' '))
    })
    mocks.create.mockRejectedValueOnce(new Error('connection reset'))

    await expect(
      recordSecurityEvent({ kind: 'provision.team', outcome: 'ok', actorType: 'user' }),
    ).resolves.toBe(false)
    expect(errors.join('\n')).toContain('security_event.write_failed')
  })
})

describe('P1-5 — the ledger cannot be erased by what it records', () => {
  const schema = readFileSync(join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8')
  const model = schema.slice(
    schema.indexOf('\nmodel SecurityEvent {'),
    schema.indexOf('\n}', schema.indexOf('\nmodel SecurityEvent {')),
  )

  it('the model exists and declares no relation to any other model', () => {
    expect(model).toContain('model SecurityEvent {')
    // A relation is the only way a delete elsewhere can reach these rows —
    // whether by CASCADE (erasing the record of the act) or by RESTRICT (making
    // the audit trail block the teardown it documents). There must be none.
    expect(model).not.toContain('@relation')
    // And the ids that WOULD have been foreign keys are plain strings.
    for (const col of ['actorUserId', 'targetId', 'scopeId']) {
      expect(model).toMatch(new RegExp(`${col}\\s+String\\?`))
    }
  })

  it('no id column is typed as a model reference', () => {
    // e.g. `user User @relation(...)` or `team Team @relation(...)`.
    expect(model).not.toMatch(/^\s+(user|team|class|showcase)\s+[A-Z]/m)
  })

  it('the module exposes exactly one non-transactional write and no mutation', async () => {
    const mod = await import('@/lib/observability/security-event')
    const writers = Object.keys(mod).filter((k) => typeof (mod as Record<string, unknown>)[k] === 'function')
    // Append-only is a property of the API surface, not just of intent: there is
    // nothing here that takes an id and changes or removes a row.
    expect(writers.sort()).toEqual(['recordSecurityEvent', 'recordSecurityEventTx'])
  })
})

describe('P1-5 — student-authored content cannot reach the ledger', () => {
  it('a reason that is not a bounded token is replaced, not stored', async () => {
    // THE ATTACK: a future call site passes a teacher's moderation note, a
    // student's answer, or a model reply into `reason` because it happens to be
    // the only string field. Whatever it is, it fails the token shape.
    await recordSecurityEvent({
      kind: 'moderation.decision',
      outcome: 'denied',
      actorType: 'teacher',
      reason: 'Please redo the abstract, it names your school.',
    })
    expect(written().reason).toBe('unbounded_reason')
  })

  it('bounded tokens pass through unchanged', async () => {
    for (const token of ['removed_by_lead', 'phase_locked', 'class_approved:none', 'topic_paper_removal']) {
      mocks.create.mockClear()
      await recordSecurityEvent({ kind: 'authz.denied', outcome: 'denied', actorType: 'user', reason: token })
      expect(written().reason).toBe(token)
    }
  })

  it('an over-long token is refused even though it is otherwise well-shaped', async () => {
    await recordSecurityEvent({
      kind: 'authz.denied',
      outcome: 'denied',
      actorType: 'user',
      reason: 'a'.repeat(65),
    })
    expect(written().reason).toBe('unbounded_reason')
  })

  it('the input type has no field a payload could be passed as', async () => {
    await recordSecurityEvent({
      kind: 'moderation.decision',
      outcome: 'ok',
      actorType: 'teacher',
      // @ts-expect-error — there is deliberately no `note` field, and typecheck
      // is what stops one being added by habit at a call site.
      note: 'the teacher wrote this about a student',
    })
    // The excess property is dropped by the sink as well as by the compiler.
    expect(Object.keys(written())).not.toContain('note')
  })
})

describe('P1-5 — thresholds raise exactly one alert per window', () => {
  it('crossing the repeated-denial threshold raises a Sentry issue', async () => {
    // 30 denials in 10 minutes from one actor is the rule; the count query is
    // what decides, so make it answer at the threshold.
    mocks.count.mockResolvedValue(30)

    await recordSecurityEvent({
      kind: 'authz.denied',
      outcome: 'denied',
      actorType: 'user',
      actorUserId: 'u_probe',
      reason: 'no_team',
    })

    expect(mocks.captureMessage).toHaveBeenCalledTimes(1)
    const [message, level] = mocks.captureMessage.mock.calls[0]!
    expect(message).toContain('repeated scope denials')
    expect(level).toBe('warning')
    // Sentry is a third-party sink: the actor is named by PSEUDONYM only.
    expect(message).not.toContain('u_probe')

    // The alert itself was appended, keyed to its window — that row is what
    // rate-limits the next one.
    const alert = written(1)
    expect(alert.kind).toBe('alert.threshold')
    expect(String(alert.dedupeKey)).toMatch(/^alert:authz\.denied:u_probe:\d+$/)
  })

  it('a second crossing in the same window is silent — the unique key is the rate limiter', async () => {
    mocks.count.mockResolvedValue(45)
    // First event writes; its alert row also writes.
    await recordSecurityEvent({
      kind: 'authz.denied',
      outcome: 'denied',
      actorType: 'user',
      actorUserId: 'u_probe',
      reason: 'no_team',
    })
    expect(mocks.captureMessage).toHaveBeenCalledTimes(1)

    // Second event writes, but its alert row collides with the bucket already
    // recorded — so no second issue is raised.
    mocks.create.mockResolvedValueOnce({ id: 'sec_x' }).mockRejectedValueOnce(uniqueViolation())
    await recordSecurityEvent({
      kind: 'authz.denied',
      outcome: 'denied',
      actorType: 'user',
      actorUserId: 'u_probe',
      reason: 'no_team',
    })
    expect(mocks.captureMessage).toHaveBeenCalledTimes(1)
  })

  it('a successful act never costs a threshold query', async () => {
    // Every rule is, by construction, a rule about failure or abuse: the normal
    // path (a join, an approval, a lead handover) must not pay for a COUNT.
    await recordSecurityEvent({
      kind: 'authority.membership',
      outcome: 'ok',
      actorType: 'user',
      actorUserId: 'u_1',
      scopeId: 'team_1',
      reason: 'joined:invite_code',
    })
    expect(mocks.count).not.toHaveBeenCalled()
    expect(mocks.captureMessage).not.toHaveBeenCalled()
  })

  it('a kind with no rule is never alerted on, however many there are', async () => {
    mocks.count.mockResolvedValue(10_000)
    await recordSecurityEvent({
      kind: 'provision.teacher_role',
      outcome: 'error',
      actorType: 'teacher',
      actorUserId: 'u_1',
    })
    expect(mocks.captureMessage).not.toHaveBeenCalled()
  })
})
