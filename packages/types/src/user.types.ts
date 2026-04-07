export type UserRole = 'user' | 'admin' | 'super_admin'
export type PlanTier = 'free' | 'pro' | 'enterprise'
export type UserStatus = 'active' | 'suspended' | 'pending_verification'

export interface User {
  id: string
  email: string
  emailVerifiedAt: string | null
  fullName: string
  avatarUrl: string | null
  role: UserRole
  planTier: PlanTier
  status: UserStatus
  onboardingCompleted: boolean
  lastActiveAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface UserProfile {
  id: string // FK = users.id (1:1)
  roleType: 'FOUNDER' | 'DESIGNER' | 'DEVELOPER' | 'OTHER' | null
  bio: string | null
  companyName: string | null
  websiteUrl: string | null
  timezone: string
  notificationPrefs: {
    emailOnPhaseComplete: boolean
    emailOnBilling: boolean
    inAppAll: boolean
  }
  themePrefs: {
    preferredMode: 'design' | 'dev'
    sidebarCollapsed: boolean
  }
  apiKeyHash: string | null
  apiKeyPrefix: string | null
  createdAt: string
  updatedAt: string
}

export interface UserIntegration {
  id: string
  userId: string
  service: 'notion' | 'github' | 'figma' | 'vercel' | 'posthog' | 'ga4'
  scopes: string[]
  metadata: Record<string, unknown>
  expiresAt: string | null
  createdAt: string
}

export interface ApiKey {
  id: string
  userId: string
  keyHash: string
  prefix: string
  name: string
  scopes: Array<'read' | 'write' | 'ai' | 'rag' | 'admin'>
  lastUsedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
}

export interface OnboardingState {
  userId: string
  completedSteps: string[]
  currentStep: string
  isComplete: boolean
  completedAt: string | null
}
