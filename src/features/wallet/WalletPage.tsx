import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAppDispatch, useAppSelector, useNotify, useDebounce } from '../../shared/hooks'
import { fetchBalance, fetchTransactions, transferFunds, withdrawFunds, createPaymentOrder } from '../../store/walletSlice'
import { fetchRewardSummary, fetchRewardTransactions } from '../../store/rewardsSlice'
import { walletService, rewardsService, userService } from '../../services'
import { getApiErrorMessage } from '../../shared/apiErrors'
import { Modal, ConfirmDialog, SuccessOverlay, Skeleton, EmptyState, StatusBadge } from '../../shared/components/ui'
import { ScratchCardModal } from '../../shared/components/ScratchCard'
import { formatCurrency, formatDate, getTransferCounterparty, getTransactionAmountDisplay, getTxIcon, generateKey, calcPoints } from '../../shared/utils'
import type { RecipientSearchItem, RazorpayOptions, RazorpayPaymentFailure, TransferRequest } from '../../types'
import { Icon8 } from '../../shared/components/Icon8'
import { createTransferSchema, createWithdrawSchema, getFirstError, topupAmountSchema } from '../../shared/validation'

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000]
const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js'
const RAZORPAY_METHOD_LABELS = {
  upi: 'UPI',
  card: 'Card',
  wallet: 'Wallet',
  netbanking: 'Netbanking',
} as const
const RAZORPAY_METHODS = [
  { key: 'upi', title: 'UPI', description: 'Open Razorpay directly in UPI mode.' },
  { key: 'card', title: 'Card', description: 'Jump straight to debit and credit card checkout.' },
  { key: 'wallet', title: 'Wallet', description: 'Use supported wallets inside Razorpay.' },
  { key: 'netbanking', title: 'Netbanking', description: 'Choose your bank from Razorpay netbanking.' },
] as const
const HIDDEN_BALANCE_TEXT = '••••••'

let razorpayScriptPromise: Promise<void> | null = null
const transactionSkeletonKeys = ['wallet-tx-skeleton-1', 'wallet-tx-skeleton-2', 'wallet-tx-skeleton-3', 'wallet-tx-skeleton-4']
const recipientSearchSkeletonKeys = ['recipient-skeleton-1', 'recipient-skeleton-2', 'recipient-skeleton-3']

const recipientLabel = (recipient: RecipientSearchItem | null, receiverId: string) => {
  if (!recipient) return receiverId ? `User #${receiverId}` : 'Recipient'
  const name = recipient.fullName || `User #${recipient.id}`
  return recipient.phone ? `${name} (${recipient.phone})` : name
}

const transactionDescriptor = (counterparty: string | null, description?: string, referenceId?: string) => {
  if (!counterparty) return description || referenceId
  if (description && description !== 'Transfer') return `${counterparty} - ${description}`
  return counterparty
}

const transactionToneStyle = (tone: 'credit' | 'debit' | 'muted') => {
  if (tone === 'credit') return { background: '#dcfce7', color: '#15803d', amountColor: 'var(--success)' }
  if (tone === 'debit') return { background: '#fee2e2', color: '#b91c1c', amountColor: 'var(--danger)' }
  return { background: 'var(--bg-card)', color: 'var(--text-muted)', amountColor: 'var(--text-muted)' }
}

const RAZORPAY_DOWN_MESSAGE = 'Razorpay is temporarily unavailable. Please try again in a few minutes or use another payment method.'

const getRazorpayErrorMessage = (error: unknown, fallback = 'Top-up failed. Please try again.') => {
  const message = getApiErrorMessage(error, fallback)
  const normalized = message.toLowerCase()

  if (
    normalized.includes('razorpay') ||
    normalized.includes('payment gateway') ||
    normalized.includes('service unavailable') ||
    normalized.includes('temporarily unavailable') ||
    normalized.includes('bad gateway') ||
    normalized.includes('gateway timeout') ||
    normalized.includes('failed to load razorpay script') ||
    normalized.includes('network error')
  ) {
    return RAZORPAY_DOWN_MESSAGE
  }

  return message
}

