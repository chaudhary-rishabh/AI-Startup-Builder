import { describe, expect, it } from 'vitest'

import { MarketResearchAgent } from '../../../src/agents/phase1/marketValidator.agent.js'

import type { ProjectContext } from '@repo/types'

function baseCtx(): ProjectContext {
  return {
    projectId: '660e8400-e29b-41d4-a716-446655440001',
    projectName: 'Acme',
    currentPhase: 1,
  }
}

describe('MarketResearchAgent (market_validator)', () => {
  const agent = new MarketResearchAgent()

  it('buildSystemPrompt includes phase1Output problem and solution', () => {
    const c = {
      ...baseCtx(),
      phase1Output: {
        problem: 'P1',
        solution: 'S1',
        icp: { description: 'ICP1' },
      } as never,
    }
    const s = agent.buildSystemPrompt(c, '')
    expect(s).toContain('P1')
    expect(s).toContain('S1')
    expect(s).toContain('ICP1')
  })

  it('buildSystemPrompt handles missing phase1Output gracefully', () => {
    expect(() => agent.buildSystemPrompt(baseCtx(), '')).not.toThrow()
    const s = agent.buildSystemPrompt(baseCtx(), '')
    expect(s).toContain('Not analyzed yet')
  })

  it('buildSystemPrompt includes documentContent when non-empty', () => {
    const s = agent.buildSystemPrompt(baseCtx(), 'PDF MARKET DATA')
    expect(s).toContain('PDF MARKET DATA')
  })

  it('parseOutput validates verdict is exactly yes|no|pivot', () => {
    const bad = JSON.stringify({
      verdict: 'maybe',
      competitors: [],
      demandScore: 40,
      risks: [
        { description: 'a', severity: 'low', mitigation: 'm' },
        { description: 'b', severity: 'high', mitigation: 'm' },
      ],
    })
    expect(agent.parseOutput(bad).data['verdict']).toBe('pivot')
    const ok = JSON.stringify({
      verdict: 'yes',
      competitors: [],
      demandScore: 40,
      risks: [
        { description: 'a', severity: 'low', mitigation: 'm' },
        { description: 'b', severity: 'high', mitigation: 'm' },
      ],
    })
    expect(agent.parseOutput(ok).data['verdict']).toBe('yes')
  })

  it('parseOutput ensures competitors is array', () => {
    const raw = JSON.stringify({
      verdict: 'no',
      competitors: 'nope',
      demandScore: 10,
      risks: [
        { description: 'a', severity: 'low', mitigation: 'm' },
        { description: 'b', severity: 'high', mitigation: 'm' },
      ],
    })
    expect(Array.isArray(agent.parseOutput(raw).data['competitors'])).toBe(true)
  })

  it('parseOutput ensures demandScore is 0-100', () => {
    const raw = JSON.stringify({
      verdict: 'pivot',
      competitors: [],
      demandScore: 500,
      risks: [
        { description: 'a', severity: 'low', mitigation: 'm' },
        { description: 'b', severity: 'high', mitigation: 'm' },
      ],
    })
    expect(agent.parseOutput(raw).data['demandScore']).toBe(100)
  })
})
