import { defineConfig } from 'vitest/config'

/**
 * Unit-test config. Tests are pure-function / logic units — no DB, no Next
 * server, no network. `resolve.tsconfigPaths` wires the `@/*` alias from
 * tsconfig.json so tests import lib modules exactly as the app does.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'test/**/*.test.ts'],
    globals: false,
  },
})
