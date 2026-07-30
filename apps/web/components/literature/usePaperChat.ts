'use client'

import { useState, useRef, useEffect } from 'react'
import type { Paper, ChatMessage } from './types'

/**
 * Chat-with-Vega state for one paper's Q&A panel: message history (seeded with a
 * greeting, then hydrated from saved history), the composer, and send. Extracted
 * verbatim from `QAPanel`; called unconditionally by `QAPanel` so the
 * conversation persists across the quiz/chat tab switch exactly as before.
 */
export function usePaperChat(paper: Paper) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `I've read **"${paper.title}"**. Ask me anything about it — the methodology, the findings, how it connects to your research, or the wider field.`,
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
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
          // Apply ONLY while the thread is still pristine (just the greeting).
          // This GET fires at mount with pre-send data; a student who types
          // fast can have sent a turn before it resolves, and replacing state
          // unconditionally clobbered their message and its reply with the
          // stale snapshot — the message visibly vanished. Their turns are
          // already persisted server-side, so the next reopen shows them.
          // Same guard as VegaStudyTab, which is where it was first needed.
          setMessages((prev) => (prev.length <= 1 ? [greeting, ...data.messages] : prev))
        }
      })
      .catch(() =>
        setLoadError('Could not load this paper’s chat history. You can still ask questions.'),
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        // Send only the new user turn — the server owns the history.
        body: JSON.stringify({ message: text }),
      })
      if (!res.ok) throw new Error(`chat failed (${res.status})`)
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: (data.reply ?? '').trim() }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
      // Restore the draft so a failed send never eats what the student typed
      // (UX-3) — unless they've already started composing something new.
      setInput((cur) => (cur.trim() ? cur : text))
    } finally {
      setSending(false)
    }
  }

  return { messages, input, setInput, sending, sendMessage, messagesEndRef, loadError }
}
