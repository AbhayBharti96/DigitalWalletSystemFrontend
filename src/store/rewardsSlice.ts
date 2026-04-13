import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { RewardSummary, RewardItem, RewardTransaction } from '../types'
import { rewardsService } from '../services'
import { getApiErrorMessage } from '../shared/apiErrors'
import type { RootState } from './store'

interface RewardsState {
  summary: RewardSummary | null; catalog: RewardItem[]
  transactions: RewardTransaction[]; loading: boolean; error: string | null
}

type ApiLike<T> = { data?: T } | T

const unwrap = <T>(payload: ApiLike<T> | undefined): T | undefined => {
  if (!payload) return undefined
  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    return (payload as { data?: T }).data
  }
  return payload as T
}

const normalizeRewardTransactions = (payload: unknown): RewardTransaction[] => {
  if (!payload || typeof payload !== 'object') return []
  const p = payload as {
    data?: unknown
    content?: unknown
  }

  if (Array.isArray(payload)) return payload as RewardTransaction[]
  if (Array.isArray(p.data)) return p.data as RewardTransaction[]
  if (p.data && typeof p.data === 'object' && Array.isArray((p.data as { content?: unknown }).content)) {
    return (p.data as { content: RewardTransaction[] }).content
  }
  if (Array.isArray(p.content)) return p.content as RewardTransaction[]
  return []
}

const uid = (s: RootState) => s.auth.user?.id ?? 0
const TIER_RANK: Record<RewardSummary['tier'], number> = { SILVER: 1, GOLD: 2, PLATINUM: 3 }
const tierRank = (tier?: RewardSummary['tier']) => (tier ? TIER_RANK[tier] : 0)
const maxTierStorageKey = (userId: number) => `payvault:max-reward-tier:${userId}`

const readMaxTier = (userId: number): RewardSummary['tier'] | undefined => {
  if (typeof globalThis.window === 'undefined') return undefined
  const v = localStorage.getItem(maxTierStorageKey(userId))
  if (v === 'SILVER' || v === 'GOLD' || v === 'PLATINUM') return v
  return undefined
}

const writeMaxTier = (userId: number, tier: RewardSummary['tier']): void => {
  if (typeof globalThis.window === 'undefined') return
  localStorage.setItem(maxTierStorageKey(userId), tier)
}

const mergeSummaryWithoutTierDowngrade = (
  prev: RewardSummary | null,
  incoming: RewardSummary | null
): RewardSummary | null => {
  if (!incoming) return prev
  if (!prev) return incoming

  if (tierRank(prev.tier) > tierRank(incoming.tier)) {
    return {
      ...incoming,
      tier: prev.tier,
      // If API regresses tier, its nextTier/progress usually refers to the lower tier path.
      // Hide progress instead of showing inconsistent numbers.
      nextTier: undefined,
      pointsToNextTier: undefined,
    }
  }
  return incoming
}

export const fetchRewardSummary = createAsyncThunk('rewards/summary', async (_, { getState, rejectWithValue }) => {
  try {
    const { data } = await rewardsService.summary(uid(getState() as RootState))
    const summary = unwrap<RewardSummary>(data) ?? null
    if (!summary) return null

    const storedTier = readMaxTier(summary.userId)
    const effectiveTier = tierRank(storedTier) > tierRank(summary.tier) ? storedTier! : summary.tier
    writeMaxTier(summary.userId, effectiveTier)

    if (effectiveTier !== summary.tier) {
      return {
        ...summary,
        tier: effectiveTier,
        nextTier: undefined,
        pointsToNextTier: undefined,
      }
    }
    return summary
  }
  catch (e: unknown) { return rejectWithValue(getApiErrorMessage(e, 'Could not load rewards')) }
})
export const fetchCatalog = createAsyncThunk('rewards/catalog', async (_, { rejectWithValue }) => {
  try {
    const { data } = await rewardsService.catalog()
    return unwrap<RewardItem[]>(data) || []
  }
  catch (e: unknown) { return rejectWithValue(getApiErrorMessage(e, 'Could not load catalog')) }
})
export const fetchRewardTransactions = createAsyncThunk('rewards/transactions', async (_, { getState, rejectWithValue }) => {
  try {
    const { data } = await rewardsService.transactions(uid(getState() as RootState))
    return normalizeRewardTransactions(data)
  }
  catch (e: unknown) { return rejectWithValue(getApiErrorMessage(e, 'Could not load reward history')) }
})
export const redeemReward = createAsyncThunk('rewards/redeem', async (rewardId: number, { getState, rejectWithValue }) => {
  try { const { data } = await rewardsService.redeem(uid(getState() as RootState), rewardId); return data }
  catch (e: unknown) { return rejectWithValue(getApiErrorMessage(e, 'Redemption failed')) }
})
export const redeemPointsThunk = createAsyncThunk('rewards/redeemPoints', async (points: number, { getState, rejectWithValue }) => {
  try { const { data } = await rewardsService.redeemPoints(uid(getState() as RootState), points); return data }
  catch (e: unknown) { return rejectWithValue(getApiErrorMessage(e, 'Redemption failed')) }
})

const rewardsSlice = createSlice({
  name: 'rewards',
  initialState: { summary: null, catalog: [], transactions: [], loading: false, error: null } as RewardsState,
  reducers: {
    clearError(s) { s.error = null },
    resetRewardsState(s) {
      s.summary = null
      s.catalog = []
      s.transactions = []
      s.loading = false
      s.error = null
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchRewardSummary.pending, (s) => { s.loading = true })
    b.addCase(fetchRewardSummary.fulfilled, (s, { payload }) => {
      s.loading = false
      s.summary = mergeSummaryWithoutTierDowngrade(s.summary, payload)
    })
    b.addCase(fetchRewardSummary.rejected, (s, { payload }) => { s.loading = false; s.error = payload as string })
    b.addCase(fetchCatalog.fulfilled, (s, { payload }) => { s.catalog = payload })
    b.addCase(fetchRewardTransactions.fulfilled, (s, { payload }) => { s.transactions = payload })
  },
})
export const { clearError: clearRewardsError, resetRewardsState } = rewardsSlice.actions
export default rewardsSlice.reducer
