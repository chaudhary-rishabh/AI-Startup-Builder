import { BaseAgent } from '../base.agent.js'
import { phase1AsRecord, phase2AsRecord, icpDescriptionFromPhase1 } from '../prompt.helpers.js'

import type { AgentType, ProjectContext } from '@repo/types'

function readIcpRecord(p1: Record<string, unknown>): Record<string, unknown> {
  const icp = p1['icp']
  if (icp && typeof icp === 'object' && !Array.isArray(icp)) return icp as Record<string, unknown>
  return {}
}

function readSuccessMetrics(p2: Record<string, unknown>): {
  primary: string
  secondaryLine: string
} {
  const prd =
    p2['prd'] && typeof p2['prd'] === 'object' && !Array.isArray(p2['prd'])
      ? (p2['prd'] as Record<string, unknown>)
      : undefined
  const sm = (prd?.['successMetrics'] ?? p2['successMetrics']) as unknown
  if (!sm || typeof sm !== 'object' || Array.isArray(sm)) {
    return { primary: 'not specified', secondaryLine: 'none specified' }
  }
  const o = sm as Record<string, unknown>
  const primary = typeof o['primary'] === 'string' ? o['primary'] : 'not specified'
  const sec = o['secondary']
  const secondaryLine = Array.isArray(sec) ? sec.map(String).join(', ') : 'none specified'
  return { primary, secondaryLine }
}

function readMustHaveNames(p2: Record<string, unknown>): string[] {
  const prd =
    p2['prd'] && typeof p2['prd'] === 'object' && !Array.isArray(p2['prd'])
      ? (p2['prd'] as Record<string, unknown>)
      : undefined
  const raw = (prd?.['features'] ?? p2['features']) as unknown
  if (!Array.isArray(raw)) return []
  const names: string[] = []
  for (const f of raw) {
    if (!f || typeof f !== 'object' || Array.isArray(f)) continue
    const row = f as Record<string, unknown>
    if (row['priority'] === 'must' && typeof row['name'] === 'string') names.push(row['name'])
  }
  return names
}

export class AnalyticsAgent extends BaseAgent {
  readonly agentType: AgentType = 'analytics'
  readonly phase = 6

  getAgentTask(): string {
    return 'Define KPIs and analytics event tracking plan for the product'
  }

  buildSystemPrompt(context: ProjectContext, documentContent: string): string {
    void documentContent
    const p1 = phase1AsRecord(context)
    const p2 = phase2AsRecord(context)
    const icp = readIcpRecord(p1)
    const icpDesc = icpDescriptionFromPhase1(p1) || (typeof icp['description'] === 'string' ? icp['description'] : 'not specified')
    const pain = Array.isArray(icp['painPoints']) ? icp['painPoints'].map(String).join(', ') : 'not specified'
    const { primary, secondaryLine } = readSuccessMetrics(p2)
    const mustHave = readMustHaveNames(p2)

    return `[ROLE]
You are a growth analyst who defines metrics that actually predict whether a product is working. You avoid vanity metrics.

[CONTEXT]
Project: ${context.projectName}
ICP: ${icpDesc}
ICP pain points: ${pain}
Primary success metric: ${primary}
Secondary metrics: ${secondaryLine}

Must-have features (each needs event tracking):
${mustHave.length ? mustHave.map((n) => `- ${n}`).join('\n') : '- (none specified)'}

[TASK]
Define the analytics setup for this product.
Return JSON: { "kpiDefinitions", "eventsList", "funnelSteps", "setupGuide" }

[CONSTRAINTS]
- ONE primary metric with a specific measurable number target.
  GOOD: "D30 retention > 40%". BAD: "good retention".
- eventsList: one event per user action worth tracking, with properties.
- funnelSteps: the core conversion funnel (acquisition → activation → retention).
- setupGuide: PostHog or GA4 specific implementation steps.
- Return JSON only. No explanation.`
  }

  parseOutput(rawText: string): { data: Record<string, unknown>; success: boolean } {
    const parsed = this.safeJsonParse(rawText)
    const base: Record<string, unknown> = parsed.data && parsed.success ? { ...parsed.data } : {}
    if (
      !('kpiDefinitions' in base) ||
      base['kpiDefinitions'] === undefined ||
      base['kpiDefinitions'] === null
    ) {
      base['kpiDefinitions'] = {}
    }
    return { data: base, success: parsed.success }
  }
}
