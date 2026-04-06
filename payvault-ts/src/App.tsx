import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from './shared/hooks'
import { seedNotifications } from './store/notificationSlice'
import { LoadingScreen, NotFoundPage } from './shared/components/ui'
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
// ── Guards ─────────────────────────────────────────────────────────────────────
const RequireAuth: React.FC<{ requireKyc?: boolean; adminOnly?: boolean }> = ({ requireKyc, adminOnly }) => {
  const { accessToken, user } = useAppSelector(s => s.auth)
  if (!accessToken) return <Navigate to="/login" replace />
  if (adminOnly && user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />
  if (requireKyc && user?.kycStatus !== 'APPROVED') return <Navigate to="/kyc" replace />
  return <Outlet />
}

export default function App() {
  const dispatch = useAppDispatch()
  const { accessToken } = useAppSelector(s => s.auth)

  useEffect(() => {
    if (accessToken) dispatch(seedNotifications())
  }, [accessToken, dispatch])

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
            <Route element={<RequireAuth requireKyc />}>
              <Route path="/wallet"       element={<WalletPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/rewards"      element={<RewardsPage />} />
            </Route>

            {/* Admin-only routes */}
            <Route element={<RequireAuth adminOnly />}>
              <Route path="/admin"        element={<AdminDashboard />} />
              <Route path="/admin/users"  element={<AdminUsers />} />
              <Route path="/admin/kyc"    element={<AdminKyc />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
