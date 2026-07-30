import { beforeEach, describe, expect, it } from 'vitest'
import { routeHarness, type RoutePolicyHarness } from './harness/route-policy'

/**
 * Route-policy matrix — data-terminal datasets family
 * (/api/data-terminal/datasets/**). See test/harness/route-policy.ts. Every
 * route gates on feature `data_terminal`, so this family also carries the
 * phase-gate 403 case.
 */

import {
  GET as datasetsGET,
  POST as datasetsPOST,
} from '@/app/api/data-terminal/datasets/route'
import {
  GET as datasetGET,
  PATCH as datasetPATCH,
  DELETE as datasetDELETE,
} from '@/app/api/data-terminal/datasets/[id]/route'
import { MAX_DATASETS_PER_TEAM } from '@/lib/data-terminal/dataset'

let h: RoutePolicyHarness

const DS_A = 'ds_of_team_a'
const DS_B = 'ds_of_team_b'

const STAMP = new Date('2026-07-28T10:00:00.000Z')

const COLUMNS = [
  { id: 'c1', name: 'Time', type: 'number', role: 'x' },
  { id: 'c2', name: 'Mass', type: 'number', role: 'y' },
]

function seedDatasets(harness: RoutePolicyHarness) {
  const ds = (id: string, teamId: string) => ({
    id,
    teamId,
    name: 'Growth run',
    tableType: 'xy',
    sourceFilename: null,
    columns: COLUMNS,
    rows: [[1, 10]],
    rowCount: 1,
    createdByUserId: harness.ids.studentA,
    createdAt: STAMP,
    updatedAt: STAMP,
  })
  harness.seed('dataset', ds(DS_A, harness.ids.teamA))
  harness.seed('dataset', ds(DS_B, harness.ids.teamB))
}

beforeEach(() => {
  h = routeHarness()
  seedDatasets(h)
})

const NEW_DATASET = {
  body: { name: 'Trial 2', tableType: 'xy', columns: COLUMNS, rows: [[1, 10]] },
}

const CHART = {
  id: 'ch1',
  type: 'bar',
  xColumnId: 'c1',
  yColumnIds: ['c2'],
  showLegend: true,
  showGridlines: true,
}

describe('GET /api/data-terminal/datasets', () => {
  it("lists only the caller's own team", async () => {
    const body = await h.asStudentA().get(datasetsGET).expect(200)
    expect(body.datasets.map((d: { id: string }) => d.id)).toEqual([DS_A])
  })
  it('never ships row data in the list', async () => {
    // A term of datasets would be megabytes of cells nobody is looking at.
    const body = await h.asStudentA().get(datasetsGET).expect(200)
    expect(body.datasets[0]).not.toHaveProperty('rows')
    expect(body.datasets[0].rowCount).toBe(1)
  })
  it('401s signed out', () => h.anonymous().get(datasetsGET).expect(401))
  it('429s over the tier', () => h.asStudentA().overLimit().get(datasetsGET).expect(429))
  it('403s when the phase has not unlocked data_terminal', async () => {
    // Datasets inherit the experiments gate exactly — locked before `working`.
    const early = routeHarness({ phase: 'discovery' })
    seedDatasets(early)
    await early.asStudentA().get(datasetsGET).expect(403)
  })
})

