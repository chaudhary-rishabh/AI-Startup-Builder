import type {
  Phase1Output,
  Phase2Output,
  Phase3Output,
  Phase4Output,
  Phase5Output,
  ProjectContext,
} from '@repo/types'

import * as phaseOutputsQueries from '../db/queries/phaseOutputs.queries.js'
import * as projectsQueries from '../db/queries/projects.queries.js'

type HttpError = Error & { status: number; code: string }

function fail(status: number, code: string, message: string): never {
  const e = new Error(message) as HttpError
  e.status = status
  e.code = code
  throw e
}

export function estimateTokenCount(obj: unknown): number {
  try {
    return JSON.stringify(obj).length / 4
  } catch {
    return 0
  }
}

const TOKEN_BUDGET = 80_000

function compressPhase1(o: Phase1Output): Partial<Phase1Output> {
  return {
    problem: o.problem,
    solution: o.solution,
    verdict: o.verdict,
    demandScore: o.demandScore,
  }
}

function compressPhase2(o: Phase2Output): Partial<Phase2Output> {
  return {
    features:
      o.features?.map((f) => ({
        name: f.name,
        priority: f.priority,
        description: f.description ?? '',
      })) ?? [],
    frontendStack: o.frontendStack,
    backendStack: o.backendStack,
    dbChoice: o.dbChoice,
  }
}

function compressPhase3(o: Phase3Output): Record<string, unknown> {
  const pages = o.pages ?? []
  const pageNames = pages.map((p) => ({ name: p.name, id: p.id }))
  return {
    pageNames,
    canvasElementCount: Array.isArray(o.canvasData) ? o.canvasData.length : 0,
  }
}

function compressPhase4(o: Phase4Output): Record<string, unknown> {
  const files = o.files ?? []
  return {
    filePaths: files.map((f) => ({ path: f.path, language: f.language })),
  }
}

function compressPhase5(o: Phase5Output): Record<string, unknown> {
  const yaml =
    typeof o.cicdYaml === 'string' && o.cicdYaml.length > 800
      ? `${o.cicdYaml.slice(0, 800)}…`
      : o.cicdYaml
  return {
    testFileCount: Array.isArray(o.testFiles) ? o.testFiles.length : 0,
    cicdYamlSummary: yaml,
    deployConfigKeys:
      o.deployConfig && typeof o.deployConfig === 'object'
        ? Object.keys(o.deployConfig)
        : [],
  }
}

function maybeCompress(ctx: ProjectContext): ProjectContext {
  const est = estimateTokenCount(ctx)
  if (est <= TOKEN_BUDGET) return ctx

  const next: ProjectContext = {
    projectId: ctx.projectId,
    projectName: ctx.projectName,
    currentPhase: ctx.currentPhase,
    wasCompressed: true,
  }
  if (ctx.ragContext !== undefined) next.ragContext = ctx.ragContext
  if (ctx.phase1Output) {
    next.phase1Output = compressPhase1(ctx.phase1Output) as unknown as Phase1Output
  }
  if (ctx.phase2Output) {
    next.phase2Output = compressPhase2(ctx.phase2Output) as unknown as Phase2Output
  }
  if (ctx.phase3Output) {
    next.phase3Output = compressPhase3(ctx.phase3Output) as unknown as Phase3Output
  }
  if (ctx.phase4Output) {
    next.phase4Output = compressPhase4(ctx.phase4Output) as unknown as Phase4Output
  }
  if (ctx.phase5Output) {
    next.phase5Output = compressPhase5(ctx.phase5Output) as unknown as Phase5Output
  }
  if (ctx.phase6Output) {
    next.phase6Output = { _compressed: true, keys: Object.keys(ctx.phase6Output) }
  }
  return next
}

export async function buildProjectContext(
  projectId: string,
  userId: string,
): Promise<ProjectContext> {
  const project = await projectsQueries.findProjectByIdAndUserId(projectId, userId)
  if (!project) fail(404, 'PROJECT_NOT_FOUND', 'Project not found')

  const outputs = await phaseOutputsQueries.findAllPhaseOutputs(projectId)

  const base: ProjectContext = {
    projectId: project.id,
    projectName: project.name,
    currentPhase: project.currentPhase,
  }

  for (const o of outputs) {
    const raw = o.outputData as Record<string, unknown>
    switch (o.phase) {
      case 1:
        base.phase1Output = raw as unknown as Phase1Output
        break
      case 2:
        base.phase2Output = raw as unknown as Phase2Output
        break
      case 3:
        base.phase3Output = raw as unknown as Phase3Output
        break
      case 4:
        base.phase4Output = raw as unknown as Phase4Output
        break
      case 5:
        base.phase5Output = raw as unknown as Phase5Output
        break
      case 6:
        base.phase6Output = raw
        break
      default:
        break
    }
  }

  return maybeCompress(base)
}
