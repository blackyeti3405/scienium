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
 *
 * Returns the new row's id, which is what makes a notification about this event
 * dedupable: `Notification.dedupeKey` is globally unique, so a key built from
 * (student, class) would collide the second time a student is removed from the
 * same class and abort the removal itself. The event id is unique by
 * construction and names the exact occurrence.
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
): Promise<string> {
  const row = await tx.classMembershipEvent.create({
    data: {
      classId: input.classId,
      userId: input.userId,
      event: input.event,
      actorUserId: input.actorUserId ?? null,
      reason: input.reason ?? null,
    },
    select: { id: true },
  })
  return row.id
}

/**
 * Tell the student their teacher ended their enrolment (REFACTOR2 P1-R8).
 *
 * Only for a teacher removal: a student who left knows they left, and a
 * `superseded` approval is not something that happened *to* them.
 *
 * Written in the SAME transaction as the removal. A best-effort notification
 * after the commit is the shape that produces a student who was removed and
 * never told — which is the exact gap this closes.
 *
 * **Limitation, on purpose:** `Notification.teamId` is required and the bell is
 * team-scoped, so a student with no live team membership gets no row. Making it
 * nullable means a nullable FK, four index changes, and an `OR` in the bell's
 * visibility predicate — for a student who has no bell to read it in. Recorded
 * rather than papered over.
 */
async function notifyRemoved(
  tx: ClassTx,
  input: { userId: string; classId: string; eventId: string },
): Promise<void> {
  // One team at a time (`TeamMember.userId` is `@@unique`), so the live
  // membership IS the team whose bell this student reads.
  const membership = await tx.teamMember.findUnique({
    where: { userId: input.userId },
    select: { teamId: true },
  })
  if (!membership) return

  const klass = await tx.class.findUnique({
    where: { id: input.classId },
    select: { name: true },
  })

  await tx.notification.create({
    data: {
      teamId: membership.teamId,
      // Addressed to the student alone — their teammates are not party to it.
      userId: input.userId,
      kind: 'membership_changed',
      title: klass ? `You were removed from ${klass.name}` : 'You were removed from your class',
      body:
        'Your teacher un-enrolled you. Your lab and everything in it are unchanged, ' +
        'but your teacher can no longer see your work until you join a class again.',
      linkUrl: '/onboarding',
      dedupeKey: `class_removed:${input.eventId}`,
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
  /** Whether the student needs telling — true only for a teacher removal. */
  notify = false,
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
    const eventId = await recordClassEvent(tx, {
      classId,
      userId,
      event: 'revoked',
      actorUserId,
      reason,
    })
    if (notify) await notifyRemoved(tx, { userId, classId, eventId })

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
  return endEnrolment(userId, actorUserId, 'removed_by_teacher', classId, true)
}
