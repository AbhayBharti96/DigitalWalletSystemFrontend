import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useAppSelector, useAppDispatch } from './shared/hooks'
import { addNotification, seedNotifications } from './store/notificationSlice'
import { resetWalletState } from './store/walletSlice'
import { resetRewardsState } from './store/rewardsSlice'
import { authService, kycService, userService } from './services'
import { syncSession, updateCurrentUser, updateKycStatus } from './store/authSlice'
import { LoadingScreen, NotFoundPage } from './shared/components/ui'
import { formatCurrency } from './shared/utils'
import type { Transaction } from './types'
import AppLayout from './layouts/AppLayout'
import AuthLayout from './layouts/AuthLayout'
import LandingPage from './features/landing/LandingPage'

const LoginPage        = lazy(() => import('./features/auth/LoginPage'))
const SignupPage       = lazy(() => import('./features/auth/SignupPage'))
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage'))
const DashboardPage    = lazy(() => import('./features/dashboard/DashboardPage'))
const WalletPage       = lazy(() => import('./features/wallet/WalletPage'))
const TransactionsPage = lazy(() => import('./features/transactions/TransactionsPage'))
const RewardsPage      = lazy(() => import('./features/rewards/RewardsPage'))
const KycPage          = lazy(() => import('./features/kyc/KycPage'))
const ProfilePage      = lazy(() => import('./features/profile/ProfilePage'))
const AdminDashboard   = lazy(() => import('./features/admin/AdminDashboard'))
const AdminUsers       = lazy(() => import('./features/admin/AdminUsers'))
const AdminKyc         = lazy(() => import('./features/admin/AdminKyc'))
const AdminCatalog     = lazy(() => import('./features/admin/AdminCatalog'))
const seenTransactionStorageKey = (userId: number) => `payvault:seen-transactions:${userId}`

