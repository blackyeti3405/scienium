#!/usr/bin/env node
/**
 * Scrapes the Society for Science affiliated-fair directory and outputs a
 * replacement dataset.ts with real names, real 2026 dates, and geocoded
 * coordinates.
 *
 * Usage:
 *   node apps/web/scripts/scrape-isef-fairs.mjs
 *
 * Outputs to stdout — redirect to dataset.ts or review first:
 *   node apps/web/scripts/scrape-isef-fairs.mjs > /tmp/dataset-new.ts
 *
 * Rate limits:
 *   - Nominatim geocoding: 1 req/s (enforced below; OSM ToS requirement)
 *   - find-a-fair POST: no stated limit; we add 500ms between states
 */

import { readFileSync } from 'fs'

// ── US state codes present in the site dropdown ─────────────────────────────
const US_STATES = [
  'AL','AK','AS','AZ','AR','CA','CO','CT','DE','DC',
  'FL','GA','GU','HI','ID','IL','IN','IA','KS','KY',
  'LA','ME','MD','MA','MI','MN','MS','MO','MT','NE',
  'NV','NH','NJ','NM','NY','NC','ND','MP','OH','OK',
  'OR','PA','PR','RI','SC','SD','TN','TX','VI','UT',
  'VT','VA','WA','WV','WI','WY',
]

const BASE = 'https://findafair.societyforscience.org/'
const HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
  Referer: BASE,
  Origin: 'https://findafair.societyforscience.org',
}

// ── Fetch cookie once (site may set session cookie) ─────────────────────────
async function getSessionCookies() {
  const res = await fetch(BASE, { headers: { 'User-Agent': HEADERS['User-Agent'] } })
  const setCookie = res.headers.get('set-cookie') ?? ''
  return setCookie.split(',').map(c => c.split(';')[0].trim()).filter(Boolean).join('; ')
}

// ── POST a state search and return raw HTML ──────────────────────────────────
async function fetchState(state, cookie) {
  const body = new URLSearchParams({
    Country: 'United States of America',
    State: state,
    grpRadio: 'chkISEF',
    btnSearch: 'Search',
  })
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { ...HEADERS, Cookie: cookie },
    body: body.toString(),
  })
  return res.text()
}

// ── Parse fair cards out of the HTML response ────────────────────────────────
function parseFairs(html, state) {
  const fairs = []

  // Each fair is separated by the fair-code pattern USxx## in an <h4>
  // Split on the start of each fair block
  const fairPattern = /US[A-Z]{2}\d+<\/h4>/g
  const positions = []
  let m
  while ((m = fairPattern.exec(html)) !== null) {
    positions.push(m.index)
  }

  for (let i = 0; i < positions.length; i++) {
    const chunk = html.slice(positions[i], positions[i + 1] ?? html.length)
    const fair = parseFairChunk(chunk, state)
    if (fair) fairs.push(fair)
  }
  return fairs
}

function stripHtml(s) {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseDate(str) {
  // Input: "3/11/2026" → "2026-03-11"
  const m = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [, mo, day, yr] = m
  return `${yr}-${mo.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function parseFairChunk(chunk, state) {
  try {
    // Code: US + STATE + NUMBER (e.g. USCA01)
    const codeMatch = chunk.match(/^(US[A-Z]{2}\d+)<\/h4>/i)
    if (!codeMatch) return null
    const code = codeMatch[1]

    // Determine level: Society uses 50+ for state fairs; territory "State" confirms it
    const isStateFair =
      parseInt(code.slice(-2), 10) >= 50 ||
      /Territory[\s\S]{0,200}>\s*State\s*</.test(chunk)

    // Name + website from the linked <a>
    const linkMatch = chunk.match(/<a\s+href="([^"]+)"[^>]*>\s*<u>([\s\S]*?)<\/u>/i)
    const rawUrl = linkMatch?.[1]?.trim() ?? null
    // Normalise URLs: fix protocol-relative, drop "n/a" placeholders
    const websiteUrl =
      !rawUrl || /^\/\/n\/a$/i.test(rawUrl) || /^n\/a$/i.test(rawUrl)
        ? null
        : rawUrl.startsWith('//')
          ? `https:${rawUrl}`
          : rawUrl
    const name = linkMatch ? stripHtml(linkMatch[2]).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim() : null
    if (!name) return null

    // City (second full <h4> in the chunk — the chunk starts mid-first-h4)
    const h4s = chunk.match(/<h4[^>]*>([\s\S]*?)<\/h4>/gi) ?? []
    const city = h4s[1] ? stripHtml(h4s[1]) : null

    // Competition dates
    const compMatch = chunk.match(
      /Competition Dates[\s\S]*?<span>([\d/]+)\s*&mdash;\s*([\d/]+)<\/span>/i,
    )
    const eventStart = compMatch ? parseDate(compMatch[1]) : null
    const eventEnd = compMatch ? parseDate(compMatch[2]) : null
    const eventDate = eventStart  // use first day as the event date

    // Entry / registration deadline
    const entryMatch = chunk.match(/Entry Deadline[\s\S]*?<span>([\d/]+\s*)<\/span>/i)
    const registrationDeadline = entryMatch ? parseDate(entryMatch[1].trim()) : null

    // Territory (used to infer level)
    const terrMatch = chunk.match(/<b>Territory<\/b>[\s\S]*?<span>([\s\S]*?)<\/span>/i)
    const territory = terrMatch ? stripHtml(terrMatch[1]) : null

    return {
      code,
      name,
      state,
      level: isStateFair ? 'state' : 'regional',
      city: city ?? '',
      websiteUrl,
      eventDate,
      registrationDeadline,
      territory,
    }
  } catch {
    return null
  }
}

// ── Geocode a city+state string via Nominatim ─────────────────────────────────
const geocodeCache = new Map()

async function geocode(city, state) {
  if (!city) return null
  const key = `${city},${state}`
  if (geocodeCache.has(key)) return geocodeCache.get(key)

  const q = encodeURIComponent(`${city}, ${state}, USA`)
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=us`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'nova-lab-fair-scraper/1.0 (hello@scienium.app)' },
    })
    const data = await res.json()
    if (data[0]) {
      const pt = [parseFloat(data[0].lat), parseFloat(data[0].lon)]
      geocodeCache.set(key, pt)
      return pt
    }
  } catch {
    // Nominatim flakiness — caller falls back to state centroid
  }
  geocodeCache.set(key, null)
  return null
}