describe('POST /api/data-terminal/datasets', () => {
  it('creates a dataset for its own team', async () => {
    await h.asStudentA().post(datasetsPOST, undefined, NEW_DATASET).expect(200)
    expect(h.rows('dataset').filter((d) => d.teamId === h.ids.teamA)).toHaveLength(2)
  })
  it('accepts an empty dataset as a starting point', () =>
    h
      .asStudentA()
      .post(datasetsPOST, undefined, { body: { name: 'Blank', tableType: 'xy' } })
      .expect(200))
  it('400s a dataset whose columns break the table type', async () => {
    // A Column table has no x axis — its columns ARE the groups.
    await h
      .asStudentA()
      .post(datasetsPOST, undefined, {
        body: { name: 'Bad', tableType: 'column', columns: COLUMNS, rows: [[1, 10]] },
      })
      .expect(400)
    expect(h.rows('dataset')).toHaveLength(2)
  })
  it('400s two columns sharing a name', async () => {
    await h
      .asStudentA()
      .post(datasetsPOST, undefined, {
        body: {
          name: 'Bad',
          tableType: 'xy',
          columns: [
            { id: 'c1', name: 'Mass', type: 'number', role: 'x' },
            { id: 'c2', name: 'mass', type: 'number', role: 'y' },
          ],
          rows: [],
        },
      })
      .expect(400)
  })
  it('400s an unknown field rather than silently accepting it', () =>
    h
      .asStudentA()
      .post(datasetsPOST, undefined, {
        body: { name: 'X', tableType: 'xy', teamId: 'someone_else' },
      })
      .expect(400))
  it('409s at the dataset cap', async () => {
    for (let i = 0; i < MAX_DATASETS_PER_TEAM; i++) {
      h.seed('dataset', {
        id: `ds_fill_${i}`,
        teamId: h.ids.teamA,
        name: `d${i}`,
        tableType: 'xy',
        columns: [],
        rows: [],
        rowCount: 0,
        createdByUserId: h.ids.studentA,
        createdAt: STAMP,
        updatedAt: STAMP,
      })
    }
    await h.asStudentA().post(datasetsPOST, undefined, NEW_DATASET).expect(409)
  })
  it('401s signed out', () => h.anonymous().post(datasetsPOST, undefined, NEW_DATASET).expect(401))
  it('403s cross-origin', () =>
    h.asStudentA().crossOrigin().post(datasetsPOST, undefined, NEW_DATASET).expect(403))
  it('429s over the tier', () =>
    h.asStudentA().overLimit().post(datasetsPOST, undefined, NEW_DATASET).expect(429))
})

describe('GET /api/data-terminal/datasets/[id]', () => {
  it('returns its own dataset with rows', async () => {
    const body = await h.asStudentA().get(datasetGET, DS_A).expect(200)
    expect(body.dataset.rows).toEqual([[1, 10]])
  })
  it("404s ANOTHER team's real dataset", () => h.asStudentA().get(datasetGET, DS_B).expect(404))
  it('401s signed out', () => h.anonymous().get(datasetGET, DS_A).expect(401))
  it('429s over the tier', () => h.asStudentA().overLimit().get(datasetGET, DS_A).expect(429))
})

describe('PATCH /api/data-terminal/datasets/[id]', () => {
  const RENAME = { body: { name: 'Renamed' } }

  it('updates its own dataset', () => h.asStudentA().patch(datasetPATCH, DS_A, RENAME).expect(200))

  it("404s ANOTHER team's real dataset unchanged", async () => {
    await h.asStudentA().patch(datasetPATCH, DS_B, RENAME).expect(404)
    expect(h.rows('dataset').find((d) => d.id === DS_B)?.name).toBe('Growth run')
  })

  it('validates the MERGED dataset, not just the patch', async () => {
    // Switching to a Column table must be refused while an x column is stored,
    // even though the patch itself carries no columns at all.
    await h.asStudentA().patch(datasetPATCH, DS_A, { body: { tableType: 'column' } }).expect(400)
    expect(h.rows('dataset').find((d) => d.id === DS_A)?.tableType).toBe('xy')
  })

  it('409s a save based on a stale copy rather than discarding a teammate’s work', async () => {
    await h
      .asStudentA()
      .patch(datasetPATCH, DS_A, {
        body: { name: 'Mine', expectedUpdatedAt: '2020-01-01T00:00:00.000Z' },
      })
      .expect(409)
    expect(h.rows('dataset').find((d) => d.id === DS_A)?.name).toBe('Growth run')
  })

  it('accepts a save whose expected stamp still matches', () =>
    h
      .asStudentA()
      .patch(datasetPATCH, DS_A, {
        body: { name: 'Mine', expectedUpdatedAt: STAMP.toISOString() },
      })
      .expect(200))

  it('keeps rowCount in step with the rows it stored', async () => {
    await h
      .asStudentA()
      .patch(datasetPATCH, DS_A, { body: { rows: [[1, 10], [2, 20], [3, 30]] } })
      .expect(200)
    expect(h.rows('dataset').find((d) => d.id === DS_A)?.rowCount).toBe(3)
  })

  it('401s signed out', () => h.anonymous().patch(datasetPATCH, DS_A, RENAME).expect(401))
  it('403s cross-origin', () =>
    h.asStudentA().crossOrigin().patch(datasetPATCH, DS_A, RENAME).expect(403))
  it('429s over the tier', () =>
    h.asStudentA().overLimit().patch(datasetPATCH, DS_A, RENAME).expect(429))
})

