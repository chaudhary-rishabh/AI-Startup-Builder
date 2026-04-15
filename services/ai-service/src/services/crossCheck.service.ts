import type { ProjectContext } from '@repo/types'

import { readUserPreferences } from '../agents/prompt.helpers.js'

import type { FileSpec } from '../types/phase4.types.js'
import type { ProjectSizeEstimate } from './estimateProjectSize.service.js'

export interface CrossCheckResult {
  checkId: string
  passed: boolean
  issues: string[]
  autoFixed: boolean
  fixedItems?: string[]
}

export type CrossCheck3AResult = CrossCheckResult & { fixedPlan: FileSpec[] }

function phase2Record(context: ProjectContext): Record<string, unknown> {
  const p = context.phase2Output as unknown
  return p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : {}
}

function mustFeaturesFromPhase2(p2: Record<string, unknown>): Array<Record<string, unknown>> {
  const prd = p2['prd']
  let features: unknown = p2['features']
  if (prd && typeof prd === 'object' && !Array.isArray(prd)) {
    const nested = (prd as Record<string, unknown>)['features']
    if (Array.isArray(nested)) features = nested
  }
  if (!Array.isArray(features)) return []
  return features.filter(
    (f) =>
      f &&
      typeof f === 'object' &&
      !Array.isArray(f) &&
      String((f as Record<string, unknown>)['priority']).toLowerCase() === 'must',
  ) as Array<Record<string, unknown>>
}

function systemDesign(context: ProjectContext): Record<string, unknown> {
  const p2 = phase2Record(context)
  const sd = p2['systemDesign']
  if (sd && typeof sd === 'object' && !Array.isArray(sd)) return sd as Record<string, unknown>
  return p2
}

export function crossCheck0(
  context: ProjectContext,
  estimate: ProjectSizeEstimate,
): CrossCheckResult {
  const checkId = 'check_0_estimate'
  const issues: string[] = []
  const p2 = phase2Record(context)
  const mustFeatureCount = mustFeaturesFromPhase2(p2).length

  if (estimate.totalFiles < mustFeatureCount * 2) {
    issues.push(
      `Estimated file count (${estimate.totalFiles}) seems low for ${mustFeatureCount} must-have features. Minimum expected: ${mustFeatureCount * 2}.`,
    )
  }

  const prefs = readUserPreferences(context)
  if (
    estimate.architecture === 'microservices' &&
    String(prefs['scale'] ?? 'mvp').toLowerCase() === 'mvp'
  ) {
    issues.push('Microservices architecture selected for MVP scale. Consider single-repo.')
  }

  const sd = systemDesign(context)
  if (!sd['frontendStack'] || String(sd['frontendStack']).trim().length === 0) {
    issues.push(
      'frontendStack is missing from system_design output. Phase 4 cannot determine frontend framework.',
    )
  }
  if (!sd['backendStack'] || String(sd['backendStack']).trim().length === 0) {
    issues.push('backendStack is missing from system_design output.')
  }

  return { checkId, passed: issues.length === 0, issues, autoFixed: false }
}

export function crossCheck1A(output: Record<string, unknown>): CrossCheckResult {
  const checkId = 'check_1a_idea'
  const issues: string[] = []
  let autoFixed = false

  const genericIcpPhrases = [
    'people',
    'businesses',
    'users',
    'customers',
    'everyone',
    'small businesses',
    'companies',
    'organizations',
  ]

  const problem = typeof output['problem'] === 'string' ? output['problem'].trim() : ''
  if (problem.length < 10) issues.push('problem field is missing or too short')

  const solution = typeof output['solution'] === 'string' ? output['solution'].trim() : ''
  if (solution.length < 10) issues.push('solution field is missing or too short')

  const icpRaw = output['icp']
  const icpDesc =
    icpRaw && typeof icpRaw === 'object' && !Array.isArray(icpRaw)
      ? String((icpRaw as Record<string, unknown>)['description'] ?? '').trim()
      : ''
  if (!icpDesc) issues.push('icp.description is missing')
  else if (genericIcpPhrases.some((phrase) => icpDesc.toLowerCase() === phrase)) {
    issues.push('icp.description is too generic. Must describe a specific person.')
  }

  const cs = output['clarityScore']
  if (typeof cs !== 'number' || cs < 0 || cs > 100) {
    output['clarityScore'] = 50
    issues.push('clarityScore was out of range — defaulted to 50')
    autoFixed = true
  }

  const passed = issues.filter((i) => !i.includes('defaulted')).length === 0
  return { checkId, passed, issues, autoFixed }
}

