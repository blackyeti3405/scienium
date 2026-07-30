'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { LabeledLoader } from '@/components/ui/LabeledLoader'

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

// Fourth tuple slot is an optional data-testid — only Field Codex + Study with
// Vega need one per their plans' acceptance criteria; other tabs are untouched.
// Field Codex leads: it replaced Field Dispatch as the daily pillar.
const TAB_DEFS: [OperationsTab, string, string, string?][] = [
  ['codex', '📖', 'Field Codex', 'codex-tab'],
  ['log', '📋', 'Project Log'],
  ['failure', '⚡', 'Failure Log'],
  ['expertise', '🎖', 'Proof of Expertise'],
  ['data', '📊', 'Data Terminal', 'data-terminal-tab'],
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
