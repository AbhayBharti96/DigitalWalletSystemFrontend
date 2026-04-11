import type { AdminCatalogItemPayload, AdminDashboard, AdminUserResponse, ApiResponse, KycStatusResponse, RewardItem, PageResponse } from '../types'
import { apiClient } from './http/client'
import { getApiErrorMessage } from '../shared/apiErrors'

export const adminService = {
  dashboard: (role: string) =>
    apiClient.get<ApiResponse<AdminDashboard>>('/api/admin/dashboard', { headers: { 'X-UserRole': role } }),
  listUsers: (role: string, params?: Record<string, unknown>) =>
    apiClient.get<ApiResponse<PageResponse<AdminUserResponse>>>('/api/admin/users', {
      headers: { 'X-UserRole': role },
      params,
    }),
  getUser: (userId: number, role: string) =>
    apiClient.get<ApiResponse<AdminUserResponse>>(`/api/admin/users/${userId}`, { headers: { 'X-UserRole': role } }),
  blockUser: (userId: number, role: string) =>
    apiClient.patch<ApiResponse<AdminUserResponse>>(`/api/admin/users/${userId}/block`, {}, { headers: { 'X-UserRole': role } }),
  unblockUser: (userId: number, role: string) =>
    apiClient.patch<ApiResponse<AdminUserResponse>>(`/api/admin/users/${userId}/unblock`, {}, { headers: { 'X-UserRole': role } }),
  changeRole: (userId: number, newRole: string, role: string) =>
    apiClient.patch(`/api/admin/users/${userId}/role?newRole=${newRole}`, {}, { headers: { 'X-UserRole': role } }),
  searchUsers: (query: string, role: string, page = 0) =>
    apiClient.get<ApiResponse<PageResponse<AdminUserResponse>>>(`/api/admin/users/search?q=${encodeURIComponent(query)}&page=${page}`, {
      headers: { 'X-UserRole': role },
    }),
  pendingKyc: (role: string, page = 0) =>
    apiClient.get<ApiResponse<PageResponse<KycStatusResponse>>>(`/api/admin/kyc/pending?page=${page}`, {
      headers: { 'X-UserRole': role },
    }),
  approveKyc: (kycId: number, role: string, email: string) =>
    apiClient.post(`/api/admin/kyc/${kycId}/approve`, {}, { headers: { 'X-UserRole': role, 'X-UserEmail': email } }),
  rejectKyc: (kycId: number, reason: string, role: string, email: string, resubmitUrl?: string) =>
    apiClient.post(`/api/admin/kyc/${kycId}/reject?reason=${encodeURIComponent(reason)}`, {}, {
      headers: {
        'X-UserRole': role,
        'X-UserEmail': email,
        ...(resubmitUrl ? { 'X-Kyc-Resubmit-Url': resubmitUrl } : {}),
      },
    }),
  addCatalogItem: (payload: AdminCatalogItemPayload, role: string) =>
    apiClient.post<ApiResponse<RewardItem>>('/api/rewards/admin/catalog/add', payload, { headers: { 'X-UserRole': role } }),
  updateCatalogItem: async (catalogId: number, payload: AdminCatalogItemPayload, role: string) => {
    try {
      return await apiClient.put<ApiResponse<RewardItem>>(`/api/rewards/admin/catalog/${catalogId}`, payload, { headers: { 'X-UserRole': role } })
    } catch (error) {
      const message = getApiErrorMessage(error, 'Could not update catalog item').toLowerCase()
      if (message.includes('405') || message.includes('method not allowed') || message.includes('not supported')) {
        return apiClient.patch<ApiResponse<RewardItem>>(`/api/rewards/admin/catalog/${catalogId}`, payload, { headers: { 'X-UserRole': role } })
      }
      throw error
    }
  },
  deleteCatalogItem: (catalogId: number, role: string) =>
    apiClient.delete<ApiResponse<void>>(`/api/rewards/admin/catalog/${catalogId}`, { headers: { 'X-UserRole': role } }),
}
