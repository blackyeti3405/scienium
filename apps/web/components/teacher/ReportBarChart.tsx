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
 *
 * The chart is an unlabelled SVG to assistive tech, so it carries two things
 * (§0.9 Row B): a `role="img"` name summarising the distribution, and the same
 * numbers as a real `<table>` behind a disclosure — the pattern the proficiency
 * section next to it already uses. Both live HERE rather than at the call sites
 * so every current and future chart gets them.
 */
export function ReportBarChart({
  data,
  xKey,
  barColor,
  label,
}: {
  /** Chart rows — any shape with `count` plus the `xKey` category field. */
  data: object[]
  /** Key of the category field rendered on the x-axis (e.g. 'label'). */
  xKey: string
  barColor: string
  /** What the chart is OF, e.g. "Phase distribution". Names the chart. */
  label: string
}) {
  const rows = (data as Record<string, unknown>[]).map((r) => ({
    category: String(r[xKey] ?? ''),
    count: Number(r.count ?? 0),
  }))
  const summary = rows.map((r) => `${r.category}: ${r.count}`).join(', ')

  return (
    <div className="space-y-2">
      <div
        style={{ width: '100%', height: 220 }}
        role="img"
        aria-label={rows.length === 0 ? `${label} — no data` : `${label}. ${summary}`}
      >
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

      {rows.length > 0 && (
        <details className="group">
          <summary className="font-pixel text-[8px] text-white/40 hover:text-white/70 uppercase tracking-widest cursor-pointer">
            View as table
          </summary>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm text-white/80 border-collapse">
              <caption className="sr-only">{label}</caption>
              <thead>
                <tr className="font-pixel text-[8px] text-white/40 uppercase">
                  <th scope="col" className="text-left py-1.5 px-2">
                    Category
                  </th>
                  <th scope="col" className="text-right py-1.5 px-2">
                    Count
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.category} className="border-t border-white/5">
                    <th scope="row" className="py-1.5 px-2 text-left font-normal text-white">
                      {r.category}
                    </th>
                    <td className="py-1.5 px-2 text-right tabular-nums">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  )
}
