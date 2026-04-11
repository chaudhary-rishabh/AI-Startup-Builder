import { zValidator } from '@hono/zod-validator'
import { buildPaginationMeta } from '@repo/db'
import {
  AdminProjectsQuerySchema,
  CreateProjectSchema,
  DuplicateProjectBodySchema,
  ListProjectsQuerySchema,
  ProjectSearchQuerySchema,
  UpdateProjectSchema,
} from '@repo/validators'
import { Hono } from 'hono'

import { env } from '../config/env.js'
import * as phaseOutputsQueries from '../db/queries/phaseOutputs.queries.js'
import * as projectsQueries from '../db/queries/projects.queries.js'
import {
  publishProjectCreated,
  publishProjectDeleted,
} from '../events/publisher.js'
import { created, err, ok } from '../lib/response.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { requireAuth } from '../middleware/requireAuth.js'

const routes = new Hono()

routes.use('*', requireAuth)

function maxProjectsForPlan(plan: string): number {
  if (plan === 'enterprise') return -1
  if (plan === 'pro') return env.PRO_PLAN_PROJECT_LIMIT
  return env.FREE_PLAN_PROJECT_LIMIT
}

routes.get('/search', async (c) => {
  const userId = c.get('userId' as never) as string
  const parsed = ProjectSearchQuerySchema.safeParse({ q: c.req.query('q') ?? '' })
  if (!parsed.success) {
    return err(
      c,
      400,
      'INVALID_QUERY',
      parsed.error.issues[0]?.message ?? 'Invalid search query',
    )
  }
  const results = await projectsQueries.searchProjectsByUserId(userId, parsed.data.q)
  return ok(c, { results, total: results.length })
})

routes.get('/admin', requireAdmin, zValidator('query', AdminProjectsQuerySchema), async (c) => {
  const q = c.req.valid('query')
  const adminOpts: Parameters<typeof projectsQueries.findAllProjects>[0] = {
    page: q.page,
    limit: q.limit,
  }
  if (q.userId !== undefined) adminOpts.userId = q.userId
  if (q.status !== undefined) adminOpts.status = q.status
  if (q.phase !== undefined) adminOpts.phase = q.phase
  const { data, total } = await projectsQueries.findAllProjects(adminOpts)
  const meta = buildPaginationMeta(total, q.page, q.limit)
  return ok(c, { projects: data }, meta)
})

routes.get('/', zValidator('query', ListProjectsQuerySchema), async (c) => {
  const userId = c.get('userId' as never) as string
  const q = c.req.valid('query')
  const listOpts: Parameters<typeof projectsQueries.findProjectsByUserId>[1] = {
    page: q.page,
    limit: q.limit,
    sort: q.sort,
    order: q.order,
  }
  if (q.status !== undefined) listOpts.status = q.status
  if (q.isStarred !== undefined) listOpts.isStarred = q.isStarred
  if (q.phase !== undefined) listOpts.phase = q.phase
  const { data, total } = await projectsQueries.findProjectsByUserId(userId, listOpts)
  const meta = buildPaginationMeta(total, q.page, q.limit)
  return ok(c, { projects: data }, meta)
})

routes.post('/', zValidator('json', CreateProjectSchema), async (c) => {
  const userId = c.get('userId' as never) as string
  const plan = c.get('userPlan' as never) as string
  const body = c.req.valid('json')

  const count = await projectsQueries.countActiveProjectsByUserId(userId)
  const limit = maxProjectsForPlan(plan)
  if (limit >= 0 && count >= limit) {
    return err(c, 422, 'PROJECT_LIMIT_EXCEEDED', 'Project limit reached for your plan')
  }

  const project = await projectsQueries.createProject({
    userId,
    name: body.name,
    emoji: body.emoji ?? '🚀',
    description: body.description ?? null,
    currentPhase: 1,
    status: 'active',
    phaseProgress: projectsQueries.initialPhaseProgress(),
  })

  await publishProjectCreated(project.id, userId, project.name)
  return created(c, { project })
})

routes.post('/:id/star', async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const existing = await projectsQueries.findProjectByIdAndUserId(id, userId)
  if (!existing) {
    return err(c, 404, 'PROJECT_NOT_FOUND', 'Project not found')
  }
  const updated = await projectsQueries.toggleStar(id, userId)
  return ok(c, { projectId: id, isStarred: updated!.isStarred })
})

