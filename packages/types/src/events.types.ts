// All Redis Stream / BullMQ event payloads — typed for exactly-once delivery.
// Producers and consumers must import from this file — never duplicate payload types.

export interface UserRegisteredEvent {
  userId: string
  email: string
  name: string
  plan: 'free'
  createdAt: string
}

export interface UserDeletedEvent {
  userId: string
  deletedAt: string
  anonymized: true
}

export interface UserProfileUpdatedEvent {
  userId: string
  changes: string[]
}

export interface UserApiKeyCreatedEvent {
  userId: string
  keyId: string
  scopes: string[]
}

export interface ApiKeyRevokedEvent {
  userId: string
  keyId: string
  revokedAt: string
}

export interface SubscriptionUpgradedEvent {
  userId: string
  oldPlan: string
  newPlan: string
  tokenLimit: number
  effectiveAt: string
}

export interface SubscriptionCancelledEvent {
  userId: string
  plan: string
  cancelledAt: string
  accessUntil: string
}

export interface InvoicePaidEvent {
  userId: string
  amountCents: number
  currency: string
  invoiceId: string
  receiptUrl: string
}

export interface ProjectCreatedEvent {
  projectId: string
  userId: string
  name: string
}

export interface ProjectPhaseAdvancedEvent {
  projectId: string
  userId: string
  fromPhase: number
  toPhase: number
  advancedAt: string
}

export interface ProjectDuplicatedEvent {
  originalProjectId: string
  newProjectId: string
  userId: string
}

export interface ProjectExportRequestedEvent {
  projectId: string
  format: string
  jobId: string
  includePhases: number[]
}

export interface ExportCompletedEvent {
  userId: string
  projectId: string
  jobId: string
  downloadUrl: string
  expiresAt: string
}

export interface AgentRunCompletedEvent {
  runId: string
  projectId: string
  userId: string
  phase: number
  agentType: string
  tokensUsed: number
  durationMs: number
  model: string
}

export interface TokenBudgetWarningEvent {
  userId: string
  percentUsed: 80 | 95
  tokensUsed: number
  tokenLimit: number
}

export interface DocumentIndexedEvent {
  userId: string
  docId: string
  chunkCount: number
  namespace: string
}

export interface DocumentIndexingFailedEvent {
  userId: string
  docId: string
  filename: string
  error: string
}

export interface AuthBruteForceDetectedEvent {
  userId: string | null
  ip: string
  attempts: number
  lockedUntil: string
}

export interface UserOnboardingCompletedEvent {
  userId: string
  completedAt: string
}

export interface AnalyticsWeeklyDigestReadyEvent {
  userId: string
  digestData: Record<string, unknown>
}
