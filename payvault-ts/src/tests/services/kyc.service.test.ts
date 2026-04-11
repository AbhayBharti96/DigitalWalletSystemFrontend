import { beforeEach, describe, expect, it } from 'vitest'
import './httpClientMock'
import { apiClientMock, resetHttpMocks } from './httpClientMock'
import { kycService } from '@/services/kyc.service'

describe('kycService', () => {
  beforeEach(() => {
    resetHttpMocks()
  })

  it('submits kyc as multipart with user header', () => {
    const file = new File(['demo'], 'aadhaar.png', { type: 'image/png' })

    kycService.submit(10, 'AADHAAR', 'ABC 123', file)

    expect(apiClientMock.post).toHaveBeenCalledTimes(1)
    const [url, formData, config] = apiClientMock.post.mock.calls[0]
    expect(url).toBe('/api/kyc/submit?docType=AADHAAR&docNumber=ABC%20123')
    expect(formData).toBeInstanceOf(FormData)
    expect((formData as FormData).get('docFile')).toBe(file)
    expect(config).toEqual({
      headers: {
        'X-User-Id': 10,
        'Content-Type': 'multipart/form-data',
      },
    })
  })

  it('fetches kyc status with user header', () => {
    kycService.status(10)
    expect(apiClientMock.get).toHaveBeenCalledWith('/api/kyc/status', { headers: { 'X-User-Id': 10 } })
  })
})
