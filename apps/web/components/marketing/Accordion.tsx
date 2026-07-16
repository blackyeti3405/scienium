'use client'

import { useId, useState, type ReactNode } from 'react'

export interface AccordionItem {
  trigger: ReactNode
  content: ReactNode
}

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-offset-2'

/**
 * One-open-at-a-time accordion: full-width row dividers, no cards (matches the
 * "Who is building it" groups list on /about — DESIGN.md). The expand/collapse
 * is a pure CSS grid-template-rows transition (no height measuring JS), so it
 * collapses cleanly under prefers-reduced-motion via .mkt-accordion-panel in
 * globals.css. Shared by the FAQ (about) and the lab-type Category List (home).
 */
export function Accordion({ items, className = '' }: { items: AccordionItem[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(null)
  const baseId = useId()

  return (
    <ul className={`font-display ${className}`}>
      {items.map((item, i) => {
        const isOpen = open === i
        const triggerId = `${baseId}-trigger-${i}`
        const panelId = `${baseId}-panel-${i}`
        return (
          <li key={i} className={i > 0 ? 'border-t border-[#e4e3db]' : ''}>
            <button
              type="button"
              id={triggerId}
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className={`flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-[#0d1b2e] ${FOCUS}`}
            >
              {item.trigger}
              <span
                aria-hidden
                className="font-pixel shrink-0"
                style={{ fontSize: '0.7rem', color: isOpen ? '#F5C518' : '#c9c8bd' }}
              >
                {isOpen ? '−' : '+'}
              </span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              aria-hidden={!isOpen}
              className="mkt-accordion-panel"
              style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <div className="pb-4">{item.content}</div>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
