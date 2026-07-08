import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { requireTeamContext } from '@/lib/api/route-context'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'
import { extractText, getDocumentProxy } from 'unpdf'
import { putObject, paperPdfKey } from '@/lib/storage'
import { checkPaperRelevance } from '@/lib/literature/relevance'
import { logActivity } from '@/lib/activity/log'
import { extractDoi, tierFromDoi } from '@/lib/discovery/credibility'
import type { CredibilityTier } from '@prisma/client'

// Server-side only; the Anthropic key is never bundled for the browser.
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Hard ceiling on an uploaded PDF. The bytes are buffered in memory, stored to
// R2, and (as text) sent to Claude, so an unbounded upload is a memory + cost
// DoS. 20 MB comfortably covers real papers.
const MAX_PDF_BYTES = 20 * 1024 * 1024

export async function POST(req: NextRequest) {
  // Strict per-user + per-IP limit: each upload triggers parsing, storage, and a
  // paid Claude metadata call.
  const { ctx, error } = await requireTeamContext(req, { tier: 'upload' })
  if (error) return error

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'A PDF file is required' }, { status: 400 })
  }
  // `file.type` is client-supplied, so enforce a real size cap up front and
  // verify the PDF magic bytes below — don't trust the declared MIME alone.
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: `PDF is too large (max ${Math.round(MAX_PDF_BYTES / 1024 / 1024)} MB)` },
      { status: 413 },
    )
  }

  // Keep the raw bytes to upload to R2; extract text for the LLM.
  const buffer = Buffer.from(await file.arrayBuffer())
  // Defense in depth: a genuine PDF starts with "%PDF-". Rejects a non-PDF that
  // lied about its MIME type before we hand it to the parser / store it.
  if (buffer.length < 5 || buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    return NextResponse.json({ error: 'That file is not a valid PDF' }, { status: 400 })
  }
  // Stable content fingerprint: SHA-256 of the raw PDF bytes.
  // Used to reject duplicate uploads before any expensive processing.
  const contentHash = createHash('sha256').update(buffer).digest('hex')

  const duplicate = await db.paper.findFirst({
    where: { teamId: ctx.teamId, contentHash },
    select: { id: true, title: true },
  })
  if (duplicate) {
    return NextResponse.json(
      { error: `This paper is already in your literature review ("${duplicate.title ?? 'untitled'}").` },
      { status: 409 },
    )
  }

  let fullText = ''
  let title = file.name.replace(/\.pdf$/i, '')
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const { text } = await extractText(pdf, { mergePages: true })
    fullText = (text ?? '').trim()

    const firstLine = fullText.split('\n').map((l) => l.trim()).find(Boolean)
    if (firstLine && firstLine.length < 200) title = firstLine
  } catch (err) {
    // Log internally; return a generic message (no raw parser error to client).
    console.error('[unpdf] extraction error:', err)
    return NextResponse.json({ error: 'Could not read PDF text' }, { status: 422 })
  }

  if (!fullText) {
    return NextResponse.json(
      { error: 'No extractable text found (the PDF may be a scanned image)' },
      { status: 422 },
    )
  }

  // Relevance gate: if the team has committed to a final topic, the paper must
  // be meaningfully connected. Skipped when no topic is set (still exploring).
  const team = await db.team.findUnique({
    where: { id: ctx.teamId },
    select: { topic: true },
  })
  if (team?.topic) {
    const { relevant, reason } = await checkPaperRelevance(team.topic, title, fullText)
    if (!relevant) {
      return NextResponse.json(
        {
          error: `This paper doesn't appear relevant to your research topic "${team.topic}". ${reason} Upload a source that connects to your research.`,
          code: 'IRRELEVANT',
        },
        { status: 422 },
      )
    }
  }

  const paper = await db.paper.create({
    data: {
      teamId: ctx.teamId,
      title,
      authors: [],
      abstract: null,
      sourceType: 'pdf',
      status: 'processing',
      uploadedByUserId: ctx.dbUserId,
      fullText,
      contentHash,
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
  logActivity(ctx.teamId, ctx.dbUserId, 'paper_upload', { title }).catch(console.error)

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
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

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
      proficiencies: { where: { userId: ctx.dbUserId }, select: { demonstrated: true } },
      // F12 credibility badge — resolved below, at read time, from whichever
      // signal the paper actually has. `fullText` is only read to derive the
      // tier server-side and is stripped before the response is built (never
      // sent to the client).
      sourceType: true,
      fullText: true,
      promotedFromNode: { select: { externalSource: { select: { credibilityTier: true } } } },
    },
  })

  return NextResponse.json({
    papers: papers.map(({ proficiencies, sourceType, fullText, promotedFromNode, ...p }) => {
      let credibilityTier: CredibilityTier | null = null
      let doi: string | null = null

      const promotedTier = promotedFromNode?.externalSource?.credibilityTier
      if (promotedTier) {
        // Authoritative — a promoted Discovery source already carries a
        // server-derived tier from its resolved host. Reuse it, never re-derive.
        credibilityTier = promotedTier
      } else if (sourceType === 'pdf' && fullText) {
        doi = extractDoi(fullText)
        credibilityTier = doi ? tierFromDoi(doi) : null
      }
      // `text` sources (and PDFs with no DOI) fall through to `null` —
      // resolved client-side to the "self-uploaded — verify yourself" meta.

      return {
        ...p,
        proficiencyDemonstrated: proficiencies[0]?.demonstrated ?? false,
        credibilityTier,
        ...(doi ? { doi } : {}),
      }
    }),
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
