import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher, teacherOwnsTeam } from '@/lib/teacher/auth'
import { db } from '@/lib/db'
import { QUIZ_PASS_THRESHOLD, type QuizQuestion } from '@/lib/literature/quiz'

/**
 * GET /api/teacher/student/[id]/literature/[paperId]
 *
 * Returns the teacher's read-only view of one student's engagement with a
 * single paper: proficiency badge, most-recent graded quiz (questions stripped
 * of grading keys), and the student's chat transcript.
 *
 * Strictly class-scoped: the student must be in one of the teacher's classes,
 * AND the paper must belong to that student's team.
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string; paperId: string }> }
) {
  const params = await props.params;
  const { ctx, error } = await requireTeacher(req, { tier: 'read' })
  if (error) return error

  // IDOR guard: student must be in one of the teacher's classes.
  const student = await db.user.findFirst({
    where: { id: params.id, classId: { in: ctx.classIds } },
    select: {
      id: true,
      activeTeam: { select: { id: true } },
      teamMemberships: {
        orderBy: { joinedAt: 'desc' },
        take: 1,
        select: { team: { select: { id: true } } },
      },
    },
  })

  if (!student) {
    return NextResponse.json({ error: 'Student not found in your classes' }, { status: 404 })
  }

  const teamId = student.activeTeam?.id ?? student.teamMemberships[0]?.team.id ?? null
  if (!teamId) {
    return NextResponse.json({ error: 'Student not found in your classes' }, { status: 404 })
  }

  // Belt-and-suspenders: verify teacher owns the team.
  const owned = await teacherOwnsTeam(ctx.classIds, teamId)
  if (!owned) {
    return NextResponse.json({ error: 'Student not found in your classes' }, { status: 404 })
  }

  // Paper must belong to this student's team.
  const paper = await db.paper.findFirst({
    where: { id: params.paperId, teamId },
    select: { id: true, title: true, authors: true, status: true },
  })

  if (!paper) {
    return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
  }

  // Fan out the three read queries in parallel.
  const [proficiency, quizSession, chatMessages] = await Promise.all([
    db.paperProficiency.findUnique({
      where: { paperId_userId: { paperId: paper.id, userId: params.id } },
      select: { demonstrated: true, bestScore: true },
    }),

    db.paperQuizSession.findFirst({
      where: { paperId: paper.id, userId: params.id, gradedAt: { not: null } },
      orderBy: { gradedAt: 'desc' },
      include: { attempts: true },
    }),

    db.paperChatMessage.findMany({
      where: { paperId: paper.id, userId: params.id },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
    }),
  ])

  // Build quiz payload — strip grading keys before returning, mirror the student route.
  let quiz: {
    score: number
    passed: boolean
    threshold: number
    gradedAt: string
    questions: { id: string; prompt: string; focus: string }[]
    answers: Record<string, string>
    results: { questionId: string; score: number; rationale: string }[]
  } | null = null

  if (quizSession) {
    const rawQuestions = quizSession.questionsJson as unknown as QuizQuestion[]
    // Strip grading key — never expose to client.
    const questions = rawQuestions.map((q, i) => ({
      id: q.id ?? `q${i + 1}`,
      prompt: q.prompt,
      focus: q.focus,
    }))

    // Match attempts back to questions by prompt text (same logic as student route).
    const byPrompt = new Map(quizSession.attempts.map((a) => [a.question, a]))

    quiz = {
      score: quizSession.score ?? 0,
      passed: quizSession.passed,
      threshold: QUIZ_PASS_THRESHOLD,
      gradedAt: quizSession.gradedAt!.toISOString(),
      questions,
      answers: Object.fromEntries(
        questions.map((q) => [q.id, byPrompt.get(q.prompt)?.response ?? '']),
      ),
      results: questions.map((q) => {
        const a = byPrompt.get(q.prompt)
        return { questionId: q.id, score: a?.score ?? 0, rationale: a?.evaluation ?? '' }
      }),
    }
  }

  return NextResponse.json({
    paper: {
      id: paper.id,
      title: paper.title,
      authors: paper.authors,
      status: paper.status,
    },
    proficiency: proficiency
      ? { demonstrated: proficiency.demonstrated, bestScore: proficiency.bestScore }
      : null,
    quiz,
    chat: chatMessages,
  })
}
