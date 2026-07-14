'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ProjectLogTab } from './ProjectLogTab'
import { FailureLogTab } from './FailureLogTab'
import { ExpertisePanel } from './ExpertisePanel'
import { DataTerminalTab } from './DataTerminalTab'
import { VegaStudyTab } from './VegaStudyTab'
import { LabeledLoader } from '@/components/ui/LabeledLoader'

// The Field Codex tab pulls the full typed curriculum content (lazily
// per-track, but the panel shell itself still carries the engine + index),
// so it is code-split out of the hub chunk and fetched only when the tab is
// first opened — same pattern as the Data Terminal guide panels.
const CodexTab = dynamic(() => import('./CodexTab').then((m) => m.CodexTab), {
  loading: () => <LabeledLoader label="Loading Field Codex…" fill="tab" />,
})

export type OperationsTab = 'codex' | 'log' | 'failure' | 'expertise' | 'data' | 'vega'

// Fourth tuple slot is an optional data-testid — only Field Codex + Study with
// Vega need one per their plans' acceptance criteria; other tabs are untouched.
// Field Codex leads: it replaced Field Dispatch as the daily pillar.
const TAB_DEFS: [OperationsTab, string, string, string?][] = [
  ['codex', '📖', 'Field Codex', 'codex-tab'],
  ['log', '📋', 'Project Log'],
  ['failure', '⚡', 'Failure Log'],
  ['expertise', '🎖', 'Proof of Expertise'],
  ['data', '📊', 'Data Terminal'],
  ['vega', '🧠', 'Study with Vega', 'vega-tab'],
]

export function OperationsHubFeature({
  initialTab = 'codex',
}: {
  initialTab?: OperationsTab
}) {
  const [tab, setTab] = useState<OperationsTab>(initialTab)

  return (
    <div className="flex flex-col h-full bg-[#0d1b2e] text-white">
      <div className="flex border-b border-white/10 shrink-0 px-2 overflow-x-auto">
        {TAB_DEFS.map(([key, icon, label, testId]) => (
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
