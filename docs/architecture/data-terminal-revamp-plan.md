# Data Terminal Revamp — Implementation Plan

> Status: **phases A–F built and E2E-green** (2026-07-29, uncommitted). The
> `Experiment`/`Measurement` retirement (backfill + guarded drop) is done; the old
> models, routes, and components are gone and the momentum/teacher reads repointed
> to `Dataset`. Sheets mode (recharts + Excel trendlines), Code mode (Pyodide
> worker + sandbox), Lab mode (~26 analyses across every table type, nonlinear
> regression + equation library + global fitting §5.1), and figure craft
> (Format Axes/Graph, significance brackets, multi-panel A/B/C posters, DPI
> PNG/SVG/PDF export, "Open in Code mode" bridge, Charts Guide recipe templates,
> showcase attachment) are all in. Every §6 acceptance criterion is met and
> covered by the `e2e/data-terminal-*` specs (31 tests). All six pipeline gates
> pass; full unit suite green. Not committed / no PR — awaiting review. Docs
> (SPEC/architecture/CHANGELOG) still need updating for B–F.

## Goal

Replace the current x/y experiment tracker with a real data-analysis workbench,
and make the paid-software workflow free. A team brings a CSV (or types data in)
and then **chooses the tool they want to work in** — three lanes over one
dataset, all open to everyone, no unlock gating:

| Lane | Models | Powered by | Artifact |
|---|---|---|---|
| **Sheets mode** | Excel / Google Sheets | JavaScript, no Python | quick interactive chart |
| **Lab mode** | GraphPad Prism / OriginPro | Python (scipy, statsmodels) + matplotlib | publication figure + analysis results |
| **Code mode** | matplotlib | Python in the browser | a script the student owns |

The lanes are a ladder, not silos: a chart built in Sheets or Lab mode can be
opened in Code mode as generated matplotlib. One direction only — parsing edited
code back into a GUI is out of scope forever.

## Why these three, and what we are actually copying

The feature lists of Prism and Origin are not the interesting part; the
mechanisms are.

**From Prism — the table type gates everything.** You choose XY / Column /
Grouped / Contingency / Nested *before* entering data, and that choice determines
which analyses the Analyze dialog offers and which graph families are available.
This is the accessibility mechanism: a student produces a correct grouped bar
chart with SEM error bars without knowing what SEM is, because the table
structure carried the information. Free tools hand you a blank chart config and
let you make invalid choices in silence. **Replicate this exactly.**

**From Prism — replication lives in the data structure.** Y columns hold
replicate subcolumns, or Mean/SD/N, or Mean/SEM/N. Error bars are derived, never
configured. Declaring replicates-vs-independent-samples in the table is the wall
that catches pseudoreplication — measuring one plant three times is not n=3 —
which is the most common science-fair statistics error and which the existing
Data Quality guide already teaches.

**From Prism — analyses are live-linked objects, not one-shot output.** Data
table → Results sheet → Graph. Edit a datum, everything recomputes.

**From Prism — the fitting engine.** A domain-organized equation library,
initial values expressed as functions of the data (why Prism converges where a
naive `curve_fit` does not), constraints including parameters *shared across
datasets* (global fitting), and output that goes past best-fit values into model
comparison and adequacy tests.

**From Prism — multiple comparisons done honestly.** You choose *which*
comparisons and get the matching correction, rather than running every pairwise
t-test and reporting the one that worked.

**From Origin — column designations** (X, Y, yErr, xErr, Group, Label) that drive
plotting directly, and **per-column formulas** (Set Values: `=col(A)*2`).

**From Origin — the recalculation chain**, and **the layer model** for insets,
double-Y, and stacked multi-panel plots.

**From Excel — time-to-first-chart.** Select columns, click a chart type, done.
Neither Prism nor Origin clears that bar; Sheets mode must.

**Deliberately not cloned:** 3D / ternary / polar / Smith charts, batch-processing
hundreds of files, peak deconvolution, survival analysis (rare at fair level),
Origin's LabTalk scripting language (Code mode *is* the scripting story).

