import { describe, expect, it, vi } from 'vitest'
import { buildChatTurns, runChatTurn, type StoredMessage } from './thread'

/**
 * `lib/chat/thread.ts` had ZERO references anywhere in the suite (audit §3),
 * despite owning two things the file itself documents as load-bearing:
 *
 *  - the leading-assistant trim loop. A bounded history window can begin
 *    mid-exchange (user rows are written before the paid call, assistant rows
 *    after; the team-shared Vega thread interleaves teammates by createdAt).
 *    Anthropic rejects a `messages` array that opens on an assistant turn —
 *    lose the loop and it is a hard 400 on a long chat, for both routes.
 *  - the two `cache_control: { type: 'ephemeral' }` breakpoints at
 *    `convo.length - 1` and `- 2`. Without a breakpoint IN `messages`, every
 *    prior turn re-bills at full price on every request: the file names this as
 *    the difference between LINEAR and O(N²) Anthropic spend over a long
 *    conversation. An unbounded cost regression with a green suite.
 */

const msg = (role: 'user' | 'assistant', content: string): StoredMessage => ({ role, content })

/** The cache-marked turns, by index, in a built conversation. */
function cachedIndexes(convo: ReturnType<typeof buildChatTurns>): number[] {
  return convo.flatMap((t, i) =>
    Array.isArray(t.content) && t.content.some((b) => b.cache_control?.type === 'ephemeral')
      ? [i]
      : [],
  )
}

/** The plain text of a turn, whichever content shape it ended up in. */
const textOf = (turn: { content: unknown }): string =>
  typeof turn.content === 'string'
    ? turn.content
    : (turn.content as { text: string }[]).map((b) => b.text).join('')

describe('buildChatTurns — the history window', () => {
  it('reverses the DESC window into chronological order and appends the new turn', () => {
    // Rows arrive newest-first from `orderBy: { createdAt: 'desc' }`.
    const convo = buildChatTurns(
      [msg('assistant', 'a2'), msg('user', 'u2'), msg('assistant', 'a1'), msg('user', 'u1')],
      'new question',
    )

    expect(convo.map((t) => t.role)).toEqual(['user', 'assistant', 'user', 'assistant', 'user'])
    expect(convo.map(textOf)).toEqual(['u1', 'a1', 'u2', 'a2', 'new question'])
  })

  it('TRIMS leading assistant turns — Anthropic rejects a thread that opens on one', () => {
    // The window sliced mid-exchange: two assistant rows are the oldest in it.
    const convo = buildChatTurns(
      [msg('user', 'u1'), msg('assistant', 'orphan-b'), msg('assistant', 'orphan-a')],
      'new question',
    )

    expect(convo[0]!.role).toBe('user')
    expect(convo.map(textOf)).toEqual(['u1', 'new question'])
  })

  it('trims a run of assistant turns, not just one', () => {
    const convo = buildChatTurns(
      [msg('user', 'u1'), msg('assistant', 'c'), msg('assistant', 'b'), msg('assistant', 'a')],
      'q',
    )

    expect(convo.map((t) => t.role)).toEqual(['user', 'user'])
  })

  it('drops an ALL-assistant window entirely rather than sending it', () => {
    const convo = buildChatTurns([msg('assistant', 'b'), msg('assistant', 'a')], 'q')

    expect(convo).toHaveLength(1)
    expect(convo[0]!.role).toBe('user')
    expect(textOf(convo[0]!)).toBe('q')
  })

  it('an empty history is just the new user turn', () => {
    const convo = buildChatTurns([], 'first ever question')

    expect(convo).toHaveLength(1)
    expect(convo[0]!.role).toBe('user')
  })

  it('never trims an assistant turn that has a user turn before it', () => {
    const convo = buildChatTurns([msg('assistant', 'a1'), msg('user', 'u1')], 'q')

    expect(convo.map((t) => t.role)).toEqual(['user', 'assistant', 'user'])
  })
})

