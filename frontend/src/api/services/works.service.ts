import { apiClient } from '../client'

export interface Work {
  id: string
  type: 'ARTICLE' | 'POEM'
  title: string
  authorMemberId: string | null
  authorMember?: { displayName: string } | null
  authorName: string | null
  year: number | null
  date: string | null
  createdAt: string
  createdByUserId?: string
  content?: string
}

export const worksService = {
  getWorks(params?: { type?: 'ARTICLE' | 'POEM'; authorId?: string; q?: string; year?: number }) {
    return apiClient.get<Work[]>('/works', { params })
  },
  
  createWork(data: { type: 'ARTICLE' | 'POEM'; title: string; content: string; authorId?: string; authorName?: string; year?: number; date?: string }) {
    return apiClient.post<Work>('/works', data)
  },
  
  getWorkDetail(id: string) {
    return apiClient.get<Work>(`/works/${id}`)
  },
  
  updateWork(id: string, data: {
    type?: 'ARTICLE' | 'POEM'
    title?: string
    content?: string
    authorId?: string
    authorName?: string
    year?: number
    date?: string
  }) {
    return apiClient.put<Work>(`/works/${id}`, data)
  },

  deleteWork(id: string) {
    return apiClient.delete(`/works/${id}`)
  }
}
