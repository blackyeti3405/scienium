# Production launch runbook

Everything needed to take scienium from the dev instances it runs on today to a
production deployment for the classroom pilot: a Clerk production instance under
the scienium name, a production database with RLS, a production R2 bucket, and
the Vercel configuration that ties them together.

Written to be followed without thinking. Every dashboard click is named. Do the
parts in order — later parts need values produced by earlier ones.

**Time:** ~90 minutes of clicking, plus up to 48h of DNS propagation (usually
minutes). Start Part A first for that reason, then do B and C while it propagates.

---

## 0. Who does what

### Only you can do these (I have no account access, and won't ask for credentials)

- Creating/renaming anything in the Clerk, Supabase, Cloudflare and Vercel dashboards
- Adding DNS records at your registrar
- Anything involving a password, card, or plan change

### I can do these once you say go

| Task | What I'd run | Sees a secret? |
|---|---|---|
| Apply all migrations to the production DB | `prisma migrate deploy` with `DIRECT_URL` read from a gitignored file | Reads the file; never prints it |
| Verify RLS on production | `pnpm --filter web verify:rls` | Same — prints table names/counts only |
| Copy R2 objects from the old bucket to the new one | `scripts/migrate-r2-bucket.mjs` (I'll write it when you're ready) | Reads `R2_*` from the file |
| Upload the Pyodide runtime to the new bucket | `node scripts/upload-pyodide-to-r2.mjs` | Same |
| Update `.env.example`, docs, and the branding checklists | file edits | No |

**How to hand me credentials safely:** put them in `apps/web/.env.production.local`
and tell me the file exists. `.env.*` is gitignored (`.gitignore:71`), so it can
never be committed. I will read it through tooling and never echo its contents into
the transcript. **Do not paste keys into chat** — the transcript is the one place
they'd persist in plain text.

---

## Part A — Clerk production instance

Your Clerk app is named **nova-lab**, which is why auth emails say "as Nova-lab".
A production instance is a *separate* instance with its own keys and its own user
list. This is also the moment the name gets fixed.

> **Your dev users do not carry over.** A production instance starts with zero
> users. That is fine — the pilot wants a clean roster — but it means your own
> account and every test account must be re-created on the production instance.

### A1. Rename the application

1. Go to <https://dashboard.clerk.com> and select the **nova-lab** application.
2. Left sidebar → **Configure** → **Settings**.
3. Change **Application name** from `nova-lab` to `scienium`.
4. **Save**.
5. Left sidebar → **Customization** → **Branding**. Check the logo/app name shown
   in the auth widget and emails; update if it still says nova-lab.

Do this *before* A2 so the production instance clones the corrected name.

### A2. Create the production instance

1. At the top of the dashboard, click the **Development** dropdown.
2. Select **Create production instance**.
3. Choose **Clone development settings** — this carries over your email/password
   config, so students still sign up the same way.
4. Confirm.

> Clerk does **not** copy SSO connections, Integrations, or **Paths**. You have no
> SSO or integrations, but Paths matter — see A5.

### A3. Add the DNS records

1. With the **Production** instance selected, go to **Configure** → **Domains**.
2. Enter your production domain (e.g. `scienium.app`) and save.
3. Clerk now shows a table of **CNAME** records — typically for `clerk`,
   `accounts`, `clkmail`, and two DKIM hosts (`clk._domainkey`, `clk2._domainkey`).
4. At your domain registrar's DNS panel, add each row exactly as shown:
   - **Type:** CNAME
   - **Name/Host:** the value in Clerk's *Host* column (e.g. `clerk`)
   - **Value/Target:** the value in Clerk's *Value* column
   - **TTL:** default (Auto)
   - **Proxy:** if your DNS is Cloudflare, set these to **DNS only** (grey cloud),
     not proxied. Proxying breaks Clerk's certificate issuance.
5. Back in Clerk's Domains page, click **Verify** next to each record. Records may
   show as pending for a few minutes.

### A4. Deploy certificates

Once every record verifies, a **Deploy certificates** button appears on the Clerk
dashboard home. Click it. Wait for it to report success.

### A5. Re-set the Paths

Clerk did not copy these. **Configure** → **Paths** on the production instance:

| Setting | Value |
|---|---|
| Sign-in URL | `/sign-in` |
| Sign-up URL | `/sign-up` |
| After sign-up | `/onboarding` |
| After sign-in | `/dashboard` |

These must match the `NEXT_PUBLIC_CLERK_*` env vars in Part D. If they disagree,
students land on the wrong page after sign-up.

