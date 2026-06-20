# NOVA Lab — Setup (macOS)

Everything you need to clone this repo on a Mac and resume development — running
the web app, the local database, the pixel-art pipeline, and Claude Code with the
vendored `pixel-art-generator` skill.

> The web app (Next.js) is the part you've been iterating on (the spatial lab
> scene). The Python **AI service** is optional and only needed for paper
> processing / content generation — skip it until you need those features.

---

## 0. Prerequisites (install once)

```bash
# Homebrew (if you don't have it): https://brew.sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install git node pnpm python@3.12       # Node 20+, pnpm 9+, Python 3.12
brew install --cask docker                    # Docker Desktop (local Postgres)
```

Verify:

```bash
node -v        # >= 20
pnpm -v        # >= 9
python3 -V     # >= 3.11
docker -v
```

Open **Docker Desktop** once so the daemon is running.

---

## 1. Clone

```bash
git clone https://github.com/blackyeti3405/nova-lab.git
cd nova-lab
```

---

## 2. Environment variables

`.env.local` is **git-ignored** (secrets never leave your machine), so it isn't in
the repo — recreate it from the example:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Then edit `apps/web/.env.local`:

| Variable | Where to get it | Notes |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys | `pk_test_…` |
| `CLERK_SECRET_KEY` | Clerk dashboard → API Keys | `sk_test_…` |
| `NEXT_PUBLIC_CLERK_*_URL` | leave as the defaults | sign-in/up + redirect routes |
| `DATABASE_URL` | leave as default for local Docker | `postgresql://postgres:postgres@localhost:5432/nova_lab` |
| `ANTHROPIC_API_KEY` | Anthropic console | required for paper metadata, quizzes, chat, lab-type classification, and relevance checks |
| `R2_*` | Cloudflare R2 | required for PDF storage **and project-log photo attachments** (uploads + viewer) |
| `FIRECRAWL_API_KEY` | [firecrawl.dev](https://firecrawl.dev) | optional — only the Science Fair "sync deadlines" feature scrapes fair sites with it (`fc-…`) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | — |

You need **Clerk keys + `DATABASE_URL` + `ANTHROPIC_API_KEY`** to run the core
app; add the `R2_*` values to enable PDF upload/viewing and Operations-Hub photo
attachments. `FIRECRAWL_API_KEY` is only needed if you use the fair deadline sync.

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

## 4. Local database (Docker)

Start Postgres:

```bash
docker compose -f infra/docker-compose.yml up -d postgres
```

Then generate the Prisma client and apply migrations:

```bash
cd apps/web
pnpm prisma generate
pnpm prisma migrate deploy      # applies existing migrations to the local DB
cd ../..
```

> Seed data (buildings, lab types, ISEF categories, moves) lives in `infra/seed/*.ts`
> but isn't wired to a runner yet. The lab UI works without it — the page falls
> back to discovery-phase defaults when a team/row is missing.

---

## 5. Run the web app

```bash
pnpm dev            # = pnpm --filter web dev
# open http://localhost:3000
```

Sign in → you land on **`/lab`**, the spatial lab scene.

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

### Useful checks
```bash
pnpm --filter web typecheck     # tsc --noEmit
```

---

## 6. Pixel-art pipeline

Sprites are generated from code under `art/`. Full docs: [`art/README.md`](art/README.md).

```bash
pip3 install Pillow numpy       # numpy only needed to re-import the Discovery reference

python3 art/iso.py              # 7 isometric gateway buildings
python3 art/build_sprites.py    # 9 ground tiles + padlock
python3 art/recolor.py          # 42 lab-type reskins
python3 art/compose_scene.py    # optional full-scene previews -> art/scene_*.png
```

Output PNGs land in `apps/web/public/sprites/`. The reference art (including
`art_ref/nova_lab_discovery.png`, the canonical Discovery building) is committed,
so `art/iso.py` reproduces everything.

---

## 7. Claude Code on your Mac

Install Claude Code and open the repo — the `pixel-art-generator` skill is
**vendored in the repo** at `.claude/skills/pixel-art-generator/`, so it's
available automatically.

```bash
npm install -g @anthropic-ai/claude-code   # or use the Claude Code desktop app
cd nova-lab
claude                                       # sign in with your Anthropic account
```

Inside Claude Code, type `/pixel-art-generator` (or just ask it to make/recolor a
sprite) and it will use the `art/` pipeline. The plan/skill files from this work
are in the repo; project context lives in `spec.md`, `architecture.md`, and
`art/README.md`.

> Tip: a `CLAUDE.md` at the repo root is auto-loaded as project memory by Claude
> Code. None exists yet — you can run `/init` in Claude Code to generate one.

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
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `…SIGN_UP_URL` / `…AFTER_SIGN_IN_URL` / `…AFTER_SIGN_UP_URL` | keep the defaults from `.env.example` | sign-in/up + redirect routes |
| `DATABASE_URL` | Supabase/managed Postgres — **pooled** connection string | runtime queries |
| `DIRECT_URL` | same DB — **direct** (non-pooled) connection | used only for `prisma migrate deploy` |
| `ANTHROPIC_API_KEY` | Anthropic console | paper metadata, quizzes, chat, grading, classification |
| `R2_ACCOUNT_ID` · `R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY` · `R2_BUCKET_NAME` · `R2_PUBLIC_URL` | Cloudflare R2 | PDF storage, project-log photos, showcase assets |
| `VIEW_FINGERPRINT_SALT` | generate: `openssl rand -hex 32` (≥16 chars) | **Required in production.** Dedicated salt for showcase per-visitor view fingerprints. The view-tracking path **fails closed** without it (the rest of the app is unaffected). Use a value distinct from any dev salt. |
| `NEXT_PUBLIC_APP_URL` | your production URL, e.g. `https://nova-lab.app` | — |

**Optional**

| Variable | When to set | Effect |
|---|---|---|
| `FIRECRAWL_API_KEY` | only if using Science-Fair "sync deadlines" | scrapes fair sites (`fc-…`) |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | multi-instance / serverless scale-out | switches rate limiting to a **shared** store so limits hold globally across instances (default is per-instance in-memory) |
| `RATE_LIMIT_IP_HEADER` | only if your edge sets a non-standard client-IP header | overrides the trusted-IP source (default order: `cf-connecting-ip` → `x-real-ip` → `x-forwarded-for`) |

> **One-liner to set the salt** (with the Vercel CLI):
> ```bash
> openssl rand -hex 32 | vercel env add VIEW_FINGERPRINT_SALT production
> ```

### 8.2 Deploy steps

1. Import the GitHub repo in Vercel. Set **Root Directory = `apps/web`**, framework
   **Next.js**, install command `pnpm install`, build `pnpm build`.
2. Add the env vars from §8.1 (pointed at managed services).
3. Add your Vercel domain to **Clerk's allowed origins** (production instance).
4. Run `pnpm prisma migrate deploy` against the production DB (Vercel build step or
   a one-off using `DIRECT_URL`) — migrations are **not** auto-applied.

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
in [`architecture.md`](architecture.md) (see §12).

---

## 9. Team workflow & CI

How we work as a team and what the automated check on each change is.

### 9.1 The day-to-day flow

We use a **pull-request workflow** — `main` always stays releasable.

```bash
git checkout main && git pull            # start from latest main
git checkout -b your-feature             # branch for your change
# ...make changes, commit...
git push -u origin your-feature          # push the branch
gh pr create                             # open a PR (or use the GitHub UI)
```

On the PR: **CI runs automatically**, a teammate reviews, and once it's green +
approved you **Squash and merge**. Delete the branch after merge.

Before pushing, run the same checks CI will run, so you don't wait on a red PR:

```bash
cd apps/web
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

### 9.2 What the `verify` check is

`verify` is the single job in our CI workflow ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).
It runs on **every pull request and every push to `main`**, and it is the green ✓
(or red ✗) you see on a PR. In order, it:

1. **Installs** dependencies (`pnpm install --frozen-lockfile`)
2. **Builds `@nova-lab/shared-types`** — that package compiles to a git-ignored
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
> qualifying plan — no rework needed. See [`SECURITY.md`](SECURITY.md) §4.

**Until enforcement is on, the team agreement is:** always open a PR, wait for a
**green `verify`**, and get **one review** before merging. Don't push straight to
`main` unless you're the owner doing intentional solo work.

---

## Quick reference

```bash
# day-to-day
docker compose -f infra/docker-compose.yml up -d postgres
pnpm dev                                   # web app at :3000

# regenerate all sprites
python3 art/iso.py && python3 art/build_sprites.py && python3 art/recolor.py

# stop local infra
docker compose -f infra/docker-compose.yml down
```
