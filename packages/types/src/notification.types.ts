export type NotificationType =
  | 'phase_complete'
  | 'agent_done'
  | 'billing_event'
  | 'system_alert'
  | 'token_budget_warning'
  | 'export_complete'
  | 'security_alert'

export type EmailTemplate =
  | 'welcome'
  | 'phase_complete'
  | 'billing_receipt'
  | 'password_reset'
  | 'account_suspended'
  | 'token_budget_warning'
  | 'subscription_cancelled'
  | 'export_ready'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  actionUrl: string | null
  isRead: boolean
  metadata: Record<string, unknown>
  createdAt: string
}

export interface NotificationPreferences {
  userId: string
  emailEnabled: boolean
  inAppEnabled: boolean
  phaseComplete: boolean
  billingEvents: boolean
  securityAlerts: boolean // cannot be disabled
  weeklyDigest: boolean
}

export interface EmailLog {
  id: string
  userId: string | null
  toEmail: string
  template: EmailTemplate
  resendMessageId: string | null
  status: 'sent' | 'delivered' | 'bounced' | 'failed'
  openedAt: string | null
  createdAt: string
}
