import { describe, expect, it } from 'vitest'
import {
  calcPoints,
  clamp,
  formatCurrency,
  generateKey,
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

  it('generates a timestamp-prefixed key with a random token', () => {
    const key = generateKey()

    expect(key).toMatch(/^\d+-[a-z0-9]+$/)
  })
})
