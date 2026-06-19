import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/rate-limit'

// Must match Wikimedia's User-Agent policy (descriptive UA + contact) to avoid
// throttling / IP blocks that would also break article loading.
const UA =
  'NOVALab/1.0 (https://nova-lab.app; contact: hello@nova-lab.app) node-fetch'

export async function GET(req: NextRequest) {
  // Auth-gated by middleware; resolve the user so this Wikipedia proxy is limited
  // per-user (not just per shared-NAT IP) and can't be a free amplification hop.
  const { userId } = await auth()
  const limited = enforceRateLimit(req, 'read', userId)
  if (limited) return limited

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
    })
    if (!res.ok) return NextResponse.json([])
    const data = (await res.json()) as [string, string[]]
    return NextResponse.json(data[1] ?? [])
  } catch {
    return NextResponse.json([])
  }
}
