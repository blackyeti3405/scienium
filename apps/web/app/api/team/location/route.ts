import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTeamContext } from '@/lib/phase'
import { isValidZip, zipToState } from '@/lib/fairs/zip'
import { db } from '@/lib/db'

/**
 * POST /api/team/location — set/update the team's US location from a ZIP code
 * (Feature 3a). Derives the 2-letter state used for fair matching.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const { zip } = await req.json()
  if (!zip || !isValidZip(String(zip))) {
    return NextResponse.json({ error: 'Enter a valid US ZIP code' }, { status: 400 })
  }

  const state = zipToState(String(zip))
  if (!state) {
    return NextResponse.json(
      { error: "That ZIP doesn't map to a US state we recognize" },
      { status: 400 },
    )
  }

  await db.team.update({
    where: { id: ctx.teamId },
    data: { locationZip: String(zip).trim(), locationState: state },
  })

  return NextResponse.json({ zip: String(zip).trim(), state })
}
