# Runbook: Student data export and deletion

_As of v0.49.0 this is **mostly system behaviour**, not a manual procedure
(REFACTOR2 P1-R9). A student files a request in the app; an operator approves it;
a scheduled worker executes it durably and idempotently. What remains manual is
the approval decision, the delivery of an export bundle, and the whole-class
teardown at the end of a pilot._

## Where personal data lives

| Store | Data | Key |
| --- | --- | --- |
| Supabase Postgres | Everything below | — |
| Clerk | Auth identity: name, email, credentials, sessions | Clerk user id ↔ `users.clerk_user_id` |
| Cloudflare R2 | Uploaded PDFs, showcase/log images, export bundles under `data-exports/` | Object keys referenced by `papers.pdf_key`, `uploaded_assets.key`, showcase assets |
| Anthropic | No retention relied upon; prompts may include student-written text (see [llm-cost.md](llm-cost.md)) | — |
| Resend | Notification email addresses + subjects in their delivery logs | — |
| Upstash | Rate-limit counters keyed by Clerk user id (TTL ≤ 1 min — self-expires) | — |
| Vercel logs | Structured events with **opaque ids only** (no names/emails/content), platform request logs | retention per plan |

## The workflow

```
student files            operator approves           cron executes
POST /api/data-requests → POST /api/cron/data-requests → GET /api/cron/data-requests
   status: requested          status: approved            status: completed
```

**Filing erases nothing.** The request is a durable row (`data_requests`) with a
JSON-framed idempotency key, so a double click is one request. Approval is a
compare-and-set by an operator holding `CRON_SECRET`; the authority to erase a
minor's record belongs to the school, so there is deliberately no in-app approve
button. Execution is a fenced, leased claim — two overlapping crons cannot both
erase — and each external system is its own `data_request_steps` row, so a run
that dies partway resumes at the first step that is not yet `done`.

### Approving or rejecting

```bash
curl -X POST "$APP_URL/api/data-requests" -H "Authorization: Bearer $CRON_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"requestId":"<id>","action":"approve","note":"parent request, verified by phone"}'
```

(Path is `/api/cron/data-requests`; `action` is `approve` or `reject`.) A second
decision on the same request loses the CAS and returns 409 with the standing
state. The nightly cron then runs it; to run it immediately, `GET` the same path
with the same bearer token.

### What a deletion actually does

Steps run in this order, each recorded and idempotent:

1. **`clerk`** — delete the Clerk user. Auth and sessions die first, so an
   approved erasure stops admitting the account even if the database half needs
   another run. An identity that is already gone counts as done.
2. **`storage`** — flip the subject's **`temporary`** uploaded assets to
   `orphaned`, handing them to the reclaim sweep, which is the only place in the
   system that physically deletes an object. `attached` assets are **not** touched
   — they are images inside team project logs (see the policy below).
3. **`postgres`** — in ONE transaction: depart every live team membership through
   the real `departTeam` command (so a departing lead still hands over and a last
   member still archives the lab), delete every row in the per-student inventory,
   and tombstone the `users` row.

**The `users` row is tombstoned, not dropped.** Team-shared work the student
authored — project logs, discovery nodes, the synthesis matrix, experiments,
purchased buildings — carries a *required* foreign key to it, and the policy
below keeps that work with the team. So the row survives with `name`, `email`
and `clerk_user_id` overwritten by non-routable placeholders and `deleted_at`
stamped. Nothing personal remains readable through it.

### What an export does

One step, **`export_bundle`**: every row in the per-student inventory plus the
user's own profile fields, written as JSON to R2 under
`data-exports/<requestId>.json`. It is deliberately **not** downloadable from the
app and never emailed — an export bundle is the densest personal artifact this
system can produce. Fetch it from R2 and deliver through the school's agreed
channel.

## Policy: what erasure keeps, and why

The inventory lives in `apps/web/lib/data-requests/inventory.ts`; one list drives
both export and deletion, and `test/data-inventory-drift.test.ts` fails if it
names a model or column the schema no longer has.

**Erased** (per-student rows): quiz sessions/attempts, explain-back
explanations/attempts, paper proficiencies, paper chat, relevance notes,
expertise exams/attempts, vocabulary cards and KP days, Codex progress and KP
days, lab-credit claims, notifications and notification prefs, activity feed,
Study-with-Vega messages, fair associations, rubric self-assessments, class join
requests. Live `team_members` rows go through `departTeam` rather than a raw
delete.

