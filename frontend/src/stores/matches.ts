import { defineStore } from 'pinia'
import { ref } from 'vue'
import { matchesService, type Match } from '../api/services/matches.service'

export const useMatchesStore = defineStore('matches', () => {
  const matches = ref<Match[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchMatches = async (params?: { year?: number }) => {
    loading.value = true
    error.value = null
    try {
      const response = await matchesService.getMatches(params)
      matches.value = response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch matches'
    } finally {
      loading.value = false
    }
  }

  return {
    matches,
    loading,
    error,
    fetchMatches
  }
})
