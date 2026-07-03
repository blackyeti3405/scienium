import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { checkPaperRelevance } from '@/lib/literature/relevance'
import { buildCitations, parseYear } from '@/lib/literature/citation'
import { logActivity } from '@/lib/activity/log'

// ── POST /api/discovery/source/[id]/promote (#13 Citation Manager) ────────────
// Promote a starred Discovery `source` node into a real team Paper. External
// metadata is authoritative → Paper.status 'ready', NO Claude extraction. The
// ONLY AI touch is the EXISTING checkPaperRelevance topic gate (same gate uploads
// already pass) and only when a final Team.topic is set — never a new AI path.

const PromoteBody = z
  .object({ reflection: z.string().trim().max(500).optional() })
  .strict()

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
  const paperId = await db.$transaction(async (tx) => {
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

    return paper.id
  })

  logActivity(ctx.teamId, ctx.dbUserId, 'source_promoted', {
    title: es.sourceTitle,
    paperId,
  }).catch(console.error)

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
