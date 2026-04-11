import type { ApiResponse, LedgerEntry, PageResponse, RazorpayOrder, Transaction, TransferRequest, WalletBalance } from '../types'
import { apiClient } from './http/client'

export const walletService = {
  balance: (userId: number) =>
    apiClient.get<ApiResponse<WalletBalance>>('/api/wallet/balance', { headers: { 'X-User-Id': userId } }),
  transactions: (userId: number, page = 0, size = 10) =>
    apiClient.get<PageResponse<Transaction>>(`/api/wallet/transactions?page=${page}&size=${size}`, {
      headers: { 'X-User-Id': userId },
    }),
  ledger: (userId: number, page = 0, size = 20) =>
    apiClient.get<PageResponse<LedgerEntry>>(`/api/wallet/ledger?page=${page}&size=${size}`, {
      headers: { 'X-User-Id': userId },
    }),
  transfer: (userId: number, payload: TransferRequest) =>
    apiClient.post<ApiResponse<void>>('/api/wallet/transfer', payload, { headers: { 'X-User-Id': userId } }),
  withdraw: (userId: number, amount: number) =>
    apiClient.post<ApiResponse<void>>('/api/wallet/withdraw', { amount }, { headers: { 'X-User-Id': userId } }),
  createOrder: async (userId: number, amount: number) => {
    try {
      return await apiClient.post<RazorpayOrder | ApiResponse<RazorpayOrder>>(`/api/payment/create-order?amount=${amount}`, {}, {
        headers: { 'X-User-Id': userId },
      })
    } catch (error: any) {
      if ([400, 404, 405].includes(error?.response?.status)) {
        return apiClient.post<RazorpayOrder | ApiResponse<RazorpayOrder>>('/api/payment/create-order', { amount }, {
          headers: { 'X-User-Id': userId },
        })
      }
      throw error
    }
  },
  verifyPayment: (userId: number, payload: Record<string, string>) =>
    apiClient.post<string>('/api/payment/verify', payload, { headers: { 'X-User-Id': userId } }),
  markPaymentFailed: (userId: number, payload: Record<string, string>, reason?: string) =>
    apiClient.post<string>(
      `/api/payment/failed${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`,
      payload,
      { headers: { 'X-User-Id': userId } },
    ),
  cancelPayment: (userId: number, payload: Record<string, string>) =>
    apiClient.post<{ message: string; status: string; redirect?: string }>('/api/payment/cancel', payload, {
      headers: { 'X-User-Id': userId },
    }),
  statement: (userId: number, from: string, to: string) =>
    apiClient.get<Transaction[]>(`/api/wallet/statement?from=${from}&to=${to}`, { headers: { 'X-User-Id': userId } }),
  downloadStatement: (userId: number, from: string, to: string) =>
    apiClient.get(`/api/wallet/statement/download?from=${from}&to=${to}`, {
      headers: { 'X-User-Id': userId },
      responseType: 'blob',
    }),
}
