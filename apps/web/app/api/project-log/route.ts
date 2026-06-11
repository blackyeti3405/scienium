import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // TODO: create project_logs row with entry_type = 'progress', enqueue AI evaluation
  return NextResponse.json({ message: 'not implemented' }, { status: 501 })
}
