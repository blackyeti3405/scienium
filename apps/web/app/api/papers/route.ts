import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { requireTeamContext } from '@/lib/api/route-context'
import { db } from '@/lib/db'
import { extractText, getDocumentProxy } from 'unpdf'
import { putObject, paperPdfKey } from '@/lib/storage'
import { checkPaperRelevance } from '@/lib/literature/relevance'
import { logActivity } from '@/lib/activity/log'
import { extractDoi, tierFromDoi } from '@/lib/discovery/credibility'
import { Prisma, type CredibilityTier } from '@prisma/client'
import { processPaperJob } from '@/lib/literature/process-paper'

// Server-side only; the Anthropic key is never bundled for the browser.

// Hard ceiling on an uploaded PDF. The bytes are buffered in memory, stored to
// R2, and (as text) sent to Claude, so an unbounded upload is a memory + cost
// DoS. 20 MB comfortably covers real papers.
const MAX_PDF_BYTES = 20 * 1024 * 1024

// Ingestion is awaited before the response (see below), and the metadata
// extraction includes a paid LLM call — give the function room to finish.
export const maxDuration = 60

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

  // Derive list-view metadata once, here, so the paper list never has to read
  // full text to show a DOI / credibility badge.
  const doi = extractDoi(fullText)
  const credibilityTier: CredibilityTier | null = doi ? tierFromDoi(doi) : null

  let paper
  try {
    paper = await db.paper.create({
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
        doi,
        credibilityTier,
      },
    })
  } catch (err) {
    // A concurrent upload of the same PDF that won the race is now committed; the
    // unique (teamId, contentHash) index rejects this one. Return the same 409 as
    // the pre-check above rather than a 500.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json(
        { error: 'This paper is already in your literature review.' },
        { status: 409 },
      )
    }
    throw err
  }

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
  await db.$transaction([
    db.paper.update({ where: { id: paper.id }, data: { pdfKey, fileUrl } }),
    db.paperProcessingJob.create({ data: { paperId: paper.id } }),
  ])

  // Ingest BEFORE responding. On serverless a detached promise is frozen the
  // moment the response flushes, which left papers stuck in `processing` until
  // the cron sweep picked them up (BLK-1). processPaperJob owns its claim +
  // retry bookkeeping and never throws, so awaiting it is just latency — and
  // the paper comes back ready-to-read in the same request.
  await processPaperJob(paper.id)
  await logActivity(ctx.teamId, ctx.dbUserId, 'paper_upload', { title }).catch(console.error)

  // Re-read the fields ingestion just filled so the client shows the real
  // title/status without waiting for its first poll.
  const processed = await db.paper.findUnique({
    where: { id: paper.id },
    select: { title: true, authors: true, status: true },
  })

  return NextResponse.json({
    id: paper.id,
    title: processed?.title ?? paper.title,
    authors: processed?.authors ?? paper.authors,
    status: processed?.status ?? paper.status,
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
      // F12 credibility badge — read from the metadata persisted at upload; NO
      // longer parsed from `fullText` here, so the list stays metadata-only and
      // fast as the library grows.
      doi: true,
      credibilityTier: true,
      promotedFromNode: { select: { externalSource: { select: { credibilityTier: true } } } },
    },
  })

  return NextResponse.json({
    papers: papers.map(
      ({ proficiencies, doi, credibilityTier: storedTier, promotedFromNode, ...p }) => {
        // A promoted Discovery source carries an authoritative server-derived tier
        // from its resolved host; otherwise use the tier computed at upload. `text`
        // sources (and PDFs with no DOI) fall through to null — resolved client-side
        // to the "self-uploaded — verify yourself" meta.
        const credibilityTier: CredibilityTier | null =
          promotedFromNode?.externalSource?.credibilityTier ?? storedTier ?? null

        return {
          ...p,
          proficiencyDemonstrated: proficiencies[0]?.demonstrated ?? false,
          credibilityTier,
          ...(doi ? { doi } : {}),
        }
      },
    ),
  })
}
