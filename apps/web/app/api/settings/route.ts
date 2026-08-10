import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson, zipString } from '@/lib/validation'
import { zipToState, geocodeZip } from '@/lib/fairs/zip'
import { syncClerkDisplayName } from '@/lib/onboarding/profile'
import { db } from '@/lib/db'

const SettingsBody = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
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

  // ── DERIVE EVERYTHING FIRST, THEN WRITE ONCE (REFACTOR2 P2-S7) ─────────────
  // This handler used to write the name (and mirror it to Clerk), the school,
  // the research idea and the lab name — and only THEN check whether the ZIP
  // maps to a state. A PATCH carrying `{ name, labName, zip: '00000' }` came
  // back 400 with three of its four fields already applied and the fourth
  // silently dropped, which is the worst of both: the caller believes nothing
  // was saved. Every rejection now happens before the first write, and the
  // writes that survive it commit together or not at all.

  const teamData: { researchIdea?: string; name?: string } & Record<string, unknown> = {}
  if (data.researchIdea !== undefined) teamData.researchIdea = data.researchIdea
  // Team-field writes (lead only, already guarded above)
  if (data.labName !== undefined) teamData.name = data.labName

  if (data.zip !== undefined) {
    const state = zipToState(data.zip)
    if (!state) {
      return NextResponse.json(
        { error: "That ZIP doesn't map to a US state we recognize" },
        { status: 400 },
      )
    }
    // Geocoding is a network call to Nominatim — done HERE, before the
    // transaction opens, because a transaction must never be held across the
    // network (HANDOFF conventions). A geocode miss is not an error: the ZIP
    // and state are still authoritative, the coordinates are a nicety.
    const coords = await geocodeZip(data.zip)
    teamData.locationZip = data.zip
    teamData.locationState = state
    teamData.locationLat = coords?.[0] ?? null
    teamData.locationLng = coords?.[1] ?? null
  }

  await db.$transaction(async (tx) => {
    // User-field writes (any member, self-scoped)
    // A student's school is NOT writable here any more: it is set only when a
    // teacher approves their class-join request. See lib/onboarding/profile.ts.
    if (data.name !== undefined) {
      await tx.user.update({ where: { id: ctx.dbUserId }, data: { name: data.name } })
    }
    if (Object.keys(teamData).length > 0) {
      await tx.team.update({ where: { id: ctx.teamId }, data: teamData })
    }
  })

  // Mirror to the Clerk profile name so the avatar/account stay in sync with the
  // DB — AFTER the commit, so a Clerk outage cannot leave a half-applied PATCH.
  // It swallows its own errors; the DB is the source of truth.
  if (data.name !== undefined) await syncClerkDisplayName(ctx.userId, data.name)

  // Return refreshed values (same shape as GET)
  const [updatedUser, updatedTeam] = await fetchProfile(ctx)
  return NextResponse.json(shapeProfile(updatedUser, updatedTeam, ctx.dbUserId))
}
