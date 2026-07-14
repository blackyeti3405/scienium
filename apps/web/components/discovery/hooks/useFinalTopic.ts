'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { requestJson } from '@/lib/api/client'

const topicSchema = z.object({ topic: z.string().nullable().optional() })

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
  // False-prompt fix: without this, the topic bar's "Choose your final research
  // topic" CTA renders for the ~1s the /api/discovery/topic fetch is in flight,
  // even for a team that already has a topic set.
  const [topicLoaded, setTopicLoaded] = useState(false)
  const [editingTopic, setEditingTopic] = useState(false)
  const [topicDraft, setTopicDraft] = useState('')
  const [savingTopic, setSavingTopic] = useState(false)
  // Confirmation modal state
  const [topicConfirm, setTopicConfirm] = useState<{
    newTopic: string
    paperCount: number
  } | null>(null)
  const [topicWipeResult, setTopicWipeResult] = useState<{
    removedCount: number
    removedTitles: string[]
  } | null>(null)

  useEffect(() => {
    requestJson('/api/discovery/topic', topicSchema)
      .then((d) => setFinalTopic(d.topic ?? null))
      .catch(() => {})
      .finally(() => setTopicLoaded(true))
  }, [])

  // Raw fetch (not `requestJson`): the 409 response is a real flow, carrying
  // `requiresConfirmation` + `paperCount` for the confirm-wipe modal.
  async function saveTopic(topic: string, confirmWipe = false) {
    setSavingTopic(true)
    try {
      const res = await fetch('/api/discovery/topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, confirmWipe }),
      })
      const d = await res.json()
      if (res.status === 409 && d.requiresConfirmation) {
        // Server says papers exist — ask the user to confirm before wiping
        setTopicConfirm({ newTopic: topic, paperCount: d.paperCount })
        return
      }
      setFinalTopic(d.topic ?? null)
      setEditingTopic(false)
      setTopicConfirm(null)
      if (d.removedCount > 0) {
        setTopicWipeResult({ removedCount: d.removedCount, removedTitles: d.removedTitles })
      }
      // One-time "Topic Locked" bonus (#1) — tick up when the server grants it.
      if (typeof d.topicBonusKp === 'number') onKpAwarded(d.topicBonusKp)
      // Topic ↔ interest overlap (#2): surface which seeded interests connect.
      if (Array.isArray(d.connections)) {
        const hits = d.connections.filter((c: { connected?: boolean }) => c.connected)
        if (hits.length > 0) {
          const phrases = hits.slice(0, 3).map((c: { text: string }) => c.text)
          onInterestConnect(
            `Connected to your ${phrases.length === 1 ? 'interest' : 'interests'}: ${phrases.join(', ')}`,
          )
        }
      }
    } catch (err) {
      console.error('[discovery] save topic failed:', err)
    } finally {
      setSavingTopic(false)
    }
  }

  return {
    finalTopic,
    topicLoaded,
    editingTopic,
    setEditingTopic,
    topicDraft,
    setTopicDraft,
    savingTopic,
    topicConfirm,
    setTopicConfirm,
    topicWipeResult,
    setTopicWipeResult,
    saveTopic,
  }
}
