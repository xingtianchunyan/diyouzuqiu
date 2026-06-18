import { apiClient } from '../client'

export interface KnowledgeDoc {
  id: string
  title: string
  content: string
  category: 'GENERAL' | 'PLANNER_FILE' | 'PLANNER_CHAT'
  plannerProjectId?: string
  createdAt: string
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
    return apiClient.get<KnowledgeDoc[]>('/knowledge', { params })
  },

  uploadKnowledge(file: File, title?: string) {
    const formData = new FormData()
    formData.append('file', file)
    if (title) formData.append('title', title)
    return apiClient.post<{ id: string; title: string }>('/knowledge/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  chatKnowledge(messages: ChatMessage[], plannerProjectId?: string) {
    return apiClient.post<{ response: string }>('/knowledge/chat', { messages, plannerProjectId })
  },

  generatePlanFromKnowledge(docIds?: string[], constraints?: PlannerConstraints) {
    return apiClient.post<PlannerResult>('/knowledge/generate-plan', { docIds, constraints })
  },

  generateAnnualPlan(constraints: Required<Pick<PlannerConstraints, 'peopleCount' | 'budget' | 'date' | 'location'>> & Omit<PlannerConstraints, 'peopleCount' | 'budget' | 'date' | 'location'>) {
    return apiClient.post<PlannerResult>('/planner/annual', { constraints })
  },

  async chatPlanner(messages: ChatMessage[]) {
    return apiClient.post<{ response: string }>('/planner/chat', { messages })
  }
}
