import 'server-only'

/** The one shared sleep — six identical copies of this line existed before. */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Bounded fetch with 429/5xx retry-after backoff — the ONE provider retry
 * discipline (REFACTOR2 P2-2 direction). Five discovery adapters carried
 * copy-pasted versions of this loop; each now passes only its own headers,
 * timeout, and backoff base.
 *
 * Timeout is a Promise.race guard, not just an abort: aborting the socket
 * doesn't interrupt a stalled OS-level connect (which can otherwise hang
 * ~2 min), so we give up at `timeoutMs` regardless and leave the losing fetch
 * to GC. `retryOnError` additionally retries thrown network failures (feeds
 * want this; JSON APIs surface the error).
 */
export async function fetchWithRetry(
  url: string,
  opts: {
    headers?: Record<string, string>
    timeoutMs: number
    /** Exponential backoff base when no retry-after header (default 400ms). */
    backoffMs?: number
    /** Also retry thrown network errors, not just 429/5xx statuses. */
    retryOnError?: boolean
    timeoutMessage?: string
  },
  attempt = 0,
): Promise<Response> {
  const { headers, timeoutMs, backoffMs = 400, retryOnError = false, timeoutMessage } = opts
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  let res: Response
  try {
    res = await Promise.race([
      fetch(url, { headers, signal: controller.signal }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort()
          reject(new Error(timeoutMessage ?? `request timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      }),
    ])
  } catch (err) {
    if (retryOnError && attempt < 2) {
      await sleep(backoffMs * 2 ** attempt)
      return fetchWithRetry(url, opts, attempt + 1)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
  if ((res.status === 429 || res.status >= 500) && attempt < 2) {
    const retryAfter = Number(res.headers.get('retry-after'))
    const backoff =
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoffMs * 2 ** attempt
    await sleep(backoff)
    return fetchWithRetry(url, opts, attempt + 1)
  }
  return res
}

/**
 * Read a provider response body with a hard byte ceiling.
 *
 * `res.json()` and `res.text()` buffer whatever arrives. `content-length` is not
 * a defence — it is optional, and a chunked response simply omits it — so the
 * count has to come from the bytes themselves. The stream is cancelled the
 * moment the ceiling is crossed, so an oversized body costs the ceiling and not
 * the body.
 *
 * Throws rather than truncating: half a JSON document is not a smaller JSON
 * document, and silently parsing a prefix is how a cap becomes a corruption bug.
 */
export async function readCapped(res: Response, maxBytes: number): Promise<string> {
  // No `content-length` shortcut: it did not survive its negative control —
  // removing it failed nothing, because the streaming counter below already
  // stops at the ceiling either way. A header check would only be an early exit
  // for the honest case, and it is not the honest case this defends against.
  if (!res.body) return ''

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let size = 0
  let text = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) throw new Error(`response body exceeds ${maxBytes} bytes`)
      text += decoder.decode(value, { stream: true })
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
  return text + decoder.decode()
}

/** `readCapped` + `JSON.parse`, for JSON providers. Throws on either failure. */
export async function readJsonCapped(res: Response, maxBytes: number): Promise<unknown> {
  return JSON.parse(await readCapped(res, maxBytes))
}
