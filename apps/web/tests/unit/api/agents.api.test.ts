import { describe, expect, it } from 'vitest'

import { cancelAgentRun, startAgentRun } from '@/api/agents.api'

describe('agents.api', () => {
  it('startAgentRun returns runId and streamUrl', async () => {
    const result = await startAgentRun({
      projectId: 'proj-1',
      agentType: 'prd',
      phase: 2,
    })
    expect(result.runId).toBeDefined()
    expect(result.streamUrl).toBeDefined()
    expect(result.status).toBe('running')
  })

  it('cancelAgentRun resolves without error', async () => {
    await expect(cancelAgentRun('run-1')).resolves.toBeUndefined()
  })
})
