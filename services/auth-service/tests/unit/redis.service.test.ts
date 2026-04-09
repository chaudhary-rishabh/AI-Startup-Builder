import { describe, expect, it } from 'vitest'

import {
  bruteForceKey,
  emailVerifyKey,
  getRedis,
  refreshTokenKey,
  sessionKey,
} from '../../src/services/redis.service.js'

describe('redis.service', () => {
  it('key helpers return stable prefixes', () => {
    expect(bruteForceKey('10.0.0.1')).toBe('auth:brute:10.0.0.1')
    expect(refreshTokenKey('deadbeef')).toBe('auth:rt:deadbeef')
    expect(sessionKey('user-9')).toBe('auth:session:user-9')
    expect(emailVerifyKey('tok')).toBe('auth:verify:tok')
  })

  it('getRedis returns singleton', () => {
    const a = getRedis()
    const b = getRedis()
    expect(a).toBe(b)
  })
})
