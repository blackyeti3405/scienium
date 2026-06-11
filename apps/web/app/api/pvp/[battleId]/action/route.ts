import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { battleId: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // TODO: resolve one turn — validate action, run combat math, return BattleTurnResult
  return NextResponse.json({ message: 'not implemented' }, { status: 501 })
}
