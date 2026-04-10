import { sql } from 'drizzle-orm'
import { index, jsonb, pgSchema, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

/**
 * Inlined like auth-service so drizzle-kit can load this file without pulling
 * `@repo/db` through drizzle-kit's CJS loader.
 */
const timestampColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}

export const usersSchema = pgSchema('users')

export const userProfiles = usersSchema.table(
  'user_profiles',
  {
    id: uuid('id').primaryKey(),
    roleType: text('role_type', {
      enum: ['FOUNDER', 'DESIGNER', 'DEVELOPER', 'OTHER'],
    }),
    bio: text('bio'),
    companyName: text('company_name'),
    websiteUrl: text('website_url'),
    timezone: text('timezone').notNull().default('UTC'),
    notificationPrefs: jsonb('notification_prefs')
      .notNull()
      .default({} as Record<string, unknown>),
    themePrefs: jsonb('theme_prefs').notNull().default({} as Record<string, unknown>),
    ...timestampColumns,
  },
  (t) => ({
    createdAtIdx: index('user_profiles_created_at_idx').on(t.createdAt),
  }),
)

export const onboardingState = usersSchema.table(
  'onboarding_state',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    currentStep: text('current_step', {
      enum: ['profile', 'idea', 'plan', 'complete'],
    })
      .notNull()
      .default('profile'),
    completedSteps: jsonb('completed_steps').notNull().default(sql`'[]'::jsonb`),
    stepData: jsonb('step_data').notNull().default(sql`'{}'::jsonb`),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...timestampColumns,
  },
  (t) => ({
    userIdx: uniqueIndex('onboarding_user_idx').on(t.userId),
  }),
)

export const userIntegrations = usersSchema.table(
  'user_integrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    service: text('service', {
      enum: ['notion', 'github', 'figma', 'vercel', 'posthog', 'ga4'],
    }).notNull(),
    accessTokenEnc: text('access_token_enc').notNull(),
    refreshTokenEnc: text('refresh_token_enc'),
    scopes: jsonb('scopes').notNull().default(sql`'[]'::jsonb`),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestampColumns,
  },
  (t) => ({
    userServiceIdx: uniqueIndex('integrations_user_service_idx').on(t.userId, t.service),
    userIdx: index('integrations_user_idx').on(t.userId),
  }),
)

export type UserProfile = typeof userProfiles.$inferSelect
export type NewUserProfile = typeof userProfiles.$inferInsert
export type OnboardingState = typeof onboardingState.$inferSelect
export type NewOnboardingState = typeof onboardingState.$inferInsert
export type UserIntegration = typeof userIntegrations.$inferSelect
export type NewUserIntegration = typeof userIntegrations.$inferInsert
