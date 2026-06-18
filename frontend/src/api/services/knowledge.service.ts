import { apiClient } from '../client'

export interface KnowledgeItem {
  id: string
  title: string
}

export interface PlannerConstraints {
  peopleCount: number
  budget: number
  date: string
  location: string
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
  citations: { docId: string; title: string }[]
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface CreateKnowledgeDto {
  title: string
  content: string
  category?: string
  plannerProjectId?: string
}

export const knowledgeService = {
  createKnowledge(data: CreateKnowledgeDto) {
    return apiClient.post<{ id: string }>('/knowledge', data)
  },
  
  getKnowledgeList(params?: { q?: string; category?: string; plannerProjectId?: string }) {
    return apiClient.get<KnowledgeItem[]>('/knowledge', { params })
  },
  
  generateAnnualPlan(constraints: PlannerConstraints) {
    return apiClient.post<PlannerResult>('/planner/annual', { constraints })
  },

  async chatPlanner(messages: ChatMessage[]) {
    return apiClient.post<{ response: string }>('/planner/chat', { messages })
  }
}
