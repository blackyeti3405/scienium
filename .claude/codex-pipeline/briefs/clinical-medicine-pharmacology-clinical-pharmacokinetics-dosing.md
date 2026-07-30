# Codex segment brief — clinical-medicine-pharmacology · clinical-pharmacokinetics-dosing

- **Field:** `clinical-medicine-pharmacology` · **Segment:** branch `clinical-pharmacokinetics-dosing`
- **label:** "Clinical Pharmacokinetics & Dosing" · **kind:** branch · **id prefix:** `clinpharm-pk`
- **Pairs with:** epidemiology-medicine, sports-exercise-physiology, immunology-microbiology, neuroscience, data-science-ml-metrics

## Scope (TAXONOMY)
Applied ADME for real regimens: compartment models, half-life and steady-state, loading vs
maintenance doses, therapeutic drug monitoring, and how kidney/liver function and body size
change dosing. A deeper, **quantitative** build on the PK Core — math-forward but AP-level.

## Unit plan — 7 units, ~45 lessons
1. `clinpharm-pk-models` **PK Foundations & Compartment Models** (6) — why we model; one- vs two-compartment; the C–t curve; volume of distribution (Vd) and what it means; central vs peripheral compartments; the "black box" assumption and its limits.
2. `clinpharm-pk-rates` **Rate Processes: Half-Life & Order of Kinetics** (7) — first-order exponential decay; elimination rate constant k; half-life t½ and the k=0.693/t½ link; zero-order (saturable) kinetics; Michaelis–Menten and capacity-limited drugs (phenytoin, ethanol, aspirin); flip-flop kinetics.
3. `clinpharm-pk-clearance` **Clearance & Steady State** (7) — clearance as the volume cleared per time; CL, Vd, k relationships; repeated dosing and accumulation; time-to-steady-state (~4–5 half-lives); peak/trough fluctuation; the average steady-state concentration.
4. `clinpharm-pk-regimens` **Dosing Regimens: Loading vs Maintenance** (6) — loading dose = Vd×Ctarget; maintenance dose = CL×Ctarget×τ; choosing the interval; bioavailability (F) correction; IV vs oral; continuous infusion vs intermittent.
5. `clinpharm-pk-tdm` **Therapeutic Drug Monitoring & Individualization** (6) — why/when TDM; narrow-therapeutic-index drugs (vancomycin, digoxin, lithium, aminoglycosides, warfarin-INR); trough vs peak sampling and timing; target ranges; a taste of Bayesian/population dosing.
6. `clinpharm-pk-landmark` **Landmark Work & Open Debates** (7) **[landmark]** — Michaelis–Menten (1913) & the enzyme-kinetics foundation; Torsten Teorell's 1937 compartment equations (birth of PK); Cockcroft–Gault (1976) vs MDRD/CKD-EPI for renal dosing (debate); the vancomycin AUC/MIC-vs-trough guideline shift (debate); Sheiner & Beal population PK / NONMEM; flat vs weight-based dosing debate. VERIFY names/dates with WebSearch.
7. `clinpharm-pk-special` **Special Populations & Applications** (6) — renal impairment (dose/interval adjustment by eGFR); hepatic impairment; body size (weight-based, BSA, obesity & lean body weight); pediatric vs geriatric PK; PK drug interactions (enzyme induction/inhibition, CYP450); a fully worked dosing case.

## Depth requirements
Landmark people/dates (Michaelis–Menten 1913, Teorell 1937, Cockcroft–Gault 1976); debates
(renal-estimate equations, vancomycin AUC vs trough, flat vs weight-based); competing methods
(one- vs two-compartment, trough vs AUC monitoring). Every lesson's judge framing specific.
