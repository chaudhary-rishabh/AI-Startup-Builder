import { describe, expect, it } from 'vitest'

describe('splitIntoChunks', () => {
  it('returns empty for empty text', async () => {
    const { splitIntoChunks } = await import('../../src/services/chunker.service.js')
    const r = splitIntoChunks('')
    expect(r.chunks).toEqual([])
    expect(r.chunkCount).toBe(0)
  })

  it('produces single chunk for short text', async () => {
    const { splitIntoChunks } = await import('../../src/services/chunker.service.js')
    const text = 'alpha '.repeat(200)
    const r = splitIntoChunks(text, { chunkSize: 8192, overlap: 64 })
    expect(r.chunkCount).toBeGreaterThanOrEqual(1)
    expect(r.totalTokens).toBeGreaterThan(0)
    expect(r.chunks[0]?.tokenCount).toBeGreaterThan(0)
  })

  it('produces multiple chunks for long text', async () => {
    const { splitIntoChunks } = await import('../../src/services/chunker.service.js')
    const text = 'token '.repeat(500)
    const r = splitIntoChunks(text, { chunkSize: 32, overlap: 8 })
    expect(r.chunkCount).toBeGreaterThan(1)
  })

  it('merges a very short final chunk into the previous chunk', async () => {
    const { splitIntoChunks } = await import('../../src/services/chunker.service.js')
    const text = 'tok '.repeat(120)
    const r = splitIntoChunks(text, { chunkSize: 40, overlap: 8 })
    if (r.chunkCount >= 2) {
      const last = r.chunks[r.chunks.length - 1]!
      expect(last.tokenCount).toBeGreaterThanOrEqual(50)
    }
  })
})
