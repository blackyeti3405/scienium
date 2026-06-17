import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTeamContext } from '@/lib/phase'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// GET: load this user's saved chat history for the paper.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const dbUser = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const paper = await db.paper.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    select: { id: true },
  })
  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const rows = await db.paperChatMessage.findMany({
    where: { paperId: paper.id, userId: dbUser.id },
    orderBy: { createdAt: 'asc' },
    select: { role: true, content: true },
  })

  return NextResponse.json({ messages: rows })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const dbUser = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const paper = await db.paper.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    select: { id: true, title: true, authors: true, abstract: true, fullText: true, status: true },
  })

  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (paper.status !== 'ready') {
    return NextResponse.json({ error: 'Paper is still processing' }, { status: 409 })
  }

  const body = await req.json()
  const rawMessages: ChatMessage[] = body.messages ?? []

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
    const response = await client.messages.create({
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
          ...(lastUser ? [{ paperId: paper.id, userId: dbUser.id, role: 'user', content: lastUser.content }] : []),
          { paperId: paper.id, userId: dbUser.id, role: 'assistant', content: reply },
        ],
      })
    } catch (persistErr) {
      console.error('[chat] persist failed (reply still returned):', persistErr)
    }

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[chat] error:', err)
    return NextResponse.json({ error: 'Chat failed', detail: String(err) }, { status: 500 })
  }
}

function buildInstructions(title: string, authors: string, abstract: string): string {
  return `You are Nova, an academic research tutor helping an advanced high-school science-fair student explore a research paper. The student has already completed a graded comprehension quiz on this paper; this is an open-ended discussion to deepen their understanding.

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
