/**
 * Data Terminal "Data Quality" guide — a static, authored reference library
 * of 36 concepts covering everything AFTER data is collected: measurement
 * uncertainty & error propagation, significant figures & unit discipline,
 * data cleaning (missing values, deduplication, censored readings), and
 * methodology pitfalls (outlier-removal ethics, pseudoreplication,
 * correlation-vs-causation, HARKing, and related traps).
 *
 * Content philosophy mirrors the Stats Guide (`stats-guide.ts`): SHOW THE
 * PROCESS, not library invocations. Each entry teaches the same idea at
 * increasing levels of detail: (1) `definition`/`whenToUse` explain WHAT the
 * concept means and WHY it matters, in prose; (2) `formula` + `formulaBreakdown`
 * show the actual expression in clean Unicode math and decode every symbol;
 * (3) `code` computes the SAME thing step by step from `datasetCsv`'s values,
 * printing every intermediate value. The dataset a snippet uses is always
 * shown twice: once as its own labeled CSV text (`datasetCsv`) and once
 * loaded/parsed inside `code` via `csv.DictReader`, so a reader can see the
 * two visibly correspond.
 *
 * This module intentionally does NOT re-derive the Stats Guide's `iqr-outliers`
 * computation (Q1/Q3, IQR, 1.5×IQR fences) — several methodology-pitfalls
 * entries here cross-reference that entry in prose while deepening the
 * POLICY/ETHICS layer on top of it (legitimate exclusion vs p-hacking,
 * pre-declared criteria). This module also does not cover experimental
 * design or sample-size/power planning — that is the Methods Guide's
 * territory (`methods-guide.ts`); any mention here is a one-line
 * cross-reference only.
 *
 * Source of truth for this module: the author ran every snippet against its
 * own inline CSV and precomputed `output` (INCLUDING every intermediate
 * print, not just the final number) by hand — it is NOT generated at request
 * time, there is no LLM call and no Python execution in the app. Mirrors the
 * `STATS_GUIDE` pattern (`lib/data-terminal/stats-guide.ts`): a typed
 * constant module rendered client-side, nothing fetched, nothing persisted.
 *
 * If a concept's dataset or wording ever needs to change, re-run the snippet
 * and update `output` (and `datasetCsv`) to match exactly — the three must
 * never drift apart. `code` and `output` are the empirically verified layer
 * and must never be edited casually; `formula`/`formulaBreakdown`/prose are
 * free to be refined without touching them.
 */

import { filterGuideEntries } from '@/lib/guides/filter'

export type DataQualityCategory =
  | 'measurement-uncertainty'
  | 'data-cleaning'
  | 'units-sigfigs'
  | 'methodology-pitfalls'

export const DQ_CATEGORIES: { key: DataQualityCategory; label: string }[] = [
  { key: 'measurement-uncertainty', label: 'Measurement & uncertainty' },
  { key: 'data-cleaning', label: 'Data cleaning' },
  { key: 'units-sigfigs', label: 'Units & sig figs' },
  { key: 'methodology-pitfalls', label: 'Methodology pitfalls' },
]

/** One symbol/term from a `formula` decoded into a plain-language meaning. */
export interface FormulaTerm {
  term: string
  meaning: string
}

export interface DataQualityConcept {
  /** Stable, slug-safe, unique id — drives the data-testid (e.g. "absolute-relative-uncertainty"). */
  id: string
  /** Human title shown in the box header. */
  title: string
  category: DataQualityCategory
  /** Extra search terms, optional. */
  aliases?: string[]
  /** PART 1a — 2+ sentences: what the concept means, the intuition behind it, and when it applies. */
  definition: string
  /** PART 1b — when a science-fair student reaches for it. */
  whenToUse: string
  /** PART 2a — the actual expression in clean Unicode math, matching exactly what `code` computes. */
  formula: string
  /** PART 2b — every symbol/term in `formula` decoded in plain language. */
  formulaBreakdown: FormulaTerm[]
  /** PART 3 — the sample dataset as real CSV text (header row + values), rendered as its own "THE DATA" block and loaded by `code`. */
  datasetCsv: string
  /** PART 4 — self-contained runnable Python: loads `datasetCsv`'s values, computes the concept step by step (printing intermediates). EMPIRICALLY VERIFIED — do not edit without re-running and re-diffing against `output`. */
  code: string
  /** PART 5 — one prose line describing the inline sample dataset. */
  datasetNote: string
  /** PART 6 — the exact printed result for that dataset, INCLUDING every intermediate print, author-precomputed static text. EMPIRICALLY VERIFIED — must stay byte-for-byte what `code` prints. */
  output: string
  /** One gotcha / interpretation note. */
  caveat: string
}

