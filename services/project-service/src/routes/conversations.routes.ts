import { zValidator } from '@hono/zod-validator'
import { AppendConversationSchema, ConversationListQuerySchema } from '@repo/validators'
import { Hono } from 'hono'

import * as conversationsQueries from '../db/queries/conversations.queries.js'
import * as projectsQueries from '../db/queries/projects.queries.js'
import { created, err, ok } from '../lib/response.js'
import { requireAuth } from '../middleware/requireAuth.js'

const routes = new Hono()

routes.use('*', requireAuth)

routes.get('/:id/conversations', async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const phaseRaw = c.req.query('phase')
  if (phaseRaw === undefined || phaseRaw === '') {
    return err(c, 400, 'INVALID_QUERY', 'Query parameter phase is required')
  }

  const parsed = ConversationListQuerySchema.safeParse({
    phase: phaseRaw,
    cursor: c.req.query('cursor'),
    limit: c.req.query('limit'),
  })
  if (!parsed.success) {
    return err(
      c,
      400,
      'INVALID_QUERY',
      parsed.error.issues[0]?.message ?? 'Invalid query parameters',
    )
  }
  const q = parsed.data

  const project = await projectsQueries.findProjectByIdAndUserId(id, userId)
  if (!project) {
    return err(c, 404, 'PROJECT_NOT_FOUND', 'Project not found')
  }

  const msgOpts =
    q.cursor !== undefined ? { cursor: q.cursor, limit: q.limit } : { limit: q.limit }
  const { data, nextCursor } = await conversationsQueries.findConversationMessages(
    id,
    q.phase,
    msgOpts,
  )
  return ok(c, { messages: data, nextCursor })
})

routes.post('/:id/conversations', zValidator('json', AppendConversationSchema), async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const body = c.req.valid('json')

  const project = await projectsQueries.findProjectByIdAndUserId(id, userId)
  if (!project) {
    return err(c, 404, 'PROJECT_NOT_FOUND', 'Project not found')
  }

  if (body.phase < 1 || body.phase > 6) {
    return err(c, 400, 'INVALID_PHASE', 'Phase must be between 1 and 6')
  }
  if (body.phase > project.currentPhase) {
    return err(c, 400, 'INVALID_PHASE', 'Cannot append messages for a future phase')
  }

  const message = await conversationsQueries.appendMessage({
    projectId: id,
    phase: body.phase,
    role: 'user',
    content: body.content,
    metadata: {},
  })
  return created(c, { message })
})

export default routes
