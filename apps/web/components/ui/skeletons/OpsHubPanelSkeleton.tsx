import { PixelSkeleton } from '@/components/ui/PixelSkeleton'
import { OpsTabSkeleton } from '@/components/ui/skeletons/OpsTabSkeleton'

/**
 * Mirrors the Operations Hub shell while its chunk loads.
 *
 * Built from the SAME layout classes the real hub uses — `ops-tab-btn` for the
 * strip items and `ops-tab-body` for the body — rather than from hand-measured
 * heights. A skeleton that re-declares `h-10` next to a real `padding: 14px 18px
 * 12px` drifts the moment either is touched; sharing the class means the two
 * cannot disagree.
 *
 * The body is the `log` variant because Project Log is the hub's default tab
 * (OperationsHubFeature picks the first tab the phase has unlocked, and `logs`
 * is unlocked from day one).
 */
export function OpsHubPanelSkeleton({ tabCount = 2 }: { tabCount?: number }) {
  return (
    <div className="flex flex-col h-full bg-[#0d1b2e] text-white" data-testid="ops-hub-panel-skeleton">
      <div className="flex border-b border-white/10 shrink-0 px-2 overflow-x-auto">
        {Array.from({ length: tabCount }).map((_, i) => (
          // Same padding box as a real tab button, so the strip is exactly as
          // tall as the one that replaces it.
          <span key={i} className="ops-tab-btn font-pixel">
            {/* 13px, matching the real button's 12.8px line box. The strip is
                padding 14/12 + that line + a 2px border = 41px; an 8px block
                left it 5px short, a 16px one overshot by 3. */}
            <PixelSkeleton variant="line" h="h-[13px]" w={i === 0 ? 'w-20' : 'w-24'} />
          </span>
        ))}
      </div>
      <OpsTabSkeleton variant="log" />
    </div>
  )
}
