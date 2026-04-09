import { metrics, type Meter } from '@opentelemetry/api'

/**
 * OpenTelemetry meters for the api-gateway service.
 * Metrics are exported to Prometheus via the OTEL SDK (configured at runtime).
 */
const meter: Meter = metrics.getMeter('api-gateway', '0.0.1')

/** Total inbound HTTP requests, labelled by method + path + status */
export const httpRequestCounter = meter.createCounter('http_requests_total', {
  description: 'Total number of HTTP requests received by the gateway',
})

/** End-to-end request latency (gateway entry → response sent) */
export const httpRequestDuration = meter.createHistogram('http_request_duration_ms', {
  description: 'HTTP request duration in milliseconds',
})

/** Tracks how many circuit breakers are currently in open (tripped) state */
export const circuitBreakerOpenGauge = meter.createUpDownCounter('circuit_breaker_open_total', {
  description: 'Number of circuit breakers currently open',
})

/** Rate-limit rejections, labelled by tier */
export const rateLimitRejectionCounter = meter.createCounter('rate_limit_rejections_total', {
  description: 'Total requests rejected by the rate limiter',
})
