import { env } from '../config/env.js'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  role: string
  planTier: string
  status: string
  onboardingCompleted: boolean
  createdAt: string
  avatarUrl: string | null
}

function headers(requestId?: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (requestId) h['X-Request-ID'] = requestId
  return h
}

export async function getAuthUser(userId: string, requestId?: string): Promise<AuthUser | null> {
  const res = await fetch(`${env.AUTH_SERVICE_URL}/internal/users/${userId}`, {
    method: 'GET',
    headers: headers(requestId),
  })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`auth-service get user failed: ${res.status}`)
  }
  const json = (await res.json()) as { success: boolean; data: AuthUser }
  return json.data
}

export async function verifyPassword(
  userId: string,
  password: string,
  requestId?: string,
): Promise<boolean> {
  const res = await fetch(`${env.AUTH_SERVICE_URL}/internal/verify-password`, {
    method: 'POST',
    headers: headers(requestId),
    body: JSON.stringify({ userId, password }),
  })
  if (!res.ok) {
    throw new Error(`auth-service verify-password failed: ${res.status}`)
  }
  const json = (await res.json()) as { success: boolean; data: { valid: boolean } }
  return json.data.valid
}

export async function softDeleteAuthUser(userId: string, requestId?: string): Promise<void> {
  const res = await fetch(`${env.AUTH_SERVICE_URL}/internal/users/${userId}/soft-delete`, {
    method: 'POST',
    headers: headers(requestId),
  })
  if (!res.ok) {
    throw new Error(`auth-service soft-delete failed: ${res.status}`)
  }
}

export async function completeAuthOnboarding(userId: string, requestId?: string): Promise<void> {
  const res = await fetch(`${env.AUTH_SERVICE_URL}/internal/users/${userId}/complete-onboarding`, {
    method: 'POST',
    headers: headers(requestId),
  })
  if (!res.ok) {
    throw new Error(`auth-service complete-onboarding failed: ${res.status}`)
  }
}

export async function patchAuthUserFullName(
  userId: string,
  fullName: string,
  requestId?: string,
): Promise<void> {
  const res = await fetch(`${env.AUTH_SERVICE_URL}/internal/users/${userId}`, {
    method: 'PATCH',
    headers: headers(requestId),
    body: JSON.stringify({ fullName }),
  })
  if (!res.ok) {
    throw new Error(`auth-service patch user failed: ${res.status}`)
  }
}
