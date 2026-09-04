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

export interface CaptchaResponse {
  id: string
  question: string
}

export const authService = {
  login(email: string, password: string, captchaId?: string, captchaAnswer?: string) {
    return apiClient.post<LoginResponse>('/auth/login', { email, password, captchaId, captchaAnswer })
  },

  getCaptcha() {
    return apiClient.get<CaptchaResponse>('/auth/captcha')
  },

  sendEmailOtp(email: string) {
    return apiClient.post<OtpSendResponse>('/auth/otp/send', { email })
  },

  loginWithEmailOtp(email: string, codeId: string, code: string) {
    return apiClient.post<LoginResponse>('/auth/otp/login', { email, codeId, code })
  }
}
