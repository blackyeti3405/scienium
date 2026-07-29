# Runbook: Incident response

_Pilot-minimum procedure (PILOT-6). Audience: whoever operates scienium during the classroom pilot._

## Contacts and consoles

| System | Console | What lives there |
| --- | --- | --- |
| App hosting + cron + logs | Vercel dashboard → scienium project | Deploys, runtime logs, cron run history, env vars |
| Error tracking + bug reports | [Sentry](https://scienium.sentry.io) → scienium project | Grouped exceptions with stack traces (**Issues**), student/teacher bug reports (**User Feedback**) |
| Database | Supabase dashboard | Postgres, backups/restore, connection pooling |
| Auth | Clerk dashboard | Users, sessions, sign-in incidents |
| LLM | Anthropic console | API usage/spend, rate limits, status |
| Rate-limit store | Upstash console | Redis health (paid tiers fail closed without it) |
| Uploads | Cloudflare R2 console | PDF/asset objects |
| Email | Resend dashboard | Notification email delivery |

Incident owner during the pilot: the project owner (repo owner). Escalation path is the relevant provider's status page + support.

## First 10 minutes

1. **Scope it.** One student, one class, or everyone? One feature or the whole app?
   **Start in Sentry Issues** — it groups identical exceptions, shows how many users
   are hit and since when, and carries the stack trace. The Vercel log queries below
   are for correlating a specific request, or for anything Sentry doesn't capture
   (rate-limit denials, job lifecycle, cron summaries).
   Check **User Feedback** too: a student may have described the symptom in
   plain language, and reports submitted right after an error are linked to it.
2. **Check Vercel runtime logs.** Structured events are single-line JSON (`lib/observability/log.ts`). Filter by:
   - `"outcome":"error"` — failures, with `event`, `route`, `requestId`, opaque ids.
   - `rate_limit.misconfigured` — paid features 503ing because the shared limiter store is missing/broken. Fix: restore `UPSTASH_REDIS_REST_URL`/`TOKEN` env vars and redeploy.
   - `llm.call` / `llm.stream` with `"outcome":"error"` — Anthropic failures; `detail` carries `api_<status>`. Check Anthropic status page; 429/529 = rate/overload (self-heals), 401 = key problem.
   - `paper_job.terminal` — papers stuck in error after 3 attempts (see below).
   - `cron.auth_denied` — scheduler misconfiguration or probing.
   - `notification_outbox.claim_lost` / `data_request.claim_lost` — a worker came back
     after its lease expired and was refused. One or two around a deploy or a cold start
     is the fence doing its job; a steady stream means work is routinely outliving its
     lease (`SEND_LEASE_MS`, `CLAIM_LEASE_MS`) and the lease, not the worker, is wrong.
   - `email_suppression.recorded` — a reminder hard-bounced or was reported as spam.
   - `email_webhook.auth_denied` — an unsigned/replayed POST to the Resend webhook.
3. **Correlate a specific user report** by time + route; `requestId` matches Vercel's own request id (`x-vercel-id`).
4. **Check the security ledger for anything older than the drain.** `security_events`
   (REFACTOR2 P1-5) is append-only, has no foreign keys, and survives the deletion of
   whatever it describes. It is where you answer "who", not "what is broken now":

   ```sql
   -- Everything one actor did or was refused, most recent first.
   select created_at, kind, outcome, target_type, target_id, reason, request_id
   from security_events where actor_user_id = '<User.id>' order by created_at desc limit 100;

   -- Every authority change in a lab or class.
   select * from security_events where scope_id = '<Team.id or Class.id>' order by created_at;

   -- What alerted, and when.
   select created_at, reason, scope_id, actor_user_id from security_events
   where kind = 'alert.threshold' order by created_at desc limit 50;
   ```

   `reason` is always a snake_case token, never prose — the sink rewrites anything else
   to `unbounded_reason`, so this table can be read and exported without exposing student
   work. Ids are RAW here (unlike the log drain, which pseudonymizes): this is a
   first-party table behind the database credential, and an audit trail you cannot join
   back to a person answers nothing.

## Alert thresholds

Crossing one of these raises a **Sentry issue** (`captureMessage`, level `warning`,
titled `[security] …`) — Sentry is the destination because it is the console step 1
already sends you to. Each threshold also writes an `alert.threshold` row, and that
row's unique `dedupe_key` is what rate-limits the alert: one issue per window, not one
per event past the line. Numbers live in `ALERT_RULES`
(`apps/web/lib/observability/security-event.ts`); they are pilot starting points, and
retuning one is a one-line edit.

| Signal | Threshold | Grouped by | What it usually means | First action |
| --- | --- | --- | --- | --- |
| Repeated scope denials (`authz.denied`) | 30 in 10 min | actor | A broken client, or someone walking ids across teams | Query the ledger for that `actor_user_id`; if the `target_id` paths vary, treat as probing |
| Unauthorized cron (`cron.denied`) | 5 in 1 h | global | `CRON_SECRET` rotated on one side only, or a probe | Compare the Vercel env var against the scheduler; the 503 reasons (`cron_unconfigured`) mean cron is **off**, not merely denied |
| Moderation rejections (`moderation.decision`, rejected) | 10 in 24 h | team | One team repeatedly submitting content a teacher refuses | Read the decisions in `showcase_moderation_events`; escalate to the teacher, not the students |
| Showcase reports (`moderation.report`) | 3 distinct reporters in 24 h | team | A live public page readers are objecting to — or a classroom brigade | Go to **Public showcase abuse** below. Never auto-unpublishes; three coordinated reports are cheap to arrange in a classroom |
| Showcase taken down (`moderation.takedown`, denied) | 1 in 24 h | global | A teacher pulled a public page offline | Read the event, then **Public showcase abuse** below. Restores are `ok` and stay silent |
| Refused destructive commands (`command.destructive`, denied) | 20 in 1 h | team | A client replaying a spent proposal token, or guessing one | Tokens are single-use and payload-bound, so nothing was deleted; find the caller |
| Worker dead letters (`worker.dead_letter`) | 3 distinct jobs in 1 h | global | Reminder emails or a data request exhausted 3 attempts | `select * from notification_emails where status='failed'` / `data_requests where status='failed'`; fix the cause, then re-queue |
| Provider budget (`budget.pressure`) | day's `ai_usage` ≥ `AI_DAILY_BUDGET_USD` (default $25) | global | Spend running ahead of plan, or a loop | Break down by team/operation (below); the kill switch is the lever |

**Failed crons are deliberately not in this table.** A cron route that throws is already
captured by Sentry through `onRequestError` (`instrumentation.ts`), with the stack trace
— strictly better than a threshold. What a threshold *does* add is the case Sentry
cannot see: a cron that is never invoked at all. Check **Vercel → Cron** run history if
`cron.papers` / `cron.notifications` lines stop appearing in the drain.

Spend breakdown once budget pressure fires:

```sql
select team_id, operation, sum(cost_micros)/1e6 as usd, count(*)
from ai_usage where day = current_date group by 1,2 order by usd desc limit 20;
```

## Feature-disable levers

There is no feature-flag system. The levers that exist:

- **All paid AI features off**: remove `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` and ensure `RATE_LIMIT_ALLOW_MEMORY` is unset in production → every `ai`/`upload` tier fails closed with a student-friendly 503 ("tell your teacher"). This is the intended big red button for runaway LLM spend.
- **Cron off**: disable the cron entries in `vercel.json` via a deploy, or rotate `CRON_SECRET` (jobs then 401 and log `cron.auth_denied`).
- **Whole app**: Vercel → instant rollback to a previous deployment.

## Common incidents

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Every AI feature returns 503 | Upstash env vars missing/broken in prod | Restore vars; check `rate_limit.misconfigured` events stop |
| Paper stuck "processing" | Job retrying (backoff ≤ 3 attempts) | Wait for the 5-min cron sweep; check `paper_job.*` events |
| Paper shows error | Terminal job (`paper_job.terminal`) | Student can delete + re-upload; check `detail` for the error class first |
| DB connection errors (`P1001`) | Supabase paused (free tier) or outage | Resume project in Supabase; check their status page |
| Sign-in broken | Clerk outage or key rotation | Clerk status page; verify env keys match the Clerk instance |
| LLM spend spike | Check `llm.call` volume by route | Identify the route; if abusive, the per-user `ai` tier (12/min) should already bound it — investigate the caller |
| One student gets no reminder email | Their address is suppressed after a bounce/complaint | `select * from email_suppressions where email = '…'`; fix the address (or confirm the complaint) and `delete` the row to re-enable |
| A student got the same reminder twice | Duplicate send — see "Reminder email delivery" below | Expected only around a crash/redeploy mid-drain; if routine, check `notification_outbox.claim_lost` volume |
| "Take this public project down" | A reported (or directly complained-about) showcase | **Public showcase abuse** below — teacher takes it offline from the moderation page; never delete rows |

## Public showcase abuse

Published showcases are the only student-authored content scienium serves to the open
internet, so removing one has to be a button with an audit trail — never an `UPDATE`
typed into Supabase (REFACTOR2 P1-6). **Nothing in this procedure deletes anything.**

**1. Report.** Any visitor — signed in or not — can report a showcase from the page
itself (`POST /api/showcase/public/report`). The reason is one of a closed list
(`inappropriate` / `harassment` / `privacy` / `copyright` / `spam` / `other`) and there
is **no free-text field anywhere**, so nothing a reporter writes can reach a teacher's
screen or these logs. Reporters are stored as a salted hash, never an IP; one report per
(reporter, showcase, reason) is kept, so the counts below count **people, not clicks**.
Only a showcase the public can already open is reportable.

**2. Triage.** Reported showcases appear at the top of **Teacher → Showcase Moderation**,
above the pending queue, with the report count, the reasons, and whether the reports are
about the revision that is **live right now** (a team may already have edited the problem
away). The teacher of the class owns this decision — the same `requireTeacher` + class
scope as an approval. There is no global moderator role: escalation past the class
teacher is this procedure, not another button.

**3. Takedown.** "Take offline" with a reason. Effect, immediately and everywhere:

- the public page and the `?print=1` one-pager 404 (`canViewShowcase` — the single gate);
- the board / quad-chart **bytes** stop streaming from `/api/showcase/public/asset`,
  because that route runs the same gate;
- the card leaves the gallery listing.

Caching cannot hold a taken-down page open: both public pages are `force-dynamic`, and
asset bytes are `Cache-Control: private, max-age=60` — `private` keeps every CDN and
shared proxy out entirely (there is nothing to purge), and the 60s is the ceiling on how
long one reader's own browser cache can outlive the takedown.

What a takedown does **not** do: delete the showcase row, its assets, its R2 objects,
its reports, or its moderation history. The teacher keeps moderator preview of the page,
so the content stays reviewable in place. The team is notified without being told which
reason was chosen.

**4. Escalate** to the incident owner when the content is a safeguarding matter (a minor's
personal information, threats, sexual content) or when the same team recurs. The first
takedown in any 24 h window already raises a Sentry issue, so the owner does not learn
about it from the queue. Off-platform escalation (school, guardians, law enforcement) is
the school's process, not this repo's.

**5. Restore.** Same screen, "Restore" — clears `takedown_at`, writes a `restored`
moderation event with the actor, and records an `ok` ledger row. Deliberately silent: a
restore is good news, and alerting on it would train the owner to ignore the channel.

**Where the audit trail lives** (all three survive the showcase being deleted; the
history is `RESTRICT` and reports carry no foreign key at all — pinned in
`test/pg/invariants.pg.test.ts`):

```sql
-- Who reported it, when, against which revision. No identities, by design.
select reason, count(*), min(created_at), max(created_at)
from showcase_reports where showcase_id = '<Showcase.id>' group by 1;

-- The decision history: submitted / approved / rejected / taken_down / restored,
-- each against the digest it applied to. `actor_user_id` is the teacher.
select created_at, action, actor_user_id, digest, note
from showcase_moderation_events where showcase_id = '<Showcase.id>' order by created_at;

-- The same acts in the ledger, which outlives the showcase entirely.
select created_at, kind, outcome, actor_user_id, scope_id, reason
from security_events
where target_type = 'showcase' and target_id = '<Showcase.id>' order by created_at;
```

## Reminder email delivery

Delivery is **at-least-once with provider-side deduplication**, and that is a decision, not
an accident (REFACTOR2 P1-2).

- The outbox claims a row, sends it, then writes `sent`. A process that dies between the
  provider accepting the message and that write leaves the row `sending`; once the lease
  (`SEND_LEASE_MS`, 5 min) expires, another drain retries it. There is no cross-system
  transaction that can close that window.
- What closes it in practice: every send carries `Idempotency-Key: <outbox row id>`, and
  [Resend keeps a key for 24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys),
  replying with the original response instead of sending again. The key is the ROW id — not
  the attempt, not the claim token — because the crash retry and a taken-over drain's
  duplicate are both "this same row, sent again".
- **Residual risk, accepted:** a row retried more than 24 hours after its first send (a queue
  parked through a long outage) is outside the key's lifetime and can genuinely deliver
  twice. A duplicate reminder is a better failure than a silent one; the cap
  (`MAX_ATTEMPTS`, 3) bounds it.
- **Suppression:** `POST /api/webhooks/resend` (Svix-signed, `RESEND_WEBHOOK_SECRET`) records
  `email.bounced` and `email.complained` into `email_suppressions`, and `sendNotificationEmail`
  refuses any address on that list. Temporary trouble arrives as `email.delivery_delayed` and
  is deliberately ignored — that is the outbox's retry, not a reason to stop mailing someone.
  If the secret is unset the route fails closed (503) and **nothing is ever suppressed**.

## After the incident

- Note what happened, when, and the fix in `docs/TODO.md` (or an issue).
- If data was affected, follow [restore.md](restore.md).
- If the cause was a missing guard/bound, add the regression test alongside `apps/web/test/paid-work-guard.test.ts`.
