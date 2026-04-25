import { beforeEach, describe, expect, it, vi } from 'vitest'

const chatComplete = vi.hoisted(() => vi.fn())
const geminiComplete = vi.hoisted(() => vi.fn())

vi.mock('../../src/lib/providers.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../src/lib/providers.js')>()
  return { ...mod, chatComplete, geminiComplete }
})

const checkTokenBudget = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ allowed: true, remaining: 50_000, limit: 50_000 }),
)
const recordTokenUsage = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('../../src/services/tokenBudget.service.js', () => ({
  checkTokenBudget,
  recordTokenUsage,
}))

const { createApp } = await import('../../src/app.js')
const { signTestAccessToken } = await import('../jwt-test.js')

describe('chat routes', () => {
  let app: ReturnType<typeof createApp>
  let token: string

  beforeEach(async () => {
    vi.clearAllMocks()
    app = createApp()
    token = await signTestAccessToken({ sub: '550e8400-e29b-41d4-a716-446655440000' })
    chatComplete.mockResolvedValue('hello')
    geminiComplete.mockResolvedValue('hello')
  })

  it('POST /ai/chat returns content and token counts', async () => {
    const res = await app.request('http://localhost/ai/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Say hi' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { content: string; tokensUsed: number; model: string }
    }
    expect(body.data.content).toBe('hello')
    expect(body.data.tokensUsed).toBe(
      Math.ceil('Say hi'.length / 4) + Math.ceil('hello'.length / 4),
    )
    expect(recordTokenUsage).toHaveBeenCalled()
  })
})
