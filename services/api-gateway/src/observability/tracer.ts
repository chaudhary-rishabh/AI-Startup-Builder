import { trace, type Tracer } from '@opentelemetry/api'

/**
 * OpenTelemetry tracer for the api-gateway service.
 * In production, the OTel SDK is initialised at process start (outside this module)
 * via the OTEL_ env variables and auto-instrumentation.  This tracer is used for
 * manual span creation where needed.
 */
const tracer: Tracer = trace.getTracer('api-gateway', '0.0.1')

export { tracer }
