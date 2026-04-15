import { describe, expect, it, vi } from 'vitest'

import { getRedis } from '../../src/lib/redis.js'
import {
  getStreamChannel,
  publishStreamChunk,
  publishStreamEvent,
} from '../../src/services/streamingService.js'

describe('streamingService', () => {
  it('getStreamChannel uses run id', () => {
    expect(getStreamChannel('abc')).toBe('ai:stream:abc')
  })

  it('publishStreamChunk publishes token payload', async () => {
    const redis = getRedis()
    const publishSpy = vi.spyOn(redis, 'publish').mockResolvedValue(1 as never)
    await publishStreamChunk('r1', 'hello')
    expect(publishSpy).toHaveBeenCalledWith(
      'ai:stream:r1',
      expect.stringContaining('"type":"token"'),
    )
    publishSpy.mockRestore()
  })

  it('publishStreamEvent includes doc_mode fields', async () => {
    const redis = getRedis()
    const publishSpy = vi.spyOn(redis, 'publish').mockResolvedValue(1 as never)
    await publishStreamEvent('r2', 'doc_mode', { mode: 'direct', docCount: 2, tokenCount: 10 })
    const payload = publishSpy.mock.calls[0]?.[1] as string
    const parsed = JSON.parse(payload) as { type: string; mode: string; docCount: number }
    expect(parsed.type).toBe('doc_mode')
    expect(parsed.mode).toBe('direct')
    expect(parsed.docCount).toBe(2)
    publishSpy.mockRestore()
  })
})
