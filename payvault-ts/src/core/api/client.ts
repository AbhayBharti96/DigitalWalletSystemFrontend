import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import type { AuthResponse } from '../../types'
import { notifyTokensRefreshed } from '../authSync'
import { clearClientAuth, getAccessToken, getRefreshToken, saveTokens } from './authStorage'

const BASE = import.meta.env.VITE_API_BASE_URL

if (!BASE && import.meta.env.PROD) {
  console.error('VITE_API_BASE_URL is not set. API calls will fail.')
}

const apiBaseUrl = BASE || 'http://localhost:8080'

export const api: AxiosInstance = axios.create({ baseURL: apiBaseUrl, timeout: 15000 })
export const authApi: AxiosInstance = axios.create({ baseURL: apiBaseUrl, timeout: 15000 })

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let queue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = []

const processQueue = (err: unknown, token?: string) => {
  queue.forEach((pending) => (err ? pending.reject(err) : pending.resolve(token!)))
  queue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => queue.push({ resolve, reject }))
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
    }

    originalRequest._retry = true
    isRefreshing = true
    const refreshToken = getRefreshToken()

    if (!refreshToken) {
      clearClientAuth()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    try {
      const { data } = await authApi.post<AuthResponse>('/api/auth/refresh', { refreshToken })
      saveTokens(data.accessToken, data.refreshToken)
      notifyTokensRefreshed({ accessToken: data.accessToken, refreshToken: data.refreshToken })
      api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`
      processQueue(null, data.accessToken)
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError)
      clearClientAuth()
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default api
