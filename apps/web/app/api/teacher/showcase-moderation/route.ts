import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacher, teacherOwnsTeam } from '@/lib/teacher/auth'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'

/**
 * GET /api/teacher/showcase-moderation — pending showcase submissions for teams
 * in the teacher's classes. Scoped to the caller's classIds; no cross-class data
 * is ever returned.
 *
 * Returns `contentDigest` and the full asset list (REFACTOR2 P0-R3). The queue
 * used to select only text/team summary fields, so a reviewer could be asked to
 * approve a submission whose required board, quad chart, and video they had no
 * way to see. The digest is echoed back on the decision so an approval can only
 * ever land on the revision that was actually inspected.
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeacher(req, { tier: 'read' })
  if (error) return error

  if (ctx.classIds.length === 0) return NextResponse.json({ showcases: [] })

  const showcases = await db.showcase.findMany({
    where: {
      moderationStatus: 'pending_review',
      privacyLevel: 'public',
      team: { members: { some: { user: { classId: { in: ctx.classIds } } } } },
    },
    orderBy: { lastEditedAt: 'asc' },
    select: {
      id: true,
      slug: true,
      shortTitle: true,
      title: true,
      abstract: true,
      lastEditedAt: true,
      contentDigest: true,
      assets: {
        orderBy: { uploadedAt: 'asc' },
        select: { id: true, assetType: true, fileUrl: true, metadataJson: true },
      },
      team: { select: { name: true, labType: true } },
    },
  })

  return NextResponse.json({
    showcases: showcases.map((sc) => ({
      ...sc,
      // `/showcase/<slug>` now renders the exact pending revision for this
      // team's teacher — `canViewShowcase` grants the moderator preview.
      previewUrl: `/showcase/${sc.slug}`,
      assets: sc.assets.map((a) => ({
        id: a.id,
        assetType: a.assetType,
        // Uploaded bytes stream through the access-controlled route, which
        // applies the same moderator rule.
        url: a.fileUrl ? `/api/showcase/public/asset?id=${a.id}` : null,
        kind: a.fileUrl?.endsWith('.pdf') ? 'pdf' : a.fileUrl ? 'image' : undefined,
        metadata: a.metadataJson ?? null,
      })),
    })),
  })
}

const DecisionBody = z
  .object({
    showcaseId: z.string().trim().min(1).max(40),
    decision: z.enum(['approve', 'reject']),
    note: z.string().trim().max(500).optional(),
    /** The `contentDigest` the teacher actually reviewed (from the queue GET). */
    digest: z.string().trim().length(64),
  })
  .strict()

/**
 * POST /api/teacher/showcase-moderation — approve or reject a pending showcase.
 * Only showcases in `pending_review` and within the teacher's scope can be acted
 * on. Notifies the team on completion.
 *
 * The decision is bound to `digest` (P0-R3): if the team edited the submission
 * between the reviewer opening it and deciding, the digest no longer matches and
 * the request is refused rather than approving content nobody read.
 */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeacher(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, DecisionBody)
  if (bodyError) return bodyError

  const sc = await db.showcase.findUnique({
    where: { id: data.showcaseId },
    select: {
      id: true,
      teamId: true,
      moderationStatus: true,
      contentDigest: true,
      shortTitle: true,
      title: true,
    },
  })
  if (!sc || sc.moderationStatus !== 'pending_review') {
    return NextResponse.json({ error: 'Showcase not found or not pending review' }, { status: 404 })
  }
  if (!(await teacherOwnsTeam(ctx.classIds, sc.teamId))) {
    return NextResponse.json({ error: 'Not in your classes' }, { status: 403 })
  }

  const approved = data.decision === 'approve'
  const note = data.note?.trim() ?? null

  let stale = false
  await db.$transaction(async (tx) => {
    // Compare-and-set on the reviewed revision. `updateMany` with the digest in
    // the predicate means a submission edited mid-review simply does not match,
    // so the decision is refused instead of landing on unread content.
    const applied = await tx.showcase.updateMany({
      where: {
        id: sc.id,
        moderationStatus: 'pending_review',
        contentDigest: data.digest,
      },
      data: {
        moderationStatus: approved ? 'approved' : 'rejected',
        moderatedAt: new Date(),
        moderationNote: note,
        // Approval names the revision it covers; a rejection clears any prior one.
        approvedDigest: approved ? data.digest : null,
      },
    })
    if (applied.count !== 1) {
      stale = true
      return
    }

    const event = await tx.showcaseModerationEvent.create({
      data: {
        showcaseId: sc.id,
        digest: data.digest,
        action: approved ? 'approved' : 'rejected',
        actorUserId: ctx.dbUserId,
        note,
      },
      select: { id: true },
    })

    await tx.notification.create({
      data: {
        teamId: sc.teamId,
        kind: 'showcase_reviewed',
        title: approved ? 'Showcase approved — now public' : 'Showcase needs changes',
        body: approved
          ? `Your teacher approved your showcase. It's live in the public gallery.${note ? ` Note: ${note}` : ''}`
          : `Your teacher asked for changes before your showcase goes public.${note ? ` Note: ${note}` : ''}`,
        linkUrl: '/lab',
        // Keyed to the moderation event, unique by construction. `Date.now()`
        // made a retried transaction write a SECOND notice for one decision.
        dedupeKey: `showcase_reviewed:${event.id}`,
      },
    })
  })

  if (stale) {
    return NextResponse.json(
      {
        error:
          'This team changed their showcase while you were reviewing it. Reload the queue and review the current version.',
      },
      { status: 409 },
    )
  }

  return NextResponse.json({ ok: true, decision: data.decision })
}
