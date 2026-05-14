import { defineStore } from 'pinia'
import { ref } from 'vue'
import { worksService, type Work } from '../api/services/works.service'

export const useWorksStore = defineStore('works', () => {
  const works = ref<Work[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchWorks = async (params?: { type?: 'ARTICLE' | 'POEM'; authorId?: string; q?: string; year?: number }) => {
    loading.value = true
    error.value = null
    try {
      const response = await worksService.getWorks(params)
      works.value = response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch works'
    } finally {
      loading.value = false
    }
  }

  return {
    works,
    loading,
    error,
    fetchWorks
  }
})
