import { z } from 'zod'
import { requestJson } from '@/lib/api/client'
import type { ParsedPoints } from '@/lib/data-terminal/csv'

const measurementSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  series: z.string(),
  note: z.string().nullable(),
})

const experimentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  xLabel: z.string(),
  yLabel: z.string(),
  measurements: z.array(measurementSchema),
})

const okSchema = z.object({ ok: z.literal(true) })

export function listExperiments() {
  return requestJson('/api/data-terminal', z.object({ experiments: z.array(experimentSchema) }))
}

export function createExperiment(body: { title: string; xLabel?: string; yLabel?: string }) {
  return requestJson('/api/data-terminal', z.object({ experiment: experimentSchema }), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function deleteExperiment(experimentId: string): Promise<void> {
  await requestJson(`/api/data-terminal/${experimentId}`, okSchema, { method: 'DELETE' })
}

export function addMeasurements(experimentId: string, points: ParsedPoints['points']) {
  return requestJson(
    `/api/data-terminal/${experimentId}/measurements`,
    z.object({ measurements: z.array(measurementSchema) }),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points }),
    },
  )
}

export async function deleteMeasurement(experimentId: string, measurementId: string): Promise<void> {
  await requestJson(
    `/api/data-terminal/${experimentId}/measurements?measurementId=${measurementId}`,
    okSchema,
    { method: 'DELETE' },
  )
}