## Where scienium is better

1. **Analysis results open the actual curriculum.** Prism links to a static
   checklist page. scienium already owns 65 stats concepts with worked examples
   and verified Python, 45 methods concepts, and 36 data-quality concepts. Every
   results sheet can open the matching entry inline, with assumptions restated
   against *this* dataset's n, normality, and replicate structure. Content is
   already authored. Zero LLM cost.
2. **Every GUI chart can become code the student keeps.** Prism output dies with
   the license.
3. **The 250 Charts Guide recipes become templates.** Each already carries
   structured `dataNeeded: {name, unit}[]` and a reference rendering — "start
   from this recipe" tells a team which columns to collect and prefills the
   builder.
4. **Model comparison and honest reporting are default, not opt-in.**
5. **Free, in a browser, on a Chromebook, team-shared, teacher-visible.**

---

## 1. Shared spine — the data model

All three lanes read and write one dataset. Replaces `Experiment` /
`Measurement` entirely; two data homes would be exactly the patchwork the house
rules forbid.

```prisma
model Dataset {
  id             String   @id @default(cuid())
  teamId         String   @map("team_id")
  name           String
  tableType      TableType @default(xy) @map("table_type")
  sourceFilename String?  @map("source_filename")
  columns        Json     // ColumnSpec[]
  rows           Json     // (string | number | null)[][]
  rowCount       Int      @map("row_count")
  createdByUserId String  @map("created_by_user_id")
  // + createdAt / updatedAt, @@index([teamId, createdAt])
}

model Analysis {   // Prism's results sheet — re-runs from source, never baked
  id        String @id @default(cuid())
  datasetId String @map("dataset_id")
  kind      String // 'descriptive' | 'ttest' | 'anova' | 'nonlinear-fit' | ...
  spec      Json   // inputs: which columns, options, constraints
  result    Json?  // cached last run, invalidated when the dataset changes
}

model Chart {
  id         String  @id @default(cuid())
  datasetId  String  @map("dataset_id")
  analysisId String? @map("analysis_id")   // e.g. a fit curve to overlay
  lane       ChartLane   // sheets | lab | code
  spec       Json        // sheets/lab: the builder spec; code: unused
  code       String?     // code lane: the student's script
}
```

`ColumnSpec`:

```ts
{
  name: string
  unit?: string
  type: 'number' | 'text' | 'date'
  role: 'x' | 'y' | 'yErr' | 'xErr' | 'group' | 'label' | 'ignore'
  subcolumnOf?: string   // replicate subcolumns (Prism's Y1/Y2/Y3)
  formula?: string       // Origin's Set Values, e.g. "=log10(col(B))"
}
```

**Rows as jsonb, not a row-per-point table.** Nothing ever queries *inside* the
data; it is fetched whole and analyzed whole. This deletes the entire
`Measurement` machinery.

**Caps**, reusing the existing `lockAggregate` refuse-at-write pattern in
[`lib/data-terminal/caps.ts`](../../apps/web/lib/data-terminal/caps.ts): ~50
datasets/team, 5,000 rows × 40 columns, ~2 MB serialized payload. Refused at
write with a 409, never truncated at read.

**Migration.** Each existing `Experiment` becomes a 4-column XY `Dataset`
(xLabel, yLabel, series → group, note → label); each `Measurement` becomes a row.
One script, `Experiment`/`Measurement` dropped after. Must be verified against
`devuser1`/`devlab` data.

**CSV import** parses client-side by generalizing `parseDelimited` in
[`csv.ts`](../../apps/web/lib/data-terminal/csv.ts) from fixed x/y to N columns.
That reader already handles RFC-4180 quoting, embedded newlines, tab-vs-comma
detection, and formula-injection escaping on export. Reuse it; add no CSV
dependency. No S3 — these are small enough to POST as JSON.

