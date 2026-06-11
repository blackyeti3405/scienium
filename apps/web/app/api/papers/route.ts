import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTeamContext, assertFeatureUnlocked, PhaseGateError } from '@/lib/phase'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  // Uploading papers for Literature Review requires literature_review phase or later.
  try {
    assertFeatureUnlocked(ctx.phase, 'literature')
  } catch (err) {
    if (err instanceof PhaseGateError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    throw err
  }

  // TODO: accept multipart upload, write to R2, create paper row, enqueue processing job
  return NextResponse.json({ message: 'not implemented' }, { status: 501 })
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  try {
    assertFeatureUnlocked(ctx.phase, 'literature')
  } catch (err) {
    if (err instanceof PhaseGateError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    throw err
  }

  // TODO: return papers for the user's team
  return NextResponse.json({ papers: [] })
}
