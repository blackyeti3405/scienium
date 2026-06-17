'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, FileText, MessageSquare, ExternalLink, Send, X, Loader2 } from 'lucide-react'

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
}: {
  paper?: Paper
  onUpload?: (file: File) => void
  isFirst: boolean
  onOpenQA?: (paper: Paper) => void
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
      <div className="flex flex-col border border-white/15 bg-white/3 rounded-sm overflow-hidden">
        {/* Proficiency banner */}
        {!paper.proficiencyDemonstrated && (
          <div className="bg-orange-500/20 border-b border-orange-500/30 px-4 py-1.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
            <span className="font-pixel text-[7px] text-orange-300 uppercase tracking-widest">
              Proficiency not demonstrated
            </span>
          </div>
        )}

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
            ) : (
              <p className="text-sm text-white/80 truncate">{paper.title}</p>
            )}
            {paper.authors.length > 0 && (
              <p className="font-pixel text-[7px] text-white/30 truncate mt-0.5">
                {paper.authors.slice(0, 2).join(', ')}{paper.authors.length > 2 ? ' et al.' : ''}
              </p>
            )}
          </div>

          {/* Action buttons */}
          {paper.status === 'ready' && (
            <div className="flex items-center gap-2 shrink-0">
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
            </div>
          )}
        </div>
      </div>
    )
  }

  // Empty slot — only the first empty one shows the upload button
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`border rounded-sm transition-colors ${
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

// ─── Q&A Chat Panel ───────────────────────────────────────────────────────────

function QAPanel({
  paper,
  onClose,
  onProficiencyEarned,
}: {
  paper: Paper
  onClose: () => void
  onProficiencyEarned?: () => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `I've read **"${paper.title}"**. Ask me anything about it — I can quiz you on the methodology, key findings, relevance to your research topic, or help you think through how it connects to your other sources.`,
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
      const rawReply: string = data.reply ?? ''

      // Strip hidden signal before displaying; let parent know proficiency was earned
      const proficiencyEarned = rawReply.includes('PROFICIENCY_DEMONSTRATED')
      const displayReply = rawReply.replace(/\nPROFICIENCY_DEMONSTRATED\s*$/, '').trim()

      setMessages((prev) => [...prev, { role: 'assistant', content: displayReply }])
      if (proficiencyEarned) onProficiencyEarned?.()
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* PDF viewer */}
      <div className="flex-1 border-r border-white/10 bg-black/20 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <p className="font-pixel text-[8px] text-white/40 truncate pr-4">{paper.title}</p>
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
          <iframe
            src={paper.fileUrl}
            className="flex-1 w-full"
            title="Paper PDF"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/20">
            <p className="font-pixel text-[8px] text-center px-6">PDF not available</p>
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="w-80 flex flex-col shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <span className="font-pixel text-[8px] text-white/50">Review Q&amp;A</span>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={13} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <span className="font-pixel text-[6px] text-white/25 uppercase tracking-widest px-1">
                {msg.role === 'user' ? 'You' : 'Nova'}
              </span>
              <div
                className={`text-sm leading-relaxed px-3 py-2 rounded-sm max-w-full ${
                  msg.role === 'user'
                    ? 'bg-[#F5C518]/15 text-white/85 text-right'
                    : 'bg-white/6 text-white/80'
                }`}
              >
                {msg.content}
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

        {/* Input */}
        <div className="border-t border-white/10 p-3 flex gap-2 shrink-0">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="Ask about this paper…"
            className="flex-1 bg-white/6 text-sm text-white/80 placeholder-white/25 outline-none px-3 py-2 rounded-sm font-pixel text-[8px]"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="shrink-0 bg-[#F5C518] text-[#0d1b2e] p-2 rounded-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Feature ─────────────────────────────────────────────────────────────

export function LiteratureFeature() {
  const [papers, setPapers] = useState<Paper[]>([])
  const [activePaper, setActivePaper] = useState<Paper | null>(null)

  async function handleUpload(file: File) {
    // Optimistic placeholder while uploading
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

      const res = await fetch('/api/papers', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Upload failed')

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
            : p
        )
      )

      // Poll for processing completion
      pollStatus(data.id)
    } catch {
      setPapers((prev) =>
        prev.map((p) => (p.id === tempId ? { ...p, status: 'error' as const } : p))
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
                : p
            )
          )
          clearInterval(interval)
        }
      } catch {
        clearInterval(interval)
      }
    }, 3000)
  }, [])

  const readyCount = papers.filter((p) => p.status === 'ready').length
  const firstEmptyIndex = papers.length // index of the first slot with no paper

  // If a paper is open in Q&A mode, show the split view
  if (activePaper) {
    return (
      <div className="h-full bg-[#0d1b2e] text-white">
        <QAPanel
          paper={activePaper}
          onClose={() => setActivePaper(null)}
          onProficiencyEarned={() => {
            setPapers((prev) =>
              prev.map((p) =>
                p.id === activePaper.id ? { ...p, proficiencyDemonstrated: true } : p
              )
            )
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0d1b2e] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <div>
          <h2 className="font-pixel text-[10px] text-white">Literature Review</h2>
          <p className="font-pixel text-[7px] text-white/35 mt-1">
            Upload and review 25 sources to advance your lab
          </p>
        </div>
        <div className="text-right">
          <span className="font-pixel text-[18px] text-[#F5C518]">{readyCount}</span>
          <span className="font-pixel text-[10px] text-white/30"> / 25</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/8 shrink-0">
        <div
          className="h-full bg-[#F5C518] transition-all duration-500"
          style={{ width: `${(readyCount / TOTAL_SLOTS) * 100}%` }}
        />
      </div>

      {/* Slots list */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
        {/* Render filled slots */}
        {papers.map((paper) => (
          <PaperSlot
            key={paper.id}
            paper={paper}
            isFirst={false}
            onOpenQA={setActivePaper}
          />
        ))}

        {/* Render remaining empty slots */}
        {Array.from({ length: TOTAL_SLOTS - papers.length }).map((_, i) => (
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
