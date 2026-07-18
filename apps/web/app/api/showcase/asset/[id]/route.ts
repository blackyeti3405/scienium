import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { deleteObject } from '@/lib/storage'
import { db } from '@/lib/db'

// Remove one asset from the caller's team showcase (and its R2 object, if any).
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate', feature: 'showcase' })
  if (error) return error

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
