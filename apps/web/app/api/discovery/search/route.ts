import { NextRequest, NextResponse } from 'next/server'
import { requireUserContext } from '@/lib/api/route-context'

// Must match Wikimedia's User-Agent policy (descriptive UA + contact) to avoid
// throttling / IP blocks that would also break article loading.
const UA =
  'scienium/1.0 (https://scienium.app; contact: hello@scienium.app) node-fetch'

export async function GET(req: NextRequest) {
  // Rate-limited per-user so this Wikipedia proxy can't be a free amplification hop.
  const { error } = await requireUserContext(req, { tier: 'read' })
  if (error) return error

  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 2) return NextResponse.json([])

  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('action', 'opensearch')
  url.searchParams.set('search', q)
  url.searchParams.set('limit', '8')
  url.searchParams.set('format', 'json')

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      next: { revalidate: 300 }, // cache identical queries for 5 min
      // Bounded wait — suggestions are cosmetic; the catch falls back to [].
      signal: AbortSignal.timeout(5_000),
    })
    if (!res.ok) return NextResponse.json([])
    const data = (await res.json()) as [string, string[]]
    return NextResponse.json(data[1] ?? [])
  } catch {
    return NextResponse.json([])
  }
}
