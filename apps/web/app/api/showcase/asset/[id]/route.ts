import { NextResponse } from 'next/server'
import { withTeamRoute, ApiError } from '@/lib/api/with-route'
import { orphanObjectKey } from '@/lib/uploads/assets'
import { syncShowcaseRevision } from '@/lib/showcase-server'
import { db } from '@/lib/db'

// Remove one asset from the caller's team showcase (and its R2 object, if any).
export const DELETE = withTeamRoute(
  { tier: 'mutate', feature: 'showcase' },
  async ({ ctx, params }) => {
    // Scope the lookup to the caller's team so one team can't delete another's asset.
    const asset = await db.showcaseAsset.findFirst({
      where: { id: params.id, showcase: { teamId: ctx.teamId } },
      select: { id: true, assetType: true, fileUrl: true, showcaseId: true },
    })
    if (!asset) throw new ApiError('Not found', 404)

    // Domain delete, revision re-derivation, and the ledger transition commit
    // TOGETHER (REFACTOR2 P1-S8). Split across commits, a crash after the row
    // delete left an `attached` UploadedAsset with no live owner — invisible to
    // the sweep and still charged against the team's quota.
    //
    // Link-only assets (video URLs) hold an external URL rather than an object
    // key: there is nothing in storage to retire for those.
    const objectKey = asset.fileUrl
    await db.$transaction(async (tx) => {
      await tx.showcaseAsset.delete({ where: { id: asset.id } })

      // Removing a required asset changes what a reviewer approved (P0-R3).
      await syncShowcaseRevision(tx, asset.showcaseId, ctx.dbUserId)

      if (objectKey && !/^https?:\/\//i.test(objectKey)) {
        await orphanObjectKey(
          {
            teamId: ctx.teamId,
            userId: ctx.dbUserId,
            objectKey,
            contentType: objectKey.endsWith('.pdf') ? 'application/pdf' : 'image/png',
            purpose: `showcase_${asset.assetType}`,
          },
          tx,
        )
      }
    })

    return NextResponse.json({ ok: true })
  },
)
