import { index, jsonb, pgSchema, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const analyticsSchema = pgSchema('analytics')

export const platformEvents = analyticsSchema.table(
  'platform_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id'),
    projectId: uuid('project_id'),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    properties: jsonb('properties').$type<Record<string, unknown>>().notNull().default({}),
    sessionId: varchar('session_id', { length: 100 }),
    ipHash: varchar('ip_hash', { length: 64 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    eventTimeIdx: index('analytics_platform_events_event_type_created_idx').on(t.eventType, t.createdAt),
    userEventIdx: index('analytics_platform_events_user_event_created_idx').on(
      t.userId,
      t.eventType,
      t.createdAt,
    ),
    projectTimeIdx: index('analytics_platform_events_project_created_idx').on(t.projectId, t.createdAt),
    createdIdx: index('analytics_platform_events_created_idx').on(t.createdAt),
  }),
)

export const auditLogs = analyticsSchema.table(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id').notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    targetType: varchar('target_type', { length: 50 }).notNull(),
    targetId: uuid('target_id'),
    beforeState: jsonb('before_state').$type<Record<string, unknown> | null>(),
    afterState: jsonb('after_state').$type<Record<string, unknown> | null>(),
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    adminCreatedIdx: index('analytics_audit_logs_admin_created_idx').on(t.adminId, t.createdAt),
    targetIdx: index('analytics_audit_logs_target_created_idx').on(t.targetType, t.targetId, t.createdAt),
    actionIdx: index('analytics_audit_logs_action_created_idx').on(t.action, t.createdAt),
    createdIdx: index('analytics_audit_logs_created_idx').on(t.createdAt),
  }),
)

export type PlatformEvent = typeof platformEvents.$inferSelect
export type NewPlatformEvent = typeof platformEvents.$inferInsert
export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
