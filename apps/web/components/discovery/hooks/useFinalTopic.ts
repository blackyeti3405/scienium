'use client'

import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import { requestJson } from '@/lib/api/client'
import { interpretTopicSaveResponse } from '@/lib/discovery/topic-save'

const topicSchema = z.object({
  topic: z.string().nullable().optional(),
  paperCount: z.number().optional(),
})

/**
 * Final research topic (stored on the team): load on mount, plus the
 * save/confirm-wipe flow, extracted verbatim from `DiscoveryFeature`. The KP
 * tick-up and the interest-connection toast belong to the feature shell, so
 * both are injected rather than owned here (the `usePapers` pattern).
 */
export function useFinalTopic({
  onKpAwarded,
  onInterestConnect,
}: {
  /** Fired with the server-granted "Topic Locked" bonus (#1). */
  onKpAwarded: (amount: number) => void
  /** Fired with the composed topic ↔ interest overlap message (#2). */
  onInterestConnect: (message: string) => void
}) {
  const [finalTopic, setFinalTopic] = useState<string | null>(null)
  // Sources currently in the literature review — the Lab Profile settings
  // surface shows this next to the topic; Discovery ignores it.
  const [topicPaperCount, setTopicPaperCount] = useState(0)
  // False-prompt fix: without this, the topic bar's "Choose your final research
  // topic" CTA renders for the ~1s the /api/discovery/topic fetch is in flight,
  // even for a team that already has a topic set.
  const [topicLoaded, setTopicLoaded] = useState(false)
  /** The topic GET failed — distinct from "no topic yet". */
  const [topicLoadError, setTopicLoadError] = useState(false)
  const [editingTopic, setEditingTopic] = useState(false)
  const [topicDraft, setTopicDraft] = useState('')
  const [savingTopic, setSavingTopic] = useState(false)
  // Save failures (429 rate limit, stale session, validation). Previously a
  // non-2xx fell through to the success path and rendered as "topic cleared" —
  // now it surfaces here and the editor stays open with the draft intact.
  const [topicSaveError, setTopicSaveError] = useState<string | null>(null)
  // Confirmation modal state
  const [topicConfirm, setTopicConfirm] = useState<{
    newTopic: string
    paperCount: number
  } | null>(null)
  const [topicWipeResult, setTopicWipeResult] = useState<{
    removedCount: number
    removedTitles: string[]
  } | null>(null)
  // Second-phase confirmation: the specific papers the server proposes removing.
  // The student approves this exact list; nothing is deleted until they do.
  const [topicRemovalConfirm, setTopicRemovalConfirm] = useState<{
    newTopic: string
    papers: { id: string; title: string }[]
    proposalToken: string | null
  } | null>(null)

  // A failed GET used to land in `.finally` anyway, so `topicLoaded` flipped
  // true with no topic and the bar rendered "Choose your final research topic"
  // to a team that already has one — the exact false prompt the skeleton exists
  // to prevent (§0.9 Row C2). Now the failure keeps `topicLoaded` false and
  // shows a retry instead.
  const loadTopic = useCallback(() => {
    setTopicLoadError(false)
    requestJson('/api/discovery/topic', topicSchema)
      .then((d) => {
        setFinalTopic(d.topic ?? null)
        setTopicPaperCount(d.paperCount ?? 0)
        setTopicLoaded(true)
      })
      .catch((err) => {
        console.error('[discovery] load topic failed:', err)
        setTopicLoadError(true)
      })
  }, [])

  useEffect(() => {
    loadTopic()
  }, [loadTopic])

  // Raw fetch (not `requestJson`): the 409 responses are real flows, not
  // errors. The response protocol is interpreted by the SHARED
  // `interpretTopicSaveResponse` (also used by Lab Profile settings) so the
  // two clients can't diverge again.
  async function saveTopic(
    topic: string,
    confirmWipe = false,
    confirmRemoveIds?: string[],
    proposalToken?: string | null,
  ) {
    setSavingTopic(true)
    setTopicSaveError(null)
    try {
      const res = await fetch('/api/discovery/topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          confirmWipe,
          ...(confirmRemoveIds ? { confirmRemoveIds } : {}),
          // The server's proposal token authorizes the delete (P1-R1).
          ...(proposalToken ? { proposalToken } : {}),
        }),
      })
      const body = await res.json().catch(() => ({}))
      const outcome = interpretTopicSaveResponse(res.status, body, topic)

      switch (outcome.kind) {
        case 'needsConfirmation':
          // Server says papers exist — ask the user to confirm before wiping
          setTopicConfirm({ newTopic: outcome.newTopic, paperCount: outcome.paperCount })
          return
        case 'needsRemovalConfirmation':
          // Server proposed a specific removal list — surface the titles so the
          // student can spot a paper that should NOT be going.
          setTopicConfirm(null)
          setTopicRemovalConfirm({
            newTopic: outcome.newTopic,
            papers: outcome.papers,
            proposalToken: outcome.proposalToken,
          })
          return
        case 'error':
          // Keep the editor open with the draft intact — the topic did NOT change.
          setTopicSaveError(outcome.message)
          return
        case 'saved': {
          setFinalTopic(outcome.topic)
          setEditingTopic(false)
          setTopicConfirm(null)
          setTopicRemovalConfirm(null)
          if (outcome.removedCount > 0) {
            setTopicWipeResult({
              removedCount: outcome.removedCount,
              removedTitles: outcome.removedTitles,
            })
          }
          // One-time "Topic Locked" bonus (#1) — tick up when the server grants it.
          if (outcome.topicBonusKp !== null) onKpAwarded(outcome.topicBonusKp)
          // Topic ↔ interest overlap (#2): surface which seeded interests connect.
          const hits = outcome.connections.filter((c) => c.connected)
          if (hits.length > 0) {
            const phrases = hits.slice(0, 3).map((c) => c.text)
            onInterestConnect(
              `Connected to your ${phrases.length === 1 ? 'interest' : 'interests'}: ${phrases.join(', ')}`,
            )
          }
          return
        }
      }
    } catch (err) {
      console.error('[discovery] save topic failed:', err)
      setTopicSaveError('Could not save topic — check your connection and try again')
    } finally {
      setSavingTopic(false)
    }
  }

  return {
    finalTopic,
    topicPaperCount,
    topicLoaded,
    topicLoadError,
    retryLoadTopic: loadTopic,
    editingTopic,
    setEditingTopic,
    topicDraft,
    setTopicDraft,
    savingTopic,
    topicSaveError,
    setTopicSaveError,
    topicConfirm,
    setTopicConfirm,
    topicRemovalConfirm,
    setTopicRemovalConfirm,
    topicWipeResult,
    setTopicWipeResult,
    saveTopic,
  }
}
