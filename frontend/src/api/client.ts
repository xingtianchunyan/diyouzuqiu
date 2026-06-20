import axios from 'axios'
import type { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'

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

// Response interceptor: on 401, clear the local session and redirect to login.
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error: AxiosError) => {
    const url = error.config?.url
    if (error.response?.status === 401 && url !== '/auth/login' && url !== '/auth/refresh') {
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
