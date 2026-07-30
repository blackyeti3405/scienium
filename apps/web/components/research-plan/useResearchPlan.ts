'use client'

import { useEffect, useState } from 'react'
import { PROJECT_TYPES } from '@/lib/research-plan/types'
import { readNdjson } from '@/lib/ndjson'
import {
  EMPTY_REVIEW,
  initReviewStream,
  reduceReviewEvent,
  settleStream,
  type PlanReview,
} from './review-stream'
import type { IdeaCheckActivity, IdeaCheckResult } from './IdeaCheckView'

// Mirrors MAX_STORED_TEXT in app/api/research-plan/route.ts — the server truncates
// at the same cap, so the client-side counter matches what actually gets saved.
export const MAX_PLAN_TEXT = 100_000

export interface PlanData {
  googleDocUrl: string | null
  projectType: string | null
  projectSubtype: string | null
  lastSyncedAt: string | null
  hasText: boolean
  textPreview: string | null
  // F3 paste-text fallback — which input last populated the synced text, and
  // (only for paste rows) the full text so the textarea can edit-in-place.
  activeSource: 'google_doc' | 'paste' | null
  planTextFull: string | null
  lastReview: PlanReview | null
  lastIdeaCheck: IdeaCheckResult | null
  // REFACTOR2 P2-S7 — true when the stored result was produced from plan text
  // that has since been replaced. The result is still shown (it is the team's
  // work) but it must not read as a verdict on the plan now on screen.
  lastReviewStale: boolean
  lastIdeaCheckStale: boolean
}

/**
 * Feature-local hook for the Research Plan panel: owns the plan load/save
 * lifecycle and the two NDJSON-streamed actions (plan review, idea check),
 * extracted verbatim from `ResearchPlanFeature` (CMP-8).
 */