### A6. Copy the production keys

1. **Configure** → **API keys**, with **Production** selected.
2. Copy the **Publishable key** (`pk_live_…`) and **Secret key** (`sk_live_…`).
3. Paste them into `apps/web/.env.production.local` (create the file):

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

**Check:** the keys must start `pk_live_` / `sk_live_`. If they still say `pk_test_`
you are looking at the development instance — switch the dropdown to Production.

---

## Part B — Production database

Do **not** reuse the dev database. It contains test labs, E2E fixtures, and your
own experiments, and the pilot's data should start clean and be separable for the
data-deletion obligations in `docs/legal/`.

### B1. Create the project

1. <https://supabase.com/dashboard> → **New project**.
2. **Name:** `scienium-prod`
3. **Database Password:** click **Generate a password** and save it to your password
   manager immediately — Supabase shows it once.
4. **Region:** pick the one closest to the pilot school (US West for Santa Clara).
5. **Plan:** Free tier auto-pauses after ~7 days idle, which during a pilot means a
   class hitting "Can't reach database server". **Pro is the right call** for a real
   classroom.
6. **Create new project**, wait ~2 minutes for provisioning.

### B2. Copy both connection strings

1. Top bar → **Connect**.
2. Select the **Prisma** tab if offered; otherwise **ORMs**.
3. You need **two** strings, and they are different:

| Var | Mode | Port | Used for |
|---|---|---|---|
| `DATABASE_URL` | Transaction pooler | **6543** | every app query at runtime |
| `DIRECT_URL` | Session pooler | **5432** | `prisma migrate deploy` only |

4. Add both to `apps/web/.env.production.local`, substituting your password. The
   `DATABASE_URL` **must** keep the pgbouncer flags:

```
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-1-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-1-[region].pooler.supabase.com:5432/postgres"
```

> Dropping `?pgbouncer=true` causes prepared-statement errors under load that look
> random and are miserable to debug. Keep it.

### B3. Apply the migrations

> Do **B4a** first if you want zero exposure window — the Data API is off before a
> single student row exists. The steps are otherwise independent.

Tell me the file exists and I'll run this, or run it yourself from `apps/web`:

```bash
env $(grep -v '^#' .env.production.local | xargs) pnpm exec prisma migrate deploy
```

Expect "85 migrations found … All migrations have been successfully applied."

### B4. Close the Data API — the two layers, in order

scienium never uses Supabase's auto-generated REST API; every query goes through
Prisma. But Supabase generates and exposes it anyway, reachable with the **anon
key, which is publishable by design and must be assumed public**.

Supabase gates that API with **two layers, and grants come first**: a GRANT decides
whether a role may touch a table at all, and only then does RLS decide which rows.
So do all three of the following — they fail independently.

> **Do not assume the grants are already revoked.** Supabase's docs say the platform
> default "is changing… so that exposure becomes opt-in", and that **"on existing
> projects, tables in `public` still receive automatic grants for `anon`,
> `authenticated`, and `service_role`."** Whether your project got the new default
> depends on when it was created. B4c measures it instead of guessing.

**B4a — turn the Data API off (the master switch).**

1. Supabase dashboard → your project → **Integrations** → **Data API** → **Overview**.
2. Turn **Enable Data API** **off**.

With it off, "none of the auto-generated REST endpoints respond, regardless of grants
or RLS." This does not affect direct Postgres connections, so Prisma is untouched.
*(If your dashboard shows it under **Project Settings → Data API** instead, that is
the same setting — Supabase has moved it.)*

**B4b — revoke the grants (SQL Editor → New query, run once):**

```sql
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public
  revoke all on tables from anon, authenticated;
```

> ⚠️ **These must NOT go in a Prisma migration.** The `anon` role does not exist on
> your local Docker Postgres, in either CI lane, or on the shadow database — I tested
> it: `ERROR: role "anon" does not exist`. A migration containing this fails on every
> non-Supabase database and then blocks every later migration until `migrate resolve`.
> Prod SQL Editor only.
>
> The `alter default privileges` line covers tables added later; the two `revoke`
> lines cover the 87 that already exist. Postgres applies default privileges only to
> objects created *afterwards*, so you need both.

**B4c — verify, don't assume** (SQL Editor; expect **zero rows**):

```sql
select c.relname
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and has_table_privilege('anon', c.oid, 'select');
```

