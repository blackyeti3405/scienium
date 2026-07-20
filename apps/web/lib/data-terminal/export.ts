/**
 * Pure download/export helpers for the Data Terminal.
 * No React — DOM only (anchor clicks, SVG→canvas rasterizing).
 */

import { slugify as showcaseSlugify } from '@/lib/showcase'

/** Slugify a title to use as a download filename (no extension). */
export function slugify(title: string): string {
  return showcaseSlugify(title, 'experiment')
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
 * Rasterize a rendered chart SVG to a PNG and download it. Clones the SVG,
 * prepends a solid background rect (so transparency renders correctly), then
 * draws it onto a canvas and downloads the blob. Throws on failure.
 */
export async function downloadChartPng(
  svg: SVGSVGElement,
  filename: string,
  background = '#0a1628',
): Promise<void> {
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

  await new Promise<void>((resolve, reject) => {
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
        downloadBlob(blob, filename)
        resolve()
      }, 'image/png')
    }
    img.onerror = () => reject(new Error('SVG image load failed'))
    img.src = dataUrl
  })
}
