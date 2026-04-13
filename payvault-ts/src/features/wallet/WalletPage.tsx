import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAppDispatch, useAppSelector, useDebounce, useNotify } from '../../shared/hooks'
import { fetchBalance, fetchTransactions, transferFunds, withdrawFunds, createPaymentOrder } from '../../store/walletSlice'
import { fetchRewardSummary } from '../../store/rewardsSlice'
import { rewardsService } from '../../core/api/rewardsService'
import { walletService } from '../../core/api/walletService'
import { Modal, ConfirmDialog, SuccessOverlay, Skeleton, EmptyState } from '../../shared/components/ui'
import { ScratchCardModal } from '../../shared/components/ScratchCard'
import { formatCurrency, formatDate, getTransferCounterparty, getTxIcon, isCreditForUser, generateKey, calcPoints } from '../../shared/utils'
import { StatusBadge } from '../../shared/components/ui'
import type {
  RazorpayFailureResponse,
  TransferRecipientResponse,
  TransferRequest,
  RazorpayOptions,
} from '../../types'
import { Icon8 } from '../../shared/components/Icon8'

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000]
const TOPUP_METHODS = [
  { id: 'wallet', label: 'Wallet', description: 'Open wallet payment options directly' },
  { id: 'upi', label: 'UPI', description: 'Focus checkout on UPI apps and IDs' },
  { id: 'card', label: 'Card', description: 'Pay using credit or debit cards' },
  { id: 'netbanking', label: 'Netbanking', description: 'Show bank transfer options only' },
] as const

type TopupMethod = typeof TOPUP_METHODS[number]['id']

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js'
let razorpayScriptPromise: Promise<void> | null = null

const getRecipientId = (recipient: TransferRecipientResponse) => recipient.userId ?? recipient.id ?? null
const getRecipientName = (recipient: TransferRecipientResponse) => recipient.fullName || recipient.name || 'Unknown user'
const getRecipientMeta = (recipient: TransferRecipientResponse) => recipient.email || recipient.phone || null
const getFailureReason = (failure?: RazorpayFailureResponse, fallback = 'Payment cancelled') =>
  failure?.error?.description || failure?.error?.reason || fallback

