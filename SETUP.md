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
| `ANTHROPIC_API_KEY` | Anthropic console | required for paper metadata, quizzes, and chat |
| `R2_*` | Cloudflare R2 | required for PDF storage (uploads + viewer) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | — |

You need **Clerk keys + `DATABASE_URL` + `ANTHROPIC_API_KEY`** to run the core
app; add the `R2_*` values to enable PDF upload/viewing.

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

## 8. Deploy (Vercel + managed services)

The web app is built for **Vercel**:

1. Import the GitHub repo in Vercel. Set **Root Directory = `apps/web`**, framework
   **Next.js**, install command `pnpm install`, build `pnpm build`.
2. Add the same env vars as `.env.local`, but pointed at managed services:
   - `DATABASE_URL` → your Supabase/managed Postgres (pooled), plus `DIRECT_URL` (direct) for migrations.
   - `ANTHROPIC_API_KEY` and the `R2_*` storage vars.
   - Clerk **production** keys + add your Vercel domain to Clerk's allowed origins.
3. Run `pnpm prisma migrate deploy` against the production DB (Vercel build step or
   a one-off), since migrations aren't auto-applied.

Architecture, hosting choices, and the schema are documented in
[`architecture.md`](architecture.md).

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
