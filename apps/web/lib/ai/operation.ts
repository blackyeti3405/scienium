import 'server-only'
import { createHash, randomUUID } from 'crypto'
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
 *
 * `claimToken` is the second half (P1-1): the insert alone cannot say WHICH
 * attempt currently owns the row once a dead claim may be taken over. Every
 * write here is compare-and-set on the token, so exactly one attempt owns each
 * paid execution and a revived worker settles nothing.
 */

/**
 * Operation names come from the model registry (`lib/ai/models.ts`) — one union
 * for the whole app, so "which model runs this" and "does this replay" can never
 * drift onto two different spellings of the same call. Not every operation
 * replays; the type does not need to encode which do.
 */
export type { AiOperationName } from '@/lib/ai/models'
import type { AiOperationName } from '@/lib/ai/models'

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
  /**
   * An identical call is in flight; the caller should ask again shortly.
   *
   * Also what a worker that LOST its claim gets back (P1-1). A claim is only
   * taken over after the lease expires, by which point the original request has
   * long since timed out — the new owner is running the same input right now, so
   * "ask again" is both true and the only answer that cannot double-write: the
   * loser's result is discarded rather than raced against the owner's.
   */
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

  // This attempt's claim identity. Every write below is predicated on it, so a
  // worker whose row was taken over writes nothing (P1-1).
  const claimToken = randomUUID()

  let claimedId: string
  try {
    const row = await db.aiOperation.create({
      data: { operation, idempotencyKey, teamId: teamId ?? null, status: 'running', claimToken },
      select: { id: true },
    })
    claimedId = row.id
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err

    // Someone else owns this exact input. Replay, wait, or take over a dead run.
    const existing = await db.aiOperation.findUnique({
      where: { operation_idempotencyKey: { operation, idempotencyKey } },
      select: { id: true, status: true, claimToken: true, resultJson: true, createdAt: true },
    })
    if (!existing) return { ok: false, reason: 'in_flight' } // vanished mid-race

    if (existing.status === 'succeeded') {
      return { ok: true, result: existing.resultJson as T, replayed: true }
    }
    if (existing.status === 'running' && Date.now() - existing.createdAt.getTime() < RUNNING_TTL_MS) {
      return { ok: false, reason: 'in_flight' }
    }

    // `failed`, or a `running` row whose owner never came back. Compare-and-set
    // on the PREVIOUS claim, not on status: a stale `running` row goes
    // `running` → `running`, so a status-only guard matches for both takers and
    // both pay. The token changes on every claim, so exactly one can win.
    const taken = await db.aiOperation.updateMany({
      where: { id: existing.id, status: existing.status, claimToken: existing.claimToken },
      data: { status: 'running', claimToken, createdAt: new Date(), resultJson: Prisma.DbNull },
    })
    if (taken.count !== 1) return { ok: false, reason: 'in_flight' }
    claimedId = existing.id
  }

  let result: T
  try {
    result = await input.run()
  } catch (error) {
    // Mark failed rather than deleting: an identical retry then takes it over,
    // and the row remains as evidence that a paid call was attempted. `null` is
    // a database blip, not a lost claim — the row ages out and is taken over.
    const settled = await db.aiOperation
      .updateMany({
        where: { id: claimedId, claimToken },
        data: { status: 'failed', completedAt: new Date() },
      })
      .catch(() => null)
    if (settled?.count === 0) return { ok: false, reason: 'in_flight' } // no longer ours
    return { ok: false, reason: 'failed', error }
  }

  const stored = await db.aiOperation.updateMany({
    where: { id: claimedId, claimToken },
    data: {
      status: 'succeeded',
      resultJson: result as unknown as Prisma.InputJsonValue,
      completedAt: new Date(),
    },
  })
  // Taken over while `run` was in flight: the new owner's row is not ours to
  // overwrite, and its result — not this one — is what every later caller
  // replays. Returning it here would fork the answer for one input.
  if (stored.count !== 1) return { ok: false, reason: 'in_flight' }
  return { ok: true, result, replayed: false }
}
