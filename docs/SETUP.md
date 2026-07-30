# scienium — Setup

Everything you need to clone this repo and resume development — running the web
app, the local database, the pixel-art pipeline, and Claude Code with the
vendored `pixel-art-generator` skill.

This guide covers both **macOS/Linux** and **Windows** in one walkthrough — the
steps are the same across platforms except where noted. Wherever a command
differs by OS, both are given inline as a **macOS / Linux** / **Windows
(PowerShell)** pair.

> The web app is the complete runtime. AI features call Anthropic from Next.js;
> Python is used only by repository art and maintenance scripts.

---

## 0. Prerequisites (install once)

**macOS / Linux**
```bash
# Homebrew (if you don't have it): https://brew.sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install git node pnpm python@3.12       # Node 24+, pnpm 10+, Python 3.12
brew install --cask docker                    # OPTIONAL — only for the local-Postgres alternative
```
**Windows (PowerShell)**
```powershell
# Install Git, Node.js, Python (Docker is OPTIONAL — only for the local-Postgres alternative)
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Python.Python.3.12 -e
npm install -g pnpm
winget install --id Docker.DockerDesktop -e   # OPTIONAL — see §4
```

**Windows:** close and reopen PowerShell after installing so the new tools are
on your `PATH`.

The default database is **Supabase** (cloud), so Docker is **optional** — install it
only if you want to run Postgres locally instead (see §4).

Verify:

**macOS / Linux**
```bash
node -v        # >= 20
pnpm -v        # >= 9
python3 -V     # >= 3.11
docker -v      # only if you'll use the local-Postgres alternative
```
**Windows (PowerShell)**
```powershell
node -v           # >= 20
pnpm -v           # >= 9
py -3 --version   # >= 3.11
docker -v         # only if you'll use the local-Postgres alternative
```

If you'll use the local-Postgres alternative, open **Docker Desktop** once so the
daemon is running. For the default Supabase setup you don't need Docker at all.

---

## 1. Clone

**macOS / Linux**
```bash
git clone https://github.com/blackyeti3405/scienium.git
cd scienium
```
**Windows (PowerShell)**
```powershell
git clone https://github.com/blackyeti3405/scienium.git
Set-Location scienium
```

---

## 2. Environment variables

`.env.local` is **git-ignored** (secrets never leave your machine), so it isn't in
the repo — recreate it from the example:

**macOS/Linux:** `cp apps/web/.env.example apps/web/.env.local`
**Windows (PowerShell):** `Copy-Item apps/web/.env.example apps/web/.env.local`

Then edit `apps/web/.env.local`:

