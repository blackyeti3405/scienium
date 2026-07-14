/**
 * Vitest stand-in for the `server-only` package.
 *
 * The real package throws when imported outside a React Server context, which
 * is exactly what we want in the app build — but unit tests run in plain Node
 * and exercise the pure/validation branches of server modules (e.g.
 * `lib/buildings/service.test.ts`). `vitest.config.ts` aliases `server-only`
 * here so those imports are inert under test while staying enforced in builds.
 */
export {}
