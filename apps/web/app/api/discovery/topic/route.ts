import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { enforceRateLimit } from '@/lib/rate-limit'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { batchCheckRelevance } from '@/lib/literature/relevance'
import { deleteObject } from '@/lib/storage'
import { logActivity } from '@/lib/activity/log'
import { TOPIC_LOCK_KP } from '@/lib/discovery/economy'
import { matchInterests } from '@/lib/discovery/interest-match'

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
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

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
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'mutate' })
  if (guardError) return guardError

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
      // Anthropic-backed batch check → must clear the paid `ai` tier
      // (fail-closed in production), not just the route's `mutate` tier.
      const aiLimited = await enforceRateLimit(req, 'ai', ctx.userId)
      if (aiLimited) return aiLimited

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

  logActivity(ctx.teamId, ctx.dbUserId, 'topic_changed', {
    oldTopic,
    newTopic: newTopic || null,
  }).catch(console.error)

  // One-time "Topic Locked" bonus (#1): granted at most once per team ever, the
  // first time a non-empty topic is set. Idempotent via DiscoveryTopicBonus's
  // @@id(teamId) — clearing then re-setting the topic pays nothing the 2nd time.
  let topicBonusKp = 0
  if (newTopic) {
    try {
      await db.$transaction(async (tx) => {
        await tx.discoveryTopicBonus.create({
          data: { teamId: ctx.teamId, kpAwarded: TOPIC_LOCK_KP },
        })
        await tx.teamCurrency.upsert({
          where: { teamId: ctx.teamId },
          create: { teamId: ctx.teamId, kp: TOPIC_LOCK_KP },
          update: { kp: { increment: TOPIC_LOCK_KP } },
        })
      })
      topicBonusKp = TOPIC_LOCK_KP
      logActivity(ctx.teamId, ctx.dbUserId, 'topic_locked', { kp: TOPIC_LOCK_KP }).catch(console.error)
    } catch (err) {
      // P2002 → bonus already granted for this team; award nothing (topicBonusKp 0).
      if (!(typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002')) {
        console.error('[discovery/topic] topic-lock bonus failed:', err)
      }
    }
  }

  // Topic ↔ interest reconnection (#2): deterministic LOCAL overlap (NO LLM). For
  // a non-empty topic, mark which of the team's seeded interests connect. Additive
  // field only — the wipe path + existing fields are untouched.
  let connections: { text: string; createdByUserId: string; connected: boolean }[] = []
  if (newTopic) {
    const interests = await db.topicInterest.findMany({
      where: { teamId: ctx.teamId },
      orderBy: { createdAt: 'asc' },
      select: { text: true, createdByUserId: true },
    })
    connections = matchInterests(newTopic, interests)
  }

  return NextResponse.json({
    topic: newTopic || null,
    removedCount,
    removedTitles,
    topicBonusKp,
    connections,
  })
}
