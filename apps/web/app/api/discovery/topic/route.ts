import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { enforceRateLimit } from '@/lib/rate-limit'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { applyTopicLock } from '@/lib/team/progression'
import { consumeDestructive, proposeDestructive } from '@/lib/api/destructive-proposal'
import { orphanObjectKey } from '@/lib/uploads/assets'
import { batchCheckRelevance } from '@/lib/literature/relevance'
import { logActivityBestEffort, recordActivity } from '@/lib/activity/log'
import { TOPIC_LOCK_KP } from '@/lib/discovery/economy'
import { matchInterests } from '@/lib/discovery/interest-match'

// An empty/absent topic clears it; cap the length otherwise.
// `confirmWipe: true` signals the client has seen the confirmation and
// wants the topic change to proceed (triggering irrelevant-paper removal).
// `confirmRemoveIds` carries the EXACT paper ids the student saw listed and
// approved. It is what makes the removal safe: the relevance model proposes, the
// student disposes. Without it the model's verdict alone could delete a paper —
// and that verdict is computed from paper text we do not control, so a hostile
// abstract could forge the scaffolding and vote a sibling paper off the island.
const TopicBody = z
  .object({
    topic: z.string().max(300).optional(),
    confirmWipe: z.boolean().optional(),
    confirmRemoveIds: z.array(z.string().trim().min(1).max(64)).max(200).optional(),
    /**
     * The single-use token the server issued alongside its removal proposal
     * (REFACTOR2 P1-R1). Without it, `confirmRemoveIds` is just a caller-supplied
     * list of papers to delete.
     */
    proposalToken: z.string().trim().min(1).max(64).optional(),
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
//   - With `confirmWipe: true`: runs a batch relevance check and returns 409
//     { requiresRemovalConfirmation: true, papers: [{id,title}] } — the papers it
//     PROPOSES removing. Nothing is deleted yet.
//   - With `confirmRemoveIds: [...]` AND the matching `proposalToken`: deletes
//     exactly those papers (team-scoped, no model call) and sets the topic.
//
// The token is what makes phase 2 real (REFACTOR2 P1-R1). `confirmRemoveIds`
// alone was a caller-supplied delete list: a direct request could skip both
// phases and remove any ready paper ids it knew, because the confirmation lived
// in the UI dialog rather than on the server. The server now records exactly
// what it proposed and executes only that.
export async function POST(req: NextRequest) {
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'mutate' })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, TopicBody)
  if (error) return error
  const newTopic = (data.topic ?? '').trim()
  const confirmWipe = data.confirmWipe ?? false
  const confirmRemoveIds = data.confirmRemoveIds?.length ? data.confirmRemoveIds : null

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

  // Phase 2 — the student has seen the proposed list and approved specific ids.
  // No model call here: we delete exactly what was approved, scoped to the team.
  // Taking the model out of the destructive step is the whole point; it also
  // avoids paying for a second relevance pass.
  if (topicIsChanging && confirmRemoveIds) {
    // The server's own proposal is the authorization. A missing, expired,
    // replayed, foreign, or payload-mismatched token all fail identically.
    const consumed = data.proposalToken
      ? await consumeDestructive({
          token: data.proposalToken,
          teamId: ctx.teamId,
          actorUserId: ctx.dbUserId,
          command: 'topic_paper_removal',
          targetIds: confirmRemoveIds,
          context: [oldTopic, newTopic],
        })
      : ({ ok: false, reason: 'invalid' } as const)
    if (!consumed.ok) {
      return NextResponse.json(
        {
          error:
            'That removal confirmation is no longer valid. Reload and change the topic again.',
        },
        { status: 409 },
      )
    }

    const approved = await db.paper.findMany({
      where: { id: { in: confirmRemoveIds }, teamId: ctx.teamId, status: 'ready' },
      select: { id: true, title: true, pdfKey: true },
    })
    if (approved.length > 0) {
      // Domain delete AND ledger retirement in ONE transaction (P1-S8), and
      // through the ledger rather than a direct `deleteObject` (P1-R12): the
      // reclaim sweep is the single physical-delete site, so a failed R2 call
      // is retried by the sweep instead of silently leaking the object. This
      // path previously deleted rows, then best-effort-deleted bytes outside
      // any transaction — a crash between them stranded both.
      await db.$transaction(async (tx) => {
        await tx.paper.deleteMany({
          where: { id: { in: approved.map((p) => p.id) }, teamId: ctx.teamId },
        })
        for (const p of approved) {
          if (!p.pdfKey) continue
          await orphanObjectKey(
            {
              teamId: ctx.teamId,
              userId: ctx.dbUserId,
              objectKey: p.pdfKey,
              contentType: 'application/pdf',
              purpose: 'paper_pdf',
            },
            tx,
          )
        }
      })
      removedCount = approved.length
      removedTitles.push(...approved.map((p) => p.title))
    }
  } else if (topicIsChanging && confirmWipe && newTopic) {
    // Phase 1 — propose. Run the relevance check and return what WOULD be removed;
    // delete nothing yet.
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

      const proposed = papers.filter((p) => !relevanceMap.get(p.id))
      if (proposed.length > 0) {
        // Record WHAT was proposed, bound to this actor/team/topic-change, and
        // hand back a single-use token. Phase 2 can then only delete this set.
        const proposalToken = await proposeDestructive({
          teamId: ctx.teamId,
          actorUserId: ctx.dbUserId,
          command: 'topic_paper_removal',
          targetIds: proposed.map((p) => p.id),
          context: [oldTopic, newTopic],
        })
        return NextResponse.json(
          {
            requiresRemovalConfirmation: true,
            proposalToken,
            papers: proposed.map((p) => ({ id: p.id, title: p.title })),
            oldTopic,
            newTopic,
          },
          { status: 409 },
        )
      }
    }
  }

  await db.team.update({
    where: { id: ctx.teamId },
    data: { topic: newTopic || null },
  })

  logActivityBestEffort(ctx.teamId, ctx.dbUserId, 'topic_changed', {
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
        // Durable (REFACTOR2 P1-R5): the once-ever bonus and its record commit
        // together, inside the same guard the P2002 catch below relies on — a
        // duplicate award (caught below) never gets a duplicate record either.
        await recordActivity(tx, ctx.teamId, ctx.dbUserId, 'topic_locked', { kp: TOPIC_LOCK_KP })
      })
      topicBonusKp = TOPIC_LOCK_KP
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

  // Locking a FINAL TOPIC is the first phase transition: it derives the lab's
  // type from the topic (carrying the plot onto the new catalog) and opens the
  // Literature Review and the Battle Arena. A classroom lab gets its type but
  // waits for its teacher to move it. No-ops unless the team is still in
  // `discovery`, so re-editing a topic later costs nothing.
  let progression: Awaited<ReturnType<typeof applyTopicLock>> | null = null
  if (newTopic) {
    try {
      progression = await applyTopicLock(ctx.teamId, ctx.dbUserId, newTopic, ctx.phase)
    } catch (err) {
      // The topic IS saved at this point. A classify hiccup must not fail the
      // write the student just made — they can re-save to retry the unlock.
      console.error('[discovery/topic] topic-lock progression failed:', err)
    }
  }

  return NextResponse.json({
    topic: newTopic || null,
    removedCount,
    removedTitles,
    topicBonusKp,
    connections,
    labType: progression?.labType ?? null,
    phaseAdvanced: progression?.advanced ?? false,
    teacherPaced: progression?.teacherPaced ?? false,
  })
}
