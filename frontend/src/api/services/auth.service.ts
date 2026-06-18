import { apiClient } from '../client'
import type { User } from '../../stores/auth'

export interface LoginResponse {
  token: string
  user: User
}

export interface OtpSendResponse {
  codeId: string
  code?: string
  expiresIn: number
}

export const authService = {
  login(email: string, password: string) {
    return apiClient.post<LoginResponse>('/auth/login', { email, password })
  },

  sendEmailOtp(email: string) {
    return apiClient.post<OtpSendResponse>('/auth/otp/send', { email })
  },

  loginWithEmailOtp(email: string, codeId: string, code: string) {
    return apiClient.post<LoginResponse>('/auth/otp/login', { email, codeId, code })
  }
}