export function useResearchPlan() {
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<PlanData | null>(null)
  const [quota, setQuota] = useState({ limit: 3, remaining: 3 })

  const [type, setType] = useState<string | null>(null)
  const [subtype, setSubtype] = useState<string | null>(null)
  const [docUrl, setDocUrl] = useState('')

  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  // F3 paste-text fallback — a toggle beside the doc-link input; 'paste' seeds
  // from the DB on load when that's the team's currently-active source.
  const [mode, setMode] = useState<'doc' | 'paste'>('doc')
  const [planText, setPlanText] = useState('')
  const [savingText, setSavingText] = useState(false)
  const [textError, setTextError] = useState<string | null>(null)

  // Review (structured, fills in progressively as events stream)
  const [review, setReview] = useState<PlanReview | null>(null)
  const [reviewStreaming, setReviewStreaming] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  // Idea check (streamed activity + final structured verdict)
  const [checking, setChecking] = useState(false)
  const [activity, setActivity] = useState<IdeaCheckActivity>({
    status: '',
    searches: [],
    sources: [],
  })
  const [idea, setIdea] = useState<IdeaCheckResult | null>(null)
  const [ideaError, setIdeaError] = useState<string | null>(null)

  useEffect(() => {
    // Guard against a stale response landing after this effect's own cleanup —
    // React Strict Mode double-invokes mount effects in development, firing two
    // overlapping GETs; without this flag the first (now-stale) one can resolve
    // AFTER the user has already started editing (or after a save completed) and
    // clobber it back to the pre-edit text. Same idiom as every other fetch-on-
    // mount hook in this codebase (e.g. useSourceLanes, usePaperQuiz).
    let cancelled = false
    fetch('/api/research-plan')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        if (d.plan) {
          setPlan(d.plan)
          setType(d.plan.projectType)
          setSubtype(d.plan.projectSubtype)
          setDocUrl(d.plan.googleDocUrl ?? '')
          if (d.plan.activeSource === 'paste') {
            setMode('paste')
            setPlanText(d.plan.planTextFull ?? '')
          }
          setReview(d.plan.lastReview ?? null)
          setIdea(d.plan.lastIdeaCheck ?? null)
        }
        if (d.ideaCheck) setQuota(d.ideaCheck)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function sync() {
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch('/api/research-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleDocUrl: docUrl, projectType: type, projectSubtype: subtype }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Could not connect the doc')
      setPlan(d.plan)
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Could not connect the doc')
    } finally {
      setSyncing(false)
    }
  }

  // F3 paste-text fallback — same POST endpoint as sync(), just the other input.
  async function saveText() {
    setSavingText(true)
    setTextError(null)
    try {
      const res = await fetch('/api/research-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planText, projectType: type, projectSubtype: subtype }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Could not save the text')
      setPlan(d.plan)
    } catch (err) {
      setTextError(err instanceof Error ? err.message : 'Could not save the text')
    } finally {
      setSavingText(false)
    }
  }

  /**
   * The last COMPLETE review, kept out of `review` because `review` doubles as
   * the live accumulator the rubric rows fill in from. A run that never reaches
   * its terminal `done` event puts this back (P2-2).
   */
  async function runReview() {
    const lastGood = review
    setReviewStreaming(true)
    setReviewError(null)
    setReview(EMPTY_REVIEW)
    let acc = initReviewStream()
    try {
      const res = await fetch('/api/research-plan/review', { method: 'POST' })
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Review failed')
      }
      await readNdjson(res.body, (e) => {
        acc = reduceReviewEvent(acc, e)
        // Progressive display: the rows appear as they are graded. Whether they
        // are allowed to STAY is decided below, by the terminal event.
        setReview(acc.value)
      })
    } catch (err) {
      // A mid-stream disconnect lands here; an EOF with no `done` does not —
      // `settleStream` catches both.
      acc = { ...acc, error: acc.error ?? (err instanceof Error ? err.message : 'Review failed') }
    }
    const settled = settleStream(acc, acc.value, lastGood)
    setReview(settled.value)
    setReviewError(settled.error)
    // Only a completed review supersedes the stored one, so the staleness note
    // it carried (P2-S7) survives a failed run too.
    if (!settled.error) setPlan((p) => (p ? { ...p, lastReviewStale: false } : p))
    setReviewStreaming(false)
  }

  async function runIdeaCheck() {
    const lastGood = idea
    setChecking(true)
    setIdeaError(null)
    setIdea(null)
    setActivity({ status: 'Starting…', searches: [], sources: [] })
    // Same terminal-event rule as the review (P2-2): the verdict only exists on
    // the `done` event, so a truncated run leaves `streamed` null and the last
    // good verdict is restored rather than blanked.
    const got: {
      idea: IdeaCheckResult | null
      quota: { limit: number; remaining: number } | null
    } = { idea: null, quota: null }
    let outcome = { done: false, error: null as string | null }
    try {
      const res = await fetch('/api/research-plan/idea-check', { method: 'POST' })
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Idea check failed')
      }
      await readNdjson(res.body, (e) => {
        if (e.type === 'status') setActivity((a) => ({ ...a, status: e.message }))
        else if (e.type === 'search')
          setActivity((a) => ({ ...a, status: 'Searching…', searches: [...a.searches, e.query] }))
        else if (e.type === 'sources')
          setActivity((a) => ({ ...a, sources: [...a.sources, ...e.items] }))
        else if (e.type === 'done') {
          got.idea = { verdict: e.verdict, findings: e.findings }
          got.quota = { limit: e.limit, remaining: e.remaining }
          outcome = { ...outcome, done: true }
        } else if (e.type === 'error') outcome = { ...outcome, error: e.error }
      })
    } catch (err) {
      outcome = {
        ...outcome,
        error: outcome.error ?? (err instanceof Error ? err.message : 'Idea check failed'),
      }
    }
    const settled = settleStream(outcome, got.idea, lastGood)
    setIdea(settled.value)
    setIdeaError(settled.error)
    if (!settled.error) {
      if (got.quota) setQuota(got.quota)
      setPlan((p) => (p ? { ...p, lastIdeaCheckStale: false } : p))
    }
    setChecking(false)
  }

  const activeType = PROJECT_TYPES.find((t) => t.key === type)
  const canSync = docUrl.trim().length > 8 && !!type && !!subtype
  // Per plan: Save is disabled only on empty text — unlike the doc sync button,
  // it does not additionally require a project type/subtype selection.
  const canSaveText = planText.trim().length > 0
  const synced = plan?.hasText
  const isPasteSource = plan?.activeSource === 'paste'
  const textLen = planText.length
  const overCap = textLen >= MAX_PLAN_TEXT

  return {
    loading,
    plan,
    quota,
    type,
    setType,
    subtype,
    setSubtype,
    docUrl,
    setDocUrl,
    syncing,
    syncError,
    mode,
    setMode,
    planText,
    setPlanText,
    savingText,
    textError,
    review,
    reviewStreaming,
    reviewError,
    checking,
    activity,
    idea,
    ideaError,
    sync,
    saveText,
    runReview,
    runIdeaCheck,
    // Derived
    activeType,
    canSync,
    canSaveText,
    synced,
    isPasteSource,
    textLen,
    overCap,
  }
}
