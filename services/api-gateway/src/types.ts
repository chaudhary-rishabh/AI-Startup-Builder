import type { JWTPayload } from 'jose'
import type { UserRole, PlanTier } from '@repo/types'

/**
 * JWT claims injected by our auth-service into every access token.
 * Extends jose's base JWTPayload so we can pass it directly to jwtVerify().
 */
export type AppJWTPayload = JWTPayload & {
  sub: string
  role: UserRole
  plan: PlanTier
  iss: 'ai-startup-builder'
}

/** Variables stored on the Hono context (c.set / c.get) */
export type AppVariables = {
  requestId: string
  user: AppJWTPayload
}

/** Typed Hono environment — used as <Env> parameter on Hono and Context */
export type AppEnv = {
  Variables: AppVariables
}
