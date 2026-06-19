import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getTeamContext } from '@/lib/phase'
import { loadResearchRubric } from '@/lib/research-plan/rubric'
import { findProjectType, findSubtype } from '@/lib/research-plan/types'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * POST /api/research-plan/review — AI critique of the synced plan against the
 * type-specific rubric (Feature 2B). The model emits the review as **JSON Lines**
 * (one compact object per line: overall, then a line per graded section, then
 * strength/gap/next-step bullets). We parse each completed line as it streams and
 * forward it as a structured NDJSON event, so the UI's rubric rows appear graded
 * one at a time and the three columns fill in live. The assembled structured
 * review is persisted so it reloads in the same format.
 */
export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const plan = await db.researchPlan.findUnique({ where: { teamId: ctx.teamId } })
  if (!plan?.lastSyncedText) {
    return NextResponse.json({ error: 'Connect and sync a Google Doc first' }, { status: 400 })
  }
  if (!plan.projectType || !plan.projectSubtype) {
    return NextResponse.json({ error: 'Pick a project type and subtype first' }, { status: 400 })
  }

  const typeLabel = findProjectType(plan.projectType)?.label ?? plan.projectType
  const subtypeLabel = findSubtype(plan.projectType, plan.projectSubtype)?.label ?? plan.projectSubtype

  let rubric: string
  try {
    rubric = await loadResearchRubric(plan.projectType, plan.projectSubtype)
  } catch {
    return NextResponse.json({ error: 'Could not load the review rubric' }, { status: 500 })
  }

  const planText = plan.lastSyncedText.slice(0, 80000)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))

      // Assembled structured review (persisted at the end, mirrors the client shape).
      const review: {
        overall: { readiness: string; score: number; summary: string } | null
        sections: { title: string; score: number; max: number; assessment: string }[]
        strengths: string[]
        gaps: string[]
        recommendations: string[]
      } = { overall: null, sections: [], strengths: [], gaps: [], recommendations: [] }

      const handleLine = (raw: string) => {
        const cleaned = raw.trim().replace(/^[[,]+/, '').replace(/[,\]]+$/, '').trim()
        if (!cleaned.startsWith('{')) return
        let obj: Record<string, any>
        try {
          obj = JSON.parse(cleaned)
        } catch {
          return
        }
        switch (obj.kind) {
          case 'overall':
            review.overall = {
              readiness: String(obj.readiness ?? 'early'),
              score: clampInt(obj.score),
              summary: String(obj.summary ?? ''),
            }
            send({ type: 'overall', ...review.overall })
            break
          case 'section': {
            const s = {
              title: String(obj.title ?? ''),
              score: clampInt(obj.score),
              max: clampInt(obj.max) || 0,
              assessment: String(obj.assessment ?? ''),
            }
            review.sections.push(s)
            send({ type: 'section', ...s })
            break
          }
          case 'strength':
            if (obj.text) {
              review.strengths.push(String(obj.text))
              send({ type: 'strength', text: String(obj.text) })
            }
            break
          case 'gap':
            if (obj.text) {
              review.gaps.push(String(obj.text))
              send({ type: 'gap', text: String(obj.text) })
            }
            break
          case 'recommendation':
            if (obj.text) {
              review.recommendations.push(String(obj.text))
              send({ type: 'recommendation', text: String(obj.text) })
            }
            break
        }
      }

      try {
        const ms = client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: [
            { type: 'text', text: REVIEW_INSTRUCTIONS(rubric, typeLabel, subtypeLabel) },
            {
              type: 'text',
              text: `RESEARCH PLAN (from the team's Google Doc):\n---\n${planText}`,
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: [{ role: 'user', content: 'Review this research plan against the rubric.' }],
        })

        let buf = ''
        for await (const event of ms) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            buf += event.delta.text
            let nl
            while ((nl = buf.indexOf('\n')) >= 0) {
              handleLine(buf.slice(0, nl))
              buf = buf.slice(nl + 1)
            }
          }
        }
        await ms.finalMessage()
        handleLine(buf) // flush any trailing line

        if (!review.overall && review.sections.length === 0) {
          send({ type: 'error', error: 'Review failed — try again' })
          return
        }

        await db.researchPlan.update({
          where: { teamId: ctx.teamId },
          data: { lastReviewJson: review as unknown as Prisma.InputJsonValue, lastReviewedAt: new Date() },
        })

        send({ type: 'done' })
      } catch (err) {
        console.error('[research-plan/review] failed:', err)
        send({ type: 'error', error: 'Review failed — try again' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function clampInt(n: unknown): number {
  const v = Math.round(Number(n))
  if (Number.isNaN(v)) return 0
  return Math.max(0, Math.min(100, v))
}

function REVIEW_INSTRUCTIONS(rubric: string, typeLabel: string, subtypeLabel: string): string {
  return `You are Nova, an experienced ISEF mentor reviewing a ${typeLabel} / ${subtypeLabel} research plan written by an advanced high-school student. Grade the PLAN (not finished results) against this rubric:

${rubric}

Be specific and constructive — cite what the plan says (or fails to say) against each section's checklist items. Encouraging but honest.

OUTPUT FORMAT — JSON Lines: emit exactly ONE compact JSON object PER LINE, in this order. No surrounding array, no markdown fences, no commas between lines, no pretty-printing.

1. First line — overall:
{"kind":"overall","readiness":"early"|"promising"|"strong","score":<integer 0-100 holistic estimate>,"summary":"2-3 sentence overall assessment addressed to the student"}

2. Then ONE line per rubric section (the FIVE sections, in order I–V):
{"kind":"section","title":"<section name, e.g. I. Research Question>","score":<integer>,"max":<the section's point value from the rubric>,"assessment":"1-2 sentences: what's there, what's missing vs this section's checklist items"}

3. Then strengths (each its own line):
{"kind":"strength","text":"<short, concrete>"}

4. Then gaps (each its own line):
{"kind":"gap","text":"<short, names a concrete weakness>"}

5. Then next steps (each its own line):
{"kind":"recommendation","text":"<short, actionable>"}

Output nothing except these JSON Lines.`
}
