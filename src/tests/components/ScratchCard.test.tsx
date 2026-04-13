import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import confetti from 'canvas-confetti'
import { ScratchCardModal } from '../../shared/components/ScratchCard'
import { renderWithProviders } from './testUtils'

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}))

describe('ScratchCardModal component', () => {
  it('normal working: renders the reward card with transfer amount and points', () => {
    renderWithProviders(
      <ScratchCardModal points={75} transactionAmount={1500} onRevealed={vi.fn()} onClose={vi.fn()} />,
      {
        preloadedState: {
          rewards: {
            summary: { userId: 1, points: 300, tier: 'GOLD' },
            catalog: [],
            transactions: [],
            loading: false,
            error: null,
          },
        },
      },
    )

    expect(screen.getByRole('dialog', { name: /scratch card reward/i })).toBeInTheDocument()
    expect(screen.getByText('You earned a reward!')).toBeInTheDocument()
    expect(screen.getByText('+75')).toBeInTheDocument()
  })

  it('boundary value: renders zero values without hiding the claim context', () => {
    renderWithProviders(<ScratchCardModal points={0} transactionAmount={0} onRevealed={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByText('+0')).toBeInTheDocument()
    expect(screen.getByText(/transfer of/i)).toBeInTheDocument()
  })

  it('exception handling: allows the user to close without claiming', () => {
    const onClose = vi.fn()
    renderWithProviders(<ScratchCardModal points={50} transactionAmount={100} onRevealed={vi.fn()} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /close scratch card without claiming/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(confetti).not.toHaveBeenCalled()
  })
})
