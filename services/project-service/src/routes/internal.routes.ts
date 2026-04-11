import { zValidator } from '@hono/zod-validator'
import { InternalPhaseOutputSchema } from '@repo/validators'
import { Hono } from 'hono'
import { z } from 'zod'

import * as phaseOutputsQueries from '../db/queries/phaseOutputs.queries.js'
import * as projectsQueries from '../db/queries/projects.queries.js'
import { err, ok } from '../lib/response.js'
import { buildProjectContext } from '../services/contextBuilder.service.js'

const contextQuerySchema = z.object({
  userId: z.string().uuid(),
})

const routes = new Hono()

routes.get('/projects/:id/context', async (c) => {
  const parsed = contextQuerySchema.safeParse({ userId: c.req.query('userId') })
  if (!parsed.success) {
    return err(c, 400, 'VALIDATION_ERROR', 'Query parameter userId (uuid) is required')
  }
  try {
    const ctx = await buildProjectContext(c.req.param('id'), parsed.data.userId)
    return ok(c, ctx)
  } catch (e) {
    const x = e as { status?: number; code?: string; message?: string }
    if (x.status === 404) {
      return err(c, 404, x.code ?? 'PROJECT_NOT_FOUND', x.message ?? 'Project not found')
    }
    throw e
  }
})

routes.post(
  '/projects/:id/phases/:phase/output',
  zValidator('json', InternalPhaseOutputSchema),
  async (c) => {
    const id = c.req.param('id')
    const phase = Number.parseInt(c.req.param('phase'), 10)
    if (!Number.isInteger(phase) || phase < 1 || phase > 6) {
      return err(c, 400, 'INVALID_PHASE', 'Phase must be between 1 and 6')
    }
    const body = c.req.valid('json')
    const saved = await phaseOutputsQueries.savePhaseOutput(
      id,
      phase,
      body.outputData,
      false,
    )
    void projectsQueries.updateLastActive(id)
    return ok(c, { saved: true, version: saved.version })
  },
)

routes.get('/projects/:id', async (c) => {
  const project = await projectsQueries.findProjectById(c.req.param('id'))
  if (!project) {
    return err(c, 404, 'PROJECT_NOT_FOUND', 'Project not found')
  }
  return ok(c, { project })
})

export default routes
