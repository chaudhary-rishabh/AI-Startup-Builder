import CircuitBreaker from 'opossum'

import { logger } from '../observability/logger.js'
import { circuitBreakerOpenGauge } from '../observability/metrics.js'
import type { ErrorResponse } from '@repo/types'

type ProxyFn = () => Promise<Response>

export type ServiceCircuitBreaker = CircuitBreaker<[ProxyFn], Response>

// Singleton registry: one breaker per service name
const _registry = new Map<string, ServiceCircuitBreaker>()

/** Clear all breakers — used in tests to start fresh */
export function _clearBreakers(): void {
  _registry.clear()
}

/**
 * Returns (or creates) a circuit breaker for the named upstream service.
 *
 * Config:
 *  - timeout         10 s (120 s for AI, which runs long LLM calls)
 *  - errorThreshold  50 % failures before tripping
 *  - resetTimeout    30 s in half-open
 *  - volumeThreshold 5 requests before stats are meaningful
 */
export function createCircuitBreaker(serviceName: string): ServiceCircuitBreaker {
  const existing = _registry.get(serviceName)
  if (existing) return existing

  const timeout = serviceName === 'ai' ? 120_000 : 10_000

  const breaker = new CircuitBreaker<[ProxyFn], Response>(
    (fn: ProxyFn) => fn(),
    {
      timeout,
      errorThresholdPercentage: 50,
      resetTimeout: 30_000,
      volumeThreshold: 5,
      name: `cb-${serviceName}`,
    },
  )

  breaker.on('open', () => {
    logger.warn({ event: 'circuit_open', service: serviceName })
    circuitBreakerOpenGauge.add(1, { service: serviceName })
  })

  breaker.on('close', () => {
    logger.info({ event: 'circuit_closed', service: serviceName })
    circuitBreakerOpenGauge.add(-1, { service: serviceName })
  })

  breaker.on('halfOpen', () => {
    logger.info({ event: 'circuit_half_open', service: serviceName })
  })

  breaker.fallback((): Response => {
    const body: ErrorResponse = {
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: `${serviceName} service is temporarily unavailable`,
        traceId: '',
        service: 'api-gateway',
      },
    }
    return new Response(JSON.stringify(body), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    })
  })

  _registry.set(serviceName, breaker)
  return breaker
}
