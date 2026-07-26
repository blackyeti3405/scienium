import 'server-only'
import type { Prisma, MemberRole } from '@prisma/client'
import { db } from '@/lib/db'
import { lockAggregate } from '@/lib/db-lock'

/**
 * Team membership lifecycle (REFACTOR2 P1-R8).
 *
 * Before this there was no lifecycle at all: `TeamMember` permitted the same
 * user in several teams, joining a new team added a membership and switched
 * `activeTeamId` while silently leaving the old one behind, and there was no
 * leave, remove, lead-transfer, or disband command anywhere in the app. Teacher
 * visibility is DERIVED from membership, so a membership nobody ever cleaned up
 * was not untidy data — it was a teacher who could still open a team they no
 * longer taught.
 *
 * Two decisions, made by the owner on 2026-07-26 and encoded here:
 *
 *  - **One team at a time.** Joining a team leaves any other, transactionally.
 *    Everything else in the app already assumed this — `activeTeamId` is
 *    singular, the phase arc is per-team, KP is per-team.
 *  - **Archive, don't delete.** When the last member leaves, the team's work
 *    (papers, showcase, logs, uploaded PDFs) is the class's product. A student
 *    walking away must not destroy it, and a teacher must still be able to see
 *    it. `Team.archivedAt` makes it read-only rather than gone.
 *
 * `TeamMember` holds LIVE memberships only; departures append to
 * `TeamMembershipEvent`. See the schema comment for why a `leftAt` tombstone was
 * rejected — in short, one forgotten filter at any of ~25 read sites is a live
 * authorization leak, and several of those sites are nested reads no Prisma
 * extension can intercept.
 *
 * Every function here takes a transaction client. Membership changes touch
 * `TeamMember`, `User.activeTeamId`, `Team.teamLeadId`, `Team.archivedAt`, and
 * the event log together or not at all — a half-applied departure is precisely
 * the stale-authorization state this exists to prevent.
 */

export type MembershipEvent = 'joined' | 'left' | 'removed' | 'lead_transferred' | 'team_archived'

/** The transaction client, narrowed to what this module writes. */
export type MembershipTx = Prisma.TransactionClient

export class MembershipError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'MembershipError'
  }
}

async function record(
  tx: MembershipTx,
  input: {
    teamId: string
    userId: string
    event: MembershipEvent
    role?: MemberRole | null
    actorUserId?: string | null
    reason?: string
  },
): Promise<void> {
  await tx.teamMembershipEvent.create({
    data: {
      teamId: input.teamId,
      userId: input.userId,
      event: input.event,
      role: input.role ?? null,
      actorUserId: input.actorUserId ?? null,
      reason: input.reason ?? null,
    },
  })
}

/**
 * Remove one member from one team, handling every consequence.
 *
 * The consequences are the whole point, and are why this is one function rather
 * than a `delete` at each call site:
 *
 *  - A departing LEAD hands the role to the longest-standing remaining member.
 *    The final lead is protected by making transfer automatic rather than by
 *    refusing the departure — a team whose lead has left the school should not
 *    be permanently stuck.
 *  - The LAST member leaving archives the team rather than orphaning its work,
 *    and retires any unused invites so an old code cannot resurrect it.
 *  - `activeTeamId` is cleared in the same transaction, so a user is never
 *    pointed at a team they are no longer on.
 */
export async function departTeam(
  tx: MembershipTx,
  input: {
    teamId: string
    userId: string
    event: Extract<MembershipEvent, 'left' | 'removed'>
    actorUserId: string | null
    reason: string
  },
): Promise<{ archived: boolean; newLeadUserId: string | null }> {
  const { teamId, userId } = input

  // Serialize against concurrent joins and departures on this team — the same
  // lock the join path takes, so "is this the last member" cannot be read stale.
  await lockAggregate(tx, `team-membership:${teamId}`)

  const membership = await tx.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId } },
    select: { role: true },
  })
  if (!membership) throw new MembershipError('Not a member of that lab', 404)

  await tx.teamMember.delete({ where: { userId_teamId: { userId, teamId } } })
  await record(tx, { ...input, role: membership.role })

  const remaining = await tx.teamMember.findMany({
    where: { teamId },
    orderBy: { joinedAt: 'asc' },
    select: { userId: true },
  })

  let newLeadUserId: string | null = null
  let archived = false

  if (remaining.length === 0) {
    await tx.team.updateMany({
      where: { id: teamId, archivedAt: null },
      data: { archivedAt: new Date() },
    })
    // An unused invite would let someone walk into an archived lab.
    await tx.teamInvite.deleteMany({ where: { teamId, usedByUserId: null } })
    await record(tx, {
      teamId,
      userId,
      event: 'team_archived',
      actorUserId: input.actorUserId,
      reason: 'last_member_left',
    })
    archived = true
  } else {
    const team = await tx.team.findUnique({ where: { id: teamId }, select: { teamLeadId: true } })
    if (team?.teamLeadId === userId) {
      newLeadUserId = remaining[0]!.userId
      await tx.team.update({ where: { id: teamId }, data: { teamLeadId: newLeadUserId } })
      await tx.teamMember.update({
        where: { userId_teamId: { userId: newLeadUserId, teamId } },
        data: { role: 'lead' },
      })
      await record(tx, {
        teamId,
        userId: newLeadUserId,
        event: 'lead_transferred',
        role: 'lead',
        // Null actor: the system chose, nobody did.
        actorUserId: null,
        reason: 'previous_lead_departed',
      })
    }
  }

  // Never leave a user pointed at a team they just left.
  await tx.user.updateMany({ where: { id: userId, activeTeamId: teamId }, data: { activeTeamId: null } })

  return { archived, newLeadUserId }
}

