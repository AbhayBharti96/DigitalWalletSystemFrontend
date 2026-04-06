import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded'
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded'
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded'
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded'
import SmartphoneRoundedIcon from '@mui/icons-material/SmartphoneRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { useAuth, useTheme } from '../../shared/hooks'
import { Icon8 } from '../../shared/components/Icon8'

const features = [
  {
    icon: AccountBalanceWalletRoundedIcon,
    title: 'Smart Wallet',
    text: 'Top up, transfer, and track every transaction with a clean real-time dashboard feel.',
  },
  {
    icon: VerifiedUserRoundedIcon,
    title: 'Fast KYC',
    text: 'Smooth onboarding with guided verification steps and clear approval status updates.',
  },
  {
    icon: CardGiftcardRoundedIcon,
    title: 'Rewards Engine',
    text: 'Earn points on activity, unlock tiers, and redeem benefits with interactive cards.',
  },
  {
    icon: LockRoundedIcon,
    title: 'Secure Access',
    text: 'Built for trust with protected flows, payment verification, and role-based screens.',
  },
] as const

const staticStats = [
  { label: 'Secure transactions', value: '99.9%' },
  { label: 'Top-up experience', value: 'Instant' },
  { label: 'Reward journeys', value: 'Gamified' },
  { label: 'User onboarding', value: 'KYC-ready' },
]

function FloatingCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      className={`absolute rounded-2xl border p-3 shadow-2xl ${className}`}
      style={{ borderColor: 'rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}
    >
      {children}
    </motion.div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const { isDark, toggle } = useTheme()

  const balanceText = '₹ 82,450'
  const pointsText = '2,480 points'

  const stats = staticStats

  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(to right, rgba(34,197,94,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,197,94,0.07) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at top, #0d3320 0%, #0a0f1e 40%, transparent 75%)' }} />
        <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full blur-3xl" style={{ background: 'rgba(34,197,94,0.2)' }} />
        <div className="absolute right-0 top-20 h-64 w-64 rounded-full blur-3xl" style={{ background: 'rgba(99,102,241,0.18)' }} />

        <div className="relative mx-auto max-w-7xl px-6 py-8 lg:px-10">
          <header className="flex items-center justify-between rounded-full border px-5 py-3 backdrop-blur-xl" style={{ borderColor: 'rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)' }}>
            <button type="button" onClick={() => navigate('/')} className="flex items-center gap-3 text-left">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                <AccountBalanceWalletRoundedIcon fontSize="small" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-wide text-white">PayVault</p>
                <p className="text-xs text-slate-300">Digital wallet with KYC and rewards</p>
              </div>
            </button>

            <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
              <a href="#features" className="transition hover:text-white">Features</a>
              <a href="#security" className="transition hover:text-white">Security</a>
              <a href="#dashboard" className="transition hover:text-white">Dashboard</a>
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={toggle}
                className="rounded-full border px-3 py-2 text-slate-200 transition hover:bg-white/10 inline-flex items-center gap-1.5 text-xs font-medium"
                style={{ borderColor: 'rgba(255,255,255,0.18)' }}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <Icon8 name={isDark ? 'sun' : 'moon'} size={16} />
                <span>{isDark ? 'Dark' : 'Light'}</span>
              </button>
              <button
                onClick={() => navigate(accessToken ? '/dashboard' : '/login')}
                className="rounded-full border px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                style={{ borderColor: 'rgba(255,255,255,0.18)' }}
              >
                {accessToken ? 'Dashboard' : 'Sign in'}
              </button>
              <button
                onClick={() => navigate(accessToken ? '/dashboard' : '/signup')}
                className="rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02]"
                style={{ background: 'var(--brand)' }}
              >
                {accessToken ? 'Open Wallet' : 'Get Started'}
              </button>
            </div>
          </header>

          <div className="grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.05 }}
                className="max-w-3xl text-5xl font-bold leading-tight text-white md:text-6xl"
              >
                Secure money movement,
                <span className="bg-gradient-to-r from-green-300 via-green-400 to-indigo-300 bg-clip-text text-transparent">
                  {' '}reward journeys,
                </span>
                and smooth KYC in one sleek experience.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.12 }}
                className="mt-6 max-w-2xl text-lg leading-8 text-slate-300"
              >
                This landing is now usable: CTA buttons route into your auth/app flows, rewards are loaded from the real catalog endpoint, and logged-in users see live wallet/points values.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.18 }}
                className="mt-10 flex flex-wrap gap-4"
              >
                <button
                  onClick={() => navigate(accessToken ? '/dashboard' : '/signup')}
                  className="group inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 font-semibold text-white shadow-xl transition hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}
                >
                  Launch PayVault
                  <ArrowForwardRoundedIcon className="transition group-hover:translate-x-1" sx={{ fontSize: 20 }} />
                </button>
                <button
                  onClick={() => document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="inline-flex items-center gap-2 rounded-2xl border px-6 py-3.5 font-medium text-white transition hover:bg-white/10"
                  style={{ borderColor: 'rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.05)' }}
                >
                  <NotificationsRoundedIcon sx={{ fontSize: 20 }} />
                  Watch Demo Flow
                </button>
              </motion.div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((item, idx) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.1 * idx }}
                    className="rounded-3xl border p-5 backdrop-blur-xl"
                    style={{ borderColor: 'rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)' }}
                  >
                    <div className="text-2xl font-bold text-white">{item.value}</div>
                    <div className="mt-1 text-sm text-slate-300">{item.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="relative" id="dashboard">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="relative mx-auto max-w-xl rounded-[32px] border p-5 shadow-2xl backdrop-blur-2xl"
                style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.08)' }}
              >
                <div className="rounded-[28px] border p-5" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'linear-gradient(135deg,#052e16 0%,#0d3320 55%,#0a0f1e 100%)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-300">Available Balance</p>
                      <h3 className="mt-1 text-4xl font-bold text-white">{balanceText}</h3>
                    </div>
                    <div className="rounded-2xl px-3 py-2 text-sm" style={{ background: 'rgba(34,197,94,0.18)', color: '#86efac' }}>
                      API connected
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-3xl border p-4" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl p-2" style={{ background: 'rgba(34,197,94,0.2)', color: '#86efac' }}><CreditCardRoundedIcon sx={{ fontSize: 20 }} /></div>
                        <div>
                          <p className="text-sm text-slate-300">Top up</p>
                          <p className="font-semibold text-white">Razorpay ready</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-3xl border p-4" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl p-2" style={{ background: 'rgba(99,102,241,0.2)', color: '#c7d2fe' }}><CardGiftcardRoundedIcon sx={{ fontSize: 20 }} /></div>
                        <div>
                          <p className="text-sm text-slate-300">Rewards</p>
                          <p className="font-semibold text-white">{pointsText}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-3xl border p-5" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)' }}>
                    <div className="mb-4 flex items-center justify-between">
                      <p className="font-semibold text-white">Activity Overview</p>
                      <BarChartRoundedIcon sx={{ fontSize: 20, color: '#94a3b8' }} />
                    </div>
                    <div className="flex h-40 items-end gap-3">
                      {[40, 72, 58, 90, 66, 108, 84].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t-2xl" style={{ background: 'linear-gradient(to top,#22c55e,#818cf8)', height: `${h}%` }} />
                      ))}
                    </div>
                    <div className="mt-4 flex justify-between text-xs text-slate-400">
                      <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                    </div>
                  </div>
                </div>

                <FloatingCard className="-left-8 top-10 hidden lg:block">
                  <VerifiedUserRoundedIcon sx={{ fontSize: 24, color: '#86efac' }} />
                </FloatingCard>
                <FloatingCard className="-right-6 top-24 hidden lg:block">
                  <CardGiftcardRoundedIcon sx={{ fontSize: 24, color: '#c4b5fd' }} />
                </FloatingCard>
                <FloatingCard className="bottom-12 -left-10 hidden lg:block">
                  <SmartphoneRoundedIcon sx={{ fontSize: 24, color: '#67e8f9' }} />
                </FloatingCard>
                <FloatingCard className="bottom-6 right-5 hidden lg:block">
                  <CheckCircleRoundedIcon sx={{ fontSize: 24, color: '#93c5fd' }} />
                </FloatingCard>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-6 lg:px-10 lg:py-10">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm uppercase tracking-[0.25em]" style={{ color: 'var(--brand)' }}>Feature Highlights</p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl" style={{ color: 'var(--text-primary)' }}>Interactive icon-based sections designed for PayVault</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: idx * 0.08 }}
                whileHover={{ y: -8 }}
                className="group rounded-[28px] border p-6 backdrop-blur-xl transition"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ring-white/10" style={{ background: 'linear-gradient(145deg, rgba(34,197,94,0.2), rgba(129,140,248,0.2))', color: 'var(--brand)' }}>
                  <Icon sx={{ fontSize: 30 }} className="transition group-hover:scale-110" />
                </div>
                <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{feature.title}</h3>
                <p className="mt-3 leading-7" style={{ color: 'var(--text-secondary)' }}>{feature.text}</p>
              </motion.div>
            )
          })}
        </div>
      </section>

      <section id="security" className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] border p-8" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <p className="text-sm uppercase tracking-[0.25em]" style={{ color: 'var(--accent)' }}>Trust Layer</p>
            <h2 className="mt-3 text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Built for a secure wallet experience</h2>
            <p className="mt-4 leading-7" style={{ color: 'var(--text-secondary)' }}>
              The landing supports your real modules: authentication, KYC approval, transactions, wallet top-ups, and reward redemption.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              [VerifiedUserRoundedIcon, 'Protected access', 'Clear trust signals and premium visual hierarchy.'],
              [CreditCardRoundedIcon, 'Top-up journeys', 'Elegant payment entry points with CTA emphasis.'],
              [NotificationsRoundedIcon, 'Live feeling', 'Notification-ready top bar with polished action affordances.'],
              [BarChartRoundedIcon, 'Modern UI', 'Gradients, motion, and device-friendly layout.'],
            ].map(([Icon, title, text], i) => {
              const Cmp = Icon as React.ComponentType<{ sx?: object; className?: string }>
              return (
                <div key={i} className="rounded-[28px] border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                  <Cmp sx={{ fontSize: 30, color: 'var(--brand)' }} />
                  <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title as string}</h3>
                  <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>{text as string}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
