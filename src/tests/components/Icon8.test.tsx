import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Icon8 } from '../../shared/components/Icon8'

describe('Icon8 component', () => {
  it('normal working: renders the requested icon as decorative by default', () => {
    const { container } = render(<Icon8 name="wallet" size={24} />)

    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('width', '24')
  })

  it('boundary value: exposes accessible text when alt is provided', () => {
    render(<Icon8 name="success" alt="Payment complete" size={1} />)

    expect(screen.getByLabelText('Payment complete')).toBeInTheDocument()
    expect(screen.getByLabelText('Payment complete')).toHaveAttribute('height', '1')
  })

  it('exception handling: throws when an unsupported icon name is passed at runtime', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => render(<Icon8 name={'missing' as never} />)).toThrow()
  })
})