/**
 * Enforce one-team-at-a-time: leave every OTHER team before joining `keepTeamId`.
 *
 * Called from inside the join transaction. Returns the teams departed, so the
 * caller can report the switch rather than performing it invisibly.
 */
export async function leaveOtherTeams(
  tx: MembershipTx,
  userId: string,
  keepTeamId: string,
): Promise<string[]> {
  const others = await tx.teamMember.findMany({
    where: { userId, teamId: { not: keepTeamId } },
    select: { teamId: true },
  })
  for (const m of others) {
    await departTeam(tx, {
      teamId: m.teamId,
      userId,
      event: 'left',
      actorUserId: userId,
      reason: 'switched_team',
    })
  }
  return others.map((m) => m.teamId)
}

/**
 * Hand the lead role to another current member.
 *
 * Only the current lead may do this. A teacher-initiated transfer would be a
 * separate command with its own authorization — deliberately not folded in here,
 * because "the lead may hand over" and "a teacher may reassign" are different
 * capabilities and conflating them is how one becomes the other.
 */
export async function transferLead(
  tx: MembershipTx,
  input: { teamId: string; fromUserId: string; toUserId: string },
): Promise<void> {
  const { teamId, fromUserId, toUserId } = input
  if (fromUserId === toUserId) throw new MembershipError('Already the lead', 400)

  await lockAggregate(tx, `team-membership:${teamId}`)

  const team = await tx.team.findUnique({
    where: { id: teamId },
    select: { teamLeadId: true, archivedAt: true },
  })
  if (!team) throw new MembershipError('Lab not found', 404)
  if (team.archivedAt) throw new MembershipError('That lab is archived', 409)
  if (team.teamLeadId !== fromUserId) {
    throw new MembershipError('Only the lab lead can hand over the lead role', 403)
  }

  const target = await tx.teamMember.findUnique({
    where: { userId_teamId: { userId: toUserId, teamId } },
    select: { userId: true },
  })
  if (!target) throw new MembershipError('That person is not in this lab', 404)

  await tx.team.update({ where: { id: teamId }, data: { teamLeadId: toUserId } })
  await tx.teamMember.update({
    where: { userId_teamId: { userId: toUserId, teamId } },
    data: { role: 'lead' },
  })
  await tx.teamMember.update({
    where: { userId_teamId: { userId: fromUserId, teamId } },
    data: { role: 'member' },
  })
  await record(tx, {
    teamId,
    userId: toUserId,
    event: 'lead_transferred',
    role: 'lead',
    actorUserId: fromUserId,
    reason: 'handed_over',
  })
}

/** Leave the caller's own team. Thin wrapper so routes never open their own transaction. */
export function leaveTeam(teamId: string, userId: string) {
  return db.$transaction((tx) =>
    departTeam(tx, { teamId, userId, event: 'left', actorUserId: userId, reason: 'self_leave' }),
  )
}

/** Lead removes another member. */
export function removeMember(teamId: string, actorUserId: string, targetUserId: string) {
  return db.$transaction(async (tx) => {
    const team = await tx.team.findUnique({
      where: { id: teamId },
      select: { teamLeadId: true, archivedAt: true },
    })
    if (!team) throw new MembershipError('Lab not found', 404)
    if (team.archivedAt) throw new MembershipError('That lab is archived', 409)
    if (team.teamLeadId !== actorUserId) {
      throw new MembershipError('Only the lab lead can remove a member', 403)
    }
    if (targetUserId === actorUserId) {
      // Removing yourself is leaving, and leaving has different consequences
      // (archive, auto-transfer). Route it deliberately rather than by accident.
      throw new MembershipError('Use leave to remove yourself from the lab', 400)
    }
    return departTeam(tx, {
      teamId,
      userId: targetUserId,
      event: 'removed',
      actorUserId,
      reason: 'removed_by_lead',
    })
  })
}
