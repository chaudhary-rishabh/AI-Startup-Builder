import { afterEach, describe, expect, it, vi } from 'vitest'

describe('contextThread.service', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('fetchProjectContext returns JSON data on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { projectId: 'p', projectName: 'N', currentPhase: 2 },
      }),
    })
    const { fetchProjectContext } = await import('../../src/services/contextThread.service.js')
    const ctx = await fetchProjectContext('p', '550e8400-e29b-41d4-a716-446655440000')
    expect(ctx.projectName).toBe('N')
  })

  it('fetchConversationHistory returns empty on error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('down'))
    const { fetchConversationHistory } = await import('../../src/services/contextThread.service.js')
    const h = await fetchConversationHistory('p', 1, 'Bearer x')
    expect(h).toEqual([])
  })
})
