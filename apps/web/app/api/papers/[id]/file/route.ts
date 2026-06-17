import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTeamContext } from '@/lib/phase'
import { db } from '@/lib/db'

// Streams the stored PDF inline so the in-panel <iframe> can render it.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const paper = await db.paper.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    select: { pdfData: true, title: true },
  })

  if (!paper?.pdfData) {
    return NextResponse.json({ error: 'PDF not available' }, { status: 404 })
  }

  const bytes = paper.pdfData as Buffer
  const safeName = paper.title.replace(/[^\w.-]+/g, '_').slice(0, 80) || 'paper'

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${safeName}.pdf"`,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
