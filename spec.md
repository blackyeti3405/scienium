# scienium — Product Specification

> **Status:** In Development (feature-complete on the student-facing core; teacher tooling minimal for pilot)
> **Last Updated:** 2026-07-06
> **Initial Scale Target:** ~120 students (single school pilot)

---

## 1. Concept Overview

scienium is a hybrid physical-digital STEM engagement game designed to motivate students through the science fair process. Students build and expand a personalized virtual research laboratory, earning upgrades through daily learning activities, demonstrated knowledge, and real science fair project progress. Teacher-validated real-world milestones unlock new phases and capabilities inside the app. Students can work solo or in shared-laboratory teams. Completed projects can be published as public Showcases visible beyond the app.

**The lab is the interface.** scienium presents as a single pixel-art lab scene rather than a conventional tab-based web app. Navigation is spatial: each core feature lives behind a **building** on the student's plot, and the student enters a feature by clicking its building, which opens that feature's panel over the scene. New buildings appear on the plot as the student advances through phases, so the lab visibly grows alongside real project progress and the set of reachable features expands in lockstep. There are two distinct classes of building — **gateway buildings** (the navigation spine) and **economy buildings** (the game layer) — defined in Section 9.

---

## 2. Core Goals

- Teach STEM concepts relevant to each student's chosen discipline
- Incentivize consistent commitment to science fair projects from start to finish
- Reward rigor and quality of work, not just participation
- Help students discover topics of genuine interest and identify real gaps in the literature
- Make scientific work feel like a progression system, not a checklist
- Support both individual and collaborative team projects
- Give every student a public artifact at the end, regardless of competition outcome

---

## 3. Project Lifecycle

scienium uses an explicit **phase** model stored on each team. Phases are sequential and non-skippable. Features from earlier phases remain available in all later phases.

| # | Phase | App Phase Key | Trigger to advance |
|---|---|---|---|
| 0 | **Onboarding** | *(pre-phase)* | Account creation, choose solo or team |
| 1 | **Discovery** | `discovery` | Commit to a research topic |
| 2 | **Lab Selection** | `lab_selection` | *(Auto-assigned — see below; no manual step.)* |
| 3 | **Literature Review** | `literature_review` | Complete 25-paper review gate, then submit a one-sentence research idea |
| 4 | **Research Planning** | `research_planning` | Finalize hypothesis, methodology, and study design |
| 5 | **Working** | `working` | Teacher validates data collection start |
| 6 | **Showcase** | `showcase` | Teacher validates competition advancement |

**Lab type is auto-assigned (implemented).** Rather than a manual selection screen, the lab type is derived from the student's project itself. At the end of Literature Review — once the 25-source gate is met — the team submits a **one-sentence research idea**, which Claude Haiku classifies into one of the 6 lab types. The team then advances **directly from `literature_review` → `research_planning`**, skipping the standalone `lab_selection` phase (the phase key is retained in the lifecycle for ordering/back-compat but is no longer a stop). The assigned type and Haiku's rationale are shown immediately, and the idea is stored on `teams.research_idea`.

**Visual milestone:** When the lab type is assigned, the virtual lab **grows in size** and **reskins** to that lab type (palette switching is planned). This is a one-time, visible moment — the lab goes from small + generic to grown + type-specific.

**Phase-locked features:** PvP raids and building purchases/upgrades are inaccessible during `discovery`, `literature_review`, and `research_planning`. The Showcase Wing additionally requires reaching the `showcase` phase. See Section 14 for the complete feature-unlock matrix.

**Daily activities** (Field Codex, Proof of Expertise, Project Log, Failure Log) become available from `literature_review` onward, when a lab type — and therefore discipline-specific content — has been established. The Fair Hub is always accessible from day one.

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

> **Assignment (implemented):** The lab type is not chosen from a menu — it is inferred from the one-sentence research idea the team submits at the end of Literature Review, classified by Claude Haiku (`lib/lab-type/classify.ts`). This keeps the type honest to the actual project and removes a friction-filled decision screen. The classifier defaults to Volt Lab if it can't parse a confident answer.

---

## 5. Topic Discovery Phase (Optional)

### 5.1 Purpose
Mimics how real researchers stumble into ideas — exploring tangentially related material across many fields without commitment. Discovery occurs **before lab type selection**, so exploration is unconstrained by discipline.

Discovery is a shared **forest** of source-tagged exploration trees (Wikipedia + YouTube + academic Papers), persisted per team in the database so it survives logout/login and is shared across the team. A left-pane toggle switches between the three source explorers and a fourth **Discovery Tree** full-window view (§5.7). Reaching a new node the first time also earns the team KP (capped daily), so exploration feeds the economy — see §5.8.

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
- No personalized-recommendation capture — discovery happens on real YouTube; scienium captures and structures it

### 5.4 Academic Papers Exploration (implemented)
Alongside Wikipedia and YouTube, students can explore **real academic literature** during Discovery via the **📄 Papers** tab. This is the `source` node type (the earlier `paper` type stayed reserved).
- A search box queries **arXiv and PubMed** (via OpenAlex + NCBI E-utilities); results are shown with title, authors, host, and a **credibility tier** badge so students learn to weigh source quality.
- Opening a work adds it to the forest as a **source node** and shows an in-app reader with the abstract; the student can jot a one-line reflection ("what did they find?").
- From an open source node the student can **explore its citation neighbourhood** — references it cites and papers that cite it — branching those into the tree, so the forest can grow along real citation links.
- A starred, unpromoted source node can be **promoted straight into the Literature Review** as a paper, carrying its metadata over — connecting Discovery to the next phase.
- Fetched metadata is cached team-agnostically (`external_works`) so reopening a work never re-hits an external API.

*(This is distinct from the removed thematic **citation graph / clustering** of §6.6 — here the student manually walks real citation links; there is no automated clustering.)*

### 5.5 Signaling Interest (implemented)
- Students **star** any node they find interesting (visible in the sidebar and on the Discovery home).
- Each node also carries an optional **interest tier** — click to cycle **unset → high → mid → low → unset**. The tier is a separate visual channel from credibility and is color- and shape-coded on the tree: **green circle** (interested), **orange triangle** (kind of interested), **red square** (not interested). The shape cue keeps it legible without relying on color alone.
- An **Interest Seeds** panel lets the team jot free-text topic interests (the `topic_interests` list); one tap can prefill the Papers search box from a seed, tying loose interests to concrete literature.

### 5.6 Choosing the Final Topic & Exiting Discovery
- The student commits to a **final research topic** at any time via the 🎯 topic bar (typed directly, or set in one click from any starred node)
- The chosen topic is stored on `teams.topic`, shown on the Discovery home, and is read by later phases (Literature Review, Research Plan)
- The Discovery tree remains accessible afterward

### 5.7 Full-Window Discovery Tree & Multiple Trees (implemented)
- A dedicated **Discovery Tree** view renders the whole forest large, with a side **topic list** grouped **color-major then tree-minor** — all "interested" (green) topics first, sub-grouped by which tree they came from ("Tree 1", "Tree 2", …), then the mid and low tiers. This gives the team a single readable map of everything they've explored and how they feel about it.
- Exploration is not confined to one root. A **"New tree"** action starts a fresh, disconnected root: the next source the student opens (article, video, or paper) becomes a new tree instead of a child of the current selection. Unrelated rabbit holes therefore stay as separate trees in the same forest.

### 5.8 Discovery → Economy (implemented)
Reaching a node for the **first time** earns the team a small amount of KP, logged in a first-visit ledger (`discovery_source_visits`) so re-clicking, re-branching, or delete-and-recreate never re-pays. A per-team **daily KP cap** (`discovery_kp_days`) keeps it from being farmed, and committing a final topic grants a one-time **Topic-Locked bonus** (`discovery_topic_bonus`). This makes genuine exploration the first way a team earns currency, before any building is bought.

