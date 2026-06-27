import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireTeamContext } from '@/lib/api/route-context'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'
import {
  QUIZ_QUESTION_COUNT,
  QUIZ_PASS_THRESHOLD,
  QuizQuestion,
  loadRubric,
  stripKeys,
  extractJson,
} from '@/lib/literature/quiz'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// GET: return the most recent GRADED quiz session for this paper (so past
// answers + feedback stay accessible). Returns null if none has been graded.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const session = await db.paperQuizSession.findFirst({
    where: { paperId: params.id, userId: ctx.dbUserId, gradedAt: { not: null } },
    orderBy: { gradedAt: 'desc' },
    include: { attempts: true },
  })

  if (!session) return NextResponse.json({ session: null })

  const questions = (session.questionsJson as unknown as QuizQuestion[]).map((q, i) => ({
    id: q.id ?? `q${i + 1}`,
    prompt: q.prompt,
    focus: q.focus,
  }))

  // Match attempts back to questions by prompt text.
  const byPrompt = new Map(session.attempts.map((a) => [a.question, a]))

  return NextResponse.json({
    session: {
      sessionId: session.id,
      score: session.score ?? 0,
      passed: session.passed,
      threshold: QUIZ_PASS_THRESHOLD,
      gradedAt: session.gradedAt,
      questions,
      answers: Object.fromEntries(
        questions.map((q) => [q.id, byPrompt.get(q.prompt)?.response ?? '']),
      ),
      results: questions.map((q) => {
        const a = byPrompt.get(q.prompt)
        return { questionId: q.id, score: a?.score ?? 0, rationale: a?.evaluation ?? '' }
      }),
    },
  })
}

// Generate a fresh graded quiz for a paper.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Strict per-user + per-IP limit: quiz generation is a paid Claude call.
  const { ctx, error } = await requireTeamContext(req, { tier: 'ai' })
  if (error) return error

  const paper = await db.paper.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    select: { id: true, title: true, fullText: true, status: true },
  })
  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (paper.status !== 'ready') {
    return NextResponse.json({ error: 'Paper is still processing' }, { status: 409 })
  }

  const rubric = await loadRubric()

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: [
      { type: 'text', text: GENERATION_INSTRUCTIONS(rubric, QUIZ_QUESTION_COUNT) },
      {
        type: 'text',
        text: `FULL PAPER TEXT:\n---\n${(paper.fullText ?? '').slice(0, 120000)}`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Generate exactly ${QUIZ_QUESTION_COUNT} questions for this paper as a JSON array. Each element: { "prompt": "...", "focus": "...", "key": "..." }. Return ONLY the JSON array.`,
      },
    ],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const parsed = extractJson<Array<{ prompt: string; focus: string; key: string }>>(raw)

  if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
    console.error('[quiz] generation failed to parse:', raw.slice(0, 500))
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 502 })
  }

  const questions: QuizQuestion[] = parsed.map((q, i) => ({
    id: `q${i + 1}`,
    prompt: q.prompt,
    focus: q.focus ?? 'general',
    key: q.key ?? '',
  }))

  const session = await db.paperQuizSession.create({
    data: {
      paperId: paper.id,
      userId: ctx.dbUserId,
      questionsJson: questions as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  })

  return NextResponse.json({
    sessionId: session.id,
    questions: stripKeys(questions),
  })
}

function GENERATION_INSTRUCTIONS(rubric: string, count: number): string {
  return `You are Vega, generating a ${count}-question comprehension quiz for a research paper. Follow this rubric exactly:

${rubric}

OUTPUT FORMAT:
Return ONLY a JSON array of ${count} objects, each with:
- "prompt": the question text shown to the student (free-response)
- "focus": one short tag — one of "findings", "relevance", "methodology", or "field knowledge"
- "key": concise grading notes — the ideal answer and the specific points a correct response must hit. This is used later for grading and is never shown to the student.

No prose, no markdown fences — just the JSON array.`
}
