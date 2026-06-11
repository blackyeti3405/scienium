import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTeamContext, assertFeatureUnlocked, PhaseGateError } from '@/lib/phase'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  // Reading the building catalog is allowed once a team has a lab type (working+).
  // This gate covers both catalog browsing and upgrade status.
  try {
    assertFeatureUnlocked(ctx.phase, 'buildings')
  } catch (err) {
    if (err instanceof PhaseGateError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    throw err
  }

  // TODO: return team buildings with current_level
  return NextResponse.json({ buildings: [] })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  try {
    assertFeatureUnlocked(ctx.phase, 'buildings')
  } catch (err) {
    if (err instanceof PhaseGateError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    throw err
  }

  // TODO: purchase a building (deduct KP, create team_buildings row)
  return NextResponse.json({ message: 'not implemented' }, { status: 501 })
}
