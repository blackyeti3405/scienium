import { describe, expect, it } from 'vitest'
import { figureDataUrl, sanitizeFigureSvg } from './figure'

function decode(dataUrl: string): string {
  const b64 = dataUrl.replace('data:image/svg+xml;base64,', '')
  const bin = atob(b64)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

describe('figureDataUrl', () => {
  it('produces an inert data:image/svg+xml;base64 URL', () => {
    expect(figureDataUrl('<svg/>')).toMatch(/^data:image\/svg\+xml;base64,/)
  })

  it('round-trips ascii and unicode', () => {
    const ascii = '<svg><text>hello</text></svg>'
    const unicode = '<svg><text>café — β 🎨 温度</text></svg>'
    expect(decode(figureDataUrl(ascii))).toBe(ascii)
    expect(decode(figureDataUrl(unicode))).toBe(unicode)
  })
})

describe('sanitizeFigureSvg (belt)', () => {
  it('drops an on* event handler', () => {
    const out = sanitizeFigureSvg('<svg onload="fetch(1)"><rect/></svg>')
    expect(out).not.toMatch(/onload/i)
    expect(out).toContain('<rect/>')
  })

  it('drops <script> and <foreignObject>', () => {
    const out = sanitizeFigureSvg(
      '<svg><script>fetch(1)</script><foreignObject><b>x</b></foreignObject><rect/></svg>',
    )
    expect(out).not.toMatch(/<script/i)
    expect(out).not.toMatch(/<foreignObject/i)
    expect(out).toContain('<rect/>')
  })

  it('drops the <?xml?>/<!DOCTYPE> prolog by slicing to <svg', () => {
    const out = sanitizeFigureSvg('<?xml version="1.0"?>\n<!DOCTYPE svg>\n<svg><rect/></svg>')
    expect(out.startsWith('<svg')).toBe(true)
  })

  it('strips unquoted and single-quoted handlers too', () => {
    expect(sanitizeFigureSvg("<svg onerror='x'><image onerror=alert(1)/></svg>")).not.toMatch(
      /onerror/i,
    )
  })
})
