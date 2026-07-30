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
    // Keys already seen IN THIS FILE, with the line they were set on.
    const seen = new Map<string, number>()
    const lines = fs.readFileSync(full, 'utf8').split('\n')
    for (const [i, raw] of lines.entries()) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq === -1) continue
      const key = line.slice(0, eq).trim()
      /**
       * A key set twice in ONE file is always a mistake, and a silent one.
       *
       * First-wins is correct ACROSS files (a CI secret must beat `.env`), but
       * within a single file it means appending a corrected value does nothing —
       * and `shell> source .env.local` disagrees, because shell assignment is
       * LAST-wins. So the file reads one way to the person editing it and the
       * opposite way to the runner.
       *
       * That cost a full 16-minute suite run: a duplicated
       * `E2E_STUDENT_IDENTIFIER` left the "student" role signed in as the
       * LEADER, so a test asserting "a non-lead cannot remove anyone" ran AS
       * the lead, got its 200, and removed a real member from the shared
       * fixture. Wrong-account runs must never be quiet.
       */
      const prior = seen.get(key)
      if (prior !== undefined) {
        throw new Error(
          `${file} sets ${key} twice (lines ${prior + 1} and ${i + 1}). ` +
            'This loader is first-wins, so the LATER value is ignored — while ' +
            '`source .env.local` would use it. Delete the stale line.',
        )
      }
      seen.set(key, i)
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
