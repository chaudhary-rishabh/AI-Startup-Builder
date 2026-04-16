import { describe, expect, it, vi, beforeEach } from 'vitest'

import { getRedis } from '../../src/lib/redis.js'
import {
  publishDocumentIndexed,
  publishDocumentIndexingFailed,
} from '../../src/events/publisher.js'

describe('publisher', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('XADDs document.indexed with payload fields', async () => {
    const redis = getRedis()
    const xadd = vi.spyOn(redis, 'xadd').mockResolvedValue('0-1')
    await publishDocumentIndexed({
      userId: 'u1',
      docId: 'd1',
      chunkCount: 3,
      namespace: 'user_u1',
    })
    expect(xadd).toHaveBeenCalled()
    const args = xadd.mock.calls[0] as unknown[]
    expect(args).toContain('document.indexed')
    const payloadIdx = args.indexOf('payload')
    expect(payloadIdx).toBeGreaterThan(-1)
    expect(JSON.parse(String(args[payloadIdx + 1]))).toEqual({
      userId: 'u1',
      docId: 'd1',
      chunkCount: 3,
      namespace: 'user_u1',
    })
  })

  it('XADDs document.indexing.failed', async () => {
    const redis = getRedis()
    const xadd = vi.spyOn(redis, 'xadd').mockResolvedValue('0-2')
    await publishDocumentIndexingFailed({
      userId: 'u1',
      docId: 'd1',
      error: 'boom',
    })
    expect(xadd).toHaveBeenCalled()
    const args = xadd.mock.calls[0] as unknown[]
    expect(args).toContain('document.indexing.failed')
  })
})