function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.Razorpay) return Promise.resolve()

  if (razorpayScriptPromise) return razorpayScriptPromise

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-razorpay="true"]`)
    if (existing) {
      // If a script tag exists, assume it's either loading or loaded.
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay script')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = RAZORPAY_SCRIPT_URL
    script.defer = true
    script.dataset.razorpay = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay script'))
    document.body.appendChild(script)
  })

  return razorpayScriptPromise
}

export default function WalletPage() {
  const dispatch     = useAppDispatch()
  const navigate     = useNavigate()
  const notify       = useNotify()
  const { user }     = useAppSelector(s => s.auth)
  const { balance, transactions, loading, txLoading } = useAppSelector(s => s.wallet)
  const latestActivityAt = balance?.lastUpdated || transactions?.content?.[0]?.createdAt

  // Modal state
  const [modal, setModal]           = useState<null | 'topup' | 'transfer' | 'withdraw'>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Success overlay
  const [successLabel, setSuccessLabel] = useState('')
  const [successAmount, setSuccessAmount] = useState(0)
  const [showSuccess, setShowSuccess]   = useState(false)

  // Scratch card
  const [scratchOpen, setScratchOpen]     = useState(false)
  const [scratchPoints, setScratchPoints] = useState(0)
  const [scratchAmount, setScratchAmount] = useState(0)

  // Form values
  const [topupAmount, setTopupAmount]       = useState('')
  const [topupMethod, setTopupMethod]       = useState<TopupMethod>('wallet')
  const [transfer, setTransfer]             = useState<{ receiverId: string; amount: string; description: string }>
    ({ receiverId: '', amount: '', description: '' })
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [recipientQuery, setRecipientQuery] = useState('')
  const [recipientResults, setRecipientResults] = useState<TransferRecipientResponse[]>([])
  const [recipientLoading, setRecipientLoading] = useState(false)
  const [recipientError, setRecipientError] = useState('')
  const [selectedRecipient, setSelectedRecipient] = useState<TransferRecipientResponse | null>(null)
  const debouncedRecipientQuery = useDebounce(recipientQuery.trim(), 400)

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchBalance())
      dispatch(fetchTransactions({ page: 0, size: 6 }))
      dispatch(fetchRewardSummary())
    }
  }, [dispatch, user?.id])

  useEffect(() => {
    if (modal !== 'transfer') {
      setRecipientResults([])
      setRecipientLoading(false)
      setRecipientError('')
      return
    }

    if (!user?.id) return

    if (debouncedRecipientQuery.length < 2) {
      setRecipientResults([])
      setRecipientLoading(false)
      setRecipientError('')
      return
    }

    let cancelled = false
    setRecipientLoading(true)
    setRecipientError('')

    walletService.searchRecipients(user.id, debouncedRecipientQuery, 10)
      .then(({ data }) => {
        if (cancelled) return
        setRecipientResults(data.data ?? [])
      })
      .catch(() => {
        if (cancelled) return
        setRecipientResults([])
        setRecipientError('Could not load recipients')
      })
      .finally(() => {
        if (!cancelled) setRecipientLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedRecipientQuery, modal, user?.id])

  const triggerSuccess = (label: string, amount: number) => {
    setSuccessLabel(label); setSuccessAmount(amount); setShowSuccess(true)
    dispatch(fetchBalance()); dispatch(fetchTransactions({ page: 0, size: 6 }))
    setTimeout(() => setShowSuccess(false), 2400)
  }

  const resetTransferForm = () => {
    setTransfer({ receiverId: '', amount: '', description: '' })
    setRecipientQuery('')
    setRecipientResults([])
    setRecipientError('')
    setSelectedRecipient(null)
  }

  const closeTransferModal = () => {
    setModal(null)
    resetTransferForm()
  }

  const markTopupFailed = async (orderId: string, reason: string, paymentId?: string) => {
    if (!user?.id) return
    try {
      await walletService.failPayment(user.id, {
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        reason,
      })
    } catch (_) {
      // Best effort. The local UX should not break if failure marking fails.
    }
  }

  const getRazorpayConfig = (method: TopupMethod): RazorpayOptions['config'] | undefined => {
    return {
      display: {
        blocks: {
          preferred: {
            name: `Pay using ${method === 'upi' ? 'UPI' : method === 'card' ? 'Card' : method === 'netbanking' ? 'Netbanking' : 'Wallet'}`,
            instruments: [{ method }],
          },
        },
        sequence: ['block.preferred'],
        preferences: { show_default_blocks: false },
      },
    }
  }

  // ── Razorpay Top-Up ────────────────────────────────────────────────────────
 const handleTopup = async () => {
  if (actionLoading) return

  const amount = Number(topupAmount)
  if (isNaN(amount) || amount < 1) {
    toast.error('Enter a valid amount')
    return
  }

  if (!user) {
    toast.error('User not logged in')
    return
  }

  setActionLoading(true)

  try {
    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID?.trim()
    if (!keyId) {
      toast.error('Payment is not configured. Set VITE_RAZORPAY_KEY_ID in your environment.')
      setActionLoading(false)
      return
    }

    // Load Razorpay only when the user starts a top-up (keeps initial page render lighter).
    await loadRazorpayScript()

    const orderData = await dispatch(createPaymentOrder(amount))

    if (!createPaymentOrder.fulfilled.match(orderData)) {
      throw new Error('Order creation failed')
    }

    const order = orderData.payload
    const orderId = order.orderId ?? order.id

    const options: RazorpayOptions = {
      key: keyId,
      amount: order.amount, // must be in paise from backend
      currency: order.currency || 'INR',
      order_id: orderId,
      name: 'PayVault',
      description: 'Wallet Top-up',
      config: getRazorpayConfig(topupMethod),
      theme: { color: '#22c55e' },

      prefill: {
        name: user.fullName,
        email: user.email,
      },

      modal: {
        ondismiss: async () => {
          await markTopupFailed(orderId, 'Payment cancelled by user')
          toast('Top-up cancelled', { icon: 'i' })
          setActionLoading(false)
        },
      },

      handler: async (response) => {
        try {
          // matching backend keys (camelCase)
          await walletService.verifyPayment(user.id, {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })

          // only after verification success
          setModal(null)
          triggerSuccess('Top-up', amount)

          notify(
            'success',
            'Top-up Successful!',
            `${formatCurrency(amount)} added to your wallet`
          )

          toast.success(`Wallet topped up with ${formatCurrency(amount)}`)
          setTopupAmount('')
          setTopupMethod('wallet')

        } catch (err) {
          // do not ignore this failure path
          await markTopupFailed(orderId, 'Payment cancelled', response.razorpay_payment_id)
          toast.error('Payment verification failed')
        } finally {
          setActionLoading(false)
        }
      },
    }

    // Ensure Razorpay is loaded
    if (!window.Razorpay) {
      toast.error('Payment gateway not loaded. Please refresh.')
      setActionLoading(false)
      return
    }

    const rzp = new window.Razorpay(options)

    rzp.on('payment.failed', async (failure) => {
      await markTopupFailed(
        failure?.error?.metadata?.order_id || orderId,
        'Payment cancelled',
        failure?.error?.metadata?.payment_id,
      )
      toast.error(getFailureReason(failure))
      setActionLoading(false)
    })

    rzp.open()

  } catch (err: any) {
    toast.error(err.message || 'Top-up failed')
    setActionLoading(false)
  }
}

  // ── Scratch card claimed ────────────────────────────────────────────────────
  const handleScratchRevealed = async (pts: number) => {
    // Call internal earn endpoint
    try {
      await rewardsService.earnInternal(user!.id, scratchAmount)
    } catch (_) { /* best effort */ }
    dispatch(fetchRewardSummary())
    notify('success', `+${pts} Points Added!`, `Reward points for your transfer of ${formatCurrency(scratchAmount)}`)
    toast.success(`${pts} reward points added to your account!`)
  }

  // ── Transfer ───────────────────────────────────────────────────────────────
  const handleTransferConfirm = async () => {
    setActionLoading(true)
    const payload: TransferRequest = {
      receiverId:     parseInt(transfer.receiverId),
      amount:         parseFloat(transfer.amount),
      idempotencyKey: generateKey(),
      description:    transfer.description || 'Transfer',
    }
    const res = await dispatch(transferFunds(payload))
    setActionLoading(false); setConfirmOpen(false)
    if (transferFunds.fulfilled.match(res)) {
      setModal(null)
      triggerSuccess('Transfer', payload.amount)
      const earned = calcPoints(payload.amount)
      const recipientLabel = selectedRecipient && String(getRecipientId(selectedRecipient)) === transfer.receiverId
        ? getRecipientName(selectedRecipient)
        : `user #${payload.receiverId}`
      if (earned > 0) {
        setScratchPoints(earned)
        setScratchAmount(payload.amount)
        setTimeout(() => setScratchOpen(true), 2600)
      }
      notify('success', 'Transfer Successful', `${formatCurrency(payload.amount)} sent to ${recipientLabel}`)
      toast.success('Transfer successful!')
      resetTransferForm()
    } else { toast.error(res.payload as string || 'Transfer failed') }
  }

  // ── Withdraw ───────────────────────────────────────────────────────────────
  const handleWithdrawConfirm = async () => {
    const amount = parseFloat(withdrawAmount)
    setActionLoading(true)
    const res = await dispatch(withdrawFunds(amount))
    setActionLoading(false); setConfirmOpen(false)
    if (withdrawFunds.fulfilled.match(res)) {
      setModal(null)
      triggerSuccess('Withdrawal', amount)
      notify('success', 'Withdrawal Successful', `${formatCurrency(amount)} will be credited to your bank.`)
      toast.success('Withdrawal initiated!')
      setWithdrawAmount('')
    } else { toast.error(res.payload as string || 'Withdrawal failed') }
  }

  const txList = transactions?.content ?? []

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-4xl mx-auto">
      <SuccessOverlay show={showSuccess} label={successLabel} amount={successAmount} />

      {scratchOpen && (
        <ScratchCardModal
          points={scratchPoints}
          transactionAmount={scratchAmount}
          onRevealed={handleScratchRevealed}
          onClose={() => setScratchOpen(false)}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>My Wallet</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Manage your balance, top up, and transfer funds</p>
      </div>

      {/* Balance card */}
      <motion.div className="rounded-3xl p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#052e16 0%,#0d3320 50%,#0a0f1e 100%)' }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="absolute top-0 right-0 w-72 h-72 blur-3xl opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle,#22c55e,transparent)', transform: 'translate(30%,-30%)' }} />
        <div className="relative z-10">
          <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#86efac' }}>Available Balance</div>
          {loading
            ? <div className="skeleton h-10 w-44 rounded-lg mb-2" />
            : <motion.div className="text-4xl font-display font-black text-white mb-1"
                initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
                {formatCurrency(balance?.balance ?? 0)}
              </motion.div>
          }
          <div className="text-xs mb-5" style={{ color: '#4ade80' }}>
            {balance?.status ?? 'ACTIVE'} | Last active {formatDate(latestActivityAt, 'hh:mm A')}
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Wallet actions">
            {[
              { label: 'Top Up', icon: 'topup', key: 'topup', bg: '#22c55e' },
              { label: 'Transfer', icon: 'transfer', key: 'transfer', bg: 'rgba(255,255,255,0.12)' },
              { label: 'Withdraw', icon: 'withdraw', key: 'withdraw', bg: 'rgba(255,255,255,0.12)' },
              { label: 'History', icon: 'transactions', key: 'history', bg: 'rgba(255,255,255,0.12)' },
            ].map(btn => (
              <motion.button key={btn.key}
                onClick={() => btn.key === 'history' ? navigate('/transactions') : setModal(btn.key as any)}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all inline-flex items-center gap-2"
                style={{ background: btn.bg, border: '1px solid rgba(255,255,255,0.1)' }}>
                <Icon8 name={btn.icon as React.ComponentProps<typeof Icon8>['name']} size={16} color="#ffffff" />
                {btn.label}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Recent transactions */}
      <motion.div className="card p-5" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Transactions</h3>
          <button onClick={() => navigate('/transactions')} className="text-xs font-medium" style={{ color: 'var(--brand)' }}>View All →</button>
        </div>

        {txLoading
          ? <div className="space-y-3">{[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>
                <Skeleton className="h-4 w-20" />
              </div>))}</div>
          : txList.length === 0
            ? <EmptyState icon={<Icon8 name="wallet" size={34} />} title="No transactions yet" description="Top up or transfer to see activity here." />
            : <div className="space-y-1">
                {txList.map((tx, i) => {
                  const TxIcon = getTxIcon(tx.type)
                  const credit = isCreditForUser(tx, user?.id)
                  const counterparty = getTransferCounterparty(tx, user?.id)
                  const descriptor = counterparty
                    ? `${counterparty}${tx.description && tx.description !== 'Transfer' ? ` - ${tx.description}` : ''}`
                    : (tx.description || tx.referenceId)
                  return (
                    <motion.div key={tx.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: 'var(--bg-primary)' }}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: credit ? '#dcfce7' : '#fee2e2', color: credit ? '#15803d' : '#b91c1c' }}>
                        <TxIcon fontSize="inherit" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{tx.type}</span>
                          <StatusBadge status={tx.status} />
                        </div>
                        <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                          {descriptor} · {formatDate(tx.createdAt, 'DD MMM, hh:mm A')}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold" style={{ color: credit ? 'var(--success)' : 'var(--danger)' }}>
                          {credit ? '+' : '-'}{formatCurrency(tx.amount)}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
        }
      </motion.div>

      {/* ── Modals ── */}

      {/* Top Up */}
      <Modal open={modal === 'topup'} onClose={() => setModal(null)} title="Top Up Wallet">
        <div className="space-y-4">
          <div>
            <label htmlFor="topup-amount" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Amount (₹)</label>
            <input id="topup-amount" type="number" placeholder="Enter amount" min={1}
              value={topupAmount} onChange={e => setTopupAmount(e.target.value)} className="input-field text-2xl font-display font-bold" />
          </div>
          <div>
            <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Payment method</div>
            <div className="grid grid-cols-2 gap-2">
              {TOPUP_METHODS.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setTopupMethod(method.id)}
                  className="rounded-xl px-3 py-2 text-left transition-all"
                  style={{
                    background: topupMethod === method.id ? 'rgba(34,197,94,0.14)' : 'var(--bg-primary)',
                    border: `1px solid ${topupMethod === method.id ? '#22c55e' : 'var(--border)'}`,
                  }}
                >
                  <div className="text-xs font-bold" style={{ color: topupMethod === method.id ? '#22c55e' : 'var(--text-primary)' }}>
                    {method.label}
                  </div>
                  <div className="mt-1 text-[11px] leading-4" style={{ color: 'var(--text-muted)' }}>
                    {method.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Quick amounts</div>
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map(a => (
                <button key={a} onClick={() => setTopupAmount(String(a))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: topupAmount === String(a) ? 'var(--brand)' : 'var(--bg-primary)',
                    color: topupAmount === String(a) ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${topupAmount === String(a) ? 'var(--brand)' : 'var(--border)'}`,
                  }}>
                  ₹{a.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
            <span className="inline-flex items-center gap-1">
              <Icon8 name="info" size={14} />
              Top-up adds wallet balance only. Selected method opens directly in Razorpay when available.
            </span>
          </div>
          <button onClick={handleTopup} disabled={actionLoading || !topupAmount} className="w-full btn-primary py-3 text-sm">
            {actionLoading ? 'Processing…' : `Pay ${topupAmount ? formatCurrency(parseFloat(topupAmount)) : '—'} via Razorpay`}
          </button>
        </div>
      </Modal>

      {/* Transfer */}
      <Modal open={modal === 'transfer'} onClose={closeTransferModal} title="Transfer Money">
        <div className="space-y-4">
          <div>
            <label htmlFor="tf-search" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Search recipient
            </label>
            <input
              id="tf-search"
              type="text"
              placeholder="Search by name or user ID"
              value={recipientQuery}
              onChange={e => {
                setRecipientQuery(e.target.value)
                setSelectedRecipient(null)
              }}
              className="input-field"
            />
            <div className="mt-2 rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}>
              {recipientLoading && (
                <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>Searching recipients...</div>
              )}
              {!recipientLoading && !recipientError && debouncedRecipientQuery.length >= 2 && recipientResults.length === 0 && (
                <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>No recipients found</div>
              )}
              {!recipientLoading && recipientError && (
                <div className="px-3 py-2 text-xs" style={{ color: 'var(--danger)' }}>{recipientError}</div>
              )}
              {!recipientLoading && !recipientError && recipientResults.map(recipient => {
                const recipientId = getRecipientId(recipient)
                const isSelected = String(recipientId ?? '') === transfer.receiverId
                return (
                  <button
                    key={`${recipientId ?? 'unknown'}-${recipient.email ?? recipient.phone ?? getRecipientName(recipient)}`}
                    type="button"
                    onClick={() => {
                      if (!recipientId) return
                      setSelectedRecipient(recipient)
                      setRecipientQuery(getRecipientName(recipient))
                      setRecipientResults([])
                      setTransfer(prev => ({ ...prev, receiverId: String(recipientId) }))
                    }}
                    className="w-full px-3 py-2 text-left transition-colors border-t first:border-t-0"
                    style={{
                      borderColor: 'var(--border)',
                      background: isSelected ? 'rgba(34,197,94,0.08)' : 'transparent',
                    }}
                  >
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{getRecipientName(recipient)}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      User ID: {recipientId ?? 'N/A'}{getRecipientMeta(recipient) ? ` · ${getRecipientMeta(recipient)}` : ''}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          {[
            { key: 'receiverId' as const, label: 'Receiver User ID', placeholder: 'Enter user ID if you prefer manual entry', type: 'number' },
            { key: 'amount' as const, label: 'Amount ₹ (max ₹25,000)', placeholder: '0.00', type: 'number' },
            { key: 'description' as const, label: 'Note (optional)', placeholder: 'e.g. Rent, Lunch split', type: 'text' },
          ].map(f => (
            <div key={f.key}>
              <label htmlFor={`tf-${f.key}`} className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
              <input
                id={`tf-${f.key}`}
                type={f.type}
                placeholder={f.placeholder}
                value={transfer[f.key]}
                onChange={e => {
                  const value = e.target.value
                  if (f.key === 'receiverId') {
                    setSelectedRecipient(null)
                    if (value !== transfer.receiverId) {
                      setRecipientQuery('')
                      setRecipientResults([])
                      setRecipientError('')
                    }
                  }
                  setTransfer(p => ({ ...p, [f.key]: value }))
                }}
                className="input-field"
              />
            </div>
          ))}
          {selectedRecipient && (
            <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
              Sending to <strong style={{ color: 'var(--text-primary)' }}>{getRecipientName(selectedRecipient)}</strong> (User ID: {getRecipientId(selectedRecipient)})
            </div>
          )}
          <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
            <span className="inline-flex items-center gap-1">
              <Icon8 name="star" size={14} />
              Earn <strong style={{ color: 'var(--brand)' }}>{calcPoints(parseFloat(transfer.amount) || 0)} reward points</strong> on this transfer via scratch card.
            </span>
          </div>
          <button onClick={() => {
            const amt = parseFloat(transfer.amount)
            if (!transfer.receiverId) { toast.error('Enter receiver ID'); return }
            if (!amt || amt < 1 || amt > 25000) { toast.error('Amount must be ₹1–₹25,000'); return }
            setConfirmOpen(true)
          }} className="w-full btn-primary py-3 text-sm">Review Transfer →</button>
        </div>
      </Modal>

      {/* Withdraw */}
      <Modal open={modal === 'withdraw'} onClose={() => setModal(null)} title="Withdraw Funds">
        <div className="space-y-4">
          <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
            Available: <strong style={{ color: 'var(--brand)' }}>{formatCurrency(balance?.balance ?? 0)}</strong>
          </div>
          <div>
            <label htmlFor="withdraw-amount" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Amount (₹)</label>
            <input id="withdraw-amount" type="number" placeholder="Enter amount" min={1} max={balance?.balance ?? 0}
              value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="input-field" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[500, 1000, 2000].map(a => (
              <button key={a} onClick={() => setWithdrawAmount(String(Math.min(a, balance?.balance ?? 0)))}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                ₹{a.toLocaleString('en-IN')}
              </button>
            ))}
            <button onClick={() => setWithdrawAmount(String(balance?.balance ?? 0))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              Max
            </button>
          </div>
          <button onClick={() => {
            const amt = parseFloat(withdrawAmount)
            if (!amt || amt < 1) { toast.error('Enter a valid amount'); return }
            if (amt > (balance?.balance ?? 0)) { toast.error('Insufficient balance'); return }
            setConfirmOpen(true)
          }} className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
            style={{ background: '#f59e0b' }}>
            Withdraw {withdrawAmount ? formatCurrency(parseFloat(withdrawAmount)) : '—'}
          </button>
        </div>
      </Modal>

      {/* Confirm */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={modal === 'transfer' ? handleTransferConfirm : handleWithdrawConfirm}
        title={modal === 'transfer' ? 'Confirm Transfer' : 'Confirm Withdrawal'}
        message={modal === 'transfer'
          ? `Send to ${selectedRecipient && String(getRecipientId(selectedRecipient)) === transfer.receiverId
              ? `${getRecipientName(selectedRecipient)} (User #${transfer.receiverId})`
              : `User #${transfer.receiverId}`}`
          : 'Funds will be transferred to your bank'}
        amount={modal === 'transfer' ? parseFloat(transfer.amount) : parseFloat(withdrawAmount)}
        loading={actionLoading}
      />
    </div>
  )
}