**Kept, deliberately** — each is a team or system record that happens to carry a
user id:

| Kept | Why |
| --- | --- |
| `project_logs`, `discovery_nodes`, `synthesis_matrices`, `experiments`, `team_shop_buildings`, `team_rubric_scores` | The team's work product. Deleting one member's contributions guts their teammates' project. |
| `discovery_source_visits` | The team's **once-ever KP claim** for a source (P1-S14). Deleting it lets the same source be farmed for KP again. *Correction: earlier versions of this runbook listed it as per-student.* |
| `uploaded_assets` | The ledger proving an R2 object exists. Deleting the row strands the object permanently (P1-R12). |
| `notifications` addressed to the whole team | Team-wide rows (`user_id IS NULL`) are not the subject's. Their **personal** rows are erased, and since P2-6 a raw `DELETE FROM users` cascades them too — `user_id` NULL means TEAM-WIDE on this table, so nulling it would re-address a private notice to the classmates it names. |
| `team_membership_events` | Append-only authorization log; after the tombstone it names a user with no personal fields. |
| `teacher_feedback` | The teacher's record, not the student's row. |
| `ai_usage` | Token counts and cost, no content; attribution is nullable. |

*Two further corrections to earlier versions:* `DiscoveryKpDay`, `PvpTrophies`
and `PvpRaidQuota` are **team**-scoped and carry no user id at all — they were
listed under per-student rows in error.

## Retention

`retention_policies` is a per-model table that **ships empty**.
`apps/web/lib/retention/policies.ts` declares which models *can* be pruned; a row
in the table is the number of days that turns one on. No row and no registry
default means the model is never pruned — the fail-safe direction is keep.

Exactly one default ships, because exactly one was endorsed: `showcase_view` at
**90 days** (pseudonymous visitor fingerprints, unbounded growth, no product use
beyond the daily-count aggregate). Every other number needs qualified
FERPA/COPPA input — see [`../TODO.md`](../TODO.md) → "Retention windows".

To set one:

```sql
INSERT INTO retention_policies (key, retain_days, note, updated_at)
VALUES ('paper_chat_message', 365, 'reviewed 2026-09-01 by <name>', now())
ON CONFLICT (key) DO UPDATE SET retain_days = excluded.retain_days,
  note = excluded.note, updated_at = now();
```

A `NULL` `retain_days` is meaningful: *reviewed, decided not to prune*. It also
overrides a registry default, so it is how `showcase_view` gets turned back off.

## Still manual

- **Verifying who is asking.** Nothing in the app proves a request came from a
  parent or the school rather than the student. That check happens before you
  approve, out of band.
- **Delivering the export bundle** through the school's channel — never as an
  email attachment to an unverified address.
- **Whole-class teardown** (end of pilot): delete teams of that class's students
  (team-shared rows by `team_id`), then students, then the `Class`. Take a final
  backup first ([restore.md](restore.md)) and record the school's sign-off.

  There is deliberately **no team-deletion command**, and `DELETE FROM teams`
  will not work on its own: 36 tables reference `teams.id` with `ON DELETE
  RESTRICT`, so the delete fails loudly on the first one that still has rows.
  That refusal is the design. Clear the team's rows in dependency order, and
  **retire `uploaded_assets` through the reclaim sweep first** — the sweep is the
  only thing that deletes an R2 object, and a ledger row removed before its
  object leaves an untracked, unfindable blob billed forever (P1-R12).

  `test/pg/invariants.pg.test.ts` enforces the two halves of this against the
  live database (P2-6): no `ON DELETE CASCADE` anywhere may reach
  `uploaded_assets`, `papers`, or the audit tables (`activity_feed`,
  `teacher_feedback`, `ai_usage`, the membership-event logs, `data_requests`);
  and a team still holding an asset refuses to delete rather than stranding it.
  A new cascade that breaks either fails that suite.
- **Resend log retention** — no action beyond their window; do not re-email.

## Verification

After a deletion completes, the request row is its own evidence:

```sql
SELECT status, completed_at, result_json FROM data_requests WHERE id = '<id>';
SELECT target, status, detail FROM data_request_steps WHERE request_id = '<id>';
```

`result_json` carries the per-model row counts actually deleted. Confirm the
tombstone landed and sign-in fails:

```sql
SELECT deleted_at, name, email, clerk_user_id FROM users WHERE id = '<subject id>';
```
