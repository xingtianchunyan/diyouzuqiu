import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { familiesService, type Family } from '../api/services/families.service'

export const useFamiliesStore = defineStore('families', () => {
  const families = ref<Family[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const familyById = computed(() => {
    const map: Record<string, string> = {}
    for (const f of families.value) {
      map[f.id] = f.label
    }
    return map
  })

  const fetchFamilies = async () => {
    if (families.value.length > 0 && !error.value) return
    loading.value = true
    error.value = null
    try {
      const response = await familiesService.getFamilies()
      families.value = response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch families'
    } finally {
      loading.value = false
    }
  }

  const createFamily = async (label: string) => {
    const response = await familiesService.createFamily(label)
    families.value.push(response.data)
    return response.data
  }

  return {
    families,
    loading,
    error,
    familyById,
    fetchFamilies,
    createFamily
  }
})
