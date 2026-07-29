import 'server-only'
import { createHash, randomUUID } from 'crypto'
import { clerkClient } from '@clerk/nextjs/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { putObject } from '@/lib/storage'
import { departTeam } from '@/lib/team/membership'
import { logEvent } from '@/lib/observability/log'
import { recordSecurityEvent } from '@/lib/observability/security-event'
import { collectSubjectRows, deleteSubjectRows } from '@/lib/data-requests/inventory'

/**
 * Export and erasure as system behaviour (REFACTOR2 P1-R9).
 *
 * The runbook described a manual procedure: an operator with psql, a list of
 * tables, and the hope of doing them in the right order every time. That is not
 * a durable workflow — a half-finished erasure leaves no record of how far it
 * got, and nothing reconciles Clerk identity against database rows.
 *
 * The shape here is the one the rest of the codebase already uses for work that
 * must not run twice and must not stop halfway:
 *
 *  - The REQUEST is a durable row with a JSON-framed idempotency key, so a
 *    double-click is one request (`AiOperation`'s shape).
 *  - Each external system is a STEP row, claimed and terminalized on its own, so
 *    a resumed run skips what already happened (`NotificationEmail`'s shape).
 *  - The worker claim is FENCED by a token with a lease, so two overlapping
 *    crons cannot both erase (`PaperProcessingJob`'s shape).
 *
 * Approval is a separate operator act. A signed-in student filing a request must
 * not be able to erase their own record on the spot: in a school setting that
 * authority is the school's, and an erasure has no undo.
 */

export type DataRequestKind = 'export' | 'delete'

/** A claimed-but-unfinished request is a crashed worker's after this. */
const CLAIM_LEASE_MS = 10 * 60_000
/** Attempts before a request is parked `failed` instead of retried forever. */
const MAX_ATTEMPTS = 3

/** Steps per kind, in execution order. */
const STEPS: Record<DataRequestKind, string[]> = {
  // Auth dies FIRST: a request approved for erasure should stop admitting the
  // account immediately, even if the database half takes another run to finish.
  delete: ['clerk', 'storage', 'postgres'],
  export: ['export_bundle'],
}

/**
 * One request per subject per kind per UTC day. Not per-lifetime: a student may
 * legitimately ask for a second copy next month. Not per-click: the button is in
 * a settings panel and erasure has no undo.
 */
export function requestKeyFor(kind: DataRequestKind, subjectUserId: string, now: Date): string {
  const day = now.toISOString().slice(0, 10)
  return createHash('sha256')
    .update(JSON.stringify({ kind, subjectUserId, day }))
    .digest('hex')
}

export interface FiledRequest {
  id: string
  kind: string
  status: string
  createdAt: Date
  completedAt: Date | null
}

/**
 * File a request, or return the one already filed today.
 *
 * The identity snapshot is taken HERE, while the subject still exists — the
 * erasure itself destroys the ability to look it up again.
 */
export async function fileDataRequest(input: {
  kind: DataRequestKind
  subject: { id: string; clerkUserId: string; email: string }
  requestedByUserId: string
  now?: Date
}): Promise<FiledRequest> {
  const now = input.now ?? new Date()
  const requestKey = requestKeyFor(input.kind, input.subject.id, now)

  const existing = await db.dataRequest.findUnique({ where: { requestKey } })
  if (existing) return existing

  try {
    return await db.dataRequest.create({
      data: {
        kind: input.kind,
        subjectUserId: input.subject.id,
        subjectClerkUserId: input.subject.clerkUserId,
        subjectEmail: input.subject.email,
        requestedByUserId: input.requestedByUserId,
        requestKey,
      },
    })
  } catch {
    // Lost the race against a concurrent identical request; that row is the
    // answer. The unique index is what makes this safe rather than the check.
    const row = await db.dataRequest.findUnique({ where: { requestKey } })
    if (!row) throw new Error('Could not file the data request')
    return row
  }
}

/**
 * Operator decision. A CAS on `requested`, so two operators cannot both decide,
 * and a decision cannot re-open a request the worker has already started.
 */
