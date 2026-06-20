import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTeamContext, assertFeatureUnlocked, PhaseGateError } from '@/lib/phase'
import { enforceRateLimit } from '@/lib/rate-limit'
import { deleteObject } from '@/lib/storage'
import { db } from '@/lib/db'

// Remove one asset from the caller's team showcase (and its R2 object, if any).
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await enforceRateLimit(req, 'mutate', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })
  try {
    assertFeatureUnlocked(ctx.phase, 'showcase')
  } catch (err) {
    if (err instanceof PhaseGateError) return NextResponse.json({ error: err.message }, { status: 403 })
    throw err
  }

  // Scope the lookup to the caller's team so one team can't delete another's asset.
  const asset = await db.showcaseAsset.findFirst({
    where: { id: params.id, showcase: { teamId: ctx.teamId } },
    select: { id: true, fileUrl: true },
  })
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.showcaseAsset.delete({ where: { id: asset.id } })
  if (asset.fileUrl) deleteObject(asset.fileUrl).catch(() => {})

  return NextResponse.json({ ok: true })
}
