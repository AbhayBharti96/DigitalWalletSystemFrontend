import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAppDispatch, useAppSelector, useTheme } from '../../shared/hooks'
import { fetchTransactions, fetchLedger } from '../../store/walletSlice'
import { fetchRewardTransactions } from '../../store/rewardsSlice'
import { walletService } from '../../services'
import { getApiErrorMessage } from '../../shared/apiErrors'
import { formatCurrency, formatDate, getTransferCounterparty, getTransactionAmountDisplay, getTxIcon } from '../../shared/utils'
import { Skeleton, StatusBadge } from '../../shared/components/ui'
import type { TxType, RewardTransaction, Transaction } from '../../types'
import { Icon8 } from '../../shared/components/Icon8'
import { getFirstError, transactionDateRangeSchema } from '../../shared/validation'

const TX_TYPES: TxType[] = ['TOPUP', 'TRANSFER', 'WITHDRAW', 'CASHBACK', 'REDEEM']

type RedeemRow =
  | { kind: 'wallet'; id: number; createdAt: string; tx: Transaction }
  | { kind: 'reward'; id: number; createdAt: string; tx: RewardTransaction }

const classifyRedeemKind = (description?: string | null): 'CATALOG' | 'POINTS' => {
  const text = (description || '').toLowerCase()
  if (text.includes('cash') || text.includes('wallet') || text.includes('convert')) return 'POINTS'
  return 'CATALOG'
}

const transactionSkeletonKeys = [
  'transactions-skeleton-1',
  'transactions-skeleton-2',
  'transactions-skeleton-3',
  'transactions-skeleton-4',
  'transactions-skeleton-5',
]

const transactionDescriptor = (counterparty: string | null, description?: string, referenceId?: string) => {
  if (!counterparty) return description || `Ref: ${referenceId}`
  if (description && description !== 'Transfer') return `${counterparty} - ${description}`
  return counterparty
}

const transactionToneStyle = (tone: 'credit' | 'debit' | 'muted', mutedColor: string) => {
  if (tone === 'credit') return { background: '#dcfce7', color: '#15803d', amountColor: 'var(--success)' }
  if (tone === 'debit') return { background: '#fee2e2', color: '#b91c1c', amountColor: 'var(--danger)' }
  return { background: 'var(--bg-primary)', color: mutedColor, amountColor: mutedColor }
}

