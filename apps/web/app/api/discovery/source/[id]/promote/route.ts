import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { enforceRateLimit } from '@/lib/rate-limit'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { checkPaperRelevance } from '@/lib/literature/relevance'
import { buildCitations, parseYear } from '@/lib/literature/citation'
import { lockAggregate } from '@/lib/db-lock'
import { recordActivity } from '@/lib/activity/log'

// ── POST /api/discovery/source/[id]/promote (#13 Citation Manager) ────────────
// Promote a starred Discovery `source` node into a real team Paper. External
// metadata is authoritative → Paper.status 'ready', NO Claude extraction. The
// ONLY AI touch is the EXISTING checkPaperRelevance topic gate (same gate uploads
// already pass) and only when a final Team.topic is set — never a new AI path.

const PromoteBody = z
  .object({ reflection: z.string().trim().max(500).optional() })
  .strict()

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, PromoteBody)
  if (bodyError) return bodyError
  const reflection = (data.reflection ?? '').trim()

  // IDOR-safe: the node must belong to the caller's team. 404 on miss so we never
  // leak another team's node.
  const node = await db.discoveryNode.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    include: { externalSource: true },
  })
  if (!node) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (node.sourceType !== 'source' || !node.externalSource) {
    return NextResponse.json({ error: 'Only source nodes can be promoted.' }, { status: 400 })
  }
  // Idempotency guard: already promoted → return the existing paperId, no dupe.
  if (node.paperId) {
    return NextResponse.json({ error: 'Already promoted.', paperId: node.paperId }, { status: 409 })
  }

  const es = node.externalSource

  // Relevance gate — REUSE the existing topic gate ONLY (mirrors papers/route.ts).
  // Runs only when a final topic is set; skipped while still exploring.
  const team = await db.team.findUnique({
    where: { id: ctx.teamId },
    select: { topic: true },
  })
  if (team?.topic) {
    // Anthropic-backed gate → must clear the paid `ai` tier (fail-closed in
    // production), not just the route's `mutate` tier.
    const aiLimited = await enforceRateLimit(req, 'ai', ctx.userId)
    if (aiLimited) return aiLimited

    const { relevant, reason } = await checkPaperRelevance(
      team.topic,
      es.sourceTitle,
      es.abstract ?? es.sourceTitle,
    )
    if (!relevant) {
      return NextResponse.json(
        {
          error: `This source doesn't appear relevant to your research topic "${team.topic}". ${reason} Promote a source that connects to your research.`,
          code: 'IRRELEVANT',
        },
        { status: 422 },
      )
    }
  }

  const citationInput = {
    title: es.sourceTitle,
    authors: es.sourceAuthors,
    year: parseYear(es.publishedAt),
    url: es.sourceUrl,
  }
  const built = buildCitations(citationInput)

  // One transaction: create the Paper (status 'ready' — metadata authoritative,
  // no extractor), wire the reserved paperId column, cache the Citation, and (if
  // provided) persist the student's own words as the relevance note.
  //
  // The early `node.paperId` check above is an unlocked read, and the paid
  // relevance call between it and here widens the race window to seconds — a
  // double-click could mint two Papers (and duplicate quiz KP) from one node
  // (BLK-2). Serialize on the node and RE-READ paperId inside the tx; the loser
  // returns the winner's paper instead of creating a second one.
  const promoted = await db.$transaction(async (tx) => {
    await lockAggregate(tx, `discovery-promote:${node.id}`)

    const current = await tx.discoveryNode.findUnique({
      where: { id: node.id },
      select: { paperId: true },
    })
    if (current?.paperId) return { paperId: current.paperId, existing: true as const }

    const paper = await tx.paper.create({
      data: {
        teamId: ctx.teamId,
        title: es.sourceTitle,
        authors: es.sourceAuthors,
        abstract: es.abstract ?? null,
        sourceType: 'external',
        status: 'ready',
        uploadedByUserId: ctx.dbUserId,
        fileUrl: es.sourceUrl,
      },
      select: { id: true },
    })

    await tx.discoveryNode.update({
      where: { id: node.id },
      data: { paperId: paper.id },
    })

    await tx.citation.create({
      data: {
        paperId: paper.id,
        teamId: ctx.teamId,
        year: built.year,
        apa: built.apa,
        mla: built.mla,
        ieee: built.ieee,
      },
    })

    if (reflection) {
      await tx.paperRelevanceNote.create({
        data: { paperId: paper.id, userId: ctx.dbUserId, response: reflection },
      })
    }

    // Durable (REFACTOR2 P1-R5): the record and the promotion it describes
    // commit together, so a crash between them can't leave a Paper with no
    // teacher-visible evidence it was promoted.
    await recordActivity(tx, ctx.teamId, ctx.dbUserId, 'source_promoted', {
      title: es.sourceTitle,
      paperId: paper.id,
    })

    return { paperId: paper.id, existing: false as const }
  })

  if (promoted.existing) {
    return NextResponse.json(
      { error: 'Already promoted.', paperId: promoted.paperId },
      { status: 409 },
    )
  }
  const paperId = promoted.paperId

  return NextResponse.json(
    {
      paperId,
      title: es.sourceTitle,
      authors: es.sourceAuthors,
      citation: { apa: built.apa, mla: built.mla, ieee: built.ieee },
    },
    { status: 201 },
  )
}
