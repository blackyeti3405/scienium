# NOVA Lab — Product Specification

> **Status:** Early Design / Pre-Development
> **Last Updated:** 2026-06-17
> **Initial Scale Target:** ~120 students (single school pilot)

---

## 1. Concept Overview

NOVA Lab is a hybrid physical-digital STEM engagement game designed to motivate students through the science fair process. Students build and expand a personalized virtual research laboratory, earning upgrades through daily learning activities, demonstrated knowledge, and real science fair project progress. Physical collectible figurines, distributed at verified real-world milestones, unlock special capabilities inside the app. Students can work solo or in shared-laboratory teams. Completed projects can be published as public Showcases visible beyond the app.

**The lab is the interface.** NOVA Lab presents as a single pixel-art lab scene rather than a conventional tab-based web app. Navigation is spatial: each core feature lives behind a **building** on the student's plot, and the student enters a feature by clicking its building, which opens that feature's panel over the scene. New buildings appear on the plot as the student advances through phases, so the lab visibly grows alongside real project progress and the set of reachable features expands in lockstep. There are two distinct classes of building — **gateway buildings** (the navigation spine) and **economy buildings** (the game layer) — defined in Section 9.

---

## 2. Core Goals

- Teach STEM concepts relevant to each student's chosen discipline
- Incentivize consistent commitment to science fair projects from start to finish
- Reward rigor and quality of work, not just participation
- Create a tangible, collectible physical artifact tied to real academic achievement
- Help students discover topics of genuine interest and identify real gaps in the literature
- Make scientific work feel like a progression system, not a checklist
- Support both individual and collaborative team projects
- Give every student a public artifact at the end, regardless of competition outcome

---

## 3. Project Lifecycle

NOVA Lab uses an explicit **phase** model stored on each team. Phases are sequential and non-skippable. Features from earlier phases remain available in all later phases.

| # | Phase | App Phase Key | Trigger to advance |
|---|---|---|---|
| 0 | **Onboarding** | *(pre-phase)* | Account creation, scan Apprentice figurine, choose solo or team |
| 1 | **Discovery** | `discovery` | Commit to a research topic |
| 2 | **Lab Selection** | `lab_selection` | Pick one of 6 lab types (one-time, permanent) |
| 3 | **Literature Review** | `literature_review` | Complete 25-paper review gate |
| 4 | **Research Planning** | `research_planning` | Finalize hypothesis, methodology, and study design |
| 5 | **Working** | `working` | Teacher validates data collection start (Experimenter figurine) |
| 6 | **Showcase** | `showcase` | Teacher validates competition advancement (Presenter figurine) |

**Visual milestone:** When the team advances from Discovery → Lab Selection and commits to a lab type, the virtual lab **grows in size** and **reskins** to that lab type. This is a one-time, visible moment — the lab goes from small + generic to grown + type-specific.

**Phase-locked features:** PvP combat, building purchases/upgrades, and mini-games are inaccessible during `discovery`, `literature_review`, and `research_planning`. The Showcase Wing additionally requires the Presenter figurine. See Section 14 for the complete feature-unlock matrix.

**Daily activities** (Field Dispatch, Proof of Expertise, Project Log, Failure Log) become available from `literature_review` onward, when a lab type — and therefore discipline-specific content — has been established. The Fair Hub is always accessible from day one.

> **Note on prior spec:** The original lifecycle omitted Research Planning as a distinct phase. It has been added between Literature Review and Working to enforce that students define their study design before beginning experiments. Phase-locking of PvP to `working` supersedes the earlier §14.3 statement that PvP unlocks with "at least 1 built building" (which could have occurred as early as Literature Review).

---

## 4. Lab Type System

| Lab Type | Domain | Scope |
|---|---|---|
| **BioCore** | Biology / Environmental Science | Life sciences, ecology, genetics |
| **ChemWorks** | Chemistry | Reactions, materials, formulations |
| **Volt Lab** | Engineering, Electronics, Physical Systems | Systems design, circuits, mechanical engineering, applied physical systems |
| **TerraBase** | Earth Science | Climate, geology, earth systems |
| **MindFrame** | Social / Cognitive Science | Behavior, psychology, data |
| **Axiom** | Math / Physics / Astronomy | Pure & applied math, pure & applied physics, astronomy |

> **Suggestion engine:** Based on Discovery activity, the app may recommend a lab type. The student still chooses freely.

---

## 5. Topic Discovery Phase (Optional)

### 5.1 Purpose
Mimics how real researchers stumble into ideas — exploring tangentially related material across many fields without commitment. Discovery occurs **before lab type selection**, so exploration is unconstrained by discipline.

Discovery is a shared **forest** of source-tagged exploration trees (Wikipedia + YouTube), persisted per team in the database so it survives logout/login and is shared across the team.

