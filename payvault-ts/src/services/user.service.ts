import type { ApiResponse, RecipientSearchItem, UserProfile } from '../types'
import { apiClient } from './http/client'

export const userService = {
  getProfile: (userId: number) =>
    apiClient.get<ApiResponse<UserProfile>>('/api/users/profile', { headers: { 'X-UserId': userId } }),
  updateProfile: (userId: number, payload: { name?: string; phone?: string }) =>
    apiClient.put<ApiResponse<UserProfile>>('/api/users/profile', payload, { headers: { 'X-UserId': userId } }),
  searchRecipients: (userId: number, query: string) =>
    apiClient.get<ApiResponse<RecipientSearchItem[]>>(`/api/users/search?q=${encodeURIComponent(query)}`, {
      headers: { 'X-UserId': userId },
    }),
}