routes.post('/:id/archive', async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const existing = await projectsQueries.findProjectByIdAndUserId(id, userId)
  if (!existing) {
    return err(c, 404, 'PROJECT_NOT_FOUND', 'Project not found')
  }
  if (existing.status === 'archived') {
    return err(c, 422, 'ALREADY_ARCHIVED', 'Project is already archived')
  }
  if (existing.status !== 'active') {
    return err(c, 422, 'ALREADY_ARCHIVED', 'Project cannot be archived')
  }
  const updated = await projectsQueries.archiveProject(id, userId)
  if (!updated) {
    return err(c, 422, 'ALREADY_ARCHIVED', 'Project cannot be archived')
  }
  return ok(c, { message: 'Project archived', projectId: id })
})

routes.post('/:id/restore', async (c) => {
  const userId = c.get('userId' as never) as string
  const plan = c.get('userPlan' as never) as string
  const id = c.req.param('id')
  const existing = await projectsQueries.findProjectByIdAndUserId(id, userId)
  if (!existing) {
    return err(c, 404, 'PROJECT_NOT_FOUND', 'Project not found')
  }
  if (existing.status !== 'archived') {
    return err(c, 422, 'NOT_ARCHIVED', 'Project is not archived')
  }
  const count = await projectsQueries.countActiveProjectsByUserId(userId)
  const limit = maxProjectsForPlan(plan)
  if (limit >= 0 && count >= limit) {
    return err(c, 422, 'PROJECT_LIMIT_EXCEEDED', 'Project limit reached for your plan')
  }
  const updated = await projectsQueries.restoreProject(id, userId)
  if (!updated) {
    return err(c, 422, 'NOT_ARCHIVED', 'Project could not be restored')
  }
  return ok(c, { message: 'Project restored', projectId: id })
})

routes.post('/:id/duplicate', zValidator('json', DuplicateProjectBodySchema), async (c) => {
  const userId = c.get('userId' as never) as string
  const plan = c.get('userPlan' as never) as string
  const id = c.req.param('id')
  const body = c.req.valid('json')
  const existing = await projectsQueries.findProjectByIdAndUserId(id, userId)
  if (!existing) {
    return err(c, 404, 'PROJECT_NOT_FOUND', 'Project not found')
  }
  const count = await projectsQueries.countActiveProjectsByUserId(userId)
  const limit = maxProjectsForPlan(plan)
  if (limit >= 0 && count >= limit) {
    return err(c, 422, 'PROJECT_LIMIT_EXCEEDED', 'Project limit reached for your plan')
  }
  const newProject = await projectsQueries.duplicateProject(id, userId, body.name)
  await publishProjectCreated(newProject.id, userId, newProject.name)
  return created(c, { ...newProject, duplicatedFrom: id })
})

routes.get('/:id', async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const project = await projectsQueries.findProjectByIdAndUserId(id, userId)
  if (!project) {
    return err(c, 404, 'PROJECT_NOT_FOUND', 'Project not found')
  }
  const phaseOutputList = await phaseOutputsQueries.findAllPhaseOutputs(id)
  void projectsQueries.updateLastActive(id)
  return ok(c, { project, phaseOutputs: phaseOutputList })
})

routes.patch('/:id', zValidator('json', UpdateProjectSchema), async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const body = c.req.valid('json')
  const existing = await projectsQueries.findProjectByIdAndUserId(id, userId)
  if (!existing) {
    return err(c, 404, 'PROJECT_NOT_FOUND', 'Project not found')
  }
  const patch: { name?: string; emoji?: string; description?: string | null } = {}
  if (body.name !== undefined) patch.name = body.name
  if (body.emoji !== undefined) patch.emoji = body.emoji
  if (body.description !== undefined) patch.description = body.description
  const updated = await projectsQueries.updateProject(id, userId, patch)
  return ok(c, { project: updated })
})

routes.delete('/:id', async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const existing = await projectsQueries.findProjectByIdAndUserId(id, userId)
  if (!existing) {
    return err(c, 404, 'PROJECT_NOT_FOUND', 'Project not found')
  }
  const result = await projectsQueries.softDeleteProject(id, userId)
  if (!result.deleted || !result.deletedAt) {
    return err(c, 500, 'DELETE_FAILED', 'Could not delete project')
  }
  await publishProjectDeleted(id, userId)
  return ok(c, { message: 'Project deleted', deletedAt: result.deletedAt })
})

export default routes
