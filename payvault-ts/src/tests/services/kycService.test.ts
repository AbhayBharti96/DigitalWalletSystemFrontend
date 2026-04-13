import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/core/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
  authApi: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}))

import { api } from '@/core/api/client'
import { kycService } from '@/core/api/kycService'

const mockedApi = vi.mocked(api)
const mockedPost = mockedApi.post as unknown as ReturnType<typeof vi.fn>

describe('kycService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits KYC as multipart form data with query params and user header', () => {
    const file = new File(['id-data'], 'id-card.png', { type: 'image/png' })

    kycService.submit(7, 'AADHAAR', 'AB 123/45', file)

    expect(mockedPost).toHaveBeenCalledTimes(1)
    const [url, body, config] = mockedPost.mock.calls[0]
    expect(url).toBe('/api/kyc/submit?docType=AADHAAR&docNumber=AB%20123%2F45')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('docFile')).toBe(file)
    expect(config).toEqual({
      headers: { 'X-UserId': 7, 'Content-Type': 'multipart/form-data' },
    })
  })

  it('loads KYC status with the current user header', () => {
    kycService.status(7)

    expect(mockedApi.get).toHaveBeenCalledWith('/api/kyc/status', {
      headers: { 'X-UserId': 7 },
    })
  })
})
