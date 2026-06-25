import fs from 'node:fs'
import path from 'node:path'

/**
 * Load apps/web/.env.local (then .env) into process.env for the Playwright
 * runner, mirroring how `next dev` reads them. Parsed by hand on purpose: pnpm's
 * strict node_modules doesn't expose @next/env to the workspace, and this keeps
 * the E2E layer dependency-free. Values already present in process.env win, so a
 * CI-provided secret is never clobbered by the file.
 */
export function loadTestEnv(dir: string = process.cwd()): void {
  for (const file of ['.env.local', '.env']) {
    const full = path.join(dir, file)
    if (!fs.existsSync(full)) continue
    for (const raw of fs.readFileSync(full, 'utf8').split('\n')) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq === -1) continue
      const key = line.slice(0, eq).trim()
      if (key in process.env) continue
      let value = line.slice(eq + 1).trim()
      const quoted =
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      if (quoted) value = value.slice(1, -1)
      process.env[key] = value
    }
  }
}
