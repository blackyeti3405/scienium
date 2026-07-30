import 'server-only'
import { db } from '@/lib/db'
import { LAB_TYPE_LABELS, type LabType } from '@/lib/phase'

/**
 * Assembles a compact snapshot of a team's project for the Proof of Expertise
 * exam. Everything is length-bounded so the generation/grading prompts stay cheap
 * (token efficiency): we send titles and the synced plan text (capped), not raw
 * PDFs. The exam is about whether the student understands THIS project, so the
 * model is grounded in exactly what the team has produced so far.
 */
export interface ProjectContext {
  topic: string | null
  researchIdea: string | null
  labType: LabType | null
  projectType: string | null
  planText: string | null
  paperTitles: string[]
  logSnippets: string[]
}

const PLAN_TEXT_CAP = 16_000
const LOG_SNIPPET_CAP = 280
const MAX_PAPER_TITLES = 25
const MAX_LOG_SNIPPETS = 8

export async function getProjectContext(teamId: string): Promise<ProjectContext> {
  const [team, plan, papers, logs] = await Promise.all([
    db.team.findUnique({
      where: { id: teamId },
      select: { topic: true, researchIdea: true, labType: true },
    }),
    db.researchPlan.findUnique({
      where: { teamId },
      select: { lastSyncedText: true, projectType: true },
    }),
    db.paper.findMany({
      where: { teamId, status: 'ready' },
      orderBy: { createdAt: 'asc' },
      take: MAX_PAPER_TITLES,
      select: { title: true },
    }),
    db.projectLog.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      take: MAX_LOG_SNIPPETS,
      select: { body: true, stage: true },
    }),
  ])

  return {
    topic: team?.topic ?? null,
    researchIdea: team?.researchIdea ?? null,
    labType: (team?.labType as LabType | null) ?? null,
    projectType: plan?.projectType ?? null,
    planText: plan?.lastSyncedText ? plan.lastSyncedText.slice(0, PLAN_TEXT_CAP) : null,
    paperTitles: papers.map((p) => p.title),
    logSnippets: logs
      .map((l) => {
        // Strip lightweight markdown so the snippet is plain prose.
        const plain = l.body.replace(/[*_#>`~\[\]()]/g, '').replace(/\s+/g, ' ').trim()
        if (!plain) return ''
        const head = l.stage ? `[${l.stage}] ` : ''
        return (head + plain).slice(0, LOG_SNIPPET_CAP)
      })
      .filter(Boolean),
  }
}

/**
 * How much of a project a team has assembled, used to decide whether an exam can
 * be meaningfully generated. A bare topic is enough for Level 1; deeper levels
 * lean on the plan, but we don't hard-block on it (the rubric tells Vega to ask
 * the student to supply missing pieces in their own words).
 */
export function hasMinimumContext(ctx: ProjectContext): boolean {
  return Boolean(ctx.topic || ctx.researchIdea || ctx.planText || ctx.paperTitles.length)
}

/** Renders the context into a bounded text block for the model prompt. */
export function renderProjectContext(ctx: ProjectContext): string {
  const lines: string[] = []
  lines.push(`Research topic: ${ctx.topic ?? '(not yet set)'}`)
  if (ctx.researchIdea) lines.push(`One-line research idea: ${ctx.researchIdea}`)
  if (ctx.labType) lines.push(`Lab specialty: ${LAB_TYPE_LABELS[ctx.labType]}`)
  if (ctx.projectType) lines.push(`Project type: ${ctx.projectType}`)
  if (ctx.paperTitles.length) {
    lines.push('', 'Sources reviewed (titles):')
    for (const t of ctx.paperTitles) lines.push(`- ${t}`)
  }
  if (ctx.logSnippets.length) {
    lines.push('', 'Recent project-log notes:')
    for (const s of ctx.logSnippets) lines.push(`- ${s}`)
  }
  if (ctx.planText) {
    lines.push('', 'Research plan (synced text):', '---', ctx.planText)
  }
  return lines.join('\n')
}