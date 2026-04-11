import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  writable: true,
  value: vi.fn(() => ({
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(340 * 160 * 4) })),
    globalCompositeOperation: 'source-over',
    textAlign: 'center',
    textBaseline: 'middle',
  })),
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
