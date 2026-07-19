'use client'

import { CheckCircle2, Send } from 'lucide-react'
import { SafeMarkdown } from '@/components/ui/SafeMarkdown'
import type { Paper } from './types'
import type { usePaperChat } from './usePaperChat'

/**
 * Chat-with-Vega column of the Q&A panel. Presentational — all state lives in
 * `usePaperChat` (owned by `QAPanel`), so switching to the quiz tab and back
 * keeps the conversation intact.
 */
export function PaperChat({
  paper,
  messages,
  input,
  setInput,
  sending,
  sendMessage,
  messagesEndRef,
}: { paper: Paper } & ReturnType<typeof usePaperChat>) {
  return (
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
          aria-label="Send message"
          className="shrink-0 bg-[#F5C518] text-[#0d1b2e] p-2 rounded-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Send size={13} />
        </button>
      </div>
    </>
  )
}
