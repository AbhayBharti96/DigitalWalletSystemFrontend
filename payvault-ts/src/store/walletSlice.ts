import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { WalletBalance, Transaction, LedgerEntry, PageResponse, TransferRequest } from '../types'
import { walletService } from '../services'
import { getApiErrorMessage } from '../shared/apiErrors'
import type { RootState } from './store'

interface WalletState {
  balance: WalletBalance | null
  transactions: PageResponse<Transaction> | null
  ledger: PageResponse<LedgerEntry> | null
  loading: boolean; txLoading: boolean; error: string | null
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

export const fetchBalance = createAsyncThunk('wallet/balance', async (_, { getState, rejectWithValue }) => {
  try { const { data } = await walletService.balance(uid(getState() as RootState)); return data.data }
  catch (e: unknown) { return rejectWithValue(getApiErrorMessage(e, 'Could not load balance')) }
})

export const fetchTransactions = createAsyncThunk('wallet/transactions',
  async ({ page = 0, size = 10 }: { page?: number; size?: number } = {}, { getState, rejectWithValue }) => {
    try { const { data } = await walletService.transactions(uid(getState() as RootState), page, size); return data }
    catch (e: unknown) { return rejectWithValue(getApiErrorMessage(e, 'Could not load transactions')) }
  })

export const fetchLedger = createAsyncThunk('wallet/ledger',
  async ({ page = 0, size = 20 }: { page?: number; size?: number } = {}, { getState, rejectWithValue }) => {
    try { const { data } = await walletService.ledger(uid(getState() as RootState), page, size); return data }
    catch (e: unknown) { return rejectWithValue(getApiErrorMessage(e, 'Could not load ledger')) }
  })

export const transferFunds = createAsyncThunk('wallet/transfer', async (payload: TransferRequest, { getState, rejectWithValue }) => {
  try { const { data } = await walletService.transfer(uid(getState() as RootState), payload); return data }
  catch (e: unknown) { return rejectWithValue(getApiErrorMessage(e, 'Transfer failed')) }
})

export const withdrawFunds = createAsyncThunk('wallet/withdraw', async (amount: number, { getState, rejectWithValue }) => {
  try { const { data } = await walletService.withdraw(uid(getState() as RootState), amount); return data }
  catch (e: unknown) { return rejectWithValue(getApiErrorMessage(e, 'Withdrawal failed')) }
})

export const createPaymentOrder = createAsyncThunk('payment/create-order', async (amount: number, { getState, rejectWithValue }) => {
  try {
    const { data } = await walletService.createOrder(uid(getState() as RootState), amount)
    const order = unwrap(data)
    if (!order) {
      return rejectWithValue('Order creation failed')
    }
    return order
  }
  catch (e: unknown) { return rejectWithValue(getApiErrorMessage(e, 'Order creation failed')) }
})

const walletSlice = createSlice({
  name: 'wallet',
  initialState: { balance: null, transactions: null, ledger: null, loading: false, txLoading: false, error: null } as WalletState,
  reducers: {
    clearError(s) { s.error = null },
    resetWalletState(s) {
      s.balance = null
      s.transactions = null
      s.ledger = null
      s.loading = false
      s.txLoading = false
      s.error = null
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchBalance.pending, (s) => { s.loading = true })
    b.addCase(fetchBalance.fulfilled, (s, { payload }) => { s.loading = false; s.balance = payload })
    b.addCase(fetchBalance.rejected, (s, { payload }) => { s.loading = false; s.error = payload as string })
    b.addCase(fetchTransactions.pending, (s) => { s.txLoading = true })
    b.addCase(fetchTransactions.fulfilled, (s, { payload }) => { s.txLoading = false; s.transactions = payload })
    b.addCase(fetchTransactions.rejected, (s, { payload }) => { s.txLoading = false; s.error = payload as string })
    b.addCase(fetchLedger.fulfilled, (s, { payload }) => { s.ledger = payload })
  },
})
export const { clearError: clearWalletError, resetWalletState } = walletSlice.actions
export default walletSlice.reducer
