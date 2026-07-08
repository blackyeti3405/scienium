'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Brain, AlertTriangle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const GREETING: ChatMessage = {
  role: 'assistant',
  content:
    "I'm Vega, your study companion for this project. Ask me to explain a concept, quiz you on your topic, or pose the kind of question a judge might ask about your method — I'll coach you toward the answer rather than write it for you.",
}

const STARTER_PROMPTS = [
  'Quiz me on my topic',
  'What would a judge ask about my method?',
  'Explain a concept in my field',
]

/**
 * "Study with Vega" Ops Hub tab (Feature F18) — a persistent, team-shared
 * study chat grounded in the team's own project. Chat UI shape is lifted
 * from LiteratureFeature.tsx's paper-chat panel (greeting, load-history
 * effect, sendMessage, `.chat-md` render loop, autoscroll, disabled-while-
 * sending input) — same pattern, ops-* pixel chrome instead of the reader
 * layout.
 */
export function VegaStudyTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load the team's saved study thread on open so the conversation persists
  // across reopens (and is shared across teammates).
  useEffect(() => {
    fetch('/api/ops/vega-study')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages([GREETING, ...data.messages])
        }
      })
      .catch(() => setLoadError('Could not load your study history. You can still chat.'))
  }, [])

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim()
    if (!content || sending) return
    const userMsg: ChatMessage = { role: 'user', content }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)
    try {
      const res = await fetch('/api/ops/vega-study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Chat failed')
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

  return (
    <div className="flex flex-col flex-1 min-h-0" data-testid="vega-study-tab">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 shrink-0">
        <Brain size={14} className="text-[#7ff2e3]" />
        <span className="font-pixel text-[8px] text-white/70 uppercase tracking-widest">Study with Vega</span>
      </div>

      {loadError && (
        <div className="ops-error mx-4 mt-3 shrink-0">
          <AlertTriangle size={11} className="shrink-0" />
          <span className="font-pixel text-[7px]">{loadError}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0">
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
            <div className="bg-white/6 rounded-sm clr-msg__typing">
              <span /> <span /> <span />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2 shrink-0">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setInput(prompt)}
              disabled={sending}
              className="font-pixel text-[6px] px-2.5 py-1.5 rounded-full border border-[#F5C518]/30 text-[#F5C518]/80 bg-[#F5C518]/[0.06] hover:bg-[#F5C518]/15 transition-colors disabled:opacity-40"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-white/10 p-3 flex gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) =>
            e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())
          }
          disabled={sending}
          placeholder="Ask Vega about your project…"
          className="flex-1 bg-[#0a1628] border border-white/20 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#F5C518]/60 px-3 py-2 rounded-sm font-pixel text-[8px] disabled:opacity-60"
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || sending}
          className="shrink-0 bg-[#F5C518] text-[#0d1b2e] p-2 rounded-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  )
}
