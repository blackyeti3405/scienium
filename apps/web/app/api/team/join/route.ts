import { currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserContext } from '@/lib/api/route-context'
import { ApiError } from '@/lib/api/with-route'
import { parseJson } from '@/lib/validation'
import { normalizeInviteCode } from '@/lib/team/invite'
import { applySchoolAndClass, resolvePrimaryEmail, syncClerkDisplayName } from '@/lib/onboarding/profile'
import { logActivityBestEffort } from '@/lib/activity/log'
import { db } from '@/lib/db'
import { lockAggregate } from '@/lib/db-lock'

const JoinBody = z
  .object({
    name: z.string().trim().max(80).optional(),
    code: z.string().trim().min(1, 'A join code is required').max(32),
    highSchool: z.string().trim().max(120).optional(),
    classCode: z.string().trim().max(32).optional(),
  })
  .strict()

/**
 * POST /api/team/join — a student redeems a join code to join an existing lab
 * (Feature 1b). Creates the User row on the fly (a joiner may never have run the
 * create-a-lab onboarding), then atomically re-checks capacity + the code's
 * validity before adding the membership and burning the code.
 */
export async function POST(req: NextRequest) {
  // Tight per-user + per-IP limit: join codes are short, so cap redemption
  // attempts to make brute-forcing an active code impractical.
  const { ctx, error: guardError } = await requireUserContext(req, { tier: 'join' })
  if (guardError) return guardError
  const { userId } = ctx

  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await parseJson(req, JoinBody)
  if (error) return error
  const { name, code, highSchool, classCode } = data

  const normalized = normalizeInviteCode(code)

  const email = resolvePrimaryEmail(clerkUser)
  if (!email) return NextResponse.json({ error: 'No email on Clerk account' }, { status: 400 })

  // Ensure a User row exists for this Clerk identity.
  const user =
    (await db.user.findUnique({ where: { clerkUserId: userId } })) ??
    (await db.user.create({
      data: {
        clerkUserId: userId,
        name: (name?.trim() || clerkUser.firstName || 'Researcher') as string,
        email,
      },
    }))

  // Ingest the joiner's high school + optional classroom (same rules as create).
  await applySchoolAndClass(user.id, { highSchool, classCode }).catch(() => {})

  // Mirror the display name into Clerk so the avatar/account match from day one.
  await syncClerkDisplayName(userId, user.name)

  try {
    const teamId = await db.$transaction(async (tx) => {
      // This read is only for the team id and for friendly, specific errors. It
      // is NOT the single-use check — see the conditional consume below.
      const invite = await tx.teamInvite.findUnique({ where: { code: normalized } })
      if (!invite) throw new ApiError('That join code is not valid', 404)
      if (invite.usedByUserId) throw new ApiError('That join code has already been used', 409)
      if (invite.expiresAt < new Date()) throw new ApiError('That join code has expired', 410)

      await lockAggregate(tx, `team-membership:${invite.teamId}`)
      const team = await tx.team.findUnique({
        where: { id: invite.teamId },
        select: {
          id: true,
          classId: true,
          maxMembers: true,
          members: { select: { userId: true } },
        },
      })
      if (!team) throw new ApiError('That lab no longer exists', 404)

      // Already on this team? Treat as success (idempotent) and leave the code unused.
      if (team.members.some((m) => m.userId === user.id)) {
        await tx.user.update({ where: { id: user.id }, data: { activeTeamId: team.id } })
        return team.id
      }

      if (team.members.length >= team.maxMembers) {
        throw new ApiError('That lab is already full', 409)
      }
      // No cross-class block: class membership is per-student, so a lab may hold
      // members from different classes/schools — each stays in their own class.

      // CONSUME THE CODE FIRST, conditionally (REFACTOR2 P1-S1). The read above
      // is a stale snapshot: two joiners can both see `usedByUserId: null`,
      // serialize on the team lock, and both join — the old unconditional
      // `update` then just overwrote the audit owner with the second one. This
      // predicate makes redemption single-use in the database, so the loser gets
      // a 409 and its whole transaction rolls back before any membership exists.
      const consumed = await tx.teamInvite.updateMany({
        where: { code: normalized, usedByUserId: null, expiresAt: { gt: new Date() } },
        data: { usedByUserId: user.id, usedAt: new Date() },
      })
      if (consumed.count !== 1) throw new ApiError('That join code has already been used', 409)

      await tx.teamMember.create({ data: { userId: user.id, teamId: team.id, role: 'member' } })
      await tx.user.update({ where: { id: user.id }, data: { activeTeamId: team.id } })
      return team.id
    })

    // No lab-class auto-adopt: class membership is per-student. A joiner keeps
    // their own class (or requests their own teacher's class separately); the
    // teacher sees the lab because they own ≥1 member (teacherOwnsTeam).

    logActivityBestEffort(teamId, user.id, 'member_joined', { name: user.name }).catch(console.error)
    return NextResponse.json({ teamId })
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
