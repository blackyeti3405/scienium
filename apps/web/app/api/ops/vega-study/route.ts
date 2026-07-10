import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { buildStudyContext, STUDY_INSTRUCTIONS } from '@/lib/ops/vega-study-context'
import { anthropic } from '@/lib/anthropic'

// The server owns the team's shared study thread. A request carries ONE new user
// turn; history is loaded from the database (keyed by teamId only — team-shared),
// so a client can never inject fabricated assistant turns. Bounded to MAX_MESSAGES.
const MAX_MESSAGES = 60
const MAX_MESSAGE_CHARS = 8_000
const ChatBody = z.object({ message: z.string().trim().min(1).max(MAX_MESSAGE_CHARS) }).strict()

// GET: the team's shared study-thread history, capped at the last MAX_MESSAGES.
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const rows = await db.vegaStudyMessage.findMany({
    where: { teamId: ctx.teamId, status: 'complete' },
    orderBy: { createdAt: 'desc' },
    take: MAX_MESSAGES,
    select: { role: true, content: true },
  })

  return NextResponse.json({ messages: rows.reverse() })
}

export async function POST(req: NextRequest) {
  // Strict per-user + per-IP limit: this handler makes a paid Claude call.
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'ai' })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, ChatBody)
  if (error) return error
  const message = data.message

  // Server-owned, bounded history (only completed turns). Begins with a user turn.
  const prior = await db.vegaStudyMessage.findMany({
    where: { teamId: ctx.teamId, status: 'complete' },
    orderBy: { createdAt: 'desc' },
    take: MAX_MESSAGES,
    select: { role: true, content: true },
  })
  // Team-shared: concurrent teammate posts interleave user/assistant rows by
  // createdAt, so the bounded window can begin on an assistant turn. Anthropic
  // requires the first message to be a user turn, so trim any leading assistant
  // rows before prepending the history to the new user message.
  const priorAsc = prior.reverse()
  let head = 0
  while (head < priorAsc.length && priorAsc[head].role !== 'user') head++
  const convo = [
    ...priorAsc.slice(head).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: message },
  ]

  // Persist the user turn as `pending` before the paid call.
  const requestId = randomUUID()
  const userRow = await db.vegaStudyMessage.create({
    data: {
      teamId: ctx.teamId,
      userId: ctx.dbUserId,
      role: 'user',
      content: message,
      status: 'pending',
      requestId,
    },
    select: { id: true },
  })

  let reply: string
  let usageJson: { inputTokens: number; outputTokens: number } | undefined
  // E2E test-mode short-circuit: skip the real Anthropic call when E2E_SKIP_LLM=1
  // (set by the Playwright config, never in a normal dev server or production).
  if (process.env.E2E_SKIP_LLM === '1') {
    reply =
      "That's a great question to dig into — but I can't write that deliverable for you. Let's work through it together: what's the core idea you're trying to explain, in your own words?"
  } else {
    try {
      const context = await buildStudyContext(ctx.teamId)
      const response = await anthropic().messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: [
          { type: 'text', text: STUDY_INSTRUCTIONS },
          { type: 'text', text: context, cache_control: { type: 'ephemeral' } },
        ],
        messages: convo,
      })
      reply = response.content[0].type === 'text' ? response.content[0].text : ''
      usageJson = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      }
    } catch (err) {
      console.error('[vega-study] error:', err)
      await db.vegaStudyMessage
        .update({ where: { id: userRow.id }, data: { status: 'error', error: 'Chat failed' } })
        .catch(() => {})
      return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
    }
  }

  await db.$transaction([
    db.vegaStudyMessage.update({
      where: { id: userRow.id },
      data: { status: 'complete', tokenUsageJson: usageJson },
    }),
    db.vegaStudyMessage.create({
      data: {
        teamId: ctx.teamId,
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
