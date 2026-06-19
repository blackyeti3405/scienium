/**
 * Affiliated-fair seed dataset (Feature 3) — US only.
 *
 * ⚠️ PROVISIONAL STARTER DATA. This is a representative sample modeled on the
 * public Society for Science *affiliated fair* directory (regional + state fairs
 * feeding Regeneron ISEF). It exists so the Science Fair gateway has something
 * real to match against today. Coordinates are host-city/state-centre
 * approximations; **all dates are ESTIMATED** (typical spring windows) and must
 * be verified per fair — the gateway surfaces them as estimated and offers an
 * AI "sync from site" step (see /api/fairs/[id]/sync-deadlines).
 *
 * Owner follow-up (HANDOFF open input): replace/extend this with the full
 * affiliated-fair list. `ensureFairsSeeded()` upserts by `key`, so growing this
 * array and re-running is safe and idempotent.
 */

export type SeedFairLevel = 'international' | 'state' | 'regional'

export interface SeedFair {
  /** Stable natural key → Fair.seedKey (idempotent upsert). */
  key: string
  name: string
  level: SeedFairLevel
  /** 2-letter state, or null for the international fair. */
  state: string | null
  websiteUrl: string
  latitude: number
  longitude: number
  /** Parent fair key (regional → state → international). */
  parentKey?: string
  // 2026 event window — ESTIMATED unless a fair has been verified/synced.
  year: number
  eventDate?: string
  registrationDeadline?: string
  abstractDeadline?: string
  status: 'confirmed' | 'estimated'
}

// Where we point when we don't have a confident official URL yet.
const DIRECTORY = 'https://www.societyforscience.org/isef/affiliated-fairs/'

export const FAIRS: SeedFair[] = [
  // ── International ──────────────────────────────────────────────────────────
  {
    key: 'isef',
    name: 'Regeneron International Science and Engineering Fair (ISEF)',
    level: 'international',
    state: null,
    websiteUrl: 'https://www.societyforscience.org/isef/',
    latitude: 33.45,
    longitude: -112.07,
    year: 2026,
    eventDate: '2026-05-09',
    status: 'estimated',
  },

  // ── State fairs (a spread of states) ───────────────────────────────────────
  ...stateFair('ca-state', 'California Science & Engineering Fair', 'CA', 34.02, -118.29, 'cssf.usc.edu'),
  ...stateFair('tx-state', 'Texas Science & Engineering Fair', 'TX', 29.42, -98.49),
  ...stateFair('ny-state', 'New York State Science & Engineering Fair', 'NY', 40.71, -74.01),
  ...stateFair('fl-state', 'State Science & Engineering Fair of Florida', 'FL', 27.95, -82.46, 'ssefflorida.com'),
  ...stateFair('il-state', 'Illinois Junior Academy of Science State Expo', 'IL', 40.11, -88.24),
  ...stateFair('pa-state', 'Pennsylvania Junior Academy of Science', 'PA', 40.81, -77.86),
  ...stateFair('oh-state', 'State Science Day (Ohio)', 'OH', 40.0, -83.02, 'ohiosci.org'),
  ...stateFair('ga-state', 'Georgia Science & Engineering Fair', 'GA', 33.95, -83.37),
  ...stateFair('nc-state', 'North Carolina Science & Engineering Fair', 'NC', 35.78, -78.68),
  ...stateFair('wa-state', 'Washington State Science & Engineering Fair', 'WA', 47.25, -122.44),
  ...stateFair('az-state', 'Arizona Science & Engineering Fair', 'AZ', 33.45, -112.07, 'azsciencefair.org'),
  ...stateFair('ma-state', 'Massachusetts State Science & Engineering Fair', 'MA', 42.36, -71.09, 'scifair.com'),
  ...stateFair('co-state', 'Colorado Science & Engineering Fair', 'CO', 40.59, -105.08, 'csef.colostate.edu'),
  ...stateFair('mi-state', 'Michigan Science & Engineering Fair', 'MI', 42.33, -83.05),
  ...stateFair('mn-state', 'Minnesota State Science & Engineering Fair', 'MN', 44.98, -93.27),
  ...stateFair('va-state', 'Virginia State Science & Engineering Fair', 'VA', 37.54, -77.44),

  // ── Regional fairs (examples of the tier, feeding their state fair) ─────────
  ...regionalFair('ca-la', 'Los Angeles County Science & Engineering Fair', 'CA', 'ca-state', 34.05, -118.24, 'lascifair.org'),
  ...regionalFair('ca-sd', 'Greater San Diego Science & Engineering Fair', 'CA', 'ca-state', 32.72, -117.16, 'gsdsef.org'),
  ...regionalFair('ca-sf', 'San Francisco Bay Area Science & Engineering Fair', 'CA', 'ca-state', 37.77, -122.42),
  ...regionalFair('tx-houston', 'Science & Engineering Fair of Houston', 'TX', 'tx-state', 29.76, -95.37, 'sefhouston.org'),
  ...regionalFair('ny-nyc', 'New York City Science & Engineering Fair', 'NY', 'ny-state', 40.71, -74.01, 'nycsef.org'),
]

// State fairs run mid-March–April; ISEF mid-May. Estimated windows by tier.
function stateFair(
  key: string,
  name: string,
  state: string,
  latitude: number,
  longitude: number,
  domain?: string,
): [SeedFair] {
  return [
    {
      key,
      name,
      level: 'state',
      state,
      websiteUrl: domain ? `https://${domain}/` : DIRECTORY,
      latitude,
      longitude,
      parentKey: 'isef',
      year: 2026,
      eventDate: '2026-04-04',
      registrationDeadline: '2026-03-06',
      abstractDeadline: '2026-03-20',
      status: 'estimated',
    },
  ]
}

function regionalFair(
  key: string,
  name: string,
  state: string,
  parentKey: string,
  latitude: number,
  longitude: number,
  domain?: string,
): [SeedFair] {
  return [
    {
      key,
      name,
      level: 'regional',
      state,
      websiteUrl: domain ? `https://${domain}/` : DIRECTORY,
      latitude,
      longitude,
      parentKey,
      year: 2026,
      eventDate: '2026-03-14',
      registrationDeadline: '2026-02-13',
      abstractDeadline: '2026-02-27',
      status: 'estimated',
    },
  ]
}
