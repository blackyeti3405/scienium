#!/usr/bin/env node
/**
 * Text-integrity gate: reject control bytes (NUL etc.) embedded in authored
 * source text. Editors and compilers silently tolerate them (a NUL inside a
 * template literal typechecks and lints clean), so corruption can hide in the
 * repo indefinitely — this happened once in the codex study-plan route.
 *
 * Scans authored text under apps/web (and packages/) for bytes 0x00–0x08,
 * 0x0B, 0x0C, 0x0E–0x1F outside of \t \n \r. Exits 1 with file:offset
 * locations on any hit.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const repoRoot = join(webRoot, '..', '..')

const SCAN_ROOTS = [webRoot, join(repoRoot, 'packages')]
const TEXT_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.md', '.css', '.sql', '.prisma', '.yml', '.yaml', '.txt',
])
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', 'test-results', 'playwright-report'])

// Control bytes that never belong in authored text (tab/LF/CR excluded).
const FORBIDDEN = new Set()
for (let b = 0x00; b <= 0x1f; b++) {
  if (b === 0x09 || b === 0x0a || b === 0x0d) continue
  FORBIDDEN.add(b)
}

const failures = []

function scanDir(dir) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name) || name.startsWith('.')) continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      scanDir(full)
    } else if (TEXT_EXTS.has(extname(name))) {
      const buf = readFileSync(full)
      for (let i = 0; i < buf.length; i++) {
        if (FORBIDDEN.has(buf[i])) {
          failures.push(`${relative(repoRoot, full)}: byte 0x${buf[i].toString(16).padStart(2, '0')} at offset ${i}`)
          break // one report per file is enough
        }
      }
    }
  }
}

for (const root of SCAN_ROOTS) scanDir(root)

if (failures.length) {
  console.error('Text-integrity check FAILED — control bytes found in authored text:')
  for (const f of failures) console.error(`  ${f}`)
  process.exit(1)
}
console.log('Text-integrity check passed.')
