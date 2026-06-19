import { readFile } from 'fs/promises'
import path from 'path'
import { isValidSelection } from '@/lib/research-plan/types'

/**
 * Loads the review rubric for a (projectType, subtype) pair by composing the
 * track base (`_engineering.md` / `_science.md`) with the subtype emphasis file.
 * Mirrors lib/literature/quiz.ts#loadRubric — edit the markdown to tune review
 * rigor without code changes. Cached per pair after first read.
 */

const cache = new Map<string, string>()

function rubricPath(file: string): string {
  return path.join(process.cwd(), 'lib', 'research-plan', 'rubrics', `${file}.md`)
}

export async function loadResearchRubric(
  projectType: string,
  subtype: string,
): Promise<string> {
  if (!isValidSelection(projectType, subtype)) {
    throw new Error(`Unknown project selection: ${projectType}/${subtype}`)
  }
  const key = `${projectType}:${subtype}`
  const cached = cache.get(key)
  if (cached) return cached

  const [base, sub] = await Promise.all([
    readFile(rubricPath(`_${projectType}`), 'utf-8'),
    readFile(rubricPath(subtype), 'utf-8'),
  ])
  const composed = `${base}\n\n${sub}`
  cache.set(key, composed)
  return composed
}
