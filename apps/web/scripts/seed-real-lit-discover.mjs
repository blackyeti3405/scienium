// Discovery + download + validate — no DB writes, no LLM.
// Builds a manifest of real, on-topic, downloadable, sanitizer-passing PDFs.
import { writeFileSync, mkdirSync } from 'fs'
import { createHash } from 'crypto'
import { extractText, getDocumentProxy } from 'unpdf'

const OUT_DIR = '/tmp/lit-seed'
const TARGET = 24
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
mkdirSync(OUT_DIR, { recursive: true })

// ── Active-content check: a faithful port of lib/pdf/sanitize.ts, so a seeded
// paper is one that WOULD survive the real upload route. ─────────────────────
const FORBIDDEN = [/\/JavaScript\b/i, /\/JS\s*[([</]/, /\/OpenAction\b/, /\/Launch\b/, /\/XFA\b/, /\/RichMedia\b/]
function stripStreamData(raw) {
  const out = []
  let cursor = 0
  const opener = /\bstream\r\n|\bstream\n|\bstream\r/g
  let m
  while ((m = opener.exec(raw)) !== null) {
    const bodyStart = m.index + m[0].length
    const bodyEnd = raw.indexOf('endstream', bodyStart)
    const stop = bodyEnd === -1 ? raw.length : bodyEnd
    out.push(raw.slice(cursor, bodyStart), ' '.repeat(stop - bodyStart))
    cursor = stop
    if (bodyEnd === -1) break
    opener.lastIndex = stop
  }
  out.push(raw.slice(cursor))
  return out.join('')
}
function passesInspection(buf) {
  const structure = stripStreamData(buf.toString('latin1'))
  if (/\/Encrypt\b/.test(structure.slice(-4096))) return false
  return !FORBIDDEN.some((re) => re.test(structure))
}

async function fetchBuf(url, ms = 45000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/pdf,*/*' }, redirect: 'follow', signal: ctrl.signal })
    if (!r.ok) return null
    return Buffer.from(await r.arrayBuffer())
  } catch { return null } finally { clearTimeout(t) }
}
async function fetchJson(url, ms = 25000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: ctrl.signal })
    if (!r.ok) return null
    return await r.json()
  } catch { return null } finally { clearTimeout(t) }
}
async function fetchText(url, ms = 25000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal })
    if (!r.ok) return null
    return await r.text()
  } catch { return null } finally { clearTimeout(t) }
}

const norm = (s) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '').trim()
const strip = (s) => (s ?? '').replace(/\s+/g, ' ').trim()

// ── Candidate collectors ─────────────────────────────────────────────────────
async function plosCandidates() {
  const queries = [
    'title:(prosthetic OR prosthesis) AND body:gait',
    'title:(ankle OR "prosthetic foot") AND body:amputee',
    'title:(gait OR walking) AND body:(amputee OR prosthesis)',
    'title:amputee AND body:rehabilitation',
    'title:biomechanics AND body:(prosthesis OR amputee OR gait)',
    'title:(exoskeleton OR "powered prosthesis") AND body:walking',
  ]
  const out = []
  for (const q of queries) {
    const url = `https://api.plos.org/search?q=${encodeURIComponent(q)}&fl=id,title_display,author_display,abstract&rows=8&wt=json&fq=${encodeURIComponent('doc_type:full AND article_type:"Research Article"')}`
    const d = await fetchJson(url)
    for (const x of d?.response?.docs ?? []) {
      const title = strip(Array.isArray(x.title_display) ? x.title_display[0] : x.title_display)
      const abstract = strip(Array.isArray(x.abstract) ? x.abstract[0] : x.abstract)
      if (!title || !x.id) continue
      out.push({
        source: 'PLOS', peer: true, doi: x.id, title,
        authors: (x.author_display ?? []).slice(0, 12),
        abstract: abstract || null,
        pdfUrl: `https://journals.plos.org/plosone/article/file?id=${x.id}&type=printable`,
      })
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  return out
}

async function arxivCandidates() {
  const queries = [
    'all:"prosthetic ankle" OR all:"ankle-foot prosthesis"',
    'all:"powered prosthesis" OR all:"prosthetic leg"',
    'all:"gait analysis" AND all:prosthesis',
    'all:"transtibial" OR all:"lower-limb prosthesis"',
    'all:"EMG" AND all:"prosthetic control"',
    'all:"series elastic actuator" AND all:prosthesis',
    'all:exoskeleton AND all:gait',
  ]
  const out = []
  const A = 'http://www.w3.org/2005/Atom', X = 'http://arxiv.org/schemas/atom'
  for (const q of queries) {
    const url = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(q)}&max_results=8&sortBy=relevance`
    let xml = await fetchText(url)
    if (!xml) { await new Promise((r) => setTimeout(r, 3000)); xml = await fetchText(url) } // arXiv is flaky; one retry
    if (!xml) continue
    // Minimal Atom parse via regex over <entry> blocks (no XML dep in .mjs).
    for (const entry of xml.split('<entry>').slice(1)) {
      const title = strip((entry.match(/<title>([\s\S]*?)<\/title>/) ?? [])[1])
      const summary = strip((entry.match(/<summary>([\s\S]*?)<\/summary>/) ?? [])[1])
      const idUrl = (entry.match(/<id>([\s\S]*?)<\/id>/) ?? [])[1] ?? ''
      const arxivId = (idUrl.match(/arxiv\.org\/abs\/(.+)$/) ?? [])[1]
      const authors = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((m) => strip(m[1])).slice(0, 12)
      const doi = (entry.match(/<arxiv:doi>([\s\S]*?)<\/arxiv:doi>/) ?? [])[1]
      const jref = (entry.match(/<arxiv:journal_ref>([\s\S]*?)<\/arxiv:journal_ref>/) ?? [])[1]
      if (!title || !arxivId) continue
      out.push({
        source: 'arXiv', peer: !!(doi || jref),
        doi: doi ? strip(doi) : `10.48550/arXiv.${arxivId.replace(/v\d+$/, '')}`,
        title, authors, abstract: summary || null,
        pdfUrl: `https://arxiv.org/pdf/${arxivId}`,
      })
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
  return out
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log('Collecting candidates…')
const [plos, arxiv] = await Promise.all([plosCandidates(), arxivCandidates()])
console.log(`  PLOS (peer-reviewed): ${plos.length}  |  arXiv: ${arxiv.length}`)

// Prefer peer-reviewed first, then dedup by normalized title.
const ordered = [...plos, ...arxiv]
const seenTitle = new Set()
const candidates = []
for (const c of ordered) {
  const k = norm(c.title)
  if (k.length < 8 || seenTitle.has(k)) continue
  seenTitle.add(k)
  candidates.push(c)
}
console.log(`  unique candidates: ${candidates.length}`)

const manifest = []
const seenHash = new Set()
let idx = 0
for (const c of candidates) {
  if (manifest.length >= TARGET) break
  idx++
  const buf = await fetchBuf(c.pdfUrl)
  if (!buf) { console.log(`  ✗ [${c.source}] download failed: ${c.title.slice(0, 50)}`); continue }
  if (buf.length < 30_000 || buf.subarray(0, 5).toString('latin1') !== '%PDF-') { console.log(`  ✗ not a PDF (${buf.length}B): ${c.title.slice(0, 50)}`); continue }
  if (buf.length > 20 * 1024 * 1024) { console.log(`  ✗ too large (${(buf.length/1e6).toFixed(1)}MB): ${c.title.slice(0, 50)}`); continue }
  if (!passesInspection(buf)) { console.log(`  ✗ active-content: ${c.title.slice(0, 50)}`); continue }
  const hash = createHash('sha256').update(buf).digest('hex')
  if (seenHash.has(hash)) { console.log(`  ✗ dup bytes: ${c.title.slice(0, 50)}`); continue }
  let text = ''
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buf))
    const numPages = pdf.numPages
    if (numPages > 150) { console.log(`  ✗ ${numPages} pages: ${c.title.slice(0, 50)}`); continue }
    text = ((await extractText(pdf, { mergePages: true })).text ?? '').trim()
  } catch { console.log(`  ✗ parse error: ${c.title.slice(0, 50)}`); continue }
  if (text.length < 2500) { console.log(`  ✗ thin text (${text.length}): ${c.title.slice(0, 50)}`); continue }
  seenHash.add(hash)
  const file = `${OUT_DIR}/paper-${String(manifest.length).padStart(2, '0')}.pdf`
  writeFileSync(file, buf)
  manifest.push({
    file, source: c.source, peer: c.peer, doi: c.doi,
    title: c.title, authors: c.authors, abstract: c.abstract,
    sha256: hash, bytes: buf.length, textLen: text.length, pdfUrl: c.pdfUrl,
  })
  console.log(`  ✓ ${manifest.length.toString().padStart(2)} [${c.peer ? 'PEER ' : 'prepr'}|${c.source}] ${c.title.slice(0, 58)}`)
}

writeFileSync(`${OUT_DIR}/manifest.json`, JSON.stringify(manifest, null, 2))
const peers = manifest.filter((m) => m.peer).length
console.log(`\nDONE: ${manifest.length} papers (${peers} peer-reviewed, ${manifest.length - peers} preprint) → ${OUT_DIR}/manifest.json`)