| Variable | Where to get it | Notes |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys | `pk_test_…` |
| `CLERK_SECRET_KEY` | Clerk dashboard → API Keys | `sk_test_…` |
| `NEXT_PUBLIC_CLERK_*_URL` | leave as the defaults | sign-in/up + `FALLBACK_REDIRECT` / `SIGN_UP_FORCE_REDIRECT` routes |
| `DATABASE_URL` + `DIRECT_URL` | Supabase → Project → Connect | pooled (port 6543, `?pgbouncer=true`) for runtime + session (port 5432) for migrations — see §4 |
| `ANTHROPIC_API_KEY` | Anthropic console | required for paper metadata, quizzes, chat, lab-type classification, and relevance checks |
| `R2_*` | Cloudflare R2 | required for PDF storage **and project-log photo attachments** (uploads + viewer) |
| `FIRECRAWL_API_KEY` | [firecrawl.dev](https://firecrawl.dev) | optional — only the Science Fair "sync deadlines" feature scrapes fair sites with it (`fc-…`) |
| `OPENALEX_API_KEY` | [OpenAlex](https://openalex.org/rest-api) | optional — the Discovery **Papers tab** (merged arXiv + PubMed + open-access search, citations; OpenAlex serves all three). Works keyless, but the anonymous pool rate-limits (503s); a free key avoids that. No AI — keyword search + factual citation edges only |
| `PATENTSVIEW_API_KEY` | [PatentsView](https://patentsview.org/apis/keyrequest) | optional — live results in the Discovery **Prior art (patents)** lane; keyless mode degrades to a Google Patents search link-out card |
| `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` | [sentry.io](https://sentry.io) → your project → Client Keys (DSN) | optional locally — error tracking + the in-app "Report a bug" form. Same value in both vars (server + browser). Empty = the SDK is a no-op and the bug-report button hides itself. **Required in production.** Works from localhost; no deploy needed to test |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | Sentry → Settings (org/project slugs; Auth Tokens) | build-time only — uploads source maps so production stack traces are readable. Safe to leave empty; builds just skip the upload |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | — |

You need **Clerk keys + `DATABASE_URL` + `DIRECT_URL` + `ANTHROPIC_API_KEY`** to run
the core app; add the `R2_*` values to enable PDF upload/viewing and Operations-Hub
photo attachments. `FIRECRAWL_API_KEY` is only needed if you use the fair deadline sync.

### Clerk redirect URLs
In your Clerk dashboard, allow `http://localhost:3000` as a development origin.
After sign-in Clerk sends users to `/dashboard`, which **redirects to `/lab`** (the
spatial scene). No extra config needed.

---

## 3. Install JS dependencies

```bash
pnpm install
```

(Monorepo via pnpm workspaces — installs `apps/web` and shared packages.)

---

## 4. Database (Supabase)

The app uses **Supabase Postgres**. Create a free project at
[supabase.com](https://supabase.com), then from **Project → Connect** copy the two
connection strings into `apps/web/.env.local`:

- **`DATABASE_URL`** — the **Transaction** pooler (port **6543**); keep the
  `?pgbouncer=true&connection_limit=1` suffix (required so Prisma works through PgBouncer).
- **`DIRECT_URL`** — the **Session** pooler (port **5432**); used only by migrations.

Then generate the Prisma client and build the schema:

**macOS / Linux**
```bash
cd apps/web
pnpm prisma generate
pnpm prisma migrate deploy      # applies the squashed baseline + subsequent migrations from zero
cd ../..
```
**Windows (PowerShell)**
```powershell
Set-Location apps/web
pnpm prisma generate
pnpm prisma migrate deploy      # applies the squashed baseline + subsequent migrations from zero
Set-Location ..\..
```

> **Adding a unique index?** The migration that creates it must first remove the
> duplicates the old schema permitted — a later migration is too late, because
> `CREATE UNIQUE INDEX` aborts the whole deploy on the first colliding pair. Prefer
> quarantine (null the column, keep the row) when the row is or parents student
> work. `pnpm --filter web verify:migration-preflights` proves a preflight against
> your real local PostgreSQL inside a rolled-back transaction, and
> `test/migration-unique-index-policy.test.ts` fails the build if a new migration
> skips one without a stated exemption.
>
> The migration history was squashed to one baseline
> (`prisma/migrations/00000000000000_init`); `migrate deploy` builds a fresh
> database from scratch by applying it plus the few migrations added since.

> **Local-Postgres alternative (optional):** instead of Supabase you can run Postgres
> in Docker — `docker compose -f infra/docker-compose.yml up -d postgres` — and point
> **both** `DATABASE_URL` and `DIRECT_URL` at
> `postgresql://postgres:postgres@localhost:5432/scienium`, then run the same
> `prisma generate` + `migrate deploy`.

> Seed data (buildings — each with its PvP spell type, lab types, ISEF
> categories) lives in `infra/seed/*.ts` but isn't wired to a runner yet. The
> lab UI works without it — the page falls back to discovery-phase defaults
> when a team/row is missing.

---

## 5. Run the web app

```bash
pnpm dev            # = pnpm --silent --filter web dev
# open http://localhost:3000
```

Sign in → you land on **`/lab`**, the spatial lab scene.

#### Why `--silent`, and the one line it can't hide

Ctrl-C kills `next dev` by signal, so pnpm's filtered runner reads a perfectly
normal exit 130 as a failed script and prints a wall of red over it:

```
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] web@0.0.1 dev: `node scripts/gen-sprite-versions.mjs && …`
Command failed with signal "SIGTERM"
[ELIFECYCLE] Command failed.
```

Nothing failed — that's just how Ctrl-C looks. `--silent` suppresses pnpm's own
lifecycle chatter while passing the child's stdout **and** stderr straight
through, so Next's banner and any genuine startup error are unaffected. It's on
`dev` only; `build`/`lint`/`test` still want pnpm's reporting in CI.

One `[ELIFECYCLE] Command failed.` survives, printed by the *outer* `pnpm dev`,
which can't silence itself from inside its own script. For total silence:

```bash
pnpm --silent dev
```

### Previewing any phase without DB data
A **dev-only** URL override lets you inspect every state (it's disabled in
production builds):

```
/lab?phase=working                          # 6 buildings, generic palette
/lab?phase=showcase&lab=biocore&presenter=1 # all 7, BioCore reskin, Showcase unlocked
/lab?phase=showcase&lab=axiom               # Axiom reskin, Showcase locked (padlock)
```

`phase` ∈ discovery · lab_selection · literature_review · research_planning · working · showcase
`lab` ∈ biocore · chemworks · volt_lab · terrabase · mindframe · axiom

### Code / Lab-mode Python runtime (optional)

Sheets mode needs nothing extra. The Data Terminal's **Code** and **Lab** modes
run Python (Pyodide + numpy/scipy/statsmodels/matplotlib) in a Web Worker, and
the wheels are served by a same-origin proxy — never from a CDN — so before those
lanes work locally you must populate the on-disk cache once:

```bash
node apps/web/scripts/fetch-pyodide.mjs     # ~500 MB extracted into apps/web/.pyodide-cache/ (gitignored)
```

With `.pyodide-cache/` present the proxy (`/api/data-terminal/runtime/[...path]`)
auto-serves from it; set `PYODIDE_SOURCE=local` to pin it. You do **not** need this
for Sheets mode or any non–Data-Terminal work. In production the same wheels are
served from R2 (`PYODIDE_SOURCE=r2`, uploaded once with
`node apps/web/scripts/upload-pyodide-to-r2.mjs` — see §8.1).

### Useful checks
```bash
pnpm --filter web typecheck     # tsc --noEmit
```

### Troubleshooting
- **`P1001: Can't reach database server`** — a Supabase **free-tier project auto-pauses when idle**. Resume it in the dashboard (Project → "Restore"); pausing doesn't delete data. A local Postgres (see Quick reference) avoids this entirely.
- **`P2024: Timed out fetching a connection from the pool`** — raise `connection_limit` on the pooled `DATABASE_URL` (e.g. `=10`) for a long-running dev server; `=1` only suits serverless.
- **Outbound calls (Supabase / OpenAlex / Upstash) hang ~2 min then fail, but `curl` is instant** — broken IPv6 on your network (Node defaults to IPv6-first). The `dev`/`start` scripts already force IPv4 via `NODE_OPTIONS=--dns-result-order=ipv4first`.
- **(Windows) `pnpm` / `node` / `py` not recognized** — reopen PowerShell (or sign out/in) after installing so `PATH` refreshes; `winget` installs don't update already-open shells.
- **(Windows) Script-execution policy errors when running pnpm** — run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, then retry.

---

## 6. Pixel-art pipeline

Sprites are generated from code under `art/`. Full docs: [`art/README.md`](../art/README.md).

**macOS / Linux**
```bash
pip3 install Pillow numpy       # numpy only needed to re-import the Discovery reference

python3 art/iso.py              # 7 isometric gateway buildings
python3 art/build_sprites.py    # 9 ground tiles + padlock
python3 art/recolor.py          # 42 lab-type reskins
python3 art/compose_scene.py    # optional full-scene previews -> art/scene_*.png
```
**Windows (PowerShell)**
```powershell
py -3 -m pip install Pillow numpy       # numpy only needed to re-import the Discovery reference

py -3 art/iso.py              # 7 isometric gateway buildings
py -3 art/build_sprites.py    # 9 ground tiles + padlock
py -3 art/recolor.py          # 42 lab-type reskins
py -3 art/compose_scene.py    # optional full-scene previews -> art/scene_*.png
```

Output PNGs land in `apps/web/public/sprites/`. The reference art (including
`art_ref/scienium_discovery.png`, the canonical Discovery building) is committed,
so `art/iso.py` reproduces everything.

> **Economy buildings no longer get bespoke per-building sprites** (design
> change — see `SPEC.md` §19); in-game they use a shared generic sprite
> treatment. The old per-building builders under
> `.claude/pixel-art-pipeline/builders/` and `art/montage.py` remain in the repo
> for reference only and are not part of the sprite regeneration flow.

---

## 7. Claude Code

Install Claude Code and open the repo — the `pixel-art-generator` skill is
**vendored in the repo** at `.claude/skills/pixel-art-generator/`, so it's
available automatically.

**macOS / Linux**
```bash
npm install -g @anthropic-ai/claude-code   # or use the Claude Code desktop app
cd scienium
claude                                       # sign in with your Anthropic account
```
**Windows (PowerShell)**
```powershell
npm install -g @anthropic-ai/claude-code   # or use the Claude Code desktop app
Set-Location scienium
claude                                       # sign in with your Anthropic account
```

Inside Claude Code, type `/pixel-art-generator` (or just ask it to make/recolor a
sprite) and it will use the `art/` pipeline. The plan/skill files from this work
are in the repo; project context lives in `SPEC.md`, `ARCHITECTURE.md`, and
`art/README.md`.

> Tip: the repo's [`CLAUDE.md`](../CLAUDE.md) at the root is auto-loaded as project
> memory by Claude Code — the house rules and pipeline gates live there.

---

## 8. Production deployment (Vercel + managed services)

The web app is built for **Vercel**. This section is the complete checklist for a
production deploy — do it whenever you're ready; nothing here is needed for local
development.

### 8.1 Production environment variables

Set these in **Vercel → Project → Settings → Environment Variables**, scoped to
**Production** (and **Preview** if you use preview deploys). They mirror
`apps/web/.env.example`.

**Required**

| Variable | Production value / source | Notes |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk **production** instance | `pk_live_…` |
| `CLERK_SECRET_KEY` | Clerk **production** instance | `sk_live_…` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `…SIGN_UP_URL` / `…FALLBACK_REDIRECT_URL` / `…SIGN_UP_FORCE_REDIRECT_URL` | keep the defaults from `.env.example` | sign-in/up + redirect routes |
| `DATABASE_URL` | Supabase/managed Postgres — **pooled** connection string | runtime queries |
| `DIRECT_URL` | same DB — **direct** (non-pooled) connection | used only for `prisma migrate deploy` |
| `ANTHROPIC_API_KEY` | Anthropic console | paper metadata, quizzes, chat, grading, classification |
| `R2_ACCOUNT_ID` · `R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY` · `R2_BUCKET_NAME` | Cloudflare R2 | PDF storage, project-log photos, showcase assets (private bucket; streamed via authed routes) |
| `VIEW_FINGERPRINT_SALT` | generate: `openssl rand -hex 32` (≥16 chars) | **Required in production.** Dedicated salt for showcase per-visitor view fingerprints. The view-tracking path **fails closed** without it (the rest of the app is unaffected). Use a value distinct from any dev salt. |
| `NEXT_PUBLIC_APP_URL` | your production URL, e.g. `https://scienium.app` | — |

**Optional**

| Variable | When to set | Effect |
|---|---|---|
| `FIRECRAWL_API_KEY` | only if using Science-Fair "sync deadlines" | scrapes fair sites (`fc-…`) |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | multi-instance / serverless scale-out | switches rate limiting to a **shared** store so limits hold globally across instances (default is per-instance in-memory) |
| `RATE_LIMIT_IP_HEADER` | only if your edge sets a non-standard client-IP header | overrides the trusted-IP source (default order: `cf-connecting-ip` → `x-real-ip` → `x-forwarded-for`) |
| `PYODIDE_SOURCE` | set to `r2` in production | tells the Data Terminal runtime proxy to serve the Pyodide/scipy wheels from the R2 bucket instead of a local `.pyodide-cache/` (which isn't on the serverless filesystem). Upload the wheels once — see §8.2 step 5. Leave unset in local dev. |

> **One-liner to set the salt** (with the Vercel CLI):
> ```bash
> openssl rand -hex 32 | vercel env add VIEW_FINGERPRINT_SALT production
> ```
> **Windows:** if `openssl` is not available in your PowerShell session, run it from Git Bash or WSL, or generate a random value another way and add it manually in Vercel.

### 8.2 Deploy steps

1. Import the GitHub repo in Vercel. Set **Root Directory = `apps/web`**, framework
   **Next.js**, install command `pnpm install`, build `pnpm build`.
2. Add the env vars from §8.1 (pointed at managed services).
3. Add your Vercel domain to **Clerk's allowed origins** (production instance).
4. Run `pnpm prisma migrate deploy` against the production DB (Vercel build step or
   a one-off using `DIRECT_URL`) — migrations are **not** auto-applied.
5. Upload the Data Terminal Python runtime to R2 **once** (and again only when the
   pinned Pyodide version bumps): `node apps/web/scripts/upload-pyodide-to-r2.mjs`
   with the `R2_*` vars set, then set `PYODIDE_SOURCE=r2`. Without this, Code and
   Lab modes can't load their wheels in production; Sheets mode is unaffected.

### 8.3 Pre-launch verification

```bash
pnpm --filter web typecheck     # types (strict)
pnpm --filter web test          # unit suite
pnpm --filter web lint          # ESLint (next/core-web-vitals)
pnpm --filter web build         # production build — must succeed before deploy
```

If you deploy and forget `VIEW_FINGERPRINT_SALT`, the app still boots and
everything works **except** showcase view-counting, which errors until you add
the var and redeploy (config-only fix, no code change).

Architecture, hosting choices, the schema, and the 0.6.0 hardening details
(rate-limit backends, `requireTeamContext`, view-fingerprint salt) are documented
in [`ARCHITECTURE.md`](ARCHITECTURE.md) (see §12).

---

## 9. Team workflow & CI

How we work as a team and what the automated check on each change is.

### 9.1 The day-to-day flow

We use a **pull-request workflow** — `main` always stays releasable.

**macOS / Linux**
```bash
git checkout main && git pull            # start from latest main
git checkout -b your-feature             # branch for your change
# ...make changes, commit...
git push -u origin your-feature          # push the branch
gh pr create                             # open a PR (or use the GitHub UI)
```
**Windows (PowerShell)**
```powershell
git checkout main
git pull                                 # start from latest main
git checkout -b your-feature             # branch for your change
# ...make changes, commit...
git push -u origin your-feature          # push the branch
gh pr create                             # open a PR (or use the GitHub UI)
```

On the PR: **CI runs automatically**, a teammate reviews, and once it's green +
approved you **Squash and merge**. Delete the branch after merge.

Before pushing, run the same checks CI will run, so you don't wait on a red PR:

**macOS / Linux**
```bash
cd apps/web
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
**Windows (PowerShell)**
```powershell
Set-Location apps/web
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

### 9.2 What the `verify` check is

`verify` is the single job in our CI workflow ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).
It runs on **every pull request and every push to `main`**, and it is the green ✓
(or red ✗) you see on a PR. In order, it:

1. **Installs** dependencies (`pnpm install --frozen-lockfile`)
2. **Builds `@scienium/shared-types`** — that package compiles to a git-ignored
   `dist/`, and the web app imports its types (a `prepare` script also builds it
   on `pnpm install`, so fresh clones work too)
3. **Generates the Prisma client** (needed for type-checking)
4. **`typecheck`** — `tsc --noEmit` (strict)
5. **`lint`** — ESLint (`next/core-web-vitals`)
6. **`test`** — the Vitest unit suite
7. **`build`** — a full `next build` with placeholder env (routes are dynamic, so
   the values only need to be *present*; swap in repo Actions secrets for a
   faithful build)

If any step fails, `verify` goes red — that's the signal **not** to merge until
it's fixed. A green `verify` means types, lint, tests, and the production build
all pass.

### 9.3 Branch protection (the gate)

A **ruleset** on `main` is configured to require a PR, **1 approval**, and a
passing `verify` check before merge. Repository **admins** are on the bypass list
(mode **Always**) so the owner can still push directly when working solo; everyone
else goes through the gate.

> ⚠️ **Plan limitation:** rulesets / branch protection are **not enforced on a
> private repo under a free personal account.** Right now the ruleset exists but
> isn't enforced, so the gate is **convention, not hard-enforced**: CI still runs
> on every PR, but GitHub won't *block* a merge.
>
> To make it a real gate, either:
> - move this repo into a **GitHub Organization on the Team plan** (recommended for
>   a team — also gives team permissions, org rulesets, and shared secrets), or
> - make the repo **public** (free enforcement — but not advisable here, since the
>   app handles student data).
>
> The ruleset config is saved and activates automatically once the repo is on a
> qualifying plan — no rework needed. Tracked as a launch blocker in
> [`SECURITY.md`](SECURITY.md) §1.1 ("Repository / CI").

**Until enforcement is on, the team agreement is:** always open a PR, wait for a
**green `verify`**, and get **one review** before merging. Don't push straight to
`main` unless you're the owner doing intentional solo work.

---

## E2E tests (Playwright)

The E2E suite (`apps/web/e2e/`) drives a real logged-in browser against the dev
DB using Clerk test accounts — set `E2E_LEADER_*`, `E2E_STUDENT_*`, and
`E2E_TEACHER_*` in `apps/web/.env.local` (see `.env.example`).

**`*_IDENTIFIER` is the Clerk USERNAME, not the email.** This instance signs in
by username (`devuser2`, `devuser4`, `DevTeacher`), and `clerk.signIn` with an
email address is rejected even when the password is correct and the address is
on the account — a confusing failure, because `auth.setup.ts` can only report
"failed to authenticate — check the E2E creds". If you hit it, verify the
password independently before doubting it:
`POST https://api.clerk.com/v1/users/<id>/verify_password`. `seed:e2e` resolves
the same identifier against `User.name`, which is where the app stores that
username.

**Use dedicated test accounts — never a personal/play account.** The suite
churns the leader/student team every run (spends KP, places/sells buildings,
resets currency to a baseline), so any account wired as `E2E_LEADER`/`E2E_STUDENT`
has its lab continuously reset. To avoid burning a second dedicated account, you
can point `E2E_STUDENT_IDENTIFIER`/`_PASSWORD` at the **same** account as
`E2E_LEADER`: `seed:e2e` then reuses the leader as the student, and the two
cross-member specs (`F13` codex isolation, `F18` vega sharing) collapse to one
account (F13's isolation assertion is skipped in that mode). Provision a separate
student account only if you need to exercise true multi-member isolation.

**A separate student account is what exercises `createLab`'s co-member path.**
Six specs now pass `bringCoMembers: true` (`e2e/lab.ts`), which vacates and
restores every other member of the fixture team for the file's lifetime. With the
student pointed at the leader, that code is a no-op and has never actually run —
so a genuine second account is the only way to test it. See `HANDOFF.md`.

**Never set the same key twice in `.env.local` — the runner now refuses to start
if you do.** `e2e/env.ts` is first-wins (a CI-provided secret must beat the
file), but `source .env.local` in a shell is LAST-wins. So a stale
`E2E_STUDENT_IDENTIFIER=` above your corrected one reads as fixed in the shell
and is silently ignored by the suite. The cost of that being quiet, measured
once: the "student" role signed in as the LEADER, and a test asserting *a
non-lead cannot remove anyone* ran as the lead, got its 200, and removed a real
member from the shared fixture. `loadTestEnv` now throws with the two line
numbers.

**Conscripting an account that already has a lab is fine, and it is announced.**
A fresh Clerk user completes onboarding by creating its own team, and
`TeamMember.userId` is `@@unique` (one team at a time, v0.71.0) — so wiring that
account as `E2E_STUDENT` means it must LEAVE its own lab. `seed:e2e` does this
deliberately: it deletes the stale membership with a raw delete (never
`departTeam`, whose archive-if-last and lead-transfer side effects must not fire
because a fixture borrowed an account) and prints
`membership: student vacated  left "<lab name>"`. The abandoned lab is left
intact — its `team_lead_id` may point at a non-member, which is tolerated
everywhere it matters and is undone by rejoining. **Do not wire an account whose
lab you care about.**

Beyond the accounts, the suite needs a **fixture graph** in the dev DB that the
app never creates on its own: an "E2E School" + "E2E Class" owned by the
teacher account, the "E2E Test Lab" team containing the leader/student, and the
students' class/school links (teacher-flow specs resolve scope through these
rows). Seed or repair all of it with:

```bash
pnpm --filter web seed:e2e
```

Idempotent — it prints each node as CREATED/FOUND/UPDATED and a second run
performs zero writes. It also restores the E2E team's currency baseline
(KP ≥ 100,000, clearance ≥ 3 — never lowered): suite runs spend the fixture
team's KP, and economy rebalances (e.g. Robotics Bay now requires clearance 3)
otherwise strand it below what placement/upgrade specs need. The three user rows
are Clerk-owned; when they are absent the seeder materializes them by reading the
**real** ids from the Clerk API (needs `CLERK_SECRET_KEY`), which is what lets the
fixture be built into an empty database. Without that key, sign in once with
`pnpm --filter web exec playwright test --project=setup` and re-run.

**The seeder never deletes**, so the fixture lab accumulates everything the suite
has ever written to it — measured at 2,119 rows before the 2026-07-26 cleanup, and
the single largest source of E2E flake. Clear it first:

```bash
pnpm --filter web reset:e2e     # add --dry to see the plan without writing
pnpm --filter web seed:e2e
```

`reset:e2e` is scoped strictly by team id, so it cannot touch `devlab` in the same
database, and it retires uploaded assets rather than deleting their ledger rows
(the R2 bucket is shared with production). Full audit of the suite's failure modes:
[`runbooks/e2e.md`](runbooks/e2e.md).

### Running one spec instead of the whole suite

`pnpm --filter web test:e2e <substring>` looks like it filters to one file but
doesn't — Playwright's positional argument is a substring match against test
file paths, so e.g. `F1` also matches `F10.spec.ts`, `F11.spec.ts`,
`F13-codex.spec.ts`, and more. Use the scoped wrapper instead, which requires
an exact path and fails loudly otherwise:

```bash
pnpm --filter web test:e2e:file e2e/F1.spec.ts
```

This still runs the `setup` project first (one sign-in per role, cached to
`e2e/.auth/`), then only the named spec — seconds instead of the full serial
suite. Use it while iterating on one feature; run the full `test:e2e` before
calling a change done.

**Server modes (v0.29.0):** the full `test:e2e` builds and serves a
**production bundle** (`E2E_BUILD=1` → `next build && next start`) — a
310-test serial run against `next dev` was structurally flaky (on-demand
compiles, dev-server degradation over ~30 min, and the dev error overlay
intercepting clicks after aborted requests). `test:e2e:file` keeps the dev
server for the fast iteration loop; prefix it with `E2E_BUILD=1` to reproduce
a full-suite result exactly (pays the ~3-min build). Don't run `pnpm dev` on
the same port either way — and never start a dev server while the E2E build
is in progress (shared `.next`).

**The `data-terminal-*` specs are the one place you must run `E2E_BUILD=1`.**
The Code/Lab specs boot Pyodide and pull ~65 MB of wheels (numpy/scipy/
statsmodels/matplotlib) into the worker before the first assertion, served by the
same-origin runtime proxy — so they need generous per-step timeouts, and the dev
server's on-demand compilation makes them flake. Against a production bundle they
are reliable. Run one with `E2E_BUILD=1 pnpm --filter web test:e2e:file
e2e/data-terminal-lab.spec.ts`, and make sure `.pyodide-cache/` is populated (or
`PYODIDE_SOURCE`/R2 configured) first — the proxy has to have wheels to serve.

**A `preflight` project now catches the port clash before any test runs.**
Playwright reuses whatever is already listening, and a server started any other
way never saw `E2E_SKIP_LLM` — so the suite would make real, paid Anthropic calls,
presenting as a schema-mismatch 502 that reads like a route regression. The
preflight proves stub mode by calling `/api/dev/e2e-health`, a route that only
exists when `E2E_SKIP_LLM=1`, and also verifies the runner and the server are on
the same database and that the fixture graph is present. Each failure prints its
own remedy.

### Authenticated API calls inside a spec

Clerk's session JWT is short-lived and only refreshes when clerk-js runs
inside a live page. A `page.request.*` call made long enough after the last
refresh silently 307-redirects to sign-in instead of returning JSON — the
suite's most common source of a mid-run "crash." Specs use `e2e/api.ts`'s
`api.get/post/put/patch/delete(page, url, opts)` instead of `page.request.*`
directly; it forces a Clerk token refresh from inside the page (no navigation,
no lost UI state) before every call. New specs should do the same rather than
calling `page.request` directly.

A related, not-yet-fixed gap: several specs also open a bare
`playwrightRequest.newContext({ storageState: STORAGE.<role> })` for
cross-role assertions (e.g. asserting what the teacher session sees from
inside a leader-authenticated spec). That API-only context has no page to run
Clerk's refresh in, so it is stuck with whatever JWT was on disk when the
`setup` project ran and goes stale the same way, deeper into a long run. The
known working pattern is a real `browser.newPage({ storageState })` +
`page.goto()` first (several specs already do this by hand — see
`F10-teacher-rubric.spec.ts`'s `refreshTeacherSession`); it has not yet been
consolidated into a shared helper.

### Faster, less flaky E2E: run against local Postgres

The remote Supabase dev DB adds seconds of latency to every mutation under
`next dev`, which both slows the suite and causes timing flakes. For E2E runs,
a local database is ~10× faster:

**macOS / Linux**
```bash
docker compose -f infra/docker-compose.yml up -d postgres
# point the app at it for this shell only (Clerk stays hosted — auth is unchanged):
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/scienium
export DIRECT_URL=$DATABASE_URL
pnpm --filter web exec prisma migrate deploy   # apply all migrations
pnpm --filter web seed:e2e                     # fixture graph (users appear on first sign-in)
pnpm --filter web test:e2e
```
**Windows (PowerShell)**
```powershell
docker compose -f infra/docker-compose.yml up -d postgres
# point the app at it for this shell only (Clerk stays hosted — auth is unchanged):
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/scienium"
$env:DIRECT_URL   = $env:DATABASE_URL
pnpm --filter web exec prisma migrate deploy   # apply all migrations
pnpm --filter web seed:e2e                     # fixture graph (users appear on first sign-in)
pnpm --filter web test:e2e
```

(Adjust the connection string to match `infra/docker-compose.yml`. The shared
Supabase dev DB remains the default for day-to-day `pnpm dev`.)

---

## Quick reference

| Task | macOS / Linux | Windows (PowerShell) |
|---|---|---|
| Day-to-day dev server (Supabase = no local DB daemon needed) | `pnpm dev` — web app at :3000 | `pnpm dev` — web app at :3000 |
| Regenerate all sprites | `python3 art/iso.py && python3 art/build_sprites.py && python3 art/recolor.py` | `py -3 art/iso.py; py -3 art/build_sprites.py; py -3 art/recolor.py` |
| Local-Postgres alternative — start | `docker compose -f infra/docker-compose.yml up -d postgres` | `docker compose -f infra/docker-compose.yml up -d postgres` |
| Local-Postgres alternative — stop | `docker compose -f infra/docker-compose.yml down` | `docker compose -f infra/docker-compose.yml down` |
