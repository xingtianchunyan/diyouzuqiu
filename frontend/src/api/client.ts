import axios from 'axios'
import type { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { get401Policy, type EndpointKind } from '../platform/session-policy'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 180000,
  headers: {
    'Content-Type': 'application/json'
  },
  // JWT is stored in an HttpOnly cookie by the backend; axios must send it.
  withCredentials: true
})

// Request interceptor: ensure FormData requests do not override the multipart boundary.
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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

function classifyEndpoint(url: string): EndpointKind {
  if (url === '/auth/login') return 'login'
  if (url === '/auth/refresh') return 'refresh'
  if (url.startsWith('/media/')) return 'media'
  return 'resource'
}

let isRecovering = false

// Response interceptor: on 401, apply platform session recovery policy.
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error: AxiosError) => {
    const url = error.config?.url
    if (error.response?.status !== 401 || !url) {
      return Promise.reject(error)
    }

    const policy = get401Policy(classifyEndpoint(url))

    if (policy === 'ignore') {
      return Promise.reject(error)
    }

    const { useAuthStore } = await import('../stores/auth')
    const authStore = useAuthStore()

    // Try a single silent recovery before forcing logout.
    if (policy === 'recover-once' && !isRecovering && error.config) {
      isRecovering = true
      try {
        const recovered = await authStore.recoverSession()
        if (recovered) {
          return apiClient.request(error.config)
        }
      } finally {
        isRecovering = false
      }
    }

    await authStore.logout()

    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default apiClient
