/**
 * Lab-mode analysis templates — the TRUSTED Python that runs when a student
 * picks an analysis from the gated Analyze dialog (plan §5, Phase D1).
 *
 * These are OUR code, parameterized only by which columns/options the student
 * selected — NOT free-form user code — so this path is not the untrusted-code
 * threat surface the Code lane is. It still returns figures as inline SVG and
 * runs behind the same network neutralization; the worker only runs this after
 * loading scipy (the Lab package set), never for the lean Code lane.
 *
 * ONE source of truth: imported by BOTH the worker (pyodide.worker.ts) and the
 * Node correctness harness (scripts/analysis-smoke.mjs), so the templates the
 * smoke proves are byte-for-byte the templates the browser runs.
 *
 * ASCII-only on purpose: `check:integrity` scans authored source for control
 * bytes, and keeping the embedded Python plain ASCII removes any ambiguity
 * about how a `\u`/`±`/`—` survives the JS-template-literal -> Python hop.
 *
 * Contract — `_analyze(analysis_id, dataset, spec)` returns a JSON string:
 *   { stats: {k: number|string|null}, tables?: [...], figures: [svg],
 *     assumptions?: [{label, passed, detail}], error?: string }
 * Non-finite floats become null (NaN/Inf are invalid JSON and break JSON.parse).
 */

