# Brief — clinical-medicine-pharmacology · Core

- **slug:** `clinical-medicine-pharmacology` · **label:** Clinical Medicine / Pharmacology · **home:** false
- **segment:** Core · **target:** 8 units × ~6–7 lessons ≈ **52 lessons** (hits 45–55)
- **idPrefix:** `clinpharm-core` (every lesson id → `clinpharm-core-<unitShort>-<slug>`; `cmp-` is taken by classical-mechanics-physics)
- **pairs-with:** epidemiology-medicine, sports-exercise-physiology, immunology-microbiology, neuroscience, data-science-ml-metrics
- **tone:** 4–6 min reads, AP/advanced-high-school. Real clinical pharmacology — mechanisms, named drugs & trials, numbers, dates, debates — not dictionary definitions.

## Scope boundary (Core is the SHARED clinical-and-drug-science foundation)

Core teaches how drugs move through the body (PK) and act on it (PD), how vital-sign/organ-function measurements and their instruments are read, how clinical evidence is generated and judged, and the safety/dosing/ethics that frame all human-subjects work. It is deliberately **general**: the deep quantitative dosing math is `clinical-pharmacokinetics-dosing`; heart/vessel drugs are `cardiovascular-pharmacology`; brain drugs are `neuropsychopharmacology`; hormone/metabolism drugs are `endocrine-metabolic-pharmacology`; LD50/overdose/antidotes are `toxicology-adverse-effects`. Core keeps each foundational (the dose-response curve, the therapeutic index, ADME, the RCT) and leaves the organ-system and quantitative depth to the branches.

## Unit plan (vocabulary → PK → PD → measurement → evidence → ethics → reading data → landmark)

1. **Foundations of Clinical Medicine & Drug Science** `foundations` — what clinical pharmacology is & where a fair project sits (non-invasive/model/survey ceiling); drugs/receptors/ligands; dose vs concentration vs response; routes of administration; homeostasis & physiological regulation; drug names & classes. *(6)*
2. **Pharmacokinetics — ADME (What the Body Does to the Drug)** `pk` — the ADME framework & the concentration-time curve; absorption & bioavailability F; distribution & Vd; hepatic metabolism, first-pass & CYP450; excretion & clearance; half-life & first-order elimination; Cmax/Tmax/AUC & steady state. *(7)*
3. **Pharmacodynamics — What the Drug Does to the Body** `pd` — the graded dose-response curve; EC50/Emax & the Hill slope; potency vs efficacy; agonists/antagonists/partial & inverse agonists; therapeutic index & window; receptor theory & signal transduction; tolerance/desensitization/tachyphylaxis. *(7)*
4. **Clinical Measurement & Vital-Sign Instruments** `measure` — vital signs & reference ranges; blood pressure & ABPM (Korotkoff/oscillometric); the ECG waveform & heart rate; spirometry & the flow-volume loop; pulse oximetry & the O2-Hb dissociation curve; the oral glucose tolerance test; measurement artifact, calibration & reliability. *(7)*
5. **Clinical Evidence, Trials & Reading Results** `evidence` — the RCT & confounding; placebo, blinding & nocebo; the phases of clinical trials; sensitivity/specificity & predictive values; absolute vs relative risk & NNT; confidence intervals, p-values & significance; systematic reviews, meta-analysis & the evidence hierarchy. *(7)*
6. **Safety, Dosing & Research Ethics** `ethics` — dose calculation & units (mg/kg); adverse drug reactions (type A vs B); drug interactions & contraindications; pharmacovigilance & post-market surveillance; informed consent, IRB & human-subjects rules; why student projects don't dose people. *(6)*
7. **Reading Clinical & Pharmacology Data** `plots` — the concentration-time curve (linear vs semi-log & extracting t½); the dose-response curve on a log-dose axis; Kaplan-Meier survival curves; forest plots & meta-analysis visuals; ROC curves & diagnostic accuracy; Bland-Altman method-agreement plots. *(6)*
8. **Landmark Work & Open Debates** `landmark` *(required)* — digitalis→insulin→penicillin foundational discoveries; the first RCT (MRC streptomycin, 1948, Bradford Hill); thalidomide & the birth of drug regulation (1961–62, Kelsey, Kefauver-Harris); the Framingham Heart Study & the "risk factor"; the reproducibility/publication-bias crisis (Ioannidis 2005); open debates — opioids & "pain as the 5th vital sign", antibiotic resistance, pharmacogenomics/personalized dosing. *(6)*

**Total: 6+7+7+7+7+6+6+6 = 52 lessons.** Hits the 45–55 Core target.

## Depth requirements (arm a student for judge Q&A)
- **Named landmark work:** Withering & digitalis (1785); Banting & Best & insulin (1921–22); Fleming/Florey/Chain & penicillin; MRC streptomycin RCT (1948, Austin Bradford Hill); thalidomide & Frances Kelsey / Kefauver-Harris Amendment (1962); Framingham Heart Study (1948); Ioannidis, "Why Most Published Research Findings Are False" (2005).
- **Debates/limits:** relative-risk reporting vs absolute risk; p-value significance vs clinical importance; the reproducibility crisis; pain-as-5th-vital-sign & the opioid crisis; antimicrobial resistance; the promise & limits of pharmacogenomic personalized dosing.
- **Competing methods:** sphygmomanometer (Korotkoff) vs oscillometric BP; RCT vs observational cohort (Framingham); correlation vs agreement (Bland-Altman).
- **Applications woven in:** designing a non-invasive human-subjects project at the student ethical ceiling (reaction time, HR, survey); reading a PK curve to get t½; reading a forest plot / ROC to judge a claim.

## Judge-framing reminder
Every lesson's `judgeFraming` ties to why a fair judge probes THIS concept — e.g. "why can't you infer effect straight from dose?", "did your study control for the placebo effect?", "is that a relative or absolute risk?", "why is your project non-invasive?" — not generic "shows understanding" filler.
