import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import * as promptTemplatesQueries from '../db/queries/promptTemplates.queries.js'
import { ok } from '../lib/response.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireSuperAdmin } from '../middleware/requireAdmin.js'

const UpsertTemplateSchema = z.object({
  phase: z.number().int().min(1).max(6),
  agentType: z.string().min(1).max(64),
  template: z.string().min(1),
  version: z.number().int().min(1).optional(),
  notes: z.string().max(2000).optional(),
})

const routes = new Hono()
routes.use('*', requireAuth)
routes.use('*', requireSuperAdmin)

routes.post('/admin/prompt-templates', zValidator('json', UpsertTemplateSchema), async (c) => {
  const body = c.req.valid('json')
  const row = await promptTemplatesQueries.upsertTemplate({
    phase: body.phase,
    agentType: body.agentType,
    template: body.template,
    ...(body.version !== undefined ? { version: body.version } : {}),
    ...(body.notes !== undefined ? { notes: body.notes } : {}),
  })
  return ok(c, row)
})

export default routes
