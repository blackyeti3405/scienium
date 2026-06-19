'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, Clock, ExternalLink, Loader2 } from 'lucide-react'

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

export function FormsChecklist() {
  const [forms, setForms] = useState<FormItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

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
      <div className="flex-1 flex items-center justify-center text-white/40">
        <Loader2 size={18} className="animate-spin" />
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
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#F5C518] transition-all duration-500"
            style={{ width: denominator ? `${(completed / denominator) * 100}%` : '0%' }}
          />
        </div>
      </div>

      <p className="font-pixel text-[7px] text-white/35 leading-loose">
        Click a row to cycle through Not started → In progress → Complete.
        Forms 1, 1A, and 1C are required for every project; the others apply
        based on your research type.
      </p>

      <div className="flex flex-col gap-2">
        {forms.map((form) => (
          <button
            key={form.id}
            onClick={() => cycleStatus(form)}
            disabled={updating === form.id}
            className={`flex items-start gap-3 px-3 py-3 border rounded-sm text-left transition-colors ${
              form.status === 'complete'
                ? 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10'
                : form.status === 'in_progress'
                  ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10'
                  : 'border-white/10 bg-white/2 hover:bg-white/5'
            } disabled:opacity-50`}
          >
            {/* Status icon */}
            <div className="shrink-0 mt-0.5">
              {updating === form.id ? (
                <Loader2 size={15} className="text-white/40 animate-spin" />
              ) : form.status === 'complete' ? (
                <CheckCircle2 size={15} className="text-green-400" />
              ) : form.status === 'in_progress' ? (
                <Clock size={15} className="text-amber-400" />
              ) : (
                <Circle size={15} className="text-white/25" />
              )}
            </div>

            {/* Content */}
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
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
