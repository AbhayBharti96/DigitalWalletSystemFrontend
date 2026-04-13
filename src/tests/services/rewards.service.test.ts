import { beforeEach, describe, expect, it } from 'vitest'
import './httpClientMock'
import { apiClientMock, resetHttpMocks } from './httpClientMock'
import { rewardsService } from '@/services/rewards.service'

describe('rewardsService', () => {
  beforeEach(() => {
    resetHttpMocks()
  })

  it('calls summary, catalog and transactions endpoints', () => {
    rewardsService.summary(8)
    rewardsService.catalog()
    rewardsService.transactions(8)

    expect(apiClientMock.get).toHaveBeenNthCalledWith(1, '/api/rewards/summary', { headers: { 'X-User-Id': 8 } })
    expect(apiClientMock.get).toHaveBeenNthCalledWith(2, '/api/rewards/catalog')
    expect(apiClientMock.get).toHaveBeenNthCalledWith(3, '/api/rewards/transactions', { headers: { 'X-User-Id': 8 } })
  })

  it('calls redeem endpoints with expected payloads', () => {
    rewardsService.redeem(8, 44)
    rewardsService.redeemPoints(8, 150)
    rewardsService.earnInternal(8, 500)

    expect(apiClientMock.post).toHaveBeenNthCalledWith(1, '/api/rewards/redeem', { rewardId: 44 }, { headers: { 'X-User-Id': 8 } })
    expect(apiClientMock.post).toHaveBeenNthCalledWith(2, '/api/rewards/redeem-points?points=150', {}, {
      headers: { 'X-User-Id': 8 },
    })
    expect(apiClientMock.post).toHaveBeenNthCalledWith(3, '/api/rewards/internal/earn?userId=8&amount=500')
  })
})
