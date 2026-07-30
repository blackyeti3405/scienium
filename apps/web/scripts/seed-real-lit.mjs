// Dev seeder: replace devlab's placeholder literature-review papers with REAL
// peer-reviewed open-access PDFs, then generate a quiz + passing history for
// every paper so the review reads as fully worked through.
//
//   1. node scripts/seed-real-lit-discover.mjs   (downloads PDFs) → /tmp/lit-seed/manifest.json
//   2. node --env-file=.env.local scripts/seed-real-lit.mjs
//
// DEV ONLY — writes real PDF bytes into Postgres (`papers.pdf_data`, served by
// the file route's legacy-blob fallback, so no R2 write) and makes ~25 Sonnet 5
// calls to generate quizzes. Idempotent-ish: Phase A only touches rows whose
// text is still the fill-papers placeholder, so a second run won't clobber real
// papers; Phase B regenerates quizzes from scratch each time.
import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { createHash } from 'crypto'
import { formatApa, formatMla, formatIeee } from '../lib/literature/citation-core.mjs'
const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')
const Anthropic = (await import('@anthropic-ai/sdk')).default

const TEAM_NAME = process.env.SEED_TEAM ?? 'devlab'
// SEED_PHASE=A (replace papers only) | B (quizzes only) | unset (both).
const PHASE = (process.env.SEED_PHASE ?? '').toUpperCase()
const DO_A = PHASE !== 'B'
const DO_B = PHASE !== 'A'
const MANIFEST = '/tmp/lit-seed/manifest.json'
const PLACEHOLDER_PREFIX = 'This is a placeholder paper for development purposes'
const QUIZ_PASS_THRESHOLD = 70
const FOCUSES = ['findings', 'methodology', 'relevance', 'field knowledge']

const db = new PrismaClient()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Citation formatter — shared with lib/literature/citation.ts via citation-core.mjs
// PLOS titles/abstracts carry inline markup (<i>, <sub>, …) and HTML entities.
const stripHtml = (s) =>
  (s ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim()

// ── Crossref year lookup (best-effort, no key) ───────────────────────────────
async function crossrefYear(doi) {
  try {
    const r = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { 'User-Agent': 'scienium-dev-seed/1.0 (mailto:dev@example.com)' },
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) return null
    const d = await r.json()
    const parts = d?.message?.['published-print']?.['date-parts'] ?? d?.message?.['published-online']?.['date-parts'] ?? d?.message?.issued?.['date-parts']
    const y = parts?.[0]?.[0]
    return Number.isInteger(y) ? y : null
  } catch { return null }
}

// ── Quiz generation (Sonnet 5) ───────────────────────────────────────────────
const QUIZ_SYSTEM = `You write short comprehension quizzes for a high-school science-fair student who has read a research paper. Given the paper text, produce EXACTLY 5 open-response questions that test whether the reader actually understood THIS paper — its findings, methods, and where it sits in the field.

Return ONLY a JSON array of 5 objects, no prose, no markdown fences:
[
  {
    "prompt": "the question, answerable from the paper",
    "focus": one of "findings" | "methodology" | "relevance" | "field knowledge",
    "key": "1-2 sentences of grading guidance — what a correct answer must contain",
    "strongAnswer": "a strong 2-4 sentence answer a diligent student would give, grounded in the paper"
  }
]
Vary the focus across the five. Ground every question, key, and answer in the paper's actual content — never generic.`

function extractJsonArray(text) {
  const m = text.match(/\[[\s\S]*\]/)
  if (!m) return null
  try { return JSON.parse(m[0]) } catch { return null }
}

async function generateQuiz(title, fullText) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 4096,
      thinking: { type: 'disabled' },
      system: QUIZ_SYSTEM,
      messages: [{ role: 'user', content: `Paper title: ${title}\n\n<paper_text>\n${fullText.slice(0, 120_000)}\n</paper_text>` }],
    })
    if (res.stop_reason === 'max_tokens') continue
    const arr = extractJsonArray(res.content.find((b) => b.type === 'text')?.text ?? '')
    if (Array.isArray(arr) && arr.length >= 4) {
      return arr.slice(0, 5).map((q, i) => ({
        id: `q${i + 1}`,
        prompt: String(q.prompt ?? '').trim(),
        focus: FOCUSES.includes(q.focus) ? q.focus : 'findings',
        key: String(q.key ?? '').trim(),
        strongAnswer: String(q.strongAnswer ?? '').trim(),
      })).filter((q) => q.prompt && q.strongAnswer)
    }
  }
  return null
}

