import { zValidator } from '@hono/zod-validator'
import { AdvancePhaseSchema, SavePhaseDataSchema } from '@repo/validators'
import { Hono } from 'hono'

import * as phaseOutputsQueries from '../db/queries/phaseOutputs.queries.js'
import * as projectsQueries from '../db/queries/projects.queries.js'
import { err, ok } from '../lib/response.js'
import { requireAuth } from '../middleware/requireAuth.js'
import {
  advancePhase,
  type PhaseAdvanceHttpError,
} from '../services/phaseStateMachine.service.js'

const phaseNames: Record<number, string> = {
  1: 'Validate',
  2: 'Plan',
  3: 'Design',
  4: 'Build',
  5: 'Deploy',
  6: 'Growth',
}

const routes = new Hono()

routes.use('*', requireAuth)

routes.post('/:id/advance-phase', zValidator('json', AdvancePhaseSchema), async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const { targetPhase } = c.req.valid('json')
  try {
    const project = await advancePhase(id, userId, targetPhase)
    return ok(c, {
      projectId: id,
      previousPhase: targetPhase - 1,
      currentPhase: project.currentPhase,
      mode: project.mode,
      phaseName: phaseNames[project.currentPhase] ?? 'Unknown',
      advancedAt: new Date().toISOString(),
    })
  } catch (e) {
    const x = e as PhaseAdvanceHttpError
    if (typeof x.status === 'number' && typeof x.code === 'string') {
      return err(
        c,
        x.status,
        x.code,
        x.message,
        x.missingFields?.map((field) => ({
          field,
          message: 'Requirement not satisfied',
        })),
      )
    }
    throw e
  }
})

routes.get('/:id/phases/:phase', async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const phaseParam = c.req.param('phase')
  const phase = Number.parseInt(phaseParam, 10)
  if (!Number.isInteger(phase) || phase < 1 || phase > 6) {
    return err(c, 400, 'INVALID_PHASE', 'Phase must be between 1 and 6')
  }

  const project = await projectsQueries.findProjectByIdAndUserId(id, userId)
  if (!project) {
    return err(c, 404, 'PROJECT_NOT_FOUND', 'Project not found')
  }
  if (phase > project.currentPhase) {
    return err(c, 403, 'PHASE_NOT_REACHED', 'Phase not yet available for this project')
  }

  const output = await phaseOutputsQueries.findCurrentPhaseOutput(id, phase)
  if (!output) {
    return ok(c, {
      projectId: id,
      phase,
      data: null,
      isComplete: false,
    })
  }

  return ok(c, {
    projectId: id,
    phase,
    isComplete: output.isComplete,
    version: output.version,
    data: output.outputData,
    savedAt: output.updatedAt.toISOString(),
  })
})

routes.put('/:id/phases/:phase', zValidator('json', SavePhaseDataSchema), async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const phaseParam = c.req.param('phase')
  const phase = Number.parseInt(phaseParam, 10)
  if (!Number.isInteger(phase) || phase < 1 || phase > 6) {
    return err(c, 400, 'INVALID_PHASE', 'Phase must be between 1 and 6')
  }

  const project = await projectsQueries.findProjectByIdAndUserId(id, userId)
  if (!project) {
    return err(c, 404, 'PROJECT_NOT_FOUND', 'Project not found')
  }
  if (phase !== project.currentPhase) {
    return err(
      c,
      403,
      'PHASE_WRITE_FORBIDDEN',
      `Can only write to current phase (${project.currentPhase}). Cannot write to past or future phases.`,
    )
  }

  const body = c.req.valid('json')
  const markComplete = body.isComplete === true

  const savedOutput = await phaseOutputsQueries.savePhaseOutput(
    id,
    phase,
    body.data as Record<string, unknown>,
    markComplete,
  )
  if (markComplete) {
    await phaseOutputsQueries.markPhaseComplete(id, phase)
  }
  void projectsQueries.updateLastActive(id)

  return ok(c, {
    projectId: id,
    phase,
    version: savedOutput.version,
    isComplete: savedOutput.isComplete,
    savedAt: savedOutput.updatedAt.toISOString(),
  })
})

export default routes
