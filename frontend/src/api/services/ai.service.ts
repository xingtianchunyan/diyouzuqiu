import { apiClient } from '../client'

export type AiContext = 'planner' | 'knowledge'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface PlannerConstraints {
  peopleCount?: number
  budget?: number
  date?: string
  location?: string
  durationHours?: number
  style?: string
  mustHave?: string[]
  avoid?: string[]
  notes?: string
}

export interface PlannerResult {
  plan: {
    plan: string
    budget: string
    prizes: string
    speech: string
  }
  citations: { docId: string; title: string; snippets: string[] }[]
}

export const aiService = {
  chat(messages: ChatMessage[], context: AiContext, plannerProjectId?: string) {
    return apiClient.post<{ response: string }>('/ai/chat', {
      messages,
      context,
      plannerProjectId
    })
  },

  generate(context: AiContext, options: { docIds?: string[]; constraints?: PlannerConstraints; plannerProjectId?: string } = {}) {
    return apiClient.post<PlannerResult>('/ai/generate', {
      context,
      ...options
    })
  }
}
