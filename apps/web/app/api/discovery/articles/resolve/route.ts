import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { resolveArticle, FEEDS } from '@/lib/discovery/articles'
import { MEDLINEPLUS_FEED, resolveHealthTopic } from '@/lib/discovery/medlineplus'
import { PATENTS_FEED, resolvePatent } from '@/lib/discovery/patents'

// ── POST /api/discovery/articles/resolve ──────────────────────────────────────
// Resolve a (feed, externalId) pick into a fully-resolved payload the client
// then persists via the tree POST branch. Mutate-tier — team-scoped, precedes
// the team-scoped tree write (matches sources/resolve).
const feedKeys = [...Object.keys(FEEDS), MEDLINEPLUS_FEED.id, PATENTS_FEED.id] as unknown as [
  string,
  ...string[],
]

const ResolveBody = z
  .object({
    externalId: z.string().trim().min(1).max(255),
    feed: z.enum(feedKeys),
  })
  .strict()

export async function POST(req: NextRequest) {
  const { error: guardError } = await requireTeamContext(req, { tier: 'mutate' })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, ResolveBody)
  if (error) return error

  try {
    const resolved =
      data.feed === MEDLINEPLUS_FEED.id
        ? await resolveHealthTopic(data.externalId)
        : data.feed === PATENTS_FEED.id
          ? await resolvePatent(data.externalId)
          : await resolveArticle(data.feed, data.externalId)
    if (!resolved) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }
    return NextResponse.json(resolved)
  } catch (err) {
    console.error('[discovery/articles/resolve] failed:', err)
    return NextResponse.json({ error: 'Failed to resolve article' }, { status: 502 })
  }
}
