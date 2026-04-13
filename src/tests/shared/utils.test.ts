import { describe, expect, it } from 'vitest'
import {
  buildWeeklySpendingSeries,
  calcPoints,
  clamp,
  formatCurrency,
  getKycInfo,
  getTierStyle,
  getTransferCounterparty,
  isCredit,
  isCreditForUser,
} from '@/shared/utils'
import type { Transaction } from '@/types'

describe('shared/utils', () => {
  it('formats INR currency in en-IN style', () => {
    const formatted = formatCurrency(33501)
    expect(formatted).toContain('₹')
    expect(formatted).toContain('33,501')
  })

  it('returns silver fallback style for unknown tier', () => {
    const style = getTierStyle('BRONZE')
    expect(style.text).toBe('#64748b')
    expect(style.border).toBe('#cbd5e1')
  })

  it('returns KYC fallback when status is missing', () => {
    const info = getKycInfo(undefined)
    expect(info.label).toBe('KYC Not Submitted')
    expect(info.color).toBe('#6366f1')
  })

  it('identifies credit transaction types', () => {
    expect(isCredit('TOPUP')).toBe(true)
    expect(isCredit('CASHBACK')).toBe(true)
    expect(isCredit('WITHDRAW')).toBe(false)
  })

  it('determines credit/debit correctly for transfer based on current user', () => {
    const incomingTransfer: Transaction = {
      id: 1,
      senderId: 3,
      receiverId: 9,
      amount: 200,
      status: 'SUCCESS',
      type: 'TRANSFER',
      createdAt: new Date().toISOString(),
    }
    const outgoingTransfer: Transaction = {
      ...incomingTransfer,
      id: 2,
      senderId: 9,
      receiverId: 3,
    }

    expect(isCreditForUser(incomingTransfer, 9)).toBe(true)
    expect(isCreditForUser(outgoingTransfer, 9)).toBe(false)
  })

  it('builds transfer counterparty labels', () => {
    const tx: Transaction = {
      id: 5,
      senderId: 10,
      receiverId: 20,
      amount: 100,
      status: 'SUCCESS',
      type: 'TRANSFER',
      createdAt: new Date().toISOString(),
    }
    expect(getTransferCounterparty(tx, 10)).toBe('To User #20')
    expect(getTransferCounterparty(tx, 20)).toBe('From User #10')
    expect(getTransferCounterparty(tx)).toBe('To User #20')
  })

  it('calculates points at 1 point per 100 amount', () => {
    expect(calcPoints(99)).toBe(0)
    expect(calcPoints(100)).toBe(1)
    expect(calcPoints(2550)).toBe(25)
  })

  it('clamps number within range', () => {
    expect(clamp(5, 1, 10)).toBe(5)
    expect(clamp(-1, 1, 10)).toBe(1)
    expect(clamp(22, 1, 10)).toBe(10)
  })

  it('builds weekly spending from successful outgoing transactions', () => {
    const transactions: Transaction[] = [
      {
        id: 1,
        senderId: 9,
        receiverId: 20,
        amount: 500,
        status: 'SUCCESS',
        type: 'TRANSFER',
        createdAt: '2026-04-13T09:00:00.000Z',
      },
      {
        id: 2,
        senderId: 3,
        receiverId: 9,
        amount: 700,
        status: 'SUCCESS',
        type: 'TRANSFER',
        createdAt: '2026-04-14T10:00:00.000Z',
      },
      {
        id: 3,
        amount: 200,
        status: 'FAILED',
        type: 'WITHDRAW',
        createdAt: '2026-04-15T10:00:00.000Z',
      },
      {
        id: 4,
        amount: 900,
        status: 'SUCCESS',
        type: 'WITHDRAW',
        createdAt: '2026-04-16T10:00:00.000Z',
      },
    ]

    expect(buildWeeklySpendingSeries(transactions, 9, new Date('2026-04-16T12:00:00.000Z'))).toEqual([
      { d: 'Mon', v: 500, credit: 0, debit: 500 },
      { d: 'Tue', v: 0, credit: 700, debit: 0 },
      { d: 'Wed', v: 0, credit: 0, debit: 0 },
      { d: 'Thu', v: 900, credit: 0, debit: 900 },
      { d: 'Fri', v: 0, credit: 0, debit: 0 },
      { d: 'Sat', v: 0, credit: 0, debit: 0 },
      { d: 'Sun', v: 0, credit: 0, debit: 0 },
    ])
  })
})
