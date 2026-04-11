import { zValidator } from '@hono/zod-validator'
import { CanvasUpsertBodySchema } from '@repo/validators'
import { Hono } from 'hono'

import * as canvasQueries from '../db/queries/designCanvas.queries.js'
import type { CanvasUpsertPatch } from '../db/queries/designCanvas.queries.js'
import * as projectsQueries from '../db/queries/projects.queries.js'
import { err, ok } from '../lib/response.js'
import { requireAuth } from '../middleware/requireAuth.js'

const routes = new Hono()

routes.use('*', requireAuth)

function canvasPayload(row: Awaited<ReturnType<typeof canvasQueries.findCanvasByProjectId>>) {
  if (!row) return null
  return {
    id: row.id,
    projectId: row.projectId,
    canvasData: row.canvasData,
    pages: row.pages,
    designTokens: row.designTokens,
    viewport: row.viewport,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  }
}

routes.get('/:id/canvas', async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const project = await projectsQueries.findProjectByIdAndUserId(id, userId)
  if (!project) {
    return err(c, 404, 'PROJECT_NOT_FOUND', 'Project not found')
  }
  let canvas = await canvasQueries.findCanvasByProjectId(id)
  if (!canvas) {
    if (project.currentPhase < 3) {
      return err(
        c,
        404,
        'CANVAS_NOT_AVAILABLE',
        'Canvas is available from Phase 3 onward',
      )
    }
    canvas = await canvasQueries.createCanvas(id)
  }
  return ok(c, canvasPayload(canvas))
})

routes.put('/:id/canvas', zValidator('json', CanvasUpsertBodySchema), async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const body = c.req.valid('json')
  const rawSize = JSON.stringify(body).length
  if (rawSize >= 5_000_000) {
    return err(c, 413, 'CANVAS_TOO_LARGE', 'Canvas payload exceeds 5MB limit')
  }
  const project = await projectsQueries.findProjectByIdAndUserId(id, userId)
  if (!project) {
    return err(c, 404, 'PROJECT_NOT_FOUND', 'Project not found')
  }
  if (project.currentPhase < 3) {
    return err(c, 403, 'CANVAS_NOT_AVAILABLE', 'Cannot update canvas before Phase 3')
  }
  const patch: CanvasUpsertPatch = {}
  if (body.canvasData !== undefined) patch.canvasData = body.canvasData
  if (body.pages !== undefined) patch.pages = body.pages
  if (body.designTokens !== undefined) patch.designTokens = body.designTokens
  if (body.viewport !== undefined) patch.viewport = body.viewport
  const canvas = await canvasQueries.upsertCanvas(id, patch)
  void projectsQueries.updateLastActive(id)
  return ok(c, canvasPayload(canvas))
})

export default routes
