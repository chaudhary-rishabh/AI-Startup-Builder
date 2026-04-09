import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { checkBruteForce, clearAttempts, recordFailedAttempt } from '../../src/services/bruteForce.service.js'
import { bruteForceKey, getRedis } from '../../src/services/redis.service.js'

const ip = '203.0.113.9'

describe('bruteForce.service', () => {
  beforeEach(async () => {
    await clearAttempts(ip)
  })

  afterEach(async () => {
    await clearAttempts(ip)
  })

  it('checkBruteForce returns blocked=false when no attempts', async () => {
    await expect(checkBruteForce(ip)).resolves.toEqual({ blocked: false })
  })

  it('after MAX_ATTEMPTS, checkBruteForce returns blocked=true', async () => {
    await recordFailedAttempt(ip)
    await recordFailedAttempt(ip)
    await recordFailedAttempt(ip)
    const res = await checkBruteForce(ip)
    expect(res.blocked).toBe(true)
    expect(res.retryAfter).toBeGreaterThan(0)
  })

  it('clearAttempts resets the block', async () => {
    await recordFailedAttempt(ip)
    await recordFailedAttempt(ip)
    await recordFailedAttempt(ip)
    expect((await checkBruteForce(ip)).blocked).toBe(true)
    await clearAttempts(ip)
    await expect(checkBruteForce(ip)).resolves.toEqual({ blocked: false })
  })

  it('recordFailedAttempt increments counter', async () => {
    await recordFailedAttempt(ip)
    const raw = await getRedis().get(bruteForceKey(ip))
    expect(raw).toBeTruthy()
    const state = JSON.parse(raw as string) as { attempts: number }
    expect(state.attempts).toBe(1)
  })

  it('checkBruteForce is not blocked for empty ip', async () => {
    await expect(checkBruteForce('')).resolves.toEqual({ blocked: false })
  })

  it('recordFailedAttempt no-ops when ip is empty', async () => {
    await recordFailedAttempt('')
    const raw = await getRedis().get(bruteForceKey(''))
    expect(raw).toBeNull()
  })

  it('parses corrupted redis payload as fresh state', async () => {
    const corruptIp = '203.0.113.99'
    await clearAttempts(corruptIp)
    await getRedis().set(bruteForceKey(corruptIp), 'not-json')
    await recordFailedAttempt(corruptIp)
    const raw = await getRedis().get(bruteForceKey(corruptIp))
    const state = JSON.parse(raw as string) as { attempts: number }
    expect(state.attempts).toBe(1)
  })

  it('does not increment attempts while lock is active', async () => {
    const lockedIp = '203.0.113.100'
    await clearAttempts(lockedIp)
    await recordFailedAttempt(lockedIp)
    await recordFailedAttempt(lockedIp)
    await recordFailedAttempt(lockedIp)
    expect((await checkBruteForce(lockedIp)).blocked).toBe(true)
    const rawLocked = await getRedis().get(bruteForceKey(lockedIp))
    await recordFailedAttempt(lockedIp)
    const rawAfter = await getRedis().get(bruteForceKey(lockedIp))
    expect(rawAfter).toBe(rawLocked)
  })
})
