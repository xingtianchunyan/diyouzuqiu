import { apiClient } from '../client'

export interface ParsedData {
  title: string
  content: string
  date: string
  description: string
  author?: string
}

export const parseService = {
  parse(data: { file?: File; url?: string; html?: string; targetType?: string }) {
    if (data.file) {
      const formData = new FormData()
      if (data.targetType) {
        formData.append('targetType', data.targetType)
      }
      formData.append('file', data.file)
      return apiClient.post<ParsedData>('/parse', formData)
    } else if (data.url || typeof data.html === 'string') {
      const payload: any = {}
      if (data.url) payload.url = data.url
      if (typeof data.html === 'string') payload.html = data.html
      if (data.targetType) payload.targetType = data.targetType
      return apiClient.post<ParsedData>('/parse', payload)
    }
    throw new Error('Either file, url or html must be provided')
  }
}
