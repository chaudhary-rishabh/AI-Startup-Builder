import { BaseAgent } from '../base.agent.js'
import {
  buildModeConstraint,
  formatUserPreferencesLine,
  readBuildMode,
  readUserPreferences,
  phase1AsRecord,
} from '../prompt.helpers.js'

import type { AgentType, ProjectContext } from '@repo/types'

export class MarketResearchAgent extends BaseAgent {
  readonly agentType: AgentType = 'market_research'
  readonly phase = 1

  getAgentTask(): string {
    return 'Research competitive landscape, market gaps, and pricing for this startup idea'
  }

  buildSystemPrompt(context: ProjectContext, documentContent: string): string {
    const mode = readBuildMode(context)
    const prefs = readUserPreferences(context)
    const p1 = phase1AsRecord(context)
    const problem = typeof p1['problem'] === 'string' ? p1['problem'] : 'Not analyzed yet'
    const solution = typeof p1['solution'] === 'string' ? p1['solution'] : ''
    const icpJson = JSON.stringify(p1['icp'] ?? {})
    const docBlock =
      documentContent.trim().length > 0
        ? `DOCUMENT CONTEXT (if docs uploaded):\n${documentContent}\n`
        : ''

    return `ROLE: Market research analyst, 500+ founders, honest market picture.

CONTEXT — Phase 1 idea analysis:
Problem: ${problem}
Solution: ${solution}
ICP: ${icpJson}
User preferences: ${formatUserPreferencesLine(prefs)}
Build mode: ${buildModeConstraint(mode)}

${docBlock}
CONSTRAINTS:
Return ONLY valid JSON.
competitors[]: real named companies only. NEVER invented.
If no competitors known: set competitors:[] explain in marketGap.
demandScore: weighted (severity 30%, size 20%, weakness 20%, uniqueness 15%, ICP clarity 15%).
verdict: exactly "yes" | "no" | "pivot" — nothing else.
risks[]: minimum 2, maximum 4.
verdictReason: 2 specific sentences naming key reasons.

OUTPUT SCHEMA:
{ "competitors":[{ "name","description","pricing","strengths","weaknesses","targetMarket" }],
  "marketGap","positioning","pricingSuggestion":{ "model","range","rationale" },
  "marketSize":{ "tam","sam","som" },
  "demandScore","scoreBreakdown","risks":[{ "description","severity","mitigation" }],
  "verdict","verdictReason","nextSteps","keyQuestion" }
competitors[].strengths and competitors[].weaknesses: string arrays.
severity for risks: "high"|"medium"|"low"`
  }

  parseOutput(rawText: string): { data: Record<string, unknown>; success: boolean } {
    const parsed = this.safeJsonParse(rawText)
    const base: Record<string, unknown> = parsed.data && parsed.success ? { ...parsed.data } : {}

    let verdict = typeof base['verdict'] === 'string' ? base['verdict'] : 'pivot'
    if (verdict !== 'yes' && verdict !== 'no' && verdict !== 'pivot') verdict = 'pivot'
    base['verdict'] = verdict

    let competitors = base['competitors']
    if (!Array.isArray(competitors)) competitors = []
    base['competitors'] = competitors

    let demandScore = typeof base['demandScore'] === 'number' ? base['demandScore'] : 50
    demandScore = Math.max(0, Math.min(100, demandScore))
    base['demandScore'] = demandScore

    let risks = base['risks']
    if (!Array.isArray(risks)) risks = []
    const riskList = risks as Array<Record<string, unknown>>
    while (riskList.length < 2) {
      riskList.push({
        description: 'Further validation required on demand and differentiation.',
        severity: 'medium',
        mitigation: 'Run customer interviews and narrow ICP.',
      })
    }
    base['risks'] = riskList.slice(0, 4)

    return { data: base, success: parsed.success }
  }
}