describe('buildChatTurns — the BLK-6 cache breakpoints', () => {
  it('marks exactly the LAST TWO turns, and nothing earlier', () => {
    const convo = buildChatTurns(
      [msg('assistant', 'a2'), msg('user', 'u2'), msg('assistant', 'a1'), msg('user', 'u1')],
      'q',
    )

    // length 5 → indexes 4 and 3. Anything else and the cached prefix moves,
    // which is a full-price re-bill of the whole conversation.
    expect(cachedIndexes(convo)).toEqual([3, 4])
  })

  it('the breakpoint is on the NEW user turn, so the whole prefix caches', () => {
    const convo = buildChatTurns([msg('user', 'u1'), msg('assistant', 'a1')], 'q')
    const last = convo[convo.length - 1]!

    expect(textOf(last)).toBe('q')
    expect(last.content).toEqual([
      { type: 'text', text: 'q', cache_control: { type: 'ephemeral' } },
    ])
  })

  it('marks the single turn (and no phantom index -1) on an empty history', () => {
    const convo = buildChatTurns([], 'q')

    expect(convo).toHaveLength(1)
    expect(cachedIndexes(convo)).toEqual([0])
  })

  it('two breakpoints, so a one-message interleave still hits the cache', () => {
    // The reason there are TWO: on the next request the conversation has grown
    // by two turns, and the older breakpoint is what the new prefix matches
    // against when turns interleave by one.
    const convo = buildChatTurns([msg('user', 'u1'), msg('assistant', 'a1'), msg('user', 'u0')], 'q')

    expect(cachedIndexes(convo)).toHaveLength(2)
  })

  it('never rewrites text while wrapping it', () => {
    const convo = buildChatTurns([msg('user', 'keep me exactly')], 'and me')

    expect(convo.map(textOf)).toEqual(['keep me exactly', 'and me'])
  })
})

describe('runChatTurn — the turn lifecycle', () => {
  const ok = () => ({ reply: 'hello', usageJson: { inputTokens: 1, outputTokens: 2 } })

  it('persists the user turn as pending BEFORE the paid call', async () => {
    const createPending = vi.fn(async () => ({ id: 'row_1' }))
    const callAnthropic = vi.fn(async () => ok())

    await runChatTurn({
      createPending,
      callAnthropic,
      onError: vi.fn(),
      markError: vi.fn(async () => {}),
      complete: vi.fn(async () => {}),
    })

    expect(createPending.mock.invocationCallOrder[0]!).toBeLessThan(
      callAnthropic.mock.invocationCallOrder[0]!,
    )
  })

  it('completes with the same requestId it created the pending row with', async () => {
    let created: string | undefined
    const complete = vi.fn(async () => {})

    const result = await runChatTurn({
      createPending: async (requestId) => {
        created = requestId
        return { id: 'row_1' }
      },
      callAnthropic: async () => ok(),
      onError: vi.fn(),
      markError: vi.fn(async () => {}),
      complete,
    })

    expect(result).toEqual({ ok: true, reply: 'hello' })
    expect(complete).toHaveBeenCalledWith('row_1', { inputTokens: 1, outputTokens: 2 }, 'hello', created)
  })

  it('a failed provider call marks the turn `error` and never completes it', async () => {
    const markError = vi.fn(async () => {})
    const complete = vi.fn(async () => {})
    const onError = vi.fn()

    const result = await runChatTurn({
      createPending: async () => ({ id: 'row_1' }),
      callAnthropic: async () => {
        throw new Error('provider 529')
      },
      onError,
      markError,
      complete,
    })

    expect(result).toEqual({ ok: false })
    expect(onError).toHaveBeenCalledOnce()
    expect(markError).toHaveBeenCalledWith('row_1')
    expect(complete).not.toHaveBeenCalled()
  })

  it('a failing markError does not mask the provider failure', async () => {
    // The pending row is already durable; a bookkeeping failure on top of a
    // provider failure must still surface as `{ ok: false }`, not a throw the
    // route reports as a 500 with a different cause.
    const result = await runChatTurn({
      createPending: async () => ({ id: 'row_1' }),
      callAnthropic: async () => {
        throw new Error('provider 529')
      },
      onError: vi.fn(),
      markError: async () => {
        throw new Error('db down too')
      },
      complete: vi.fn(async () => {}),
    })

    expect(result).toEqual({ ok: false })
  })
})
