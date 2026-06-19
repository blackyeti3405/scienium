import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'mutate', userId)
  if (limited) return limited

  // TODO: create project_logs row with entry_type = 'failure'; handle Resilience Bonus link
  return NextResponse.json({ message: 'not implemented' }, { status: 501 })
}
