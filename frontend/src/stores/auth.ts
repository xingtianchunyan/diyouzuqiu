import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '../api/client'

export interface User {
  id: string
  email: string
  phone?: string | null
  role: 'ADMIN' | 'MEMBER'
  memberId: string | null
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const user = ref<User | null>(null)
  
  const isAuthenticated = computed(() => !!accessToken.value)

  const setTokens = (access: string) => {
    accessToken.value = access
    localStorage.setItem('accessToken', access)
  }

  const setUser = (userData: User) => {
    user.value = userData
  }

  const logout = () => {
    accessToken.value = null
    user.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken') // Clean up old data if exists
  }

  const fetchCurrentUser = async () => {
    if (!accessToken.value) return null
    try {
      const response = await apiClient.get<User>('/me')
      user.value = response.data
      return response.data
    } catch (error) {
      logout()
      throw error
    }
  }

  const refreshToken = async () => {
    try {
      const response = await apiClient.post('/auth/refresh', {})
      
      const newAccess = response.data.token
      if (newAccess) {
        setTokens(newAccess)
        return newAccess
      }
      throw new Error('No token returned from refresh')
    } catch (error) {
      logout()
      throw error
    }
  }

  return {
    accessToken,
    user,
    isAuthenticated,
    setTokens,
    setUser,
    logout,
    fetchCurrentUser,
    refreshToken
  }
})