### 5.9 Technical Implementation
**Wikipedia integration:**
- Wikipedia REST API for article content; OpenSearch API for starter autocomplete
- Article HTML rendered in a custom React reader; all internal links intercepted; external HTML sanitized before display

**YouTube integration:**
- `POST /api/discovery/youtube/resolve` extracts the video id and fetches the title via public oEmbed (no key)
- Official YouTube IFrame embed for playback

**Academic Papers integration:**
- `GET /api/discovery/sources/search` queries arXiv/PubMed via OpenAlex + NCBI; `POST /api/discovery/sources/resolve` records the picked work (server-authoritative host/tier) and caches it in `external_works`
- `GET /api/discovery/sources/[id]/citations` returns the references / cited-by neighbourhood; `POST /api/discovery/source/[id]/promote` promotes a starred source into a Literature-Review paper; `POST /api/discovery/sources/[id]/reflection` saves the one-liner

**Persistence:**
- Tree stored as an adjacency list in `discovery_nodes` (team-scoped), with `source_type` (wikipedia | youtube | source), `wikipedia_title` / `youtube_video_id` + `youtube_title`, `starred`, and `interest_level`; academic metadata lives in the 1:1 `external_sources` side-row
- CRUD via `GET/POST/DELETE /api/discovery/tree` and `PATCH/DELETE /api/discovery/tree/[id]` (PATCH toggles `starred` and cycles `interest_level`); the client store hydrates from the DB
- Final topic stored on `teams.topic` via `GET/POST /api/discovery/topic`; free-text interests via `GET/POST /api/discovery/interests`

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
- Right side: a graded **comprehension quiz** first (see §6.5); once graded, header tabs switch between **Quiz results** and **Discuss with Vega** (active tab in gold)
- **Discuss with Vega** is an open-ended chat about the paper; messages persist per user and reload on reopen. The chat no longer grants proficiency — the quiz owns it.

**Header**: progress bar + `N / 25` counter tracking toward the gate, plus a **Research Guide** toggle — a built-in reference with a **70-term research glossary** (searchable, categorized) and an 8-section **anatomy-of-a-paper** walkthrough with a recommended reading order. Static authored content, no LLM.

### 6.3 The 25-Resource Gate
- Proficiency is tracked **per student** (`paper_proficiency`): each member demonstrates understanding of each source independently by passing its quiz, and the literature panel shows the current member's own proficiency
- To leave `literature_review`, the team needs **25 sources uploaded AND every member proficient on all 25** — surfaced by the lab-scene phase-advance banner ("18/25 sources · 2/3 members ready"). Bigger teams therefore do proportionally more total reading, balancing the extra KP they earn
- Progress visible in the panel header (progress bar + counter)
- Off-topic detection deferred to v1.1

### 6.4 Vega — AI Tutor Persona
Vega is scienium's built-in research tutor. In the Literature Review:
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
- **Targeted retry ("Fix my misses") (implemented):** a failed quiz shows, per missed question, Vega's rationale plus a "what a strong answer covers" note — and the retry re-asks **only the failed questions** (prior answer shown read-only) plus one fresh question, via `POST /api/papers/[id]/quiz/retry`, instead of regenerating the whole quiz.
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

The daily pillars below — Field Codex, Proof of Expertise, and Project Log / Failure Log — are **consolidated into a single gateway building, the Operations Hub** (see Section 9.4). Once unlocked, the Operations Hub becomes the central structure of the lab and the student's everyday home base; the individual pillars are surfaced as panels within it rather than as separate destinations. As built, the Operations Hub has **six tabs**: Field Codex (first and default), Project Log, Failure Log, Proof of Expertise, the **Data Terminal** (§7.6), and **Study with Vega**.

### 7.1 Field Codex (~5–10 min/day) — *implemented*
The daily learning pillar (it replaced the retired Field Dispatch — a daily LLM-generated reflection prompt — with a real curriculum):
- A library of **authored, typed lesson tracks** — one track per scientific field, 1:1 with the Data Terminal Charts-Guide taxonomy (29 fields planned; authored incrementally via the `.claude/codex-pipeline/` content pipeline). Each track is a **Core segment plus subfield branches**; segments contain sequentially-gated units of ~6 lessons, and every lesson ends with a **3–5-question checkpoint** (multiple-choice / ordering / matching) graded locally at an 80% pass bar — **zero LLM at read or grade time**.
- Lessons carry a worked example and a "why judges ask this" framing tying each concept to fair judging.
- **Reward:** KP per first-ever lesson pass, capped per student per day (`lib/ops/codex/engine.ts` owns the constants), minted atomically with the same once-ever payment-ledger discipline as the rest of the economy.
- A **Study Plan** (the feature's only LLM call, 2 regenerations/team/day) routes the team to the most relevant tracks for their project; teams without one default to their lab type's field list.
- Content lives as data (`apps/web/lib/ops/codex/content/<slug>.json`), built into thin code-split wrappers (`tracks/<slug>.ts`) via `pnpm --filter web codex:build`; a content-shape unit test plus a zod/checksum generated-content test gate every authored track.

### 7.2 Proof of Expertise (~3–5 min) — *implemented*
- A short **clearance exam** about the team's own project: a small fixed set of free-response questions generated and graded by Vega (Claude Sonnet) against a tunable rubric, using the team's real project context.
- Exams are tiered; each targets a clearance level, and difficulty escalates as the team advances.
- **Reward:** raises the team's **Clearance Level** (a high-water mark — a teammate's earlier pass already counts) plus a KP bonus on a genuine raise. Clearance gates which buildings can be purchased (§8).

