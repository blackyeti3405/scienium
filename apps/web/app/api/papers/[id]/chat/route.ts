import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { anthropic } from '@/lib/anthropic'

// The server owns the conversation. A request carries ONE new user turn; the
// history is loaded from the database, so a client can never inject fabricated
// assistant turns into the context Claude sees. History (and the LLM context) is
// bounded to the most recent MAX_MESSAGES turns.
const MAX_MESSAGES = 60
const MAX_MESSAGE_CHARS = 8_000
const ChatBody = z.object({ message: z.string().trim().min(1).max(MAX_MESSAGE_CHARS) }).strict()

// GET: this user's saved chat history for the paper, capped at the last MAX_MESSAGES.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const paper = await db.paper.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    select: { id: true },
  })
  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Newest MAX_MESSAGES, then reversed to chronological order for the client.
  const rows = await db.paperChatMessage.findMany({
    where: { paperId: paper.id, userId: ctx.dbUserId, status: 'complete' },
    orderBy: { createdAt: 'desc' },
    take: MAX_MESSAGES,
    select: { role: true, content: true },
  })

  return NextResponse.json({ messages: rows.reverse() })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Strict per-user + per-IP limit: this handler makes a paid Claude call.
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'ai' })
  if (guardError) return guardError

  const paper = await db.paper.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    select: { id: true, title: true, authors: true, abstract: true, fullText: true, status: true },
  })
  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (paper.status !== 'ready') {
    return NextResponse.json({ error: 'Paper is still processing' }, { status: 409 })
  }

  const { data, error } = await parseJson(req, ChatBody)
  if (error) return error
  const message = data.message

  // Server-owned history: only completed turns, bounded. The rows begin with a
  // user turn (we only ever persist user→assistant pairs), so the conversation we
  // hand Claude satisfies the "must start with a user message" requirement.
  const prior = await db.paperChatMessage.findMany({
    where: { paperId: paper.id, userId: ctx.dbUserId, status: 'complete' },
    orderBy: { createdAt: 'desc' },
    take: MAX_MESSAGES,
    select: { role: true, content: true },
  })
  // The bounded window can begin mid-exchange (on an assistant turn) when writes
  // interleave — user rows are written before the paid call, assistant rows after.
  // Anthropic requires the first message to be a user turn, so trim any leading
  // assistant rows before prepending the history to the new user message.
  const priorAsc = prior.reverse()
  let head = 0
  while (head < priorAsc.length && priorAsc[head].role !== 'user') head++
  const convo = [
    ...priorAsc.slice(head).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: message },
  ]

  // Persist the user turn as `pending` BEFORE the paid call, so a failed call
  // leaves a durable record rather than silently dropping the turn.
  const requestId = randomUUID()
  const userRow = await db.paperChatMessage.create({
    data: {
      paperId: paper.id,
      userId: ctx.dbUserId,
      role: 'user',
      content: message,
      status: 'pending',
      requestId,
    },
    select: { id: true },
  })

  const authorLine = (paper.authors as string[]).join(', ') || 'Unknown authors'

  let reply: string
  let usageJson: { inputTokens: number; outputTokens: number } | undefined
  try {
    // The paper text goes in a cached system block. The first request pays full
    // price; every follow-up reuses the cache at ~10% the cost (5-minute TTL).
    const response = await anthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [
        { type: 'text', text: buildInstructions(paper.title, authorLine, paper.abstract ?? '') },
        {
          type: 'text',
          text: `FULL PAPER TEXT:\n---\n${(paper.fullText ?? '').slice(0, 120000)}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: convo,
    })
    reply = response.content[0].type === 'text' ? response.content[0].text : ''
    usageJson = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    }
  } catch (err) {
    // Log the real error server-side; return a generic message so internal details
    // never reach the client (OWASP API8/A09). Mark the user turn `error` so the
    // paid-call outcome and the visible history don't silently diverge.
    console.error('[chat] error:', err)
    await db.paperChatMessage
      .update({ where: { id: userRow.id }, data: { status: 'error', error: 'Chat failed' } })
      .catch(() => {})
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }

  // Complete the user turn and persist the assistant reply atomically.
  await db.$transaction([
    db.paperChatMessage.update({
      where: { id: userRow.id },
      data: { status: 'complete', tokenUsageJson: usageJson },
    }),
    db.paperChatMessage.create({
      data: {
        paperId: paper.id,
        userId: ctx.dbUserId,
        role: 'assistant',
        content: reply,
        status: 'complete',
        requestId,
        tokenUsageJson: usageJson,
      },
    }),
  ])

  return NextResponse.json({ reply })
}

function buildInstructions(title: string, authors: string, abstract: string): string {
  return `You are Vega, an academic research tutor helping an advanced high-school science-fair student explore a research paper. The student has already completed a graded comprehension quiz on this paper; this is an open-ended discussion to deepen their understanding.

PAPER: "${title}" by ${authors}
ABSTRACT: ${abstract}

YOUR ROLE:
- Answer the student's questions about the paper's methodology, findings, limitations, and significance
- Connect the paper to the broader field and to the student's own research where relevant
- Explain technical concepts clearly, in language an advanced high-school student can follow
- Celebrate genuine insight; gently correct misconceptions
- Ground every answer in the actual paper; if something isn't covered by the paper, say so

TONE: Encouraging but rigorous. Concise (2–5 sentences) unless a concept needs more. You may end with a question to keep the dialogue going, but you don't have to.`
}
