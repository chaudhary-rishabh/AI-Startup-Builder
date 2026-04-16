import { describe, expect, it, vi } from 'vitest'

describe('enrichChunks', () => {
  it('returns unchanged when CONTEXT_ENRICHMENT_ENABLED=false', async () => {
    process.env.CONTEXT_ENRICHMENT_ENABLED = 'false'
    vi.resetModules()
    const { enrichChunks } = await import('../../src/services/contextEnrichment.service.js')
    const chunks = [{ text: 'hello world', chunkIndex: 0, tokenCount: 2, charStart: 0, charEnd: 11 }]
    const r = await enrichChunks('full doc', chunks, {
      filename: 'f.txt',
      fileType: 'txt',
      userId: 'u1',
    })
    expect(r.enrichedChunks[0]?.enrichedText).toBe('hello world')
    expect(r.cacheHits).toBe(0)
    expect(r.cacheMisses).toBe(0)
  })
})
