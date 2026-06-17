import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTeamContext } from '@/lib/phase'
import { db } from '@/lib/db'
// pdf-parse ships as CJS; use require so TypeScript doesn't choke on the import shape
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>

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

  // Parse PDF → plain text
  const buffer = Buffer.from(await file.arrayBuffer())
  let markdownContent = ''
  let title = file.name.replace(/\.pdf$/i, '')

  try {
    const parsed = await pdfParse(buffer)
    markdownContent = parsed.text

    // Attempt to extract title from first non-empty lines
    const lines = parsed.text.split('\n').map((l: string) => l.trim()).filter(Boolean)
    if (lines[0] && lines[0].length < 200) title = lines[0]
  } catch {
    return NextResponse.json({ error: 'Could not parse PDF' }, { status: 422 })
  }

  // Create paper row as 'processing'
  // contentHash field used to temporarily store extracted markdown until a dedicated column exists
  const paper = await db.paper.create({
    data: {
      teamId: ctx.teamId,
      title,
      authors: [],
      abstract: null,
      sourceType: 'pdf',
      status: 'processing',
      uploadedByUserId: dbUser.id,
      contentHash: markdownContent.slice(0, 50000),
    },
  })

  // Fire-and-forget async summarization; client polls /api/papers/[id]
  summarizeAndFinalize(paper.id, markdownContent, title).catch(console.error)

  return NextResponse.json({
    id: paper.id,
    title: paper.title,
    authors: paper.authors,
    status: paper.status,
    createdAt: paper.createdAt,
  })
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

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
    },
  })

  return NextResponse.json({ papers })
}

// ─── Background: extract metadata via Claude, then mark ready ────────────────

async function summarizeAndFinalize(paperId: string, markdown: string, rawTitle: string) {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const excerpt = markdown.slice(0, 40000)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
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
    // Fall through to status-only update
  }

  await db.paper.update({
    where: { id: paperId },
    data: { status: 'ready' },
  })
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
