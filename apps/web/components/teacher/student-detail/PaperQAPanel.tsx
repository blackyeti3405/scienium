'use client'

import { useEffect, useState } from 'react'
import { FileText, X } from 'lucide-react'
import { SafeMarkdown } from '@/components/ui/SafeMarkdown'
import { z } from 'zod'
import { PixelSkeleton } from '@/components/ui/PixelSkeleton'
import { requestJson } from '@/lib/api/client'

const paperQASchema = z.object({
  paper: z.object({
    id: z.string(),
    title: z.string(),
    authors: z.array(z.string()),
    status: z.string(),
  }),
  proficiency: z
    .object({ demonstrated: z.boolean(), bestScore: z.number() })
    .nullable(),
  quiz: z
    .object({
      score: z.number(),
      passed: z.boolean(),
      threshold: z.number(),
      gradedAt: z.coerce.string(),
      questions: z.array(
        z.object({ id: z.string(), prompt: z.string(), focus: z.string() }),
      ),
      answers: z.record(z.string()),
      results: z.array(
        z.object({ questionId: z.string(), score: z.number(), rationale: z.string() }),
      ),
    })
    .nullable(),
  chat: z.array(z.object({ role: z.string(), content: z.string() })),
})

type PaperQA = z.infer<typeof paperQASchema>

export function PaperQAPanel({
  studentId,
  paperId,
  onClose,
}: {
  studentId: string
  paperId: string
  onClose: () => void
}) {
  const [data, setData] = useState<PaperQA | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    requestJson(
      `/api/teacher/student/${studentId}/literature/${paperId}`,
      paperQASchema,
    )
      .then((result) => active && setData(result))
      .catch(() => active && setError('Could not load Q&A data.'))
    return () => {
      active = false
    }
  }, [studentId, paperId])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-white/15 bg-[#0a1628] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0a1628] px-4 py-3">
          <div className="min-w-0 pr-4">
            <p className="font-pixel text-[10px] uppercase text-[#F5C518]">Q&amp;A - read only</p>
            {data && <p className="mt-0.5 truncate text-sm text-white">{data.paper.title}</p>}
          </div>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white/80" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-6 p-4">
          {!data && !error && (
            <div className="space-y-3">
              <PixelSkeleton variant="line" h="h-7" w="w-16" />
              {Array.from({ length: 3 }).map((_, index) => (
                <PixelSkeleton key={index} variant="box" h="h-16" w="w-full" />
              ))}
            </div>
          )}
          {error && <p className="py-8 text-center text-sm text-red-400">{error}</p>}
          {data && (
            <>
              {data.paper.status === 'ready' && (
                <a
                  href={`/api/teacher/student/${studentId}/literature/${paperId}/file`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-[#F5C518]"
                >
                  <FileText size={14} /> View PDF
                </a>
              )}

              <section className="space-y-3">
                <h3 className="font-pixel text-[10px] uppercase text-[#F5C518]">Quiz</h3>
                {data.quiz ? (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-semibold text-white">{data.quiz.score}%</span>
                      <span className={data.quiz.passed ? 'text-xs text-emerald-400' : 'text-xs text-red-400'}>
                        {data.quiz.passed ? 'Passed' : 'Not passed'}
                      </span>
                      <span className="text-xs text-white/30">threshold {data.quiz.threshold}%</span>
                    </div>
                    <ul className="space-y-3">
                      {data.quiz.questions.map((question) => {
                        const result = data.quiz?.results.find(
                          (item) => item.questionId === question.id,
                        )
                        return (
                          <li key={question.id} className="space-y-2 rounded-md border border-white/10 bg-[#0d1b2e] p-3">
                            <div className="flex justify-between gap-3 text-sm text-white/85">
                              <p>{question.prompt}</p>
                              <strong>{result?.score ?? 0}%</strong>
                            </div>
                            {data.quiz?.answers[question.id] && (
                              <p className="border-l-2 border-white/20 bg-white/5 px-2.5 py-1.5 text-sm italic text-white/60">
                                {data.quiz.answers[question.id]}
                              </p>
                            )}
                            {result?.rationale && <p className="text-xs text-white/40">{result.rationale}</p>}
                          </li>
                        )
                      })}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm text-white/30">No quiz taken yet.</p>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="font-pixel text-[10px] uppercase text-[#F5C518]">Discussion transcript</h3>
                {data.chat.length ? (
                  <ul className="space-y-3">
                    {data.chat.map((message, index) => (
                      <li key={index} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                        <div className="max-w-[85%] rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                          <span className="mb-1 block text-[10px] uppercase text-white/30">
                            {message.role === 'user' ? 'student' : 'vega'}
                          </span>
                          <SafeMarkdown>{message.content}</SafeMarkdown>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-white/30">No discussion yet.</p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
