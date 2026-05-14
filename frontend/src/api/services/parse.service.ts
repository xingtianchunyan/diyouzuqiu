import { apiClient } from '../client'

export interface ParsedData {
  title: string
  content: string
  date: string
  description: string
}

export const parseService = {
  parse(data: { file?: File; url?: string; targetType?: string }) {
    if (data.file) {
      const formData = new FormData()
      if (data.targetType) {
        formData.append('targetType', data.targetType)
      }
      formData.append('file', data.file)
      return apiClient.post<ParsedData>('/parse', formData)
    } else if (data.url) {
      const payload: any = { url: data.url }
      if (data.targetType) {
        payload.targetType = data.targetType
      }
      return apiClient.post<ParsedData>('/parse', payload)
    }
    throw new Error('Either file or url must be provided')
  }
}
