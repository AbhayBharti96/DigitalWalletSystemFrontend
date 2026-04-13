import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/core/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
  authApi: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}))

import { api } from '@/core/api/client'
import { walletService } from '@/core/api/walletService'

const mockedApi = vi.mocked(api)

describe('walletService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests balance, transactions, and ledger with paging headers', () => {
    walletService.balance(10)
    walletService.transactions(10, 2, 25)
    walletService.ledger(10, 3, 15)

    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/api/wallet/balance', {
      headers: { 'X-UserId': 10 },
    })
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/api/wallet/transactions?page=2&size=25', {
      headers: { 'X-UserId': 10 },
    })
    expect(mockedApi.get).toHaveBeenNthCalledWith(3, '/api/wallet/ledger?page=3&size=15', {
      headers: { 'X-UserId': 10 },
    })
  })

  it('posts transfer and withdraw requests with the current user header', () => {
    const transferPayload = { receiverId: 99, amount: 500, description: 'Rent' }

    walletService.transfer(10, transferPayload)
    walletService.withdraw(10, 1200)

    expect(mockedApi.post).toHaveBeenNthCalledWith(1, '/api/wallet/transfer', transferPayload, {
      headers: { 'X-UserId': 10 },
    })
    expect(mockedApi.post).toHaveBeenNthCalledWith(2, '/api/wallet/withdraw', { amount: 1200 }, {
      headers: { 'X-UserId': 10 },
    })
  })

  it('uses payment and recipient endpoints with their expected params and headers', () => {
    const verifyPayload = {
      razorpay_order_id: 'order_1',
      razorpay_payment_id: 'pay_1',
      razorpay_signature: 'sig_1',
    }
    const failPayload = { razorpayOrderId: 'order_1', razorpayPaymentId: 'pay_1', reason: 'incorrect_otp' }

    walletService.searchRecipients(10, 'ali', 4)
    walletService.createOrder(10, 2500)
    walletService.verifyPayment(10, verifyPayload)
    walletService.failPayment(10, failPayload)

    expect(mockedApi.get).toHaveBeenCalledWith('/api/users/search/recipients', {
      headers: { 'X-User-Id': 10 },
      params: { q: 'ali', limit: 4 },
    })
    expect(mockedApi.post).toHaveBeenNthCalledWith(1, '/api/payment/create-order?amount=2500', {}, {
      headers: { 'X-User-Id': 10 },
    })
    expect(mockedApi.post).toHaveBeenNthCalledWith(2, '/api/payment/verify', verifyPayload, {
      headers: { 'X-User-Id': 10 },
    })
    expect(mockedApi.post).toHaveBeenNthCalledWith(3, '/api/payment/fail', failPayload, {
      headers: { 'X-User-Id': 10 },
    })
  })

  it('loads statement data and downloads statement blobs with date filters', () => {
    walletService.statement(10, '2026-01-01', '2026-01-31')
    walletService.downloadStatement(10, '2026-01-01', '2026-01-31')

    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/api/wallet/statement?from=2026-01-01&to=2026-01-31', {
      headers: { 'X-UserId': 10 },
    })
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/api/wallet/statement/download?from=2026-01-01&to=2026-01-31', {
      headers: { 'X-UserId': 10 },
      responseType: 'blob',
    })
  })
})
