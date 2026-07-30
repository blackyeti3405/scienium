/**
 * Sandbox egress neutralization for the Pyodide worker (FIX 1).
 *
 * The true boundary is: NO fresh realm + NO egress in this realm. The worker
 * legitimately needs same-origin `fetch` only while Pyodide loads (before any
 * user code); after that, every realm-creating and egress primitive must be
 * dead. A running script that reaches `js.fetch` — or spawns a nested Worker to
 * get a FRESH, un-neutralized realm with a live `fetch` — must fail closed.
 *
 * Extracted from the worker so the prototype-chain walk is unit-testable
 * without importing the (browser-only, heavy) `pyodide` module.
 */

/**
 * Every egress + realm-creation primitive reachable from a running script.
 * `Worker`/`SharedWorker` are here because a child worker gets a fresh realm
 * with an un-neutralized `fetch`; the RTC/BroadcastChannel entries close the
 * remaining cross-context egress paths.
 */
export const NEUTRALIZED_NAMES = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'importScripts',
  'WebTransport',
  'Worker',
  'SharedWorker',
  'RTCPeerConnection',
  'webkitRTCPeerConnection',
  'RTCDataChannel',
  'BroadcastChannel',
] as const

/**
 * Redefine each name to `deny` on `root` AND on every object up its prototype
 * chain (stopping before `Object.prototype`).
 *
 * Why the walk: `fetch`, `WebSocket`, `importScripts` et al. live on
 * `WorkerGlobalScope.prototype`, not as own props of the global. An own-prop
 * stub only SHADOWS them — the original stays reachable via
 * `Object.getPrototypeOf(self)` / `self.constructor.prototype.fetch`. Walking
 * the chain overwrites those too. `configurable:false` where the engine allows,
 * so a script can't `defineProperty` them back; falls back to delete+redefine.
 */
export function neutralizeScope(root: object, deny: () => never): void {
  const scopes: object[] = [root]
  for (
    let p = Object.getPrototypeOf(root);
    p && p !== Object.prototype;
    p = Object.getPrototypeOf(p)
  ) {
    scopes.push(p)
  }

  for (const name of NEUTRALIZED_NAMES) {
    for (const scope of scopes) {
      // On root, always plant a stub (creates a shadowing own prop even if the
      // name only lives up-chain). On a prototype, only overwrite what's there.
      if (scope !== root && !Object.prototype.hasOwnProperty.call(scope, name)) continue
      try {
        Reflect.defineProperty(scope, name, { configurable: false, writable: false, value: deny })
      } catch {
        // Non-configurable in this engine: delete then redefine, best effort.
        try {
          Reflect.deleteProperty(scope, name)
          Reflect.defineProperty(scope, name, { configurable: false, value: deny })
        } catch {
          // Truly locked. The CSP `worker-src 'self'` (no blob:) + the absence
          // of a fresh realm is the real boundary; this JS stub is belt.
        }
      }
    }
  }
}
