import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTeamContext } from '@/lib/phase'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const dbUser = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

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
      proficiencies: { where: { userId: dbUser.id }, select: { demonstrated: true } },
    },
  })

  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { proficiencies, ...rest } = paper
  return NextResponse.json({
    ...rest,
    proficiencyDemonstrated: proficiencies[0]?.demonstrated ?? false,
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const paper = await db.paper.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    select: { id: true },
  })
  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Remove dependent rows first (FK constraints), then the paper itself.
  await db.$transaction([
    db.paperChatMessage.deleteMany({ where: { paperId: paper.id } }),
    db.paperQuizAttempt.deleteMany({ where: { paperId: paper.id } }),
    db.paperQuizSession.deleteMany({ where: { paperId: paper.id } }),
    db.paperRelevanceNote.deleteMany({ where: { paperId: paper.id } }),
    db.paperProficiency.deleteMany({ where: { paperId: paper.id } }),
    db.paper.delete({ where: { id: paper.id } }),
  ])

  return NextResponse.json({ ok: true })
}
