import React, { useState } from 'react'

type Icon8Name =
  | 'dashboard'
  | 'wallet'
  | 'transactions'
  | 'rewards'
  | 'kyc'
  | 'profile'
  | 'overview'
  | 'users'
  | 'review'
  | 'wave'
  | 'sun'
  | 'moon'
  | 'bell'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'eye'
  | 'eyeOff'
  | 'logout'
  | 'shield'
  | 'topup'
  | 'transfer'
  | 'withdraw'
  | 'target'
  | 'lock'
  | 'star'
  | 'clock'
  | 'calendar'
  | 'new'
  | 'blocked'

const ICONS: Record<Icon8Name, string> = {
  dashboard: 'https://img.icons8.com/fluency/48/speed.png',
  wallet: 'https://img.icons8.com/fluency/48/bank-card-back-side.png',
  transactions: 'https://img.icons8.com/fluency/48/combo-chart.png',
  rewards: 'https://img.icons8.com/fluency/48/gift.png',
  kyc: 'https://img.icons8.com/fluency/48/identity-document.png',
  profile: 'https://img.icons8.com/fluency/48/user-male-circle.png',
  overview: 'https://img.icons8.com/fluency/48/government.png',
  users: 'https://img.icons8.com/fluency/48/conference-call.png',
  review: 'https://img.icons8.com/fluency/48/task-completed.png',
  wave: 'https://img.icons8.com/fluency/48/waving-hand.png',
  sun: 'https://img.icons8.com/fluency/48/sun.png',
  moon: 'https://img.icons8.com/fluency/48/crescent-moon.png',
  bell: 'https://img.icons8.com/fluency/48/appointment-reminders.png',
  success: 'https://img.icons8.com/fluency/48/ok.png',
  error: 'https://img.icons8.com/fluency/48/cancel.png',
  warning: 'https://img.icons8.com/fluency/48/error.png',
  info: 'https://img.icons8.com/fluency/48/info.png',
  eye: 'https://img.icons8.com/fluency/48/visible.png',
  eyeOff: 'https://img.icons8.com/fluency/48/closed-eye.png',
  logout: 'https://img.icons8.com/fluency/48/exit.png',
  shield: 'https://img.icons8.com/fluency/48/shield.png',
  topup: 'https://img.icons8.com/fluency/48/plus-math.png',
  transfer: 'https://img.icons8.com/fluency/48/switch.png',
  withdraw: 'https://img.icons8.com/fluency/48/minus-math.png',
  target: 'https://img.icons8.com/fluency/48/goal.png',
  lock: 'https://img.icons8.com/fluency/48/lock.png',
  star: 'https://img.icons8.com/fluency/48/star.png',
  clock: 'https://img.icons8.com/fluency/48/hourglass.png',
  calendar: 'https://img.icons8.com/fluency/48/calendar.png',
  new: 'https://img.icons8.com/fluency/48/new.png',
  blocked: 'https://img.icons8.com/fluency/48/no-entry.png',
}

interface Icon8Props {
  name: Icon8Name
  size?: number
  className?: string
  alt?: string
}

export const Icon8: React.FC<Icon8Props> = ({ name, size = 20, className, alt }) => {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span
        aria-hidden="true"
        className={className}
        style={{
          width: size,
          height: size,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 9999,
          background: 'rgba(255,255,255,0.16)',
          fontSize: Math.max(9, Math.round(size * 0.45)),
          fontWeight: 700,
        }}
      >
        {name[0].toUpperCase()}
      </span>
    )
  }

  return (
    <img
      src={ICONS[name]}
      alt={alt ?? `${name} icon`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  )
}
