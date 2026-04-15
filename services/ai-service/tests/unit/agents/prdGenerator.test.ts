import { describe, expect, it } from 'vitest'

import { PrdGeneratorAgent } from '../../../src/agents/phase2/prdGenerator.agent.js'

import type { ProjectContext } from '@repo/types'

function phase1Ctx(): ProjectContext {
  return {
    projectId: '660e8400-e29b-41d4-a716-446655440001',
    projectName: 'Acme',
    currentPhase: 2,
    phase1Output: {
      problem: 'P',
      solution: 'S',
      icp: { description: 'Founder', willingnessToPay: '$50' },
      demandScore: 62,
      verdict: 'yes',
      risks: [{ description: 'Competition', severity: 'medium' }],
      marketGap: 'Gap text',
      pricingSuggestion: { range: '$20–40' },
    } as never,
  }
}

describe('PrdGeneratorAgent', () => {
  const agent = new PrdGeneratorAgent()

  it('buildSystemPrompt includes full Phase1Output fields', () => {
    const s = agent.buildSystemPrompt(phase1Ctx(), '')
    expect(s).toContain('P')
    expect(s).toContain('S')
    expect(s).toContain('Founder')
    expect(s).toContain('62')
    expect(s).toContain('yes')
    expect(s).toContain('Competition')
    expect(s).toContain('Gap text')
    expect(s).toContain('$20–40')
  })

  it('buildSystemPrompt includes documentContent', () => {
    const s = agent.buildSystemPrompt(phase1Ctx(), 'USER_UPLOADED_SPEC')
    expect(s).toContain('USER_UPLOADED_SPEC')
  })

  it('parseOutput caps at most 5 Must Have features by downgrading extras', () => {
    const features = Array.from({ length: 7 }).map((_, i) => ({
      id: `f${i}`,
      name: `F${i}`,
      priority: 'must',
      description: 'd',
      userStory: 'story',
      acceptanceCriteria: [],
    }))
    const raw = JSON.stringify({
      features,
      targetUsers: 'u',
      problemStatement: 'ps',
      successMetrics: { primary: 'MRR $10k', secondary: [] },
      outOfScope: ['a', 'b', 'c'],
      risks: [],
    })
    const { data } = agent.parseOutput(raw)
    const feats = data['features'] as Array<Record<string, unknown>>
    const mustN = feats.filter((f) => f['priority'] === 'must').length
    expect(mustN).toBeLessThanOrEqual(5)
    const counts = data['featureCount'] as Record<string, number>
    expect(counts['must']).toBeLessThanOrEqual(5)
  })

  it('parseOutput normalizes invalid priority to should', () => {
    const raw = JSON.stringify({
      features: [
        {
          id: '1',
          name: 'A',
          priority: 'urgent',
          description: 'd',
          userStory: 's',
          acceptanceCriteria: 'not-array',
        },
      ],
    })
    const { data } = agent.parseOutput(raw)
    const feats = data['features'] as Array<Record<string, unknown>>
    const rowA = feats.find((f) => f['name'] === 'A')
    expect(rowA?.['priority']).toBe('should')
    expect(Array.isArray(rowA?.['acceptanceCriteria'])).toBe(true)
  })

  it('parseOutput defaults acceptanceCriteria to []', () => {
    const raw = JSON.stringify({
      features: [
        {
          id: '1',
          name: 'A',
          priority: 'must',
          description: 'd',
          userStory: 's',
        },
      ],
    })
    const { data } = agent.parseOutput(raw)
    const feats = data['features'] as Array<Record<string, unknown>>
    expect(feats[0]!['acceptanceCriteria']).toEqual([])
  })
})
