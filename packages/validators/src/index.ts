// Auth schemas
export {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  VerifyEmailSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  GoogleOAuthSchema,
  Setup2FASchema,
  Verify2FASchema,
  AdminLoginSchema,
} from './auth.validators.js'
export type {
  RegisterInput,
  LoginInput,
  ResetPasswordInput,
  AdminLoginInput,
} from './auth.validators.js'

// Project schemas
export {
  CreateProjectSchema,
  UpdateProjectSchema,
  AdvancePhaseSchema,
  SavePhaseDataSchema,
  ExportProjectSchema,
  AppendConversationSchema,
  ListProjectsQuerySchema,
  AdminProjectsQuerySchema,
  ProjectSearchQuerySchema,
  ConversationListQuerySchema,
  DuplicateProjectBodySchema,
} from './project.validators.js'
export type {
  CreateProjectInput,
  UpdateProjectInput,
  AdvancePhaseInput,
  ExportProjectInput,
} from './project.validators.js'

// Profile schemas
export {
  UpdateProfileSchema,
  CreateApiKeySchema,
  CompleteOnboardingStepSchema,
  UpdateNotificationPrefsSchema,
} from './profile.validators.js'
export type {
  UpdateProfileInput,
  CreateApiKeyInput,
  CompleteOnboardingStepInput,
} from './profile.validators.js'

// Billing schemas
export {
  CreateCheckoutSessionSchema,
  ValidateCouponSchema,
  AdminRefundSchema,
} from './billing.validators.js'
export type {
  CreateCheckoutInput,
  ValidateCouponInput,
  AdminRefundInput,
} from './billing.validators.js'

// Agent + analytics schemas
export {
  StartAgentRunSchema,
  ChatMessageSchema,
  IngestEventSchema,
  IngestEventBatchSchema,
  AdminKPIQuerySchema,
} from './agent.validators.js'
export type {
  StartAgentRunInput,
  ChatMessageInput,
  IngestEventInput,
} from './agent.validators.js'
