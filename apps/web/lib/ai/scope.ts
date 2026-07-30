import 'server-only'
import { AsyncLocalStorage } from 'async_hooks'

/**
 * Who the current request is spending on behalf of (REFACTOR2 P1-R3).
 *
 * Deliberately its own module with NO dependency on the Anthropic client: the
 * request boundary (`lib/api/route-context.ts`) sets the scope on every
 * team-scoped route, and if that import dragged the paid client along, every
 * route in the app would look like a paid route to `test/paid-work-guard.ts`'s
 * transitive sweep — turning a guard that catches real gaps into noise.
 */

export interface AiScope {
  teamId: string | null
  userId: string | null
}

const scopeStore = new AsyncLocalStorage<AiScope>()

/**
 * Attribute every paid call inside `fn` to this team and user.
 *
 * Set once at the request boundary rather than threaded through the six library
 * functions that make paid calls but have no other reason to know a team id.
 * Missing scope is not an error — cron-driven work legitimately has none, and
 * those rows are simply unattributed rather than absent.
 */
export function withAiScope<T>(scope: AiScope, fn: () => T): T {
  return scopeStore.run(scope, fn)
}

/**
 * Set the scope for the remainder of the current async context.
 *
 * For callers that resolve context but do not wrap a continuation —
 * `requireTeamContext` returns a guard result rather than taking the handler as
 * a callback, so there is nothing for `withAiScope` to enclose. One store, one
 * write per request, so the usual `enterWith` confusion (interleaved contexts)
 * does not arise.
 */
export function enterAiScope(scope: AiScope): void {
  scopeStore.enterWith(scope)
}

export function currentAiScope(): AiScope {
  return scopeStore.getStore() ?? { teamId: null, userId: null }
}
