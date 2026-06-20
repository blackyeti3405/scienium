/**
 * A tiny bounded TTL + LRU cache.
 *
 * Built for the in-process caches (e.g. the Wikipedia article proxy) that
 * previously used a bare `Map` with only a TTL: entries expired in time but the
 * map itself had no size ceiling, so a long-running instance fielding many
 * distinct keys grew memory without bound. This adds a hard `maxSize` with
 * least-recently-used eviction while preserving the same per-entry TTL.
 *
 * Single-instance only (same caveat as the rate limiter's memory store): each
 * process keeps its own cache. That's fine for a best-effort read cache.
 */
export class LruCache<V> {
  private map = new Map<string, { value: V; expires: number }>()

  constructor(
    private maxSize: number,
    private ttlMs: number,
  ) {
    if (maxSize < 1) throw new Error('LruCache maxSize must be >= 1')
  }

  /**
   * Returns the cached value if present and unexpired, else undefined. A hit
   * refreshes recency (moves the key to most-recently-used).
   */
  get(key: string): V | undefined {
    const entry = this.map.get(key)
    if (!entry) return undefined
    if (entry.expires <= Date.now()) {
      this.map.delete(key)
      return undefined
    }
    // Refresh LRU recency: re-insert so it becomes the newest key.
    this.map.delete(key)
    this.map.set(key, entry)
    return entry.value
  }

  /** Insert/replace a value, evicting the least-recently-used key over capacity. */
  set(key: string, value: V): void {
    if (this.map.has(key)) this.map.delete(key)
    this.map.set(key, { value, expires: Date.now() + this.ttlMs })
    while (this.map.size > this.maxSize) {
      // Map iteration order is insertion order, so the first key is the LRU.
      const oldest = this.map.keys().next().value
      if (oldest === undefined) break
      this.map.delete(oldest)
    }
  }

  /** Current number of live entries (may include not-yet-swept expired ones). */
  get size(): number {
    return this.map.size
  }
}
