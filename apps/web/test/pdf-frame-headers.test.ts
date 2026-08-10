import { describe, it, expect } from 'vitest'
import nextConfig from '../next.config.mjs'

/**
 * The Q&A viewer embeds the stored PDF in a same-origin <iframe>. The global
 * security headers send `frame-ancestors 'none'` + `X-Frame-Options: DENY` on
 * every response, which the browser applies to the PDF DOCUMENT — so it fetches
 * the bytes (200 in the log) and then refuses to render them, leaving a blank
 * viewer and no error anywhere. That is a genuinely confusing failure, so these
 * pin both halves: the exception exists, and it is EXACTLY as narrow as it needs
 * to be.
 */
const PDF_ROUTES = ['/api/papers/:id/file', '/api/teacher/student/:id/literature/:paperId/file']

async function rules() {
  const cfg = nextConfig as unknown as { headers: () => Promise<
    { source: string; headers: { key: string; value: string }[] }[]
  > }
  return cfg.headers()
}
const get = (r: { headers: { key: string; value: string }[] }, k: string) =>
  r.headers.find((h) => h.key.toLowerCase() === k.toLowerCase())?.value

describe('PDF iframe headers', () => {
  it('lets the two PDF routes be framed same-origin', async () => {
    const all = await rules()
    for (const source of PDF_ROUTES) {
      const rule = all.find((r) => r.source === source)
      expect(rule, `no header rule for ${source}`).toBeTruthy()
      expect(get(rule!, 'X-Frame-Options')).toBe('SAMEORIGIN')
      expect(get(rule!, 'Content-Security-Policy')).toContain("frame-ancestors 'self'")
      expect(get(rule!, 'Content-Security-Policy')).not.toContain("frame-ancestors 'none'")
    }
  })

  it('keeps every OTHER route locked against framing', async () => {
    const all = await rules()
    const global = all.find((r) => r.source === '/(.*)')
    expect(get(global!, 'X-Frame-Options')).toBe('DENY')
    expect(get(global!, 'Content-Security-Policy')).toContain("frame-ancestors 'none'")
  })

  it('relaxes ONLY the framing directives, nothing else in the CSP', async () => {
    // The exception is a string replace on the shared policy; if it ever drifts
    // into loosening script-src or object-src that is a real hole.
    const all = await rules()
    const global = get(all.find((r) => r.source === '/(.*)')!, 'Content-Security-Policy')!
    const pdf = get(all.find((r) => r.source === PDF_ROUTES[0])!, 'Content-Security-Policy')!
    expect(pdf).toBe(global.replace("frame-ancestors 'none'", "frame-ancestors 'self'"))
    expect(pdf).toContain("object-src 'none'")
  })

  it('the exception applies after the global rule, so it wins on duplicate keys', async () => {
    const all = await rules()
    const globalIdx = all.findIndex((r) => r.source === '/(.*)')
    for (const source of PDF_ROUTES) {
      expect(all.findIndex((r) => r.source === source)).toBeGreaterThan(globalIdx)
    }
  })
})
