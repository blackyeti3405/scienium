import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { logActivity } from '@/lib/activity/log'
import { db } from '@/lib/db'
import { processPaperJob } from '@/lib/literature/process-paper'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  let paper = await db.paper.findFirst({
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

  if (paper.status === 'processing' || paper.status === 'error') {
    await processPaperJob(paper.id)
    paper = await db.paper.findFirst({
      where: { id: params.id, teamId: ctx.teamId },
      select: {
        id: true,
        title: true,
        authors: true,
        abstract: true,
        status: true,
        fileUrl: true,
        createdAt: true,
        proficiencies: { where: { userId: ctx.dbUserId }, select: { demonstrated: true } },
      },
    })
    if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { proficiencies, ...rest } = paper
  return NextResponse.json({
    ...rest,
    proficiencyDemonstrated: proficiencies[0]?.demonstrated ?? false,
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  const paper = await db.paper.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    select: { id: true, title: true },
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

  logActivity(ctx.teamId, ctx.dbUserId, 'paper_delete', { title: paper.title }).catch(console.error)

  return NextResponse.json({ ok: true })
}
