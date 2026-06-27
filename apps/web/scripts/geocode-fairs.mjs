/**
 * Re-geocodes fairs whose coordinates fell back to the state centroid during
 * the initial scrape (Nominatim rate-limited on long runs). Reads dataset.ts,
 * extracts a geocodable city hint from each fair name, calls Nominatim with
 * 1.1 s delay between requests, and writes updated dataset.ts in-place.
 *
 * Usage: node apps/web/scripts/geocode-fairs.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import https from 'https'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATASET_PATH = join(__dirname, '../lib/fairs/dataset.ts')

const STATE_CENTROIDS = {
  AL: [32.8, -86.8], AK: [64.2, -149.5], AZ: [34.2, -111.7], AR: [34.9, -92.4],
  CA: [37.2, -119.4], CO: [38.9, -105.5], CT: [41.6, -72.7], DE: [39.0, -75.5],
  DC: [38.9, -77.0], FL: [28.6, -82.4], GA: [32.6, -83.4], HI: [20.3, -156.4],
  ID: [44.4, -114.6], IL: [40.0, -89.2], IN: [39.9, -86.3], IA: [42.0, -93.5],
  KS: [38.5, -98.4], KY: [37.5, -85.3], LA: [31.0, -92.0], ME: [45.4, -69.2],
  MD: [39.0, -76.8], MA: [42.3, -71.8], MI: [44.3, -85.4], MN: [46.3, -94.3],
  MS: [32.7, -89.7], MO: [38.4, -92.5], MT: [47.0, -109.6], NE: [41.5, -99.8],
  NV: [39.3, -116.6], NH: [43.7, -71.6], NJ: [40.1, -74.7], NM: [34.4, -106.1],
  NY: [42.9, -75.5], NC: [35.6, -79.4], ND: [47.5, -100.5], OH: [40.3, -82.8],
  OK: [35.6, -97.5], OR: [44.0, -120.6], PA: [40.9, -77.8], RI: [41.7, -71.5],
  SC: [33.9, -80.9], SD: [44.4, -100.2], TN: [35.9, -86.4], TX: [31.5, -99.3],
  UT: [39.3, -111.7], VT: [44.1, -72.7], VA: [37.5, -78.9], WA: [47.4, -120.5],
  WV: [38.6, -80.6], WI: [44.6, -90.0], WY: [43.0, -107.6],
}

const STATE_CAPITALS = {
  AL: 'Montgomery', AK: 'Juneau', AZ: 'Phoenix', AR: 'Little Rock', CA: 'Sacramento',
  CO: 'Denver', CT: 'Hartford', DE: 'Dover', FL: 'Tallahassee', GA: 'Atlanta',
  HI: 'Honolulu', ID: 'Boise', IL: 'Springfield', IN: 'Indianapolis', IA: 'Des Moines',
  KS: 'Topeka', KY: 'Frankfort', LA: 'Baton Rouge', ME: 'Augusta', MD: 'Annapolis',
  MA: 'Boston', MI: 'Lansing', MN: 'Saint Paul', MS: 'Jackson', MO: 'Jefferson City',
  MT: 'Helena', NE: 'Lincoln', NV: 'Carson City', NH: 'Concord', NJ: 'Trenton',
  NM: 'Santa Fe', NY: 'Albany', NC: 'Raleigh', ND: 'Bismarck', OH: 'Columbus',
  OK: 'Oklahoma City', OR: 'Salem', PA: 'Harrisburg', RI: 'Providence', SC: 'Columbia',
  SD: 'Pierre', TN: 'Nashville', TX: 'Austin', UT: 'Salt Lake City', VT: 'Montpelier',
  VA: 'Richmond', WA: 'Olympia', WV: 'Charleston', WI: 'Madison', WY: 'Cheyenne',
}

// Named region → geocodable city
const GEO_OVERRIDES = {
  'Silicon Valley': 'San Jose',
  'Golden Gate': 'San Francisco',
  'Palos Verdes': 'Palos Verdes Estates',
  'Tampa Bay': 'Tampa',
  'South Florida': 'Miami',
  'Puget Sound': 'Seattle',
  'Hudson Valley': 'Poughkeepsie',
  'Long Island': 'Hempstead',
  'Twin Cities': 'Minneapolis',
  'North Texas': 'Dallas',
  'Southern Nevada': 'Las Vegas',
  'Inland Empire': 'Riverside',
  'Rio Grande': 'Albuquerque',
  'Western Pennsylvania': 'Pittsburgh',
  'Southwestern Pennsylvania': 'Pittsburgh',
  'Appalachian': 'Beckley',
  'Tidewater': 'Norfolk',
  'Hampton Roads': 'Hampton',
  'Shenandoah': 'Harrisonburg',
  'Blue Ridge': 'Roanoke',
  'Piedmont': 'Greensboro',
  'Tri-County': null,
  'Northwest': null,
  'Northeast': null,
}

function extractCityHint(name, state) {
  // Strip brand/sponsor prefixes
  let cleaned = name.replace(/^(?:Synopsys|HITACHI|Broadcom|Siemens|Regeneron|Austin Energy|Texas Instruments)\s+/i, '')

  // Check named-region overrides
  for (const [pattern, city] of Object.entries(GEO_OVERRIDES)) {
    if (name.includes(pattern)) {
      return city  // null means "skip geocoding, leave at centroid"
    }
  }

  // "Capital" → state capital
  if (/\bCapital\b/i.test(cleaned)) return STATE_CAPITALS[state] ?? null

  // Comma-prefix: "Alameda County, HITACHI..." → "Alameda County"
  const commaM = cleaned.match(/^([^,]+),/)
  if (commaM) return commaM[1].trim().replace(/\s+County$/, '')

  // Standard patterns — extract the geographic prefix before common suffixes
  const patterns = [
    /^(.+?)\s+Regional\b/i,
    /^(.+?)\s+County\s+(?:Science|Regional|Fair|STEM|Engineering)/i,
    /^(.+?)\s+Science\s+and\s+Engineering/i,
    /^(.+?)\s+Science\s+&\s+Engineering/i,
    /^(.+?)\s+Science\s+Fair/i,
    /^(.+?)\s+STEM\s+Fair/i,
    /^(.+?)\s+Engineering\s+Fair/i,
    /^(.+?)\s+Science\s+Congress/i,
    /^(.+?)\s+Science\s+Festival/i,
    /^(.+?)\s+(?:School|District)\s+/i,
    /^(.+?)\s+Area\b/i,
  ]

  for (const pat of patterns) {
    const m = cleaned.match(pat)
    if (m) {
      let city = m[1].trim()
      // Strip leading geographic qualifiers
      city = city.replace(/^(?:Greater|Northern|Southern|Eastern|Western|Central|Metro|Tri-|Northwest|Northeast|Southwest|Southeast)\s+/i, '')
      return city.length >= 2 ? city : null
    }
  }

  return null
}

function isStateCentroid(lat, lng, state) {
  const c = STATE_CENTROIDS[state]
  if (!c) return false
  return Math.abs(lat - c[0]) < 0.01 && Math.abs(lng - c[1]) < 0.01
}

async function nominatimGeocode(city, state) {
  const query = `${city}, ${state}, USA`
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'scienium-fair-geocoder/1.0' } }, (res) => {
      let body = ''
      res.on('data', (d) => (body += d))
      res.on('end', () => {
        try {
          const results = JSON.parse(body)
          if (results.length > 0) {
            resolve([parseFloat(results[0].lat), parseFloat(results[0].lon)])
          } else {
            resolve(null)
          }
        } catch {
          resolve(null)
        }
      })
    })
    req.on('error', () => resolve(null))
    req.setTimeout(8000, () => { req.destroy(); resolve(null) })
  })
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function main() {
  const src = readFileSync(DATASET_PATH, 'utf8')

  // Parse all entries
  const entryRe = /(\s*\{[\s\S]*?\},)/g
  const entries = []
  let m
  while ((m = entryRe.exec(src)) !== null) entries.push({ text: m[1], start: m.index, end: m.index + m[0].length })

  console.error(`Found ${entries.length} entries in dataset.ts`)

  // Build list of entries needing geocoding
  const toGeocode = []
  for (const entry of entries) {
    const keyM = entry.text.match(/key:\s*["']([^"']+)["']/)
    const stateM = entry.text.match(/state:\s*["']([A-Z]{2})["']/)
    const latM = entry.text.match(/latitude:\s*([\d.-]+)/)
    const lngM = entry.text.match(/longitude:\s*([\d.-]+)/)
    const nameM = entry.text.match(/name:\s*"([^"]+)"/)
    if (!stateM || !latM || !lngM || !nameM || !keyM) continue
    const lat = parseFloat(latM[1])
    const lng = parseFloat(lngM[1])
    const state = stateM[1]
    if (!isStateCentroid(lat, lng, state)) continue
    toGeocode.push({ key: keyM[1], name: nameM[1], state, lat, lng, entry })
  }

  console.error(`${toGeocode.length} fairs need re-geocoding`)

  let updated = 0
  let failed = 0
  const updates = new Map() // key → [lat, lng]

  for (const fair of toGeocode) {
    const cityHint = extractCityHint(fair.name, fair.state)
    if (!cityHint) {
      console.error(`  SKIP ${fair.key}: no city hint from "${fair.name}"`)
      failed++
      continue
    }

    process.stderr.write(`  ${fair.key} (${fair.state}): "${cityHint}" ... `)
    const coords = await nominatimGeocode(cityHint, fair.state)
    await sleep(1100)

    if (coords) {
      console.error(`(${coords[0].toFixed(4)}, ${coords[1].toFixed(4)})`)
      updates.set(fair.key, coords)
      updated++
    } else {
      console.error(`FAILED`)
      failed++
    }
  }

  console.error(`\nGeocoded: ${updated}, Failed/skipped: ${failed}`)

  if (updates.size === 0) {
    console.error('No updates to apply.')
    return
  }

  // Apply coordinate updates to source
  let result = src
  for (const [key, [newLat, newLng]] of updates) {
    // Find the entry block for this key and replace latitude/longitude
    const keyPat = new RegExp(
      `(key:\\s*["']${key}["'][\\s\\S]*?latitude:\\s*)([\d.-]+)(,[\\s\\S]*?longitude:\\s*)([\d.-]+)`,
      'g'
    )
    const before = result
    result = result.replace(keyPat, (_, pre, _lat, mid, _lng) => {
      return `${pre}${newLat.toFixed(7)}${mid}${newLng.toFixed(7)}`
    })
    if (result === before) {
      console.error(`WARNING: Could not apply update for key "${key}"`)
    }
  }

  writeFileSync(DATASET_PATH, result, 'utf8')
  console.error(`\nWrote updated dataset.ts (${updates.size} coords updated)`)
}

main().catch((e) => { console.error(e); process.exit(1) })
