# Codex segment brief — computer-science-algorithms · Core

- **Field:** `computer-science-algorithms` — Computer Science / Algorithms (NEW field)
- **Segment:** Core · **kind:** core · **id prefix:** `csalg-core` · **home:** false
- **Pairs with:** data-science-ml-metrics, signal-processing, robotics-control-systems, electronics-electrical-engineering

## Scope (TAXONOMY)
The shared foundation every algorithms student needs: how to specify a problem, express an
algorithm, reason about its correctness, measure and prove its cost, and read the charts that
report that cost. Language-agnostic (pseudocode), AP-CS/advanced-HS level.

## Unit plan — 8 units, ~51 lessons (Core target 45-55)
1. `csalg-core-foundations` **Problems, Algorithms & Data** (6) — algorithm vs program; problem specification (input/output, pre/postconditions); pseudocode; the primitive data structures (array, linked list, stack, queue, hash table, tree) and why the choice of structure shapes what's efficient; abstract data type vs implementation.
2. `csalg-core-bigo` **Asymptotic Analysis & Big-O** (7) — counting basic operations; Big-O, Big-Omega, Big-Theta and what each bounds; the complexity ladder O(1) < O(log n) < O(n) < O(n log n) < O(n^2) < O(2^n) < O(n!); best/worst/average case; why constant factors and crossover points matter for real n; amortized cost (intro).
3. `csalg-core-correctness` **Correctness & Proof Techniques** (6) — arguing correctness, not just speed: loop invariants (init/maintain/terminate), proof by induction, termination arguments (decreasing measure), edge-case reasoning; "passed my tests" vs "provably correct."
4. `csalg-core-paradigms` **Core Algorithmic Paradigms** (7) — brute force; greedy (and when it fails); divide-and-conquer; dynamic programming (overlapping subproblems + optimal substructure); recognizing which paradigm a problem calls for; a worked example per paradigm.
5. `csalg-core-recursion` **Recursion & Recurrence Relations** (6) — recursion mechanics (base + recursive case, the call stack); writing a recurrence for a recursive algorithm; solving recurrences (recursion tree, the Master Theorem cases with intuition); memoization vs tabulation; recursion vs iteration tradeoffs.
6. `csalg-core-benchmarking` **Empirical Measurement & Benchmarking** (6) — turning theory into data: timing runs, controlling for warm-up / caching / JIT / noise, varying input size systematically, averaging over trials, and separating the algorithm's cost from hardware and language overhead; wall-clock vs operation counts.
7. `csalg-core-charts` **Reading & Interpreting Algorithm Charts** (6) — how results are presented and defended: linear vs log-log vs semi-log runtime plots; fitting an empirical curve to a complexity class; growth-curve and crossover charts; cache hit-rate / saturation curves; how to tell whether measured data actually supports the claimed Big-O (and the overfitting trap).
8. `csalg-core-landmark` **Landmark Work & Open Debates** (7) **[landmark]** — Turing and computability (the 1936 Turing machine / halting problem); Knuth and *The Art of Computer Programming* / the rigorous analysis of algorithms; the Omega(n log n) comparison-sort lower bound; Cook-Levin (1971) and the open P vs NP problem; Dijkstra (shortest paths, structured programming); the "galactic algorithms" / is-asymptotics-practically-relevant debate; Big-O vs real-world constant factors. VERIFY names/dates with WebSearch.

## Depth requirements
Landmark people/dates (Turing 1936; Cook-Levin 1971; Knuth; Dijkstra); open problems (P vs NP);
debates (asymptotics vs constants / galactic algorithms; average- vs worst-case relevance);
competing paradigms (greedy vs DP; recursion vs iteration). Judge framing specific per lesson.

## NEW-FIELD registration note (for assembly step)
Creates `content/computer-science-algorithms.json` (`core` populated, `branches: []`). Register in
THREE places: `index.ts` (CODEX_TRACKS + LOADERS), `content-shape.test.ts` (`ALL_TRACK_MODULES`),
and `generated-content.test.ts` (`WRAPPERS`) — static import of the new wrapper in both tests.
Check `LABTYPE_FIELDS` for whether CS is a lab-type default (likely under a `datacore`/compute lab).
