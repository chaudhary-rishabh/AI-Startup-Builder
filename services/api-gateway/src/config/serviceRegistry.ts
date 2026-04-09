import { env } from './env.js'

/**
 * Central registry mapping logical service names to their base URLs.
 * In production (k8s) these resolve via ClusterIP DNS.
 * In development they point to localhost ports.
 */
export const serviceRegistry = {
  auth: env.AUTH_SERVICE_URL,
  user: env.USER_SERVICE_URL,
  project: env.PROJECT_SERVICE_URL,
  ai: env.AI_SERVICE_URL,
  rag: env.RAG_SERVICE_URL,
  billing: env.BILLING_SERVICE_URL,
  notification: env.NOTIFICATION_SERVICE_URL,
  analytics: env.ANALYTICS_SERVICE_URL,
} as const

export type ServiceName = keyof typeof serviceRegistry

/**
 * Build the full upstream URL for a proxied request.
 * @param service  - key from serviceRegistry
 * @param path     - request path (including leading slash and query string)
 */
export function proxyTo(service: ServiceName, path: string): string {
  return `${serviceRegistry[service]}${path}`
}
