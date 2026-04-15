import { BaseAgent } from '../base.agent.js'
import {
  buildModeConstraint,
  formatUserPreferencesLine,
  readBuildMode,
  readUserPreferences,
} from '../prompt.helpers.js'
import * as generationPlansQueries from '../../db/queries/generationPlans.queries.js'
import type { FileSpec } from '../../types/phase4.types.js'

import type { AgentType, ProjectContext } from '@repo/types'

type ContextWithProject = ProjectContext & {
  project?: { name?: string; buildMode?: string; userPreferences?: Record<string, unknown> | null }
}

function phase2Root(context: ProjectContext): Record<string, unknown> {
  const p = context.phase2Output as unknown
  return p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : {}
}

function systemDesignBlock(p2: Record<string, unknown>): Record<string, unknown> {
  const sd = p2['systemDesign']
  if (sd && typeof sd === 'object' && !Array.isArray(sd)) return sd as Record<string, unknown>
  return p2
}

function prdBlock(p2: Record<string, unknown>): Record<string, unknown> {
  const prd = p2['prd']
  if (prd && typeof prd === 'object' && !Array.isArray(prd)) return prd as Record<string, unknown>
  return p2
}

function mustFeatures(p2: Record<string, unknown>): Array<Record<string, unknown>> {
  const prd = prdBlock(p2)
  const features = prd['features']
  if (!Array.isArray(features)) return []
  return features.filter(
    (f) =>
      f &&
      typeof f === 'object' &&
      !Array.isArray(f) &&
      String((f as Record<string, unknown>)['priority']).toLowerCase() === 'must',
  ) as Array<Record<string, unknown>>
}

function apiEndpoints(sd: Record<string, unknown>): Array<Record<string, unknown>> {
  const ep = sd['apiEndpoints']
  return Array.isArray(ep) ? (ep as Array<Record<string, unknown>>) : []
}

function phase3Screens(context: ProjectContext): Array<{
  screenName: string
  route: string
}> {
  const p3 = context.phase3Output as unknown
  if (!p3 || typeof p3 !== 'object' || Array.isArray(p3)) return []
  const raw = (p3 as Record<string, unknown>)['screens']
  if (!Array.isArray(raw)) return []
  const out: Array<{ screenName: string; route: string }> = []
  for (const s of raw) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) continue
    const o = s as Record<string, unknown>
    const screenName =
      typeof o['screenName'] === 'string'
        ? o['screenName']
        : typeof o['name'] === 'string'
          ? o['name']
          : ''
    const route = typeof o['route'] === 'string' ? o['route'] : ''
    if (screenName) out.push({ screenName, route })
  }
  return out
}

function normalizeFileItem(raw: unknown): FileSpec | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const path = typeof o['path'] === 'string' ? o['path'].trim() : ''
  if (!path) return null
  let batchNumber = typeof o['batchNumber'] === 'number' ? o['batchNumber'] : 1
  if (!Number.isFinite(batchNumber) || batchNumber < 1) batchNumber = 1
  let complexity: FileSpec['complexity'] = 'medium'
  const c = o['complexity']
  if (c === 'simple' || c === 'medium' || c === 'complex') complexity = c
  const estimatedLines = typeof o['estimatedLines'] === 'number' ? o['estimatedLines'] : 40
  const deps = Array.isArray(o['dependencies'])
    ? (o['dependencies'] as unknown[]).filter((d): d is string => typeof d === 'string')
    : []
  const description =
    typeof o['description'] === 'string' && o['description'].trim().length > 0
      ? o['description']
      : `Generated file ${path}`
  const layer = typeof o['layer'] === 'string' && o['layer'].trim().length > 0 ? o['layer'] : 'misc'
  return {
    path,
    description,
    layer,
    batchNumber,
    complexity,
    estimatedLines,
    dependencies: deps,
  }
}

export class SkeletonAgent extends BaseAgent {
  readonly agentType: AgentType = 'skeleton'
  readonly phase = 4

  getAgentTask(): string {
    return 'Plan complete file structure and batch assignments for this project codebase'
  }

