export interface DecodedToken {
  sub: string
  email: string
  name: string
  role: 'user' | 'admin' | 'super_admin'
  plan: 'free' | 'pro' | 'team' | 'enterprise'
  onboardingDone: boolean
  iat: number
  exp: number
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  const value = normalized + padding
  if (typeof atob !== 'undefined') {
    return atob(value)
  }
  return Buffer.from(value, 'base64').toString('utf-8')
}

export function decodeToken(token: string): DecodedToken | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }
    const payloadJson = base64UrlDecode(parts[1]!)
    return JSON.parse(payloadJson) as DecodedToken
  } catch {
    return null
  }
}

export function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const tokenCookie = document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('access_token='))

  return tokenCookie ? decodeURIComponent(tokenCookie.split('=')[1] ?? '') : null
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token)
  if (!decoded?.exp) {
    return true
  }
  return decoded.exp * 1000 <= Date.now()
}

export function getTimeUntilExpiry(token: string): number {
  const decoded = decodeToken(token)
  if (!decoded?.exp) {
    return 0
  }
  const diff = decoded.exp * 1000 - Date.now()
  return diff > 0 ? diff : 0
}
