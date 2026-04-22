const ACCESS_KEY = 'asb_access_token'
const REFRESH_KEY = 'asb_refresh_token'

/**
 * Persists access + refresh tokens for API calls (localStorage) and sets the
 * `access_token` cookie so Next.js middleware can gate server-rendered routes.
 */
export function setSessionTokens(access: string, refresh: string, expiresInSec: number): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  // Keep the Next.js access_token cookie alive for 7 days so middleware doesn't boot us out
  // while the client handles the actual short lifecycle of the access_token.
  const SEVEN_DAYS = 604800
  document.cookie = `access_token=${access}; path=/; max-age=${SEVEN_DAYS}; SameSite=Lax${secure}`
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_KEY)
}

export function clearSessionTokens(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  document.cookie = 'access_token=; path=/; max-age=0'
}
