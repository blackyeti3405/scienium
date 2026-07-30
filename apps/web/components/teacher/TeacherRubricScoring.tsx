'use client'

import { useEffect, useRef, useState } from 'react'
import { Trophy, Check } from 'lucide-react'
import { ISEF_RUBRIC } from '@/lib/fairs/isef-rubric'
import {
  clampScore,
  parseScoreInput,
  totalMaxFor,
  type RubricTrackKey,
} from '@/lib/fairs/rubric-scoring'
import { createSaveQueue } from '@/lib/save-queue'
import { anchorFor, type RubricAnchor } from '@/lib/fairs/rubric-anchors'
import { BusyButton } from '@/components/ui/BusyButton'
import { PixelSkeleton } from '@/components/ui/PixelSkeleton'
import { TrackToggle, ChecklistItems } from '@/components/fair/RubricControls'

interface CriterionRow {
  key: string
  numeral: string
  title: string
  maxScore: number
  teacherScore: number | null
  teacherNotes: string | null
  updatedByName: string | null
  updatedAt: string | null
  studentScore: number | null
  studentNotes: string | null
}

interface TeacherRubricResponse {
  track: RubricTrackKey
  criteria: CriterionRow[]
  teacherTotal: number
  studentTotal: number
  totalMax: number
}

const TIER_LABEL: Record<RubricAnchor['tier'], string> = {
  low: 'Low',
  mid: 'Mid',
  high: 'High',
}

/**
 * Teacher-side rubric scoring + comparison + anchor content (Feature F10).
 * Mounted inside the teacher's per-student drill-down (StudentDetail.tsx) for
 * ONE team at a time. GET/PUT `/api/teacher/rubric` — distinct from the
 * student's own `/api/rubric/self-assessment`, which this component never
 * calls or mutates. All state is server-backed; nothing in localStorage.
 */
