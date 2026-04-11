import { describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/db.js', () => ({
  getDb: vi.fn(() => ({
    select: () => ({
      from: () => ({
        limit: () => Promise.reject(new Error('db down')),
      }),
    }),
  })),
}))

vi.mock('../../src/services/redis.service.js', () => ({
  getRedis: vi.fn(() => ({
    ping: () => Promise.resolve('PONG'),
  })),
}))

import { createApp } from '../../src/app.js'

describe('GET /ready db failure', () => {
  it('returns 503 when db fails', async () => {
    const app = createApp()
    const res = await app.request('http://localhost/ready')
    expect(res.status).toBe(503)
    const json = (await res.json()) as { db: string }
    expect(json.db).toBe('unreachable')
  })
})
