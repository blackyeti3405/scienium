'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Upload,
  FileText,
  MessageSquare,
  ExternalLink,
  Send,
  X,
  Loader2,
  CheckCircle2,
  RotateCcw,
  Award,
  Trash2,
  FlaskConical,
  Lock,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useLabCurrency } from '@/lib/labCurrency'
import { LAB_TYPE_LABELS, type LabType } from '@/lib/phase'
import { useConfirm } from '@/components/ui/ConfirmDialog'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Paper {
  id: string
  title: string
  authors: string[]
  status: 'uploading' | 'processing' | 'ready' | 'error'
  proficiencyDemonstrated: boolean
  fileUrl?: string
  createdAt: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_SLOTS = 25

// ─── Sub-components ───────────────────────────────────────────────────────────

function PaperSlot({
  paper,
  onUpload,
  isFirst,
  onOpenQA,
  onDelete,
}: {
  paper?: Paper
  onUpload?: (file: File) => void
  isFirst: boolean
  onOpenQA?: (paper: Paper) => void
  onDelete?: (paper: Paper) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = Array.from(e.dataTransfer.files).find((f) => f.type === 'application/pdf')
    if (file) onUpload?.(file)
  }

  // Filled slot
  if (paper) {
    return (
      <div className="flex flex-col shrink-0 border border-white/15 bg-white/3 rounded-sm overflow-hidden">
        {/* Proficiency banner — green once demonstrated, orange until then */}
        {paper.status === 'ready' &&
          (paper.proficiencyDemonstrated ? (
            <div className="bg-green-500/15 border-b border-green-500/30 px-4 py-1.5 flex items-center gap-2">
              <Award size={11} className="text-green-400 shrink-0" />
              <span className="font-pixel text-[7px] text-green-300 uppercase tracking-widest">
                Proficiency demonstrated
              </span>
            </div>
          ) : (
            <div className="bg-orange-500/20 border-b border-orange-500/30 px-4 py-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
              <span className="font-pixel text-[7px] text-orange-300 uppercase tracking-widest">
                Proficiency not demonstrated
              </span>
            </div>
          ))}

        {/* Content row */}
        <div className="flex items-center gap-3 px-4 py-3">
          <FileText size={14} className="text-white/30 shrink-0" />

          <div className="flex-1 min-w-0">
            {paper.status === 'uploading' || paper.status === 'processing' ? (
              <div className="flex items-center gap-2">
                <Loader2 size={12} className="text-blue-400 animate-spin" />
                <span className="font-pixel text-[8px] text-blue-300">
                  {paper.status === 'uploading' ? 'Uploading…' : 'Processing…'}
                </span>
              </div>
            ) : paper.status === 'error' ? (
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[8px] text-red-400">
                  Upload failed — see above for details
                </span>
              </div>
            ) : (
              <p className="text-sm text-white/80 truncate">{paper.title}</p>
            )}
            {paper.authors.length > 0 && (
              <p className="font-pixel text-[7px] text-white/30 truncate mt-0.5">
                {paper.authors.slice(0, 2).join(', ')}
                {paper.authors.length > 2 ? ' et al.' : ''}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {paper.status === 'ready' && (
              <>
                {paper.fileUrl && (
                  <a
                    href={paper.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open PDF"
                    className="flex items-center gap-1.5 font-pixel text-[7px] border border-white/20 text-white/45 px-2.5 py-1.5 hover:border-white/40 hover:text-white/70 transition-colors"
                  >
                    <ExternalLink size={10} />
                    PDF
                  </a>
                )}
                <button
                  onClick={() => onOpenQA?.(paper)}
                  title="Review Q&A"
                  className="flex items-center gap-1.5 font-pixel text-[7px] border border-[#F5C518]/40 text-[#F5C518]/70 px-2.5 py-1.5 hover:border-[#F5C518] hover:text-[#F5C518] transition-colors"
                >
                  <MessageSquare size={10} />
                  Q&amp;A
                </button>
              </>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(paper)}
                title="Delete source"
                className="flex items-center justify-center font-pixel text-[7px] border border-white/15 text-white/30 p-1.5 hover:border-red-500/50 hover:text-red-400 transition-colors"
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Empty slot — only the first empty one shows the upload button
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`border rounded-sm shrink-0 transition-colors ${
        isFirst
          ? 'border-dashed border-white/25 hover:border-white/45 cursor-pointer bg-white/2 hover:bg-white/4'
          : 'border-dashed border-white/10'
      }`}
      style={{ minHeight: 52 }}
      onClick={isFirst ? () => fileInputRef.current?.click() : undefined}
    >
      {isFirst && (
        <div className="flex items-center justify-center gap-2 h-full py-4">
          <Upload size={13} className="text-white/35" />
          <span className="font-pixel text-[8px] text-white/35">Upload source</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onUpload?.(file)
              e.target.value = ''
            }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Quiz + Q&A Panel ─────────────────────────────────────────────────────────

interface QuizQuestionView {
  id: string
  prompt: string
  focus: string
}

interface GradeResult {
  score: number
  passed: boolean
  threshold: number
  /** KP granted by this grading (0 unless this attempt beat the source's prior best). */
  kpEarned?: number
  results: { questionId: string; score: number; rationale: string }[]
}

type Phase = 'loading' | 'quiz' | 'grading' | 'results' | 'chat'

function QAPanel({
  paper,
  onClose,
  onProficiencyEarned,
}: {
  paper: Paper
  onClose: () => void
  onProficiencyEarned?: () => void
}) {
  const { addCurrency } = useLabCurrency()
  const [phase, setPhase] = useState<Phase>('loading')
  const [quiz, setQuiz] = useState<{ sessionId: string; questions: QuizQuestionView[] } | null>(
    null,
  )
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<GradeResult | null>(null)
  const [hasPastResults, setHasPastResults] = useState(false)
  const [quizError, setQuizError] = useState<string | null>(null)

  // ── Chat state (unlocked after the quiz, or if already proficient) ──
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `I've read **"${paper.title}"**. Ask me anything about it — the methodology, the findings, how it connects to your research, or the wider field.`,
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const greeting: ChatMessage = {
    role: 'assistant',
    content: `I've read **"${paper.title}"**. Ask me anything about it — the methodology, the findings, how it connects to your research, or the wider field.`,
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load saved chat history on open so the conversation persists across reopens.
  useEffect(() => {
    fetch(`/api/papers/${paper.id}/chat`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages([greeting, ...data.messages])
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // On open: if a graded quiz already exists, show those past answers + feedback
  // (they stay accessible). Otherwise generate a fresh quiz.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/papers/${paper.id}/quiz`)
        const data = await res.json()
        if (cancelled) return
        if (data.session) {
          const s = data.session
          setQuiz({ sessionId: s.sessionId, questions: s.questions })
          setAnswers(s.answers ?? {})
          setResults({
            score: s.score,
            passed: s.passed,
            threshold: s.threshold,
            results: s.results,
          })
          setHasPastResults(true)
          setPhase('results')
          return
        }
      } catch {
        // fall through to generate
      }
      if (!cancelled) generateQuiz()
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function generateQuiz() {
    setPhase('loading')
    setQuizError(null)
    setResults(null)
    setAnswers({})
    try {
      const res = await fetch(`/api/papers/${paper.id}/quiz`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load quiz')
      setQuiz({ sessionId: data.sessionId, questions: data.questions })
      setPhase('quiz')
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : 'Failed to load quiz')
      setPhase('quiz')
    }
  }

  async function submitQuiz() {
    if (!quiz) return
    setPhase('grading')
    setQuizError(null)
    try {
      const res = await fetch(`/api/papers/${paper.id}/quiz/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: quiz.sessionId,
          answers: quiz.questions.map((q) => ({ questionId: q.id, response: answers[q.id] ?? '' })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Grading failed')
      setResults(data)
      setHasPastResults(true)
      setPhase('results')
      // Reflect freshly-earned KP in the live balance so the StatusStrip animates.
      if (data.kpEarned > 0) addCurrency({ kp: data.kpEarned })
      if (data.passed) onProficiencyEarned?.()
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : 'Grading failed')
      setPhase('quiz')
    }
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending) return
    const userMsg: ChatMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)
    try {
      const res = await fetch(`/api/papers/${paper.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: (data.reply ?? '').trim() }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setSending(false)
    }
  }

  const allAnswered = !!quiz && quiz.questions.every((q) => (answers[q.id] ?? '').trim().length > 0)

  return (
    <div className="flex h-full overflow-hidden">
      {/* PDF viewer */}
      <div className="flex-1 min-w-0 border-r border-white/10 bg-black/20 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <p className="font-pixel text-[8px] text-white/40 truncate pr-4 min-w-0">{paper.title}</p>
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

        {/* Loading / grading */}
        {(phase === 'loading' || phase === 'grading') && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/40">
            <Loader2 size={20} className="animate-spin text-blue-400" />
            <span className="font-pixel text-[8px]">
              {phase === 'loading' ? 'Vega is writing your quiz…' : 'Grading your answers…'}
            </span>
          </div>
        )}

        {/* Quiz */}
        {phase === 'quiz' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {quizError && (
              <div className="m-3 px-3 py-2 bg-red-500/15 border border-red-500/30 rounded-sm flex items-center justify-between gap-2">
                <span className="font-pixel text-[7px] text-red-300">{quizError}</span>
                <button
                  onClick={generateQuiz}
                  className="font-pixel text-[7px] text-red-200 underline shrink-0"
                >
                  retry
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
              <p className="font-pixel text-[7px] text-white/35 leading-loose">
                Answer in your own words to demonstrate you understood this paper. Pass mark:{' '}
                {results?.threshold ?? 70}%.
              </p>
              {quiz?.questions.map((q, i) => (
                <div key={q.id} className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-pixel text-[8px] text-[#F5C518] shrink-0">{i + 1}.</span>
                    <p className="text-sm text-white/85 leading-relaxed">{q.prompt}</p>
                  </div>
                  <textarea
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    rows={3}
                    placeholder="Your answer…"
                    className="bg-[#0a1628] border border-white/20 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#F5C518]/60 px-3 py-2 rounded-sm resize-y"
                  />
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 p-3 shrink-0">
              <button
                onClick={submitQuiz}
                disabled={!allAnswered}
                className="w-full font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] py-2.5 rounded-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {allAnswered ? 'Submit for grading' : 'Answer all questions to submit'}
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {phase === 'results' && results && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div
              className={`m-3 px-4 py-3 rounded-sm border flex items-center gap-3 ${
                results.passed
                  ? 'bg-green-500/15 border-green-500/30'
                  : 'bg-orange-500/15 border-orange-500/30'
              }`}
            >
              {results.passed ? (
                <Award size={20} className="text-green-400 shrink-0" />
              ) : (
                <RotateCcw size={18} className="text-orange-400 shrink-0" />
              )}
              <div className="flex flex-col">
                <span
                  className={`font-pixel text-[9px] ${results.passed ? 'text-green-300' : 'text-orange-300'}`}
                >
                  {results.passed ? 'Proficiency demonstrated!' : 'Not quite — try again'}
                </span>
                <span className="font-pixel text-[7px] text-white/40 mt-1">
                  Score {results.score}% · pass {results.threshold}%
                </span>
              </div>
              {results.passed && (results.kpEarned ?? 0) > 0 && (
                <span
                  className="ml-auto font-pixel text-[9px] text-[#F5C518] shrink-0 flex items-center gap-1"
                  title="Knowledge Points earned for this source"
                >
                  +{results.kpEarned} KP
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4">
              {quiz?.questions.map((q, i) => {
                const r = results.results.find((x) => x.questionId === q.id)
                return (
                  <div key={q.id} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm text-white/70 leading-snug flex-1">
                        <span className="text-[#F5C518] font-pixel text-[8px] mr-1.5">
                          {i + 1}.
                        </span>
                        {q.prompt}
                      </p>
                      <span
                        className={`font-pixel text-[8px] shrink-0 ${
                          (r?.score ?? 0) >= 70
                            ? 'text-green-400'
                            : (r?.score ?? 0) >= 40
                              ? 'text-yellow-400'
                              : 'text-red-400'
                        }`}
                      >
                        {r?.score ?? 0}
                      </span>
                    </div>
                    {answers[q.id] && (
                      <p className="text-[13px] text-white/70 leading-relaxed pl-5 border-l border-white/10 ml-1">
                        <span className="font-pixel text-[6px] text-white/30 uppercase tracking-widest block mb-0.5">
                          Your answer
                        </span>
                        {answers[q.id]}
                      </p>
                    )}
                    {r?.rationale && (
                      <p className="text-[13px] text-white/45 leading-relaxed pl-5 italic">
                        <span className="font-pixel text-[6px] text-[#F5C518]/40 uppercase tracking-widest block mb-0.5 not-italic">
                          Vega
                        </span>
                        {r.rationale}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="border-t border-white/10 p-3 shrink-0 flex gap-2">
              {!results.passed && (
                <button
                  onClick={generateQuiz}
                  className="flex-1 font-pixel text-[8px] border border-white/20 text-white/60 py-2.5 rounded-sm hover:border-white/40 hover:text-white/80 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={11} /> Try again
                </button>
              )}
              <button
                onClick={() => setPhase('chat')}
                className="flex-1 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] py-2.5 rounded-sm hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
              >
                <MessageSquare size={11} /> Discuss this paper
              </button>
            </div>
          </div>
        )}

        {/* Chat */}
        {phase === 'chat' && (
          <>
            {paper.proficiencyDemonstrated && (
              <div className="mx-3 mt-3 px-3 py-2 bg-green-500/10 border border-green-500/25 rounded-sm flex items-center gap-2 shrink-0">
                <CheckCircle2 size={12} className="text-green-400 shrink-0" />
                <span className="font-pixel text-[7px] text-green-300">
                  Proficiency demonstrated
                </span>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <span className="font-pixel text-[6px] text-white/25 uppercase tracking-widest px-1">
                    {msg.role === 'user' ? 'You' : 'Vega'}
                  </span>
                  <div
                    className={`text-sm leading-relaxed px-3 py-2 rounded-sm max-w-full ${
                      msg.role === 'user'
                        ? 'bg-[#F5C518]/15 text-white/85 text-right'
                        : 'bg-white/6 text-white/80'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="chat-md">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex items-start gap-2">
                  <div className="bg-white/6 px-3 py-2 rounded-sm">
                    <Loader2 size={12} className="text-white/40 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t border-white/10 p-3 flex gap-2 shrink-0">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())
                }
                placeholder="Ask about this paper…"
                className="flex-1 bg-[#0a1628] border border-white/20 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#F5C518]/60 px-3 py-2 rounded-sm font-pixel text-[8px]"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="shrink-0 bg-[#F5C518] text-[#0d1b2e] p-2 rounded-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Send size={13} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Feature ─────────────────────────────────────────────────────────────

export function LiteratureFeature() {
  const router = useRouter()
  const { confirm, dialog } = useConfirm()
  const [papers, setPapers] = useState<Paper[]>([])
  const [activePaper, setActivePaper] = useState<Paper | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [topic, setTopic] = useState<string | null | undefined>(undefined) // undefined = loading
  const [idea, setIdea] = useState('')
  const [ideaBusy, setIdeaBusy] = useState(false)
  const [ideaError, setIdeaError] = useState<string | null>(null)
  const [ideaResult, setIdeaResult] = useState<{ labTypeLabel: string; rationale: string } | null>(null)
  const [researchIdea, setResearchIdea] = useState<string | null>(null)
  const [labType, setLabType] = useState<LabType | null>(null)

  useEffect(() => {
    fetch('/api/discovery/topic')
      .then((r) => r.json())
      .then((d) => setTopic(d.topic ?? null))
      .catch(() => setTopic(null))
  }, [])

  useEffect(() => {
    fetch('/api/team')
      .then((r) => r.json())
      .then((d: { researchIdea?: string | null; labType?: string | null }) => {
        setResearchIdea(d.researchIdea ?? null)
        setLabType((d.labType as LabType | null) ?? null)
      })
      .catch(() => {
        // degrade gracefully — leave both null and fall through to first-time path
      })
  }, [])

  useEffect(() => {
    fetch('/api/papers')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.papers)) {
          setPapers(
            data.papers.map((p: Record<string, unknown>) => ({
              id: p.id,
              title: p.title,
              authors: p.authors ?? [],
              status: p.status,
              proficiencyDemonstrated: Boolean(p.proficiencyDemonstrated),
              fileUrl: p.fileUrl ?? undefined,
              createdAt: p.createdAt,
            })),
          )
        }
      })
      .catch((err) => console.error('[papers] failed to load:', err))
  }, [])

  async function advancePhase() {
    if (!idea.trim()) { setIdeaError('Describe your research idea first.'); return }
    setIdeaBusy(true)
    setIdeaError(null)
    try {
      const res = await fetch('/api/team/advance-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ researchIdea: idea.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not advance')
      setIdeaResult({ labTypeLabel: data.labTypeLabel, rationale: data.rationale })
      setTimeout(() => router.refresh(), 2200)
    } catch (err) {
      setIdeaError(err instanceof Error ? err.message : 'Could not advance')
      setIdeaBusy(false)
    }
  }

  async function handleUpload(file: File) {
    setUploadError(null)
    const tempId = `temp-${Date.now()}`
    const placeholder: Paper = {
      id: tempId,
      title: file.name.replace(/\.pdf$/i, ''),
      authors: [],
      status: 'uploading',
      proficiencyDemonstrated: false,
      createdAt: new Date().toISOString(),
    }
    setPapers((prev) => [...prev, placeholder])

    try {
      const form = new FormData()
      form.append('file', file)

      console.log('[upload] POSTing', file.name, file.size, 'bytes')
      const res = await fetch('/api/papers', { method: 'POST', body: form })
      const data = await res.json()
      console.log('[upload] response', res.status, data)

      if (!res.ok) throw new Error(data.error ?? `Upload failed (${res.status})`)

      setPapers((prev) =>
        prev.map((p) =>
          p.id === tempId
            ? {
                id: data.id,
                title: data.title ?? file.name.replace(/\.pdf$/i, ''),
                authors: data.authors ?? [],
                status: 'processing',
                proficiencyDemonstrated: false,
                fileUrl: data.fileUrl,
                createdAt: data.createdAt,
              }
            : p,
        ),
      )

      pollStatus(data.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      console.error('[upload] error:', msg)
      setUploadError(msg)
      setPapers((prev) =>
        prev.map((p) => (p.id === tempId ? { ...p, status: 'error' as const } : p)),
      )
    }
  }

  const pollStatus = useCallback((paperId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/papers/${paperId}`)
        const data = await res.json()
        if (data.status === 'ready' || data.status === 'error') {
          setPapers((prev) =>
            prev.map((p) =>
              p.id === paperId
                ? {
                    ...p,
                    status: data.status,
                    title: data.title ?? p.title,
                    authors: data.authors ?? p.authors,
                  }
                : p,
            ),
          )
          clearInterval(interval)
        }
      } catch {
        clearInterval(interval)
      }
    }, 3000)
  }, [])

  async function handleDelete(paper: Paper) {
    if (!(await confirm({ title: 'Delete source', message: `Delete "${paper.title}"? This removes the source and any quiz progress.`, confirmLabel: 'Delete', tone: 'danger' }))) return
    const prev = papers
    // Optimistic removal; close the Q&A view if it was open on this paper
    setPapers((cur) => cur.filter((p) => p.id !== paper.id))
    if (activePaper?.id === paper.id) setActivePaper(null)
    try {
      const res = await fetch(`/api/papers/${paper.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
    } catch (err) {
      console.error('[papers] delete failed:', err)
      setPapers(prev) // roll back
      setUploadError('Could not delete the source. Please try again.')
    }
  }

  const readyCount = papers.filter((p) => p.status === 'ready').length
  const locked = readyCount >= TOTAL_SLOTS

  // If a paper is open in Q&A mode, show the split view
  if (activePaper) {
    return (
      <div className="h-full bg-[#0d1b2e] text-white">
        {dialog}
        <QAPanel
          paper={activePaper}
          onClose={() => setActivePaper(null)}
          onProficiencyEarned={() => {
            setPapers((prev) =>
              prev.map((p) =>
                p.id === activePaper.id ? { ...p, proficiencyDemonstrated: true } : p,
              ),
            )
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0d1b2e] text-white">
      {dialog}
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <div>
          <h2 className="font-pixel text-[10px] text-white">Literature Review</h2>
          {topic ? (
            <p className="font-pixel text-[7px] text-[#F5C518]/70 mt-1 max-w-[260px] truncate">
              🎯 {topic}
            </p>
          ) : (
            <p className="font-pixel text-[7px] text-white/35 mt-1">
              Upload and review 25 sources to advance your lab
            </p>
          )}
        </div>
        <div className="text-right">
          <span className="font-pixel text-[18px] text-[#F5C518]">{readyCount}</span>
          <span className="font-pixel text-[10px] text-white/30"> / 25</span>
        </div>
      </div>

      {/* Idea submission box — shown once all 25 sources are in */}
      {locked && (() => {
        const ideaSubmitted = !!researchIdea || !!ideaResult
        // Display text: prefer the persisted value; for just-submitted-this-session fallback to `idea`
        const ideaText = researchIdea ?? idea
        // Lab type label: prefer fresh submit result, otherwise map the persisted enum
        const labTypeLabel = ideaResult?.labTypeLabel ?? (labType ? LAB_TYPE_LABELS[labType] : null)

        return (
          <div className="mx-6 mt-4 mb-4 rounded-sm border border-[#F5C518]/35 bg-[#F5C518]/[0.06] px-5 py-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <FlaskConical size={13} className="text-[#F5C518] shrink-0" />
              <span className="font-pixel text-[8px] text-[#F5C518]">
                {ideaSubmitted
                  ? 'Literature review complete — lab assigned'
                  : 'Literature review complete — describe your project in one sentence'}
              </span>
            </div>

            {ideaSubmitted ? (
              <div className="flex flex-col gap-2">
                {ideaText && (
                  <span className="font-pixel text-[8px] text-white/80 leading-relaxed">
                    {ideaText}
                  </span>
                )}
                <span className="font-pixel text-[8px] text-green-300">
                  Lab assigned: <strong>{labTypeLabel}</strong>
                  {ideaResult?.rationale ? ` — ${ideaResult.rationale}` : ''}
                </span>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !ideaBusy && advancePhase()}
                  maxLength={500}
                  disabled={ideaBusy}
                  placeholder="e.g. I'm investigating how soil pH affects plant growth rate…"
                  className="flex-1 bg-[#0a1628] border border-white/20 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#F5C518]/60 px-3 py-2 rounded-sm font-pixel text-[8px]"
                />
                <button
                  onClick={advancePhase}
                  disabled={ideaBusy || !idea.trim()}
                  className="shrink-0 flex items-center gap-1.5 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {ideaBusy ? <Loader2 size={11} className="animate-spin" /> : <FlaskConical size={11} />}
                  {ideaBusy ? 'Classifying…' : 'Submit'}
                </button>
              </div>
            )}

            {ideaError && (
              <span className="font-pixel text-[7px] text-red-400">{ideaError}</span>
            )}
          </div>
        )
      })()}

      {/* No-topic warning — only shown when not yet locked */}
      {!locked && topic === null && (
        <div className="mx-6 mt-3 px-4 py-2.5 bg-[#F5C518]/8 border border-[#F5C518]/25 rounded-sm flex items-start gap-2.5">
          <span className="font-pixel text-[8px] text-[#F5C518]/60 shrink-0 mt-0.5">!</span>
          <p className="font-pixel text-[7px] text-[#F5C518]/60 leading-relaxed">
            Set your final research topic in Discovery first. Once set, Vega will check that each source you upload is relevant.
          </p>
        </div>
      )}

      {/* Upload error banner */}
      {uploadError && (
        <div className="mx-6 mt-3 px-4 py-2.5 bg-red-500/15 border border-red-500/30 rounded-sm flex items-start justify-between gap-3">
          <span className="font-pixel text-[8px] text-red-300 leading-relaxed">{uploadError}</span>
          <button
            onClick={() => setUploadError(null)}
            className="text-red-400 hover:text-red-200 shrink-0 mt-0.5"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Lock notice + progress bar */}
      {locked ? (
        <div className="flex items-center gap-2 px-6 py-3 bg-white/[0.02] border-t border-white/8 shrink-0">
          <Lock size={10} className="text-white/25 shrink-0" />
          <span className="font-pixel text-[7px] text-green-300/70">Sources locked — 25/25</span>
          <div className="flex-1 h-1.5 rounded-full bg-green-400 ml-2" />
        </div>
      ) : (
        <div className="h-1 bg-white/8 shrink-0">
          <div
            className="h-full bg-[#F5C518] transition-all duration-500"
            style={{ width: `${(readyCount / TOTAL_SLOTS) * 100}%` }}
          />
        </div>
      )}

      {/* Slots list */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
        {papers.map((paper) => (
          <PaperSlot
            key={paper.id}
            paper={paper}
            isFirst={false}
            onOpenQA={setActivePaper}
            onDelete={locked ? undefined : handleDelete}
          />
        ))}

        {/* Empty upload slots only shown while not yet locked */}
        {!locked && Array.from({ length: TOTAL_SLOTS - papers.length }).map((_, i) => (
          <PaperSlot
            key={`empty-${i}`}
            isFirst={i === 0}
            onUpload={i === 0 ? handleUpload : undefined}
          />
        ))}
      </div>
    </div>
  )
}
