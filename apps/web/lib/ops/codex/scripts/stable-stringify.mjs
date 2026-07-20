/**
 * Deterministic JSON with lexicographically sorted keys — a stable fingerprint
 * of a track's data that is independent of key order. `generated-content.test.ts`
 * recomputes this and asserts it matches the committed `.checksums.json`, which
 * locks each track's runtime object to its reviewed snapshot: any content edit
 * that changes the data must be re-built (regenerating this file) on purpose.
 *
 * Shared by build-codex-tracks.mjs (the generator) and
 * __tests__/generated-content.test.ts (the checksum gate) so the two never drift.
 * @param {unknown} value
 * @returns {string}
 */
export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}
