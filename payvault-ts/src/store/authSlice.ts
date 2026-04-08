import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { UserProfile, KycStatus, LoginRequest, SignupRequest, VerifyOtpRequest } from '../types'
import { authService, clearClientAuth } from '../services'
import { getApiErrorMessage } from '../shared/apiErrors'

interface AuthState {
  user: UserProfile | null
  accessToken: string | null
  refreshToken: string | null
  loading: boolean
  error: string | null
}

const stored = (): { user: UserProfile | null; accessToken: string | null; refreshToken: string | null } => {
  try {
    const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken')
    const refresh = sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken')
    const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || 'null')
    return { user, accessToken: token, refreshToken: refresh }
  } catch { return { user: null, accessToken: null, refreshToken: null } }
}

const persist = (user: UserProfile, access: string, refresh: string) => {
  sessionStorage.setItem('accessToken', access)
  sessionStorage.setItem('refreshToken', refresh)
  sessionStorage.setItem('user', JSON.stringify(user))
}

// ── Thunks ────────────────────────────────────────────────────────────────────
export const loginUser = createAsyncThunk('auth/login', async (creds: LoginRequest, { rejectWithValue }) => {
  try {
    const { data } = await authService.login(creds)
    return data
  } catch (e: unknown) { return rejectWithValue(getApiErrorMessage(e, 'Login failed')) }
})

export const signupUser = createAsyncThunk('auth/signup', async (payload: SignupRequest, { rejectWithValue }) => {
  try {
    const { data } = await authService.signup(payload)
    return data
  } catch (e: unknown) { return rejectWithValue(getApiErrorMessage(e, 'Signup failed')) }
})

export const sendOtpThunk = createAsyncThunk('auth/sendOtp', async (email: string, { rejectWithValue }) => {
  try { await authService.sendOtp(email) }
  catch (e: unknown) { return rejectWithValue(getApiErrorMessage(e, 'Failed to send OTP')) }
})

export const verifyOtpThunk = createAsyncThunk('auth/verifyOtp', async (payload: VerifyOtpRequest, { rejectWithValue }) => {
  try {
    const { data } = await authService.verifyOtp(payload)
    return data
  } catch (e: unknown) { return rejectWithValue(getApiErrorMessage(e, 'OTP verification failed')) }
})

// ── Slice ─────────────────────────────────────────────────────────────────────
const { user, accessToken, refreshToken } = stored()

const authSlice = createSlice({
  name: 'auth',
  initialState: { user, accessToken, refreshToken, loading: false, error: null } as AuthState,
  reducers: {
    logout(state) {
      state.user = null; state.accessToken = null; state.refreshToken = null
      clearClientAuth()
    },
    updateCurrentUser(state, { payload }: PayloadAction<UserProfile>) {
      state.user = payload
      sessionStorage.setItem('user', JSON.stringify(payload))
      localStorage.setItem('user', JSON.stringify(payload))
    },
    updateKycStatus(state, { payload }: PayloadAction<KycStatus>) {
      if (state.user) {
        state.user.kycStatus = payload
        sessionStorage.setItem('user', JSON.stringify(state.user))
        localStorage.setItem('user', JSON.stringify(state.user))
      }
    },
    clearError(state) { state.error = null },
    setTokens(state, { payload }: PayloadAction<{ accessToken: string; refreshToken: string }>) {
      state.accessToken = payload.accessToken
      state.refreshToken = payload.refreshToken
    },
  },
  extraReducers: (b) => {
    b.addCase(loginUser.pending, (s) => { s.loading = true; s.error = null })
    b.addCase(loginUser.fulfilled, (s, { payload }) => {
      s.loading = false; s.accessToken = payload.accessToken
      s.refreshToken = payload.refreshToken; s.user = payload.user
      persist(payload.user, payload.accessToken, payload.refreshToken)
    })
    b.addCase(loginUser.rejected, (s, { payload }) => { s.loading = false; s.error = payload as string })
    b.addCase(signupUser.pending, (s) => { s.loading = true; s.error = null })
    b.addCase(signupUser.fulfilled, (s) => { s.loading = false })
    b.addCase(signupUser.rejected, (s, { payload }) => { s.loading = false; s.error = payload as string })
    b.addCase(verifyOtpThunk.pending, (s) => { s.loading = true; s.error = null })
    b.addCase(verifyOtpThunk.fulfilled, (s, { payload }) => {
      s.loading = false
      s.accessToken = payload.accessToken
      s.refreshToken = payload.refreshToken
      s.user = payload.user
      persist(payload.user, payload.accessToken, payload.refreshToken)
    })
    b.addCase(verifyOtpThunk.rejected, (s, { payload }) => { s.loading = false; s.error = payload as string })
  },
})

export const { logout, updateCurrentUser, updateKycStatus, clearError, setTokens } = authSlice.actions
export default authSlice.reducer
