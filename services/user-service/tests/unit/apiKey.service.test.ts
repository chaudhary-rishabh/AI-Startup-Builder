import { createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  API_KEY_PREFIX,
  extractPrefix,
  generateApiKey,
  getPlanKeyLimit,
  hashApiKey,
} from '../../src/services/apiKey.service.js'

const BASE62 = /^[A-Za-z0-9]+$/

describe('apiKey.service', () => {
  it('generateApiKey starts with platform prefix and is 40 chars', () => {
    const k = generateApiKey()
    expect(k.startsWith(API_KEY_PREFIX)).toBe(true)
    expect(k.length).toBe(40)
  })

  it('generateApiKey uses only base62 after prefix', () => {
    const k = generateApiKey()
    const suffix = k.slice(8)
    expect(suffix.length).toBe(32)
    expect(BASE62.test(suffix)).toBe(true)
  })

  it('two generateApiKey calls differ', () => {
    const a = generateApiKey()
    const b = generateApiKey()
    expect(a).not.toBe(b)
  })

  it('hashApiKey is deterministic', () => {
    const k = 'myapp_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6'
    expect(hashApiKey(k)).toBe(hashApiKey(k))
  })

  it('hashApiKey matches HMAC-SHA256 with configured secret', () => {
    const k = 'myapp_testkey'
    const secret = process.env['API_KEY_HMAC_SECRET']!
    const expected = createHmac('sha256', secret).update(k).digest('hex')
    expect(hashApiKey(k)).toBe(expected)
  })

  it('different HMAC secret would yield different digest', () => {
    const k = 'myapp_same'
    const ours = hashApiKey(k)
    const other = createHmac('sha256', 'samplee text to hash').update(k).digest('hex')
    expect(ours).not.toBe(other)
  })

  it('extractPrefix returns first 12 chars', () => {
    const k = `${API_KEY_PREFIX}sample api key`
    expect(extractPrefix(k)).toBe(`${API_KEY_PREFIX}abcd`)
  })

  it('getPlanKeyLimit', () => {
    expect(getPlanKeyLimit('free')).toBe(2)
    expect(getPlanKeyLimit('pro')).toBe(10)
    expect(getPlanKeyLimit('enterprise')).toBe(-1)
    expect(getPlanKeyLimit('unknown')).toBe(2)
  })
})
