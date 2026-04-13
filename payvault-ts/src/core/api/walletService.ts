import type {
  ApiResponse,
  LedgerEntry,
  PageResponse,
  PaymentFailureRequest,
  RazorpayOrder,
  Transaction,
  TransferRecipientResponse,
  TransferRequest,
  WalletBalance,
} from '../../types'
import { api } from './client'

export const walletService = {
  balance: (userId: number) =>
    api.get<ApiResponse<WalletBalance>>('/api/wallet/balance', { headers: { 'X-UserId': userId } }),
  transactions: (userId: number, page = 0, size = 10) =>
    api.get<PageResponse<Transaction>>(`/api/wallet/transactions?page=${page}&size=${size}`, {
      headers: { 'X-UserId': userId },
    }),
  ledger: (userId: number, page = 0, size = 20) =>
    api.get<PageResponse<LedgerEntry>>(`/api/wallet/ledger?page=${page}&size=${size}`, {
      headers: { 'X-UserId': userId },
    }),
  transfer: (userId: number, payload: TransferRequest) =>
    api.post<ApiResponse<void>>('/api/wallet/transfer', payload, { headers: { 'X-UserId': userId } }),
  searchRecipients: (userId: number, query: string, limit = 10) =>
    api.get<ApiResponse<TransferRecipientResponse[]>>('/api/users/search/recipients', {
      headers: { 'X-User-Id': userId },
      params: { q: query, limit },
    }),
  withdraw: (userId: number, amount: number) =>
    api.post<ApiResponse<void>>('/api/wallet/withdraw', { amount }, { headers: { 'X-UserId': userId } }),
  createOrder: (userId: number, amount: number) =>
    api.post<RazorpayOrder>(`/api/payment/create-order?amount=${amount}`, {}, {
      headers: { 'X-User-Id': userId },
    }),
  verifyPayment: (userId: number, payload: Record<string, string>) =>
    api.post<string>('/api/payment/verify', payload, { headers: { 'X-User-Id': userId } }),
  failPayment: (userId: number, payload: PaymentFailureRequest) =>
    api.post<string>('/api/payment/fail', payload, { headers: { 'X-User-Id': userId } }),
  statement: (userId: number, from: string, to: string) =>
    api.get<Transaction[]>(`/api/wallet/statement?from=${from}&to=${to}`, { headers: { 'X-UserId': userId } }),
  downloadStatement: (userId: number, from: string, to: string) =>
    api.get(`/api/wallet/statement/download?from=${from}&to=${to}`, {
      headers: { 'X-UserId': userId },
      responseType: 'blob',
    }),
}
