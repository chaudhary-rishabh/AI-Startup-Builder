import { boolean, index, jsonb, pgSchema, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

export const notificationsSchema = pgSchema('notifications')

export const notifications = notificationsSchema.table(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    type: varchar('type', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    actionUrl: text('action_url'),
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    unreadIdx: index('notif_notifications_user_read_created_idx').on(t.userId, t.isRead, t.createdAt),
    userCreatedIdx: index('notif_notifications_user_created_idx').on(t.userId, t.createdAt),
    userTypeCreatedIdx: index('notif_notifications_user_type_created_idx').on(t.userId, t.type, t.createdAt),
  }),
)

export const emailLogs = notificationsSchema.table(
  'email_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id'),
    toEmail: varchar('to_email', { length: 255 }).notNull(),
    template: varchar('template', { length: 100 }).notNull(),
    resendMessageId: varchar('resend_message_id', { length: 255 }),
    status: varchar('status', { length: 20 }).notNull().default('sent'),
    errorMessage: text('error_message'),
    openedAt: timestamp('opened_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index('notif_email_logs_user_created_idx').on(t.userId, t.createdAt),
    emailTemplateIdx: index('notif_email_logs_email_template_created_idx').on(
      t.toEmail,
      t.template,
      t.createdAt,
    ),
    resendMessageIdUnique: uniqueIndex('notif_email_logs_resend_message_id_uniq').on(t.resendMessageId),
  }),
)

export const notificationPrefs = notificationsSchema.table('notification_prefs', {
  userId: uuid('user_id').primaryKey(),
  emailEnabled: boolean('email_enabled').notNull().default(true),
  inAppEnabled: boolean('in_app_enabled').notNull().default(true),
  phaseComplete: boolean('phase_complete').notNull().default(true),
  agentDone: boolean('agent_done').notNull().default(true),
  billingEvents: boolean('billing_events').notNull().default(true),
  tokenWarnings: boolean('token_warnings').notNull().default(true),
  ragStatus: boolean('rag_status').notNull().default(true),
  exportReady: boolean('export_ready').notNull().default(true),
  weeklyDigest: boolean('weekly_digest').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
export type EmailLog = typeof emailLogs.$inferSelect
export type NewEmailLog = typeof emailLogs.$inferInsert
export type NotificationPrefs = typeof notificationPrefs.$inferSelect
export type NewNotificationPrefs = typeof notificationPrefs.$inferInsert
export type NotificationPrefsUpdate = Omit<
  NewNotificationPrefs,
  'userId' | 'createdAt' | 'updatedAt'
>
