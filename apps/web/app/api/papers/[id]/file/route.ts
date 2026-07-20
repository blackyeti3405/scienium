import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { db } from '@/lib/db'
import { streamStoredPdf } from '@/lib/papers/pdf'

// Streams the stored PDF inline so the in-panel <iframe> can render it. The file
// lives in R2 (private) and is streamed through this authenticated, team-scoped
// route — never via a public or signed URL. Rows uploaded before the R2 migration
// fall back to the legacy in-DB blob.
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const paper = await db.paper.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    select: { pdfKey: true, pdfData: true, title: true },
  })
  if (!paper) {
    return NextResponse.json({ error: 'PDF not available' }, { status: 404 })
  }

  return streamStoredPdf(paper, '[r2] PDF stream failed:')
}
