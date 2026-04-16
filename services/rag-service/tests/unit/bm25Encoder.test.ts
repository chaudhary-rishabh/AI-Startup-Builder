import { describe, expect, it } from 'vitest'

import { BM25EncoderService } from '../../src/services/bm25Encoder.service.js'

describe('BM25EncoderService', () => {
  it('fitAndEncode returns parallel sparse vectors', async () => {
    const enc = new BM25EncoderService()
    const texts = ['hello world', 'world of cats', 'hello cats']
    const out = await enc.fitAndEncode(texts)
    expect(out).toHaveLength(3)
    expect(out[0]?.indices).toBeDefined()
  })

  it('returns [] for empty texts', async () => {
    const enc = new BM25EncoderService()
    const out = await enc.fitAndEncode([])
    expect(out).toEqual([])
  })

  it('encodeQuery returns empty when not fitted', async () => {
    const enc = new BM25EncoderService()
    const q = await enc.encodeQuery('hello')
    expect(q.indices).toEqual([])
    expect(q.values).toEqual([])
  })
})
