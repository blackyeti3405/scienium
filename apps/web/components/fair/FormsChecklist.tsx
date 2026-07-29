'use client'

import { useCallback, useEffect, useState } from 'react'
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

/** Mirrors `EditionGuidanceState` in lib/fairs/forms.ts. */
type GuidanceState = 'reviewed' | 'expired' | 'stale_review' | 'unreviewed'

interface EditionInfo {
  season: string
  formsUrl: string
  rulesUrl: string
  guidance: GuidanceState
}

/**
 * The team's own fair, when the Fair Hub has already matched one. Passed down
 * rather than fetched: this panel is deliberately decoupled from the Overview
 * tab's `/api/fairs/match` load, and re-fetching it here to print one line
 * would undo that. Absent (still loading, or no match) simply prints nothing.
 */
export interface LocalFairRef {
  name: string
  websiteUrl: string | null
}

/** Why the app is not giving applicability guidance of its own (§0.8). */
const GUIDANCE_COPY: Record<Exclude<GuidanceState, 'reviewed'>, { title: string; body: (season: string) => string }> = {
  unreviewed: {
    title: 'Check the official rules',
    body: (season) =>
      `These are the ISEF ${season} form titles. Which forms your project needs, and whether each one is signed before or after you start experimenting, is decided by the official rules and your fair director — scienium does not give that guidance. Read the official form and rules before you fill anything in.`,
  },
  stale_review: {
    title: 'Check the official rules',
    body: (season) =>
      `The ISEF ${season} form wording changed after it was last checked by a teacher, so scienium is holding back its notes on which form applies until they are checked again. Go by the official form and rules.`,
  },
  expired: {
    title: 'This list may be out of date',
    body: (season) =>
      `These titles were read off the ISEF ${season} forms page and have not been re-checked since. A newer season's forms are probably out — take the current list from the official forms page, not from here.`,
  },
}

/** Fail closed on a state this build does not know: show the cautionary notice. */
function guidanceCopy(state: GuidanceState) {
  return GUIDANCE_COPY[state as Exclude<GuidanceState, 'reviewed'>] ?? GUIDANCE_COPY.unreviewed
}

const STATUS_CYCLE: FormStatus[] = ['not_started', 'in_progress', 'complete']

export function FormsChecklist({ localFair }: { localFair?: LocalFairRef | null }) {
  const [forms, setForms] = useState<FormItem[]>([])
  const [edition, setEdition] = useState<EditionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  // The form whose last status write failed. A rejected PATCH used to be a bare
  // `catch {}`: the icon silently snapped back and the student had no way to
  // tell "didn't save" from "misclicked".
  const [writeFailed, setWriteFailed] = useState<FormItem | null>(null)
  const [expandedHazards, toggleHazard] = useToggleSet<HazardClassKey>()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/fairs/forms')
      // A non-OK response can still carry a parseable body (`{ error }`) or none
      // at all — a 307 to the sign-in page returns HTML, and `r.json()` alone
      // surfaced that as a JSON parse error. Check the status first.
      const d = await r.json().catch(() => ({}))
      // `r.ok` alone still misses one case: a stale session redirects (307) to
      // the sign-in PAGE, which `fetch` follows same-origin, landing on a 200
      // with an HTML body. `d.forms` is then `undefined` and would otherwise
      // reach `forms.filter` below and crash the render instead of erroring.
      if (!r.ok || d.error || !Array.isArray(d.forms))
        throw new Error(d.error ?? "Couldn't load your forms.")
      setForms(d.forms)
      setEdition(d.edition)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your forms.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function cycleStatus(form: FormItem) {
    const current = STATUS_CYCLE.indexOf(form.status)
    const next = STATUS_CYCLE[(current + 1) % STATUS_CYCLE.length]
    setUpdating(form.id)
    setWriteFailed(null)
    try {
      const res = await fetch(`/api/fairs/forms/${form.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error ?? 'Update failed')
      setForms((prev) =>
        prev.map((f) =>
          f.id === form.id ? { ...f, status: d.status, completedAt: d.completedAt } : f,
        ),
      )
    } catch {
      // State stays unchanged — but say so, and keep the row so "Try again"
      // can re-send the exact same transition.
      setWriteFailed(form)
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
    return (
      <div
        data-testid="forms-load-failed"
        className="m-6 rounded-sm border border-red-400/30 bg-red-500/10 px-5 py-4 flex items-center justify-between gap-3"
      >
        <span className="font-pixel text-[8px] text-red-300 leading-relaxed">{error}</span>
        <button
          onClick={() => void load()}
          className="shrink-0 font-pixel text-[8px] border border-white/20 text-white/60 px-3 py-1.5 rounded-sm hover:border-[#F5C518]/50 hover:text-[#F5C518] transition-colors"
        >
          Try again
        </button>
      </div>
    )
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

      {writeFailed && (
        <div
          data-testid="forms-write-failed"
          className="rounded-sm border border-red-400/30 bg-red-500/10 px-4 py-3 flex items-center justify-between gap-3"
        >
          <span className="font-pixel text-[8px] text-red-300 leading-relaxed">
            Couldn&apos;t save {writeFailed.code} — its status is unchanged.
          </span>
          <button
            onClick={() => void cycleStatus(writeFailed)}
            className="shrink-0 font-pixel text-[8px] border border-white/20 text-white/60 px-3 py-1.5 rounded-sm hover:border-[#F5C518]/50 hover:text-[#F5C518] transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {edition && (edition.guidance !== 'reviewed' || localFair) && (
        <div
          data-testid="forms-edition-notice"
          className="border border-[#F5C518]/30 bg-[#F5C518]/[0.06] rounded-sm px-3 py-2.5 flex flex-col gap-1.5"
        >
          <span className="font-pixel text-[8px] text-[#F5C518] uppercase tracking-widest">
            {edition.guidance === 'reviewed'
              ? 'Your fair has the final say'
              : guidanceCopy(edition.guidance).title}
          </span>
          {edition.guidance !== 'reviewed' && (
            <p className="text-[12px] text-white/60 leading-relaxed">
              {guidanceCopy(edition.guidance).body(edition.season)}
            </p>
          )}
          {localFair && (
            <p data-testid="forms-local-fair" className="text-[12px] text-white/60 leading-relaxed">
              You&apos;re matched to <span className="text-white/80">{localFair.name}</span>. An
              affiliated fair can require its own forms, its own signatures and earlier deadlines
              than ISEF&apos;s — check with them, and go by what they say.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {localFair?.websiteUrl && (
              <a
                href={localFair.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-pixel text-[7px] text-[#F5C518]/80 hover:text-[#F5C518] flex items-center gap-1"
              >
                <ExternalLink size={8} /> {localFair.name}
              </a>
            )}
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
