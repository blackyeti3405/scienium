'use client'

import { useState, type ReactNode } from 'react'

export interface Tab {
  key: string
  label: string
  content: ReactNode
}

/**
 * Simple tab switcher for the student drill-down sections.
 * Gold underline on active tab; pixel font for tab labels (chrome only).
 * Content area is not bounded so it grows naturally.
 */
export function SectionTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? '')

  return (
    <div className="space-y-0">
      {/* Tab strip */}
      <div className="flex flex-wrap gap-0 border-b border-white/10 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={`font-pixel text-[8px] uppercase tracking-widest px-3 py-2 border-b-2 transition-colors ${
              active === t.key
                ? 'border-[#F5C518] text-[#F5C518]'
                : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Active panel */}
      <div className="pt-4">
        {tabs.find((t) => t.key === active)?.content}
      </div>
    </div>
  )
}
