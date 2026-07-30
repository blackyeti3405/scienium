import 'server-only'
import net from 'node:net'
import { lookup } from 'node:dns/promises'

/** The one shared sleep — six identical copies of this line existed before. */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** A hostile `Retry-After: 86400` used to park the invocation for a day. */
const MAX_RETRY_AFTER_MS = 10_000
/** Redirect hops followed before we call it a loop. */
const MAX_REDIRECTS = 5

/** Discard a response we are not going to read, so the socket is released. */
const discard = (res: Response) => res.body?.cancel().catch(() => {})

/**
 * Is this literal address one we refuse to talk to?
 *
 * Loopback, RFC1918, CGNAT, link-local (which is where every cloud metadata
 * endpoint lives — `169.254.169.254`), multicast/reserved, IPv6 loopback,
 * IPv6 unique-local (`fc00::/7`) and IPv6 link-local (`fe80::/10`), plus the
 * IPv4-mapped IPv6 forms of all of the above.
 */
export function isPrivateAddress(ip: string): boolean {
  if (net.isIP(ip) === 4) {
    const [a = 0, b = 0] = ip.split('.').map(Number)
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    )
  }
  const s = ip.toLowerCase()
  const mapped = s.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (mapped) return isPrivateAddress(mapped[1]!)
  return s === '::' || s === '::1' || /^f[cd]/.test(s) || /^fe[89ab]/.test(s)
}

/**
 * The outbound-request policy: HTTP(S) only, and never at an address inside
 * our own network. Applied to the caller's URL **and to every redirect hop** —
 * a provider that answers 302 `Location: http://169.254.169.254/…` is the same
 * SSRF as a provider-supplied URL, and only checking the first hop misses it.
 *
 * ACCEPTED RISK — DNS rebinding (REFACTOR2 P2-1, pilot-accepted, revisit
 * post-pilot). Resolve-then-connect is a TOCTOU window: the name can move
 * between this lookup and the socket, so a literal address check here does not
 * prove the address the kernel finally dials. Closing it means connecting to
 * the vetted IP ourselves, which means a custom `undici` dispatcher — `fetch`'s
 * `dispatcher` init option is the only seam, and there is no way to construct
 * one without adding `undici` as a direct dependency. (Rewriting the URL to the
 * literal IP and setting `Host` is not an alternative: it breaks TLS SNI and
 * certificate validation, trading a narrow window for a total one.)
 *
 * What bounds it for the pilot: every destination reached through here is one
 * of ~8 hard-coded provider hosts — arXiv, OpenAlex, Wikipedia, YouTube oEmbed,
 * Nominatim, MedlinePlus, PatentsView, Semantic Scholar, Google Docs export —
 * chosen by a literal in our own source, never by a student or a provider
 * payload. An attacker would have to control the DNS for one of those names, at
 * which point rebinding is the least of it. Revisit the moment this primitive
 * fetches a URL a *user* supplied; that is the trigger, not a date.
 */
export async function assertPublicUrl(input: string | URL): Promise<URL> {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new Error(`refusing unparseable outbound URL: ${String(input).slice(0, 120)}`)
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`refusing outbound scheme ${url.protocol}`)
  }
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw new Error(`refusing non-public address ${host}`)
    return url
  }
  // `localhost`, and any single-label intranet name, resolve to somewhere only
  // this network can see. No provider we use has one.
  if (!host.includes('.')) throw new Error(`refusing non-public host ${host}`)
  const addresses = await lookup(host, { all: true }).catch(() => {
    throw new Error(`refusing unresolvable host ${host}`)
  })
  const bad = addresses.find((a) => isPrivateAddress(a.address))
  if (bad) throw new Error(`refusing non-public host ${host} (resolves to ${bad.address})`)
  return url
}

/** `Retry-After` is either delta-seconds or an HTTP-date. Both, clamped. */
export function retryAfterMs(header: string | null): number | null {
  if (!header) return null
  const seconds = Number(header)
  const ms = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(header) - Date.now() // HTTP-date form; NaN if it is neither
  if (!Number.isFinite(ms) || ms <= 0) return null
  return Math.min(ms, MAX_RETRY_AFTER_MS)
}

