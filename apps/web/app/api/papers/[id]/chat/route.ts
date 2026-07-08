import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { anthropic } from '@/lib/anthropic'

// Bound the conversation we forward to Claude: caps both the number of turns and
// the size of each message so a crafted request can't run up an unbounded bill.
const MAX_MESSAGES = 60
const MAX_MESSAGE_CHARS = 8_000
const ChatBody = z
  .object({
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().min(1).max(MAX_MESSAGE_CHARS),
        }),
      )
      .min(1)
      .max(MAX_MESSAGES),
  })
  .strict()

type ChatMessage = z.infer<typeof ChatBody>['messages'][number]

// GET: load this user's saved chat history for the paper.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const paper = await db.paper.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    select: { id: true },
  })
  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const rows = await db.paperChatMessage.findMany({
    where: { paperId: paper.id, userId: ctx.dbUserId },
    orderBy: { createdAt: 'asc' },
    select: { role: true, content: true },
  })

  return NextResponse.json({ messages: rows })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
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
  const rawMessages: ChatMessage[] = data.messages

  // Anthropic requires the conversation to start with a user turn. The client's
  // greeting (and any client-only error notices) are assistant messages, so drop
  // everything up to the first user message.
  const firstUser = rawMessages.findIndex((m) => m.role === 'user')
  const convo = firstUser >= 0 ? rawMessages.slice(firstUser) : []
  if (!convo.length) {
    return NextResponse.json({ error: 'No user message to respond to' }, { status: 400 })
  }

  const authorLine = (paper.authors as string[]).join(', ') || 'Unknown authors'

  try {
    // The paper text goes in a cached system block. The first request pays full price;
    // every follow-up question reuses the cache at ~10% the cost (5-minute TTL).
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
      messages: convo.map((m) => ({ role: m.role, content: m.content })),
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''

    // Persist the latest user turn + the assistant reply so the conversation
    // survives closing and reopening — best-effort so a DB hiccup never drops the
    // reply the user just paid for.
    try {
      const lastUser = [...convo].reverse().find((m) => m.role === 'user')
      await db.paperChatMessage.createMany({
        data: [
          ...(lastUser ? [{ paperId: paper.id, userId: ctx.dbUserId, role: 'user', content: lastUser.content }] : []),
          { paperId: paper.id, userId: ctx.dbUserId, role: 'assistant', content: reply },
        ],
      })
    } catch (persistErr) {
      console.error('[chat] persist failed (reply still returned):', persistErr)
    }

    return NextResponse.json({ reply })
  } catch (err) {
    // Log the real error server-side; return a generic message so internal
    // details (stack/SDK internals) never reach the client (OWASP API8/A09).
    console.error('[chat] error:', err)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
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