**Column formulas** evaluate in TypeScript (a small expression evaluator over
column arrays: arithmetic, `log10/ln/exp/sqrt/abs`, `mean/sd/min/max`, `col(X)`),
so Sheets mode never needs Python. Per-*cell* Excel formulas are the rabbit hole
and are deferred until something concretely needs them.

## 2. Table types and what they gate

Chosen at dataset creation, changeable later with a warning. Survival is deferred.

| Table type | Data shape | Analyses offered | Graph families |
|---|---|---|---|
| **XY** | X continuous (time, dose, conc, temp); Y columns = datasets, subcolumns = replicates | linear regression, correlation, **nonlinear regression**, interpolate-a-standard-curve, area under curve, smoothing | scatter ± connecting line, error bars, fit curve + CI band, log/log-log axes |
| **Column** | one group per column, values are independent replicates | descriptive stats, normality, one-sample/unpaired/paired t, Mann–Whitney, Wilcoxon, **one-way ANOVA + multiple comparisons**, Kruskal–Wallis | scatter-with-mean-SD, bar + error, box-whisker (Tukey / min–max / 10–90), violin, before–after |
| **Grouped** | two grouping factors (rows × column groups) | **two-way ANOVA** (± repeated measures), comparisons within/between factors | interleaved / stacked / separated bars, grouped scatter, heatmap |
| **Contingency** | counts in categories | chi-square, Fisher's exact, relative risk, odds ratio | stacked bar of proportions |
| **Nested** | replicates nested in groups (3 leaves × 4 plants) | **nested t test, nested one-way ANOVA** | nested scatter with group means |
| **Parts of whole** | one column summing to a whole | fraction-of-total | pie, donut, stacked bar |
| **Multiple variables** | one row per subject, one column per variable | correlation matrix, multiple regression | scatter matrix, correlation heatmap |

**Contingency and Nested are not optional.** Surveys are a large fraction of
science-fair projects, and Nested is the table that makes pseudoreplication
visible instead of silently wrong.

## 3. Lane 1 — Sheets mode

Instant, interactive, **zero Python**. This is the lane most students will use,
and it must keep working on a school network where WASM is blocked.

- Editable grid over the shared dataset; column formulas; add/delete/reorder
  columns; paste from a spreadsheet.
- Select columns → chart type: column/bar, line, scatter, area, pie.
- Options: title, axis titles, legend on/off, colors, gridlines, axis min/max,
  log scale, data labels.
- Error bars from a column, or ±SD / ±SEM / ±% / fixed.
- **Excel's exact trendline set**: linear, logarithmic, polynomial (order 2–6),
  power, exponential, moving average — each with *display equation* and
  *display R²*. All closed-form least squares, a few dozen lines of TypeScript,
  no scipy.
- Export PNG + CSV.

Renderer: recharts, already a dependency. Box plots, violins, and fit confidence
bands are **not** in this lane — that is what Lab mode is for.

## 4. Lane 3 — Code mode (build before Lab mode)

A matplotlib editor with the active dataset preloaded. Thin on top of the Python
harness, which is Lab mode's hardest dependency — so building it second ships
something real while de-risking phase D/E.

- Monospace `<textarea>` (no syntax-highlighting dependency until it hurts), Run,
  figure output, stdout/stderr panel, save script per chart, download `.py`.
- Dataset injected as numpy arrays and a pandas DataFrame; column names match the
  grid.
- Figures rendered with the Agg backend into an in-memory buffer, bytes
  transferred back as SVG (display) and PNG/PDF (export).

**Runtime: Pyodide in a Web Worker.** Server-side Python is permanently off the
table — sandboxing untrusted student code on our infrastructure is a security
project, not a feature. In the browser it is the student's own tab, no per-run
cost, and it scales for free.

**Payload** (uncompressed, roughly): pyodide core ~10 MB, numpy ~8 MB,
matplotlib ~11 MB, pandas ~12 MB, scipy ~25 MB, statsmodels ~10 MB. Code mode
needs ~30 MB; Lab mode pulls the rest **per analysis type, on demand**. Sheets
mode pulls none of it. Load once per session, cached after.

