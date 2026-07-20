'use client'

import { CheckCircle2 } from 'lucide-react'
import { ChatComposer, ChatMessageList } from '@/components/ui/ChatThread'
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
        <ChatMessageList messages={messages} sending={sending} messagesEndRef={messagesEndRef} />
      </div>
      <ChatComposer
        input={input}
        onInputChange={setInput}
        onSend={sendMessage}
        sending={sending}
        placeholder="Ask about this paper…"
        sendAriaLabel="Send message"
      />
    </>
  )
}
