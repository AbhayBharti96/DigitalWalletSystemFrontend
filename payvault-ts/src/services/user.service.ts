import type { ApiResponse, RecipientSearchItem, UserProfile } from '../types'
import { apiClient } from './http/client'

type BackendUserProfile = {
  id: number
  name: string
  email: string
  phone?: string
  role: UserProfile['role']
  kycStatus?: UserProfile['kycStatus']
  status?: UserProfile['status']
  createdAt?: string
}

const mapUserProfile = (profile: BackendUserProfile): UserProfile => ({
  id: profile.id,
  fullName: profile.name,
  email: profile.email,
  phone: profile.phone,
  role: profile.role,
  kycStatus: profile.kycStatus,
  status: profile.status,
  createdAt: profile.createdAt,
})

export const userService = {
  getProfile: async (userId: number) => {
    const response = await apiClient.get<ApiResponse<BackendUserProfile>>('/api/users/profile', { headers: { 'X-User-Id': userId } })
    return {
      ...response,
      data: {
        ...response.data,
        data: mapUserProfile(response.data.data),
      },
    }
  },
  updateProfile: async (userId: number, payload: { name?: string; phone?: string }) => {
    const response = await apiClient.put<ApiResponse<BackendUserProfile>>('/api/users/profile', payload, { headers: { 'X-User-Id': userId } })
    return {
      ...response,
      data: {
        ...response.data,
        data: mapUserProfile(response.data.data),
      },
    }
  },
  searchRecipients: (userId: number, query: string) =>
    apiClient.get<ApiResponse<RecipientSearchItem[]>>(`/api/users/search?q=${encodeURIComponent(query)}`, {
      headers: { 'X-User-Id': userId },
    }),
}
