import { vi } from 'vitest'

export const apiClientMock = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}

export const authClientMock = {
  post: vi.fn(),
}

export const clearClientAuthMock = vi.fn()

vi.mock('@/services/http/client', () => ({
  apiClient: apiClientMock,
  authClient: authClientMock,
  clearClientAuth: clearClientAuthMock,
}))

export const resetHttpMocks = () => {
  apiClientMock.get.mockReset()
  apiClientMock.post.mockReset()
  apiClientMock.put.mockReset()
  apiClientMock.patch.mockReset()
  apiClientMock.delete.mockReset()
  authClientMock.post.mockReset()
  clearClientAuthMock.mockReset()
}
