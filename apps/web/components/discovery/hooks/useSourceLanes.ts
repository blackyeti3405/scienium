'use client'

import { useEffect, useMemo, useState } from 'react'
import type { DiscoveryNode } from '@/stores/discoveryStore'
import type { SourceChip, SourceLanes } from '@/lib/discovery/sources'

// Local mirror of `lib/discovery/semanticscholar.ts`'s `S2Tldr` — that module is
// `server-only`, so a client hook re-declares the (tiny, stable) shape rather than
// importing it, keeping this file free of any server-only import.
type SourceTldr = { text: string }

/**
 * Source surf lanes for the currently-open source node (shared by the reader +
 * the source branch panel), extracted verbatim from `DiscoveryFeature`.
 * Raw fetch (not `requestJson`): a failed lanes load intentionally degrades to
 * `{ lanes: null }` rather than surfacing an error.
 */
export function useSourceLanes(currentNode: DiscoveryNode | null) {
  const [sourceLanes, setSourceLanes] = useState<SourceLanes | null>(null)
  const [lanesLoading, setLanesLoading] = useState(false)
  const [tldr, setTldr] = useState<SourceTldr | null>(null)

  useEffect(() => {
    if (!currentNode || currentNode.source !== 'source') {
      setSourceLanes(null)
      setTldr(null)
      return
    }
    const nodeId = currentNode.id
    let cancelled = false
    setLanesLoading(true)
    setSourceLanes(null)
    setTldr(null)
    fetch(`/api/discovery/sources/${nodeId}/citations`)
      .then((r) => (r.ok ? r.json() : { lanes: null, tldr: null }))
      .then((data: { lanes: SourceLanes | null; tldr?: SourceTldr | null }) => {
        if (cancelled) return
        setSourceLanes(data.lanes)
        setTldr(data.tldr ?? null)
      })
      .catch(() => {
        if (!cancelled) {
          setSourceLanes(null)
          setTldr(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLanesLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNode?.id])

  // Flatten the lanes into a laneId → chip lookup so the branch panel can render
  // the selected chips (pendingLinks holds laneIds for source nodes) and resolve
  // them on "Branch into N".
  const chipsById = useMemo(() => {
    const map = new Map<string, SourceChip>()
    if (sourceLanes) {
      for (const lane of Object.values(sourceLanes)) {
        for (const chip of lane) map.set(chip.laneId, chip)
      }
    }
    return map
  }, [sourceLanes])

  return { sourceLanes, lanesLoading, chipsById, tldr }
}
