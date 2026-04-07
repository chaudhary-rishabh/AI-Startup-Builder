import { z } from 'zod'

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  companyName: z.string().max(200).optional(),
  // Allow empty string to clear the URL
  websiteUrl: z.string().url().optional().or(z.literal('')),
  timezone: z.string().optional(),
  notificationPrefs: z
    .object({
      emailOnPhaseComplete: z.boolean(),
      emailOnBilling: z.boolean(),
      inAppAll: z.boolean(),
    })
    .partial()
    .optional(),
  themePrefs: z
    .object({
      preferredMode: z.enum(['design', 'dev']),
      sidebarCollapsed: z.boolean(),
    })
    .partial()
    .optional(),
})

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z
    .array(z.enum(['read', 'write', 'ai', 'rag', 'admin']))
    .min(1, 'At least one scope is required'),
  expiresInDays: z.number().int().min(1).max(365).optional(),
})

export const CompleteOnboardingStepSchema = z.object({
  step: z.enum(['profile', 'idea', 'plan']),
  data: z.record(z.unknown()).optional(),
})

export const UpdateNotificationPrefsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  phaseComplete: z.boolean().optional(),
  billingEvents: z.boolean().optional(),
  // securityAlerts intentionally omitted — cannot be disabled by user
  weeklyDigest: z.boolean().optional(),
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>
export type CompleteOnboardingStepInput = z.infer<typeof CompleteOnboardingStepSchema>
