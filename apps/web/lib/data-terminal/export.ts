/**
 * Pure download/export helpers for the Data Terminal.
 * No React — DOM only (anchor clicks, SVG→canvas rasterizing).
 */

import { slugify as showcaseSlugify } from '@/lib/showcase'

/** Slugify a title to use as a download filename (no extension). */
export function slugify(title: string): string {
  return showcaseSlugify(title, 'experiment')
}

/** MIME type per Lab figure export format (Phase F1). */
const FIGURE_MIME = {
  png: 'image/png',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
} as const

/**
 * Download base64-encoded figure bytes produced by the Lab worker's DPI/format
 * export (`_export` → matplotlib `savefig`). `atob` yields a latin1 binary
 * string; copy it byte-for-byte into a Uint8Array so PNG/PDF bytes survive.
 */
export function downloadFigureExport(
  base64: string,
  format: keyof typeof FIGURE_MIME,
  filename: string,
) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  downloadBlob(new Blob([bytes], { type: FIGURE_MIME[format] }), filename)
}

/** Trigger a file download from a Blob. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  // Safari requires the anchor to be in the DOM before click().
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Rasterize a rendered chart SVG to a PNG Blob. Clones the SVG, prepends a solid
 * background rect (so transparency renders correctly), then draws it onto a
 * canvas. Throws on failure. Shared by the download and "attach to showcase"
 * paths so both rasterize identically.
 */
export async function chartSvgToPngBlob(
  svg: SVGSVGElement,
  background = '#0a1628',
): Promise<Blob> {
  const svgEl = svg.cloneNode(true) as SVGElement
  const width = svg.clientWidth || 600
  const height = svg.clientHeight || 240

  svgEl.setAttribute('width', String(width))
  svgEl.setAttribute('height', String(height))
  svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  // Prepend a dark background rect so transparency renders correctly
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  bg.setAttribute('width', String(width))
  bg.setAttribute('height', String(height))
  bg.setAttribute('fill', background)
  svgEl.insertBefore(bg, svgEl.firstChild)

  const serialized = new XMLSerializer().serializeToString(svgEl)
  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serialized)

  return new Promise<Blob>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob failed'))
          return
        }
        resolve(blob)
      }, 'image/png')
    }
    img.onerror = () => reject(new Error('SVG image load failed'))
    img.src = dataUrl
  })
}

/** Rasterize a rendered chart SVG to a PNG and download it. Throws on failure. */
export async function downloadChartPng(
  svg: SVGSVGElement,
  filename: string,
  background = '#0a1628',
): Promise<void> {
  downloadBlob(await chartSvgToPngBlob(svg, background), filename)
}

/**
 * Attach an exported Data Terminal figure (a PNG blob) to the team's showcase.
 * Reuses the SAME upload+attach pipeline the showcase board/quad chart use
 * (`POST /api/showcase/asset`, reservation-first R2 upload, team-scoped, rate
 * limited at the `upload` tier) — the only new axis is `kind: 'figure'`. Throws
 * with the server's message on failure (e.g. "Save your showcase details
 * first." when the team has no showcase yet). Same-origin fetch, so the session
 * cookie and CSRF origin check are satisfied without extra headers.
 */
export async function attachFigureToShowcase(blob: Blob, filename: string): Promise<void> {
  const form = new FormData()
  form.append('file', new File([blob], filename, { type: 'image/png' }))
  form.append('kind', 'figure')
  const res = await fetch('/api/showcase/asset', { method: 'POST', body: form })
  if (!res.ok) {
    let message = 'Could not attach the figure to your showcase.'
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      /* non-JSON error body — keep the default message */
    }
    throw new Error(message)
  }
}
