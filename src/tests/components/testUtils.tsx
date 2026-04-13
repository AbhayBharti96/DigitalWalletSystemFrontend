import React from 'react'
import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { render, type RenderOptions } from '@testing-library/react'
import authReducer from '../../store/authSlice'
import themeReducer from '../../store/themeSlice'
import notificationReducer from '../../store/notificationSlice'
import walletReducer from '../../store/walletSlice'
import rewardsReducer from '../../store/rewardsSlice'
import type { UserProfile } from '../../types'

type PreloadedState = {
  auth?: {
    user: UserProfile | null
    accessToken: string | null
    refreshToken: string | null
    loading: boolean
    error: string | null
  }
  theme?: { isDark: boolean }
  notifications?: {
    items: Array<{ id: number; type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string; read: boolean; time: string }>
    unreadCount: number
  }
  rewards?: {
    summary: { userId: number; points: number; tier: 'SILVER' | 'GOLD' | 'PLATINUM' } | null
    catalog: unknown[]
    transactions: unknown[]
    loading: boolean
    error: string | null
  }
}

export const defaultUser: UserProfile = {
  id: 1,
  fullName: 'Priya Sharma',
  email: 'priya@example.com',
  phone: '9999999999',
  role: 'USER',
  kycStatus: 'APPROVED',
}

export function makeStore(preloadedState: PreloadedState = {}) {
  const reducer = combineReducers({
    auth: authReducer,
    theme: themeReducer,
    notifications: notificationReducer,
    wallet: walletReducer,
    rewards: rewardsReducer,
  })

  return configureStore({
    reducer,
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
    preloadedState: preloadedState as any,
  })
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    route = '/',
    preloadedState,
    ...options
  }: RenderOptions & { route?: string; preloadedState?: PreloadedState } = {},
) {
  const store = makeStore(preloadedState)
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <MemoryRouter
        initialEntries={[route]}
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        {children}
      </MemoryRouter>
    </Provider>
  )

  return { store, ...render(ui, { wrapper: Wrapper, ...options }) }
}
