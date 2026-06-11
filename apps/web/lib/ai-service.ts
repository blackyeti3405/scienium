const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:8000'
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY ?? ''

async function fetchAiService<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${AI_SERVICE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': AI_SERVICE_API_KEY,
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AI service error ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export const aiService = {
  processPaper: (body: unknown) =>
    fetchAiService('/papers/process', { method: 'POST', body: JSON.stringify(body) }),

  generateFieldDispatch: (labType: string) =>
    fetchAiService(`/content/field-dispatch?lab_type=${labType}`),

  generateExpertiseQuestion: (labType: string, clearanceLevel: number) =>
    fetchAiService(`/content/expertise?lab_type=${labType}&clearance_level=${clearanceLevel}`),

  evaluateProjectLog: (body: unknown) =>
    fetchAiService('/project-log/evaluate', { method: 'POST', body: JSON.stringify(body) }),

  generateMiniGame: (body: unknown) =>
    fetchAiService('/minigames/generate', { method: 'POST', body: JSON.stringify(body) }),
}
