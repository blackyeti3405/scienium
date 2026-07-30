#!/usr/bin/env node
/**
 * Fetch + extract the Pyodide runtime for the Data Terminal Code lane.
 *
 * The `pyodide` npm package ships only the loader glue; the actual wheels
 * (numpy, matplotlib, pandas, …) live in the GitHub release tarball. This
 * downloads `pyodide-<version>.tar.bz2` once and extracts its top-level
 * `pyodide/` dist into `apps/web/.pyodide-cache/pyodide/` (gitignored).
 *
 * Idempotent: a `.version` marker records what is on disk, and a run whose
 * marker + the wasm file both match the pinned version does nothing. Change the
 * pin in lib/data-terminal/runtime/version.mjs and re-run to upgrade.
 *
 * Node stdlib only. bzip2 has no Node decoder, so extraction shells out to the
 * system `tar` (present on macOS/Linux CI).
 *
 * Usage: node scripts/fetch-pyodide.mjs
 */
import { createWriteStream } from 'node:fs'
import { mkdir, rm, readFile, writeFile, stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { PYODIDE_VERSION } from '../lib/data-terminal/runtime/version.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const cacheDir = path.resolve(here, '..', '.pyodide-cache')
const distDir = path.join(cacheDir, 'pyodide')
const markerFile = path.join(cacheDir, '.version')
const wasmFile = path.join(distDir, 'pyodide.asm.wasm')
const tarUrl = `https://github.com/pyodide/pyodide/releases/download/${PYODIDE_VERSION}/pyodide-${PYODIDE_VERSION}.tar.bz2`

async function exists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function alreadyCurrent() {
  if (!(await exists(wasmFile))) return false
  const marker = await readFile(markerFile, 'utf8').catch(() => '')
  return marker.trim() === PYODIDE_VERSION
}

async function main() {
  if (await alreadyCurrent()) {
    console.log(`pyodide ${PYODIDE_VERSION} already in ${distDir} — nothing to do.`)
    return
  }

  console.log(`Fetching pyodide ${PYODIDE_VERSION}\n  ${tarUrl}`)
  await rm(distDir, { recursive: true, force: true })
  await mkdir(cacheDir, { recursive: true })

  const tarPath = path.join(cacheDir, `pyodide-${PYODIDE_VERSION}.tar.bz2`)
  const res = await fetch(tarUrl)
  if (!res.ok || !res.body) {
    throw new Error(`Download failed: HTTP ${res.status} for ${tarUrl}`)
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(tarPath))
  const { size } = await stat(tarPath)
  console.log(`Downloaded ${(size / 1024 / 1024).toFixed(1)} MB — extracting the pyodide/ dist…`)

  // Extract only the top-level `pyodide/` directory (`-j` = bzip2).
  const r = spawnSync('tar', ['-xjf', tarPath, '-C', cacheDir, 'pyodide'], { stdio: 'inherit' })
  if (r.status !== 0) throw new Error(`tar extraction failed (exit ${r.status})`)
  await rm(tarPath, { force: true })

  if (!(await exists(wasmFile))) {
    throw new Error(`Extraction did not produce ${wasmFile} — tarball layout unexpected.`)
  }
  await writeFile(markerFile, `${PYODIDE_VERSION}\n`)
  console.log(`Ready: ${distDir}`)
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
