// Reset the E2E fixture lab to a known-empty state — `pnpm --filter web reset:e2e`
//
// ## Why this exists
//
// `seed-e2e.mjs` is deliberately additive: it creates the School → Class → Team
// graph and tops currency back up, and never deletes. So the fixture lab
// ACCUMULATES everything the suite has ever written to it. Measured on the dev
// database on 2026-07-26, after months of runs: 1,732 activity-feed rows, 152
// notifications, 49 project logs, 123 uploaded assets — none of it seeded, all
// of it left behind.
//
// That is the single largest source of E2E flake. Specs assert "the feed shows
// the entry I just made" against a list that is now hundreds long; "the empty
// state renders" against a lab that is not empty; "this is the first check"
// against a matrix that has been checked forty times. Each spec has grown its
// own private `deleteMany` in `beforeAll` to carve out the slice it needs, and
// those carve-outs are themselves cross-spec coupling: one spec's cleanup is the
// next spec's missing precondition.
//
// A run should start from ONE known state. That is what this does.
//
// ## Safety
//
// Every delete is scoped to a team by id, or to rows that belong to that team's
// papers. Nothing here can touch another team — including the local `devlab`,
// which shares this database. Uploaded assets are NOT deleted: their rows are the
// only record that an R2 object exists (REFACTOR2 P1-R12), and the bucket is
// shared with production. They are flipped to `orphaned` so the normal reclaim
// sweep retires them through the one physical-delete site.
//
// ## What this deliberately does NOT clear
//
// `team_shop_buildings` and `team_gateway_placements` are the lab's LAYOUT, not
// accumulated content, and clearing them broke unrelated specs: with the gateway
// placements gone the scene falls back to the DEFAULT cells, where one 128px
// sprite covers a neighbour's hit area and Playwright cannot click "Open
// Discovery" at all ("subtree intercepts pointer events"). `seed-e2e.mjs` now
// seeds an explicit spread so the layout is reproducible instead of being
// whatever `placement.spec.ts` last left behind — but this script still leaves
// both alone, because the placement and upgrade specs manage those rows
// themselves (`deleteE2eBuilding`, `setE2eBuildingLevel`).
//
// Run with `--dry` to print what would go without writing anything.
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')

export const FIXTURE_TEAM_NAME = 'E2E Test Lab'

/**
 * Everything that belongs to one team, in delete order (children first).
 *
 * ONE owner for "what is a team's content", shared by this CLI and by
 * `e2e/lab.ts`'s disposable per-spec labs — the same reason the erasure
 * inventory in `lib/data-requests/inventory.ts` is a single list. Two copies
 * drift, and the drift shows up as a foreign-key error nobody expected.
 */
export function teamPurgeSteps(db, teamId, paperIds) {
  const inPapers = { paperId: { in: paperIds } }
  return [
    // ── Rows hanging off the team's papers ────────────────────────────────
    ['paper_quiz_attempts', () => db.paperQuizAttempt.deleteMany({ where: inPapers })],
    ['paper_quiz_sessions', () => db.paperQuizSession.deleteMany({ where: inPapers })],
    ['paper_explanation_attempts', () => db.paperExplanationAttempt.deleteMany({ where: inPapers })],
    ['paper_explanations', () => db.paperExplanation.deleteMany({ where: inPapers })],
    ['paper_proficiency', () => db.paperProficiency.deleteMany({ where: inPapers })],
    ['paper_chat_messages', () => db.paperChatMessage.deleteMany({ where: inPapers })],
    ['paper_relevance_notes', () => db.paperRelevanceNote.deleteMany({ where: inPapers })],
    ['paper_processing_jobs', () => db.paperProcessingJob.deleteMany({ where: inPapers })],
    ['citations', () => db.citation.deleteMany({ where: { teamId } })],
    ['vocab_cards', () => db.vocabCard.deleteMany({ where: { teamId } })],
    ['vocab_kp_days', () => db.vocabKpDay.deleteMany({ where: { teamId } })],
    ['vocab_paper_curations', () => db.vocabPaperCuration.deleteMany({ where: inPapers })],
    ['synthesis_cells', () => db.synthesisCell.deleteMany({ where: { matrix: { teamId } } })],
    ['synthesis_matrices', () => db.synthesisMatrix.deleteMany({ where: { teamId } })],

    // ── Discovery ─────────────────────────────────────────────────────────
    ['discovery_source_visits', () => db.discoverySourceVisit.deleteMany({ where: { teamId } })],
    ['discovery_kp_days', () => db.discoveryKpDay.deleteMany({ where: { teamId } })],
    ['discovery_nodes', () => db.discoveryNode.deleteMany({ where: { teamId } })],

    // ── Project log + failure log ─────────────────────────────────────────
    ['project_log_followups', () => db.projectLogFollowup.deleteMany({ where: { log: { teamId } } })],
    // Both ends: a reference row survives if EITHER log is still deleted around it.
    [
      'project_log_references',
      () =>
        db.projectLogReference.deleteMany({
          where: { OR: [{ from: { teamId } }, { to: { teamId } }] },
        }),
    ],
    ['project_logs', () => db.projectLog.deleteMany({ where: { teamId } })],

    // ── Showcase ──────────────────────────────────────────────────────────
    ['showcase_views', () => db.showcaseView.deleteMany({ where: { showcase: { teamId } } })],
    ['showcase_assets', () => db.showcaseAsset.deleteMany({ where: { showcase: { teamId } } })],
    [
      'showcase_moderation_events',
      () => db.showcaseModerationEvent.deleteMany({ where: { showcase: { teamId } } }),
    ],
    ['showcases', () => db.showcase.deleteMany({ where: { teamId } })],

    // ── Experiments / data terminal ───────────────────────────────────────
    ['measurements', () => db.measurement.deleteMany({ where: { experiment: { teamId } } })],
    ['experiments', () => db.experiment.deleteMany({ where: { teamId } })],

    // ── Research plan ─────────────────────────────────────────────────────
    ['idea_checks', () => db.ideaCheck.deleteMany({ where: { teamId } })],
    ['research_plans', () => db.researchPlan.deleteMany({ where: { teamId } })],

    // ── Feed, notifications, expertise, rubric ────────────────────────────
    ['activity_feed', () => db.activityFeed.deleteMany({ where: { teamId } })],
    ['notifications', () => db.notification.deleteMany({ where: { teamId } })],
    ['expertise_attempts', () => db.expertiseAttempt.deleteMany({ where: { exam: { teamId } } })],
    ['expertise_exams', () => db.expertiseExam.deleteMany({ where: { teamId } })],
    ['rubric_self_assessments', () => db.rubricSelfAssessment.deleteMany({ where: { teamId } })],
    ['team_rubric_scores', () => db.teamRubricScore.deleteMany({ where: { teamId } })],
    ['teacher_feedback', () => db.teacherFeedback.deleteMany({ where: { teamId } })],
    ['team_form_status', () => db.teamFormStatus.deleteMany({ where: { teamId } })],
    ['team_study_plans', () => db.teamStudyPlan.deleteMany({ where: { teamId } })],
    ['vega_study_messages', () => db.vegaStudyMessage.deleteMany({ where: { teamId } })],

    // ── Papers themselves, last ───────────────────────────────────────────
    ['papers', () => db.paper.deleteMany({ where: { teamId } })],

    // ── Topic: back to unset, so the discovery specs see a clean slate ────
    ['team.topic → null', () => db.team.updateMany({ where: { id: teamId }, data: { topic: null } })],
  ]
}

