import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTeamContext } from '@/lib/phase'
import { enforceRateLimit } from '@/lib/rate-limit'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { batchCheckRelevance } from '@/lib/literature/relevance'
import { deleteObject } from '@/lib/storage'
import { logActivity } from '@/lib/activity/log'

// An empty/absent topic clears it; cap the length otherwise.
// `confirmWipe: true` signals the client has seen the confirmation and
// wants the topic change to proceed (triggering irrelevant-paper removal).
const TopicBody = z
  .object({
    topic: z.string().max(300).optional(),
    confirmWipe: z.boolean().optional(),
  })
  .strict()

// GET: the team's chosen final research topic + how many papers they have.
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'read', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const [team, paperCount] = await Promise.all([
    db.team.findUnique({ where: { id: ctx.teamId }, select: { topic: true } }),
    db.paper.count({ where: { teamId: ctx.teamId, status: 'ready' } }),
  ])

  return NextResponse.json({ topic: team?.topic ?? null, paperCount })
}

// POST: set (or clear) the team's final research topic.
//
// If the team already has a different topic AND has uploaded papers:
//   - Without `confirmWipe`: returns 409 { requiresConfirmation: true, paperCount }
//     so the client can show a warning before proceeding.
//   - With `confirmWipe: true`: runs a batch relevance check, deletes papers that
//     are no longer relevant to the new topic, then sets the topic.
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'mutate', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const dbUser = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })

  const { data, error } = await parseJson(req, TopicBody)
  if (error) return error
  const newTopic = (data.topic ?? '').trim()
  const confirmWipe = data.confirmWipe ?? false

  const team = await db.team.findUnique({
    where: { id: ctx.teamId },
    select: { topic: true },
  })

  const oldTopic = team?.topic ?? null
  const topicIsChanging = !!oldTopic && oldTopic !== newTopic && !!newTopic

  // If the topic is actually changing (not just being set for the first time),
  // check whether the team has papers that might need to be wiped.
  if (topicIsChanging && !confirmWipe) {
    const paperCount = await db.paper.count({
      where: { teamId: ctx.teamId, status: 'ready' },
    })
    if (paperCount > 0) {
      return NextResponse.json(
        { requiresConfirmation: true, paperCount, oldTopic, newTopic },
        { status: 409 },
      )
    }
  }

  let removedCount = 0
  const removedTitles: string[] = []

  // With confirmWipe, run the batch relevance check and delete irrelevant papers.
  if (topicIsChanging && confirmWipe && newTopic) {
    const papers = await db.paper.findMany({
      where: { teamId: ctx.teamId, status: 'ready' },
      select: { id: true, title: true, abstract: true, pdfKey: true },
    })

    if (papers.length > 0) {
      const relevanceMap = await batchCheckRelevance(newTopic, papers)

      const toDelete = papers.filter((p) => !relevanceMap.get(p.id))
      if (toDelete.length > 0) {
        await db.paper.deleteMany({
          where: { id: { in: toDelete.map((p) => p.id) } },
        })
        // Best-effort R2 cleanup; don't fail the whole request if storage delete errors
        await Promise.allSettled(
          toDelete.filter((p) => p.pdfKey).map((p) => deleteObject(p.pdfKey!)),
        )
        removedCount = toDelete.length
        removedTitles.push(...toDelete.map((p) => p.title))
      }
    }
  }

  await db.team.update({
    where: { id: ctx.teamId },
    data: { topic: newTopic || null },
  })

  if (dbUser) {
    logActivity(ctx.teamId, dbUser.id, 'topic_changed', {
      oldTopic,
      newTopic: newTopic || null,
    }).catch(console.error)
  }

  return NextResponse.json({
    topic: newTopic || null,
    removedCount,
    removedTitles,
  })
}
