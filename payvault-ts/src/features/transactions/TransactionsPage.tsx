// ─── TransactionsPage.tsx ────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAppDispatch, useAppSelector, useTheme } from '../../shared/hooks'
import { fetchTransactions, fetchLedger } from '../../store/walletSlice'
import { fetchRewardTransactions } from '../../store/rewardsSlice'
import { walletService } from '../../core/api'
import { formatCurrency, formatDate, getTransferCounterparty, getTxIcon, isCreditForUser } from '../../shared/utils'
import { Skeleton, StatusBadge } from '../../shared/components/ui'
import type { TxType, RewardTransaction, Transaction } from '../../types'
import { Icon8 } from '../../shared/components/Icon8'

const TX_TYPES: TxType[] = ['TOPUP', 'TRANSFER', 'WITHDRAW', 'CASHBACK', 'REDEEM']

type RedeemRow =
  | { kind: 'wallet'; id: number; createdAt: string; tx: Transaction }
  | { kind: 'reward'; id: number; createdAt: string; tx: RewardTransaction }

const classifyRedeemKind = (description?: string | null): 'CATALOG' | 'POINTS' => {
  const text = (description || '').toLowerCase()
  if (text.includes('cash') || text.includes('wallet') || text.includes('convert')) return 'POINTS'
  return 'CATALOG'
}

