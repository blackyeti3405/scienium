import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity/log'
import {
  SHORT_TITLE_MAX,
  TITLE_MAX,
  ABSTRACT_MAX,
  ABSTRACT_WORD_MAX,
  wordCount,
  type PrivacyLevel,
} from '@/lib/showcase'
import { makeSlug } from '@/lib/showcase-server'

const PRIVACY = ['public', 'school_only', 'link_only', 'private'] as const

// Asset types whose bytes are streamed (board PDF, quad chart PDF/image).
const STREAMABLE = new Set(['board', 'quad_chart'])

/** Shapes a showcase + assets for the authoring client. */
function serialize(sc: {
  id: string
  slug: string
  shortTitle: string
  title: string
  abstract: string
  privacyLevel: string
  publishedAt: Date | null
  moderationStatus: string
  assets: { id: string; assetType: string; fileUrl: string | null; metadataJson: unknown }[]
  views?: number
  team?: { name: string; labType: string | null }
}) {
  return {
    id: sc.id,
    slug: sc.slug,
    shortTitle: sc.shortTitle,
    title: sc.title,
    abstract: sc.abstract,
    privacyLevel: sc.privacyLevel,
    published: sc.publishedAt != null,
    publishedAt: sc.publishedAt,
    moderationStatus: sc.moderationStatus,
    views: sc.views ?? 0,
    team: sc.team,
    assets: sc.assets.map((a) => ({
      id: a.id,
      assetType: a.assetType,
      // Uploaded files (PDF/image) stream through the access-controlled route.
      url: STREAMABLE.has(a.assetType) ? `/api/showcase/public/asset?id=${a.id}` : null,
      kind: STREAMABLE.has(a.assetType)
        ? a.fileUrl?.endsWith('.pdf')
          ? 'pdf'
          : 'image'
        : undefined,
      metadata: a.metadataJson ?? null,
    })),
  }
}

const includeFull = {
  assets: { orderBy: { uploadedAt: 'asc' as const } },
  team: { select: { name: true, labType: true } },
  _count: { select: { views: true } },
}

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read', feature: 'showcase' })
  if (error) return error

  const sc = await db.showcase.findUnique({ where: { teamId: ctx.teamId }, include: includeFull })

  if (!sc) {
    const team = await db.team.findUnique({
      where: { id: ctx.teamId },
      select: { name: true, labType: true },
    })
    return NextResponse.json({ showcase: null, team })
  }

  return NextResponse.json({ showcase: serialize({ ...sc, views: sc._count.views, team: sc.team }) })
}

const PutBody = z
  .object({
    shortTitle: z.string().trim().max(SHORT_TITLE_MAX).optional(),
    title: z.string().trim().max(TITLE_MAX).optional(),
    abstract: z.string().trim().max(ABSTRACT_MAX).optional(),
    privacyLevel: z.enum(PRIVACY).optional(),
    published: z.boolean().optional(),
  })
  .strict()

export async function PUT(req: NextRequest) {
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'mutate', feature: 'showcase' })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, PutBody)
  if (error) return error

  const existing = await db.showcase.findUnique({
    where: { teamId: ctx.teamId },
    include: { assets: { select: { assetType: true } } },
  })

  // Resolve post-update field values for validation.
  const nextShort = (data.shortTitle ?? existing?.shortTitle ?? '').trim()
  const nextTitle = (data.title ?? existing?.title ?? '').trim()
  const nextAbstract = (data.abstract ?? existing?.abstract ?? '').trim()
  const nextPrivacy = (data.privacyLevel ?? existing?.privacyLevel ?? 'link_only') as PrivacyLevel

  // Always enforce the 250-word abstract cap (even on draft saves).
  if (data.abstract !== undefined && wordCount(nextAbstract) > ABSTRACT_WORD_MAX) {
    return NextResponse.json(
      { error: `Abstract is limited to ${ABSTRACT_WORD_MAX} words.` },
      { status: 400 },
    )
  }

  if (!existing && nextShort.length < 1 && nextTitle.length < 3) {
    return NextResponse.json({ error: 'Add a title to start your showcase.' }, { status: 400 })
  }

  // Publish requires the full required set: short + long title, an abstract, and
  // the board PDF, the video link, and the quad chart.
  let publishFields: { publishedAt: Date | null; moderationStatus: 'approved' | 'draft' } | null = null
  if (data.published === true) {
    const have = new Set((existing?.assets ?? []).map((a) => a.assetType))
    const missing: string[] = []
    if (nextShort.length < 1) missing.push('a short title')
    if (nextTitle.length < 3) missing.push('a full title')
    if (wordCount(nextAbstract) < 1) missing.push('an abstract')
    if (!have.has('board')) missing.push('a board PDF')
    if (!have.has('video')) missing.push('a project video')
    if (!have.has('quad_chart')) missing.push('a quad chart')
    if (missing.length) {
      return NextResponse.json(
        { error: `Add ${missing.join(', ')} before publishing.` },
        { status: 400 },
      )
    }
    // Auto-approve on publish (teacher moderation is a future gate; see TODO.md).
    publishFields = { publishedAt: existing?.publishedAt ?? new Date(), moderationStatus: 'approved' }
  } else if (data.published === false) {
    publishFields = { publishedAt: null, moderationStatus: 'draft' }
  }

  const sc = existing
    ? await db.showcase.update({
        where: { teamId: ctx.teamId },
        data: {
          ...(data.shortTitle !== undefined ? { shortTitle: nextShort } : {}),
          ...(data.title !== undefined ? { title: nextTitle } : {}),
          ...(data.abstract !== undefined ? { abstract: nextAbstract } : {}),
          ...(data.privacyLevel !== undefined ? { privacyLevel: nextPrivacy } : {}),
          ...(publishFields ?? {}),
        },
        include: includeFull,
      })
    : await db.showcase.create({
        data: {
          teamId: ctx.teamId,
          slug: makeSlug(nextShort || nextTitle),
          shortTitle: nextShort,
          title: nextTitle,
          abstract: nextAbstract,
          privacyLevel: nextPrivacy,
          ...(publishFields ?? {}),
        },
        include: includeFull,
      })

  if (data.published === true) {
    logActivity(ctx.teamId, ctx.dbUserId, 'showcase_published', {
      title: sc.shortTitle || sc.title,
      slug: sc.slug,
    }).catch(console.error)
  }

  return NextResponse.json({ showcase: serialize({ ...sc, views: sc._count.views, team: sc.team }) })
}
