import type { ApiResponse, DocType, KycStatusResponse } from '../types'
import { apiClient } from './http/client'

export const kycService = {
  submit: (userId: number, docType: DocType, docNumber: string, file: File) => {
    const formData = new FormData()
    formData.append('docFile', file)
    return apiClient.post<ApiResponse<KycStatusResponse>>(
      `/api/kyc/submit?docType=${docType}&docNumber=${encodeURIComponent(docNumber)}`,
      formData,
      { headers: { 'X-User-Id': userId, 'Content-Type': 'multipart/form-data' } }
    )
  },
  status: (userId: number) =>
    apiClient.get<ApiResponse<KycStatusResponse>>('/api/kyc/status', { headers: { 'X-User-Id': userId } }),
}
