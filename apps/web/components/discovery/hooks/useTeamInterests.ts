'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { requestJson } from '@/lib/api/client'
import type { Interest } from '@/components/discovery/InterestSeeds'

const interestSchema = z.object({
  id: z.string(),
  text: z.string(),
  createdByUserId: z.string(),
  isMine: z.boolean(),
  createdAt: z.coerce.string(),
})

const interestsListSchema = z.object({
  interests: z.array(interestSchema).optional(),
  currentUserId: z.string().nullable().optional(),
})

/**
 * Team interests (#2 Activate TopicInterest): load on mount plus the
 * add / optimistic-remove pair, extracted verbatim from `DiscoveryFeature`.
 */
export function useTeamInterests() {
  const [interests, setInterests] = useState<Interest[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    requestJson('/api/discovery/interests', interestsListSchema)
      .then((d) => {
        if (Array.isArray(d.interests)) setInterests(d.interests)
        setCurrentUserId(d.currentUserId ?? null)
      })
      .catch(() => {})
  }, [])

  async function addInterest(text: string) {
    try {
      const d = await requestJson(
        '/api/discovery/interests',
        z.object({ interest: interestSchema.optional() }),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        },
      )
      if (d.interest) {
        const added = d.interest
        // Idempotent add: skip if the row is already in local state.
        setInterests((prev) => (prev.some((i) => i.id === added.id) ? prev : [...prev, added]))
      }
    } catch (err) {
      console.error('[discovery] add interest failed:', err)
    }
  }

  async function removeInterest(id: string) {
    const prev = interests
    setInterests((cur) => cur.filter((i) => i.id !== id)) // optimistic
    try {
      const d = await requestJson(
        '/api/discovery/interests',
        z.object({ deleted: z.number().optional() }),
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        },
      )
      if (d.deleted === 0) setInterests(prev) // roll back if not owned
    } catch (err) {
      console.error('[discovery] remove interest failed:', err)
      setInterests(prev)
    }
  }

  return { interests, currentUserId, addInterest, removeInterest }
}