**Hosting decision — serve the wheels from the existing R2 bucket.** jsDelivr is
fastest but breaks behind school firewalls and widens CSP; bundling into
`public/` bloats the deploy. R2 costs one `connect-src` entry.

**CSP change required.** [`next.config.mjs`](../../apps/web/next.config.mjs)
already has `worker-src 'self' blob:`, but production `script-src` lacks
`'wasm-unsafe-eval'`, so WASM will not instantiate today. Single-threaded Pyodide
does **not** need SharedArrayBuffer, so COOP/COEP stay as they are.

**Sandbox rules — designed in from the start, not bolted on.** A saved script is
team-shared, so it runs in a *teammate's* browser:

- Worker only; no DOM handle, no access to the page or to Clerk's session.
- Network blocked inside the worker (no `pyodide.http`, no `js.fetch` bridge).
- Hard wall-clock timeout with `worker.terminate()`.
- stdout/stderr size cap and a figure-count cap.
- No arbitrary `pip install` — only the preloaded wheel set.

## 5. Lane 2 — Lab mode

The largest phase by far. Math in Python; figures in matplotlib, which gives box
plots, violins, fit confidence bands, offset and broken axes, and 300 dpi
PDF/SVG for free rather than as a recharts rebuild.

### Analyze dialog
Gated by table type (§2), with dataset checkboxes for which columns to include —
Prism's shape exactly.

### Nonlinear regression — the equation library
Organized by domain, not by math, and mapped onto the Charts Guide's 29 fields
where possible.

- **Lines** — straight line, through origin, with x-intercept, segmental (two-phase) linear
- **Polynomial** — order 2–4
- **Exponential** — one-phase decay, one-phase association, two-phase decay, plateau-then-decay, exponential growth *(cooling curves, capacitor discharge, radioactivity, bacterial growth)*
- **Dose–response** — log(agonist) vs response (3-param EC50), variable slope (4-param Hill), log(inhibitor) vs response IC50, EC50 shift *(fertilizer, caffeine, drug, concentration studies)*
- **Enzyme kinetics** — Michaelis–Menten, substrate inhibition, allosteric sigmoidal; Lineweaver–Burk offered as a *display transform only*, with the caveat that fitting on it is wrong — a built-in teaching moment
- **Binding** — one-site specific binding, one-site with Hill slope
- **Growth** — logistic, Gompertz *(population and plant-growth-over-time — very common at fair level)*
- **Peaks** — Gaussian, sum of two Gaussians, Lorentzian *(spectra)*
- **Oscillation** — sine, damped sine *(pendulum, circadian, vibration)*
- **Power / scaling** — `y = a·x^b`, inverse square *(allometry, light intensity)*
- **User-defined** — free-text equation with a declared parameter list

Each equation carries **initial-value rules expressed as functions of the data**
(`EC50 = median(X)`, `Top = max(Y)`), which is the difference between converging
and not.

**Constraints:** fix a parameter to a constant, constrain to a range, or **share
it across datasets — global fitting** (§5.1).

**Fit output:** best-fit ± SE, 95% CI, R², adjusted R², Sy.x (RMSE), df,
**extra-sum-of-squares F test and AICc for model comparison**, replicates test
and runs test for model adequacy, residual plot, ROUT outlier identification,
weighting (none, 1/Y², 1/Y, 1/SD², Poisson), and **interpolate unknowns from a
standard curve with CIs** — the ELISA / calibrated-probe workflow, directly
relevant to any assay or sensor project.

### 5.1 Global fitting — how it works

The hardest math in the plan, specified here so phase E is not open-ended.

**The idea.** K datasets are fit *simultaneously* against one model, where some
parameters are shared across all datasets and others vary per dataset. Four
dose–response curves under a 4-parameter logistic, sharing `Top`, `Bottom` and
`HillSlope` but not `logEC50`, cost 7 parameters instead of 16 — tighter CIs, and
it makes "is the EC50 actually different between treatments?" a testable
hypothesis rather than an eyeball comparison.