/**
 * Bounded fetch with 429/5xx retry-after backoff — the ONE provider retry
 * discipline (REFACTOR2 P2-2 / P2-S10). Every discovery adapter, the wiki
 * article route and the Google Doc export are one-line bindings supplying only
 * their headers, timeout, and backoff base, so the whole outbound policy is
 * here and inherited rather than re-argued per adapter:
 *
 * - **scheme/host/private-range checks on every hop** (`assertPublicUrl`), with
 *   redirects followed manually so hop 3 is checked as hard as hop 1;
 * - **a total deadline** across attempts, not just a per-attempt timeout — a
 *   provider that is slow three times in a row used to cost 3× `timeoutMs`
 *   plus unbounded backoff;
 * - **`Retry-After` clamped** (both header forms) and never allowed to sleep
 *   past the deadline;
 * - **every response we don't return is drained** — retry and redirect bodies
 *   leaked a socket each.
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
    /** Ceiling across ALL attempts, backoff included (default `4 × timeoutMs`). */
    totalTimeoutMs?: number
    /** Exponential backoff base when no retry-after header (default 400ms). */
    backoffMs?: number
    /** Total attempts including the first (default 3). `1` disables retrying. */
    attempts?: number
    /** Also retry thrown network errors, not just 429/5xx statuses. */
    retryOnError?: boolean
    timeoutMessage?: string
    /** Accepted `content-type` prefixes for a 2xx body (e.g. `application/json`). */
    contentTypes?: readonly string[]
  },
): Promise<Response> {
  const {
    headers,
    timeoutMs,
    totalTimeoutMs = timeoutMs * 4,
    attempts = 3,
    backoffMs = 400,
    retryOnError = false,
    timeoutMessage,
    contentTypes,
  } = opts
  const deadline = Date.now() + totalTimeoutMs
  const remaining = () => deadline - Date.now()
  const expired = () => new Error(`request exceeded its ${totalTimeoutMs}ms total deadline`)

  for (let attempt = 0; ; attempt++) {
    if (remaining() <= 0) throw expired()
    let res: Response
    try {
      res = await fetchOnce(url, headers, Math.min(timeoutMs, remaining()), timeoutMessage)
    } catch (err) {
      if (!retryOnError || attempt >= attempts - 1) throw err
      const wait = backoffMs * 2 ** attempt
      if (remaining() - wait <= 0) throw expired()
      await sleep(wait)
      continue
    }

    if ((res.status === 429 || res.status >= 500) && attempt < attempts - 1) {
      await discard(res)
      const wait = retryAfterMs(res.headers.get('retry-after')) ?? backoffMs * 2 ** attempt
      if (remaining() - wait <= 0) throw expired()
      await sleep(wait)
      continue
    }

    if (res.ok && contentTypes?.length) {
      const got = (res.headers.get('content-type') ?? '').toLowerCase()
      if (!contentTypes.some((t) => got.startsWith(t))) {
        await discard(res)
        throw new Error(`unexpected content-type "${got || 'none'}" from ${new URL(url).host}`)
      }
    }
    return res
  }
}

/** One request, following redirects by hand so every hop is revalidated. */
async function fetchOnce(
  url: string,
  headers: Record<string, string> | undefined,
  timeoutMs: number,
  timeoutMessage: string | undefined,
): Promise<Response> {
  let target = await assertPublicUrl(url)
  const started = Date.now()

  for (let hop = 0; ; hop++) {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const left = timeoutMs - (Date.now() - started)
    let res: Response
    try {
      res = await Promise.race([
        fetch(target, { headers, signal: controller.signal, redirect: 'manual' }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort()
            reject(new Error(timeoutMessage ?? `request timed out after ${timeoutMs}ms`))
          }, Math.max(left, 1))
        }),
      ])
    } finally {
      clearTimeout(timer)
    }

    const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null
    if (!location) return res
    await discard(res)
    if (hop >= MAX_REDIRECTS) throw new Error(`too many redirects from ${target.host}`)
    target = await assertPublicUrl(new URL(location, target))
  }
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
