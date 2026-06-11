import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTeamContext, assertFeatureUnlocked, PhaseGateError } from '@/lib/phase'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  try {
    assertFeatureUnlocked(ctx.phase, 'showcase')
  } catch (err) {
    if (err instanceof PhaseGateError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    throw err
  }

  // TODO: return team's showcase data
  return NextResponse.json({ showcase: null })
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  try {
    assertFeatureUnlocked(ctx.phase, 'showcase')
  } catch (err) {
    if (err instanceof PhaseGateError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    throw err
  }

  // TODO: update showcase fields
  return NextResponse.json({ message: 'not implemented' }, { status: 501 })
}
