import 'server-only'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { lockAggregate } from '@/lib/db-lock'

/**
 * Class membership lifecycle (REFACTOR2 P1-R8, the class half).
 *
 * The team half shipped in v0.48.0; this is the same problem one level up.
 * Teacher authorization is DERIVED from `User.classId` — `teacherOwnsTeam`
 * matches teams with a member in a class the teacher owns — so a class
 * membership that should have ended but did not is a teacher who can still open
 * a student's work. Before this there was no way to end one: no withdraw, no
 * leave, no removal. A student could only ever be moved by being approved
 * somewhere else.
 *
 * What P1-S2 already fixed, and this keeps: the decision is one compare-and-set
 * on `status: 'pending'`, taken under a per-student advisory lock, and a prior
 * approval elsewhere is marked `superseded` so two `approved` rows can never
 * both claim one `User.classId`.
 *
 * What this adds:
 *
 *  - **Three commands that END a membership** — `withdrawClassRequest` (the
 *    student cancels their own pending request), `leaveClass` (the student
 *    leaves), `removeFromClass` (the teacher un-enrols). Each clears the derived
 *    authorization in the same transaction as the state change.
 *  - **An append-only event log.** `ClassJoinRequest` is live state that mutates
 *    in place — a re-request even resets `decidedAt`/`decidedByUserId` — so the
 *    row can say where a student stands but never what happened. Same reasoning
 *    as `TeamMembershipEvent`, and the same shape.
 *  - **Two statuses that stop misstating history.** `withdrawn` is not `denied`
 *    (nobody refused them) and `revoked` is not `denied` either (the enrolment
 *    happened, then ended).
 */

export type ClassMembershipEvent =
  | 'requested'
  | 'approved'
  | 'denied'
  | 'withdrawn'
  | 'revoked'
  | 'superseded'

export type ClassTx = Prisma.TransactionClient

export class ClassMembershipError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ClassMembershipError'
  }
}

/**
 * Append one event. Always called inside the transaction that made the change —
 * a log that can commit without its cause is not evidence of anything.
 */
export async function recordClassEvent(
  tx: ClassTx,
  input: {
    classId: string
    userId: string
    event: ClassMembershipEvent
    actorUserId?: string | null
    reason?: string
  },
): Promise<void> {
  await tx.classMembershipEvent.create({
    data: {
      classId: input.classId,
      userId: input.userId,
      event: input.event,
      actorUserId: input.actorUserId ?? null,
      reason: input.reason ?? null,
    },
  })
}

/** What an end-of-membership command actually committed. */
export type ClassEndOutcome =
  | { committed: true; classId: string }
  /** Nothing to end; `reason` says why, for an honest message to the caller. */
  | { committed: false; reason: 'not_found' | 'not_pending' | 'not_enrolled' }

/**
 * A student cancels their own pending request.
 *
 * Scoped to the requester: `userId` is part of the predicate, so one student can
 * never withdraw another's request even with a guessed id. A CAS on `pending`,
 * so a withdrawal cannot undo a decision a teacher already made.
 */
export async function withdrawClassRequest(
  requestId: string,
  userId: string,
): Promise<ClassEndOutcome> {
  return db.$transaction(async (tx) => {
    const request = await tx.classJoinRequest.findFirst({
      where: { id: requestId, userId },
      select: { id: true, classId: true, status: true },
    })
    if (!request) return { committed: false, reason: 'not_found' as const }

    const applied = await tx.classJoinRequest.updateMany({
      where: { id: requestId, userId, status: 'pending' },
      data: { status: 'withdrawn', decidedAt: new Date(), decidedByUserId: userId },
    })
    if (applied.count !== 1) return { committed: false, reason: 'not_pending' as const }

    await recordClassEvent(tx, {
      classId: request.classId,
      userId,
      event: 'withdrawn',
      actorUserId: userId,
      reason: 'withdrawn_by_student',
    })
    return { committed: true, classId: request.classId }
  })
}

/**
 * End an approved enrolment: clear the derived authorization, retire the
 * request, and log it — in ONE transaction.
 *
 * `User.classId` is what `teacherOwnsTeam` reads, so clearing it IS the
 * revocation; leaving it set while marking the request `revoked` would be a
 * membership that reads as ended and behaves as live. Any still-pending request
 * for the same student in the same class goes too, so a removal cannot be
 * silently undone by a request that predates it.
 *
 * `schoolId` is deliberately left alone — a school is the student's own
 * affiliation, not something a class grants.
 */
async function endEnrolment(
  userId: string,
  actorUserId: string | null,
  reason: string,
  /** When set, the command only applies if the student is in THIS class. */
  requireClassId?: string,
): Promise<ClassEndOutcome> {
  return db.$transaction(async (tx) => {
    // The same lock `decideClassJoin` takes: an approval landing concurrently
    // must not interleave with a removal and leave the two disagreeing about
    // which class the student is in.
    await lockAggregate(tx, `class-membership:${userId}`)

    const user = await tx.user.findUnique({ where: { id: userId }, select: { classId: true } })
    if (!user?.classId) return { committed: false, reason: 'not_enrolled' as const }
    if (requireClassId && user.classId !== requireClassId) {
      return { committed: false, reason: 'not_enrolled' as const }
    }
    const classId = user.classId

    await tx.user.updateMany({ where: { id: userId, classId }, data: { classId: null } })
    await tx.classJoinRequest.updateMany({
      where: { userId, classId, status: { in: ['approved', 'pending'] } },
      data: { status: 'revoked', decidedAt: new Date(), decidedByUserId: actorUserId },
    })
    await recordClassEvent(tx, { classId, userId, event: 'revoked', actorUserId, reason })

    return { committed: true, classId }
  })
}

/** The student leaves their class. */
export function leaveClass(userId: string): Promise<ClassEndOutcome> {
  return endEnrolment(userId, userId, 'left_by_student')
}

/**
 * A teacher un-enrols a student.
 *
 * `classId` is required and checked, so a teacher whose scope was verified for
 * one class cannot remove a student who has since moved to another — the
 * authorization the caller proved is the authorization that applies.
 */
export function removeFromClass(
  classId: string,
  userId: string,
  actorUserId: string,
): Promise<ClassEndOutcome> {
  return endEnrolment(userId, actorUserId, 'removed_by_teacher', classId)
}
