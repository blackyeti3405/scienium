export interface Measurement {
  id: string
  x: number
  y: number
  series: string
  note: string | null
}

/**
 * List-shape experiment: the list route returns point COUNTS only; a selected
 * experiment's measurements are lazy-loaded via `listMeasurements` (PERF-2).
 */
export interface Experiment {
  id: string
  title: string
  description: string
  xLabel: string
  yLabel: string
  measurementCount: number
}
