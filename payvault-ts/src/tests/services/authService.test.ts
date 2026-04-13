import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/core/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
  authApi: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}))

import { authApi } from '@/core/api/client'
import { authService } from '@/core/api/authService'

const mockedAuthApi = vi.mocked(authApi)

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('routes login and signup requests through authApi.post', () => {
    const loginPayload = { email: 'user@example.com', password: 'secret123' }
    const signupPayload = { fullName: 'User', email: 'user@example.com', phone: '9999999999', password: 'secret123' }

    authService.login(loginPayload)
    authService.signup(signupPayload)

    expect(mockedAuthApi.post).toHaveBeenNthCalledWith(1, '/api/auth/login', loginPayload)
    expect(mockedAuthApi.post).toHaveBeenNthCalledWith(2, '/api/auth/signup', signupPayload)
  })

  it('sends OTP and verification payloads to the expected auth endpoints', () => {
    const verifyPayload = { email: 'user@example.com', otp: '123456' }

    authService.sendOtp('user@example.com')
    authService.verifyOtp(verifyPayload)
    authService.logout('refresh-1')
    authService.refresh('refresh-2')

    expect(mockedAuthApi.post).toHaveBeenNthCalledWith(1, '/api/auth/send-otp', { email: 'user@example.com' })
    expect(mockedAuthApi.post).toHaveBeenNthCalledWith(2, '/api/auth/verify-otp', verifyPayload)
    expect(mockedAuthApi.post).toHaveBeenNthCalledWith(3, '/api/auth/logout', { refreshToken: 'refresh-1' })
    expect(mockedAuthApi.post).toHaveBeenNthCalledWith(4, '/api/auth/refresh', { refreshToken: 'refresh-2' })
  })

  it('uses the forgot-password endpoints with the expected request bodies', () => {
    authService.forgotPasswordOtp('user@example.com')
    authService.forgotPasswordVerify('user@example.com', '654321')
    authService.resetPassword('reset-token', 'new-secret')

    expect(mockedAuthApi.post).toHaveBeenNthCalledWith(
      1,
      '/api/auth/forgot-password/send-otp',
      { email: 'user@example.com' },
    )
    expect(mockedAuthApi.post).toHaveBeenNthCalledWith(
      2,
      '/api/auth/forgot-password/verify-otp',
      { email: 'user@example.com', otp: '654321' },
    )
    expect(mockedAuthApi.post).toHaveBeenNthCalledWith(
      3,
      '/api/auth/reset-password',
      { resetToken: 'reset-token', newPassword: 'new-secret' },
    )
  })
})
