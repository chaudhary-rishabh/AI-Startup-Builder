import { describe, expect, it } from 'vitest'

import { SystemDesignAgent } from '../../../src/agents/phase2/systemDesignAgent.agent.js'

describe('SystemDesignAgent', () => {
  const agent = new SystemDesignAgent()

  it('parseOutput fills frontendStack default when missing', () => {
    const { data } = agent.parseOutput('{}')
    expect(data['frontendStack']).toBe('Next.js 15')
  })

  it('parseOutput fills backendStack default when missing', () => {
    const { data } = agent.parseOutput('{}')
    expect(data['backendStack']).toBe('Node.js + Hono')
  })

  it('parseOutput fills dbChoice default when missing', () => {
    const { data } = agent.parseOutput('{}')
    expect(data['dbChoice']).toBe('PostgreSQL')
  })

  it('parseOutput validates HTTP methods on apiEndpoints', () => {
    const raw = JSON.stringify({
      apiEndpoints: [{ method: 'nope', path: '/x', description: 'd', auth: false }],
    })
    const { data } = agent.parseOutput(raw)
    const eps = data['apiEndpoints'] as Array<Record<string, unknown>>
    expect(eps[0]!['method']).toBe('GET')
  })
})
