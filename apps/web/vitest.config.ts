import path from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Unit-test config. Tests are pure-function / logic units — no DB, no Next
 * server, no network. `resolve.tsconfigPaths` wires the `@/*` alias from
 * tsconfig.json so tests import lib modules exactly as the app does.
 *
 * `server-only` is aliased to an inert stub: the real package throws outside a
 * React Server context, and tests legitimately import the pure branches of
 * guarded server modules (see test/stubs/server-only.ts).
 */
export default defineConfig({
  // tsconfig.json keeps `jsx: preserve` for Next's own compiler, which leaves
  // Vite's transform unable to compile a `.tsx` that a test imports. Tests are
  // still `.ts` with no JSX of their own — but showcase-render-boundary.test.ts
  // renders the real public showcase page to static markup, so the components
  // it pulls in have to compile.
  oxc: { jsx: { runtime: 'automatic', importSource: 'react' } },
  resolve: {
    tsconfigPaths: true,
    alias: { 'server-only': path.resolve(__dirname, 'test/stubs/server-only.ts') },
  },
  test: {
    environment: 'node',
    // stores/ + components/ joined in v0.29.x: client-side logic (the Zustand
    // store, pure helpers extracted from hooks) is node-testable because I/O
    // lives behind lib/ modules that vi.mock replaces — no jsdom involved.
    include: [
      'lib/**/*.test.ts',
      'test/**/*.test.ts',
      'stores/**/*.test.ts',
      'components/**/*.test.ts',
    ],
    globals: false,
  },
})
