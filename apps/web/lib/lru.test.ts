import { describe, it, expect, vi, afterEach } from 'vitest'
import { LruCache } from '@/lib/lru'

afterEach(() => vi.useRealTimers())

describe('LruCache', () => {
  it('stores and retrieves values', () => {
    const c = new LruCache<number>(3, 60_000)
    c.set('a', 1)
    expect(c.get('a')).toBe(1)
    expect(c.get('missing')).toBeUndefined()
  })

  it('evicts the least-recently-used key past capacity', () => {
    const c = new LruCache<number>(2, 60_000)
    c.set('a', 1)
    c.set('b', 2)
    c.set('c', 3) // evicts 'a'
    expect(c.get('a')).toBeUndefined()
    expect(c.get('b')).toBe(2)
    expect(c.get('c')).toBe(3)
    expect(c.size).toBe(2)
  })

  it('a get refreshes recency so it survives the next eviction', () => {
    const c = new LruCache<number>(2, 60_000)
    c.set('a', 1)
    c.set('b', 2)
    expect(c.get('a')).toBe(1) // 'a' is now most-recently-used
    c.set('c', 3) // evicts 'b' (the LRU), not 'a'
    expect(c.get('a')).toBe(1)
    expect(c.get('b')).toBeUndefined()
    expect(c.get('c')).toBe(3)
  })

  it('expires entries after the TTL', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const c = new LruCache<string>(10, 1_000)
    c.set('k', 'v')
    vi.setSystemTime(999)
    expect(c.get('k')).toBe('v')
    vi.setSystemTime(1_001)
    expect(c.get('k')).toBeUndefined()
  })

  it('re-setting a key updates value and refreshes TTL + recency', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const c = new LruCache<number>(2, 1_000)
    c.set('a', 1)
    vi.setSystemTime(900)
    c.set('a', 2) // refresh
    vi.setSystemTime(1_500) // past original TTL, within refreshed one
    expect(c.get('a')).toBe(2)
  })

  it('rejects a non-positive maxSize', () => {
    expect(() => new LruCache<number>(0, 1)).toThrow()
  })
})
