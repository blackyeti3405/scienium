import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { enforceRateLimit } from '@/lib/rate-limit'
import { parseJson } from '@/lib/validation'
import { normalizeInviteCode } from '@/lib/team/invite'
import { applySchoolAndClass, syncClerkDisplayName, teamLeadClass } from '@/lib/onboarding/profile'
import { logActivity } from '@/lib/activity/log'
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
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Tight per-user + per-IP limit: join codes are short, so cap redemption
  // attempts to make brute-forcing an active code impractical.
  const limited = await enforceRateLimit(req, 'join', userId)
  if (limited) return limited

  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await parseJson(req, JoinBody)
  if (error) return error
  const { name, code, highSchool, classCode } = data

  const normalized = normalizeInviteCode(code)

  const email =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress
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
      const invite = await tx.teamInvite.findUnique({ where: { code: normalized } })
      if (!invite) throw new JoinError('That join code is not valid', 404)
      if (invite.usedByUserId) throw new JoinError('That join code has already been used', 409)
      if (invite.expiresAt < new Date()) throw new JoinError('That join code has expired', 410)

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
      if (!team) throw new JoinError('That lab no longer exists', 404)
      const joiningUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { classId: true },
      })

      // Already on this team? Treat as success (idempotent) and leave the code unused.
      if (team.members.some((m) => m.userId === user.id)) {
        await tx.user.update({ where: { id: user.id }, data: { activeTeamId: team.id } })
        return team.id
      }

      if (team.members.length >= team.maxMembers) {
        throw new JoinError('That lab is already full', 409)
      }
      if (joiningUser?.classId && team.classId && joiningUser.classId !== team.classId) {
        throw new JoinError('That lab belongs to a different class', 409)
      }

      await tx.teamMember.create({ data: { userId: user.id, teamId: team.id, role: 'member' } })
      await tx.teamInvite.update({
        where: { code: normalized },
        data: { usedByUserId: user.id, usedAt: new Date() },
      })
      await tx.user.update({ where: { id: user.id }, data: { activeTeamId: team.id } })
      return team.id
    })

    // If the joiner isn't in a class, adopt the lab's class (its lead's) so they
    // show up on the teacher's roster alongside the rest of the lab.
    const fresh = await db.user.findUnique({ where: { id: user.id }, select: { classId: true } })
    if (!fresh?.classId) {
      const labClass = await teamLeadClass(teamId)
      if (labClass) {
        await db.user.update({
          where: { id: user.id },
          data: { classId: labClass.classId, schoolId: labClass.schoolId },
        })
      }
    }

    logActivity(teamId, user.id, 'member_joined', { name: user.name }).catch(console.error)
    return NextResponse.json({ teamId })
  } catch (err) {
    if (err instanceof JoinError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}

class JoinError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}
