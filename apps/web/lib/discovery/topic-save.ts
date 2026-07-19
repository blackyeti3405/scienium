/**
 * Shared interpreter for `POST /api/discovery/topic` responses.
 *
 * Two clients drive the topic-save flow — the Discovery hook
 * (`useFinalTopic`) and Lab Profile settings — and both must understand the
 * same protocol: two distinct 409 confirmation shapes (generic wipe warning,
 * then the specific proposed-removal list), plain errors, and success. The two
 * hand-rolled copies had already diverged: the settings copy surfaced non-2xx
 * errors, the Discovery copy fell through to the success path and rendered a
 * transient 400/429 as "topic cleared" — in the one flow that authorizes
 * deleting papers. One pure function, tested, used by both, ends that class.
 */

export type TopicSaveOutcome =
  | { kind: 'needsConfirmation'; newTopic: string; paperCount: number }
  | { kind: 'needsRemovalConfirmation'; newTopic: string; papers: { id: string; title: string }[] }
  | { kind: 'error'; message: string }
  | {
      kind: 'saved'
      topic: string | null
      removedCount: number
      removedTitles: string[]
      topicBonusKp: number | null
      connections: { text: string; connected?: boolean }[]
    }

export function interpretTopicSaveResponse(
  status: number,
  body: unknown,
  requestedTopic: string,
): TopicSaveOutcome {
  const d = (body ?? {}) as Record<string, unknown>

  if (status === 409 && d.requiresConfirmation === true) {
    return {
      kind: 'needsConfirmation',
      newTopic: requestedTopic,
      paperCount: typeof d.paperCount === 'number' ? d.paperCount : 0,
    }
  }

  if (status === 409 && d.requiresRemovalConfirmation === true) {
    const papers = Array.isArray(d.papers)
      ? (d.papers as unknown[]).filter(
          (p): p is { id: string; title: string } =>
            typeof p === 'object' && p !== null &&
            typeof (p as { id?: unknown }).id === 'string' &&
            typeof (p as { title?: unknown }).title === 'string',
        )
      : []
    return { kind: 'needsRemovalConfirmation', newTopic: requestedTopic, papers }
  }

  // Any other non-2xx is an ERROR — never the success path. Falling through
  // here is exactly the bug this module exists to prevent: a 429 or stale-
  // session 401 must not read as "topic cleared".
  if (status < 200 || status >= 300) {
    return {
      kind: 'error',
      message: typeof d.error === 'string' && d.error ? d.error : 'Could not save topic',
    }
  }

  return {
    kind: 'saved',
    topic: typeof d.topic === 'string' ? d.topic : null,
    removedCount: typeof d.removedCount === 'number' ? d.removedCount : 0,
    removedTitles: Array.isArray(d.removedTitles)
      ? (d.removedTitles as unknown[]).filter((t): t is string => typeof t === 'string')
      : [],
    topicBonusKp: typeof d.topicBonusKp === 'number' ? d.topicBonusKp : null,
    connections: Array.isArray(d.connections)
      ? (d.connections as { text: string; connected?: boolean }[])
      : [],
  }
}
