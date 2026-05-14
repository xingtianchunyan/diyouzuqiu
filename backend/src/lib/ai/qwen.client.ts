import 'dotenv/config'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface QwenChatOptions {
  json?: boolean
  enableSearch?: boolean
  timeoutMs?: number
  maxTokens?: number
  temperature?: number
}

const DEFAULT_TIMEOUT_MS = 120000
const DEFAULT_MAX_TOKENS_JSON = 2048
const DEFAULT_MAX_TOKENS_TEXT = 1536

const QWEN_API_KEY = (process.env.QWEN_API_KEY || '').replace(/^["']|["']$/g, '').trim()
const QWEN_BASE_URL = (process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions').replace(/^["']|["']$/g, '').trim()
let QWEN_MODEL = (process.env.QWEN_MODEL || 'qwen-turbo').replace(/^["']|["']$/g, '').trim()
const AI_MOCK = (process.env.AI_MOCK || '').toLowerCase() === 'true'

const isSiliconFlow = QWEN_BASE_URL.includes('siliconflow')
if (isSiliconFlow && QWEN_MODEL === 'qwen-turbo') {
  QWEN_MODEL = 'Qwen/Qwen2.5-7B-Instruct'
}

export async function callQwenChat(messages: ChatMessage[], opts: QwenChatOptions = {}): Promise<string> {
  if (AI_MOCK) {
    if (opts.json) {
      const combined = messages.map(m => m.content).join('\n')
      if (combined.includes('"plan"') && combined.includes('"budget"') && combined.includes('"prizes"') && combined.includes('"speech"')) {
        return JSON.stringify({
          plan: 'MOCK: plan',
          budget: 'MOCK: budget',
          prizes: 'MOCK: prizes',
          speech: 'MOCK: speech'
        })
      }
      return JSON.stringify({
        title: 'MOCK: title',
        date: '',
        content: 'MOCK: content'
      })
    }
    return 'MOCK: response'
  }

  if (!QWEN_API_KEY) {
    throw new Error('QWEN_API_KEY is not configured')
  }

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const payload: any = {
    model: QWEN_MODEL,
    messages
  }

  if (opts.json) {
    payload.response_format = { type: 'json_object' }
    payload.max_tokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS_JSON
  } else {
    payload.max_tokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS_TEXT
  }

  if (typeof opts.temperature === 'number') {
    payload.temperature = opts.temperature
  }

  if (opts.enableSearch && !isSiliconFlow) {
    payload.enable_search = true
  }

  const response = await fetch(QWEN_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${QWEN_API_KEY}`
    },
    body: JSON.stringify(payload),
    signal: controller.signal
  }).finally(() => clearTimeout(timeoutId))

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Qwen API error (${response.status}): ${text.slice(0, 2000)}`)
  }

  const data = await response.json()
  return data?.choices?.[0]?.message?.content ?? ''
}
