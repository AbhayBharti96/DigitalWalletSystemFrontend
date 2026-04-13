import { beforeEach, describe, expect, it } from 'vitest'
import './httpClientMock'
import { apiClientMock, resetHttpMocks } from './httpClientMock'
import { adminService } from '@/services/admin.service'

describe('adminService', () => {
  beforeEach(() => {
    resetHttpMocks()
  })

  it('calls admin dashboard and user endpoints with admin role header', () => {
    adminService.dashboard('ADMIN')
    adminService.listUsers('ADMIN', { page: 1, size: 15 })
    adminService.getUser(22, 'ADMIN')
    adminService.blockUser(22, 'ADMIN')
    adminService.unblockUser(22, 'ADMIN')
    adminService.changeRole(22, 'MERCHANT', 'ADMIN')
    adminService.searchUsers('alice', 'ADMIN', 3)

    expect(apiClientMock.get).toHaveBeenNthCalledWith(1, '/api/admin/dashboard', { headers: { 'X-User-Role': 'ADMIN' } })
    expect(apiClientMock.get).toHaveBeenNthCalledWith(2, '/api/admin/users', {
      headers: { 'X-User-Role': 'ADMIN' },
      params: { page: 1, size: 15 },
    })
    expect(apiClientMock.get).toHaveBeenNthCalledWith(3, '/api/admin/users/22', { headers: { 'X-User-Role': 'ADMIN' } })
    expect(apiClientMock.patch).toHaveBeenNthCalledWith(1, '/api/admin/users/22/block', {}, { headers: { 'X-User-Role': 'ADMIN' } })
    expect(apiClientMock.patch).toHaveBeenNthCalledWith(2, '/api/admin/users/22/unblock', {}, { headers: { 'X-User-Role': 'ADMIN' } })
    expect(apiClientMock.patch).toHaveBeenNthCalledWith(3, '/api/admin/users/22/role?newRole=MERCHANT', {}, { headers: { 'X-User-Role': 'ADMIN' } })
    expect(apiClientMock.get).toHaveBeenNthCalledWith(4, '/api/admin/users/search?q=alice&page=3', { headers: { 'X-User-Role': 'ADMIN' } })
  })

  it('calls kyc moderation endpoints with role and email headers', () => {
    adminService.pendingKyc('ADMIN', 2)
    adminService.approveKyc(12, 'ADMIN', 'admin@example.com')
    adminService.rejectKyc(12, 'Missing document', 'ADMIN', 'admin@example.com')

    expect(apiClientMock.get).toHaveBeenCalledWith('/api/admin/kyc/pending?page=2', { headers: { 'X-User-Role': 'ADMIN' } })
    expect(apiClientMock.post).toHaveBeenNthCalledWith(1, '/api/admin/kyc/12/approve', {}, {
      headers: { 'X-User-Role': 'ADMIN', 'X-User-Email': 'admin@example.com' },
    })
    expect(apiClientMock.post).toHaveBeenNthCalledWith(2, '/api/admin/kyc/12/reject?reason=Missing%20document', {}, {
      headers: { 'X-User-Role': 'ADMIN', 'X-User-Email': 'admin@example.com' },
    })
  })

  it('calls catalog endpoints and falls back to patch when put is not supported', async () => {
    apiClientMock.put.mockRejectedValueOnce(new Error('405 method not allowed'))
    apiClientMock.patch.mockResolvedValueOnce({ data: { success: true } })

    adminService.addCatalogItem({ name: 'Item', pointsRequired: 100, type: 'COUPON', stock: 5, active: true }, 'ADMIN')
    await adminService.updateCatalogItem(9, { name: 'Item', pointsRequired: 100, type: 'COUPON', stock: 5, active: true }, 'ADMIN')
    adminService.deleteCatalogItem(9, 'ADMIN')

    expect(apiClientMock.post).toHaveBeenCalledWith('/api/rewards/admin/catalog/add', {
      name: 'Item',
      pointsRequired: 100,
      type: 'COUPON',
      stock: 5,
      active: true,
    }, { headers: { 'X-User-Role': 'ADMIN' } })
    expect(apiClientMock.put).toHaveBeenCalledWith('/api/rewards/admin/catalog/9', {
      name: 'Item',
      pointsRequired: 100,
      type: 'COUPON',
      stock: 5,
      active: true,
    }, { headers: { 'X-User-Role': 'ADMIN' } })
    expect(apiClientMock.patch).toHaveBeenCalledWith('/api/rewards/admin/catalog/9', {
      name: 'Item',
      pointsRequired: 100,
      type: 'COUPON',
      stock: 5,
      active: true,
    }, { headers: { 'X-User-Role': 'ADMIN' } })
    expect(apiClientMock.delete).toHaveBeenCalledWith('/api/rewards/admin/catalog/9', { headers: { 'X-User-Role': 'ADMIN' } })
  })
})