  buildSystemPrompt(context: ProjectContext, documentContent: string): string {
    void documentContent
    const p2 = phase2Root(context)
    const sd = systemDesignBlock(p2)
    const frontendStack =
      typeof sd['frontendStack'] === 'string' && sd['frontendStack'].trim()
        ? (sd['frontendStack'] as string)
        : 'Next.js 15'
    const backendStack =
      typeof sd['backendStack'] === 'string' && sd['backendStack'].trim()
        ? (sd['backendStack'] as string)
        : 'Node.js + Hono'
    const dbChoice =
      typeof sd['dbChoice'] === 'string' && sd['dbChoice'].trim()
        ? (sd['dbChoice'] as string)
        : 'PostgreSQL'
    const authStrategy =
      typeof sd['authStrategy'] === 'string' && sd['authStrategy'].trim()
        ? (sd['authStrategy'] as string)
        : typeof p2['authPlan'] === 'string' && String(p2['authPlan']).trim()
          ? String(p2['authPlan'])
          : 'JWT'
    const deployment = sd['deploymentPlan'] ?? p2['deploymentPlan']
    const architecture =
      typeof sd['architecture'] === 'string' && sd['architecture'].trim()
        ? (sd['architecture'] as string)
        : 'single-repo'
    const endpoints = apiEndpoints(sd)
    const mustHave = mustFeatures(p2)
    const screens = phase3Screens(context)
    const prefs = readUserPreferences(context)
    const scale = prefs['scale'] === 'production' ? 'production' : 'mvp'
    const cx = context as ContextWithProject
    const buildMode =
      cx.project?.buildMode === 'autopilot' ||
      cx.project?.buildMode === 'copilot' ||
      cx.project?.buildMode === 'manual'
        ? cx.project.buildMode
        : readBuildMode(context)
    const mode = readBuildMode(context)
    const prefsLine = formatUserPreferencesLine(prefs)

    return `[ROLE]
You are a Staff Engineer planning a production codebase.
You organize code by domain and layer. You write file plans
that developers can implement without ambiguity. You know
that missing files cause integration failures.

[CONTEXT]
Project: ${cx.project?.name ?? context.projectName}
Architecture: ${architecture}
Frontend: ${frontendStack}
Backend: ${backendStack}
Database: ${dbChoice}
Auth: ${authStrategy}
Scale: ${scale}
Build mode: ${buildMode}

User preferences: ${prefsLine}
Build constraint: ${buildModeConstraint(mode)}

Must-have features (EVERY feature needs code coverage):
${mustHave.map((f) => `- ${String(f['name'] ?? '')}: ${String(f['description'] ?? '')}`).join('\n')}

API endpoints to implement:
${endpoints
  .map(
    (e) =>
      `${String(e['method'] ?? 'GET')} ${String(e['path'] ?? '/')} — ${String(e['description'] ?? '')}`,
  )
  .join('\n')}

Phase 3 screens (frontend needs page per screen):
${screens.map((s) => `- ${s.screenName} → route: ${s.route}`).join('\n')}

Deployment targets:
${JSON.stringify(deployment ?? {})}

[TASK]
Plan the complete file structure for this project.
Assign every file to a batch for generation.
Return a JSON array of file objects.

[CONSTRAINTS]
- Return ONLY a valid JSON array. No explanation. No preamble.
- EVERY must-have feature must have at least:
  1 route file AND 1 service file covering it.
- EVERY Phase 3 screen must have a frontend page file.
- Entry point (index.ts or server.ts) must exist in last backend batch.
- Auth strategy requires: middleware + jwt/auth utility file.
- layer field: 'db'|'config'|'middleware'|'service'|'controller'|
                'route'|'frontend-page'|'frontend-component'|
                'frontend-hook'|'frontend-config'|'test'|'ci'|'misc'
- complexity: 'simple'|'medium'|'complex'
  complex = files >100 lines (schema, services, controllers, entry)
  medium = files 30-100 lines (routes, middleware, hooks, pages)
  simple = files <30 lines (config, types, utilities, env example)
- batchNumber: integer starting at 1.
  Batch 1: DB layer (schema, migrations, client, types)
  Batch 2: Config + shared utilities (env, logger, errors, lib/)
  Batch 3+: Backend domain batches (one per domain/service)
            Auth domain: auth middleware + jwt lib + auth routes + auth service
            Feature domain: feature routes + feature service
  After backend: frontend batches (shell → auth pages → core pages → hooks)
  Second-to-last: CI/CD files
  LAST batch always: 'integration' (patcher — no files listed, just marker)
- dependencies: list paths of files this file imports from
  Only list files that will be in THIS project (no npm packages)
- estimatedLines: your best estimate as integer
- JSON schema per file:
  { path, description, layer, batchNumber, complexity,
    estimatedLines, dependencies: string[] }`
  }

  parseOutput(rawText: string): { data: Record<string, unknown>; success: boolean } {
    const trimmed = rawText.trim()
    let arr: unknown[] | null = null
    try {
      const j = JSON.parse(trimmed) as unknown
      if (Array.isArray(j)) arr = j
    } catch {
      arr = null
    }
    if (arr) {
      const files = arr.map(normalizeFileItem).filter((x): x is FileSpec => x !== null)
      return { data: { files }, success: files.length > 0 }
    }
    const parsed = this.safeJsonParse(rawText)
    if (parsed.success && parsed.data) {
      const inner = parsed.data['files']
      if (Array.isArray(inner)) {
        const files = inner.map(normalizeFileItem).filter((x): x is FileSpec => x !== null)
        return { data: { files }, success: files.length > 0 }
      }
    }
    return { data: { files: [] }, success: false }
  }

  async savePlan(projectId: string, files: FileSpec[], context: ProjectContext): Promise<void> {
    const total = files.length
    const tier: 'small' | 'standard' | 'large' | 'enterprise' =
      total <= 25 ? 'small' : total <= 75 ? 'standard' : total <= 150 ? 'large' : 'enterprise'
    const batchNums = files.map((f) => f.batchNumber).filter((n) => Number.isFinite(n) && n > 0)
    const totalBatches = batchNums.length > 0 ? Math.max(...batchNums) : 1
    const p2 = phase2Root(context)
    const sd = systemDesignBlock(p2)
    const archRaw = sd['architecture'] ?? p2['architecture']
    const architecture =
      archRaw === 'monorepo' || archRaw === 'microservices' || archRaw === 'single-repo'
        ? archRaw
        : 'single-repo'
    await generationPlansQueries.deletePlansByProjectId(projectId)
    await generationPlansQueries.createGenerationPlan({
      projectId,
      planData: { files },
      tier,
      totalFiles: total,
      totalBatches,
      architecture,
      status: 'pending',
    })
  }
}
