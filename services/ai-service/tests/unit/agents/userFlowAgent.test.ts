import { describe, expect, it } from 'vitest'

import { UserFlowAgent } from '../../../src/agents/phase2/userFlowAgent.agent.js'

import type { ProjectContext } from '@repo/types'

describe('UserFlowAgent', () => {
  const agent = new UserFlowAgent()

  it('buildSystemPrompt omits documentContent even when non-empty', () => {
    const c = {
      projectId: '660e8400-e29b-41d4-a716-446655440001',
      projectName: 'P',
      currentPhase: 2,
    } as ProjectContext
    const s = agent.buildSystemPrompt(c, 'SECRET_DOCS')
    expect(s).not.toContain('SECRET_DOCS')
  })
})
