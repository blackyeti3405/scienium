'use client'

import { useState, type ReactNode } from 'react'

export interface Tab {
  key: string
  label: string
  icon?: ReactNode
  group?: string
  content: ReactNode
}

/**
 * Section navigation for the student drill-down.
 *
 * Desktop (lg+): sticky left sidebar with grouped nav items.
 *   Active item: gold left border + subtle bg + gold text.
 *   Groups separated by gold pixel-font eyebrow labels.
 *
 * Mobile/tablet (<lg): horizontal scrollable strip — no two-row overflow.
 */
export function SectionTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? '')
  const activeTab = tabs.find((t) => t.key === active)

  // Build ordered group list preserving first-occurrence order
  const groups: string[] = []
  for (const t of tabs) {
    const g = t.group ?? ''
    if (!groups.includes(g)) groups.push(g)
  }

  return (
    <div className="flex gap-0 lg:gap-6 flex-col lg:flex-row">
      {/* ── Sidebar nav (desktop) ── */}
      <nav
        aria-label="Section navigation"
        className="hidden lg:flex flex-col w-44 shrink-0 sticky top-6 self-start gap-0"
      >
        {groups.map((group, gi) => {
          const groupTabs = tabs.filter((t) => (t.group ?? '') === group)
          return (
            <div key={group || gi} className="mb-1">
              {group && (
                <p className="font-pixel text-[10px] text-[#F5C518] uppercase tracking-widest px-3 pt-3 pb-1.5">
                  {group}
                </p>
              )}
              {groupTabs.map((t) => {
                const isActive = t.key === active
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActive(t.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-md transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'border-l-2 border-[#F5C518] bg-[#F5C518]/[0.07] text-[#F5C518] font-medium pl-[10px]'
                        : 'border-l-2 border-transparent text-white/50 hover:text-white/80 hover:bg-white/[0.03] pl-[10px]'
                    }`}
                  >
                    {t.icon && (
                      <span className={`shrink-0 ${isActive ? 'text-[#F5C518]' : 'text-white/40'}`}>
                        {t.icon}
                      </span>
                    )}
                    <span className="truncate">{t.label}</span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* ── Mobile strip (< lg) ── */}
      <div className="lg:hidden flex gap-0 border-b border-white/10 overflow-x-auto scrollbar-none mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 border-b-2 transition-colors duration-150 cursor-pointer ${
              active === t.key
                ? 'border-[#F5C518] text-[#F5C518]'
                : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >
            {t.icon && <span className="shrink-0">{t.icon}</span>}
            <span className="text-xs font-medium whitespace-nowrap">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Content panel ── */}
      <div className="flex-1 min-w-0">
        {activeTab?.content}
      </div>
    </div>
  )
}
