import { PixelSkeleton } from '@/components/ui/PixelSkeleton'

/**
 * Per-gateway loading skeletons for the remaining feature panels.
 *
 * Each one reuses the REAL panel's shell classes — same root, same
 * `px-6 py-4 border-b` header, same `flex-1 overflow-y-auto p-6` body — rather
 * than hardcoding measured heights. Heights here depend on panel width (a
 * header wraps to two lines in a narrow overlay and one in a wide one), so a
 * fixed `h-[85px]` is only correct at the width it was measured at. Sharing the
 * layout classes makes the skeleton track the real panel at every width.
 *
 * Verified side by side against the live panels via /dev/skeleton-audit.
 */

/**
 * The header bar every panel except PvP opens with. `lines` is not decoration —
 * each panel's header is a different height (measured at a 620px panel: Science
 * Fair 52px of content, Research Plan 68px, Literature 116px), and a 12px line
 * on an 8px gap steps in 20px increments, so the count is how each one lands on
 * its real height.
 */
function PanelHeader({ lines, action }: { lines: number; action?: 'sm' | 'lg' }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <PixelSkeleton key={i} variant="line" h="h-3" w={i === 0 ? 'w-40' : 'w-56'} />
        ))}
      </div>
      {action === 'sm' && <PixelSkeleton variant="box" h="h-8" w="w-24" />}
      {action === 'lg' && <PixelSkeleton variant="box" h="h-[72px]" w="w-40" />}
    </div>
  )
}

/** The `flex border-b … shrink-0` strip of tab buttons (Science Fair has four). */
function PanelTabStrip({ widths }: { widths: string[] }) {
  return (
    <div className="flex border-b border-white/10 shrink-0 px-2">
      {widths.map((w, i) => (
        <span key={i} className="flex items-center px-4 py-[13px]">
          <PixelSkeleton variant="line" h="h-[13px]" w={w} />
        </span>
      ))}
    </div>
  )
}

/** Science Fair — header, a four-tab strip, then a card grid. */
export function FairPanelSkeleton() {
  return (
    <div className="flex flex-col h-full bg-[#0d1b2e] text-white" data-testid="fair-panel-skeleton">
      <PanelHeader lines={2} />
      <PanelTabStrip widths={['w-24', 'w-16', 'w-28', 'w-16']} />
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <PixelSkeleton key={i} variant="box" h="h-32" w="w-full" />
          ))}
        </div>
        <PixelSkeleton variant="box" h="h-16" w="w-full" />
        <div className="border-t border-white/10 pt-5 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <PixelSkeleton key={i} variant="box" h="h-14" w="w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Literature Review — header, the gold progress notice, the 4px progress bar,
 * then the source list. Its rows are a uniform 52px, so the list is the one
 * place a count can be mirrored honestly.
 */
export function LiteraturePanelSkeleton() {
  return (
    <div className="flex flex-col h-full bg-[#0d1b2e] text-white" data-testid="literature-panel-skeleton">
      <PanelHeader lines={6} action="lg" />
      <div className="mx-6 mt-3 px-4 py-2.5 bg-[#F5C518]/[0.08] border border-[#F5C518]/20 rounded-sm shrink-0">
        <div className="flex flex-col gap-2">
          <PixelSkeleton variant="line" h="h-2" w="w-full" />
          <PixelSkeleton variant="line" h="h-2" w="w-5/6" />
          <PixelSkeleton variant="line" h="h-2" w="w-2/3" />
          <PixelSkeleton variant="line" h="h-2" w="w-1/2" />
        </div>
      </div>
      <div className="h-1 bg-white/[0.08] shrink-0" />
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <PixelSkeleton key={i} variant="box" h="h-[52px]" w="w-full" />
        ))}
      </div>
    </div>
  )
}

/** Research Plan — header over stacked form sections. */
export function ResearchPlanPanelSkeleton() {
  return (
    <div className="flex flex-col h-full bg-[#0d1b2e] text-white" data-testid="research-plan-panel-skeleton">
      <PanelHeader lines={3} />
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        <PixelSkeleton variant="box" h="h-[70px]" w="w-full" />
        <PixelSkeleton variant="box" h="h-[212px]" w="w-full" />
        <PixelSkeleton variant="box" h="h-[120px]" w="w-full" />
      </div>
    </div>
  )
}

/**
 * Battle Arena — no header bar at all: it scrolls a single centred column of
 * cards. The generic skeleton's header + pill row described none of this.
 */
export function PvpPanelSkeleton() {
  return (
    <div
      className="relative flex h-full flex-col bg-[#0d1b2e] text-white overflow-y-auto"
      data-testid="pvp-panel-skeleton"
    >
      <div className="max-w-xl mx-auto w-full space-y-5 px-5 py-6">
        <PixelSkeleton variant="box" h="h-[82px]" w="w-full" />
        <PixelSkeleton variant="box" h="h-[137px]" w="w-full" />
        <PixelSkeleton variant="box" h="h-10" w="w-2/3" />
        <PixelSkeleton variant="box" h="h-[122px]" w="w-full" />
      </div>
    </div>
  )
}

/**
 * Showcase editor — nothing like the other panels. Its own `sc-editor` shell is
 * a fixed top bar, a scrolling column of `ops-entry-card` sections, and a pinned
 * publish bar at the bottom. The generic skeleton drew a pill row over three
 * centred boxes, which shares no structure with it at all.
 */
export function ShowcasePanelSkeleton() {
  return (
    <div className="sc-editor" data-testid="showcase-panel-skeleton">
      <div className="sc-topbar">
        {/* `sc-topbar__id` is a 21px line box, not a 12px one. */}
        <PixelSkeleton variant="line" h="h-[21px]" w="w-40" />
      </div>
      <div className="sc-scroll">
        <div className="sc-prog">
          <PixelSkeleton variant="line" h="h-2.5" w="w-full" />
        </div>
        <PixelSkeleton variant="box" h="h-[320px]" w="w-full" />
        <PixelSkeleton variant="box" h="h-[240px]" w="w-full" />
        <PixelSkeleton variant="box" h="h-[280px]" w="w-full" />
      </div>
      <div className="sc-publish">
        <PixelSkeleton variant="line" h="h-2.5" w="w-48" />
        <PixelSkeleton variant="box" h="h-[38px]" w="w-32" />
      </div>
    </div>
  )
}
