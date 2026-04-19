import api from '@/lib/axios'
import type {
  EmailSettings,
  EmailTemplateKey,
  EmailTemplatePreview,
  FeatureFlag,
  GeneralSettings,
  IntegrationKey,
  SecuritySettings,
} from '@/types'
import { unwrap } from '@/lib/api/envelope'

// ── General ──────────────────────────────────────────────────────────────────
export async function getGeneralSettings(): Promise<GeneralSettings> {
  const body: unknown = await api.get('/admin/settings/general')
  return unwrap(body)
}

export async function updateGeneralSettings(
  payload: Partial<GeneralSettings>,
): Promise<GeneralSettings> {
  const body: unknown = await api.patch('/admin/settings/general', payload)
  return unwrap(body)
}

export async function uploadLogo(file: File): Promise<{ logoUrl: string }> {
  const form = new FormData()
  form.append('file', file)
  const body: unknown = await api.post('/admin/settings/logo', form)
  return unwrap(body)
}

// ── Email ────────────────────────────────────────────────────────────────────
export async function getEmailSettings(): Promise<EmailSettings> {
  const body: unknown = await api.get('/admin/settings/email')
  return unwrap(body)
}

export async function updateEmailSettings(
  payload: Partial<EmailSettings>,
): Promise<EmailSettings> {
  const body: unknown = await api.patch('/admin/settings/email', payload)
  return unwrap(body)
}

export async function getEmailTemplatePreviews(): Promise<
  EmailTemplatePreview[]
> {
  const body: unknown = await api.get('/admin/settings/email/templates')
  return unwrap(body)
}

export async function sendTestEmail(
  templateKey: EmailTemplateKey,
  toEmail: string,
): Promise<void> {
  const body: unknown = await api.post('/admin/settings/email/test', {
    templateKey,
    toEmail,
  })
  unwrap(body)
}

// ── Integrations ──────────────────────────────────────────────────────────────
export async function getIntegrationKeys(): Promise<IntegrationKey[]> {
  const body: unknown = await api.get('/admin/settings/integrations')
  return unwrap(body)
}

export async function updateIntegrationKey(
  service: string,
  apiKey: string,
): Promise<IntegrationKey> {
  const body: unknown = await api.patch(
    `/admin/settings/integrations/${encodeURIComponent(service)}`,
    { apiKey },
  )
  return unwrap(body)
}

export async function validateIntegrationKey(
  service: string,
): Promise<{ valid: boolean; message: string }> {
  const body: unknown = await api.post(
    `/admin/settings/integrations/${encodeURIComponent(service)}/validate`,
    {},
  )
  return unwrap(body)
}

// ── Feature Flags ────────────────────────────────────────────────────────────
export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  const body: unknown = await api.get('/admin/settings/feature-flags')
  return unwrap(body)
}

// Toggling feature flags is logged in the audit trail as feature_flag.toggled.
export async function updateFeatureFlag(
  flagId: string,
  payload: {
    enabled?: boolean
    rolloutPercent?: number
    planRestriction?: string[]
  },
): Promise<FeatureFlag> {
  const body: unknown = await api.patch(
    `/admin/settings/feature-flags/${encodeURIComponent(flagId)}`,
    payload,
  )
  return unwrap(body)
}

// ── Security ──────────────────────────────────────────────────────────────────
export async function getSecuritySettings(): Promise<SecuritySettings> {
  const body: unknown = await api.get('/admin/settings/security')
  return unwrap(body)
}

export async function updateSecuritySettings(
  payload: Partial<SecuritySettings>,
): Promise<SecuritySettings> {
  const body: unknown = await api.patch('/admin/settings/security', payload)
  return unwrap(body)
}

export async function invalidateAdminSessions(): Promise<{
  sessionsInvalidated: number
}> {
  const body: unknown = await api.post(
    '/admin/settings/security/invalidate-sessions',
  )
  return unwrap(body)
}
