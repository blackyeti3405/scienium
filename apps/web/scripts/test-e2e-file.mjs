/**
 * Run one Playwright spec file instead of the whole (serial, slow) E2E suite.
 *
 * `pnpm --filter web test:e2e <substring>` looks like it filters to one file
 * but doesn't — Playwright's positional arg is a substring match against test
 * file paths, so e.g. "F1" also matches F10.spec.ts, F11.spec.ts,
 * F13-codex.spec.ts, F18-vega-companion.spec.ts, etc. This wrapper requires an
 * exact spec path so it fails loudly instead of silently running many specs.
 *
 * Usage:
 *   pnpm --filter web test:e2e:file e2e/F1.spec.ts
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const [, , specPath, ...rest] = process.argv

if (!specPath || !specPath.endsWith('.spec.ts')) {
  console.error('Usage: pnpm --filter web test:e2e:file e2e/<name>.spec.ts')
  process.exit(1)
}

if (!existsSync(specPath)) {
  console.error(`No such spec file: ${specPath}`)
  process.exit(1)
}

const result = spawnSync('pnpm', ['exec', 'playwright', 'test', specPath, ...rest], {
  stdio: 'inherit',
})
process.exit(result.status ?? 1)
