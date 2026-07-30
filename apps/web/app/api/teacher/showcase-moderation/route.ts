import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacher, teacherOwnsTeam } from '@/lib/teacher/auth'
import { parseJson } from '@/lib/validation'
import { recordSecurityEventTx } from '@/lib/observability/security-event'
import { SHOWCASE_REPORT_REASONS } from '@/lib/showcase'
import { db } from '@/lib/db'

/**
 * GET /api/teacher/showcase-moderation — pending showcase submissions for teams
 * in the teacher's classes, plus anything already published that has been
 * REPORTED or taken down. Scoped to the caller's classIds; no cross-class data
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

  if (ctx.classIds.length === 0) return NextResponse.json({ showcases: [], flagged: [] })

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
    flagged: await flaggedForTeacher(ctx.classIds),
  })
}

/**
 * Published showcases in the teacher's classes that need post-publication
 * attention: an open report, or an existing takedown to consider restoring.
 *
 * This is the half of moderation that revision binding does not cover. Approval
 * is bound to a revision, but the thing that makes a page a problem is often
 * discovered by a reader weeks later, and until now there was nowhere for that
 * to land.
 *
 * `ShowcaseReport` has no foreign key (evidence outlives the showcase), so the
 * counts are gathered with one `groupBy` over the scoped ids rather than a join.
 */
