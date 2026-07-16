import { COMMIT_HEATMAP } from '@/lib/commit-heatmap.generated'

/**
 * GitHub-contribution-style heatmap of REAL commit activity (DESIGN.md: show
 * the real product, not a claim). Reads a static build-time snapshot
 * (lib/commit-heatmap.generated.ts, written by scripts/gen-commit-heatmap.mjs
 * from `git log` — never a live GitHub API call, the repo may be private).
 * One accent (gold) at increasing opacity is the intensity scale, no second hue.
 */
const DAY_MS = 24 * 60 * 60 * 1000
const WEEKS = 53

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10)
}

function buildWeeks() {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const end = new Date(today.getTime() + (6 - today.getUTCDay()) * DAY_MS) // through this Saturday
  const start = new Date(end.getTime() - (WEEKS * 7 - 1) * DAY_MS)

  const weeks: { date: Date; count: number }[][] = []
  let cursor = start
  for (let w = 0; w < WEEKS; w++) {
    const week: { date: Date; count: number }[] = []
    for (let d = 0; d < 7; d++) {
      week.push({ date: cursor, count: COMMIT_HEATMAP[isoDay(cursor)] ?? 0 })
      cursor = new Date(cursor.getTime() + DAY_MS)
    }
    weeks.push(week)
  }
  return weeks
}

function bucket(count: number) {
  if (count <= 0) return 0
  if (count <= 2) return 1
  if (count <= 5) return 2
  return 3
}

const BUCKET_FILL = ['#eeede6', 'rgba(245,197,24,0.35)', 'rgba(245,197,24,0.65)', '#F5C518']

export function CommitsGrid() {
  const weeks = buildWeeks()
  const total = Object.values(COMMIT_HEATMAP).reduce((sum, n) => sum + n, 0)

  return (
    <div>
      <div
        className="flex gap-[3px] overflow-x-auto pb-2"
        role="img"
        aria-label={`Commit activity heatmap: ${total} commits in the last year`}
      >
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => (
              <div
                key={di}
                title={`${isoDay(day.date)}: ${day.count} commit${day.count === 1 ? '' : 's'}`}
                style={{
                  width: 10,
                  height: 10,
                  background: BUCKET_FILL[bucket(day.count)],
                  border: '1px solid #d9d8cd',
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-3 font-display text-[13px] text-[#5a6b80]">
        {total.toLocaleString()} commits in the last year — real build activity, not a claim.
      </p>
    </div>
  )
}
