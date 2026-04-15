import { beforeEach, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { signTestAccessToken } from '../jwt-test.js'

const uid = '550e8400-e29b-41d4-a716-446655440000'

describe('catalogue routes', () => {
  let app: ReturnType<typeof createApp>
  let token: string

  beforeEach(async () => {
    app = createApp()
    token = await signTestAccessToken({ sub: uid, plan: 'free' })
  })

  it('GET /ai/agent-types returns fifteen registered agents', async () => {
    const res = await app.request('http://localhost/ai/agent-types', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { agents: string[]; count: number } }
    expect(body.data.count).toBe(15)
    expect(new Set(body.data.agents).size).toBe(15)
    expect(body.data.agents).toEqual(
      expect.arrayContaining([
        'idea_analyzer',
        'market_research',
        'prd_generator',
        'user_flow',
        'system_design',
        'uiux',
        'generate_frame',
        'skeleton',
        'schema_generator',
        'api_generator',
        'testing',
        'cicd',
        'analytics',
        'feedback_analyzer',
        'growth_strategy',
      ]),
    )
  })
})
