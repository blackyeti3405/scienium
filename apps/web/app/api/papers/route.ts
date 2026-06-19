import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTeamContext } from '@/lib/phase'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'
import { extractText, getDocumentProxy } from 'unpdf'
import { putObject, paperPdfKey } from '@/lib/storage'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const dbUser = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'A PDF file is required' }, { status: 400 })
  }

  // Keep the raw bytes to upload to R2; extract text for the LLM.
  const buffer = Buffer.from(await file.arrayBuffer())
  let fullText = ''
  let title = file.name.replace(/\.pdf$/i, '')
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const { text } = await extractText(pdf, { mergePages: true })
    fullText = (text ?? '').trim()

    const firstLine = fullText.split('\n').map((l) => l.trim()).find(Boolean)
    if (firstLine && firstLine.length < 200) title = firstLine
  } catch (err) {
    console.error('[unpdf] extraction error:', err)
    return NextResponse.json({ error: 'Could not read PDF text', detail: String(err) }, { status: 422 })
  }

  if (!fullText) {
    return NextResponse.json(
      { error: 'No extractable text found (the PDF may be a scanned image)' },
      { status: 422 },
    )
  }

  const paper = await db.paper.create({
    data: {
      teamId: ctx.teamId,
      title,
      authors: [],
      abstract: null,
      sourceType: 'pdf',
      status: 'processing',
      uploadedByUserId: dbUser.id,
      fullText,
    },
  })

  // Upload the PDF to R2 under a team/paper-scoped key. If this fails the row is
  // useless (no file to view), so roll it back rather than leave an orphan.
  const pdfKey = paperPdfKey(ctx.teamId, paper.id)
  try {
    await putObject(pdfKey, buffer, 'application/pdf')
  } catch (err) {
    console.error('[r2] PDF upload failed:', err)
    await db.paper.delete({ where: { id: paper.id } })
    return NextResponse.json({ error: 'Could not store the PDF' }, { status: 502 })
  }

  // fileUrl points at our authenticated streaming route (set now that we have the id)
  const fileUrl = `/api/papers/${paper.id}/file`
  await db.paper.update({ where: { id: paper.id }, data: { pdfKey, fileUrl } })

  // Fire-and-forget: extract metadata from the text we already have
  extractMetadata(paper.id, fullText, title).catch(console.error)

  return NextResponse.json({
    id: paper.id,
    title: paper.title,
    authors: paper.authors,
    status: paper.status,
    createdAt: paper.createdAt,
    fileUrl,
  })
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const dbUser = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

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
      proficiencies: { where: { userId: dbUser.id }, select: { demonstrated: true } },
    },
  })

  return NextResponse.json({
    papers: papers.map(({ proficiencies, ...p }) => ({
      ...p,
      proficiencyDemonstrated: proficiencies[0]?.demonstrated ?? false,
    })),
  })
}

// ─── Background: extract metadata from the already-parsed text ───────────────

async function extractMetadata(paperId: string, fullText: string, rawTitle: string) {
  // The first ~6k tokens of a paper contain title/authors/abstract — no need to send more
  const excerpt = fullText.slice(0, 24000)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Extract the title, authors, and a 2–3 sentence abstract from this paper text. Return ONLY valid JSON.\n\n---\n${excerpt}`,
      },
    ],
  })

  try {
    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      await db.paper.update({
        where: { id: paperId },
        data: {
          title: parsed.title ?? rawTitle,
          authors: Array.isArray(parsed.authors) ? parsed.authors : [],
          abstract: parsed.abstract ?? null,
          status: 'ready',
        },
      })
      return
    }
  } catch {
    // fall through to status-only update
  }

  await db.paper.update({ where: { id: paperId }, data: { status: 'ready' } })
}

const EXTRACTION_SYSTEM_PROMPT = `You are a precise academic metadata extractor. Given raw text extracted from a research paper PDF, return a JSON object with exactly these fields:
{
  "title": "Full paper title as it appears in the document",
  "authors": ["Last, First", "Last, First"],
  "abstract": "2-3 sentence summary of the paper's main contribution and findings"
}

Rules:
- Return ONLY the JSON object, no markdown, no explanation
- If you cannot find the title, use a short descriptive phrase based on the content
- If authors are unclear, return an empty array
- Keep the abstract factual and concise`