export async function decideDataRequest(
  id: string,
  action: 'approve' | 'reject',
  note?: string,
): Promise<boolean> {
  const { count } = await db.dataRequest.updateMany({
    where: { id, status: 'requested' },
    data: {
      status: action === 'approve' ? 'approved' : 'rejected',
      decidedAt: new Date(),
      decidedNote: note ?? null,
    },
  })
  return count === 1
}

/**
 * Run up to `limit` approved requests. Returns how many completed.
 *
 * Never throws: this shares a cron invocation with the retention prune, and one
 * poisoned request must not stop the other work.
 */
export async function runDataRequests(limit: number): Promise<{ completed: number; failed: number }> {
  let completed = 0
  let failed = 0
  try {
    for (const request of await claimRequests(limit)) {
      try {
        // A worker that lost the claim counts as neither: the new owner is the
        // one whose outcome is real.
        if (await runOneRequest(request)) completed++
      } catch (err) {
        failed++
        await release(request, err)
      }
    }
  } catch (err) {
    logEvent({
      event: 'data_request.drain_failed',
      outcome: 'error',
      detail: err instanceof Error ? err.constructor.name : 'unknown',
    })
  }
  return { completed, failed }
}

interface ClaimedRequest {
  id: string
  kind: string
  subjectUserId: string
  subjectClerkUserId: string
  attempts: number
  /** This worker's proof of ownership. Every write below is a CAS on it. */
  claimToken: string
}

/**
 * A write this worker no longer owns. Ids and a bounded stage name only — an
 * erasure's payload is the densest personal data in the system and never goes
 * near a log line.
 */
function ownershipLost(request: ClaimedRequest, stage: string): void {
  logEvent({
    event: 'data_request.claim_lost',
    outcome: 'error',
    detail: `request=${request.id} kind=${request.kind} stage=${stage}`,
  })
}

/**
 * Take ownership of a batch.
 *
 * Stamp first, read second — `updateMany` cannot return rows, so the token is
 * what turns "some rows were updated" into "these exact rows are mine". The
 * selection predicate is re-asserted on the WRITE because another worker may
 * legitimately have claimed them between the read and here.
 */
async function claimRequests(limit: number): Promise<ClaimedRequest[]> {
  const now = new Date()
  const staleBefore = new Date(now.getTime() - CLAIM_LEASE_MS)
  const selectable = {
    attempts: { lt: MAX_ATTEMPTS },
    OR: [{ status: 'approved' }, { status: 'running', claimedAt: { lt: staleBefore } }],
  }

  const candidates = await db.dataRequest.findMany({
    where: selectable,
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true },
  })
  if (candidates.length === 0) return []

  const claimToken = randomUUID()
  await db.dataRequest.updateMany({
    where: { id: { in: candidates.map((c) => c.id) }, ...selectable },
    data: { status: 'running', claimToken, claimedAt: now, attempts: { increment: 1 } },
  })

  const claimed = await db.dataRequest.findMany({
    where: { claimToken },
    select: {
      id: true,
      kind: true,
      subjectUserId: true,
      subjectClerkUserId: true,
      attempts: true,
    },
  })
  // The token travels WITH the work. Re-reading it later would read whatever the
  // CURRENT owner wrote, which is the thing every check below has to detect.
  return claimed.map((request) => ({ ...request, claimToken }))
}

/**
 * Run every outstanding step for one request, then terminalize it. Returns
 * false if this worker lost the claim — the request is the new owner's, and
 * nothing this worker did or would do counts.
 */