**The mechanism.** Build a flat vector `θ` of only the *unique* parameters, plus
a map from (dataset k, local parameter j) → index into `θ`:

```
θ   = [Top, Bottom, Hill, logEC50₁, logEC50₂, logEC50₃, logEC50₄]
map = [[0,1,2,3], [0,1,2,4], [0,1,2,5], [0,1,2,6]]
```

Stack all datasets into one x/y vector with an index of which rows belong to
which dataset, and define one residual function that gathers each dataset's
parameters through the map:

```python
def residuals(theta):
    out = np.empty(len(Y_all))
    for k in range(K):
        m = idx == k
        out[m] = (model(X_all[m], *theta[param_map[k]]) - Y_all[m]) * w[m]
    return out

res = least_squares(residuals, theta0, method='trf', bounds=(lo, hi))
```

`least_squares`, not `curve_fit` — we need the raw residual vector and
per-parameter bounds. `curve_fit` is a thin wrapper over it anyway.

**Six details that separate correct from merely running:**

1. **Seeding.** Fit each dataset independently first (cheap), then seed shared
   parameters with the mean of those estimates and local parameters with their
   own. This is the difference between converging and not, and it subsumes the
   per-equation initial-value rules for the global case.
2. **SE and CIs from the Jacobian at the solution** — `cov = inv(JᵀJ)·s²` with
   `s² = 2·res.cost/dof`, `dof = m − p`, `CI₉₅ = θ ± t₀.₉₇₅(dof)·SE`. Use an SVD
   pseudo-inverse when `JᵀJ` is near-singular (over-sharing causes exactly this)
   and **report the rank deficiency as an ambiguous parameter** rather than
   emitting confident garbage. Prism's behaviour, and the honest one.
3. **Weighting is applied per point before stacking**, or the dataset with the
   largest Y magnitude silently dominates the joint fit.
4. **Three states per (dataset, parameter): shared / separate / fixed.** Fixed
   parameters never enter `θ`; they are substituted at gather time from a
   constants array. Range constraints are just `least_squares`'s `bounds`.
5. **The extra-sum-of-squares F test is the point.** Fit twice — null model
   sharing the parameter, alternative letting it vary — then
   `F = ((SS_null − SS_alt)/Δdf) / (SS_alt/df_alt)`, `p = 1 − F.cdf(...)`. Report
   AICc alongside for non-nested comparisons.
6. **Non-convergence is reported loudly.** `res.status`/`res.success` gate the
   whole result; never show best-fit values from a failed run.

**UI.** One table: a row per parameter of the chosen equation, a three-way
selector (shared across datasets / separate for each / fixed to a value), and
optional bounds. No wizard.

**Effort.** The optimizer core is ~120 lines of Python. The real work is the
constraint UI and honest failure reporting, not the math.

### Multiple comparisons
Choose *which* comparisons (all pairs, vs a control, selected pairs, trend), get
the matching correction: Tukey (`scipy.stats.tukey_hsd` /
`statsmodels.pairwise_tukeyhsd`), Dunnett (`scipy.stats.dunnett`), Šídák /
Holm–Šídák / Bonferroni / FDR (`statsmodels.multipletests`). Dunn's nonparametric
test is in neither — implement it (~25 lines of rank sums) rather than add
`scikit-posthocs`.

### Figure craft
Format Graph per dataset (symbol shape/size/fill, line style, error-bar
direction); Format Axes (range, major/minor ticks, log10/log2/ln, offset axes,
broken axes, extra ticks at named values, per-dataset secondary Y);
**significance brackets generated from the multiple-comparisons result**;
**multi-panel layouts with A/B/C labels** — a poster board is the deliverable of
a science fair, so layout is a shipping requirement, not polish. Export
PNG/SVG/PDF at chosen DPI.

