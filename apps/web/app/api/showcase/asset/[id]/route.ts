import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { orphanObjectKey } from '@/lib/uploads/assets'
import { db } from '@/lib/db'

// Remove one asset from the caller's team showcase (and its R2 object, if any).
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate', feature: 'showcase' })
  if (error) return error

  // Scope the lookup to the caller's team so one team can't delete another's asset.
  const asset = await db.showcaseAsset.findFirst({
    where: { id: params.id, showcase: { teamId: ctx.teamId, }, },
    select: { id: true, assetType: true, fileUrl: true },
  })
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.showcaseAsset.delete({ where: { id: asset.id } })

  // Record intent; the reclaim sweep owns the physical delete. Link-only assets
  // (video URLs) hold an external URL rather than an object key — there is nothing
  // in storage to retire for those.
  const objectKey = asset.fileUrl
  if (objectKey && !/^https?:\/\//i.test(objectKey)) {
    await orphanObjectKey({
      teamId: ctx.teamId,
      userId: ctx.dbUserId,
      objectKey,
      contentType: objectKey.endsWith('.pdf') ? 'application/pdf' : 'image/png',
      purpose: `showcase_${asset.assetType}`,
    })
  }

  return NextResponse.json({ ok: true })
}
