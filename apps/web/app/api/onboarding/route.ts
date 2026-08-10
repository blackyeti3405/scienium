import { currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { recordSecurityEventTx } from '@/lib/observability/security-event'
import { db } from '@/lib/db'
import { pickActiveTeam } from '@/lib/team/context'
import { isValidZip, zipToState, geocodeZip } from '@/lib/fairs/zip'
import { LAB_TYPES } from '@/lib/phase'
import { applyClassCode, resolvePrimaryEmail, syncClerkDisplayName } from '@/lib/onboarding/profile'
import { STARTING_GATEWAYS } from '@/lib/gateways'
import { legalConsentShape, recordLegalAcceptance } from '@/lib/legal/consent'

// Names are capped so a client can't store unbounded text; `.strict()` rejects
// any field other than these.
const OnboardingBody = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(80),
    teamName: z.string().trim().min(1, 'Team name is required').max(80),
    zip: z.string().trim().max(10).optional(),
    classCode: z.string().trim().max(32).optional(),
    // The lab type the student picked at sign-up. A starting guess, not a
    // commitment: locking a topic re-derives it from the actual work and carries
    // the plot across (lib/lab-type/transfer.ts). Required so a new lab always
    // has a shop to buy from — every building is lab-type-gated, so a lab with
    // no type sees an empty shelf.
    labType: z.enum(LAB_TYPES),
    ...legalConsentShape,
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
  const { name, teamName, zip, classCode, labType } = data

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

  // The body already proved acceptance (the schema refuses anything else); this
  // records WHICH version, and only on the first pass.
  await recordLegalAcceptance(user.id)

  // File a pending class-join request when a class code was supplied. No school
  // is collected from students — see lib/onboarding/profile.ts.
  // Non-fatal — a school lookup hiccup must not block lab creation.
  await applyClassCode(user.id, { classCode }).catch(() => {})

  // Mirror the display name into Clerk so the avatar/account match from day one.
  await syncClerkDisplayName(userId, user.name)

  const team = await db.$transaction(async (tx) => {
    const created = await tx.team.create({
      data: {
        name: teamName.trim(),
        teamLeadId: user.id,
        labType,
        // ADR-004: `Team.classId` is vestigial — class membership is per
        // student. New teams never populate it.
        //
        // A new lab starts in DISCOVERY. This used to create teams straight into
        // `literature_review`, skipping the first phase entirely — every lab
        // opened one phase ahead of where the arc says it should.
        phase: 'discovery',
        // The three discovery gateways are standing on day one; every later
        // gateway is earned and placed from the shop.
        gatewayPlacements: {
          create: STARTING_GATEWAYS.map((g) => ({
            gatewayKey: g.key,
            posX: g.cell.gx,
            posY: g.cell.gy,
          })),
        },
        locationZip,
        locationState,
        locationLat: locationCoords?.[0] ?? null,
        locationLng: locationCoords?.[1] ?? null,
        members: { create: { userId: user.id, role: 'lead' } },
        currency: { create: {} },
      },
    })
    await tx.user.update({ where: { id: user.id }, data: { activeTeamId: created.id } })
    // Provisioning is an authority event (REFACTOR2 P1-5): this is where a lab —
    // and its first lead — comes into existence. Nothing else in the app records
    // that, and `Team.createdAt` cannot say who did it. In the same transaction,
    // so a rolled-back creation leaves no claim that one happened.
    await recordSecurityEventTx(tx, {
      kind: 'provision.team',
      outcome: 'ok',
      actorType: 'user',
      actorUserId: user.id,
      targetType: 'team',
      targetId: created.id,
      scopeId: created.id,
      reason: 'student_onboarding',
    })
    return created
  })

  return NextResponse.json({ teamId: team.id })
}
