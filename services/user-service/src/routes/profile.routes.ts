import { UpdateProfileSchema } from '@repo/validators'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import * as integrationsQueries from '../db/queries/integrations.queries.js'
import * as profilesQueries from '../db/queries/profiles.queries.js'
import type { NewUserProfile, UserProfile } from '../db/schema.js'
import { publishUserDeleted, publishUserProfileUpdated } from '../events/publisher.js'
import { err, ok } from '../lib/response.js'
import { requireAuth } from '../middleware/requireAuth.js'
import type { AuthUser } from '../services/authClient.service.js'
import {
  getAuthUser,
  patchAuthUserFullName,
  softDeleteAuthUser,
  verifyPassword,
} from '../services/authClient.service.js'

const DeleteAccountBodySchema = z.object({
  password: z.string().min(1),
})

const profile = new Hono()

export function mergeUserProfile(auth: AuthUser, row: UserProfile) {
  return {
    id: auth.id,
    email: auth.email,
    fullName: auth.fullName,
    role: auth.role,
    planTier: auth.planTier,
    status: auth.status,
    avatarUrl: auth.avatarUrl,
    roleType: row.roleType ?? null,
    bio: row.bio ?? null,
    companyName: row.companyName ?? null,
    websiteUrl: row.websiteUrl ?? null,
    timezone: row.timezone,
    notificationPrefs: row.notificationPrefs,
    themePrefs: row.themePrefs,
    onboardingCompleted: auth.onboardingCompleted,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

profile.get('/me', requireAuth, async (c) => {
  const userId = c.get('userId' as never) as string
  const requestId = c.get('requestId' as never) as string | undefined

  const [row, auth] = await Promise.all([
    profilesQueries.findProfileById(userId),
    getAuthUser(userId, requestId),
  ])

  if (!auth) {
    return err(c, 404, 'USER_NOT_FOUND', 'User not found')
  }
  if (!row) {
    return err(c, 404, 'PROFILE_NOT_FOUND', 'User profile not found')
  }

  return ok(c, mergeUserProfile(auth, row))
})

profile.patch(
  '/me',
  requireAuth,
  zValidator('json', UpdateProfileSchema, (r) => {
    if (!r.success) throw r.error
  }),
  async (c) => {
    const userId = c.get('userId' as never) as string
    const requestId = c.get('requestId' as never) as string | undefined
    const body = c.req.valid('json')

    const row = await profilesQueries.findProfileById(userId)
    if (!row) {
      return err(c, 404, 'PROFILE_NOT_FOUND', 'User profile not found')
    }

    if (body.fullName !== undefined) {
      await patchAuthUserFullName(userId, body.fullName, requestId)
    }

    const patch: Partial<NewUserProfile> = {}
    if (body.roleType !== undefined) patch.roleType = body.roleType
    if (body.bio !== undefined) patch.bio = body.bio
    if (body.companyName !== undefined) patch.companyName = body.companyName
    if (body.websiteUrl !== undefined) {
      patch.websiteUrl = body.websiteUrl === '' ? null : body.websiteUrl
    }
    if (body.timezone !== undefined) patch.timezone = body.timezone
    if (body.notificationPrefs !== undefined) {
      patch.notificationPrefs = body.notificationPrefs as NewUserProfile['notificationPrefs']
    }
    if (body.themePrefs !== undefined) {
      patch.themePrefs = body.themePrefs as NewUserProfile['themePrefs']
    }

    const updated = await profilesQueries.updateProfile(userId, patch)
    if (!updated) {
      return err(c, 404, 'PROFILE_NOT_FOUND', 'User profile not found')
    }

    const changes = Object.keys(body).filter((k) => body[k as keyof typeof body] !== undefined)
    try {
      await publishUserProfileUpdated(userId, changes)
    } catch (e) {
      console.error('[user-service] Failed to publish profile update:', e)
    }

    const auth = await getAuthUser(userId, requestId)
    if (!auth) {
      return err(c, 404, 'USER_NOT_FOUND', 'User not found')
    }
    return ok(c, mergeUserProfile(auth, updated))
  },
)

profile.delete(
  '/me',
  requireAuth,
  zValidator('json', DeleteAccountBodySchema, (r) => {
    if (!r.success) throw r.error
  }),
  async (c) => {
    const userId = c.get('userId' as never) as string
    const requestId = c.get('requestId' as never) as string | undefined
    const { password } = c.req.valid('json')

    const valid = await verifyPassword(userId, password, requestId)
    if (!valid) {
      return err(c, 401, 'INVALID_PASSWORD', 'Password verification failed')
    }

    await integrationsQueries.deleteAllIntegrationsForUser(userId)
    await profilesQueries.deleteProfile(userId)

    await softDeleteAuthUser(userId, requestId)

    try {
      await publishUserDeleted(userId)
    } catch (e) {
      console.error('[user-service] Failed to publish user.deleted:', e)
    }

    return ok(c, { message: 'Account deleted successfully' })
  },
)

export default profile
