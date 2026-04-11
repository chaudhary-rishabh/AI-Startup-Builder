import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import * as usersQueries from '../db/queries/users.queries.js'
import { err, ok } from '../lib/response.js'
import { comparePassword } from '../services/password.service.js'

const VerifyPasswordBodySchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(1),
})

const PatchInternalUserBodySchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
})

const UpdateAvatarBodySchema = z.object({
  avatarUrl: z.union([z.string().url(), z.null()]),
})

const internal = new Hono()

internal.get('/users/:userId', async (c) => {
  const userId = c.req.param('userId')
  const user = await usersQueries.findUserById(userId)
  if (!user) {
    return err(c, 404, 'NOT_FOUND', 'User not found')
  }
  return ok(c, {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    planTier: user.planTier,
    status: user.status,
    onboardingCompleted: user.onboardingCompleted,
    createdAt: user.createdAt.toISOString(),
    avatarUrl: user.avatarUrl ?? null,
  })
})

internal.patch(
  '/users/:userId',
  zValidator('json', PatchInternalUserBodySchema, (r) => {
    if (!r.success) throw r.error
  }),
  async (c) => {
    const userId = c.req.param('userId')
    const body = c.req.valid('json')
    const user = await usersQueries.findUserById(userId)
    if (!user) {
      return err(c, 404, 'NOT_FOUND', 'User not found')
    }
    if (body.fullName !== undefined) {
      await usersQueries.updateUser(userId, { fullName: body.fullName })
    }
    return ok(c, { updated: true })
  },
)

internal.post(
  '/verify-password',
  zValidator('json', VerifyPasswordBodySchema, (r) => {
    if (!r.success) throw r.error
  }),
  async (c) => {
    const { userId, password } = c.req.valid('json')
    const user = await usersQueries.findUserById(userId)
    if (!user || !user.passwordHash) {
      return ok(c, { valid: false })
    }
    const valid = await comparePassword(password, user.passwordHash)
    return ok(c, { valid })
  },
)

internal.post('/users/:userId/soft-delete', async (c) => {
  const userId = c.req.param('userId')
  const user = await usersQueries.findUserById(userId)
  if (!user) {
    return err(c, 404, 'NOT_FOUND', 'User not found')
  }
  await usersQueries.softDeleteUser(userId)
  return ok(c, { deleted: true })
})

internal.post('/users/:userId/complete-onboarding', async (c) => {
  const userId = c.req.param('userId')
  const user = await usersQueries.findUserById(userId)
  if (!user) {
    return err(c, 404, 'NOT_FOUND', 'User not found')
  }
  await usersQueries.updateUser(userId, { onboardingCompleted: true })
  return ok(c, { updated: true })
})

internal.post(
  '/users/:userId/update-avatar',
  zValidator('json', UpdateAvatarBodySchema, (r) => {
    if (!r.success) throw r.error
  }),
  async (c) => {
    const userId = c.req.param('userId')
    const { avatarUrl } = c.req.valid('json')
    const user = await usersQueries.findUserById(userId)
    if (!user) {
      return err(c, 404, 'NOT_FOUND', 'User not found')
    }
    await usersQueries.updateUser(userId, { avatarUrl })
    return ok(c, { updated: true })
  },
)

export default internal
