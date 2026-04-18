import api from '@/lib/axios'
import type { AdminUser } from '@/types'

export interface AdminLoginCredentials {
  email: string
  password: string
}

export interface AdminLoginResponse {
  requiresTotp: true
  tempToken: string
}

export interface AdminTotpResponse {
  admin: AdminUser
}

function isSuccessEnvelope<T>(body: unknown): body is { success: true; data: T } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'success' in body &&
    (body as { success: boolean }).success === true &&
    'data' in body
  )
}

export async function adminLogin(
  credentials: AdminLoginCredentials,
): Promise<AdminLoginResponse> {
  const body: unknown = await api.post('/auth/admin/login', credentials)
  if (isSuccessEnvelope<AdminLoginResponse>(body)) {
    return body.data
  }
  throw new Error('Unexpected login response')
}

export async function adminVerifyTotp(
  tempToken: string,
  totpCode: string,
): Promise<AdminTotpResponse> {
  const body: unknown = await api.post('/auth/admin/verify-totp', {
    tempToken,
    totpCode,
  })
  if (isSuccessEnvelope<AdminTotpResponse>(body)) {
    return body.data
  }
  throw new Error('Unexpected TOTP response')
}

export async function adminLogout(): Promise<void> {
  const body: unknown = await api.post('/auth/admin/logout', {})
  if (isSuccessEnvelope<Record<string, never>>(body)) {
    return
  }
  if (
    typeof body === 'object' &&
    body !== null &&
    'success' in body &&
    (body as { success: boolean }).success === true
  ) {
    return
  }
  throw new Error('Unexpected logout response')
}
