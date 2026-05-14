import { defineStore } from 'pinia'
import { ref } from 'vue'
import { mediaService, type Media } from '../api/services/media.service'

export const useMediaStore = defineStore('media', () => {
  const mediaList = ref<Media[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchMediaList = async (params?: { type?: 'PHOTO' | 'VIDEO'; year?: number; personId?: string }) => {
    loading.value = true
    error.value = null
    try {
      const response = await mediaService.getMediaList(params)
      mediaList.value = response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch media list'
    } finally {
      loading.value = false
    }
  }

  return {
    mediaList,
    loading,
    error,
    fetchMediaList
  }
})
