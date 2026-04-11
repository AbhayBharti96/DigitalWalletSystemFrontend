import { beforeEach, describe, expect, it } from 'vitest'
import './httpClientMock'
import { authClientMock, resetHttpMocks } from './httpClientMock'
import { authService } from '@/services/auth.service'

describe('authService', () => {
  beforeEach(() => {
    resetHttpMocks()
  })

  it('calls login endpoint with credentials', () => {
    authService.login({ email: 'user@example.com', password: 'Secret123!' })
    expect(authClientMock.post).toHaveBeenCalledWith('/api/auth/login', {
      email: 'user@example.com',
      password: 'Secret123!',
    })
  })

  it('calls signup endpoint with payload', () => {
    authService.signup({ fullName: 'Demo User', email: 'demo@example.com', phone: '9999999999', password: 'Secret123!' })
    expect(authClientMock.post).toHaveBeenCalledWith('/api/auth/signup', {
      fullName: 'Demo User',
      email: 'demo@example.com',
      phone: '9999999999',
      password: 'Secret123!',
    })
  })

  it('calls otp and password recovery endpoints', () => {
    authService.sendOtp('otp@example.com')
    authService.verifyOtp({ email: 'otp@example.com', otp: '123456' })
    authService.forgotPasswordOtp('otp@example.com')
    authService.forgotPasswordVerify('otp@example.com', '123456')
    authService.resetPassword('reset-token', 'Secret123!')

    expect(authClientMock.post).toHaveBeenNthCalledWith(1, '/api/auth/send-otp', { email: 'otp@example.com' })
    expect(authClientMock.post).toHaveBeenNthCalledWith(2, '/api/auth/verify-otp', { email: 'otp@example.com', otp: '123456' })
    expect(authClientMock.post).toHaveBeenNthCalledWith(3, '/api/auth/forgot-password/send-otp', { email: 'otp@example.com' })
    expect(authClientMock.post).toHaveBeenNthCalledWith(4, '/api/auth/forgot-password/verify-otp', { email: 'otp@example.com', otp: '123456' })
    expect(authClientMock.post).toHaveBeenNthCalledWith(5, '/api/auth/reset-password', {
      resetToken: 'reset-token',
      newPassword: 'Secret123!',
    })
  })

  it('calls logout and refresh endpoints', () => {
    authService.logout('refresh-1')
    authService.refresh('refresh-2')

    expect(authClientMock.post).toHaveBeenNthCalledWith(1, '/api/auth/logout', { refreshToken: 'refresh-1' })
    expect(authClientMock.post).toHaveBeenNthCalledWith(2, '/api/auth/refresh', { refreshToken: 'refresh-2' })
  })
})
