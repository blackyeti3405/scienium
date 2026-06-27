import Anthropic from '@anthropic-ai/sdk'
import { LAB_TYPE_LABELS, type LabType } from '@/lib/phase'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const LAB_TYPE_DESCRIPTIONS: Record<LabType, string> = {
  biocore:
    'Biology, life sciences, ecology, genetics, biochemistry, microbiology, environmental biology',
  chemworks:
    'Chemistry, reactions, materials science, chemical engineering, formulations, analytical chemistry',
  volt_lab:
    'Engineering, electronics, circuits, robotics, mechanical systems, software, computer science, physics applications, applied physical systems',
  terrabase:
    'Earth science, climate, geology, atmospheric science, hydrology, environmental earth systems, oceanography',
  mindframe:
    'Social science, psychology, cognitive science, behavioral science, sociology, neuroscience, human behavior',
  axiom:
    'Pure mathematics, physics, astronomy, astrophysics, cosmology, theoretical science, mathematical modeling',
}

/**
 * Uses Claude Haiku to classify a one-sentence research idea into one of the
 * six scienium lab types. Returns the classification plus a short rationale.
 *
 * Defaults to 'volt_lab' on parse failure to avoid blocking the advance.
 */
export async function classifyLabType(
  researchIdea: string,
): Promise<{ labType: LabType; rationale: string }> {
  const typesBlock = (Object.keys(LAB_TYPE_DESCRIPTIONS) as LabType[])
    .map((k) => `- ${k}: ${LAB_TYPE_DESCRIPTIONS[k]}`)
    .join('\n')

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: `You classify student research ideas into one of six lab types. Return ONLY valid JSON with exactly two fields: "labType" (one of the exact strings below) and "rationale" (one sentence explaining why).

Lab types:
${typesBlock}

Rules:
- Pick the SINGLE best-fitting lab type
- Return ONLY the JSON object, no markdown, no explanation outside JSON`,
    messages: [
      {
        role: 'user',
        content: `Research idea: "${researchIdea}"`,
      },
    ],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      const labType = parsed.labType as LabType
      if (labType && LAB_TYPE_LABELS[labType]) {
        return { labType, rationale: parsed.rationale ?? '' }
      }
    }
  } catch {
    // fall through to default
  }

  return { labType: 'volt_lab', rationale: 'Could not classify — defaulted to Volt Lab.' }
}
