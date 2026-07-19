import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { logActivity } from '@/lib/activity/log'
import { orphanObjectKey } from '@/lib/uploads/assets'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  // Pure status read: a stuck `processing`/`error` paper is retried by the
  // 5-minute cron sweep (api/cron/papers), never by a GET — a read must not
  // reach Anthropic, and the `read` tier bypasses the paid-tier guard.
  const paper = await db.paper.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    select: {
      id: true,
      title: true,
      authors: true,
      abstract: true,
      status: true,
      fileUrl: true,
      createdAt: true,
      // This user's own proficiency on the source (per-student).
      proficiencies: { where: { userId: ctx.dbUserId }, select: { demonstrated: true } },
    },
  })

  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { proficiencies, ...rest } = paper
  return NextResponse.json({
    ...rest,
    proficiencyDemonstrated: proficiencies[0]?.demonstrated ?? false,
  })
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  const paper = await db.paper.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    select: { id: true, title: true, pdfKey: true },
  })
  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Remove dependent rows first (FK constraints), then the paper itself.
  await db.$transaction([
    db.paperChatMessage.deleteMany({ where: { paperId: paper.id } }),
    db.paperQuizAttempt.deleteMany({ where: { paperId: paper.id } }),
    db.paperQuizSession.deleteMany({ where: { paperId: paper.id } }),
    db.paperRelevanceNote.deleteMany({ where: { paperId: paper.id } }),
    db.paperProficiency.deleteMany({ where: { paperId: paper.id } }),
    db.paperExplanationAttempt.deleteMany({ where: { paperId: paper.id } }),
    db.paperExplanation.deleteMany({ where: { paperId: paper.id } }),
    db.paper.delete({ where: { id: paper.id } }),
  ])

  // Retire the stored PDF through the ledger, NOT with a direct deleteObject:
  // the reclaim sweep is the single physical-delete site. Without this the
  // `attached` UploadedAsset row outlives its paper, so the bytes stay charged
  // against the team's storage quota forever and the object is never reclaimed —
  // an ordinary student hits that just by tidying their library.
  if (paper.pdfKey) {
    await orphanObjectKey({
      teamId: ctx.teamId,
      userId: ctx.dbUserId,
      objectKey: paper.pdfKey,
      contentType: 'application/pdf',
      purpose: 'paper_pdf',
    })
  }

  logActivity(ctx.teamId, ctx.dbUserId, 'paper_delete', { title: paper.title }).catch(console.error)

  return NextResponse.json({ ok: true })
}
