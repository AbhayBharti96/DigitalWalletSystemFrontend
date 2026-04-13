import type { ApiResponse, Redemption, RewardItem, RewardSummary, RewardTransaction } from '../../types'
import { api } from './client'

export const rewardsService = {
  summary: (userId: number) =>
    api.get<ApiResponse<RewardSummary>>('/api/rewards/summary', { headers: { 'X-UserId': userId } }),
  catalog: () => api.get<ApiResponse<RewardItem[]>>('/api/rewards/catalog'),
  transactions: (userId: number) =>
    api.get<ApiResponse<RewardTransaction[]>>('/api/rewards/transactions', { headers: { 'X-UserId': userId } }),
  redeem: (userId: number, rewardId: number) =>
    api.post<ApiResponse<Redemption>>('/api/rewards/redeem', { rewardId }, { headers: { 'X-UserId': userId } }),
  redeemPoints: (userId: number, points: number) =>
    api.post<ApiResponse<void>>(`/api/rewards/redeem-points?points=${points}`, {}, {
      headers: { 'X-UserId': userId },
    }),
  earnInternal: (userId: number, amount: number) =>
    api.post(`/api/rewards/internal/earn?userId=${userId}&amount=${amount}`),
}
