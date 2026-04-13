import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/core/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  authApi: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '@/core/api/client'
import { adminService } from '@/core/api/adminService'

const mockedApi = vi.mocked(api)

describe('adminService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads dashboard and user listings with the admin role header', () => {
    adminService.dashboard('ADMIN')
    adminService.listUsers('ADMIN', { page: 1, size: 20 })
    adminService.getUser(12, 'ADMIN')
    adminService.searchUsers('john doe', 'ADMIN', 3)
    adminService.pendingKyc('ADMIN', 2)

    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/api/admin/dashboard', {
      headers: { 'X-UserRole': 'ADMIN' },
    })
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/api/admin/users', {
      headers: { 'X-UserRole': 'ADMIN' },
      params: { page: 1, size: 20 },
    })
    expect(mockedApi.get).toHaveBeenNthCalledWith(3, '/api/admin/users/12', {
      headers: { 'X-UserRole': 'ADMIN' },
    })
    expect(mockedApi.get).toHaveBeenNthCalledWith(
      4,
      '/api/admin/users/search?q=john%20doe&page=3',
      { headers: { 'X-UserRole': 'ADMIN' } },
    )
    expect(mockedApi.get).toHaveBeenNthCalledWith(
      5,
      '/api/admin/kyc/pending?page=2',
      { headers: { 'X-UserRole': 'ADMIN' } },
    )
  })

  it('issues admin mutation requests with the correct headers and payloads', () => {
    adminService.blockUser(12, 'ADMIN')
    adminService.unblockUser(12, 'ADMIN')
    adminService.changeRole(12, 'SUPPORT', 'ADMIN')
    adminService.approveKyc(99, 'ADMIN', 'admin@example.com')
    adminService.rejectKyc(99, 'Document mismatch', 'ADMIN', 'admin@example.com')
    adminService.addCatalogItem({ name: 'Coffee Voucher', pointsRequired: 500 }, 'ADMIN')
    adminService.updateCatalogItem(9, { stock: 12, active: true }, 'ADMIN')
    adminService.toggleCatalogItem(9, false, 'ADMIN')
    adminService.deleteCatalogItem(9, 'ADMIN')

    expect(mockedApi.patch).toHaveBeenNthCalledWith(
      1,
      '/api/admin/users/12/block',
      {},
      { headers: { 'X-UserRole': 'ADMIN' } },
    )
    expect(mockedApi.patch).toHaveBeenNthCalledWith(
      2,
      '/api/admin/users/12/unblock',
      {},
      { headers: { 'X-UserRole': 'ADMIN' } },
    )
    expect(mockedApi.patch).toHaveBeenNthCalledWith(
      3,
      '/api/admin/users/12/role?newRole=SUPPORT',
      {},
      { headers: { 'X-UserRole': 'ADMIN' } },
    )
    expect(mockedApi.post).toHaveBeenNthCalledWith(
      1,
      '/api/admin/kyc/99/approve',
      {},
      { headers: { 'X-UserRole': 'ADMIN', 'X-UserEmail': 'admin@example.com' } },
    )
    expect(mockedApi.post).toHaveBeenNthCalledWith(
      2,
      '/api/admin/kyc/99/reject?reason=Document%20mismatch',
      {},
      { headers: { 'X-UserRole': 'ADMIN', 'X-UserEmail': 'admin@example.com' } },
    )
    expect(mockedApi.post).toHaveBeenNthCalledWith(
      3,
      '/api/rewards/catalog/add',
      { name: 'Coffee Voucher', pointsRequired: 500 },
      { headers: { 'X-UserRole': 'ADMIN' } },
    )
    expect(mockedApi.patch).toHaveBeenNthCalledWith(
      4,
      '/api/rewards/catalog/9',
      { stock: 12, active: true },
      { headers: { 'X-UserRole': 'ADMIN' } },
    )
    expect(mockedApi.patch).toHaveBeenNthCalledWith(
      5,
      '/api/rewards/catalog/9/status?active=false',
      {},
      { headers: { 'X-UserRole': 'ADMIN' } },
    )
    expect(mockedApi.delete).toHaveBeenNthCalledWith(
      1,
      '/api/rewards/catalog/9',
      { headers: { 'X-UserRole': 'ADMIN' } },
    )
  })
})
