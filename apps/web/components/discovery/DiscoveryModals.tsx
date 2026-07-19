'use client'

import { Toast } from '@/components/ui/Toast'
import { LabeledLoader } from '@/components/ui/LabeledLoader'

/**
 * Shared Discovery overlays, rendered over whichever screen (home / explorer)
 * is active: the "+N KP" pill, the topic-change confirm modal, and the
 * wipe-result / promote / new-tree / interest-connection notices. Pure
 * presentation — all state stays in `DiscoveryFeature` + its hooks.
 */
export function DiscoveryModals({
  kpPill,
  sourceAddError,
  topicConfirm,
  topicRemovalConfirm,
  savingTopic,
  onCancelTopicChange,
  onConfirmTopicChange,
  onCancelTopicRemoval,
  onConfirmTopicRemoval,
  topicWipeResult,
  onDismissWipeResult,
  promoteMsg,
  onDismissPromoteMsg,
  newTreeHint,
  interestConnectMsg,
  onDismissInterestConnect,
}: {
  kpPill: { amount: number; nonce: number } | null
  sourceAddError: { nonce: number } | null
  topicConfirm: { newTopic: string; paperCount: number } | null
  topicRemovalConfirm: { newTopic: string; papers: { id: string; title: string }[] } | null
  savingTopic: boolean
  onCancelTopicChange: () => void
  onConfirmTopicChange: (newTopic: string) => void
  onCancelTopicRemoval: () => void
  onConfirmTopicRemoval: (newTopic: string, paperIds: string[]) => void
  topicWipeResult: { removedCount: number; removedTitles: string[] } | null
  onDismissWipeResult: () => void
  promoteMsg: { text: string; ok: boolean } | null
  onDismissPromoteMsg: () => void
  newTreeHint: boolean
  interestConnectMsg: string | null
  onDismissInterestConnect: () => void
}) {
  return (
    <>
      {/* "+N KP" earned pill (first-visit / reflection / topic-lock awards) */}
      {kpPill && (
        <Toast tone="kp" position="top" nonce={kpPill.nonce}>
          +{kpPill.amount} KP
        </Toast>
      )}
      {/* Add-paper-from-search failure (UX-1) — never fail silently on wifi blips */}
      {sourceAddError && (
        <Toast tone="error" position="top" nonce={sourceAddError.nonce}>
          Couldn&apos;t add that paper — check your connection and try again
        </Toast>
      )}
      {/* Topic-change confirmation — the confirmed path is a batch LLM sweep
          re-checking every source's relevance against the new topic, so once
          submitted it shows a Vega labeled loader instead of a button-sized spinner. */}
      {topicConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#0d1b2e] border border-white/20 rounded-sm p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
            {savingTopic ? (
              <LabeledLoader
                label="Vega is re-checking your papers…"
                sublabel="This can take up to 30 seconds."
                tone="vega"
                fill="inline"
              />
            ) : (
              <>
                <h3 className="font-pixel text-[9px] text-white">Change research topic?</h3>
                <div className="text-[13px] text-white/70 leading-relaxed flex flex-col gap-2">
                  <p>
                    You&apos;re changing your topic to{' '}
                    <span className="text-[#F5C518] font-medium">&ldquo;{topicConfirm.newTopic}&rdquo;</span>.
                  </p>
                  <p>
                    You have{' '}
                    <span className="text-white font-medium">{topicConfirm.paperCount} source{topicConfirm.paperCount !== 1 ? 's' : ''}</span>{' '}
                    in your literature review. Sources that aren&apos;t relevant to your new topic will be removed. Sources that apply to both topics will be kept.
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={onCancelTopicChange}
                    className="flex-1 font-pixel text-[8px] border border-white/20 text-white/60 py-2.5 hover:border-white/40 hover:text-white/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => onConfirmTopicChange(topicConfirm.newTopic)}
                    className="flex-1 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] py-2.5 hover:brightness-110 disabled:opacity-50 transition-all"
                  >
                    Change topic
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Second phase: the exact sources proposed for removal. Listing them by
          title is the safeguard — relevance is judged from paper text we don't
          control, so the student is the one who authorizes each removal. */}
      {topicRemovalConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#0d1b2e] border border-white/20 rounded-sm p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
            <h3 className="font-pixel text-[9px] text-white">Remove these sources?</h3>
            <div className="text-[13px] text-white/70 leading-relaxed flex flex-col gap-2">
              <p>
                These{' '}
                <span className="text-white font-medium">
                  {topicRemovalConfirm.papers.length} source
                  {topicRemovalConfirm.papers.length !== 1 ? 's' : ''}
                </span>{' '}
                don&apos;t look relevant to{' '}
                <span className="text-[#F5C518] font-medium">
                  &ldquo;{topicRemovalConfirm.newTopic}&rdquo;
                </span>{' '}
                and will be permanently deleted:
              </p>
              <ul className="max-h-40 overflow-y-auto flex flex-col gap-1 border border-white/10 rounded-sm p-2">
                {topicRemovalConfirm.papers.map((p) => (
                  <li key={p.id} className="text-[12px] text-white/80 truncate">
                    • {p.title}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={onCancelTopicRemoval}
                className="flex-1 font-pixel text-[8px] border border-white/20 text-white/60 py-2.5 hover:border-white/40 hover:text-white/80 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={savingTopic}
                onClick={() =>
                  onConfirmTopicRemoval(
                    topicRemovalConfirm.newTopic,
                    topicRemovalConfirm.papers.map((p) => p.id),
                  )
                }
                className="flex-1 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] py-2.5 hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {savingTopic ? 'Removing…' : 'Remove & change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wipe result notification */}
      {topicWipeResult && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#0d1b2e] border border-orange-500/40 rounded-sm px-4 py-3 max-w-sm w-full mx-4 flex items-start gap-3">
          <span className="text-orange-400 text-base shrink-0">⚠</span>
          <div className="flex-1 min-w-0">
            <p className="font-pixel text-[8px] text-orange-300">
              {topicWipeResult.removedCount} source{topicWipeResult.removedCount !== 1 ? 's' : ''} removed
            </p>
            {topicWipeResult.removedTitles.length > 0 && (
              <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
                {topicWipeResult.removedTitles.slice(0, 3).join(', ')}
                {topicWipeResult.removedTitles.length > 3 && ` and ${topicWipeResult.removedTitles.length - 3} more`}
              </p>
            )}
          </div>
          <button
            onClick={onDismissWipeResult}
            className="text-white/30 hover:text-white/60 shrink-0 font-pixel text-[8px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Promote-to-Literature-Review result (#13) */}
      {promoteMsg && (
        <div
          className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#0d1b2e] border rounded-sm px-4 py-3 max-w-sm w-full mx-4 flex items-start gap-3 ${
            promoteMsg.ok ? 'border-green-500/40' : 'border-red-500/40'
          }`}
        >
          <span className={`text-base shrink-0 ${promoteMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
            {promoteMsg.ok ? '✓' : '⚠'}
          </span>
          <p className="flex-1 min-w-0 text-[12px] text-white/80 leading-relaxed">{promoteMsg.text}</p>
          <button
            onClick={onDismissPromoteMsg}
            className="text-white/30 hover:text-white/60 shrink-0 font-pixel text-[8px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* #11: "New tree" transient hint pill — bottom-center like the topic-connection
          toast below, clear of the source-toggle header bar (it used to sit top-4 and
          covered the Wiki/YouTube/Papers/Discovery Tree buttons). Local markup — its
          bottom-16 anchor and text-[8px] don't match the Toast primitive. */}
      {newTreeHint && (
        <div className="pointer-events-none absolute bottom-16 left-1/2 z-[60] -translate-x-1/2 rounded-sm border border-[#F5C518]/50 bg-[#F5C518]/15 px-4 py-2 font-pixel text-[8px] text-[#F5C518] shadow-lg">
          Next source you open starts a new tree
        </div>
      )}

      {/* Topic ↔ interest connection (#2) — local overlap, no LLM */}
      {interestConnectMsg && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#0d1b2e] border border-[#F5C518]/40 rounded-sm px-4 py-3 max-w-sm w-full mx-4 flex items-start gap-3">
          <span className="text-[#F5C518] text-base shrink-0">★</span>
          <p className="flex-1 min-w-0 text-[12px] text-white/80 leading-relaxed">{interestConnectMsg}</p>
          <button
            onClick={onDismissInterestConnect}
            className="text-white/30 hover:text-white/60 shrink-0 font-pixel text-[8px]"
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}
