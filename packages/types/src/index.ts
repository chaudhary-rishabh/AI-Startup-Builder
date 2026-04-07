// User & auth domain
export type {
  UserRole,
  PlanTier,
  UserStatus,
  User,
  UserProfile,
  UserIntegration,
  ApiKey,
  OnboardingState,
} from './user.types.js'

// Project & canvas domain
export type {
  PhaseNumber,
  ProjectStatus,
  ProjectMode,
  ExportFormat,
  Project,
  PhaseOutput,
  ProjectFile,
  DesignCanvas,
  CanvasElement,
  CanvasPage,
  ConversationMessage,
  ProjectExport,
} from './project.types.js'

// AI agent domain
export type {
  AgentModel,
  AgentType,
  AgentStatus,
  AgentRun,
  AgentInput,
  AgentOutput,
  ProjectContext,
  Phase1Output,
  Phase2Output,
  Phase3Output,
  Phase4Output,
  Phase5Output,
} from './agent.types.js'

// Billing domain
export type {
  SubscriptionStatus,
  BillingCycle,
  TransactionStatus,
  DiscountType,
  Plan,
  Subscription,
  Transaction,
  TokenUsage,
  Coupon,
} from './billing.types.js'

// Notifications domain
export type {
  NotificationType,
  EmailTemplate,
  Notification,
  NotificationPreferences,
  EmailLog,
} from './notification.types.js'

// Analytics domain
export type {
  PlatformEvent,
  AuditLog,
  KPIData,
  TimeSeriesPoint,
  FunnelData,
} from './analytics.types.js'

// API response envelopes — shared by all services and frontends
export type {
  SuccessResponse,
  ErrorResponse,
  PaginationMeta,
  ValidationErrorDetail,
  ApiResponse,
} from './api.types.js'

// Redis Stream / BullMQ event payloads
export type {
  UserRegisteredEvent,
  UserDeletedEvent,
  UserProfileUpdatedEvent,
  UserApiKeyCreatedEvent,
  ApiKeyRevokedEvent,
  SubscriptionUpgradedEvent,
  SubscriptionCancelledEvent,
  InvoicePaidEvent,
  ProjectCreatedEvent,
  ProjectPhaseAdvancedEvent,
  ProjectDuplicatedEvent,
  ProjectExportRequestedEvent,
  ExportCompletedEvent,
  AgentRunCompletedEvent,
  TokenBudgetWarningEvent,
  DocumentIndexedEvent,
  DocumentIndexingFailedEvent,
  AuthBruteForceDetectedEvent,
  UserOnboardingCompletedEvent,
  AnalyticsWeeklyDigestReadyEvent,
} from './events.types.js'