const getRazorpayFailureMessage = (failure?: RazorpayPaymentFailure) => {
  const description = failure?.error?.description?.trim()
  const normalizedDescription = description?.toLowerCase() || ''
  const gatewayIssue = [failure?.error?.reason, failure?.error?.source, failure?.error?.step]
    .filter(Boolean)
    .some(value => String(value).toLowerCase().includes('gateway') || String(value).toLowerCase().includes('network'))

  if (
    gatewayIssue ||
    normalizedDescription.includes('payment failed') ||
    normalizedDescription.includes('something went wrong')
  ) {
    return RAZORPAY_DOWN_MESSAGE
  }

  return description || 'Payment was not completed. Please try again.'
}

const shouldInterceptRazorpayAlert = (message: string) => {
  const normalized = message.toLowerCase()
  return normalized.includes('payment failed') || normalized.includes('something went wrong')
}

function loadRazorpayScript(): Promise<void> {
  if (typeof globalThis.window === 'undefined') return Promise.resolve()
  if (globalThis.window.Razorpay) return Promise.resolve()
  if (razorpayScriptPromise) return razorpayScriptPromise

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay="true"]')
    if (existing) {
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
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const notify = useNotify()
  const { user } = useAppSelector(s => s.auth)
  const { balance, transactions, loading, txLoading } = useAppSelector(s => s.wallet)

  const [modal, setModal] = useState<null | 'topup' | 'transfer' | 'withdraw'>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const [successLabel, setSuccessLabel] = useState('')
  const [successAmount, setSuccessAmount] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)

  const [scratchOpen, setScratchOpen] = useState(false)
  const [scratchPoints, setScratchPoints] = useState(0)
  const [scratchAmount, setScratchAmount] = useState(0)

  const [topupAmount, setTopupAmount] = useState('')
  const [showWalletBalance, setShowWalletBalance] = useState(false)
  const [transfer, setTransfer] = useState<{ receiverId: string; amount: string; description: string }>({
    receiverId: '',
    amount: '',
    description: '',
  })
  const [withdrawAmount, setWithdrawAmount] = useState('')

  const [recipientSearch, setRecipientSearch] = useState('')
  const [recipientMatches, setRecipientMatches] = useState<RecipientSearchItem[]>([])
  const [recipientLoading, setRecipientLoading] = useState(false)
  const [recipientError, setRecipientError] = useState('')
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientSearchItem | null>(null)

  const normalizedRecipientSearch = recipientSearch.trim()
  const debouncedRecipientSearch = useDebounce(normalizedRecipientSearch, 500)
  const isRecipientSearchDebouncing =
    modal === 'transfer' &&
    normalizedRecipientSearch.length >= 2 &&
    normalizedRecipientSearch !== debouncedRecipientSearch

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchBalance())
      dispatch(fetchTransactions({ page: 0, size: 6 }))
      dispatch(fetchRewardSummary())
    }
  }, [dispatch, user?.id])

  useEffect(() => {
    if (modal !== 'transfer') return
    if (!user?.id || debouncedRecipientSearch.length < 2) {
      setRecipientMatches([])
      setRecipientError('')
      setRecipientLoading(false)
      return
    }

    let active = true
    setRecipientLoading(true)
    setRecipientError('')

    userService.searchRecipients(user.id, debouncedRecipientSearch)
      .then(({ data }) => {
        if (!active) return
        setRecipientMatches((data.data || []).filter(item => item.id !== user.id))
      })
      .catch(() => {
        if (!active) return
        setRecipientMatches([])
        setRecipientError('Could not load recipients right now.')
      })
      .finally(() => {
        if (active) setRecipientLoading(false)
      })

    return () => { active = false }
  }, [modal, user?.id, debouncedRecipientSearch])

  const clearTransferForm = () => {
    setTransfer({ receiverId: '', amount: '', description: '' })
    setRecipientSearch('')
    setRecipientMatches([])
    setRecipientError('')
    setSelectedRecipient(null)
  }

  const selectRecipient = (recipient: RecipientSearchItem) => {
    setSelectedRecipient(recipient)
    setRecipientSearch(recipient.fullName || recipient.phone || String(recipient.id))
    setTransfer(prev => ({ ...prev, receiverId: String(recipient.id) }))
    setRecipientMatches([])
    setRecipientError('')
  }

  const recipientDisplay = recipientLabel(selectedRecipient, transfer.receiverId)
  const transferValidationSchema = createTransferSchema(user?.id)
  const withdrawValidationSchema = createWithdrawSchema(balance?.balance ?? 0)

  const triggerSuccess = (label: string, amount: number) => {
    setSuccessLabel(label)
    setSuccessAmount(amount)
    setShowSuccess(true)
    dispatch(fetchBalance())
    dispatch(fetchTransactions({ page: 0, size: 6 }))
    setTimeout(() => setShowSuccess(false), 2400)
  }

  const launchRazorpayCheckout = async (
    amount: number,
    preferredMethod?: keyof typeof RAZORPAY_METHOD_LABELS,
    description = 'Wallet Top-up',
  ) => {
    if (!user) {
      toast.error('User not logged in')
      return
    }

    setActionLoading(true)
    const originalAlert = globalThis.window.alert.bind(globalThis.window)
    const restoreAlert = () => {
      globalThis.window.alert = originalAlert
    }

    try {
      const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID?.trim()
      if (!keyId) {
        toast.error('Payment is not configured. Set VITE_RAZORPAY_KEY_ID in your environment.')
        setActionLoading(false)
        return
      }

      await loadRazorpayScript()

      const orderData = await dispatch(createPaymentOrder(amount))
      if (!createPaymentOrder.fulfilled.match(orderData)) {
        toast.error(getRazorpayErrorMessage(orderData.payload, RAZORPAY_DOWN_MESSAGE))
        setActionLoading(false)
        return
      }

      const order = orderData.payload
      const orderId = order.orderId ?? order.id
      const closeTopupFlow = () => {
        setModal(null)
        setActionLoading(false)
        dispatch(fetchBalance())
        dispatch(fetchTransactions({ page: 0, size: 6 }))
        navigate('/wallet', { replace: true })
      }
      const reportCancelledPayment = async (paymentId?: string) => {
        try {
          await walletService.cancelPayment(user.id, {
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId ?? '',
            razorpaySignature: '',
          })
        } catch {
          // Keep the user on the wallet page even if the cancel callback errors.
        } finally {
          closeTopupFlow()
        }
      }
      const reportFailedPayment = async (failure?: RazorpayPaymentFailure) => {
        const paymentId = failure?.error?.metadata?.payment_id || ''
        const reason = failure?.error?.description?.trim() || 'Payment failed in Razorpay checkout'
        try {
          await walletService.markPaymentFailed(user.id, {
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            razorpaySignature: '',
          }, reason)
        } catch {
          // Preserve the user flow even if the failure callback itself errors.
        } finally {
          closeTopupFlow()
        }
      }
      globalThis.window.alert = (message?: string) => {
        const text = String(message || '').trim()
        if (!text) return
        if (shouldInterceptRazorpayAlert(text)) {
          toast.error(RAZORPAY_DOWN_MESSAGE)
          return
        }
        toast.error(text)
      }

      const options: RazorpayOptions = {
        key: keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        order_id: orderId,
        name: 'PayVault',
        description,
        theme: { color: '#22c55e' },
        prefill: {
          name: user.fullName,
          email: user.email,
        },
        modal: {
          ondismiss: async () => {
            restoreAlert()
            toast('Top-up cancelled', { icon: 'i' })
            await reportCancelledPayment()
          },
        },
        handler: async (response) => {
          try {
            await walletService.verifyPayment(user.id, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })

            setModal(null)
            triggerSuccess('Top-up', amount)
            dispatch(fetchRewardSummary())
            dispatch(fetchRewardTransactions())
            // Reward earning runs asynchronously through Kafka in backend;
            // do a delayed refresh so UI catches eventual updates.
            setTimeout(() => {
              dispatch(fetchRewardSummary())
              dispatch(fetchRewardTransactions())
            }, 1800)
            setTimeout(() => {
              dispatch(fetchRewardSummary())
              dispatch(fetchRewardTransactions())
            }, 4500)
            notify('success', 'Top-up Successful!', `${formatCurrency(amount)} added to your wallet`)
            toast.success(`Wallet topped up with ${formatCurrency(amount)}`)
            setTopupAmount('')
          } catch (err) {
            toast.error(getRazorpayErrorMessage(err, 'Payment verification failed'))
          } finally {
            restoreAlert()
            setActionLoading(false)
          }
        },
      }

      if (preferredMethod) {
        options.config = {
          display: {
            blocks: {
              preferred_method: {
                name: `Pay with ${RAZORPAY_METHOD_LABELS[preferredMethod]}`,
                instruments: [{ method: preferredMethod }],
              },
            },
            sequence: ['block.preferred_method'],
            preferences: {
              show_default_blocks: false,
            },
          },
        }
      }

      if (!globalThis.window.Razorpay) {
        toast.error('Payment gateway not loaded. Please refresh.')
        setActionLoading(false)
        return
      }

      const rzp = new globalThis.window.Razorpay(options)
      const handlePaymentFailed = async (response?: RazorpayPaymentFailure) => {
        restoreAlert()
        rzp.close()
        toast.error(getRazorpayFailureMessage(response))
        await reportFailedPayment(response)
      }
      rzp.on('payment.failed', handlePaymentFailed)
      rzp.open()
    } catch (err: any) {
      restoreAlert()
      toast.error(getRazorpayErrorMessage(err, 'Top-up failed'))
      setActionLoading(false)
    }
  }

  const handleTopup = async (preferredMethod?: keyof typeof RAZORPAY_METHOD_LABELS) => {
    if (actionLoading) return

    const amountResult = topupAmountSchema.safeParse(topupAmount)
    if (!amountResult.success) {
      toast.error(getFirstError(amountResult.error))
      return
    }

    await launchRazorpayCheckout(amountResult.data, preferredMethod)
  }

  const handleScratchRevealed = async (pts: number) => {
    try {
      await rewardsService.earnInternal(user!.id, scratchAmount)
    } catch (error) {
      console.warn('Reward sync failed after scratch-card reveal', error)
    }
    dispatch(fetchRewardSummary())
    notify('success', `+${pts} Points Added!`, `Reward points for your transfer of ${formatCurrency(scratchAmount)}`)
    toast.success(`${pts} reward points added to your account!`)
  }

  const handleTransferConfirm = async () => {
    const transferResult = transferValidationSchema.safeParse(transfer)
    if (!transferResult.success) {
      toast.error(getFirstError(transferResult.error))
      return
    }

    setActionLoading(true)
    const payload: TransferRequest = {
      receiverId: transferResult.data.receiverId,
      amount: transferResult.data.amount,
      idempotencyKey: generateKey(),
      description: transferResult.data.description || 'Transfer',
    }
    const res = await dispatch(transferFunds(payload))
    setActionLoading(false)
    setConfirmOpen(false)

    if (transferFunds.fulfilled.match(res)) {
      setModal(null)
      triggerSuccess('Transfer', payload.amount)
      const earned = calcPoints(payload.amount)
      if (earned > 0) {
        setScratchPoints(earned)
        setScratchAmount(payload.amount)
        setTimeout(() => setScratchOpen(true), 2600)
      }
      notify('success', 'Transfer Successful', `${formatCurrency(payload.amount)} sent to ${recipientDisplay}`)
      toast.success('Transfer successful!')
      clearTransferForm()
    } else {
      toast.error(res.payload as string || 'Transfer failed')
    }
  }

  const handleWithdrawConfirm = async () => {
    const withdrawResult = withdrawValidationSchema.safeParse({ amount: withdrawAmount })
    if (!withdrawResult.success) {
      toast.error(getFirstError(withdrawResult.error))
      return
    }

    const amount = withdrawResult.data.amount
    setActionLoading(true)
    const res = await dispatch(withdrawFunds(amount))
    setActionLoading(false)
    setConfirmOpen(false)

    if (withdrawFunds.fulfilled.match(res)) {
      setModal(null)
      triggerSuccess('Withdrawal', amount)
      notify('success', 'Withdrawal Successful', `${formatCurrency(amount)} will be credited to your bank.`)
      toast.success('Withdrawal initiated!')
      setWithdrawAmount('')
    } else {
      toast.error(res.payload as string || 'Withdrawal failed')
    }
  }

  const txList = transactions?.content ?? []
  const walletStatusLine = balance?.lastUpdated
    ? `${balance?.status ?? 'ACTIVE'} · Last updated ${formatDate(balance.lastUpdated, 'hh:mm A')}`
    : (balance?.status ?? 'ACTIVE')
  const topupButtonLabel = actionLoading
    ? 'Processing…'
    : `Pay ${topupAmount ? formatCurrency(Number.parseFloat(topupAmount)) : '—'} via Razorpay`
  const transferRewardPoints = calcPoints(Number.parseFloat(transfer.amount) || 0)
  const withdrawButtonLabel = `Withdraw ${withdrawAmount ? formatCurrency(Number.parseFloat(withdrawAmount)) : '—'}`
  const confirmAmount = modal === 'transfer'
    ? Number.parseFloat(transfer.amount)
    : Number.parseFloat(withdrawAmount)

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

      <div>
        <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>My Wallet</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Manage your balance, top up, and transfer funds</p>
      </div>

      <motion.div
        className="rounded-3xl p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#052e16 0%,#0d3320 50%,#0a0f1e 100%)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div
          className="absolute top-0 right-0 w-72 h-72 blur-3xl opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle,#22c55e,transparent)', transform: 'translate(30%,-30%)' }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#86efac' }}>Available Balance</div>
            {!loading && (
              <button
                type="button"
                onClick={() => setShowWalletBalance(prev => !prev)}
                className="inline-flex items-center justify-center rounded-md p-1"
                style={{ color: '#86efac' }}
                aria-label={showWalletBalance ? 'Hide wallet balance' : 'Show wallet balance'}
              >
                <Icon8 name={showWalletBalance ? 'eyeOff' : 'eye'} size={16} className="opacity-90" />
              </button>
            )}
          </div>
          {loading
            ? <div className="skeleton h-10 w-44 rounded-lg mb-2" />
            : (
              <motion.div className="text-4xl font-display font-black text-white mb-1" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
                {showWalletBalance ? formatCurrency(balance?.balance ?? 0) : HIDDEN_BALANCE_TEXT}
              </motion.div>
            )}
          <div className="text-xs mb-5" style={{ color: '#4ade80' }}>{walletStatusLine}</div>

          <fieldset className="flex flex-wrap gap-2" aria-label="Wallet actions">
            {[
              { label: 'Top Up', icon: 'topup', key: 'topup', bg: '#22c55e' },
              { label: 'Transfer', icon: 'transfer', key: 'transfer', bg: 'rgba(255,255,255,0.12)' },
              { label: 'Withdraw', icon: 'withdraw', key: 'withdraw', bg: 'rgba(255,255,255,0.12)' },
              { label: 'History', icon: 'transactions', key: 'history', bg: 'rgba(255,255,255,0.12)' },
            ].map(btn => (
              <motion.button
                key={btn.key}
                onClick={() => {
                  if (btn.key === 'history') {
                    navigate('/transactions')
                    return
                  }
                  if (btn.key === 'transfer') clearTransferForm()
                  setModal(btn.key as 'topup' | 'transfer' | 'withdraw')
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all inline-flex items-center gap-2"
                style={{ background: btn.bg, border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <Icon8 name={btn.icon as React.ComponentProps<typeof Icon8>['name']} size={16} color="#ffffff" />
                {btn.label}
              </motion.button>
            ))}
          </fieldset>
        </div>
      </motion.div>

      <motion.div className="card p-5" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Transactions</h3>
          <button onClick={() => navigate('/transactions')} className="text-xs font-medium" style={{ color: 'var(--brand)' }}>View All →</button>
        </div>

        {txLoading
          ? (
            <div className="space-y-3">
              {transactionSkeletonKeys.map(key => (
                <div key={key} className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          )
          : null}
        {!txLoading && txList.length === 0
          ? <EmptyState icon={<Icon8 name="wallet" size={34} />} title="No transactions yet" description="Top up or transfer to see activity here." />
          : null}
        {!txLoading && txList.length > 0
          ? (
              <div className="space-y-1">
                {txList.map((tx, i) => {
                  const TxIcon = getTxIcon(tx.type)
                  const amountDisplay = getTransactionAmountDisplay(tx, user?.id)
                  const counterparty = getTransferCounterparty(tx, user?.id)
                  const descriptor = transactionDescriptor(counterparty, tx.description, tx.referenceId)
                  const toneStyle = transactionToneStyle(amountDisplay.tone)

                  return (
                    <motion.div
                      key={tx.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: 'var(--bg-primary)' }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{
                          background: toneStyle.background,
                          color: toneStyle.color,
                        }}
                      >
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
                        <div
                          className="text-sm font-bold"
                          style={{ color: toneStyle.amountColor }}
                          title={amountDisplay.tooltip}
                        >
                          {amountDisplay.value}
                        </div>
                        {amountDisplay.tooltip && (
                          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {amountDisplay.tooltip}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : null}
      </motion.div>

      <Modal open={modal === 'topup'} onClose={() => setModal(null)} title="Top Up Wallet">
        <div className="space-y-4">
          <div>
            <label htmlFor="topup-amount" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Amount (₹)</label>
            <input
              id="topup-amount"
              type="number"
              placeholder="Enter amount"
              min={1}
              value={topupAmount}
              onChange={e => setTopupAmount(e.target.value)}
              className="input-field text-2xl font-display font-bold"
            />
          </div>
          <div>
            <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Quick amounts</div>
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map(a => (
                <button
                  key={a}
                  onClick={() => setTopupAmount(String(a))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: topupAmount === String(a) ? 'var(--brand)' : 'var(--bg-primary)',
                    color: topupAmount === String(a) ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${topupAmount === String(a) ? 'var(--brand)' : 'var(--border)'}`,
                  }}
                >
                  ₹{a.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
            <span className="inline-flex items-center gap-1">
              <Icon8 name="info" size={14} />
              Top-up adds wallet balance only. Reward scratch card is available on successful transfer.
            </span>
          </div>
          <div>
            <div className="text-xs mb-2 uppercase tracking-wider font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Choose payment option
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {RAZORPAY_METHODS.map(method => (
                <button
                  key={method.key}
                  type="button"
                  onClick={() => handleTopup(method.key)}
                  disabled={actionLoading || !topupAmount}
                  className="rounded-xl border px-4 py-3 text-left transition-all hover:-translate-y-0.5 disabled:opacity-60"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}
                >
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{method.title}</div>
                  <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{method.description}</div>
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => handleTopup()} disabled={actionLoading || !topupAmount} className="w-full btn-primary py-3 text-sm">
            {topupButtonLabel}
          </button>
        </div>
      </Modal>

      <Modal open={modal === 'transfer'} onClose={() => setModal(null)} title="Transfer Money">
        <div className="space-y-4">
          <div>
            <label htmlFor="tf-recipient-search" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Recipient Name, Phone, or User ID
            </label>
            <input
              id="tf-recipient-search"
              type="text"
              placeholder="Search by name, phone, or user ID"
              value={recipientSearch}
              onChange={e => {
                const value = e.target.value
                setRecipientSearch(value)
                setRecipientMatches([])
                setRecipientError('')
                if (selectedRecipient) {
                  const selectedValues = [selectedRecipient.fullName, selectedRecipient.phone, String(selectedRecipient.id)].filter(Boolean)
                  if (!selectedValues.includes(value)) setSelectedRecipient(null)
                }
              }}
              className="input-field"
            />
            <div className="mt-2 space-y-2">
              {selectedRecipient && (
                <div className="rounded-2xl border px-3 py-3 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedRecipient.fullName}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {selectedRecipient.phone || 'Phone not available'} · User ID #{selectedRecipient.id}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecipient(null)
                        setRecipientSearch('')
                        setTransfer(prev => ({ ...prev, receiverId: '' }))
                        setRecipientMatches([])
                        setRecipientError('')
                      }}
                      className="text-xs font-semibold"
                      style={{ color: 'var(--brand)' }}
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              {!selectedRecipient && !normalizedRecipientSearch && (
                <div className="rounded-xl px-3 py-2 text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                  Start typing a name, phone number, or user ID to search the database.
                </div>
              )}

              {!selectedRecipient && normalizedRecipientSearch.length === 1 && (
                <div className="rounded-xl px-3 py-2 text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                  Type at least 2 characters to search.
                </div>
              )}

              {!selectedRecipient && (isRecipientSearchDebouncing || recipientLoading) && (
                <div className="space-y-2">
                  {recipientSearchSkeletonKeys.map(key => <Skeleton key={key} className="h-14 rounded-2xl" />)}
                </div>
              )}

              {!selectedRecipient && !isRecipientSearchDebouncing && !recipientLoading && recipientError && (
                <div className="rounded-xl px-3 py-2 text-xs" style={{ background: '#fff7ed', color: '#c2410c' }}>
                  {recipientError}
                </div>
              )}

              {!selectedRecipient && !isRecipientSearchDebouncing && !recipientLoading && recipientMatches.length > 0 && (
                <div className="space-y-2">
                  {recipientMatches.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => selectRecipient(option)}
                      className="w-full rounded-2xl border px-3 py-3 text-left transition-all"
                      style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {option.fullName || `User #${option.id}`}
                          </div>
                          <div className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                            {option.phone || 'Phone not available'} · User ID #{option.id}
                          </div>
                        </div>
                        <span className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>Select</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!selectedRecipient && !isRecipientSearchDebouncing && !recipientLoading && !recipientError && debouncedRecipientSearch.length >= 2 && recipientMatches.length === 0 && (
                <div className="rounded-xl px-3 py-2 text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                  No matching users found.
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="tf-receiver-id" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Selected Receiver User ID
            </label>
            <input
              id="tf-receiver-id"
              type="number"
              placeholder="Enter user ID if needed"
              value={transfer.receiverId}
              onChange={e => {
                const value = e.target.value
                setTransfer(prev => ({ ...prev, receiverId: value }))
                if (selectedRecipient && String(selectedRecipient.id) !== value) setSelectedRecipient(null)
              }}
              className="input-field"
            />
          </div>

          {[
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
                onChange={e => setTransfer(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="input-field"
              />
            </div>
          ))}

          <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
            <span className="inline-flex items-center gap-1">
              <Icon8 name="star" size={14} />
              Earn <strong style={{ color: 'var(--brand)' }}>{transferRewardPoints} reward points</strong> on this transfer via scratch card.
            </span>
          </div>

          <button
            onClick={() => {
              const transferResult = transferValidationSchema.safeParse(transfer)
              if (!transferResult.success) { toast.error(getFirstError(transferResult.error)); return }
              setConfirmOpen(true)
            }}
            className="w-full btn-primary py-3 text-sm"
          >
            Review Transfer →
          </button>
        </div>
      </Modal>

      <Modal open={modal === 'withdraw'} onClose={() => setModal(null)} title="Withdraw Funds">
        <div className="space-y-4">
          <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
            Available: <strong style={{ color: 'var(--brand)' }}>{formatCurrency(balance?.balance ?? 0)}</strong>
          </div>
          <div>
            <label htmlFor="withdraw-amount" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Amount (₹)</label>
            <input
              id="withdraw-amount"
              type="number"
              placeholder="Enter amount"
              min={1}
              max={balance?.balance ?? 0}
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[500, 1000, 2000].map(a => (
              <button
                key={a}
                onClick={() => setWithdrawAmount(String(Math.min(a, balance?.balance ?? 0)))}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                ₹{a.toLocaleString('en-IN')}
              </button>
            ))}
            <button
              onClick={() => setWithdrawAmount(String(balance?.balance ?? 0))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              Max
            </button>
          </div>
          <button
            onClick={() => {
              const withdrawResult = withdrawValidationSchema.safeParse({ amount: withdrawAmount })
              if (!withdrawResult.success) { toast.error(getFirstError(withdrawResult.error)); return }
              setConfirmOpen(true)
            }}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
            style={{ background: '#f59e0b' }}
          >
            {withdrawButtonLabel}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={modal === 'transfer' ? handleTransferConfirm : handleWithdrawConfirm}
        title={modal === 'transfer' ? 'Confirm Transfer' : 'Confirm Withdrawal'}
        message={modal === 'transfer' ? `Send to ${recipientDisplay}` : 'Funds will be transferred to your bank'}
        amount={confirmAmount}
        loading={actionLoading}
      />
    </div>
  )
}


