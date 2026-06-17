import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTeamContext } from '@/lib/phase'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'
import {
  QUIZ_PASS_THRESHOLD,
  QuizQuestion,
  GradedAnswer,
  loadRubric,
  extractJson,
} from '@/lib/literature/quiz'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface SubmittedAnswer {
  questionId: string
  response: string
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

  const body = await req.json()
  const sessionId: string = body.sessionId
  const answers: SubmittedAnswer[] = body.answers ?? []
  if (!sessionId || !answers.length) {
    return NextResponse.json({ error: 'sessionId and answers are required' }, { status: 400 })
  }

  const session = await db.paperQuizSession.findFirst({
    where: { id: sessionId, userId: dbUser.id, paperId: params.id },
    include: { paper: { select: { id: true, teamId: true, title: true, fullText: true } } },
  })
  if (!session || session.paper.teamId !== ctx.teamId) {
    return NextResponse.json({ error: 'Quiz session not found' }, { status: 404 })
  }
  if (session.gradedAt) {
    return NextResponse.json({ error: 'This quiz has already been graded' }, { status: 409 })
  }

  const questions = session.questionsJson as unknown as QuizQuestion[]
  const answerMap = new Map(answers.map((a) => [a.questionId, a.response ?? '']))

  // One grading call for the whole quiz: paper cached + all Q/key/answer triples.
  const rubric = await loadRubric()
  const gradingPayload = questions.map((q) => ({
    questionId: q.id,
    question: q.prompt,
    gradingKey: q.key,
    studentAnswer: answerMap.get(q.id) ?? '',
  }))

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: [
      { type: 'text', text: GRADING_INSTRUCTIONS(rubric) },
      {
        type: 'text',
        text: `FULL PAPER TEXT:\n---\n${(session.paper.fullText ?? '').slice(0, 120000)}`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Grade each answer. Return ONLY a JSON array of { "questionId", "score" (0-100 integer), "rationale" } objects.\n\n${JSON.stringify(gradingPayload, null, 2)}`,
      },
    ],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const graded = extractJson<GradedAnswer[]>(raw)
  if (!graded || !Array.isArray(graded) || graded.length === 0) {
    console.error('[quiz] grading failed to parse:', raw.slice(0, 500))
    return NextResponse.json({ error: 'Failed to grade quiz' }, { status: 502 })
  }

  const gradeMap = new Map(graded.map((g) => [g.questionId, g]))
  const aggregate = Math.round(
    graded.reduce((sum, g) => sum + clamp(g.score), 0) / graded.length,
  )
  const passed = aggregate >= QUIZ_PASS_THRESHOLD

  // Persist: per-question attempts, session result, and (if passed) proficiency.
  await db.$transaction([
    db.paperQuizAttempt.createMany({
      data: questions.map((q) => {
        const g = gradeMap.get(q.id)
        return {
          sessionId: session.id,
          paperId: session.paper.id,
          userId: dbUser.id,
          question: q.prompt,
          response: answerMap.get(q.id) ?? '',
          evaluation: g?.rationale ?? '',
          score: clamp(g?.score ?? 0),
        }
      }),
    }),
    db.paperQuizSession.update({
      where: { id: session.id },
      data: { score: aggregate, passed, gradedAt: new Date() },
    }),
    ...(passed
      ? [db.paper.update({ where: { id: session.paper.id }, data: { proficiencyDemonstrated: true } })]
      : []),
  ])

  return NextResponse.json({
    score: aggregate,
    passed,
    threshold: QUIZ_PASS_THRESHOLD,
    results: questions.map((q) => {
      const g = gradeMap.get(q.id)
      return { questionId: q.id, score: clamp(g?.score ?? 0), rationale: g?.rationale ?? '' }
    }),
  })
}

function clamp(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function GRADING_INSTRUCTIONS(rubric: string): string {
  return `You are Nova, grading a student's free-response answers to a comprehension quiz about a research paper. Follow this rubric exactly:

${rubric}

You are given, for each question: the question, a grading key (ideal answer / required points), and the student's answer. Grade strictly against the rubric and the key, using the full paper text as ground truth.

OUTPUT FORMAT:
Return ONLY a JSON array, one object per question:
- "questionId": the id from the input
- "score": integer 0-100 per the per-question rubric
- "rationale": 1-2 sentences addressed to the student explaining the score

No prose outside the JSON array.`
}
