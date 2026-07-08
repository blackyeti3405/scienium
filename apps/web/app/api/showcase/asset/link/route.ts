import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import {
  isSafeHttpUrl,
  parseVideoUrl,
  SINGLE_SLOT,
  MAX_DEMO_VIDEOS,
  MAX_SUPPLEMENTS,
  URL_MAX,
  LINK_LABEL_MAX,
  type ShowcaseAssetType,
} from '@/lib/showcase'
import type { Prisma } from '@prisma/client'

const Body = z
  .object({
    assetType: z.enum(['video', 'demo_video', 'repo_link', 'supplement']),
    url: z.string().trim().min(1).max(URL_MAX),
    label: z.string().trim().max(LINK_LABEL_MAX).optional(),
  })
  .strict()

const MULTI_CAP: Partial<Record<ShowcaseAssetType, number>> = {
  demo_video: MAX_DEMO_VIDEOS,
  supplement: MAX_SUPPLEMENTS,
}

export async function POST(req: NextRequest) {
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'mutate', feature: 'showcase' })
  if (guardError) return guardError

  const showcase = await db.showcase.findUnique({ where: { teamId: ctx.teamId }, select: { id: true } })
  if (!showcase) {
    return NextResponse.json({ error: 'Save your showcase details first.' }, { status: 409 })
  }

  const { data, error } = await parseJson(req, Body)
  if (error) return error
  const assetType = data.assetType as ShowcaseAssetType

  // Validate + normalize per type.
  let metadata: Record<string, unknown>
  if (assetType === 'video' || assetType === 'demo_video') {
    const v = parseVideoUrl(data.url)
    if (!v) return NextResponse.json({ error: 'Paste a YouTube or Vimeo video link.' }, { status: 400 })
    metadata = { provider: v.provider, videoId: v.videoId, embedUrl: v.embedUrl, url: data.url, label: data.label ?? '' }
  } else {
    if (!isSafeHttpUrl(data.url)) {
      return NextResponse.json({ error: 'Enter a valid http(s) link.' }, { status: 400 })
    }
    metadata = { url: data.url, label: data.label ?? '' }
  }

  if (SINGLE_SLOT[assetType]) {
    // Replace any existing of this single-slot type.
    await db.showcaseAsset.deleteMany({ where: { showcaseId: showcase.id, assetType } })
  } else {
    // Enforce the cap on multi-slot types.
    const cap = MULTI_CAP[assetType] ?? 0
    const count = await db.showcaseAsset.count({ where: { showcaseId: showcase.id, assetType } })
    if (count >= cap) {
      return NextResponse.json({ error: `Up to ${cap} ${assetType === 'demo_video' ? 'demo videos' : 'links'}.` }, { status: 409 })
    }
  }

  const asset = await db.showcaseAsset.create({
    data: { showcaseId: showcase.id, assetType, metadataJson: metadata as Prisma.InputJsonValue },
    select: { id: true, assetType: true, metadataJson: true },
  })

  return NextResponse.json(
    { asset: { id: asset.id, assetType: asset.assetType, url: null, metadata: asset.metadataJson } },
    { status: 201 },
  )
}
