'use client'

import { BusyButton } from '@/components/ui/BusyButton'
import { LabeledLoader } from '@/components/ui/LabeledLoader'

/**
 * The topic-change confirm modal and the topic-removal confirm modal — shared
 * between Discovery (DiscoveryModals) and the Lab Profile settings form, both
 * of which drive the same `useFinalTopic`-shaped state. `variant` covers the
 * three places the two callers differ: Discovery swaps the topic-change modal
 * for a Vega labeled loader while `savingTopic` (the relevance re-check can
 * take up to 30s) and uses a plain button; Settings keeps the modal up with a
 * `BusyButton`, adds an extra escape-hatch paragraph to the removal modal, and
 * rounds the backdrop's corners.
 */
export function TopicConfirmModals({
  variant,
  topicConfirm,
  topicRemovalConfirm,
  savingTopic,
  onCancelTopicChange,
  onConfirmTopicChange,
  onCancelTopicRemoval,
  onConfirmTopicRemoval,
}: {
  variant: 'settings' | 'discovery'
  topicConfirm: { newTopic: string; paperCount: number } | null
  topicRemovalConfirm: { newTopic: string; papers: { id: string; title: string }[] } | null
  savingTopic: boolean
  onCancelTopicChange: () => void
  onConfirmTopicChange: (newTopic: string) => void
  onCancelTopicRemoval: () => void
  onConfirmTopicRemoval: (newTopic: string, paperIds: string[]) => void
}) {
  const backdropClass =
    variant === 'settings'
      ? 'absolute inset-0 z-50 flex items-center justify-center bg-black/60 rounded-sm'
      : 'absolute inset-0 z-50 flex items-center justify-center bg-black/60'

  return (
    <>
      {/* Topic-change confirmation. Discovery's confirmed path is a batch LLM
          sweep re-checking every source's relevance against the new topic, so
          once submitted it shows a Vega labeled loader instead of a
          button-sized spinner. */}
      {topicConfirm && (
        <div className={backdropClass}>
          <div className="bg-[#0d1b2e] border border-white/20 rounded-sm p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
            {variant === 'discovery' && savingTopic ? (
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
                    <span className="text-[#F5C518] font-medium">
                      &ldquo;{topicConfirm.newTopic}&rdquo;
                    </span>
                    .
                  </p>
                  <p>
                    You have{' '}
                    <span className="text-white font-medium">
                      {topicConfirm.paperCount} source{topicConfirm.paperCount !== 1 ? 's' : ''}
                    </span>{' '}
                    in your literature review. Sources that aren&apos;t relevant to your new topic
                    will be removed. Sources that apply to both topics will be kept.
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={onCancelTopicChange}
                    className="flex-1 font-pixel text-[8px] border border-white/20 text-white/60 py-2.5 hover:border-white/40 hover:text-white/80 transition-colors"
                  >
                    Cancel
                  </button>
                  {variant === 'settings' ? (
                    <BusyButton
                      busy={savingTopic}
                      busyLabel="Updating…"
                      showSpinner={false}
                      onClick={() => onConfirmTopicChange(topicConfirm.newTopic)}
                      className="flex-1 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] py-2.5 hover:brightness-110 disabled:opacity-50 transition-all"
                    >
                      Change topic
                    </BusyButton>
                  ) : (
                    <button
                      onClick={() => onConfirmTopicChange(topicConfirm.newTopic)}
                      className="flex-1 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] py-2.5 hover:brightness-110 disabled:opacity-50 transition-all"
                    >
                      Change topic
                    </button>
                  )}
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
        <div className={backdropClass}>
          <div className="bg-[#0d1b2e] border border-white/20 rounded-sm p-6 max-w-sm w-full mx-4 flex flex-col gap-4" data-testid="topic-removal-modal">
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
              {variant === 'settings' && (
                <p className="text-white/50 text-[12px]">
                  Keeping something on this list? Cancel and change your topic from the Discovery
                  tab after removing it manually.
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={onCancelTopicRemoval}
                className="flex-1 font-pixel text-[8px] border border-white/20 text-white/60 py-2.5 hover:border-white/40 hover:text-white/80 transition-colors"
              >
                Cancel
              </button>
              {variant === 'settings' ? (
                <BusyButton
                  busy={savingTopic}
                  busyLabel="Removing…"
                  showSpinner={false}
                  onClick={() =>
                    onConfirmTopicRemoval(
                      topicRemovalConfirm.newTopic,
                      topicRemovalConfirm.papers.map((p) => p.id),
                    )
                  }
                  className="flex-1 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] py-2.5 hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  Remove &amp; change
                </BusyButton>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
