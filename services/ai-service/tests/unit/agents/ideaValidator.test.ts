import { describe, expect, it } from 'vitest'

import { IdeaAnalyzerAgent } from '../../../src/agents/phase1/ideaValidator.agent.js'

import type { ProjectContext } from '@repo/types'

function ctx(over?: Partial<ProjectContext>): ProjectContext {
  return {
    projectId: '660e8400-e29b-41d4-a716-446655440001',
    projectName: 'Acme',
    currentPhase: 1,
    ...over,
  }
}

describe('IdeaAnalyzerAgent (idea_validator)', () => {
  const agent = new IdeaAnalyzerAgent()

  it('buildSystemPrompt includes project name and build mode', () => {
    const p = ctx({
      project: { buildMode: 'autopilot', userPreferences: {} },
    } as ProjectContext)
    const s = agent.buildSystemPrompt(p, '')
    expect(s).toContain('Acme')
    expect(s).toContain('Generate complete, thorough output immediately.')
  })

  it('buildSystemPrompt does NOT include documentContent (always empty path)', () => {
    const s = agent.buildSystemPrompt(ctx(), 'SHOULD_NOT_APPEAR')
    expect(s).not.toContain('SHOULD_NOT_APPEAR')
  })

  it('parseOutput valid JSON → all required fields present', () => {
    const raw = JSON.stringify({
      problem: 'Solo founders waste hours on X.',
      solution: 'We automate X. It saves time.',
      icp: {
        description: 'Indie SaaS founder',
        demographics: 'US/EU',
        painPoints: ['time'],
        willingnessToPay: '$29/mo',
      },
      assumptions: ['They use Slack'],
      clarityScore: 55,
    })
    const { data, success } = agent.parseOutput(raw)
    expect(success).toBe(true)
    expect(data['problem']).toBe('Solo founders waste hours on X.')
    expect(data['solution']).toContain('automate')
    expect(Array.isArray(data['assumptions'])).toBe(true)
    const icp = data['icp'] as Record<string, unknown>
    expect(icp['description']).toBe('Indie SaaS founder')
    expect(Array.isArray(icp['painPoints'])).toBe(true)
  })

  it('parseOutput invalid JSON → success false, data still populated', () => {
    const { data, success } = agent.parseOutput('not json {{{')
    expect(success).toBe(false)
    expect(data['_parseError']).toBe(true)
    expect(typeof data['problem']).toBe('string')
    expect(data['problem']).toContain('not')
    expect(data['icp']).toBeDefined()
  })

  it('parseOutput clamps clarityScore 0-100', () => {
    const hi = JSON.stringify({
      problem: 'p',
      solution: 's',
      icp: { description: 'd', demographics: '', painPoints: [], willingnessToPay: '' },
      assumptions: [],
      clarityScore: 150,
    })
    expect(agent.parseOutput(hi).data['clarityScore']).toBe(100)
    const lo = JSON.stringify({
      problem: 'p',
      solution: 's',
      icp: { description: 'd', demographics: '', painPoints: [], willingnessToPay: '' },
      assumptions: [],
      clarityScore: -5,
    })
    expect(agent.parseOutput(lo).data['clarityScore']).toBe(0)
  })
})
