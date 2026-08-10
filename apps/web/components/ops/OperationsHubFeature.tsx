'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { LabeledLoader } from '@/components/ui/LabeledLoader'
import { isFeatureUnlocked, type Feature, type Phase } from '@/lib/phase'

// EVERY tab body is a dynamic boundary (A10): the hub shell is mounted by
// /daily/log and /daily/failure as well as the lab gateway, and statically
// importing the heavier tabs (Data Terminal → Recharts, Field Codex → the
// curriculum engine, Expertise, Vega) made a simple daily log form pay ~580 KB
// of first-load JavaScript. Only the tab a student actually opens is fetched.
const CodexTab = dynamic(() => import('./CodexTab').then((m) => m.CodexTab), {
  loading: () => <LabeledLoader label="Loading Field Codex…" fill="tab" />,
})
const ProjectLogTab = dynamic(() => import('./ProjectLogTab').then((m) => m.ProjectLogTab), {
  loading: () => <LabeledLoader label="Loading Project Log…" fill="tab" />,
})
const FailureLogTab = dynamic(() => import('./FailureLogTab').then((m) => m.FailureLogTab), {
  loading: () => <LabeledLoader label="Loading Failure Log…" fill="tab" />,
})
const ExpertisePanel = dynamic(() => import('./ExpertisePanel').then((m) => m.ExpertisePanel), {
  loading: () => <LabeledLoader label="Loading Proof of Expertise…" fill="tab" />,
})
const DataTerminalTab = dynamic(() => import('./DataTerminalTab').then((m) => m.DataTerminalTab), {
  loading: () => <LabeledLoader label="Loading Data Terminal…" fill="tab" />,
})
const VegaStudyTab = dynamic(() => import('./VegaStudyTab').then((m) => m.VegaStudyTab), {
  loading: () => <LabeledLoader label="Loading Study with Vega…" fill="tab" />,
})

export type OperationsTab = 'codex' | 'log' | 'failure' | 'expertise' | 'data' | 'vega'

interface TabDef {
  key: OperationsTab
  icon: string
  label: string
  testId?: string
  /**
   * Which half of the hub this tab belongs to. `logs` opens on day one — a
   * Project Log and a Failure Log are how a lab records work that has not
   * succeeded yet. `daily` and `data_terminal` are earned at
   * `project_development` (20 fully-proficient sources): those tabs mint KP and
   * raise clearance, which is the shop's pacing.
   */
  feature: Extract<Feature, 'logs' | 'daily' | 'data_terminal'>
}

// Field Codex leads: it replaced Field Dispatch as the daily pillar.
const TAB_DEFS: TabDef[] = [
  { key: 'codex', icon: '📖', label: 'Field Codex', testId: 'codex-tab', feature: 'daily' },
  { key: 'log', icon: '📋', label: 'Project Log', feature: 'logs' },
  { key: 'failure', icon: '⚡', label: 'Failure Log', feature: 'logs' },
  { key: 'expertise', icon: '🎖', label: 'Proof of Expertise', feature: 'daily' },
  { key: 'data', icon: '📊', label: 'Data Terminal', testId: 'data-terminal-tab', feature: 'data_terminal' },
  { key: 'vega', icon: '🧠', label: 'Study with Vega', testId: 'vega-tab', feature: 'daily' },
]

export function OperationsHubFeature({
  initialTab,
  phase,
}: {
  initialTab?: OperationsTab
  /** The team's phase — decides which tabs are open. */
  phase: Phase
}) {
  const tabs = TAB_DEFS.filter((t) => isFeatureUnlocked(phase, t.feature))
  // A new lab lands on the Project Log, not the Field Codex — `initialTab` may
  // name a tab this phase has not unlocked, and defaulting to a locked tab would
  // render an empty hub.
  const fallback = tabs[0]?.key ?? 'log'
  const [tab, setTab] = useState<OperationsTab>(
    initialTab && tabs.some((t) => t.key === initialTab) ? initialTab : fallback,
  )

  return (
    <div className="flex flex-col h-full bg-[#0d1b2e] text-white">
      <div className="flex border-b border-white/10 shrink-0 px-2 overflow-x-auto">
        {tabs.map(({ key, icon, label, testId }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            data-testid={testId}
            className={`ops-tab-btn font-pixel ${tab === key ? 'ops-tab-btn--active' : ''}`}
          >
            <span className="mr-1.5">{icon}</span>
            {label}
          </button>
        ))}
      </div>
      {tab === 'log' && <ProjectLogTab />}
      {tab === 'failure' && <FailureLogTab />}
      {tab === 'expertise' && <ExpertisePanel />}
      {tab === 'data' && <DataTerminalTab />}
      {tab === 'codex' && <CodexTab />}
      {tab === 'vega' && <VegaStudyTab />}
    </div>
  )
}