export function crossCheck1B(output: Record<string, unknown>): CrossCheckResult {
  const checkId = 'check_1b_market'
  const issues: string[] = []
  let autoFixed = false

  const vRaw = output['verdict']
  const v = typeof vRaw === 'string' ? vRaw.toLowerCase() : ''
  if (!['yes', 'no', 'pivot'].includes(v)) {
    output['verdict'] = 'pivot'
    issues.push('verdict was not yes/no/pivot — defaulted to pivot')
    autoFixed = true
  }

  if (!Array.isArray(output['competitors'])) {
    output['competitors'] = []
    autoFixed = true
  }

  const ds = output['demandScore']
  if (typeof ds !== 'number' || ds < 0 || ds > 100) {
    output['demandScore'] = 50
    autoFixed = true
  }

  const risks = output['risks']
  if (!Array.isArray(risks) || risks.length < 2) {
    issues.push('risks[] must have at least 2 entries')
  }

  return { checkId, passed: issues.length === 0, issues, autoFixed }
}

export function crossCheck2(context: ProjectContext): CrossCheckResult {
  const checkId = 'check_2_phase2'
  const issues: string[] = []
  const p2 = phase2Record(context)
  const flow = (p2['userFlow'] as Record<string, unknown> | undefined) ?? p2
  const systemDesignRec = systemDesign(context)
  const uiux = (p2['uiux'] as Record<string, unknown> | undefined) ?? p2

  const mustHave = mustFeaturesFromPhase2(p2)
  const mustHaveNames = mustHave.map((f) => String(f['name'] ?? '').toLowerCase())

  let flowSteps: Array<{ label: string }> = []
  const stepsRaw = flow['steps'] ?? p2['steps']
  if (Array.isArray(stepsRaw)) {
    flowSteps = stepsRaw
      .filter((s) => s && typeof s === 'object' && !Array.isArray(s))
      .map((s) => ({ label: String((s as Record<string, unknown>)['label'] ?? '') }))
  }

  const flowStepLabels = flowSteps.map((s) => s.label.toLowerCase())
  const uncoveredFeatures = mustHaveNames.filter((name) => {
    const token = name.split(/\s+/)[0] ?? ''
    if (!token) return true
    return !flowStepLabels.some((label) => label.includes(token))
  })
  if (uncoveredFeatures.length > 0) {
    issues.push(
      `These must-have features have no corresponding user flow step: ${uncoveredFeatures.join(', ')}`,
    )
  }

  if (!systemDesignRec['frontendStack'] || String(systemDesignRec['frontendStack']).trim() === '') {
    issues.push('system_design is missing frontendStack — Phase 4 code generation will fail')
  }
  if (!systemDesignRec['backendStack'] || String(systemDesignRec['backendStack']).trim() === '') {
    issues.push('system_design is missing backendStack')
  }
  if (!systemDesignRec['dbChoice'] || String(systemDesignRec['dbChoice']).trim() === '') {
    issues.push('system_design is missing dbChoice')
  }

  const uiScreens = uiux['screens']
  const screenCount = Array.isArray(uiScreens) ? uiScreens.length : 0
  const flowStepCount = flowSteps.length
  if (screenCount > 0 && screenCount < Math.ceil(flowStepCount * 0.5)) {
    issues.push(
      `Only ${screenCount} screens for ${flowStepCount} flow steps. Consider generating more screens.`,
    )
  }

  return { checkId, passed: issues.length === 0, issues, autoFixed: false }
}

function lastBackendBatch(plan: FileSpec[]): number {
  const frontendish = new Set([
    'frontend-page',
    'frontend-component',
    'frontend-hook',
    'frontend-config',
  ])
  const batches = plan
    .filter((f) => !frontendish.has(String(f.layer)) && f.layer !== 'ci' && f.layer !== 'test')
    .map((f) => f.batchNumber)
  const mx = Math.max(0, ...batches)
  return mx > 0 ? mx : 1
}

function featureSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export function crossCheck3A(plan: FileSpec[], context: ProjectContext): CrossCheck3AResult {
  const checkId = 'check_3a_skeleton'
  const issues: string[] = []
  let autoFixed = false
  const fixedPlan: FileSpec[] = plan.map((f) => ({ ...f }))

  const p2 = phase2Record(context)
  const mustHave = mustFeaturesFromPhase2(p2)
  const lb = lastBackendBatch(fixedPlan)

  for (const mf of mustHave) {
    const name = String(mf['name'] ?? '')
    const token = name.toLowerCase().split(/\s+/)[0] ?? ''
    if (!token) continue
    const hasRoute = fixedPlan.some(
      (f) =>
        f.layer === 'route' && f.description.toLowerCase().includes(token),
    )
    const hasService = fixedPlan.some(
      (f) =>
        f.layer === 'service' && f.description.toLowerCase().includes(token),
    )
    if (!hasRoute || !hasService) {
      const slug = featureSlug(name) || 'feature'
      if (!hasRoute) {
        fixedPlan.push({
          path: `/src/routes/${slug}.routes.ts`,
          description: `Routes for ${name}`,
          layer: 'route',
          batchNumber: lb,
          complexity: 'medium',
          estimatedLines: 60,
          dependencies: [],
        })
      }
      if (!hasService) {
        fixedPlan.push({
          path: `/src/services/${slug}.service.ts`,
          description: `Service for ${name}`,
          layer: 'service',
          batchNumber: lb,
          complexity: 'complex',
          estimatedLines: 120,
          dependencies: [],
        })
      }
      autoFixed = true
      issues.push(`Auto-added missing route/service for feature: ${name}`)
    }
  }

  const hasEntryPoint = fixedPlan.some(
    (f) =>
      f.path.endsWith('index.ts') ||
      f.path.endsWith('server.ts') ||
      f.path.endsWith('app.ts'),
  )
  if (!hasEntryPoint) {
    fixedPlan.push({
      path: '/src/index.ts',
      description: 'Application entry point',
      layer: 'route',
      batchNumber: lb,
      complexity: 'complex',
      estimatedLines: 120,
      dependencies: [],
    })
    autoFixed = true
    issues.push('Auto-added missing entry point file')
  }

  const p3 = context.phase3Output as unknown
  const screens: Array<{ screenName: string; route: string }> = []
  if (p3 && typeof p3 === 'object' && !Array.isArray(p3)) {
    const raw = (p3 as Record<string, unknown>)['screens']
    if (Array.isArray(raw)) {
      for (const s of raw) {
        if (s && typeof s === 'object' && !Array.isArray(s)) {
          const o = s as Record<string, unknown>
          const screenName =
            typeof o['screenName'] === 'string'
              ? o['screenName']
              : typeof o['name'] === 'string'
                ? o['name']
                : ''
          if (!screenName) continue
          screens.push({
            screenName,
            route: typeof o['route'] === 'string' ? o['route'] : '',
          })
        }
      }
    }
  }

  const maxBatch = Math.max(1, ...fixedPlan.map((f) => f.batchNumber))
  for (const sc of screens) {
    const screenName = sc.screenName
    const token = screenName.toLowerCase().split(/\s+/)[0] ?? ''
    if (!token) continue
    const hasPage = fixedPlan.some(
      (f) =>
        f.layer === 'frontend-page' &&
        f.path.toLowerCase().includes(token.replace(/[^a-z0-9]/g, '')),
    )
    if (!hasPage) {
      const slug = featureSlug(screenName) || 'screen'
      fixedPlan.push({
        path: `/app/${slug}/page.tsx`,
        description: `Page for ${screenName}`,
        layer: 'frontend-page',
        batchNumber: maxBatch,
        complexity: 'medium',
        estimatedLines: 80,
        dependencies: [],
      })
      autoFixed = true
      issues.push(`Auto-added missing frontend page for screen: ${screenName}`)
    }
  }

  const pathToBatch = new Map(fixedPlan.map((f) => [f.path, f.batchNumber]))
  for (const f of fixedPlan) {
    for (const dep of f.dependencies) {
      const depBatch = pathToBatch.get(dep)
      if (depBatch === undefined) continue
      if (depBatch > f.batchNumber) {
        issues.push(
          `Dependency order warning: ${f.path} (batch ${f.batchNumber}) imports ${dep} (batch ${depBatch}).`,
        )
      }
    }
  }

  const passed = issues.filter((i) => !i.startsWith('Auto-added')).length === 0
  return { checkId, passed, issues, autoFixed, fixedPlan }
}

export function crossCheck3B(
  generatedFiles: { path: string; content: string }[],
): CrossCheckResult {
  const checkId = 'check_3b_batch'
  const issues: string[] = []
  const PLACEHOLDER_PATTERNS: RegExp[] = [
    /\/\/ TODO/i,
    /\/\/ implement/i,
    /throw new Error\(['"]not implemented/i,
    /\/\/ your code here/i,
    /placeholder/i,
  ]

  for (const file of generatedFiles) {
    if (file.content.length < 50) {
      issues.push(
        `File ${file.path} is suspiciously short (${file.content.length} chars). May be incomplete.`,
      )
    }
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(file.content)) {
        issues.push(`File ${file.path} contains placeholder code: ${pattern.source}`)
      }
    }
  }

  return { checkId, passed: issues.length === 0, issues, autoFixed: false }
}

export function crossCheck3C(
  generatedFiles: { path: string; content: string }[],
  plan: { totalFiles: number },
): CrossCheckResult {
  const checkId = 'check_3c_final'
  const issues: string[] = []
  const actual = generatedFiles.length
  const expected = plan.totalFiles
  if (actual < expected * 0.95) {
    issues.push(
      `Generated ${actual} files but plan expected ${expected}. ${expected - actual} files may be missing.`,
    )
  }

  const hasEntry = generatedFiles.some(
    (f) => f.path.endsWith('index.ts') || f.path.endsWith('server.ts'),
  )
  if (!hasEntry) {
    issues.push('No entry point file (index.ts/server.ts) found in generated files.')
  }

  const hasEnv = generatedFiles.some((f) => f.path.includes('.env.example'))
  if (!hasEnv) {
    issues.push('.env.example not found. Deployment will be difficult without it.')
  }

  const hasLayout = generatedFiles.some(
    (f) => f.path.includes('layout.tsx') || f.path.includes('layout.ts'),
  )
  if (!hasLayout) {
    issues.push('No layout file found in frontend files.')
  }

  return { checkId, passed: issues.length === 0, issues, autoFixed: false }
}
