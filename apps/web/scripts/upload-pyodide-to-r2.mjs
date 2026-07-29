#!/usr/bin/env node
/**
 * Upload the extracted Pyodide dist to R2 for prod serving. A DEPLOY step — run
 * once per version bump, by an operator, with R2 creds in the environment. Not
 * part of any gate; the proxy route falls back to R2 (`PYODIDE_SOURCE=r2`, or
 * automatically when `.pyodide-cache/` is absent) and reads exactly this
 * keyspace: `pyodide/<version>/<filename>`.
 *
 * Run `node scripts/fetch-pyodide.mjs` first so the dist exists locally.
 *
 * Usage (from apps/web, with R2_* env set):
 *   node --env-file=.env.local scripts/upload-pyodide-to-r2.mjs
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { PYODIDE_VERSION } from '../lib/data-terminal/runtime/version.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(here, '..', '.pyodide-cache', 'pyodide')

const CONTENT_TYPE = {
  '.wasm': 'application/wasm',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.zip': 'application/zip',
  '.whl': 'application/octet-stream',
  '.ts': 'text/plain',
}

function requireEnv(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var ${name}`)
  return v
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else if (entry.isFile()) yield full
  }
}

async function main() {
  await stat(path.join(distDir, 'pyodide.asm.wasm')).catch(() => {
    throw new Error(`No dist at ${distDir} — run: node scripts/fetch-pyodide.mjs`)
  })

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${requireEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
  })
  const bucket = requireEnv('R2_BUCKET_NAME')

  let count = 0
  for await (const full of walk(distDir)) {
    const rel = path.relative(distDir, full).split(path.sep).join('/')
    const key = `pyodide/${PYODIDE_VERSION}/${rel}`
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: await readFile(full),
        ContentType: CONTENT_TYPE[path.extname(full).toLowerCase()] ?? 'application/octet-stream',
      }),
    )
    count++
    if (count % 25 === 0) console.log(`  …${count} objects`)
  }
  console.log(`Uploaded ${count} objects to pyodide/${PYODIDE_VERSION}/ in ${bucket}.`)
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
