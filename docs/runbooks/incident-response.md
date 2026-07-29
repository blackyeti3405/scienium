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
