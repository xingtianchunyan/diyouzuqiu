import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { apiClient } from '../api/client'

export interface User {
  id: string
  email: string
  phone?: string | null
  role: 'ADMIN' | 'MEMBER'
  memberId: string | null
}

const REFRESH_INTERVAL_MS = 50 * 60 * 1000 // 50 minutes
const RESUME_REFRESH_THRESHOLD_MS = 10 * 60 * 1000 // 10 minutes

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)
  const lastRefreshAt = ref(0)
  let refreshTimer: ReturnType<typeof setInterval> | null = null

  const isAuthenticated = computed(() => !!user.value)

  function startRefreshTimer() {
    stopRefreshTimer()
    refreshTimer = setInterval(() => {
      refreshToken().catch(() => {
        // If the background refresh fails the next API call will get a 401
        // and the response interceptor will redirect to login.
      })
    }, REFRESH_INTERVAL_MS)
  }

  function stopRefreshTimer() {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  const setUser = (userData: User) => {
    user.value = userData
    lastRefreshAt.value = Date.now()
    startRefreshTimer()
  }

  const logout = async () => {
    stopRefreshTimer()
    try {
      await apiClient.post('/auth/logout', {})
    } catch {
      // Ignore logout errors; the cookie will expire anyway.
    }
    user.value = null
  }

  const fetchCurrentUser = async () => {
    const response = await apiClient.get<User>('/me')
    user.value = response.data
    return response.data
  }

  const refreshToken = async () => {
    const response = await apiClient.post('/auth/refresh', {})
    lastRefreshAt.value = Date.now()
    return response.data.token as string
  }

  const refreshIfNeeded = async (force = false) => {
    if (!user.value) return
    if (!force && Date.now() - lastRefreshAt.value < RESUME_REFRESH_THRESHOLD_MS) return
    try {
      await refreshToken()
    } catch (err) {
      if (axios.isAxiosError(err) && !err.response) {
        // Network error: keep the session and try again next time.
        return
      }
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        // The refresh endpoint does not trigger the 401 interceptor,
        // so handle the expired session here.
        user.value = null
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }
  }

  const initialize = async () => {
    if (initialized.value) return
    try {
      await fetchCurrentUser()
      // Rotate the cookie immediately so the session is fresh.
      await refreshToken()
      lastRefreshAt.value = Date.now()
      startRefreshTimer()
    } catch {
      user.value = null
    } finally {
      initialized.value = true
    }
  }

  return {
    user,
    initialized,
    isAuthenticated,
    lastRefreshAt,
    setUser,
    logout,
    fetchCurrentUser,
    refreshToken,
    refreshIfNeeded,
    initialize
  }
})
