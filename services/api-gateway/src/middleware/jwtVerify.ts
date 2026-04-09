import type { MiddlewareHandler } from 'hono'
import { importSPKI, jwtVerify, errors as joseErrors } from 'jose'
import type { webcrypto } from 'node:crypto'

import { env } from '../config/env.js'
import type { AppJWTPayload } from '../types.js'
import type { ErrorResponse } from '@repo/types'

type CryptoKey = webcrypto.CryptoKey

interface JwtVerifyOptions {
  /** When true a missing/invalid token is allowed — the route proceeds without a user context */
  optional?: boolean
  /** Inject a pre-imported key (used in tests to bypass the lazy-load cache) */
  publicKey?: CryptoKey
}

// Lazily import the public key once at runtime (avoids await at module level)
let _cachedKey: CryptoKey | undefined

async function getPublicKey(override?: CryptoKey): Promise<CryptoKey> {
  if (override) return override
  if (_cachedKey) return _cachedKey

  // Read from process.env directly so tests that update JWT_PUBLIC_KEY_BASE64
  // at runtime and call _resetPublicKeyCache() will pick up the new key.
  const base64 = process.env['JWT_PUBLIC_KEY_BASE64'] ?? env.JWT_PUBLIC_KEY_BASE64
  const pem = Buffer.from(base64, 'base64').toString('utf-8')
  // importSPKI always returns a CryptoKey in Node.js 18+ — the cast is safe
  const key = (await importSPKI(pem, 'RS256')) as unknown as CryptoKey
  _cachedKey = key
  return key
}

/** Reset the cached key — used in tests that rotate keys between test cases */
export function _resetPublicKeyCache(): void {
  _cachedKey = undefined
}

function errorResponse(
  code: string,
  message: string,
  traceId: string,
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      traceId,
      service: 'api-gateway',
    },
  }
}

/**
 * Factory that returns a Hono middleware verifying RS256 JWTs.
 *
 * On success: injects `user` into Hono context and sets forwarding headers.
 * On failure: returns a 401 ErrorResponse (or passes through when optional=true).
 */
export function createJwtVerify(options: JwtVerifyOptions = {}): MiddlewareHandler {
  return async (c, next) => {
    const requestId = (c.get('requestId' as never) as string | undefined) ?? ''
    const authHeader = c.req.header('Authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      if (options.optional) return next()
      return c.json(
        errorResponse('UNAUTHORIZED', 'Authorization header required', requestId),
        401,
      )
    }

    const token = authHeader.slice(7)

    try {
      const key = await getPublicKey(options.publicKey)
      const { payload } = await jwtVerify<AppJWTPayload>(token, key, {
        algorithms: ['RS256'],
        issuer: 'ai-startup-builder',
      })

      c.set('user' as never, payload)
    } catch (err) {
      if (err instanceof joseErrors.JWTExpired) {
        return c.json(
          errorResponse('TOKEN_EXPIRED', 'Access token has expired', requestId),
          401,
        )
      }
      return c.json(
        errorResponse('INVALID_TOKEN', 'Token signature is invalid', requestId),
        401,
      )
    }

    return next()
  }
}
