import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { RewardSummary, RewardItem, RewardTransaction } from '../types'
import { rewardsService } from '../core/api'
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

const uid = (s: RootState) => s.auth.user?.id ?? 0

export const fetchRewardSummary = createAsyncThunk('rewards/summary', async (_, { getState, rejectWithValue }) => {
  try {
    const { data } = await rewardsService.summary(uid(getState() as RootState))
    return unwrap<RewardSummary>(data) ?? null
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
    return unwrap<RewardTransaction[]>(data) || []
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
  reducers: { clearError(s) { s.error = null } },
  extraReducers: (b) => {
    b.addCase(fetchRewardSummary.pending, (s) => { s.loading = true })
    b.addCase(fetchRewardSummary.fulfilled, (s, { payload }) => { s.loading = false; s.summary = payload })
    b.addCase(fetchRewardSummary.rejected, (s, { payload }) => { s.loading = false; s.error = payload as string })
    b.addCase(fetchCatalog.fulfilled, (s, { payload }) => { s.catalog = payload })
    b.addCase(fetchRewardTransactions.fulfilled, (s, { payload }) => { s.transactions = payload })
  },
})
export const { clearError: clearRewardsError } = rewardsSlice.actions
export default rewardsSlice.reducer
