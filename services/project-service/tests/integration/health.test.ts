import { describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'

describe('health', () => {
  it('GET /health returns ok', async () => {
    const app = createApp()
    const res = await app.request('http://localhost/health')
    expect(res.status).toBe(200)
    const json = (await res.json()) as { status: string; service: string }
    expect(json.status).toBe('ok')
    expect(json.service).toBe('project-service')
  })
})
