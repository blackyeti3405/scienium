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

/** Claim and process one paper job. Concurrent callers are harmless. */
export async function processPaperJob(paperId: string): Promise<void> {
  const staleBefore = new Date(Date.now() - STALE_CLAIM_MS)
  const claimed = await db.paperProcessingJob.updateMany({
    where: {
      paperId,
      OR: [
        { status: 'pending' },
        { status: 'failed', attempts: { lt: 3 } },
        { status: 'running', claimedAt: { lt: staleBefore } },
      ],
    },
    data: {
      status: 'running',
      claimedAt: new Date(),
      attempts: { increment: 1 },
      lastError: null,
    },
  })
  if (claimed.count === 0) return

  const paper = await db.paper.findUnique({
    where: { id: paperId },
    select: { id: true, title: true, fullText: true },
  })
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
        data: { status: 'completed', completedAt: new Date() },
      }),
    ])
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1_000) : 'Unknown error'
    await db.$transaction([
      db.paper.update({ where: { id: paper.id }, data: { status: 'error' } }),
      db.paperProcessingJob.update({
        where: { paperId },
        data: { status: 'failed', lastError: message },
      }),
    ])
  }
}