export function TransactionsPage() {
  const dispatch = useAppDispatch()
  const { isDark } = useTheme()
  const { user } = useAppSelector(s => s.auth)
  const { transactions, ledger, txLoading } = useAppSelector(s => s.wallet)
  const { transactions: rewardTxns } = useAppSelector(s => s.rewards)
  const [tab, setTab] = useState<'txn' | 'ledger'>('txn')
  const [filter, setFilter] = useState<TxType | 'ALL'>('ALL')
  const [page, setPage] = useState(0)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [exportFormat, setExportFormat] = useState<'CSV' | 'PDF'>('CSV')

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchTransactions({ page, size: 12 }))
      dispatch(fetchLedger({}))
      dispatch(fetchRewardTransactions())
    }
  }, [dispatch, user?.id, page])

  const download = async () => {
    const dateRangeResult = transactionDateRangeSchema.safeParse({ from, to })
    if (!dateRangeResult.success) { toast.error(getFirstError(dateRangeResult.error)); return }
    setDownloading(true)
    try {
      const resp = await walletService.downloadStatement(user!.id, dateRangeResult.data.from, dateRangeResult.data.to)
      const url = URL.createObjectURL(resp.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `statement_${dateRangeResult.data.from}_${dateRangeResult.data.to}.csv`
      a.click()
      toast.success('Statement downloaded!')
    } catch {
      toast.error('Download failed')
    } finally {
      setDownloading(false)
    }
  }

  const exportPdf = async () => {
    const dateRangeResult = transactionDateRangeSchema.safeParse({ from, to })
    if (!dateRangeResult.success) { toast.error(getFirstError(dateRangeResult.error)); return }

    setPdfLoading(true)
    try {
      const { data: rows } = await walletService.statement(user!.id, dateRangeResult.data.from, dateRangeResult.data.to)
      const escapeHtml = (value?: string | number | null) => String(value ?? '')
        .split('&').join('&amp;')
        .split('<').join('&lt;')
        .split('>').join('&gt;')
        .split('"').join('&quot;')
        .split('\'').join('&#39;')

      const tableRows = rows.length === 0
        ? '<tr><td colspan="6" class="empty">No transactions found for this date range.</td></tr>'
        : rows.map(tx => {
            const amountDisplay = getTransactionAmountDisplay(tx, user?.id)
            const counterparty = getTransferCounterparty(tx, user?.id)
            const details = transactionDescriptor(counterparty, tx.description, tx.referenceId) || '-'

            return `
              <tr>
                <td>${escapeHtml(formatDate(tx.createdAt, 'DD MMM YYYY, hh:mm A'))}</td>
                <td>${escapeHtml(tx.type)}</td>
                <td>${escapeHtml(details)}</td>
                <td>${escapeHtml(tx.referenceId || '-')}</td>
                <td>${escapeHtml(tx.status)}</td>
                <td class="amount ${escapeHtml(amountDisplay.tone)}" title="${escapeHtml(amountDisplay.tooltip || '')}">${escapeHtml(amountDisplay.value)}</td>
              </tr>
            `
          }).join('')

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>PayVault Statement</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px; font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; background: #ffffff; }
    .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; border-bottom: 2px solid #dcfce7; padding-bottom: 16px; }
    .brand { margin: 0 0 8px; font-size: 28px; font-weight: 800; color: #166534; }
    .meta, .summary { font-size: 13px; line-height: 1.6; color: #475569; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #dbeafe; padding: 10px 12px; text-align: left; vertical-align: top; font-size: 12px; }
    th { background: #f0fdf4; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    tr:nth-child(even) td { background: #fcfffd; }
    .amount { white-space: nowrap; font-weight: 700; }
    .credit { color: #15803d; }
    .debit { color: #b91c1c; }
    .empty { text-align: center; color: #64748b; padding: 24px; }
    .print-note { margin-top: 8px; font-size: 12px; }
    @media print { body { padding: 20px; } .print-note { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="brand">PayVault Statement</h1>
      <div class="meta">
        <div><strong>User:</strong> ${escapeHtml(user?.fullName || 'User')}</div>
        <div><strong>Email:</strong> ${escapeHtml(user?.email || '-')}</div>
        <div><strong>Period:</strong> ${escapeHtml(dateRangeResult.data.from)} to ${escapeHtml(dateRangeResult.data.to)}</div>
      </div>
    </div>
    <div class="summary">
      <div><strong>Generated:</strong> ${escapeHtml(formatDate(new Date().toISOString(), 'DD MMM YYYY, hh:mm A'))}</div>
      <div><strong>Total Rows:</strong> ${escapeHtml(rows.length)}</div>
      <div class="print-note">Choose "Save as PDF" in the print dialog.</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Description</th>
        <th>Reference</th>
        <th>Status</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  <script>
    globalThis.onload = function () {
      setTimeout(function () { globalThis.print(); }, 250);
    };
  </script>
</body>
</html>`

      const htmlUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
      const printWindow = globalThis.open(htmlUrl, '_blank', 'width=1200,height=900')
      if (!printWindow) {
        URL.revokeObjectURL(htmlUrl)
        toast.error('Allow pop-ups to export PDF')
        return
      }
      toast.success('PDF export opened')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'PDF export failed'))
    } finally {
      setPdfLoading(false)
    }
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

      <motion.div className="card p-4 flex flex-wrap gap-3 items-end" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div><label htmlFor="from-date" className="block text-xs font-semibold mb-1" style={{ color: softMuted }}>From</label>
          <input id="from-date" type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-field py-2 text-sm" /></div>
        <div><label htmlFor="to-date" className="block text-xs font-semibold mb-1" style={{ color: softMuted }}>To</label>
          <input id="to-date" type="date" value={to} onChange={e => setTo(e.target.value)} className="input-field py-2 text-sm" /></div>
        <div className="sm:ml-auto flex items-end gap-2">
          <div>
            <label htmlFor="export-format" className="block text-xs font-semibold mb-1" style={{ color: softMuted }}>Export</label>
            <select
              id="export-format"
              value={exportFormat}
              onChange={e => setExportFormat(e.target.value as 'CSV' | 'PDF')}
              className="input-field py-2 text-sm min-w-[120px]"
            >
              <option value="CSV">CSV</option>
              <option value="PDF">PDF</option>
            </select>
          </div>
          <button
            onClick={() => { if (exportFormat === 'PDF') { void exportPdf() } else { void download() } }}
            disabled={downloading || pdfLoading}
            className="btn-primary py-2.5 text-sm flex items-center gap-2"
          >
            <span aria-hidden="true" className="inline-flex"><Icon8 name="transactions" size={14} /></span>
            {pdfLoading ? 'Preparing PDF...' : null}
            {!pdfLoading && downloading ? 'Downloading...' : null}
            {!pdfLoading && !downloading ? 'Export Statement' : null}
          </button>
        </div>
      </motion.div>

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
          <fieldset className="flex flex-wrap gap-2" aria-label="Filter transactions">
            {(['ALL', ...TX_TYPES] as const).map(f => {
              if (f === 'ALL') {
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{ background: filter === f ? 'var(--brand)' : 'var(--bg-card)', color: filter === f ? '#fff' : softSecondary, border: `1px solid ${filter === f ? 'var(--brand)' : 'var(--border)'}` }}
                  >
                    All
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
          </fieldset>

          <motion.div className="card overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {txLoading ? (
              <div className="p-5 space-y-3">{transactionSkeletonKeys.map(key => <div key={key} className="flex gap-3"><Skeleton className="w-10 h-10 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-1/2" /></div><Skeleton className="h-4 w-20" /></div>)}</div>
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
                    const amountDisplay = getTransactionAmountDisplay(tx, user?.id)
                    const counterparty = getTransferCounterparty(tx, user?.id)
                    const descriptor = transactionDescriptor(counterparty, tx.description, tx.referenceId)
                    const toneStyle = transactionToneStyle(amountDisplay.tone, softMuted)
                    return (
                      <motion.div key={tx.id} className="flex items-center gap-4 px-5 py-4"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                          style={{
                            background: toneStyle.background,
                            color: toneStyle.color,
                          }}>
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
                          <div
                            className="font-bold text-sm"
                            style={{ color: toneStyle.amountColor }}
                            title={amountDisplay.tooltip}
                          >
                            {amountDisplay.value}
                          </div>
                          {amountDisplay.tooltip && (
                            <div className="text-[11px] mt-0.5" style={{ color: softMuted }}>
                              {amountDisplay.tooltip}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary py-1.5 px-4 text-xs" style={{ opacity: page === 0 ? 0.4 : 1 }} aria-label="Previous page">Prev</button>
                  <span className="text-xs" style={{ color: softMuted }}>Page {page + 1} of {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-secondary py-1.5 px-4 text-xs" style={{ opacity: page >= totalPages - 1 ? 0.4 : 1 }} aria-label="Next page">Next</button>
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
                    style={{ background: e.type === 'CREDIT' ? '#dcfce7' : '#fee2e2', color: e.type === 'CREDIT' ? '#15803d' : '#b91c1c' }}>{e.type === 'CREDIT' ? '+' : '-'}</div>
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