// State centroids as fallback when geocoding fails
const STATE_CENTROIDS = {
  AL:[32.8,-86.8],AK:[64.2,-149.5],AZ:[34.2,-111.7],AR:[34.9,-92.4],
  CA:[37.2,-119.4],CO:[38.9,-105.5],CT:[41.6,-72.7],DE:[39.0,-75.5],
  DC:[38.9,-77.0],FL:[28.6,-82.4],GA:[32.6,-83.4],HI:[20.3,-156.4],
  ID:[44.4,-114.6],IL:[40.0,-89.2],IN:[39.9,-86.3],IA:[42.0,-93.5],
  KS:[38.5,-98.4],KY:[37.5,-85.3],LA:[31.0,-92.0],ME:[45.4,-69.2],
  MD:[39.0,-76.8],MA:[42.3,-71.8],MI:[44.3,-85.4],MN:[46.3,-94.3],
  MS:[32.7,-89.7],MO:[38.4,-92.5],MT:[47.0,-109.6],NE:[41.5,-99.8],
  NV:[39.3,-116.6],NH:[43.7,-71.6],NJ:[40.1,-74.7],NM:[34.4,-106.1],
  NY:[42.9,-75.5],NC:[35.6,-79.4],ND:[47.5,-100.5],OH:[40.3,-82.8],
  OK:[35.6,-97.5],OR:[44.0,-120.6],PA:[40.9,-77.8],RI:[41.7,-71.5],
  SC:[33.9,-80.9],SD:[44.4,-100.2],TN:[35.9,-86.4],TX:[31.5,-99.3],
  UT:[39.3,-111.7],VT:[44.1,-72.7],VA:[37.5,-78.9],WA:[47.4,-120.5],
  WV:[38.6,-80.6],WI:[44.6,-90.0],WY:[43.0,-107.6],
  // Territories (rough centroids)
  AS:[-14.3,-170.7],GU:[13.4,144.8],MP:[15.2,145.7],PR:[18.2,-66.5],VI:[18.3,-64.9],
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  process.stderr.write('Getting session cookie...\n')
  const cookie = await getSessionCookies()

  const allFairs = []

  for (const state of US_STATES) {
    process.stderr.write(`Fetching ${state}...`)
    try {
      const html = await fetchState(state, cookie)
      const fairs = parseFairs(html, state)
      process.stderr.write(` ${fairs.length} fairs\n`)
      allFairs.push(...fairs)
    } catch (e) {
      process.stderr.write(` ERROR: ${e.message}\n`)
    }
    // Be polite to the server
    await new Promise(r => setTimeout(r, 400))
  }

  process.stderr.write(`\nTotal fairs scraped: ${allFairs.length}\n`)
  process.stderr.write('Geocoding cities (1 req/s, may take a few minutes)...\n')

  // Geocode in sequence to respect Nominatim's 1-req/s ToS
  for (const fair of allFairs) {
    if (fair.city && fair.state) {
      const pt = await geocode(fair.city, fair.state)
      fair.coords = pt
      await new Promise(r => setTimeout(r, 1100)) // 1.1s between Nominatim calls
    }
  }

  // ── Emit dataset.ts ─────────────────────────────────────────────────────────
  const ISEF = {
    code: 'ISEF',
    name: 'Regeneron International Science and Engineering Fair (ISEF)',
    level: 'international',
    state: null,
    city: 'Phoenix, AZ',
    websiteUrl: 'https://www.societyforscience.org/isef/',
    coords: [33.45, -112.07],
    eventDate: '2026-05-09',
    registrationDeadline: null,
    territory: null,
  }

  // Build parent key map: for each state, state fairs link back to isef
  // and regional fairs link to the state fair in their state.
  const stateFairKey = {}
  for (const f of allFairs) {
    if (f.level === 'state') {
      stateFairKey[f.state] = fairKey(f)
    }
  }

  function fairKey(f) {
    return f.code.toLowerCase().replace(/^us/, '')
  }

  // ── Output ───────────────────────────────────────────────────────────────────
  const lines = []
  lines.push(`/**`)
  lines.push(` * ISEF affiliated-fair dataset — auto-generated ${new Date().toISOString().slice(0, 10)}`)
  lines.push(` * by scripts/scrape-isef-fairs.mjs from findafair.societyforscience.org.`)
  lines.push(` *`)
  lines.push(` * ${allFairs.length} fairs scraped. Dates are confirmed from the Society directory`)
  lines.push(` * (not estimated). Coordinates geocoded from fair city via Nominatim.`)
  lines.push(` *`)
  lines.push(` * Re-run this script each fall when fairs complete annual affiliation.`)
  lines.push(` */`)
  lines.push(``)
  lines.push(`export type SeedFairLevel = 'international' | 'state' | 'regional'`)
  lines.push(``)
  lines.push(`export interface SeedFair {`)
  lines.push(`  key: string`)
  lines.push(`  name: string`)
  lines.push(`  level: SeedFairLevel`)
  lines.push(`  state: string | null`)
  lines.push(`  websiteUrl: string`)
  lines.push(`  latitude: number`)
  lines.push(`  longitude: number`)
  lines.push(`  parentKey?: string`)
  lines.push(`  year: number`)
  lines.push(`  eventDate?: string`)
  lines.push(`  registrationDeadline?: string`)
  lines.push(`  abstractDeadline?: string`)
  lines.push(`  status: 'confirmed' | 'estimated'`)
  lines.push(`}`)
  lines.push(``)
  lines.push(`export const FAIRS: SeedFair[] = [`)

  // ISEF first
  lines.push(`  // ── International ────────────────────────────────────────────────────`)
  lines.push(`  {`)
  lines.push(`    key: 'isef',`)
  lines.push(`    name: ${JSON.stringify(ISEF.name)},`)
  lines.push(`    level: 'international',`)
  lines.push(`    state: null,`)
  lines.push(`    websiteUrl: ${JSON.stringify(ISEF.websiteUrl)},`)
  lines.push(`    latitude: ${ISEF.coords[0]},`)
  lines.push(`    longitude: ${ISEF.coords[1]},`)
  lines.push(`    year: 2026,`)
  lines.push(`    eventDate: '2026-05-09',`)
  lines.push(`    status: 'estimated',`)
  lines.push(`  },`)
  lines.push(``)

  // Group by state
  const byState = {}
  for (const f of allFairs) {
    if (!byState[f.state]) byState[f.state] = []
    byState[f.state].push(f)
  }

  const sortedStates = Object.keys(byState).sort()
  for (const state of sortedStates) {
    const fairs = byState[state]
    const stateFairs = fairs.filter(f => f.level === 'state')
    const regionals = fairs.filter(f => f.level === 'regional')

    lines.push(`  // ── ${state} ─────────────────────────────────────────────────────────────`)

    // State fair first
    for (const f of stateFairs) {
      lines.push(emitFair(f, 'isef', f))
    }
    // Then regionals
    const parentKey = stateFairs[0] ? fairKey(stateFairs[0]) : 'isef'
    for (const f of regionals) {
      lines.push(emitFair(f, parentKey, f))
    }
    lines.push(``)
  }

  lines.push(`]`)

  console.log(lines.join('\n'))

  function coords(f) {
    if (f.coords) return f.coords
    return STATE_CENTROIDS[f.state] ?? [0, 0]
  }

  function emitFair(f, parentKey, origF) {
    const [lat, lng] = coords(origF)
    const key = fairKey(f)
    const out = [`  {`]
    out.push(`    key: ${JSON.stringify(key)},`)
    out.push(`    name: ${JSON.stringify(f.name)},`)
    out.push(`    level: ${JSON.stringify(f.level)},`)
    out.push(`    state: ${JSON.stringify(f.state)},`)
    out.push(`    websiteUrl: ${JSON.stringify(f.websiteUrl ?? 'https://www.societyforscience.org/isef/affiliated-fairs/')},`)
    out.push(`    latitude: ${lat},`)
    out.push(`    longitude: ${lng},`)
    out.push(`    parentKey: ${JSON.stringify(parentKey)},`)
    out.push(`    year: 2026,`)
    if (f.eventDate) out.push(`    eventDate: ${JSON.stringify(f.eventDate)},`)
    if (f.registrationDeadline) out.push(`    registrationDeadline: ${JSON.stringify(f.registrationDeadline)},`)
    out.push(`    status: 'confirmed',`)
    out.push(`  },`)
    return out.join('\n')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