describe('DELETE /api/data-terminal/datasets/[id]', () => {
  it('deletes its own dataset', async () => {
    await h.asStudentA().delete(datasetDELETE, DS_A).expect(200)
    expect(h.rows('dataset').map((d) => d.id)).toEqual([DS_B])
  })
  it("404s ANOTHER team's real dataset and deletes nothing", async () => {
    await h.asStudentA().delete(datasetDELETE, DS_B).expect(404)
    expect(h.rows('dataset')).toHaveLength(2)
  })
  it('401s signed out', () => h.anonymous().delete(datasetDELETE, DS_A).expect(401))
  it('403s cross-origin', () =>
    h.asStudentA().crossOrigin().delete(datasetDELETE, DS_A).expect(403))
})

describe('PATCH charts (Phase B — Sheets mode)', () => {
  it('accepts and persists a charts array', async () => {
    await h.asStudentA().patch(datasetPATCH, DS_A, { body: { charts: [CHART] } }).expect(200)
    const stored = h.rows('dataset').find((d) => d.id === DS_A)
    expect(stored?.charts as unknown[]).toHaveLength(1)
    expect((stored?.charts as { type: string }[])[0]!.type).toBe('bar')
  })

  it('returns the persisted charts in the response body', async () => {
    const body = await h.asStudentA().patch(datasetPATCH, DS_A, { body: { charts: [CHART] } }).expect(200)
    expect(body.dataset.charts).toHaveLength(1)
  })

  it('400s a chart whose type is not a known chart type (strict enum)', () =>
    h
      .asStudentA()
      .patch(datasetPATCH, DS_A, { body: { charts: [{ ...CHART, type: 'wobble' }] } })
      .expect(400))

  it('400s a chart carrying an unknown field rather than silently dropping it', () =>
    h
      .asStudentA()
      .patch(datasetPATCH, DS_A, { body: { charts: [{ ...CHART, bogus: 1 }] } })
      .expect(400))

  it('400s a trendline with an out-of-range polynomial order', () =>
    h
      .asStudentA()
      .patch(datasetPATCH, DS_A, {
        body: { charts: [{ ...CHART, trendlines: [{ yColumnId: 'c2', kind: 'polynomial', order: 9 }] }] },
      })
      .expect(400))

  it("404s charts aimed at ANOTHER team's dataset and writes nothing", async () => {
    await h.asStudentA().patch(datasetPATCH, DS_B, { body: { charts: [CHART] } }).expect(404)
    expect(h.rows('dataset').find((d) => d.id === DS_B)?.charts).toBeUndefined()
  })
})

describe('dataset write-path regressions found in review', () => {
  // A column-less body is a legitimate CREATE, so the route waives the "needs
  // at least one column" issue. It used to waive that by ignoring the whole
  // check whenever `columns` was empty — which took the byte cap and the
  // rectangular-rows check with it, because the helper returns only the FIRST
  // issue and that one always sorts first.
  // ~2.5 MB: deliberately BETWEEN the 2 MB stored cap and the 3 MB body ceiling,
  // so it reaches the semantic check instead of being refused as a 413 first.
  const bigRows = () =>
    Array.from({ length: 300 }, () => Array.from({ length: 40 }, () => 'x'.repeat(200)))

  it('still enforces the byte cap on a body that sends no columns', async () => {
    await h
      .asStudentA()
      .post(datasetsPOST, undefined, {
        body: { name: 'Oversized', tableType: 'xy', columns: [], rows: bigRows() },
      })
      .expect(400)
    expect(h.rows('dataset').filter((d) => d.name === 'Oversized')).toHaveLength(0)
  })

  it('refuses a PATCH that would empty an existing dataset', async () => {
    // `data.columns ?? current.columns` keeps a client-sent `[]` (it is not
    // nullish), so this wiped the stored schema and skipped every other check.
    await h
      .asStudentA()
      .patch(datasetPATCH, DS_A, { body: { columns: [], rows: [] } })
      .expect(400)
    expect((h.rows('dataset').find((d) => d.id === DS_A)?.columns as unknown[])).toHaveLength(2)
  })

  it('still enforces the byte cap on a PATCH', async () => {
    await h
      .asStudentA()
      .patch(datasetPATCH, DS_A, { body: { rows: bigRows() } })
      .expect(400)
    expect(h.rows('dataset').find((d) => d.id === DS_A)?.rowCount).toBe(1)
  })
})