### Guide integration
Every results sheet links the matching Stats Guide entry and shows an assumptions
checklist assembled from the Methods and Data Quality guides, evaluated against
the actual data. This is the feature Prism cannot match.

---

## 6. Phasing and acceptance criteria

| Phase | Scope | Size |
|---|---|---|
| **A** ✅ | Data spine: `Dataset` model, grid, column roles + formulas, CSV import/export, caps. *(Backfill + drop of `Experiment`/`Measurement` still outstanding.)* | M |
| **B** | Sheets mode: JS charts + Excel trendline set + error bars + export | M |
| **C** | Python harness + Code mode: worker, R2 wheels, CSP, sandbox limits, editor, run, save, download | M |
| **D** | Lab mode I: table types, gated Analyze dialog, descriptive / t / ANOVA / nonparametric / chi-square + multiple comparisons, results sheets + guide links, core matplotlib graph families | **XL** |
| **E** | Lab mode II: nonlinear regression, equation library, constraints, global fitting, model comparison, standard-curve interpolation, ROUT | **XL** |
| **F** | Figure craft: Format Axes/Graph, significance brackets, layouts, DPI export, "Open in Code mode" bridge, Charts Guide templates, showcase attachment | L |

**Acceptance criteria**

- **A** — a CSV with 8 mixed-type columns imports, renders in the grid, survives
  reload; a column formula recomputes on edit; write caps refuse at 409 under
  concurrent writes; every pre-migration experiment appears as a dataset with
  identical numbers.
- **B** — select two columns → bar chart in under a second with no network
  request for a runtime; a polynomial trendline displays its equation and R²
  matching a hand-computed value; PNG export opens.
- **C** — a script using numpy + matplotlib renders a figure; an infinite loop is
  terminated by the timeout and reports it; a script attempting a network call
  fails closed; a saved script re-runs identically for a teammate.
- **D** — a Column table offers t-test and ANOVA but **not** correlation; a
  Nested table's ANOVA produces a different (correct) n than treating replicates
  as independent, and links the pseudoreplication guide entry; a Tukey result
  matches a published worked example.
- **E** — a 4-parameter dose–response fit reproduces a known EC50 to published
  precision; a shared-parameter global fit across three datasets converges; the
  F-test correctly prefers the simpler model on data generated from it;
  standard-curve interpolation returns a value with a CI.
- **F** — a two-panel layout exports at 300 dpi with A/B labels; significance
  brackets match the comparison result; "Open in Code mode" produces a script
  whose figure matches the GUI figure.

---

## 7. Risks and open items

1. **Scope honesty.** This is five or six features, not one. Phases D and E are
   each larger than most things shipped so far. A/B/C alone is already a real
   product and should be treated as the pilot target.
2. **Pyodide on classroom hardware.** First load on a shared-wifi Chromebook will
   be felt. Mitigated by Sheets mode needing none of it and by on-demand wheel
   loading, but it needs measuring on real hardware before phase D commits.
3. **The CSP and hosting change** must land before any of phase C.
4. **Teammate-authored code runs in your browser.** Sandbox rules are phase-C
   design work, not later hardening.
5. **The recalculation chain** (dataset edit → invalidate analyses → redraw
   charts) is easy to get subtly wrong and is what makes the tool feel like an
   instrument rather than a chart wizard. Worth its own design pass in phase D.
6. **Global fitting** is the single hardest piece of math in the plan.
7. ~~Open question — does the data lane stay phase-gated?~~ **Decided: yes.**
   Datasets unlock exactly when the Experiments tab does today — the `working`
   phase, via the existing `data_terminal` feature gate in `lib/phase.ts`. No
   change to the gate, no change to SPEC §7.6's rule; only the noun changes
   (experiments → datasets). All five guides stay always-open, and all three
   *lanes* are ungated relative to each other.
8. **Gate impact** — phases A–C each need Vitest coverage for the pure layers
   (column formulas, spec→code generation, trendline math) and at least one
   Playwright spec; the E2E fixture needs a seeded dataset.
