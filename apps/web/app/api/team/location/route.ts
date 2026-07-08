import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson, zipString } from '@/lib/validation'
import { zipToState, geocodeZip } from '@/lib/fairs/zip'
import { db } from '@/lib/db'

const LocationBody = z.object({ zip: zipString }).strict()

/**
 * POST /api/team/location — set/update the team's US location from a ZIP code
 * (Feature 3a). Derives the 2-letter state used for fair matching.
 */
export async function POST(req: NextRequest) {
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'mutate' })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, LocationBody)
  if (error) return error
  const { zip } = data

  const state = zipToState(zip)
  if (!state) {
    return NextResponse.json(
      { error: "That ZIP doesn't map to a US state we recognize" },
      { status: 400 },
    )
  }

  const coords = await geocodeZip(zip)

  await db.team.update({
    where: { id: ctx.teamId },
    data: {
      locationZip: zip,
      locationState: state,
      locationLat: coords?.[0] ?? null,
      locationLng: coords?.[1] ?? null,
    },
  })

  return NextResponse.json({ zip, state })
}
