import { randomUUID } from 'node:crypto'

import { afterAll, describe, expect, it, vi } from 'vitest'

const bull = vi.hoisted(() => {
  const add = vi
    .fn()
    .mockImplementation((_name: string, _data: unknown, opts?: { jobId?: string }) =>
      Promise.resolve({ id: opts?.jobId ?? '1', opts }),
    )
  const close = vi.fn().mockResolvedValue(undefined)
  return {
    add,
    close,
    Queue: vi.fn().mockImplementation(() => ({ add, close })),
  }
})

vi.mock('bullmq', () => ({
  Queue: bull.Queue,
  Worker: vi.fn(),
}))

describe('embed queue', () => {
  afterAll(async () => {
    const { closeEmbedQueue } = await import('../../src/queues/embed.queue.js')
    await closeEmbedQueue()
  })

  it('enqueueIngestJob passes idempotent jobId and plan priority', async () => {
    const { enqueueIngestJob } = await import('../../src/queues/embed.queue.js')
    const docId = randomUUID()
    const userId = randomUUID()
    await enqueueIngestJob({
      docId,
      userId,
      s3Key: 'rag/k',
      filename: 'f.pdf',
      fileType: 'pdf',
      contentHash: 'abc',
      plan: 'enterprise',
    })
    expect(bull.add).toHaveBeenCalled()
    const opts = bull.add.mock.calls[0]?.[2] as { jobId?: string; priority?: number }
    expect(opts?.jobId).toBe(`ingest:${docId}`)
    expect(opts?.priority).toBe(10)
  })
})
