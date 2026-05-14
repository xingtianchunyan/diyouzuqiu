import axios from 'axios'
import type { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 180000,
  headers: {
    'Content-Type': 'application/json'
  }
})

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (e) {
    return null
  }
}

let isRefreshing = false
let refreshPromise: Promise<string> | null = null

// Request interceptor
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const { useAuthStore } = await import('../stores/auth')
    const authStore = useAuthStore()
    const token = authStore.accessToken
    
    if (token && config.headers) {
      // Proactively refresh token if it's about to expire
      if (config.url && config.url !== '/auth/refresh' && config.url !== '/auth/login') {
        const payload = parseJwt(token)
        if (payload && payload.exp) {
          const expMs = payload.exp * 1000
          const TIME_BEFORE_EXPIRY = 5 * 60 * 1000 // 5 minutes
          
          if (expMs - Date.now() < TIME_BEFORE_EXPIRY) {
            if (!isRefreshing) {
              isRefreshing = true
              refreshPromise = authStore.refreshToken().finally(() => {
                isRefreshing = false
                refreshPromise = null
              })
            }
            
            if (refreshPromise) {
              try {
                await refreshPromise
              } catch (err) {
                // If proactive refresh fails, just let the request proceed
                // The backend will reject it with 401, and the response interceptor will handle it
                console.warn('Proactive token refresh failed', err)
              }
            }
          }
        }
      }
      
      // Use the (potentially refreshed) token
      const currentToken = authStore.accessToken
      if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`
      }
    }
    
    if (config.data instanceof FormData) {
      if (config.headers) {
        delete config.headers['Content-Type']
      }
    }
    
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error: AxiosError) => {
    // If we get a 401, the token is already expired.
    // The backend requires a valid token to call /auth/refresh, so we cannot recover.
    // We must log the user out and redirect to login.
    if (error.response?.status === 401 && error.config?.url !== '/auth/login') {
      const { useAuthStore } = await import('../stores/auth')
      const authStore = useAuthStore()
      
      authStore.logout()
      
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

export default apiClient
