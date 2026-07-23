'use client'

import { PixelSkeleton } from '@/components/ui/PixelSkeleton'
import { BusyButton } from '@/components/ui/BusyButton'

/**
 * The final-research-topic bar under the explorer header: view / edit / choose
 * states for the team's locked topic. Pure presentation — extracted verbatim
 * from `DiscoveryFeature`; state lives in `useFinalTopic`.
 */
export function FinalTopicBar({
  finalTopic,
  topicLoaded,
  editing,
  draft,
  onDraftChange,
  saving,
  onSave,
  onBeginEdit,
  onCancelEdit,
  chooseDraft,
  saveError,
}: {
  finalTopic: string | null
  topicLoaded: boolean
  editing: boolean
  draft: string
  onDraftChange: (draft: string) => void
  saving: boolean
  onSave: (topic: string) => void
  onBeginEdit: (initialDraft: string) => void
  onCancelEdit: () => void
  /** Draft prefill for the "Choose your final research topic" CTA (the current node's title). */
  chooseDraft: string
  /** Save failure (rate limit / validation / stale session) — the topic did NOT change. */
  saveError?: string | null
}) {
  return (
    <div className="border-b border-[#F5C518]/20 bg-[#F5C518]/[0.06] px-4 py-2.5 shrink-0">
      {editing && saveError && (
        <p className="mb-1.5 text-[12px] text-red-400 flex items-center gap-1.5">
          <span aria-hidden>⚠</span> {saveError}
        </p>
      )}
      {editing ? (
        <div className="flex items-center gap-2">
          <span className="text-sm shrink-0">🎯</span>
          <input
            autoFocus
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) onSave(draft.trim())
              if (e.key === 'Escape') onCancelEdit()
            }}
            placeholder="State your final research topic…"
            className="flex-1 bg-[#0a1628] border border-white/20 text-sm text-white placeholder:text-white/40 rounded-sm px-2.5 py-1.5 outline-none focus:border-[#F5C518]/60"
          />
          <BusyButton
            busy={saving}
            busyLabel="Saving…"
            showSpinner={false}
            onClick={() => draft.trim() && onSave(draft.trim())}
            disabled={!draft.trim()}
            className="font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] rounded-sm px-3 py-2 hover:brightness-110 disabled:opacity-40 transition-all"
          >
            Save
          </BusyButton>
          <button onClick={onCancelEdit} className="font-pixel text-[7px] text-white/40 hover:text-white/70">
            Cancel
          </button>
        </div>
      ) : finalTopic ? (
        <div className="flex items-center gap-2">
          <span className="text-sm shrink-0">🎯</span>
          <span className="font-pixel text-[7px] text-[#F5C518]/70 uppercase tracking-widest shrink-0">Final topic</span>
          <span className="text-sm text-white/90 flex-1 truncate">{finalTopic}</span>
          <button
            onClick={() => onBeginEdit(finalTopic)}
            className="font-pixel text-[7px] text-white/40 hover:text-white/70 shrink-0"
          >
            Change
          </button>
        </div>
      ) : !topicLoaded ? (
        // False-prompt fix: don't show "Choose your final research topic"
        // until the /api/discovery/topic fetch actually resolves null.
        <PixelSkeleton variant="line" h="h-4" w="w-56" />
      ) : (
        <button
          onClick={() => onBeginEdit(chooseDraft)}
          className="flex items-center gap-2 font-pixel text-[8px] text-[#F5C518]/80 hover:text-[#F5C518] transition-colors"
        >
          <span className="text-sm">🎯</span>
          Choose your final research topic
        </button>
      )}
    </div>
  )
}
