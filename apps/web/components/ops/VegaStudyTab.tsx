'use client'

import { useState, useRef, useEffect } from 'react'
import { Brain, AlertTriangle } from 'lucide-react'
import { ChatComposer, ChatMessageList, type ChatThreadMessage } from '@/components/ui/ChatThread'

type ChatMessage = ChatThreadMessage

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
 * study chat grounded in the team's own project. The message-list/composer
 * markup is the shared `ChatThread` presentation (same as Literature Q&A's
 * PaperChat); the state here stays local — greeting, load-history effect,
 * sendMessage, autoscroll, and the pristine-guard below are deliberately
 * different from `usePaperChat` (team-shared thread, disabled-while-sending
 * input, starter prompts, error banner) and are not merged into it.
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
          // Apply ONLY while the thread is still pristine (just the greeting).
          // This GET fires at mount with pre-send data; a student who types
          // fast can have sent a turn before it resolves, and replacing state
          // unconditionally would clobber their message and its reply with the
          // stale snapshot — the message would visibly vanish. Their turns are
          // already persisted server-side, so the next reopen shows them.
          setMessages((prev) =>
            prev.length <= 1 ? [GREETING, ...data.messages] : prev,
          )
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
        // Send only the new user turn — the server owns the shared thread history.
        body: JSON.stringify({ message: content }),
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
        <ChatMessageList messages={messages} sending={sending} messagesEndRef={messagesEndRef} />
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

      <ChatComposer
        input={input}
        onInputChange={setInput}
        onSend={() => sendMessage()}
        sending={sending}
        placeholder="Ask Vega about your project…"
        disableInputWhileSending
      />
    </div>
  )
}
