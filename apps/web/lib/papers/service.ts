import 'server-only'
import { createHash } from 'crypto'
import { extractText, getDocumentProxy } from 'unpdf'
import { Prisma, type CredibilityTier } from '@prisma/client'
import { db } from '@/lib/db'
import { putObject, paperPdfKey } from '@/lib/storage'
import { inspectPdf, sanitizePdfText } from '@/lib/pdf/sanitize'
import { checkPaperRelevance } from '@/lib/literature/relevance'
import { extractDoi, tierFromDoi } from '@/lib/discovery/credibility'
import { checkTeamStorageQuota, recordAttachedAsset } from '@/lib/uploads/assets'
import { processPaperJob } from '@/lib/literature/process-paper'
import { logActivity } from '@/lib/activity/log'

/**
 * Paper-upload application service (REFACTOR2 §2.2, §3.2 E).
 *
 * The upload workflow — validate, fingerprint, parse, gate on relevance, persist,
 * store, ingest — used to live inline in `app/api/papers/route.ts`, mixing transport
 * concerns with multi-step domain logic. It now follows the seam `lib/buildings/
 * service.ts` established: the service owns the workflow and returns a typed result;
 * the route adapter only selects the policy, parses the request, and maps the result
 * to HTTP.
 *
 * Errors cross the boundary as `{ ok: false, error, status }` rather than as thrown
 * exceptions or `NextResponse`s, so the workflow stays testable without a request.
 */

export const MAX_PDF_BYTES = 20 * 1024 * 1024 // 20 MB

export type UploadPaperResult =
  | {
      ok: true
      paper: {
        id: string
        title: string
        authors: string[]
        status: string
        createdAt: Date
        fileUrl: string
      }
    }
  | { ok: false; error: string; status: number; code?: string }

function fail(error: string, status: number, code?: string): UploadPaperResult {
  return { ok: false, error, status, ...(code ? { code } : {}) }
}

/**
 * Validate and ingest one uploaded PDF for a team.
 *
 * Ordered so the cheapest rejections come first and nothing expensive runs for a
 * file that will be refused: size and magic bytes, then the storage quota, then
 * the duplicate fingerprint, then parsing, and only then the paid relevance call.
 */
