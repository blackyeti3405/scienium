'use client'

import { useState, useEffect, useCallback } from 'react'
import { ApiError } from '@/lib/api/client'
import type { ReviewGrade } from '@/lib/literature/srs'
import { getDeck, buildDeck, reviewCard, removeCard, type VocabCardView } from './vocab-api'

/** The outcome of the most recent grading action — lifted up to this hook
 *  (rather than kept as local state inside the review UI) so it survives
 *  the post-review deck refresh; see `review()`'s doc comment below. */
export interface JustGraded {
  kpEarned: number
  capReached: boolean
}

/**
 * Vocabulary Builder data hook: owns the deck state and its load / build /
 * review / remove lifecycle. Mirrors `usePapers.ts`. ZERO LLM — every call
 * this hook makes hits a deterministic route (build/deck/review/cards).
 */
export function useVocabDeck() {
  const [cards, setCards] = useState<VocabCardView[]>([])
  const [due, setDue] = useState<VocabCardView[]>([])
  const [counts, setCounts] = useState({ total: 0, dueToday: 0, byBox: {} as Record<string, number> })
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const [buildBusy, setBuildBusy] = useState(false)
  const [buildError, setBuildError] = useState<string | null>(null)

  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [justGraded, setJustGraded] = useState<JustGraded | null>(null)

  /**
   * `silent` skips the `setLoaded(false)` flip — used by the post-review
   * refresh (see `review()`) so the deck/due list updates in place without
   * ever reporting "not loaded", which would otherwise unmount whatever is
   * conditionally rendered on `loaded` (the review card, and any local
   * state living inside it) for one render pass.
   */
  const load = useCallback((opts: { silent?: boolean } = {}) => {
    setLoadError(false)
    if (!opts.silent) setLoaded(false)
    getDeck()
      .then((d) => {
        setCards(d.cards)
        setDue(d.due)
        setCounts(d.counts)
      })
      .catch((err) => {
        console.error('[vocab] failed to load deck:', err)
        setLoadError(true)
      })
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function build(paperId?: string) {
    setBuildBusy(true)
    setBuildError(null)
    try {
      await buildDeck(paperId)
      load()
    } catch (err) {
      setBuildError(err instanceof ApiError ? err.message : 'Could not build your deck.')
    } finally {
      setBuildBusy(false)
    }
  }

  /**
   * Grades one card, then refreshes the deck SILENTLY (`load({ silent: true
   * })`) — the previous unconditional `load()` here set `loaded` back to
   * `false` for the duration of the refetch, and `VocabPanel` unmounts
   * `ReviewView` whenever `loaded` is false. That unmount destroyed any
   * "just graded" state living inside `ReviewView` in the SAME render pass
   * it was set, so the KP-earned/cap-reached/"Scheduled." banner could
   * never actually render. `justGraded` now lives here instead, so it
   * survives the silent refresh regardless of what remounts; callers clear
   * it explicitly (`clearJustGraded`) when the student moves on to the next
   * card, not on a timer or on the refresh itself.
   */
  async function review(cardId: string, grade: ReviewGrade) {
    setReviewBusy(true)
    setReviewError(null)
    try {
      const result = await reviewCard(cardId, grade)
      setJustGraded({ kpEarned: result.kpEarned, capReached: result.capReached })
      load({ silent: true })
      return result
    } catch (err) {
      setReviewError(err instanceof ApiError ? err.message : 'Could not submit that review.')
      throw err
    } finally {
      setReviewBusy(false)
    }
  }

  function clearJustGraded() {
    setJustGraded(null)
  }

  async function remove(cardId: string) {
    const prevCards = cards
    const prevDue = due
    // Optimistic removal.
    setCards((c) => c.filter((x) => x.id !== cardId))
    setDue((d) => d.filter((x) => x.id !== cardId))
    try {
      await removeCard(cardId)
      load()
    } catch (err) {
      console.error('[vocab] delete failed:', err)
      setCards(prevCards) // roll back
      setDue(prevDue)
    }
  }

  return {
    cards,
    due,
    counts,
    loaded,
    loadError,
    retryLoad: load,
    buildBusy,
    buildError,
    build,
    reviewBusy,
    reviewError,
    justGraded,
    clearJustGraded,
    review,
    remove,
  }
}
