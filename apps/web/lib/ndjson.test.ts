import { describe, expect, it } from 'vitest'
import { readNdjson } from './ndjson'

/**
 * NDJSON stream reader — feeds the research-plan review and idea-check streams.
 * The cases that matter are the chunk boundaries: a JSON line split across two
 * network chunks must still parse, and the FINAL un-newlined line must flush —
 * dropping it silently loses the last event of every LLM review.
 */

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  let i = 0
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(enc.encode(chunks[i++]))
      else controller.close()
    },
  })
}

async function collect(chunks: string[]): Promise<unknown[]> {
  const events: unknown[] = []
  await readNdjson(streamOf(chunks), (e) => events.push(e))
  return events
}

describe('readNdjson', () => {
  it('parses one event per line', async () => {
    expect(await collect(['{"a":1}\n{"a":2}\n'])).toEqual([{ a: 1 }, { a: 2 }])
  })

  it('reassembles a line split across chunks', async () => {
    expect(await collect(['{"a":', '1}\n'])).toEqual([{ a: 1 }])
  })

  it('flushes a trailing line with no terminating newline', async () => {
    expect(await collect(['{"a":1}\n{"done":true}'])).toEqual([{ a: 1 }, { done: true }])
  })

  it('skips blank and malformed lines without dropping the rest', async () => {
    expect(await collect(['\n\nnot json\n{"ok":1}\n'])).toEqual([{ ok: 1 }])
  })

  it('handles a multi-byte character split across chunk boundaries', async () => {
    const enc = new TextEncoder().encode('{"s":"é"}\n')
    const events: unknown[] = []
    // Split INSIDE the 2-byte é sequence.
    const cut = 7
    let i = 0
    const chunks = [enc.slice(0, cut), enc.slice(cut)]
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (i < chunks.length) controller.enqueue(chunks[i++])
        else controller.close()
      },
    })
    await readNdjson(body, (e) => events.push(e))
    expect(events).toEqual([{ s: 'é' }])
  })
})
