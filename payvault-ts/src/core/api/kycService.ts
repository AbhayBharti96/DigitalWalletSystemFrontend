import type { ApiResponse, DocType, KycStatusResponse } from '../../types'
import { api } from './client'

export const kycService = {
  submit: (userId: number, docType: DocType, docNumber: string, file: File) => {
    const formData = new FormData()
    formData.append('docFile', file)

    return api.post<ApiResponse<KycStatusResponse>>(
      `/api/kyc/submit?docType=${docType}&docNumber=${encodeURIComponent(docNumber)}`,
      formData,
      { headers: { 'X-UserId': userId, 'Content-Type': 'multipart/form-data' } },
    )
  },
  status: (userId: number) =>
    api.get<ApiResponse<KycStatusResponse>>('/api/kyc/status', { headers: { 'X-UserId': userId } }),
}
