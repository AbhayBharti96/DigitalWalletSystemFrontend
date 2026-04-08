import type { ApiResponse, LedgerEntry, PageResponse, RazorpayOrder, Transaction, TransferRequest, WalletBalance } from '../types'
import { apiClient } from './http/client'

export const walletService = {
  balance: (userId: number) =>
    apiClient.get<ApiResponse<WalletBalance>>('/api/wallet/balance', { headers: { 'X-UserId': userId } }),
  transactions: (userId: number, page = 0, size = 10) =>
    apiClient.get<PageResponse<Transaction>>(`/api/wallet/transactions?page=${page}&size=${size}`, {
      headers: { 'X-UserId': userId },
    }),
  ledger: (userId: number, page = 0, size = 20) =>
    apiClient.get<PageResponse<LedgerEntry>>(`/api/wallet/ledger?page=${page}&size=${size}`, {
      headers: { 'X-UserId': userId },
    }),
  transfer: (userId: number, payload: TransferRequest) =>
    apiClient.post<ApiResponse<void>>('/api/wallet/transfer', payload, { headers: { 'X-UserId': userId } }),
  withdraw: (userId: number, amount: number) =>
    apiClient.post<ApiResponse<void>>('/api/wallet/withdraw', { amount }, { headers: { 'X-UserId': userId } }),
  createOrder: (userId: number, amount: number) =>
    apiClient.post<RazorpayOrder>(`/api/payment/create-order?amount=${amount}`, {}, {
      headers: { 'X-UserId': userId },
    }),
  verifyPayment: (userId: number, payload: Record<string, string>) =>
    apiClient.post<ApiResponse<void>>('/api/payment/verify', payload, { headers: { 'X-UserId': userId } }),
  statement: (userId: number, from: string, to: string) =>
    apiClient.get<Transaction[]>(`/api/wallet/statement?from=${from}&to=${to}`, { headers: { 'X-UserId': userId } }),
  downloadStatement: (userId: number, from: string, to: string) =>
    apiClient.get(`/api/wallet/statement/download?from=${from}&to=${to}`, {
      headers: { 'X-UserId': userId },
      responseType: 'blob',
    }),
}