export const ANALYSES_PY = `
import io, json, math, traceback, base64
import numpy as np
import matplotlib
matplotlib.use('Agg')
# Deterministic SVG element ids: without a fixed hashsalt matplotlib salts every
# clip-path / marker id with a fresh uuid4 per render, so two renders of the SAME
# figure differ. Pinning it makes an un-formatted figure reproducible (only the
# metadata timestamp still varies), which is what lets F1 prove a default figure
# is unchanged and keeps exported bytes stable for the same spec.
matplotlib.rcParams['svg.hashsalt'] = 'scienium-dt'
import matplotlib.pyplot as plt
from scipy import stats

_BAR = '#4C78A8'
_PT = '#31333A'

# Figure-craft (Phase F1). None in the normal render path; set to a list by
# _export, in which case _svg keeps each finished figure ALIVE (instead of
# plt.close) so it can be re-rendered to PNG/SVG/PDF at a chosen dpi. The SVG
# bytes savefig writes are identical either way, so the on-screen figure and the
# exported one are the same spec (plan F: "keep the export identical to displayed").
_CAPTURE = None

def _fin(x):
    # A JSON-safe float, or None when not finite (NaN/Inf break JSON.parse).
    try:
        f = float(x)
    except (TypeError, ValueError):
        return None
    return f if math.isfinite(f) else None

def _groups(dataset, spec):
    # Each selected column, in spec order, as (name, finite-float array).
    # A Column-table analysis treats every selected Y column as one independent
    # group; missing cells are dropped (blank is not zero -- see dataset.ts).
    idx = {c['id']: j for j, c in enumerate(dataset['columns'])}
    name = {c['id']: c['name'] for c in dataset['columns']}
    rows = dataset['rows']
    out = []
    for cid in spec.get('columnIds', []):
        j = idx.get(cid)
        if j is None:
            continue
        vals = []
        for r in rows:
            v = r[j] if j < len(r) else None
            if v is None:
                continue
            try:
                f = float(v)
            except (TypeError, ValueError):
                continue
            if math.isfinite(f):
                vals.append(f)
        out.append((name.get(cid, cid), np.array(vals, dtype=float)))
    return out

def _svg(fig, opts=None):
    # Format Axes (Phase F1) is applied HERE, right before saving, so it lands
    # AFTER every series/bracket the builder drew -- an explicit axis range/scale
    # the student chose therefore wins over autoscale. A falsy opts (the vast
    # majority of calls, and every pre-F1 caller) skips it entirely, so an
    # un-formatted figure is byte-for-byte what it was before F1.
    if opts:
        try:
            _format_axes(fig.axes[0], opts)
        except Exception:
            pass
    buf = io.StringIO()
    fig.savefig(buf, format='svg')
    if _CAPTURE is None:
        plt.close(fig)
    else:
        _CAPTURE.append(fig)  # export mode: keep it alive for a dpi re-render
    s = buf.getvalue()
    return s[s.index('<svg'):]

# ── Figure craft (Phase F1): Format Graph / Format Axes / significance brackets.
# All parameterised ONLY by the bounded options in AnalysisOptionsSchema (enums,
# numbers, and two length-capped title strings) -- a title reaches matplotlib as
# TEXT via set_xlabel, never interpolated into code, keeping the data-not-code
# discipline the rest of this file relies on. Every helper is a strict NO-OP when
# its option keys are absent, so a default figure is unchanged.

# 'circle' is matplotlib's own default marker, so it maps to NOTHING here -- a
# figure with symbol='circle' (the default selection) emits no marker kwarg and
# stays byte-for-byte identical to an un-formatted one.
_MARKERS = {'square': 's', 'triangle': '^', 'diamond': 'D'}

def _marker_shape(opts):
    return _MARKERS.get((opts or {}).get('symbol'))

def _sym_kw(opts, color, s_default):
    # Scatter kwargs for the plotted points (Format Graph: symbol shape/size/fill).
    # With no options this returns exactly {s: default, color: color}, so the
    # scatter call is identical to the pre-F1 one.
    o = opts or {}
    kw = {'s': s_default, 'color': color}
    m = _MARKERS.get(o.get('symbol'))
    if m:
        kw['marker'] = m
    sz = o.get('symbolSize')
    if isinstance(sz, (int, float)) and not isinstance(sz, bool):
        kw['s'] = float(sz)
    if o.get('symbolFill') == 'open':
        del kw['color']
        kw['facecolors'] = 'none'
        kw['edgecolors'] = color
    return kw

def _bar_yerr(sds, opts):
    # Error-bar direction (Format Graph). Default returns the symmetric list
    # untouched -> ax.bar(yerr=sds) exactly as before F1.
    d = (opts or {}).get('errorBarDir')
    if d == 'up':
        return [[0.0] * len(sds), list(sds)]
    if d == 'down':
        return [list(sds), [0.0] * len(sds)]
    return sds

def _ls(opts):
    # Line style (Format Graph). None = leave matplotlib's default; callers add
    # the linestyle kwarg only when this is not None, so the default is unchanged.
    return {'solid': '-', 'dashed': '--', 'dotted': ':', 'none': 'None'}.get(
        (opts or {}).get('lineStyle'))

def _log_base(v):
    return {'log10': 10.0, 'log2': 2.0, 'ln': math.e}.get(v)

def _format_axes(ax, opts):
    # Format Axes: title override, range, log scale, tick control. Each clause
    # runs only when its bounded option is present.
    o = opts or {}
    xt, yt = o.get('xAxisTitle'), o.get('yAxisTitle')
    if isinstance(xt, str) and xt.strip():
        ax.set_xlabel(xt)
    if isinstance(yt, str) and yt.strip():
        ax.set_ylabel(yt)
    xb = _log_base(o.get('xScale'))
    if xb:
        ax.set_xscale('log', base=xb)
    yb = _log_base(o.get('yScale'))
    if yb:
        ax.set_yscale('log', base=yb)
    def _num(v):
        return v if (isinstance(v, (int, float)) and not isinstance(v, bool)
                     and math.isfinite(float(v))) else None
    xmn, xmx = _num(o.get('xMin')), _num(o.get('xMax'))
    if xmn is not None or xmx is not None:
        cur = ax.get_xlim()
        ax.set_xlim(cur[0] if xmn is None else float(xmn),
                    cur[1] if xmx is None else float(xmx))
    ymn, ymx = _num(o.get('yMin')), _num(o.get('yMax'))
    if ymn is not None or ymx is not None:
        cur = ax.get_ylim()
        ax.set_ylim(cur[0] if ymn is None else float(ymn),
                    cur[1] if ymx is None else float(ymx))
    from matplotlib.ticker import MaxNLocator
    xn, yn = _num(o.get('xTicks')), _num(o.get('yTicks'))
    if xn is not None and xb is None:
        ax.xaxis.set_major_locator(MaxNLocator(max(2, int(xn))))
    if yn is not None and yb is None:
        ax.yaxis.set_major_locator(MaxNLocator(max(2, int(yn))))
    if o.get('minorTicks') == 'on':
        ax.minorticks_on()

def _stars(p):
    if p is None:
        return 0
    if p < 0.001:
        return 3
    if p < 0.01:
        return 2
    if p < 0.05:
        return 1
    return 0

def _sig_label(p, mode):
    n = _stars(p)
    if mode == 'pvalue':
        if p is None:
            return 'n/a', n
        return ('p < 0.001' if p < 0.001 else 'p = %.3g' % p), n
    return ('*' * n if n > 0 else 'ns'), n

def _draw_brackets(ax, positions, tops, pairs, mode):
    # Significance brackets (THE Phase F acceptance criterion). pairs is the
    # list of SIGNIFICANT comparisons the analysis already computed -- (i, j,
    # adjusted_p) GROUP-INDEX pairs into the analysis's full groups list --
    # NOT recomputed here, so the on-figure brackets and the results table are
    # the SAME source of truth. Each bracket is tagged with a machine-readable
    # gid (matplotlib's SVG backend writes it as <g id=...>), so the smoke can
    # assert count and star level match.
    #
    # positions is indexed the SAME way: positions[group_index] is the drawn
    # x-coordinate for that group, or None if the group was dropped before
    # plotting (e.g. _box/_violin drop empty groups -- see there). A pair that
    # references a dropped group has no box/violin to point at, so it is
    # skipped rather than drawn against whatever happens to sit at that index.
    if not pairs or mode == 'none':
        return
    n = len(positions)
    valid = [(i, j, p) for (i, j, p) in pairs
             if 0 <= i < n and 0 <= j < n and i != j
             and positions[i] is not None and positions[j] is not None]
    if not valid:
        return
    hi = max(tops) if tops else 1.0
    lo = min(tops) if tops else 0.0
    span = hi - lo
    if span <= 0:
        span = abs(hi) if hi else 1.0
    step = 0.09 * span
    tick = 0.02 * span
    # Stagger: shortest-span bracket lowest, so stacked brackets never overlap.
    order = sorted(range(len(valid)),
                   key=lambda k: abs(positions[valid[k][1]] - positions[valid[k][0]]))
    base = hi + step
    top_used = base
    for level, k in enumerate(order):
        i, j, p = valid[k]
        xi, xj = positions[i], positions[j]
        h = base + level * (step + tick)
        line, = ax.plot([xi, xi, xj, xj], [h, h + tick, h + tick, h],
                        lw=1.1, color=_PT)
        label, nstars = _sig_label(p, mode)
        line.set_gid('dt-bracket-%d-%d-s%d' % (i, j, nstars))
        ax.text((xi + xj) / 2.0, h + tick, label, ha='center', va='bottom',
                fontsize=8, color=_PT)
        top_used = h + tick
    cur = ax.get_ylim()
    ax.set_ylim(cur[0], max(cur[1], top_used + step))

def _points_bar(groups, opts, ylabel, title, brackets=None, bmode='none'):
    # Bar of group means with SD error bars, individual points overlaid
    # (Prism's scatter-with-mean-SD). Error bars are DERIVED, never configured.
    names = [g[0] for g in groups]
    means = [float(np.mean(g[1])) if g[1].size else float('nan') for g in groups]
    sds = [float(np.std(g[1], ddof=1)) if g[1].size > 1 else 0.0 for g in groups]
    x = np.arange(len(names))
    fig, ax = plt.subplots(figsize=(4.4, 3.2))
    ax.bar(x, means, yerr=_bar_yerr(sds, opts), capsize=5, color=_BAR, alpha=0.85, zorder=1)
    tops = []
    for i, g in enumerate(groups):
        m = means[i] if means[i] == means[i] else 0.0
        sd = sds[i] if sds[i] == sds[i] else 0.0
        top = m + sd
        if g[1].size:
            ax.scatter(np.full(g[1].size, i), g[1], zorder=3, **_sym_kw(opts, _PT, 14))
            top = max(top, float(np.max(g[1])))
        tops.append(top)
    ax.set_xticks(x)
    ax.set_xticklabels(names)
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    _draw_brackets(ax, list(x), tops, brackets, bmode)
    ax.margins(x=0.15)
    fig.tight_layout()
    return _svg(fig, opts)

def _whis(spec):
    # Box-whisker style (plan Column graph family). matplotlib's whis:
    # 1.5 = Tukey (1.5*IQR, the default), (0,100) = min-max, (10,90) = 10-90 pct.
    w = (spec.get('options') or {}).get('whiskers')
    if w == 'minmax':
        return (0, 100)
    if w == 'p10_90':
        return (10, 90)
    return 1.5

def _box(groups, opts, ylabel, title, whis, brackets=None, bmode='none'):
    # kept drops empty groups before plotting (matplotlib can't box/violin an
    # empty array) but remembers each survivor's ORIGINAL index into groups --
    # a bracket's (i, j) always indexes the FULL groups list, so positions
    # below maps group-index -> drawn x (or None if that group was dropped),
    # keeping bracket placement and drawn boxes on ONE shared ordering even
    # when a group in the middle is empty (see _draw_brackets).
    kept = [(gi, nm, a) for gi, (nm, a) in enumerate(groups) if a.size]
    fig, ax = plt.subplots(figsize=(4.4, 3.2))
    ax.boxplot([a for _, _, a in kept], whis=whis)
    tops = []
    positions = [None] * len(groups)
    for slot, (gi, _, a) in enumerate(kept):
        x = slot + 1
        positions[gi] = x
        ax.scatter(np.full(a.size, x), a, zorder=3, alpha=0.6, **_sym_kw(opts, _PT, 12))
        tops.append(float(np.max(a)))
    ax.set_xticks(range(1, len(kept) + 1))
    ax.set_xticklabels([nm for _, nm, _ in kept])
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    _draw_brackets(ax, positions, tops, brackets, bmode)
    fig.tight_layout()
    return _svg(fig, opts)

def _violin(groups, opts, ylabel, title, brackets=None, bmode='none'):
    # See _box -- same group-index -> drawn-x mapping so a bracket lands on the
    # groups it actually names, not on whatever slot its index happens to hit
    # after empty groups are dropped from the plot.
    kept = [(gi, nm, a) for gi, (nm, a) in enumerate(groups) if a.size]
    fig, ax = plt.subplots(figsize=(4.4, 3.2))
    ax.violinplot([a for _, _, a in kept], showmeans=True, showextrema=True)
    tops = []
    positions = [None] * len(groups)
    for slot, (gi, _, a) in enumerate(kept):
        x = slot + 1
        positions[gi] = x
        ax.scatter(np.full(a.size, x), a, zorder=3, alpha=0.6, **_sym_kw(opts, _PT, 12))
        tops.append(float(np.max(a)))
    ax.set_xticks(range(1, len(kept) + 1))
    ax.set_xticklabels([nm for _, nm, _ in kept])
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    _draw_brackets(ax, positions, tops, brackets, bmode)
    fig.tight_layout()
    return _svg(fig, opts)

def _group_fig(groups, spec, ylabel, title, brackets=None):
    # The Column-table group figure. Default is D1's scatter-with-mean-SD bar;
    # options.graph switches to box-whisker or violin (plan Column graph families).
    # brackets (Phase F1) is the list of SIGNIFICANT (i, j, adjusted_p) pairs
    # the analysis already computed; drawn only when options.brackets is opted in.
    opts = spec.get('options') or {}
    bmode = opts.get('brackets') or 'none'
    br = brackets if bmode != 'none' else None
    kind = opts.get('graph')
    try:
        if kind == 'box':
            return _box(groups, opts, ylabel, title, _whis(spec), br, bmode)
        if kind == 'violin':
            if any(g[1].size > 1 for g in groups):
                return _violin(groups, opts, ylabel, title, br, bmode)
    except Exception:
        pass  # any figure hiccup falls back to the always-safe bar
    return _points_bar(groups, opts, ylabel, title, br, bmode)

def _before_after(name_a, name_b, a, b, title, opts=None):
    # Paired before-after plot: one faint line per subject, the group means bold.
    fig, ax = plt.subplots(figsize=(4.4, 3.2))
    for i in range(a.size):
        ax.plot([0, 1], [a[i], b[i]], color=_PT, alpha=0.45, marker='o',
                markersize=4, linewidth=1, zorder=2)
    mean_kw = {'color': _BAR, 'marker': 'o', 'markersize': 8, 'linewidth': 2.5, 'zorder': 5}
    ls = _ls(opts)
    if ls is not None:
        mean_kw['linestyle'] = ls
    m = _marker_shape(opts)
    if m:
        mean_kw['marker'] = m
    ax.plot([0, 1], [float(np.mean(a)), float(np.mean(b))], **mean_kw)
    ax.set_xticks([0, 1])
    ax.set_xticklabels([name_a, name_b])
    ax.set_xlim(-0.3, 1.3)
    ax.set_title(title)
    fig.tight_layout()
    return _svg(fig, opts)

def _pairs(dataset, spec):
    # Exactly two selected columns, aligned by ROW (Prism's paired-data shape).
    # A row is dropped only when EITHER cell is missing -- so the two arrays stay
    # index-matched, which independent per-column dropping (see _groups) would break.
    idx = {c['id']: j for j, c in enumerate(dataset['columns'])}
    name = {c['id']: c['name'] for c in dataset['columns']}
    ids = spec.get('columnIds', [])
    if len(ids) != 2:
        return None
    ja, jb = idx.get(ids[0]), idx.get(ids[1])
    if ja is None or jb is None:
        return None
    a, b = [], []
    for r in dataset['rows']:
        va = r[ja] if ja < len(r) else None
        vb = r[jb] if jb < len(r) else None
        try:
            fa, fb = float(va), float(vb)
        except (TypeError, ValueError):
            continue
        if math.isfinite(fa) and math.isfinite(fb):
            a.append(fa)
            b.append(fb)
    return (name.get(ids[0], ids[0]), name.get(ids[1], ids[1]),
            np.array(a, dtype=float), np.array(b, dtype=float))

def _multi_adjust(pvals, method):
    # Family-wise / FDR correction for planned comparisons (plan: "the matching
    # correction"). Delegates to statsmodels so the math is the trusted library's.
    # The method is an already-enum-validated option; anything unexpected falls
    # back to Bonferroni rather than raising.
    if not pvals:
        return []
    from statsmodels.stats.multitest import multipletests
    m = {'bonferroni': 'bonferroni', 'holm-sidak': 'holm-sidak',
         'fdr_bh': 'fdr_bh'}.get(method, 'bonferroni')
    return [float(x) for x in multipletests(pvals, method=m)[1]]

def _dunn(arrs, names, correction):
    # Dunn's post-hoc for Kruskal-Wallis (plan: implement it, don't add
    # scikit-posthocs). Ranks are POOLED across all groups (scipy rankdata =
    # average ranks for ties); the variance carries the standard tie correction
    # Sum(t^3 - t) / (12(N-1)) so it matches the with-ties definition too.
    all_vals = np.concatenate(arrs)
    N = int(all_vals.size)
    ranks = stats.rankdata(all_vals)
    sizes = [int(a.size) for a in arrs]
    means, off = [], 0
    for s in sizes:
        means.append(float(np.mean(ranks[off:off + s])) if s else 0.0)
        off += s
    _, counts = np.unique(all_vals, return_counts=True)
    ties = float(np.sum(counts.astype(float) ** 3 - counts.astype(float)))
    sigma2 = (N * (N + 1) / 12.0) - ties / (12.0 * (N - 1)) if N > 1 else 0.0
    pvals, pairs = [], []
    k = len(arrs)
    for i in range(k):
        for j in range(i + 1, k):
            se = math.sqrt(sigma2 * (1.0 / sizes[i] + 1.0 / sizes[j])) if sigma2 > 0 else 0.0
            z = (means[i] - means[j]) / se if se > 0 else 0.0
            pvals.append(2.0 * float(stats.norm.sf(abs(z))))
            pairs.append((i, j, z))
    padj = _multi_adjust(pvals, correction if correction in
                         ('bonferroni', 'holm-sidak', 'fdr_bh') else 'bonferroni')
    rows, sig = [], []
    for (i, j, z), p, pa in zip(pairs, pvals, padj):
        rows.append(['%s vs %s' % (names[i], names[j]), _fin(z), _fin(p), _fin(pa),
                     'yes' if pa < 0.05 else 'no'])
        if pa < 0.05:
            sig.append((i, j, float(pa)))  # feeds the significance brackets (F1)
    return rows, sig

def _descriptive(dataset, spec):
    groups = _groups(dataset, spec)
    cols = ['Group', 'n', 'Mean', 'SD', 'SEM', 'Median', 'Min', 'Max',
            '95% CI low', '95% CI high']
    trows = []
    for nm, a in groups:
        n = int(a.size)
        if n == 0:
            trows.append([nm, 0, None, None, None, None, None, None, None, None])
            continue
        mean = float(np.mean(a))
        sd = float(np.std(a, ddof=1)) if n > 1 else 0.0
        sem = sd / math.sqrt(n) if n > 1 else 0.0
        if n > 1:
            tcrit = float(stats.t.ppf(0.975, n - 1))
            lo, hi = mean - tcrit * sem, mean + tcrit * sem
        else:
            lo = hi = mean
        trows.append([nm, n, _fin(mean), _fin(sd), _fin(sem), _fin(np.median(a)),
                      _fin(np.min(a)), _fin(np.max(a)), _fin(lo), _fin(hi)])
    return {
        'stats': {'groups': len(groups),
                  'total n': int(sum(g[1].size for g in groups))},
        'tables': [{'title': 'Descriptive statistics', 'columns': cols, 'rows': trows}],
        'figures': [_group_fig(groups, spec, 'Value', 'Group means +/- SD')],
        'assumptions': [],
    }

def _one_sample_t(dataset, spec):
    groups = _groups(dataset, spec)
    if len(groups) != 1:
        return {'stats': {}, 'figures': [],
                'error': 'A one-sample t-test takes exactly one group; %d selected.'
                         % len(groups)}
    nm, a = groups[0]
    n = int(a.size)
    if n < 2:
        return {'stats': {}, 'figures': [], 'error': 'Need at least two values.'}
    opts = spec.get('options') or {}
    mu0 = float(opts.get('mu0', 0) or 0)
    mean = float(np.mean(a))
    sd = float(np.std(a, ddof=1))
    if sd == 0.0:
        return {'stats': {}, 'figures': [],
                'error': 'Every value is identical, so t is undefined -- compare the '
                         'constant value to your reference directly instead.'}
    sem = sd / math.sqrt(n)
    t, p = stats.ttest_1samp(a, mu0)
    d = (mean - mu0) / sd
    tcrit = float(stats.t.ppf(0.975, n - 1))
    ci_lo, ci_hi = mean - tcrit * sem, mean + tcrit * sem
    assum = []
    if n >= 3:
        sh = stats.shapiro(a)
        assum.append({'label': 'Normality -- %s (Shapiro-Wilk)' % nm,
                      'passed': bool(sh.pvalue >= 0.05), 'detail': 'p = %.4f' % sh.pvalue})
    return {
        'stats': {
            't': _fin(t), 'df': n - 1, 'p (two-sided)': _fin(p),
            'mean': _fin(mean), 'hypothesized mean': _fin(mu0),
            '95% CI low': _fin(ci_lo), '95% CI high': _fin(ci_hi), "Cohen's d": _fin(d),
        },
        'figures': [_group_fig(groups, spec, 'Value', '%s vs mean = %g' % (nm, mu0))],
        'assumptions': assum,
    }

def _paired_t(dataset, spec):
    pr = _pairs(dataset, spec)
    if pr is None:
        return {'stats': {}, 'figures': [],
                'error': 'A paired t-test compares exactly two paired columns.'}
    na_, nb_, a, b = pr
    n = int(a.size)
    if n < 2:
        return {'stats': {}, 'figures': [],
                'error': 'Need at least two complete pairs (rows with both values).'}
    diff = a - b
    md = float(np.mean(diff))
    sd = float(np.std(diff, ddof=1))
    if sd == 0.0:
        return {'stats': {}, 'figures': [],
                'error': 'Every pair changed by the same amount, so t is undefined.'}
    sem = sd / math.sqrt(n)
    t, p = stats.ttest_rel(a, b)
    dz = md / sd
    tcrit = float(stats.t.ppf(0.975, n - 1))
    ci_lo, ci_hi = md - tcrit * sem, md + tcrit * sem
    assum = []
    if n >= 3:
        sh = stats.shapiro(diff)
        assum.append({'label': 'Normality of differences (Shapiro-Wilk)',
                      'passed': bool(sh.pvalue >= 0.05), 'detail': 'p = %.4f' % sh.pvalue})
    return {
        'stats': {
            't': _fin(t), 'df': n - 1, 'p (two-sided)': _fin(p), 'pairs': n,
            'mean difference': _fin(md), '95% CI low': _fin(ci_lo),
            '95% CI high': _fin(ci_hi), "Cohen's dz": _fin(dz),
        },
        'figures': [_before_after(na_, nb_, a, b, '%s vs %s (paired)' % (na_, nb_),
                                  spec.get('options'))],
        'assumptions': assum,
    }

def _mann_whitney(dataset, spec):
    groups = _groups(dataset, spec)
    if len(groups) != 2:
        return {'stats': {}, 'figures': [],
                'error': 'Mann-Whitney U compares exactly two groups; %d selected.'
                         % len(groups)}
    (na_, a), (nb_, b) = groups
    n1, n2 = int(a.size), int(b.size)
    if n1 < 1 or n2 < 1:
        return {'stats': {}, 'figures': [], 'error': 'Each group needs at least one value.'}
    U, p = stats.mannwhitneyu(a, b, alternative='two-sided')
    # Rank-biserial effect size: 2*f - 1 where f = U1/(n1*n2) is the common-language
    # probability that a random value from group 1 exceeds one from group 2.
    rb = 2.0 * float(U) / (n1 * n2) - 1.0
    return {
        'stats': {
            'U': _fin(U), 'p (two-sided)': _fin(p),
            'rank-biserial r': _fin(rb), 'n1': n1, 'n2': n2,
        },
        'figures': [_group_fig(groups, spec, 'Value', '%s vs %s' % (na_, nb_),
                               brackets=([(0, 1, float(p))] if float(p) < 0.05 else []))],
        'assumptions': [{'label': 'Nonparametric -- no normality assumed', 'passed': True,
                         'detail': 'Ranks, not values; use when a t-test would be too strong.'}],
    }

def _wilcoxon(dataset, spec):
    pr = _pairs(dataset, spec)
    if pr is None:
        return {'stats': {}, 'figures': [],
                'error': 'Wilcoxon signed-rank compares exactly two paired columns.'}
    na_, nb_, a, b = pr
    diff = a - b
    nz = int(np.count_nonzero(diff))
    if nz < 1:
        return {'stats': {}, 'figures': [],
                'error': 'Every pair is identical, so there is nothing to rank.'}
    W, p = stats.wilcoxon(a, b)
    return {
        'stats': {'W': _fin(W), 'p (two-sided)': _fin(p), 'nonzero pairs': nz},
        'figures': [_before_after(na_, nb_, a, b, '%s vs %s (paired)' % (na_, nb_),
                                  spec.get('options'))],
        'assumptions': [{'label': 'Nonparametric -- no normality assumed', 'passed': True,
                         'detail': 'Ranks the paired differences; the paired Mann-Whitney.'}],
    }

def _kruskal_wallis(dataset, spec):
    groups = _groups(dataset, spec)
    if len(groups) < 3:
        return {'stats': {}, 'figures': [],
                'error': 'Kruskal-Wallis needs at least three groups; %d selected.'
                         % len(groups)}
    names = [g[0] for g in groups]
    arrs = [g[1] for g in groups]
    if any(a.size < 1 for a in arrs):
        return {'stats': {}, 'figures': [], 'error': 'Each group needs at least one value.'}
    H, p = stats.kruskal(*arrs)
    k = len(arrs)
    opts = spec.get('options') or {}
    dunn_rows, dunn_sig = _dunn(arrs, names, opts.get('correction'))
    corr = opts.get('correction') if opts.get('correction') in \
        ('bonferroni', 'holm-sidak', 'fdr_bh') else 'bonferroni'
    return {
        'stats': {'H': _fin(H), 'df': k - 1, 'p': _fin(p), 'groups': k},
        'tables': [{'title': "Dunn's post-hoc (%s-corrected)" % corr,
                    'columns': ['Comparison', 'z', 'Raw p', 'Adjusted p', 'Significant'],
                    'rows': dunn_rows}],
        'figures': [_group_fig(groups, spec, 'Value', 'Group distributions', brackets=dunn_sig)],
        'assumptions': [{'label': 'Nonparametric -- no normality assumed', 'passed': True,
                         'detail': 'Ranks across all groups; the nonparametric one-way ANOVA.'}],
    }

def _unpaired_t(dataset, spec):
    groups = _groups(dataset, spec)
    if len(groups) != 2:
        return {'stats': {}, 'figures': [],
                'error': 'An unpaired t-test compares exactly two groups; %d selected.'
                         % len(groups)}
    (na_, a), (nb_, b) = groups
    n1, n2 = int(a.size), int(b.size)
    if n1 < 2 or n2 < 2:
        return {'stats': {}, 'figures': [], 'error': 'Each group needs at least two values.'}
    m1, m2 = float(np.mean(a)), float(np.mean(b))
    v1, v2 = float(np.var(a, ddof=1)), float(np.var(b, ddof=1))
    diff = m1 - m2
    if v1 == 0.0 and v2 == 0.0:
        # No within-group variation in either group: the Welch df and pooled-SD
        # formulas below are 0/0 (undefined), not just small -- say so plainly
        # instead of raising ZeroDivisionError. (n1-1)*v1 + (n2-1)*v2 == 0 here,
        # so sp would be 0 too; this is the ONLY way that denominator hits zero.
        return {'stats': {}, 'figures': [],
                'error': 'A t-test needs some variation within each group. Both groups '
                         'here are constant, so t is undefined -- compare the group means '
                         'directly instead.'}
    # Assumptions evaluated against THIS data.
    sh1 = stats.shapiro(a) if n1 >= 3 else None
    sh2 = stats.shapiro(b) if n2 >= 3 else None
    lev = stats.levene(a, b)
    equal_var = bool(lev.pvalue >= 0.05)
    # Student's (pooled) and Welch's -- report Welch's when variances differ.
    t_stud, p_stud = stats.ttest_ind(a, b, equal_var=True)
    df_stud = n1 + n2 - 2
    t_welch, p_welch = stats.ttest_ind(a, b, equal_var=False)
    # Safe: the v1 == v2 == 0 guard above rules out the only 0/0 case.
    df_welch = (v1 / n1 + v2 / n2) ** 2 / (
        (v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1))
    # Pooled SD, Cohen's d, and the 95% CI of the mean difference.
    # sp > 0 always holds here too (same guard), so no zero-guard fallback needed.
    sp = math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2))
    d = diff / sp
    if equal_var:
        se = sp * math.sqrt(1.0 / n1 + 1.0 / n2)
        tcrit = float(stats.t.ppf(0.975, df_stud))
    else:
        se = math.sqrt(v1 / n1 + v2 / n2)
        tcrit = float(stats.t.ppf(0.975, df_welch))
    ci_lo, ci_hi = diff - tcrit * se, diff + tcrit * se
    assum = []
    if sh1 is not None:
        assum.append({'label': 'Normality -- %s (Shapiro-Wilk)' % na_,
                      'passed': bool(sh1.pvalue >= 0.05),
                      'detail': 'p = %.4f' % sh1.pvalue})
    if sh2 is not None:
        assum.append({'label': 'Normality -- %s (Shapiro-Wilk)' % nb_,
                      'passed': bool(sh2.pvalue >= 0.05),
                      'detail': 'p = %.4f' % sh2.pvalue})
    assum.append({'label': 'Equal variance (Levene)', 'passed': equal_var,
                  'detail': 'p = %.4f%s' % (lev.pvalue,
                            '' if equal_var else " -- using Welch's t instead")})
    stats_out = {
        't': _fin(t_stud if equal_var else t_welch),
        'df': _fin(df_stud if equal_var else df_welch),
        'p (two-sided)': _fin(p_stud if equal_var else p_welch),
        'mean difference': _fin(diff),
        '95% CI low': _fin(ci_lo),
        '95% CI high': _fin(ci_hi),
        "Cohen's d": _fin(d),
        'test used': "Welch's t (unequal variance)" if not equal_var else "Student's t",
        "Student's t": _fin(t_stud),
        "Student's p": _fin(p_stud),
        "Welch's t": _fin(t_welch),
        "Welch's p": _fin(p_welch),
    }
    p_used = float(p_stud if equal_var else p_welch)
    sig = [(0, 1, p_used)] if p_used < 0.05 else []  # single-pair bracket (F1)
    return {'stats': stats_out,
            'figures': [_group_fig(groups, spec, 'Value', '%s vs %s' % (na_, nb_),
                                   brackets=sig)],
            'assumptions': assum}

def _one_way_anova(dataset, spec):
    groups = _groups(dataset, spec)
    if len(groups) < 3:
        return {'stats': {}, 'figures': [],
                'error': 'One-way ANOVA needs at least three groups; %d selected.'
                         % len(groups)}
    arrs = [g[1] for g in groups]
    if any(a.size < 2 for a in arrs):
        return {'stats': {}, 'figures': [], 'error': 'Each group needs at least two values.'}
    k = len(arrs)
    names = [g[0] for g in groups]
    # The columnIds that actually resolved, in the SAME order/filter _groups used --
    # so ids[i] is the source column of arrs[i]/names[i]. Needed to look up the
    # Dunnett control by id without re-deriving _groups' own resolution differently
    # (that mismatch was the bug: raw spec.columnIds vs. resolved arrs diverge
    # whenever a stale/deleted columnId is skipped).
    col_idx = {c['id']: j for j, c in enumerate(dataset['columns'])}
    ids = [cid for cid in spec.get('columnIds', []) if cid in col_idx]
    N = int(sum(a.size for a in arrs))
    F, p = stats.f_oneway(*arrs)
    grand = float(np.mean(np.concatenate(arrs)))
    ss_between = float(sum(a.size * (np.mean(a) - grand) ** 2 for a in arrs))
    ss_within = float(sum(((a - np.mean(a)) ** 2).sum() for a in arrs))
    ss_total = ss_between + ss_within
    eta2 = ss_between / ss_total if ss_total > 0 else 0.0
    df_b, df_w = k - 1, N - k
    tables, mc_label, posthoc_error, sig_pairs = _anova_posthoc(arrs, names, ids, spec)
    if posthoc_error:
        return {'stats': {}, 'figures': [], 'error': posthoc_error}
    assum = []
    for nm, a in groups:
        if a.size >= 3:
            sh = stats.shapiro(a)
            assum.append({'label': 'Normality -- %s (Shapiro-Wilk)' % nm,
                          'passed': bool(sh.pvalue >= 0.05),
                          'detail': 'p = %.4f' % sh.pvalue})
    lev = stats.levene(*arrs)
    assum.append({'label': 'Equal variance (Levene)',
                  'passed': bool(lev.pvalue >= 0.05),
                  'detail': 'p = %.4f' % lev.pvalue})
    return {
        'stats': {
            'F': _fin(F), 'df between': df_b, 'df within': df_w,
            'p': _fin(p), 'eta squared': _fin(eta2),
            'multiple comparisons': mc_label,
        },
        'tables': tables,
        'figures': [_group_fig(groups, spec, 'Value', 'Group means +/- SD', brackets=sig_pairs)],
        'assumptions': assum,
    }

def _anova_posthoc(arrs, names, ids, spec):
    # Multiple comparisons done honestly (plan section 5): the student CHOOSES
    # which comparisons and gets the matching correction, not "run every pair and
    # report the winner". Returns (tables, headline-label, error). ids[i] is the
    # resolved columnId behind arrs[i]/names[i] (see _one_way_anova) -- Dunnett
    # uses it to find the control group by id, since arrs/names have already
    # dropped any columnId that no longer exists in the dataset, and indexing them
    # with a position from the UNFILTERED spec.columnIds would silently pick the
    # wrong group whenever a stale id sits before the control.
    opts = spec.get('options') or {}
    posthoc = opts.get('posthoc') or 'none'
    k = len(arrs)
    if posthoc == 'tukey':
        correction = opts.get('correction') or 'tukey'
        if correction == 'tukey':
            # scipy's studentized-range Tukey HSD -- the AC anchor (all pairs).
            res = stats.tukey_hsd(*arrs)
            ci = res.confidence_interval(0.95)
            rows, sig = [], []
            for i in range(k):
                for j in range(i + 1, k):
                    diff = float(np.mean(arrs[i]) - np.mean(arrs[j]))
                    pv = float(res.pvalue[i][j])
                    rows.append(['%s vs %s' % (names[i], names[j]), _fin(diff), _fin(pv),
                                 _fin(ci.low[i][j]), _fin(ci.high[i][j]),
                                 'yes' if pv < 0.05 else 'no'])
                    if pv < 0.05:
                        sig.append((i, j, pv))  # bracket iff reject -- SAME table, one source
            return ([{'title': 'Tukey HSD -- all pairs (95% CI)',
                      'columns': ['Comparison', 'Mean diff', 'Adjusted p', 'CI low',
                                  'CI high', 'Significant'],
                      'rows': rows}], 'Tukey HSD (all pairs)', None, sig)
        # All pairs with a chosen family-wise / FDR correction instead of Tukey.
        pvals, meta = [], []
        for i in range(k):
            for j in range(i + 1, k):
                tt = stats.ttest_ind(arrs[i], arrs[j], equal_var=True)
                pvals.append(float(tt.pvalue))
                meta.append((i, j, float(np.mean(arrs[i]) - np.mean(arrs[j]))))
        padj = _multi_adjust(pvals, correction)
        rows, sig = [], []
        for (i, j, diff), pv, pa in zip(meta, pvals, padj):
            rows.append(['%s vs %s' % (names[i], names[j]), _fin(diff), _fin(pv), _fin(pa),
                         'yes' if pa < 0.05 else 'no'])
            if pa < 0.05:
                sig.append((i, j, float(pa)))
        return ([{'title': 'All pairs (%s-corrected)' % correction,
                  'columns': ['Comparison', 'Mean diff', 'Raw p', 'Adjusted p', 'Significant'],
                  'rows': rows}], 'All pairs, %s' % correction, None, sig)
    if posthoc == 'dunnett':
        ctrl_id = opts.get('controlColumnId')
        if not ctrl_id:
            return ([{'title': 'Dunnett vs control',
                      'columns': ['Note'],
                      'rows': [['Pick a control column to compare each group against.']]}],
                    'Dunnett (needs a control)', None, [])
        if ctrl_id not in ids:
            # Chosen, but no longer resolvable (its column was deleted from the
            # dataset) -- a wrong-but-confident table is worse than refusing.
            return ([], '', 'The control group column is no longer in the dataset. '
                            'Pick a control and re-run.', [])
        c = ids.index(ctrl_id)
        control = arrs[c]
        treatments = [(idx, arrs[idx]) for idx in range(k) if idx != c]
        res = stats.dunnett(*[a for _, a in treatments], control=control)
        rows, sig = [], []
        for pos, (idx, a) in enumerate(treatments):
            diff = float(np.mean(a) - np.mean(control))
            pv = float(res.pvalue[pos])
            rows.append(['%s vs %s' % (names[idx], names[c]), _fin(diff),
                         _fin(res.statistic[pos]), _fin(pv), 'yes' if pv < 0.05 else 'no'])
            if pv < 0.05:
                sig.append((idx, c, pv))  # each significant treatment vs the control
        return ([{'title': 'Dunnett vs %s' % names[c],
                  'columns': ['Comparison', 'Mean diff', 'Statistic', 'Adjusted p',
                              'Significant'],
                  'rows': rows}], 'Dunnett vs %s' % names[c], None, sig)
    return ([], 'none -- pick a post-hoc to compare pairs', None, [])

# ===========================================================================
# Phase D2b -- Grouped (two-way ANOVA), Nested (nested t / nested ANOVA),
# Contingency (chi-square, Fisher, relative risk, odds ratio).
#
# DATA SHAPES (how a student ENTERS each, read straight off the grid):
#   Grouped  : one row-factor column (role 'label' or 'group') whose repeated
#              values are factor A's levels and supply within-cell replication;
#              each SELECTED y column is a level of factor B (the column name);
#              the cell is the value. -> melt to long, C(A)*C(B).
#   Nested   : one treatment column (role 'group') = the factor compared; one
#              subject column (role 'label') = the independent/biological unit;
#              the SELECTED y column = the measured value; each ROW is one
#              technical-replicate reading. -> collapse to per-subject means, so
#              n = subjects (not measurements). This is the pseudoreplication wall.
#   Contingency: each data row is a category level (role 'label' names it), each
#              SELECTED y column is a level of the other variable, the cell is a
#              COUNT. -> a counts matrix straight into scipy.
# ===========================================================================

_PALETTE = ['#4C78A8', '#F58518', '#54A24B', '#B279A2', '#E45756', '#72B7B2']

# ── Grouped: two-way ANOVA ─────────────────────────────────────────────────

def _row_factor(dataset):
    # Factor A of a Grouped table: the first label/group column. Its value on
    # each row is the level of A; repetition of a level across rows is the
    # replication that lets the interaction + error term be estimated.
    for j, c in enumerate(dataset['columns']):
        if c.get('role') in ('label', 'group'):
            return j, c['name']
    return None, None

def _melt_grouped(dataset, spec):
    ja, aname = _row_factor(dataset)
    idx = {c['id']: j for j, c in enumerate(dataset['columns'])}
    name = {c['id']: c['name'] for c in dataset['columns']}
    ycols = [(name[cid], idx[cid]) for cid in spec.get('columnIds', []) if cid in idx]
    A, B, Y = [], [], []
    for row in dataset['rows']:
        av = row[ja] if (ja is not None and ja < len(row)) else None
        if av is None:
            continue
        for cname, j in ycols:
            v = row[j] if j < len(row) else None
            try:
                f = float(v)
            except (TypeError, ValueError):
                continue
            if math.isfinite(f):
                A.append(str(av))
                B.append(cname)
                Y.append(f)
    return aname, A, B, Y, [c[0] for c in ycols]

def _grouped_fig(A, B, Y, spec, aname):
    style = (spec.get('options') or {}).get('bars') or 'interleaved'
    a_levels = list(dict.fromkeys(A))
    b_levels = list(dict.fromkeys(B))
    cell = {}
    for a, b, y in zip(A, B, Y):
        cell.setdefault((a, b), []).append(y)
    def _m(a, b):
        v = cell.get((a, b))
        return float(np.mean(v)) if v else float('nan')
    def _e(a, b):
        v = cell.get((a, b))
        return float(np.std(v, ddof=1) / math.sqrt(len(v))) if (v and len(v) > 1) else 0.0
    M = np.array([[_m(a, b) for b in b_levels] for a in a_levels], dtype=float)
    E = np.array([[_e(a, b) for b in b_levels] for a in a_levels], dtype=float)
    x = np.arange(len(a_levels))
    fig, ax = plt.subplots(figsize=(5.0, 3.4))
    try:
        if style == 'heatmap':
            im = ax.imshow(M, aspect='auto', cmap='viridis')
            ax.set_xticks(range(len(b_levels)))
            ax.set_xticklabels(b_levels, rotation=25, ha='right')
            ax.set_yticks(range(len(a_levels)))
            ax.set_yticklabels(a_levels)
            fig.colorbar(im, ax=ax, shrink=0.85)
        elif style == 'scatter':
            for bi, b in enumerate(b_levels):
                off = (bi - (len(b_levels) - 1) / 2.0) * 0.14
                first = True
                for ai, a in enumerate(a_levels):
                    pts = cell.get((a, b), [])
                    if pts:
                        ax.scatter(np.full(len(pts), ai) + off, pts, s=16,
                                   color=_PALETTE[bi % len(_PALETTE)],
                                   label=b if first else None, zorder=3)
                        first = False
            ax.set_xticks(x)
            ax.set_xticklabels(a_levels)
            ax.legend(fontsize=7)
        elif style == 'stacked':
            bottom = np.zeros(len(a_levels))
            for bi, b in enumerate(b_levels):
                col = np.nan_to_num(M[:, bi])
                ax.bar(x, col, bottom=bottom, color=_PALETTE[bi % len(_PALETTE)], label=b)
                bottom += col
            ax.set_xticks(x)
            ax.set_xticklabels(a_levels)
            ax.legend(fontsize=7)
        else:
            # interleaved (default) and separated -- grouped bars; 'separated'
            # widens the gap between A-clusters so each column group reads apart.
            w = 0.8 / max(1, len(b_levels))
            gap = 1.4 if style == 'separated' else 1.0
            xb = x * gap
            for bi, b in enumerate(b_levels):
                ax.bar(xb + bi * w, np.nan_to_num(M[:, bi]), w, yerr=E[:, bi],
                       capsize=3, color=_PALETTE[bi % len(_PALETTE)], label=b)
            ax.set_xticks(xb + (len(b_levels) - 1) * w / 2.0)
            ax.set_xticklabels(a_levels)
            ax.legend(fontsize=7)
    except Exception:
        plt.close(fig)
        fig, ax = plt.subplots(figsize=(5.0, 3.4))
        ax.bar(x, np.nan_to_num(M[:, 0]) if M.size else x * 0)
        ax.set_xticks(x)
        ax.set_xticklabels(a_levels)
    ax.set_xlabel(aname or 'Factor A')
    ax.set_ylabel('Mean')
    fig.tight_layout()
    return _svg(fig)

def _two_way_anova(dataset, spec):
    ja, aname = _row_factor(dataset)
    if ja is None:
        return {'stats': {}, 'figures': [],
                'error': 'A Grouped table needs a row-factor column (give a text column the '
                         'Row/Label or Group role) to name the first factor.'}
    aname, A, B, Y, bnames = _melt_grouped(dataset, spec)
    if len(set(B)) < 2:
        return {'stats': {}, 'figures': [],
                'error': 'Two-way ANOVA needs at least two column groups (the second factor); '
                         'select two or more columns.'}
    if len(set(A)) < 2:
        return {'stats': {}, 'figures': [],
                'error': 'The row factor "%s" has only one level -- a second factor needs at '
                         'least two rows/levels.' % aname}
    import pandas as pd
    from statsmodels.formula.api import ols
    from statsmodels.stats.anova import anova_lm
    df = pd.DataFrame({'A': A, 'B': B, 'value': Y})
    model = ols('value ~ C(A) * C(B)', data=df)
    if np.linalg.matrix_rank(model.exog) < model.exog.shape[1]:
        return {'stats': {}, 'figures': [],
                'error': "Every combination of the two factors needs at least one value -- one "
                         "combination here is empty, so a two-way ANOVA can't be computed. Fill "
                         "in the missing cell or drop that factor level."}
    model = model.fit()
    aov = anova_lm(model, typ=2)
    df_resid = int(aov.loc['Residual', 'df'])
    ss_resid = float(aov.loc['Residual', 'sum_sq'])
    if df_resid < 1:
        return {'stats': {}, 'figures': [],
                'error': 'No replication: every factor combination has a single value, so the '
                         'interaction uses up all the data and no error is left to test against. '
                         'Enter replicate rows for each combination.'}
    labels = {'C(A)': aname, 'C(B)': 'Columns', 'C(A):C(B)': '%s x Columns' % aname}
    trows = []
    for key in ('C(A)', 'C(B)', 'C(A):C(B)'):
        ss = float(aov.loc[key, 'sum_sq'])
        dfk = int(aov.loc[key, 'df'])
        F = float(aov.loc[key, 'F'])
        p = float(aov.loc[key, 'PR(>F)'])
        peta = ss / (ss + ss_resid) if (ss + ss_resid) > 0 else 0.0
        trows.append([labels[key], _fin(ss), dfk, _fin(F), _fin(p), _fin(peta)])
    resid = np.asarray(model.resid, dtype=float)
    assum = []
    if resid.size >= 3:
        sh = stats.shapiro(resid)
        assum.append({'label': 'Normality of residuals (Shapiro-Wilk)',
                      'passed': bool(sh.pvalue >= 0.05), 'detail': 'p = %.4f' % sh.pvalue})
    cells = {}
    for a, b, y in zip(A, B, Y):
        cells.setdefault((a, b), []).append(y)
    cell_arrs = [np.array(v, dtype=float) for v in cells.values() if len(v) > 1]
    if len(cell_arrs) >= 2:
        lev = stats.levene(*cell_arrs)
        assum.append({'label': 'Equal variance across cells (Levene)',
                      'passed': bool(lev.pvalue >= 0.05), 'detail': 'p = %.4f' % lev.pvalue})
    return {
        'stats': {'factor A (rows)': aname, 'factor B levels': len(set(B)),
                  'residual df': df_resid, 'total observations': len(Y)},
        'tables': [{'title': 'Two-way ANOVA (Type II sum of squares)',
                    'columns': ['Effect', 'Sum of squares', 'df', 'F', 'p', 'partial eta^2'],
                    'rows': trows}],
        'figures': [_grouped_fig(A, B, Y, spec, aname)],
        'assumptions': assum,
    }

# ── Nested: nested t / nested one-way ANOVA (the pseudoreplication wall) ────

def _nested_units(dataset, spec):
    # Group the rows into treatment -> subject -> [measurements]. Treatment is
    # the first 'group' column; subject the first 'label' column; value the one
    # selected y column. Returns a dict, or an error STRING for a graceful refusal.
    cols = dataset['columns']
    idx = {c['id']: j for j, c in enumerate(cols)}
    name = {c['id']: c['name'] for c in cols}
    jt = next((j for j, c in enumerate(cols) if c.get('role') == 'group'), None)
    js = next((j for j, c in enumerate(cols) if c.get('role') == 'label'), None)
    ids = [cid for cid in spec.get('columnIds', []) if cid in idx]
    if not ids:
        return 'Pick the column holding the measured value.'
    if jt is None:
        return ('A Nested table needs a treatment column (the factor you are comparing). '
                'Give one column the Group role in the grid.')
    if js is None:
        return ('A Nested table needs a subject column (the plant/animal/dish measured '
                'repeatedly). Give one column the Label role in the grid.')
    jv = idx[ids[0]]
    groups, order, nmeas = {}, [], 0
    for row in dataset['rows']:
        gv = row[jt] if jt < len(row) else None
        sv = row[js] if js < len(row) else None
        vv = row[jv] if jv < len(row) else None
        if gv is None or sv is None:
            continue
        try:
            f = float(vv)
        except (TypeError, ValueError):
            continue
        if not math.isfinite(f):
            continue
        g, s = str(gv), str(sv)
        if g not in groups:
            groups[g] = {}
            order.append(g)
        groups[g].setdefault(s, []).append(f)
        nmeas += 1
    return {'value': name.get(ids[0], 'value'), 'treatment': cols[jt]['name'],
            'subject': cols[js]['name'], 'order': order, 'groups': groups, 'nmeas': nmeas}

def _nested_fig(order, groups, value_name, treatment_name):
    fig, ax = plt.subplots(figsize=(4.8, 3.4))
    for gi, g in enumerate(order):
        subs = list(groups[g].keys())
        for si, s in enumerate(subs):
            vals = groups[g][s]
            jit = (si - (len(subs) - 1) / 2.0) * 0.14
            col = _PALETTE[si % len(_PALETTE)]
            ax.scatter(np.full(len(vals), gi) + jit, vals, s=18, color=col, alpha=0.85, zorder=3)
            sm = float(np.mean(vals))
            ax.plot([gi + jit - 0.05, gi + jit + 0.05], [sm, sm], color=col, lw=1.6, zorder=4)
        gm = float(np.mean([np.mean(v) for v in groups[g].values()]))
        ax.plot([gi - 0.28, gi + 0.28], [gm, gm], color=_PT, lw=2.6, zorder=6)
    ax.set_xticks(range(len(order)))
    ax.set_xticklabels(order)
    ax.set_xlabel(treatment_name)
    ax.set_ylabel(value_name)
    ax.set_title('Points colored by subject; black bar = group mean')
    fig.tight_layout()
    return _svg(fig)

def _nested_anova(dataset, spec):
    u = _nested_units(dataset, spec)
    if isinstance(u, str):
        return {'stats': {}, 'figures': [], 'error': u}
    order, groups = u['order'], u['groups']
    if len(order) < 3:
        return {'stats': {}, 'figures': [],
                'error': 'Nested one-way ANOVA needs at least three treatment groups; the '
                         'treatment column has %d. Use the nested t-test for two.' % len(order)}
    subj_means = {g: [float(np.mean(v)) for v in groups[g].values()] for g in order}
    raw = {g: [x for v in groups[g].values() for x in v] for g in order}
    if any(len(subj_means[g]) < 2 for g in order):
        return {'stats': {}, 'figures': [],
                'error': 'Each treatment needs at least two subjects (independent units). '
                         'Measuring one subject many times is still n = 1.'}
    a = len(order)
    S = sum(len(subj_means[g]) for g in order)
    N = sum(len(raw[g]) for g in order)
    # CORRECT: test the treatment against BETWEEN-SUBJECT variance. For a
    # balanced design this equals a one-way ANOVA on the per-subject means
    # (Sokal & Rohlf, Biometry, nested-ANOVA identity); for unbalanced designs it
    # is the honest "average each subject first" analysis the pseudoreplication
    # guide teaches. Effective n = SUBJECTS, never measurements.
    F, p = stats.f_oneway(*[np.array(subj_means[g], dtype=float) for g in order])
    # NAIVE (pseudoreplicated): treat every measurement as an independent sample.
    Fn, pn = stats.f_oneway(*[np.array(raw[g], dtype=float) for g in order])
    per_group = [[g, len(subj_means[g]), len(raw[g]), _fin(float(np.mean(raw[g])))] for g in order]
    return {
        'stats': {
            'F (nested)': _fin(F), 'df treatments': a - 1, 'df subjects (error)': S - a,
            'p (nested)': _fin(p),
            'subjects (real n)': S, 'measurements': N,
            'F (naive, WRONG)': _fin(Fn), 'df naive error': N - a, 'p (naive, WRONG)': _fin(pn),
        },
        'tables': [{'title': 'Real n is subjects, not measurements',
                    'columns': ['Treatment', 'Subjects (real n)', 'Measurements', 'Mean'],
                    'rows': per_group}],
        'figures': [_nested_fig(order, groups, u['value'], u['treatment'])],
        'assumptions': [{
            'label': 'Independence: n = subjects, not measurements',
            'passed': True,
            'detail': 'Correct p (%d subjects) = %.4g. Treating all %d measurements as '
                      'independent inflates F from %.3f to %.3f and gives a wrong p = %.4g.'
                      % (S, p, N, F, Fn, pn),
        }],
    }

def _nested_t(dataset, spec):
    u = _nested_units(dataset, spec)
    if isinstance(u, str):
        return {'stats': {}, 'figures': [], 'error': u}
    order, groups = u['order'], u['groups']
    if len(order) != 2:
        return {'stats': {}, 'figures': [],
                'error': 'Nested t-test compares exactly two treatment groups; the treatment '
                         'column has %d. Use nested ANOVA for three or more.' % len(order)}
    subj_means = {g: [float(np.mean(v)) for v in groups[g].values()] for g in order}
    raw = {g: [x for v in groups[g].values() for x in v] for g in order}
    if any(len(subj_means[g]) < 2 for g in order):
        return {'stats': {}, 'figures': [],
                'error': 'Each treatment needs at least two subjects (independent units). '
                         'Measuring one subject many times is still n = 1.'}
    a0, a1 = order
    m0 = np.array(subj_means[a0], dtype=float)
    m1 = np.array(subj_means[a1], dtype=float)
    r0 = np.array(raw[a0], dtype=float)
    r1 = np.array(raw[a1], dtype=float)
    S = m0.size + m1.size
    N = r0.size + r1.size
    # CORRECT: unpaired t on the per-subject means. NAIVE: on all measurements.
    t, p = stats.ttest_ind(m0, m1, equal_var=True)
    tn, pn = stats.ttest_ind(r0, r1, equal_var=True)
    return {
        'stats': {
            't (nested)': _fin(t), 'df': S - 2, 'p (nested)': _fin(p),
            'subjects (real n)': S, 'measurements': N,
            't (naive, WRONG)': _fin(tn), 'df naive': N - 2, 'p (naive, WRONG)': _fin(pn),
            'mean %s' % a0: _fin(float(np.mean(r0))), 'mean %s' % a1: _fin(float(np.mean(r1))),
        },
        'tables': [{'title': 'Real n is subjects, not measurements',
                    'columns': ['Treatment', 'Subjects (real n)', 'Measurements', 'Mean'],
                    'rows': [[a0, int(m0.size), int(r0.size), _fin(float(np.mean(r0)))],
                             [a1, int(m1.size), int(r1.size), _fin(float(np.mean(r1)))]]}],
        'figures': [_nested_fig(order, groups, u['value'], u['treatment'])],
        'assumptions': [{
            'label': 'Independence: n = subjects, not measurements',
            'passed': True,
            'detail': 'Correct p (%d subjects) = %.4g. Treating all %d measurements as '
                      'independent gives a wrong p = %.4g.' % (S, p, N, pn),
        }],
    }

# ── Contingency: chi-square / Fisher / relative risk / odds ratio ──────────

def _contingency_matrix(dataset, spec):
    # Rows = data rows (each a category level), columns = SELECTED y columns
    # (each an outcome level), cells = counts. A row with no usable count in any
    # selected column is dropped. Returns (col_names, row_labels, matrix) or a str.
    cols = dataset['columns']
    idx = {c['id']: j for j, c in enumerate(cols)}
    name = {c['id']: c['name'] for c in cols}
    ids = [cid for cid in spec.get('columnIds', []) if cid in idx]
    if len(ids) < 2:
        return 'Pick at least two count columns (the levels of the second variable).'
    jl = next((j for j, c in enumerate(cols) if c.get('role') == 'label'), None)
    cnames = [name[cid] for cid in ids]
    jcols = [idx[cid] for cid in ids]
    rlabels, mat = [], []
    for ri, row in enumerate(dataset['rows']):
        vals, ok = [], False
        for jpos, j in enumerate(jcols):
            v = row[j] if j < len(row) else None
            if v is None or v == '':
                vals.append(0.0)
                continue
            try:
                f = float(v)
            except (TypeError, ValueError):
                f = None
            if f is None or not math.isfinite(f) or f < 0:
                return ("Contingency counts must be whole non-negative numbers -- cell '%s' in "
                        "row %d, column '%s' isn't a valid count." % (v, ri + 1, cnames[jpos]))
            vals.append(f)
            ok = True
        if not ok:
            continue
        lab = row[jl] if (jl is not None and jl < len(row)) else None
        rlabels.append(str(lab) if lab is not None else 'Row %d' % (len(rlabels) + 1))
        mat.append(vals)
    if len(mat) < 2:
        return 'A contingency table needs at least two category rows with counts.'
    return cnames, rlabels, np.array(mat, dtype=float)

def _two_by_two(dataset, spec):
    m = _contingency_matrix(dataset, spec)
    if isinstance(m, str):
        return m
    cnames, rlabels, mat = m
    if mat.shape != (2, 2):
        return ('This test needs a 2x2 table: exactly two count columns and two category '
                'rows (this is %dx%d).' % (mat.shape[0], mat.shape[1]))
    return cnames, rlabels, mat

def _stacked_proportions(cnames, rlabels, mat):
    mat = np.array(mat, dtype=float)
    totals = mat.sum(axis=1, keepdims=True)
    totals[totals == 0] = 1.0
    prop = mat / totals
    x = np.arange(len(rlabels))
    fig, ax = plt.subplots(figsize=(4.6, 3.3))
    bottom = np.zeros(len(rlabels))
    for j, cn in enumerate(cnames):
        ax.bar(x, prop[:, j], bottom=bottom, label=cn, color=_PALETTE[j % len(_PALETTE)])
        bottom += prop[:, j]
    ax.set_xticks(x)
    ax.set_xticklabels(rlabels, rotation=18, ha='right')
    ax.set_ylabel('Proportion')
    ax.set_ylim(0, 1)
    ax.legend(fontsize=7, ncol=min(len(cnames), 3))
    fig.tight_layout()
    return _svg(fig)

def _chi_square(dataset, spec):
    m = _contingency_matrix(dataset, spec)
    if isinstance(m, str):
        return {'stats': {}, 'figures': [], 'error': m}
    cnames, rlabels, mat = m
    # Drop all-zero rows/columns so chi2_contingency never divides by a zero
    # margin -- keep the labels in step with what we drop.
    keep_r = [i for i in range(mat.shape[0]) if mat[i].sum() > 0]
    keep_c = [j for j in range(mat.shape[1]) if mat[:, j].sum() > 0]
    mat = mat[np.ix_(keep_r, keep_c)]
    rlabels = [rlabels[i] for i in keep_r]
    cnames = [cnames[j] for j in keep_c]
    if mat.shape[0] < 2 or mat.shape[1] < 2:
        return {'stats': {}, 'figures': [],
                'error': 'After dropping empty rows/columns there is nothing to test -- a '
                         'chi-square needs at least a 2x2 table with counts.'}
    chi2, p, dof, expected = stats.chi2_contingency(mat)  # Yates default for 2x2
    n = float(mat.sum())
    k = min(mat.shape) - 1
    cramers_v = math.sqrt(chi2 / (n * k)) if (n > 0 and k > 0) else 0.0
    min_exp = float(expected.min())
    is2x2 = mat.shape == (2, 2)
    if min_exp >= 5:
        exp_note = 'smallest expected = %.2f' % min_exp
    elif is2x2:
        exp_note = "smallest expected = %.2f -- use Fisher's exact instead" % min_exp
    else:
        exp_note = 'smallest expected = %.2f -- combine sparse categories' % min_exp
    exp_rows = [[rlabels[i]] + [_fin(float(expected[i][j])) for j in range(len(cnames))]
                for i in range(len(rlabels))]
    return {
        'stats': {'chi-square': _fin(chi2), 'df': int(dof), 'p': _fin(p),
                  "Cramer's V": _fin(cramers_v), 'N': int(n),
                  'Yates correction': 'yes (2x2)' if is2x2 else 'no'},
        'tables': [{'title': 'Expected counts (if the variables were independent)',
                    'columns': ['Category'] + cnames, 'rows': exp_rows}],
        'figures': [_stacked_proportions(cnames, rlabels, mat)],
        'assumptions': [{'label': 'Expected counts >= 5 (chi-square validity)',
                         'passed': bool(min_exp >= 5.0), 'detail': exp_note}],
    }

def _observed_table(cnames, rlabels, mat):
    return {'title': 'Observed counts', 'columns': ['', cnames[0], cnames[1]],
            'rows': [[rlabels[0], _fin(float(mat[0][0])), _fin(float(mat[0][1]))],
                     [rlabels[1], _fin(float(mat[1][0])), _fin(float(mat[1][1]))]]}

def _fishers_exact(dataset, spec):
    m = _two_by_two(dataset, spec)
    if isinstance(m, str):
        return {'stats': {}, 'figures': [], 'error': m}
    cnames, rlabels, mat = m
    odds, p = stats.fisher_exact([[mat[0][0], mat[0][1]], [mat[1][0], mat[1][1]]],
                                 alternative='two-sided')
    return {
        'stats': {'odds ratio (sample)': _fin(odds), 'p (two-sided)': _fin(p)},
        'tables': [_observed_table(cnames, rlabels, mat)],
        'figures': [_stacked_proportions(cnames, rlabels, mat)],
        'assumptions': [{'label': 'Exact test -- valid for any counts, including small ones',
                         'passed': True,
                         'detail': 'No expected-count minimum, unlike chi-square.'}],
    }

def _relative_risk(dataset, spec):
    m = _two_by_two(dataset, spec)
    if isinstance(m, str):
        return {'stats': {}, 'figures': [], 'error': m}
    cnames, rlabels, mat = m
    a, b = float(mat[0][0]), float(mat[0][1])
    c, d = float(mat[1][0]), float(mat[1][1])
    n1, n2 = a + b, c + d
    if a == 0 or c == 0 or n1 == 0 or n2 == 0:
        return {'stats': {}, 'figures': [],
                'error': 'Relative risk is undefined when a row total or an event count is zero.'}
    r1, r2 = a / n1, c / n2  # descriptive risks -- always from the actual counts, uncorrected
    zero_cell = b == 0 or d == 0
    # b==0 or d==0 zeroes a term of the Woolf SE (ln-RR variance), silently narrowing the CI
    # with no caveat. statsmodels' Table2x2 defaults to shift_zeros=True, the standard
    # Haldane-Anscombe fix (0.5 added only to cells that are exactly 0) -- a no-op when no
    # cell is 0, so the well-formed path is untouched; RR and its CI both come from the same
    # (possibly shifted) table so they stay statistically coherent.
    from statsmodels.stats.contingency_tables import Table2x2
    t2 = Table2x2(mat, shift_zeros=True)
    rr = float(t2.riskratio)
    lo, hi = (float(x) for x in t2.riskratio_confint(0.05))
    assum = [{'label': 'Row 0 = exposed group, column 0 = the event',
              'passed': True,
              'detail': 'RR = P("%s" | "%s") / P("%s" | "%s").'
                        % (cnames[0], rlabels[0], cnames[0], rlabels[1])}]
    if zero_cell:
        assum.append({'label': 'Zero cell: Haldane-Anscombe correction applied',
                      'passed': True,
                      'detail': 'A cell in the table was 0, which would otherwise understate '
                                'the uncertainty; 0.5 was added to that cell before computing '
                                'the risk ratio and its CI (standard continuity correction).'})
    return {
        'stats': {'relative risk': _fin(rr), '95% CI low': _fin(lo), '95% CI high': _fin(hi),
                  'risk in %s' % rlabels[0]: _fin(r1), 'risk in %s' % rlabels[1]: _fin(r2),
                  'event counted': cnames[0]},
        'tables': [_observed_table(cnames, rlabels, mat)],
        'figures': [_stacked_proportions(cnames, rlabels, mat)],
        'assumptions': assum,
    }

def _odds_ratio(dataset, spec):
    m = _two_by_two(dataset, spec)
    if isinstance(m, str):
        return {'stats': {}, 'figures': [], 'error': m}
    cnames, rlabels, mat = m
    a, b = float(mat[0][0]), float(mat[0][1])
    c, d = float(mat[1][0]), float(mat[1][1])
    if a == 0 or b == 0 or c == 0 or d == 0:
        return {'stats': {}, 'figures': [],
                'error': 'The odds ratio is undefined when any cell is zero (a Haldane 0.5 '
                         'correction would be needed -- check your counts).'}
    orr = (a * d) / (b * c)
    se = math.sqrt(1.0 / a + 1.0 / b + 1.0 / c + 1.0 / d)  # Woolf SE of ln(OR)
    lo, hi = orr * math.exp(-1.96 * se), orr * math.exp(1.96 * se)
    return {
        'stats': {'odds ratio': _fin(orr), '95% CI low': _fin(lo), '95% CI high': _fin(hi),
                  'ln(OR) SE': _fin(se)},
        'tables': [_observed_table(cnames, rlabels, mat)],
        'figures': [_stacked_proportions(cnames, rlabels, mat)],
        'assumptions': [{'label': 'Woolf logit 95% CI', 'passed': True,
                         'detail': 'CI = exp(ln(OR) +/- 1.96 x SE); needs every cell > 0.'}],
    }

# ===========================================================================
# Phase D2c -- XY (correlation, linear regression, area under curve, smoothing)
# and Multiple-variables (correlation matrix, multiple regression). Completes
# Phase D's analysis library.
#
# DATA SHAPES:
#   XY               : one X column (role 'x', found by role like the Grouped
#                      row factor) read against the ONE selected Y column,
#                      aligned by ROW so a dropped point drops from both.
#   Multiple-vars    : the SELECTED y columns are the variables; a correlation
#                      matrix correlates every pair (pairwise-complete rows), a
#                      multiple regression predicts one chosen dependent from the
#                      rest. NaN marks a missing cell so alignment is preserved.
# ===========================================================================

# numpy 2.x renamed np.trapz -> np.trapezoid; keep working on either.
_trapz = getattr(np, 'trapezoid', getattr(np, 'trapz', None))

def _xy_pair(dataset, spec):
    # The one X column (role 'x') and the ONE selected Y column, aligned by row.
    # A row is dropped only when EITHER cell is missing, so x and y stay
    # index-matched. Returns (xname, yname, x, y) or an error STRING.
    cols = dataset['columns']
    idx = {c['id']: j for j, c in enumerate(cols)}
    name = {c['id']: c['name'] for c in cols}
    jx = next((j for j, c in enumerate(cols) if c.get('role') == 'x'), None)
    if jx is None:
        return ('An XY table needs an X column. Give one column the X role in the grid.')
    ids = [cid for cid in spec.get('columnIds', []) if cid in idx]
    if not ids:
        return 'Pick the Y column to analyze against X.'
    jy = idx[ids[0]]
    xs, ys = [], []
    for row in dataset['rows']:
        xv = row[jx] if jx < len(row) else None
        yv = row[jy] if jy < len(row) else None
        try:
            fx, fy = float(xv), float(yv)
        except (TypeError, ValueError):
            continue
        if math.isfinite(fx) and math.isfinite(fy):
            xs.append(fx)
            ys.append(fy)
    return (cols[jx]['name'], name.get(ids[0], 'Y'),
            np.array(xs, dtype=float), np.array(ys, dtype=float))

def _scatter_base(x, y, xname, yname, title, opts=None):
    # Format Graph symbol (shape/size/fill) applies to the plotted points here;
    # Format Axes is applied later by the caller's _svg(fig, opts), so it lands
    # AFTER any fit line / CI band the caller overlays.
    fig, ax = plt.subplots(figsize=(4.6, 3.3))
    ax.scatter(x, y, zorder=3, **_sym_kw(opts, _PT, 18))
    ax.set_xlabel(xname)
    ax.set_ylabel(yname)
    ax.set_title(title)
    return fig, ax

def _correlation(dataset, spec):
    pr = _xy_pair(dataset, spec)
    if isinstance(pr, str):
        return {'stats': {}, 'figures': [], 'error': pr}
    xname, yname, x, y = pr
    n = int(x.size)
    if n < 3:
        return {'stats': {}, 'figures': [],
                'error': 'Correlation needs at least three paired points; %d here.' % n}
    if float(np.std(x)) == 0.0 or float(np.std(y)) == 0.0:
        return {'stats': {}, 'figures': [],
                'error': 'One variable never changes, so a correlation is undefined (r would be '
                         '0/0). Correlation measures how two things vary together.'}
    r, p = stats.pearsonr(x, y)
    rs, ps = stats.spearmanr(x, y)
    r = float(r)
    # Fisher z 95% CI for Pearson r (only defined for |r| < 1, and only
    # estimable at n >= 4 -- at the minimum n=3, se=1/sqrt(n-3) divides by
    # zero-ish and used to collapse to a zero-width "CI", faking certainty).
    if n < 4:
        lo = hi = None
    elif abs(r) < 1.0:
        z = math.atanh(r)
        se = 1.0 / math.sqrt(n - 3)
        zc = float(stats.norm.ppf(0.975))
        lo, hi = math.tanh(z - zc * se), math.tanh(z + zc * se)
    else:
        lo = hi = r
    fig, ax = _scatter_base(x, y, xname, yname, '%s vs %s' % (yname, xname),
                            spec.get('options'))
    fig.tight_layout()
    assumptions = [{
        'label': 'Pearson assumes a LINEAR relationship; Spearman only monotonic',
        'passed': True,
        'detail': 'If Spearman is much larger than Pearson, the relationship is curved -- '
                  'trust Spearman and consider a nonlinear fit (Phase E).',
    }]
    if lo is None:
        assumptions.append({
            'label': '95% CI needs n >= 4',
            'passed': True,
            'detail': 'At the minimum n=3 the Fisher-z interval is undefined; r and p above are '
                      'still valid, but no confidence interval is shown.',
        })
    return {
        'stats': {
            'Pearson r': _fin(r), 'Pearson p': _fin(p), 'r squared': _fin(r * r),
            '95% CI low': _fin(lo), '95% CI high': _fin(hi),
            'Spearman r': _fin(rs), 'Spearman p': _fin(ps), 'n': n,
        },
        'figures': [_svg(fig, spec.get('options'))],
        'assumptions': assumptions,
    }

def _linear_regression(dataset, spec):
    pr = _xy_pair(dataset, spec)
    if isinstance(pr, str):
        return {'stats': {}, 'figures': [], 'error': pr}
    xname, yname, x, y = pr
    n = int(x.size)
    if n < 3:
        return {'stats': {}, 'figures': [],
                'error': 'Linear regression needs at least three points; %d here.' % n}
    if float(np.std(x)) == 0.0:
        return {'stats': {}, 'figures': [],
                'error': 'Every X is the same value (a vertical line), so a slope is undefined.'}
    import statsmodels.api as sm
    X = sm.add_constant(x)
    model = sm.OLS(y, X).fit()
    intercept = float(model.params[0])
    slope = float(model.params[1])
    se_slope = float(model.bse[1])
    ci = np.asarray(model.conf_int(0.05), dtype=float)
    slope_lo, slope_hi = float(ci[1][0]), float(ci[1][1])
    syx = math.sqrt(float(model.mse_resid)) if float(model.df_resid) > 0 else 0.0
    # scatter + fit line + 95% mean-response CI band
    gx = np.linspace(float(np.min(x)), float(np.max(x)), 100)
    band = np.asarray(model.get_prediction(sm.add_constant(gx)).conf_int(alpha=0.05), dtype=float)
    fig, ax = _scatter_base(x, y, xname, yname,
                            '%s = %.4g + %.4g * %s' % (yname, intercept, slope, xname),
                            spec.get('options'))
    ax.plot(gx, intercept + slope * gx, color=_BAR, lw=2, zorder=4)
    ax.fill_between(gx, band[:, 0], band[:, 1], color=_BAR, alpha=0.18, zorder=2)
    fig.tight_layout()
    fit_svg = _svg(fig, spec.get('options'))
    resid = np.asarray(model.resid, dtype=float)
    rfig, rax = plt.subplots(figsize=(4.6, 2.6))
    rax.axhline(0, color=_BAR, lw=1)
    rax.scatter(x, resid, color=_PT, s=16, zorder=3)
    rax.set_xlabel(xname)
    rax.set_ylabel('Residual')
    rax.set_title('Residuals (should scatter evenly around 0)')
    rfig.tight_layout()
    resid_svg = _svg(rfig)
    assum = []
    if resid.size >= 3:
        sh = stats.shapiro(resid)
        assum.append({'label': 'Normality of residuals (Shapiro-Wilk)',
                      'passed': bool(sh.pvalue >= 0.05), 'detail': 'p = %.4f' % sh.pvalue})
    return {
        'stats': {
            'slope': _fin(slope), 'intercept': _fin(intercept),
            'R squared': _fin(float(model.rsquared)),
            'adjusted R squared': _fin(float(model.rsquared_adj)),
            'slope SE': _fin(se_slope), 'slope 95% CI low': _fin(slope_lo),
            'slope 95% CI high': _fin(slope_hi), 'Sy.x (RMSE)': _fin(syx),
            'n': n, 'df': int(model.df_resid),
        },
        'figures': [fit_svg, resid_svg],
        'assumptions': assum,
    }

def _area_under_curve(dataset, spec):
    pr = _xy_pair(dataset, spec)
    if isinstance(pr, str):
        return {'stats': {}, 'figures': [], 'error': pr}
    xname, yname, x, y = pr
    n = int(x.size)
    if n < 2:
        return {'stats': {}, 'figures': [],
                'error': 'Area under the curve needs at least two points to integrate between.'}
    order = np.argsort(x)
    xs, ys = x[order], y[order]
    auc = float(_trapz(ys, xs))
    base = float(np.min(ys))
    auc_base = float(_trapz(ys - base, xs))
    fig, ax = plt.subplots(figsize=(4.6, 3.3))
    ax.plot(xs, ys, color=_BAR, lw=1.6, marker='o', markersize=4, zorder=3)
    ax.fill_between(xs, ys, 0, color=_BAR, alpha=0.22, zorder=2)
    ax.set_xlabel(xname)
    ax.set_ylabel(yname)
    ax.set_title('Area under %s vs %s' % (yname, xname))
    fig.tight_layout()
    return {
        'stats': {'AUC (total)': _fin(auc), 'AUC above baseline': _fin(auc_base),
                  'baseline (min y)': _fin(base),
                  'x from': _fin(float(xs[0])), 'x to': _fin(float(xs[-1])), 'points': n},
        'figures': [_svg(fig)],
        'assumptions': [{'label': 'Trapezoidal rule (numpy.trapezoid)', 'passed': True,
                         'detail': 'Straight segments between points; more points = closer to the '
                                   'true area. Total integrates from y=0; the baseline row subtracts '
                                   'the smallest y first.'}],
    }

def _smoothing(dataset, spec):
    pr = _xy_pair(dataset, spec)
    if isinstance(pr, str):
        return {'stats': {}, 'figures': [], 'error': pr}
    xname, yname, x, y = pr
    n = int(x.size)
    if n < 2:
        return {'stats': {}, 'figures': [],
                'error': 'Smoothing needs at least two points.'}
    order = np.argsort(x)
    xs, ys = x[order], y[order]
    opts = spec.get('options') or {}
    smoother = opts.get('smoother') or 'moving-average'
    if smoother == 'lowess':
        from statsmodels.nonparametric.smoothers_lowess import lowess
        frac = min(1.0, max(0.3, 5.0 / n))
        out = np.asarray(lowess(ys, xs, frac=frac, return_sorted=True), dtype=float)
        sx, sy = out[:, 0], out[:, 1]
        label = 'LOWESS (frac %.2f)' % frac
    else:
        w = int(opts.get('window') or 3)
        w = max(2, min(w, n))
        kernel = np.ones(w) / float(w)
        sy = np.convolve(ys, kernel, mode='valid')
        # Each smoothed point sits at the mean X of the window it averages.
        sx = np.array([float(np.mean(xs[i:i + w])) for i in range(sy.size)], dtype=float)
        label = 'Moving average (window %d)' % w
    fig, ax = _scatter_base(xs, ys, xname, yname, '%s smoothed' % yname)
    ax.plot(sx, sy, color=_BAR, lw=2, zorder=4, label=label)
    ax.legend(fontsize=7)
    fig.tight_layout()
    trows = [[_fin(float(sx[i])), _fin(float(sy[i]))] for i in range(int(sy.size))]
    return {
        'stats': {'method': label, 'points': n, 'smoothed points': int(sy.size)},
        'tables': [{'title': 'Smoothed values (%s)' % label,
                    'columns': [xname, '%s (smoothed)' % yname], 'rows': trows}],
        'figures': [_svg(fig)],
        'assumptions': [{'label': 'A display transform, not a fit', 'passed': True,
                         'detail': 'Smoothing reveals a trend for the eye; it estimates no '
                                   'parameters and makes no claim you can test. Use regression '
                                   'for slopes and confidence intervals.'}],
    }

def _parts_fig(labels, vals, spec):
    kind = (spec.get('options') or {}).get('graph')
    colors = [_PALETTE[i % len(_PALETTE)] for i in range(len(vals))]
    fig, ax = plt.subplots(figsize=(4.6, 3.6))
    try:
        if kind == 'stacked':
            bottom = 0.0
            for i, (lab, v) in enumerate(zip(labels, vals)):
                ax.bar(0, v, bottom=bottom, color=colors[i], label=lab)
                bottom += v
            ax.set_xticks([])
            ax.set_ylabel('Value')
            ax.legend(fontsize=7, loc='center left', bbox_to_anchor=(1.0, 0.5))
        else:
            wedge = dict(width=0.42) if kind == 'donut' else None
            ax.pie(vals, labels=labels, autopct='%1.1f%%', colors=colors,
                   wedgeprops=wedge, textprops={'fontsize': 7})
            ax.set_aspect('equal')
    except Exception:
        plt.close(fig)
        fig, ax = plt.subplots(figsize=(4.6, 3.6))
        ax.bar(range(len(vals)), vals, color=_BAR)
    fig.tight_layout()
    return _svg(fig)

def _fraction_of_total(dataset, spec):
    cols = dataset['columns']
    idx = {c['id']: j for j, c in enumerate(cols)}
    ids = [cid for cid in spec.get('columnIds', []) if cid in idx]
    if not ids:
        return {'stats': {}, 'figures': [], 'error': 'Pick the value column that sums to the whole.'}
    jv = idx[ids[0]]
    jl = next((j for j, c in enumerate(cols) if c.get('role') == 'label'), None)
    labels, vals = [], []
    for ri, row in enumerate(dataset['rows']):
        v = row[jv] if jv < len(row) else None
        if v is None or v == '':
            continue
        try:
            f = float(v)
        except (TypeError, ValueError):
            return {'stats': {}, 'figures': [],
                    'error': "Parts must be numbers -- cell '%s' in row %d isn't one." % (v, ri + 1)}
        if not math.isfinite(f):
            continue
        if f < 0:
            return {'stats': {}, 'figures': [],
                    'error': 'Parts of a whole must be zero or positive; row %d is negative (%g). '
                             'A fraction of a total is not defined for negative parts.' % (ri + 1, f)}
        lab = row[jl] if (jl is not None and jl < len(row)) else None
        labels.append(str(lab) if lab not in (None, '') else 'Part %d' % (len(labels) + 1))
        vals.append(f)
    if not vals:
        return {'stats': {}, 'figures': [], 'error': 'No numeric values to total.'}
    total = float(sum(vals))
    if total == 0.0:
        return {'stats': {}, 'figures': [],
                'error': 'The values sum to zero, so a fraction of the whole is undefined.'}
    cum = 0.0
    trows = []
    for lab, v in zip(labels, vals):
        pct = 100.0 * v / total
        cum += pct
        trows.append([lab, _fin(v), _fin(pct), _fin(cum)])
    return {
        'stats': {'total': _fin(total), 'parts': len(vals),
                  'largest share %': _fin(100.0 * max(vals) / total)},
        'tables': [{'title': 'Each part as a fraction of the whole',
                    'columns': ['Part', 'Value', 'Percent', 'Cumulative %'], 'rows': trows}],
        'figures': [_parts_fig(labels, vals, spec)],
        'assumptions': [{'label': 'The parts sum to a whole', 'passed': True,
                         'detail': 'Percent = value / total x 100; here the parts total %.6g.' % total}],
    }

def _multi_columns(dataset, spec):
    # Selected variable columns read row-aligned, NaN for a missing/non-numeric
    # cell (so pairwise-complete correlation and complete-case regression can
    # both work off one matrix). Returns (ids, names, M) with M shape (rows, k).
    cols = dataset['columns']
    idx = {c['id']: j for j, c in enumerate(cols)}
    name = {c['id']: c['name'] for c in cols}
    ids = [cid for cid in spec.get('columnIds', []) if cid in idx]
    names = [name[cid] for cid in ids]
    js = [idx[cid] for cid in ids]
    mat = []
    for row in dataset['rows']:
        vals = []
        for j in js:
            v = row[j] if j < len(row) else None
            try:
                f = float(v)
            except (TypeError, ValueError):
                f = float('nan')
            vals.append(f if math.isfinite(f) else float('nan'))
        mat.append(vals)
    M = np.array(mat, dtype=float) if mat else np.empty((0, len(ids)), dtype=float)
    return ids, names, M

def _corr_heatmap(names, rmat):
    k = len(names)
    A = np.array([[np.nan if rmat[i][j] is None else rmat[i][j] for j in range(k)]
                  for i in range(k)], dtype=float)
    fig, ax = plt.subplots(figsize=(0.7 * k + 2.4, 0.7 * k + 2.0))
    im = ax.imshow(A, vmin=-1, vmax=1, cmap='coolwarm')
    ax.set_xticks(range(k))
    ax.set_xticklabels(names, rotation=30, ha='right', fontsize=7)
    ax.set_yticks(range(k))
    ax.set_yticklabels(names, fontsize=7)
    for i in range(k):
        for j in range(k):
            if not np.isnan(A[i][j]):
                ax.text(j, i, '%.2f' % A[i][j], ha='center', va='center', fontsize=7,
                        color='white' if abs(A[i][j]) > 0.5 else 'black')
    fig.colorbar(im, ax=ax, shrink=0.85)
    fig.tight_layout()
    return _svg(fig)

def _correlation_matrix(dataset, spec):
    ids, names, M = _multi_columns(dataset, spec)
    k = len(names)
    if k < 2:
        return {'stats': {}, 'figures': [],
                'error': 'A correlation matrix needs at least two variables; %d selected.' % k}
    if M.shape[0] < 3:
        return {'stats': {}, 'figures': [],
                'error': 'Need at least three rows of data to correlate.'}
    method = (spec.get('options') or {}).get('method') or 'pearson'
    rmat = [[None] * k for _ in range(k)]
    pmat = [[None] * k for _ in range(k)]
    for i in range(k):
        rmat[i][i] = 1.0
        pmat[i][i] = 0.0
        for j in range(i + 1, k):
            ok = np.isfinite(M[:, i]) & np.isfinite(M[:, j])
            a, b = M[ok, i], M[ok, j]
            if a.size < 3 or float(np.std(a)) == 0.0 or float(np.std(b)) == 0.0:
                r = p = None
            elif method == 'spearman':
                rr, pp = stats.spearmanr(a, b)
                r, p = _fin(rr), _fin(pp)
            else:
                rr, pp = stats.pearsonr(a, b)
                r, p = _fin(rr), _fin(pp)
            rmat[i][j] = rmat[j][i] = r
            pmat[i][j] = pmat[j][i] = p
    rrows = [[names[i]] + [rmat[i][j] for j in range(k)] for i in range(k)]
    prows = [[names[i]] + [pmat[i][j] for j in range(k)] for i in range(k)]
    label = 'Spearman' if method == 'spearman' else 'Pearson'
    return {
        'stats': {'variables': k, 'method': label, 'rows': int(M.shape[0])},
        'tables': [
            {'title': '%s r (pairwise)' % label, 'columns': [''] + names, 'rows': rrows},
            {'title': 'p-values (pairwise)', 'columns': [''] + names, 'rows': prows},
        ],
        'figures': [_corr_heatmap(names, rmat)],
        'assumptions': [{'label': 'Pairwise complete observations', 'passed': True,
                         'detail': 'Each pair uses only the rows where both variables are present; '
                                   'a constant or too-sparse pair shows a blank cell, not a fake r.'}],
    }

def _multiple_regression(dataset, spec):
    ids, names, M = _multi_columns(dataset, spec)
    k = len(names)
    if k < 2:
        return {'stats': {}, 'figures': [],
                'error': 'Multiple regression needs a dependent variable and at least one predictor.'}
    opts = spec.get('options') or {}
    dep_id = opts.get('dependentColumnId') or ids[0]
    if dep_id not in ids:
        return {'stats': {}, 'figures': [],
                'error': 'The dependent variable is no longer among the selected columns. '
                         'Pick which variable to predict and re-run.'}
    di = ids.index(dep_id)
    pred_pos = [i for i in range(k) if i != di]
    npred = len(pred_pos)
    ok = np.all(np.isfinite(M), axis=1)
    data = M[ok]
    if data.shape[0] < npred + 2:
        return {'stats': {}, 'figures': [],
                'error': 'Not enough complete rows (%d) for %d predictor(s) -- you need more '
                         'subjects than predictors to fit.' % (int(data.shape[0]), npred)}
    y = data[:, di]
    Xp = data[:, pred_pos]
    # A constant (zero-variance) predictor makes sm.add_constant's default
    # has_constant='skip' see an existing constant column and add NO
    # intercept -- then Xc has npred columns but coef_names has npred+1,
    # and the coefficient loop below indexes out of bounds. Refuse first.
    zero_var = [names[pred_pos[j]] for j in range(npred) if float(np.std(Xp[:, j])) == 0.0]
    if zero_var:
        return {'stats': {}, 'figures': [],
                'error': "Predictor '%s' has no variation (every value is the same), so it "
                         "can't be used in a regression. Remove it and re-run." % zero_var[0]}
    import statsmodels.api as sm
    Xc = sm.add_constant(Xp)
    model = sm.OLS(y, Xc).fit()
    coef_names = ['(intercept)'] + [names[i] for i in pred_pos]
    trows = []
    for r_i, cn in enumerate(coef_names):
        trows.append([cn, _fin(float(model.params[r_i])), _fin(float(model.bse[r_i])),
                      _fin(float(model.tvalues[r_i])), _fin(float(model.pvalues[r_i]))])
    # Multicollinearity via VIF (predictors only; needs >= 2 predictors).
    vif_note = 'n/a (single predictor)'
    max_vif = None
    if npred >= 2:
        from statsmodels.stats.outliers_influence import variance_inflation_factor
        raw = []
        for col in range(1, Xc.shape[1]):
            try:
                raw.append(float(variance_inflation_factor(Xc, col)))
            except Exception:
                raw.append(float('inf'))
        finite = [v for v in raw if math.isfinite(v)]
        if not finite:
            max_vif = float('inf')
            vif_note = 'infinite -- predictors are perfectly collinear'
        else:
            max_vif = max(finite)
            if any(not math.isfinite(v) for v in raw):
                vif_note = 'at least one predictor is perfectly collinear (VIF infinite)'
            else:
                vif_note = 'max VIF = %.2f%s' % (max_vif, ' (>10: predictors overlap)'
                                                 if max_vif > 10 else '')
    assum = [{'label': 'Multicollinearity (VIF)',
              'passed': (max_vif is None) or (math.isfinite(max_vif) and max_vif <= 10),
              'detail': vif_note + '. A high VIF means two predictors carry the same information, '
                        'making their individual coefficients unstable.'}]
    resid = np.asarray(model.resid, dtype=float)
    if resid.size >= 3:
        sh = stats.shapiro(resid)
        assum.append({'label': 'Normality of residuals (Shapiro-Wilk)',
                      'passed': bool(sh.pvalue >= 0.05), 'detail': 'p = %.4f' % sh.pvalue})
    yhat = np.asarray(model.fittedvalues, dtype=float)
    fig, ax = plt.subplots(figsize=(4.4, 3.4))
    ax.scatter(yhat, y, color=_PT, s=18, zorder=3)
    lim = [float(min(yhat.min(), y.min())), float(max(yhat.max(), y.max()))]
    ax.plot(lim, lim, color=_BAR, lw=1.5, ls='--', zorder=2)
    ax.set_xlabel('Predicted %s' % names[di])
    ax.set_ylabel('Observed %s' % names[di])
    ax.set_title('Observed vs predicted')
    fig.tight_layout()
    return {
        'stats': {'dependent': names[di], 'predictors': npred,
                  'R squared': _fin(float(model.rsquared)),
                  'adjusted R squared': _fin(float(model.rsquared_adj)),
                  'F': _fin(float(model.fvalue)), 'p (F)': _fin(float(model.f_pvalue)),
                  'n': int(data.shape[0]), 'multicollinearity': vif_note},
        'tables': [{'title': 'Coefficients',
                    'columns': ['Term', 'Coefficient', 'SE', 't', 'p'], 'rows': trows}],
        'figures': [_svg(fig)],
        'assumptions': assum,
    }

# ===========================================================================
# Phase E1 -- Nonlinear regression, the equation library, model comparison, and
# standard-curve interpolation (plan section 5, phase E). SINGLE dataset only;
# multi-dataset global fitting (section 5.1) is phase E2 and is NOT here.
#
# The equation library is a keyed registry. Each entry carries a domain, a
# label, its parameter NAMES (the order fixes the layout of the per-parameter
# constraint arrays), a MODEL (a callable f(x, *params)), an INITIAL-VALUE rule
# expressed as a function of the data (p0(x, y) -> list) -- these data-driven
# seeds are what make curve_fit converge where a naive constant seed does not
# (plan section 5) -- and optional default BOUNDS (bnd(x, y) -> (lo, hi)) that
# keep a physical parameter (a rate, a width, a Km) on the correct side of zero.
#
# SECURITY: equationId / weighting / compareModel are ENUM options that only KEY
# this trusted registry, never interpolated into code. Per-parameter fix/bound
# constraints arrive as NUMBER arrays indexed by parameter position. No
# user-defined free-text equation reaches Python (that would be untrusted code
# needing a restricted-expression evaluator -- deferred, see the schema note).
# ===========================================================================

_INF = float('inf')

def _sorted_xy(x, y):
    o = np.argsort(x)
    return x[o], y[o]

def _span(x):
    s = float(np.max(x) - np.min(x))
    return s if s > 0 else 1.0

def _freq_guess(x, y):
    # Dominant frequency from mean-crossings: a full cycle crosses the mean
    # twice. Robust to uneven spacing; falls back to one cycle over the range.
    xs, ys = _sorted_xy(x, y)
    c = ys - float(np.mean(ys))
    crossings = int(np.sum(c[:-1] * c[1:] < 0))
    cycles = crossings / 2.0
    sp = _span(x)
    return cycles / sp if cycles >= 1 else 1.0 / sp

# ── models: f(x, *params) -- x is a numpy array, params are scalars ──────────

def _m_line(x, slope, intercept):
    return slope * x + intercept

def _m_line_origin(x, slope):
    return slope * x

def _m_exp_decay(x, Y0, Plateau, K):
    return (Y0 - Plateau) * np.exp(-K * x) + Plateau

def _m_exp_assoc(x, Y0, Plateau, K):
    return Y0 + (Plateau - Y0) * (1.0 - np.exp(-K * x))

def _m_exp_growth(x, Y0, K):
    return Y0 * np.exp(K * x)

def _m_dr3(x, Bottom, Top, logEC50):
    return Bottom + (Top - Bottom) / (1.0 + 10.0 ** (logEC50 - x))

def _m_dr4(x, Bottom, Top, logEC50, HillSlope):
    return Bottom + (Top - Bottom) / (1.0 + 10.0 ** ((logEC50 - x) * HillSlope))

def _m_mm(x, Vmax, Km):
    return Vmax * x / (Km + x)

def _m_binding(x, Bmax, Kd):
    return Bmax * x / (Kd + x)

def _m_logistic(x, L, k, x0):
    return L / (1.0 + np.exp(-k * (x - x0)))

def _m_gompertz(x, A, B, C):
    return A * np.exp(-B * np.exp(-C * x))

def _m_gaussian(x, Amp, Center, Width):
    return Amp * np.exp(-((x - Center) ** 2) / (2.0 * Width ** 2))

def _m_sine(x, Amp, Freq, Phase, Offset):
    return Amp * np.sin(2.0 * math.pi * Freq * x + Phase) + Offset

def _m_damped_sine(x, Amp, Tau, Freq, Phase, Offset):
    return Amp * np.exp(-x / Tau) * np.sin(2.0 * math.pi * Freq * x + Phase) + Offset

def _m_power(x, a, b):
    return a * np.power(x, b)

# ── initial-value rules: p0(x, y) -> [seed per parameter] (the convergence key) ──

def _p0_line(x, y):
    b = np.polyfit(x, y, 1)
    return [float(b[0]), float(b[1])]

def _p0_line_origin(x, y):
    sx = float(np.sum(x * x))
    return [float(np.sum(x * y) / sx) if sx > 0 else 1.0]

def _p0_exp_decay(x, y):
    xs, ys = _sorted_xy(x, y)
    return [float(ys[0]), float(ys[-1]), 1.0 / (0.3 * _span(x))]

def _p0_exp_assoc(x, y):
    xs, ys = _sorted_xy(x, y)
    return [float(ys[0]), float(ys[-1]), 1.0 / (0.3 * _span(x))]

def _p0_exp_growth(x, y):
    if np.all(y > 0):
        b = np.polyfit(x, np.log(y), 1)
        return [float(np.exp(b[1])), float(b[0])]
    return [float(np.mean(y)) or 1.0, 1.0 / _span(x)]

def _p0_dr3(x, y):
    return [float(np.min(y)), float(np.max(y)), float(np.median(x))]

def _p0_dr4(x, y):
    return [float(np.min(y)), float(np.max(y)), float(np.median(x)), 1.0]

def _p0_mm(x, y):
    return [float(np.max(y)) * 1.05, float(np.median(x))]

def _p0_binding(x, y):
    return [float(np.max(y)) * 1.05, float(np.median(x))]

def _p0_logistic(x, y):
    return [float(np.max(y)) * 1.05, 4.0 / _span(x), float(np.median(x))]

def _p0_gompertz(x, y):
    A = float(np.max(y)) * 1.05
    xs, ys = _sorted_xy(x, y)
    y0 = float(ys[0])
    B = math.log(A / y0) if (y0 > 0 and A > y0) else 1.0
    return [A, max(B, 0.1), 1.0 / _span(x)]

def _p0_gaussian(x, y):
    i = int(np.argmax(y))
    return [float(np.max(y)), float(x[i]), _span(x) / 6.0]

def _p0_sine(x, y):
    amp = (float(np.max(y)) - float(np.min(y))) / 2.0
    return [amp if amp > 0 else 1.0, _freq_guess(x, y), 0.0, float(np.mean(y))]

def _p0_damped_sine(x, y):
    amp = (float(np.max(y)) - float(np.min(y))) / 2.0
    return [amp if amp > 0 else 1.0, _span(x), _freq_guess(x, y), 0.0, float(np.mean(y))]

def _p0_power(x, y):
    if np.all(x > 0) and np.all(y > 0):
        b = np.polyfit(np.log(x), np.log(y), 1)
        return [float(np.exp(b[1])), float(b[0])]
    return [1.0, 1.0]

# lo/hi bound rules for the parameters that must stay physical (a rate, a
# width, a frequency > 0). Everything else is unconstrained by default; a
# student can still add explicit bounds per parameter.
def _bnd(lo):
    return lambda x, y: (list(lo), [_INF] * len(lo))

_EQUATIONS = {
    'line': {'domain': 'Lines', 'label': 'Straight line',
             'params': ['Slope', 'Intercept'], 'model': _m_line, 'p0': _p0_line},
    'line-origin': {'domain': 'Lines', 'label': 'Line through origin',
                    'params': ['Slope'], 'model': _m_line_origin, 'p0': _p0_line_origin},
    'exp-decay-1phase': {'domain': 'Exponential', 'label': 'One-phase decay',
                         'params': ['Y0', 'Plateau', 'K'], 'model': _m_exp_decay,
                         'p0': _p0_exp_decay, 'bounds': _bnd([-_INF, -_INF, 0.0])},
    'exp-assoc-1phase': {'domain': 'Exponential', 'label': 'One-phase association',
                         'params': ['Y0', 'Plateau', 'K'], 'model': _m_exp_assoc,
                         'p0': _p0_exp_assoc, 'bounds': _bnd([-_INF, -_INF, 0.0])},
    'exp-growth': {'domain': 'Exponential', 'label': 'Exponential growth',
                   'params': ['Y0', 'K'], 'model': _m_exp_growth, 'p0': _p0_exp_growth},
    'dr-3param': {'domain': 'Dose-response',
                  'label': 'log(dose) vs response (3-parameter, EC50)',
                  'params': ['Bottom', 'Top', 'logEC50'], 'model': _m_dr3, 'p0': _p0_dr3},
    'dr-4param': {'domain': 'Dose-response',
                  'label': 'log(dose) vs response (variable slope, 4-parameter Hill)',
                  'params': ['Bottom', 'Top', 'logEC50', 'HillSlope'],
                  'model': _m_dr4, 'p0': _p0_dr4},
    'michaelis-menten': {'domain': 'Enzyme kinetics', 'label': 'Michaelis-Menten',
                         'params': ['Vmax', 'Km'], 'model': _m_mm, 'p0': _p0_mm,
                         'bounds': _bnd([-_INF, 0.0])},
    'one-site-binding': {'domain': 'Binding', 'label': 'One-site specific binding',
                         'params': ['Bmax', 'Kd'], 'model': _m_binding, 'p0': _p0_binding,
                         'bounds': _bnd([-_INF, 0.0])},
    'logistic': {'domain': 'Growth', 'label': 'Logistic growth',
                 'params': ['L', 'k', 'x0'], 'model': _m_logistic, 'p0': _p0_logistic},
    'gompertz': {'domain': 'Growth', 'label': 'Gompertz growth',
                 'params': ['A', 'B', 'C'], 'model': _m_gompertz, 'p0': _p0_gompertz,
                 'bounds': _bnd([-_INF, 0.0, 0.0])},
    'gaussian': {'domain': 'Peaks', 'label': 'Gaussian',
                 'params': ['Amp', 'Center', 'Width'], 'model': _m_gaussian,
                 'p0': _p0_gaussian, 'bounds': _bnd([-_INF, -_INF, 0.0])},
    'sine': {'domain': 'Oscillation', 'label': 'Sine wave',
             'params': ['Amp', 'Freq', 'Phase', 'Offset'], 'model': _m_sine,
             'p0': _p0_sine, 'bounds': _bnd([-_INF, 0.0, -_INF, -_INF])},
    'damped-sine': {'domain': 'Oscillation', 'label': 'Damped sine wave',
                    'params': ['Amp', 'Tau', 'Freq', 'Phase', 'Offset'],
                    'model': _m_damped_sine, 'p0': _p0_damped_sine,
                    'bounds': _bnd([-_INF, 0.0, 0.0, -_INF, -_INF])},
    'power': {'domain': 'Power', 'label': 'Power (y = a*x^b)',
              'params': ['a', 'b'], 'model': _m_power, 'p0': _p0_power},
}

# Declared NESTED pairs: simple_id -> complex_id, where the simpler equation IS
# the complex one with a parameter fixed to a specific value (dr-3param =
# dr-4param with HillSlope fixed to 1; line-origin = line with intercept fixed
# to 0). The extra-sum-of-squares F test is only statistically valid between a
# declared nested pair -- any other pair is compared by AICc only (plan Sec 5).
# One line per future nested pair (e.g. a two-phase model nested in itself
# with one phase's fraction fixed to 0).
_NESTED = {
    'dr-3param': 'dr-4param',
    'line-origin': 'line',
}

def _is_nested(simple_id, complex_id):
    return _NESTED.get(simple_id) == complex_id

def _clamp(v, lo, hi):
    # Nudge a seed strictly inside its bounds -- curve_fit's trust-region solver
    # rejects a starting point that sits exactly on a bound.
    if math.isfinite(lo) and v <= lo:
        v = lo + (abs(lo) + 1.0) * 1e-6
    if math.isfinite(hi) and v >= hi:
        v = hi - (abs(hi) + 1.0) * 1e-6
    return v

def _weights(y, w):
    # Per-point sigma for curve_fit (weight = 1/sigma^2). Prism's weighting menu:
    #   none      -> equal weights
    #   1/Y^2     -> sigma = |Y|      (constant relative error)
    #   1/Y       -> sigma = sqrt|Y|
    #   poisson   -> sigma = sqrt|Y|  (variance ~ mean, counting data)
    # 1/SD^2 (replicate weighting) needs replicate subcolumns and is deferred.
    if not w or w == 'none':
        return None
    ay = np.abs(np.asarray(y, dtype=float))
    if w == '1/Y2':
        s = ay.copy()
    elif w in ('1/Y', 'poisson'):
        s = np.sqrt(ay)
    else:
        return None
    s = s.astype(float)
    bad = ~np.isfinite(s) | (s <= 0)
    if np.any(bad):
        good = s[~bad]
        fill = float(np.median(good)) if good.size else 1.0
        s[bad] = fill if fill > 0 else 1.0
    return s

def _fit(eq, x, y, opts):
    # Fit ONE equation to (x, y). Returns a rich dict, or {'error': msg} when the
    # fit does not converge -- callers must NEVER report best-fit values from a
    # dict carrying 'error' (plan section 5.1 point 6 applies to single fits too).
    from scipy.optimize import curve_fit
    model = eq['model']
    params = eq['params']
    p = len(params)
    n = int(x.size)
    p0 = [float(v) for v in eq['p0'](x, y)]
    dlo, dhi = eq['bounds'](x, y) if eq.get('bounds') else ([-_INF] * p, [_INF] * p)
    fixv = opts.get('fixValues') or []
    blo = opts.get('boundsLow') or []
    bhi = opts.get('boundsHigh') or []
    fixed = [fixv[i] if i < len(fixv) and fixv[i] is not None else None for i in range(p)]
    lo = [float(blo[i]) if i < len(blo) and blo[i] is not None else dlo[i] for i in range(p)]
    hi = [float(bhi[i]) if i < len(bhi) and bhi[i] is not None else dhi[i] for i in range(p)]
    free = [i for i in range(p) if fixed[i] is None]
    if not free:
        return {'error': 'Every parameter is fixed -- there is nothing to fit. Free at least one.'}
    if n < len(free) + 1:
        return {'error': 'Need more data points (%d) than free parameters (%d) to fit -- add '
                         'points or fix a parameter.' % (n, len(free))}

    def wrapped(xv, *fv):
        full = []
        k = 0
        for i in range(p):
            if fixed[i] is None:
                full.append(fv[k]); k += 1
            else:
                full.append(fixed[i])
        return model(xv, *full)

    p0_free = [_clamp(p0[i], lo[i], hi[i]) for i in free]
    lo_free = [lo[i] for i in free]
    hi_free = [hi[i] for i in free]
    sigma = _weights(y, opts.get('weighting'))
    bounded = any(math.isfinite(v) for v in lo_free) or any(math.isfinite(v) for v in hi_free)
    try:
        if bounded:
            popt_free, pcov = curve_fit(wrapped, x, y, p0=p0_free, sigma=sigma,
                                        absolute_sigma=False, bounds=(lo_free, hi_free),
                                        maxfev=20000)
        else:
            popt_free, pcov = curve_fit(wrapped, x, y, p0=p0_free, sigma=sigma,
                                        absolute_sigma=False, maxfev=20000)
    except (RuntimeError, ValueError, TypeError) as e:
        return {'error': 'The fit did not converge (%s). Try a different equation, a better '
                         'starting guess, or fix/bound a parameter.' % str(e)[:100]}
    pcov = np.asarray(pcov, dtype=float)
    if pcov.size == 0 or not np.all(np.isfinite(pcov)):
        return {'error': 'The fit did not converge to identifiable parameters (the covariance is '
                         'undefined). This equation is likely too complex for this data -- try a '
                         'simpler one, or fix/bound a parameter.'}
    full, se = [], []
    var = np.diag(pcov)
    k = 0
    for i in range(p):
        if fixed[i] is None:
            full.append(float(popt_free[k]))
            se.append(float(math.sqrt(var[k])) if var[k] >= 0 else None)
            k += 1
        else:
            full.append(float(fixed[i]))
            se.append(None)
    yv = np.asarray(y, dtype=float)
    resid = yv - model(x, *full)
    ss_res = float(np.sum(resid ** 2))
    ss_tot = float(np.sum((yv - np.mean(yv)) ** 2))
    dof = n - len(free)
    r2 = (1.0 - ss_res / ss_tot) if ss_tot > 0 else None
    adj = (1.0 - (1.0 - r2) * (n - 1) / dof) if (r2 is not None and dof > 0) else None
    syx = math.sqrt(ss_res / dof) if dof > 0 else None
    return {'params': params, 'full': full, 'se': se, 'fixed': fixed, 'free': free,
            'pcov': pcov, 'resid': resid, 'ss_res': ss_res, 'ss_tot': ss_tot, 'dof': dof,
            'nfree': len(free), 'r2': r2, 'adj': adj, 'syx': syx, 'n': n, 'model': model}

def _ci_band(fit, x):
    # 95% CI band of the mean response by the delta method: se(x) =
    # sqrt(J . pcov . J^T), J the gradient of the model wrt the FREE parameters
    # (numerical) at each x -- the nonlinear analogue of the OLS band.
    model, full, free, pcov, dof = fit['model'], fit['full'], fit['free'], fit['pcov'], fit['dof']
    gx = np.linspace(float(np.min(x)), float(np.max(x)), 120)
    yfit = np.asarray(model(gx, *full), dtype=float)
    J = np.zeros((gx.size, len(free)))
    for col, i in enumerate(free):
        step = 1e-6 * (abs(full[i]) + 1e-6)
        pp = list(full); pp[i] = full[i] + step
        J[:, col] = (np.asarray(model(gx, *pp), dtype=float) - yfit) / step
    band_var = np.einsum('ij,jk,ik->i', J, pcov, J)
    se = np.sqrt(np.clip(band_var, 0.0, None))
    tcrit = float(stats.t.ppf(0.975, dof)) if dof > 0 else 0.0
    return gx, yfit, yfit - tcrit * se, yfit + tcrit * se

def _param_table(fit):
    rows = []
    dof = fit['dof']
    tcrit = float(stats.t.ppf(0.975, dof)) if dof > 0 else None
    for i, name in enumerate(fit['params']):
        val, se = fit['full'][i], fit['se'][i]
        if fit['fixed'][i] is not None:
            rows.append([name + ' (fixed)', _fin(val), None, None, None])
        elif se is None or tcrit is None:
            rows.append([name, _fin(val), _fin(se), None, None])
        else:
            rows.append([name, _fin(val), _fin(se),
                         _fin(val - tcrit * se), _fin(val + tcrit * se)])
    return {'title': 'Best-fit parameters (value, SE, 95% CI)',
            'columns': ['Parameter', 'Best-fit', 'SE', '95% CI low', '95% CI high'], 'rows': rows}

def _aicc(n, ss, k_params):
    # Small-sample corrected AIC for a least-squares fit; K = params + variance.
    if ss <= 0 or n <= 0:
        return None
    K = k_params + 1
    if n - K - 1 <= 0:
        return None
    return float(n * math.log(ss / n) + 2 * K + (2.0 * K * (K + 1)) / (n - K - 1))

def _fit_figures(fit, x, y, xname, yname, title, opts=None):
    gx, yfit, blo, bhi = _ci_band(fit, x)
    fig, ax = _scatter_base(x, y, xname, yname, title, opts)
    ax.plot(gx, yfit, color=_BAR, lw=2, zorder=4)
    ax.fill_between(gx, blo, bhi, color=_BAR, alpha=0.18, zorder=2)
    fig.tight_layout()
    fit_svg = _svg(fig, opts)
    resid = fit['resid']
    rfig, rax = plt.subplots(figsize=(4.6, 2.6))
    rax.axhline(0, color=_BAR, lw=1)
    rax.scatter(x, resid, color=_PT, s=16, zorder=3)
    rax.set_xlabel(xname)
    rax.set_ylabel('Residual')
    rax.set_title('Residuals (should scatter evenly around 0)')
    rfig.tight_layout()
    return [fit_svg, _svg(rfig)]

def _nonlinear_regression(dataset, spec):
    pr = _xy_pair(dataset, spec)
    if isinstance(pr, str):
        return {'stats': {}, 'figures': [], 'error': pr}
    xname, yname, x, y = pr
    opts = spec.get('options') or {}
    eq_id = opts.get('equationId') or 'line'
    eq = _EQUATIONS.get(eq_id)
    if eq is None:
        return {'stats': {}, 'figures': [], 'error': 'Unknown equation: %s' % eq_id}
    if x.size < 2:
        return {'stats': {}, 'figures': [],
                'error': 'Nonlinear regression needs at least two points; %d here.' % int(x.size)}
    fit = _fit(eq, x, y, opts)
    if 'error' in fit:
        # Loud, honest non-convergence -- NO best-fit values shown.
        return {'stats': {}, 'figures': [], 'error': fit['error']}
    stats_out = {
        'equation': eq['label'],
        'R squared': _fin(fit['r2']),
        'adjusted R squared': _fin(fit['adj']),
        'Sy.x (RMSE)': _fin(fit['syx']),
        'degrees of freedom': fit['dof'],
        'n': fit['n'],
        'converged': 'yes',
    }
    w = opts.get('weighting')
    if w and w != 'none':
        stats_out['weighting'] = w
    tables = [_param_table(fit)]
    cmp_id = opts.get('compareModel')
    if cmp_id and cmp_id != eq_id and cmp_id in _EQUATIONS:
        # The F test is only valid when the simpler model is NESTED in (a
        # special case of) the complex one -- direction comes from the
        # DECLARED relation, not from which one the student fit as "primary",
        # so the test behaves the same regardless of which side they picked.
        cfit = _fit(_EQUATIONS[cmp_id], x, y,
                    {kk: vv for kk, vv in opts.items() if kk == 'weighting'})
        if 'error' not in cfit:
            if _is_nested(eq_id, cmp_id):
                sm, cx, sm_l, cx_l = fit, cfit, eq['label'], _EQUATIONS[cmp_id]['label']
            elif _is_nested(cmp_id, eq_id):
                sm, cx, sm_l, cx_l = cfit, fit, _EQUATIONS[cmp_id]['label'], eq['label']
            else:
                sm = cx = None
            n = fit['n']
            if sm is not None:
                # Nested pair: extra sum-of-squares F test, but ONLY when the
                # complex fit actually explains more variance -- ddf > 0 AND
                # the numerator (SS_simple - SS_complex) is >= 0. A worse
                # complex fit would otherwise print a negative, nonsense F.
                ddf = cx['nfree'] - sm['nfree']
                aicc_cx = _aicc(n, cx['ss_res'], cx['nfree'])
                aicc_sm = _aicc(n, sm['ss_res'], sm['nfree'])
                numerator = sm['ss_res'] - cx['ss_res']
                Fv = pv = preferred = None
                if ddf > 0 and cx['dof'] > 0 and cx['ss_res'] > 0 and numerator >= 0:
                    Fv = (numerator / ddf) / (cx['ss_res'] / cx['dof'])
                    pv = float(stats.f.sf(Fv, ddf, cx['dof']))
                    preferred = cx_l if pv < 0.05 else sm_l
                    stats_out['F (extra sum-of-squares)'] = _fin(Fv)
                    stats_out['p (F test)'] = _fin(pv)
                    stats_out['model the data support'] = preferred
                    title = 'Model comparison (extra sum-of-squares F test + AICc)'
                else:
                    if aicc_cx is not None and aicc_sm is not None:
                        preferred = cx_l if aicc_cx < aicc_sm else sm_l
                        stats_out['model favored by AICc'] = preferred
                    stats_out['model comparison note'] = (
                        'These are nested models, but the more complex fit did not improve on '
                        'the simpler one, so an F test would be meaningless here -- compared by '
                        'AICc (lower is better) instead.')
                    title = 'Model comparison (AICc only -- the complex fit did not improve the fit)'
                tables.append({
                    'title': title,
                    'columns': ['Model', 'Free params', 'SS residual', 'AICc'],
                    'rows': [[cx_l + ' (complex)', cx['nfree'], _fin(cx['ss_res']), _fin(aicc_cx)],
                             [sm_l + ' (simpler)', sm['nfree'], _fin(sm['ss_res']), _fin(aicc_sm)]],
                })
            else:
                # NOT a declared nested pair: the F test's core assumption
                # (the simpler model is a special case of the complex one)
                # is violated, so an F/p here would be a false claim of
                # rigor. Compare by AICc only -- NEVER emit an F or a p.
                aicc_a = _aicc(n, fit['ss_res'], fit['nfree'])
                aicc_b = _aicc(n, cfit['ss_res'], cfit['nfree'])
                if aicc_a is not None and aicc_b is not None:
                    stats_out['model favored by AICc'] = eq['label'] if aicc_a < aicc_b else _EQUATIONS[cmp_id]['label']
                stats_out['model comparison note'] = (
                    "These models aren't nested, so they're compared by AICc (lower is better), "
                    "not an F test.")
                tables.append({
                    'title': 'Model comparison (AICc only -- not nested)',
                    'columns': ['Model', 'Free params', 'SS residual', 'AICc'],
                    'rows': [[eq['label'], fit['nfree'], _fin(fit['ss_res']), _fin(aicc_a)],
                             [_EQUATIONS[cmp_id]['label'], cfit['nfree'], _fin(cfit['ss_res']), _fin(aicc_b)]],
                })
    assum = [{'label': 'The fit converged', 'passed': True,
              'detail': 'SEs and 95% CIs are from the covariance at the solution; a fit that did '
                        'not converge is reported as an error, never as best-fit values.'}]
    if fit['resid'].size >= 3:
        sh = stats.shapiro(fit['resid'])
        assum.append({'label': 'Normality of residuals (Shapiro-Wilk)',
                      'passed': bool(sh.pvalue >= 0.05), 'detail': 'p = %.4f' % sh.pvalue})
    return {'stats': stats_out, 'tables': tables,
            'figures': _fit_figures(fit, x, y, xname, yname, '%s fit +/- 95%% CI' % eq['label'],
                                    opts),
            'assumptions': assum}

def _interpolate_standard_curve(dataset, spec):
    pr = _xy_pair(dataset, spec)
    if isinstance(pr, str):
        return {'stats': {}, 'figures': [], 'error': pr}
    xname, yname, x, y = pr
    opts = spec.get('options') or {}
    eq_id = opts.get('equationId') or 'line'
    eq = _EQUATIONS.get(eq_id)
    if eq is None:
        return {'stats': {}, 'figures': [], 'error': 'Unknown equation: %s' % eq_id}
    y0 = opts.get('interpolateY')
    if y0 is None:
        return {'stats': {}, 'figures': [],
                'error': 'Enter the unknown response value to read off the standard curve.'}
    y0 = float(y0)
    if x.size < 2:
        return {'stats': {}, 'figures': [],
                'error': 'A standard curve needs at least two points; %d here.' % int(x.size)}
    fit = _fit(eq, x, y, opts)
    if 'error' in fit:
        return {'stats': {}, 'figures': [], 'error': fit['error']}
    model, full = fit['model'], fit['full']
    xmin, xmax = float(np.min(x)), float(np.max(x))
    pad = 0.05 * (xmax - xmin if xmax > xmin else 1.0)
    gx = np.linspace(xmin - pad, xmax + pad, 800)
    gy = np.asarray(model(gx, *full), dtype=float)
    cross = np.where(np.diff(np.sign(gy - y0)) != 0)[0]
    if cross.size == 0:
        return {'stats': {}, 'figures': [],
                'error': 'A response of %g is outside the fitted curve (%g to %g), so it cannot be '
                         'interpolated. Pick a value within the standard range.'
                         % (y0, float(np.min(gy)), float(np.max(gy)))}
    def _root_at(j):
        xa, xb, ya, yb = gx[j], gx[j + 1], gy[j], gy[j + 1]
        return float(xa + (y0 - ya) * (xb - xa) / (yb - ya)) if yb != ya else float(xa)
    i = int(cross[0])
    x1, x2, y1, y2 = gx[i], gx[i + 1], gy[i], gy[i + 1]
    x0 = float(x1 + (y0 - y1) * (x2 - x1) / (y2 - y1)) if y2 != y1 else float(x1)
    # A non-monotonic fitted curve (e.g. a Gaussian peak) can cross Y0 more
    # than once; the first crossing is still returned as the representative
    # X, but the student must be told it is not the only solution.
    multi_note = None
    if cross.size > 1:
        others = ', '.join('%.4g' % _root_at(int(j)) for j in cross[1:3])
        multi_note = ("This curve isn't monotonic -- Y=%g matches more than one X (e.g. %.4g, %s); "
                      "interpolation assumes a monotonic standard curve and reports the first match."
                      % (y0, x0, others))
    # Propagate the fit uncertainty to X: dX/dtheta = -(df/dtheta)/(df/dX) at x0
    # (implicit-function delta method), plus the one-observation scatter
    # (Sy.x)^2 / f'(x0)^2 -- Prism's standard-curve-with-CI, the ELISA workflow.
    hx = 1e-6 * (abs(x0) + 1.0)
    fp = float((model(np.array([x0 + hx]), *full)[0] - model(np.array([x0 - hx]), *full)[0])
               / (2.0 * hx))
    dof = fit['dof']
    ci_lo = ci_hi = se_x = None
    if fp != 0.0 and dof > 0:
        free, pcov = fit['free'], fit['pcov']
        g = np.zeros(len(free))
        base = float(model(np.array([x0]), *full)[0])
        for col, pi in enumerate(free):
            step = 1e-6 * (abs(full[pi]) + 1e-6)
            pp = list(full); pp[pi] = full[pi] + step
            g[col] = -((float(model(np.array([x0]), *pp)[0]) - base) / step) / fp
        var_param = float(g @ pcov @ g)
        syx = fit['syx'] or 0.0
        var_pred = (syx * syx) / (fp * fp)
        se_x = math.sqrt(max(var_param + var_pred, 0.0))
        tcrit = float(stats.t.ppf(0.975, dof))
        ci_lo, ci_hi = x0 - tcrit * se_x, x0 + tcrit * se_x
    gxr, yfit, blo, bhi = _ci_band(fit, x)
    fig, ax = _scatter_base(x, y, xname, yname, 'Standard curve: %s read off %s' % (y0, yname))
    ax.plot(gxr, yfit, color=_BAR, lw=2, zorder=4)
    ax.fill_between(gxr, blo, bhi, color=_BAR, alpha=0.18, zorder=2)
    ax.axhline(y0, color=_PT, lw=1, ls='--', zorder=3)
    ax.axvline(x0, color=_PT, lw=1, ls=':', zorder=3)
    ax.plot([x0], [y0], marker='o', color='#E45756', markersize=8, zorder=6)
    if ci_lo is not None:
        ax.plot([ci_lo, ci_hi], [y0, y0], color='#E45756', lw=2, zorder=5)
    fig.tight_layout()
    assum = [{'label': 'The 95% CI propagates the fit uncertainty', 'passed': True,
              'detail': 'It combines the standard-curve parameter uncertainty and the '
                        'scatter (Sy.x), and is only valid within the fitted range.'}]
    if multi_note is not None:
        assum.append({'label': 'The standard curve is monotonic', 'passed': False,
                      'detail': multi_note})
    return {
        'stats': {'equation': eq['label'], 'response (Y)': _fin(y0),
                  'interpolated X': _fin(x0), '95% CI low': _fin(ci_lo),
                  '95% CI high': _fin(ci_hi), 'SE of X': _fin(se_x),
                  'R squared': _fin(fit['r2']), 'n': fit['n']},
        'tables': [_param_table(fit)],
        'figures': [_svg(fig)],
        'assumptions': assum,
    }

# ===========================================================================
# Phase E2 -- Global fitting (plan section 5.1). K curves = one X column with
# MULTIPLE selected Y columns; each Y is a curve sharing the X (blank Y cells
# dropped per curve). All K curves are fit SIMULTANEOUSLY under one equation,
# where each (curve, parameter) is one of three states:
#   shared   -> one theta index used by every curve for that parameter
#   separate -> its own theta index per curve
#   fixed    -> NEVER enters theta; substituted at gather from a constants array
# and range constraints become least_squares' bounds.
#
# theta is a FLAT vector of only the UNIQUE parameters, plus a map
# param_map[k][j] -> index into theta (or None when parameter j is fixed). One
# residual function gathers each curve's parameters through the map and applies
# per-point weighting BEFORE stacking (or the largest-Y-magnitude curve
# dominates). res = least_squares(residuals, theta0, 'trf', bounds=(lo, hi)).
#
# SECURITY: paramModes is a bounded ENUM array, fTestParam / fixValues / bounds
# are NUMBERS, equationId keys the trusted registry. No free-form string reaches
# Python -- same closed-shape guarantee as the E1 single-curve fit.
# ===========================================================================

def _global_curves(dataset, spec):
    # The one X column (role 'x') vs EACH selected Y column, as K curves. Within
    # a curve a row is dropped only when X or that Y is missing, so x_k/y_k stay
    # index-matched. A selected Y column left with fewer than 2 usable (x, y)
    # points (e.g. entirely blank) is DROPPED rather than kept as a 0-point
    # "curve" -- that would silently inflate the reported curve count K and,
    # via the rank/dof math, the real curves' CIs. Returns
    # (xname, [(yname, x, y), ...], [skipped column names]) or an error STRING.
    cols = dataset['columns']
    idx = {c['id']: j for j, c in enumerate(cols)}
    name = {c['id']: c['name'] for c in cols}
    jx = next((j for j, c in enumerate(cols) if c.get('role') == 'x'), None)
    if jx is None:
        return 'An XY table needs an X column. Give one column the X role in the grid.'
    ids = [cid for cid in spec.get('columnIds', []) if cid in idx]
    if len(ids) < 2:
        return 'Global fitting needs at least two Y curves; select two or more Y columns.'
    curves, skipped = [], []
    for cid in ids:
        jy = idx[cid]
        xs, ys = [], []
        for row in dataset['rows']:
            xv = row[jx] if jx < len(row) else None
            yv = row[jy] if jy < len(row) else None
            try:
                fx, fy = float(xv), float(yv)
            except (TypeError, ValueError):
                continue
            if math.isfinite(fx) and math.isfinite(fy):
                xs.append(fx)
                ys.append(fy)
        nm = name.get(cid, cid)
        if len(xs) < 2:
            skipped.append(nm)
            continue
        curves.append((nm, np.array(xs, dtype=float), np.array(ys, dtype=float)))
    if len(curves) < 2:
        extra = ' (%s had too few data points)' % ', '.join(skipped) if skipped else ''
        return 'Global fitting needs at least two Y curves with usable data%s.' % extra
    return cols[jx]['name'], curves, skipped

def _gather_row(theta, row, fixed_val, p):
    # Gather one curve's full p-length parameter vector: a theta index, or the
    # fixed constant when this parameter never entered theta.
    return [theta[row[j]] if row[j] is not None else fixed_val[j] for j in range(p)]

def _global_solve(eq, curves, modes, fixv, blo, bhi, weighting):
    # Build theta + param_map from the three-state modes, seed it from
    # per-curve independent fits, and run one bounded least_squares. Returns a
    # rich dict, or {'error': msg} -- callers must NEVER show best-fit values
    # from a dict carrying 'error' (plan 5.1 point 6).
    from scipy.optimize import least_squares
    model = eq['model']
    params = eq['params']
    p = len(params)
    K = len(curves)
    x_pool = np.concatenate([c[1] for c in curves]) if curves else np.array([])
    y_pool = np.concatenate([c[2] for c in curves]) if curves else np.array([])
    dlo, dhi = eq['bounds'](x_pool, y_pool) if eq.get('bounds') else ([-_INF] * p, [_INF] * p)
    plo = [float(blo[j]) if j < len(blo) and blo[j] is not None else dlo[j] for j in range(p)]
    phi = [float(bhi[j]) if j < len(bhi) and bhi[j] is not None else dhi[j] for j in range(p)]
    fixed_val = [None] * p
    for j in range(p):
        if modes[j] == 'fixed':
            v = fixv[j] if j < len(fixv) else None
            if v is None:
                return {'error': 'Parameter "%s" is set to Fixed but no value was given. Enter a '
                                 'value or change it to Shared/Separate.' % params[j]}
            fixed_val[j] = float(v)

    # Detail 1 -- SEEDING: fit each curve INDEPENDENTLY first (reuse E1's _fit),
    # then a shared parameter is seeded with the MEAN of those estimates and a
    # separate parameter with its own. The difference between converging and not.
    def _finite(v):
        return float(v) if (isinstance(v, (int, float)) and math.isfinite(float(v))) else 1.0
    seeds = []
    for (_nm, xk, yk) in curves:
        s = None
        try:
            f = _fit(eq, xk, yk, {})
            if 'error' not in f:
                s = [float(v) for v in f['full']]
        except Exception:
            s = None
        if s is None:
            try:
                s = [float(v) for v in eq['p0'](xk, yk)]
            except Exception:
                s = [1.0] * p
        seeds.append([_finite(v) for v in (s + [1.0] * p)[:p]])

    theta0, theta_lo, theta_hi, theta_slot = [], [], [], []
    param_map = [[None] * p for _ in range(K)]
    for j in range(p):
        mode = modes[j]
        if mode == 'fixed':
            continue
        if mode == 'shared':
            i = len(theta0)
            seed = float(np.mean([seeds[k][j] for k in range(K)]))
            theta0.append(_clamp(seed, plo[j], phi[j]))
            theta_lo.append(plo[j]); theta_hi.append(phi[j])
            theta_slot.append((j, None))
            for k in range(K):
                param_map[k][j] = i
        else:  # separate
            for k in range(K):
                i = len(theta0)
                theta0.append(_clamp(seeds[k][j], plo[j], phi[j]))
                theta_lo.append(plo[j]); theta_hi.append(phi[j])
                theta_slot.append((j, k))
                param_map[k][j] = i
    if not theta0:
        return {'error': 'Every parameter is fixed -- there is nothing to fit. Share or free at '
                         'least one parameter.'}

    # Detail 3 -- per-point WEIGHTING applied BEFORE stacking. _weights returns a
    # per-point sigma (E1's menu); the residual weight is 1/sigma.
    weights = []
    for (_nm, _xk, yk) in curves:
        sig = _weights(yk, weighting)
        w = np.ones(yk.size, dtype=float) if sig is None else 1.0 / np.asarray(sig, dtype=float)
        weights.append(w)
    m_pts = int(sum(c[1].size for c in curves))
    if m_pts < len(theta0) + 1:
        return {'error': 'Need more data points (%d) than free parameters (%d) to fit. Add points, '
                         'share more parameters, or fix one.' % (m_pts, len(theta0))}

    def residuals(theta):
        out = []
        for k, (_nm, xk, yk) in enumerate(curves):
            pars = _gather_row(theta, param_map[k], fixed_val, p)
            out.append((np.asarray(model(xk, *pars), dtype=float) - yk) * weights[k])
        return np.concatenate(out)

    lo = np.array(theta_lo, dtype=float)
    hi = np.array(theta_hi, dtype=float)
    try:
        res = least_squares(residuals, np.array(theta0, dtype=float), method='trf',
                            bounds=(lo, hi), max_nfev=20000)
    except (ValueError, TypeError) as e:
        return {'error': 'The global fit could not start (%s). Check the bounds and equation.'
                         % str(e)[:100]}
    # Detail 6 -- non-convergence gates the WHOLE result.
    if not res.success:
        return {'error': 'The global fit did not converge (status %d: %s). Try sharing more '
                         'parameters, seeding better, or fixing one.'
                         % (int(res.status), str(res.message)[:120])}

    theta = [float(v) for v in res.x]
    resid_w = np.asarray(res.fun, dtype=float)
    ss_res = float(np.sum(resid_w ** 2))  # weighted -- for the F test + AICc + cov
    # Unweighted residuals for a readable R^2 / Sy.x (matches E1's _fit).
    ss_res_unw = 0.0
    for k, (_nm, xk, yk) in enumerate(curves):
        pars = _gather_row(theta, param_map[k], fixed_val, p)
        ss_res_unw += float(np.sum((np.asarray(model(xk, *pars), dtype=float) - yk) ** 2))
    ss_tot = float(np.sum((y_pool - np.mean(y_pool)) ** 2)) if y_pool.size else 0.0
    p_theta = len(theta0)

    # Detail 2 -- SE & CIs from the Jacobian at the solution: cov = inv(J^T J)*s^2,
    # s^2 = weighted SS_res/dof. Use an SVD PSEUDO-inverse when J^T J is
    # near-singular (over-sharing causes exactly this) and flag the
    # rank-deficient directions as AMBIGUOUS -- an undefined CI, not a confident
    # tiny one that pinv would otherwise fabricate for a null-space parameter.
    #
    # dof is m - rank(J), NOT m - p_theta: a rank-deficient fit has fewer
    # EFFECTIVE free parameters than p_theta (some are ambiguous, contributing
    # no real residual-reducing power), so m - p_theta over-counts and inflates
    # s^2 -- and every IDENTIFIABLE parameter's CI along with it. Full rank
    # (rank == p_theta, the common case) leaves dof == m - p_theta, unchanged.
    J = np.asarray(res.jac, dtype=float)
    U, sv, Vt = np.linalg.svd(J, full_matrices=False)
    V = Vt.T
    smax = float(sv.max()) if sv.size else 0.0
    tol = smax * max(J.shape) * np.finfo(float).eps if smax > 0 else 0.0
    good = sv > tol
    rank = int(np.sum(good))
    dof = m_pts - rank
    if dof < 1:
        return {'error': 'Not enough data for the number of free parameters (%d effective of %d '
                         'points). Add data, share more parameters, or fix one.' % (rank, m_pts)}
    inv_s2 = np.zeros_like(sv)
    inv_s2[good] = 1.0 / (sv[good] ** 2)
    cov_jtj = (V * inv_s2) @ V.T  # pseudo-inverse of J^T J
    s2 = ss_res / dof
    ambiguous = [False] * p_theta
    if rank < p_theta:
        # A theta entry is ambiguous when it has a substantial component in a
        # null-space direction of J (the pinv would ZERO that direction and hand
        # back a falsely-tiny variance -- exactly the confident garbage 5.1 warns
        # against). ponytail: 0.1*max is a fixed participation threshold; widen it
        # only if a genuinely-determined parameter ever gets falsely flagged.
        Vnull = V[:, ~good]
        for col in range(Vnull.shape[1]):
            v = np.abs(Vnull[:, col])
            vmax = float(v.max()) if v.size else 0.0
            if vmax > 0:
                for i in range(p_theta):
                    if v[i] >= 0.1 * vmax:
                        ambiguous[i] = True
    var = np.diag(cov_jtj) * s2
    se = []
    for i in range(p_theta):
        if ambiguous[i] or not math.isfinite(var[i]) or var[i] < 0:
            se.append(None)  # ambiguous -> honestly undefined, never a tiny fake CI
        else:
            se.append(float(math.sqrt(var[i])))

    # Practically-unidentifiable check (not exact rank deficiency, which the
    # ambiguous[] flag already covers): a parameter whose SE is enormous relative
    # to its own value is barely constrained by the data (e.g. Michaelis-Menten
    # with x << Km, or a curve that never plateaus) -- condition number in the
    # 1e8-1e12 range, still numerically full-rank, still an honest finite SE,
    # just not a USEFUL one. Flag it for the student without touching the
    # value or CI (a wide-but-finite CI is correct and must stay). ponytail:
    # 100x relative SE (CI spanning +-10000%) is a deliberately generous
    # threshold so a normally-identified parameter is never flagged.
    poorly_constrained = [False] * p_theta
    for i in range(p_theta):
        if ambiguous[i]:
            continue
        s = se[i]
        if s is None:
            poorly_constrained[i] = True  # SE came back non-finite/undefined
            continue
        v = abs(theta[i])
        rel = (s / v) if v > 0 else (float('inf') if s > 0 else 0.0)
        if not math.isfinite(rel) or rel > 100:
            poorly_constrained[i] = True

    return {
        'params': params, 'K': K, 'curve_names': [c[0] for c in curves],
        'theta': theta, 'theta_slot': theta_slot, 'se': se, 'ambiguous': ambiguous,
        'poorly_constrained': poorly_constrained,
        'param_map': param_map, 'fixed_val': fixed_val, 'modes': list(modes),
        'model': model, 'curves': curves, 'p': p,
        'ss_res': ss_res, 'ss_res_unw': ss_res_unw, 'ss_tot': ss_tot,
        'dof': dof, 'p_theta': p_theta, 'm': m_pts, 'rank': rank,
    }

def _global_param_table(sol):
    # One row per theta entry: shared parameters once ('shared' in the Curve
    # column), separate parameters once per curve (the curve's name), fixed once.
    # Ambiguous (rank-deficient) parameters carry a note and an EMPTY CI.
    # Poorly-constrained (practically unidentifiable, but full-rank) parameters
    # carry a note too, but KEEP their real (wide-but-finite) SE/CI -- honest,
    # not fabricated.
    params, modes = sol['params'], sol['modes']
    theta, se, amb, poor = sol['theta'], sol['se'], sol['ambiguous'], sol['poorly_constrained']
    slots, names, fixed_val, dof = sol['theta_slot'], sol['curve_names'], sol['fixed_val'], sol['dof']
    tcrit = float(stats.t.ppf(0.975, dof)) if dof > 0 else None
    rows = []
    for j, pname in enumerate(params):
        if modes[j] == 'fixed':
            rows.append([pname, 'fixed', _fin(fixed_val[j]), None, None, None, 'fixed'])
            continue
        for ti, (pj, ck) in enumerate(slots):
            if pj != j:
                continue
            label = 'shared' if ck is None else names[ck]
            val, s = theta[ti], se[ti]
            if amb[ti]:
                rows.append([pname, label, _fin(val), None, None, None, 'ambiguous (not identifiable)'])
            elif s is None or tcrit is None:
                note = 'poorly constrained by the data -- value uncertain across a very wide range' if poor[ti] else ''
                rows.append([pname, label, _fin(val), _fin(s), None, None, note])
            elif poor[ti]:
                rows.append([pname, label, _fin(val), _fin(s), _fin(val - tcrit * s), _fin(val + tcrit * s),
                             'poorly constrained by the data -- value uncertain across a very wide range'])
            else:
                rows.append([pname, label, _fin(val), _fin(s),
                             _fin(val - tcrit * s), _fin(val + tcrit * s), ''])
    return {'title': 'Best-fit parameters (shared shown once, separate per curve)',
            'columns': ['Parameter', 'Curve', 'Best-fit', 'SE', '95% CI low', '95% CI high', 'Note'],
            'rows': rows}

def _global_fig(sol, xname):
    # All K curves overlaid with their fits in ONE figure (plan 5.1 UI).
    model, curves, p = sol['model'], sol['curves'], sol['p']
    theta, param_map, fixed_val = sol['theta'], sol['param_map'], sol['fixed_val']
    fig, ax = plt.subplots(figsize=(5.2, 3.6))
    for k, (nm, xk, yk) in enumerate(curves):
        col = _PALETTE[k % len(_PALETTE)]
        ax.scatter(xk, yk, s=16, color=col, zorder=3, label=nm)
        if xk.size:
            gx = np.linspace(float(np.min(xk)), float(np.max(xk)), 120)
            pars = _gather_row(theta, param_map[k], fixed_val, p)
            ax.plot(gx, np.asarray(model(gx, *pars), dtype=float), color=col, lw=1.8, zorder=4)
    ax.set_xlabel(xname)
    ax.set_ylabel('Response')
    ax.set_title('Global fit: %d curves, %s' % (sol['K'], 'shared + separate parameters'))
    ax.legend(fontsize=7)
    fig.tight_layout()
    return _svg(fig)

def _global_f_test(eq, curves, modes, fixv, blo, bhi, weighting, P, param_name):
    # Detail 5 -- the extra-sum-of-squares F test IS the point: fit a NULL model
    # SHARING parameter P and an ALTERNATIVE letting it vary per curve (all other
    # parameters at their chosen modes), then
    #   F = ((SS_null - SS_alt)/ddf) / (SS_alt/df_alt),  p = f.sf(F, ddf, df_alt).
    # AICc reported alongside. Answers "is this parameter actually different
    # between curves?" rather than an eyeball comparison.
    null_modes = list(modes); null_modes[P] = 'shared'
    alt_modes = list(modes); alt_modes[P] = 'separate'
    sn = _global_solve(eq, curves, null_modes, fixv, blo, bhi, weighting)
    sa = _global_solve(eq, curves, alt_modes, fixv, blo, bhi, weighting)
    if 'error' in sn or 'error' in sa:
        return None, {'F test': 'unavailable -- a sub-fit did not converge'}
    ss_n, ss_a = sn['ss_res'], sa['ss_res']
    df_a = sa['dof']
    ddf = sa['p_theta'] - sn['p_theta']  # extra params freeing P adds = K - 1
    aicc_n = _aicc(sn['m'], ss_n, sn['p_theta'])
    aicc_a = _aicc(sa['m'], ss_a, sa['p_theta'])
    stats_out = {}
    numerator = ss_n - ss_a
    if ddf > 0 and df_a > 0 and ss_a > 0 and numerator >= 0:
        F = (numerator / ddf) / (ss_a / df_a)
        pv = float(stats.f.sf(F, ddf, df_a))
        stats_out['F (shared vs separate %s)' % param_name] = _fin(F)
        stats_out['p (F test)'] = _fin(pv)
        stats_out['%s differs across curves' % param_name] = 'yes' if pv < 0.05 else 'no'
    else:
        stats_out['F test note'] = ('Letting %s vary did not reduce the residual, so an F test '
                                    'would be meaningless -- compared by AICc (lower is better).'
                                    % param_name)
    table = {'title': 'Shared vs separate %s (extra sum-of-squares F test + AICc)' % param_name,
             'columns': ['Model', 'Free params', 'SS residual', 'AICc'],
             'rows': [['%s separate (alternative)' % param_name, sa['p_theta'], _fin(ss_a), _fin(aicc_a)],
                      ['%s shared (null)' % param_name, sn['p_theta'], _fin(ss_n), _fin(aicc_n)]]}
    return table, stats_out

def _global_fit(dataset, spec):
    cr = _global_curves(dataset, spec)
    if isinstance(cr, str):
        return {'stats': {}, 'figures': [], 'error': cr}
    xname, curves, skipped_cols = cr
    opts = spec.get('options') or {}
    eq_id = opts.get('equationId')
    if not eq_id:
        return {'stats': {}, 'figures': [], 'error': 'Choose an equation to fit across the curves.'}
    eq = _EQUATIONS.get(eq_id)
    if eq is None:
        return {'stats': {}, 'figures': [], 'error': 'Unknown equation: %s' % eq_id}
    p = len(eq['params'])
    # Modes default to 'shared'; anything unexpected is coerced to 'shared'.
    raw = opts.get('paramModes') or []
    modes = [raw[j] if j < len(raw) and raw[j] in ('shared', 'separate', 'fixed') else 'shared'
             for j in range(p)]
    fixv = opts.get('fixValues') or []
    blo = opts.get('boundsLow') or []
    bhi = opts.get('boundsHigh') or []
    weighting = opts.get('weighting')
    sol = _global_solve(eq, curves, modes, fixv, blo, bhi, weighting)
    if 'error' in sol:
        # Loud, honest non-convergence / refusal -- NO best-fit values shown.
        return {'stats': {}, 'figures': [], 'error': sol['error']}
    r2 = (1.0 - sol['ss_res_unw'] / sol['ss_tot']) if sol['ss_tot'] > 0 else None
    syx = math.sqrt(sol['ss_res_unw'] / sol['dof']) if sol['dof'] > 0 else None
    n_amb = sum(1 for a in sol['ambiguous'] if a)
    n_poor = sum(1 for a in sol['poorly_constrained'] if a)
    stats_out = {
        'equation': eq['label'],
        'curves (K)': sol['K'],
        'total points': sol['m'],
        'unique parameters': sol['p_theta'],
        'degrees of freedom': sol['dof'],
        'R squared': _fin(r2),
        'Sy.x (RMSE)': _fin(syx),
        'converged': 'yes',
    }
    if weighting and weighting != 'none':
        stats_out['weighting'] = weighting
    if skipped_cols:
        stats_out['columns skipped'] = ', '.join(skipped_cols)
    if n_amb:
        stats_out['ambiguous parameters'] = ('%d -- over-shared / not identifiable (see the table)'
                                             % n_amb)
    if n_poor:
        stats_out['poorly constrained parameters'] = ('%d -- technically identifiable but barely '
                                                       '(see the table)' % n_poor)
    tables = [_global_param_table(sol)]
    # Detail 5 -- the shared-vs-separate F test, when a parameter is chosen.
    P = opts.get('fTestParam')
    if isinstance(P, int) and 0 <= P < p and modes[P] != 'fixed':
        ftab, fstats = _global_f_test(eq, curves, modes, fixv, blo, bhi, weighting,
                                      P, eq['params'][P])
        stats_out.update(fstats)
        if ftab is not None:
            tables.append(ftab)
    assum = [{'label': 'The global fit converged', 'passed': True,
              'detail': 'SEs and 95% CIs are from the Jacobian at the solution; a fit that did '
                        'not converge is reported as an error, never as best-fit values.'}]
    if skipped_cols:
        assum.append({'label': 'Every selected column had usable data', 'passed': False,
                      'detail': "Column(s) %s were skipped -- too few data points -- and are not "
                                "counted among the fitted curves." % ', '.join(
                                    "'%s'" % c for c in skipped_cols)})
    if n_amb:
        assum.append({'label': 'All shared parameters are identifiable', 'passed': False,
                      'detail': '%d parameter(s) are rank-deficient (over-shared) -- reported as '
                                'ambiguous with an undefined CI rather than a confident wrong '
                                'value. Share fewer parameters or add data.' % n_amb})
    if n_poor:
        assum.append({'label': 'All parameters are well constrained', 'passed': False,
                      'detail': '%d parameter(s) are poorly constrained by the data -- their value '
                                'is uncertain across a very wide range (a huge but finite CI, not a '
                                'fabricated one). Add data closer to where that parameter matters, '
                                'or fix/share it.' % n_poor})
    return {'stats': stats_out, 'tables': tables,
            'figures': [_global_fig(sol, xname)], 'assumptions': assum}

_ANALYSES = {
    'descriptive': _descriptive,
    'one-sample-t': _one_sample_t,
    'unpaired-t': _unpaired_t,
    'paired-t': _paired_t,
    'mann-whitney': _mann_whitney,
    'wilcoxon': _wilcoxon,
    'one-way-anova': _one_way_anova,
    'kruskal-wallis': _kruskal_wallis,
    'two-way-anova': _two_way_anova,
    'nested-t': _nested_t,
    'nested-anova': _nested_anova,
    'chi-square': _chi_square,
    'fisher-exact': _fishers_exact,
    'relative-risk': _relative_risk,
    'odds-ratio': _odds_ratio,
    'correlation': _correlation,
    'linear-regression': _linear_regression,
    'nonlinear-regression': _nonlinear_regression,
    'global-fit': _global_fit,
    'interpolate-standard-curve': _interpolate_standard_curve,
    'area-under-curve': _area_under_curve,
    'smoothing': _smoothing,
    'fraction-of-total': _fraction_of_total,
    'correlation-matrix': _correlation_matrix,
    'multiple-regression': _multiple_regression,
}

def _analyze(analysis_id, dataset, spec):
    try:
        fn = _ANALYSES.get(analysis_id)
        if fn is None:
            return json.dumps({'stats': {}, 'figures': [],
                               'error': 'Analysis not available in Lab yet: %s' % analysis_id})
        res = fn(dataset, spec)
        res.setdefault('stats', {})
        res.setdefault('figures', [])
        return json.dumps(res)
    except Exception as e:
        return json.dumps({'stats': {}, 'figures': [],
                           'error': ''.join(traceback.format_exception(type(e), e, e.__traceback__))})

def _export(analysis_id, dataset, spec, figure_index, fmt, dpi):
    # Phase F1 DPI/format export. Re-runs the SAME trusted template as the on-screen
    # render (analyses are fast; re-running from source is fine), but with _CAPTURE
    # armed so _svg keeps each finished figure alive instead of closing it. The
    # requested figure is then re-rendered via savefig(format=..., dpi=...) and
    # returned as base64 bytes for the client to download -- identical spec to the
    # displayed SVG, just rasterised at the chosen resolution.
    global _CAPTURE
    _CAPTURE = []
    try:
        fn = _ANALYSES.get(analysis_id)
        if fn is None:
            return json.dumps({'error': 'Analysis not available in Lab: %s' % analysis_id})
        res = fn(dataset, spec)
        if res.get('error'):
            return json.dumps({'error': res['error']})
        figs = _CAPTURE
        if not figs:
            return json.dumps({'error': 'This analysis produced no figure to export.'})
        try:
            i = int(figure_index)
        except (TypeError, ValueError):
            i = 0
        if i < 0 or i >= len(figs):
            i = 0
        fmt = fmt if fmt in ('png', 'svg', 'pdf') else 'png'
        try:
            d = int(dpi)
        except (TypeError, ValueError):
            d = 300
        d = max(36, min(d, 1200))  # bounded: a poster PNG, never an OOM-sized one
        buf = io.BytesIO()
        figs[i].savefig(buf, format=fmt, dpi=d)
        data = buf.getvalue()
        return json.dumps({'format': fmt, 'dpi': d, 'bytes': len(data),
                           'base64': base64.b64encode(data).decode('ascii')})
    except Exception as e:
        return json.dumps({'error': ''.join(
            traceback.format_exception(type(e), e, e.__traceback__))})
    finally:
        for f in (_CAPTURE or []):
            plt.close(f)
        _CAPTURE = None

# ── Poster layouts (Phase F2): compose saved analyses into one A/B/C board. ──
_PANEL_W = 4.5   # inches per panel column
_PANEL_H = 3.4   # inches per panel row

def _export_layout(dataset, panels, rows, cols, fmt, dpi):
    # Compose several SAVED analyses into ONE rows x cols figure with bold A/B/C
    # panel labels -- a science-fair poster board. Each panel's TRUSTED template
    # is re-run (via the same _CAPTURE mechanism _export uses) and its FIRST
    # figure rasterised into a subplot, so a poster panel is the same drawing as
    # the analysis's own on-screen figure, just placed in the grid. savefig
    # writes figsize*dpi pixels (no bbox='tight'), so a 1x2 board at 300 dpi is
    # exactly (2*_PANEL_W*300) x (_PANEL_H*300) -- the poster AC's pixel dims.
    import matplotlib.image as mpimg
    global _CAPTURE
    try:
        r = max(1, min(int(rows), 4))
        c = max(1, min(int(cols), 4))
    except (TypeError, ValueError):
        r, c = 1, 1
    fmt = fmt if fmt in ('png', 'svg', 'pdf') else 'png'
    try:
        d = int(dpi)
    except (TypeError, ValueError):
        d = 300
    d = max(36, min(d, 1200))  # bounded: a poster, never an OOM-sized raster
    cells = r * c
    panels = (panels or [])[:cells]

    # 1) Re-run each panel's template and rasterise its first figure to an image
    #    array. _CAPTURE keeps finished figures alive so we can read them back.
    _CAPTURE = []
    imgs = []
    try:
        for p in panels:
            aid = (p or {}).get('analysisId')
            spec = (p or {}).get('spec') or {}
            fn = _ANALYSES.get(aid)
            start = len(_CAPTURE)
            img = None
            if fn is not None:
                try:
                    res = fn(dataset, spec)
                    if not res.get('error') and len(_CAPTURE) > start:
                        pbuf = io.BytesIO()
                        _CAPTURE[start].savefig(pbuf, format='png', dpi=d)
                        pbuf.seek(0)
                        img = mpimg.imread(pbuf, format='png')
                except Exception:
                    img = None
            imgs.append(img)
    finally:
        for f in (_CAPTURE or []):
            plt.close(f)
        _CAPTURE = None

    # 2) Lay the board out. One subplot per cell; a panel with no figure (missing
    #    analysis / errored run) is left blank but still labelled, so the letters
    #    stay aligned with the poster's reading order.
    fig, axes = plt.subplots(r, c, figsize=(c * _PANEL_W, r * _PANEL_H), squeeze=False)
    try:
        n = len(imgs)
        for i in range(cells):
            ax = axes[i // c][i % c]
            ax.axis('off')
            if i < n:
                if imgs[i] is not None:
                    ax.imshow(imgs[i])
                letter = chr(65 + i)  # A, B, C, ...
                # gid -> the SVG backend writes <g id='dt-panel-A'>, so the smoke
                # can assert the labels are present regardless of font rendering.
                ax.text(0.012, 0.988, letter, transform=ax.transAxes,
                        fontsize=15, fontweight='bold', va='top', ha='left',
                        gid='dt-panel-' + letter,
                        bbox=dict(boxstyle='square,pad=0.15', fc='white',
                                  ec='none', alpha=0.7))
        # Minimal, DETERMINISTIC margins (not tight_layout, which can warn on
        # all-off axes) so the exported pixel dims stay exactly figsize*dpi.
        fig.subplots_adjust(left=0.01, right=0.99, top=0.99, bottom=0.01,
                            wspace=0.04, hspace=0.06)
        buf = io.BytesIO()
        fig.savefig(buf, format=fmt, dpi=d)
        data = buf.getvalue()
        return json.dumps({'format': fmt, 'dpi': d, 'bytes': len(data),
                           'base64': base64.b64encode(data).decode('ascii')})
    except Exception as e:
        return json.dumps({'error': ''.join(
            traceback.format_exception(type(e), e, e.__traceback__))})
    finally:
        plt.close(fig)
`
