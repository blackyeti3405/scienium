import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { db } from '@/lib/db'
import { type CredibilityTier } from '@prisma/client'
import { uploadPaper } from '@/lib/papers/service'

// Ingestion is awaited before the response, and the metadata extraction includes
// a paid LLM call — give the function room to finish.
export const maxDuration = 60

/**
 * Transport adapter only (REFACTOR2 §2.1): select the policy, pull the file off
 * the multipart body, call one use case, map its typed result to HTTP. The upload
 * workflow itself lives in `lib/papers/service.ts`.
 */
export async function POST(req: NextRequest) {
  // Strict per-user + per-IP limit: each upload triggers parsing, storage, and a
  // paid Claude metadata call.
  const { ctx, error } = await requireTeamContext(req, { tier: 'upload' })
  if (error) return error

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'A PDF file is required' }, { status: 400 })
  }

  const result = await uploadPaper({ teamId: ctx.teamId, dbUserId: ctx.dbUserId, file })
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.code ? { code: result.code } : {}) },
      { status: result.status },
    )
  }

  return NextResponse.json(result.paper)
}

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const papers = await db.paper.findMany({
    where: { teamId: ctx.teamId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      title: true,
      authors: true,
      abstract: true,
      status: true,
      createdAt: true,
      fileUrl: true,
      // Proficiency is per-student now: surface only THIS user's demonstration.
      proficiencies: { where: { userId: ctx.dbUserId }, select: { demonstrated: true } },
      // F12 credibility badge — read from the metadata persisted at upload; NO
      // longer parsed from `fullText` here, so the list stays metadata-only and
      // fast as the library grows.
      doi: true,
      credibilityTier: true,
      promotedFromNode: { select: { externalSource: { select: { credibilityTier: true } } } },
    },
  })

  return NextResponse.json({
    papers: papers.map(
      ({ proficiencies, doi, credibilityTier: storedTier, promotedFromNode, ...p }) => {
        // A promoted Discovery source carries an authoritative server-derived tier
        // from its resolved host; otherwise use the tier computed at upload. `text`
        // sources (and PDFs with no DOI) fall through to null — resolved client-side
        // to the "self-uploaded — verify yourself" meta.
        const credibilityTier: CredibilityTier | null =
          promotedFromNode?.externalSource?.credibilityTier ?? storedTier ?? null

        return {
          ...p,
          proficiencyDemonstrated: proficiencies[0]?.demonstrated ?? false,
          credibilityTier,
          ...(doi ? { doi } : {}),
        }
      },
    ),
  })
}
