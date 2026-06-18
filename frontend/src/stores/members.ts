import { defineStore } from 'pinia'
import { ref } from 'vue'
import { membersService, type Member } from '../api/services/members.service'

export const useMembersStore = defineStore('members', () => {
  const members = ref<Member[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchMembers = async (params?: { team?: 'RED' | 'BLUE'; familyId?: string }) => {
    loading.value = true
    error.value = null
    try {
      const response = await membersService.getMembers(params)
      members.value = response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch members'
    } finally {
      loading.value = false
    }
  }

  return {
    members,
    loading,
    error,
    fetchMembers
  }
})
