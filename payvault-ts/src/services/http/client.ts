import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type { AuthResponse } from '../../types'
import { notifyTokensRefreshed } from '../../core/authSync'

const BASE = import.meta.env.VITE_API_BASE_URL

if (!BASE && import.meta.env.PROD) {
  console.error('VITE_API_BASE_URL is not set. API calls will fail.')
}

const apiBaseUrl = BASE || 'http://localhost:8080'

export const apiClient: AxiosInstance = axios.create({ baseURL: apiBaseUrl, timeout: 15000 })
export const authClient: AxiosInstance = axios.create({ baseURL: apiBaseUrl, timeout: 15000 })

export function clearClientAuth(): void {
  sessionStorage.clear()
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

const getToken = () => sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken')
const getRefreshToken = () => sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken')

const saveTokens = (access: string, refresh: string) => {
  sessionStorage.setItem('accessToken', access)
  sessionStorage.setItem('refreshToken', refresh)
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let queue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = []

const processQueue = (err: unknown, token?: string) => {
  queue.forEach(entry => (err ? entry.reject(err) : entry.resolve(token!)))
  queue = []
}

apiClient.interceptors.response.use(
  response => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => queue.push({ resolve, reject }))
        .then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return apiClient(originalRequest)
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
      const { data } = await authClient.post<AuthResponse>('/api/auth/refresh', { refreshToken })
      saveTokens(data.accessToken, data.refreshToken)
      notifyTokensRefreshed({ accessToken: data.accessToken, refreshToken: data.refreshToken })
      apiClient.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`
      processQueue(null, data.accessToken)
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError)
      clearClientAuth()
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)
