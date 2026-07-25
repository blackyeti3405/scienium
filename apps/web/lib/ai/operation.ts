import 'server-only'
import { createHash } from 'crypto'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

/**
 * Run one paid provider call at most once per identical input, and replay its
 * result to anyone who asks again (REFACTOR2 P1-R3; the replay half of P1-R11,
 * P1-S6, and P1-R2).
 *
 * The claim columns added for those findings solved the concurrent case: two
 * callers can no longer pay at the same moment. They cannot solve the *sequential*
 * one. A client that times out and retries, or a second submission of the exact
 * same answers, still had only two outcomes — pay again, or be refused. Neither
 * is right when the first call already produced an answer somebody paid for.
 *
 * The unique `(operation, idempotencyKey)` is the whole mechanism: whoever wins
 * the insert does the work; everyone else reads what the winner stored.
 */

/** Paid workflows that replay. Add a member here, not a free string at a call site. */
export type AiOperationName = 'quiz_retry_grade' | 'explain_grade' | 'phase_advance_classify'

/** A `running` row older than this is assumed dead and may be retried. */
const RUNNING_TTL_MS = 3 * 60_000

/**
 * Hash the inputs that determine the result.
 *
 * JSON-framed rather than concatenated so no field value can impersonate a
 * delimiter and make two different inputs share a key — the failure mode here is
 * replaying one student's grade onto another's answers.
 */
export function aiIdempotencyKey(parts: unknown[]): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex')
}

export type AiOperationOutcome<T> =
  | { ok: true; result: T; replayed: boolean }
  /** An identical call is in flight; the caller should ask again shortly. */
  | { ok: false; reason: 'in_flight' }
  /** `run` failed. The row is marked failed so an identical retry may proceed. */
  | { ok: false; reason: 'failed'; error: unknown }

/**
 * Execute `run` at most once for `(operation, idempotencyKey)`, storing and
 * replaying its result.
 *
 * `run` MUST NOT be called inside a database transaction — it is a multi-second
 * network call, and holding a transaction across it is the thing the audit
 * explicitly forbids. This function deliberately takes no `tx`.
 */
export async function runAiOperation<T>(input: {
  operation: AiOperationName
  idempotencyKey: string
  teamId?: string | null
  run: () => Promise<T>
}): Promise<AiOperationOutcome<T>> {
  const { operation, idempotencyKey, teamId } = input

  let claimedId: string
  try {
    const row = await db.aiOperation.create({
      data: { operation, idempotencyKey, teamId: teamId ?? null, status: 'running' },
      select: { id: true },
    })
    claimedId = row.id
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err

    // Someone else owns this exact input. Replay, wait, or take over a dead run.
    const existing = await db.aiOperation.findUnique({
      where: { operation_idempotencyKey: { operation, idempotencyKey } },
      select: { id: true, status: true, resultJson: true, createdAt: true },
    })
    if (!existing) return { ok: false, reason: 'in_flight' } // vanished mid-race

    if (existing.status === 'succeeded') {
      return { ok: true, result: existing.resultJson as T, replayed: true }
    }
    if (existing.status === 'running' && Date.now() - existing.createdAt.getTime() < RUNNING_TTL_MS) {
      return { ok: false, reason: 'in_flight' }
    }

    // `failed`, or a `running` row whose owner never came back. Take it over —
    // guarded on the status we read so two takers cannot both proceed.
    const taken = await db.aiOperation.updateMany({
      where: { id: existing.id, status: existing.status },
      data: { status: 'running', createdAt: new Date(), resultJson: Prisma.DbNull },
    })
    if (taken.count !== 1) return { ok: false, reason: 'in_flight' }
    claimedId = existing.id
  }

  let result: T
  try {
    result = await input.run()
  } catch (error) {
    // Mark failed rather than deleting: an identical retry then takes it over,
    // and the row remains as evidence that a paid call was attempted.
    await db.aiOperation
      .updateMany({ where: { id: claimedId }, data: { status: 'failed', completedAt: new Date() } })
      .catch(() => {})
    return { ok: false, reason: 'failed', error }
  }

  await db.aiOperation.update({
    where: { id: claimedId },
    data: {
      status: 'succeeded',
      resultJson: result as unknown as Prisma.InputJsonValue,
      completedAt: new Date(),
    },
  })
  return { ok: true, result, replayed: false }
}
