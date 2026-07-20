'use client'

import type { ReactNode } from 'react'
import { Toast } from '@/components/ui/Toast'
import { TopicConfirmModals } from '@/components/discovery/TopicConfirmModals'

/** Shared bottom-center dismissable notice — used by the wipe-result, promote,
 *  and interest-connection notifications below (identical wrapper/dismiss
 *  markup, differing only in border color, icon, and inner content). */
function DismissBanner({
  borderClass,
  iconClass,
  icon,
  onDismiss,
  children,
}: {
  borderClass: string
  iconClass: string
  icon: string
  onDismiss: () => void
  children: ReactNode
}) {
  return (
    <div
      className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#0d1b2e] border rounded-sm px-4 py-3 max-w-sm w-full mx-4 flex items-start gap-3 ${borderClass}`}
    >
      <span className={`text-base shrink-0 ${iconClass}`}>{icon}</span>
      <div className="flex-1 min-w-0">{children}</div>
      <button
        onClick={onDismiss}
        className="text-white/30 hover:text-white/60 shrink-0 font-pixel text-[8px]"
      >
        ✕
      </button>
    </div>
  )
}

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
        <Toast tone="kp" nonce={kpPill.nonce}>
          +{kpPill.amount} KP
        </Toast>
      )}
      {/* Add-paper-from-search failure (UX-1) — never fail silently on wifi blips */}
      {sourceAddError && (
        <Toast tone="error" nonce={sourceAddError.nonce}>
          Couldn&apos;t add that paper — check your connection and try again
        </Toast>
      )}
      {/* Topic-change / topic-removal confirm modals — shared with the Lab
          Profile settings form (both drive the useFinalTopic-shaped state). */}
      <TopicConfirmModals
        variant="discovery"
        topicConfirm={topicConfirm}
        topicRemovalConfirm={topicRemovalConfirm}
        savingTopic={savingTopic}
        onCancelTopicChange={onCancelTopicChange}
        onConfirmTopicChange={onConfirmTopicChange}
        onCancelTopicRemoval={onCancelTopicRemoval}
        onConfirmTopicRemoval={onConfirmTopicRemoval}
      />

      {/* Wipe result notification */}
      {topicWipeResult && (
        <DismissBanner borderClass="border-orange-500/40" iconClass="text-orange-400" icon="⚠" onDismiss={onDismissWipeResult}>
          <p className="font-pixel text-[8px] text-orange-300">
            {topicWipeResult.removedCount} source{topicWipeResult.removedCount !== 1 ? 's' : ''} removed
          </p>
          {topicWipeResult.removedTitles.length > 0 && (
            <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
              {topicWipeResult.removedTitles.slice(0, 3).join(', ')}
              {topicWipeResult.removedTitles.length > 3 && ` and ${topicWipeResult.removedTitles.length - 3} more`}
            </p>
          )}
        </DismissBanner>
      )}

      {/* Promote-to-Literature-Review result (#13) */}
      {promoteMsg && (
        <DismissBanner
          borderClass={promoteMsg.ok ? 'border-green-500/40' : 'border-red-500/40'}
          iconClass={promoteMsg.ok ? 'text-green-400' : 'text-red-400'}
          icon={promoteMsg.ok ? '✓' : '⚠'}
          onDismiss={onDismissPromoteMsg}
        >
          <p className="text-[12px] text-white/80 leading-relaxed">{promoteMsg.text}</p>
        </DismissBanner>
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
        <DismissBanner borderClass="border-[#F5C518]/40" iconClass="text-[#F5C518]" icon="★" onDismiss={onDismissInterestConnect}>
          <p className="text-[12px] text-white/80 leading-relaxed">{interestConnectMsg}</p>
        </DismissBanner>
      )}
    </>
  )
}
