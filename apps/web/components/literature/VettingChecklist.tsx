'use client'

import { useState } from 'react'
import { ChevronDown, ShieldCheck } from 'lucide-react'
import type { CredibilityTier } from '@prisma/client'
import { tierMeta, VETTING_CHECKLIST } from '@/lib/discovery/credibility'

/**
 * Collapsible "How to vet a source" checklist — static content
 * (`VETTING_CHECKLIST`), no LLM. Reuses the Research Guide's collapsible
 * pixel-chrome idiom (chevron header + expand-only body). Leads with the
 * paper's own tier caveat so the student sees why the badge said what it said
 * before working through the checklist.
 */
export function VettingChecklist({ tier }: { tier?: CredibilityTier | null }) {
  const [expanded, setExpanded] = useState(false)
  const meta = tierMeta(tier ?? null)

  return (
    <div className="border-b border-white/10 shrink-0 bg-white/[0.015]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-white/[0.02] transition-colors"
      >
        <ChevronDown
          size={11}
          className={`shrink-0 text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
        <ShieldCheck size={11} className="text-[#F5C518]/60 shrink-0" />
        <span className="font-pixel text-[7px] text-white/50 uppercase tracking-widest">
          How to vet a source
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 flex flex-col gap-2.5">
          <p
            className="font-pixel text-[7px] leading-relaxed px-2.5 py-2 rounded-sm border"
            style={{ color: meta.color, borderColor: `${meta.color}40`, background: `${meta.color}0d` }}
          >
            {meta.caveat}
          </p>
          <ul className="flex flex-col gap-2">
            {VETTING_CHECKLIST.map((item, i) => (
              <li key={item.key} className="flex flex-col gap-0.5">
                <span className="text-sm text-white/75 leading-snug">
                  <span className="font-pixel text-[7px] text-[#F5C518]/60 mr-1.5">{i + 1}.</span>
                  {item.label}
                </span>
                <p className="text-[13px] text-white/45 leading-relaxed pl-5">{item.hint}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
