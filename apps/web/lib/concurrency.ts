import 'server-only'

/**
 * Bounded-concurrency mapper — run `fn` over `items` with at most `limit` in
 * flight, preserving result order.
 *
 * Hand-rolled rather than a `p-limit` dependency: it is fifteen lines and the
 * app already needed it twice.
 *
 * The reason it exists at all is REFACTOR2 P1-R5. `Promise.all(items.map(fn))`
 * reads as "do these" but means "do ALL of these AT ONCE" — which for a batch of
 * paper jobs meant thirty simultaneous Anthropic calls inside a sixty-second
 * function, against provider rate limits and a database URL configured with
 * `connection_limit=1`. Per-job claims made that safe from a *correctness*
 * standpoint and hostile from every other one.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      results[i] = await fn(items[i]!)
    }
  })
  await Promise.all(workers)
  return results
}
