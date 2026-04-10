import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import * as profilesQueries from '../db/queries/profiles.queries.js'
import { err, ok } from '../lib/response.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { getAuthUser } from '../services/authClient.service.js'
import { mergeUserProfile } from './profile.routes.js'

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  roleType: z.enum(['FOUNDER', 'DESIGNER', 'DEVELOPER', 'OTHER']).optional(),
  sort: z.enum(['createdAt', 'companyName']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

const admin = new Hono()

admin.use('*', requireAuth)
admin.use('*', requireAdmin)

admin.get(
  '/',
  zValidator('query', ListQuerySchema, (r) => {
    if (!r.success) throw r.error
  }),
  async (c) => {
    const q = c.req.valid('query')
    const page = q.page ?? 1
    const limit = q.limit ?? 20
    const { data, total } = await profilesQueries.findAllProfiles({
      page,
      limit,
      ...(q.search !== undefined && q.search !== '' ? { search: q.search } : {}),
      ...(q.roleType !== undefined ? { roleType: q.roleType } : {}),
      ...(q.sort !== undefined ? { sort: q.sort } : {}),
      ...(q.order !== undefined ? { order: q.order } : {}),
    })

    const meta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }

    return ok(c, { users: data }, meta)
  },
)

admin.get('/:userId', async (c) => {
  const userId = c.req.param('userId')
  if (!z.string().uuid().safeParse(userId).success) {
    return err(c, 400, 'VALIDATION_ERROR', 'Invalid user id')
  }
  const requestId = c.get('requestId' as never) as string | undefined

  const [row, auth] = await Promise.all([
    profilesQueries.findProfileById(userId),
    getAuthUser(userId, requestId),
  ])

  if (!row || !auth) {
    return err(c, 404, 'USER_NOT_FOUND', 'User not found')
  }

  return ok(c, mergeUserProfile(auth, row))
})

export default admin