// Deterministic-but-varied per-question score in [82,96], all passing.
function scoreFor(paperId, qid) {
  const h = createHash('md5').update(paperId + qid).digest()[0]
  return 82 + (h % 15) // 82..96
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const team = await db.team.findFirst({ where: { name: TEAM_NAME }, select: { id: true } })
  if (!team) throw new Error(`team "${TEAM_NAME}" not found`)
  const member = await db.teamMember.findFirst({ where: { teamId: team.id }, select: { userId: true } })
  if (!member) throw new Error('team has no members')
  const userId = member.userId
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  console.log(`team=${TEAM_NAME} user=${userId} manifest=${manifest.length} papers\n`)

  // ── Phase A: replace placeholder papers with real ones ─────────────────────
  const fakes = await db.paper.findMany({
    where: { teamId: team.id, fullText: { startsWith: PLACEHOLDER_PREFIX } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  // Skip manifest entries already seeded (by DOI) so a partial re-run continues
  // correctly instead of re-assigning the same papers and dropping the tail.
  const existingDois = new Set(
    (await db.paper.findMany({ where: { teamId: team.id, doi: { not: null } }, select: { doi: true } })).map((p) => p.doi),
  )
  const unused = manifest.filter((m) => !existingDois.has(m.doi))
  const pairs = fakes.slice(0, unused.length).map((f, i) => ({ paperId: f.id, m: unused[i] }))
  if (DO_A) {
  console.log(`Phase A — replacing ${fakes.length} placeholder papers (of ${manifest.length} real available)`)

  for (const { paperId, m } of pairs) {
    const buf = readFileSync(m.file)
    const contentHash = createHash('sha256').update(buf).digest('hex')
    const year = await crossrefYear(m.doi)
    const fullText = ((await extractTextForSeed(buf)) || '').trim()
    const fileUrl = `/api/papers/${paperId}/file`
    await db.paper.update({
      where: { id: paperId },
      data: {
        title: stripHtml(m.title),
        authors: m.authors,
        abstract: m.abstract ? stripHtml(m.abstract) : null,
        fullText,
        sourceType: 'pdf',
        status: 'ready',
        doi: m.doi,
        credibilityTier: 'peer_reviewed', // all sourced from PLOS research articles
        sourceHost: m.source === 'PLOS' ? 'journals.plos.org' : 'arxiv.org',
        contentHash,
        pdfData: buf,
        pdfKey: null, // serve from the in-DB blob (file route falls back to it)
        fileUrl,
      },
    })
    await db.citation.upsert({
      where: { paperId },
      create: {
        paperId, teamId: team.id, year,
        apa: formatApa(m.authors, m.title, year, fileUrl),
        mla: formatMla(m.authors, m.title, year, fileUrl),
        ieee: formatIeee(m.authors, m.title, year, fileUrl),
      },
      update: {
        year,
        apa: formatApa(m.authors, m.title, year, fileUrl),
        mla: formatMla(m.authors, m.title, year, fileUrl),
        ieee: formatIeee(m.authors, m.title, year, fileUrl),
      },
    })
    console.log(`  ✓ ${m.title.slice(0, 62)} (${year ?? 'n.d.'}, ${(buf.length / 1e6).toFixed(1)}MB, ${fullText.length} chars)`)
  }
  } // DO_A

  if (!DO_B) { console.log('\n(skipping Phase B)'); return }

  // ── Phase B: quiz + passing history for EVERY ready paper ──────────────────
  const papers = await db.paper.findMany({
    where: { teamId: team.id, status: 'ready' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, title: true, fullText: true },
  })
  console.log(`\nPhase B — generating quiz + passing history for ${papers.length} papers`)
  let quizzed = 0, failed = 0
  for (const p of papers) {
    if (!p.fullText || p.fullText.length < 400) { console.log(`  ⤳ skip (no text): ${p.title.slice(0, 50)}`); continue }
    let questions
    try { questions = await generateQuiz(p.title, p.fullText) } catch (e) { questions = null; console.log(`  ✗ quiz error: ${e.message}`) }
    if (!questions || questions.length < 4) { failed++; console.log(`  ✗ quiz gen failed: ${p.title.slice(0, 50)}`); continue }

    // Clean slate: drop any prior sessions/attempts for this paper+user.
    await db.paperQuizAttempt.deleteMany({ where: { paperId: p.id, userId } })
    await db.paperQuizSession.deleteMany({ where: { paperId: p.id, userId } })

    const scores = questions.map((q) => scoreFor(p.id, q.id))
    const aggregate = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    const passed = aggregate >= QUIZ_PASS_THRESHOLD
    const now = new Date()

    const session = await db.paperQuizSession.create({
      data: { paperId: p.id, userId, questionsJson: questions, score: aggregate, passed, gradedAt: now },
    })
    await db.paperQuizAttempt.createMany({
      data: questions.map((q, i) => ({
        sessionId: session.id, paperId: p.id, userId,
        question: q.prompt, response: q.strongAnswer,
        evaluation: `Strong answer — covers the key points (${q.key || 'grounded in the paper'}).`,
        score: scores[i],
      })),
    })
    await db.paperProficiency.upsert({
      where: { paperId_userId: { paperId: p.id, userId } },
      create: { paperId: p.id, userId, demonstrated: passed, bestScore: aggregate, kpAwarded: Math.min(100, aggregate) },
      update: { demonstrated: passed, bestScore: aggregate, kpAwarded: Math.min(100, aggregate) },
    })
    quizzed++
    console.log(`  ✓ ${p.title.slice(0, 58)} — ${questions.length}Q, score ${aggregate}`)
  }

  console.log(`\nDONE. Replaced ${pairs.length} papers; quizzed ${quizzed}${failed ? `, ${failed} quiz failures` : ''}.`)
  console.log('(team KP wallet left untouched — set separately.)')
}

// unpdf text extraction, imported lazily so the file parses even if unpdf moves.
// Strips NUL + C0 control chars (except tab/newline/CR): Postgres `text` rejects
// 0x00 with "invalid byte sequence for encoding UTF8". NOTE: the real upload
// route (app/api/papers/route.ts) does NOT strip these — a genuine PDF whose
// extracted text contains a NUL would fail the same way. Flagged separately.
async function extractTextForSeed(buf) {
  const { getDocumentProxy, extractText } = await import('unpdf')
  const pdf = await getDocumentProxy(new Uint8Array(buf))
  const raw = (await extractText(pdf, { mergePages: true })).text ?? ''
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1) })
