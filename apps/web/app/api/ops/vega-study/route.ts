import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { buildStudyContext, STUDY_INSTRUCTIONS } from '@/lib/ops/vega-study-context'
import { anthropic } from '@/lib/anthropic'

// Bound the conversation we forward to Claude: caps both the number of turns and
// the size of each message so a crafted request can't run up an unbounded bill.
// Mirrors app/api/papers/[id]/chat/route.ts exactly.
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

// GET: load the team's shared study-thread history. Thread is keyed by
// teamId ONLY (team-shared, per the plan's persistence decision) — every
// member sees the whole conversation, unlike the per-user PaperChatMessage.
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const rows = await db.vegaStudyMessage.findMany({
    where: { teamId: ctx.teamId },
    orderBy: { createdAt: 'asc' },
    select: { role: true, content: true },
  })

  return NextResponse.json({ messages: rows })
}

export async function POST(req: NextRequest) {
  // Strict per-user + per-IP limit: this handler makes a paid Claude call.
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'ai' })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, ChatBody)
  if (error) return error
  const rawMessages: ChatMessage[] = data.messages

  // Anthropic requires the conversation to start with a user turn. The client's
  // greeting is an assistant-only message, so drop everything up to the first
  // user message.
  const firstUser = rawMessages.findIndex((m) => m.role === 'user')
  const convo = firstUser >= 0 ? rawMessages.slice(firstUser) : []
  if (!convo.length) {
    return NextResponse.json({ error: 'No user message to respond to' }, { status: 400 })
  }

  const lastUser = [...convo].reverse().find((m) => m.role === 'user')

  // E2E test-mode short-circuit: skip the real Anthropic call when
  // E2E_SKIP_LLM=1 is set in the environment. The DB row is still written so
  // persistence assertions (reload) are valid. Never set this in production.
  let reply: string
  if (process.env.E2E_SKIP_LLM === '1') {
    reply =
      "That's a great question to dig into — but I can't write that deliverable for you. Let's work through it together: what's the core idea you're trying to explain, in your own words?"
  } else {
    try {
      const context = await buildStudyContext(ctx.teamId)
      // The project-context block is cached: the first turn pays full price,
      // every follow-up in the session reuses the cache at ~10% the cost
      // (5-minute TTL) — same pattern as the paper chat route.
      const response = await anthropic().messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: [
          { type: 'text', text: STUDY_INSTRUCTIONS },
          { type: 'text', text: context, cache_control: { type: 'ephemeral' } },
        ],
        messages: convo.map((m) => ({ role: m.role, content: m.content })),
      })
      reply = response.content[0].type === 'text' ? response.content[0].text : ''
    } catch (err) {
      // Log the real error server-side; return a generic message so internal
      // details (stack/SDK internals) never reach the client (OWASP API8/A09).
      console.error('[vega-study] error:', err)
      return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
    }
  }

  // Persist the latest user turn + the assistant reply so the conversation
  // survives closing and reopening — best-effort so a DB hiccup never drops the
  // reply the user just paid for. Assistant turns store the same userId as the
  // triggering user turn (author of the exchange), matching the plan.
  try {
    await db.vegaStudyMessage.createMany({
      data: [
        ...(lastUser
          ? [{ teamId: ctx.teamId, userId: ctx.dbUserId, role: 'user', content: lastUser.content }]
          : []),
        { teamId: ctx.teamId, userId: ctx.dbUserId, role: 'assistant', content: reply },
      ],
    })
  } catch (persistErr) {
    console.error('[vega-study] persist failed (reply still returned):', persistErr)
  }

  return NextResponse.json({ reply })
}
