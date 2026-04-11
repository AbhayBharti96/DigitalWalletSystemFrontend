import { beforeEach, describe, expect, it } from 'vitest'
import './httpClientMock'
import { apiClientMock, resetHttpMocks } from './httpClientMock'
import { walletService } from '@/services/wallet.service'

describe('walletService', () => {
  beforeEach(() => {
    resetHttpMocks()
  })

  it('calls wallet read endpoints with X-User-Id headers', () => {
    walletService.balance(9)
    walletService.transactions(9, 2, 25)
    walletService.ledger(9, 1, 15)
    walletService.statement(9, '2026-04-01', '2026-04-10')
    walletService.downloadStatement(9, '2026-04-01', '2026-04-10')

    expect(apiClientMock.get).toHaveBeenNthCalledWith(1, '/api/wallet/balance', { headers: { 'X-User-Id': 9 } })
    expect(apiClientMock.get).toHaveBeenNthCalledWith(2, '/api/wallet/transactions?page=2&size=25', { headers: { 'X-User-Id': 9 } })
    expect(apiClientMock.get).toHaveBeenNthCalledWith(3, '/api/wallet/ledger?page=1&size=15', { headers: { 'X-User-Id': 9 } })
    expect(apiClientMock.get).toHaveBeenNthCalledWith(4, '/api/wallet/statement?from=2026-04-01&to=2026-04-10', { headers: { 'X-User-Id': 9 } })
    expect(apiClientMock.get).toHaveBeenNthCalledWith(5, '/api/wallet/statement/download?from=2026-04-01&to=2026-04-10', {
      headers: { 'X-User-Id': 9 },
      responseType: 'blob',
    })
  })

  it('calls wallet mutation endpoints with expected payloads', () => {
    walletService.transfer(9, { receiverId: 11, amount: 250, description: 'Test' })
    walletService.withdraw(9, 125)
    walletService.createOrder(9, 500)
    walletService.verifyPayment(9, { razorpay_order_id: 'order_1' })
    walletService.markPaymentFailed(9, { razorpay_order_id: 'order_1' }, 'Payment cancelled')
    walletService.cancelPayment(9, { razorpay_order_id: 'order_1' })

    expect(apiClientMock.post).toHaveBeenNthCalledWith(1, '/api/wallet/transfer', {
      receiverId: 11,
      amount: 250,
      description: 'Test',
    }, { headers: { 'X-User-Id': 9 } })
    expect(apiClientMock.post).toHaveBeenNthCalledWith(2, '/api/wallet/withdraw', { amount: 125 }, { headers: { 'X-User-Id': 9 } })
    expect(apiClientMock.post).toHaveBeenNthCalledWith(3, '/api/payment/create-order?amount=500', {}, { headers: { 'X-User-Id': 9 } })
    expect(apiClientMock.post).toHaveBeenNthCalledWith(4, '/api/payment/verify', { razorpay_order_id: 'order_1' }, { headers: { 'X-User-Id': 9 } })
    expect(apiClientMock.post).toHaveBeenNthCalledWith(5, '/api/payment/failed?reason=Payment%20cancelled', { razorpay_order_id: 'order_1' }, {
      headers: { 'X-User-Id': 9 },
    })
    expect(apiClientMock.post).toHaveBeenNthCalledWith(6, '/api/payment/cancel', { razorpay_order_id: 'order_1' }, {
      headers: { 'X-User-Id': 9 },
    })
  })
})
