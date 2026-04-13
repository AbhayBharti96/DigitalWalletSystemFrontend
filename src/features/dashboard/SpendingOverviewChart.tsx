import React from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '../../shared/utils'
import { Skeleton } from '../../shared/components/ui'

type SpendingPoint = { d: string; v: number; credit: number; debit: number }

const CustomTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const debit = payload.find((entry: any) => entry.dataKey === 'debit')?.value ?? 0
  const credit = payload.find((entry: any) => entry.dataKey === 'credit')?.value ?? 0
  return (
    <div className="card px-3 py-2 text-xs">
      <div style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="font-bold" style={{ color: '#15803d' }}>Credit: {formatCurrency(credit)}</div>
      <div className="font-bold" style={{ color: '#b91c1c' }}>Debit: {formatCurrency(debit)}</div>
    </div>
  )
}

export default function SpendingOverviewChart({ data, loading = false }: { data: SpendingPoint[]; loading?: boolean }) {
  if (loading) {
    return <Skeleton className="h-[180px] w-full rounded-2xl" />
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="creditArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="debitArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
        <YAxis hide />
        <Tooltip content={<CustomTip />} />
        <Area type="monotone" dataKey="credit" stroke="#22c55e" strokeWidth={2} fill="url(#creditArea)" dot={false} activeDot={{ r: 4, fill: '#22c55e' }} />
        <Area type="monotone" dataKey="debit" stroke="#ef4444" strokeWidth={2} fill="url(#debitArea)" dot={false} activeDot={{ r: 4, fill: '#ef4444' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
