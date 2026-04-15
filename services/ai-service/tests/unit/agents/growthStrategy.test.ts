import { describe, expect, it } from 'vitest'

import { GrowthStrategyAgent } from '../../../src/agents/phase6/growthStrategy.agent.js'

import type { ProjectContext } from '@repo/types'

describe('GrowthStrategyAgent', () => {
  const agent = new GrowthStrategyAgent()

  it('buildSystemPrompt includes ALL phase1 fields used in template', () => {
    const c = {
      projectId: '660e8400-e29b-41d4-a716-446655440001',
      projectName: 'P',
      currentPhase: 6,
      project: { name: 'NamedCo', buildMode: 'autopilot', userPreferences: { scale: 'solo' } },
      phase1Output: {
        problem: 'Pr',
        solution: 'Sol',
        icp: { description: 'ICP1', demographics: 'US', willingnessToPay: '$20' },
        competitors: [{ name: 'CompA' }, { name: 'CompB' }],
        marketGap: 'Gap here',
        demandScore: 71,
        verdict: 'yes',
      } as never,
      phase2Output: {
        prd: {
          features: [{ name: 'F1', priority: 'must', description: 'd' }],
          successMetrics: { primary: 'ARR $10k' },
        },
        systemDesign: {
          frontendStack: 'Next.js 15',
          backendStack: 'Hono',
          deploymentPlan: { frontend: 'Vercel' },
        },
      } as never,
    } as ProjectContext
    const s = agent.buildSystemPrompt(c, '')
    expect(s).toContain('Pr')
    expect(s).toContain('Sol')
    expect(s).toContain('ICP1')
    expect(s).toContain('US')
    expect(s).toContain('$20')
    expect(s).toContain('CompA')
    expect(s).toContain('Gap here')
    expect(s).toContain('71')
    expect(s).toContain('yes')
  })

  it('buildSystemPrompt includes phase2 must-have feature names', () => {
    const c = {
      projectId: '660e8400-e29b-41d4-a716-446655440001',
      projectName: 'P',
      currentPhase: 6,
      phase2Output: {
        prd: { features: [{ name: 'Auth', priority: 'must', description: '' }] },
        systemDesign: { frontendStack: 'A', backendStack: 'B', deploymentPlan: {} },
      } as never,
    } as ProjectContext
    expect(agent.buildSystemPrompt(c, '')).toContain('Auth')
  })

  it('buildSystemPrompt includes documentContent when non-empty', () => {
    const c = {
      projectId: '660e8400-e29b-41d4-a716-446655440001',
      projectName: 'P',
      currentPhase: 6,
    } as ProjectContext
    expect(agent.buildSystemPrompt(c, 'MARKET_DOCS_HERE')).toContain('MARKET_DOCS_HERE')
  })

  it('buildSystemPrompt handles missing phase1Output gracefully', () => {
    const c = {
      projectId: '660e8400-e29b-41d4-a716-446655440001',
      projectName: 'P',
      currentPhase: 6,
    } as ProjectContext
    expect(() => agent.buildSystemPrompt(c, '')).not.toThrow()
  })

  it('buildSystemPrompt handles missing phase2Output gracefully', () => {
    const c = {
      projectId: '660e8400-e29b-41d4-a716-446655440001',
      projectName: 'P',
      currentPhase: 6,
      phase1Output: { problem: 'x', solution: 'y', icp: {} } as never,
    } as ProjectContext
    expect(() => agent.buildSystemPrompt(c, '')).not.toThrow()
  })

  it('parseOutput returns default empty channels array on malformed JSON', () => {
    const { data, success } = agent.parseOutput('not json')
    expect(success).toBe(false)
    expect(data['channels']).toEqual([])
  })
})