### 5.2 Wikipedia Exploration
- The student **chooses their own starter article** by typing a topic into a search bar (autocomplete-assisted via Wikipedia's API)
- On each article, the student selects **up to 2 hyperlinks** to branch into, which become children in the Discovery Tree
- Going several levels deep exposes the student to dozens of interconnected topics
- Nothing is rejected for being off-topic
- All visited articles are auto-logged and visualized as a branching tree

### 5.3 YouTube Exploration (implemented)
Students can chase YouTube rabbit holes alongside Wikipedia. A **📄 Wiki / ▶ YouTube** toggle switches the left pane to a video viewer.
- The student watches on YouTube as normal, then **pastes a link** (or presses ⌘V/Ctrl+V — auto-captured) to add the video
- Resolution uses YouTube's public **oEmbed** endpoint (no API key, no quota) for the title; the video plays in an embedded IFrame player
- Each added video **branches off the current node**, building the same kind of tree; videos and articles coexist in one forest with different icons (▶ vs text)
- **Cross-source bridging:** a video can be added as a child of a Wikipedia node (and vice-versa); unrelated dives simply stay as separate roots
- No personalized-recommendation capture — discovery happens on real YouTube; NOVA Lab captures and structures it

*(Uploading research papers as Discovery nodes — the original `paper` source type — is reserved but not built; papers live in the Literature Review.)*

### 5.4 Signaling Interest
- Students **star** any node they find interesting (visible in the sidebar and on the Discovery home)
- *(Planned: a manually-curated Topic Interest List and daily related-material prompts.)*

### 5.5 Choosing the Final Topic & Exiting Discovery
- The student commits to a **final research topic** at any time via the 🎯 topic bar (typed directly, or set in one click from any starred node)
- The chosen topic is stored on `teams.topic`, shown on the Discovery home, and is read by later phases (Literature Review, Research Plan)
- The Discovery tree remains accessible afterward

### 5.6 Technical Implementation
**Wikipedia integration:**
- Wikipedia REST API for article content; OpenSearch API for starter autocomplete
- Article HTML rendered in a custom React reader; all internal links intercepted

**YouTube integration:**
- `POST /api/discovery/youtube/resolve` extracts the video id and fetches the title via public oEmbed (no key)
- Official YouTube IFrame embed for playback

**Persistence:**
- Tree stored as an adjacency list in `discovery_nodes` (team-scoped), with `source_type` (wikipedia | youtube), `wikipedia_title` / `youtube_video_id` + `youtube_title`
- CRUD via `GET/POST/DELETE /api/discovery/tree` and `PATCH/DELETE /api/discovery/tree/[id]`; the client store hydrates from the DB
- Final topic stored on `teams.topic` via `GET/POST /api/discovery/topic`

---

## 6. Literature Review System

### 6.1 Overview
After topic and lab type selection, students complete a structured Literature Review of 25 relevant resources before lab advancement unlocks.

### 6.2 UI Design (implemented)

The Literature Review gateway building opens a single unified panel — no sub-tabs. The panel shows 25 source slots stacked vertically.

**Empty slots** are rendered as dashed-border rectangles. The first empty slot shows a centered "Upload source" button; remaining empty slots are inert placeholders showing the student how many remain.

**Filled slots** show:
- Paper title (left-aligned) and authors
- A proficiency banner above the row: **orange** "Proficiency not demonstrated" until the quiz is passed, then **green** "Proficiency demonstrated"
- Action buttons on the right (for ready papers): **PDF** (opens the stored file in a new tab), **Q&A** (opens the review split view), and a **🗑 delete** button

**Q&A split view** (entered by clicking "Review Q&A"):
- Left side: the actual PDF, rendered in an `<iframe>` streamed from the database (`/api/papers/[id]/file`)
- Right side: a graded **comprehension quiz** first (see §6.5); once graded, header tabs switch between **Quiz results** and **Discuss with Nova** (active tab in gold)
- **Discuss with Nova** is an open-ended chat about the paper; messages persist per user and reload on reopen. The chat no longer grants proficiency — the quiz owns it.

**Header**: progress bar + `N / 25` counter tracking toward the gate.

### 6.3 The 25-Resource Gate
- Proficiency is tracked **per student** (`paper_proficiency`): each member demonstrates understanding of each source independently by passing its quiz, and the literature panel shows the current member's own proficiency
- To leave `literature_review`, the team needs **25 sources uploaded AND every member proficient on all 25** — surfaced by the lab-scene phase-advance banner ("18/25 sources · 2/3 members ready"). Bigger teams therefore do proportionally more total reading, balancing the extra KP they earn
- Progress visible in the panel header (progress bar + counter)
- Off-topic detection deferred to v1.1

### 6.4 Nova — AI Tutor Persona
Nova is NOVA Lab's built-in research tutor. In the Literature Review:
- Encourages genuine understanding, not surface recitation
- Asks follow-up questions when answers are vague
- Celebrates real insight; gently corrects misconceptions
- Ends most turns with a question to sustain dialogue
- Tone: encouraging but rigorous, appropriate for high school

### 6.5 Comprehension Quiz (implemented)
Proficiency on each paper is earned by passing a graded, AI-generated quiz — not by the chat.

- **Free-response, not multiple choice.** Claude generates a set of questions grounded in the paper's full text (forbidden from being answerable by the abstract alone), each with a server-only grading key.
- **Coverage** is weighted toward findings, relevance, and methodology, plus broader field/topic knowledge; questions are calibrated to advanced/AP high-school level.
- **Grading:** the student answers in natural language; Claude grades all answers in one call against the keys + rubric (technical accuracy, depth, own-words, specificity), returns a per-question score + feedback, and computes an **aggregate score** (pass ≥ 70%).
- **Pedagogy is tunable** without code changes via `lib/literature/quiz-rubric.md`; question count and pass threshold are constants in `lib/literature/quiz.ts`.
- On pass, the current student's `paper_proficiency` row is upserted (demonstrated + KP high-water mark, max 100 per source **per student**) and the slot banner turns green for them. KP accrues into the shared `team_currency` total shown the same to all members. On fail, the student can retake with fresh questions. Past results (answers + feedback) persist and reload.

### 6.6 Citation Graph *(removed)*
The citation graph (and its supporting embeddings + HDBSCAN clustering) has been cut from scope. It is not planned. Thematic clustering of papers is no longer a product goal.

### 6.7 Technical Implementation (current)

**PDF processing pipeline (as built):**
1. Client uploads PDF → `POST /api/papers` (Next.js, multipart/form-data)
2. Server extracts text locally with `unpdf` (in-process, ~250ms, zero tokens); the raw PDF bytes are stored in `papers.pdf_data`
3. `papers` row created with `status = processing`; extracted text stored in `full_text`; `file_url` set to `/api/papers/[id]/file` (authenticated route that streams the stored PDF inline to the viewer)
4. Async Claude call (`claude-sonnet-4-6`) extracts `{ title, authors, abstract }` from the first ~24k chars
5. Paper marked `ready`; client polls `GET /api/papers/[id]` every 3 seconds

**Quiz:**
- `POST /api/papers/[id]/quiz` generates questions (paper prompt-cached + rubric); session + keys stored in `paper_quiz_sessions`
- `POST /api/papers/[id]/quiz/grade` grades all answers in one call, writes `paper_quiz_attempts`, and on pass upserts the current student's `paper_proficiency` (per-student demonstrated + KP high-water mark) and increments the shared `team_currency`
- `GET /api/papers` / `GET /api/papers/[id]` return the **current user's** proficiency; `GET /api/papers/[id]/quiz` returns the last graded session so results reload

**Q&A chat:**
- `GET/POST /api/papers/[id]/chat` — full paper text as a prompt-cached system block (first message full cost, follow-ups ~10%)
- Messages persist to `paper_chat_messages` (per user); replies rendered as Markdown
- Persistence is best-effort so a DB hiccup never drops a generated reply

**Delete:** `DELETE /api/papers/[id]` removes the paper and cascades its quiz sessions/attempts, chat messages, and relevance notes.

**Planned enhancements:**
- R2 file storage for PDFs (replacing the in-DB stream); `papers.file_url` → signed R2 URLs
- Optionally move quiz generation/grading into the Python worker (`/papers/process`, `/papers/quiz`)

**Scalability:**
- 120 students × 25 papers = 3,000 lifetime processings (not concurrent)
- Total LLM cost estimate: ~$150–200 for full pilot cohort
- Background job queue (BullMQ on Redis) planned for async processing

---

## 7. Daily Engagement Pillars

The three daily pillars below — Field Dispatch, Proof of Expertise, and Project Log / Failure Log — are **consolidated into a single gateway building, the Operations Hub** (see Section 9.6). Once unlocked, the Operations Hub becomes the central structure of the lab and the student's everyday home base; the individual pillars are surfaced as panels within it rather than as separate destinations.

### 7.1 Field Dispatch (~2 min)
- Daily narrative tip/case study tailored to lab type
- Ends with single reflection question
- **Reward:** Knowledge Points (KP)

### 7.2 Proof of Expertise (~3–5 min)
- Conversational knowledge certification
- Difficulty escalates with progression
- **Reward:** Clearance Level

### 7.3 Project Log (~2–5 min)
- Self-reported progress + required artifact upload
- App scans artifact, asks targeted follow-ups if too generic
- **Reward:** Lab Credits (LC)

### 7.4 Failure Logs

A specialized Project Log entry type for documenting failed experiments, dead ends, and unexpected results. Failure is explicitly **celebrated** rather than hidden, because:
- Real science includes failure as a core mechanism — students need to internalize this early
- Documenting failures rigorously builds genuine scientific maturity
- Failure analysis often produces sharper hypotheses than initial designs
- The Failure Log normalizes failure as part of the process, not a setback to hide from teachers/parents

**How it works:**
- Submitted via the same Project Log interface but flagged as "Failure" via a clear UI toggle
- Structured prompts adapted for failure analysis:
  - "What did you predict would happen?"
  - "What actually happened?"
  - "What's your best hypothesis for why the result diverged?"
  - "What will you try differently next?"
- Artifact required (photo of failed data, broken setup, unexpected output, etc.)
- Same LC reward as standard Project Log entries
- **Resilience Bonus:** small additional LC awarded when a subsequent log entry references back to a documented failure and applies what was learned

**Display:**
- Lab profile shows a **Failure Wall** section displaying documented failures as badges of honor
- Counted toward the Project Log activity streak — failure entries are full participation, not "skipped" days
- Surfaced in the Showcase as part of the project's methodology if the student chooses

### 7.5 Technical Implementation

**Content generation:**
- Field Dispatch content pre-generated weekly via cron (Claude API), stored per lab type
- Proof of Expertise questions generated dynamically based on student's Clearance Level and prior question history
- Project Log + Failure Log artifact analysis: server-side OCR (`pytesseract`) + Claude API for content evaluation

**Data model note:**
- Failure Logs are stored in the same `project_logs` table with an `entry_type` enum field (`progress | failure`) rather than as a separate table — keeps queries simple and the Failure Wall is just a filtered view

---

## 8. Currency & Progression System

| Currency | Earned By | Used For |
|---|---|---|
| **Knowledge Points (KP)** | Field Dispatch, mini-games, general engagement | Buying buildings, minor upgrades |
| **Clearance Level** | Proof of Expertise | Gating max building upgrade level |
| **Lab Credits (LC)** | Project Log + Failure Log milestones | Premium buildings, high-tier upgrades |

---

## 9. Lab Building System

### 9.1 Starting State & Building Classes

NOVA Lab has **two distinct classes of building**, which look and behave differently and should never be conflated in design or data:

| Class | Count | Purpose | Economy | PvP | Reskin |
|---|---|---|---|---|---|
| **Gateway buildings** | 7 (fixed) | Navigation spine — each opens one core feature panel | None (not bought, no levels) | None | Reskin to lab type on specialization |
| **Economy buildings** | 60 (10 per lab type) | Game layer — bought, upgraded, host mini-games | KP / LC | Map 1:1 to PvP characters | Already lab-type-specific by design |

- **Gateway buildings** are the doors into features (Discovery, Literature Review, etc.). They are a small fixed set, present according to phase, with no purchase cost, no upgrade levels, no mini-game, and no PvP character. They are the subject of Section 9.6. *Gateway buildings are never labelled "laboratory"* — naming is provisional (see Section 19).
- **Economy buildings** are the 60 described in 9.2–9.5. They only become relevant after specialization, and only the chosen lab type's 10 are ever in play for a given team.

A brand-new lab begins with a single gateway building (the Discovery building) on a small plot. Economy buildings and upgrades are earned over time, and only after a lab type is selected.

### 9.2 How Buildings Work
- KP buys new buildings and minor upgrades
- Each building has upgrade levels 1–15
- Clearance Level caps max upgrade:

| Clearance Level | Max Building Upgrade Level |
|---|---|
| 1 | 3 |
| 2 | 6 |
| 3 | 9 |
| 4 | 12 |
| 5 | 15 |

- LC unlocks premium/specialty buildings

### 9.3 Building Rosters (60 Total)

Each lab type has 10 buildings: 1 starter, 8 standard (KP), 1 premium (LC).

#### BioCore — Life Sciences
| Building | Type | Description | Mini-Game Category |
|---|---|---|---|
| **Greenhouse** | Starter | Cultivate and observe plant specimens | Identification |
| **Specimen Vault** | Standard | Curate and classify biological samples | Identification |
| **Microscopy Suite** | Standard | Visualize cells and microorganisms | Identification |
| **Incubation Chamber** | Standard | Grow cultures under controlled conditions | Prediction |
| **Wet Lab** | Standard | Conduct biological assays | Configuration |
| **Field Station** | Standard | Collect ecological data from the field | Prediction |
| **Aquatic Habitat** | Standard | Study aquatic ecosystems | Diagnosis |
| **Genetics Sequencing Lab** | Standard | Sequence and align DNA samples | Decoding |
| **Behavioral Observation Room** | Standard | Track and analyze animal behavior | Prediction |
| **Bioinformatics Suite** | Premium (LC) | Analyze genomic data at scale | Optimization |

#### ChemWorks — Chemistry
| Building | Type | Description | Mini-Game Category |
|---|---|---|---|
| **Fume Hood Bench** | Starter | Safe baseline workspace for reactions | Configuration |
| **Reaction Synthesis Lab** | Standard | Run controlled chemical syntheses | Prediction |
| **Spectroscopy Suite** | Standard | Identify compounds by spectral signatures | Identification |
| **Materials Testing Bay** | Standard | Measure mechanical and chemical properties | Diagnosis |
| **Crystallography Room** | Standard | Determine molecular structures | Decoding |
| **Distillation Tower** | Standard | Separate and purify mixtures | Optimization |
| **Catalysis Lab** | Standard | Study reaction acceleration | Optimization |
| **Polymer Workshop** | Standard | Synthesize and test polymers | Configuration |
| **Computational Chemistry Hub** | Standard | Simulate molecules in silico | Prediction |
| **Cleanroom Synthesizer** | Premium (LC) | Precision synthesis under contamination control | Optimization |

#### Volt Lab — Engineering, Electronics, Physical Systems
| Building | Type | Description | Mini-Game Category |
|---|---|---|---|
| **Workshop** | Starter | Default workbench for general builds | Configuration |
| **CNC Mill Shop** | Standard | Precision subtractive fabrication | Configuration |
| **3D Printing Shop** | Standard | Additive prototyping | Optimization |
| **PCB Fab** | Standard | Design and produce circuit boards | Configuration |
| **Robotics Bay** | Standard | Integrate sensors, actuators, control | Configuration |
| **Electronics Bench** | Standard | Build and debug analog/digital circuits | Diagnosis |
| **Mechanical Testing Rig** | Standard | Stress, fatigue, and load testing | Prediction |
| **Welding & Fabrication** | Standard | Metalwork and structural assembly | Configuration |
| **Embedded Systems Lab** | Standard | Microcontroller-based projects | Configuration |
| **AI Incubator** | Premium (LC) | Develop ML-driven engineering systems | Optimization |

#### TerraBase — Earth Science
| Building | Type | Description | Mini-Game Category |
|---|---|---|---|
| **Sampling Station** | Starter | Collect and catalog field samples | Identification |
| **Seismograph Array** | Standard | Monitor seismic activity | Prediction |
| **Weather Monitoring Post** | Standard | Record and analyze atmospheric data | Prediction |
| **Geological Core Lab** | Standard | Analyze sediment and rock cores | Identification |
| **Hydrology Bay** | Standard | Study water systems and flow | Diagnosis |
| **Atmospheric Sensor Array** | Standard | Track atmospheric chemistry | Prediction |
| **Soil Analysis Lab** | Standard | Characterize soil composition | Identification |
| **Remote Sensing Hub** | Standard | Interpret satellite and aerial data | Decoding |
| **Climate Modeling Station** | Standard | Run simulations of Earth systems | Optimization |
| **Deep Earth Observatory** | Premium (LC) | Probe planetary-scale processes | Prediction |

#### MindFrame — Social / Cognitive Science
| Building | Type | Description | Mini-Game Category |
|---|---|---|---|
| **Interview Room** | Starter | Conduct structured interviews | Identification |
| **Survey Distribution Center** | Standard | Design and field surveys | Diagnosis |
| **Behavioral Lab** | Standard | Run controlled behavioral experiments | Prediction |
| **Eye Tracking Suite** | Standard | Measure attention and gaze | Decoding |
| **Statistical Analysis Hub** | Standard | Choose and run the right test | Diagnosis |
| **Focus Group Chamber** | Standard | Run group-based qualitative studies | Identification |
| **Longitudinal Study Wing** | Standard | Track participants over time | Optimization |
| **EEG/Biofeedback Room** | Standard | Measure physiological response | Decoding |
| **Data Visualization Studio** | Standard | Communicate findings visually | Configuration |
| **Computational Social Science Lab** | Premium (LC) | Model social systems at scale | Optimization |

#### Axiom — Math / Physics / Astronomy
| Building | Type | Description | Mini-Game Category |
|---|---|---|---|
| **Chalkboard Room** | Starter | Foundational derivations and proofs | Decoding |
| **Computation Cluster** | Standard | Numerical simulations | Optimization |
| **Particle Physics Bench** | Standard | Tabletop physics experiments | Identification |
| **Optics Laboratory** | Standard | Light, lenses, interference | Configuration |
| **Quantum Simulation Lab** | Standard | Model quantum systems | Prediction |
| **Mathematical Modeling Suite** | Standard | Build models of real phenomena | Optimization |
| **Observatory Dome** | Standard | Observe and classify celestial objects | Identification |
| **Theoretical Physics Annex** | Standard | Symbolic reasoning and derivations | Decoding |
| **Numerical Methods Hub** | Standard | Algorithms for scientific computing | Optimization |
| **Cosmology Visualization Theater** | Premium (LC) | Render large-scale structures of the universe | Prediction |

### 9.4 Building Mini-Games

Each building hosts a STEM-based mini-game that rewards KP (with diminishing returns), teaches a concept relevant to the building, scales in difficulty with the building's upgrade level, and has a daily play cap.

**Six Mini-Game Categories** *(reusable framework)*:

| Category | What the Player Does | Example |
|---|---|---|
| **Identification** | Recognize/classify items from cues | Identify cell types under microscope; classify rock samples |
| **Configuration** | Arrange components to make a system work | Place components to complete a working circuit |
| **Prediction** | Forecast outcomes from data | Predict 24h weather pattern from current data |
| **Diagnosis** | Spot the error in a flawed setup | Find the broken component in a circuit |
| **Optimization** | Improve a system within constraints | Maximize yield with limited reagents |
| **Decoding** | Interpret data, notation, symbolic representations | Read a sequence chromatogram |

The same category implementation is reused across buildings with discipline-specific content, reducing development cost vs. 60 unique games.

### 9.5 Technical Implementation
- Each mini-game category is a parameterized React component
- Game content generated either pre-baked per discipline or dynamically via Claude API
- Results submitted on completion; server validates and awards KP

### 9.6 Gateway Buildings (Navigation Spine)

The seven gateway buildings are the app's primary navigation. Each is a structure on the plot that, when clicked, opens the corresponding feature panel over the lab scene. They appear one at a time as the team advances, and every previously unlocked gateway stays present and usable. Gateways are configuration/seed data, not earned economy buildings.

| # | Gateway (provisional name) | Opens | Appears at phase | Notes |
|---|---|---|---|---|
| 1 | **Discovery building** | Topic Discovery (Wikipedia deep dives + idea generation) | `discovery` | The starter building; the only structure on the plot during Discovery |
| 2 | **Literature Review building** | Literature Review + Library | `literature_review` | — |
| 3 | **Research Plan building** | Research Planning (hypothesis, methodology, study design) | `research_planning` | — |
| 4 | **Operations Hub** | Daily pillars: Field Dispatch, Proof of Expertise, Project Log / Failure Log | `literature_review` *(see §19)* | Becomes the **central** building once unlocked — the everyday home base |
| 5 | **Science Fair Research building** | Science Fair Information Hub | `discovery` *(see §19)* | Reference center; available early |
| 6 | **Showcase building** | Showcase Wing (public portfolio) | `showcase` | Additionally gated by the Presenter figurine |
| 7 | **PvP building** | PvP combat arena | `working` | Battle lobby, team builder, leaderboards |

**Visual behavior:**
- All gateway buildings start in the shared **generic grey/teal sci-fi palette** (see Section 20).
- On specialization (entering `lab_selection` and committing to a lab type), **the gateway buildings reskin** to the chosen lab type's palette. This is the visible specialization milestone, in concert with the lab growing in size. Only the gateway buildings reskin — the background/environment is unchanged for the pilot.
- Gateways have no upgrade levels; their appearance is a function of `(lab_type)` for skin and `(phase)` for which are present.

**Relationship to economy buildings:** gateways are fixed and unbuyable; the 60 economy buildings (9.2–9.5) are bought with KP/LC and populate the grown lab after specialization. A student can have all relevant gateways present while still owning zero economy buildings.

### 9.7 Research Plan Building (implemented)
The Research Plan gateway (unlocked at `research_planning`) turns a team's plan into a coached, reviewable artifact. Three parts:

**Connect a Google Doc (paste-a-link).** The team pastes an "Anyone with the link" Google Doc URL; the app fetches the published plain text on demand (no account connection — full Google OAuth is deferred, see `TODO.md`). "Refresh" re-syncs the latest text. The fetch lives behind one abstraction (`lib/research-plan/google-doc.ts`) so swapping in the Docs API later is localized.

**Project-type review.** The student picks an ISEF track — **Engineering** or **Science** — and a subtype (robotics, software, electrical, mechanical, materials / biology, chemistry, physics, environmental, behavioral). Each choice selects a rubric composed from a track base (`_engineering.md` / `_science.md`, the ISEF five-section criteria) plus subtype emphasis (e.g. robotics → motor type, current draw, battery runtime, multi-trial testing). "Review my plan" streams a structured critique that **fills in live** — the five rubric rows grade in one at a time with filling bars, then Strengths / Gaps / Next-steps columns populate. The result is persisted (`research_plans.last_review_json`) and replaced on each re-review.

**"Has this idea been done before?"** A web-search agent (Claude + the Anthropic native `web_search` tool) reads the synced plan, runs a handful of searches, and returns a **novel / refine / reject** verdict with prior work, how the project could still differ, a recommendation, and citations. The UI shows each **search query and the sources as they happen**. Rate-limited to **3 runs per day per team** (`idea_checks` ledger); the latest result is persisted (`research_plans.last_idea_check_json`) and replaced on each re-run.

Tune review rigor by editing the markdown in `lib/research-plan/rubrics/` — no code changes.

---

## 10. Team Collaboration

### 10.1 Overview
Students can work solo or in shared-laboratory teams (up to `max_members`, default 3). Most project state is shared and identical between members; the exception is **literature proficiency, which is per student** (each member earns their own). Each member has their own login; every action is attributed to the user who performed it.

### 10.2 Team Mechanics
- A lead **creates** a lab at onboarding; others **join** with a single-use code
- Invite/join: the lead mints a code in the **Team panel** (`POST /api/team/invite`); a joiner redeems it (`POST /api/team/join`), which enforces `max_members` atomically. Codes expire after 7 days and burn on use
- One member designated **Team Lead**
- Solo = team of 1 (unified data model)
- **Independent proficiency:** each member demonstrates literature proficiency and earns KP (max 100/source) on their own, so a bigger team earns proportionally more KP from the same 25 sources
- **Cost scaling:** building-shop prices scale with the live member count (`baseCost × members`), shown as a `×N · N-student lab` badge — offsetting the extra earning
- Currencies (KP, Clearance, LC) accumulate into one shared team total, displayed the same for every member
- Discovery trees stay team-shared; figurines remain individually owned

### 10.3 Attribution
Every action records the acting user. A team activity feed shows recent actions: *"Maya uploaded *Quantum Entanglement and Bell Inequalities*"* / *"Devon upgraded the Optics Laboratory to level 4."* / *"Aisha logged a Failure Log entry."*

### 10.4 Conflict Handling
- Last-write-wins on shared text fields
- Major actions (changing topic, lab type, kicking a member) require Team Lead authorization

### 10.5 Technical Implementation
- `teams` (with `max_members`) + `team_members`; join codes in `team_invites`
- Per-student proficiency in `paper_proficiency` (`@@id([paper_id, user_id])`); shared resources carry `team_id`
- `GET /api/team` backs the Team panel (roster, capacity, the lead's active code, phase-advance gate); `POST /api/team/invite` + `/api/team/join` handle codes
- All actions carry `created_by_user_id` for attribution
- Initial sync: 15s polling on activity feed; at scale: Supabase Realtime or Pusher WebSocket

---

## 11. PvP Combat System

### 11.1 Overview

NOVA Lab includes a 6v6 turn-based battle system where students compete using characters derived from their lab buildings. Combat style is classic Pokémon-style: each character has a moveset, type advantages, and stats. Players pick moves manually — no STEM mini-challenges interrupt combat (those stay in the building mini-games).

The system is intentionally designed as a daily reward and engagement loop **separate from project work**. Hard daily caps prevent it from displacing real research time, and rewards are leaderboard-only, so PvP cannot serve as a shortcut to project-related progression.

### 11.2 Design Principles
- **Separate from STEM education** — combat is a game, not a quiz. STEM learning happens in mini-games, Lit Review, and Discovery
- **Daily cap of 2 battles** — prevents grinding/addiction while keeping the loop fresh
- **Phase-locked matchmaking** — only students at the same project phase battle each other
- **Trophies, not currency** — rewards are pure ranking, never convertible to KP, LC, or unlocks
- **Tied to building investment** — your team comes from your buildings, so PvP rewards lab development indirectly

### 11.3 Characters

Each of the 60 buildings has a corresponding combat character. The character's combat level matches the building's upgrade level (1–15).

**Visual progression:**

| Level | Visual |
|---|---|
| 1 | Sprite 1, baseline appearance |
| 2–4 | Sprite 1, progressively brighter aura/glow per level |
| 5 | **Sprite 2 unlocks** (visual evolution moment) |
| 6–15 | Sprite 2, progressively more elaborate aura/glow per level |

Each character has:
- A name and identity tied to its building (e.g., the Greenhouse character is the "Greenhouse Guardian")
- A combat type (see Section 11.4)
- A moveset of 4 moves
- Base stats: HP, Attack, Defense, Speed (scaling linearly with level)

### 11.4 Type System

Three combat types map cleanly to the six building mini-game categories:

| Type | Building Categories | Theme |
|---|---|---|
| **Empirical** | Identification + Diagnosis | Observation-based |
| **Theoretical** | Decoding + Prediction | Reasoning-based |
| **Applied** | Configuration + Optimization | Building-based |

**Type effectiveness (rock-paper-scissors):**
- Empirical → strong vs Theoretical
- Theoretical → strong vs Applied
- Applied → strong vs Empirical

Effectiveness multipliers: 2x (super effective), 0.5x (resisted), 1x (normal). Same-Type Attack Bonus (STAB) of 1.5x when a character uses a move matching its own type.

### 11.5 Movesets

To keep design manageable, moves come from **shared pools** by type rather than 60 × 4 unique moves. Each type has approximately 15–20 moves in its pool, and characters draw from their type's pool with thematic flavor.

**Move structure:**
- Name (with STEM flavor when possible)
- Type
- Base damage
- Accuracy %
- PP (use limit per battle, prevents move spam)
- Optional secondary effect (status, stat change)

**Example moves:**

| Type | Move | Damage | Notable Effect |
|---|---|---|---|
| Empirical | Sharp Observation | 40 | 100% accuracy, reliable baseline hit |
| Empirical | Confounding Variable | 60 | May confuse opponent |
| Theoretical | Pattern Recognition | 50 | Doubles damage if opponent has used same move twice |
| Theoretical | Edge Case | 30 | Always crits if opponent at >75% HP |
| Applied | Iterative Design | 35 | Power increases each turn it's used |
| Applied | Stress Test | 70 | High damage but lowers user's defense |

Flavor text references real STEM concepts — passive exposure rather than active teaching.

### 11.6 Team Building

- Each team/solo player selects 6 characters from their built buildings for battle
- Characters not in your lab cannot be used — you must have built the corresponding building
- Team selection is changeable between battles, not during

### 11.7 Battle Flow

Standard turn-based combat:
1. Both players select their lead character
2. Each turn, both players choose an action (move or switch character)
3. Higher Speed acts first; ties broken randomly
4. Damage applied, status effects resolved
5. When a character faints, the player switches to another
6. Battle ends when one side has all 6 characters fainted

### 11.8 Matchmaking

**Phase-locked buckets:**

| Phase | PvP Status |
|---|---|
| Discovery | No PvP (no buildings yet) |
| Literature Review | Limited (lab is brand new) — pool may be sparse |
| Working | Main PvP arena |
| Showcase | Endgame players |

**Within Working phase, sub-buckets** based on total combined building levels prevent mismatches between new and veteran players in the same phase.

**Synchronous vs. asynchronous:**
- Live (synchronous) battles require both players online simultaneously — better feel, harder to populate with 120 students
- Async battles use a simple AI controller for one side, replaying the opponent's team based on a heuristic
- **Pilot starts with async only**, with optional live battles added later if there's demand

### 11.9 Trophy System

- **Win:** gain trophies (amount scales with opponent's trophy count — beating a higher-ranked opponent yields more)
- **Loss:** lose trophies (proportionally smaller loss when losing to a higher-ranked opponent)
- **Tie:** no change
- **Leaderboards:** visible per class, per school, and globally
- **Tiers:** Bronze, Silver, Gold, Platinum, Diamond, Master (color-coded badges)
- **Trophies cannot be spent** — pure status indicator, no in-game purchasing power

**Seasonal resets (optional):**
- Every semester, trophies reset partially to a tier-based baseline (e.g., Diamond players stay at lower Diamond)
- Prevents long-term lockout for students who join later and keeps engagement fresh

### 11.10 Daily Cap

- **2 battles per day per team**
- Cap resets at midnight local time
- Unused battles do not roll over
- No in-game way to earn additional battles — this is a hard rule, intentional to prevent PvP from displacing project work

### 11.11 Technical Implementation

**Schema additions:**
```
characters             id, building_id, name, type (empirical | theoretical | applied),
                       base_hp, base_atk, base_def, base_spd,
                       sprite_1_url, sprite_2_url
moves                  id, name, type, base_damage, accuracy, pp,
                       secondary_effect_json, flavor_text
character_moves        character_id, move_id, level_learned
pvp_teams              id, team_id, character_slots_json (6 building_ids),
                       updated_at
pvp_battles            id, attacker_team_id, defender_team_id, phase, started_at,
                       ended_at, winner_team_id, trophies_delta_attacker,
                       trophies_delta_defender, battle_log_json
pvp_trophies           team_id, current_trophies, tier, season, updated_at
pvp_battle_quota       team_id, date, battles_used  # enforces daily cap
```

**Battle engine:**
- Server-side battle resolution prevents cheating
- Each turn: client submits action, server resolves, returns result + animation cues
- Async battles: opposing team's actions chosen by simple heuristic AI based on type advantages and current battle state
- Battle log JSON stored for replay/dispute purposes

**Matchmaking algorithm:**
- Pre-computed buckets per phase + sub-bucket
- When a player initiates a battle, server picks a random opponent from the same bucket with trophy count closest to the requester
- For low-population buckets (early pilot weeks), expand search radius automatically

**Libraries:**
- No new libraries needed — Next.js API routes + Prisma sufficient
- For real-time live battles later: Supabase Realtime or Pusher Channels

**Scalability:**
- Battle resolution is computationally cheap (sub-millisecond per turn)
- 120 students × 2 battles/day = 240 battles/day, trivial load
- Battle log records can grow; archive battles older than 30 days to keep main table lean

### 11.12 Educational Justification

PvP is intentionally **not directly educational during combat** — the user explicitly opted out of gating moves behind STEM challenges. Education still happens through PvP via:

- **Building investment** requires KP earned through Field Dispatch + mini-games + project work
- **Higher-tier buildings** (Premium, requiring LC from real project work) produce stronger characters — so winning long-term requires real engagement with research
- **Move flavor text** references real STEM concepts ("Confounding Variable", "Edge Case", "Iterative Design") — exposure-based learning
- **2 battles/day cap** ensures PvP supports, not replaces, project engagement

---

## 12. Project Showcase

### 12.1 Purpose

Inspired by how ISEF projects are displayed publicly to the world, the Showcase gives every NOVA Lab student a public-facing portfolio of their completed work — not just the top finalists. The motivation:

- Most students at lower-level competitions go completely unrecognized despite doing meaningful work
- Parents, extended family, and friends often have no easy way to see what a student built
- A discoverable archive of student STEM work inspires future students
- Knowing a beautiful public artifact awaits at the end is a long-arc motivator throughout the project
- Public visibility legitimizes science fair work as something worth taking seriously

### 12.2 What Gets Uploaded

A Showcase entry can include any of the following:

| Asset | Format | Notes |
|---|---|---|
| **Title & Abstract** | Text | Required |
| **Script** | Text or audio | Written or audio narration of the project explanation |
| **Project Board** | Image (PNG/JPEG) | Photo of the physical tri-fold board |
| **Video Summary** | MP4, up to ~5 min | Student presenting the project |
| **Visual Summary** | Image | One-page infographic of the project |
| **Project Report** | PDF | Optional full writeup |
| **Code / Data Repository** | URL | Optional link to GitHub, Kaggle, etc. |
| **Tags** | Lab type, methodology, keywords | For discoverability |

### 12.3 Privacy Levels

| Level | Visibility | Use Case |
|---|---|---|
| **Public** | Anyone — discoverable in NOVA Lab gallery | Default for confident students with parental consent |
| **School-only** | Visible only to same-school members | School-published items |
| **Link-only** | Anyone with the URL, not discoverable | Shareable with family without full public exposure |
| **Private** | Team members only | Default for new Showcases |

### 12.4 Unlock & Publishing

- Showcase Wing feature unlocks with **The Presenter figurine** (advancing to school/regional competition)
- Available even if the student doesn't advance further — the Presenter figurine acknowledges the level most projects reach
- For minors, **public publishing requires verified parental consent** (separate from initial app consent)
- For school-only publishing, **teacher approval is required**
- Showcases can be edited or unpublished at any time by the team

### 12.5 Gallery

- Browse by lab type, year, school, tags, keywords
- Featured showcases (selected by editorial team or community)
- No comments/likes initially — avoids moderation burden on a minor-heavy audience
- Showcases display the team members (first names + last initial only by default)

### 12.6 Sharing

- Each Showcase gets a unique URL: `nova-lab.app/showcase/{slug}`
- Open Graph meta tags so social previews render beautifully
- "Share to family" button generates email/messaging-friendly summary
- "Download for printing" option produces a one-page PDF summary

### 12.7 Moderation

- Automated content checks on upload: PII detection, profanity, off-topic flags
- Optional human review for items being published publicly (especially for minors)
- Report function for inappropriate content
- Teacher dashboard includes Showcase moderation tools for school-published items

### 12.8 Technical Implementation

**Video uploads:**
- Direct-to-R2 upload via signed URLs — bypasses Next.js server, allows larger files without timeout issues
- Optional transcoding to web-friendly formats (H.264/MP4) via FFmpeg in the Python service, if uploads vary too much
- Thumbnails generated server-side on upload

**Public routes:**
- Separate Next.js route group `/showcase/[slug]` rendered server-side
- No auth required; RLS ensures only items marked `public` or `link-only` are returned
- Static generation (ISR with revalidation) for performance and SEO

**SEO:**
- Proper Open Graph + Twitter Card meta tags
- Auto-generated sitemap including all public showcases
- Structured data (JSON-LD) marking each showcase as a `CreativeWork`

**Storage:**
- Cloudflare R2 + CDN front for fast global serving of images/video
- Original assets and web-optimized variants kept separately

**Consent flow:**
- Parental consent collected via signed email confirmation (Clerk webhook or custom flow)
- Consent records stored in `parental_consents` table, tied to user_id + consent_type
- No public publish action permitted without an active consent record for minor accounts

**Libraries:**
- Video processing: `ffmpeg` (server-side worker)
- Image processing: `sharp` (Node) for thumbnails, resizing
- PDF embedding: `react-pdf` for in-browser report viewing

---

## 13. Science Fair Information Hub

### 13.1 Purpose
A reference center inside NOVA Lab providing everything a student needs to navigate the competition pathway: dates, deadlines, requirements, rubrics, and categories. Removes the friction of hunting down information across multiple official websites, and creates tight feedback loops between rubric criteria and the student's daily project work.

The Fair Hub is **always accessible** from day one — even before topic selection — so students understand the competitive landscape they're working toward from the start.

> **Status (as built):** the gateway is live (`components/fair/ScienceFairFeature.tsx`) — US location via ZIP (geocoded to lat/lng at onboarding), matched regional/state/ISEF cards with a countdown, the ISEF category browser, the ISEF forms checklist (with per-form status tracking), the full ISEF rubric, and an AI "sync from site" deadline step. The fair dataset is **268 entries** (all geocoded to city level). Deadlines are **estimated** pending per-fair verification. Self-assessment, teacher review, and the notification engine remain planned.

### 13.2 Personalized Fair Calendar
Based on the student's school location (collected during onboarding), the app surfaces the fairs they're eligible for:

| Level | Examples |
|---|---|
| **School fair** | Internal fair, if the school holds one |
| **Regional / County fair** | Auto-matched by ZIP / county |
| **State fair** | Auto-matched by state |
| **International (ISEF)** | Always shown — qualification info included |
| **Affiliated competitions** | JSHS, Regeneron STS, Broadcom MASTERS, etc. |

Each fair entry includes:
- **Date** (confirmed, or estimated based on prior year's timing)
- **Location / venue**
- **Registration deadline**
- **Abstract submission deadline**
- **Required forms list**
- **Direct link** to the official fair website

When a date for the current year has not yet been officially announced, the app shows: *"Estimated: [Month] [Year] (based on [Previous Year] timing)"* until the official date is published. The estimate is computed from the same week-of-year as the prior year's event.

### 13.3 ISEF Rubric Integration
The full official ISEF judging rubric is built into the Fair Hub and rendered in the ISEF card. **Content is in `docs/isef-2026.md`** and structured for display in `lib/fairs/isef-rubric.ts` — Science and Engineering tracks, each with the five sections, every section's checklist subpoints (what judges score), the Poster (10) / Interview (25) split of Section V, the judging-emphasis notes, and the project-board guidance.

- Each criterion (e.g. Research Question, Design and Methodology, Execution, Creativity, Presentation) explained in plain language
- **Self-assessment tool:** students rate themselves on each criterion against a clear checklist of what would earn a higher rating
- **Optional teacher review:** teachers can submit their own rating to compare against student self-assessment
- **Project Log linkage:** rubric criteria are referenced when evaluating Project Log entries — if a student hasn't logged anything relevant to a given criterion, the app gently prompts them
- **Rubric overlay on Showcase:** when publishing a Showcase, students can attach their self-assessed rubric ratings as part of the public portfolio

### 13.4 ISEF Categories
The 22 ISEF categories are listed with descriptions to help students identify which their project fits. Each category page includes:

- Plain-language description
- Example sub-topics within the category
- Sample previously-winning project titles (where publicly listed by Society for Science)
- Cross-reference to the recommended NOVA Lab lab type

This is particularly useful because students often pick a category mismatched to their actual project, hurting their chances. The category matcher recommends the best fit based on the student's topic and methodology.

### 13.5 Forms & Requirements
Comprehensive checklist of required ISEF forms (1, 1A, 1B, 2, 3, 4, 5, 6, 7) and equivalent forms for regional/state levels:

- Particularly highlighted: SRC/IRB forms for human subjects, vertebrate animal research, hazardous chemicals/devices, etc.
- Form templates downloadable directly from the app
- Completion status tracked per team
- Deadline reminders tied to each form

### 13.6 Project Board Specifications
- Standard tri-fold board dimensions and display rules
- ISEF display compliance rules (what's allowed and what isn't on the board)
- Layout examples and templates
- Cross-linked from the Showcase Wing so students can prepare both physical and digital presentations side by side

### 13.7 Reminders & Notifications
- Configurable advance notice for upcoming deadlines (default: 30 / 14 / 7 / 1 day prior)
- **Smart urgency triggers:** if a student's Project Log state doesn't match the remaining time before a fair (e.g. regional in 30 days but no data collected yet), the app surfaces a gentle warning
- In-app banner notifications by default; optional email and push notifications

### 13.8 Technical Implementation

**Data sources (as built):**
- **268-entry fair dataset** in `lib/fairs/dataset.ts` scraped from the Society for Science affiliated-fair directory: 1 ISEF + 40 state + 227 regional fairs. Every entry has `websiteUrl` (linked directly from the directory), city-level `latitude`/`longitude` (184 Nominatim-geocoded, 60 manually fixed), a stable `seed_key`, and the year's event/deadline dates where available. `ensureFairsSeeded()` in `lib/fairs/match.ts` upserts idempotently on first `GET /api/fairs/match` call
- **All dates are estimated.** `POST /api/fairs/[id]/sync-deadlines` fetches the fair's `websiteUrl` via Firecrawl and has Claude extract dates into a `fair_events` row marked `estimated`; per-fair verification required before promoting to `confirmed`
- *Future:* annual admin refresh; official Society for Science data feed

**Schema additions:**
```
fairs                 id, name, level (school|regional|state|international|affiliated),
                      state, county, country, website_url, parent_fair_id,
                      latitude, longitude, seed_key (unique)  # matching + idempotent seed
fair_events           id, fair_id, year, event_date, registration_deadline,
                      abstract_deadline, venue, status (confirmed|estimated),
                      previous_year_event_id  # for estimate fallback
fair_user_assoc       user_id, fair_id, is_primary, registered_at
rubric_versions       id, fair_id, year, rubric_json
rubric_criteria       id, rubric_version_id, name, description, max_score,
                      checklist_items_json
rubric_self_assess    id, team_id, rubric_criterion_id, score, notes,
                      assessed_by_user_id, assessed_at
isef_categories       id, name, description, example_subtopics_json,
                      recommended_lab_type
forms_catalog         id, name, form_code, required_for_levels_json,
                      template_url, description
team_form_status      id, team_id, form_id, status (not_started|in_progress|complete),
                      completed_at
```

**Geographic matching (as built):**
- At onboarding or `POST /api/team/location`, the team's ZIP is (a) mapped to a 2-letter state via `zipToState()` in `lib/fairs/zip.ts` and (b) forward-geocoded to lat/lng via `geocodeZip()` (Nominatim) and stored as `teams.location_lat` / `teams.location_lng`
- `GET /api/fairs/match` calls `matchFairs(state, coords)` in `lib/fairs/match.ts`, which sorts all regional fairs in the state by Haversine distance from the stored team coordinates (falling back to the state centroid if no coordinates are stored). Returns nearest regional + state fair + ISEF
- *Future:* primary-fair manual override for edge cases (homeschoolers, school switches); official data feed for confirmed deadlines

**Rubric storage:**
- ISEF rubric stored as versioned JSON in `rubric_versions` table
- Each rubric version associated with a specific fair year so historical assessments stay accurate
- Updates to rubric tracked over time

**Notification engine:**
- Vercel Cron job runs daily, computing upcoming deadline notifications
- Smart urgency detection: cross-references `project_logs` activity with `fair_events.event_date` to detect mismatches
- Delivered via in-app banner + optional email (Resend or similar)

**Libraries:**
- Notification scheduling: Vercel Cron + Next.js API routes (no new libraries)
- Date math: `date-fns` (already a Next.js standard)

**Scalability:**
- ~500 fairs total in US database — trivial size, fits comfortably in Postgres
- Annual updates only — no real-time data ingestion required
- Notification volume: even at 10x current scale, well under any reasonable cron job threshold

---

## 14. App Features Summary

### 14.1 Feature Unlock Matrix

| Feature | Min Phase | Notes |
|---|---|---|
| **Topic Discovery** | `discovery` | Always available |
| **Science Fair Hub** | `discovery` | Always available |
| **Lab Type Selection UI** | `lab_selection` | One-time action; triggers lab growth + reskin |
| **Literature Review** | `literature_review` | Upload, quiz, relevance probe |
| **Literature Library** | `literature_review` | Searchable archive of processed papers |
| **Daily Activities** | `literature_review` | Field Dispatch, Expertise, Project Log, Failure Log |
| **Research Plan** | `research_planning` | Google Doc connect + type-specific AI review + web-search idea check (§9.7) |
| **Building Purchases** | `working` | KP-based; building catalog available |
| **Building Upgrades** | `working` | Capped by Clearance Level |
| **Building Mini-games** | `working` | Daily cap, KP reward |
| **PvP Combat** | `working` | 2 battles/day cap; phase-locked matchmaking |
| **Data Terminal** | `working` + Analyst figurine | Graphing and experiment tracking |
| **Showcase Wing** | `showcase` + Presenter figurine | Public-facing portfolio system |
| **Prestige Cosmetics** | `showcase` + Pioneer figurine | Unique aesthetic, title, legendary module |
| **Building Upgrade Tiers** | `working` | Clearance Levels 1–5, each raises max upgrade by 3 |

> **Enforcement:** Feature access is gated in **two places**: (a) the nav/UI shows locked items with a pixel padlock and disables navigation, and (b) every relevant API route calls `assertFeatureUnlocked()` from `lib/phase.ts` and returns HTTP 403 for requests outside the team's current phase. Client-only gating is not acceptable.

---

## 15. Teacher Dashboard

> **⚠️ DEFERRED FOR PILOT.** The full teacher dashboard described below is **not part of the pilot release**. During the 120-student pilot, teachers validate progress in person — students show the teacher their app progress, demonstrate project work physically, and the teacher hands over the appropriate figurine directly. No teacher-facing app interface is required for the pilot. The dashboard design below is preserved for **post-pilot v1.1+** when classroom scaling makes physical validation unsustainable.

### 15.1 Purpose
The teacher dashboard is the central tool for educators running NOVA Lab. Its design philosophy reflects the reality of how teachers actually use software: they have 10 minutes between classes, not 2 hours after school, so the dashboard must surface what needs attention rather than requiring browsing through all students.

The teacher dashboard is critical for pilot success — student-facing polish doesn't matter if the teacher's experience is frustrating, because teachers who give up on the app take the class with them.

### 15.2 Design Principles
- **Phase-aware** — clicking a student shows context relevant to their current phase, not a generic profile
- **Attention-first** — the dashboard surfaces students who need help; teachers don't browse, they respond
- **Reuses student visualizations** — teacher sees the same Wikipedia Tree, lab view, etc. that the student sees, so there's no separate interface to learn
- **Low cognitive load** — minimal text, clear visual cues, sortable and filterable

### 15.3 Class Roster (Home View)

The dashboard home is a roster of every student in the teacher's class. Each row shows:

- Student name (with team badge if part of a team)
- Current phase (Discovery / Literature Review / Working / Showcase)
- Phase progress (e.g. *"12 of 25 papers reviewed"*, *"4 days since last log"*)
- Last activity date
- **Attention indicators** — small visual flags requiring teacher attention

**Attention triggers:**
| Trigger | Indicator |
|---|---|
| Figurine validation pending >2 days | Yellow dot |
| No Project Log activity in >5 days | Yellow dot |
| Showcase awaiting review | Orange dot |
| Fair deadline within 7 days with stale progress | Red dot |
| New Failure Log entry | Blue dot (teaching opportunity, not urgent) |

**Roster controls:**
- Sort by: name, phase, last activity, attention level
- Filter: by phase, by team, by "Needs My Attention" (shows only students with any active indicator)
- Search by name

Each student appears as a single row — even team members. This is because teachers think about individuals. The team context is shown via badge, and clicking a team member opens the shared team lab with attribution highlighted (who uploaded what, who logged what).

### 15.4 Top-Level Tabs

| Tab | Purpose |
|---|---|
| **Roster** | Class-wide overview (default home) |
| **Validations** | Figurine validation queue with badge count |
| **Showcase Review** | Showcase items awaiting moderation |
| **Class Settings** | Manage roster, teams, fair targets |
| **Reports** | On-demand exportable progress summaries |

### 15.5 Student Detail View (Phase-Adaptive)

When the teacher clicks a student, the view adapts to that student's current phase. Each phase view reuses the same visualizations the student sees, with teacher-only actions added.

#### Discovery Phase
- Wikipedia Discovery Tree visualization (same as student view)
- List of papers uploaded during Discovery, with student's reflection responses
- Topic Interest List with starred items highlighted
- *Teacher actions:* leave a note, suggest a research direction, flag for in-class discussion

#### Literature Review Phase
- Progress toward the 25-paper gate
- Paper list with abstracts and student's relevance notes
- Quiz performance per paper
- *Teacher actions:* validate hypothesis/research stage (triggers The Analyst figurine), suggest additional sources, leave feedback on any paper

#### Working Phase
- Virtual lab view (read-only) showing all buildings and their levels
- **Expandable side panel for daily logs** — chronological list of Project Log and Failure Log entries with their artifacts
- Data Terminal contents (if unlocked)
- Current rubric self-assessment scores (if completed)
- Failure Wall summary
- *Teacher actions:* validate data collection start (triggers The Experimenter), validate competition advancement (triggers The Presenter), leave feedback on any log entry, contribute teacher rubric ratings to compare against student self-assessment

#### Showcase Phase
- Showcase preview as it would appear publicly
- Privacy level, parental consent status (for minors)
- *Teacher actions:* approve for school-public, request changes, leave inline feedback

### 15.6 Validation Workflows

Figurine validation is the teacher's most consequential interaction. The flow:

1. Teacher sees pending validations via roster indicators or the Validations tab
2. Clicks a pending validation card
3. Sees the relevant evidence in context:
   - **Analyst:** the student's hypothesis text, completed lit review summary, research question
   - **Experimenter:** recent Project Log entries, explicit "data collection underway" confirmation checkbox (this is the most easily falsifiable, so the teacher may need to ask the student to demonstrate in person)
   - **Presenter:** confirmation of competition advancement (school/regional fair)
4. Approves, requests changes, or rejects with a note
5. On approval: figurine entitlement registered; teacher receives a physical figurine to distribute (or QR code is unlocked, depending on the final distribution model)

### 15.7 Feedback & Annotations

Teachers can leave inline feedback that students see in their own view:
- Notes attached to specific papers in the library
- Comments on Project Log or Failure Log entries
- General lab notes (sticky-note style on the lab view)

All notes are private to the team and the teacher — they're not part of the public Showcase or class social feed.

### 15.8 Showcase Review Queue

A dedicated tab for items awaiting moderation:
- Public-publishing requests from students (with parental consent verified)
- School-publish requests
- Auto-flagged items (potential PII, off-topic, etc.)

Teacher can approve, request changes, or reject with a reason. Approved items go live; rejected items return to the student with the teacher's feedback.

### 15.9 Class Settings
- Add/remove students from class
- Group students into teams or allow student-led team formation
- Set class-wide fair targets (which regional/state fair the class is competing in)
- Configure notification preferences (email digest frequency, urgency thresholds)

### 15.10 Reports
- Class-wide progress summary as a 1-page PDF for administration
- Individual student progress reports for parent communication
- Generated on demand, exported as PDF
- Each report includes: phase reached, papers reviewed, project logs, failure logs, figurines earned, Showcase link (if published)

### 15.11 Pilot Phase Minimum

For the 120-student pilot, the dashboard ships with only the essentials:
- Class Roster with phase indicators and attention triggers
- Student Detail View (all four phase variants)
- Validations queue
- Showcase Review queue
- Basic Class Settings (add/remove, team grouping)

Reports, advanced analytics, and bulk actions are deferred until pilot feedback reveals what teachers actually struggle with.

### 15.12 Technical Implementation

**Authorization:**
- Teacher role distinct from student role (`role` enum on `users` table)
- Teachers can only access students in their assigned classes (enforced via Postgres RLS)
- Admin role separately defined for school-level access

**New tables:**
```
teacher_class_assignments  id, teacher_user_id, class_id, role (primary | co_teacher), assigned_at
teacher_validations        id, team_id, validation_type (analyst | experimenter | presenter | pioneer),
                           status (pending | approved | rejected | changes_requested),
                           submitted_at, reviewed_by_user_id, reviewed_at, notes, evidence_snapshot_json
teacher_feedback           id, team_id, target_type (paper | project_log | failure_log | lab_note | showcase),
                           target_id, body, created_by_user_id, created_at, resolved
showcase_review_queue      id, showcase_id, status, flagged_reasons_json,
                           reviewed_by_user_id, reviewed_at, decision, decision_notes
```

**UI components:**
- Reuses student-facing visualization components (`DiscoveryTree`, `LabView`, `ProjectLogTimeline`) wrapped in a teacher-context provider
- New components: `ClassRoster`, `AttentionIndicator`, `StudentDetailView`, `PhaseAdapter` (switches view based on student's current phase), `ValidationQueue`, `ValidationCard`, `FeedbackEditor`, `ShowcaseReviewQueue`

**Performance:**
- Roster view loads aggregated data via a single API call returning counts, last activity, and attention flags — not the full data for each student
- Detail views lazy-load only when clicked
- For pilot scale, no caching needed; at larger scale, cache roster aggregates per teacher with 60-second TTL

**Notifications:**
- Daily morning email digest summarizing pending validations and urgent attention items
- In-app banner when entering the dashboard if there are new validations to review
- Configurable per teacher

**File structure (teacher routes):**
- Separate route group `app/(teacher)/` with auth layout that enforces teacher role
- API routes under `app/api/teacher/` similarly role-gated

---

## 16. Social Layer

- Students from the same school/class can view each other's labs read-only
- Distinct from the public Showcase (Section 12), which is world-facing
- Teachers define class groups; schools set at admin level

---

## 17. Physical Figurine System

### 17.1 Figurine Tiers

| Figurine | Variant Type | Distributed By | App Unlock |
|---|---|---|---|
| **The Apprentice** | Universal | Signup | Account / Discovery access |
| **The Analyst** | Lab-type specific | Teacher confirms hypothesis + research stage | Data Terminal |
| **The Experimenter** | Lab-type specific | Teacher confirms data collection underway | *(TBD)* |
| **The Presenter** | Lab-type specific | Advances to school/regional competition | Showcase Wing |
| **The Pioneer** | Lab-type specific | Places at higher-level competition | Prestige cosmetic / legendary module |

### 17.2 Design Principles
- Apprentice is universal (lab type not yet chosen at signup)
- All later figurines have a distinct sculpt per lab type
- QR code on the base preserves visual quality
- Unlocks permanent
- For teams: each member individually earns their own figurine

### 17.3 Pilot Validation Flow

During the pilot, figurine distribution is **fully in-person** — no teacher dashboard required:

1. Student progresses in NOVA Lab
2. Student demonstrates progress to teacher in person (shows app, explains hypothesis, presents data, etc.)
3. Teacher hands over the corresponding physical figurine from a class supply
4. Student scans the QR code on the base of the figurine
5. App verifies the QR token and unlocks the associated capability

This flow keeps the pilot logistically simple: each classroom receives a starter supply of figurines, and teachers manage distribution at their discretion. The student app remains the source of truth for what's unlocked; the teacher needs no separate interface.

**Post-pilot scaling** introduces the Teacher Dashboard (Section 15) for in-app validation when in-person checks become impractical.

---

## 18. Platform

| Phase | Platform |
|---|---|
| **Phase 1** | Web app (responsive, mobile-first design) |
| **Phase 2** | iOS and Android native apps (React Native, shared business logic) |

### 18.1 Security & Abuse Prevention

NOVA Lab serves minors and calls paid AI APIs, so abuse prevention is a first-class requirement, not an afterthought. (Implementation details live in `architecture.md` §7.)

- **Rate limiting on all endpoints.** Every API route is rate-limited per authenticated user (with a coarse per-IP backstop tuned so a shared school/NAT network isn't penalized). The AI-backed actions — paper chat, quiz generation/grading, research-plan review, "has this been done before?" idea-check, and fair-deadline reads — are capped tightly because each call costs money; runaway or scripted use is throttled with a friendly "slow down" response rather than a hard failure. Idea-checks keep their per-team daily cap (3/day). Invite-code redemption is throttled to make code guessing impractical.
- **Strict input validation.** All user input is validated against a schema: correct types, sensible length limits, and rejection of unexpected fields. Oversized or malformed submissions are refused with a clear error.
- **Safe file uploads.** Uploaded research PDFs have a size cap and are verified to actually be PDFs (not just by their claimed type). *(Open: virus scanning and video-size caps for the Showcase phase — see §19.)*
- **No secrets in the browser.** All third-party API keys (AI, storage) are used only on the server; none are ever shipped to the client, and internal error details are never returned in API responses.
- **Untrusted external content is sanitized.** Externally-sourced HTML (e.g. Wikipedia articles in Discovery) is run through an allowlist sanitizer before display, so it can't inject scripts.

---

## 19. Open Design Questions

- [ ] Team Clearance Level: average, highest, or weighted?
- [ ] What is The Experimenter figurine's specific app unlock?
- [ ] Figurine production and distribution logistics
- [ ] Visual/aesthetic direction of the virtual lab
- [ ] Discovery depth soft cap to prevent infinite branching
- [ ] File size and length caps for uploads (PDFs now capped at 20 MB; **video caps for Showcase still open**) + virus scanning for untrusted uploads
- [ ] Exact KP and LC costs — economy balancing
- [ ] Accessibility (screen readers, color contrast, language support)
- [ ] Team disbanding: fork policy for individual members?
- [ ] Failure Log: should the Resilience Bonus require an explicit reference link, or detect connection automatically?
- [ ] Showcase: editorial featuring process — community vote, staff pick, or both?
- [ ] Showcase: archival — how long do public Showcases stay live?
- [ ] Showcase: should there be a "submit to community gallery" review step, or fully self-publish?
- [ ] Fair Hub: how often is the fair date database refreshed, and by whom?
- [ ] Fair Hub: how do we handle students who don't intend to compete at any fair?
- [ ] Fair Hub: official partnership with Society for Science for a data feed?
- [ ] Fair Hub: rubric self-assessment — required or fully optional?
- [ ] PvP: balance — should Premium-building characters (LC-unlocked) have a hard stat cap to prevent pay-to-win dynamics?
- [ ] PvP: should losing trophies be capped (e.g., never drop below your tier's floor) to avoid demoralizing students?
- [ ] PvP: visual / character art direction — illustration style, sprite dimensions, animation budget
- [ ] PvP: how are the 60 characters' identities and movesets actually designed — this is significant creative work
- [ ] PvP: at what trophy level does each tier (Bronze/Silver/Gold/etc.) begin?
- [ ] PvP: should opponent's full battle log be visible post-battle, or just outcome?
- [ ] Gateway buildings: final names (must not be "laboratory") and sculpt identities for all 7
- [ ] Operations Hub: does it unlock at `literature_review` (current assumption) — and if daily pillars are meant to be "day one," how are they reached before the Hub exists?
- [ ] Science Fair Research building: appears at `discovery` (reference material early) or later, given buildings otherwise appear chronologically?
- [ ] Gateway reskin: confirm background/environment stays constant per lab type for the pilot (no biome change)

---

## 20. Visual & Art Direction

> **Status:** Direction set; concrete sprite production pending. This section is the source of truth for the pixel-art look. Technical asset specs (dimensions, file paths, manifest) live in `architecture.md` §8.4.

### 20.1 Overall Aesthetic
NOVA Lab is a **pixel-art** game. The target is a **chunkier, lower-resolution** look than the two reference images supplied during design — those references read as high-resolution/HD pixel art, and the intended style is more visibly pixelated (fewer, larger pixels; a tighter palette). Think classic 2D top-down/isometric game art rather than detailed illustration.

### 20.2 Reference Decomposition (avoiding "lost in translation")
Two reference images informed the look, and each contributes **one** thing — they are not to be blended literally:

| Reference | Take **only** this | Do **not** take |
|---|---|---|
| `Labratory_Design.png` (cozy building w/ sign) | **Form language** — a clear, charming, approachable standalone structure that instantly reads as "a building you walk up to and enter" | Its specific colors; its exact (Stardew-like) art; the word "Laboratory" on the sign |
| `Color_Scheme.png` (isometric forest lab) | **Palette** — lavender/grey structure, glowing cyan-teal glass, warm orange accents | Its building shape; its HD resolution |

The brief in one line: **the approachable building silhouette of the first reference, rendered in the palette of the second, at a more pixelated resolution, as an original sculpt.**

### 20.3 Generic (pre-specialization) Palette
The shared base palette all gateway buildings start in:
- **Structure:** lavender / grey-purple (cool, neutral)
- **Glass / screens:** glowing cyan-teal
- **Accents / lights:** warm orange
- **Read:** clean sci-fi research facility, discipline-neutral

### 20.4 Lab-Type Reskin Palettes (post-specialization)
On specialization, gateway buildings recolor to the chosen lab type. Palettes below are **starting direction**, to be refined in the design system:

| Lab Type | Palette direction |
|---|---|
| **BioCore** | Greens + organic teal, warm wood/amber accents |
| **ChemWorks** | Glassware blues + reactive orange/violet accents |
| **Volt Lab** | Industrial steel grey + electric yellow/cyan accents |
| **TerraBase** | Earthy ochre/slate + mineral teal accents |
| **MindFrame** | Muted indigo/violet + soft magenta accents |
| **Axiom** | Deep space navy + starlight gold/cyan accents |

### 20.5 Reskin Scope
- **Only the gateway buildings reskin.** The background/environment stays constant for the pilot (no per-type biome).
- The 60 economy buildings are already drawn per lab type, so they simply appear in their native look once purchased.

### 20.6 UI / Panels
- Feature panels open **over** the lab scene (modal/overlay), styled in the same pixel-art frame language (chunky borders, pixel font).
- Pixel font for in-game UI with accessible fallbacks; locked buildings show a pixel padlock.
