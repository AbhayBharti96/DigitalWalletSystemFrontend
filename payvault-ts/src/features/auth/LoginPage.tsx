// LoginPage.tsx
import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import { useAppDispatch, useAppSelector } from '../../shared/hooks'
import { loginUser, clearError } from '../../store/authSlice'
import { addNotification } from '../../store/notificationSlice'
import { Icon8 } from '../../shared/components/Icon8'

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { loading, error } = useAppSelector(s => s.auth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const res = await dispatch(loginUser(form))
    if (loginUser.fulfilled.match(res)) {
      dispatch(addNotification({ type: 'success', title: 'Welcome back!', message: `Signed in as ${res.payload.user.fullName}` }))
      toast.success('Welcome back!')
      navigate('/dashboard')
    } else {
      toast.error(res.payload as string || 'Login failed')
    }
  }

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-2xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Welcome back</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Sign in to your PayVault account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Email Address
          </label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com"
            value={form.email} onChange={e => { setForm(p => ({ ...p, email: e.target.value })); dispatch(clearError()) }}
            className="input-field" required aria-required="true" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Password
            </label>
            <Link to="/forgot-password" className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input id="password" name="password" type={showPass ? 'text' : 'password'} autoComplete="current-password"
              placeholder="••••••••" value={form.password}
              onChange={e => { setForm(p => ({ ...p, password: e.target.value })); dispatch(clearError()) }}
              className="input-field pr-10" required aria-required="true" />
            <button type="button" onClick={() => setShowPass(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label={showPass ? 'Hide password' : 'Show password'}
              style={{ color: 'var(--text-muted)' }}>
              {showPass
                ? <VisibilityOffOutlinedIcon sx={{ fontSize: 18, color: 'var(--text-muted)', opacity: 0.85 }} />
                : <VisibilityOutlinedIcon sx={{ fontSize: 18, color: 'var(--text-muted)', opacity: 0.85 }} />
              }
            </button>
          </div>
        </div>

        {error && (
          <motion.div className="px-4 py-3 rounded-xl text-sm" role="alert"
            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-1"><Icon8 name="warning" size={14} /> {error}</span>
          </motion.div>
        )}

        <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-sm">
          {loading
            ? <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in…
              </span>
            : 'Sign In →'
          }
        </button>
      </form>

      <div className="mt-4 p-3 rounded-xl text-xs" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Demo:</strong> admin@payvault.com / Admin@1234
      </div>

      <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
        Don't have an account?{' '}
        <Link to="/signup" className="font-semibold" style={{ color: 'var(--brand)' }}>Create one →</Link>
      </p>
    </div>
  )
}
