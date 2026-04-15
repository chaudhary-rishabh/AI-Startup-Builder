import { BaseAgent } from '../base.agent.js'
import {
  buildModeConstraint,
  formatUserPreferencesLine,
  readBuildMode,
  readUserPreferences,
  icpDescriptionFromPhase1,
  phase1AsRecord,
} from '../prompt.helpers.js'

import type { AgentType, ProjectContext } from '@repo/types'

const PRIORITIES = new Set(['must', 'should', 'could', 'wont'])

function firstRisk(rec: Record<string, unknown>): string {
  const risks = rec['risks']
  if (!Array.isArray(risks) || risks.length === 0) return 'Not specified'
  const r0 = risks[0]
  if (r0 && typeof r0 === 'object' && !Array.isArray(r0)) {
    const d = (r0 as Record<string, unknown>)['description']
    if (typeof d === 'string' && d.length) return d
  }
  return 'Not specified'
}

function pricingRange(rec: Record<string, unknown>): string {
  const ps = rec['pricingSuggestion']
  if (ps && typeof ps === 'object' && !Array.isArray(ps)) {
    const r = (ps as Record<string, unknown>)['range']
    if (typeof r === 'string') return r
  }
  const legacy = rec['pricingSuggest']
  if (typeof legacy === 'string') return legacy
  return 'Not specified'
}

export class PrdGeneratorAgent extends BaseAgent {
  readonly agentType: AgentType = 'prd_generator'
  readonly phase = 2

  getAgentTask(): string {
    return 'Generate MoSCoW-prioritized product requirements with user stories and acceptance criteria'
  }

  buildSystemPrompt(context: ProjectContext, documentContent: string): string {
    const mode = readBuildMode(context)
    const prefs = readUserPreferences(context)
    const p1 = phase1AsRecord(context)
    const icpDesc = icpDescriptionFromPhase1(p1)
    const problem = typeof p1['problem'] === 'string' ? p1['problem'] : ''
    const solution = typeof p1['solution'] === 'string' ? p1['solution'] : ''
    const wtp =
      p1['icp'] && typeof p1['icp'] === 'object' && !Array.isArray(p1['icp'])
        ? String((p1['icp'] as Record<string, unknown>)['willingnessToPay'] ?? '')
        : ''
    const demandScore = typeof p1['demandScore'] === 'number' ? p1['demandScore'] : 'n/a'
    const verdict = typeof p1['verdict'] === 'string' ? p1['verdict'] : 'n/a'
    const marketGap = typeof p1['marketGap'] === 'string' ? p1['marketGap'] : ''
    const docBlock =
      documentContent.trim().length > 0
        ? `DOCUMENT CONTEXT (if user uploaded business plan, interviews, specs):\n${documentContent}\n`
        : ''

    return `ROLE: Principal PM, 15yr experience, ships immediately-buildable PRDs.

CONTEXT — Full Phase 1 output:
Problem: ${problem}
Solution: ${solution}
ICP: ${icpDesc} — pays ${wtp || 'n/a'}
Demand score: ${demandScore}/100, Verdict: ${verdict}
Top risk: ${firstRisk(p1)}
Market gap: ${marketGap}
Suggested pricing: ${pricingRange(p1)}

Build mode: ${buildModeConstraint(mode)}
Scale preference: ${prefs['scale'] ?? 'AI decides'}
Platform: ${prefs['platform'] ?? 'AI decides'}
User preferences: ${formatUserPreferencesLine(prefs)}

${docBlock}
CONSTRAINTS:
Maximum 5 Must Have features. If listing >5 Must Have you are wrong.
User stories: "As a [exact ICP persona] I want X so that Y"
Acceptance criteria: Given/When/Then format, testable.
outOfScope[]: exactly 3-5 items (as important as what IS in scope).
successMetrics.primary: ONE metric with a specific number target.

OUTPUT SCHEMA:
{ "features":[{ "id","name","priority":"must"|"should"|"could"|"wont","description","userStory","acceptanceCriteria" }],
  "targetUsers","problemStatement","successMetrics":{ "primary","secondary" },
  "outOfScope","risks","featureCount":{ "must","should","could","wont" } }
features[].acceptanceCriteria: string array. successMetrics.secondary: string array.
outOfScope and risks: string arrays. feature id: string.`
  }

  parseOutput(rawText: string): { data: Record<string, unknown>; success: boolean } {
    const parsed = this.safeJsonParse(rawText)
    if (!parsed.data || !parsed.success) {
      return {
        data: {
          features: [
            {
              id: 'f-parse',
              name: 'MVP core',
              priority: 'must',
              description: 'Recovered after invalid model output.',
              userStory: 'As the user I want stability so that the product works.',
              acceptanceCriteria: [],
            },
          ],
          featureCount: { must: 1, should: 0, could: 0, wont: 0 },
        },
        success: false,
      }
    }
    const base = { ...parsed.data }
    let features = base['features']
    if (!Array.isArray(features) || features.length === 0) {
      features = [
        {
          id: 'f-placeholder',
          name: 'Core MVP capability',
          priority: 'must',
          description: 'Deliver the minimum viable path to validated value.',
          userStory: 'As the primary user I want core value so that my pain is addressed.',
          acceptanceCriteria: ['Given initial state, When I use the product, Then I receive clear value.'],
        },
      ]
    }
    const normalized: Array<Record<string, unknown>> = []
    let mustCount = 0
    for (const f of features as unknown[]) {
      if (!f || typeof f !== 'object' || Array.isArray(f)) continue
      const row = { ...(f as Record<string, unknown>) }
      let p = typeof row['priority'] === 'string' ? row['priority'] : 'should'
      if (!PRIORITIES.has(p)) p = 'should'
      if (p === 'must') mustCount++
      row['priority'] = p
      if (!Array.isArray(row['acceptanceCriteria'])) row['acceptanceCriteria'] = []
      normalized.push(row)
    }
    while (mustCount > 5) {
      for (let i = normalized.length - 1; i >= 0 && mustCount > 5; i--) {
        if (normalized[i]!['priority'] === 'must') {
          normalized[i]!['priority'] = 'should'
          mustCount--
        }
      }
    }
    if (!normalized.some((r) => r['priority'] === 'must')) {
      normalized.unshift({
        id: 'f-must-core',
        name: 'MVP core',
        priority: 'must',
        description: 'Minimum scope to ship validated value.',
        userStory: 'As the target user I want the core job done so that I achieve my goal.',
        acceptanceCriteria: ['Given I am authenticated, When I complete the primary flow, Then the outcome is persisted.'],
      })
    }
    const counts = { must: 0, should: 0, could: 0, wont: 0 }
    for (const r of normalized) {
      const k = r['priority'] as string
      if (k === 'must') counts.must++
      else if (k === 'should') counts.should++
      else if (k === 'could') counts.could++
      else if (k === 'wont') counts.wont++
    }
    base['features'] = normalized
    base['featureCount'] = counts
    return { data: base, success: true }
  }
}
