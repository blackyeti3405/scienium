import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withTeamRoute, RouteError } from '@/lib/api/with-route'
import { zipString } from '@/lib/validation'
import { zipToState, geocodeZip } from '@/lib/fairs/zip'
import { db } from '@/lib/db'

const LocationBody = z.object({ zip: zipString }).strict()

/**
 * POST /api/team/location — set/update the team's US location from a ZIP code
 * (Feature 3a). Derives the 2-letter state used for fair matching.
 */
export const POST = withTeamRoute(
  { tier: 'mutate', body: LocationBody },
  async ({ ctx, data }) => {
    const { zip } = data
    const state = zipToState(zip)
    if (!state) throw new RouteError("That ZIP doesn't map to a US state we recognize", 400)

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
  },
)
