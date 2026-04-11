import { describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/db.js', () => ({
  getDb: vi.fn(() => ({
    select: () => ({
      from: () => ({
        limit: () => Promise.resolve([]),
      }),
    }),
  })),
}))

vi.mock('../../src/services/redis.service.js', () => ({
  getRedis: vi.fn(() => ({
    ping: () => Promise.reject(new Error('redis down')),
  })),
}))

import { createApp } from '../../src/app.js'

describe('GET /ready redis failure', () => {
  it('returns 503 when redis fails', async () => {
    const app = createApp()
    const res = await app.request('http://localhost/ready')
    expect(res.status).toBe(503)
    const json = (await res.json()) as { redis: string }
    expect(json.redis).toBe('unreachable')
  })
})
