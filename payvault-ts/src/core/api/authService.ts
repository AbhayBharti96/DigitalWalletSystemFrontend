import type { AuthResponse, LoginRequest, SignupRequest, VerifyOtpRequest } from '../../types'
import { authApi } from './client'

export const authService = {
  login: (payload: LoginRequest) => authApi.post<AuthResponse>('/api/auth/login', payload),
  signup: (payload: SignupRequest) => authApi.post<{ message: string }>('/api/auth/signup', payload),
  sendOtp: (email: string) => authApi.post('/api/auth/send-otp', { email }),
  verifyOtp: (payload: VerifyOtpRequest) => authApi.post<AuthResponse>('/api/auth/verify-otp', payload),
  logout: (refreshToken: string) => authApi.post('/api/auth/logout', { refreshToken }),
  refresh: (refreshToken: string) => authApi.post<AuthResponse>('/api/auth/refresh', { refreshToken }),
  forgotPasswordOtp: (email: string) => authApi.post('/api/auth/forgot-password/send-otp', { email }),
  forgotPasswordVerify: (email: string, otp: string) =>
    authApi.post<{ resetToken: string }>('/api/auth/forgot-password/verify-otp', { email, otp }),
  resetPassword: (resetToken: string, newPassword: string) =>
    authApi.post('/api/auth/reset-password', { resetToken, newPassword }),
}
