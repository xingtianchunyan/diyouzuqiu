import { apiClient } from '../client'

export interface KnowledgeDoc {
  id: string
  title: string
  content: string
  category: 'GENERAL' | 'PLANNER_FILE' | 'PLANNER_CHAT'
  plannerProjectId?: string
  createdAt: string
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
  }
}
