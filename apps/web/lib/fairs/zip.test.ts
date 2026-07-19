import { describe, expect, it } from 'vitest'
import { zipToApproxCoords } from './zip'

/**
 * ZIP → approximate coordinates (drives "nearest regional fair" ordering).
 *
 * The headline case is the restored leading zero: a Northeast ZIP that lost
 * its 0 upstream ("6001" for CT 06001) used to prefix to "600" and resolve to
 * ILLINOIS — a silently wrong-region fair match. The old recovery branch was
 * provably dead (it checked a 3-char slice for length < 3).
 */

const HARTFORD_CT: readonly [number, number] = [41.76, -72.68]
const CHICAGO_IL: readonly [number, number] = [41.85, -87.65]

describe('zipToApproxCoords', () => {
  it('resolves a normal 5-digit ZIP by its 3-digit prefix', () => {
    expect(zipToApproxCoords('60601')).toEqual(CHICAGO_IL)
  })

  it('keeps the leading zero of a Northeast ZIP', () => {
    expect(zipToApproxCoords('06001')).toEqual(HARTFORD_CT)
  })

  it('restores a stripped leading zero instead of resolving the wrong region', () => {
    // "6001" is CT 06001 with the 0 eaten by a spreadsheet — NOT Chicago 600xx.
    expect(zipToApproxCoords('6001')).toEqual(HARTFORD_CT)
    expect(zipToApproxCoords('6001')).not.toEqual(CHICAGO_IL)
  })

  it('strips punctuation/ZIP+4 before resolving', () => {
    expect(zipToApproxCoords('06001-1234')).not.toBeNull()
  })

  it('falls back to the state centroid when the input is too short', () => {
    expect(zipToApproxCoords('6', 'CT')).not.toBeNull()
    expect(zipToApproxCoords('6', null)).toBeNull()
  })

  it('unknown prefix falls back to the state centroid, then null', () => {
    expect(zipToApproxCoords('00000', null)).toBeNull()
  })
})
