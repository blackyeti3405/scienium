'use client'

import { useState, type ComponentType } from 'react'
import { BookOpen, FlaskConical, LineChart as LineChartIcon, PieChart, ClipboardList, Droplets } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { LucideIcon } from 'lucide-react'
import { LabeledLoader } from '@/components/ui/LabeledLoader'
import { ExperimentsView } from './data-terminal/ExperimentsView'

type DataTerminalView = 'experiments' | 'guide' | 'charts-guide' | 'plot-guide' | 'methods-guide' | 'data-quality-guide'

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
 * omitted for the experiments tab, which renders `ExperimentsView` with no
 * guide wrapper.
 */
const SUB_TABS: {
  key: DataTerminalView
  label: string
  icon: LucideIcon
  testId: string
  Panel?: ComponentType
}[] = [
  { key: 'experiments', label: 'Experiments', icon: FlaskConical, testId: 'experiments-subtab' },
  { key: 'guide', label: 'Stats Guide', icon: BookOpen, testId: 'stats-guide-tab', Panel: StatsGuidePanel },
  { key: 'charts-guide', label: 'Charts Guide', icon: PieChart, testId: 'charts-guide-tab', Panel: ChartsGuidePanel },
  { key: 'plot-guide', label: 'Plot Guide', icon: LineChartIcon, testId: 'plot-guide-tab', Panel: PlotGuidePanel },
  { key: 'methods-guide', label: 'Methods', icon: ClipboardList, testId: 'methods-guide-tab', Panel: MethodsGuidePanel },
  { key: 'data-quality-guide', label: 'Data Quality', icon: Droplets, testId: 'data-quality-guide-tab', Panel: DataQualityGuidePanel },
]

/**
 * Data Terminal (spec §14.1) — experiment tracking + graphing for the `working`
 * phase, surfaced as an Operations Hub tab. Records x/y measurements per
 * experiment (optionally grouped into series) and charts them with recharts.
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
  const [view, setView] = useState<DataTerminalView>('experiments')
  const ActiveGuidePanel = SUB_TABS.find((t) => t.key === view)?.Panel

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

      {ActiveGuidePanel ? (
        <div className="ops-tab-body">
          <div className="max-w-2xl mx-auto w-full py-2">
            <ActiveGuidePanel />
          </div>
        </div>
      ) : (
        <ExperimentsView />
      )}
    </div>
  )
}
