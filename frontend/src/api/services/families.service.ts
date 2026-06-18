import { apiClient } from '../client'

export interface Family {
  id: string
  label: string
}

export const familiesService = {
  getFamilies() {
    return apiClient.get<Family[]>('/families')
  },

  createFamily(label: string) {
    return apiClient.post<Family>('/families', { label })
  }
}
