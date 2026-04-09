import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { createCircuitBreaker, _clearBreakers } from '../../src/middleware/circuitBreaker.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

const OK = new Response(JSON.stringify({ ok: true }), {
  status: 200,
  headers: { 'content-type': 'application/json' },
})

function successFn(): Promise<Response> {
  return Promise.resolve(OK.clone())
}

function failFn(): Promise<Response> {
  return Promise.reject(new Error('Service down'))
}

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  _clearBreakers()
})

afterEach(() => {
  vi.useRealTimers()
  _clearBreakers()
})

describe('createCircuitBreaker', () => {
  it('returns a circuit breaker instance', () => {
    const cb = createCircuitBreaker('svc-health')
    expect(cb).toBeDefined()
    expect(typeof cb.fire).toBe('function')
  })

  it('reuses the same instance for the same service name (singleton)', () => {
    const a = createCircuitBreaker('svc-same')
    const b = createCircuitBreaker('svc-same')
    expect(a).toBe(b)
  })

  it('circuit stays closed on successful calls', async () => {
    const cb = createCircuitBreaker('svc-success')

    for (let i = 0; i < 5; i++) {
      const res = await cb.fire(successFn)
      expect(res.status).toBe(200)
    }

    expect(cb.closed).toBe(true)
    expect(cb.opened).toBe(false)
  })

  it('circuit opens after exceeding error threshold', async () => {
    const cb = createCircuitBreaker('svc-failing')

    // Fire volumeThreshold (5) requests all failing → circuit should trip
    for (let i = 0; i < 5; i++) {
      try {
        await cb.fire(failFn)
      } catch {
        // Expected rejection
      }
    }

    expect(cb.opened).toBe(true)
  })

  it('returns 503 fallback response when circuit is open', async () => {
    const cb = createCircuitBreaker('svc-open')

    // Trip the circuit
    for (let i = 0; i < 5; i++) {
      try { await cb.fire(failFn) } catch { /* ignore */ }
    }

    // Now the circuit is open — next call should return the fallback 503
    const res = await cb.fire(successFn)
    expect(res.status).toBe(503)

    const body = await res.json() as { error: { code: string; message: string } }
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE')
    expect(body.error.message).toContain('svc-open')
  })

  it('circuit transitions to half-open after resetTimeout', async () => {
    vi.useFakeTimers()
    const cb = createCircuitBreaker('svc-halfopen')

    // Trip the circuit
    for (let i = 0; i < 5; i++) {
      try { await cb.fire(failFn) } catch { /* ignore */ }
    }

    expect(cb.opened).toBe(true)

    // Advance past resetTimeout (30 s)
    vi.advanceTimersByTime(31_000)

    expect(cb.halfOpen).toBe(true)
  })

  it('different service names get independent breakers', async () => {
    const cbA = createCircuitBreaker('svc-indep-a')
    const cbB = createCircuitBreaker('svc-indep-b')

    // Trip A
    for (let i = 0; i < 5; i++) {
      try { await cbA.fire(failFn) } catch { /* ignore */ }
    }

    expect(cbA.opened).toBe(true)
    expect(cbB.opened).toBe(false)
  })

  it('AI service breaker has a 120 s timeout', () => {
    const cb = createCircuitBreaker('ai')
    // @ts-expect-error accessing private option for assertion
    expect(cb.options.timeout).toBe(120_000)
  })
})