Use `has_table_privilege`, not `information_schema.role_table_grants` — the latter
omits `PUBLIC` and inherited grants and will tell you you're safe when you aren't.

### B5. Verify RLS and the blackout invariants

Migration `20260807160000_enable_rls_all_tables` enabled RLS on all 87 tables, so B3
applied it. RLS is the **second** layer here — with grants revoked it denies nothing
that wasn't already denied. It earns its place as the lock that still holds if someone
later writes a well-meaning `GRANT SELECT … TO anon`.

```bash
cd apps/web && env $(grep -v '^#' .env.production.local | xargs) node scripts/verify-rls.mjs
```

Expect `OK — RLS on, nothing forced, all tables owned by the connecting role, nothing
anon-readable.` Against production it also runs the B4c grant check automatically.

**Why RLS with zero policies doesn't break the app:** a table's owner is exempt from
its own RLS unless the table is marked `FORCE ROW LEVEL SECURITY`. Prisma connects as
`postgres`, which owns every table, so queries are untouched.

That exemption is a fact about **who owns the table versus who you connect as** — not
a property of the migration. It breaks if either changes, which is why `verify:rls`
now asserts ownership too.

> ### ⚠️ The single highest-risk mistake in this runbook
>
> **Never add `FORCE ROW LEVEL SECURITY`**, and never point the app at a non-owner
> role without `BYPASSRLS`. With zero policies, every `SELECT` returns an **empty
> set** and every write fails — and **Prisma does not throw**. It returns nothing.
> Mid-lesson, that looks exactly like the entire database was wiped. `verify:rls`
> fails on both conditions; I have tested that it does.

---

## Part C — Production R2 bucket

Today's bucket is `nova-lab-assets`, and per `docs/TODO.md` **the E2E suite shares
it with production**. That is a live hazard: a test's delete predicate is one bug
away from removing real student uploads. Splitting buckets fixes the branding and
that hazard together.

### C1. Create two buckets

1. Cloudflare dashboard → **R2** → **Create bucket**.
2. Name: `scienium-assets`. Location: **Automatic**. **Create bucket**.
3. Repeat for `scienium-assets-e2e`.
4. Leave **Public access** **disabled** on both. Assets are streamed through
   authenticated app routes, never served directly.

### C2. Create a scoped API token

1. R2 → **Manage R2 API Tokens** → **Create API token**.
2. **Token name:** `scienium-prod`
3. **Permissions:** **Object Read & Write**
4. **Specify bucket(s):** `scienium-assets` only — not "all buckets". A prod token
   that cannot see the E2E bucket is a hazard that cannot recur.
5. **Create API Token**, then copy **Access Key ID** and **Secret Access Key**
   (shown once).

Add to `apps/web/.env.production.local`:

```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=scienium-assets
```

`R2_ACCOUNT_ID` is in the R2 overview page's right-hand sidebar.

### C3. Copy existing objects (only if you want dev uploads carried over)

R2 cannot rename a bucket. If the pilot starts clean, skip this. Otherwise say the
word and I'll write `scripts/migrate-r2-bucket.mjs` to stream objects across.

### C4. Upload the Python runtime

Data Terminal's Code and Lab modes load Pyodide + scipy wheels from R2. Without
this they fail in production (Sheets mode is unaffected). From `apps/web`:

```bash
env $(grep -v '^#' .env.production.local | xargs) node scripts/upload-pyodide-to-r2.mjs
```

Then set `PYODIDE_SOURCE=r2` in Part D. I can run this once the token is in place.

---

## Part D — Vercel

### D1. Import the project

1. <https://vercel.com/new> → import `blackyeti3405/scienium`.
2. **Root Directory:** `apps/web` ← easy to miss, and the build fails without it.
3. **Framework Preset:** Next.js
4. **Install Command:** `pnpm install`
5. **Build Command:** `pnpm build`
6. Do **not** deploy yet — add the env vars first.

### D2. Environment variables

**Settings** → **Environment Variables**, each scoped to **Production**.

Required:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` from A6 |
| `CLERK_SECRET_KEY` | `sk_live_…` from A6 |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_FALLBACK_REDIRECT_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL` | `/onboarding` |
| `DATABASE_URL` | pooled string from B2 (port 6543) |
| `DIRECT_URL` | session string from B2 (port 5432) |
| `ANTHROPIC_API_KEY` | Anthropic console |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | from C2 |
| `R2_BUCKET_NAME` | `scienium-assets` |
| `NEXT_PUBLIC_APP_URL` | `https://scienium.app` (your real domain) |
| `VIEW_FINGERPRINT_SALT` | `openssl rand -hex 32` |
| `CRON_SECRET` | `openssl rand -hex 32` — **must be ≥32 chars** |
| `PYODIDE_SOURCE` | `r2` |
| `LEGAL_CONTACT_ADDRESS` | the postal address /privacy and /terms publish |

