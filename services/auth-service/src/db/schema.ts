import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * Column shapes match `@repo/db` (`timestampColumns`, `softDeleteColumn`).
 * They are inlined here (not imported) so `drizzle-kit generate` can load this
 * file without pulling `@repo/db` through drizzle-kit's CJS loader, which does
 * not resolve that package's `.js` import specifiers.
 */
const timestampColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}

const softDeleteColumn = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}

export const authSchema = pgSchema('auth')

export const users = authSchema.table(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    passwordHash: text('password_hash'),
    fullName: text('full_name').notNull(),
    avatarUrl: text('avatar_url'),
    role: text('role', { enum: ['user', 'admin', 'super_admin'] })
      .notNull()
      .default('user'),
    planTier: text('plan_tier', { enum: ['free', 'pro', 'enterprise'] })
      .notNull()
      .default('free'),
    status: text('status', {
      enum: ['active', 'suspended', 'pending_verification'],
    })
      .notNull()
      .default('pending_verification'),
    onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    emailVerificationToken: text('email_verification_token'),
    passwordResetToken: text('password_reset_token'),
    passwordResetExpiresAt: timestamp('password_reset_expires_at', { withTimezone: true }),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_idx').on(t.email),
    statusIdx: index('users_status_idx').on(t.status),
    roleIdx: index('users_role_idx').on(t.role),
  }),
)

export const oauthAccounts = authSchema.table(
  'oauth_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider', { enum: ['google', 'github'] }).notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    rawProfile: jsonb('raw_profile'),
    ...timestampColumns,
  },
  (t) => ({
    providerAccountIdx: uniqueIndex('oauth_provider_account_idx').on(t.provider, t.providerAccountId),
    userIdx: index('oauth_user_idx').on(t.userId),
  }),
)

export const refreshTokens = authSchema.table(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    deviceInfo: jsonb('device_info'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedByTokenId: uuid('replaced_by_token_id'),
    ...timestampColumns,
  },
  (t) => ({
    tokenHashIdx: uniqueIndex('refresh_tokens_hash_idx').on(t.tokenHash),
    userIdx: index('refresh_tokens_user_idx').on(t.userId),
    expiresIdx: index('refresh_tokens_expires_idx').on(t.expiresAt),
  }),
)

export const mfaCredentials = authSchema.table(
  'mfa_credentials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    totpSecret: text('totp_secret').notNull(),
    backupCodes: jsonb('backup_codes').notNull(),
    isEnabled: boolean('is_enabled').notNull().default(false),
    enabledAt: timestamp('enabled_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    ...timestampColumns,
  },
  (t) => ({
    userIdx: uniqueIndex('mfa_user_idx').on(t.userId),
  }),
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type OAuthAccount = typeof oauthAccounts.$inferSelect
export type NewOAuthAccount = typeof oauthAccounts.$inferInsert
export type RefreshToken = typeof refreshTokens.$inferSelect
export type NewRefreshToken = typeof refreshTokens.$inferInsert
export type MfaCredential = typeof mfaCredentials.$inferSelect
export type NewMfaCredential = typeof mfaCredentials.$inferInsert
