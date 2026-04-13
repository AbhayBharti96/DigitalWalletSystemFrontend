import type {
  AdminDashboard,
  AdminUserResponse,
  ApiResponse,
  KycStatusResponse,
  PageResponse,
  RewardItem,
} from '../../types'
import { api } from './client'

export const adminService = {
  dashboard: (role: string) =>
    api.get<ApiResponse<AdminDashboard>>('/api/admin/dashboard', { headers: { 'X-UserRole': role } }),
  listUsers: (role: string, params?: Record<string, unknown>) =>
    api.get<ApiResponse<PageResponse<AdminUserResponse>>>('/api/admin/users', {
      headers: { 'X-UserRole': role },
      params,
    }),
  getUser: (userId: number, role: string) =>
    api.get<ApiResponse<AdminUserResponse>>(`/api/admin/users/${userId}`, { headers: { 'X-UserRole': role } }),
  blockUser: (userId: number, role: string) =>
    api.patch<ApiResponse<AdminUserResponse>>(`/api/admin/users/${userId}/block`, {}, { headers: { 'X-UserRole': role } }),
  unblockUser: (userId: number, role: string) =>
    api.patch<ApiResponse<AdminUserResponse>>(`/api/admin/users/${userId}/unblock`, {}, { headers: { 'X-UserRole': role } }),
  changeRole: (userId: number, newRole: string, role: string) =>
    api.patch(`/api/admin/users/${userId}/role?newRole=${newRole}`, {}, { headers: { 'X-UserRole': role } }),
  searchUsers: (query: string, role: string, page = 0) =>
    api.get<ApiResponse<PageResponse<AdminUserResponse>>>(`/api/admin/users/search?q=${encodeURIComponent(query)}&page=${page}`, {
      headers: { 'X-UserRole': role },
    }),
  pendingKyc: (role: string, page = 0) =>
    api.get<ApiResponse<PageResponse<KycStatusResponse>>>(`/api/admin/kyc/pending?page=${page}`, {
      headers: { 'X-UserRole': role },
    }),
  approveKyc: (kycId: number, role: string, email: string) =>
    api.post(`/api/admin/kyc/${kycId}/approve`, {}, { headers: { 'X-UserRole': role, 'X-UserEmail': email } }),
  rejectKyc: (kycId: number, reason: string, role: string, email: string) =>
    api.post(`/api/admin/kyc/${kycId}/reject?reason=${encodeURIComponent(reason)}`, {}, {
      headers: { 'X-UserRole': role, 'X-UserEmail': email },
    }),
  addCatalogItem: (payload: Partial<RewardItem>, role: string) =>
    api.post<ApiResponse<RewardItem>>('/api/rewards/catalog/add', payload, { headers: { 'X-UserRole': role } }),
  updateCatalogItem: (rewardId: number, payload: Partial<RewardItem>, role: string) =>
    api.patch<ApiResponse<RewardItem>>(`/api/rewards/catalog/${rewardId}`, payload, { headers: { 'X-UserRole': role } }),
  toggleCatalogItem: (rewardId: number, active: boolean, role: string) =>
    api.patch<ApiResponse<RewardItem>>(`/api/rewards/catalog/${rewardId}/status?active=${active}`, {}, {
      headers: { 'X-UserRole': role },
    }),
  deleteCatalogItem: (rewardId: number, role: string) =>
    api.delete<ApiResponse<void>>(`/api/rewards/catalog/${rewardId}`, { headers: { 'X-UserRole': role } }),
}
