import { zValidator } from '@hono/zod-validator'
import {
  InternalCanvasPutSchema,
  InternalPhaseOutputSchema,
  InternalProjectFileBatchSchema,
  InternalProjectFileBodySchema,
} from '@repo/validators'
import { Hono } from 'hono'
import { z } from 'zod'

import * as canvasQueries from '../db/queries/designCanvas.queries.js'
import type { CanvasUpsertPatch } from '../db/queries/designCanvas.queries.js'
import * as fileQueries from '../db/queries/projectFiles.queries.js'
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

routes.post(
  '/projects/:id/files',
  zValidator('json', InternalProjectFileBodySchema),
  async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')
    const file = await fileQueries.upsertFile({
      projectId: id,
      path: body.path,
      content: body.content,
      language: body.language ?? null,
      agentType: body.agentType ?? null,
      isModified: false,
    })
    void projectsQueries.updateLastActive(id)
    return ok(c, { saved: true, file: { id: file.id, path: file.path } })
  },
)

routes.get('/projects/:id/files', async (c) => {
  const id = c.req.param('id')
  const rows = await fileQueries.findFilesByProject(id)
  return ok(
    c,
    rows.map((r) => ({
      path: r.path,
      content: r.content,
      language: r.language ?? null,
    })),
  )
})

routes.get('/projects/:id/files/content', async (c) => {
  const id = c.req.param('id')
  const path = c.req.query('path')
  if (!path || path.trim().length === 0) {
    return err(c, 400, 'VALIDATION_ERROR', 'Query parameter path is required')
  }
  const row = await fileQueries.findFileByPath(id, path)
  return ok(c, { path, content: row?.content ?? '', found: Boolean(row) })
})

routes.post(
  '/projects/:id/files/batch',
  zValidator('json', InternalProjectFileBatchSchema),
  async (c) => {
    const id = c.req.param('id')
    const { files } = c.req.valid('json')
    const out: { id: string; path: string }[] = []
    for (const f of files) {
      const row = await fileQueries.upsertFile({
        projectId: id,
        path: f.path,
        content: f.content,
        language: f.language ?? null,
        agentType: f.agentType ?? null,
        isModified: false,
      })
      out.push({ id: row.id, path: row.path })
    }
    void projectsQueries.updateLastActive(id)
    return ok(c, { saved: out.length, files: out })
  },
)

routes.get('/projects/:id/canvas', async (c) => {
  const id = c.req.param('id')
  const canvas = await canvasQueries.findCanvasByProjectId(id)
  if (!canvas) {
    return err(c, 404, 'CANVAS_NOT_FOUND', 'Canvas not found')
  }
  return ok(c, {
    id: canvas.id,
    projectId: canvas.projectId,
    canvasData: canvas.canvasData,
    pages: canvas.pages,
    designTokens: canvas.designTokens,
    viewport: canvas.viewport,
    updatedAt: canvas.updatedAt instanceof Date ? canvas.updatedAt.toISOString() : canvas.updatedAt,
  })
})

routes.put('/projects/:id/canvas', zValidator('json', InternalCanvasPutSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')
  const patch: CanvasUpsertPatch = { canvasData: body.canvasData }
  if (body.pages !== undefined) patch.pages = body.pages
  if (body.designTokens !== undefined) patch.designTokens = body.designTokens
  if (body.viewport !== undefined) patch.viewport = body.viewport
  const canvas = await canvasQueries.upsertCanvas(id, patch)
  void projectsQueries.updateLastActive(id)
  return ok(c, {
    id: canvas.id,
    projectId: canvas.projectId,
    canvasData: canvas.canvasData,
    pages: canvas.pages,
    designTokens: canvas.designTokens,
    viewport: canvas.viewport,
    updatedAt: canvas.updatedAt instanceof Date ? canvas.updatedAt.toISOString() : canvas.updatedAt,
  })
})

export default routes
