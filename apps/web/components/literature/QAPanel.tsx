'use client'

import { ExternalLink, X, Award, MessageSquare } from 'lucide-react'
import type { Paper } from './types'
import { CredibilityBadge } from './CredibilityBadge'
import { VettingChecklist } from './VettingChecklist'
import { usePaperQuiz } from './usePaperQuiz'
import { usePaperChat } from './usePaperChat'
import { QuizPanel } from './QuizPanel'
import { PaperChat } from './PaperChat'

/**
 * Split Q&A view for one paper: the PDF (left) and, on the right, the
 * comprehension quiz + chat-with-Vega workspace. Owns both feature hooks
 * unconditionally so the `phase` state machine and chat history persist across
 * the results/chat tab switch exactly as when this was one component.
 */
export function QAPanel({
  paper,
  onClose,
  onProficiencyEarned,
}: {
  paper: Paper
  onClose: () => void
  onProficiencyEarned?: () => void
}) {
  const quiz = usePaperQuiz(paper, onProficiencyEarned)
  const chat = usePaperChat(paper)
  const { phase, setPhase, hasPastResults } = quiz

  return (
    <div className="flex h-full overflow-hidden">
      {/* PDF viewer */}
      <div className="flex-1 min-w-0 border-r border-white/10 bg-black/20 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 min-w-0 pr-4">
            <p className="font-pixel text-[8px] text-white/40 truncate min-w-0">{paper.title}</p>
            <CredibilityBadge tier={paper.credibilityTier} />
          </div>
          {paper.fileUrl && (
            <a
              href={paper.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-pixel text-[7px] text-white/30 hover:text-white/60 flex items-center gap-1 shrink-0"
            >
              <ExternalLink size={9} />
              open
            </a>
          )}
        </div>
        <VettingChecklist tier={paper.credibilityTier} />
        {paper.fileUrl ? (
          <iframe src={paper.fileUrl} className="flex-1 w-full" title="Paper PDF" />
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/20">
            <p className="font-pixel text-[8px] text-center px-6">PDF not available</p>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="w-96 flex flex-col shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          {/* Tabs between graded results and chat once a quiz has been graded;
              otherwise just a static label for the loading/quiz/grading phases. */}
          {hasPastResults && (phase === 'results' || phase === 'chat') ? (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPhase('results')}
                className={`font-pixel text-[8px] flex items-center gap-1 transition-colors ${
                  phase === 'results' ? 'text-[#F5C518]' : 'text-white/40 hover:text-white/70'
                }`}
              >
                <Award size={9} /> Quiz results
              </button>
              <button
                onClick={() => setPhase('chat')}
                className={`font-pixel text-[8px] flex items-center gap-1 transition-colors ${
                  phase === 'chat' ? 'text-[#F5C518]' : 'text-white/40 hover:text-white/70'
                }`}
              >
                <MessageSquare size={9} /> Discuss with Vega
              </button>
            </div>
          ) : (
            <span className="font-pixel text-[8px] text-white/50">Comprehension Quiz</span>
          )}
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={13} />
          </button>
        </div>

        {phase === 'chat' ? <PaperChat paper={paper} {...chat} /> : <QuizPanel {...quiz} />}
      </div>
    </div>
  )
}
