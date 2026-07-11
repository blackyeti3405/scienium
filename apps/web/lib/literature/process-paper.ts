import { z } from 'zod'
import { anthropic } from '@/lib/anthropic'
import { db } from '@/lib/db'

const Metadata = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  authors: z.array(z.string().trim().min(1).max(300)).max(50).default([]),
  abstract: z.string().trim().max(5_000).nullable().optional(),
})

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

const STALE_CLAIM_MS = 5 * 60_000
/** How many times a paper job is tried before it becomes a terminal error. */
const MAX_ATTEMPTS = 3
/** Retry backoff: attempt N schedules the next try ~N × this into the future. */
const RETRY_BACKOFF_MS = 2 * 60_000

/** Claim and process one paper job. Concurrent callers are harmless. */
export async function processPaperJob(paperId: string): Promise<void> {
  const now = new Date()
  const staleBefore = new Date(now.getTime() - STALE_CLAIM_MS)
  const claimed = await db.paperProcessingJob.updateMany({
    where: {
      paperId,
      OR: [
        { status: 'pending' },
        // A retryable failure whose backoff window has elapsed.
        {
          AND: [
            { status: 'failed' },
            { attempts: { lt: MAX_ATTEMPTS } },
            { OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }] },
          ],
        },
        // A stale in-flight claim (a previous attempt crashed before its catch
        // ran). Still capped at MAX_ATTEMPTS so a crash-loop can't over-run the
        // model; a stale claim that has already used all attempts is terminalized
        // by the cron sweep instead.
        {
          AND: [
            { status: 'running' },
            { claimedAt: { lt: staleBefore } },
            { attempts: { lt: MAX_ATTEMPTS } },
          ],
        },
      ],
    },
    data: {
      status: 'running',
      claimedAt: now,
      attempts: { increment: 1 },
      lastError: null,
    },
  })
  if (claimed.count === 0) return

  const [job, paper] = await Promise.all([
    db.paperProcessingJob.findUnique({ where: { paperId }, select: { attempts: true } }),
    db.paper.findUnique({
      where: { id: paperId },
      select: { id: true, title: true, fullText: true },
    }),
  ])
  if (!paper) return

  try {
    const response = await anthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract the metadata from this paper text. Return only JSON.\n\n${(paper.fullText ?? '').slice(0, 24_000)}`,
        },
      ],
    })
    const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const match = raw.match(/\{[\s\S]*\}/)
    const metadata = Metadata.parse(JSON.parse(match?.[0] ?? '{}'))

    await db.$transaction([
      db.paper.update({
        where: { id: paper.id },
        data: {
          title: metadata.title ?? paper.title,
          authors: metadata.authors,
          abstract: metadata.abstract ?? null,
          status: 'ready',
        },
      }),
      db.paperProcessingJob.update({
        where: { paperId },
        data: { status: 'completed', completedAt: new Date(), nextRunAt: null },
      }),
    ])
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1_000) : 'Unknown error'
    // A transient failure is NOT a terminal paper error: keep the paper in
    // `processing` and schedule a backed-off retry while attempts remain. Only
    // once retries are exhausted does the paper become a real `error`.
    const attempts = job?.attempts ?? MAX_ATTEMPTS
    const exhausted = attempts >= MAX_ATTEMPTS
    await db.$transaction([
      db.paper.update({
        where: { id: paper.id },
        data: { status: exhausted ? 'error' : 'processing' },
      }),
      db.paperProcessingJob.update({
        where: { paperId },
        data: exhausted
          ? { status: 'failed', lastError: message, terminalAt: new Date(), nextRunAt: null }
          : {
              status: 'failed',
              lastError: message,
              nextRunAt: new Date(Date.now() + attempts * RETRY_BACKOFF_MS),
            },
      }),
    ])
  }
}
