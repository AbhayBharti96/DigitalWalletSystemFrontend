import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/core/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
  authApi: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}))

import { api } from '@/core/api/client'
import { userService } from '@/core/api/userService'

const mockedApi = vi.mocked(api)

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches the user profile with the X-UserId header', () => {
    userService.getProfile(42)

    expect(mockedApi.get).toHaveBeenCalledWith('/api/users/profile', {
      headers: { 'X-UserId': 42 },
    })
  })

  it('updates the user profile with the same user header', () => {
    const payload = { name: 'Updated Name', phone: '9876543210' }

    userService.updateProfile(42, payload)

    expect(mockedApi.put).toHaveBeenCalledWith('/api/users/profile', payload, {
      headers: { 'X-UserId': 42 },
    })
  })
})
