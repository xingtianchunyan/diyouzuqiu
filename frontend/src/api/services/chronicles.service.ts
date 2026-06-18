import { apiClient } from '../client'

export interface ChronicleEventPayload {
  title: string
  happenedAt: string
  description?: string
  mediaId?: string
  memberIds?: string[]
  mediaAssetIds?: string[]
  workIds?: string[]
  matchIds?: string[]
}

export const chroniclesService = {
  createChronicle(data: ChronicleEventPayload) {
    return apiClient.post<{ id: string }>('/chronicles', data)
  },
  
  getChronicles(params?: { year?: number; memberId?: string }) {
    return apiClient.get('/chronicles', { params })
  },

  getDailyMaterials(date: string) {
    return apiClient.get<{
      mediaAssets: any[]
      works: any[]
      matches: any[]
    }>('/daily-materials', { params: { date } })
  },
  
  updateChronicle(id: string, data: Partial<ChronicleEventPayload>) {
    return apiClient.put(`/chronicles/${id}`, data)
  },

  deleteChronicle(id: string) {
    return apiClient.delete(`/chronicles/${id}`)
  }
}
