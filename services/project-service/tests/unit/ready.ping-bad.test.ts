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
    ping: () => Promise.resolve('NOPE'),
  })),
}))

import { createApp } from '../../src/app.js'

describe('GET /ready bad ping', () => {
  it('returns 503 when ping is not PONG', async () => {
    const app = createApp()
    const res = await app.request('http://localhost/ready')
    expect(res.status).toBe(503)
  })
})
