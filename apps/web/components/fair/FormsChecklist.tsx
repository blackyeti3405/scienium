'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, ChevronDown, Circle, Clock, ExternalLink } from 'lucide-react'
import { HAZARD_CLASSES } from '@/lib/fairs/safety'
import type { HazardClassKey } from '@/lib/fairs/safety'
import { PixelSpinner } from '@/components/ui/PixelSpinner'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'
import { PanelListSkeleton } from '@/components/ui/skeletons/PanelListSkeleton'
import { useToggleSet } from '@/lib/hooks/useToggleSet'

type FormStatus = 'not_started' | 'in_progress' | 'complete'

interface FormItem {
  id: string
  code: string
  name: string
  /** Applicability copy — null until a qualified reviewer approves the edition. */
  appliesTo: string | null
  url: string | null
  status: FormStatus
  completedAt: string | null
}

interface EditionInfo {
  season: string
  formsUrl: string
  rulesUrl: string
  reviewed: boolean
}

const STATUS_CYCLE: FormStatus[] = ['not_started', 'in_progress', 'complete']

const HAZARD_LABELS: Record<HazardClassKey, string> = Object.fromEntries(
  HAZARD_CLASSES.map((h) => [h.key, h.label]),
) as Record<HazardClassKey, string>

export function FormsChecklist() {
  const [forms, setForms] = useState<FormItem[]>([])
  const [edition, setEdition] = useState<EditionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [expandedHazards, toggleHazard] = useToggleSet<HazardClassKey>()

  useEffect(() => {
    fetch('/api/fairs/forms')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setForms(d.forms)
        setEdition(d.edition)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function cycleStatus(form: FormItem) {
    const current = STATUS_CYCLE.indexOf(form.status)
    const next = STATUS_CYCLE[(current + 1) % STATUS_CYCLE.length]
    setUpdating(form.id)
    try {
      const res = await fetch(`/api/fairs/forms/${form.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Update failed')
      setForms((prev) =>
        prev.map((f) =>
          f.id === form.id ? { ...f, status: d.status, completedAt: d.completedAt } : f,
        ),
      )
    } catch {
      // leave state unchanged on error
    } finally {
      setUpdating(null)
    }
  }

  // Only forms the team has actually engaged with count toward the bar. We
  // deliberately do NOT pre-select "required" forms: which forms apply to a
  // given project is exactly the guidance this app is not qualified to give
  // until the edition is reviewed (REFACTOR2 P0-R4).
  const denominator = forms.filter((f) => f.status !== 'not_started').length
  const completed = forms.filter((f) => f.status === 'complete').length

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden" />
        <PanelListSkeleton rows={6} />
      </div>
    )
  }

  if (error) {
    return <p className="font-pixel text-[8px] text-red-400 px-6 py-4">{error}</p>
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Progress bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="font-pixel text-[8px] text-white/50 uppercase tracking-widest">
            Forms progress
          </span>
          <span className="font-pixel text-[8px] text-[#F5C518]">
            {completed} / {denominator}
          </span>
        </div>
        <PixelProgressBar value={denominator ? (completed / denominator) * 100 : 0} />
      </div>

      <p className="font-pixel text-[7px] text-white/40 leading-loose">
        Click the status icon to cycle Not started → In progress → Complete. This
        is a personal tracker only — it does not submit anything to a fair.
      </p>

      {edition && !edition.reviewed && (
        <div
          data-testid="forms-edition-notice"
          className="border border-[#F5C518]/30 bg-[#F5C518]/[0.06] rounded-sm px-3 py-2.5 flex flex-col gap-1.5"
        >
          <span className="font-pixel text-[8px] text-[#F5C518] uppercase tracking-widest">
            Check the official rules
          </span>
          <p className="text-[12px] text-white/60 leading-relaxed">
            These are the ISEF {edition.season} form titles. Which forms your
            project needs, and whether each one is signed before or after you
            start experimenting, is decided by the official rules and your fair
            director — scienium does not give that guidance. Read the official
            form and rules before you fill anything in.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={edition.formsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-pixel text-[7px] text-[#F5C518]/80 hover:text-[#F5C518] flex items-center gap-1"
            >
              <ExternalLink size={8} /> Official forms
            </a>
            <a
              href={edition.rulesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-pixel text-[7px] text-[#F5C518]/80 hover:text-[#F5C518] flex items-center gap-1"
            >
              <ExternalLink size={8} /> Official rules
            </a>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {forms.map((form) => {
          return (
            <div
              key={form.id}
              data-testid={`form-row-${form.id}`}
              className={`border rounded-sm transition-colors ${
                form.status === 'complete'
                  ? 'border-green-500/30 bg-green-500/5'
                  : form.status === 'in_progress'
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-white/10 bg-white/2'
              }`}
            >
              <div className="flex items-start gap-3 px-3 py-3">
                {/* Status control — cycles status, independent of expand */}
                <button
                  type="button"
                  onClick={() => cycleStatus(form)}
                  disabled={updating === form.id}
                  aria-label={`Cycle status for ${form.code}`}
                  className="shrink-0 mt-0.5 disabled:opacity-50"
                >
                  {updating === form.id ? (
                    <PixelSpinner size="sm" tone="chrome" />
                  ) : form.status === 'complete' ? (
                    <CheckCircle2 size={15} className="text-green-400" />
                  ) : form.status === 'in_progress' ? (
                    <Clock size={15} className="text-amber-400" />
                  ) : (
                    <Circle size={15} className="text-white/40 hover:text-white/50" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`text-sm font-medium leading-snug ${
                        form.status === 'complete' ? 'text-green-300' : 'text-white/80'
                      }`}
                    >
                      {form.code}: {form.name}
                    </span>
                    {form.url && (
                      <a
                        href={form.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-pixel text-[7px] text-white/40 hover:text-white/60 flex items-center gap-0.5 shrink-0"
                      >
                        <ExternalLink size={8} /> Official form
                      </a>
                    )}
                  </div>
                  {form.appliesTo && (
                    <p className="text-[12px] text-white/45 leading-relaxed mt-1">
                      {form.appliesTo}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Safety & hazard reference */}
      <div className="flex flex-col gap-2 mt-2">
        <span className="font-pixel text-[8px] text-white/50 uppercase tracking-widest">
          Safety &amp; hazard reference
        </span>
        <div className="flex flex-col gap-2">
          {HAZARD_CLASSES.map((hazard) => {
            const isExpanded = expandedHazards.has(hazard.key)
            return (
              <div
                key={hazard.key}
                data-testid={`hazard-row-${hazard.key}`}
                className="border border-white/10 bg-[#0a1628] rounded-sm"
              >
                <button
                  type="button"
                  data-testid={`hazard-row-${hazard.key}-toggle`}
                  onClick={() => toggleHazard(hazard.key)}
                  aria-expanded={isExpanded}
                  className="w-full flex items-start gap-2.5 text-left px-3 py-2.5 hover:bg-white/[0.02] transition-colors"
                >
                  <ChevronDown
                    size={13}
                    className={`shrink-0 mt-0.5 text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-pixel text-[9px] text-white">{hazard.label}</span>
                    <p className="text-sm text-white/60 mt-1 leading-snug">{hazard.summary}</p>
                  </div>
                </button>

                {isExpanded && (
                  <div
                    data-testid={`hazard-row-${hazard.key}-body`}
                    className="px-3 pb-3.5 pl-9 flex flex-col gap-3 border-t border-white/5 pt-3"
                  >
                    {(
                      [
                        ['PPE / precautions', hazard.ppe],
                        ['Safe handling', hazard.handling],
                        ['Disposal', hazard.disposal],
                      ] as const
                    ).map(([label, items]) => (
                      <div key={label}>
                        <SectionLabel>{label}</SectionLabel>
                        <ul className="list-disc list-outside pl-4 flex flex-col gap-1">
                          {items.map((item, i) => (
                            <li key={i} className="text-sm text-white/70 leading-relaxed">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-pixel text-[6px] text-white/40 uppercase tracking-widest mb-1">{children}</p>
  )
}
