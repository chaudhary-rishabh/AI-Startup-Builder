import { BaseAgent } from '../base.agent.js'
import {
  phase1AsRecord,
  phase2AsRecord,
  readBuildMode,
  readUserPreferences,
} from '../prompt.helpers.js'

import type { AgentType, ProjectContext } from '@repo/types'

type ContextWithProject = ProjectContext & {
  project?: {
    name?: string
    buildMode?: string
    userPreferences?: Record<string, unknown> | null
  }
}

function readIcpRecord(p1: Record<string, unknown>): Record<string, unknown> {
  const icp = p1['icp']
  if (icp && typeof icp === 'object' && !Array.isArray(icp)) return icp as Record<string, unknown>
  return {}
}

function competitorNames(p1: Record<string, unknown>): string {
  const comps = p1['competitors']
  if (!Array.isArray(comps)) return ''
  return comps
    .map((c) => {
      if (!c || typeof c !== 'object' || Array.isArray(c)) return ''
      const n = (c as Record<string, unknown>)['name']
      return typeof n === 'string' ? n : ''
    })
    .filter(Boolean)
    .join(', ')
}

function readPhase2Nested(p2: Record<string, unknown>): {
  mustNames: string
  primaryMetric: string
  frontend: string
  backend: string
  deploymentJson: string
} {
  const prd =
    p2['prd'] && typeof p2['prd'] === 'object' && !Array.isArray(p2['prd'])
      ? (p2['prd'] as Record<string, unknown>)
      : undefined
  const sd =
    p2['systemDesign'] && typeof p2['systemDesign'] === 'object' && !Array.isArray(p2['systemDesign'])
      ? (p2['systemDesign'] as Record<string, unknown>)
      : undefined
  const rawFeats = (prd?.['features'] ?? p2['features']) as unknown
  const names: string[] = []
  if (Array.isArray(rawFeats)) {
    for (const f of rawFeats) {
      if (!f || typeof f !== 'object' || Array.isArray(f)) continue
      const row = f as Record<string, unknown>
      if (row['priority'] === 'must' && typeof row['name'] === 'string') names.push(row['name'])
    }
  }
  const sm = (prd?.['successMetrics'] ?? p2['successMetrics']) as Record<string, unknown> | undefined
  const primaryMetric =
    sm && typeof sm['primary'] === 'string' ? sm['primary'] : 'not specified'
  const frontend =
    typeof sd?.['frontendStack'] === 'string'
      ? sd['frontendStack']
      : typeof p2['frontendStack'] === 'string'
        ? p2['frontendStack']
        : ''
  const backend =
    typeof sd?.['backendStack'] === 'string'
      ? sd['backendStack']
      : typeof p2['backendStack'] === 'string'
        ? p2['backendStack']
        : ''
  const dep = sd?.['deploymentPlan'] ?? p2['deploymentPlan']
  const deploymentJson =
    dep !== undefined && dep !== null ? JSON.stringify(dep) : '{}'

  return {
    mustNames: names.join(', ') || 'not specified',
    primaryMetric,
    frontend: frontend || 'not specified',
    backend: backend || 'not specified',
    deploymentJson,
  }
}

export class GrowthStrategyAgent extends BaseAgent {
  readonly agentType: AgentType = 'growth_strategy'
  readonly phase = 6

  getAgentTask(): string {
    return 'Create go-to-market strategy and first 100 users acquisition playbook'
  }

  buildSystemPrompt(context: ProjectContext, documentContent: string): string {
    const p1 = phase1AsRecord(context)
    const p2 = phase2AsRecord(context)
    const icp = readIcpRecord(p1)
    const ctxP = context as ContextWithProject
    const rawBm = ctxP.project?.buildMode
    const buildMode =
      rawBm === 'autopilot' || rawBm === 'copilot' || rawBm === 'manual'
        ? rawBm
        : readBuildMode(context)
    const prefs = ctxP.project?.userPreferences ?? readUserPreferences(context)
    const projName = ctxP.project?.name?.trim() || context.projectName
    const p2n = readPhase2Nested(p2)

    const docBlock = documentContent.trim().length
      ? `
[KNOWLEDGE BASE — from user's uploaded market data / campaign results]
${documentContent}
`
      : ''

    return `[ROLE]
You are a growth strategist who has taken 20+ startups from zero to their first 1000 users. You give specific, actionable tactics — not vague channel recommendations. You know which strategies work for a solo founder with no marketing budget.

[CONTEXT — All phase outputs]
Project: ${projName}
Build mode: ${buildMode}
User preferences: ${JSON.stringify(prefs)}

Phase 1 — Validation:
  Problem: ${typeof p1['problem'] === 'string' ? p1['problem'] : ''}
  Solution: ${typeof p1['solution'] === 'string' ? p1['solution'] : ''}
  ICP: ${typeof icp['description'] === 'string' ? icp['description'] : ''}
  ICP Demographics: ${typeof icp['demographics'] === 'string' ? icp['demographics'] : ''}
  Willing to pay: ${typeof icp['willingnessToPay'] === 'string' ? icp['willingnessToPay'] : ''}
  Competitors: ${competitorNames(p1)}
  Market gap: ${typeof p1['marketGap'] === 'string' ? p1['marketGap'] : ''}
  Demand score: ${typeof p1['demandScore'] === 'number' ? p1['demandScore'] : 'n/a'}/100
  Verdict: ${typeof p1['verdict'] === 'string' ? p1['verdict'] : ''}

Phase 2 — Planning:
  Must-have features: ${p2n.mustNames}
  Primary success metric: ${p2n.primaryMetric}
  Stack: ${p2n.frontend} + ${p2n.backend}
  Deployment: ${p2n.deploymentJson}

${docBlock}

[TASK]
Create a complete go-to-market strategy for ${projName}.
Return JSON: { "channels", "first100UsersPlaybook", "contentCalendar", "seoKeywords", "socialStrategy", "weeklyTasks" }

[CONSTRAINTS]
- first100UsersPlaybook: SPECIFIC actions, SPECIFIC platforms, SPECIFIC timing.
  GOOD: "Post in r/entrepreneur on Tuesday 9am EST with title: [exact format]"
  BAD: "Post on Reddit"
- channels: ONLY channels accessible to solo founder with $0 budget.
- contentCalendar: 4 weeks, specific topics per day.
- seoKeywords: specific terms with estimated monthly search volume range.
- weeklyTasks: what to do in weeks 1, 2, 3, 4 after launch.
- Return JSON only. No explanation outside JSON.`
  }

  parseOutput(rawText: string): { data: Record<string, unknown>; success: boolean } {
    const parsed = this.safeJsonParse(rawText)
    const base: Record<string, unknown> = parsed.data && parsed.success ? { ...parsed.data } : {}
    let channels = base['channels']
    if (!Array.isArray(channels)) channels = []
    base['channels'] = channels
    return { data: base, success: parsed.success }
  }
}
