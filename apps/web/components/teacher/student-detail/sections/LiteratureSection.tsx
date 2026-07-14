'use client'

import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'
import { PaperQAPanel } from '../PaperQAPanel'
import { Empty } from '../shared'
import type { Overview } from '../types'

export function LiteratureSection({ overview }: { overview: Overview }) {
  const { papers, litProgress, studentProficiencies } = overview
  const studentId = overview.student.id
  const demonstratedCount = studentProficiencies.filter((p) => p.demonstrated).length

  const [openPaperId, setOpenPaperId] = useState<string | null>(null)
  const profMap = new Map(studentProficiencies.map((sp) => [sp.paper.id, sp]))

  const pct = Math.min(100, (litProgress.sourceCount / litProgress.sourceTarget) * 100)

  return (
    <div className="space-y-4">
      {/* Source gate progress */}
      <Card label="Source gate">
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-white" data-testid="source-count">
              {litProgress.sourceCount}
            </span>
            <span className="text-white/40 text-sm">/ {litProgress.sourceTarget} sources ready</span>
          </div>
          <PixelProgressBar value={pct} />
          <p className="text-sm text-white/50">
            <span className="text-white font-medium" data-testid="proficiency-count">
              {demonstratedCount}
            </span>{' '}
            of {litProgress.sourceTarget} demonstrated by this student
          </p>
        </div>
      </Card>

      {/* Per-source list */}
      {papers.length > 0 && (
        <Card label={`Sources · ${papers.length}`}>
          <ul className="space-y-2">
            {papers.map((p) => {
              const prof = profMap.get(p.id) ?? null
              const authorStr =
                p.authors.length === 0
                  ? 'No authors'
                  : p.authors.length <= 2
                  ? p.authors.join(', ')
                  : `${p.authors.slice(0, 2).join(', ')} et al.`

              return (
                <li
                  key={p.id}
                  className="flex items-start gap-3 border border-white/10 bg-[#0d1b2e] rounded-md px-3 py-2.5"
                >
                  {/* Status dot */}
                  <span
                    className={`mt-1.5 w-2 h-2 shrink-0 rounded-full ${
                      p.status === 'ready'
                        ? 'bg-emerald-400'
                        : p.status === 'error'
                        ? 'bg-red-400'
                        : 'bg-white/30'
                    }`}
                  />

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm text-white/85 leading-snug">{p.title}</p>
                    <p className="text-xs text-white/40">{authorStr}</p>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    {/* Proficiency badge */}
                    {prof ? (
                      prof.demonstrated ? (
                        <span className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5 whitespace-nowrap">
                          Proficient · {prof.bestScore}%
                        </span>
                      ) : (
                        <span className="text-xs text-white/35 bg-white/5 border border-white/10 rounded-full px-2 py-0.5 whitespace-nowrap">
                          Not demonstrated
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-white/25 whitespace-nowrap">
                        No attempt
                      </span>
                    )}

                    {/* Q&A button */}
                    <button
                      type="button"
                      onClick={() => setOpenPaperId(p.id)}
                      className="inline-flex items-center gap-1 text-xs text-[#F5C518] hover:brightness-110 transition-all cursor-pointer"
                      title="View quiz results and chat transcript"
                    >
                      <MessageSquare size={12} /> Q&amp;A
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {papers.length === 0 && (
        <Card>
          <Empty>No sources added yet.</Empty>
        </Card>
      )}

      {/* Q&A modal */}
      {openPaperId && (
        <PaperQAPanel
          studentId={studentId}
          paperId={openPaperId}
          onClose={() => setOpenPaperId(null)}
        />
      )}
    </div>
  )
}
