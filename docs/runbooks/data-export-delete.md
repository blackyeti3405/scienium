# Runbook: Student/class data export and deletion

_Pilot-minimum inventory + manual procedure (PILOT-6). There is no self-serve
export/delete endpoint yet; requests are handled by an operator with database
access. Automating this is post-pilot work._

## Where personal data lives

| Store | Data | Key |
| --- | --- | --- |
| Supabase Postgres | Everything below | — |
| Clerk | Auth identity: name, email, credentials, sessions | Clerk user id ↔ `users.clerk_user_id` |
| Cloudflare R2 | Uploaded PDFs, showcase/log images | Object keys referenced by `papers.pdf_key`, `uploaded_assets.key`, showcase assets |
| Anthropic | No retention relied upon; prompts may include student-written text (see [llm-cost.md](llm-cost.md)) | — |
| Resend | Notification email addresses + subjects in their delivery logs | — |
| Upstash | Rate-limit counters keyed by Clerk user id (TTL ≤ 1 min — self-expires) | — |
| Vercel logs | Structured events with **opaque ids only** (no names/emails/content), platform request logs | retention per plan |

## Data inventory by subject

**Per-student rows** (FK on `user_id` / the student's `User.id`):
`User`, `TeamMember`, `ClassJoinRequest`, `PaperProficiency`, `PaperExplanationAttempt`, `PaperChatMessage`, `PaperQuizSession`/`PaperQuizAttempt`, `ExpertiseExam`/`ExpertiseAttempt`, `VocabCard`/`VocabKpDay`, `CodexLessonProgress`/`CodexKpDay`, `DiscoverySourceVisit`/`DiscoveryKpDay`, `ActivityFeed`, `Notification`/`NotificationPref`, `RubricSelfAssessment`, `FairUserAssociation`, `VegaStudyMessage`, PvP rows (`PvpTrophies`, `PvpRaidQuota`), `LabCreditClaim`, `TeacherFeedback` (as subject), `UploadedAsset` (as uploader).

**Team-shared rows** (owned by the team, not one student — deleting one student must NOT delete these):
`Team`, `TeamCurrency`, `Paper` + processing/citation rows, `SynthesisMatrix`/`SynthesisCell`, `ResearchPlan`/`IdeaCheck`, `Experiment`/`Measurement`, `ProjectLog`(+followups/references), buildings/economy rows, `Showcase`(+assets/views), fair/rubric/form rows, `TeamStudyPlan`, `DiscoveryNode` tree.

**Class rows**: `Class`, `ClassJoinRequest`, via `users.class_id` membership.

## Export (a parent/school asks for a student's data)

1. Identify the student: Clerk dashboard → email → `clerk_user_id`; then `select id from users where clerk_user_id = '...'`.
2. Dump the per-student tables above filtered by that id (`psql \copy ... to csv`). Include their authored team content (papers they uploaded, log entries they wrote) but not teammates' individual data.
3. Fetch R2 objects they uploaded (`papers.pdf_key` where uploader, `uploaded_assets` where `user_id`).
4. Deliver via the school's agreed channel — never email attachments of student data to unverified addresses.

## Deletion (right-to-erasure / end of pilot)

Order matters — FKs are mostly required without cascade:

1. **Clerk**: delete the user (kills auth + sessions). Their `users` row remains until step 2.
2. **Postgres, per-student rows**: delete the per-student tables above for that `user_id`, then the `users` row. If they lead a team (`teams.team_lead_id`), transfer lead to another member first or delete the whole team (below).
3. **Team-shared content authored by them**: policy decision with the teacher — team artifacts belong to the team; default is to keep them (they're the team's work product), removing only the student's name where it appears in per-student rows.
4. **R2**: delete their `uploaded_assets` objects and any papers only they uploaded (after team confirmation).
5. **Resend**: no action needed beyond their log retention window; do not re-email.

**Whole-class teardown** (end of pilot): delete teams of that class's students (team-shared rows by `team_id`), then students (per-student rows), then the `Class`. Take a final backup first ([restore.md](restore.md)) and record the school's sign-off.

## Verification

After a deletion, confirm zero rows remain:

```sql
select 'users' t, count(*) from users where id = '<id>'
union all select 'team_members', count(*) from team_members where user_id = '<id>';
-- extend over the inventory tables
```

and that sign-in with the deleted account fails.
