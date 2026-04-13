import type { UserProfile } from '../types'

/** Avoids importing the Redux store from `api.ts` (circular dependency). */
export type AuthSession = {
  accessToken: string
  refreshToken: string
  user?: UserProfile
}

let onTokensRefreshed: ((session: AuthSession) => void) | null = null

export function registerAuthTokenSync(cb: (session: AuthSession) => void): void {
  onTokensRefreshed = cb
}

export function notifyTokensRefreshed(session: AuthSession): void {
  onTokensRefreshed?.(session)
}
