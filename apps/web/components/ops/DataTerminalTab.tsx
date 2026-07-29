'use client'

import { useEffect, useState, type ComponentType } from 'react'
import { BookOpen, Table2, LineChart as LineChartIcon, PieChart, ClipboardList, Droplets } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { LucideIcon } from 'lucide-react'
import { LabeledLoader } from '@/components/ui/LabeledLoader'
import { DatasetsView } from './data-terminal/DatasetsView'

type DataTerminalView = 'data' | 'guide' | 'charts-guide' | 'plot-guide' | 'methods-guide' | 'data-quality-guide'

// The guide panels each pull a large static-content module (plot-guide alone
// is ~765KB of source), but render only when their sub-tab is selected — so
// they are code-split out of the hub chunk and fetched on first open, with the
// guide loader as the fallback (same pattern as lib/featureRegistry.tsx).
const guideLoading = () => <LabeledLoader label="Loading guide…" fill="tab" />
const StatsGuidePanel = dynamic(() => import('./StatsGuidePanel').then((m) => m.StatsGuidePanel), { loading: guideLoading })
const ChartsGuidePanel = dynamic(() => import('./ChartsGuidePanel').then((m) => m.ChartsGuidePanel), { loading: guideLoading })
const PlotGuidePanel = dynamic(() => import('./PlotGuidePanel').then((m) => m.PlotGuidePanel), { loading: guideLoading })
const MethodsGuidePanel = dynamic(() => import('./MethodsGuidePanel').then((m) => m.MethodsGuidePanel), { loading: guideLoading })
const DataQualityGuidePanel = dynamic(() => import('./DataQualityGuidePanel').then((m) => m.DataQualityGuidePanel), { loading: guideLoading })

/**
 * One entry per sub-tab: the strip buttons and the view switch below both
 * render from this table, so adding a guide is a one-line entry (key, label,
 * icon, testId, Panel) instead of two hand-copied JSX blocks. `Panel` is
 * omitted for the "Data" tab, which renders `DatasetsView` with no guide
 * wrapper.
 */
const SUB_TABS: {
  key: DataTerminalView
  label: string
  icon: LucideIcon
  testId: string
  Panel?: ComponentType
}[] = [
  { key: 'data', label: 'Data', icon: Table2, testId: 'data-subtab' },
  { key: 'guide', label: 'Stats Guide', icon: BookOpen, testId: 'stats-guide-tab', Panel: StatsGuidePanel },
  // charts-guide is rendered explicitly below (it takes an onStartRecipe prop),
  // so it carries no generic `Panel` here — the entry drives only its sub-tab button.
  { key: 'charts-guide', label: 'Charts Guide', icon: PieChart, testId: 'charts-guide-tab' },
  { key: 'plot-guide', label: 'Plot Guide', icon: LineChartIcon, testId: 'plot-guide-tab', Panel: PlotGuidePanel },
  { key: 'methods-guide', label: 'Methods', icon: ClipboardList, testId: 'methods-guide-tab', Panel: MethodsGuidePanel },
  { key: 'data-quality-guide', label: 'Data Quality', icon: Droplets, testId: 'data-quality-guide-tab', Panel: DataQualityGuidePanel },
]

/**
 * Data Terminal (spec §14.1) — the team's data workbench, surfaced as an
 * Operations Hub tab. The "Data" sub-tab holds datasets: an N-column table with
 * typed columns carrying experimental ROLES, which every analysis and chart
 * lane reads (docs/SPEC.md §7.6, Data Terminal). It replaces the
 * old single-x/single-y experiment tracker, which could not represent a CSV.
 *
 * Feature F12 adds a "Stats Guide" sub-tab (static reference content, no API
 * dependency). Features F13/F14 add "Charts Guide" and "Plot Guide" sub-tabs,
 * same pattern. Feature F3 adds a "Methods Guide" sub-tab (experimental-design
 * concepts — everything before data exists), same pattern again. Feature F4
 * adds a "Data Quality" sub-tab (everything AFTER data is collected —
 * measurement uncertainty, sig figs/units, data cleaning, methodology
 * pitfalls), same pattern again. The `view` switch below is deliberately the
 * FIRST thing this component renders, ABOVE the `loading` / `locked` /
 * `selected` early returns that gate the Experiments view — every guide must
 * stay reachable regardless of phase-lock or load state, so none of them can
 * live behind those branches. Do not move the switch below any early return.
 */
export function DataTerminalTab() {
  const [view, setView] = useState<DataTerminalView>('data')
  // "Start from this recipe" (Charts Guide → dataset): the id of the dataset a
  // recipe just created, so switching to the Data sub-tab opens it directly.
  const [openDatasetId, setOpenDatasetId] = useState<string | null>(null)
  // openDatasetId is one-shot: DatasetsView reads it only as its initial
  // `selectedId` on mount, so it must be cleared the moment we leave the Data
  // sub-tab — otherwise the next remount of DatasetsView (Data → Charts Guide
  // → Data) re-reads the same stale id and re-opens that recipe's dataset
  // forever instead of showing the list.
  useEffect(() => {
    if (view !== 'data') setOpenDatasetId(null)
  }, [view])
  const ActiveGuidePanel = view === 'charts-guide' ? null : SUB_TABS.find((t) => t.key === view)?.Panel

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex flex-wrap gap-1 px-4 pt-3 shrink-0">
        {SUB_TABS.map(({ key, label, icon: Icon, testId }) => (
          <button
            key={key}
            type="button"
            data-testid={testId}
            onClick={() => setView(key)}
            className={`inline-flex items-center gap-1.5 font-pixel text-[7px] px-3 py-2 border-b-2 transition-colors ${
              view === key
                ? 'text-[#F5C518] border-[#F5C518]'
                : 'text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>

      {view === 'charts-guide' ? (
        <div className="ops-tab-body">
          <div className="max-w-2xl mx-auto w-full py-2">
            <ChartsGuidePanel
              onStartRecipe={(id) => {
                setOpenDatasetId(id)
                setView('data')
              }}
            />
          </div>
        </div>
      ) : ActiveGuidePanel ? (
        <div className="ops-tab-body">
          <div className="max-w-2xl mx-auto w-full py-2">
            <ActiveGuidePanel />
          </div>
        </div>
      ) : (
        <DatasetsView openDatasetId={openDatasetId} />
      )}
    </div>
  )
}
