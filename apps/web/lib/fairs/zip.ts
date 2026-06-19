/**
 * US ZIP-code geography helpers (Feature 3, US-only).
 *
 * We deliberately avoid shipping a full ~40k-row ZIP centroid table. A ZIP's
 * leading three digits (the "ZIP prefix"/ZCTA3) map cleanly to a state via the
 * USPS prefix ranges below — enough to find a team's state fair and the regional
 * fairs in their state. Distance ordering then uses the state centroid as the
 * team's approximate location (precise ZIP centroids can be layered in later).
 */

// First-3-digit ZIP prefix ranges → state. Ordered, non-overlapping (USPS).
const ZIP_PREFIX_RANGES: ReadonlyArray<readonly [number, number, string]> = [
  [5, 5, 'NY'],
  [10, 27, 'MA'],
  [28, 29, 'RI'],
  [30, 38, 'NH'],
  [39, 49, 'ME'],
  [50, 59, 'VT'],
  [60, 69, 'CT'],
  [70, 89, 'NJ'],
  [100, 149, 'NY'],
  [150, 196, 'PA'],
  [197, 199, 'DE'],
  [200, 205, 'DC'],
  [206, 219, 'MD'],
  [220, 246, 'VA'],
  [247, 268, 'WV'],
  [270, 289, 'NC'],
  [290, 299, 'SC'],
  [300, 319, 'GA'],
  [320, 349, 'FL'],
  [350, 369, 'AL'],
  [370, 385, 'TN'],
  [386, 397, 'MS'],
  [398, 399, 'GA'],
  [400, 427, 'KY'],
  [430, 459, 'OH'],
  [460, 479, 'IN'],
  [480, 499, 'MI'],
  [500, 528, 'IA'],
  [530, 549, 'WI'],
  [550, 567, 'MN'],
  [570, 577, 'SD'],
  [580, 588, 'ND'],
  [590, 599, 'MT'],
  [600, 629, 'IL'],
  [630, 658, 'MO'],
  [660, 679, 'KS'],
  [680, 693, 'NE'],
  [700, 714, 'LA'],
  [716, 729, 'AR'],
  [730, 731, 'OK'],
  [733, 733, 'TX'],
  [734, 749, 'OK'],
  [750, 799, 'TX'],
  [800, 816, 'CO'],
  [820, 831, 'WY'],
  [832, 838, 'ID'],
  [840, 847, 'UT'],
  [850, 865, 'AZ'],
  [870, 884, 'NM'],
  [889, 898, 'NV'],
  [900, 961, 'CA'],
  [967, 968, 'HI'],
  [970, 979, 'OR'],
  [980, 994, 'WA'],
  [995, 999, 'AK'],
]

/** Resolve a US ZIP (5-digit or ZIP+4) to its 2-letter state code, or null. */
export function zipToState(zip: string): string | null {
  const digits = zip.trim().replace(/\D/g, '')
  if (digits.length < 3) return null
  const prefix = parseInt(digits.slice(0, 3), 10)
  if (Number.isNaN(prefix)) return null
  for (const [lo, hi, state] of ZIP_PREFIX_RANGES) {
    if (prefix >= lo && prefix <= hi) return state
  }
  return null
}

/** Basic shape validation for a US ZIP (5 digits, optional +4). */
export function isValidZip(zip: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(zip.trim())
}

// Approximate geographic centre of each state (lat, lng). Accurate enough to
// order a state's regional fairs by rough proximity to the team.
export const STATE_CENTROIDS: Record<string, readonly [number, number]> = {
  AL: [32.8, -86.8],
  AK: [64.2, -149.5],
  AZ: [34.2, -111.7],
  AR: [34.9, -92.4],
  CA: [37.2, -119.4],
  CO: [38.9, -105.5],
  CT: [41.6, -72.7],
  DE: [39.0, -75.5],
  DC: [38.9, -77.0],
  FL: [28.6, -82.4],
  GA: [32.6, -83.4],
  HI: [20.3, -156.4],
  ID: [44.4, -114.6],
  IL: [40.0, -89.2],
  IN: [39.9, -86.3],
  IA: [42.0, -93.5],
  KS: [38.5, -98.4],
  KY: [37.5, -85.3],
  LA: [31.0, -92.0],
  ME: [45.4, -69.2],
  MD: [39.0, -76.8],
  MA: [42.3, -71.8],
  MI: [44.3, -85.4],
  MN: [46.3, -94.3],
  MS: [32.7, -89.7],
  MO: [38.4, -92.5],
  MT: [47.0, -109.6],
  NE: [41.5, -99.8],
  NV: [39.3, -116.6],
  NH: [43.7, -71.6],
  NJ: [40.1, -74.7],
  NM: [34.4, -106.1],
  NY: [42.9, -75.5],
  NC: [35.6, -79.4],
  ND: [47.5, -100.5],
  OH: [40.3, -82.8],
  OK: [35.6, -97.5],
  OR: [44.0, -120.6],
  PA: [40.9, -77.8],
  RI: [41.7, -71.5],
  SC: [33.9, -80.9],
  SD: [44.4, -100.2],
  TN: [35.9, -86.4],
  TX: [31.5, -99.3],
  UT: [39.3, -111.7],
  VT: [44.1, -72.7],
  VA: [37.5, -78.9],
  WA: [47.4, -120.5],
  WV: [38.6, -80.6],
  WI: [44.6, -90.0],
  WY: [43.0, -107.6],
}

/** Great-circle distance between two [lat, lng] points, in miles. */
export function haversineMiles(a: readonly [number, number], b: readonly [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 3958.8
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
