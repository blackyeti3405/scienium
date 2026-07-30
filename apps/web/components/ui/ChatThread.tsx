'use client'

import type { RefObject } from 'react'
import { Send } from 'lucide-react'
import { SafeMarkdown } from '@/components/ui/SafeMarkdown'

export interface ChatThreadMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Message-list + typing-indicator markup shared by every "server-owned chat
 * thread" panel (Literature Q&A's PaperChat, the Vega study companion tab) —
 * generalized from PaperChat.tsx's render loop. Pure presentation; callers own
 * the message state.
 */
export function ChatMessageList({
  messages,
  sending,
  messagesEndRef,
}: {
  messages: ChatThreadMessage[]
  sending: boolean
  messagesEndRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <>
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
        >
          <span className="font-pixel text-[6px] text-white/40 uppercase tracking-widest px-1">
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
                <SafeMarkdown>{msg.content}</SafeMarkdown>
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
    </>
  )
}

/**
 * The input + send-button bar shared by the same chat-thread panels —
 * generalized from PaperChat.tsx's composer. `sendAriaLabel` and
 * `disableInputWhileSending` cover the two consumers' small, deliberate
 * divergences (PaperChat labels its send button and never disables the
 * input; VegaStudyTab does the opposite) without forking the markup.
 */
export function ChatComposer({
  input,
  onInputChange,
  onSend,
  sending,
  placeholder,
  // Defaulted at the seam (§0.9 Row B): the send button is icon-only, so an
  // omitted label leaves it with no accessible name at all — which is what
  // VegaStudyTab shipped. A default fixes every consumer, present and future,
  // in one line; callers still override it where a more specific name helps.
  sendAriaLabel = 'Send message',
  disableInputWhileSending = false,
}: {
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  sending: boolean
  placeholder: string
  sendAriaLabel?: string
  disableInputWhileSending?: boolean
}) {
  return (
    <div className="border-t border-white/10 p-3 flex gap-2 shrink-0">
      <input
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), onSend())}
        disabled={disableInputWhileSending ? sending : undefined}
        placeholder={placeholder}
        className={`flex-1 bg-[#0a1628] border border-white/20 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#F5C518]/60 px-3 py-2 rounded-sm font-pixel text-[8px]${disableInputWhileSending ? ' disabled:opacity-60' : ''}`}
      />
      <button
        onClick={onSend}
        disabled={!input.trim() || sending}
        aria-label={sendAriaLabel}
        className="shrink-0 bg-[#F5C518] text-[#0d1b2e] p-2 rounded-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <Send size={13} />
      </button>
    </div>
  )
}
