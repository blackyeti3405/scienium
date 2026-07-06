/**
 * Data Terminal "Methods Guide" (Feature F3) — a static, authored reference
 * library of ~40 experimental-design concepts (hypothesis framing, IV/DV/
 * controlled-variable identification, control-group design, blinding and
 * randomization, replication and sample-size planning, confounds, and
 * instrument choice) that apply across science-fair fields. This is a typed
 * constant rendered client-side — nothing fetched, nothing persisted, no
 * LLM call, no Python execution — authored + reviewed off-pipeline. Only
 * ~40 entries, so like `stats-guide.ts` (65) and `plot-guide.ts` (45) this
 * stays one eager module; lazy per-field splitting (as in `charts-guide.ts`,
 * 250 entries) is unwarranted here.
 *
 * F3/F4 boundary: this guide covers experimental DESIGN — everything decided
 * BEFORE data exists. Post-collection data handling (significant figures,
 * measurement-uncertainty propagation, unit conversion, data cleaning,
 * outlier-removal policy, missing-data strategy) lives in F4's Data Quality
 * Guide — cross-reference only, do not duplicate that content here.
 */

import { filterGuideEntries } from '@/lib/guides/filter'

export type MethodCategory =
  | 'Hypothesis & Variables'
  | 'Controls'
  | 'Bias Control'
  | 'Replication & Sampling'
  | 'Confounds & Validity'
  | 'Instruments & Measurement'

/** Distinct method categories, sorted alphabetically — drives the category dropdown. */
export const METHOD_CATEGORIES: string[] = [
  'Bias Control',
  'Confounds & Validity',
  'Controls',
  'Hypothesis & Variables',
  'Instruments & Measurement',
  'Replication & Sampling',
]

export interface MethodConcept {
  /** Stable, slug-safe, unique id — drives the data-testid (e.g. "testable-hypothesis"). */
  id: string
  /** Human title shown in the box header. */
  title: string
  /** One of METHOD_CATEGORIES. */
  category: string
  /** Plain-language what-it-is. */
  definition: string
  /** When a student reaches for this in their own design. */
  whenToUse: string
  /** A concrete, field-anchored worked design example. */
  workedExample: string
  /** Structured labeled-list detail (IV/DV/control tables, sample-size reasoning, etc). */
  designTable: { label: string; value: string }[]
  /** The "what would confound this / common mistake" callout. */
  pitfall: string
  /** Optional Charts Guide field slug for a "see also" cross-link (text hint only, no live nav). */
  fieldRef?: string
}

