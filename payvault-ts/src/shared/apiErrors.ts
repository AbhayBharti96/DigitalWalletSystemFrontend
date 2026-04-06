import axios from 'axios'

/**
 * Normalizes API / network failures into a single user-facing string.
 * Use from Redux thunks and catch blocks for consistent messaging.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined
    const msg = data?.message ?? data?.error
    if (typeof msg === 'string' && msg.trim()) return msg.trim()
    const status = error.response?.status
    if (status === 404) return 'The requested resource was not found.'
    if (status === 403) return 'You do not have permission to perform this action.'
    if (status === 401) return 'Your session expired. Please sign in again.'
    if (status != null && status >= 500) return 'The server is unavailable. Please try again later.'
    if (!error.response) return 'Network error. Check your connection and try again.'
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}
