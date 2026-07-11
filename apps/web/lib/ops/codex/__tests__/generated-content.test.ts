/**
 * Gate for the generated-content pipeline (source → wrapper).
 *
 * Complements `content-shape.test.ts` (semantic invariants) by proving the
 * source→wrapper mechanics are sound:
 *   1. every `../content/<slug>.json` validates against `TrackSchema` (zod),
 *   2. each wrapper module's default export is deep-equal to its JSON source
 *      (so the generated module changes nothing about the runtime data), and
 *   3. each track's stable checksum still matches the committed `.checksums.json`
 *      — the lock that a content edit was rebuilt on purpose (`pnpm --filter web
 *      codex:build`), not smuggled in.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { TrackSchema } from './track-schema'
import type { CodexTrack } from '../types'

import acousticsSound from '../tracks/acoustics-sound'
import astronomyAstrophysics from '../tracks/astronomy-astrophysics'
import chemistry from '../tracks/chemistry'
import gaitBiomechanics from '../tracks/gait-biomechanics'

const WRAPPERS: Record<string, CodexTrack> = {
  'acoustics-sound': acousticsSound,
  'astronomy-astrophysics': astronomyAstrophysics,
  'chemistry': chemistry,
  'gait-biomechanics': gaitBiomechanics,
}

/** Must match `stableStringify` in `scripts/build-codex-tracks.mjs`. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort()
    return `{${keys
      .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function readContent(slug: string): unknown {
  return JSON.parse(readFileSync(fileURLToPath(new URL(`../content/${slug}.json`, import.meta.url)), 'utf8'))
}

const committedChecksums: Record<string, string> = JSON.parse(
  readFileSync(fileURLToPath(new URL('../content/.checksums.json', import.meta.url)), 'utf8'),
)

describe('generated codex content', () => {
  it('every wrapper module has a committed checksum, and vice versa', () => {
    expect(Object.keys(committedChecksums).sort()).toEqual(Object.keys(WRAPPERS).sort())
  })

  for (const [slug, wrapper] of Object.entries(WRAPPERS)) {
    describe(slug, () => {
      const source = readContent(slug)

      it('content JSON validates against the zod TrackSchema', () => {
        expect(() => TrackSchema.parse(source)).not.toThrow()
      })

      it('wrapper default export is deep-equal to its JSON source', () => {
        expect(wrapper).toEqual(source)
      })

      it('stable checksum matches the committed .checksums.json', () => {
        const digest = createHash('sha256').update(stableStringify(source)).digest('hex')
        expect(digest).toBe(committedChecksums[slug])
      })
    })
  }
})
