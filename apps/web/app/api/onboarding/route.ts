import { currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { pickActiveTeam } from '@/lib/team/context'
import { isValidZip, zipToState, geocodeZip } from '@/lib/fairs/zip'
import { applySchoolAndClass, resolvePrimaryEmail, syncClerkDisplayName } from '@/lib/onboarding/profile'

// Names are capped so a client can't store unbounded text; `.strict()` rejects
// any field other than these.
const OnboardingBody = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(80),
    teamName: z.string().trim().min(1, 'Team name is required').max(80),
    zip: z.string().trim().max(10).optional(),
    highSchool: z.string().trim().max(120).optional(),
    classCode: z.string().trim().max(32).optional(),
  })
  .strict()

export async function POST(req: NextRequest) {
  const { ctx, error: guardError } = await requireUserContext(req, { tier: 'mutate' })
  if (guardError) return guardError
  const { userId } = ctx

  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await parseJson(req, OnboardingBody)
  if (error) return error
  const { name, teamName, zip, highSchool, classCode } = data

  // Optional US location (Feature 3): derive state + geocode to lat/lng.
  const locationZip = zip && isValidZip(zip) ? zip : null
  const locationState = locationZip ? zipToState(locationZip) : null
  const locationCoords = locationZip ? await geocodeZip(locationZip) : null

  const email = resolvePrimaryEmail(clerkUser)

  if (!email) return NextResponse.json({ error: 'No email on Clerk account' }, { status: 400 })

  // Idempotent — if user already exists just return their team (resolved through
  // membership, so a stale activeTeamId never points outside their own labs).
  const existing = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      teamMemberships: { orderBy: { joinedAt: 'desc' }, include: { team: true } },
    },
  })

  const existingTeam = existing ? pickActiveTeam(existing.activeTeamId, existing.teamMemberships) : null
  if (existingTeam) {
    return NextResponse.json({ teamId: existingTeam.id })
  }

  const user =
    existing ??
    (await db.user.create({
      data: { clerkUserId: userId, name: name.trim(), email },
    }))

  // Ingest the student's high school (find-or-create) and optional classroom.
  // Non-fatal — a school lookup hiccup must not block lab creation.
  await applySchoolAndClass(user.id, { highSchool, classCode }).catch(() => {})

  // Mirror the display name into Clerk so the avatar/account match from day one.
  await syncClerkDisplayName(userId, user.name)

  const team = await db.$transaction(async (tx) => {
    const created = await tx.team.create({
      data: {
        name: teamName.trim(),
        teamLeadId: user.id,
        // ADR-004: `Team.classId` is vestigial — class membership is per
        // student. New teams never populate it.
        phase: 'literature_review',
        locationZip,
        locationState,
        locationLat: locationCoords?.[0] ?? null,
        locationLng: locationCoords?.[1] ?? null,
        members: { create: { userId: user.id, role: 'lead' } },
        currency: { create: {} },
      },
    })
    await tx.user.update({ where: { id: user.id }, data: { activeTeamId: created.id } })
    return created
  })

  return NextResponse.json({ teamId: team.id })
}