/**
 * Purge one team's content and return per-table counts.
 *
 * Uploaded assets are RETIRED, never deleted — see the safety note above.
 */
export async function purgeTeam(db, teamId) {
  const papers = await db.paper.findMany({ where: { teamId }, select: { id: true } })
  const counts = {}
  for (const [label, action] of teamPurgeSteps(db, teamId, papers.map((p) => p.id))) {
    const { count } = await action()
    if (count) counts[label] = count
  }
  const retired = await db.uploadedAsset.updateMany({
    where: { teamId, status: { in: ['temporary', 'attached'] } },
    data: { status: 'orphaned' },
  })
  if (retired.count) counts['uploaded_assets → orphaned'] = retired.count
  return counts
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

async function main() {
  const dry = process.argv.includes('--dry')
  const db = new PrismaClient()
  try {
    const team = await db.team.findFirst({
      where: { name: FIXTURE_TEAM_NAME },
      select: { id: true },
    })
    if (!team) {
      console.error(
        `No '${FIXTURE_TEAM_NAME}' team — nothing to reset. Run: pnpm --filter web seed:e2e`,
      )
      process.exitCode = 1
      return
    }

    // Throwaway "foreign" teams that specs seed for their IDOR cases and leave
    // behind when they fail mid-run.
    const strays = await db.team.findMany({
      where: { name: { startsWith: '[E2E' }, id: { not: team.id } },
      select: { id: true, name: true },
    })

    if (dry) {
      const papers = await db.paper.findMany({ where: { teamId: team.id }, select: { id: true } })
      console.log(`DRY RUN — ${FIXTURE_TEAM_NAME} (${team.id})\n`)
      for (const [label] of teamPurgeSteps(db, team.id, papers.map((p) => p.id))) {
        console.log(`  ${label}`)
      }
      console.log('  uploaded_assets → orphaned (never deleted: the row proves the object exists)')
      for (const s of strays) console.log(`  stray team ${s.name}`)
      console.log('\nNothing was written. Drop --dry to apply.')
      return
    }

    console.log(`Resetting ${FIXTURE_TEAM_NAME} (${team.id})\n`)
    const counts = await purgeTeam(db, team.id)
    let total = 0
    for (const [label, count] of Object.entries(counts)) {
      total += count
      console.log(`  ${label.padEnd(30)} ${count}`)
    }

    for (const stray of strays) {
      await purgeTeam(db, stray.id).catch(() => {})
      // `uploaded_assets.team_id` is ON DELETE RESTRICT (P1-R12) and the rows are
      // never deleted (they prove an object exists in a bucket shared with
      // production), so a stray holding assets is undeletable until they are
      // reassigned. They stay `orphaned` for the reclaim sweep either way.
      await db.uploadedAsset.updateMany({
        where: { teamId: stray.id },
        data: { teamId: team.id, status: 'orphaned' },
      })
      await db.teamMember.deleteMany({ where: { teamId: stray.id } })
      await db.teamMembershipEvent.deleteMany({ where: { teamId: stray.id } })
      await db.teamInvite.deleteMany({ where: { teamId: stray.id } })
      await db.teamCurrency.deleteMany({ where: { teamId: stray.id } })
      await db.user.updateMany({ where: { activeTeamId: stray.id }, data: { activeTeamId: null } })
      await db.team
        .delete({ where: { id: stray.id } })
        .then(() => console.log(`  ${'stray team removed'.padEnd(30)} ${stray.name}`))
        .catch((err) => console.warn(`  stray team ${stray.name} not removable: ${err.code ?? err}`))
    }

    console.log(`\n${total} row(s) removed. Now run: pnpm --filter web seed:e2e`)
  } finally {
    await db.$disconnect()
  }
}

// Importable as a module (e2e/lab.ts uses `purgeTeam`); runs only when invoked
// directly as a script.
if (process.argv[1] && process.argv[1].endsWith('reset-e2e.mjs')) {
  await main()
}