### 7.3 Project Log (~2–5 min) — *implemented*
A structured lab-notebook entry, surfaced as the **Project Log** tab inside the Operations Hub. Each entry captures:
- **Numbered sequence** — entries are auto-numbered (#1, #2, …) in creation order so the notebook reads as a chronology.
- **Attendance** — for multi-member teams, a check-pill for each member records who was present that session (hidden for solo labs). Attendees are validated against the real team roster server-side.
- **Project stage** — a dropdown whose options adapt to the lab's discipline: the **engineering design process** for engineering-type labs (Volt Lab, plus future Aero/Mech/Comp) vs. the **scientific inquiry** stages for science labs (BioCore, ChemWorks, etc.).
- **Rich-text session notes** (required) — a TipTap editor with bold, italic, strikethrough, and bullet/numbered lists (Enter continues a list, Tab/Shift-Tab nest). Stored as Markdown, rendered safely (no raw HTML).
- **Next steps** (required) — an explicit "what we'll do next session" field, highlighted in the timeline so momentum carries between sessions.
- **Photos** (≥ 1 required) — image attachments validated by decoding the bytes (sharp), stored privately in R2, and streamed back through an authenticated route.
- **Entry links** — an entry can reference earlier progress entries (a picker + chips UI), capped at 10 outgoing links each. Links are bidirectional in the reader: each entry shows both its **links** (entries it points at) and **backlinks** (entries pointing at it), so a session that builds on an earlier one is visibly connected. Backed by the `project_log_references` table (both endpoints IDOR-guarded and idempotent; deleting an entry cascades its reference rows).
- **Reward:** Lab Credits (LC). *(Artifact follow-up scanning is planned; see 7.5.)*

**Shared & attributed.** Logs belong to the **whole team**: any member may add, **edit, or delete** any entry. Every entry records its original author ("logged by"), and edits stamp a **"last edited by"** attribution shown inline. Create / edit / delete are additionally written to the **team activity feed** (Section 10), so deletions — which leave no row behind — remain auditable ("Devon deleted a project log entry").

### 7.4 Failure Logs — *implemented*

A specialized Project Log entry type for documenting failed experiments, dead ends, and unexpected results. Failure is explicitly **celebrated** rather than hidden, because:
- Real science includes failure as a core mechanism — students need to internalize this early
- Documenting failures rigorously builds genuine scientific maturity
- Failure analysis often produces sharper hypotheses than initial designs
- The Failure Log normalizes failure as part of the process, not a setback to hide from teachers/parents

**How it works:**
- Surfaced as the **Failure Log** tab in the Operations Hub, writing to the same `project_logs` table with `entry_type = failure`.
- Two structured prompts: **"What failed or didn't go as expected?"** and **"What did you learn from it?"**
- Shares the same team-wide editing model and attribution as the Project Log (any member may add/edit/delete; author + last-editor tracked; all three actions recorded in the activity feed).
- Same LC reward as standard Project Log entries.
- *(Planned: a **Resilience Bonus** — small additional LC when a later entry references a documented failure and applies what was learned. Entry linking already exists (§7.3, `project_log_references`); the bonus that pays out on such a link is not yet wired.)*

**Display:**
- *(Planned)* Lab profile **Failure Wall** displaying documented failures as badges of honor.
- *(Planned)* Counted toward the Project Log activity streak — failure entries are full participation, not "skipped" days.
- *(Planned)* Surfaced in the Showcase as part of the project's methodology if the student chooses.

### 7.5 Technical Implementation

**Content generation:**
- Field Codex progress persists per student per lesson (`codex_lesson_progress`, high-water best-score + once-ever KP mint) with an atomic per-day completion cap (`codex_kp_days`); the study plan persists per team (`team_study_plans`). *(implemented)*
- Proof of Expertise clearance exams are generated and graded by Claude (Sonnet) against a tunable rubric using the team's real project context, tiered by target clearance level (`lib/clearance/*`, `POST /api/expertise` + `/api/expertise/grade`). *(implemented)*
- *(Planned)* Project Log + Failure Log artifact analysis: server-side OCR + Claude API for content evaluation and targeted follow-up prompts. Today, photo uploads are **validated** (real-image decode via sharp, image types only — SVG rejected) but not yet content-analyzed.

**Data model note:**
- Both Project and Failure entries live in the same `project_logs` table, distinguished by the `entry_type` enum (`progress | failure`) — keeps queries simple and the Failure Wall is just a filtered view. Progress entries use the structured columns (`next_steps`, `attendee_ids`, `attachment_urls`); failure entries store their two prompts as JSON in `body`. Shared editing is supported by `last_edited_by_user_id` + `last_edited_at`; image attachments are private R2 objects served via an authenticated streaming route (`/api/project-log/attachment/view`).

### 7.6 Data Terminal — *implemented*
The **Data Terminal** tab is where students record, graph, and learn how to present their results. It has two clearly separated layers, with different unlock rules:

**Experiment tracking (phase-gated to `working`).** An experiment is a titled x/y dataset; measurements are its points, optionally grouped into series. Students log data as they collect it and see it plotted. This layer unlocks at the **Working** phase (once real data collection begins) and is locked before then with an explanatory screen (`experiments` / `measurements` tables).

**Reference guides (always available, no phase gate).** Five built-in, offline reference libraries teach data literacy and are deliberately reachable in **every** phase — a student planning a study can consult them before they own a single data point:
- **Stats Guide** — a catalog of **65** statistics measures (mean/median through t-tests, ANOVA, regression, classification metrics, and FDR, plus nonparametric tests, regression diagnostics, epidemiology, Bayesian, and agreement/reliability measures), organized by category. Each entry gives a plain-language definition, when to use it, the formula (with a term-by-term breakdown), a small sample dataset, and a self-contained, verified Python snippet with its exact printed output.
- **Charts Guide** — **250** field-specific chart recipes across **29** scientific fields (astronomy, chemistry, ecology, neuroscience, gait biomechanics, materials science, …). Each entry names the plot type, explains how to read it, lists the raw data to collect (as structured name/unit pairs), says what it tells you, and shows a real example rendering. Fields are lazy-loaded so only the chosen field's module ships to the client.
- **Plot Guide** — **45** general-purpose plot types organized into 6 families (Comparison, Composition, Distribution, Relationship, Trend, Specialized), each with when-to-use guidance, the data it needs, and an example.
- **Methods Guide** — **45** experimental-design concepts (variables, controls, randomization, blinding, sample size, validity threats, …) — everything a team must get right **before any data exists**, organized by design stage.
- **Data Quality Guide** — **36** concepts covering everything **after** data is collected: measurement uncertainty, significant figures & units, data cleaning, and methodology pitfalls, with worked examples.

*(These guides are pure static content — no LLM at read time — so they cost nothing to serve and stay reachable regardless of phase-lock.)*

### 7.7 Study with Vega — *implemented*
A persistent, **team-shared study chat** grounded in the team's own project (Ops Hub tab). Vega answers with the team's research idea, study plan, and Codex track context in scope (`lib/ops/vega-study-context.ts`), so guidance stays project-specific rather than generic. Messages persist per team (`vega_study_messages`) and reload on reopen. Rate-limited like every LLM route.

---

## 8. Currency & Progression System

| Currency | Earned By | Used For |
|---|---|---|
| **Knowledge Points (KP)** | Field Codex lessons, Discovery exploration, literature quizzes, general engagement | Buying buildings; **every** building upgrade (KP scales with the building's base cost × level) |
| **Clearance Level** | Proof of Expertise | Gating **which** buildings can be purchased (each building has a minimum clearance tier) — it does **not** cap upgrade level |
| **Lab Credits (LC)** | +1 per team member per real calendar day they file a Project or Failure log (capped 1/member/day, never backfilled) | The four **tier-up** upgrade transitions only (→4, →7, →10, →15) |

---

## 9. Lab Building System

### 9.1 Starting State & Building Classes

scienium has **two distinct classes of building**, which look and behave differently and should never be conflated in design or data:

| Class | Count | Purpose | Economy | PvP | Sprite |
|---|---|---|---|---|---|
| **Gateway buildings** | 7 (fixed) | Navigation spine — each opens one core feature panel | None (not bought, no levels) | None | Bespoke sprite; reskins to lab type on specialization |
| **Economy buildings** | 60 (10 per lab type) | Game layer — bought, upgraded | KP / LC | Each grants a **spell** that levels with the building (§11) | **Shared generic sprite — no per-building art** |

- **Gateway buildings** are the doors into features (Discovery, Literature Review, etc.). They are a small fixed set, present according to phase, with no purchase cost, no upgrade levels, and no spell. They are the subject of Section 9.4. *Gateway buildings are never labelled "laboratory"* — naming is provisional (see Section 18).
- **Economy buildings** are the 60 described in 9.2–9.3. They only become relevant after specialization, and only the chosen lab type's 10 are ever in play for a given team.

A brand-new lab begins with a single gateway building (the Discovery building) on a small plot. Economy buildings and upgrades are earned over time, and only after a lab type is selected.

### 9.2 How Buildings Work

Economy buildings are bought from the shop and **placed on the lab's isometric
plot** (Clash-of-Clans style): pick a building, drop it on a free tile — the drop
*is* the purchase (KP debits on drop) — then rearrange it freely in **Arrange
mode**, upgrade it, or sell it. Gateways share the same plot and can be moved, but
never sold. (Implementation: `lib/plot.ts` grid math, `LabPlot`/`LabScene`,
`/api/buildings/{place,move,sell,upgrade}`.)

- **Placement** persists per team — economy positions + level in
  `team_shop_buildings` (`pos_x`, `pos_y`, `level`, `cost_paid`), gateway position
  overrides in `team_gateway_placements`. Each building occupies one 1×1 tile.
- **Buying** costs KP (× team size) and is gated by the building's **lab type** and
  **minimum clearance level**. (Clearance gates *purchase*, not leveling.)
- **Upgrading** runs levels **1 → 15**. **Every** upgrade costs KP
  = `round(baseCost × 0.25 × (level − 1))`. The four **tier-up** transitions —
  **3→4, 6→7, 9→10, 14→15** — *also* cost Lab Credits: **2 / 4 / 6 / 10**. There is
  **no clearance cap** on level. (`lib/economy.ts` `upgradeKpCost` / `upgradeLcCost`.)
- **Selling** an economy building refunds **90% of the *total* KP invested** in it
  (purchase + every upgrade — tracked in `cost_paid`). Gateways are not sellable.
- **Earning LC**: a member earns **+1 Lab Credit per real calendar day** they create
  a Project or Failure log entry — capped at one per member per day and never
  awarded for backfilled/backdated entries (`lab_credit_claims`).

### 9.3 Building Rosters (60 Total)

Each lab type has 10 buildings: 1 starter, 8 standard (KP), 1 premium (LC). Each building also carries a **spell type** — Empirical, Theoretical, or Applied — which is the type of the spell it grants for PvP raids (§11).

#### BioCore — Life Sciences
| Building | Type | Description | Spell Type |
|---|---|---|---|
| **Greenhouse** | Starter | Cultivate and observe plant specimens | Empirical |
| **Specimen Vault** | Standard | Curate and classify biological samples | Empirical |
| **Microscopy Suite** | Standard | Visualize cells and microorganisms | Empirical |
| **Incubation Chamber** | Standard | Grow cultures under controlled conditions | Theoretical |
| **Wet Lab** | Standard | Conduct biological assays | Applied |
| **Field Station** | Standard | Collect ecological data from the field | Theoretical |
| **Aquatic Habitat** | Standard | Study aquatic ecosystems | Empirical |
| **Genetics Sequencing Lab** | Standard | Sequence and align DNA samples | Theoretical |
| **Behavioral Observation Room** | Standard | Track and analyze animal behavior | Theoretical |
| **Bioinformatics Suite** | Premium (LC) | Analyze genomic data at scale | Applied |

#### ChemWorks — Chemistry
| Building | Type | Description | Spell Type |
|---|---|---|---|
| **Fume Hood Bench** | Starter | Safe baseline workspace for reactions | Applied |
| **Reaction Synthesis Lab** | Standard | Run controlled chemical syntheses | Theoretical |
| **Spectroscopy Suite** | Standard | Identify compounds by spectral signatures | Empirical |
| **Materials Testing Bay** | Standard | Measure mechanical and chemical properties | Empirical |
| **Crystallography Room** | Standard | Determine molecular structures | Theoretical |
| **Distillation Tower** | Standard | Separate and purify mixtures | Applied |
| **Catalysis Lab** | Standard | Study reaction acceleration | Applied |
| **Polymer Workshop** | Standard | Synthesize and test polymers | Applied |
| **Computational Chemistry Hub** | Standard | Simulate molecules in silico | Theoretical |
| **Cleanroom Synthesizer** | Premium (LC) | Precision synthesis under contamination control | Applied |

#### Volt Lab — Engineering, Electronics, Physical Systems
| Building | Type | Description | Spell Type |
|---|---|---|---|
| **Workshop** | Starter | Default workbench for general builds | Applied |
| **CNC Mill Shop** | Standard | Precision subtractive fabrication | Applied |
| **3D Printing Shop** | Standard | Additive prototyping | Applied |
| **PCB Fab** | Standard | Design and produce circuit boards | Applied |
| **Robotics Bay** | Standard | Integrate sensors, actuators, control | Applied |
| **Electronics Bench** | Standard | Build and debug analog/digital circuits | Empirical |
| **Mechanical Testing Rig** | Standard | Stress, fatigue, and load testing | Theoretical |
| **Welding & Fabrication** | Standard | Metalwork and structural assembly | Applied |
| **Embedded Systems Lab** | Standard | Microcontroller-based projects | Applied |
| **AI Incubator** | Premium (LC) | Develop ML-driven engineering systems | Applied |

#### TerraBase — Earth Science
| Building | Type | Description | Spell Type |
|---|---|---|---|
| **Sampling Station** | Starter | Collect and catalog field samples | Empirical |
| **Seismograph Array** | Standard | Monitor seismic activity | Theoretical |
| **Weather Monitoring Post** | Standard | Record and analyze atmospheric data | Theoretical |
| **Geological Core Lab** | Standard | Analyze sediment and rock cores | Empirical |
| **Hydrology Bay** | Standard | Study water systems and flow | Empirical |
| **Atmospheric Sensor Array** | Standard | Track atmospheric chemistry | Theoretical |
| **Soil Analysis Lab** | Standard | Characterize soil composition | Empirical |
| **Remote Sensing Hub** | Standard | Interpret satellite and aerial data | Theoretical |
| **Climate Modeling Station** | Standard | Run simulations of Earth systems | Applied |
| **Deep Earth Observatory** | Premium (LC) | Probe planetary-scale processes | Theoretical |

#### MindFrame — Social / Cognitive Science
| Building | Type | Description | Spell Type |
|---|---|---|---|
| **Interview Room** | Starter | Conduct structured interviews | Empirical |
| **Survey Distribution Center** | Standard | Design and field surveys | Empirical |
| **Behavioral Lab** | Standard | Run controlled behavioral experiments | Theoretical |
| **Eye Tracking Suite** | Standard | Measure attention and gaze | Theoretical |
| **Statistical Analysis Hub** | Standard | Choose and run the right test | Empirical |
| **Focus Group Chamber** | Standard | Run group-based qualitative studies | Empirical |
| **Longitudinal Study Wing** | Standard | Track participants over time | Applied |
| **EEG/Biofeedback Room** | Standard | Measure physiological response | Theoretical |
| **Data Visualization Studio** | Standard | Communicate findings visually | Applied |
| **Computational Social Science Lab** | Premium (LC) | Model social systems at scale | Applied |

#### Axiom — Math / Physics / Astronomy
| Building | Type | Description | Spell Type |
|---|---|---|---|
| **Chalkboard Room** | Starter | Foundational derivations and proofs | Theoretical |
| **Computation Cluster** | Standard | Numerical simulations | Applied |
| **Particle Physics Bench** | Standard | Tabletop physics experiments | Empirical |
| **Optics Laboratory** | Standard | Light, lenses, interference | Applied |
| **Quantum Simulation Lab** | Standard | Model quantum systems | Theoretical |
| **Mathematical Modeling Suite** | Standard | Build models of real phenomena | Applied |
| **Observatory Dome** | Standard | Observe and classify celestial objects | Empirical |
| **Theoretical Physics Annex** | Standard | Symbolic reasoning and derivations | Theoretical |
| **Numerical Methods Hub** | Standard | Algorithms for scientific computing | Applied |
| **Cosmology Visualization Theater** | Premium (LC) | Render large-scale structures of the universe | Theoretical |

### 9.4 Gateway Buildings (Navigation Spine)

The seven gateway buildings are the app's primary navigation. Each is a structure on the plot that, when clicked, opens the corresponding feature panel over the lab scene. They appear one at a time as the team advances, and every previously unlocked gateway stays present and usable. Gateways are configuration/seed data, not earned economy buildings.

| # | Gateway (provisional name) | Opens | Appears at phase | Notes |
|---|---|---|---|---|
| 1 | **Discovery building** | Topic Discovery (Wikipedia deep dives + idea generation) | `discovery` | The starter building; the only structure on the plot during Discovery |
| 2 | **Literature Review building** | Literature Review + Library | `literature_review` | — |
| 3 | **Research Plan building** | Research Planning (hypothesis, methodology, study design) | `research_planning` | — |
| 4 | **Operations Hub** | Daily pillars: Field Codex, Proof of Expertise, Project Log / Failure Log | `literature_review` *(see §18)* | Becomes the **central** building once unlocked — the everyday home base |
| 5 | **Science Fair Research building** | Science Fair Information Hub | `discovery` *(see §18)* | Reference center; available early |
| 6 | **Showcase building** | Showcase Wing (public portfolio) | `showcase` | Appears once the team is teacher-advanced to `showcase` |
| 7 | **PvP building** | PvP raid arena | `working` | Raid entry, spell loadout, class trophy leaderboard |

**Visual behavior:**
- All gateway buildings start in the shared **generic grey/teal sci-fi palette** (see Section 19).
- On specialization (entering `lab_selection` and committing to a lab type), **the gateway buildings reskin** to the chosen lab type's palette. This is the visible specialization milestone, in concert with the lab growing in size. Only the gateway buildings reskin — the background/environment is unchanged for the pilot.
- Gateways have no upgrade levels; their appearance is a function of `(lab_type)` for skin and `(phase)` for which are present.

**Relationship to economy buildings:** gateways are fixed and unbuyable; the 60 economy buildings (9.2–9.3) are bought with KP/LC and populate the grown lab after specialization. A student can have all relevant gateways present while still owning zero economy buildings.

### 9.5 Research Plan Building (implemented)
The Research Plan gateway (unlocked at `research_planning`) turns a team's plan into a coached, reviewable artifact. Three parts:

**Provide the plan text — two ways.** A "Plan source" toggle lets the team either:
- **Connect a Google Doc (paste-a-link):** paste an "Anyone with the link" Google Doc URL; the app fetches the published plain text on demand (no account connection — full Google OAuth is deferred, see `TODO.md`). "Refresh" re-syncs the latest text. The fetch lives behind one abstraction (`lib/research-plan/google-doc.ts`) so swapping in the Docs API later is localized.
- **Paste the text directly:** for teams not using Google Docs, paste or type the plan straight in. No external fetch and no extra Anthropic call; the text is sanity-capped on input and truncated to a stored maximum.

Whichever was **last saved** is the active source (recorded in `last_synced_source`); the review and idea-check below run against it identically regardless of source.

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
- Discovery trees stay team-shared; literature proficiency stays individually earned

### 10.3 Attribution
Every action records the acting user. A team activity feed (`activity_feed`, surfaced in the Activity panel) shows recent actions: *"Maya uploaded *Quantum Entanglement and Bell Inequalities*"* / *"Devon upgraded the Optics Laboratory to level 4."* / *"Aisha added a failure log entry."* / *"Devon deleted a project log entry."* Logged action types include paper upload/delete, quiz pass, topic change/lock, discovery KP awarded, source promoted to Literature Review, clearance raised, phase advance, plan sync, member join, building purchase/upgrade/sell, showcase published, and project/failure log create/edit/delete (`log_created | log_edited | log_deleted`). Because deletes remove the underlying row, the feed is the durable audit trail for who removed an entry; in-place entries additionally show a **"last edited by"** attribution.

### 10.4 Conflict Handling
- Last-write-wins on shared text fields
- Major actions (changing topic, lab type, kicking a member) require Team Lead authorization

### 10.5 Momentum Recap Card (implemented)
A dismissible **Momentum** card on the lab home gives the team a one-glance recap of their **last 7 days**: KP earned (summed across discovery visits and Field Codex lessons), sources reviewed, project logs written, experiments added, data points recorded, and **days until the next fair**. It is pure aggregation — **no LLM call** — and computes the next-fair countdown directly from the static fair dataset (`nextFairFromDataset()`) rather than the seeded tables, so it never touches the fair-seeding path. Dismissal is remembered **per ISO week** (localStorage), so the card returns fresh each week to re-surface momentum. Backed by `GET /api/team/momentum`.

### 10.6 Technical Implementation
- `teams` (with `max_members`) + `team_members`; join codes in `team_invites`
- Per-student proficiency in `paper_proficiency` (`@@id([paper_id, user_id])`); shared resources carry `team_id`
- `GET /api/team` backs the Team panel (roster, capacity, the lead's active code, phase-advance gate); `POST /api/team/invite` + `/api/team/join` handle codes
- All actions carry `created_by_user_id` for attribution
- Initial sync: 15s polling on activity feed; at scale: Supabase Realtime or Pusher WebSocket

---

## 11. PvP Raid System

> **Status:** Design only — **not yet built**. The phase-gate and the raid schema (§11.8) are in place and the API route is stubbed (`app/api/pvp/*` returns `501`), but there is no raid engine, no spell seed data, and no UI. This section is the target design.
>
> **This design fully replaces the earlier 6v6 turn-based, Pokémon-style battle system** (60 combat characters, shared move pools, sprite evolutions, live/async battles). None of that is planned any more; the old `characters` / `moves` / `character_moves` schema sketch is superseded by §11.8.

### 11.1 Overview

PvP is a **raid system**: an attacker is matched against a snapshot of another team's base and has a short time window to destroy as much of it as possible by casting **spells** — area-of-effect attacks earned from the attacker's own economy buildings. There are no characters, no movesets, and no turns; the buildings a team has bought and upgraded are both its offense (each grants a spell) and the base other players raid.

The system remains a daily engagement loop **separate from project work**: rewards are trophies only (leaderboard status, never convertible to KP/LC or unlocks), and caps keep raiding from displacing real research time.

### 11.2 Design Principles
- **Separate from STEM education** — raiding is a game, not a quiz. STEM learning happens in Lit Review, Discovery, and the daily pillars. (The one deliberate touch of science: the type-effectiveness cycle and its in-game explanation, §11.4.)
- **Raids are non-destructive to the defender** — a raid runs against a snapshot; the defender's real buildings, levels, KP, and layout are never altered. Damage exists only inside the raid instance.
- **Daily raid cap** — a hard cap on raids per team per day (tunable; resets at midnight local time; no rollover, no way to earn more) prevents grinding.
- **Trophies, not currency** — pure ranking, never spendable.
- **Tied to building investment** — more and higher-level buildings mean more, stronger spells on offense and more total base health on defense, so PvP rewards lab development indirectly.

### 11.3 Spells

**How spells are obtained:**
- A player receives a **new spell for each economy building** their team obtains — the spell is granted by the building, 1:1.
- A spell **levels up when its building levels up** (1–15, matching the building); spell strength scales with level (tunable curve).
- Each spell carries the **type** of its building — Empirical, Theoretical, or Applied (the Spell Type column in §9.3).

**Spell effects (v1):**
- **All spells are currently the same general damage spell**: a circular AOE that deals instant damage to every building within its radius at the targeted location — identical behavior regardless of which building granted it or its type.
- Differentiated per-type / per-building effects are deliberately deferred; effect design is significant creative work and is being brainstormed separately (§18). Type still matters through the effectiveness multiplier (§11.4).

**How spells are used in a raid:**
- The bottom of the raid screen shows the spell(s) the player brought into battle (baseline: one chosen spell; loadout size is tunable).
- The player **clicks the spell, then clicks a location** on the opponent's base; the spell detonates there, damaging every building within its radius.
- Spells can be cast **repeatedly** during the raid, with a short enforced **cooldown** between casts.

### 11.4 Type System

Every building — and therefore every spell — has one of three research types:

| Type | Theme |
|---|---|
| **Empirical** | Observation-based science — measuring, sampling, testing the real world |
| **Theoretical** | Reasoning-based science — models, predictions, derivations |
| **Applied** | Building-based science — engineering, instruments, systems |

**Type effectiveness (rock-paper-scissors):**
- **Empirical → strong vs Theoretical** — real-world data and observation can disprove or override a purely theoretical model. *"The experiment proved the theory wrong."*
- **Theoretical → strong vs Applied** — a strong theoretical framework guides and constrains applied work; without the underlying theory, applied engineering is just guessing. *"You can't build it right if you don't understand why it works."*
- **Applied → strong vs Empirical** — applied/engineering work produces the instruments and tools that make empirical observation possible in the first place. *"You can't run the experiment without the equipment."*

These one-line explanations **must be surfaced in-game** (e.g., a type-chart tooltip in the raid HUD and PvP lobby) so the cycle reads as science logic, not an arbitrary game rule.

Effectiveness applies as a damage multiplier of the **spell's type against each defending building's type**: 2× (super effective), 0.5× (resisted), 1× (neutral). With all spells otherwise identical (§11.3), the type matchup is currently the only strategic differentiator between spells.

### 11.5 Raid Flow

1. The player presses **Raid** and is matched into a random opponent base (§11.7).
2. The view switches to the **raid tab**: the opponent's base at the top of the screen, the player's spell bar at the bottom.
3. The raid is time-boxed: **15 seconds** to take down as much of the base as possible.
4. The player casts (click spell → click target) as many times as the cooldown allows.
5. Every building in the defender's base has **health** (scaling with its level — tunable); each cast reduces the health of the buildings in the blast radius. Partial damage counts.
6. The raid **ends when the time limit expires**. A results screen shows the percentage of the base destroyed and the trophy change (§11.6).

### 11.6 Trophy System

- A **leaderboard shows the trophy counts of all players in the class**.
- Trophy change is driven by the **percentage of the defender's total base health destroyed** during the raid — computed over total base health, including partial building damage. Example: in a 10-building base, one building knocked down to 50% health = 5% of the base destroyed.
- **Trophy gain (good raid):**
  - 100% destruction = **10 trophies** (the maximum); gain scales proportionally with the destruction percentage.
  - The percentage is **rounded up** when converting to trophies (e.g., 51% destroyed → 6 trophies).
- **Trophy loss (poor raid):**
  - A raid that deals only low damage (around **≤ 30%** destroyed — exact threshold tunable) results in a trophy **loss** for the attacker instead of a gain.
  - The loss scales like the gain, inverted: the lower the destruction percentage, the larger the penalty.
- The exact gain/loss threshold and the loss-scaling formula are **left as tunable balancing values**.
- **Why losses exist:** raiding poorly carries a real cost, discouraging students from raiding carelessly or spamming raids without a real attempt at destroying the base.
- Whether the **defender's** trophies also move when their base is raided is an open question (§18).

### 11.7 Matchmaking

- Matchmaking is **randomized**: pressing the single **Raid** button teleports the player directly into a raid against a randomly selected base — no manual opponent selection. The pool is scoped to the class and to teams that have reached the `working` phase (i.e., that actually have bases).
- If the player doesn't want to raid the base they were matched into, a **"refind"** rerolls them into a different randomly selected base.
- Refinds are **limited** — a capped number per raid session or per day (tunable). Once out of refinds, the player must either raid the currently shown base or exit without raiding (exiting does not consume a raid from the daily cap).

### 11.8 Technical Implementation

**Schema (replaces the earlier characters/moves battle schema):**
```
spells             id, building_id (1:1 with the economy-building catalog),
                   type (empirical | theoretical | applied),
                   base_damage, radius, cooldown_ms      # per-level scaling in code
pvp_raids          id, attacker_team_id, defender_team_id, started_at, ended_at,
                   percent_destroyed, trophies_delta, raid_log_json
pvp_trophies       team_id, current_trophies, updated_at
pvp_raid_quota     team_id, date, raids_used, refinds_used   # enforces daily caps
```

**Raid engine:**
- **Server-authoritative.** The client streams cast events (`spell_id, x, y, client_ts`); the server validates the 15-second window and cooldown spacing, resolves AOE damage against its own snapshot of the defender's base, and returns per-cast results for animation. The client never reports damage.
- The defender's base is a **read-only snapshot** of `team_shop_buildings` (plus gateway placements for layout) taken at raid start; nothing on the defender's rows is ever mutated.
- `raid_log_json` stores the cast sequence for replay/dispute purposes.

**Matchmaking:**
- Random pick from the eligible pool (same class, `working`+ phase, never the attacker's own team); a refind is another random pick excluding bases already shown this session.
- Quota checks (`pvp_raid_quota`) run at match time, before a raid row is created.

**Libraries & scale:**
- No new libraries — Next.js API routes + Prisma suffice; AOE damage resolution is trivial arithmetic.
- 120 students at a small daily cap is a trivial write load; archive raids older than 30 days if `raid_log_json` grows.

### 11.9 Educational Justification

PvP is intentionally **not directly educational during a raid** — no STEM challenges interrupt play. Education still happens around it:

- **Building investment** requires KP/LC earned through Field Codex, Discovery, literature quizzes, and real project logging — so a strong spell arsenal and a tough base both come from real engagement with research.
- **The type cycle is real science epistemology** — Empirical / Theoretical / Applied, and why each beats the next, is explained in-game (§11.4), giving passive exposure to how observation, theory, and engineering actually relate.
- **The daily raid cap** ensures PvP supports, not replaces, project engagement.

---

## 12. Project Showcase

### 12.1 Purpose

Inspired by how ISEF projects are displayed publicly to the world, the Showcase gives every scienium student a public-facing portfolio of their completed work — not just the top finalists. The motivation:

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

The editor's abstract field carries an **Abstract Structure guide** *(implemented)* — a static, authored reference (`lib/fairs/abstract-guide.ts`, `AbstractGuidePanel`) teaching the 250-word ISEF abstract: section-by-section structure, conventions (single paragraph, no citations/acknowledgments, past tense), and worked examples.

### 12.3 Privacy Levels

| Level | Visibility | Use Case |
|---|---|---|
| **Public** | Anyone — discoverable in scienium gallery | Default for confident students with parental consent |
| **School-only** | Visible only to same-school members | School-published items |
| **Link-only** | Anyone with the URL, not discoverable | Shareable with family without full public exposure |
| **Private** | Team members only | Default for new Showcases |

### 12.4 Unlock & Publishing

- Showcase Wing feature unlocks when the team reaches the `showcase` phase (teacher-validated advancement to school/regional competition)
- Available even if the student doesn't advance further — reaching this phase acknowledges the level most projects reach
- For minors, **public publishing requires verified parental consent** (separate from initial app consent)
- For school-only publishing, **teacher approval is required**
- Showcases can be edited or unpublished at any time by the team

### 12.5 Gallery

- Browse by lab type, year, school, tags, keywords
- Featured showcases (selected by editorial team or community)
- No comments/likes initially — avoids moderation burden on a minor-heavy audience
- Showcases display the team members (first names + last initial only by default)

### 12.6 Sharing

- Each Showcase gets a unique URL: `scienium.app/showcase/{slug}`
- Open Graph meta tags so social previews render beautifully
- "Share to family" button generates email/messaging-friendly summary
- **One-pager print export (implemented):** a print button opens the showcase's `?print=1` view — a clean, single-page layout with `@media print` styling (chrome hidden, high-contrast) that the browser prints or saves to PDF. The print view is behind the **same** visibility check as the normal page (a private/unpublished showcase can never leak through it) and skips the view-count increment.

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
A reference center inside scienium providing everything a student needs to navigate the competition pathway: dates, deadlines, requirements, rubrics, and categories. Removes the friction of hunting down information across multiple official websites, and creates tight feedback loops between rubric criteria and the student's daily project work.

The Fair Hub is **always accessible** from day one — even before topic selection — so students understand the competitive landscape they're working toward from the start.

> **Status (as built):** the gateway is live (`components/fair/ScienceFairFeature.tsx`) — US location via ZIP (geocoded to lat/lng at onboarding), matched regional/state/ISEF cards with a countdown, the ISEF category browser, the ISEF forms checklist (with per-form status tracking), the full ISEF rubric, an AI "sync from site" deadline step, and the **rubric self-check** (§13.3). The fair dataset is **268 entries** (all geocoded to city level). Deadlines are **estimated** pending per-fair verification. Teacher rubric review and the automated notification engine remain planned (though a teacher **nudge** and a notification bell already exist — see §15 and §13.7).

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
- **Self-assessment tool (implemented):** a **Self-check** tab (also reachable at `/fair-hub/rubric`) where the team rates itself on each ISEF criterion for their chosen track (Science or Engineering). Scores are validated server-side against the `ISEF_RUBRIC` literal and roll up into a live **judge-readiness score out of 100**. Team-scoped and shared (one score per criterion per team, in `team_rubric_scores`); no AI and no seed data involved. Reads/writes via `GET/PUT /api/rubric/self-assessment`.
- **Teacher review (implemented):** a **Rubric** tab in the teacher's per-student drill-down where the teacher scores the same criteria side-by-side with the team's self-check, guided by curated **low/mid/high anchor descriptions and talking points** per criterion (`lib/fairs/rubric-anchors.ts`). Teacher scores live in the same `team_rubric_scores` table discriminated by a `scorer_role` column ('student' | 'teacher'), so neither side can overwrite the other. Reads/writes via teacher-scoped `GET/PUT /api/teacher/rubric`.
- *(Planned)* **Project Log linkage:** rubric criteria referenced when evaluating Project Log entries — prompting the team when nothing has been logged toward a given criterion.
- *(Planned)* **Rubric overlay on Showcase:** attaching the self-assessed ratings to a published Showcase.

### 13.4 ISEF Categories
The 22 ISEF categories are listed with descriptions to help students identify which their project fits. Each category page includes:

- Plain-language description
- Example sub-topics within the category
- Sample previously-winning project titles (where publicly listed by Society for Science)
- Cross-reference to the recommended scienium lab type

This is particularly useful because students often pick a category mismatched to their actual project, hurting their chances. The category matcher recommends the best fit based on the student's topic and methodology.

### 13.5 Forms & Requirements
Comprehensive checklist of required ISEF forms (1, 1A, 1B, 2, 3, 4, 5, 6, 7) and equivalent forms for regional/state levels:

- Particularly highlighted: SRC/IRB forms for human subjects, vertebrate animal research, hazardous chemicals/devices, etc.
- Form templates downloadable directly from the app
- Completion status tracked per team
- Deadline reminders tied to each form
- **(Implemented)** the Forms checklist tracks **12 ISEF forms**, each expandable into a full in-app guide (what it is, who needs it, section-by-section walkthrough — `ISEF_FORM_GUIDES` in `lib/fairs/forms.ts`), plus a **hazard-class primer** (4 classes, `lib/fairs/safety.ts`) so teams can tell which conditional forms apply to their project

### 13.6 Project Board Specifications
- Standard tri-fold board dimensions and display rules
- ISEF display compliance rules (what's allowed and what isn't on the board)
- Layout examples and templates
- Cross-linked from the Showcase Wing so students can prepare both physical and digital presentations side by side

### 13.7 Reminders & Notifications
- An in-app **notification bell** (implemented) surfaces the team's notifications, each rendered with a kind-specific icon, accent, and chip label. Five notification **kinds** exist (stored as a string on `notifications`, deduped by `dedupe_key`): **`fair_deadline`** (deadline reminder), **`urgency`** (nudge — e.g. a teacher nudge, §15), **`teacher_feedback`**, **`phase_reviewed`** (a phase-advance request was reviewed), and **`showcase_reviewed`**.
- Per-user notification preferences (`notification_prefs`) hold email opt-in and the days-before-deadline reminder schedule (default: 30 / 14 / 7 / 1 day prior).
- *(Planned)* the automated engine that actually **fires** deadline reminders on a schedule and detects **smart urgency** (Project Log state vs. time remaining before a fair) — the bell and preference plumbing exist; the cron/urgency producer does not yet.
- *(Planned)* optional email and push delivery.

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
| **Lab Type Assignment** | end of `literature_review` | Auto-classified from the one-sentence research idea (Haiku), not a manual screen; triggers lab growth + reskin (§3–§4) |
| **Literature Review** | `literature_review` | Upload, quiz, relevance probe |
| **Literature Library** | `literature_review` | Searchable archive of processed papers |
| **Daily Activities** | `literature_review` | Field Codex, Expertise, Project Log, Failure Log |
| **Research Plan** | `research_planning` | Google Doc connect + type-specific AI review + web-search idea check (§9.5) |
| **Building Purchases** | `working` | KP-based; building catalog available |
| **Building Upgrades** | `working` | Levels 1–15; KP every level + LC at tier-ups (→4/7/10/15); no clearance cap (§9.2) |
| **PvP Raids** | `working` | Daily raid cap; random matchmaking with limited refinds (§11) |
| **Data Terminal — Experiments** | `working` | Experiment/measurement tracking + graphing |
| **Data Terminal — Reference Guides** | `discovery` | Stats / Charts / Plot guides; always available, no phase gate (§7.6) |
| **Rubric Self-Check** | `discovery` | Judge-readiness /100 against the ISEF rubric (§13.3); Fair Hub is always available |
| **Showcase Wing** | `showcase` | Public-facing portfolio system |
| **Prestige Cosmetics** | `showcase` | Unique aesthetic, title, legendary module — for teams that place at a higher-level competition |

> **Enforcement:** Feature access is gated in **two places**: (a) the nav/UI shows locked items with a pixel padlock and disables navigation, and (b) every relevant API route calls `assertFeatureUnlocked()` from `lib/phase.ts` and returns HTTP 403 for requests outside the team's current phase. Client-only gating is not acceptable.

---

## 15. Teacher Dashboard

> **Status (as built):** the teacher dashboard is **live for the pilot core**. Implemented today (route group `app/(teacher)/`, API under `app/api/teacher/`): the **Class Roster** (one row per student, with phase, last-activity, and attention flags — `unlogged` / `stale` for working-phase teams, pending phase-advance requests), the **Validations** queue (approve/reject a phase-advance request; approval atomically bumps the team's phase, notifies the team, and writes an audit row), **Showcase moderation**, a **phase-adaptive student detail view** (including read-only literature access), teacher **feedback**, and a daily **nudge** (§15.11). Reports, bulk actions, and richer per-phase analytics remain deferred to post-pilot. The design below describes the full intended dashboard; the "Pilot Phase Minimum" (§15.11) is what actually ships now.

### 15.1 Purpose
The teacher dashboard is the central tool for educators running scienium. Its design philosophy reflects the reality of how teachers actually use software: they have 10 minutes between classes, not 2 hours after school, so the dashboard must surface what needs attention rather than requiring browsing through all students.

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
| Phase-advance request pending >2 days | Yellow dot |
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
| **Validations** | Phase-advance request queue with badge count |
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
- *Teacher actions:* review the hypothesis/research stage, suggest additional sources, leave feedback on any paper

#### Working Phase
- Virtual lab view (read-only) showing all buildings and their levels
- **Expandable side panel for daily logs** — chronological list of Project Log and Failure Log entries with their artifacts
- Data Terminal contents (if unlocked)
- Current rubric self-assessment scores (if completed)
- Failure Wall summary
- *Teacher actions:* validate data collection start (advances the team to `working`), validate competition advancement (advances the team to `showcase`), leave feedback on any log entry, contribute teacher rubric ratings to compare against student self-assessment

#### Showcase Phase
- Showcase preview as it would appear publicly
- Privacy level, parental consent status (for minors)
- *Teacher actions:* approve for school-public, request changes, leave inline feedback

### 15.6 Validation Workflows

Phase-advance approval is the teacher's most consequential interaction. The teacher-gated transitions are **research_planning → working** (data collection start) and **working → showcase** (competition advancement); the earlier literature_review gate is a mechanical 25-source check that needs no teacher action. A student *requests* an advancement and the teacher approves it. The flow:

1. Teacher sees pending requests via roster indicators or the Validations tab
2. Clicks a pending phase-advance card
3. Sees the relevant evidence in context:
   - **→ Working (data collection):** recent Project Log entries, explicit "data collection underway" confirmation checkbox (the most easily falsifiable, so the teacher may need to ask the student to demonstrate in person)
   - **→ Showcase (competition advancement):** confirmation of advancement to a school/regional fair
4. Approves, requests changes, or rejects with a note
5. On approval: the `phase_advance_requests` row is marked approved and the team's phase is bumped, unlocking the next set of features

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

### 15.10 Reports — *implemented (in-app)*
- **Class Reports tab (`/teacher/reports`, implemented):** class-wide analytics aggregated read-only from existing data — phase distribution, engagement/progress summaries per team and student. Zero LLM; no new tables.
- *(Planned)* PDF export of the same summaries for administration / parent communication.

### 15.11 Pilot Phase Minimum

For the 120-student pilot, the dashboard ships with the essentials, and these are **built**:
- Class Roster with phase indicators and attention triggers (`unlogged` / `stale`)
- Student Detail View (phase-adaptive, incl. read-only literature access)
- Validations queue (phase-advance approve/reject with atomic phase bump + team notification + audit row)
- Showcase moderation queue
- Teacher feedback on entries
- **Nudge (implemented):** on a roster row flagged `unlogged` or `stale`, the teacher can send a one-tap nudge. It creates an `urgency` notification for that team (surfaced on the student notification bell, §13.7) and writes a `teacher_feedback` audit row. It is IDOR-guarded (the teacher must own the team's class) and deduped to **one per team per day** (a repeat tap simply reports "already nudged"); an optional short note can be attached. The row shows a "Nudged" badge after sending.

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

## 17. Platform

| Phase | Platform |
|---|---|
| **Phase 1** | Web app (responsive, mobile-first design) |
| **Phase 2** | iOS and Android native apps (React Native, shared business logic) |

### 17.1 Security & Abuse Prevention

scienium serves minors and calls paid AI APIs, so abuse prevention is a first-class requirement, not an afterthought. (Implementation details live in `architecture.md` §7.)

- **Rate limiting on all endpoints.** Every API route is rate-limited per authenticated user (with a coarse per-IP backstop tuned so a shared school/NAT network isn't penalized). The AI-backed actions — paper chat, quiz generation/grading, research-plan review, "has this been done before?" idea-check, and fair-deadline reads — are capped tightly because each call costs money; runaway or scripted use is throttled with a friendly "slow down" response rather than a hard failure. Idea-checks keep their per-team daily cap (3/day). Invite-code redemption is throttled to make code guessing impractical.
- **Strict input validation.** All user input is validated against a schema: correct types, sensible length limits, and rejection of unexpected fields. Oversized or malformed submissions are refused with a clear error.
- **Safe file uploads.** Uploaded research PDFs have a size cap and are verified to actually be PDFs (not just by their claimed type). *(Open: virus scanning and video-size caps for the Showcase phase — see §18.)*
- **No secrets in the browser.** All third-party API keys (AI, storage) are used only on the server; none are ever shipped to the client, and internal error details are never returned in API responses.
- **Untrusted external content is sanitized.** Externally-sourced HTML (e.g. Wikipedia articles in Discovery) is run through an allowlist sanitizer before display, so it can't inject scripts.

---

## 18. Open Design Questions

- [ ] Team Clearance Level: average, highest, or weighted?
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
- [ ] PvP: per-type / per-building spell effect differentiation — all spells are the identical AOE damage spell for now; distinct effects are significant creative work being brainstormed separately
- [ ] PvP: exact trophy gain/loss threshold (~30% destruction?) and the loss-scaling formula
- [ ] PvP: daily raid cap value, and refind cap — per raid session or per day?
- [ ] PvP: should the defender's trophies also change when their base is raided?
- [ ] PvP: building health scaling per level, spell damage/radius/cooldown per level — economy of a 15-second raid
- [ ] PvP: should a trophy floor cap losses (never drop below zero / a baseline) to avoid demoralizing students?
- [ ] PvP: bring back ranked tiers (Bronze→Master) and seasonal resets from the old battle design, or keep a plain class trophy count?
- [ ] PvP: spell visual FX direction — cast animation, blast radius telegraph, building damage states
- [ ] Gateway buildings: final names (must not be "laboratory") and sculpt identities for all 7
- [ ] Operations Hub: does it unlock at `literature_review` (current assumption) — and if daily pillars are meant to be "day one," how are they reached before the Hub exists?
- [ ] Science Fair Research building: appears at `discovery` (reference material early) or later, given buildings otherwise appear chronologically?
- [ ] Gateway reskin: confirm background/environment stays constant per lab type for the pilot (no biome change)

---

## 19. Visual & Art Direction

> **Status:** Direction set. The **7 gateway sprites are drawn** — code-generated at 64×64 on a 16-colour palette and wired through the sprite manifest. **Per-building economy sprites are retired**: economy buildings no longer receive bespoke individual sprites (nor per-building upgrade-tier reskins); they render with a **shared generic sprite treatment** instead. The previously generated per-building art and its catalog (`art/building.md`) remain in the repo for reference only and are no longer maintained. This section remains the source of truth for the pixel-art look; technical asset specs (dimensions, file paths, manifest) live in `architecture.md` §9.4.

### 19.1 Overall Aesthetic
scienium is a **pixel-art** game. The target is a **chunkier, lower-resolution** look than the two reference images supplied during design — those references read as high-resolution/HD pixel art, and the intended style is more visibly pixelated (fewer, larger pixels; a tighter palette). Think classic 2D top-down/isometric game art rather than detailed illustration.

### 19.2 Reference Decomposition (avoiding "lost in translation")
Two reference images informed the look, and each contributes **one** thing — they are not to be blended literally:

| Reference | Take **only** this | Do **not** take |
|---|---|---|
| `Labratory_Design.png` (cozy building w/ sign) | **Form language** — a clear, charming, approachable standalone structure that instantly reads as "a building you walk up to and enter" | Its specific colors; its exact (Stardew-like) art; the word "Laboratory" on the sign |
| `Color_Scheme.png` (isometric forest lab) | **Palette** — lavender/grey structure, glowing cyan-teal glass, warm orange accents | Its building shape; its HD resolution |

The brief in one line: **the approachable building silhouette of the first reference, rendered in the palette of the second, at a more pixelated resolution, as an original sculpt.**

### 19.3 Generic (pre-specialization) Palette
The shared base palette all gateway buildings start in:
- **Structure:** lavender / grey-purple (cool, neutral)
- **Glass / screens:** glowing cyan-teal
- **Accents / lights:** warm orange
- **Read:** clean sci-fi research facility, discipline-neutral

### 19.4 Lab-Type Reskin Palettes (post-specialization)
On specialization, gateway buildings recolor to the chosen lab type. Palettes below are **starting direction**, to be refined in the design system:

| Lab Type | Palette direction |
|---|---|
| **BioCore** | Greens + organic teal, warm wood/amber accents |
| **ChemWorks** | Glassware blues + reactive orange/violet accents |
| **Volt Lab** | Industrial steel grey + electric yellow/cyan accents |
| **TerraBase** | Earthy ochre/slate + mineral teal accents |
| **MindFrame** | Muted indigo/violet + soft magenta accents |
| **Axiom** | Deep space navy + starlight gold/cyan accents |

### 19.5 Reskin Scope
- **Only the gateway buildings reskin.** The background/environment stays constant for the pilot (no per-type biome).
- The 60 economy buildings use a **shared generic sprite** (no per-building art — see the Status note above), so no reskin applies to them.

### 19.6 UI / Panels
- Feature panels open **over** the lab scene (modal/overlay), styled in the same pixel-art frame language (chunky borders, pixel font).
- Pixel font for in-game UI with accessible fallbacks; locked buildings show a pixel padlock.
