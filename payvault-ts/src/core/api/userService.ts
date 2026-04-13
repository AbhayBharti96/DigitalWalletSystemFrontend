import type { ApiResponse, UserProfile } from '../../types'
import { api } from './client'

export const userService = {
  getProfile: (userId: number) =>
    api.get<ApiResponse<UserProfile>>('/api/users/profile', { headers: { 'X-UserId': userId } }),
  updateProfile: (userId: number, payload: { name?: string; phone?: string }) =>
    api.put<ApiResponse<UserProfile>>('/api/users/profile', payload, { headers: { 'X-UserId': userId } }),
}
