import type { ApiResponse, Redemption, RewardItem, RewardSummary, RewardTransaction } from '../types'
import { apiClient } from './http/client'

export const rewardsService = {
  summary: (userId: number) =>
    apiClient.get<ApiResponse<RewardSummary>>('/api/rewards/summary', { headers: { 'X-UserId': userId } }),
  catalog: () => apiClient.get<ApiResponse<RewardItem[]>>('/api/rewards/catalog'),
  transactions: (userId: number) =>
    apiClient.get<ApiResponse<RewardTransaction[]>>('/api/rewards/transactions', { headers: { 'X-UserId': userId } }),
  redeem: (userId: number, rewardId: number) =>
    apiClient.post<ApiResponse<Redemption>>('/api/rewards/redeem', { rewardId }, { headers: { 'X-UserId': userId } }),
  redeemPoints: (userId: number, points: number) =>
    apiClient.post<ApiResponse<void>>(`/api/rewards/redeem-points?points=${points}`, {}, {
      headers: { 'X-UserId': userId },
    }),
  earnInternal: (userId: number, amount: number) =>
    apiClient.post(`/api/rewards/internal/earn?userId=${userId}&amount=${amount}`),
}
