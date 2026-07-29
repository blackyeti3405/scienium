/**
 * Figure rendering contract for the Data Terminal Code lane.
 *
 * ⚠️ SECURITY (FIX 2 — figures are ATTACKER-CONTROLLED SVG). A team-shared
 * script runs in a TEAMMATE's authenticated browser, and the script's author is
 * the attacker. User Python can monkeypatch matplotlib's `savefig` to emit
 * `<svg onload="…">` / `<image onerror="fetch('/api/…')">` instead of a chart,
 * so "matplotlib output is trusted" is FALSE.
 *
 * THE RENDER CONTRACT — C2 MUST follow it:
 *
 *     import { figureDataUrl } from '@/lib/data-terminal/runtime/figure'
 *     <img src={figureDataUrl(fig)} alt="figure" />
 *
 * An SVG loaded through `<img src="data:…">` runs in the browser's
 * secure-static image mode: no scripts execute, no external resources load. So
 * even a hostile figure is inert. NEVER `dangerouslySetInnerHTML` a figure, and
 * never inject the raw SVG string into the DOM. The `<img>` render is the
 * PRIMARY defense; `sanitizeFigureSvg` below is only a belt.
 */

/**
 * Turn a figure SVG into an inert `data:image/svg+xml` URL for an `<img src>`.
 * Base64-encodes the UTF-8 bytes (`btoa` is latin1-only, so encode → bytes →
 * binary string → btoa) — unicode axis labels/titles survive intact.
 */
export function figureDataUrl(svg: string): string {
  const bytes = new TextEncoder().encode(svg)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return `data:image/svg+xml;base64,${btoa(binary)}`
}

/**
 * Defense-in-depth belt (NOT the primary defense — the `<img>` render is).
 * Applied at the worker boundary before a figure leaves the sandbox: drop the
 * obvious active vectors — `<script>`, `<foreignObject>` (can host HTML/JS), and
 * `on*=` event handlers — and keep the `<svg`-prolog slice (matplotlib prepends
 * `<?xml?>`/`<!DOCTYPE>`, which is inline-noise). A conservative regex, so it can
 * only ever remove; a static matplotlib SVG has none of these to begin with.
 */
export function sanitizeFigureSvg(svg: string): string {
  const start = svg.indexOf('<svg')
  let s = start >= 0 ? svg.slice(start) : svg
  s = s
    .replace(/<script[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, '')
    .replace(/<foreignObject\b[^>]*\/?>/gi, '') // self-closing / unterminated
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '') // unquoted handler
  return s
}
