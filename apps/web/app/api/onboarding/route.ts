import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { enforceRateLimit } from '@/lib/rate-limit'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { isValidZip, zipToState, geocodeZip } from '@/lib/fairs/zip'

// Names are capped so a client can't store unbounded text; `.strict()` rejects
// any field other than these three.
const OnboardingBody = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(80),
    teamName: z.string().trim().min(1, 'Team name is required').max(80),
    zip: z.string().trim().max(10).optional(),
  })
  .strict()

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await enforceRateLimit(req, 'mutate', userId)
  if (limited) return limited

  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await parseJson(req, OnboardingBody)
  if (error) return error
  const { name, teamName, zip } = data

  // Optional US location (Feature 3): derive state + geocode to lat/lng.
  const locationZip = zip && isValidZip(zip) ? zip : null
  const locationState = locationZip ? zipToState(locationZip) : null
  const locationCoords = locationZip ? await geocodeZip(locationZip) : null

  const email =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress

  if (!email) return NextResponse.json({ error: 'No email on Clerk account' }, { status: 400 })

  // Idempotent — if user already exists just return their team
  const existing = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: { teamMemberships: { include: { team: true }, take: 1 } },
  })

  if (existing?.teamMemberships[0]) {
    return NextResponse.json({ teamId: existing.teamMemberships[0].team.id })
  }

  const user =
    existing ??
    (await db.user.create({
      data: { clerkUserId: userId, name: name.trim(), email },
    }))

  const team = await db.team.create({
    data: {
      name: teamName.trim(),
      teamLeadId: user.id,
      phase: 'literature_review',
      locationZip,
      locationState,
      locationLat: locationCoords?.[0] ?? null,
      locationLng: locationCoords?.[1] ?? null,
      members: { create: { userId: user.id, role: 'lead' } },
      // Every team starts with a zeroed currency ledger so KP/CLR/LC awards
      // (e.g. literature-review quiz proficiency) always have a row to update.
      currency: { create: {} },
    },
  })

  return NextResponse.json({ teamId: team.id })
}