export async function uploadPaper(input: {
  teamId: string
  dbUserId: string
  file: File
}): Promise<UploadPaperResult> {
  const { teamId, dbUserId, file } = input

  // `file.type` is client-supplied, so treat it as a hint only — the magic-byte
  // check below is what actually decides whether this is a PDF.
  if (file.type !== 'application/pdf') {
    return fail('A PDF file is required', 400)
  }
  if (file.size > MAX_PDF_BYTES) {
    return fail(`PDF is too large (max ${Math.round(MAX_PDF_BYTES / 1024 / 1024)} MB)`, 413)
  }

  const overQuota = await checkTeamStorageQuota(teamId, file.size)
  if (overQuota) {
    return fail(
      `Your team's storage is full (${Math.round(overQuota.quota / (1024 * 1024 * 1024))} GB). Delete some papers and try again.`,
      413,
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  // Defense in depth: a genuine PDF starts with "%PDF-". Rejects a non-PDF that
  // lied about its MIME type before we hand it to the parser / store it.
  if (buffer.length < 5 || buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    return fail('That file is not a valid PDF', 400)
  }

  // Stable content fingerprint: SHA-256 of the raw PDF bytes. Rejects a duplicate
  // upload before any expensive processing.
  const contentHash = createHash('sha256').update(buffer).digest('hex')
  const duplicate = await db.paper.findFirst({
    where: { teamId, contentHash },
    select: { id: true, title: true },
  })
  if (duplicate) {
    return fail(
      `This paper is already in your literature review ("${duplicate.title ?? 'untitled'}").`,
      409,
    )
  }

  const parsed = await parsePdf(buffer, file.name)
  if (!parsed.ok) return parsed
  const { fullText, title } = parsed

  // Relevance gate: if the team has committed to a final topic, the paper must be
  // meaningfully connected. Skipped when no topic is set (still exploring).
  const team = await db.team.findUnique({ where: { id: teamId }, select: { topic: true } })
  if (team?.topic) {
    const { relevant, reason } = await checkPaperRelevance(team.topic, title, fullText)
    if (!relevant) {
      return fail(
        `This paper doesn't appear relevant to your research topic "${team.topic}". ${reason} Upload a source that connects to your research.`,
        422,
        'IRRELEVANT',
      )
    }
  }

  // Derive list-view metadata once, here, so the paper list never has to read full
  // text to show a DOI / credibility badge.
  const doi = extractDoi(fullText)
  const credibilityTier: CredibilityTier | null = doi ? tierFromDoi(doi) : null

  let paper
  try {
    paper = await db.paper.create({
      data: {
        teamId,
        title,
        authors: [],
        abstract: null,
        sourceType: 'pdf',
        status: 'processing',
        uploadedByUserId: dbUserId,
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
      return fail('This paper is already in your literature review.', 409)
    }
    throw err
  }

  // Upload the PDF to R2 under a team/paper-scoped key. If this fails the row is
  // useless (no file to view), so roll it back rather than leave an orphan.
  const pdfKey = paperPdfKey(teamId, paper.id)
  try {
    await putObject(pdfKey, buffer, 'application/pdf')
  } catch (err) {
    console.error('[r2] PDF upload failed:', err)
    await db.paper.delete({ where: { id: paper.id } })
    return fail('Could not store the PDF', 502)
  }

  const fileUrl = `/api/papers/${paper.id}/file`

  // Ledger row so the stored PDF counts toward the team's storage quota. Recorded
  // as `attached` to the paper: its lifecycle is the paper's, so the reclaim sweep
  // (which only touches `temporary`/`orphaned`) must never treat it as abandoned.
  await recordAttachedAsset({
    teamId,
    userId: dbUserId,
    objectKey: pdfKey,
    url: fileUrl,
    contentType: 'application/pdf',
    sizeBytes: buffer.length,
    purpose: 'paper_pdf',
    attachedToType: 'paper',
    attachedToId: paper.id,
  })

  await db.$transaction([
    db.paper.update({ where: { id: paper.id }, data: { pdfKey, fileUrl } }),
    db.paperProcessingJob.create({ data: { paperId: paper.id } }),
  ])

  // Ingest BEFORE responding. On serverless a detached promise is frozen the moment
  // the response flushes, which left papers stuck in `processing` until the cron
  // sweep picked them up (BLK-1). processPaperJob owns its claim + retry bookkeeping
  // and never throws, so awaiting it is just latency — and the paper comes back
  // ready-to-read in the same request.
  await processPaperJob(paper.id)
  await logActivity(teamId, dbUserId, 'paper_upload', { title }).catch(console.error)

  // Re-read the fields ingestion just filled so the client shows the real
  // title/status without waiting for its first poll.
  const processed = await db.paper.findUnique({
    where: { id: paper.id },
    select: { title: true, authors: true, status: true },
  })

  return {
    ok: true,
    paper: {
      id: paper.id,
      title: processed?.title ?? paper.title,
      authors: processed?.authors ?? paper.authors,
      status: processed?.status ?? paper.status,
      createdAt: paper.createdAt,
      fileUrl,
    },
  }
}

type ParsedPdf = { ok: true; fullText: string; title: string } | { ok: false; error: string; status: number }

/**
 * Extract text and a provisional title, rejecting active content on the way.
 * Split out so the parse/inspect rules are readable on their own — this is the
 * step most likely to change as the sanitizer evolves.
 */
async function parsePdf(buffer: Buffer, fileName: string): Promise<ParsedPdf> {
  let fullText = ''
  let title = fileName.replace(/\.pdf$/i, '')

  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer))

    // Active-content inspection (SEC-7): reject JS / launch actions / embedded
    // files / XFA / encryption / page bombs before we store or serve the file.
    const inspection = inspectPdf(buffer, pdf.numPages)
    if (!inspection.ok) {
      // `reason` is optional on the inspection type; never surface an empty error.
      return {
        ok: false,
        error: inspection.reason ?? 'This PDF was rejected for safety.',
        status: 422,
      }
    }

    const { text } = await extractText(pdf, { mergePages: true })
    // Strip NUL / C0 control bytes the PDF text layer may carry — Postgres rejects
    // them in a `text` column ("invalid byte sequence for UTF8 0x00"), which
    // otherwise fails the upload with an opaque 500.
    fullText = sanitizePdfText(text)

    const firstLine = fullText.split('\n').map((l) => l.trim()).find(Boolean)
    if (firstLine && firstLine.length < 200) title = firstLine
  } catch (err) {
    // Log internally; return a generic message (no raw parser error to client).
    console.error('[unpdf] extraction error:', err)
    return { ok: false, error: 'Could not read PDF text', status: 422 }
  }

  if (!fullText) {
    return {
      ok: false,
      error: 'No extractable text found (the PDF may be a scanned image)',
      status: 422,
    }
  }

  return { ok: true, fullText, title }
}
