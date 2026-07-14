import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { serverEnv } from '@/lib/env'

/**
 * Shared, lazily-constructed Anthropic client.
 *
 * Constructed + memoized on first call — never at import — so a missing
 * ANTHROPIC_API_KEY can't fail `next build` (which imports every route module)
 * or routes that never call the LLM. The key is validated by `serverEnv` at that
 * first call, with a clear error naming the missing var. Every LLM route shares
 * this one instance (all previously used identical `{ apiKey }`-only config).
 *
 * SERVER-ONLY: the key is read server-side and never shipped to the browser.
 */
let cached: Anthropic | undefined

export function anthropic(): Anthropic {
  return (cached ??= new Anthropic({ apiKey: serverEnv.ANTHROPIC_API_KEY() }))
}