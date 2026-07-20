import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson, zipString } from '@/lib/validation'
import { zipToState, geocodeZip } from '@/lib/fairs/zip'
import { applySchoolAndClass, syncClerkDisplayName } from '@/lib/onboarding/profile'
import { db } from '@/lib/db'

const SettingsBody = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    school: z.string().trim().max(120).optional(),
    labName: z.string().trim().min(1).max(80).optional(),
    zip: zipString.optional(),
    researchIdea: z.string().trim().max(500).optional(),
  })
  .strict()

/** The user + team fields GET and PATCH both fetch and shape identically. */
function fetchProfile(ctx: { dbUserId: string; teamId: string }) {
  return Promise.all([
    db.user.findUnique({
      where: { id: ctx.dbUserId },
      select: { name: true, school: { select: { name: true } } },
    }),
    db.team.findUnique({
      where: { id: ctx.teamId },
      select: { name: true, teamLeadId: true, locationZip: true, locationState: true, researchIdea: true },
    }),
  ])
}

type ProfileUser = Awaited<ReturnType<typeof fetchProfile>>[0]
type ProfileTeam = Awaited<ReturnType<typeof fetchProfile>>[1]

function shapeProfile(user: ProfileUser, team: ProfileTeam, dbUserId: string) {
  return {
    name: user?.name ?? null,
    school: user?.school?.name ?? null,
    labName: team?.name ?? null,
    zip: team?.locationZip ?? null,
    state: team?.locationState ?? null,
    isLead: team?.teamLeadId === dbUserId,
    researchIdea: team?.researchIdea ?? null,
  }
}

/** GET /api/settings — returns current user + team profile fields */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const [user, team] = await fetchProfile(ctx)
  if (!user || !team) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(shapeProfile(user, team, ctx.dbUserId))
}

/** PATCH /api/settings — update user and/or team profile fields */
export async function PATCH(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, SettingsBody)
  if (bodyError) return bodyError

  // Load-bearing authorization: check if caller is the lab lead before any write
  const team = await db.team.findUnique({
    where: { id: ctx.teamId },
    select: { teamLeadId: true },
  })
  const isLead = team?.teamLeadId === ctx.dbUserId

  if ((data.labName !== undefined || data.zip !== undefined) && !isLead) {
    return NextResponse.json(
      { error: 'Only the lab lead can edit team settings' },
      { status: 403 },
    )
  }

  // User-field writes (any member, self-scoped)
  if (data.name !== undefined) {
    await db.user.update({ where: { id: ctx.dbUserId }, data: { name: data.name } })
    // Mirror to the Clerk profile name so the avatar/account stay in sync with the DB.
    await syncClerkDisplayName(ctx.userId, data.name)
  }
  if (data.school !== undefined) {
    await applySchoolAndClass(ctx.dbUserId, { highSchool: data.school })
  }
  // researchIdea is any-member — updates only the researchIdea column; labType is unchanged
  if (data.researchIdea !== undefined) {
    await db.team.update({
      where: { id: ctx.teamId },
      data: { researchIdea: data.researchIdea },
    })
  }

  // Team-field writes (lead only, already guarded above)
  if (data.labName !== undefined) {
    await db.team.update({ where: { id: ctx.teamId }, data: { name: data.labName } })
  }
  if (data.zip !== undefined) {
    const state = zipToState(data.zip)
    if (!state) {
      return NextResponse.json(
        { error: "That ZIP doesn't map to a US state we recognize" },
        { status: 400 },
      )
    }
    const coords = await geocodeZip(data.zip)
    await db.team.update({
      where: { id: ctx.teamId },
      data: {
        locationZip: data.zip,
        locationState: state,
        locationLat: coords?.[0] ?? null,
        locationLng: coords?.[1] ?? null,
      },
    })
  }

  // Return refreshed values (same shape as GET)
  const [updatedUser, updatedTeam] = await fetchProfile(ctx)
  return NextResponse.json(shapeProfile(updatedUser, updatedTeam, ctx.dbUserId))
}
