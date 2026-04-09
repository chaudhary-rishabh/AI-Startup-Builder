import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'

import * as mfaQueries from '../../src/db/queries/mfaCredentials.queries.js'
import * as oauthQueries from '../../src/db/queries/oauthAccounts.queries.js'
import * as refreshQueries from '../../src/db/queries/refreshTokens.queries.js'
import * as usersQueries from '../../src/db/queries/users.queries.js'
import { getDb } from '../../src/lib/db.js'

const serviceRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

let dbReady = false
try {
  execSync('pnpm exec drizzle-kit migrate', {
    cwd: serviceRoot,
    stdio: 'pipe',
    env: process.env,
    shell: process.platform === 'win32' ? (process.env['ComSpec'] ?? 'cmd.exe') : '/bin/bash',
  })
  dbReady = true
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  console.warn(
    `[auth-service] Skipping DB integration tests: ${msg.split('\n')[0] ?? msg}`,
  )
}

describe.skipIf(!dbReady)('auth-service database integration', () => {
  beforeEach(async () => {
    const db = getDb()
    await db.execute(
      sql`TRUNCATE TABLE auth.refresh_tokens, auth.oauth_accounts, auth.mfa_credentials, auth.users RESTART IDENTITY CASCADE`,
    )
  })

describe('users queries', () => {
  it('creates and finds a user by email and id', async () => {
    const created = await usersQueries.createUser({
      email: 'u1@example.com',
      fullName: 'User One',
      status: 'active',
    })
    expect(created.email).toBe('u1@example.com')

    const byEmail = await usersQueries.findUserByEmail('u1@example.com')
    expect(byEmail?.id).toBe(created.id)

    const byId = await usersQueries.findUserById(created.id)
    expect(byId?.email).toBe('u1@example.com')
  })

  it('updates a user', async () => {
    const u = await usersQueries.createUser({
      email: 'u2@example.com',
      fullName: 'Two',
      status: 'active',
    })
    const updated = await usersQueries.updateUser(u.id, { fullName: 'Two Updated' })
    expect(updated?.fullName).toBe('Two Updated')
  })

  it('soft-deletes so active queries return undefined', async () => {
    const u = await usersQueries.createUser({
      email: 'u3@example.com',
      fullName: 'Three',
      status: 'active',
    })
    await usersQueries.softDeleteUser(u.id)
    expect(await usersQueries.findUserById(u.id)).toBeUndefined()
    expect(await usersQueries.findUserByEmail('u3@example.com')).toBeUndefined()
  })

  it('finds user by verification and password reset tokens', async () => {
    const u = await usersQueries.createUser({
      email: 'u4@example.com',
      fullName: 'Four',
      status: 'active',
      emailVerificationToken: 'verify-me',
    })
    const found = await usersQueries.findUserByEmailVerificationToken('verify-me')
    expect(found?.id).toBe(u.id)

    const future = new Date(Date.now() + 60_000)
    await usersQueries.updateUser(u.id, {
      passwordResetToken: 'reset-me',
      passwordResetExpiresAt: future,
    })
    const resetUser = await usersQueries.findUserByPasswordResetToken('reset-me')
    expect(resetUser?.id).toBe(u.id)
  })

  it('manages failed login and lock state', async () => {
    const u = await usersQueries.createUser({
      email: 'u5@example.com',
      fullName: 'Five',
      status: 'active',
    })
    await usersQueries.incrementFailedLoginAttempts(u.id)
    const afterInc = await usersQueries.findUserById(u.id)
    expect(afterInc?.failedLoginAttempts).toBe(1)

    const until = new Date(Date.now() + 15 * 60_000)
    await usersQueries.lockUserAccount(u.id, until)
    const locked = await usersQueries.findUserById(u.id)
    expect(locked?.failedLoginAttempts).toBe(0)
    expect(locked?.lockedUntil).toBeTruthy()

    await usersQueries.resetFailedLoginAttempts(u.id)
    const reset = await usersQueries.findUserById(u.id)
    expect(reset?.failedLoginAttempts).toBe(0)
    expect(reset?.lockedUntil).toBeNull()
  })

  it('updates last active timestamp', async () => {
    const u = await usersQueries.createUser({
      email: 'u6@example.com',
      fullName: 'Six',
      status: 'active',
    })
    await usersQueries.updateLastActive(u.id)
    const again = await usersQueries.findUserById(u.id)
    expect(again?.lastActiveAt).toBeTruthy()
  })
})

describe('oauth accounts queries', () => {
  it('upserts and finds oauth accounts', async () => {
    const u = await usersQueries.createUser({
      email: 'o@example.com',
      fullName: 'OAuth User',
      status: 'active',
    })
    const first = await oauthQueries.upsertOAuthAccount({
      userId: u.id,
      provider: 'google',
      providerAccountId: 'gid-1',
      accessToken: 'at-1',
    })
    expect(first.accessToken).toBe('at-1')

    const second = await oauthQueries.upsertOAuthAccount({
      userId: u.id,
      provider: 'google',
      providerAccountId: 'gid-1',
      accessToken: 'at-2',
    })
    expect(second.accessToken).toBe('at-2')
    expect(second.id).toBe(first.id)

    const found = await oauthQueries.findOAuthAccount('google', 'gid-1')
    expect(found?.accessToken).toBe('at-2')

    const list = await oauthQueries.findOAuthAccountsByUserId(u.id)
    expect(list).toHaveLength(1)

    await oauthQueries.deleteOAuthAccount(first.id, u.id)
    expect(await oauthQueries.findOAuthAccount('google', 'gid-1')).toBeUndefined()
  })
})

describe('refresh token queries', () => {
  it('creates, finds, revokes, and cleans up tokens', async () => {
    const u = await usersQueries.createUser({
      email: 'r@example.com',
      fullName: 'Refresh',
      status: 'active',
    })
    const future = new Date(Date.now() + 86_400_000)
    const row = await refreshQueries.createRefreshToken({
      userId: u.id,
      tokenHash: 'hash-a',
      expiresAt: future,
    })
    expect(row.tokenHash).toBe('hash-a')

    const found = await refreshQueries.findRefreshToken('hash-a')
    expect(found?.userId).toBe(u.id)

    const active = await refreshQueries.findActiveTokensByUserId(u.id)
    expect(active).toHaveLength(1)

    await refreshQueries.revokeRefreshToken('hash-a', undefined)
    expect(await refreshQueries.findRefreshToken('hash-a')).toBeUndefined()

    await refreshQueries.createRefreshToken({
      userId: u.id,
      tokenHash: 'hash-b',
      expiresAt: future,
    })
    await refreshQueries.createRefreshToken({
      userId: u.id,
      tokenHash: 'hash-c',
      expiresAt: future,
    })
    await refreshQueries.revokeAllUserTokens(u.id)
    const activeAfter = await refreshQueries.findActiveTokensByUserId(u.id)
    expect(activeAfter).toHaveLength(0)

    const past = new Date(Date.now() - 86_400_000)
    await refreshQueries.createRefreshToken({
      userId: u.id,
      tokenHash: 'hash-old',
      expiresAt: past,
      revokedAt: new Date(),
    })
    const n = await refreshQueries.deleteExpiredTokens()
    expect(n).toBeGreaterThanOrEqual(1)
  })
})

describe('mfa credential queries', () => {
  it('manages MFA lifecycle', async () => {
    const u = await usersQueries.createUser({
      email: 'm@example.com',
      fullName: 'MFA',
      status: 'active',
    })
    const row = await mfaQueries.createMfaCredential({
      userId: u.id,
      totpSecret: 'enc-secret',
      backupCodes: ['a', 'b'],
    })
    expect(row.isEnabled).toBe(false)

    const updated = await mfaQueries.updateMfaCredential(u.id, { totpSecret: 'enc-secret-2' })
    expect(updated?.totpSecret).toBe('enc-secret-2')

    await mfaQueries.enableMfa(u.id)
    const enabled = await mfaQueries.findMfaByUserId(u.id)
    expect(enabled?.isEnabled).toBe(true)

    await mfaQueries.updateLastUsed(u.id)
    expect((await mfaQueries.findMfaByUserId(u.id))?.lastUsedAt).toBeTruthy()

    await mfaQueries.disableMfa(u.id)
    expect((await mfaQueries.findMfaByUserId(u.id))?.isEnabled).toBe(false)

    await mfaQueries.deleteMfaCredential(u.id)
    expect(await mfaQueries.findMfaByUserId(u.id)).toBeUndefined()
  })
})

})
