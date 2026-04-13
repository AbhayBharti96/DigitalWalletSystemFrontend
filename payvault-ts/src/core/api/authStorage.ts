export function clearClientAuth(): void {
  sessionStorage.clear()
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

export const getAccessToken = () =>
  sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken')

export const getRefreshToken = () =>
  sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken')

export const saveTokens = (accessToken: string, refreshToken: string) => {
  sessionStorage.setItem('accessToken', accessToken)
  sessionStorage.setItem('refreshToken', refreshToken)
}
