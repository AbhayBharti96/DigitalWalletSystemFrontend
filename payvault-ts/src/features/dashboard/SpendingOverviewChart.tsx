import React from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '../../shared/utils'

type SpendingPoint = { d: string; v: number }

const CustomTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs">
      <div style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="font-bold" style={{ color: 'var(--brand)' }}>{formatCurrency(payload[0].value)}</div>
    </div>
  )
}

export default function SpendingOverviewChart({ data }: { data: SpendingPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
        <YAxis hide />
        <Tooltip content={<CustomTip />} />
        <Area type="monotone" dataKey="v" stroke="#22c55e" strokeWidth={2} fill="url(#ga)" dot={false} activeDot={{ r: 4, fill: '#22c55e' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