export const METHODS: MethodConcept[] = [
  // ─── Hypothesis & Variables ──────────────────────────────────────────────
  {
    id: 'testable-hypothesis',
    title: 'Writing a Testable Hypothesis',
    category: 'Hypothesis & Variables',
    definition:
      'A testable hypothesis is a specific, falsifiable statement predicting how one variable affects another, phrased so an experiment could show it wrong. It is not a question and not a vague belief — it commits to a direction and a mechanism.',
    whenToUse:
      'At the very start of planning, before choosing methods or equipment — the hypothesis should drive every later design decision, not be written after the fact to match results you already have.',
    workedExample:
      'Plant-growth study: instead of "light affects plant growth," the testable form is "Increasing daily light exposure from 6 to 12 hours will increase bean-plant stem height at day 21, because more light increases photosynthetic energy available for growth."',
    designTable: [
      { label: 'Weak version', value: '"Does light affect plants?" — a question, not falsifiable' },
      { label: 'Testable version', value: '"More daily light hours increases stem height at day 21"' },
      { label: 'Includes', value: 'Direction (increase), variable, timeframe, and a mechanism reason' },
    ],
    pitfall:
      'A hypothesis that cannot fail is not testable — "plants need light to grow" is already known and predicts nothing specific. Also avoid multi-part hypotheses that bundle two unrelated predictions into one statement.',
    fieldRef: 'plant-science-agriculture',
  },
  {
    id: 'null-vs-alternative-hypothesis',
    title: 'Null vs. Alternative Hypothesis',
    category: 'Hypothesis & Variables',
    definition:
      'The null hypothesis (H0) states there is no effect or no difference between groups; the alternative hypothesis (H1) states the effect you predict exists. Statistical tests are built to reject or fail to reject H0, never to "prove" H1 directly.',
    whenToUse:
      'Whenever you plan to run a statistical test on your results — deciding H0/H1 up front keeps you from reinterpreting the test after seeing the data.',
    workedExample:
      'Fertilizer study: H0 = "mean height of fertilized and unfertilized plants is equal." H1 = "mean height of fertilized plants is greater than unfertilized plants."',
    designTable: [
      { label: 'H0', value: 'No difference between fertilized and control group means' },
      { label: 'H1', value: 'Fertilized group mean height > control group mean height' },
      { label: 'Test outcome', value: 'Reject H0, or fail to reject H0 — never "accept" H0' },
    ],
    pitfall:
      'Treating "failed to reject H0" as proof of no effect — it may just mean the sample was too small to detect a real difference (see sample-size planning).',
  },
  {
    id: 'independent-variable',
    title: 'Independent Variable (IV)',
    category: 'Hypothesis & Variables',
    definition:
      'The independent variable is the one factor the experimenter deliberately changes across conditions to see its effect. It is the input you control and vary on purpose.',
    whenToUse:
      'Identify the IV first, before building any apparatus — every other design choice (levels, controls, sample size) follows from what you are varying and how.',
    workedExample:
      'Battery-life study: the IV is discharge current (levels: 0.5A, 1.0A, 1.5A) — the experimenter sets each battery to discharge at one of these fixed currents.',
    designTable: [
      { label: 'IV', value: 'Discharge current' },
      { label: 'Levels tested', value: '0.5A, 1.0A, 1.5A' },
      { label: 'How it is set', value: 'Fixed by a programmable electronic load, not measured passively' },
    ],
    pitfall:
      'Confusing something you merely observe varying in nature with something you deliberately manipulate — if you did not set the levels yourself, it is an observational variable, not a true IV, and causal claims are weaker.',
    fieldRef: 'electronics-electrical-engineering',
  },
  {
    id: 'dependent-variable',
    title: 'Dependent Variable (DV)',
    category: 'Hypothesis & Variables',
    definition:
      'The dependent variable is the outcome you measure — the thing predicted to change because of the independent variable. It is called "dependent" because its value depends on the IV.',
    whenToUse:
      'Choose the DV to be the most direct, quantifiable measure of the outcome your hypothesis actually predicts — not a convenient proxy that only loosely relates to it.',
    workedExample:
      'Battery-life study: the DV is time-to-cutoff-voltage (minutes) recorded at each discharge-current level — a direct, continuously measurable outcome.',
    designTable: [
      { label: 'DV', value: 'Time to reach cutoff voltage (minutes)' },
      { label: 'Measured how', value: 'Data logger sampling voltage every second until threshold reached' },
      { label: 'Units', value: 'Minutes, recorded to the nearest 0.1 min' },
    ],
    pitfall:
      'Picking a DV that is only indirectly related to the hypothesis (e.g., measuring "user satisfaction" when the hypothesis is about battery voltage decay) — mismatch between DV and hypothesis undermines the whole conclusion.',
  },
  {
    id: 'controlled-variables',
    title: 'Controlled (Constant) Variables',
    category: 'Hypothesis & Variables',
    definition:
      'Controlled variables are every other factor that could affect the DV besides the IV, held constant across all conditions so that any difference in the DV can be attributed to the IV alone.',
    whenToUse:
      'List these during planning, before data collection — an incomplete controlled-variable list is the single most common reason a design gets challenged at judging.',
    workedExample:
      'Plant-growth study (IV = light hours): controlled variables include soil type/volume, pot size, water amount and timing, ambient temperature, and seed source/variety — all held identical across every light-hour group.',
    designTable: [
      { label: 'IV', value: 'Daily light hours (6h, 9h, 12h)' },
      { label: 'DV', value: 'Stem height at day 21 (cm)' },
      { label: 'Controlled', value: 'Soil type/volume, pot size, water schedule, temperature, seed variety' },
    ],
    pitfall:
      'Forgetting a variable that seems "obviously" constant, like ambient room temperature drifting between a morning and afternoon measurement session — small unlisted drifts become confounds later.',
    fieldRef: 'plant-science-agriculture',
  },
  {
    id: 'iv-dv-control-table',
    title: 'Building an IV/DV/Controls Table',
    category: 'Hypothesis & Variables',
    definition:
      'A design table is a compact, three-column summary of a study\'s independent variable, dependent variable, and controlled variables, used to communicate the whole design at a glance — a standard piece of the ISEF research-plan write-up.',
    whenToUse:
      'Build this table immediately after drafting the hypothesis and before writing a procedure — it is the fastest way to catch a missing control or an ill-defined DV before any equipment is set up.',
    workedExample:
      'Corrosion-rate study: IV = salt-water concentration (0%, 3%, 6%); DV = mass loss of steel coupon after 14 days (g); Controlled = coupon material/surface area, water temperature, immersion depth, exposure duration.',
    designTable: [
      { label: 'Independent variable', value: 'Salt-water concentration (0%, 3%, 6%)' },
      { label: 'Dependent variable', value: 'Steel coupon mass loss after 14 days (g)' },
      { label: 'Controlled variables', value: 'Coupon material, surface area, water temp, immersion depth, duration' },
    ],
    pitfall:
      'Listing the IV or DV twice under "controlled" by accident, or leaving the controlled-variables row blank because "it is obvious" — judges expect it written out explicitly.',
    fieldRef: 'materials-science',
  },
  {
    id: 'operationalizing-variables',
    title: 'Operationalizing a Variable',
    category: 'Hypothesis & Variables',
    definition:
      'Operationalizing means turning an abstract concept ("stress," "growth," "efficiency") into a specific, measurable procedure that produces a number — stating exactly what you will measure, with what instrument, and in what units.',
    whenToUse:
      'Whenever your hypothesis mentions a concept that is not already a single physical measurement — before you can collect data you need one specific operational definition, not several competing ones.',
    workedExample:
      '"Plant stress" is not directly measurable. Operationalized as: leaf chlorophyll content measured via a SPAD meter reading, averaged over 3 leaves per plant, recorded at day 14.',
    designTable: [
      { label: 'Abstract concept', value: 'Plant stress' },
      { label: 'Operational definition', value: 'Mean SPAD chlorophyll reading across 3 leaves, day 14' },
      { label: 'Instrument', value: 'Handheld SPAD chlorophyll meter' },
    ],
    pitfall:
      'Switching operational definitions mid-study (measuring leaf color by eye in week 1, then switching to a SPAD meter in week 3) — this silently changes what is actually being measured and breaks comparability.',
    fieldRef: 'plant-science-agriculture',
  },
  {
    id: 'levels-of-an-iv',
    title: 'Choosing Levels of the Independent Variable',
    category: 'Hypothesis & Variables',
    definition:
      'Levels are the specific values or categories of the IV that will actually be tested (e.g., three temperatures, two drug doses). Choosing how many levels and how far apart they are shapes what shape of relationship you can detect.',
    whenToUse:
      'After fixing the IV but before building the procedure — decide how many distinct values to test and whether they should be evenly spaced.',
    workedExample:
      'Reaction-rate study: IV = temperature. Levels chosen: 10°C, 25°C, 40°C, 55°C — four evenly spaced levels, enough to reveal whether the relationship looks linear or curved (e.g., an exponential Arrhenius-like trend).',
    designTable: [
      { label: 'Too few levels', value: '2 levels (e.g., only 10°C vs 40°C) — cannot tell if the relationship is a line or a curve' },
      { label: 'Chosen levels', value: '10°C, 25°C, 40°C, 55°C — evenly spaced, 4 points' },
      { label: 'Why 4+', value: 'Minimum needed to visually distinguish linear vs. curved trends' },
    ],
    pitfall:
      'Testing only two levels ("with vs. without") when the real hypothesis is about a trend or dose-response curve — two points can only ever draw a straight line, never reveal curvature.',
    fieldRef: 'chemistry',
  },
  {
    id: 'categorical-vs-continuous-iv',
    title: 'Categorical vs. Continuous Variables',
    category: 'Hypothesis & Variables',
    definition:
      'A categorical variable takes on distinct group labels (species, treatment type, material); a continuous variable takes on any numeric value across a range (temperature, concentration, time). The type of both IV and DV determines which plots and statistical tests are valid.',
    whenToUse:
      'When choosing your IV/DV and, later, when picking a plot type or statistical test from the Plot Guide or Stats Guide — the variable type constrains what tools apply.',
    workedExample:
      'Comparing three fabric types\' tensile strength: fabric type is categorical (three named groups); tensile strength (MPa) is continuous — this pairing calls for a bar chart with error bars or a one-way ANOVA, not a scatter plot.',
    designTable: [
      { label: 'Categorical example', value: 'Fabric type: cotton, polyester, nylon' },
      { label: 'Continuous example', value: 'Tensile strength (MPa), any decimal value' },
      { label: 'Typical plot pairing', value: 'Categorical IV + continuous DV → bar/box plot, not scatter' },
    ],
    pitfall:
      'Treating an ordered categorical variable (e.g., "low/medium/high dose") as if it were unordered, or as if it were truly continuous — losing the ordering information changes which analysis is appropriate.',
  },
  {
    id: 'directional-vs-nondirectional-hypothesis',
    title: 'Directional vs. Non-Directional Hypothesis',
    category: 'Hypothesis & Variables',
    definition:
      'A directional hypothesis predicts the sign of the effect (increase or decrease); a non-directional hypothesis predicts only that a difference exists, without committing to which way it goes. This choice affects which statistical test (one-tailed vs. two-tailed) is appropriate.',
    whenToUse:
      'Decide this before data collection, based on existing theory or prior evidence — choosing the direction after seeing the data ("p-hacking" the tail) invalidates the test.',
    workedExample:
      '"Adding compost will increase soil water retention" is directional. "Compost type affects soil water retention" (without predicting more or less) is non-directional.',
    designTable: [
      { label: 'Directional', value: '"Fertilizer increases yield" — predicts a specific sign' },
      { label: 'Non-directional', value: '"Fertilizer changes yield" — predicts a difference, either direction' },
      { label: 'Test implication', value: 'Directional often pairs with a one-tailed test; non-directional with two-tailed' },
    ],
    pitfall:
      'Stating a directional hypothesis but then running a two-tailed test "just in case," or worse, deciding the direction after looking at the results — the hypothesis must be locked in before data collection.',
  },

  // ─── Controls ─────────────────────────────────────────────────────────────
  {
    id: 'negative-control',
    title: 'Negative Control',
    category: 'Controls',
    definition:
      'A negative control is a condition expected to show no effect — it receives no treatment (or an inert one) so you can confirm that any effect seen in treated groups is due to the treatment and not the experimental setup itself.',
    whenToUse:
      'Any time you are testing whether a treatment causes an effect — a negative control establishes the baseline you compare treated groups against.',
    workedExample:
      'Antibacterial-soap study: the negative control is a petri dish swabbed with bacteria but treated with plain water (no soap) — if bacteria still grow normally there, it confirms the dish/swabbing procedure itself is not killing bacteria.',
    designTable: [
      { label: 'Negative control', value: 'Bacteria + plain water, no antibacterial agent' },
      { label: 'Expected result', value: 'Normal bacterial growth, same as an untreated baseline' },
      { label: 'What it rules out', value: 'The petri dish, swabbing method, or incubation itself killing bacteria' },
    ],
    pitfall:
      'Confusing a negative control with a "no data" placeholder — it must be run through the exact same procedure as treatment groups, just without the active treatment, or it cannot rule out confounds.',
    fieldRef: 'immunology-microbiology',
  },
  {
    id: 'positive-control',
    title: 'Positive Control',
    category: 'Controls',
    definition:
      'A positive control is a condition using a treatment already known to produce the effect being tested, confirming that the experimental setup is capable of detecting a real effect at all.',
    whenToUse:
      'Whenever a "no effect" result would otherwise be ambiguous — without a positive control, you cannot tell whether a null result means "no effect" or "the assay/setup could not detect an effect even if present."',
    workedExample:
      'Antibacterial-soap study: the positive control is a dish treated with a known-effective antibiotic solution — if bacteria are killed there, it confirms the assay is sensitive enough to detect antibacterial action when it is truly present.',
    designTable: [
      { label: 'Positive control', value: 'Bacteria + known antibiotic (e.g., standard chlorhexidine solution)' },
      { label: 'Expected result', value: 'Clear zone of inhibition / reduced colony growth' },
      { label: 'What it confirms', value: 'The assay can detect a true antibacterial effect when one exists' },
    ],
    pitfall:
      'Skipping the positive control to save time, then getting a null result for the test treatment and being unable to tell if the treatment truly has no effect or the assay simply failed to detect it.',
    fieldRef: 'immunology-microbiology',
  },
  {
    id: 'blank-control',
    title: 'Blank Control',
    category: 'Controls',
    definition:
      'A blank control contains everything in the procedure except the sample itself — it measures the background signal contributed by reagents, solvent, or instrument alone, so that signal can be subtracted from real readings.',
    whenToUse:
      'Whenever the measurement instrument (spectrophotometer, scale, sensor) could register a non-zero reading even with no real sample present.',
    workedExample:
      'Colorimetric protein assay: the blank is a cuvette with only the reagent solution and buffer, no protein sample — its absorbance reading is subtracted from every sample reading before analysis.',
    designTable: [
      { label: 'Blank', value: 'Reagent + buffer only, no sample' },
      { label: 'Sample readings', value: 'Reagent + buffer + protein sample' },
      { label: 'Correction applied', value: 'Sample absorbance − blank absorbance = true signal' },
    ],
    pitfall:
      'Reusing one blank reading across an entire multi-day study without re-measuring it each session — reagent or instrument drift over time means a stale blank under- or over-corrects later readings.',
    fieldRef: 'molecular-cell-biology',
  },
  {
    id: 'placebo-control',
    title: 'Placebo Control',
    category: 'Controls',
    definition:
      'A placebo control gives participants something that looks/feels identical to the real treatment but has no active effect, isolating the psychological or procedural effect of "receiving a treatment" from the treatment\'s actual biological or physical effect.',
    whenToUse:
      'Studies involving human (or animal) subjects\' self-reported or behavioral outcomes, where simply believing you received a treatment can change the outcome (the placebo effect).',
    workedExample:
      'Caffeine-and-reaction-time study: the placebo group drinks a decaffeinated beverage that looks and tastes identical to the caffeinated one, so any change in reaction time in the real group can be attributed to caffeine, not to expectation.',
    designTable: [
      { label: 'Treatment group', value: 'Caffeinated beverage, disguised flavor/appearance' },
      { label: 'Placebo group', value: 'Decaf beverage, identical appearance/flavor' },
      { label: 'What it isolates', value: 'True pharmacological effect vs. expectation effect' },
    ],
    pitfall:
      'Using a placebo that participants can visually or tastefully distinguish from the real treatment — if participants can tell which group they are in, the placebo control fails to isolate the expectation effect (see blinding).',
    fieldRef: 'psychology-behavioral-science',
  },
  {
    id: 'vehicle-control',
    title: 'Vehicle Control',
    category: 'Controls',
    definition:
      'A vehicle control receives the same delivery medium (solvent, carrier, injection fluid) used to deliver the treatment, but without the active substance — used when the treatment must be dissolved or suspended in something that could itself have an effect.',
    whenToUse:
      'Any time your active compound is delivered dissolved in a solvent (ethanol, DMSO, saline) that is not pure water and could plausibly affect the organism or system on its own.',
    workedExample:
      'Plant-growth-hormone study: the hormone is dissolved in a small amount of ethanol before spraying. The vehicle control is sprayed with the same ethanol-water mixture, minus the hormone, to separate hormone effects from solvent effects.',
    designTable: [
      { label: 'Treatment', value: 'Hormone dissolved in 2% ethanol solution, sprayed on leaves' },
      { label: 'Vehicle control', value: '2% ethanol solution only, sprayed on leaves' },
      { label: 'What it isolates', value: 'Hormone effect vs. solvent-alone effect' },
    ],
    pitfall:
      'Using plain water as the "control" when the real treatment was dissolved in a solvent — this conflates the solvent\'s own effect with the active ingredient\'s effect.',
    fieldRef: 'plant-science-agriculture',
  },
  {
    id: 'sham-control',
    title: 'Sham Control',
    category: 'Controls',
    definition:
      'A sham control puts a subject through every procedural step of an intervention (handling, an incision, a device attachment) except the actual active step, isolating the effect of the procedure itself from the effect of the intervention.',
    whenToUse:
      'Studies involving a physical procedure or device (surgery, electrical stimulation, an implanted sensor) where the act of doing the procedure could itself cause stress, healing response, or behavior change.',
    workedExample:
      'Robotics/wearable-device study testing an active vibration-feedback insole: the sham group wears an identical-looking insole with the vibration motor disconnected, so gait changes can be attributed to the feedback itself, not to wearing an unfamiliar insole.',
    designTable: [
      { label: 'Active group', value: 'Insole with working vibration-feedback motor' },
      { label: 'Sham group', value: 'Identical insole, motor disconnected/inactive' },
      { label: 'What it isolates', value: 'Feedback effect vs. effect of wearing any insole' },
    ],
    pitfall:
      'Making the sham device visibly or functionally distinguishable from the active one (e.g., it feels lighter) — subjects who can tell they got the sham may behave differently regardless of true treatment effect.',
    fieldRef: 'gait-biomechanics',
  },
  {
    id: 'within-subjects-control',
    title: 'Within-Subjects (Self) Control',
    category: 'Controls',
    definition:
      'A within-subjects design has each subject serve as their own control by measuring them in more than one condition (e.g., before and after, or under two treatments), removing subject-to-subject variability from the comparison.',
    whenToUse:
      'When individual variability (between different people, plants, or samples) is large relative to the treatment effect you are trying to detect, and repeated measurement of the same subject is practical without carryover effects.',
    workedExample:
      'Reaction-time-and-caffeine study measuring the same 12 participants on both a no-caffeine day and a caffeine day (with a rest period between), rather than comparing 12 different people in each group.',
    designTable: [
      { label: 'Within-subjects', value: 'Same 12 people measured in both conditions, order counterbalanced' },
      { label: 'Between-subjects alternative', value: '12 people in caffeine group, a different 12 in no-caffeine group' },
      { label: 'Benefit', value: 'Removes person-to-person baseline variability from the comparison' },
    ],
    pitfall:
      'Carryover effects — if the first condition\'s effect has not worn off before testing the second condition (e.g., caffeine still active), the "self" comparison is contaminated. Needs a washout period and/or counterbalanced order.',
    fieldRef: 'psychology-behavioral-science',
  },
  {
    id: 'between-subjects-control',
    title: 'Between-Subjects Design',
    category: 'Controls',
    definition:
      'A between-subjects design compares different, independent groups of subjects, each experiencing only one condition — avoiding carryover effects but requiring larger sample sizes to average out individual variability between groups.',
    whenToUse:
      'When repeated exposure to multiple conditions is impossible or would contaminate results (e.g., a one-time surgical intervention, or a taste test where the first sample changes perception of the second).',
    workedExample:
      'Comparing two fertilizer brands: 15 separate plants get Brand A, a different 15 plants get Brand B — each plant experiences only one treatment, avoiding any carryover from switching fertilizers mid-study.',
    designTable: [
      { label: 'Group A', value: '15 plants, Brand A fertilizer only' },
      { label: 'Group B', value: '15 plants, Brand B fertilizer only' },
      { label: 'Trade-off', value: 'No carryover risk, but needs more total subjects than a within-subjects design' },
    ],
    pitfall:
      'Assuming the two groups start out equivalent without checking — random assignment (see randomization) is what justifies treating between-group differences as due to treatment rather than pre-existing group differences.',
  },

  // ─── Bias Control ─────────────────────────────────────────────────────────
  {
    id: 'single-blinding',
    title: 'Single-Blinding',
    category: 'Bias Control',
    definition:
      'In a single-blind design, the subject does not know which condition (treatment or control) they are receiving, preventing their expectations from influencing the outcome — while the experimenter measuring them still knows.',
    whenToUse:
      'Whenever a subject\'s belief about their treatment could change their behavior or self-reported outcome, but the measurement itself is objective enough that experimenter knowledge is less of a risk.',
    workedExample:
      'Taste-test study comparing regular vs. reduced-sugar soda: participants drink from unlabeled cups so they do not know which formula they are tasting, removing brand/sugar-content expectation bias from their ratings.',
    designTable: [
      { label: 'Subject knows condition?', value: 'No — cups are unlabeled/coded' },
      { label: 'Experimenter knows condition?', value: 'Yes — pours from labeled stock, but does not tell participant' },
      { label: 'What it removes', value: 'Subject expectation bias' },
    ],
    pitfall:
      'Blinding that is easily broken by a giveaway cue (different cup color, a distinct smell) — if participants can guess the condition, the study is not actually blind regardless of what it is labeled.',
    fieldRef: 'nutrition-food-science',
  },
  {
    id: 'double-blinding',
    title: 'Double-Blinding',
    category: 'Bias Control',
    definition:
      'In a double-blind design, neither the subject nor the person collecting/scoring data knows which condition a given subject is in, removing both subject expectation bias and experimenter/observer bias from the results.',
    whenToUse:
      'When the outcome measurement involves any human judgment (a grader deciding a rating, scoring a behavior, or making a borderline measurement call) that could be unconsciously influenced by knowing the group.',
    workedExample:
      'Fertilizer study where plant height is later scored by a research assistant using only coded pot IDs (Pot 1, Pot 2, ...) with the fertilizer-vs-control key held by someone else and revealed only after all measurements are recorded.',
    designTable: [
      { label: 'Coding', value: 'Pots labeled with random ID codes, not treatment names' },
      { label: 'Key holder', value: 'A third party holds the code-to-treatment key until data collection is complete' },
      { label: 'What it removes', value: 'Both subject expectation bias and experimenter measurement bias' },
    ],
    pitfall:
      'Breaking the blind accidentally — e.g., a distinctive smell or residue from the treatment lets the person measuring guess the group, silently converting a "double-blind" design back into a biased one.',
  },
  {
    id: 'randomization',
    title: 'Randomization / Random Assignment',
    category: 'Bias Control',
    definition:
      'Randomization assigns subjects or samples to conditions using a chance-based procedure (a random number generator, drawing lots), so that any pre-existing differences between subjects are distributed evenly across groups rather than systematically favoring one condition.',
    whenToUse:
      'Any comparative study with multiple groups — random assignment is what allows you to attribute a group difference in the DV to the treatment rather than to which subjects happened to end up where.',
    workedExample:
      'Assigning 30 seedlings to 3 fertilizer groups: instead of the first 10 seedlings (which might be biggest, from being potted first) all going to Group A, each seedling is assigned a random number and sorted into groups by that number.',
    designTable: [
      { label: 'Non-random (bad)', value: 'First 10 seedlings potted → Group A; systematically different from later batches' },
      { label: 'Randomized', value: 'Each seedling assigned a random number, then sorted into groups by that number' },
      { label: 'What it prevents', value: 'Systematic pre-existing differences correlating with group assignment' },
    ],
    pitfall:
      'Confusing "haphazard" (grabbing whichever samples are convenient) with truly random — convenience selection can still correlate with an unnoticed factor (e.g., always grabbing plants nearest the window).',
    fieldRef: 'plant-science-agriculture',
  },
  {
    id: 'randomized-order-of-trials',
    title: 'Randomizing Trial Order',
    category: 'Bias Control',
    definition:
      'Randomizing the order in which conditions are tested (rather than always testing Condition A, then B, then C in the same sequence) prevents time-linked drifts — such as equipment warm-up, participant fatigue, or daylight changes — from being mistaken for a treatment effect.',
    whenToUse:
      'Whenever multiple conditions are tested in sequence within a session or across days, and something about the environment or subject state could drift systematically over that sequence.',
    workedExample:
      'Testing three ball types\' bounce height: instead of always testing tennis, then rubber, then foam in that fixed order, the testing order is shuffled randomly for each of the 10 repeated trials, so any court-surface temperature drift over the session does not systematically favor one ball type.',
    designTable: [
      { label: 'Fixed order (bad)', value: 'Always A, then B, then C — confounds trial order with condition' },
      { label: 'Randomized order', value: 'Order shuffled independently for each repeat/trial block' },
      { label: 'What it prevents', value: 'Time-linked drift (warm-up, fatigue, temperature) masquerading as a condition effect' },
    ],
    pitfall:
      'Randomizing the group assignment but forgetting to also randomize testing order within a session — order effects can still confound results even with subjects correctly randomized to groups.',
  },
  {
    id: 'order-effects-and-counterbalancing',
    title: 'Order Effects & Counterbalancing',
    category: 'Bias Control',
    definition:
      'An order effect is a change in response caused by the sequence conditions were presented in (practice/learning improving later trials, or fatigue worsening them), independent of the conditions themselves. Counterbalancing systematically varies the order across subjects so these effects cancel out on average.',
    whenToUse:
      'Within-subjects designs where each subject experiences multiple conditions — counterbalancing is the standard fix once order effects are a plausible risk.',
    workedExample:
      'Memory-game study where each participant plays both a "quiet room" and "noisy room" condition: half of participants do quiet-then-noisy, the other half do noisy-then-quiet, so practice effects are balanced evenly across both condition orders.',
    designTable: [
      { label: 'Group 1 order', value: 'Quiet condition first, then noisy' },
      { label: 'Group 2 order', value: 'Noisy condition first, then quiet' },
      { label: 'Effect balanced out', value: 'Practice/learning improvement across repeated attempts' },
    ],
    pitfall:
      'Counterbalancing only two conditions when there are three or more — with 3+ conditions a full or partial Latin-square counterbalancing scheme is needed, not just an A/B swap.',
    fieldRef: 'psychology-behavioral-science',
  },
  {
    id: 'blind-data-analysis',
    title: 'Blind Data Analysis',
    category: 'Bias Control',
    definition:
      'Blind data analysis means the person analyzing or scoring the data does not know which group each data point belongs to until after analysis decisions (e.g., which outliers to exclude) are locked in — preventing analysis choices from being unconsciously steered toward a hoped-for result.',
    whenToUse:
      'Any time analysis involves subjective judgment calls, such as deciding whether a data point looks like a measurement error, before formal outlier criteria are applied.',
    workedExample:
      'A student scoring seedling health from photos labels each photo with a random code, decides on health-score criteria and outlier rules while blind to which treatment group each code belongs to, and only reveals the group key after all scores are finalized.',
    designTable: [
      { label: 'Blinded step', value: 'Photo scoring and outlier-rule decisions' },
      { label: 'Unblinded after', value: 'Final tally, once group key is revealed' },
      { label: 'What it prevents', value: 'Unconsciously scoring the "hoped-for" group more favorably' },
    ],
    pitfall:
      'Revealing the group key before finalizing which outliers to exclude — outlier-exclusion decisions made after unblinding are especially vulnerable to (even unintentional) bias.',
  },
  {
    id: 'demand-characteristics',
    title: 'Demand Characteristics',
    category: 'Bias Control',
    definition:
      'Demand characteristics are cues in a study that let participants guess its purpose or hypothesis, causing them to (consciously or not) change their behavior to match what they think is expected, rather than responding naturally.',
    whenToUse:
      'Studies with human participants, especially self-report surveys or observed-behavior tasks, where knowing "what the study is about" could change how someone answers or acts.',
    workedExample:
      'A survey about screen-time habits that is titled "Excessive Phone Use and You" may cue participants to under-report their actual screen time; a neutral title like "Daily Habits Survey" reduces this cue.',
    designTable: [
      { label: 'Risky framing', value: 'Survey title/instructions reveal the hypothesis being tested' },
      { label: 'Mitigated framing', value: 'Neutral title, filler questions unrelated to the true hypothesis' },
      { label: 'What it prevents', value: 'Participants unconsciously answering to match perceived expectations' },
    ],
    pitfall:
      'Debriefing participants about the true hypothesis before data collection is finished (e.g., in a multi-session study) — this can leak the hypothesis to later sessions or other participants who talk to each other.',
    fieldRef: 'psychology-behavioral-science',
  },

  // ─── Replication & Sampling ───────────────────────────────────────────────
  {
    id: 'biological-replicates',
    title: 'Biological Replicates',
    category: 'Replication & Sampling',
    definition:
      'Biological replicates are separate, independent biological units (different plants, different animals, different bacterial cultures grown from separate starting colonies) that each undergo the full treatment and measurement process, capturing natural biological variability.',
    whenToUse:
      'Any biology-adjacent study — biological replicates are what let you generalize a finding beyond the one specific organism/sample you happened to test.',
    workedExample:
      'Testing a growth hormone on yeast: 3 biological replicates means 3 separate yeast cultures, each started from an independently grown colony, each treated and measured — not 3 samples pipetted from the same single culture.',
    designTable: [
      { label: 'Biological replicate', value: 'Independent culture/organism, started separately, treated independently' },
      { label: 'Minimum typical n', value: '3 biological replicates per condition is a common floor for a science-fair study' },
      { label: 'What it captures', value: 'True biological variability between independent organisms/cultures' },
    ],
    pitfall:
      'Reporting "n=3" without specifying whether that means 3 biological replicates or 3 technical replicates — these have very different implications for what the variability actually represents (see next entry).',
    fieldRef: 'molecular-cell-biology',
  },
  {
    id: 'technical-replicates',
    title: 'Technical Replicates',
    category: 'Replication & Sampling',
    definition:
      'Technical replicates are repeated measurements of the SAME biological/physical sample (e.g., pipetting the same solution into 3 wells, or re-weighing the same object 3 times), capturing measurement/instrument noise rather than true biological or physical variability.',
    whenToUse:
      'To characterize how much noise your measurement method itself contributes — useful alongside, but not a substitute for, biological/independent replicates.',
    workedExample:
      'Measuring the same protein solution\'s absorbance 3 times in 3 different cuvette wells to check instrument/pipetting precision — this tells you about measurement noise, not about how the protein concentration varies between different samples.',
    designTable: [
      { label: 'Technical replicate', value: 'Same sample, measured multiple times' },
      { label: 'Captures', value: 'Instrument/procedure noise only' },
      { label: 'Does NOT capture', value: 'True variability between independent samples/organisms' },
    ],
    pitfall:
      'Pseudoreplication — treating technical replicates as if they were independent biological replicates when reporting sample size, which artificially inflates statistical confidence (see pseudoreplication entry).',
    fieldRef: 'molecular-cell-biology',
  },
  {
    id: 'pseudoreplication',
    title: 'Pseudoreplication',
    category: 'Replication & Sampling',
    definition:
      'Pseudoreplication occurs when repeated measurements that are not truly independent (e.g., multiple leaves from one plant, multiple readings from one instrument run) are treated statistically as if they were independent samples, artificially inflating the apparent sample size and understating true uncertainty.',
    whenToUse:
      'Check for this whenever your "n" includes any measurements taken from the same underlying unit — the true n is the number of independent units, not the number of individual readings.',
    workedExample:
      'A study measuring leaf size on 5 plants, taking 4 leaf measurements per plant, incorrectly reports "n=20" — the true independent sample size is n=5 plants; the 4 leaves-per-plant are pseudoreplicates that should be averaged per plant first.',
    designTable: [
      { label: 'Wrong (pseudoreplicated)', value: 'n = 20 (5 plants × 4 leaves), treated as 20 independent data points' },
      { label: 'Correct', value: 'n = 5 (plants); average the 4 leaf measurements per plant into one plant-level value first' },
      { label: 'Why it matters', value: 'Statistical tests assume independence — pseudoreplication overstates confidence' },
    ],
    pitfall:
      'Running a statistical test directly on raw pseudoreplicated data instead of first collapsing repeated/nested measurements to one value per independent unit.',
    fieldRef: 'ecology',
  },
  {
    id: 'sample-size-planning',
    title: 'Sample-Size / Replicate-Count Planning',
    category: 'Replication & Sampling',
    definition:
      'Sample-size planning is deciding, before data collection, how many independent replicates per condition are needed to have a reasonable chance of detecting the effect you predict, if it is really there — balancing statistical power against time, cost, and material constraints.',
    whenToUse:
      'During planning, right after choosing the IV levels and DV — deciding sample size after the fact (once you see how the data looks) risks unconsciously stopping early when results look favorable.',
    workedExample:
      'A student expects fertilizer to increase plant height by roughly 20%, with typical plant-to-plant height variability of about 10%. Reasoning: a moderate expected effect relative to natural variability suggests at least 8–10 plants per group are needed to see the difference clearly above the noise; the student settles on n=10 per group given greenhouse space limits.',
    designTable: [
      { label: 'Expected effect size', value: '~20% height increase from fertilizer' },
      { label: 'Natural variability', value: '~10% plant-to-plant height variation observed in a pilot batch' },
      { label: 'Reasoning', value: 'Effect notably larger than noise → moderate sample size (n=10/group) should reveal it' },
      { label: 'Chosen n', value: '10 plants per group (30 total across 3 groups), given greenhouse space limits' },
    ],
    pitfall:
      'Picking a round number like "n=10" with no stated reasoning at all — judges specifically look for SOME justification (a pilot estimate, a resource constraint stated explicitly, or a power consideration), even an approximate one.',
  },
  {
    id: 'increasing-n-vs-repeating-trials',
    title: 'Increasing Sample Size vs. Repeating the Whole Study',
    category: 'Replication & Sampling',
    definition:
      'Increasing n means adding more independent replicates within the same study (more plants, more trials) to reduce the effect of individual variability on the mean; repeating the whole study means running the entire experiment again, often to check the finding holds up on a fresh sample — these serve different purposes.',
    whenToUse:
      'Increase n when you are worried a single run\'s sample size is too small to detect a real effect; repeat the whole study when you want to confirm a surprising or borderline result before trusting it.',
    workedExample:
      'A pilot study with n=5 plants per group shows a promising but noisy trend. The student both increases n to 12 per group for the main study AND, given a striking result, repeats the full 12-per-group study a second time in a new growing season to check the finding replicates.',
    designTable: [
      { label: 'Increase n', value: 'n: 5 → 12 per group, same single study, reduces noise around the mean' },
      { label: 'Repeat the study', value: 'Full 12-per-group study run again in a new season, checks the effect reproduces' },
      { label: 'Different purposes', value: 'Increasing n improves precision; repeating checks reproducibility/generalizability' },
    ],
    pitfall:
      'Treating a single large-n study as automatically "proven" without any independent repeat — a large sample reduces noise but does not rule out a systematic, study-wide confound that a repeat under different conditions could reveal.',
  },
  {
    id: 'pilot-study',
    title: 'Running a Pilot Study',
    category: 'Replication & Sampling',
    definition:
      'A pilot study is a small-scale trial run of the full procedure before the main study, used to check that the method works as intended, estimate rough variability for sample-size planning, and catch practical problems (equipment, timing, unclear instructions) early and cheaply.',
    whenToUse:
      'Before committing significant time/material to the full-scale study, especially when the procedure is new, involves a novel instrument, or the expected variability is unknown.',
    workedExample:
      'Before running a 30-plant fertilizer study, a student first runs a 6-plant pilot over 2 weeks to confirm the watering procedure is practical, the height-measurement method is repeatable, and to get a rough estimate of plant-to-plant height variability for sample-size planning.',
    designTable: [
      { label: 'Pilot scale', value: '6 plants (small fraction of planned 30-plant main study)' },
      { label: 'What it checks', value: 'Procedure feasibility, measurement repeatability, rough variability estimate' },
      { label: 'Feeds into', value: 'Sample-size planning and procedure refinement for the main study' },
    ],
    pitfall:
      'Including pilot-study data in the final reported results — a pilot is for refining the method, not for padding the sample size of the main study, unless the exact same protocol was used and that inclusion is stated explicitly.',
  },

  // ─── Confounds & Validity ─────────────────────────────────────────────────
  {
    id: 'confounding-variable',
    title: 'Confounding Variable',
    category: 'Confounds & Validity',
    definition:
      'A confounding variable is a factor other than the IV that changes systematically alongside the IV and independently affects the DV, making it impossible to tell whether the IV or the confound caused the observed effect.',
    whenToUse:
      'Check for potential confounds while designing the study (best case) or when interpreting a surprising result (damage control) — either way, naming plausible confounds strengthens the credibility of a conclusion.',
    workedExample:
      'A study compares plant growth in a "sunny windowsill" group vs. a "shaded desk" group and attributes the difference to light. But the windowsill is also warmer than the desk — temperature is confounded with light, so the true cause of the growth difference cannot be isolated.',
    designTable: [
      { label: 'Intended IV', value: 'Light exposure (sunny vs. shaded location)' },
      { label: 'Hidden confound', value: 'Ambient temperature (windowsill is warmer than desk)' },
      { label: 'Fix', value: 'Control temperature separately, e.g., use a grow light at a controlled ambient temp instead of natural windowsill placement' },
    ],
    pitfall:
      'Only checking for confounds you already suspect — a confound is dangerous precisely because it is not always obvious; systematically listing every uncontrolled difference between groups is the safeguard.',
  },
  {
    id: 'internal-vs-external-validity',
    title: 'Internal vs. External Validity',
    category: 'Confounds & Validity',
    definition:
      'Internal validity is confidence that the IV, not a confound, actually caused the observed change in the DV within this study. External validity is confidence that the finding generalizes beyond this specific study\'s conditions (other populations, settings, or times).',
    whenToUse:
      'When writing the discussion/limitations section — a strong controlled lab study often has high internal validity but limited external validity (it may not generalize to real-world conditions), and vice versa for field studies.',
    workedExample:
      'A tightly controlled greenhouse fertilizer study (constant temperature, controlled watering) has strong internal validity — the fertilizer effect is clearly isolated — but limited external validity, since real outdoor gardens have variable weather the greenhouse does not capture.',
    designTable: [
      { label: 'High internal validity', value: 'Tightly controlled greenhouse conditions isolate the fertilizer effect cleanly' },
      { label: 'Limited external validity', value: 'Findings may not directly transfer to variable outdoor garden conditions' },
      { label: 'Trade-off', value: 'More control (internal validity) often costs some real-world generalizability (external validity)' },
    ],
    pitfall:
      'Claiming a tightly controlled lab result generalizes broadly to real-world conditions without acknowledging the trade-off — overclaiming external validity is a common presentation weakness.',
  },
  {
    id: 'selection-bias',
    title: 'Selection Bias',
    category: 'Confounds & Validity',
    definition:
      'Selection bias occurs when the way subjects or samples are chosen makes the study group systematically unrepresentative of the population you intend to draw conclusions about, so results may reflect the selection method rather than a true effect.',
    whenToUse:
      'Whenever recruiting participants or choosing samples — think through whether the selection method could correlate with the outcome being measured.',
    workedExample:
      'A survey about exercise habits posted only in a school gym class group chat will oversample students who already exercise regularly, biasing the sample toward higher activity levels than the general student body.',
    designTable: [
      { label: 'Biased selection', value: 'Recruiting only from a gym-class group chat' },
      { label: 'Consequence', value: 'Sample skews toward already-active students' },
      { label: 'Mitigation', value: 'Recruit from a broader, more representative pool (e.g., whole-school announcement, random homeroom sampling)' },
    ],
    pitfall:
      'Recruiting a "convenience sample" (whoever is easiest to reach) and treating the results as if they represent a much broader population without acknowledging the mismatch.',
  },
  {
    id: 'observer-bias',
    title: 'Observer Bias',
    category: 'Confounds & Validity',
    definition:
      'Observer bias happens when the person recording or interpreting a measurement unconsciously lets their expectations influence what they record, especially for subjective or borderline measurements — distinct from demand characteristics, which affects the subject rather than the observer.',
    whenToUse:
      'Any measurement involving a judgment call (e.g., scoring a behavior as "aggressive" or not, deciding if a color-change endpoint has been reached) — this is exactly the situation blinding is designed to prevent.',
    workedExample:
      'A researcher who knows which mice received a "calming" treatment might unconsciously score their behavior as calmer on a subjective rating scale, compared to an observer who does not know group assignment.',
    designTable: [
      { label: 'Risk factor', value: 'Subjective rating scale + knowledge of group assignment' },
      { label: 'Mitigation', value: 'Blind the observer to group assignment (see double-blinding)' },
      { label: 'Related concept', value: 'Demand characteristics (bias in the subject, not the observer)' },
    ],
    pitfall:
      'Assuming observer bias only matters for human-subject studies — it applies equally to a student manually deciding which data points "look like" outliers before applying a formal rule.',
  },
  {
    id: 'regression-to-the-mean',
    title: 'Regression to the Mean',
    category: 'Confounds & Validity',
    definition:
      'Regression to the mean is the statistical tendency for an extreme measurement to be followed by a measurement closer to the average, simply due to natural variability — it can look like a treatment effect when subjects were selected because their first measurement was unusually extreme.',
    whenToUse:
      'Be alert to this whenever subjects are selected for a study specifically because of an extreme initial score or measurement (e.g., "the plants that grew slowest last week"), then re-measured after a treatment.',
    workedExample:
      'Selecting the 10 slowest-growing seedlings from a batch, applying a "growth booster," and finding they grew faster the next week could partly be regression to the mean (unusually slow growers tend to bounce back toward average) rather than a true booster effect — a control group of equally slow-growing, untreated seedlings is needed to separate the two.',
    designTable: [
      { label: 'Risk setup', value: 'Subjects selected because of an extreme (unusually low/high) initial measurement' },
      { label: 'What can mimic a treatment effect', value: 'Natural drift back toward the average on remeasurement' },
      { label: 'Fix', value: 'Include an untreated control group also selected for the same extreme initial trait' },
    ],
    pitfall:
      'Interpreting "improvement after treatment" in a group selected for an extreme starting value as proof the treatment worked, without a matched untreated comparison group to rule out regression to the mean.',
  },
  {
    id: 'novelty-effect',
    title: 'Novelty / Hawthorne Effect',
    category: 'Confounds & Validity',
    definition:
      'The novelty (or Hawthorne) effect is a temporary change in behavior or performance simply because subjects know they are being observed or are using something new, independent of any real effect of the treatment itself — effects that often fade once the novelty wears off.',
    whenToUse:
      'Studies where subjects are aware they are part of an experiment or are using an unfamiliar tool/app/device — consider whether an observed short-term effect might fade with longer exposure.',
    workedExample:
      'Students using a new study app show improved quiz scores in week 1, but the improvement could partly reflect excitement about the new tool rather than the app\'s actual teaching method — a longer study (multiple weeks) or a comparison app-vs-app design helps separate novelty from real effect.',
    designTable: [
      { label: 'Risk', value: 'Short-term study using a novel tool/method subjects know is being tested' },
      { label: 'Mitigation 1', value: 'Extend the study duration so novelty has time to fade' },
      { label: 'Mitigation 2', value: 'Compare against another equally "new" tool, not a no-tool baseline' },
    ],
    pitfall:
      'Running a short study on a brand-new tool and claiming a durable effect without checking whether performance holds up once the novelty of "being studied" or "using something new" fades.',
  },
  {
    id: 'maturation-and-history-threats',
    title: 'Maturation & History Threats',
    category: 'Confounds & Validity',
    definition:
      'Maturation is a natural change in subjects over time (growth, learning, aging) that would have happened regardless of treatment. History refers to an outside event occurring during the study (weather, a schedule change, a news event) that affects the DV independent of the treatment. Both can be mistaken for a treatment effect in before/after comparisons.',
    whenToUse:
      'Whenever a study measures the same subjects before and after a treatment over a long enough span that natural change or an outside event could plausibly occur.',
    workedExample:
      'A tutoring-program study measures the same students\' test scores before and after 3 months of tutoring. Scores may have improved partly from normal academic maturation over the school year (maturation) or from an unrelated schoolwide curriculum change (history), not solely the tutoring — an untreated comparison group experiencing the same time period rules both out.',
    designTable: [
      { label: 'Maturation risk', value: 'Natural improvement/change over the study\'s time span, treatment aside' },
      { label: 'History risk', value: 'An outside event during the study period affecting all subjects' },
      { label: 'Fix', value: 'Include a control group measured over the same time span, without the treatment' },
    ],
    pitfall:
      'Running a before/after study with no untreated comparison group over the same period — without one, maturation and history effects cannot be distinguished from a true treatment effect.',
  },

  // ─── Instruments & Measurement ────────────────────────────────────────────
  {
    id: 'instrument-choice',
    title: 'Choosing the Right Instrument',
    category: 'Instruments & Measurement',
    definition:
      'Instrument choice means selecting a measurement tool whose range, precision, and mechanism actually match what the DV requires — an instrument that is too coarse, too narrow in range, or measures a different (even if related) quantity will undermine the whole study regardless of how good the design is otherwise.',
    whenToUse:
      'While operationalizing the DV, before any data is collected — check the instrument\'s stated range and resolution against the expected range of your measurements.',
    workedExample:
      'Measuring mass changes of ~0.05g in a chemistry experiment requires an analytical balance with 0.001g resolution — a kitchen scale reading only to the nearest 1g cannot detect a 0.05g change at all, regardless of how careful the procedure is.',
    designTable: [
      { label: 'Expected effect size', value: '~0.05 g mass change' },
      { label: 'Wrong instrument', value: 'Kitchen scale, 1 g resolution — cannot detect the effect' },
      { label: 'Right instrument', value: 'Analytical balance, 0.001 g resolution — resolves the effect clearly' },
    ],
    pitfall:
      'Choosing an instrument based on availability rather than whether its resolution and range actually match the expected size of the effect being measured.',
    fieldRef: 'chemistry',
  },
  {
    id: 'precision-vs-accuracy',
    title: 'Precision vs. Accuracy',
    category: 'Instruments & Measurement',
    definition:
      'Precision is how close repeated measurements of the same thing are to each other (consistency); accuracy is how close a measurement is to the true value (correctness). An instrument can be precise but inaccurate (consistently wrong) or accurate on average but imprecise (scattered around the right value).',
    whenToUse:
      'When selecting and calibrating an instrument, and when reporting measurement quality in the write-up — these are two distinct properties and a study should address both.',
    workedExample:
      'A thermometer that reads 3 repeated measurements of boiling water as 97.2°C, 97.3°C, 97.1°C is precise (tightly clustered) but not accurate (true value at sea level is 100°C) — likely a calibration offset, distinct from a thermometer giving 95°C, 102°C, 98°C, which is imprecise but averages close to accurate.',
    designTable: [
      { label: 'Precise but inaccurate', value: '97.2, 97.3, 97.1°C — tightly clustered, but offset from true 100°C' },
      { label: 'Accurate but imprecise', value: '95, 102, 98°C — averages near 100°C, but widely scattered' },
      { label: 'Diagnosis', value: 'Precise-but-inaccurate suggests a fixable calibration offset' },
    ],
    pitfall:
      'Reporting only that repeated measurements were "consistent" (precision) as if that alone proves the measurement is correct (accuracy) — consistency does not rule out a systematic offset.',
  },
  {
    id: 'instrument-resolution',
    title: 'Instrument Resolution',
    category: 'Instruments & Measurement',
    definition:
      'Resolution is the smallest change in a quantity an instrument can reliably distinguish (e.g., a ruler with 1mm markings has 1mm resolution). If the expected effect size is smaller than the instrument\'s resolution, the effect cannot be reliably detected no matter how many trials are run.',
    whenToUse:
      'Before finalizing instrument choice — compare the instrument\'s resolution against the smallest meaningful difference the hypothesis predicts.',
    workedExample:
      'A study predicting a 0.3mm difference in plant stem diameter between treatments needs digital calipers with 0.01mm resolution — a standard ruler (1mm resolution) cannot reliably distinguish a 0.3mm difference.',
    designTable: [
      { label: 'Predicted effect', value: '~0.3 mm stem-diameter difference' },
      { label: 'Ruler resolution', value: '1 mm — too coarse to detect a 0.3 mm difference' },
      { label: 'Caliper resolution', value: '0.01 mm — resolves a 0.3 mm difference clearly' },
    ],
    pitfall:
      'Reporting a measured difference smaller than the instrument\'s stated resolution as if it were a real, meaningful finding rather than noise at or below the instrument\'s detection limit.',
  },
  {
    id: 'calibration-as-planning',
    title: 'Instrument Calibration (Planning Ahead)',
    category: 'Instruments & Measurement',
    definition:
      'Calibration is checking an instrument against a known reference standard before (and sometimes during) data collection to correct for systematic offset or drift — planned as part of the procedure, not an afterthought applied only if results look "off."',
    whenToUse:
      'Before the first real measurement session, and again at intervals during a multi-day or multi-week study if instrument drift is plausible (e.g., a pH meter, a scale, a light sensor).',
    workedExample:
      'Before starting a two-week water-quality study, a student calibrates the pH meter using two certified buffer solutions (pH 4.0 and pH 7.0) each morning before taking field readings, per the meter\'s manual — logging the calibration reading each day as part of the procedure.',
    designTable: [
      { label: 'Reference standards used', value: 'Certified pH 4.0 and pH 7.0 buffer solutions' },
      { label: 'Frequency', value: 'Once each morning before that day\'s measurements' },
      { label: 'Logged', value: 'Calibration reading and any correction applied, recorded alongside the data' },
    ],
    pitfall:
      'Calibrating only once at the very start of a multi-week study and assuming the instrument stays accurate throughout — many instruments (pH meters, sensors) drift and need periodic recalibration.',
    fieldRef: 'environmental-earth-science',
  },
  {
    id: 'instrument-sensitivity-and-range',
    title: 'Sensitivity & Range Limits',
    category: 'Instruments & Measurement',
    definition:
      'Sensitivity is how much output change an instrument produces per unit of input change; range is the span of values it can measure at all before saturating (maxing out) or failing to register (floor effect). Both must comfortably bracket the values you actually expect to measure.',
    whenToUse:
      'When planning the expected range of your DV — check that the instrument\'s rated range comfortably covers the full expected span, with margin at both ends, not just the middle.',
    workedExample:
      'A light sensor rated for 0–1000 lux is a poor match for a full-sun outdoor study expected to reach 50,000+ lux — readings will saturate (max out) at the top of the expected range, flattening real differences between bright conditions.',
    designTable: [
      { label: 'Sensor range', value: '0–1,000 lux' },
      { label: 'Expected values', value: 'Up to 50,000+ lux outdoors in full sun' },
      { label: 'Problem', value: 'Sensor saturates well below the expected range, losing real variation at high light levels' },
    ],
    pitfall:
      'Checking an instrument\'s range against the average expected value only, without checking the extremes — a range that comfortably covers the mean can still saturate or floor at the tails of your expected data.',
    fieldRef: 'optics-photonics',
  },
  {
    id: 'standardized-measurement-protocol',
    title: 'Standardized Measurement Protocol',
    category: 'Instruments & Measurement',
    definition:
      'A standardized measurement protocol is a written, fixed procedure specifying exactly how, when, and under what conditions a measurement is taken (e.g., always measure stem height from soil line to the tallest leaf tip, at the same time of day), so that every measurement across the whole study is taken the same way regardless of who takes it.',
    whenToUse:
      'Written down before data collection begins, especially in any study where more than one person will be taking measurements, or measurements span multiple sessions/days.',
    workedExample:
      'A plant-height protocol specifies: "Measure from the soil surface to the tip of the tallest leaf, with the plant unstretched, using a rigid ruler, between 2–4pm each measurement day, by the same trained measurer each time." This removes ambiguity about where exactly "height" is measured from.',
    designTable: [
      { label: 'Measured from', value: 'Soil surface to tallest leaf tip, plant unstretched' },
      { label: 'Time window', value: '2–4pm each measurement day (controls for daily plant posture changes)' },
      { label: 'Measurer', value: 'Same trained person each session, to reduce inter-observer variation' },
    ],
    pitfall:
      'Leaving the measurement procedure informally understood ("just measure how tall it is") rather than written down explicitly — informal procedures drift subtly between sessions or between different people taking measurements.',
    fieldRef: 'plant-science-agriculture',
  },
  {
    id: 'measurement-timing-consistency',
    title: 'Measurement Timing Consistency',
    category: 'Instruments & Measurement',
    definition:
      'Measurement timing consistency means taking measurements at the same time of day, same interval, or same stage of a process across all conditions, since many biological and physical quantities naturally fluctuate on a cycle (daily, seasonal, or reaction-stage) independent of the treatment being tested.',
    whenToUse:
      'Whenever the DV is known or suspected to fluctuate on a predictable cycle (body temperature, plant turgor, reaction rate as it approaches equilibrium) and measurements are spread across multiple sessions.',
    workedExample:
      'A study measuring human reaction time is run at 9am for some participants and 4pm for others, but reaction time naturally varies with the time-of-day circadian cycle — without holding testing time consistent, the confound is timing, not the true experimental manipulation.',
    designTable: [
      { label: 'Cyclic factor', value: 'Circadian variation in alertness/reaction time across the day' },
      { label: 'Inconsistent approach (bad)', value: 'Some participants tested 9am, others 4pm' },
      { label: 'Consistent approach', value: 'All participants tested within the same 1-hour window' },
    ],
    pitfall:
      'Scheduling data collection purely around convenience (whenever a subject/participant happens to be available) without checking whether the DV is known to fluctuate with time-of-day or process stage.',
  },
]

// ─── Filtering helper ─────────────────────────────────────────────────────

/**
 * Filters `METHODS` (or any subset) by a case-insensitive substring match on
 * title/definition, AND-ed with an optional category. A blank or
 * whitespace-only query behaves like "no query." Pure and side-effect free —
 * unit-testable and reusable by the panel component via `useMemo`. Thin
 * wrapper over `filterGuideEntries`, kept so this module's positional
 * signature — and that it searches ONLY title+definition (its entries have
 * no aliases field) — stays pinned. Mirrors `filterPlots` in `plot-guide.ts`.
 */
export function filterMethods(query: string, category: string | null): MethodConcept[] {
  return filterGuideEntries(
    METHODS,
    { query, category },
    (m) => [m.title, m.definition],
    (m) => m.category,
  )
}
