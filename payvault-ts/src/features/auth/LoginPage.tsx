import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAppDispatch, useAppSelector } from '../../shared/hooks'
import { loginUser, clearError, sendOtpThunk, verifyOtpThunk } from '../../store/authSlice'
import { addNotification } from '../../store/notificationSlice'
import { Icon8 } from '../../shared/components/Icon8'
import { digitsOnly, emailSchema, getFieldError, loginPasswordSchema, otpSchema } from '../../shared/validation'

type LoginMode = 'password' | 'otp'
type LoginField = 'email' | 'password' | 'otp'
const fieldValidators = {
  email: emailSchema,
  password: loginPasswordSchema,
  otp: otpSchema,
} as const

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { loading, error } = useAppSelector(s => s.auth)

  const [mode, setMode] = useState<LoginMode>('password')
  const [showPass, setShowPass] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', otp: '' })
  const [errors, setErrors] = useState<Record<LoginField, string>>({ email: '', password: '', otp: '' })
  const [touched, setTouched] = useState<Record<LoginField, boolean>>({ email: false, password: false, otp: false })

  const setFieldError = (field: LoginField, value: string) => {
    setErrors(prev => ({ ...prev, [field]: getFieldError(fieldValidators[field], value) }))
  }

  const handleBlur = (field: LoginField) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    setFieldError(field, form[field])
  }

  const setFieldValue = (field: LoginField, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (touched[field]) setFieldError(field, value)
    dispatch(clearError())
  }

  const resetOtpFlow = () => {
    setOtpSent(false)
    setForm(prev => ({ ...prev, otp: '' }))
    setErrors(prev => ({ ...prev, otp: '' }))
    setTouched(prev => ({ ...prev, otp: false }))
  }

  const switchMode = (nextMode: LoginMode) => {
    setMode(nextMode)
    dispatch(clearError())
    if (nextMode === 'password') {
      resetOtpFlow()
    } else {
      setErrors(prev => ({ ...prev, password: '' }))
      setTouched(prev => ({ ...prev, password: false }))
    }
  }

  const completeLogin = (payload: { user: { fullName: string } }) => {
    dispatch(addNotification({ type: 'success', title: 'Welcome back!', message: `Signed in as ${payload.user.fullName}` }))
    toast.success('Welcome back!')
    navigate('/dashboard')
  }

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault()
    const email = form.email.trim()
    const nextErrors = {
      ...errors,
      email: getFieldError(emailSchema, email),
      password: getFieldError(loginPasswordSchema, form.password),
    }

    setTouched(prev => ({ ...prev, email: true, password: true }))
    setErrors(nextErrors)
    if (nextErrors.email || nextErrors.password) {
      dispatch(clearError())
      toast.error(nextErrors.email || nextErrors.password)
      return
    }

    const res = await dispatch(loginUser({ email, password: form.password }))
    if (loginUser.fulfilled.match(res)) {
      completeLogin(res.payload)
    } else {
      toast.error((res.payload as string) || 'Login failed')
    }
  }

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault()
    await sendOtp()
  }

  const sendOtp = async () => {
    const email = form.email.trim()
    const emailError = getFieldError(emailSchema, email)

    setTouched(prev => ({ ...prev, email: true }))
    setErrors(prev => ({ ...prev, email: emailError }))
    if (emailError) {
      dispatch(clearError())
      toast.error(emailError)
      return
    }

    const res = await dispatch(sendOtpThunk(email))
    if (sendOtpThunk.fulfilled.match(res)) {
      setOtpSent(true)
      setForm(prev => ({ ...prev, email, otp: '' }))
      setErrors(prev => ({ ...prev, otp: '' }))
      setTouched(prev => ({ ...prev, otp: false }))
      toast.success('OTP sent to your email')
    } else {
      toast.error((res.payload as string) || 'Failed to send OTP')
    }
  }

  const handleOtpLogin = async (e: FormEvent) => {
    e.preventDefault()
    const email = form.email.trim()
    const nextErrors = {
      ...errors,
      email: getFieldError(emailSchema, email),
      otp: getFieldError(otpSchema, form.otp),
    }

    setTouched(prev => ({ ...prev, email: true, otp: true }))
    setErrors(nextErrors)
    if (nextErrors.email || nextErrors.otp) {
      dispatch(clearError())
      toast.error(nextErrors.email || nextErrors.otp)
      return
    }

    const res = await dispatch(verifyOtpThunk({ email, otp: form.otp.trim() }))
    if (verifyOtpThunk.fulfilled.match(res)) {
      completeLogin(res.payload)
    } else {
      toast.error((res.payload as string) || 'OTP verification failed')
    }
  }

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-2xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Welcome back</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Sign in to your PayVault account</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5 rounded-2xl p-1" style={{ background: 'var(--bg-primary)', border: '1.5px solid var(--border-strong)' }}>
        {([
          { key: 'password', label: 'Password' },
          { key: 'otp', label: 'OTP' },
        ] as const).map(option => (
          <button
            key={option.key}
            type="button"
            onClick={() => switchMode(option.key)}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
            style={{
              background: mode === option.key ? 'var(--brand)' : 'transparent',
              color: mode === option.key ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {option.label} Login
          </button>
        ))}
      </div>

      <form onSubmit={mode === 'password' ? handlePasswordLogin : otpSent ? handleOtpLogin : handleSendOtp} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setFieldValue('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            className="input-field"
            required
            aria-required="true"
            aria-invalid={Boolean(touched.email && errors.email)}
            aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
          />
          {touched.email && errors.email && (
            <p id="email-error" className="text-xs mt-1" style={{ color: 'var(--danger)' }} role="alert">
              {errors.email}
            </p>
          )}
        </div>

        {mode === 'password' && (
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
              <input
                id="password"
                name="password"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="********"
                value={form.password}
                onChange={e => setFieldValue('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                className="input-field pr-10"
                required
                aria-required="true"
                aria-invalid={Boolean(touched.password && errors.password)}
                aria-describedby={touched.password && errors.password ? 'password-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                aria-label={showPass ? 'Hide password' : 'Show password'}
                style={{ color: 'var(--text-muted)' }}
              >
                {showPass
                  ? <Icon8 name="eyeOff" size={18} className="opacity-80" />
                  : <Icon8 name="eye" size={18} className="opacity-80" />}
              </button>
            </div>
            {touched.password && errors.password && (
              <p id="password-error" className="text-xs mt-1" style={{ color: 'var(--danger)' }} role="alert">
                {errors.password}
              </p>
            )}
          </div>
        )}

        {mode === 'otp' && otpSent && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <label htmlFor="otp" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              OTP Code
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              maxLength={8}
              placeholder="Enter OTP"
              value={form.otp}
              onChange={e => setFieldValue('otp', digitsOnly(e.target.value))}
              onBlur={() => handleBlur('otp')}
              className="input-field text-center text-2xl font-mono tracking-[0.35em]"
              required
              aria-required="true"
              aria-invalid={Boolean(touched.otp && errors.otp)}
              aria-describedby={touched.otp && errors.otp ? 'otp-error' : undefined}
            />
            {touched.otp && errors.otp && (
              <p id="otp-error" className="text-xs mt-1" style={{ color: 'var(--danger)' }} role="alert">
                {errors.otp}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              <button type="button" onClick={resetOtpFlow} className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Change Email
              </button>
              <button type="button" onClick={() => void sendOtp()} className="font-semibold" style={{ color: 'var(--brand)' }}>
                Resend OTP
              </button>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            className="px-4 py-3 rounded-xl text-sm"
            role="alert"
            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
          >
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
                {mode === 'password' ? 'Signing in...' : otpSent ? 'Verifying OTP...' : 'Sending OTP...'}
              </span>
            : mode === 'password'
              ? 'Sign In ->'
              : otpSent
                ? 'Verify OTP ->'
                : 'Send OTP ->'}
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="font-semibold" style={{ color: 'var(--brand)' }}>Create one -&gt;</Link>
      </p>
    </div>
  )
}
