import { beforeEach, describe, expect, it } from 'vitest'
import './httpClientMock'
import { apiClientMock, resetHttpMocks } from './httpClientMock'
import { userService } from '@/services/user.service'

describe('userService', () => {
  beforeEach(() => {
    resetHttpMocks()
  })

  it('maps backend profile name to frontend fullName on getProfile', async () => {
    apiClientMock.get.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Profile fetched',
        data: {
          id: 7,
          name: 'Admin User',
          email: 'admin@example.com',
          phone: '9999999999',
          role: 'ADMIN',
          kycStatus: 'APPROVED',
          status: 'ACTIVE',
          createdAt: '2026-04-11T00:00:00Z',
        },
        timestamp: '2026-04-11T00:00:00Z',
      },
    })

    const response = await userService.getProfile(7)

    expect(apiClientMock.get).toHaveBeenCalledWith('/api/users/profile', { headers: { 'X-User-Id': 7 } })
    expect(response.data.data).toEqual({
      id: 7,
      fullName: 'Admin User',
      email: 'admin@example.com',
      phone: '9999999999',
      role: 'ADMIN',
      kycStatus: 'APPROVED',
      status: 'ACTIVE',
      createdAt: '2026-04-11T00:00:00Z',
    })
  })

  it('maps updateProfile response to frontend user shape', async () => {
    apiClientMock.put.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Profile updated',
        data: {
          id: 7,
          name: 'Updated Name',
          email: 'admin@example.com',
          role: 'ADMIN',
        },
        timestamp: '2026-04-11T00:00:00Z',
      },
    })

    const response = await userService.updateProfile(7, { name: 'Updated Name' })

    expect(apiClientMock.put).toHaveBeenCalledWith('/api/users/profile', { name: 'Updated Name' }, { headers: { 'X-User-Id': 7 } })
    expect(response.data.data.fullName).toBe('Updated Name')
    expect(response.data.data.role).toBe('ADMIN')
  })

  it('searches recipients with the correct user header', () => {
    userService.searchRecipients(5, 'alice')
    expect(apiClientMock.get).toHaveBeenCalledWith('/api/users/search?q=alice', {
      headers: { 'X-User-Id': 5 },
    })
  })
})
