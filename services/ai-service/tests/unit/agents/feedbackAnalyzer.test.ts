import { describe, expect, it } from 'vitest'

import { FeedbackAnalyzerAgent } from '../../../src/agents/phase6/feedbackAnalyzer.agent.js'

import type { ProjectContext } from '@repo/types'

function ctx(): ProjectContext {
  return {
    projectId: '660e8400-e29b-41d4-a716-446655440001',
    projectName: 'Co',
    currentPhase: 6,
    phase1Output: {
      icp: { description: 'Founder', painPoints: ['time'] },
    } as never,
  }
}

describe('FeedbackAnalyzerAgent', () => {
  const agent = new FeedbackAnalyzerAgent()

  it('buildSystemPrompt includes documentContent when provided', () => {
    const s = agent.buildSystemPrompt(ctx(), 'FEEDBACK_DOC_BODY')
    expect(s).toContain('FEEDBACK_DOC_BODY')
    expect(s).toContain('[KNOWLEDGE BASE')
  })

  it("buildSystemPrompt shows '[No customer feedback documents uploaded]' when empty", () => {
    const s = agent.buildSystemPrompt(ctx(), '')
    expect(s).toContain('[No customer feedback documents uploaded]')
  })

  it('parseOutput defaults themes to [] on missing field', () => {
    const { data } = agent.parseOutput(JSON.stringify({ sentiment: 'mixed' }))
    expect(data['themes']).toEqual([])
  })
})
