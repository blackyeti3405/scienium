import { readFile } from 'fs/promises'
import path from 'path'

/**
 * Server-only loader for the clearance-exam pedagogy/grading rubric. Kept apart
 * from lib/clearance/expertise.ts (which client components import for config) so
 * the `fs` dependency never lands in the browser bundle. Cached after first read.
 */
let cachedRubric: string | null = null

export async function loadExpertiseRubric(): Promise<string> {
  if (cachedRubric) return cachedRubric
  const filePath = path.join(process.cwd(), 'lib', 'clearance', 'expertise-rubric.md')
  cachedRubric = await readFile(filePath, 'utf-8')
  return cachedRubric
}
