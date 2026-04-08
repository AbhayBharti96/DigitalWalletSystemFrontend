import type { AuthResponse, LoginRequest, SignupRequest, VerifyOtpRequest } from '../types'
import { authClient } from './http/client'

export const authService = {
  login: (payload: LoginRequest) => authClient.post<AuthResponse>('/api/auth/login', payload),
  signup: (payload: SignupRequest) => authClient.post<{ message: string }>('/api/auth/signup', payload),
  sendOtp: (email: string) => authClient.post('/api/auth/send-otp', { email }),
  verifyOtp: (payload: VerifyOtpRequest) => authClient.post<AuthResponse>('/api/auth/verify-otp', payload),
  logout: (refreshToken: string) => authClient.post('/api/auth/logout', { refreshToken }),
  refresh: (refreshToken: string) => authClient.post<AuthResponse>('/api/auth/refresh', { refreshToken }),
  forgotPasswordOtp: (email: string) => authClient.post('/api/auth/forgot-password/send-otp', { email }),
  forgotPasswordVerify: (email: string, otp: string) =>
    authClient.post<{ resetToken: string }>('/api/auth/forgot-password/verify-otp', { email, otp }),
  resetPassword: (resetToken: string, newPassword: string) =>
    authClient.post('/api/auth/reset-password', { resetToken, newPassword }),
}
