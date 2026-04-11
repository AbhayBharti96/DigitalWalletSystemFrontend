import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  ConfirmDialog,
  EmptyState,
  LoadingScreen,
  Modal,
  NotFoundPage,
  Skeleton,
  StatusBadge,
  SuccessOverlay,
} from '../../shared/components/ui'
import { renderWithProviders } from './testUtils'

describe('Modal component', () => {
  it('normal working: renders an open modal and closes from the close button', () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Transfer money">Ready</Modal>)

    expect(screen.getByRole('dialog', { name: 'Transfer money' })).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /close modal/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('boundary value: renders nothing when open is false', () => {
    render(<Modal open={false} onClose={vi.fn()} title="Hidden">Hidden body</Modal>)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('exception handling: still renders when children are empty', () => {
    render(<Modal open onClose={vi.fn()} title="Empty modal">{null}</Modal>)

    expect(screen.getByRole('dialog', { name: 'Empty modal' })).toBeInTheDocument()
  })
})

describe('ConfirmDialog component', () => {
  it('normal working: calls confirm when the primary action is clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog open onClose={vi.fn()} onConfirm={onConfirm} title="Send cash" confirmLabel="Send" />)

    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('boundary value: formats a zero amount without hiding it', () => {
    render(<ConfirmDialog open onClose={vi.fn()} onConfirm={vi.fn()} title="Zero transfer" amount={0} />)

    expect(screen.getByText(/0/)).toBeInTheDocument()
  })

  it('exception handling: prevents duplicate submit while loading', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog open loading onClose={vi.fn()} onConfirm={onConfirm} title="Loading" />)

    expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /processing/i }))
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

describe('SuccessOverlay component', () => {
  it('normal working: announces a successful action', () => {
    render(<SuccessOverlay show label="Transfer" amount={250} />)

    expect(screen.getByLabelText('Transfer successful')).toBeInTheDocument()
    expect(screen.getByText('Transfer Successful!')).toBeInTheDocument()
  })

  it('boundary value: hides the amount when it is not supplied', () => {
    render(<SuccessOverlay show label="KYC" />)

    expect(screen.getByText('KYC Successful!')).toBeInTheDocument()
    expect(screen.queryByText(/Rs/)).not.toBeInTheDocument()
  })

  it('exception handling: renders nothing when show is false', () => {
    render(<SuccessOverlay show={false} label="Transfer" amount={250} />)

    expect(screen.queryByLabelText('Transfer successful')).not.toBeInTheDocument()
  })
})

describe('Skeleton component', () => {
  it('normal working: renders a loading status', () => {
    render(<Skeleton />)

    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
  })

  it('boundary value: accepts an empty className', () => {
    const { container } = render(<Skeleton className="" />)

    expect(container.firstChild).toHaveClass('skeleton')
  })

  it('exception handling: preserves custom layout classes for fallback screens', () => {
    const { container } = render(<Skeleton className="h-10 w-full" />)

    expect(container.firstChild).toHaveClass('h-10')
    expect(container.firstChild).toHaveClass('w-full')
  })
})

describe('EmptyState component', () => {
  it('normal working: renders title, description, and action', () => {
    const onClick = vi.fn()
    render(<EmptyState title="No transactions" description="Try another filter." action={{ label: 'Reset', onClick }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByText('No transactions')).toBeInTheDocument()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('boundary value: handles a title-only empty state', () => {
    render(<EmptyState title="Nothing here" />)

    expect(screen.getByText('Nothing here')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('exception handling: renders a custom icon without breaking the empty state', () => {
    render(<EmptyState icon={<span data-testid="custom-icon" />} title="No rewards" />)

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    expect(screen.getByText('No rewards')).toBeInTheDocument()
  })
})

describe('LoadingScreen component', () => {
  it('normal working: renders PayVault loading copy', () => {
    render(<LoadingScreen />)

    expect(screen.getByText(/loading payvault/i)).toBeInTheDocument()
  })

  it('boundary value: keeps the brand mark visible while content loads', () => {
    render(<LoadingScreen />)

    expect(screen.getByText('P')).toBeInTheDocument()
  })

  it('exception handling: does not require props to render', () => {
    expect(() => render(<LoadingScreen />)).not.toThrow()
  })
})

describe('NotFoundPage component', () => {
  it('normal working: renders the not-found message', () => {
    renderWithProviders(<NotFoundPage />)

    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument()
  })

  it('boundary value: provides both recovery navigation actions', () => {
    renderWithProviders(<NotFoundPage />)

    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
  })

  it('exception handling: renders inside an unknown route without crashing', () => {
    expect(() => renderWithProviders(<NotFoundPage />, { route: '/missing/path' })).not.toThrow()
  })
})

describe('StatusBadge component', () => {
  it('normal working: displays known statuses with readable text', () => {
    render(<StatusBadge status="APPROVED" />)

    expect(screen.getByText('APPROVED')).toBeInTheDocument()
  })

  it('boundary value: replaces underscores in status labels', () => {
    render(<StatusBadge status="NOT_SUBMITTED" />)

    expect(screen.getByText('NOT SUBMITTED')).toBeInTheDocument()
  })

  it('exception handling: displays a safe placeholder for null status', () => {
    render(<StatusBadge status={null} />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