export function TeacherRubricScoring({ teamId }: { teamId: string }) {
  const [track, setTrack] = useState<RubricTrackKey>('science')
  const [data, setData] = useState<TeacherRubricResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /**
   * A failed save reported UP from a criterion card.
   *
   * §0.7 reads this as "track switching can discard unsaved state". In the
   * ordinary path it does not: clicking the track toggle blurs the field first,
   * so the autosave is already in flight and `applySave` correctly drops its
   * stale result. What IS discarded is the FAILURE — the track change remounts
   * every card under new `row.key`s, so a card whose save then rejects sets its
   * error on a component that no longer exists. The teacher's typed feedback is
   * gone and nothing ever said so. This panel survives the switch, so the
   * message does too.
   */
  const [saveError, setSaveError] = useState<{ numeral: string; message: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/teacher/rubric?teamId=${encodeURIComponent(teamId)}&track=${track}`)
      .then(async (res) => {
        const d = await res.json()
        if (!res.ok) throw new Error(d.error ?? 'Failed to load rubric')
        if (!cancelled) setData(d)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load rubric')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [teamId, track])

  function applySave(
    savedTrack: RubricTrackKey,
    criterionKey: string,
    patch: Partial<CriterionRow>,
    totals: { teacherTotal: number; totalMax: number },
  ) {
    setData((prev) => {
      // A slow PUT can resolve after the teacher toggled tracks and the other
      // track's GET landed — its totals belong to the old track, so drop it.
      if (!prev || prev.track !== savedTrack) return prev
      return {
        ...prev,
        teacherTotal: totals.teacherTotal,
        totalMax: totals.totalMax,
        criteria: prev.criteria.map((c) => (c.key === criterionKey ? { ...c, ...patch } : c)),
      }
    })
  }

  const activeTrackDef = ISEF_RUBRIC.find((t) => t.key === track)!

  return (
    <div className="flex flex-col gap-5">
      {/* Header + track toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-pixel text-[9px] text-white flex items-center gap-1.5">
          <Trophy size={11} className="text-[#F5C518]" /> Rubric Scoring
        </h3>
        <TrackToggle value={track} onChange={setTrack} testAttr />
      </div>

      {/* Teacher vs student totals */}
      <div className="flex flex-wrap gap-3">
        <TotalCard
          label="Teacher score"
          value={loading || !data ? null : data.teacherTotal}
          max={loading || !data ? totalMaxFor(track) : data.totalMax}
          gold
          testId="teacher-rubric-total"
        />
        <TotalCard
          label="Team self-check"
          value={loading || !data ? null : data.studentTotal}
          max={loading || !data ? totalMaxFor(track) : data.totalMax}
        />
      </div>

      {error && <p className="font-pixel text-[8px] text-red-400 leading-loose">{error}</p>}

      {saveError && (
        <p role="alert" data-testid="rubric-save-error" className="font-pixel text-[8px] text-red-400 leading-loose">
          Criterion {saveError.numeral}: {saveError.message}
        </p>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <CriterionCardSkeleton key={i} />
          ))}
        </div>
      ) : data ? (
        <div className="flex flex-col gap-3">
          {data.criteria.map((row) => {
            const rubricCriterion = activeTrackDef.criteria.find((c) => c.numeral === row.numeral)
            return (
              <TeacherCriterionCard
                key={row.key}
                teamId={teamId}
                track={track}
                row={row}
                items={rubricCriterion?.items ?? rubricCriterion?.subsections?.flatMap((s) => s.items)}
                onSaved={(patch, totals) => {
                  setSaveError(null)
                  applySave(track, row.key, patch, totals)
                }}
                onSaveFailed={(message) => setSaveError({ numeral: row.numeral, message })}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

// ─── Totals card ────────────────────────────────────────────────────────────

function TotalCard({
  label,
  value,
  max,
  gold = false,
  testId,
}: {
  label: string
  /** null while loading — renders the em-dash placeholder. */
  value: number | null
  max: number
  gold?: boolean
  testId?: string
}) {
  return (
    <div
      data-testid={testId}
      className={`flex-1 min-w-[160px] flex items-center justify-between px-4 py-3 rounded-sm border ${
        gold ? 'bg-[#F5C518]/8 border-[#F5C518]/25' : 'bg-white/5 border-white/15'
      }`}
    >
      <span
        className={`font-pixel text-[8px] uppercase tracking-widest ${
          gold ? 'text-[#F5C518]/85' : 'text-white/50'
        }`}
      >
        {label}
      </span>
      <span className={`font-pixel text-[13px] ${gold ? 'text-[#F5C518]' : 'text-white/80'}`}>
        {value ?? '—'} / {max}
      </span>
    </div>
  )
}

// ─── Criterion card skeleton ────────────────────────────────────────────────

function CriterionCardSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-3.5 bg-white/3 border border-white/10 rounded-sm">
      <PixelSkeleton variant="line" h="h-3" w="w-6" className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <PixelSkeleton variant="line" h="h-3.5" w="w-40" />
          <PixelSkeleton variant="line" h="h-3" w="w-10" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PixelSkeleton variant="box" h="h-14" w="w-full" />
          <PixelSkeleton variant="box" h="h-14" w="w-full" />
        </div>
        <PixelSkeleton variant="box" h="h-10" w="w-full" />
      </div>
    </div>
  )
}

// ─── Criterion card ─────────────────────────────────────────────────────────

function TeacherCriterionCard({
  teamId,
  track,
  row,
  items,
  onSaved,
  onSaveFailed,
}: {
  teamId: string
  track: RubricTrackKey
  row: CriterionRow
  items?: string[]
  onSaved: (
    patch: Partial<CriterionRow>,
    totals: { teacherTotal: number; totalMax: number },
  ) => void
  /** Reported to the panel, which outlives a track switch. */
  onSaveFailed: (message: string) => void
}) {
  // The score box holds TEXT, not a number. `Number('')` is 0, so parsing on
  // every keystroke made a cleared box a real zero — see `parseScoreInput`.
  const [scoreText, setScoreText] = useState(row.teacherScore === null ? '' : String(row.teacherScore))
  const [notes, setNotes] = useState(row.teacherNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  /** The 2s "Saved" badge timer — cleared on re-save and on unmount. */
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current)
    },
    [],
  )

  // Re-sync local draft ONLY when the identity of the criterion changes (e.g.
  // switching tracks swaps in a different row under the same card position).
  // Deliberately NOT keyed on row.teacherScore/row.teacherNotes: a successful
  // save() flows its own result back up through onSaved, which updates this
  // same row's teacherScore/teacherNotes as new props — keying on those
  // values would re-run this effect on every save and immediately stomp the
  // "Saved" badge.
  useEffect(() => {
    setScoreText(row.teacherScore === null ? '' : String(row.teacherScore))
    setNotes(row.teacherNotes ?? '')
    setSaved(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.key])

  /**
   * The one writer. Serialized rather than refused: `save()` used to open with
   * `if (saving) return`, so a teacher who typed a score, tabbed to the notes
   * box (blur → save starts), typed notes and clicked away (blur → refused) had
   * their notes silently not persisted — on screen, with no indication.
   * Reproduced against the original: two blurs, one PUT, and the one that went
   * out carried the EMPTY notes. `createSaveQueue` coalesces instead, so a burst
   * still costs one request but the newest snapshot is the one that lands.
   */
  // The queue is created ONCE, so its writer would otherwise close over
  // first-render props forever. Harmless today — a track switch remounts this
  // card under a different `row.key` — but only by accident, and `onSaved` is a
  // fresh closure on every parent render. Read the current ones instead.
  const latest = useRef({ teamId, track, row, onSaved, onSaveFailed })
  useEffect(() => {
    latest.current = { teamId, track, row, onSaved, onSaveFailed }
  })

  const queue = useRef(
    createSaveQueue<{ score: number; notes: string }>(async (snapshot) => {
      const { teamId: tid, track: tk, row: r, onSaved: report } = latest.current
      const res = await fetch('/api/teacher/rubric', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: tid,
          track: tk,
          criterionKey: r.key,
          // Clamped at send time, never while typing — the server re-checks.
          score: clampScore(snapshot.score, r.maxScore),
          notes: snapshot.notes.trim() ? snapshot.notes.trim() : undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Save failed')
      setScoreText(String(d.criterion.teacherScore))
      setNotes(d.criterion.teacherNotes ?? '')
      report(
        {
          teacherScore: d.criterion.teacherScore,
          teacherNotes: d.criterion.teacherNotes,
          updatedByName: d.criterion.updatedByName,
          updatedAt: d.criterion.updatedAt,
        },
        { teacherTotal: d.teacherTotal, totalMax: d.totalMax },
      )
    }),
  )

  const parsedScore = parseScoreInput(scoreText)

  async function save() {
    // A cleared box is "no score", not zero — there is nothing to send, and the
    // notes may still be dirty on their own.
    const score = parsedScore ?? row.teacherScore ?? 0
    setSaving(true)
    setSaved(false)
    await queue.current.save({ score, notes })
    setSaving(false)
    if (queue.current.unsaved) {
      // Reported UP: this card may already be unmounting behind a track switch.
      latest.current.onSaveFailed('could not be saved — check your connection and try again.')
      return
    }
    setSaved(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaved(false), 2000)
  }

  // Blur must not persist anything the teacher didn't change — focus+blur on
  // an unscored criterion would otherwise write a real 0 ("Last scored by…").
  // onSaved keeps row.teacherScore/teacherNotes current, so this stays accurate
  // across saves. Compared against what was TYPED, unclamped: clamping first
  // would make a typed 99 equal a stored 10 and the correcting save would never
  // fire. The Save button still saves unconditionally.
  const dirty =
    (parsedScore !== null && parsedScore !== (row.teacherScore ?? 0)) ||
    notes.trim() !== (row.teacherNotes ?? '')
  function saveIfDirty() {
    // Restore the stored value rather than leaving a blank box that the server
    // does not agree with.
    if (parsedScore === null && row.teacherScore !== null) setScoreText(String(row.teacherScore))
    if (dirty) void save()
  }

  // Static curated content joined client-side from the bundle — the API
  // deliberately returns only the score rows (see app/api/teacher/rubric).
  const anchor = anchorFor(track, row.key)
  const anchors = anchor?.anchors ?? []
  const talkingPoints = anchor?.talkingPoints ?? []

  return (
    <div data-criterion-key={row.key} className="flex gap-3 px-4 py-3.5 bg-white/3 border border-white/10 rounded-sm">
      <span className="font-pixel text-[9px] text-[#F5C518] shrink-0 w-6 pt-0.5">{row.numeral}.</span>
      <div className="flex-1 min-w-0 flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm text-white/85">{row.title}</span>
          <span className="font-pixel text-[8px] text-white/40 shrink-0">{row.maxScore} pts</span>
        </div>

        {items && items.length > 0 && <ChecklistItems items={items} />}

        {/* Side-by-side comparison: student self-check (read-only) vs teacher score */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 bg-white/3 border border-white/10 rounded-sm px-3 py-2">
            <span className="font-pixel text-[7px] text-white/40 uppercase tracking-widest">
              Team self-check
            </span>
            <span data-testid="student-score" className="text-sm text-white/70 tabular-nums">
              {row.studentScore === null ? '—' : `${row.studentScore} / ${row.maxScore}`}
            </span>
            {row.studentNotes && (
              <p className="text-[12px] text-white/45 leading-relaxed italic">{row.studentNotes}</p>
            )}
          </div>

          <div className="flex flex-col gap-2 bg-[#F5C518]/5 border border-[#F5C518]/20 rounded-sm px-3 py-2">
            <span className="font-pixel text-[7px] text-[#F5C518]/70 uppercase tracking-widest">
              Teacher score
            </span>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={row.maxScore}
                value={scoreText}
                onChange={(e) => setScoreText(e.target.value)}
                onBlur={saveIfDirty}
                className="w-16 bg-[#0a1628] border border-white/20 text-white text-sm px-2 py-1.5 outline-none focus:border-[#F5C518]/60 rounded-sm"
              />
              <span className="font-pixel text-[7px] text-white/40">/ {row.maxScore}</span>

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
                  data-testid="teacher-criterion-saved"
                  className="font-pixel text-[7px] text-green-400 flex items-center gap-1"
                >
                  <Check size={10} /> Saved
                </span>
              )}
            </div>
          </div>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveIfDirty}
          rows={2}
          maxLength={1000}
          placeholder="Teacher notes — feedback for this criterion…"
          className="w-full bg-[#0a1628] border border-white/15 text-white text-[13px] px-3 py-2 outline-none focus:border-[#F5C518]/60 transition-colors placeholder:text-white/40 resize-none rounded-sm"
        />

        {row.updatedByName && (
          <p className="font-pixel text-[6px] text-white/40">Last scored by {row.updatedByName}</p>
        )}

        {/* Anchor content + talking points — regular font, curated static content */}
        {anchors.length > 0 && (
          <div className="flex flex-col gap-2 pt-1">
            <span className="font-pixel text-[7px] text-white/40 uppercase tracking-widest">
              Rubric anchors
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {anchors.map((a) => (
                <div
                  key={a.tier}
                  className="flex flex-col gap-1 bg-[#0a1628] border border-white/10 rounded-sm px-2.5 py-2"
                >
                  <span className="text-xs font-medium text-white/70">
                    {TIER_LABEL[a.tier]}{' '}
                    <span className="text-white/40 font-normal">({a.scoreBand})</span>
                  </span>
                  <p className="text-[12px] text-white/55 leading-relaxed">{a.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {talkingPoints.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="font-pixel text-[7px] text-white/40 uppercase tracking-widest">
              Talking points
            </span>
            <ul className="flex flex-col gap-1">
              {talkingPoints.map((tp, i) => (
                <li key={i} className="flex gap-1.5 text-[12px] text-white/60 leading-relaxed">
                  <span className="text-[#F5C518]/60 shrink-0 mt-[1px]">›</span>
                  {tp}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
