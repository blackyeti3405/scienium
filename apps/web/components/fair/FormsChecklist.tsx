'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, ChevronDown, Circle, Clock, ExternalLink } from 'lucide-react'
import { getFormGuide } from '@/lib/fairs/forms'
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
  description: string
  url: string | null
  requiredFor: string[]
  status: FormStatus
  completedAt: string | null
}

const REQUIRED_FOR_LABELS: Record<string, string> = {
  all: 'All projects',
  non_school_research: 'Off-campus research',
  qualified_scientist: 'Professional lab',
  hazardous_substances: 'Hazardous materials',
  human_subjects: 'Human participants',
  vertebrate_animals: 'Vertebrate animals',
  hazardous_bio: 'Biological hazards',
  tissue: 'Human/animal tissue',
  continuation: 'Continuation project',
}

const STATUS_CYCLE: FormStatus[] = ['not_started', 'in_progress', 'complete']

const HAZARD_LABELS: Record<HazardClassKey, string> = Object.fromEntries(
  HAZARD_CLASSES.map((h) => [h.key, h.label]),
) as Record<HazardClassKey, string>

export function FormsChecklist() {
  const [forms, setForms] = useState<FormItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [expandedForms, toggleForm] = useToggleSet<string>()
  const [expandedHazards, toggleHazard] = useToggleSet<HazardClassKey>()

  useEffect(() => {
    fetch('/api/fairs/forms')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setForms(d.forms)
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

  // Required forms (Forms 1, 1A, 1C) always count toward the denominator.
  // Optional forms only enter the denominator once the user engages with them
  // (marks in_progress or complete), so the bar starts at X/3 not X/12.
  const requiredForms = forms.filter((f) => f.requiredFor.includes('all'))
  const touchedOptional = forms.filter(
    (f) => !f.requiredFor.includes('all') && f.status !== 'not_started',
  )
  const denominator = requiredForms.length + touchedOptional.length
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

      <p className="font-pixel text-[7px] text-white/35 leading-loose">
        Click the status icon to cycle Not started → In progress → Complete.
        Click the chevron to expand a form&apos;s full guide. Forms 1, 1A, and 1C
        are required for every project; the others apply based on your
        research type.
      </p>

      <div className="flex flex-col gap-2">
        {forms.map((form) => {
          const guide = getFormGuide(form.code)
          const isExpanded = expandedForms.has(form.id)
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
                    <Circle size={15} className="text-white/25 hover:text-white/50" />
                  )}
                </button>

                {/* Expand control — toggles guide body, independent of status */}
                <button
                  type="button"
                  data-testid={`form-row-${form.id}-toggle`}
                  onClick={() => toggleForm(form.id)}
                  aria-expanded={isExpanded}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`text-sm font-medium leading-snug flex items-center gap-1.5 ${
                        form.status === 'complete' ? 'text-green-300' : 'text-white/80'
                      }`}
                    >
                      <ChevronDown
                        size={11}
                        className={`shrink-0 text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                      {form.code}: {form.name}
                    </span>
                    {form.url && (
                      <a
                        href={form.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="font-pixel text-[7px] text-white/30 hover:text-white/60 flex items-center gap-0.5 shrink-0"
                      >
                        <ExternalLink size={8} /> PDF
                      </a>
                    )}
                  </div>
                  <p className="text-[12px] text-white/45 leading-relaxed mt-1">{form.description}</p>
                  {/* Required-for tags */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {form.requiredFor.map((tag) => (
                      <span
                        key={tag}
                        className={`font-pixel text-[6px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${
                          tag === 'all'
                            ? 'bg-[#F5C518]/15 text-[#F5C518]/80'
                            : 'bg-white/8 text-white/35'
                        }`}
                      >
                        {REQUIRED_FOR_LABELS[tag] ?? tag}
                      </span>
                    ))}
                  </div>
                </button>
              </div>

              {isExpanded && guide && (
                <div
                  data-testid={`form-row-${form.id}-body`}
                  className="px-3 pb-3.5 pl-11 flex flex-col gap-3 border-t border-white/5 pt-3"
                >
                  <div>
                    <SectionLabel>What this form is</SectionLabel>
                    <p className="text-sm text-white/70 leading-relaxed">{guide.whatItIs}</p>
                  </div>

                  <div>
                    <SectionLabel>What goes in it</SectionLabel>
                    <ul className="list-disc list-outside pl-4 flex flex-col gap-1">
                      {guide.whatGoesIn.map((item, i) => (
                        <li key={i} className="text-sm text-white/70 leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <SectionLabel>Why it&apos;s required</SectionLabel>
                    <p className="text-sm text-white/70 leading-relaxed">{guide.whyItTriggers}</p>
                  </div>

                  {guide.hazardClasses.length > 0 && (
                    <div>
                      <SectionLabel>Related safety</SectionLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {guide.hazardClasses.map((key) => (
                          <span
                            key={key}
                            className="font-pixel text-[6px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm border border-[#F5C518]/30 bg-[#F5C518]/[0.08] text-[#F5C518]/80"
                          >
                            {HAZARD_LABELS[key]}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                    className={`shrink-0 mt-0.5 text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
                    <div>
                      <SectionLabel>PPE / precautions</SectionLabel>
                      <ul className="list-disc list-outside pl-4 flex flex-col gap-1">
                        {hazard.ppe.map((item, i) => (
                          <li key={i} className="text-sm text-white/70 leading-relaxed">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <SectionLabel>Safe handling</SectionLabel>
                      <ul className="list-disc list-outside pl-4 flex flex-col gap-1">
                        {hazard.handling.map((item, i) => (
                          <li key={i} className="text-sm text-white/70 leading-relaxed">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <SectionLabel>Disposal</SectionLabel>
                      <ul className="list-disc list-outside pl-4 flex flex-col gap-1">
                        {hazard.disposal.map((item, i) => (
                          <li key={i} className="text-sm text-white/70 leading-relaxed">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
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
    <p className="font-pixel text-[6px] text-white/35 uppercase tracking-widest mb-1">{children}</p>
  )
}
