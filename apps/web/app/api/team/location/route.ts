import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTeamContext } from '@/lib/phase'
import { enforceRateLimit } from '@/lib/rate-limit'
import { parseJson, zipString } from '@/lib/validation'
import { zipToState } from '@/lib/fairs/zip'
import { db } from '@/lib/db'

const LocationBody = z.object({ zip: zipString }).strict()

/**
 * POST /api/team/location — set/update the team's US location from a ZIP code
 * (Feature 3a). Derives the 2-letter state used for fair matching.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'mutate', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

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

  await db.team.update({
    where: { id: ctx.teamId },
    data: { locationZip: zip, locationState: state },
  })

  return NextResponse.json({ zip, state })
}