async function runOneRequest(request: ClaimedRequest): Promise<boolean> {
  const targets = STEPS[request.kind as DataRequestKind] ?? []
  const detail: Record<string, unknown> = {}

  for (const target of targets) {
    // The step row IS the idempotency record: a resumed run skips what a
    // previous run already finished, so Clerk is never deleted twice and the
    // storage retirement is never silently skipped.
    const step = await db.dataRequestStep.upsert({
      where: { requestId_target: { requestId: request.id, target } },
      create: { requestId: request.id, target },
      update: {},
    })
    if (step.status === 'done') {
      detail[target] = step.detail ?? 'already done'
      continue
    }

    // OWNERSHIP CHECK BEFORE THE SIDE EFFECT, not after it. Steps have no claim
    // of their own, so they borrow the request's: `request: { claimToken }` is a
    // relation predicate on the same UPDATE, which a taken-over worker fails.
    // Placing it here means a stale worker stops BEFORE deleting a Clerk
    // identity or erasing rows the new owner is already erasing.
    const owned = await db.dataRequestStep.updateMany({
      where: { id: step.id, request: { claimToken: request.claimToken } },
      data: { attempts: { increment: 1 } },
    })
    if (owned.count === 0) {
      ownershipLost(request, `step:${target}`)
      return false
    }

    const result = await runStep(target, request)
    // Re-checked after the side effect: the lease can expire DURING a step, and
    // marking a step `done` under the new owner would make it skip work this
    // worker only half finished.
    const recorded = await db.dataRequestStep.updateMany({
      where: { id: step.id, request: { claimToken: request.claimToken } },
      data: { status: 'done', completedAt: new Date(), detail: asJson(result), lastError: null },
    })
    if (recorded.count === 0) {
      ownershipLost(request, `step_done:${target}`)
      return false
    }
    detail[target] = result
  }

  // Terminal write is a CAS on still owning the claim (a taken-over run must not
  // report a completion it did not perform). Status alone cannot say this: the
  // new owner's row is `running` too.
  const { count } = await db.dataRequest.updateMany({
    where: { id: request.id, status: 'running', claimToken: request.claimToken },
    data: {
      status: 'completed',
      completedAt: new Date(),
      claimToken: null,
      lastError: null,
      resultJson: asJson(detail),
    },
  })
  if (count === 0) {
    ownershipLost(request, 'complete')
    return false
  }
  return true
}

/**
 * Prisma's Json input type rejects `unknown`. These payloads are built here from
 * row counts and object keys, so they are JSON by construction — one cast in one
 * place beats threading `InputJsonValue` through four step functions.
 */
function asJson(value: Record<string, unknown>): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject
}

async function runStep(target: string, request: ClaimedRequest): Promise<Record<string, unknown>> {
  switch (target) {
    case 'export_bundle':
      return exportBundle(request)
    case 'clerk':
      return deleteClerkIdentity(request)
    case 'storage':
      return retireStorage(request)
    case 'postgres':
      return erasePostgres(request)
    default:
      throw new Error(`Unknown data-request step: ${target}`)
  }
}

/** Object key for an export bundle. Namespaced away from student uploads. */
export function exportBundleKey(requestId: string): string {
  return `data-exports/${requestId}.json`
}

/**
 * Write the subject's rows to storage as one JSON object.
 *
 * Deliberately NOT emailed and NOT served from a public URL: the runbook's
 * "deliver via the school's agreed channel, never to an unverified address"
 * rule is the whole point, and an export bundle is the single densest personal
 * artifact this system can produce.
 */
async function exportBundle(request: ClaimedRequest): Promise<Record<string, unknown>> {
  const rows = await collectSubjectRows(request.subjectUserId)
  const user = await db.user.findUnique({
    where: { id: request.subjectUserId },
    select: { id: true, name: true, email: true, createdAt: true, role: true, isMinor: true },
  })
  const key = exportBundleKey(request.id)
  const body = Buffer.from(
    JSON.stringify({ generatedFor: request.subjectUserId, user, rows }, null, 2),
  )
  await putObject(key, body, 'application/json')
  return {
    objectKey: key,
    bytes: body.byteLength,
    counts: Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, v.length])),
  }
}

/**
 * Delete the Clerk identity: credentials, sessions, and the email address that
 * makes the account reachable.
 *
 * An identity that is already gone is a SUCCESS, not a failure — a retried run
 * must be able to move past a step whose effect already landed.
 */
async function deleteClerkIdentity(request: ClaimedRequest): Promise<Record<string, unknown>> {
  try {
    const cc = await clerkClient()
    await cc.users.deleteUser(request.subjectClerkUserId)
    return { deleted: true }
  } catch (err) {
    const status = (err as { status?: number } | null)?.status
    if (status === 404) return { deleted: false, reason: 'already absent' }
    throw err
  }
}

