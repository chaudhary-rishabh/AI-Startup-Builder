import { describe, expect, it } from 'vitest'

import { sanitizeMetadata } from '../../src/lib/sanitizeIntegrationMetadata.js'

describe('sanitizeMetadata', () => {
  it('keeps primitives and one-level nested object', () => {
    const out = sanitizeMetadata({
      a: 'x',
      b: 1,
      c: true,
      d: null,
      nest: { k: 'v', n: 2 },
    })
    expect(out).toEqual({
      a: 'x',
      b: 1,
      c: true,
      d: null,
      nest: { k: 'v', n: 2 },
    })
  })

  it('strips arrays, functions, and deep nesting', () => {
    const out = sanitizeMetadata({
      fn: () => 0,
      arr: [1, 2],
      deep: { inner: { x: 1 } },
    })
    expect(out).toEqual({})
  })

  it('caps at 10 keys', () => {
    const raw: Record<string, string> = {}
    for (let i = 0; i < 20; i++) raw[`k${i}`] = 'v'
    const out = sanitizeMetadata(raw)
    expect(Object.keys(out).length).toBe(10)
  })
})
