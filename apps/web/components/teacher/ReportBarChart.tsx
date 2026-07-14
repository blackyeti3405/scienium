'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

/**
 * The one recharts-backed chart the teacher reports use. Kept in its own module
 * so `TeacherReports` can `next/dynamic` it (PERF-10) — recharts is ~100KB and
 * must not ride along in the eager teacher bundle.
 */
export function ReportBarChart({
  data,
  xKey,
  barColor,
}: {
  /** Chart rows — any shape with `count` plus the `xKey` category field. */
  data: object[]
  /** Key of the category field rendered on the x-axis (e.g. 'label'). */
  xKey: string
  barColor: string
}) {
  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 4 }}>
          <CartesianGrid stroke="#ffffff12" />
          <XAxis dataKey={xKey} tick={{ fill: '#ffffff70', fontSize: 10 }} />
          <YAxis allowDecimals={false} tick={{ fill: '#ffffff70', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ background: '#0d1b2e', border: '1px solid #ffffff20', fontSize: 12 }}
            labelStyle={{ color: '#ffffffaa' }}
          />
          <Bar dataKey="count" fill={barColor} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
