export class JsonExtractionError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export function extractJsonObjectFromText(text: string): any {
  const raw = (text || '').trim()
  if (!raw) {
    throw new JsonExtractionError('LLM_PARSE_ERROR', 'Empty response')
  }

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) {
    return parseJsonOrThrow(fenced[1].trim())
  }

  if (raw.startsWith('{') && raw.endsWith('}')) {
    return parseJsonOrThrow(raw)
  }

  const start = raw.indexOf('{')
  if (start === -1) {
    throw new JsonExtractionError('LLM_PARSE_ERROR', 'No JSON object found')
  }

  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i]
    if (inString) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === '"') {
        inString = false
      }
      continue
    }

    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{') depth++
    if (ch === '}') depth--

    if (depth === 0) {
      const candidate = raw.slice(start, i + 1)
      return parseJsonOrThrow(candidate)
    }
  }

  throw new JsonExtractionError('LLM_PARSE_ERROR', 'Unterminated JSON object')
}

export function validateWorkExtraction(payload: any): { title: string; date: string; content: string } {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new JsonExtractionError('LLM_SCHEMA_ERROR', 'JSON must be an object')
  }

  const allowed = new Set(['title', 'date', 'content'])
  for (const key of Object.keys(payload)) {
    if (!allowed.has(key)) {
      throw new JsonExtractionError('LLM_SCHEMA_ERROR', `Unexpected key: ${key}`)
    }
  }

  const title = typeof payload.title === 'string' ? payload.title.trim() : ''
  const content = typeof payload.content === 'string' ? payload.content : ''
  const date = payload.date == null ? '' : String(payload.date).trim()

  if (!title || !content) {
    throw new JsonExtractionError('LLM_SCHEMA_ERROR', 'Missing title or content')
  }

  return { title, date, content }
}

export function validateAnnualPlan(payload: any): { plan: string; budget: string; prizes: string; speech: string } {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new JsonExtractionError('LLM_SCHEMA_ERROR', 'JSON must be an object')
  }

  const keys = ['plan', 'budget', 'prizes', 'speech'] as const
  for (const key of keys) {
    if (typeof payload[key] !== 'string' || !payload[key].trim()) {
      throw new JsonExtractionError('LLM_SCHEMA_ERROR', `Missing or invalid field: ${key}`)
    }
  }

  return {
    plan: payload.plan,
    budget: payload.budget,
    prizes: payload.prizes,
    speech: payload.speech
  }
}

function parseJsonOrThrow(raw: string): any {
  try {
    return JSON.parse(raw)
  } catch {
    throw new JsonExtractionError('LLM_PARSE_ERROR', 'Invalid JSON')
  }
}