Generate the two secrets:

```bash
openssl rand -hex 32
```

> `CRON_SECRET` **fails closed**: unset or shorter than 32 characters and every
> cron route answers 503, so the papers pipeline, notifications and data-request
> sweeps silently stop. Vercel sends it automatically as a Bearer token once set.

> `LEGAL_CONTACT_ADDRESS` **degrades visibly** rather than failing closed: unset,
> `/privacy` and `/terms` print `[postal address not configured ...]` where the
> address belongs and the server logs an error. That is a compliance defect on a
> page aimed at minors, so check both pages after the first deploy. Use a PO box,
> virtual mailbox or registered-agent address — not a residence.

Strongly recommended:

| Variable | Why |
|---|---|
| `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` | you will not hear about pilot errors otherwise |
| `AI_DAILY_BUDGET_USD` | daily Anthropic spend alert; defaults to 25 |
| `UPSTASH_REDIS_REST_URL` + `..._TOKEN` | rate limits are per-instance without it, so serverless scale-out multiplies every limit |

### D3. Deploy and point the domain

1. **Deploy**.
2. **Settings** → **Domains** → add `scienium.app`, follow Vercel's DNS instructions.
3. Back in **Clerk** → **Configure** → **Domains**, confirm the production domain
   matches, and add the Vercel preview domain to allowed origins if you use previews.

### D4. Confirm the crons registered

**Deployments** → latest → **Crons**. Three jobs should be listed (`/api/cron/papers`
every 5 min, `/api/cron/notifications`, `/api/cron/data-requests`). They come from
`apps/web/vercel.json` and need no manual setup — just verify they appear.

---

## Part E — Post-deploy verification

Do these in order on the real production URL. Stop at the first failure.

1. **Legal pages load signed-out.** Open `/terms` and `/privacy` in a private
   window. They must render without a sign-in redirect — a parent deciding whether
   to let their child sign up cannot be asked to sign in first.
2. **Sign-up works.** Create a brand-new account in a private window. This is the
   exact flow that was failing before v0.78.0.
3. **Onboarding completes.** Accept the terms, pick a lab type, enter your lab. You
   should land on the plot with Discovery, Science Fair and Operations Hub placed.
4. **The Data API is really off.** From your machine:
   ```bash
   curl -s -w '\n-> HTTP %{http_code}\n' \
     "https://<project-ref>.supabase.co/rest/v1/users?select=id" \
     -H "apikey: <your-anon-key>"
   ```
   You want a hard failure (the endpoint not responding), **not** an empty array.
   `[]` means the API is still up and you are relying on grants/RLS alone — go back
   and finish B4a. A `200` returning rows is a stop-the-launch result: it means
   student data is being served to anyone holding a publishable key.
5. **Uploads work.** Upload a PDF in Literature Review, confirm it processes.
6. **Sentry receives events** (if configured): Settings → Report a bug.
7. **Crons fire.** After ~5 minutes, Vercel → Deployments → Crons shows a run for
   `/api/cron/papers` with a 200. A 503 means `CRON_SECRET` is missing or too short.

---

## Order of operations

```
A1 rename ─► A2 create prod ─► A3 DNS ─► A4 certificates ─► A5 paths ─► A6 keys ─┐
                                   (propagation happens here)                     │
B1 project ─► B2 strings ─► B4a API OFF ─► B3 migrate ─► B4b revoke ─► B5 verify ┤
                                                                                  ├─► D1..D4 ─► E
C1 buckets ─► C2 token ─► C3 copy (optional) ─► C4 pyodide ──────────────────────┘
```

Start A1–A3 first so DNS propagates while you do B and C.

---

## Known gaps to decide on before the pilot

- **E2E still points at production R2** until `R2_BUCKET_NAME` in the CI secret is
  repointed at `scienium-assets-e2e` (`docs/TODO.md`). Do this when you create the
  buckets, not later.
- **Free-tier Supabase auto-pauses.** If you stay on Free, a class arriving after a
  quiet week meets a cold database.
- **Rate limits are per-instance** without Upstash. On Vercel's serverless runtime
  that means the effective limit is `configured × instances`.
