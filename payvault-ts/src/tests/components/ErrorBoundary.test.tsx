import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '../../shared/components/ErrorBoundary'

const ThrowingChild = () => {
  throw new Error('broken child')
}

describe('ErrorBoundary component', () => {
  it('normal working: renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <p>Healthy content</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('Healthy content')).toBeInTheDocument()
  })

  it('boundary value: renders a custom fallback for a failing child', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <ErrorBoundary fallback={<p>Custom fallback</p>}>
        <ThrowingChild />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Custom fallback')).toBeInTheDocument()
  })

  it('exception handling: shows the default recovery UI after a render error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
  })
})