export function TransactionsPage() {
  const dispatch = useAppDispatch()
  const { isDark } = useTheme()
  const { user } = useAppSelector(s => s.auth)
  const { transactions, ledger, txLoading } = useAppSelector(s => s.wallet)
  const { transactions: rewardTxns } = useAppSelector(s => s.rewards)
  const [tab, setTab]         = useState<'txn' | 'ledger'>('txn')
  const [filter, setFilter]   = useState<TxType | 'ALL'>('ALL')
  const [page, setPage]       = useState(0)
  const [from, setFrom]       = useState('')
  const [to, setTo]           = useState('')
  const [downloading, setDl]  = useState(false)

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchTransactions({ page, size: 12 }))
      dispatch(fetchLedger({}))
      dispatch(fetchRewardTransactions())
    }
  }, [dispatch, user?.id, page])

  const download = async () => {
    if (!from || !to) { toast.error('Select a date range'); return }
    setDl(true)
    try {
      const resp = await walletService.downloadStatement(user!.id, from, to)
      const url = URL.createObjectURL(resp.data as Blob)
      const a = document.createElement('a'); a.href = url; a.download = `statement_${from}_${to}.csv`; a.click()
      toast.success('Statement downloaded!')
    } catch { toast.error('Download failed') } finally { setDl(false) }
  }

  const walletTxList = transactions?.content ?? []
  const txList = walletTxList.filter(t => filter === 'ALL' || t.type === filter)
  const redeemRows: RedeemRow[] = [
    ...walletTxList
      .filter(t => t.type === 'REDEEM')
      .map(t => ({ kind: 'wallet' as const, id: t.id, createdAt: t.createdAt, tx: t })),
    ...rewardTxns
      .filter(t => t.type === 'REDEEM')
      .map(t => ({ kind: 'reward' as const, id: t.id, createdAt: t.createdAt, tx: t })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const totalPages = transactions?.totalPages ?? 1
  const softMuted = isDark ? '#9fb4d7' : 'var(--text-muted)'
  const softSecondary = isDark ? '#bfd0ea' : 'var(--text-secondary)'

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-4xl mx-auto">
      <div><h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Transactions</h1>
        <p className="text-sm mt-0.5" style={{ color: softSecondary }}>Full history of your wallet activity</p></div>

      {/* Download bar */}
      <motion.div className="card p-4 flex flex-wrap gap-3 items-end" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div><label htmlFor="from-date" className="block text-xs font-semibold mb-1" style={{ color: softMuted }}>From</label>
          <input id="from-date" type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-field py-2 text-sm" /></div>
        <div><label htmlFor="to-date" className="block text-xs font-semibold mb-1" style={{ color: softMuted }}>To</label>
          <input id="to-date" type="date" value={to} onChange={e => setTo(e.target.value)} className="input-field py-2 text-sm" /></div>
        <button onClick={download} disabled={downloading} className="btn-primary py-2.5 text-sm flex items-center gap-2">
          <span aria-hidden="true" className="inline-flex"><Icon8 name="transactions" size={14} /></span>{downloading ? 'Downloading…' : 'Export CSV'}
        </button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} role="tablist">
        {[{ id: 'txn', label: 'Transactions' }, { id: 'ledger', label: 'Ledger' }].map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id as any} onClick={() => setTab(t.id as any)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: tab === t.id ? 'var(--brand)' : 'transparent', color: tab === t.id ? '#fff' : softSecondary }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'txn' && (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter transactions">
            {(['ALL', ...TX_TYPES] as const).map(f => {
              if (f === 'ALL') {
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{ background: filter === f ? 'var(--brand)' : 'var(--bg-card)', color: filter === f ? '#fff' : softSecondary, border: `1px solid ${filter === f ? 'var(--brand)' : 'var(--border)'}` }}
                  >
                    ✦ All
                  </button>
                )
              }

              const TxIcon = getTxIcon(f)
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{ background: filter === f ? 'var(--brand)' : 'var(--bg-card)', color: filter === f ? '#fff' : softSecondary, border: `1px solid ${filter === f ? 'var(--brand)' : 'var(--border)'}` }}
                >
                  <span className="inline-flex items-center gap-2">
                    <TxIcon fontSize="inherit" />
                    {f}
                  </span>
                </button>
              )
            })}
          </div>

          <motion.div className="card overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {txLoading ? (
              <div className="p-5 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="flex gap-3"><Skeleton className="w-10 h-10 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-1/2" /></div><Skeleton className="h-4 w-20" /></div>)}</div>
            ) : filter === 'REDEEM' ? (
              redeemRows.length === 0 ? (
                <div className="text-center py-12"><div className="inline-flex mb-3"><Icon8 name="info" size={36} /></div><p style={{ color: 'var(--text-muted)' }}>No redeem history found</p></div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {redeemRows.map((row, i) => {
                    if (row.kind === 'wallet') {
                      const tx = row.tx
                      return (
                        <motion.div key={`wallet-redeem-${tx.id}`} className="flex items-center gap-4 px-5 py-4"
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                            style={{ background: '#fee2e2', color: '#b91c1c' }}>
                            <Icon8 name="wallet" size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Redeem (Wallet)</span>
                              <StatusBadge status={tx.status} />
                            </div>
                            <div className="text-xs truncate mt-0.5" style={{ color: softMuted }}>
                              {tx.description || `Ref: ${tx.referenceId}`} · {formatDate(tx.createdAt)}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-sm" style={{ color: 'var(--danger)' }}>
                              -{formatCurrency(tx.amount)}
                            </div>
                          </div>
                        </motion.div>
                      )
                    }

                    const tx = row.tx
                    const redeemKind = classifyRedeemKind(tx.description)
                    return (
                      <motion.div key={`reward-redeem-${tx.id}`} className="flex items-center gap-4 px-5 py-4"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                          style={{ background: '#ede9fe', color: '#7c3aed' }}>
                          <Icon8 name={redeemKind === 'POINTS' ? 'wallet' : 'rewards'} size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                              {redeemKind === 'POINTS' ? 'Redeem (Points to Cash)' : 'Redeem (Catalog)'}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'var(--bg-primary)', color: softSecondary, border: '1px solid var(--border)' }}>
                              REWARDS
                            </span>
                          </div>
                          <div className="text-xs truncate mt-0.5" style={{ color: softMuted }}>
                            {tx.description || 'Reward redemption'} · {formatDate(tx.createdAt)}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-sm" style={{ color: 'var(--danger)' }}>
                            -{tx.points} pts
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )
            ) : txList.length === 0 ? (
              <div className="text-center py-12"><div className="inline-flex mb-3"><Icon8 name="info" size={36} /></div><p style={{ color: 'var(--text-muted)' }}>No transactions found</p></div>
            ) : (
              <>
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {txList.map((tx, i) => {
                    const TxIcon = getTxIcon(tx.type)
                    const credit = isCreditForUser(tx, user?.id)
                    const counterparty = getTransferCounterparty(tx, user?.id)
                    const descriptor = counterparty
                      ? `${counterparty}${tx.description && tx.description !== 'Transfer' ? ` - ${tx.description}` : ''}`
                      : (tx.description || `Ref: ${tx.referenceId}`)
                    return (
                      <motion.div key={tx.id} className="flex items-center gap-4 px-5 py-4"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                          style={{ background: credit ? '#dcfce7' : '#fee2e2', color: credit ? '#15803d' : '#b91c1c' }}>
                          <TxIcon fontSize="inherit" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{tx.type}</span>
                            <StatusBadge status={tx.status} />
                          </div>
                          <div className="text-xs truncate mt-0.5" style={{ color: softMuted }}>{descriptor} · {formatDate(tx.createdAt)}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-sm" style={{ color: credit ? 'var(--success)' : 'var(--danger)' }}>
                            {credit ? '+' : '-'}{formatCurrency(tx.amount)}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary py-1.5 px-4 text-xs" style={{ opacity: page === 0 ? 0.4 : 1 }} aria-label="Previous page">← Prev</button>
                  <span className="text-xs" style={{ color: softMuted }}>Page {page + 1} of {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-secondary py-1.5 px-4 text-xs" style={{ opacity: page >= totalPages - 1 ? 0.4 : 1 }} aria-label="Next page">Next →</button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}

      {tab === 'ledger' && (
        <motion.div className="card overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {!ledger?.content?.length ? (
            <div className="text-center py-12"><div className="inline-flex mb-3"><Icon8 name="transactions" size={36} /></div><p style={{ color: 'var(--text-muted)' }}>No ledger entries</p></div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {ledger.content.map((e, i) => (
                <motion.div key={e.id} className="flex items-center gap-4 px-5 py-4"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: e.type === 'CREDIT' ? '#dcfce7' : '#fee2e2', color: e.type === 'CREDIT' ? '#15803d' : '#b91c1c' }}>{e.type === 'CREDIT' ? '↑' : '↓'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{e.description || e.type}</div>
                    <div className="text-xs" style={{ color: softMuted }}>Ref: {e.referenceId} · {formatDate(e.createdAt)}</div>
                  </div>
                  <div className="font-bold text-sm" style={{ color: e.type === 'CREDIT' ? 'var(--success)' : 'var(--danger)' }}>
                    {e.type === 'CREDIT' ? '+' : '-'}{formatCurrency(e.amount)}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
export default TransactionsPage
