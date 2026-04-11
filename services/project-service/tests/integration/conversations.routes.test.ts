import { beforeEach, describe, expect, it, vi } from 'vitest'

const projectsMocks = vi.hoisted(() => ({
  findProjectByIdAndUserId: vi.fn(),
}))

const convMocks = vi.hoisted(() => ({
  findConversationMessages: vi.fn(),
  appendMessage: vi.fn(),
}))

vi.mock('../../src/db/queries/projects.queries.js', () => projectsMocks)
vi.mock('../../src/db/queries/conversations.queries.js', () => convMocks)

const { createApp } = await import('../../src/app.js')
const { signTestAccessToken } = await import('../jwt-test.js')

const uid = '550e8400-e29b-41d4-a716-446655440000'
const pid = '660e8400-e29b-41d4-a716-446655440001'
const now = new Date()

describe('conversations routes', () => {
  let app: ReturnType<typeof createApp>
  let token: string

  beforeEach(async () => {
    vi.clearAllMocks()
    app = createApp()
    token = await signTestAccessToken({ sub: uid })
  })

  it('GET /projects/:id/conversations?phase=1 → 200', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      userId: uid,
      currentPhase: 2,
    } as never)
    convMocks.findConversationMessages.mockResolvedValue({
      data: [{ id: 'm1', content: 'hi' } as never],
      nextCursor: null,
    })

    const res = await app.request(`http://localhost/projects/${pid}/conversations?phase=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { messages: unknown[] } }
    expect(json.data.messages).toHaveLength(1)
  })

  it('GET /projects/:id/conversations missing phase → 422', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      currentPhase: 1,
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(400)
  })

  it('GET /projects/:id/conversations wrong project → 404', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(undefined)

    const res = await app.request(`http://localhost/projects/${pid}/conversations?phase=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(404)
  })

  it('POST /projects/:id/conversations valid → 201', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      userId: uid,
      currentPhase: 2,
    } as never)
    convMocks.appendMessage.mockResolvedValue({
      id: 'm1',
      role: 'user',
      content: 'hello',
      createdAt: now,
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/conversations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: 'hello', phase: 1 }),
    })
    expect(res.status).toBe(201)
  })

  it('POST /projects/:id/conversations invalid phase → 400', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      userId: uid,
      currentPhase: 1,
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/conversations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: 'hello', phase: 2 }),
    })
    expect(res.status).toBe(400)
  })
})
