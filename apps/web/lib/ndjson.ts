// Client-safe helper for newline-delimited-JSON streams (no server imports).

/** Read an NDJSON stream, dispatching each parsed object to `onEvent`. */
export async function readNdjson(
  body: ReadableStream<Uint8Array>,
  onEvent: (e: any) => void,
) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).trim()
      buf = buf.slice(idx + 1)
      if (line) {
        try {
          onEvent(JSON.parse(line))
        } catch {
          /* ignore partial */
        }
      }
    }
  }
  if (buf.trim()) {
    try {
      onEvent(JSON.parse(buf.trim()))
    } catch {
      /* ignore */
    }
  }
}
