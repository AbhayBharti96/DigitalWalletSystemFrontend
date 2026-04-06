import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { KycStatus, RewardTier, Transaction, TxType } from '../types'
import type { ComponentType } from 'react'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import CheckCircle from '@mui/icons-material/CheckCircle'
import HourglassEmpty from '@mui/icons-material/HourglassEmpty'
import Cancel from '@mui/icons-material/Cancel'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import HelpOutline from '@mui/icons-material/HelpOutline'
import StarBorder from '@mui/icons-material/StarBorder'
import Star from '@mui/icons-material/Star'
import Diamond from '@mui/icons-material/Diamond'
import WorkspacePremium from '@mui/icons-material/WorkspacePremium'
import TrendingUp from '@mui/icons-material/TrendingUp'
import SwapHoriz from '@mui/icons-material/SwapHoriz'
import TrendingDown from '@mui/icons-material/TrendingDown'
import AccountBalanceWallet from '@mui/icons-material/AccountBalanceWallet'
import CardGiftcard from '@mui/icons-material/CardGiftcard'
import CreditCard from '@mui/icons-material/CreditCard'
dayjs.extend(relativeTime)

export type PayVaultIcon = ComponentType<SvgIconProps>

export const formatCurrency = (amount: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount || 0)

export const formatDate = (date?: string | null, fmt = 'DD MMM YYYY, hh:mm A') =>
  date ? dayjs(date).format(fmt) : '—'

export const timeAgo = (date?: string) => date ? dayjs(date).fromNow() : '—'

export const getTierStyle = (tier?: RewardTier | string) => ({
  SILVER: { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1', glow: 'none' },
  GOLD: { bg: '#fef9c3', text: '#a16207', border: '#fbbf24', glow: '0 0 12px rgba(251,191,36,0.4)' },
  PLATINUM: { bg: '#ede9fe', text: '#7c3aed', border: '#a78bfa', glow: '0 0 12px rgba(167,139,250,0.4)' },
}[tier as RewardTier] || { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1', glow: 'none' })

const TIER_ICONS: Partial<Record<RewardTier, PayVaultIcon>> = {
  SILVER: StarBorder,
  GOLD: Star,
  PLATINUM: Diamond,
}
const DEFAULT_TIER_ICON: PayVaultIcon = WorkspacePremium

export const getTierIcon = (tier?: string): PayVaultIcon =>
  (tier ? TIER_ICONS[tier as RewardTier] ?? DEFAULT_TIER_ICON : DEFAULT_TIER_ICON)

export const getKycInfo = (status?: KycStatus) => ({
  APPROVED: { label: 'KYC Verified', color: '#22c55e', bg: '#dcfce7', icon: CheckCircle },
  PENDING: { label: 'KYC Under Review', color: '#f59e0b', bg: '#fef3c7', icon: HourglassEmpty },
  REJECTED: { label: 'KYC Rejected', color: '#ef4444', bg: '#fee2e2', icon: Cancel },
  NOT_SUBMITTED: { label: 'KYC Not Submitted', color: '#6366f1', bg: '#ede9fe', icon: DescriptionOutlined },
}[status ?? 'NOT_SUBMITTED'] || { label: 'Unknown', color: '#94a3b8', bg: '#f1f5f9', icon: HelpOutline })

const TX_ICONS: Partial<Record<TxType, PayVaultIcon>> = {
  TOPUP: TrendingUp,
  TRANSFER: SwapHoriz,
  WITHDRAW: TrendingDown,
  CASHBACK: AccountBalanceWallet,
  REDEEM: CardGiftcard,
}
const DEFAULT_TX_ICON: PayVaultIcon = CreditCard

export const getTxIcon = (type?: TxType): PayVaultIcon => (type ? TX_ICONS[type] ?? DEFAULT_TX_ICON : DEFAULT_TX_ICON)

export const isCredit = (type: TxType) => type === 'TOPUP' || type === 'CASHBACK'

export const isCreditForUser = (tx: Transaction, currentUserId?: number) => {
  if (tx.type === 'TRANSFER' && currentUserId != null) {
    if (tx.receiverId === currentUserId) return true
    if (tx.senderId === currentUserId) return false
  }
  return isCredit(tx.type)
}

export const getTransferCounterparty = (tx: Transaction, currentUserId?: number): string | null => {
  if (tx.type !== 'TRANSFER') return null

  if (currentUserId != null && tx.senderId === currentUserId && tx.receiverId != null) {
    return `To User #${tx.receiverId}`
  }

  if (currentUserId != null && tx.receiverId === currentUserId && tx.senderId != null) {
    return `From User #${tx.senderId}`
  }

  if (tx.receiverId != null) return `To User #${tx.receiverId}`
  if (tx.senderId != null) return `From User #${tx.senderId}`
  return null
}

export const generateKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

/** Points earned: 1 point per ₹100 topped up */
export const calcPoints = (amount: number) => Math.floor(amount / 100)

export const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max)
