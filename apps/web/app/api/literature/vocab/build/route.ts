import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson, cuid } from '@/lib/validation'
import { db } from '@/lib/db'
import { lockAggregate } from '@/lib/db-lock'
import { extractCandidates, VOCAB_TEXT_SLICE_CHARS } from '@/lib/literature/vocab'
import { curateTerms, type CuratedTerm } from '@/lib/literature/vocab-curate'
import type { VocabSource } from '@prisma/client'

// One curation call per paper, and a build may cover several papers. Adaptive
// thinking on a 40-candidate list is not fast — give the function room.
export const maxDuration = 120

const BuildBody = z.object({ paperId: cuid.optional() }).strict()

// Deck size cap, PER STUDENT PER LAB — enforced at insert time (under the
// deck's advisory lock) so a student's deck stays a deck, not an unbounded
// accumulation across every source they upload.
const VOCAB_MAX_DECK = 200

// Paid-call bound per build request: papers have no hard per-team cap, so an
// uncapped all-papers build would be an unbounded Anthropic loop behind one
// `ai`-tier tick. Uncurated papers are picked up by the next build run (curated
// papers are skipped for free), so a bounded pass still converges.
const MAX_CURATIONS_PER_BUILD = 8

/**
 * POST /api/literature/vocab/build — extracts vocabulary terms from the
 * caller's own team papers and adds them to the CALLING STUDENT's deck.
 *
 * `'ai'` tier: each paper costs ONE Anthropic call (see `vocab-curate.ts`).
 * This was `'upload'` when the pipeline was mechanical and free; a paid call
 * per paper makes `'ai'` the honest tier.
 *
 * Papers already fully represented in the deck are skipped BEFORE curation, so
 * re-running the builder is free — the per-paper spend happens once, ever.
 */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'ai', feature: 'literature' })
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

  // Terms the student already has, plus the once-ever curation markers.
  // Curation deliberately rejects trivial candidates, so "all candidates
  // already carded" is never true for a curated paper — the marker row (not
  // the cards) is what proves this student already paid this paper's curation
  // call, keeping re-builds free AND deterministic.
  //
  // Scoped to (user, TEAM) — REFACTOR2 P2-S4. The deck's uniqueness used to be
  // global per student while every other vocabulary surface (deck, review,
  // delete) was team-scoped, so a student in a second lab was filtered against
  // a deck they could not see: the term was skipped as "already known" and
  // never appeared anywhere.
  const [existing, curationMarkers] = await Promise.all([
    db.vocabCard.findMany({
      where: { userId: ctx.dbUserId, teamId: ctx.teamId },
      select: { termKey: true },
    }),
    db.vocabPaperCuration.findMany({
      where: { userId: ctx.dbUserId, paperId: { in: papers.map((p) => p.id) } },
      select: { paperId: true },
    }),
  ])
  const existingKeys = new Set(existing.map((c) => c.termKey))
  const alreadyCurated = new Set(curationMarkers.map((m) => m.paperId))

  // No headroom → skip straight to the "deck is full" response without paying
  // for curation that could never be inserted.
  const capacityBeforeBuild = Math.max(0, VOCAB_MAX_DECK - existingKeys.size)

  // Extract → curate per paper, then merge across papers on termKey — first
  // paper wins the attribution for a term that recurs across multiple sources.
  const merged = new Map<string, CuratedTerm & { paperId: string }>()
  const newlyCurated: string[] = []
  let curations = 0
  for (const paper of papers) {
    if (curations >= MAX_CURATIONS_PER_BUILD || merged.size >= capacityBeforeBuild) break
    if (alreadyCurated.has(paper.id)) continue // curation already paid for — once, ever
    const candidates = extractCandidates({
      title: paper.title,
      abstract: paper.abstract,
      fullText: paper.fullText,
    }).filter((c) => !existingKeys.has(c.termKey) && !merged.has(c.termKey))
    if (candidates.length === 0) continue

    let curated: CuratedTerm[]
    try {
      curations++
      curated = await curateTerms({
        paperTitle: paper.title,
        excerpt: (paper.fullText ?? paper.abstract ?? '').slice(0, VOCAB_TEXT_SLICE_CHARS),
        candidates,
      })
    } catch (err) {
      // An uncurated deck is the trivial-word deck curation exists to prevent,
      // so fail loudly rather than falling back to raw candidates.
      console.error('[vocab-curate] failed for paper', paper.id, err)
      return NextResponse.json(
        { error: 'Couldn’t build your deck just now — try again in a moment.' },
        { status: 503 },
      )
    }

    // Mark the paper only when curation returned terms: an empty result is
    // ambiguous (a truncated/unparseable response also yields []), so leaving
    // it unmarked lets the next build retry rather than permanently losing the
    // paper's vocabulary to one bad response.
    if (curated.length > 0) newlyCurated.push(paper.id)

    for (const term of curated) {
      if (!merged.has(term.termKey)) merged.set(term.termKey, { ...term, paperId: paper.id })
    }
  }

  if (merged.size === 0) {
    const total = await db.vocabCard.count({ where: { userId: ctx.dbUserId, teamId: ctx.teamId } })
    return NextResponse.json({ created: 0, skipped: 0, total })
  }

  const now = new Date()
  const candidates = Array.from(merged.values())

  // Capacity is re-read INSIDE the lock (REFACTOR2 P2-S1). `capacityBeforeBuild`
  // was measured before the paid curation above, and a transaction must never
  // be held across a network call — so the deck can have filled since. Cards +
  // curation markers land together: the marker is what makes the per-paper
  // curation spend once-ever, so it must not persist without its cards (or
  // vice versa).
  const result = await db.$transaction(async (tx) => {
    await lockAggregate(tx, `vocab-deck:${ctx.dbUserId}:${ctx.teamId}`)
    const held = await tx.vocabCard.count({ where: { userId: ctx.dbUserId, teamId: ctx.teamId } })
    const kept = candidates.slice(0, Math.max(0, VOCAB_MAX_DECK - held))
    const keptKeys = new Set(kept.map((c) => c.termKey))

    // A paper is marked curated ONLY when every term it contributed was
    // stored (P2-S4). The marker makes curation once-ever, so marking a paper
    // whose terms were dropped at capacity suppressed those terms
    // permanently — freeing room later could never bring them back.
    const droppedPapers = new Set(
      candidates.filter((c) => !keptKeys.has(c.termKey)).map((c) => c.paperId),
    )
    const markable = newlyCurated.filter((paperId) => !droppedPapers.has(paperId))

    const created = kept.length
      ? await tx.vocabCard.createMany({
          data: kept.map((c) => ({
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
          skipDuplicates: true, // @@unique([userId, teamId, termKey]) makes this idempotent
        })
      : { count: 0 }

    if (markable.length > 0) {
      await tx.vocabPaperCuration.createMany({
        data: markable.map((paperId) => ({ userId: ctx.dbUserId, paperId })),
        skipDuplicates: true, // @@unique([userId, paperId])
      })
    }

    return { created: created.count, total: held + created.count }
  })

  return NextResponse.json({
    created: result.created,
    skipped: merged.size - result.created,
    total: result.total,
  })
}
