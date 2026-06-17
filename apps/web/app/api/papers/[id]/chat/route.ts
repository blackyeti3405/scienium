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

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const paper = await db.paper.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    select: { id: true, title: true, authors: true, abstract: true, contentHash: true, status: true },
  })

  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (paper.status !== 'ready') {
    return NextResponse.json({ error: 'Paper is still processing' }, { status: 409 })
  }

  const body = await req.json()
  const messages: ChatMessage[] = body.messages ?? []

  if (!messages.length) {
    return NextResponse.json({ error: 'messages array required' }, { status: 400 })
  }

  // contentHash currently stores extracted markdown text
  const paperContent = paper.contentHash ?? ''

  const systemPrompt = buildSystemPrompt(
    paper.title,
    paper.authors as string[],
    paper.abstract ?? '',
    paperContent,
  )

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  })

  const reply = response.content[0].type === 'text' ? response.content[0].text : ''

  return NextResponse.json({ reply })
}

function buildSystemPrompt(
  title: string,
  authors: string[],
  abstract: string,
  content: string,
): string {
  const authorLine = authors.length > 0 ? authors.join(', ') : 'Unknown authors'
  const contentExcerpt = content.slice(0, 35000)

  return `You are Nova, an academic research tutor helping a high school student deeply understand a research paper as part of their science fair literature review. Your goal is to assess their comprehension and help them connect the paper to their own research.

PAPER DETAILS:
Title: ${title}
Authors: ${authorLine}
Abstract: ${abstract}

FULL PAPER TEXT (for reference):
---
${contentExcerpt}
---

YOUR ROLE:
- Quiz the student on the paper's methodology, key findings, and limitations
- Ask follow-up questions when answers are too surface-level or vague
- Help them articulate how this paper is relevant (or irrelevant) to their research topic
- Celebrate genuine insight; gently push back on misconceptions
- Ask them to explain concepts in their own words, not just recite the paper
- When they demonstrate solid understanding of a key concept, acknowledge it clearly

TONE & STYLE:
- Encouraging but rigorous — this is science fair, not trivia
- Use clear, accessible language appropriate for a high school student
- Keep responses concise (2–5 sentences usually) unless explaining a complex concept
- Never just summarize the paper for them — make them work for the understanding
- End most responses with a question to keep the dialogue going

PROFICIENCY TRACKING:
A student demonstrates proficiency when they can:
1. Accurately describe the paper's main hypothesis or research question
2. Explain the methodology in their own words
3. Identify at least one key finding and its significance
4. Articulate why this paper is or isn't relevant to their research

When all four criteria are met in the conversation, include the exact phrase "PROFICIENCY_DEMONSTRATED" at the very end of your response (on a new line, hidden from display logic).`
}
