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
