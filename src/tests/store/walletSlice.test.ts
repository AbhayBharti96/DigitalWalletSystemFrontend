import { describe, expect, it } from 'vitest'
import walletReducer, { fetchBalance, fetchTransactions } from '@/store/walletSlice'
import type { WalletBalance } from '@/types'

describe('walletSlice reducer', () => {
  it('sets loading true while fetchBalance is pending', () => {
    const state = walletReducer(undefined, fetchBalance.pending('req-1', undefined))
    expect(state.loading).toBe(true)
  })

  it('stores balance data on fetchBalance fulfilled', () => {
    const payload: WalletBalance = {
      userId: 1,
      balance: 33501,
      status: 'ACTIVE',
      lastUpdated: new Date().toISOString(),
    }

    const state = walletReducer(undefined, fetchBalance.fulfilled(payload, 'req-2', undefined))
    expect(state.loading).toBe(false)
    expect(state.balance?.balance).toBe(33501)
    expect(state.balance?.status).toBe('ACTIVE')
  })

  it('handles transaction loading lifecycle', () => {
    const pending = walletReducer(undefined, fetchTransactions.pending('req-3', { page: 0, size: 10 }))
    expect(pending.txLoading).toBe(true)

    const fulfilled = walletReducer(
      pending,
      fetchTransactions.fulfilled(
        {
          content: [],
          totalPages: 0,
          totalElements: 0,
          number: 0,
          size: 10,
          first: true,
          last: true,
        },
        'req-4',
        { page: 0, size: 10 }
      )
    )
    expect(fulfilled.txLoading).toBe(false)
    expect(fulfilled.transactions?.content).toHaveLength(0)
  })
})
