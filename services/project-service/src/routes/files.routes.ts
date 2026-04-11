import { zValidator } from '@hono/zod-validator'
import { FileContentPutSchema } from '@repo/validators'
import { Hono } from 'hono'

import * as fileQueries from '../db/queries/projectFiles.queries.js'
import * as projectsQueries from '../db/queries/projects.queries.js'
import { err, ok } from '../lib/response.js'
import { requireAuth } from '../middleware/requireAuth.js'

const routes = new Hono()

routes.use('*', requireAuth)

function fileNotAvailable(c: Parameters<typeof err>[0]) {
  return err(
    c,
    403,
    'FILES_NOT_AVAILABLE',
    'Files are available from Phase 3 onward',
  )
}

function serializeFile(row: NonNullable<Awaited<ReturnType<typeof fileQueries.findFileById>>>) {
  return {
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  }
}

routes.get('/:id/files', async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const agentType = c.req.query('agentType') ?? undefined
  const project = await projectsQueries.findProjectByIdAndUserId(id, userId)
  if (!project) {
    return err(c, 404, 'PROJECT_NOT_FOUND', 'Project not found')
  }
  if (project.currentPhase < 3) {
    return fileNotAvailable(c)
  }
  const files = await fileQueries.findFilesByProject(id, agentType)
  const tree = fileQueries.buildFileTree(files)
  return ok(c, {
    files: files.map(serializeFile),
    tree,
    totalFiles: files.length,
  })
})

routes.get('/:id/files/:fileId', async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const fileId = c.req.param('fileId')
  const project = await projectsQueries.findProjectByIdAndUserId(id, userId)
  if (!project) {
    return err(c, 404, 'PROJECT_NOT_FOUND', 'Project not found')
  }
  if (project.currentPhase < 3) {
    return fileNotAvailable(c)
  }
  const file = await fileQueries.findFileById(fileId, id)
  if (!file) {
    return err(c, 404, 'FILE_NOT_FOUND', 'File not found')
  }
  return ok(c, serializeFile(file))
})

routes.put('/:id/files/:fileId', zValidator('json', FileContentPutSchema), async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const fileId = c.req.param('fileId')
  const body = c.req.valid('json')
  const project = await projectsQueries.findProjectByIdAndUserId(id, userId)
  if (!project) {
    return err(c, 404, 'PROJECT_NOT_FOUND', 'Project not found')
  }
  if (project.currentPhase < 3) {
    return fileNotAvailable(c)
  }
  const existing = await fileQueries.findFileById(fileId, id)
  if (!existing) {
    return err(c, 404, 'FILE_NOT_FOUND', 'File not found')
  }
  if (body.content.length >= 500_000) {
    return err(c, 413, 'FILE_TOO_LARGE', 'File content exceeds 500KB limit')
  }
  const updated = await fileQueries.updateFile(fileId, id, { content: body.content })
  if (!updated) {
    return err(c, 404, 'FILE_NOT_FOUND', 'File not found')
  }
  void projectsQueries.updateLastActive(id)
  return ok(c, serializeFile(updated))
})

routes.delete('/:id/files/:fileId', async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const fileId = c.req.param('fileId')
  const project = await projectsQueries.findProjectByIdAndUserId(id, userId)
  if (!project) {
    return err(c, 404, 'PROJECT_NOT_FOUND', 'Project not found')
  }
  if (project.currentPhase < 3) {
    return fileNotAvailable(c)
  }
  const deleted = await fileQueries.deleteFile(fileId, id)
  if (!deleted) {
    return err(c, 404, 'FILE_NOT_FOUND', 'File not found')
  }
  void projectsQueries.updateLastActive(id)
  return ok(c, { message: 'File deleted', fileId })
})

export default routes
