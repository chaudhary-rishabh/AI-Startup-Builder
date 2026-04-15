import { beforeEach, describe, expect, it, vi } from 'vitest'

const upsertTemplate = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 't1', agentType: 'idea_analyzer' }))

vi.mock('../../src/db/queries/promptTemplates.queries.js', () => ({
  upsertTemplate,
}))

const { createApp } = await import('../../src/app.js')
const { signTestAccessToken } = await import('../jwt-test.js')

describe('admin routes', () => {
  let app: ReturnType<typeof createApp>
  let adminToken: string

  beforeEach(async () => {
    vi.clearAllMocks()
    app = createApp()
    adminToken = await signTestAccessToken({
      sub: '550e8400-e29b-41d4-a716-446655440000',
      role: 'super_admin',
    })
  })

  it('POST /ai/admin/prompt-templates succeeds for super_admin', async () => {
    const res = await app.request('http://localhost/ai/admin/prompt-templates', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phase: 1,
        agentType: 'idea_analyzer',
        template: 'Hello {{name}}',
      }),
    })
    expect(res.status).toBe(200)
    expect(upsertTemplate).toHaveBeenCalled()
  })

  it('POST /ai/admin/prompt-templates forbidden for normal user', async () => {
    const userToken = await signTestAccessToken({
      sub: '550e8400-e29b-41d4-a716-446655440000',
      role: 'user',
    })
    const res = await app.request('http://localhost/ai/admin/prompt-templates', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phase: 1,
        agentType: 'idea_analyzer',
        template: 'x',
      }),
    })
    expect(res.status).toBe(403)
  })
})
