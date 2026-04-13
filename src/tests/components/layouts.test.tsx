import React from 'react'
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import AppLayout from '../../layouts/AppLayout'
import AuthLayout from '../../layouts/AuthLayout'
import { defaultUser, renderWithProviders } from './testUtils'

describe('AuthLayout component', () => {
  it('normal working: renders auth branding and nested route for guests', () => {
    renderWithProviders(
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/" element={<p>Login form</p>} />
        </Route>
      </Routes>,
      {
        preloadedState: {
          auth: { user: null, accessToken: null, refreshToken: null, loading: false, error: null },
        },
      },
    )

    expect(screen.getAllByText('PayVault')[0]).toBeInTheDocument()
    expect(screen.getByText('Login form')).toBeInTheDocument()
  })

  it('boundary value: redirects an authenticated user away from auth pages', () => {
    renderWithProviders(
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/" element={<p>Login form</p>} />
        </Route>
        <Route path="/dashboard" element={<p>Dashboard route</p>} />
      </Routes>,
      {
        preloadedState: {
          auth: { user: defaultUser, accessToken: 'access', refreshToken: 'refresh', loading: false, error: null },
        },
      },
    )

    expect(screen.getByText('Dashboard route')).toBeInTheDocument()
  })

  it('exception handling: still renders if no user data exists in storage', () => {
    expect(() => renderWithProviders(<AuthLayout />)).not.toThrow()
  })
})

describe('AppLayout component', () => {
  it('normal working: renders user navigation and nested page content', () => {
    renderWithProviders(
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<p>Dashboard content</p>} />
        </Route>
      </Routes>,
      {
        preloadedState: {
          auth: { user: defaultUser, accessToken: 'access', refreshToken: 'refresh', loading: false, error: null },
        },
      },
    )

    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
    expect(screen.getAllByText('Wallet')[0]).toBeInTheDocument()
  })

  it('boundary value: shows admin navigation for admin users', () => {
    renderWithProviders(<AppLayout />, {
      preloadedState: {
        auth: {
          user: { ...defaultUser, role: 'ADMIN' },
          accessToken: 'access',
          refreshToken: 'refresh',
          loading: false,
          error: null,
        },
      },
    })

    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getAllByText('Users')[0]).toBeInTheDocument()
  })

  it('exception handling: falls back to generic user labels when profile fields are missing', () => {
    renderWithProviders(<AppLayout />, {
      preloadedState: {
        auth: {
          user: { ...defaultUser, fullName: '', email: '' },
          accessToken: 'access',
          refreshToken: 'refresh',
          loading: false,
          error: null,
        },
      },
    })

    expect(screen.getAllByText('User')[0]).toBeInTheDocument()
  })
})