export const DATA_QUALITY_GUIDE: DataQualityConcept[] = [
  {
    id: 'absolute-relative-uncertainty',
    title: 'Absolute vs relative uncertainty',
    category: 'measurement-uncertainty',
    aliases: ['percent uncertainty', 'relative error'],
    definition:
      'Absolute uncertainty is the plus-or-minus margin attached to a measurement in the SAME units as the measurement itself (e.g. ±0.1 cm) — it tells you the size of the wobble on this one number. Relative uncertainty instead expresses that same margin as a fraction (or percentage) of the measured value, which is what lets you compare how "good" two completely different measurements are even though they\'re in different units and different sizes. A ±0.1 cm uncertainty is excellent for a 24.6 cm length but would be terrible for a 0.2 cm one — the absolute number alone can\'t tell you that, only the relative (percentage) version can.',
    whenToUse:
      'Use relative uncertainty whenever you need to compare the QUALITY of two different measurements, or whenever a formula (like the multiplication/division propagation rule) asks for uncertainty as a fraction rather than an absolute margin.',
    formula: 'relative uncertainty = (absolute uncertainty) / (measured value)',
    formulaBreakdown: [
      { term: 'absolute uncertainty', meaning: 'the ± margin in the same units as the measurement (e.g. ±0.1 cm).' },
      { term: 'measured value', meaning: 'the reading itself that the uncertainty is attached to.' },
      { term: 'relative uncertainty', meaning: 'a unit-less fraction (multiply by 100 for a percentage) — lets you compare precision across different instruments and quantities.' },
    ],
    datasetCsv: `quantity,value,uncertainty
length_cm,24.6,0.1
mass_g,182.4,0.5`,
    code: `import csv
import io

csv_text = """quantity,value,uncertainty
length_cm,24.6,0.1
mass_g,182.4,0.5"""

rows = list(csv.DictReader(io.StringIO(csv_text)))

for r in rows:
    value = float(r["value"])
    abs_u = float(r["uncertainty"])
    rel_u = abs_u / value
    rel_pct = rel_u * 100
    print(f"{r['quantity']}: value = {value}, absolute uncertainty = {abs_u}")
    print(f"  relative uncertainty = {abs_u} / {value} = {rel_u:.4f} = {rel_pct:.2f}%")`,
    datasetNote:
      'Two independent measurements (a length and a mass) each with their own absolute uncertainty.',
    output:
      'length_cm: value = 24.6, absolute uncertainty = 0.1\n' +
      '  relative uncertainty = 0.1 / 24.6 = 0.0041 = 0.41%\n' +
      'mass_g: value = 182.4, absolute uncertainty = 0.5\n' +
      '  relative uncertainty = 0.5 / 182.4 = 0.0027 = 0.27%',
    caveat:
      'A small absolute uncertainty can still be a LARGE relative uncertainty on a small measurement — always check the relative number before deciding a measurement is "precise enough."',
  },
  {
    id: 'instrument-reading-uncertainty',
    title: 'Reading uncertainty off an instrument',
    category: 'measurement-uncertainty',
    aliases: ['half the smallest division', 'least count'],
    definition:
      'Every analog instrument (a ruler, a graduated cylinder, an analog thermometer) has a smallest marked division — the finest gradation printed on its scale. Because a human eye can reliably judge whether a reading falls closer to one mark or the next but can\'t split that gap infinitely finely, the standard convention is to report the reading\'s uncertainty as half of that smallest division, not the whole division and not zero. This isn\'t a guess: it reflects the real limit of how finely a human (or the instrument\'s construction) can resolve a position between two marks.',
    whenToUse:
      'Use this the moment you take ANY single reading off an analog scale, before you\'ve even done any calculation — it\'s the starting uncertainty that then propagates through every formula that uses that reading.',
    formula: 'reading uncertainty = (smallest division) / 2',
    formulaBreakdown: [
      { term: 'smallest division', meaning: 'the finest gradation marked on the instrument\'s scale (e.g. 1 mm marks on a ruler).' },
      { term: '/ 2', meaning: 'halving reflects that a careful reader can judge “about halfway between marks” reliably, but not finer than that.' },
    ],
    datasetCsv: `instrument,smallest_division_mm,reading_mm
ruler,1.0,146.0`,
    code: `import csv
import io

# A ruler marked in mm (smallest division = 1 mm). Reading uncertainty is
# taken as half the smallest division.
csv_text = """instrument,smallest_division_mm,reading_mm
ruler,1.0,146.0"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
r = rows[0]
smallest_div = float(r["smallest_division_mm"])
reading = float(r["reading_mm"])
half_div = smallest_div / 2

print(f"smallest division = {smallest_div} mm")
print(f"reading uncertainty = half the smallest division = {smallest_div} / 2 = {half_div} mm")
print(f"reported length = {reading} +/- {half_div} mm")`,
    datasetNote:
      'A ruler marked in 1 mm divisions used to measure a 146.0 mm length.',
    output:
      'smallest division = 1.0 mm\n' +
      'reading uncertainty = half the smallest division = 1.0 / 2 = 0.5 mm\n' +
      'reported length = 146.0 +/- 0.5 mm',
    caveat:
      'This rule is for READING uncertainty only — it doesn\'t include other error sources like the ruler being warped or held at an angle (parallax), which need their own separate uncertainty terms.',
  },
  {
    id: 'mean-sem-repeated-readings',
    title: 'Combining repeated readings (mean ± SEM)',
    category: 'measurement-uncertainty',
    aliases: ['standard error of the mean', 'repeated measurement'],
    definition:
      'When you measure the SAME thing several times, the individual readings scatter around a true value due to random measurement noise. Averaging them (the mean) cancels out much of that noise, and the standard error of the mean (SEM = SD/√n) is the uncertainty on THAT average — it answers "how far off might my reported mean be from the true value," which is a different question from "how spread out were my individual readings" (that\'s what the SD answers). Because SEM shrinks as n grows, taking more repeated readings is the most direct way to reduce your reported uncertainty.',
    whenToUse:
      'Use mean ± SEM as your reported result whenever you\'ve taken multiple independent readings of the exact same quantity and want the single best estimate plus its uncertainty.',
    formula: 'x̄ ± SEM,  where SEM = s / √n',
    formulaBreakdown: [
      { term: 'x̄', meaning: 'the mean of your repeated readings — the best single estimate of the true value.' },
      { term: 's', meaning: 'the sample standard deviation of the individual readings (how spread out THEY are, not how uncertain the mean is).' },
      { term: '√n', meaning: 'the square root of how many readings you took — dividing by it is why more repeats shrink the uncertainty.' },
    ],
    datasetCsv: `trial,mass_g
1,12.4
2,12.6
3,12.3
4,12.7
5,12.5`,
    code: `import csv
import io
import numpy as np

csv_text = """trial,mass_g
1,12.4
2,12.6
3,12.3
4,12.7
5,12.5"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
masses = [float(r["mass_g"]) for r in rows]

n = len(masses)
mean = sum(masses) / n
print(f"readings = {masses}")
print(f"n = {n}")
print(f"mean = {mean:.3f} g")

sq_devs = [(x - mean) ** 2 for x in masses]
variance = sum(sq_devs) / (n - 1)
sd = variance ** 0.5
print(f"sample SD = sqrt(sum((x-mean)^2)/(n-1)) = {sd:.4f} g")

sem = sd / (n ** 0.5)
print(f"SEM = SD / sqrt(n) = {sd:.4f} / sqrt({n}) = {sem:.4f} g")
print(f"reported result = {mean:.2f} +/- {sem:.2f} g")

print(f"check: np.std(masses, ddof=1)/sqrt(n) = {np.std(masses, ddof=1)/np.sqrt(n):.4f} g")`,
    datasetNote:
      'Five repeated mass readings of the same object on the same balance.',
    output:
      'readings = [12.4, 12.6, 12.3, 12.7, 12.5]\n' +
      'n = 5\n' +
      'mean = 12.500 g\n' +
      'sample SD = sqrt(sum((x-mean)^2)/(n-1)) = 0.1581 g\n' +
      'SEM = SD / sqrt(n) = 0.1581 / sqrt(5) = 0.0707 g\n' +
      'reported result = 12.50 +/- 0.07 g\n' +
      'check: np.std(masses, ddof=1)/sqrt(n) = 0.0707 g',
    caveat:
      'SEM measures how well you know the MEAN, not how consistent any single reading is — don\'t quote the SEM as if it described the spread of an individual future measurement; that\'s what the SD is for.',
  },
  {
    id: 'propagation-add-subtract',
    title: 'Uncertainty propagation — addition/subtraction',
    category: 'measurement-uncertainty',
    aliases: ['error propagation', 'sum of uncertainties'],
    definition:
      'When you add or subtract two measured quantities, the uncertainties don\'t cancel or subtract even if the values do — they ADD, because each measurement\'s error could independently push the result in the worse direction. Subtracting two lengths to get a difference removes none of the measurement wobble in either one; if anything, a small difference between two large, uncertain numbers can end up with an uncertainty that\'s a LARGE fraction of the result. This is the single most common propagation mistake: assuming subtraction "cancels" the error the way it cancels the value.',
    whenToUse:
      'Use this whenever your final quantity is a SUM or DIFFERENCE of two or more independently measured values (e.g. a height computed as a total stack height minus a base height).',
    formula: 'δ(A ± B) = δA + δB',
    formulaBreakdown: [
      { term: 'A, B', meaning: 'the two measured quantities being added or subtracted.' },
      { term: 'δA, δB', meaning: 'each quantity\'s own absolute uncertainty.' },
      { term: 'δ(A ± B)', meaning: 'the propagated absolute uncertainty on the sum OR the difference — the rule is identical either way.' },
    ],
    datasetCsv: `segment,length_cm,uncertainty_cm
stack_total,18.4,0.1
base,6.2,0.1`,
    code: `import csv
import io

# Two lengths measured with a ruler, each +/- 0.1 cm, combined by subtraction
# (final height = total stack height - base height).
csv_text = """segment,length_cm,uncertainty_cm
stack_total,18.4,0.1
base,6.2,0.1"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
total = float(rows[0]["length_cm"])
u_total = float(rows[0]["uncertainty_cm"])
base = float(rows[1]["length_cm"])
u_base = float(rows[1]["uncertainty_cm"])

diff = total - base
u_diff = u_total + u_base

print(f"total = {total} +/- {u_total} cm")
print(f"base = {base} +/- {u_base} cm")
print(f"difference = {total} - {base} = {diff:.1f} cm")
print(f"uncertainty adds (even for subtraction!): {u_total} + {u_base} = {u_diff:.1f} cm")
print(f"reported result = {diff:.1f} +/- {u_diff:.1f} cm")`,
    datasetNote:
      'A total stack height and a base height, each measured with the same ruler (±0.1 cm reading uncertainty).',
    output:
      'total = 18.4 +/- 0.1 cm\n' +
      'base = 6.2 +/- 0.1 cm\n' +
      'difference = 18.4 - 6.2 = 12.2 cm\n' +
      'uncertainty adds (even for subtraction!): 0.1 + 0.1 = 0.2 cm\n' +
      'reported result = 12.2 +/- 0.2 cm',
    caveat:
      'Subtracting two nearly-equal large numbers can make the RELATIVE uncertainty on the difference huge even when each input looked precise — always re-check the relative uncertainty on a subtracted result before trusting it.',
  },
  {
    id: 'propagation-multiply-divide',
    title: 'Uncertainty propagation — multiplication/division',
    category: 'measurement-uncertainty',
    aliases: ['error propagation', 'relative uncertainty propagation'],
    definition:
      'When you multiply or divide two measured quantities (like computing a density from mass and volume), you can\'t just add the absolute uncertainties the way you would for a sum — the units don\'t match (grams vs cubic centimeters). Instead you convert each measurement\'s uncertainty to a RELATIVE (fractional) uncertainty first, add those unit-less fractions together, and then convert back to an absolute uncertainty on the final computed result. This is exactly why "absolute vs relative uncertainty" is worth understanding on its own before this rule makes sense.',
    whenToUse:
      'Use this whenever your final quantity is a PRODUCT or RATIO of two or more independently measured values (density, speed, concentration, rate constants, etc.).',
    formula: 'δ(A·B)/(A·B) = δA/A + δB/B',
    formulaBreakdown: [
      { term: 'δA/A, δB/B', meaning: 'each input\'s relative uncertainty (its absolute uncertainty divided by its own value).' },
      { term: 'δ(A·B)/(A·B)', meaning: 'the propagated RELATIVE uncertainty of the product (or ratio) — the fractions add, not the raw numbers.' },
      { term: 'converting back', meaning: 'multiply the propagated relative uncertainty by the computed result itself to get an absolute uncertainty in the result\'s own units.' },
    ],
    datasetCsv: `quantity,value,uncertainty
mass_g,45.2,0.2
volume_cm3,12.0,0.3`,
    code: `import csv
import io

# Density = mass / volume, each measured with its own absolute uncertainty.
csv_text = """quantity,value,uncertainty
mass_g,45.2,0.2
volume_cm3,12.0,0.3"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
mass = float(rows[0]["value"])
u_mass = float(rows[0]["uncertainty"])
vol = float(rows[1]["value"])
u_vol = float(rows[1]["uncertainty"])

density = mass / vol
rel_mass = u_mass / mass
rel_vol = u_vol / vol
rel_density = rel_mass + rel_vol
u_density = rel_density * density

print(f"mass = {mass} +/- {u_mass} g -> relative uncertainty = {u_mass}/{mass} = {rel_mass:.4f}")
print(f"volume = {vol} +/- {u_vol} cm^3 -> relative uncertainty = {u_vol}/{vol} = {rel_vol:.4f}")
print(f"density = mass/volume = {mass}/{vol} = {density:.4f} g/cm^3")
print(f"relative uncertainty adds: {rel_mass:.4f} + {rel_vol:.4f} = {rel_density:.4f}")
print(f"absolute uncertainty = {rel_density:.4f} * {density:.4f} = {u_density:.4f} g/cm^3")
print(f"reported result = {density:.2f} +/- {u_density:.2f} g/cm^3")`,
    datasetNote:
      'A mass and a volume measurement, each with its own absolute uncertainty, combined into a density.',
    output:
      'mass = 45.2 +/- 0.2 g -> relative uncertainty = 0.2/45.2 = 0.0044\n' +
      'volume = 12.0 +/- 0.3 cm^3 -> relative uncertainty = 0.3/12.0 = 0.0250\n' +
      'density = mass/volume = 45.2/12.0 = 3.7667 g/cm^3\n' +
      'relative uncertainty adds: 0.0044 + 0.0250 = 0.0294\n' +
      'absolute uncertainty = 0.0294 * 3.7667 = 0.1108 g/cm^3\n' +
      'reported result = 3.77 +/- 0.11 g/cm^3',
    caveat:
      'Don\'t average the two RELATIVE uncertainties — they add. A common mistake is treating this rule like the addition rule and just adding the absolute uncertainties directly, which is only valid for sums/differences, not products/ratios.',
  },
  {
    id: 'propagation-power',
    title: 'Uncertainty propagation — through a power',
    category: 'measurement-uncertainty',
    aliases: ['error propagation', 'exponent uncertainty'],
    definition:
      'When a measured quantity is raised to a power (like radius squared in a circle\'s area formula), its relative uncertainty doesn\'t just carry through unchanged — it gets MULTIPLIED by the exponent, because a small error in the base gets applied twice (once for each factor) when you square it. This is a special case of the multiplication rule above: x² is really x times itself, so the relative uncertainty adds to itself once for each power, i.e. gets multiplied by the exponent.',
    whenToUse:
      'Use this whenever a formula raises one of your measured quantities to a power greater than 1 (area from radius, volume from a side length, kinetic energy from velocity, etc.) — a squared radius makes your uncertainty balloon faster than you\'d expect.',
    formula: 'δ(xⁿ)/xⁿ = n · (δx/x)',
    formulaBreakdown: [
      { term: 'x', meaning: 'the measured base quantity (e.g. a radius).' },
      { term: 'n', meaning: 'the exponent the base is raised to (2 for a squared term, 3 for a cubed term, etc.).' },
      { term: 'δ(xⁿ)/xⁿ', meaning: 'the relative uncertainty in the powered result — n times bigger than the relative uncertainty in x alone.' },
    ],
    datasetCsv: `quantity,value,uncertainty
radius_cm,5.0,0.2`,
    code: `import csv
import io

# Area of a circle = pi * r^2. Uncertainty in r propagates through the power
# by multiplying the relative uncertainty by the exponent.
csv_text = """quantity,value,uncertainty
radius_cm,5.0,0.2"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
r = float(rows[0]["value"])
u_r = float(rows[0]["uncertainty"])

import math
area = math.pi * r ** 2
rel_r = u_r / r
n = 2  # exponent
rel_area = n * rel_r
u_area = rel_area * area

print(f"radius = {r} +/- {u_r} cm -> relative uncertainty = {u_r}/{r} = {rel_r:.4f}")
print(f"area = pi * r^2 = {area:.4f} cm^2")
print(f"power rule: relative uncertainty in r^{n} = {n} * relative uncertainty in r = {n} * {rel_r:.4f} = {rel_area:.4f}")
print(f"absolute uncertainty = {rel_area:.4f} * {area:.4f} = {u_area:.4f} cm^2")
print(f"reported result = {area:.2f} +/- {u_area:.2f} cm^2")`,
    datasetNote:
      'A single radius measurement with its absolute uncertainty, used to compute a circle\'s area (which depends on r²).',
    output:
      'radius = 5.0 +/- 0.2 cm -> relative uncertainty = 0.2/5.0 = 0.0400\n' +
      'area = pi * r^2 = 78.5398 cm^2\n' +
      'power rule: relative uncertainty in r^2 = 2 * relative uncertainty in r = 2 * 0.0400 = 0.0800\n' +
      'absolute uncertainty = 0.0800 * 78.5398 = 6.2832 cm^2\n' +
      'reported result = 78.54 +/- 6.28 cm^2',
    caveat:
      'A modest 4% uncertainty in a radius becomes an 8% uncertainty in the AREA because of the squared exponent — always check whether your formula squares or cubes an input before assuming uncertainty carries through unchanged.',
  },
  {
    id: 'type-a-type-b-uncertainty',
    title: 'Type A vs Type B uncertainty',
    category: 'measurement-uncertainty',
    aliases: ['statistical uncertainty', 'systematic uncertainty source'],
    definition:
      'Type A uncertainty comes from STATISTICS — you took repeated readings and computed a spread (like the SEM) from the scatter you actually observed. Type B uncertainty comes from EVERYTHING ELSE you know about the measurement that repetition alone can\'t reveal — a manufacturer\'s stated instrument tolerance, a calibration certificate, or a known rounding limit — estimated by judgement or a spec sheet rather than by repeating the measurement. A single reported result usually needs BOTH combined, because repeating a reading on a slightly-miscalibrated meter ten times will make Type A look small while the meter is still systematically off — that\'s exactly what Type B catches.',
    whenToUse:
      'Use Type A when you have multiple repeated readings to compute a spread from; use Type B whenever an instrument\'s own documented tolerance/spec is a real source of error that repeating the reading would never reveal, then combine both (added in quadrature) into one final uncertainty.',
    formula: 'u_combined = √( u_A² + u_B² )',
    formulaBreakdown: [
      { term: 'u_A', meaning: 'Type A uncertainty — estimated statistically from the observed scatter in repeated readings (e.g. the SEM).' },
      { term: 'u_B', meaning: 'Type B uncertainty — estimated from other information, like a manufacturer\'s spec sheet, not from repetition.' },
      { term: 'added in quadrature', meaning: 'the two independent uncertainty sources combine as √(sum of squares), not a simple sum — the same logic as a right-triangle hypotenuse.' },
    ],
    datasetCsv: `trial,voltage_v
1,4.98
2,5.01
3,4.99
4,5.02
5,5.00`,
    code: `import csv
import io

# Type A: from repeated readings (statistical, SEM). Type B: from a fixed
# instrument spec (e.g. manufacturer-stated tolerance), not from repetition.
csv_text = """trial,voltage_v
1,4.98
2,5.01
3,4.99
4,5.02
5,5.00"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
voltages = [float(r["voltage_v"]) for r in rows]
n = len(voltages)
mean = sum(voltages) / n
variance = sum((v - mean) ** 2 for v in voltages) / (n - 1)
sd = variance ** 0.5
sem = sd / (n ** 0.5)

print(f"readings = {voltages}")
print(f"Type A (statistical, from repetition): mean = {mean:.3f} V, SEM = {sem:.4f} V")

meter_spec_pct = 0.005  # manufacturer states +/- 0.5% of reading
type_b = mean * meter_spec_pct
print(f"Type B (from the multimeter's spec sheet, +/-0.5% of reading, NOT from repeating trials):")
print(f"  {mean:.3f} * {meter_spec_pct} = {type_b:.4f} V")

combined = (sem ** 2 + type_b ** 2) ** 0.5
print(f"combined uncertainty (add in quadrature) = sqrt({sem:.4f}^2 + {type_b:.4f}^2) = {combined:.4f} V")
print(f"reported result = {mean:.3f} +/- {combined:.3f} V")`,
    datasetNote:
      'Five repeated voltage readings on a multimeter that also carries a manufacturer-stated ±0.5%-of-reading spec.',
    output:
      'readings = [4.98, 5.01, 4.99, 5.02, 5.0]\n' +
      'Type A (statistical, from repetition): mean = 5.000 V, SEM = 0.0071 V\n' +
      'Type B (from the multimeter\'s spec sheet, +/-0.5% of reading, NOT from repeating trials):\n' +
      '  5.000 * 0.005 = 0.0250 V\n' +
      'combined uncertainty (add in quadrature) = sqrt(0.0071^2 + 0.0250^2) = 0.0260 V\n' +
      'reported result = 5.000 +/- 0.026 V',
    caveat:
      'Repeating a reading many times shrinks the Type A term but does NOTHING to shrink Type B — you cannot statistics your way out of a miscalibrated or under-specified instrument.',
  },
  {
    id: 'sigfig-rounding-uncertainty',
    title: 'Rounding the uncertainty to 1–2 sig figs',
    category: 'measurement-uncertainty',
    aliases: ['uncertainty rounding convention', 'matching decimal places'],
    definition:
      'An uncertainty computed from a formula (like SD/√n) often comes out with many meaningless decimal digits — the convention is to round the UNCERTAINTY itself to just 1 or 2 significant figures first, since knowing your error margin to 5 decimal places is never meaningful. Then, and only then, you round the measured VALUE to match the same last decimal place as the (already-rounded) uncertainty — not the other way around. Doing it in this order avoids the common mistake of reporting a value to more decimal places than the uncertainty could possibly justify.',
    whenToUse:
      'Use this as the final formatting step for EVERY reported value ± uncertainty pair, right before writing up a result — it\'s what turns a raw computed number into a properly reported scientific result.',
    formula: 'round(uncertainty) first → then round(value) to the SAME decimal place',
    formulaBreakdown: [
      { term: 'round the uncertainty first', meaning: 'to 1–2 significant figures — e.g. a raw SEM of 0.012909... becomes 0.01.' },
      { term: 'match the value\'s decimal place', meaning: 'round the measured value to the SAME last decimal place the rounded uncertainty landed on, not to its own “natural” precision.' },
    ],
    datasetCsv: `trial,length_cm
1,9.83
2,9.79
3,9.85
4,9.81`,
    code: `import csv
import io

# Reporting convention: value +/- uncertainty (unit), uncertainty rounded to
# 1-2 sig figs, value's last decimal place matched to it.
csv_text = """trial,length_cm
1,9.83
2,9.79
3,9.85
4,9.81"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
lengths = [float(r["length_cm"]) for r in rows]
n = len(lengths)
mean = sum(lengths) / n
variance = sum((x - mean) ** 2 for x in lengths) / (n - 1)
sd = variance ** 0.5
sem_raw = sd / (n ** 0.5)

print(f"readings = {lengths}")
print(f"raw mean = {mean}")
print(f"raw SEM = {sem_raw}")

# Round uncertainty to 1 sig fig first
sem_rounded = round(sem_raw, 2)
print(f"round SEM to 1-2 sig figs -> {sem_rounded} cm")

mean_rounded = round(mean, 2)
print(f"match the value's last decimal place to the uncertainty's -> mean = {mean_rounded} cm")
print(f"reported result: length = {mean_rounded} +/- {sem_rounded} cm")`,
    datasetNote:
      'Four repeated length readings, whose raw mean and SEM both come out with many decimal digits before rounding.',
    output:
      'readings = [9.83, 9.79, 9.85, 9.81]\n' +
      'raw mean = 9.82\n' +
      'raw SEM = 0.012909944487358126\n' +
      'round SEM to 1-2 sig figs -> 0.01 cm\n' +
      'match the value\'s last decimal place to the uncertainty\'s -> mean = 9.82 cm\n' +
      'reported result: length = 9.82 +/- 0.01 cm',
    caveat:
      'Reporting "9.821 ± 0.012909944 cm" is wrong even though it\'s mathematically what the calculator spat out — an uncertainty is never known to 8 significant figures, so trailing digits past the 1–2 sig-fig cutoff are meaningless noise, not extra precision.',
  },
  {
    id: 'instrument-calibration',
    title: 'Calibration against a known reference',
    category: 'measurement-uncertainty',
    aliases: ['calibration offset', 'instrument bias', 'zeroing'],
    definition:
      'Calibration means checking an instrument\'s reading against a quantity whose TRUE value is already known (a reference standard, a certified weight, a boiling-point check) before trusting its readings on your actual samples. If the instrument consistently reads high or low on the known standard, that\'s a systematic offset (bias) — not random noise — and it will bias every future reading on that same instrument in the same direction until it\'s corrected or the instrument is re-zeroed. Calibration is a Type B uncertainty check: repeating a reading on an uncalibrated scale ten times will never reveal this problem, because every one of those ten readings is wrong in the exact same direction.',
    whenToUse:
      'Use this before trusting a scale, sensor, or meter for real measurements — especially before a science-fair experiment where the SAME instrument will be reused across every trial, so any bias would otherwise contaminate every single data point identically.',
    formula: 'offset = (mean reading of the known standard) − (true reference value)',
    formulaBreakdown: [
      { term: 'known standard', meaning: 'a reference object/solution whose true value is already established (e.g. a certified 100.0 g calibration mass).' },
      { term: 'mean reading', meaning: 'what the instrument reports when measuring that same known standard, averaged over a few checks.' },
      { term: 'offset', meaning: 'the systematic bias — subtract this offset from every later reading on that same instrument to correct for it.' },
    ],
    datasetCsv: `reference_standard_g,scale_reading_g
100.0,101.2
100.0,101.3
100.0,101.1`,
    code: `import csv
import io

# Calibration: checking an instrument against a KNOWN reference value before
# trusting its readings, and applying a correction offset if it's biased.
csv_text = """reference_standard_g,scale_reading_g
100.0,101.2
100.0,101.3
100.0,101.1"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
readings = [float(r["scale_reading_g"]) for r in rows]
reference = float(rows[0]["reference_standard_g"])

n = len(readings)
mean_reading = sum(readings) / n
print(f"known reference standard mass = {reference} g")
print(f"scale readings of that SAME standard = {readings}")
print(f"mean reading = {mean_reading:.3f} g")

offset = mean_reading - reference
print(f"calibration offset = mean reading - true reference = {mean_reading:.3f} - {reference} = {offset:+.3f} g")
print(f"the scale reads {abs(offset):.3f} g {'high' if offset > 0 else 'low'} on a known {reference} g mass")

# Apply the correction to a real sample measurement taken on the same scale.
sample_reading = 54.6
corrected = sample_reading - offset
print(f"a later sample reads {sample_reading} g on this SAME uncalibrated scale")
print(f"corrected value = {sample_reading} - ({offset:+.3f}) = {corrected:.3f} g")`,
    datasetNote:
      'A balance\'s readings of a known, certified 100.0 g calibration mass, repeated three times.',
    output:
      'known reference standard mass = 100.0 g\n' +
      'scale readings of that SAME standard = [101.2, 101.3, 101.1]\n' +
      'mean reading = 101.200 g\n' +
      'calibration offset = mean reading - true reference = 101.200 - 100.0 = +1.200 g\n' +
      'the scale reads 1.200 g high on a known 100.0 g mass\n' +
      'a later sample reads 54.6 g on this SAME uncalibrated scale\n' +
      'corrected value = 54.6 - (+1.200) = 53.400 g',
    caveat:
      'A calibration offset only corrects a CONSISTENT bias — if the offset itself drifts over time (e.g. a battery-powered sensor degrading) you need to recalibrate periodically, not just apply one correction forever.',
  },
  {
    id: 'missing-vs-zero-vs-not-measured',
    title: 'Missing (blank) vs zero vs “not measured”',
    category: 'data-cleaning',
    aliases: ['sentinel value', 'null vs zero', 'NA handling'],
    definition:
      'A blank cell (nothing was recorded), a genuine 0 (you measured and the value really was zero), and a sentinel code like -999 or "NM" someone typed to mean "didn\'t measure this one" are three completely different things that must NEVER be collapsed into each other. Treating a blank as a zero silently drags your mean toward zero for a value that was never actually observed; treating a sentinel code like -999 as a real number is even worse, because it isn\'t just missing — it actively poisons any arithmetic that includes it. The fix is to explicitly detect and exclude both blanks and sentinel codes BEFORE computing anything, while keeping every genuine, deliberately-recorded 0.',
    whenToUse:
      'Use this the moment you import any raw dataset, before computing a single mean or SD — scan every column for blanks and any sentinel codes and handle each category explicitly and separately.',
    formula: 'clean(x) = exclude if blank OR x == sentinel;  else keep x  (including a genuine 0)',
    formulaBreakdown: [
      { term: 'blank', meaning: 'a cell where nothing at all was entered — truly not measured, must be excluded, never treated as 0.' },
      { term: 'sentinel value', meaning: 'a placeholder number/code (like -999) someone used to MEAN “not measured” — must be recognized and excluded, not computed with as if it were real.' },
      { term: 'genuine 0', meaning: 'an actual, deliberately recorded measurement of zero — this must be KEPT, not confused with the other two categories.' },
    ],
    datasetCsv: `plant,leaves_grown
1,4
2,0
3,
4,-999
5,3`,
    code: `import csv
import io

# Blank cell (truly not recorded) vs an explicit 0 (a real measured zero) vs a
# code like -999/"NM" someone used for "not measured" -- these must NOT be
# treated the same way when computing a mean.
csv_text = """plant,leaves_grown
1,4
2,0
3,
4,-999
5,3"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
print("raw rows:")
for r in rows:
    print(f"  plant {r['plant']}: leaves_grown = {r['leaves_grown']!r}")

# Naive (wrong) approach: blindly convert everything to float, treating blank
# as error and -999 as a real value.
cleaned = []
dropped_blank = 0
flagged_sentinel = 0
for r in rows:
    raw = r["leaves_grown"]
    if raw == "":
        dropped_blank += 1
        continue  # truly missing -- not measured, must be excluded, not zeroed
    val = float(raw)
    if val == -999:
        flagged_sentinel += 1
        continue  # -999 is a "not measured" sentinel code, not a real measurement of -999 leaves
    cleaned.append(val)  # includes the genuine 0 -- that IS a measured value

print(f"blank cells excluded (truly missing): {dropped_blank}")
print(f"sentinel -999 cells excluded (recorded as 'not measured', not a real -999): {flagged_sentinel}")
print(f"cleaned values (genuine 0 kept!) = {cleaned}")
print(f"correct mean = {sum(cleaned)/len(cleaned):.3f} (n={len(cleaned)})")

wrong_include_sentinel = [float(r["leaves_grown"]) for r in rows if r["leaves_grown"] != ""]
print(f"WRONG mean if -999 sentinel were treated as real data = {sum(wrong_include_sentinel)/len(wrong_include_sentinel):.3f}")`,
    datasetNote:
      'Five plants\' new-leaf counts, including one blank cell, one sentinel -999 code, and one genuine 0.',
    output:
      'raw rows:\n' +
      '  plant 1: leaves_grown = \'4\'\n' +
      '  plant 2: leaves_grown = \'0\'\n' +
      '  plant 3: leaves_grown = \'\'\n' +
      '  plant 4: leaves_grown = \'-999\'\n' +
      '  plant 5: leaves_grown = \'3\'\n' +
      'blank cells excluded (truly missing): 1\n' +
      'sentinel -999 cells excluded (recorded as \'not measured\', not a real -999): 1\n' +
      'cleaned values (genuine 0 kept!) = [4.0, 0.0, 3.0]\n' +
      'correct mean = 2.333 (n=3)\n' +
      'WRONG mean if -999 sentinel were treated as real data = -248.000',
    caveat:
      'A -999 (or similar) sentinel is an EXTREME value if it accidentally slips into a computation — always exclude sentinels explicitly rather than relying on an outlier filter to catch them, since a sentinel isn\'t an outlier, it\'s a coding error waiting to happen.',
  },
  {
    id: 'listwise-deletion-bias',
    title: 'Listwise deletion and why it can bias results',
    category: 'data-cleaning',
    aliases: ['complete-case analysis', 'dropping incomplete rows'],
    definition:
      'Listwise deletion means dropping an ENTIRE row the moment any one of its columns is missing — simple, but only safe if which rows go missing has nothing to do with the outcome you\'re studying. If missingness is instead related to the result (e.g. sicker or slower-growing subjects are disproportionately the ones that never got measured, because they died, wilted, or were harder to read), deleting those rows doesn\'t just shrink your sample size — it selectively removes exactly the cases that would have pulled your result in an inconvenient direction, silently biasing the remaining average.',
    whenToUse:
      'Use complete-case (listwise) deletion only after checking WHY each row is missing — if the missingness pattern correlates with your outcome variable, deletion will bias your result and a more careful missing-data method (or at minimum, disclosure of the pattern) is needed instead.',
    formula: 'kept rows = { rows with NO missing values in any required column }',
    formulaBreakdown: [
      { term: 'listwise / complete-case', meaning: 'keep only rows where every required column has a value; drop the rest entirely, not just the missing cell.' },
      { term: 'missingness pattern', meaning: 'WHY certain rows are missing — random malfunction (usually safe to delete) vs correlated with the outcome (usually biases the result if deleted).' },
    ],
    datasetCsv: `seedling,light_hours,height_cm
1,12,8.4
2,12,8.1
3,12,
4,4,3.2
5,4,
6,4,
7,12,8.6
8,4,3.5`,
    code: `import csv
import io

# Listwise deletion: drop any row with a missing value in ANY column. Shows
# how this can bias the result if missingness correlates with the outcome
# (e.g. sicker seedlings are the ones nobody got around to measuring).
csv_text = """seedling,light_hours,height_cm
1,12,8.4
2,12,8.1
3,12,
4,4,3.2
5,4,
6,4,
7,12,8.6
8,4,3.5"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
print("raw rows:")
for r in rows:
    print(f"  seedling {r['seedling']}: light={r['light_hours']}h height={r['height_cm']!r}")

complete = [r for r in rows if r["height_cm"] != ""]
dropped = [r for r in rows if r["height_cm"] == ""]
print(f"listwise-deleted rows (missing height): {[r['seedling'] for r in dropped]}")

high_light_kept = [float(r["height_cm"]) for r in complete if r["light_hours"] == "12"]
low_light_kept = [float(r["height_cm"]) for r in complete if r["light_hours"] == "4"]
print(f"high-light group after deletion: n={len(high_light_kept)}, mean={sum(high_light_kept)/len(high_light_kept):.2f} cm")
print(f"low-light group after deletion: n={len(low_light_kept)}, mean={sum(low_light_kept)/len(low_light_kept):.2f} cm")

print("bias check: 2 of 3 dropped rows were low-light seedlings that likely")
print("struggled to grow tall enough to measure reliably -- so listwise")
print("deletion removes struggling low-light plants preferentially, making")
print("the surviving low-light mean look healthier than the true population.")`,
    datasetNote:
      'Eight seedlings split into a high-light and low-light group; several low-light seedlings have missing height readings.',
    output:
      'raw rows:\n' +
      '  seedling 1: light=12h height=\'8.4\'\n' +
      '  seedling 2: light=12h height=\'8.1\'\n' +
      '  seedling 3: light=12h height=\'\'\n' +
      '  seedling 4: light=4h height=\'3.2\'\n' +
      '  seedling 5: light=4h height=\'\'\n' +
      '  seedling 6: light=4h height=\'\'\n' +
      '  seedling 7: light=12h height=\'8.6\'\n' +
      '  seedling 8: light=4h height=\'3.5\'\n' +
      'listwise-deleted rows (missing height): [\'3\', \'5\', \'6\']\n' +
      'high-light group after deletion: n=3, mean=8.37 cm\n' +
      'low-light group after deletion: n=2, mean=3.35 cm\n' +
      'bias check: 2 of 3 dropped rows were low-light seedlings that likely\n' +
      'struggled to grow tall enough to measure reliably -- so listwise\n' +
      'deletion removes struggling low-light plants preferentially, making\n' +
      'the surviving low-light mean look healthier than the true population.',
    caveat:
      'Always report how many rows were dropped from EACH group separately — if one group lost disproportionately more rows than the other, that imbalance itself is worth flagging in the writeup, since it\'s a warning sign for exactly this bias.',
  },
  {
    id: 'mean-median-imputation',
    title: 'Mean/median imputation and its caveat',
    category: 'data-cleaning',
    aliases: ['filling missing values', 'imputation caveat'],
    definition:
      'Imputation means filling a missing cell with a plausible substitute value — commonly the mean or median of the OTHER, observed values in that same column — rather than dropping the whole row. This keeps your sample size intact and avoids the bias risk of listwise deletion, but it comes with its own cost: the imputed value has ZERO real variability of its own (it\'s a constant you invented), so the dataset\'s overall spread (SD) shrinks artificially, making your result look more precise/consistent than the real underlying measurements actually were.',
    whenToUse:
      'Use mean/median imputation when a small number of values are missing for reasons unrelated to the outcome (e.g. a sensor briefly glitched) and you need to preserve sample size — but always disclose which values were imputed and how, and expect the reported SD to be a slight underestimate of the true spread.',
    formula: 'xᵢ (imputed) = mean(observed values)   or   median(observed values)',
    formulaBreakdown: [
      { term: 'observed values', meaning: 'every value in the column that WASN\'T missing — the mean/median used for imputation comes only from these.' },
      { term: 'imputed value', meaning: 'the substitute placed into the missing slot — a best guess, not a real measurement, and it carries no measurement noise of its own.' },
    ],
    datasetCsv: `trial,mass_g
1,10.2
2,10.5
3,
4,10.1
5,10.4`,
    code: `import csv
import io

csv_text = """trial,mass_g
1,10.2
2,10.5
3,
4,10.1
5,10.4"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
values = [r["mass_g"] for r in rows]
print(f"raw values = {values}")

observed = [float(v) for v in values if v != ""]
n_missing = sum(1 for v in values if v == "")
mean_obs = sum(observed) / len(observed)
sorted_obs = sorted(observed)
median_obs = sorted_obs[len(sorted_obs) // 2]

print(f"observed values (excluding blank) = {observed}")
print(f"mean of observed = {mean_obs:.3f} g")
print(f"median of observed = {median_obs:.3f} g")

imputed_mean = [float(v) if v != "" else mean_obs for v in values]
imputed_median = [float(v) if v != "" else median_obs for v in values]
print(f"mean-imputed series = {[round(x,3) for x in imputed_mean]}")
print(f"median-imputed series = {[round(x,3) for x in imputed_median]}")

sd_before = (sum((x - mean_obs) ** 2 for x in observed) / (len(observed) - 1)) ** 0.5
mean_after = sum(imputed_mean) / len(imputed_mean)
sd_after = (sum((x - mean_after) ** 2 for x in imputed_mean) / (len(imputed_mean) - 1)) ** 0.5
print(f"SD before imputation (n={len(observed)}) = {sd_before:.4f} g")
print(f"SD after mean-imputation (n={len(imputed_mean)}) = {sd_after:.4f} g")
print("caveat check: imputing the mean for the missing slot shrank the SD --")
print("it manufactures fake certainty because the imputed value has zero")
print("real variability of its own.")`,
    datasetNote:
      'Five mass readings with one missing trial, imputed two different ways (mean-fill vs median-fill).',
    output:
      'raw values = [\'10.2\', \'10.5\', \'\', \'10.1\', \'10.4\']\n' +
      'observed values (excluding blank) = [10.2, 10.5, 10.1, 10.4]\n' +
      'mean of observed = 10.300 g\n' +
      'median of observed = 10.400 g\n' +
      'mean-imputed series = [10.2, 10.5, 10.3, 10.1, 10.4]\n' +
      'median-imputed series = [10.2, 10.5, 10.4, 10.1, 10.4]\n' +
      'SD before imputation (n=4) = 0.1826 g\n' +
      'SD after mean-imputation (n=5) = 0.1581 g\n' +
      'caveat check: imputing the mean for the missing slot shrank the SD --\n' +
      'it manufactures fake certainty because the imputed value has zero\n' +
      'real variability of its own.',
    caveat:
      'Imputation manufactures artificial certainty — the SD computed AFTER imputing will be smaller than the true SD, so any statistical test run on the imputed dataset is slightly overconfident; always disclose how many values were imputed alongside the result.',
  },
  {
    id: 'locf-time-series',
    title: 'Last-observation-carried-forward (LOCF) for time series',
    category: 'data-cleaning',
    aliases: ['forward fill', 'carry-forward imputation'],
    definition:
      'For data collected in a TIME SEQUENCE (daily temperature logs, growth measured every day), a gap in the middle is often filled by simply repeating the last value that WAS recorded, forward, until a new reading appears — this is last-observation-carried-forward (LOCF). It\'s a convenient default because it requires no interpolation math, but it silently assumes nothing changed during the gap, which is often false if the underlying quantity was actively trending (rising, falling, or oscillating) right through the missing days.',
    whenToUse:
      'Use LOCF only as a rough placeholder for short gaps in a slowly-changing time series, and always flag which points were carried forward rather than actually measured — for anything trending quickly, prefer interpolation or simply reporting the gap as missing.',
    formula: 'xₜ (missing) = x_last_observed   (repeated forward until the next real reading)',
    formulaBreakdown: [
      { term: 'x_last_observed', meaning: 'the most recent value that was ACTUALLY measured before the gap started.' },
      { term: 'carried forward', meaning: 'that same last value is copied into every missing time step until a new real reading breaks the chain.' },
    ],
    datasetCsv: `day,temperature_c
1,21.4
2,21.6
3,
4,
5,22.1`,
    code: `import csv
import io

# Last-observation-carried-forward for a time series with a gap (e.g. a
# sensor logger missed a reading day).
csv_text = """day,temperature_c
1,21.4
2,21.6
3,
4,
5,22.1"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
print("raw series:")
for r in rows:
    print(f"  day {r['day']}: {r['temperature_c']!r}")

filled = []
last_value = None
fill_log = []
for r in rows:
    raw = r["temperature_c"]
    if raw == "":
        if last_value is None:
            raise ValueError("no prior observation to carry forward")
        filled.append(last_value)
        fill_log.append(f"day {r['day']}: missing -> carry forward last value {last_value}")
    else:
        val = float(raw)
        filled.append(val)
        last_value = val

print("fills applied:")
for line in fill_log:
    print(f"  {line}")

print(f"LOCF-filled series = {filled}")
print("caveat check: LOCF assumes the value stayed flat during the gap -- days")
print("3-4 are both stamped at 21.6 even though day 5 shows the temperature")
print("was already climbing, so LOCF likely UNDERSTATES days 3-4.")`,
    datasetNote:
      'A 5-day temperature log with a 2-day gap in the middle, filled by carrying the last real reading forward.',
    output:
      'raw series:\n' +
      '  day 1: \'21.4\'\n' +
      '  day 2: \'21.6\'\n' +
      '  day 3: \'\'\n' +
      '  day 4: \'\'\n' +
      '  day 5: \'22.1\'\n' +
      'fills applied:\n' +
      '  day 3: missing -> carry forward last value 21.6\n' +
      '  day 4: missing -> carry forward last value 21.6\n' +
      'LOCF-filled series = [21.4, 21.6, 21.6, 21.6, 22.1]\n' +
      'caveat check: LOCF assumes the value stayed flat during the gap -- days\n' +
      '3-4 are both stamped at 21.6 even though day 5 shows the temperature\n' +
      'was already climbing, so LOCF likely UNDERSTATES days 3-4.',
    caveat:
      'LOCF assumes the value was flat during the entire gap — if the surrounding readings show a clear trend (as here, where day 5 shows it was already climbing), LOCF will systematically understate a rising trend and overstate a falling one during the gap.',
  },
  {
    id: 'deduplicating-rows',
    title: 'Deduplicating repeated rows',
    category: 'data-cleaning',
    aliases: ['duplicate rows', 'double-counted data'],
    definition:
      'A row can end up duplicated in a dataset for entirely mundane reasons — a spreadsheet paste that got pasted twice, a form that was re-submitted after a page refresh, or a copy-paste error while combining sheets from different lab members. Because every downstream calculation (mean, SD, a statistical test) treats each row as one independent measurement, an accidental duplicate silently gives that ONE real measurement double the weight it should have, quietly pulling the result toward it.',
    whenToUse:
      'Use this as a required checkpoint immediately after combining data from multiple sources (different lab members\' spreadsheets, multiple export files) — check for rows with an identical trial/sample identifier and remove the extras before any calculation.',
    formula: 'deduped = { first occurrence of each unique row-id }',
    formulaBreakdown: [
      { term: 'row-id', meaning: 'whatever uniquely identifies one real measurement (a trial number, sample id) — duplicates share the SAME id.' },
      { term: 'first occurrence kept', meaning: 'once an id has appeared once, any later row with that same id is a duplicate and gets dropped, not averaged in again.' },
    ],
    datasetCsv: `trial,germinated_seeds
1,14
2,18
2,18
3,16
4,15`,
    code: `import csv
import io

# Duplicated rows (e.g. a spreadsheet paste that got copy-pasted twice, or a
# form re-submitted after a page refresh) silently inflate n and skew any
# mean that happens to include the duplicated value repeatedly.
csv_text = """trial,germinated_seeds
1,14
2,18
2,18
3,16
4,15"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
print("raw rows:")
for r in rows:
    print(f"  trial {r['trial']}: {r['germinated_seeds']}")

seen = set()
deduped = []
removed = []
for r in rows:
    key = r["trial"]
    if key in seen:
        removed.append(r)
        continue
    seen.add(key)
    deduped.append(r)

print(f"duplicate trial ids removed: {[r['trial'] for r in removed]}")

raw_values = [float(r["germinated_seeds"]) for r in rows]
deduped_values = [float(r["germinated_seeds"]) for r in deduped]
print(f"mean WITH duplicate = {sum(raw_values)/len(raw_values):.3f} (n={len(raw_values)})")
print(f"mean AFTER dedup = {sum(deduped_values)/len(deduped_values):.3f} (n={len(deduped_values)})")`,
    datasetNote:
      'Four germination trials, where trial 2\'s row was accidentally pasted twice.',
    output:
      'raw rows:\n' +
      '  trial 1: 14\n' +
      '  trial 2: 18\n' +
      '  trial 2: 18\n' +
      '  trial 3: 16\n' +
      '  trial 4: 15\n' +
      'duplicate trial ids removed: [\'2\']\n' +
      'mean WITH duplicate = 16.200 (n=5)\n' +
      'mean AFTER dedup = 15.750 (n=4)',
    caveat:
      'Deduplication only catches EXACT duplicate rows by id — a re-entered value with a typo (e.g. 18.0 vs 18) or a duplicate under a DIFFERENT trial number won\'t be caught automatically and needs a manual scan.',
  },
  {
    id: 'range-sanity-validation',
    title: 'Range/sanity validation for physically impossible values',
    category: 'data-cleaning',
    aliases: ['plausibility check', 'physical bounds check'],
    definition:
      'Many measured quantities have a physically possible range that no real reading can ever fall outside — pH between 0 and 14, a percentage between 0 and 100, an animal\'s mass that can\'t be negative. Range validation means checking every value against those hard physical bounds BEFORE any statistics are computed, flagging anything outside them as an entry error, sensor glitch, or transcription mistake — not averaging it in as if it were a real (if unusual) measurement.',
    whenToUse:
      'Use this as an automatic first-pass check on any numeric column that has a known physical floor and/or ceiling — it catches decimal-point typos (170 instead of 17.0) and sensor faults before they ever reach your mean or SD.',
    formula: 'flag x if x < physical_min OR x > physical_max',
    formulaBreakdown: [
      { term: 'physical_min / physical_max', meaning: 'the hard, known bounds a real measurement of this quantity can NEVER cross (e.g. pH ∈ [0, 14]).' },
      { term: 'flag, don\'t silently average', meaning: 'a value outside the bounds is almost certainly an error, not a real extreme measurement — investigate it rather than quietly including or excluding it.' },
    ],
    datasetCsv: `sample,ph_reading
1,6.8
2,7.1
3,17.2
4,6.9
5,-0.4`,
    code: `import csv
import io

# Physically-impossible-value validation: a pH sensor cannot read below 0 or
# above 14; flag anything outside that range as a probable data-entry or
# sensor error rather than silently averaging it in.
csv_text = """sample,ph_reading
1,6.8
2,7.1
3,17.2
4,6.9
5,-0.4"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
LOWER, UPPER = 0.0, 14.0

valid = []
flagged = []
for r in rows:
    val = float(r["ph_reading"])
    if val < LOWER or val > UPPER:
        flagged.append((r["sample"], val))
    else:
        valid.append(val)

print(f"valid range for pH: [{LOWER}, {UPPER}]")
for sample, val in flagged:
    print(f"  sample {sample}: {val} is OUTSIDE the physically possible pH range -- flagged, not averaged in")

print(f"valid readings kept = {valid}")
print(f"mean of valid readings only = {sum(valid)/len(valid):.3f}")`,
    datasetNote:
      'Five pH readings, two of which (17.2 and -0.4) fall outside the physically possible 0–14 pH range.',
    output:
      'valid range for pH: [0.0, 14.0]\n' +
      '  sample 3: 17.2 is OUTSIDE the physically possible pH range -- flagged, not averaged in\n' +
      '  sample 5: -0.4 is OUTSIDE the physically possible pH range -- flagged, not averaged in\n' +
      'valid readings kept = [6.8, 7.1, 6.9]\n' +
      'mean of valid readings only = 6.933',
    caveat:
      'A value that PASSES the range check isn\'t automatically correct — range validation only catches impossible values, not plausible-but-wrong ones (e.g. a pH of 6.8 recorded for the wrong sample); it\'s a first filter, not a full audit.',
  },
  {
    id: 'coerce-flag-nonnumeric',
    title: 'Coercing/flagging non-numeric cells',
    category: 'data-cleaning',
    aliases: ['numeric coercion', 'silently dropped rows', 'parse errors'],
    definition:
      'A column that\'s supposed to be all numbers sometimes contains a stray note ("N/A"), a unit accidentally typed into the cell ("12.9mA"), or a typo — and the question is what happens to that cell when the data gets imported. The dangerous failure mode is an importer that SILENTLY skips or drops any cell it can\'t parse as a number without telling you: your sample size quietly shrinks and nothing in the output flags that it happened, so the n you report in your writeup may not match what was actually analyzed.',
    whenToUse:
      'Use this whenever you import spreadsheet or pasted data into any tool (including this game\'s own Data Terminal importer) — explicitly try to parse each cell as a number, and print/log every cell that fails, rather than trusting that a silent skip means “nothing to worry about.”',
    formula: 'numeric(x) = float(x) if parseable, else flag(x) and exclude',
    formulaBreakdown: [
      { term: 'parseable', meaning: 'the cell\'s text can be converted directly to a number with no leftover characters (a unit suffix like “mA” makes it NOT parseable).' },
      { term: 'flag(x)', meaning: 'log which cell failed and why, so the final analyzed n can be reconciled against the number of rows originally collected.' },
    ],
    datasetCsv: `trial,current_ma
1,12.4
2,N/A
3,13.1
4,12.9mA
5,12.7`,
    code: `import csv
import io

# Non-numeric cells (typed notes, "N/A", a stray unit suffix) in a numeric
# column -- must be explicitly coerced/flagged rather than silently dropped
# by whatever import path happens to choke on them (ties to how the Data
# Terminal's own CSV importer behaves: a row that fails to parse as a number
# is silently skipped, not counted as zero).
csv_text = """trial,current_ma
1,12.4
2,N/A
3,13.1
4,12.9mA
5,12.7"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
print("raw rows:")
for r in rows:
    print(f"  trial {r['trial']}: {r['current_ma']!r}")

numeric = []
flagged = []
for r in rows:
    raw = r["current_ma"]
    try:
        val = float(raw)
        numeric.append(val)
    except ValueError:
        flagged.append((r["trial"], raw))

print(f"cells that failed numeric coercion (flagged, not silently zeroed): {flagged}")
print(f"clean numeric values = {numeric}")
print(f"mean of clean values only = {sum(numeric)/len(numeric):.3f} mA (n={len(numeric)})")
print("caveat check: an importer that just skips non-numeric rows silently")
print("changes n without telling you -- always print/log how many rows were")
print("dropped so the sample size in your writeup matches what was analyzed.")`,
    datasetNote:
      'Five current readings, one recorded as “N/A” and one with a stray unit suffix typed into the number.',
    output:
      'raw rows:\n' +
      '  trial 1: \'12.4\'\n' +
      '  trial 2: \'N/A\'\n' +
      '  trial 3: \'13.1\'\n' +
      '  trial 4: \'12.9mA\'\n' +
      '  trial 5: \'12.7\'\n' +
      'cells that failed numeric coercion (flagged, not silently zeroed): [(\'2\', \'N/A\'), (\'4\', \'12.9mA\')]\n' +
      'clean numeric values = [12.4, 13.1, 12.7]\n' +
      'mean of clean values only = 12.733 mA (n=3)\n' +
      'caveat check: an importer that just skips non-numeric rows silently\n' +
      'changes n without telling you -- always print/log how many rows were\n' +
      'dropped so the sample size in your writeup matches what was analyzed.',
    caveat:
      'Any tool (including a spreadsheet\'s own “import CSV” step) that silently drops unparseable rows is doing this same coercion invisibly — always check the row count before vs. after import, don\'t assume it matches.',
  },
  {
    id: 'censored-below-detection-limit',
    title: 'Handling censored / below-detection-limit values',
    category: 'data-cleaning',
    aliases: ['non-detects', 'detection limit', 'left-censored data'],
    definition:
      'A censored (or "non-detect") reading is one where the instrument can only tell you the true value is BELOW some detection limit, not what it actually is — a water-quality sensor reporting "<0.5 ppb" for lead means the real concentration is somewhere between 0 and 0.5, not that it\'s exactly 0.5 or exactly 0. Substituting 0 for every censored value biases the mean downward (assumes the true value is at the very bottom of the possible range); substituting the detection limit itself biases it upward (assumes the worst case) — the common convention of substituting HALF the detection limit sits between those two biases as a reasonable compromise, though it\'s still a convention, not a real measurement.',
    whenToUse:
      'Use this whenever a sensor or assay reports a “<limit” style non-detect rather than a numeric zero — explicitly choose and disclose a substitution convention (typically limit/2) rather than treating the censoring symbol as if it were data.',
    formula: 'substituted value = detection_limit / 2   (a convention, not a measurement)',
    formulaBreakdown: [
      { term: 'detection limit', meaning: 'the smallest concentration/value the instrument can reliably distinguish from zero — anything below it reads as “<limit”, not a real number.' },
      { term: 'limit/2 convention', meaning: 'a widely used substitution that avoids the downward bias of using 0 and the upward bias of using the limit itself.' },
    ],
    datasetCsv: `sample,lead_ppb
1,2.4
2,<0.5
3,3.1
4,<0.5
5,2.9`,
    code: `import csv
import io

# Below-detection-limit (censored) values: a sensor reports "<0.5" rather
# than a real number. Substituting 0 biases the mean down; substituting the
# detection limit biases it up; the common convention is limit/2.
csv_text = """sample,lead_ppb
1,2.4
2,<0.5
3,3.1
4,<0.5
5,2.9"""

DETECTION_LIMIT = 0.5

rows = list(csv.DictReader(io.StringIO(csv_text)))
print("raw rows:")
for r in rows:
    print(f"  sample {r['sample']}: {r['lead_ppb']!r}")

as_zero = []
as_limit = []
as_half_limit = []
for r in rows:
    raw = r["lead_ppb"]
    if raw.startswith("<"):
        as_zero.append(0.0)
        as_limit.append(DETECTION_LIMIT)
        as_half_limit.append(DETECTION_LIMIT / 2)
    else:
        v = float(raw)
        as_zero.append(v)
        as_limit.append(v)
        as_half_limit.append(v)

print(f"substitute 0 for censored:            {as_zero} -> mean = {sum(as_zero)/len(as_zero):.3f} ppb")
print(f"substitute detection limit itself:    {as_limit} -> mean = {sum(as_limit)/len(as_limit):.3f} ppb")
print(f"substitute limit/2 (the convention):  {as_half_limit} -> mean = {sum(as_half_limit)/len(as_half_limit):.3f} ppb")
print("caveat check: limit/2 sits between the biased-low (0) and biased-high")
print("(full limit) estimates -- it's a convention, not a measurement, so")
print("always report how censored values were handled alongside the result.")`,
    datasetNote:
      'Five lead-concentration readings, two of which are below-detection-limit non-detects reported as “<0.5”.',
    output:
      'raw rows:\n' +
      '  sample 1: \'2.4\'\n' +
      '  sample 2: \'<0.5\'\n' +
      '  sample 3: \'3.1\'\n' +
      '  sample 4: \'<0.5\'\n' +
      '  sample 5: \'2.9\'\n' +
      'substitute 0 for censored:            [2.4, 0.0, 3.1, 0.0, 2.9] -> mean = 1.680 ppb\n' +
      'substitute detection limit itself:    [2.4, 0.5, 3.1, 0.5, 2.9] -> mean = 1.880 ppb\n' +
      'substitute limit/2 (the convention):  [2.4, 0.25, 3.1, 0.25, 2.9] -> mean = 1.780 ppb\n' +
      'caveat check: limit/2 sits between the biased-low (0) and biased-high\n' +
      '(full limit) estimates -- it\'s a convention, not a measurement, so\n' +
      'always report how censored values were handled alongside the result.',
    caveat:
      'Whatever substitution convention you pick changes the reported mean — always state which convention was used in your writeup, since a reader comparing your result to someone else\'s needs to know the two used the same rule.',
  },
  {
    id: 'document-cleaning-steps',
    title: 'Documenting every cleaning step',
    category: 'data-cleaning',
    aliases: ['reproducibility', 'cleaning log', 'audit trail'],
    definition:
      'Every decision made while cleaning a dataset — which rows were dropped, which values were flagged as sentinels, which duplicates were removed — needs to be written down as an explicit LOG, not just applied silently to produce a final “cleaned” file. Without that log, neither a reader nor your own future self can tell whether a reported sample size of n=4 means “4 trials were run” or “6 trials were run and 2 were quietly discarded” — and the two situations call for very different levels of trust in the result.',
    whenToUse:
      'Use this as standard practice on every cleaning pass, no matter how small — keep a running log (even a simple list of “row X removed because Y”) alongside the cleaned dataset, and include a summary of it in your writeup\'s methods section.',
    formula: 'log = [ (row_id, reason_removed_or_changed) for every altered/dropped row ]',
    formulaBreakdown: [
      { term: 'row_id', meaning: 'which specific row/trial was affected — needed so the change can be traced back to the raw file.' },
      { term: 'reason', meaning: 'WHY it was removed or changed — a sentinel code, a duplicate, a range violation — written down at cleaning time, not reconstructed from memory later.' },
    ],
    datasetCsv: `trial,mass_g
1,10.2
2,10.5
3,-999
4,10.1
4,10.1
5,10.4`,
    code: `import csv
import io

# Documenting every cleaning step: a reproducible cleaning LOG (what was
# removed/changed and why) so the final n and mean can be traced back to the
# raw file -- not just a silently "cleaned" dataset with no paper trail.
csv_text = """trial,mass_g
1,10.2
2,10.5
3,-999
4,10.1
4,10.1
5,10.4"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
log = []
cleaned = []
seen_trials = set()

for r in rows:
    trial = r["trial"]
    raw = r["mass_g"]
    if raw == "-999":
        log.append(f"trial {trial}: removed -- sentinel value -999 means 'not measured'")
        continue
    if trial in seen_trials:
        log.append(f"trial {trial}: removed -- duplicate of an already-kept trial id")
        continue
    seen_trials.add(trial)
    cleaned.append(float(raw))

print("raw row count:", len(rows))
print("cleaning log:")
for entry in log:
    print(f"  - {entry}")
print(f"cleaned dataset (n={len(cleaned)}): {cleaned}")
print(f"mean = {sum(cleaned)/len(cleaned):.3f} g")
print("caveat check: without this log, a reader (or your future self) cannot")
print("tell whether n=4 means '4 trials were run' or '6 were run and 2 were")
print("quietly thrown away' -- always ship the log with the result.")`,
    datasetNote:
      'Six raw mass rows containing one sentinel -999 value and one accidentally duplicated trial id.',
    output:
      'raw row count: 6\n' +
      'cleaning log:\n' +
      '  - trial 3: removed -- sentinel value -999 means \'not measured\'\n' +
      '  - trial 4: removed -- duplicate of an already-kept trial id\n' +
      'cleaned dataset (n=4): [10.2, 10.5, 10.1, 10.4]\n' +
      'mean = 10.300 g\n' +
      'caveat check: without this log, a reader (or your future self) cannot\n' +
      'tell whether n=4 means \'4 trials were run\' or \'6 were run and 2 were\n' +
      'quietly thrown away\' -- always ship the log with the result.',
    caveat:
      'A cleaning log isn\'t optional paperwork — without it, a reported result is unfalsifiable: nobody (including you, months later) can check whether the cleaning was done fairly or whether points were removed to reach a preferred answer.',
  },
  {
    id: 'sigfig-counting-rules',
    title: 'Significant-figures counting rules',
    category: 'units-sigfigs',
    aliases: ['sig figs', 'significant digits'],
    definition:
      'Significant figures are the digits in a measurement that carry real information about its precision — counting them correctly requires a few specific rules: leading zeros (before the first nonzero digit) never count, because they only position the decimal point; a trailing zero AFTER a decimal point DOES count, because it was deliberately written to show precision; and trailing zeros in a whole number with NO decimal point are ambiguous — by convention they\'re not counted unless scientific notation removes the ambiguity. Getting this wrong means either overstating how precisely you actually measured something, or throwing away real precision your instrument gave you.',
    whenToUse:
      'Use this the moment you read a number off any instrument or dataset and need to know how many of its digits you\'re actually entitled to trust and carry through a calculation.',
    formula: 'sig figs = digits from the first nonzero digit onward, following the leading/trailing-zero rules',
    formulaBreakdown: [
      { term: 'leading zeros', meaning: 'zeros before the first nonzero digit (like the two zeros in 0.0042) — never significant, they just place the decimal point.' },
      { term: 'trailing zeros after a decimal point', meaning: 'DO count (4.20 has 3 sig figs) — writing that zero is a deliberate claim of precision.' },
      { term: 'trailing zeros, no decimal point', meaning: 'ambiguous (1200 could be 2, 3, or 4 sig figs) — by the convention used here, not counted unless removed via scientific notation.' },
    ],
    datasetCsv: `reading,value
A,0.0042
B,4.20
C,1200
D,1.200e3`,
    code: `import csv
import io

csv_text = """reading,value
A,0.0042
B,4.20
C,1200
D,1.200e3"""

rows = list(csv.DictReader(io.StringIO(csv_text)))


def count_sig_figs(s: str) -> int:
    s = s.strip()
    if "e" in s.lower():
        mantissa = s.lower().split("e")[0]
        return count_sig_figs(mantissa)
    if "." in s:
        seen_nonzero = False
        sig = 0
        for ch in s:
            if ch == ".":
                continue
            if ch != "0":
                seen_nonzero = True
            if seen_nonzero:
                sig += 1
        return sig
    trimmed = s.rstrip("0")
    return len(trimmed) if trimmed else 1


for r in rows:
    n = count_sig_figs(r["value"])
    print(f"reading {r['reading']} = {r['value']!r} -> {n} significant figures")

print()
print("rules used above:")
print("  leading zeros (0.0042) never count -- only 4 and 2 are significant")
print("  a trailing zero AFTER a decimal point (4.20) DOES count")
print("  trailing zeros with NO decimal point (1200) are ambiguous -> not counted by default")
print("  writing the same value in scientific notation (1.200e3) removes the ambiguity -> 4 sig figs")`,
    datasetNote:
      'Four sample readings written in different formats, each testing a different sig-fig counting rule.',
    output:
      'reading A = \'0.0042\' -> 2 significant figures\n' +
      'reading B = \'4.20\' -> 3 significant figures\n' +
      'reading C = \'1200\' -> 2 significant figures\n' +
      'reading D = \'1.200e3\' -> 4 significant figures\n' +
      '\n' +
      'rules used above:\n' +
      '  leading zeros (0.0042) never count -- only 4 and 2 are significant\n' +
      '  a trailing zero AFTER a decimal point (4.20) DOES count\n' +
      '  trailing zeros with NO decimal point (1200) are ambiguous -> not counted by default\n' +
      '  writing the same value in scientific notation (1.200e3) removes the ambiguity -> 4 sig figs',
    caveat:
      'The “trailing zero with no decimal point” rule is a CONVENTION, not a law of physics — different textbooks disagree on it, which is exactly why switching to scientific notation is the recommended fix whenever it matters (see the trailing-zero-ambiguity entry).',
  },
  {
    id: 'sigfigs-in-arithmetic',
    title: 'Sig figs in addition/subtraction vs multiplication/division',
    category: 'units-sigfigs',
    aliases: ['decimal place rule', 'fewest sig figs rule'],
    definition:
      'Addition and subtraction follow a DECIMAL PLACES rule: the result can only be trusted to as many decimal places as its LEAST precise input has — because you can\'t know a digit past where your least-precise measurement stops providing information. Multiplication and division instead follow a SIGNIFICANT FIGURES rule: the result can only be trusted to as many significant figures as the input with the FEWEST sig figs — a completely different rule from the addition case, and mixing the two up is one of the most common science-fair arithmetic mistakes.',
    whenToUse:
      'Use the decimal-places rule immediately after any addition/subtraction step, and the fewest-sig-figs rule immediately after any multiplication/division step — in a multi-step calculation, apply the correct rule at EACH step, not just at the very end.',
    formula: 'add/sub: keep min(decimal places)   ·   mul/div: keep min(sig figs)',
    formulaBreakdown: [
      { term: 'decimal places (add/sub)', meaning: 'count digits after the decimal point in each input; the result keeps only as many as the input with the FEWEST.' },
      { term: 'sig figs (mul/div)', meaning: 'count total significant figures in each input; the result keeps only as many as the input with the FEWEST.' },
    ],
    datasetCsv: `op,a,b
add,12.11,0.3
multiply,4.51,2.2`,
    code: `import csv
import io

csv_text = """op,a,b
add,12.11,0.3
multiply,4.51,2.2"""

rows = list(csv.DictReader(io.StringIO(csv_text)))


def decimal_places(s: str) -> int:
    return len(s.split(".")[1]) if "." in s else 0


def sig_figs(s: str) -> int:
    s = s.lstrip("0").replace(".", "")
    return len(s) if s else 1


for r in rows:
    a_str, b_str = r["a"], r["b"]
    a, b = float(a_str), float(b_str)
    if r["op"] == "add":
        result = a + b
        dp_a, dp_b = decimal_places(a_str), decimal_places(b_str)
        keep_dp = min(dp_a, dp_b)
        rounded = round(result, keep_dp)
        print(f"ADD: {a_str} + {b_str} = {result} (raw)")
        print(f"  decimal places: {a_str} has {dp_a}, {b_str} has {dp_b}")
        print(f"  rule: keep only as many decimal places as the LEAST precise term ({keep_dp})")
        print(f"  rounded result = {rounded}")
    else:
        result = a * b
        sf_a, sf_b = sig_figs(a_str), sig_figs(b_str)
        keep_sf = min(sf_a, sf_b)
        # round to keep_sf significant figures
        from decimal import Decimal
        rounded = float(f"%.{keep_sf}g" % result)
        print(f"MULTIPLY: {a_str} x {b_str} = {result} (raw)")
        print(f"  sig figs: {a_str} has {sf_a}, {b_str} has {sf_b}")
        print(f"  rule: keep only as many sig figs as the term with the FEWEST sig figs ({keep_sf})")
        print(f"  rounded result = {rounded}")`,
    datasetNote:
      'Two small worked examples, one addition and one multiplication, each rounded by its own correct rule.',
    output:
      'ADD: 12.11 + 0.3 = 12.41 (raw)\n' +
      '  decimal places: 12.11 has 2, 0.3 has 1\n' +
      '  rule: keep only as many decimal places as the LEAST precise term (1)\n' +
      '  rounded result = 12.4\n' +
      'MULTIPLY: 4.51 x 2.2 = 9.922 (raw)\n' +
      '  sig figs: 4.51 has 3, 2.2 has 2\n' +
      '  rule: keep only as many sig figs as the term with the FEWEST sig figs (2)\n' +
      '  rounded result = 9.9',
    caveat:
      'These two rules are NOT interchangeable — applying the sig-figs rule to an addition (or vice versa) gives a wrong answer even though both rules “feel” similar; always check which arithmetic operation you\'re rounding after.',
  },
  {
    id: 'round-half-to-even',
    title: 'Rounding rules (round-half-to-even)',
    category: 'units-sigfigs',
    aliases: ['banker\'s rounding', 'round half even'],
    definition:
      'When the digit you\'re rounding away is EXACTLY 5 with nothing after it, naive “round half up” always rounds upward — but applied across a whole column of such cutoffs, that consistently nudges every result slightly higher, introducing a systematic bias. Round-half-to-even (“banker\'s rounding”) instead rounds to whichever neighboring digit is EVEN, so roughly half of all exact-.5 cases round up and half round down over a large dataset, cancelling the bias out — which is why it\'s the default behavior in Python\'s round(), IEEE 754 floating point, and most statistical software.',
    whenToUse:
      'Use this (or at least know it\'s happening) whenever you round a long column of numbers that might land on exact half-way cutoffs — especially before comparing your own hand-rounded numbers against what a spreadsheet or programming language computed, since a mismatch is often just this rule.',
    formula: 'round(x) → nearest even digit when x lands exactly halfway between two round numbers',
    formulaBreakdown: [
      { term: 'exact halfway case', meaning: 'the digit being dropped is precisely 5 with no further digits (2.5, 3.5, 0.125 at the relevant place) — the ONLY case this rule changes behavior for.' },
      { term: 'round to even', meaning: 'pick whichever of the two equally-close neighbors is an even digit, instead of always rounding up.' },
    ],
    datasetCsv: `value,round_to_places
2.5,0
3.5,0
2.25,1
2.35,1
0.125,2`,
    code: `import csv
import io

csv_text = """value,round_to_places
2.5,0
3.5,0
2.25,1
2.35,1
0.125,2"""

rows = list(csv.DictReader(io.StringIO(csv_text)))

for r in rows:
    v = float(r["value"])
    places = int(r["round_to_places"])
    naive_half_up = int(v * (10 ** places) + 0.5) / (10 ** places) if v >= 0 else v
    banker = round(v, places)  # Python's round() is round-half-to-even
    print(f"value={v}, round to {places} dp -> round-half-to-even (Python round()) = {banker}")

print()
print("round-half-to-even ('banker's rounding'): when the digit being dropped")
print("is EXACTLY 5 with nothing after it, round to whichever neighbor is")
print("EVEN, instead of always rounding up. This is why 2.5 -> 2 (2 is even)")
print("but 3.5 -> 4 (4 is even), not always 3 -> 3.")
print("Why it matters: naive round-half-up biases a long column of .5 cutoffs")
print("systematically upward; round-half-to-even cancels that bias out over")
print("many measurements, which is why it's the default in Python, IEEE 754,")
print("and most stats software.")`,
    datasetNote:
      'Five values that each land on (or very near, due to binary floating-point representation) an exact rounding cutoff.',
    output:
      'value=2.5, round to 0 dp -> round-half-to-even (Python round()) = 2.0\n' +
      'value=3.5, round to 0 dp -> round-half-to-even (Python round()) = 4.0\n' +
      'value=2.25, round to 1 dp -> round-half-to-even (Python round()) = 2.2\n' +
      'value=2.35, round to 1 dp -> round-half-to-even (Python round()) = 2.4\n' +
      'value=0.125, round to 2 dp -> round-half-to-even (Python round()) = 0.12\n' +
      '\n' +
      'round-half-to-even (\'banker\'s rounding\'): when the digit being dropped\n' +
      'is EXACTLY 5 with nothing after it, round to whichever neighbor is\n' +
      'EVEN, instead of always rounding up. This is why 2.5 -> 2 (2 is even)\n' +
      'but 3.5 -> 4 (4 is even), not always 3 -> 3.\n' +
      'Why it matters: naive round-half-up biases a long column of .5 cutoffs\n' +
      'systematically upward; round-half-to-even cancels that bias out over\n' +
      'many measurements, which is why it\'s the default in Python, IEEE 754,\n' +
      'and most stats software.',
    caveat:
      'Floating-point numbers aren\'t always stored EXACTLY as written (e.g. 2.35 may be stored as very slightly more or less than 2.35 in binary) — that can make a round-half-to-even result look like it broke the rule, when really the input wasn\'t exactly halfway to begin with.',
  },
  {
    id: 'dimensional-analysis-unit-conversion',
    title: 'Dimensional analysis / unit-factor conversion',
    category: 'units-sigfigs',
    aliases: ['unit conversion', 'conversion factors', 'factor-label method'],
    definition:
      'Dimensional analysis converts a quantity from one unit to another by multiplying by a chain of conversion factors, each written as a fraction equal to 1 (like “1 km / 100,000 cm”), arranged so the unwanted units visibly CANCEL out step by step, leaving only the target unit. Writing out each factor explicitly (rather than just remembering “multiply by this number”) makes it obvious when a conversion is set up backwards, because the units simply won\'t cancel to the right thing if the fraction is inverted.',
    whenToUse:
      'Use this any time a measured quantity needs to move between unit systems (cm/s to km/h, mL to L, grams to kilograms) — especially in a multi-step conversion where it\'s easy to lose track of whether you should multiply or divide by a factor.',
    formula: 'converted value = original value × (conversion factor 1) × (conversion factor 2) × …',
    formulaBreakdown: [
      { term: 'conversion factor', meaning: 'a fraction equal to exactly 1 (e.g. 1 km / 100000 cm) that lets you swap units without changing the actual quantity.' },
      { term: 'units cancel', meaning: 'writing the factor with the unwanted unit on the opposite side from where it appears in the value lets it cancel algebraically, leaving the target unit.' },
    ],
    datasetCsv: `quantity,value,unit
speed,850,cm/s`,
    code: `import csv
import io

# Dimensional analysis / unit-factor conversion: convert a measured speed
# from cm/s to km/h by chaining conversion factors so units visibly cancel.
csv_text = """quantity,value,unit
speed,850,cm/s"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
r = rows[0]
speed_cm_s = float(r["value"])

cm_to_km = 1 / 100_000  # 100,000 cm in 1 km
s_to_h = 3600  # 3600 s in 1 h

print(f"start: {speed_cm_s} cm/s")
print(f"conversion factors: 1 km = 100000 cm  ->  1 cm = {cm_to_km} km")
print(f"                     1 h = 3600 s")
step1 = speed_cm_s * cm_to_km
print(f"step 1 (cm -> km):  {speed_cm_s} cm/s * (1 km / 100000 cm) = {step1} km/s")
step2 = step1 * s_to_h
print(f"step 2 (s -> h):    {step1} km/s * (3600 s / 1 h) = {step2} km/h")
print(f"result: {speed_cm_s} cm/s = {step2:.1f} km/h")`,
    datasetNote:
      'A single speed measurement in cm/s, converted step by step into km/h via two chained conversion factors.',
    output:
      'start: 850.0 cm/s\n' +
      'conversion factors: 1 km = 100000 cm  ->  1 cm = 1e-05 km\n' +
      '                     1 h = 3600 s\n' +
      'step 1 (cm -> km):  850.0 cm/s * (1 km / 100000 cm) = 0.0085 km/s\n' +
      'step 2 (s -> h):    0.0085 km/s * (3600 s / 1 h) = 30.6 km/h\n' +
      'result: 850.0 cm/s = 30.6 km/h',
    caveat:
      'If you set up a conversion factor upside down, the units won\'t cancel to what you want — always check that the unit you\'re trying to REMOVE appears in the denominator of the next factor, not the numerator.',
  },
  {
    id: 'si-prefixes',
    title: 'SI prefixes',
    category: 'units-sigfigs',
    aliases: ['metric prefixes', 'milli micro kilo'],
    definition:
      'SI prefixes (milli-, micro-, kilo-, etc.) attach a fixed power-of-ten multiplier to a base unit so very small or very large quantities can be written with manageable numbers instead of a long string of zeros — 3200 microamps is the same physical current as 0.0032 amps, just expressed with a different, more convenient prefix. Converting between a prefixed unit and its base unit (or between two different prefixes of the same base unit) is a special case of dimensional analysis: multiply by the prefix\'s known power-of-ten factor.',
    whenToUse:
      'Use this whenever you need to combine or compare measurements that were recorded with different SI prefixes (e.g. one sensor logs in mV, another in V) — convert everything to the same base unit before doing any arithmetic between them.',
    formula: 'value in base unit = value × (prefix factor),  e.g. milli- = 10⁻³, micro- = 10⁻⁶, kilo- = 10³',
    formulaBreakdown: [
      { term: 'prefix factor', meaning: 'the fixed power of ten a given SI prefix represents (milli- = 0.001, micro- = 0.000001, kilo- = 1000, etc.).' },
      { term: 'base unit', meaning: 'the un-prefixed unit itself (grams, litres, amps) that every prefixed version is defined relative to.' },
    ],
    datasetCsv: `quantity,value,unit
mass,2500,mg
volume,0.045,L
current,3200,uA`,
    code: `import csv
import io

csv_text = """quantity,value,unit
mass,2500,mg
volume,0.045,L
current,3200,uA"""

PREFIX_TO_BASE = {
    "u": 1e-6,
    "m": 1e-3,
    "": 1.0,
    "k": 1e3,
}

rows = list(csv.DictReader(io.StringIO(csv_text)))
for r in rows:
    value = float(r["value"])
    unit = r["unit"]
    prefix = unit[0] if unit[0] in PREFIX_TO_BASE and len(unit) > 1 else ""
    base_unit = unit[len(prefix):]
    factor = PREFIX_TO_BASE[prefix]
    base_value = value * factor
    print(f"{value} {unit} : prefix '{prefix}' = x{factor:g} of the base unit '{base_unit}'")
    print(f"  -> {value} * {factor:g} = {base_value:g} {base_unit}")`,
    datasetNote:
      'Three measurements recorded with different SI prefixes (milligrams, litres with no prefix, and microamps).',
    output:
      '2500.0 mg : prefix \'m\' = x0.001 of the base unit \'g\'\n' +
      '  -> 2500.0 * 0.001 = 2.5 g\n' +
      '0.045 L : prefix \'\' = x1 of the base unit \'L\'\n' +
      '  -> 0.045 * 1 = 0.045 L\n' +
      '3200.0 uA : prefix \'u\' = x1e-06 of the base unit \'A\'\n' +
      '  -> 3200.0 * 1e-06 = 0.0032 A',
    caveat:
      'Mixing up milli- (10⁻³) and micro- (10⁻⁶) is a 1000x error that\'s easy to make when reading fast — always double check the prefix symbol (m vs μ/u) before converting, especially in handwritten lab notebooks where they can look similar.',
  },
  {
    id: 'common-unit-traps',
    title: 'Common science-fair unit traps',
    category: 'units-sigfigs',
    aliases: ['celsius vs kelvin', 'mass vs weight', 'ml vs cm3'],
    definition:
      'A handful of unit mistakes show up again and again in science-fair projects: computing a RATIO or percentage change using Celsius (which has an arbitrary zero point, so “twice as hot” in °C is meaningless) instead of converting to the absolute Kelvin scale first; and conflating mass (grams, an amount of matter, unchanging anywhere) with weight (a FORCE in Newtons, caused by gravity, which changes depending on where you are). Milliliters and cubic centimeters, by contrast, really ARE numerically identical for water-like liquids — that one\'s not a trap, but it\'s easy to become suspicious of it once you\'ve been burned by the other two.',
    whenToUse:
      'Use this as a checklist right before computing any ratio, percentage, or physics formula involving temperature or mass — catch these two traps before they quietly produce a nonsense number that still looks plausible.',
    formula: 'ratio(T) must use Kelvin;  weight (N) = mass (kg) × g,  NOT weight = mass',
    formulaBreakdown: [
      { term: 'Celsius has an arbitrary zero', meaning: '0°C is the freezing point of water, not “zero heat” — so doubling a Celsius value does NOT mean doubling the actual thermal energy; only Kelvin (an absolute scale) supports that kind of ratio.' },
      { term: 'mass vs weight', meaning: 'mass (g or kg) is an amount of matter and doesn\'t change; weight is the FORCE gravity exerts on that mass (in Newtons) and DOES change with location (e.g. the Moon).' },
    ],
    datasetCsv: `label,value,unit
gas_temp_start,20,degC
gas_temp_end,40,degC
liquid_volume,50,mL
sample_mass,50,g`,
    code: `import csv
import io

csv_text = """label,value,unit
gas_temp_start,20,degC
gas_temp_end,40,degC
liquid_volume,50,mL
sample_mass,50,g"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
by_label = {r["label"]: (float(r["value"]), r["unit"]) for r in rows}

t1, _ = by_label["gas_temp_start"]
t2, _ = by_label["gas_temp_end"]

# TRAP 1: a ratio of temperatures must use an ABSOLUTE scale (Kelvin), not
# Celsius -- Celsius has an arbitrary zero point.
wrong_ratio = t2 / t1
t1_k, t2_k = t1 + 273.15, t2 + 273.15
correct_ratio = t2_k / t1_k
print("TRAP 1 -- ratio of temperatures must use an ABSOLUTE scale (Kelvin):")
print(f"  wrong (using degC directly): {t2}/{t1} = {wrong_ratio:.3f}x")
print(f"  correct (convert to Kelvin first): {t2_k:.2f}/{t1_k:.2f} = {correct_ratio:.3f}x")
print("  these disagree because 0 degC is NOT 'zero thermal energy' -- 0 K is.")

print()
vol_ml, _ = by_label["liquid_volume"]
mass_g, _ = by_label["sample_mass"]
g_earth = 9.81
weight_n = (mass_g / 1000) * g_earth
print("TRAP 2 -- mL and cm^3 ARE the same unit; mass (g) and weight (a force) are NOT:")
print(f"  {vol_ml:.0f} mL of water = {vol_ml:.0f} cm^3 of water (identical, for water at 4C)")
print(f"  a {mass_g:.0f} g mass has weight = mass(kg) * g = {mass_g/1000} kg * {g_earth} m/s^2 = {weight_n:.3f} N")
print(f"  the mass ({mass_g:.0f} g) stays the same on the Moon; the weight ({weight_n:.3f} N) does not.")`,
    datasetNote:
      'A before/after temperature pair in Celsius, plus a volume and a mass, used to demonstrate both traps.',
    output:
      'TRAP 1 -- ratio of temperatures must use an ABSOLUTE scale (Kelvin):\n' +
      '  wrong (using degC directly): 40.0/20.0 = 2.000x\n' +
      '  correct (convert to Kelvin first): 313.15/293.15 = 1.068x\n' +
      '  these disagree because 0 degC is NOT \'zero thermal energy\' -- 0 K is.\n' +
      '\n' +
      'TRAP 2 -- mL and cm^3 ARE the same unit; mass (g) and weight (a force) are NOT:\n' +
      '  50 mL of water = 50 cm^3 of water (identical, for water at 4C)\n' +
      '  a 50 g mass has weight = mass(kg) * g = 0.05 kg * 9.81 m/s^2 = 0.491 N\n' +
      '  the mass (50 g) stays the same on the Moon; the weight (0.491 N) does not.',
    caveat:
      'Both traps produce an answer that LOOKS reasonable at a glance — “twice as hot” and “50 g weighs 50 N” both sound plausible until you check the actual physics, which is exactly what makes them dangerous rather than obviously wrong.',
  },
  {
    id: 'precision-vs-accuracy',
    title: 'Precision vs accuracy',
    category: 'units-sigfigs',
    aliases: ['reproducibility vs correctness', 'bias vs spread'],
    definition:
      'Precision describes how tightly repeated measurements of the SAME thing cluster together (a small SD means high precision), while accuracy describes how close the measurements\' average sits to the TRUE, correct value (a small bias means high accuracy) — and critically, these are independent of each other. An instrument can be highly precise (very reproducible, tiny SD) while still being systematically wrong (biased away from the true value) if it\'s miscalibrated; that combination — precise but inaccurate — is exactly the failure mode a calibration check (see Measurement & uncertainty) is designed to catch.',
    whenToUse:
      'Use these as two SEPARATE checks on any instrument or method: compute the SD across repeats for precision, and compare the mean against a known true/reference value for accuracy — never assume one implies the other.',
    formula: 'precision = SD of repeated readings;   accuracy = |mean − true value| (bias)',
    formulaBreakdown: [
      { term: 'SD (precision)', meaning: 'how spread out repeated readings of the SAME quantity are — small SD = tightly clustered = precise.' },
      { term: 'bias (accuracy)', meaning: 'how far the AVERAGE of those readings sits from the actual, known-correct value — small bias = accurate.' },
    ],
    datasetCsv: `instrument,trial,reading_g
scale_A,1,50.1
scale_A,2,50.2
scale_A,3,50.0
scale_A,4,50.1
scale_B,1,52.4
scale_B,2,48.1
scale_B,3,51.0
scale_B,4,49.3`,
    code: `import csv
import io

# Precision vs accuracy: precision = how tightly repeated readings cluster
# (SD); accuracy = how close the mean sits to the TRUE/known value. A
# miscalibrated instrument can be highly precise but inaccurate.
csv_text = """instrument,trial,reading_g
scale_A,1,50.1
scale_A,2,50.2
scale_A,3,50.0
scale_A,4,50.1
scale_B,1,52.4
scale_B,2,48.1
scale_B,3,51.0
scale_B,4,49.3"""

TRUE_MASS = 50.0

rows = list(csv.DictReader(io.StringIO(csv_text)))
for name in ["scale_A", "scale_B"]:
    readings = [float(r["reading_g"]) for r in rows if r["instrument"] == name]
    n = len(readings)
    mean = sum(readings) / n
    sd = (sum((x - mean) ** 2 for x in readings) / (n - 1)) ** 0.5
    bias = mean - TRUE_MASS
    print(f"{name}: readings = {readings}")
    print(f"  mean = {mean:.2f} g, SD (precision) = {sd:.3f} g, bias vs true {TRUE_MASS}g (accuracy) = {bias:+.2f} g")

print()
print("scale_A is PRECISE (small SD, tightly clustered) AND ACCURATE (mean close to true 50.0 g).")
print("scale_B is IMPRECISE (large SD, scattered) but happens to be roughly ACCURATE on average.")
print("a scale could also be precise-but-inaccurate: tightly clustered around the WRONG value -- that's what a calibration check catches.")`,
    datasetNote:
      'Four repeated readings each from two different scales weighing the same known 50.0 g reference mass.',
    output:
      'scale_A: readings = [50.1, 50.2, 50.0, 50.1]\n' +
      '  mean = 50.10 g, SD (precision) = 0.082 g, bias vs true 50.0g (accuracy) = +0.10 g\n' +
      'scale_B: readings = [52.4, 48.1, 51.0, 49.3]\n' +
      '  mean = 50.20 g, SD (precision) = 1.889 g, bias vs true 50.0g (accuracy) = +0.20 g\n' +
      '\n' +
      'scale_A is PRECISE (small SD, tightly clustered) AND ACCURATE (mean close to true 50.0 g).\n' +
      'scale_B is IMPRECISE (large SD, scattered) but happens to be roughly ACCURATE on average.\n' +
      'a scale could also be precise-but-inaccurate: tightly clustered around the WRONG value -- that\'s what a calibration check catches.',
    caveat:
      'A scale can be PRECISE but INACCURATE (tightly clustered around the wrong number) — a small SD alone is never enough evidence that an instrument is trustworthy; you also need a known reference value to check the mean against.',
  },
  {
    id: 'trailing-zero-scientific-notation',
    title: 'Trailing-zero ambiguity and scientific notation as the fix',
    category: 'units-sigfigs',
    aliases: ['scientific notation', 'sig fig ambiguity'],
    definition:
      'A whole number ending in zeros, like 1500, is genuinely ambiguous about how many of those digits are significant — it could mean a rough measurement good to only 2 sig figs (1.5 × 10³), or a precise one good to 4 (1.500 × 10³), and the plain digit string “1500” cannot tell a reader which was intended. Scientific notation resolves this completely by only ever writing the digits that are actually significant in the mantissa, so “1.5e3” and “1.500e3” are unambiguous about precision in a way “1500” never can be.',
    whenToUse:
      'Use scientific notation any time a whole-number measurement ends in one or more zeros AND you need the reader to know exactly how many of those digits are significant — which is most of the time in a formal science-fair writeup.',
    formula: 'N.NNN × 10ᵉ  (only significant digits appear in the mantissa)',
    formulaBreakdown: [
      { term: 'mantissa', meaning: 'the digit string before the × 10ᵉ — every digit written there IS significant, with no ambiguity.' },
      { term: 'exponent (e)', meaning: 'the power of ten that repositions the decimal point — it carries no precision information of its own.' },
    ],
    datasetCsv: `reading,value_m,intended_sig_figs
distance,1500,2
distance_precise,1500,4`,
    code: `import csv
import io

# Trailing-zero ambiguity: "1500 m" could mean 2, 3, or 4 sig figs depending
# on what the recorder intended -- scientific notation removes the ambiguity
# by only ever writing the digits that are actually significant.
csv_text = """reading,value_m,intended_sig_figs
distance,1500,2
distance_precise,1500,4"""

rows = list(csv.DictReader(io.StringIO(csv_text)))

for r in rows:
    value = float(r["value_m"])
    sig = int(r["intended_sig_figs"])
    # write in scientific notation with (sig - 1) digits after the decimal
    mantissa_digits = sig - 1
    exponent = 3  # 1500 = 1.5 x 10^3
    mantissa = value / (10 ** exponent)
    sci = f"{mantissa:.{mantissa_digits}f}e{exponent}"
    print(f"'{value:.0f} m' meant to have {sig} sig figs -> ambiguous as written")
    print(f"  scientific notation removes the ambiguity: {sci} m ({sig} sig figs, unambiguous)")

print()
print("the plain digit string '1500' cannot distinguish '1.5 x 10^3' (2 sig")
print("figs, a rough estimate) from '1.500 x 10^3' (4 sig figs, a precise")
print("measurement) -- always switch to scientific notation whenever trailing")
print("zeros in a whole number could be misread as precision you don't have.")`,
    datasetNote:
      'The same plain digit string, 1500, intended to represent two different precisions — shown resolved via scientific notation.',
    output:
      '\'1500 m\' meant to have 2 sig figs -> ambiguous as written\n' +
      '  scientific notation removes the ambiguity: 1.5e3 m (2 sig figs, unambiguous)\n' +
      '\'1500 m\' meant to have 4 sig figs -> ambiguous as written\n' +
      '  scientific notation removes the ambiguity: 1.500e3 m (4 sig figs, unambiguous)\n' +
      '\n' +
      'the plain digit string \'1500\' cannot distinguish \'1.5 x 10^3\' (2 sig\n' +
      'figs, a rough estimate) from \'1.500 x 10^3\' (4 sig figs, a precise\n' +
      'measurement) -- always switch to scientific notation whenever trailing\n' +
      'zeros in a whole number could be misread as precision you don\'t have.',
    caveat:
      'Once a number is already written in scientific notation, EVERY digit in the mantissa counts as significant, including trailing zeros — don\'t apply the “plain-number” trailing-zero-is-ambiguous rule to a value that\'s already in scientific form.',
  },
  {
    id: 'unit-consistency-before-derived-quantity',
    title: 'Unit consistency check before computing a derived quantity',
    category: 'units-sigfigs',
    aliases: ['mixed units bug', 'pre-calculation unit check'],
    definition:
      'Before combining two or more measured quantities into a derived one (like dividing a distance by a time to get a speed), every input needs to be in a mutually CONSISTENT unit system — dividing kilometers by seconds silently produces a number in km/s, technically “correct” arithmetic but almost certainly not the unit you meant to report or compare against anything else. The fix is a deliberate pre-calculation step: convert every input to the same base-unit system FIRST, then compute the derived quantity, then convert the result to whatever human-friendly unit you actually want to present.',
    whenToUse:
      'Use this as a mandatory checkpoint immediately before any formula that combines two or more measured quantities — write down each input\'s unit explicitly and convert to a common system before touching a calculator.',
    formula: 'check: are all inputs in the SAME base-unit system? if not — convert first, THEN compute.',
    formulaBreakdown: [
      { term: 'base-unit system', meaning: 'a single consistent set of units (e.g. all SI base units: meters, seconds, kilograms) that every input gets converted into before combining.' },
      { term: 'convert first, compute second', meaning: 'the unit conversion happens BEFORE the arithmetic, not as an afterthought applied to a wrong-unit answer.' },
    ],
    datasetCsv: `quantity,value,unit
distance,2.5,km
time,45,s`,
    code: `import csv
import io

# Unit-consistency check before computing a derived quantity: speed = distance/time
# -- mixing km (distance) with seconds (time) silently gives a nonsense number
# unless every input is converted to a common, consistent unit system first.
csv_text = """quantity,value,unit
distance,2.5,km
time,45,s"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
by_q = {r["quantity"]: (float(r["value"]), r["unit"]) for r in rows}

dist_val, dist_unit = by_q["distance"]
time_val, time_unit = by_q["time"]

wrong_speed = dist_val / time_val
print(f"WRONG (units not checked first): {dist_val} {dist_unit} / {time_val} {time_unit} = {wrong_speed:.4f} (km/s?? -- but is that really what we measured?)")

# Consistency check: convert distance to meters (SI base) before dividing by
# time already in seconds (SI base).
dist_m = dist_val * 1000
print(f"consistency check: convert distance to the SAME base-unit system as time first")
print(f"  {dist_val} km * 1000 = {dist_m:.0f} m   (time is already in s)")
correct_speed = dist_m / time_val
print(f"correct: {dist_m:.0f} m / {time_val} s = {correct_speed:.3f} m/s")
print(f"convert back for a human-friendly unit if needed: {correct_speed*3.6:.2f} km/h")`,
    datasetNote:
      'A distance measured in kilometers and a time measured in seconds, combined into a speed only after converting to consistent units.',
    output:
      'WRONG (units not checked first): 2.5 km / 45.0 s = 0.0556 (km/s?? -- but is that really what we measured?)\n' +
      'consistency check: convert distance to the SAME base-unit system as time first\n' +
      '  2.5 km * 1000 = 2500 m   (time is already in s)\n' +
      'correct: 2500 m / 45.0 s = 55.556 m/s\n' +
      'convert back for a human-friendly unit if needed: 200.00 km/h',
    caveat:
      'A calculator will happily compute distance/time even when the units are inconsistent — it has no way to warn you the result is in a nonsensical mixed unit; that check has to come from you, before the division, not after.',
  },
  {
    id: 'outlier-removal-policy-ethics',
    title: 'Outlier-removal policy — legitimate exclusion vs p-hacking',
    category: 'methodology-pitfalls',
    aliases: ['outlier ethics', 'p-hacking', 'data exclusion policy'],
    definition:
      'Deciding whether to exclude an outlier from your analysis is an ETHICS and POLICY question, not a computational one — the arithmetic for detecting a statistical outlier (the 1.5×IQR fence) is covered in the Stats Guide\'s IQR & outlier detection entry and is not repeated here. What matters is WHY a point is excluded: a legitimate exclusion has a reason tied to the MEASUREMENT PROCESS, documented at the time it happened (a probe slipping, a contaminated sample, a logged instrument fault) — independent of whether that point helps or hurts your hypothesis. P-hacking is the mirror image: noticing, after the fact, that removing an inconvenient point moves your result in the direction you wanted, and only THEN inventing a justification for excluding it.',
    whenToUse:
      'Use this any time a data point looks unusual and you\'re tempted to drop it — ask whether you can point to a documented, outcome-independent reason for the exclusion; if the only reason is “it made my result look better/worse,” it must stay in.',
    formula: 'legitimate: reason documented BEFORE outcome is known.   p-hacking: reason invented AFTER seeing the outcome.',
    formulaBreakdown: [
      { term: 'documented at the time', meaning: 'the reason for a possible exclusion (a lab-notebook note about a probe slipping) exists independent of, and before, seeing whether it changes the result.' },
      { term: 'outcome-independent', meaning: 'the justification for exclusion has nothing to do with which DIRECTION it pushes the mean/p-value — that\'s the line between a legitimate call and p-hacking.' },
    ],
    datasetCsv: `trial,yield_g,note
1,12.1,
2,12.4,
3,11.9,
4,12.3,
5,31.5,probe slipped off calibration stand mid-reading (logged at time of trial)`,
    code: `import csv
import io

# Outlier-removal POLICY, not the fence math (see Stats Guide's iqr-outliers
# for computing Q1/Q3/1.5xIQR fences). Here we show how deleting ONE point
# swings the result, and contrast a DOCUMENTED, defensible removal (a logged
# instrument fault) against an UNDOCUMENTED one chosen only because it moves
# the mean the direction the student wanted (p-hacking).
csv_text = """trial,yield_g,note
1,12.1,
2,12.4,
3,11.9,
4,12.3,
5,31.5,probe slipped off calibration stand mid-reading (logged at time of trial)"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
all_vals = [float(r["yield_g"]) for r in rows]
print(f"all readings = {all_vals}")
mean_all = sum(all_vals) / len(all_vals)
print(f"mean WITH trial 5 included = {mean_all:.2f} g (n={len(all_vals)})")

documented_fault = [r for r in rows if r["note"] == ""]
kept_vals = [float(r["yield_g"]) for r in documented_fault]
mean_kept = sum(kept_vals) / len(kept_vals)
print(f"trial 5 has a note LOGGED AT THE TIME of the run: {rows[4]['note']!r}")
print(f"mean WITHOUT trial 5 (documented instrument fault) = {mean_kept:.2f} g (n={len(kept_vals)})")

print()
print("legitimate removal: trial 5 was flagged in the lab notebook BEFORE")
print("anyone looked at whether it helped or hurt the result -- the reason")
print("(probe slipped) is about the MEASUREMENT process, not the outcome.")
print("p-hacking would be: noticing after the fact that dropping trial 5")
print("moves the mean from 16.04 to 12.18 and ONLY THEN inventing a reason")
print("to exclude it -- same arithmetic, opposite ethics, because the")
print("justification came AFTER seeing which point was inconvenient.")`,
    datasetNote:
      'Five yield trials, one of which is both a statistical outlier AND has a contemporaneously logged instrument-fault note.',
    output:
      'all readings = [12.1, 12.4, 11.9, 12.3, 31.5]\n' +
      'mean WITH trial 5 included = 16.04 g (n=5)\n' +
      'trial 5 has a note LOGGED AT THE TIME of the run: \'probe slipped off calibration stand mid-reading (logged at time of trial)\'\n' +
      'mean WITHOUT trial 5 (documented instrument fault) = 12.18 g (n=4)\n' +
      '\n' +
      'legitimate removal: trial 5 was flagged in the lab notebook BEFORE\n' +
      'anyone looked at whether it helped or hurt the result -- the reason\n' +
      '(probe slipped) is about the MEASUREMENT process, not the outcome.\n' +
      'p-hacking would be: noticing after the fact that dropping trial 5\n' +
      'moves the mean from 16.04 to 12.18 and ONLY THEN inventing a reason\n' +
      'to exclude it -- same arithmetic, opposite ethics, because the\n' +
      'justification came AFTER seeing which point was inconvenient.',
    caveat:
      'This entry does NOT re-derive the 1.5×IQR fence math — see the Stats Guide\'s “IQR & outlier detection” entry for how to statistically FLAG a candidate outlier; this entry is about what you\'re allowed to do about it once flagged.',
  },
  {
    id: 'pre-declaring-exclusion-criteria',
    title: 'Pre-declaring exclusion criteria',
    category: 'methodology-pitfalls',
    aliases: ['pre-registration', 'exclusion rule', 'before seeing the data'],
    definition:
      'The strongest defense against outlier-removal turning into p-hacking is to write down the EXACT rule for what counts as excludable before you\'ve even looked at how the data came out — e.g. “any trial where the thermometer fault light was logged gets excluded,” decided and written down before running trial 1. Applying that rule afterward is then purely mechanical: the same rule, applied to the same data, gives the same exclusions no matter who checks it or what answer they were hoping for — which is exactly what makes a post-hoc decision (“this one also looks too high, let\'s drop it too”) indistinguishable from cherry-picking.',
    whenToUse:
      'Use this at the start of an experiment, before data collection begins — write your exclusion criteria into your lab notebook or protocol FIRST, then apply them mechanically regardless of how the numbers turn out.',
    formula: 'predeclared rule (fixed in advance) applied mechanically to every trial, regardless of outcome',
    formulaBreakdown: [
      { term: 'predeclared', meaning: 'written down and fixed BEFORE the data exists — can\'t be adjusted after seeing which points are inconvenient.' },
      { term: 'applied mechanically', meaning: 'the same rule is checked against every trial the same way — no judgment calls made once results are visible.' },
    ],
    datasetCsv: `trial,germination_time_hr,thermometer_fault_logged
1,18.2,no
2,19.1,no
3,45.0,yes
4,18.9,no
5,17.8,no
6,52.0,no`,
    code: `import csv
import io

# Pre-declaring exclusion criteria: write the rule for what counts as
# excludable BEFORE collecting/looking at the data, then apply it mechanically.
# Contrast with choosing criteria AFTER seeing the data (which can be steered
# to whatever answer you want -- same numbers, different p(bias)).
csv_text = """trial,germination_time_hr,thermometer_fault_logged
1,18.2,no
2,19.1,no
3,45.0,yes
4,18.9,no
5,17.8,no
6,52.0,no"""

# Pre-declared rule (written down BEFORE this trial ran): "exclude a reading
# only if the thermometer fault was logged during that trial."
PREDECLARED_RULE = "thermometer_fault_logged == 'yes'"

rows = list(csv.DictReader(io.StringIO(csv_text)))
print(f"pre-declared rule (written down before data collection): {PREDECLARED_RULE}")

kept_predeclared = [r for r in rows if r["thermometer_fault_logged"] == "no"]
excluded_predeclared = [r for r in rows if r["thermometer_fault_logged"] == "yes"]
print(f"excluded by the pre-declared rule: trial {[r['trial'] for r in excluded_predeclared]}")

vals_predeclared = [float(r["germination_time_hr"]) for r in kept_predeclared]
mean_predeclared = sum(vals_predeclared) / len(vals_predeclared)
print(f"mean under the pre-declared rule = {mean_predeclared:.2f} hr (n={len(vals_predeclared)})")

print()
# Post-hoc alternative: someone instead decides, AFTER seeing all 6 numbers,
# to also drop trial 6 (52.0) because "it looks too high" -- no rule for it
# existed beforehand, it's simply the next most inconvenient number.
posthoc_kept = [r for r in rows if r["trial"] not in ("3", "6")]
vals_posthoc = [float(r["germination_time_hr"]) for r in posthoc_kept]
mean_posthoc = sum(vals_posthoc) / len(vals_posthoc)
print("post-hoc alternative: also drop trial 6 (52.0) because it 'looks too")
print("high', even though no fault was logged and no rule for it existed")
print("before the data came in:")
print(f"mean if trial 6 is ALSO dropped post-hoc = {mean_posthoc:.2f} hr (n={len(vals_posthoc)})")
print("the pre-declared rule is defensible because it can't be bent by the")
print("result; the post-hoc drop can't be distinguished from cherry-picking.")`,
    datasetNote:
      'Six germination-time trials, one flagged with a pre-declared thermometer-fault criterion; a sixth, unflagged high value is also present.',
    output:
      'pre-declared rule (written down before data collection): thermometer_fault_logged == \'yes\'\n' +
      'excluded by the pre-declared rule: trial [\'3\']\n' +
      'mean under the pre-declared rule = 25.20 hr (n=5)\n' +
      '\n' +
      'post-hoc alternative: also drop trial 6 (52.0) because it \'looks too\n' +
      'high\', even though no fault was logged and no rule for it existed\n' +
      'before the data came in:\n' +
      'mean if trial 6 is ALSO dropped post-hoc = 18.50 hr (n=4)\n' +
      'the pre-declared rule is defensible because it can\'t be bent by the\n' +
      'result; the post-hoc drop can\'t be distinguished from cherry-picking.',
    caveat:
      'A rule that\'s “pre-declared” but vague (“exclude anything that looks off”) provides none of the protection a specific, checkable rule does — the rule has to be concrete enough that someone else could apply it and get the same exclusions you did.',
  },
  {
    id: 'pseudoreplication',
    title: 'Pseudoreplication (repeated measures treated as independent n)',
    category: 'methodology-pitfalls',
    aliases: ['fake sample size', 'non-independent replicates', 'inflated n'],
    definition:
      'Pseudoreplication happens when the SAME experimental unit (one plant, one petri dish, one animal) is measured multiple times, and each of those repeated measurements is then treated as if it were an independent, separate sample — inflating n far beyond the number of genuinely independent biological/experimental units actually tested. Because a formula like the SEM shrinks as n grows, this fake inflation makes your uncertainty look artificially small and any effect look artificially more “significant” than the real, much smaller number of truly independent replicates could support.',
    whenToUse:
      'Use this check any time you\'re about to plug a sample size into a formula — ask whether every one of those n data points came from a DIFFERENT, independent experimental unit, or whether some of them are repeated measurements of the exact same underlying subject.',
    formula: 'true n = number of INDEPENDENT experimental units, NOT the number of measurements taken',
    formulaBreakdown: [
      { term: 'experimental unit', meaning: 'the thing that was independently assigned to a condition and could have responded differently (one plant, one dish, one animal) — this is what n should count.' },
      { term: 'repeated measurement', meaning: 'measuring the SAME experimental unit again — these give more precision about THAT one unit, but do not add a new independent data point to n.' },
    ],
    datasetCsv: `plant,measurement_num,leaf_area_cm2
1,1,10.2
1,2,10.3
1,3,10.1
2,1,14.5
2,2,14.6
2,3,14.7`,
    code: `import csv
import io

# Pseudoreplication: measuring the SAME subject/plant/dish repeatedly and
# treating those repeated measurements as if they were independent samples
# inflates n and manufactures artificial "significance."
csv_text = """plant,measurement_num,leaf_area_cm2
1,1,10.2
1,2,10.3
1,3,10.1
2,1,14.5
2,2,14.6
2,3,14.7"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
areas = [float(r["leaf_area_cm2"]) for r in rows]

# WRONG: pretend each of the 6 repeated measurements is an independent plant.
n_wrong = len(areas)
mean_wrong = sum(areas) / n_wrong
sd_wrong = (sum((x - mean_wrong) ** 2 for x in areas) / (n_wrong - 1)) ** 0.5
sem_wrong = sd_wrong / (n_wrong ** 0.5)
print(f"WRONG (pseudoreplicated): treating all {n_wrong} readings as independent n:")
print(f"  mean = {mean_wrong:.3f} cm^2, SD = {sd_wrong:.3f}, SEM = SD/sqrt(n) = {sem_wrong:.4f} (n={n_wrong})")

# CORRECT: average each plant's repeated measurements FIRST, so the true
# biological unit (n=2 plants) is what enters the SEM calculation.
plant_means = {}
for r in rows:
    plant_means.setdefault(r["plant"], []).append(float(r["leaf_area_cm2"]))
per_plant_avg = [sum(v) / len(v) for v in plant_means.values()]
n_correct = len(per_plant_avg)
mean_correct = sum(per_plant_avg) / n_correct
print(f"per-plant averages (collapse repeats to ONE value per plant) = {[round(x,2) for x in per_plant_avg]}")
sd_correct = (sum((x - mean_correct) ** 2 for x in per_plant_avg) / (n_correct - 1)) ** 0.5 if n_correct > 1 else float("nan")
print(f"CORRECT: true biological n = {n_correct} plants, mean = {mean_correct:.3f} cm^2")
print(f"  the SEM formula needs n>=2 independent units -- with only 2 plants here,")
print(f"  the real n for inference is 2, not 6, no matter how many times each was re-measured.")`,
    datasetNote:
      'Two plants, each measured three separate times — six total readings but only two independent biological units.',
    output:
      'WRONG (pseudoreplicated): treating all 6 readings as independent n:\n' +
      '  mean = 12.400 cm^2, SD = 2.412, SEM = SD/sqrt(n) = 0.9845 (n=6)\n' +
      'per-plant averages (collapse repeats to ONE value per plant) = [10.2, 14.6]\n' +
      'CORRECT: true biological n = 2 plants, mean = 12.400 cm^2\n' +
      '  the SEM formula needs n>=2 independent units -- with only 2 plants here,\n' +
      '  the real n for inference is 2, not 6, no matter how many times each was re-measured.',
    caveat:
      'The fix isn\'t to discard the repeated measurements — average each unit\'s repeats into ONE value first (as shown here), THEN treat that per-unit average as your one data point per experimental unit, keeping the true n honest.',
  },
  {
    id: 'correlation-vs-causation',
    title: 'Correlation vs causation (and the lurking/confounding variable)',
    category: 'methodology-pitfalls',
    aliases: ['confounding variable', 'spurious correlation', 'third variable'],
    definition:
      'A strong correlation between two variables tells you they tend to move together — it never tells you that one CAUSES the other, because a third, unmeasured variable (a confound or “lurking variable”) can easily drive both at once, creating a strong statistical relationship between two things that have no direct causal link at all. The classic illustration: ice-cream sales and drowning incidents both rise and fall together across the months of a year, not because ice cream causes drownings, but because both are driven by a hidden third factor — warmer temperatures — that independently increases both ice-cream buying and swimming (and therefore drowning risk).',
    whenToUse:
      'Use this as a mandatory caution any time you report a correlation between two measured variables — before implying a causal story, ask what third variable could plausibly be driving both, and remember that only a controlled experiment (manipulating one variable directly) can establish causation.',
    formula: 'corr(A, B) high  ≇  A causes B   (a confound C driving both A and B produces the same high correlation)',
    formulaBreakdown: [
      { term: 'corr(A, B)', meaning: 'the Pearson correlation between two measured variables — purely a measure of how they co-vary, with no direction or mechanism implied.' },
      { term: 'confounding / lurking variable', meaning: 'an unmeasured third factor that independently influences BOTH A and B, producing a strong A-B correlation with no direct causal link between them.' },
    ],
    datasetCsv: `month,ice_cream_sales,drowning_incidents,avg_temp_c
Jan,20,1,5
Feb,22,1,6
Mar,35,3,14
Apr,50,5,19
May,70,8,24
Jun,95,12,29`,
    code: `import csv
import io

# Correlation vs causation + a lurking/confounding variable: ice-cream sales
# and drowning incidents both rise together across months, but neither
# causes the other -- both are driven by a third variable (temperature).
csv_text = """month,ice_cream_sales,drowning_incidents,avg_temp_c
Jan,20,1,5
Feb,22,1,6
Mar,35,3,14
Apr,50,5,19
May,70,8,24
Jun,95,12,29"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
sales = [float(r["ice_cream_sales"]) for r in rows]
drown = [float(r["drowning_incidents"]) for r in rows]
temp = [float(r["avg_temp_c"]) for r in rows]


def pearson_r(a, b):
    n = len(a)
    ma, mb = sum(a) / n, sum(b) / n
    cov = sum((a[i] - ma) * (b[i] - mb) for i in range(n))
    sa = sum((x - ma) ** 2 for x in a) ** 0.5
    sb = sum((x - mb) ** 2 for x in b) ** 0.5
    return cov / (sa * sb)


r_sales_drown = pearson_r(sales, drown)
r_sales_temp = pearson_r(sales, temp)
r_drown_temp = pearson_r(drown, temp)

print(f"correlation(ice cream sales, drownings) = {r_sales_drown:.4f}  <- looks strongly related!")
print(f"correlation(ice cream sales, temperature) = {r_sales_temp:.4f}")
print(f"correlation(drownings, temperature) = {r_drown_temp:.4f}")
print()
print("both sales AND drownings correlate strongly with TEMPERATURE -- hot")
print("months mean more people buy ice cream AND more people go swimming")
print("(raising drowning risk). Temperature is the lurking/confounding")
print("variable driving both; ice cream does not cause drowning. A high r")
print("only ever tells you two things move together, never which one (if")
print("either) is the cause -- that requires a controlled experiment.")`,
    datasetNote:
      'Six months of ice-cream sales, drowning incidents, and average temperature, showing all three rising together.',
    output:
      'correlation(ice cream sales, drownings) = 0.9992  <- looks strongly related!\n' +
      'correlation(ice cream sales, temperature) = 0.9758\n' +
      'correlation(drownings, temperature) = 0.9691\n' +
      '\n' +
      'both sales AND drownings correlate strongly with TEMPERATURE -- hot\n' +
      'months mean more people buy ice cream AND more people go swimming\n' +
      '(raising drowning risk). Temperature is the lurking/confounding\n' +
      'variable driving both; ice cream does not cause drowning. A high r\n' +
      'only ever tells you two things move together, never which one (if\n' +
      'either) is the cause -- that requires a controlled experiment.',
    caveat:
      '“Control for the confound” isn\'t a magic fix either — you can only control for a confounding variable you thought to measure; an unmeasured, unsuspected confound can still be silently driving an apparent correlation.',
  },
  {
    id: 'cherry-picking-selective-reporting',
    title: 'Cherry-picking runs / selective reporting',
    category: 'methodology-pitfalls',
    aliases: ['selective reporting', 'file-drawer problem', 'reporting bias'],
    definition:
      'Cherry-picking means running the same experiment multiple independent times and then reporting only the run(s) that came out looking favorable, while quietly not mentioning the runs that didn\'t — whether that\'s because they contradicted the hypothesis or just looked “less clean”. Because every run that was actually PERFORMED carries real information about the true effect, silently excluding some of them from the report doesn\'t reduce noise — it manufactures a falsely large (or falsely confident) effect size that the full set of runs, honestly reported, would never have shown.',
    whenToUse:
      'Use this as a disclosure standard: every run/replicate you actually perform must be reported, whether it supports your hypothesis or not — deciding in advance how many runs you\'ll do (and reporting all of them) is the fix, not deciding after seeing which ones “worked.”',
    formula: 'honest mean = mean(ALL runs actually performed);  cherry-picked mean ≠ honest mean whenever any runs are hidden',
    formulaBreakdown: [
      { term: 'all runs performed', meaning: 'every independent replicate that was actually carried out, regardless of what its result looked like — the honest denominator for any summary statistic.' },
      { term: 'selective subset', meaning: 'reporting only the replicates that agree with the hypothesis, silently treating the disagreeing ones as if they never happened.' },
    ],
    datasetCsv: `run,group_a_mean,group_b_mean,difference
1,14.2,14.5,0.3
2,13.9,15.1,1.2
3,14.6,14.4,-0.2
4,13.8,14.9,1.1
5,14.4,15.6,1.2`,
    code: `import csv
import io

# Cherry-picking runs / selective reporting: running the SAME experiment
# multiple times and only reporting the run(s) that came out "significant",
# silently discarding the runs that didn't.
csv_text = """run,group_a_mean,group_b_mean,difference
1,14.2,14.5,0.3
2,13.9,15.1,1.2
3,14.6,14.4,-0.2
4,13.8,14.9,1.1
5,14.4,15.6,1.2"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
diffs = [float(r["difference"]) for r in rows]
print(f"all 5 independent replicate runs, group B - group A = {diffs}")

mean_all = sum(diffs) / len(diffs)
print(f"honest reporting: mean difference across ALL 5 runs = {mean_all:.3f}")

cherry_picked = [d for d in diffs if d >= 1.0]
mean_cherry = sum(cherry_picked) / len(cherry_picked)
print(f"cherry-picked: report ONLY runs where difference >= 1.0 (runs 2, 4, 5) = {cherry_picked}")
print(f"cherry-picked mean = {mean_cherry:.3f}  (looks like a much bigger, more reliable effect)")

print()
print(f"the true effect (averaging every run performed) is {mean_all:.3f}, not {mean_cherry:.3f}.")
print("selectively reporting only the runs that agree with the hypothesis and")
print("staying silent about runs 1 and 3 (small/reversed difference) is")
print("scientific misconduct, not noise reduction -- every run performed must")
print("be disclosed.")`,
    datasetNote:
      'Five independent replicate runs of the same group-A-vs-group-B comparison, with genuinely varying results.',
    output:
      'all 5 independent replicate runs, group B - group A = [0.3, 1.2, -0.2, 1.1, 1.2]\n' +
      'honest reporting: mean difference across ALL 5 runs = 0.720\n' +
      'cherry-picked: report ONLY runs where difference >= 1.0 (runs 2, 4, 5) = [1.2, 1.1, 1.2]\n' +
      'cherry-picked mean = 1.167  (looks like a much bigger, more reliable effect)\n' +
      '\n' +
      'the true effect (averaging every run performed) is 0.720, not 1.167.\n' +
      'selectively reporting only the runs that agree with the hypothesis and\n' +
      'staying silent about runs 1 and 3 (small/reversed difference) is\n' +
      'scientific misconduct, not noise reduction -- every run performed must\n' +
      'be disclosed.',
    caveat:
      '“The experiment didn\'t work that time” is not a valid reason to exclude a run from the report — unless there\'s a documented, outcome-independent reason (see outlier-removal policy), every run performed belongs in the writeup.',
  },
  {
    id: 'harking',
    title: 'HARKing (Hypothesizing After Results are Known)',
    category: 'methodology-pitfalls',
    aliases: ['post-hoc hypothesis', 'data dredging', 'hypothesizing after the fact'],
    definition:
      'HARKing means testing many possible relationships against one dataset with no single hypothesis chosen in advance, then presenting whichever relationship happened to look most interesting as though it had been the original, pre-planned research question all along. The problem isn\'t that the interesting-looking relationship is necessarily FALSE — in a small sample, several unrelated variables can show a strong pattern purely by chance or through shared underlying causes — the problem is that presenting it as pre-planned hides how many other relationships were tried and silently discarded first, which readers need to know to judge how much to trust it.',
    whenToUse:
      'Use this as a discipline: write down your ONE hypothesis before collecting or looking at the data, and if you explore other relationships afterward, label that exploration honestly as exploratory (hypothesis-generating for a FUTURE study), not as confirmation of a result you claim to have predicted.',
    formula: 'HARKing: explore many relationships → pick the interesting one → present it as the ORIGINAL hypothesis (undisclosed)',
    formulaBreakdown: [
      { term: 'pre-registered hypothesis', meaning: 'the ONE specific relationship written down and committed to BEFORE the data was collected or examined.' },
      { term: 'undisclosed exploration', meaning: 'testing many other relationships afterward and not mentioning that they were tried — this is what turns ordinary data exploration into HARKing.' },
    ],
    datasetCsv: `subject,sleep_hours,screen_time_hr,coffee_cups,quiz_score
1,7.5,2.0,1,82
2,6.0,4.5,3,74
3,8.0,1.0,0,91
4,5.5,5.0,4,68
5,7.0,2.5,2,85
6,6.5,3.5,1,79
7,8.5,0.5,0,94
8,5.0,6.0,3,63`,
    code: `import csv
import io

# HARKing (Hypothesizing After Results are Known): testing many unplanned
# hypotheses against one dataset, then presenting whichever one happened to
# look interesting as though it were the original, pre-planned question.
csv_text = """subject,sleep_hours,screen_time_hr,coffee_cups,quiz_score
1,7.5,2.0,1,82
2,6.0,4.5,3,74
3,8.0,1.0,0,91
4,5.5,5.0,4,68
5,7.0,2.5,2,85
6,6.5,3.5,1,79
7,8.5,0.5,0,94
8,5.0,6.0,3,63"""

rows = list(csv.DictReader(io.StringIO(csv_text)))


def pearson_r(a, b):
    n = len(a)
    ma, mb = sum(a) / n, sum(b) / n
    cov = sum((a[i] - ma) * (b[i] - mb) for i in range(n))
    sa = sum((x - ma) ** 2 for x in a) ** 0.5
    sb = sum((x - mb) ** 2 for x in b) ** 0.5
    return cov / (sa * sb)


score = [float(r["quiz_score"]) for r in rows]
candidates = {
    "sleep_hours": [float(r["sleep_hours"]) for r in rows],
    "screen_time_hr": [float(r["screen_time_hr"]) for r in rows],
    "coffee_cups": [float(r["coffee_cups"]) for r in rows],
}

print("the ORIGINAL, pre-registered hypothesis was: 'sleep predicts quiz score.'")
print("after collecting one dataset, every other column got tested too:")
for name, vals in candidates.items():
    r = pearson_r(vals, score)
    print(f"  correlation({name}, quiz_score) = {r:.4f}")

print()
print("all three are strongly correlated with quiz score in this single small")
print("sample BECAUSE the students who slept more also used screens less and")
print("drank less coffee -- any of the three 'explains' the scores about")
print("equally well here.")
print("HARKing would be dropping the original sleep question and presenting")
print("'we hypothesized that coffee predicts quiz performance' as though that")
print("were the plan all along, once it's seen which story the data tells.")
print("the fix is registering ONE hypothesis before looking at the data, and")
print("reporting every variable that was actually tested, not just the winner.")`,
    datasetNote:
      'Eight students\' sleep, screen time, coffee intake, and quiz scores, all three predictors turning out strongly correlated with the outcome.',
    output:
      'the ORIGINAL, pre-registered hypothesis was: \'sleep predicts quiz score.\'\n' +
      'after collecting one dataset, every other column got tested too:\n' +
      '  correlation(sleep_hours, quiz_score) = 0.9789\n' +
      '  correlation(screen_time_hr, quiz_score) = -0.9837\n' +
      '  correlation(coffee_cups, quiz_score) = -0.8814\n' +
      '\n' +
      'all three are strongly correlated with quiz score in this single small\n' +
      'sample BECAUSE the students who slept more also used screens less and\n' +
      'drank less coffee -- any of the three \'explains\' the scores about\n' +
      'equally well here.\n' +
      'HARKing would be dropping the original sleep question and presenting\n' +
      '\'we hypothesized that coffee predicts quiz performance\' as though that\n' +
      'were the plan all along, once it\'s seen which story the data tells.\n' +
      'the fix is registering ONE hypothesis before looking at the data, and\n' +
      'reporting every variable that was actually tested, not just the winner.',
    caveat:
      'Exploring a dataset for interesting patterns is a legitimate part of science — the ethical line is DISCLOSURE: exploratory findings must be labeled as exploratory, not repackaged as confirmation of a hypothesis that was actually chosen after the fact.',
  },
  {
    id: 'multiple-comparisons-fishing',
    title: 'Multiple-comparisons fishing',
    category: 'methodology-pitfalls',
    aliases: ['fishing expedition', 'many tests problem', 'alpha inflation'],
    definition:
      'Testing many unrelated outcome variables against the same treatment and reporting only whichever one crossed the p < 0.05 threshold is called “fishing” — and it\'s dangerous because, purely by chance, roughly 5% of tests will cross that threshold even when NONE of the variables have any real effect at all. This entry demonstrates the fishing trap itself using 20 pre-computed p-values from independent randomization tests run on data with no real effect anywhere; it deliberately does NOT re-derive the correction — that\'s the Stats Guide\'s job (its “Q-values / False Discovery Rate (Benjamini–Hochberg)” entry), which adjusts the significance threshold specifically to account for how many tests were actually run.',
    whenToUse:
      'Use this as a red flag any time a result was found by testing many outcome variables and reporting only the one(s) that crossed a significance threshold — the fix is either pre-specifying a single outcome in advance, or applying a multiple-comparisons correction (see the Stats Guide) to every variable tested, not just the winner.',
    formula: 'P(at least one false positive) grows with the number of tests, even at a fixed per-test α = 0.05',
    formulaBreakdown: [
      { term: 'per-test α = 0.05', meaning: 'each individual test is run at the usual 5% false-positive rate — fine in isolation, but not once many tests are run and only the smallest p-value is reported.' },
      { term: 'expected false positives', meaning: 'with k unrelated tests and no real effect anywhere, you\'d expect about 0.05 × k of them to cross the threshold by chance alone.' },
    ],
    datasetCsv: `variable,p_value
leaf_count,0.62
leaf_area,0.41
stem_height,0.78
root_mass,0.55
petal_width,0.29
seed_count,0.88
chlorophyll_index,0.003
sugar_content,0.71
water_uptake,0.19
germination_rate,0.94
flower_count,0.37
node_spacing,0.66
branch_count,0.83
pollen_count,0.11
fruit_weight,0.47
leaf_thickness,0.59
stomata_density,0.25
canopy_width,0.69
root_length,0.52
nitrogen_uptake,0.44`,
    code: `import csv
import io

# Multiple-comparisons fishing: testing many unrelated outcome variables
# against the same treatment and reporting whichever one crossed p < 0.05 --
# even when NONE of the variables have any real effect, chance alone
# guarantees some will look "significant" if you test enough of them. These
# 20 p-values come from 20 independent randomization tests, each comparing
# two groups secretly drawn from the IDENTICAL distribution (no real effect
# exists anywhere) -- see the Stats Guide for how a p-value itself is
# computed; this entry is about what happens once you run MANY of them.
csv_text = """variable,p_value
leaf_count,0.62
leaf_area,0.41
stem_height,0.78
root_mass,0.55
petal_width,0.29
seed_count,0.88
chlorophyll_index,0.003
sugar_content,0.71
water_uptake,0.19
germination_rate,0.94
flower_count,0.37
node_spacing,0.66
branch_count,0.83
pollen_count,0.11
fruit_weight,0.47
leaf_thickness,0.59
stomata_density,0.25
canopy_width,0.69
root_length,0.52
nitrogen_uptake,0.44"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
p_values = [(r["variable"], float(r["p_value"])) for r in rows]

print(f"tested {len(p_values)} UNRELATED outcome variables between two groups")
print("that are secretly drawn from the exact same distribution (no real effect exists).")

below_05 = [(name, p) for name, p in p_values if p < 0.05]
print(f"p-values below 0.05 by chance alone: {len(below_05)} of {len(p_values)} variables")
print(f"the 'significant' one: {below_05}")

expected = len(p_values) * 0.05
print()
print(f"with alpha=0.05 and no real effect anywhere, you'd EXPECT about 5% of {len(p_values)}")
print(f"tests (~{expected:.1f}) to cross the threshold purely by chance -- reporting")
print("only that one 'hit' (chlorophyll_index) as your finding is fishing.")
print("the fix is NOT re-deriving the fence math here -- see the Stats Guide's")
print("'Q-values / False Discovery Rate (Benjamini-Hochberg)' entry, which")
print("corrects the significance threshold for exactly this many-tests problem.")`,
    datasetNote:
      'Pre-computed p-values from 20 independent randomization tests, each comparing two groups secretly drawn from the identical distribution (no real effect exists anywhere).',
    output:
      'tested 20 UNRELATED outcome variables between two groups\n' +
      'that are secretly drawn from the exact same distribution (no real effect exists).\n' +
      'p-values below 0.05 by chance alone: 1 of 20 variables\n' +
      'those \'significant\' p-values: [0.003]\n' +
      '\n' +
      'with alpha=0.05 and no real effect anywhere, you\'d EXPECT about 5% of 20\n' +
      'tests (~1.0) to cross the threshold purely by chance -- reporting\n' +
      'only that one \'hit\' as your finding is fishing.\n' +
      'the fix is NOT re-deriving the fence math here -- see the Stats Guide\'s\n' +
      '\'Q-values / False Discovery Rate (Benjamini-Hochberg)\' entry, which\n' +
      'corrects the significance threshold for exactly this many-tests problem.',
    caveat:
      'This entry is a DEMONSTRATION of the fishing problem, not a computation you should copy for a real correction — for the actual math that adjusts your significance threshold for the number of tests performed, use the Stats Guide\'s Q-value/FDR entry.',
  },
  {
    id: 'regression-to-the-mean',
    title: 'Regression to the mean mistaken for an effect',
    category: 'methodology-pitfalls',
    aliases: ['statistical drift', 'extreme scorers', 'selection on the outcome'],
    definition:
      'When subjects are selected BECAUSE they scored unusually high or low on a noisy first measurement, some of that extremeness was inevitably just random noise — and on a second measurement, noise alone will tend to pull those extreme scorers back toward the overall average, even with no real intervention applied at all. This natural statistical drift can look exactly like a treatment effect if only the selected (extreme-scoring) group is re-tested and their improvement is attributed to whatever intervention they received, without a comparison group selected the same way but left untreated.',
    whenToUse:
      'Use this as a caution any time subjects were selected for a study BECAUSE they scored at an extreme on some measurement — always include an untreated comparison group selected the same way, so drift toward the mean (which happens regardless of treatment) can be told apart from a real effect.',
    formula: 'expected drift toward group mean ≈ (selection extremeness) × (1 − test–retest reliability)',
    formulaBreakdown: [
      { term: 'selection extremeness', meaning: 'how far from the overall average the subjects were chosen to be — the more extreme the selection, the more room there is to drift back toward average.' },
      { term: 'test–retest reliability', meaning: 'how much of the original score was “real” signal vs. random noise — lower reliability means MORE regression to the mean on a retest.' },
    ],
    datasetCsv: `student,pretest_score,posttest_score
1,42,58
2,45,55
3,95,88
4,90,85
5,44,52
6,93,90`,
    code: `import csv
import io

# Regression to the mean: subjects selected BECAUSE they scored unusually
# low (or high) on a noisy first measurement will tend to score closer to
# average on a re-test, even with NO real intervention -- that natural
# drift back toward the mean can be mistaken for a treatment effect.
csv_text = """student,pretest_score,posttest_score
1,42,58
2,45,55
3,95,88
4,90,85
5,44,52
6,93,90"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
pre = [float(r["pretest_score"]) for r in rows]
overall_mean = sum(pre) / len(pre)
print(f"pretest scores for all 6 students = {pre}, overall mean = {overall_mean:.1f}")

# "Tutoring program" selected only the LOWEST scorers for an intervention.
low_scorers = [r for r in rows if float(r["pretest_score"]) < overall_mean]
print(f"a tutoring program is given ONLY to the {len(low_scorers)} lowest-scoring students (below the mean):")
for r in low_scorers:
    pre_v, post_v = float(r["pretest_score"]), float(r["posttest_score"])
    print(f"  student {r['student']}: {pre_v} -> {post_v}  (+{post_v - pre_v:.0f})")

pre_low = [float(r["pretest_score"]) for r in low_scorers]
post_low = [float(r["posttest_score"]) for r in low_scorers]
mean_gain_low = sum(post_low) / len(post_low) - sum(pre_low) / len(pre_low)
print(f"mean gain for the low-scoring (tutored) group = {mean_gain_low:.2f} points")

high_scorers = [r for r in rows if float(r["pretest_score"]) >= overall_mean]
pre_high = [float(r["pretest_score"]) for r in high_scorers]
post_high = [float(r["posttest_score"]) for r in high_scorers]
mean_gain_high = sum(post_high) / len(post_high) - sum(pre_high) / len(pre_high)
print(f"mean gain for the UNTUTORED high-scoring group = {mean_gain_high:.2f} points (also moved toward the mean, downward)")
print()
print("both groups drifted toward the overall mean -- the low group up, the")
print("high group down -- with no tutoring given to the high group at all.")
print("selecting subjects because they scored at an extreme on one noisy")
print("test guarantees some of that extremeness was just noise, which won't")
print("repeat on a retest; a real design needs an untreated control group")
print("selected the SAME way to tell a true effect from this statistical drift.")`,
    datasetNote:
      'Six students\' pretest and posttest scores; only the three lowest-scoring students received an example intervention.',
    output:
      'pretest scores for all 6 students = [42.0, 45.0, 95.0, 90.0, 44.0, 93.0], overall mean = 68.2\n' +
      'a tutoring program is given ONLY to the 3 lowest-scoring students (below the mean):\n' +
      '  student 1: 42.0 -> 58.0  (+16)\n' +
      '  student 2: 45.0 -> 55.0  (+10)\n' +
      '  student 5: 44.0 -> 52.0  (+8)\n' +
      'mean gain for the low-scoring (tutored) group = 11.33 points\n' +
      'mean gain for the UNTUTORED high-scoring group = -5.00 points (also moved toward the mean, downward)\n' +
      '\n' +
      'both groups drifted toward the overall mean -- the low group up, the\n' +
      'high group down -- with no tutoring given to the high group at all.\n' +
      'selecting subjects because they scored at an extreme on one noisy\n' +
      'test guarantees some of that extremeness was just noise, which won\'t\n' +
      'repeat on a retest; a real design needs an untreated control group\n' +
      'selected the SAME way to tell a true effect from this statistical drift.',
    caveat:
      'The untreated high-scoring group in this example ALSO drifted toward the mean (downward) with zero intervention — that\'s the giveaway that at least part of the low group\'s improvement is regression to the mean, not proof the intervention did nothing, just proof you can\'t yet tell how much of the gain (if any) was real.',
  },
  {
    id: 'overfitting-too-few-points',
    title: 'Overfitting a trend to too few data points',
    category: 'methodology-pitfalls',
    aliases: ['overfit', 'too many parameters', 'spurious perfect fit'],
    definition:
      'A curve with N free parameters (a quadratic has 3: the coefficients of x², x, and a constant) can ALWAYS be made to pass through exactly N data points with zero error — that “perfect fit” reflects the number of points matching the number of parameters, not that the curve discovered any real underlying law. The only honest test of whether a fitted trend means anything is whether it correctly predicts a NEW point that was NOT used to fit the curve — a model that fits its training points perfectly but badly mispredicts new data has been overfit, not validated.',
    whenToUse:
      'Use this check any time you\'re tempted to fit a curve with several free parameters to a small number of data points — always hold back at least one point the model never saw, and judge the fit by how well it predicts THAT point, not by how perfectly it passes through the points it was trained on.',
    formula: 'N points and N free parameters → training error ≡ 0 (guaranteed), regardless of whether the model is TRUE',
    formulaBreakdown: [
      { term: 'free parameters', meaning: 'the adjustable numbers in the model (3 for a quadratic: a, b, c in y = ax²+bx+c) — more parameters means more flexibility to bend through arbitrary points.' },
      { term: 'held-out point', meaning: 'a data point deliberately NOT used when fitting the curve, so it can be used afterward as a genuine test of whether the fit generalizes.' },
    ],
    datasetCsv: `trial,concentration_m,reaction_rate
1,1.0,2.1
2,2.0,5.9
3,3.0,12.2
4,4.0,15.8`,
    code: `import csv
import io

# Overfitting a trend to too few points: with only 3 (x, y) points, a
# quadratic curve fits PERFECTLY (zero error) purely because 3 points always
# admit an exact degree-2 polynomial -- that "perfect fit" reflects the
# number of points, not a real underlying law, and fails to predict a 4th
# point collected afterward.
csv_text = """trial,concentration_m,reaction_rate
1,1.0,2.1
2,2.0,5.9
3,3.0,12.2
4,4.0,15.8"""

rows = list(csv.DictReader(io.StringIO(csv_text)))
x = [float(r["concentration_m"]) for r in rows]
y = [float(r["reaction_rate"]) for r in rows]

# Fit an exact quadratic (3 unknowns) through ONLY the first 3 points.
x3, y3 = x[:3], y[:3]


def fit_quadratic_exact(xs, ys):
    # Solve the 3x3 linear system for a,b,c in y = a*x^2 + b*x + c using the
    # first 3 points exactly (Cramer's rule by hand, no numpy needed for 3x3).
    (x1, x2, xx3), (y1, y2, y3v) = xs, ys
    import numpy as np
    A = np.array([[x1**2, x1, 1], [x2**2, x2, 1], [xx3**2, xx3, 1]])
    b = np.array([y1, y2, y3v])
    a, b_coef, c = np.linalg.solve(A, b)
    return a, b_coef, c


a, b_coef, c = fit_quadratic_exact(x3, y3)
print(f"fitting a quadratic (3 free parameters) through exactly 3 points {list(zip(x3, y3))}:")
print(f"  y = {a:.3f}x^2 + {b_coef:.3f}x + {c:.3f}")

print("checking the fit against the 3 training points (should be EXACT, zero error):")
for xi, yi in zip(x3, y3):
    pred = a * xi ** 2 + b_coef * xi + c
    print(f"  x={xi}: predicted={pred:.3f}, actual={yi}, error={pred - yi:.6f}")

x4, y4_actual = x[3], y[3]
pred4 = a * x4 ** 2 + b_coef * x4 + c
print(f"predicting the 4th point (NOT used to fit the curve): x={x4}")
print(f"  predicted = {pred4:.2f}, actual measured = {y4_actual}, error = {pred4 - y4_actual:+.2f}")
print()
print("the quadratic fit the first 3 points with ZERO error -- not because it")
print("discovered the true reaction law, but because any 3 points ALWAYS have")
print("an exact quadratic through them (3 points, 3 free parameters). the real")
print("test is whether the fitted curve predicts a NEW point it never saw --")
print("here it clearly does not, exposing the 'perfect fit' as overfitting.")`,
    datasetNote:
      'Four (concentration, reaction rate) points; a quadratic fit to the first 3 is tested against the 4th, held-out point.',
    output:
      'fitting a quadratic (3 free parameters) through exactly 3 points [(1.0, 2.1), (2.0, 5.9), (3.0, 12.2)]:\n' +
      '  y = 1.250x^2 + 0.050x + 0.800\n' +
      'checking the fit against the 3 training points (should be EXACT, zero error):\n' +
      '  x=1.0: predicted=2.100, actual=2.1, error=0.000000\n' +
      '  x=2.0: predicted=5.900, actual=5.9, error=0.000000\n' +
      '  x=3.0: predicted=12.200, actual=12.2, error=0.000000\n' +
      'predicting the 4th point (NOT used to fit the curve): x=4.0\n' +
      '  predicted = 21.00, actual measured = 15.8, error = +5.20\n' +
      '\n' +
      'the quadratic fit the first 3 points with ZERO error -- not because it\n' +
      'discovered the true reaction law, but because any 3 points ALWAYS have\n' +
      'an exact quadratic through them (3 points, 3 free parameters). the real\n' +
      'test is whether the fitted curve predicts a NEW point it never saw --\n' +
      'here it clearly does not, exposing the \'perfect fit\' as overfitting.',
    caveat:
      'A model with as many parameters as data points will ALWAYS achieve zero training error — that\'s a mathematical guarantee, not evidence of a discovered relationship; more data points than parameters (and checking predictions on held-out points) is what actually tests a trend.',
  },
]

// ─── Filtering helper ─────────────────────────────────────────────────────

export interface DataQualityFilter {
  query?: string
  category?: DataQualityCategory | null
}

/**
 * Filters `DATA_QUALITY_GUIDE` (or any subset) by a case-insensitive
 * substring match on title/definition/aliases, AND-ed with an optional
 * category. A blank or whitespace-only query behaves like "no query." Pure
 * and side-effect free — unit-testable and reusable by the panel component
 * via `useMemo`. Thin wrapper over `filterGuideEntries`, kept so this
 * module's signature and search fields stay pinned.
 */
export function filterDataQualityConcepts(
  concepts: DataQualityConcept[],
  filter: DataQualityFilter,
): DataQualityConcept[] {
  return filterGuideEntries(
    concepts,
    filter,
    (c) => [c.title, c.definition, ...(c.aliases ?? [])],
    (c) => c.category,
  )
}
