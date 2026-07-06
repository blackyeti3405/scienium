/**
 * Data Terminal "Stats Guide" — a static, authored reference library of ~25
 * statistics concepts a science-fair student needs when analyzing their data.
 *
 * Content philosophy: SHOW THE PROCESS, not library invocations — and now,
 * show the CONCEPTUAL layer above the code too, not just the arithmetic.
 * Each entry teaches the same idea three times, at increasing levels of
 * detail: (1) `definition`/`whenToUse` explain WHAT the stat means and WHY
 * the calculation is shaped the way it is, in prose; (2) `formula` +
 * `formulaBreakdown` show the actual mathematical expression in clean
 * Unicode math and decode every symbol in it; (3) `code` computes the SAME
 * formula step by step from `datasetCsv`'s values — building sums,
 * deviations, sorted ranks, or confusion-matrix counts by hand and PRINTING
 * every intermediate value — and only reaches for a library call (i) as a
 * one-line cross-check at the end, or (ii) for the one genuinely
 * non-hand-computable step (e.g. an exact tail probability under a
 * distribution), which is called out explicitly in a comment. The dataset a
 * snippet uses is always shown twice: once as its own labeled CSV text
 * (`datasetCsv`) and once loaded/parsed inside `code` via `csv.DictReader`,
 * so a reader can see the two visibly correspond.
 *
 * `formula` must always describe exactly what `code` computes — if a
 * snippet applies a real-world wrinkle (e.g. chi-square's Yates' continuity
 * correction, or AUC's pair-counting definition rather than the textbook
 * "area under a curve" framing), the breakdown says so explicitly rather
 * than silently showing a formula the code doesn't actually use.
 *
 * Source of truth for this module: the author ran every snippet against its
 * own inline CSV and precomputed `output` (INCLUDING every intermediate
 * print, not just the final number) by hand — it is NOT generated at request
 * time, there is no LLM call and no Python execution in the app. Mirrors the
 * `ISEF_RUBRIC` pattern (`lib/fairs/isef-rubric.ts`): a typed constant module
 * rendered client-side, nothing fetched, nothing persisted.
 *
 * If a concept's dataset or wording ever needs to change, re-run the snippet
 * and update `output` (and `datasetCsv`) to match exactly — the three must
 * never drift apart. `code` and `output` are the empirically verified layer
 * and must never be edited casually; `formula`/`formulaBreakdown`/prose are
 * free to be refined without touching them.
 */

import { filterGuideEntries } from '@/lib/guides/filter'

export type StatCategory =
  | 'descriptive'
  | 'comparing-groups'
  | 'relationships'
  | 'classification-metrics'
  | 'multiple-testing'
  | 'nonparametric-tests'
  | 'regression-diagnostics'
  | 'epidemiology'
  | 'bayesian'
  | 'agreement'

export const STAT_CATEGORIES: { key: StatCategory; label: string }[] = [
  { key: 'descriptive', label: 'Descriptive' },
  { key: 'comparing-groups', label: 'Comparing groups' },
  { key: 'relationships', label: 'Relationships' },
  { key: 'classification-metrics', label: 'Classification metrics' },
  { key: 'multiple-testing', label: 'Multiple testing' },
  { key: 'nonparametric-tests', label: 'Nonparametric tests' },
  { key: 'regression-diagnostics', label: 'Regression diagnostics' },
  { key: 'epidemiology', label: 'Epidemiology' },
  { key: 'bayesian', label: 'Bayesian' },
  { key: 'agreement', label: 'Agreement' },
]

/** One symbol/term from a `formula` decoded into a plain-language meaning. */
export interface FormulaTerm {
  term: string
  meaning: string
}

export interface StatConcept {
  /** Stable, slug-safe, unique id — drives the data-testid (e.g. "p-value"). */
  id: string
  /** Human title shown in the box header (e.g. "P-value (statistical significance)"). */
  title: string
  category: StatCategory
  /** Extra search terms, optional. */
  aliases?: string[]
  /** PART 1a — 2-4 sentences: what the stat tells you, the intuition for HOW the calculation produces that meaning, and when it's the right tool. Textbook-sidebar depth, not a tooltip. */
  definition: string
  /** PART 1b — when a science-fair student reaches for it. */
  whenToUse: string
  /** PART 2a — the actual mathematical formula in clean Unicode math (Σ √ x̄ β χ² etc., no LaTeX), matching exactly what `code` computes. */
  formula: string
  /** PART 2b — every symbol/term in `formula` decoded in plain language, teaching WHY the formula is shaped the way it is (not just naming parts). */
  formulaBreakdown: FormulaTerm[]
  /** PART 3 — the sample dataset as real CSV text (header row + values), rendered as its own "THE DATA" block and loaded by `code`. */
  datasetCsv: string
  /** PART 4 — self-contained runnable Python: loads `datasetCsv`'s values, computes the concept step by step (printing intermediates), then a one-line library cross-check. EMPIRICALLY VERIFIED — do not edit without re-running and re-diffing against `output`. */
  code: string
  /** PART 5 — one prose line describing the inline sample dataset. */
  datasetNote: string
  /** PART 6 — the exact printed result for that dataset, INCLUDING every intermediate print, author-precomputed static text. EMPIRICALLY VERIFIED — must stay byte-for-byte what `code` prints. */
  output: string
  /** One gotcha / interpretation note. */
  caveat: string
}

export const STATS_GUIDE: StatConcept[] = [
  // ─── Category A — Descriptive statistics ────────────────────────────────
  {
    id: 'mean',
    title: 'Mean (average)',
    category: 'descriptive',
    aliases: ['average'],
    definition:
      'The mean is the single number that best represents a whole batch of measurements — add everything up, then split that total evenly across every measurement you took. It works because addition-then-division treats every data point as equally important: a value doesn\'t need to occur more than once to "count" more, it just needs to add its own weight to the total. That is exactly why one unusually large or small measurement can swing the mean noticeably — it still only gets one vote, but its size still enters the sum. Reach for the mean when your measurements are reasonably symmetric (no wild outliers) and you want the single most useful summary number for further math (it is the number every other descriptive stat on this page is built around).',
    whenToUse:
      'Use it to summarize a batch of measurements (e.g. plant heights across your replicates) with one number.',
    formula: 'x̄ = ( Σ xᵢ ) / n',
    formulaBreakdown: [
      { term: 'x̄', meaning: '"x-bar" — the standard symbol for a sample mean.' },
      { term: 'Σ xᵢ', meaning: 'the sum (Σ, "sigma") of every individual measurement xᵢ — add up all seven plant heights.' },
      { term: 'n', meaning: 'how many measurements you have (n = 7 here) — the number you divide the total by.' },
    ],
    datasetCsv: `height_cm
14.2
15.8
13.9
16.1
15.0
14.7
15.5`,
    code: `import csv
import io
import numpy as np

csv_text = """height_cm
14.2
15.8
13.9
16.1
15.0
14.7
15.5"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
heights = [float(r["height_cm"]) for r in rows]

total = sum(heights)
n = len(heights)
mean = total / n

print(f"total = {total:.1f}")
print(f"n = {n}")
print(f"mean = total / n = {total:.1f} / {n} = {mean:.2f} cm")

# check: does numpy agree?
print(f"check: np.mean(heights) = {np.mean(heights):.2f} cm")`,
    datasetNote: 'Seven plant-height measurements (cm) from one group at day 14.',
    output:
      'total = 105.2\n' +
      'n = 7\n' +
      'mean = total / n = 105.2 / 7 = 15.03 cm\n' +
      'check: np.mean(heights) = 15.03 cm',
    caveat:
      'The mean is pulled around by outliers — one unusually tall or short plant can shift it a lot. See Median for a more robust alternative.',
  },
  {
    id: 'median',
    title: 'Median',
    category: 'descriptive',
    aliases: ['middle value', 'robust average'],
    definition:
      "The median is the middle value once your measurements are lined up smallest to largest — the point where exactly half your data falls below and half falls above. Unlike the mean, it doesn't care HOW far away the extreme values are, only how many measurements sit on each side of the middle — so a single freakishly large or small trial can only ever shift the median by one rank, not by its actual size. That's the key intuition for the whole concept: sorting first and picking the position in the middle throws away the distances between points and keeps only their order, which is exactly what makes the result immune to outliers. Reach for the median whenever a dataset has (or might have) an outlier, or is skewed in one direction, and you want a \"typical value\" that isn't distorted by it.",
    whenToUse:
      'Use it instead of the mean when your data has outliers or is skewed (e.g. one wildly slow reaction-time trial).',
    formula: 'median = middle value of sorted xᵢ  (or average of the two middle values if n is even)',
    formulaBreakdown: [
      { term: 'sorted xᵢ', meaning: 'every measurement lined up from smallest to largest — the calculation only cares about ORDER, not the actual distances between values.' },
      { term: 'middle value (n odd)', meaning: 'with an odd count (n=7 here), there is a single middle position — index 3 in a 0-based list of 7 — and that value IS the median.' },
      { term: 'average of two middles (n even)', meaning: 'with an even count, there is no single middle item, so you average the two values straddling the center instead.' },
    ],
    datasetCsv: `trial,reaction_time_ms
1,210
2,225
3,198
4,205
5,800
6,215
7,220`,
    code: `import csv
import io
import numpy as np

csv_text = """trial,reaction_time_ms
1,210
2,225
3,198
4,205
5,800
6,215
7,220"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
times = [float(r["reaction_time_ms"]) for r in rows]

sorted_times = sorted(times)
n = len(sorted_times)
mid = n // 2
print(f"sorted: {sorted_times}")
print(f"n = {n} (odd), middle index = {mid}")
median = sorted_times[mid]
print(f"median = sorted[{mid}] = {median:.0f} ms")

total = sum(times)
mean = total / n
print(f"mean = {total:.1f} / {n} = {mean:.1f} ms")

# check: numpy agrees
print(f"check: np.median={np.median(times):.0f} ms, np.mean={np.mean(times):.1f} ms")`,
    datasetNote: 'Seven reaction-time trials (ms), where one trial (800 ms) is a clear outlier.',
    output:
      'sorted: [198.0, 205.0, 210.0, 215.0, 220.0, 225.0, 800.0]\n' +
      'n = 7 (odd), middle index = 3\n' +
      'median = sorted[3] = 215 ms\n' +
      'mean = 2073.0 / 7 = 296.1 ms\n' +
      'check: np.median=215 ms, np.mean=296.1 ms',
    caveat:
      "The mean (296.1 ms) is dragged way up by the single 800 ms outlier, but the median (215 ms) barely moves — that's exactly why median is the safer summary for skewed data.",
  },
  {
    id: 'mode',
    title: 'Mode (most common value)',
    category: 'descriptive',
    aliases: ['most frequent'],
    definition:
      'The mode is whichever value shows up most often in your data — no addition, no sorting-for-a-midpoint, just a tally. It works by counting how many times each distinct value occurs and reporting the winner, which is why it is the only "average" that always equals an actual observed value (the mean and median can land on a number nothing in your data equals). That also makes it the right tool for data where "add them up and divide" is meaningless — categories, labels, and small integer counts (like dice faces or survey answers) — rather than continuous measurements like height or time, where almost no two values ever repeat exactly.',
    whenToUse:
      'Use it for categorical or count data where "average" doesn\'t make sense — e.g. the most common survey answer or dice result.',
    formula: 'mode = value v that maximizes count(v)',
    formulaBreakdown: [
      { term: 'count(v)', meaning: 'how many times a specific value v appears in the dataset — tally every distinct roll.' },
      { term: 'maximizes', meaning: 'pick whichever value\'s tally is the largest; that value (not its count) is the mode.' },
    ],
    datasetCsv: `roll_number,value
1,3
2,5
3,2
4,5
5,6
6,5
7,1
8,4
9,5
10,2`,
    code: `import csv
import io
from collections import Counter
from scipy import stats

csv_text = """roll_number,value
1,3
2,5
3,2
4,5
5,6
6,5
7,1
8,4
9,5
10,2"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
rolls = [int(r["value"]) for r in rows]

counts = Counter(rolls)
print("counts per value:")
for value in sorted(counts):
    print(f"  {value}: {counts[value]}")

most_common_value, most_common_count = counts.most_common(1)[0]
print(f"most common = {most_common_value} (appeared {most_common_count} times)")

# check: scipy agrees
m = stats.mode(rolls, keepdims=True)
print(f"check: scipy.stats.mode -> {m.mode[0]} (count {m.count[0]})")`,
    datasetNote: 'Ten recorded dice rolls from a fairness test.',
    output:
      'counts per value:\n' +
      '  1: 1\n' +
      '  2: 2\n' +
      '  3: 1\n' +
      '  4: 1\n' +
      '  5: 4\n' +
      '  6: 1\n' +
      'most common = 5 (appeared 4 times)\n' +
      'check: scipy.stats.mode -> 5 (count 4)',
    caveat:
      "Mode can be misleading with continuous measurements (like plant heights in cm) where few values ever repeat exactly — it's most useful for counts and categories.",
  },
  {
    id: 'std-dev',
    title: 'Standard deviation',
    category: 'descriptive',
    aliases: ['sd', 'spread'],
    definition:
      'Standard deviation measures how spread out your measurements typically are around the mean, in the SAME units as your original data (cm, ms, whatever you measured) — a small SD means most points sit close to the mean, a large SD means they are scattered widely. The calculation gets there in a specific sequence for a reason: first measure how far each point sits from the mean (its "deviation"), then square each of those distances so that a point 2 cm too high and a point 2 cm too low don\'t cancel each other out to zero when added together, then average the squared distances, then take the square root at the very end to undo the squaring and land back in the original units (cm, not cm²). Report it whenever you report a mean, since the mean alone can\'t tell a reader whether your measurements were tightly clustered or wildly inconsistent.',
    whenToUse:
      "Report it alongside your mean so a reader knows how consistent your measurements were (e.g. plant heights that don't vary much vs. ones all over the place).",
    formula: 's = √( Σ(xᵢ − x̄)² / (n − 1) )',
    formulaBreakdown: [
      { term: 'xᵢ − x̄', meaning: 'each measurement\'s "deviation" — how far that single point sits from the mean you already computed.' },
      { term: '( … )²', meaning: 'square every deviation — this makes them all positive so a too-high point and a too-low point add up instead of canceling, and it also weights bigger deviations more heavily.' },
      { term: 'Σ', meaning: 'add up all those squared deviations across every measurement.' },
      { term: 'n − 1', meaning: 'divide by one less than the sample size, not n — using n−1 (Bessel\'s correction) corrects for the fact that the mean you subtracted was itself ESTIMATED from this same data, which would otherwise make the spread look artificially small.' },
      { term: '√', meaning: 'take the square root at the end to undo the earlier squaring and return to the original units (cm, not cm²) — this final number is the standard deviation, s.' },
    ],
    datasetCsv: `height_cm
14.2
15.8
13.9
16.1
15.0
14.7
15.5`,
    code: `import csv
import io
import numpy as np

csv_text = """height_cm
14.2
15.8
13.9
16.1
15.0
14.7
15.5"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
heights = [float(r["height_cm"]) for r in rows]

n = len(heights)
mean = sum(heights) / n
print(f"mean = {mean:.2f} cm")

deviations = [x - mean for x in heights]
print(f"deviations from mean: {[round(d, 2) for d in deviations]}")

squared = [d**2 for d in deviations]
print(f"squared deviations: {[round(s, 4) for s in squared]}")

sum_squares = sum(squared)
print(f"sum of squared deviations = {sum_squares:.4f}")

variance = sum_squares / (n - 1)   # ddof=1 -> SAMPLE variance
print(f"sample variance = {sum_squares:.4f} / ({n}-1) = {variance:.4f} cm^2")

sd = variance ** 0.5
print(f"sample SD = sqrt({variance:.4f}) = {sd:.2f} cm")

# check: numpy agrees
print(f"check: np.std(heights, ddof=1) = {np.std(heights, ddof=1):.2f} cm")`,
    datasetNote: 'The same seven plant-height measurements (cm) used in the Mean example.',
    output:
      'mean = 15.03 cm\n' +
      'deviations from mean: [-0.83, 0.77, -1.13, 1.07, -0.03, -0.33, 0.47]\n' +
      'squared deviations: [0.6865, 0.5951, 1.2737, 1.148, 0.0008, 0.108, 0.2222]\n' +
      'sum of squared deviations = 4.0343\n' +
      'sample variance = 4.0343 / (7-1) = 0.6724 cm^2\n' +
      'sample SD = sqrt(0.6724) = 0.82 cm\n' +
      'check: np.std(heights, ddof=1) = 0.82 cm',
    caveat:
      'Always pass `ddof=1` for a small measured sample (the "sample" SD) — numpy\'s default `ddof=0` computes the "population" SD, which underestimates spread for real experiments.',
  },
  {
    id: 'variance',
    title: 'Variance',
    category: 'descriptive',
    aliases: ['sd squared'],
    definition:
      'Variance is the same "average squared distance from the mean" calculation as standard deviation, just stopped one step early — you get variance the instant you divide the sum of squared deviations by n−1, and you get standard deviation only after also taking the square root of that number. Because the square root is skipped, variance\'s units are always squared (cm² for heights measured in cm), which is why it rarely gets reported directly to a human reader — nobody has good intuition for "0.67 square centimeters" of spread. Its real job is as a building block: ANOVA\'s F-statistic, for instance, is a ratio of two variances, and it is far cleaner to build tests out of variances (which add together nicely) than out of standard deviations (which don\'t).',
    whenToUse:
      'You rarely report variance directly (its units are squared, e.g. cm²), but it is the building block ANOVA and other tests use under the hood.',
    formula: 's² = Σ(xᵢ − x̄)² / (n − 1)',
    formulaBreakdown: [
      { term: 'xᵢ − x̄', meaning: 'each measurement\'s deviation from the mean, same as in the standard-deviation formula.' },
      { term: '( … )²  and  Σ', meaning: 'square every deviation (so they can\'t cancel out) and add them all up.' },
      { term: 'n − 1', meaning: 'divide by one less than the sample size, for the same Bessel\'s-correction reason as standard deviation.' },
      { term: 's²', meaning: 'the result IS the variance — standard deviation is just this number\'s square root, s = √(s²), which is the only extra step that separates the two concepts.' },
    ],
    datasetCsv: `height_cm
14.2
15.8
13.9
16.1
15.0
14.7
15.5`,
    code: `import csv
import io
import numpy as np

csv_text = """height_cm
14.2
15.8
13.9
16.1
15.0
14.7
15.5"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
heights = [float(r["height_cm"]) for r in rows]

n = len(heights)
mean = sum(heights) / n
squared_deviations = [(x - mean) ** 2 for x in heights]
sum_squares = sum(squared_deviations)
print(f"sum of squared deviations = {sum_squares:.4f}")

variance = sum_squares / (n - 1)
print(f"sample variance = {sum_squares:.4f} / ({n}-1) = {variance:.4f} cm^2")

sd = variance ** 0.5
print(f"SD = sqrt(variance) = {sd:.4f} cm, so SD^2 = {sd**2:.4f} cm^2 (matches variance)")

# check: numpy agrees
print(f"check: np.var(heights, ddof=1) = {np.var(heights, ddof=1):.4f} cm^2")`,
    datasetNote: 'The same plant-height measurements (cm) as the Standard deviation example — showing variance is just SD².',
    output:
      'sum of squared deviations = 4.0343\n' +
      'sample variance = 4.0343 / (7-1) = 0.6724 cm^2\n' +
      'SD = sqrt(variance) = 0.8200 cm, so SD^2 = 0.6724 cm^2 (matches variance)\n' +
      'check: np.var(heights, ddof=1) = 0.6724 cm^2',
    caveat:
      "Variance's units are squared, which makes it hard to interpret directly — that's exactly why we take its square root (the standard deviation) to report spread in the original units.",
  },
  {
    id: 'sem',
    title: 'Standard error of the mean (SEM)',
    category: 'descriptive',
    aliases: ['standard error'],
    definition:
      "SEM answers a different question than SD does: not \"how spread out are my individual measurements?\" but \"if I repeated this whole experiment many times, how much would the MEAN itself bounce around from one repetition to the next?\" It is built by taking the same SD you already computed and shrinking it by dividing by the square root of your sample size — the intuition is that averaging more numbers together smooths out noise, so a mean built from many trials is a more stable, less bouncy estimate than a mean built from just a few. That is why SEM keeps getting smaller the more data you collect (even if SD, the underlying spread of individual measurements, stays exactly the same), and it is the number you want on error bars whenever the message is \"how precisely do I know this group's average?\" rather than \"how variable were the raw measurements?\"",
    whenToUse:
      "Use SEM (not SD) for error bars on a bar chart of group means — it answers \"how precise is my estimate of the mean?\", which is what a reader comparing group means cares about.",
    formula: 'SEM = s / √n',
    formulaBreakdown: [
      { term: 's', meaning: 'the sample standard deviation you already computed — how spread out the individual measurements are.' },
      { term: '√n', meaning: 'the square root of the sample size — dividing by this shrinks SEM as n grows, because averaging more measurements together produces a more stable mean.' },
      { term: 'SEM', meaning: 'an estimate of how much the sample MEAN would vary if you re-ran the whole experiment — always smaller than s itself (for n>1), and never to be confused with it.' },
    ],
    datasetCsv: `trial,reaction_time_ms
1,210
2,225
3,198
4,205
5,232
6,215
7,220`,
    code: `import csv
import io
from scipy import stats

csv_text = """trial,reaction_time_ms
1,210
2,225
3,198
4,205
5,232
6,215
7,220"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
times = [float(r["reaction_time_ms"]) for r in rows]

n = len(times)
mean = sum(times) / n
print(f"mean = {mean:.1f} ms")

sum_squares = sum((x - mean) ** 2 for x in times)
sd = (sum_squares / (n - 1)) ** 0.5
print(f"sample SD = {sd:.2f} ms")

sem = sd / (n ** 0.5)
print(f"SEM = SD / sqrt(n) = {sd:.2f} / sqrt({n}) = {sem:.2f} ms")

# check: scipy agrees
print(f"check: scipy.stats.sem = {stats.sem(times):.2f} ms")`,
    datasetNote: 'Seven reaction-time trials (ms) from one condition.',
    output:
      'mean = 215.0 ms\n' +
      'sample SD = 11.75 ms\n' +
      'SEM = SD / sqrt(n) = 11.75 / sqrt(7) = 4.44 ms\n' +
      'check: scipy.stats.sem = 4.44 ms',
    caveat:
      'SEM = SD / sqrt(n), so it is always smaller than SD and keeps shrinking with more trials — do not confuse "the mean is precise" (small SEM) with "individual measurements are consistent" (small SD).',
  },
  {
    id: 'iqr-outliers',
    title: 'IQR & outlier detection (1.5×IQR rule)',
    category: 'descriptive',
    aliases: ['interquartile range', 'outliers', 'fences'],
    definition:
      'Quartiles split your sorted data into quarters: Q1 is the value 25% of the way through (a quarter of your points are smaller), and Q3 is the value 75% of the way through. The interquartile range (IQR = Q3 − Q1) is the width of the middle half of your data — a number that, unlike SD, is not thrown off by extreme values, because it is built entirely from positions in the sorted list rather than distances from the mean. The 1.5×IQR rule then draws two "fences" a further one-and-a-half IQRs beyond Q1 and Q3; anything outside those fences sits far enough past the typical middle-50% spread that it is worth a second look. It is a purely descriptive flag, not a statistical test — the right next step is to go find out WHY that point looks unusual before deciding whether to keep or exclude it.',
    whenToUse:
      'Use it before you compute a mean/SD, to decide whether a weird-looking trial should be investigated (or excluded, with justification) rather than silently skewing your results.',
    formula: 'IQR = Q3 − Q1  ·  fences = [ Q1 − 1.5·IQR, Q3 + 1.5·IQR ]',
    formulaBreakdown: [
      { term: 'Q1', meaning: 'the 25th-percentile value — sort your data, then find the point a quarter of the way through.' },
      { term: 'Q3', meaning: 'the 75th-percentile value — the point three-quarters of the way through the sorted data.' },
      { term: 'IQR = Q3 − Q1', meaning: 'the width of the middle 50% of your data — how spread out the "typical" values are, ignoring the tails entirely.' },
      { term: '1.5·IQR', meaning: 'a widely used multiplier (not derived from your data — it\'s a convention) that defines how far past Q1/Q3 counts as "unusually far."' },
      { term: 'fences', meaning: 'the two boundary values — anything measured below the lower fence or above the upper fence is flagged as a likely outlier.' },
    ],
    datasetCsv: `trial,reaction_time_ms
1,210
2,198
3,225
4,205
5,800
6,215
7,220
8,230
9,195
10,208`,
    code: `import csv
import io
import numpy as np

csv_text = """trial,reaction_time_ms
1,210
2,198
3,225
4,205
5,800
6,215
7,220
8,230
9,195
10,208"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
times = [float(r["reaction_time_ms"]) for r in rows]

sorted_times = sorted(times)
n = len(sorted_times)
print(f"sorted: {sorted_times}")


def percentile(sorted_vals, pct):
    # linear-interpolation method (numpy's default) on a 0-based rank
    rank = (pct / 100) * (len(sorted_vals) - 1)
    lo = int(rank)
    frac = rank - lo
    if lo + 1 < len(sorted_vals):
        return sorted_vals[lo] + frac * (sorted_vals[lo + 1] - sorted_vals[lo])
    return sorted_vals[lo]


q1 = percentile(sorted_times, 25)
q3 = percentile(sorted_times, 75)
print(f"Q1 (25th percentile) = {q1:.1f}")
print(f"Q3 (75th percentile) = {q3:.1f}")

iqr = q3 - q1
print(f"IQR = Q3 - Q1 = {q3:.1f} - {q1:.1f} = {iqr:.1f}")

lower_fence = q1 - 1.5 * iqr
upper_fence = q3 + 1.5 * iqr
print(f"fences = [Q1 - 1.5*IQR, Q3 + 1.5*IQR] = [{lower_fence:.1f}, {upper_fence:.1f}]")

outliers = [t for t in times if t < lower_fence or t > upper_fence]
print(f"outliers (outside fences): {outliers}")

# check: numpy agrees
nq1, nq3 = np.percentile(times, [25, 75])
print(f"check: np.percentile -> Q1={nq1:.1f}, Q3={nq3:.1f}")`,
    datasetNote: 'Ten reaction-time trials (ms) where one trial (800 ms) is far outside the rest.',
    output:
      'sorted: [195.0, 198.0, 205.0, 208.0, 210.0, 215.0, 220.0, 225.0, 230.0, 800.0]\n' +
      'Q1 (25th percentile) = 205.8\n' +
      'Q3 (75th percentile) = 223.8\n' +
      'IQR = Q3 - Q1 = 223.8 - 205.8 = 18.0\n' +
      'fences = [Q1 - 1.5*IQR, Q3 + 1.5*IQR] = [178.8, 250.8]\n' +
      'outliers (outside fences): [800.0]\n' +
      'check: np.percentile -> Q1=205.8, Q3=223.8',
    caveat:
      'Flagging an outlier is not the same as deleting it — decide (and write down in your log) WHY a point is invalid (e.g. equipment glitch) before excluding it; "it made my results messier" is not a valid reason.',
  },
  {
    id: 'error-bars',
    title: 'Error bars (mean ± SEM)',
    category: 'descriptive',
    aliases: ['errorbar', 'whiskers'],
    definition:
      'Error bars are the little "whiskers" that extend up and down from each bar or point on a chart, and what they actually show is just addition and subtraction: take the group\'s mean, then draw a mark one SEM above it and one SEM below it. There is no new calculation here beyond the mean and SEM you already know how to compute — error bars are simply those two numbers turned into a picture, so a reader can see at a glance how precisely each group\'s mean is known without reading exact numbers off an axis. When two groups\' error-bar ranges don\'t overlap at all, that\'s a visual (not statistical) hint the means might genuinely differ; when they overlap a lot, a real difference is less likely, but a proper significance test (a t-test) is still the only way to know for sure.',
    whenToUse:
      "Add them whenever you plot group means side by side, so a viewer can judge at a glance whether two groups' error bars overlap (a rough visual clue about whether the difference might be real).",
    formula: 'bar range = x̄ ± SEM   (i.e. [ x̄ − SEM, x̄ + SEM ])',
    formulaBreakdown: [
      { term: 'x̄', meaning: 'the group\'s mean — the center point the bar/marker is drawn at.' },
      { term: 'SEM', meaning: 'the standard error of the mean for that same group, computed exactly as in the SEM entry (s / √n).' },
      { term: '±', meaning: 'draw the whisker from one SEM below the mean to one SEM above it — a plain addition/subtraction, not a new formula.' },
    ],
    datasetCsv: `group,height_cm
control,14.2
control,15.8
control,13.9
control,16.1
control,15.0
treated,18.4
treated,19.1
treated,17.8
treated,20.0
treated,18.9`,
    code: `import csv
import io
from scipy import stats
import matplotlib.pyplot as plt

csv_text = """group,height_cm
control,14.2
control,15.8
control,13.9
control,16.1
control,15.0
treated,18.4
treated,19.1
treated,17.8
treated,20.0
treated,18.9"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
control = [float(r["height_cm"]) for r in rows if r["group"] == "control"]
treated = [float(r["height_cm"]) for r in rows if r["group"] == "treated"]


def mean_and_sem(values):
    n = len(values)
    mean = sum(values) / n
    sum_sq = sum((x - mean) ** 2 for x in values)
    sd = (sum_sq / (n - 1)) ** 0.5
    sem = sd / (n ** 0.5)
    return mean, sem


control_mean, control_sem = mean_and_sem(control)
treated_mean, treated_sem = mean_and_sem(treated)
print(f"Control: mean = {control_mean:.2f}, SEM = {control_sem:.2f}")
print(f"Treated: mean = {treated_mean:.2f}, SEM = {treated_sem:.2f}")

plt.bar(["Control", "Treated"], [control_mean, treated_mean],
        yerr=[control_sem, treated_sem], capsize=6, color=["#90CDF4", "#F5C518"])
plt.ylabel("Plant height (cm)")
plt.title("Mean plant height +/- SEM")
plt.savefig("height_errorbars.png")

# check: scipy.stats.sem agrees with the hand-rolled SEM
print(f"check: scipy.stats.sem -> control={stats.sem(control):.2f}, treated={stats.sem(treated):.2f}")`,
    datasetNote: 'Two groups of five plant-height measurements each (cm): control vs. treated.',
    output:
      'Control: mean = 15.00, SEM = 0.43\n' +
      'Treated: mean = 18.84, SEM = 0.37\n' +
      'check: scipy.stats.sem -> control=0.43, treated=0.37',
    caveat:
      'Non-overlapping error bars are a helpful visual hint but are NOT a formal significance test — run a real t-test (see P-value / t-test) before claiming the groups differ.',
  },

  // ─── Category B — Comparing groups ───────────────────────────────────────
  {
    id: 'p-value',
    title: 'P-value (statistical significance)',
    category: 'comparing-groups',
    aliases: ['significance', 'hypothesis test', 'statistically significant'],
    definition:
      'The p-value answers a specific, slightly backwards-sounding question: IF there were truly no real difference between your groups, how often would random noise alone produce a gap between their means at least this large? Getting there requires converting your raw difference in means into a standardized "how many standard errors apart are these?" number (the t-statistic), because a 4 cm gap is huge if your measurements are normally within 0.1 cm of each other but unremarkable if they routinely vary by 5 cm — the t-statistic puts every comparison on the same scale. That t-statistic is then converted into a probability by asking "how much of the range of t-statistics you\'d see across many repeated no-real-difference experiments lies beyond this value?" — which is exactly what the p-value measures. A small p-value means your observed gap would be a rare coincidence under "no real difference," which is evidence (not proof) that a real difference exists.',
    whenToUse:
      'Use it whenever you compare two groups\' measurements (e.g. treated vs. control plant height) and want to know if the difference is likely real or could just be random noise. A common cutoff is p < 0.05.',
    formula: 't = (x̄₁ − x̄₂) / SE   ·   p = 2·P(T > |t|)',
    formulaBreakdown: [
      { term: 'x̄₁ − x̄₂', meaning: 'the raw difference between the two group means — treated minus control, in the original units.' },
      { term: 'SE', meaning: 'the pooled standard error of that difference — built from both groups\' variances and sample sizes, it answers "how much would this difference bounce around by chance alone?"' },
      { term: 't', meaning: 'the raw difference expressed in "how many standard errors" units — a standardized effect size that lets very different experiments be compared on the same scale.' },
      { term: 'P(T > |t|)', meaning: 'the probability, under the t-distribution for this many degrees of freedom, of a t-statistic at least this extreme happening by chance — read off the distribution\'s tail, not computed by simple arithmetic.' },
      { term: '2·', meaning: 'doubles the one-sided tail probability into a two-tailed p-value, since "at least this different" includes both a treated-higher AND a treated-lower result.' },
    ],
    datasetCsv: `group,height_cm
control,14.2
control,15.8
control,13.9
control,16.1
control,15.0
control,14.7
treated,18.4
treated,19.1
treated,17.8
treated,20.0
treated,18.9
treated,19.4`,
    code: `import csv
import io
from scipy import stats

csv_text = """group,height_cm
control,14.2
control,15.8
control,13.9
control,16.1
control,15.0
control,14.7
treated,18.4
treated,19.1
treated,17.8
treated,20.0
treated,18.9
treated,19.4"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
control = [float(r["height_cm"]) for r in rows if r["group"] == "control"]
treated = [float(r["height_cm"]) for r in rows if r["group"] == "treated"]

n1, n2 = len(control), len(treated)
mean1 = sum(control) / n1
mean2 = sum(treated) / n2
print(f"Control mean = {mean1:.2f} cm (n={n1}), Treated mean = {mean2:.2f} cm (n={n2})")

var1 = sum((x - mean1) ** 2 for x in control) / (n1 - 1)
var2 = sum((x - mean2) ** 2 for x in treated) / (n2 - 1)
print(f"Control variance = {var1:.4f}, Treated variance = {var2:.4f}")

pooled_var = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2)
pooled_se = (pooled_var * (1 / n1 + 1 / n2)) ** 0.5
print(f"pooled variance = {pooled_var:.4f}, pooled SE of the difference = {pooled_se:.4f}")

t_stat = (mean2 - mean1) / pooled_se
df = n1 + n2 - 2
print(f"t = (mean2 - mean1) / pooled SE = ({mean2:.2f} - {mean1:.2f}) / {pooled_se:.4f} = {t_stat:.2f}")
print(f"df = n1 + n2 - 2 = {df}")

# The tail area under the t-distribution for this t and df isn't something you
# compute by hand -- scipy looks it up for us.
p_value = stats.t.sf(abs(t_stat), df) * 2  # two-tailed
print(f"p = 2 * P(T > |t|) via scipy's t-distribution lookup = {p_value:.2e}")

# check: scipy's own ttest_ind agrees with our hand-computed t and p
t_check, p_check = stats.ttest_ind(treated, control)
print(f"check: scipy.stats.ttest_ind -> t={t_check:.2f}, p={p_check:.2e}")`,
    datasetNote: 'Two groups of six plant-height measurements (cm): control vs. a growth treatment.',
    output:
      'Control mean = 14.95 cm (n=6), Treated mean = 18.93 cm (n=6)\n' +
      'Control variance = 0.7550, Treated variance = 0.5907\n' +
      'pooled variance = 0.6728, pooled SE of the difference = 0.4736\n' +
      't = (mean2 - mean1) / pooled SE = (18.93 - 14.95) / 0.4736 = 8.41\n' +
      'df = n1 + n2 - 2 = 10\n' +
      'p = 2 * P(T > |t|) via scipy\'s t-distribution lookup = 7.57e-06\n' +
      'check: scipy.stats.ttest_ind -> t=8.41, p=7.57e-06',
    caveat:
      'p < 0.05 means "unlikely to be chance," NOT "the treatment definitely works" and NOT "the effect is large" — always report the actual difference in means (or Cohen\'s d) alongside the p-value.',
  },
  {
    id: 't-test',
    title: 'Independent-samples t-test (t-statistic + p)',
    category: 'comparing-groups',
    aliases: ['ttest_ind', 'two-sample t-test'],
    definition:
      "A t-test compares the means of two independent groups (different plants, different subjects — nobody is measured twice) and boils that comparison down to two numbers: the t-statistic, which is how many standard errors apart the two means are, and the p-value derived from it. Getting the standard error right is the subtle part of the whole calculation: rather than using either group's spread alone, you POOL both groups' variances into one combined estimate (weighted by how many measurements each group contributed), because both groups are assumed to share the same underlying variability and pooling gives a more reliable estimate of it than either group could alone. That pooled standard error is what makes the raw difference in means (e.g. 3.15 cm) comparable across completely different experiments — a 3.15 cm gap is a massive t-statistic if plants barely vary and an unremarkable one if plants routinely differ by 5 cm.",
    whenToUse:
      'Use it to compare exactly two groups measured on different subjects/plants/trials (e.g. control vs. fertilizer) — for 3+ groups use ANOVA instead.',
    formula: 't = (x̄₂ − x̄₁) / SE_pooled   where SE_pooled = √( s²_pooled · (1/n₁ + 1/n₂) )',
    formulaBreakdown: [
      { term: 'x̄₂ − x̄₁', meaning: 'the raw difference between the two group means (fertilizer minus control here).' },
      { term: 's²_pooled', meaning: 'both groups\' variances combined into one weighted-average variance estimate — a single "how noisy is a measurement in this experiment" number shared by both groups.' },
      { term: '1/n₁ + 1/n₂', meaning: 'accounts for both sample sizes — smaller groups contribute more uncertainty to the standard error of the difference.' },
      { term: 'SE_pooled', meaning: 'the standard error of the DIFFERENCE between the two means — the denominator that turns a raw gap into a standardized t-statistic.' },
      { term: 't, df, p', meaning: 'the same three quantities as the P-value entry: t is the standardized gap, df = n₁+n₂−2 sets the shape of the reference distribution, and p is the resulting two-tailed tail probability (via scipy\'s lookup).' },
    ],
    datasetCsv: `group,height_cm
control,12.1
control,13.4
control,11.8
control,12.9
control,13.0
control,12.5
fertilizer,15.6
fertilizer,16.2
fertilizer,14.9
fertilizer,16.8
fertilizer,15.1
fertilizer,16.0`,
    code: `import csv
import io
from scipy import stats

csv_text = """group,height_cm
control,12.1
control,13.4
control,11.8
control,12.9
control,13.0
control,12.5
fertilizer,15.6
fertilizer,16.2
fertilizer,14.9
fertilizer,16.8
fertilizer,15.1
fertilizer,16.0"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
control = [float(r["height_cm"]) for r in rows if r["group"] == "control"]
fertilizer = [float(r["height_cm"]) for r in rows if r["group"] == "fertilizer"]

n1, n2 = len(control), len(fertilizer)
mean1 = sum(control) / n1
mean2 = sum(fertilizer) / n2
print(f"Control mean = {mean1:.2f} cm (n={n1}), Fertilizer mean = {mean2:.2f} cm (n={n2})")

var1 = sum((x - mean1) ** 2 for x in control) / (n1 - 1)
var2 = sum((x - mean2) ** 2 for x in fertilizer) / (n2 - 1)
pooled_var = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2)
pooled_se = (pooled_var * (1 / n1 + 1 / n2)) ** 0.5
print(f"pooled variance = {pooled_var:.4f}, pooled SE = {pooled_se:.4f}")

t_stat = (mean2 - mean1) / pooled_se
df = n1 + n2 - 2
print(f"t = ({mean2:.2f} - {mean1:.2f}) / {pooled_se:.4f} = {t_stat:.2f}, df = {df}")

# scipy looks up the tail area under the t distribution for this t and df
p_value = stats.t.sf(abs(t_stat), df) * 2
print(f"p (two-tailed, via scipy's t lookup) = {p_value:.2e}")

# check: scipy's ttest_ind agrees
t_check, p_check = stats.ttest_ind(fertilizer, control)
print(f"check: scipy.stats.ttest_ind -> t={t_check:.2f}, p={p_check:.2e}")`,
    datasetNote: 'Two groups of six plant-height measurements (cm) at day 21: no fertilizer vs. fertilizer.',
    output:
      'Control mean = 12.62 cm (n=6), Fertilizer mean = 15.77 cm (n=6)\n' +
      'pooled variance = 0.4322, pooled SE = 0.3795\n' +
      't = (15.77 - 12.62) / 0.3795 = 8.30, df = 10\n' +
      "p (two-tailed, via scipy's t lookup) = 8.52e-06\n" +
      'check: scipy.stats.ttest_ind -> t=8.30, p=8.52e-06',
    caveat:
      "`ttest_ind` assumes the two groups' variances are roughly equal by default (Welch's correction via `equal_var=False` relaxes this) — with very different group sizes or spreads, prefer Welch's t-test.",
  },
  {
    id: 'paired-t-test',
    title: 'Paired t-test (before/after)',
    category: 'comparing-groups',
    aliases: ['ttest_rel', 'repeated measures'],
    definition:
      'A paired t-test compares two measurements taken on the SAME subjects (e.g. before vs. after a treatment) by first collapsing each subject\'s pair of numbers into a single number — the within-subject change — and then running the ordinary one-sample logic on that list of changes: is their average meaningfully different from zero? This is a genuinely different, and usually more powerful, calculation than an independent t-test, because it never has to deal with how much subjects differ from EACH OTHER (subject A might just run naturally faster than subject B) — it only cares how much each subject changed relative to themselves, which cancels out all of that between-subject variability. Use it any time the same unit — the same subject, plant, or sample — contributes both the "before" and "after" measurement, rather than comparing two separate groups of different units.',
    whenToUse:
      'Use it when the same person/plant/sample is measured twice (before/after), instead of an independent t-test, because it accounts for each subject being its own control.',
    formula: 't = d̄ / SE_d   where dᵢ = before-i − after-i,  d̄ = mean(dᵢ),  SE_d = s_d / √n',
    formulaBreakdown: [
      { term: 'dᵢ = before-i − after-i', meaning: 'the per-subject change — collapse each subject\'s two measurements into one number before doing anything else.' },
      { term: 'd̄', meaning: 'the mean of all those per-subject differences — is the average change positive, negative, or roughly zero?' },
      { term: 's_d', meaning: 'the standard deviation OF THE DIFFERENCES (not of the raw before/after values) — how much the amount of change varies from subject to subject.' },
      { term: 'SE_d = s_d / √n', meaning: 'the standard error of that mean difference, built exactly like SEM but applied to the differences rather than to raw measurements.' },
      { term: 't = d̄ / SE_d', meaning: 'the mean change expressed in "how many standard errors from zero" units — large |t| means the change is unlikely to be pure noise around zero.' },
    ],
    datasetCsv: `subject,before_ms,after_ms
1,420,390
2,455,430
3,405,380
4,470,445
5,440,410
6,460,425
7,435,400`,
    code: `import csv
import io
from scipy import stats

csv_text = """subject,before_ms,after_ms
1,420,390
2,455,430
3,405,380
4,470,445
5,440,410
6,460,425
7,435,400"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
before = [float(r["before_ms"]) for r in rows]
after = [float(r["after_ms"]) for r in rows]

n = len(before)
mean_before = sum(before) / n
mean_after = sum(after) / n
print(f"Mean before = {mean_before:.1f} ms, Mean after = {mean_after:.1f} ms")

diffs = [b - a for b, a in zip(before, after)]
print(f"per-subject differences (before - after): {diffs}")

mean_diff = sum(diffs) / n
print(f"mean difference = {mean_diff:.1f} ms")

sum_sq = sum((d - mean_diff) ** 2 for d in diffs)
sd_diff = (sum_sq / (n - 1)) ** 0.5
sem_diff = sd_diff / (n ** 0.5)
print(f"SD of differences = {sd_diff:.2f} ms, SEM of differences = {sem_diff:.2f} ms")

t_stat = mean_diff / sem_diff
df = n - 1
print(f"t = mean_diff / SEM_diff = {mean_diff:.1f} / {sem_diff:.2f} = {t_stat:.2f}, df = {df}")

# scipy looks up the tail area under the t distribution for this t and df
p_value = stats.t.sf(abs(t_stat), df) * 2
print(f"p (two-tailed, via scipy's t lookup) = {p_value:.2e}")

# check: scipy's ttest_rel agrees
t_check, p_check = stats.ttest_rel(before, after)
print(f"check: scipy.stats.ttest_rel -> t={t_check:.2f}, p={p_check:.2e}")`,
    datasetNote: 'Reaction-time trials (ms) for seven subjects, each measured twice: before and after caffeine.',
    output:
      'Mean before = 440.7 ms, Mean after = 411.4 ms\n' +
      'per-subject differences (before - after): [30.0, 25.0, 25.0, 25.0, 30.0, 35.0, 35.0]\n' +
      'mean difference = 29.3 ms\n' +
      'SD of differences = 4.50 ms, SEM of differences = 1.70 ms\n' +
      't = mean_diff / SEM_diff = 29.3 / 1.70 = 17.22, df = 6\n' +
      "p (two-tailed, via scipy's t lookup) = 2.45e-06\n" +
      'check: scipy.stats.ttest_rel -> t=17.22, p=2.45e-06',
    caveat:
      "Only use the paired test when the two columns are genuinely matched (same subject, same row) — pairing mismatched rows (or using ttest_rel on two independent groups) gives a meaningless result.",
  },
  {
    id: 'anova',
    title: 'One-way ANOVA (3+ groups)',
    category: 'comparing-groups',
    aliases: ['f_oneway', 'analysis of variance'],
    definition:
      "ANOVA answers \"are these 3+ group means all equal?\" with a single test, by comparing two different ways of measuring variation and taking their ratio. First it computes how much the group MEANS differ from the overall grand mean (variation \"between\" groups) — if the light colors truly don't matter, this should be small. Then it separately computes how much individual plants vary around their OWN group's mean (variation \"within\" groups) — this is just background noise/measurement variability that exists no matter what. If between-group variation is large relative to within-group noise, the ratio (the F-statistic) comes out large, which is evidence the groups really do differ; if between-group variation is comparable to ordinary within-group noise, F stays close to 1 and there's no evidence of a real difference. This single F-test protects you from running many separate pairwise t-tests, each of which has its own small chance of a false alarm that compounds the more comparisons you run.",
    whenToUse:
      "Use it when you have 3+ groups (e.g. plants under red, blue, and green light) instead of running many separate t-tests, which would inflate your false-positive risk.",
    formula: 'F = MS_between / MS_within   where MS = SS / df',
    formulaBreakdown: [
      { term: 'SS_between', meaning: 'sum, across all groups, of (each group\'s mean − the grand mean)² weighted by group size — how far the group averages spread apart from the overall average.' },
      { term: 'SS_within', meaning: 'sum, across every single plant, of (that plant\'s value − its OWN group\'s mean)² — the ordinary noise that exists inside each group regardless of the treatment.' },
      { term: 'MS_between = SS_between / (k−1)', meaning: 'between-group variation converted to a per-degree-of-freedom average, where k is the number of groups.' },
      { term: 'MS_within = SS_within / (n−k)', meaning: 'within-group variation converted to a per-degree-of-freedom average, where n is the total number of measurements.' },
      { term: 'F', meaning: 'the ratio of the two — large F means the groups differ more than ordinary noise would explain; scipy then looks up the tail probability under the F-distribution to get the p-value.' },
    ],
    datasetCsv: `light_color,height_cm
red,12.4
red,13.1
red,11.9
red,12.7
red,13.0
blue,15.2
blue,16.0
blue,14.8
blue,15.6
blue,15.9
green,10.8
green,11.4
green,10.2
green,11.0
green,10.6`,
    code: `import csv
import io
from scipy import stats

csv_text = """light_color,height_cm
red,12.4
red,13.1
red,11.9
red,12.7
red,13.0
blue,15.2
blue,16.0
blue,14.8
blue,15.6
blue,15.9
green,10.8
green,11.4
green,10.2
green,11.0
green,10.6"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
groups = {"red": [], "blue": [], "green": []}
for r in rows:
    groups[r["light_color"]].append(float(r["height_cm"]))

all_values = [v for g in groups.values() for v in g]
n_total = len(all_values)
grand_mean = sum(all_values) / n_total
print(f"grand mean (all 15 plants) = {grand_mean:.2f} cm")

group_means = {name: sum(vals) / len(vals) for name, vals in groups.items()}
for name, m in group_means.items():
    print(f"  {name} mean = {m:.2f} cm (n={len(groups[name])})")

# Between-groups sum of squares: how far each group's mean is from the grand mean
ss_between = sum(len(vals) * (group_means[name] - grand_mean) ** 2 for name, vals in groups.items())
k = len(groups)
df_between = k - 1
print(f"SS_between = {ss_between:.4f}, df_between = k - 1 = {df_between}")

# Within-groups sum of squares: spread of each plant around its OWN group's mean
ss_within = sum((x - group_means[name]) ** 2 for name, vals in groups.items() for x in vals)
df_within = n_total - k
print(f"SS_within = {ss_within:.4f}, df_within = n - k = {df_within}")

ms_between = ss_between / df_between
ms_within = ss_within / df_within
f_stat = ms_between / ms_within
print(f"MS_between = {ms_between:.4f}, MS_within = {ms_within:.4f}")
print(f"F = MS_between / MS_within = {f_stat:.2f}")

# scipy looks up the tail area under the F distribution for this F, df_between, df_within
p_value = stats.f.sf(f_stat, df_between, df_within)
print(f"p (via scipy's F-distribution lookup) = {p_value:.2e}")

# check: scipy's f_oneway agrees
f_check, p_check = stats.f_oneway(groups["red"], groups["blue"], groups["green"])
print(f"check: scipy.stats.f_oneway -> F={f_check:.2f}, p={p_check:.2e}")`,
    datasetNote: 'Three groups of five plant-height measurements (cm), one group per light color.',
    output:
      'grand mean (all 15 plants) = 12.97 cm\n' +
      '  red mean = 12.62 cm (n=5)\n' +
      '  blue mean = 15.50 cm (n=5)\n' +
      '  green mean = 10.80 cm (n=5)\n' +
      'SS_between = 56.1613, df_between = k - 1 = 2\n' +
      'SS_within = 2.7480, df_within = n - k = 12\n' +
      'MS_between = 28.0807, MS_within = 0.2290\n' +
      'F = MS_between / MS_within = 122.62\n' +
      "p (via scipy's F-distribution lookup) = 1.03e-08\n" +
      'check: scipy.stats.f_oneway -> F=122.62, p=1.03e-08',
    caveat:
      'A significant ANOVA only tells you that SOME group differs from some other group — it does not say which pair(s). Follow up with a post-hoc test (e.g. Tukey HSD) to find the specific pairwise differences.',
  },
  {
    id: 'chi-square',
    title: 'Chi-square test of independence',
    category: 'comparing-groups',
    aliases: ['chi2_contingency', 'contingency table'],
    definition:
      'The chi-square test works entirely off COUNTS in a table, not measurements — it asks whether two categorical variables (e.g. treatment group and germinated-or-not) are associated. It starts by computing, for every cell in the table, the count you\'d EXPECT if the two variables were totally independent (worked out purely from the row and column totals — if 70% of all seeds germinated overall, independence predicts 70% germination in EVERY row). Then it measures how far the actual observed counts stray from those independence-predicted expected counts, cell by cell, and adds those discrepancies up into one number. A large discrepancy means the row and column categories are NOT behaving independently — treatment really is associated with germination outcome — while a small discrepancy is consistent with pure chance around independence.',
    whenToUse:
      'Use it for count/category data in a table — e.g. "did more treated seeds germinate than control seeds?" — instead of a t-test, which needs numeric measurements.',
    formula: 'χ² = Σ (observed − expected)² / expected   where expectedᵢⱼ = (row total)·(col total) / grand total',
    formulaBreakdown: [
      { term: 'expectedᵢⱼ = (row total)·(col total) / grand total', meaning: 'for each cell, the count you\'d predict if condition and outcome were totally unrelated — built only from the table\'s margins, never from the cell\'s own observed value.' },
      { term: 'observed − expected', meaning: 'how far that cell\'s actual count strayed from the independence prediction.' },
      { term: '( … )² / expected', meaning: 'square the discrepancy (so over- and under-shoots both count as evidence, not cancel out) and scale it by how big a discrepancy was even expected in a cell that size.' },
      { term: 'Σ', meaning: 'add the scaled squared discrepancy across all four cells of the table into one chi-square statistic.' },
      { term: 'χ²', meaning: 'a bigger value means the observed table looks less like independence — scipy converts it to a p-value via the chi-square distribution\'s tail. (Our step-by-step code below also applies Yates\' continuity correction — subtracting 0.5 from each |observed−expected| before squaring — which is scipy\'s own default for a 2×2 table and slightly shrinks χ² versus the plain formula above.)' },
    ],
    datasetCsv: `condition,germinated,not_germinated
treatment,22,3
control,13,12`,
    code: `import csv
import io
from scipy import stats

csv_text = """condition,germinated,not_germinated
treatment,22,3
control,13,12"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
observed = [[int(r["germinated"]), int(r["not_germinated"])] for r in rows]
print(f"observed counts: {observed}")

row_totals = [sum(row) for row in observed]
col_totals = [sum(col) for col in zip(*observed)]
grand_total = sum(row_totals)
print(f"row totals = {row_totals}, col totals = {col_totals}, grand total = {grand_total}")

# expected count for each cell, if germination were independent of condition
expected = [[row_totals[i] * col_totals[j] / grand_total for j in range(2)] for i in range(2)]
print(f"expected counts (if independent): {[[round(v, 2) for v in row] for row in expected]}")

# Yates' continuity correction (the |O-E| - 0.5 term) for a 2x2 table
chi2 = sum(
    (abs(observed[i][j] - expected[i][j]) - 0.5) ** 2 / expected[i][j]
    for i in range(2) for j in range(2)
)
dof = 1
print(f"chi2 (with Yates' correction) = {chi2:.2f}, dof = (rows-1)*(cols-1) = {dof}")

# scipy looks up the tail area under the chi-square distribution for this chi2 and dof
p_value = stats.chi2.sf(chi2, dof)
print(f"p (via scipy's chi-square lookup) = {p_value:.4f}")

# check: scipy's chi2_contingency agrees
chi2_check, p_check, dof_check, expected_check = stats.chi2_contingency(observed)
print(f"check: scipy.stats.chi2_contingency -> chi2={chi2_check:.2f}, p={p_check:.4f}")`,
    datasetNote: 'A 2x2 table of seed-germination counts: treatment vs. control, germinated vs. not (25 seeds per group).',
    output:
      'observed counts: [[22, 3], [13, 12]]\n' +
      'row totals = [25, 25], col totals = [35, 15], grand total = 50\n' +
      'expected counts (if independent): [[17.5, 7.5], [17.5, 7.5]]\n' +
      "chi2 (with Yates' correction) = 6.10, dof = (rows-1)*(cols-1) = 1\n" +
      "p (via scipy's chi-square lookup) = 0.0136\n" +
      'check: scipy.stats.chi2_contingency -> chi2=6.10, p=0.0136',
    caveat:
      'Chi-square needs raw COUNTS, not percentages or proportions, and works best when every expected cell count is 5 or more — with small or sparse tables use `scipy.stats.fisher_exact` instead.',
  },
  {
    id: 'cohens-d',
    title: "Effect size (Cohen's d)",
    category: 'comparing-groups',
    aliases: ['effect size', 'standardized mean difference'],
    definition:
      "Cohen's d answers \"how big is this difference, really?\" by re-expressing the raw gap between two group means in standard-deviation units instead of the original measurement units. It's built almost identically to the t-statistic — a difference in means divided by a measure of spread — EXCEPT the denominator is the pooled standard deviation itself (not shrunk by sample size, the way a standard error is), which is exactly what makes d independent of how many trials you ran. That independence is the whole point: a p-value can be tiny just because you collected thousands of measurements, even if the actual difference between groups is trivially small, whereas d tells you the SIZE of the effect regardless of how much data produced it. Report both together — the p-value says \"is this likely real,\" the d says \"how much does it actually matter.\"",
    whenToUse:
      'Report it next to your p-value so a reader knows whether a "significant" difference is actually large in practice (d ~ 0.2 small, ~0.5 medium, ~0.8+ large) or tiny but detectable only because you had lots of trials.',
    formula: 'd = (x̄₂ − x̄₁) / s_pooled',
    formulaBreakdown: [
      { term: 'x̄₂ − x̄₁', meaning: 'the same raw difference in means used by the t-test — treated minus control.' },
      { term: 's_pooled', meaning: 'the pooled standard deviation of both groups (the square root of the pooled variance also used by the t-test) — a measure of typical spread, NOT shrunk by sample size the way a standard error is.' },
      { term: 'd', meaning: 'the difference expressed in "how many standard deviations apart" units — a d of 1.0 means the two group means are a full SD apart, regardless of how many measurements you took.' },
    ],
    datasetCsv: `group,height_cm
control,14.2
control,15.8
control,13.9
control,16.1
control,15.0
control,14.7
treated,18.4
treated,19.1
treated,17.8
treated,20.0
treated,18.9
treated,19.4`,
    code: `import csv
import io

csv_text = """group,height_cm
control,14.2
control,15.8
control,13.9
control,16.1
control,15.0
control,14.7
treated,18.4
treated,19.1
treated,17.8
treated,20.0
treated,18.9
treated,19.4"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
control = [float(r["height_cm"]) for r in rows if r["group"] == "control"]
treated = [float(r["height_cm"]) for r in rows if r["group"] == "treated"]

n1, n2 = len(control), len(treated)
mean1, mean2 = sum(control) / n1, sum(treated) / n2
print(f"Control mean = {mean1:.2f} (n={n1}), Treated mean = {mean2:.2f} (n={n2})")

var1 = sum((x - mean1) ** 2 for x in control) / (n1 - 1)
var2 = sum((x - mean2) ** 2 for x in treated) / (n2 - 1)
print(f"Control variance = {var1:.4f}, Treated variance = {var2:.4f}")

pooled_var = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2)
pooled_sd = pooled_var ** 0.5
print(f"pooled variance = {pooled_var:.4f}, pooled SD = sqrt({pooled_var:.4f}) = {pooled_sd:.3f}")

d = (mean2 - mean1) / pooled_sd
print(f"Cohen's d = (mean2 - mean1) / pooled SD = ({mean2:.2f} - {mean1:.2f}) / {pooled_sd:.3f} = {d:.2f}")`,
    datasetNote: 'The same treated vs. control plant-height measurements (cm) used in the P-value example.',
    output:
      'Control mean = 14.95 (n=6), Treated mean = 18.93 (n=6)\n' +
      'Control variance = 0.7550, Treated variance = 0.5907\n' +
      'pooled variance = 0.6728, pooled SD = sqrt(0.6728) = 0.820\n' +
      "Cohen's d = (mean2 - mean1) / pooled SD = (18.93 - 14.95) / 0.820 = 4.86",
    caveat:
      "A d of 4.86 is enormous — real-world effect sizes are usually much smaller (0.2-0.8). Huge d values on a tiny sample are also a cue to double-check your data for a measurement mistake before celebrating. (There's no separate library one-liner to cross-check against here — the pooled-SD formula above IS the standard definition of Cohen's d.)",
  },

  // ─── Category C — Relationships ──────────────────────────────────────────
  {
    id: 'correlation-r',
    title: 'Pearson correlation (r)',
    category: 'relationships',
    aliases: ['pearsonr', 'correlation coefficient'],
    definition:
      'Pearson\'s r measures how strongly two numeric variables move together in a STRAIGHT-LINE way, on a scale from −1 (perfectly opposite) through 0 (no linear relationship at all) to +1 (perfectly together). The core trick in the calculation is looking at whether both variables sit on the SAME SIDE of their own means at the same time — for every plant, is it both above-average in sunlight AND above-average in height (or both below-average in both)? Multiplying each pair\'s two deviations together captures exactly that: same-side pairs multiply to a positive number, opposite-side pairs multiply to a negative number, and adding all those products up reveals whether the "same side together" pattern dominates. Dividing by a term built from each variable\'s own spread then rescales that raw total onto the fixed −1-to-+1 scale, so r means the same thing no matter what units sunlight and height happen to be measured in.',
    whenToUse:
      'Use it to check whether two measured quantities (e.g. sunlight hours and plant height) tend to rise and fall together, before you commit to a regression model.',
    formula: 'r = Σ(xᵢ−x̄)(yᵢ−ȳ) / √( Σ(xᵢ−x̄)² · Σ(yᵢ−ȳ)² )',
    formulaBreakdown: [
      { term: '(xᵢ−x̄)(yᵢ−ȳ)', meaning: 'for each plant, multiply its sunlight deviation by its height deviation — positive when both are above (or both below) their own averages, negative when they disagree.' },
      { term: 'Σ … (numerator)', meaning: 'add those products across every plant — a large positive sum means the two variables consistently move together; a large negative sum means they consistently move opposite.' },
      { term: 'Σ(xᵢ−x̄)²  and  Σ(yᵢ−ȳ)²', meaning: 'each variable\'s own total squared spread (the same sum-of-squares used in variance), computed separately for sunlight and for height.' },
      { term: '√( … · … )', meaning: 'combine both variables\' spreads into one scaling factor — this is what rescales the raw "how much they move together" number onto the fixed −1-to-+1 range, regardless of units.' },
    ],
    datasetCsv: `plant,sunlight_hours,height_cm
1,2,8.1
2,4,10.3
3,5,11.0
4,6,12.8
5,8,15.1
6,9,16.0
7,11,18.5
8,12,19.2`,
    code: `import csv
import io
from scipy import stats

csv_text = """plant,sunlight_hours,height_cm
1,2,8.1
2,4,10.3
3,5,11.0
4,6,12.8
5,8,15.1
6,9,16.0
7,11,18.5
8,12,19.2"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
sunlight = [float(r["sunlight_hours"]) for r in rows]
height = [float(r["height_cm"]) for r in rows]

n = len(sunlight)
mean_x = sum(sunlight) / n
mean_y = sum(height) / n
print(f"mean sunlight = {mean_x:.3f} hrs, mean height = {mean_y:.3f} cm")

# r = sum of (x-meanx)(y-meany) / sqrt( sum(x-meanx)^2 * sum(y-meany)^2 )
cross_products = [(x - mean_x) * (y - mean_y) for x, y in zip(sunlight, height)]
sum_cross = sum(cross_products)
sum_sq_x = sum((x - mean_x) ** 2 for x in sunlight)
sum_sq_y = sum((y - mean_y) ** 2 for y in height)
print(f"sum of (x-meanx)(y-meany) = {sum_cross:.4f}")
print(f"sum of (x-meanx)^2 = {sum_sq_x:.4f}, sum of (y-meany)^2 = {sum_sq_y:.4f}")

r = sum_cross / (sum_sq_x * sum_sq_y) ** 0.5
print(f"r = {sum_cross:.4f} / sqrt({sum_sq_x:.4f} * {sum_sq_y:.4f}) = {r:.4f}")

# scipy looks up the exact tail probability for this r and n via the t-distribution
r_check, p_value = stats.pearsonr(sunlight, height)
print(f"p (via scipy's lookup) = {p_value:.2e}")
print(f"check: scipy.stats.pearsonr -> r={r_check:.4f}")`,
    datasetNote: 'Eight plants with paired measurements: daily sunlight hours and height (cm) after 3 weeks.',
    output:
      'mean sunlight = 7.125 hrs, mean height = 13.875 cm\n' +
      'sum of (x-meanx)(y-meany) = 97.0250\n' +
      'sum of (x-meanx)^2 = 84.8750, sum of (y-meany)^2 = 111.3150\n' +
      'r = 97.0250 / sqrt(84.8750 * 111.3150) = 0.9982\n' +
      "p (via scipy's lookup) = 1.46e-08\n" +
      'check: scipy.stats.pearsonr -> r=0.9982',
    caveat:
      'Correlation is not causation — sunlight and height rising together does not, by itself, prove sunlight CAUSED the growth (e.g. plants near a window might also get more water). It also only detects straight-line relationships.',
  },
  {
    id: 'r-squared',
    title: 'R² (coefficient of determination)',
    category: 'relationships',
    aliases: ['r2', 'coefficient of determination', 'r squared'],
    definition:
      "R² answers \"how much of the plant-to-plant variation in height does my sunlight-based line actually explain, versus how much is left over as unexplained scatter?\" It starts from a baseline: how much do plants vary in height overall, ignoring sunlight completely (their total spread around the overall mean height)? Then it asks how much LEFTOVER scatter remains once you subtract off each plant's line-predicted height — the gap between what the line predicted and what you actually measured. If that leftover scatter is tiny compared to the original total scatter, the line is doing almost all the explanatory work and R² is close to 1; if the line barely reduces the scatter, R² is close to 0. For a single-predictor line like this one, R² also happens to equal r² (Pearson's r squared) — but that shortcut only holds for exactly one predictor, which is why multiple regression needs R² computed the general way shown here.",
    whenToUse:
      'Report it alongside a regression line to say "how well does this line fit," e.g. "sunlight hours explain 99.6% of the variation in height in this sample."',
    formula: 'R² = 1 − SS_residual / SS_total',
    formulaBreakdown: [
      { term: 'SS_total', meaning: 'the total squared spread of the actual heights around their own mean, ignoring sunlight entirely — the baseline amount of variation there is to explain.' },
      { term: 'predicted', meaning: 'the height the fitted line would predict for each plant\'s sunlight value (slope·x + intercept) — computed first so residuals can be measured against it.' },
      { term: 'SS_residual', meaning: 'the squared spread of the LEFTOVER gaps between actual heights and the line\'s predicted heights — whatever the line failed to explain.' },
      { term: '1 − SS_residual/SS_total', meaning: 'the fraction of the original variation that was NOT left over, i.e. the fraction the line DID explain — 1.0 if residuals vanish entirely, 0.0 if the line explains nothing beyond the plain mean.' },
    ],
    datasetCsv: `plant,sunlight_hours,height_cm
1,2,8.1
2,4,10.3
3,5,11.0
4,6,12.8
5,8,15.1
6,9,16.0
7,11,18.5
8,12,19.2`,
    code: `import csv
import io
from sklearn.metrics import r2_score

csv_text = """plant,sunlight_hours,height_cm
1,2,8.1
2,4,10.3
3,5,11.0
4,6,12.8
5,8,15.1
6,9,16.0
7,11,18.5
8,12,19.2"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
sunlight = [float(r["sunlight_hours"]) for r in rows]
height = [float(r["height_cm"]) for r in rows]

n = len(sunlight)
mean_x = sum(sunlight) / n
mean_y = sum(height) / n

# Fit the least-squares line by hand: slope = sum((x-mx)(y-my)) / sum((x-mx)^2)
sum_cross = sum((x - mean_x) * (y - mean_y) for x, y in zip(sunlight, height))
sum_sq_x = sum((x - mean_x) ** 2 for x in sunlight)
slope = sum_cross / sum_sq_x
intercept = mean_y - slope * mean_x
print(f"slope = {sum_cross:.4f} / {sum_sq_x:.4f} = {slope:.4f}")
print(f"intercept = mean_y - slope*mean_x = {intercept:.4f}")

predicted = [slope * x + intercept for x in sunlight]
residuals = [y - p for y, p in zip(height, predicted)]
ss_res = sum(r ** 2 for r in residuals)   # unexplained variation
ss_tot = sum((y - mean_y) ** 2 for y in height)   # total variation
print(f"SS_residual (unexplained) = {ss_res:.4f}")
print(f"SS_total = {ss_tot:.4f}")

r2 = 1 - ss_res / ss_tot
print(f"R^2 = 1 - SS_residual/SS_total = 1 - {ss_res:.4f}/{ss_tot:.4f} = {r2:.4f}")

# check: sklearn agrees
print(f"check: sklearn.metrics.r2_score = {r2_score(height, predicted):.4f}")`,
    datasetNote: 'The same sunlight-hours-vs-height pair (8 plants) used in the Pearson correlation example.',
    output:
      'slope = 97.0250 / 84.8750 = 1.1432\n' +
      'intercept = mean_y - slope*mean_x = 5.7300\n' +
      'SS_residual (unexplained) = 0.4007\n' +
      'SS_total = 111.3150\n' +
      'R^2 = 1 - SS_residual/SS_total = 1 - 0.4007/111.3150 = 0.9964\n' +
      'check: sklearn.metrics.r2_score = 0.9964',
    caveat:
      'For a SIMPLE (one-predictor) linear regression, R² is always exactly r² — but for multiple regression (see Beta values) that shortcut no longer works and you must compute R² from the full model.',
  },
  {
    id: 'linear-regression',
    title: 'Linear regression slope & intercept',
    category: 'relationships',
    aliases: ['linregress', 'line of best fit', 'trendline'],
    definition:
      'Linear regression finds the specific straight line, y = slope·x + intercept, that makes the smallest possible total squared prediction error across all your data points — not just any line that looks like it fits, but the mathematically best one by that specific criterion. Squaring the errors before adding them up (rather than, say, just adding the raw errors) matters because raw positive and negative errors would cancel out and make every line look equally "good" on average; squaring forces every miss, in either direction, to count against the line. The slope comes out of the same cross-product-of-deviations idea used for correlation — it is literally that same numerator, rescaled by how spread out the x-values (fertilizer dose) are instead of by both variables\' spreads — and the intercept is then whatever value makes the line pass through the point (mean dose, mean yield), since the least-squares line is guaranteed to run through that point exactly.',
    whenToUse:
      'Use it once correlation shows a linear relationship and you want an actual equation — e.g. to predict crop yield at a fertilizer dose you have not tested yet.',
    formula: 'slope = Σ(xᵢ−x̄)(yᵢ−ȳ) / Σ(xᵢ−x̄)²   ·   intercept = ȳ − slope·x̄',
    formulaBreakdown: [
      { term: 'Σ(xᵢ−x̄)(yᵢ−ȳ)', meaning: 'the same cross-product sum used to compute correlation — how much dose and yield move together.' },
      { term: 'Σ(xᵢ−x̄)²', meaning: 'how spread out the dose values themselves are — dividing by this (rather than by both variables\' spreads, as correlation does) is what converts the relationship into a slope with real units (kg per gram of fertilizer), not a unitless −1-to-+1 number.' },
      { term: 'slope', meaning: 'how much yield changes, on average, for every +1 unit of dose.' },
      { term: 'intercept = ȳ − slope·x̄', meaning: 'chosen so the fitted line passes exactly through the point (mean dose, mean yield) — a mathematical guarantee of the least-squares method, not a separate fit.' },
    ],
    datasetCsv: `plot,dose_g,yield_kg
1,0,20.1
2,5,25.3
3,10,31.0
4,15,34.8
5,20,41.2
6,25,44.5`,
    code: `import csv
import io
from scipy import stats

csv_text = """plot,dose_g,yield_kg
1,0,20.1
2,5,25.3
3,10,31.0
4,15,34.8
5,20,41.2
6,25,44.5"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
dose = [float(r["dose_g"]) for r in rows]
yield_kg = [float(r["yield_kg"]) for r in rows]

n = len(dose)
mean_x = sum(dose) / n
mean_y = sum(yield_kg) / n
print(f"mean dose = {mean_x:.2f} g, mean yield = {mean_y:.2f} kg")

sum_cross = sum((x - mean_x) * (y - mean_y) for x, y in zip(dose, yield_kg))
sum_sq_x = sum((x - mean_x) ** 2 for x in dose)
slope = sum_cross / sum_sq_x
intercept = mean_y - slope * mean_x
print(f"slope = sum((x-mx)(y-my)) / sum((x-mx)^2) = {sum_cross:.2f} / {sum_sq_x:.2f} = {slope:.3f}")
print(f"intercept = mean_y - slope*mean_x = {mean_y:.2f} - {slope:.3f}*{mean_x:.2f} = {intercept:.2f}")

print(f"fitted line: yield = {slope:.3f} * dose + {intercept:.2f}")

# check: scipy's linregress agrees, and also gives us the p-value via its own lookup
result = stats.linregress(dose, yield_kg)
print(f"check: scipy.stats.linregress -> slope={result.slope:.3f}, intercept={result.intercept:.2f}, r={result.rvalue:.4f}, p={result.pvalue:.2e}")`,
    datasetNote: 'Six fertilizer-dose (g) vs. crop-yield (kg) measurements, one per test plot.',
    output:
      'mean dose = 12.50 g, mean yield = 32.82 kg\n' +
      'slope = sum((x-mx)(y-my)) / sum((x-mx)^2) = 433.75 / 437.50 = 0.991\n' +
      'intercept = mean_y - slope*mean_x = 32.82 - 0.991*12.50 = 20.42\n' +
      'fitted line: yield = 0.991 * dose + 20.42\n' +
      'check: scipy.stats.linregress -> slope=0.991, intercept=20.42, r=0.9975, p=9.70e-06',
    caveat:
      'Only trust predictions INSIDE the range of doses you actually tested (0-25 g here) — extrapolating far outside your data (e.g. predicting yield at 200 g) assumes the line keeps being straight, which real biology rarely does.',
  },
  {
    id: 'beta-coefficients',
    title: 'Beta values (regression coefficients)',
    category: 'relationships',
    aliases: ['ols', 'multiple regression', 'regression coefficients'],
    definition:
      "In a multiple regression, every predictor gets its OWN beta coefficient — the expected change in the outcome per +1 unit of THAT predictor, with every other predictor held fixed. That \"holding fixed\" part is exactly why beta values are more useful than running separate simple regressions on each predictor alone: a simple dose-only regression would have its slope contaminated by any tendency for high-dose plots to ALSO happen to get more sunlight, whereas multiple regression finds the one intercept and set of betas that jointly best predict height from BOTH predictors at once, so beta_dose specifically isolates dose's own contribution. Getting there means minimizing the same squared-error criterion as simple regression, just now over 3 unknowns (intercept, beta_dose, beta_sun) instead of 2 — which produces a linear system built directly from sums of the raw data (the \"normal equations\"), and solving that system for its 3 unknowns is genuine linear algebra, not a new statistics idea.",
    whenToUse:
      "Use multiple regression (instead of separate simple regressions) when you think MORE THAN ONE variable predicts your outcome (e.g. fertilizer dose AND sunlight hours both affecting plant height) and want each one's individual contribution.",
    formula: 'height = β₀ + β₁·dose + β₂·sunlight   (fit by solving the normal equations for β₀, β₁, β₂)',
    formulaBreakdown: [
      { term: 'β₀', meaning: 'the intercept — the model\'s predicted height when both dose and sunlight are zero.' },
      { term: 'β₁ (beta_dose)', meaning: 'the expected change in height per +1 gram of fertilizer dose, WITH sunlight held constant — dose\'s own isolated contribution.' },
      { term: 'β₂ (beta_sun)', meaning: 'the expected change in height per +1 hour of sunlight, with dose held constant.' },
      { term: 'normal equations', meaning: 'a system of 3 linear equations (one per unknown) built from sums like Σdose, Σdose², Σ(dose·sunlight), Σ(dose·height) — the multi-predictor generalization of the single-predictor slope/intercept formula.' },
      { term: 'solving the system', meaning: 'finding the β₀, β₁, β₂ that satisfy all 3 equations at once — this is the one step handed to a linear-algebra solver rather than substituted through by hand, the same way you\'d use a calculator for long division.' },
    ],
    datasetCsv: `plant,dose_g,sunlight_hrs,height_cm
1,0,3,9.0
2,5,4,12.5
3,10,5,16.8
4,15,6,20.1
5,20,7,24.0
6,25,8,27.9
7,0,8,15.2
8,10,4,15.9
9,20,3,20.5
10,25,6,25.2`,
    code: `import csv
import io
import numpy as np
import statsmodels.api as sm

csv_text = """plant,dose_g,sunlight_hrs,height_cm
1,0,3,9.0
2,5,4,12.5
3,10,5,16.8
4,15,6,20.1
5,20,7,24.0
6,25,8,27.9
7,0,8,15.2
8,10,4,15.9
9,20,3,20.5
10,25,6,25.2"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
dose = [float(r["dose_g"]) for r in rows]
sun = [float(r["sunlight_hrs"]) for r in rows]
height = [float(r["height_cm"]) for r in rows]
n = len(dose)

# Multiple regression solves height = b0 + b1*dose + b2*sun by minimizing
# squared error. That means building the "normal equations" from sums of the
# data (this part is the hand-computable step)...
sum_dose, sum_sun, sum_h = sum(dose), sum(sun), sum(height)
sum_dose2 = sum(d * d for d in dose)
sum_sun2 = sum(s * s for s in sun)
sum_dose_sun = sum(d * s for d, s in zip(dose, sun))
sum_dose_h = sum(d * h for d, h in zip(dose, height))
sum_sun_h = sum(s * h for s, h in zip(sun, height))

print("normal-equation sums:")
print(f"  n={n}, sum(dose)={sum_dose:.0f}, sum(sun)={sum_sun:.0f}, sum(height)={sum_h:.1f}")
print(f"  sum(dose^2)={sum_dose2:.0f}, sum(sun^2)={sum_sun2:.0f}, sum(dose*sun)={sum_dose_sun:.0f}")
print(f"  sum(dose*height)={sum_dose_h:.1f}, sum(sun*height)={sum_sun_h:.1f}")

# ...then solving the resulting 3x3 linear system for [intercept, beta_dose, beta_sun].
# That's genuine linear algebra, not a statistics shortcut -- numpy's solver does it.
XtX = np.array([
    [n,        sum_dose,     sum_sun],
    [sum_dose, sum_dose2,    sum_dose_sun],
    [sum_sun,  sum_dose_sun, sum_sun2],

])
Xty = np.array([sum_h, sum_dose_h, sum_sun_h])
intercept, beta_dose, beta_sun = np.linalg.solve(XtX, Xty)
print(f"solving the 3x3 system -> intercept={intercept:.2f}, beta_dose={beta_dose:.3f}, beta_sun={beta_sun:.3f}")

predicted = [intercept + beta_dose * d + beta_sun * s for d, s in zip(dose, sun)]
ss_res = sum((h - p) ** 2 for h, p in zip(height, predicted))
mean_h = sum_h / n
ss_tot = sum((h - mean_h) ** 2 for h in height)
r2 = 1 - ss_res / ss_tot
print(f"R^2 = 1 - {ss_res:.4f}/{ss_tot:.4f} = {r2:.4f}")

# check: statsmodels' OLS agrees
X = sm.add_constant(np.column_stack([dose, sun]))
model = sm.OLS(height, X).fit()
b0, b1, b2 = model.params
print(f"check: statsmodels OLS -> intercept={b0:.2f}, beta_dose={b1:.3f}, beta_sun={b2:.3f}, R^2={model.rsquared:.4f}")`,
    datasetNote: 'Ten plants with two predictors each (fertilizer dose in g, sunlight in hours/day) and the resulting height (cm).',
    output:
      'normal-equation sums:\n' +
      '  n=10, sum(dose)=130, sum(sun)=54, sum(height)=187.1\n' +
      '  sum(dose^2)=2500, sum(sun^2)=324, sum(dose*sun)=750\n' +
      '  sum(dose*height)=2908.5, sum(sun*height)=1070.7\n' +
      'solving the 3x3 system -> intercept=6.03, beta_dose=0.523, beta_sun=1.087\n' +
      'R^2 = 1 - 1.4984/316.4090 = 0.9953\n' +
      'check: statsmodels OLS -> intercept=6.03, beta_dose=0.523, beta_sun=1.087, R^2=0.9953',
    caveat:
      "The 3x3 system is genuine linear algebra (solving for 3 unknowns from 3 equations) rather than something you'd substitute through by hand — that's the one step numpy's solver does for you here, same as a calculator doing long division. Also watch for predictors that are themselves correlated (multicollinearity), which makes individual betas unstable.",
  },
  {
    id: 'confidence-interval',
    title: '95% confidence interval for a mean',
    category: 'relationships',
    aliases: ['ci', 'interval estimate'],
    definition:
      "A 95% confidence interval acknowledges something a bare mean hides: your sample mean is only an ESTIMATE of the true population mean, and a different sample would have given a slightly different estimate. The interval is built by taking your mean and padding it in both directions by a \"margin of error\" sized specifically so that, if you repeated the whole experiment many times and built an interval this way every time, about 95% of those intervals would end up containing the true value. That margin is SEM (how much the mean itself tends to bounce around) scaled up by a critical value pulled from the t-distribution — the critical value is larger for smaller samples and smaller degrees of freedom, which is exactly the mathematically honest way of saying \"I trust this mean less when I have fewer data points, so I need a wider net to still catch the truth 95% of the time.\"",
    whenToUse:
      'Report it alongside a mean to show a plausible range for the "real" value, instead of a single number that implies false precision — e.g. "mean height 15.03 cm, 95% CI [14.27, 15.79]."',
    formula: 'CI = x̄ ± t*·SEM   where t* = t-distribution critical value for 95% confidence at df = n−1',
    formulaBreakdown: [
      { term: 'x̄', meaning: 'the sample mean — the center of the interval.' },
      { term: 'SEM', meaning: 'the standard error of the mean, computed exactly as in the SEM entry — how much this mean would bounce around across repeated experiments.' },
      { term: 't*', meaning: 'a critical value looked up from the t-distribution for your chosen confidence level (95%) and degrees of freedom — bigger for smaller samples, which widens the interval to compensate for having less data to trust.' },
      { term: 't*·SEM', meaning: 'the "margin of error" — how far in each direction from the mean the interval extends.' },
      { term: 'x̄ ± margin', meaning: 'the full interval: the low bound is the mean minus the margin, the high bound is the mean plus the margin.' },
    ],
    datasetCsv: `height_cm
14.2
15.8
13.9
16.1
15.0
14.7
15.5`,
    code: `import csv
import io
from scipy import stats

csv_text = """height_cm
14.2
15.8
13.9
16.1
15.0
14.7
15.5"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
heights = [float(r["height_cm"]) for r in rows]

n = len(heights)
mean = sum(heights) / n
sum_sq = sum((x - mean) ** 2 for x in heights)
sd = (sum_sq / (n - 1)) ** 0.5
sem = sd / (n ** 0.5)
df = n - 1
print(f"mean = {mean:.2f} cm, SD = {sd:.2f} cm, SEM = {sem:.2f} cm, df = {df}")

# The critical t-value for 95% confidence with df=6 isn't something you look up
# in your head -- scipy's t-distribution gives us the exact value.
t_crit = stats.t.ppf(0.975, df)
print(f"t_critical (95%, df={df}, via scipy's t lookup) = {t_crit:.3f}")

margin = t_crit * sem
ci_low = mean - margin
ci_high = mean + margin
print(f"margin = t_critical * SEM = {t_crit:.3f} * {sem:.2f} = {margin:.2f}")
print(f"95% CI = mean +/- margin = [{ci_low:.2f}, {ci_high:.2f}] cm")

# check: scipy's own t.interval agrees
ci_check = stats.t.interval(0.95, df=df, loc=mean, scale=sem)
print(f"check: scipy.stats.t.interval -> [{ci_check[0]:.2f}, {ci_check[1]:.2f}]")`,
    datasetNote: 'The same seven plant-height measurements (cm) used in the Mean and Standard deviation examples.',
    output:
      'mean = 15.03 cm, SD = 0.82 cm, SEM = 0.31 cm, df = 6\n' +
      "t_critical (95%, df=6, via scipy's t lookup) = 2.447\n" +
      'margin = t_critical * SEM = 2.447 * 0.31 = 0.76\n' +
      '95% CI = mean +/- margin = [14.27, 15.79] cm\n' +
      'check: scipy.stats.t.interval -> [14.27, 15.79]',
    caveat:
      '"95% confidence" describes the LONG-RUN PROCEDURE, not a 95% probability that this particular interval contains the true mean — a subtle but common misinterpretation. Wider intervals (small n, big SD) mean less certainty, not more.',
  },
  {
    id: 'normal-distribution',
    title: 'Normal distribution & normality check',
    category: 'relationships',
    aliases: ['shapiro', 'bell curve', 'normality test'],
    definition:
      "A normal (\"bell curve\") distribution is a specific, symmetric shape where values cluster tightly around the mean and get rarer the further out you go, in a precise, predictable way — not just \"roughly centered,\" but centered with a known proportion of values within each distance from the mean (about 68% within 1 SD, about 95% within 2 SDs). That predictable shape is WHY so many statistical tests (the t-test among them) assume it — the math behind those tests is built on exactly that bell-curve behavior. Checking normality means asking whether your own sample plausibly came from a population shaped like that. A quick hand-computable gut check is simply counting what fraction of your points actually fall within 1 SD of the mean and comparing that count to the ~68% a true bell curve would produce; the FORMAL version, the Shapiro-Wilk test, does something more rigorous by comparing your sorted data against tabulated theoretical values a truly normal sample would be expected to produce — a calculation involved enough (order statistics and pre-tabulated coefficients) that it is always run through a library rather than worked by hand.",
    whenToUse:
      'Check normality before relying on tests (like the t-test) that assume it — with a small sample, also just look at a histogram, since Shapiro-Wilk can be underpowered to detect real skew.',
    formula: '~68% of values expected within x̄ ± s  (the empirical rule) — formally tested by Shapiro-Wilk\'s W statistic',
    formulaBreakdown: [
      { term: 'x̄ ± s', meaning: 'one standard deviation on either side of the mean — the "inner band" of a bell curve.' },
      { term: '~68% expected', meaning: 'the "empirical rule" for a normal distribution — a quick, hand-computable benchmark to compare your own sample against (here: 6/10 = 60%, in the right ballpark).' },
      { term: 'W (Shapiro-Wilk)', meaning: "the formal test statistic — built from your sorted data compared against pre-tabulated coefficients for what a normal sample's order statistics should look like; not something derived from a simple formula, which is why it's computed by scipy rather than shown as hand arithmetic here." },
    ],
    datasetCsv: `height_cm
14.2
15.8
13.9
16.1
15.0
14.7
15.5
14.9
15.3
14.5`,
    code: `import csv
import io
from scipy import stats

csv_text = """height_cm
14.2
15.8
13.9
16.1
15.0
14.7
15.5
14.9
15.3
14.5"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
heights = [float(r["height_cm"]) for r in rows]

n = len(heights)
mean = sum(heights) / n
sum_sq = sum((x - mean) ** 2 for x in heights)
sd = (sum_sq / (n - 1)) ** 0.5
print(f"mean = {mean:.2f}, SD = {sd:.2f}")

# A quick hand-computable sanity check: in a normal distribution, about 68% of
# values fall within 1 SD of the mean.
within_1sd = sum(1 for x in heights if mean - sd <= x <= mean + sd)
print(f"values within 1 SD of the mean: {within_1sd}/{n} ({within_1sd / n:.0%}, vs. ~68% expected if normal)")

# The Shapiro-Wilk statistic itself uses tabulated coefficients on the sorted
# data that aren't something you compute by hand -- scipy runs the real test.
w_stat, p_value = stats.shapiro(heights)
print(f"Shapiro-Wilk (via scipy): W = {w_stat:.4f}, p = {p_value:.4f}")`,
    datasetNote: 'Ten plant-height measurements (cm) from one group.',
    output:
      'mean = 14.99, SD = 0.70\n' +
      'values within 1 SD of the mean: 6/10 (60%, vs. ~68% expected if normal)\n' +
      'Shapiro-Wilk (via scipy): W = 0.9863, p = 0.9899',
    caveat:
      'A HIGH p-value here (0.99) means "no evidence against normality" — it does NOT prove the data is normal, it just means this small sample did not look clearly non-normal. Never treat a Shapiro-Wilk p-value like a t-test p-value.',
  },

  // ─── Category D — Classification metrics ────────────────────────────────
  {
    id: 'accuracy',
    title: 'Accuracy',
    category: 'classification-metrics',
    aliases: ['accuracy_score', 'percent correct'],
    definition:
      'Accuracy is the simplest possible score a classifier can get: for every prediction, check whether it matches the true label, count how many matched, and divide by how many predictions there were in total. That simplicity is also its biggest limitation — it treats every photo equally regardless of what TYPE of mistake was made, so it can\'t distinguish a model that fails by missing real weeds from one that fails by falsely flagging healthy plants. It also gets misleadingly easy to inflate when one class vastly outnumbers the other, because a model that just guesses the common class every single time can score very high accuracy while being completely useless — the harmonic-mean metric described in the classification-metrics category is built specifically to expose that failure mode. Use it as a fast first sanity check, but never as the only metric you report for a classifier working with real, imbalanced data.',
    whenToUse:
      "Use it as a quick first check for a classifier (e.g. a \"weed vs. not-weed\" image model), but be cautious when one class is much rarer than the other — see F1 score for why.",
    formula: 'accuracy = correct predictions / total predictions',
    formulaBreakdown: [
      { term: 'correct predictions', meaning: 'count every photo where the predicted label exactly matches the true label — includes both "correctly flagged weed" and "correctly ignored non-weed."' },
      { term: 'total predictions', meaning: 'every photo the model made a prediction for, right or wrong.' },
      { term: 'accuracy', meaning: 'the resulting fraction, usually shown as a percentage — 0.80 here means 8 out of 10 photos were labeled correctly.' },
    ],
    datasetCsv: `photo,true_label,predicted_label
1,weed,weed
2,not_weed,not_weed
3,weed,weed
4,weed,not_weed
5,not_weed,not_weed
6,weed,weed
7,not_weed,weed
8,not_weed,not_weed
9,weed,weed
10,not_weed,not_weed`,
    code: `import csv
import io
from sklearn.metrics import accuracy_score

csv_text = """photo,true_label,predicted_label
1,weed,weed
2,not_weed,not_weed
3,weed,weed
4,weed,not_weed
5,not_weed,not_weed
6,weed,weed
7,not_weed,weed
8,not_weed,not_weed
9,weed,weed
10,not_weed,not_weed"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
y_true = [r["true_label"] for r in rows]
y_pred = [r["predicted_label"] for r in rows]

correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
n = len(y_true)
print(f"correct predictions: {correct} / {n}")
for i, (t, p) in enumerate(zip(y_true, y_pred), start=1):
    mark = "correct" if t == p else "WRONG"
    print(f"  photo {i}: true={t}, predicted={p} -> {mark}")

accuracy = correct / n
print(f"accuracy = correct / total = {correct}/{n} = {accuracy:.2f}")

# check: sklearn agrees
y_true_bin = [1 if t == "weed" else 0 for t in y_true]
y_pred_bin = [1 if p == "weed" else 0 for p in y_pred]
print(f"check: sklearn.metrics.accuracy_score = {accuracy_score(y_true_bin, y_pred_bin):.2f}")`,
    datasetNote: 'True vs. predicted "is it a weed?" labels for 10 leaf photos.',
    output:
      'correct predictions: 8 / 10\n' +
      '  photo 1: true=weed, predicted=weed -> correct\n' +
      '  photo 2: true=not_weed, predicted=not_weed -> correct\n' +
      '  photo 3: true=weed, predicted=weed -> correct\n' +
      '  photo 4: true=weed, predicted=not_weed -> WRONG\n' +
      '  photo 5: true=not_weed, predicted=not_weed -> correct\n' +
      '  photo 6: true=weed, predicted=weed -> correct\n' +
      '  photo 7: true=not_weed, predicted=weed -> WRONG\n' +
      '  photo 8: true=not_weed, predicted=not_weed -> correct\n' +
      '  photo 9: true=weed, predicted=weed -> correct\n' +
      '  photo 10: true=not_weed, predicted=not_weed -> correct\n' +
      'accuracy = correct / total = 8/10 = 0.80\n' +
      'check: sklearn.metrics.accuracy_score = 0.80',
    caveat:
      'If 90% of your photos were "not weed," a model that always predicts "not weed" would score 90% accuracy while being useless — always check what fraction of each class is in your data before trusting a single accuracy number.',
  },
  {
    id: 'precision-recall',
    title: 'Precision & recall',
    category: 'classification-metrics',
    aliases: ['precision_score', 'recall_score', 'sensitivity'],
    definition:
      "Precision and recall both start from the same 4-way breakdown of every prediction — true positive (correctly flagged a weed), false positive (flagged a weed that wasn't one), false negative (missed a real weed), true negative (correctly ignored a non-weed) — but they divide by different denominators, which is exactly why they can disagree. Precision asks a question centered on the model's FLAGS: of everything it called \"weed,\" what fraction really were weeds? Recall asks a question centered on the WORLD's actual weeds: of every real weed that existed, what fraction did the model actually catch? A model that flags almost everything as a weed will have high recall (it rarely misses a real one) but low precision (most of its flags are wrong); a model that only flags when extremely confident will have high precision but low recall (it misses subtler weeds). Neither number alone tells the whole story — that's why they're always reported as a pair.",
    whenToUse:
      'Use both together whenever false positives and false negatives have different costs — e.g. a weed detector that over-flags (low precision) vs. one that misses real weeds (low recall).',
    formula: 'precision = TP / (TP + FP)   ·   recall = TP / (TP + FN)',
    formulaBreakdown: [
      { term: 'TP (true positive)', meaning: 'the model flagged "weed" and it really was a weed.' },
      { term: 'FP (false positive)', meaning: 'the model flagged "weed" but it was actually not a weed — a false alarm.' },
      { term: 'FN (false negative)', meaning: 'the model said "not weed" but it really was a weed — a miss.' },
      { term: 'TP + FP (precision\'s denominator)', meaning: 'every photo the model flagged as "weed," right or wrong — precision asks what fraction of THOSE flags were correct.' },
      { term: 'TP + FN (recall\'s denominator)', meaning: 'every photo that was ACTUALLY a weed, whether the model caught it or not — recall asks what fraction of those real weeds got caught.' },
    ],
    datasetCsv: `photo,true_label,predicted_label
1,weed,weed
2,not_weed,weed
3,weed,weed
4,weed,weed
5,not_weed,weed
6,weed,weed
7,not_weed,not_weed
8,not_weed,not_weed
9,weed,weed
10,not_weed,weed
11,weed,not_weed
12,not_weed,not_weed`,
    code: `import csv
import io
from sklearn.metrics import precision_score, recall_score

csv_text = """photo,true_label,predicted_label
1,weed,weed
2,not_weed,weed
3,weed,weed
4,weed,weed
5,not_weed,weed
6,weed,weed
7,not_weed,not_weed
8,not_weed,not_weed
9,weed,weed
10,not_weed,weed
11,weed,not_weed
12,not_weed,not_weed"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
y_true = [r["true_label"] for r in rows]
y_pred = [r["predicted_label"] for r in rows]

tp = fp = fn = tn = 0
for t, p in zip(y_true, y_pred):
    if t == "weed" and p == "weed":
        tp += 1
    elif t == "not_weed" and p == "weed":
        fp += 1
    elif t == "weed" and p == "not_weed":
        fn += 1
    else:
        tn += 1
print(f"TP (flagged weed, really a weed) = {tp}")
print(f"FP (flagged weed, actually not)  = {fp}")
print(f"FN (missed weed, called not_weed) = {fn}")
print(f"TN (correctly ignored)           = {tn}")

precision = tp / (tp + fp)
recall = tp / (tp + fn)
print(f"precision = TP / (TP + FP) = {tp} / ({tp} + {fp}) = {precision:.2f}")
print(f"recall    = TP / (TP + FN) = {tp} / ({tp} + {fn}) = {recall:.2f}")

# check: sklearn agrees
y_true_bin = [1 if t == "weed" else 0 for t in y_true]
y_pred_bin = [1 if p == "weed" else 0 for p in y_pred]
print(f"check: sklearn -> precision={precision_score(y_true_bin, y_pred_bin):.2f}, recall={recall_score(y_true_bin, y_pred_bin):.2f}")`,
    datasetNote: 'True vs. predicted "is it a weed?" labels for 12 leaf photos, where the model tends to over-flag.',
    output:
      'TP (flagged weed, really a weed) = 5\n' +
      'FP (flagged weed, actually not)  = 3\n' +
      'FN (missed weed, called not_weed) = 1\n' +
      'TN (correctly ignored)           = 3\n' +
      'precision = TP / (TP + FP) = 5 / (5 + 3) = 0.62\n' +
      'recall    = TP / (TP + FN) = 5 / (5 + 1) = 0.83\n' +
      'check: sklearn -> precision=0.62, recall=0.83',
    caveat:
      'Precision and recall trade off against each other — a model tuned to flag more things raises recall (catches more real positives) but usually lowers precision (more false alarms), and vice versa. F1 score summarizes that tradeoff in one number.',
  },
  {
    id: 'f1-score',
    title: 'F1 score (accuracy vs. F1)',
    category: 'classification-metrics',
    aliases: ['f1_score', 'harmonic mean'],
    definition:
      'The F1 score exists because precision and recall can pull in opposite directions, and combining them by a plain average would let a model coast to a decent-looking score just by being very good at one and terrible at the other. The HARMONIC mean (not the arithmetic mean) is used specifically to punish that imbalance — it stays close to whichever input is LOWER, so F1 can only be high when BOTH precision and recall are reasonably high at the same time. This is exactly what makes F1 the right metric on imbalanced data, where accuracy has a well-known blind spot: if only 2 of 15 photos are truly weeds, a model that predicts "not weed" for every single photo scores 87% accuracy while catching zero real weeds — and F1 immediately exposes that failure because recall (and therefore F1) collapses to 0.',
    whenToUse:
      "Use it instead of accuracy when your classes are imbalanced (e.g. rare weeds in mostly-healthy-plant photos), where accuracy can look great by just predicting the majority class every time.",
    formula: 'F1 = 2·(precision·recall) / (precision + recall)',
    formulaBreakdown: [
      { term: 'precision·recall', meaning: 'multiply the two scores together — this product collapses toward zero if EITHER one is low, which is the harmonic mean\'s way of refusing to reward a lopsided model.' },
      { term: 'precision + recall (denominator)', meaning: 'the sum of both scores — combined with the numerator, this specific ratio is the formula for a harmonic mean of two numbers.' },
      { term: '2·', meaning: 'a scaling constant so that F1 lands on the same 0-to-1 scale as precision and recall themselves (when precision = recall, F1 equals that same value exactly).' },
      { term: 'F1', meaning: 'a single number that is only high when precision AND recall are BOTH reasonably high — unlike a plain average, which a very lopsided model could still inflate.' },
    ],
    datasetCsv: `photo,true_label,predicted_label
1,weed,weed
2,not_weed,not_weed
3,not_weed,not_weed
4,not_weed,not_weed
5,not_weed,not_weed
6,not_weed,not_weed
7,not_weed,not_weed
8,not_weed,not_weed
9,not_weed,not_weed
10,weed,not_weed
11,not_weed,weed
12,not_weed,not_weed
13,not_weed,not_weed
14,not_weed,not_weed
15,not_weed,not_weed`,
    code: `import csv
import io
from sklearn.metrics import accuracy_score, f1_score

csv_text = """photo,true_label,predicted_label
1,weed,weed
2,not_weed,not_weed
3,not_weed,not_weed
4,not_weed,not_weed
5,not_weed,not_weed
6,not_weed,not_weed
7,not_weed,not_weed
8,not_weed,not_weed
9,not_weed,not_weed
10,weed,not_weed
11,not_weed,weed
12,not_weed,not_weed
13,not_weed,not_weed
14,not_weed,not_weed
15,not_weed,not_weed"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
y_true = [r["true_label"] for r in rows]
y_pred = [r["predicted_label"] for r in rows]

tp = fp = fn = tn = 0
for t, p in zip(y_true, y_pred):
    if t == "weed" and p == "weed":
        tp += 1
    elif t == "not_weed" and p == "weed":
        fp += 1
    elif t == "weed" and p == "not_weed":
        fn += 1
    else:
        tn += 1
print(f"TP={tp}, FP={fp}, FN={fn}, TN={tn} (only 2 of 15 photos are actually weeds)")

correct = tp + tn
accuracy = correct / len(y_true)
print(f"accuracy = (TP+TN) / total = ({tp}+{tn}) / {len(y_true)} = {accuracy:.2f}")

precision = tp / (tp + fp)
recall = tp / (tp + fn)
print(f"precision = {tp}/({tp}+{fp}) = {precision:.2f}, recall = {tp}/({tp}+{fn}) = {recall:.2f}")

f1 = 2 * precision * recall / (precision + recall)
print(f"F1 = 2 * precision * recall / (precision + recall) = 2*{precision:.2f}*{recall:.2f}/({precision:.2f}+{recall:.2f}) = {f1:.2f}")

# check: sklearn agrees
y_true_bin = [1 if t == "weed" else 0 for t in y_true]
y_pred_bin = [1 if p == "weed" else 0 for p in y_pred]
print(f"check: sklearn -> accuracy={accuracy_score(y_true_bin, y_pred_bin):.2f}, f1={f1_score(y_true_bin, y_pred_bin):.2f}")`,
    datasetNote: 'Fifteen leaf photos where only 2 are truly weeds (an imbalanced dataset) and the model gets one right, misses one, and raises one false alarm.',
    output:
      'TP=1, FP=1, FN=1, TN=12 (only 2 of 15 photos are actually weeds)\n' +
      'accuracy = (TP+TN) / total = (1+12) / 15 = 0.87\n' +
      'precision = 1/(1+1) = 0.50, recall = 1/(1+1) = 0.50\n' +
      'F1 = 2 * precision * recall / (precision + recall) = 2*0.50*0.50/(0.50+0.50) = 0.50\n' +
      'check: sklearn -> accuracy=0.87, f1=0.50',
    caveat:
      "87% accuracy sounds great, but F1 (0.50) reveals the model is only catching half the real weeds and is wrong half the time it flags one — on imbalanced data, always report F1 (or precision/recall) alongside accuracy, never accuracy alone.",
  },
  {
    id: 'auc-roc',
    title: 'Area under the ROC curve (AUC)',
    category: 'classification-metrics',
    aliases: ['auc', 'roc_auc_score', 'roc curve'],
    definition:
      'AUC measures how well your model RANKS positives above negatives, independent of any specific decision threshold — instead of asking "is 0.5 the right cutoff for calling something a weed," it asks a threshold-free question: if I grabbed one random true weed and one random true non-weed, how often would the model have assigned a HIGHER probability to the actual weed? That reframing is what makes AUC so useful for comparing models before you\'ve committed to a cutoff — a model can be genuinely good at ranking weeds above non-weeds even if no single threshold perfectly separates them. Concretely, the calculation forms every possible (positive, negative) pair and simply tallies how often the positive scored higher (a "concordant" pair) versus lower (a "discordant" pair) versus tied — the fraction that were concordant, with ties counted as half-credit, IS AUC exactly, which is also why it lines up with the more famous "area under the ROC curve" geometric picture: tracing the curve across every threshold and measuring the area beneath it is mathematically the same calculation as this pair-counting probability.',
    whenToUse:
      "Use it when your model outputs a PROBABILITY (not just a 0/1 label) and you want one number summarizing how well it separates the two classes overall — e.g. comparing two candidate weed-detector models before picking a threshold.",
    formula: 'AUC = ( concordant pairs + 0.5·tied pairs ) / total (positive, negative) pairs',
    formulaBreakdown: [
      { term: '(positive, negative) pair', meaning: 'one true weed photo\'s probability paired against one true non-weed photo\'s probability — every possible such pairing is considered, not just adjacent ones.' },
      { term: 'concordant', meaning: 'the pair where the model scored the positive HIGHER than the negative — the ranking the model "should" produce.' },
      { term: 'discordant', meaning: 'the pair where the model scored the negative higher than the positive — a ranking mistake.' },
      { term: 'tied (0.5 credit)', meaning: 'the pair where both got the exact same probability — counted as half a win, since the model expressed no preference either way.' },
      { term: 'AUC', meaning: 'the fraction of all pairs that were concordant (with ties at half weight) — 0.5 means no better than random guessing, 1.0 means every positive outranked every negative.' },
    ],
    datasetCsv: `photo,true_label,predicted_prob
1,weed,0.85
2,not_weed,0.30
3,weed,0.72
4,weed,0.40
5,not_weed,0.55
6,not_weed,0.20
7,weed,0.90
8,not_weed,0.35
9,weed,0.60
10,not_weed,0.45`,
    code: `import csv
import io
from sklearn.metrics import roc_auc_score

csv_text = """photo,true_label,predicted_prob
1,weed,0.85
2,not_weed,0.30
3,weed,0.72
4,weed,0.40
5,not_weed,0.55
6,not_weed,0.20
7,weed,0.90
8,not_weed,0.35
9,weed,0.60
10,not_weed,0.45"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
y_true = [r["true_label"] for r in rows]
y_prob = [float(r["predicted_prob"]) for r in rows]

positives = [p for t, p in zip(y_true, y_prob) if t == "weed"]
negatives = [p for t, p in zip(y_true, y_prob) if t == "not_weed"]
print(f"positive (weed) probabilities: {positives}")
print(f"negative (not_weed) probabilities: {negatives}")

# AUC = the fraction of ALL (positive, negative) pairs where the model scored
# the positive higher than the negative -- count them directly.
concordant = 0
discordant = 0
tied = 0
total_pairs = 0
for pos in positives:
    for neg in negatives:
        total_pairs += 1
        if pos > neg:
            concordant += 1
        elif pos < neg:
            discordant += 1
        else:
            tied += 1
print(f"total (positive, negative) pairs = {len(positives)} * {len(negatives)} = {total_pairs}")
print(f"concordant (positive scored higher) = {concordant}")
print(f"discordant (negative scored higher) = {discordant}")
print(f"tied = {tied}")

auc = (concordant + 0.5 * tied) / total_pairs
print(f"AUC = (concordant + 0.5*tied) / total_pairs = ({concordant} + 0.5*{tied}) / {total_pairs} = {auc:.2f}")

# check: sklearn agrees
y_true_bin = [1 if t == "weed" else 0 for t in y_true]
print(f"check: sklearn.metrics.roc_auc_score = {roc_auc_score(y_true_bin, y_prob):.2f}")`,
    datasetNote: 'True "is it a weed?" labels plus the model\'s predicted probability of "weed" for 10 leaf photos.',
    output:
      'positive (weed) probabilities: [0.85, 0.72, 0.4, 0.9, 0.6]\n' +
      'negative (not_weed) probabilities: [0.3, 0.55, 0.2, 0.35, 0.45]\n' +
      'total (positive, negative) pairs = 5 * 5 = 25\n' +
      'concordant (positive scored higher) = 23\n' +
      'discordant (negative scored higher) = 2\n' +
      'tied = 0\n' +
      'AUC = (concordant + 0.5*tied) / total_pairs = (23 + 0.5*0) / 25 = 0.92\n' +
      'check: sklearn.metrics.roc_auc_score = 0.92',
    caveat:
      'AUC IS exactly this pair-counting probability ("if I pick one random positive and one random negative, how often does the positive score higher?") — it is not a separate approximation of it. A tiny hand-picked dataset like this one is still worth checking on a held-out test set the model never saw during training before trusting the number.',
  },

  // ─── Category E — Multiple testing ───────────────────────────────────────
  {
    id: 'q-value-fdr',
    title: 'Q-values / False Discovery Rate (Benjamini–Hochberg)',
    category: 'multiple-testing',
    aliases: ['fdr', 'multiple comparisons', 'multipletests', 'benjamini-hochberg'],
    definition:
      "When you run MANY p-value tests at once (say, 6 different conditions each compared to a control), the 0.05 significance cutoff no longer means what it usually means — by pure chance alone, roughly 1 in 20 truly-null tests will produce a p-value below 0.05, so testing 6 things gives noticeably more opportunity for a fluke to sneak through than testing just one. The Benjamini–Hochberg procedure fixes this by NOT comparing every p-value to the same fixed 0.05 line. Instead it sorts all your p-values from smallest to largest and gives each rank its OWN, progressively looser threshold — the smallest p-value is held to the strictest standard, the largest to the most lenient — and then finds the largest rank that still clears its own threshold; everything at or below that rank is called significant together, as a block, rather than one at a time. The resulting q-value is essentially each p-value rescaled by how many tests you ran and where it sits in the ranking, giving you a number you can still compare to a familiar cutoff like 0.05, but one that has already accounted for the extra false-positive risk of testing many things at once.",
    whenToUse:
      "Use it whenever you compute more than a handful of p-values in one project (e.g. testing 6 different fertilizer additives against a control) — comparing each raw p-value to 0.05 without adjustment inflates your false-positive rate.",
    formula: 'reject rank i if p₍ᵢ₎ ≤ (i/m)·Q,  for the largest such i  ·  q₍ᵢ₎ = min_{j≥i}( p₍ⱼ₎·m/j )',
    formulaBreakdown: [
      { term: 'p₍ᵢ₎', meaning: 'the p-values sorted smallest to largest, with i as the rank (1 = smallest p-value).' },
      { term: 'm', meaning: 'the total number of tests you ran (6 conditions here) — the more tests, the stricter every threshold becomes.' },
      { term: 'Q', meaning: 'the false-discovery rate you\'re willing to tolerate (0.05 here) — analogous to the usual significance level, but interpreted across the whole batch of tests rather than one at a time.' },
      { term: '(i/m)·Q', meaning: 'each rank\'s own personal threshold — small for low ranks (strict), progressively larger for higher ranks (lenient); rank i passes if its p-value falls at or under this line.' },
      { term: 'largest such i', meaning: 'find the single largest rank that still clears its own threshold — every rank from 1 up through that one is declared significant TOGETHER, which is what makes this a "step-up" procedure rather than a rank-by-rank decision.' },
      { term: 'q₍ᵢ₎ = min_{j≥i}(p₍ⱼ₎·m/j)', meaning: 'each rank\'s q-value starts as its own p-value rescaled by m/i, then gets replaced by the smallest such rescaled value at or above its rank — this "running minimum" guarantees q-values never decrease as raw p-values increase.' },
    ],
    datasetCsv: `condition,p_value
1,0.001
2,0.008
3,0.02
4,0.03
5,0.04
6,0.20`,
    code: `import csv
import io
from statsmodels.stats.multitest import multipletests

csv_text = """condition,p_value
1,0.001
2,0.008
3,0.02
4,0.03
5,0.04
6,0.20"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
conditions = [int(r["condition"]) for r in rows]
p_values = [float(r["p_value"]) for r in rows]

m = len(p_values)
Q = 0.05  # the FDR level we're willing to tolerate

# Benjamini-Hochberg, step by step:
# 1. Sort the p-values smallest to largest, keeping track of rank i.
order = sorted(range(m), key=lambda idx: p_values[idx])
sorted_p = [p_values[idx] for idx in order]
print(f"sorted p-values (smallest to largest): {sorted_p}")

# 2. For each rank i, compute the BH threshold (i/m)*Q and compare.
thresholds = []
passes = []
for i, p in enumerate(sorted_p, start=1):
    threshold = (i / m) * Q
    passes_threshold = p <= threshold
    thresholds.append(threshold)
    passes.append(passes_threshold)
    print(f"  rank {i}: p={p:.3f}  threshold=(i/m)*Q=({i}/{m})*{Q}={threshold:.4f}  p<=threshold? {passes_threshold}")

# 3. Find the LARGEST rank that still passes -- every rank at or below it is
#    called significant (this is what makes BH a "step-up" procedure).
passing_ranks = [i for i, ok in enumerate(passes, start=1) if ok]
largest_passing_rank = max(passing_ranks) if passing_ranks else 0
print(f"largest passing rank = {largest_passing_rank} -> ranks 1..{largest_passing_rank} are significant")

# 4. Each rank's raw q-value is p*m/rank; take the running minimum from the
#    largest rank down so q-values never decrease as p grows (the "step-up" fix).
raw_q = [p * m / i for i, p in enumerate(sorted_p, start=1)]
q_values = raw_q[:]
for i in range(m - 2, -1, -1):
    q_values[i] = min(q_values[i], q_values[i + 1])
q_values = [min(q, 1.0) for q in q_values]

for rank, (idx, p, q) in enumerate(zip(order, sorted_p, q_values), start=1):
    reject = rank <= largest_passing_rank
    print(f"Condition {conditions[idx]}: p={p:.3f}  q={q:.3f}  reject={reject}")

# check: statsmodels' multipletests agrees
reject_check, q_check, _, _ = multipletests(p_values, alpha=Q, method="fdr_bh")
reject_list = [bool(r) for r in reject_check]
q_list = [round(float(q), 3) for q in q_check]
print(f"check: statsmodels multipletests -> reject={reject_list}, q={q_list}")`,
    datasetNote: 'Six raw p-values from testing six different conditions against a shared control.',
    output:
      'sorted p-values (smallest to largest): [0.001, 0.008, 0.02, 0.03, 0.04, 0.2]\n' +
      '  rank 1: p=0.001  threshold=(i/m)*Q=(1/6)*0.05=0.0083  p<=threshold? True\n' +
      '  rank 2: p=0.008  threshold=(i/m)*Q=(2/6)*0.05=0.0167  p<=threshold? True\n' +
      '  rank 3: p=0.020  threshold=(i/m)*Q=(3/6)*0.05=0.0250  p<=threshold? True\n' +
      '  rank 4: p=0.030  threshold=(i/m)*Q=(4/6)*0.05=0.0333  p<=threshold? True\n' +
      '  rank 5: p=0.040  threshold=(i/m)*Q=(5/6)*0.05=0.0417  p<=threshold? True\n' +
      '  rank 6: p=0.200  threshold=(i/m)*Q=(6/6)*0.05=0.0500  p<=threshold? False\n' +
      'largest passing rank = 5 -> ranks 1..5 are significant\n' +
      'Condition 1: p=0.001  q=0.006  reject=True\n' +
      'Condition 2: p=0.008  q=0.024  reject=True\n' +
      'Condition 3: p=0.020  q=0.040  reject=True\n' +
      'Condition 4: p=0.030  q=0.045  reject=True\n' +
      'Condition 5: p=0.040  q=0.048  reject=True\n' +
      'Condition 6: p=0.200  q=0.200  reject=False\n' +
      'check: statsmodels multipletests -> reject=[True, True, True, True, True, False], q=[0.006, 0.024, 0.04, 0.045, 0.048, 0.2]',
    caveat:
      "Q-values are always >= the original p-values (the correction only ever makes them look LESS significant, never more) — the last condition's p=0.20 stays clearly non-significant, but even condition 5's borderline p=0.04 survives the correction here because it is one of several small p-values.",
  },
  // ─── New descriptive statistics (regenerated) ────────────────────────────
  {
    id: "z-score",
    title: "Z-score (standard score)",
    category: "descriptive",
    aliases: ["standard score","standardized value","sigma above mean"],
    definition:
      "A z-score rewrites a single measurement as \"how many standard deviations away from the mean it sits\" — subtract the mean to recenter the value on zero, then divide by the standard deviation to rescale distances into SD-units. That two-step recenter-then-rescale is the whole idea: it strips out both where a dataset happens to sit (a 95 on a hard test and a 95 on an easy one are not equally impressive) and how spread out it is, so scores from completely different measurements become directly comparable on one universal scale. A z of 0 is exactly average, a positive z is above the mean, and roughly two-thirds of a bell-shaped dataset falls between z = −1 and z = +1. Reach for it when you need to say how unusual one value is relative to its own group, or to put two differently-scaled variables on equal footing before comparing or combining them.",
    whenToUse:
      "Use it to judge how unusual one data point is (e.g. is a 95 on your quiz genuinely exceptional given the class spread?), or to put two different measurements on the same scale before comparing them.",
    formula: "z = (x − x̄) / s",
    formulaBreakdown: [
      { term: "x", meaning: "the single measurement you want to standardize (the score 95 here)." },
      { term: "x − x̄", meaning: "recenter: subtract the sample mean so the value is expressed as a distance from average, not an absolute number — this makes 0 mean \"exactly average.\"" },
      { term: "s", meaning: "the sample standard deviation — dividing by it rescales that distance into \"number of SDs,\" so a gap counts as large only relative to how much the data normally varies." },
      { term: "z", meaning: "the result: positive means above the mean, negative below, and its magnitude is how many standard deviations from the mean the point lies." },
    ],
    datasetCsv: "student,score\n1,72\n2,85\n3,90\n4,68\n5,77\n6,95\n7,81\n8,74",
    code: "import csv\nimport io\nfrom scipy import stats\n\ncsv_text = \"\"\"student,score\n1,72\n2,85\n3,90\n4,68\n5,77\n6,95\n7,81\n8,74\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\nscores = [float(r[\"score\"]) for r in rows]\n\nn = len(scores)\nmean = sum(scores) / n\nprint(f\"mean = {mean:.2f}\")\n\nsum_sq = sum((x - mean) ** 2 for x in scores)\nsd = (sum_sq / (n - 1)) ** 0.5\nprint(f\"sample SD = {sd:.2f}\")\n\ntarget = 95.0\nz = (target - mean) / sd\nprint(f\"z for score {target:.0f} = (x - mean) / SD = ({target:.0f} - {mean:.2f}) / {sd:.2f} = {z:.2f}\")\nprint(f\"interpretation: score {target:.0f} sits {z:.2f} SDs above the mean\")\n\n# check: scipy.stats.zscore (uses population SD, ddof=0 by default; pass ddof=1 to match)\nzs = stats.zscore(scores, ddof=1)\nprint(f\"check: scipy.stats.zscore(ddof=1) for {target:.0f} = {zs[5]:.2f}\")",
    datasetNote: "Eight quiz scores from one class; we standardize the top score (95).",
    output: "mean = 80.25\nsample SD = 9.29\nz for score 95 = (x - mean) / SD = (95 - 80.25) / 9.29 = 1.59\ninterpretation: score 95 sits 1.59 SDs above the mean\ncheck: scipy.stats.zscore(ddof=1) for 95 = 1.59",
    caveat:
      "A z-score only says how far from the mean a point is IN SD UNITS — it does not by itself give a probability unless the data is roughly bell-shaped, and it uses the same sample mean/SD the point helped compute, so with a tiny n a single extreme value can shrink its own z.",
  },
  {
    id: "percentile-quantile",
    title: "Percentile / quantile",
    category: "descriptive",
    aliases: ["percentile","quantile","percentile rank"],
    definition:
      "A percentile answers \"what value is this fraction of the way through the sorted data?\" — the 90th percentile is the height that 90% of your measurements fall below. You find it by sorting the data and walking to the position that fraction of the way along the list; when that position lands between two data points, the common convention (numpy's default) is to interpolate linearly between the two neighbors rather than jump to one of them. Because the whole calculation is built from ranks and positions rather than distances from a mean, percentiles are unbothered by how extreme the largest value is — they describe the SHAPE of a distribution by its cut-points. Percentiles are just quantiles expressed on a 0–100 scale (the 90th percentile is the 0.9 quantile), and familiar summaries are special cases: the median is the 50th percentile, Q1 and Q3 are the 25th and 75th.",
    whenToUse:
      "Use it to report a threshold or a rank (e.g. \"the tallest 10% of seedlings\" or \"your value beats 90% of the sample\"), and to describe a skewed distribution's shape without being misled by its extreme tail.",
    formula: "rank = (p/100)·(n − 1)  ·  Pₚ = x₍⌊rank⌋₎ + frac·( x₍⌊rank⌋₊₁₎ − x₍⌊rank⌋₎ )",
    formulaBreakdown: [
      { term: "sorted xᵢ", meaning: "line the data up smallest-to-largest — percentiles depend only on order, not on how far apart the values are." },
      { term: "p", meaning: "the percentile you want (90 here); p/100 turns it into a fraction of the way through the list." },
      { term: "rank = (p/100)·(n−1)", meaning: "the 0-based position that fraction of the way along a list of n items — often not a whole number, which is why the next step interpolates." },
      { term: "⌊rank⌋ and frac", meaning: "⌊rank⌋ is the integer part (the lower of the two straddling indices) and frac is the leftover fractional part used to blend between the two neighbors." },
      { term: "Pₚ = xₗₒ + frac·(xₕᵢ − xₗₒ)", meaning: "linear interpolation: start at the lower neighbor and move `frac` of the way toward the upper neighbor — the value at that in-between position is the percentile." },
    ],
    datasetCsv: "seedling,height_cm\n1,8.2\n2,11.5\n3,9.7\n4,14.1\n5,10.3\n6,12.8\n7,7.9\n8,13.4\n9,10.9\n10,9.1",
    code: "import csv\nimport io\nimport numpy as np\n\ncsv_text = \"\"\"seedling,height_cm\n1,8.2\n2,11.5\n3,9.7\n4,14.1\n5,10.3\n6,12.8\n7,7.9\n8,13.4\n9,10.9\n10,9.1\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\nheights = [float(r[\"height_cm\"]) for r in rows]\n\nsorted_h = sorted(heights)\nn = len(sorted_h)\nprint(f\"sorted: {sorted_h}\")\n\npct = 90.0\n# linear-interpolation method (numpy's default 'linear') on a 0-based rank\nrank = (pct / 100) * (n - 1)\nlo = int(rank)\nfrac = rank - lo\nprint(f\"rank = (p/100)*(n-1) = ({pct:.0f}/100)*({n}-1) = {rank:.2f}\")\nprint(f\"lower index = {lo}, fractional part = {frac:.2f}\")\n\nlo_val = sorted_h[lo]\nhi_val = sorted_h[lo + 1] if lo + 1 < n else sorted_h[lo]\np90 = lo_val + frac * (hi_val - lo_val)\nprint(f\"interpolate: {lo_val} + {frac:.2f}*({hi_val} - {lo_val}) = {p90:.2f} cm\")\nprint(f\"the 90th percentile height is {p90:.2f} cm (90% of seedlings are shorter)\")\n\n# check: numpy agrees\nprint(f\"check: np.percentile(heights, 90) = {np.percentile(heights, 90):.2f} cm\")",
    datasetNote: "Ten seedling heights (cm); we compute the 90th percentile.",
    output: "sorted: [7.9, 8.2, 9.1, 9.7, 10.3, 10.9, 11.5, 12.8, 13.4, 14.1]\nrank = (p/100)*(n-1) = (90/100)*(10-1) = 8.10\nlower index = 8, fractional part = 0.10\ninterpolate: 13.4 + 0.10*(14.1 - 13.4) = 13.47 cm\nthe 90th percentile height is 13.47 cm (90% of seedlings are shorter)\ncheck: np.percentile(heights, 90) = 13.47 cm",
    caveat:
      "There are several accepted ways to interpolate a percentile between two data points (numpy alone offers nine `method=` options), so a percentile from one tool can differ slightly from another's — with small samples, state which method you used.",
  },
  {
    id: "coefficient-of-variation",
    title: "Coefficient of variation (CV)",
    category: "descriptive",
    aliases: ["cv","relative standard deviation","rsd"],
    definition:
      "The coefficient of variation expresses spread RELATIVE to the size of what you're measuring: divide the standard deviation by the mean (usually then times 100 for a percentage). This makes it unitless, which is exactly the point — a raw standard deviation of 25 grams and 0.17 milligrams live on incomparable scales, but once each is divided by its own mean they can be ranked on the same \"how noisy is this measurement, proportionally?\" axis. That is why a variable with a huge SD can actually be the MORE precise of two once you account for its large average, and why CV is the standard way to compare the consistency of instruments, assays, or measurements that operate at wildly different magnitudes. It only makes sense for ratio-scale data with a meaningful, positive zero (weights, counts, concentrations) — never for things like temperature in Celsius, where the zero is arbitrary.",
    whenToUse:
      "Use it to compare the relative consistency of two measurements on different scales (e.g. is your protein assay noisier than your mass measurement, proportionally?), where a raw SD comparison would be meaningless.",
    formula: "CV = ( s / x̄ ) · 100%",
    formulaBreakdown: [
      { term: "s", meaning: "the sample standard deviation — the absolute spread, in the data's own units." },
      { term: "x̄", meaning: "the sample mean — dividing by it converts the spread into a fraction of the typical value, cancelling the units." },
      { term: "s / x̄", meaning: "the unitless ratio of spread to size — this is what lets differently-scaled measurements be compared at all." },
      { term: "· 100%", meaning: "scale the ratio into a percentage, the conventional way CV is reported (e.g. 7.84% means the SD is about 8% of the mean)." },
    ],
    datasetCsv: "assay,protein_mg,mass_g\n1,2.10,512\n2,2.35,548\n3,1.98,497\n4,2.22,531\n5,2.05,505\n6,2.41,560",
    code: "import csv\nimport io\nfrom scipy import stats\n\ncsv_text = \"\"\"assay,protein_mg,mass_g\n1,2.10,512\n2,2.35,548\n3,1.98,497\n4,2.22,531\n5,2.05,505\n6,2.41,560\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\nprotein = [float(r[\"protein_mg\"]) for r in rows]\nmass = [float(r[\"mass_g\"]) for r in rows]\n\n\ndef cv_percent(values):\n    n = len(values)\n    mean = sum(values) / n\n    sum_sq = sum((x - mean) ** 2 for x in values)\n    sd = (sum_sq / (n - 1)) ** 0.5\n    return mean, sd, (sd / mean) * 100\n\n\np_mean, p_sd, p_cv = cv_percent(protein)\nm_mean, m_sd, m_cv = cv_percent(mass)\nprint(f\"protein: mean = {p_mean:.4f} mg, SD = {p_sd:.4f} mg\")\nprint(f\"protein CV = (SD / mean) * 100 = ({p_sd:.4f} / {p_mean:.4f}) * 100 = {p_cv:.2f}%\")\nprint(f\"mass:    mean = {m_mean:.4f} g, SD = {m_sd:.4f} g\")\nprint(f\"mass CV = (SD / mean) * 100 = ({m_sd:.4f} / {m_mean:.4f}) * 100 = {m_cv:.2f}%\")\nprint(f\"despite mass's far larger SD ({m_sd:.2f} vs {p_sd:.2f}), protein is the noisier measure by CV\")\n\n# check: scipy.stats.variation gives the population CV (ddof=0) as a raw ratio; scale to sample %\nprint(f\"check: scipy.stats.variation(protein, ddof=1)*100 = {stats.variation(protein, ddof=1) * 100:.2f}%\")",
    datasetNote: "Six assays measuring both protein (mg) and sample mass (g), on wildly different scales.",
    output: "protein: mean = 2.1850 mg, SD = 0.1712 mg\nprotein CV = (SD / mean) * 100 = (0.1712 / 2.1850) * 100 = 7.84%\nmass:    mean = 525.5000 g, SD = 25.0659 g\nmass CV = (SD / mean) * 100 = (25.0659 / 525.5000) * 100 = 4.77%\ndespite mass's far larger SD (25.07 vs 0.17), protein is the noisier measure by CV\ncheck: scipy.stats.variation(protein, ddof=1)*100 = 7.84%",
    caveat:
      "CV is only meaningful for ratio-scale data with a true, positive zero — never use it on Celsius temperatures or anything that can be zero or negative, because dividing by a mean near zero explodes the value and makes it nonsense.",
  },
  {
    id: "geometric-mean",
    title: "Geometric mean",
    category: "descriptive",
    aliases: ["geomean","growth-rate average","log-average"],
    definition:
      "The geometric mean is the right average for things that MULTIPLY rather than add — growth rates, fold-changes, ratios, anything compounding. Instead of summing the values and dividing, you multiply them all together and take the n-th root, which finds the single constant factor that, applied over and over, reproduces the same overall change as the actual varying factors did. That's the whole intuition: a bacterial culture that triples one day and barely grows the next isn't well-summarized by the arithmetic average of its factors, because averaging by addition ignores that the effects stack multiplicatively. The geometric mean is always ≤ the arithmetic mean (equal only when every value is identical), it requires all-positive data, and it is exactly the arithmetic mean carried out in log-space then converted back — averaging the logs is the same as taking the n-th root of the product.",
    whenToUse:
      "Use it to average growth rates, fold-changes, ratios, or anything that compounds (e.g. day-to-day population growth factors), where the arithmetic mean would overstate the true typical rate.",
    formula: "GM = ( ∏ xᵢ )^(1/n) = ( x₁ · x₂ · … · xₙ )^(1/n)",
    formulaBreakdown: [
      { term: "xᵢ", meaning: "each value being averaged — here the day-to-day growth factors (each day's count divided by the previous day's), all strictly positive." },
      { term: "∏ xᵢ", meaning: "the PRODUCT (∏, \"capital pi\") of all the values multiplied together — the multiplicative analogue of the sum Σ used in an ordinary mean." },
      { term: "^(1/n)", meaning: "take the n-th root of that product — the multiplicative analogue of dividing a sum by n, it finds the constant factor that would compound to the same total." },
      { term: "GM", meaning: "the geometric mean: the single steady factor that reproduces the overall multiplicative change; apply it n times to the start value and you recover the end value." },
    ],
    datasetCsv: "day,bacteria_count\n0,120\n1,260\n2,540\n3,1180\n4,2500\n5,5300",
    code: "import csv\nimport io\nfrom scipy import stats\n\ncsv_text = \"\"\"day,bacteria_count\n0,120\n1,260\n2,540\n3,1180\n4,2500\n5,5300\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\ncounts = [float(r[\"bacteria_count\"]) for r in rows]\n\n# growth factors from one day to the next\nfactors = [counts[i + 1] / counts[i] for i in range(len(counts) - 1)]\nprint(f\"day-to-day growth factors: {[round(f, 4) for f in factors]}\")\n\nk = len(factors)\nproduct = 1.0\nfor f in factors:\n    product *= f\nprint(f\"product of factors = {product:.4f}\")\n\ngmean = product ** (1 / k)\nprint(f\"geometric mean = (product)^(1/k) = {product:.4f}^(1/{k}) = {gmean:.4f}\")\n\narith = sum(factors) / k\nprint(f\"(for contrast) arithmetic mean of factors = {arith:.4f}\")\nprint(f\"applying the geo-mean factor {gmean:.4f} for {k} days: {counts[0]:.0f} * {gmean:.4f}^{k} = {counts[0] * gmean ** k:.0f} (recovers the final count)\")\n\n# check: scipy agrees\nprint(f\"check: scipy.stats.gmean(factors) = {stats.gmean(factors):.4f}\")",
    datasetNote: "A bacterial colony counted daily; we average its day-to-day growth factors.",
    output: "day-to-day growth factors: [2.1667, 2.0769, 2.1852, 2.1186, 2.12]\nproduct of factors = 44.1667\ngeometric mean = (product)^(1/k) = 44.1667^(1/5) = 2.1331\n(for contrast) arithmetic mean of factors = 2.1335\napplying the geo-mean factor 2.1331 for 5 days: 120 * 2.1331^5 = 5300 (recovers the final count)\ncheck: scipy.stats.gmean(factors) = 2.1331",
    caveat:
      "The geometric mean requires all values to be strictly positive — a single zero collapses the whole product (and thus the mean) to zero, and negatives make the root undefined, so it can't be used on data that crosses zero.",
  },
  {
    id: "harmonic-mean",
    title: "Harmonic mean",
    category: "descriptive",
    aliases: ["hmean","rate average","average of rates"],
    definition:
      "The harmonic mean is the correct average when your data are RATES and you're averaging over a fixed amount of the thing in the denominator — like averaging speeds (km per hour) over equal distances, not equal times. You compute it by averaging the reciprocals of the values and then flipping the result back: n divided by the sum of 1/xᵢ. The reason this works is that a plain arithmetic average of speeds silently assumes you spent equal TIME at each speed, but when you cover equal DISTANCE you actually spend more time at the slower speeds — so those slow legs deserve more weight, which taking reciprocals does automatically. The harmonic mean is always ≤ the geometric mean ≤ the arithmetic mean, and it is the same quantity the F1-score uses to average precision and recall, precisely because it refuses to let one large value paper over a small one.",
    whenToUse:
      "Use it to average rates or ratios over a fixed base (e.g. average speed across equal-distance legs, or averaging precision and recall into an F1-score), where an arithmetic mean would be biased high.",
    formula: "HM = n / ( Σ 1/xᵢ )",
    formulaBreakdown: [
      { term: "xᵢ", meaning: "each rate being averaged — here the speed on each leg of the trip, all positive." },
      { term: "1/xᵢ", meaning: "the reciprocal of each rate (h/km if the rate is km/h) — flipping to reciprocals is what gives slower/smaller values their proper extra weight." },
      { term: "Σ 1/xᵢ", meaning: "add up all the reciprocals — for equal-distance legs this is proportional to the total time spent." },
      { term: "n / (Σ 1/xᵢ)", meaning: "divide the count by that reciprocal-sum and you flip back to the original units — the single steady rate that would take the same total time over the same total distance." },
    ],
    datasetCsv: "leg,distance_km,speed_kmh\n1,3.0,12.0\n2,3.0,6.0\n3,3.0,9.0\n4,3.0,18.0",
    code: "import csv\nimport io\nfrom scipy import stats\n\ncsv_text = \"\"\"leg,distance_km,speed_kmh\n1,3.0,12.0\n2,3.0,6.0\n3,3.0,9.0\n4,3.0,18.0\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\nspeeds = [float(r[\"speed_kmh\"]) for r in rows]\n\nn = len(speeds)\nreciprocals = [1 / s for s in speeds]\nprint(f\"speeds (km/h): {speeds}\")\nprint(f\"reciprocals (h/km): {[round(r, 5) for r in reciprocals]}\")\n\nsum_recip = sum(reciprocals)\nprint(f\"sum of reciprocals = {sum_recip:.5f}\")\n\nhmean = n / sum_recip\nprint(f\"harmonic mean = n / sum(1/x) = {n} / {sum_recip:.5f} = {hmean:.4f} km/h\")\n\narith = sum(speeds) / n\nprint(f\"(for contrast) arithmetic mean = {arith:.4f} km/h -- overstates the true average speed\")\n\n# sanity: equal 3 km legs, total distance / total time should equal the harmonic mean\ntotal_dist = 3.0 * n\ntotal_time = sum(3.0 / s for s in speeds)\nprint(f\"true avg speed = total dist / total time = {total_dist:.1f} / {total_time:.4f} = {total_dist / total_time:.4f} km/h\")\n\n# check: scipy agrees\nprint(f\"check: scipy.stats.hmean(speeds) = {stats.hmean(speeds):.4f}\")",
    datasetNote: "Four equal-distance (3 km) legs of a course, each run at a different speed.",
    output: "speeds (km/h): [12.0, 6.0, 9.0, 18.0]\nreciprocals (h/km): [0.08333, 0.16667, 0.11111, 0.05556]\nsum of reciprocals = 0.41667\nharmonic mean = n / sum(1/x) = 4 / 0.41667 = 9.6000 km/h\n(for contrast) arithmetic mean = 11.2500 km/h -- overstates the true average speed\ntrue avg speed = total dist / total time = 12.0 / 1.2500 = 9.6000 km/h\ncheck: scipy.stats.hmean(speeds) = 9.6000",
    caveat:
      "The harmonic mean is only the correct average when the quantity in the denominator (distance here) is held equal across the values — if the legs had different distances you would need a distance-weighted harmonic mean instead, and like the geometric mean it requires all-positive values.",
  },
  {
    id: "weighted-mean",
    title: "Weighted mean",
    category: "descriptive",
    aliases: ["weighted average","weighted mean"],
    definition:
      "A weighted mean lets some measurements count more than others toward the average, instead of giving every value an equal vote like an ordinary mean does. You multiply each value by its weight, add up those products, and divide by the SUM of the weights (not by the count) — the division by total weight is what keeps the result on the same scale as the original values. The intuition is that a group mean built from 20 plants is a more trustworthy summary than one built from 3 plants, so when you combine per-group averages into one overall number, the bigger groups should pull harder. Any positive numbers can serve as weights: sample sizes, reliabilities, importance, or inverse variances. Set every weight equal and the formula collapses back into the plain arithmetic mean, which is just the special case where all measurements count the same.",
    whenToUse:
      "Use it when combining sub-group averages that rest on different amounts of data (e.g. pooling five plots' mean yields into one figure), so a plot with 20 plants counts more than one with 3.",
    formula: "x̄_w = ( Σ wᵢ·xᵢ ) / ( Σ wᵢ )",
    formulaBreakdown: [
      { term: "xᵢ", meaning: "each value being averaged — here each plot's mean yield." },
      { term: "wᵢ", meaning: "the weight attached to that value — here the number of plants the plot's mean was based on, so more-supported values count more." },
      { term: "Σ wᵢ·xᵢ", meaning: "multiply every value by its weight and sum the products — values with bigger weights contribute proportionally more to this total." },
      { term: "Σ wᵢ", meaning: "the sum of the weights — dividing by this (not by n) is what renormalizes the weighted total back onto the scale of the original values." },
      { term: "x̄_w", meaning: "the weighted mean; if every wᵢ is equal this reduces exactly to the ordinary mean ( Σxᵢ ) / n." },
    ],
    datasetCsv: "plot,mean_yield_g,n_plants\nA,42.5,12\nB,38.0,5\nC,45.2,20\nD,40.1,8\nE,36.7,3",
    code: "import csv\nimport io\nimport numpy as np\n\ncsv_text = \"\"\"plot,mean_yield_g,n_plants\nA,42.5,12\nB,38.0,5\nC,45.2,20\nD,40.1,8\nE,36.7,3\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\nvalues = [float(r[\"mean_yield_g\"]) for r in rows]\nweights = [float(r[\"n_plants\"]) for r in rows]\n\nproducts = [v * w for v, w in zip(values, weights)]\nprint(\"value * weight per plot:\")\nfor r, p in zip(rows, products):\n    print(f\"  plot {r['plot']}: {float(r['mean_yield_g'])} * {float(r['n_plants']):.0f} = {p:.1f}\")\n\nsum_products = sum(products)\nsum_weights = sum(weights)\nprint(f\"sum of (value*weight) = {sum_products:.1f}\")\nprint(f\"sum of weights = {sum_weights:.0f}\")\n\nwmean = sum_products / sum_weights\nprint(f\"weighted mean = {sum_products:.1f} / {sum_weights:.0f} = {wmean:.4f} g\")\n\nplain = sum(values) / len(values)\nprint(f\"(for contrast) unweighted mean of the 5 plot means = {plain:.4f} g\")\n\n# check: numpy agrees\nprint(f\"check: np.average(values, weights=weights) = {np.average(values, weights=weights):.4f} g\")",
    datasetNote: "Five plots' mean yields, each based on a different number of plants (the weights).",
    output: "value * weight per plot:\n  plot A: 42.5 * 12 = 510.0\n  plot B: 38.0 * 5 = 190.0\n  plot C: 45.2 * 20 = 904.0\n  plot D: 40.1 * 8 = 320.8\n  plot E: 36.7 * 3 = 110.1\nsum of (value*weight) = 2034.9\nsum of weights = 48\nweighted mean = 2034.9 / 48 = 42.3938 g\n(for contrast) unweighted mean of the 5 plot means = 40.5000 g\ncheck: np.average(values, weights=weights) = 42.3937 g",
    caveat:
      "Divide by the sum of the WEIGHTS, not by the number of groups — dividing by n instead is the classic mistake and gives a meaningless number. (The tiny last-digit gap vs numpy, 42.3938 vs 42.3937, is just float rounding at display precision.)",
  },
  {
    id: "skewness",
    title: "Skewness (asymmetry)",
    category: "descriptive",
    aliases: ["skew","asymmetry","third moment"],
    definition:
      "Skewness measures how lopsided a distribution is — whether it has a long tail stretching off to one side rather than being symmetric like a bell curve. It is the average of the CUBED z-scores of your data: cubing preserves the sign of each deviation (unlike squaring, which throws sign away), so points far out on the right contribute large positive amounts and points far out on the left contribute large negative amounts, and cubing's steep growth means a few extreme-tail points dominate the total. A positive skewness means a long right tail (a handful of unusually large values pulling the mean above the median); negative means a long left tail; near zero means roughly symmetric. It's a quick numerical check on an assumption many tests quietly make — that data is symmetric/normal — and a large skew is your cue to consider the median, a transform, or a nonparametric test instead of the mean and a t-test.",
    whenToUse:
      "Use it to check whether your data is lopsided before trusting the mean or a t-test (e.g. a few huge nests dragging an egg-count distribution's right tail out), which would call for the median or a transform instead.",
    formula: "skew = (1/n) · Σ ( (xᵢ − x̄) / σ )³",
    formulaBreakdown: [
      { term: "xᵢ − x̄", meaning: "each point's deviation from the mean — positive above the mean, negative below." },
      { term: "σ", meaning: "the population standard deviation (dividing by n, not n−1) — this is the divisor scipy.stats.skew uses by default, and it rescales deviations into z-score units so the measure is unitless." },
      { term: "( … )³", meaning: "cube each z-score — cubing KEEPS the sign (a left-tail point stays negative) and amplifies far-out points, so one long tail dominates the sum in its own direction." },
      { term: "(1/n) · Σ", meaning: "average those cubed z-scores over all n points — the third standardized moment." },
      { term: "skew", meaning: "the result: >0 means a longer right tail (mean pulled above the median), <0 a longer left tail, ≈0 symmetric." },
    ],
    datasetCsv: "nest,egg_count\n1,2\n2,3\n3,3\n4,3\n5,4\n6,4\n7,4\n8,5\n9,7\n10,12",
    code: "import csv\nimport io\nfrom scipy import stats\n\ncsv_text = \"\"\"nest,egg_count\n1,2\n2,3\n3,3\n4,3\n5,4\n6,4\n7,4\n8,5\n9,7\n10,12\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\nx = [float(r[\"egg_count\"]) for r in rows]\n\nn = len(x)\nmean = sum(x) / n\nprint(f\"n = {n}, mean = {mean:.2f}\")\n\n# population standard deviation (ddof=0) -- the divisor scipy.stats.skew uses by default\nvar_pop = sum((v - mean) ** 2 for v in x) / n\nsd_pop = var_pop ** 0.5\nprint(f\"population SD (ddof=0) = {sd_pop:.4f}\")\n\n# third standardized moment: mean of cubed z-scores\ncubed_z = [((v - mean) / sd_pop) ** 3 for v in x]\nskew = sum(cubed_z) / n\nprint(f\"skewness = mean of ((x - mean)/SD)^3 = {skew:.4f}\")\nprint(f\"positive skew ({skew:.2f} > 0) => a long right tail (the 12-egg nest) pulls the mean above the median\")\n\nsorted_x = sorted(x)\nmedian = (sorted_x[n // 2 - 1] + sorted_x[n // 2]) / 2\nprint(f\"confirm: mean {mean:.2f} > median {median:.2f}, as positive skew implies\")\n\n# check: scipy agrees (bias=True => same population moment we computed)\nprint(f\"check: scipy.stats.skew(x) = {stats.skew(x):.4f}\")",
    datasetNote: "Egg counts in ten nests, with one unusually large nest (12) stretching the right tail.",
    output: "n = 10, mean = 4.70\npopulation SD (ddof=0) = 2.7586\nskewness = mean of ((x - mean)/SD)^3 = 1.7423\npositive skew (1.74 > 0) => a long right tail (the 12-egg nest) pulls the mean above the median\nconfirm: mean 4.70 > median 4.00, as positive skew implies\ncheck: scipy.stats.skew(x) = 1.7423",
    caveat:
      "This uses the population (biased, ddof=0) definition scipy uses by default; some tools apply a small-sample bias correction (scipy's `bias=False`), which gives a slightly larger value — with a small n the two can differ noticeably, so note which you used.",
  },
  {
    id: "kurtosis",
    title: "Kurtosis (tailedness)",
    category: "descriptive",
    aliases: ["excess kurtosis","tailedness","fourth moment"],
    definition:
      "Kurtosis measures how heavy a distribution's TAILS are — how prone it is to occasional extreme outliers compared with a normal bell curve. It is the average of the FOURTH power of your z-scores: raising to the fourth power makes every term positive and, crucially, weights far-out points enormously (a z of 3 contributes 81, a z of 1 only contributes 1), so the measure is dominated by whatever lives in the tails. By convention we report EXCESS kurtosis: subtract 3, because a perfect normal distribution scores exactly 3, so subtracting it makes 0 the \"normal\" baseline. Positive excess kurtosis means heavier tails and more outlier-prone data than normal (a sharper peak with fatter tails); negative means lighter, more uniform tails with fewer extremes. It's a diagnostic for whether the rare-extreme-value assumptions behind normal-based tests and error bars are safe for your data.",
    whenToUse:
      "Use it to gauge whether your data is more outlier-prone than a normal curve (e.g. a pH log that's usually flat but occasionally spikes wildly), which warns that normal-based tests may under-count extreme events.",
    formula: "excess kurtosis = (1/n)·Σ ( (xᵢ − x̄) / σ )⁴ − 3",
    formulaBreakdown: [
      { term: "xᵢ − x̄", meaning: "each point's deviation from the mean." },
      { term: "σ", meaning: "the population standard deviation (÷n) — scipy.stats.kurtosis's default divisor; it puts deviations into unitless z-score form." },
      { term: "( … )⁴", meaning: "raise each z-score to the fourth power — always positive, and it magnifies far-out tail points so heavily that the tails dominate the whole measure." },
      { term: "(1/n)·Σ", meaning: "average those fourth powers — the fourth standardized moment (the raw, non-excess kurtosis)." },
      { term: "− 3", meaning: "subtract 3 because a perfect normal distribution's fourth moment is exactly 3 — this recenters the scale so 0 = \"normal-tailed,\" giving EXCESS kurtosis (Fisher's definition)." },
    ],
    datasetCsv: "reading,ph\n1,6.9\n2,7.0\n3,7.0\n4,7.1\n5,7.0\n6,6.8\n7,7.2\n8,7.0\n9,5.4\n10,8.6",
    code: "import csv\nimport io\nfrom scipy import stats\n\ncsv_text = \"\"\"reading,ph\n1,6.9\n2,7.0\n3,7.0\n4,7.1\n5,7.0\n6,6.8\n7,7.2\n8,7.0\n9,5.4\n10,8.6\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\nx = [float(r[\"ph\"]) for r in rows]\n\nn = len(x)\nmean = sum(x) / n\nprint(f\"n = {n}, mean = {mean:.4f}\")\n\n# population standard deviation (ddof=0), matching scipy.stats.kurtosis's default divisor\nvar_pop = sum((v - mean) ** 2 for v in x) / n\nsd_pop = var_pop ** 0.5\nprint(f\"population SD (ddof=0) = {sd_pop:.4f}\")\n\n# fourth standardized moment: mean of z^4\nz4 = [((v - mean) / sd_pop) ** 4 for v in x]\nm4 = sum(z4) / n\nprint(f\"fourth standardized moment = mean of ((x-mean)/SD)^4 = {m4:.4f}\")\n\nexcess = m4 - 3\nprint(f\"excess kurtosis = m4 - 3 = {m4:.4f} - 3 = {excess:.4f}\")\nprint(f\"positive excess ({excess:.2f} > 0) => heavier tails than a normal curve (the 5.4 and 8.6 outliers)\")\n\n# check: scipy's Fisher (excess) definition agrees\nprint(f\"check: scipy.stats.kurtosis(x) = {stats.kurtosis(x):.4f}\")",
    datasetNote: "Ten pH readings clustered near 7.0 with two wild spikes (5.4 and 8.6) fattening the tails.",
    output: "n = 10, mean = 7.0000\npopulation SD (ddof=0) = 0.7225\nfourth standardized moment = mean of ((x-mean)/SD)^4 = 4.8115\nexcess kurtosis = m4 - 3 = 4.8115 - 3 = 1.8115\npositive excess (1.81 > 0) => heavier tails than a normal curve (the 5.4 and 8.6 outliers)\ncheck: scipy.stats.kurtosis(x) = 1.8115",
    caveat:
      "\"Kurtosis\" is ambiguous: some tools report the raw fourth moment (normal = 3) and others the excess version (normal = 0), and small samples add bias — this uses scipy's default excess (Fisher, ddof=0), so always state which convention a reported number follows.",
  },
  {
    id: "range-spread",
    title: "Range (max − min)",
    category: "descriptive",
    aliases: ["range","peak-to-peak","spread"],
    definition:
      "The range is the simplest possible measure of spread: the largest value minus the smallest. It tells you the full width your measurements span — the total swing from the lowest reading to the highest — in the original units, and it takes only a sort (or a single pass for the min and max) to compute. Its very simplicity is also its weakness: because it is built from exactly the two most extreme points and ignores everything in between, it is completely at the mercy of outliers, and it tends to grow just because you collected more data (more measurements means more chances to catch a new record high or low). Reach for it as a fast, intuitive sanity check on how much your quantity varied — \"the incubator swung 7 degrees overnight\" — but lean on SD, IQR, or MAD when you want a spread measure that reflects the bulk of the data rather than only its two endpoints.",
    whenToUse:
      "Use it as a quick, intuitive statement of total spread (e.g. how many degrees an incubator drifted overnight), but not as your main spread measure when outliers or sample size could distort it.",
    formula: "range = max(xᵢ) − min(xᵢ)",
    formulaBreakdown: [
      { term: "max(xᵢ)", meaning: "the single largest measurement in the dataset — the top of the sorted list." },
      { term: "min(xᵢ)", meaning: "the single smallest measurement — the bottom of the sorted list." },
      { term: "max − min", meaning: "subtract to get the full width the data spans, in the original units; only these two endpoints matter, so every value in between is ignored." },
    ],
    datasetCsv: "hour,temp_c\n0,18.4\n1,17.9\n2,19.2\n3,22.6\n4,25.1\n5,24.3\n6,21.0\n7,19.8",
    code: "import csv\nimport io\nimport numpy as np\n\ncsv_text = \"\"\"hour,temp_c\n0,18.4\n1,17.9\n2,19.2\n3,22.6\n4,25.1\n5,24.3\n6,21.0\n7,19.8\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\ntemps = [float(r[\"temp_c\"]) for r in rows]\n\nsorted_t = sorted(temps)\nprint(f\"sorted: {sorted_t}\")\n\nminimum = sorted_t[0]\nmaximum = sorted_t[-1]\nprint(f\"min = {minimum:.1f} C, max = {maximum:.1f} C\")\n\ndata_range = maximum - minimum\nprint(f\"range = max - min = {maximum:.1f} - {minimum:.1f} = {data_range:.1f} C\")\nprint(f\"the incubator swung {data_range:.1f} C over the 8 readings\")\n\n# check: numpy's peak-to-peak (ptp) agrees\nprint(f\"check: np.ptp(temps) = {np.ptp(temps):.1f} C\")",
    datasetNote: "Eight hourly incubator temperature readings (deg C) over one night.",
    output: "sorted: [17.9, 18.4, 19.2, 19.8, 21.0, 22.6, 24.3, 25.1]\nmin = 17.9 C, max = 25.1 C\nrange = max - min = 25.1 - 17.9 = 7.2 C\nthe incubator swung 7.2 C over the 8 readings\ncheck: np.ptp(temps) = 7.2 C",
    caveat:
      "The range depends on ONLY the two most extreme values, so a single outlier defines it entirely, and it tends to grow simply as you collect more data — never use it to compare spread between samples of different sizes.",
  },
  {
    id: "median-absolute-deviation",
    title: "Median absolute deviation (MAD)",
    category: "descriptive",
    aliases: ["mad","robust spread","robust sd"],
    definition:
      "MAD is a spread measure built to be nearly immune to outliers — the median counterpart of standard deviation. You find the median of the data, measure each point's absolute distance from that median, and then take the median of THOSE distances. The key is that medians are used at both steps instead of means: a single wild outlier can only ever occupy one rank, so it can't inflate the typical distance the way it inflates a mean-based SD (where its squared deviation dominates the sum). Because a normal distribution's MAD is a fixed fraction of its SD, multiplying MAD by the constant 1.4826 rescales it into a robust, drop-in estimate of the standard deviation that a few bad data points can't wreck. Reach for it whenever you suspect outliers or heavy tails and want a spread number that describes the bulk of your data rather than being hijacked by its extremes.",
    whenToUse:
      "Use it instead of SD when outliers are present or suspected (e.g. reaction times with one 900 ms glitch), to get a spread estimate that reflects the typical data rather than the extremes.",
    formula: "MAD = median( | xᵢ − median(x) | )   ·   robust SD ≈ 1.4826 · MAD",
    formulaBreakdown: [
      { term: "median(x)", meaning: "the middle value of the data — the robust center MAD measures spread around, chosen because (unlike the mean) it barely moves when an outlier is present." },
      { term: "| xᵢ − median(x) |", meaning: "each point's ABSOLUTE distance from that median — absolute value (not squaring) keeps every big outlier's contribution linear rather than letting it blow up." },
      { term: "median( … )", meaning: "take the median of those distances — using the median again at this step is what makes MAD ignore a lone huge deviation instead of averaging it in." },
      { term: "1.4826", meaning: "a fixed scaling constant (1/Φ⁻¹(0.75)) — multiply MAD by it and, for normal-ish data, you get a robust stand-in for the standard deviation on the same scale." },
    ],
    datasetCsv: "trial,reaction_time_ms\n1,212\n2,225\n3,198\n4,205\n5,900\n6,215\n7,220\n8,208\n9,230",
    code: "import csv\nimport io\nfrom scipy import stats\n\n\ndef median(vals):\n    s = sorted(vals)\n    m = len(s)\n    mid = m // 2\n    if m % 2 == 1:\n        return s[mid]\n    return (s[mid - 1] + s[mid]) / 2\n\n\ncsv_text = \"\"\"trial,reaction_time_ms\n1,212\n2,225\n3,198\n4,205\n5,900\n6,215\n7,220\n8,208\n9,230\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\ntimes = [float(r[\"reaction_time_ms\"]) for r in rows]\n\nmed = median(times)\nprint(f\"sorted: {sorted(times)}\")\nprint(f\"median = {med:.1f} ms\")\n\nabs_dev = [abs(x - med) for x in times]\nprint(f\"absolute deviations from median: {[round(d, 1) for d in abs_dev]}\")\n\nmad = median(abs_dev)\nprint(f\"MAD = median of absolute deviations = {mad:.1f} ms\")\n\n# scaled MAD approximates SD for normal data (constant 1.4826)\nscaled = 1.4826 * mad\nprint(f\"scaled MAD (x1.4826) = {scaled:.2f} ms -- a robust SD estimate\")\n\n# for contrast, the ordinary SD is wrecked by the 900 ms outlier\nn = len(times)\nmean = sum(times) / n\nsd = (sum((x - mean) ** 2 for x in times) / (n - 1)) ** 0.5\nprint(f\"(for contrast) ordinary sample SD = {sd:.2f} ms -- blown up by the 900 ms trial\")\n\n# check: scipy.stats.median_abs_deviation agrees (scale=1 => raw MAD)\nprint(f\"check: scipy.stats.median_abs_deviation(times) = {stats.median_abs_deviation(times):.1f} ms\")",
    datasetNote: "Nine reaction-time trials (ms) with one gross outlier (900 ms) from a mis-timed trial.",
    output: "sorted: [198.0, 205.0, 208.0, 212.0, 215.0, 220.0, 225.0, 230.0, 900.0]\nmedian = 215.0 ms\nabsolute deviations from median: [3.0, 10.0, 17.0, 10.0, 685.0, 0.0, 5.0, 7.0, 15.0]\nMAD = median of absolute deviations = 10.0 ms\nscaled MAD (x1.4826) = 14.83 ms -- a robust SD estimate\n(for contrast) ordinary sample SD = 228.84 ms -- blown up by the 900 ms trial\ncheck: scipy.stats.median_abs_deviation(times) = 10.0 ms",
    caveat:
      "The 1.4826 scaling only makes MAD a fair SD estimate for roughly normal data — on strongly skewed distributions the two measure genuinely different things, and note scipy's `median_abs_deviation` returns the raw (unscaled) MAD unless you pass `scale='normal'`.",
  },

  // ─── Nonparametric tests (regenerated) ────────────────────────────────────
  {
    id: "spearman-rho",
    title: "Spearman rank correlation (ρ)",
    category: "nonparametric-tests",
    aliases: ["spearmanr","rank correlation","rho","monotonic correlation"],
    definition:
      "Spearman's rho measures whether two variables move together in a consistently increasing (or consistently decreasing) way, WITHOUT assuming that relationship is a straight line the way Pearson's r does. The trick that buys that freedom is disarmingly simple: replace every raw measurement with its RANK (1 for the smallest, 2 for the next, and so on), then compute the ordinary Pearson correlation on those ranks instead of on the original numbers. Because ranks only record order — 1st, 2nd, 3rd — and throw away the actual distances between values, the result detects any monotonic pattern (steady growth, steady decline) and is immune to a single wild outlier, which can only ever be “last place” no matter how enormous it is. Reach for it when your relationship looks curved-but-always-climbing, when you have an outlier you can't justify deleting, or when your data are already ranks (judges' orderings, Likert responses) rather than true measurements.",
    whenToUse:
      "Use it instead of Pearson's r when the relationship between two measured variables is monotonic but not straight-line, or when an outlier would distort a Pearson correlation (e.g. sunlight vs. plant height where growth levels off at the high end).",
    formula: "ρ = Pearson r computed on the RANKS:  ρ = Σ(Rxᵢ−R̄x)(Ryᵢ−R̄y) / √( Σ(Rxᵢ−R̄x)² · Σ(Ryᵢ−R̄y)² )",
    formulaBreakdown: [
      { term: "Rxᵢ, Ryᵢ", meaning: "the RANK of each x-value and each y-value (1 = smallest), not the raw measurement — converting to ranks is the single step that separates Spearman from Pearson." },
      { term: "tied values", meaning: "when two measurements are equal they share the average of the ranks they'd otherwise occupy, so no value gets an unfair edge (none are tied in this dataset)." },
      { term: "(Rxᵢ−R̄x)(Ryᵢ−R̄y)", meaning: "the same cross-product-of-deviations that drives Pearson's r — positive when a point ranks high (or low) on BOTH variables, negative when the two ranks disagree." },
      { term: "√( Σ(…)² · Σ(…)² )", meaning: "each rank-set's own spread, combined into the scaling factor that pins ρ onto the fixed −1-to-+1 range — identical to Pearson's denominator, just applied to ranks." },
      { term: "ρ", meaning: "+1 means the two variables rank samples in exactly the same order, −1 means exactly opposite orders, 0 means no monotonic relationship at all." },
    ],
    datasetCsv: "plant,compost_rank_input,sunlight_hours,height_cm\n1,2,3.0,9.1\n2,4,4.5,11.4\n3,5,5.0,10.9\n4,6,6.5,14.2\n5,8,7.0,15.0\n6,9,8.5,19.8\n7,11,9.0,17.6\n8,12,10.0,22.5",
    code: "import csv\nimport io\nfrom scipy import stats\n\ncsv_text = \"\"\"plant,compost_rank_input,sunlight_hours,height_cm\n1,2,3.0,9.1\n2,4,4.5,11.4\n3,5,5.0,10.9\n4,6,6.5,14.2\n5,8,7.0,15.0\n6,9,8.5,19.8\n7,11,9.0,17.6\n8,12,10.0,22.5\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\nsunlight = [float(r[\"sunlight_hours\"]) for r in rows]\nheight = [float(r[\"height_cm\"]) for r in rows]\nn = len(sunlight)\n\n\ndef rank(values):\n    # average-rank method: ties share the mean of the ranks they'd occupy\n    order = sorted(range(len(values)), key=lambda i: values[i])\n    ranks = [0.0] * len(values)\n    i = 0\n    while i < len(values):\n        j = i\n        while j + 1 < len(values) and values[order[j + 1]] == values[order[i]]:\n            j += 1\n        avg_rank = (i + j) / 2 + 1  # 1-based average rank for this tie group\n        for k in range(i, j + 1):\n            ranks[order[k]] = avg_rank\n        i = j + 1\n    return ranks\n\n\nrank_x = rank(sunlight)\nrank_y = rank(height)\nprint(f\"ranks of sunlight: {rank_x}\")\nprint(f\"ranks of height:   {rank_y}\")\n\n# Spearman's rho = Pearson correlation computed ON THE RANKS.\nmean_rx = sum(rank_x) / n\nmean_ry = sum(rank_y) / n\nsum_cross = sum((rx - mean_rx) * (ry - mean_ry) for rx, ry in zip(rank_x, rank_y))\nsum_sq_rx = sum((rx - mean_rx) ** 2 for rx in rank_x)\nsum_sq_ry = sum((ry - mean_ry) ** 2 for ry in rank_y)\nprint(f\"sum of (rx-mean)(ry-mean) = {sum_cross:.4f}\")\nprint(f\"sum of (rx-mean)^2 = {sum_sq_rx:.4f}, sum of (ry-mean)^2 = {sum_sq_ry:.4f}\")\n\nrho = sum_cross / (sum_sq_rx * sum_sq_ry) ** 0.5\nprint(f\"rho = {sum_cross:.4f} / sqrt({sum_sq_rx:.4f} * {sum_sq_ry:.4f}) = {rho:.4f}\")\n\n# check: scipy agrees (and gives the tail probability via its own lookup)\nres = stats.spearmanr(sunlight, height)\nprint(f\"check: scipy.stats.spearmanr -> rho={res.statistic:.4f}, p={res.pvalue:.4f}\")",
    datasetNote: "Eight plants: daily sunlight hours and height (cm), where growth rises steadily with light but not in a perfectly straight line.",
    output: "ranks of sunlight: [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0]\nranks of height:   [1.0, 3.0, 2.0, 4.0, 5.0, 7.0, 6.0, 8.0]\nsum of (rx-mean)(ry-mean) = 40.0000\nsum of (rx-mean)^2 = 42.0000, sum of (ry-mean)^2 = 42.0000\nrho = 40.0000 / sqrt(42.0000 * 42.0000) = 0.9524\ncheck: scipy.stats.spearmanr -> rho=0.9524, p=0.0003",
    caveat:
      "ρ only detects MONOTONIC relationships (always-rising or always-falling) — a U-shaped relationship can be strong yet give ρ near 0. And like all correlations, a high ρ is not proof of causation.",
  },
  {
    id: "kendall-tau",
    title: "Kendall's tau (τ)",
    category: "nonparametric-tests",
    aliases: ["kendalltau","tau","rank concordance"],
    definition:
      "Kendall's tau, like Spearman's rho, measures monotonic association from ranks alone — but it gets there by a different, very intuitive route: it looks at every possible PAIR of samples and simply asks whether the two variables agree about which sample is “bigger.” A pair is CONCORDANT if the sample that's higher on variable x is also higher on variable y (they agree on direction), and DISCORDANT if one variable ranks them one way and the other ranks them the opposite way. Tau is just the net agreement — concordant pairs minus discordant pairs — divided by the total number of pairs, landing on the familiar −1-to-+1 scale. Because it is built purely from directional agreements between pairs, tau has an unusually plain-English interpretation (roughly, the difference between the probability that two samples agree and the probability that they disagree) and tends to be more robust than Spearman on very small samples.",
    whenToUse:
      "Use it as an alternative to Spearman for a small sample, or when you want a coefficient with a direct “probability of agreement” interpretation — e.g. does bacterial growth track soil pH consistently across a handful of samples?",
    formula: "τ = (C − D) / [ n(n−1)/2 ]",
    formulaBreakdown: [
      { term: "every pair (i, j)", meaning: "consider all n(n−1)/2 distinct pairs of samples — tau is a vote taken across pairs, not across individual points." },
      { term: "C (concordant)", meaning: "pairs where the two variables AGREE on direction: the sample higher in x is also higher in y (equivalently, (xⱼ−xᵢ)(yⱼ−yᵢ) > 0)." },
      { term: "D (discordant)", meaning: "pairs where the variables DISAGREE: one ranks the pair one way, the other ranks it the opposite way ((xⱼ−xᵢ)(yⱼ−yᵢ) < 0)." },
      { term: "n(n−1)/2", meaning: "the total number of pairs — dividing by it rescales the net agreement onto the fixed −1-to-+1 range." },
      { term: "τ", meaning: "+1 means every pair agrees (perfect monotonic increase), −1 means every pair disagrees, 0 means agreements and disagreements cancel out." },
    ],
    datasetCsv: "judge_pair,ph_level,bacteria_score\n1,5.5,2\n2,6.0,4\n3,6.2,3\n4,6.8,5\n5,7.0,7\n6,7.4,6\n7,7.9,8\n8,8.3,9",
    code: "import csv\nimport io\nfrom scipy import stats\n\ncsv_text = \"\"\"judge_pair,ph_level,bacteria_score\n1,5.5,2\n2,6.0,4\n3,6.2,3\n4,6.8,5\n5,7.0,7\n6,7.4,6\n7,7.9,8\n8,8.3,9\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\nph = [float(r[\"ph_level\"]) for r in rows]\nbact = [float(r[\"bacteria_score\"]) for r in rows]\nn = len(ph)\n\n# Kendall's tau counts, over every pair of samples, whether their two variables\n# agree on direction (concordant) or disagree (discordant).\nconcordant = 0\ndiscordant = 0\nfor i in range(n):\n    for j in range(i + 1, n):\n        dx = ph[j] - ph[i]\n        dy = bact[j] - bact[i]\n        s = dx * dy\n        if s > 0:\n            concordant += 1\n        elif s < 0:\n            discordant += 1\n        # (no ties in x or y here, so no half-credit pairs)\n\ntotal_pairs = n * (n - 1) // 2\nprint(f\"n = {n}, total pairs = n(n-1)/2 = {total_pairs}\")\nprint(f\"concordant pairs (both move same way) = {concordant}\")\nprint(f\"discordant pairs (they disagree)      = {discordant}\")\n\ntau = (concordant - discordant) / total_pairs\nprint(f\"tau = (C - D) / total pairs = ({concordant} - {discordant}) / {total_pairs} = {tau:.4f}\")\n\n# check: scipy agrees (tau-b) and gives the tail probability via its own lookup\nres = stats.kendalltau(ph, bact)\nprint(f\"check: scipy.stats.kendalltau -> tau={res.statistic:.4f}, p={res.pvalue:.4f}\")",
    datasetNote: "Eight samples pairing soil pH against a bacterial-growth score, with no ties in either column.",
    output: "n = 8, total pairs = n(n-1)/2 = 28\nconcordant pairs (both move same way) = 26\ndiscordant pairs (they disagree)      = 2\ntau = (C - D) / total pairs = (26 - 2) / 28 = 0.8571\ncheck: scipy.stats.kendalltau -> tau=0.8571, p=0.0017",
    caveat:
      "This is the “tau-a” count shown for clarity because there are no ties; scipy reports “tau-b,” which adds a tie correction to the denominator and equals this value only when — as here — there are no tied measurements.",
  },
  {
    id: "mann-whitney-u",
    title: "Mann–Whitney U test",
    category: "nonparametric-tests",
    aliases: ["mannwhitneyu","wilcoxon rank-sum","rank-sum test"],
    definition:
      "The Mann–Whitney U test is the nonparametric stand-in for the independent-samples t-test: it asks whether two separate groups differ, but instead of comparing their MEANS (which assume roughly normal data) it compares their RANKS. You pool both groups into one list, rank every value from smallest to largest, and then add up the ranks that landed in each group — if one group's values genuinely tend to be larger, its members will have soaked up the high ranks and its rank-sum will be conspicuously big. The U statistic converts that rank-sum into a count with a concrete meaning: out of every possible (group-1 value, group-2 value) pairing, how many times did the group-1 value lose to the group-2 value? Because it works entirely off order, it shrugs off outliers and skew that would violate a t-test's assumptions, which is exactly when you should reach for it.",
    whenToUse:
      "Use it to compare two independent groups when the data are skewed, ordinal, or have outliers that make a t-test's normality assumption shaky — e.g. comparing shoot lengths between a control and a treated group with a couple of unusual plants.",
    formula: "U₁ = R₁ − n₁(n₁+1)/2  ·  U₂ = R₂ − n₂(n₂+1)/2  ·  U = min(U₁, U₂)",
    formulaBreakdown: [
      { term: "pooled ranks", meaning: "combine both groups, sort, and assign rank 1 to the smallest value up to rank N for the largest — the whole test runs on these ranks, never on the raw measurements." },
      { term: "R₁, R₂", meaning: "the sum of the ranks that fell into group 1 and group 2 respectively — a group whose values tend to be larger collects the higher ranks and so a larger rank-sum." },
      { term: "nᵢ(nᵢ+1)/2", meaning: "the smallest rank-sum group i could possibly have (if it held ranks 1,2,…,nᵢ) — subtracting it turns the rank-sum into U, the count of cross-group pairs that group i “wins.”" },
      { term: "U = min(U₁, U₂)", meaning: "the reported statistic is the smaller of the two; a U near 0 means one group's values almost entirely undercut the other's (strong separation)." },
    ],
    datasetCsv: "group,shoot_length_mm\ncontrol,12\ncontrol,15\ncontrol,9\ncontrol,14\ncontrol,11\ncontrol,13\ntreated,19\ntreated,22\ntreated,17\ntreated,25\ntreated,20\ntreated,18",
    code: "import csv\nimport io\nfrom scipy import stats\n\ncsv_text = \"\"\"group,shoot_length_mm\ncontrol,12\ncontrol,15\ncontrol,9\ncontrol,14\ncontrol,11\ncontrol,13\ntreated,19\ntreated,22\ntreated,17\ntreated,25\ntreated,20\ntreated,18\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\ncontrol = [float(r[\"shoot_length_mm\"]) for r in rows if r[\"group\"] == \"control\"]\ntreated = [float(r[\"shoot_length_mm\"]) for r in rows if r[\"group\"] == \"treated\"]\nn1, n2 = len(control), len(treated)\n\n# Pool both groups, rank everything together (smallest = rank 1), then sum the\n# ranks that belong to each group.\ncombined = [(v, \"control\") for v in control] + [(v, \"treated\") for v in treated]\ncombined.sort(key=lambda t: t[0])\nranks = list(range(1, len(combined) + 1))  # no ties in this dataset\nprint(\"pooled values (sorted) with ranks:\")\nfor (v, g), rk in zip(combined, ranks):\n    print(f\"  value={v:.0f} rank={rk} ({g})\")\n\nR1 = sum(rk for (v, g), rk in zip(combined, ranks) if g == \"control\")\nR2 = sum(rk for (v, g), rk in zip(combined, ranks) if g == \"treated\")\nprint(f\"R1 (control rank sum) = {R1}, R2 (treated rank sum) = {R2}\")\n\n# U for each group; the test statistic is the smaller of the two.\nU1 = R1 - n1 * (n1 + 1) / 2\nU2 = R2 - n2 * (n2 + 1) / 2\nprint(f\"U1 = R1 - n1(n1+1)/2 = {R1} - {n1 * (n1 + 1) // 2} = {U1:.1f}\")\nprint(f\"U2 = R2 - n2(n2+1)/2 = {R2} - {n2 * (n2 + 1) // 2} = {U2:.1f}\")\nU = min(U1, U2)\nprint(f\"U = min(U1, U2) = {U:.1f}\")\n\n# check: scipy agrees (its U is for the first argument; p via its own lookup)\nres = stats.mannwhitneyu(control, treated, alternative=\"two-sided\")\nprint(f\"check: scipy.stats.mannwhitneyu -> U={res.statistic:.1f}, p={res.pvalue:.4f}\")",
    datasetNote: "Two independent groups of shoot lengths (mm): six control seedlings vs. six treated seedlings.",
    output: "pooled values (sorted) with ranks:\n  value=9 rank=1 (control)\n  value=11 rank=2 (control)\n  value=12 rank=3 (control)\n  value=13 rank=4 (control)\n  value=14 rank=5 (control)\n  value=15 rank=6 (control)\n  value=17 rank=7 (treated)\n  value=18 rank=8 (treated)\n  value=19 rank=9 (treated)\n  value=20 rank=10 (treated)\n  value=22 rank=11 (treated)\n  value=25 rank=12 (treated)\nR1 (control rank sum) = 21, R2 (treated rank sum) = 57\nU1 = R1 - n1(n1+1)/2 = 21 - 21 = 0.0\nU2 = R2 - n2(n2+1)/2 = 57 - 21 = 36.0\nU = min(U1, U2) = 0.0\ncheck: scipy.stats.mannwhitneyu -> U=0.0, p=0.0022",
    caveat:
      "Mann–Whitney tests whether one group tends to produce larger values, NOT whether their means differ — with very differently shaped distributions a significant result may reflect a difference in spread or shape rather than a simple shift. scipy's U is computed for its first argument, so it may report U₂ where the hand calc reports the min.",
  },
  {
    id: "wilcoxon-signed-rank",
    title: "Wilcoxon signed-rank test (paired)",
    category: "nonparametric-tests",
    aliases: ["wilcoxon","signed-rank test","paired nonparametric"],
    definition:
      "The Wilcoxon signed-rank test is the nonparametric counterpart to the PAIRED t-test: use it when the same subject is measured twice (before/after) but the within-subject changes are too skewed or outlier-ridden to trust a t-test. It keeps the paired t-test's key first move — collapse each subject's two numbers into a single difference — but then, instead of averaging those differences, it ranks them by MAGNITUDE (ignoring sign), reattaches each difference's original + or − sign to its rank, and sums the positive-signed ranks separately from the negative-signed ones. The logic is that if the treatment truly does nothing, positive and negative changes should be about equally sized and equally common, so the two rank-sums should come out roughly balanced; a lopsided split — where, say, almost all the biggest changes point the same direction — is the signal. Because it uses the ranks of the differences rather than their raw sizes, one freakishly large change can't dominate the result.",
    whenToUse:
      "Use it for before/after (paired) data when the differences are skewed or have outliers — e.g. leaf pH before vs. after a treatment where one plant reacts far more strongly than the rest.",
    formula: "dᵢ = beforeᵢ − afterᵢ  ·  rank the |dᵢ|  ·  W⁺ = Σ ranks of positive dᵢ,  W⁻ = Σ ranks of negative dᵢ  ·  W = min(W⁺, W⁻)",
    formulaBreakdown: [
      { term: "dᵢ = beforeᵢ − afterᵢ", meaning: "each subject's within-pair change — the same collapse-to-one-number step the paired t-test starts with." },
      { term: "drop dᵢ = 0", meaning: "any subject with zero change carries no directional information, so it is removed before ranking (none here)." },
      { term: "rank the |dᵢ|", meaning: "rank the differences by ABSOLUTE size (smallest change = rank 1), ignoring sign for now; equal-sized changes share an averaged rank." },
      { term: "W⁺ and W⁻", meaning: "reattach each difference's sign to its magnitude-rank, then sum the positive-signed ranks and the negative-signed ranks separately — a big imbalance is the evidence of a real shift." },
      { term: "W = min(W⁺, W⁻)", meaning: "the smaller rank-sum is the statistic; a W near 0 means nearly all the change went one direction, which is strong evidence against “no effect.”" },
    ],
    datasetCsv: "plant,before_ph,after_ph\n1,6.8,6.2\n2,7.1,6.5\n3,6.5,6.6\n4,7.4,6.8\n5,6.9,6.1\n6,7.2,6.7\n7,7.0,6.3\n8,6.6,6.4",
    code: "import csv\nimport io\nfrom scipy import stats\n\ncsv_text = \"\"\"plant,before_ph,after_ph\n1,6.8,6.2\n2,7.1,6.5\n3,6.5,6.6\n4,7.4,6.8\n5,6.9,6.1\n6,7.2,6.7\n7,7.0,6.3\n8,6.6,6.4\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\nbefore = [float(r[\"before_ph\"]) for r in rows]\nafter = [float(r[\"after_ph\"]) for r in rows]\n\n# Step 1: per-subject difference, then drop any exact-zero differences.\ndiffs = [round(b - a, 4) for b, a in zip(before, after)]\nprint(f\"differences (before - after): {diffs}\")\nnonzero = [d for d in diffs if d != 0]\nprint(f\"nonzero differences (zeros dropped): {nonzero}, n = {len(nonzero)}\")\n\n# Step 2: rank the ABSOLUTE differences (smallest |d| = rank 1; average ties).\nabs_d = [abs(d) for d in nonzero]\norder = sorted(range(len(abs_d)), key=lambda i: abs_d[i])\nranks = [0.0] * len(abs_d)\ni = 0\nwhile i < len(abs_d):\n    j = i\n    while j + 1 < len(abs_d) and abs_d[order[j + 1]] == abs_d[order[i]]:\n        j += 1\n    avg_rank = (i + j) / 2 + 1\n    for k in range(i, j + 1):\n        ranks[order[k]] = avg_rank\n    i = j + 1\nprint(f\"|differences|: {abs_d}\")\nprint(f\"ranks of |differences|: {ranks}\")\n\n# Step 3: sum the ranks of the positive diffs and of the negative diffs.\nW_plus = sum(rk for d, rk in zip(nonzero, ranks) if d > 0)\nW_minus = sum(rk for d, rk in zip(nonzero, ranks) if d < 0)\nprint(f\"W+ (rank sum of positive diffs) = {W_plus}\")\nprint(f\"W- (rank sum of negative diffs) = {W_minus}\")\nW = min(W_plus, W_minus)\nprint(f\"W = min(W+, W-) = {W}\")\n\n# check: scipy agrees (p via its own lookup)\nres = stats.wilcoxon(before, after)\nprint(f\"check: scipy.stats.wilcoxon -> W={res.statistic:.1f}, p={res.pvalue:.4f}\")",
    datasetNote: "Eight plants, each leaf's pH measured before and after a treatment; two changes are tied in size (both 0.6) to show averaged ranks.",
    output: "differences (before - after): [0.6, 0.6, -0.1, 0.6, 0.8, 0.5, 0.7, 0.2]\nnonzero differences (zeros dropped): [0.6, 0.6, -0.1, 0.6, 0.8, 0.5, 0.7, 0.2], n = 8\n|differences|: [0.6, 0.6, 0.1, 0.6, 0.8, 0.5, 0.7, 0.2]\nranks of |differences|: [5.0, 5.0, 1.0, 5.0, 8.0, 3.0, 7.0, 2.0]\nW+ (rank sum of positive diffs) = 35.0\nW- (rank sum of negative diffs) = 1.0\nW = min(W+, W-) = 1.0\ncheck: scipy.stats.wilcoxon -> W=1.0, p=0.0156",
    caveat:
      "The signed-rank test assumes the distribution of differences is roughly symmetric; if the changes are wildly asymmetric, a sign test is safer. scipy's default here uses an exact null distribution for this small n.",
  },
  {
    id: "kruskal-wallis",
    title: "Kruskal–Wallis test (3+ groups)",
    category: "nonparametric-tests",
    aliases: ["kruskal","nonparametric anova","kruskal-wallis h"],
    definition:
      "The Kruskal–Wallis test is the nonparametric version of one-way ANOVA: it asks “do these 3+ groups differ?” when the data are too skewed or outlier-prone for ANOVA's normality assumption. It follows the same rank-everything recipe as the Mann–Whitney test but for more than two groups — pool all the measurements, rank them together from smallest to largest, and then look at each group's total rank-sum. If every group came from the same distribution, each group's rank-sum should be close to what you'd expect from its size alone (roughly its share of the average rank); the H statistic measures how far the actual rank-sums stray from that even-handed expectation, squared and size-weighted so that a group hogging unusually high or low ranks stands out. A large H means at least one group's values sit systematically higher or lower in the pooled ranking than chance would explain, and scipy converts H to a p-value via the chi-square distribution.",
    whenToUse:
      "Use it for 3+ independent groups when the data aren't normal enough for ANOVA — e.g. comparing earthworm counts across sandy, loam, and clay soils where counts are small and skewed.",
    formula: "H = [ 12 / (N(N+1)) ] · Σ (Rⱼ² / nⱼ) − 3(N+1)",
    formulaBreakdown: [
      { term: "pooled ranks", meaning: "combine every measurement from all groups, sort, and rank 1..N (averaging ties) — the test never touches the raw values, only their ranks." },
      { term: "Rⱼ", meaning: "the sum of the ranks belonging to group j — a group whose values tend to be larger collects the high ranks and so a large Rⱼ." },
      { term: "nⱼ and N", meaning: "the size of group j and the total number of measurements; dividing Rⱼ² by nⱼ fairly compares rank-sums between groups of different sizes." },
      { term: "12 / (N(N+1))  and  − 3(N+1)", meaning: "normalizing constants that center and scale H so that, under “all groups identical,” it follows a known chi-square distribution with k−1 degrees of freedom." },
      { term: "H", meaning: "a large H means the group rank-sums are more spread apart than chance allows — evidence some group differs; scipy looks up its chi-square tail probability." },
    ],
    datasetCsv: "soil_type,worm_count\nsandy,4\nsandy,6\nsandy,5\nsandy,3\nloam,11\nloam,14\nloam,9\nloam,13\nclay,7\nclay,8\nclay,2\nclay,10",
    code: "import csv\nimport io\nfrom scipy import stats\n\ncsv_text = \"\"\"soil_type,worm_count\nsandy,4\nsandy,6\nsandy,5\nsandy,3\nloam,11\nloam,14\nloam,9\nloam,13\nclay,7\nclay,8\nclay,2\nclay,10\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\ngroups = {\"sandy\": [], \"loam\": [], \"clay\": []}\nfor r in rows:\n    groups[r[\"soil_type\"]].append(float(r[\"worm_count\"]))\n\n# Pool everything and rank across all groups (smallest = rank 1; average ties).\npooled = [(v, name) for name, vals in groups.items() for v in vals]\npooled.sort(key=lambda t: t[0])\nvals_sorted = [v for v, _ in pooled]\nranks = [0.0] * len(vals_sorted)\ni = 0\nwhile i < len(vals_sorted):\n    j = i\n    while j + 1 < len(vals_sorted) and vals_sorted[j + 1] == vals_sorted[i]:\n        j += 1\n    avg_rank = (i + j) / 2 + 1\n    for k in range(i, j + 1):\n        ranks[k] = avg_rank\n    i = j + 1\n\nN = len(pooled)\nrank_sums = {name: 0.0 for name in groups}\nfor (v, name), rk in zip(pooled, ranks):\n    rank_sums[name] += rk\nfor name in groups:\n    print(f\"{name}: n={len(groups[name])}, rank sum R={rank_sums[name]:.1f}\")\n\n# H = 12/(N(N+1)) * sum(Rj^2 / nj)  -  3(N+1)\nsum_term = sum(rank_sums[name] ** 2 / len(groups[name]) for name in groups)\nprint(f\"N = {N}, sum(Rj^2/nj) = {sum_term:.4f}\")\nH = 12 / (N * (N + 1)) * sum_term - 3 * (N + 1)\ndf = len(groups) - 1\nprint(f\"H = 12/(N(N+1)) * sum(Rj^2/nj) - 3(N+1) = {H:.4f}, df = k-1 = {df}\")\n\n# scipy looks up the tail area under the chi-square distribution for this H and df\np_value = stats.chi2.sf(H, df)\nprint(f\"p (via scipy's chi-square lookup) = {p_value:.4f}\")\n\n# check: scipy's kruskal agrees\nres = stats.kruskal(groups[\"sandy\"], groups[\"loam\"], groups[\"clay\"])\nprint(f\"check: scipy.stats.kruskal -> H={res.statistic:.4f}, p={res.pvalue:.4f}\")",
    datasetNote: "Three soil types with four earthworm-count measurements each (no tied counts, so the hand calc matches scipy's tie-corrected value exactly).",
    output: "sandy: n=4, rank sum R=14.0\nloam: n=4, rank sum R=41.0\nclay: n=4, rank sum R=23.0\nN = 12, sum(Rj^2/nj) = 601.5000\nH = 12/(N(N+1)) * sum(Rj^2/nj) - 3(N+1) = 7.2692, df = k-1 = 2\np (via scipy's chi-square lookup) = 0.0264\ncheck: scipy.stats.kruskal -> H=7.2692, p=0.0264",
    caveat:
      "Like ANOVA, a significant Kruskal–Wallis only says SOME group differs, not which — follow up with pairwise Mann–Whitney tests (with a multiple-testing correction). Tied values require a correction factor scipy applies automatically; this dataset avoids ties so the plain formula matches.",
  },

  // ─── New comparing-groups tests (regenerated) ─────────────────────────────
  {
    id: "paired-t-test-growth",
    title: "Paired t-test (repeated measures)",
    category: "comparing-groups",
    aliases: ["ttest_rel","paired samples t-test","within-subject t-test"],
    definition:
      "A paired t-test compares two measurements taken on the SAME unit — the same leaf, plant, or subject measured twice — by first collapsing each unit's pair of numbers into a single within-unit change, then testing whether the average of those changes is meaningfully different from zero. That first collapse is the whole point and the source of its extra power: because each unit serves as its own control, the test never has to grapple with how much the units differ from EACH OTHER (one leaf may simply start bigger than another), only with how much each one changed relative to itself — which cancels all of that between-unit variability out of the denominator. What remains is ordinary one-sample logic run on the list of changes: their mean divided by their own standard error gives a t-statistic, and a large |t| means the typical change is far enough from zero to be unlikely under “nothing happened.” Use it whenever the same unit contributes both measurements.",
    whenToUse:
      "Use it when the same plant/leaf/subject is measured twice (before/after, day 0 vs. day 7) rather than comparing two separate groups — pairing removes between-unit differences and usually needs fewer samples to detect a real change.",
    formula: "t = d̄ / SE_d   where dᵢ = afterᵢ − beforeᵢ,  d̄ = mean(dᵢ),  SE_d = s_d / √n",
    formulaBreakdown: [
      { term: "dᵢ = afterᵢ − beforeᵢ", meaning: "the per-unit change — collapse each unit's two measurements into one number before doing anything else, so the whole test runs on a single list of changes." },
      { term: "d̄", meaning: "the mean of those changes — is the average growth positive, negative, or essentially zero?" },
      { term: "s_d", meaning: "the standard deviation OF THE CHANGES (not of the raw before/after values) — how much the amount of change varies from unit to unit." },
      { term: "SE_d = s_d / √n", meaning: "the standard error of the mean change, built exactly like the ordinary SEM but applied to the differences." },
      { term: "t = d̄ / SE_d", meaning: "the mean change expressed in “how many standard errors from zero” units; df = n−1 sets the reference t-distribution and scipy looks up the two-tailed p-value." },
    ],
    datasetCsv: "leaf,day0_area_cm2,day7_area_cm2\n1,12.4,15.1\n2,10.8,13.0\n3,14.1,17.2\n4,11.5,13.9\n5,13.0,16.1\n6,12.2,14.8\n7,10.5,12.6\n8,13.6,16.9",
    code: "import csv\nimport io\nfrom scipy import stats\n\ncsv_text = \"\"\"leaf,day0_area_cm2,day7_area_cm2\n1,12.4,15.1\n2,10.8,13.0\n3,14.1,17.2\n4,11.5,13.9\n5,13.0,16.1\n6,12.2,14.8\n7,10.5,12.6\n8,13.6,16.9\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\nday0 = [float(r[\"day0_area_cm2\"]) for r in rows]\nday7 = [float(r[\"day7_area_cm2\"]) for r in rows]\n\nn = len(day0)\n# Step 1: collapse each leaf's pair into one within-leaf change.\ndiffs = [round(d7 - d0, 4) for d0, d7 in zip(day0, day7)]\nprint(f\"per-leaf change (day7 - day0): {diffs}\")\n\nmean_diff = sum(diffs) / n\nprint(f\"mean change = {mean_diff:.4f} cm^2\")\n\n# Step 2: ordinary one-sample logic on the list of changes.\nsum_sq = sum((d - mean_diff) ** 2 for d in diffs)\nsd_diff = (sum_sq / (n - 1)) ** 0.5\nsem_diff = sd_diff / (n ** 0.5)\nprint(f\"SD of changes = {sd_diff:.4f} cm^2, SEM of changes = {sem_diff:.4f} cm^2\")\n\nt_stat = mean_diff / sem_diff\ndf = n - 1\nprint(f\"t = mean_change / SEM = {mean_diff:.4f} / {sem_diff:.4f} = {t_stat:.4f}, df = {df}\")\n\n# scipy looks up the tail area under the t distribution for this t and df\np_value = stats.t.sf(abs(t_stat), df) * 2\nprint(f\"p (two-tailed, via scipy's t lookup) = {p_value:.2e}\")\n\n# check: scipy's ttest_rel agrees\nres = stats.ttest_rel(day7, day0)\nprint(f\"check: scipy.stats.ttest_rel -> t={res.statistic:.4f}, p={res.pvalue:.2e}\")",
    datasetNote: "Eight leaves, each measured for area (cm²) on day 0 and again on day 7 of a growth experiment.",
    output: "per-leaf change (day7 - day0): [2.7, 2.2, 3.1, 2.4, 3.1, 2.6, 2.1, 3.3]\nmean change = 2.6875 cm^2\nSD of changes = 0.4454 cm^2, SEM of changes = 0.1575 cm^2\nt = mean_change / SEM = 2.6875 / 0.1575 = 17.0659, df = 7\np (two-tailed, via scipy's t lookup) = 5.82e-07\ncheck: scipy.stats.ttest_rel -> t=17.0659, p=5.82e-07",
    caveat:
      "Only use the paired test when the two columns are genuinely matched row-for-row (same leaf) — pairing mismatched rows, or running a paired test on two independent groups, gives a meaningless result. It assumes the CHANGES are roughly normal; if they're badly skewed, use the Wilcoxon signed-rank test.",
  },
  {
    id: "welch-t-test",
    title: "Welch's t-test (unequal variances)",
    category: "comparing-groups",
    aliases: ["welch","unequal variance t-test","ttest_ind equal_var=False"],
    definition:
      "Welch's t-test compares two independent groups' means just like the ordinary (Student's) t-test, but it drops the assumption that the two groups share the same underlying variability — an assumption that quietly fails whenever one group is far more consistent than the other. The ordinary test POOLS both groups' variances into a single shared estimate; Welch's refuses to pool, plugging each group's OWN variance into the standard error separately, so a noisy group contributes its own noise rather than contaminating the quiet group's. Because the two variances no longer combine cleanly, the degrees of freedom can't just be n₁+n₂−2 anymore; instead a special (usually fractional) Welch–Satterthwaite formula approximates them from the two variances and sample sizes. The payoff is a test that stays trustworthy when group spreads or sizes differ — which is common enough that many statisticians recommend defaulting to Welch's for two-group comparisons.",
    whenToUse:
      "Use it instead of the pooled t-test whenever the two groups have clearly different spreads or very different sample sizes — e.g. tightly-controlled open-field germination times vs. a much more variable greenhouse batch.",
    formula: "t = (x̄₁ − x̄₂) / √( s₁²/n₁ + s₂²/n₂ )   ·   df ≈ (s₁²/n₁ + s₂²/n₂)² / [ (s₁²/n₁)²/(n₁−1) + (s₂²/n₂)²/(n₂−1) ]",
    formulaBreakdown: [
      { term: "x̄₁ − x̄₂", meaning: "the raw difference between the two group means — the same numerator as the ordinary t-test." },
      { term: "s₁²/n₁ + s₂²/n₂", meaning: "each group's variance divided by its own size, added together — the key departure from Student's test, which instead pools both variances into one shared number." },
      { term: "√( … )", meaning: "the square root of that sum is the standard error of the difference, built WITHOUT assuming equal variances." },
      { term: "Welch–Satterthwaite df", meaning: "because unequal variances don't combine into a clean integer df, this formula approximates the effective degrees of freedom from the two variances and sizes — usually a fraction (7.13 here)." },
      { term: "t, p", meaning: "the same standardized-gap-to-tail-probability idea as any t-test, but read off the t-distribution with the fractional Welch df." },
    ],
    datasetCsv: "group,germination_days\nopen_field,5.1\nopen_field,5.4\nopen_field,4.9\nopen_field,5.2\nopen_field,5.0\nopen_field,5.3\ngreenhouse,3.8\ngreenhouse,6.9\ngreenhouse,2.1\ngreenhouse,7.4\ngreenhouse,4.0\ngreenhouse,5.6\ngreenhouse,8.2\ngreenhouse,3.1",
    code: "import csv\nimport io\nfrom scipy import stats\n\ncsv_text = \"\"\"group,germination_days\nopen_field,5.1\nopen_field,5.4\nopen_field,4.9\nopen_field,5.2\nopen_field,5.0\nopen_field,5.3\ngreenhouse,3.8\ngreenhouse,6.9\ngreenhouse,2.1\ngreenhouse,7.4\ngreenhouse,4.0\ngreenhouse,5.6\ngreenhouse,8.2\ngreenhouse,3.1\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\nfield = [float(r[\"germination_days\"]) for r in rows if r[\"group\"] == \"open_field\"]\ngreen = [float(r[\"germination_days\"]) for r in rows if r[\"group\"] == \"greenhouse\"]\n\nn1, n2 = len(field), len(green)\nmean1 = sum(field) / n1\nmean2 = sum(green) / n2\nvar1 = sum((x - mean1) ** 2 for x in field) / (n1 - 1)\nvar2 = sum((x - mean2) ** 2 for x in green) / (n2 - 1)\nprint(f\"open_field: n={n1}, mean={mean1:.4f}, var={var1:.4f}\")\nprint(f\"greenhouse: n={n2}, mean={mean2:.4f}, var={var2:.4f}\")\n\n# Welch's SE keeps each group's variance SEPARATE (no pooling).\nse = (var1 / n1 + var2 / n2) ** 0.5\nprint(f\"Welch SE = sqrt(var1/n1 + var2/n2) = sqrt({var1:.4f}/{n1} + {var2:.4f}/{n2}) = {se:.4f}\")\n\nt_stat = (mean1 - mean2) / se\nprint(f\"t = (mean1 - mean2) / SE = ({mean1:.4f} - {mean2:.4f}) / {se:.4f} = {t_stat:.4f}\")\n\n# Welch-Satterthwaite degrees of freedom (usually fractional):\nnum = (var1 / n1 + var2 / n2) ** 2\nden = (var1 / n1) ** 2 / (n1 - 1) + (var2 / n2) ** 2 / (n2 - 1)\ndf = num / den\nprint(f\"Welch-Satterthwaite df = {num:.4f} / {den:.4f} = {df:.4f}\")\n\n# scipy looks up the tail area under the t distribution for this t and df\np_value = stats.t.sf(abs(t_stat), df) * 2\nprint(f\"p (two-tailed, via scipy's t lookup) = {p_value:.4f}\")\n\n# check: scipy's ttest_ind with equal_var=False (Welch) agrees\nres = stats.ttest_ind(field, green, equal_var=False)\nprint(f\"check: scipy.stats.ttest_ind(equal_var=False) -> t={res.statistic:.4f}, p={res.pvalue:.4f}\")",
    datasetNote: "Germination times (days) for a tightly-clustered open-field group (n=6) and a highly variable greenhouse group (n=8) with nearly identical means but very different spreads.",
    output: "open_field: n=6, mean=5.1500, var=0.0350\ngreenhouse: n=8, mean=5.1375, var=4.8970\nWelch SE = sqrt(var1/n1 + var2/n2) = sqrt(0.0350/6 + 4.8970/8) = 0.7861\nt = (mean1 - mean2) / SE = (5.1500 - 5.1375) / 0.7861 = 0.0159\nWelch-Satterthwaite df = 0.3819 / 0.0535 = 7.1331\np (two-tailed, via scipy's t lookup) = 0.9877\ncheck: scipy.stats.ttest_ind(equal_var=False) -> t=0.0159, p=0.9877",
    caveat:
      "Here the means are almost identical (5.15 vs. 5.14) so Welch's finds no difference (p≈0.99) — a reminder it tests MEANS, not spreads; use Levene's test if the spread itself is what you care about. Welch's is the safe default; only use the pooled t-test when you're confident the variances match.",
  },
  {
    id: "levene-test",
    title: "Levene's test (equal variances)",
    category: "nonparametric-tests",
    aliases: ["levene","brown-forsythe","homogeneity of variance","equal variance test"],
    definition:
      "Levene's test checks a claim other tests QUIETLY ASSUME: that two or more groups have roughly the same spread (variance). Many workhorse tests — the pooled t-test, ANOVA — lean on “equal variances,” and Levene's is how you find out whether that's safe. Its clever move is to convert a question about spread into a question about MEANS, which we already know how to test: for every data point, compute its absolute distance from its own group's center (the median, in the robust Brown–Forsythe variant), producing a new column of “how far from typical is this point.” A group with a wide spread will have large absolute-distance values; a tight group will have small ones. Levene's then simply runs a one-way ANOVA on those absolute distances — if the groups' AVERAGE distance-from-center differs, their spreads differ. So the W statistic is literally an ANOVA F-statistic wearing a different hat, and scipy converts it to a p-value through the F-distribution.",
    whenToUse:
      "Run it before a pooled t-test or ANOVA to check the equal-variance assumption — if Levene's is significant, the spreads differ and you should switch to Welch's t-test (two groups) or a variance-robust method.",
    formula: "zᵢⱼ = |xᵢⱼ − medianⱼ|  ·  W = [ (N−k) · SS_between(z) ] / [ (k−1) · SS_within(z) ]  (an ANOVA F on the z's)",
    formulaBreakdown: [
      { term: "medianⱼ", meaning: "the center of group j — using the MEDIAN (the Brown–Forsythe variant) rather than the mean makes the test robust to outliers and skew." },
      { term: "zᵢⱼ = |xᵢⱼ − medianⱼ|", meaning: "each point's absolute distance from its group's center — this transformed column turns “how spread out is the group?” into “how big are these distances on average?”" },
      { term: "SS_between(z), SS_within(z)", meaning: "the between-group and within-group sums of squares of the z-values — exactly the quantities a one-way ANOVA computes, just applied to distances instead of raw data." },
      { term: "W = ANOVA F on the z's", meaning: "the ratio of between-group to within-group variation in the distances; a large W means the groups' typical distance-from-center (hence their spread) differs." },
      { term: "df = (k−1, N−k)", meaning: "the same two degrees of freedom an ordinary ANOVA uses — scipy reads W's tail probability off the F-distribution with these." },
    ],
    datasetCsv: "batch,ph_reading\nmachine_A,7.01\nmachine_A,6.99\nmachine_A,7.00\nmachine_A,7.02\nmachine_A,6.98\nmachine_A,7.00\nmachine_B,7.4\nmachine_B,6.6\nmachine_B,7.9\nmachine_B,6.2\nmachine_B,7.1\nmachine_B,6.8",
    code: "import csv\nimport io\nfrom scipy import stats\n\ncsv_text = \"\"\"batch,ph_reading\nmachine_A,7.01\nmachine_A,6.99\nmachine_A,7.00\nmachine_A,7.02\nmachine_A,6.98\nmachine_A,7.00\nmachine_B,7.4\nmachine_B,6.6\nmachine_B,7.9\nmachine_B,6.2\nmachine_B,7.1\nmachine_B,6.8\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\ngroups = {\"machine_A\": [], \"machine_B\": []}\nfor r in rows:\n    groups[r[\"batch\"]].append(float(r[\"ph_reading\"]))\n\n# Levene (median-centered, aka Brown-Forsythe) turns \"are the SPREADS equal?\"\n# into a one-way ANOVA on each point's absolute distance from its group MEDIAN.\ndef median(vals):\n    s = sorted(vals)\n    m = len(s)\n    return s[m // 2] if m % 2 else (s[m // 2 - 1] + s[m // 2]) / 2\n\nz = {}   # absolute deviations from the group median\nfor name, vals in groups.items():\n    med = median(vals)\n    z[name] = [abs(v - med) for v in vals]\n    print(f\"{name}: median={med:.4f}, |dev from median|={[round(d, 4) for d in z[name]]}\")\n\nall_z = [d for name in groups for d in z[name]]\nN = len(all_z)\nk = len(groups)\ngrand_mean_z = sum(all_z) / N\ngroup_mean_z = {name: sum(z[name]) / len(z[name]) for name in groups}\nprint(f\"grand mean of |dev| = {grand_mean_z:.4f}\")\nfor name in groups:\n    print(f\"  mean |dev| for {name} = {group_mean_z[name]:.4f}\")\n\n# W is exactly the ANOVA F-statistic computed on those absolute deviations.\nss_between = sum(len(z[name]) * (group_mean_z[name] - grand_mean_z) ** 2 for name in groups)\nss_within = sum((d - group_mean_z[name]) ** 2 for name in groups for d in z[name])\nW = ((N - k) * ss_between) / ((k - 1) * ss_within)\nprint(f\"SS_between = {ss_between:.4f}, SS_within = {ss_within:.4f}\")\nprint(f\"W = (N-k)*SS_between / ((k-1)*SS_within) = {W:.4f}, df = ({k - 1}, {N - k})\")\n\n# scipy looks up the tail area under the F distribution for this W\np_value = stats.f.sf(W, k - 1, N - k)\nprint(f\"p (via scipy's F lookup) = {p_value:.4f}\")\n\n# check: scipy's levene (center='median') agrees\nres = stats.levene(groups[\"machine_A\"], groups[\"machine_B\"], center=\"median\")\nprint(f\"check: scipy.stats.levene -> W={res.statistic:.4f}, p={res.pvalue:.4f}\")",
    datasetNote: "Two calibration batches of six pH readings each: machine A is extremely consistent, machine B is erratic — nearly the same median but very different spread.",
    output: "machine_A: median=7.0000, |dev from median|=[0.01, 0.01, 0.0, 0.02, 0.02, 0.0]\nmachine_B: median=6.9500, |dev from median|=[0.45, 0.35, 0.95, 0.75, 0.15, 0.15]\ngrand mean of |dev| = 0.2383\n  mean |dev| for machine_A = 0.0100\n  mean |dev| for machine_B = 0.4667\nSS_between = 0.6256, SS_within = 0.5287\nW = (N-k)*SS_between / ((k-1)*SS_within) = 11.8327, df = (1, 10)\np (via scipy's F lookup) = 0.0063\ncheck: scipy.stats.levene -> W=11.8327, p=0.0063",
    caveat:
      "A significant Levene's result means the groups' variances differ — it says nothing about their means. Use the median-centered (Brown–Forsythe) version shown here for skewed data; the mean-centered original is more sensitive to outliers.",
  },
  {
    id: "shapiro-wilk",
    title: "Shapiro–Wilk normality test",
    category: "nonparametric-tests",
    aliases: ["shapiro","normality test","shapiro-wilk w"],
    definition:
      "The Shapiro–Wilk test formally asks whether a sample plausibly came from a normal (“bell curve”) population — the assumption that t-tests, ANOVA, and confidence intervals all quietly rely on. Its W statistic compares how your sorted data are spaced against how a truly normal sample's sorted values (its “order statistics”) would be spaced, using pre-tabulated coefficients; W near 1 means the spacing matches a bell curve well, while a markedly lower W means it doesn't. That comparison against tabulated order-statistic coefficients isn't something you reproduce with a pocket calculator, so scipy runs the real test — but the intuition is fully hand-checkable, and this snippet does two such checks first: it counts what fraction of points fall within one standard deviation of the mean (a bell curve predicts ~68%) and computes the sample's SKEWNESS (0 for a symmetric bell curve; a large positive value flags a long right tail). When those hand checks look off, W confirms it: a low W and tiny p-value together say “this data is not normal.”",
    whenToUse:
      "Run it before relying on a t-test, ANOVA, or confidence interval that assumes normality — if the p-value is small, the data are significantly non-normal and you should switch to a rank-based (nonparametric) test instead.",
    formula: "W = (Σ aᵢ x₍ᵢ₎)² / Σ(xᵢ − x̄)²   (aᵢ = tabulated normal order-statistic weights; W ≈ 1 ⇒ normal)",
    formulaBreakdown: [
      { term: "x₍ᵢ₎", meaning: "the sample values SORTED smallest to largest (the order statistics) — W is entirely about how these sorted values are spaced." },
      { term: "aᵢ", meaning: "pre-tabulated weights derived from what a truly normal sample's order statistics should look like — the part that can't be reproduced by hand, which is why scipy computes W." },
      { term: "Σ(xᵢ − x̄)²", meaning: "the ordinary total squared spread of the data (variance's numerator) — the denominator that normalizes W onto its 0-to-1 scale." },
      { term: "~68% within 1 SD", meaning: "a hand-computable sanity check shown in the code: a normal distribution keeps about 68% of values within one SD of the mean, so a big deviation from that is a red flag." },
      { term: "skewness", meaning: "a second hand check: the averaged cubed deviation, scaled by SD³ — 0 for a symmetric bell curve, large-positive for a right-skewed tail like this dataset's outliers." },
    ],
    datasetCsv: "trial,decay_time_s\n1,2.1\n2,2.4\n3,2.0\n4,2.7\n5,2.2\n6,2.5\n7,2.3\n8,3.1\n9,2.6\n10,9.8\n11,2.2\n12,8.4",
    code: "import csv\nimport io\nfrom scipy import stats\n\ncsv_text = \"\"\"trial,decay_time_s\n1,2.1\n2,2.4\n3,2.0\n4,2.7\n5,2.2\n6,2.5\n7,2.3\n8,3.1\n9,2.6\n10,9.8\n11,2.2\n12,8.4\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\ntimes = [float(r[\"decay_time_s\"]) for r in rows]\nn = len(times)\n\nsorted_times = sorted(times)\nprint(f\"sorted values: {sorted_times}\")\n\nmean = sum(times) / n\nsum_sq = sum((x - mean) ** 2 for x in times)\nsd = (sum_sq / (n - 1)) ** 0.5\nprint(f\"mean = {mean:.4f} s, SD = {sd:.4f} s\")\n\n# Hand-computable gut check: a bell curve puts ~68% of values within 1 SD.\nwithin_1sd = sum(1 for x in times if mean - sd <= x <= mean + sd)\nprint(f\"within 1 SD of the mean: {within_1sd}/{n} ({within_1sd / n:.0%}, vs. ~68% if normal)\")\n\n# Skewness by hand -- a normal distribution is symmetric (skew ~ 0); a big\n# positive value signals a long right tail (outliers pulling the mean up).\nm3 = sum((x - mean) ** 3 for x in times) / n\nm2 = sum_sq / n\nskew = m3 / m2 ** 1.5\nprint(f\"sample skewness (0 if symmetric) = {skew:.4f}\")\n\n# The Shapiro-Wilk W itself uses tabulated coefficients on the sorted data that\n# aren't hand-computable -- scipy runs the real test and its tail lookup.\nw_stat, p_value = stats.shapiro(times)\nprint(f\"check: scipy.stats.shapiro -> W = {w_stat:.4f}, p = {p_value:.4f}\")",
    datasetNote: "Twelve decay-time measurements (s) that cluster near 2–3 s but include two large outliers (8.4, 9.8), producing an obviously right-skewed, non-normal sample.",
    output: "sorted values: [2.0, 2.1, 2.2, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 8.4, 9.8]\nmean = 3.5250 s, SD = 2.6379 s\nwithin 1 SD of the mean: 10/12 (83%, vs. ~68% if normal)\nsample skewness (0 if symmetric) = 1.7902\ncheck: scipy.stats.shapiro -> W = 0.5841, p = 0.0001",
    caveat:
      "A HIGH p-value means “no evidence AGAINST normality,” not proof of normality — and on tiny samples the test is underpowered, so always eyeball a histogram too. Here the low W (0.58) and tiny p correctly flag the skew the outliers introduce.",
  },
  {
    id: "fisher-exact",
    title: "Fisher's exact test (2×2 counts)",
    category: "nonparametric-tests",
    aliases: ["fisher_exact","exact test","small-sample contingency"],
    definition:
      "Fisher's exact test answers the same association question a chi-square test does — are two categorical variables in a 2×2 count table related? — but computes an EXACT p-value instead of a large-sample approximation, which makes it the right tool when counts are small (chi-square's approximation gets unreliable when expected cell counts drop below ~5). It works by a beautifully concrete idea: hold the table's row and column totals fixed, then enumerate EVERY possible 2×2 table that has those same margins. Under “no association,” the probability of each such table follows the hypergeometric distribution (the same math as drawing colored balls from an urn without replacement). The two-sided p-value is then just the total probability of all the tables that are as unlikely as, or unlikelier than, the one you actually observed — a direct, exact sum with no distribution approximation anywhere. Because every probability is computed exactly from combinations, the result is trustworthy even on a handful of subjects.",
    whenToUse:
      "Use it for a 2×2 table of counts when the sample is small or any expected cell count is under ~5 — exactly the situation where chi-square becomes unreliable — e.g. survival counts for a tiny antibiotic vs. placebo trial.",
    formula: "P(table | margins) = ( C(a+b, a) · C(c+d, c) ) / C(N, a+c)   ·   p = Σ P(table') over all tables' at least as unlikely as observed",
    formulaBreakdown: [
      { term: "a, b, c, d", meaning: "the four cells of the 2×2 table; once the row and column totals are fixed, the single value a determines the entire table." },
      { term: "fixed margins", meaning: "the row totals and column totals are held constant — the test only considers tables that keep those same margins, which is what makes an exact enumeration possible." },
      { term: "C(n, k)", meaning: "the binomial coefficient “n choose k” — the combinatorics that give each table's exact hypergeometric probability under the no-association null." },
      { term: "P(table | margins)", meaning: "the exact probability of one specific table given the margins — computed from combinations, never from a bell-curve or chi-square approximation." },
      { term: "Σ over as-extreme tables", meaning: "the two-sided p-value sweeps a across all its possible values and sums the probabilities of every table no more likely than the observed one — an exact tail sum." },
    ],
    datasetCsv: "condition,survived,died\nantibiotic,9,1\nplacebo,3,7",
    code: "import csv\nimport io\nfrom math import comb\nfrom scipy import stats\n\ncsv_text = \"\"\"condition,survived,died\nantibiotic,9,1\nplacebo,3,7\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\ntable = [[int(r[\"survived\"]), int(r[\"died\"])] for r in rows]\na, b = table[0]\nc, d = table[1]\nprint(f\"observed 2x2 table: [[{a}, {b}], [{c}, {d}]]\")\n\nrow1, row2 = a + b, c + d\ncol1, col2 = a + c, b + d\nN = a + b + c + d\nprint(f\"row totals = [{row1}, {row2}], col totals = [{col1}, {col2}], N = {N}\")\n\n\ndef hypergeom_prob(a, b, c, d):\n    # Exact probability of THIS table given the fixed margins (hypergeometric).\n    return comb(a + b, a) * comb(c + d, c) / comb(N, a + c)\n\n\np_observed = hypergeom_prob(a, b, c, d)\nprint(f\"P(observed table | margins) = {p_observed:.6f}\")\n\n# Two-sided exact p: sum the probabilities of every table (with the SAME margins)\n# that is at least as unlikely as the one we observed. 'a' fully determines a\n# table once the margins are fixed, so we sweep 'a' over its possible range.\na_min = max(0, col1 - row2)\na_max = min(row1, col1)\nprint(f\"possible values of top-left cell a: {a_min}..{a_max}\")\np_value = 0.0\nfor a_i in range(a_min, a_max + 1):\n    b_i = row1 - a_i\n    c_i = col1 - a_i\n    d_i = row2 - c_i\n    p_i = hypergeom_prob(a_i, b_i, c_i, d_i)\n    if p_i <= p_observed + 1e-12:  # as extreme or more extreme than observed\n        p_value += p_i\n        print(f\"  a={a_i}: P={p_i:.6f}  (counted)\")\n    else:\n        print(f\"  a={a_i}: P={p_i:.6f}  (skipped, more likely than observed)\")\nprint(f\"two-sided p = sum of those probabilities = {p_value:.4f}\")\n\n# check: scipy's fisher_exact agrees\nodds, p_check = stats.fisher_exact(table, alternative=\"two-sided\")\nprint(f\"check: scipy.stats.fisher_exact -> odds_ratio={odds:.4f}, p={p_check:.4f}\")",
    datasetNote: "A 2×2 survival table from a tiny trial: 10 antibiotic-treated vs. 10 placebo subjects, survived vs. died — small enough that chi-square would be unreliable.",
    output: "observed 2x2 table: [[9, 1], [3, 7]]\nrow totals = [10, 10], col totals = [12, 8], N = 20\nP(observed table | margins) = 0.009526\npossible values of top-left cell a: 2..10\n  a=2: P=0.000357  (counted)\n  a=3: P=0.009526  (counted)\n  a=4: P=0.075018  (skipped, more likely than observed)\n  a=5: P=0.240057  (skipped, more likely than observed)\n  a=6: P=0.350083  (skipped, more likely than observed)\n  a=7: P=0.240057  (skipped, more likely than observed)\n  a=8: P=0.075018  (skipped, more likely than observed)\n  a=9: P=0.009526  (counted)\n  a=10: P=0.000357  (counted)\ntwo-sided p = sum of those probabilities = 0.0198\ncheck: scipy.stats.fisher_exact -> odds_ratio=21.0000, p=0.0198",
    caveat:
      "Fisher's exact needs raw COUNTS, not proportions, and is built for 2×2 tables (larger tables use generalizations). The two-sided p summed here matches scipy exactly; note scipy's reported odds-ratio is a separate summary of effect size, not the p-value.",
  },

  // ─── Regression diagnostics (regenerated) ─────────────────────────────────
  {
    id: "rmse-regression",
    title: "RMSE (root mean squared error)",
    category: "regression-diagnostics",
    aliases: ["root mean squared error","rmse"],
    definition:
      "RMSE measures the typical size of a regression model's prediction errors, in the SAME units as the thing you predicted (cm here) — a small RMSE means predictions land close to reality, a large one means they routinely miss. It gets there in the same shape as a standard deviation: for every point, take the gap between predicted and actual, square each gap so a +0.3 miss and a -0.3 miss both count as errors instead of canceling to zero, average those squared gaps (that average is the MSE), then take the square root at the very end to undo the squaring and return to the original units. The squaring step is what makes RMSE differ from MAE: because big misses are squared, RMSE punishes a single large error much more harshly than several small ones, so reach for it when large mistakes are especially costly and you want them to dominate the score.",
    whenToUse:
      "Report it to summarize how far off a regression model's predictions typically are (e.g. a growth-curve model predicting plant height), especially when large errors matter more than small ones.",
    formula: "RMSE = √( Σ(ŷᵢ − yᵢ)² / n )",
    formulaBreakdown: [
      { term: "ŷᵢ − yᵢ", meaning: "each prediction's error — the gap between the model's predicted value ŷᵢ (\"y-hat\") and the actually measured value yᵢ." },
      { term: "( … )²", meaning: "square every error so positive and negative misses can't cancel out, and so that a big miss counts far more heavily than a small one — this is what makes RMSE penalize large errors." },
      { term: "Σ … / n", meaning: "add up all the squared errors and divide by how many points there are — this average is the mean squared error (MSE)." },
      { term: "√", meaning: "take the square root at the end to undo the squaring and land back in the original units (cm, not cm²) — RMSE is literally the square root of MSE." },
    ],
    datasetCsv: "plant,predicted_cm,actual_cm\n1,8.0,8.1\n2,10.5,10.3\n3,11.2,11.0\n4,12.5,12.8\n5,15.0,15.1\n6,16.3,16.0\n7,18.4,18.5\n8,19.0,19.2",
    code: "import csv\nimport io\nfrom sklearn.metrics import mean_squared_error\n\ncsv_text = \"\"\"plant,predicted_cm,actual_cm\n1,8.0,8.1\n2,10.5,10.3\n3,11.2,11.0\n4,12.5,12.8\n5,15.0,15.1\n6,16.3,16.0\n7,18.4,18.5\n8,19.0,19.2\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\npredicted = [float(r[\"predicted_cm\"]) for r in rows]\nactual = [float(r[\"actual_cm\"]) for r in rows]\n\nn = len(actual)\nerrors = [p - a for p, a in zip(predicted, actual)]\nprint(f\"errors (predicted - actual): {[round(e, 2) for e in errors]}\")\n\nsquared = [e ** 2 for e in errors]\nprint(f\"squared errors: {[round(s, 4) for s in squared]}\")\n\nmse = sum(squared) / n\nprint(f\"MSE = sum(squared) / n = {sum(squared):.4f} / {n} = {mse:.4f} cm^2\")\n\nrmse = mse ** 0.5\nprint(f\"RMSE = sqrt(MSE) = sqrt({mse:.4f}) = {rmse:.4f} cm\")\n\n# check: sklearn agrees\nsk_rmse = mean_squared_error(actual, predicted) ** 0.5\nprint(f\"check: sklearn sqrt(mean_squared_error) = {sk_rmse:.4f} cm\")",
    datasetNote: "A growth model's predicted vs. actual plant heights (cm) for 8 plants.",
    output: "errors (predicted - actual): [-0.1, 0.2, 0.2, -0.3, -0.1, 0.3, -0.1, -0.2]\nsquared errors: [0.01, 0.04, 0.04, 0.09, 0.01, 0.09, 0.01, 0.04]\nMSE = sum(squared) / n = 0.3300 / 8 = 0.0413 cm^2\nRMSE = sqrt(MSE) = sqrt(0.0413) = 0.2031 cm\ncheck: sklearn sqrt(mean_squared_error) = 0.2031 cm",
    caveat:
      "RMSE is always ≥ MAE for the same errors, because squaring inflates big misses — if one outlier prediction is dragging RMSE up while MAE stays low, that's a sign a single large error (not consistent bias) is the problem.",
  },
  {
    id: "mae-regression",
    title: "MAE (mean absolute error)",
    category: "regression-diagnostics",
    aliases: ["mean absolute error","mae","l1 loss"],
    definition:
      "MAE measures a regression model's typical prediction error, in the original units (cm), by taking the plain average of the absolute sizes of the misses — no squaring anywhere. For every point it measures the gap between predicted and actual, throws away the sign with an absolute value (so a 0.3-too-high and a 0.3-too-low both count as an error of 0.3), and averages those. Because it never squares, MAE treats an error of 2 as exactly twice as bad as an error of 1 — a large miss doesn't get amplified the way it does in RMSE — which makes MAE more robust to the occasional wild outlier prediction and easier to explain (\"on average we're off by about this much\"). Reach for it when you want an honest, interpretable average error and don't want one freak mistake to dominate the score.",
    whenToUse:
      "Use it when you want the plain, interpretable \"average miss\" of a regression model and don't want large errors amplified — the natural complement to RMSE when comparing which errors are hurting you.",
    formula: "MAE = Σ |ŷᵢ − yᵢ| / n",
    formulaBreakdown: [
      { term: "ŷᵢ − yᵢ", meaning: "each prediction's error — predicted value minus actual value." },
      { term: "| … |", meaning: "the absolute value strips the sign so a too-high and a too-low miss both count as positive error — unlike RMSE, there is no squaring, so a big miss counts in exact proportion to its size, not more." },
      { term: "Σ … / n", meaning: "add up all those absolute errors and divide by the number of points — a plain average, giving the typical error in the original units (cm)." },
    ],
    datasetCsv: "plant,predicted_cm,actual_cm\n1,8.0,8.1\n2,10.5,10.3\n3,11.2,11.0\n4,12.5,12.8\n5,15.0,15.1\n6,16.3,16.0\n7,18.4,18.5\n8,19.0,19.2",
    code: "import csv\nimport io\nfrom sklearn.metrics import mean_absolute_error\n\ncsv_text = \"\"\"plant,predicted_cm,actual_cm\n1,8.0,8.1\n2,10.5,10.3\n3,11.2,11.0\n4,12.5,12.8\n5,15.0,15.1\n6,16.3,16.0\n7,18.4,18.5\n8,19.0,19.2\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\npredicted = [float(r[\"predicted_cm\"]) for r in rows]\nactual = [float(r[\"actual_cm\"]) for r in rows]\n\nn = len(actual)\nerrors = [p - a for p, a in zip(predicted, actual)]\nprint(f\"errors (predicted - actual): {[round(e, 2) for e in errors]}\")\n\nabs_errors = [abs(e) for e in errors]\nprint(f\"absolute errors: {[round(a, 2) for a in abs_errors]}\")\n\nmae = sum(abs_errors) / n\nprint(f\"MAE = sum(|errors|) / n = {sum(abs_errors):.2f} / {n} = {mae:.4f} cm\")\n\n# check: sklearn agrees\nprint(f\"check: sklearn.metrics.mean_absolute_error = {mean_absolute_error(actual, predicted):.4f} cm\")",
    datasetNote: "The same predicted-vs-actual plant heights (cm, 8 plants) used in the RMSE example, so the two metrics can be compared directly.",
    output: "errors (predicted - actual): [-0.1, 0.2, 0.2, -0.3, -0.1, 0.3, -0.1, -0.2]\nabsolute errors: [0.1, 0.2, 0.2, 0.3, 0.1, 0.3, 0.1, 0.2]\nMAE = sum(|errors|) / n = 1.50 / 8 = 0.1875 cm\ncheck: sklearn.metrics.mean_absolute_error = 0.1875 cm",
    caveat:
      "MAE and RMSE answer slightly different questions on the SAME data — MAE (0.19 cm here) is the average miss, RMSE (0.20 cm) weights big misses more; when they're close, errors are uniform, when RMSE ≫ MAE, a few large errors are dominating.",
  },
  {
    id: "mape-regression",
    title: "MAPE (mean absolute percentage error)",
    category: "regression-diagnostics",
    aliases: ["mean absolute percentage error","mape","percent error"],
    definition:
      "MAPE reports a model's typical error as a PERCENTAGE of the true value rather than in raw units, which makes it comparable across experiments measured on completely different scales — a 2% error means the same thing whether you're predicting grams of yield or millions of bacteria. For each point it takes the absolute error and divides by the actual value (turning \"off by 1.5 kg\" into \"off by 3%\"), then averages those percentages across all points. That scale-independence is its strength, but it comes with a sharp catch built into the formula: because you divide by the actual value, MAPE blows up toward infinity whenever a true value is near zero, and it also punishes over-predictions and under-predictions asymmetrically — so it is the right tool for strictly positive quantities well away from zero, and the wrong one when your data can be zero or negative.",
    whenToUse:
      "Use it when you want a scale-free, percentage error to compare models across different units or magnitudes (e.g. a yield forecast), and every actual value is safely positive and away from zero.",
    formula: "MAPE = ( Σ |yᵢ − ŷᵢ| / |yᵢ| ) / n",
    formulaBreakdown: [
      { term: "yᵢ − ŷᵢ", meaning: "each point's error — the actual value minus the model's prediction." },
      { term: "| … | / |yᵢ|", meaning: "the absolute error divided by the absolute ACTUAL value — this is the step that converts a raw miss into a fraction of the true value, and also the step that explodes if yᵢ is near zero." },
      { term: "Σ … / n", meaning: "average those per-point fractions across all points — the result is a fraction (0.0157 here); multiply by 100 to read it as a percentage (1.57%)." },
    ],
    datasetCsv: "day,predicted_kg,actual_kg\n1,20.0,20.1\n2,25.0,25.3\n3,30.5,31.0\n4,35.0,34.8\n5,40.0,41.2\n6,44.0,44.5\n7,50.0,48.5",
    code: "import csv\nimport io\nfrom sklearn.metrics import mean_absolute_percentage_error\n\ncsv_text = \"\"\"day,predicted_kg,actual_kg\n1,20.0,20.1\n2,25.0,25.3\n3,30.5,31.0\n4,35.0,34.8\n5,40.0,41.2\n6,44.0,44.5\n7,50.0,48.5\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\npredicted = [float(r[\"predicted_kg\"]) for r in rows]\nactual = [float(r[\"actual_kg\"]) for r in rows]\n\nn = len(actual)\npct_errors = [abs(a - p) / abs(a) for a, p in zip(actual, predicted)]\nprint(\"per-point |actual - predicted| / |actual|:\")\nfor i, (a, p, e) in enumerate(zip(actual, predicted, pct_errors), start=1):\n    print(f\"  day {i}: |{a} - {p}| / {a} = {e:.4f} ({e * 100:.2f}%)\")\n\nmape = sum(pct_errors) / n\nprint(f\"MAPE = mean of those fractions = {sum(pct_errors):.4f} / {n} = {mape:.4f}\")\nprint(f\"MAPE as a percentage = {mape * 100:.2f}%\")\n\n# check: sklearn agrees (returns the fraction, not the percentage)\nprint(f\"check: sklearn.metrics.mean_absolute_percentage_error = {mean_absolute_percentage_error(actual, predicted):.4f}\")",
    datasetNote: "A forecast model's predicted vs. actual daily crop yield (kg) over 7 days.",
    output: "per-point |actual - predicted| / |actual|:\n  day 1: |20.1 - 20.0| / 20.1 = 0.0050 (0.50%)\n  day 2: |25.3 - 25.0| / 25.3 = 0.0119 (1.19%)\n  day 3: |31.0 - 30.5| / 31.0 = 0.0161 (1.61%)\n  day 4: |34.8 - 35.0| / 34.8 = 0.0057 (0.57%)\n  day 5: |41.2 - 40.0| / 41.2 = 0.0291 (2.91%)\n  day 6: |44.5 - 44.0| / 44.5 = 0.0112 (1.12%)\n  day 7: |48.5 - 50.0| / 48.5 = 0.0309 (3.09%)\nMAPE = mean of those fractions = 0.1100 / 7 = 0.0157\nMAPE as a percentage = 1.57%\ncheck: sklearn.metrics.mean_absolute_percentage_error = 0.0157",
    caveat:
      "sklearn's `mean_absolute_percentage_error` returns the FRACTION (0.0157), not the percentage (1.57%) — multiply by 100 yourself for the familiar percent, and never use MAPE at all if any actual value can be zero.",
  },
  {
    id: "adjusted-r-squared",
    title: "Adjusted R²",
    category: "regression-diagnostics",
    aliases: ["adjusted r2","adjusted r-squared","r2 adj"],
    definition:
      "Plain R² has a well-known flaw: adding ANY new predictor to a regression — even a column of pure random noise — can only ever make R² go up or stay the same, never down, so a model with more predictors always looks at least as good even when the extras explain nothing real. Adjusted R² fixes this by charging a penalty for each predictor you add: it re-weights the leftover (residual) and total variation by their degrees of freedom, so a new predictor only raises adjusted R² if it explains MORE variation than you'd expect from a random column of the same size. That is why adjusted R² can actually DECREASE when you add a useless predictor, and why it — not plain R² — is the honest number to compare models with different numbers of predictors. It can even go slightly negative when a model fits worse than just predicting the mean.",
    whenToUse:
      "Use it instead of plain R² whenever you compare regression models that have DIFFERENT numbers of predictors (e.g. does adding soil-pH to a sunlight+water model actually help?).",
    formula: "R²_adj = 1 − (1 − R²)·(n − 1) / (n − p − 1)",
    formulaBreakdown: [
      { term: "R²", meaning: "the ordinary coefficient of determination — the fraction of variation the model explains, computed the usual 1 − SS_res/SS_tot way." },
      { term: "n", meaning: "the number of observations (rows of data) — more data softens the penalty per predictor." },
      { term: "p", meaning: "the number of predictors in the model, NOT counting the intercept — every extra predictor makes (n − p − 1) smaller, which is what inflates the penalty." },
      { term: "(n − 1)/(n − p − 1)", meaning: "the degrees-of-freedom correction: it scales up the unexplained fraction (1 − R²) by how many predictors you spent, so adding a predictor that doesn't earn its keep pushes adjusted R² DOWN." },
    ],
    datasetCsv: "plot,sunlight_hours,water_ml,soil_ph,yield_kg\n1,2,100,6.1,8.2\n2,4,120,6.3,10.4\n3,5,110,6.0,11.1\n4,6,140,6.5,12.9\n5,8,130,6.2,15.0\n6,9,150,6.4,16.1\n7,11,160,6.6,18.4\n8,12,155,6.3,19.3",
    code: "import csv\nimport io\nimport numpy as np\n\ncsv_text = \"\"\"plot,sunlight_hours,water_ml,soil_ph,yield_kg\n1,2,100,6.1,8.2\n2,4,120,6.3,10.4\n3,5,110,6.0,11.1\n4,6,140,6.5,12.9\n5,8,130,6.2,15.0\n6,9,150,6.4,16.1\n7,11,160,6.6,18.4\n8,12,155,6.3,19.3\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\nX = np.array([[float(r[\"sunlight_hours\"]), float(r[\"water_ml\"]), float(r[\"soil_ph\"])] for r in rows])\ny = np.array([float(r[\"yield_kg\"]) for r in rows])\n\nn = len(y)          # number of observations\np = X.shape[1]      # number of predictors (not counting the intercept)\nprint(f\"n = {n} observations, p = {p} predictors\")\n\n# Fit an ordinary least-squares model with an intercept column of 1s.\nX_design = np.column_stack([np.ones(n), X])\nbeta, *_ = np.linalg.lstsq(X_design, y, rcond=None)\ny_hat = X_design @ beta\n\nss_res = float(np.sum((y - y_hat) ** 2))\nss_tot = float(np.sum((y - y.mean()) ** 2))\nprint(f\"SS_residual = {ss_res:.4f}\")\nprint(f\"SS_total    = {ss_tot:.4f}\")\n\nr2 = 1 - ss_res / ss_tot\nprint(f\"R^2 = 1 - SS_res/SS_tot = 1 - {ss_res:.4f}/{ss_tot:.4f} = {r2:.4f}\")\n\nadj_r2 = 1 - (1 - r2) * (n - 1) / (n - p - 1)\nprint(f\"adjusted R^2 = 1 - (1 - R^2)*(n-1)/(n-p-1)\")\nprint(f\"             = 1 - (1 - {r2:.4f})*({n}-1)/({n}-{p}-1) = {adj_r2:.4f}\")\n\n# check: statsmodels reports both R^2 and adjusted R^2\nimport statsmodels.api as sm\nmodel = sm.OLS(y, X_design).fit()\nprint(f\"check: statsmodels OLS -> R^2={model.rsquared:.4f}, adj R^2={model.rsquared_adj:.4f}\")",
    datasetNote: "Eight plots with three predictors (sunlight hours, water mL, soil pH) and measured crop yield (kg).",
    output: "n = 8 observations, p = 3 predictors\nSS_residual = 0.1067\nSS_total    = 109.0350\nR^2 = 1 - SS_res/SS_tot = 1 - 0.1067/109.0350 = 0.9990\nadjusted R^2 = 1 - (1 - R^2)*(n-1)/(n-p-1)\n             = 1 - (1 - 0.9990)*(8-1)/(8-3-1) = 0.9983\ncheck: statsmodels OLS -> R^2=0.9990, adj R^2=0.9983",
    caveat:
      "Adjusted R² (0.9983) is always ≤ plain R² (0.9990) and the gap widens as you add predictors — if adjusted R² drops when you add a predictor, that predictor is not pulling its weight and should probably be dropped.",
  },
  {
    id: "logistic-odds-ratio",
    title: "Logistic-regression odds ratio",
    category: "regression-diagnostics",
    aliases: ["odds ratio","logistic regression","exp(beta)","logit"],
    definition:
      "When your outcome is yes/no (did the seed germinate?) rather than a number, you fit a LOGISTIC regression, which models the log-odds of the outcome as a straight line in the predictor. Its slope coefficient is on that awkward log-odds scale and hard to read directly — so you exponentiate it, and the result is the ODDS RATIO: the factor by which the odds of the outcome multiply for each one-unit increase in the predictor. An odds ratio of 1.91 for soak-hours means every extra hour of soaking makes germination almost twice as likely on the odds scale; an odds ratio of 1.0 means the predictor has no effect (the log-odds slope was zero), and below 1.0 means the predictor makes the outcome LESS likely. Exponentiating is the whole trick: it turns an additive effect on log-odds into a multiplicative, human-readable effect on odds.",
    whenToUse:
      "Use it when your outcome is binary (germinated / didn't, survived / didn't) and you want to say how much a predictor changes the odds — e.g. \"each extra soak-hour nearly doubles the odds of germination.\"",
    formula: "OR = e^β   where logit(p) = β₀ + β₁·x",
    formulaBreakdown: [
      { term: "logit(p) = ln(p/(1−p))", meaning: "the log-odds of the outcome — logistic regression assumes THIS quantity (not p itself) is a straight line in the predictor, which keeps predicted probabilities safely between 0 and 1." },
      { term: "β₁", meaning: "the fitted slope, i.e. the change in log-odds per one-unit increase in the predictor x — interpretable, but on the unintuitive log-odds scale." },
      { term: "e^β₁", meaning: "exponentiating the slope converts that additive change-in-log-odds into a multiplicative change-in-ODDS: the odds ratio, the factor the odds get multiplied by per +1 of x." },
      { term: "OR = 1 / > 1 / < 1", meaning: "an odds ratio of exactly 1 means no effect; above 1 means the predictor raises the odds of the outcome; below 1 means it lowers them." },
    ],
    datasetCsv: "seed,soak_hours,germinated\n1,2,0\n2,4,0\n3,6,0\n4,8,1\n5,10,0\n6,12,1\n7,14,1\n8,16,1\n9,18,1\n10,20,1",
    code: "import csv\nimport io\nimport numpy as np\nimport statsmodels.api as sm\n\ncsv_text = \"\"\"seed,soak_hours,germinated\n1,2,0\n2,4,0\n3,6,0\n4,8,1\n5,10,0\n6,12,1\n7,14,1\n8,16,1\n9,18,1\n10,20,1\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\nsoak = np.array([float(r[\"soak_hours\"]) for r in rows])\ngerm = np.array([int(r[\"germinated\"]) for r in rows])\nprint(f\"soak_hours: {[float(x) for x in soak]}\")\nprint(f\"germinated: {[int(x) for x in germ]}\")\n\n# Fit logistic regression: logit(p) = b0 + b1 * soak_hours\nX = sm.add_constant(soak)\nmodel = sm.Logit(germ, X).fit(disp=False)\nb0, b1 = model.params\nprint(f\"fitted logit coefficients: intercept b0 = {b0:.4f}, slope b1 = {b1:.4f}\")\n\n# The odds ratio for a predictor is exp(its coefficient): each +1 hour of soaking\n# multiplies the ODDS of germinating by this factor.\nodds_ratio = np.exp(b1)\nprint(f\"odds ratio = exp(b1) = exp({b1:.4f}) = {odds_ratio:.4f}\")\nprint(f\"each extra soak-hour multiplies the odds of germinating by {odds_ratio:.2f}x\")\n\n# A 95% CI for the odds ratio = exp(the coefficient's confidence interval).\nci_low, ci_high = model.conf_int()[1]\nprint(f\"95% CI for odds ratio = exp([{ci_low:.4f}, {ci_high:.4f}]) = [{np.exp(ci_low):.4f}, {np.exp(ci_high):.4f}]\")\n\n# check: exp of the coefficient equals the odds ratio statsmodels reports\nprint(f\"check: np.exp(model.params) -> OR for soak_hours = {np.exp(model.params[1]):.4f}\")",
    datasetNote: "Ten seeds soaked for varying hours, each labeled 1 if it germinated and 0 if not.",
    output: "soak_hours: [2.0, 4.0, 6.0, 8.0, 10.0, 12.0, 14.0, 16.0, 18.0, 20.0]\ngerminated: [0, 0, 0, 1, 0, 1, 1, 1, 1, 1]\nfitted logit coefficients: intercept b0 = -5.8246, slope b1 = 0.6477\nodds ratio = exp(b1) = exp(0.6477) = 1.9112\neach extra soak-hour multiplies the odds of germinating by 1.91x\n95% CI for odds ratio = exp([-0.1805, 1.4759]) = [0.8349, 4.3749]\ncheck: np.exp(model.params) -> OR for soak_hours = 1.9112",
    caveat:
      "An odds ratio is NOT a risk ratio — \"the odds nearly double\" is not the same as \"the probability nearly doubles,\" and the two diverge sharply when the outcome is common; also note the wide confidence interval here (it comfortably includes values near 1), a warning that 10 points is very little data for logistic regression.",
  },
  {
    id: "aic-bic",
    title: "AIC / BIC (model selection)",
    category: "regression-diagnostics",
    aliases: ["aic","bic","akaike","bayesian information criterion","information criterion"],
    definition:
      "AIC and BIC are single scores for comparing candidate models on the same data, balancing two things that pull in opposite directions: how well the model fits (rewarded through its log-likelihood) and how many parameters it spent to get that fit (penalized). The core idea is that a more complex model will ALWAYS fit the sample data at least a little better, so raw fit alone would always pick the biggest model and overfit — the parameter penalty is what stops that, letting you ask \"is the extra fit worth the extra complexity?\" Both take the form −2·log-likelihood + penalty·(number of parameters); the only difference is the penalty per parameter — AIC uses a flat 2, while BIC uses ln(n), which grows with sample size and so punishes complexity harder on large datasets. For either one the rule is the same and refreshingly simple: the model with the LOWER score wins.",
    whenToUse:
      "Use them to choose between competing models for the same data (e.g. a straight-line fit vs. a curved one) — pick the model with the lower AIC (or BIC); BIC is stricter and favors simpler models on big samples.",
    formula: "AIC = −2·ln L̂ + 2p   ·   BIC = −2·ln L̂ + ln(n)·p",
    formulaBreakdown: [
      { term: "ln L̂", meaning: "the maximized log-likelihood — how probable the observed data is under the fitted model; for a Gaussian linear model it's a direct function of the residual sum of squares, so better fit means larger ln L̂ (less negative)." },
      { term: "−2·ln L̂", meaning: "the fit term; the −2 is a scaling convention that puts it on the deviance scale — smaller (i.e. better fit) is better, matching the \"lower score wins\" rule." },
      { term: "p", meaning: "the number of fitted parameters (here 2: intercept + slope) — the complexity you're being charged for." },
      { term: "2p vs. ln(n)·p", meaning: "the penalty per parameter is the ONLY difference between the two: AIC charges a flat 2, BIC charges ln(n) (≈ 2.08 for n=8 here, and larger for bigger samples), so BIC penalizes extra parameters more heavily as data grows." },
      { term: "lower wins", meaning: "these are relative scores, meaningless in isolation — only their DIFFERENCE between two models on the SAME data matters, and the smaller value indicates the preferred model." },
    ],
    datasetCsv: "plot,dose_g,yield_kg\n1,0,20.1\n2,5,25.3\n3,10,31.0\n4,15,34.8\n5,20,41.2\n6,25,44.5\n7,30,49.0\n8,35,54.1",
    code: "import csv\nimport io\nimport numpy as np\n\ncsv_text = \"\"\"plot,dose_g,yield_kg\n1,0,20.1\n2,5,25.3\n3,10,31.0\n4,15,34.8\n5,20,41.2\n6,25,44.5\n7,30,49.0\n8,35,54.1\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\ndose = np.array([float(r[\"dose_g\"]) for r in rows])\nyld = np.array([float(r[\"yield_kg\"]) for r in rows])\n\nn = len(yld)\nX = np.column_stack([np.ones(n), dose])   # intercept + slope\nk = X.shape[1]                            # number of fitted coefficients (2)\nprint(f\"n = {n} observations, k = {k} fitted parameters (intercept + slope)\")\n\nbeta, *_ = np.linalg.lstsq(X, yld, rcond=None)\nresid = yld - X @ beta\nrss = float(np.sum(resid ** 2))\nprint(f\"residual sum of squares (RSS) = {rss:.4f}\")\n\n# For a Gaussian linear model, the maximized log-likelihood uses the MLE variance\n# sigma^2 = RSS/n. AIC and BIC then reward fit and penalize parameter count.\nsigma2 = rss / n\nlog_lik = -0.5 * n * (np.log(2 * np.pi) + np.log(sigma2) + 1)\nprint(f\"MLE variance sigma^2 = RSS/n = {sigma2:.4f}\")\nprint(f\"maximized log-likelihood = {log_lik:.4f}\")\n\n# p = the number of fitted regression coefficients (intercept + slope = 2), the\n# same count statsmodels penalizes. Fewer parameters is rewarded: for two models\n# fit to the same data, the SMALLER AIC/BIC wins.\np = k\naic = -2 * log_lik + 2 * p\nbic = -2 * log_lik + np.log(n) * p\nprint(f\"AIC = -2*logL + 2*p = -2*{log_lik:.4f} + 2*{p} = {aic:.4f}\")\nprint(f\"BIC = -2*logL + ln(n)*p = -2*{log_lik:.4f} + {np.log(n):.4f}*{p} = {bic:.4f}\")\n\n# check: statsmodels OLS reports the same AIC/BIC\nimport statsmodels.api as sm\nmodel = sm.OLS(yld, X).fit()\nprint(f\"check: statsmodels OLS -> AIC={model.aic:.4f}, BIC={model.bic:.4f}\")",
    datasetNote: "Eight fertilizer-dose (g) vs. crop-yield (kg) plots, fit with a simple two-parameter line.",
    output: "n = 8 observations, k = 2 fitted parameters (intercept + slope)\nresidual sum of squares (RSS) = 2.9998\nMLE variance sigma^2 = RSS/n = 0.3750\nmaximized log-likelihood = -7.4279\nAIC = -2*logL + 2*p = -2*-7.4279 + 2*2 = 18.8557\nBIC = -2*logL + ln(n)*p = -2*-7.4279 + 2.0794*2 = 19.0146\ncheck: statsmodels OLS -> AIC=18.8557, BIC=19.0146",
    caveat:
      "AIC and BIC values are only meaningful RELATIVE to another model fit on the exact same data — the raw number 18.86 means nothing on its own; also note statsmodels counts the 2 regression coefficients as the parameters (it does not add the variance), so match its convention when you cross-check.",
  },

  // ─── New classification metrics (regenerated) ────────────────────────────
  {
    id: "matthews-corrcoef",
    title: "Matthews correlation coefficient (MCC)",
    category: "classification-metrics",
    aliases: ["mcc","matthews_corrcoef","phi coefficient"],
    definition:
      "MCC is a single balanced score for a binary classifier that, unlike accuracy or F1, uses all four cells of the confusion matrix at once — true positives, true negatives, false positives, AND false negatives — which makes it hard to fool with imbalanced data. It is essentially a correlation coefficient between the predicted labels and the true labels, so it lives on the familiar −1 to +1 scale: +1 is a perfect classifier, 0 is no better than random guessing, and −1 is a classifier that is perfectly, consistently WRONG. Its key virtue is symmetry — it only scores high when the model does well on BOTH classes at the same time, so a model that trivially predicts the majority class every time (which can score high accuracy) gets an MCC near 0, honestly exposing that it learned nothing. That balance is why many practitioners treat MCC as the most informative single number for a binary classifier, especially on skewed datasets.",
    whenToUse:
      "Use it as a single trustworthy summary of a binary classifier, especially on imbalanced data where accuracy misleads — its −1-to-+1 scale (0 = random) makes \"is this model actually any good?\" easy to read.",
    formula: "MCC = (TP·TN − FP·FN) / √( (TP+FP)(TP+FN)(TN+FP)(TN+FN) )",
    formulaBreakdown: [
      { term: "TP, TN, FP, FN", meaning: "the four confusion-matrix counts — true positives, true negatives, false positives, false negatives; MCC is the only common metric that uses ALL FOUR, which is what makes it robust to imbalance." },
      { term: "TP·TN − FP·FN", meaning: "the numerator rewards correct predictions (TP·TN) and subtracts a penalty for the two error types (FP·FN) — it is large and positive only when the model gets both classes right, and negative when it systematically flips them." },
      { term: "the four (·+·) products", meaning: "the denominator multiplies the four row/column totals of the confusion matrix and square-roots them — this normalizes the score so it always lands in [−1, +1] regardless of class balance." },
      { term: "MCC ∈ [−1, +1]", meaning: "+1 = every prediction correct, 0 = no better than chance, −1 = every prediction wrong — the same interpretation as a correlation coefficient, which is exactly what MCC is between true and predicted labels." },
    ],
    datasetCsv: "photo,true_label,predicted_label\n1,weed,weed\n2,not_weed,not_weed\n3,weed,weed\n4,weed,not_weed\n5,not_weed,not_weed\n6,weed,weed\n7,not_weed,weed\n8,not_weed,not_weed\n9,weed,weed\n10,not_weed,not_weed\n11,weed,weed\n12,not_weed,not_weed",
    code: "import csv\nimport io\nfrom sklearn.metrics import matthews_corrcoef\n\ncsv_text = \"\"\"photo,true_label,predicted_label\n1,weed,weed\n2,not_weed,not_weed\n3,weed,weed\n4,weed,not_weed\n5,not_weed,not_weed\n6,weed,weed\n7,not_weed,weed\n8,not_weed,not_weed\n9,weed,weed\n10,not_weed,not_weed\n11,weed,weed\n12,not_weed,not_weed\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\ny_true = [r[\"true_label\"] for r in rows]\ny_pred = [r[\"predicted_label\"] for r in rows]\n\ntp = fp = fn = tn = 0\nfor t, p in zip(y_true, y_pred):\n    if t == \"weed\" and p == \"weed\":\n        tp += 1\n    elif t == \"not_weed\" and p == \"weed\":\n        fp += 1\n    elif t == \"weed\" and p == \"not_weed\":\n        fn += 1\n    else:\n        tn += 1\nprint(f\"TP={tp}, TN={tn}, FP={fp}, FN={fn}\")\n\nnumerator = tp * tn - fp * fn\nprint(f\"numerator = TP*TN - FP*FN = {tp}*{tn} - {fp}*{fn} = {numerator}\")\n\ndenom = ((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn)) ** 0.5\nprint(f\"denominator = sqrt((TP+FP)(TP+FN)(TN+FP)(TN+FN))\")\nprint(f\"            = sqrt({tp + fp}*{tp + fn}*{tn + fp}*{tn + fn}) = {denom:.4f}\")\n\nmcc = numerator / denom\nprint(f\"MCC = numerator / denominator = {numerator} / {denom:.4f} = {mcc:.4f}\")\n\n# check: sklearn agrees\ny_true_bin = [1 if t == \"weed\" else 0 for t in y_true]\ny_pred_bin = [1 if p == \"weed\" else 0 for p in y_pred]\nprint(f\"check: sklearn.metrics.matthews_corrcoef = {matthews_corrcoef(y_true_bin, y_pred_bin):.4f}\")",
    datasetNote: "True vs. predicted \"is it a weed?\" labels for 12 leaf photos.",
    output: "TP=5, TN=5, FP=1, FN=1\nnumerator = TP*TN - FP*FN = 5*5 - 1*1 = 24\ndenominator = sqrt((TP+FP)(TP+FN)(TN+FP)(TN+FN))\n            = sqrt(6*6*6*6) = 36.0000\nMCC = numerator / denominator = 24 / 36.0000 = 0.6667\ncheck: sklearn.metrics.matthews_corrcoef = 0.6667",
    caveat:
      "MCC's denominator is zero if any confusion-matrix row or column total is zero (e.g. the model never predicts the positive class) — by convention MCC is then defined as 0, meaning \"no better than random,\" which is the honest reading of a model that never fires.",
  },
  {
    id: "log-loss",
    title: "Log-loss (cross-entropy)",
    category: "classification-metrics",
    aliases: ["log loss","cross-entropy","logistic loss","binary cross entropy"],
    definition:
      "Log-loss scores a classifier that outputs PROBABILITIES rather than hard labels, and it grades not just whether you were right but how CONFIDENT you were. For each example it looks only at the probability you assigned to the TRUE class and takes the negative logarithm of it: being confidently right (probability near 1) earns a loss near 0, while being confidently WRONG (assigning a tiny probability to what actually happened) is punished savagely, because −ln of a number near zero shoots toward infinity. That asymmetry is the whole point — log-loss rewards well-calibrated humility and harshly penalizes overconfident mistakes, which is why it is the loss function logistic regression and neural-network classifiers actually minimize during training. A lower log-loss is better, and 0 is the unreachable ideal of assigning probability 1 to every correct answer.",
    whenToUse:
      "Use it when your model outputs a probability (not just a 0/1 label) and you care about CALIBRATION — how well the confidence matches reality — not just whether the final rounded label is right.",
    formula: "log-loss = −( Σ [ yᵢ·ln(pᵢ) + (1−yᵢ)·ln(1−pᵢ) ] ) / n",
    formulaBreakdown: [
      { term: "yᵢ", meaning: "the true label, 0 or 1 — it acts as a switch: when yᵢ=1 only the ln(pᵢ) term survives, when yᵢ=0 only the ln(1−pᵢ) term survives, so each example is graded solely on the probability it gave the ACTUAL outcome." },
      { term: "pᵢ", meaning: "the probability the model assigned to the positive class for example i — the number being graded." },
      { term: "ln(pᵢ)", meaning: "the natural log of that probability — near 0 when pᵢ is near 1 (confident and correct, small loss), and plunging toward −∞ as pᵢ approaches 0 (confident and wrong, huge loss)." },
      { term: "− … / n", meaning: "negate (so that better predictions give a smaller, positive loss) and average over all examples — lower is better, 0 is the perfect-but-unreachable score." },
    ],
    datasetCsv: "photo,true_label,predicted_prob\n1,weed,0.90\n2,not_weed,0.20\n3,weed,0.75\n4,weed,0.40\n5,not_weed,0.30\n6,not_weed,0.10\n7,weed,0.85\n8,not_weed,0.35",
    code: "import csv\nimport io\nimport math\nfrom sklearn.metrics import log_loss\n\ncsv_text = \"\"\"photo,true_label,predicted_prob\n1,weed,0.90\n2,not_weed,0.20\n3,weed,0.75\n4,weed,0.40\n5,not_weed,0.30\n6,not_weed,0.10\n7,weed,0.85\n8,not_weed,0.35\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\ny_true = [1 if r[\"true_label\"] == \"weed\" else 0 for r in rows]\ny_prob = [float(r[\"predicted_prob\"]) for r in rows]\n\nn = len(y_true)\n# Per-photo loss: -[y*ln(p) + (1-y)*ln(1-p)]. When the true label is weed (y=1)\n# only ln(p) survives; when it's not_weed (y=0) only ln(1-p) survives.\nlosses = []\nprint(\"per-photo cross-entropy loss:\")\nfor i, (y, p) in enumerate(zip(y_true, y_prob), start=1):\n    loss = -(y * math.log(p) + (1 - y) * math.log(1 - p))\n    losses.append(loss)\n    print(f\"  photo {i}: y={y}, p={p:.2f} -> loss = {loss:.4f}\")\n\nlog_loss_value = sum(losses) / n\nprint(f\"log-loss = mean of per-photo losses = {sum(losses):.4f} / {n} = {log_loss_value:.4f}\")\n\n# check: sklearn agrees\nprint(f\"check: sklearn.metrics.log_loss = {log_loss(y_true, y_prob, labels=[0, 1]):.4f}\")",
    datasetNote: "Eight leaf photos with true \"weed\"/\"not_weed\" labels and the model's predicted probability of \"weed.\"",
    output: "per-photo cross-entropy loss:\n  photo 1: y=1, p=0.90 -> loss = 0.1054\n  photo 2: y=0, p=0.20 -> loss = 0.2231\n  photo 3: y=1, p=0.75 -> loss = 0.2877\n  photo 4: y=1, p=0.40 -> loss = 0.9163\n  photo 5: y=0, p=0.30 -> loss = 0.3567\n  photo 6: y=0, p=0.10 -> loss = 0.1054\n  photo 7: y=1, p=0.85 -> loss = 0.1625\n  photo 8: y=0, p=0.35 -> loss = 0.4308\nlog-loss = mean of per-photo losses = 2.5878 / 8 = 0.3235\ncheck: sklearn.metrics.log_loss = 0.3235",
    caveat:
      "A single confidently-wrong prediction (assigning near-0 probability to what actually happened) can dominate the whole log-loss — that's by design (overconfidence is punished), but it means one mislabeled or genuinely surprising point can swamp the score, so always inspect the per-example losses too.",
  },
  {
    id: "specificity-npv",
    title: "Specificity & negative predictive value",
    category: "classification-metrics",
    aliases: ["specificity","npv","negative predictive value","true negative rate"],
    definition:
      "Specificity and NPV are the mirror-image partners of recall (sensitivity) and precision, focused on the NEGATIVE class instead of the positive one — they are exactly what you need when correctly identifying the \"clean\" cases matters as much as catching the flagged ones. Specificity asks a question about the world's actual negatives: of everything that truly was NOT a weed, what fraction did the model correctly clear? (It is recall computed for the negative class.) NPV asks a question about the model's negative CALLS: of everything the model labeled \"not a weed,\" what fraction really weren't? (It is precision for the negative class.) Together with sensitivity and precision they complete the four-way picture of a classifier, and they're indispensable in screening contexts — a high specificity means few false alarms, and a high NPV means you can trust an \"all clear\" result.",
    whenToUse:
      "Use them when correctly identifying NEGATIVES matters — e.g. a screening test where you want to trust a negative result (NPV) and avoid false alarms (specificity), the complements to recall and precision.",
    formula: "specificity = TN / (TN + FP)   ·   NPV = TN / (TN + FN)",
    formulaBreakdown: [
      { term: "TN (true negative)", meaning: "the model said \"not a weed\" and it really wasn't — the correct negative calls, shared by both formulas." },
      { term: "FP (false positive)", meaning: "the model flagged \"weed\" but it wasn't — a false alarm; it sits in specificity's denominator because specificity is about ALL the real negatives, flagged or not." },
      { term: "TN + FP (specificity's denominator)", meaning: "every photo that was ACTUALLY a non-weed — specificity asks what fraction of those true negatives the model correctly cleared (i.e. recall for the negative class)." },
      { term: "TN + FN (NPV's denominator)", meaning: "every photo the model PREDICTED as \"not a weed\" — NPV asks what fraction of those negative calls were actually correct (i.e. precision for the negative class)." },
    ],
    datasetCsv: "photo,true_label,predicted_label\n1,weed,weed\n2,not_weed,not_weed\n3,weed,weed\n4,weed,not_weed\n5,not_weed,not_weed\n6,weed,weed\n7,not_weed,weed\n8,not_weed,not_weed\n9,weed,weed\n10,not_weed,not_weed\n11,weed,not_weed\n12,not_weed,not_weed\n13,not_weed,not_weed\n14,not_weed,weed",
    code: "import csv\nimport io\nfrom sklearn.metrics import confusion_matrix\n\ncsv_text = \"\"\"photo,true_label,predicted_label\n1,weed,weed\n2,not_weed,not_weed\n3,weed,weed\n4,weed,not_weed\n5,not_weed,not_weed\n6,weed,weed\n7,not_weed,weed\n8,not_weed,not_weed\n9,weed,weed\n10,not_weed,not_weed\n11,weed,not_weed\n12,not_weed,not_weed\n13,not_weed,not_weed\n14,not_weed,weed\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\ny_true = [r[\"true_label\"] for r in rows]\ny_pred = [r[\"predicted_label\"] for r in rows]\n\ntp = fp = fn = tn = 0\nfor t, p in zip(y_true, y_pred):\n    if t == \"weed\" and p == \"weed\":\n        tp += 1\n    elif t == \"not_weed\" and p == \"weed\":\n        fp += 1\n    elif t == \"weed\" and p == \"not_weed\":\n        fn += 1\n    else:\n        tn += 1\nprint(f\"TP={tp}, FP={fp}, FN={fn}, TN={tn}\")\n\n# Specificity: of every ACTUAL negative (not_weed), what fraction were correctly\n# called negative? It is recall for the negative class.\nspecificity = tn / (tn + fp)\nprint(f\"specificity = TN / (TN + FP) = {tn} / ({tn} + {fp}) = {specificity:.4f}\")\n\n# Negative predictive value: of everything PREDICTED negative, what fraction\n# really were negative? It is precision for the negative class.\nnpv = tn / (tn + fn)\nprint(f\"NPV = TN / (TN + FN) = {tn} / ({tn} + {fn}) = {npv:.4f}\")\n\n# check: sklearn's confusion matrix gives the same TN, FP, FN counts\ny_true_bin = [1 if t == \"weed\" else 0 for t in y_true]\ny_pred_bin = [1 if p == \"weed\" else 0 for p in y_pred]\ncm = confusion_matrix(y_true_bin, y_pred_bin, labels=[0, 1])\ntn_c, fp_c, fn_c, tp_c = cm.ravel()\nprint(f\"check: sklearn confusion_matrix -> specificity={tn_c / (tn_c + fp_c):.4f}, NPV={tn_c / (tn_c + fn_c):.4f}\")",
    datasetNote: "True vs. predicted \"is it a weed?\" labels for 14 leaf photos.",
    output: "TP=4, FP=2, FN=2, TN=6\nspecificity = TN / (TN + FP) = 6 / (6 + 2) = 0.7500\nNPV = TN / (TN + FN) = 6 / (6 + 2) = 0.7500\ncheck: sklearn confusion_matrix -> specificity=0.7500, NPV=0.7500",
    caveat:
      "Both metrics depend on the base rate (how common negatives are) — NPV in particular can look reassuringly high simply because negatives are common, so report it alongside sensitivity/recall, never on its own.",
  },
  {
    id: "prediction-interval",
    title: "Prediction interval (regression)",
    category: "regression-diagnostics",
    aliases: ["prediction interval","forecast interval","PI"],
    definition:
      "A prediction interval is a range around a regression model's forecast for a SINGLE new observation — \"we predict this plot yields 41.9 kg, and we're 95% confident an actual new plot at this dose lands between 39.7 and 44.1 kg.\" It is deliberately wider than a confidence interval for the mean, and the reason is baked into the formula: a mean-CI only has to account for uncertainty in WHERE the line sits, but a prediction interval must ALSO cover the irreducible scatter of an individual point around that line — which is why its standard error carries an extra \"+1\" under the square root that the mean-CI lacks. The interval is narrowest right at the center of your data (the mean x) and fans out toward the edges, because the fitted line's position is least certain far from where most of your data sits. Use it whenever you're predicting a real future measurement, not the average trend.",
    whenToUse:
      "Use it when you want to bracket a SINGLE future measurement (e.g. \"what will THIS next plot yield?\") — not the average trend, which is what a narrower confidence interval on the mean gives you.",
    formula: "ŷ₀ ± t·s·√( 1 + 1/n + (x₀ − x̄)² / Sₓₓ )",
    formulaBreakdown: [
      { term: "ŷ₀", meaning: "the model's point prediction at the new x-value x₀ — the center of the interval (slope·x₀ + intercept)." },
      { term: "s", meaning: "the residual standard error, √(RSS/(n−2)) — the typical spread of the observed points around the fitted line." },
      { term: "1 + 1/n + (x₀−x̄)²/Sₓₓ", meaning: "three sources of uncertainty under the root: the leading 1 is the NEW point's own scatter (this is what makes it a prediction interval, not a mean CI), 1/n is uncertainty in the line's height, and the last term widens the interval the farther x₀ sits from the data's center x̄." },
      { term: "t", meaning: "the critical value from the t-distribution with n−2 degrees of freedom at your confidence level (95% here) — scipy looks it up; it sets how many standard errors wide the interval is." },
      { term: "Sₓₓ = Σ(xᵢ−x̄)²", meaning: "the spread of the x-values; a larger Sₓₓ (predictors spread out) shrinks the last term, meaning a well-spread design gives tighter predictions." },
    ],
    datasetCsv: "plot,dose_g,yield_kg\n1,0,20.1\n2,5,25.3\n3,10,31.0\n4,15,34.8\n5,20,41.2\n6,25,44.5\n7,30,49.0",
    code: "import csv\nimport io\nimport numpy as np\nfrom scipy import stats\n\ncsv_text = \"\"\"plot,dose_g,yield_kg\n1,0,20.1\n2,5,25.3\n3,10,31.0\n4,15,34.8\n5,20,41.2\n6,25,44.5\n7,30,49.0\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\ndose = np.array([float(r[\"dose_g\"]) for r in rows])\nyld = np.array([float(r[\"yield_kg\"]) for r in rows])\n\nn = len(dose)\nmean_x = dose.mean()\n\n# Fit the least-squares line.\nsxx = float(np.sum((dose - mean_x) ** 2))\nsxy = float(np.sum((dose - mean_x) * (yld - yld.mean())))\nslope = sxy / sxx\nintercept = yld.mean() - slope * mean_x\nprint(f\"fitted line: yield = {slope:.4f}*dose + {intercept:.4f}\")\n\n# Residual standard error s (spread of points around the line).\nresid = yld - (slope * dose + intercept)\ns_squared = float(np.sum(resid ** 2)) / (n - 2)\ns = s_squared ** 0.5\nprint(f\"residual std error s = sqrt(RSS/(n-2)) = sqrt({np.sum(resid ** 2):.4f}/{n - 2}) = {s:.4f}\")\n\n# Predict yield at a NEW dose and build a 95% PREDICTION interval around it.\nx_new = 22.0\ny_hat = slope * x_new + intercept\nprint(f\"point prediction at dose={x_new} g: y_hat = {y_hat:.4f} kg\")\n\n# Prediction interval widens by the extra \"+1\" under the root vs. a mean CI --\n# it must cover a single new observation's noise, not just the mean.\nse_pred = s * (1 + 1 / n + (x_new - mean_x) ** 2 / sxx) ** 0.5\nprint(f\"SE(prediction) = s*sqrt(1 + 1/n + (x_new-x_bar)^2/Sxx) = {se_pred:.4f}\")\n\ndf = n - 2\nt_crit = stats.t.ppf(0.975, df)   # two-sided 95%, scipy looks up the t quantile\nmargin = t_crit * se_pred\nprint(f\"t(0.975, df={df}) = {t_crit:.4f}, margin = t*SE = {margin:.4f}\")\nprint(f\"95% prediction interval = {y_hat:.4f} +/- {margin:.4f} = [{y_hat - margin:.4f}, {y_hat + margin:.4f}]\")\n\n# check: statsmodels' get_prediction gives the same interval\nimport statsmodels.api as sm\nX = sm.add_constant(dose)\nmodel = sm.OLS(yld, X).fit()\npred = model.get_prediction([1.0, x_new]).summary_frame(alpha=0.05)\nprint(f\"check: statsmodels PI = [{pred['obs_ci_lower'][0]:.4f}, {pred['obs_ci_upper'][0]:.4f}]\")",
    datasetNote: "Seven fertilizer-dose (g) vs. crop-yield (kg) plots, used to predict a new plot at dose = 22 g.",
    output: "fitted line: yield = 0.9664*dose + 20.6321\nresidual std error s = sqrt(RSS/(n-2)) = sqrt(2.9254/5) = 0.7649\npoint prediction at dose=22.0 g: y_hat = 41.8936 kg\nSE(prediction) = s*sqrt(1 + 1/n + (x_new-x_bar)^2/Sxx) = 0.8424\nt(0.975, df=5) = 2.5706, margin = t*SE = 2.1654\n95% prediction interval = 41.8936 +/- 2.1654 = [39.7282, 44.0590]\ncheck: statsmodels PI = [39.7282, 44.0590]",
    caveat:
      "A prediction interval is always WIDER than a confidence interval for the mean at the same x — don't confuse the two: the mean-CI answers \"where's the average trend?\" while the PI answers \"where will one new measurement land?\", and quoting the narrower mean-CI as if it bracketed a single outcome badly understates your real uncertainty.",
  },

  // ─── Epidemiology (regenerated) ───────────────────────────────────────────
  {
    id: "odds-ratio",
    title: "Odds ratio (OR)",
    category: "epidemiology",
    aliases: ["OR","2x2 table","case-control"],
    definition:
      "The odds ratio compares the ODDS of an outcome between an exposed group and an unexposed group, where \"odds\" means the number of cases divided by the number of non-cases (not cases divided by the total — that is a probability, not odds). You build it from a 2x2 table of counts: the odds of the outcome among the exposed is a/b (cases over non-cases in that row), the odds among the unexposed is c/d, and the odds ratio is simply one divided by the other — which algebraically collapses to the memorable cross-product ad/bc. An OR of 1 means exposure makes no difference to the odds; above 1 means the exposed group has higher odds of the outcome; below 1 means exposure is protective. Because the OR can be computed even when you sampled cases and controls separately (rather than following a whole population forward in time), it is the natural effect measure for case-control studies, whereas relative risk is not.",
    whenToUse:
      "Use it on a 2x2 table of exposure vs. outcome — especially in case-control-style setups (you picked how many \"cases\" and \"controls\" to sample) where a true risk can't be estimated, only odds.",
    formula: "OR = (odds | exposed) / (odds | unexposed) = (a/b) / (c/d) = ad / bc",
    formulaBreakdown: [
      { term: "a, b", meaning: "top row of the 2x2 table — among the EXPOSED, a = number with the outcome, b = number without it." },
      { term: "c, d", meaning: "bottom row — among the UNEXPOSED, c = number with the outcome, d = number without it." },
      { term: "a/b", meaning: "the ODDS of the outcome in the exposed group — cases divided by non-cases, NOT cases divided by the group total (that would be a probability)." },
      { term: "c/d", meaning: "the odds of the outcome in the unexposed group, built the same way." },
      { term: "ad / bc", meaning: "the two odds divided by one another algebraically simplify to this cross-product — the single number you actually report. OR = 1 means exposure is irrelevant; >1 means higher odds when exposed." },
    ],
    datasetCsv: "student,drank_energy_drink,failed_quiz\n1,yes,yes\n2,yes,yes\n3,yes,no\n4,yes,yes\n5,yes,no\n6,no,no\n7,no,yes\n8,no,no\n9,no,no\n10,no,no\n11,yes,yes\n12,no,no",
    code: "import csv\nimport io\nimport numpy as np\n\ncsv_text = \"\"\"student,drank_energy_drink,failed_quiz\n1,yes,yes\n2,yes,yes\n3,yes,no\n4,yes,yes\n5,yes,no\n6,no,no\n7,no,yes\n8,no,no\n9,no,no\n10,no,no\n11,yes,yes\n12,no,no\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\n\n# Build the 2x2 contingency table: exposure (energy drink) vs. outcome (failed).\na = sum(1 for r in rows if r[\"drank_energy_drink\"] == \"yes\" and r[\"failed_quiz\"] == \"yes\")\nb = sum(1 for r in rows if r[\"drank_energy_drink\"] == \"yes\" and r[\"failed_quiz\"] == \"no\")\nc = sum(1 for r in rows if r[\"drank_energy_drink\"] == \"no\" and r[\"failed_quiz\"] == \"yes\")\nd = sum(1 for r in rows if r[\"drank_energy_drink\"] == \"no\" and r[\"failed_quiz\"] == \"no\")\nprint(f\"                 failed=yes  failed=no\")\nprint(f\"energy=yes           a={a}         b={b}\")\nprint(f\"energy=no            c={c}         d={d}\")\n\n# Odds of failing WITHIN the exposed group, and within the unexposed group.\nodds_exposed = a / b\nodds_unexposed = c / d\nprint(f\"odds of failing | exposed   = a/b = {a}/{b} = {odds_exposed:.4f}\")\nprint(f\"odds of failing | unexposed = c/d = {c}/{d} = {odds_unexposed:.4f}\")\n\n# The odds ratio is the ratio of those two odds (equivalently ad/bc).\nodds_ratio = odds_exposed / odds_unexposed\nprint(f\"OR = odds_exposed / odds_unexposed = {odds_exposed:.4f} / {odds_unexposed:.4f} = {odds_ratio:.4f}\")\nprint(f\"OR = ad/bc = ({a}*{d})/({b}*{c}) = {(a * d) / (b * c):.4f}\")\n\n# 95% CI: work on the log scale, where the OR's sampling distribution is roughly normal.\nlog_or = np.log(odds_ratio)\nse_log_or = np.sqrt(1 / a + 1 / b + 1 / c + 1 / d)\nlo = np.exp(log_or - 1.96 * se_log_or)\nhi = np.exp(log_or + 1.96 * se_log_or)\nprint(f\"ln(OR) = {log_or:.4f}, SE(ln OR) = sqrt(1/a+1/b+1/c+1/d) = {se_log_or:.4f}\")\nprint(f\"95% CI = exp(ln(OR) +/- 1.96*SE) = [{lo:.4f}, {hi:.4f}]\")\n\n# check: scipy's sample odds ratio agrees\nfrom scipy.stats.contingency import odds_ratio as scipy_or\nres = scipy_or([[a, b], [c, d]], kind=\"sample\")\nprint(f\"check: scipy.stats.contingency.odds_ratio = {res.statistic:.4f}\")",
    datasetNote: "Twelve students recorded as exposed/unexposed (drank an energy drink) and outcome (failed the pop quiz).",
    output: "                 failed=yes  failed=no\nenergy=yes           a=4         b=2\nenergy=no            c=1         d=5\nodds of failing | exposed   = a/b = 4/2 = 2.0000\nodds of failing | unexposed = c/d = 1/5 = 0.2000\nOR = odds_exposed / odds_unexposed = 2.0000 / 0.2000 = 10.0000\nOR = ad/bc = (4*5)/(2*1) = 10.0000\nln(OR) = 2.3026, SE(ln OR) = sqrt(1/a+1/b+1/c+1/d) = 1.3964\n95% CI = exp(ln(OR) +/- 1.96*SE) = [0.6476, 154.4046]\ncheck: scipy.stats.contingency.odds_ratio = 10.0000",
    caveat:
      "The OR overstates the more intuitive relative risk when the outcome is common — here the OR is 10 but the actual risk ratio is far smaller. With rare outcomes the two nearly coincide; with common ones, report relative risk instead if your design allows it.",
  },
  {
    id: "relative-risk",
    title: "Relative risk (risk ratio, RR)",
    category: "epidemiology",
    aliases: ["RR","risk ratio","incidence ratio"],
    definition:
      "Relative risk compares the actual PROBABILITY (risk) of an outcome between two groups, where risk means cases divided by the group's TOTAL — a/(a+b) for the exposed, c/(c+d) for the unexposed. Unlike the odds ratio, which divides cases by non-cases, relative risk divides cases by everyone in the group, so it maps directly onto the plain-English question \"how much more likely is the bad outcome if you're exposed?\" An RR of 3 means the exposed group is three times as likely to have the outcome; an RR of 1 means no difference; an RR below 1 means exposure is protective. The catch is that you can only compute a genuine risk when you know the true denominators — i.e. you followed whole groups forward and counted outcomes — which is why RR belongs to cohort/experimental designs and not to case-control studies (where you chose the number of cases yourself and the denominators are meaningless).",
    whenToUse:
      "Use it when you followed whole groups forward and know each group's true size (a cohort or a randomized experiment) — it's the more intuitive \"X times as likely\" number that most readers actually want.",
    formula: "RR = (risk | exposed) / (risk | unexposed) = [ a/(a+b) ] / [ c/(c+d) ]",
    formulaBreakdown: [
      { term: "a, b", meaning: "exposed row — a = outcomes, b = non-outcomes; the exposed group's total is a+b." },
      { term: "c, d", meaning: "unexposed row — c = outcomes, d = non-outcomes; the unexposed total is c+d." },
      { term: "a/(a+b)", meaning: "the RISK (probability) of the outcome in the exposed group — cases divided by the WHOLE group, which is what makes this a true probability rather than odds." },
      { term: "c/(c+d)", meaning: "the risk of the outcome in the unexposed group, built identically." },
      { term: "RR = ratio of the two risks", meaning: "how many times more likely the outcome is when exposed. RR = 1 means exposure doesn't change the risk; RR = 3 means triple the risk; RR < 1 means exposure protects." },
    ],
    datasetCsv: "plant,fungicide,got_blight\n1,treated,no\n2,treated,no\n3,treated,yes\n4,treated,no\n5,treated,no\n6,treated,no\n7,treated,no\n8,treated,yes\n9,untreated,yes\n10,untreated,yes\n11,untreated,no\n12,untreated,yes\n13,untreated,yes\n14,untreated,no\n15,untreated,yes\n16,untreated,yes",
    code: "import csv\nimport io\nimport numpy as np\n\ncsv_text = \"\"\"plant,fungicide,got_blight\n1,treated,no\n2,treated,no\n3,treated,yes\n4,treated,no\n5,treated,no\n6,treated,no\n7,treated,no\n8,treated,yes\n9,untreated,yes\n10,untreated,yes\n11,untreated,no\n12,untreated,yes\n13,untreated,yes\n14,untreated,no\n15,untreated,yes\n16,untreated,yes\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\n\n# 2x2 counts: exposure = untreated (the \"risk\" group), outcome = got blight.\na = sum(1 for r in rows if r[\"fungicide\"] == \"untreated\" and r[\"got_blight\"] == \"yes\")\nb = sum(1 for r in rows if r[\"fungicide\"] == \"untreated\" and r[\"got_blight\"] == \"no\")\nc = sum(1 for r in rows if r[\"fungicide\"] == \"treated\" and r[\"got_blight\"] == \"yes\")\nd = sum(1 for r in rows if r[\"fungicide\"] == \"treated\" and r[\"got_blight\"] == \"no\")\nprint(f\"                blight=yes  blight=no\")\nprint(f\"untreated           a={a}         b={b}\")\nprint(f\"treated             c={c}         d={d}\")\n\n# Risk = fraction who got the outcome, computed separately in each group.\nrisk_exposed = a / (a + b)\nrisk_unexposed = c / (c + d)\nprint(f\"risk | untreated = a/(a+b) = {a}/{a + b} = {risk_exposed:.4f}\")\nprint(f\"risk | treated   = c/(c+d) = {c}/{c + d} = {risk_unexposed:.4f}\")\n\n# Relative risk is the ratio of those two risks.\nrr = risk_exposed / risk_unexposed\nprint(f\"RR = risk_untreated / risk_treated = {risk_exposed:.4f} / {risk_unexposed:.4f} = {rr:.4f}\")\n\n# 95% CI on the log scale (RR's sampling distribution is skewed; log makes it ~normal).\nlog_rr = np.log(rr)\nse_log_rr = np.sqrt(1 / a - 1 / (a + b) + 1 / c - 1 / (c + d))\nlo = np.exp(log_rr - 1.96 * se_log_rr)\nhi = np.exp(log_rr + 1.96 * se_log_rr)\nprint(f\"ln(RR) = {log_rr:.4f}, SE(ln RR) = {se_log_rr:.4f}\")\nprint(f\"95% CI = exp(ln(RR) +/- 1.96*SE) = [{lo:.4f}, {hi:.4f}]\")\n\n# check: statsmodels' 2x2 table gives the same relative risk\nfrom statsmodels.stats.contingency_tables import Table2x2\nrr_check = Table2x2([[a, b], [c, d]]).riskratio\nprint(f\"check: statsmodels Table2x2.riskratio = {rr_check:.4f}\")",
    datasetNote: "Sixteen plants split into untreated vs. fungicide-treated, each scored for whether it developed blight.",
    output: "                blight=yes  blight=no\nuntreated           a=6         b=2\ntreated             c=2         d=6\nrisk | untreated = a/(a+b) = 6/8 = 0.7500\nrisk | treated   = c/(c+d) = 2/8 = 0.2500\nRR = risk_untreated / risk_treated = 0.7500 / 0.2500 = 3.0000\nln(RR) = 1.0986, SE(ln RR) = 0.6455\n95% CI = exp(ln(RR) +/- 1.96*SE) = [0.8466, 10.6311]\ncheck: statsmodels Table2x2.riskratio = 3.0000",
    caveat:
      "You cannot compute a valid relative risk from a case-control study — if you decided in advance how many \"cases\" to include, the group totals (a+b, c+d) are artifacts of your sampling, not real population sizes; use the odds ratio there instead.",
  },
  {
    id: "number-needed-to-treat",
    title: "Number needed to treat (NNT)",
    category: "epidemiology",
    aliases: ["NNT","absolute risk reduction","ARR"],
    definition:
      "The number needed to treat translates a difference in outcome rates into a concrete, countable answer: how many subjects must receive the treatment for ONE extra good outcome (or one avoided bad outcome) to occur, compared with not treating. It is built in two steps — first the absolute risk reduction (ARR), which is just the plain difference between the two groups' event rates, and then its reciprocal, 1/ARR, rounded up to a whole subject because you can't treat a fraction of one. This matters because a relative measure can look impressive while hiding a tiny absolute effect: \"doubles the germination rate\" sounds huge, but if the rate went from 1% to 2% the ARR is only 0.01 and the NNT is 100. A small NNT (like 2 or 3) means the treatment helps almost everyone; a large NNT means you'd treat many subjects to benefit just one.",
    whenToUse:
      "Report it alongside a relative effect to keep the result honest — it tells a reader the real-world cost of the treatment (\"prime 3 seeds to gain 1 sprout\") in a way a percentage or ratio never quite conveys.",
    formula: "ARR = EER − CER   ·   NNT = ⌈ 1 / ARR ⌉",
    formulaBreakdown: [
      { term: "EER", meaning: "experimental event rate — the fraction of the TREATED group with the good outcome (germinated seeds / treated seeds)." },
      { term: "CER", meaning: "control event rate — the same fraction in the untreated group." },
      { term: "ARR = EER − CER", meaning: "absolute risk reduction (here an absolute benefit INCREASE) — the plain difference in event rates, on the 0-to-1 probability scale, NOT a ratio." },
      { term: "1 / ARR", meaning: "the reciprocal of that difference — if treating raises the success rate by 0.375, then on average 1/0.375 ≈ 2.67 subjects must be treated per extra success." },
      { term: "⌈ … ⌉ (round up)", meaning: "always round UP to a whole subject — you can't treat 2.67 of a seed, and rounding down would overstate the treatment's efficiency." },
    ],
    datasetCsv: "seed,group,germinated\n1,primed,yes\n2,primed,yes\n3,primed,yes\n4,primed,no\n5,primed,yes\n6,primed,yes\n7,primed,yes\n8,primed,no\n9,control,yes\n10,control,no\n11,control,no\n12,control,yes\n13,control,no\n14,control,yes\n15,control,no\n16,control,no",
    code: "import csv\nimport io\nimport math\n\ncsv_text = \"\"\"seed,group,germinated\n1,primed,yes\n2,primed,yes\n3,primed,yes\n4,primed,no\n5,primed,yes\n6,primed,yes\n7,primed,yes\n8,primed,no\n9,control,yes\n10,control,no\n11,control,no\n12,control,yes\n13,control,no\n14,control,yes\n15,control,no\n16,control,no\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\n\n# NNT is built from the two groups' \"good outcome\" rates. Here the good\n# outcome is germination, so we count germinated / total in each group.\nprimed = [r for r in rows if r[\"group\"] == \"primed\"]\ncontrol = [r for r in rows if r[\"group\"] == \"control\"]\n\nprimed_good = sum(1 for r in primed if r[\"germinated\"] == \"yes\")\ncontrol_good = sum(1 for r in control if r[\"germinated\"] == \"yes\")\nprint(f\"primed:  {primed_good}/{len(primed)} germinated\")\nprint(f\"control: {control_good}/{len(control)} germinated\")\n\n# Event rate = probability of the good outcome in each arm.\neer = primed_good / len(primed)     # experimental (treated) event rate\ncer = control_good / len(control)   # control event rate\nprint(f\"EER (primed germination rate)  = {primed_good}/{len(primed)} = {eer:.4f}\")\nprint(f\"CER (control germination rate) = {control_good}/{len(control)} = {cer:.4f}\")\n\n# Absolute risk reduction = the difference in event rates (here a benefit increase).\narr = eer - cer\nprint(f\"ARR (absolute benefit increase) = EER - CER = {eer:.4f} - {cer:.4f} = {arr:.4f}\")\n\n# NNT = 1 / ARR, rounded UP: how many seeds you must prime to gain one extra sprout.\nnnt_exact = 1 / arr\nnnt = math.ceil(nnt_exact)\nprint(f\"NNT = 1 / ARR = 1 / {arr:.4f} = {nnt_exact:.4f} -> round up -> {nnt}\")\nprint(f\"interpretation: prime ~{nnt} seeds to get 1 extra germination vs. not priming\")\n\n# check: recompute NNT straight from the raw counts as a sanity cross-check\neer_check = primed_good / len(primed)\ncer_check = control_good / len(control)\nprint(f\"check: 1/(EER-CER) = 1/({eer_check:.4f}-{cer_check:.4f}) = {1 / (eer_check - cer_check):.4f}\")",
    datasetNote: "Sixteen seeds split into a moisture-primed group and a control, each scored for whether it germinated.",
    output: "primed:  6/8 germinated\ncontrol: 3/8 germinated\nEER (primed germination rate)  = 6/8 = 0.7500\nCER (control germination rate) = 3/8 = 0.3750\nARR (absolute benefit increase) = EER - CER = 0.7500 - 0.3750 = 0.3750\nNNT = 1 / ARR = 1 / 0.3750 = 2.6667 -> round up -> 3\ninterpretation: prime ~3 seeds to get 1 extra germination vs. not priming\ncheck: 1/(EER-CER) = 1/(0.7500-0.3750) = 2.6667",
    caveat:
      "NNT is only meaningful next to its own ARR and sample size — a small study can produce a flattering NNT by chance, and an NNT computed from a relative risk borrowed from a very different baseline rate can be badly misleading.",
  },
  {
    id: "sensitivity-specificity",
    title: "Sensitivity & specificity",
    category: "epidemiology",
    aliases: ["true positive rate","true negative rate","diagnostic accuracy"],
    definition:
      "Sensitivity and specificity describe how good a yes/no test is, but they split the job in two because a single \"accuracy\" number hides which kind of mistake a test makes. Sensitivity is the true-positive rate: of everything that is truly POSITIVE, what fraction did the test correctly flag? — computed as TP/(TP+FN), it is punished only by false negatives (real cases the test missed). Specificity is the true-negative rate: of everything that is truly NEGATIVE, what fraction did the test correctly clear? — computed as TN/(TN+FP), it is punished only by false positives (false alarms). Crucially, both are conditioned on the TRUE state, not on what the test said, which is exactly why they don't depend on how common the condition is (unlike a raw \"how often is the test right\" figure). A screening test wants high sensitivity (miss nothing); a confirmatory test wants high specificity (no false alarms).",
    whenToUse:
      "Use them to evaluate any binary detector against a known ground truth — a diagnostic test, a contamination sensor, a classifier — when you need to separate \"how many real cases does it catch\" from \"how many false alarms does it raise.\"",
    formula: "sensitivity = TP / (TP + FN)   ·   specificity = TN / (TN + FP)",
    formulaBreakdown: [
      { term: "TP", meaning: "true positives — truly positive samples the test correctly called positive." },
      { term: "FN", meaning: "false negatives — truly positive samples the test WRONGLY called negative (missed cases); these are what drag sensitivity down." },
      { term: "TN", meaning: "true negatives — truly negative samples the test correctly cleared." },
      { term: "FP", meaning: "false positives — truly negative samples the test WRONGLY flagged (false alarms); these are what drag specificity down." },
      { term: "TP / (TP + FN)", meaning: "sensitivity — the denominator is EVERY truly positive sample, so it answers \"of the real cases, what share did we catch?\" and ignores how the test did on negatives entirely." },
      { term: "TN / (TN + FP)", meaning: "specificity — the denominator is every truly negative sample, answering \"of the healthy ones, what share did we correctly clear?\"" },
    ],
    datasetCsv: "sample,true_disease,test_result\n1,positive,positive\n2,positive,positive\n3,positive,positive\n4,positive,negative\n5,positive,positive\n6,positive,positive\n7,negative,negative\n8,negative,negative\n9,negative,positive\n10,negative,negative\n11,negative,negative\n12,negative,negative\n13,negative,negative\n14,positive,positive",
    code: "import csv\nimport io\n\ncsv_text = \"\"\"sample,true_disease,test_result\n1,positive,positive\n2,positive,positive\n3,positive,positive\n4,positive,negative\n5,positive,positive\n6,positive,positive\n7,negative,negative\n8,negative,negative\n9,negative,positive\n10,negative,negative\n11,negative,negative\n12,negative,negative\n13,negative,negative\n14,positive,positive\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\n\n# Confusion counts: compare the test result against the KNOWN true status.\ntp = sum(1 for r in rows if r[\"true_disease\"] == \"positive\" and r[\"test_result\"] == \"positive\")\nfn = sum(1 for r in rows if r[\"true_disease\"] == \"positive\" and r[\"test_result\"] == \"negative\")\ntn = sum(1 for r in rows if r[\"true_disease\"] == \"negative\" and r[\"test_result\"] == \"negative\")\nfp = sum(1 for r in rows if r[\"true_disease\"] == \"negative\" and r[\"test_result\"] == \"positive\")\nprint(f\"TP={tp} (sick, test+)   FN={fn} (sick, test-)\")\nprint(f\"FP={fp} (well, test+)   TN={tn} (well, test-)\")\n\n# Sensitivity: of the truly SICK, what fraction did the test catch?\nsensitivity = tp / (tp + fn)\nprint(f\"sensitivity = TP/(TP+FN) = {tp}/{tp + fn} = {sensitivity:.4f}\")\n\n# Specificity: of the truly WELL, what fraction did the test correctly clear?\nspecificity = tn / (tn + fp)\nprint(f\"specificity = TN/(TN+FP) = {tn}/{tn + fp} = {specificity:.4f}\")\n\n# check: sklearn's recall on each class matches (recall of the positive class is\n# sensitivity; recall of the negative class is specificity).\nfrom sklearn.metrics import recall_score\ny_true = [1 if r[\"true_disease\"] == \"positive\" else 0 for r in rows]\ny_pred = [1 if r[\"test_result\"] == \"positive\" else 0 for r in rows]\nsens_check = recall_score(y_true, y_pred, pos_label=1)\nspec_check = recall_score(y_true, y_pred, pos_label=0)\nprint(f\"check: sklearn recall pos={sens_check:.4f} (sens), recall neg={spec_check:.4f} (spec)\")",
    datasetNote: "Fourteen samples with a known true disease status (positive/negative) and the result a rapid test gave for each.",
    output: "TP=6 (sick, test+)   FN=1 (sick, test-)\nFP=1 (well, test+)   TN=6 (well, test-)\nsensitivity = TP/(TP+FN) = 6/7 = 0.8571\nspecificity = TN/(TN+FP) = 6/7 = 0.8571\ncheck: sklearn recall pos=0.8571 (sens), recall neg=0.8571 (spec)",
    caveat:
      "High sensitivity and specificity do NOT mean a positive result is probably true — when the condition is rare, even a very specific test throws mostly false positives. To turn these into \"given a positive, how likely is it real?\" you need the base rate and Bayes' theorem (see the Bayes' theorem entry).",
  },

  // ─── Agreement (regenerated) ───────────────────────────────────────────────
  {
    id: "cohens-kappa",
    title: "Cohen's kappa (inter-rater agreement)",
    category: "agreement",
    aliases: ["kappa","inter-rater reliability","rater agreement"],
    definition:
      "Cohen's kappa measures how well two raters agree when sorting items into categories, but with a crucial correction: it subtracts out the agreement you'd expect purely by chance. Two people scoring leaves as healthy/diseased will agree on SOME leaves just by coincidence — if both call things \"healthy\" half the time at random, they'd match about 50% of the time with zero real skill — so a raw \"they agreed 83% of the time\" figure overstates their true reliability. Kappa fixes this by taking observed agreement (po) and expected-by-chance agreement (pe, from the raters' category rates), then rescaling: (po − pe)/(1 − pe). The denominator (1 − pe) is the room for improvement ABOVE chance, so kappa answers \"of the agreement that wasn't guaranteed by chance, how much did they actually achieve?\" It runs from 1 (perfect) down through 0 (no better than chance) and can even go negative (worse than chance). Rules of thumb: >0.6 is good, >0.8 is excellent.",
    whenToUse:
      "Use it when two people (or two methods) independently label the same items into categories and you want to prove they agree well enough to trust — e.g. two students each scoring the same photos as healthy/diseased before pooling their scores.",
    formula: "κ = (pₒ − pₑ) / (1 − pₑ)",
    formulaBreakdown: [
      { term: "pₒ", meaning: "observed agreement — the plain fraction of items the two raters labeled identically." },
      { term: "pₑ", meaning: "chance-expected agreement — for each category, multiply the two raters' rates of using that category and sum; this is how often they'd match if each labeled independently at their own base rates." },
      { term: "pₒ − pₑ", meaning: "the agreement ABOVE what chance alone would deliver — the part that reflects genuine shared judgment rather than coincidence." },
      { term: "1 − pₑ", meaning: "the maximum possible agreement above chance (the \"room left to improve\"); dividing by it rescales kappa so that perfect agreement gives exactly 1 no matter how skewed the categories are." },
      { term: "κ", meaning: "the result: 1 = perfect, 0 = no better than chance, negative = worse than chance. It is deliberately harder to score high on than raw percent agreement." },
    ],
    datasetCsv: "leaf,rater_A,rater_B\n1,healthy,healthy\n2,diseased,diseased\n3,healthy,healthy\n4,diseased,healthy\n5,diseased,diseased\n6,healthy,healthy\n7,diseased,diseased\n8,healthy,diseased\n9,healthy,healthy\n10,diseased,diseased\n11,healthy,healthy\n12,diseased,diseased",
    code: "import csv\nimport io\n\ncsv_text = \"\"\"leaf,rater_A,rater_B\n1,healthy,healthy\n2,diseased,diseased\n3,healthy,healthy\n4,diseased,healthy\n5,diseased,diseased\n6,healthy,healthy\n7,diseased,diseased\n8,healthy,diseased\n9,healthy,healthy\n10,diseased,diseased\n11,healthy,healthy\n12,diseased,diseased\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\nn = len(rows)\n\n# Observed agreement: fraction of leaves both raters labeled the same way.\nagree = sum(1 for r in rows if r[\"rater_A\"] == r[\"rater_B\"])\npo = agree / n\nprint(f\"n = {n} leaves, both raters agreed on {agree}\")\nprint(f\"observed agreement po = {agree}/{n} = {po:.4f}\")\n\n# Expected agreement by chance: for each category, multiply the two raters'\n# marginal rates and sum -- how often they'd match if labeling independently.\ncats = [\"healthy\", \"diseased\"]\npe = 0.0\nfor cat in cats:\n    pa = sum(1 for r in rows if r[\"rater_A\"] == cat) / n\n    pb = sum(1 for r in rows if r[\"rater_B\"] == cat) / n\n    print(f\"  {cat}: P(A)={pa:.4f}, P(B)={pb:.4f}, product={pa * pb:.4f}\")\n    pe += pa * pb\nprint(f\"chance agreement pe = sum of products = {pe:.4f}\")\n\n# Kappa rescales observed agreement relative to chance: 0 = only chance, 1 = perfect.\nkappa = (po - pe) / (1 - pe)\nprint(f\"kappa = (po - pe)/(1 - pe) = ({po:.4f} - {pe:.4f})/(1 - {pe:.4f}) = {kappa:.4f}\")\n\n# check: sklearn's cohen_kappa_score agrees\nfrom sklearn.metrics import cohen_kappa_score\na = [r[\"rater_A\"] for r in rows]\nb = [r[\"rater_B\"] for r in rows]\nprint(f\"check: sklearn.metrics.cohen_kappa_score = {cohen_kappa_score(a, b):.4f}\")",
    datasetNote: "Twelve leaves each independently scored healthy/diseased by two student raters (A and B).",
    output: "n = 12 leaves, both raters agreed on 10\nobserved agreement po = 10/12 = 0.8333\n  healthy: P(A)=0.5000, P(B)=0.5000, product=0.2500\n  diseased: P(A)=0.5000, P(B)=0.5000, product=0.2500\nchance agreement pe = sum of products = 0.5000\nkappa = (po - pe)/(1 - pe) = (0.8333 - 0.5000)/(1 - 0.5000) = 0.6667\ncheck: sklearn.metrics.cohen_kappa_score = 0.6667",
    caveat:
      "Kappa can look deceptively low when one category is very rare even if the raters almost always agree (the \"kappa paradox\"), because chance agreement pe becomes huge — always report the raw agreement and category counts alongside kappa, not kappa alone.",
  },
  {
    id: "intraclass-correlation",
    title: "Intraclass correlation (ICC)",
    category: "agreement",
    aliases: ["ICC","reliability","rater reliability","ICC(2,1)"],
    definition:
      "The intraclass correlation is the agreement measure for NUMERIC ratings — where Cohen's kappa handles categories, ICC handles continuous scores several raters assign to the same subjects (e.g. three judges each measuring the same seedlings). Its core idea is a variance ratio: of all the variation in the ratings, what fraction is REAL differences between subjects versus noise from raters disagreeing? If the seedlings genuinely differ a lot and the raters closely track those differences, between-subject variance dominates and ICC approaches 1; if raters scatter their scores so that most variation is disagreement, ICC drops toward 0. Mechanically it's built from a two-way ANOVA table — mean squares for subjects, for raters, and for residual error — combined so that the numerator is the true between-subject signal and the denominator is that signal plus all the noise. This particular form, ICC(2,1), treats raters as a random sample and scores ABSOLUTE agreement (raters must give similar values, not just rank subjects the same way), which is the version you want when the actual numbers matter.",
    whenToUse:
      "Use it when several raters give NUMERIC scores to the same set of subjects and you want one number for how reliable those scores are — e.g. three judges scoring the same science-fair posters 1-10, before you average their scores.",
    formula: "ICC(2,1) = (MS_subj − MS_err) / [ MS_subj + (k−1)·MS_err + (k/n)·(MS_rater − MS_err) ]",
    formulaBreakdown: [
      { term: "n, k", meaning: "n = number of subjects (seedlings), k = number of raters — the ratings form an n×k table." },
      { term: "MS_subj", meaning: "between-subjects mean square — how much the subjects' own average scores spread apart; this is the REAL signal ICC is trying to isolate." },
      { term: "MS_rater", meaning: "between-raters mean square — how much the raters differ from each other on average (a lenient rater vs. a harsh one); a source of disagreement that ABSOLUTE-agreement ICC must penalize." },
      { term: "MS_err", meaning: "residual mean square — the leftover subject×rater noise after removing subject and rater effects; the irreducible measurement error." },
      { term: "numerator (MS_subj − MS_err)", meaning: "the true between-subject variance with measurement noise stripped out — the signal." },
      { term: "denominator", meaning: "that signal PLUS every source of disagreement (residual error scaled by k−1, and rater bias scaled by k/n) — so ICC = signal / (signal + all noise), landing between 0 and 1." },
    ],
    datasetCsv: "seedling,rater1,rater2,rater3\n1,8.0,8.5,8.2\n2,6.1,6.0,6.4\n3,9.3,9.0,9.5\n4,7.2,7.5,7.0\n5,5.4,5.0,5.6\n6,8.8,9.1,8.6",
    code: "import csv\nimport io\n\n# Each seedling (subject) is measured by 3 raters. ICC asks: how much of the\n# total variation is real between-seedling differences vs. rater disagreement?\ncsv_text = \"\"\"seedling,rater1,rater2,rater3\n1,8.0,8.5,8.2\n2,6.1,6.0,6.4\n3,9.3,9.0,9.5\n4,7.2,7.5,7.0\n5,5.4,5.0,5.6\n6,8.8,9.1,8.6\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\nraters = [\"rater1\", \"rater2\", \"rater3\"]\ndata = [[float(r[c]) for c in raters] for r in rows]\n\nn = len(data)             # number of subjects (seedlings)\nk = len(raters)           # number of raters\ngrand = sum(v for row in data for v in row) / (n * k)\nprint(f\"n = {n} seedlings, k = {k} raters, grand mean = {grand:.4f}\")\n\n# Row (subject) means and column (rater) means.\nrow_means = [sum(row) / k for row in data]\ncol_means = [sum(data[i][j] for i in range(n)) / n for j in range(k)]\nprint(f\"seedling means = {[round(m, 3) for m in row_means]}\")\nprint(f\"rater means    = {[round(m, 3) for m in col_means]}\")\n\n# Sums of squares: between subjects, between raters, and residual error.\nss_rows = k * sum((rm - grand) ** 2 for rm in row_means)\nss_cols = n * sum((cm - grand) ** 2 for cm in col_means)\nss_total = sum((data[i][j] - grand) ** 2 for i in range(n) for j in range(k))\nss_err = ss_total - ss_rows - ss_cols\nprint(f\"SS_subjects = {ss_rows:.4f}, SS_raters = {ss_cols:.4f}, SS_error = {ss_err:.4f}\")\n\n# Mean squares = SS / degrees of freedom.\nms_rows = ss_rows / (n - 1)\nms_cols = ss_cols / (k - 1)\nms_err = ss_err / ((n - 1) * (k - 1))\nprint(f\"MS_subjects = {ms_rows:.4f}, MS_raters = {ms_cols:.4f}, MS_error = {ms_err:.4f}\")\n\n# ICC(2,1): two-way random effects, single-rater absolute agreement.\nicc = (ms_rows - ms_err) / (ms_rows + (k - 1) * ms_err + k * (ms_cols - ms_err) / n)\nprint(f\"ICC(2,1) = (MS_s - MS_e) / (MS_s + (k-1)*MS_e + k*(MS_r - MS_e)/n)\")\nprint(f\"ICC(2,1) = {icc:.4f}\")\n\n# check: recompute the same ICC(2,1) with numpy's vectorized mean/sum over the\n# raw array (no hand-built loops) -- an independent path to the same number.\nimport numpy as np\narr = np.array(data)\ngm = arr.mean()\nmsr = k * ((arr.mean(axis=1) - gm) ** 2).sum() / (n - 1)\nmsc = n * ((arr.mean(axis=0) - gm) ** 2).sum() / (k - 1)\nsst = ((arr - gm) ** 2).sum()\nmse = (sst - k * ((arr.mean(axis=1) - gm) ** 2).sum() - n * ((arr.mean(axis=0) - gm) ** 2).sum()) / ((n - 1) * (k - 1))\nicc_check = (msr - mse) / (msr + (k - 1) * mse + k * (msc - mse) / n)\nprint(f\"check: numpy MS-based ICC(2,1) = {icc_check:.4f}\")",
    datasetNote: "Six seedlings each measured (height, cm) by three raters — an n=6 × k=3 ratings table.",
    output: "n = 6 seedlings, k = 3 raters, grand mean = 7.5111\nseedling means = [8.233, 6.167, 9.267, 7.233, 5.333, 8.833]\nrater means    = [7.467, 7.517, 7.55]\nSS_subjects = 35.9378, SS_raters = 0.0211, SS_error = 0.7589\nMS_subjects = 7.1876, MS_raters = 0.0106, MS_error = 0.0759\nICC(2,1) = (MS_s - MS_e) / (MS_s + (k-1)*MS_e + k*(MS_r - MS_e)/n)\nICC(2,1) = 0.9733\ncheck: numpy MS-based ICC(2,1) = 0.9733",
    caveat:
      "There are several ICC \"forms\" (single vs. average raters, consistency vs. absolute agreement, one-way vs. two-way) that give different numbers on the same data — this is ICC(2,1), single-rater absolute agreement; always state which form you used, because a consistency ICC would ignore the rater-bias term and read higher.",
  },

  // ─── Bayesian (regenerated) ────────────────────────────────────────────────
  {
    id: "bayes-posterior",
    title: "Bayes' theorem (posterior probability)",
    category: "bayesian",
    aliases: ["Bayes theorem","posterior","base rate","false positive paradox"],
    definition:
      "Bayes' theorem updates a prior belief into a posterior belief after seeing evidence, and its most important lesson for a science-fair student is the \"false positive paradox\": a positive result from an accurate test can still mean the condition is probably ABSENT, if the condition is rare to begin with. The theorem formalizes this by combining three numbers — the prior (how common the condition is before testing), the test's sensitivity (P(positive | condition present)), and its specificity (which gives P(positive | absent) = 1 − specificity). The denominator P(positive) is the total probability of seeing a positive at all, summing the two separate ways one can arise: a true positive from a real case plus a false positive from a healthy one. When the condition is rare, the healthy pool is so much larger that its trickle of false positives can outnumber the true positives entirely — which is why the posterior, P(condition | positive) = P(positive | condition)·prior / P(positive), can come out surprisingly low even for a 90%-accurate test.",
    whenToUse:
      "Use it whenever you have a test result and want the probability the thing is REALLY there — you must fold in how common it is (the base rate), because sensitivity and specificity alone can't answer \"given a positive, how likely is it true?\"",
    formula: "P(H | E) = [ P(E | H)·P(H) ] / [ P(E | H)·P(H) + P(E | ¬H)·P(¬H) ]",
    formulaBreakdown: [
      { term: "P(H)", meaning: "the prior — probability the hypothesis is true BEFORE the evidence (here, how common the toxin is: 5%). This is the base rate that the false-positive paradox hinges on." },
      { term: "P(E | H)", meaning: "the likelihood — probability of the evidence IF the hypothesis is true (a positive test given the toxin is present = the sensitivity, 0.90)." },
      { term: "P(E | ¬H)", meaning: "probability of the SAME evidence when the hypothesis is false (a positive test given NO toxin = 1 − specificity, the false-alarm rate)." },
      { term: "P(¬H)", meaning: "the prior probability the hypothesis is false (1 − P(H)); multiplied by the false-alarm rate, it counts how many false positives the large healthy pool produces." },
      { term: "denominator P(E)", meaning: "the total probability of the evidence — true positives PLUS false positives — which normalizes the result into a proper probability. When the condition is rare, this term is dominated by false positives, dragging the posterior down." },
      { term: "P(H | E)", meaning: "the posterior — the updated probability the hypothesis is true AFTER seeing the evidence; this is the number you actually care about." },
    ],
    datasetCsv: "quantity,value\nprior_prevalence,0.05\nsensitivity,0.90\nspecificity,0.92",
    code: "import csv\nimport io\n\n# A rapid pond-water test for an algae toxin. We know its accuracy from a\n# validation study, plus how common the toxin actually is (the base rate).\ncsv_text = \"\"\"quantity,value\nprior_prevalence,0.05\nsensitivity,0.90\nspecificity,0.92\"\"\"\n\nrows = {r[\"quantity\"]: float(r[\"value\"]) for r in csv.DictReader(io.StringIO(csv_text))}\nprior = rows[\"prior_prevalence\"]      # P(toxin present) before testing\nsens = rows[\"sensitivity\"]            # P(test+ | toxin present)\nspec = rows[\"specificity\"]            # P(test- | no toxin)\nprint(f\"prior P(toxin) = {prior:.4f}\")\nprint(f\"sensitivity P(+|toxin) = {sens:.4f}, specificity P(-|no toxin) = {spec:.4f}\")\n\n# A pond just tested POSITIVE. What's the probability it truly has the toxin?\n# Bayes: P(toxin|+) = P(+|toxin)P(toxin) / P(+), and P(+) sums both ways a\n# positive can occur -- a true positive and a false positive.\np_pos_given_toxin = sens\np_pos_given_no = 1 - spec\nprint(f\"P(+|toxin) = {p_pos_given_toxin:.4f}, P(+|no toxin) = 1 - specificity = {p_pos_given_no:.4f}\")\n\n# Total probability of a positive test (the denominator / normalizer).\np_pos = p_pos_given_toxin * prior + p_pos_given_no * (1 - prior)\nprint(f\"P(+) = P(+|toxin)P(toxin) + P(+|no)P(no)\")\nprint(f\"P(+) = {p_pos_given_toxin:.4f}*{prior:.4f} + {p_pos_given_no:.4f}*{1 - prior:.4f} = {p_pos:.4f}\")\n\n# Posterior: the updated belief after seeing the positive result.\nposterior = (p_pos_given_toxin * prior) / p_pos\nprint(f\"posterior P(toxin|+) = ({p_pos_given_toxin:.4f}*{prior:.4f}) / {p_pos:.4f} = {posterior:.4f}\")\nprint(f\"despite a positive test, only {posterior * 100:.1f}% chance the toxin is really present\")\n\n# check: recompute the posterior via a natural-frequency table on 10000 ponds.\nN = 10000\ntoxin = round(prior * N)\ntp = round(toxin * sens)\nfp = round((N - toxin) * (1 - spec))\nprint(f\"check: of {N} ponds -> {tp} true positives, {fp} false positives\")\nprint(f\"check: {tp}/({tp}+{fp}) = {tp / (tp + fp):.4f}\")",
    datasetNote: "Three fixed quantities for a pond-water toxin test: its prior prevalence (5%), sensitivity (90%), and specificity (92%).",
    output: "prior P(toxin) = 0.0500\nsensitivity P(+|toxin) = 0.9000, specificity P(-|no toxin) = 0.9200\nP(+|toxin) = 0.9000, P(+|no toxin) = 1 - specificity = 0.0800\nP(+) = P(+|toxin)P(toxin) + P(+|no)P(no)\nP(+) = 0.9000*0.0500 + 0.0800*0.9500 = 0.1210\nposterior P(toxin|+) = (0.9000*0.0500) / 0.1210 = 0.3719\ndespite a positive test, only 37.2% chance the toxin is really present\ncheck: of 10000 ponds -> 450 true positives, 760 false positives\ncheck: 450/(450+760) = 0.3719",
    caveat:
      "The posterior is only as trustworthy as the prior you plug in — guessing the base rate badly swings the answer wildly, and the paradox (a positive test still likely being wrong) is strongest exactly when the condition is rare, which is when people most often forget to include the prior at all.",
  },
  {
    id: "bootstrap-ci",
    title: "Bootstrap confidence interval",
    category: "bayesian",
    aliases: ["bootstrap","resampling","percentile interval","nonparametric CI"],
    definition:
      "The bootstrap builds a confidence interval by brute-force resampling instead of relying on a formula and a normality assumption. The core trick is to treat your one sample AS IF it were the whole population: you draw a new \"resample\" of the same size by picking values from your data WITH replacement (so some originals appear twice, others not at all), compute your statistic on that resample, and repeat thousands of times. The spread of those thousands of resampled statistics mimics how much the statistic would bounce around if you could actually re-run the experiment — and a 95% percentile interval is then just the 2.5th-to-97.5th percentiles of that pile of resampled values. Its power is that it needs no formula for the standard error and no assumption that the data are normal, so it works for statistics (medians, ratios, correlations) whose sampling distributions have no clean textbook formula, and it handles small, skewed, outlier-y samples gracefully.",
    whenToUse:
      "Reach for it when the textbook ± formula doesn't apply — a skewed sample, a small n, or a statistic like the median or a ratio that has no simple standard-error formula — and you still want an honest confidence interval.",
    formula: "resample* with replacement → recompute θ̂* × B  ·  95% CI = [ percentile₂.₅(θ̂*), percentile₉₇.₅(θ̂*) ]",
    formulaBreakdown: [
      { term: "θ̂", meaning: "your statistic of interest computed on the real data (here the sample mean) — the thing you want an interval around." },
      { term: "resample* with replacement", meaning: "draw n values from your data allowing repeats — this simulates \"another sample from the same population,\" and the with-replacement part is what makes each resample differ." },
      { term: "θ̂*", meaning: "the statistic recomputed on ONE resample; doing this B times produces a whole distribution of plausible values for the statistic." },
      { term: "B", meaning: "the number of resamples (10,000 here) — larger B makes the interval's endpoints more stable, at the cost of more computation." },
      { term: "percentile₂.₅ … percentile₉₇.₅", meaning: "the 2.5th and 97.5th percentiles of the B resampled statistics — the middle 95% of them IS the confidence interval, no normality assumed." },
    ],
    datasetCsv: "trial,cleanup_minutes\n1,42\n2,55\n3,38\n4,47\n5,120\n6,44\n7,51\n8,39\n9,46\n10,58",
    code: "import csv\nimport io\nimport numpy as np\n\ncsv_text = \"\"\"trial,cleanup_minutes\n1,42\n2,55\n3,38\n4,47\n5,120\n6,44\n7,51\n8,39\n9,46\n10,58\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\ndata = np.array([float(r[\"cleanup_minutes\"]) for r in rows])\nn = len(data)\nobserved_mean = data.mean()\nprint(f\"observed sample mean = {observed_mean:.2f} min (n={n})\")\n\n# Bootstrap: resample n values WITH replacement many times, recompute the mean\n# each time. The spread of those resample-means approximates how much our mean\n# would wobble if we could re-run the whole experiment.\nrng = np.random.default_rng(42)   # fixed seed -> reproducible resamples\nB = 10000\nboot_means = np.empty(B)\nfor i in range(B):\n    sample = data[rng.integers(0, n, size=n)]   # draw n indices with replacement\n    boot_means[i] = sample.mean()\n\nprint(f\"drew B = {B} bootstrap resamples\")\nprint(f\"first 3 resample means: {[round(float(m), 2) for m in boot_means[:3]]}\")\nprint(f\"mean of bootstrap means = {boot_means.mean():.2f} (near the observed mean)\")\nprint(f\"bootstrap SE (std of resample means) = {boot_means.std(ddof=1):.2f} min\")\n\n# Percentile 95% CI: the 2.5th and 97.5th percentiles of the resample means.\nlo, hi = np.percentile(boot_means, [2.5, 97.5])\nprint(f\"95% percentile CI = [{lo:.2f}, {hi:.2f}] min\")\n\n# check: scipy.stats.bootstrap on the SAME seed reproduces the interval\nfrom scipy.stats import bootstrap\nres = bootstrap((data,), np.mean, n_resamples=10000,\n                method=\"percentile\", random_state=np.random.default_rng(42))\nprint(f\"check: scipy.stats.bootstrap CI = [{res.confidence_interval.low:.2f}, {res.confidence_interval.high:.2f}]\")",
    datasetNote: "Ten beach-cleanup durations (minutes), including one long 120-minute session that skews the sample.",
    output: "observed sample mean = 54.00 min (n=10)\ndrew B = 10000 bootstrap resamples\nfirst 3 resample means: [59.1, 52.3, 62.4]\nmean of bootstrap means = 53.95 (near the observed mean)\nbootstrap SE (std of resample means) = 7.23 min\n95% percentile CI = [43.70, 69.90] min\ncheck: scipy.stats.bootstrap CI = [43.70, 69.90]",
    caveat:
      "The bootstrap needs a fixed random seed to be reproducible (a different seed shifts the interval slightly), and it can't rescue a tiny or biased sample — resampling 3 values just reshuffles the same 3 numbers, so it invents no information the data didn't already contain.",
  },
  {
    id: "permutation-test",
    title: "Permutation test",
    category: "bayesian",
    aliases: ["randomization test","exact test","shuffle test","resampling test"],
    definition:
      "A permutation test computes a p-value by directly simulating its own definition rather than looking one up in a distribution table. The null hypothesis is that the group label doesn't matter — that \"music\" and \"silence\" are interchangeable stickers on the same pool of plants. If that were true, you could freely reassign which plants are labeled which, and the difference in group means would be just as likely to come out any which way. So the test pools all the values, then reconsiders every possible way to split them back into two groups of the original sizes, recomputing the mean difference for each split; together these form the exact null distribution of \"differences you'd see if the label were meaningless.\" The p-value is simply the fraction of those relabelings whose difference is at least as extreme as the one you actually observed. When the sample is small enough (here only C(10,5)=252 splits), you can ENUMERATE every relabeling for an exact answer; for larger samples you'd randomly sample many relabelings instead.",
    whenToUse:
      "Use it as an assumption-light alternative to a t-test when your sample is small, non-normal, or otherwise doesn't meet the t-test's conditions — it asks the significance question directly by shuffling labels, with no distributional assumption at all.",
    formula: "p = ( # relabelings with |Δ*| ≥ |Δ_observed| ) / ( total relabelings )",
    formulaBreakdown: [
      { term: "Δ_observed", meaning: "the real difference in group means computed with the labels as they actually were (music mean − silence mean)." },
      { term: "relabeling", meaning: "one way of reassigning which subjects belong to each group while keeping the group sizes fixed — under the null, every relabeling is equally plausible because the label is assumed meaningless." },
      { term: "Δ*", meaning: "the mean difference recomputed for a given relabeling; collecting Δ* over ALL relabelings builds the exact null distribution." },
      { term: "|Δ*| ≥ |Δ_observed|", meaning: "count a relabeling as \"at least as extreme\" if its difference (in absolute value, for a two-sided test) matches or beats the observed one — these are the outcomes that would look as surprising as your real result under the null." },
      { term: "total relabelings", meaning: "with n=10 and groups of 5 there are C(10,5)=252 distinct splits, few enough to enumerate EXACTLY; the p-value is the extreme count divided by this total." },
    ],
    datasetCsv: "plant,group,growth_cm\n1,music,4.2\n2,music,5.1\n3,music,4.8\n4,music,5.5\n5,music,4.9\n6,silence,3.8\n7,silence,4.1\n8,silence,3.5\n9,silence,4.0\n10,silence,3.9",
    code: "import csv\nimport io\nimport numpy as np\nfrom itertools import combinations\n\ncsv_text = \"\"\"plant,group,growth_cm\n1,music,4.2\n2,music,5.1\n3,music,4.8\n4,music,5.5\n5,music,4.9\n6,silence,3.8\n7,silence,4.1\n8,silence,3.5\n9,silence,4.0\n10,silence,3.9\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\nmusic = np.array([float(r[\"growth_cm\"]) for r in rows if r[\"group\"] == \"music\"])\nsilence = np.array([float(r[\"growth_cm\"]) for r in rows if r[\"group\"] == \"silence\"])\n\n# Observed effect: the real difference in group means.\nobserved_diff = music.mean() - silence.mean()\nprint(f\"music mean = {music.mean():.4f}, silence mean = {silence.mean():.4f}\")\nprint(f\"observed difference = {observed_diff:.4f} cm\")\n\n# Permutation idea: if the 'music'/'silence' label didn't matter, we could reassign\n# which plants are labeled 'music'. With only 10 plants there are C(10,5)=252 ways\n# to pick the music group, so we EXACTLY enumerate every one -- no randomness needed.\npooled = np.concatenate([music, silence])\nn = len(pooled)\nn_music = len(music)\nall_diffs = []\nfor combo in combinations(range(n), n_music):\n    music_idx = list(combo)\n    silence_idx = [i for i in range(n) if i not in combo]\n    diff = pooled[music_idx].mean() - pooled[silence_idx].mean()\n    all_diffs.append(diff)\n\nall_diffs = np.array(all_diffs)\ntotal = len(all_diffs)\ncount_as_extreme = int(np.sum(np.abs(all_diffs) >= abs(observed_diff) - 1e-9))\nprint(f\"enumerated all {total} label assignments (C(10,5))\")\nprint(f\"permuted-diff range: [{all_diffs.min():.3f}, {all_diffs.max():.3f}]\")\nprint(f\"# assignments at least as extreme as observed = {count_as_extreme}\")\n\n# Exact two-sided p-value: fraction of ALL assignments as extreme as the observed.\np_value = count_as_extreme / total\nprint(f\"p = extreme / total = {count_as_extreme} / {total} = {p_value:.4f}\")\n\n# check: scipy.stats.permutation_test also enumerates exactly (252 < default cap)\nfrom scipy.stats import permutation_test\ndef stat(a, b):\n    return a.mean() - b.mean()\nres = permutation_test((music, silence), stat, permutation_type=\"independent\",\n                       alternative=\"two-sided\")\nprint(f\"check: scipy.stats.permutation_test p = {res.pvalue:.4f}\")",
    datasetNote: "Ten plants split into a music group and a silence group, each with its measured growth (cm).",
    output: "music mean = 4.9000, silence mean = 3.8600\nobserved difference = 1.0400 cm\nenumerated all 252 label assignments (C(10,5))\npermuted-diff range: [-1.040, 1.040]\n# assignments at least as extreme as observed = 2\np = extreme / total = 2 / 252 = 0.0079\ncheck: scipy.stats.permutation_test p = 0.0079",
    caveat:
      "Exact enumeration is only feasible for small samples — the number of relabelings explodes combinatorially, so larger datasets require randomly SAMPLING relabelings instead (with a fixed seed for reproducibility), which turns the exact p-value into a close estimate.",
  },
  {
    id: "hazard-ratio",
    title: "Hazard ratio (survival analysis)",
    category: "epidemiology",
    aliases: ["HR","survival analysis","time-to-event","Mantel-Haenszel"],
    definition:
      "A hazard ratio compares how FAST an event happens between two groups when you're tracking time-to-event data — time until mold appears, until a plant wilts, until a part fails. It exists because such data have two wrinkles a simple mean can't handle: the outcome is a duration, and some subjects are CENSORED (the study ended, or the loaf was tossed, before the event ever happened, so you only know it survived at least that long). The hazard is the instantaneous risk of the event among those still \"at risk\" at each moment, and the hazard ratio pools that comparison across every time an event occurs. The Mantel-Haenszel approach shown here does this concretely: at each distinct event time it forms a 2x2 table of group-vs-event over only the subjects still at risk then, weights each table by its risk-set size, and combines them into one ratio. An HR of 1 means the two groups fail at the same rate; above 1 means the reference group fails FASTER (shorter survival); below 1 means it fails slower.",
    whenToUse:
      "Use it for time-to-event experiments where some subjects don't reach the event before you stop watching (censoring) — comparing, say, how quickly mold appears on preservative-treated vs. plain bread, where some loaves get discarded still clean.",
    formula: "HR = Σₜ (aₜ·dₜ / Tₜ) / Σₜ (bₜ·cₜ / Tₜ)   over each event time t",
    formulaBreakdown: [
      { term: "t (each event time)", meaning: "every distinct time at which the event actually occurs — the analysis only stops to build a table at these moments, ignoring the gaps between them." },
      { term: "risk set / Tₜ", meaning: "at time t, the subjects still being followed (event not yet happened, not yet censored); Tₜ is how many that is — the table's total, and its weight." },
      { term: "aₜ, bₜ", meaning: "in the reference (control) group at time t: aₜ = had the event right now, bₜ = still at risk without it." },
      { term: "cₜ, dₜ", meaning: "in the comparison group at time t: cₜ = had the event now, dₜ = still at risk without it." },
      { term: "aₜ·dₜ / Tₜ  and  bₜ·cₜ / Tₜ", meaning: "the Mantel-Haenszel cross-product terms for that time's 2x2, each divided by the risk-set size so larger risk sets carry more weight; summing over t and dividing gives one pooled hazard ratio." },
      { term: "HR", meaning: "the pooled ratio: HR = 1 means equal event rates; HR > 1 means the reference (control) group experiences the event faster (shorter survival) than the comparison group." },
    ],
    datasetCsv: "loaf,group,time_days,event\n1,control,3,1\n2,control,4,1\n3,control,4,1\n4,control,6,1\n5,control,7,0\n6,preservative,5,1\n7,preservative,8,1\n8,preservative,9,0\n9,preservative,10,1\n10,preservative,12,0",
    code: "import csv\nimport io\n\n# Time (days) until each mold colony was spotted on bread; event=1 means mold\n# appeared, event=0 means the loaf was tossed still-clean (censored). We compare\n# a preservative group against a plain-bread control.\ncsv_text = \"\"\"loaf,group,time_days,event\n1,control,3,1\n2,control,4,1\n3,control,4,1\n4,control,6,1\n5,control,7,0\n6,preservative,5,1\n7,preservative,8,1\n8,preservative,9,0\n9,preservative,10,1\n10,preservative,12,0\"\"\"\n\nrows = list(csv.DictReader(io.StringIO(csv_text)))\nfor r in rows:\n    r[\"time_days\"] = int(r[\"time_days\"])\n    r[\"event\"] = int(r[\"event\"])\n\n# Mantel-Haenszel hazard ratio: at every distinct time an event happens, form a\n# 2x2 of (group) x (had the event now vs. survived) over the AT-RISK loaves, then\n# pool. a = control events now, and we accumulate MH numerator/denominator.\nevent_times = sorted({r[\"time_days\"] for r in rows if r[\"event\"] == 1})\nprint(f\"distinct event times: {event_times}\")\n\nnum = 0.0   # sum of a*d/T   (control-event weighted)\nden = 0.0   # sum of b*c/T   (preservative-event weighted)\nfor t in event_times:\n    at_risk = [r for r in rows if r[\"time_days\"] >= t]        # still in the study at t\n    a = sum(1 for r in at_risk if r[\"group\"] == \"control\" and r[\"time_days\"] == t and r[\"event\"] == 1)\n    b = sum(1 for r in at_risk if r[\"group\"] == \"control\") - a\n    c = sum(1 for r in at_risk if r[\"group\"] == \"preservative\" and r[\"time_days\"] == t and r[\"event\"] == 1)\n    d = sum(1 for r in at_risk if r[\"group\"] == \"preservative\") - c\n    T = a + b + c + d\n    num += (a * d) / T\n    den += (b * c) / T\n    print(f\"  t={t}: risk set = {T}  [control a={a},b={b} | preserv c={c},d={d}]  ad/T={a * d / T:.4f}, bc/T={b * c / T:.4f}\")\n\n# The pooled MH hazard ratio (control vs. preservative) is numerator / denominator.\nhr = num / den\nprint(f\"sum(ad/T) = {num:.4f}, sum(bc/T) = {den:.4f}\")\nprint(f\"HR (control vs preservative) = {num:.4f} / {den:.4f} = {hr:.4f}\")\nprint(f\"HR > 1 means mold appears FASTER without preservative\")\n\n# check: statsmodels pools the SAME per-time 2x2 strata (Mantel-Haenszel)\nimport numpy as np\nfrom statsmodels.stats.contingency_tables import StratifiedTable\ntables = []\nfor t in event_times:\n    at_risk = [r for r in rows if r[\"time_days\"] >= t]\n    a = sum(1 for r in at_risk if r[\"group\"] == \"control\" and r[\"time_days\"] == t and r[\"event\"] == 1)\n    b = sum(1 for r in at_risk if r[\"group\"] == \"control\") - a\n    c = sum(1 for r in at_risk if r[\"group\"] == \"preservative\" and r[\"time_days\"] == t and r[\"event\"] == 1)\n    d = sum(1 for r in at_risk if r[\"group\"] == \"preservative\") - c\n    tables.append(np.array([[a, b], [c, d]]))\nst = StratifiedTable(tables)\nprint(f\"check: statsmodels StratifiedTable.oddsratio_pooled = {st.oddsratio_pooled:.4f}\")",
    datasetNote: "Ten loaves timed until mold appeared (event=1) or discarded still-clean (event=0, censored), split into control vs. preservative.",
    output: "distinct event times: [3, 4, 5, 6, 8, 10]\n  t=3: risk set = 10  [control a=1,b=4 | preserv c=0,d=5]  ad/T=0.5000, bc/T=0.0000\n  t=4: risk set = 9  [control a=2,b=2 | preserv c=0,d=5]  ad/T=1.1111, bc/T=0.0000\n  t=5: risk set = 7  [control a=0,b=2 | preserv c=1,d=4]  ad/T=0.0000, bc/T=0.2857\n  t=6: risk set = 6  [control a=1,b=1 | preserv c=0,d=4]  ad/T=0.6667, bc/T=0.0000\n  t=8: risk set = 4  [control a=0,b=0 | preserv c=1,d=3]  ad/T=0.0000, bc/T=0.0000\n  t=10: risk set = 2  [control a=0,b=0 | preserv c=1,d=1]  ad/T=0.0000, bc/T=0.0000\nsum(ad/T) = 2.2778, sum(bc/T) = 0.2857\nHR (control vs preservative) = 2.2778 / 0.2857 = 7.9722\nHR > 1 means mold appears FASTER without preservative\ncheck: statsmodels StratifiedTable.oddsratio_pooled = 7.9722",
    caveat:
      "The hazard ratio assumes PROPORTIONAL hazards — that one group's relative risk stays roughly constant over time; if the groups' survival curves cross (one is safer early but riskier late), a single HR averages away a real effect and misleads. Also, censored subjects must drop out for reasons unrelated to their risk, or the estimate is biased.",
  },
]

// ─── Filtering helper ─────────────────────────────────────────────────────

export interface StatFilter {
  query?: string
  category?: StatCategory | null
}

/**
 * Filters `STATS_GUIDE` (or any subset) by a case-insensitive substring match
 * on title/definition/aliases, AND-ed with an optional category. A blank or
 * whitespace-only query behaves like "no query." Pure and side-effect free —
 * unit-testable and reusable by the panel component via `useMemo`. Thin
 * wrapper over `filterGuideEntries`, kept so this module's signature and
 * search fields stay pinned.
 */
export function filterConcepts(concepts: StatConcept[], filter: StatFilter): StatConcept[] {
  return filterGuideEntries(
    concepts,
    filter,
    (c) => [c.title, c.definition, ...(c.aliases ?? [])],
    (c) => c.category,
  )
}
