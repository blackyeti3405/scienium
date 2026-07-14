export interface Measurement {
  id: string
  x: number
  y: number
  series: string
  note: string | null
}

export interface Experiment {
  id: string
  title: string
  description: string
  xLabel: string
  yLabel: string
  measurements: Measurement[]
}
