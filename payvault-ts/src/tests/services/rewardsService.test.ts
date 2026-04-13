import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/core/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
  authApi: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}))

import { api } from '@/core/api/client'
import { rewardsService } from '@/core/api/rewardsService'

const mockedApi = vi.mocked(api)

describe('rewardsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches summary, catalog, and transaction history from the expected endpoints', () => {
    rewardsService.summary(55)
    rewardsService.catalog()
    rewardsService.transactions(55)

    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/api/rewards/summary', {
      headers: { 'X-UserId': 55 },
    })
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/api/rewards/catalog')
    expect(mockedApi.get).toHaveBeenNthCalledWith(3, '/api/rewards/transactions', {
      headers: { 'X-UserId': 55 },
    })
  })

  it('posts redeem operations with the correct bodies and headers', () => {
    rewardsService.redeem(55, 101)
    rewardsService.redeemPoints(55, 2000)
    rewardsService.earnInternal(55, 75)

    expect(mockedApi.post).toHaveBeenNthCalledWith(1, '/api/rewards/redeem', { rewardId: 101 }, {
      headers: { 'X-UserId': 55 },
    })
    expect(mockedApi.post).toHaveBeenNthCalledWith(2, '/api/rewards/redeem-points?points=2000', {}, {
      headers: { 'X-UserId': 55 },
    })
    expect(mockedApi.post).toHaveBeenNthCalledWith(3, '/api/rewards/internal/earn?userId=55&amount=75')
  })
})
