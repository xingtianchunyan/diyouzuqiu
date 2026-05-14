import { apiClient } from '../client'

export interface MediaMeta {
  takenAt?: string | null
  year?: number | null
  personTagIds?: string[]
}

export interface Media {
  id: string
  type: 'PHOTO' | 'VIDEO'
  takenAt: string | null
  year: number | null
  thumbUrl: string | null
  originalFilename?: string
  createdByUserId?: string | null
  personTags?: { id: string; displayName: string }[]
}

export interface MediaDetail extends Media {
  personTags: { id: string; displayName: string }[]
}

export const mediaService = {
  uploadMedia(file: File, meta?: MediaMeta) {
    const formData = new FormData()
    if (meta) {
      formData.append('meta', JSON.stringify(meta))
    }
    formData.append('file', file)
    
    return apiClient.post<{ id: string }>('/media', formData)
  },

  deleteMedia(id: string) {
    return apiClient.delete(`/media/${id}`)
  },
  
  getMediaList(params?: { type?: 'PHOTO' | 'VIDEO'; year?: number; personId?: string }) {
    return apiClient.get<Media[]>('/media', { params })
  },
  
  getMediaDetail(id: string) {
    return apiClient.get<MediaDetail>(`/media/${id}`)
  },
  
  updateMedia(id: string, data: MediaMeta) {
    return apiClient.put<MediaDetail>(`/media/${id}`, data)
  },
  
  getMediaFileUrl(id: string) {
    // Return the URL for the media file, which includes the access token or uses cookies
    return `${apiClient.defaults.baseURL}/media/${id}/file`
  }
}
