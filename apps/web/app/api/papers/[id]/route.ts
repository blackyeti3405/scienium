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

  // Domain rows AND the ledger transition commit TOGETHER (REFACTOR2 P1-S8).
  // These used to be two commits: the paper was deleted, then the asset was
  // orphaned. A crash in between left an `attached` UploadedAsset with no live
  // owner — invisible to the sweep, permanently charged against the team's
  // quota, and unfixable by retrying (the second attempt 404s on the missing
  // paper). Retiring through the ledger rather than calling `deleteObject` is
  // also what keeps the sweep the single physical-delete site.
  await db.$transaction(async (tx) => {
    await tx.paperChatMessage.deleteMany({ where: { paperId: paper.id } })
    await tx.paperQuizAttempt.deleteMany({ where: { paperId: paper.id } })
    await tx.paperQuizSession.deleteMany({ where: { paperId: paper.id } })
    await tx.paperRelevanceNote.deleteMany({ where: { paperId: paper.id } })
    await tx.paperProficiency.deleteMany({ where: { paperId: paper.id } })
    await tx.paperExplanationAttempt.deleteMany({ where: { paperId: paper.id } })
    await tx.paperExplanation.deleteMany({ where: { paperId: paper.id } })
    await tx.paper.delete({ where: { id: paper.id } })

    if (paper.pdfKey) {
      await orphanObjectKey(
        {
          teamId: ctx.teamId,
          userId: ctx.dbUserId,
          objectKey: paper.pdfKey,
          contentType: 'application/pdf',
          purpose: 'paper_pdf',
        },
        tx,
      )
    }
  })

  logActivity(ctx.teamId, ctx.dbUserId, 'paper_delete', { title: paper.title }).catch(console.error)

  return NextResponse.json({ ok: true })
}