async function flaggedForTeacher(classIds: string[]) {
  const inScope = { team: { members: { some: { user: { classId: { in: classIds } } } } } }

  // Grouped by DIGEST as well as reason, so the revision each report was filed
  // against survives into the answer — that is what `reportedCurrentRevision`
  // below is derived from.
  // ponytail: unbounded group over OPEN reports only, which a teacher resolves
  // as they act; add a `take` if open reports are ever left to accumulate.
  const reported = await db.showcaseReport.groupBy({
    by: ['showcaseId', 'reason', 'digest'],
    where: { resolvedAt: null },
    _count: { _all: true },
  })
  const reportedIds = [...new Set(reported.map((r) => r.showcaseId))]

  const showcases = await db.showcase.findMany({
    where: { ...inScope, OR: [{ id: { in: reportedIds } }, { takedownAt: { not: null } }] },
    orderBy: { lastEditedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      slug: true,
      shortTitle: true,
      title: true,
      privacyLevel: true,
      publishedAt: true,
      moderationStatus: true,
      contentDigest: true,
      takedownAt: true,
      takedownReason: true,
      team: { select: { name: true } },
      moderationEvents: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, action: true, note: true, digest: true, createdAt: true },
      },
    },
  })

  return showcases.map((sc) => {
    const rows = reported.filter((r) => r.showcaseId === sc.id)
    const byReason = new Map<string, number>()
    for (const r of rows) byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + r._count._all)
    return {
      id: sc.id,
      slug: sc.slug,
      shortTitle: sc.shortTitle,
      title: sc.title,
      teamName: sc.team.name,
      previewUrl: `/showcase/${sc.slug}`,
      privacyLevel: sc.privacyLevel,
      published: sc.publishedAt != null,
      moderationStatus: sc.moderationStatus,
      contentDigest: sc.contentDigest,
      takedownAt: sc.takedownAt,
      takedownReason: sc.takedownReason,
      reportCount: rows.reduce((n, r) => n + r._count._all, 0),
      reasons: [...byReason].map(([reason, count]) => ({ reason, count })),
      // Whether any open report is about the revision that is live RIGHT NOW. A
      // team that has since edited may have already fixed it, and a reviewer who
      // cannot tell the difference either over- or under-reacts.
      reportedCurrentRevision: rows.some((r) => r.digest === sc.contentDigest),
      // `note` on these rows is a teacher's own prose or a bounded takedown
      // slug — never student-authored text (see the decision handler).
      events: sc.moderationEvents,
    }
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

    // The durable half of the decision (REFACTOR2 P1-5). `ShowcaseModerationEvent`
    // is `onDelete: Cascade` on the showcase — deleting the showcase erases the
    // record of who published it and who signed it off, which is the one thing an
    // operator asked about a public page needs. This row has no FK and survives.
    // The teacher's NOTE is deliberately not carried across: it is written to a
    // student about their work, and the ledger holds decisions, not prose.
    await recordSecurityEventTx(tx, {
      kind: 'moderation.decision',
      // A rejection is `denied` so it counts toward the moderation-abuse
      // threshold; an approval is `ok` and, by the alert rule's design, silent.
      outcome: approved ? 'ok' : 'denied',
      actorType: 'teacher',
      actorUserId: ctx.dbUserId,
      targetType: 'showcase',
      targetId: sc.id,
      scopeId: sc.teamId,
      reason: approved ? 'approved' : 'rejected',
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

const TakedownBody = z
  .object({
    showcaseId: z.string().trim().min(1).max(40),
    action: z.enum(['takedown', 'restore']),
    /** Required on a takedown, from the same bounded taxonomy reports use. */
    reason: z.enum(SHOWCASE_REPORT_REASONS).optional(),
  })
  .strict()

/**
 * PATCH /api/teacher/showcase-moderation — take a published showcase out of
 * public serving, or put it back (REFACTOR2 P1-6).
 *
 * This is the post-publication half that revision-bound moderation does not
 * cover, and the whole reason it exists is so removing a page is a BUTTON with
 * an audit trail rather than an UPDATE typed into a database console at 9pm.
 *
 * Authorization is exactly the decision path's: `requireTeacher` plus
 * `teacherOwnsTeam`. There is no platform-moderator role in scienium — `admin`
 * is a role on `User` that `requireTeacher` already admits, and inventing a
 * global content-moderator scope for a single-classroom pilot would be a new
 * privilege tier with nobody in it. Escalation past the class teacher is a
 * PROCESS (docs/runbooks/incident-response.md), not another button.
 *
 * What a takedown does NOT do: delete anything. The showcase row, its assets,
 * its R2 objects, its reports and its moderation history all stay exactly where
 * they are — an investigation needs them, and the teacher keeps moderator
 * preview through `canViewShowcase` so the content stays reviewable in place.
 */
export async function PATCH(req: NextRequest) {
  const { ctx, error } = await requireTeacher(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, TakedownBody)
  if (bodyError) return bodyError

  const down = data.action === 'takedown'
  if (down && !data.reason) {
    return NextResponse.json({ error: 'Choose a reason for the takedown.' }, { status: 400 })
  }

  const sc = await db.showcase.findUnique({
    where: { id: data.showcaseId },
    select: { id: true, teamId: true, contentDigest: true, takedownAt: true },
  })
  if (!sc) return NextResponse.json({ error: 'Showcase not found' }, { status: 404 })
  if (!(await teacherOwnsTeam(ctx.classIds, sc.teamId))) {
    return NextResponse.json({ error: 'Not in your classes' }, { status: 403 })
  }
  if (down === (sc.takedownAt != null)) {
    return NextResponse.json({ ok: true, alreadyApplied: true })
  }

  // Deliberately NOT digest-bound, unlike an approval. An approval must land on
  // the revision that was read; a takedown is the opposite — it has to apply to
  // whatever is live, including a revision the team pushed thirty seconds ago,
  // or editing during review would be a way to stay up. The revision at the
  // moment of the act is RECORDED instead.
  await db.$transaction(async (tx) => {
    await tx.showcase.update({
      where: { id: sc.id },
      data: {
        takedownAt: down ? new Date() : null,
        takedownReason: down ? (data.reason ?? null) : null,
      },
    })

    const event = await tx.showcaseModerationEvent.create({
      data: {
        showcaseId: sc.id,
        digest: sc.contentDigest,
        action: down ? 'taken_down' : 'restored',
        actorUserId: ctx.dbUserId,
        // A bounded slug, not prose — this row is read by an operator.
        note: down ? (data.reason ?? null) : null,
      },
      select: { id: true },
    })

    // Acting on the reports closes them: the count in the queue is "what still
    // needs a look", and a page a teacher has already decided about does not.
    await tx.showcaseReport.updateMany({
      where: { showcaseId: sc.id, resolvedAt: null },
      data: { resolvedAt: new Date() },
    })

    await recordSecurityEventTx(tx, {
      kind: 'moderation.takedown',
      // `denied` on a takedown is what the threshold rule counts, so the first
      // one in a day raises the owner (ALERT_RULES). A restore is `ok`, and
      // silent — the ledger row is the record, not an alarm.
      outcome: down ? 'denied' : 'ok',
      actorType: 'teacher',
      actorUserId: ctx.dbUserId,
      targetType: 'showcase',
      targetId: sc.id,
      scopeId: sc.teamId,
      reason: down ? (data.reason ?? null) : 'restored',
    })

    await tx.notification.create({
      data: {
        teamId: sc.teamId,
        kind: 'showcase_reviewed',
        title: down ? 'Showcase taken offline' : 'Showcase back online',
        body: down
          ? 'Your teacher took your public showcase offline while they look into a report. Talk to them about what happens next.'
          : 'Your teacher put your public showcase back online.',
        linkUrl: '/lab',
        // Keyed to the moderation event, same as the decision path: a retried
        // transaction must not tell a team twice that their page came down.
        dedupeKey: `showcase_takedown:${event.id}`,
      },
    })
  })

  return NextResponse.json({ ok: true, takenDown: down })
}
