import { BaseAgent } from '../base.agent.js'
import {
  buildModeConstraint,
  readBuildMode,
  phase1AsRecord,
  phase2AsRecord,
  icpDescriptionFromPhase1,
} from '../prompt.helpers.js'

import type { AgentType, ProjectContext } from '@repo/types'

const STEP_TYPES = new Set(['action', 'decision', 'result', 'system'])
const RISK_LEVELS = new Set(['high', 'medium', 'low', 'none'])

function mustHaveFeatureLines(context: ProjectContext): string {
  const p2 = phase2AsRecord(context)
  const features = p2['features']
  if (!Array.isArray(features)) {
    return 'PRD not yet generated — use startup problem as guide'
  }
  const lines: string[] = []
  for (const f of features) {
    if (!f || typeof f !== 'object' || Array.isArray(f)) continue
    const row = f as Record<string, unknown>
    if (row['priority'] === 'must' && typeof row['name'] === 'string') {
      lines.push(`- ${row['name']}`)
    }
  }
  return lines.length ? lines.join('\n') : 'PRD not yet generated — use startup problem as guide'
}

export class UserFlowAgent extends BaseAgent {
  readonly agentType: AgentType = 'user_flow'
  readonly phase = 2

  getAgentTask(): string {
    return 'Map user journey from signup to core value'
  }

  buildSystemPrompt(context: ProjectContext, documentContent: string): string {
    void documentContent
    const mode = readBuildMode(context)
    const p1 = phase1AsRecord(context)
    const icp = icpDescriptionFromPhase1(p1)
    const mustList = mustHaveFeatureLines(context)

    return `ROLE: UX flow designer, maps journeys that convert first-time users.

CONTEXT:
ICP: ${icp}
Must-have features:
${mustList}

Build mode: ${buildModeConstraint(mode)}

CONSTRAINTS:
Maximum 12 steps. Keep it scannable.
ahaMoment: the EXACT step ID where user first gets core value.
dropOffRisk per step: 'high'|'medium'|'low'|'none' only.
Decision steps must have branches: { "yes": "stepId", "no": "stepId" }
Non-decision steps must have branches: null

OUTPUT SCHEMA:
{ "steps":[{ "id","label","type":"action"|"decision"|"result"|"system","description","dropOffRisk","dropOffReason?","branches":null|{ "yes","no" } }],
  "ahaMoment","criticalDropOffPoint","retentionTrigger","stepCount" }`
  }

  parseOutput(rawText: string): { data: Record<string, unknown>; success: boolean } {
    const parsed = this.safeJsonParse(rawText)
    if (!parsed.data || !parsed.success) {
      return { data: { steps: [], stepCount: 0, success: false }, success: false }
    }
    const base = { ...parsed.data }
    let steps = base['steps']
    if (!Array.isArray(steps)) steps = []
    const outSteps: Array<Record<string, unknown>> = []
    for (const s of steps as unknown[]) {
      if (!s || typeof s !== 'object' || Array.isArray(s)) continue
      const row = { ...(s as Record<string, unknown>) }
      let t = typeof row['type'] === 'string' ? row['type'] : 'action'
      if (!STEP_TYPES.has(t)) t = 'action'
      row['type'] = t
      let risk = typeof row['dropOffRisk'] === 'string' ? row['dropOffRisk'] : 'none'
      if (!RISK_LEVELS.has(risk)) risk = 'none'
      row['dropOffRisk'] = risk
      const branches = row['branches']
      if (t === 'decision') {
        if (!branches || typeof branches !== 'object' || Array.isArray(branches)) {
          row['branches'] = { yes: 'next', no: 'end' }
        } else {
          const b = branches as Record<string, unknown>
          row['branches'] = {
            yes: typeof b['yes'] === 'string' ? b['yes'] : 'next',
            no: typeof b['no'] === 'string' ? b['no'] : 'end',
          }
        }
      } else {
        row['branches'] = null
      }
      outSteps.push(row)
    }
    base['steps'] = outSteps.slice(0, 12)
    base['stepCount'] = (base['steps'] as unknown[]).length
    return { data: base, success: true }
  }
}
