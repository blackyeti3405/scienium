'use client'

import { useEffect, useState } from 'react'
import { Trophy, Check } from 'lucide-react'
import { ISEF_RUBRIC } from '@/lib/fairs/isef-rubric'
import type { RubricTrackKey } from '@/lib/fairs/rubric-scoring'
import { PanelListSkeleton } from '@/components/ui/skeletons/PanelListSkeleton'
import { BusyButton } from '@/components/ui/BusyButton'

interface CriterionRow {
  key: string
  numeral: string
  title: string
  maxScore: number
  score: number | null
  notes: string | null
  updatedByName: string | null
  updatedAt: string | null
}

interface SelfAssessmentResponse {
  track: RubricTrackKey
  criteria: CriterionRow[]
  totalScore: number
  totalMax: number
}

/**
 * Rubric self-assessment (Feature F1). Score + note per ISEF criterion with a
 * live "Judge-readiness" total out of 100, backed by GET/PUT
 * `/api/rubric/self-assessment`. Mounted both as the Fair Hub's "Self-check"
 * tab (ScienceFairFeature.tsx) and on the standalone `/fair-hub/rubric` route
 * — same component, no logic duplication. All state is server-backed; nothing
 * in localStorage.
 */
export function RubricSelfCheck() {
  const [track, setTrack] = useState<RubricTrackKey>('science')
  const [data, setData] = useState<SelfAssessmentResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/rubric/self-assessment?track=${track}`)
      .then(async (res) => {
        const d = await res.json()
        if (!res.ok) throw new Error(d.error ?? 'Failed to load self-check')
        if (!cancelled) setData(d)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load self-check')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [track])

  function applySave(criterion: CriterionRow['key'], patch: Partial<CriterionRow>, totals: { totalScore: number; totalMax: number }) {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        totalScore: totals.totalScore,
        totalMax: totals.totalMax,
        criteria: prev.criteria.map((c) => (c.key === criterion ? { ...c, ...patch } : c)),
      }
    })
  }

  const activeTrackDef = ISEF_RUBRIC.find((t) => t.key === track)!

  return (
    <div className="p-6 flex flex-col gap-5">
      {/* Header + track toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-pixel text-[9px] text-white flex items-center gap-1.5">
          <Trophy size={11} className="text-[#F5C518]" /> Rubric Self-check
        </h3>
        <div className="flex items-center gap-1 border border-white/15 rounded-sm overflow-hidden">
          {ISEF_RUBRIC.map((t) => (
            <button
              key={t.key}
              data-track={t.key}
              onClick={() => setTrack(t.key)}
              className={`font-pixel text-[7px] px-3 py-1.5 transition-colors ${
                track === t.key ? 'bg-[#F5C518] text-[#0d1b2e]' : 'text-white/45 hover:text-white/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Judge-readiness total */}
      <div
        data-testid="judge-readiness"
        className="flex items-center justify-between px-4 py-3 bg-[#F5C518]/8 border border-[#F5C518]/25 rounded-sm"
      >
        <span className="font-pixel text-[8px] text-[#F5C518]/85 uppercase tracking-widest">
          Judge-readiness
        </span>
        <span className="font-pixel text-[13px] text-[#F5C518]">
          {loading || !data ? '—' : data.totalScore} / {loading || !data ? 100 : data.totalMax}
        </span>
      </div>

      {error && <p className="font-pixel text-[8px] text-red-400 leading-loose">{error}</p>}

      {loading ? (
        <PanelListSkeleton rows={5} />
      ) : data ? (
        <div className="flex flex-col gap-3">
          {data.criteria.map((row) => {
            const rubricCriterion = activeTrackDef.criteria.find((c) => c.numeral === row.numeral)
            return (
              <CriterionCard
                key={row.key}
                row={row}
                items={rubricCriterion?.items ?? rubricCriterion?.subsections?.flatMap((s) => s.items)}
                onSaved={(patch, totals) => applySave(row.key, patch, totals)}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

// ─── Criterion card ─────────────────────────────────────────────────────────

function CriterionCard({
  row,
  items,
  onSaved,
}: {
  row: CriterionRow
  items?: string[]
  onSaved: (
    patch: Partial<CriterionRow>,
    totals: { totalScore: number; totalMax: number },
  ) => void
}) {
  const [score, setScore] = useState(row.score ?? 0)
  const [notes, setNotes] = useState(row.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Re-sync local draft ONLY when the identity of the criterion changes (e.g.
  // switching tracks swaps in a different row under the same card position).
  // Deliberately NOT keyed on row.score/row.notes: a successful save() flows
  // its own result back up through onSaved, which updates this same row's
  // score/notes as new props — keying on those values would re-run this
  // effect on every save and immediately stomp the "Saved" badge (setSaved
  // (true) in save() followed by this effect's setSaved(false) on the very
  // next commit). save() already owns setting score/notes/saved locally from
  // the PUT response, so this effect only needs to fire for a genuine
  // criterion switch.
  useEffect(() => {
    setScore(row.score ?? 0)
    setNotes(row.notes ?? '')
    setSaved(false)
    setSaveError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.key])

  async function save() {
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      // Clamp client-side to maxScore — the server enforces this too (authoritative cap).
      const clamped = Math.max(0, Math.min(score, row.maxScore))
      const res = await fetch('/api/rubric/self-assessment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track: row.key.split(':')[0],
          criterionKey: row.key,
          score: clamped,
          notes: notes.trim() ? notes.trim() : undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Save failed')
      setScore(d.criterion.score)
      setNotes(d.criterion.notes ?? '')
      onSaved(
        {
          score: d.criterion.score,
          notes: d.criterion.notes,
          updatedByName: d.criterion.updatedByName,
          updatedAt: d.criterion.updatedAt,
        },
        { totalScore: d.totalScore, totalMax: d.totalMax },
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div data-criterion-key={row.key} className="flex gap-3 px-4 py-3.5 bg-white/3 border border-white/10 rounded-sm">
      <span className="font-pixel text-[9px] text-[#F5C518] shrink-0 w-6 pt-0.5">{row.numeral}.</span>
      <div className="flex-1 min-w-0 flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm text-white/85">{row.title}</span>
          <span className="font-pixel text-[8px] text-white/40 shrink-0">{row.maxScore} pts</span>
        </div>

        {items && items.length > 0 && (
          <ul className="flex flex-col gap-1">
            {items.map((it, i) => (
              <li key={i} className="flex gap-1.5 text-[12px] text-white/55 leading-relaxed">
                <span className="text-green-400/60 shrink-0 mt-[1px]">✓</span>
                {it}
              </li>
            ))}
          </ul>
        )}

        {/* Score + notes controls */}
        <div className="flex items-center gap-3">
          <label className="font-pixel text-[7px] text-white/45 uppercase tracking-widest shrink-0">
            Score
          </label>
          <input
            type="number"
            min={0}
            max={row.maxScore}
            value={score}
            onChange={(e) => {
              const n = Number(e.target.value)
              setScore(Number.isFinite(n) ? Math.max(0, Math.min(n, row.maxScore)) : 0)
            }}
            onBlur={save}
            className="w-16 bg-[#0a1628] border border-white/20 text-white text-sm px-2 py-1.5 outline-none focus:border-[#F5C518]/60 rounded-sm"
          />
          <span className="font-pixel text-[7px] text-white/30">/ {row.maxScore}</span>

          <BusyButton
            busy={saving}
            busyLabel="Saving…"
            onClick={save}
            className="ml-auto font-pixel text-[7px] bg-[#F5C518] text-[#0d1b2e] px-3 py-1.5 rounded-sm hover:brightness-110 disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            Save
          </BusyButton>
          {saved && (
            <span
              data-testid="criterion-saved"
              className="font-pixel text-[7px] text-green-400 flex items-center gap-1"
            >
              <Check size={10} /> Saved
            </span>
          )}
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={save}
          rows={2}
          maxLength={1000}
          placeholder="Notes — what still needs work here?"
          className="w-full bg-[#0a1628] border border-white/15 text-white text-[13px] px-3 py-2 outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/25 resize-none rounded-sm"
        />

        {saveError && <p className="font-pixel text-[7px] text-red-400 leading-loose">{saveError}</p>}

        {row.updatedByName && !saveError && (
          <p className="font-pixel text-[6px] text-white/25">Last updated by {row.updatedByName}</p>
        )}
      </div>
    </div>
  )
}
