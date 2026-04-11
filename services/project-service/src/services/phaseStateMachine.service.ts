import * as phaseOutputsQueries from '../db/queries/phaseOutputs.queries.js'
import * as projectsQueries from '../db/queries/projects.queries.js'
import { publishProjectPhaseAdvanced } from '../events/publisher.js'

import type { Project } from '../db/schema.js'

export type PhaseAdvanceHttpError = Error & {
  status: number
  code: string
  missingFields?: string[]
}

function fail(status: number, code: string, message: string, missingFields?: string[]): never {
  const e = new Error(message) as PhaseAdvanceHttpError
  e.status = status
  e.code = code
  if (missingFields !== undefined) e.missingFields = missingFields
  throw e
}

function isNonEmptyString(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0
}

function nonEmptyArray(v: unknown): boolean {
  return Array.isArray(v) && v.length >= 1
}

export async function validatePhaseCompletion(
  projectId: string,
  phase: number,
): Promise<{ valid: boolean; missingFields: string[] }> {
  const output = await phaseOutputsQueries.findCurrentPhaseOutput(projectId, phase)
  if (!output) return { valid: false, missingFields: ['phase_output'] }
  if (!output.isComplete) return { valid: false, missingFields: ['phase_not_marked_complete'] }

  const data = output.outputData as Record<string, unknown>
  const missing: string[] = []

  switch (phase) {
    case 1: {
      if (!isNonEmptyString(data['problem'])) missing.push('problem')
      if (!isNonEmptyString(data['solution'])) missing.push('solution')
      if (!isNonEmptyString(data['icp'])) missing.push('icp')
      const ds = data['demandScore']
      if (
        ds === undefined ||
        ds === null ||
        (typeof ds === 'number' && Number.isNaN(ds)) ||
        (typeof ds === 'string' && ds.trim().length === 0)
      ) {
        missing.push('demandScore')
      } else if (typeof ds !== 'number' && typeof ds !== 'string') {
        missing.push('demandScore')
      }
      if (
        data['verdict'] !== 'yes' &&
        data['verdict'] !== 'no' &&
        data['verdict'] !== 'pivot'
      ) {
        missing.push('verdict')
      }
      break
    }
    case 2: {
      if (!nonEmptyArray(data['features'])) missing.push('features')
      if (!nonEmptyArray(data['userStories'])) missing.push('userStories')
      if (!isNonEmptyString(data['frontendStack'])) missing.push('frontendStack')
      if (!isNonEmptyString(data['backendStack'])) missing.push('backendStack')
      if (!isNonEmptyString(data['dbChoice'])) missing.push('dbChoice')
      break
    }
    case 3: {
      const cd = data['canvasData']
      const wf = data['wireframes']
      const cdOk = Array.isArray(cd) && cd.length >= 1
      const wfOk = Array.isArray(wf) && wf.length >= 1
      if (!cdOk && !wfOk) missing.push('canvasData_or_wireframes')
      break
    }
    case 4: {
      if (!nonEmptyArray(data['files'])) missing.push('files')
      break
    }
    case 5: {
      const tr = data['testResults']
      const cy = data['cicdYaml']
      const tf = data['testFiles']
      const hasMeaningfulTestResults = (() => {
        if (tr === undefined || tr === null) return false
        if (typeof tr === 'string') return tr.trim().length > 0
        if (typeof tr === 'number' || typeof tr === 'boolean') return true
        if (Array.isArray(tr)) return tr.length >= 1
        if (typeof tr === 'object') return Object.keys(tr as object).length >= 1
        return false
      })()
      const hasCicd = typeof cy === 'string' && cy.trim().length > 0
      const hasTestFiles = nonEmptyArray(tf)
      if (!hasMeaningfulTestResults && !hasCicd && !hasTestFiles) {
        missing.push('testResults_or_cicdYaml')
      }
      break
    }
    case 6:
      break
    default:
      missing.push('unknown_phase')
  }

  return { valid: missing.length === 0, missingFields: missing }
}

export async function advancePhase(
  projectId: string,
  userId: string,
  targetPhase: number,
): Promise<Project> {
  const project = await projectsQueries.findProjectByIdAndUserId(projectId, userId)
  if (!project) fail(404, 'PROJECT_NOT_FOUND', 'Project not found')

  if (project.status !== 'active') {
    fail(422, 'PROJECT_NOT_ACTIVE', 'Project must be active to advance phase')
  }
  if (project.currentPhase === 6) {
    fail(422, 'ALREADY_AT_FINAL_PHASE', 'Already at final phase')
  }
  if (targetPhase !== project.currentPhase + 1) {
    fail(
      422,
      'INVALID_PHASE_TRANSITION',
      `Cannot skip phases. Must advance from phase ${project.currentPhase} to phase ${project.currentPhase + 1}.`,
    )
  }

  const validation = await validatePhaseCompletion(projectId, project.currentPhase)
  if (!validation.valid) {
    fail(422, 'PHASE_INCOMPLETE', 'Current phase requirements are not met', validation.missingFields)
  }

  const fromPhase = project.currentPhase
  const newMode =
    targetPhase === 3 ? 'design' : targetPhase === 4 ? 'dev' : project.mode

  const prevProgress = { ...(project.phaseProgress as Record<string, string>) }
  prevProgress[String(fromPhase)] = 'complete'
  prevProgress[String(targetPhase)] = 'active'
  for (let p = targetPhase + 1; p <= 6; p++) {
    prevProgress[String(p)] = 'locked'
  }

  const updated = await projectsQueries.updateProject(projectId, userId, {
    currentPhase: targetPhase,
    mode: newMode,
    phaseProgress: prevProgress,
    lastActiveAt: new Date(),
  })
  if (!updated) fail(404, 'PROJECT_NOT_FOUND', 'Project not found')

  await publishProjectPhaseAdvanced(projectId, userId, fromPhase, targetPhase)
  return updated
}