const transactionNotificationForUser = (tx: Transaction, currentUserId: number) => {
  if (tx.type !== 'TRANSFER') return null

  if (tx.receiverId === currentUserId) {
    return {
      type: 'success' as const,
      title: 'Money Received',
      message: `${formatCurrency(tx.amount)} credited to your wallet${tx.senderId ? ` from User #${tx.senderId}` : ''}.`,
    }
  }

  return null
}
// ── Guards ─────────────────────────────────────────────────────────────────────
const RequireAuth: React.FC<{ requireKyc?: boolean; adminOnly?: boolean; kycReady?: boolean }> = ({ requireKyc, adminOnly, kycReady = true }) => {
  const { accessToken, user } = useAppSelector(s => s.auth)
  const bypassKycGate = user?.role === 'ADMIN'
  if (!accessToken) return <Navigate to="/login" replace />
  if (adminOnly && user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />
  if (requireKyc && !bypassKycGate && !kycReady) return <LoadingScreen />
  if (requireKyc && !bypassKycGate && user?.kycStatus !== 'APPROVED') return <Navigate to="/kyc" replace />
  return <Outlet />
}

export default function App() {
  const dispatch = useAppDispatch()
  const { accessToken, refreshToken, user } = useAppSelector(s => s.auth)
  const walletTransactions = useAppSelector(s => s.wallet.transactions?.content ?? [])
  const [authReady, setAuthReady] = useState(false)
  const [kycReady, setKycReady] = useState(false)
  const authSyncedRef = useRef(false)
  const profileSyncUnavailableRef = useRef(false)

  useEffect(() => {
    if (accessToken) dispatch(seedNotifications())
  }, [accessToken, dispatch])

  useEffect(() => {
    if (!accessToken || (user?.role !== 'ADMIN' && user?.kycStatus !== 'APPROVED')) {
      dispatch(resetWalletState())
      dispatch(resetRewardsState())
    }
  }, [accessToken, user?.kycStatus, user?.role, dispatch])

  useEffect(() => {
    if (!accessToken) {
      setAuthReady(true)
      return
    }

    if (!accessToken || !refreshToken || authSyncedRef.current) return

    let active = true
    authSyncedRef.current = true
    setAuthReady(false)

    const syncAuthSession = async () => {
      try {
        const { data } = await authService.refresh(refreshToken)
        if (active) {
          dispatch(syncSession({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            user: data.user,
          }))
        }
      } catch {
        // Let the normal auth interceptor/logout flow handle invalid refresh tokens.
      } finally {
        if (active) setAuthReady(true)
      }
    }

    void syncAuthSession()
    return () => { active = false }
  }, [accessToken, refreshToken, dispatch])

  useEffect(() => {
    if (!accessToken) return

    let active = true

    const syncProfile = async () => {
      if (profileSyncUnavailableRef.current) {
        if (active) setAuthReady(true)
        return
      }

      if (!user?.id) {
        if (active) setAuthReady(true)
        return
      }

      try {
        const { data } = await userService.getProfile(user.id)
        const nextUser = data?.data
        if (!active || !nextUser) return

        const mergedUser = {
          ...user,
          ...nextUser,
          role: nextUser.role || user.role,
        }

        if (nextUser.role && nextUser.role !== user.role && refreshToken) {
          try {
            const refreshed = await authService.refresh(refreshToken)
            if (!active) return
            if (refreshed.data.user?.role === nextUser.role) {
              dispatch(syncSession({
                accessToken: refreshed.data.accessToken,
                refreshToken: refreshed.data.refreshToken,
                user: refreshed.data.user,
              }))
            } else {
              dispatch(updateCurrentUser(mergedUser))
            }
            return
          } catch {
            // Fall back to syncing the cached profile if token refresh fails.
          }
        }

        if (
          mergedUser.role !== user.role ||
          mergedUser.kycStatus !== user.kycStatus ||
          mergedUser.fullName !== user.fullName ||
          mergedUser.phone !== user.phone ||
          mergedUser.status !== user.status ||
          mergedUser.email !== user.email
        ) {
          dispatch(updateCurrentUser(mergedUser))
        }
      } catch (error: any) {
        if (error?.response?.status === 404) {
          profileSyncUnavailableRef.current = true
        }
        // Leave cached auth state in place if profile sync fails.
      } finally {
        if (active) setAuthReady(true)
      }
    }

    const handleFocus = () => { void syncProfile() }

    void syncProfile()
    globalThis.addEventListener('focus', handleFocus)
    return () => {
      active = false
      globalThis.removeEventListener('focus', handleFocus)
    }
  }, [accessToken, refreshToken, user?.id, user?.role, user?.kycStatus, user?.fullName, user?.phone, user?.status, user?.email, dispatch])

  useEffect(() => {
    let active = true

    const syncKycStatus = async () => {
      if (!accessToken || !user?.id) {
        if (active) setKycReady(true)
        return
      }

      if (active) setKycReady(false)
      try {
        const { data } = await kycService.status(user.id)
        const next = data?.data?.status
        if (active && next && next !== user.kycStatus) {
          dispatch(updateKycStatus(next))
        }
      } catch {
        // Keep current user status if status API fails; do not block navigation forever.
      } finally {
        if (active) setKycReady(true)
      }
    }

    void syncKycStatus()
    return () => { active = false }
  }, [accessToken, user?.id, user?.kycStatus, dispatch])

  useEffect(() => {
    if (!user?.id || walletTransactions.length === 0) return

    const storageKey = seenTransactionStorageKey(user.id)
    const transactionIds = walletTransactions.map(tx => tx.id)
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      localStorage.setItem(storageKey, JSON.stringify(transactionIds))
      return
    }

    let seenIds: number[] = []
    try {
      seenIds = JSON.parse(raw) as number[]
    } catch {
      seenIds = []
    }

    const unseenTransactions = walletTransactions.filter(tx => !seenIds.includes(tx.id))
    unseenTransactions.slice().reverse().forEach(tx => {
      const nextNotification = transactionNotificationForUser(tx, user.id)
      if (nextNotification) {
        dispatch(addNotification(nextNotification))
      }
    })

    localStorage.setItem(storageKey, JSON.stringify(Array.from(new Set([...seenIds, ...transactionIds])).slice(0, 200)))
  }, [dispatch, user?.id, walletTransactions])

  if (accessToken && !authReady) {
    return <LoadingScreen />
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Protected app shell */}
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/kyc"       element={<KycPage />} />
            <Route path="/profile"   element={<ProfilePage />} />

            {/* KYC-gated routes */}
            <Route element={<RequireAuth requireKyc kycReady={kycReady} />}>
              <Route path="/wallet"       element={<WalletPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/rewards"      element={<RewardsPage />} />
            </Route>

            {/* Admin-only routes */}
            <Route element={<RequireAuth adminOnly />}>
              <Route path="/admin"        element={<AdminDashboard />} />
              <Route path="/admin/users"  element={<AdminUsers />} />
              <Route path="/admin/kyc"    element={<AdminKyc />} />
              <Route path="/admin/catalog" element={<AdminCatalog />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
