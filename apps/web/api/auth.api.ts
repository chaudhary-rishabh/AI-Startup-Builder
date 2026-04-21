import api from '@/lib/axios'
import { clearSessionTokens, getRefreshToken, setSessionTokens } from '@/lib/authTokens'

export interface RegisterPayload {
  email: string
  password: string
  name: string
  role: 'FOUNDER' | 'DESIGNER' | 'DEVELOPER' | 'OTHER'
}

export interface LoginPayload {
  email: string
  password: string
}

export interface GoogleOAuthPayload {
  code: string
  redirectUri: string
}

interface ApiUser {
  id: string
  email: string
  fullName: string
  role: string
  planTier: string
  onboardingCompleted?: boolean
}

interface LoginTokensPayload {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: ApiUser
}

function mapPlanTier(tier: string): 'free' | 'pro' | 'team' | 'enterprise' {
  if (tier === 'pro' || tier === 'team' || tier === 'enterprise') return tier
  return 'free'
}

function mapApiUser(u: ApiUser): {
  id: string
  email: string
  name: string
  role: string
  plan: string
  onboardingDone: boolean
} {
  return {
    id: u.id,
    email: u.email,
    name: u.fullName,
    role: u.role,
    plan: mapPlanTier(u.planTier),
    onboardingDone: u.onboardingCompleted ?? false,
  }
}

export async function register(
  payload: RegisterPayload,
): Promise<{ userId: string; message: string; devOtp?: string }> {
  const res = await api.post<{
    success?: boolean
    data?: { userId: string; message: string; devOtp?: string }
  }>('/auth/register', {
    email: payload.email,
    password: payload.password,
    fullName: payload.name,
    role: payload.role,
  })
  const body = res.data
  if (!body?.success || body.data === undefined) {
    throw {
      code: 'INVALID_RESPONSE',
      message:
        'Could not reach the registration API. Set NEXT_PUBLIC_API_URL to your gateway (e.g. http://localhost:4000) and restart the dev server.',
      status: res.status,
    }
  }
  return body.data
}

/** Returns Google authorization URL from the auth-service (PKCE). */
export async function getGoogleAuthStartUrl(): Promise<string> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? ''
  if (!base) {
    throw new Error('NEXT_PUBLIC_API_URL is not set')
  }
  const res = await api.get<{ success?: boolean; data?: { authUrl: string; state: string } }>(
    '/auth/oauth/google',
  )
  const body = res.data
  if (!body?.success || !body.data?.authUrl) {
    throw new Error('Invalid response from /auth/oauth/google')
  }
  return body.data.authUrl
}

export type LoginResult =
  | { kind: 'mfa'; tempToken: string }
  | {
      kind: 'session'
      user: {
        id: string
        email: string
        name: string
        role: string
        plan: string
        onboardingDone: boolean
      }
    }

export async function login(payload: LoginPayload): Promise<LoginResult> {
  const res = await api.post<{
    data:
      | ({ requiresMfa: true; mfaTempToken: string } & Partial<LoginTokensPayload>)
      | LoginTokensPayload
  }>('/auth/login', payload)
  const data = res.data.data

  if ('requiresMfa' in data && data.requiresMfa && data.mfaTempToken) {
    return { kind: 'mfa', tempToken: data.mfaTempToken }
  }

  const loggedIn = data as LoginTokensPayload
  setSessionTokens(loggedIn.accessToken, loggedIn.refreshToken, loggedIn.expiresIn)
  return { kind: 'session', user: mapApiUser(loggedIn.user) }
}

export async function loginWithTotp(payload: {
  tempToken: string
  totpCode: string
}): Promise<{
  user: {
    id: string
    email: string
    name: string
    role: string
    plan: string
    onboardingDone: boolean
  }
}> {
  const res = await api.post<{ data: LoginTokensPayload }>('/auth/2fa/verify', {
    mfaTempToken: payload.tempToken,
    totpCode: payload.totpCode,
  })
  const data = res.data.data
  setSessionTokens(data.accessToken, data.refreshToken, data.expiresIn)
  return { user: mapApiUser(data.user) }
}

export async function googleOAuth(
  payload: GoogleOAuthPayload,
): Promise<{ user: { id: string; email: string; name: string; role: string; plan: string; onboardingDone: boolean }; isNewUser: boolean }> {
  const res = await api.post<{
    data: {
      accessToken: string
      refreshToken: string
      expiresIn: number
      user: ApiUser
      isNewUser: boolean
    }
  }>('/auth/oauth/google', payload)
  const data = res.data.data
  setSessionTokens(data.accessToken, data.refreshToken, data.expiresIn)
  return { user: mapApiUser(data.user), isNewUser: data.isNewUser }
}

export async function logout(): Promise<void> {
  try {
    const rt = getRefreshToken()
    if (rt) {
      await api.post('/auth/logout', { refreshToken: rt })
    }
  } finally {
    clearSessionTokens()
  }
}

export async function refreshToken(): Promise<void> {
  const refresh = getRefreshToken()
  if (!refresh) {
    throw new Error('No refresh token')
  }
  const res = await api.post<{ data: { accessToken: string; refreshToken: string; expiresIn: number } }>(
    '/auth/refresh',
    { refreshToken: refresh },
  )
  const d = res.data.data
  setSessionTokens(d.accessToken, d.refreshToken, d.expiresIn)
}

export async function getMe(): Promise<{
  id: string
  email: string
  name: string
  role: string
  plan: string
  onboardingDone: boolean
}> {
  const res = await api.get<{
    data: {
      id: string
      email: string
      name: string
      role: string
      plan: string
      onboardingDone: boolean
    }
  }>('/auth/me')
  return res.data.data
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email })
}

export async function resetPassword(payload: { token: string; newPassword: string }): Promise<void> {
  await api.post('/auth/reset-password', payload)
}

export async function verifyEmail(payload: { email: string; otp: string }): Promise<void> {
  await api.post('/auth/verify-email', payload)
}
