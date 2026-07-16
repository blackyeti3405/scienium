import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson, cuid } from '@/lib/validation'
import { db } from '@/lib/db'
import { extractTerms, type ExtractedTerm } from '@/lib/literature/vocab'
import type { VocabSource } from '@prisma/client'

export const maxDuration = 60

const BuildBody = z.object({ paperId: cuid.optional() }).strict()

// Deck size cap — enforced at insert time so a student's deck stays a deck,
// not an unbounded accumulation across every source they upload.
const VOCAB_MAX_DECK = 200

/**
 * POST /api/literature/vocab/build — extracts vocabulary terms from the
 * caller's own team papers and adds them to the CALLING STUDENT's deck.
 * `'upload'` tier (8/min): this reads up to 25 `fullText`s and runs O(n)
 * extraction over them — the repo's heavy-local-compute tier, not `'mutate'`
 * (which would let a client burn CPU repeatedly). No paid API call is made,
 * so `'ai'` would be the wrong tier — this route has ZERO Anthropic
 * dependency, matching the rest of the vocabulary builder feature.
 */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'upload', feature: 'literature' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, BuildBody)
  if (bodyError) return bodyError

  // Team-scoped load — a paperId belonging to another team simply matches
  // nothing (the IDOR guard: this route can never build from another
  // team's papers).
  const papers = await db.paper.findMany({
    where: {
      teamId: ctx.teamId,
      status: 'ready',
      ...(data.paperId ? { id: data.paperId } : {}),
    },
    select: { id: true, title: true, abstract: true, fullText: true },
  })

  if (data.paperId && papers.length === 0) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 })
  }

  // Extract per paper, then merge across papers on termKey — first paper
  // wins the attribution for a term that recurs across multiple sources.
  const merged = new Map<string, ExtractedTerm & { paperId: string }>()
  for (const paper of papers) {
    const terms = extractTerms({ title: paper.title, abstract: paper.abstract, fullText: paper.fullText })
    for (const term of terms) {
      if (!merged.has(term.termKey)) {
        merged.set(term.termKey, { ...term, paperId: paper.id })
      }
    }
  }

  if (merged.size === 0) {
    const total = await db.vocabCard.count({ where: { userId: ctx.dbUserId } })
    return NextResponse.json({ created: 0, skipped: 0, total })
  }

  const existingCount = await db.vocabCard.count({ where: { userId: ctx.dbUserId } })
  const remainingCapacity = Math.max(0, VOCAB_MAX_DECK - existingCount)
  const candidates = Array.from(merged.values()).slice(0, remainingCapacity)

  if (candidates.length === 0) {
    const total = await db.vocabCard.count({ where: { userId: ctx.dbUserId } })
    return NextResponse.json({ created: 0, skipped: merged.size, total })
  }

  const now = new Date()
  const result = await db.vocabCard.createMany({
    data: candidates.map((c) => ({
      userId: ctx.dbUserId,
      teamId: ctx.teamId,
      paperId: c.paperId,
      termKey: c.termKey,
      term: c.term,
      aliases: c.aliases,
      definition: c.definition,
      source: c.source as VocabSource,
      sourceEntryId: c.sourceEntryId,
      quote: c.quote,
      box: 1,
      dueAt: now, // immediately due — first exposure
    })),
    skipDuplicates: true, // @@unique([userId, termKey]) makes this idempotent
  })

  const total = await db.vocabCard.count({ where: { userId: ctx.dbUserId } })

  return NextResponse.json({
    created: result.count,
    skipped: merged.size - result.count,
    total,
  })
}
