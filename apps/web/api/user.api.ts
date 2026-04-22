import api from '@/lib/axios'

export interface UserProfile {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  role: string
  bio: string | null
  company: string | null
  website: string | null
  timezone: string
}

export interface NotificationPreferences {
  emailEnabled: boolean
  inAppEnabled: boolean
  phaseComplete: boolean
  agentDone: boolean
  billingEvents: boolean
  weeklyDigest: boolean
  securityAlerts: boolean
}

export interface ApiKey {
  id: string
  prefix: string
  name: string
  lastUsedAt: string | null
  createdAt: string
}

export async function getProfile(): Promise<UserProfile> {
  const res = await api.get<{ data: UserProfile }>('/users/me')
  return res.data.data
}

export async function updateProfile(payload: Partial<Omit<UserProfile, 'id' | 'email'>>): Promise<UserProfile> {
  const res = await api.patch<{ data: UserProfile }>('/users/me', payload)
  return res.data.data
}

export async function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.put<{ data: { avatarUrl: string } }>('/users/me/avatar', formData)
  return res.data.data
}

export async function getNotificationPrefs(): Promise<NotificationPreferences> {
  const res = await api.get<{ data: { notificationPrefs: NotificationPreferences } }>('/users/me')
  return res.data.data.notificationPrefs
}

export async function updateNotificationPrefs(
  prefs: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const res = await api.patch<{ data: { notificationPrefs: NotificationPreferences } }>('/users/me', { notificationPrefs: prefs })
  return res.data.data.notificationPrefs
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const res = await api.get<{ data: ApiKey[] }>('/users/me/api-keys')
  return res.data.data
}

export async function createApiKey(name: string): Promise<{
  id: string
  prefix: string
  secret: string
  name: string
}> {
  const res = await api.post<{ data: { id: string; prefix: string; secret: string; name: string } }>('/users/me/api-keys', {
    name,
  })
  return res.data.data
}

export async function revokeApiKey(keyId: string): Promise<void> {
  await api.delete(`/users/me/api-keys/${keyId}`)
}