/**
 * Retire the subject's unbound uploads.
 *
 * `temporary` only. An `attached` asset is an image inside a project log — team
 * -shared content the runbook keeps with the team, so orphaning it would delete
 * pictures out of the teammates' log. Physical deletion is never done here:
 * flipping to `orphaned` hands the object to the reclaim sweep, which is the one
 * physical-delete site in the system (P1-S8/P1-R12).
 */
async function retireStorage(request: ClaimedRequest): Promise<Record<string, unknown>> {
  const { count } = await db.uploadedAsset.updateMany({
    where: { userId: request.subjectUserId, status: 'temporary' },
    data: { status: 'orphaned' },
  })
  return { orphaned: count, note: 'attached assets stay with the team per the retention policy' }
}

/**
 * Delete the per-student rows and tombstone the identity, in ONE transaction.
 *
 * The `users` row survives by design — see `lib/data-requests/inventory.ts`. What
 * makes this an erasure rather than a flag is that `name`, `email`, and
 * `clerkUserId` are overwritten with values that identify nobody and route
 * nowhere. The placeholders stay unique because both columns are unique indexes
 * and a second erasure of the same row would otherwise collide.
 */
async function erasePostgres(request: ClaimedRequest): Promise<Record<string, unknown>> {
  return db.$transaction(async (tx) => {
    // Live memberships go through the real departure command, so a departing
    // lead still hands over and a last member still archives the team — a raw
    // `teamMember.deleteMany` would leave `teams.team_lead_id` pointing at a
    // tombstone.
    const memberships = await tx.teamMember.findMany({
      where: { userId: request.subjectUserId },
      select: { teamId: true },
    })
    for (const m of memberships) {
      await departTeam(tx, {
        teamId: m.teamId,
        userId: request.subjectUserId,
        event: 'removed',
        actorUserId: null,
        reason: 'data_erasure',
      })
    }

    const counts = await deleteSubjectRows(tx, request.subjectUserId)

    await tx.user.update({
      where: { id: request.subjectUserId },
      data: {
        name: 'Deleted student',
        email: `deleted+${request.subjectUserId}@invalid.scienium.app`,
        clerkUserId: `deleted_${request.subjectUserId}`,
        classId: null,
        schoolId: null,
        activeTeamId: null,
        deletedAt: new Date(),
      },
    })

    return { teamsDeparted: memberships.length, rows: counts }
  })
}

/**
 * Hand a failed request back. Exhausted attempts park it `failed` rather than
 * leaving it to be retried forever; anything else returns to `approved` for the
 * next run, which resumes at the first step that is not yet `done`.
 *
 * Fenced like every other write: a taken-over worker whose step throws must not
 * park a request the new owner is mid-way through erasing, nor hand it back to
 * `approved` and invite a third worker in alongside.
 */
async function release(request: ClaimedRequest, err: unknown): Promise<void> {
  const exhausted = request.attempts >= MAX_ATTEMPTS
  const lastError = err instanceof Error ? `${err.name}: ${err.message}` : 'unknown error'
  logEvent({
    event: 'data_request.step_failed',
    outcome: 'error',
    detail: `request=${request.id} kind=${request.kind} exhausted=${exhausted}`,
  })
  if (exhausted) {
    // A parked export or erasure is a legal obligation that silently stopped
    // (REFACTOR2 P1-5) — the dead letter that matters most in this codebase.
    // Keyed to the request so a retried release records it once.
    void recordSecurityEvent({
      kind: 'worker.dead_letter',
      outcome: 'error',
      actorType: 'system',
      targetType: 'data_request',
      targetId: request.id,
      reason: 'attempts_exhausted',
      dedupeKey: `dead_letter:data_request:${request.id}`,
    })
  }
  const released = await db.dataRequest
    .updateMany({
      where: { id: request.id, status: 'running', claimToken: request.claimToken },
      data: { status: exhausted ? 'failed' : 'approved', claimToken: null, lastError },
    })
    // A database blip, not a lost claim — the lease still guarantees a retry.
    .catch(() => null)
  if (released?.count === 0) ownershipLost(request, 'release')
}
