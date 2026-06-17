/**
 * Smoke-test the PDF upload pipeline end-to-end.
 *
 * Usage:
 *   node apps/web/scripts/test-upload.mjs <path/to/paper.pdf> <clerk-session-token>
 *
 * Get your session token from the browser:
 *   Open DevTools → Application → Cookies → __session  (or run `await window.Clerk.session.getToken()` in the console)
 */

import { readFileSync } from 'fs'
import { basename } from 'path'

const [, , pdfPath, token] = process.argv

if (!pdfPath || !token) {
  console.error('Usage: node test-upload.mjs <pdf> <clerk-session-token>')
  process.exit(1)
}

const BASE = 'http://localhost:3000'

async function main() {
  const pdfBytes = readFileSync(pdfPath)
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const form = new FormData()
  form.append('file', blob, basename(pdfPath))

  console.log(`\n→ POST /api/papers  (${(pdfBytes.length / 1024).toFixed(1)} KB)`)
  const uploadRes = await fetch(`${BASE}/api/papers`, {
    method: 'POST',
    headers: { Cookie: `__session=${token}` },
    body: form,
  })

  const uploadBody = await uploadRes.json()
  console.log(`  status: ${uploadRes.status}`)
  console.log('  body:  ', JSON.stringify(uploadBody, null, 2))

  if (!uploadRes.ok) {
    console.error('\n✗ Upload failed')
    process.exit(1)
  }

  const { id } = uploadBody
  console.log(`\n→ Polling /api/papers/${id} until ready…`)

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    const pollRes = await fetch(`${BASE}/api/papers/${id}`, {
      headers: { Cookie: `__session=${token}` },
    })
    const pollBody = await pollRes.json()
    console.log(`  [${i + 1}] status=${pollBody.status}  title="${pollBody.title}"`)
    if (pollBody.status === 'ready' || pollBody.status === 'error') {
      console.log('\n✓ Final paper:', JSON.stringify(pollBody, null, 2))
      process.exit(pollBody.status === 'ready' ? 0 : 1)
    }
  }

  console.error('\n✗ Timed out waiting for processing')
  process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(1) })
